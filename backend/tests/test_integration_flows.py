import csv
import os
import sys
import tempfile
import unittest
from io import StringIO
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.pop("DATABASE_URL", None)
os.environ.setdefault("JWT_SECRET", "integration-test-shared-secret-for-tests-12345")

from fastapi.testclient import TestClient

from config import settings
from services.feedback_service import FeedbackService
from services.metric_extraction_service import MetricExtractionService
from services.prediction_history_service import PredictionHistoryService
from services.prediction_service import PredictionService
from services.report_service import ReportService

settings.database_url = ""

import main


REPOSITORY_URL = "https://github.com/sclorg/s2i-python-container.git"
COMMIT_SHA = "1234567890abcdef1234567890abcdef12345678"


def build_prediction_response() -> dict:
    return {
        "repo_url": REPOSITORY_URL,
        "commit_sha": COMMIT_SHA,
        "prediction_threshold": 0.5,
        "total_files_scanned": 2,
        "results": [
            {
                "file_path": "src/main.py",
                "language": "Python",
                "prediction_label": "Defective",
                "defect_risk_probability": 0.82,
                "risk_level": "High",
                "recommendation": "Review immediately before release",
                "top_contributing_metrics": "conditional checks",
                "readable_explanation": "This file should receive closer review.",
            },
            {
                "file_path": "tests/test_main.py",
                "language": "Python",
                "prediction_label": "Non-defective",
                "defect_risk_probability": 0.31,
                "risk_level": "Low",
                "recommendation": "Low priority monitor if modified later",
                "top_contributing_metrics": "file size",
                "readable_explanation": "This file has a lower estimated risk.",
                "is_potential_test_file": True,
                "test_file_reason": "The path matches a common test folder.",
            },
        ],
    }


class ApiStorageIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = str(Path(self.temp_dir.name) / "integration.db")
        self.history_service = PredictionHistoryService(self.db_path)
        self.feedback_service = FeedbackService(self.db_path)
        self.client = TestClient(main.app)
        main.app.dependency_overrides[main.get_current_user] = lambda: {
            "id": "integration-test-user",
            "email": "integration@example.com",
            "name": "Integration Tester",
        }

        self.history_patch = patch.object(
            main,
            "prediction_history",
            self.history_service,
        )
        self.feedback_patch = patch.object(
            main,
            "feedback_service",
            self.feedback_service,
        )
        self.history_patch.start()
        self.feedback_patch.start()

    def tearDown(self):
        main.app.dependency_overrides.pop(main.get_current_user, None)
        self.feedback_patch.stop()
        self.history_patch.stop()
        self.temp_dir.cleanup()

    def test_feedback_submission_is_saved_and_returned_by_api(self):
        create_response = self.client.post(
            "/feedback",
            json={
                "name": "Integration Tester",
                "role": "Software developer",
                "rating": 5,
                "message": "The result dashboard is understandable.",
            },
        )

        self.assertEqual(create_response.status_code, 200)
        feedback_id = create_response.json()["feedback"]["id"]

        list_response = self.client.get("/feedback")

        self.assertEqual(list_response.status_code, 200)
        feedback = list_response.json()["feedback"]
        self.assertEqual(len(feedback), 1)
        self.assertEqual(feedback[0]["id"], feedback_id)
        self.assertEqual(
            feedback[0]["message"],
            "The result dashboard is understandable.",
        )

        reopened_service = FeedbackService(self.db_path)
        self.assertEqual(reopened_service.list_feedback()[0]["id"], feedback_id)

    def test_prediction_history_is_saved_and_returned_by_api(self):
        history_id = self.history_service.save_prediction(
            build_prediction_response()
        )

        list_response = self.client.get("/prediction-history")
        detail_response = self.client.get(
            f"/prediction-history/{history_id}"
        )

        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(
            list_response.json()["history"][0]["id"],
            history_id,
        )
        self.assertEqual(
            detail_response.json()["results"][0]["file_path"],
            "src/main.py",
        )

        reopened_service = PredictionHistoryService(self.db_path)
        reopened_detail = reopened_service.get_prediction(history_id)
        self.assertEqual(len(reopened_detail["results"]), 2)

    def test_export_endpoint_returns_selected_prediction_rows_as_csv(self):
        prediction_response = build_prediction_response()
        export_response = self.client.post(
            "/export-report",
            json=prediction_response,
        )

        self.assertEqual(export_response.status_code, 200)
        self.assertEqual(
            export_response.headers["content-type"],
            "text/csv; charset=utf-8",
        )
        self.assertIn(
            "defect_prediction_report_12345678.csv",
            export_response.headers["content-disposition"],
        )

        rows = list(csv.reader(StringIO(export_response.text)))
        file_rows = [
            row
            for row in rows
            if row and row[0] in {"src/main.py", "tests/test_main.py"}
        ]

        self.assertEqual(len(file_rows), 2)
        self.assertEqual(file_rows[0][4], "High")
        self.assertEqual(file_rows[1][15], "True")

    def test_scanner_routes_require_authentication_and_health_stays_public(self):
        configured_secret = settings.jwt_secret
        settings.jwt_secret = "integration-test-shared-secret-for-tests-12345"
        main.app.dependency_overrides.pop(main.get_current_user, None)
        try:
            history_response = self.client.get("/prediction-history")
            feedback_response = self.client.get("/feedback")
            health_response = self.client.get("/health")
        finally:
            settings.jwt_secret = configured_secret

        self.assertEqual(history_response.status_code, 401)
        self.assertEqual(history_response.headers["www-authenticate"], "Bearer")
        self.assertEqual(feedback_response.status_code, 401)
        self.assertEqual(health_response.status_code, 200)

    def test_openapi_combines_auth_endpoints_and_protects_scanner_operations(self):
        schema = self.client.get("/openapi.json").json()

        self.assertIn("/api/auth/login", schema["paths"])
        self.assertIn("/api/auth/forgot-password", schema["paths"])
        self.assertEqual(
            schema["paths"]["/api/auth/login"]["servers"][0]["url"],
            settings.auth_api_url,
        )
        protected_operations = {
            "/api/auth/me": ("get",),
            "/predict": ("post",),
            "/prediction-jobs": ("post",),
            "/prediction-jobs/{job_id}": ("get",),
            "/prediction-jobs/{job_id}/cancel": ("post",),
            "/prediction-history": ("get",),
            "/prediction-history/{history_id}": ("get", "delete"),
            "/feedback": ("get", "post"),
            "/export-report": ("post",),
            "/model-transparency": ("get",),
            "/commits": ("post",),
            "/branches": ("post",),
            "/tags": ("post",),
        }
        for path, methods in protected_operations.items():
            for method in methods:
                self.assertEqual(
                    schema["paths"][path][method]["security"],
                    [{"BearerAuth": []}],
                    f"{method.upper()} {path} should require Bearer auth",
                )
        self.assertIn(
            "BearerAuth",
            schema["components"]["securitySchemes"],
        )
        self.assertNotIn(
            "security",
            schema["paths"]["/api/auth/login"]["post"],
        )
        self.assertNotIn("security", schema["paths"]["/health"]["get"])

    def test_swagger_page_loads_the_login_prompt_for_the_combined_api(self):
        response = self.client.get("/docs")

        self.assertEqual(response.status_code, 200)
        self.assertIn("/openapi.json", response.text)
        self.assertIn("/docs-assets/swagger-login.js", response.text)
        self.assertIn("BUGSIGHT_AUTH_API_URL", response.text)


class PredictionProcessingIntegrationTests(unittest.TestCase):
    def test_metrics_flow_through_trained_model_and_report_service(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir)
            (project_dir / "src").mkdir()
            (project_dir / "src" / "calculator.py").write_text(
                "class Calculator:\n"
                "    def calculate(self, value):\n"
                "        if value > 0:\n"
                "            return value * 2\n"
                "        return 0\n",
                encoding="utf-8",
            )
            (project_dir / "tests").mkdir()
            (project_dir / "tests" / "test_calculator.py").write_text(
                "def test_calculate():\n"
                "    assert True\n",
                encoding="utf-8",
            )

            metrics = MetricExtractionService().extract_from_project(
                str(project_dir)
            )

        prediction_service = PredictionService()
        for feature_name in prediction_service.feature_names:
            if feature_name not in metrics.columns:
                metrics[feature_name] = 0

        predicted = prediction_service.predict(
            metrics,
            prediction_threshold=0.5,
        )
        predicted["top_contributing_metrics"] = "integration test metrics"
        predicted["confidence_warning"] = ""

        report = ReportService().generate(predicted)

        self.assertEqual(len(report), 2)
        self.assertTrue(
            all(
                0 <= row["defect_risk_probability"] <= 1
                for row in report
            )
        )
        self.assertTrue(
            all(
                row["risk_level"] in {"High", "Medium", "Low"}
                for row in report
            )
        )
        test_result = next(
            row
            for row in report
            if row["file_path"] == "tests/test_calculator.py"
        )
        self.assertTrue(test_result["is_potential_test_file"])


if __name__ == "__main__":
    unittest.main()
