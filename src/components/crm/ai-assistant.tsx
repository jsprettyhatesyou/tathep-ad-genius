import { useState, useRef, useEffect } from "react";
import { assistantChat } from "@/lib/api/ai.functions";
import { Sparkles, Send, ChevronRight, Mail, CheckSquare, Layers, Building2, Monitor, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  { label: "Draft email", icon: Mail, prompt: "ร่างอีเมล outreach หาลูกค้าใหม่ในสาย F&B ที่อยู่ใกล้ป้ายของเรา" },
  { label: "Create task", icon: CheckSquare, prompt: "สรุปงานที่ทีมขายควรทำวันนี้จาก pipeline ปัจจุบัน เรียงตามความสำคัญ" },
  { label: "Add to deck", icon: Layers, prompt: "สรุป pipeline เป็น 3 bullet สั้นๆ สำหรับใส่สไลด์นำเสนอผู้บริหาร" },
];

const SUGGESTIONS = [
  { label: "Research a company", icon: Building2, prompt: "ช่วยแนะนำบริษัทที่ควรโฟกัสใน pipeline ตอนนี้ พร้อมเหตุผล" },
  { label: "Recommend best screens", icon: Monitor, prompt: "แนะนำจอ DOOH ที่เหมาะกับดีลที่กำลังจะปิดมากที่สุด" },
  { label: "Generate a proposal", icon: FileText, prompt: "ช่วยร่างโครงสร้าง proposal สำหรับดีลที่มีโอกาสปิดสูงสุดในตอนนี้" },
  { label: "Forecast Q3 revenue", icon: TrendingUp, prompt: "พยากรณ์รายได้ไตรมาสหน้าจาก pipeline ปัจจุบัน พร้อมสมมติฐาน" },
];

export function AIAssistant({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await assistantChat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: reply || "—" }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "ขออภัยค่ะ ระบบขัดข้องชั่วคราว ลองถามใหม่อีกครั้งนะคะ 🙏" }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-30 flex w-full max-w-[384px] flex-col border-l border-border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-white"><Sparkles className="h-4.5 w-4.5" /></div>
          <div>
            <p className="text-sm font-semibold leading-tight">Sales OS AI</p>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Media strategist · online
            </p>
          </div>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="ซ่อนผู้ช่วย">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {/* Welcome + suggestions (only before first message) */}
        {messages.length === 0 && (
          <>
            <div className="rounded-2xl rounded-tl-sm bg-gradient-ai p-3 text-sm leading-relaxed text-slate-700">
              สวัสดีค่ะหัวหน้า 👋 น้องตาเทพพร้อมช่วยแล้วค่ะ — หา lead, แนะนำจอ DOOH, ร่าง outreach, สรุป/พยากรณ์ pipeline ถามได้เลยค่ะ
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button key={q.label} onClick={() => send(q.prompt)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-fresco/40 hover:text-fresco">
                  <q.icon className="h-3.5 w-3.5" /> {q.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5 pt-1">
              {SUGGESTIONS.map((s) => (
                <button key={s.label} onClick={() => send(s.prompt)} className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-white px-3 py-2.5 text-left text-sm text-slate-700 transition hover:border-fresco/40 hover:bg-fresco/5">
                  <s.icon className="h-4 w-4 shrink-0 text-fresco" /> {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "rounded-br-sm bg-fresco text-white" : "rounded-tl-sm bg-slate-100 text-slate-700",
            )}>
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-xl border border-input bg-white p-1.5 focus-within:border-fresco focus-within:ring-2 focus-within:ring-lake/30">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything about your pipeline…"
            rows={1}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-fresco text-white transition hover:bg-fresco/90 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
