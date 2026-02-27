import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Edit, Download, Loader2, CalendarIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/wardData";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Complaint {
  id: string;
  complaint_id: string;
  name: string | null;
  category: string;
  description: string;
  status: string;
  priority: string;
  ward_name: string | null;
  assigned_staff: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Pending: "status-badge-pending",
    Assigned: "status-badge-assigned",
    "In Progress": "status-badge-in-progress",
    Completed: "status-badge-completed",
  };
  return map[status] || "";
};

const ComplaintTable = ({ complaints, onRefresh }: { complaints: Complaint[]; onRefresh: () => void }) => {
  const [searchId, setSearchId] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWard, setFilterWard] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [editComplaint, setEditComplaint] = useState<Complaint | null>(null);
  const [editStaff, setEditStaff] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [dbWards, setDbWards] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("wards").select("ward_name").order("ward_name").then(({ data }) => {
      if (data) setDbWards(data);
    });
  }, []);

  const filtered = complaints.filter((c) => {
    if (searchId && !c.complaint_id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (filterCategory !== "all" && c.category !== filterCategory) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterWard !== "all" && c.ward_name !== filterWard) return false;
    if (dateFrom) {
      const cDate = new Date(c.created_at);
      if (cDate < dateFrom) return false;
    }
    if (dateTo) {
      const cDate = new Date(c.created_at);
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (cDate > endOfDay) return false;
    }
    return true;
  });

  const openEdit = (c: Complaint) => {
    setEditComplaint(c);
    setEditStaff(c.assigned_staff || "");
    setEditStatus(c.status);
    setEditPriority(c.priority);
    setAfterFile(null);
  };

  const handleSave = async () => {
    if (!editComplaint) return;
    setSaving(true);
    try {
      let after_image_url = editComplaint.after_image_url;

      if (afterFile) {
        const fileExt = afterFile.name.split(".").pop();
        const filePath = `after/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("complaint-images").upload(filePath, afterFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("complaint-images").getPublicUrl(filePath);
        after_image_url = urlData.publicUrl;
      }

      const { error } = await supabase
        .from("complaints")
        .update({
          assigned_staff: editStaff || null,
          status: editStatus,
          priority: editPriority,
          after_image_url,
        })
        .eq("id", editComplaint.id);

      if (error) throw error;
      toast({ title: "Complaint updated" });
      setEditComplaint(null);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this complaint?")) return;
    const { error } = await supabase.from("complaints").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Deleted" });
      onRefresh();
    }
  };

  const exportCSV = () => {
    const headers = ["Complaint ID", "Name", "Category", "Status", "Priority", "Ward", "Staff", "Date"];
    const rows = filtered.map((c) => [
      c.complaint_id, c.name, c.category, c.status, c.priority, c.ward_name, c.assigned_staff, new Date(c.created_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "complaints.csv";
    a.click();
  };

  const clearDates = () => { setDateFrom(undefined); setDateTo(undefined); };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input placeholder="Search by Complaint ID..." value={searchId} onChange={(e) => setSearchId(e.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Assigned">Assigned</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterWard} onValueChange={setFilterWard}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {dbWards.map((w) => <SelectItem key={w.ward_name} value={w.ward_name}>{w.ward_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Date range row */}
      <div className="flex flex-wrap gap-3 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "PP") : "From date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "PP") : "To date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={clearDates}>
            <X className="h-4 w-4 mr-1" /> Clear dates
          </Button>
        )}
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Ward</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.complaint_id}</TableCell>
                <TableCell>{c.category}</TableCell>
                <TableCell>{c.ward_name || "—"}</TableCell>
                <TableCell><Badge className={statusBadge(c.status)}>{c.status}</Badge></TableCell>
                <TableCell>
                  <Badge variant={c.priority === "High" ? "destructive" : "secondary"}>{c.priority}</Badge>
                </TableCell>
                <TableCell>{c.assigned_staff || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      {editComplaint?.id === c.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="font-display">Edit {c.complaint_id}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            <div>
                              <label className="text-sm font-medium">Assign Staff</label>
                              <Input value={editStaff} onChange={(e) => setEditStaff(e.target.value)} placeholder="Staff name" />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <Select value={editStatus} onValueChange={setEditStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pending">Pending</SelectItem>
                                  <SelectItem value="Assigned">Assigned</SelectItem>
                                  <SelectItem value="In Progress">In Progress</SelectItem>
                                  <SelectItem value="Completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Priority</label>
                              <Select value={editPriority} onValueChange={setEditPriority}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Upload After Image</label>
                              <Input type="file" accept="image/*" onChange={(e) => setAfterFile(e.target.files?.[0] || null)} />
                            </div>
                            <Button onClick={handleSave} disabled={saving} className="w-full">
                              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      )}
                    </Dialog>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No complaints found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ComplaintTable;
