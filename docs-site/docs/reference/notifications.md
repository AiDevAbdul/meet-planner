---
id: notifications
title: Automated Notifications
description: Complete list of every automated notification MeetPlanner sends and who receives it.
sidebar_position: 2
---

# Automated Notifications

MeetPlanner sends notifications automatically based on system events. This page lists every trigger, who is notified, and the delivery channel.

---

## Task Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| Task assigned to you | Assignee | In-app + email |
| Task overdue | Assignee + their Manager | In-app + email |
| Task due in 24 hours | Assignee | In-app |
| Comment added to your task | Task owner + assignee | In-app |
| Task approved from triage | Assignee | In-app |
| Subtask completed | Parent task owner | In-app |
| Dependency unblocked | Waiting task's assignee | In-app |

---

## Milestone Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| Milestone due in 2 days | Task assignee | In-app + email |
| Milestone overdue | Task assignee + project manager | In-app + email |
| Milestone completed | Project owner | In-app |

---

## Meeting Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| New meeting notes added | All managers and admins | In-app |
| Triage tasks waiting for review | All managers and admins | In-app |
| Meeting minutes submitted for approval | Assigned manager | In-app + email |
| Meeting minutes approved | Minutes author | In-app |
| Meeting minutes distributed | All meeting attendees | Email |
| Meeting reminder (1 hour before) | All attendees | In-app + email |

---

## Meeting Request Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| New meeting request submitted | All managers and admins | In-app |
| Meeting request approved | Requester | In-app + email |
| Meeting request rejected | Requester | In-app + email (with review notes) |

---

## Project Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| Project risk detected | Project owner | In-app + email |
| Budget exceeds 80% | Project owner + admin | In-app + email |
| Sprint nearing end (2 days) | Project manager | In-app |
| You are added to a project | New project member | In-app |

---

## Goal & OKR Notifications

| Trigger | Who is notified | Channel |
|---|---|---|
| Weekly OKR check-in reminder | All goal owners | In-app + email |
| Goal completed | Goal owner + company admins | In-app |
| Key Result progress updated | Parent goal owner | In-app |

---

## Digest Emails

These are scheduled email summaries. They are opt-in and can be toggled in **Settings → Preferences**.

| Digest | Frequency | Contains |
|---|---|---|
| **Daily Report** | Every weekday morning | Your overdue tasks, tasks due today, recent team activity |
| **Weekly Digest** | Monday morning | Last week's completed tasks, upcoming milestones, goal progress |
| **Standup Summary** | Daily (if standup is enabled per project) | Team standup responses compiled into one message |

---

## Push Notifications (PWA)

MeetPlanner is a Progressive Web App (PWA). When you enable push notifications in **Settings → Notifications**, your browser receives push alerts even when the app tab is closed.

Push notifications fire for the same triggers as in-app notifications:
- Task assigned to you
- Task overdue
- Task due today
- Meeting starting in 1 hour
- Triage tasks waiting (Managers/Admins only)

**Requirements:** Chrome, Edge, Firefox, or Safari 16.4+. The toggle only appears when your browser supports push notifications.

**Manage subscriptions:** Each browser/device is registered independently. Toggling push off on your laptop does not affect your phone.

---

## Managing Notifications

To view all notifications, click the **bell icon** in the top navigation bar.

- Click a notification to navigate directly to the relevant item.
- Click **Mark All as Read** to clear all badges at once.

To disable daily or weekly digest emails, go to **Settings → Preferences** and toggle the relevant switches off.
