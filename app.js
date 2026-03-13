
const STORAGE_KEY="towcalc_state_v2";
const SCHEMA_VERSION=1;
const FIRST_RUN_KEY="towcalc_first_run_complete";
let tripDirty=false;
function uuid(){ if(typeof crypto!=="undefined"&&crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);  updateTrailerComputed();
});
}

function defaultState(){
  return {
    schemaVersion: SCHEMA_VERSION,
    settings:{warnPct:90},
    trucks:[],
    trailers:[],
    trip:{truckId:null, trailerId:null, truckLoads:[], trailerLoads:[], twFixedPct:12.5}
  };
}

let state=defaultState();
const $=id=>document.getElementById(id);
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sum=a=>a.reduce((x,y)=>x+y,0);
const fmtLb=x=>Math.round(x).toLocaleString()+" lb";
const fmtPct=x=>(Math.round(x*10)/10).toFixed(1)+"%";

async function loadDefaultData(){
  try{
    const resp=await fetch("./default-data.json",{cache:"no-store"});
    if(!resp.ok) throw new Error("missing");
    const obj=await resp.json();
    if(!obj || typeof obj!=="object" || !Array.isArray(obj.trucks) || !Array.isArray(obj.trailers)) throw new Error("malformed");
    return obj;
  }catch(_e){
    return {schemaVersion:SCHEMA_VERSION,settings:{warnPct:90},trucks:[],trailers:[],trip:{truckId:null,trailerId:null,truckLoads:[],trailerLoads:[],twFixedPct:12.5}};
  }
}

function normalizeIds(s){
  if(Array.isArray(s.trucks)) s.trucks.forEach(t=>{ if(!t.id) t.id=uuid(); });
  if(Array.isArray(s.trailers)) s.trailers.forEach(t=>{ if(!t.id) t.id=uuid(); });
  if(s.trip && Array.isArray(s.trip.truckLoads)) s.trip.truckLoads.forEach(x=>{ if(!x.id) x.id=uuid(); });
  if(s.trip && Array.isArray(s.trip.trailerLoads)) s.trip.trailerLoads.forEach(x=>{ if(!x.id) x.id=uuid(); });
  return s;
}


function setEmptyState(box, msg){
  if(!box) return;
  if(!box.children.length){
    const d=document.createElement("div");
    d.className="muted small";
    d.style.padding="10px 6px";
    d.textContent=msg;
    box.appendChild(d);
  }
}

function escapeHtml(s){return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}

function markTripDirty(){
  tripDirty = true;
  const note = $("pendingNote");
  if(note) note.classList.remove("hidden");
}
function clearTripDirty(){
  tripDirty = false;
  const note = $("pendingNote");
  if(note) note.classList.add("hidden");
}

function markTruckDirty(){
  const note = $("truckPendingNote");
  if(note) note.classList.remove("hidden");
}
function clearTruckDirty(){
  const note = $("truckPendingNote");
  if(note) note.classList.add("hidden");
}
function markTrailerDirty(){
  const note = $("trailerPendingNote");
  if(note) note.classList.remove("hidden");
}
function clearTrailerDirty(){
  const note = $("trailerPendingNote");
  if(note) note.classList.add("hidden");
}

function activateTab(tabId){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tabId));
  document.querySelectorAll(".panel").forEach(p=>p.classList.toggle("active", p.id===tabId));
}


function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function hydrate(s){
  const d=defaultState();
  s.settings={...d.settings,...(s.settings||{})};
  s.trucks=Array.isArray(s.trucks)&&s.trucks.length?s.trucks:d.trucks;
  s.trailers=Array.isArray(s.trailers)&&s.trailers.length?s.trailers:d.trailers;
  s.trip={...d.trip,...(s.trip||{})};
  if(!s.trip.truckId||!s.trucks.find(t=>t.id===s.trip.truckId)) s.trip.truckId=s.trucks[0].id;
  if(!s.trip.trailerId||!s.trailers.find(t=>t.id===s.trip.trailerId)) s.trip.trailerId=s.trailers[0].id;

  if(Array.isArray(s.trip.passengers) && s.trip.passengers.length){
    if(!Array.isArray(s.trip.truckLoads)) s.trip.truckLoads = [];
    s.trip.passengers.forEach(p=>{
      let nm = p.name || "Passenger";
      if(nm==="Driver") nm="Gino";
      if(!s.trip.truckLoads.find(x => (x.name||"") === nm)){
        s.trip.truckLoads.push({ id: uuid(), name: nm, weight: Number.isFinite(+p.weight) ? +p.weight : 0 });
      }
    });
    delete s.trip.passengers;
  }
  
if(!Array.isArray(s.trip.truckLoads) || s.trip.truckLoads.length===0){
  s.trip.truckLoads = [
      { id: uuid(), name:"Driver", weight:180 },
      { id: uuid(), name:"Passenger", weight:150 },
      { id: uuid(), name:"Passenger", weight:120 }
    ];
}

  if(!Array.isArray(s.trip.trailerLoads) || s.trip.trailerLoads.length===0){
    const cargo = Number.isFinite(+s.trip.trailerCargo) ? +s.trip.trailerCargo : 0;
    const waterGal = Number.isFinite(+s.trip.freshWater) ? +s.trip.freshWater : 0;
    const propane = Number.isFinite(+s.trip.propane) ? +s.trip.propane : 0;
    const battCount = Number.isFinite(+s.trip.battCount) ? +s.trip.battCount : 0;
    const battEach = Number.isFinite(+s.trip.battEach) ? +s.trip.battEach : 0;
    s.trip.trailerLoads = [
      { id: uuid(), name:"Cargo", weight:cargo },
      { id: uuid(), name:"Fresh water", weight:(waterGal*8.34) },
      { id: uuid(), name:"Propane", weight:propane },
      { id: uuid(), name:"Batteries", weight:(battCount*battEach) }
    ];
  }

  if(!Number.isFinite(+s.trip.twFixedPct) || +s.trip.twFixedPct<=0){
    if(Number.isFinite(+s.trip.twHighPct) && +s.trip.twHighPct>0) s.trip.twFixedPct = +s.trip.twHighPct;
    else if(Number.isFinite(+s.trip.twLowPct) && +s.trip.twLowPct>0) s.trip.twFixedPct = +s.trip.twLowPct;
    else s.trip.twFixedPct = d.trip.twFixedPct;
  }
  delete s.trip.twMode;
  delete s.trip.twLowPct;
  delete s.trip.twHighPct;
  delete s.trip.presetId;
  return s;
}
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const obj=JSON.parse(raw);
    return obj && typeof obj==="object" ? obj : null;
  }catch(_e){
    return "__MALFORMED__";
  }
}

