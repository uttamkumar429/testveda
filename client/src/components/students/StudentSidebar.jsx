import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Trophy,
  User,
  Settings,
  LogOut,
} from "lucide-react";

const STUDENT_MENUS = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/student/dashboard",
  },
  {
    name: "Available Exams",
    icon: BookOpen,
    path: "/student/exams",
  },
  {
    name: "Study Material",
    icon: FileText,
    path: "/student/study-materials",
  },
  {
    name: "Results",
    icon: Trophy,
    path: "/student/results/history",
  },
  {
    name: "Profile",
    icon: User,
    path: "/student/profile",
  },
  {
  name: "Settings",
  icon: Settings,
  path: "/student/settings",
},
];

function StudentSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();

    navigate("/", {
      replace: true,
    });
  };

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white shadow-sm transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950">
      {/* Logo */}
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-blue-600">
          iRise
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400">
          Student Portal
        </p>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex-1 px-3">
        {STUDENT_MENUS.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                `mb-2 flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-all duration-200 ${
         isActive
           ? "bg-blue-600 text-white shadow-md"
           : "text-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-blue-400"
                }`
              }
            >
              <Icon size={20} />

              <span>{menu.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut size={20} />

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default StudentSidebar;