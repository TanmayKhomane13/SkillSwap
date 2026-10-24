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

        Use search_profiles to find relevant profiles through semantic
        search and update the frontend UI based on the results.

        Return valid JSON only.
        For a tool:
        {"tool": "search_profiles", "arguments": {"query": "..."}}

        For a direct answer:
        {"tool": null, "answer": "..."}
        """

    elif intent == "PROFILE_QUERY":
        return """
        You are sAI, the SkillSwap assistant.

        Use get_profile to answer questions about a specific user's
        profile using retrieved profile information through RAG.

        Do not invent profile information.

        Return valid JSON only.
        For a tool:
        {"tool": "get_profile", "arguments": {
            "user_name": "...",
            "question": "..."
        }}

        For a direct answer:
        {"tool": null, "answer": "..."}
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

#========= MAIN sAI PIPELINE =========
def handle_message(message: str) -> str:
    """Classify the message, select a tool, and return the result."""

    message = message.strip()

    if not message:
        return "Please enter a message."

    #========= INTENT CLASSIFICATION =========

    result = classify_intent(message)

    intent = result["intent"]
    confidence = result["confidence"]

    #========= PROMPT SELECTION =========

    system_prompt = prompt_builder(intent)

    #========= LLM TOOL SELECTION =========

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": message
        }
    ]

    prompt = gen_llm_tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True
    )

    inputs = gen_llm_tokenizer(
        prompt,
        return_tensors="pt"
    ).to(device)

    with torch.no_grad():
        outputs = gen_llm_model.generate(
            **inputs,
            max_new_tokens=150,
            do_sample=False
        )

    response = gen_llm_tokenizer.decode(
        outputs[0][inputs.input_ids.shape[1]:],
        skip_special_tokens=True
    )

    #========= RETURN RESULT =========

    return (
        f"Predicted intent: {intent}\n"
        f"Confidence: {confidence:.2%}\n"
        f"LLM decision: {response}"
    )