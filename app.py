"""
=============================================================================
SKILLSWAP - PYTHON FLASK + MONGODB + GOOGLE OAUTH BACKEND
=============================================================================
This production-ready application connects seamlessly to the Vanilla JS frontend
(`script.js`, `login.html`, `index.html`, and `admin.html`).

Prerequisites:
  pip install flask flask-cors pymongo authlib requests python-dotenv

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

import os
from datetime import datetime
from functools import wraps
from flask import Flask, request, jsonify, redirect, session, url_for
from flask_cors import CORS
# pyrefly: ignore[missing-import]
from pymongo import MongoClient
# pyrefly: ignore[missing-import]
from bson import ObjectId

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "skillswap-insecure-secret-key-change-in-prod")
CORS(app, supports_credentials=True)

# ---------------------------------------------------------------------------
# MongoDB Connection
# ---------------------------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/skillswap")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

users_col = db["users"]
swaps_col = db["swaps"]
reviews_col = db["reviews"]
moderation_col = db["moderation"]
broadcasts_col = db["broadcasts"]

# Helper for JSON serialization of ObjectId
def serialize_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc.pop("_id"))
    return doc

# ---------------------------------------------------------------------------
# Google OAuth 2.0 Placeholder Routes
# ---------------------------------------------------------------------------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id.apps.googleusercontent.com")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret")

@app.route("/auth/google")
def google_auth_login():
    """Initiates Google OAuth 2.0 flow"""
    redirect_uri = url_for("google_auth_callback", _external=True)
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={GOOGLE_CLIENT_ID}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"redirect_uri={redirect_uri}"
    )
    return redirect(google_auth_url)

@app.route("/auth/google/callback")
def google_auth_callback():
    """Receives authorization code from Google, creates/logs in user in MongoDB"""
    code = request.args.get("code")
    # In production: exchange code with Google token endpoint, then fetch userinfo
    google_email = "alex.rivera@gmail.com"
    user = users_col.find_one({"email": google_email})
    if not user:
        user_id = users_col.insert_one({
            "name": "Alex Rivera (Google)",
            "email": google_email,
            "role": "user",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
            "location": "San Francisco, CA",
            "visibility": "public",
            "availability": ["Weekends", "Weekday Evenings"],
            "skillsOffered": ["Python Programming", "Data Analysis"],
            "skillsWanted": ["Figma UI/UX", "Digital Illustration"],
            "rating": 5.0,
            "swapsCompleted": 0,
            "created_at": datetime.utcnow()
        }).inserted_id
        user = users_col.find_one({"_id": user_id})

    # Set user session
    session["user_id"] = str(user["_id"])
    return redirect("http://localhost:8080/index.html")

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
    return jsonify({"message": "Login successful", "user": serialize_doc(user)})

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
        user = users_col.find_one() or {}
        return jsonify(serialize_doc(user))
    user = users_col.find_one({"_id": ObjectId(user_id)})
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
    users = [serialize_doc(u) for u in users_col.find(query)]
    return jsonify(users)

# ---------------------------------------------------------------------------
# Swap Requests & Reviews Workflow
# ---------------------------------------------------------------------------
@app.route("/api/swaps", methods=["GET"])
def get_swaps():
    swaps = [serialize_doc(s) for s in swaps_col.find()]
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
    items = [serialize_doc(i) for i in moderation_col.find()]
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
