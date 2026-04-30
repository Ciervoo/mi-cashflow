import { useState, useEffect, useRef } from "react";

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(n);

const METODOS = ["Transferencia","Mercado Pago","Efectivo"];
const CAT_EGRESO = ["Costo","Comisiones","Compu","Comida","Joda","Nafta","Inversiones","Ropa","Otros"];
const CAT_INGRESO = ["Ventas","Bonos","Descuentos","Propinas","Otros"];
const MONTHS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const EMOJIS = ["🐟","⚽","🎨","🍕","👕","💈","🛒","🔧","📦","🏪","🚗","📱","☕","🌿","💊"];
const COLORS = ["#4ade80","#fb923c","#60a5fa","#f87171","#c8b898","#a78bfa","#34d399","#fbbf24","#f472b6"];
const CAT_COLORS = ["#60a5fa","#4ade80","#fb923c","#f87171","#a78bfa","#fbbf24","#f472b6","#34d399","#c8b898"];

const DEFAULT_NEGOCIOS = [
  { id:"toscana",   nombre:"La Toscana",       emoji:"🐟", color:"#4ade80" },
  { id:"figuritas", nombre:"Figuritas Mundial", emoji:"⚽", color:"#fb923c" },
  { id:"sprint",    nombre:"Sprint",            emoji:"🎨", color:"#60a5fa" },
];

// ── STORAGE ──────────────────────────────────────────────────
function migrar() {
  if (localStorage.getItem("ng_migrated")) return;
  ["toscana","personal"].forEach(key => {
    const raw = localStorage.getItem(`cf_${key}`);
    if (!raw) return;
    try {
      const txs = JSON.parse(raw);
      const movs = txs.map(t => ({
        id:t.id, tipo:t.type==="income"?"ingreso":"retiro",
        amount:t.amount, desc:t.desc||"", nota:"", metodo:"Transferencia", date:t.date,
        categoria:t.type==="expense"?(CAT_EGRESO.includes(t.category)?t.category:"Otros"):null,
      }));
      localStorage.setItem(`ng_mov_${key}`, JSON.stringify(movs));
      if (key==="personal") {
        const neg = loadNegocios();
        if (!neg.find(n=>n.id==="personal")) {
          neg.unshift({ id:"personal", nombre:"Personal", emoji:"👤", color:"#c8b898" });
          localStorage.setItem("ng_negocios", JSON.stringify(neg));
        }
      }
    } catch {}
  });
  localStorage.setItem("ng_migrated","1");
}
function loadNegocios() {
  try { const s=localStorage.getItem("ng_negocios"); return s?JSON.parse(s):DEFAULT_NEGOCIOS; } catch { return DEFAULT_NEGOCIOS; }
}
function saveNegocios(n) { try { localStorage.setItem("ng_negocios",JSON.stringify(n)); } catch {} }
function loadMovs(id) {
  try { const s=localStorage.getItem(`ng_mov_${id}`); return s?JSON.parse(s):[]; } catch { return []; }
}
function saveMovs(id,m) { try { localStorage.setItem(`ng_mov_${id}`,JSON.stringify(m)); } catch {} }
function loadCobros(id) {
  try { const s=localStorage.getItem(`ng_cobros_${id}`); return s?JSON.parse(s):[]; } catch { return []; }
}
function saveCobros(id,c) { try { localStorage.setItem(`ng_cobros_${id}`,JSON.stringify(c)); } catch {} }

// ── CHARTS ───────────────────────────────────────────────────
function BalanceChart({ movimientos, color }) {
  const sorted=[...movimientos].sort((a,b)=>a.date.localeCompare(b.date));
  if (sorted.length<2) return <div style={{textAlign:"center",color:"#555",fontSize:11,padding:"12px 0"}}>Agregá más movimientos para ver el gráfico</div>;
  const points=[]; let r=0;
  sorted.forEach(m=>{ r+=m.tipo==="ingreso"?m.amount:-m.amount; points.push({date:m.date,v:r}); });
  const W=320,H=100,pad={t:8,r:8,b:20,l:8};
  const iW=W-pad.l-pad.r,iH=H-pad.t-pad.b;
  const vals=points.map(p=>p.v);
  const minV=Math.min(...vals,0),maxV=Math.max(...vals,1),range=maxV-minV||1;
  const toX=i=>pad.l+(i/Math.max(points.length-1,1))*iW;
  const toY=v=>pad.t+iH-((v-minV)/range)*iH;
  const pathD=points.map((p,i)=>`${i===0?"M":"L"} ${toX(i)} ${toY(p.v)}`).join(" ");
  const areaD=`${pathD} L ${toX(points.length-1)} ${H-pad.b} L ${toX(0)} ${H-pad.b} Z`;
  const last=points[points.length-1].v;
  const lc=last>=0?color:"#f87171";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",overflow:"visible"}}>
      {minV<0&&maxV>0&&<line x1={pad.l} y1={toY(0)} x2={W-pad.r} y2={toY(0)} stroke="#ffffff18" strokeWidth="1" strokeDasharray="4 3"/>}
      <path d={areaD} fill={last>=0?`${color}18`:"rgba(248,113,113,0.08)"}/>
      <path d={pathD} fill="none" stroke={lc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p,i)=><circle key={i} cx={toX(i)} cy={toY(p.v)} r="2.5" fill={p.v>=0?lc:"#f87171"} stroke="#161616" strokeWidth="1.5"/>)}
      <text x={toX(0)} y={H-2} fill="#ffffff44" fontSize="8" textAnchor="middle">{points[0].date.slice(5)}</text>
      {points.length>1&&<text x={toX(points.length-1)} y={H-2} fill="#ffffff44" fontSize="8" textAnchor="middle">{points[points.length-1].date.slice(5)}</text>}
    </svg>
  );
}

