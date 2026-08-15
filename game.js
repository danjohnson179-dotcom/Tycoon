const SAVE_KEY = "parkEmpireV2";
const money = n => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Math.round(n||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const rand=(a,b)=>Math.random()*(b-a)+a;

const levels=[
 {level:1,name:"Local Attraction",xp:0},
 {level:2,name:"Regional Park",xp:500},
 {level:3,name:"Destination Park",xp:1400},
 {level:4,name:"National Resort",xp:3000},
 {level:5,name:"Park Empire",xp:6000}
];

const attractionCatalog=[
 {id:"carousel",name:"Classic Carousel",type:"Family Ride",cost:180000,appeal:6,capacity:350,upkeep:900,staff:2,reliability:.98,unlock:1,desc:"Low-risk family attraction. Reliable and cheap to operate."},
 {id:"dodgems",name:"Dodgems",type:"Family Ride",cost:320000,appeal:9,capacity:500,upkeep:1600,staff:3,reliability:.96,unlock:1,desc:"Strong family appeal with dependable throughput."},
 {id:"drop",name:"Sky Drop",type:"Thrill Ride",cost:720000,appeal:14,capacity:620,upkeep:3400,staff:4,reliability:.94,unlock:1,desc:"A compact thrill ride that improves value perception."},
 {id:"flume",name:"River Rapids",type:"Water Ride",cost:1400000,appeal:18,capacity:900,upkeep:7000,staff:7,reliability:.92,unlock:2,desc:"A major family draw with strong summer performance."},
 {id:"woodie",name:"Timber Run",type:"Wooden Coaster",cost:2800000,appeal:28,capacity:1100,upkeep:14000,staff:10,reliability:.90,unlock:2,desc:"A regional headline attraction with real maintenance exposure."},
 {id:"launch",name:"Velocity",type:"Launch Coaster",cost:4200000,appeal:36,capacity:1250,upkeep:21000,staff:12,reliability:.89,unlock:3,desc:"High-impact thrill investment designed to drive destination visits."},
 {id:"invert",name:"Skybreaker",type:"Inverted Coaster",cost:5500000,appeal:42,capacity:1350,upkeep:26000,staff:14,reliability:.88,unlock:3,desc:"A flagship coaster capable of transforming attendance."},
 {id:"dark",name:"Mythic Manor",type:"Dark Ride",cost:7800000,appeal:52,capacity:1600,upkeep:33000,staff:16,reliability:.93,unlock:4,desc:"Weather-proof family headline ride with excellent capacity."},
 {id:"hyper",name:"Titan",type:"Hyper Coaster",cost:12500000,appeal:70,capacity:1900,upkeep:60000,staff:20,reliability:.85,unlock:4,desc:"A national-level headline attraction with enormous capital risk."},
 {id:"giga",name:"Apex 300",type:"Giga Coaster",cost:26000000,appeal:105,capacity:2300,upkeep:110000,staff:26,reliability:.83,unlock:5,desc:"The ultimate statement investment for a true park empire."}
];

const foodCatalog=[
 {id:"coffee",name:"Coffee Kiosk",cost:45000,spend:2.3,margin:.64,capacity:500,staff:2,unlock:1,desc:"Cheap entry point for secondary spend."},
 {id:"burger",name:"Burger Shack",cost:110000,spend:4.8,margin:.58,capacity:700,staff:4,unlock:1,desc:"Reliable high-volume food outlet."},
 {id:"souvenir",name:"Souvenir Shop",cost:90000,spend:3.5,margin:.68,capacity:600,staff:3,unlock:1,desc:"High-margin retail that scales with attendance."},
 {id:"icecream",name:"Ice Cream Parlour",cost:145000,spend:3.9,margin:.62,capacity:750,staff:4,unlock:2,desc:"Strong seasonal spend and family appeal."},
 {id:"restaurant",name:"Family Restaurant",cost:420000,spend:8.2,margin:.52,capacity:850,staff:10,unlock:2,desc:"Higher guest spend with a heavier staffing requirement."},
 {id:"premium",name:"Premium Dining",cost:950000,spend:13.5,margin:.48,capacity:700,staff:16,unlock:4,desc:"Premium spend for a mature destination park."}
];

const marketingCatalog=[
 {id:"local",name:"Local Campaign",cost:12000,days:7,boost:.08,desc:"+8% demand for 7 days"},
 {id:"social",name:"Social Media Push",cost:35000,days:10,boost:.14,desc:"+14% demand for 10 days"},
 {id:"tv",name:"Regional TV Campaign",cost:120000,days:14,boost:.24,desc:"+24% demand for 14 days"},
 {id:"launch",name:"Major Launch Campaign",cost:350000,days:21,boost:.40,desc:"+40% demand for 21 days"}
];

const achievements=[
 {id:"firstProfit",name:"In the Black",desc:"Finish a day with positive profit.",xp:75,icon:"Â£"},
 {id:"thousand",name:"Four Figures",desc:"Welcome 1,000 guests in one day.",xp:100,icon:"1K"},
 {id:"million",name:"Million Pound Day",desc:"Generate Â£1m revenue in one day.",xp:200,icon:"Â£1M"},
 {id:"coaster",name:"Coaster Capital",desc:"Own three roller coasters.",xp:200,icon:"RC"},
 {id:"rating4",name:"Crowd Favourite",desc:"Reach a 4.0 park rating.",xp:150,icon:"4.0"},
 {id:"value10",name:"Eight Figures",desc:"Reach Â£10m park value.",xp:250,icon:"10M"},
 {id:"debtFree",name:"Debt Free",desc:"Repay all debt after borrowing.",xp:125,icon:"0"},
 {id:"empire",name:"Empire Builder",desc:"Reach Level 5.",xp:500,icon:"V"}
];

function newState(){
 return {
  version:2,day:1,cash:2000000,debt:0,everBorrowed:false,parkOpen:false,rating:3.2,lastRating:3.2,reputation:50,satisfaction:72,
  ticketPrice:35,parkingPrice:8,fastTrackPrice:0,xp:0,level:1,
  attractions:[{id:"carousel",condition:100}],food:[{id:"coffee"}],
  staff:{operators:4,mechanics:2,cleaners:2,security:1,food:2,managers:1},
  marketing:[],achievements:[],claimedObjectives:[],
  lastDay:{guests:0,revenue:0,costs:0,profit:0,ticketRevenue:0,secondaryRevenue:0,demand:0,spend:0},
  history:[],latestEvent:"Your board has handed you control of a small local park.",latestImpact:"",bankrupt:false
 };
}

let state=load()||newState();
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));return s&&s.version===2?s:null}catch{return null}}
function save(silent=true){localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(!silent)notify("Game saved")}
function currentLevel(){return levels.slice().reverse().find(l=>state.xp>=l.xp)||levels[0]}
function nextLevel(){return levels.find(l=>l.xp>state.xp)||null}
function syncLevel(){
 const before=state.level;
 state.level=currentLevel().level;
 if(state.level>before){notify(`LEVEL UP: ${currentLevel().name} unlocked`);state.latestImpact=`Level ${state.level} reached. New investments may now be available.`}
}
function addXP(amount,reason){
 state.xp+=amount;syncLevel();
 if(reason) state.latestImpact=`+${amount} XP - ${reason}`;
}
function attractionById(id){return attractionCatalog.find(x=>x.id===id)}
function foodById(id){return foodCatalog.find(x=>x.id===id)}

