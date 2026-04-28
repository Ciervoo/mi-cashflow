import { useState, useEffect, useRef } from "react";

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const METODOS = ["Transferencia", "Mercado Pago", "Efectivo"];
const CAT_EGRESO = ["Compu", "Comida", "Joda", "Nafta", "Inversiones", "Ropa", "Otros"];

const DEFAULT_NEGOCIOS = [
  { id: "toscana", nombre: "La Toscana", emoji: "🐟", color: "#4ade80" },
  { id: "figuritas", nombre: "Figuritas Mundial", emoji: "⚽", color: "#fb923c" },
  { id: "sprint", nombre: "Sprint", emoji: "🎨", color: "#60a5fa" },
];

const EMOJIS = ["🐟","⚽","🎨","🍕","👕","💈","🛒","🔧","📦","🏪","💊","🌿","🚗","📱","☕"];
const COLORS = ["#4ade80","#fb923c","#60a5fa","#f87171","#c8b898","#a78bfa","#34d399","#fbbf24","#f472b6"];
const CAT_COLORS = ["#60a5fa","#4ade80","#fb923c","#f87171","#a78bfa","#fbbf24","#f472b6","#34d399","#c8b898"];

// ── MIGRACIÓN DE DATOS ANTERIORES ────────────────────────────
function migrarDatosAnteriores() {
  try {
    const migrated = localStorage.getItem("ng_migrated");
    if (migrated) return;

    // Migrar cf_toscana → ng_mov_toscana
    const oldToscana = localStorage.getItem("cf_toscana");
    if (oldToscana) {
      const txs = JSON.parse(oldToscana);
      const movs = txs.map(t => ({
        id: t.id,
        tipo: t.type === "income" ? "ingreso" : "retiro",
        amount: t.amount,
        desc: t.desc || "",
        metodo: "Transferencia",
        date: t.date,
        categoria: t.type === "expense" ? (CAT_EGRESO.includes(t.category) ? t.category : "Otros") : null,
      }));
      localStorage.setItem("ng_mov_toscana", JSON.stringify(movs));
    }

    // Migrar cf_personal → ng_mov_personal (nuevo negocio)
    const oldPersonal = localStorage.getItem("cf_personal");
    if (oldPersonal) {
      const txs = JSON.parse(oldPersonal);
      const movs = txs.map(t => ({
        id: t.id,
        tipo: t.type === "income" ? "ingreso" : "retiro",
        amount: t.amount,
        desc: t.desc || "",
        metodo: "Transferencia",
        date: t.date,
        categoria: t.type === "expense" ? (CAT_EGRESO.includes(t.category) ? t.category : "Otros") : null,
      }));
      // Guardar como negocio "personal" y agregarlo a la lista
      localStorage.setItem("ng_mov_personal", JSON.stringify(movs));
      // Agregar perfil personal a los negocios si no existe
      const negociosRaw = localStorage.getItem("ng_negocios");
      const negocios = negociosRaw ? JSON.parse(negociosRaw) : DEFAULT_NEGOCIOS;
      if (!negocios.find(n => n.id === "personal")) {
        negocios.unshift({ id: "personal", nombre: "Personal", emoji: "👤", color: "#c8b898" });
        localStorage.setItem("ng_negocios", JSON.stringify(negocios));
      }
    }

    localStorage.setItem("ng_migrated", "1");
  } catch (e) { console.log("Migration error:", e); }
}

