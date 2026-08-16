const SAVE_KEY="parkEmpireV1010";
const LEGACY_SAVE_KEY="parkEmpireV76";
const ADMIN_PASSWORD="1234";
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Math.round(n||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

const DIFFICULTIES={
  easy:{label:"Easy",demand:1.15,fixedCosts:.88,variableCosts:.88,incidentRisk:.68,loanAccess:1.18},
  medium:{label:"Medium",demand:1,fixedCosts:1,variableCosts:1,incidentRisk:1,loanAccess:1},
  hard:{label:"Hard",demand:.90,fixedCosts:1.14,variableCosts:1.12,incidentRisk:1.38,loanAccess:.82}
};
const RIDES=[
{id:"carousel",name:"Classic Carousel",cost:180000,appeal:6,capacity:350,upkeep:650},
{id:"dodgems",name:"Dodgems",cost:320000,appeal:9,capacity:500,upkeep:1050},
{id:"drop",name:"Sky Drop",cost:720000,appeal:14,capacity:620,upkeep:2600},
{id:"rapids",name:"River Rapids",cost:1400000,appeal:18,capacity:900,upkeep:5600},
{id:"woodie",name:"Timber Run",cost:2800000,appeal:28,capacity:1100,upkeep:13000},
{id:"launch",name:"Velocity",cost:4200000,appeal:36,capacity:1250,upkeep:21000},
{id:"invert",name:"Skybreaker",cost:5500000,appeal:42,capacity:1350,upkeep:27500},
{id:"dark",name:"Mythic Manor",cost:7800000,appeal:52,capacity:1600,upkeep:35000},
{id:"hyper",name:"Titan",cost:12500000,appeal:70,capacity:1900,upkeep:62000},
{id:"giga",name:"Apex 300",cost:26000000,appeal:105,capacity:2300,upkeep:118000}
];
const OUTLETS=[
{id:"coffee",name:"Coffee Kiosk",cost:45000,spend:2.1,margin:.58,capacity:420},
{id:"burger",name:"Burger Shack",cost:110000,spend:4.2,margin:.50,capacity:600},
{id:"souvenir",name:"Souvenir Shop",cost:90000,spend:3.1,margin:.60,capacity:520},
{id:"icecream",name:"Ice Cream Parlour",cost:145000,spend:3.5,margin:.54,capacity:650},
{id:"restaurant",name:"Family Restaurant",cost:420000,spend:7.2,margin:.43,capacity:720},
{id:"premium",name:"Premium Dining",cost:950000,spend:11.5,margin:.40,capacity:580}
];

function getSave(){
  let raw=localStorage.getItem(SAVE_KEY);
  if(!raw)raw=localStorage.getItem(LEGACY_SAVE_KEY);
  if(!raw)return null;
  try{return JSON.parse(raw)}catch{return null}
}
function putSave(s){
  s.version=1010;
  s.difficulty=s.difficulty||"medium";
  localStorage.setItem(SAVE_KEY,JSON.stringify(s));
}
function logAction(msg){
  document.getElementById("adminActionLog").textContent=`${new Date().toLocaleTimeString()} - ${msg}`;
  refreshDashboard();
}
function requireSave(){
  const s=getSave();
  if(!s){alert("No Park Empire save exists on this device yet.");return null}
  return s;
}

function refreshDashboard(){
  const s=getSave();
  document.getElementById("saveDetected").textContent=s?"Yes":"No";
  document.getElementById("adminDifficulty").textContent=s?(DIFFICULTIES[s.difficulty||"medium"]?.label||"Medium"):"-";
  document.getElementById("adminCash").textContent=s?money(s.cash):"£0";
  document.getElementById("adminDay").textContent=s?s.day:0;
  document.getElementById("adminRides").textContent=s?s.rides?.length||0:0;
  document.getElementById("adminOutlets").textContent=s?s.outlets?.length||0:0;

  const entries=[];
  let totalBytes=0;
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i),val=localStorage.getItem(key)||"";
    const bytes=new Blob([key,val]).size;
    totalBytes+=bytes;
    entries.push({key,bytes});
  }
  const storage=document.getElementById("storageSummary");
  storage.innerHTML=[
    ["LocalStorage keys",localStorage.length],
    ["Approx storage used",`${(totalBytes/1024).toFixed(2)} KB`],
    ["Park Empire save",s?`${(new Blob([JSON.stringify(s)]).size/1024).toFixed(2)} KB`:"None"],
    ["History rows",s?.history?.length||0],
    ["Stored rides",s?.rides?.length||0],
    ["Stored outlets",s?.outlets?.length||0]
  ].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  document.getElementById("savePreview").textContent=s?JSON.stringify(s,null,2):"No save data.";

  const nav=navigator;
  const perf=performance;
  const connection=nav.connection||nav.mozConnection||nav.webkitConnection;
  const rows=[
    ["User agent",nav.userAgent],
    ["Language",nav.language||"-"],
    ["Screen",`${screen.width} x ${screen.height}`],
    ["Viewport",`${innerWidth} x ${innerHeight}`],
    ["Pixel ratio",devicePixelRatio||1],
    ["CPU threads",nav.hardwareConcurrency||"Unavailable"],
    ["Device memory",nav.deviceMemory?`${nav.deviceMemory} GB`:"Unavailable"],
    ["Network",connection?.effectiveType||"Unavailable"],
    ["LocalStorage",typeof localStorage!=="undefined"?"Available":"Unavailable"],
    ["Page uptime",`${Math.round(perf.now())} ms`]
  ];
  document.getElementById("performanceDiagnostics").innerHTML=rows.map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}

