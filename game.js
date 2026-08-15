const SAVE_KEY="parkEmpireV1";
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const rand=(a,b)=>Math.random()*(b-a)+a;

const attractionCatalog=[
{id:"carousel",name:"Classic Carousel",type:"Family Ride",cost:180000,appeal:6,capacity:350,upkeep:900,staff:2,reliability:0.98,desc:"Low-risk family attraction. Reliable and cheap to operate."},
{id:"dodgems",name:"Dodgems",type:"Family Ride",cost:320000,appeal:9,capacity:500,upkeep:1600,staff:3,reliability:0.96,desc:"Strong family appeal and dependable throughput."},
{id:"flume",name:"River Rapids",type:"Water Ride",cost:1400000,appeal:18,capacity:900,upkeep:7000,staff:7,reliability:0.92,desc:"High summer demand and strong guest appeal."},
{id:"woodie",name:"Timber Run",type:"Wooden Coaster",cost:2800000,appeal:28,capacity:1100,upkeep:14000,staff:10,reliability:0.90,desc:"A major regional draw with meaningful maintenance exposure."},
{id:"invert",name:"Skybreaker",type:"Inverted Coaster",cost:5500000,appeal:42,capacity:1350,upkeep:26000,staff:14,reliability:0.88,desc:"Flagship thrill ride capable of transforming attendance."},
{id:"hyper",name:"Titan",type:"Hyper Coaster",cost:12500000,appeal:70,capacity:1900,upkeep:60000,staff:20,reliability:0.85,desc:"A national-level headline attraction with enormous capital risk."}
];

const foodCatalog=[
{id:"coffee",name:"Coffee Kiosk",cost:45000,spend:2.3,margin:0.64,capacity:500,staff:2,desc:"Cheap entry point for secondary spend."},
{id:"burger",name:"Burger Shack",cost:110000,spend:4.8,margin:0.58,capacity:700,staff:4,desc:"Reliable high-volume food outlet."},
{id:"souvenir",name:"Souvenir Shop",cost:90000,spend:3.5,margin:0.68,capacity:600,staff:3,desc:"Good margins and scales well with attendance."},
{id:"restaurant",name:"Family Restaurant",cost:420000,spend:8.2,margin:0.52,capacity:850,staff:10,desc:"Higher spend per guest but expensive to staff."}
];

const marketingCatalog=[
{id:"local",name:"Local Campaign",cost:12000,days:7,boost:0.08,desc:"+8% demand for 7 days"},
{id:"social",name:"Social Media Push",cost:35000,days:10,boost:0.14,desc:"+14% demand for 10 days"},
{id:"tv",name:"Regional TV Campaign",cost:120000,days:14,boost:0.24,desc:"+24% demand for 14 days"},
{id:"launch",name:"Major Launch Campaign",cost:350000,days:21,boost:0.40,desc:"+40% demand for 21 days"}
];

function newState(){
 return {
  day:1,cash:2000000,debt:0,parkOpen:false,rating:3.2,reputation:50,satisfaction:72,
  ticketPrice:35,parkingPrice:8,fastTrackPrice:0,
  attractions:[{id:"carousel",condition:100}],
  food:[{id:"coffee"}],
  staff:{operators:4,mechanics:2,cleaners:2,security:1,food:2,managers:1},
  marketing:[],
  lastDay:{guests:0,revenue:0,costs:0,profit:0,ticketRevenue:0,secondaryRevenue:0,demand:0,spend:0},
  history:[],latestEvent:"Welcome to Park Empire. Your first park is small, but solvent.",
  bankrupt:false
 };
}

let state=load()||newState();

function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(state));toast("Game saved.");}
function load(){try{return JSON.parse(localStorage.getItem(SAVE_KEY));}catch{return null}}
function resetGame(){if(confirm("Start a completely new park? This will erase the current save.")){state=newState();save();render();}}

function attractionById(id){return attractionCatalog.find(x=>x.id===id)}
function foodById(id){return foodCatalog.find(x=>x.id===id)}

