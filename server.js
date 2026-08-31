const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const Database = require('better-sqlite3');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'expenses.db');
const db = new Database(dbPath);

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      person1 TEXT NOT NULL,
      person2 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      expense_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      payer TEXT NOT NULL,
      split TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);
}

initializeDatabase();

// REST API Endpoints
app.post('/api/session/create', (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 11);
  const { person1, person2 } = req.body;

  try {
    const stmt = db.prepare('INSERT INTO sessions (id, person1, person2) VALUES (?, ?, ?)');
    stmt.run(sessionId, person1, person2);
    res.json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const expenses = db.prepare('SELECT * FROM expenses WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);

    res.json({
      session,
      expenses: expenses.map(exp => ({
        id: exp.expense_id,
        amount: exp.amount,
        description: exp.description,
        payer: exp.payer,
        split: exp.split,
        date: exp.date
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

app.post('/api/session/:sessionId/expense', (req, res) => {
  const { sessionId } = req.params;
  const { id, amount, description, payer, split, date } = req.body;

  try {
    const stmt = db.prepare('INSERT INTO expenses (session_id, expense_id, amount, description, payer, split, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    stmt.run(sessionId, id, amount, description, payer, split, date);

    io.to(sessionId).emit('expense_added', {
      id,
      amount,
      description,
      payer,
      split,
      date
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add expense' });
  }
});

app.delete('/api/session/:sessionId/expense/:expenseId', (req, res) => {
  const { sessionId, expenseId } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM expenses WHERE session_id = ? AND expense_id = ?');
    stmt.run(sessionId, expenseId);

    io.to(sessionId).emit('expense_deleted', { id: expenseId });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.delete('/api/session/:sessionId/expenses', (req, res) => {
  const { sessionId } = req.params;

  try {
    const stmt = db.prepare('DELETE FROM expenses WHERE session_id = ?');
    stmt.run(sessionId);

    io.to(sessionId).emit('expenses_cleared');

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear expenses' });
  }
});

app.put('/api/session/:sessionId/names', (req, res) => {
  const { sessionId } = req.params;
  const { person1, person2 } = req.body;

  try {
    const stmt = db.prepare('UPDATE sessions SET person1 = ?, person2 = ? WHERE id = ?');
    stmt.run(person1, person2, sessionId);

    io.to(sessionId).emit('names_updated', { person1, person2 });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update names' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
    socket.to(sessionId).emit('user_joined', { userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});