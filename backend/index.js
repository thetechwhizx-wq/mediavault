// index.js

// This line imports the express tool we installed
// Think of it like: "go get the express tool from the box"
const express = require('express');

// This imports cors — allows frontend to talk to backend
const cors = require('cors');

// This imports fs — a built in Node.js tool for reading/writing files
// fs stands for "file system" — we need it to save data to our JSON file
const fs = require('fs');

// Create your application
// app is now your entire backend — you'll add everything to it
const app = express();

// These two lines are MIDDLEWARE
// Middleware runs on EVERY request before your code handles it
// Think of it like a security guard that checks everyone entering

// This allows your frontend (React) to talk to this backend
app.use(cors());

// This tells Express to understand JSON data that gets sent to it
// Without this, req.body would be empty and you'd never receive data
app.use(express.json({ limit: '10mb' }));

// Your first route — a health check
// When someone visits http://localhost:5000/ they get this response
// req = the incoming request (what they sent you)
// res = your response (what you send back)
app.get('/', (req, res) => {
  res.json({ message: 'MediaVault API is running!' });
});

// Tell your server to listen on port 5000
// A port is like an apartment number — requests know where to go
// localhost:5000 means "this computer, apartment 5000"
const PORT = 5000;
// Import your media routes
const mediaRoutes = require('./routes/media');

// Use them — any request to /api/media goes to media.js
app.use('/api/media', mediaRoutes);
app.listen(PORT, () => {
  // This runs once when the server starts successfully
  console.log(`Server is running on http://localhost:${PORT}`);
});