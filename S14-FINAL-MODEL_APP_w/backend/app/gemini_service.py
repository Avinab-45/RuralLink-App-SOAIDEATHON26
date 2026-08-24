"""
gemini_service.py
-----------------
Converts a free-text farmer/user message into structured JSON using Gemini.
If Gemini is unavailable, uses a reliable local fallback parser.
"""

import json
import re

from app.config import (
    GEMINI_API_KEY,
    GEMINI_MODEL_NAME,
    KNOWN_VILLAGE_COORDS,
)

VALID_CATEGORIES = [
    "medicine",
    "groceries",
    "electronics",
    "clothing",
    "agricultural_supplies",
    "documents",
]

VALID_URGENCY = ["low", "normal", "high", "emergency"]

SYSTEM_PROMPT = """You are an information-extraction engine for a rural delivery system.
Given a delivery message, return ONLY valid JSON with these exact keys:

- "village": string
- "category": one of {categories}
- "urgency": one of {urgency}
- "notes": a short paraphrase

Priority rules:
- "not urgent", "no rush", and "whenever" = low
- "urgent", "ASAP", "soon", and "today" = high
- "emergency", "critical", "immediately", and life-threatening medicine requests = emergency
- routine requests = normal
""".format(categories=VALID_CATEGORIES, urgency=VALID_URGENCY)


def _resolve_known_village(message: str, fallback_village: str = "Unknown") -> str:
    """Find a configured village name regardless of uppercase/lowercase."""
    message_lower = message.lower()

    # Longest names first avoids a short name masking a longer location.
    for village_name in sorted(KNOWN_VILLAGE_COORDS, key=len, reverse=True):
        if village_name in message_lower:
            return village_name.title()

    return fallback_village


def _detect_urgency(text: str, category: str) -> str:
    """
    Deterministic business rule.
    Critical: checks 'not urgent' BEFORE 'urgent'.
    """
    text = text.lower()

    if any(word in text for word in [
        "not urgent",
        "no rush",
        "whenever",
        "low priority",
    ]):
        return "low"

    if any(word in text for word in [
        "emergency",
        "critical",
        "immediately",
        "life-threatening",
        "life threatening",
    ]):
        return "emergency"

    # Urgent medicine/medical orders are escalated to emergency.
    if category == "medicine" and any(word in text for word in [
        "urgent",
        "asap",
        "quickly",
        "soon",
    ]):
        return "emergency"

    if any(word in text for word in [
        "urgent",
        "asap",
        "soon",
        "today",
        "quick",
    ]):
        return "high"

    return "normal"


def _detect_category(text: str) -> str:
    text = text.lower()

    if any(word in text for word in [
        "medicine",
        "medical",
        "hospital",
        "health",
        "drug",
        "clinic",
    ]):
        return "medicine"

    if any(word in text for word in [
        "seed",
        "fertilizer",
        "pesticide",
        "crop",
        "farm",
    ]):
        return "agricultural_supplies"

    if any(word in text for word in [
        "document",
        "certificate",
        "paper",
    ]):
        return "documents"

    if "electronics" in text:
        return "electronics"

    if any(word in text for word in [
        "clothes",
        "clothing",
        "shirt",
        "uniform",
    ]):
        return "clothing"

    return "groceries"


def _fallback_parse(message: str) -> dict:
    """Offline parser used when Gemini is unavailable."""
    category = _detect_category(message)
    urgency = _detect_urgency(message, category)

    village = _resolve_known_village(message)

    # Fallback only if no configured village was found.
    if village == "Unknown":
        village_match = re.search(r"\b([A-Z][a-zA-Z]+)\b", message)
        village = village_match.group(1) if village_match else "Unknown"

    return {
        "village": village,
        "category": category,
        "urgency": urgency,
        "notes": message[:100],
    }


def parse_farmer_message(message: str) -> dict:
    """Return village, category, urgency, and notes."""
    if not GEMINI_API_KEY:
        return _fallback_parse(message)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )

        raw_text = response.text.strip()
        raw_text = re.sub(r"^```json\s*|\s*```$", "", raw_text)
        data = json.loads(raw_text)

        category = data.get("category", "groceries")
        if category not in VALID_CATEGORIES:
            category = _detect_category(message)

        # Explicit user wording always wins over an AI mistake.
        urgency = _detect_urgency(message, category)

        return {
            "village": _resolve_known_village(
                message,
                data.get("village", "Unknown"),
            ),
            "category": category,
            "urgency": urgency,
            "notes": data.get("notes", message[:100]),
        }

    except Exception:
        return _fallback_parse(message)