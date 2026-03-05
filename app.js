
const STORAGE_KEY="towcalc_state_v2";
let tripDirty=false;
function uuid(){ if(typeof crypto!=="undefined"&&crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==="x"?r:(r&0x3|0x8);return v.toString(16);});
}

function defaultState(){
  const truckId=uuid();
  const trailers=[
    {id:uuid(),name:"Lance 1995",dry:5273,dryTongue:559,gvwr:7000,freshCap:45},
    {id:uuid(),name:"Brinkley I 265",dry:7012,dryTongue:650,gvwr:9600,freshCap:55},
    {id:uuid(),name:"Lance 1985",dry:5259,dryTongue:642,gvwr:7000,freshCap:45},
    {id:uuid(),name:"Apex Nano",dry:3495,dryTongue:370,gvwr:4700,freshCap:50},
  ];
  return {
    settings:{waterLbPerGal:8.34,warnPct:90},
    trucks:[{id:truckId,name:"2021 Ford F-150 PowerBoost Lariat 4x4 (5.5' bed)",gvwr:7350,gcwr:17000,payload:1391,maxTow:9650,maxTongue:1160,curb:0,rearGawr:4150,frontGawr:3900}],
    trailers,
    trip:{truckId, trailerId:trailers[0].id, presetId:"winter_boondock",
      truckLoads:[{id:uuid(),name:"Gino",weight:180},{id:uuid(),name:"Cristina",weight:150},{id:uuid(),name:"Jacob",weight:120},{id:uuid(),name:"WDH",weight:90},{id:uuid(),name:"Trip gear",weight:320}],trailerGear:1200,waterLb:166.8,propaneLb:60,battLb:120,
      twMode:"range",twFixedPct:12.5,twLowPct:13.0,twHighPct:15.5
    }
  };
}

let state=loadState();
const $=id=>document.getElementById(id);
const num=v=>{const n=parseFloat(v);return Number.isFinite(n)?n:0;};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sum=a=>a.reduce((x,y)=>x+y,0);
const fmtLb=x=>Math.round(x).toLocaleString()+" lb";
const fmtPct=x=>(Math.round(x*10)/10).toFixed(1)+"%";
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
  if(!Array.isArray(s.trip.passengers)||!s.trip.passengers.length) s.trip.passengers=[{id:uuid(),name:"Driver",weight:180}];

  // Back-compat: migrate older schemas to truckLoads
  if(Array.isArray(s.trip.passengers) && s.trip.passengers.length){
    if(!Array.isArray(s.trip.truckLoads)) s.trip.truckLoads = [];
    s.trip.passengers.forEach(p=>{
      let nm = p.name || "Passenger";
      if(nm==="Driver") nm="Gino";
      if(!s.trip.truckLoads.find(x => (x.name||"") === nm)){
        s.trip.truckLoads.push({ id: uuid(), name: nm, weight: Number.isFinite(+p.weight) ? +p.weight : 0 });
      }
    });
  }
  if(!Array.isArray(s.trip.truckLoads) || s.trip.truckLoads.length===0){
    const cargo = Number.isFinite(+s.trip.truckCargo) ? +s.trip.truckCargo : 0;
    const hitch = Number.isFinite(+s.trip.hitchHardware) ? +s.trip.hitchHardware : 0;
    s.trip.truckLoads = [
      { id: uuid(), name:"Gino", weight:180 },
      { id: uuid(), name:"Cristina", weight:150 },
      { id: uuid(), name:"Jacob", weight:120 },
      { id: uuid(), name:"WDH", weight:hitch },
      { id: uuid(), name:"Trip gear", weight:cargo }
    ];
  }
  const ensure = (name, weight=0) => {
    if(!s.trip.truckLoads.find(x => (x.name||"") === name)){
      s.trip.truckLoads.push({ id: uuid(), name, weight });
    }
  };
  ensure("WDH", 0);
  ensure("Trip gear", 0);

  // Back-compat: migrate trailer inputs to trailerLoads
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

  return s;
}
function loadState(){try{const raw=localStorage.getItem(STORAGE_KEY);if(!raw) return defaultState();return hydrate(JSON.parse(raw));}catch{return defaultState();}}