function staffWages(){
 const rates={operators:135,mechanics:180,cleaners:110,security:140,food:120,managers:240};
 return Object.entries(state.staff).reduce((s,[k,v])=>s+rates[k]*v,0);
}
function appeal(){
 return state.attractions.reduce((s,a)=>s+attractionById(a.id).appeal*(a.condition/100),0);
}
function capacity(){
 const rideCap=state.attractions.reduce((s,a)=>s+attractionById(a.id).capacity,0);
 return Math.max(250,Math.floor(rideCap*2.6));
}
function marketingBoost(){return state.marketing.reduce((s,m)=>s+m.boost,0)}
function recommendedStaff(){
 const rideStaff=state.attractions.reduce((s,a)=>s+attractionById(a.id).staff,0);
 const foodStaff=state.food.reduce((s,f)=>s+foodById(f.id).staff,0);
 return {
  operators:Math.max(2,Math.ceil(rideStaff*.65)),
  mechanics:Math.max(1,Math.ceil(state.attractions.length/2)),
  cleaners:Math.max(1,Math.ceil(capacity()/1800)),
  security:Math.max(1,Math.ceil(capacity()/3000)),
  food:foodStaff,
  managers:Math.max(1,Math.ceil((state.attractions.length+state.food.length)/8))
 };
}
function staffingScore(){
 const rec=recommendedStaff();
 let ratios=[];
 Object.keys(rec).forEach(k=>ratios.push(clamp(state.staff[k]/rec[k],0,1.15)));
 return ratios.reduce((a,b)=>a+b,0)/ratios.length;
}
function seasonFactor(day){
 const d=((day-1)%365)+1;
 if(d>=170&&d<=240)return 1.28;
 if(d>=90&&d<170)return 1.08;
 if(d>240&&d<=305)return 1.02;
 if(d>=330||d<=55)return .62;
 return .82;
}
function weekendFactor(day){return day%7===6||day%7===0?1.28:1}
function priceFactor(){
 const fair=22+appeal()*.46+state.rating*3.5;
 return clamp(1-(state.ticketPrice-fair)/80,.45,1.28);
}
function demandEstimate(){
 const base=120+appeal()*58;
 const rep=.65+state.reputation/100*.85;
 const rating=.68+state.rating/5*.7;
 const price=priceFactor();
 const market=1+marketingBoost();
 const season=seasonFactor(state.day)*weekendFactor(state.day);
 const noise=rand(.86,1.14);
 return Math.max(0,Math.round(base*rep*rating*price*market*season*noise));
}
function fixedCosts(){
 const upkeep=state.attractions.reduce((s,a)=>s+attractionById(a.id).upkeep,0);
 const outletFixed=state.food.length*280;
 const debtInterest=state.debt*(0.082/365);
 return upkeep+outletFixed+staffWages()+debtInterest+1200;
}
function maybeEvent(guests){
 if(Math.random()>.24)return null;
 const r=Math.random();
 if(r<.22){return {text:"Heatwave boosted attendance and drink demand.",demand:1.12,spend:1.15,rating:0}}
 if(r<.44){return {text:"Heavy rain reduced walk-up attendance.",demand:.72,spend:.92,rating:0}}
 if(r<.64){return {text:"A viral guest video improved your park's reputation.",demand:1.05,spend:1,reputation:4}}
 if(r<.82 && state.attractions.length){
   const ride=state.attractions[Math.floor(Math.random()*state.attractions.length)];
   ride.condition=clamp(ride.condition-rand(8,18),35,100);
   return {text:`Breakdown risk: ${attractionById(ride.id).name} suffered a technical issue. Condition fell.`,demand:.94,spend:.98,rating:-.08}
 }
 return {text:"Excellent guest reviews improved your park rating.",demand:1.03,spend:1.02,rating:.08}
}
function runDay(){
 if(state.bankrupt)return;
 let demand=demandEstimate();
 let event=maybeEvent(demand);
 if(event){demand=Math.round(demand*(event.demand||1));state.latestEvent=event.text;if(event.reputation)state.reputation=clamp(state.reputation+event.reputation,0,100);if(event.rating)state.rating=clamp(state.rating+event.rating,1,5)}
 else state.latestEvent="A normal trading day with no major incidents.";

 const cap=capacity();
 let guests=state.parkOpen?Math.min(demand,Math.round(cap*rand(.92,1.04))):0;
 const staffScore=staffingScore();
 if(state.parkOpen&&staffScore<.82)guests=Math.round(guests*(.88+staffScore*.12));

 let ticketRevenue=guests*state.ticketPrice;
 let parkingTake=guests*.42*state.parkingPrice;
 let fastTrackTake=guests*(state.fastTrackPrice>0?clamp(.16-state.fastTrackPrice/400,.03,.16):0)*state.fastTrackPrice;
 let secondaryGross=0,secondaryProfit=0;
 state.food.forEach(f=>{
   const item=foodById(f.id);
   const served=Math.min(guests,item.capacity);
   const gross=served*item.spend*rand(.8,1.2);
   secondaryGross+=gross;
   secondaryProfit+=gross*item.margin;
 });
 if(event)secondaryGross*=event.spend||1;
 const revenue=ticketRevenue+parkingTake+fastTrackTake+secondaryGross;
 let costs=fixedCosts();
 costs+=secondaryGross-secondaryProfit;
 if(state.parkOpen)costs+=guests*.9;

 let queuePressure=guests/Math.max(cap,1);
 let satisfaction=82;
 satisfaction-=Math.max(0,queuePressure-.72)*48;
 satisfaction-=Math.max(0,state.ticketPrice-(25+appeal()*.42))*.45;
 satisfaction+=(staffScore-1)*24;
 satisfaction+=state.attractions.length*1.2;
 satisfaction=clamp(satisfaction+rand(-5,5),25,96);
 state.satisfaction=satisfaction;

 if(state.parkOpen){
  const targetRating=clamp(1+satisfaction/25,1,5);
  state.rating=clamp(state.rating*.92+targetRating*.08,1,5);
  state.reputation=clamp(state.reputation+(satisfaction-70)/40,0,100);
 }

 state.attractions.forEach(a=>{
  const decay=state.parkOpen?rand(.15,.8):rand(.02,.12);
  const mechanicHelp=clamp(state.staff.mechanics/recommendedStaff().mechanics,.5,1.3);
  a.condition=clamp(a.condition-decay/mechanicHelp,25,100);
 });

 const profit=revenue-costs;
 state.cash+=profit;
 state.lastDay={guests,revenue,costs,profit,ticketRevenue,secondaryRevenue:secondaryGross,demand,spend:guests?secondaryGross/guests:0};
 state.history.unshift({day:state.day,guests,revenue,costs,profit,rating:state.rating});
 state.history=state.history.slice(0,60);
 state.marketing=state.marketing.map(m=>({...m,daysLeft:m.daysLeft-1})).filter(m=>m.daysLeft>0);
 state.day++;
 if(state.cash<-500000){state.bankrupt=true;state.latestEvent="BANKRUPTCY: Your cash balance exceeded the emergency overdraft limit."}
 save();
 render();
}

