const { Schema, model, Types } = require('mongoose');

module.exports = model('Analysis', new Schema({
  user: { type: Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, default: 'Untitled analysis' },
  mlModel: String,
  summary: {
    files: Number, functions: Number, avgRisk: Number, maxRisk: Number, highRisk: Number, smells: Number,
  },
  files: [Schema.Types.Mixed], // per-file results incl. functions, metrics, smells, code snippets
}, { timestamps: true }));
