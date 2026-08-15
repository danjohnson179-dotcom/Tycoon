const SAVE_KEY="parkEmpireV3";
const GBP="\u00A3";
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Math.round(Number(n)||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const rand=(a,b)=>Math.random()*(b-a)+a;

const attractionCatalog=[
{id:"carousel",name:"Classic Carousel",type:"Family Ride",cost:180000,appeal:6,capacity:350,upkeep:900,staff:2,desc:"Cheap, reliable and useful for families."},
{id:"dodgems",name:"Dodgems",type:"Family Ride",cost:320000,appeal:9,capacity:500,upkeep:1600,staff:3,desc:"A dependable family attraction with good throughput."},
{id:"drop",name:"Sky Drop",type:"Thrill Ride",cost:720000,appeal:14,capacity:620,upkeep:3400,staff:4,desc:"Adds a meaningful thrill offer without coaster-level cost."},
{id:"flume",name:"River Rapids",type:"Water Ride",cost:1400000,appeal:18,capacity:900,upkeep:7000,staff:7,desc:"Strong family demand and excellent summer performance."},
{id:"woodie",name:"Timber Run",type:"Wooden Coaster",cost:2800000,appeal:28,capacity:1100,upkeep:14000,staff:10,desc:"A true headline ride for a growing regional park."},
{id:"launch",name:"Velocity",type:"Launch Coaster",cost:4200000,appeal:36,capacity:1250,upkeep:21000,staff:12,desc:"High impact and expensive, but capable of driving destination visits."},
{id:"invert",name:"Skybreaker",type:"Inverted Coaster",cost:5500000,appeal:42,capacity:1350,upkeep:26000,staff:14,desc:"A flagship thrill coaster with major draw."},
{id:"dark",name:"Mythic Manor",type:"Dark Ride",cost:7800000,appeal:52,capacity:1600,upkeep:33000,staff:16,desc:"Weather-proof family headline attraction with strong capacity."},
{id:"hyper",name:"Titan",type:"Hyper Coaster",cost:12500000,appeal:70,capacity:1900,upkeep:60000,staff:20,desc:"A national-level coaster with huge upside and huge cost."},
{id:"giga",name:"Apex 300",type:"Giga Coaster",cost:26000000,appeal:105,capacity:2300,upkeep:110000,staff:26,desc:"The ultimate statement attraction for a huge resort."}
];

const foodCatalog=[
{id:"coffee",name:"Coffee Kiosk",cost:45000,spend:2.3,margin:.64,capacity:500,staff:2,desc:"Low-cost outlet that adds a little spend per guest."},
{id:"burger",name:"Burger Shack",cost:110000,spend:4.8,margin:.58,capacity:700,staff:4,desc:"Reliable food revenue for a growing park."},
{id:"souvenir",name:"Souvenir Shop",cost:90000,spend:3.5,margin:.68,capacity:600,staff:3,desc:"High-margin retail that scales well with attendance."},
{id:"icecream",name:"Ice Cream Parlour",cost:145000,spend:3.9,margin:.62,capacity:750,staff:4,desc:"Strong family and summer secondary spend."},
{id:"restaurant",name:"Family Restaurant",cost:420000,spend:8.2,margin:.52,capacity:850,staff:10,desc:"Higher spend per guest, but heavier staffing costs."},
{id:"premium",name:"Premium Dining",cost:950000,spend:13.5,margin:.48,capacity:700,staff:16,desc:"Premium dining for high-spend guests."}
];

const marketingCatalog=[
{id:"local",name:"Local Ads",cost:12000,days:7,boost:.08,desc:"A cheap short-term boost to local demand."},
{id:"social",name:"Social Campaign",cost:35000,days:10,boost:.14,desc:"A broader digital campaign with stronger reach."},
{id:"tv",name:"Regional TV",cost:120000,days:14,boost:.24,desc:"Expensive, but can materially move attendance."},
{id:"launch",name:"Major Launch",cost:350000,days:21,boost:.40,desc:"A huge campaign best used around major investments."}
];

function newState(){
 return {
  version:3,day:1,cash:2000000,debt:0,parkOpen:false,rating:3.2,lastRating:3.2,reputation:50,satisfaction:72,
  ticketPrice:35,parkingPrice:8,fastTrackPrice:0,
  attractions:[{id:"carousel",condition:100}],
  food:[{id:"coffee"}],
  staff:{operators:4,mechanics:2,cleaners:2,security:1,food:2,managers:1},
  marketing:[],
  lastDay:{guests:0,revenue:0,costs:0,profit:0,ticketRevenue:0,secondaryRevenue:0,demand:0,spend:0},
  history:[],
  activity:[
   {text:"Company launched with one carousel and one coffee kiosk.",day:1},
   {text:"Starting cash available: "+money(2000000)+".",day:1}
  ],
  bankrupt:false
 };
}

let state=load()||newState();

function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));return s&&s.version===3?s:null}catch{return null}}
function save(show=false){localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(show)notify("Game saved")}
function addActivity(text){state.activity.unshift({text,day:state.day});state.activity=state.activity.slice(0,8)}
function attractionById(id){return attractionCatalog.find(x=>x.id===id)}
function foodById(id){return foodCatalog.find(x=>x.id===id)}

