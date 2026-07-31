import { useState } from "react";
import Login from "./components/Login";
import DealerDashboard from "./components/dealer/DealerDashboard";
import RenterPortal from "./components/renter/RenterPortal";
import OperatorView from "./components/operator/OperatorView";
import CustomerPortal from "./components/customer/CustomerPortal";

export default function App() {
  const [screen, setScreen] = useState("login");

  if (screen === "dealer") return <DealerDashboard onLogout={() => setScreen("login")} />;
  if (screen === "renter") return <RenterPortal onLogout={() => setScreen("login")} />;
  if (screen === "operator") return <OperatorView onLogout={() => setScreen("login")} />;
  if (screen === "customer") return <CustomerPortal onLogout={() => setScreen("login")} />;

  return <Login onLogin={setScreen} />;
}
