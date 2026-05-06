# MeetPlanner — Build Roadmap & Task Tracker

> **Workflow**: Complete one task → commit + push → clear context → read this file → start next task.
> Always run `npm run build` before committing. Use `npm run db:push` after schema changes.

---

## Phase 3 — Meeting Lifecycle

### Task 1 — Phase 3A: Meeting Scheduling + Google Calendar Integration
**Status**: ✅ DONE (commit `d1ff631`)

**Delivered**:
- `meeting_requests` table + `meeting_request_status` enum in schema
- 4 new notification types: `meeting_request_submitted/approved/rejected/reminder`
- `/meeting-requests` page with Pending Review / Approved / All tabs
- `NewMeetingRequestModal` — title, datetime, duration, location, agenda, attendee multi-select
- Approve: creates Google Calendar event via `googleapis`, sends invites, marks `sent`
- Reject: stores review note, notifies requester in-app
- Vercel Cron at `/api/cron/meeting-reminders` (every 15 min) — sends reminders 30 min before meetings
- Sidebar updated with "Meeting Requests" nav item (CalendarClock icon)
- Google OAuth scopes extended: `calendar` + `gmail.send`

**Env vars needed**: `GOOGLE_REFRESH_TOKEN`, `CRON_SECRET`

---

### Task 2 — Phase 3B: Post-Meeting Processing (Transcript → Minutes → Approve → Distribute)
**Status**: ✅ DONE (commit `b801c43`)

**What to build**:
- Extend `/api/webhooks/gmail` to detect Google Meet recording emails (subject pattern `"Recording available:"`) and fetch transcript from Google Drive API
- New DB tables:
  - `meeting_minutes` (id, meeting_id, content, status: draft/pending_review/approved/distributed, generated_by_ai bool, reviewed_by, approved_by, distributed_at, created_at, updated_at)
- Claude generates structured minutes from transcript (agenda items, decisions, action items, attendees)
- Minutes UI on Meeting Detail page (`/meetings/[id]`): text area with approve / request-changes / edit controls (manager/admin only)
- On approve → enable "Distribute" button
- On distribute → send minutes via Gmail API to all meeting attendees, update status to `distributed`
- New notification type: `minutes_ready_for_review` → notify meeting organizer
- Update `notifTypeEnum` in schema + `buildMessage` in notifications route

**Files to create/modify**:
- `src/lib/db/schema.ts` — add `meetingMinutes` table + new notif type
- `src/app/api/webhooks/gmail/route.ts` — extend to detect recording emails
- `src/app/api/meetings/[id]/minutes/route.ts` — GET/POST/PATCH
- `src/app/api/meetings/[id]/minutes/approve/route.ts`
- `src/app/api/meetings/[id]/minutes/distribute/route.ts`
- `src/app/(app)/meetings/[id]/MeetingDetailClient.tsx` — add Minutes tab
- `src/lib/google/drive.ts` — fetch transcript from Drive

---

### Task 3 — Phase 3C: Milestones (AI-assisted sub-goals under tasks)
**Status**: ✅ DONE (commit `0389a16`)

**What to build**:
- New DB table: `milestones` (id, task_id FK, title, due_date, status: pending/in_progress/completed, completed_at, created_by, ai_suggested bool, created_at)
- `POST /api/tasks/[id]/milestones/generate` — Claude suggests 3–5 milestones from task title + description
- `GET/POST /api/tasks/[id]/milestones` — list and create
- `PATCH/DELETE /api/milestones/[id]` — update / delete
- Milestone UI in Task Detail slide-over: checklist list, each milestone has title, due date, status toggle, edit/delete; progress bar on task card
- Assignee can create via prompt
- Vercel Cron (daily 8am): query milestones due today/tomorrow → send in-app + email reminder to assignee
- Update `vercel.json` crons to add: `{ "path": "/api/cron/milestone-reminders", "schedule": "0 8 * * *" }`

