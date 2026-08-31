# Expense Splitter

A shared expense tracker for roommates or friends. One person creates a session, shares the link, and both can add expenses in real-time that sync automatically.

## Features

- **Real-time sync** — Changes appear instantly on both devices via WebSocket
- **Session-based** — Each pair of people gets their own session
- **Flexible splits** — 50/50, one person pays all, or custom
- **Live settlement** — Always shows who owes whom and how much
- **Persistent** — Data is stored in the database, survives refreshes
- **Export** — Download expenses as JSON anytime

## Quick Start (Local)

### Prerequisites
- Node.js 14+ ([download here](https://nodejs.org/))
- npm (comes with Node.js)

### Setup

1. **Clone or download this project**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

   Server runs on `http://localhost:3000`

4. **Open in two browser windows**
   - Both on `http://localhost:3000`
   - First person creates a session
   - Copy the session ID or link
   - Second person enters the session ID or uses the link

Done! Both can now add expenses and see them sync instantly.

## Development Mode

To auto-reload on code changes:
```bash
npm run dev
```

(Requires `nodemon` installed from `package.json`)

---

## Deploy to the Web (Free)

### Option 1: Deploy to Railway (Recommended, Easiest)

1. **Create a Railway account** (free tier available)
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/expense-splitter.git
   git push -u origin main
   ```

3. **Deploy to Railway**
   - Go to [railway.app/new](https://railway.app/new)
   - Select "Deploy from GitHub repo"
   - Choose your `expense-splitter` repo
   - Railway auto-detects Node.js and deploys
   - Get your live URL in the "Deployments" tab

4. **Share the URL with your roommate**
   - They visit your live URL
   - Create or join a session
   - Real-time sync works across the world!



## How It Works

### Architecture

```
Frontend (HTML/JS)
    ↓
Socket.io (real-time sync)
    ↓
Express Server
    ↓
JSON Data store
```

## File Structure

```
.
├── server.js              # Express + Socket.io server
├── package.json           # Dependencies
├── public/
│   └── index.html         # Frontend (HTML/CSS/JS)
├── expenses.db            # SQLite database (auto-created)
└── README.md              # This file
```

## Future Enhancements

- [ ] User login / account system
- [ ] Multiple groups per person
- [ ] Expense categories & filtering
- [ ] Mobile app version
- [ ] Settlement suggestions (simplify transactions)
- [ ] Email notifications
