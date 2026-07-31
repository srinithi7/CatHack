import { useState } from "react";
import Login from "./components/Login";
import CaterpillarDashboard from "./components/caterpillar/CaterpillarDashboard";
import DealerDashboard from "./components/dealer/DealerDashboard";
import CompanyPortal from "./components/company/CompanyPortal";
import OperatorView from "./components/operator/OperatorView";

export default function App() {
  const [screen, setScreen] = useState("login");

  if (screen === "caterpillar") return <CaterpillarDashboard onLogout={() => setScreen("login")} />;
  if (screen === "dealer") return <DealerDashboard onLogout={() => setScreen("login")} />;
  if (screen === "customer") return <CompanyPortal onLogout={() => setScreen("login")} />;
  if (screen === "operator") return <OperatorView onLogout={() => setScreen("login")} />;

  return <Login onLogin={setScreen} />;
}
