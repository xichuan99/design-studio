from app.core.config import settings
import logging
from typing import Optional, Tuple

try:
    import resend  # type: ignore
except Exception:  # pragma: no cover - environment dependent
    resend = None

logger = logging.getLogger(__name__)

# Initialize the Resend client with API Key from settings
if resend is not None:
    resend.api_key = settings.RESEND_API_KEY

async def send_reset_password_email(to_email: str, reset_link: str) -> bool:
    """
    Sends a password reset email using the Resend API.
    """
    if not settings.RESEND_API_KEY or resend is None:
        logger.warning("RESEND_API_KEY not set. Mocking email delivery:")
        logger.warning(f"To: {to_email}")
        logger.warning(f"Link: {reset_link}")
        return True

    try:
        # A simple HTML template for the password reset email
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Reset Kata Sandi SmartDesign</h2>
            <p>Seseorang telah meminta untuk mereset kata sandi akun SmartDesign Anda.</p>
            <p>Silakan klik tombol di bawah ini untuk mereset kata sandi Anda. Tautan ini hanya berlaku selama 1 jam.</p>
            <div style="margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #6C2BEE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Kata Sandi</a>
            </div>
            <p style="color: #666; font-size: 14px;">Jika Anda tidak membuat permintaan ini, Anda dapat mengabaikan email ini dengan aman.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="color: #999; font-size: 12px;">© 2026 SmartDesign Studio. Jika tombol tidak berfungsi, salin tautan berikut: <br/> {reset_link}</p>
        </div>
        """

        response = resend.Emails.send({
            "from": "SmartDesign <system@nugrohopramono.my.id>",
            "to": [to_email],
            "subject": "Reset Kata Sandi Anda - SmartDesign",
            "html": html_content
        })

        logger.info(f"Email reset password sent to {to_email}. Resend ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reset password email to {to_email}: {e}")
        return False


async def send_google_account_notice_email(to_email: str) -> bool:
    """
    Sends an informative email to users who registered via Google Sign-In
    and attempted to use the forgot password feature.
    """
    if not settings.RESEND_API_KEY or resend is None:
        logger.warning("RESEND_API_KEY not set. Mocking Google notice email:")
        logger.warning(f"To: {to_email}")
        return True

    try:
        html_content = f"""
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Informasi Akun SmartDesign</h2>
            <p>Kami menerima permintaan reset kata sandi untuk alamat email ini.</p>
            <p>Namun, akun SmartDesign Anda (<strong>{to_email}</strong>) terdaftar menggunakan <strong>Google Sign-In</strong>, sehingga tidak menggunakan kata sandi terpisah.</p>
            <p>Untuk masuk ke akun Anda, silakan gunakan tombol <strong>"Masuk dengan Google"</strong> di halaman login.</p>
            <div style="margin: 30px 0;">
                <a href="https://desain.nugrohopramono.my.id/login" style="background-color: #6C2BEE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Ke Halaman Login</a>
            </div>
            <p style="color: #666; font-size: 14px;">Jika Anda tidak membuat permintaan ini, Anda dapat mengabaikan email ini dengan aman.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
            <p style="color: #999; font-size: 12px;">© 2026 SmartDesign Studio.</p>
        </div>
        """

        response = resend.Emails.send({
            "from": "SmartDesign <system@nugrohopramono.my.id>",
            "to": [to_email],
            "subject": "Informasi Akun Anda - SmartDesign",
            "html": html_content
        })

        logger.info(f"Google account notice email sent to {to_email}. Resend ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Google account notice email to {to_email}: {e}")
        return False


async def send_waitlist_confirmation_email(
    to_email: str,
    position: int,
) -> Tuple[bool, Optional[str]]:
    """Send waitlist confirmation + lead magnet link.

    Returns (sent, error_message). This is best-effort and should never block signup flow.
    """
    lead_magnet_url = settings.WAITLIST_LEAD_MAGNET_URL or ""

    if not settings.RESEND_API_KEY or resend is None:
        logger.warning("RESEND_API_KEY not set. Waitlist email delivery is pending manual follow-up.")
        logger.warning("To: %s | Position: %s | Lead magnet: %s", to_email, position, lead_magnet_url)
        return False, "RESEND_API_KEY not set"

    try:
        lead_magnet_block = ""
        if lead_magnet_url:
            lead_magnet_block = f"""
            <p>Bonus untuk Anda sudah siap di tautan berikut:</p>
            <p><a href=\"{lead_magnet_url}\" style=\"color: #6C2BEE; font-weight: 600;\">Unduh Bonus PDF</a></p>
            """

        html_content = f"""
        <div style=\"font-family: sans-serif; max-width: 600px; margin: 0 auto;\">
            <h2>Anda Masuk Waitlist SmartDesign</h2>
            <p>Terima kasih sudah bergabung. Posisi Anda saat ini: <strong>#{position}</strong>.</p>
            <p>Kami akan mengirim update saat akses dibuka bertahap.</p>
            {lead_magnet_block}
            <p style=\"color: #666; font-size: 14px;\">Jika Anda tidak merasa mendaftar, Anda dapat mengabaikan email ini.</p>
            <hr style=\"border: none; border-top: 1px solid #eee; margin-top: 30px;\" />
            <p style=\"color: #999; font-size: 12px;\">© 2026 SmartDesign Studio.</p>
        </div>
        """

        response = resend.Emails.send({
            "from": settings.WAITLIST_EMAIL_FROM,
            "to": [to_email],
            "subject": "Waitlist SmartDesign Anda Sudah Aktif",
            "html": html_content,
        })

        logger.info("Waitlist confirmation email sent to %s. Resend ID: %s", to_email, response.get("id"))
        return True, None
    except Exception as e:
        logger.error("Failed to send waitlist confirmation email to %s: %s", to_email, e)
        return False, str(e)