function staffWages(){
 const rates={operators:135,mechanics:180,cleaners:110,security:140,food:120,managers:240};
 return Object.entries(state.staff).reduce((s,[k,v])=>s+rates[k]*v,0)
}
function appeal(){return state.attractions.reduce((s,a)=>s+attractionById(a.id).appeal*(a.condition/100),0)}
function capacity(){return Math.max(250,Math.floor(state.attractions.reduce((s,a)=>s+attractionById(a.id).capacity,0)*2.6))}
function marketingBoost(){return state.marketing.reduce((s,m)=>s+m.boost,0)}
function recommendedStaff(){
 const rideStaff=state.attractions.reduce((s,a)=>s+attractionById(a.id).staff,0);
 const foodStaff=state.food.reduce((s,f)=>s+foodById(f.id).staff,0);
 return {
  operators:Math.max(2,Math.ceil(rideStaff*.65)),mechanics:Math.max(1,Math.ceil(state.attractions.length/2)),
  cleaners:Math.max(1,Math.ceil(capacity()/1800)),security:Math.max(1,Math.ceil(capacity()/3000)),
  food:foodStaff,managers:Math.max(1,Math.ceil((state.attractions.length+state.food.length)/8))
 }
}
function staffingScore(){
 const rec=recommendedStaff(),ratios=[];
 Object.keys(rec).forEach(k=>ratios.push(clamp(state.staff[k]/rec[k],0,1.15)));
 return ratios.reduce((a,b)=>a+b,0)/ratios.length
}
function seasonName(day){
 const d=((day-1)%365)+1;
 if(d>=170&&d<=240)return"Summer";if(d>=90&&d<170)return"Spring";if(d>240&&d<=305)return"Autumn";return"Winter"
}
function seasonFactor(day){
 const d=((day-1)%365)+1;
 if(d>=170&&d<=240)return 1.28;if(d>=90&&d<170)return 1.08;if(d>240&&d<=305)return 1.02;if(d>=330||d<=55)return .62;return .82
}
function weekendFactor(day){return day%7===6||day%7===0?1.28:1}
function fairValue(){return 22+appeal()*.46+state.rating*3.5}
function priceFactor(){return clamp(1-(state.ticketPrice-fairValue())/80,.45,1.28)}
function demandEstimate(noise=true){
 const base=120+appeal()*58,rep=.65+state.reputation/100*.85,rating=.68+state.rating/5*.7;
 return Math.max(0,Math.round(base*rep*rating*priceFactor()*(1+marketingBoost())*seasonFactor(state.day)*weekendFactor(state.day)*(noise?rand(.86,1.14):1)))
}
function fixedCosts(){
 const upkeep=state.attractions.reduce((s,a)=>s+attractionById(a.id).upkeep,0);
 return upkeep+state.food.length*280+staffWages()+state.debt*(.082/365)+1200
}
function forecast(){
 const demand=demandEstimate(false),guests=Math.min(demand,capacity());
 const ticket=guests*state.ticketPrice,parking=guests*.42*state.parkingPrice;
 const fast=guests*(state.fastTrackPrice>0?clamp(.16-state.fastTrackPrice/400,.03,.16):0)*state.fastTrackPrice;
 let gross=0,profitPart=0;
 state.food.forEach(f=>{const item=foodById(f.id),served=Math.min(guests,item.capacity),g=served*item.spend;gross+=g;profitPart+=g*item.margin});
 const revenue=ticket+parking+fast+gross,costs=fixedCosts()+(gross-profitPart)+(state.parkOpen?guests*.9:0);
 return {demand,guests,revenue,costs,profit:revenue-costs}
}
function parkValue(){
 const assets=state.attractions.reduce((s,a)=>s+attractionById(a.id).cost*(.55+.45*a.condition/100),0)+state.food.reduce((s,f)=>s+foodById(f.id).cost*.7,0);
 return Math.max(0,state.cash+assets-state.debt)
}