function loadNegocios() {
  try { const s = localStorage.getItem("ng_negocios"); return s ? JSON.parse(s) : DEFAULT_NEGOCIOS; }
  catch { return DEFAULT_NEGOCIOS; }
}
function saveNegocios(n) { try { localStorage.setItem("ng_negocios", JSON.stringify(n)); } catch {} }
function loadMovimientos(id) {
  try { const s = localStorage.getItem(`ng_mov_${id}`); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveMovimientos(id, movs) { try { localStorage.setItem(`ng_mov_${id}`, JSON.stringify(movs)); } catch {} }

// ── MINI CHART ───────────────────────────────────────────────
function MiniChart({ movimientos, color }) {
  const sorted = [...movimientos].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) return null;
  const points = []; let running = 0;
  sorted.forEach(m => { running += m.tipo === "ingreso" ? m.amount : -m.amount; points.push(running); });
  const W = 80, H = 32;
  const min = Math.min(...points, 0), max = Math.max(...points, 1), range = max - min || 1;
  const toX = (i) => (i / (points.length - 1)) * W;
  const toY = (v) => H - ((v - min) / range) * H;
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:80, height:32, overflow:"visible" }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

// ── COSTOS CHART (barras horizontales) ───────────────────────
function CostosChart({ movimientos, color }) {
  const retiros = movimientos.filter(m => m.tipo === "retiro");
  if (retiros.length === 0) return <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:"16px 0" }}>Sin egresos aún</div>;

  const byCat = {};
  retiros.forEach(m => {
    const cat = m.categoria || "Otros";
    byCat[cat] = (byCat[cat] || 0) + m.amount;
  });
  const sorted = Object.entries(byCat).sort((a,b) => b[1]-a[1]);
  const total = sorted.reduce((s,[,v]) => s+v, 0);
  const max = sorted[0]?.[1] || 1;

  return (
    <div>
      {/* Barra apilada */}
      <div style={{ display:"flex", height:10, borderRadius:5, overflow:"hidden", marginBottom:16 }}>
        {sorted.map(([cat, val], i) => (
          <div key={cat} style={{ width:`${(val/total)*100}%`, background:CAT_COLORS[i % CAT_COLORS.length] }} title={cat} />
        ))}
      </div>

      {/* Barras por categoría */}
      {sorted.map(([cat, val], i) => (
        <div key={cat} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:CAT_COLORS[i % CAT_COLORS.length], flexShrink:0 }} />
          <div style={{ fontSize:11, color:"#888", minWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat}</div>
          <div style={{ flex:1, height:6, background:"#1e1e1e", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${(val/max)*100}%`, background:CAT_COLORS[i % CAT_COLORS.length], borderRadius:3, transition:"width 0.8s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <div style={{ fontSize:11, color:"#aaa", minWidth:76, textAlign:"right" }}>{formatARS(val)}</div>
          <div style={{ fontSize:10, color:"#555", minWidth:32, textAlign:"right" }}>{Math.round((val/total)*100)}%</div>
        </div>
      ))}
    </div>
  );
}

// ── NEGOCIO DETAIL ───────────────────────────────────────────
function NegocioDetail({ negocio, onBack, onDelete }) {
  const [movimientos, setMovimientos] = useState(() => loadMovimientos(negocio.id));
  const [showForm, setShowForm] = useState(false);
  const [tipo, setTipo] = useState("ingreso");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");
  const [categoria, setCategoria] = useState(CAT_EGRESO[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [tab, setTab] = useState("movimientos");
  const importRef = useRef(null);
  const [importMsg, setImportMsg] = useState(null);

  useEffect(() => { saveMovimientos(negocio.id, movimientos); }, [movimientos, negocio.id]);

  const saldo = movimientos.reduce((s, m) => s + (m.tipo === "ingreso" ? m.amount : -m.amount), 0);
  const totalIngresos = movimientos.filter(m => m.tipo === "ingreso").reduce((s, m) => s + m.amount, 0);
  const totalRetiros = movimientos.filter(m => m.tipo === "retiro").reduce((s, m) => s + m.amount, 0);

  const handleAdd = () => {
    if (!amount) return;
    const nuevo = {
      id: Date.now(), tipo, amount: Number(amount),
      desc: desc || (tipo === "ingreso" ? "Ingreso" : "Retiro"),
      metodo, date,
      categoria: tipo === "retiro" ? categoria : null,
    };
    setMovimientos(prev => [nuevo, ...prev]);
    setAmount(""); setDesc(""); setShowForm(false);
  };

  const handleDelete = (id) => setMovimientos(prev => prev.filter(m => m.id !== id));

  const exportCSV = () => {
    const rows = [["Fecha","Tipo","Monto","Método","Categoría","Descripción"]];
    [...movimientos].sort((a,b) => b.date.localeCompare(a.date)).forEach(m => {
      rows.push([m.date, m.tipo, m.amount, m.metodo, m.categoria||"", `"${m.desc}"`]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`${negocio.nombre}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = ev.target.result.split("\n").filter(l => l.trim());
        const imported = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < 3) continue;
          const date = cols[0].trim(), tipo = cols[1].trim(), amount = Number(cols[2].trim());
          const metodo = cols[3]?.trim() || "Transferencia";
          const categoria = cols[4]?.trim() || null;
          const desc = (cols[5]?.trim() || "").replace(/^"|"$/g, "");
          if (!date || isNaN(amount)) continue;
          imported.push({ id: Date.now()+i, date, tipo, amount, metodo, categoria, desc });
        }
        if (imported.length === 0) { setImportMsg("Sin datos válidos"); return; }
        setMovimientos(imported);
        setImportMsg(`✓ ${imported.length} movimientos importados`);
        setTimeout(() => setImportMsg(null), 3000);
      } catch { setImportMsg("Error al leer el archivo"); setTimeout(() => setImportMsg(null), 3000); }
    };
    reader.readAsText(file); e.target.value = "";
  };

  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const byMonth = {};
  movimientos.forEach(m => {
    const mo = m.date.slice(0,7);
    if (!byMonth[mo]) byMonth[mo] = { ingreso:0, retiro:0 };
    byMonth[mo][m.tipo] += m.amount;
  });

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'DM Mono',monospace", color:"#e8e0d0" }}>
      <input ref={importRef} type="file" accept=".csv" onChange={importCSV} style={{ display:"none" }} />
      {importMsg && <div className="toast">{importMsg}</div>}

      <div style={{ padding:"28px 24px 0", maxWidth:480, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:"#555", cursor:"pointer", fontFamily:"'DM Mono',monospace", fontSize:12 }}>← volver</button>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={exportCSV} className="switch-btn">↓ CSV</button>
            <button onClick={() => importRef.current?.click()} className="switch-btn">↑ CSV</button>
            <button onClick={() => { if(window.confirm(`¿Eliminar ${negocio.nombre}?`)) onDelete(negocio.id); }} className="switch-btn" style={{ color:"#f87171" }}>✕</button>
          </div>
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:28, marginBottom:8 }}>{negocio.emoji}</div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:18, fontWeight:900, marginBottom:6 }}>{negocio.nombre}</div>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:26, fontWeight:900, color: saldo>=0 ? negocio.color : "#f87171", letterSpacing:-1 }}>
            {saldo>=0?"+":""}{formatARS(saldo)}
          </div>
        </div>

        <div style={{ display:"flex", gap:12, marginBottom:20 }}>
          <div className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:9, color:"#4ade80", letterSpacing:2, marginBottom:6 }}>▲ INGRESOS</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700 }}>{formatARS(totalIngresos)}</div>
          </div>
          <div className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:9, color:"#f87171", letterSpacing:2, marginBottom:6 }}>▼ RETIROS</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700 }}>{formatARS(totalRetiros)}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:4, marginBottom:20, overflowX:"auto" }}>
          {["movimientos","costos","por mes"].map(t => (
            <button key={t} className={`tab-btn ${tab===t?"active":""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 24px 120px" }}>

        {tab==="movimientos" && (
          <div className="card">
            {movimientos.length===0 && <div style={{ color:"#555", fontSize:12, textAlign:"center", padding:20 }}>Sin movimientos aún</div>}
            {[...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).map(m => (
              <div key={m.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:"1px solid #1e1e1e" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:m.tipo==="ingreso"?negocio.color:"#f87171", flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, marginBottom:3 }}>{m.desc}</div>
                  <div style={{ display:"flex", gap:8, fontSize:10, color:"#555", flexWrap:"wrap" }}>
                    <span>{m.date}</span>
                    <span>· {m.metodo}</span>
                    {m.categoria && <span style={{ color:"#888" }}>· {m.categoria}</span>}
                  </div>
                </div>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, color:m.tipo==="ingreso"?negocio.color:"#f87171" }}>
                  {m.tipo==="ingreso"?"+":"-"}{formatARS(m.amount)}
                </div>
                <button className="del-btn" onClick={() => handleDelete(m.id)}>×</button>
              </div>
            ))}
          </div>
        )}

        {tab==="costos" && (
          <div className="card">
            <div className="section-title">En qué se va la plata</div>
            <CostosChart movimientos={movimientos} color={negocio.color} />
          </div>
        )}

        {tab==="por mes" && (
          <div className="card">
            <div className="section-title">Resumen mensual</div>
            {Object.keys(byMonth).length===0 && <div style={{ color:"#555", fontSize:12 }}>Sin datos aún</div>}
            {Object.entries(byMonth).sort().reverse().map(([m, data]) => {
              const [y, mo] = m.split("-");
              const bal = data.ingreso - data.retiro;
              const maxV = Math.max(data.ingreso, data.retiro, 1);
              return (
                <div key={m} style={{ marginBottom:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:11, fontWeight:700 }}>{months[parseInt(mo)-1]} {y}</div>
                    <div style={{ fontSize:12, color:bal>=0?negocio.color:"#f87171", fontWeight:500 }}>{bal>=0?"+":""}{formatARS(bal)}</div>
                  </div>
                  {[["ingreso",data.ingreso,negocio.color,"#1a5c30"],["retiro",data.retiro,"#f87171","#5c1a1a"]].map(([label,val,color,from])=>(
                    <div key={label} style={{ marginBottom:6 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#555", marginBottom:3 }}>
                        <span style={{ textTransform:"capitalize" }}>{label}s</span><span>{formatARS(val)}</span>
                      </div>
                      <div className="bar-track" style={{ height:6 }}>
                        <div className="bar-fill" style={{ width:`${(val/maxV)*100}%`, background:`linear-gradient(90deg,${from},${color})` }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fab-wrap">
        <button className="fab" onClick={() => setShowForm(true)}>+</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:20 }}>Nuevo movimiento</div>
            <div className="type-toggle">
              <button className={`type-btn ${tipo==="ingreso"?"income-active":""}`} onClick={()=>setTipo("ingreso")}>▲ Ingreso</button>
              <button className={`type-btn ${tipo==="retiro"?"expense-active":""}`} onClick={()=>setTipo("retiro")}>▼ Retiro</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input type="number" placeholder="Monto en ARS" value={amount} onChange={e=>setAmount(e.target.value)} />
              <input type="text" placeholder="Descripción (opcional)" value={desc} onChange={e=>setDesc(e.target.value)} />
              <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                {METODOS.map(m=><option key={m}>{m}</option>)}
              </select>
              {tipo==="retiro" && (
                <select value={categoria} onChange={e=>setCategoria(e.target.value)}>
                  {CAT_EGRESO.map(c=><option key={c}>{c}</option>)}
                </select>
              )}
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} />
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowForm(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleAdd} style={{ flex:2 }}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function App() {
  const [negocios, setNegocios] = useState(() => {
    migrarDatosAnteriores();
    return loadNegocios();
  });
  const [selected, setSelected] = useState(null);
  const [showAddNegocio, setShowAddNegocio] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏪");
  const [newColor, setNewColor] = useState("#4ade80");
  const [allMovs, setAllMovs] = useState({});

  useEffect(() => { saveNegocios(negocios); }, [negocios]);

  useEffect(() => {
    const all = {};
    negocios.forEach(n => { all[n.id] = loadMovimientos(n.id); });
    setAllMovs(all);
  }, [negocios, selected]);

  const getSaldo = (id) => {
    const movs = allMovs[id] || [];
    return movs.reduce((s, m) => s + (m.tipo==="ingreso" ? m.amount : -m.amount), 0);
  };

  const totalGeneral = negocios.reduce((s, n) => s + getSaldo(n.id), 0);
  const totalIngresos = negocios.reduce((s, n) => s + (allMovs[n.id]||[]).filter(m=>m.tipo==="ingreso").reduce((a,m)=>a+m.amount,0), 0);
  const totalRetiros = negocios.reduce((s, n) => s + (allMovs[n.id]||[]).filter(m=>m.tipo==="retiro").reduce((a,m)=>a+m.amount,0), 0);

  const handleAddNegocio = () => {
    if (!newNombre.trim()) return;
    const nuevo = { id:`negocio_${Date.now()}`, nombre:newNombre.trim(), emoji:newEmoji, color:newColor };
    setNegocios(prev => [...prev, nuevo]);
    setNewNombre(""); setShowAddNegocio(false);
  };

  const handleDeleteNegocio = (id) => {
    setNegocios(prev => prev.filter(n => n.id !== id));
    localStorage.removeItem(`ng_mov_${id}`);
    setSelected(null);
  };

  if (selected) {
    const negocio = negocios.find(n => n.id === selected);
    if (!negocio) { setSelected(null); return null; }
    return <NegocioDetail negocio={negocio} onBack={() => setSelected(null)} onDelete={handleDeleteNegocio} />;
  }

  return (
    <div style={{ minHeight:"100vh", background:"#0d0d0d", fontFamily:"'DM Mono',monospace", color:"#e8e0d0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        html{background-color:#0d0d0d!important;}
        body{background-color:#0d0d0d!important;overscroll-behavior-y:none;margin:0;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        .card{background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:20px;transition:border-color 0.2s;}
        .tab-btn{background:none;border:none;color:#666;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:8px 12px;border-radius:6px;transition:all 0.2s;}
        .tab-btn.active{background:#1e1e1e;color:#e8e0d0;}
        input,select{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#e8e0d0;font-family:'DM Mono',monospace;font-size:13px;padding:10px 14px;width:100%;outline:none;transition:border-color 0.2s;-webkit-appearance:none;}
        input:focus,select:focus{border-color:#c8b898;}
        select option{background:#1a1a1a;}
        .btn-primary{background:#c8b898;color:#0d0d0d;border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px;font-weight:500;padding:12px 24px;cursor:pointer;}
        .btn-ghost{background:none;color:#666;border:1px solid #2a2a2a;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;padding:12px 24px;cursor:pointer;}
        .btn-ghost:hover{border-color:#666;color:#e8e0d0;}
        .bar-track{flex:1;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden;}
        .bar-fill{height:100%;border-radius:3px;transition:width 0.8s cubic-bezier(.4,0,.2,1);}
        .del-btn{background:none;border:none;color:#333;cursor:pointer;font-size:18px;padding:0 6px;transition:color 0.2s;line-height:1;}
        .del-btn:hover{color:#f87171;}
        .fab-wrap{position:fixed;bottom:28px;right:24px;z-index:100;}
        .fab{width:52px;height:52px;background:#c8b898;color:#0d0d0d;border:none;border-radius:50%;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(200,184,152,0.3);display:flex;align-items:center;justify-content:center;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:flex-end;justify-content:center;z-index:200;backdrop-filter:blur(4px);}
        .modal{background:#161616;border:1px solid #2a2a2a;border-radius:20px 20px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:slideUp 0.3s cubic-bezier(.4,0,.2,1);}
        .type-toggle{display:flex;background:#1a1a1a;border-radius:10px;padding:4px;margin-bottom:16px;}
        .type-btn{flex:1;padding:10px;border:none;border-radius:7px;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;transition:all 0.2s;background:none;color:#666;}
        .type-btn.income-active{background:#0d2016;color:#4ade80;}
        .type-btn.expense-active{background:#200d0d;color:#f87171;}
        .section-title{font-family:'Unbounded',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#555;margin-bottom:16px;}
        .switch-btn{background:none;border:1px solid #2a2a2a;border-radius:6px;color:#555;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;padding:4px 10px;cursor:pointer;transition:all 0.2s;}
        .switch-btn:hover{border-color:#555;color:#e8e0d0;}
        .negocio-card{background:#161616;border:1px solid #2a2a2a;border-radius:14px;padding:20px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:16px;}
        .negocio-card:hover{border-color:#3a3a3a;transform:translateY(-1px);}
        .negocio-card:active{transform:scale(0.98);}
        .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:12px 20px;font-size:12px;color:#4ade80;z-index:999;}
        .emoji-pick{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
        .emoji-pick button{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px;font-size:18px;cursor:pointer;transition:all 0.15s;}
        .emoji-pick button.sel{border-color:#c8b898;background:#2a2a2a;}
        .color-pick{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
        .color-pick button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:all 0.15s;}
        .color-pick button.sel{border-color:#fff;transform:scale(1.15);}
      `}</style>

      <div style={{ padding:"36px 24px 0", maxWidth:480, margin:"0 auto" }}>
        <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:9, letterSpacing:4, color:"#555", marginBottom:12 }}>MIS NEGOCIOS</div>

        <div style={{ marginBottom:8 }}>
          <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:26, fontWeight:900, letterSpacing:-1, color:totalGeneral>=0?"#e8e0d0":"#f87171" }}>
            {totalGeneral>=0?"+":""}{formatARS(totalGeneral)}
          </div>
          <div style={{ fontSize:11, color:"#555", marginTop:4 }}>saldo total acumulado</div>
        </div>

        <div style={{ display:"flex", gap:12, marginTop:16, marginBottom:32 }}>
          <div className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:9, color:"#4ade80", letterSpacing:2, marginBottom:6 }}>▲ INGRESADO</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:12, fontWeight:700 }}>{formatARS(totalIngresos)}</div>
          </div>
          <div className="card" style={{ flex:1, padding:14 }}>
            <div style={{ fontSize:9, color:"#f87171", letterSpacing:2, marginBottom:6 }}>▼ RETIRADO</div>
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:12, fontWeight:700 }}>{formatARS(totalRetiros)}</div>
          </div>
        </div>

        <div className="section-title">Changas</div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"0 24px 120px", display:"flex", flexDirection:"column", gap:12 }}>
        {negocios.map(n => {
          const saldo = getSaldo(n.id);
          const movs = allMovs[n.id] || [];
          return (
            <div key={n.id} className="negocio-card" onClick={() => setSelected(n.id)}>
              <div style={{ fontSize:28, lineHeight:1 }}>{n.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:4 }}>{n.nombre}</div>
                <div style={{ fontSize:10, color:"#555" }}>{movs.length} movimientos</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:15, fontWeight:900, color:saldo>=0?n.color:"#f87171" }}>
                  {saldo>=0?"+":""}{formatARS(saldo)}
                </div>
                <MiniChart movimientos={movs} color={n.color} />
              </div>
              <div style={{ color:"#333", fontSize:16 }}>›</div>
            </div>
          );
        })}

        <button onClick={() => setShowAddNegocio(true)} style={{
          background:"#161616", border:"1px dashed #2a2a2a", borderRadius:14,
          padding:"18px 20px", cursor:"pointer", color:"#555",
          fontFamily:"'DM Mono',monospace", fontSize:12, textAlign:"left",
          transition:"all 0.2s", width:"100%"
        }}
          onMouseEnter={e=>e.currentTarget.style.borderColor="#555"}
          onMouseLeave={e=>e.currentTarget.style.borderColor="#2a2a2a"}
        >+ agregar negocio</button>
      </div>

      {showAddNegocio && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddNegocio(false)}>
          <div className="modal">
            <div style={{ fontFamily:"'Unbounded',sans-serif", fontSize:13, fontWeight:700, marginBottom:20 }}>Nuevo negocio</div>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <input type="text" placeholder="Nombre del negocio" value={newNombre} onChange={e=>setNewNombre(e.target.value)} />
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>Emoji</div>
                <div className="emoji-pick">
                  {EMOJIS.map(em=>(
                    <button key={em} className={newEmoji===em?"sel":""} onClick={()=>setNewEmoji(em)}>{em}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>Color</div>
                <div className="color-pick">
                  {COLORS.map(c=>(
                    <button key={c} className={newColor===c?"sel":""} onClick={()=>setNewColor(c)} style={{ background:c }} />
                  ))}
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button className="btn-ghost" onClick={()=>setShowAddNegocio(false)} style={{ flex:1 }}>Cancelar</button>
                <button className="btn-primary" onClick={handleAddNegocio} style={{ flex:2 }}>Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
