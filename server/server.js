import "dotenv/config";
import connectDB from "./config/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error("JWT_SECRET is missing or too short. Set a long random value in server/.env");
  process.exit(1);
}

try {
  await connectDB();
  app.listen(PORT, () => console.log(`Auth server running on port ${PORT}`));
} catch (error) {
  console.error("Failed to start auth server:", error.message);
  process.exit(1);
}
