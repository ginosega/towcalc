/* TowCalc PWA (offline-first)
   Data model:
   state = { trucks:[], trailers:[], trip:{...}, settings:{...} }
*/
const STORAGE_KEY = "towcalc_state_v1";

const defaults = () => ({
  settings: {
    waterLbPerGal: 8.34,
    warnPct: 90
  },
  trucks: [
    {
        "id": "53ee3eac-d4e3-4913-b8f7-d62e548ff919",
        "name": "2021 Ford F-150 PowerBoost Lariat 4x4 (5.5' bed)",
        "gvwr": 7350,
        "gcwr": 17000,
        "payload": 1391,
        "maxTow": 9650,
        "maxTongue": 1160,
        "curb": 0,
        "rearGawr": 4150,
        "frontGawr": 3900
    }
  ],
  trailers: [
    {
        "id": "15c5550b-ee6c-4496-a82e-07fa3a8d86d7",
        "name": "Lance 1995",
        "dry": 5273,
        "dryTongue": 559,
        "gvwr": 7000,
        "freshCap": 45
    },
        {
        "id": "30410d6a-36a8-4336-8e27-073f786d34d1",
        "name": "Brinkley I 265",
        "dry": 7012,
        "dryTongue": 650,
        "gvwr": 9600,
        "freshCap": 55
    },
        {
        "id": "cf8d4342-949d-4330-9342-9fbf884094e8",
        "name": "Lance 1985",
        "dry": 5259,
        "dryTongue": 642,
        "gvwr": 7000,
        "freshCap": 45
    },
        {
        "id": "a220f031-6746-42cd-a546-5e4302625ba4",
        "name": "Apex Nano",
        "dry": 3495,
        "dryTongue": 370,
        "gvwr": 4700,
        "freshCap": 50
    }
  ],
  trip: {
    truckId: "53ee3eac-d4e3-4913-b8f7-d62e548ff919",
    trailerId: "15c5550b-ee6c-4496-a82e-07fa3a8d86d7",
    presetId: "winter_boondock",
    passengers: [{ id: crypto.randomUUID(), name: "Driver", weight: 180 }],
    truckCargo: 320,
    hitchHardware: 90,
    trailerCargo: 1200,
    freshWater: 20,
    propane: 60,
    battCount: 2,
    battEach: 60,
    twMode: "range",
    twFixedPct: 12.5,
    twLowPct: 13.0,
    twHighPct: 15.5
  }
});
});

const presets = [
  {
    id: "summer_hookups",
    name: "Summer • Hookups",
    tripPatch: {
      truckCargo: 180,
      hitchHardware: 80,
      trailerCargo: 700,
      freshWater: 5,
      propane: 40,
      battCount: 2,
      battEach: 60,
      twMode: "range",
      twLowPct: 11.5,
      twHighPct: 13.5
    }
  },
  {
    id: "summer_boondock",
    name: "Summer • Boondock",
    tripPatch: {
      truckCargo: 220,
      hitchHardware: 85,
      trailerCargo: 950,
      freshWater: 30,
      propane: 40,
      battCount: 2,
      battEach: 60,
      twMode: "range",
      twLowPct: 12.0,
      twHighPct: 14.5
    }
  },
  {
    id: "winter_hookups",
    name: "Winter • Hookups",
    tripPatch: {
      truckCargo: 260,
      hitchHardware: 85,
      trailerCargo: 950,
      freshWater: 5,
      propane: 60,
      battCount: 2,
      battEach: 60,
      twMode: "range",
      twLowPct: 12.5,
      twHighPct: 15.0
    }
  },
  {
    id: "winter_boondock",
    name: "Winter • Boondock (Ski lot)",
    tripPatch: {
      truckCargo: 320,
      hitchHardware: 90,
      trailerCargo: 1200,
      freshWater: 20,
      propane: 60,
      battCount: 2,
      battEach: 60,
      twMode: "range",
      twLowPct: 13.0,
      twHighPct: 15.5
    }
  }
];

let state = loadState();

