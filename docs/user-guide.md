# MeetPlanner — User Guide

**Roles covered:** Admin · Manager · Member · Viewer  
**Last updated:** 2026-05-08

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard](#2-dashboard)
3. [Meetings](#3-meetings)
4. [Triage Queue](#4-triage-queue)
5. [Task Board](#5-task-board)
6. [Projects](#6-projects)
7. [Messaging](#7-messaging)
8. [Meeting Requests](#8-meeting-requests)
9. [People & Workload](#9-people--workload)
10. [Goals & OKRs](#10-goals--okrs)
11. [Analytics](#11-analytics)
12. [Timesheets](#12-timesheets)
13. [Settings](#13-settings)
14. [Role Permissions Reference](#14-role-permissions-reference)

---

## 1. Getting Started

### 1.1 Signing In

1. Navigate to your MeetPlanner URL.
2. Click **Sign in with Google**.
3. Choose your company Google Workspace account.
4. You are redirected to your Dashboard on success.

> Self-registration is domain-restricted. Only email addresses matching your company domain are accepted. Contact your Admin if access is denied.

### 1.2 Understanding Your Role

| Role | What you can do |
|---|---|
| **Admin** | Full access — manage team, departments, all content |
| **Manager** | Approve tasks, requests, minutes; view all team analytics |
| **Member** | Create and own tasks, submit meeting notes, chat |
| **Viewer** | Read-only access to tasks, meetings, and goals |

### 1.3 Navigation

The left sidebar contains all primary sections. The top bar has:
- **Global search** — tasks, meetings, people (keyboard shortcut: `Cmd/Ctrl + K`)
- **Notifications bell** — real-time alerts for mentions, approvals, due dates
- **AI chat** — floating button at bottom-right, conversational assistant with full team context

---

## 2. Dashboard

**Available to:** All roles

The Dashboard gives you a live snapshot of your work and your team.

### 2.1 Stat Cards

At the top you see three summary cards:
- **Tasks Due Today** — your tasks with today's due date
- **Overdue Tasks** — tasks past their due date assigned to you
- **Unread Messages** — across all channels you belong to

Click any card to navigate directly to the filtered view.

### 2.2 My Tasks (Mini Kanban)

A condensed three-column board — **To Do / In Progress / Done** — showing only tasks assigned to you. Drag cards between columns to update status without opening the full Task Board.

### 2.3 Recent Meetings

The three most recent meetings are listed with title, date, and extracted task count. Click a meeting to open its detail page.

### 2.4 Team Activity Feed

A live stream of actions across the team: tasks completed, new meeting notes added, approvals granted. Useful for staying informed without checking every section.

### 2.5 Company Goals (OKR Progress)

Active company-level goals are shown with a progress bar driven by Key Result completion. Click a goal to open its detail page.

---

## 3. Meetings

**Available to:** All roles (Admins/Managers see all; Members see meetings they attend or create)

### 3.1 Meeting List

`/meetings` shows all meetings with:
- Title, date, source badge (Gmail / Manual / Google Meet)
- Number of extracted tasks and decisions
- Pagination controls at the bottom

### 3.2 Adding Meeting Notes

Three ways to create a meeting record:

**Option A — Paste text**
1. Click **New Meeting** (top-right).
2. Select **Paste Notes**.
3. Paste your meeting transcript or notes into the text area.
4. Click **Extract Tasks**. The AI processes the text and returns a list of action items, decisions, and attendees.
5. Review the extracted data and click **Save Meeting**.

**Option B — Upload a file**
1. Click **New Meeting → Upload File**.
2. Drag and drop a `.pdf`, `.docx`, or `.txt` file.
3. Click **Extract**. The AI reads the file and extracts the same structured data.

**Option C — Gmail Integration (automatic)**
When Gmail push notifications are configured by your Admin, meeting-related emails are automatically ingested and processed. No manual upload needed.

### 3.3 Meeting Detail Page

Each meeting at `/meetings/[id]` shows:

| Section | Description |
|---|---|
| **AI Summary** | One-paragraph summary of the meeting |
| **Decisions** | Bullet list of decisions made |
| **Attendees** | People present, linked to their People profile |
| **Extracted Tasks** | Action items with assignee, priority, due date |
| **Meeting Minutes** | Full minutes with approval/distribution workflow |

### 3.4 Meeting Minutes Workflow

1. **Draft**: Any attendee can generate or paste meeting minutes on the detail page.
2. **Submit for Approval**: Click **Submit Minutes** to send to the assigned Manager.
3. **Approve** *(Manager/Admin)*: Open the meeting, review minutes, click **Approve**.
4. **Distribute** *(Manager/Admin)*: Click **Distribute** to email minutes to all attendees.

---

## 4. Triage Queue

**Available to:** Admin, Manager

The Triage Queue is the quality gate between raw AI extraction and tasks appearing on the team board.

### 4.1 What Is Triage?

When AI extracts tasks from meeting notes or chat messages they land in **Triage** status — invisible to Members — until a Manager or Admin reviews them.

### 4.2 Reviewing Tasks

1. Navigate to `/triage`.
2. Tasks are grouped by the source meeting.
3. For each task you can:
   - Edit **title**, **assignee**, **priority**, and **due date** inline
   - Click **Approve** — the task moves to the Task Board as **To Do**
   - Click **Reject** — the task is discarded
4. Work through all items until you see the "All caught up" empty state.

### 4.3 Bulk Actions

Select multiple tasks using the checkboxes, then use **Approve Selected** or **Reject Selected** to process them at once.

---

## 5. Task Board

**Available to:** All roles

### 5.1 Board Layout

The Task Board (`/tasks`) uses a five-column Kanban:

```
Triage → To Do → In Progress → Review → Done
```

- **Triage**: AI-extracted tasks pending manager approval (Admin/Manager only)
- **To Do**: Approved tasks ready to start
- **In Progress**: Work actively underway
- **Review**: Work submitted for review/QA
- **Done**: Completed tasks

### 5.2 Creating a Task Manually

1. Click **+ New Task** (top-right of any column).
2. Fill in: title, description, assignee, priority, due date.
3. Click **Create**. The task appears in **To Do**.

### 5.3 Moving Tasks

- **Drag and drop** a card to a new column to change its status.
- Or open the task detail and change the **Status** dropdown.

### 5.4 Task Detail Slide-Over

Click any task card to open the detail panel on the right. You can:

| Field | Notes |
|---|---|
| **Title / Description** | Editable inline |
| **Assignee** | Reassign to any team member; AI can suggest the best fit (click **Suggest Assignee**) |
| **Priority** | Critical / High / Normal / Low |
| **Status** | All five stages |
| **Due Date** | Date picker |
| **Comments** | Thread with user avatars and timestamps |
| **Subtasks** | Add checklist items inside the task |
| **Dependencies** | Mark tasks that must be done first |
| **Milestones** | Track key checkpoints; AI can auto-generate them |
| **Time Entries** | Log hours against the task |
| **Goal Links** | Connect this task to a company or team OKR |
| **Custom Fields** | Any project-specific fields defined by Admin |

### 5.5 Filtering

Use the filter bar above the board to narrow tasks by:
- **Assignee** — show only one person's tasks
- **Priority** — Critical, High, Normal, Low
- **Department** — filter by team
- **Status** — hide or show specific columns

### 5.6 Bulk Operations

- **Export**: Click **Export** (top toolbar) to download tasks as CSV or Excel.
- **Import**: Click **Import** to upload a CSV/Excel file and create tasks in bulk.

### 5.7 Quick Actions

On each card you can:
- **Start Task** — moves to In Progress and logs start time
- **Mark Done** — moves to Done instantly
- Hover to reveal **Comment**, **Reassign**, and **Edit** icons

---

## 6. Projects

**Available to:** All roles (edit rights depend on project role)

### 6.1 Project List

`/projects` shows all projects as cards with status, owner, member count, and start/end dates.

**Status colours:**
- Blue — Planning
- Green — Active
- Yellow — On Hold
- Grey — Completed / Archived

### 6.2 Creating a Project

*(Admin / Manager)*

1. Click **New Project**.
2. Fill in: name, description, status, start date, end date, budget (optional).
3. Click **Create**.
4. You are taken to the project detail page.

### 6.3 Project Detail Page

The project page at `/projects/[id]` is divided into tabs:

**Overview**
- Project description, owner, status, date range
- Budget summary (spent vs. allocated)

**Tasks**
- All tasks scoped to this project
- Same filtering options as the main Task Board

**Meetings**
- Meetings tagged to this project

**Members**
- Current project members with their role (Owner / Manager / Member / Viewer)
- *(Admin/Owner)* Add new members: click **Add Member**, search by name, choose role

**Documents**
- Upload or create documents (PDF, Word, etc.)
- Each document has its own version history and approval workflow

**Sprints**
- Create time-boxed sprints, add tasks to a sprint, and mark sprints complete
- Sprint burndown is available in Analytics

**Budget & Expenses**
- Set the project budget
- Log individual expenses with amount, category, and description
- Running total vs. budget shown as a progress bar

**Risk**
- AI-powered risk analysis runs automatically (cron-based)
- Manually log risks with severity and mitigation notes

**Automations**
- Define trigger-action rules scoped to this project (e.g., "When a task moves to Review, notify the project manager")

**Custom Fields**
- *(Admin)* Define extra fields (text, number, date, dropdown) that apply to all tasks in this project

### 6.4 Portfolio View

`/projects/portfolio` shows all projects on a timeline/grid — useful for Admins and Managers to see cross-project capacity and scheduling conflicts.

### 6.5 Standups

Standups can be enabled per project. When enabled, team members receive a daily Slack/email prompt: "What did you do yesterday? What are you doing today? Any blockers?" Responses are compiled by the cron job and posted as a summary to the project channel.

---

## 7. Messaging

**Available to:** All roles

Messaging is available in two ways:
- **Floating chat widget** — a blue button fixed to the bottom-right corner of every page. Click it to open a compact WhatsApp-style panel without leaving your current view.
- **Full-screen page** — navigate to `/messaging` (or click the expand icon in the widget) for the full channel experience.

New messages from other team members appear automatically within ~3 seconds — no page refresh needed.

### 7.1 Floating Chat Widget

The chat widget is accessible from anywhere in the app:

| Element | Description |
|---|---|
| **Blue bubble button** | Opens / closes the chat panel (bottom-right corner) |
| **Red dot badge** | Indicates new messages received while the panel was closed |
| **Channel list** | Tap any channel to open its message thread |
| **Back arrow** | Returns to the channel list from a thread |
| **Expand icon** | Opens the full `/messaging` page |

### 7.2 Channels Sidebar (Full-Screen)

The left panel in `/messaging` lists:
- **Public channels** — visible to all team members
- **Private channels** — invite-only, shown with a lock icon
- **Department channels** — auto-scoped to your department
- **Direct Messages (DMs)** — one-on-one conversations

### 7.3 Sending Messages

1. Click a channel or DM (in the widget or the full-screen page).
2. Type in the message input at the bottom.
3. Press **Enter** to send (or **Shift+Enter** for a new line).

### 7.4 Creating a Channel

1. Click **+** next to "Channels" in the full-screen `/messaging` view.
2. Enter a channel name, choose public or private, select department scope.
3. Add initial members.
4. Click **Create**.

### 7.5 Message Actions

Hover over any message (full-screen view) to reveal the action bar:

| Action | Description |
|---|---|
| **React** | Add an emoji reaction |
| **Reply** | Start or continue a thread |
| **Flag as Idea** | Marks the message for follow-up; visible in your Ideas list |
| **Create Task** | AI extracts an action item from the message text and sends it to Triage |
| **Copy** | Copies message text to clipboard |
| **Delete** | Removes your own message only |

### 7.6 Chat → Task Conversion

When someone posts an action item in chat (e.g., "John can you update the proposal by Friday"):
1. Hover the message → click **Create Task**.
2. The AI extracts: title, suggested assignee, and due date.
3. The task is created in Triage status for a Manager/Admin to approve.

### 7.7 Infinite Scroll History

Scroll up in any channel to load older messages automatically. Date separators mark the start of each day.

---

## 8. Meeting Requests

**Available to:** All roles (Members submit; Managers/Admins review)

### 8.1 Submitting a Request *(Member)*

1. Navigate to `/meeting-requests`.
2. Click **New Request**.
3. Fill in:
   - **Title** — subject of the meeting
   - **Agenda** — what needs to be discussed
   - **Proposed Time** — date and time
   - **Duration** — in minutes
   - **Location** — room name or video link
   - **Attendees** — search and add team members
4. Click **Submit**. Status shows as **Pending**.

### 8.2 Reviewing Requests *(Manager / Admin)*

1. Open `/meeting-requests`.
2. You see all pending requests (Members see only their own).
3. Click a request to open the detail view.
4. Review the agenda and attendees.
5. Click **Approve** or **Reject**.
   - On approval, a Google Calendar event is created and invites are sent automatically.
   - On rejection, enter **Review Notes** explaining why before confirming.

### 8.3 Tracking Status

Requests move through: **Pending → Approved / Rejected**. The requester receives a notification either way.

---

## 9. People & Workload

**Available to:** All roles (Admin can edit profiles)

### 9.1 Team Grid

`/people` displays every team member as a card showing:
- Avatar, name, role, department
- Active task count
- Completion progress bar (tasks done this month)

Use the **Department** filter dropdown to narrow by team.

### 9.2 Individual Profile Page

Click any team member to open `/people/[id]`:

- **Avatar, name, role, department, email**
- **Active Tasks** — up to 5 current tasks with status and due date
- **Monthly Completion Count** — tasks completed this calendar month
- **Channel Memberships** — which messaging channels they belong to
- *(Admin only)* **Edit Role and Department** — change their assigned role or move them to a different department

### 9.3 Workload View

`/people/workload` shows all assignees ranked by current task load. Useful for balancing work before assigning new tasks. Displays:
- Total active tasks per person
- Breakdown by priority
- Overdue count
- Average completion rate

---

## 10. Goals & OKRs

**Available to:** All roles

### 10.1 Goal Hierarchy

Goals are structured in three levels:
1. **Company Goals** — set by Admin, visible to everyone
2. **Department Goals** — owned by a Manager, scoped to a team
3. **Individual Goals** — personal targets for a single team member

A goal can have child goals, creating a hierarchy that rolls up progress automatically.

### 10.2 Creating a Goal

1. Navigate to `/goals`.
2. Click **New Goal**.
3. Fill in: title, description, level (company/department/individual), owner, start date, end date, parent goal (optional).
4. Click **Create**.

### 10.3 Key Results

Each goal has Key Results (KRs) that measure progress.

**To add a Key Result:**
1. Open a goal.
2. Click **+ Add Key Result**.
3. Enter: title, metric type (Boolean / Percentage / Numeric), target value.
4. Click **Save**.

**Updating KR Progress:**
1. Open the KR.
2. Enter the current value in the **Progress** field.
3. The parent goal's progress percentage updates automatically.

### 10.4 Linking Tasks to Goals

From any task's detail panel:
1. Scroll to **Goal Links**.
2. Click **+ Link Goal**.
3. Search for and select the goal.

Completing linked tasks contributes to the KR's progress (if metric type is numeric or percentage).

### 10.5 Goal Status

Change a goal's status using the dropdown:
- **Active** — in progress
- **On Hold** — paused
- **Completed** — target reached
- **Archived** — no longer tracked

### 10.6 Check-In Reminders

The system sends automated weekly check-in reminders to goal owners to update their KR progress. Owners receive a notification with a direct link to the KR update form.

---

## 11. Analytics

**Available to:** All roles

### 11.1 Summary Metrics

At the top of `/analytics`:
- Total tasks in the system
- Completed tasks (all time)
- Overdue tasks (right now)
- Meetings this month

### 11.2 Status Breakdown

A bar chart showing how many tasks are in each stage: Triage → To Do → In Progress → Review → Done. Useful for spotting bottlenecks (e.g., a large Review pile means reviewers are a constraint).

### 11.3 Priority Breakdown

Pie chart of tasks by priority. A large Critical or High slice is a signal to reprioritize.

### 11.4 Assignee Workload

Top 12 team members shown with:
- Total active tasks
- Completion rate (% of assigned tasks completed)

Use this to rebalance work before assigning new tasks.

### 11.5 Sprint Burndown

Shows the ideal vs. actual completion line for the current sprint. Available per project.

### 11.6 Velocity

Historical sprint points or task completion counts per sprint period. Use to forecast future sprint capacity.

### 11.7 Cycle Time

Average time a task spends in each column. High cycle time in a specific column identifies the bottleneck stage.

### 11.8 Insights & Recommendations

AI-generated plain-English insights based on current data, e.g.:
- "3 tasks assigned to Maria are overdue. Consider reassigning one."
- "Sprint velocity has dropped 20% over the last two sprints."

### 11.9 Daily Report History

A log of automatically generated daily reports showing task activity trends over time.

---

## 12. Timesheets

**Available to:** All roles

### 12.1 Logging Time

Time entries are logged from within a Task:
1. Open any task on the Task Board.
2. Scroll to **Time Entries** in the detail panel.
3. Click **Log Time**.
4. Enter hours, date, and an optional note.
5. Click **Save**.

### 12.2 Timesheet View

`/timesheets` aggregates all time entries:
- Filter by **person**, **project**, or **date range**
- Total hours and calculated cost (if hourly rate is set in Preferences)

### 12.3 Setting Your Hourly Rate

1. Go to **Settings → Preferences**.
2. Enter your **Hourly Rate**.
3. Save. The rate is used in timesheet cost calculations and project budget tracking.

### 12.4 Reports

*(Manager / Admin)*

`/reports/time` generates a breakdown of logged hours by person and project. Useful for billing clients or reviewing team capacity usage. Reports can be saved for repeated use.

---

## 13. Settings

**Available to:** Admin (full), Manager (limited), Member (own preferences only)

### 13.1 General

- **Company name** and **timezone** *(Admin only)*
- **Your account**: update display name and avatar

### 13.2 Team *(Admin only)*

**View all team members** with their role and department.

**Create a new team member:**
1. Click **Invite Member**.
2. Enter: full name, email, password (temporary), role, department.
3. Click **Create**. The user can sign in immediately and change their password.

**Edit a member:**
- Click the member's row to open their profile.
- Change role or department from the edit form.

### 13.3 Departments *(Admin only)*

Departments group team members and scope messaging channels.

**Create a department:**
1. Click **New Department**.
2. Enter name and choose a colour.
3. Save.

**Edit / Delete:**
- Click the department row → edit inline or click **Delete**.
- The member count shown helps you avoid accidentally deleting an active department.

### 13.4 Appearance

Choose your colour scheme:
- **Light** — bright background
- **Dark** — dark background
- **System** — follows your OS setting

The preference is saved per user and applies immediately.

### 13.5 Preferences

- **Daily Report Email** — toggle to receive an automated daily summary email each morning
- **Hourly Rate** — your billing rate for timesheet cost calculations

---

## 14. Role Permissions Reference

The table below summarises which actions are available per role. "Own" means only records they created or are assigned to.

| Feature | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| View Dashboard | Yes | Yes | Yes | Yes |
| View Meetings | All | All | Own/Attended | All (read) |
| Create Meeting from Notes | Yes | Yes | Yes | No |
| Approve Meeting Minutes | Yes | Yes | No | No |
| Access Triage Queue | Yes | Yes | No | No |
| Approve/Reject Tasks | Yes | Yes | No | No |
| Create Tasks | Yes | Yes | Yes | No |
| Edit Any Task | Yes | Yes | Own | No |
| Delete Tasks | Yes | Yes | Own | No |
| Create Projects | Yes | Yes | No | No |
| Manage Project Members | Yes | Owner/Manager | No | No |
| Submit Meeting Request | Yes | Yes | Yes | No |
| Approve Meeting Request | Yes | Yes | No | No |
| Create Channels | Yes | Yes | Yes | No |
| Delete Messages | Yes | Yes | Own | No |
| Create Task from Message | Yes | Yes | Yes | No |
| View Analytics | Yes | Yes | Yes | Yes |
| Create Goals | Yes | Yes | No | No |
| Update Key Results | Yes | Yes | Yes | No |
| Manage Team Members | Yes | No | No | No |
| Manage Departments | Yes | No | No | No |
| Manage Automations | Yes | Yes | No | No |
| Export Tasks | Yes | Yes | Yes | No |
| Import Tasks | Yes | Yes | No | No |
| View Workload | Yes | Yes | Yes | Yes |
| Edit User Profiles | Yes | No | Own | No |

---

## Appendix: Automated Notifications

MeetPlanner sends automatic notifications for:

| Trigger | Who is notified |
|---|---|
| Task assigned to you | Assignee |
| Task overdue | Assignee + their Manager |
| Triage task waiting for review | All Managers/Admins |
| Meeting request submitted | All Managers/Admins |
| Meeting request approved/rejected | Requester |
| Meeting minutes ready for approval | Assigned Manager |
| Meeting minutes distributed | All attendees |
| Milestone due in 2 days | Task assignee |
| OKR weekly check-in | Goal owners |
| Daily digest (if enabled) | Each user |
| Sprint burndown alert | Project Managers |
| Project risk detected | Project owner |
