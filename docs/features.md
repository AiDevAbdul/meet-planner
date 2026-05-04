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
└── People & Teams
```

---

## 1. Dashboard

**Purpose**: At-a-glance overview for the logged-in user.

### Layout
- Top row (3 stat cards): Tasks Due Today | Overdue Tasks | Unread Messages
- Left column (60%): My Tasks — kanban-lite (todo / in-progress / done, today's scope)
- Right column (40%):
  - Recent Meetings (last 3, click to expand)
  - Triage Queue count (if manager)
  - Team Activity feed (task status changes, last 10)

### Behavior
- Stat cards animate count up on load (respect reduced-motion)
- Activity feed auto-refreshes every 60s (not real-time to avoid noise)
- "Add Task" quick-action button (top-right of My Tasks)

---

## 2. Meeting Notes Ingestion

### Sources
| Source | How | Status |
|--------|-----|--------|
| Gmail (meeting notes forwarded/labeled) | Gmail API push watch | Phase 1 |
| Manual paste | Text area in UI | Phase 1 |
| File upload (.txt, .docx, .pdf) | Upload → parse → AI | Phase 2 |
| Google Meet transcript | Meet API | Phase 2 |

### Ingestion Flow (UI)
1. Notification badge appears: "New meeting notes received"
2. User opens Meetings → sees card in "Processing" state with spinner
3. AI extraction runs (Claude API) — typically 3–8s
4. Card transitions to "Extracted" state — shows: summary, decisions, extracted tasks (count)
5. User clicks → full Meeting Detail view

### Meeting Detail View
- Header: title, date, source badge, attendees avatars
- AI Summary block (collapsible)
- Decisions list
- Extracted Tasks section → each task has: title, suggested assignee, priority, due date
  - Each task has [Approve] [Edit] [Reject] actions
  - Approved → moves to Task Board (status: todo)
  - Rejected → archived, not visible unless filtered

### Edge Cases
- Duplicate detection: if same email content received twice → show warning, don't double-extract
- No tasks extracted: show "No action items detected" with manual "Add Task" option
- Extraction failure: show error + "Retry" + "Paste manually" fallback

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
- **Content**: title (headline), assignee avatar, due date badge, priority chip, department tag
- **Hover**: drag handle visible, subtle shadow lift (`translateY(-2px)`)
- **Click**: opens Task Detail slide-over panel (not a new page)

### Task Detail Slide-over
- Slides in from right (350px wide on desktop, full-screen on mobile)
- Editable fields: title, description (rich text), assignee, priority, due date, department
- Activity log at bottom: status changes, comments
- Comment input at very bottom
- "Source Meeting" link if task came from a meeting
- Delete (destructive, red, confirmation dialog)

### Filters
- By: Assignee | Priority | Department | Due Date range | My Tasks toggle
- Filters persist in URL query params (deep-link shareable)

### Views
- Kanban (default)
- List view (table, sortable columns)
- Timeline / Gantt (Phase 2)

---

## 4. Triage Queue

**Who sees it**: Admins and Managers only.

**Purpose**: Review AI-extracted tasks before they reach the team.

### Layout
- Dedicated page (accessible from sidebar + notification badge)
- List of pending tasks grouped by meeting
- Each task: title, AI-suggested assignee, priority, due date → [Approve] [Edit & Approve] [Reject]
- Bulk actions: "Approve All from this meeting"
- Empty state: "All caught up" illustration

### Edit & Approve Modal
- Inline form: edit title, reassign, change priority, set due date
- "Approve" button saves and creates the task

---

## 5. Messaging

### Channel List (Sidebar panel)
- Sections: Departments (auto-created per dept) | Custom Channels | Direct Messages
- Unread indicator: bold name + count badge
- "+" button to create new channel or DM
- Active channel: highlighted in blue (sidebar active state)

### Channel View
- Top bar: channel name, member count, description, search icon
- Message list: infinite scroll upward (load older messages)
- Message grouping: consecutive messages from same user grouped (no repeated avatar/name)
- Date separators between days
- Own messages: right-aligned, blue bubble
- Others: left-aligned, glass bubble with avatar

### Message Actions (hover toolbar)
- React (emoji picker, limited to 6 common reactions)
- Reply (opens thread)
- Flag as Idea (📌) — triggers AI idea extraction
- Copy text
- Delete (own messages only)

### Idea Flagging Flow
1. User hovers → clicks 📌 "Flag as Idea"
2. Message gets 📌 indicator
3. Manager sees notification: "New idea flagged in #channel"
4. Manager opens Triage → sees draft task extracted from message thread
5. Approve / Edit / Reject

### Thread View
- Opens as a right panel (similar to Slack threads)
- Shows original message + replies
- "Back to channel" link at top

### Direct Messages
- One-to-one or small group (up to 8 people)
- Same message UI as channels
- No idea flagging in DMs

### Notifications
- In-app notification bell (top bar)
- Email digest (daily, configurable)
- Browser push notifications (opt-in)
- Mention (@name) triggers notification to that person

---

## 6. People & Teams

### People Page
- Grid of team member cards (avatar, name, role, department, task count)
- Filter by department
- Click → Person Profile

### Person Profile
- Avatar (large), name, role, department, email
- Active tasks (kanban mini view)
- Completed tasks count (this month)
- Member of channels list
- Admin-only: edit role, department

### Departments Page
- Admin only
- List of departments with member count, task count
- Create / Edit / Delete department
- Each dept auto-creates a messaging channel

---

## 7. Notifications

### Trigger Events
| Event | Recipients | Channel |
|-------|-----------|---------|
| Task assigned to me | Assignee | In-app + email |
| Task due tomorrow | Assignee | In-app + email |
| Task overdue | Assignee + Manager | In-app + email |
| Meeting notes processed | Meeting creator | In-app |
| Idea flagged in channel | Channel managers | In-app |
| @mention in message | Mentioned user | In-app + email |
| Idea approved → task created | Idea flagger | In-app |

### Notification Center
- Slide-over from notification bell (top bar)
- Groups: Today | Earlier
- Mark all read button
- Click → navigate to source (task, meeting, channel)
- Auto-mark as read when navigating to source

---

## 8. Settings (Admin)

### Sections
- **General**: Company name, logo, timezone
- **Team**: Invite members (email), manage roles
- **Departments**: CRUD departments, assign members
- **Integrations**: Connect Google Workspace, Gmail API status
- **Notifications**: Configure email digest frequency
- **Appearance**: Light / Dark / System theme toggle

---

## Phase Roadmap

### Phase 1 (MVP)
- [ ] Google OAuth + team onboarding
- [ ] Dashboard (basic)
- [ ] Manual meeting note paste + AI extraction
- [ ] Gmail webhook ingestion
- [ ] Triage Queue
- [ ] Task Board (kanban) with detail slide-over
- [ ] Basic messaging (channels + DMs)
- [ ] People & Teams (view only)
- [ ] In-app notifications

### Phase 2
- [ ] Google Meet transcript ingestion
- [ ] File upload (.pdf, .docx) ingestion
- [ ] Timeline / Gantt view
- [ ] Task comments + @mentions in tasks
- [ ] Message threads
- [ ] Email digest notifications
- [ ] Analytics dashboard (task completion rates, meeting frequency)
- [ ] Mobile responsive (PWA)