// ---------- helpers ----------
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return initWithDefaults();
    const s = JSON.parse(raw);
    return hydrate(s);
  }catch(e){
    console.warn("Failed to load state, using defaults", e);
    return initWithDefaults();
  }
}
function initWithDefaults(){
  const s = defaults();
  s.trip.truckId = s.trucks[0].id;
  s.trip.trailerId = s.trailers[0].id;
  return s;
}
function hydrate(s){
  // ensure required fields exist for forward compatibility
  const d = defaults();
  s.settings = { ...d.settings, ...(s.settings||{}) };
  s.trucks = Array.isArray(s.trucks) ? s.trucks : d.trucks;
  s.trailers = Array.isArray(s.trailers) ? s.trailers : d.trailers;
  s.trip = { ...d.trip, ...(s.trip||{}) };
  if(!s.trip.truckId && s.trucks[0]) s.trip.truckId = s.trucks[0].id;
  if(!s.trip.trailerId && s.trailers[0]) s.trip.trailerId = s.trailers[0].id;
  if(!Array.isArray(s.trip.passengers) || s.trip.passengers.length===0){
    s.trip.passengers = [{ id: crypto.randomUUID(), name:"Driver", weight:180 }];
  }
  return s;
}
function fmtLb(x){ return (Math.round(x)).toLocaleString() + " lb"; }
function fmtPct(x){ return (Math.round(x*10)/10).toFixed(1) + "%"; }
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
function getTruck(){ return state.trucks.find(t=>t.id===state.trip.truckId) || state.trucks[0]; }
function getTrailer(){ return state.trailers.find(t=>t.id===state.trip.trailerId) || state.trailers[0]; }

function estimateCurb(truck){
  const gvwr = +truck.gvwr||0, payload = +truck.payload||0;
  const curb = +truck.curb||0;
  if(curb>0) return curb;
  // crude estimate, but aligns with sticker-based payload definition enough for planning
  return Math.max(0, gvwr - payload);
}

// ---------- calculations ----------
function calc(){
  const truck = getTruck();
  const tr = getTrailer();
  const set = state.settings;
  const trip = state.trip;

  const water = (+trip.freshWater||0) * (+set.waterLbPerGal||8.34);
  const propane = (+trip.propane||0);
  const batt = (+trip.battCount||0) * (+trip.battEach||0);
  const addedTrailerCargo = (+trip.trailerCargo||0);

  const loadedTrailer = (+tr.dry||0) + water + propane + batt + addedTrailerCargo;

  // Tongue weight
  const dryRatio = ((+tr.dryTongue||0) > 0 && (+tr.dry||0) > 0) ? ((+tr.dryTongue||0) / (+tr.dry||1)) : 0.12;

  let tongueLow = 0, tongueHigh = 0, tongueLabel = "";
  if(trip.twMode === "autoDry"){
    const tw = dryRatio * loadedTrailer;
    tongueLow = tw; tongueHigh = tw;
    tongueLabel = "Auto (dry ratio)";
  }else if(trip.twMode === "fixed"){
    const pct = (+trip.twFixedPct||12.5) / 100.0;
    const tw = pct * loadedTrailer;
    tongueLow = tw; tongueHigh = tw;
    tongueLabel = "Fixed %";
  }else{
    const low = (+trip.twLowPct||12.0)/100.0;
    const high = (+trip.twHighPct||15.0)/100.0;
    tongueLow = low * loadedTrailer;
    tongueHigh = high * loadedTrailer;
    tongueLabel = "Range %";
  }

  const pax = state.trip.passengers.map(p => +p.weight||0);
  const totalPassengers = sum(pax);
  const truckCargo = (+trip.truckCargo||0);
  const hitchHardware = (+trip.hitchHardware||0);

  // Payload usage: passengers + truck cargo + hitch hardware + tongue (use high for safety)
  const payloadUsedLow = totalPassengers + truckCargo + hitchHardware + tongueLow;
  const payloadUsedHigh = totalPassengers + truckCargo + hitchHardware + tongueHigh;
  const payloadRemainingLow = (+truck.payload||0) - payloadUsedLow;
  const payloadRemainingHigh = (+truck.payload||0) - payloadUsedHigh;

  // Tow rating
  const towOk = loadedTrailer <= (+truck.maxTow||0);

  // Tongue rating
  const tongueOk = tongueHigh <= (+truck.maxTongue||0);

  // GVWR / GCWR checks (approx)
  const curb = estimateCurb(truck);
  const estTruckWeightLow = curb + totalPassengers + truckCargo + hitchHardware + tongueLow;
  const estTruckWeightHigh = curb + totalPassengers + truckCargo + hitchHardware + tongueHigh;

  const gvwrOk = estTruckWeightHigh <= (+truck.gvwr||0);

  const gcwrLow = estTruckWeightLow + loadedTrailer;
  const gcwrHigh = estTruckWeightHigh + loadedTrailer;
  const gcwrOk = gcwrHigh <= (+truck.gcwr||0);

  // Trailer GVWR
  const trailerGvwrOk = loadedTrailer <= (+tr.gvwr||0);

  const utilization = {
    payload: (+truck.payload||0) > 0 ? (payloadUsedHigh / (+truck.payload||1)) : 0,
    tongue: (+truck.maxTongue||0) > 0 ? (tongueHigh / (+truck.maxTongue||1)) : 0,
    tow: (+truck.maxTow||0) > 0 ? (loadedTrailer / (+truck.maxTow||1)) : 0,
    gvwr: (+truck.gvwr||0) > 0 ? (estTruckWeightHigh / (+truck.gvwr||1)) : 0,
    gcwr: (+truck.gcwr||0) > 0 ? (gcwrHigh / (+truck.gcwr||1)) : 0,
    trailerGvwr: (+tr.gvwr||0) > 0 ? (loadedTrailer / (+tr.gvwr||1)) : 0
  };

  return {
    truck, tr, set, trip,
    loadedTrailer,
    water, propane, batt, addedTrailerCargo,
    dryRatio,
    tongueLow, tongueHigh, tongueLabel,
    totalPassengers, truckCargo, hitchHardware,
    payloadUsedLow, payloadUsedHigh,
    payloadRemainingLow, payloadRemainingHigh,
    towOk, tongueOk, gvwrOk, gcwrOk, trailerGvwrOk,
    curb, estTruckWeightLow, estTruckWeightHigh,
    gcwrLow, gcwrHigh,
    utilization
  };
}

