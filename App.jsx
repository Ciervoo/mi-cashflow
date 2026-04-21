import { useState, useEffect, useRef } from "react";

const PIN = "2507";

const PROFILES = {
  personal: {
    label: "Personal",
    icon: "👤",
    categories: {
      income: ["Sprint", "La Toscana", "Ropa", "Apuestas", "Otros"],
      expense: ["Ropa", "Sprint", "La Toscana", "Tarjeta crédito", "Comida", "Jodas", "Alcohol", "Apuestas", "Otros"],
    },
  },
  toscana: {
    label: "La Toscana",
    icon: "🏢",
    categories: {
      income: ["Ventas"],
      expense: ["Costos", "Comisiones", "Bonificaciones", "Inversiones", "Otros"],
    },
  },
};

const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
const formatUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

function loadTransactions(profile) {
  try { const s = localStorage.getItem(`cf_${profile}`); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveTransactions(profile, txs) {
  try { localStorage.setItem(`cf_${profile}`, JSON.stringify(txs)); } catch {}
}
function loadGoal() {
  try { return Number(localStorage.getItem("cf_goal_personal")) || 0; } catch { return 0; }
}
function loadPayments() {
  try { const s = localStorage.getItem("cf_payments"); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function savePayments(payments) {
  try { localStorage.setItem("cf_payments", JSON.stringify(payments)); } catch {}
}

// ── CHART ────────────────────────────────────────────────────
function BalanceChart({ transactions }) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return (
    <div style={{ textAlign:"center", color:"#555", fontSize:12, padding:"20px 0" }}>Agregá movimientos para ver el gráfico</div>
  );
  const byDate = {};
  sorted.forEach(t => { byDate[t.date] = byDate[t.date] || []; byDate[t.date].push(t); });
  const points = []; let running = 0;
  Object.entries(byDate).sort().forEach(([date, txs]) => {
    txs.forEach(t => { running += t.type === "income" ? t.amount : -t.amount; });
    points.push({ date, balance: running });
  });
  const W = 340, H = 120, pad = { t:16, r:12, b:24, l:12 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const balances = points.map(p => p.balance);
  const minB = Math.min(...balances, 0), maxB = Math.max(...balances, 1);
  const range = maxB - minB || 1;
  const toX = (i) => pad.l + (i / Math.max(points.length - 1, 1)) * iW;
  const toY = (v) => pad.t + iH - ((v - minB) / range) * iH;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.balance)}`).join(" ");
  const areaD = `${pathD} L ${toX(points.length-1)} ${H-pad.b} L ${toX(0)} ${H-pad.b} Z`;
  const last = points[points.length-1]?.balance || 0;
  const lc = last >= 0 ? "#4ade80" : "#f87171";
  const ac = last >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", overflow:"visible" }}>
      {minB < 0 && maxB > 0 && <line x1={pad.l} y1={toY(0)} x2={W-pad.r} y2={toY(0)} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="4 4" />}
      <path d={areaD} fill={ac} />
      <path d={pathD} fill="none" stroke={lc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={toX(i)} cy={toY(p.balance)} r="3" fill={p.balance>=0?"#4ade80":"#f87171"} stroke="#161616" strokeWidth="1.5" />)}
      <text x={toX(0)} y={H-4} fill="#555" fontSize="9" textAnchor="middle">{points[0]?.date.slice(5)}</text>
      {points.length > 1 && <text x={toX(points.length-1)} y={H-4} fill="#555" fontSize="9" textAnchor="middle">{points[points.length-1]?.date.slice(5)}</text>}
    </svg>
  );
}

// ── PIN ──────────────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const press = (d) => {
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    if (next.length === 4) {
      if (next === PIN) { setTimeout(() => onUnlock(), 200); }
      else { setShake(true); setTimeout(() => { setInput(""); setShake(false); }, 600); }
    }
  };
  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        html,body{background:#0d0d0d!important;margin:0;overscroll-behavior:none;}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}
        .shake{animation:shake 0.5s ease;}
        .pin-btn{width:72px;height:72px;border-radius:50%;background:#1a1a1a;border:1px solid #2a2a2a;color:#e8e0d0;font-family:'DM Mono',monospace;font-size:20px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;}
        .pin-btn:active{background:#2a2a2a;transform:scale(0.94);}
      `}</style>
      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:9, letterSpacing:4, color:"#555", marginBottom:32 }}>FLUJO DE CAJA</div>
      <div className={shake?"shake":""} style={{ display:"flex", gap:16, marginBottom:48 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width:14, height:14, borderRadius:"50%", background:i<input.length?"#c8b898":"#1e1e1e", border:"1px solid #2a2a2a", transition:"background 0.15s" }} />)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,72px)", gap:16 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="pin-btn" onClick={() => press(String(n))}>{n}</button>)}
        <div />
        <button className="pin-btn" onClick={() => press("0")}>0</button>
        <button className="pin-btn" onClick={() => setInput(p => p.slice(0,-1))} style={{ fontSize:16 }}>⌫</button>
      </div>
    </div>
  );
}

