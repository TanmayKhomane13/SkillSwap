"""
SkillSwap AI pipeline (sAI).
For now this is a minimal stub so the chat interface works.
We will expand it with DistilBERT + Qwen later.
"""
#========= IMPORTS & CONFIGURATION =========

from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoModelForCausalLM
from peft import PeftModel

import json
from langchain_core.tools import tool
from vector_store import vector_store

# ============== RAG Retriever ==========
profile_retriever = vector_store.as_retriever(
    search_kwargs={"k": 5}
)

#========= MODEL PATHS & DEVICE =========

BASE_MODEL_NAME = "distilbert-base-uncased"
INTENT_ROUTER_PATH = 'ai_models/Intent_Router_LoRA'

device = torch.device(
    "mps" if torch.backends.mps.is_available()
    else "cuda" if torch.cuda.is_available()
    else "cpu"
)

#========= DISTILBERT + LoRA LOADING =========

print("[sAI] Loading DistilBERT intent classifier...")

intent_tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)

intent_router_base_model = AutoModelForSequenceClassification.from_pretrained(
    BASE_MODEL_NAME,
    num_labels=3
).to(device)

intent_router_model = PeftModel.from_pretrained(
    intent_router_base_model,
    INTENT_ROUTER_PATH
)

intent_router_model = intent_router_model.to(device)
intent_router_model.eval()

print(f"[sAI] Intent classifier loaded on {device}")

#========= sAI GenLLM + LoRA LOADING =========

GenLLM_MODEL_NAME = "Qwen/Qwen2.5-3B-Instruct"
GENLLM_LORA_PATH = "ai_models/sAI_v1" 

gen_llm_tokenizer = AutoTokenizer.from_pretrained(
    GenLLM_MODEL_NAME,
    local_files_only=True
)

gen_llm_base_model = AutoModelForCausalLM.from_pretrained(
    GenLLM_MODEL_NAME,
    torch_dtype=torch.float16,
    local_files_only=True
).to(device)

gen_llm_model = PeftModel.from_pretrained(
    gen_llm_base_model,
    GENLLM_LORA_PATH,
    local_files_only=True
)

gen_llm_model = gen_llm_model.to(device)
gen_llm_model.eval()

print(f"[sAI] GenLLM + LoRA loaded on {device}")

#========= INTENT LABELS =========

# Must match the label mapping used when training your classifier.
ID2LABEL = {
    0: "AUTOMATION",
    1: "GENERAL",
    2: "PROFILE_QUERY",
}

#========= INTENT CLASSIFICATION =========
def classify_intent(message: str) -> dict:
    """Predict the intent of a user message."""

    inputs = intent_tokenizer(
        message,
        return_tensors="pt",
        truncation=True,
        max_length=128
    ).to(device)

    with torch.inference_mode():
        outputs = intent_router_model(**inputs)

        probabilities = torch.softmax(outputs.logits, dim=-1)
        predicted_id = int(probabilities.argmax(dim=-1).item())

    return {
        "intent": ID2LABEL[predicted_id],
        "confidence": float(probabilities[0, predicted_id].item())
    }