// ---------- UI wiring ----------
const $ = (id)=>document.getElementById(id);

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
  // truck list
  const list = $("truckList");
  list.innerHTML = "";
  state.trucks.forEach(t=>{
    const div = document.createElement("div");
    div.className = "item" + (t.id===selectedTruckId ? " active":"");
    div.innerHTML = `
      <div>
        <div class="name">${escapeHtml(t.name||"Unnamed truck")}</div>
        <div class="meta">Payload ${fmtLb(t.payload||0)} • Tow ${fmtLb(t.maxTow||0)}</div>
      </div>
      <div class="badge">${fmtLb(t.gvwr||0)} GVWR</div>`;
    div.onclick = ()=>{ selectedTruckId = t.id; renderLists(); renderTruckForm(); syncTripSelectors(); saveState(); };
    list.appendChild(div);
  });

  // trailer list
  const listT = $("trailerList");
  listT.innerHTML = "";
  state.trailers.forEach(tr=>{
    const div = document.createElement("div");
    div.className = "item" + (tr.id===selectedTrailerId ? " active":"");
    div.innerHTML = `
      <div>
        <div class="name">${escapeHtml(tr.name||"Unnamed trailer")}</div>
        <div class="meta">Dry ${fmtLb(tr.dry||0)} • GVWR ${fmtLb(tr.gvwr||0)}</div>
      </div>
      <div class="badge">${fmtLb(tr.dryTongue||0)} tongue</div>`;
    div.onclick = ()=>{ selectedTrailerId = tr.id; renderLists(); renderTrailerForm(); syncTripSelectors(); saveState(); };
    listT.appendChild(div);
  });
}

function escapeHtml(s){
  return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}

let selectedTruckId = null;
let selectedTrailerId = null;

function ensureSelections(){
  if(!selectedTruckId && state.trucks[0]) selectedTruckId = state.trucks[0].id;
  if(!selectedTrailerId && state.trailers[0]) selectedTrailerId = state.trailers[0].id;
}

