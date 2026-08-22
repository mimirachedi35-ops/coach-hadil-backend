// ============================================================
// Coach Hadil - Gestion du club de judo (USOM Halaimiya)
// Serveur independant : Node.js + fichier JSON + photos locales
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || 'judoom35';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const DATA_FILE = path.join(__dirname, 'judo-data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { cotisation: 1500, nextId: 1, judokas: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.error('Erreur de lecture des donnees, fichier vide cree.', e);
    return { cotisation: 1500, nextId: 1, judokas: [] };
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // les photos passent en base64
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifie.' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide ou expiree.' });
  }
}

app.post('/api/login', (req, res) => {
  const { code } = req.body || {};
  if (code !== ACCESS_CODE) return res.status(401).json({ error: 'Code incorrect.' });
  const token = jwt.sign({ role: 'coach' }, JWT_SECRET, { expiresIn: '90d' });
  res.json({ token });
});

app.get('/api/data', authRequired, (req, res) => {
  res.json(loadData());
});

app.put('/api/data', authRequired, (req, res) => {
  const body = req.body || {};
  if (!Array.isArray(body.judokas)) {
    return res.status(400).json({ error: 'Donnees invalides.' });
  }
  saveData({ cotisation: body.cotisation || 0, nextId: body.nextId || 1, judokas: body.judokas });
  res.json({ ok: true });
});

app.post('/api/judokas/:id/photo', authRequired, (req, res) => {
  const { dataUrl } = req.body || {};
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return res.status(400).json({ error: 'Image invalide.' });
  }
  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(path.join(UPLOADS_DIR, req.params.id + '.jpg'), buffer);
  res.json({ ok: true });
});

app.delete('/api/judokas/:id/photo', authRequired, (req, res) => {
  const p = path.join(UPLOADS_DIR, req.params.id + '.jpg');
  if (fs.existsSync(p)) fs.unlinkSync(p);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Serveur Coach Hadil demarre sur http://localhost:${PORT}`);
});