#========= PROMPT BUILDER =========
def prompt_builder(intent):

    
    if intent == "AUTOMATION":
        return """
        You are sAI, the SkillSwap assistant.

        Your task is to interpret skill-exchange search requests.

        Extract:
        - teach_skill: skill or skills the current user offers to teach
        - want_skill: skill or skills the current user wants to learn

        IMPORTANT:
        - "I can teach", "my skills", and "I offer" indicate teach_skill.
        - "I want to learn", "teach me", and "can teach me" indicate want_skill.
        - "in exchange for", "in exchange of", and "in return for"
          identify the skills offered as an exchange.
        - Support multiple skills in either field.
        - Preserve every explicitly mentioned skill.
        - Do not reverse the direction of the exchange.
        - Do not invent skills.
        - Do not require the user to repeat information already provided.
        - Do not include current_user_id; the application supplies it.

        Return valid JSON only, without Markdown code fences.

        Example:
        User: Find people who can teach me Python and Machine Learning
        in exchange for my UI/UX skills.

        {
            "tool": "search_profiles",
            "arguments": {
                "teach_skill": "UI/UX",
                "want_skill": "Python and Machine Learning"
            }
        }

        If the user has not specified the skills needed for a meaningful
        search, ask a concise clarification question.

        {
            "tool": null,
            "answer": "Which skill or skills would you like to teach,
            and which skill or skills would you like to learn?"
        }
        """

    elif intent == "PROFILE_QUERY":
        return """
        You are sAI, the SkillSwap profile assistant.

        Answer the user's question using only the retrieved profile
        information provided in the conversation.

        Rules:
        - Answer clearly and naturally.
        - Use only facts supported by the retrieved information.
        - Never invent skills, experience, availability, or ratings.
        - If the requested information is missing, say it is not
          available in the retrieved profile information.
        - If no relevant profile information was retrieved, explain
          that you could not find the required profile information.
        - Do not claim to have performed an action.
        - Do not generate JSON or select tools.
        """


    else:  # GENERAL
        return """
        You are sAI, the SkillSwap assistant.

        Answer general questions about SkillSwap clearly and naturally.
        Do not invent profile information or claim to have performed actions.

        If no tool is needed, answer directly.

        Return valid JSON only.
        For a direct answer:
        {"tool": null, "answer": "..."}
        """

# ==================== TOOLS ======================================
@tool
def get_profile(user_name: str, question: str) -> str:
    """
    Answer a question about a specific SkillSwap user's profile.
    Retrieve the user's profile from ChromaDB and return its information.
    """

    # Find the profile by its name in ChromaDB metadata.
    results = vector_store.similarity_search(
        query=f"Name: {user_name}",
        k=20,
    )

    profile = next(
        (
            doc for doc in results
            if doc.metadata.get("name", "").strip().casefold()
            == user_name.strip().casefold()
        ),
        None,
    )

    if profile is None:
        return f"No profile found for {user_name}."

    return (
        f"Profile information for {user_name}:\n"
        f"{profile.page_content}\n\n"
        f"User's question: {question}"
    )



@tool
def search_profiles(
    teach_skill: str,
    want_skill: str,
    current_user_id: str
) -> str:
    """Find SkillSwap profiles based on the skill a user teaches
    and the skill they want to learn."""

    results = vector_store.similarity_search(
        query=f"Skills offered: {teach_skill}. Skills wanted: {want_skill}",
        k=20
    )

    profiles = []
    seen_ids = set()

    for doc in results:
        user_id = str(doc.metadata.get("user_id", ""))

        # Exclude the currently logged-in user.
        if not user_id or user_id == str(current_user_id):
            continue

        # Avoid duplicate profiles.
        if user_id in seen_ids:
            continue

        seen_ids.add(user_id)

        profiles.append({
            "user_id": user_id,
            "name": doc.metadata.get("name", "Unknown"),
            "profile_text": doc.page_content
        })

        if len(profiles) == 5:
            break

    return json.dumps({
        "teach_skill": teach_skill,
        "want_skill": want_skill,
        "profiles": profiles,
        "count": len(profiles)
    })

SKILLSWAP_TOOLS = [
    search_profiles,
    get_profile,
]

available_tools = {
    tool.name: tool
    for tool in SKILLSWAP_TOOLS
}

#========= MAIN sAI PIPELINE =========
def generate_response(messages, max_new_tokens=200):
    """Generate a response using the locally loaded Qwen model."""

    prompt = gen_llm_tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = gen_llm_tokenizer(
        prompt,
        return_tensors="pt",
    ).to(device)

    with torch.no_grad():
        outputs = gen_llm_model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
        )

    response = gen_llm_tokenizer.decode(
        outputs[0][inputs.input_ids.shape[1]:],
        skip_special_tokens=True,
    )

    return response.strip()


#========= PROFILE RAG =========

def generate_rag_answer(
    question: str,
    retrieved_guidance: str,
    system_prompt: str,
) -> str:
    """Generate a profile answer grounded in retrieved ChromaDB data."""

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": (
                f"User question:\n{question}\n\n"
                f"Retrieved profile information:\n"
                f"{retrieved_guidance}"
            ),
        },
    ]

    return generate_response(
        messages,
        max_new_tokens=200,
    )


