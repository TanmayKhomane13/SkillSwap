"""
SkillSwap SQLite setup + seed script.

Tables:
    users   - login (hashed password), profiles, bio, skills, experience, availability, profile picture (BLOB), rating
    admin   - administrator accounts
    reports - user reports
    swap_requests - swap requests between users (A sends to B)

Run once (delete skillswap.db first if you have an old one):
    python seed_db.py
"""

import json
import sqlite3
from pathlib import Path

from werkzeug.security import generate_password_hash

DB_PATH = Path(__file__).resolve().parent / "skillswap.db"

# Demo logins (change these!)
#   users : any demo email  / password123
#   admin : admin@skillswap.com / admin123
DEMO_PASSWORD = "password123"
ADMIN_PASSWORD = "admin123"

# Allowed dropdown values (app.py checks the same lists)
#   experience   : Beginner | Intermediate | Advanced
#   availability : Weekends | Weekday Evenings | Custom Availability

DEMO_USERS = [
    {
        "name": "Alex Morgan",
        "email": "alex@example.com",
        "bio": "Graphic designer moving into software development. I want to learn Python through weekend skill exchanges.",
        "skills_offered": ["Graphic Design"],
        "skills_wanted": ["Python"],
        "experience": "Intermediate",
        "availability": "Weekends",
        "rating": 4.8,
    },
    {
        "name": "Priya Sharma",
        "email": "priya@example.com",
        "bio": "Python developer who enjoys teaching beginners. I want to improve my UI/UX design skills.",
        "skills_offered": ["Python", "SQL"],
        "skills_wanted": ["UI/UX"],
        "experience": "Advanced",
        "availability": "Custom Availability",
        "rating": 4.6,
    },
    {
        "name": "Sam Wilson",
        "email": "sam@example.com",
        "bio": "Beginner designer exploring programming and looking for other learners to exchange skills with.",
        "skills_offered": ["Graphic Design"],
        "skills_wanted": ["Java"],
        "experience": "Beginner",
        "availability": "Weekends",
        "rating": 4.2,
    },
    {
        "name": "Maya Patel",
        "email": "maya@example.com",
        "bio": "Frontend developer working with React and JavaScript. I want to learn graphic design.",
        "skills_offered": ["React", "JavaScript"],
        "skills_wanted": ["Graphic Design"],
        "experience": "Intermediate",
        "availability": "Weekday Evenings",
        "rating": 4.5,
    },
]


# Sample swap requests: (from email, to email, skill wanted from them, skill offered back, message)
DEMO_REQUESTS = [
    ("priya@example.com", "alex@example.com", "Graphic Design", "Python",
     "Hi Alex! I can teach you Python if you teach me graphic design basics."),
    ("alex@example.com", "maya@example.com", "JavaScript", "Graphic Design",
     "Hi Maya! I would love to learn JavaScript. I can teach you graphic design in return."),
]


def seed_database():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    # ---- Tables -------------------------------------------------------
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            name            TEXT NOT NULL,
            email           TEXT UNIQUE NOT NULL,
            password_hash   TEXT NOT NULL UNIQUE,              -- hashed, never plain text
            bio             TEXT NOT NULL DEFAULT '',
            skills_offered  TEXT NOT NULL,                     -- JSON list, required
            skills_wanted   TEXT NOT NULL,                     -- JSON list, required
            experience      TEXT NOT NULL DEFAULT 'Beginner',  -- dropdown
            availability    TEXT NOT NULL DEFAULT 'Weekends',  -- dropdown
            profile_pic     BLOB,                              -- the image bytes (NULL = no picture)
            profile_pic_type TEXT,                             -- e.g. image/png
            rating          REAL NOT NULL DEFAULT 0,
            role            TEXT NOT NULL DEFAULT 'user'
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS admin (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id      INTEGER,
            reported_user_id INTEGER,
            category         TEXT NOT NULL,
            description      TEXT,
            summary          TEXT,
            status           TEXT NOT NULL DEFAULT 'Open',
            FOREIGN KEY (reporter_id)      REFERENCES users(id),
            FOREIGN KEY (reported_user_id) REFERENCES users(id)
        )
    """)

    # A request from A (requester) to B (recipient):
    #   A sees it as "outgoing", B sees it as "incoming" - both read this one row.
    conn.execute("""
        CREATE TABLE IF NOT EXISTS swap_requests (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id  INTEGER NOT NULL,                  -- A: sends the request
            recipient_id  INTEGER NOT NULL,                  -- B: receives the request
            skill_wanted  TEXT NOT NULL,                     -- skill A wants to learn from B
            skill_offered TEXT NOT NULL,                     -- skill A teaches B in return
            message       TEXT NOT NULL DEFAULT '',
            status        TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
            created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (requester_id) REFERENCES users(id),
            FOREIGN KEY (recipient_id) REFERENCES users(id),
            CHECK (requester_id != recipient_id)             -- no requests to yourself
        )
    """)

    # A cannot send the same pending request to B twice
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS one_pending_request
        ON swap_requests (requester_id, recipient_id, skill_wanted, skill_offered)
        WHERE status = 'pending'
    """)

    # ---- Demo data (safe to run again: duplicates are ignored) --------
    for u in DEMO_USERS:
        conn.execute(
            """INSERT OR IGNORE INTO users
               (name, email, password_hash, bio, skills_offered, skills_wanted,
                experience, availability, rating)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            # a new hash per user: each hash gets its own random salt, so they are all different
            (u["name"], u["email"], generate_password_hash(DEMO_PASSWORD), u["bio"],
             json.dumps(u["skills_offered"]), json.dumps(u["skills_wanted"]),
             u["experience"], u["availability"], u["rating"]),
        )

    conn.execute(
        "INSERT OR IGNORE INTO admin (name, email, password_hash) VALUES (?, ?, ?)",
        ("Admin One", "admin@skillswap.com", generate_password_hash(ADMIN_PASSWORD)),
    )

    # One sample report: Sam reports Priya (only added if reports is empty)
    if conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0] == 0:
        conn.execute(
            """INSERT INTO reports (reporter_id, reported_user_id, category, description, status)
               SELECT r.id, p.id, 'Profile Accuracy',
                      'Some skill information may be inaccurate.', 'Open'
               FROM users r, users p
               WHERE r.email = 'sam@example.com' AND p.email = 'priya@example.com'"""
        )

    # Sample swap requests (only added if the table is empty)
    if conn.execute("SELECT COUNT(*) FROM swap_requests").fetchone()[0] == 0:
        for sender, receiver, wanted, offered, message in DEMO_REQUESTS:
            conn.execute(
                """INSERT INTO swap_requests
                   (requester_id, recipient_id, skill_wanted, skill_offered, message)
                   SELECT s.id, r.id, ?, ?, ?
                   FROM users s, users r
                   WHERE s.email = ? AND r.email = ?""",
                (wanted, offered, message, sender, receiver),
            )

    conn.commit()

    print(f"Database ready: {DB_PATH}")
    for table in ("users", "admin", "reports", "swap_requests"):
        count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"  {table}: {count} rows")

    conn.close()


if __name__ == "__main__":
    seed_database()