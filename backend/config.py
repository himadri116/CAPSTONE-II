import os


#Central place for deployment and local runtime settings
class Settings:
    def __init__(self):
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.project_dir = os.path.dirname(self.backend_dir)
        self.ml_workspace_dir = os.path.join(self.project_dir, "ml_workspace")

        self.allowed_origins = self._parse_csv_env(
            "ALLOWED_ORIGINS",
            ["http://127.0.0.1:5173", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:3000", "https://sdp-for-git-hub.vercel.app"]
        )
        self.mongodb_url = os.getenv("MONGODB_URL", "mongodb://mongo:27017/bugsight").strip()
        self.jwt_secret = os.getenv("JWT_SECRET", "bugsight_secret_jwt_key_development_2026").strip()
        self.jwt_expires_days = self._parse_int_env("JWT_EXPIRES_DAYS", 7)
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
        self.dev_auth = self._parse_bool_env("DEV_AUTH", True)
        self.database_url = os.getenv("DATABASE_URL", "").strip()
        self.prediction_history_db_path = os.getenv(
            "PREDICTION_HISTORY_DB_PATH",
            os.path.join(self.backend_dir, "data", "prediction_history.db")
        )
        self.temp_repo_dir = os.getenv("SDP_TEMP_REPO_DIR")
        self.allow_local_cache_mode = self._parse_bool_env(
            "ALLOW_LOCAL_CACHE_MODE",
            True
        )
        self.allow_history_delete = self._parse_bool_env(
            "ALLOW_HISTORY_DELETE",
            True
        )
        self.max_source_files_per_run = self._parse_optional_int_env(
            "MAX_SOURCE_FILES_PER_RUN"
        )
        self.max_prediction_workers = self._parse_int_env(
            "MAX_PREDICTION_WORKERS",
            2
        )
        self.git_shallow_history_depth = self._parse_int_env(
            "GIT_SHALLOW_HISTORY_DEPTH",
            80
        )
        self.git_command_timeout_seconds = self._parse_int_env(
            "GIT_COMMAND_TIMEOUT_SECONDS",
            420
        )

    def _parse_csv_env(self, name: str, default: list[str]) -> list[str]:
        value = os.getenv(name)

        if not value:
            return default

        items = [
            item.strip().rstrip("/")
            for item in value.split(",")
            if item.strip()
        ]

        return items or default

    def _parse_bool_env(self, name: str, default: bool) -> bool:
        value = os.getenv(name)

        if value is None:
            return default

        return value.strip().lower() in {"1", "true", "yes", "on"}

    def _parse_int_env(self, name: str, default: int) -> int:
        value = os.getenv(name)

        if not value:
            return default

        return int(value)
    def _parse_optional_int_env(self, name: str) -> int | None:
        value = os.getenv(name)

        if not value:
            return None

        return int(value)


settings = Settings()