function maybeEvent(){
 if(Math.random()>.24)return null;
 const r=Math.random();
 if(r<.2)return{text:"Heatwave: walk-up demand and food spend surged.",demand:1.12,spend:1.15};
 if(r<.4)return{text:"Heavy rain: walk-up demand fell sharply.",demand:.72,spend:.92};
 if(r<.58)return{text:"A viral guest video boosted your reputation.",demand:1.05,spend:1,reputation:4};
 if(r<.78&&state.attractions.length){
  const ride=state.attractions[Math.floor(Math.random()*state.attractions.length)];
  ride.condition=clamp(ride.condition-rand(8,18),35,100);
  return{text:`Technical issue on ${attractionById(ride.id).name}. Ride condition fell.`,demand:.94,spend:.98,rating:-.08}
 }
 return{text:"Excellent guest reviews lifted your rating.",demand:1.03,spend:1.02,rating:.08}
}

function runDay(){
 if(state.bankrupt)return notify("The company is bankrupt. Start a new game.");
 let demand=demandEstimate(true),event=maybeEvent();
 if(event){
  demand=Math.round(demand*(event.demand||1));
  state.latestEvent=event.text;
  if(event.reputation)state.reputation=clamp(state.reputation+event.reputation,0,100);
  if(event.rating)state.rating=clamp(state.rating+event.rating,1,5)
 } else state.latestEvent="A normal trading day. No major incidents.";

 const cap=capacity(),staffScore=staffingScore();
 let guests=state.parkOpen?Math.min(demand,Math.round(cap*rand(.92,1.04))):0;
 if(state.parkOpen&&staffScore<.82)guests=Math.round(guests*(.88+staffScore*.12));

 const ticketRevenue=guests*state.ticketPrice;
 const parkingTake=guests*.42*state.parkingPrice;
 const fastTrackTake=guests*(state.fastTrackPrice>0?clamp(.16-state.fastTrackPrice/400,.03,.16):0)*state.fastTrackPrice;
 let secondaryGross=0,secondaryProfit=0;
 state.food.forEach(f=>{
  const item=foodById(f.id),served=Math.min(guests,item.capacity),gross=served*item.spend*rand(.8,1.2);
  secondaryGross+=gross;secondaryProfit+=gross*item.margin
 });
 if(event)secondaryGross*=event.spend||1;
 const revenue=ticketRevenue+parkingTake+fastTrackTake+secondaryGross;
 let costs=fixedCosts()+(secondaryGross-secondaryProfit)+(state.parkOpen?guests*.9:0);

 state.lastRating=state.rating;
 let satisfaction=82,queuePressure=guests/Math.max(cap,1);
 satisfaction-=Math.max(0,queuePressure-.72)*48;
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
 state.marketing=state.marketing.map(m=>({...m,daysLeft:m.daysLeft-1})).filter(m=>m.daysLeft>0);

 if(state.parkOpen)addXP(Math.max(5,Math.round(guests/100)),"Trading day");
 state.day++;
 checkAchievements();
 checkObjectives();
 if(state.cash<-500000){state.bankrupt=true;state.latestEvent="BANKRUPTCY: cash fell beyond the emergency overdraft limit."}
 save();render();showDayModal()
}

