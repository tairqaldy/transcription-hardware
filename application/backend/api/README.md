# FeedPulse Backend (TypeScript)

TypeScript API service that implements the manual's summarization flow and aligns with the frontend's `/api/summarize` contract.

## Setup

```bash
cd application/backend/api
npm install
```

Create a `.env` file based on `.env.example` and fill in your keys.

## Run

```bash
npm run dev
```

## API

### POST /api/summarize

Request body:

```json
{
  "note_ids": ["uuid-1", "uuid-2"],
  "summary_type": "custom",
  "user_id": "user-uuid"
}
```

Headers:

```
Authorization: Bearer <supabase-access-token>
Content-Type: application/json
```

Response:

```json
{
  "summary_id": "uuid",
  "message": "Summary created successfully"
}
```

## Frontend alignment

- The frontend guide uses `/api/summarize`. In local dev, either add a Vite proxy to `http://localhost:3001` or call the full URL from the frontend.
- The backend validates the bearer token with Supabase and verifies note ownership before summarizing.
