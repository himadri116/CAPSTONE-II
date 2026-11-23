require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';
const cfg = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/bugsight',
  mlUrl: process.env.ML_SERVICE_URL || 'http://localhost:8000',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
  },
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  llmModel: process.env.LLM_MODEL || 'claude-sonnet-4-6',
  devAuth: process.env.DEV_AUTH === 'true' && !isProd,
};
cfg.googleEnabled = Boolean(cfg.google.clientID && cfg.google.clientSecret);

if (isProd && cfg.jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}
module.exports = cfg;
