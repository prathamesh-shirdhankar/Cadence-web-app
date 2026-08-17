import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalIcon,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
  Plus,
  Flame,
  BookOpen,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  RefreshCw,
  Layers,
  ExternalLink,
  Moon,
  Sun,
  Search,
  AlertTriangle,
  PlayCircle,
  X,
  Target,
  Play,
  Pause,
  RotateCcw,
  Timer,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Target as TargetIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// --- CONSTANTS ---
const COURSE_COLORS = [
  { name: "Indigo", value: "#4F46E5" },
  { name: "Emerald", value: "#10B981" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Purple", value: "#8B5CF6" },
  { name: "Rose", value: "#F43F5E" },
];

// --- CUSTOM HOOK: LOCAL STORAGE ---
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });
  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn("Local storage error:", error);
    }
  };
  return [storedValue, setValue];
}

// --- UTILS & MATH SAFETIES ---
const safeNum = (val) => {
  const num = Number(val);
  return isNaN(num) || num <= 0 ? 0 : num;
};

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const playChime = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
};

const calculateRequiredPace = (pendingLecs) => {
  const todayStr = formatDate(new Date());
  let maxRequiredPace = 0;
  const lecsWithDeadlines = pendingLecs
    .filter((l) => l.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  const uniqueDeadlines = [
    ...new Set(lecsWithDeadlines.map((l) => l.deadline)),
  ];

  uniqueDeadlines.forEach((dl) => {
    const lecsDue = lecsWithDeadlines.filter((l) => l.deadline <= dl);
    const totalMins = lecsDue.reduce((sum, l) => sum + safeNum(l.duration), 0);
    const t = new Date(todayStr);
    const d = new Date(dl);
    let daysLeft = Math.ceil((d - t) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) daysLeft = 1; // Minimum 1 day to clear immediate deadlines
    const requiredMins = Math.ceil(totalMins / daysLeft);
    if (requiredMins > maxRequiredPace) maxRequiredPace = requiredMins;
  });
  return maxRequiredPace;
};

const simulateClearance = (pendingLecs, basePace) => {
  let currDate = new Date();
  currDate.setHours(0, 0, 0, 0);

  if (!pendingLecs || pendingLecs.length === 0) {
    return {
      finalDate: currDate,
      trajectory: [
        {
          date: currDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          dateStr: formatDate(currDate),
          RemainingMins: 0,
        },
      ],
    };
  }

  let totalLeft = pendingLecs.reduce((sum, l) => sum + safeNum(l.duration), 0);
  let trajectory = [
    {
      date: currDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      dateStr: formatDate(currDate),
      RemainingMins: totalLeft,
    },
  ];

  const lecs = [...pendingLecs].sort((a, b) => {
    if (a.deadline && b.deadline)
      return new Date(a.deadline) - new Date(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return new Date(a.dateAdded) - new Date(b.dateAdded);
  });

  let safePace = safeNum(basePace) || 120;
  let dayLimit = 0;
  let i = 0;
  let durLeftInLec = safeNum(lecs[0].duration);
  let minsAssignedToday = 0;

  while (i < lecs.length && dayLimit < 1000) {
    // 1000 day infinite-loop failsafe
    let currDateStr = formatDate(currDate);
    let lec = lecs[i];
    let isUrgent = lec.deadline && lec.deadline <= currDateStr;
    let capacity = isUrgent ? Infinity : safePace - minsAssignedToday;

    if (capacity > 0) {
      let chunk = Math.min(durLeftInLec, capacity);
      durLeftInLec -= chunk;
      minsAssignedToday += chunk;
      totalLeft -= chunk;

      if (durLeftInLec <= 0) {
        i++;
        if (i < lecs.length) durLeftInLec = safeNum(lecs[i].duration);
      }

      if (durLeftInLec > 0 && !isUrgent) {
        currDate.setDate(currDate.getDate() + 1);
        minsAssignedToday = 0;
        dayLimit++;
        trajectory.push({
          date: currDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          dateStr: formatDate(currDate),
          RemainingMins: totalLeft,
        });
      }
    } else {
      currDate.setDate(currDate.getDate() + 1);
      minsAssignedToday = 0;
      dayLimit++;
      trajectory.push({
        date: currDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        dateStr: formatDate(currDate),
        RemainingMins: totalLeft,
      });
    }
  }

  if (trajectory[trajectory.length - 1].RemainingMins > 0) {
    trajectory.push({
      date: currDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      dateStr: formatDate(currDate),
      RemainingMins: 0,
    });
  }

  return { finalDate: currDate, trajectory };
};

// --- SHARED UI COMPONENTS ---
const Card = ({ children, className = "", onClick }) => {
  const hasCustomBg = className.includes("bg-");
  return (
    <div
      onClick={onClick}
      className={`${hasCustomBg ? "" : "bg-white dark:bg-slate-900"} rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

const Badge = ({ children, colorClass = "bg-brand-100 text-brand-600" }) => (
  <span
    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${colorClass}`}
  >
    {children}
  </span>
);

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // States (with safety fallbacks for imported objects)
  const [courses, setCourses] = useLocalStorage("cadence_courses", []);
  const [todos, setTodos] = useLocalStorage("cadence_todos", []);
  const [customRevisions, setCustomRevisions] = useLocalStorage(
    "cadence_custom_revisions",
    [],
  );
  const [settings, setSettings] = useLocalStorage("cadence_settings", {
    theme: "light",
    dailyPaceMinutes: 120,
  });
  const [pomoLog, setPomoLog] = useLocalStorage("cadence_pomo_log", []);
  const [calendarNotes, setCalendarNotes] = useLocalStorage(
    "cadence_calendar_notes",
    {},
  );

  useEffect(() => {
    const isDark =
      settings?.theme === "dark" ||
      (settings?.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }, [settings?.theme]);

  const updateLectureStatus = (courseId, lecId, newStatus) => {
    setCourses(
      (courses || []).map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          lectures: c.lectures.map((l) => {
            if (l.id !== lecId) return l;
            if (newStatus === "needs_revision")
              return {
                ...l,
                status: "completed",
                needsRevision: true,
                completedDate: l.completedDate || formatDate(new Date()),
              };
            if (newStatus === "completed")
              return {
                ...l,
                status: "completed",
                needsRevision: false,
                completedDate: formatDate(new Date()),
              };
            return {
              ...l,
              status: "pending",
              needsRevision: false,
              completedDate: null,
            };
          }),
        };
      }),
    );
  };

  const combinedRevisionQueue = useMemo(() => {
    let queue = [];
    (courses || []).forEach((c) => {
      c.lectures.forEach((l) => {
        if (l.status === "completed" && l.needsRevision)
          queue.push({
            ...l,
            courseName: c.name,
            courseColor: c.color,
            courseId: c.id,
            isCustom: false,
          });
      });
    });
    (customRevisions || []).forEach((cr) =>
      queue.push({ ...cr, isCustom: true }),
    );
    return queue;
  }, [courses, customRevisions]);

  const stats = useMemo(() => {
    let pendingMins = 0,
      completedTodayMins = 0;
    let allPendingLecs = [];
    const todayStr = formatDate(new Date());
    const pomoTodayMins = (pomoLog || [])
      .filter((p) => p.date === todayStr)
      .reduce((acc, p) => acc + safeNum(p.mins), 0);

    (courses || []).forEach((c) => {
      c.lectures.forEach((l) => {
        if (l.status === "pending") {
          pendingMins += safeNum(l.duration);
          allPendingLecs.push({
            ...l,
            courseName: c.name,
            courseColor: c.color,
            courseId: c.id,
          });
        } else if (l.status === "completed" && l.completedDate === todayStr) {
          completedTodayMins += safeNum(l.duration);
        }
      });
    });

    completedTodayMins += pomoTodayMins;

    const requiredPace = calculateRequiredPace(allPendingLecs);
    const targetDailyMins = Math.max(
      requiredPace,
      safeNum(settings?.dailyPaceMinutes) || 120,
    );
    const simulation = simulateClearance(
      allPendingLecs,
      settings?.dailyPaceMinutes,
    );

    allPendingLecs.sort((a, b) => {
      if (a.deadline && b.deadline)
        return new Date(a.deadline) - new Date(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return new Date(a.dateAdded) - new Date(b.dateAdded);
    });

    let dailyPlan = [],
      plannedMins = 0;
    allPendingLecs.forEach((lec) => {
      if (
        (lec.deadline && lec.deadline <= todayStr) ||
        plannedMins < targetDailyMins
      ) {
        dailyPlan.push(lec);
        plannedMins += safeNum(lec.duration);
      }
    });

    return {
      pendingMins,
      totalRemainingHours: (pendingMins / 60).toFixed(1),
      totalPending: allPendingLecs.length,
      revisionQueue: combinedRevisionQueue,
      projectedDate: simulation.finalDate,
      trajectory: simulation.trajectory,
      requiredPace,
      targetDailyMins,
      completedTodayMins,
      dailyPlan,
      allPendingLecs,
    };
  }, [courses, settings?.dailyPaceMinutes, combinedRevisionQueue, pomoLog]);

  const currentStreak = useMemo(() => {
    const allDates = [];
    (courses || []).forEach((c) =>
      c.lectures.forEach((l) => {
        if (l.status === "completed" && l.completedDate)
          allDates.push(l.completedDate);
      }),
    );
    (todos || []).forEach((t) => {
      if (t.completed && t.completedDate) allDates.push(t.completedDate);
    });
    (pomoLog || []).forEach((p) => allDates.push(p.date));

    const uniqueDates = [...new Set(allDates)].sort().reverse();
    if (uniqueDates.length === 0) return 0;
    let streak = 0,
      curr = new Date(),
      checkStr = formatDate(curr);

    if (!uniqueDates.includes(checkStr)) {
      curr.setDate(curr.getDate() - 1);
      checkStr = formatDate(curr);
    }
    while (uniqueDates.includes(checkStr)) {
      streak++;
      curr.setDate(curr.getDate() - 1);
      checkStr = formatDate(curr);
    }
    return streak;
  }, [courses, todos, pomoLog]);

  const activeTodosCount = (todos || []).filter((t) => !t.completed).length;

  const views = {
    dashboard: (
      <Dashboard
        stats={stats}
        streak={currentStreak}
        settings={settings}
        nav={setActiveTab}
        updateLectureStatus={updateLectureStatus}
      />
    ),
    courses: (
      <CoursesView
        courses={courses}
        setCourses={setCourses}
        settings={settings}
        stats={stats}
        updateLectureStatus={updateLectureStatus}
      />
    ),
    revisions: (
      <RevisionView
        courses={courses}
        setCourses={setCourses}
        customRevisions={customRevisions}
        setCustomRevisions={setCustomRevisions}
        queue={combinedRevisionQueue}
      />
    ),
    pomodoro: <PomodoroView pomoLog={pomoLog} setPomoLog={setPomoLog} />,
    todos: <TodosView todos={todos} setTodos={setTodos} />,
    calendar: (
      <CalendarView
        courses={courses}
        todos={todos}
        settings={settings}
        notes={calendarNotes}
        setNotes={setCalendarNotes}
        projectedDate={stats.projectedDate}
        pomoLog={pomoLog}
      />
    ),
    stats: (
      <StatsView
        courses={courses}
        streak={currentStreak}
        stats={stats}
        settings={settings}
        pomoLog={pomoLog}
      />
    ),
    settings: (
      <SettingsView
        settings={settings}
        setSettings={setSettings}
        courses={courses}
        setCourses={setCourses}
        todos={todos}
        setTodos={setTodos}
        setCustomRevisions={setCustomRevisions}
        setPomoLog={setPomoLog}
        setCalendarNotes={setCalendarNotes}
      />
    ),
  };

  const NavItem = ({ id, icon: Icon, label, badgeCount }) => {
    const active = activeTab === id;
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
      >
        <div className="flex items-center space-x-3">
          <Icon
            size={20}
            className={active ? "text-white" : "text-slate-400"}
          />
          <span>{label}</span>
        </div>
        {badgeCount > 0 && (
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"}`}
          >
            {badgeCount}
          </span>
        )}
      </button>
    );
  };

  // Mobile navigation configuration
  const mobileNavItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dash" },
    { id: "courses", icon: Layers, label: "Courses" },
    { id: "pomodoro", icon: Timer, label: "Focus" },
    { id: "todos", icon: CheckCircle2, label: "Tasks" },
    { id: "calendar", icon: CalIcon, label: "Plan" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden pb-16 md:pb-0">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex-col hidden md:flex flex-shrink-0 z-20">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/30">
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight leading-none">
              Cadence
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Academic Backlog
            </p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem
            id="courses"
            icon={Layers}
            label="Courses & Backlog"
            badgeCount={(courses || []).length}
          />
          <NavItem
            id="revisions"
            icon={RefreshCw}
            label="Revision Queue"
            badgeCount={combinedRevisionQueue.length}
          />
          <NavItem id="pomodoro" icon={Timer} label="Focus Timer" />
          <NavItem
            id="todos"
            icon={CheckCircle2}
            label="To-Do List"
            badgeCount={activeTodosCount}
          />
          <NavItem id="calendar" icon={CalIcon} label="Calendar View" />
          <NavItem id="stats" icon={BarChart3} label="Stats & Progress" />
          <NavItem id="settings" icon={SettingsIcon} label="Settings" />
        </nav>
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl p-4 flex items-center space-x-4">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm">
              <Flame size={24} color="white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                Streak Active
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1">
                {currentStreak} Days{" "}
                <Flame size={16} className="text-amber-500" />
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center px-1">
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  theme: settings?.theme === "dark" ? "light" : "dark",
                })
              }
              className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {settings?.theme === "dark" ? (
                <Sun size={18} className="mr-2 text-amber-400" />
              ) : (
                <Moon size={18} className="mr-2" />
              )}{" "}
              {settings?.theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              onClick={() => setActiveTab("courses")}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/20 transition-transform hover:scale-105"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-full overflow-y-auto scroll-smooth relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="p-4 md:p-8 max-w-7xl mx-auto min-h-full pb-24"
          >
            {views[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center p-2 z-50 pb-safe">
        {mobileNavItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}
            >
              <item.icon size={20} className="mb-1" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === "settings" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}
        >
          <SettingsIcon size={20} className="mb-1" />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
      </nav>
    </div>
  );
}

