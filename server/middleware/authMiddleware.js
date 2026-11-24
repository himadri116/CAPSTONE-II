import User from "../models/User.js";
import { verifyAuthToken } from "../utils/jwt.js";

export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, value] = header.split(" ");

    if (scheme !== "Bearer" || !value) {
      return res.status(401).json({ message: "Please log in to continue." });
    }

    const payload = verifyAuthToken(value);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ message: "This account no longer exists." });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
};
