import os
import unittest
import uuid

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("BUGSIGHT_BASE_URL", "http://localhost:5173").rstrip("/")












class AuthenticationBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        options = webdriver.ChromeOptions()
        if os.getenv("BUGSIGHT_HEADLESS", "1").strip().lower() not in {
            "0",
            "false",
            "no",
        }:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        if os.getenv("BUGSIGHT_ACCEPT_INSECURE_CERTS", "").strip().lower() in {
            "1",
            "true",
            "yes",
        }:
            options.set_capability("acceptInsecureCerts", True)

        remote_url = os.getenv("SELENIUM_REMOTE_URL")
        if remote_url:
            cls.driver = webdriver.Remote(
                command_executor=remote_url,
                options=options,
            )
        else:
            cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, 20)

    @classmethod
    def tearDownClass(cls):
        show_browser = os.getenv("BUGSIGHT_HEADLESS", "1").strip().lower() in {
            "0",
            "false",
            "no",
        }
        pause_after_tests = os.getenv(
            "BUGSIGHT_PAUSE_ON_FINISH",
            "0",
        ).strip().lower() in {"1", "true", "yes"}
        if show_browser and pause_after_tests:
            input("Tests finished. Press Enter to close the Chrome window...")
        cls.driver.quit()

    def setUp(self):
        self.driver.get(BASE_URL)
        self.driver.execute_script("window.localStorage.clear();")
        self.driver.delete_all_cookies()

    def test_guest_is_redirected_from_protected_pages(self):
        for path in ("/prediction-history", "/feedback", "/repository-input"):
            with self.subTest(path=path):
                self.driver.get(f"{BASE_URL}{path}")
                self.wait.until(EC.url_contains("/login"))
                self.assertIn("/login", self.driver.current_url)

    def test_signup_creates_session_and_opens_protected_scanner(self):
        name = "Selenium Test User"
        email = f"selenium-{uuid.uuid4().hex}@example.com"
        password = "Selenium-test-123!"
        self.driver.get(f"{BASE_URL}/signup")

        self.driver.find_element(By.ID, "signup-name").send_keys(name)
        self.driver.find_element(By.ID, "signup-email").send_keys(email)
        self.driver.find_element(By.ID, "signup-password").send_keys(password)
        self.driver.find_element(By.ID, "signup-confirm").send_keys(password)
        self.driver.find_element(
            By.XPATH,
            "//button[normalize-space()='Create account']",
        ).click()

        signup_state = self.wait.until(
            lambda driver: (
                "success"
                if "/repository-input" in driver.current_url
                else "error"
                if driver.find_elements(
                    By.CSS_SELECTOR,
                    ".error-box[role='alert']",
                )
                else False
            )
        )
        if signup_state == "error":
            error_message = self.driver.find_element(
                By.CSS_SELECTOR,
                ".error-box[role='alert']",
            ).text
            self.fail(f"Signup was rejected: {error_message}")

        token = self.driver.execute_script(
            "return window.localStorage.getItem('sdp_auth_token');"
        )

        self.assertTrue(token)
        self.assertIn("/repository-input", self.driver.current_url)
        self.assertTrue(
            self.driver.find_element(
                By.CSS_SELECTOR,
                ".navbar-username",
            ).text
        )

        self.driver.find_element(
            By.CSS_SELECTOR,
            ".navbar-logout-btn",
        ).click()
        self.wait.until(EC.url_contains("/"))
        self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, ".login-nav-link")
            )
        )
        self.assertIsNone(
            self.driver.execute_script(
                "return window.localStorage.getItem('sdp_auth_token');"
            )
        )

        self.driver.get(f"{BASE_URL}/forgot-password")
        self.driver.find_element(By.ID, "forgot-email").send_keys(
            f"unknown-{uuid.uuid4().hex}@example.com"
        )
        self.driver.find_element(
            By.XPATH,
            "//button[normalize-space()='Send reset link']",
        ).click()
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//h1[normalize-space()='Check your email']")
            )
        )

        self.driver.get(f"{BASE_URL}/login")
        self.driver.find_element(By.ID, "login-email").send_keys(email)
        self.driver.find_element(By.ID, "login-password").send_keys(password)
        self.driver.find_element(
            By.XPATH,
            "//button[normalize-space()='Log in']",
        ).click()
        self.wait.until(EC.url_contains("/repository-input"))
        self.assertTrue(
            self.driver.execute_script(
                "return window.localStorage.getItem('sdp_auth_token');"
            )
        )

    def test_reset_password_validation_does_not_submit_invalid_password(self):
        self.driver.get(f"{BASE_URL}/reset-password/test-reset-token")

        self.driver.find_element(By.ID, "reset-password").send_keys("short")
        self.driver.find_element(By.ID, "reset-confirm").send_keys("short")
        self.driver.find_element(
            By.XPATH,
            "//button[normalize-space()='Save new password']",
        ).click()

        error = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, ".error-box[role='alert']")
            )
        )
        self.assertIn("at least 8 characters", error.text)


if __name__ == "__main__":
    unittest.main()
