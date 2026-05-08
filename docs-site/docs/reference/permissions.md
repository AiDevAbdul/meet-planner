---
id: permissions
title: Role Permissions
description: Complete reference of what each role can see and do in MeetPlanner.
sidebar_position: 1
---

# Role Permissions Reference

This page is the definitive reference for what each role can see and do. "Own" means only records they created or are assigned to.

---

## Roles at a Glance

| Role | Description |
|---|---|
| **Admin** | Full system access. Manages team, departments, all content. |
| **Manager** | Oversees team work. Approves tasks, requests, and minutes. Sees all analytics. |
| **Member** | Day-to-day contributor. Creates tasks, submits notes, participates in messaging. |
| **Viewer** | Read-only. Cannot create or modify content. |

---

## Detailed Permissions Table

| Feature | Admin | Manager | Member | Viewer |
|---|---|---|---|---|
| **Dashboard** | | | | |
| View Dashboard | Yes | Yes | Yes | Yes |
| **Meetings** | | | | |
| View meetings | All | All | Own / Attended | All (read) |
| Create meeting from notes | Yes | Yes | Yes | No |
| Upload meeting file | Yes | Yes | Yes | No |
| Approve meeting minutes | Yes | Yes | No | No |
| Distribute meeting minutes | Yes | Yes | No | No |
| **Triage** | | | | |
| Access Triage Queue | Yes | Yes | No | No |
| Approve tasks | Yes | Yes | No | No |
| Reject tasks | Yes | Yes | No | No |
| Edit task in triage | Yes | Yes | No | No |
| **Tasks** | | | | |
| View tasks | All | All | All | All |
| Create tasks manually | Yes | Yes | Yes | No |
| Edit any task | Yes | Yes | Own | No |
| Delete tasks | Yes | Yes | Own | No |
| Export tasks to CSV/Excel | Yes | Yes | Yes | No |
| Import tasks from CSV/Excel | Yes | Yes | No | No |
| Log time on a task | Yes | Yes | Yes | No |
| Link task to goal | Yes | Yes | Yes | No |
| **Projects** | | | | |
| View projects | All | All | All | All |
| Create projects | Yes | Yes | No | No |
| Edit project details | Yes | Project Owner/Manager | No | No |
| Manage project members | Yes | Project Owner/Manager | No | No |
| Create sprints | Yes | Yes | No | No |
| Log project expenses | Yes | Yes | No | No |
| Upload documents | Yes | Yes | Yes | No |
| Approve documents | Yes | Yes | No | No |
| Manage project automations | Yes | Yes | No | No |
| Define custom fields | Yes | No | No | No |
| **Messaging** | | | | |
| View channels | Yes | Yes | Yes | Yes |
| Send messages | Yes | Yes | Yes | No |
| Create channels | Yes | Yes | Yes | No |
| Delete messages | Yes | Yes | Own | No |
| Flag message as idea | Yes | Yes | Yes | No |
| Create task from message | Yes | Yes | Yes | No |
| **Meeting Requests** | | | | |
| Submit meeting request | Yes | Yes | Yes | No |
| View all requests | Yes | Yes | Own | No |
| Approve meeting request | Yes | Yes | No | No |
| Reject meeting request | Yes | Yes | No | No |
| **People** | | | | |
| View team directory | Yes | Yes | Yes | Yes |
| View workload page | Yes | Yes | Yes | Yes |
| Edit user role / department | Yes | No | No | No |
| **Goals & OKRs** | | | | |
| View goals | Yes | Yes | Yes | Yes |
| Create goals | Yes | Yes | No | No |
| Edit goal details | Yes | Yes (own) | No | No |
| Update Key Result progress | Yes | Yes | Yes | No |
| Link tasks to goals | Yes | Yes | Yes | No |
| **Analytics** | | | | |
| View analytics | Yes | Yes | Yes | Yes |
| View AI insights | Yes | Yes | Yes | Yes |
| **Timesheets** | | | | |
| Log time entries | Yes | Yes | Yes | No |
| View own timesheet | Yes | Yes | Yes | No |
| View all timesheets | Yes | Yes | No | No |
| Generate time reports | Yes | Yes | No | No |
| **Settings** | | | | |
| Edit company name / timezone | Yes | No | No | No |
| Create team members | Yes | No | No | No |
| Edit team members | Yes | No | No | No |
| Create / edit departments | Yes | No | No | No |
| Delete departments | Yes | No | No | No |
| Edit own preferences | Yes | Yes | Yes | Yes |

---

## Role Changes

Role changes take effect immediately. Contact your Admin if you believe your role is incorrect.

When a member is promoted to **Manager** they immediately gain:
- Access to the Triage Queue
- Ability to approve/reject meeting requests and minutes
- Visibility into all team timesheets
- Access to meeting requests from all team members (not just their own)

When a member is promoted to **Admin** they gain everything above plus:
- Ability to create, edit, and delete team members
- Ability to manage departments
- Access to all system settings
