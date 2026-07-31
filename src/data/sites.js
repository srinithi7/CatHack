// Static site directory — Firebase has no dedicated "sites" path, so this is
// the reference table used to resolve a chosen destination site to lat/lng
// when a customer submits a redeployment request. Coordinates are the real
// approximate centers of each Tamil Nadu city the site names refer to.
export const SITES = [
  { id: "S001", name: "Erode Road Site", lat: 11.3410, lng: 77.7172 },
  { id: "S002", name: "Coimbatore South Site", lat: 10.9601, lng: 76.9558 },
  { id: "S003", name: "Coimbatore North Site", lat: 11.0730, lng: 76.9558 },
  { id: "S004", name: "Trichy Highway Site", lat: 10.7905, lng: 78.7047 },
  { id: "S005", name: "Namakkal Bypass Site", lat: 11.2189, lng: 78.1677 },
  { id: "S006", name: "Salem Mining Site", lat: 11.6643, lng: 78.1460 },
];

export const MAIN_YARD = { id: "MAIN_YARD", name: "Main Storage Yard", lat: 11.0168, lng: 76.9558 };

export function siteById(id) {
  return SITES.find((s) => s.id === id) ?? null;
}

// Haversine great-circle distance in km.
export function distanceKm(a, b) {
  if (a == null || b == null || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Heavy-equipment transport assumed at ~40 km/h average, plus a fixed
// 15-minute mobilization overhead.
export function estimateEtaMinutes(km) {
  if (km == null) return null;
  return Math.round((km / 40) * 60 + 15);
}

export function formatEta(minutes) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}
