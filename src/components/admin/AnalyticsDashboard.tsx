import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Complaint {
  id: string;
  category: string;
  status: string;
  ward_name: string | null;
  ward_id: string | null;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
}

const COLORS = ["#1e5a8a", "#2aA89a", "#f59e0b", "#ef4444", "#8b5cf6", "#6b7280"];
const STATUS_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

const AnalyticsDashboard = ({ complaints }: { complaints: Complaint[] }) => {
  const [dbWards, setDbWards] = useState<any[]>([]);
  const choroplethRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<HTMLDivElement>(null);
  const choroplethMap = useRef<L.Map | null>(null);
  const heatmapMap = useRef<L.Map | null>(null);

  useEffect(() => {
    supabase.from("wards").select("*").then(({ data }) => {
      if (data) setDbWards(data);
    });
  }, []);

  // Category distribution
  const categoryData = Object.entries(
    complaints.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Daily trends (last 14 days)
  const dailyData: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = complaints.filter((c) => c.created_at.startsWith(dateStr)).length;
    dailyData.push({ date: d.toLocaleDateString("en", { month: "short", day: "numeric" }), count });
  }

  // Ward-wise with per-1000 rate
  const wardComplaintCounts: Record<string, number> = {};
  complaints.forEach((c) => {
    if (c.ward_id) wardComplaintCounts[c.ward_id] = (wardComplaintCounts[c.ward_id] || 0) + 1;
  });

  const wardData = dbWards.map((f: any) => {
    const count = wardComplaintCounts[f.ward_id] || 0;
    const rate = f.population > 0 ? ((count / f.population) * 1000).toFixed(2) : "0.00";
    return { name: f.ward_name, ward_id: f.ward_id, complaints: count, rate: parseFloat(rate), population: f.population || 0 };
  });

  // Status distribution
  const statusData = ["Pending", "Assigned", "In Progress", "Completed"].map((s) => ({
    name: s,
    value: complaints.filter((c) => c.status === s).length,
  }));

  // Choropleth map
  useEffect(() => {
    if (!choroplethRef.current || dbWards.length === 0) return;
    if (choroplethMap.current) choroplethMap.current.remove();

    const map = L.map(choroplethRef.current).setView([12.97, 77.59], 12);
    choroplethMap.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
    }).addTo(map);

    const maxCount = Math.max(...Object.values(wardComplaintCounts), 1);

    const getColor = (count: number) => {
      const ratio = count / maxCount;
      if (ratio > 0.75) return "#991b1b";
      if (ratio > 0.5) return "#dc2626";
      if (ratio > 0.25) return "#f97316";
      if (ratio > 0) return "#fbbf24";
      return "#d1fae5";
    };

    const geoJSON = {
      type: "FeatureCollection" as const,
      features: dbWards.map((w) => ({
        type: "Feature" as const,
        properties: { ward_id: w.ward_id, ward_name: w.ward_name, count: wardComplaintCounts[w.ward_id] || 0 },
        geometry: w.geometry,
      })),
    };

    const layer = L.geoJSON(geoJSON as any, {
      style: (feature) => ({
        fillColor: getColor(feature?.properties.count || 0),
        weight: 2,
        color: "#374151",
        fillOpacity: 0.7,
      }),
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(`${feature.properties.ward_name}: ${feature.properties.count} complaints`, { direction: "center" });
      },
    }).addTo(map);

    map.fitBounds(layer.getBounds(), { padding: [20, 20] });

    // Legend
    const legend = new L.Control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "bg-white p-2 rounded shadow text-xs");
      div.innerHTML = `
        <strong class="block mb-1">Density</strong>
        <span style="background:#d1fae5;width:14px;height:14px;display:inline-block;margin-right:4px;border-radius:2px;"></span>0<br/>
        <span style="background:#fbbf24;width:14px;height:14px;display:inline-block;margin-right:4px;border-radius:2px;"></span>Low<br/>
        <span style="background:#f97316;width:14px;height:14px;display:inline-block;margin-right:4px;border-radius:2px;"></span>Med<br/>
        <span style="background:#dc2626;width:14px;height:14px;display:inline-block;margin-right:4px;border-radius:2px;"></span>High<br/>
        <span style="background:#991b1b;width:14px;height:14px;display:inline-block;margin-right:4px;border-radius:2px;"></span>Critical
      `;
      return div;
    };
    legend.addTo(map);

    return () => { map.remove(); };
  }, [dbWards, complaints]);

  // Heatmap using circle markers with varying radius/opacity
  useEffect(() => {
    if (!heatmapRef.current) return;
    if (heatmapMap.current) heatmapMap.current.remove();

    const geoComplaints = complaints.filter((c) => c.latitude && c.longitude);
    if (geoComplaints.length === 0) return;

    const map = L.map(heatmapRef.current).setView([12.97, 77.59], 12);
    heatmapMap.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OSM",
    }).addTo(map);

    geoComplaints.forEach((c) => {
      L.circleMarker([c.latitude!, c.longitude!], {
        radius: 12,
        color: "transparent",
        fillColor: "#ef4444",
        fillOpacity: 0.35,
        weight: 0,
      }).addTo(map);
    });

    const bounds = L.latLngBounds(geoComplaints.map((c) => [c.latitude!, c.longitude!]));
    map.fitBounds(bounds, { padding: [30, 30] });

    return () => { map.remove(); };
  }, [complaints]);

  return (
    <div className="space-y-6">
      {/* Top cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusData.map((s, i) => (
          <div key={s.name} className="card-elevated p-4">
            <p className="text-sm text-muted-foreground">{s.name}</p>
            <p className="text-3xl font-display font-bold" style={{ color: STATUS_COLORS[i] }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Pie */}
        <div className="card-elevated p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Category Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => e.name}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Bar */}
        <div className="card-elevated p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Daily Complaint Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 88%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(210 70% 35%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Choropleth Map */}
      {dbWards.length > 0 && (
        <div className="card-elevated p-6">
          <h3 className="font-display font-semibold text-foreground mb-4">Ward Complaint Density (Choropleth)</h3>
          <div ref={choroplethRef} className="w-full rounded-lg" style={{ height: "400px" }} />
        </div>
      )}

      {/* Heatmap */}
      <div className="card-elevated p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Complaint Heatmap</h3>
        <div ref={heatmapRef} className="w-full rounded-lg" style={{ height: "400px" }} />
      </div>

      {/* Ward-wise table */}
      <div className="card-elevated p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Ward-wise Complaints</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground font-medium">Ward</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Population</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Complaints</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Per 1K Pop.</th>
              </tr>
            </thead>
            <tbody>
              {wardData.map((w) => (
                <tr key={w.name} className="border-b border-border/50">
                  <td className="py-2 font-medium text-foreground">{w.name}</td>
                  <td className="py-2 text-right text-muted-foreground">{w.population.toLocaleString()}</td>
                  <td className="py-2 text-right font-semibold">{w.complaints}</td>
                  <td className="py-2 text-right">
                    <span className={`font-semibold ${w.rate > 0.5 ? "text-destructive" : "text-status-completed"}`}>
                      {w.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
