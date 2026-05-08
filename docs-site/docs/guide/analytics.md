---
id: analytics
title: Analytics
description: Burndown, velocity, cycle time, workload charts, and AI-generated insights.
sidebar_position: 9
---

# Analytics

Analytics gives you a quantitative view of how your team is performing. All charts update in real time as tasks move through the board.

**Available to:** All roles

---

## Summary Metrics

Four headline numbers appear at the top:

| Metric | Description |
|---|---|
| **Total Tasks** | All tasks in the system |
| **Completed Tasks** | Tasks in Done state (all time) |
| **Overdue Tasks** | Tasks past their due date right now |
| **Meetings This Month** | Meeting records created in the current calendar month |

---

## Status Breakdown

A bar chart showing how many tasks are in each stage:

```
Triage → To Do → In Progress → Review → Done
```

**What to look for:** A large pile in **Review** typically means reviewers are a bottleneck. A large **To Do** pile may mean tasks aren't being started.

---

## Priority Breakdown

A pie chart of tasks by priority (Critical / High / Normal / Low).

**What to look for:** If Critical or High makes up the majority, the team may be over-triaging — or genuinely overloaded.

---

## Assignee Workload

The top 12 team members shown with:
- Total active tasks
- Completion rate (percentage of assigned tasks completed)

Use this before assigning new tasks to avoid overloading specific people.

---

## Sprint Burndown

Shows the ideal vs. actual completion line for a sprint.

- **Ideal line**: straight diagonal from sprint start (all tasks open) to sprint end (all tasks done)
- **Actual line**: real task completions over time

If the actual line is above the ideal, you're behind. If below, you're ahead.

Available per project under the **Sprints** tab and aggregated here.

---

## Velocity

Historical sprint points or task completion counts per sprint period.

Use velocity to forecast how much work can fit in a future sprint. A consistent velocity means predictable delivery; a dropping velocity needs investigation.

---

## Cycle Time

The average time a task spends in each column (To Do → In Progress → Review → Done).

| High cycle time in... | Likely cause |
|---|---|
| **In Progress** | Tasks are too large; complexity is being underestimated |
| **Review** | Review bandwidth is too low |
| **To Do** | Tasks are not being picked up; priority may not be clear |

---

## Insights & Recommendations

AI-generated plain-English summaries appear at the bottom of the Analytics page, for example:

- *"3 tasks assigned to Ali are overdue. Consider reassigning one."*
- *"Sprint velocity has dropped 20% over the last two sprints."*
- *"The Engineering team has 12 critical-priority tasks — the highest across all departments."*

These refresh automatically with each data update.

---

## Daily Report History

A historical log of automatically generated daily reports showing task activity trends over time. Each report captures a snapshot of tasks created, completed, and overdue on that day.
