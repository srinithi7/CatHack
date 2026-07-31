import { Building2, Truck, User, Gauge, Globe2 } from "lucide-react";

export default function Login({ onLogin }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F3F3EF] px-4 py-10">
      <div
        className="w-full max-w-md rounded-2xl border p-8 sm:p-10 animate-fade-in-up"
        style={{ background: "#1A1A1A", borderColor: "#1A1A1A", boxShadow: "0 20px 60px rgba(26,26,26,0.18)" }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#FFCD1122", color: "#FFCD11" }}
          >
            <Gauge size={34} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#FFCD11]">CatArenT</h1>
          <p className="mt-3 text-sm text-[#AAAAAA]">Smart Equipment Rental Tracking System</p>
          <p className="mt-1 text-xs font-semibold tracking-wide text-[#AAAAAA] uppercase">Powered by Caterpillar</p>
        </div>

        <div className="flex flex-col gap-3.5">
          <LoginButton
            icon={Globe2}
            label="Login as Caterpillar"
            sublabel="Global intelligence"
            variant="solid"
            onClick={() => onLogin("caterpillar")}
          />
          <LoginButton
            icon={Building2}
            label="Login as Dealer"
            sublabel="Fleet management"
            variant="outline"
            onClick={() => onLogin("dealer")}
          />
          <LoginButton
            icon={Truck}
            label="Login as Company"
            sublabel="Rental tracking"
            variant="outline"
            onClick={() => onLogin("customer")}
          />
          <LoginButton
            icon={User}
            label="Login as Operator"
            sublabel="Machine session"
            variant="outline"
            onClick={() => onLogin("operator")}
          />
        </div>
      </div>

      <p className="mt-8 text-xs text-[#6E6B62] text-center">
        © 2025 CatArenT | Powered by Caterpillar
      </p>
    </div>
  );
}

function LoginButton({ icon: Icon, label, sublabel, variant, onClick }) {
  const base =
    "group w-full flex items-center gap-2.5 rounded-xl px-5 py-3.5 font-semibold text-sm transition-all duration-200 cursor-pointer";
  const solid = "bg-[#FFCD11] text-[#1A1A1A] hover:shadow-[0_0_24px_rgba(255,205,17,0.55)] hover:-translate-y-0.5";
  const outline =
    "bg-transparent text-[#FFCD11] border-2 border-[#FFCD11] hover:shadow-[0_0_20px_rgba(255,205,17,0.35)] hover:-translate-y-0.5 hover:bg-[#FFCD110F]";
  return (
    <button onClick={onClick} className={`${base} ${variant === "solid" ? solid : outline}`}>
      <Icon size={18} strokeWidth={2.5} className="shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        {label}
        <span className={`text-[10px] font-normal normal-case ${variant === "solid" ? "text-[#1A1A1A]/70" : "opacity-60"}`}>
          {sublabel}
        </span>
      </span>
    </button>
  );
}