// ── PROFILE SELECTOR ─────────────────────────────────────────
function ProfileSelector({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", padding:24 }}>
      <style>{`html,body{background:#0d0d0d!important;margin:0;overscroll-behavior:none;}`}</style>
      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:9, letterSpacing:4, color:"#555", marginBottom:12 }}>FLUJO DE CAJA</div>
      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:18, fontWeight:900, color:"#e8e0d0", marginBottom:8 }}>¿Qué perfil?</div>
      <div style={{ fontSize:11, color:"#555", marginBottom:40 }}>elegí para continuar</div>
      <div style={{ display:"flex", flexDirection:"column", gap:14, width:"100%", maxWidth:320 }}>
        {Object.entries(PROFILES).map(([key, p]) => (
          <button key={key} onClick={() => onSelect(key)} style={{
            background:"#161616", border:"1px solid #2a2a2a", borderRadius:14,
            padding:"22px 24px", cursor:"pointer", color:"#e8e0d0",
            fontFamily:"'Unbounded',sans-serif", fontSize:14, fontWeight:700,
            textAlign:"left", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"space-between"
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor="#c8b898"}
            onMouseLeave={e => e.currentTarget.style.borderColor="#2a2a2a"}
          >
            <span>{p.icon} {p.label}</span>
            <span style={{ color:"#555", fontSize:18 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── PAYMENTS TAB ─────────────────────────────────────────────
function PaymentsTab({ payments, setPayments }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", date:new Date().toISOString().split("T")[0], amount:"", currency:"ARS" });
  const [filterPaid, setFilterPaid] = useState("pending");

  const handleAdd = () => {
    if (!form.name || !form.amount) return;
    const newP = { ...form, amount:Number(form.amount), id:Date.now(), paid:false, paidDate:null };
    const updated = [newP, ...payments];
    setPayments(updated);
    savePayments(updated);
    setForm({ name:"", date:new Date().toISOString().split("T")[0], amount:"", currency:"ARS" });
    setShowForm(false);
  };

  const togglePaid = (id) => {
    const updated = payments.map(p =>
      p.id === id ? { ...p, paid:!p.paid, paidDate:!p.paid ? new Date().toISOString().split("T")[0] : null } : p
    );
    setPayments(updated);
    savePayments(updated);
  };

  const handleDelete = (id) => {
    const updated = payments.filter(p => p.id !== id);
    setPayments(updated);
    savePayments(updated);
  };

  const filtered = filterPaid === "all" ? payments
    : filterPaid === "pending" ? payments.filter(p => !p.paid)
    : payments.filter(p => p.paid);

  const totalPending = payments.filter(p => !p.paid);
  const arsPending = totalPending.filter(p => p.currency==="ARS").reduce((s,p) => s+p.amount, 0);
  const usdPending = totalPending.filter(p => p.currency==="USD").reduce((s,p) => s+p.amount, 0);

  return (
    <div>
      {totalPending.length > 0 && (
        <div className="card" style={{ marginBottom:12 }}>
          <div className="section-title">Pendiente de pago</div>
          <div style={{ display:"flex", gap:20 }}>
            {arsPending > 0 && (
              <div>
                <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>ARS</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:16, fontWeight:700, color:"#f87171" }}>{formatARS(arsPending)}</div>
              </div>
            )}
            {usdPending > 0 && (
              <div>
                <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>USD</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:16, fontWeight:700, color:"#fb923c" }}>{formatUSD(usdPending)}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["pending","paid","all"].map(f => (
          <button key={f} className={`tab-btn ${filterPaid===f?"active":""}`} onClick={() => setFilterPaid(f)}>
            {f==="pending"?"pendientes":f==="paid"?"pagados":"todos"}
          </button>
        ))}
      </div>

      <div className="card">
        {filtered.length === 0 && (
          <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:20 }}>
            {filterPaid==="pending" ? "No hay pagos pendientes 🎉" : "Sin pagos aún"}
          </div>
        )}
        {[...filtered].sort((a,b) => {
          if (a.paid !== b.paid) return a.paid ? 1 : -1;
          return a.date.localeCompare(b.date);
        }).map(p => (
          <div key={p.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 0", borderBottom:"1px solid #1e1e1e" }}>
            <button onClick={() => togglePaid(p.id)} style={{
              width:28, height:28, borderRadius:"50%", flexShrink:0,
              background: p.paid ? "#0d2016" : "#1a1a1a",
              border: p.paid ? "1.5px solid #4ade80" : "1.5px solid #2a2a2a",
              color: p.paid ? "#4ade80" : "#444",
              fontSize:14, cursor:"pointer", transition:"all 0.2s",
              display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              {p.paid ? "✓" : ""}
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, color: p.paid ? "#555" : "#e8e0d0", textDecoration: p.paid ? "line-through" : "none", marginBottom:3 }}>
                {p.name}
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:10, color:"#555" }}>{p.date}</span>
                {p.paid && p.paidDate && <span style={{ fontSize:10, color:"#4ade80" }}>pagado {p.paidDate}</span>}
              </div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, color: p.paid ? "#555" : p.currency==="USD" ? "#fb923c" : "#f87171" }}>
                {p.currency==="USD" ? formatUSD(p.amount) : formatARS(p.amount)}
              </div>
              <div style={{ fontSize:9, color:"#444", letterSpacing:1 }}>{p.currency}</div>
            </div>
            <button className="del-btn" onClick={() => handleDelete(p.id)}>×</button>
          </div>
        ))}
      </div>

      <div style={{ position:"fixed", bottom:28, right:24, zIndex:100 }}>
        <button className="fab" onClick={() => setShowForm(true)}>+</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:20 }}>Nuevo pago</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="text" placeholder="Nombre del pago (ej: Alquiler)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
              <div style={{ display:"flex", gap:8 }}>
                <input type="number" placeholder="Monto" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={{ flex:1 }} />
                <div style={{ display:"flex", background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                  {["ARS","USD"].map(cur => (
                    <button key={cur} onClick={() => setForm({...form,currency:cur})} style={{
                      padding:"10px 14px", border:"none", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:12,
                      background: form.currency===cur ? "#2a2a2a" : "transparent",
                      color: form.currency===cur ? "#e8e0d0" : "#555",
                      transition:"all 0.2s"
                    }}>{cur}</button>
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleAdd} style={{ flex:2 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DROPDOWN MENU ─────────────────────────────────────────────
function DropdownMenu({ profile, onExport, onImport, onSwitch, importRef }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => { document.removeEventListener("mousedown", handle); document.removeEventListener("touchstart", handle); };
  }, []);

  const items = [
    { label: "↓ Exportar CSV", action: () => { onExport(); setOpen(false); } },
    { label: "↑ Importar CSV", action: () => { importRef.current?.click(); setOpen(false); } },
    { label: `${PROFILES[profile].label} — cambiar perfil`, action: () => { onSwitch(); setOpen(false); } },
  ];

  return (
    <div ref={menuRef} style={{ position:"relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:8,
        color:"#e8e0d0", width:36, height:36, cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:18, letterSpacing:1, transition:"all 0.2s",
        fontFamily:"monospace"
      }}>⋯</button>

      {open && (
        <div style={{
          position:"absolute", top:44, right:0, zIndex:500,
          background:"#1a1a1a", border:"1px solid #3a3a3a", borderRadius:12,
          overflow:"hidden", minWidth:210,
          boxShadow:"0 8px 32px rgba(0,0,0,0.9)",
          opacity:1,
          animation:"fadeIn 0.15s ease"
        }}>
          {items.map((item, i) => (
            <button key={i} onClick={item.action} style={{
              display:"block", width:"100%", padding:"14px 18px",
              background:"none", border:"none",
              borderBottom: i < items.length-1 ? "1px solid #2a2a2a" : "none",
              color:"#e8e0d0", fontFamily:"'DM Mono',monospace", fontSize:12,
              textAlign:"left", cursor:"pointer", transition:"background 0.15s",
              letterSpacing:"0.5px"
            }}
              onMouseEnter={e => e.currentTarget.style.background="#2a2a2a"}
              onMouseLeave={e => e.currentTarget.style.background="none"}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function CashFlow() {
  const [unlocked, setUnlocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({ type:"income", category:"", amount:"", desc:"", date:new Date().toISOString().split("T")[0] });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCat, setQuickCat] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [savingGoal, setSavingGoal] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [animateIn, setAnimateIn] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const importRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setTransactions(loadTransactions(profile));
      if (profile === "personal") setPayments(loadPayments());
      const cats = PROFILES[profile].categories;
      setForm({ type:"income", category:cats.income[0], amount:"", desc:"", date:new Date().toISOString().split("T")[0] });
      setQuickCat(cats.expense[0]);
      setSelectedMonth(null);
      setFilter("all");
      setActiveTab("dashboard");
      setSavingGoal(loadGoal());
      setAnimateIn(false);
      setTimeout(() => setAnimateIn(true), 50);
    }
  }, [profile]);

  useEffect(() => { if (profile) saveTransactions(profile, transactions); }, [transactions, profile]);

  const exportCSV = () => {
    const rows = [["Fecha","Tipo","Categoría","Descripción","Monto"]];
    [...transactions].sort((a,b) => b.date.localeCompare(a.date)).forEach(t => {
      rows.push([t.date, t.type==="income"?"Ingreso":"Gasto", t.category, `"${t.desc}"`, t.amount]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`cashflow_${profile}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split("\n").filter(l => l.trim());
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 5) continue;
          const date = cols[0].trim();
          const type = cols[1].trim() === "Ingreso" ? "income" : "expense";
          const category = cols[2].trim();
          const desc = cols[3].trim().replace(/^"|"$/g, "");
          const amount = Number(cols[4].trim());
          if (!date || isNaN(amount)) continue;
          imported.push({ date, type, category, desc, amount, id: Date.now() + i });
        }
        if (imported.length === 0) { setImportMsg("No se encontraron datos válidos"); return; }
        setTransactions(imported);
        saveTransactions(profile, imported);
        setImportMsg(`✓ ${imported.length} movimientos importados`);
        setTimeout(() => setImportMsg(null), 3000);
      } catch {
        setImportMsg("Error al leer el archivo");
        setTimeout(() => setImportMsg(null), 3000);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;
  if (!profile) return <ProfileSelector onSelect={p => setProfile(p)} />;

  const cats = PROFILES[profile].categories;
  const currentYear = new Date().getFullYear();
  const availableMonths = [...new Set(transactions.map(t => t.date.slice(0,7)))].sort().reverse();
  const monthFiltered = selectedMonth ? transactions.filter(t => t.date.startsWith(selectedMonth)) : transactions;

  const totalIncome = monthFiltered.filter(t => t.type==="income").reduce((s,t) => s+t.amount, 0);
  const totalExpense = monthFiltered.filter(t => t.type==="expense").reduce((s,t) => s+t.amount, 0);
  const balance = totalIncome - totalExpense;

  const ventas = monthFiltered.filter(t => t.type==="income" && t.category==="Ventas").reduce((s,t) => s+t.amount, 0);
  const costos = monthFiltered.filter(t => t.type==="expense" && t.category==="Costos").reduce((s,t) => s+t.amount, 0);
  const comisiones = monthFiltered.filter(t => t.type==="expense" && t.category==="Comisiones").reduce((s,t) => s+t.amount, 0);
  const margenNeto = ventas - costos - comisiones;
  const margenPct = ventas > 0 ? ((margenNeto / ventas) * 100).toFixed(1) : null;

  const saveGoal = () => {
    const g = Number(goalInput);
    if (!isNaN(g) && g > 0) { setSavingGoal(g); localStorage.setItem("cf_goal_personal", g); }
    setEditingGoal(false);
  };

  const byCategory = (type) => {
    const c = {};
    monthFiltered.filter(t => t.type===type).forEach(t => { c[t.category] = (c[t.category]||0) + t.amount; });
    return Object.entries(c).sort((a,b) => b[1]-a[1]);
  };

  const handleAdd = () => {
    if (!form.amount || !form.desc) return;
    setTransactions(prev => [{ ...form, amount:Number(form.amount), id:Date.now() }, ...prev]);
    setForm({ type:"income", category:cats.income[0], amount:"", desc:"", date:new Date().toISOString().split("T")[0] });
    setShowForm(false);
  };

  const handleQuick = () => {
    if (!quickAmount) return;
    setTransactions(prev => [{ type:"expense", category:quickCat, amount:Number(quickAmount), desc:"Gasto rápido", date:new Date().toISOString().split("T")[0], id:Date.now() }, ...prev]);
    setQuickAmount("");
    setShowQuick(false);
  };

  const handleDelete = (id) => setTransactions(prev => prev.filter(t => t.id!==id));
  const filtered = filter==="all" ? monthFiltered : monthFiltered.filter(t => t.type===filter);
  const maxBar = Math.max(...byCategory("income").concat(byCategory("expense")).map(([,v]) => v), 1);

  const monthSummary = () => {
    const map = {};
    transactions.forEach(t => {
      const m = t.date.slice(0,7);
      if (!map[m]) map[m] = { income:0, expense:0 };
      map[m][t.type==="income"?"income":"expense"] += t.amount;
    });
    return Object.entries(map).sort().slice(-6);
  };

  const tabs = profile === "personal"
    ? ["dashboard","gráfico","mensual","pagos","movimientos"]
    : ["dashboard","gráfico","mensual","movimientos"];

  const pendingCount = payments.filter(p => !p.paid).length;

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'DM Mono','Courier New',monospace", color:"#e8e0d0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        html{background-color:#0d0d0d!important;}
        body{background-color:#0d0d0d!important;overscroll-behavior-y:none;margin:0;}
        .fade-in{opacity:0;transform:translateY(16px);animation:fadeUp 0.5s ease forwards;}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .card{background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:20px;transition:border-color 0.2s;}
        .tab-btn{background:none;border:none;color:#666;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:8px 12px;border-radius:6px;transition:all 0.2s;position:relative;}
        .tab-btn.active{background:#1e1e1e;color:#e8e0d0;}
        .pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-weight:500;}
        .pill-income{background:#0d2016;color:#4ade80;border:1px solid #1a3a22;}
        .pill-expense{background:#200d0d;color:#f87171;border:1px solid #3a1a1a;}
        input,select{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#e8e0d0;font-family:'DM Mono',monospace;font-size:13px;padding:10px 14px;width:100%;outline:none;transition:border-color 0.2s;-webkit-appearance:none;}
        input:focus,select:focus{border-color:#c8b898;}
        select option{background:#1a1a1a;}
        .btn-primary{background:#c8b898;color:#0d0d0d;border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px;font-weight:500;padding:12px 24px;cursor:pointer;transition:all 0.2s;}
        .btn-ghost{background:none;color:#666;border:1px solid #2a2a2a;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;padding:12px 24px;cursor:pointer;transition:all 0.2s;}
        .btn-ghost:hover{border-color:#666;color:#e8e0d0;}
        .row{display:flex;gap:12px;flex-wrap:wrap;}
        .col{flex:1;min-width:110px;}
        .bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .bar-label{font-size:11px;color:#888;min-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .bar-track{flex:1;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;}
        .bar-fill{height:100%;border-radius:3px;transition:width 0.8s cubic-bezier(.4,0,.2,1);}
        .bar-val{font-size:11px;color:#aaa;min-width:76px;text-align:right;}
        .t-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1e1e1e;}
        .t-row:last-child{border-bottom:none;}
        .del-btn{background:none;border:none;color:#333;cursor:pointer;font-size:18px;padding:0 6px;transition:color 0.2s;line-height:1;}
        .del-btn:hover{color:#f87171;}
        .fab-wrap{position:fixed;bottom:28px;right:24px;display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:100;}
        .fab{width:52px;height:52px;background:#c8b898;color:#0d0d0d;border:none;border-radius:50%;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(200,184,152,0.3);transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
        .fab-secondary{width:42px;height:42px;background:#1e1e1e;color:#c8b898;border:1px solid #2a2a2a;border-radius:50%;font-size:18px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:flex-end;justify-content:center;z-index:200;backdrop-filter:blur(4px);}
        .modal{background:#161616;border:1px solid #2a2a2a;border-radius:20px 20px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:slideUp 0.3s cubic-bezier(.4,0,.2,1);}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .type-toggle{display:flex;background:#1a1a1a;border-radius:10px;padding:4px;margin-bottom:16px;}
        .type-btn{flex:1;padding:10px;border:none;border-radius:7px;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;transition:all 0.2s;background:none;color:#666;}
        .type-btn.income-active{background:#0d2016;color:#4ade80;}
        .type-btn.expense-active{background:#200d0d;color:#f87171;}
        .section-title{font-family:'Unbounded',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-bottom:16px;}
        .month-chip{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:20px;color:#666;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;padding:4px 12px;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
        .month-chip.active{background:#1e1e1e;border-color:#c8b898;color:#c8b898;}
        .month-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;margin-bottom:16px;scrollbar-width:none;}
        .month-scroll::-webkit-scrollbar{display:none;}
        .goal-bar-track{height:8px;background:#1e1e1e;border-radius:4px;overflow:hidden;margin-top:10px;}
        .goal-bar-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#1a5c30,#4ade80);transition:width 0.8s cubic-bezier(.4,0,.2,1);}
        .badge{position:absolute;top:4px;right:4px;width:8px;height:8px;border-radius:50%;background:#f87171;}
        .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:12px 20px;font-size:12px;color:#4ade80;z-index:999;animation:fadeIn 0.2s ease;}
      `}</style>

      {/* INPUT OCULTO PARA IMPORTAR */}
      <input ref={importRef} type="file" accept=".csv" onChange={importCSV} style={{ display:"none" }} />

      {/* TOAST */}
      {importMsg && <div className="toast">{importMsg}</div>}

      {/* HEADER */}
      <div style={{ padding:"28px 24px 0", maxWidth:480, margin:"0 auto" }}>
        <div className={animateIn?"fade-in":""}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:9, letterSpacing:4, color:"#555" }}>FLUJO DE CAJA</div>
            <DropdownMenu
              profile={profile}
              onExport={exportCSV}
              onImport={() => importRef.current?.click()}
              onSwitch={() => { setProfile(null); setActiveTab("dashboard"); }}
              importRef={importRef}
            />
          </div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:22, fontWeight:900, letterSpacing:-1, lineHeight:1.1, marginBottom:4 }}>
            {balance>=0?"+":""}{formatARS(balance)}
          </div>
          <div style={{ fontSize:11, color:balance>=0?"#4ade80":"#f87171", letterSpacing:1 }}>
            {balance>=0?"▲ balance positivo":"▼ balance negativo"}
            {selectedMonth && <span style={{ color:"#555", marginLeft:8 }}>· {selectedMonth}</span>}
          </div>
        </div>

        <div style={{ display:"flex", gap:4, marginTop:24, marginBottom:16, overflowX:"auto" }}>
          {tabs.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab===tab?"active":""}`} onClick={() => setActiveTab(tab)}>
              {tab}
              {tab==="pagos" && pendingCount > 0 && <span className="badge" />}
            </button>
          ))}
        </div>

        {activeTab !== "pagos" && availableMonths.length > 0 && (
          <div className="month-scroll">
            <button className={`month-chip ${!selectedMonth?"active":""}`} onClick={() => setSelectedMonth(null)}>Todo</button>
            {availableMonths.map(m => {
              const [y, mo] = m.split("-");
              return (
                <button key={m} className={`month-chip ${selectedMonth===m?"active":""}`} onClick={() => setSelectedMonth(m)}>
                  {MONTHS[parseInt(mo)-1]} {y !== String(currentYear) ? y : ""}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 24px 120px" }}>

        {activeTab==="pagos" && <PaymentsTab payments={payments} setPayments={setPayments} />}

        {activeTab==="dashboard" && (
          <>
            <div className="row" style={{ marginBottom:12 }}>
              <div className="card col">
                <div style={{ fontSize:10, color:"#4ade80", letterSpacing:2, marginBottom:8 }}>▲ INGRESOS</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14, fontWeight:700 }}>{formatARS(totalIncome)}</div>
              </div>
              <div className="card col">
                <div style={{ fontSize:10, color:"#f87171", letterSpacing:2, marginBottom:8 }}>▼ GASTOS</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:14, fontWeight:700 }}>{formatARS(totalExpense)}</div>
              </div>
            </div>

            {profile==="toscana" && (
              <div className="card" style={{ marginBottom:12 }}>
                <div className="section-title">Margen neto</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>Ventas − Costos − Comisiones</div>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:18, fontWeight:700, color:margenNeto>=0?"#4ade80":"#f87171" }}>
                      {margenNeto>=0?"+":""}{formatARS(margenNeto)}
                    </div>
                  </div>
                  {margenPct && (
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>MARGEN %</div>
                      <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:22, fontWeight:900, color:margenNeto>=0?"#4ade80":"#f87171" }}>
                        {margenPct}%
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop:12, display:"flex", gap:16 }}>
                  {[["Ventas",ventas,"#4ade80"],["Costos",costos,"#f87171"],["Comisiones",comisiones,"#fb923c"]].map(([label,val,color]) => (
                    <div key={label}>
                      <div style={{ fontSize:9, color:"#555", letterSpacing:1, marginBottom:2 }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize:12, color, fontWeight:500 }}>{formatARS(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile==="personal" && (
              savingGoal > 0 ? (
                <div className="card" style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <div className="section-title" style={{ marginBottom:0 }}>Meta de ahorro</div>
                    <button onClick={() => { setEditingGoal(true); setGoalInput(String(savingGoal)); }} style={{ background:"none", border:"none", color:"#555", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono',monospace" }}>editar</button>
                  </div>
                  {editingGoal ? (
                    <div style={{ display:"flex", gap:8, marginTop:8 }}>
                      <input type="number" placeholder="Meta en ARS" value={goalInput} onChange={e=>setGoalInput(e.target.value)} />
                      <button className="btn-primary" onClick={saveGoal} style={{ padding:"10px 16px", whiteSpace:"nowrap" }}>✓</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#888", marginBottom:4 }}>
                        <span>{formatARS(Math.max(balance,0))} ahorrado</span>
                        <span>{formatARS(savingGoal)} meta</span>
                      </div>
                      <div className="goal-bar-track">
                        <div className="goal-bar-fill" style={{ width:`${Math.min((Math.max(balance,0)/savingGoal)*100,100)}%` }} />
                      </div>
                      <div style={{ fontSize:10, color:"#555", marginTop:6 }}>
                        {Math.min(Math.round((Math.max(balance,0)/savingGoal)*100),100)}% completado
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setEditingGoal(true)} style={{ background:"#161616", border:"1px dashed #2a2a2a", borderRadius:12, padding:"14px 20px", cursor:"pointer", color:"#555", fontFamily:"'DM Mono',monospace", fontSize:11, width:"100%", marginBottom:12, textAlign:"left" }}>
                  + Establecer meta de ahorro mensual
                </button>
              )
            )}

            {editingGoal && savingGoal===0 && (
              <div className="card" style={{ marginBottom:12 }}>
                <div className="section-title">Meta de ahorro</div>
                <div style={{ display:"flex", gap:8 }}>
                  <input type="number" placeholder="Meta en ARS" value={goalInput} onChange={e=>setGoalInput(e.target.value)} />
                  <button className="btn-primary" onClick={saveGoal} style={{ padding:"10px 16px" }}>✓</button>
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom:12 }}>
              <div className="section-title">Ingresos por categoría</div>
              {byCategory("income").length===0 && <div style={{ color:"#555", fontSize:12 }}>Sin ingresos aún</div>}
              {byCategory("income").map(([cat,val]) => (
                <div key={cat} className="bar-wrap">
                  <div className="bar-label">{cat}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width:`${(val/maxBar)*100}%`, background:"linear-gradient(90deg,#1a5c30,#4ade80)" }} /></div>
                  <div className="bar-val">{formatARS(val)}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-title">Gastos por categoría</div>
              {byCategory("expense").length===0 && <div style={{ color:"#555", fontSize:12 }}>Sin gastos aún</div>}
              {byCategory("expense").map(([cat,val]) => (
                <div key={cat} className="bar-wrap">
                  <div className="bar-label">{cat}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width:`${(val/maxBar)*100}%`, background:"linear-gradient(90deg,#5c1a1a,#f87171)" }} /></div>
                  <div className="bar-val">{formatARS(val)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab==="gráfico" && (
          <div className="card">
            <div className="section-title">Balance acumulado</div>
            <BalanceChart transactions={monthFiltered} />
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:16, paddingTop:16, borderTop:"1px solid #1e1e1e" }}>
              <div>
                <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>PICO MÁX</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, color:"#4ade80" }}>
                  {formatARS(Math.max(...(()=>{ let r=0; return [...monthFiltered].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>{ r+=t.type==="income"?t.amount:-t.amount; return r; }); })(), 0))}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:10, color:"#555", marginBottom:4 }}>MOVIMIENTOS</div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13 }}>{monthFiltered.length}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab==="mensual" && (
          <div className="card">
            <div className="section-title">Resumen por mes</div>
            {monthSummary().length===0 && <div style={{ color:"#555", fontSize:12 }}>Sin datos aún</div>}
            {[...monthSummary()].reverse().map(([m, data]) => {
              const [y, mo] = m.split("-");
              const bal = data.income - data.expense;
              const maxVal = Math.max(data.income, data.expense, 1);
              return (
                <div key={m} style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"center" }}>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:11, fontWeight:700 }}>
                      {MONTHS[parseInt(mo)-1]} {y}
                    </div>
                    <div style={{ fontSize:12, color:bal>=0?"#4ade80":"#f87171", fontWeight:500 }}>
                      {bal>=0?"+":""}{formatARS(bal)}
                    </div>
                  </div>
                  <div style={{ marginBottom:6 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                      <span>Ingresos</span><span>{formatARS(data.income)}</span>
                    </div>
                    <div className="bar-track" style={{ height:8 }}>
                      <div className="bar-fill" style={{ width:`${(data.income/maxVal)*100}%`, background:"linear-gradient(90deg,#1a5c30,#4ade80)" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                      <span>Gastos</span><span>{formatARS(data.expense)}</span>
                    </div>
                    <div className="bar-track" style={{ height:8 }}>
                      <div className="bar-fill" style={{ width:`${(data.expense/maxVal)*100}%`, background:"linear-gradient(90deg,#5c1a1a,#f87171)" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab==="movimientos" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {["all","income","expense"].map(f => (
                <button key={f} className={`tab-btn ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
                  {f==="all"?"todos":f==="income"?"ingresos":"gastos"}
                </button>
              ))}
            </div>
            <div className="card">
              {filtered.length===0 && <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:20 }}>Sin movimientos</div>}
              {[...filtered].sort((a,b)=>b.date.localeCompare(a.date)).map(t => (
                <div key={t.id} className="t-row">
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, marginBottom:4 }}>{t.desc}</div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span className={`pill pill-${t.type}`}>{t.category}</span>
                      <span style={{ fontSize:10, color:"#555" }}>{t.date}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, color:t.type==="income"?"#4ade80":"#f87171" }}>
                    {t.type==="income"?"+":"-"}{formatARS(t.amount)}
                  </div>
                  <button className="del-btn" onClick={() => handleDelete(t.id)}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {activeTab !== "pagos" && (
        <div className="fab-wrap">
          <button className="fab-secondary" onClick={() => setShowQuick(true)}>⚡</button>
          <button className="fab" onClick={() => setShowForm(true)}>+</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:20 }}>Nuevo movimiento</div>
            <div className="type-toggle">
              <button className={`type-btn ${form.type==="income"?"income-active":""}`} onClick={() => setForm({...form,type:"income",category:cats.income[0]})}>▲ Ingreso</button>
              <button className={`type-btn ${form.type==="expense"?"expense-active":""}`} onClick={() => setForm({...form,type:"expense",category:cats.expense[0]})}>▼ Gasto</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                {cats[form.type].map(c=><option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Monto en ARS" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} />
              <input type="text" placeholder="Descripción" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} />
              <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} />
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowForm(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleAdd} style={{ flex:2 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuick && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowQuick(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:6 }}>⚡ Gasto rápido</div>
            <div style={{ fontSize:11, color:"#555", marginBottom:20 }}>Solo monto y categoría</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="number" placeholder="Monto en ARS" value={quickAmount} onChange={e=>setQuickAmount(e.target.value)} />
              <select value={quickCat} onChange={e=>setQuickCat(e.target.value)}>
                {cats.expense.map(c=><option key={c}>{c}</option>)}
              </select>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowQuick(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleQuick} style={{ flex:2 }}>Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
