const { Schema, model } = require('mongoose');

module.exports = model('User', new Schema({
  googleId: { type: String, index: true, sparse: true },
  email: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
}, { timestamps: true }));