function getTruck(){return state.trucks.find(t=>t.id===state.trip.truckId)||state.trucks[0]||null;}
function getTrailer(){return state.trailers.find(t=>t.id===state.trip.trailerId)||state.trailers[0]||null;}
function estimateCurb(truck){const curb=+truck.curb||0;if(curb>0) return curb;return Math.max(0,(+truck.gvwr||0)-(+truck.payload||0));}

function calc(){
  const truck=getTruck(), tr=getTrailer(), set=state.settings, trip=state.trip;
  if(!truck || !tr){
    return {truck:truck||{}, tr:tr||{}, set, trip, loadedTrailer:0, trailerLoads:Array.isArray(trip.trailerLoads)?trip.trailerLoads:[], trailerLoadTotalLbs:0, dryRatio:0.12, tongueLow:0, tongueHigh:0, tongueLabel:"Loaded %", truckLoads:Array.isArray(trip.truckLoads)?trip.truckLoads:[], truckLoadTotal:0, payloadUsedHigh:0, payloadRemainingHigh:0, towOk:true, tongueOk:true, gvwrOk:true, gcwrOk:true, trailerGvwrOk:true, curb:0, estTruckWeightHigh:0, gcwrHigh:0, utilization:{payload:0,tongue:0,tow:0,gvwr:0,gcwr:0,trailerGvwr:0}};
  }
  const trailerLoads = Array.isArray(trip.trailerLoads) ? trip.trailerLoads : [];
  const trailerLoadTotalLbs = sum(trailerLoads.map(x => (+x.weight||0)));
  const loadedTrailer = (+tr.dry||0) + trailerLoadTotalLbs;
  const dryRatio=((+tr.dryTongue||0)>0 && (+tr.dry||0)>0)?((+tr.dryTongue||0)/(+tr.dry||1)):0.12;

  const pct=(+trip.twFixedPct||12.5)/100;
  const tongueLow=pct*loadedTrailer;
  const tongueHigh=tongueLow;
  const tongueLabel="Loaded %";

  const truckLoads = Array.isArray(trip.truckLoads)? trip.truckLoads : [];
  const truckLoadTotal = sum(truckLoads.map(x=>+x.weight||0));
  const payloadUsedHigh = truckLoadTotal + tongueHigh;
  const payloadRemainingHigh=(+truck.payload||0)-payloadUsedHigh;

  const towOk=loadedTrailer<=(+truck.maxTow||0);
  const tongueOk=tongueHigh<=(+truck.maxTongue||0);

  const curb=estimateCurb(truck);
  const estTruckWeightHigh=curb+truckLoadTotal+tongueHigh;
  const gvwrOk=estTruckWeightHigh<=(+truck.gvwr||0);

  const gcwrHigh=estTruckWeightHigh+loadedTrailer;
  const gcwrOk=gcwrHigh<=(+truck.gcwr||0);

  const trailerGvwrOk=loadedTrailer<=(+tr.gvwr||0);

  const utilization={
    payload:(+truck.payload||0)>0?payloadUsedHigh/(+truck.payload||1):0,
    tongue:(+truck.maxTongue||0)>0?tongueHigh/(+truck.maxTongue||1):0,
    tow:(+truck.maxTow||0)>0?loadedTrailer/(+truck.maxTow||1):0,
    gvwr:(+truck.gvwr||0)>0?estTruckWeightHigh/(+truck.gvwr||1):0,
    gcwr:(+truck.gcwr||0)>0?gcwrHigh/(+truck.gcwr||1):0,
    trailerGvwr:(+tr.gvwr||0)>0?loadedTrailer/(+tr.gvwr||1):0
  };

  return {truck,tr,set,trip,loadedTrailer,trailerLoads,trailerLoadTotalLbs,dryRatio,tongueLow,tongueHigh,tongueLabel,truckLoads,truckLoadTotal,payloadUsedHigh,payloadRemainingHigh,towOk,tongueOk,gvwrOk,gcwrOk,trailerGvwrOk,curb,estTruckWeightHigh,gcwrHigh,utilization};
}

