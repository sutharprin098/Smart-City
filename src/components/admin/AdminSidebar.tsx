import { Map, BarChart3, List, LogOut, AlertTriangle, Clock, CheckCircle, Users, Circle, Layers } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface StatsProps {
  total: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  highPriority: number;
}

const AdminSidebar = ({ stats }: { stats: StatsProps }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const statItems = [
    { label: "Total", value: stats.total, icon: List, color: "text-foreground" },
    { label: "Pending", value: stats.pending, icon: Circle, color: "text-status-pending" },
    { label: "Assigned", value: stats.assigned, icon: Clock, color: "text-status-assigned" },
    { label: "In Progress", value: stats.inProgress, icon: Users, color: "text-status-in-progress" },
    { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-status-completed" },
    { label: "High Priority", value: stats.highPriority, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border min-h-screen">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-display text-lg font-bold text-sidebar-primary">GIS Control Panel</h2>
        <p className="text-xs text-sidebar-foreground/60 mt-0.5">Complaint Management</p>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-2 border-b border-sidebar-border">
        {statItems.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-sidebar-accent/50 transition-colors">
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-sm">{s.label}</span>
            </div>
            <span className="text-sm font-semibold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Nav */}
      <nav className="p-4 flex-1 space-y-1">
        <NavLink to="/admin" end className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
          <Map className="h-4 w-4" /> GIS Map
        </NavLink>
        <NavLink to="/admin/complaints" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
          <List className="h-4 w-4" /> All Complaints
        </NavLink>
        <NavLink to="/admin/analytics" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
          <BarChart3 className="h-4 w-4" /> Analytics
        </NavLink>
        <NavLink to="/admin/wards" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-sidebar-accent transition-colors" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
          <Layers className="h-4 w-4" /> Ward Boundaries
        </NavLink>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
