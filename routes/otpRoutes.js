const express = require('express');
const router = express.Router();

// OTP Routes
router.get('/', (req, res) => {
  res.json({ message: 'OTP Routes' });
});

router.post('/send', (req, res) => {
  res.json({ message: 'Send OTP endpoint' });
});

router.post('/verify', (req, res) => {
  res.json({ message: 'Verify OTP endpoint' });
});

module.exports = router;
