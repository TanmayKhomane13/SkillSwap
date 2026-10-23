"""
=============================================================================
SKILLSWAP - FLASK APP (session auth + in-memory mock data)
=============================================================================
Serves the HTML pages (Jinja templates) and the REST API used by app.js.
All data lives in mock_data.py and resets when the server restarts.

Layout
  app.py
  mock_data.py
  templates/  login.html  index.html  admin.html
  static/     css/  js/app.js

Install / run
  pip install flask flask-cors python-dotenv
  python app.py

Demo logins
  alex.rivera@example.com / password123   (user)
  admin@skillswap.com     / admin123      (admin)
=============================================================================
"""
import os
import re
import uuid
from datetime import datetime
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

import mock_data
from mock_data import USERS, SWAPS, REVIEWS, MODERATION, BROADCAST

load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY", "dev-only-change-me"),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
CORS(app, supports_credentials=True,
     origins=os.getenv("CORS_ORIGINS", "http://localhost:5000,http://localhost:8080").split(","))

DEFAULT_AVATAR = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80"
SWAP_STATUSES = {"pending", "accepted", "completed", "cancelled", "declined"}
PROFILE_FIELDS = ("name", "location", "bio", "headline", "avatar", "visibility",
                  "availability", "skillsOffered", "skillsOfferedDesc", "skillsWanted")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def new_id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def find_user(user_id):
    return next((u for u in USERS if u["id"] == user_id), None)


def find_swap(swap_id):
    return next((s for s in SWAPS if s["id"] == swap_id), None)


def serialize(doc):
    """Copy a record without secrets and with ISO-formatted dates."""
    if not doc:
        return None
    out = {k: v for k, v in doc.items() if k != "password_hash"}
    for k, v in out.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat() + "Z"
    return out


def time_ago(dt):
    secs = int((datetime.utcnow() - dt).total_seconds())
    if secs < 60:
        return "Just now"
    if secs < 3600:
        return f"{secs // 60} minutes ago"
    if secs < 86400:
        h = secs // 3600
        return f"{h} hour{'s' if h != 1 else ''} ago"
    d = secs // 86400
    return "Yesterday" if d == 1 else f"{d} days ago"


def current_user():
    uid = session.get("user_id")
    return find_user(uid) if uid else None


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not current_user():
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("login_page"))
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user().get("role") != "admin":
            if request.path.startswith("/api/"):
                return jsonify({"error": "Admin access required"}), 403
            return redirect(url_for("user_app"))
        return fn(*args, **kwargs)
    return wrapper


def start_session(user):
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True


def home_for(user):
    return url_for("admin_page") if user.get("role") == "admin" else url_for("user_app")


def discoverable_users(exclude_id):
    return [u for u in USERS if u["visibility"] == "public" and u["role"] != "admin" and u["id"] != exclude_id]


def compatibility(me, other):
    def overlap(a, b):
        return any(x.lower() in y.lower() or y.lower() in x.lower() for x in a for y in b)
    they_want_mine = overlap(other.get("skillsWanted", []), me.get("skillsOffered", []))
    i_want_theirs = overlap(me.get("skillsWanted", []), other.get("skillsOffered", []))
    if they_want_mine and i_want_theirs:
        return 98
    return 88 if (they_want_mine or i_want_theirs) else 75


def swap_view(swap, me_id):
    """Shape a swap the way the frontend expects, relative to the viewer."""
    i_am_recipient = swap["recipient_id"] == me_id
    partner = find_user(swap["requester_id" if i_am_recipient else "recipient_id"]) or {}
    status = swap["status"]
    kind = {"accepted": "active", "completed": "completed"}.get(status, "incoming" if i_am_recipient else "outgoing")

    view = {
        "id": swap["id"], "type": kind, "status": status,
        "partnerId": partner.get("id", ""), "partnerName": partner.get("name", "Unknown"),
        "partnerAvatar": partner.get("avatar", DEFAULT_AVATAR),
        "partnerLocation": partner.get("location", ""),
        "message": swap.get("message", ""), "date": time_ago(swap["created_at"]),
        "hasReviewed": swap.get("hasReviewed", False),
    }
    if i_am_recipient:
        view.update(skillWantedFromUser=swap["skillWanted"], skillOfferedToUser=swap["skillOffered"],
                    skillWantedFromPartner=swap["skillOffered"], skillOfferedFromUser=swap["skillWanted"],
                    compatibilityScore=swap.get("compatibilityScore"))
    else:
        view.update(skillWantedFromPartner=swap["skillWanted"], skillOfferedFromUser=swap["skillOffered"])
    return view


# ===========================================================================
# PAGES
# ===========================================================================
@app.route("/")
def home():
    user = current_user()
    return redirect(home_for(user) if user else url_for("login_page"))


