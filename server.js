const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Client } = require('pg');
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

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect().catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});

async function initializeDatabase() {
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        person1 TEXT NOT NULL,
        person2 TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        expense_id TEXT NOT NULL,
        amount DECIMAL NOT NULL,
        description TEXT NOT NULL,
        payer TEXT NOT NULL,
        split TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      )
    `);

    console.log('Database tables initialized');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

initializeDatabase();

app.post('/api/session/create', async (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 11);
  const { person1, person2 } = req.body;

  try {
    await client.query('INSERT INTO sessions (id, person1, person2) VALUES ($1, $2, $3)', [sessionId, person1, person2]);
    res.json({ sessionId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

app.get('/api/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const sessionResult = await client.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const expensesResult = await client.query('SELECT * FROM expenses WHERE session_id = $1 ORDER BY created_at DESC', [sessionId]);

    res.json({
      session: {
        id: sessionResult.rows[0].id,
        person1: sessionResult.rows[0].person1,
        person2: sessionResult.rows[0].person2
      },
      expenses: expensesResult.rows.map(exp => ({
        id: exp.expense_id,
        amount: parseFloat(exp.amount),
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

app.post('/api/session/:sessionId/expense', async (req, res) => {
  const { sessionId } = req.params;
  const { id, amount, description, payer, split, date } = req.body;

  try {
    await client.query('INSERT INTO expenses (session_id, expense_id, amount, description, payer, split, date) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
      [sessionId, id, amount, description, payer, split, date]);

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

app.delete('/api/session/:sessionId/expense/:expenseId', async (req, res) => {
  const { sessionId, expenseId } = req.params;

  try {
    await client.query('DELETE FROM expenses WHERE session_id = $1 AND expense_id = $2', [sessionId, expenseId]);

    io.to(sessionId).emit('expense_deleted', { id: expenseId });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

app.delete('/api/session/:sessionId/expenses', async (req, res) => {
  const { sessionId } = req.params;

  try {
    await client.query('DELETE FROM expenses WHERE session_id = $1', [sessionId]);

    io.to(sessionId).emit('expenses_cleared');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear expenses' });
  }
});

app.put('/api/session/:sessionId/names', async (req, res) => {
  const { sessionId } = req.params;
  const { person1, person2 } = req.body;

  try {
    await client.query('UPDATE sessions SET person1 = $1, person2 = $2 WHERE id = $3', [person1, person2, sessionId]);

    io.to(sessionId).emit('names_updated', { person1, person2 });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update names' });
  }
});

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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});