function getTruck(){return state.trucks.find(t=>t.id===state.trip.truckId)||state.trucks[0];}
function getTrailer(){return state.trailers.find(t=>t.id===state.trip.trailerId)||state.trailers[0];}
function estimateCurb(truck){const curb=+truck.curb||0;if(curb>0) return curb;return Math.max(0,(+truck.gvwr||0)-(+truck.payload||0));}

function calc(){
  const truck=getTruck(), tr=getTrailer(), set=state.settings, trip=state.trip;
  const trailerLoads = Array.isArray(trip.trailerLoads) ? trip.trailerLoads : [];
  const trailerLoadTotalLbs = sum(trailerLoads.map(x => (+x.weight||0)));
  const loadedTrailer = (+tr.dry||0) + trailerLoadTotalLbs;
  const dryRatio=((+tr.dryTongue||0)>0 && (+tr.dry||0)>0)?((+tr.dryTongue||0)/(+tr.dry||1)):0.12;

  let tongueLow=0,tongueHigh=0,tongueLabel="";
  if(trip.twMode==="autoDry"){ trip.twMode="fixed"; trip.twFixedPct = (dryRatio*100); }
  else if(trip.twMode==="fixed"){const pct=(+trip.twFixedPct||12.5)/100;const tw=pct*loadedTrailer;tongueLow=tw;tongueHigh=tw;tongueLabel="Fixed %";}
  else {const low=(+trip.twLowPct||12)/100, high=(+trip.twHighPct||15)/100;tongueLow=low*loadedTrailer;tongueHigh=high*loadedTrailer;tongueLabel="Range %";}

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

function drawUtilChart(values, labels){
  const canvas=$("utilChart"); if(!canvas) return;
  const dpr=window.devicePixelRatio||1;
  const ctx=canvas.getContext("2d");
  const W=canvas.width=Math.max(320, canvas.clientWidth)*dpr;
  const H=canvas.height=180*dpr;
  ctx.clearRect(0,0,W,H);
  const pad=12*dpr, maxY=140, labelH=18*dpr;
  const chartW=W-pad*2, chartH=H-pad*2-labelH;

  ctx.strokeStyle="rgba(167,177,189,0.25)";
  ctx.fillStyle="rgba(167,177,189,0.65)";
  ctx.lineWidth=1*dpr;
  ctx.font=`${10*dpr}px system-ui`;
  ctx.textAlign="left";
  [0,50,90,100,140].forEach(yVal=>{
    const yy=pad+chartH-(yVal/maxY)*chartH;
    ctx.beginPath(); ctx.moveTo(pad,yy); ctx.lineTo(pad+chartW,yy); ctx.stroke();
    ctx.fillText(`${yVal}%`, pad, yy-2*dpr);
  });

  const n=values.length, gap=8*dpr, barW=(chartW-gap*(n-1))/n;
  for(let i=0;i<n;i++){
    const v=Math.max(0,Math.min(200,values[i]));
    const h=(Math.min(v,maxY)/maxY)*chartH;
    const x=pad+i*(barW+gap);
    const y=pad+chartH-h;
    ctx.fillStyle="rgba(77,163,255,0.55)";
    ctx.fillRect(x,y,barW,h);
    if(v>maxY){
      ctx.fillStyle="rgba(255,92,92,0.7)";
      ctx.fillRect(x,pad,barW,6*dpr);
    }
    ctx.fillStyle="rgba(167,177,189,0.85)";
    ctx.font=`${10*dpr}px system-ui`;
    ctx.textAlign="center";
    ctx.fillText(labels[i], x+barW/2, pad+chartH+14*dpr);
  }
}

let selectedTruckId=null, selectedTrailerId=null;
function ensureSelections(){ if(!selectedTruckId&&state.trucks[0]) selectedTruckId=state.trucks[0].id; if(!selectedTrailerId&&state.trailers[0]) selectedTrailerId=state.trailers[0].id; }

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
  state.trucks.forEach(t=>{
    const div=document.createElement("div");
    div.className="item"+(t.id===selectedTruckId?" active":"");
    div.innerHTML=`<div><div class="name">${escapeHtml(t.name||"Unnamed truck")}</div><div class="meta">Payload ${fmtLb(t.payload||0)} • Tow ${fmtLb(t.maxTow||0)}</div></div><div class="badge">${fmtLb(t.gvwr||0)} GVWR</div>`;
    div.onclick=()=>{selectedTruckId=t.id; renderLists(); renderTruckForm(); syncTripSelectors(); saveState();};
    list.appendChild(div);
  });

  const listT=$("trailerList"); listT.innerHTML="";
  state.trailers.forEach(tr=>{
    const div=document.createElement("div");
    div.className="item"+(tr.id===selectedTrailerId?" active":"");
    div.innerHTML=`<div><div class="name">${escapeHtml(tr.name||"Unnamed trailer")}</div><div class="meta">Dry ${fmtLb(tr.dry||0)} • GVWR ${fmtLb(tr.gvwr||0)}</div></div><div class="badge">${fmtLb(tr.dryTongue||0)} tongue</div>`;
    div.onclick=()=>{selectedTrailerId=tr.id; renderLists(); renderTrailerForm(); syncTripSelectors(); saveState();};
    listT.appendChild(div);
  });
}

