
import os
import re
from datetime import datetime, timezone
from functools import wraps

from bson import ObjectId
from dotenv import load_dotenv
from flask import (
    Flask,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError

load_dotenv()

# ---------------------------------------------------------------------
# Flask setup
# ---------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = os.getenv(
    "SECRET_KEY",
    "skillswap-local-development-only",
)

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

CORS(app, supports_credentials=True)


def now_utc():
    return datetime.now(timezone.utc)


def error(message, status=400):
    return jsonify({"error": message}), status


# ---------------------------------------------------------------------
# MongoDB setup
# No automatic seeding. MongoDB operations connect when first needed.
# ---------------------------------------------------------------------

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://127.0.0.1:27017/skillswap",
)

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
db = client.get_default_database()

users_col = db["users"]
swaps_col = db["swaps"]
reviews_col = db["reviews"]

# Keep the existing collection name if admin.html expects it.
moderation_col = db["moderation"]
broadcasts_col = db["broadcasts"]


# ---------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------

def serialize_doc(doc):
    if doc is None:
        return None

    result = dict(doc)
    mongo_id = result.pop("_id", None)

    if "id" not in result and mongo_id is not None:
        result["id"] = str(mongo_id)

    return result


def find_user(user_id):
    """Resolve either a custom string ID or MongoDB ObjectId."""
    if not user_id:
        return None

    conditions = [{"id": str(user_id)}]

    if ObjectId.is_valid(str(user_id)):
        conditions.append({"_id": ObjectId(str(user_id))})

    return users_col.find_one({"$or": conditions})


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return error("Login required", 401)
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        user = find_user(session.get("user_id"))

        if not user or user.get("role") != "admin":
            return error("Admin access required", 403)

        return fn(*args, **kwargs)

    return wrapper


def get_json():
    return request.get_json(silent=True) or {}


def valid_object_id(value):
    return isinstance(value, str) and ObjectId.is_valid(value)


# ---------------------------------------------------------------------
# Frontend pages
# ---------------------------------------------------------------------

@app.route("/")
@app.route("/index")
@app.route("/index.html")
def home():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    return render_template("index.html")


@app.route("/login")
@app.route("/login.html")
def login():
    # Do not clear the session just because the login page was opened.
    return render_template("login.html")


@app.route("/admin")
@app.route("/admin.html")
def admin():
    if not session.get("user_id"):
        return redirect(url_for("login"))

    user = find_user(session.get("user_id"))

    if not user or user.get("role") != "admin":
        return error("Admin access required", 403)

    return render_template("admin.html")


# ---------------------------------------------------------------------
# Authentication
# Demo-only email login; replace with password authentication later.
# ---------------------------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = get_json()
    email = data.get("email")

    if not isinstance(email, str) or not email.strip():
        return error("Email is required")

    try:
        user = users_col.find_one(
            {"email": email.strip().lower()}
        )

        if not user:
            return error("User not found. Register or use a demo account.", 401)

        user_clean = serialize_doc(user)
        session["user_id"] = user_clean["id"]
        session["user_email"] = user.get("email")

        return jsonify({
            "message": "Demo login successful",
            "user": user_clean,
        })

    except PyMongoError:
        app.logger.exception("Login database error")
        return error("Database unavailable", 503)


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = get_json()

    name = data.get("name")
    email = data.get("email")

    if not isinstance(name, str) or not name.strip():
        return error("Name is required")

    if not isinstance(email, str) or not re.fullmatch(
        r"[^@\s]+@[^@\s]+\.[^@\s]+", email.strip()
    ):
        return error("A valid email is required")

    email = email.strip().lower()

    try:
        if users_col.find_one({"email": email}):
            return error("User with this email already exists", 409)

        user = {
            "name": name.strip(),
            "email": email,
            "role": "user",
            "avatar": data.get("avatar", ""),
            "location": data.get("location", "Remote"),
            "bio": data.get("bio", ""),
            "visibility": "public",
            "availability": data.get("availability", ["Weekends"]),
            "skillsOffered": (
                [data["skill"]] if data.get("skill")
                else ["General Mentorship"]
            ),
            "skillsWanted": ["Programming"],
            "rating": 5.0,
            "reviewCount": 0,
            "swapsCompleted": 0,
            "created_at": now_utc(),
        }

        inserted = users_col.insert_one(user)
        user["id"] = str(inserted.inserted_id)

        session["user_id"] = user["id"]
        session["user_email"] = email

        return jsonify({
            "message": "Registration successful",
            "user": user,
        }), 201

    except PyMongoError:
        app.logger.exception("Registration database error")
        return error("Database unavailable", 503)


