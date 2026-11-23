import datetime
import random
import json
import base64
import hmac
import hashlib
from typing import Optional, Dict, Any, Tuple
import httpx
from config import settings
from services.mongo_service import mongo_service

# Optional pyjwt import with pure standard-library fallback
try:
    import jwt
    HAS_PYJWT = True
except ImportError:
    HAS_PYJWT = False


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64_decode(data_str: str) -> bytes:
    padding = "=" * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)


class AuthService:
    def __init__(self):
        self.jwt_secret = settings.jwt_secret
        self.algorithm = "HS256"

    def create_token(self, user_dict: Dict[str, Any]) -> str:
        payload = {
            "sub": str(user_dict["id"]),
            "email": user_dict.get("email"),
            "name": user_dict.get("name"),
            "exp": int((datetime.datetime.utcnow() + datetime.timedelta(days=settings.jwt_expires_days)).timestamp()),
            "iat": int(datetime.datetime.utcnow().timestamp())
        }

        if HAS_PYJWT:
            return jwt.encode(payload, self.jwt_secret, algorithm=self.algorithm)

        # Standard library signed token fallback (identical to JWT HS256)
        header = {"alg": "HS256", "typ": "JWT"}
        header_b64 = _b64_encode(json.dumps(header).encode("utf-8"))
        payload_b64 = _b64_encode(json.dumps(payload).encode("utf-8"))
        message = f"{header_b64}.{payload_b64}"
        signature = hmac.new(self.jwt_secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
        sig_b64 = _b64_encode(signature)
        return f"{message}.{sig_b64}"

    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        try:
            if HAS_PYJWT:
                payload = jwt.decode(token, self.jwt_secret, algorithms=[self.algorithm])
            else:
                parts = token.split(".")
                if len(parts) != 3:
                    return None
                header_b64, payload_b64, sig_b64 = parts
                message = f"{header_b64}.{payload_b64}"
                expected_sig = hmac.new(self.jwt_secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()
                if not hmac.compare_digest(_b64_decode(sig_b64), expected_sig):
                    return None
                payload = json.loads(_b64_decode(payload_b64).decode("utf-8"))
                if payload.get("exp", 0) < datetime.datetime.utcnow().timestamp():
                    return None

            user_id = payload.get("sub")
            if not user_id:
                return None
            return mongo_service.get_user_by_id(user_id)
        except Exception as e:
            print(f"[AuthService] Token decode error: {e}")
            return None

    def generate_otp_code(self) -> str:
        return f"{random.randint(100000, 999999)}"

    def send_otp(self, email: str) -> Tuple[bool, str, Optional[str]]:
        clean_email = email.lower().strip()
        if not clean_email or "@" not in clean_email:
            return False, "Invalid email address format", None

        code = self.generate_otp_code()
        mongo_service.store_otp(clean_email, code, expires_in_seconds=600)

        print(f"\n==========================================")
        print(f"[BUGSIGHT AUTH] OTP for {clean_email}: {code}")
        print(f"==========================================\n")

        dev_code = code if settings.dev_auth else None
        return True, "One-time password sent to your email", dev_code

    def verify_otp_and_login(self, email: str, otp_code: str) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[str]]:
        clean_email = email.lower().strip()
        if not mongo_service.verify_and_consume_otp(clean_email, otp_code):
            return False, "Invalid or expired OTP code", None, None

        user = mongo_service.get_or_create_email_user(clean_email)
        token = self.create_token(user)
        return True, "Login successful", user, token

    async def verify_google_and_login(self, credential: str) -> Tuple[bool, str, Optional[Dict[str, Any]], Optional[str]]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}"
                )
                if resp.status_code != 200:
                    return False, "Failed to verify Google token with Google servers", None, None

                data = resp.json()
                google_id = data.get("sub")
                email = data.get("email")
                name = data.get("name") or email.split("@")[0]
                avatar = data.get("picture")

                if not google_id or not email:
                    return False, "Google token is missing essential profile information", None, None

                user = mongo_service.get_or_create_google_user(
                    google_id=google_id,
                    email=email,
                    name=name,
                    avatar=avatar
                )
                token = self.create_token(user)
                return True, "Google login successful", user, token

        except Exception as e:
            print(f"[AuthService] Google auth exception: {e}")
            return False, f"Google auth error: {str(e)}", None, None

    def demo_login(self) -> Tuple[bool, str, Dict[str, Any], str]:
        user = mongo_service.get_or_create_demo_user()
        token = self.create_token(user)
        return True, "Demo login successful", user, token


auth_service = AuthService()