// ============================================================================
// VIEWS
// ============================================================================

function Dashboard({ stats, streak, settings, nav, updateLectureStatus }) {
  const paceWarning = stats.requiredPace > settings.dailyPaceMinutes;
  const todayProgressPercent =
    stats.targetDailyMins === 0
      ? 100
      : Math.min(
          100,
          Math.round((stats.completedTodayMins / stats.targetDailyMins) * 100),
        );
  const todayStr = formatDate(new Date());

  return (
    <div className="space-y-6">
      <div className="bg-indigo-600 text-white rounded-3xl p-6 md:p-8 shadow-lg shadow-indigo-600/20 relative overflow-hidden border-none">
        <Target
          size={240}
          className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-white"
        />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold tracking-wider uppercase mb-3 backdrop-blur-sm">
                Smart Daily Planner
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
                Today's Action Plan
              </h1>
              <p className="text-indigo-100 font-medium text-sm max-w-xl">
                {paceWarning
                  ? ` You need ${stats.targetDailyMins} mins/day to avoid missing upcoming target dates.`
                  : ` Complete ${stats.targetDailyMins} mins today to stay ahead of schedule.`}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-full md:min-w-[220px] border border-white/20">
              <div className="flex justify-between text-sm font-bold mb-2 text-white">
                <span>Daily Goal</span>
                <span>
                  {stats.completedTodayMins} / {stats.targetDailyMins}m
                </span>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2.5 mb-2">
                <div
                  className="bg-emerald-400 h-2.5 rounded-full transition-all duration-1000"
                  style={{ width: `${todayProgressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-center font-medium text-indigo-100">
                {todayProgressPercent === 100
                  ? "Goal met! Outstanding work. 🎉"
                  : `${stats.targetDailyMins - stats.completedTodayMins > 0 ? stats.targetDailyMins - stats.completedTodayMins : 0} mins left today`}
              </p>
            </div>
          </div>

          <div className="bg-white/5 p-2 rounded-2xl">
            <AnimatePresence>
              {stats.dailyPlan.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 text-center text-indigo-100 font-bold"
                >
                  No lectures scheduled for today! You are fully caught up.
                </motion.p>
              )}
              {stats.dailyPlan.map((lec) => {
                const isUrgent = lec.deadline && lec.deadline <= todayStr;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      transition: { duration: 0.2 },
                    }}
                    key={lec.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border mb-2 last:mb-0 ${isUrgent ? "bg-rose-500/20 border-rose-400/50" : "bg-white/10 border-white/10"}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <button
                        onClick={() =>
                          updateLectureStatus(lec.courseId, lec.id, "completed")
                        }
                        className="w-6 h-6 shrink-0 rounded-full border-2 border-white/50 hover:bg-white/20 flex items-center justify-center transition-colors shadow-sm"
                        title="Mark Complete"
                      ></button>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-sm text-white truncate">
                          {lec.title}
                        </h3>
                        <div className="flex items-center gap-3 text-[11px] font-medium text-indigo-100 mt-1 uppercase tracking-wide truncate">
                          <span className="truncate max-w-[100px] sm:max-w-none">
                            {lec.courseName}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock size={10} /> {lec.duration}m
                          </span>
                          {lec.deadline && (
                            <span
                              className={`flex items-center gap-1 shrink-0 ${isUrgent ? "text-rose-200 font-bold" : ""}`}
                            >
                              <CalIcon size={10} /> Due: {lec.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {lec.url && (
                      <a
                        href={lec.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 shrink-0 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                      >
                        <PlayCircle size={18} />
                      </a>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Required Pace
            </h3>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${paceWarning ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"}`}
            >
              {paceWarning ? <AlertTriangle size={16} /> : <Target size={16} />}
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span
              className={`text-4xl font-extrabold ${paceWarning ? "text-rose-600" : ""}`}
            >
              {stats.targetDailyMins}
            </span>
            <span className="text-sm font-medium text-slate-500">
              mins / day
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            {paceWarning
              ? "Pace increased to hit deadlines."
              : "Comfortably on track."}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Global Backlog
            </h3>
            <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-extrabold">
              {stats.totalPending}
            </span>
            <span className="text-sm font-medium text-slate-500">
              pending ({stats.totalRemainingHours}h)
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Total study workload remaining.
          </p>
        </Card>

        <Card
          className="p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => nav("pomodoro")}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Focus Session
            </h3>
            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 rounded-full flex items-center justify-center">
              <Timer size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              Pomodoro
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Launch 25m Focus Timer →
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Freedom Day
            </h3>
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
              <CalIcon size={16} />
            </div>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight block truncate">
              {stats.pendingMins > 0
                ? stats.projectedDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Cleared! 🎉"}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Accurate simulated trajectory.
          </p>
        </Card>
      </div>
    </div>
  );
}

function CoursesView({
  courses,
  setCourses,
  settings,
  stats,
  updateLectureStatus,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    subject: "",
    color: COURSE_COLORS[0].value,
  });

  const addCourse = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCourses([{ id: `c-${Date.now()}`, ...form, lectures: [] }, ...courses]);
    setForm({ name: "", subject: "", color: COURSE_COLORS[0].value });
    setShowAdd(false);
  };

  let totalLecs = 0,
    clearedLecs = 0;
  (courses || []).forEach((c) => {
    totalLecs += c.lectures.length;
    clearedLecs += c.lectures.filter((l) => l.status === "completed").length;
  });
  const overallPercent =
    totalLecs === 0 ? 0 : Math.round((clearedLecs / totalLecs) * 100);

  const filteredCourses = (courses || []).filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      c.lectures.some((l) => l.title.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1">
            Courses & Backlog
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Remaining: {stats.pendingMins} mins ({stats.totalRemainingHours}{" "}
            hrs) • Clearance:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {stats.projectedDate.toLocaleDateString()}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center shadow-sm hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus size={18} className="mr-2" /> Create Course
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-2 border-l-4 border-l-indigo-500">
              <form
                onSubmit={addCourse}
                className="flex flex-col md:flex-row gap-4 items-end"
              >
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Course Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    placeholder="e.g. Machine Learning Specialization"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Subject Tag
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                    value={form.subject}
                    onChange={(e) =>
                      setForm({ ...form, subject: e.target.value })
                    }
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Color Tag
                  </label>
                  <div className="flex space-x-2 h-12 items-center px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    {COURSE_COLORS.map((c) => (
                      <div
                        key={c.value}
                        onClick={() => setForm({ ...form, color: c.value })}
                        className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${form.color === c.value ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""}`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 bg-indigo-600 text-white font-bold rounded-xl w-full md:w-auto"
                >
                  Save Course
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-300">
            Overall Clearance Progress
          </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {overallPercent}% Cleared
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-6">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-700"
            style={{ width: `${overallPercent}%` }}
          ></div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-4 top-3.5 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search courses or lectures..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <div className="space-y-4">
        {filteredCourses.map((course) => (
          <CourseAccordion
            key={course.id}
            course={course}
            courses={courses}
            setCourses={setCourses}
            settings={settings}
            updateLectureStatus={updateLectureStatus}
          />
        ))}
        {filteredCourses.length === 0 && (
          <div className="text-center text-slate-400 py-10 font-medium">
            No matching courses or lectures found.
          </div>
        )}
      </div>
    </div>
  );
}

function CourseAccordion({
  course,
  courses,
  setCourses,
  settings,
  updateLectureStatus,
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddLec, setShowAddLec] = useState(false);
  const [lecForm, setLecForm] = useState({
    title: "",
    duration: 60,
    url: "",
    deadline: "",
  });

  // State for Editing Course
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editCourseForm, setEditCourseForm] = useState({
    name: course.name,
    subject: course.subject || "",
    color: course.color,
  });

  // State for Editing Lecture
  const [editingLecId, setEditingLecId] = useState(null);
  const [editLecForm, setEditLecForm] = useState({
    title: "",
    duration: "",
    url: "",
    deadline: "",
  });

  const pending = course.lectures.filter((l) => l.status === "pending");
  const totalCompleted = course.lectures.filter(
    (l) => l.status === "completed",
  ).length;
  const total = course.lectures.length;
  const percent = total === 0 ? 0 : Math.round((totalCompleted / total) * 100);

  const sim = simulateClearance(pending, settings?.dailyPaceMinutes);
  const projectedDate =
    pending.length > 0
      ? sim.finalDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Done 🎉";

  const addLectureSubmit = (e) => {
    e.preventDefault();
    if (!lecForm.title.trim()) return;
    setCourses(
      courses.map((c) =>
        c.id === course.id
          ? {
              ...c,
              lectures: [
                ...c.lectures,
                {
                  id: `l-${Date.now()}`,
                  title: lecForm.title,
                  duration: safeNum(lecForm.duration) || 30,
                  url: lecForm.url,
                  deadline: lecForm.deadline || null,
                  status: "pending",
                  needsRevision: false,
                  dateAdded: formatDate(new Date()),
                },
              ],
            }
          : c,
      ),
    );
    setLecForm({ title: "", duration: 60, url: "", deadline: "" });
    setShowAddLec(false);
  };

  const saveCourseEdit = (e) => {
    e.preventDefault();
    if (!editCourseForm.name.trim()) return;
    setCourses(
      courses.map((c) =>
        c.id === course.id ? { ...c, ...editCourseForm } : c,
      ),
    );
    setIsEditingCourse(false);
  };

  const startEditLec = (lec) => {
    setEditingLecId(lec.id);
    setEditLecForm({
      title: lec.title,
      duration: lec.duration,
      url: lec.url || "",
      deadline: lec.deadline || "",
    });
  };

  const saveLecEdit = (e) => {
    e.preventDefault();
    if (!editLecForm.title.trim()) return;
    setCourses(
      courses.map((c) =>
        c.id === course.id
          ? {
              ...c,
              lectures: c.lectures.map((l) =>
                l.id === editingLecId
                  ? {
                      ...l,
                      ...editLecForm,
                      duration: safeNum(editLecForm.duration) || 30,
                      deadline: editLecForm.deadline || null,
                    }
                  : l,
              ),
            }
          : c,
      ),
    );
    setEditingLecId(null);
  };

  const deleteCourse = () => {
    if (
      confirm(
        `Are you sure you want to delete "${course.name}" and all its lectures?`,
      )
    )
      setCourses(courses.filter((c) => c.id !== course.id));
  };

  const todayStr = formatDate(new Date());

  // --- NEW: Filter lectures into Active and Completed ---
  const activeLectures = course.lectures.filter(
    (l) => l.status !== "completed" || l.needsRevision,
  );
  const completedLectures = course.lectures.filter(
    (l) => l.status === "completed" && !l.needsRevision,
  );

  // --- NEW: Helper function to render a single lecture row ---
  const renderLecture = (lec) => {
    if (editingLecId === lec.id) {
      return (
        <div
          key={lec.id}
          className="p-3 sm:p-3.5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm mx-2 sm:mx-3 my-1.5"
        >
          <form
            onSubmit={saveLecEdit}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-2 md:col-span-4 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Title
              </label>
              <input
                type="text"
                required
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editLecForm.title}
                onChange={(e) =>
                  setEditLecForm({ ...editLecForm, title: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Mins
              </label>
              <input
                type="number"
                min="1"
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editLecForm.duration}
                onChange={(e) =>
                  setEditLecForm({ ...editLecForm, duration: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                Deadline
              </label>
              <input
                type="date"
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editLecForm.deadline}
                onChange={(e) =>
                  setEditLecForm({ ...editLecForm, deadline: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2 md:col-span-2 flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                URL (Opt)
              </label>
              <input
                type="url"
                className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editLecForm.url}
                onChange={(e) =>
                  setEditLecForm({ ...editLecForm, url: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2 md:col-span-2 flex gap-2 items-end">
              <button
                type="button"
                onClick={() => setEditingLecId(null)}
                className="h-[38px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-xs w-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-[38px] bg-indigo-600 text-white font-bold rounded-lg text-xs w-full hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      );
    }

    const isOverdue =
      lec.deadline && lec.deadline < todayStr && lec.status !== "completed";
    return (
      <div
        key={lec.id}
        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl border ${isOverdue ? "border-rose-300 dark:border-rose-800" : "border-slate-100 dark:border-slate-800/80"} shadow-sm mx-2 sm:mx-3 my-1.5 gap-3`}
      >
        <div className="flex items-start sm:items-center gap-3 overflow-hidden">
          <div
            className="w-2.5 h-2.5 rounded-full mt-1 sm:mt-0 shrink-0"
            style={{ backgroundColor: course.color }}
          />
          <div className="overflow-hidden">
            <h4
              className={`font-bold text-sm text-slate-900 dark:text-white truncate ${lec.status === "completed" && !lec.needsRevision ? "line-through text-slate-400" : ""}`}
            >
              {lec.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium text-slate-500 mt-0.5">
              <span className="flex items-center gap-1 shrink-0">
                <Clock size={12} /> {lec.duration}m
              </span>
              {lec.deadline && (
                <span
                  className={`flex items-center gap-1 shrink-0 ${isOverdue ? "text-rose-600 font-bold" : "text-indigo-500 font-bold"}`}
                >
                  <CalIcon size={12} /> {isOverdue ? "Overdue: " : "Deadline: "}{" "}
                  {lec.deadline}
                </span>
              )}
              {lec.needsRevision && (
                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 rounded border border-amber-200 dark:border-amber-800/50 font-bold text-[10px] shrink-0">
                  Needs Revision
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 self-end sm:self-auto shrink-0">
          {lec.url && (
            <a
              href={lec.url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 sm:p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors"
            >
              <PlayCircle size={18} />
            </a>
          )}
          <select
            className={`appearance-none font-bold text-xs px-2 sm:px-3 py-1.5 rounded-lg border outline-none pr-6 sm:pr-7 bg-no-repeat bg-[right_0.4rem_center] bg-[length:0.8em_0.8em] cursor-pointer ${lec.needsRevision ? "bg-amber-50 text-amber-700 border-amber-200" : lec.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"}`}
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748B%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
            }}
            value={lec.needsRevision ? "needs_revision" : lec.status}
            onChange={(e) =>
              updateLectureStatus(course.id, lec.id, e.target.value)
            }
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="needs_revision">Needs Revision</option>
          </select>
          <button
            onClick={() => startEditLec(lec)}
            className="p-1.5 text-slate-300 hover:text-indigo-500 transition-colors"
            title="Edit Lecture"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() =>
              setCourses(
                courses.map((c) =>
                  c.id === course.id
                    ? {
                        ...c,
                        lectures: c.lectures.filter((l) => l.id !== lec.id),
                      }
                    : c,
                ),
              )
            }
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
            title="Delete Lecture"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-visible">
      {isEditingCourse ? (
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <form
            onSubmit={saveCourseEdit}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Course Name
              </label>
              <input
                type="text"
                required
                className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editCourseForm.name}
                onChange={(e) =>
                  setEditCourseForm({ ...editCourseForm, name: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Subject Tag
              </label>
              <input
                type="text"
                className="w-full p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none focus:border-indigo-500"
                value={editCourseForm.subject}
                onChange={(e) =>
                  setEditCourseForm({
                    ...editCourseForm,
                    subject: e.target.value,
                  })
                }
              />
            </div>
            <div className="w-full md:w-auto">
              <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                Color Tag
              </label>
              <div className="flex space-x-2 h-10 items-center px-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                {COURSE_COLORS.map((c) => (
                  <div
                    key={c.value}
                    onClick={() =>
                      setEditCourseForm({ ...editCourseForm, color: c.value })
                    }
                    className={`w-5 h-5 rounded-full cursor-pointer transition-transform ${editCourseForm.color === c.value ? "scale-125 ring-2 ring-offset-2 ring-slate-400" : ""}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setIsEditingCourse(false)}
                className="h-10 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-sm w-full md:w-auto hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-4 bg-indigo-600 text-white font-bold rounded-lg text-sm w-full md:w-auto hover:bg-indigo-700 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center space-x-4 overflow-hidden">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-sm text-white flex-shrink-0"
              style={{ backgroundColor: course.color }}
            >
              <BookOpen size={20} className="sm:w-6 sm:h-6" />
            </div>
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-lg sm:text-xl font-extrabold truncate">
                  {course.name}
                </h2>
                {course.subject && (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase border border-slate-200 dark:border-slate-700 truncate max-w-full">
                    {course.subject}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1 truncate">
                {totalCompleted}/{total} cleared ({percent}%) • Target:{" "}
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {projectedDate}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
            <div className="w-20 sm:w-28 hidden md:flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500">
                {percent}%
              </span>
              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: course.color,
                    width: `${percent}%`,
                  }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowAddLec(!showAddLec)}
              className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-bold text-xs sm:text-sm flex items-center transition-colors"
            >
              <Plus size={16} className="sm:mr-1" />
              <span className="hidden sm:inline">Add Lecture</span>
            </button>
            <button
              onClick={() => setIsEditingCourse(true)}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-indigo-500 transition-colors"
              title="Edit Course"
            >
              <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <button
              onClick={deleteCourse}
              className="p-1.5 sm:p-2 text-slate-300 hover:text-red-500 transition-colors"
              title="Delete Course"
            >
              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 transition-transform"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <ChevronDown size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddLec && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 p-4"
          >
            <form
              onSubmit={addLectureSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3"
            >
              <div className="sm:col-span-2 md:col-span-4 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Lecture Title"
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                  value={lecForm.title}
                  onChange={(e) =>
                    setLecForm({ ...lecForm, title: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="md:col-span-2 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Mins
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Duration"
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                  value={lecForm.duration}
                  onChange={(e) =>
                    setLecForm({ ...lecForm, duration: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-3 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Deadline (Opt)
                </label>
                <input
                  type="date"
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                  value={lecForm.deadline}
                  onChange={(e) =>
                    setLecForm({ ...lecForm, deadline: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 md:col-span-2 flex flex-col">
                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  URL (Opt)
                </label>
                <input
                  type="url"
                  placeholder="Video Link"
                  className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                  value={lecForm.url}
                  onChange={(e) =>
                    setLecForm({ ...lecForm, url: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2 md:col-span-1 flex flex-col justify-end">
                <button
                  type="submit"
                  className="h-[42px] bg-indigo-600 text-white font-bold rounded-lg text-sm w-full"
                >
                  Add
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-slate-50/50 dark:bg-slate-950/30"
          >
            <div className="p-2 space-y-1">
              {course.lectures.length === 0 && (
                <p className="text-xs font-semibold text-slate-400 text-center py-4">
                  No lectures added yet. Click "+ Add Lecture" above.
                </p>
              )}

              {/* --- RENDER ACTIVE LECTURES --- */}
              {activeLectures.length > 0 &&
                activeLectures.map((lec) => renderLecture(lec))}

              {/* --- RENDER COMPLETED LECTURES --- */}
              {completedLectures.length > 0 && (
                <div className="pt-3 pb-1 px-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Completed Work
                  </h4>
                </div>
              )}
              {completedLectures.map((lec) => renderLecture(lec))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/**  end**/

function RevisionView({
  courses,
  setCourses,
  customRevisions,
  setCustomRevisions,
  queue,
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    courseName: "General Review",
    duration: 30,
    url: "",
  });

  const addCustomRevision = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCustomRevisions([
      { id: `cr-${Date.now()}`, ...form, courseColor: "#8B5CF6" },
      ...(customRevisions || []),
    ]);
    setForm({ title: "", courseName: "General Review", duration: 30, url: "" });
    setShowAdd(false);
  };

  const markRevised = (item) => {
    if (item.isCustom)
      setCustomRevisions(customRevisions.filter((cr) => cr.id !== item.id));
    else
      setCourses(
        courses.map((c) =>
          c.id !== item.courseId
            ? c
            : {
                ...c,
                lectures: c.lectures.map((l) =>
                  l.id === item.id ? { ...l, needsRevision: false } : l,
                ),
              },
        ),
      );
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">
            Recap & Retention
          </h3>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            Revision Queue
          </h1>
          <p className="text-slate-500 font-medium">
            Flagged course lectures & custom study recaps needing review.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center w-full sm:w-auto shadow-sm transition-colors"
        >
          <Plus size={18} className="mr-2" /> Add Revision Item
        </button>
      </Card>
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-4 border-l-4 border-l-amber-500">
              <form
                onSubmit={addCustomRevision}
                className="grid grid-cols-1 md:grid-cols-12 gap-3"
              >
                <div className="md:col-span-4">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Topic / Lecture Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dynamic Programming Recap"
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    autoFocus
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Category / Course Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Algorithms"
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                    value={form.courseName}
                    onChange={(e) =>
                      setForm({ ...form, courseName: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Recap Mins
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="30"
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">
                    Video Link (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    className="w-full p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium outline-none"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                  />
                </div>
                <div className="md:col-span-12 flex justify-end gap-2 mt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-sm w-full md:w-auto"
                  >
                    Save Revision Item
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-4">
        {queue.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center text-slate-400 font-medium">
            <RefreshCw size={36} className="mx-auto mb-3 text-slate-300" /> No
            revisions pending. Click "+ Add Revision Item" above to add custom
            review topics!
          </Card>
        ) : (
          queue.map((item) => (
            <Card
              key={item.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:shadow-md transition-shadow gap-4"
            >
              <div className="flex items-start sm:items-center gap-4 overflow-hidden">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-50 dark:bg-amber-950 text-amber-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={20} />
                </div>
                <div className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    <h3 className="text-base sm:text-lg font-bold truncate">
                      {item.title}
                    </h3>
                    <Badge colorClass="bg-indigo-600 text-white shadow-sm">
                      {item.courseName || "General Review"}
                    </Badge>
                    {item.isCustom && (
                      <Badge colorClass="bg-amber-100 text-amber-700">
                        Custom Added
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-500 truncate">
                    Duration: {item.duration} mins{" "}
                    {item.completedDate
                      ? `• Completed on: ${item.completedDate}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto shrink-0">
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 flex items-center shadow-sm text-xs sm:text-sm"
                  >
                    <ExternalLink size={16} className="sm:mr-2" />
                    <span className="hidden sm:inline">Watch Video</span>
                  </a>
                )}
                <button
                  onClick={() => markRevised(item)}
                  className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center shadow-sm text-xs sm:text-sm"
                >
                  <CheckCircle2 size={16} className="mr-1 sm:mr-2" /> Mark
                  Revised
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function PomodoroView({ pomoLog, setPomoLog }) {
  const [mode, setMode] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isRunning && timeLeft > 0)
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      playChime();
      if (mode === 25) {
        setSessionsCompleted((prev) => prev + 1);
        setPomoLog([
          ...(pomoLog || []),
          { id: Date.now(), date: formatDate(new Date()), mins: 25 },
        ]);
        alert(
          "Focus session complete! 25 minutes logged to your daily study target.",
        );
      } else alert("Break time over! Ready to lock back in?");
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode, pomoLog, setPomoLog]);

  const switchMode = (m) => {
    setIsRunning(false);
    setMode(m);
    setTimeLeft(m * 60);
  };
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto text-center">
      <Card className="p-6 sm:p-12 border-t-8 border-t-indigo-600">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">
          Focus Pomodoro Timer
        </h1>
        <p className="text-sm sm:text-base text-slate-500 font-medium mb-8">
          25-minute sprints to clear backlog lectures smoothly. Completed focus
          time counts automatically toward your daily study target.
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          <button
            onClick={() => switchMode(25)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold transition-all text-sm sm:text-base ${mode === 25 ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
          >
            25m Focus
          </button>
          <button
            onClick={() => switchMode(5)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold transition-all text-sm sm:text-base ${mode === 5 ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
          >
            5m Break
          </button>
          <button
            onClick={() => switchMode(15)}
            className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-bold transition-all text-sm sm:text-base ${mode === 15 ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}
          >
            15m Break
          </button>
        </div>
        <div className="text-6xl sm:text-7xl font-extrabold font-mono tracking-tighter my-8 text-slate-900 dark:text-white">
          {formattedTime}
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-transform active:scale-95"
          >
            {isRunning ? (
              <Pause size={28} />
            ) : (
              <Play size={28} className="ml-1" />
            )}
          </button>
          <button
            onClick={() => switchMode(mode)}
            className="w-14 h-14 sm:w-16 sm:h-16 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <RotateCcw size={24} />
          </button>
        </div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-8 sm:mt-10">
          Sessions Completed Today: {sessionsCompleted}
        </p>
      </Card>
    </div>
  );
}

function TodosView({ todos, setTodos }) {
  const [filter, setFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "",
    dueDate: formatDate(new Date()),
    priority: "Medium",
    notes: "",
  });

  const add = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setTodos([{ ...form, id: Date.now(), completed: false }, ...(todos || [])]);
    setForm({
      title: "",
      dueDate: formatDate(new Date()),
      priority: "Medium",
      notes: "",
    });
    setShowAdd(false);
  };
  const toggle = (id) =>
    setTodos(
      (todos || []).map((t) =>
        t.id === id
          ? {
              ...t,
              completed: !t.completed,
              completedDate: !t.completed ? formatDate(new Date()) : null,
            }
          : t,
      ),
    );
  const remove = (id) => setTodos((todos || []).filter((t) => t.id !== id));

  const filtered = (todos || [])
    .filter((t) => {
      if (filter === "ACTIVE") return !t.completed;
      if (filter === "COMPLETED") return t.completed;
      return true;
    })
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); // Sort by due date ascending

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">
            Task Management
          </h3>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
            To-Do List & Assignments
          </h1>
          <p className="text-slate-500 font-medium">
            Keep track of daily deadlines, homework, and study check-ins.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center w-full sm:w-auto shadow-sm"
        >
          <Plus size={18} className="mr-2" /> Add New Task
        </button>
      </Card>
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-6 mb-4 border-l-4 border-l-indigo-600">
              <form onSubmit={add} className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  required
                  placeholder="Task description..."
                  className="flex-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
                <input
                  type="date"
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm({ ...form, dueDate: e.target.value })
                  }
                />
                <select
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none font-medium"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl"
                >
                  Save
                </button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex flex-wrap gap-2">
        {["ALL", "ACTIVE", "COMPLETED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 sm:px-6 py-2 rounded-full font-bold text-xs sm:text-sm transition-colors shadow-sm border ${filter === f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:bg-slate-50"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-slate-400 font-medium">
            No tasks found matching this filter.
          </Card>
        )}
        {filtered.map((todo) => (
          <Card
            key={todo.id}
            className={`p-4 sm:p-5 flex items-center justify-between transition-all ${todo.completed ? "opacity-60 bg-slate-50/50 dark:bg-slate-950/20" : ""}`}
          >
            <div className="flex items-start gap-3 sm:gap-4 flex-1 overflow-hidden">
              <button
                onClick={() => toggle(todo.id)}
                className={`mt-1 w-5 h-5 sm:w-6 sm:h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${todo.completed ? "bg-indigo-600 border-indigo-600" : "border-slate-300"}`}
              >
                {todo.completed && <CheckCircle2 size={16} color="white" />}
              </button>
              <div className="overflow-hidden">
                <h3
                  className={`font-bold text-base sm:text-lg truncate ${todo.completed ? "line-through text-slate-400" : "text-slate-900 dark:text-white"}`}
                >
                  {todo.title}
                </h3>
                <div className="flex flex-wrap gap-2 sm:gap-3 items-center mt-1">
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
                    <CalIcon size={12} /> Due: {todo.dueDate}
                  </span>
                  {!todo.completed && (
                    <Badge
                      colorClass={
                        todo.priority === "High"
                          ? "bg-rose-50 text-rose-600"
                          : todo.priority === "Medium"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-blue-50 text-blue-600"
                      }
                    >
                      {todo.priority}
                    </Badge>
                  )}
                  {todo.notes && (
                    <span className="text-[10px] sm:text-xs text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                      • {todo.notes}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => remove(todo.id)}
              className="p-2 shrink-0 text-slate-300 hover:text-red-500 rounded-full transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CalendarView({
  courses,
  todos,
  settings,
  notes,
  setNotes,
  projectedDate,
  pomoLog,
}) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDateStr, setSelectedDateStr] = useState(
    formatDate(new Date()),
  );

  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  const goToToday = () => {
    setCurrentDate(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );
    setSelectedDateStr(formatDate(new Date()));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const daysGrid = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - firstDayIndex + 1;
    if (dayNum > 0 && dayNum <= totalDays) return new Date(year, month, dayNum);
    return null;
  });

  const allLecs = [];
  (courses || []).forEach((c) =>
    c.lectures.forEach((l) =>
      allLecs.push({ ...l, courseName: c.name, color: c.color }),
    ),
  );
  const projectedStr = formatDate(projectedDate);

  const selectedTodos = (todos || []).filter(
    (t) => t.dueDate === selectedDateStr,
  );
  const selectedLecsDue = allLecs.filter(
    (l) => l.deadline === selectedDateStr && l.status === "pending",
  );
  const selectedLecsDone = allLecs.filter(
    (l) => l.status === "completed" && l.completedDate === selectedDateStr,
  );
  const selectedPomoMins = (pomoLog || [])
    .filter((p) => p.date === selectedDateStr)
    .reduce((acc, p) => acc + safeNum(p.mins), 0);
  const selectedNote = notes[selectedDateStr] || "";

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      <div className="flex-1 space-y-6">
        <Card className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <CalIcon size={28} className="text-indigo-600 sm:w-8 sm:h-8" />
              {currentDate.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={goToToday}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mr-1 sm:mr-2"
              >
                Today
              </button>
              <button
                onClick={prevMonth}
                className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-3 mb-2 sm:mb-3 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="hidden sm:block">
                {d}
              </div>
            ))}
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} className="sm:hidden">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-3">
            {daysGrid.map((date, i) => {
              if (!date)
                return (
                  <div
                    key={i}
                    className="min-h-[60px] sm:min-h-[100px] md:min-h-[120px] rounded-xl sm:rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/50 opacity-50"
                  />
                );
              const dateStr = formatDate(date);
              const isToday = dateStr === formatDate(new Date());
              const isSelected = dateStr === selectedDateStr;
              const dayTodosCount = (todos || []).filter(
                (t) => t.dueDate === dateStr,
              ).length;
              const dayLecsDueCount = allLecs.filter(
                (l) => l.deadline === dateStr && l.status === "pending",
              ).length;

              return (
                <div
                  key={i}
                  onClick={() => setSelectedDateStr(dateStr)}
                  className={`min-h-[60px] sm:min-h-[100px] md:min-h-[120px] p-1 sm:p-2.5 rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all flex flex-col ${isSelected ? "border-indigo-600 shadow-md bg-indigo-50/30 dark:bg-indigo-900/20" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700"}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[10px] sm:text-sm font-bold ${isToday ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-300"}`}
                    >
                      {date.getDate()}
                    </span>
                    {dateStr === projectedStr && (
                      <TargetIcon
                        size={12}
                        className="text-emerald-500 mt-0.5 sm:mt-1 shrink-0"
                        title="Projected Freedom Day"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 sm:mt-1 flex flex-col gap-1 sm:gap-1.5 overflow-hidden">
                    {!!notes[dateStr] && (
                      <div className="text-[8px] sm:text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 sm:px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                        <Edit3 size={8} className="hidden sm:block" /> Note
                      </div>
                    )}
                    {dayTodosCount > 0 && (
                      <div className="text-[8px] sm:text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1 sm:px-1.5 py-0.5 rounded truncate w-full">
                        {dayTodosCount}{" "}
                        <span className="hidden sm:inline">
                          Task{dayTodosCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                    {dayLecsDueCount > 0 && (
                      <div className="text-[8px] sm:text-[10px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 px-1 sm:px-1.5 py-0.5 rounded truncate w-full">
                        {dayLecsDueCount}{" "}
                        <span className="hidden sm:inline">
                          Deadline{dayLecsDueCount > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
      <Card className="w-full xl:w-96 flex flex-col shrink-0 h-fit xl:h-[calc(100vh-8rem)] xl:sticky xl:top-8 overflow-hidden bg-slate-50 dark:bg-slate-900 border-none shadow-lg">
        <div className="p-5 sm:p-6 bg-indigo-600 text-white">
          <h3 className="text-xs sm:text-sm font-bold text-indigo-200 uppercase tracking-widest mb-1">
            Daily Agenda
          </h3>
          <h2 className="text-xl sm:text-2xl font-extrabold">
            {new Date(selectedDateStr).toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </h2>
          {selectedDateStr === formatDate(new Date()) && (
            <Badge colorClass="bg-white/20 text-white mt-2 sm:mt-3 inline-block">
              Today
            </Badge>
          )}
          {selectedDateStr === projectedStr && (
            <Badge colorClass="bg-emerald-400/20 text-emerald-100 border border-emerald-400/50 mt-2 sm:mt-3 inline-block ml-2">
              Freedom Day Target 🎯
            </Badge>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              <Edit3 size={14} /> Day Notes
            </div>
            <textarea
              placeholder="Plan your day, jot down reminders, or reflect on your studies..."
              className="w-full h-24 sm:h-32 p-3 sm:p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-sm font-medium resize-none shadow-sm transition-colors"
              value={selectedNote}
              onChange={(e) =>
                setNotes({ ...notes, [selectedDateStr]: e.target.value })
              }
            />
          </div>
          <hr className="border-slate-200 dark:border-slate-800" />
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              <AlertTriangle size={14} /> Deadlines & Tasks
            </div>
            {selectedLecsDue.length === 0 && selectedTodos.length === 0 && (
              <p className="text-sm text-slate-400 font-medium italic">
                Nothing scheduled for this day.
              </p>
            )}
            {selectedLecsDue.map((l, i) => (
              <div
                key={`lec-${i}`}
                className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl flex items-start gap-3"
              >
                <div className="w-2 h-2 mt-1.5 rounded-full bg-rose-500 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">
                    {l.title}
                  </p>
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-1">
                    Course Deadline ({l.duration}m)
                  </p>
                </div>
              </div>
            ))}
            {selectedTodos.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-3 shadow-sm"
              >
                <div
                  className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${t.completed ? "bg-emerald-500" : "bg-amber-500"}`}
                />
                <div className="overflow-hidden">
                  <p
                    className={`text-sm font-bold leading-tight truncate ${t.completed ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    To-Do • Priority: {t.priority}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <hr className="border-slate-200 dark:border-slate-800" />
          <div className="space-y-3 pb-6">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
              <CheckCircle2 size={14} /> Completed Work
            </div>
            {selectedLecsDone.length === 0 && selectedPomoMins === 0 ? (
              <p className="text-sm text-slate-400 font-medium italic">
                No work recorded on this date.
              </p>
            ) : null}
            {selectedLecsDone.map((l, i) => (
              <div
                key={`done-${i}`}
                className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-start gap-3"
              >
                <CheckCircle2
                  size={16}
                  className="text-emerald-500 mt-0.5 shrink-0"
                />
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight truncate">
                    {l.title}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-500 mt-1">
                    Cleared (+{l.duration}m)
                  </p>
                </div>
              </div>
            ))}
            {selectedPomoMins > 0 && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-start gap-3">
                <Timer size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-tight truncate">
                    Focus Sessions Logged
                  </p>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                    Pomodoro (+{selectedPomoMins}m)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function StatsView({ courses, streak, stats, settings, pomoLog }) {
  const tooltipStyle = {
    backgroundColor: settings?.theme === "dark" ? "#1E293B" : "#fff",
    color: settings?.theme === "dark" ? "#F8FAFC" : "#0F172A",
    border: "none",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  const weeklyTargetVsAchieved = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      let achieved = 0;
      (courses || []).forEach((c) =>
        c.lectures.forEach((l) => {
          if (l.status === "completed" && l.completedDate === dateStr)
            achieved += safeNum(l.duration);
        }),
      );
      (pomoLog || [])
        .filter((p) => p.date === dateStr)
        .forEach((p) => (achieved += safeNum(p.mins)));
      days.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        Achieved: achieved,
        Target: stats.targetDailyMins,
      });
    }
    return days;
  }, [courses, pomoLog, stats.targetDailyMins]);

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
          Analytics & Performance
        </h1>
        <p className="text-slate-500 font-medium">
          Visual graphs comparing daily targets, study output, and backlog
          reduction curves.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold mb-1">
            Target vs. Achieved Output
          </h3>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-4 sm:mb-6">
            Daily minutes completed vs required target (Past 7 Days)
          </p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTargetVsAchieved}>
                <XAxis
                  dataKey="day"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar
                  dataKey="Target"
                  fill={settings?.theme === "dark" ? "#334155" : "#E2E8F0"}
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="Achieved" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-bold mb-1">
            Backlog Clearance Curve
          </h3>
          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-4 sm:mb-6">
            Simulated backlog reduction trajectory to Freedom Day
          </p>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trajectory}>
                <XAxis
                  dataKey="date"
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="RemainingMins"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.15}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SettingsView({
  settings,
  setSettings,
  courses,
  setCourses,
  todos,
  setTodos,
  setCustomRevisions,
  setPomoLog,
  setCalendarNotes,
}) {
  const exportData = () => {
    const data = {
      courses,
      todos,
      settings,
      customRevisions,
      pomoLog,
      calendarNotes:
        JSON.parse(localStorage.getItem("cadence_calendar_notes")) || {},
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(data)], { type: "application/json" }),
    );
    a.download = `cadence-backup-${formatDate(new Date())}.json`;
    a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.courses) setCourses(data.courses);
        if (data.todos) setTodos(data.todos);
        if (data.settings) setSettings({ ...settings, ...data.settings }); // Merge to preserve defaults
        if (data.calendarNotes) setCalendarNotes(data.calendarNotes);
        if (data.customRevisions) setCustomRevisions(data.customRevisions);
        if (data.pomoLog) setPomoLog(data.pomoLog);
        alert("Backup restored successfully!");
      } catch (err) {
        alert("Invalid JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-extrabold mb-1">
          Base Daily Pace Goal
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-4">
          Set your standard daily study time. The Smart Daily Engine will
          automatically increase this if your deadlines require a faster pace.
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          <input
            type="number"
            min="1"
            className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-base sm:text-lg w-24 sm:w-36 outline-none focus:border-indigo-500"
            value={settings?.dailyPaceMinutes || 120}
            onChange={(e) =>
              setSettings({
                ...settings,
                dailyPaceMinutes: safeNum(e.target.value),
              })
            }
          />
          <span className="font-bold text-slate-500 text-sm sm:text-base">
            minutes / day
          </span>
        </div>
      </Card>
      <Card className="p-6 sm:p-8 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold mb-1">
            Appearance Mode
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500">
            Switch between light and dark interface themes.
          </p>
        </div>
        <button
          onClick={() =>
            setSettings({
              ...settings,
              theme: settings?.theme === "dark" ? "light" : "dark",
            })
          }
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border-2 border-slate-200 dark:border-slate-700 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto text-sm sm:text-base"
        >
          {settings?.theme === "dark" ? (
            <>
              <Sun size={18} className="text-amber-400" /> Light Theme
            </>
          ) : (
            <>
              <Moon size={18} /> Dark Theme
            </>
          )}
        </button>
      </Card>
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg sm:text-xl font-extrabold mb-1">
          Backup & Restore (JSON)
        </h2>
        <p className="text-xs sm:text-sm font-medium text-slate-500 mb-4 sm:mb-6">
          Since all data is stored locally in your browser via localStorage,
          export a backup JSON file periodically to prevent data loss.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            onClick={exportData}
            className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold flex items-center justify-center shadow-md text-sm sm:text-base"
          >
            <Download size={18} className="mr-2" /> Export JSON
          </button>
          <label className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center cursor-pointer hover:bg-slate-50 text-sm sm:text-base">
            <Upload size={18} className="mr-2" /> Import JSON
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
            />
          </label>
        </div>
      </Card>
      <Card className="p-6 sm:p-8 bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-red-600 mb-1">
            Danger Zone
          </h2>
          <p className="text-xs sm:text-sm font-medium text-red-500">
            Clear all courses, backlog lectures, and reset settings.
          </p>
        </div>
        <button
          onClick={() => {
            if (confirm("Are you sure? This will wipe all data permanently.")) {
              setCourses([]);
              setTodos([]);
              setCustomRevisions([]);
              setPomoLog([]);
              setCalendarNotes({});
              localStorage.clear();
              window.location.reload();
            }
          }}
          className="px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl bg-red-600 text-white font-bold shadow-md hover:bg-red-700 transition-colors w-full sm:w-auto text-sm sm:text-base"
        >
          Clear All Data
        </button>
      </Card>
    </div>
  );
}
