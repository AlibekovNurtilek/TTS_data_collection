import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { 
  Users, 
  FolderOpen, 
  BookOpen, 
  UserCheck, 
  Mic, 
  LogOut,
  LayoutDashboard,
  Sparkles,
  User,
  Settings,
  Menu
} from "lucide-react";
import { cn, getAvatarGradient } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isAdmin = user?.role === "admin";

  const adminLinks = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/users", label: "Users", icon: Users },
    { to: "/categories", label: "Categories", icon: FolderOpen },
    { to: "/books", label: "Books", icon: BookOpen },
    { to: "/assignments", label: "Assignments", icon: UserCheck },
  ];

  const speakerLinks = [
    { to: "/", label: "Китептер", icon: BookOpen },
  ];

  const links = isAdmin ? adminLinks : speakerLinks;

  const isActive = (path: string) => {
    if (path === "/" && user?.role === "speaker") {
      return location.pathname === "/" || !location.pathname.startsWith("/record");
    }
    return location.pathname === path;
  };

  const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-white/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-pulse delay-500"></div>
        
        {/* Decorative circles */}
        <div className="absolute top-20 right-10 w-24 h-24 bg-white/15 rounded-full blur-xl"></div>
        <div className="absolute bottom-32 left-8 w-32 h-32 bg-white/12 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-4 w-20 h-20 bg-white/10 rounded-full blur-lg"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-white/20 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 dark:bg-white/10 rounded-2xl blur-lg animate-pulse"></div>
              <div className="relative p-3 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-2xl border border-white/30 dark:border-white/20">
                <Mic className="h-4 w-4 text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Voice Studio</h1>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                active
                  ? "bg-white text-[#0066cc] dark:bg-[#a855f7] dark:text-white shadow-lg shadow-black/20 dark:shadow-[#a855f7]/30 transform scale-[1.02]"
                  : "text-white/90 hover:bg-white/10 hover:text-white hover:shadow-md"
              )}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white dark:bg-[#a855f7] rounded-r-full"></div>
              )}
              
              {/* Hover effect */}
              {!active && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}
              
              <Icon className={cn(
                "h-5 w-5 transition-all duration-300 relative z-10",
                active ? "text-[#0066cc] dark:text-white" : "group-hover:scale-110 group-hover:rotate-3"
              )} />
              <span className={cn(
                "font-semibold text-sm relative z-10",
                active ? "text-[#0066cc] dark:text-white" : ""
              )}>{link.label}</span>
              
              {/* Sparkle effect on hover */}
              {!active && (
                <Sparkles className="h-4 w-4 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-auto relative z-10" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div 
        className="relative z-10 p-4"
        onMouseEnter={() => setIsMenuOpen(true)}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <button className="w-full bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="flex items-center gap-3">
            {/* Avatar with first letter */}
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full border-2 border-white/30 flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-all duration-300 bg-gradient-to-br",
              user?.username ? getAvatarGradient(user.username) : "from-white/20 to-white/10"
            )}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
            </div>
          </div>
        </button>

        {/* Dropdown menu on hover */}
        {isMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-0 bg-white dark:bg-[#1a2332] border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg p-1 opacity-0 animate-[fadeIn_0.2s_ease-out_forwards] z-50">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Navigate to profile
              }}
            >
              <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile</span>
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Navigate to settings
              }}
            >
              <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Settings</span>
            </button>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1"></div>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-left"
              onClick={() => {
                logout();
                if (onLinkClick) onLinkClick();
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background dark:bg-background">
      {/* Desktop Sidebar - скрыт на мобильных */}
      <aside className="hidden md:flex w-72 bg-gradient-to-b from-[#0066cc] via-[#0052a3] to-[#004999] dark:from-[#0a1628] dark:via-[#0d1b2e] dark:to-[#0f1f35] flex-col relative overflow-hidden shadow-2xl border-r border-white/20 dark:border-white/10">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-2 shadow-lg"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-gradient-to-b from-[#0066cc] via-[#0052a3] to-[#004999] dark:from-[#0a1628] dark:via-[#0d1b2e] dark:to-[#0f1f35] border-r border-white/20 dark:border-white/10">
            <div className="flex flex-col h-full relative overflow-hidden">
              <SidebarContent onLinkClick={() => setIsMobileMenuOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-background dark:bg-background border-l border-transparent dark:border-white/5 md:ml-0">
        <div className="min-h-full max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
