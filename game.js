const SAVE_KEY="parkEmpireV76";
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Math.round(n||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const rand=(a,b)=>Math.random()*(b-a)+a;

const rides=[
{id:"carousel",name:"Classic Carousel",type:"Family Ride",cost:180000,appeal:6,capacity:350,upkeep:650,staff:2,buildDays:2,reliability:.985,desc:"Cheap, reliable family attraction."},
{id:"dodgems",name:"Dodgems",type:"Family Ride",cost:320000,appeal:9,capacity:500,upkeep:1050,staff:3,buildDays:3,reliability:.975,desc:"Dependable throughput and broad family appeal."},
{id:"drop",name:"Sky Drop",type:"Thrill Ride",cost:720000,appeal:14,capacity:620,upkeep:2600,staff:4,buildDays:5,reliability:.955,desc:"Compact thrill ride with a strong demand boost."},
{id:"rapids",name:"River Rapids",type:"Water Ride",cost:1400000,appeal:18,capacity:900,upkeep:5600,staff:7,buildDays:8,reliability:.945,desc:"High-capacity family ride with strong seasonal appeal."},
{id:"woodie",name:"Timber Run",type:"Wooden Coaster",cost:2800000,appeal:28,capacity:1100,upkeep:13000,staff:10,buildDays:14,reliability:.925,desc:"Regional headline coaster with meaningful upkeep."},
{id:"launch",name:"Velocity",type:"Launch Coaster",cost:4200000,appeal:36,capacity:1250,upkeep:21000,staff:12,buildDays:20,reliability:.91,desc:"Headline thrill coaster with destination appeal."},
{id:"invert",name:"Skybreaker",type:"Inverted Coaster",cost:5500000,appeal:42,capacity:1350,upkeep:27500,staff:14,buildDays:24,reliability:.90,desc:"Flagship coaster capable of transforming attendance."},
{id:"dark",name:"Mythic Manor",type:"Dark Ride",cost:7800000,appeal:52,capacity:1600,upkeep:26000,staff:16,buildDays:30,reliability:.94,desc:"Weather-proof headline family attraction."},
{id:"hyper",name:"Titan",type:"Hyper Coaster",cost:12500000,appeal:70,capacity:1900,upkeep:62000,staff:20,buildDays:45,reliability:.875,desc:"National-scale headline coaster with major financial risk."},
{id:"giga",name:"Apex 300",type:"Giga Coaster",cost:26000000,appeal:105,capacity:2300,upkeep:118000,staff:26,buildDays:70,reliability:.84,desc:"Ultimate prestige investment for a giant resort."}
];

const outlets=[
{id:"coffee",name:"Coffee Kiosk",type:"Food & Drink",cost:45000,spend:2.1,margin:.58,capacity:420,staff:2,buildDays:1,desc:"Low-cost secondary spend asset."},
{id:"burger",name:"Burger Shack",type:"Food & Drink",cost:110000,spend:4.2,margin:.50,capacity:600,staff:4,buildDays:2,desc:"Reliable high-volume food asset."},
{id:"souvenir",name:"Souvenir Shop",type:"Retail",cost:90000,spend:3.1,margin:.60,capacity:520,staff:3,buildDays:2,desc:"High-margin retail asset linked to attendance."},
{id:"icecream",name:"Ice Cream Parlour",type:"Food & Drink",cost:145000,spend:3.5,margin:.54,capacity:650,staff:4,buildDays:2,desc:"Strong seasonal secondary spend."},
{id:"restaurant",name:"Family Restaurant",type:"Restaurant",cost:420000,spend:7.2,margin:.43,capacity:720,staff:10,buildDays:5,desc:"Higher spend with heavier staffing needs."},
{id:"premium",name:"Premium Dining",type:"Restaurant",cost:950000,spend:11.5,margin:.40,capacity:580,staff:16,buildDays:8,desc:"Premium spend for a mature park."}
];

const campaigns=[
{id:"local",name:"Local Advertising",cost:18000,days:7,boost:.06},
{id:"social",name:"Social Campaign",cost:50000,days:10,boost:.10},
{id:"regional",name:"Regional Campaign",cost:160000,days:14,boost:.16},
{id:"major",name:"Major Launch Campaign",cost:480000,days:21,boost:.24}
];

const weatherTypes=[
{name:"Cold & Dry",demand:.92,spend:.96,weight:25},
{name:"Overcast",demand:.96,spend:.98,weight:25},
{name:"Sunny",demand:1.10,spend:1.06,weight:22},
{name:"Warm & Sunny",demand:1.18,spend:1.10,weight:14},
{name:"Light Rain",demand:.82,spend:.92,weight:10},
{name:"Heavy Rain",demand:.62,spend:.86,weight:4}
];

function pickWeather(){
  const total=weatherTypes.reduce((s,w)=>s+w.weight,0);
  let r=Math.random()*total;
  for(const w of weatherTypes){r-=w.weight;if(r<=0)return {...w};}
  return {...weatherTypes[0]};
}

function blankLive(){
  return{
    running:false,tick:0,totalTicks:72,guestsToday:0,guestsInPark:0,revenue:0,costs:0,
    debtService:0,lastArrival:0,lastRevenueRate:0,feed:[],rideStats:{},outletStats:{},
    weather:pickWeather(),compensation:0,incidents:[]
  };
}

function newState(){
  return{
    version:76,day:1,cash:1500000,debt:0,negativeDays:0,parkOpen:false,
    rating:3.2,reputation:50,satisfaction:72,
    ticketPrice:32,parkingPrice:7,fastTrackPrice:0,
    rides:[{uid:1,id:"carousel",condition:100,daysLeft:0,down:false,ageDays:120}],
    outlets:[{uid:1,id:"coffee",daysLeft:0,ageDays:90}],
    nextRideUid:2,nextOutletUid:2,
    staff:{operators:2,mechanics:1,cleaners:1,security:1,food:1,managers:1},
    marketing:[],
    activity:[
      {title:"Company founded",detail:"Started with Â£1,500,000 cash and a small local park."},
      {title:"Classic Carousel operational",detail:"Your first attraction is trading."},
      {title:"Coffee Kiosk operational",detail:"Your first food asset is trading."}
    ],
    live:blankLive(),
    lastDay:{guests:0,revenue:0,costs:0,debtService:0,profit:0,demand:0,rideStats:{},outletStats:{}},
    history:[],bankrupt:false,speed:1,pendingLoanOffer:null
  };
}

let state=load()||newState();
let timer=null;

function load(){
  try{
    const s=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!s||s.version!==76)return null;
    s.live=blankLive();s.parkOpen=false;if(typeof s.pendingLoanOffer==="undefined")s.pendingLoanOffer=null;
    return s;
  }catch{return null;}
}

function save(show=false){
  localStorage.setItem(SAVE_KEY,JSON.stringify(state));
  if(show)toast("Game saved");
}

function rideById(id){return rides.find(x=>x.id===id);}
function outletById(id){return outlets.find(x=>x.id===id);}
function operationalRides(){return state.rides.filter(r=>r.daysLeft<=0&&!r.down);}
function operationalOutlets(){return state.outlets.filter(o=>o.daysLeft<=0);}

function addActivity(title,detail){
  state.activity.unshift({title,detail});
  state.activity=state.activity.slice(0,8);
}
function addFeed(title,detail){
  state.live.feed.unshift({time:clockText(),title,detail});
  state.live.feed=state.live.feed.slice(0,14);
}

