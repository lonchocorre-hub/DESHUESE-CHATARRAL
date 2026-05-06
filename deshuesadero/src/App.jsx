import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────
// 🔧 CONFIGURACIÓN — reemplaza con tus credenciales de Supabase
//    Settings → API → Project URL y anon public key
// ─────────────────────────────────────────────────────────────────
const SUPABASE_URL  = "https://cmzjbtwpiigezmvfzeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtempidHdwaWlnZXptdmZ6ZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjE3NzksImV4cCI6MjA5MzI5Nzc3OX0.zz59AcG-Rxd8-5EgEo8R8hluTdNmPPwUbbsxBP_xK7k";
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── Helpers ──────────────────────────────────────────────────────
const SISTEMAS  = ["Motor","Transmisión","Cabina","Chasis","Diferencial","Suspensión","Eléctrico","Frenos","Otro"];
const CANALES   = ["Mostrador","Teléfono","WhatsApp","Facebook","Mercado Libre"];
const TIPO_CLI  = { nuevo:"Nuevo", frecuente:"Frecuente", mayorista:"Mayorista" };
const TIPO_COL  = { nuevo:"blue", frecuente:"green", mayorista:"amber" };
const ROT_LABEL = { rapida:"🔥 Rápida", media:"⚖️ Media", lenta:"🧊 Lenta" };

function adjPrice(base, cond) {
  if (cond === "A") return Math.round(base * 1.15);
  if (cond === "C") return Math.round(base * 0.7);
  return base;
}
function uid(p) { return p + Date.now().toString(36).toUpperCase().slice(-6); }
function fmt(n)  { return "$" + Number(n).toLocaleString("es-MX"); }

// Mapeo snake_case (DB) ↔ camelCase (app)
function mapSeller(r)  { return { id:r.id, nombre:r.nombre, rol:r.rol, pin:r.pin, maxDescuento:r.max_descuento, activo:r.activo }; }
function mapClient(r)  { return { id:r.id, nombre:r.nombre, telefono:r.telefono, tipo:r.tipo, notas:r.notas, fechaRegistro:r.fecha_registro }; }
function mapTruck(r)   { return { id:r.id, nombre:r.nombre, marca:r.marca, modelo:r.modelo, año:r.anio, costoCompra:r.costo_compra, fechaEntrada:r.fecha_entrada, notas:r.notas }; }
function mapPart(r)    { return { id:r.id, camionId:r.camion_id, sistema:r.sistema, nombre:r.nombre, condicion:r.condicion, precioBase:r.precio_base, precioMinimo:r.precio_minimo, rotacion:r.rotacion, estado:r.estado, fechaIngreso:r.fecha_ingreso }; }
function mapSale(r)    { return { id:r.id, piezaId:r.pieza_id, camionId:r.camion_id, clienteId:r.cliente_id, nombrePieza:r.nombre_pieza, precioBase:r.precio_base, precioFinal:r.precio_final, descuento:r.descuento, motivoDescuento:r.motivo_descuento, vendedorId:r.vendedor_id, vendedor:r.vendedor, canal:r.canal, fecha:r.fecha }; }

// ─── UI atoms ─────────────────────────────────────────────────────
function Badge({ children, color = "gray" }) {
  const c = { amber:"bg-amber-900/40 text-amber-300 border-amber-700/50", green:"bg-emerald-900/40 text-emerald-300 border-emerald-700/50", red:"bg-red-900/40 text-red-300 border-red-700/50", blue:"bg-sky-900/40 text-sky-300 border-sky-700/50", gray:"bg-zinc-800 text-zinc-400 border-zinc-700" };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c[color]||c.gray}`}>{children}</span>;
}
function KPI({ label, value, sub, accent, warn }) {
  return (
    <div className={`rounded-xl p-4 border ${accent?"bg-amber-500/10 border-amber-500/40":warn?"bg-red-900/20 border-red-800/40":"bg-zinc-900 border-zinc-800"}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${accent?"text-amber-400":warn?"text-red-400":"text-zinc-100"}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
