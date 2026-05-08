---
id: projects
title: Projects
description: Portfolio view, sprints, budgets, documents, risk tracking, and project automations.
sidebar_position: 4
---

# Projects

Projects group related tasks, meetings, documents, and budgets under a single container. Use them for any body of work that has a defined scope and timeline.

**Available to:** All roles (edit rights depend on your role within the project)

---

## Project List

`/projects` shows all projects as cards:

| Field | Notes |
|---|---|
| **Status colour** | Blue = Planning, Green = Active, Yellow = On Hold, Grey = Completed/Archived |
| **Owner** | The person responsible for the project |
| **Members** | Count of team members assigned |
| **Dates** | Start and end date range |

---

## Creating a Project

:::note
Admin and Manager only.
:::

1. Click **New Project**.
2. Fill in: name, description, status, start date, end date, budget (optional).
3. Click **Create**. You are taken to the project detail page.

---

## Project Detail Page

The detail page at `/projects/[id]` is organised into tabs.

### Overview

- Project description, owner, and status
- Date range (start → end)
- Budget summary: spent vs. allocated shown as a progress bar

### Tasks

All tasks scoped to this project, with the same filtering options as the main Task Board.

### Meetings

Meetings tagged to this project. Click any row to open the meeting detail page.

### Members

Current project members with their project role:

| Project Role | Description |
|---|---|
| **Owner** | Full control, can add/remove members |
| **Manager** | Can edit tasks and approve content |
| **Member** | Can create and update tasks |
| **Viewer** | Read-only access |

**To add a member** *(Admin / Project Owner)*:
1. Click **Add Member**.
2. Search by name or email.
3. Choose a project role.
4. Click **Add**.

### Documents

Upload or create documents associated with this project.

**To upload a document:**
1. Click **Upload Document**.
2. Select a file (PDF, Word, etc.).
3. The document appears in the list with a version number.

Each document has:
- **Version history** — see previous versions and restore if needed
- **Approval workflow** — submit for Manager approval before distributing

### Sprints

Organise work into time-boxed sprints.

**To create a sprint:**
1. Click **+ New Sprint**.
2. Set a name, start date, and end date.
3. Add tasks to the sprint by clicking **Add Tasks**.

**To complete a sprint:**
1. Open the sprint.
2. Click **Complete Sprint**.
3. Any incomplete tasks are moved back to the backlog automatically.

Sprint burndown data is available in [Analytics](/docs/guide/analytics).

### Budget & Expenses

**Set project budget:**
1. Click **Set Budget** on the Overview tab.
2. Enter the total budget amount.

**Log an expense:**
1. Go to the **Budget** tab.
2. Click **+ Add Expense**.
3. Enter: amount, category, description, date.
4. Save.

The running total vs. budget updates in real time. A warning appears when expenses exceed 80% of budget.

### Risk

The risk tab contains AI-generated and manually logged risks.

**AI risk analysis** runs automatically on a schedule and flags:
- Overdue tasks with no update
- Budget overrun trajectory
- Missing assignees on upcoming milestones

**To log a risk manually:**
1. Click **+ Add Risk**.
2. Enter: title, severity (Low / Medium / High / Critical), description, and mitigation notes.

### Automations

Define trigger-action rules scoped to this project, e.g.:
- "When a task moves to Review → notify the project manager"
- "When a task is overdue by 2 days → send a reminder to the assignee"

**To create an automation:**
1. Click **+ New Automation**.
2. Choose a **trigger** (task status change, due date approaching, etc.).
3. Choose an **action** (send notification, move task, etc.).
4. Save.

:::note
Automations require Admin or Manager role on the project.
:::

### Custom Fields

Admin can define extra fields that apply to all tasks within this project.

**Field types:** text, number, date, dropdown.

**To add a custom field:**
1. Click **+ Add Custom Field**.
2. Choose a type, enter a name, and save.

The field appears in the task detail panel for every task in this project.

---

## Portfolio View

`/projects/portfolio` shows all projects on a timeline grid. Use it to:
- Spot overlapping timelines between projects
- Identify which team members are stretched across multiple active projects
- Plan new project start dates around existing commitments

---

## Standups

Standups can be enabled per project. When enabled:

1. Team members receive a daily prompt via email: *"What did you do yesterday? What are you doing today? Any blockers?"*
2. Responses are compiled automatically.
3. A summary is posted to the project's channel each morning.

To enable standups, open the project **Overview** and toggle **Enable Standups**.

:::note
Standup prompts and summaries are delivered via **in-app notifications and email** — not Slack.
:::
