import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Headset, LayoutDashboard, MessageSquarePlus, List, BarChart3,
  LogOut, ChevronRight, ChevronLeft, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const agentNav: NavItem[] = [
    { label: "داشبورد", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "ثبت فیدبک", path: "/feedback", icon: <MessageSquarePlus className="w-5 h-5" /> },
  ];

  const shiftLeadNav: NavItem[] = [
    { label: "داشبورد", path: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "فیدبک زنده", path: "/live-feedback", icon: <List className="w-5 h-5" /> },
    { label: "تحلیل و نمودار", path: "/analytics", icon: <BarChart3 className="w-5 h-5" /> },
    { label: "مدیریت فاز", path: "/phases", icon: <Settings2 className="w-5 h-5" /> },
  ];

  const nav = role === "shiftlead" ? shiftLeadNav : agentNav;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 sticky top-0 h-screen z-30",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Headset className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg whitespace-nowrap">SupportHub</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {nav.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-3 space-y-2">
          {!collapsed && (
            <div className="text-xs text-sidebar-foreground/60 truncate">
              {profile?.full_name || profile?.email}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent mr-auto"
            >
              {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