@app.route("/login.html")
def login_html():
    return redirect(url_for("login_page"))


@app.route("/login")
def login_page():
    user = current_user()
    return redirect(home_for(user)) if user else render_template("login.html")


@app.route("/index.html")
def index_html():
    return redirect(url_for("user_app"))


@app.route("/app")
# @login_required
def user_app():
    return render_template("index.html", user=serialize(current_user()))


@app.route("/admin.html")
def admin_html():
    return redirect(url_for("admin_page"))


@app.route("/admin")
@admin_required
def admin_page():
    return render_template("admin.html", user=serialize(current_user()))


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login_page"))


# ===========================================================================
# AUTH API
# ===========================================================================
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    user = next((u for u in USERS if u["email"].lower() == email), None)
    if not user or not check_password_hash(user["password_hash"], data.get("password") or ""):
        return jsonify({"error": "Invalid email or password"}), 401
    start_session(user)
    return jsonify({"message": "Login successful", "user": serialize(user), "redirect": home_for(user)})


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()
    password = data.get("password") or ""

    if not name or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return jsonify({"error": "A valid name and email are required"}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if any(u["email"].lower() == email for u in USERS):
        return jsonify({"error": "User with this email already exists"}), 400

    skill = (data.get("skill") or "").strip()
    user = {
        "id": new_id("usr"), "name": name, "email": email,
        "password_hash": generate_password_hash(password), "role": "user",
        "avatar": data.get("avatar") or DEFAULT_AVATAR,
        "location": data.get("location", "Remote"), "headline": "", "bio": data.get("bio", ""),
        "visibility": "public", "availability": data.get("availability", ["Weekends"]),
        "skillsOffered": [skill] if skill else [], "skillsOfferedDesc": {},
        "skillsWanted": data.get("skillsWanted", []),
        "rating": 0.0, "reviewCount": 0, "swapsCompleted": 0, "created_at": datetime.utcnow(),
    }
    USERS.append(user)
    start_session(user)
    return jsonify({"message": "Registration successful", "user": serialize(user),
                    "redirect": home_for(user)}), 201


@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return jsonify({"message": "Logged out", "redirect": url_for("login_page")})


# ===========================================================================
# PROFILE
# ===========================================================================
@app.route("/api/profile", methods=["GET"])
# @login_required
def get_profile():
    return jsonify(serialize(current_user()))


@app.route("/api/profile/update", methods=["POST", "PUT"])
# @login_required
def update_profile():
    data = request.get_json(silent=True) or {}
    if data.get("visibility") not in (None, "public", "private"):
        return jsonify({"error": "visibility must be 'public' or 'private'"}), 400
    user = current_user()
    user.update({k: data[k] for k in PROFILE_FIELDS if k in data})
    user["updated_at"] = datetime.utcnow()
    return jsonify({"message": "Profile updated successfully", "user": serialize(user)})


# ===========================================================================
# DISCOVERY
# ===========================================================================
@app.route("/api/users", methods=["GET"])
# @login_required
def get_users():
    q = (request.args.get("q") or request.args.get("skill") or "").lower()
    category = (request.args.get("category") or "all").lower()
    availability = request.args.get("availability", "all")
    try:
        min_rating = float(request.args.get("minRating", 0))
    except ValueError:
        min_rating = 0

    def avail_list(u):
        a = u.get("availability", [])
        return a if isinstance(a, list) else [a]

    results = []
    for u in discoverable_users(session["user_id"]):
        skills = [s.lower() for s in u["skillsOffered"] + u["skillsWanted"]]
        if q and not (q in u["name"].lower() or q in u["location"].lower() or any(q in s for s in skills)):
            continue
        if category != "all" and not any(category in s for s in skills):
            continue
        if availability != "all" and availability not in avail_list(u):
            continue
        if u["rating"] < min_rating:
            continue
        results.append(serialize(u))
    return jsonify(results)


@app.route("/api/users/<user_id>", methods=["GET"])
# @login_required
def get_user(user_id):
    user = find_user(user_id)
    if not user or user["visibility"] == "private":
        return jsonify({"error": "User not found"}), 404
    return jsonify(serialize(user))


@app.route("/api/matches", methods=["GET"])
# @login_required
def get_matches():
    me = current_user()
    matches = [dict(serialize(u), compatibilityScore=compatibility(me, u)) for u in discoverable_users(me["id"])]
    matches.sort(key=lambda m: m["compatibilityScore"], reverse=True)
    return jsonify(matches)


# ===========================================================================
# SWAPS & REVIEWS
# ===========================================================================
@app.route("/api/swaps", methods=["GET"])
# @login_required
def get_swaps():
    me = session["user_id"]
    mine = [s for s in SWAPS if me in (s["requester_id"], s["recipient_id"])
            and s["status"] not in ("cancelled", "declined")]
    mine.sort(key=lambda s: s["created_at"], reverse=True)
    return jsonify([swap_view(s, me) for s in mine])


@app.route("/api/swaps/create", methods=["POST"])
# @login_required
def create_swap():
    data = request.get_json(silent=True) or {}
    me = session["user_id"]
    partner_id = data.get("partnerId")
    if not find_user(partner_id) or partner_id == me:
        return jsonify({"error": "Invalid swap partner"}), 400
    if not data.get("skillWanted") or not data.get("skillOffered"):
        return jsonify({"error": "skillWanted and skillOffered are required"}), 400

    swap = {
        "id": new_id("swp"), "requester_id": me, "recipient_id": partner_id,
        "skillWanted": data["skillWanted"], "skillOffered": data["skillOffered"],
        "message": (data.get("message") or "").strip(), "status": "pending", "hasReviewed": False,
        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
    }
    SWAPS.append(swap)
    return jsonify({"message": "Swap request created", "swap": swap_view(swap, me)}), 201


@app.route("/api/swaps/<swap_id>/status", methods=["PATCH"])
# @login_required
def update_swap_status(swap_id):
    me = session["user_id"]
    status = (request.get_json(silent=True) or {}).get("status")
    swap = find_swap(swap_id)
    if status not in SWAP_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(SWAP_STATUSES)}"}), 400
    if not swap or me not in (swap["requester_id"], swap["recipient_id"]):
        return jsonify({"error": "Swap not found"}), 404
    if status in ("accepted", "declined") and swap["recipient_id"] != me:
        return jsonify({"error": "Only the recipient can accept or decline"}), 403
    if status == "cancelled" and swap["requester_id"] != me:
        return jsonify({"error": "Only the requester can cancel"}), 403

    if status == "completed" and swap["status"] != "completed":
        for uid in (swap["requester_id"], swap["recipient_id"]):
            find_user(uid)["swapsCompleted"] += 1
    swap.update(status=status, updated_at=datetime.utcnow())
    return jsonify({"message": f"Swap status changed to {status}"})


