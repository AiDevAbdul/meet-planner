# MeetPlanner — Feature Specifications

## Feature Map

```
MeetPlanner
├── Dashboard
├── Meetings (ingestion + view)
├── Task Board (kanban)
├── Triage Queue (AI review)
├── Messaging
│   ├── Channels (department + custom)
│   └── Direct Messages
├── People & Teams
├── Analytics
└── Settings
    ├── General
    ├── Team (add/manage members)
    ├── Departments
    └── Appearance
```

---

## 1. Dashboard

**Purpose**: At-a-glance overview for the logged-in user.

### Layout
- Top row (3 stat cards): Tasks Due Today | Overdue Tasks | Unread Messages
- Left column (60%): My Tasks — kanban-lite (todo / in-progress / done, today's scope)
- Right column (40%):
  - Recent Meetings (last 3, click to expand)
  - Team Activity feed (task status changes, last 10)

### Behavior
- Stat cards animate count up on load
- My Tasks mini-kanban has quick-action buttons per card:
  - **Todo** tasks: "Start" button → moves to In Progress
  - **In Progress** tasks: "Done" button → moves to Done
  - Optimistic update (UI updates immediately, syncs to API)

---

## 2. Meeting Notes Ingestion

### Sources
| Source | How | Status |
|--------|-----|--------|
| Gmail (meeting notes forwarded/labeled) | Gmail API push watch | Implemented |
| Manual paste | Text area in UI | Implemented |
| File upload (.txt, .docx, .pdf) | Upload → parse → AI | Implemented |
| Google Meet transcript | Meet API | Planned |

### Ingestion Flow (UI)
1. User clicks "New Meeting" → chooses Paste or Upload tab
2. AI extraction runs (Claude API, falls back to Gemini) — typically 3–8s
3. Meeting appears with: title, summary, decisions, extracted tasks
4. User clicks → full Meeting Detail view

### Meeting Detail View
- Header: title, date, source badge, attendees avatars
- AI Summary block (collapsible)
- Decisions list
- Extracted Tasks section → each task has: title, suggested assignee, priority, due date
  - Tasks start in Triage status, approved via Triage Queue

### Edge Cases
- Extraction failure: meeting saved with "Meeting (extraction failed)" title
- File types supported: .pdf (via pdf-parse), .docx (via mammoth), .txt

---

## 3. Task Board (Kanban)

### Columns
| Column | Description |
|--------|-------------|
| Triage | AI-extracted, pending manager review |
| To Do | Approved, not started |
| In Progress | Actively being worked on |
| Review | Submitted for review |
| Done | Completed |

### Task Card
- **Left accent**: 3px border in priority color
- **Content**: title, assignee avatar, due date badge, priority chip
- **Hover**: drag handle visible, subtle shadow lift
- **Click**: opens Task Detail slide-over panel

### Quick-Action Status Buttons (Assignee Only)
- Shown only when `task.assigneeId === currentUserId`
- **Todo** tasks: "Start Task" button (orange) → in_progress
- **In Progress** tasks: "Mark Done" button (green) → done
- Optimistic UI update + PATCH to `/api/tasks/:id`

### Task Detail Slide-over
- Editable fields: title, description, assignee, priority, status, due date
- Comments section with user avatars and timestamps
- Activity log: status changes
- "Source Meeting" link if task came from a meeting
- Delete with confirmation

### Filters
- By: Assignee | Priority | Department | Status
- Filters persist in URL query params

---

## 4. Triage Queue

**Who sees it**: Admins and Managers only.

**Purpose**: Review AI-extracted tasks before they reach the team.

### Layout
- List of pending tasks grouped by source meeting
- Each task: title, AI-suggested assignee, priority, due date → [Approve] [Edit] [Reject]
- Empty state: "All caught up"

---

## 5. Messaging

### Channel List (Sidebar)
- Sections: public channels, private channels, direct messages
- Unread indicator: count badge
- "+" button to create channel or DM

### Channel View
- Infinite scroll upward (load older messages)
- Message grouping: consecutive messages from same user grouped
- Date separators between days
- Own messages: right-aligned blue bubble
- Others: left-aligned glass bubble with avatar

### Message Actions (hover toolbar)
- React (emoji — UI only, not persisted)
- Reply (UI only)
- **Flag as Idea** — marks message as flagged, shows bookmark indicator on bubble
- **Create Task** — sends message content to Claude, creates a task at Triage status, marks message as flagged
- Copy text
- Delete (own messages only)

### Chat → Task Flow
1. User hovers a message → clicks "Create Task" (list icon)
2. Button shows spinner while Claude extracts title + priority from the message text
3. On success: button flashes green checkmark, message gets "Flagged idea" badge
4. Task appears in Triage Queue for manager review

### Direct Messages
- One-to-one via direct channels
- Same message UI as channels

### Notifications
- In-app notification bell (top bar) — panel shows Today / Earlier groups
- Mark all read

---

## 6. People & Teams

### People Page
- Grid of team member cards (avatar, name, role, department, active task count, completion bar)
- Filter by department

### Person Profile
- Avatar, name, role, department, email
- Active tasks list (up to 5)
- Completed tasks count this month
- Member of channels list
- Admin-only: edit role, department

---

## 7. Analytics

**Who sees it**: All authenticated users.

### Metrics Displayed
- Total tasks / Completed tasks / Overdue tasks / Meetings this month
- Task status breakdown (bar chart — triage → done)
- Priority breakdown (critical / high / normal / low)
- Assignee workload (tasks per person, completion rate bar)

---

## 8. Search & Command Palette

- **Trigger**: Search button in top bar or `⌘K` / `Ctrl+K`
- **Searches**: Tasks, Meetings, People — debounced at 220ms
- **AI mode**: Questions (detected by phrasing) route to Claude via `/api/ai/chat`
- **Keyboard nav**: Arrow keys + Enter to select, Escape to close

---

## 9. Notifications

### Trigger Events
| Event | Recipients | Channel |
|-------|-----------|---------|
| Task assigned to me | Assignee | In-app |
| Task due tomorrow | Assignee | In-app |
| Task overdue | Assignee + Manager | In-app |
| Meeting notes processed | Meeting creator | In-app |
| Idea flagged in channel | Channel managers | In-app |
| @mention in message | Mentioned user | In-app |
| Idea approved → task created | Idea flagger | In-app |

### Notification Center
- Slide-over from notification bell (top bar)
- Groups: Today | Earlier
- Mark all read button

---

## 10. Settings

### Sections
- **General**: Company name, timezone, your account info
- **Team**: Add members directly (admin only), view all members with roles
- **Departments**: Create / Edit / Delete departments with color coding
- **Appearance**: Light / Dark / System theme toggle

### Add Team Member (Admin Only)
- Form fields: Full Name, Email, Password (show/hide), Role, Department
- Creates account immediately — member can sign in with credentials
- Email must match `ALLOWED_EMAIL_DOMAIN` (default: `duckercreative.com`)
- Role options: Admin | Manager | Member | Viewer

---

## Phase Roadmap

### Phase 1 (MVP) ✅
- [x] Google OAuth + credentials auth
- [x] Dashboard with stat cards + My Tasks mini-kanban
- [x] Manual meeting note paste + AI extraction (Claude + Gemini fallback)
- [x] Gmail webhook ingestion
- [x] Triage Queue (admin/manager)
- [x] Task Board (kanban, drag-and-drop)
- [x] Task detail slide-over with comments
- [x] Messaging (channels + DMs, Supabase Realtime)
- [x] People & Teams with profiles
- [x] In-app notifications center

### Phase 2 ✅
- [x] File upload (.pdf, .docx, .txt) meeting ingestion
- [x] Chat → Task AI conversion
- [x] Task quick-action buttons for assignees
- [x] Analytics dashboard
- [x] Global search + AI command palette
- [x] Admin team member creation in Settings

### Planned
- [ ] Google Meet transcript ingestion
- [ ] Timeline / Gantt view
- [ ] Message threads
- [ ] Email digest notifications
- [ ] Mobile responsive (PWA)
