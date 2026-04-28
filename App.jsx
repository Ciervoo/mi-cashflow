import { useState, useEffect, useRef } from "react";

const formatARS = (n) =>
  new Intl.NumberFormat("es-AR", { style:"currency", currency:"ARS", maximumFractionDigits:0 }).format(n);

const METODOS = ["Transferencia", "Mercado Pago", "Efectivo"];
const CAT_EGRESO = ["Compu","Comida","Joda","Nafta","Inversiones","Ropa","Otros"];
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
        id: t.id, tipo: t.type==="income"?"ingreso":"retiro",
        amount: t.amount, desc: t.desc||"", metodo:"Transferencia", date: t.date,
        categoria: t.type==="expense" ? (CAT_EGRESO.includes(t.category)?t.category:"Otros") : null,
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

// ── BALANCE CHART (línea) ────────────────────────────────────
function BalanceChart({ movimientos, color }) {
  const sorted = [...movimientos].sort((a,b)=>a.date.localeCompare(b.date));
  if (sorted.length < 2) return (
    <div style={{textAlign:"center",color:"#555",fontSize:11,padding:"12px 0"}}>Agregá más movimientos para ver el gráfico</div>
  );
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
  const ac=last>=0?`${color}18`:"rgba(248,113,113,0.08)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",overflow:"visible"}}>
      {minV<0&&maxV>0&&<line x1={pad.l} y1={toY(0)} x2={W-pad.r} y2={toY(0)} stroke="#ffffff18" strokeWidth="1" strokeDasharray="4 3"/>}
      <path d={areaD} fill={ac}/>
      <path d={pathD} fill="none" stroke={lc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((p,i)=><circle key={i} cx={toX(i)} cy={toY(p.v)} r="2.5" fill={p.v>=0?lc:"#f87171"} stroke="#161616" strokeWidth="1.5"/>)}
      <text x={toX(0)} y={H-2} fill="#ffffff44" fontSize="8" textAnchor="middle">{points[0].date.slice(5)}</text>
      {points.length>1&&<text x={toX(points.length-1)} y={H-2} fill="#ffffff44" fontSize="8" textAnchor="middle">{points[points.length-1].date.slice(5)}</text>}
    </svg>
  );
}

// ── MINI CHART ───────────────────────────────────────────────
function MiniChart({ movimientos, color }) {
  const sorted=[...movimientos].sort((a,b)=>a.date.localeCompare(b.date));
  if (sorted.length<2) return null;
  const points=[]; let r=0;
  sorted.forEach(m=>{r+=m.tipo==="ingreso"?m.amount:-m.amount;points.push(r);});
  const W=72,H=28;
  const min=Math.min(...points,0),max=Math.max(...points,1),range=max-min||1;
  const toX=i=>(i/Math.max(points.length-1,1))*W;
  const toY=v=>H-((v-min)/range)*H;
  const path=points.map((v,i)=>`${i===0?"M":"L"} ${toX(i)} ${toY(v)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:72,height:28,overflow:"visible"}}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
    </svg>
  );
}

// ── COSTOS CHART ─────────────────────────────────────────────
function CostosChart({ movimientos }) {
  const retiros=movimientos.filter(m=>m.tipo==="retiro");
  if (retiros.length===0) return <div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin egresos aún</div>;
  const byCat={};
  retiros.forEach(m=>{const c=m.categoria||"Otros";byCat[c]=(byCat[c]||0)+m.amount;});
  const sorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const total=sorted.reduce((s,[,v])=>s+v,0);
  const max=sorted[0]?.[1]||1;
  return (
    <div>
      <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:20,gap:1}}>
        {sorted.map(([cat,val],i)=>(
          <div key={cat} style={{width:`${(val/total)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],transition:"width 0.6s"}}/>
        ))}
      </div>
      {sorted.map(([cat,val],i)=>(
        <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
          <div style={{fontSize:12,color:"#aaa",minWidth:80}}>{cat}</div>
          <div style={{flex:1,height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${(val/max)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:3,transition:"width 0.8s"}}/>
          </div>
          <div style={{fontSize:11,color:"#888",minWidth:70,textAlign:"right"}}>{formatARS(val)}</div>
          <div style={{fontSize:10,color:"#555",minWidth:28,textAlign:"right"}}>{Math.round((val/total)*100)}%</div>
        </div>
      ))}
    </div>
  );
}