function buyAttraction(id){
 const a=attractionById(id);
 if(state.cash<a.cost)return toast("Not enough cash.");
 state.cash-=a.cost;state.attractions.push({id,condition:100});state.reputation=clamp(state.reputation+2,0,100);render();save();
}
function buyFood(id){
 const f=foodById(id);
 if(state.cash<f.cost)return toast("Not enough cash.");
 state.cash-=f.cost;state.food.push({id});render();save();
}
function repairRide(idx){
 const ride=state.attractions[idx],item=attractionById(ride.id);
 const repair=Math.round((100-ride.condition)/100*item.cost*.06);
 if(repair<1)return;
 if(state.cash<repair)return toast("Not enough cash.");
 state.cash-=repair;ride.condition=100;render();save();
}
function runMarketing(id){
 const m=marketingCatalog.find(x=>x.id===id);
 if(state.cash<m.cost)return toast("Not enough cash.");
 state.cash-=m.cost;state.marketing.push({...m,daysLeft:m.days});render();save();
}
function borrow(amount){state.debt+=amount;state.cash+=amount;save();render()}
function repay(){
 const amt=Math.min(100000,state.debt,state.cash);
 if(amt<=0)return toast("Nothing available to repay.");
 state.debt-=amt;state.cash-=amt;save();render();
}
function parkValue(){
 const assets=state.attractions.reduce((s,a)=>s+attractionById(a.id).cost*(.55+.45*a.condition/100),0)+state.food.reduce((s,f)=>s+foodById(f.id).cost*.7,0);
 return Math.max(0,state.cash+assets-state.debt);
}
function notes(){
 const n=[];
 if(state.ticketPrice>55&&appeal()<60)n.push("Admission price is aggressive for the current attraction lineup.");
 if(staffingScore()<.9)n.push("Staffing is below recommended levels and may reduce guest satisfaction.");
 if(state.debt>parkValue()*.7)n.push("Debt is high relative to park value.");
 if(state.attractions.some(a=>a.condition<70))n.push("At least one attraction needs maintenance.");
 if(state.rating<3)n.push("Park rating is weak. Improve value, reliability and service.");
 if(state.cash<250000)n.push("Cash reserves are dangerously low.");
 if(!n.length)n.push("Operations are broadly stable. Focus on profitable growth.");
 return n;
}
function pricePositionText(){
 const fair=22+appeal()*.46+state.rating*3.5;
 const delta=state.ticketPrice-fair;
 if(delta>15)return `Your ticket is priced well above the park's estimated value point of ${money(fair)}. Demand is likely being suppressed.`;
 if(delta>5)return `Your ticket is slightly premium versus the estimated value point of ${money(fair)}. This can work if guest satisfaction stays high.`;
 if(delta<-8)return `Your ticket is cheap versus the estimated value point of ${money(fair)}. Attendance should be strong, but you may be leaving revenue on the table.`;
 return `Your ticket is close to the estimated value point of ${money(fair)}. This is a balanced pricing position.`;
}
function toast(msg){state.latestEvent=msg;document.getElementById("eventBox").textContent=msg}

