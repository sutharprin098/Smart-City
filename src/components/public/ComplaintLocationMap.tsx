import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Locate, Loader2 } from "lucide-react";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Props {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  wards: any[];
  gpsLoading: boolean;
  onDetectGPS: () => void;
}

const ComplaintLocationMap = ({ latitude, longitude, onLocationChange, wards, gpsLoading, onDetectGPS }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const wardLayerRef = useRef<L.GeoJSON | null>(null);
  const highlightLayerRef = useRef<L.GeoJSON | null>(null);

  // Point-in-polygon for ward highlight
  const pointInPolygon = (point: number[], polygon: number[][]): boolean => {
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
  };

  const findWard = useCallback((lat: number, lng: number) => {
    for (const w of wards) {
      const geom = w.geometry;
      if (geom?.type === "Polygon") {
        if (pointInPolygon([lng, lat], geom.coordinates[0])) return w;
      } else if (geom?.type === "MultiPolygon") {
        for (const poly of geom.coordinates) {
          if (pointInPolygon([lng, lat], poly[0])) return w;
        }
      }
    }
    return null;
  }, [wards]);

  const highlightWard = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (highlightLayerRef.current) {
      mapRef.current.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }
    const ward = findWard(lat, lng);
    if (ward) {
      highlightLayerRef.current = L.geoJSON(
        { type: "Feature", properties: ward, geometry: ward.geometry } as any,
        {
          style: {
            color: "#f59e0b",
            weight: 3,
            fillColor: "#f59e0b",
            fillOpacity: 0.25,
          },
        }
      ).addTo(mapRef.current);
    }
  }, [findWard]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true })
        .addTo(mapRef.current)
        .bindPopup("Drag me or click the map to change location")
        .openPopup();

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current!.getLatLng();
        onLocationChange(pos.lat, pos.lng);
        highlightWard(pos.lat, pos.lng);
      });
    }
    highlightWard(lat, lng);
  }, [onLocationChange, highlightWard]);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const el = containerRef.current;
    // Clear any previous leaflet instance
    if ((el as any)._leaflet_id) {
      delete (el as any)._leaflet_id;
      el.innerHTML = "";
    }

    const map = L.map(el).setView([12.9716, 77.5946], 12);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Click to place marker
    map.on("click", (e: L.LeafletMouseEvent) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
      placeMarker(e.latlng.lat, e.latlng.lng);
    });

    return () => {
      try { map.remove(); } catch {}
      mapRef.current = null;
      markerRef.current = null;
      wardLayerRef.current = null;
      highlightLayerRef.current = null;
    };
  }, []);

  // Draw ward boundaries
  useEffect(() => {
    if (!mapRef.current || !wards.length) return;
    if (wardLayerRef.current) {
      mapRef.current.removeLayer(wardLayerRef.current);
    }
    const geojson: any = {
      type: "FeatureCollection",
      features: wards.map((w) => ({
        type: "Feature",
        properties: { ward_name: w.ward_name },
        geometry: w.geometry,
      })),
    };
    wardLayerRef.current = L.geoJSON(geojson, {
      style: {
        color: "hsl(var(--primary))",
        weight: 2,
        fillColor: "hsl(var(--primary))",
        fillOpacity: 0.08,
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.ward_name) {
          layer.bindTooltip(feature.properties.ward_name, { sticky: true });
        }
      },
    }).addTo(mapRef.current);
    mapRef.current.fitBounds(wardLayerRef.current.getBounds(), { padding: [20, 20] });
  }, [wards]);

  // Sync marker when lat/lng change externally (e.g. GPS detection)
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      placeMarker(latitude, longitude);
      mapRef.current.setView([latitude, longitude], 15);
    }
  }, [latitude, longitude, placeMarker]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground">Pick Location on Map</h3>
        <Button type="button" variant="outline" size="sm" onClick={onDetectGPS} disabled={gpsLoading}>
          {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Locate className="h-4 w-4 mr-1" />}
          My Location
        </Button>
      </div>
      <div
        ref={containerRef}
        className="w-full h-[350px] rounded-lg border border-border overflow-hidden z-0"
      />
      {latitude && longitude && (
        <div className="bg-muted rounded-lg p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-muted-foreground">Lat: <span className="text-foreground font-mono">{latitude.toFixed(6)}</span></span>
          <span className="text-muted-foreground">Lng: <span className="text-foreground font-mono">{longitude.toFixed(6)}</span></span>
          {(() => {
            const ward = findWard(latitude, longitude);
            return ward?.ward_name && (
              <span className="text-muted-foreground">Ward: <span className="text-foreground font-semibold">{ward.ward_name}</span></span>
            );
          })()}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Click on the map or drag the marker to set the complaint location.</p>
    </div>
  );
};

export default ComplaintLocationMap;
