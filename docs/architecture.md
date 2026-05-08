# MeetPlanner — System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Dashboard │  │Task Board│  │Messaging │  │Analytics   │  │
│  │Meetings  │  │Kanban    │  │Channels  │  │Search      │  │
│  │Triage    │  │Detail    │  │DMs       │  │Settings    │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Next.js API Routes                   │   │
│  │  /api/tasks  /api/meetings  /api/messages  /api/users │   │
│  │  /api/search  /api/ai/chat  /api/notifications        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │              │               │
   ┌──────▼──┐    ┌──────▼──┐    ┌──────▼──────┐
   │  Claude  │    │  Neon   │    │  Supabase   │
   │  API     │    │Postgres │    │  Realtime   │
   │ (AI)     │    │  (DB)   │    │ (Messages)  │
   └──────────┘    └─────────┘    └─────────────┘
          │
   ┌──────▼──────────────────┐
   │  Gmail API (push watch) │
   │  Gemini API (fallback)  │
   └─────────────────────────┘
```

---

## Data Flow: Meeting → Tasks

```
Gmail receives meeting notes
         │
         ▼
Gmail API push notification → /api/webhooks/gmail
         │           OR
User pastes notes / uploads file → /api/meetings or /api/meetings/upload
         │
         ▼
Claude API (falls back to Gemini): structured extraction
  Input:  raw meeting text + team roster
  Output: {
    title, summary, date,
    tasks: [{ title, assignee_name, priority, due_date, description }],
    decisions: [],
    attendees: []
  }
         │
         ▼
Tasks inserted with status = 'triage'
         │
         ▼
Triage Queue (manager review — approve/edit/reject per task)
         │
         ▼
Task status → 'todo' → notify assignees
```

## Data Flow: Chat → Task

```
Team member sends message in channel
         │
         ▼
Message stored in DB + broadcast via Supabase Realtime
         │
         ▼ (user clicks "Create Task" on message hover toolbar)
POST /api/messages/:id/create-task
         │
         ▼
Claude API: extract task from message text
  Input:  message content
  Output: { title, priority, description }
         │
         ▼
Task inserted (status = 'triage') + message flagged
         │
         ▼
Task appears in Triage Queue
```

---

## Database Schema (Neon Postgres)

### users
```sql
id            UUID PRIMARY KEY
name          TEXT NOT NULL
email         TEXT UNIQUE NOT NULL
password_hash TEXT                          -- for credentials auth
role          ENUM('admin','manager','member','viewer') DEFAULT 'member'
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
color      TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### meetings
```sql
id           UUID PRIMARY KEY
title        TEXT NOT NULL
source       ENUM('gmail','manual','google_meet')
raw_content  TEXT
summary      TEXT
decisions    JSONB       -- string[]
attendees    JSONB       -- {name, email}[]
date         DATE
created_by   UUID REFERENCES users(id)
created_at   TIMESTAMPTZ DEFAULT now()
```

### tasks
```sql
id            UUID PRIMARY KEY
title         TEXT NOT NULL
description   TEXT
priority      ENUM('critical','high','normal','low') DEFAULT 'normal'
status        ENUM('triage','todo','in_progress','review','done') DEFAULT 'triage'
assignee_id   UUID REFERENCES users(id)
created_by    UUID REFERENCES users(id)
meeting_id    UUID REFERENCES meetings(id)   -- NULL if created manually/from chat
department_id UUID REFERENCES departments(id)
due_date      DATE
position      INTEGER DEFAULT 0              -- kanban column order
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

### task_comments
```sql
id         UUID PRIMARY KEY
task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE
user_id    UUID REFERENCES users(id)
content    TEXT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
edited_at  TIMESTAMPTZ
```

### channels
```sql
id            UUID PRIMARY KEY
name          TEXT NOT NULL
slug          TEXT UNIQUE NOT NULL
department_id UUID REFERENCES departments(id)
type          ENUM('public','private','direct')
created_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT now()
```

### channel_members
```sql
channel_id UUID REFERENCES channels(id)
user_id    UUID REFERENCES users(id)
role       ENUM('owner','member') DEFAULT 'member'
joined_at  TIMESTAMPTZ DEFAULT now()
PRIMARY KEY (channel_id, user_id)
```

### messages
```sql
id         UUID PRIMARY KEY
channel_id UUID REFERENCES channels(id)
user_id    UUID REFERENCES users(id)
content    TEXT NOT NULL
reply_to   UUID REFERENCES messages(id)
flagged    BOOLEAN DEFAULT false           -- flagged as idea or converted to task
created_at TIMESTAMPTZ DEFAULT now()
edited_at  TIMESTAMPTZ
```

### notifications
```sql
id         UUID PRIMARY KEY
user_id    UUID REFERENCES users(id)
type       ENUM('task_assigned','task_due','task_overdue','mention',
                'idea_flagged','idea_approved','meeting_processed')