def handle_message(message: str, current_user_id: str):
    # 1. Classify the user's intent.
    classification = classify_intent(message)
    intent = classification["intent"]
    confidence = classification["confidence"]

    # 2. Build the intent-specific prompt.
    system_prompt = prompt_builder(intent)

    messages = [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": message,
        },
    ]

    try:
        #========= PROFILE RAG PATH =========
        if intent == "PROFILE_QUERY":

            # 1. Retrieve relevant profile documents from ChromaDB.
            retrieved_documents = profile_retriever.invoke(message)

            # 2. Prepare the retrieved context.
            retrieved_guidance = "\n\n".join(
                (
                    f"Profile name: {doc.metadata.get('name', 'Unknown')}\n"
                    f"{doc.page_content}"
                )
                for doc in retrieved_documents
            )

            # 3. Handle empty retrieval.
            if not retrieved_guidance.strip():
                return {
                    "intent": intent,
                    "confidence": confidence,
                    "tool": None,
                    "answer": (
                        "I couldn't find relevant profile information "
                        "to answer your question."
                    ),
                    "profiles": [],
                }

            # 4. Select the RAG prompt.
            system_prompt = prompt_builder(intent)

            # 5. Generate a grounded natural-language answer.
            answer = generate_rag_answer(
                question=message,
                retrieved_guidance=retrieved_guidance,
                system_prompt=system_prompt,
            )

            # 6. Return the existing application response structure.
            return {
                "intent": intent,
                "confidence": confidence,
                "tool": None,
                "answer": answer,
                "profiles": [],
            }
        
        response = generate_response(
            messages,
            max_new_tokens=200,
        )
        # ============================================  

        # 4. Parse the JSON decision.
        decision = json.loads(response)
        tool_name = decision.get("tool")

        # 5. Direct answer: no tool required.
        if tool_name is None:
            return {
                "intent": intent,
                "confidence": confidence,
                "tool": None,
                "answer": decision.get(
                    "answer",
                    "No answer provided.",
                ),
                "profiles": [],
            }

        # 6. Validate the selected tool.
        if tool_name not in available_tools:
            return {
                "intent": intent,
                "confidence": confidence,
                "tool": tool_name,
                "answer": "The requested tool is unavailable.",
                "profiles": [],
            }

        # 7. Read arguments selected by Qwen.
        arguments = decision.get("arguments", {})

        if not isinstance(arguments, dict):
            raise TypeError("Tool arguments must be a JSON object.")

        if tool_name == "search_profiles":
            teach_skill = arguments.get("teach_skill")
            want_skill = arguments.get("want_skill")

            if not teach_skill or not want_skill:
                return {
                    "intent": intent,
                    "confidence": confidence,
                    "tool": None,
                    "answer": (
                        "Please specify both the skill you want to teach "
                        "and the skill you want to learn."
                    ),
                    "profiles": [],
                }

            arguments = {
                "teach_skill": teach_skill,
                "want_skill": want_skill,
                "current_user_id": str(current_user_id),
            }

        result = available_tools[tool_name].invoke(arguments)

        profiles = []

        if tool_name == "search_profiles":
            try:
                search_data = (
                    json.loads(result)
                    if isinstance(result, str)
                    else result
                )

                if isinstance(search_data, dict):
                    profiles = search_data.get("profiles", [])

            except (json.JSONDecodeError, TypeError):
                profiles = []


        final_messages = [
            {
                "role": "system",
                "content": (
                    "You are sAI, the SkillSwap assistant. "
                    "Answer concisely using the actual tool results. "
                    "Do not invent profiles or claim actions were completed."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Original request: {message}\n\n"
                    f"Actual tool result:\n{result}"
                ),
            },
        ]

        final_answer = generate_response(
            final_messages,
            max_new_tokens=200,
        )

        return {
            "intent": intent,
            "confidence": confidence,
            "tool": tool_name,
            "tool_result": result,
            "answer": final_answer,
            "profiles": profiles,
        }

    except Exception as error:
        print(f"[sAI] Could not process request: {error}")

        return {
            "intent": intent,
            "confidence": confidence,
            "tool": None,
            "answer": (
                "I couldn't process that request. "
                "Please try rephrasing it."
            ),
            "profiles": [],
        }