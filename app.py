"""
=============================================================================
SKILLSWAP - PYTHON FLASK + MONGODB + GOOGLE OAUTH BACKEND
=============================================================================
This production-ready application connects seamlessly to the Vanilla JS frontend
(`script.js`, `login.html`, `index.html`, and `admin.html`).

Prerequisites:
  pip install flask flask-cors pymongo authlib requests python-dotenv
  (optional, for gzip) pip install flask-compress

MongoDB Collections Schema:
  - `users`: { _id, email, password_hash, google_id, name, avatar, location,
               bio, visibility, availability, skillsOffered, skillsWanted,
               rating, reviewCount, swapsCompleted, role, created_at }
  - `swaps`: { _id, requester_id, partner_id, skillWanted, skillOffered,
               message, status, created_at, updated_at }
  - `reviews`: { _id, swap_id, reviewer_id, reviewee_id, stars, comment, created_at }
  - `moderation`: { _id, target_user_id, content, ai_category, ai_confidence,
                    ai_reason, status, created_at }
  - `broadcasts`: { _id, active, type, text, published_at }
=============================================================================
"""

from datetime import datetime
from functools import wraps
import os
# pyrefly: ignore[missing-import]
from bson import ObjectId
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from flask_cors import CORS
from mock_data import seed_mongodb
# pyrefly: ignore[missing-import]
from pymongo import MongoClient
import requests

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv(
    "SECRET_KEY", "skillswap-insecure-secret-key-change-in-prod"
)

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "skillswap-insecure-secret-key-change-in-prod")
# PERF: allow browsers to cache static files (was 0)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 86400
app.config['TEMPLATES_AUTO_RELOAD'] = True
CORS(app, supports_credentials=True)

# PERF: gzip responses if flask-compress is installed (optional)
try:
    from flask_compress import Compress
    Compress(app)
except ImportError:
    pass

@app.after_request
def add_no_cache_headers(response):
    # PERF: only disable caching for HTML/API; let static assets be cached
    if request.path.startswith("/static/"):
        response.headers['Cache-Control'] = 'public, max-age=86400'
    else:
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '-1'
    return response

# ---------------------------------------------------------------------------
# Frontend Page Routes (HTML Templates)
# ---------------------------------------------------------------------------
@app.route("/")
@app.route("/index")
@app.route("/index.html")
def home():
    """Serves the main User Dashboard view"""
    # Redirect to login page if not logged in
    if not session.get("user_id"):
        return redirect(url_for("login"))
    return render_template("index.html")

@app.route("/login")
@app.route("/login.html")
def login():
    """Serves the Login & Access Portal view"""
    # Landing on the login page means signed out: clear any server session
    session.clear()
    return render_template("login.html")

@app.route("/logout")
@app.route("/api/auth/logout", methods=["GET", "POST"])
def logout():
    """Clears the server session"""
    session.clear()
    if request.path.startswith("/api/"):
        return jsonify({"message": "Logged out"})
    return redirect(url_for("login"))

@app.route("/admin")
@app.route("/admin.html")
def admin():
    """Serves the Admin Moderation Dashboard view"""
    return render_template("admin.html")

# Static fallback routes ensuring zero 404 errors regardless of path syntax
@app.route("/static/style.css")
def serve_root_style():
    if os.path.exists(os.path.join(app.static_folder, "style.css")):
        return app.send_static_file("style.css")
    return app.send_static_file("css/style.css")

@app.route("/static/css/style.css")
def serve_css_style():
    if os.path.exists(os.path.join(app.static_folder, "css", "style.css")):
        return app.send_static_file("css/style.css")
    return app.send_static_file("style.css")

@app.route("/static/script.js")
def serve_root_script():
    if os.path.exists(os.path.join(app.static_folder, "script.js")):
        return app.send_static_file("script.js")
    return app.send_static_file("js/script.js")

@app.route("/static/js/script.js")
def serve_js_script():
    if os.path.exists(os.path.join(app.static_folder, "js", "script.js")):
        return app.send_static_file("js/script.js")
    return app.send_static_file("script.js")

# ---------------------------------------------------------------------------
# MongoDB Connection & Auto-Seed
# ---------------------------------------------------------------------------
# PERF: 127.0.0.1 avoids slow localhost/IPv6 resolution
MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/skillswap")
# PERF: fail fast (2s instead of 30s) when DB is unreachable, bigger pool
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000, maxPoolSize=50)
db = client.get_default_database()

users_col = db["users"]
swaps_col = db["swaps"]
reviews_col = db["reviews"]
moderation_col = db["moderation"]
broadcasts_col = db["broadcasts"]

# Automatically seed mock_data into local MongoDB if empty
try:
  seed_mongodb(db)
except Exception as e:
  print(f"⚠️ Could not connect/seed MongoDB: {e}")

# PERF: indexes so lookups don't scan whole collections
try:
  users_col.create_index("email")
  users_col.create_index("id")
  users_col.create_index("visibility")
  swaps_col.create_index("created_at")
