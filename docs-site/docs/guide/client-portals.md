---
id: client-portals
title: Client Portals
description: Share project status, milestones, and documents with external clients via a branded public portal.
sidebar_position: 13
---

# Client Portals

Client Portals let you share a read-only, branded view of a project with external stakeholders — clients, executives, or partners — without giving them a MeetPlanner account.

**Available to:** Admin, Manager (create and manage portals)  
**External access:** Anyone with the portal link (optionally password-protected)

---

## What Clients See

A portal at `/portal/[slug]` shows:

| Section | Content |
|---|---|
| **Project Status** | Name, status (Planning / Active / On Hold / Completed), description, date range |
| **Progress** | Tasks completed vs. total (percentage bar) |
| **Milestones** | Key checkpoints with status (Pending / In Progress / Completed) and due dates |
| **Updates** | Announcements posted by your team |
| **Documents** | Files your team has shared, with approval controls |

---

## Creating a Portal

1. Open a project at `/projects/[id]`.
2. Go to the **Portal** section (or open the portals API from Settings).
3. Click **Create Portal**.
4. Configure:

| Field | Description |
|---|---|
| **Name** | Portal display name visible to the client |
| **Slug** | URL-friendly identifier — the portal lives at `/portal/[slug]` |
| **Password** | Optional — leave blank for open access, or set a password for private sharing |
| **Logo URL** | Optional — your client's logo for white-labelled appearance |
| **Primary Colour** | Accent colour matching your client's brand |

5. Save and share the portal URL with your client.

---

## Password Protection

If you set a password when creating the portal, clients see a password prompt before the portal loads. They enter it once per browser session.

To remove or change the password, edit the portal settings.

---

## Posting Updates

Keep clients informed with project announcements:

1. Open the portal management page.
2. Click **+ Post Update**.
3. Write your update (supports plain text).
4. Save. The update appears instantly on the portal.

---

## Sharing Documents

Documents added to the project appear in the portal's **Documents** section. Clients can view document titles and request changes or approve them directly from the portal.

---

## Document Approval Workflow (Client Side)

Clients can review documents and respond without an account:

1. Client opens the portal and navigates to **Documents**.
2. For each document they can click:
   - **Approve** — marks the document as approved
   - **Request Changes** — marks it as changes requested, optionally with a note
3. Your team sees the approval status update in the project's Documents tab.

**Approval statuses:**

| Status | Meaning |
|---|---|
| **Pending** | Client has not yet reviewed |
| **Approved** | Client signed off |
| **Changes Requested** | Client provided feedback |

---

## Tips

- **Use password protection for sensitive projects** — without a password, anyone with the link can view the portal.
- **Keep updates regular** — even a short weekly update ("Sprint 3 complete, sprint 4 started") builds client confidence.
- **Only share relevant documents** — portals show all documents linked to the project, so attach documents to the project selectively.
- **Slugs are permanent** — choose a clean, client-appropriate slug (e.g., `acme-rebrand-q3`) because the URL is what you share in emails and contracts.