document.querySelectorAll("[data-cash]").forEach(b=>b.onclick=()=>{
  const s=requireSave();if(!s)return;
  const a=Number(b.dataset.cash);s.cash=(s.cash||0)+a;putSave(s);logAction(`Added ${money(a)} cash.`);
});
document.getElementById("clearDebtBtn").onclick=()=>{const s=requireSave();if(!s)return;s.debt=0;putSave(s);logAction("Cleared all debt.");};
document.getElementById("completeRidesBtn").onclick=()=>{const s=requireSave();if(!s)return;(s.rides||[]).forEach(r=>r.daysLeft=0);(s.outlets||[]).forEach(o=>o.daysLeft=0);putSave(s);logAction("Completed all construction and fit-out.");};
document.getElementById("repairRidesBtn").onclick=()=>{const s=requireSave();if(!s)return;(s.rides||[]).forEach(r=>{r.condition=100;r.down=false});putSave(s);logAction("Repaired all rides to 100%.");};
document.getElementById("addAllRidesBtn").onclick=()=>{
  const s=requireSave();if(!s)return;s.nextRideUid=s.nextRideUid||100;
  RIDES.forEach(r=>s.rides.push({uid:s.nextRideUid++,id:r.id,condition:100,daysLeft:0,down:false,ageDays:0}));
  putSave(s);logAction("Added one operational copy of every attraction.");
};
document.getElementById("addAllOutletsBtn").onclick=()=>{
  const s=requireSave();if(!s)return;s.nextOutletUid=s.nextOutletUid||100;
  OUTLETS.forEach(o=>s.outlets.push({uid:s.nextOutletUid++,id:o.id,daysLeft:0,ageDays:0}));
  putSave(s);logAction("Added one operational copy of every outlet.");
};
document.querySelectorAll("[data-guests]").forEach(b=>b.onclick=()=>{
  const s=requireSave();if(!s)return;const a=Number(b.dataset.guests);s.adminGuestBoost=(s.adminGuestBoost||0)+a;putSave(s);logAction(`Added ${a.toLocaleString()} guests to next-day demand.`);
});
document.getElementById("maxRatingBtn").onclick=()=>{const s=requireSave();if(!s)return;s.rating=5;s.satisfaction=100;putSave(s);logAction("Set rating to 5.0.");};
document.getElementById("maxReputationBtn").onclick=()=>{const s=requireSave();if(!s)return;s.reputation=100;putSave(s);logAction("Set reputation to 100.");};

