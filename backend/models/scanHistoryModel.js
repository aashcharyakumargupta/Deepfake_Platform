const mongoose = require('mongoose');

const scanHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  isDeepfake: {
    type: Boolean,
    required: true
  },
  confidence: {
    type: Number,
    required: true
  },
  similarityScore: {
    type: Number,
    required: true
  },
  details: {
    type: String
  },
  heatmapBase64: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ScanHistory', scanHistorySchema);
