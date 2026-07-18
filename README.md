# Consistency Pro - Minimal Habit & Study System

Consistency Pro is a lightweight, distraction-free desktop-focused study and habit tracking system designed after Google's minimal design aesthetic. Built to encourage long-term daily consistency rather than artificial gamification, it operates entirely offline, persisting data securely in your browser's local storage with zero backend dependencies, while offering powerful server-side AI Coach integration for custom recommendations.

---

## Key Features

- **Google-Inspired Minimal UI**: Polished, distraction-free aesthetic with subtle micro-animations (150ms transitions), utilizing elegant IBM Plex Sans typography and Google's exact brand color-codings.
- **Resilient Multi-Session Timer Engine**: A stateful tracking system immune to browser reloads, network drops, or tab closures. It calculates exact active study times and prevents active session conflicts.
- **GitHub-Style Consistency Heatmap**: A navigable contribution grid visualizing completion history. Hover to see completed task summaries, active duration, and precise daily percentages.
- **Flexible Custom Tasks (Full CRUD)**: Add, search, rename, and delete custom habits. Features an instant slide-in Undo deletion bar for seamless usability.
- **AI Consistency Coach**: Integrates securely with Google's Gemini 3.5 Flash model server-side to compile study highlights, assess category balances, and issue actionable data-driven coaching plans.
- **Rich Analytics & Scoring**: Recharts visualizations showcasing category time distributions, weekly trends, monthly breakdowns, and a dynamic 100-point Productivity Score.
- **Streak Freeze Mechanism**: Streak calculations reward actual commitment: completes increment streaks, missing exactly 1 task freezes the streak, and missing more than 1 resets it.
- **Complete Data Portability**: Standard CSV exports for personal logging, beautifully styled PDF reports using standard browser print-rendering, and single-click JSON Backup Import/Export.
- **Fluid Dark & Light Modes**: Seamless theme overrides tailored to reduce eye fatigue during late-night CAT/Dev sprints.

---

## Project Structure

```text
src/
├── components/
│   ├── analytics/        # Recharts monthly stats, AI Coach, metrics
│   ├── dashboard/        # Hero card, GitHub heatmap, timetable, custom tasks
│   ├── layout/           # Sticky Header with date and dynamic live clock
│   ├── settings/         # Backup tools, theme toggle, and reset panels
│   ├── shared/           # Animated Modals and custom canvas Confetti
│   └── ui/               # Tailored card and progress primitives
├── hooks/
│   └── useTaskEngine.ts  # Main task states, CRUD pipelines, timer syncs
├── services/
│   ├── ai.ts             # Cache-friendly client fetcher for AI Coach
│   ├── export.ts         # Portable CSV sheets and window print layouts
│   └── storage.ts        # Resilient local storage schema, daily resets, streaks
├── types/
│   └── index.ts          # Central TypeScript interfaces and data models
├── utils/
│   └── constants.ts      # Fixed daily timetable constant variables
├── App.tsx               # Primary layout router and keyboard shortcut monitors
├── index.css             # IBM Plex Sans imports, Tailwind v4 theme, printing overrides
└── main.tsx              # App initialization entrypoint
```

---

## Installation & Development

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
Clone the repository and install all required modules:
```bash
npm install
```

### 2. Configure Environment Secrets
Create a `.env` file in the root directory (based on `.env.example`) and add your Gemini API Key:
```env
GEMINI_API_KEY="your_api_key_here"
```

### 3. Run the Development Server
Launch the full-stack server running Express + Vite:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment Configuration

Consistency Pro's front-end is fully compatible with static hosts (like GitHub Pages, Netlify, or Vercel) as its core features run completely offline in the browser. 

### 1. Build for Production
Run the production compiler:
```bash
npm run build
```
This command compiles the React SPA into static assets inside `dist/` and bundles the Express API backend into a CJS server file under `dist/server.cjs` via `esbuild`.

### 2. Static Deploy (e.g., GitHub Pages)
If deploying purely as a client-side offline app:
1. Update `base` in your `vite.config.ts` to `"/your-repository-name/"`.
2. Run `npm run build`.
3. Push the compiled static files from the `dist` folder to your `gh-pages` branch.

### 3. Full-Stack Deploy (e.g., Cloud Run)
Launch the compiled full-stack Express server in containerized nodes:
```bash
npm run start
```
The server automatically listens on port `3000` and proxies the Gemini AI endpoint safely.