**Files to create/modify**:
- `src/lib/db/schema.ts` — add `milestones` table
- `src/app/api/tasks/[id]/milestones/route.ts`
- `src/app/api/tasks/[id]/milestones/generate/route.ts`
- `src/app/api/milestones/[id]/route.ts`
- `src/app/api/cron/milestone-reminders/route.ts`
- `src/app/(app)/tasks/TaskDetailPanel.tsx` — add milestone checklist + progress bar
- `src/app/(app)/tasks/TaskBoardClient.tsx` — add milestone progress bar on task card
- `vercel.json` — add milestone reminder cron

---

### Task 4 — Phase 3D: Daily Progress Reports (AI-generated, auto-sent to management)
**Status**: ✅ DONE (commit `8a9ee05`)

**What to build**:
- New DB table: `daily_reports` (id, date, content_html, content_markdown, sent_at, recipient_ids jsonb, created_at)
- Vercel Cron at 17:00 daily: aggregate all task statuses, milestone completions, overdue items for the day
- Claude generates a formatted daily report: per-person summary, per-department summary, blockers, overdue, completed today
- Send via Gmail API to all users with manager/admin role (respect opt-out preference)
- Reports available in Analytics page under new "Reports" tab
- Settings → Notifications: toggle "Receive daily report email" (default on for manager/admin)
- Add `GET /api/cron/daily-report` cron endpoint
- Add `GET /api/reports` — list past daily reports
- Update `vercel.json` crons: add `{ "path": "/api/cron/daily-report", "schedule": "0 17 * * *" }`

**Files to create/modify**:
- `src/lib/db/schema.ts` — add `daily_reports` table, add `dailyReportEmail` bool to users
- `src/app/api/cron/daily-report/route.ts`
- `src/app/api/reports/route.ts`
- `src/app/(app)/analytics/AnalyticsClient.tsx` — add Reports tab
- `src/app/(app)/settings/SettingsClient.tsx` — add notification preference toggle
- `vercel.json` — add daily-report cron

---

## Phase 4 — Full PM Foundation

### Task 5 — Phase 4A: Projects Entity + Portfolio View
**Status**: ✅ DONE

**What to build**:
- New DB tables:
  - `projects` (id, name, description, status: planning/active/on_hold/completed/archived, owner_id, color, icon, start_date, end_date, budget, created_at, updated_at)
  - `project_members` (project_id, user_id, role: owner/manager/member/viewer, joined_at)
- Update `tasks` table: add `project_id` FK (nullable for backward compat)
- Update `meetings` table: add `project_id` FK (nullable)
- Projects list page `/projects` — card grid with name, status, owner avatar, % complete, days remaining
- Portfolio view `/projects/portfolio` — all projects, health score, status indicator
- Project detail page `/projects/[id]` — tabs: Overview, Tasks, Meetings, Documents, Goals, Members, Settings
- Project creation: form + "Plan with AI" (Claude suggests name, timeline, initial tasks)
- Project Settings: edit meta, manage members, archive/delete
- Sidebar: "Projects" section listing active projects the user belongs to

**Files to create/modify**:
- `src/lib/db/schema.ts` — add `projects`, `project_members` tables; add `project_id` to tasks + meetings
- `src/app/api/projects/route.ts` — GET/POST
- `src/app/api/projects/[id]/route.ts` — GET/PATCH/DELETE
- `src/app/api/projects/[id]/members/route.ts`
- `src/app/(app)/projects/page.tsx`
- `src/app/(app)/projects/portfolio/page.tsx`
- `src/app/(app)/projects/[id]/page.tsx`
- `src/app/(app)/projects/[id]/ProjectDetailClient.tsx`
- `src/components/layout/Sidebar.tsx` — add Projects section

---

### Task 6 — Phase 4B: Task Views — List, Gantt/Timeline, Calendar
**Status**: 🔲 TODO

**Depends on**: Task 5 (projects)

**What to build**:
- View switcher: Kanban (existing) | List | Gantt | Calendar — persisted in localStorage
- **List/Table view**: sortable columns, inline edit, bulk select + bulk actions
- **Gantt/Timeline view**: horizontal bars (start → due date), drag to reschedule, dependency arrows, today line, zoom (week/month/quarter)
- **Calendar view**: tasks by due date on month grid, color by priority, click to open Task Detail
- All views share the same filter bar + saved filters