function renderTruckForm(){
  const t = state.trucks.find(x=>x.id===selectedTruckId) || state.trucks[0];
  if(!t) return;
  $("truckName").value = t.name||"";
  $("truckGVWR").value = t.gvwr||0;
  $("truckGCWR").value = t.gcwr||0;
  $("truckPayload").value = t.payload||0;
  $("truckTow").value = t.maxTow||0;
  $("truckTongue").value = t.maxTongue||0;
  $("truckCurb").value = t.curb||0;
  $("truckRearGawr").value = t.rearGawr||0;
  $("truckFrontGawr").value = t.frontGawr||0;
}

function renderTrailerForm(){
  const tr = state.trailers.find(x=>x.id===selectedTrailerId) || state.trailers[0];
  if(!tr) return;
  $("trailerName").value = tr.name||"";
  $("trailerDry").value = tr.dry||0;
  $("trailerDryTongue").value = tr.dryTongue||0;
  $("trailerGVWR").value = tr.gvwr||0;
  $("trailerFreshCap").value = tr.freshCap||0;
}

function bindTruckForm(){
  const fields = [
    ["truckName","name", v=>v],
    ["truckGVWR","gvwr", num],
    ["truckGCWR","gcwr", num],
    ["truckPayload","payload", num],
    ["truckTow","maxTow", num],
    ["truckTongue","maxTongue", num],
    ["truckCurb","curb", num],
    ["truckRearGawr","rearGawr", num],
    ["truckFrontGawr","frontGawr", num]
  ];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const t = state.trucks.find(x=>x.id===selectedTruckId);
      if(!t) return;
      t[key] = coerce($(id).value);
      saveState(); syncTripSelectors(); renderResults();
    });
  });
}
function bindTrailerForm(){
  const fields = [
    ["trailerName","name", v=>v],
    ["trailerDry","dry", num],
    ["trailerDryTongue","dryTongue", num],
    ["trailerGVWR","gvwr", num],
    ["trailerFreshCap","freshCap", num]
  ];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const tr = state.trailers.find(x=>x.id===selectedTrailerId);
      if(!tr) return;
      tr[key] = coerce($(id).value);
      saveState(); syncTripSelectors(); renderResults();
    });
  });
}
function num(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : 0; }

function syncTripSelectors(){
  const selTruck = $("tripTruck");
  const selTrailer = $("tripTrailer");

  selTruck.innerHTML = "";
  state.trucks.forEach(t=>{
    const opt = document.createElement("option");
    opt.value = t.id; opt.textContent = t.name||"Unnamed truck";
    selTruck.appendChild(opt);
  });

  selTrailer.innerHTML = "";
  state.trailers.forEach(tr=>{
    const opt = document.createElement("option");
    opt.value = tr.id; opt.textContent = tr.name||"Unnamed trailer";
    selTrailer.appendChild(opt);
  });

  // keep trip selection valid
  if(!state.trucks.find(t=>t.id===state.trip.truckId) && state.trucks[0]) state.trip.truckId = state.trucks[0].id;
  if(!state.trailers.find(t=>t.id===state.trip.trailerId) && state.trailers[0]) state.trip.trailerId = state.trailers[0].id;

  selTruck.value = state.trip.truckId;
  selTrailer.value = state.trip.trailerId;
}

function renderTrip(){
  // presets
  const selPreset = $("tripPreset");
  selPreset.innerHTML = "";
  presets.forEach(p=>{
    const opt = document.createElement("option");
    opt.value = p.id; opt.textContent = p.name;
    selPreset.appendChild(opt);
  });
  selPreset.value = state.trip.presetId;

  // tongue model
  $("twMode").value = state.trip.twMode;
  $("twFixedPct").value = state.trip.twFixedPct;
  $("twLowPct").value = state.trip.twLowPct;
  $("twHighPct").value = state.trip.twHighPct;

  showTongueBoxes();

  // loads
  $("truckCargo").value = state.trip.truckCargo;
  $("hitchHardware").value = state.trip.hitchHardware;
  $("trailerCargo").value = state.trip.trailerCargo;
  $("freshWater").value = state.trip.freshWater;
  $("propane").value = state.trip.propane;
  $("battCount").value = state.trip.battCount;
  $("battEach").value = state.trip.battEach;

  renderPassengers();
}

function showTongueBoxes(){
  const mode = $("twMode").value;
  $("twFixed").classList.toggle("hidden", mode!=="fixed");
  $("twRange").classList.toggle("hidden", mode!=="range");
}

