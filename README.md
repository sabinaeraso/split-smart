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

---

### Option 2: Deploy to Render (Also Free)

1. **Create a Render account** 
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Push code to GitHub** (same as Railway)

3. **Create a Web Service**
   - Go to [dashboard.render.com](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Build command: (leave blank, auto-detected)
   - Start command: `npm start`
   - Click "Create Web Service"

4. **Get your live URL**
   - Once deployed, you'll get a `*.onrender.com` URL
   - Share it with your roommate

---

### Option 3: Deploy to Heroku (Free tier ended, but still cheapest paid option)

If you prefer Heroku, follow their guide, but know the free tier is no longer available. Railway or Render are better free options now.

---

## How It Works

### Architecture

```
Frontend (HTML/JS)
    ↓
Socket.io (real-time sync)
    ↓
Express Server
    ↓
SQLite Database
```

### Session Flow

1. **Person A** opens the app → clicks "Start new" → gets Session ID `abc123`
2. **Person A** copies the invite link or manually shares `abc123` with Person B
3. **Person B** enters `abc123` → joined!
4. **Person A** adds "Groceries, $50, A paid, 50/50"
   - Sent to server
   - Stored in database
   - Broadcast via Socket.io to Person B
   - Person B's browser updates instantly (no refresh needed)
5. Both can see live settlement: "B owes A $25"

### Data Persistence

- SQLite stores all sessions and expenses
- Survives server restarts
- If deployed, data lives on the server (doesn't disappear on redeploy)

---

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

---

## Troubleshooting

### "Can't connect to server"
- Check server is running (`npm start`)
- Check URL is correct (`http://localhost:3000`)
- Try restarting the server

### "Session not found"
- Make sure Session ID is typed exactly
- Session IDs are 9 random characters
- If deploying, wait 30 seconds for changes to propagate

### "Changes aren't syncing"
- Check your internet connection
- Refresh the page once
- Check browser console for errors (F12)

### "Database error"
- Delete `expenses.db` file, it will be recreated
- Restart the server

---

## Customization

### Change port
In `server.js`, line with `const PORT = process.env.PORT || 3000;`
```javascript
const PORT = process.env.PORT || 8000; // Use port 8000 instead
```

### Styling
Edit `public/index.html` → `<style>` section

### Add custom split percentages
In `public/index.html`, add more split buttons:
```html
<button type="button" class="split-btn" data-split="p1">Person 1 pays all</button>
<button type="button" class="split-btn" data-split="custom">Custom (70/30)</button>
```

---

## Future Enhancements

- [ ] User login / account system
- [ ] Multiple groups per person
- [ ] Expense categories & filtering
- [ ] Mobile app version
- [ ] Settlement suggestions (simplify transactions)
- [ ] Email notifications

---

## License

MIT

## Questions?

If something doesn't work, check:
1. Node.js is installed (`node --version` should show v14+)
2. Dependencies installed (`ls node_modules/`)
3. Server is running (terminal shows "Server running on...")
4. Both people are on the same session ID
5. Try clearing browser cache and refreshing
