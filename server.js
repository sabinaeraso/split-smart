const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
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
const Database = require('better-sqlite3');
const db = new Database(dbPath);

function initializeDatabase() {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      person1 TEXT NOT NULL,
      person2 TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
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

// Store active connections
const activeSessions = {};

// REST API Endpoints
app.post('/api/session/create', (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 11);
  const { person1, person2 } = req.body;

  db.run(
    'INSERT INTO sessions (id, person1, person2) VALUES (?, ?, ?)',
    [sessionId, person1, person2],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ sessionId });
    }
  );
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  db.get(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      db.all(
        'SELECT * FROM expenses WHERE session_id = ? ORDER BY created_at DESC',
        [sessionId],
        (err, expenses) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to fetch expenses' });
          }

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
        }
      );
    }
  );
});

app.post('/api/session/:sessionId/expense', (req, res) => {
  const { sessionId } = req.params;
  const { id, amount, description, payer, split, date } = req.body;

  db.run(
    'INSERT INTO expenses (session_id, expense_id, amount, description, payer, split, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [sessionId, id, amount, description, payer, split, date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add expense' });
      }

      // Broadcast to all connected clients in this session
      io.to(sessionId).emit('expense_added', {
        id,
        amount,
        description,
        payer,
        split,
        date
      });

      res.json({ success: true });
    }
  );
});

app.delete('/api/session/:sessionId/expense/:expenseId', (req, res) => {
  const { sessionId, expenseId } = req.params;

  db.run(
    'DELETE FROM expenses WHERE session_id = ? AND expense_id = ?',
    [sessionId, expenseId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete expense' });
      }

      // Broadcast deletion to all connected clients
      io.to(sessionId).emit('expense_deleted', { id: expenseId });

      res.json({ success: true });
    }
  );
});

app.delete('/api/session/:sessionId/expenses', (req, res) => {
  const { sessionId } = req.params;

  db.run(
    'DELETE FROM expenses WHERE session_id = ?',
    [sessionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to clear expenses' });
      }

      io.to(sessionId).emit('expenses_cleared');

      res.json({ success: true });
    }
  );
});

app.put('/api/session/:sessionId/names', (req, res) => {
  const { sessionId } = req.params;
  const { person1, person2 } = req.body;

  db.run(
    'UPDATE sessions SET person1 = ?, person2 = ? WHERE id = ?',
    [person1, person2, sessionId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update names' });
      }

      io.to(sessionId).emit('names_updated', { person1, person2 });

      res.json({ success: true });
    }
  );
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`User ${socket.id} joined session ${sessionId}`);
    
    // Notify others that someone joined
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
  console.log(`Or access remotely at: ${process.env.APP_URL || 'your-app-url.com'}`);
});
