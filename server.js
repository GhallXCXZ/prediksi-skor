const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./prediksi.db');

// =======================
// DATABASE SETUP
// =======================
db.serialize(() => {

  // TABLE MATCHES (PAKAI 1 FIELD SAJA)
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pertandingan TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN'
    )
  `);

  // TABLE PREDICTIONS
  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      match_id INTEGER,
      home_score INTEGER,
      away_score INTEGER,
      UNIQUE(match_id, home_score, away_score)
    )
  `);

});

// =======================
// GET MATCHES
// =======================
app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
});

// =======================
// ADMIN: TAMBAH MATCH
// =======================
app.post('/admin/match', (req, res) => {
  const { pertandingan } = req.body;

  if (!pertandingan) {
    return res.status(400).json({ message: 'Nama pertandingan wajib diisi' });
  }

  db.run(
    'INSERT INTO matches (pertandingan) VALUES (?)',
    [pertandingan],
    (err) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      res.json({ message: 'Match berhasil ditambahkan' });
    }
  );
});

// =======================
// USER: KIRIM PREDIKSI
// =======================
app.post('/predict', (req, res) => {
  const { name, matchId, homeScore, awayScore } = req.body;

  if (!name || homeScore === awayScore) {
    return res
      .status(400)
      .json({ message: 'Nama wajib diisi dan skor tidak boleh sama' });
  }

  db.run(
    `INSERT INTO predictions (name, match_id, home_score, away_score)
     VALUES (?, ?, ?, ?)`,
    [name, matchId, homeScore, awayScore],
    (err) => {
      if (err) {
        return res
          .status(400)
          .json({ message: 'Skor ini sudah dipilih orang lain' });
      }
      res.json({ message: 'Prediksi berhasil disimpan' });
    }
  );
});

// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
