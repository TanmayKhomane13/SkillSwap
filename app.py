"""
SkillSwap Flask backend (SQLite).

Setup:
    pip install flask flask-cors
    python seed_db.py      # creates skillswap.db with tables + demo data
    python app.py
"""

import hashlib
import io
import json
import os
import re
import sqlite3
import time
from functools import wraps
from pathlib import Path

from flask import (
    Flask, jsonify, redirect, render_template, request, send_file, session, url_for,
)
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from vector_store import store_profile

# ---------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "skillswap.db"

# Dropdown values (the frontend <select> options must match these)
EXPERIENCE_LEVELS = ("Beginner", "Intermediate", "Advanced")
AVAILABILITY_OPTIONS = ("Weekends", "Weekday Evenings", "Custom Availability")
REPORT_STATUSES = ("Open", "Under Review", "Resolved")
# Allowed profile picture types (file extension -> content type)
IMAGE_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "gif": "image/gif",
}

# Every users column EXCEPT the image bytes, so lists of users stay light.
# has_pic is 1 when the user has uploaded a picture.
USER_COLUMNS = (
    "id, name, email, bio, skills_offered, skills_wanted, experience, "
    "availability, rating, role, profile_pic IS NOT NULL AS has_pic"
)

# Shown when a user has not uploaded a profile picture
DEFAULT_AVATAR = (
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
    "?w=200&auto=format&fit=crop&q=80"
)

app = Flask(__name__)
# A new random key on every start: old login cookies stop working, so after
# restarting the server everyone lands on the login page again.
app.secret_key = os.urandom(24)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,  # max upload size: 2 MB
)
CORS(app, supports_credentials=True)


# ---------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------
def error(message, status=400):
    return jsonify({"error": message}), status


def get_json():
    return request.get_json(silent=True) or {}


def fetch_all(sql, args=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        return conn.execute(sql, args).fetchall()
    finally:
        conn.close()


def fetch_one(sql, args=()):
    rows = fetch_all(sql, args)
    return rows[0] if rows else None


def execute(sql, args=()):
    """Run INSERT / UPDATE. Returns the new row id (for INSERT)."""
    conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.execute(sql, args)
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()


def password_problem(password):
    """Return a message if the password is too weak, otherwise None."""
    if not 8 <= len(password) <= 128:
        return "Password must be 8 to 128 characters long"
    if not re.search(r"[a-z]", password):
        return "Password needs at least one lowercase letter"
    if not re.search(r"[A-Z]", password):
        return "Password needs at least one uppercase letter"
    if not re.search(r"\d", password):
        return "Password needs at least one number"
    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password needs at least one special character (e.g. @ # $ !)"
    return None


def user_to_json(row):
    """Turn a users row into the JSON shape the frontend expects."""
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "email": row["email"],
        "bio": row["bio"],
        "role": row["role"],
        "experience": row["experience"],
        "availability": row["availability"],
        "skillsOffered": json.loads(row["skills_offered"]),
        "skillsWanted": json.loads(row["skills_wanted"]),
        "rating": row["rating"],
        "avatar": f"/api/users/{row['id']}/picture" if row["has_pic"] else DEFAULT_AVATAR,
        # Not stored in the database; the frontend just needs a value
        "location": "",
        "visibility": "public",
        "swapsCompleted": 0,
    }


def current_user():
    return fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (session.get("user_id"),))


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return error("Login required", 401)
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("admin_id"):
            return error("Admin access required", 403)
        return fn(*args, **kwargs)
    return wrapper


# ---------------------------------------------------------------------
# Pages
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
    return render_template("login.html")


@app.route("/admin")
@app.route("/admin.html")
def admin():
    if not session.get("admin_id"):
        return redirect(url_for("login"))
    return render_template("admin.html")


