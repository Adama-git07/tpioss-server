const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const SECRET = process.env.JWT_SECRET || 'secret_tpioss_2025';
const DB_FILE = 'bris.json';

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

const readBris  = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeBris = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token manquant' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ username }, SECRET, { expiresIn: '7d' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Identifiants invalides' });
  }
});

app.get('/bris', authMiddleware, (req, res) => {
  res.json(readBris());
});

app.post('/bris', authMiddleware, (req, res) => {
  const bris = readBris();
  const nouveau = {
    id: Date.now().toString(),
    titre: req.body.titre,
    description: req.body.description || '',
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    photoBase64: req.body.photoBase64 || null,
    dateCreation: new Date().toISOString(),
    status: req.body.status || 'enAttente'
  };
  bris.push(nouveau);
  writeBris(bris);
  res.status(201).json(nouveau);
});

app.put('/bris/:id', authMiddleware, (req, res) => {
  const bris = readBris();
  const index = bris.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Bris non trouvé' });
  bris[index] = { ...bris[index], ...req.body };
  writeBris(bris);
  res.json(bris[index]);
});

app.delete('/bris/:id', authMiddleware, (req, res) => {
  let bris = readBris();
  bris = bris.filter(b => b.id !== req.params.id);
  writeBris(bris);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur en ligne sur port ' + PORT));