function pillClass(ok, util){
  const warnPct=(+state.settings.warnPct||90)/100;
  if(!ok) return "bad";
  if(util>=warnPct) return "warn";
  return "ok";
}


let selectedTruckId=null, selectedTrailerId=null;
function ensureSelections(){ if(!selectedTruckId&&state.trucks[0]) selectedTruckId=state.trucks[0].id; if(!selectedTrailerId&&state.trailers[0]) selectedTrailerId=state.trailers[0].id; }

async function initState(){
  const defaults=normalizeIds(await loadDefaultData());
  const loaded=loadState();
  if(loaded==="__MALFORMED__"){
    state=hydrate(defaults, defaults);
    saveState();
    alert("TowCalc was unable to load saved data. Default data has been loaded. If you exported a backup, use Import to restore it.");
  }else if(loaded){
    state=hydrate(loaded, defaults);
    saveState();
  }else{
    state=hydrate(defaults, defaults);
    saveState();
  }
}

function maybeShowFirstRunSplash(){
  const splash=$("firstRunSplash");
  const btn=$("btnSplashDismiss");
  if(!splash || !btn) return;
  if(localStorage.getItem(FIRST_RUN_KEY)==="1"){ splash.classList.add("hidden"); return; }
  splash.classList.remove("hidden");
  btn.onclick=()=>{ localStorage.setItem(FIRST_RUN_KEY,"1"); splash.classList.add("hidden"); };
}

function initTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
      if(btn.dataset.tab==="tab-results") renderResults();
    });
  });
}

function renderLists(){
  const list=$("truckList"); list.innerHTML="";
  if(!state.trucks.length) setEmptyState(list, 'No trucks yet. Click "New truck" to add one.');
  state.trucks.forEach(t=>{
    const div=document.createElement("div");
    div.className="item"+(t.id===selectedTruckId?" active":"");
    div.innerHTML=`<div><div class="name">${escapeHtml(t.name||"Unnamed truck")}</div><div class="meta">Payload ${fmtLb(t.payload||0)} • Tow ${fmtLb(t.maxTow||0)} • GVWR ${fmtLb(t.gvwr||0)}</div></div>`;
    div.onclick=()=>{selectedTruckId=t.id; renderLists(); renderTruckForm(); syncTripSelectors(); saveState();};
    list.appendChild(div);
  });

  const listT=$("trailerList"); listT.innerHTML="";
  if(!state.trailers.length) setEmptyState(listT, 'No trailers yet. Click "New trailer" to add one.');
  state.trailers.forEach(tr=>{
    const div=document.createElement("div");
    div.className="item"+(tr.id===selectedTrailerId?" active":"");
    div.innerHTML=`<div><div class="name">${escapeHtml(tr.name||"Unnamed trailer")}</div><div class="meta">Dry ${fmtLb(tr.dry||0)} • GVWR ${fmtLb(tr.gvwr||0)} • Dry tongue ${Math.round(tr.dryTongue||0).toLocaleString()} lb</div></div>`;
    div.onclick=()=>{selectedTrailerId=tr.id; renderLists(); renderTrailerForm(); updateTrailerComputed(); syncTripSelectors(); saveState();};
    listT.appendChild(div);
  });
  setEmptyState($("truckList"), 'No trucks yet. Click “New truck” to add one.');
  setEmptyState($("trailerList"), 'No trailers yet. Click “New trailer” to add one.');
}

function renderTruckForm(){
  const t=state.trucks.find(x=>x.id===selectedTruckId)||state.trucks[0]; if(!t){ ["truckName","truckGVWR","truckGCWR","truckPayload","truckTow","truckTongue","truckCurb","truckRearGawr","truckFrontGawr","truckReceiverRating","truckHitchRating","truckBallRating","truckTireRating"].forEach(id=>{ if($(id)) $(id).value=""; }); return; }
  $("truckName").value=t.name||"";
  $("truckGVWR").value=t.gvwr||0;
  $("truckGCWR").value=t.gcwr||0;
  $("truckPayload").value=t.payload||0;
  $("truckTow").value=t.maxTow||0;
  $("truckTongue").value=t.maxTongue||0;
  $("truckCurb").value=t.curb||0;
  $("truckRearGawr").value=t.rearGawr||0;
  $("truckFrontGawr").value=t.frontGawr||0;
  $("truckReceiverRating").value=t.receiverRating||0;
  $("truckHitchRating").value=t.hitchRating||0;
  $("truckBallRating").value=t.ballRating||0;
  $("truckTireRating").value=t.tireRating||0;
}
function renderTrailerForm(){

  const tr=state.trailers.find(x=>x.id===selectedTrailerId)||state.trailers[0]; if(!tr){ ["trailerName","trailerDry","trailerDryTongue","trailerGVWR","trailerFreshCap"].forEach(id=>{ if($(id)) $(id).value=""; }); ["trCalcPayload","trCalcDryTonguePct","trCalcGrossHitch"].forEach(id=>{ if($(id)) $(id).textContent="—"; }); return; }
  $("trailerName").value=tr.name||"";
  $("trailerDry").value=tr.dry||0;
  $("trailerDryTongue").value=tr.dryTongue||0;
  $("trailerGVWR").value=tr.gvwr||0;
  $("trailerFreshCap").value=tr.freshCap||0;
  updateTrailerComputed();
}

