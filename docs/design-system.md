# MeetPlanner Design System

## Philosophy
Apple macOS / iOS aesthetic — frosted glass surfaces, clean whitespace, purposeful motion,
and a system that feels native to people who live in Finder, Mail, and Calendar.

---

## Color Palette

### Core (Apple System Colors)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--color-blue` | `#007AFF` | `#0A84FF` | Primary actions, links, focus rings |
| `--color-indigo` | `#5856D6` | `#5E5CE6` | Secondary accents, tags |
| `--color-green` | `#34C759` | `#30D158` | Success, completed tasks |
| `--color-orange` | `#FF9500` | `#FF9F0A` | Warnings, medium priority |
| `--color-red` | `#FF3B30` | `#FF453A` | Destructive, high priority, errors |
| `--color-purple` | `#AF52DE` | `#BF5AF2` | Messaging, mentions |
| `--color-yellow` | `#FFCC00` | `#FFD60A` | Low priority, notes |

### Surfaces (Light Mode)

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#FFFFFF` | Main content area |
| `--bg-secondary` | `#F2F2F7` | Page background |
| `--bg-tertiary` | `#FFFFFF/80` + blur | Cards, panels |
| `--bg-sidebar` | `rgba(242,242,247,0.72)` + blur | Sidebar |
| `--bg-glass` | `rgba(255,255,255,0.6)` | Glassmorphism cards |
| `--border` | `rgba(0,0,0,0.08)` | Dividers, card borders |
| `--border-strong` | `rgba(0,0,0,0.15)` | Input borders |

### Surfaces (Dark Mode)

| Token | Value | Usage |
|---|---|---|
| `--bg-primary` | `#1C1C1E` | Main content area |
| `--bg-secondary` | `#000000` | Page background |
| `--bg-tertiary` | `rgba(28,28,30,0.8)` + blur | Cards, panels |
| `--bg-sidebar` | `rgba(28,28,30,0.72)` + blur | Sidebar |
| `--bg-glass` | `rgba(255,255,255,0.05)` | Glassmorphism cards |
| `--border` | `rgba(255,255,255,0.08)` | Dividers, card borders |
| `--border-strong` | `rgba(255,255,255,0.15)` | Input borders |

### Text

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--text-primary` | `#000000` | `#FFFFFF` | Headlines, primary content |
| `--text-secondary` | `rgba(60,60,67,0.6)` | `rgba(235,235,245,0.6)` | Captions, metadata |
| `--text-tertiary` | `rgba(60,60,67,0.3)` | `rgba(235,235,245,0.3)` | Placeholders, disabled |
| `--text-blue` | `#007AFF` | `#0A84FF` | Links, interactive labels |

### Priority Colors

| Priority | Color Token | Usage |
|---|---|---|
| Critical | `--color-red` | Blocks team, must do today |
| High | `--color-orange` | Due this week |
| Normal | `--color-blue` | Standard task |
| Low | `--color-yellow` | Nice to have |

---

## Typography

### Font Stack
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
```
Import: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');`

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `text-display` | 34px / 2.125rem | 700 | 1.2 | Page titles, empty states |
| `text-title-1` | 28px / 1.75rem | 700 | 1.25 | Section headers |
| `text-title-2` | 22px / 1.375rem | 600 | 1.3 | Card titles, modal headers |
| `text-title-3` | 20px / 1.25rem | 600 | 1.35 | Sidebar section labels |
| `text-headline` | 17px / 1.0625rem | 600 | 1.4 | List item titles, task names |
| `text-body` | 17px / 1.0625rem | 400 | 1.5 | Body text, descriptions |
| `text-callout` | 16px / 1rem | 400 | 1.5 | Form labels, card body |
| `text-subheadline` | 15px / 0.9375rem | 400 | 1.4 | Secondary labels |
| `text-footnote` | 13px / 0.8125rem | 400 | 1.4 | Timestamps, metadata |
| `text-caption` | 12px / 0.75rem | 400 | 1.3 | Badges, chip labels |

---

## Spacing System

Base unit: **4px**. All spacing uses multiples of 4.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon internal padding |
| `space-2` | 8px | Between icon and label |
| `space-3` | 12px | Tight list item padding |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Card inner padding |
| `space-6` | 24px | Section spacing |
| `space-8` | 32px | Large section gaps |
| `space-10` | 40px | Page section margins |
| `space-12` | 48px | Hero / top-of-page |
| `space-16` | 64px | Major section dividers |

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 6px | Badges, chips, tags |
| `radius-md` | 10px | Buttons, inputs |
| `radius-lg` | 14px | Cards, panels |
| `radius-xl` | 20px | Modals, sheets |
| `radius-2xl` | 28px | Large floating cards |
| `radius-full` | 9999px | Avatars, toggles, pills |

---

## Glassmorphism System

### Light Mode Glass Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}
```

### Dark Mode Glass Card
```css
.glass-card-dark {
  background: rgba(28, 28, 30, 0.72);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
}
```

### Sidebar (macOS Finder style)
```css
.sidebar {
  background: rgba(242, 242, 247, 0.72);    /* light */
  backdrop-filter: blur(40px);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  /* dark: background: rgba(28, 28, 30, 0.72) */
}
```

---

## Elevation / Shadow Scale

| Level | Value | Usage |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.04)` | Inputs, subtle cards |
| `shadow-sm` | `0 2px 8px rgba(0,0,0,0.06)` | Dropdowns, tooltips |
| `shadow-md` | `0 4px 24px rgba(0,0,0,0.08)` | Cards, panels |
| `shadow-lg` | `0 8px 40px rgba(0,0,0,0.12)` | Floating actions, popovers |
| `shadow-xl` | `0 20px 60px rgba(0,0,0,0.16)` | Modals, sheets |