**Files to create/modify**:
- `src/app/(app)/tasks/TaskBoardClient.tsx` — add view switcher
- `src/app/(app)/tasks/views/ListView.tsx` — new
- `src/app/(app)/tasks/views/GanttView.tsx` — new
- `src/app/(app)/tasks/views/CalendarView.tsx` — new

---

### Task 7 — Phase 4C: Subtasks + Task Dependencies + Custom Fields
**Status**: 🔲 TODO

**Depends on**: Task 5 (projects for custom field definitions)

**What to build**:
- `parent_task_id` FK on tasks table (self-referential) — subtasks
- `task_dependencies` table (task_id, depends_on_task_id, type: blocked_by/blocks)
- `custom_field_definitions` (project_id, name, type: text/number/date/select/checkbox, options jsonb)
- `custom_field_values` (task_id, field_definition_id, value)
- Recurring tasks: add `recurrence_rule` to tasks; Vercel Cron creates next instance on completion
- Task templates: save/apply task templates

**Files to create/modify**:
- `src/lib/db/schema.ts` — add above tables + fields
- `src/app/api/tasks/[id]/subtasks/route.ts`
- `src/app/api/task-dependencies/route.ts`
- `src/app/api/projects/[id]/custom-fields/route.ts`
- `src/app/(app)/tasks/TaskDetailPanel.tsx` — add subtasks, dependencies, custom fields sections

---

### Task 8 — Phase 4D: Documents & Wiki (Rich Text, Versioning, Approval)
**Status**: 🔲 TODO

**Depends on**: Task 5 (scoped to projects)

**What to build**:
- New DB tables: `documents` (id, project_id, title, content_json, status: draft/review/approved, created_by, updated_by, updated_at), `document_versions` (document_id, version_number, content_json, saved_by, saved_at)
- Rich text editor: Tiptap with headings, bold/italic/code, bullet/numbered lists, tables, code blocks, inline @mentions, image upload to Vercel Blob
- Document list per project (Project → Documents tab)
- Version history sidebar with restore
- Approval workflow: Draft → submit for review → manager approves → Approved
- PDF export
- Wiki folder/page hierarchy with sidebar tree
- Meeting minutes from Task 2 stored as documents

**Key package**: `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-*`

---

### Task 9 — Phase 4E: Workload View + Capacity Planning
**Status**: 🔲 TODO

**Depends on**: Task 5 (projects)

**What to build**:
- Workload view at `/people/workload`: timeline per person, task bars, capacity bars (color green/orange/red by %)
- Overload detection badge
- Drag to reassign from workload view
- `user_availability` table (user_id, date, type: holiday/leave/partial, hours_available)
- Skills tagging: `skills` jsonb array on users
- Department filter

---

## Phase 5 — Intelligence & Collaboration

### Task 10 — Phase 5A: Goals & OKRs
**Status**: 🔲 TODO

**Depends on**: Task 5 (projects)

**What to build**:
- Tables: `goals` (id, title, level: company/team/individual, owner_id, start/end date, status), `key_results` (goal_id, title, metric_type, target/current value, unit), `goal_task_links`
- Goals page `/goals`: hierarchy view
- KR progress auto-calculated from linked tasks
- Link tasks to KRs from Task Detail panel
- Monthly OKR check-in prompts
- Dashboard widget: top 3 company goals

---

### Task 11 — Phase 5B: Time Tracking + Budget Tracking
**Status**: 🔲 TODO

**What to build**:
- Tables: `time_entries` (task_id, project_id, user_id, date, minutes, note, billable), `project_expenses`
- Log time on Task Detail (popover: date, hours, note, billable toggle)
- Start/stop timer on Task Detail — active timer in top bar
- Timesheets at `/timesheets` — weekly grid
- Project budget gauge on Project Overview
- Over-budget notification at 80% and 100%
- Time reports in Analytics → export CSV
- Add `hourly_rate` to users (admin-only)

---

### Task 12 — Phase 5C: Automations (Preset Rules Engine)
**Status**: 🔲 TODO

**Depends on**: Tasks 5, 9 (projects + milestones)

**What to build**:
- Table: `automations` (project_id, name, trigger_type, trigger_config, action_type, action_config, enabled)
- 10 preset automation templates as toggleable presets per project
- Automations UI in Project Settings → Automations tab
- Vercel Cron checks trigger conditions every hour

