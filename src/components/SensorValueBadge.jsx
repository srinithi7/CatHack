// Hybrid data-source indicator: dataSource "sensor" (ESP32 → Firebase) shows
// green + "Live Sensor"; anything else ("model", missing, offline) shows
// blue + "ML Dataset". Keeps the dashboard honest about what's a real RC522/
// HC-SR04 reading vs. a trained-model value, per record, in real time.
export default function SensorValueBadge({ dataSource, className = "" }) {
  const isLiveSensor = dataSource === "sensor";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-semibold whitespace-nowrap ${className}`}
      style={{ color: isLiveSensor ? "#00954A" : "#2196F3" }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isLiveSensor ? "#00C851" : "#2196F3" }}
      />
      {isLiveSensor ? "Live Sensor" : "ML Dataset"}
    </span>
  );
}