function bindTruckForm(){
  const fields=[["truckName","name",v=>v],["truckGVWR","gvwr",num],["truckGCWR","gcwr",num],["truckPayload","payload",num],["truckTow","maxTow",num],["truckTongue","maxTongue",num],["truckCurb","curb",num],["truckRearGawr","rearGawr",num],["truckFrontGawr","frontGawr",num],["truckReceiverRating","receiverRating",num],["truckHitchRating","hitchRating",num],["truckBallRating","ballRating",num],["truckTireRating","tireRating",num]];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const t=state.trucks.find(x=>x.id===selectedTruckId); if(!t) return;
      t[key]=coerce($(id).value);
      saveState(); syncTripSelectors(); markTruckDirty();
    });
  });
}

function updateTrailerComputed(){
  // Use the app's selected trailer id (used throughout the trailers UI)
  const id = (typeof selectedTrailerId !== "undefined" ? selectedTrailerId : null) || null;
  const tr = state.trailers.find(t=>t.id===id) || null;
  const elPayload = $("trCalcPayload");
  const elPct = $("trCalcDryTonguePct");
  const elGross = $("trCalcGrossHitch");
  if(!elPayload || !elPct || !elGross) return;

  if(!tr){
    elPayload.textContent = "—";
    elPct.textContent = "—";
    elGross.textContent = "—";
    return;
  }
  const dry = +tr.dry||0;
  const gvwr = +tr.gvwr||0;
  const dryTongue = +tr.dryTongue||0;

  const payload = gvwr - dry;
  const pct = (dry>0) ? (dryTongue/dry*100) : NaN;
  const grossHitch = (isFinite(pct) ? gvwr*(pct/100) : NaN);

  elPayload.textContent = fmtLb(payload);
  elPct.textContent = (isFinite(pct) ? pct.toFixed(1) : "—") + "%";
  elGross.textContent = (isFinite(grossHitch) ? fmtLb(grossHitch) : "—");
}


function bindTrailerForm(){
  const fields=[["trailerName","name",v=>v],["trailerDry","dry",num],["trailerDryTongue","dryTongue",num],["trailerGVWR","gvwr",num],["trailerFreshCap","freshCap",num]];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const tr=state.trailers.find(x=>x.id===selectedTrailerId); if(!tr) return;
      tr[key]=coerce($(id).value);
      saveState(); syncTripSelectors(); updateTrailerComputed(); markTrailerDirty();
    });
  });
}

function syncTripSelectors(){
  const selTruck=$("tripTruck"), selTrailer=$("tripTrailer");
  selTruck.innerHTML="";
  state.trucks.forEach(t=>{const o=document.createElement("option");o.value=t.id;o.textContent=t.name||"Unnamed truck";selTruck.appendChild(o);});
  selTrailer.innerHTML="";
  state.trailers.forEach(tr=>{const o=document.createElement("option");o.value=tr.id;o.textContent=tr.name||"Unnamed trailer";selTrailer.appendChild(o);});
  if(!state.trucks.find(t=>t.id===state.trip.truckId)) state.trip.truckId=state.trucks[0]?.id||"";
  if(!state.trailers.find(t=>t.id===state.trip.trailerId)) state.trip.trailerId=state.trailers[0]?.id||"";
  selTruck.value=state.trip.truckId||"";
  selTrailer.value=state.trip.trailerId||"";
}


function renderTruckLoads(){
  const box = $("truckLoads");
  if(!box) return;
  box.innerHTML = "";
  if(!Array.isArray(state.trip.truckLoads)) state.trip.truckLoads = [];
  if(!state.trip.truckLoads.length) setEmptyState(box, 'No truck loads yet. Click "Add load" to add one.');
  state.trip.truckLoads.forEach(item=>{
    const row = document.createElement("div");
    row.className = "passRow";
    row.innerHTML = `
      <input data-id="${item.id}" class="truckLoadName" type="text" value="${escapeHtml(item.name||"Load")}" placeholder="Load name"/>
      <input data-id="${item.id}" class="truckLoadWeight" type="number" step="1" min="0" value="${item.weight||0}" placeholder="Weight (lb)"/>
      <button class="btn btn-danger" data-id="${item.id}">✕</button>
    `;
    row.querySelector("button").onclick = ()=>{
      state.trip.truckLoads = state.trip.truckLoads.filter(x=>x.id!==item.id);
      saveState(); renderTruckLoads(); markTripDirty();
    };
    row.querySelector(".truckLoadName").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.truckLoads.find(x=>x.id===id);
      if(obj){ obj.name = e.target.value; saveState(); }
    };
    row.querySelector(".truckLoadWeight").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.truckLoads.find(x=>x.id===id);
      if(obj){ obj.weight = num(e.target.value); saveState(); markTripDirty(); }
    };
    box.appendChild(row);
  });
}