function render(){
 document.getElementById("cashKpi").textContent=money(state.cash);
 document.getElementById("valueKpi").textContent=money(parkValue());
 const pk=document.getElementById("profitKpi");pk.textContent=money(state.lastDay.profit);pk.className=state.lastDay.profit>=0?"positive":"negative";
 document.getElementById("guestsKpi").textContent=state.lastDay.guests.toLocaleString();
 document.getElementById("ratingKpi").textContent=state.rating.toFixed(1)+"â";
 document.getElementById("dateKpi").textContent=`Day ${state.day}`;
 const st=document.getElementById("openStatus");st.textContent=state.parkOpen?"OPEN":"CLOSED";st.className="status "+(state.parkOpen?"open":"closed");
 document.getElementById("toggleParkBtn").textContent=state.parkOpen?"Close Park":"Open Park";
 document.getElementById("demandStat").textContent=state.lastDay.demand.toLocaleString();
 document.getElementById("capacityStat").textContent=capacity().toLocaleString();
 document.getElementById("spendStat").textContent=money(state.lastDay.spend);
 document.getElementById("satisfactionStat").textContent=Math.round(state.satisfaction)+"%";
 document.getElementById("ticketRevenue").textContent=money(state.lastDay.ticketRevenue);
 document.getElementById("secondaryRevenue").textContent=money(state.lastDay.secondaryRevenue);
 document.getElementById("operatingCosts").textContent=money(state.lastDay.costs);
 document.getElementById("debtStat").textContent=money(state.debt);
 document.getElementById("eventBox").textContent=state.latestEvent;
 document.getElementById("notesList").innerHTML=notes().map(x=>`<li>${x}</li>`).join("");

 document.getElementById("attractionShop").innerHTML=attractionCatalog.map(a=>`
 <div class="shop-card"><h3>${a.name}</h3><small>${a.type}</small><p>${a.desc}</p>
 <div class="meta"><div><span>Cost</span><strong>${money(a.cost)}</strong></div><div><span>Appeal</span><strong>${a.appeal}</strong></div><div><span>Capacity</span><strong>${a.capacity}/hr</strong></div><div><span>Daily upkeep</span><strong>${money(a.upkeep)}</strong></div></div>
 <button class="primary full" onclick="buyAttraction('${a.id}')">Build</button></div>`).join("");

 document.getElementById("ownedAttractions").innerHTML=state.attractions.map((a,i)=>{const x=attractionById(a.id);const repair=Math.round((100-a.condition)/100*x.cost*.06);return `
 <div class="owned-item"><div><strong>${x.name}</strong><br><small>Condition ${Math.round(a.condition)}% Â· Upkeep ${money(x.upkeep)}/day</small></div>
 ${a.condition<99?`<button class="secondary" onclick="repairRide(${i})">Repair ${money(repair)}</button>`:"<span>Healthy</span>"}</div>`}).join("");

 document.getElementById("foodShop").innerHTML=foodCatalog.map(f=>`
 <div class="shop-card"><h3>${f.name}</h3><p>${f.desc}</p>
 <div class="meta"><div><span>Cost</span><strong>${money(f.cost)}</strong></div><div><span>Spend potential</span><strong>${money(f.spend)}/guest</strong></div><div><span>Margin</span><strong>${Math.round(f.margin*100)}%</strong></div><div><span>Capacity</span><strong>${f.capacity}/day</strong></div></div>
 <button class="primary full" onclick="buyFood('${f.id}')">Build</button></div>`).join("");

 document.getElementById("ownedFood").innerHTML=state.food.map(f=>{const x=foodById(f.id);return `<div class="owned-item"><div><strong>${x.name}</strong><br><small>${Math.round(x.margin*100)}% gross margin Â· ${x.capacity} guest capacity</small></div></div>`}).join("");

 const rec=recommendedStaff();
 document.getElementById("staffControls").innerHTML=Object.keys(state.staff).map(k=>`
 <div class="staff-row"><span>${k[0].toUpperCase()+k.slice(1)}</span><button onclick="changeStaff('${k}',-1)">â</button><strong>${state.staff[k]}</strong><button onclick="changeStaff('${k}',1)">+</button></div>`).join("");
 document.getElementById("staffAdvice").innerHTML=Object.keys(rec).map(k=>`<div><span>${k[0].toUpperCase()+k.slice(1)}</span><strong>${rec[k]} recommended</strong></div>`).join("");

 const tp=document.getElementById("ticketPrice");tp.value=state.ticketPrice;document.getElementById("ticketPriceLabel").textContent=money(state.ticketPrice);
 const pp=document.getElementById("parkingPrice");pp.value=state.parkingPrice;document.getElementById("parkingLabel").textContent=money(state.parkingPrice);
 const fp=document.getElementById("fastTrackPrice");fp.value=state.fastTrackPrice;document.getElementById("fastTrackLabel").textContent=money(state.fastTrackPrice);
 document.getElementById("pricePosition").textContent=pricePositionText();

 document.getElementById("marketingOptions").innerHTML=marketingCatalog.map(m=>`<div class="shop-card"><h3>${m.name}</h3><p>${m.desc}</p><strong>${money(m.cost)}</strong><button class="primary full" onclick="runMarketing('${m.id}')">Launch</button></div>`).join("");
 document.getElementById("activeMarketing").innerHTML=state.marketing.length?state.marketing.map(m=>`<div class="owned-item"><div><strong>${m.name}</strong><br><small>${Math.round(m.boost*100)}% demand boost Â· ${m.daysLeft} days remaining</small></div></div>`).join(""):"<p>No active campaigns.</p>";

 document.getElementById("financeStats").innerHTML=`
 <div><span>Cash</span><strong>${money(state.cash)}</strong></div>
 <div><span>Outstanding Debt</span><strong>${money(state.debt)}</strong></div>
 <div><span>Estimated Daily Interest</span><strong>${money(state.debt*(.082/365))}</strong></div>
 <div><span>Park Value</span><strong>${money(parkValue())}</strong></div>
 <div><span>Daily Payroll</span><strong>${money(staffWages())}</strong></div>`;

 document.getElementById("reportTable").innerHTML=state.history.map(r=>`<tr><td>Day ${r.day}</td><td>${r.guests.toLocaleString()}</td><td>${money(r.revenue)}</td><td>${money(r.costs)}</td><td class="${r.profit>=0?"positive":"negative"}">${money(r.profit)}</td><td>${r.rating.toFixed(1)}â</td></tr>`).join("");
 if(state.bankrupt)document.getElementById("toggleParkBtn").disabled=true;
}

function changeStaff(k,d){state.staff[k]=Math.max(0,state.staff[k]+d);save();render()}
window.changeStaff=changeStaff;window.buyAttraction=buyAttraction;window.buyFood=buyFood;window.repairRide=repairRide;window.runMarketing=runMarketing;

document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.tab).classList.add("active");
}));
document.getElementById("toggleParkBtn").onclick=()=>{state.parkOpen=!state.parkOpen;save();render()};
document.getElementById("nextDayBtn").onclick=runDay;
document.getElementById("saveBtn").onclick=save;
document.getElementById("resetBtn").onclick=resetGame;
document.querySelectorAll(".loanBtn").forEach(b=>b.onclick=()=>borrow(Number(b.dataset.loan)));
document.getElementById("repayBtn").onclick=repay;
document.getElementById("ticketPrice").oninput=e=>{state.ticketPrice=Number(e.target.value);save();render()};
document.getElementById("parkingPrice").oninput=e=>{state.parkingPrice=Number(e.target.value);save();render()};
document.getElementById("fastTrackPrice").oninput=e=>{state.fastTrackPrice=Number(e.target.value);save();render()};
render();
