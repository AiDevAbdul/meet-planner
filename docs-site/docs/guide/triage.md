---
id: triage
title: Triage Queue
description: Review and approve AI-extracted tasks before they reach the team board.
sidebar_position: 12
---

# Triage Queue

The Triage Queue is the quality gate between raw AI extraction and tasks appearing on the team board.

**Available to:** Admin, Manager only

:::info Why triage?
When AI extracts tasks from meeting notes or chat messages they land in **Triage** status. They are invisible to Members until a Manager or Admin reviews them. This prevents incorrect or duplicate tasks from cluttering the team board.
:::

---

## Opening the Queue

Navigate to `/triage` from the sidebar. Tasks are grouped by their source meeting so you can review them in context.

---

## Reviewing a Task

For each task in the queue you can:

1. **Edit inline** — click the title, assignee, priority, or due date fields to correct any AI extraction errors before approving.
2. **Approve** — the task moves to **To Do** on the Task Board and becomes visible to the assigned member.
3. **Reject** — the task is discarded and removed from the system.

---

## Bulk Actions

1. Select multiple tasks using the checkboxes on the left of each row.
2. Use **Approve Selected** or **Reject Selected** from the toolbar.

This is the fastest way to clear a large backlog from a long meeting.

---

## Empty State

When all tasks have been reviewed you'll see an "All caught up" screen. There is nothing else to action until new meeting notes are processed.

---

## Tips for Managers

- **Check triage after every team meeting** — tasks won't reach the board until you review them.
- **Fix assignees here** — the AI uses attendee names to suggest assignees but may guess wrong. Correct them before approving rather than reassigning later.
- **Use due date fields** — if the meeting mentioned a deadline, the AI will pre-fill it. Verify it makes sense relative to today's date.
- **Reject duplicates** — if the same action item was extracted twice from the same meeting, reject the duplicate.
