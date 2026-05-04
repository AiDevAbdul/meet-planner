# MeetPlanner — Claude Context

## Project
Internal meeting & project planner. Converts meeting notes/transcripts → structured tasks,
assigns to team members, tracks deadlines. Includes in-app messaging with department channels.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Auth**: Google OAuth (Google Workspace)
- **AI**: Claude API — task extraction from meeting notes & chat
- **Database**: Neon Postgres (via Vercel Marketplace)
- **Real-time**: Supabase Realtime (messaging)
- **Email Trigger**: Gmail API push notifications
- **Hosting**: Vercel

## Design System
- **Style**: Apple macOS / iOS — glassmorphism, frosted blur, clean whitespace
- **Colors**: Apple system blues/grays — see `docs/design-system.md`
- **Typography**: Inter (SF Pro feel) — `docs/design-system.md` for full scale
- **Icons**: Lucide React (consistent stroke, no emojis as icons)
- **Motion**: 150–300ms ease-out enter / ease-in exit, spring physics for modals

## Key Rules
- Commit + push after each completed feature/task
- No emojis as icons — SVG/Lucide only
- All docs go in `docs/` — never in root
- Dark mode support required on all components
- Accessibility: 4.5:1 contrast, keyboard nav, aria-labels
- AI extraction logic tested against real meeting notes before UI work

## Docs Index
- `docs/design-system.md` — Colors, typography, spacing, components
- `docs/architecture.md` — System architecture & data flow
- `docs/features.md` — Feature specifications
- `docs/api.md` — Internal API routes
