"""
SkillSwap AI pipeline (sAI).
For now this is a minimal stub so the chat interface works.
We will expand it with DistilBERT + Qwen later.
"""
#========= IMPORTS & CONFIGURATION =========

from pathlib import Path

import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from peft import PeftModel

#========= MODEL PATHS & DEVICE =========

BASE_MODEL_NAME = "distilbert-base-uncased"
INTENT_ROUTER_PATH = 'ai_models/Intent_Router_LoRA'

DEVICE = torch.device(
    "mps" if torch.backends.mps.is_available()
    else "cuda" if torch.cuda.is_available()
    else "cpu"
)

#========= INTENT LABELS =========

# Must match the label mapping used when training your classifier.
ID2LABEL = {
    0: "AUTOMATION",
    1: "GENERAL",
    2: "PROFILE_QUERY",
}

#========= DISTILBERT + LoRA LOADING =========

print("[sAI] Loading DistilBERT intent classifier...")

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL_NAME)

base_model = AutoModelForSequenceClassification.from_pretrained(
    BASE_MODEL_NAME,
    num_labels=3
)

model = PeftModel.from_pretrained(
    base_model,
    INTENT_ROUTER_PATH
)

model = model.to(DEVICE)
model.eval()

print(f"[sAI] Intent classifier loaded on {DEVICE}")

#========= INTENT CLASSIFICATION =========

def classify_intent(message: str) -> dict:
    """Predict the intent of a user message."""

    inputs = tokenizer(
        message,
        return_tensors="pt",
        truncation=True,
        max_length=128
    )

    inputs = {
        key: value.to(DEVICE)
        for key, value in inputs.items()
    }

    with torch.inference_mode():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)
        predicted_id = int(probabilities.argmax(dim=-1).item())

    return {
        "intent": ID2LABEL[predicted_id],
        "confidence": float(probabilities[0, predicted_id].item())
    }

#========= MAIN sAI PIPELINE =========

def handle_message(message: str) -> str:
    """Classify the message and display the predicted intent."""

    message = message.strip()

    if not message:
        return "Please enter a message."

    result = classify_intent(message)

    intent = result["intent"]
    confidence = result["confidence"]

    return (
        f"Predicted intent: {intent}\n"
        f"Confidence: {confidence:.2%}"
    )