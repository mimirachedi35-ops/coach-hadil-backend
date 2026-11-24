// ============================================================
// Coach Hadil - Gestion du club de judo (USOM Halaimiya)
// Stockage : MongoDB Atlas (persistant, gratuit, sans limite de duree)
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3000;
const ACCESS_CODE = process.env.ACCESS_CODE || 'judoom35';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const MONGODB_URI = process.env.MONGODB_URI;

let db;
async function connectDB() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI manquant dans les variables d\'environnement.');
    return;
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db('coachhadil');
  console.log('Connecte a MongoDB Atlas.');
}
connectDB().catch(err => console.error('Erreur de connexion MongoDB :', err.message));

async function loadData() {
  const doc = await db.collection('club').findOne({ _id: 'main' });
  return doc || { _id: 'main', cotisation: 1500, nextId: 1, judokas: [] };
}
async function saveData(data) {
  data._id = 'main';
  await db.collection('club').replaceOne({ _id: 'main' }, data, { upsert: true });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' })); // les photos passent en base64
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
  const token = jwt.sign({ role: 'coach' }, JWT_SECRET, { expiresIn: '365d' });
  res.json({ token });
});

app.get('/api/data', authRequired, async (req, res) => {
  try {
    const data = await loadData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Erreur base de donnees : ' + e.message });
  }
});

app.put('/api/data', authRequired, async (req, res) => {
  const body = req.body || {};
  if (!Array.isArray(body.judokas)) {
    return res.status(400).json({ error: 'Donnees invalides.' });
  }
  try {
    await saveData({ cotisation: body.cotisation || 0, nextId: body.nextId || 1, judokas: body.judokas });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Erreur base de donnees : ' + e.message });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, dbConnected: !!db }));

app.listen(PORT, () => {
  console.log(`Serveur Coach Hadil demarre sur http://localhost:${PORT}`);
});