function objectives(){
 return [
  {id:"profit25",title:"Profitable operation",desc:"Finish a day with at least Â£25k profit.",xp:100,done:state.history.some(x=>x.profit>=25000)},
  {id:"guests750",title:"Build demand",desc:"Welcome 750 guests in one day.",xp:100,done:state.history.some(x=>x.guests>=750)},
  {id:"rating35",title:"Improve experience",desc:"Reach a 3.5 park rating.",xp:125,done:state.rating>=3.5}
 ]
}
function checkObjectives(){
 objectives().forEach(o=>{
  if(o.done&&!state.claimedObjectives.includes(o.id)){
   state.claimedObjectives.push(o.id);addXP(o.xp,o.title);notify(`OBJECTIVE COMPLETE: ${o.title} (+${o.xp} XP)`)
  }
 })
}
function checkAchievements(){
 const coasterCount=state.attractions.filter(a=>["woodie","launch","invert","hyper","giga"].includes(a.id)).length;
 const tests={
  firstProfit:state.history.some(x=>x.profit>0),thousand:state.history.some(x=>x.guests>=1000),
  million:state.history.some(x=>x.revenue>=1000000),coaster:coasterCount>=3,rating4:state.rating>=4,
  value10:parkValue()>=10000000,debtFree:state.everBorrowed&&state.debt===0,empire:state.level>=5
 };
 achievements.forEach(a=>{
  if(tests[a.id]&&!state.achievements.includes(a.id)){
   state.achievements.push(a.id);addXP(a.xp,a.name);notify(`ACHIEVEMENT: ${a.name} (+${a.xp} XP)`)
  }
 })
}

