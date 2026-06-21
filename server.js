const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// LowDB setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { users: [], videos: [], likes: [] };
  await db.write();
}
initDB();

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🚀 revive.ly backend is running!' });
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Missing fields' });

  const user = { id: uuidv4(), username, email, password: password || 'fakehash', createdAt: new Date() };
  db.data.users.push(user);
  await db.write();
  res.json({ success: true, user: { id: user.id, username, email } });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email);
  if (user) {
    res.json({ success: true, token: 'fake-jwt-' + user.id, user });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Upload video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No video uploaded' });

  const video = {
    id: uuidv4(),
    url: `/uploads/${req.file.filename}`,
    userId: req.body.userId || 'demo',
    caption: req.body.caption || '',
    music: req.body.music || 'default',
    createdAt: new Date()
  };

  db.data.videos.push(video);
  await db.write();

  res.json({ success: true, video });
});

// Get feed
app.get('/api/feed', async (req, res) => {
  await db.read();
  res.json(db.data.videos.reverse());
});

// Like video
app.post('/api/like/:videoId', async (req, res) => {
  const { videoId } = req.params;
  // Simple like tracking
  res.json({ success: true, message: `Liked video ${videoId}` });
});

app.listen(PORT, () => {
  console.log(`🚀 revive.ly backend running on http://localhost:${PORT}`);
});