function staffWages(){
 const rates={operators:135,mechanics:180,cleaners:110,security:140,food:120,managers:240};
 return Object.entries(state.staff).reduce((sum,[k,v])=>sum+rates[k]*v,0)
}
function appeal(){return state.attractions.reduce((sum,a)=>sum+attractionById(a.id).appeal*(a.condition/100),0)}
function capacity(){return Math.max(250,Math.floor(state.attractions.reduce((sum,a)=>sum+attractionById(a.id).capacity,0)*2.6))}
function marketingBoost(){return state.marketing.reduce((sum,m)=>sum+m.boost,0)}
function fairValue(){return 22+appeal()*.46+state.rating*3.5}
function priceFactor(){return clamp(1-(state.ticketPrice-fairValue())/80,.45,1.28)}
function seasonFactor(day){
 const d=((day-1)%365)+1;
 if(d>=170&&d<=240)return 1.28;
 if(d>=90&&d<170)return 1.08;
 if(d>240&&d<=305)return 1.02;
 if(d>=330||d<=55)return .62;
 return .82
}
function seasonName(day){
 const d=((day-1)%365)+1;
 if(d>=170&&d<=240)return"Summer";
 if(d>=90&&d<170)return"Spring";
 if(d>240&&d<=305)return"Autumn";
 return"Winter"
}
function weekendFactor(day){return day%7===6||day%7===0?1.28:1}
function recommendedStaff(){
 const rideStaff=state.attractions.reduce((sum,a)=>sum+attractionById(a.id).staff,0);
 const foodStaff=state.food.reduce((sum,f)=>sum+foodById(f.id).staff,0);
 return{
  operators:Math.max(2,Math.ceil(rideStaff*.65)),
  mechanics:Math.max(1,Math.ceil(state.attractions.length/2)),
  cleaners:Math.max(1,Math.ceil(capacity()/1800)),
  security:Math.max(1,Math.ceil(capacity()/3000)),
  food:foodStaff,
  managers:Math.max(1,Math.ceil((state.attractions.length+state.food.length)/8))
 }
}
function staffingScore(){
 const rec=recommendedStaff(),ratios=[];
 Object.keys(rec).forEach(k=>ratios.push(clamp(state.staff[k]/rec[k],0,1.15)));
 return ratios.reduce((a,b)=>a+b,0)/ratios.length
}
function fixedCosts(){
 const upkeep=state.attractions.reduce((sum,a)=>sum+attractionById(a.id).upkeep,0);
 return upkeep+state.food.length*280+staffWages()+state.debt*(.082/365)+1200
}
function demandEstimate(noise=true){
 const base=120+appeal()*58;
 const rep=.65+state.reputation/100*.85;
 const rating=.68+state.rating/5*.7;
 const random=noise?rand(.86,1.14):1;
 return Math.max(0,Math.round(base*rep*rating*priceFactor()*(1+marketingBoost())*seasonFactor(state.day)*weekendFactor(state.day)*random))
}
function projectedFoodRevenue(guests){
 let gross=0,profit=0;
 state.food.forEach(f=>{
  const item=foodById(f.id);
  const served=Math.min(guests,item.capacity);
  const g=served*item.spend;
  gross+=g;
  profit+=g*item.margin
 });
 return{gross,profit}
}
function forecast(){
 const demand=demandEstimate(false);
 const guests=Math.min(demand,capacity());
 const ticket=guests*state.ticketPrice;
 const parking=guests*.42*state.parkingPrice;
 const fast=guests*(state.fastTrackPrice>0?clamp(.16-state.fastTrackPrice/400,.03,.16):0)*state.fastTrackPrice;
 const secondary=projectedFoodRevenue(guests);
 const revenue=ticket+parking+fast+secondary.gross;
 const costs=fixedCosts()+(secondary.gross-secondary.profit)+(state.parkOpen?guests*.9:0);
 return{demand,guests,revenue,costs,profit:revenue-costs}
}
function parkValue(){
 const rideAssets=state.attractions.reduce((sum,a)=>sum+attractionById(a.id).cost*(.55+.45*a.condition/100),0);
 const foodAssets=state.food.reduce((sum,f)=>sum+foodById(f.id).cost*.7,0);
 return Math.max(0,state.cash+rideAssets+foodAssets-state.debt)
}
function attractionImpact(a){
 const before=demandEstimate(false);
 const oldAppeal=appeal();
 const newAppeal=oldAppeal+a.appeal;
 const oldFair=fairValue();
 const newFair=22+newAppeal*.46+state.rating*3.5;
 const oldPF=priceFactor();
 const newPF=clamp(1-(state.ticketPrice-newFair)/80,.45,1.28);
 const ratio=((120+newAppeal*58)/(120+oldAppeal*58))*(newPF/oldPF);
 return{
  demand:Math.max(0,Math.round(before*(ratio-1))),
  capacity:Math.round(a.capacity*2.6),
  fair:newFair-oldFair
 }
}

