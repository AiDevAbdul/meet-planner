---
id: timesheets
title: Timesheets
description: Log time against tasks, set your hourly rate, and generate billing reports.
sidebar_position: 10
---

# Timesheets

Timesheets let you track how long your team spends on tasks. Time entries feed into project cost calculations and billing reports.

**Available to:** All roles

---

## Logging Time

Time is logged from inside a task, not from the Timesheets page directly.

1. Open any task on the Task Board.
2. Scroll to **Time Entries** in the detail panel.
3. Click **Log Time**.
4. Enter:

| Field | Description |
|---|---|
| **Hours** | How long you worked (decimals accepted, e.g. 1.5) |
| **Date** | The date the work was done |
| **Note** | Optional description of what you did |

5. Click **Save**. The entry appears under Time Entries on the task.

---

## Timesheet View

`/timesheets` aggregates all time entries across the team.

**Filters available:**

| Filter | Description |
|---|---|
| **Person** | Show one team member's entries |
| **Project** | Filter to a specific project |
| **Date Range** | Set a custom start and end date |

The summary row at the top shows:
- **Total hours** in the filtered period
- **Estimated cost** (hours × hourly rate, if set)

---

## Setting Your Hourly Rate

Your hourly rate is used to calculate the cost of your time entries.

1. Go to **Settings → Preferences**.
2. Enter your **Hourly Rate** (in your local currency).
3. Save.

:::note
Hourly rates are visible only to Admins and Managers when viewing team timesheets. Members can only see their own rate.
:::

---

## Time Reports *(Manager / Admin)*

`/reports/time` generates a detailed breakdown:
- Hours logged per person
- Hours logged per project
- Cost breakdown (if hourly rates are set)
- Filterable by date range

Reports can be **saved** for repeated use — useful for recurring client billing cycles.

---

## Tips

- **Log time daily** — logging as you go is more accurate than reconstructing a week at the end.
- **Use the note field** — a brief note (e.g., "client call review") makes reports much more useful when billing clients.
- **Managers: review before billing** — check the time report against project budgets before sending invoices.
