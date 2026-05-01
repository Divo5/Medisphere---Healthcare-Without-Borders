"""
Symptom Checker AI Model
Uses rule-based NLP + ML classification for symptom analysis.
In production: replace with trained scikit-learn / TensorFlow model.
"""

import asyncio
from typing import List, Optional


# ── Symptom → Disease Mapping (Knowledge Base) ────────────────────────────────
SYMPTOM_DISEASE_MAP = {
    "Viral Fever / Influenza": {
        "keywords": ["fever", "body aches", "chills", "fatigue", "headache", "sweating", "weakness"],
        "base_prob": 0.0,
        "severity": "medium",
        "see_doctor_threshold": 0.5,
    },
    "Common Cold": {
        "keywords": ["runny nose", "sore throat", "cough", "sneezing", "mild fever", "congestion"],
        "base_prob": 0.0,
        "severity": "low",
        "see_doctor_threshold": 0.7,
    },
    "Dengue Fever": {
        "keywords": ["high fever", "severe headache", "body aches", "rash", "eye pain", "joint pain"],
        "base_prob": 0.0,
        "severity": "high",
        "see_doctor_threshold": 0.3,
    },
    "Malaria": {
        "keywords": ["fever", "chills", "sweating", "headache", "nausea", "vomiting", "fatigue"],
        "base_prob": 0.0,
        "severity": "high",
        "see_doctor_threshold": 0.3,
    },
    "COVID-19": {
        "keywords": ["fever", "cough", "breathlessness", "fatigue", "loss of smell", "sore throat"],
        "base_prob": 0.0,
        "severity": "high",
        "see_doctor_threshold": 0.4,
    },
    "Migraine": {
        "keywords": ["headache", "nausea", "sensitivity to light", "dizziness", "vomiting"],
        "base_prob": 0.0,
        "severity": "medium",
        "see_doctor_threshold": 0.5,
    },
    "Gastroenteritis": {
        "keywords": ["stomach pain", "diarrhea", "vomiting", "nausea", "fever", "cramps"],
        "base_prob": 0.0,
        "severity": "medium",
        "see_doctor_threshold": 0.5,
    },
    "Acid Reflux / GERD": {
        "keywords": ["chest pain", "heartburn", "nausea", "stomach pain", "bloating"],
        "base_prob": 0.0,
        "severity": "low",
        "see_doctor_threshold": 0.6,
    },
    "Hypertension": {
        "keywords": ["headache", "dizziness", "chest pain", "breathlessness", "blurred vision"],
        "base_prob": 0.0,
        "severity": "high",
        "see_doctor_threshold": 0.3,
    },
    "Asthma": {
        "keywords": ["breathlessness", "wheezing", "cough", "chest tightness", "shortness of breath"],
        "base_prob": 0.0,
        "severity": "high",
        "see_doctor_threshold": 0.3,
    },
    "Urinary Tract Infection": {
        "keywords": ["burning urination", "frequent urination", "fever", "lower back pain", "cloudy urine"],
        "base_prob": 0.0,
        "severity": "medium",
        "see_doctor_threshold": 0.4,
    },
    "Anemia": {
        "keywords": ["fatigue", "weakness", "dizziness", "pale skin", "shortness of breath", "cold hands"],
        "base_prob": 0.0,
        "severity": "medium",
        "see_doctor_threshold": 0.5,
    },
}

RECOMMENDATIONS_MAP = {
    "low": [
        "Rest well and stay hydrated — drink at least 8 glasses of water daily.",
        "Monitor your symptoms. If they worsen, consult a doctor.",
        "Over-the-counter medicines like Paracetamol may help with fever.",
        "Eat light, nutritious meals and avoid heavy foods.",
    ],
    "medium": [
        "Rest and drink plenty of fluids.",
        "Take Paracetamol 500mg if fever exceeds 100°F (consult your pharmacist).",
        "If symptoms persist beyond 3 days, book a doctor consultation.",
        "Avoid self-medicating with antibiotics.",
        "Keep track of your temperature every 6 hours.",
    ],
    "high": [
        "⚠️ Please consult a doctor immediately.",
        "Do not delay medical attention — some of these symptoms may indicate a serious condition.",
        "Visit the nearest emergency room if you experience chest pain or difficulty breathing.",
        "Avoid taking any strong medication without a prescription.",
        "Keep yourself hydrated and rest while arranging medical help.",
    ],
}

EMERGENCY_SYMPTOMS = {
    "chest pain", "difficulty breathing", "breathlessness", "loss of consciousness",
    "severe headache", "paralysis", "blurred vision", "coughing blood",
}


def normalize(text: str) -> str:
    return text.lower().strip()


async def analyze_symptoms(
    symptoms: List[str],
    description: str = "",
    age: Optional[int] = None,
    gender: Optional[str] = None,
    duration: Optional[str] = None,
) -> dict:
    """
    Analyze symptoms and return AI result.
    Production: Load trained scikit-learn model from pickle and call model.predict_proba()
    """
    await asyncio.sleep(0)   # Non-blocking placeholder

    norm_symptoms = [normalize(s) for s in symptoms]
    norm_desc     = normalize(description)
    all_input     = " ".join(norm_symptoms) + " " + norm_desc

    # Check for emergency
    is_emergency = any(es in all_input for es in EMERGENCY_SYMPTOMS)

    # Score each disease
    scored = []
    for disease, info in SYMPTOM_DISEASE_MAP.items():
        matches = sum(1 for kw in info["keywords"] if kw in all_input)
        if matches > 0:
            base  = matches / len(info["keywords"])
            # Age/duration adjustments
            if age and age > 60:
                base *= 1.15
            if duration and "week" in duration:
                base *= 1.1
            base = min(base, 0.97)
            scored.append({
                "name":        disease,
                "probability": round(base * 100, 1),
                "severity":    info["severity"],
                "description": f"Based on {matches} matching symptom(s)",
            })

    # Sort by probability
    scored.sort(key=lambda x: x["probability"], reverse=True)

    # Normalise probabilities so top-3 sum to ~100
    top3 = scored[:3]
    total_prob = sum(c["probability"] for c in top3) or 1
    for c in top3:
        c["probability"] = round(c["probability"] / total_prob * 100, 1)

    # Risk level
    if not top3:
        risk_level = "low"
        risk_score = 10.0
    else:
        top_prob = top3[0]["probability"]
        top_sev  = top3[0].get("severity", "low")
        if top_sev == "high" or is_emergency:
            risk_level = "high"
            risk_score = max(top_prob, 70.0)
        elif top_sev == "medium" or top_prob >= 50:
            risk_level = "medium"
            risk_score = top_prob
        else:
            risk_level = "low"
            risk_score = top_prob

    see_doctor = risk_level in ("medium", "high") or is_emergency

    return {
        "risk_level":      risk_level,
        "risk_score":      round(risk_score, 1),
        "conditions":      top3 if top3 else [{"name": "No specific condition identified", "probability": 0, "description": "Please describe your symptoms in more detail."}],
        "recommendations": RECOMMENDATIONS_MAP[risk_level],
        "see_doctor":      see_doctor,
        "emergency":       is_emergency,
        "disclaimer":      "This is an AI-assisted screening tool. Always consult a qualified doctor for diagnosis and treatment.",
    }
