// Sample ward GeoJSON data for demonstration
export const wardGeoJSON = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { ward_id: "W001", ward_name: "Central Ward", population: 45000, officer_name: "Rajesh Kumar" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[77.58, 12.96], [77.60, 12.96], [77.60, 12.98], [77.58, 12.98], [77.58, 12.96]]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ward_id: "W002", ward_name: "North Ward", population: 38000, officer_name: "Priya Sharma" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[77.58, 12.98], [77.60, 12.98], [77.60, 13.00], [77.58, 13.00], [77.58, 12.98]]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ward_id: "W003", ward_name: "South Ward", population: 52000, officer_name: "Amit Patel" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[77.58, 12.94], [77.60, 12.94], [77.60, 12.96], [77.58, 12.96], [77.58, 12.94]]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ward_id: "W004", ward_name: "East Ward", population: 41000, officer_name: "Sunita Devi" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[77.60, 12.96], [77.62, 12.96], [77.62, 12.98], [77.60, 12.98], [77.60, 12.96]]]
      }
    },
    {
      type: "Feature" as const,
      properties: { ward_id: "W005", ward_name: "West Ward", population: 35000, officer_name: "Vikram Singh" },
      geometry: {
        type: "Polygon" as const,
        coordinates: [[[77.56, 12.96], [77.58, 12.96], [77.58, 12.98], [77.56, 12.98], [77.56, 12.96]]]
      }
    },
  ]
};

export const CATEGORIES = [
  "Road Damage",
  "Garbage",
  "Water Leakage",
  "Street Light",
  "Drainage",
  "Other",
] as const;

export type Category = typeof CATEGORIES[number];

export type ComplaintStatus = "Pending" | "Assigned" | "In Progress" | "Completed";
export type Priority = "Low" | "Medium" | "High";

// Point-in-polygon detection
export function detectWard(lat: number, lng: number) {
  for (const feature of wardGeoJSON.features) {
    if (pointInPolygon([lng, lat], feature.geometry.coordinates[0])) {
      return {
        ward_id: feature.properties.ward_id,
        ward_name: feature.properties.ward_name,
      };
    }
  }
  return { ward_id: null, ward_name: null };
}

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

export const statusColors: Record<string, string> = {
  Pending: "#ef4444",
  Assigned: "#f59e0b",
  "In Progress": "#3b82f6",
  Completed: "#22c55e",
};
