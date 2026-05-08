---
id: settings
title: Settings
description: Manage your team, departments, notifications, integrations, and personal preferences.
sidebar_position: 11
---

# Settings

Settings is divided into tabs. What you can configure depends on your role.

---

## General

**Available to:** All roles (Admin can edit company settings)

| Setting | Who can edit |
|---|---|
| **Company name** | Admin only |
| **Timezone** | Admin only |
| **Your display name** | Anyone (own only) |
| **Your avatar** | Anyone (own only) |

---

## Team *(Admin only)*

View all team members with their role and department.

### Creating a new team member

1. Click **Invite Member**.
2. Fill in:

| Field | Description |
|---|---|
| **Full Name** | Display name |
| **Email** | Must be on your company domain |
| **Password** | Temporary password — the user should change it on first login |
| **Role** | Admin / Manager / Member / Viewer |
| **Department** | Which team they belong to |

3. Click **Create**. The user can sign in immediately.

### Editing a member

Click any member row → change their role or department in the edit form → save.

:::warning
Role changes take effect immediately. Be careful when granting Admin or Manager access.
:::

---

## Departments *(Admin only)*

Departments group team members and scope messaging channels.

### Creating a department

1. Click **New Department**.
2. Enter a name.
3. Choose a colour (used as the department badge colour throughout the app).
4. Save.

### Editing a department

Click the department row → edit the name or colour inline → save.

### Deleting a department

1. Click the department row → click **Delete**.
2. A member count is shown. If members are assigned to this department, reassign them first.

:::danger
Deleting a department is permanent. Members in that department are not deleted — they lose their department assignment and need to be reassigned.
:::

---

## Appearance

Choose your colour scheme. The preference is saved per user and applies immediately.

| Option | Description |
|---|---|
| **Light** | White background, standard colours |
| **Dark** | Dark background, adjusted accent colours |
| **System** | Follows your operating system's setting |

---

## Notifications

**Available to:** All roles

Control which automated communications you receive.

### Daily Progress Report

An AI-generated summary email sent every day at **5:00 PM** covering team task progress.

:::note
Daily reports are sent to **Managers and Admins only**. The toggle is visible to Members but has no effect.
:::

Toggle it on or off under **Settings → Notifications**.

### Push Notifications *(browser support required)*

Get notified about task assignments, overdue tasks, and meeting start times even when the MeetPlanner tab is not open.

1. Go to **Settings → Notifications**.
2. Toggle **Push Notifications** on.
3. Your browser will request permission — click **Allow**.
4. Push notifications are now active in this browser.

To disable, toggle the switch off. This unregisters the current browser; other devices are unaffected.

:::note
Push notifications require a modern browser with service worker support (Chrome, Edge, Safari 16.4+, Firefox). The toggle only appears when your browser supports it.
:::

---

## Integrations *(Admin only)*

### GitHub

Connect a GitHub organisation to enable automatic task closing from pull requests.

**Setup:**

1. Go to **Settings → Integrations**.
2. Click **Connect GitHub**.
3. Authorise MeetPlanner in the GitHub OAuth flow.
4. Copy the webhook URL shown after connecting.
5. In your GitHub repository → **Settings → Webhooks**, add the copied URL with `Content-Type: application/json` and select the **Pull requests** event.

**Auto-closing tasks:**

Add a reference to the task UUID in your PR description:

```
Closes: <task-uuid>
```

When the PR is merged, MeetPlanner moves the linked task to **Done** automatically. The task UUID is visible in the task detail panel URL (`/tasks?task=<uuid>`).

**To disconnect:**

Click **Disconnect** on the Integrations tab. Existing task links are preserved but no new auto-closes will fire.

---

## Preferences

| Setting | Description |
|---|---|
| **Hourly Rate** | Your billing rate, used in timesheet cost calculations |

Changes save automatically when you leave each field.
