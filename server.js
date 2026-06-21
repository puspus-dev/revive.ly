const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// LowDB setup with default data
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = { 
  users: [], 
  videos: [], 
  likes: [] 
};
const db = new Low(adapter, defaultData);

// Initialize DB
async function initDB() {
  await db.read();
  db.data = db.data || defaultData;
  await db.write();
}

initDB().catch(console.error);

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'revive.ly backend is running 🚀' });
});

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const user = {
    id: Date.now().toString(),
    username,
    email,
    password, // TODO: Hash this in production
    createdAt: new Date().toISOString()
  };

  db.data.users.push(user);
  await db.write();

  res.json({ success: true, user: { id: user.id, username, email } });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.data.users.find(u => u.email === email && u.password === password);
  
  if (user) {
    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Upload video
app.post('/api/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video uploaded' });
  }

  const video = {
    id: Date.now().toString(),
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    userId: req.body.userId || 'anonymous',
    caption: req.body.caption || '',
    createdAt: new Date().toISOString(),
    likes: 0
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
app.post('/api/like/:id', async (req, res) => {
  const videoId = req.params.id;
  const video = db.data.videos.find(v => v.id === videoId);
  
  if (video) {
    video.likes = (video.likes || 0) + 1;
    await db.write();
    res.json({ success: true, likes: video.likes });
  } else {
    res.status(404).json({ error: 'Video not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 revive.ly backend running on http://localhost:${PORT}`);
});