function MiniChart({ movimientos, color }) {
  const sorted=[...movimientos].sort((a,b)=>a.date.localeCompare(b.date));
  if (sorted.length<2) return null;
  const points=[]; let r=0;
  sorted.forEach(m=>{r+=m.tipo==="ingreso"?m.amount:-m.amount;points.push(r);});
  const W=72,H=28,min=Math.min(...points,0),max=Math.max(...points,1),range=max-min||1;
  const toX=i=>(i/Math.max(points.length-1,1))*W;
  const toY=v=>H-((v-min)/range)*H;
  const path=points.map((v,i)=>`${i===0?"M":"L"} ${toX(i)} ${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:72,height:28,overflow:"visible"}}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
    </svg>
  );
}

function CostosChart({ movimientos }) {
  const retiros=movimientos.filter(m=>m.tipo==="retiro");
  if (retiros.length===0) return <div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin egresos aún</div>;
  const byCat={};
  retiros.forEach(m=>{const c=m.categoria||"Otros";byCat[c]=(byCat[c]||0)+m.amount;});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0),max=sorted[0]?.[1]||1;
  return (
    <div>
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:20,gap:1}}>
        {sorted.map(([cat,val],i)=><div key={cat} style={{width:`${(val/total)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>)}
      </div>
      {sorted.map(([cat,val],i)=>(
        <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
          <div style={{fontSize:12,color:"#aaa",minWidth:90}}>{cat}</div>
          <div style={{flex:1,height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(val/max)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:3}}/>
          </div>
          <div style={{fontSize:11,color:"#888",minWidth:70,textAlign:"right"}}>{formatARS(val)}</div>
          <div style={{fontSize:10,color:"#555",minWidth:28,textAlign:"right"}}>{Math.round((val/total)*100)}%</div>
        </div>
      ))}
    </div>
  );
}

// ── FILTER HELPER ────────────────────────────────────────────
function filterByRange(movs, range) {
  if (range==="todo") return movs;
  const now=new Date();
  const from=new Date();
  if (range==="semana") from.setDate(now.getDate()-7);
  else if (range==="mes") from.setMonth(now.getMonth()-1);
  else if (range==="3meses") from.setMonth(now.getMonth()-3);
  const fromStr=from.toISOString().split("T")[0];
  return movs.filter(m=>m.date>=fromStr);
}

