const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./prediksi.db');

// =====================
// BUAT TABLE DATABASE
// =====================
db.serialize(() => {

  // TABLE MATCHES
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
      match_id INTEGER,
      skor_rumah INTEGER,
      skor_tamu INTEGER,
      UNIQUE(match_id, skor_rumah, skor_tamu)
    )
  `);

});

// =====================
// API GET MATCHES
// =====================
app.get('/matches', (req, res) => {
  db.all('SELECT * FROM matches ORDER BY id DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// =====================
// ADMIN: BUAT MATCH
// =====================
app.post('/admin/match', (req, res) => {
  const { pertandingan } = req.body;

  if (!pertandingan) {
    return res.status(400).json({ error: 'Nama pertandingan wajib diisi' });
  }

  db.run(
    'INSERT INTO matches (pertandingan) VALUES (?)',
    [pertandingan],
    () => res.json({ success: true })
  );
});

// =====================
// ADMIN: TUTUP MATCH
// =====================
app.post('/admin/match/:id/close', (req, res) => {
  db.run(
    'UPDATE matches SET status = "CLOSED" WHERE id = ?',
    [req.params.id],
    () => res.json({ success: true })
  );
});

// =====================
// ADMIN: INPUT HASIL
// =====================
app.post('/admin/match/:id/result', (req, res) => {
  const { skor_rumah_asli, skor_tamu_asli } = req.body;

  if (skor_rumah_asli == skor_tamu_asli) {
    return res.status(400).json({ error: 'Skor tidak boleh seri' });
  }

  db.run(
    'UPDATE matches SET status = "FINISHED" WHERE id = ?',
    [req.params.id],
    () => res.json({ success: true })
  );
});

// =====================
// USER: KIRIM PREDIKSI
// =====================
app.post('/predict', (req, res) => {
  const { match_id, skor_rumah, skor_tamu } = req.body;

  if (skor_rumah == skor_tamu) {
    return res.status(400).json({ error: 'Skor tidak boleh seri' });
  }

  db.run(
    'INSERT INTO predictions (match_id, skor_rumah, skor_tamu) VALUES (?, ?, ?)',
    [match_id, skor_rumah, skor_tamu],
    (err) => {
      if (err) {
        return res.status(400).json({
          error: 'Skor ini sudah dipilih orang lain'
        });
      }
      res.json({ success: true });
    }
  );
});

// =====================
app.listen(3000, () => {
  console.log('🔥 Server running di http://localhost:3000');
});
