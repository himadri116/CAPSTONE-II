import datetime
import uuid
from typing import Optional, Dict, Any
from config import settings

try:
    from bson import ObjectId
    from pymongo import MongoClient, ASCENDING
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False
    ObjectId = None
    MongoClient = None
    ASCENDING = 1


class MongoService:
    def __init__(self):
        self._client = None
        self._db = None
        self._in_memory_users: Dict[str, Dict[str, Any]] = {}
        self._in_memory_otps: Dict[str, Dict[str, Any]] = {}

    def _get_db(self):
        if not HAS_PYMONGO:
            return None

        if self._db is None:
            try:
                self._client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=2000)
                self._db = self._client.get_default_database("bugsight")
                self._db.users.create_index([("email", ASCENDING)], unique=True)
                self._db.users.create_index([("google_id", ASCENDING)], sparse=True)
                self._db.otps.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
                self._db.otps.create_index([("email", ASCENDING)])
            except Exception as e:
                print(f"[MongoService] MongoDB connection warning: {e}. Falling back to memory store if needed.")
                self._db = None

        return self._db

    def is_connected(self) -> bool:
        if not HAS_PYMONGO:
            return False
        try:
            db = self._get_db()
            if db is not None:
                db.command("ping")
                return True
        except Exception:
            pass
        return False

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        db = self._get_db()
        if db is not None:
            try:
                user = db.users.find_one({"_id": ObjectId(user_id) if ObjectId else user_id})
                if user:
                    user["id"] = str(user.pop("_id"))
                    return user
            except Exception as e:
                print(f"[MongoService] Error fetching user from mongo: {e}")

        # In-memory fallback
        for u in self._in_memory_users.values():
            if str(u.get("id")) == str(user_id):
                return u
        return None

    def get_or_create_google_user(self, google_id: str, email: str, name: str, avatar: Optional[str] = None) -> Dict[str, Any]:
        clean_email = email.lower().strip()
        now = datetime.datetime.utcnow()
        db = self._get_db()

        if db is not None:
            try:
                update_data = {
                    "google_id": google_id,
                    "name": name,
                    "updated_at": now
                }
                if avatar:
                    update_data["avatar"] = avatar

                user = db.users.find_one_and_update(
                    {"email": clean_email},
                    {
                        "$set": update_data,
                        "$setOnInsert": {
                            "email": clean_email,
                            "auth_provider": "google",
                            "created_at": now
                        }
                    },
                    upsert=True,
                    return_document=True
                )
                user["id"] = str(user.pop("_id"))
                return user
            except Exception as e:
                print(f"[MongoService] Error in get_or_create_google_user: {e}")

        # In-memory fallback
        if clean_email in self._in_memory_users:
            u = self._in_memory_users[clean_email]
            u["google_id"] = google_id
            u["name"] = name
            if avatar:
                u["avatar"] = avatar
            u["updated_at"] = now
            return u

        new_user = {
            "id": str(uuid.uuid4()),
            "google_id": google_id,
            "email": clean_email,
            "name": name,
            "avatar": avatar,
            "auth_provider": "google",
            "created_at": now,
            "updated_at": now
        }
        self._in_memory_users[clean_email] = new_user
        return new_user

    def store_otp(self, email: str, otp_code: str, expires_in_seconds: int = 600) -> None:
        clean_email = email.lower().strip()
        now = datetime.datetime.utcnow()
        expires_at = now + datetime.timedelta(seconds=expires_in_seconds)

        db = self._get_db()
        if db is not None:
            try:
                db.otps.delete_many({"email": clean_email})
                db.otps.insert_one({
                    "email": clean_email,
                    "otp": otp_code,
                    "created_at": now,
                    "expires_at": expires_at
                })
                return
            except Exception as e:
                print(f"[MongoService] Error storing OTP in mongo: {e}")

        # In-memory fallback
        self._in_memory_otps[clean_email] = {
            "otp": otp_code,
            "expires_at": expires_at
        }

    def verify_and_consume_otp(self, email: str, otp_code: str) -> bool:
        clean_email = email.lower().strip()
        now = datetime.datetime.utcnow()

        db = self._get_db()
        if db is not None:
            try:
                record = db.otps.find_one({
                    "email": clean_email,
                    "otp": otp_code.strip(),
                    "expires_at": {"$gt": now}
                })
                if record:
                    db.otps.delete_many({"email": clean_email})
                    return True
                return False
            except Exception as e:
                print(f"[MongoService] Error verifying OTP in mongo: {e}")

        # In-memory fallback
        rec = self._in_memory_otps.get(clean_email)
        if rec and rec["otp"] == otp_code.strip() and rec["expires_at"] > now:
            del self._in_memory_otps[clean_email]
            return True
        return False

    def get_or_create_email_user(self, email: str) -> Dict[str, Any]:
        clean_email = email.lower().strip()
        now = datetime.datetime.utcnow()
        default_name = clean_email.split("@")[0].capitalize()
        avatar = f"https://api.dicebear.com/7.x/identicon/svg?seed={clean_email}"

        db = self._get_db()
        if db is not None:
            try:
                user = db.users.find_one_and_update(
                    {"email": clean_email},
                    {
                        "$set": {
                            "updated_at": now,
                            "email_verified": True
                        },
                        "$setOnInsert": {
                            "email": clean_email,
                            "name": default_name,
                            "auth_provider": "otp",
                            "avatar": avatar,
                            "created_at": now
                        }
                    },
                    upsert=True,
                    return_document=True
                )
                user["id"] = str(user.pop("_id"))
                return user
            except Exception as e:
                print(f"[MongoService] Error in get_or_create_email_user: {e}")

        # In-memory fallback
        if clean_email in self._in_memory_users:
            u = self._in_memory_users[clean_email]
            u["email_verified"] = True
            u["updated_at"] = now
            return u

        new_user = {
            "id": str(uuid.uuid4()),
            "email": clean_email,
            "name": default_name,
            "avatar": avatar,
            "auth_provider": "otp",
            "email_verified": True,
            "created_at": now,
            "updated_at": now
        }
        self._in_memory_users[clean_email] = new_user
        return new_user

    def get_or_create_demo_user(self) -> Dict[str, Any]:
        demo_email = "demo@bugsight.ai"
        now = datetime.datetime.utcnow()

        db = self._get_db()
        if db is not None:
            try:
                user = db.users.find_one_and_update(
                    {"email": demo_email},
                    {
                        "$set": {
                            "name": "Demo Reviewer",
                            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=bugsight_demo",
                            "auth_provider": "demo",
                            "updated_at": now
                        },
                        "$setOnInsert": {
                            "email": demo_email,
                            "created_at": now
                        }
                    },
                    upsert=True,
                    return_document=True
                )
                user["id"] = str(user.pop("_id"))
                return user
            except Exception as e:
                print(f"[MongoService] Error in get_or_create_demo_user: {e}")

        # In-memory fallback
        if demo_email in self._in_memory_users:
            return self._in_memory_users[demo_email]

        demo_user = {
            "id": str(uuid.uuid4()),
            "email": demo_email,
            "name": "Demo Reviewer",
            "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=bugsight_demo",
            "auth_provider": "demo",
            "created_at": now,
            "updated_at": now
        }
        self._in_memory_users[demo_email] = demo_user
        return demo_user


mongo_service = MongoService()