// ── CSS GLOBAL ───────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;}
  html{background-color:#0d0d0d!important;}
  body{background-color:#0d0d0d!important;overscroll-behavior-y:none;margin:0;}
  @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
  input,select,textarea{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#e8e0d0;font-family:'DM Mono',monospace;font-size:13px;padding:10px 14px;width:100%;outline:none;transition:border-color 0.2s;-webkit-appearance:none;resize:none;}
  input:focus,select:focus,textarea:focus{border-color:#c8b898;}
  select option{background:#1a1a1a;}
  .btn-primary{background:#c8b898;color:#0d0d0d;border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px;font-weight:500;padding:12px 24px;cursor:pointer;}
  .btn-ghost{background:none;color:#666;border:1px solid #2a2a2a;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;padding:12px 24px;cursor:pointer;}
  .del-btn{background:none;border:none;color:#444;cursor:pointer;font-size:20px;padding:4px 8px;transition:color 0.2s;line-height:1;}
  .del-btn:hover{color:#f87171;}
  .edit-btn{background:none;border:1px solid #2a2a2a;border-radius:6px;color:#888;cursor:pointer;font-size:14px;padding:5px 10px;transition:all 0.2s;line-height:1;font-family:monospace;}
  .edit-btn:hover{border-color:#888;color:#e8e0d0;}
  .fab-wrap{position:fixed;bottom:28px;right:24px;z-index:100;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}
  .fab{width:52px;height:52px;color:#0d0d0d;border:none;border-radius:50%;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;}
  .fab-sm{width:42px;height:42px;background:#1e1e1e;border:1px solid #3a3a3a;color:#c8b898;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(0,0,0,0.4);}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.85);display:flex;align-items:flex-end;justify-content:center;z-index:200;backdrop-filter:blur(4px);}
  .modal{background:#161616;border:1px solid #2a2a2a;border-radius:20px 20px 0 0;padding:28px 24px 48px;width:100%;max-width:480px;animation:slideUp 0.3s cubic-bezier(.4,0,.2,1);}
  .type-toggle{display:flex;background:#1a1a1a;border-radius:10px;padding:4px;margin-bottom:16px;}
  .type-btn{flex:1;padding:10px;border:none;border-radius:7px;font-family:'DM Mono',monospace;font-size:12px;cursor:pointer;transition:all 0.2s;background:none;color:#666;}
  .type-btn.income-active{background:#0d2016;color:#4ade80;}
  .type-btn.expense-active{background:#200d0d;color:#f87171;}
  .switch-btn{background:none;border:1px solid #2a2a2a;border-radius:6px;color:#555;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;padding:4px 10px;cursor:pointer;}
  .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:12px 20px;font-size:12px;color:#4ade80;z-index:999;}
  .chip{padding:6px 14px;border-radius:20px;border:1px solid #2a2a2a;cursor:pointer;font-family:'DM Mono',monospace;font-size:11px;transition:all 0.15s;background:#1a1a1a;color:#666;white-space:nowrap;}
  .chip.active{background:#1e1e1e;border-color:#c8b898;color:#c8b898;}
  .range-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
  .range-scroll::-webkit-scrollbar{display:none;}
  .negocio-card{background:#161616;border-radius:14px;padding:18px 20px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:14px;}
  .negocio-card:active{transform:scale(0.97);}
  .emoji-pick{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
  .emoji-pick button{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px;font-size:18px;cursor:pointer;}
  .emoji-pick button.sel{border-color:#c8b898;background:#2a2a2a;}
  .color-pick{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
  .color-pick button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;}
  .color-pick button.sel{border-color:#fff;transform:scale(1.15);}
  .main-tab{background:none;border:none;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:10px 16px;border-radius:8px;transition:all 0.2s;}
  .card-dark{background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:20px;}
`;

// ── NEGOCIO DETAIL ───────────────────────────────────────────
function NegocioDetail({ negocio, onBack, onDelete }) {
  const [movimientos, setMovimientos] = useState(()=>loadMovs(negocio.id));
  const [cobros, setCobros] = useState(()=>loadCobros(negocio.id));
  const [showForm, setShowForm] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showCobro, setShowCobro] = useState(false);
  const [editando, setEditando] = useState(null);
  const [tipo, setTipo] = useState("ingreso");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [nota, setNota] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");
  const [categoria, setCategoria] = useState(CAT_EGRESO[0]);
  const [categoriaIngreso, setCategoriaIngreso] = useState(CAT_INGRESO[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickMetodo, setQuickMetodo] = useState("Transferencia");
  const [cobroNombre, setCobroNombre] = useState("");
  const [cobroAmount, setCobroAmount] = useState("");
  const [cobroDate, setCobroDate] = useState(new Date().toISOString().split("T")[0]);
  const [cobroNota, setCobroNota] = useState("");
  const [tab, setTab] = useState("resumen");
  const [range, setRange] = useState("todo");
  const importRef = useRef(null);
  const [msg, setMsg] = useState(null);

  useEffect(()=>{saveMovs(negocio.id,movimientos);},[movimientos,negocio.id]);
  useEffect(()=>{saveCobros(negocio.id,cobros);},[cobros,negocio.id]);

  const movsFiltered = filterByRange(movimientos, range);
  const saldo=movimientos.reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0);
  const totalIngresos=movsFiltered.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.amount,0);
  const totalRetiros=movsFiltered.filter(m=>m.tipo==="retiro").reduce((s,m)=>s+m.amount,0);
  const pendCobros=cobros.filter(c=>!c.cobrado);
  const totalPendCobros=pendCobros.reduce((s,c)=>s+c.amount,0);

  const openAdd=()=>{
    setEditando(null); setTipo("ingreso"); setAmount(""); setDesc(""); setNota("");
    setMetodo("Transferencia"); setCategoria(CAT_EGRESO[0]); setCategoriaIngreso(CAT_INGRESO[0]);
    setDate(new Date().toISOString().split("T")[0]); setShowForm(true);
  };
  const openEdit=(m)=>{
    setEditando(m.id); setTipo(m.tipo); setAmount(String(m.amount));
    setDesc(m.desc); setNota(m.nota||""); setMetodo(m.metodo||"Transferencia");
    setCategoria(m.categoria||CAT_EGRESO[0]);
    setCategoriaIngreso(m.categoriaIngreso||CAT_INGRESO[0]);
    setDate(m.date); setShowForm(true);
  };
  const handleSave=()=>{
    if (!amount) return;
    const mov={id:editando||Date.now(),tipo,amount:Number(amount),
      desc:desc||(tipo==="ingreso"?"Ingreso":"Egreso"),nota,metodo,date,
      categoria:tipo==="retiro"?categoria:null,
      categoriaIngreso:tipo==="ingreso"?categoriaIngreso:null};
    if (editando) setMovimientos(prev=>prev.map(m=>m.id===editando?mov:m));
    else setMovimientos(prev=>[mov,...prev]);
    setShowForm(false);
  };
  const handleQuick=()=>{
    if (!quickAmount) return;
    setMovimientos(prev=>[{id:Date.now(),tipo:"ingreso",amount:Number(quickAmount),
      desc:"Ingreso rápido",nota:"",metodo:quickMetodo,
      date:new Date().toISOString().split("T")[0],categoria:null},...prev]);
    setQuickAmount(""); setShowQuick(false);
    setMsg("✓ Ingreso registrado"); setTimeout(()=>setMsg(null),2000);
  };
  const handleAddCobro=()=>{
    if (!cobroNombre||!cobroAmount) return;
    setCobros(prev=>[{id:Date.now(),nombre:cobroNombre,amount:Number(cobroAmount),
      fecha:cobroDate,nota:cobroNota,cobrado:false,cobradoDate:null},...prev]);
    setCobroNombre(""); setCobroAmount(""); setCobroNota("");
    setCobroDate(new Date().toISOString().split("T")[0]); setShowCobro(false);
  };
  const toggleCobro=(id)=>{
    setCobros(prev=>prev.map(c=>c.id===id?{...c,cobrado:!c.cobrado,
      cobradoDate:!c.cobrado?new Date().toISOString().split("T")[0]:null}:c));
  };
  const deleteCobro=(id)=>setCobros(prev=>prev.filter(c=>c.id!==id));
  const handleDelete=(id)=>setMovimientos(prev=>prev.filter(m=>m.id!==id));

  const exportCSV=()=>{
    const rows=[["Fecha","Tipo","Monto","Método","Categoría","Descripción","Nota"]];
    [...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).forEach(m=>{
      rows.push([m.date,m.tipo,m.amount,m.metodo,m.categoria||"",`"${m.desc}"`,`"${m.nota||""}"`]);
    });
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${negocio.nombre}.csv`;a.click();
    URL.revokeObjectURL(url);
  };
  const importCSV=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try {
        const lines=ev.target.result.split("\n").filter(l=>l.trim());
        const imported=[];
        for(let i=1;i<lines.length;i++){
          const cols=lines[i].split(",");if(cols.length<3)continue;
          const date=cols[0].trim(),tipo=cols[1].trim(),amount=Number(cols[2].trim());
          const metodo=cols[3]?.trim()||"Transferencia",categoria=cols[4]?.trim()||null;
          const desc=(cols[5]?.trim()||"").replace(/^"|"$/g,"");
          const nota=(cols[6]?.trim()||"").replace(/^"|"$/g,"");
          if(!date||isNaN(amount))continue;
          imported.push({id:Date.now()+i,date,tipo,amount,metodo,categoria,desc,nota});
        }
        if(imported.length===0){setMsg("Sin datos válidos");return;}
        setMovimientos(imported);
        setMsg(`✓ ${imported.length} importados`);setTimeout(()=>setMsg(null),3000);
      } catch {setMsg("Error al leer");setTimeout(()=>setMsg(null),3000);}
    };
    reader.readAsText(file);e.target.value="";
  };

  const byMonth={};
  movimientos.forEach(m=>{
    const mo=m.date.slice(0,7);
    if(!byMonth[mo])byMonth[mo]={ingreso:0,retiro:0};
    byMonth[mo][m.tipo]+=m.amount;
  });

  const c=negocio.color;
  const TABS=["resumen","ingresos","costos","cobros","mensual","movimientos"];

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'DM Mono',monospace",color:"#e8e0d0"}}>
      <style>{GLOBAL_CSS}</style>
      <input ref={importRef} type="file" accept=".csv" onChange={importCSV} style={{display:"none"}}/>
      {msg&&<div className="toast">{msg}</div>}

      {/* HERO */}
      <div style={{background:`linear-gradient(160deg,${c}22 0%,#0d0d0d 60%)`,borderBottom:`1px solid ${c}33`,padding:"28px 24px 20px",maxWidth:480,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12}}>← volver</button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={exportCSV} className="switch-btn">↓ CSV</button>
            <button onClick={()=>importRef.current?.click()} className="switch-btn">↑ CSV</button>
            <button onClick={()=>{if(window.confirm(`¿Eliminar ${negocio.nombre}?`))onDelete(negocio.id);}} className="switch-btn" style={{color:"#f87171",borderColor:"#3a1a1a"}}>✕</button>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:36,lineHeight:1,marginBottom:10}}>{negocio.emoji}</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:9,letterSpacing:4,color:c,marginBottom:6,opacity:0.8}}>NEGOCIO</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:20,fontWeight:900}}>{negocio.nombre}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>SALDO TOTAL</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:900,letterSpacing:-1,color:saldo>=0?c:"#f87171",lineHeight:1}}>
              {saldo>=0?"+":""}{formatARS(saldo)}
            </div>
            {totalPendCobros>0&&(
              <div style={{fontSize:10,color:"#fb923c",marginTop:4}}>+ {formatARS(totalPendCobros)} por cobrar</div>
            )}
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <div style={{flex:1,background:"#0d2016",border:`1px solid ${c}33`,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:c,letterSpacing:2,marginBottom:4}}>▲ INGRESOS</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700}}>{formatARS(totalIngresos)}</div>
          </div>
          <div style={{flex:1,background:"#200d0d",border:"1px solid #f8717133",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"#f87171",letterSpacing:2,marginBottom:4}}>▼ EGRESOS</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700}}>{formatARS(totalRetiros)}</div>
          </div>
        </div>

        {/* FILTRO RANGO */}
        <div className="range-scroll" style={{marginBottom:16}}>
          {[["todo","Todo"],["semana","7 días"],["mes","30 días"],["3meses","3 meses"]].map(([val,label])=>(
            <button key={val} className={`chip ${range===val?"active":""}`} onClick={()=>setRange(val)}>{label}</button>
          ))}
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:4,overflowX:"auto"}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              background:tab===t?`${c}22`:"none",
              border:tab===t?`1px solid ${c}55`:"1px solid transparent",
              borderRadius:6,color:tab===t?c:"#666",
              fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2,
              textTransform:"uppercase",cursor:"pointer",padding:"6px 12px",
              transition:"all 0.2s",whiteSpace:"nowrap",position:"relative"
            }}>
              {t}
              {t==="cobros"&&pendCobros.length>0&&(
                <span style={{position:"absolute",top:2,right:2,width:6,height:6,borderRadius:"50%",background:"#fb923c"}}/>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 24px 130px"}}>

        {/* RESUMEN */}
        {tab==="resumen"&&(
          <div>
            <div className="card-dark" style={{marginBottom:12}}>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Balance acumulado</div>
              <BalanceChart movimientos={movimientos} color={c}/>
            </div>
            {movimientos.length===0?(
              <div style={{textAlign:"center",color:"#555",fontSize:12,padding:32}}>Sin movimientos aún<br/><span style={{fontSize:10}}>tocá + para agregar</span></div>
            ):(
              <div className="card-dark">
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Últimos movimientos</div>
                {[...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(m=>(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1e1e1e"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:m.tipo==="ingreso"?c:"#f87171",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,marginBottom:2}}>{m.desc}</div>
                      <div style={{fontSize:10,color:"#555"}}>{m.date}{m.nota&&<span style={{color:"#888"}}> · {m.nota}</span>}</div>
                    </div>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:m.tipo==="ingreso"?c:"#f87171"}}>
                      {m.tipo==="ingreso"?"+":"-"}{formatARS(m.amount)}
                    </div>
                  </div>
                ))}
                {movimientos.length>5&&(
                  <button onClick={()=>setTab("movimientos")} style={{background:"none",border:"none",color:"#555",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",marginTop:10}}>
                    ver todos ({movimientos.length}) →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* INGRESOS */}
        {tab==="ingresos"&&(
          <div className="card-dark">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>De dónde vienen los ingresos</div>
            {(()=>{
              const ingresos=movsFiltered.filter(m=>m.tipo==="ingreso");
              if(ingresos.length===0) return <div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin ingresos aún</div>;
              const byCat={};
              ingresos.forEach(m=>{const cat=m.categoriaIngreso||"Otros";byCat[cat]=(byCat[cat]||0)+m.amount;});
              const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
              const total=sorted.reduce((s,[,v])=>s+v,0);
              const max=sorted[0]?.[1]||1;
              return (
                <div>
                  <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:20,gap:1}}>
                    {sorted.map(([cat,val],i)=><div key={cat} style={{width:`${(val/total)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>)}
                  </div>
                  {sorted.map(([cat,val],i)=>(
                    <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
                      <div style={{fontSize:12,color:"#aaa",minWidth:90}}>{cat}</div>
                      <div style={{flex:1,height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(val/max)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:3}}/>
                      </div>
                      <div style={{fontSize:11,color:"#888",minWidth:70,textAlign:"right"}}>{formatARS(val)}</div>
                      <div style={{fontSize:10,color:"#555",minWidth:28,textAlign:"right"}}>{Math.round((val/total)*100)}%</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* COSTOS */}
        {tab==="costos"&&(
          <div className="card-dark">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>En qué se va la plata</div>
            <CostosChart movimientos={movsFiltered}/>
          </div>
        )}

        {/* COBROS PENDIENTES */}
        {tab==="cobros"&&(
          <div>
            {pendCobros.length>0&&(
              <div style={{background:"#1a1000",border:"1px solid #fb923c33",borderRadius:12,padding:"14px 20px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:10,color:"#fb923c",letterSpacing:2}}>POR COBRAR</div>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:16,fontWeight:700,color:"#fb923c"}}>{formatARS(totalPendCobros)}</div>
              </div>
            )}
            <div className="card-dark">
              {cobros.length===0&&<div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin cobros pendientes 🎉</div>}
              {[...cobros].sort((a,b)=>{if(a.cobrado!==b.cobrado)return a.cobrado?1:-1;return a.fecha.localeCompare(b.fecha);}).map(cb=>(
                <div key={cb.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #1e1e1e"}}>
                  <button onClick={()=>toggleCobro(cb.id)} style={{
                    width:28,height:28,borderRadius:"50%",flexShrink:0,cursor:"pointer",
                    background:cb.cobrado?"#0d2016":"#1a1a1a",
                    border:cb.cobrado?"1.5px solid #4ade80":"1.5px solid #2a2a2a",
                    color:cb.cobrado?"#4ade80":"#444",fontSize:13,
                    display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s"
                  }}>{cb.cobrado?"✓":""}</button>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:cb.cobrado?"#555":"#e8e0d0",textDecoration:cb.cobrado?"line-through":"none",marginBottom:3}}>{cb.nombre}</div>
                    <div style={{fontSize:10,color:"#555"}}>
                      vence {cb.fecha}
                      {cb.cobrado&&<span style={{color:"#4ade80"}}> · cobrado {cb.cobradoDate}</span>}
                      {cb.nota&&<span> · {cb.nota}</span>}
                    </div>
                  </div>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:cb.cobrado?"#555":"#fb923c"}}>{formatARS(cb.amount)}</div>
                  <button className="del-btn" onClick={()=>deleteCobro(cb.id)}>×</button>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowCobro(true)} style={{
              background:"#161616",border:"1px dashed #2a2a2a",borderRadius:12,
              padding:"14px 20px",cursor:"pointer",color:"#555",
              fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:"left",
              width:"100%",marginTop:12
            }}>+ agregar cobro pendiente</button>
          </div>
        )}

        {/* MENSUAL */}
        {tab==="mensual"&&(
          <div className="card-dark">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Por mes</div>
            {Object.keys(byMonth).length===0&&<div style={{color:"#555",fontSize:12}}>Sin datos aún</div>}
            {Object.entries(byMonth).sort().reverse().map(([m,data])=>{
              const [y,mo]=m.split("-");
              const bal=data.ingreso-data.retiro;
              const maxV=Math.max(data.ingreso,data.retiro,1);
              return (
                <div key={m} style={{marginBottom:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:11,fontWeight:700}}>{MONTHS[parseInt(mo)-1]} {y}</div>
                    <div style={{fontSize:12,color:bal>=0?c:"#f87171",fontWeight:500}}>{bal>=0?"+":""}{formatARS(bal)}</div>
                  </div>
                  {[["ingreso",data.ingreso,c,"#1a5c30"],["retiro",data.retiro,"#f87171","#5c1a1a"]].map(([label,val,col,from])=>(
                    <div key={label} style={{marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginBottom:3}}>
                        <span style={{textTransform:"capitalize"}}>{label}s</span><span>{formatARS(val)}</span>
                      </div>
                      <div style={{height:6,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${(val/maxV)*100}%`,background:`linear-gradient(90deg,${from},${col})`,borderRadius:3,transition:"width 0.8s"}}/>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* MOVIMIENTOS */}
        {tab==="movimientos"&&(
          <div className="card-dark">
            {movsFiltered.length===0&&<div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin movimientos en este período</div>}
            {[...movsFiltered].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid #1e1e1e"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:m.tipo==="ingreso"?c:"#f87171",flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,marginBottom:3}}>{m.desc}</div>
                  <div style={{fontSize:10,color:"#555",display:"flex",flexWrap:"wrap",gap:4}}>
                    <span>{m.date}</span>
                    <span>· {m.metodo}</span>
                    {m.categoria&&<span style={{color:"#888"}}>· {m.categoria}</span>}
                    {m.nota&&<span style={{color:"#666",fontStyle:"italic"}}>· {m.nota}</span>}
                  </div>
                </div>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:m.tipo==="ingreso"?c:"#f87171"}}>
                  {m.tipo==="ingreso"?"+":"-"}{formatARS(m.amount)}
                </div>
                <button onClick={(e)=>{e.stopPropagation();openEdit(m);}} className="edit-btn">✎</button>
                <button className="del-btn" onClick={(e)=>{e.stopPropagation();handleDelete(m.id);}}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FABs */}
      <div className="fab-wrap">
        <button className="fab-sm" onClick={()=>setShowQuick(true)} title="Ingreso rápido">⚡</button>
        <button className="fab" style={{background:c}} onClick={openAdd}>+</button>
      </div>

      {/* MODAL COMPLETO */}
      {showForm&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:20}}>{editando?"Editar":"Nuevo"} movimiento</div>
            <div className="type-toggle">
              <button className={`type-btn ${tipo==="ingreso"?"income-active":""}`} onClick={()=>setTipo("ingreso")}>▲ Ingreso</button>
              <button className={`type-btn ${tipo==="retiro"?"expense-active":""}`} onClick={()=>setTipo("retiro")}>▼ Egreso</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input type="number" placeholder="Monto en ARS" value={amount} onChange={e=>setAmount(e.target.value)}/>
              <input type="text" placeholder="Descripción" value={desc} onChange={e=>setDesc(e.target.value)}/>
              <textarea rows={2} placeholder="Nota (opcional) — cliente, detalle, etc." value={nota} onChange={e=>setNota(e.target.value)}/>
              <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                {METODOS.map(m=><option key={m}>{m}</option>)}
              </select>
              {tipo==="ingreso"&&(
                <div>
                  <div style={{fontSize:11,color:"#555",marginBottom:8,letterSpacing:1}}>TIPO DE INGRESO</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {CAT_INGRESO.map(cat=>(
                      <button key={cat} onClick={()=>setCategoriaIngreso(cat)} style={{
                        padding:"6px 12px",borderRadius:20,border:"1px solid",cursor:"pointer",
                        fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all 0.15s",
                        background:categoriaIngreso===cat?"#0d2016":"#1a1a1a",
                        borderColor:categoriaIngreso===cat?c:"#2a2a2a",
                        color:categoriaIngreso===cat?c:"#666"
                      }}>{cat}</button>
                    ))}
                  </div>
                </div>
              )}
              {tipo==="retiro"&&(
                <div>
                  <div style={{fontSize:11,color:"#555",marginBottom:8,letterSpacing:1}}>CATEGORÍA DEL COSTO</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {CAT_EGRESO.map(cat=>(
                      <button key={cat} onClick={()=>setCategoria(cat)} style={{
                        padding:"6px 12px",borderRadius:20,border:"1px solid",cursor:"pointer",
                        fontFamily:"'DM Mono',monospace",fontSize:11,transition:"all 0.15s",
                        background:categoria===cat?"#200d0d":"#1a1a1a",
                        borderColor:categoria===cat?"#f87171":"#2a2a2a",
                        color:categoria===cat?"#f87171":"#666"
                      }}>{cat}</button>
                    ))}
                  </div>
                </div>
              )}
              <input type="date" value={date} onChange={e=>setDate(e.target.value)}/>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setShowForm(false)} style={{flex:1}}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} style={{flex:2,background:c}}>{editando?"Guardar":"Agregar"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INGRESO RÁPIDO */}
      {showQuick&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowQuick(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:6}}>⚡ Ingreso rápido</div>
            <div style={{fontSize:11,color:"#555",marginBottom:20}}>Solo monto y método — fecha de hoy</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input type="number" placeholder="Monto en ARS" value={quickAmount} onChange={e=>setQuickAmount(e.target.value)} autoFocus/>
              <select value={quickMetodo} onChange={e=>setQuickMetodo(e.target.value)}>
                {METODOS.map(m=><option key={m}>{m}</option>)}
              </select>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setShowQuick(false)} style={{flex:1}}>Cancelar</button>
                <button className="btn-primary" onClick={handleQuick} style={{flex:2,background:c}}>Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COBRO PENDIENTE */}
      {showCobro&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowCobro(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:20}}>Nuevo cobro pendiente</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input type="text" placeholder="¿Quién te debe? / Concepto" value={cobroNombre} onChange={e=>setCobroNombre(e.target.value)}/>
              <input type="number" placeholder="Monto en ARS" value={cobroAmount} onChange={e=>setCobroAmount(e.target.value)}/>
              <div style={{fontSize:11,color:"#555",marginBottom:-4}}>Fecha estimada de cobro</div>
              <input type="date" value={cobroDate} onChange={e=>setCobroDate(e.target.value)}/>
              <textarea rows={2} placeholder="Nota (opcional)" value={cobroNota} onChange={e=>setCobroNota(e.target.value)}/>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setShowCobro(false)} style={{flex:1}}>Cancelar</button>
                <button className="btn-primary" onClick={handleAddCobro} style={{flex:2}}>Agregar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GRAFICOS GENERALES ────────────────────────────────────────
function GraficosGenerales({ negocios }) {
  const allMovs={};
  negocios.forEach(n=>{allMovs[n.id]=loadMovs(n.id);});

  const saldos=negocios.map(n=>({
    ...n,
    saldo:(allMovs[n.id]||[]).reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0),
    ingresos:(allMovs[n.id]||[]).filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.amount,0),
    retiros:(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro").reduce((s,m)=>s+m.amount,0),
  }));

  const maxSaldo=Math.max(...saldos.map(n=>Math.abs(n.saldo)),1);
  const maxIngresos=Math.max(...saldos.map(n=>n.ingresos),1);

  const todosRetiros=negocios.flatMap(n=>(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro"));
  const byCat={};
  todosRetiros.forEach(m=>{const c=m.categoria||"Otros";byCat[c]=(byCat[c]||0)+m.amount;});
  const catSorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const catTotal=catSorted.reduce((s,[,v])=>s+v,0);
  const catMax=catSorted[0]?.[1]||1;

  const byMonth={};
  negocios.forEach(n=>{
    (allMovs[n.id]||[]).forEach(m=>{
      const mo=m.date.slice(0,7);
      if(!byMonth[mo])byMonth[mo]={ingreso:0,retiro:0};
      byMonth[mo][m.tipo]+=m.amount;
    });
  });
  const monthEntries=Object.entries(byMonth).sort().slice(-6);

  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"0 24px 120px"}}>

      {/* COMPARACIÓN NEGOCIOS */}
      <div className="card-dark" style={{marginBottom:12}}>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Saldo por negocio</div>
        {saldos.map(n=>(
          <div key={n.id} style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{n.emoji}</span>
                <span style={{fontSize:12,color:"#aaa"}}>{n.nombre}</span>
              </div>
              <span style={{fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:700,color:n.saldo>=0?n.color:"#f87171"}}>
                {n.saldo>=0?"+":""}{formatARS(n.saldo)}
              </span>
            </div>
            <div style={{height:6,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${(Math.abs(n.saldo)/maxSaldo)*100}%`,background:n.saldo>=0?n.color:"#f87171",borderRadius:3,transition:"width 0.8s"}}/>
            </div>
          </div>
        ))}
      </div>

      {/* RANKING INGRESOS */}
      <div className="card-dark" style={{marginBottom:12}}>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>¿Qué negocio rinde más?</div>
        {[...saldos].sort((a,b)=>b.ingresos-a.ingresos).map((n,i)=>(
          <div key={n.id} style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:16,fontWeight:900,color:i===0?n.color:"#333",minWidth:20}}>#{i+1}</div>
            <span style={{fontSize:20}}>{n.emoji}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:12,color:"#aaa",marginBottom:4}}>{n.nombre}</div>
              <div style={{height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(n.ingresos/maxIngresos)*100}%`,background:n.color,borderRadius:3}}/>
              </div>
            </div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:700,color:n.color}}>{formatARS(n.ingresos)}</div>
          </div>
        ))}
      </div>

      {/* COSTOS TOTALES */}
      {catSorted.length>0&&(
        <div className="card-dark" style={{marginBottom:12}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Costos totales</div>
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:20,gap:1}}>
            {catSorted.map(([cat,val],i)=><div key={cat} style={{width:`${(val/catTotal)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>)}
          </div>
          {catSorted.map(([cat,val],i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
              <div style={{fontSize:12,color:"#aaa",minWidth:90}}>{cat}</div>
              <div style={{flex:1,height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(val/catMax)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:3}}/>
              </div>
              <div style={{fontSize:11,color:"#888",minWidth:70,textAlign:"right"}}>{formatARS(val)}</div>
              <div style={{fontSize:10,color:"#555",minWidth:28,textAlign:"right"}}>{Math.round((val/catTotal)*100)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* EVOLUCIÓN MENSUAL */}
      {monthEntries.length>0&&(
        <div className="card-dark">
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Evolución mensual</div>
          {[...monthEntries].reverse().map(([m,data])=>{
            const [y,mo]=m.split("-");
            const bal=data.ingreso-data.retiro;
            return (
              <div key={m} style={{marginBottom:16}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:11,fontWeight:700}}>{MONTHS[parseInt(mo)-1]} {y}</div>
                  <div style={{fontSize:12,color:bal>=0?"#4ade80":"#f87171",fontWeight:500}}>{bal>=0?"+":""}{formatARS(bal)}</div>
                </div>
                <div style={{display:"flex",gap:4,height:8}}>
                  <div style={{flex:data.ingreso,background:"linear-gradient(90deg,#1a5c30,#4ade80)",borderRadius:"3px 0 0 3px",minWidth:data.ingreso>0?4:0}}/>
                  <div style={{flex:data.retiro,background:"linear-gradient(90deg,#5c1a1a,#f87171)",borderRadius:"0 3px 3px 0",minWidth:data.retiro>0?4:0}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#555",marginTop:4}}>
                  <span>▲ {formatARS(data.ingreso)}</span>
                  <span>▼ {formatARS(data.retiro)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {catSorted.length===0&&monthEntries.length===0&&(
        <div style={{textAlign:"center",color:"#555",fontSize:12,padding:40}}>
          Agregá movimientos para ver los gráficos
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function App() {
  const [negocios, setNegocios] = useState(()=>{migrar();return loadNegocios();});
  const [selected, setSelected] = useState(null);
  const [mainTab, setMainTab] = useState("negocios");
  const [showAddNegocio, setShowAddNegocio] = useState(false);
  const [newNombre, setNewNombre] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏪");
  const [newColor, setNewColor] = useState("#4ade80");
  const [allMovs, setAllMovs] = useState({});

  useEffect(()=>{saveNegocios(negocios);},[negocios]);
  useEffect(()=>{
    const all={};
    negocios.forEach(n=>{all[n.id]=loadMovs(n.id);});
    setAllMovs(all);
  },[negocios,selected]);

  const getSaldo=(id)=>(allMovs[id]||[]).reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0);
  const totalGeneral=negocios.reduce((s,n)=>s+getSaldo(n.id),0);
  const totalIngresos=negocios.reduce((s,n)=>s+(allMovs[n.id]||[]).filter(m=>m.tipo==="ingreso").reduce((a,m)=>a+m.amount,0),0);
  const totalRetiros=negocios.reduce((s,n)=>s+(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro").reduce((a,m)=>a+m.amount,0),0);

  const handleAddNegocio=()=>{
    if(!newNombre.trim())return;
    setNegocios(prev=>[...prev,{id:`negocio_${Date.now()}`,nombre:newNombre.trim(),emoji:newEmoji,color:newColor}]);
    setNewNombre("");setShowAddNegocio(false);
  };
  const handleDeleteNegocio=(id)=>{
    setNegocios(prev=>prev.filter(n=>n.id!==id));
    localStorage.removeItem(`ng_mov_${id}`);
    localStorage.removeItem(`ng_cobros_${id}`);
    setSelected(null);
  };

  if (selected) {
    const negocio=negocios.find(n=>n.id===selected);
    if(!negocio){setSelected(null);return null;}
    return <NegocioDetail negocio={negocio} onBack={()=>setSelected(null)} onDelete={handleDeleteNegocio}/>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'DM Mono',monospace",color:"#e8e0d0"}}>
      <style>{GLOBAL_CSS}</style>

      <div style={{padding:"32px 24px 0",maxWidth:480,margin:"0 auto"}}>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:9,letterSpacing:4,color:"#555",marginBottom:10}}>MIS NEGOCIOS</div>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:26,fontWeight:900,letterSpacing:-1,color:totalGeneral>=0?"#e8e0d0":"#f87171",marginBottom:4}}>
          {totalGeneral>=0?"+":""}{formatARS(totalGeneral)}
        </div>
        <div style={{fontSize:11,color:"#555",marginBottom:16}}>saldo total acumulado</div>

        <div style={{display:"flex",gap:10,marginBottom:24}}>
          <div style={{flex:1,background:"#0d2016",border:"1px solid #4ade8033",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"#4ade80",letterSpacing:2,marginBottom:4}}>▲ INGRESADO</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:700}}>{formatARS(totalIngresos)}</div>
          </div>
          <div style={{flex:1,background:"#200d0d",border:"1px solid #f8717133",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"#f87171",letterSpacing:2,marginBottom:4}}>▼ RETIRADO</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:12,fontWeight:700}}>{formatARS(totalRetiros)}</div>
          </div>
        </div>

        <div style={{display:"flex",background:"#111",borderRadius:10,padding:4,marginBottom:24}}>
          {["negocios","gráficos"].map(t=>(
            <button key={t} className="main-tab" onClick={()=>setMainTab(t)} style={{
              flex:1,color:mainTab===t?"#e8e0d0":"#555",
              background:mainTab===t?"#1e1e1e":"none"
            }}>{t}</button>
          ))}
        </div>
      </div>

      {mainTab==="negocios"&&(
        <div style={{maxWidth:480,margin:"0 auto",padding:"0 24px 120px",display:"flex",flexDirection:"column",gap:10}}>
          {negocios.map(n=>{
            const saldo=getSaldo(n.id);
            const movs=allMovs[n.id]||[];
            const cobros=loadCobros(n.id);
            const pendCobros=cobros.filter(c=>!c.cobrado).length;
            return (
              <div key={n.id} className="negocio-card" onClick={()=>setSelected(n.id)}
                style={{border:`1px solid ${saldo>=0?`${n.color}33`:"#3a1a1a"}`}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=saldo>=0?`${n.color}66`:"#f87171"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=saldo>=0?`${n.color}33`:"#3a1a1a"}
              >
                <div style={{fontSize:28,lineHeight:1}}>{n.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:4}}>{n.nombre}</div>
                  <div style={{fontSize:10,color:"#555",display:"flex",gap:8}}>
                    <span>{movs.length} movimientos</span>
                    {pendCobros>0&&<span style={{color:"#fb923c"}}>· {pendCobros} por cobrar</span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:15,fontWeight:900,color:saldo>=0?n.color:"#f87171"}}>
                    {saldo>=0?"+":""}{formatARS(saldo)}
                  </div>
                  <MiniChart movimientos={movs} color={n.color}/>
                </div>
                <div style={{color:"#333",fontSize:16}}>›</div>
              </div>
            );
          })}
          <button onClick={()=>setShowAddNegocio(true)} style={{
            background:"#161616",border:"1px dashed #2a2a2a",borderRadius:14,
            padding:"16px 20px",cursor:"pointer",color:"#555",
            fontFamily:"'DM Mono',monospace",fontSize:12,textAlign:"left",width:"100%"
          }}>+ agregar negocio</button>
        </div>
      )}

      {mainTab==="gráficos"&&<GraficosGenerales negocios={negocios}/>}

      {showAddNegocio&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowAddNegocio(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:20}}>Nuevo negocio</div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <input type="text" placeholder="Nombre del negocio" value={newNombre} onChange={e=>setNewNombre(e.target.value)}/>
              <div>
                <div style={{fontSize:11,color:"#555",marginBottom:4}}>Emoji</div>
                <div className="emoji-pick">{EMOJIS.map(em=><button key={em} className={newEmoji===em?"sel":""} onClick={()=>setNewEmoji(em)}>{em}</button>)}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:"#555",marginBottom:4}}>Color</div>
                <div className="color-pick">{COLORS.map(c=><button key={c} className={newColor===c?"sel":""} onClick={()=>setNewColor(c)} style={{background:c}}/>)}</div>
              </div>
              <div style={{display:"flex",gap:10,marginTop:4}}>
                <button className="btn-ghost" onClick={()=>setShowAddNegocio(false)} style={{flex:1}}>Cancelar</button>
                <button className="btn-primary" onClick={handleAddNegocio} style={{flex:2}}>Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