function attractionImpact(a){
 const current=demandEstimate(false),newAppeal=appeal()+a.appeal;
 const fairNow=fairValue(),fairAfter=22+newAppeal*.46+state.rating*3.5;
 const priceNow=priceFactor(),priceAfter=clamp(1-(state.ticketPrice-fairAfter)/80,.45,1.28);
 const ratio=(120+newAppeal*58)/(120+appeal()*58)*(priceAfter/priceNow);
 const demandGain=Math.max(0,Math.round(current*(ratio-1)));
 return {demandGain,valueGain:Math.round(a.cost*.9),capacityGain:Math.round(a.capacity*2.6),fairGain:fairAfter-fairNow}
}
function buyAttraction(id){
 const a=attractionById(id);
 if(state.level<a.unlock)return notify(`Reach Level ${a.unlock} to unlock ${a.name}`);
 if(state.cash<a.cost)return notify("Not enough cash for this investment");
 const beforeDemand=demandEstimate(false),beforeValue=parkValue();
 state.cash-=a.cost;state.attractions.push({id,condition:100});state.reputation=clamp(state.reputation+2,0,100);
 addXP(Math.max(20,Math.round(a.cost/100000)),"Capital investment");checkAchievements();checkObjectives();
 const afterDemand=demandEstimate(false),afterValue=parkValue();
 state.latestEvent=`Built ${a.name} for ${money(a.cost)}.`;
 state.latestImpact=`Forecast demand ${signed(afterDemand-beforeDemand)} guests | Park value ${signedMoney(afterValue-beforeValue)} | Capacity +${Math.round(a.capacity*2.6).toLocaleString()}`;
 notify(`${a.name} built. Forecast demand ${signed(afterDemand-beforeDemand)} guests`);
 save();render()
}
function buyFood(id){
 const f=foodById(id);
 if(state.level<f.unlock)return notify(`Reach Level ${f.unlock} to unlock ${f.name}`);
 if(state.cash<f.cost)return notify("Not enough cash for this outlet");
 state.cash-=f.cost;state.food.push({id});addXP(Math.max(10,Math.round(f.cost/50000)),"New outlet");
 state.latestEvent=`Opened ${f.name} for ${money(f.cost)}.`;
 state.latestImpact=`Potential spend +${money(f.spend)} per served guest | Capacity +${f.capacity} customers/day | Gross margin ${Math.round(f.margin*100)}%`;
 notify(`${f.name} opened. Secondary spend capacity increased.`);
 save();render()
}
function repairRide(idx){
 const ride=state.attractions[idx],item=attractionById(ride.id),repair=Math.round((100-ride.condition)/100*item.cost*.06);
 if(repair<1)return notify("This attraction is already in excellent condition");
 if(state.cash<repair)return notify("Not enough cash for repairs");
 state.cash-=repair;ride.condition=100;state.latestEvent=`Maintenance completed on ${item.name}.`;state.latestImpact=`Condition restored to 100% for ${money(repair)}.`;notify(`${item.name} restored to 100%`);
 save();render()
}
function runMarketing(id){
 const m=marketingCatalog.find(x=>x.id===id);if(state.cash<m.cost)return notify("Not enough cash");
 const before=demandEstimate(false);state.cash-=m.cost;state.marketing.push({...m,daysLeft:m.days});addXP(15,"Marketing campaign");
 const after=demandEstimate(false);state.latestEvent=`Launched ${m.name}.`;state.latestImpact=`Forecast demand ${signed(after-before)} guests for the campaign period.`;
 notify(`${m.name} launched. Forecast demand ${signed(after-before)} guests`);save();render()
}
function borrow(amount){state.debt+=amount;state.cash+=amount;state.everBorrowed=true;state.latestEvent=`Borrowed ${money(amount)}.`;state.latestImpact=`Cash +${money(amount)} | Daily interest +${money(amount*(.082/365))}`;notify(`${money(amount)} added to cash`);save();render()}
function repay(){
 const amt=Math.min(100000,state.debt,state.cash);if(amt<=0)return notify("Nothing available to repay");
 state.debt-=amt;state.cash-=amt;state.latestEvent=`Repaid ${money(amt)} of debt.`;state.latestImpact=`Debt reduced to ${money(state.debt)}.`;checkAchievements();notify(`${money(amt)} debt repaid`);save();render()
}
function changeStaff(k,d){
 const before=staffingScore();state.staff[k]=Math.max(0,state.staff[k]+d);const after=staffingScore();
 state.latestImpact=`Workforce coverage ${Math.round(before*100)}% -> ${Math.round(after*100)}% | Daily payroll ${money(staffWages())}`;
 save();render()
}
function resetGame(){if(confirm("Erase your current company and start again?")){state=newState();save();render();notify("New company created")}}
function signed(n){return`${n>=0?"+":""}${Math.round(n).toLocaleString()}`}
function signedMoney(n){return`${n>=0?"+":""}${money(n)}`}