@app.route("/logout")
@app.route("/api/auth/logout", methods=["GET", "POST"])
def logout():
    session.clear()

    if request.path.startswith("/api/"):
        return jsonify({"message": "Logged out"})

    return redirect(url_for("login"))


# ---------------------------------------------------------------------
# Profiles
# ---------------------------------------------------------------------

@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    try:
        user = find_user(session.get("user_id"))

        if not user:
            session.clear()
            return error("User not found", 404)

        return jsonify(serialize_doc(user))

    except PyMongoError:
        app.logger.exception("Profile lookup failed")
        return error("Database unavailable", 503)


@app.route("/api/profile/update", methods=["POST"])
@login_required
def update_profile():
    data = get_json()

    # The logged-in user's session determines which profile can be edited.
    user = find_user(session.get("user_id"))

    if not user:
        return error("User not found", 404)

    allowed_fields = (
        "name",
        "location",
        "bio",
        "visibility",
        "availability",
        "skillsOffered",
        "skillsWanted",
    )

    updates = {
        field: data[field]
        for field in allowed_fields
        if field in data
    }
    updates["updated_at"] = now_utc()

    try:
        users_col.update_one(
            {"_id": user["_id"]},
            {"$set": updates},
        )

        updated_user = users_col.find_one({"_id": user["_id"]})

        return jsonify({
            "message": "Profile updated successfully",
            "user": serialize_doc(updated_user),
        })

    except PyMongoError:
        app.logger.exception("Profile update failed")
        return error("Database unavailable", 503)


# ---------------------------------------------------------------------
# Public profile discovery
# ---------------------------------------------------------------------

@app.route("/api/users", methods=["GET"])
def get_users():
    skill = request.args.get("skill", "").strip()

    query = {"visibility": "public"}

    if skill:
        escaped_skill = re.escape(skill[:100])
        query["$or"] = [
            {"skillsOffered": {"$regex": escaped_skill, "$options": "i"}},
            {"skillsWanted": {"$regex": escaped_skill, "$options": "i"}},
        ]

    try:
        users = [
            serialize_doc(user)
            for user in users_col.find(query).limit(100)
        ]
        return jsonify(users)

    except PyMongoError:
        app.logger.exception("User search failed")
        return error("Database unavailable", 503)


# ---------------------------------------------------------------------
# Swap requests
# ---------------------------------------------------------------------

@app.route("/api/swaps", methods=["GET"])
@login_required
def get_swaps():
    user_id = session.get("user_id")

    try:
        swaps = swaps_col.find({
            "$or": [
                {"requester_id": user_id},
                {"partner_id": user_id},
                # Support legacy frontend documents using partnerId.
                {"partnerId": user_id},
            ]
        }).limit(100)

        return jsonify([serialize_doc(swap) for swap in swaps])

    except PyMongoError:
        app.logger.exception("Swap lookup failed")
        return error("Database unavailable", 503)


@app.route("/api/swaps/create", methods=["POST"])
@login_required
def create_swap():
    data = get_json()

    partner_id = data.get("partnerId")
    if not partner_id:
        return error("partnerId is required")

    if str(partner_id) == str(session["user_id"]):
        return error("You cannot create a swap with yourself")

    try:
        partner = find_user(str(partner_id))

        if not partner or partner.get("visibility") != "public":
            return error("Public partner profile not found", 404)

        swap = {
            "requester_id": session["user_id"],
            "partner_id": str(partner_id),
            "partnerId": str(partner_id),
            "partnerName": partner.get("name", ""),
            "skillWanted": data.get("skillWanted", ""),
            "skillOffered": data.get("skillOffered", ""),
            "message": data.get("message", ""),
            "status": "pending",
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }

        result = swaps_col.insert_one(swap)
        swap["id"] = str(result.inserted_id)

        return jsonify({
            "message": "Swap request created",
            "swap": swap,
        }), 201

    except PyMongoError:
        app.logger.exception("Swap creation failed")
        return error("Database unavailable", 503)