function renderTrailerLoads(){
  const box = $("trailerLoads");
  if(!box) return;
  box.innerHTML = "";
  if(!Array.isArray(state.trip.trailerLoads)) state.trip.trailerLoads = [];
  if(!state.trip.trailerLoads.length) setEmptyState(box, 'No trailer loads yet. Click "Add load" to add one.');
  state.trip.trailerLoads.forEach(item=>{
    const row = document.createElement("div");
    row.className = "passRow";
    row.innerHTML = `
      <input data-id="${item.id}" class="trailerLoadName" type="text" value="${escapeHtml(item.name||"Load")}" placeholder="Load name"/>
      <input data-id="${item.id}" class="trailerLoadWeight" type="number" step="0.5" min="0" value="${item.weight||0}" placeholder="Weight (lb)"/>
      <button class="btn btn-danger" data-id="${item.id}">✕</button>
    `;
    row.querySelector("button").onclick = ()=>{
      state.trip.trailerLoads = state.trip.trailerLoads.filter(x=>x.id!==item.id);
      saveState(); renderTrailerLoads(); markTripDirty();
    };
    row.querySelector(".trailerLoadName").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.trailerLoads.find(x=>x.id===id);
      if(obj){ obj.name = e.target.value; saveState(); markTripDirty(); }
    };
    row.querySelector(".trailerLoadWeight").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.trailerLoads.find(x=>x.id===id);
      if(obj){ obj.weight = num(e.target.value); saveState(); markTripDirty(); }
    };
    box.appendChild(row);
  });
}

function renderTrip(){
  $("twFixedPct").value=state.trip.twFixedPct ?? 12.5;
  renderTruckLoads();
  renderTrailerLoads();
}

function bindTrip(){
  $("tripTruck").addEventListener("change",e=>{state.trip.truckId=e.target.value; saveState(); markTripDirty();});
  $("tripTrailer").addEventListener("change",e=>{state.trip.trailerId=e.target.value; saveState(); markTripDirty();});

  const btnAdd = $("btnAddLoad");
  if(btnAdd){
    btnAdd.onclick = ()=>{
      if(!Array.isArray(state.trip.truckLoads)) state.trip.truckLoads = [];
      state.trip.truckLoads.push({ id: uuid(), name:"Load", weight:0 });
      saveState(); renderTruckLoads(); markTripDirty();
    };
  }

  const btnAddTrailer = $("btnAddTrailerLoad");
  if(btnAddTrailer){
    btnAddTrailer.onclick = ()=>{
      if(!Array.isArray(state.trip.trailerLoads)) state.trip.trailerLoads = [];
      state.trip.trailerLoads.push({ id: uuid(), name:"Load", weight:0 });
      saveState(); renderTrailerLoads(); markTripDirty();
    };
  }

  $("twFixedPct").addEventListener("input",e=>{state.trip.twFixedPct=num(e.target.value); saveState(); markTripDirty();});
}

function bindSettings(){
  $("warnPct").value=state.settings.warnPct;
  $("warnPct").addEventListener("input",e=>{state.settings.warnPct=clamp(num(e.target.value),50,100); saveState(); markTripDirty();});
}


function clampPct(x){ return Math.max(0, Math.min(200, x)); }
function utilClass(pct){
  if(pct >= 100) return "util-red";
  if(pct >= 90) return "util-yellow";
  return "util-green";
}
function renderUtilMeters(r){
  const box = $("utilChart");
  if(!box) return;
  const items = [
    { key:"Payload", used:r.payloadUsedHigh, limit:(+r.truck?.payload||0) },
    { key:"Tongue weight", used:r.tongueHigh, limit:(+r.truck?.maxTongue||0) },
    { key:"Towing capacity", used:r.loadedTrailer, limit:(+r.truck?.maxTow||0) },
    { key:"Trailer weight", used:r.loadedTrailer, limit:(+r.tr?.gvwr||0) },
    { key:"Truck weight", used:r.estTruckWeightHigh, limit:(+r.truck?.gvwr||0) },
    { key:"Truck/trailer combined weight", used:r.gcwrHigh, limit:(+r.truck?.gcwr||0) }].filter(x => x.limit && x.limit > 0);

  box.innerHTML = `<div class="utilmeters">
    ${items.map(it=>{
      const pct = clampPct((it.used/it.limit)*100);
      const cls = utilClass(pct);
      const w = Math.min(100, pct);
      return `<div class="utilmeter ${cls}">
        <div>
          <div class="small"><b>${it.key}</b> <span class="muted">${fmtLb(it.used)} / ${fmtLb(it.limit)}</span></div>
          <div class="bar"><div class="fill" style="width:${w}%;"></div></div>
        </div>
        <div class="pct">${pct.toFixed(0)}%</div>
      </div>`;
    }).join("")}
  </div>`;
}

