import { useState, useEffect } from "react";

const PIN = "2507";

const PROFILES = {
  personal: {
    label: "Personal",
    categories: {
      income: ["Sprint", "La Toscana", "Ropa", "Otros"],
      expense: ["Ropa", "Sprint", "La Toscana", "Tarjeta crédito", "Comida", "Jodas", "Alcohol", "Otros"],
    },
  },
  toscana: {
    label: "La Toscana",
    categories: {
      income: ["Ventas"],
      expense: ["Costos", "Comisiones", "Bonificaciones"],
    },
  },
};

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function loadTransactions(profile) {
  try {
    const saved = localStorage.getItem(`cashflow_${profile}`);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveTransactions(profile, txs) {
  try { localStorage.setItem(`cashflow_${profile}`, JSON.stringify(txs)); } catch {}
}

function BalanceChart({ transactions }) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return (
    <div style={{ textAlign: "center", color: "#555", fontSize: 12, padding: "20px 0" }}>
      Agregá movimientos para ver el gráfico
    </div>
  );
  const byDate = {};
  sorted.forEach(t => { byDate[t.date] = byDate[t.date] || []; byDate[t.date].push(t); });
  const points = [];
  let running = 0;
  Object.entries(byDate).sort().forEach(([date, txs]) => {
    txs.forEach(t => { running += t.type === "income" ? t.amount : -t.amount; });
    points.push({ date, balance: running });
  });
  const W = 340, H = 120;
  const pad = { t: 16, r: 12, b: 24, l: 12 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const balances = points.map(p => p.balance);
  const minB = Math.min(...balances, 0), maxB = Math.max(...balances, 1);
  const range = maxB - minB || 1;
  const toX = (i) => pad.l + (i / Math.max(points.length - 1, 1)) * iW;
  const toY = (v) => pad.t + iH - ((v - minB) / range) * iH;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.balance)}`).join(" ");
  const areaD = `${pathD} L ${toX(points.length - 1)} ${H - pad.b} L ${toX(0)} ${H - pad.b} Z`;
  const lastBalance = points[points.length - 1]?.balance || 0;
  const lineColor = lastBalance >= 0 ? "#4ade80" : "#f87171";
  const areaColor = lastBalance >= 0 ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)";
  const zeroY = toY(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
      {minB < 0 && maxB > 0 && (
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke="#2a2a2a" strokeWidth="1" strokeDasharray="4 4" />
      )}
      <path d={areaD} fill={areaColor} />
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.balance)} r="3"
          fill={p.balance >= 0 ? "#4ade80" : "#f87171"} stroke="#161616" strokeWidth="1.5" />
      ))}
      <text x={toX(0)} y={H - 4} fill="#555" fontSize="9" textAnchor="middle">{points[0]?.date.slice(5)}</text>
      {points.length > 1 && (
        <text x={toX(points.length - 1)} y={H - 4} fill="#555" fontSize="9" textAnchor="middle">{points[points.length - 1]?.date.slice(5)}</text>
      )}
    </svg>
  );
}

// ── PIN SCREEN ──────────────────────────────────────────────
function PinScreen({ onUnlock }) {
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (input.length >= 4) return;
    const next = input + d;
    setInput(next);
    if (next.length === 4) {
      if (next === PIN) {
        setTimeout(() => onUnlock(), 200);
      } else {
        setShake(true);
        setTimeout(() => { setInput(""); setShake(false); }, 600);
      }
    }
  };

  const del = () => setInput(p => p.slice(0, -1));

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        html, body { background: #0d0d0d !important; margin: 0; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        .shake { animation: shake 0.5s ease; }
        .pin-btn { width: 72px; height: 72px; border-radius: 50%; background: #1a1a1a; border: 1px solid #2a2a2a; color: #e8e0d0; font-family: 'DM Mono', monospace; font-size: 20px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
        .pin-btn:active { background: #2a2a2a; transform: scale(0.94); }
      `}</style>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 9, letterSpacing: 4, color: "#555", marginBottom: 32 }}>FLUJO DE CAJA</div>

      {/* Dots */}
      <div className={shake ? "shake" : ""} style={{ display: "flex", gap: 16, marginBottom: 48 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: i < input.length ? "#c8b898" : "#1e1e1e",
            border: "1px solid #2a2a2a",
            transition: "background 0.15s"
          }} />
        ))}
      </div>

      {/* Keypad */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 16 }}>
        {[1,2,3,4,5,6,7,8,9].map(n => (
          <button key={n} className="pin-btn" onClick={() => press(String(n))}>{n}</button>
        ))}
        <div />
        <button className="pin-btn" onClick={() => press("0")}>0</button>
        <button className="pin-btn" onClick={del} style={{ fontSize: 16 }}>⌫</button>
      </div>
    </div>
  );
}

