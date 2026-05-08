---
id: meetings
title: Meetings
description: Add meeting notes, let AI extract tasks and decisions, and manage meeting minutes.
sidebar_position: 2
---

# Meetings

Meetings are the core input source in MeetPlanner. You add notes or a transcript and the AI extracts tasks, decisions, and attendees automatically.

**Available to:** All roles (Admins/Managers see all meetings; Members see meetings they attended or created)

---

## Meeting List

`/meetings` shows all meetings with:
- Title, date, and source badge
- Number of extracted tasks and decisions
- Pagination at the bottom

**Source badges:**

| Badge | Meaning |
|---|---|
| Gmail | Ingested automatically via Gmail push notification |
| Manual | Created by pasting text or uploading a file |
| Google Meet | Linked from a Google Meet session |

---

## Adding Meeting Notes

### Option A — Paste text

1. Click **New Meeting** (top-right).
2. Select **Paste Notes**.
3. Paste your meeting transcript or notes.
4. Click **Extract Tasks**.
5. Review the extracted data and click **Save Meeting**.

### Option B — Upload a file

1. Click **New Meeting → Upload File**.
2. Drag and drop a `.pdf`, `.docx`, or `.txt` file.
3. Click **Extract**. The AI reads the document and returns structured output.

### Option C — Gmail (automatic)

When Gmail push notifications are configured by your Admin, meeting-related emails are ingested and processed automatically. No manual step needed.

:::note
Newly extracted tasks land in **Triage** status and are not visible to Members until a Manager or Admin approves them. See [Triage Queue](/docs/guide/triage).
:::

---

## Meeting Detail Page

Each meeting at `/meetings/[id]` is divided into sections:

| Section | What's inside |
|---|---|
| **AI Summary** | One-paragraph overview of what was discussed |
| **Decisions** | Bullet list of explicit decisions made |
| **Attendees** | People present, linked to their team profiles |
| **Extracted Tasks** | Action items with assignee, priority, and due date |
| **Meeting Minutes** | Full minutes with an approval and distribution workflow |

---

## Meeting Minutes Workflow

Minutes follow a four-step process:

```
Draft → Submit for Approval → Approve → Distribute
```

### Step 1 — Draft

Any attendee can create minutes on the meeting detail page by typing directly into the minutes editor.

### Step 2 — Submit for Approval

Click **Submit Minutes** when the draft is ready. The assigned Manager is notified.

### Step 3 — Approve *(Manager / Admin)*

1. Open the meeting.
2. Review the minutes.
3. Click **Approve**.

### Step 4 — Distribute *(Manager / Admin)*

Click **Distribute** to email the approved minutes to all attendees automatically.

:::tip
Minutes cannot be distributed until they are approved. If you need to update minutes after approval, a Manager can re-open them for editing.
:::
