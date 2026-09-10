import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ClipboardList,
  Megaphone, 
  Settings, 
  LogOut, 
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { logout } from "../../redux/auth/authSlice";


function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());

    navigate("/");
  };
  
  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      path: "/admin/dashboard",
    },
    {
      title: "Students",
      icon: Users,
      path: "/admin/students",
    },
  
    {
      title: "Exams",
      icon: ClipboardList,
      path: "/admin/exams",
    },
    {
      title: "Tests",
      icon: ClipboardList,
      path: "/admin/tests",
    },
    {
      title: "Study Materials",
      icon: FileText,
      path: "/admin/study-materials",
    },
    {
      title: "Results", 
      icon: FileText, 
      path: "/admin/results", 
    },
    {
      title: "Reports",
      icon: FileText,
      path: "/admin/reports",
    },
    {
      title: "Announcements",
      icon: Megaphone,
      path: "/admin/announcements",
    },
    {
      title: "Settings", 
      icon: Settings, 
      path: "/admin/settings", 
    },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900 text-white">

      {/* Logo */}
      <div className="border-b border-slate-700 p-6">
        <h1 className="text-2xl font-bold text-blue-400">
          SCTS
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Admin Panel
        </p>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.title}
              to={item.path}
              className={({ isActive }) =>
                `mb-2 flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <Icon size={20} />
              {item.title}
            </NavLink>
          );
        })}

      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 p-4">

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl bg-red-600 px-4 py-3 transition hover:bg-red-700"
        >
          <LogOut size={20} />
          Logout
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;