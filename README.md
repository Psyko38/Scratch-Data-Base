# Cao AI Detector – Scratch Project AI Classifier

[![Node.js Tests](https://img.shields.io/badge/tests-22%20passed-brightgreen.svg)]()
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)]()
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.0.0-green.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

> A collaborative, community-driven AI detection system for Scratch projects ([scratch.mit.edu](https://scratch.mit.edu)). Pairs a modern Manifest V3 Chrome Extension with a centralized Node.js backend, transactional SQLite database, and an administrator moderation dashboard.

---

## 🌟 Key Features

### 🧩 Chrome Extension (Frontend)
- **Automatic Project Detection**: Detects Scratch project IDs from URLs like `https://scratch.mit.edu/projects/123456789/` instantly.
- **Clean Voting Popup**:
  - Two intuitive voting options: 🤖 **AI-generated** vs 👤 **Human-created**.
  - Highlights user's active choice and allows vote updating.
  - Live community distribution bar and percentage breakdown.
  - Community verdict: *AI-generated*, *Human-created*, *Undetermined*, or *Insufficient data*.
  - Clear community opinion disclaimer.
- **On-Page Injected Widget**: Non-intrusive floating pill on Scratch project pages with quick voting and collapsible card.
- **Anonymous User UUID**: Automatically generated and stored in `chrome.storage.local` on first installation. No account creation required.
- **Dark & Light Mode**: Built-in theme switch with system auto-detection.
- **Configurable Backend**: Options page to set custom backend URLs and test connectivity.

### 🌐 Public Community Explorer (Non-Admin Web Page)
- Accessible publicly at `http://localhost:3000/` and `/explore` without requiring login.
- **Read-Only Community Results**: View global metrics, most voted Scratch projects, and recent voting activity.
- **Project Inspection**: Look up any Scratch project to view verdict breakdowns and vote logs with privacy-masked voter UUIDs.
- **Open CSV Data Download**: One-click download of all votes or project statistics as CSV without admin privileges.
- Authentic Scratch theme with `#855cd6` purple navbar and `#4cbf56` / `#ec5959` indicators.

### ⚙️ Centralized Backend Server (Node.js)
- **Shared Relational Storage**: All extension installations connect to the same central database.
- **Single Vote Enforcement**: Enforces `UNIQUE(user_id, project_id)` at the database level with atomic transactions.
- **Safe Vote Updates**: Users can update their vote without inflating vote counts.
- **Rate Limiting**: IP-based rate limiting on vote submissions (120 req / 15 min) and admin login attempts (10 attempts / 15 min).
- **Ban Protection**: Instantly prevents banned users from casting votes.
- **Self-Healing Statistics**: Projects table counters are calculated transactionally from actual records, eliminating drift.

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
│   ├── server.js               # Application entry point
│   ├── src/
│   │   ├── app.js              # Express app setup and middleware
│   │   ├── config.js           # Environment and path configurations
│   │   ├── db/
│   │   │   ├── schema.sql      # SQLite relational schema
│   │   │   └── database.js    # Database engine and transaction wrapper
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT & HTTP-only cookie admin auth
│   │   │   ├── rateLimiter.js  # Sliding-window rate limiters
│   │   │   └── validate.js     # Project ID and UUID validators
│   │   ├── routes/
│   │   │   ├── health.js       # GET /api/health
│   │   │   ├── projects.js     # GET /api/projects/:projectId
│   │   │   ├── votes.js        # POST /api/votes
│   │   │   ├── users.js        # GET /api/users/:userId/votes
│   │   │   └── admin.js        # Admin auth, stats, moderation, CSV export
│   │   └── services/
│   │       └── verdict.js      # Voting formula and verdict rules
│   ├── public/admin/           # Administrator Console SPA
│   │   ├── index.html
│   │   ├── admin.css
│   │   └── admin.js
│   ├── scripts/
│   │   ├── init-db.js          # Database initialization
│   │   └── seed.js             # Seed sample Scratch projects and votes
│   └── tests/                  # Node.js native test runner test suite
│       ├── api.test.js         # REST API & moderation integration tests
│       └── verdict.test.js     # Algorithm unit tests
├── extension/                  # Chrome Manifest V3 Extension
│   ├── manifest.json
│   ├── background/
│   │   └── service-worker.js   # Background worker and tab listener
│   ├── popup/
│   │   ├── popup.html          # Clean popup UI
│   │   ├── popup.css           # Scratch-inspired styling (dark/light)
│   │   └── popup.js            # Automatic detection & voting client
│   ├── content/
│   │   ├── content.js          # On-page injected widget
│   │   └── content.css         # Scoped styles for Scratch website
│   ├── options/
│   │   ├── options.html        # Settings (backend URL, UUID, theme)
│   │   ├── options.css
│   │   └── options.js
│   └── icons/                  # 16px, 48px, 128px icons and SVG
├── docs/
│   ├── API.md                  # Complete REST API specification
│   └── ARCHITECTURE.md         # Architecture diagrams and specifications
├── .env.example                # Example environment variables
├── package.json                # Root convenience scripts
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ (v22+ or v26 recommended with built-in SQLite support)
- **Google Chrome** (or Chromium-based browser)

---

### 1. Backend Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/matteocao/Scratch-Data-Base.git
   cd Scratch-Data-Base
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp ../.env.example ../.env
   ```
   *(Default settings work out of the box with SQLite and port 3000)*.

4. **Initialize and Seed the Database**:
   ```bash
   # Initialize tables and default admin account:
   npm run db:init

   # (Optional) Seed realistic Scratch projects with sample votes:
   npm run db:seed
   ```

5. **Start the backend server**:
   ```bash
   # Production mode:
   npm start

   # Development mode with live reload:
   npm run dev
   ```
   The backend server will run at `http://localhost:3000`.

---

### 2. Chrome Extension Setup

1. Open **Google Chrome** and navigate to:
   ```text
   chrome://extensions/
   ```
2. Enable **Developer mode** in the top right corner.
3. Click the **Load unpacked** button.
4. Select the `extension/` directory from this repository:
   ```text
   /path/to/Scratch-Data-Base/extension
   ```
5. The extension **"Cao AI Detector – Scratch AI Classifier"** is now installed! Pin it to your Chrome toolbar for easy access.

---

### 3. Testing on Scratch

1. Visit any Scratch project:
   - Example 1: `https://scratch.mit.edu/projects/1012849182/` (Seeded as AI-dominated)
   - Example 2: `https://scratch.mit.edu/projects/984712391/` (Seeded as Human-dominated)
   - Example 3: Any live Scratch project!
2. Click the extension icon in the toolbar:
   - The extension automatically detects the project ID.
   - Shows existing AI vs Human vote distributions.
   - Click **🤖 AI-generated** or **👤 Human-created** to vote.
   - Notice how your vote updates the community stats in real-time.
3. Look at the bottom-right corner of the Scratch webpage:
   - Notice the floating Cao AI widget displaying the verdict directly on the page!

---

### 4. Administrator Console

1. In your browser, navigate to:
   ```text
   http://localhost:3000/admin
   ```
2. Sign in using the default administrator credentials:
   - **Username**: `admin`
   - **Password**: `AdminPass123!` *(or the password set in `.env`)*
3. Explore the dashboard:
   - View total users, projects, and AI vs Human ratio.
   - Search any Scratch project by numeric ID to inspect individual voters.
   - Remove fraudulent votes or ban abusive users.
   - Export vote or project data to CSV (`/api/admin/export/csv`).

---

## 🧪 Automated Testing

The project includes unit and integration tests covering API endpoints, duplicate vote prevention, vote updating, ban enforcement, admin authentication, and verdict calculations:

```bash
# Run tests from root:
npm test

# Or run tests directly inside backend:
cd backend && npm test
```

Expected output:
```text
✔ Health Check
✔ Project Statistics (Unvoted project)
✔ POST /api/votes should create a new AI vote
✔ POST /api/votes with same vote should return unchanged and not increment total
✔ POST /api/votes changing vote to "human" should update vote and adjust stats accurately
✔ Multiple distinct users voting reaches threshold and determines verdict
✔ POST /api/admin/login should succeed with valid credentials and return token & cookie
✔ POST /api/admin/users/:userId/ban should ban user and reject future votes
✔ DELETE /api/admin/votes/:voteId should delete fraudulent vote and recalculate
✔ GET /api/admin/export/csv should export CSV data
✔ POST /api/admin/projects/:projectId/reset should reset project statistics to zero
✔ Verdict Algorithm Tests (Insufficient data, AI-generated, Human-created, Undetermined)
ℹ tests 22 passed (0 failed)
```

---

## 🔒 Security Best Practices

- **Zero Passwords in Extension**: The Chrome extension contains zero admin passwords or secrets.
- **Admin Password Hashing**: Passwords stored using salted bcrypt.
- **HTTP-Only Cookies**: Protected against XSS token extraction.
- **Database Unique Constraints**: `UNIQUE(user_id, project_id)` guarantees one vote per user per project.
- **Input Sanitization**: Numeric Scratch ID regex and UUID v4 validation prevent injection attacks.
- **Rate Limiting**: Vote flooding and brute force login attempts are automatically throttled.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