payload    JSONB    -- { task_id, message_id, meeting_id, etc. }
read       BOOLEAN DEFAULT false
created_at TIMESTAMPTZ DEFAULT now()
```

---

## API Routes

### Meetings
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/webhooks/gmail` | Gmail push notification receiver |
| GET | `/api/meetings` | List meetings (paginated) |
| POST | `/api/meetings` | Create meeting from pasted notes |
| GET | `/api/meetings/:id` | Single meeting with tasks |
| PATCH | `/api/meetings/:id` | Update meeting |
| POST | `/api/meetings/upload` | Create meeting from uploaded file (.pdf/.docx/.txt) |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tasks` | List tasks (filters: status, assigneeId, priority, departmentId) |
| POST | `/api/tasks` | Create task manually |
| PATCH | `/api/tasks/:id` | Update task (status, assignee, priority, etc.) |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/approve` | Approve task from triage (sets status → todo) |
| GET | `/api/tasks/:id/comments` | List comments for a task |
| POST | `/api/tasks/:id/comments` | Add comment to a task |

### Messaging
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/channels` | List channels user belongs to |
| POST | `/api/channels` | Create channel |
| GET | `/api/channels/:id/messages` | Paginated message history (cursor-based) |
| POST | `/api/channels/:id/messages` | Send message |
| DELETE | `/api/messages/:id` | Delete own message |
| PATCH | `/api/messages/:id/flag` | Flag message as idea |
| POST | `/api/messages/:id/create-task` | AI-extract task from message, create at triage |

### People
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/users` | List team members (with dept + task counts) |
| POST | `/api/users` | Create team member (admin only) |
| GET | `/api/users/:id` | User profile |
| PATCH | `/api/users/:id` | Update user role/department (admin only) |
| GET | `/api/users/search` | Search users by name/email |
| POST | `/api/auth/register` | Self-registration (public, domain-restricted) |

### Departments
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/departments` | List departments |
| POST | `/api/departments` | Create department (admin) |
| PATCH | `/api/departments/:id` | Update department (admin) |
| DELETE | `/api/departments/:id` | Delete department (admin) |

### Search & AI
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/search?q=` | Full-text search across tasks, meetings, users |
| POST | `/api/ai/chat` | Conversational AI over tasks + meetings data |

### Notifications
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications` | List notifications for current user |
| POST | `/api/notifications/read-all` | Mark all notifications as read |

---

## Authentication

### Providers
1. **Google OAuth** — Google Workspace sign-in (optional, requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`)
2. **Credentials** — Email + bcrypt password (always available)

### Flow
1. User visits app → middleware checks JWT session
2. If no session → redirect to `/login`
3. Sign in via Google or email/password
4. NextAuth v5 issues signed JWT (`AUTH_SECRET` required)
5. Session carried via HTTP-only cookie

### Domain Restriction
Only `@duckercreative.com` emails allowed (configurable via `ALLOWED_EMAIL_DOMAIN`).
Applied in both Google OAuth `signIn` callback and credentials `authorize`.

### Admin Member Creation
Admins can create accounts directly from Settings → Team, bypassing self-registration.
Uses `POST /api/users` (admin-only) which sets any role and department.

---

## AI Integration

### Meeting Extraction
- Primary: Claude (`claude-sonnet-4-6`), temperature 0
- Fallback: Gemini (`gemini-2.5-flash`) if `ANTHROPIC_API_KEY` not set
- System prompt cached (prompt caching) — includes team roster for assignee matching
- Output: structured JSON with title, summary, decisions, attendees, tasks[]

### Chat → Task Extraction
- Primary: Claude (`claude-sonnet-4-6`), lightweight prompt (512 max tokens)
- Fallback: Gemini (`gemini-1.5-flash`) if `ANTHROPIC_API_KEY` not set
- Input: single message content
- Output: `{ title, priority, description }`
- Task created at `triage` status for manager review

### AI Chat (Command Palette)
- Primary: Claude with context: current tasks list + recent meetings + team members
- Fallback: Gemini (`gemini-1.5-flash`) if `ANTHROPIC_API_KEY` not set
- Used for natural language queries ("Who has the most tasks?", "What was decided in Friday's meeting?")

---

## Environment Variables

```bash
# Auth (required)
AUTH_SECRET=                       # random base64 string — sign JWTs
NEXTAUTH_SECRET=                   # same value as AUTH_SECRET (NextAuth alias)
NEXTAUTH_URL=                      # set to production URL on Vercel (e.g. https://ducker-meetplanner.vercel.app)
ALLOWED_EMAIL_DOMAIN=duckercreative.com
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=duckercreative.com

# Google OAuth (optional — credentials auth works without these)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=              # for Gmail API server-side calls

# AI (at least one required for meeting extraction)
ANTHROPIC_API_KEY=                 # preferred — all routes fall back to Gemini if absent
GEMINI_API_KEY=                    # fallback for all AI routes

# Database
DATABASE_URL=                      # Neon Postgres connection string

# Real-time messaging
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Web Push (PWA notifications)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=      # generate with: npx web-push generate-vapid-keys
VAPID_PRIVATE_KEY=
VAPID_EMAIL=                       # mailto:your@email.com

# Webhooks & cron security
GMAIL_WEBHOOK_SECRET=              # random hex — validate Gmail push payloads
CRON_SECRET=                       # random hex — passed as Bearer token in cron requests
GITHUB_WEBHOOK_SECRET=             # random hex — validate GitHub webhook payloads

# GitHub integration (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

---

## CI/CD

Deployments are automated via **GitHub Actions** (`.github/workflows/deploy.yml`).

| Trigger | Target |
|---------|--------|
| Push to `main` | Vercel Production |
| Pull request to `main` | Vercel Preview |

The workflow runs `vercel build --prod` then `vercel deploy --prebuilt --prod` using
three repo secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

> The Vercel GitHub App is not used — deployment is handled entirely by this workflow.
