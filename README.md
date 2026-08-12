# Cadence 📚⚡

![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css)
![Offline First](https://img.shields.io/badge/Offline-First-success?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-gray?style=flat-square)

**Cadence** is a high-performance, offline-first personal academic backlog and productivity tracker. Designed specifically to solve the "lecture accumulation" problem, Cadence utilizes a dynamic pacing algorithm to calculate exact daily study requirements, ensuring deadlines are met without burnout.

The application operates entirely within the client boundary, utilizing browser `localStorage` for persistent, zero-latency data access without the need for a backend or database.

## ✨ Core Features

*   **Smart Daily Planner & Pace Engine:** An algorithmic engine that scans upcoming lecture deadlines, calculates the required daily study velocity, and automatically generates an optimized daily playlist to prevent overdue tasks.
*   **Course Hierarchy:** Group isolated lectures into categorized courses, complete with progress tracking, visual color-coding, and granular URL/video source management.
*   **Integrated Pomodoro Timer:** A native 25/5/15 minute focus timer utilizing the Web Audio API for non-blocking alerts. Completed sessions dynamically feed into the daily "Achieved Minutes" quota.
*   **Split-View Calendar Agenda:** A paginated interactive monthly calendar featuring individual day-planning, markdown-style daily journaling, and aggregated daily workload views.
*   **Revision & Retention Queue:** Built-in spaced-repetition workflows allowing users to manually flag completed lectures for review or add custom revision topics.
*   **Advanced Analytics:** Real-time data visualization using `recharts`. Features a 7-day Target vs. Achieved bar chart and a predictive Area Chart forecasting the backlog clearance trajectory ("Freedom Day").
*   **Zero-Backend Architecture:** 100% data privacy. All state is strictly localized. Includes a robust JSON Import/Export engine for reliable data backups.

## 🛠 Tech Stack

*   **Core:** React.js, Vite
*   **Styling:** Tailwind CSS (v3)
*   **Animations:** Framer Motion (Spring physics, layout transitions)
*   **Data Visualization:** Recharts
*   **Icons:** Lucide-React (Consistent, scalable SVGs)
*   **Persistence:** Custom React Hooks wrapping Native `window.localStorage`

## 🚀 Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18+ recommended) and `npm` installed.

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/cadence.git](https://github.com/yourusername/cadence.git)
   cd cadence

```

2. Install dependencies:
```bash
npm install

```


3. Start the development server:
```bash
npm run dev

```


4. Open your browser and navigate to `http://localhost:5173`

## 🏗 Architecture & Engineering Notes

* **State Management:** Built relying on a monolithic decoupled state approach using a custom `useLocalStorage` hook. This ensures React state and browser storage remain perfectly synchronized across render cycles.
* **Failsafe Math:** All date manipulations and duration calculations are wrapped in a custom `safeNum()` utility and standardized `YYYY-MM-DD` serializers to prevent `NaN` crashes and timezone offset bugs.
* **Dynamic Pacing Algorithm:** Found in `calculateRequiredPace()`, this engine evaluates $O(N)$ pending lectures, groups them by discrete deadlines, and calculates the floating maximum constraint to guarantee no deadline is breached based on the current date.

## 📦 Desktop Packaging (Optional)

Cadence can be compiled into a standalone `.exe` desktop application using Electron, providing a native OS experience.

1. Ensure Electron builder is installed:
```bash
npm install -D electron electron-builder

```


2. Build the Vite project and package the application:
```bash
npm run electron:build

```



*The output executable will be located in the `/dist` directory.*

## 🔒 Data Privacy

Cadence is fundamentally designed around data sovereignty.

* **No Telemetry:** There are no tracking scripts, analytics, or external API calls.
* **Local Storage:** Your data never leaves your device.
* **Backups:** It is highly recommended to use the **Settings > Backup & Restore (JSON)** feature frequently to prevent data loss in the event of browser cache clearance.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Developed with a focus on code hygiene, fluid UX, and deep work productivity.*

```

```