function renderResults(){
  const r=calc();
  const hdr=$("resultsHeaderText");
  if(hdr){ const t=getTruck(), tr=getTrailer(); hdr.innerHTML=(t&&tr)?`<b>${escapeHtml(t.name||"Truck")}</b> towing <b>${escapeHtml(tr.name||"Trailer")}</b>`:"Add a truck and trailer to begin."; }
  if(!getTruck() || !getTrailer()){
    $("resultsSummary").innerHTML="";
    $("resultsDetails").innerHTML=`<div class="card"><div class="label muted small">Selected</div><div><b>Add a truck and trailer</b> to start using TowCalc.</div></div>`;
    $("warnings").innerHTML=`<div class="warnItem"><div class="warnTitle">No data yet</div><div class="muted small">Add a truck and trailer, then enter trip loads.</div></div>`;
    const util=$("utilChart"); if(util) util.innerHTML=`<div class="muted small">Utilization appears here after you add a truck and trailer.</div>`;
    return;
  }
  const hintEl = $("dryRatioHint");
  if(hintEl){ hintEl.textContent = `Dry ratio (dry tongue ÷ dry weight) for this trailer is ${(r.dryRatio*100).toFixed(1)}%`; }

  const warnPct=(+state.settings.warnPct||90)/100;

  
const cards=[
  // Payload
  (()=>{
    const limit = (+r.truck.payload||0);
    const used = r.payloadUsedHigh;
    const rem = limit - used;
    return {title:"Payload",
      value:(rem<0)?`${fmtLb(Math.abs(rem))} over limit`:`${fmtLb(rem)} remaining`,
      sub:`${fmtLb(used)} used of ${fmtLb(limit)}`,
      ok: rem>=0,
      util: (limit>0)? (used/limit) : 0
    };
  })(),
  // Tongue weight
  (()=>{
    const limit = (+r.truck.maxTongue||0);
    const used = r.tongueHigh;
    const util = (limit>0)? (used/limit) : 0;
    return {title:"Tongue weight",
      value:`${fmtLb(r.tongueHigh)}`,
      sub:`${fmtLb(r.tongueHigh)} used of ${fmtLb(limit)} max (WDH)`,
      ok: used<=limit || limit===0 ? r.tongueOk : (used<=limit),
      util
    };
  })(),
  // Towing capacity
  (()=>{
    const limit = (+r.truck.maxTow||0);
    const used = r.loadedTrailer;
    const rem = limit - used;
    const util = (limit>0)? (used/limit) : 0;
    return {title:"Towing capacity",
      value:(rem<0)?`${fmtLb(Math.abs(rem))} over limit`:`${fmtLb(rem)} remaining`,
      sub:`${fmtLb(used)} used of ${fmtLb(limit)}`,
      ok: used<=limit || limit===0 ? true : (used<=limit),
      util
    };
  })(),
  // Trailer weight (vs trailer GVWR)
  (()=>{
    const limit = (+r.tr.gvwr||0);
    const used = r.loadedTrailer;
    const rem = limit - used;
    const util = (limit>0)? (used/limit) : 0;
    return {title:"Trailer weight",
      value:(rem<0)?`${fmtLb(Math.abs(rem))} over limit`:`${fmtLb(rem)} remaining`,
      sub:`${fmtLb(used)} used of ${fmtLb(limit)} GVWR`,
      ok: used<=limit || limit===0 ? true : (used<=limit),
      util
    };
  })(),
  // Truck weight (vs truck GVWR)
  (()=>{
    const limit = (+r.truck.gvwr||0);
    const used = r.estTruckWeightHigh;
    const rem = limit - used;
    const util = (limit>0)? (used/limit) : 0;
    return {title:"Truck weight",
      value:(rem<0)?`${fmtLb(Math.abs(rem))} over limit`:`${fmtLb(rem)} remaining`,
      sub:`${fmtLb(used)} used of ${fmtLb(limit)} GVWR (est.)`,
      ok: used<=limit || limit===0 ? true : (used<=limit),
      util
    };
  })(),
  // Combined weight (vs GCWR)
  (()=>{
    const limit = (+r.truck.gcwr||0);
    const used = r.gcwrHigh;
    const rem = limit - used;
    const util = (limit>0)? (used/limit) : 0;
    return {title:"Truck/trailer combined weight",
      value:(rem<0)?`${fmtLb(Math.abs(rem))} over limit`:`${fmtLb(rem)} remaining`,
      sub:`${fmtLb(used)} used of ${fmtLb(limit)} GCWR (est.)`,
      ok: used<=limit || limit===0 ? true : (used<=limit),
      util
    };
  })()];
const wrap=$("resultsSummary"); wrap.innerHTML="";
  cards.forEach(c=>{
    const div=document.createElement("div");
    const klass=pillClass(c.ok,c.util);
    div.className="card kpi";
    div.innerHTML=`<div class="label">${escapeHtml(c.title)}</div><div class="value">${escapeHtml(c.value)}</div><div class="sub">${escapeHtml(c.sub)}</div><div class="pill ${klass}">${klass==="ok"?"OK":(klass==="warn"?"CAUTION":"OVER LIMIT")}</div>`;
    wrap.appendChild(div);
  });

    
$("resultsDetails").innerHTML=`
  <div class="card"><div class="label muted small">Selected</div><div><b>${escapeHtml(r.truck.name||"Truck")}</b> towing <b>${escapeHtml(r.tr.name||"Trailer")}</b></div></div>
  <div class="card"><div class="label muted small">Load breakdown</div>
    <div class="muted small">Truck loads: ${fmtLb(r.truckLoadTotal)}</div>
    <div class="muted small">Trailer loads: ${fmtLb(r.trailerLoadTotalLbs)}</div>
  </div>
`;

  const w=[];
  if(r.payloadRemainingHigh<0) w.push({level:"bad",title:"Over payload",msg:`Payload exceeded by ${fmtLb(-r.payloadRemainingHigh)} (high tongue).`});
  else if(r.utilization.payload>=warnPct) w.push({level:"warn",title:"Payload near limit",msg:`You are at ${(r.utilization.payload*100).toFixed(1)}% of payload.`});

  if(!r.tongueOk) w.push({level:"bad",title:"Over tongue rating (WDH)",msg:`Tongue (high) ${fmtLb(r.tongueHigh)} vs max ${fmtLb(r.truck.maxTongue||0)}.`});
  else if(r.utilization.tongue>=warnPct) w.push({level:"warn",title:"Tongue near limit",msg:`Tongue is ${(r.utilization.tongue*100).toFixed(1)}% of max.`});

// Hardware ratings (if provided)
if((+r.truck.receiverRating||0)>0 && r.tongueHigh>(+r.truck.receiverRating||0)) w.push({level:"bad",title:"Tongue over hitch receiver rating",msg:`Tongue (high) ${fmtLb(r.tongueHigh)} exceeds receiver rating ${fmtLb(+r.truck.receiverRating||0)}.`});
if((+r.truck.hitchRating||0)>0 && r.tongueHigh>(+r.truck.hitchRating||0)) w.push({level:"bad",title:"Tongue over hitch rating",msg:`Tongue (high) ${fmtLb(r.tongueHigh)} exceeds hitch rating ${fmtLb(+r.truck.hitchRating||0)}.`});
if((+r.truck.ballRating||0)>0 && r.tongueHigh>(+r.truck.ballRating||0)) w.push({level:"bad",title:"Tongue over hitch ball rating",msg:`Tongue (high) ${fmtLb(r.tongueHigh)} exceeds ball rating ${fmtLb(+r.truck.ballRating||0)}.`});

  if(!r.towOk) w.push({level:"bad",title:"Over tow rating",msg:`Trailer weight ${fmtLb(r.loadedTrailer)} exceeds max tow ${fmtLb(r.truck.maxTow||0)}.`});
  else if(r.utilization.tow>=warnPct) w.push({level:"warn",title:"Tow rating near limit",msg:`Trailer weight is ${(r.utilization.tow*100).toFixed(1)}% of max tow.`});

  if(!r.trailerGvwrOk) w.push({level:"bad",title:"Over trailer GVWR",msg:`Trailer weight ${fmtLb(r.loadedTrailer)} exceeds trailer GVWR ${fmtLb(r.tr.gvwr||0)}.`});
  else if(r.utilization.trailerGvwr>=warnPct) w.push({level:"warn",title:"Trailer GVWR near limit",msg:`Trailer weight is ${(r.utilization.trailerGvwr*100).toFixed(1)}% of GVWR.`});

  if(!r.gvwrOk) w.push({level:"bad",title:"Over truck weight",msg:`Estimated truck weight ${fmtLb(r.estTruckWeightHigh)} exceeds GVWR ${fmtLb(r.truck.gvwr||0)}.`});
  else if(r.utilization.gvwr>=warnPct) w.push({level:"warn",title:"Truck weight near limit",msg:`Truck is ${(r.utilization.gvwr*100).toFixed(1)}% of GVWR.`});

  if(!r.gcwrOk) w.push({level:"bad",title:"Over GCWR (estimated)",msg:`Combined est ${fmtLb(r.gcwrHigh)} exceeds GCWR ${fmtLb(r.truck.gcwr||0)}.`});
  else if(r.utilization.gcwr>=warnPct) w.push({level:"warn",title:"GCWR near limit",msg:`Combined is ${(r.utilization.gcwr*100).toFixed(1)}% of GCWR.`});

  if(!w.length) w.push({level:"ok",title:"No issues detected",msg:"Based on current inputs and assumptions, key limits are within range."});

  const warnBox=$("warnings"); warnBox.innerHTML="";
  const wShow=(w.length>1)?w.slice(0,3):w;
  wShow.forEach(x=>{
    const div=document.createElement("div");
    div.className="warnItem "+(x.level==="bad"?"bad":(x.level==="warn"?"warn":""));
    div.innerHTML=`<div class="warnTitle">${escapeHtml(x.title)}</div><div class="muted small">${escapeHtml(x.msg)}</div>`;
    warnBox.appendChild(div);
  });

  renderUtilMeters(r);
}