let toastTimer;
function notify(msg){
 const el=document.getElementById("toast");if(!el)return;
 el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600)
}
function pricePositionText(){
 const fair=fairValue(),delta=state.ticketPrice-fair;
 if(delta>15)return`Admission is well above perceived park value. You are sacrificing a lot of volume for yield.`;
 if(delta>5)return`Admission is premium to perceived value. This can work if satisfaction and attraction quality stay strong.`;
 if(delta<-8)return`Admission is cheap for the current park. Demand benefits, but you may be leaving revenue on the table.`;
 return`Admission is close to perceived fair value. This is a balanced commercial position.`
}
function renderLevel(){
 const cur=currentLevel(),next=nextLevel();state.level=cur.level;
 document.getElementById("levelNumber").textContent=cur.level;document.getElementById("levelName").textContent=cur.name;
 if(next){
  const pct=(state.xp-cur.xp)/(next.xp-cur.xp)*100;document.getElementById("xpBar").style.width=clamp(pct,0,100)+"%";
  document.getElementById("xpText").textContent=`${state.xp.toLocaleString()} / ${next.xp.toLocaleString()} XP`
 }else{document.getElementById("xpBar").style.width="100%";document.getElementById("xpText").textContent=`${state.xp.toLocaleString()} XP - MAX LEVEL`}
}
function renderObjectives(){
 const list=objectives(),done=list.filter(o=>state.claimedObjectives.includes(o.id)).length;
 document.getElementById("objectiveCount").textContent=`${done}/${list.length}`;
 document.getElementById("objectivesList").innerHTML=list.map(o=>{
  const complete=state.claimedObjectives.includes(o.id);
  return`<div class="objective-item ${complete?"done":""}"><div class="objective-check">${complete?"OK":"-"}</div><div class="objective-copy"><strong>${o.title}</strong><small>${o.desc}</small></div><div class="objective-xp">+${o.xp} XP</div></div>`
 }).join("")
}
function renderAchievements(){
 document.getElementById("achievementCount").textContent=`${state.achievements.length} unlocked`;
 document.getElementById("achievementsList").innerHTML=achievements.map(a=>`<div class="achievement ${state.achievements.includes(a.id)?"unlocked":""}"><div class="achievement-icon">${a.icon}</div><strong>${a.name}</strong><small>${a.desc}</small></div>`).join("")
}
function render(){
 renderLevel();renderObjectives();renderAchievements();
 const f=forecast(),value=parkValue(),margin=state.lastDay.revenue?state.lastDay.profit/state.lastDay.revenue*100:0;
 document.getElementById("cashKpi").textContent=money(state.cash);document.getElementById("cashDelta").textContent=state.lastDay.profit?`${signedMoney(state.lastDay.profit)} last day`:"No trading yet";
 document.getElementById("valueKpi").textContent=money(value);document.getElementById("valueDelta").textContent=`Level ${state.level} company`;
 const pk=document.getElementById("profitKpi");pk.textContent=money(state.lastDay.profit);pk.className=state.lastDay.profit>=0?"positive":"negative";
 document.getElementById("marginKpi").textContent=`${margin.toFixed(1)}% margin`;
 document.getElementById("guestsKpi").textContent=state.lastDay.guests.toLocaleString();document.getElementById("demandCapture").textContent=`${state.lastDay.demand?Math.round(state.lastDay.guests/state.lastDay.demand*100):0}% of demand`;
 document.getElementById("ratingKpi").textContent=`${state.rating.toFixed(1)} / 5`;
 const rt=state.rating-state.lastRating;document.getElementById("ratingTrend").textContent=Math.abs(rt)<.01?"Stable":rt>0?`Up ${rt.toFixed(2)}`:`Down ${Math.abs(rt).toFixed(2)}`;
 document.getElementById("dateKpi").textContent=`Day ${state.day}`;document.getElementById("seasonKpi").textContent=seasonName(state.day);

 const st=document.getElementById("openStatus");st.textContent=state.parkOpen?"OPEN":"CLOSED";st.className="status "+(state.parkOpen?"open":"closed");
 document.getElementById("toggleParkBtn").textContent=state.parkOpen?"Close Park":"Open Park";
 document.getElementById("nextDayBtn").textContent=state.parkOpen?"Trade Day":"Advance Closed Day";
 document.getElementById("forecastDemand").textContent=f.demand.toLocaleString();
 document.getElementById("forecastProfit").textContent=money(state.parkOpen?f.profit:-fixedCosts());
 document.getElementById("forecastProfit").className=(state.parkOpen?f.profit:-fixedCosts())>=0?"positive":"negative";
 document.getElementById("forecastReason").textContent=`${seasonName(state.day)} | ${weekendFactor(state.day)>1?"Weekend":"Weekday"} | ${Math.round(priceFactor()*100)}% price factor`;
 document.getElementById("capacityStat").textContent=capacity().toLocaleString();
 document.getElementById("satisfactionStat").textContent=Math.round(state.satisfaction)+"%";document.getElementById("spendStat").textContent=money(state.lastDay.spend);

 document.getElementById("ticketRevenue").textContent=money(state.lastDay.ticketRevenue);document.getElementById("secondaryRevenue").textContent=money(state.lastDay.secondaryRevenue);
 document.getElementById("operatingCosts").textContent=money(state.lastDay.costs);document.getElementById("debtStat").textContent=money(state.debt);
 document.getElementById("eventBox").textContent=state.latestEvent;
 const impact=document.getElementById("impactBox");impact.textContent=state.latestImpact||"";impact.classList.toggle("hidden",!state.latestImpact);

 const alert=document.getElementById("alertBanner");
 let alertText="";
 if(state.bankrupt)alertText="BANKRUPTCY - Your company has exceeded its emergency overdraft.";
 else if(state.cash<250000)alertText="Cash warning: reserves are below Â£250k.";
 else if(staffingScore()<.8)alertText="Operations warning: workforce coverage is critically low.";
 else if(state.attractions.some(a=>a.condition<60))alertText="Maintenance warning: an attraction is in poor condition.";
 alert.textContent=alertText;alert.classList.toggle("hidden",!alertText);

 document.getElementById("rideCount").textContent=`${state.attractions.length} attractions`;
 document.getElementById("attractionShop").innerHTML=attractionCatalog.map(a=>{
  const locked=state.level<a.unlock,imp=attractionImpact(a);
  return`<div class="shop-card ${locked?"locked":""}">${locked?`<div class="lock-ribbon">LEVEL ${a.unlock}</div>`:""}<h3>${a.name}</h3><small>${a.type}</small><p>${a.desc}</p>
  <div class="meta"><div><span>Investment</span><strong>${money(a.cost)}</strong></div><div><span>Appeal</span><strong>+${a.appeal}</strong></div><div><span>Capacity</span><strong>+${imp.capacityGain.toLocaleString()}</strong></div><div><span>Daily upkeep</span><strong>${money(a.upkeep)}</strong></div></div>
  <div class="impact-preview"><span>Predicted business impact</span><small>Demand ~+${imp.demandGain.toLocaleString()} | Fair ticket value +${money(imp.fairGain)}</small></div>
  <button class="${locked?"ghost":"primary"} full" onclick="buyAttraction('${a.id}')">${locked?`Unlock at Level ${a.unlock}`:"Build attraction"}</button></div>`
 }).join("");
 document.getElementById("ownedAttractions").innerHTML=state.attractions.map((a,i)=>{
  const x=attractionById(a.id),repair=Math.round((100-a.condition)/100*x.cost*.06);
  return`<div class="owned-item"><div><strong>${x.name}</strong><br><small>${x.type} | ${money(x.upkeep)}/day</small></div><div class="condition"><small>${Math.round(a.condition)}% condition</small><div class="condition-bar"><i style="width:${a.condition}%"></i></div>${a.condition<99?`<button class="ghost" onclick="repairRide(${i})">Repair ${money(repair)}</button>`:""}</div></div>`
 }).join("");

 document.getElementById("outletCount").textContent=`${state.food.length} outlets`;
 document.getElementById("foodShop").innerHTML=foodCatalog.map(fod=>{
  const locked=state.level<fod.unlock;
  return`<div class="shop-card ${locked?"locked":""}">${locked?`<div class="lock-ribbon">LEVEL ${fod.unlock}</div>`:""}<h3>${fod.name}</h3><p>${fod.desc}</p>
  <div class="meta"><div><span>Investment</span><strong>${money(fod.cost)}</strong></div><div><span>Spend</span><strong>+${money(fod.spend)}/guest</strong></div><div><span>Gross margin</span><strong>${Math.round(fod.margin*100)}%</strong></div><div><span>Capacity</span><strong>${fod.capacity}/day</strong></div></div>
  <div class="impact-preview"><span>Predicted business impact</span><small>More secondary revenue when attendance can support it.</small></div>
  <button class="${locked?"ghost":"primary"} full" onclick="buyFood('${fod.id}')">${locked?`Unlock at Level ${fod.unlock}`:"Open outlet"}</button></div>`
 }).join("");
 document.getElementById("ownedFood").innerHTML=state.food.map(fod=>{const x=foodById(fod.id);return`<div class="owned-item"><div><strong>${x.name}</strong><br><small>${Math.round(x.margin*100)}% gross margin | ${x.capacity} guest capacity</small></div><strong>${money(x.spend)}/guest</strong></div>`}).join("");

 const rec=recommendedStaff(),score=staffingScore();
 document.getElementById("staffControls").innerHTML=Object.keys(state.staff).map(k=>`<div class="staff-row"><span>${k}</span><button onclick="changeStaff('${k}',-1)">-</button><strong>${state.staff[k]}</strong><button onclick="changeStaff('${k}',1)">+</button></div>`).join("");
 document.getElementById("staffScoreBox").innerHTML=`<strong class="${score>=.95?"positive":score>=.8?"warning":"negative"}">${Math.round(score*100)}%</strong><span>overall workforce coverage</span>`;
 document.getElementById("staffAdvice").innerHTML=Object.keys(rec).map(k=>`<div><span>${k}</span><strong>${state.staff[k]} / ${rec[k]} recommended</strong></div>`).join("");

 const tp=document.getElementById("ticketPrice");tp.value=state.ticketPrice;document.getElementById("ticketPriceLabel").textContent=money(state.ticketPrice);
 const pp=document.getElementById("parkingPrice");pp.value=state.parkingPrice;document.getElementById("parkingLabel").textContent=money(state.parkingPrice);
 const fp=document.getElementById("fastTrackPrice");fp.value=state.fastTrackPrice;document.getElementById("fastTrackLabel").textContent=money(state.fastTrackPrice);
 document.getElementById("pricePosition").textContent=pricePositionText();document.getElementById("fairValueStat").textContent=money(fairValue());document.getElementById("priceDemandStat").textContent=`${Math.round(priceFactor()*100)}%`;

 document.getElementById("marketingOptions").innerHTML=marketingCatalog.map(m=>`<div class="shop-card"><h3>${m.name}</h3><p>${m.desc}</p><div class="meta"><div><span>Cost</span><strong>${money(m.cost)}</strong></div><div><span>Demand</span><strong>+${Math.round(m.boost*100)}%</strong></div></div><button class="primary full" onclick="runMarketing('${m.id}')">Launch</button></div>`).join("");
 document.getElementById("activeMarketing").innerHTML=state.marketing.length?state.marketing.map(m=>`<div class="owned-item"><div><strong>${m.name}</strong><br><small>+${Math.round(m.boost*100)}% demand | ${m.daysLeft} days remaining</small></div></div>`).join(""):"<p class='muted'>No active campaigns.</p>";

 document.getElementById("financeStats").innerHTML=`<div><span>Cash</span><strong>${money(state.cash)}</strong></div><div><span>Outstanding debt</span><strong>${money(state.debt)}</strong></div><div><span>Daily interest</span><strong>${money(state.debt*(.082/365))}</strong></div><div><span>Park value</span><strong>${money(value)}</strong></div><div><span>Daily payroll</span><strong>${money(staffWages())}</strong></div>`;

 const hist=state.history,totalProfit=hist.reduce((s,x)=>s+x.profit,0),avgGuests=hist.length?hist.reduce((s,x)=>s+x.guests,0)/hist.length:0,best=hist.length?Math.max(...hist.map(x=>x.profit)):0;
 document.getElementById("reportSummary").innerHTML=`<div><span>Cumulative profit</span><strong class="${totalProfit>=0?"positive":"negative"}">${money(totalProfit)}</strong></div><div><span>Average guests</span><strong>${Math.round(avgGuests).toLocaleString()}</strong></div><div><span>Best day</span><strong>${money(best)}</strong></div>`;
 document.getElementById("reportTable").innerHTML=hist.map(r=>`<tr><td>Day ${r.day}</td><td>${r.guests.toLocaleString()}</td><td>${money(r.revenue)}</td><td>${money(r.costs)}</td><td class="${r.profit>=0?"positive":"negative"}">${money(r.profit)}</td><td>${r.rating.toFixed(1)} / 5</td></tr>`).join("");
 document.getElementById("toggleParkBtn").disabled=state.bankrupt
}
function showDayModal(){
 const d=state.lastDay,modal=document.getElementById("dayModal");
 document.getElementById("modalTitle").textContent=d.profit>=0?"Profitable Day":"Loss-Making Day";
 document.getElementById("modalHero").innerHTML=`<strong class="${d.profit>=0?"positive":"negative"}">${money(d.profit)}</strong><span>net operating result</span>`;
 document.getElementById("modalStats").innerHTML=`<div><span>Guests</span><strong>${d.guests.toLocaleString()}</strong></div><div><span>Revenue</span><strong>${money(d.revenue)}</strong></div><div><span>Costs</span><strong>${money(d.costs)}</strong></div><div><span>Rating</span><strong>${state.rating.toFixed(1)} / 5</strong></div>`;
 document.getElementById("modalEvent").textContent=state.latestEvent;modal.classList.remove("hidden")
}