function randomEvent(){
 if(Math.random()>.22)return null;
 const r=Math.random();
 if(r<.22)return{text:"Hot weather increased demand and spending.",demand:1.12,spend:1.15};
 if(r<.44)return{text:"Heavy rain reduced walk-up demand.",demand:.72,spend:.92};
 if(r<.64)return{text:"Positive social media coverage improved reputation.",demand:1.05,reputation:3};
 if(r<.82){
  const ride=state.attractions[Math.floor(Math.random()*state.attractions.length)];
  ride.condition=clamp(ride.condition-rand(8,18),35,100);
  return{text:`${attractionById(ride.id).name} suffered a technical issue.`,demand:.94,rating:-.08}
 }
 return{text:"Guest reviews were unusually positive today.",demand:1.03,rating:.08}
}

function runDay(){
 if(state.bankrupt)return notify("The company is bankrupt. Start a new game.");

 let demand=demandEstimate(true);
 const event=randomEvent();
 if(event){
  demand=Math.round(demand*(event.demand||1));
  if(event.reputation)state.reputation=clamp(state.reputation+event.reputation,0,100);
  if(event.rating)state.rating=clamp(state.rating+event.rating,1,5)
 }

 const cap=capacity();
 const staffScore=staffingScore();
 let guests=state.parkOpen?Math.min(demand,Math.round(cap*rand(.92,1.04))):0;
 if(state.parkOpen&&staffScore<.82)guests=Math.round(guests*(.88+staffScore*.12));

 const ticketRevenue=guests*state.ticketPrice;
 const parkingRevenue=guests*.42*state.parkingPrice;
 const fastRevenue=guests*(state.fastTrackPrice>0?clamp(.16-state.fastTrackPrice/400,.03,.16):0)*state.fastTrackPrice;

 let secondaryGross=0,secondaryProfit=0;
 state.food.forEach(f=>{
  const item=foodById(f.id);
  const served=Math.min(guests,item.capacity);
  const gross=served*item.spend*rand(.8,1.2);
  secondaryGross+=gross;
  secondaryProfit+=gross*item.margin
 });
 if(event)secondaryGross*=event.spend||1;

 const revenue=ticketRevenue+parkingRevenue+fastRevenue+secondaryGross;
 const costs=fixedCosts()+(secondaryGross-secondaryProfit)+(state.parkOpen?guests*.9:0);

 state.lastRating=state.rating;
 let satisfaction=82;
 const pressure=guests/Math.max(cap,1);
 satisfaction-=Math.max(0,pressure-.72)*48;
 satisfaction-=Math.max(0,state.ticketPrice-(25+appeal()*.42))*.45;
 satisfaction+=(staffScore-1)*24;
 satisfaction+=state.attractions.length*1.2;
 satisfaction=clamp(satisfaction+rand(-5,5),25,96);
 state.satisfaction=satisfaction;

 if(state.parkOpen){
  const targetRating=clamp(1+satisfaction/25,1,5);
  state.rating=clamp(state.rating*.92+targetRating*.08,1,5);
  state.reputation=clamp(state.reputation+(satisfaction-70)/40,0,100)
 }

 state.attractions.forEach(a=>{
  const decay=state.parkOpen?rand(.15,.8):rand(.02,.12);
  const mechanicHelp=clamp(state.staff.mechanics/recommendedStaff().mechanics,.5,1.3);
  a.condition=clamp(a.condition-decay/mechanicHelp,25,100)
 });

 const profit=revenue-costs;
 state.cash+=profit;
 state.lastDay={guests,revenue,costs,profit,ticketRevenue,secondaryRevenue:secondaryGross,demand,spend:guests?secondaryGross/guests:0};
 state.history.unshift({day:state.day,guests,revenue,costs,profit,rating:state.rating});
 state.history=state.history.slice(0,90);

 let summary=state.parkOpen
  ? `Day ${state.day}: ${guests.toLocaleString()} guests, ${money(profit)} profit.`
  : `Day ${state.day}: Park remained closed and incurred ${money(costs)} costs.`;
 addActivity(summary);
 if(event)addActivity(event.text);

 state.marketing=state.marketing.map(m=>({...m,daysLeft:m.daysLeft-1})).filter(m=>m.daysLeft>0);
 state.day++;
 if(state.cash<-500000){state.bankrupt=true;addActivity("Company entered bankruptcy.")}

 save();
 render();
 showDayModal(event?event.text:"No major event today.")
}