function duplicatePenalty(id){
  const count=state.rides.filter(r=>r.id===id&&r.daysLeft<=0).length;
  return 1/(1+count*.35);
}
function appeal(){
  return operationalRides().reduce((s,r)=>s+rideById(r.id).appeal*(r.condition/100)*duplicatePenalty(r.id),0);
}
function capacity(){
  return Math.max(250,Math.round(operationalRides().reduce((s,r)=>s+rideById(r.id).capacity,0)*2.15));
}
function outletSpendPotential(){
  return operationalOutlets().reduce((s,o)=>s+outletById(o.id).spend,0);
}
function marketingBoost(){return state.marketing.reduce((s,m)=>s+m.boost,0);}
function seasonName(day){
  const d=((day-1)%365)+1;
  if(d>=170&&d<=240)return"Summer";
  if(d>=90&&d<170)return"Spring";
  if(d>240&&d<=305)return"Autumn";
  return"Winter";
}
function seasonFactor(day){
  const d=((day-1)%365)+1;
  if(d>=170&&d<=240)return 1.20;
  if(d>=90&&d<170)return 1.04;
  if(d>240&&d<=305)return .97;
  if(d>=330||d<=55)return .58;
  return .78;
}
function weekend(day){return day%7===6||day%7===0;}
function weekendFactor(day){return weekend(day)?1.22:1;}
function fairTicket(){return 18+appeal()*.34+state.rating*3.1;}
function priceFactor(){return clamp(1-(state.ticketPrice-fairTicket())/62,.38,1.18);}
function admissionYield(){return clamp(.68 + state.rating*.015 - Math.max(0,state.ticketPrice-45)*.002,.60,.78);}
function demandEstimate(weather=state.live.weather){
  const base=155+appeal()*46;
  const rep=.72+state.reputation/100*.62;
  const rating=.72+state.rating/5*.50;
  return Math.max(0,Math.round(base*rep*rating*priceFactor()*(1+marketingBoost())*seasonFactor(state.day)*weekendFactor(state.day)*(weather?.demand||1)));
}

