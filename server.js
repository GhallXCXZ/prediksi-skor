const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./prediksi.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home TEXT,
      away TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      match_id INTEGER,
      home_score INTEGER,
      away_score INTEGER
    )
  `);
});

app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches', (err, rows) => {
    res.json(rows);
  });
});

app.post('/matches', (req, res) => {
  const { home, away } = req.body;
  if (!home || !away) {
    return res.status(400).json({ message: 'Input pertandingan tidak ditemukan' });
  }

  db.run(
    'INSERT INTO matches (home, away) VALUES (?, ?)',
    [home, away],
    () => res.json({ message: 'Match berhasil ditambahkan' })
  );
});

app.post('/predict', (req, res) => {
  const { name, matchId, homeScore, awayScore } = req.body;

  if (!name || homeScore === awayScore) {
    return res.status(400).json({ message: 'Nama wajib diisi dan skor tidak boleh sama' });
  }

  db.get(
    `SELECT * FROM predictions
     WHERE match_id = ? AND home_score = ? AND away_score = ?`,
    [matchId, homeScore, awayScore],
    (err, existing) => {
      if (existing) {
        return res.status(400).json({ message: 'Skor ini sudah dipilih orang lain' });
      }

      db.run(
        `INSERT INTO predictions (name, match_id, home_score, away_score)
         VALUES (?, ?, ?, ?)`,
        [name, matchId, homeScore, awayScore],
        () => res.json({ message: 'Prediksi berhasil disimpan' })
      );
    }
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
