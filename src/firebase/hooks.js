import { useEffect, useState } from "react";
import { ref, onValue, push, update, set } from "firebase/database";
import { db, isFirebaseConfigured } from "./firebaseConfig";

// status: 'disabled' (no Firebase config) | 'loading' | 'live' | 'error'
function useRealtimeValue(path) {
  const [state, setState] = useState({ status: isFirebaseConfigured ? "loading" : "disabled", data: null });

  useEffect(() => {
    if (!isFirebaseConfigured || !path) return;
    const dbRef = ref(db, path);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => setState({ status: "live", data: snapshot.val() }),
      (error) => {
        console.error(`[firebase] read failed for ${path}:`, error);
        setState({ status: "error", data: null });
      }
    );
    return () => unsubscribe();
  }, [path]);

  return state;
}

// sensorData/{equipmentId}/latest — written by the ESP32 (RC522 RFID + HC-SR04 ultrasonic).
// Shape: { fuelLevel, fuelDataSource, rfidOperator, rfidStatus, rfidDataSource, timestamp }
export function useSensorData(equipmentId) {
  return useRealtimeValue(equipmentId ? `sensorData/${equipmentId}/latest` : null);
}

// mlPredictions/{equipmentId} — written by FastAPI every 30s from the RF Classifier + Regressor.
// Shape: { healthClass, hoursToMaintenance, failureProbability, recommendedAction, lastUpdated }
export function useMlPrediction(equipmentId) {
  return useRealtimeValue(equipmentId ? `mlPredictions/${equipmentId}` : null);
}

// Root listeners for table/list views that need every machine's sensor or
// prediction data at once — one subscription instead of one per row.
export function useAllSensorData() {
  return useRealtimeValue("sensorData");
}

export function useAllMlPredictions() {
  return useRealtimeValue("mlPredictions");
}

export function useFirebasePath(path) {
  return useRealtimeValue(path);
}

// equipment/{id} — type, site, location, lat, lng, checkIn, checkOut,
// rentalDays, renter, customer, status
export function useEquipmentList() {
  return useRealtimeValue("equipment");
}

// mainStorage/{id} — type, location, lat, lng, fuelLevel, status, healthClass
export function useMainStorage() {
  return useRealtimeValue("mainStorage");
}

// users/{id} — name, role, email, assignedEquipment
export function useUsers() {
  return useRealtimeValue("users");
}

// alerts/{id} — equipmentId, type, severity, message, resolved, timestamp
export function useAlerts() {
  return useRealtimeValue("alerts");
}

export async function createRedeploymentRequest(request) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
  const listRef = ref(db, "redeploymentRequests");
  const newRef = push(listRef);
  await set(newRef, { ...request, status: "pending", assignedEquipment: null, timestamp: Date.now() });
  return newRef.key;
}

export async function assignRedeploymentRequest(requestId, equipmentId) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
  await update(ref(db, `redeploymentRequests/${requestId}`), {
    status: "assigned",
    assignedEquipment: equipmentId,
  });
}
