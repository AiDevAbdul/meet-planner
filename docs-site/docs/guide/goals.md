---
id: goals
title: Goals & OKRs
description: Set company, department, and individual goals with Key Results and task linkage.
sidebar_position: 8
---

# Goals & OKRs

Goals connect day-to-day tasks to the bigger picture. MeetPlanner uses the OKR (Objectives and Key Results) framework at three levels.

**Available to:** All roles (Members can update Key Results; only Admins/Managers can create goals)

---

## Goal Hierarchy

```
Company Goals
  └── Department Goals
        └── Individual Goals
```

Progress rolls up: Individual → Department → Company. A child goal can also be linked to a parent goal so completing it drives the parent's progress automatically.

---

## Creating a Goal

:::note
Admin and Manager only.
:::

1. Navigate to `/goals`.
2. Click **New Goal**.
3. Fill in:

| Field | Description |
|---|---|
| **Title** | Clear statement of the objective |
| **Description** | Context and motivation |
| **Level** | Company / Department / Individual |
| **Owner** | Person responsible for this goal |
| **Start Date / End Date** | Goal time horizon |
| **Parent Goal** | Optional — link to a parent goal for roll-up |

4. Click **Create**.

---

## Key Results

Key Results are the measurable outcomes that define whether a goal was achieved.

### Adding a Key Result

1. Open a goal.
2. Click **+ Add Key Result**.
3. Enter:

| Field | Options |
|---|---|
| **Title** | What is being measured |
| **Metric Type** | Boolean (yes/no), Percentage (0–100%), Numeric (any number) |
| **Target Value** | The value you're aiming to reach |

4. Click **Save**.

### Updating Progress

1. Open the goal → click a Key Result.
2. Enter the **current value** in the progress field.
3. Save.

The parent goal's overall progress percentage recalculates automatically based on all its Key Results.

---

## Goal Status

Use the **Status** dropdown on any goal to reflect its current state:

| Status | Meaning |
|---|---|
| **Active** | In progress |
| **On Hold** | Temporarily paused |
| **Completed** | Target reached |
| **Archived** | No longer tracked |

---

## Linking Tasks to Goals

From any task's detail panel:

1. Scroll to **Goal Links**.
2. Click **+ Link Goal**.
3. Search for and select the relevant goal.

Completing tasks linked to a numeric or percentage Key Result contributes toward that KR's progress automatically.

---

## Weekly Check-In Reminders

MeetPlanner sends goal owners an automated weekly check-in notification. The notification includes a direct link to update their KR progress — keeping goals fresh without requiring manual follow-up.

---

## Tips

- **One owner per goal** — clear ownership prevents goals from going stale.
- **3–5 Key Results per goal** is the recommended range. Too many KRs dilute focus.
- **Link your tasks** — tasks that don't connect to any goal are invisible to goal tracking. Link them to ensure your work shows up in the progress view.
- **Archive completed goals** — don't delete them; archived goals contribute to the historical analytics view.