function buyAttraction(id){
 const a=attractionById(id);
 if(state.cash<a.cost)return notify("Not enough cash");
 const impact=attractionImpact(a);
 state.cash-=a.cost;
 state.attractions.push({id,condition:100});
 state.reputation=clamp(state.reputation+2,0,100);
 addActivity(`Built ${a.name} for ${money(a.cost)}. Forecast demand +${impact.demand.toLocaleString()}, capacity +${impact.capacity.toLocaleString()}.`);
 save();render();notify(`${a.name} added to Your Attractions`)
}
function buyFood(id){
 const f=foodById(id);
 if(state.cash<f.cost)return notify("Not enough cash");
 state.cash-=f.cost;
 state.food.push({id});
 addActivity(`Opened ${f.name} for ${money(f.cost)}. It can serve up to ${f.capacity.toLocaleString()} guests per day.`);
 save();render();notify(`${f.name} added to Your Outlets`)
}
function repairRide(index){
 const ride=state.attractions[index],item=attractionById(ride.id);
 const cost=Math.round((100-ride.condition)/100*item.cost*.06);
 if(cost<1)return notify("Ride condition is already excellent");
 if(state.cash<cost)return notify("Not enough cash");
 state.cash-=cost;
 ride.condition=100;
 addActivity(`Repaired ${item.name} for ${money(cost)}.`);
 save();render();notify(`${item.name} repaired`)
}
function runMarketing(id){
 const m=marketingCatalog.find(x=>x.id===id);
 if(state.cash<m.cost)return notify("Not enough cash");
 state.cash-=m.cost;
 state.marketing.push({...m,daysLeft:m.days});
 addActivity(`Launched ${m.name}. Demand +${Math.round(m.boost*100)}% for ${m.days} days.`);
 save();render();notify(`${m.name} launched`)
}
function borrow(amount){
 state.debt+=amount;
 state.cash+=amount;
 addActivity(`Borrowed ${money(amount)}.`);
 save();render();notify(`${money(amount)} added to cash`)
}
function repay(){
 const amount=Math.min(100000,state.debt,state.cash);
 if(amount<=0)return notify("Nothing available to repay");
 state.debt-=amount;
 state.cash-=amount;
 addActivity(`Repaid ${money(amount)} of debt.`);
 save();render();notify(`${money(amount)} repaid`)
}
function changeStaff(key,delta){
 state.staff[key]=Math.max(0,state.staff[key]+delta);
 addActivity(`${key} staffing changed to ${state.staff[key]}.`);
 save();render()
}
function resetGame(){
 if(confirm("Delete your current company and start a new game?")){
  state=newState();save();render();notify("New game started")
 }
}

