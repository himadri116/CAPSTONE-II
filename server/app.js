import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/authRoutes.js";

const app = express();

const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const apiDocsUrl = process.env.API_DOCS_URL || "http://localhost:8000/docs";

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "10kb" }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.get("/api-docs", (_req, res) => res.redirect(apiDocsUrl));
app.get("/api-docs.json", (_req, res) =>
  res.redirect(apiDocsUrl.replace(/\/docs\/?$/, "/openapi.json"))
);
app.use("/api/auth", authRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found." }));

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request body." });
  }
  console.error(error);
  return res.status(500).json({ message: "Something went wrong on the server." });
});

export default app;