function renderTruckForm(){
  const t=state.trucks.find(x=>x.id===selectedTruckId)||state.trucks[0]; if(!t) return;
  $("truckName").value=t.name||"";
  $("truckGVWR").value=t.gvwr||0;
  $("truckGCWR").value=t.gcwr||0;
  $("truckPayload").value=t.payload||0;
  $("truckTow").value=t.maxTow||0;
  $("truckTongue").value=t.maxTongue||0;
  $("truckCurb").value=t.curb||0;
  $("truckRearGawr").value=t.rearGawr||0;
  $("truckFrontGawr").value=t.frontGawr||0;
}
function renderTrailerForm(){
  const tr=state.trailers.find(x=>x.id===selectedTrailerId)||state.trailers[0]; if(!tr) return;
  $("trailerName").value=tr.name||"";
  $("trailerDry").value=tr.dry||0;
  $("trailerDryTongue").value=tr.dryTongue||0;
  $("trailerGVWR").value=tr.gvwr||0;
  $("trailerFreshCap").value=tr.freshCap||0;
}

function bindTruckForm(){
  const fields=[["truckName","name",v=>v],["truckGVWR","gvwr",num],["truckGCWR","gcwr",num],["truckPayload","payload",num],["truckTow","maxTow",num],["truckTongue","maxTongue",num],["truckCurb","curb",num],["truckRearGawr","rearGawr",num],["truckFrontGawr","frontGawr",num]];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const t=state.trucks.find(x=>x.id===selectedTruckId); if(!t) return;
      t[key]=coerce($(id).value);
      saveState(); syncTripSelectors(); renderResults();
    });
  });
}
function bindTrailerForm(){
  const fields=[["trailerName","name",v=>v],["trailerDry","dry",num],["trailerDryTongue","dryTongue",num],["trailerGVWR","gvwr",num],["trailerFreshCap","freshCap",num]];
  fields.forEach(([id,key,coerce])=>{
    $(id).addEventListener("input", ()=>{
      const tr=state.trailers.find(x=>x.id===selectedTrailerId); if(!tr) return;
      tr[key]=coerce($(id).value);
      saveState(); syncTripSelectors(); renderResults();
    });
  });
}

function syncTripSelectors(){
  const selTruck=$("tripTruck"), selTrailer=$("tripTrailer");
  selTruck.innerHTML=""; state.trucks.forEach(t=>{const o=document.createElement("option");o.value=t.id;o.textContent=t.name||"Unnamed truck";selTruck.appendChild(o);});
  selTrailer.innerHTML=""; state.trailers.forEach(tr=>{const o=document.createElement("option");o.value=tr.id;o.textContent=tr.name||"Unnamed trailer";selTrailer.appendChild(o);});
  if(!state.trucks.find(t=>t.id===state.trip.truckId)) state.trip.truckId=state.trucks[0].id;
  if(!state.trailers.find(t=>t.id===state.trip.trailerId)) state.trip.trailerId=state.trailers[0].id;
  selTruck.value=state.trip.truckId; selTrailer.value=state.trip.trailerId;
}

function showTongueBoxes(){
  const mode=$("twMode").value;
  $("twFixed").classList.toggle("hidden", mode!=="fixed");
  $("twRange").classList.toggle("hidden", mode!=="range");
}



