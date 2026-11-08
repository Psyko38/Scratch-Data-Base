# Cao AI Detector – REST API Documentation

The Cao AI Detector centralized backend exposes a REST API used by the Chrome Extension and the Web Administrator Console.

Base URL (default development): `http://localhost:3000`

---

## 1. Public Endpoints (Chrome Extension & Web Clients)

### 1.1 Health Check
Inspects server operational status, database connectivity, uptime, and high-level record counts.

- **Method**: `GET`
- **Path**: `/api/health`
- **Auth**: None
- **Rate Limit**: 300 req/min

#### Response `200 OK`
```json
{
  "status": "healthy",
  "database": "ok",
  "uptimeSeconds": 142,
  "timestamp": "2026-11-08T10:00:00.000Z",
  "counts": {
    "users": 166,
    "projects": 5,
    "votes": 166
  }
}
```

---

### 1.2 Public Community Overview Statistics
Retrieves global metrics, top voted projects, and the recent community voting stream. Voter UUIDs are masked for privacy.

- **Method**: `GET`
- **Path**: `/api/stats`
- **Auth**: None (Public Read-Only)

---

### 1.3 Public Project Vote History
Inspects a project's detailed community statistics and voting history (read-only, masked voter IDs).

- **Method**: `GET`
- **Path**: `/api/projects/:projectId/history/public`
- **Params**:
  - `projectId` *(string, required)*: Numeric Scratch project ID.
- **Auth**: None

---

### 1.4 Public CSV Export
Downloads community vote records or project statistics as a CSV file.

- **Method**: `GET`
- **Path**: `/api/export/csv?type=votes` or `?type=projects`
- **Auth**: None (Public)

---

### 1.5 Get Project Voting Statistics
Retrieves community voting statistics, percentages, and verdict for a specific Scratch project ID.

- **Method**: `GET`
- **Path**: `/api/projects/:projectId`
- **Params**:
  - `projectId` *(string, required)*: Numeric Scratch project ID (e.g. `1012849182`).
- **Query Parameters**:
  - `userId` *(string, optional)*: UUID v4 of the requesting user. If provided, the response includes `userVote` ('ai' | 'human' | null) and `userVotedAt`.
- **Auth**: None
- **Rate Limit**: 300 req/min

#### Example Request
```http
GET /api/projects/1012849182?userId=550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: localhost:3000
```

#### Response `200 OK` (Project with votes)
```json
{
  "projectId": "1012849182",
  "scratchUrl": "https://scratch.mit.edu/projects/1012849182/",
  "totalVotes": 48,
  "aiVotes": 42,
  "humanVotes": 6,
  "aiPercentage": 87.5,
  "humanPercentage": 12.5,
  "verdict": "AI-generated",
  "isReliable": true,
  "minVotesRequired": 5,
  "disclaimer": "Community verdict based on human votes, not a technically verified AI detection result.",
  "createdAt": "2026-11-08T09:58:31.879Z",
  "updatedAt": "2026-11-08T09:58:31.879Z",
  "userVote": "ai",
  "userVotedAt": "2026-11-08T09:58:31.879Z"
}
```

#### Response `200 OK` (Project not yet voted on)
```json
{
  "projectId": "99999999",
  "scratchUrl": "https://scratch.mit.edu/projects/99999999/",
  "totalVotes": 0,
  "aiVotes": 0,
  "humanVotes": 0,
  "aiPercentage": 0,
  "humanPercentage": 0,
  "verdict": "Insufficient data",
  "isReliable": false,
  "minVotesRequired": 5,
  "disclaimer": "Community verdict based on human votes, not a technically verified AI detection result.",
  "createdAt": null,
  "updatedAt": null,
  "userVote": null,
  "userVotedAt": null
}
```

#### Response `400 Bad Request`
```json
{
  "error": "Invalid project ID. Scratch project IDs must be numeric digits."
}
```

---

### 1.3 Submit or Update Vote
Submits an anonymous vote or updates an existing vote for a project. Enforces one vote per user per project using atomic database transactions.

- **Method**: `POST`
- **Path**: `/api/votes`
- **Auth**: None (identified by client UUID)
- **Rate Limit**: 120 req/15 min

#### Request Body
```json
{
  "projectId": "1012849182",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "vote": "ai"
}
```

| Field | Type | Description |
|---|---|---|
| `projectId` | string | Numeric Scratch project ID |
| `userId` | string | UUID v4 generated on extension install |
| `vote` | string | Either `"ai"` or `"human"` |

