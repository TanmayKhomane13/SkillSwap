<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=38&duration=3000&pause=800&color=F5C542&center=true&vCenter=true&width=1000&lines=SkillSwap+AI+%E2%80%94+Powered+by+sAI;AI-Powered+Skill+Exchange;Natural+Language+Profile+Discovery" />

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?logo=python">
  <img src="https://img.shields.io/badge/Flask-Backend-black?logo=flask">
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite">
  <img src="https://img.shields.io/badge/PyTorch-Deep%20Learning-ee4c2c?logo=pytorch">
  <img src="https://img.shields.io/badge/DistilBERT-Intent%20Classification-yellow?logo=huggingface">
  <img src="https://img.shields.io/badge/Qwen2.5--3B-Generative%20AI-purple">
  <img src="https://img.shields.io/badge/ChromaDB-Vector%20Search-green">
  <img src="https://img.shields.io/badge/LoRA-Adapters-orange">
</p>

**SkillSwap AI** is an AI-powered skill-exchange platform that helps people discover others they can learn from while sharing their own skills. At its core is **sAI — SkillSwap AI**, an intelligent assistant that understands natural-language requests, selects appropriate tools, searches profiles, and answers questions using retrieved profile information.

<p align="center">
  <img src="https://img.shields.io/badge/Natural%20Language-AI%20Assistant-F5C542?style=for-the-badge">
  <img src="https://img.shields.io/badge/Tool--Calling-Enabled-6f42c1?style=for-the-badge">
  <img src="https://img.shields.io/badge/Local%20Models-Hugging%20Face-2ea44f?style=for-the-badge">
</p>

**Learn a skill. Share a skill. Find your next skill-exchange partner.**

</div>

---

## 💡 Project Overview

SkillSwap AI brings AI-powered assistance to a skill-exchange platform where users can teach what they know and learn what they want to master.

Instead of relying only on manual profile searches, users can describe what they need in everyday language. The **sAI agent** interprets the request and uses the appropriate tools to retrieve relevant information.

The AI component combines:

- 🧠 **DistilBERT + LoRA** for intent classification
- 🤖 **Qwen2.5-3B-Instruct + LoRA** for natural-language understanding and tool selection
- 🛠️ **LangChain Core tools** for connecting the language model to Python functions
- 📚 **ChromaDB** for semantic profile retrieval
- 🐍 **Python + Flask** for application integration
- 🗄️ **SQLite** for application data

---

## 🎯 Problem Statement

Finding the right person for a skill exchange can be challenging when users have different skills, goals, experience levels, and availability.

Traditional profile browsing can require users to manually search through profiles and compare information.

SkillSwap AI aims to make this process more intuitive by allowing users to express their requirements naturally and receive relevant profile information through an AI assistant.

---

## ✨ The Solution

SkillSwap combines a skill-exchange platform with an AI assistant that can understand requests and use application tools.

```text
                User Request
                     │
                     ▼
              sAI AI Assistant
                     │
                     ▼
             Intent Classification
                  DistilBERT
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
      AUTOMATION   GENERAL   PROFILE_QUERY
          │          │          │
          └──────────┼──────────┘
                     ▼
              Qwen2.5-3B
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
    Direct Response       Tool Selection
                                │
                                ▼
                       Python Tool Execution
                                │
                                ▼
                         ChromaDB Search
                                │
                                ▼
                      Retrieved Profile Data
                                │
                                ▼
                        Natural-Language
                            Response
```

---

## 🤖 Meet sAI — SkillSwap AI

**sAI** is the AI assistant developed for SkillSwap. It connects natural-language requests to profile retrieval and supported application operations.

### What the sAI Agent Does

- 💬 **Understands Natural Language:** Users can describe their skill-exchange requirements in everyday language.
- 🧭 **Identifies User Intent:** Determines whether a request involves an action, a profile question, or general conversation.
- 🔎 **Finds Potential Skill-Exchange Partners:** Searches profiles based on the skills users can teach and want to learn.
- 👤 **Retrieves Profile Information:** Looks up relevant user profiles and retrieves their stored information.
- 🛠️ **Selects Appropriate Tools:** Converts supported requests into structured tool calls and executes the selected Python functions.
- 🧠 **Generates Responses:** Uses the language model to interpret requests and produce natural-language answers.
- 🔗 **Connects AI to the Application:** Returns structured results that the SkillSwap application can use to display answers and matching profiles.
- 🧩 **Supports Extension:** Its tool-based design allows additional capabilities to be introduced in future versions.

---

## 🧠 AI Architecture

### 1. Intent Classification — DistilBERT

sAI uses a DistilBERT model adapted with LoRA to classify incoming messages into three categories:

| Intent | Purpose |
|---|---|
| `AUTOMATION` | Requests that require an action, such as searching for skill-exchange profiles |
| `PROFILE_QUERY` | Questions about user profiles and their details |
| `GENERAL` | General questions and conversation |

The classification result determines which processing path the application follows.

### 2. Generative AI — Qwen2.5-3B-Instruct

The language-model layer interprets requests and supports tool selection.

It is adapted using LoRA and configured with custom prompts for SkillSwap-specific tasks. Its responsibilities include:

- Interpreting natural-language skill-exchange requests
- Extracting skills users want to teach and learn
- Producing structured tool-selection output
- Generating responses using available information

