const { Schema, model } = require('mongoose');

// Cache of LLM results keyed by sha256(code + smells) so repeat requests are free.
module.exports = model('Suggestion', new Schema({
  key: { type: String, unique: true, index: true },
  result: Schema.Types.Mixed,
}, { timestamps: true }));
