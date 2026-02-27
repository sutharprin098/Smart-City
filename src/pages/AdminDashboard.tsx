import { useEffect, useState } from "react";
import { useNavigate, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ComplaintMap from "@/components/admin/ComplaintMap";
import ComplaintTable from "@/components/admin/ComplaintTable";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import WardManagement from "@/components/admin/WardManagement";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminDashboard = () => {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: roleLoading } = useAdminRole();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/admin/login");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/admin/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchComplaints = async () => {
    const { data } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });
    setComplaints(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    fetchComplaints();

    const channel = supabase
      .channel("complaints-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, () => {
        fetchComplaints();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roleLoading, isAdmin]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="card-elevated p-8 max-w-md text-center space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You don't have admin privileges. Contact the system administrator to get access.</p>
          <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const stats = {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    assigned: complaints.filter((c) => c.status === "Assigned").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    completed: complaints.filter((c) => c.status === "Completed").length,
    highPriority: complaints.filter((c) => c.priority === "High").length,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar stats={stats} />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route index element={
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">GIS Map View</h2>
              <div className="card-elevated overflow-hidden" style={{ height: "calc(100vh - 140px)" }}>
                <ComplaintMap complaints={complaints} />
              </div>
            </div>
          } />
          <Route path="complaints" element={
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">All Complaints</h2>
              <ComplaintTable complaints={complaints} onRefresh={fetchComplaints} />
            </div>
          } />
          <Route path="analytics" element={
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">Analytics Dashboard</h2>
              <AnalyticsDashboard complaints={complaints} />
            </div>
          } />
          <Route path="wards" element={<WardManagement />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
