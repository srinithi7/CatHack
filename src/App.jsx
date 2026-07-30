import { useState } from "react";
import Login from "./components/Login";
import DealerDashboard from "./components/dealer/DealerDashboard";
import RenterPortal from "./components/renter/RenterPortal";
import OperatorView from "./components/operator/OperatorView";

export default function App() {
  const [screen, setScreen] = useState("login");

  if (screen === "dealer") return <DealerDashboard onLogout={() => setScreen("login")} />;
  if (screen === "renter") return <RenterPortal onLogout={() => setScreen("login")} />;
  if (screen === "operator") return <OperatorView onLogout={() => setScreen("login")} />;

  return <Login onLogin={setScreen} />;
}
