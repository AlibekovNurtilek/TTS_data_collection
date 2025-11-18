import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FolderOpen, 
  BookOpen, 
  UserCheck, 
  Mic, 
  LogOut,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/users", label: "Users", icon: Users },
    { to: "/categories", label: "Categories", icon: FolderOpen },
    { to: "/books", label: "Books", icon: BookOpen },
    { to: "/assignments", label: "Assignments", icon: UserCheck },
  ];

  const speakerLinks = [
    { to: "/", label: "My Books", icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : speakerLinks;

  const isActive = (path: string) => {
    if (path === "/" && user?.role === "speaker") {
      return location.pathname === "/" || !location.pathname.startsWith("/record");
    }
    return location.pathname === path;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Professional Sidebar */}
      <aside className="w-72 border-r border-border bg-sidebar flex flex-col studio-shadow">
        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">TTS Studio</h1>
              <p className="text-xs text-muted-foreground font-medium">Professional Recording</p>
            </div>
          </div>
          <div className="pt-3 border-t border-sidebar-border">
            <p className="text-sm font-semibold text-sidebar-foreground">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  active ? "" : "group-hover:scale-110"
                )} />
                <span className="font-medium text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-sidebar-border hover:bg-sidebar-accent hover:border-primary/20"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background">
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
