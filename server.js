const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./prediksi.db');

// =======================
// DATABASE
// =======================
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pertandingan TEXT NOT NULL,
      status TEXT DEFAULT 'OPEN'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      match_id INTEGER,
      home_score INTEGER,
      away_score INTEGER,
      UNIQUE(match_id, home_score, away_score),
      UNIQUE(match_id, name)
    )
  `);

});

// =======================
// GET MATCHES
// =======================
app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches ORDER BY id DESC', (err, rows) => {
    res.json(rows);
  });
});

// =======================
// GET SCORES PER MATCH (UNTUK USER)
// =======================
app.get('/scores/:matchId', (req, res) => {
  db.all(
    `SELECT name, home_score, away_score
     FROM predictions
     WHERE match_id = ?`,
    [req.params.matchId],
    (err, rows) => {
      res.json(rows);
    }
  );
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
    () => res.json({ message: 'Match berhasil ditambahkan' })
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
      .json({ message: 'Nama wajib & skor tidak boleh seri' });
  }

  db.run(
    `INSERT INTO predictions (name, match_id, home_score, away_score)
     VALUES (?, ?, ?, ?)`,
    [name, matchId, homeScore, awayScore],
    (err) => {
      if (err) {
        if (err.message.includes('match_id, name')) {
          return res
            .status(400)
            .json({ message: 'Nama ini sudah mengisi prediksi untuk match ini' });
        }
        return res
          .status(400)
          .json({ message: 'Skor ini sudah dipilih orang lain' });
      }
      res.json({ message: 'Prediksi berhasil disimpan' });
    }
  );
});

// =======================
// ADMIN: SEMUA PREDIKSI
// =======================
app.get('/admin/predictions', (req, res) => {
  db.all(`
    SELECT 
      p.name,
      m.pertandingan,
      p.home_score,
      p.away_score
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    ORDER BY p.id DESC
  `, (err, rows) => {
    res.json(rows);
  });
});

// =======================
// LEADERBOARD
// =======================
app.get('/leaderboard', (req, res) => {
  db.all(`
    SELECT name, COUNT(*) as total
    FROM predictions
    GROUP BY name
    ORDER BY total DESC
  `, (err, rows) => {
    res.json(rows);
  });
});

// =======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
