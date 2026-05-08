---
id: people
title: People & Workload
description: Browse the team directory, view individual profiles, and balance workload across members.
sidebar_position: 7
---

# People & Workload

The People section is your team directory. It shows who's on the team, what they're working on, and how loaded each person is.

**Available to:** All roles (Admins can edit profiles)

---

## Team Grid

`/people` displays every team member as a card:

| Field | Description |
|---|---|
| **Avatar** | Profile photo or initials |
| **Name, Role, Department** | Their position in the org |
| **Active Task Count** | How many tasks are currently assigned to them |
| **Completion Bar** | Percentage of assigned tasks completed this month |

Use the **Department** filter dropdown at the top to narrow the grid to a specific team.

---

## Individual Profile Page

Click any team member card to open `/people/[id]`:

- **Avatar, name, role, department, email**
- **Active Tasks** — up to 5 current tasks, shown with status and due date
- **Monthly Completion Count** — how many tasks they've completed this calendar month
- **Channel Memberships** — which messaging channels they belong to

### Editing a Profile *(Admin only)*

1. Open the person's profile.
2. Click **Edit**.
3. Change their **role** (Admin / Manager / Member / Viewer) or **department**.
4. Save.

:::warning
Changing a role takes effect immediately. A member promoted to Manager will gain access to the Triage Queue and approval workflows right away.
:::

---

## Workload View

`/people/workload` shows all assignees ranked by current task load.

| Column | Description |
|---|---|
| **Name / Department** | Team member identity |
| **Active Tasks** | Total tasks in To Do, In Progress, or Review |
| **By Priority** | Breakdown: Critical / High / Normal / Low |
| **Overdue** | Tasks past their due date |
| **Completion Rate** | % of assigned tasks completed overall |

Use this view **before assigning new tasks** to ensure work is balanced across the team. A high overdue count is a signal that someone needs support or reassignment.

---

## Tips

- **Check workload before triage** — when approving tasks, use the workload view to assign them to the least loaded relevant person.
- **Department filter** — if you manage a specific team, filter by your department to focus on your people.
- **Admin profile edits** — department changes affect which channels a member is auto-included in.