function pricePositionText(){
 const fair=fairValue();
 const delta=state.ticketPrice-fair;
 if(delta>15)return`Your ticket price is far above the park's current perceived value. Demand is being heavily reduced.`;
 if(delta>5)return`Your ticket price is slightly premium. You are trading some attendance for higher yield.`;
 if(delta<-8)return`Your ticket price is cheap for the current attraction lineup. Attendance benefits, but you may be underpricing.`;
 return`Your ticket price is close to perceived fair value.`
}

let toastTimer;
function notify(message){
 const el=document.getElementById("toast");
 el.textContent=message;
 el.classList.add("show");
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.classList.remove("show"),2500)
}

function renderHQOwned(){
 const rides=state.attractions.map(a=>attractionById(a.id));
 const food=state.food.map(f=>foodById(f.id));
 document.getElementById("hqOwnedRides").innerHTML=rides.map(r=>`<div class="hq-owned-item"><strong>${r.name}</strong><span>Appeal ${r.appeal}</span></div>`).join("");
 document.getElementById("hqOwnedFood").innerHTML=food.map(f=>`<div class="hq-owned-item"><strong>${f.name}</strong><span>${money(f.spend)}/guest</span></div>`).join("");
 document.getElementById("assetCount").textContent=`${rides.length+food.length} assets`;
}