#### Response `201 Created` (First vote on project)
```json
{
  "success": true,
  "status": "created",
  "userVote": "ai",
  "project": {
    "projectId": "1012849182",
    "scratchUrl": "https://scratch.mit.edu/projects/1012849182/",
    "totalVotes": 1,
    "aiVotes": 1,
    "humanVotes": 0,
    "aiPercentage": 100,
    "humanPercentage": 0,
    "verdict": "Insufficient data",
    "isReliable": false,
    "minVotesRequired": 5,
    "disclaimer": "Community verdict based on human votes, not a technically verified AI detection result.",
    "userVote": "ai"
  }
}
```

#### Response `200 OK` (Vote Changed / Updated)
```json
{
  "success": true,
  "status": "updated",
  "userVote": "human",
  "project": { ... }
}
```

#### Response `200 OK` (Duplicate Vote - Unchanged)
```json
{
  "success": true,
  "status": "unchanged",
  "userVote": "human",
  "project": { ... }
}
```

#### Error Responses
- `400 Bad Request`: Invalid parameters (e.g., non-numeric projectId, malformed UUID, or vote other than 'ai'/'human').
- `403 Forbidden`: `{"error": "Forbidden: This user is banned from submitting votes."}`

---

### 1.4 Get User Voting History
Retrieves all projects voted on by a given user UUID.

- **Method**: `GET`
- **Path**: `/api/users/:userId/votes`
- **Params**:
  - `userId` *(string, required)*: UUID v4 format.
- **Auth**: None

#### Response `200 OK`
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "isBanned": false,
  "totalVotes": 2,
  "votes": [
    {
      "projectId": "1012849182",
      "scratchUrl": "https://scratch.mit.edu/projects/1012849182/",
      "vote": "ai",
      "createdAt": "2026-11-08T09:58:31.879Z",
      "updatedAt": "2026-11-08T09:58:31.879Z"
    }
  ]
}
```

---

## 2. Administrator Endpoints (Console)

All admin endpoints (except `/api/admin/login`) require authentication via either:
1. HTTP-only session cookie (`cao_admin_token`)
2. `Authorization: Bearer <token>` header

---

### 2.1 Admin Login
- **Method**: `POST`
- **Path**: `/api/admin/login`
- **Rate Limit**: 10 attempts / 15 min

#### Request Body
```json
{
  "username": "admin",
  "password": "AdminPass123!"
}
```

#### Response `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "admin": {
    "id": "e2297ad2-0c9f-43b8-80f2-7634f19bca40",
    "username": "admin"
  }
}
```
*Sets `Set-Cookie: cao_admin_token=...; HttpOnly; SameSite=Lax; Max-Age=604800`*

---

### 2.2 Admin Logout
- **Method**: `POST`
- **Path**: `/api/admin/logout`

Clears the session cookie.

---

### 2.3 Dashboard Overview Statistics
- **Method**: `GET`
- **Path**: `/api/admin/stats`

#### Response `200 OK`
```json
{
  "metrics": {
    "totalUsers": 166,
    "bannedUsers": 0,
    "totalProjects": 5,
    "totalVotes": 166,
    "aiVotes": 91,
    "humanVotes": 75,
    "aiPercentage": 54.8,
    "humanPercentage": 45.2,
    "verdictCounts": {
      "AI-generated": 2,
      "Human-created": 1,
      "Undetermined": 1,
      "Insufficient data": 1
    }
  },
  "mostVotedProjects": [ ... ],
  "recentVotes": [ ... ]
}
```

---

### 2.4 Project History Inspection
- **Method**: `GET`
- **Path**: `/api/admin/projects/:projectId/history`

Returns project stats and individual voter records for moderation.

---

### 2.5 Delete Fraudulent Vote
- **Method**: `DELETE`
- **Path**: `/api/admin/votes/:voteId`

Deletes the vote record and atomically recalculates project statistics.

---

### 2.6 Ban Abusive User
- **Method**: `POST`
- **Path**: `/api/admin/users/:userId/ban`
- **Body**: `{ "deleteVotes": true }` (optional boolean to purge their past votes)

---

### 2.7 Unban User
- **Method**: `DELETE`
- **Path**: `/api/admin/users/:userId/ban`

---

### 2.8 Reset Project Voting Statistics
- **Method**: `POST`
- **Path**: `/api/admin/projects/:projectId/reset`

Deletes all votes associated with the project and resets counters to zero.

---

### 2.9 Export Database CSV
- **Method**: `GET`
- **Path**: `/api/admin/export/csv?type=votes` or `?type=projects`

Returns a downloadable CSV file (`text/csv`).