function Inp({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-zinc-400 uppercase tracking-wider">{label}</label>}
      <input className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition" {...props} />
    </div>
  );
}
function Sel({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-zinc-400 uppercase tracking-wider">{label}</label>}
      <select className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition" {...props}>{children}</select>
    </div>
  );
}
function Textarea({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs text-zinc-400 uppercase tracking-wider">{label}</label>}
      <textarea className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition resize-none h-20" {...props} />
    </div>
  );
}
function Btn({ children, onClick, variant="primary", size="md", disabled=false, full=false }) {
  const s = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2 text-sm", lg:"px-6 py-3 text-base" };
  const v = { primary:"bg-amber-500 hover:bg-amber-400 text-black", ghost:"border border-zinc-700 text-zinc-300 hover:border-amber-500 hover:text-amber-400", danger:"border border-red-800 text-red-400 hover:bg-red-900/30" };
  return <button className={`font-bold rounded-lg transition focus:outline-none disabled:opacity-40 cursor-pointer ${s[size]} ${v[variant]||v.primary} ${full?"w-full":""}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <h3 className="text-lg font-black text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Spinner() {
  return <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />;
}

// ─── LOGIN ────────────────────────────────────────────────────────
function Login({ sellers, onLogin }) {
  const [sel, setSel] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const active = sellers.filter(s => s.activo);
  function attempt() {
    const vendor = active.find(s => s.id === sel);
    if (!vendor) { setErr("Selecciona un vendedor"); return; }
    if (vendor.pin !== pin) { setErr("PIN incorrecto"); setPin(""); return; }
    onLogin(vendor);
  }
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-black font-black text-2xl mx-auto mb-4">D</div>
          <h1 className="text-2xl font-black text-zinc-100">Deshuesadero</h1>
          <p className="text-zinc-500 text-sm mt-1">Sistema de Precios e Inventario</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <Sel label="¿Quién eres?" value={sel} onChange={e=>{setSel(e.target.value);setErr("");}}>
            <option value="">Seleccionar…</option>
            {active.map(s=><option key={s.id} value={s.id}>{s.nombre}{s.rol==="admin"?" 👑":""}</option>)}
          </Sel>
          <Inp label="PIN" type="password" maxLength={6} value={pin} onChange={e=>{setPin(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="••••" />
          {err && <p className="text-red-400 text-xs font-semibold">{err}</p>}
          <Btn full onClick={attempt} disabled={!sel||!pin}>Entrar</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────
function Dashboard({ trucks, parts, sales, sellers, clients, user }) {
  const totalInv  = trucks.reduce((s,t)=>s+t.costoCompra,0);
  const totalRec  = sales.reduce((s,v)=>s+v.precioFinal,0);
  const totalDesc = sales.reduce((s,v)=>s+v.descuento,0);
  const disponibles = parts.filter(p=>p.estado==="disponible").length;
  const lentas = parts.filter(p=>p.estado==="disponible"&&p.rotacion==="lenta").length;

  const byTruck = trucks.map(t=>{
    const tv=sales.filter(s=>s.camionId===t.id).reduce((a,s)=>a+s.precioFinal,0);
    return {...t,recuperado:tv,utilidad:tv-t.costoCompra,pct:t.costoCompra>0?Math.round((tv/t.costoCompra)*100):0};
  }).sort((a,b)=>b.pct-a.pct);

  const bySeller = sellers.filter(s=>s.activo).map(s=>{
    const sv=sales.filter(v=>v.vendedorId===s.id);
    return {nombre:s.nombre,total:sv.reduce((a,v)=>a+v.precioFinal,0),count:sv.length,desc:sv.reduce((a,v)=>a+v.descuento,0)};
  }).filter(s=>s.count>0).sort((a,b)=>b.total-a.total);

  const byChannel = CANALES.map(c=>({canal:c,total:sales.filter(v=>v.canal===c).reduce((a,v)=>a+v.precioFinal,0),count:sales.filter(v=>v.canal===c).length})).filter(c=>c.count>0).sort((a,b)=>b.total-a.total);
  const bySistema = SISTEMAS.map(s=>({sistema:s,count:sales.filter(v=>parts.find(p=>p.id===v.piezaId)?.sistema===s).length})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count).slice(0,5);
  const recent = [...sales].sort((a,b)=>b.fecha?.localeCompare(a.fecha)).slice(0,5);
  const maxSeller=Math.max(...bySeller.map(s=>s.total),1);
  const maxChan=Math.max(...byChannel.map(c=>c.total),1);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-black text-zinc-100">Panel de Control</h2><p className="text-zinc-500 text-sm">Bienvenido, <span className="text-amber-400">{user.nombre}</span>{user.rol==="admin"?" 👑":""}</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Camiones" value={trucks.length} sub={`${clients.length} clientes`} />
        <KPI label="Disponibles" value={disponibles} sub={lentas>0?`⚠️ ${lentas} piezas lentas`:undefined} warn={lentas>0} />
        <KPI label="Total invertido" value={fmt(totalInv)} sub="costo de camiones" />
        <KPI label="Recuperado" value={fmt(totalRec)} sub={totalRec>=totalInv?`+${fmt(totalRec-totalInv)} utilidad`:`−${fmt(totalInv-totalRec)} por recuperar`} accent />
      </div>
      {user.rol==="admin"&&totalDesc>0&&(
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 flex justify-between items-center">
          <div><p className="text-red-300 font-bold text-sm">Margen perdido en descuentos</p><p className="text-xs text-red-400/70">{sales.filter(s=>s.descuento>0).length} ventas con descuento</p></div>
          <p className="text-2xl font-black text-red-400">−{fmt(totalDesc)}</p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Recuperación por Camión</h3>
          {byTruck.length===0&&<p className="text-zinc-600 text-sm">Sin datos</p>}
          {byTruck.map(t=>(
            <div key={t.id} className="mb-3 last:mb-0">
              <div className="flex justify-between text-sm mb-1"><span className="text-zinc-200 font-semibold truncate">{t.nombre}</span><span className={`font-black ml-2 shrink-0 ${t.utilidad>=0?"text-emerald-400":"text-red-400"}`}>{t.pct}%</span></div>
              <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${t.pct>=100?"bg-emerald-500":t.pct>=50?"bg-amber-500":"bg-red-500"}`} style={{width:`${Math.min(t.pct,100)}%`}} /></div>
              <p className="text-xs text-zinc-600 mt-0.5">{fmt(t.recuperado)} de {fmt(t.costoCompra)}</p>
            </div>
          ))}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Últimas Ventas</h3>
          {recent.length===0&&<p className="text-zinc-600 text-sm">Sin ventas aún</p>}
          {recent.map(v=>(
            <div key={v.id} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
              <div className="min-w-0"><p className="text-sm text-zinc-200 truncate">{v.nombrePieza}</p><p className="text-xs text-zinc-500">{v.fecha} · {v.vendedor}</p></div>
              <div className="text-right ml-3 shrink-0"><p className="text-sm font-bold text-amber-400">{fmt(v.precioFinal)}</p>{v.descuento>0&&<p className="text-xs text-red-400/80">−{fmt(v.descuento)}</p>}</div>
            </div>
          ))}
        </div>
      </div>
      {user.rol==="admin"&&(
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Ventas por Vendedor</h3>
            {bySeller.length===0&&<p className="text-zinc-600 text-sm">Sin datos</p>}
            {bySeller.map(s=>(
              <div key={s.nombre} className="mb-3 last:mb-0">
                <div className="flex justify-between text-sm mb-1"><span className="text-zinc-200">{s.nombre} <span className="text-zinc-600 text-xs">({s.count})</span></span><span className="text-amber-400 font-bold">{fmt(s.total)}</span></div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-amber-500" style={{width:`${Math.round((s.total/maxSeller)*100)}%`}} /></div>
                {s.desc>0&&<p className="text-xs text-red-400/70 mt-0.5">−{fmt(s.desc)} en descuentos</p>}
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Ventas por Canal</h3>
              {byChannel.length===0&&<p className="text-zinc-600 text-sm">Sin datos</p>}
              {byChannel.map(c=>(
                <div key={c.canal} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-sm mb-1"><span className="text-zinc-200">{c.canal} <span className="text-zinc-600 text-xs">({c.count})</span></span><span className="text-sky-400 font-bold">{fmt(c.total)}</span></div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="h-1.5 rounded-full bg-sky-500" style={{width:`${Math.round((c.total/maxChan)*100)}%`}} /></div>
                </div>
              ))}
            </div>
            {bySistema.length>0&&(
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sistemas más vendidos</h3>
                {bySistema.map(s=><div key={s.sistema} className="flex justify-between text-sm py-1.5 border-b border-zinc-800 last:border-0"><span className="text-zinc-300">{s.sistema}</span><span className="text-zinc-400">{s.count} {s.count===1?"pieza":"piezas"}</span></div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VENDEDORES ───────────────────────────────────────────────────
function Vendedores({ sellers, setSellers, user }) {
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const blank = { nombre:"", rol:"vendedor", pin:"", maxDescuento:10, activo:true };
  const [form, setForm] = useState(blank);

  if (user.rol!=="admin") return <div className="text-center py-20 text-zinc-600"><p className="text-4xl mb-2">🔒</p><p className="font-semibold">Solo el Admin puede gestionar vendedores</p></div>;

  function open(s=null) { setEditId(s?.id||null); setForm(s?{...s}:blank); setModal(true); }

  async function save() {
    if(!form.nombre||!form.pin) return;
    setSaving(true);
    const row = { id:editId||uid("S"), nombre:form.nombre, rol:form.rol, pin:String(form.pin), max_descuento:Number(form.maxDescuento), activo:form.activo };
    const { error } = await sb.from("sellers").upsert(row);
    if(!error) {
      if(editId) setSellers(p=>p.map(s=>s.id===editId?mapSeller(row):s));
      else setSellers(p=>[...p, mapSeller(row)]);
      setModal(false);
    }
    setSaving(false);
  }

  async function toggle(id, activo) {
    await sb.from("sellers").update({ activo:!activo }).eq("id", id);
    setSellers(p=>p.map(s=>s.id===id?{...s,activo:!activo}:s));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-zinc-100">Vendedores</h2><p className="text-zinc-500 text-sm">{sellers.length} registrados</p></div><Btn onClick={()=>open()}>+ Nuevo Vendedor</Btn></div>
      <div className="space-y-2">
        {sellers.map(s=>(
          <div key={s.id} className={`bg-zinc-900 border rounded-xl p-4 ${s.activo?"border-zinc-800":"border-zinc-800/40 opacity-50"}`}>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1"><p className="font-black text-zinc-100">{s.nombre}</p>{s.rol==="admin"?<Badge color="amber">👑 Admin</Badge>:<Badge color="blue">Vendedor</Badge>}{!s.activo&&<Badge color="gray">Inactivo</Badge>}</div>
                <p className="text-xs text-zinc-500">{s.id} · PIN: {"•".repeat(s.pin.length)} · Desc. máx: <span className="text-amber-400 font-bold">{s.maxDescuento}%</span></p>
              </div>
              <div className="flex gap-2">
                <Btn size="sm" variant="ghost" onClick={()=>open(s)}>Editar</Btn>
                {s.id!==user.id&&<Btn size="sm" variant={s.activo?"danger":"ghost"} onClick={()=>toggle(s.id,s.activo)}>{s.activo?"Desactivar":"Activar"}</Btn>}
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal&&(
        <Modal title={editId?"Editar Vendedor":"Nuevo Vendedor"} onClose={()=>setModal(false)}>
          <div className="space-y-3">
            <Inp label="Nombre *" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
            <div className="grid grid-cols-2 gap-3">
              <Sel label="Rol" value={form.rol} onChange={e=>setForm(f=>({...f,rol:e.target.value}))}><option value="vendedor">Vendedor</option><option value="admin">Admin 👑</option></Sel>
              <Inp label="PIN *" type="password" maxLength={6} value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))} placeholder="Ej: 1234" />
            </div>
            <div>
              <Inp label={`Descuento máximo: ${form.maxDescuento}%`} type="range" min={0} max={100} value={form.maxDescuento} onChange={e=>setForm(f=>({...f,maxDescuento:Number(e.target.value)}))} />
              <div className="flex justify-between text-xs text-zinc-500 mt-1"><span>0%</span><span className="text-amber-400 font-bold">{form.maxDescuento}%</span><span>100%</span></div>
            </div>
            <div className="flex gap-2 pt-2"><Btn onClick={save} disabled={!form.nombre||!form.pin||saving}>{saving?<Spinner/>:editId?"Guardar cambios":"Crear vendedor"}</Btn><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CLIENTES ─────────────────────────────────────────────────────
function Clientes({ clients, setClients, sales, trucks }) {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const blank = { nombre:"", telefono:"", tipo:"nuevo", notas:"", fechaRegistro:new Date().toISOString().slice(0,10) };
  const [form, setForm] = useState(blank);

  async function save() {
    if(!form.nombre) return;
    setSaving(true);
    const row = { id:uid("C"), nombre:form.nombre, telefono:form.telefono, tipo:form.tipo, notas:form.notas, fecha_registro:form.fechaRegistro };
    const { error } = await sb.from("clients").insert(row);
    if(!error) { setClients(p=>[...p,mapClient(row)]); setModal(false); setForm(blank); }
    setSaving(false);
  }

  async function del(id) {
    if(!confirm("¿Eliminar cliente?")) return;
    await sb.from("clients").delete().eq("id",id);
    setClients(p=>p.filter(c=>c.id!==id)); setSelected(null);
  }

  const filtered = clients.filter(c=>!search||c.nombre?.toLowerCase().includes(search.toLowerCase())||c.telefono?.includes(search));
  const sel = clients.find(c=>c.id===selected);
  const selSales = sel ? sales.filter(s=>s.clienteId===sel.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-2xl font-black text-zinc-100">Clientes</h2><p className="text-zinc-500 text-sm">{clients.length} registrados</p></div><Btn onClick={()=>setModal(true)}>+ Nuevo Cliente</Btn></div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre o teléfono…" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition" />
      {filtered.length===0&&<div className="text-center py-12 text-zinc-600"><p className="text-4xl mb-2">👥</p><p>Sin clientes</p></div>}
      <div className="space-y-2">
        {filtered.map(c=>{
          const cS=sales.filter(s=>s.clienteId===c.id);
          const cT=cS.reduce((a,s)=>a+s.precioFinal,0);
          return (
            <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition cursor-pointer" onClick={()=>setSelected(selected===c.id?null:c.id)}>
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div><div className="flex items-center gap-2 mb-1"><p className="font-black text-zinc-100">{c.nombre}</p><Badge color={TIPO_COL[c.tipo]}>{TIPO_CLI[c.tipo]}</Badge></div><p className="text-xs text-zinc-500">{c.id} · 📱 {c.telefono} · Desde {c.fechaRegistro}</p>{c.notas&&<p className="text-xs text-zinc-400 italic mt-1">"{c.notas}"</p>}</div>
                <div className="text-right"><p className="text-lg font-black text-amber-400">{cT>0?fmt(cT):"—"}</p><p className="text-xs text-zinc-500">{cS.length} {cS.length===1?"compra":"compras"}</p></div>
              </div>
              {selected===c.id&&sel&&(
                <div className="mt-4 pt-4 border-t border-zinc-800" onClick={e=>e.stopPropagation()}>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Historial de compras</p>
                  {selSales.length===0&&<p className="text-xs text-zinc-600">Sin compras</p>}
                  {selSales.map(v=>{const t=trucks.find(t=>t.id===v.camionId);return(<div key={v.id} className="flex justify-between text-sm py-1.5 border-b border-zinc-800 last:border-0"><div><p className="text-zinc-200">{v.nombrePieza}</p><p className="text-xs text-zinc-500">{v.fecha} · {v.canal}{t?` · ${t.nombre}`:""}</p></div><p className="text-amber-400 font-bold">{fmt(v.precioFinal)}</p></div>);})}
                  <div className="mt-3"><Btn size="sm" variant="danger" onClick={()=>del(c.id)}>Eliminar cliente</Btn></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {modal&&(
        <Modal title="Nuevo Cliente" onClose={()=>setModal(false)}>
          <div className="space-y-3">
            <Inp label="Nombre *" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} />
            <div className="grid grid-cols-2 gap-3"><Inp label="Teléfono" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="8112345678" /><Sel label="Tipo" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}><option value="nuevo">Nuevo</option><option value="frecuente">Frecuente</option><option value="mayorista">Mayorista</option></Sel></div>
            <Textarea label="Notas" value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} placeholder="Ej: siempre paga de contado" />
            <Inp label="Fecha de registro" type="date" value={form.fechaRegistro} onChange={e=>setForm(f=>({...f,fechaRegistro:e.target.value}))} />
            <div className="flex gap-2 pt-2"><Btn onClick={save} disabled={!form.nombre||saving}>{saving?<Spinner/>:"Guardar Cliente"}</Btn><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── CAMIONES ─────────────────────────────────────────────────────
function Camiones({ trucks, setTrucks, user }) {
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const blank = { nombre:"", marca:"", modelo:"", año:new Date().getFullYear(), costoCompra:"", fechaEntrada:new Date().toISOString().slice(0,10), notas:"" };
  const [form, setForm] = useState(blank);

  async function save() {
    if(!form.nombre||!form.costoCompra) return;
    setSaving(true);
    const row = { id:uid("T"), nombre:form.nombre, marca:form.marca, modelo:form.modelo, anio:Number(form.año), costo_compra:Number(form.costoCompra), fecha_entrada:form.fechaEntrada, notas:form.notas };
    const { error } = await sb.from("trucks").insert(row);
    if(!error) { setTrucks(p=>[...p,mapTruck(row)]); setModal(false); setForm(blank); }
    setSaving(false);
  }

  async function del(id) {
    if(!confirm("¿Eliminar camión?")) return;
    await sb.from("trucks").delete().eq("id",id);
    setTrucks(p=>p.filter(t=>t.id!==id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black text-zinc-100">Camiones</h2><p className="text-zinc-500 text-sm">{trucks.length} registrados</p></div><Btn onClick={()=>setModal(true)}>+ Nuevo Camión</Btn></div>
      {trucks.length===0&&<div className="text-center py-16 text-zinc-600"><p className="text-4xl mb-2">🚛</p><p>Sin camiones</p></div>}
      <div className="grid md:grid-cols-2 gap-3">
        {trucks.map(t=>(
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-start mb-2"><div><p className="font-black text-zinc-100">{t.nombre}</p><p className="text-xs text-zinc-500">{t.id} · {t.fechaEntrada}</p></div><Badge color="amber">{fmt(t.costoCompra)}</Badge></div>
            {t.notas&&<p className="text-xs text-zinc-400 italic">"{t.notas}"</p>}
            {user.rol==="admin"&&<div className="mt-3"><Btn size="sm" variant="danger" onClick={()=>del(t.id)}>Eliminar</Btn></div>}
          </div>
        ))}
      </div>
      {modal&&(
        <Modal title="Registrar Camión" onClose={()=>setModal(false)}>
          <div className="space-y-3">
            <Inp label="Nombre *" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Kenworth T800 2018" />
            <div className="grid grid-cols-2 gap-3"><Inp label="Marca" value={form.marca} onChange={e=>setForm(f=>({...f,marca:e.target.value}))} /><Inp label="Modelo" value={form.modelo} onChange={e=>setForm(f=>({...f,modelo:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3"><Inp label="Año" type="number" value={form.año} onChange={e=>setForm(f=>({...f,año:e.target.value}))} /><Inp label="Costo de compra $ *" type="number" value={form.costoCompra} onChange={e=>setForm(f=>({...f,costoCompra:e.target.value}))} /></div>
            <Inp label="Fecha de entrada" type="date" value={form.fechaEntrada} onChange={e=>setForm(f=>({...f,fechaEntrada:e.target.value}))} />
            <Textarea label="Notas" value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} />
            <div className="flex gap-2 pt-2"><Btn onClick={save} disabled={!form.nombre||!form.costoCompra||saving}>{saving?<Spinner/>:"Guardar Camión"}</Btn><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── INVENTARIO ───────────────────────────────────────────────────
function Inventario({ parts, setParts, trucks }) {
  const [modal, setModal] = useState(false);
  const [fCamion, setFCamion] = useState("all");
  const [fEstado, setFEstado] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const blank = { camionId:"", sistema:"Motor", nombre:"", condicion:"B", precioBase:"", precioMinimo:"", rotacion:"media", fechaIngreso:new Date().toISOString().slice(0,10) };
  const [form, setForm] = useState(blank);
  const ajustado = form.precioBase?adjPrice(Number(form.precioBase),form.condicion):0;

  async function save() {
    if(!form.camionId||!form.nombre||!form.precioBase) return;
    setSaving(true);
    const row = { id:uid("P"), camion_id:form.camionId, sistema:form.sistema, nombre:form.nombre, condicion:form.condicion, precio_base:Number(form.precioBase), precio_minimo:Number(form.precioMinimo)||Math.round(Number(form.precioBase)*0.7), rotacion:form.rotacion, estado:"disponible", fecha_ingreso:form.fechaIngreso };
    const { error } = await sb.from("parts").insert(row);
    if(!error) { setParts(p=>[...p,mapPart(row)]); setModal(false); setForm(blank); }
    setSaving(false);
  }

  const filtered = parts.filter(p=>{
    if(fCamion!=="all"&&p.camionId!==fCamion) return false;
    if(fEstado!=="all"&&p.estado!==fEstado) return false;
    if(search&&!p.nombre?.toLowerCase().includes(search.toLowerCase())&&!p.sistema?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-2xl font-black text-zinc-100">Inventario</h2><p className="text-zinc-500 text-sm">{parts.filter(p=>p.estado==="disponible").length} disponibles</p></div><Btn onClick={()=>setModal(true)} disabled={trucks.length===0}>+ Registrar Pieza</Btn></div>
      {trucks.length===0&&<div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4 text-amber-300 text-sm">⚠️ Primero registra un camión.</div>}
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar…" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition flex-1 min-w-40" />
        <select value={fCamion} onChange={e=>setFCamion(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition"><option value="all">Todos los camiones</option>{trucks.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
        <select value={fEstado} onChange={e=>setFEstado(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 transition"><option value="all">Todos</option><option value="disponible">Disponibles</option><option value="vendida">Vendidas</option></select>
      </div>
      {filtered.length===0&&<div className="text-center py-12 text-zinc-600"><p className="text-4xl mb-2">🔧</p><p>Sin piezas</p></div>}
      <div className="space-y-2">
        {filtered.map(p=>{
          const truck=trucks.find(t=>t.id===p.camionId);
          const a=adjPrice(p.precioBase,p.condicion);
          const cColor={A:"green",B:"blue",C:"red"};
          const rColor={rapida:"amber",media:"blue",lenta:"gray"};
          return (
            <div key={p.id} className={`bg-zinc-900 border rounded-xl p-4 transition ${p.estado==="vendida"?"border-zinc-800 opacity-60":"border-zinc-800 hover:border-zinc-700"}`}>
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1"><span className="font-bold text-zinc-100">{p.nombre}</span>{p.estado==="vendida"&&<Badge color="gray">Vendida</Badge>}</div>
                  <p className="text-xs text-zinc-500 mb-2">{p.id} · {truck?.nombre||p.camionId} · {p.sistema} · {p.fechaIngreso}</p>
                  <div className="flex gap-1.5 flex-wrap"><Badge color={cColor[p.condicion]}>Cond. {p.condicion}</Badge><Badge color={rColor[p.rotacion]}>{ROT_LABEL[p.rotacion]}</Badge></div>
                </div>
                <div className="text-right"><p className="text-lg font-black text-amber-400">{fmt(a)}</p><p className="text-xs text-zinc-500">Base: {fmt(p.precioBase)}</p><p className="text-xs text-red-400/80">Mín: {fmt(p.precioMinimo)}</p></div>
              </div>
            </div>
          );
        })}
      </div>
      {modal&&(
        <Modal title="Registrar Pieza" onClose={()=>setModal(false)}>
          <div className="space-y-3">
            <Sel label="Camión *" value={form.camionId} onChange={e=>setForm(f=>({...f,camionId:e.target.value}))}><option value="">Seleccionar…</option>{trucks.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</Sel>
            <div className="grid grid-cols-2 gap-3"><Sel label="Sistema" value={form.sistema} onChange={e=>setForm(f=>({...f,sistema:e.target.value}))}>{SISTEMAS.map(s=><option key={s}>{s}</option>)}</Sel><Sel label="Condición" value={form.condicion} onChange={e=>setForm(f=>({...f,condicion:e.target.value}))}><option value="A">A – Excelente (+15%)</option><option value="B">B – Funcional (base)</option><option value="C">C – Reparar (−30%)</option></Sel></div>
            <Inp label="Nombre *" value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Motor Cummins ISX15" />
            <div className="grid grid-cols-2 gap-3"><Inp label="Precio base $ *" type="number" value={form.precioBase} onChange={e=>setForm(f=>({...f,precioBase:e.target.value}))} /><Inp label="Precio mínimo $" type="number" value={form.precioMinimo} onChange={e=>setForm(f=>({...f,precioMinimo:e.target.value}))} placeholder={form.precioBase?`Auto: ${fmt(Math.round(form.precioBase*0.7))}`:"70% del base"} /></div>
            {form.precioBase&&<div className="bg-zinc-800 rounded-lg p-3 text-sm"><p className="text-zinc-400">Precio ajustado: <span className="font-bold text-amber-400">{fmt(ajustado)}</span></p></div>}
            <Sel label="Rotación" value={form.rotacion} onChange={e=>setForm(f=>({...f,rotacion:e.target.value}))}><option value="rapida">🔥 Rápida</option><option value="media">⚖️ Media</option><option value="lenta">🧊 Lenta – +60 días</option></Sel>
            <Inp label="Fecha de ingreso" type="date" value={form.fechaIngreso} onChange={e=>setForm(f=>({...f,fechaIngreso:e.target.value}))} />
            <div className="flex gap-2 pt-2"><Btn onClick={save} disabled={!form.camionId||!form.nombre||!form.precioBase||saving}>{saving?<Spinner/>:"Guardar Pieza"}</Btn><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── VENTAS ───────────────────────────────────────────────────────
function Ventas({ sales, setSales, parts, setParts, trucks, clients, user }) {
  const blank = { piezaId:"", clienteId:"", precioFinal:"", descuento:"0", motivoDescuento:"", canal:"Mostrador", fecha:new Date().toISOString().slice(0,10) };
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [warn, setWarn] = useState("");
  const [descWarn, setDescWarn] = useState("");
  const [saving, setSaving] = useState(false);

  const disponibles = parts.filter(p=>p.estado==="disponible");
  const selPart = disponibles.find(p=>p.id===form.piezaId);
  const ajustado = selPart?adjPrice(selPart.precioBase,selPart.condicion):0;
  const finalNum = Number(form.precioFinal)||0;
  const descNum  = Number(form.descuento)||0;
  const descPct  = ajustado>0?Math.round((descNum/ajustado)*100):0;

  useEffect(()=>{
    if(selPart&&form.precioFinal) setWarn(finalNum<selPart.precioMinimo?`⚠️ Por debajo del mínimo (${fmt(selPart.precioMinimo)})` :"");
    else setWarn("");
    if(selPart&&descNum>0&&user.rol!=="admin"&&descPct>user.maxDescuento) setDescWarn(`🔒 Tu límite es ${user.maxDescuento}%. Requiere autorización del Admin.`);
    else setDescWarn("");
  },[form.precioFinal,form.piezaId,form.descuento]);

  async function save() {
    if(!form.piezaId||!form.precioFinal||descWarn) return;
    setSaving(true);
    const row = { id:uid("V"), pieza_id:form.piezaId, camion_id:selPart.camionId, cliente_id:form.clienteId||null, nombre_pieza:selPart.nombre, precio_base:selPart.precioBase, precio_final:finalNum, descuento:descNum, motivo_descuento:form.motivoDescuento, vendedor_id:user.id, vendedor:user.nombre, canal:form.canal, fecha:form.fecha };
    const { error } = await sb.from("sales").insert(row);
    if(!error) {
      await sb.from("parts").update({ estado:"vendida" }).eq("id",form.piezaId);
      setSales(p=>[...p,mapSale(row)]);
      setParts(p=>p.map(x=>x.id===form.piezaId?{...x,estado:"vendida"}:x));
      setModal(false); setForm(blank);
    }
    setSaving(false);
  }

  const recent = [...sales].sort((a,b)=>b.fecha?.localeCompare(a.fecha));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2"><div><h2 className="text-2xl font-black text-zinc-100">Ventas</h2><p className="text-zinc-500 text-sm">{sales.length} registradas</p></div><Btn onClick={()=>setModal(true)} disabled={disponibles.length===0}>+ Registrar Venta</Btn></div>
      {sales.length===0&&<div className="text-center py-12 text-zinc-600"><p className="text-4xl mb-2">💰</p><p>Sin ventas aún</p></div>}
      <div className="space-y-2">
        {recent.map(v=>{
          const t=trucks.find(x=>x.id===v.camionId);
          const c=clients.find(x=>x.id===v.clienteId);
          return (
            <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div><p className="font-bold text-zinc-100">{v.nombrePieza}</p><p className="text-xs text-zinc-500">{v.id} · {t?.nombre||v.camionId}</p><p className="text-xs text-zinc-500 mt-0.5">{v.fecha} · {v.vendedor} · {v.canal}</p>{c&&<p className="text-xs text-sky-400 mt-0.5">👤 {c.nombre}</p>}{v.motivoDescuento&&<p className="text-xs text-zinc-400 italic mt-0.5">Desc: {v.motivoDescuento}</p>}</div>
                <div className="text-right"><p className="text-lg font-black text-amber-400">{fmt(v.precioFinal)}</p><p className="text-xs text-zinc-500">Base: {fmt(v.precioBase)}</p>{v.descuento>0&&<p className="text-xs text-red-400">−{fmt(v.descuento)}</p>}</div>
              </div>
            </div>
          );
        })}
      </div>
      {modal&&(
        <Modal title="Registrar Venta" onClose={()=>setModal(false)}>
          <div className="space-y-3">
            <Sel label="Pieza *" value={form.piezaId} onChange={e=>setForm(f=>({...f,piezaId:e.target.value,precioFinal:""}))}>
              <option value="">Seleccionar pieza…</option>
              {disponibles.map(p=>{const t=trucks.find(t=>t.id===p.camionId);return<option key={p.id} value={p.id}>{p.nombre} ({t?.nombre||p.camionId}) – {fmt(adjPrice(p.precioBase,p.condicion))}</option>;})}
            </Sel>
            {selPart&&(
              <div className="bg-zinc-800 rounded-lg p-3 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-zinc-400">Precio ajustado:</span><span className="text-amber-400 font-bold">{fmt(ajustado)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Precio mínimo:</span><span className="text-red-400 font-bold">{fmt(selPart.precioMinimo)}</span></div>
                <div className="flex justify-between"><span className="text-zinc-400">Tu límite de descuento:</span><span className="font-bold text-zinc-300">{user.rol==="admin"?"Sin límite 👑":`${user.maxDescuento}%`}</span></div>
              </div>
            )}
            <Sel label="Cliente (opcional)" value={form.clienteId} onChange={e=>setForm(f=>({...f,clienteId:e.target.value}))}><option value="">Sin cliente vinculado</option>{clients.map(c=><option key={c.id} value={c.id}>{c.nombre} ({TIPO_CLI[c.tipo]})</option>)}</Sel>
            <Inp label="Precio final $ *" type="number" value={form.precioFinal} onChange={e=>setForm(f=>({...f,precioFinal:e.target.value}))} />
            {warn&&<p className="text-xs text-red-400 font-semibold">{warn}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><Inp label={`Descuento ${descPct>0?`(${descPct}%)`:""}`} type="number" value={form.descuento} onChange={e=>setForm(f=>({...f,descuento:e.target.value}))} />{descWarn&&<p className="text-xs text-red-400 font-semibold mt-1">{descWarn}</p>}</div>
              <Inp label="Motivo" value={form.motivoDescuento} onChange={e=>setForm(f=>({...f,motivoDescuento:e.target.value}))} placeholder="Cliente frecuente…" />
            </div>
            <div className="grid grid-cols-2 gap-3"><Sel label="Canal" value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}>{CANALES.map(c=><option key={c}>{c}</option>)}</Sel><Inp label="Fecha" type="date" value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} /></div>
            <div className="flex gap-2 pt-2"><Btn onClick={save} disabled={!form.piezaId||!form.precioFinal||!!descWarn||saving}>{saving?<Spinner/>:"Registrar Venta"}</Btn><Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RENTABILIDAD ─────────────────────────────────────────────────
function Rentabilidad({ trucks, parts, sales, user }) {
  const [selected, setSelected] = useState(null);
  if(user.rol!=="admin") return <div className="text-center py-20 text-zinc-600"><p className="text-4xl mb-2">🔒</p><p className="font-semibold">Solo el Admin puede ver rentabilidad</p></div>;
  const data = trucks.map(t=>{
    const tp=parts.filter(p=>p.camionId===t.id);
    const ts=sales.filter(s=>s.camionId===t.id);
    const rec=ts.reduce((a,s)=>a+s.precioFinal,0);
    const inv=tp.filter(p=>p.estado==="disponible").reduce((a,p)=>a+adjPrice(p.precioBase,p.condicion),0);
    return {...t,partsCount:tp.length,vendidas:tp.filter(p=>p.estado==="vendida").length,recuperado:rec,enInventario:inv,utilidad:rec-t.costoCompra,pct:t.costoCompra>0?Math.round((rec/t.costoCompra)*100):0,ventas:ts,parts:tp};
  }).sort((a,b)=>b.pct-a.pct);
  return (
    <div className="space-y-4">
      <div><h2 className="text-2xl font-black text-zinc-100">Rentabilidad</h2><p className="text-zinc-500 text-sm">Análisis por camión</p></div>
      {data.length===0&&<div className="text-center py-12 text-zinc-600"><p className="text-4xl mb-2">📊</p><p>Sin datos</p></div>}
      <div className="space-y-3">
        {data.map(t=>(
          <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-700 transition" onClick={()=>setSelected(selected===t.id?null:t.id)}>
            <div className="flex flex-wrap justify-between items-start gap-2 mb-3"><div><p className="font-black text-zinc-100">{t.nombre}</p><p className="text-xs text-zinc-500">{t.id} · Compra: {fmt(t.costoCompra)} · {t.partsCount} piezas</p></div><div className="text-right"><p className={`text-xl font-black ${t.utilidad>=0?"text-emerald-400":"text-red-400"}`}>{t.utilidad>=0?"+":"−"}{fmt(Math.abs(t.utilidad))}</p><p className="text-xs text-zinc-500">{t.pct}% recuperado</p></div></div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-3"><div className={`h-2 rounded-full ${t.pct>=100?"bg-emerald-500":t.pct>=50?"bg-amber-500":"bg-red-500"}`} style={{width:`${Math.min(t.pct,100)}%`}} /></div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-sm font-bold text-zinc-100">{fmt(t.recuperado)}</p><p className="text-xs text-zinc-500">Recuperado</p></div>
              <div><p className="text-sm font-bold text-zinc-100">{fmt(t.enInventario)}</p><p className="text-xs text-zinc-500">En inventario</p></div>
              <div><p className="text-sm font-bold text-zinc-100">{t.vendidas}/{t.partsCount}</p><p className="text-xs text-zinc-500">Piezas vendidas</p></div>
            </div>
            {selected===t.id&&(
              <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3" onClick={e=>e.stopPropagation()}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ventas registradas</p>
                {t.ventas.length===0&&<p className="text-xs text-zinc-600">Sin ventas</p>}
                {t.ventas.map(v=><div key={v.id} className="flex justify-between text-sm py-1 border-b border-zinc-800 last:border-0"><span className="text-zinc-300">{v.nombrePieza}</span><span className="text-amber-400 font-bold">{fmt(v.precioFinal)}</span></div>)}
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-3">Piezas disponibles</p>
                {t.parts.filter(p=>p.estado==="disponible").map(p=><div key={p.id} className="flex justify-between text-sm"><span className="text-zinc-400">{p.nombre} <span className="text-zinc-600">({p.sistema})</span></span><span className="text-zinc-300">{fmt(adjPrice(p.precioBase,p.condicion))}</span></div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [sellers, setSellers]   = useState([]);
  const [clients, setClients]   = useState([]);
  const [trucks,  setTrucks]    = useState([]);
  const [parts,   setParts]     = useState([]);
  const [sales,   setSales]     = useState([]);
  const [user,    setUser]      = useState(null);
  const [view,    setView]      = useState("dashboard");
  const [loading, setLoading]   = useState(true);
  const [dbError, setDbError]   = useState(false);

  useEffect(()=>{
    (async()=>{
      try {
        const [s,c,t,p,v] = await Promise.all([
          sb.from("sellers").select("*"),
          sb.from("clients").select("*"),
          sb.from("trucks").select("*"),
          sb.from("parts").select("*"),
          sb.from("sales").select("*"),
        ]);
        if(s.error) throw s.error;
        setSellers((s.data||[]).map(mapSeller));
        setClients((c.data||[]).map(mapClient));
        setTrucks((t.data||[]).map(mapTruck));
        setParts((p.data||[]).map(mapPart));
        setSales((v.data||[]).map(mapSale));
      } catch(e) {
        console.error(e);
        setDbError(true);
      }
      setLoading(false);
    })();
  },[]);

  if(loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/><p className="text-zinc-400 text-sm">Conectando a la base de datos…</p></div>
    </div>
  );

  if(dbError) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="bg-zinc-900 border border-red-800/40 rounded-2xl p-8 max-w-md text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-black text-zinc-100 mb-2">Error de conexión</h2>
        <p className="text-zinc-400 text-sm mb-4">No se pudo conectar con Supabase. Verifica que las credenciales en el archivo sean correctas.</p>
        <code className="text-xs text-amber-400 bg-zinc-800 px-3 py-2 rounded-lg block">SUPABASE_URL y SUPABASE_ANON</code>
      </div>
    </div>
  );

  if(!user) return <Login sellers={sellers} onLogin={setUser} />;

  const nav = [
    {id:"dashboard",icon:"◈",label:"Panel"},
    {id:"camiones",icon:"🚛",label:"Camiones"},
    {id:"inventario",icon:"🔧",label:"Inventario"},
    {id:"ventas",icon:"💰",label:"Ventas"},
    {id:"clientes",icon:"👥",label:"Clientes"},
    ...(user.rol==="admin"?[{id:"vendedores",icon:"👤",label:"Vendedores"},{id:"rentabilidad",icon:"📊",label:"Rentabilidad"}]:[]),
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col" style={{fontFamily:"'DM Mono','Courier New',monospace"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@700;900&display=swap');*{box-sizing:border-box;}body{margin:0;}`}</style>
      <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black text-sm">D</div>
            <div><p className="font-black text-zinc-100 text-sm leading-none" style={{fontFamily:"'Space Grotesk',sans-serif"}}>DESHUESADERO</p><p className="text-zinc-500 text-xs">Sistema de Precios e Inventario</p></div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 hidden sm:block">{user.nombre}{user.rol==="admin"?" 👑":""}</span>
            <Btn size="sm" variant="ghost" onClick={()=>setUser(null)}>Salir</Btn>
          </div>
        </div>
      </header>
      <nav className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur sticky top-[57px] z-40">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)} className={`px-4 py-3 text-xs font-bold whitespace-nowrap transition border-b-2 -mb-px ${view===n.id?"border-amber-500 text-amber-400":"border-transparent text-zinc-500 hover:text-zinc-300"}`}>
              <span className="mr-1.5">{n.icon}</span>{n.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-6 w-full flex-1">
        {view==="dashboard"&&<Dashboard trucks={trucks} parts={parts} sales={sales} sellers={sellers} clients={clients} user={user}/>}
        {view==="camiones"&&<Camiones trucks={trucks} setTrucks={setTrucks} user={user}/>}
        {view==="inventario"&&<Inventario parts={parts} setParts={setParts} trucks={trucks}/>}
        {view==="ventas"&&<Ventas sales={sales} setSales={setSales} parts={parts} setParts={setParts} trucks={trucks} clients={clients} user={user}/>}
        {view==="clientes"&&<Clientes clients={clients} setClients={setClients} sales={sales} trucks={trucks}/>}
        {view==="vendedores"&&user.rol==="admin"&&<Vendedores sellers={sellers} setSellers={setSellers} user={user}/>}
        {view==="rentabilidad"&&user.rol==="admin"&&<Rentabilidad trucks={trucks} parts={parts} sales={sales} user={user}/>}
      </main>
      <footer className="border-t border-zinc-800 py-3 text-center text-zinc-700 text-xs">Deshuesadero · Sistema de Precios e Inventario</footer>
    </div>
  );
}