function recommendedStaff(){
  const rideStaff=operationalRides().reduce((s,r)=>s+rideById(r.id).staff,0);
  const foodStaff=operationalOutlets().reduce((s,o)=>s+outletById(o.id).staff,0);
  return{
    operators:Math.max(2,Math.ceil(rideStaff*.8)),
    mechanics:Math.max(1,Math.ceil(operationalRides().length/2)),
    cleaners:Math.max(1,Math.ceil(capacity()/1400)),
    security:Math.max(1,Math.ceil(capacity()/2200)),
    food:foodStaff,
    managers:Math.max(1,Math.ceil((operationalRides().length+operationalOutlets().length)/7))
  };
}
function staffingScore(){
  const rec=recommendedStaff(),vals=[];
  Object.keys(rec).forEach(k=>vals.push(clamp(state.staff[k]/rec[k],0,1.1)));
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function payroll(){
  const rates={operators:125,mechanics:180,cleaners:100,security:125,food:105,managers:210};
  return Object.entries(state.staff).reduce((s,[k,v])=>s+rates[k]*v,0);
}

function debtRate(){
  const pv=Math.max(1,parkValueGross());
  const leverage=state.debt/pv;
  if(leverage<.2)return .075;
  if(leverage<.4)return .09;
  if(leverage<.6)return .115;
  return .145;
}
function debtPrincipalDaily(){
  return state.debt>0?Math.max(0,state.debt/(365*5)):0;
}
function debtInterestDaily(){return state.debt*debtRate()/365;}
function debtServiceDaily(){return debtPrincipalDaily()+debtInterestDaily();}

function overhead(){
  const rideInvestment=operationalRides().reduce((s,r)=>s+rideById(r.id).cost,0);
  const outletInvestment=operationalOutlets().reduce((s,o)=>s+outletById(o.id).cost,0);

  // Small parks have genuinely small corporate overhead.
  // Insurance and administration scale progressively as the estate grows.
  const insurance=650 + rideInvestment*.000018 + outletInvestment*.000010;
  const utilities=500 + operationalRides().length*150 + operationalOutlets().length*75;
  const admin=450
    + Math.max(0,operationalRides().length-3)*240
    + Math.max(0,operationalOutlets().length-3)*120
    + Math.max(0,parkValueGross()-3000000)*.00010;

  return insurance+utilities+admin;
}
function fixedCosts(){
  const upkeep=operationalRides().reduce((s,r)=>s+rideById(r.id).upkeep,0);
  const outletFixed=operationalOutlets().length*180;
  return upkeep+outletFixed+payroll()+overhead();
}

function parkValueGross(){
  const rideValue=state.rides.reduce((s,r)=>s+rideById(r.id).cost*(r.daysLeft>0?.75:(.5+.45*r.condition/100)),0);
  const outletValue=state.outlets.reduce((s,o)=>s+outletById(o.id).cost*(o.daysLeft>0?.75:.65),0);
  return Math.max(0,state.cash+rideValue+outletValue);
}
function parkValue(){return Math.max(0,parkValueGross()-state.debt);}
function avgRecentProfit(){
  if(!state.history.length)return 0;
  const sample=state.history.slice(0,7);
  return sample.reduce((s,x)=>s+x.profit,0)/sample.length;
}
function borrowingLimit(){
  const assetLimit=parkValueGross()*.38;
  const earningsLimit=Math.max(0,avgRecentProfit()*120);
  const startupFloor=state.history.length<3?650000:0;
  return Math.max(startupFloor,Math.min(assetLimit+earningsLimit,parkValueGross()*.6));
}
function borrowingHeadroom(){return Math.max(0,borrowingLimit()-state.debt);}
function canBorrow(amount){
  if(state.bankrupt)return false;
  if(state.negativeDays>=3)return false;
  if(amount>borrowingHeadroom())return false;
  if(state.debtServiceDaily()>Math.max(3000,Math.max(0,avgRecentProfit())*.65) && state.history.length>=3)return false;
  return true;
}

function forecast(){
  const demand=demandEstimate();
  const guests=Math.min(demand,capacity());
  const yieldRate=admissionYield();
  const ticket=guests*state.ticketPrice*yieldRate;
  const parking=guests*.34*state.parkingPrice;
  const fast=guests*(state.fastTrackPrice>0?clamp(.10-state.fastTrackPrice/600,.015,.10):0)*state.fastTrackPrice;
  let gross=0,profitPart=0;
  operationalOutlets().forEach(o=>{
    const x=outletById(o.id),served=Math.min(guests*.28,x.capacity),g=served*x.spend;
    gross+=g;profitPart+=g*x.margin;
  });
  const variable=guests*1.55;
  const revenue=ticket+parking+fast+gross;
  const debtSvc=debtServiceDaily();
  const costs=fixedCosts()+(gross-profitPart)+variable+debtSvc;
  return{demand,guests,revenue,costs,profit:revenue-costs,debtSvc};
}

function clockText(){
  const p=state.live.tick/state.live.totalTicks,total=540+Math.round(p*540),h=Math.floor(total/60),m=total%60;
  return`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function arrivalCurve(p){
  if(p<.15)return .72+p*2.8;
  if(p<.45)return 1.18;
  if(p<.72)return .94;
  return Math.max(.26,.62-(p-.72)*1.25);
}

function startDay(){
  if(state.live.running||state.bankrupt)return;
  state.parkOpen=true;
  state.live=blankLive();
  state.live.running=true;
  state.rides.forEach(r=>state.live.rideStats[r.uid]={riders:0,downtime:0});
  state.outlets.forEach(o=>state.live.outletStats[o.uid]={customers:0,revenue:0});
  addFeed("Gates opened","The first guests are entering the park.");
  addActivity(`Day ${state.day} opened`,"Live trading began at 09:00.");
  timer=setInterval(liveTick,8333.333333/state.speed);
  render();
}

function maybeBreakdown(){
  if(Math.random()>.035)return;
  const candidates=operationalRides().filter(r=>!r.down);
  if(!candidates.length)return;
  const owned=candidates[Math.floor(Math.random()*candidates.length)];
  const ride=rideById(owned.id);
  const conditionRisk=(100-owned.condition)/100*.12;
  const reliabilityRisk=(1-ride.reliability);
  if(Math.random()>(conditionRisk+reliabilityRisk+.015))return;

  owned.down=true;
  const repair=Math.round(ride.cost*rand(.0025,.009));
  const compensation=Math.round(state.live.guestsInPark*rand(.2,.7)*6);
  state.live.compensation+=compensation;
  state.cash-=repair;
  state.live.costs+=repair+compensation;
  owned.condition=clamp(owned.condition-rand(4,11),25,100);
  state.live.incidents.push(`${ride.name} breakdown`);
  addFeed(`${ride.name} BROKE DOWN`,`${money(repair)} emergency repair + ${money(compensation)} guest compensation.`);
}

function liveTick(){
  const L=state.live;if(!L.running)return;
  const p=L.tick/L.totalTicks,target=Math.min(demandEstimate(L.weather),capacity());
  let arrival=Math.max(0,Math.round(target/L.totalTicks*Math.max(.18,arrivalCurve(p))*rand(.78,1.18)));
  if(L.guestsToday+arrival>target)arrival=Math.max(0,target-L.guestsToday);
  if(staffingScore()<.88)arrival=Math.round(arrival*(.82+staffingScore()*.18));

  const overcrowd=Math.max(0,L.guestsInPark/Math.max(1,capacity())-.78);
  if(overcrowd>0)arrival=Math.round(arrival*clamp(1-overcrowd*.55,.65,1));

  const leaving=Math.round(L.guestsInPark*(p>.55?rand(.035,.08):rand(.008,.028)));
  L.guestsToday+=arrival;L.guestsInPark=Math.max(0,L.guestsInPark+arrival-leaving);L.lastArrival=arrival;

  const ticketRev=arrival*state.ticketPrice*admissionYield();
  const parkingRev=arrival*.34*state.parkingPrice;
  const fastRev=arrival*(state.fastTrackPrice>0?clamp(.10-state.fastTrackPrice/600,.015,.10):0)*state.fastTrackPrice;

  let outletRev=0,outletCost=0;
  operationalOutlets().forEach(o=>{
    const x=outletById(o.id),stat=L.outletStats[o.uid]||(L.outletStats[o.uid]={customers:0,revenue:0});
    const seasonal=x.id==="icecream"?(seasonName(state.day)==="Summer"?1.22:.72):1;
    const possible=Math.min(L.guestsInPark*.070,x.capacity*9/L.totalTicks)*seasonal*(L.weather?.spend||1);
    const served=Math.max(0,Math.round(possible*rand(.65,.95)));
    const gross=served*x.spend*rand(.82,1.08);
    stat.customers+=served;stat.revenue+=gross;outletRev+=gross;outletCost+=gross*(1-x.margin);
  });

  const totalAppeal=Math.max(1,appeal());
  operationalRides().forEach(o=>{
    const x=rideById(o.id),stat=L.rideStats[o.uid]||(L.rideStats[o.uid]={riders:0,downtime:0});
    const share=x.appeal*(o.condition/100)*duplicatePenalty(o.id)/totalAppeal;
    const possible=Math.min(L.guestsInPark*share*rand(.35,.7),x.capacity*9/L.totalTicks);
    stat.riders+=Math.max(0,Math.round(possible));
  });
  state.rides.filter(r=>r.down).forEach(r=>{
    const stat=L.rideStats[r.uid]||(L.rideStats[r.uid]={riders:0,downtime:0});
    stat.downtime++;
  });

  const tickRevenue=ticketRev+parkingRev+fastRev+outletRev;
  const tickCosts=fixedCosts()/L.totalTicks+outletCost+arrival*1.55+debtServiceDaily()/L.totalTicks;
  L.revenue+=tickRevenue;L.costs+=tickCosts;L.debtService+=debtServiceDaily()/L.totalTicks;L.lastRevenueRate=tickRevenue*4;
  state.cash+=tickRevenue-tickCosts;

  maybeBreakdown();

  if(L.tick%8===0&&arrival>0)addFeed(`${arrival.toLocaleString()} guests arrived`,`${L.guestsInPark.toLocaleString()} currently inside.`);
  if(L.tick===20)addFeed("Lunch trade building",`${operationalOutlets().length} outlets are actively trading.`);
  if(L.tick===36&&L.guestsInPark>capacity()*.75)addFeed("Crowding pressure","Queues and facilities are beginning to feel stretched.");
  if(L.tick===52)addFeed("Afternoon trading",`${money(outletRev*4)} estimated hourly food & retail sales.`);

  L.tick++;
  if(L.tick>=L.totalTicks){finishDay();return;}
  render();
}

function finishDay(){
  if(timer){clearInterval(timer);timer=null;}
  const L=state.live;
  const profit=L.revenue-L.costs;

  const crowdPenalty=Math.max(0,L.guestsToday/Math.max(1,capacity())-.78)*42;
  const incidentPenalty=L.incidents.length*5;
  let satisfaction=80-crowdPenalty-incidentPenalty-Math.max(0,state.ticketPrice-(fairTicket()+4))*.55+(staffingScore()-1)*26;
  satisfaction=clamp(satisfaction+rand(-4,4),20,95);
  state.satisfaction=satisfaction;

  state.rating=clamp(state.rating*.94+clamp(1+satisfaction/25,1,5)*.06,1,5);
  state.reputation=clamp(state.reputation+(satisfaction-70)/45-L.incidents.length*.6,0,100);

  state.rides.forEach(r=>{
    r.ageDays=(r.ageDays||0)+1;
    if(r.daysLeft>0)r.daysLeft--;
    if(r.down && Math.random()<.55)r.down=false;
    if(r.daysLeft<=0)r.condition=clamp(r.condition-rand(.15,.65)/clamp(state.staff.mechanics/recommendedStaff().mechanics,.45,1.25),25,100);
  });
  state.outlets.forEach(o=>{o.ageDays=(o.ageDays||0)+1;if(o.daysLeft>0)o.daysLeft--;});

  const principal=Math.min(state.debt,debtPrincipalDaily());
  state.debt=Math.max(0,state.debt-principal);

  state.lastDay={guests:L.guestsToday,revenue:L.revenue,costs:L.costs,debtService:L.debtService,profit,demand:demandEstimate(),rideStats:JSON.parse(JSON.stringify(L.rideStats)),outletStats:JSON.parse(JSON.stringify(L.outletStats))};
  state.history.unshift({day:state.day,guests:L.guestsToday,revenue:L.revenue,costs:L.costs,debtService:L.debtService,profit});
  state.history=state.history.slice(0,60);

  state.negativeDays=profit<0?state.negativeDays+1:0;

  addActivity(`Day ${state.day} complete`,`${L.guestsToday.toLocaleString()} guests | ${money(profit)} profit | ${money(L.debtService)} debt service.`);
  if(L.incidents.length)addActivity("Operational incident",`${L.incidents.join(", ")}. Compensation and repairs hit profit.`);

  state.marketing=state.marketing.map(m=>({...m,daysLeft:m.daysLeft-1})).filter(m=>m.daysLeft>0);

  state.parkOpen=false;L.running=false;state.day++;
  if(state.cash<-350000 || (state.negativeDays>=7 && state.cash<0))state.bankrupt=true;

  save();render();showDayModal();
}

function closeEarly(){if(state.live.running)finishDay();}
function toggleSpeed(){
  if(!state.live.running)return;
  state.speed=state.speed===1?2:state.speed===2?4:1;
  if(timer){clearInterval(timer);timer=setInterval(liveTick,8333.333333/state.speed);}
  render();
}

function rideImpact(r){
  const before=demandEstimate();
  const currentSame=state.rides.filter(x=>x.id===r.id&&x.daysLeft<=0).length;
  const penalty=1/(1+(currentSame+1)*.35);
  const added=r.appeal*penalty;
  const newAppeal=appeal()+added;
  const fairAfter=18+newAppeal*.34+state.rating*3.1;
  const pfAfter=clamp(1-(state.ticketPrice-fairAfter)/62,.38,1.18);
  const ratio=(155+newAppeal*46)/(155+appeal()*46)*(pfAfter/priceFactor());
  return Math.max(0,Math.round(before*(ratio-1)));
}



function constructionProgress(owned,asset){
  if(owned.daysLeft<=0)return 100;
  return clamp(Math.round((asset.buildDays-owned.daysLeft)/Math.max(1,asset.buildDays)*100),0,99);
}
function rideExpediteCost(owned){
  const r=rideById(owned.id);
  if(owned.daysLeft<=0)return 0;
  return Math.max(5000,Math.round(r.cost*(.018+.009*owned.daysLeft)));
}
function outletExpediteCost(owned){
  const o=outletById(owned.id);
  if(owned.daysLeft<=0)return 0;
  return Math.max(1500,Math.round(o.cost*(.025+.012*owned.daysLeft)));
}
function expediteRide(uid){
  if(state.live.running)return toast("Close the park before changing construction.");
  const owned=state.rides.find(r=>r.uid===uid);
  if(!owned||owned.daysLeft<=0)return;
  const r=rideById(owned.id),cost=rideExpediteCost(owned);
  if(state.cash<cost)return toast("Not enough cash to expedite construction.");
  if(!confirm(`Expedite ${r.name} for ${money(cost)}? It will open immediately.`))return;
  state.cash-=cost;owned.daysLeft=0;
  addActivity(`${r.name} construction expedited`,`${money(cost)} paid to contractors. The attraction is now operational.`);
  save();render();toast(`${r.name} is now open.`);
}
function expediteOutlet(uid){
  if(state.live.running)return toast("Close the park before changing construction.");
  const owned=state.outlets.find(o=>o.uid===uid);
  if(!owned||owned.daysLeft<=0)return;
  const o=outletById(owned.id),cost=outletExpediteCost(owned);
  if(state.cash<cost)return toast("Not enough cash to expedite fit-out.");
  if(!confirm(`Expedite ${o.name} for ${money(cost)}? It will open immediately.`))return;
  state.cash-=cost;owned.daysLeft=0;
  addActivity(`${o.name} fit-out expedited`,`${money(cost)} paid to contractors. The outlet is now operational.`);
  save();render();toast(`${o.name} is now open.`);
}

function rideSaleValue(owned){
  const r=rideById(owned.id);
  const age=owned.ageDays||0;

  // Cancelling construction is expensive: contractors, design and sunk costs.
  if(owned.daysLeft>0){
    const completion=(r.buildDays-owned.daysLeft)/Math.max(1,r.buildDays);
    const recovery=.48 + completion*.08;
    return Math.round(r.cost*recovery);
  }

  // Operational rides depreciate with age and condition.
  // New ride ~62%, one-year-old ~51%, two-year-old ~43%, floor ~30%.
  const ageFactor=Math.max(.30,.62-age*.00030);
  const conditionFactor=.72+.28*(owned.condition/100);
  const breakdownPenalty=owned.down?.88:1;

  return Math.round(r.cost*ageFactor*conditionFactor*breakdownPenalty);
}

function outletSaleValue(owned){
  const o=outletById(owned.id);
  const age=owned.ageDays||0;

  if(owned.daysLeft>0){
    const completion=(o.buildDays-owned.daysLeft)/Math.max(1,o.buildDays);
    return Math.round(o.cost*(.52+completion*.06));
  }

  // Smaller commercial units depreciate more gently than rides.
  const ageFactor=Math.max(.35,.64-age*.00022);
  return Math.round(o.cost*ageFactor);
}

function sellRide(uid){
  if(state.live.running)return toast("Close the park before selling an attraction.");

  const index=state.rides.findIndex(r=>r.uid===uid);
  if(index<0)return;

  const owned=state.rides[index];
  const r=rideById(owned.id);
  const value=rideSaleValue(owned);

  if(!confirm(`Sell ${r.name} for ${money(value)}? You originally invested ${money(r.cost)}. This cannot be undone.`))return;

  state.rides.splice(index,1);
  state.cash+=value;

  addActivity(
    `${r.name} sold`,
    `${money(value)} recovered from an original ${money(r.cost)} investment. Park appeal and capacity have fallen.`
  );

  save();
  render();
  toast(`${r.name} sold for ${money(value)}.`);
}

function sellOutlet(uid){
  if(state.live.running)return toast("Close the park before selling an outlet.");

  const index=state.outlets.findIndex(o=>o.uid===uid);
  if(index<0)return;

  const owned=state.outlets[index];
  const o=outletById(owned.id);
  const value=outletSaleValue(owned);

  if(!confirm(`Sell ${o.name} for ${money(value)}? You originally invested ${money(o.cost)}. This cannot be undone.`))return;

  state.outlets.splice(index,1);
  state.cash+=value;

  addActivity(
    `${o.name} sold`,
    `${money(value)} recovered from an original ${money(o.cost)} investment. Secondary-spend capacity has fallen.`
  );

  save();
  render();
  toast(`${o.name} sold for ${money(value)}.`);
}

function buyRide(id){
  if(state.live.running)return toast("Close the park before building.");
  const r=rideById(id);
  if(state.cash<r.cost)return toast("Not enough cash.");
  state.cash-=r.cost;
  state.rides.push({uid:state.nextRideUid++,id,condition:100,daysLeft:r.buildDays,down:false,ageDays:0});
  addActivity(`${r.name} construction started`,`${money(r.cost)} committed | ${r.buildDays} days to open.`);
  save();render();toast(`${r.name} is under construction.`);
}

function buyOutlet(id){
  if(state.live.running)return toast("Close the park before buying new outlets.");
  const o=outletById(id);
  if(state.cash<o.cost)return toast("Not enough cash.");
  state.cash-=o.cost;
  state.outlets.push({uid:state.nextOutletUid++,id,daysLeft:o.buildDays,ageDays:0});
  addActivity(`${o.name} purchased`,`${money(o.cost)} committed | ${o.buildDays} day fit-out.`);
  save();render();toast(`${o.name} purchased and fitting out.`);
}

function repairRide(uid){
  if(state.live.running)return toast("Close the park before planned repairs.");
  const owned=state.rides.find(r=>r.uid===uid),r=rideById(owned.id);
  const cost=Math.round((100-owned.condition)/100*r.cost*.075);
  if(cost<1)return toast("Condition already excellent.");
  if(state.cash<cost)return toast("Not enough cash.");
  state.cash-=cost;owned.condition=100;owned.down=false;
  addActivity(`${r.name} repaired`,`Condition restored to 100% for ${money(cost)}.`);
  save();render();
}

function launchCampaign(id){
  const c=campaigns.find(x=>x.id===id);
  if(state.cash<c.cost)return toast("Not enough cash.");
  state.cash-=c.cost;state.marketing.push({...c,daysLeft:c.days});
  addActivity(`${c.name} launched`,`+${Math.round(c.boost*100)}% demand for ${c.days} days.`);
  save();render();
}

function changeStaff(k,d){
  if(state.live.running)return toast("Staffing changes apply when the park is closed.");
  state.staff[k]=Math.max(0,state.staff[k]+d);save();render();
}


function recentProfitabilityScore(){
  if(!state.history.length)return .45;
  const sample=state.history.slice(0,7);
  const avg=sample.reduce((s,x)=>s+x.profit,0)/sample.length;
  const revenueAvg=Math.max(1,sample.reduce((s,x)=>s+x.revenue,0)/sample.length);
  return clamp(.5 + (avg/revenueAvg)*1.4, .05, 1);
}

function bankRiskScore(){
  const gross=Math.max(1,parkValueGross());
  const leverage=state.debt/gross;
  const liquidity=clamp(state.cash/Math.max(250000,fixedCosts()*30),0,1);
  const profitability=recentProfitabilityScore();
  const lossPenalty=clamp(state.negativeDays/5,0,.7);

  return clamp(
    .38
    + profitability*.30
    + liquidity*.16
    + clamp(1-leverage,0,1)*.22
    - lossPenalty,
    .05,1
  );
}

function bankManagerResponse(requested){
  requested=Math.max(0,Math.round(requested/10000)*10000);

  const headroom=Math.floor(borrowingHeadroom()/10000)*10000;
  const risk=bankRiskScore();

  if(state.bankrupt){
    return{
      approved:false,
      message:"I cannot offer new lending while the company is insolvent."
    };
  }

  if(state.negativeDays>=3){
    return{
      approved:false,
      message:"You have posted too many consecutive loss-making days. I need to see the business stabilise before we lend again."
    };
  }

  if(requested<10000){
    return{
      approved:false,
      message:"The minimum commercial facility we can discuss is Â£10,000."
    };
  }

  if(headroom<10000){
    return{
      approved:false,
      message:"You currently have no meaningful borrowing headroom. Improve cash flow, reduce debt or increase park value first."
    };
  }

  // Bank may accept the request, counter lower, or reject depending on risk.
  let offered=Math.min(requested,headroom);

  if(risk<.35){
    offered=Math.min(offered,Math.floor(headroom*.35/10000)*10000);
  }else if(risk<.5){
    offered=Math.min(offered,Math.floor(headroom*.55/10000)*10000);
  }else if(risk<.68){
    offered=Math.min(offered,Math.floor(headroom*.78/10000)*10000);
  }

  offered=Math.floor(offered/10000)*10000;

  if(offered<10000){
    return{
      approved:false,
      message:"The business is too risky for a new facility at the moment."
    };
  }

  const currentRate=debtRate();
  const projectedDebt=state.debt+offered;
  const projectedLeverage=projectedDebt/Math.max(1,parkValueGross()+offered);
  const riskPremium=(1-risk)*.045 + Math.max(0,projectedLeverage-.35)*.06;
  const offerRate=clamp(currentRate+riskPremium,.075,.19);

  const exact=offered===requested;

  return{
    approved:true,
    requested,
    offered,
    rate:offerRate,
    exact,
    message:exact
      ?`I can approve the full ${money(offered)} request.`
      :`I cannot support ${money(requested)} at current risk levels, but I can offer ${money(offered)}.`
  };
}

function requestLoanNegotiation(){
  if(state.live.running)return toast("Finish or close the trading day before negotiating finance.");

  const input=document.getElementById("borrowAmountInput");
  const requested=Number(input.value||0);
  const result=bankManagerResponse(requested);

  const convo=document.getElementById("bankConversation");
  convo.innerHTML=`
    <div class="bank-message user">
      <strong>You</strong>
      <p>I would like to borrow ${money(requested)} for the park.</p>
    </div>
    <div class="bank-message bank">
      <strong>Bank Manager</strong>
      <p>${result.message}</p>
    </div>`;

  const offerBox=document.getElementById("loanOfferBox");
  const accept=document.getElementById("acceptLoanBtn");
  const decline=document.getElementById("declineLoanBtn");

  if(!result.approved){
    state.pendingLoanOffer=null;
    offerBox.classList.add("hidden");
    accept.classList.add("hidden");
    decline.classList.add("hidden");
    save();
    return;
  }

  state.pendingLoanOffer={
    requested:result.requested,
    amount:result.offered,
    rate:result.rate
  };

  const annualInterest=result.offered*result.rate;
  const approxDailyInterest=annualInterest/365;
  const approxPrincipal=result.offered/(365*5);
  const approxDailyService=approxDailyInterest+approxPrincipal;

  offerBox.innerHTML=`
    <div><span>Bank offer</span><strong>${money(result.offered)}</strong></div>
    <div><span>Indicative APR</span><strong>${(result.rate*100).toFixed(1)}%</strong></div>
    <div><span>Approx daily debt service</span><strong>${money(approxDailyService)}</strong></div>
    <div><span>Requested</span><strong>${money(result.requested)}</strong></div>`;

  offerBox.classList.remove("hidden");
  accept.classList.remove("hidden");
  decline.classList.remove("hidden");
  save();
}

function acceptLoanOffer(){
  const offer=state.pendingLoanOffer;
  if(!offer)return toast("There is no active bank offer.");

  // Final headroom check in case the business changed after the offer.
  const amount=Math.min(offer.amount,Math.floor(borrowingHeadroom()/10000)*10000);
  if(amount<10000){
    state.pendingLoanOffer=null;
    render();
    return toast("The bank withdrew the offer because your borrowing position changed.");
  }

  state.cash+=amount;
  state.debt+=amount;

  addActivity(
    "Bank facility accepted",
    `${money(amount)} borrowed following negotiation. Indicative rate ${(offer.rate*100).toFixed(1)}%.`
  );

  state.pendingLoanOffer=null;
  save();
  render();
  toast(`${money(amount)} funding received.`);
}

function declineLoanOffer(){
  if(!state.pendingLoanOffer)return;
  state.pendingLoanOffer=null;
  const convo=document.getElementById("bankConversation");
  convo.innerHTML+=`
    <div class="bank-message user">
      <strong>You</strong>
      <p>I will not take the facility at this time.</p>
    </div>`;
  document.getElementById("loanOfferBox").classList.add("hidden");
  document.getElementById("acceptLoanBtn").classList.add("hidden");
  document.getElementById("declineLoanBtn").classList.add("hidden");
  save();
}

function borrow(a){
  document.getElementById("borrowAmountInput").value=a;
  requestLoanNegotiation();
}

function repay(){
  const a=Math.min(100000,state.debt,state.cash);
  if(a<=0)return toast("Nothing to repay.");
  state.cash-=a;state.debt-=a;addActivity("Debt repaid",`${money(a)} repaid early.`);
  save();render();
}

function pricingText(){
  const f=fairTicket(),d=state.ticketPrice-f,y=admissionYield();
  if(d>15)return`Ticket price is well above estimated fair value (${money(f)}). Demand is being heavily suppressed. Realised admission yield is only ${Math.round(y*100)}% of headline price.`;
  if(d>5)return`Ticket price is slightly premium. Estimated fair value is ${money(f)}. Realised admission yield is ${Math.round(y*100)}%.`;
  if(d<-8)return`Ticket price is cheap for your attraction mix. Estimated fair value is ${money(f)}.`;
  return`Pricing is close to fair value. Estimated fair value is ${money(f)}. Realised admission yield is ${Math.round(y*100)}%.`;
}

let toastTimer;
function toast(m){
  const e=document.getElementById("toast");e.textContent=m;e.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove("show"),2600);
}
function resetGame(){
  if(confirm("Erase this company and start again?")){
    if(timer)clearInterval(timer);
    state=newState();save();render();
  }
}
function latestRideStat(uid){
  if(state.live.running)return state.live.rideStats[uid]||{riders:0,downtime:0};
  return(state.lastDay.rideStats||{})[uid]||{riders:0,downtime:0};
}
function latestOutletStat(uid){
  if(state.live.running)return state.live.outletStats[uid]||{customers:0,revenue:0};
  return(state.lastDay.outletStats||{})[uid]||{customers:0,revenue:0};
}

function render(){
  const L=state.live,f=forecast(),liveProfit=L.revenue-L.costs;
  document.getElementById("cashKpi").textContent=money(state.cash);
  const pk=document.getElementById("profitKpi");pk.textContent=money(L.running?liveProfit:state.lastDay.profit);pk.className=(L.running?liveProfit:state.lastDay.profit)>=0?"positive":"negative";
  document.getElementById("guestsKpi").textContent=(L.running?L.guestsToday:state.lastDay.guests).toLocaleString();
  document.getElementById("ratingKpi").textContent=`${state.rating.toFixed(1)} / 5`;
  document.getElementById("dayTitle").textContent=`Day ${state.day}`;
  document.getElementById("daySubtitle").textContent=`${seasonName(state.day)} ${weekend(state.day)?"weekend":"weekday"}`;
  document.getElementById("weatherStat").textContent=L.weather.name;
  document.getElementById("weatherDemand").textContent=`${Math.round(L.weather.demand*100)}%`;
  document.getElementById("yieldStat").textContent=`${Math.round(admissionYield()*100)}%`;

  const st=document.getElementById("parkStatus");st.textContent=L.running?"OPEN":"CLOSED";st.className=`status ${L.running?"open":"closed"}`;
  document.getElementById("gameClock").textContent=L.running?clockText():"09:00";
  document.getElementById("dayProgressFill").style.width=`${L.running?L.tick/L.totalTicks*100:0}%`;
  document.getElementById("guestsInPark").textContent=L.guestsInPark.toLocaleString();
  document.getElementById("arrivalRate").textContent=L.running?`${L.lastArrival.toLocaleString()} arrived this interval`:"Waiting to open";
  document.getElementById("liveRevenue").textContent=money(L.revenue);
  document.getElementById("revenueRate").textContent=`${money(L.lastRevenueRate)} / hour`;
  document.getElementById("liveCosts").textContent=money(L.costs);
  const lp=document.getElementById("liveProfit");lp.textContent=money(liveProfit);lp.className=liveProfit>=0?"positive":"negative";
  document.getElementById("profitMargin").textContent=`${L.revenue?((liveProfit/L.revenue)*100).toFixed(1):0}% margin`;
  document.getElementById("forecastDemand").textContent=f.demand.toLocaleString();
  const fp=document.getElementById("forecastProfit");fp.textContent=money(f.profit);fp.className=f.profit>=0?"positive":"negative";
  document.getElementById("capacityKpi").textContent=capacity().toLocaleString();
  document.getElementById("fixedCostKpi").textContent=money(fixedCosts()+debtServiceDaily());
  document.getElementById("openCloseBtn").textContent=L.running?"Close Park Early":"Open Park & Start Day";
  document.getElementById("speedBtn").disabled=!L.running;document.getElementById("speedBtn").textContent=`Speed ${state.speed}x`;
  document.getElementById("feedPulse").textContent=L.running?"LIVE":"Waiting";document.getElementById("feedPulse").className=`pulse-label ${L.running?"live":""}`;
  document.getElementById("liveFeed").innerHTML=L.feed.length?L.feed.map(x=>`<div class="feed-item"><div class="feed-time">${x.time}</div><div><strong>${x.title}</strong><small>${x.detail}</small></div></div>`).join(""):`<div class="muted">Open the park to start the live feed.</div>`;

  document.getElementById("parkValueKpi").textContent=money(parkValue());
  document.getElementById("debtKpi").textContent=money(state.debt);
  document.getElementById("headroomKpi").textContent=money(borrowingHeadroom());
  document.getElementById("debtServiceKpi").textContent=money(debtServiceDaily());
  document.getElementById("staffCoverageKpi").textContent=`${Math.round(staffingScore()*100)}%`;
  document.getElementById("activityFeed").innerHTML=state.activity.map(a=>`<div class="activity-item"><div class="activity-dot"></div><div><strong>${a.title}</strong><small>${a.detail}</small></div></div>`).join("");

  let warning="";
  if(state.bankrupt)warning="BANKRUPTCY: the company can no longer meet its obligations.";
  else if(state.cash<150000)warning="Liquidity warning: cash reserves are dangerously low.";
  else if(state.negativeDays>=3)warning="Lenders have frozen new borrowing after repeated loss-making days.";
  else if(staffingScore()<.82)warning="Workforce coverage is critically low.";
  const wb=document.getElementById("warningBanner");wb.textContent=warning;wb.classList.toggle("hidden",!warning);

  document.getElementById("ownedAttractions").innerHTML=state.rides.map(o=>{
    const r=rideById(o.id),s=latestRideStat(o.uid);
    const util=o.daysLeft>0?0:Math.min(100,Math.round(s.riders/Math.max(1,r.capacity*9)*100));
    const badge=o.daysLeft>0?`<span class="asset-badge building">UNDER CONSTRUCTION - ${o.daysLeft} ${o.daysLeft===1?"DAY":"DAYS"} LEFT</span>`:o.down?`<span class="asset-badge down">DOWN</span>`:`<span class="asset-badge">OWNED</span>`;
    return`<div class="performance-card"><div class="performance-head"><div><h3>${r.name}</h3><small>${r.type}</small></div>${badge}</div><div class="perf-grid"><div><span>Riders today</span><strong>${s.riders.toLocaleString()}</strong></div><div><span>Utilisation</span><strong>${util}%</strong></div><div><span>Appeal</span><strong>+${r.appeal}</strong></div><div><span>Daily upkeep</span><strong>${money(r.upkeep)}</strong></div><div><span>Age</span><strong>${o.ageDays||0} days</strong></div><div><span>Resale value</span><strong>${money(rideSaleValue(o))}</strong></div></div>${o.daysLeft>0?`<div class="construction-box"><div class="construction-copy"><span>Construction progress</span><strong>${constructionProgress(o,r)}%</strong></div><div class="construction-track"><div class="construction-fill" style="width:${constructionProgress(o,r)}%"></div></div><small>${o.daysLeft} ${o.daysLeft===1?"trading day":"trading days"} remaining. This attraction does not generate demand or riders until complete.</small><button class="expedite-btn full" onclick="expediteRide(${o.uid})">Expedite opening - ${money(rideExpediteCost(o))}</button></div>`:""}<div class="condition-wrap"><div class="condition-copy"><span>Condition</span><span>${Math.round(o.condition)}%</span></div><div class="condition-track"><div class="condition-fill" style="width:${o.condition}%"></div></div></div>${o.daysLeft<=0&&(o.condition<99||o.down)?`<button class="ghost full" onclick="repairRide(${o.uid})">Repair attraction</button>`:""}<button class="sell-btn full" onclick="sellRide(${o.uid})">Sell attraction - ${money(rideSaleValue(o))}</button></div>`;
  }).join("");

  document.getElementById("attractionShop").innerHTML=rides.map(r=>{
    const same=state.rides.filter(x=>x.id===r.id).length;
    return`<div class="shop-card"><h3>${r.name}</h3><div class="type">${r.type}</div><p>${r.desc}</p><div class="stat-grid"><div><span>Build cost</span><strong>${money(r.cost)}</strong></div><div><span>Construction</span><strong>${r.buildDays} days</strong></div><div><span>Daily upkeep</span><strong>${money(r.upkeep)}</strong></div><div><span>Capacity</span><strong>${r.capacity}/hr</strong></div></div><div class="impact">Estimated demand gain: +${rideImpact(r).toLocaleString()} guests/day${same?` - duplicate penalty applies (${same} already owned)`:""}</div><button class="primary full" onclick="buyRide('${r.id}')">Build ${r.name}</button></div>`;
  }).join("");

  document.getElementById("ownedOutlets").innerHTML=state.outlets.map(o=>{
    const x=outletById(o.id),s=latestOutletStat(o.uid),util=o.daysLeft>0?0:Math.min(100,Math.round(s.customers/Math.max(1,x.capacity)*100));
    const badge=o.daysLeft>0?`<span class="asset-badge building">FITTING OUT - ${o.daysLeft} ${o.daysLeft===1?"DAY":"DAYS"} LEFT</span>`:`<span class="asset-badge">OWNED</span>`;
    return`<div class="performance-card"><div class="performance-head"><div><h3>${x.name}</h3><small>${x.type}</small></div>${badge}</div><div class="perf-grid"><div><span>Customers</span><strong>${s.customers.toLocaleString()}</strong></div><div><span>Utilisation</span><strong>${util}%</strong></div><div><span>Sales</span><strong>${money(s.revenue)}</strong></div><div><span>Gross profit</span><strong>${money(s.revenue*x.margin)}</strong></div><div><span>Age</span><strong>${o.ageDays||0} days</strong></div><div><span>Resale value</span><strong>${money(outletSaleValue(o))}</strong></div></div>${o.daysLeft>0?`<div class="construction-box"><div class="construction-copy"><span>Fit-out progress</span><strong>${constructionProgress(o,x)}%</strong></div><div class="construction-track"><div class="construction-fill" style="width:${constructionProgress(o,x)}%"></div></div><small>${o.daysLeft} ${o.daysLeft===1?"trading day":"trading days"} remaining. No sales until fit-out completes.</small><button class="expedite-btn full" onclick="expediteOutlet(${o.uid})">Expedite opening - ${money(outletExpediteCost(o))}</button></div>`:""}<button class="sell-btn full" onclick="sellOutlet(${o.uid})">Sell asset - ${money(outletSaleValue(o))}</button></div>`;
  }).join("");

  document.getElementById("outletShop").innerHTML=outlets.map(o=>`<div class="shop-card"><h3>${o.name}</h3><div class="type">${o.type}</div><p>${o.desc}</p><div class="stat-grid"><div><span>Purchase cost</span><strong>${money(o.cost)}</strong></div><div><span>Fit-out</span><strong>${o.buildDays} days</strong></div><div><span>Spend / customer</span><strong>${money(o.spend)}</strong></div><div><span>Gross margin</span><strong>${Math.round(o.margin*100)}%</strong></div></div><div class="impact">Permanent asset. No sales until fit-out completes.</div><button class="primary full" onclick="buyOutlet('${o.id}')">Buy ${o.name}</button></div>`).join("");

  document.getElementById("ticketPrice").value=state.ticketPrice;document.getElementById("ticketPriceLabel").textContent=money(state.ticketPrice);
  document.getElementById("parkingPrice").value=state.parkingPrice;document.getElementById("parkingPriceLabel").textContent=money(state.parkingPrice);
  document.getElementById("fastTrackPrice").value=state.fastTrackPrice;document.getElementById("fastTrackPriceLabel").textContent=money(state.fastTrackPrice);
  document.getElementById("pricingFeedback").textContent=pricingText();

  const rec=recommendedStaff(),score=staffingScore();
  document.getElementById("staffCoverage").innerHTML=`<strong class="${score>=.95?"positive":score>=.82?"warning":"negative"}">${Math.round(score*100)}% coverage</strong><br><small>Understaffing increases incidents, queues and lost demand.</small>`;
  document.getElementById("staffControls").innerHTML=Object.keys(state.staff).map(k=>`<div class="staff-row"><span>${k} <small>${state.staff[k]}/${rec[k]} rec.</small></span><button onclick="changeStaff('${k}',-1)">-</button><strong>${state.staff[k]}</strong><button onclick="changeStaff('${k}',1)">+</button></div>`).join("");

  document.getElementById("marketingShop").innerHTML=campaigns.map(c=>`<div class="marketing-card"><strong>${c.name}</strong><small>${money(c.cost)} | +${Math.round(c.boost*100)}% demand | ${c.days} days</small><button class="secondary full" onclick="launchCampaign('${c.id}')">Launch</button></div>`).join("");
  document.getElementById("activeMarketing").innerHTML=state.marketing.length?state.marketing.map(m=>`<div class="campaign"><span>${m.name}</span><strong>+${Math.round(m.boost*100)}% | ${m.daysLeft} days left</strong></div>`).join(""):`<div class="muted">No active campaigns.</div>`;

  document.getElementById("financeStats").innerHTML=`<div><span>Cash</span><strong>${money(state.cash)}</strong></div><div><span>Park value</span><strong>${money(parkValue())}</strong></div><div><span>Outstanding debt</span><strong>${money(state.debt)}</strong></div><div><span>Variable interest rate</span><strong>${(debtRate()*100).toFixed(1)}%</strong></div><div><span>Daily debt service</span><strong>${money(debtServiceDaily())}</strong></div><div><span>Daily payroll</span><strong>${money(payroll())}</strong></div><div><span>Daily fixed operating costs</span><strong>${money(fixedCosts())}</strong></div><div><span>7-day avg profit</span><strong class="${avgRecentProfit()>=0?"positive":"negative"}">${money(avgRecentProfit())}</strong></div>`;
  document.getElementById("creditPanel").innerHTML=`<strong>${money(borrowingHeadroom())} available</strong><br><small>Lending limit ${money(borrowingLimit())}. Headroom falls as leverage rises or profitability weakens.${state.negativeDays>=3?" New lending currently frozen.":""}</small>`;
  

  const pending=state.pendingLoanOffer;
  const offerBox=document.getElementById("loanOfferBox");
  const acceptOffer=document.getElementById("acceptLoanBtn");
  const declineOffer=document.getElementById("declineLoanBtn");
  if(pending){
    const approxDaily=pending.amount*pending.rate/365 + pending.amount/(365*5);
    offerBox.innerHTML=`
      <div><span>Bank offer</span><strong>${money(pending.amount)}</strong></div>
      <div><span>Indicative APR</span><strong>${(pending.rate*100).toFixed(1)}%</strong></div>
      <div><span>Approx daily debt service</span><strong>${money(approxDaily)}</strong></div>
      <div><span>Requested</span><strong>${money(pending.requested)}</strong></div>`;
    offerBox.classList.remove("hidden");
    acceptOffer.classList.remove("hidden");
    declineOffer.classList.remove("hidden");
  }else{
    offerBox.classList.add("hidden");
    acceptOffer.classList.add("hidden");
    declineOffer.classList.add("hidden");
  }

  const historyTable=document.getElementById("historyTable");
  const emptyReport=document.getElementById("emptyReportState");

  historyTable.innerHTML=state.history.map(r=>`
    <tr>
      <td>Day ${r.day}</td>
      <td>${r.guests.toLocaleString()}</td>
      <td>${money(r.revenue)}</td>
      <td>${money(r.costs)}</td>
      <td>${money(r.debtService||0)}</td>
      <td class="${r.profit>=0?"positive":"negative"}">${money(r.profit)}</td>
    </tr>`).join("");

  emptyReport.classList.toggle("hidden",state.history.length>0);

  const reportSummary=document.getElementById("reportSummary");
  const trendBadge=document.getElementById("reportTrendBadge");
  const guestTrendBar=document.getElementById("guestTrendBar");
  const profitTrendBar=document.getElementById("profitTrendBar");
  const guestTrendValue=document.getElementById("guestTrendValue");
  const profitTrendValue=document.getElementById("profitTrendValue");

  if(!state.history.length){
    reportSummary.innerHTML=`
      <div><span>Days traded</span><strong>0</strong></div>
      <div><span>Total guests</span><strong>0</strong></div>
      <div><span>Total profit</span><strong>Â£0</strong></div>
      <div><span>Best day</span><strong>-</strong></div>`;
    trendBadge.textContent="NO DATA";
    trendBadge.className="trend-badge";
    guestTrendBar.style.width="0%";
    profitTrendBar.style.width="0%";
    guestTrendValue.textContent="0";
    profitTrendValue.textContent="Â£0";
  }else{
    const hist=state.history;
    const totalGuests=hist.reduce((s,x)=>s+x.guests,0);
    const totalProfit=hist.reduce((s,x)=>s+x.profit,0);
    const best=hist.reduce((a,b)=>a.profit>b.profit?a:b);
    const latest=hist[0];
    const prior=hist[1]||latest;

    const guestChange=prior.guests?((latest.guests-prior.guests)/prior.guests)*100:0;
    const profitChange=Math.abs(prior.profit)>1?((latest.profit-prior.profit)/Math.abs(prior.profit))*100:0;

    const recent=hist.slice(0,Math.min(7,hist.length));
    const recentAvg=recent.reduce((s,x)=>s+x.profit,0)/recent.length;
    const older=hist.slice(recent.length,recent.length*2);
    const olderAvg=older.length?older.reduce((s,x)=>s+x.profit,0)/older.length:recentAvg;
    const trendDelta=recentAvg-olderAvg;

    let trend="STABLE",trendClass="trend-badge";
    if(trendDelta>1000){trend="IMPROVING";trendClass+=" positive";}
    if(trendDelta<-1000){trend="DECLINING";trendClass+=" negative";}

    reportSummary.innerHTML=`
      <div><span>Days traded</span><strong>${hist.length}</strong></div>
      <div><span>Total guests</span><strong>${totalGuests.toLocaleString()}</strong></div>
      <div><span>Total profit</span><strong class="${totalProfit>=0?"positive":"negative"}">${money(totalProfit)}</strong></div>
      <div><span>Best day</span><strong>Day ${best.day} - ${money(best.profit)}</strong></div>`;

    trendBadge.textContent=trend;
    trendBadge.className=trendClass;

    guestTrendValue.textContent=`${guestChange>=0?"+":""}${guestChange.toFixed(1)}%`;
    profitTrendValue.textContent=`${profitChange>=0?"+":""}${profitChange.toFixed(1)}%`;

    guestTrendBar.style.width=`${clamp(50+guestChange,4,100)}%`;
    profitTrendBar.style.width=`${clamp(50+profitChange/2,4,100)}%`;

    guestTrendBar.className=`report-bar-fill ${guestChange>=0?"good":"bad"}`;
    profitTrendBar.className=`report-bar-fill ${profitChange>=0?"good":"bad"}`;
  }
}

function showDayModal(){
  const d=state.lastDay;
  document.getElementById("modalTitle").textContent=d.profit>=0?"Profitable day":"Loss-making day";
  document.getElementById("modalProfit").innerHTML=`<strong class="${d.profit>=0?"positive":"negative"}">${money(d.profit)}</strong><span>net result after debt service</span>`;
  document.getElementById("modalStats").innerHTML=`<div><span>Guests</span><strong>${d.guests.toLocaleString()}</strong></div><div><span>Revenue</span><strong>${money(d.revenue)}</strong></div><div><span>Costs</span><strong>${money(d.costs)}</strong></div><div><span>Debt service</span><strong>${money(d.debtService)}</strong></div>`;
  document.getElementById("modalEvent").textContent=state.live.incidents.length?`Incidents: ${state.live.incidents.join(", ")}. Compensation and emergency repairs reduced profit.`:`No major operational incidents today.`;
  document.getElementById("dayModal").classList.remove("hidden");
}

window.buyRide=buyRide;window.buyOutlet=buyOutlet;window.repairRide=repairRide;window.sellRide=sellRide;window.sellOutlet=sellOutlet;window.expediteRide=expediteRide;window.expediteOutlet=expediteOutlet;window.changeStaff=changeStaff;window.launchCampaign=launchCampaign;

document.querySelectorAll(".tabs button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");document.getElementById(btn.dataset.tab).classList.add("active");
  window.scrollTo({top:0,behavior:"smooth"});
}));

document.getElementById("openCloseBtn").onclick=()=>state.live.running?closeEarly():startDay();
document.getElementById("speedBtn").onclick=toggleSpeed;
document.getElementById("saveBtn").onclick=()=>save(true);
document.getElementById("resetBtn").onclick=resetGame;
document.getElementById("modalClose").onclick=()=>document.getElementById("dayModal").classList.add("hidden");

document.getElementById("ticketPrice").oninput=e=>{state.ticketPrice=Number(e.target.value);save();render();};
document.getElementById("parkingPrice").oninput=e=>{state.parkingPrice=Number(e.target.value);save();render();};
document.getElementById("fastTrackPrice").oninput=e=>{state.fastTrackPrice=Number(e.target.value);save();render();};

document.getElementById("requestLoanBtn").onclick=requestLoanNegotiation;
document.getElementById("acceptLoanBtn").onclick=acceptLoanOffer;
document.getElementById("declineLoanBtn").onclick=declineLoanOffer;
document.getElementById("repayBtn").onclick=repay;

render();
