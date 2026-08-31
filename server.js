const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
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

const dataPath = path.join(__dirname, 'data.json');

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
  return { sessions: {} };
}

function saveData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

app.post('/api/session/create', (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 11);
  const { person1, person2 } = req.body;
  const data = loadData();

  data.sessions[sessionId] = {
    id: sessionId,
    person1,
    person2,
    expenses: [],
    created_at: new Date().toISOString()
  };

  saveData(data);
  res.json({ sessionId });
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const data = loadData();

  if (!data.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const session = data.sessions[sessionId];
  res.json({
    session: {
      id: session.id,
      person1: session.person1,
      person2: session.person2
    },
    expenses: session.expenses
  });
});

app.post('/api/session/:sessionId/expense', (req, res) => {
  const { sessionId } = req.params;
  const { id, amount, description, payer, split, date } = req.body;
  const data = loadData();

  if (!data.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  data.sessions[sessionId].expenses.push({
    id,
    amount,
    description,
    payer,
    split,
    date
  });

  saveData(data);

  io.to(sessionId).emit('expense_added', {
    id,
    amount,
    description,
    payer,
    split,
    date
  });

  res.json({ success: true });
});

app.delete('/api/session/:sessionId/expense/:expenseId', (req, res) => {
  const { sessionId, expenseId } = req.params;
  const data = loadData();

  if (!data.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  data.sessions[sessionId].expenses = data.sessions[sessionId].expenses.filter(e => e.id !== expenseId);
  saveData(data);

  io.to(sessionId).emit('expense_deleted', { id: expenseId });
  res.json({ success: true });
});

app.delete('/api/session/:sessionId/expenses', (req, res) => {
  const { sessionId } = req.params;
  const data = loadData();

  if (!data.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  data.sessions[sessionId].expenses = [];
  saveData(data);

  io.to(sessionId).emit('expenses_cleared');
  res.json({ success: true });
});

app.put('/api/session/:sessionId/names', (req, res) => {
  const { sessionId } = req.params;
  const { person1, person2 } = req.body;
  const data = loadData();

  if (!data.sessions[sessionId]) {
    return res.status(404).json({ error: 'Session not found' });
  }

  data.sessions[sessionId].person1 = person1;
  data.sessions[sessionId].person2 = person2;
  saveData(data);

  io.to(sessionId).emit('names_updated', { person1, person2 });
  res.json({ success: true });
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