# ---------------------------------------------------------------------
# Auth
# Passwords are stored hashed (users.password_hash), never as plain text.
# ---------------------------------------------------------------------
@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = get_json()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    account = fetch_one("SELECT id, password_hash FROM users WHERE email = ?", (email,))

    # Same message for "no such email" and "wrong password" so nobody can guess which emails exist
    if not account or not account["password_hash"] \
            or not check_password_hash(account["password_hash"], password):
        return error("Invalid email or password", 401)

    session.clear()
    session["user_id"] = account["id"]
    row = fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (account["id"],))
    return jsonify({"message": "Login successful", "user": user_to_json(row)})


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = get_json()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    bio = str(data.get("bio", "")).strip()
    experience = data.get("experience", "Beginner")
    availability = data.get("availability", "Weekends")
    skills = [s.strip() for s in str(data.get("skill", "")).split(",") if s.strip()]

    if not name:
        return error("Name is required")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return error("A valid email is required")
    problem = password_problem(password)
    if problem:
        return error(problem)
    if experience not in EXPERIENCE_LEVELS:
        return error("Experience must be one of: " + ", ".join(EXPERIENCE_LEVELS))
    if availability not in AVAILABILITY_OPTIONS:
        return error("Availability must be one of: " + ", ".join(AVAILABILITY_OPTIONS))

    try:
        user_id = execute(
            """INSERT INTO users
               (name, email, password_hash, bio, skills_offered, experience, availability)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (name, email, generate_password_hash(password), bio,
             json.dumps(skills), experience, availability),
        )
        new_row = fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (user_id,))
        if new_row:
            try:
                store_profile(new_row)
            except Exception as e:
                # Do not fail the registration if vector store has a temporary problem
                print(f"[vector_store] failed to store new user {user_id}: {e}")      
    except sqlite3.IntegrityError:
        return error("User with this email already exists", 409)

    session.clear()
    session["user_id"] = user_id
    row = fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (user_id,))
    return jsonify({"message": "Registration successful", "user": user_to_json(row)}), 201


@app.route("/api/auth/admin-login", methods=["POST"])
def auth_admin_login():
    data = get_json()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    row = fetch_one("SELECT * FROM admin WHERE email = ?", (email,))
    if not row or not check_password_hash(row["password_hash"], password):
        return error("Invalid admin credentials", 401)

    session.clear()
    session["admin_id"] = row["id"]
    admin_user = {"id": str(row["id"]), "name": row["name"], "email": row["email"], "role": "admin"}
    return jsonify({"message": "Admin login successful", "user": admin_user})


@app.route("/logout")
@app.route("/api/auth/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    if request.path.startswith("/api/"):
        return jsonify({"message": "Logged out"})
    return redirect(url_for("login"))


# ---------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------
@app.route("/api/profile", methods=["GET"])
@login_required
def get_profile():
    row = current_user()
    if not row:
        session.clear()
        return error("User not found", 404)
    return jsonify(user_to_json(row))


@app.route("/api/profile/update", methods=["POST"])
@login_required
def update_profile():
    row = current_user()
    if not row:
        return error("User not found", 404)

    data = get_json()

    # Use the new value if it was sent, otherwise keep the current one
    name = str(data.get("name") or row["name"]).strip()
    bio = str(data.get("bio", row["bio"])).strip()
    experience = data.get("experience", row["experience"])
    availability = data.get("availability", row["availability"])
    offered = data.get("skillsOffered", json.loads(row["skills_offered"]))
    wanted = data.get("skillsWanted", json.loads(row["skills_wanted"]))

    if not name:
        return error("Name cannot be empty")
    if experience not in EXPERIENCE_LEVELS:
        return error("Experience must be one of: " + ", ".join(EXPERIENCE_LEVELS))
    if availability not in AVAILABILITY_OPTIONS:
        return error("Availability must be one of: " + ", ".join(AVAILABILITY_OPTIONS))
    if not isinstance(offered, list) or not isinstance(wanted, list):
        return error("Skills must be lists")

    execute(
        """UPDATE users
           SET name = ?, bio = ?, experience = ?, availability = ?,
               skills_offered = ?, skills_wanted = ?
           WHERE id = ?""",
        (name, bio, experience, availability,
         json.dumps(offered), json.dumps(wanted), row["id"]),
    )

    updated_row = fetch_one(f"SELECT {USER_COLUMNS} FROM users WHERE id = ?", (row["id"],))
    if updated_row:
        try:
            store_profile(updated_row)
        except Exception as e:
            print(f"[vector_store] failed to update user {row['id']}: {e}")

    updated = current_user()
    return jsonify({"message": "Profile updated successfully", "user": user_to_json(updated)})


@app.route("/api/profile/picture", methods=["POST"])
@login_required
def upload_profile_picture():
    file = request.files.get("photo")

    if not file or not file.filename:
        return error("Please choose an image")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in IMAGE_TYPES:
        return error("Allowed image types: " + ", ".join(sorted(IMAGE_TYPES)))

    # The image itself is saved inside the database as a BLOB
    image_bytes = file.read()
    execute(
        "UPDATE users SET profile_pic = ?, profile_pic_type = ? WHERE id = ?",
        (image_bytes, IMAGE_TYPES[ext], session["user_id"]),
    )

    # ?v=<time> makes the browser load the new image instead of a cached one
    avatar = f"/api/users/{session['user_id']}/picture?v={int(time.time())}"
    return jsonify({"message": "Profile picture updated", "avatar": avatar})


@app.route("/api/users/<int:user_id>/picture")
def get_profile_picture(user_id):
    """Send the BLOB back as a normal image (used by <img src="...">)."""
    row = fetch_one("SELECT profile_pic, profile_pic_type FROM users WHERE id = ?", (user_id,))
    if not row or not row["profile_pic"]:
        return redirect(DEFAULT_AVATAR)

    return send_file(
        io.BytesIO(row["profile_pic"]),
        mimetype=row["profile_pic_type"],
        etag=hashlib.md5(row["profile_pic"]).hexdigest(),
        max_age=0,  # always re-check, so a new upload shows up right away
    )


# ---------------------------------------------------------------------
# Browse users  (optional ?skill=python)
# ---------------------------------------------------------------------
@app.route("/api/users", methods=["GET"])
def get_users():
    skill = request.args.get("skill", "").strip()[:100]

    if skill:
        like = f"%{skill}%"
        rows = fetch_all(
            f"""SELECT {USER_COLUMNS} FROM users
               WHERE role = 'user' AND (skills_offered LIKE ? OR skills_wanted LIKE ?)
               LIMIT 100""",
            (like, like),
        )
    else:
        rows = fetch_all(f"SELECT {USER_COLUMNS} FROM users WHERE role = 'user' LIMIT 100")

    return jsonify([user_to_json(r) for r in rows])


# ---------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------
@app.route("/api/moderation/report", methods=["POST"])
@login_required
def create_report():
    data = get_json()
    category = str(data.get("category", "")).strip()
    description = str(data.get("description", "")).strip()

    try:
        reported_id = int(data.get("reported_user_id"))
    except (TypeError, ValueError):
        return error("A valid reported_user_id is required")

    if not category:
        return error("Category is required")
    if not fetch_one("SELECT id FROM users WHERE id = ?", (reported_id,)):
        return error("Reported user not found", 404)

    # "summary" is for the AI-generated summary; it stays empty until you add that
    report_id = execute(
        """INSERT INTO reports (reporter_id, reported_user_id, category, description)
           VALUES (?, ?, ?, ?)""",
        (session["user_id"], reported_id, category, description),
    )
    return jsonify({"message": "Report submitted", "id": report_id}), 201


@app.route("/api/admin/moderation", methods=["GET"])
@admin_required
def list_reports():
    rows = fetch_all(
        """SELECT r.*, reporter.name AS reporter_name, reported.name AS reported_name
           FROM reports r
           LEFT JOIN users reporter ON reporter.id = r.reporter_id
           LEFT JOIN users reported ON reported.id = r.reported_user_id
           ORDER BY r.id DESC
           LIMIT 100"""
    )
    return jsonify([dict(r) for r in rows])


@app.route("/api/admin/moderation/<int:report_id>", methods=["PATCH"])
@admin_required
def update_report_status(report_id):
    status = get_json().get("status")
    if status not in REPORT_STATUSES:
        return error("Status must be one of: " + ", ".join(REPORT_STATUSES))

    if not fetch_one("SELECT id FROM reports WHERE id = ?", (report_id,)):
        return error("Report not found", 404)

    execute("UPDATE reports SET status = ? WHERE id = ?", (status, report_id))
    return jsonify({"message": "Report updated", "status": status})


# ---------------------------------------------------------------------
if __name__ == "__main__":
    if not DB_PATH.exists():
        print("skillswap.db not found - run `python seed_db.py` first.")
    app.run(port=5000, debug=True)