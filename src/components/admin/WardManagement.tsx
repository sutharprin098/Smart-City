import { useState, useEffect, useRef } from "react";
import { Upload, Trash2, MapPin, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Ward {
  id: string;
  ward_id: string;
  ward_name: string;
  population: number;
  officer_name: string | null;
  geometry: any;
}

const WardManagement = () => {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const { toast } = useToast();

  const fetchWards = async () => {
    const { data, error } = await supabase.from("wards").select("*").order("ward_name");
    if (!error) setWards((data as Ward[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    const wrapper = mapRef.current;
    if (!wrapper) return;

    // Create a fresh div for each map instance to avoid reuse errors
    wrapper.innerHTML = "";
    const container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    wrapper.appendChild(container);

    const map = L.map(container).setView([12.97, 77.59], 12);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    if (wards.length > 0) {
      const geoJSON = {
        type: "FeatureCollection" as const,
        features: wards.map((w) => ({
          type: "Feature" as const,
          properties: { ward_id: w.ward_id, ward_name: w.ward_name, population: w.population, officer_name: w.officer_name },
          geometry: w.geometry,
        })),
      };

      const layer = L.geoJSON(geoJSON as any, {
        style: { color: "hsl(var(--primary))", weight: 2, fillOpacity: 0.12 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.ward_name, { permanent: false, direction: "center" });
          layer.bindPopup(`
            <strong>${feature.properties.ward_name}</strong><br/>
            ID: ${feature.properties.ward_id}<br/>
            Population: ${feature.properties.population?.toLocaleString()}<br/>
            Officer: ${feature.properties.officer_name || "N/A"}
          `);
        },
      }).addTo(map);

      map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }

    return () => {
      mapInstance.current = null;
      try { map.remove(); } catch (_) { /* already removed */ }
      wrapper.innerHTML = "";
    };
  }, [wards]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const geojson = JSON.parse(text);

      if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
        throw new Error("Invalid GeoJSON: must be a FeatureCollection");
      }

      const wardRows = geojson.features.map((f: any, index: number) => {
        const p = f.properties;
        if (!p.ward_name) {
          throw new Error(`Each feature must have a ward_name property`);
        }
        return {
          ward_id: p.ward_id || `W${String(index + 1).padStart(3, "0")}`,
          ward_name: p.ward_name,
          population: p.population || 0,
          officer_name: p.officer_name || null,
          geometry: f.geometry,
        };
      });

      // Delete existing wards and insert new ones
      await supabase.from("wards").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const { error } = await supabase.from("wards").insert(wardRows);
      if (error) throw error;

      toast({ title: "Ward boundaries uploaded", description: `${wardRows.length} wards loaded successfully.` });
      fetchWards();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Delete all ward boundaries? This cannot be undone.")) return;
    await supabase.from("wards").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "All ward boundaries deleted" });
    fetchWards();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-foreground">Ward Boundary Management</h2>
        <div className="flex gap-2">
          <label>
            <input type="file" accept=".json,.geojson" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <Button asChild variant="default" disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                Upload GeoJSON
              </span>
            </Button>
          </label>
          {wards.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
              <Trash2 className="h-4 w-4 mr-2" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="card-elevated p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-status-assigned mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">GeoJSON Format Requirements</p>
          <p>Upload a FeatureCollection where each feature has at minimum: <code className="text-xs bg-muted px-1 rounded">ward_name</code>, <code className="text-xs bg-muted px-1 rounded">population</code> and a Polygon geometry. Optional: <code className="text-xs bg-muted px-1 rounded">ward_id</code>, <code className="text-xs bg-muted px-1 rounded">officer_name</code>.</p>
        </div>
      </div>

      {/* Status */}
      <div className="card-elevated p-4 flex items-center gap-3">
        {wards.length > 0 ? (
          <>
            <CheckCircle className="h-5 w-5 text-status-completed" />
            <span className="text-sm font-medium">{wards.length} ward boundaries loaded</span>
          </>
        ) : (
          <>
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No ward boundaries uploaded yet. Upload a GeoJSON file to get started.</span>
          </>
        )}
      </div>

      {/* Map */}
      <div className="card-elevated overflow-hidden" style={{ height: "400px" }}>
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Ward Table */}
      {wards.length > 0 && (
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Ward ID</th>
                  <th className="text-left p-3 font-medium">Ward Name</th>
                  <th className="text-left p-3 font-medium">Population</th>
                  <th className="text-left p-3 font-medium">Officer</th>
                </tr>
              </thead>
              <tbody>
                {wards.map((w) => (
                  <tr key={w.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{w.ward_id}</td>
                    <td className="p-3">{w.ward_name}</td>
                    <td className="p-3">{w.population.toLocaleString()}</td>
                    <td className="p-3">{w.officer_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardManagement;
