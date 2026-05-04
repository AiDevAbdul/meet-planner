# MeetPlanner — System Architecture

## Overview

```
┌─────────────────────────────────────────────────────┐
│                   NEXT.JS APP                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │Dashboard │  │Task Board│  │ Messaging (RT)      │ │
│  │Meeting   │  │Kanban    │  │ Channels/DMs        │ │
│  │Notes     │  │Timeline  │  │                     │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│         │              │               │             │
│  ┌──────────────────────────────────────────────┐   │
│  │            Next.js API Routes                │   │
│  │  /api/meetings  /api/tasks  /api/messages    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │              │               │
   ┌──────▼──┐    ┌──────▼──┐    ┌──────▼──────┐
   │  Claude  │    │  Neon   │    │  Supabase   │
   │  API     │    │Postgres │    │  Realtime   │
   │ (AI)     │    │  (DB)   │    │ (Messages)  │
   └──────────┘    └─────────┘    └─────────────┘
          │
   ┌──────▼──────────────────┐
   │  Gmail API (push watch) │
   │  Google Meet Transcripts│
   └─────────────────────────┘
```

---

## Data Flow: Meeting → Tasks

```
Gmail receives meeting notes
         │
         ▼
Gmail API push notification → /api/webhooks/gmail
         │
         ▼
Fetch email body / attachment
         │
         ▼
Claude API: structured extraction
  Input:  raw meeting text
  Output: {
    title, summary, date,
    tasks: [{ title, assignee_name, priority, due_date, description }],
    decisions: [],
    attendees: []
  }
         │
         ▼
Triage Queue (manager review — approve/edit/reject per task)
         │
         ▼
Insert to DB → notify assignees
```

## Data Flow: Chat → Ideas → Tasks

```
Team member sends message in channel
         │
         ▼
Message stored in Supabase (real-time broadcast to channel members)
         │
         ▼ (when message flagged with /idea or 📌 reaction)
Claude API: idea → draft task extraction
  Input:  flagged message thread
  Output: draft task (title, priority, owner suggestion, notes)
         │
         ▼
Manager receives draft in Triage Queue → approve/edit/reject
         │
         ▼
Task created → assignee notified
```

---

## Database Schema (Neon Postgres)

### users
```sql
id            UUID PRIMARY KEY
name          TEXT NOT NULL
email         TEXT UNIQUE NOT NULL
role          ENUM('admin', 'manager', 'member', 'viewer')
department_id UUID REFERENCES departments(id)
avatar_url    TEXT
google_id     TEXT UNIQUE
created_at    TIMESTAMPTZ DEFAULT now()
```

### departments
```sql
id         UUID PRIMARY KEY
name       TEXT NOT NULL
slug       TEXT UNIQUE NOT NULL
color      TEXT        -- hex, for channel theming
created_at TIMESTAMPTZ DEFAULT now()
```

### meetings
```sql
id           UUID PRIMARY KEY
title        TEXT NOT NULL
source       ENUM('gmail', 'manual', 'google_meet')
raw_content  TEXT        -- original transcript/notes
summary      TEXT        -- AI-generated summary
decisions    JSONB       -- array of decision strings
attendees    JSONB       -- array of {name, email}
date         DATE
created_by   UUID REFERENCES users(id)
created_at   TIMESTAMPTZ DEFAULT now()
```

### tasks
```sql
id           UUID PRIMARY KEY
title        TEXT NOT NULL
description  TEXT
priority     ENUM('critical', 'high', 'normal', 'low') DEFAULT 'normal'
status       ENUM('triage', 'todo', 'in_progress', 'review', 'done') DEFAULT 'triage'
assignee_id  UUID REFERENCES users(id)
created_by   UUID REFERENCES users(id)
meeting_id   UUID REFERENCES meetings(id)    -- NULL if from chat
department_id UUID REFERENCES departments(id)
due_date     DATE
position     INTEGER   -- for kanban ordering
created_at   TIMESTAMPTZ DEFAULT now()
updated_at   TIMESTAMPTZ DEFAULT now()
```

### channels
```sql
id            UUID PRIMARY KEY
name          TEXT NOT NULL
slug          TEXT UNIQUE NOT NULL
department_id UUID REFERENCES departments(id)  -- NULL = cross-dept
type          ENUM('public', 'private', 'direct')
created_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT now()
```

### channel_members
```sql
channel_id UUID REFERENCES channels(id)
user_id    UUID REFERENCES users(id)
role       ENUM('owner', 'member') DEFAULT 'member'
joined_at  TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (channel_id, user_id)
```

### messages
```sql
id         UUID PRIMARY KEY
channel_id UUID REFERENCES channels(id)
user_id    UUID REFERENCES users(id)
content    TEXT NOT NULL
reply_to   UUID REFERENCES messages(id)   -- NULL = top-level
flagged    BOOLEAN DEFAULT false           -- flagged as idea
created_at TIMESTAMPTZ DEFAULT now()
edited_at  TIMESTAMPTZ
```

### notifications
```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
type       ENUM('task_assigned','task_due','mention','idea_approved')
payload    JSONB    -- { task_id, message_id, etc. }
read       BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

---

## API Routes

### Meeting Ingestion
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/gmail` | Gmail push notification receiver |
| POST | `/api/meetings` | Manual meeting note submission |
| GET | `/api/meetings` | List meetings (paginated) |
| GET | `/api/meetings/:id` | Single meeting with extracted tasks |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | List tasks (filters: status, assignee, priority) |
| POST | `/api/tasks` | Create task manually |
| PATCH | `/api/tasks/:id` | Update task (status, assignee, etc.) |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/approve` | Approve from triage queue |

### Messaging
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/channels` | List channels user belongs to |
| POST | `/api/channels` | Create channel |
| GET | `/api/channels/:id/messages` | Paginated message history |
| POST | `/api/channels/:id/messages` | Send message |
| PATCH | `/api/messages/:id/flag` | Flag message as idea |

### People
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | List team members |
| GET | `/api/users/:id` | User profile + task summary |
| GET | `/api/departments` | List departments |

---

## Authentication Flow

1. User visits app → redirected to Google OAuth
2. Server validates with Google Workspace (domain restriction)
3. Session created (NextAuth.js) → user record upserted in DB
4. Access token stored server-side for Gmail API calls (with user consent)

**Domain restriction**: Only `@duckercreative.com` emails (configurable via env `ALLOWED_EMAIL_DOMAIN`)

---

## AI Integration (Claude API)

### Meeting Extraction Prompt Strategy
- System prompt defines output JSON schema strictly
- Include team roster (names + roles) so Claude can match assignees
- Temperature: 0 (deterministic output)
- Model: `claude-sonnet-4-6` (balance of speed + quality)
- Enable prompt caching on system prompt (roster rarely changes)

### Idea Extraction from Chat
- Only triggered on flagged messages (user-initiated, not automatic)
- Context window: flagged message + 10 messages of thread context
- Output: single draft task — not multi-task (prevents hallucination)

---

## Environment Variables

```bash
# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=          # for Gmail API server-side calls
ALLOWED_EMAIL_DOMAIN=duckercreative.com

# AI
ANTHROPIC_API_KEY=

# Database
DATABASE_URL=                  # Neon Postgres connection string

# Real-time
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Gmail webhook
GMAIL_WEBHOOK_SECRET=          # for verifying push notifications
```
