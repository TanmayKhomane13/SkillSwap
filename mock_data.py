"""
mock_data.py - In-memory data store for SkillSwap (ported from the frontend's app.js).

app.py imports USERS, SWAPS, REVIEWS, MODERATION and BROADCAST and mutates them
directly. Data resets whenever the server restarts.

Demo passwords: every user = DEFAULT_PASSWORD, admin = ADMIN_PASSWORD.
"""
from datetime import datetime, timedelta

from werkzeug.security import generate_password_hash

DEFAULT_PASSWORD = "password123"
ADMIN_PASSWORD = "admin123"


def _ago(**kw):
    return datetime.utcnow() - timedelta(**kw)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
CURRENT_USER = {
    "id": "usr_alex_01",
    "name": "Alex Rivera",
    "email": "alex.rivera@example.com",
    "role": "user",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    "location": "San Francisco, CA",
    "headline": "Senior Python & Backend Developer",
    "bio": "Senior Python Developer with 5+ years building APIs, microservices, and databases. "
           "Passionate about learning UI/UX design and pottery!",
    "visibility": "public",
    "availability": ["Weekends", "Weekday Evenings"],
    "skillsOffered": ["Python Programming", "Flask Web Dev", "SQL & Databases"],
    "skillsOfferedDesc": {
        "Python Programming": "Full-stack Python scripting, API architecture, and database automation.",
        "Flask Web Dev": "Building clean REST APIs, auth flows, and microservices.",
        "SQL & Databases": "Relational data modeling, indexing, and query optimization.",
    },
    "skillsWanted": ["Figma UI/UX", "Digital Illustration"],
    "rating": 4.9,
    "reviewCount": 8,
    "swapsCompleted": 8,
}

ADMIN_USER = {
    "id": "usr_admin_00",
    "name": "SkillSwap Admin",
    "email": "admin@skillswap.com",
    "role": "admin",
    "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&auto=format&fit=crop&q=80",
    "location": "Remote",
    "headline": "Platform Administrator",
    "bio": "Keeping the community safe and friendly.",
    "visibility": "private",
    "availability": [],
    "skillsOffered": [],
    "skillsWanted": [],
    "rating": 5.0,
    "reviewCount": 0,
    "swapsCompleted": 0,
}

SEED_USERS = [
    {
        "id": "usr_02", "name": "Elena Rostova", "email": "elena@example.com",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
        "location": "Berlin, Germany", "rating": 4.95, "reviewCount": 14,
        "availability": "Weekends", "visibility": "public",
        "primarySkill": "Figma UI/UX Design Systems",
        "skillDesc": "I teach auto-layout mastery, design tokens, component libraries, and interactive prototyping.",
        "skillsOffered": ["Figma UI/UX", "Design Systems", "User Research"],
        "skillsWanted": ["Python Programming", "Data Analysis"],
    },
    {
        "id": "usr_03", "name": "Marcus Vance", "email": "marcus@example.com",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
        "location": "Austin, TX", "rating": 4.88, "reviewCount": 9,
        "availability": "Weekday Evenings", "visibility": "public",
        "primarySkill": "Acoustic Guitar & Audio Mixing",
        "skillDesc": "Hands-on chord progressions, fingerstyle technique, and Logic Pro mixing essentials.",
        "skillsOffered": ["Guitar Basics", "Audio Mixing & Logic Pro", "Songwriting"],
        "skillsWanted": ["Flask Web Dev", "SEO Marketing"],
    },
    {
        "id": "usr_04", "name": "Sofia Martinez", "email": "sofia@example.com",
        "avatar": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
        "location": "Barcelona, Spain", "rating": 4.92, "reviewCount": 22,
        "availability": "Weekday Evenings", "visibility": "public",
        "primarySkill": "Conversational Spanish",
        "skillDesc": "Native Spanish coaching focusing on real-life dialogues, pronunciation, and culture.",
        "skillsOffered": ["Spanish Conversational", "DELE Exam Prep", "Creative Writing"],
        "skillsWanted": ["Python Programming", "Excel & Financial Modeling"],
    },
    {
        "id": "usr_05", "name": "Kenji Takahashi", "email": "kenji@example.com",
        "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
        "location": "Tokyo, Japan", "rating": 5.0, "reviewCount": 11,
        "availability": "Custom Availability", "visibility": "public",
        "primarySkill": "Street Photography & Lightroom",
        "skillDesc": "Manual camera controls, natural light framing, and cinematic color grading.",
        "skillsOffered": ["Photography & Lightroom", "Photo Editing", "Japanese Basics"],
        "skillsWanted": ["Figma UI/UX", "Web Development"],
    },
    {
        "id": "usr_06", "name": "Priya Sharma", "email": "priya@example.com",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
        "location": "Toronto, Canada", "rating": 4.75, "reviewCount": 16,
        "availability": "Weekends", "visibility": "public",
        "primarySkill": "SEO Growth Strategy",
        "skillDesc": "Technical website optimization, keyword research, and high-impact content funnels.",
        "skillsOffered": ["SEO Marketing", "Content Strategy", "Google Analytics"],
        "skillsWanted": ["Python Programming", "SQL & Databases"],
    },
    {
        "id": "usr_07", "name": "David Kim", "email": "david@example.com",
        "avatar": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80",
        "location": "Seattle, WA", "rating": 4.82, "reviewCount": 7,
        "availability": "Weekday Evenings", "visibility": "public",
        "primarySkill": "Excel & Financial Modeling",
        "skillDesc": "Executive financial models, VBA automated macros, and dynamic dashboard creation.",
        "skillsOffered": ["Excel & Financial Modeling", "Business Valuation", "VBA Automation"],
        "skillsWanted": ["Flask Web Dev", "Public Speaking"],
    },
]