// ── PROFILE SELECTOR ────────────────────────────────────────
function ProfileSelector({ onSelect }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", padding: 24 }}>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 9, letterSpacing: 4, color: "#555", marginBottom: 12 }}>FLUJO DE CAJA</div>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 18, fontWeight: 900, color: "#e8e0d0", marginBottom: 8 }}>¿Qué perfil?</div>
      <div style={{ fontSize: 11, color: "#555", marginBottom: 40 }}>elegí para continuar</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 320 }}>
        {Object.entries(PROFILES).map(([key, p]) => (
          <button key={key} onClick={() => onSelect(key)} style={{
            background: "#161616", border: "1px solid #2a2a2a", borderRadius: 14,
            padding: "22px 24px", cursor: "pointer", color: "#e8e0d0",
            fontFamily: "'Unbounded', sans-serif", fontSize: 14, fontWeight: 700,
            textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "space-between"
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#c8b898"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#2a2a2a"}
          >
            {p.label}
            <span style={{ color: "#555", fontSize: 18 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function CashFlow() {
  const [unlocked, setUnlocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (profile) {
      setTransactions(loadTransactions(profile));
      const cats = PROFILES[profile].categories;
      setForm({ type: "income", category: cats.income[0], amount: "", desc: "", date: new Date().toISOString().split("T")[0] });
      setAnimateIn(false);
      setTimeout(() => setAnimateIn(true), 50);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) saveTransactions(profile, transactions);
  }, [transactions, profile]);

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />;
  if (!profile) return <ProfileSelector onSelect={(p) => setProfile(p)} />;

  const cats = PROFILES[profile].categories;
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const byCategory = (type) => {
    const c = {};
    transactions.filter(t => t.type === type).forEach(t => { c[t.category] = (c[t.category] || 0) + t.amount; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };

  const handleAdd = () => {
    if (!form.amount || !form.desc) return;
    setTransactions(prev => [{ ...form, amount: Number(form.amount), id: Date.now() }, ...prev]);
    setForm({ type: "income", category: cats.income[0], amount: "", desc: "", date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
  };

  const handleDelete = (id) => setTransactions(prev => prev.filter(t => t.id !== id));
  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
  const maxBar = Math.max(...byCategory("income").concat(byCategory("expense")).map(([, v]) => v), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e8e0d0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        html { background-color: #0d0d0d !important; }
        body { background-color: #0d0d0d !important; overscroll-behavior-y: none; margin: 0; }
        .fade-in { opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; transition: border-color 0.2s; }
        .card:hover { border-color: #3a3a3a; }
        .tab-btn { background: none; border: none; color: #666; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; padding: 8px 14px; border-radius: 6px; transition: all 0.2s; }
        .tab-btn.active { background: #1e1e1e; color: #e8e0d0; }
        .pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
        .pill-income { background: #0d2016; color: #4ade80; border: 1px solid #1a3a22; }
        .pill-expense { background: #200d0d; color: #f87171; border: 1px solid #3a1a1a; }
        input, select { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #e8e0d0; font-family: 'DM Mono', monospace; font-size: 13px; padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.2s; -webkit-appearance: none; }
        input:focus, select:focus { border-color: #c8b898; }
        select option { background: #1a1a1a; }
        .btn-primary { background: #c8b898; color: #0d0d0d; border: none; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 1px; font-weight: 500; padding: 12px 24px; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background: #e8e0d0; }
        .btn-ghost { background: none; color: #666; border: 1px solid #2a2a2a; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 12px; padding: 12px 24px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #666; color: #e8e0d0; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; }
        .col { flex: 1; min-width: 120px; }
        .bar-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .bar-label { font-size: 11px; color: #888; min-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-track { flex: 1; height: 6px; background: #1e1e1e; border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .bar-val { font-size: 11px; color: #aaa; min-width: 76px; text-align: right; }
        .t-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #1e1e1e; }
        .t-row:last-child { border-bottom: none; }
        .del-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 18px; padding: 0 6px; transition: color 0.2s; line-height: 1; }
        .del-btn:hover { color: #f87171; }
        .fab { position: fixed; bottom: 28px; right: 24px; width: 52px; height: 52px; background: #c8b898; color: #0d0d0d; border: none; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(200,184,152,0.3); transition: all 0.2s; display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; align-items: flex-end; justify-content: center; z-index: 200; backdrop-filter: blur(4px); }
        .modal { background: #161616; border: 1px solid #2a2a2a; border-radius: 20px 20px 0 0; padding: 28px 24px 48px; width: 100%; max-width: 480px; animation: slideUp 0.3s cubic-bezier(.4,0,.2,1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .type-toggle { display: flex; background: #1a1a1a; border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .type-btn { flex: 1; padding: 10px; border: none; border-radius: 7px; font-family: 'DM Mono', monospace; font-size: 12px; cursor: pointer; transition: all 0.2s; background: none; color: #666; }
        .type-btn.income-active { background: #0d2016; color: #4ade80; }
        .type-btn.expense-active { background: #200d0d; color: #f87171; }
        .section-title { font-family: 'Unbounded', sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 16px; }
        .switch-btn { background: none; border: 1px solid #2a2a2a; border-radius: 6px; color: #555; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 1px; padding: 4px 10px; cursor: pointer; transition: all 0.2s; }
        .switch-btn:hover { border-color: #555; color: #e8e0d0; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "28px 24px 0", maxWidth: 480, margin: "0 auto" }}>
        <div className={animateIn ? "fade-in" : ""}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 9, letterSpacing: 4, color: "#555" }}>
              FLUJO DE CAJA
            </div>
            <button className="switch-btn" onClick={() => { setProfile(null); setActiveTab("dashboard"); }}>
              {PROFILES[profile].label} ↗
            </button>
          </div>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 4 }}>
            {balance >= 0 ? "+" : ""}{formatARS(balance)}
          </div>
          <div style={{ fontSize: 11, color: balance >= 0 ? "#4ade80" : "#f87171", letterSpacing: 1 }}>
            {balance >= 0 ? "▲ balance positivo" : "▼ balance negativo"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 24 }}>
          {["dashboard", "gráfico", "movimientos"].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px 100px" }}>

        {activeTab === "dashboard" && (
          <>
            <div className="row" style={{ marginBottom: 16 }}>
              <div className="card col">
                <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2, marginBottom: 8 }}>▲ INGRESOS</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 700 }}>{formatARS(totalIncome)}</div>
              </div>
              <div className="card col">
                <div style={{ fontSize: 10, color: "#f87171", letterSpacing: 2, marginBottom: 8 }}>▼ GASTOS</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 700 }}>{formatARS(totalExpense)}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="section-title">Ingresos por categoría</div>
              {byCategory("income").length === 0 && <div style={{ color: "#555", fontSize: 12 }}>Sin ingresos aún</div>}
              {byCategory("income").map(([cat, val]) => (
                <div key={cat} className="bar-wrap">
                  <div className="bar-label">{cat}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / maxBar) * 100}%`, background: "linear-gradient(90deg, #1a5c30, #4ade80)" }} /></div>
                  <div className="bar-val">{formatARS(val)}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="section-title">Gastos por categoría</div>
              {byCategory("expense").length === 0 && <div style={{ color: "#555", fontSize: 12 }}>Sin gastos aún</div>}
              {byCategory("expense").map(([cat, val]) => (
                <div key={cat} className="bar-wrap">
                  <div className="bar-label">{cat}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(val / maxBar) * 100}%`, background: "linear-gradient(90deg, #5c1a1a, #f87171)" }} /></div>
                  <div className="bar-val">{formatARS(val)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "gráfico" && (
          <div className="card">
            <div className="section-title">Balance acumulado</div>
            <BalanceChart transactions={transactions} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e1e1e" }}>
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>PICO MÁX</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, color: "#4ade80" }}>
                  {formatARS(Math.max(...(() => { let r = 0; return [...transactions].sort((a,b) => a.date.localeCompare(b.date)).map(t => { r += t.type === "income" ? t.amount : -t.amount; return r; }); })(), 0))}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>MOVIMIENTOS</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13 }}>{transactions.length}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "movimientos" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["all", "income", "expense"].map(f => (
                <button key={f} className={`tab-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "todos" : f === "income" ? "ingresos" : "gastos"}
                </button>
              ))}
            </div>
            <div className="card">
              {filtered.length === 0 && <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 20 }}>Sin movimientos</div>}
              {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map(t => (
                <div key={t.id} className="t-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>{t.desc}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={`pill pill-${t.type}`}>{t.category}</span>
                      <span style={{ fontSize: 10, color: "#555" }}>{t.date}</span>
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, color: t.type === "income" ? "#4ade80" : "#f87171" }}>
                    {t.type === "income" ? "+" : "-"}{formatARS(t.amount)}
                  </div>
                  <button className="del-btn" onClick={() => handleDelete(t.id)}>×</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <button className="fab" onClick={() => setShowForm(true)}>+</button>

      {showForm && form && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Nuevo movimiento</div>
            <div className="type-toggle">
              <button className={`type-btn ${form.type === "income" ? "income-active" : ""}`}
                onClick={() => setForm({ ...form, type: "income", category: cats.income[0] })}>▲ Ingreso</button>
              <button className={`type-btn ${form.type === "expense" ? "expense-active" : ""}`}
                onClick={() => setForm({ ...form, type: "expense", category: cats.expense[0] })}>▼ Gasto</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {cats[form.type].map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" placeholder="Monto en ARS" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <input type="text" placeholder="Descripción" value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button className="btn-ghost" onClick={() => setShowForm(false)} style={{ flex: 1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleAdd} style={{ flex: 2 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