function render(){
 const f=forecast();
 const value=parkValue();
 document.getElementById("cashKpi").textContent=money(state.cash);
 document.getElementById("valueKpi").textContent=money(value);

 const profitEl=document.getElementById("profitKpi");
 profitEl.textContent=money(state.lastDay.profit);
 profitEl.className=state.lastDay.profit>=0?"positive":"negative";

 document.getElementById("guestsKpi").textContent=state.lastDay.guests.toLocaleString();
 document.getElementById("ratingKpi").textContent=`${state.rating.toFixed(1)} / 5`;
 document.getElementById("satisfactionStat").textContent=Math.round(state.satisfaction)+"%";

 const st=document.getElementById("openStatus");
 st.textContent=state.parkOpen?"OPEN":"CLOSED";
 st.className="status "+(state.parkOpen?"open":"closed");
 document.getElementById("parkStatusTitle").textContent=state.parkOpen?"Park Open":"Park Closed";
 document.getElementById("toggleParkBtn").textContent=state.parkOpen?"Close Park":"Open Park";
 document.getElementById("nextDayBtn").textContent=state.parkOpen?"Trade Day":"Advance Closed Day";

 document.getElementById("forecastGuests").textContent=f.guests.toLocaleString();
 const fp=document.getElementById("forecastProfit");
 fp.textContent=money(state.parkOpen?f.profit:-fixedCosts());
 fp.className=(state.parkOpen?f.profit:-fixedCosts())>=0?"positive":"negative";
 document.getElementById("forecastNote").textContent=`${seasonName(state.day)} | ${weekendFactor(state.day)>1?"Weekend":"Weekday"} | Ticket demand effect ${Math.round(priceFactor()*100)}%`;

 document.getElementById("ticketRevenue").textContent=money(state.lastDay.ticketRevenue);
 document.getElementById("secondaryRevenue").textContent=money(state.lastDay.secondaryRevenue);
 document.getElementById("operatingCosts").textContent=money(state.lastDay.costs);

 document.getElementById("appealStat").textContent=Math.round(appeal()).toLocaleString();
 document.getElementById("capacityStat").textContent=capacity().toLocaleString();
 document.getElementById("priceEffectStat").textContent=Math.round(priceFactor()*100)+"%";
 document.getElementById("marketingStat").textContent=Math.round(marketingBoost()*100)+"%";
 renderHQOwned();

 document.getElementById("activityFeed").innerHTML=state.activity.length
  ? state.activity.map(a=>`<div class="activity-item">${a.text}<small>Day ${a.day}</small></div>`).join("")
  : `<div class="activity-item">No activity yet.</div>`;

 document.getElementById("rideCount").textContent=`${state.attractions.length} owned`;
 document.getElementById("ownedAttractions").innerHTML=state.attractions.map((a,i)=>{
  const r=attractionById(a.id);
  const repair=Math.round((100-a.condition)/100*r.cost*.06);
  return`<div class="owned-item">
    <div><strong>${r.name}</strong><small>${r.type} | Appeal ${r.appeal} | Capacity ${r.capacity.toLocaleString()}/hr</small></div>
    <div class="owned-right"><strong>${Math.round(a.condition)}% condition</strong>${a.condition<99?`<button onclick="repairRide(${i})">Repair ${money(repair)}</button>`:""}</div>
  </div>`
 }).join("");

 document.getElementById("attractionShop").innerHTML=attractionCatalog.map(r=>{
  const impact=attractionImpact(r);
  return`<div class="shop-card">
    <h3>${r.name}</h3><small>${r.type}</small><p>${r.desc}</p>
    <div class="meta">
      <div><span>Build cost</span><strong>${money(r.cost)}</strong></div>
      <div><span>Daily upkeep</span><strong>${money(r.upkeep)}</strong></div>
      <div><span>Guest appeal</span><strong>+${r.appeal}</strong></div>
      <div><span>Park capacity</span><strong>+${impact.capacity.toLocaleString()}</strong></div>
    </div>
    <div class="impact">Expected effect: around +${impact.demand.toLocaleString()} forecast guests at current pricing.</div>
    <button class="primary full" onclick="buyAttraction('${r.id}')">Build ${r.name}</button>
  </div>`
 }).join("");

 document.getElementById("outletCount").textContent=`${state.food.length} owned`;
 document.getElementById("ownedFood").innerHTML=state.food.map(f=>{
  const x=foodById(f.id);
  return`<div class="owned-item">
    <div><strong>${x.name}</strong><small>Serves up to ${x.capacity.toLocaleString()} guests/day</small></div>
    <div class="owned-right"><strong>${money(x.spend)}/guest</strong><small>${Math.round(x.margin*100)}% margin</small></div>
  </div>`
 }).join("");

 document.getElementById("foodShop").innerHTML=foodCatalog.map(f=>`<div class="shop-card">
   <h3>${f.name}</h3><p>${f.desc}</p>
   <div class="meta">
     <div><span>Build cost</span><strong>${money(f.cost)}</strong></div>
     <div><span>Spend potential</span><strong>${money(f.spend)}/guest</strong></div>
     <div><span>Gross margin</span><strong>${Math.round(f.margin*100)}%</strong></div>
     <div><span>Daily capacity</span><strong>${f.capacity.toLocaleString()}</strong></div>
   </div>
   <div class="impact">Use: increases secondary revenue from guests already visiting the park.</div>
   <button class="primary full" onclick="buyFood('${f.id}')">Open ${f.name}</button>
 </div>`).join("");

 const rec=recommendedStaff();
 document.getElementById("staffControls").innerHTML=Object.keys(state.staff).map(k=>`<div class="staff-row"><span>${k}</span><button onclick="changeStaff('${k}',-1)">-</button><strong>${state.staff[k]}</strong><button onclick="changeStaff('${k}',1)">+</button></div>`).join("");
 document.getElementById("staffAdvice").innerHTML=Object.keys(rec).map(k=>`<div><span>${k}</span><strong>${state.staff[k]} / ${rec[k]}</strong></div>`).join("");
 const score=staffingScore();
 document.getElementById("staffScoreBox").innerHTML=`<strong class="${score>=.95?"positive":score>=.8?"warning":"negative"}">${Math.round(score*100)}%</strong><span>overall staffing coverage</span>`;

 const tp=document.getElementById("ticketPrice");
 tp.value=state.ticketPrice;
 document.getElementById("ticketPriceLabel").textContent=money(state.ticketPrice);
 const pp=document.getElementById("parkingPrice");
 pp.value=state.parkingPrice;
 document.getElementById("parkingLabel").textContent=money(state.parkingPrice);
 const ft=document.getElementById("fastTrackPrice");
 ft.value=state.fastTrackPrice;
 document.getElementById("fastTrackLabel").textContent=money(state.fastTrackPrice);
 document.getElementById("pricePosition").textContent=pricePositionText();
 document.getElementById("fairValueStat").textContent=money(fairValue());
 document.getElementById("priceDemandStat").textContent=Math.round(priceFactor()*100)+"%";

 document.getElementById("marketingOptions").innerHTML=marketingCatalog.map(m=>`<div class="shop-card">
   <h3>${m.name}</h3><p>${m.desc}</p>
   <div class="meta"><div><span>Cost</span><strong>${money(m.cost)}</strong></div><div><span>Demand boost</span><strong>+${Math.round(m.boost*100)}%</strong></div></div>
   <button class="primary full" onclick="runMarketing('${m.id}')">Launch Campaign</button>
 </div>`).join("");
 document.getElementById("activeMarketing").innerHTML=state.marketing.length
  ? state.marketing.map(m=>`<div class="owned-item"><div><strong>${m.name}</strong><small>${m.daysLeft} days remaining</small></div><strong>+${Math.round(m.boost*100)}%</strong></div>`).join("")
  : `<div class="owned-item"><div><strong>No active campaigns</strong><small>Launch one above to increase demand.</small></div></div>`;

 document.getElementById("financeStats").innerHTML=`
   <div><span>Cash</span><strong>${money(state.cash)}</strong></div>
   <div><span>Debt</span><strong>${money(state.debt)}</strong></div>
   <div><span>Daily interest</span><strong>${money(state.debt*(.082/365))}</strong></div>
   <div><span>Daily payroll</span><strong>${money(staffWages())}</strong></div>
   <div><span>Park value</span><strong>${money(value)}</strong></div>`;

 const hist=state.history;
 const total=hist.reduce((s,x)=>s+x.profit,0);
 const avg=hist.length?hist.reduce((s,x)=>s+x.guests,0)/hist.length:0;
 const best=hist.length?Math.max(...hist.map(x=>x.profit)):0;
 document.getElementById("reportSummary").innerHTML=`
  <div><span>Total profit</span><strong class="${total>=0?"positive":"negative"}">${money(total)}</strong></div>
  <div><span>Average guests</span><strong>${Math.round(avg).toLocaleString()}</strong></div>
  <div><span>Best day</span><strong>${money(best)}</strong></div>`;
 document.getElementById("reportTable").innerHTML=hist.map(r=>`<tr><td>Day ${r.day}</td><td>${r.guests.toLocaleString()}</td><td>${money(r.revenue)}</td><td>${money(r.costs)}</td><td class="${r.profit>=0?"positive":"negative"}">${money(r.profit)}</td></tr>`).join("");

 document.getElementById("toggleParkBtn").disabled=state.bankrupt
}

