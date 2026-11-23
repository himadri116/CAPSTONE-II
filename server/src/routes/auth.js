const router = require('express').Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const cfg = require('../config');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

if (cfg.googleEnabled) {
  passport.use(new GoogleStrategy(cfg.google, async (_at, _rt, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] && profile.emails[0].value;
      if (!email) return done(new Error('Google account has no email'));
      const user = await User.findOneAndUpdate(
        { email },
        { googleId: profile.id, name: profile.displayName, avatar: profile.photos && profile.photos[0] && profile.photos[0].value },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      done(null, user);
    } catch (e) { done(e); }
  }));
}

function issueCookie(res, user) {
  const token = jwt.sign({ id: user.id }, cfg.jwtSecret, { expiresIn: '7d' });
  res.cookie('token', token, {
    httpOnly: true, sameSite: 'lax', secure: cfg.isProd && cfg.clientUrl.startsWith('https'), maxAge: 7 * 24 * 3600 * 1000,
  });
}

router.get('/config', (_req, res) => res.json({ google: cfg.googleEnabled, dev: cfg.devAuth }));

router.get('/google', (req, res, next) => {
  if (!cfg.googleEnabled) return res.status(503).json({ error: 'Google OAuth is not configured' });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => (cfg.googleEnabled ? next() : res.redirect(`${cfg.clientUrl}/login?error=1`)),
  passport.authenticate('google', { session: false, failureRedirect: `${cfg.clientUrl}/login?error=1` }),
  (req, res) => { issueCookie(res, req.user); res.redirect(cfg.clientUrl); });

// Local demo login, disabled in production and unless DEV_AUTH=true
router.post('/dev', async (_req, res) => {
  if (!cfg.devAuth) return res.status(404).json({ error: 'Not found' });
  const user = await User.findOneAndUpdate({ email: 'demo@bugsight.local' }, { name: 'Demo User' },
    { upsert: true, new: true, setDefaultsOnInsert: true });
  issueCookie(res, user);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) =>
  res.json({ id: req.user.id, email: req.user.email, name: req.user.name, avatar: req.user.avatar }));

router.post('/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

module.exports = router;