// ── NEGOCIO DETAIL ───────────────────────────────────────────
function NegocioDetail({ negocio, onBack, onDelete }) {
  const [movimientos, setMovimientos] = useState(()=>loadMovs(negocio.id));
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState(null); // id del mov editando
  const [tipo, setTipo] = useState("ingreso");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [metodo, setMetodo] = useState("Transferencia");
  const [categoria, setCategoria] = useState(CAT_EGRESO[0]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [tab, setTab] = useState("resumen");
  const importRef = useRef(null);
  const [msg, setMsg] = useState(null);

  useEffect(()=>{saveMovs(negocio.id,movimientos);},[movimientos,negocio.id]);

  const saldo=movimientos.reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0);
  const totalIngresos=movimientos.filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.amount,0);
  const totalRetiros=movimientos.filter(m=>m.tipo==="retiro").reduce((s,m)=>s+m.amount,0);

  const openAdd = () => {
    setEditando(null);
    setTipo("ingreso"); setAmount(""); setDesc(""); setMetodo("Transferencia");
    setCategoria(CAT_EGRESO[0]); setDate(new Date().toISOString().split("T")[0]);
    setShowForm(true);
  };

  const openEdit = (m) => {
    setEditando(m.id);
    setTipo(m.tipo); setAmount(String(m.amount)); setDesc(m.desc);
    setMetodo(m.metodo||"Transferencia"); setCategoria(m.categoria||CAT_EGRESO[0]);
    setDate(m.date); setShowForm(true);
  };

  const handleSave = () => {
    if (!amount) return;
    const mov = { id: editando||Date.now(), tipo, amount:Number(amount), desc:desc||(tipo==="ingreso"?"Ingreso":"Retiro"), metodo, date, categoria:tipo==="retiro"?categoria:null };
    if (editando) { setMovimientos(prev=>prev.map(m=>m.id===editando?mov:m)); }
    else { setMovimientos(prev=>[mov,...prev]); }
    setShowForm(false);
  };

  const handleDelete = (id) => setMovimientos(prev=>prev.filter(m=>m.id!==id));

  const exportCSV = () => {
    const rows=[["Fecha","Tipo","Monto","Método","Categoría","Descripción"]];
    [...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).forEach(m=>{
      rows.push([m.date,m.tipo,m.amount,m.metodo,m.categoria||"",`"${m.desc}"`]);
    });
    const csv=rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${negocio.nombre}.csv`;a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
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
          if(!date||isNaN(amount))continue;
          imported.push({id:Date.now()+i,date,tipo,amount,metodo,categoria,desc});
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

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'DM Mono',monospace",color:"#e8e0d0"}}>
      <input ref={importRef} type="file" accept=".csv" onChange={importCSV} style={{display:"none"}}/>
      {msg&&<div className="toast">{msg}</div>}

      {/* HERO HEADER con color del negocio */}
      <div style={{
        background:`linear-gradient(160deg, ${c}22 0%, #0d0d0d 60%)`,
        borderBottom:`1px solid ${c}33`,
        padding:"28px 24px 24px", maxWidth:480, margin:"0 auto"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <button onClick={onBack} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:12,display:"flex",alignItems:"center",gap:6}}>
            ← volver
          </button>
          <div style={{display:"flex",gap:8}}>
            <button onClick={exportCSV} className="switch-btn">↓</button>
            <button onClick={()=>importRef.current?.click()} className="switch-btn">↑</button>
            <button onClick={()=>{if(window.confirm(`¿Eliminar ${negocio.nombre}?`))onDelete(negocio.id);}} className="switch-btn" style={{color:"#f87171",borderColor:"#3a1a1a"}}>✕</button>
          </div>
        </div>

        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{fontSize:36,lineHeight:1,marginBottom:10}}>{negocio.emoji}</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:9,letterSpacing:4,color:c,marginBottom:6,opacity:0.8}}>NEGOCIO</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:20,fontWeight:900,letterSpacing:-0.5}}>{negocio.nombre}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:"#666",marginBottom:4}}>SALDO</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:28,fontWeight:900,letterSpacing:-1,color:saldo>=0?c:"#f87171",lineHeight:1}}>
              {saldo>=0?"+":""}{formatARS(saldo)}
            </div>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{display:"flex",gap:10,marginBottom:20}}>
          <div style={{flex:1,background:"#0d2016",border:`1px solid ${c}33`,borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:c,letterSpacing:2,marginBottom:4}}>▲ INGRESOS</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700}}>{formatARS(totalIngresos)}</div>
          </div>
          <div style={{flex:1,background:"#200d0d",border:"1px solid #f8717133",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:9,color:"#f87171",letterSpacing:2,marginBottom:4}}>▼ RETIROS</div>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700}}>{formatARS(totalRetiros)}</div>
          </div>
        </div>

        {/* TABS */}
        <div style={{display:"flex",gap:4,overflowX:"auto"}}>
          {["resumen","costos","mensual","movimientos"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              background:tab===t?`${c}22`:"none",
              border:tab===t?`1px solid ${c}55`:"1px solid transparent",
              borderRadius:6,color:tab===t?c:"#666",
              fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:2,
              textTransform:"uppercase",cursor:"pointer",padding:"6px 12px",
              transition:"all 0.2s",whiteSpace:"nowrap"
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:480,margin:"0 auto",padding:"20px 24px 120px"}}>

        {/* RESUMEN */}
        {tab==="resumen"&&(
          <div>
            <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:12}}>
              <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Balance acumulado</div>
              <BalanceChart movimientos={movimientos} color={c}/>
            </div>
            {movimientos.length===0&&(
              <div style={{textAlign:"center",color:"#555",fontSize:12,padding:32}}>
                Sin movimientos aún<br/>
                <span style={{fontSize:10}}>tocá + para agregar</span>
              </div>
            )}
            {movimientos.length>0&&(
              <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Últimos movimientos</div>
                {[...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(m=>(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #1e1e1e"}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:m.tipo==="ingreso"?c:"#f87171",flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,marginBottom:2}}>{m.desc}</div>
                      <div style={{fontSize:10,color:"#555"}}>{m.date} · {m.metodo}{m.categoria&&` · ${m.categoria}`}</div>
                    </div>
                    <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:m.tipo==="ingreso"?c:"#f87171"}}>
                      {m.tipo==="ingreso"?"+":"-"}{formatARS(m.amount)}
                    </div>
                  </div>
                ))}
                {movimientos.length>5&&(
                  <button onClick={()=>setTab("movimientos")} style={{background:"none",border:"none",color:"#555",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",marginTop:10,letterSpacing:1}}>
                    ver todos ({movimientos.length}) →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* COSTOS */}
        {tab==="costos"&&(
          <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>En qué se va la plata</div>
            <CostosChart movimientos={movimientos}/>
          </div>
        )}

        {/* MENSUAL */}
        {tab==="mensual"&&(
          <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
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
          <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
            {movimientos.length===0&&<div style={{color:"#555",fontSize:12,textAlign:"center",padding:20}}>Sin movimientos aún</div>}
            {[...movimientos].sort((a,b)=>b.date.localeCompare(a.date)).map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0",borderBottom:"1px solid #1e1e1e"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:m.tipo==="ingreso"?c:"#f87171",flexShrink:0}}/>
                <div style={{flex:1,cursor:"pointer"}} onClick={()=>openEdit(m)}>
                  <div style={{fontSize:13,marginBottom:3}}>{m.desc}</div>
                  <div style={{fontSize:10,color:"#555"}}>{m.date} · {m.metodo}{m.categoria&&` · ${m.categoria}`}</div>
                </div>
                <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,color:m.tipo==="ingreso"?c:"#f87171"}}>
                  {m.tipo==="ingreso"?"+":"-"}{formatARS(m.amount)}
                </div>
                <button onClick={()=>openEdit(m)} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:13,padding:"0 4px"}}>✎</button>
                <button className="del-btn" onClick={()=>handleDelete(m.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fab-wrap">
        <button className="fab" style={{background:c}} onClick={openAdd}>+</button>
      </div>

      {showForm&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div className="modal">
            <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:20}}>
              {editando?"Editar":"Nuevo"} movimiento
            </div>
            <div className="type-toggle">
              <button className={`type-btn ${tipo==="ingreso"?"income-active":""}`} onClick={()=>setTipo("ingreso")}>▲ Ingreso</button>
              <button className={`type-btn ${tipo==="retiro"?"expense-active":""}`} onClick={()=>setTipo("retiro")}>▼ Retiro</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input type="number" placeholder="Monto en ARS" value={amount} onChange={e=>setAmount(e.target.value)}/>
              <input type="text" placeholder="Descripción (opcional)" value={desc} onChange={e=>setDesc(e.target.value)}/>
              <select value={metodo} onChange={e=>setMetodo(e.target.value)}>
                {METODOS.map(m=><option key={m}>{m}</option>)}
              </select>
              {tipo==="retiro"&&(
                <select value={categoria} onChange={e=>setCategoria(e.target.value)}>
                  {CAT_EGRESO.map(c=><option key={c}>{c}</option>)}
                </select>
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
    </div>
  );
}

// ── GRAFICOS GENERALES ────────────────────────────────────────
function GraficosGenerales({ negocios }) {
  const allMovs={};
  negocios.forEach(n=>{allMovs[n.id]=loadMovs(n.id);});

  // Todos los retiros juntos para ver en qué se va todo
  const todosRetiros=negocios.flatMap(n=>(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro"));
  const byCat={};
  todosRetiros.forEach(m=>{const c=m.categoria||"Otros";byCat[c]=(byCat[c]||0)+m.amount;});
  const catSorted=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const catTotal=catSorted.reduce((s,[,v])=>s+v,0);
  const catMax=catSorted[0]?.[1]||1;

  // Saldos por negocio
  const saldos=negocios.map(n=>({
    ...n,
    saldo:(allMovs[n.id]||[]).reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0),
    ingresos:(allMovs[n.id]||[]).filter(m=>m.tipo==="ingreso").reduce((s,m)=>s+m.amount,0),
    retiros:(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro").reduce((s,m)=>s+m.amount,0),
  }));
  const maxSaldo=Math.max(...saldos.map(n=>Math.abs(n.saldo)),1);

  // Por mes todos juntos
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

      {/* SALDO POR NEGOCIO */}
      <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:12}}>
        <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Saldo por negocio</div>
        {saldos.map(n=>(
          <div key={n.id} style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span>{n.emoji}</span>
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

      {/* COSTOS GENERALES */}
      {catSorted.length>0&&(
        <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20,marginBottom:12}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Costos totales</div>
          <div style={{display:"flex",height:8,borderRadius:4,overflow:"hidden",marginBottom:20,gap:1}}>
            {catSorted.map(([cat,val],i)=>(
              <div key={cat} style={{width:`${(val/catTotal)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>
            ))}
          </div>
          {catSorted.map(([cat,val],i)=>(
            <div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:CAT_COLORS[i%CAT_COLORS.length],flexShrink:0}}/>
              <div style={{fontSize:12,color:"#aaa",minWidth:80}}>{cat}</div>
              <div style={{flex:1,height:5,background:"#1e1e1e",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(val/catMax)*100}%`,background:CAT_COLORS[i%CAT_COLORS.length],borderRadius:3}}/>
              </div>
              <div style={{fontSize:11,color:"#888",minWidth:70,textAlign:"right"}}>{formatARS(val)}</div>
              <div style={{fontSize:10,color:"#555",minWidth:28,textAlign:"right"}}>{Math.round((val/catTotal)*100)}%</div>
            </div>
          ))}
        </div>
      )}

      {/* EVOLUCION MENSUAL */}
      {monthEntries.length>0&&(
        <div style={{background:"#161616",border:"1px solid #2a2a2a",borderRadius:12,padding:20}}>
          <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:10,letterSpacing:3,color:"#555",marginBottom:16,textTransform:"uppercase"}}>Evolución mensual</div>
          {[...monthEntries].reverse().map(([m,data])=>{
            const [y,mo]=m.split("-");
            const bal=data.ingreso-data.retiro;
            const maxV=Math.max(data.ingreso,data.retiro,1);
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
          Agregá movimientos a tus negocios<br/>para ver los gráficos generales
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────
export default function App() {
  const [negocios, setNegocios] = useState(()=>{migrar();return loadNegocios();});
  const [selected, setSelected] = useState(null);
  const [mainTab, setMainTab] = useState("negocios"); // negocios | graficos
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

  const getSaldo=(id)=>{
    return (allMovs[id]||[]).reduce((s,m)=>s+(m.tipo==="ingreso"?m.amount:-m.amount),0);
  };

  const totalGeneral=negocios.reduce((s,n)=>s+getSaldo(n.id),0);
  const totalIngresos=negocios.reduce((s,n)=>s+(allMovs[n.id]||[]).filter(m=>m.tipo==="ingreso").reduce((a,m)=>a+m.amount,0),0);
  const totalRetiros=negocios.reduce((s,n)=>s+(allMovs[n.id]||[]).filter(m=>m.tipo==="retiro").reduce((a,m)=>a+m.amount,0),0);

  const handleAddNegocio=()=>{
    if(!newNombre.trim())return;
    const nuevo={id:`negocio_${Date.now()}`,nombre:newNombre.trim(),emoji:newEmoji,color:newColor};
    setNegocios(prev=>[...prev,nuevo]);
    setNewNombre("");setShowAddNegocio(false);
  };

  const handleDeleteNegocio=(id)=>{
    setNegocios(prev=>prev.filter(n=>n.id!==id));
    localStorage.removeItem(`ng_mov_${id}`);
    setSelected(null);
  };

  if (selected) {
    const negocio=negocios.find(n=>n.id===selected);
    if(!negocio){setSelected(null);return null;}
    return <NegocioDetail negocio={negocio} onBack={()=>setSelected(null)} onDelete={handleDeleteNegocio}/>;
  }

  return (
    <div style={{minHeight:"100vh",background:"#0d0d0d",fontFamily:"'DM Mono',monospace",color:"#e8e0d0"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Unbounded:wght@400;700;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        html{background-color:#0d0d0d!important;}
        body{background-color:#0d0d0d!important;overscroll-behavior-y:none;margin:0;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        input,select{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;color:#e8e0d0;font-family:'DM Mono',monospace;font-size:13px;padding:10px 14px;width:100%;outline:none;transition:border-color 0.2s;-webkit-appearance:none;}
        input:focus,select:focus{border-color:#c8b898;}
        select option{background:#1a1a1a;}
        .btn-primary{background:#c8b898;color:#0d0d0d;border:none;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;letter-spacing:1px;font-weight:500;padding:12px 24px;cursor:pointer;}
        .btn-ghost{background:none;color:#666;border:1px solid #2a2a2a;border-radius:8px;font-family:'DM Mono',monospace;font-size:12px;padding:12px 24px;cursor:pointer;}
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
        .switch-btn{background:none;border:1px solid #2a2a2a;border-radius:6px;color:#555;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;padding:4px 10px;cursor:pointer;transition:all 0.2s;}
        .switch-btn:hover{border-color:#555;color:#e8e0d0;}
        .negocio-card{background:#161616;border:1px solid #2a2a2a;border-radius:14px;padding:18px 20px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:14px;}
        .negocio-card:active{transform:scale(0.97);}
        .emoji-pick{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
        .emoji-pick button{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:8px;font-size:18px;cursor:pointer;}
        .emoji-pick button.sel{border-color:#c8b898;background:#2a2a2a;}
        .color-pick{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;}
        .color-pick button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;}
        .color-pick button.sel{border-color:#fff;transform:scale(1.15);}
        .toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:12px 20px;font-size:12px;color:#4ade80;z-index:999;}
        .main-tab{background:none;border:none;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;padding:10px 16px;border-radius:8px;transition:all 0.2s;}
      `}</style>

      {/* HEADER */}
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

        {/* MAIN TABS */}
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
            return (
              <div key={n.id} className="negocio-card" onClick={()=>setSelected(n.id)}
                style={{borderColor:saldo>=0?`${n.color}33`:"#3a1a1a"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=saldo>=0?`${n.color}66`:"#f87171"}
                onMouseLeave={e=>e.currentTarget.style.borderColor=saldo>=0?`${n.color}33`:"#3a1a1a"}
              >
                <div style={{fontSize:28,lineHeight:1}}>{n.emoji}</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Unbounded',sans-serif",fontSize:13,fontWeight:700,marginBottom:4}}>{n.nombre}</div>
                  <div style={{fontSize:10,color:"#555"}}>{movs.length} movimientos</div>
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