### 3. Tool Calling — LangChain Core

sAI uses Python functions exposed through LangChain Core's tool interface. The current tools include:

- **`search_profiles`** — searches for relevant profiles in the vector store.
- **`get_profile`** — retrieves a user's profile information for answering profile-related questions.

The language model selects a tool when appropriate, while Python executes the function and returns its result.

### 4. Semantic Profile Retrieval — ChromaDB

ChromaDB stores profile documents for semantic retrieval. Profile information includes:

- Name
- Skills offered
- Skills wanted
- Availability
- Experience
- Rating
- Bio

---

## 🔄 How It Works

### 1. User Sends a Request

A user describes a question or skill-exchange requirement in natural language.

> *Example:* "Find people who can teach me UI/UX Design in exchange for Unity Game Development."

### 2. Intent Router Classifies the Request

DistilBERT identifies the request as `AUTOMATION`.

### 3. The Language Model Interprets It

Qwen interprets the exchange direction and extracts parameters:

```json
{
  "tool": "search_profiles",
  "arguments": {
    "teach_skill": "Unity Game Development",
    "want_skill": "UI/UX Design"
  }
}
```

### 4. The Tool Executes

The application passes the extracted arguments and current user's ID to the profile-search tool.

### 5. Relevant Profiles Are Retrieved

The tool searches ChromaDB and returns relevant profile information while excluding the current user.

### 6. sAI Responds

The language model uses the tool results to produce a natural-language response, and the application displays the returned matching profiles.

---

## 👤 Profile Question Answering

sAI also provides a profile-retrieval tool for questions about individual users.

Example questions:
- What skills does this person offer?
- What skills do they want to learn?
- What is their availability?
- Tell me about this user's experience.

The profile tool searches for a profile by name and returns its stored content alongside the user's question.

---

## 🏗️ Application Architecture

```text
┌─────────────────────────────┐
│     SkillSwap Frontend      │
│       HTML / CSS / JS       │
└──────────────┬──────────────┘
               │ HTTP Request
               ▼
┌─────────────────────────────┐
│       Flask Backend         │
│     /api/ai/chat            │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│          sAI Core           │
│                             │
│  Intent Router              │
│  Qwen Language Model        │
│  Tool Selection             │
│  Tool Execution             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        ChromaDB             │
│   Profile Document Search   │
└─────────────────────────────┘

     SQLite stores application
           user records
```

The Flask integration returns structured data, including the response, intent, selected tool, and profile results, for the frontend to consume.

---

## 🧰 Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript |
| **Backend Integration** | Python, Flask, REST API |
| **Application Database** | SQLite |
| **Intent Classification** | DistilBERT, PyTorch, PEFT, LoRA |
| **Generative AI** | Qwen2.5-3B-Instruct, Transformers, PEFT |
| **Tool Integration** | LangChain Core |
| **Semantic Retrieval** | ChromaDB |
| **Model Ecosystem** | Hugging Face Transformers |

---

## 📂 Repository Structure

```text
SkillSwap/
│
├── AI/                     # AI notebooks and datasets
├── ai_models/              # Model LoRA adapter weights
├── Knowledge_Bases/        # Domain knowledge bases and context files
├── static/                 # Static assets (CSS, JS, images)
├── templates/              # HTML templates
├── vector_store/           # ChromaDB database files
│
├── .env                    # Environment variables
├── .gitignore              # Git ignore configuration
├── app.py                  # Flask entry point and API routes
├── requirements.txt        # Project Python dependencies
├── sAI.py                  # Core sAI engine, intent routing, and tool logic
├── seed_db.py              # Database seeding script
├── skillswap.db            # SQLite application database
└── vector_store.py         # ChromaDB profile storage and retrieval interface
```

---

## ⚙️ Local Setup

### Prerequisites

- Python 3.11 or higher
- Access to local base models and LoRA adapters configured in `ai_models/`

### 1. Clone the Repository

```bash
git clone https://github.com/TanmayKhomane13/SkillSwap.git
cd SkillSwap
```

### 2. Create a Virtual Environment

```bash
python -m venv team_venv
source team_venv/bin/activate
```

On Windows (PowerShell):

```powershell
team_venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Initialize Database & Seed Profiles

```bash
python seed_db.py
```

### 5. Run the Application

```bash
python app.py
```

Open your browser and navigate to `http://127.0.0.1:5000`.

---

## 🔐 Models and Data

The AI component depends on local model files, adapter weights, and profile data. 

Ensure local models and database files are placed in their respective directories (`ai_models/`, `vector_store/`, and `skillswap.db`) as configured in `.env` or project settings. Large model weights are excluded from version control via `.gitignore`.

---

## 🚀 Future Improvements

- Improve the precision of reciprocal skill-exchange matching.
- Add stricter validation of extracted skills and tool arguments.
- Improve profile-question retrieval and relevance filtering.
- Expand automated tests for intent classification, tool selection, and retrieval.
- Package sAI for reuse in other Python applications.

---

<div align="center">

### From Natural-Language Requests → Intelligent Profile Discovery → Meaningful Skill Exchanges

**Share what you know. Learn what you don't. Grow together.**

**SkillSwap AI — Learn Together. Build Together.**

</div>
