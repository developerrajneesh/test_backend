# Backend (`test_backend`)

Node.js + Express API for the assessment app.

Integrations:

- **MySQL**: stores `users`, `elevenlabs_agents`, `elevenlabs_conversations`
- **Supabase**: stores `activity_logs` (optional)
- **ElevenLabs**: fetches agents + conversations (requires API key)

---

## Project setup instructions

### Option A: Run as a standalone repository

```bash
git clone https://github.com/developerrajneesh/test_backend.git
cd test_backend
npm install
npm run dev
```

> Note: The `.env` file is already included in the `test_backend` repository.

### Option B: Run from the monorepo

```bash
cd test_backend
npm install
npm run dev
```

Default URL: `http://localhost:3001` (configurable via `PORT`)

---

## Environment variable configuration

Backend reads env vars via `dotenv` (`.env`).

### Backend Server
- `PORT=3001`
### MySQL (required)


- `MYSQL_HOST`
- `MYSQL_PORT` 
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

### ElevenLabs (required for ElevenLabs endpoints)

- `ELEVENLABS_API_KEY`

### Supabase (optional; enables `/api/logs` + activity logging)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Database setup

### MySQL schema

Apply `schema.sql` to your MySQL database:

- File: `schema.sql`
- Creates:
  - `users`
  - `elevenlabs_agents`
  - `elevenlabs_conversations`

### Supabase schema (activity logs)

If you want `/api/logs` and activity logging, run `supabase.sql` in the Supabase SQL editor:

- File: `supabase.sql`
- Creates:
  - `public.activity_logs`

---

## API documentation

Base URL (local): `http://localhost:3001`

### Health / meta

- **GET** `/`
- **GET** `/health`

### Users (MySQL)

Mounted at: `/api/users`

- **GET** `/api/users`
  - Query params: `page`, `limit`, `search`, `role`, `status`
- **POST** `/api/users`
  - Body: `name`, `email`, optional `role`, optional `status`
- **PUT** `/api/users/:id`
  - Body: any of `name`, `email`, `role`, `status` (at least one required)
- **DELETE** `/api/users/:id`
  - Soft delete

### ElevenLabs sync (MySQL + ElevenLabs API)

Mounted at: `/api/elevenlabs`

- **GET** `/api/elevenlabs/agents`
  - Optional: `sync=true` to force remote fetch + upsert
- **GET** `/api/elevenlabs/conversations`
  - Query params: `page`, `limit`, optional `agentId`
  - Fetches from ElevenLabs, upserts to MySQL, then returns paginated MySQL rows

### Activity logs (Supabase)

Mounted at: `/api/logs`

- **POST** `/api/logs`
  - Body: `action` (required), `description` (optional)
  - Requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

---

## Supabase usage explanation (backend)

The backend uses a **Supabase admin client** (service-role key) to insert rows into `public.activity_logs`.

If Supabase env vars are not set:

- `/api/logs` will return an error
- background activity logging is skipped

---

## ElevenLabs integration overview (backend)

The backend calls the ElevenLabs REST API using `ELEVENLABS_API_KEY` to fetch:

- Agents
- Conversations

Then it upserts the results into MySQL:

- `elevenlabs_agents`
- `elevenlabs_conversations`

