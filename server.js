const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./prediksi.db');

// ROOT
app.get('/', (req, res) => {
  res.send('API OK');
});

// INIT DB
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pertandingan TEXT NOT NULL
    )
  `);
});

// GET MATCH
app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches', (err, rows) => {
    res.json(rows || []);
  });
});

// ADD MATCH
app.post('/admin/match', (req, res) => {
  const { pertandingan } = req.body;
  if (!pertandingan) {
    return res.status(400).json({ message: 'Nama pertandingan wajib' });
  }

  db.run(
    'INSERT INTO matches (pertandingan) VALUES (?)',
    [pertandingan],
    () => res.json({ message: 'Match ditambahkan' })
  );
});

// START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
