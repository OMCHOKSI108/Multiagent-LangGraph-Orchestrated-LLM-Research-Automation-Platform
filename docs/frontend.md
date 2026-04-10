# Frontend Guide

The frontend is a **Single Page Application (SPA)** built with **Next.js** (React framework).

## Tech Stack

- **Next.js 14**: React framework with App Router
- **React 18**: Core library
- **TypeScript**: For type safety
- **Tailwind CSS**: For utility-first styling
- **shadcn/ui**: For accessible, reusable components
- **ECharts**: For data visualization
- **Lucide React**: For icons
- **Three.js / React Three Fiber**: For 3D visualizations

## Key Components

### `app/layout.tsx`
The root layout component that defines:
- Theme provider wrapping
- Auth provider for user authentication
- Font configuration (Inter and Outfit)
- Global CSS imports

### `app/page.tsx`
The landing page featuring:
- Hero section with animated 3D knowledge graph
- Feature cards showcasing platform capabilities
- Slash command documentation
- Authentication modal

### `app/dashboard/page.tsx`
The main dashboard after login with:
- Workspace creation and management
- Quick research access
- Recent sessions list
- Token usage statistics

### `app/workspace/[id]/page.tsx`
The primary research workspace featuring:
- **AI Brain Panel**: 3D visualization of agent orchestration
- **Live Feed**: Real-time event stream from agents
- **Sources Panel**: Discovered sources with metadata
- **Report Tab**: Markdown renderer for final reports
- **Raw Data Tab**: Developer view of agent outputs
- **Chat Interface**: Interactive Q&A with research context

### `lib/auth.tsx`
Authentication context providing:
- `user`: Current user object
- `token`: JWT token for API calls
- `login()`: Authenticate user
- `logout()`: Clear session
- `loading`: Auth state loading indicator

### `lib/api.ts`
API client module with typed functions:
- `workspaces`: Workspace CRUD operations
- `research`: Research session management
- `chat`: Chat message handling
- `events`: SSE connection management
- `exportApi`: Download functionality

## Theming

The app supports system-preference based theming for Light and Dark modes:
- **Tailwind Config**: Custom colors with dark/light variants
- **CSS Variables**: globals.css defines the HSL values for the theme
- **ThemeProvider**: Context for theme switching

## API Integration

### Authentication Flow
1. User enters credentials in AuthModal
2. Backend returns JWT token
3. Token stored in localStorage
4. All subsequent requests include `Authorization: Bearer <token>`

### Real-time Updates
The frontend connects to SSE endpoints for live research updates:
- Token obtained from `/api/events/token/:research_id`
- EventSource连接到 `/api/events/stream/:token`
- Events processed and displayed in real-time

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with features and auth |
| `/login` | Login page |
| `/signup` | Registration page |
| `/dashboard` | Main dashboard with workspaces |
| `/workspace/:id` | Research workspace with chat and reports |
| `/profile` | User profile and settings |
| `/admin` | Admin panel (role-restricted) |

## Running the Application

```bash
cd frontend
npm install
npm run dev
```

Access at `http://localhost:3000`.

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
