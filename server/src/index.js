const mongoose = require('mongoose');
const cfg = require('./config');
const app = require('./app');

mongoose.connect(cfg.mongoUri)
  .then(() => app.listen(cfg.port, () => console.log(`API listening on :${cfg.port}`)))
  .catch((err) => { console.error('Mongo connection failed', err); process.exit(1); });
