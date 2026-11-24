import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  register,
  login,
  googleLogin,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Slows down password guessing and reset-email abuse.
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

router.post("/register", sensitiveLimiter, register);
router.post("/login", sensitiveLimiter, login);
router.post("/google", sensitiveLimiter, googleLogin);
router.post("/forgot-password", sensitiveLimiter, forgotPassword);
router.post("/reset-password/:token", sensitiveLimiter, resetPassword);
router.get("/me", protect, getMe);

export default router;
