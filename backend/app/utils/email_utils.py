"""
Email Utility – Send verification & notification emails
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_USER
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


def send_verification_email(to_email: str, name: str, token: str) -> bool:
    link = f"http://localhost:8000/api/auth/verify-email?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#F0F9FF;border-radius:16px;">
      <h2 style="color:#0284C7;">Welcome to Medisphere, {name}! 🏥</h2>
      <p style="color:#334155;">Please verify your email to activate your account.</p>
      <a href="{link}" style="display:inline-block;background:#0284C7;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Verify Email
      </a>
      <p style="color:#64748B;font-size:12px;">This link expires in 24 hours.</p>
    </div>
    """
    return send_email(to_email, "Verify your Medisphere account", html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    # Frontend URL for password reset
    link = f"http://localhost:5173/reset-password?token={token}"
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#FDF2F2;border-radius:16px;">
      <h2 style="color:#DC2626;">Password Reset Request 🔐</h2>
      <p style="color:#334155;">You requested to reset your password. Click the button below to set a new one.</p>
      <a href="{link}" style="display:inline-block;background:#DC2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Reset Password
      </a>
      <p style="color:#64748B;font-size:12px;">If you didn't request this, you can safely ignore this email. This link expires in 1 hour.</p>
    </div>
    """
    return send_email(to_email, "Reset your Medisphere password", html)


def send_appointment_confirmation(to_email: str, name: str, doctor: str, date: str, slot: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#F0F9FF;border-radius:16px;">
      <h2 style="color:#059669;">Appointment Confirmed ✅</h2>
      <p>Hi <strong>{name}</strong>, your appointment is confirmed!</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;color:#64748B;">Doctor</td><td style="font-weight:bold;">{doctor}</td></tr>
        <tr><td style="padding:8px;color:#64748B;">Date</td><td style="font-weight:bold;">{date}</td></tr>
        <tr><td style="padding:8px;color:#64748B;">Time</td><td style="font-weight:bold;">{slot}</td></tr>
      </table>
      <p style="color:#64748B;font-size:12px;">Medisphere – Healthcare Without Borders</p>
    </div>
    """
    return send_email(to_email, f"Appointment with {doctor} – {date}", html)


def send_order_confirmation(to_email: str, name: str, order_id: str, total: float) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;background:#FFFBEB;border-radius:16px;">
      <h2 style="color:#D97706;">Order Placed Successfully 📦</h2>
      <p>Hi <strong>{name}</strong>, your order has been placed!</p>
      <p><strong>Order ID:</strong> {order_id}</p>
      <p><strong>Total:</strong> ₹{total:.2f}</p>
      <p style="color:#64748B;">Expected delivery: 2–4 hours for local orders.</p>
    </div>
    """
    return send_email(to_email, f"Order {order_id} Confirmed – Medisphere", html)
