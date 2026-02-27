import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Upload, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import ComplaintLocationMap from "@/components/public/ComplaintLocationMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES } from "@/lib/wardData";

// Point-in-polygon check
function pointInPolygon(point: number[], polygon: number[][]): boolean {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function detectWardFromDB(lat: number, lng: number, wards: any[]): { ward_id: string | null; ward_name: string | null } {
  for (const w of wards) {
    const geom = w.geometry;
    if (geom?.type === "Polygon") {
      if (pointInPolygon([lng, lat], geom.coordinates[0])) {
        return { ward_id: w.ward_id, ward_name: w.ward_name };
      }
    } else if (geom?.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInPolygon([lng, lat], poly[0])) {
          return { ward_id: w.ward_id, ward_name: w.ward_name };
        }
      }
    }
  }
  return { ward_id: null, ward_name: null };
}

const SubmitComplaint = () => {
  const [name, setName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [dbWards, setDbWards] = useState<any[]>([]);

  const { toast } = useToast();
  const navigate = useNavigate();

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsLoading(false);
        toast({ title: "Location detected" });
      },
      () => {
        setGpsLoading(false);
        toast({ title: "Could not detect location", variant: "destructive" });
      }
    );
  };

  useEffect(() => {
    detectLocation();
    // Fetch wards from DB for spatial detection
    supabase.from("wards").select("ward_id,ward_name,geometry").then(({ data }) => {
      if (data) setDbWards(data);
    });
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !description) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      let before_image_url = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `before/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("complaint-images")
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("complaint-images")
          .getPublicUrl(filePath);
        before_image_url = urlData.publicUrl;
      }

      const ward = latitude && longitude ? detectWardFromDB(latitude, longitude, dbWards) : { ward_id: null, ward_name: null };

      const { data, error } = await supabase
        .from("complaints")
        .insert({
          complaint_id: "TEMP",
          name: isAnonymous ? "Anonymous" : name,
          is_anonymous: isAnonymous,
          mobile: isAnonymous ? null : mobile,
          email: isAnonymous ? null : email,
          category,
          description,
          latitude,
          longitude,
          ward_id: ward.ward_id,
          ward_name: ward.ward_name,
          before_image_url,
        })
        .select("complaint_id")
        .single();

      if (error) throw error;
      setSuccess(data.complaint_id);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-elevated p-8 max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-status-completed/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-status-completed" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Complaint Submitted!</h2>
          <p className="text-muted-foreground mb-4">Your tracking ID is:</p>
          <div className="bg-muted rounded-lg p-4 mb-6">
            <p className="font-display text-2xl font-bold text-primary">{success}</p>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Save this ID to track your complaint status
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate(`/track?id=${success}`)}>Track Complaint</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Submit Complaint</h1>
            <p className="text-xs text-muted-foreground">Report a civic issue</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
          {/* Anonymous toggle */}
          <div className="card-elevated p-4 flex items-center justify-between">
            <div>
              <Label className="font-medium">Anonymous Submission</Label>
              <p className="text-xs text-muted-foreground">Your identity won't be recorded</p>
            </div>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          {/* Personal Info */}
          {!isAnonymous && (
            <div className="card-elevated p-6 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Personal Information</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input id="mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 XXXXXXXXXX" />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
              </div>
            </div>
          )}

          {/* Complaint Details */}
          <div className="card-elevated p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Complaint Details</h3>
            <div>
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue in detail..." rows={4} />
            </div>
          </div>

          {/* Interactive Map */}
          <div className="card-elevated p-6">
            <ComplaintLocationMap
              latitude={latitude}
              longitude={longitude}
              onLocationChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
              }}
              wards={dbWards}
              gpsLoading={gpsLoading}
              onDetectGPS={detectLocation}
            />
          </div>

          {/* Image Upload */}
          <div className="card-elevated p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Photo Evidence</h3>
            <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click or tap to upload a photo</p>
                </div>
              )}
            </label>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Submit Complaint
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SubmitComplaint;
