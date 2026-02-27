import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, Clock, MapPin, User, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const statusSteps = ["Pending", "Assigned", "In Progress", "Completed"];
const statusIcons: Record<string, string> = {
  Pending: "🔴",
  Assigned: "🟠",
  "In Progress": "🔵",
  Completed: "🟢",
};

const TrackComplaint = () => {
  const [searchParams] = useSearchParams();
  const [trackId, setTrackId] = useState(searchParams.get("id") || "");
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!trackId.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data, error } = await supabase
      .from("complaints")
      .select("*")
      .eq("complaint_id", trackId.trim().toUpperCase())
      .maybeSingle();
    setComplaint(data);
    setLoading(false);
  };

  useEffect(() => {
    if (searchParams.get("id")) search();
  }, []);

  const currentStepIndex = complaint ? statusSteps.indexOf(complaint.status) : -1;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Track Complaint</h1>
            <p className="text-xs text-muted-foreground">Check your complaint status</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="card-elevated p-6 mb-6">
          <div className="flex gap-2">
            <Input
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              placeholder="Enter Complaint ID (e.g., SC2026-000001)"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button onClick={search} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
        )}

        {!loading && searched && !complaint && (
          <div className="card-elevated p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground mb-1">Not Found</h3>
            <p className="text-sm text-muted-foreground">No complaint found with this ID. Please check and try again.</p>
          </div>
        )}

        {complaint && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Timeline */}
            <div className="card-elevated p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Status Timeline</h3>
              <div className="flex items-center justify-between mb-6">
                {statusSteps.map((step, i) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 ${
                      i <= currentStepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {i <= currentStepIndex ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs text-center ${i <= currentStepIndex ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{statusIcons[complaint.status]}</span>
                <span className="font-semibold text-foreground">Current: {complaint.status}</span>
              </div>
            </div>

            {/* Details */}
            <div className="card-elevated p-6">
              <h3 className="font-display font-semibold text-foreground mb-4">Complaint Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Complaint ID</p>
                  <p className="font-mono font-semibold text-foreground">{complaint.complaint_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <Badge variant="secondary">{complaint.category}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Ward</p>
                  <p className="text-foreground">{complaint.ward_name || "Not detected"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned Staff</p>
                  <p className="text-foreground">{complaint.assigned_staff || "Not yet assigned"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Priority</p>
                  <Badge variant={complaint.priority === "High" ? "destructive" : "secondary"}>{complaint.priority}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="text-foreground">{new Date(complaint.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-muted-foreground text-sm">Description</p>
                <p className="text-foreground mt-1">{complaint.description}</p>
              </div>
            </div>

            {/* Images */}
            {(complaint.before_image_url || complaint.after_image_url) && (
              <div className="card-elevated p-6">
                <h3 className="font-display font-semibold text-foreground mb-4">Images</h3>
                <div className="grid grid-cols-2 gap-4">
                  {complaint.before_image_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Before</p>
                      <img src={complaint.before_image_url} alt="Before" className="rounded-lg w-full object-cover h-48" />
                    </div>
                  )}
                  {complaint.after_image_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">After</p>
                      <img src={complaint.after_image_url} alt="After" className="rounded-lg w-full object-cover h-48" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackComplaint;