window.buyAttraction=buyAttraction;window.buyFood=buyFood;window.repairRide=repairRide;window.runMarketing=runMarketing;window.changeStaff=changeStaff;

document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{
 document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.getElementById(b.dataset.tab).classList.add("active");
 window.scrollTo({top:0,behavior:"smooth"})
}));
document.getElementById("objectivesJump").onclick=()=>document.getElementById("objectivesCard").scrollIntoView({behavior:"smooth"});
document.getElementById("toggleParkBtn").onclick=()=>{state.parkOpen=!state.parkOpen;state.latestImpact=state.parkOpen?"Park is ready to trade. Forecast uses your current setup.":"Park closed. Fixed operating costs will still be charged.";save();render()};
document.getElementById("nextDayBtn").onclick=runDay;document.getElementById("saveBtn").onclick=()=>save(false);document.getElementById("resetBtn").onclick=resetGame;
document.querySelectorAll(".loanBtn").forEach(b=>b.onclick=()=>borrow(Number(b.dataset.loan)));document.getElementById("repayBtn").onclick=repay;
document.getElementById("ticketPrice").oninput=e=>{state.ticketPrice=Number(e.target.value);state.latestImpact=`Ticket price changed. Forecast demand is now ${demandEstimate(false).toLocaleString()} guests.`;save();render()};
document.getElementById("parkingPrice").oninput=e=>{state.parkingPrice=Number(e.target.value);save();render()};
document.getElementById("fastTrackPrice").oninput=e=>{state.fastTrackPrice=Number(e.target.value);save();render()};
document.getElementById("closeModalBtn").onclick=()=>document.getElementById("dayModal").classList.add("hidden");
render();