function showDayModal(eventText){
 const d=state.lastDay;
 document.getElementById("modalTitle").textContent=state.parkOpen?(d.profit>=0?"Profitable Trading Day":"Loss-Making Trading Day"):"Closed Day";
 document.getElementById("modalProfit").innerHTML=`<strong class="${d.profit>=0?"positive":"negative"}">${money(d.profit)}</strong><span>net result</span>`;
 document.getElementById("modalStats").innerHTML=`
  <div><span>Guests</span><strong>${d.guests.toLocaleString()}</strong></div>
  <div><span>Revenue</span><strong>${money(d.revenue)}</strong></div>
  <div><span>Costs</span><strong>${money(d.costs)}</strong></div>
  <div><span>Rating</span><strong>${state.rating.toFixed(1)} / 5</strong></div>`;
 document.getElementById("modalEvent").textContent=eventText;
 document.getElementById("dayModal").classList.remove("hidden")
}

window.buyAttraction=buyAttraction;
window.buyFood=buyFood;
window.repairRide=repairRide;
window.runMarketing=runMarketing;
window.changeStaff=changeStaff;

function openTab(id){
 document.querySelectorAll(".tabs button").forEach(x=>x.classList.toggle("active",x.dataset.tab===id));
 document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.id===id));
 window.scrollTo({top:0,behavior:"smooth"})
}

document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.tab)));
document.querySelectorAll("[data-open-tab]").forEach(b=>b.addEventListener("click",()=>openTab(b.dataset.openTab)));

document.getElementById("toggleParkBtn").onclick=()=>{state.parkOpen=!state.parkOpen;addActivity(state.parkOpen?"Park opened for trading.":"Park closed.");save();render()};
document.getElementById("nextDayBtn").onclick=runDay;
document.getElementById("saveBtn").onclick=()=>save(true);
document.getElementById("resetBtn").onclick=resetGame;
document.querySelectorAll(".loanBtn").forEach(b=>b.onclick=()=>borrow(Number(b.dataset.loan)));
document.getElementById("repayBtn").onclick=repay;
document.getElementById("ticketPrice").oninput=e=>{state.ticketPrice=Number(e.target.value);save();render()};
document.getElementById("parkingPrice").oninput=e=>{state.parkingPrice=Number(e.target.value);save();render()};
document.getElementById("fastTrackPrice").oninput=e=>{state.fastTrackPrice=Number(e.target.value);save();render()};
document.getElementById("closeModalBtn").onclick=()=>document.getElementById("dayModal").classList.add("hidden");

render();
