import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { signAuthToken } from "../utils/jwt.js";
import { sendPasswordResetEmail } from "../utils/sendEmail.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_MINUTES = 15;

const googleClient = new OAuth2Client();

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const sendAuthResponse = (res, user, statusCode = 200) =>
  res.status(statusCode).json({
    token: signAuthToken(user._id.toString()),
    user: user.toPublic(),
  });

const hashResetToken = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const passwordProblem = (password) =>
  typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH
    ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    : null;

const fail = (res, error, fallback) => {
  console.error(fallback, error);
  res.status(500).json({ message: fallback });
};

export const register = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Enter your name." });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }
    const problem = passwordProblem(password);
    if (problem) {
      return res.status(400).json({ message: problem });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        message:
          existing.authProvider === "google"
            ? "This email is registered with Google. Use Continue with Google to sign in."
            : "An account with this email already exists. Log in instead.",
      });
    }

    const user = await User.create({ name, email, password });
    return sendAuthResponse(res, user, 201);
  } catch (error) {
    return fail(res, error, "Could not create your account. Please try again.");
  }
};

export const login = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Enter your email and password." });
    }

    const user = await User.findOne({ email }).select("+password");

    if (user && !user.password) {
      return res.status(401).json({
        message:
          "This account uses Google sign-in. Use Continue with Google, or choose Forgot password to set a password.",
      });
    }

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    return fail(res, error, "Could not log you in. Please try again.");
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ message: "Google sign-in is not configured on the server." });
    }
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({ message: "Missing Google credential." });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ message: "Google sign-in could not be verified. Try again." });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: "Your Google email address is not verified." });
    }

    const email = normalizeEmail(payload.email);
    let user = await User.findOne({ $or: [{ googleId: payload.sub }, { email }] });

    if (!user) {
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId: payload.sub,
        avatar: payload.picture,
        authProvider: "google",
      });
    } else if (!user.googleId) {
      // Existing email/password account: link it to this Google identity.
      user.googleId = payload.sub;
      if (!user.avatar && payload.picture) {
        user.avatar = payload.picture;
      }
      await user.save();
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    return fail(res, error, "Could not sign you in with Google. Please try again.");
  }
};

export const getMe = (req, res) => res.json({ user: req.user.toPublic() });

export const forgotPassword = async (req, res) => {
  // Same answer whether or not the email exists, so it cannot be used to probe accounts.
  const genericReply = {
    message: "If an account exists for that email, a reset link is on its way.",
  };

  try {
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json(genericReply);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173")
      .split(",")[0]
      .trim()
      .replace(/\/$/, "");

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: `${clientUrl}/reset-password/${rawToken}`,
      });
    } catch (emailError) {
      console.error("Password reset email failed:", emailError.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
    }

    return res.json(genericReply);
  } catch (error) {
    return fail(res, error, "Could not process your request. Please try again.");
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const problem = passwordProblem(password);
    if (problem) {
      return res.status(400).json({ message: problem });
    }

    const user = await User.findOne({
      resetPasswordToken: hashResetToken(String(req.params.token || "")),
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired. Request a new one.",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return sendAuthResponse(res, user);
  } catch (error) {
    return fail(res, error, "Could not reset your password. Please try again.");
  }
};
