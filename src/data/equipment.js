// Raw fleet dataset — exactly as provided by the problem statement.
export const equipmentData = [
  {
    id: "EQX1001", type: "Excavator", site: "S003",
    checkIn: "2025-04-01", checkOut: "2025-04-16",
    engineHours: 1.5, idleHours: 10, rentalDays: 15,
    operator: "OP101", fuelLevel: 65, temperature: 72,
    vibration: "normal", batteryVoltage: 12.6,
    location: "Coimbatore North Site",
    renter: "ABC Construction",
  },
  {
    id: "EQX1002", type: "Crane", site: null,
    checkIn: "2025-03-10", checkOut: "2025-03-30",
    engineHours: 0, idleHours: 11, rentalDays: 20,
    operator: null, fuelLevel: 90, temperature: 68,
    vibration: "none", batteryVoltage: 11.8,
    location: "Unknown",
    renter: "XYZ Mining",
  },
  {
    id: "EQX1003", type: "Bulldozer", site: "S002",
    checkIn: "2025-02-15", checkOut: "2025-03-11",
    engineHours: 7.5, idleHours: 0.5, rentalDays: 25,
    operator: "OP203", fuelLevel: 30, temperature: 85,
    vibration: "high", batteryVoltage: 12.1,
    location: "Coimbatore South Site",
    renter: "ABC Construction",
  },
  {
    id: "EQX1004", type: "Excavator", site: "S004",
    checkIn: "2025-05-05", checkOut: "2025-05-15",
    engineHours: 2, idleHours: 9, rentalDays: 10,
    operator: "OP106", fuelLevel: 45, temperature: 78,
    vibration: "normal", batteryVoltage: 12.4,
    location: "Trichy Highway Site",
    renter: "PQR Infrastructure",
  },
  {
    id: "EQX1005", type: "Bulldozer", site: "S006",
    checkIn: "2025-01-01", checkOut: "2025-01-31",
    engineHours: 8, idleHours: 0, rentalDays: 30,
    operator: "OP301", fuelLevel: 20, temperature: 90,
    vibration: "high", batteryVoltage: 11.5,
    location: "Salem Mining Site",
    renter: "XYZ Mining",
  },
  {
    id: "EQX1006", type: "Grader", site: "S001",
    checkIn: "2025-04-05", checkOut: "2025-04-23",
    engineHours: 3, idleHours: 6, rentalDays: 18,
    operator: "OP114", fuelLevel: 55, temperature: 75,
    vibration: "normal", batteryVoltage: 12.3,
    location: "Erode Road Site",
    renter: "PQR Infrastructure",
  },
  {
    id: "EQX1007", type: "Excavator", site: null,
    checkIn: "2025-03-20", checkOut: "2025-04-01",
    engineHours: 0, idleHours: 12, rentalDays: 12,
    operator: null, fuelLevel: 80, temperature: 70,
    vibration: "none", batteryVoltage: 12.0,
    location: "Unknown",
    renter: "ABC Construction",
  },
];

// Canonical dealer site roster — some sites may currently hold zero equipment.
export const SITES = [
  { id: "S001", name: "Erode Road Site" },
  { id: "S002", name: "Coimbatore South Site" },
  { id: "S003", name: "Coimbatore North Site" },
  { id: "S004", name: "Trichy Highway Site" },
  { id: "S005", name: "Namakkal Bypass Site" },
  { id: "S006", name: "Salem Mining Site" },
];

export const DEMAND_FORECAST = [5, 7, 4, 6, 8, 3, 5];

export function parseDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

export function daysBetween(a, b) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function isOverdue(eq, now = new Date()) {
  return parseDate(eq.checkOut).getTime() < now.getTime();
}

export function overdueDays(eq, now = new Date()) {
  return Math.max(0, daysBetween(parseDate(eq.checkOut), now));
}

export function remainingDays(eq, now = new Date()) {
  return daysBetween(now, parseDate(eq.checkOut));
}

export function equipmentBySite(siteId) {
  return equipmentData.filter((eq) => eq.site === siteId);
}

export function equipmentByRenter(renterName) {
  return equipmentData.filter((eq) => eq.renter === renterName);
}