function renderTruckLoads(){
  const box = $("truckLoads");
  if(!box) return;
  box.innerHTML = "";
  if(!Array.isArray(state.trip.truckLoads)) state.trip.truckLoads = [];
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
      if(state.trip.truckLoads.length===0){
        state.trip.truckLoads = [{ id: uuid(), name:"Load", weight:0 }];
      }
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
      if(state.trip.trailerLoads.length===0){
        state.trip.trailerLoads = [{ id: uuid(), name:"Load", weight:0 }];
      }
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
  $("twMode").value=state.trip.twMode;
  $("twFixedPct").value=state.trip.twFixedPct;
  $("twLowPct").value=state.trip.twLowPct;
  $("twHighPct").value=state.trip.twHighPct;
  showTongueBoxes();
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

  $("twMode").addEventListener("change",e=>{state.trip.twMode=e.target.value; showTongueBoxes(); saveState(); markTripDirty();});
  $("twFixedPct").addEventListener("input",e=>{state.trip.twFixedPct=num(e.target.value); saveState(); markTripDirty();});
  $("twLowPct").addEventListener("input",e=>{state.trip.twLowPct=num(e.target.value); saveState(); markTripDirty();});
  $("twHighPct").addEventListener("input",e=>{state.trip.twHighPct=num(e.target.value); saveState(); markTripDirty();});
}

function bindSettings(){
  $("waterLbPerGal").value=state.settings.waterLbPerGal;
  $("warnPct").value=state.settings.warnPct;
  $("waterLbPerGal").addEventListener("input",e=>{state.settings.waterLbPerGal=num(e.target.value); saveState(); markTripDirty();});
  $("warnPct").addEventListener("input",e=>{state.settings.warnPct=clamp(num(e.target.value),50,100); saveState(); markTripDirty();});
}

