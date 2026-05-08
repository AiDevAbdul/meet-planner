---
id: intake-forms
title: Intake Forms
description: Create public forms to collect requests from external users, which route directly into the Triage queue.
sidebar_position: 14
---

# Intake Forms

Intake Forms let you collect structured requests from anyone — external clients, other departments, or the public — via a shareable link. Submissions flow straight into the Triage queue for Manager review.

**Available to:** Admin, Manager (create forms)  
**External access:** Anyone with the form link — no account required

---

## What Intake Forms Are For

Common use cases:
- **Bug reports** — a link you paste into a client email or Slack
- **Feature requests** — a form your customers fill in
- **Project briefs** — a structured template for new work requests
- **IT support requests** — a helpdesk intake form for employees who don't use MeetPlanner

---

## Creating a Form *(Admin / Manager)*

1. Navigate to a project → **Intake Forms** tab.
2. Click **+ New Form**.
3. Fill in:

| Field | Description |
|---|---|
| **Name** | The form title shown to submitters |
| **Description** | Optional — context shown under the title |
| **Slug** | URL path — form lives at `/forms/[slug]` |
| **Fields** | The questions on the form |

4. Add fields using the field builder.

---

## Field Types

| Type | Description |
|---|---|
| **Text** | Single-line text input |
| **Textarea** | Multi-line text input (for descriptions, details) |
| **Email** | Email address with format validation |
| **Number** | Numeric input |
| **Select** | Dropdown — define the options list |
| **Checkbox** | Single true/false toggle |
| **Date** | Date picker |

Each field can be marked **Required** to prevent submission if left blank.

---

## Sharing a Form

The form is accessible at:

```
https://your-meetplanner-url.vercel.app/forms/[slug]
```

No sign-in is required. Share this URL in emails, embed it on your website, or include it in client documentation.

---

## How Submissions Work

1. A submitter fills in the form and clicks **Submit**.
2. A new task is created in **Triage** status with:
   - The form name as the task title prefix
   - Field values included in the task description
   - Submitter name and email (if provided)
3. A Manager or Admin reviews it in the [Triage Queue](/docs/guide/triage).
4. On approval, the task appears on the Task Board.

The submitter sees a confirmation screen after submission. They are not notified of approval/rejection (the workflow is internal).

---

## Spam Protection

Forms include a hidden honeypot field. Automated bots that fill in hidden fields are rejected silently. This provides basic protection without requiring CAPTCHAs.

---

## Tips

- **Keep forms short** — ask only what you need to create a well-defined task. Long forms have high abandonment rates.
- **Use the Description field** — give submitters enough context to fill in the form correctly.
- **Set a descriptive slug** — `/forms/bug-report` is clearer than `/forms/form-1`.
- **Check triage regularly** — submissions don't notify specific people, so ensure Managers check the queue daily.
