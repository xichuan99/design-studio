import resend
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize the Resend client with API Key from settings
resend.api_key = settings.RESEND_API_KEY

async def send_reset_password_email(to_email: str, reset_link: str) -> bool:
    """
    Sends a password reset email using the Resend API.
    """
    if not settings.RESEND_API_KEY:
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

        # Resend SDK call (can be synchronous but wrapped here, usually it's fine for low volume or we can use anyio.to_thread)
        response = resend.Emails.send({
            "from": "SmartDesign <onboarding@resend.dev>",
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
    if not settings.RESEND_API_KEY:
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
            "from": "SmartDesign <onboarding@resend.dev>",
            "to": [to_email],
            "subject": "Informasi Akun Anda - SmartDesign",
            "html": html_content
        })

        logger.info(f"Google account notice email sent to {to_email}. Resend ID: {response.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send Google account notice email to {to_email}: {e}")
        return False
