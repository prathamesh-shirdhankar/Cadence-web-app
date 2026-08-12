> Overwhelmed by a mountain of unwatched lectures, pending assignments, and impending deadlines?

# Cadence

**Live Demo:** [https://cadence-web-app-chi.vercel.app/](https://cadence-web-app-chi.vercel.app/)

Cadence is a browser-based planner that helps students clear pending coursework by automatically calculating how much they need to study each day to hit their deadlines.

![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=for-the-badge&logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)

---

## 📖 Project Overview

Modern students frequently face the "lecture accumulation" problem—falling behind on recorded classes and struggling to figure out how much they need to study daily to catch up. **Cadence** eliminates the guesswork. 

Built entirely on the client side using React and `localStorage`, the application boasts instant interactions, requires no backend server, and ensures that your academic data never leaves your device.

---

## ✨ Key Features

* **Daily Workload Calculator:** Features a custom scheduling algorithm in JavaScript that takes pending tasks, their durations, and deadlines, and recalculates the required study time per day as tasks are completed or added.
* **Fully Client-Side:** Built the entire app to run in the browser using React hooks and `localStorage` for data storage — no backend, no data leaves the user's device, and it works offline.
* **Progress Charts:** Uses Recharts to show a 7-day chart comparing planned vs. actual study time, alongside an area chart projecting exactly when the backlog will be cleared based on the current pace.
* **Structured Data Handling:** Manages complex, nested data relationships (Courses → Lectures → Status/Deadlines) seamlessly across multiple UI views.
* **UX Polish:** Added smooth UI transitions with Framer Motion, a native Pomodoro focus timer using the Web Audio API, and a fully responsive layout built with Tailwind CSS.

---

## 💻 Installation Instructions

Since Cadence is a zero-backend React application powered by Vite, getting it running locally takes less than a minute.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm or yarn

### Local Development Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/prathamesh-shirdhankar/Cadence-web-app.git](https://github.com/prathamesh-shirdhankar/Cadence-web-app.git)
   cd Cadence-web-app

```

2. **Install dependencies:**
```bash
npm install

```


3. **Start the development server:**
```bash
npm run dev

```


4. **Open your browser:** Navigate to `http://localhost:5173` to view the app.

---

## 🚀 Usage Guide

1. **Set Your Baseline:** Navigate to **Settings** and set your base daily study target (e.g., 120 minutes).
2. **Populate Your Backlog:** Go to **Courses & Backlog**, create a course, and add pending lectures with their durations and strict deadlines.
3. **Execute the Daily Plan:** Open your **Dashboard**. The planner will tell you exactly what you need to watch today. If your deadlines require a faster pace, the algorithm will safely override your baseline to keep you on track.
4. **Engage Focus Mode:** Jump into the **Focus Timer**, start a 25-minute Pomodoro, and dive into a lecture. When the timer chimes, your focused time is automatically credited to your daily dashboard goal.

---

## 📄 License

This project is licensed under the **MIT License**. You are free to use, modify, and distribute this software. See the `LICENSE` file for more details.

```

```
