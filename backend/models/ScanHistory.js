const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  filename: { type: String, required: true },
  isDeepfake: { type: Boolean, required: true },
  confidence: { type: Number, required: true },
  similarityScore: { type: Number, required: false },
  details: { type: String },
  heatmapBase64: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