function renderPassengers(){
  const box = $("passengers");
  box.innerHTML = "";
  state.trip.passengers.forEach(p=>{
    const row = document.createElement("div");
    row.className = "passRow";
    row.innerHTML = `
      <input data-id="${p.id}" class="passName" type="text" value="${escapeHtml(p.name||"Passenger")}" placeholder="Name"/>
      <input data-id="${p.id}" class="passWeight" type="number" step="1" min="0" value="${p.weight||0}" placeholder="Weight (lb)"/>
      <button class="btn btn-danger" data-id="${p.id}">✕</button>
    `;
    row.querySelector("button").onclick = ()=>{
      state.trip.passengers = state.trip.passengers.filter(x=>x.id!==p.id);
      if(state.trip.passengers.length===0){
        state.trip.passengers = [{ id: crypto.randomUUID(), name:"Driver", weight:180 }];
      }
      saveState(); renderPassengers(); renderResults();
    };
    row.querySelector(".passName").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.passengers.find(x=>x.id===id);
      if(obj){ obj.name = e.target.value; saveState(); }
    };
    row.querySelector(".passWeight").oninput = (e)=>{
      const id = e.target.dataset.id;
      const obj = state.trip.passengers.find(x=>x.id===id);
      if(obj){ obj.weight = num(e.target.value); saveState(); renderResults(); }
    };
    box.appendChild(row);
  });
}

function bindTrip(){
  $("tripTruck").addEventListener("change", (e)=>{ state.trip.truckId = e.target.value; saveState(); renderResults(); });
  $("tripTrailer").addEventListener("change", (e)=>{ state.trip.trailerId = e.target.value; saveState(); renderResults(); });
  $("tripPreset").addEventListener("change", (e)=>{ state.trip.presetId = e.target.value; saveState(); });

  $("btnApplyPreset").onclick = ()=>{
    const p = presets.find(x=>x.id===state.trip.presetId);
    if(!p) return;
    state.trip = { ...state.trip, ...p.tripPatch };
    saveState(); renderTrip(); renderResults();
  };

  $("btnRecalc").onclick = ()=> renderResults();

  $("twMode").addEventListener("change", (e)=>{ state.trip.twMode = e.target.value; showTongueBoxes(); saveState(); renderResults(); });
  $("twFixedPct").addEventListener("input", (e)=>{ state.trip.twFixedPct = num(e.target.value); saveState(); renderResults(); });
  $("twLowPct").addEventListener("input", (e)=>{ state.trip.twLowPct = num(e.target.value); saveState(); renderResults(); });
  $("twHighPct").addEventListener("input", (e)=>{ state.trip.twHighPct = num(e.target.value); saveState(); renderResults(); });

  const bindNum = (id, key) => $(id).addEventListener("input", (e)=>{ state.trip[key]=num(e.target.value); saveState(); renderResults(); });
  bindNum("truckCargo","truckCargo");
  bindNum("hitchHardware","hitchHardware");
  bindNum("trailerCargo","trailerCargo");
  bindNum("freshWater","freshWater");
  bindNum("propane","propane");
  bindNum("battCount","battCount");
  bindNum("battEach","battEach");

  $("btnAddPassenger").onclick = ()=>{
    state.trip.passengers.push({ id: crypto.randomUUID(), name:"Passenger", weight:160 });
    saveState(); renderPassengers(); renderResults();
  };
}

function bindSettings(){
  $("waterLbPerGal").value = state.settings.waterLbPerGal;
  $("warnPct").value = state.settings.warnPct;

  $("waterLbPerGal").addEventListener("input", (e)=>{ state.settings.waterLbPerGal = num(e.target.value); saveState(); renderResults(); });
  $("warnPct").addEventListener("input", (e)=>{ state.settings.warnPct = clamp(num(e.target.value), 50, 100); saveState(); renderResults(); });
}

// ---------- Results + chart ----------
let chart = null;

function pillClass(ok, util){
  const warnPct = (+state.settings.warnPct||90)/100.0;
  if(!ok) return "bad";
  if(util >= warnPct) return "warn";
  return "ok";
}