function renderResults(){
  const r=calc();
  const hintEl = $("dryRatioHint");
  if(hintEl){ hintEl.textContent = `Dry ratio (dry tongue ÷ dry weight) for this trailer is ${(r.dryRatio*100).toFixed(1)}%`; }

  const warnPct=(+state.settings.warnPct||90)/100;

  const cards=[
    {title:"Payload", value:(r.trip.twMode==="range")?`${fmtLb(r.payloadRemainingHigh)} remaining (high)`: `${fmtLb(r.payloadRemainingHigh)} remaining`,
     sub:`${fmtLb(r.payloadUsedHigh)} used of ${fmtLb(r.truck.payload||0)}`, ok:r.payloadRemainingHigh>=0, util:r.utilization.payload},
    {title:"Tongue weight", value:(r.trip.twMode==="range")?`${fmtLb(r.tongueLow)} – ${fmtLb(r.tongueHigh)}`:`${fmtLb(r.tongueHigh)}`,
     sub:`${fmtLb(r.tongueHigh)} vs ${fmtLb(r.truck.maxTongue||0)} max (WDH) • ${r.tongueLabel}`, ok:r.tongueOk, util:r.utilization.tongue},
    {title:"Trailer weight", value:`${fmtLb(r.loadedTrailer)}`,
     sub:`${fmtLb(r.loadedTrailer)} vs ${fmtLb(r.truck.maxTow||0)} tow • ${fmtLb(r.tr.gvwr||0)} trailer GVWR`, ok:r.towOk&&r.trailerGvwrOk, util:Math.max(r.utilization.tow,r.utilization.trailerGvwr)},
  ];
  const wrap=$("resultsSummary"); wrap.innerHTML="";
  cards.forEach(c=>{
    const div=document.createElement("div");
    const klass=pillClass(c.ok,c.util);
    div.className="card kpi";
    div.innerHTML=`<div class="label">${escapeHtml(c.title)}</div><div class="value">${escapeHtml(c.value)}</div><div class="sub">${escapeHtml(c.sub)}</div><div class="pill ${klass}">${klass==="ok"?"OK":(klass==="warn"?"CAUTION":"OVER LIMIT")}</div>`;
    wrap.appendChild(div);
  });

  const tonguePctLow=r.loadedTrailer>0?(r.tongueLow/r.loadedTrailer)*100:0;
  const tonguePctHigh=r.loadedTrailer>0?(r.tongueHigh/r.loadedTrailer)*100:0;
  $("resultsDetails").innerHTML=`
    <div class="card"><div class="label muted small">Selected</div><div><b>${escapeHtml(r.truck.name||"Truck")}</b> towing <b>${escapeHtml(r.tr.name||"Trailer")}</b></div><div class="muted small">Preset: ${escapeHtml(([].find(p=>p.id===state.trip.presetId)||{}).name||"")}</div></div>
    <div class="card"><div class="label muted small">Estimated truck weight</div><div><b>${fmtLb(r.estTruckWeightHigh)}</b> (high tongue)</div><div class="muted small">Curb est ${fmtLb(r.curb)} • GVWR ${fmtLb(r.truck.gvwr||0)} • Util ${(r.utilization.gvwr*100).toFixed(1)}%</div><div class="pill ${pillClass(r.gvwrOk,r.utilization.gvwr)}">${r.gvwrOk?(r.utilization.gvwr>=warnPct?"CAUTION":"OK"):"OVER GVWR"}</div></div>
    <div class="card"><div class="label muted small">Estimated combined weight</div><div><b>${fmtLb(r.gcwrHigh)}</b> (high tongue)</div><div class="muted small">GCWR ${fmtLb(r.truck.gcwr||0)} • Util ${(r.utilization.gcwr*100).toFixed(1)}%</div><div class="pill ${pillClass(r.gcwrOk,r.utilization.gcwr)}">${r.gcwrOk?(r.utilization.gcwr>=warnPct?"CAUTION":"OK"):"OVER GCWR"}</div></div>
    <div class="card"><div class="label muted small">Tongue %</div><div><b>${(state.trip.twMode==="range")?(fmtPct(tonguePctLow)+" – "+fmtPct(tonguePctHigh)):fmtPct(tonguePctHigh)}</b></div><div class="muted small">Auto dry ratio: ${(r.dryRatio*100).toFixed(1)}%</div></div>
    <div class="card"><div class="label muted small">Load breakdown</div><div class="muted small">Truck loads: ${fmtLb(r.truckLoadTotal)}</div><div class="muted small">Trailer loads: ${fmtLb(r.trailerLoadTotalLbs)}</div></div>
  `;

  const w=[];
  if(r.payloadRemainingHigh<0) w.push({level:"bad",title:"Over payload",msg:`Payload exceeded by ${fmtLb(-r.payloadRemainingHigh)} (high tongue).`});
  else if(r.utilization.payload>=warnPct) w.push({level:"warn",title:"Payload near limit",msg:`You are at ${(r.utilization.payload*100).toFixed(1)}% of payload.`});

  if(!r.tongueOk) w.push({level:"bad",title:"Over tongue rating (WDH)",msg:`Tongue (high) ${fmtLb(r.tongueHigh)} vs max ${fmtLb(r.truck.maxTongue||0)}.`});
  else if(r.utilization.tongue>=warnPct) w.push({level:"warn",title:"Tongue near limit",msg:`Tongue is ${(r.utilization.tongue*100).toFixed(1)}% of max.`});

  if(!r.towOk) w.push({level:"bad",title:"Over tow rating",msg:`Trailer weight ${fmtLb(r.loadedTrailer)} exceeds max tow ${fmtLb(r.truck.maxTow||0)}.`});
  else if(r.utilization.tow>=warnPct) w.push({level:"warn",title:"Tow rating near limit",msg:`Trailer weight is ${(r.utilization.tow*100).toFixed(1)}% of max tow.`});

  if(!r.trailerGvwrOk) w.push({level:"bad",title:"Over trailer GVWR",msg:`Trailer weight ${fmtLb(r.loadedTrailer)} exceeds trailer GVWR ${fmtLb(r.tr.gvwr||0)}.`});
  else if(r.utilization.trailerGvwr>=warnPct) w.push({level:"warn",title:"Trailer GVWR near limit",msg:`Trailer weight is ${(r.utilization.trailerGvwr*100).toFixed(1)}% of GVWR.`});

  if(!r.gvwrOk) w.push({level:"bad",title:"Over truck GVWR (estimated)",msg:`Truck est ${fmtLb(r.estTruckWeightHigh)} exceeds GVWR ${fmtLb(r.truck.gvwr||0)}.`});
  else if(r.utilization.gvwr>=warnPct) w.push({level:"warn",title:"Truck GVWR near limit",msg:`Truck is ${(r.utilization.gvwr*100).toFixed(1)}% of GVWR.`});

  if(!r.gcwrOk) w.push({level:"bad",title:"Over GCWR (estimated)",msg:`Combined est ${fmtLb(r.gcwrHigh)} exceeds GCWR ${fmtLb(r.truck.gcwr||0)}.`});
  else if(r.utilization.gcwr>=warnPct) w.push({level:"warn",title:"GCWR near limit",msg:`Combined is ${(r.utilization.gcwr*100).toFixed(1)}% of GCWR.`});

  if(!w.length) w.push({level:"ok",title:"No issues detected",msg:"Based on current inputs and assumptions, key limits are within range."});

  const warnBox=$("warnings"); warnBox.innerHTML="";
  w.forEach(x=>{
    const div=document.createElement("div");
    div.className="warnItem "+(x.level==="bad"?"bad":(x.level==="warn"?"warn":""));
    div.innerHTML=`<div class="warnTitle">${escapeHtml(x.title)}</div><div class="muted small">${escapeHtml(x.msg)}</div>`;
    warnBox.appendChild(div);
  });

  drawUtilChart([
    r.utilization.payload*100, r.utilization.tongue*100, r.utilization.tow*100,
    r.utilization.gvwr*100, r.utilization.gcwr*100, r.utilization.trailerGvwr*100
  ], ["Payload","Tongue","Tow","Truck GVWR","GCWR","Trailer GVWR"]);
}

