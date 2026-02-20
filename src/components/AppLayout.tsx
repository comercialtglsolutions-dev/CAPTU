import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Users,
  Megaphone,
  MessageSquare,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  Menu
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/search", icon: Search, label: "Buscar" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/campaigns", icon: Megaphone, label: "Campanhas" },
  { to: "/contacts", icon: MessageSquare, label: "Contatos" },
  { to: "/metrics", icon: BarChart3, label: "Métricas" },
  { to: "/automations", icon: Zap, label: "Automações" },
];

const bottomItems = [
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado com sucesso",
        description: "Até logo!",
      });

      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4 overflow-hidden">
          <Link to="/" className="flex items-center gap-2 overflow-hidden">
            <img
              src={collapsed ? "/captu-collapsed.jpg" : "/captu.png"}
              alt="CAPTU Logo"
              className={cn(
                "h-50 w-auto transition-all duration-300",
                collapsed ? "min-w-[70px] ml-[-18px]" : "min-w-[120px]"
              )}
              style={{ filter: "brightness(1.1)" }}
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="animate-fade-in">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="space-y-1 border-t border-sidebar-border px-2 py-4">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span>Recolher</span>
              </>
            )}
          </button>
          {bottomItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Modo Claro</span>}
              </>
            ) : (
              <>
                <Moon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Modo Escuro</span>}
              </>
            )}
          </button>

          <button
            onClick={() => setLogoutDialogOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 shrink-0 relative">
          <div className="w-10" /> {/* Spacer */}
          <Link to="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <img src="/captu.png" alt="CAPTU Logo" className="h-8 w-auto" style={{ filter: "brightness(1.1)" }} />
          </Link>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground">
                <Menu className="h-6 w-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 border-r-sidebar-border bg-sidebar">
              <SheetHeader className="h-16 border-b border-sidebar-border px-4 flex-row items-center justify-between space-y-0">
                <SheetTitle className="text-left">
                  <img src="/captu.png" alt="CAPTU Logo" className="h-6 w-auto" style={{ filter: "brightness(1.1)" }} />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-[calc(100vh-64px)]">
                <nav className="flex-1 space-y-1 px-2 py-4">
                  {navItems.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="space-y-1 border-t border-sidebar-border px-2 py-4">
                  {bottomItems.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-colors",
                          active
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    {theme === "dark" ? (
                      <>
                        <Sun className="h-5 w-5 shrink-0" />
                        <span>Modo Claro</span>
                      </>
                    ) : (
                      <>
                        <Moon className="h-5 w-5 shrink-0" />
                        <span>Modo Escuro</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setLogoutDialogOpen(true)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será desconectado da sua conta e precisará fazer login novamente para acessar a plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
