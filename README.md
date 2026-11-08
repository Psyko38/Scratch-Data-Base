# Scratch AI – Scratch Project AI Classifier

[![Node.js Tests](https://img.shields.io/badge/tests-30%20passed-brightgreen.svg)]()
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.5.0-green.svg)]()
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

> A collaborative, community-driven AI detection system for Scratch projects ([scratch.mit.edu](https://scratch.mit.edu)). Pairs a modern Manifest V3 Browser Extension (Chrome & Firefox) with a centralized Node.js backend, transactional SQLite database, public Community Web Explorer, and an administrator moderation dashboard.

---

## 🌟 Key Features

### 🧩 Browser Extension (Chrome & Firefox)
- **Automatic Project Detection**: Detects Scratch project IDs from URLs like `https://scratch.mit.edu/projects/123456789/` instantly.
- **Clean Voting Popup**:
  - Two intuitive voting options: 🤖 **AI-generated** vs 👤 **Human-created**.
  - Highlights user's active choice and allows seamless vote updating.
  - Live community distribution bar and percentage breakdown.
  - Community verdict: *AI-generated*, *Human-created*, *Undetermined*, or *Insufficient data*.
  - Clear community opinion disclaimer.
- **On-Page Injected Widget**: Non-intrusive floating pill on Scratch project pages with quick voting and collapsible card.
- **Anonymous User UUID**: Automatically generated and stored in `chrome.storage.local` on first installation. No account creation required.
- **Dark & Light Mode**: Built-in theme switch with system auto-detection.
- **Configurable Backend**: Options page to set custom backend URLs and test connectivity.

### 🌐 Public Community Explorer (Web Page)
- Accessible publicly at `/` and `/explore` without requiring login.
- **Read-Only Community Results**: View global metrics, most voted Scratch projects, and recent voting activity.
- **Project Inspection**: Look up any Scratch project to view verdict breakdowns and vote logs with privacy-masked voter UUIDs.
- **Open CSV Data Download**: One-click download of all votes or project statistics as CSV without admin privileges.
- **Direct Extension Download**: Download ready-to-use Chrome (`.zip`) and Firefox packages pre-configured with the server's endpoint.
- Authentic Scratch theme with `#855cd6` purple navbar and `#4cbf56` / `#ec5959` indicators.

### ⚙️ Centralized Backend Server (Node.js)
- **Shared Relational Storage**: All extension installations connect to the same central database.
- **Single Vote Enforcement**: Enforces `UNIQUE(user_id, project_id)` at the database level with atomic transactions.
- **Safe Vote Updates**: Users can update their vote without inflating vote counts.
- **Rate Limiting**: IP-based rate limiting on vote submissions (120 req / 15 min) and admin login attempts (10 attempts / 15 min).
- **Ban Protection**: Instantly prevents banned users from casting votes.
- **Self-Healing Statistics**: Projects table counters are calculated transactionally from actual records, eliminating drift.
- **Graceful Shutdown**: Intercepts `SIGINT`/`SIGTERM` to cleanly flush WAL writes and close database connections.

### 🛡️ Administrator Dashboard
- **Web-Based Console** at `/admin`.
- **Secure Authentication**: Salted bcrypt password hashing with HTTP-only session cookies and Bearer token fallback.
- **Live Metrics**: Total users, banned users, indexed projects, total votes, and global AI vs Human distribution.
- **Scratch Project Lookup**: Search projects by numeric ID to view full voting history.
- **Moderation Tools**:
  - Delete fraudulent votes (with automatic project stats recalculation).
  - Ban / unban abusive user UUIDs (with optional vote purge).
  - Reset project statistics to zero.
  - Export votes and project statistics as CSV.

---

## 📐 Voting Algorithm

$$\text{AI percentage} = \left(\frac{\text{AI votes}}{\text{Total votes}}\right) \times 100$$
$$\text{Human percentage} = \left(\frac{\text{Human votes}}{\text{Total votes}}\right) \times 100$$

- **Insufficient data**: Fewer than 5 votes.
- **AI-generated**: At least 5 votes, and AI percentage $> 50\%$.
- **Human-created**: At least 5 votes, and AI percentage $< 50\%$.
- **Undetermined**: At least 5 votes, and AI percentage $= 50\%$.

> **Important**: This is a community opinion, NOT a technically verified AI detection result.

---

## 📁 Repository Structure

```
Scratch-Data-Base/
├── backend/
│   ├── server.js               # Application entry point with graceful shutdown
│   ├── src/
│   │   ├── app.js              # Express app setup, rate-limiting & middleware
│   │   ├── config.js           # Environment and path configurations
│   │   ├── db/
│   │   │   ├── schema.sql      # SQLite relational schema
│   │   │   └── database.js     # SQLite sync engine with WAL mode & transactions
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT & HTTP-only cookie admin auth
│   │   │   ├── rateLimiter.js  # Sliding-window rate limiters
│   │   │   └── validate.js     # Project ID and UUID validators
│   │   ├── routes/
│   │   │   ├── health.js       # GET /api/health
│   │   │   ├── projects.js     # GET /api/projects/:projectId & /batch
│   │   │   ├── votes.js        # POST /api/votes
│   │   │   ├── users.js        # GET /api/users/:userId/votes
│   │   │   ├── publicStats.js  # GET /api/stats, /api/export/csv, /api/extension/download
│   │   │   └── admin.js        # Admin auth, moderation, and management
│   │   ├── services/
│   │   │   └── verdict.js      # Voting formula and verdict rules
│   │   └── utils/
│   │       └── zipBuilder.js   # Extension package generator
│   ├── public/
│   │   ├── admin/              # Administrator Console
│   │   └── explorer/           # Public Community Web Explorer
│   ├── scripts/
│   │   ├── init-db.js          # Database initialization
│   │   └── seed.js             # Optional test data seeder
│   └── tests/
│       ├── api.test.js         # REST API & integration tests (30 tests)
│       └── verdict.test.js     # Verdict unit tests
├── data/                       # Production SQLite data directory (.gitkeep)
├── Dockerfile                  # Production container image (Node 22 Alpine)
├── docker-compose.yml          # Production stack configuration
├── extension/                  # Manifest V3 Extension (Chrome & Firefox)
├── docs/                       # Architecture & API documentation
├── .env.example                # Example environment variables
├── package.json                # Root package & scripts
└── README.md
```

---

## 🚢 Production Deployment

### Option 1: Docker & Docker Compose (Recommended)

1. **Clone the repository on your server**:
   ```bash
   git clone https://github.com/matteocao/Scratch-Data-Base.git
   cd Scratch-Data-Base
   ```

2. **Create your `.env` configuration file**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Make sure to change `JWT_SECRET` (generate using `openssl rand -hex 32`) and set a strong `ADMIN_PASSWORD`.*

3. **Start the service in detached mode**:
   ```bash
   docker compose up -d --build
   ```

4. **Verify container health**:
   ```bash
   docker compose ps
   curl http://localhost:3000/api/health
   ```
   The database is stored under `./data/` on the host machine and is persisted across restarts and container updates.

---

### Option 2: Direct Node.js / PM2

> **Requirement**: Node.js **>= 22.5.0** (required for native `node:sqlite`).

1. **Install dependencies**:
   ```bash
   cd backend
   npm install --omit=dev
   ```

2. **Configure environment**:
   ```bash
   cp ../.env.example ../.env
   nano ../.env
   ```

3. **Initialize the database (creates tables & initial admin account)**:
   ```bash
   npm run db:init
   ```

4. **Run with PM2**:
   ```bash
   pm2 start server.js --name "scratch-ai-backend"
   pm2 save
   pm2 startup
   ```

---

## 🛠️ Development & Local Testing

1. **Install dependencies**:
   ```bash
   cd backend && npm install
   ```

2. **Run tests**:
   ```bash
   npm test
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Install Browser Extension locally**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode**.
   - Click **Load unpacked** and select the `extension/` directory.

---

## 🔒 Security Best Practices

- **Zero Passwords in Extension**: The browser extension contains zero admin passwords or secrets.
- **Admin Password Hashing**: Passwords stored using salted bcrypt (`10` salt rounds).
- **HTTP-Only Cookies**: Protected against XSS token extraction with Bearer header fallback.
- **Database Unique Constraints**: `UNIQUE(user_id, project_id)` guarantees one vote per user per project.
- **Input Sanitization**: Numeric Scratch ID regex and UUID v4 validation prevent injection attacks.
- **Reverse Proxy Ready**: `app.set('trust proxy', 1)` enabled in production for accurate rate limiting behind Nginx/Caddy/Cloudflare.

---

## 📄 License

This project is licensed under the MIT License.
