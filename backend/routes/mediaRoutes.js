const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const ScanHistory = require('../models/ScanHistory');
const authMiddleware = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', authMiddleware, upload.single('media'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    const mlResult = mlResponse.data;

    const history = new ScanHistory({
      user: req.user.userId,
      filename: req.file.originalname,
      isDeepfake: mlResult.isDeepfake,
      confidence: mlResult.confidence,
      similarityScore: mlResult.similarityScore,
      details: mlResult.details,
      heatmapBase64: mlResult.heatmap
    });
    await history.save();

    fs.unlinkSync(req.file.path);

    res.json({ result: mlResult, historyId: history._id });
  } catch (err) {
    console.error('Error contacting ML service:', err.message);
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error processing media.' });
  }
});

router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await ScanHistory.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
