import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { statusColors } from "@/lib/wardData";
import { supabase } from "@/integrations/supabase/client";

interface Complaint {
  id: string;
  complaint_id: string;
  category: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  ward_name: string | null;
  before_image_url: string | null;
  created_at: string;
}

const ComplaintMap = ({ complaints }: { complaints: Complaint[] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [dbWards, setDbWards] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("wards").select("*").then(({ data }) => {
      if (data) setDbWards(data);
    });
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

    const map = L.map(container).setView([12.97, 77.59], 13);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Ward boundaries from DB
    if (dbWards.length > 0) {
      const wardGeoJSON = {
        type: "FeatureCollection" as const,
        features: dbWards.map((w: any) => ({
          type: "Feature" as const,
          properties: { ward_name: w.ward_name, ward_id: w.ward_id },
          geometry: w.geometry,
        })),
      };
      L.geoJSON(wardGeoJSON as any, {
        style: { color: "#1e5a8a", weight: 2, fillColor: "#1e5a8a", fillOpacity: 0.08 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.ward_name, { permanent: false, direction: "center", className: "font-display text-xs" });
        },
      }).addTo(map);
    }

    // Complaint markers
    complaints.forEach((c) => {
      if (!c.latitude || !c.longitude) return;

      const color = statusColors[c.status] || "#6b7280";
      const marker = L.circleMarker([c.latitude, c.longitude], {
        radius: 8,
        color: color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }).addTo(map);

      const imgHtml = c.before_image_url
        ? `<img src="${c.before_image_url}" style="width:100%;max-height:100px;object-fit:cover;border-radius:6px;margin-top:6px;" />`
        : "";

      marker.bindPopup(`
        <div style="min-width:200px;font-family:Inter,sans-serif;">
          <strong style="font-size:13px;">${c.complaint_id}</strong><br/>
          <span style="font-size:12px;color:#666;">${c.category}</span><br/>
          <p style="font-size:11px;margin:4px 0;">${c.description?.slice(0, 80)}${(c.description?.length || 0) > 80 ? "..." : ""}</p>
          <span style="font-size:11px;">Ward: ${c.ward_name || "N/A"}</span><br/>
          <span style="font-size:11px;">Status: <b style="color:${color}">${c.status}</b></span><br/>
          <span style="font-size:10px;color:#999;">${new Date(c.created_at).toLocaleDateString()}</span>
          ${imgHtml}
        </div>
      `);
    });

    return () => {
      mapInstance.current = null;
      try { map.remove(); } catch (_) { /* already removed */ }
      wrapper.innerHTML = "";
    };
  }, [complaints, dbWards]);

  return <div ref={mapRef} className="w-full h-full min-h-[500px] rounded-lg" />;
};

export default ComplaintMap;