@app.route("/api/swaps/<swap_id>", methods=["DELETE"])
# @login_required
def delete_swap(swap_id):
    swap = find_swap(swap_id)
    if not swap or swap["requester_id"] != session["user_id"] or swap["status"] != "pending":
        return jsonify({"error": "Pending swap not found"}), 404
    SWAPS.remove(swap)
    return jsonify({"message": "Request cancelled"})


@app.route("/api/swaps/<swap_id>/review", methods=["POST"])
# @login_required
def submit_review(swap_id):
    me = session["user_id"]
    data = request.get_json(silent=True) or {}
    swap = find_swap(swap_id)
    if not swap or me not in (swap["requester_id"], swap["recipient_id"]):
        return jsonify({"error": "Swap not found"}), 404
    if swap["status"] != "completed":
        return jsonify({"error": "Only completed swaps can be reviewed"}), 400
    if any(r["swap_id"] == swap_id and r["reviewer_id"] == me for r in REVIEWS):
        return jsonify({"error": "You already reviewed this swap"}), 400
    try:
        stars = int(data.get("stars", 5))
    except (TypeError, ValueError):
        stars = 0
    if not 1 <= stars <= 5:
        return jsonify({"error": "stars must be between 1 and 5"}), 400

    reviewee_id = swap["recipient_id"] if me == swap["requester_id"] else swap["requester_id"]
    REVIEWS.append({"id": new_id("rev"), "swap_id": swap_id, "reviewer_id": me, "reviewee_id": reviewee_id,
                    "stars": stars, "comment": data.get("comment", ""), "created_at": datetime.utcnow()})
    swap["hasReviewed"] = True

    stars_list = [r["stars"] for r in REVIEWS if r["reviewee_id"] == reviewee_id]
    reviewee = find_user(reviewee_id)
    reviewee["rating"] = round(sum(stars_list) / len(stars_list), 2)
    reviewee["reviewCount"] = len(stars_list)
    return jsonify({"message": "Review submitted successfully"}), 201