function renderResults(){
  const r = calc();
  const warnPct = (+state.settings.warnPct||90)/100.0;

  // summary cards
  const cards = [
    {
      title: "Payload",
      value: (r.trip.twMode==="range") ? `${fmtLb(r.payloadRemainingHigh)} remaining (high)` : `${fmtLb(r.payloadRemainingHigh)} remaining`,
      sub: `${fmtLb(r.payloadUsedHigh)} used of ${fmtLb(r.truck.payload||0)}`,
      ok: r.payloadRemainingHigh >= 0,
      util: r.utilization.payload
    },
    {
      title: "Tongue weight",
      value: (r.trip.twMode==="range") ? `${fmtLb(r.tongueLow)} – ${fmtLb(r.tongueHigh)}` : `${fmtLb(r.tongueHigh)}`,
      sub: `${fmtLb(r.tongueHigh)} vs ${fmtLb(r.truck.maxTongue||0)} max (WDH) • ${r.tongueLabel}`,
      ok: r.tongueOk,
      util: r.utilization.tongue
    },
    {
      title: "Trailer weight",
      value: `${fmtLb(r.loadedTrailer)}`,
      sub: `${fmtLb(r.loadedTrailer)} vs ${fmtLb(r.truck.maxTow||0)} tow • ${fmtLb(r.tr.gvwr||0)} trailer GVWR`,
      ok: r.towOk && r.trailerGvwrOk,
      util: Math.max(r.utilization.tow, r.utilization.trailerGvwr)
    }
  ];

  const wrap = $("resultsSummary");
  wrap.innerHTML = "";
  cards.forEach(c=>{
    const div = document.createElement("div");
    const klass = pillClass(c.ok, c.util);
    div.className = "card kpi";
    div.innerHTML = `
      <div class="label">${c.title}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
      <div class="pill ${klass}">${klass==="ok"?"OK":(klass==="warn"?"CAUTION":"OVER LIMIT")}</div>
    `;
    wrap.appendChild(div);
  });

  // details
  const d = $("resultsDetails");
  const tonguePctLow = r.loadedTrailer>0 ? (r.tongueLow/r.loadedTrailer)*100 : 0;
  const tonguePctHigh = r.loadedTrailer>0 ? (r.tongueHigh/r.loadedTrailer)*100 : 0;

  d.innerHTML = `
    <div class="card">
      <div class="label muted small">Selected</div>
      <div><b>${escapeHtml(r.truck.name||"Truck")}</b> towing <b>${escapeHtml(r.tr.name||"Trailer")}</b></div>
      <div class="muted small">Preset: ${escapeHtml((presets.find(p=>p.id===state.trip.presetId)||{}).name||"")}</div>
    </div>

    <div class="card">
      <div class="label muted small">Estimated truck weight</div>
      <div><b>${fmtLb(r.estTruckWeightHigh)}</b> (high tongue)</div>
      <div class="muted small">Curb est ${fmtLb(r.curb)} • GVWR ${fmtLb(r.truck.gvwr||0)} • Util ${(r.utilization.gvwr*100).toFixed(1)}%</div>
      <div class="pill ${pillClass(r.gvwrOk, r.utilization.gvwr)}">${r.gvwrOk ? (r.utilization.gvwr>=warnPct? "CAUTION":"OK") : "OVER GVWR"}</div>
    </div>

    <div class="card">
      <div class="label muted small">Estimated combined weight</div>
      <div><b>${fmtLb(r.gcwrHigh)}</b> (high tongue)</div>
      <div class="muted small">GCWR ${fmtLb(r.truck.gcwr||0)} • Util ${(r.utilization.gcwr*100).toFixed(1)}%</div>
      <div class="pill ${pillClass(r.gcwrOk, r.utilization.gcwr)}">${r.gcwrOk ? (r.utilization.gcwr>=warnPct? "CAUTION":"OK") : "OVER GCWR"}</div>
    </div>

    <div class="card">
      <div class="label muted small">Tongue %</div>
      <div><b>${(state.trip.twMode==="range") ? (fmtPct(tonguePctLow)+" – "+fmtPct(tonguePctHigh)) : fmtPct(tonguePctHigh)}</b></div>
      <div class="muted small">Auto dry ratio: ${(r.dryRatio*100).toFixed(1)}% (dry tongue ÷ dry weight)</div>
    </div>

    <div class="card">
      <div class="label muted small">Load breakdown</div>
      <div class="muted small">Passengers: ${fmtLb(r.totalPassengers)} • Truck cargo: ${fmtLb(r.truckCargo)} • Hitch: ${fmtLb(r.hitchHardware)}</div>
      <div class="muted small">Trailer cargo: ${fmtLb(r.addedTrailerCargo)} • Water: ${fmtLb(r.water)} • Propane: ${fmtLb(r.propane)} • Batteries: ${fmtLb(r.batt)}</div>
    </div>
  `;

  // warnings
  const w = [];
  if(r.payloadRemainingHigh < 0) w.push({level:"bad", title:"Over payload", msg:`Payload exceeded by ${fmtLb(-r.payloadRemainingHigh)} (using high tongue estimate).`});
  else if(r.utilization.payload >= warnPct) w.push({level:"warn", title:"Payload near limit", msg:`You are at ${(r.utilization.payload*100).toFixed(1)}% of payload (high tongue).`});

  if(!r.tongueOk) w.push({level:"bad", title:"Over tongue rating (WDH)", msg:`Estimated tongue (high) is ${fmtLb(r.tongueHigh)} vs max ${fmtLb(r.truck.maxTongue||0)}.`});
  else if(r.utilization.tongue >= warnPct) w.push({level:"warn", title:"Tongue near limit", msg:`Estimated tongue (high) is ${(r.utilization.tongue*100).toFixed(1)}% of max.`});

  if(!r.towOk) w.push({level:"bad", title:"Over tow rating", msg:`Estimated trailer weight ${fmtLb(r.loadedTrailer)} exceeds max tow ${fmtLb(r.truck.maxTow||0)}.`});
  else if(r.utilization.tow >= warnPct) w.push({level:"warn", title:"Tow rating near limit", msg:`Trailer weight is ${(r.utilization.tow*100).toFixed(1)}% of max tow.`});

  if(!r.trailerGvwrOk) w.push({level:"bad", title:"Over trailer GVWR", msg:`Estimated trailer weight ${fmtLb(r.loadedTrailer)} exceeds trailer GVWR ${fmtLb(r.tr.gvwr||0)}.`});
  else if(r.utilization.trailerGvwr >= warnPct) w.push({level:"warn", title:"Trailer GVWR near limit", msg:`Trailer weight is ${(r.utilization.trailerGvwr*100).toFixed(1)}% of its GVWR.`});

  if(!r.gvwrOk) w.push({level:"bad", title:"Over truck GVWR (estimated)", msg:`Estimated truck weight ${fmtLb(r.estTruckWeightHigh)} exceeds GVWR ${fmtLb(r.truck.gvwr||0)}.`});
  else if(r.utilization.gvwr >= warnPct) w.push({level:"warn", title:"Truck GVWR near limit", msg:`Estimated truck weight is ${(r.utilization.gvwr*100).toFixed(1)}% of GVWR.`});

  if(!r.gcwrOk) w.push({level:"bad", title:"Over GCWR (estimated)", msg:`Estimated combined ${fmtLb(r.gcwrHigh)} exceeds GCWR ${fmtLb(r.truck.gcwr||0)}.`});
  else if(r.utilization.gcwr >= warnPct) w.push({level:"warn", title:"GCWR near limit", msg:`Estimated combined is ${(r.utilization.gcwr*100).toFixed(1)}% of GCWR.`});

  if(w.length===0) w.push({level:"ok", title:"No issues detected", msg:"Based on current inputs and assumptions, key limits are within range."});

  const warnBox = $("warnings");
  warnBox.innerHTML = "";
  w.forEach(x=>{
    const div = document.createElement("div");
    div.className = "warnItem " + (x.level==="bad"?"bad":(x.level==="warn"?"warn":""));
    div.innerHTML = `<div class="warnTitle">${escapeHtml(x.title)}</div><div class="muted small">${escapeHtml(x.msg)}</div>`;
    warnBox.appendChild(div);
  });

  // chart
  const labels = ["Payload", "Tongue", "Tow", "Truck GVWR", "GCWR", "Trailer GVWR"];
  const values = [
    r.utilization.payload*100,
    r.utilization.tongue*100,
    r.utilization.tow*100,
    r.utilization.gvwr*100,
    r.utilization.gcwr*100,
    r.utilization.trailerGvwr*100
  ].map(v=>Math.max(0, Math.min(200, v)));

  const ctx = $("utilChart").getContext("2d");
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "% of limit used", data: values }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 140, ticks: { callback: (v)=> v + "%" } }
      }
    }
  });
}

