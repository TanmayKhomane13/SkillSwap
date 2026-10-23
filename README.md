# 🎨 SkillSwap — Soft Pastel Mesh & Frosted Glassmorphism Platform

A peer-to-peer barter skill exchange web platform built strictly with **Vanilla HTML5, CSS3, and ES6+ JavaScript** (zero external frameworks). Designed with a **Soft Pastel Mesh-Gradient & Frosted Glassmorphism** visual aesthetic.

---

## 🌟 Visual Design System Specifications

### 1. Mesh Gradient Background
- Fixed full-viewport background (`#f4f7f6`) with softly animated radial gradient color orbs:
  - **Soft Mint/Teal**: `rgba(162, 228, 216, 0.55)`
  - **Soft Lavender/Plum**: `rgba(216, 180, 232, 0.45)`
  - **Pale Aqua**: `rgba(180, 238, 220, 0.50)`
  - **Subtle Rose**: `rgba(245, 205, 220, 0.35)`

### 2. Frosted Glass Surfaces (Glassmorphism)
- **Primary Glass Cards & Containers**:
  ```css
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.06);
  border-radius: 18px;
  ```
- **Elevated Glass Surfaces (Navbar, Modals, Inputs)**:
  ```css
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  ```

### 3. Curated Color Palette & Accents
- **Primary Brand Accent (Deep Plum)**: `#6d3b6b` (Hover: `#582e56`) — CTA buttons, active navigation pills, primary highlights.
- **Secondary Accent (Emerald/Mint)**: `#10b981` (Badge: `rgba(16, 185, 129, 0.14)`, Text: `#047857`) — Accept actions, teaching skill tags, AI indicators.
- **Warm Accent (Amber)**: `rgba(251, 146, 60, 0.16)` / `#ea580c` — Star ratings, pending status badges.
- **Danger Accent (Coral Red)**: `#ef4444` (Badge: `rgba(239, 68, 68, 0.12)`) — Reject, Cancel, Delete, and Admin Ban actions.
- **Typography**: `'Plus Jakarta Sans'` & `'Outfit'`, dark slate text (`#1e293b`), muted slate (`#64748b`).

---

## 📁 Project Structure

```
d:/SkillSwap/
├── login.html              # Dedicated Glassmorphic Login & Register (User vs. Admin)
├── index.html              # Main App (Explore, Profile, Swaps, AI Assistant, Admin Portal)
├── style.css               # Complete Glassmorphism Design System & Responsive Rules
├── app.js                  # Modular State Management, DOM Renderers, & Flask Fetch API Layer
├── backend_starter.py      # Companion Flask + MongoDB + Google OAuth 2.0 Backend
└── README.md               # Architecture, API routes, and documentation
```

---

## 🚀 Core Features & Implementation Details

### A. Authentication Portal (`login.html`)
- **Role Toggle Switch**: Instantly toggle between `User Login` and `Admin Login`.
- **User Mode**: Switch between **Sign In** and **Create Account**.
- **Google OAuth**: Prominent `"Continue with Google"` button wired to `/auth/google`.
- **Quick Demo Fill**: Single-click demo credentials for **Demo User (Alex)** and **Demo Admin**.

### B. User Profile & Skills Management (`index.html#profile`)
- **Profile Visibility Toggle**: Switch between `Public` (discoverable by everyone) and `Private` (hidden from search).
- **Availability Selector**: Selectable glass pills for `Weekends`, `Weekday Evenings`, and `Custom Availability`.
- **Dual Skill Tag/Pill Manager**:
  1. **Skills Offered (Teaches)**: Add custom skills via inline Enter or click recommendations; delete skills with `×`.
  2. **Skills Wanted (Learns)**: Interactive pill manager for skills you desire to learn.

### C. Search & Discovery (`index.html#explore`)
- **Search Bar**: Real-time filtering by skill name, swapper name, or location.
- **Quick Category Filter Chips**: `All Skills`, `Python & Tech`, `UI/UX & Design`, `Languages`, `Photography`, `Music`, `Marketing`, `Excel`.
- **Filter Dropdowns**: Filter by Availability and Minimum Star Rating (e.g. 4.8+ Stars).
- **Glass Profile Cards**: Display Name, Avatar, Location, Rating, Availability badge, Skills Offered pills, Skills Wanted pills, "Request Swap", and "AI Insight" trigger.

### D. Swap Requests & Ratings Workflow (`index.html#swaps`)
- **Send Swap Request Modal**: Select which skill you want, which of your offered skills you teach in exchange, and write a personalized introduction note.
- **Incoming Offers Tab**: Review proposals, `Accept Swap` (adds to active exchanges), or `Decline`.
- **Pending Outgoing Tab**: View sent proposals with a `Cancel / Delete Request` button.
- **Active & Completed Swaps Tab**: Track ongoing partnerships, mark swaps as completed, and open the **Rating Modal** (interactive 1–5 stars + written review).

### E. Dedicated AI Assistant Section (`index.html#ai`)
- **Agent Automation**: Natural language chat interface that automates directory searches, swaps filtering, and candidate recommendations.
- **Profile Intelligence (RAG)**: Generates comprehensive compatibility scores, curriculum roadmaps, and exchange advice.
- **Smart Skill Matchmaker**: 1-click dual-barter algorithm finding mutual overlap between your offered skills and partner's wanted skills.
- **Suggested Prompt Chips**: Quick-click questions for immediate testing.

### F. Platform Administrator Dashboard (`index.html#admin`)
- **Skill & User Moderation**: Review reported accounts with **AI Report Categorization Badges** (`Commercial Spam`, `Fraudulent Offering`, `Harassment & Abuse`), confidence scores, AI reason explanations, with `Reject Skill` and `Ban User` actions.
- **Swap Monitor**: Platform-wide transaction audit table with status filters (`All`, `Pending`, `Accepted`, `Cancelled`).
- **Platform-Wide Broadcasts**: Real-time broadcast publisher (Announcement, Advisory, Urgent) that pins a frosted glass alert banner to all active users.
- **Download Reports**: Export real **CSV** and **JSON** files for *User Activity*, *Feedback Logs*, and *Swap Statistics* via native browser Blobs.

---

## 🔌 Connecting to Python Flask + MongoDB Backend

The JavaScript in `app.js` has a central `CONFIG` object:

```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000',
  USE_MOCK_BACKEND: false, // Switch from true to false to connect to Flask
  ENDPOINTS: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    GOOGLE_OAUTH: '/auth/google',
    GET_PROFILE: '/api/profile',
    UPDATE_PROFILE: '/api/profile/update',
    GET_USERS: '/api/users',
    GET_SWAPS: '/api/swaps',
    CREATE_SWAP: '/api/swaps/create',
    AI_CHAT: '/api/ai/chat',
    ADMIN_MODERATION: '/api/admin/moderation',
    ADMIN_BROADCAST: '/api/admin/broadcast'
  }
};
```

To run the Flask starter backend:
```bash
pip install flask flask-cors pymongo
python backend_starter.py
```
