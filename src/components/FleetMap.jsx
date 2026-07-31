import { useEffect } from "react";
import { MapContainer, TileLayer, Popup, CircleMarker, useMap } from "react-leaflet";
import { STATUS_COLORS } from "../data/algorithms";

const DEFAULT_COLOR = "#8A867A"; // no mlPredictions yet for this machine

export function healthColor(healthClass) {
  return STATUS_COLORS[healthClass] ?? DEFAULT_COLOR;
}

// Leaflet measures its container on mount; inside a flex/grid parent that box
// can still be 0×0 on first paint, which leaves the map mis-sized until the
// window resizes. Forcing one invalidateSize() right after mount fixes it.
function SizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Shared India/regional fleet map. `equipment` entries need lat/lng; markers
// are CircleMarker (constant PIXEL radius, unlike Circle which is sized in
// meters and shrinks to sub-pixel at country-wide zoom — that's why nothing
// was visible before) colored by mlPredictions.healthClass. `renderPopup`
// lets each dashboard show its own fields inside the same map shell.
export default function FleetMap({ title, height = 420, center, zoom, equipment, renderPopup, emptyHint }) {
  const points = equipment.filter((eq) => eq.lat != null && eq.lng != null);

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 1px 2px rgba(26,26,26,0.04)" }}>
      <div className="px-5 pt-4 pb-3">
        <h2 className="text-lg font-bold text-[#1A1A1A]">{title}</h2>
        {points.length === 0 && (
          <p className="text-xs text-[#8A867A] mt-1">{emptyHint ?? "No equipment with GPS coordinates yet."}</p>
        )}
      </div>
      <div style={{ height }}>
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <SizeFix />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((eq) => (
            <CircleMarker
              key={eq.id}
              center={[eq.lat, eq.lng]}
              radius={9}
              pathOptions={{ color: "#FFFFFF", fillColor: healthColor(eq.healthClass), fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>{renderPopup(eq)}</Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <div className="flex items-center gap-4 px-5 py-3 border-t text-[11px] text-[#6E6B62]" style={{ borderColor: "#EFEDE5" }}>
        <Legend color={STATUS_COLORS.Healthy} label="Healthy" />
        <Legend color={STATUS_COLORS["At Risk"]} label="At Risk" />
        <Legend color={STATUS_COLORS.Critical} label="Critical" />
        <Legend color={DEFAULT_COLOR} label="No ML data yet" />
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
