import { useEffect, useRef, useState } from "react";
import { Bot, Send, User, MessageSquare, X } from "lucide-react";
import { getBotResponse, BOT_WELCOME } from "../../data/chatbot";

const SUGGESTIONS = ["Anomalies", "Critical", "Overdue", "Maintenance", "Revenue loss"];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ from: "bot", text: BOT_WELCOME }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, thinking]);

  const send = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInput("");
    setThinking(true);
    try {
      const reply = await getBotResponse(trimmed);
      setMessages((prev) => [...prev, { from: "bot", text: reply }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[min(92vw,360px)] rounded-2xl border flex flex-col overflow-hidden animate-pop-in"
          style={{ background: "#FFFFFF", borderColor: "#E4E1D8", boxShadow: "0 16px 40px rgba(26,26,26,0.18)", maxHeight: "min(72vh, 600px)" }}
        >
          <div className="flex items-center gap-2.5 px-4 py-3.5 shrink-0" style={{ background: "#FFCD11" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1A1A1A", color: "#FFCD11" }}>
              <Bot size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A1A1A] leading-tight truncate">🤖 CAT Bot</p>
              <p className="text-[11px] text-[#5C4B00] leading-tight">Fleet Intelligence Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Hide chat"
              className="ml-auto p-1.5 rounded-full hover:bg-black/10 text-[#1A1A1A] transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 min-h-[260px] overflow-y-auto p-4 flex flex-col gap-3" style={{ background: "#FCFBF9" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 max-w-[88%] animate-fade-in-up ${m.from === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: m.from === "bot" ? "#1A1A1A" : "#FFCD11",
                    color: m.from === "bot" ? "#FFCD11" : "#1A1A1A",
                  }}
                >
                  {m.from === "bot" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className="rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-relaxed"
                  style={
                    m.from === "bot"
                      ? { background: "#F0EEE7", color: "#1A1A1A" }
                      : { background: "#FFCD11", color: "#1A1A1A" }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex gap-2 max-w-[88%] self-start animate-fade-in-up">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1A1A1A", color: "#FFCD11" }}>
                  <Bot size={14} />
                </div>
                <div className="rounded-xl px-3.5 py-2.5 text-sm flex items-center gap-1" style={{ background: "#F0EEE7", color: "#8A867A" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A867A] animate-pulse-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A867A] animate-pulse-dot" style={{ animationDelay: "0.15s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8A867A] animate-pulse-dot" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 px-4 pt-3 shrink-0" style={{ background: "#FFFFFF" }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={thinking}
                className="text-xs rounded-full px-3 py-1.5 border transition-colors hover:border-[#FFCD11] hover:text-[#8A6A00] disabled:opacity-50"
                style={{ borderColor: "#E4E1D8", color: "#6E6B62" }}
              >
                {s}
              </button>
            ))}
          </div>

          <form
            className="flex items-center gap-2 p-4 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={thinking}
              placeholder="Ask about anomalies, health, revenue..."
              className="flex-1 min-w-0 rounded-xl border px-4 py-2.5 text-sm outline-none text-[#1A1A1A] placeholder:text-[#9A968D] focus:border-[#FFCD11] transition-colors disabled:opacity-60"
              style={{ background: "#FAFAF8", borderColor: "#E4E1D8" }}
            />
            <button
              type="submit"
              disabled={thinking}
              className="flex items-center justify-center rounded-xl px-4 py-2.5 font-semibold text-sm bg-[#FFCD11] text-[#1A1A1A] hover:brightness-95 transition shrink-0 disabled:opacity-60"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide CAT Bot" : "Ask CAT Bot"}
        title="Ask CAT Bot"
        className="w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:-translate-y-0.5 hover:scale-105"
        style={{ background: "#1A1A1A", color: "#FFCD11", boxShadow: "0 10px 28px rgba(26,26,26,0.35)" }}
      >
        {open ? <X size={22} strokeWidth={2.5} /> : <MessageSquare size={22} strokeWidth={2.5} />}
      </button>
    </div>
  );
}