except Exception as e:
  print(f"⚠️ Could not create indexes: {e}")


# Helper for JSON serialization of ObjectId
def serialize_doc(doc):
  if not doc:
    return None
  doc = dict(doc)
  if "_id" in doc:
    # Keep custom id if present (from mock_data), else use Mongo _id
    if "id" not in doc:
      doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
  return doc


# ---------------------------------------------------------------------------
# Google OAuth 2.0 Real Implementation
# ---------------------------------------------------------------------------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")


@app.route("/auth/google")
def google_auth_login():
  """Initiates Google OAuth 2.0 flow"""
  redirect_uri = url_for("google_auth_callback", _external=True)
  google_auth_url = (
      "https://accounts.google.com/o/oauth2/v2/auth?"
      f"client_id={GOOGLE_CLIENT_ID}&"
      "response_type=code&"
      "scope=openid%20email%20profile&"
      f"redirect_uri={redirect_uri}&"
      "access_type=offline&"
      "prompt=select_account"
  )
  return redirect(google_auth_url)


@app.route("/auth/google/callback")
def google_auth_callback():
  """Receives authorization code from Google, exchanges for profile, saves to MongoDB"""
  code = request.args.get("code")
  if not code:
    return redirect(url_for("login"))

  redirect_uri = url_for("google_auth_callback", _external=True)

  # 1. Exchange authorization code for access token with Google
  token_res = requests.post(
      "https://oauth2.googleapis.com/token",
      data={
          "code": code,
          "client_id": GOOGLE_CLIENT_ID,
          "client_secret": GOOGLE_CLIENT_SECRET,
          "redirect_uri": redirect_uri,
          "grant_type": "authorization_code",
      },
      timeout=5,  # PERF: don't hang forever
  )
  token_data = token_res.json()
  access_token = token_data.get("access_token")

  if not access_token:
    return (
        jsonify(
            {"error": "Failed to fetch Google access token", "details": token_data}
        ),
        400,
    )

  # 2. Fetch user profile from Google
  userinfo_res = requests.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      headers={"Authorization": f"Bearer {access_token}"},
      timeout=5,  # PERF: don't hang forever
  )
  google_user = userinfo_res.json()
  google_email = google_user.get("email")
  google_name = google_user.get("name", "Google User")
  google_id = google_user.get("id")
  google_avatar = (
      google_user.get("picture") or "static/images/default-avatar.png"
  )

  # 3. Try saving/finding user in MongoDB (Safely catch offline database)
  try:
    user = users_col.find_one({"email": google_email})
    if not user:
      new_user_doc = {
          "name": google_name,
          "email": google_email,
          "google_id": google_id,
          "role": "user",
          "avatar": google_avatar,
          "location": "Remote",
          "bio": "Joined via Google OAuth",
          "visibility": "public",
          "availability": ["Weekends", "Weekday Evenings"],
          "skillsOffered": ["General Mentorship"],
          "skillsWanted": ["Programming"],
          "rating": 5.0,
          "reviewCount": 0,
          "swapsCompleted": 0,
          "created_at": datetime.utcnow(),
      }
      inserted = users_col.insert_one(new_user_doc)
      user = users_col.find_one({"_id": inserted.inserted_id})
    else:
      users_col.update_one(
          {"_id": user["_id"]}, {"$set": {"google_id": google_id}}
      )

    user_clean = serialize_doc(user)

  except Exception as db_err:
    # 🛑 If MongoDB is offline, create a temporary session user object so the app doesn't crash!
    print(f"⚠️ Database offline error caught: {db_err}")
    user_clean = {
        "id": "temp_offline_user",
        "name": google_name,
        "email": google_email,
        "role": "user",
        "avatar": google_avatar,
    }

  # 4. Set session & sync to frontend localStorage
  session["user_id"] = user_clean.get("id")
  session["user_email"] = google_email

  import json

  user_json = json.dumps(user_clean, default=str)
  return f"""
    <script>
        localStorage.setItem('skillswap_user', {json.dumps(user_json)});
        localStorage.setItem('skillswap_role', 'user');
        window.location.href = '/';
    </script>
    """
