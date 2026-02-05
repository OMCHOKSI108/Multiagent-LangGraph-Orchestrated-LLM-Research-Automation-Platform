# Deep Research Engine - Frontend Architecture

## 1. High-Level Architecture

### Folder Structure
- **`/store`**: Contains the `useResearchStore` (Zustand). This is the "brain" of the application, handling the polling loop, job status transitions, and data merging.
- **`/components`**:
  - **`Atomic`**: `Button`, `Input`, `Badge` (Presentation only).
  - **`Complex`**: `MarkdownRenderer` (Memoized, heavy lifter), `MermaidDiagram` (Effect-based rendering), `LogTerminal` (Auto-scrolling).
- **`/pages`**: `Dashboard` (Index), `Workspace` (The core OS), `Login`.
- **`/services`**: `api.ts` containing the fetch wrappers and error handling logic.

### State Management (Zustand)
We use **Zustand** over Context API because:
1.  **Transient Updates:** Logs and status updates happen frequently (polling every 3s). Context would trigger re-renders of the entire tree. Zustand allows components to subscribe *only* to the slices they need (e.g., the StatusBadge only re-renders when status changes, not when a log line is added).
2.  **Action Separation:** The polling logic (`pollJobStatus`) is encapsulated within the store actions, keeping UI components clean.

## 2. Layout Decisions

### The Active Workspace (3-Pane Split)
We chose a **Fixed-Fluid-Fixed** layout:
1.  **Left (Logs - 300px):** Fixed width. Developers/Researchers need to see "is it working?" immediately. It provides trust in the async process. Monospace, high contrast.
2.  **Center (Chat - Fluid):** The interaction layer. It shrinks/grows but maintains a minimum readable width.
3.  **Right (Results - 45%):** The largest dedicated space. Research reports are dense. We need width for tables, diagrams, and long-form text.

**Why not tabs?**
In a "Research OS," context switching kills flow. A researcher needs to see the *Logs* (did it fail?), the *Chat* (ask a question), and the *Report* (source of truth) simultaneously. Tabs are reserved only for Mobile view.

## 3. Data Flow & Performance
- **Polling:** Implemented via `setInterval` in the Zustand store. It respects the `JobStatus`. If `COMPLETED` or `FAILED`, polling stops automatically to save resources.
- **Markdown:** Large payloads (100k+ tokens) are expensive to render. The `MarkdownRenderer` is wrapped in `React.memo` and only updates when the content string explicitly changes.
- **Virtualization:** For lists of 100+ researches, we use standard pagination/table structures to keep DOM node count low.

## 4. Tailwind Usage
- **Colors:** `slate` and `zinc` for a neutral, "boring" dark mode. No functional colors except `green` (success), `amber` (processing), `red` (error).
- **Typography:** `font-sans` for UI, `font-mono` for logs and code. Text is kept `text-sm` (14px) or `text-xs` (12px) to maximize information density.
- **Layout:** Heavy usage of `flex`, `h-screen`, `overflow-hidden` to prevent full-page scrolling. Each panel handles its own scroll.
