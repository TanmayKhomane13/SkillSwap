"""
SkillSwap profile vector store (ChromaDB).
One document per user. Document ID = str(SQLite users.id)
"""

from pathlib import Path
import json

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# ---------------------------------------------------------------------
# Configuration (matches handoff)
# ---------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
CHROMA_DIR = BASE_DIR / "vector_store" / "skillswap_profiles"
COLLECTION_NAME = "skillswap_profiles"

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

vector_store = Chroma(
    collection_name=COLLECTION_NAME,
    embedding_function=embeddings,
    persist_directory=str(CHROMA_DIR),
)

# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def _format_value(value):
    if value is None or value == "":
        return "Not provided"
    if isinstance(value, (list, tuple, set)):
        return ", ".join(str(v) for v in value) or "Not provided"
    # skills_offered / skills_wanted are stored as JSON strings in SQLite
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return ", ".join(str(v) for v in parsed) or "Not provided"
        except (json.JSONDecodeError, TypeError):
            pass
    return str(value)


def profile_to_document(row_or_dict):
    """
    Accept either a sqlite3.Row or a plain dict that contains
    the columns from the users table.
    """
    # Convert sqlite3.Row → dict if needed
    if hasattr(row_or_dict, "keys"):
        profile = {k: row_or_dict[k] for k in row_or_dict.keys()}
    else:
        profile = dict(row_or_dict)

    user_id = profile.get("id") or profile.get("user_id")
    if user_id is None:
        raise ValueError("A stable SQLite user id is required")

    content = f"""Name: {_format_value(profile.get("name"))}
Skills offered: {_format_value(profile.get("skills_offered"))}
Skills wanted: {_format_value(profile.get("skills_wanted"))}
Availability: {_format_value(profile.get("availability"))}
Experience: {_format_value(profile.get("experience"))}
Rating: {_format_value(profile.get("rating"))}
Bio: {_format_value(profile.get("bio"))}""".strip()

    return Document(
        page_content=content,
        metadata={
            "user_id": str(user_id),
            "name": str(profile.get("name") or ""),
        },
    )


def store_profile(row_or_dict):
    """
    Insert or update one profile.
    Must be called AFTER a successful SQLite write.
    """
    document = profile_to_document(row_or_dict)
    user_id = document.metadata["user_id"]

    # Chroma upsert via add_documents with explicit id
    vector_store.add_documents(
        documents=[document],
        ids=[user_id],
    )
    return f"Stored profile for user_id={user_id}"


def retrieve_profile(user_id: str | int):
    """Return a single Document or None."""
    results = vector_store.get(
        ids=[str(user_id)],
        include=["documents", "metadatas"],
    )
    if not results["ids"]:
        return None
    return Document(
        page_content=results["documents"][0],
        metadata=results["metadatas"][0],
    )


def delete_profile(user_id: str | int):
    """Remove the vector when the SQLite row is deleted."""
    vector_store.delete(ids=[str(user_id)])