function bindCrud(){
  $("btnNewTruck").onclick=()=>{
    const t={id:uuid(),name:"New truck",gvwr:0,gcwr:0,payload:0,maxTow:0,maxTongue:0,curb:0,rearGawr:0,frontGawr:0,receiverRating:0,hitchRating:0,ballRating:0,tireRating:0};
    state.trucks.unshift(t); selectedTruckId=t.id; saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); markTruckDirty(); focusTextEnd($("truckName"));
  };
  $("btnDelTruck").onclick=()=>{
    const t=state.trucks.find(x=>x.id===selectedTruckId);
    if(!t) return;
    if(!confirm(`Delete truck "${(t.name)||"Truck"}"?`)) return;
    if(state.trucks.length<=1) return alert("Keep at least one truck.");
    state.trucks=state.trucks.filter(x=>x.id!==selectedTruckId);
    selectedTruckId=state.trucks[0].id;
    if(!state.trucks.find(x=>x.id===state.trip.truckId)) state.trip.truckId=state.trucks[0].id;
    saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults(); clearTruckDirty();
  };

  $("btnNewTrailer").onclick=()=>{
    const tr={id:uuid(),name:"New trailer",dry:0,dryTongue:0,gvwr:0,freshCap:0};
    state.trailers.unshift(tr); selectedTrailerId=tr.id; saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); updateTrailerComputed(); markTrailerDirty(); focusTextEnd($("trailerName"));
  };
  $("btnDelTrailer").onclick=()=>{
    const t=state.trailers.find(x=>x.id===selectedTrailerId);
    if(!t) return;
    if(!confirm(`Delete trailer "${(t.name)||"Trailer"}"?`)) return;
    if(state.trailers.length<=1) return alert("Keep at least one trailer.");
    state.trailers=state.trailers.filter(x=>x.id!==selectedTrailerId);
    selectedTrailerId=state.trailers[0].id;
    if(!state.trailers.find(x=>x.id===state.trip.trailerId)) state.trip.trailerId=state.trailers[0].id;
    saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); updateTrailerComputed(); renderResults(); clearTrailerDirty();
  };
}

