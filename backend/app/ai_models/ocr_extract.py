"""
OCR Prescription Extraction Module
Uses Tesseract OCR + regex parsing to extract structured data from prescription images/PDFs.

In production:
    - Install tesseract: sudo apt install tesseract-ocr
    - pip install pytesseract Pillow pdf2image
    - Uncomment the real OCR block below
"""

import asyncio
import re
import io
from typing import Optional

# Production imports (uncomment when Tesseract is installed):
# import pytesseract
# from PIL import Image
# from pdf2image import convert_from_bytes


# ── Regex Patterns ─────────────────────────────────────────────────────────────
MEDICINE_PATTERN  = re.compile(
    r'\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)\s+'          # Drug name
    r'(\d+(?:\.\d+)?(?:mg|mcg|ml|g|IU|units?))'             # Dose
    r'(?:\s*[-–]\s*|\s+)'
    r'((?:\d+\s+)?(?:tablet|capsule|syrup|drop|injection|sachet|cream|gel)s?)?',
    re.IGNORECASE,
)

DOCTOR_PATTERN    = re.compile(r'Dr\.?\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)', re.IGNORECASE)
DATE_PATTERN      = re.compile(r'\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4})\b')
HOSPITAL_PATTERN  = re.compile(r'(Hospital|Clinic|Medical|Health\s*Centre|Healthcare)', re.IGNORECASE)
PATIENT_PATTERN   = re.compile(r'Patient\s*(?:Name)?\s*[:\-]?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)', re.IGNORECASE)


def parse_prescription_text(text: str) -> dict:
    """Parse raw OCR text into structured prescription data."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]

    # Extract doctor name
    doctor_match = DOCTOR_PATTERN.search(text)
    doctor_name  = doctor_match.group(0) if doctor_match else ""

    # Extract date
    date_match = DATE_PATTERN.search(text)
    rx_date    = date_match.group(0) if date_match else ""

    # Extract hospital
    hospital_match = HOSPITAL_PATTERN.search(text)
    hospital = ""
    if hospital_match:
        start = max(0, hospital_match.start() - 30)
        hospital = text[start:hospital_match.end()].strip().split("\n")[0][:60]

    # Extract patient name
    patient_match = PATIENT_PATTERN.search(text)
    patient_name  = patient_match.group(1) if patient_match else ""

    # Extract medicines
    medicines = []
    for match in MEDICINE_PATTERN.finditer(text):
        medicines.append({
            "name":     match.group(1).strip(),
            "dosage":   match.group(2).strip(),
            "form":     match.group(3).strip() if match.group(3) else "",
            "instructions": "",
        })

    return {
        "doctor_name": doctor_name,
        "hospital":    hospital,
        "date":        rx_date,
        "patient_name": patient_name,
        "medicines":   medicines[:10],   # cap at 10
        "raw_text":    text[:2000],
        "confidence":  min(0.95, 0.6 + len(medicines) * 0.05 + (0.1 if doctor_name else 0)),
    }


async def extract_prescription_data(
    file_bytes: bytes,
    content_type: str = "image/jpeg",
) -> dict:
    """
    Main extraction function.
    Production: use Tesseract OCR.
    Demo: returns realistic simulated data.
    """
    await asyncio.sleep(1.5)  # Simulate processing time

    # ── Demo Simulation ───────────────────────────────────────────────────────
    # Use the sum of first few bytes as a seed for consistent results per file
    seed = sum(file_bytes[:64])

    sample_prescriptions = [
        {
            "doctor_name":    "Dr. Anandibai G Joshi",
            "hospital":       "Sagar Hospital, Jayanagar",
            "date":           "09/04/2026",
            "patient_name":   "K L Ravi Kumar",
            "medicines": [
                {"name": "Augmentin 625 Duo Tablet", "dosage": "1 tablet - 0 - 1 tablet for 5 Days", "form": "tablet", "instructions": "Take on empty stomach"},
                {"name": "Crocin Advance Tablet", "dosage": "1 tablet when required for 5 Days", "form": "tablet", "instructions": "After food"},
                {"name": "Zivinx-C Chewable Tablet", "dosage": "1 tablet - 0 - 0 for 14 Days", "form": "tablet", "instructions": ""},
            ],
            "raw_text":     "Dr. Anandibai G Joshi\nMBBS, M.D Medicine\nConsultant Surgeon\nSagar Hospital, Jayanagar\nPatient: K L Ravi Kumar - 60 Years - Male\nDiagnosis: Fever for evaluation\nRx:\n1. Augmentin 625 Duo Tablet\n2. Crocin Advance Tablet\n3. Zivinx-C Chewable Tablet",
            "confidence":   0.94,
            "is_demo":      True
        },
        {
            "doctor_name":    "Dr. Priya Sharma",
            "hospital":       "City Medical Centre, Ahmedabad",
            "date":           "15/01/2025",
            "patient_name":   "Rahul Patel",
            "medicines": [
                {"name": "Paracetamol", "dosage": "500mg", "form": "tablet",    "instructions": "3 times daily for 5 days"},
                {"name": "Amoxicillin", "dosage": "250mg", "form": "capsule",   "instructions": "Twice daily for 7 days"},
                {"name": "Vitamin D3",  "dosage": "1000 IU","form": "tablet",   "instructions": "Once daily for 30 days"},
            ],
            "raw_text":     "PRESCRIPTION\nDr. Priya Sharma (MD)\nCity Medical Centre\nPatient: Rahul Patel\nDate: 15/01/2025\nRx:\n1. Paracetamol 500mg tab - TID x 5 days\n2. Amoxicillin 250mg cap - BID x 7 days\n3. Vitamin D3 1000 IU tab - OD x 30 days",
            "confidence":   0.98,
            "is_demo":      True
        },
        {
            "doctor_name":  "Dr. Arjun Mehta",
            "hospital":     "Apollo Hospital, Mumbai",
            "date":         "02/12/2024",
            "patient_name": "Priya Singh",
            "medicines": [
                {"name": "Ibuprofen", "dosage": "400mg", "form": "tablet", "instructions": "Twice daily after meals"},
                {"name": "Omeprazole","dosage": "20mg",  "form": "capsule","instructions": "Once daily before breakfast"},
            ],
            "raw_text":   "Apollo Hospital\nDr. Arjun Mehta\nReg No: 12345\nPatient: Priya Singh\nDate: 02 Dec 2024\nRx:\n- Ibuprofen 400mg TID\n- Omeprazole 20mg OD",
            "confidence": 0.94,
            "is_demo":      True
        },
        {
            "doctor_name":  "Dr. Sneha Gupta",
            "hospital":     "Skin & Care Clinic, Delhi",
            "date":         "10/03/2025",
            "patient_name": "Amit Kumar",
            "medicines": [
                {"name": "Cetirizine", "dosage": "10mg", "form": "tablet", "instructions": "Once daily at night"},
                {"name": "Hydrocortisone", "dosage": "1%", "form": "cream", "instructions": "Apply twice daily"},
            ],
            "raw_text":   "Skin & Care Clinic\nDr. Sneha Gupta\nPatient: Amit Kumar\nDate: 10/03/2025\nRx:\n- Cetirizine 10mg OD\n- Hydrocortisone cream",
            "confidence": 0.96,
            "is_demo":      True
        }
    ]

    return sample_prescriptions[seed % len(sample_prescriptions)]
