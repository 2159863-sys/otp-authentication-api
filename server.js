require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const otpRoutes = require('./routes/otpRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'OTP Project Server is running!' });
});

app.use('/api/otp', otpRoutes);

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send OTP endpoint
// Request body example: { "phone": "0612345678" }
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number required' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiry = 5 minutes
    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    // Check if user exists
    const [user] = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );

    if (user.length > 0) {
      // Update existing user
      await pool.query(
        'UPDATE users SET otp = ?, otp_expiry = ? WHERE phone = ?',
        [otp, expiry, phone]
      );
    } else {
      // Insert new user
      await pool.query(
        'INSERT INTO users (phone, otp, otp_expiry) VALUES (?, ?, ?)',
        [phone, otp, expiry]
      );
    }

    console.log("OTP:", otp); // for testing only

    res.json({
      message: 'OTP generated successfully',
      otp // remove this later in real apps
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone and OTP required' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phone]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Check expiry
    if (new Date() > new Date(user.otp_expiry)) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // Check OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    res.json({ message: 'Login successful 🎉' });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
