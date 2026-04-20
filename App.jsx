import { useState, useEffect, useRef } from "react";

const CATEGORIES = {
  income: ["Sprint", "La Toscana", "Ropa", "Otros"],
  expense: ["Ropa", "Sprint", "La Toscana", "Tarjeta crédito", "Comida", "Jodas", "Alcohol", "Otros"],
};

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const initialTransactions = [
  { id: 1, type: "income", category: "Sprint", amount: 150000, desc: "Venta zona norte", date: "2026-04-15" },
  { id: 2, type: "expense", category: "Tarjeta crédito", amount: 45000, desc: "Pago tarjeta", date: "2026-04-16" },
  { id: 3, type: "income", category: "La Toscana", amount: 80000, desc: "Cobro semana", date: "2026-04-17" },
  { id: 4, type: "expense", category: "Comida", amount: 12000, desc: "Super semana", date: "2026-04-18" },
  { id: 5, type: "expense", category: "Jodas", amount: 25000, desc: "Salida viernes", date: "2026-04-19" },
  { id: 6, type: "income", category: "Ropa", amount: 60000, desc: "Venta ropa", date: "2026-04-20" },
];

// Gráfico SVG de balance acumulado
function BalanceChart({ transactions }) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  
  if (sorted.length === 0) return (
    <div style={{ textAlign: "center", color: "#555", fontSize: 12, padding: "20px 0" }}>
      Agregá movimientos para ver el gráfico
    </div>
  );

  // Construir puntos acumulados por fecha
  const points = [];
  let running = 0;
  const byDate = {};
  sorted.forEach(t => {
    byDate[t.date] = byDate[t.date] || [];
    byDate[t.date].push(t);
  });

  Object.entries(byDate).sort().forEach(([date, txs]) => {
    txs.forEach(t => { running += t.type === "income" ? t.amount : -t.amount; });
    points.push({ date, balance: running });
  });

  const W = 340, H = 120;
  const pad = { t: 16, r: 12, b: 24, l: 12 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;

  const balances = points.map(p => p.balance);
  const minB = Math.min(...balances, 0);
  const maxB = Math.max(...balances, 1);
  const range = maxB - minB || 1;

  const toX = (i) => pad.l + (i / Math.max(points.length - 1, 1)) * iW;
  const toY = (v) => pad.t + iH - ((v - minB) / range) * iH;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.balance)}`).join(" ");
  const areaD = `${pathD} L ${toX(points.length - 1)} ${H - pad.b} L ${toX(0)} ${H - pad.b} Z`;

  const lastBalance = points[points.length - 1]?.balance || 0;
  const isPositive = lastBalance >= 0;

  const lineColor = isPositive ? "#4ade80" : "#f87171";
  const areaColor = isPositive ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)";
  const zeroY = toY(0);

  // Labels de fechas (primero y último)
  const firstLabel = points[0]?.date.slice(5); // MM-DD
  const lastLabel = points[points.length - 1]?.date.slice(5);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", overflow: "visible" }}>
      {/* Zero line */}
      {minB < 0 && maxB > 0 && (
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY}
          stroke="#2a2a2a" strokeWidth="1" strokeDasharray="4 4" />
      )}
      {/* Area */}
      <path d={areaD} fill={areaColor} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={toX(i)} cy={toY(p.balance)} r="3"
          fill={p.balance >= 0 ? "#4ade80" : "#f87171"}
          stroke="#161616" strokeWidth="1.5" />
      ))}
      {/* Date labels */}
      <text x={toX(0)} y={H - 4} fill="#555" fontSize="9" textAnchor="middle">{firstLabel}</text>
      {points.length > 1 && (
        <text x={toX(points.length - 1)} y={H - 4} fill="#555" fontSize="9" textAnchor="middle">{lastLabel}</text>
      )}
    </svg>
  );
}

export default function CashFlow() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [form, setForm] = useState({ type: "income", category: CATEGORIES.income[0], amount: "", desc: "", date: new Date().toISOString().split("T")[0] });
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => { setAnimateIn(true); }, []);

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const byCategory = (type) => {
    const cats = {};
    transactions.filter(t => t.type === type).forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  };

  const handleAdd = () => {
    if (!form.amount || !form.desc) return;
    const newT = { ...form, amount: Number(form.amount), id: Date.now() };
    setTransactions([newT, ...transactions]);
    setForm({ type: "income", category: CATEGORIES.income[0], amount: "", desc: "", date: new Date().toISOString().split("T")[0] });
    setShowForm(false);
  };

  const handleDelete = (id) => setTransactions(transactions.filter(t => t.id !== id));
  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);
  const maxBar = Math.max(...byCategory("income").concat(byCategory("expense")).map(([, v]) => v), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#e8e0d0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        .fade-in { opacity: 0; transform: translateY(16px); animation: fadeUp 0.5s ease forwards; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 12px; padding: 20px; transition: border-color 0.2s; }
        .card:hover { border-color: #3a3a3a; }
        .tab-btn { background: none; border: none; color: #666; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; padding: 8px 14px; border-radius: 6px; transition: all 0.2s; }
        .tab-btn.active { background: #1e1e1e; color: #e8e0d0; }
        .tab-btn:hover { color: #e8e0d0; }
        .pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; font-weight: 500; }
        .pill-income { background: #0d2016; color: #4ade80; border: 1px solid #1a3a22; }
        .pill-expense { background: #200d0d; color: #f87171; border: 1px solid #3a1a1a; }
        input, select { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #e8e0d0; font-family: 'DM Mono', monospace; font-size: 13px; padding: 10px 14px; width: 100%; outline: none; transition: border-color 0.2s; }
        input:focus, select:focus { border-color: #c8b898; }
        select option { background: #1a1a1a; }
        .btn-primary { background: #c8b898; color: #0d0d0d; border: none; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 1px; font-weight: 500; padding: 12px 24px; cursor: pointer; transition: all 0.2s; }
        .btn-primary:hover { background: #e8e0d0; transform: translateY(-1px); }
        .btn-ghost { background: none; color: #666; border: 1px solid #2a2a2a; border-radius: 8px; font-family: 'DM Mono', monospace; font-size: 12px; padding: 12px 24px; cursor: pointer; transition: all 0.2s; }
        .btn-ghost:hover { border-color: #666; color: #e8e0d0; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; }
        .col { flex: 1; min-width: 120px; }
        .bar-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .bar-label { font-size: 11px; color: #888; min-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bar-track { flex: 1; height: 6px; background: #1e1e1e; border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s cubic-bezier(.4,0,.2,1); }
        .bar-val { font-size: 11px; color: #aaa; min-width: 76px; text-align: right; }
        .t-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #1e1e1e; animation: fadeUp 0.3s ease; }
        .t-row:last-child { border-bottom: none; }
        .del-btn { background: none; border: none; color: #333; cursor: pointer; font-size: 16px; padding: 0 4px; transition: color 0.2s; line-height: 1; }
        .del-btn:hover { color: #f87171; }
        .fab { position: fixed; bottom: 28px; right: 24px; width: 52px; height: 52px; background: #c8b898; color: #0d0d0d; border: none; border-radius: 50%; font-size: 24px; cursor: pointer; box-shadow: 0 4px 20px rgba(200,184,152,0.3); transition: all 0.2s; display: flex; align-items: center; justify-content: center; z-index: 100; }
        .fab:hover { transform: scale(1.08); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: flex-end; justify-content: center; z-index: 200; backdrop-filter: blur(4px); animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal { background: #161616; border: 1px solid #2a2a2a; border-radius: 20px 20px 0 0; padding: 28px 24px 40px; width: 100%; max-width: 480px; animation: slideUp 0.3s cubic-bezier(.4,0,.2,1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .type-toggle { display: flex; background: #1a1a1a; border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .type-btn { flex: 1; padding: 10px; border: none; border-radius: 7px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 1px; cursor: pointer; transition: all 0.2s; background: none; color: #666; }
        .type-btn.income-active { background: #0d2016; color: #4ade80; }
        .type-btn.expense-active { background: #200d0d; color: #f87171; }
        .section-title { font-family: 'Unbounded', sans-serif; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 16px; }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "28px 24px 0", maxWidth: 480, margin: "0 auto" }}>
        <div className={animateIn ? "fade-in" : ""}>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 9, letterSpacing: 4, color: "#555", marginBottom: 6 }}>FLUJO DE CAJA</div>
          <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 4 }}>
            {balance >= 0 ? "+" : ""}{formatARS(balance)}
          </div>
          <div style={{ fontSize: 11, color: balance >= 0 ? "#4ade80" : "#f87171", letterSpacing: 1 }}>
            {balance >= 0 ? "▲ balance positivo" : "▼ balance negativo"}
          </div>
        </div>

        <div className={animateIn ? "fade-in" : ""} style={{ display: "flex", gap: 4, marginTop: 24, marginBottom: 24, animationDelay: "0.1s" }}>
          {["dashboard", "gráfico", "movimientos"].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px 100px" }}>

        {activeTab === "dashboard" && (
          <>
            <div className={`row ${animateIn ? "fade-in" : ""}`} style={{ marginBottom: 16, animationDelay: "0.15s" }}>
              <div className="card col">
                <div style={{ fontSize: 10, color: "#4ade80", letterSpacing: 2, marginBottom: 8 }}>▲ INGRESOS</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 700 }}>{formatARS(totalIncome)}</div>
              </div>
              <div className="card col">
                <div style={{ fontSize: 10, color: "#f87171", letterSpacing: 2, marginBottom: 8 }}>▼ GASTOS</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 15, fontWeight: 700 }}>{formatARS(totalExpense)}</div>
              </div>
            </div>

            <div className={`card ${animateIn ? "fade-in" : ""}`} style={{ marginBottom: 12, animationDelay: "0.2s" }}>
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

            <div className={`card ${animateIn ? "fade-in" : ""}`} style={{ animationDelay: "0.25s" }}>
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
          <div className={`card ${animateIn ? "fade-in" : ""}`}>
            <div className="section-title">Balance acumulado</div>
            <BalanceChart transactions={transactions} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid #1e1e1e" }}>
              <div>
                <div style={{ fontSize: 10, color: "#555", marginBottom: 4 }}>PICO MÁX</div>
                <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, color: "#4ade80" }}>
                  {formatARS(Math.max(...(() => {
                    let r = 0;
                    return [...transactions].sort((a,b) => a.date.localeCompare(b.date)).map(t => {
                      r += t.type === "income" ? t.amount : -t.amount; return r;
                    });
                  })(), 0))}
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

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily: "'Unbounded', sans-serif", fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Nuevo movimiento</div>
            <div className="type-toggle">
              <button className={`type-btn ${form.type === "income" ? "income-active" : ""}`} onClick={() => setForm({ ...form, type: "income", category: CATEGORIES.income[0] })}>▲ Ingreso</button>
              <button className={`type-btn ${form.type === "expense" ? "expense-active" : ""}`} onClick={() => setForm({ ...form, type: "expense", category: CATEGORIES.expense[0] })}>▼ Gasto</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES[form.type].map(c => <option key={c}>{c}</option>)}
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