@app.route("/api/swaps/<swap_id>/status", methods=["PATCH"])
@login_required
def update_swap_status(swap_id):
    if not valid_object_id(swap_id):
        return error("Invalid swap ID")

    data = get_json()
    status = data.get("status")

    if status not in {"pending", "accepted", "rejected", "completed", "cancelled"}:
        return error("Invalid swap status")

    try:
        swap = swaps_col.find_one({"_id": ObjectId(swap_id)})

        if not swap:
            return error("Swap not found", 404)

        user_id = str(session["user_id"])
        requester = str(swap.get("requester_id", ""))
        partner = str(swap.get("partner_id", swap.get("partnerId", "")))

        if user_id not in {requester, partner}:
            return error("Not allowed to update this swap", 403)

        # Only the partner may accept or reject a pending request.
        if status in {"accepted", "rejected"}:
            if user_id != partner or swap.get("status") != "pending":
                return error("Cannot apply this status change", 403)

        swaps_col.update_one(
            {"_id": ObjectId(swap_id)},
            {"$set": {"status": status, "updated_at": now_utc()}},
        )

        return jsonify({"message": "Swap status updated", "status": status})

    except PyMongoError:
        app.logger.exception("Swap update failed")
        return error("Database unavailable", 503)


@app.route("/api/swaps/<swap_id>/review", methods=["POST"])
@login_required
def submit_review(swap_id):
    if not valid_object_id(swap_id):
        return error("Invalid swap ID")

    data = get_json()
    stars = data.get("stars", 5)

    if not isinstance(stars, int) or isinstance(stars, bool) or not 1 <= stars <= 5:
        return error("Stars must be an integer from 1 to 5")

    try:
        swap = swaps_col.find_one({"_id": ObjectId(swap_id)})

        if not swap:
            return error("Swap not found", 404)

        if swap.get("status") != "completed":
            return error("Only completed swaps can be reviewed", 400)

        reviewer_id = str(session["user_id"])
        requester_id = str(swap.get("requester_id", ""))
        partner_id = str(swap.get("partner_id", swap.get("partnerId", "")))

        if reviewer_id not in {requester_id, partner_id}:
            return error("Not allowed to review this swap", 403)

        reviewee_id = (
            partner_id if reviewer_id == requester_id else requester_id
        )

        if not reviewee_id or reviewee_id == reviewer_id:
            return error("Invalid review participants")

        if reviews_col.find_one({
            "swap_id": swap_id,
            "reviewer_id": reviewer_id,
        }):
            return error("You have already reviewed this swap", 409)

        review = {
            "swap_id": swap_id,
            "reviewer_id": reviewer_id,
            "reviewee_id": reviewee_id,
            "stars": stars,
            "comment": data.get("comment", ""),
            "created_at": now_utc(),
        }

        result = reviews_col.insert_one(review)
        review["id"] = str(result.inserted_id)

        return jsonify({
            "message": "Review submitted successfully",
            "review": review,
        }), 201

    except PyMongoError:
        app.logger.exception("Review submission failed")
        return error("Database unavailable", 503)


# ---------------------------------------------------------------------
# AI integration placeholder
# Replace with your intent router, automation and profile RAG.
# ---------------------------------------------------------------------

@app.route("/api/ai/chat", methods=["POST"])
@login_required
def ai_chat():
    data = get_json()
    query = data.get("query")

    if not isinstance(query, str) or not query.strip():
        return error("A query is required")

    # Temporary response until the AI module is connected.
    return jsonify({
        "response": "AI integration is not connected yet.",
        "intent": "GENERAL",
        "results": [],
    })


# ---------------------------------------------------------------------
# Admin APIs
# ---------------------------------------------------------------------

@app.route("/api/admin/moderation", methods=["GET"])
@admin_required
def get_moderation_items():
    try:
        items = [
            serialize_doc(item)
            for item in moderation_col.find().limit(100)
        ]
        return jsonify(items)

    except PyMongoError:
        app.logger.exception("Moderation lookup failed")
        return error("Database unavailable", 503)


@app.route("/api/admin/broadcast", methods=["POST"])
@admin_required
def set_broadcast():
    data = get_json()
    text = data.get("text")

    if not isinstance(text, str) or not text.strip():
        return error("Broadcast text is required")

    try:
        broadcasts_col.update_one(
            {"type": data.get("type", "announcement")},
            {"$set": {
                "active": True,
                "type": data.get("type", "announcement"),
                "text": text.strip(),
                "published_at": now_utc(),
            }},
            upsert=True,
        )

        return jsonify({"message": "Broadcast published"})

    except PyMongoError:
        app.logger.exception("Broadcast update failed")
        return error("Database unavailable", 503)


# ---------------------------------------------------------------------
# Start server
# ---------------------------------------------------------------------

if __name__ == "__main__":
    app.run(port=5000, debug=True)