---

### Task 13 — Phase 5D: Forms & Intake (Public request forms → Triage)
**Status**: 🔲 TODO

**What to build**:
- Tables: `intake_forms` (project_id, name, slug, fields jsonb, active), `intake_submissions`
- Form builder in Project Settings → Forms
- Public form page at `/forms/[slug]` — no auth required
- Submission → triage task auto-creation
- Submitter confirmation + status update emails
- Cloudflare Turnstile or honeypot spam protection

---

### Task 14 — Phase 5E: AI Project Planner + Risk Detector + Standup Bot
**Status**: 🔲 TODO

**Depends on**: Tasks 5, 9, 3, 12

**What to build**:
- **AI Project Planner**: "Plan with AI" on project creation — Claude scaffolds tasks, milestones, timeline, assignees, risks
- **AI Risk Detector**: Daily Cron — Claude analyzes velocity, overdue count, team load, budget burn → risk score (low/medium/high) + banner on Project Overview
- Table: `project_risk_snapshots` (project_id, risk_level, explanation, created_at)
- **AI Daily Standup Bot**: Opt-in per project — 9am DM to each member, compile summary by 9:30am, post to project channel
- **Smart Assignment**: "AI Suggest" button on task creation — recommends assignees by skills + load

---

## Phase 6 — Growth & External

### Task 15 — Phase 6A: Client / Stakeholder Portal
**Status**: 🔲 TODO

**Depends on**: Task 5, 8 (projects + documents)

**What to build**:
- Table: `client_portals` (project_id, name, slug, password_hash nullable, logo_url, primary_color, active)
- Table: `portal_updates` (portal_id, content, created_by, created_at)
- Public portal at `/portal/[slug]` — shows project status, milestones, approved docs, status updates
- Client approval: approve/request changes on specific documents from portal
- Custom branding: logo, primary color
- Analytics: portal view counts

---

### Task 16 — Phase 6B: Integrations (GitHub, CSV Import/Export, Webhooks)
**Status**: 🔲 TODO

**What to build**:
- **GitHub/GitLab**: OAuth connect in Settings → Integrations; link repo to project; webhook receiver closes tasks on PR merge
- **CSV Import**: upload CSV → preview → import tasks (title, description, assignee_email, priority, status, due_date, project)
- **CSV Export**: export current filtered task view
- **Outbound Webhooks**: Table `webhooks` (project_id, url, events[], secret); delivery log
- Document webhook payload structure for Zapier/Make

---

### Task 17 — Phase 6C: Advanced Analytics + AI Narrative Reports
**Status**: 🔲 TODO

**Depends on**: Task 11 (time tracking), Task 5 (projects)

**What to build**:
- New charts: Burndown, Velocity, Cycle time distribution, Team performance table, Project health scorecard
- Custom report builder: pick dimensions + metrics, save, pin to dashboard
- AI Insights button per chart — Claude writes 3–5 sentence narrative
- Weekly AI digest email every Monday
- Tables: `sprints` (project_id, name, start_date, end_date, status); tasks get sprint_id FK
- Sprint board view, sprint planning (drag from backlog), sprint retrospective auto-summary

---

### Task 18 — Phase 6D: Mobile-Responsive PWA
**Status**: 🔲 TODO

**What to build**:
- Audit and fix all pages for 320px–768px breakpoints
- Sidebar: slide-out drawer on mobile
- Task Board: single-column kanban on mobile, horizontal scroll between columns
- Gantt: simplified mobile list view
- All touch targets ≥ 44×44px
- `manifest.json`: name, icons (192/512px), theme_color, display: standalone
- Service worker via next-pwa: cache critical pages, offline banner
- Web Push API: subscribe on PWA install, push for task assigned / overdue / meeting starting / mention
- Settings → Notifications: granular push notification toggles

---

## Environment Variables Reference

```bash
# Required (existing)
AUTH_SECRET=
ALLOWED_EMAIL_DOMAIN=duckercreative.com
DATABASE_URL=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth + APIs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=      # for Calendar + Gmail send (server-side)

# Added in Phase 3A
CRON_SECRET=               # Vercel Cron authorization header value
```