function bindBackup(){
  $("btnImport").onclick=()=>{ $("fileImport").click(); };
  $("btnExport").onclick=()=>{
    const s = JSON.parse(JSON.stringify(state));
    if(s.trip){ delete s.trip.passengers; delete s.trip.twMode; delete s.trip.twLowPct; delete s.trip.twHighPct; delete s.trip.presetId; }
    const blob=new Blob([JSON.stringify(s,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="towcalc-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };
  $("fileImport").addEventListener("change", async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const obj=JSON.parse(await f.text());
      const defaults=await loadDefaultData();
      state=hydrate(obj, defaults);
      ensureSelections();
      selectedTruckId=state.trucks[0]?.id||null; selectedTrailerId=state.trailers[0]?.id||null;
      saveState(); boot(true);
      alert("Imported successfully.");
    }catch(err){ alert("Import failed: "+err); }
    finally{ e.target.value=""; }
  });
  $("btnReset").onclick=async ()=>{
    if(!confirm("Reset TowCalc? This deletes local data on this device.")) return;
    localStorage.removeItem(STORAGE_KEY);
    const defaults=await loadDefaultData();
    state=hydrate(defaults, defaults);
    ensureSelections();
    selectedTruckId=state.trucks[0]?.id||null; selectedTrailerId=state.trailers[0]?.id||null;
    saveState(); boot(true);
  };
}




function bindSaveButtons(){
  const btnTruck=$("btnSaveTruck");
  if(btnTruck) btnTruck.onclick=()=>{
    renderLists();
    renderTruckForm();
    syncTripSelectors();
    renderResults();
    clearTruckDirty();
    activateTab("tab-trucks");
    scrollTopNow();
  };
  const btnTrailer=$("btnSaveTrailer");
  if(btnTrailer) btnTrailer.onclick=()=>{
    renderLists();
    renderTrailerForm();
    syncTripSelectors();
    updateTrailerComputed();
    renderResults();
    clearTrailerDirty();
    activateTab("tab-trailers");
    scrollTopNow();
  };
}

function bindCalculate(){
  const btn = $("btnCalculate");
  if(!btn) return;
  btn.onclick = ()=>{
    clearTripDirty();
    renderResults();
    activateTab("tab-results");
    scrollTopNow();
  };
}

function boot(rerender=false){
  ensureSelections();
  if(!selectedTruckId) selectedTruckId=state.trucks[0]?.id||null;
  if(!selectedTrailerId) selectedTrailerId=state.trailers[0]?.id||null;

  syncTripSelectors();
  renderLists();
  renderTruckForm();
  renderTrailerForm();
  renderTrip();
  bindSettings();
  renderResults();
  clearTruckDirty();
  clearTrailerDirty();
  clearTripDirty();
  bindNumericFieldUx();

  if(rerender) return;

  initTabs();
  bindTruckForm();
  bindTrailerForm();
  bindTrip();
  bindCalculate();
  bindSaveButtons();
  bindCrud();
  bindBackup();
  bindNumericFieldUx();

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
  maybeShowFirstRunSplash();
}

async function startApp(){
  await initState();
  boot();
}

startApp();
function drawUtilChart(r){ try{ renderUtilMeters(r); }catch(e){} }
