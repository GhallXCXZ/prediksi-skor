const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./prediksi.db');

// ================= ROOT (ANTI CANNOT GET)
app.get('/', (req, res) => {
  res.send('API Prediksi Skor AKTIF');
});

// ================= DATABASE
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
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      UNIQUE(match_id, home_score, away_score),
      UNIQUE(match_id, name)
    )
  `);

});

// ================= MATCH
app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches ORDER BY id DESC', (e, rows) => {
    res.json(rows || []);
  });
});

app.post('/admin/match', (req, res) => {
  const { pertandingan } = req.body;
  if (!pertandingan) {
    return res.status(400).json({ message: 'Nama match wajib diisi' });
  }

  db.run(
    'INSERT INTO matches (pertandingan) VALUES (?)',
    [pertandingan],
    () => res.json({ message: 'Match ditambahkan' })
  );
});

app.post('/admin/match/:id/close', (req, res) => {
  db.run(
    'UPDATE matches SET status="CLOSED" WHERE id=?',
    [req.params.id],
    () => res.json({ message: 'Match ditutup' })
  );
});

// ================= PREDICTION
app.post('/predict', (req, res) => {
  const { name, matchId, homeScore, awayScore } = req.body;

  if (!name || homeScore === awayScore) {
    return res.status(400).json({ message: 'Nama wajib & skor tidak boleh seri' });
  }

  db.get(
    'SELECT status FROM matches WHERE id=?',
    [matchId],
    (e, m) => {
      if (!m || m.status === 'CLOSED') {
        return res.status(400).json({ message: 'Match sudah ditutup' });
      }

      db.run(
        `INSERT INTO predictions (name, match_id, home_score, away_score)
         VALUES (?, ?, ?, ?)`,
        [name, matchId, homeScore, awayScore],
        (err) => {
          if (err) {
            if (err.message.includes('match_id, name')) {
              return res.status(400).json({ message: 'Nama sudah submit prediksi' });
            }
            return res.status(400).json({ message: 'Skor sudah dipilih orang lain' });
          }
          res.json({ message: 'Prediksi berhasil' });
        }
      );
    }
  );
});

// ================= USER LIHAT SKOR TERAMBIL
app.get('/scores/:id', (req, res) => {
  db.all(
    'SELECT name, home_score, away_score FROM predictions WHERE match_id=?',
    [req.params.id],
    (e, rows) => res.json(rows || [])
  );
});

// ================= ADMIN VIEW
app.get('/admin/predictions', (req, res) => {
  db.all(`
    SELECT p.name, m.pertandingan, p.home_score, p.away_score
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    ORDER BY p.id DESC
  `, (e, rows) => res.json(rows || []));
});

app.get('/leaderboard', (req, res) => {
  db.all(`
    SELECT name, COUNT(*) AS total
    FROM predictions
    GROUP BY name
    ORDER BY total DESC
  `, (e, rows) => res.json(rows || []));
});

// ================= START
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on', PORT));
