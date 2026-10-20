// index.js
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { connectDB } = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect Database (MongoDB Atlas if URI set, otherwise local data.json fallback)
connectDB();

// API Routes
const mediaRoutes = require('./routes/media');
app.use('/api/media', mediaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend in production (Single Unified Service on Render!)
const buildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(buildPath)) {
  console.log('🌐 [Frontend] Serving static React build from', buildPath);
  app.use(express.static(buildPath));
  // Catch-all for React Single Page App routing in Express 5
  app.use((req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ message: 'MediaVault API is running! Frontend build not found locally.' });
  });
}

// Port: Render assigns dynamic port via process.env.PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
