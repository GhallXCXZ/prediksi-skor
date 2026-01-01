const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

const db = new sqlite3.Database("./db.sqlite")

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS matchx (
    id INTEGER PRIMARY KEY,
    title TEXT,
    status TEXT
  )`)

  db.run(`CREATE TABLE IF NOT EXISTS predict (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER,
    name TEXT,
    a INTEGER,
    b INTEGER,
    UNIQUE(match_id,name),
    UNIQUE(match_id,a,b)
  )`)
})

// ADMIN CREATE MATCH
app.post("/admin/create", (req,res)=>{
  db.run(
    "INSERT OR REPLACE INTO matchx (id,title,status) VALUES (1,?, 'open')",
    [req.body.title],
    ()=>res.json({ok:true})
  )
})

// USER LIST
app.get("/list",(req,res)=>{
  db.all("SELECT name,a,b FROM predict",(e,r)=>res.json(r))
})

// USER PREDICT
app.post("/predict",(req,res)=>{
  const {name,a,b}=req.body
  if(a===b) return res.json({error:"tidak boleh seri"})

  db.run(
    "INSERT INTO predict (match_id,name,a,b) VALUES (1,?,?,?)",
    [name,a,b],
    err=>{
      if(err) return res.json({error:"nama / skor sudah dipakai"})
      res.json({ok:true})
    }
  )
})

app.listen(3000,()=>console.log("SERVER READY"))