---

## Motion & Animation Tokens

```css
/* Durations */
--duration-instant:  100ms;   /* press feedback */
--duration-fast:     150ms;   /* hover, toggle */
--duration-normal:   250ms;   /* enter transitions */
--duration-slow:     350ms;   /* modals, sheets */
--duration-exit:     200ms;   /* exits always faster */

/* Easings */
--ease-out:    cubic-bezier(0.25, 0.46, 0.45, 0.94);  /* elements entering */
--ease-in:     cubic-bezier(0.55, 0.06, 0.68, 0.19);  /* elements exiting */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);     /* modals, sheets, cards */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);          /* general transitions */
```

### Motion Patterns
- **Hover card**: `transform: translateY(-2px)` + `shadow-lg`, 150ms ease-out
- **Button press**: `scale(0.97)` on press, `scale(1)` on release, 100ms
- **Modal enter**: scale from `0.95` + fade, 300ms `--ease-spring`
- **Modal exit**: scale to `0.97` + fade, 200ms ease-in
- **Sidebar item**: left border grow + background fade, 150ms ease-out
- **Toast enter**: slide up + fade, 250ms ease-out
- **Skeleton**: opacity pulse 1.0→0.4→1.0, 1.5s infinite, ease-in-out

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Component Specifications

### Sidebar Navigation (macOS Finder style)
- Width: 240px (collapsed: 60px)
- Item height: 36px
- Active item: `--color-blue` bg at 12% opacity + blue left border (3px) + blue text
- Icon size: 18px, Lucide stroke 1.5px
- Section labels: `text-caption`, uppercase, letter-spacing 0.05em, `--text-tertiary`
- Avatar area at top: 56px height, user name + role below
- Footer: Settings icon + logout at bottom

### Top Bar
- Height: 52px
- Blur background (glass pattern above)
- Left: breadcrumb / page title
- Right: Search, Notifications bell, Avatar
- Border-bottom: `--border`

### Primary Button
```css
background: var(--color-blue);
color: #FFFFFF;
padding: 10px 20px;
border-radius: 10px;
font-size: 15px;
font-weight: 600;
transition: all 150ms var(--ease-out);
/* hover: brightness(1.1) */
/* active: scale(0.97) */
/* disabled: opacity 0.4, cursor not-allowed */
```

### Input Field
```css
background: var(--bg-primary);
border: 1px solid var(--border-strong);
border-radius: 10px;
padding: 10px 14px;
font-size: 17px;
/* focus: border-color: var(--color-blue), box-shadow: 0 0 0 3px rgba(0,122,255,0.2) */
```

### Task Card (Kanban)
- Background: glass card pattern
- Left border: 3px solid priority color
- Avatar stack for assignees (max 3 + count)
- Due date badge bottom-right
- Drag handle: appears on hover, `⠿` icon

### Badge / Chip
```css
padding: 3px 8px;
border-radius: 6px;
font-size: 12px;
font-weight: 500;
/* Priority: bg is priority color at 12% opacity, text is priority color */
```

### Avatar
- Sizes: 24px (small), 32px (default), 40px (medium), 56px (large)
- Fallback: initials on `--color-indigo` bg
- Stack: -8px overlap, white ring border 2px

### Message Bubble
- Own messages: right-aligned, `--color-blue` background, white text
- Others: left-aligned, glass card background
- Timestamp: `text-footnote`, `--text-tertiary`, appears on hover
- Max width: 70% of chat area

---

## Icon System

- **Library**: Lucide React
- **Default size**: 20px (nav), 18px (inline), 16px (small)
- **Stroke width**: 1.5px for all icons
- **Style**: Never mix filled and outline at same hierarchy level
- **No emoji as icons** — use Lucide equivalents only

| Context | Icon | Size |
|---|---|---|
| Navigation items | `LayoutDashboard`, `CheckSquare`, `MessageSquare`, `FileText`, `Users` | 20px |
| Actions | `Plus`, `Edit`, `Trash2`, `MoreHorizontal` | 18px |
| Status | `CheckCircle`, `Clock`, `AlertCircle`, `XCircle` | 16px |
| Priority | `ArrowUp`, `Minus`, `ArrowDown` | 14px |

---

## Layout Grid

| Breakpoint | Sidebar | Content | Columns |
|---|---|---|---|
| Mobile `< 768px` | Hidden (drawer) | Full width | 1 |
| Tablet `768–1023px` | Collapsed (60px) | Remaining | 2 |
| Desktop `≥ 1024px` | Full (240px) | Remaining | 3–4 (kanban) |
| Wide `≥ 1440px` | Full (240px) | max-w-7xl centered | 4 |

---

## Dark Mode Implementation

Use CSS custom properties with `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)`.
Tailwind: configure `darkMode: 'class'` with `dark:` variants.
Never hardcode hex values in components — always reference tokens.