// ---------- CRUD actions ----------
function bindCrud(){
  // trucks
  $("btnNewTruck").onclick = ()=>{
    const t = {
      id: crypto.randomUUID(),
      name: "New truck",
      gvwr: 0, gcwr: 0, payload: 0, maxTow: 0, maxTongue: 0,
      curb: 0, rearGawr: 0, frontGawr: 0
    };
    state.trucks.unshift(t);
    selectedTruckId = t.id;
    saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();
  };
  $("btnDupTruck").onclick = ()=>{
    const t = state.trucks.find(x=>x.id===selectedTruckId);
    if(!t) return;
    const copy = { ...structuredClone(t), id: crypto.randomUUID(), name: (t.name||"Truck") + " (copy)" };
    state.trucks.unshift(copy);
    selectedTruckId = copy.id;
    saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();
  };
  $("btnDelTruck").onclick = ()=>{
    if(state.trucks.length<=1) return alert("Keep at least one truck.");
    state.trucks = state.trucks.filter(x=>x.id!==selectedTruckId);
    if(!state.trucks.find(x=>x.id===state.trip.truckId)) state.trip.truckId = state.trucks[0].id;
    selectedTruckId = state.trucks[0].id;
    saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();
  };

  // trailers
  $("btnNewTrailer").onclick = ()=>{
    const tr = { id: crypto.randomUUID(), name:"New trailer", dry:0, dryTongue:0, gvwr:0, freshCap:0 };
    state.trailers.unshift(tr);
    selectedTrailerId = tr.id;
    saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();
  };
  $("btnDupTrailer").onclick = ()=>{
    const tr = state.trailers.find(x=>x.id===selectedTrailerId);
    if(!tr) return;
    const copy = { ...structuredClone(tr), id: crypto.randomUUID(), name:(tr.name||"Trailer")+" (copy)" };
    state.trailers.unshift(copy);
    selectedTrailerId = copy.id;
    saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();
  };
  $("btnDelTrailer").onclick = ()=>{
    if(state.trailers.length<=1) return alert("Keep at least one trailer.");
    state.trailers = state.trailers.filter(x=>x.id!==selectedTrailerId);
    if(!state.trailers.find(x=>x.id===state.trip.trailerId)) state.trip.trailerId = state.trailers[0].id;
    selectedTrailerId = state.trailers[0].id;
    saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();
  };
}