# ---------------------------------------------------------------------------
# Authentication APIs
# ---------------------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
  data = request.get_json() or {}
  email = data.get("email")
  user = users_col.find_one({"email": email})
  if not user:
    return jsonify({"error": "Invalid email or credentials"}), 401
  user_clean = serialize_doc(user)
  session["user_id"] = user_clean["id"]
  return jsonify({"message": "Login successful", "user": user_clean})

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json() or {}
    if users_col.find_one({"email": data.get("email")}):
        return jsonify({"error": "User with this email already exists"}), 400
    
    new_user = {
        "name": data.get("name"),
        "email": data.get("email"),
        "role": "user",
        "avatar": data.get("avatar", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200"),
        "location": data.get("location", "Remote"),
        "bio": data.get("bio", ""),
        "visibility": "public",
        "availability": data.get("availability", ["Weekends"]),
        "skillsOffered": [data.get("skill")] if data.get("skill") else ["General Mentorship"],
        "skillsWanted": ["Programming"],
        "rating": 5.0,
        "swapsCompleted": 0,
        "created_at": datetime.utcnow()
    }
    user_id = users_col.insert_one(new_user).inserted_id
    new_user["id"] = str(user_id)
    return jsonify({"message": "Registration successful", "user": new_user}), 201

# ---------------------------------------------------------------------------
# Profile & Skills Management
# ---------------------------------------------------------------------------
@app.route("/api/profile", methods=["GET"])
def get_profile():
  user_id = session.get("user_id")
  if not user_id:
    user = users_col.find_one({"id": "usr_alex_01"}) or users_col.find_one()
    return jsonify(serialize_doc(user))

  # PERF: single query instead of up to two sequential ones
  # Check by custom 'id' first, then by Mongo '_id'
  conditions = [{"id": user_id}]
  if ObjectId.is_valid(user_id):
    conditions.append({"_id": ObjectId(user_id)})
  user = users_col.find_one({"$or": conditions})
  return jsonify(serialize_doc(user))

@app.route("/api/profile/update", methods=["POST"])
def update_profile():
    data = request.get_json() or {}
    user_id = data.get("id") or session.get("user_id")
    if user_id:
        users_col.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {
                "name": data.get("name"),
                "location": data.get("location"),
                "bio": data.get("bio"),
                "visibility": data.get("visibility", "public"),
                "availability": data.get("availability", []),
                "skillsOffered": data.get("skillsOffered", []),
                "skillsWanted": data.get("skillsWanted", []),
                "updated_at": datetime.utcnow()
            }}
        )
    return jsonify({"message": "Profile updated successfully"})

# ---------------------------------------------------------------------------
# User Search & Discovery
# ---------------------------------------------------------------------------
@app.route("/api/users", methods=["GET"])
def get_users():
    query = {"visibility": "public"}
    skill_filter = request.args.get("skill")
    if skill_filter:
        query["$or"] = [
            {"skillsOffered": {"$regex": skill_filter, "$options": "i"}},
            {"skillsWanted": {"$regex": skill_filter, "$options": "i"}}
        ]
    # PERF: cap result size
    users = [serialize_doc(u) for u in users_col.find(query).limit(100)]
    return jsonify(users)

# ---------------------------------------------------------------------------
# Swap Requests & Reviews Workflow
# ---------------------------------------------------------------------------
@app.route("/api/swaps", methods=["GET"])
def get_swaps():
    # PERF: cap result size
    swaps = [serialize_doc(s) for s in swaps_col.find().limit(100)]
    return jsonify(swaps)

@app.route("/api/swaps/create", methods=["POST"])
def create_swap():
    data = request.get_json() or {}
    new_swap = {
        "partnerId": data.get("partnerId"),
        "partnerName": data.get("partnerName"),
        "skillWanted": data.get("skillWanted"),
        "skillOffered": data.get("skillOffered"),
        "message": data.get("message"),
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    swap_id = swaps_col.insert_one(new_swap).inserted_id
    new_swap["id"] = str(swap_id)
    return jsonify({"message": "Swap request created", "swap": new_swap}), 201

@app.route("/api/swaps/<swap_id>/status", methods=["PATCH"])
def update_swap_status(swap_id):
    status = request.get_json().get("status")
    swaps_col.update_one(
        {"_id": ObjectId(swap_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    return jsonify({"message": f"Swap status changed to {status}"})

@app.route("/api/swaps/<swap_id>/review", methods=["POST"])
def submit_review(swap_id):
    data = request.get_json() or {}
    review = {
        "swap_id": swap_id,
        "stars": data.get("stars", 5),
        "comment": data.get("comment"),
        "created_at": datetime.utcnow()
    }
    reviews_col.insert_one(review)
    return jsonify({"message": "Review submitted successfully"}), 201

# ---------------------------------------------------------------------------
# AI Assistant Section (Automation & RAG Mock Endpoints)
# ---------------------------------------------------------------------------
@app.route("/api/ai/chat", methods=["POST"])
def ai_chat():
    data = request.get_json() or {}
    query = data.get("query", "").lower()
    return jsonify({
        "response": f"AI Copilot processed query: {query}. Matching complementary skills.",
        "results": []
    })

# ---------------------------------------------------------------------------
# Admin Dashboard APIs
# ---------------------------------------------------------------------------
@app.route("/api/admin/moderation", methods=["GET"])
def get_moderation_items():
    # PERF: cap result size
    items = [serialize_doc(i) for i in moderation_col.find().limit(100)]
    return jsonify(items)

@app.route("/api/admin/broadcast", methods=["POST"])
def set_broadcast():
    data = request.get_json() or {}
    broadcasts_col.update_one(
        {},
        {"$set": {
            "active": True,
            "type": data.get("type", "announcement"),
            "text": data.get("text"),
            "published_at": datetime.utcnow()
        }},
        upsert=True
    )
    return jsonify({"message": "Broadcast published"})

if __name__ == "__main__":
    app.run(port=5000, debug=True)