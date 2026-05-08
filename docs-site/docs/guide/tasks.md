---
id: tasks
title: Task Board
description: The full five-column Kanban board with subtasks, dependencies, milestones, and time tracking.
sidebar_position: 3
---

# Task Board

The Task Board is where all approved work lives. It uses a five-column Kanban layout.

**Available to:** All roles

---

## Board Layout

```
Triage → To Do → In Progress → Review → Done
```

| Column | Description |
|---|---|
| **Triage** | AI-extracted tasks pending manager approval (Admin/Manager only) |
| **To Do** | Approved tasks ready to start |
| **In Progress** | Work actively underway |
| **Review** | Work submitted for review or QA |
| **Done** | Completed tasks |

---

## Creating a Task Manually

1. Click **+ New Task** (top-right of any column, or the main toolbar button).
2. Fill in: title, description, assignee, priority, due date.
3. Click **Create**. The task appears in **To Do**.

---

## Moving Tasks

**Drag and drop** a card to a new column to update its status instantly.

Alternatively, open the task detail panel and change the **Status** dropdown.

---

## Quick Actions on Cards

Hover over any card to reveal:

| Action | What it does |
|---|---|
| **Start Task** | Moves to In Progress and logs the start time |
| **Mark Done** | Moves directly to Done |
| **Comment** | Opens the comments thread |
| **Reassign** | Changes the assignee |

---

## Task Detail Panel

Click any task card to open the detail slide-over on the right. Everything about a task lives here.

### Core fields

| Field | Notes |
|---|---|
| **Title / Description** | Editable inline |
| **Assignee** | Reassign to any team member |
| **Priority** | Critical / High / Normal / Low |
| **Status** | All five stages |
| **Due Date** | Date picker |

### AI Assignee Suggestion

Click **Suggest Assignee** on any task and the AI will recommend the best team member based on department, workload, and past similar tasks.

### Comments

Add a comment at the bottom of the detail panel. Comments show user avatars and timestamps. Useful for questions, blockers, or status updates that don't need a separate message.

### Subtasks

Break a task into smaller checklist items:

1. Scroll to **Subtasks** in the detail panel.
2. Click **+ Add Subtask**.
3. Enter a title and press Enter.

Subtasks show a completion counter on the parent card (e.g., "2 / 5").

### Dependencies

Mark tasks that must be completed before this one can start:

1. Scroll to **Dependencies**.
2. Click **+ Add Dependency**.
3. Search for and select the blocking task.

A dependency warning badge appears on the card if the blocking task is not yet done.

### Milestones

Track key checkpoints within a task:

1. Scroll to **Milestones**.
2. Click **+ Add Milestone** to create one manually.
3. Or click **Generate Milestones** — the AI will suggest checkpoints based on the task title and description.

### Time Entries

Log how long you spent on a task:

1. Scroll to **Time Entries**.
2. Click **Log Time**.
3. Enter hours, date, and an optional note.
4. Save.

Time entries feed into [Timesheets](/docs/guide/timesheets).

### Task Timer

For real-time tracking, use the built-in timer instead of logging manually:

1. Open the task detail panel.
2. Click the **Start Timer** button (clock icon, top of the panel).
3. The timer starts and a live pill appears in the **top navigation bar** showing the elapsed time and task title.
4. Click **Stop** in the topbar pill (or reopen the task and click **Stop Timer**) when you're done.
5. A time entry is created automatically with the elapsed minutes.

:::tip
Only one timer can run at a time. Starting a timer on a second task stops the first and logs its time automatically.
:::

### Goal Links

Connect this task to a company or team OKR:

1. Scroll to **Goal Links**.
2. Click **+ Link Goal**.
3. Search for and select the goal.

Completing the task contributes to the linked goal's Key Result progress.

### Custom Fields

If your Admin has defined custom fields for the project, they appear here. Fill them in as required.

---

## Filtering the Board

Use the filter bar above the board to narrow tasks:

| Filter | Options |
|---|---|
| **Assignee** | Show one person's tasks only |
| **Priority** | Critical, High, Normal, Low |
| **Department** | Filter by team |
| **Status** | Show/hide specific columns |

---

## Bulk Operations

| Action | How |
|---|---|
| **Export to CSV/Excel** | Click **Export** in the top toolbar, choose format |
| **Import from CSV/Excel** | Click **Import**, upload your file, map columns |

:::note Import roles
Only Admins and Managers can import tasks in bulk.
:::