# ===========================================================================
# AI ASSISTANT (rule-based; plug an LLM in where marked)
# ===========================================================================
@app.route("/api/ai/chat", methods=["POST"])
# @login_required
def ai_chat():
    query = ((request.get_json(silent=True) or {}).get("query") or "").strip()
    q = query.lower()
    me = current_user()
    # --- Production: call your LLM here and return its text ---

    if "figma" in q or "design" in q:
        matched = [u for u in discoverable_users(me["id"])
                   if any("figma" in s.lower() for s in u["skillsOffered"])]
        return jsonify({"response": f"🎨 Found {len(matched)} swappers teaching Figma UI/UX:",
                        "results": [serialize(u) for u in matched]})

    if "pending" in q or "my swaps" in q:
        pending = [s for s in SWAPS if s["recipient_id"] == me["id"] and s["status"] == "pending"]
        if pending:
            top = swap_view(pending[0], me["id"])
            text = (f"🔄 You have {len(pending)} pending incoming requests. Top request: "
                    f"{top['partnerName']} offering {top['skillOfferedToUser']}.")
        else:
            text = "🔄 You have no pending incoming requests."
        return jsonify({"response": text, "results": []})

    if "match" in q or "reciprocal" in q:
        best = max(discoverable_users(me["id"]), key=lambda u: compatibility(me, u), default=None)
        if best:
            return jsonify({"response": f"⚡ Your highest mutual match is {best['name']} "
                                        f"({compatibility(me, best)}% compatibility).",
                            "results": [serialize(best)]})

    return jsonify({"response": f'Understood! I\'ve analyzed the skill directory for "{query}". '
                                "Check the Matches tab or Explore feed for live listings.",
                    "results": []})


@app.route("/api/ai/summarize-profile/<user_id>", methods=["GET"])
# @login_required
def ai_summarize_profile(user_id):
    me, user = current_user(), find_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    summary = (f"{user['name']} has a {user.get('rating', 0)}★ rating over {user.get('reviewCount', 0)} swaps. "
               f"Their expertise in {', '.join(user.get('skillsOffered', []))} aligns with your wanted skills.")
    return jsonify({"user": serialize(user), "compatibility": compatibility(me, user), "summary": summary})


# ===========================================================================
# MODERATION, BROADCAST, ADMIN
# ===========================================================================
@app.route("/api/moderation/report", methods=["POST"])
# @login_required
def report_content():
    data = request.get_json(silent=True) or {}
    target = find_user(data.get("targetUserId"))
    if not target:
        return jsonify({"error": "Reported user not found"}), 404
    reason = data.get("reason", "Other")
    MODERATION.insert(0, {
        "id": new_id("mod"), "target_user_id": target["id"], "reporter_id": session["user_id"],
        "content": f"Reported by peer for: {reason}", "ai_category": reason, "ai_confidence": "99.1%",
        "ai_reason": "Submitted by verified community member. Auto-flagged for administrative review.",
        "status": "pending", "created_at": datetime.utcnow(),
    })
    return jsonify({"message": "Report submitted"}), 201


@app.route("/api/broadcast", methods=["GET"])
# @login_required
def get_broadcast():
    return jsonify(serialize(BROADCAST))


@app.route("/api/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    count = lambda status: sum(1 for s in SWAPS if s["status"] == status)
    return jsonify({
        "users": sum(1 for u in USERS if u["role"] != "admin"),
        "swaps": len(SWAPS), "activeSwaps": count("accepted"), "completedSwaps": count("completed"),
        "pendingReports": sum(1 for m in MODERATION if m["status"] == "pending"),
    })


@app.route("/api/admin/users", methods=["GET"])
@admin_required
def admin_users():
    return jsonify([serialize(u) for u in sorted(USERS, key=lambda u: u["created_at"], reverse=True)])


@app.route("/api/admin/moderation", methods=["GET"])
@admin_required
def get_moderation_items():
    items = []
    for m in sorted(MODERATION, key=lambda m: m["created_at"], reverse=True):
        target = find_user(m["target_user_id"]) or {}
        items.append(dict(serialize(m), targetUser=target.get("name", "unknown"),
                          userEmail=target.get("email", ""), date=time_ago(m["created_at"])))
    return jsonify(items)


@app.route("/api/admin/moderation/<mod_id>", methods=["PATCH"])
@admin_required
def resolve_moderation(mod_id):
    status = (request.get_json(silent=True) or {}).get("status")
    item = next((m for m in MODERATION if m["id"] == mod_id), None)
    if status not in ("pending", "dismissed", "actioned"):
        return jsonify({"error": "status must be pending, dismissed or actioned"}), 400
    if not item:
        return jsonify({"error": "Report not found"}), 404
    item.update(status=status, reviewed_at=datetime.utcnow())
    if status == "actioned" and find_user(item["target_user_id"]):
        find_user(item["target_user_id"])["visibility"] = "private"
    return jsonify({"message": f"Report {status}"})


@app.route("/api/admin/broadcast", methods=["POST"])
@admin_required
def set_broadcast():
    data = request.get_json(silent=True) or {}
    if not data.get("text"):
        return jsonify({"error": "text is required"}), 400
    BROADCAST.update(active=data.get("active", True), type=data.get("type", "announcement"),
                     text=data["text"], published_at=datetime.utcnow())
    return jsonify({"message": "Broadcast published"})


# ===========================================================================
# ERRORS & ENTRYPOINT
# ===========================================================================
@app.errorhandler(404)
def not_found(_):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Not found"}), 404
    return redirect(url_for("home"))


@app.errorhandler(500)
def server_error(_):
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)