# ---------------------------------------------------------------------------
# Swaps
#   requester_id  -> user who proposed the swap
#   recipient_id  -> user who received it
#   skillWanted   -> skill the requester wants from the recipient
#   skillOffered  -> skill the requester gives in return
# ---------------------------------------------------------------------------
SEED_SWAPS = [
    {
        "id": "swp_101", "requester_id": "usr_02", "recipient_id": "usr_alex_01",
        "skillWanted": "Python Programming", "skillOffered": "Figma UI/UX",
        "status": "pending", "compatibilityScore": "98% Dual Match",
        "message": "Hey Alex! I saw you build Python APIs. I want to automate data processing for my "
                   "design research, and I can teach you Figma autolayout and design tokens in exchange!",
        "created_at": _ago(hours=2),
    },
    {
        "id": "swp_102", "requester_id": "usr_04", "recipient_id": "usr_alex_01",
        "skillWanted": "SQL & Databases", "skillOffered": "Spanish Conversational",
        "status": "pending", "compatibilityScore": "86% Match",
        "message": "Hola! I would love to learn basic SQL queries for business data. In return, I can "
                   "help you practice fluent conversational Spanish every Saturday morning!",
        "created_at": _ago(days=1),
    },
    {
        "id": "swp_103", "requester_id": "usr_alex_01", "recipient_id": "usr_05",
        "skillWanted": "Photography & Lightroom", "skillOffered": "Flask Web Dev",
        "status": "pending",
        "message": "Hi Kenji! I want to learn Lightroom color grading, and I would love to build a "
                   "custom portfolio website for you with Flask in return.",
        "created_at": _ago(days=3),
    },
    {
        "id": "swp_104", "requester_id": "usr_alex_01", "recipient_id": "usr_03",
        "skillWanted": "Guitar Basics", "skillOffered": "Python Programming",
        "status": "accepted", "message": "Scheduled 3 sessions completed so far.",
        "created_at": _ago(days=5),
    },
    {
        "id": "swp_105", "requester_id": "usr_alex_01", "recipient_id": "usr_07",
        "skillWanted": "Excel & Financial Modeling", "skillOffered": "SQL & Databases",
        "status": "completed", "hasReviewed": False, "message": "",
        "created_at": _ago(days=9),
    },
]

SEED_MODERATION = [
    {
        "id": "mod_001", "target_user_id": "usr_06",
        "content": "Reported by peer for: Spam or promotional content",
        "ai_category": "Spam", "ai_confidence": "94.2%",
        "ai_reason": "Profile bio contains repeated promotional links.",
        "status": "pending", "created_at": _ago(hours=6),
    },
]

SEED_BROADCAST = {
    "id": "current",
    "active": True,
    "type": "announcement",
    "text": "Welcome to SkillSwap 2.0! Try the new AI Assistant to find mutual swap matches instantly.",
    "published_at": datetime.utcnow(),
}

CATEGORIES = ["all", "python", "design", "music", "language", "photography", "marketing", "finance"]


# ---------------------------------------------------------------------------
# Live in-memory store (what app.py actually uses)
# ---------------------------------------------------------------------------
_default_hash = generate_password_hash(DEFAULT_PASSWORD)
_admin_hash = generate_password_hash(ADMIN_PASSWORD)

USERS = [dict(CURRENT_USER, password_hash=_default_hash, created_at=_ago(days=90)),
         dict(ADMIN_USER, password_hash=_admin_hash, created_at=_ago(days=120))]
USERS += [dict(u, role="user", password_hash=_default_hash, created_at=_ago(days=60),
               swapsCompleted=u["reviewCount"]) for u in SEED_USERS]

SWAPS = [dict(s, updated_at=s["created_at"]) for s in SEED_SWAPS]
REVIEWS = []
MODERATION = list(SEED_MODERATION)
BROADCAST = dict(SEED_BROADCAST)