// ---------- Import/Export/Reset ----------
function bindBackup(){
  $("btnExport").onclick = ()=>{
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "towcalc-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  $("fileImport").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    try{
      const text = await f.text();
      const obj = JSON.parse(text);
      state = hydrate(obj);
      ensureSelections();
      selectedTruckId = state.trucks[0]?.id || null;
      selectedTrailerId = state.trailers[0]?.id || null;
      saveState();
      boot(true);
      alert("Imported successfully.");
    }catch(err){
      alert("Import failed: " + err);
    }finally{
      e.target.value = "";
    }
  });

  $("btnReset").onclick = ()=>{
    if(!confirm("Reset TowCalc? This deletes local data on this device.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = initWithDefaults();
    ensureSelections();
    selectedTruckId = state.trucks[0].id;
    selectedTrailerId = state.trailers[0].id;
    saveState();
    boot(true);
  };
}

function boot(rerender=false){
  ensureSelections();
  if(!selectedTruckId) selectedTruckId = state.trucks[0]?.id || null;
  if(!selectedTrailerId) selectedTrailerId = state.trailers[0]?.id || null;

  syncTripSelectors();
  renderLists();
  renderTruckForm();
  renderTrailerForm();
  renderTrip();
  bindSettings();
  renderResults();

  if(rerender) return;
  initTabs();
  bindTruckForm();
  bindTrailerForm();
  bindTrip();
  bindCrud();
  bindBackup();

  // register service worker for offline use
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

boot();
