# Frontend Guide

The frontend is a **Single Page Application (SPA)** built with **React** and **Vite**.

## Tech Stack

- **React 18**: Core library.
- **TypeScript**: For type safety.
- **Zustand**: For global state management.
- **Tailwind CSS**: For utility-first styling.
- **Shadcn/UI**: For accessible, reusable components.
- **Lucide React**: For icons.

## Key Components

### `App.tsx`
The main entry point, handling routing (via `react-router-dom`) and global providers (`ThemeProvider`).

### `store.ts`
The central brain of the frontend. It holds:
- `isAuthenticated`: Auth state.
- `researches`: List of jobs.
- `usageStats`: Billing/Usage data.
- Actions: `login`, `startResearch`, `fetchResearches`.

### `Layout.tsx`
Defines the main shell of the application, including the `Sidebar` and main content area.

### `Workspace.tsx`
The primary research view. It displays:
- **ResearchSteps**: Timeline of agent actions.
- **LiveActivityFeed**: Real-time logs.
- **MarkdownRenderer**: The final report.

## Theming

The app supports system-preference based profiling for Light and Dark modes.
- **Tailwind Config**: Custom colors (`dark-primary`, `dark-secondary`) logic.
- **CSS Variables**: `globals.css` defines the HSL values for the theme.