function seasonFactor(day){
  const d=((day-1)%365)+1;
  if(d>=170&&d<=240)return 1.20;
  if(d>=90&&d<170)return 1.04;
  if(d>240&&d<=305)return .97;
  if(d>=330||d<=55)return .58;
  return .78;
}
function weekend(day){return day%7===6||day%7===0}
function randomWeather(){
  const r=Math.random();
  if(r<.25)return .92;if(r<.50)return .96;if(r<.72)return 1.10;if(r<.86)return 1.18;if(r<.96)return .82;return .62;
}
function simulateOneYear(source){
  const s=JSON.parse(JSON.stringify(source));
  const cfg=DIFFICULTIES[s.difficulty||"medium"]||DIFFICULTIES.medium;
  let cash=s.cash||0,debt=s.debt||0,rating=s.rating||3.2,reputation=s.reputation||50;
  let totalGuests=0,totalRevenue=0,totalCosts=0,totalProfit=0,best=-Infinity,worst=Infinity,lossDays=0;
  const rideObjs=(s.rides||[]).filter(r=>(r.daysLeft||0)<=0&&!r.down).map(o=>({...o,data:RIDES.find(r=>r.id===o.id)})).filter(x=>x.data);
  const outletObjs=(s.outlets||[]).filter(o=>(o.daysLeft||0)<=0).map(o=>({...o,data:OUTLETS.find(x=>x.id===o.id)})).filter(x=>x.data);
  for(let n=0;n<365;n++){
    const day=(s.day||1)+n;
    const appeal=rideObjs.reduce((sum,r)=>sum+r.data.appeal*((r.condition||100)/100),0);
    const cap=Math.max(250,Math.round(rideObjs.reduce((sum,r)=>sum+r.data.capacity,0)*2.15));
    const fair=18+appeal*.34+rating*3.1;
    const pf=clamp(1-((s.ticketPrice||32)-fair)/62,.38,1.18);
    const rep=.72+reputation/100*.62;
    const rat=.72+rating/5*.50;
    const marketing=1+(s.marketing||[]).reduce((sum,m)=>sum+(m.boost||0),0);
    const demand=Math.max(0,Math.round((155+appeal*46)*rep*rat*pf*marketing*seasonFactor(day)*(weekend(day)?1.22:1)*randomWeather()*cfg.demand));
    const guests=Math.min(demand,cap);
    const yieldRate=clamp(.68+rating*.015-Math.max(0,(s.ticketPrice||32)-45)*.002,.60,.78);
    let revenue=guests*(s.ticketPrice||32)*yieldRate+guests*.34*(s.parkingPrice||7);
    let outletGross=0,outletProfit=0;
    outletObjs.forEach(o=>{const served=Math.min(guests*.28,o.data.capacity),g=served*o.data.spend;outletGross+=g;outletProfit+=g*o.data.margin});
    revenue+=outletGross;
    const upkeep=rideObjs.reduce((sum,r)=>sum+r.data.upkeep,0);
    const payroll=1400 + rideObjs.length*220 + outletObjs.length*160;
    const overhead=1600+rideObjs.length*150+outletObjs.length*75;
    const fixed=(upkeep+outletObjs.length*180+payroll+overhead)*cfg.fixedCosts;
    const variable=guests*1.55*cfg.variableCosts;
    const interest=debt*(debt<cash*.2?.075:.10)/365;
    const principal=debt>0?debt/(365*5):0;
    const costs=fixed+(outletGross-outletProfit)+variable+interest+principal;
    const profit=revenue-costs;
    cash+=profit;debt=Math.max(0,debt-principal);
    totalGuests+=guests;totalRevenue+=revenue;totalCosts+=costs;totalProfit+=profit;
    best=Math.max(best,profit);worst=Math.min(worst,profit);if(profit<0)lossDays++;
    rating=clamp(rating+(profit>=0?.001:-.0015),1,5);
    reputation=clamp(reputation+(profit>=0?.01:-.02),0,100);
  }
  return{guests:totalGuests,revenue:totalRevenue,costs:totalCosts,profit:totalProfit,best,worst,lossDays,endingCash:cash};
}
document.getElementById("runYearBtn").onclick=()=>{
  const s=requireSave();if(!s)return;
  const runs=Number(document.getElementById("simRuns").value||1);
  const started=performance.now(),results=[];
  for(let i=0;i<runs;i++)results.push(simulateOneYear(s));
  const elapsed=performance.now()-started;
  const metrics=["guests","revenue","costs","profit","best","worst","lossDays","endingCash"];
  const stats={};
  metrics.forEach(k=>{
    const vals=results.map(r=>r[k]);
    stats[k]={avg:vals.reduce((a,b)=>a+b,0)/vals.length,best:Math.max(...vals),worst:Math.min(...vals)};
  });
  const labels={guests:"Annual guests",revenue:"Annual revenue",costs:"Annual costs",profit:"Annual profit",best:"Best single day",worst:"Worst single day",lossDays:"Loss-making days",endingCash:"Ending cash"};
  document.getElementById("simulationSummary").textContent=`Completed ${runs} scenario${runs===1?"":"s"} (${(runs*365).toLocaleString()} simulated days) in ${elapsed.toFixed(1)} ms.`;
  document.getElementById("simulationTable").innerHTML=metrics.map(k=>{
    const f=k==="guests"||k==="lossDays"?n=>Math.round(n).toLocaleString():money;
    return`<tr><td>${labels[k]}</td><td>${f(stats[k].avg)}</td><td>${f(stats[k].best)}</td><td>${f(stats[k].worst)}</td></tr>`;
  }).join("");
};
document.getElementById("benchmarkBtn").onclick=()=>{
  const start=performance.now();let x=0;
  for(let i=0;i<1500000;i++)x+=Math.sin(i%360)*Math.cos(i%180);
  const ms=performance.now()-start;
  document.getElementById("benchmarkResult").textContent=`1.5m calculation benchmark: ${ms.toFixed(1)} ms. Lower is faster. Result checksum ${x.toFixed(2)}.`;
};
document.getElementById("exportSaveBtn").onclick=()=>{
  const s=requireSave();if(!s)return;
  const blob=new Blob([JSON.stringify(s,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`park-empire-save-day-${s.day}.json`;a.click();URL.revokeObjectURL(a.href);
};
document.getElementById("copySaveBtn").onclick=async()=>{
  const s=requireSave();if(!s)return;
  try{await navigator.clipboard.writeText(JSON.stringify(s,null,2));logAction("Copied save JSON to clipboard.");}catch{alert("Clipboard access was unavailable.")}
};
document.getElementById("refreshBtn").onclick=refreshDashboard;
document.getElementById("logoutBtn").onclick=()=>{sessionStorage.removeItem("pe_admin");location.reload()};

function unlock(){
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("adminApp").classList.remove("hidden");
  refreshDashboard();
}
document.getElementById("loginBtn").onclick=()=>{
  if(document.getElementById("passwordInput").value===ADMIN_PASSWORD){
    sessionStorage.setItem("pe_admin","1");unlock();
  }else document.getElementById("loginError").textContent="Incorrect password.";
};
document.getElementById("passwordInput").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("loginBtn").click()});
if(sessionStorage.getItem("pe_admin")==="1")unlock();