function bindCrud(){
  $("btnNewTruck").onclick=()=>{const t={id:uuid(),name:"New truck",gvwr:0,gcwr:0,payload:0,maxTow:0,maxTongue:0,curb:0,rearGawr:0,frontGawr:0}; state.trucks.unshift(t); selectedTruckId=t.id; saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();};
  $("btnDupTruck").onclick=()=>{const t=state.trucks.find(x=>x.id===selectedTruckId); if(!t) return; const copy={...structuredClone(t),id:uuid(),name:(t.name||"Truck")+" (copy)"}; state.trucks.unshift(copy); selectedTruckId=copy.id; saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();};
  $("btnDelTruck").onclick=()=>{if(state.trucks.length<=1) return alert("Keep at least one truck."); state.trucks=state.trucks.filter(x=>x.id!==selectedTruckId); if(!state.trucks.find(x=>x.id===state.trip.truckId)) state.trip.truckId=state.trucks[0].id; selectedTruckId=state.trucks[0].id; saveState(); renderLists(); renderTruckForm(); syncTripSelectors(); renderResults();};

  $("btnNewTrailer").onclick=()=>{const tr={id:uuid(),name:"New trailer",dry:0,dryTongue:0,gvwr:0,freshCap:0}; state.trailers.unshift(tr); selectedTrailerId=tr.id; saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();};
  $("btnDupTrailer").onclick=()=>{const tr=state.trailers.find(x=>x.id===selectedTrailerId); if(!tr) return; const copy={...structuredClone(tr),id:uuid(),name:(tr.name||"Trailer")+" (copy)"}; state.trailers.unshift(copy); selectedTrailerId=copy.id; saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();};
  $("btnDelTrailer").onclick=()=>{if(state.trailers.length<=1) return alert("Keep at least one trailer."); state.trailers=state.trailers.filter(x=>x.id!==selectedTrailerId); if(!state.trailers.find(x=>x.id===state.trip.trailerId)) state.trip.trailerId=state.trailers[0].id; selectedTrailerId=state.trailers[0].id; saveState(); renderLists(); renderTrailerForm(); syncTripSelectors(); renderResults();};
}

function bindBackup(){
  $("btnExport").onclick=()=>{
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="towcalc-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };
  $("fileImport").addEventListener("change", async e=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const obj=JSON.parse(await f.text());
      state=hydrate(obj);
      ensureSelections();
      selectedTruckId=state.trucks[0]?.id||null; selectedTrailerId=state.trailers[0]?.id||null;
      saveState(); boot(true);
      alert("Imported successfully.");
    }catch(err){ alert("Import failed: "+err); }
    finally{ e.target.value=""; }
  });
  $("btnReset").onclick=()=>{
    if(!confirm("Reset TowCalc? This deletes local data on this device.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state=defaultState();
    ensureSelections();
    selectedTruckId=state.trucks[0].id; selectedTrailerId=state.trailers[0].id;
    saveState(); boot(true);
  };
}



function bindCalculate(){
  const btn = $("btnCalculate");
  if(!btn) return;
  btn.onclick = ()=>{
    clearTripDirty();
    renderResults();
    activateTab("tab-results");
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

  if(rerender) return;

  initTabs();
  bindTruckForm();
  bindTrailerForm();
  bindTrip();
  bindCalculate();
  bindCrud();
  bindBackup();

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("sw.js").catch(()=>{});
  }
}

boot();
