/*
 * Park Empire v1.04.0
 * Procedural 3D attraction renderer.
 *
 * No external libraries, textures or model files.
 * Every scene is generated from 3D coordinates and projected into Canvas 2D.
 *
 * Engine features:
 * - perspective camera
 * - camera yaw / pitch / orbit
 * - depth-sorted 3D polygons
 * - world-space lines with perspective thickness
 * - Catmull-Rom coaster splines
 * - twin rails, sleepers and structural supports
 * - animated trains following 3D paths
 * - rotating carousel geometry
 * - moving drop tower gondola
 * - animated rapids raft
 * - dodgem arena vehicles
 * - procedural 3D buildings / outlets
 * - park overview scene
 * - viewport visibility throttling
 * - devicePixelRatio cap
 * - reduced-motion support
 * - adaptive frame rate on small screens
 */

(function(){
"use strict";

const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const fract=v=>v-Math.floor(v);

function V(x=0,y=0,z=0){return{x,y,z}}
function add(a,b){return V(a.x+b.x,a.y+b.y,a.z+b.z)}
function sub(a,b){return V(a.x-b.x,a.y-b.y,a.z-b.z)}
function mul(a,s){return V(a.x*s,a.y*s,a.z*s)}
function len(a){return Math.hypot(a.x,a.y,a.z)}
function norm(a){const l=len(a)||1;return V(a.x/l,a.y/l,a.z/l)}
function cross(a,b){return V(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x)}
function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z}

function hexToRgb(hex){
  const s=hex.replace("#","");
  const n=parseInt(s.length===3?s.split("").map(x=>x+x).join(""):s,16);
  return[(n>>16)&255,(n>>8)&255,n&255];
}
function color(hex,light=0,alpha=1){
  const [r,g,b]=hexToRgb(hex);
  const f=light>=0?255:0;
  const p=Math.abs(light);
  return `rgba(${Math.round(r+(f-r)*p)},${Math.round(g+(f-g)*p)},${Math.round(b+(f-b)*p)},${alpha})`;
}

class Camera{
  constructor(){
    this.pos=V(0,11,25);
    this.target=V(0,3,0);
    this.fov=42;
    this.yaw=0;
    this.pitch=0;
    this.roll=0;
  }
  basis(){
    const forward=norm(sub(this.target,this.pos));
    const right=norm(cross(forward,V(0,1,0)));
    const up=norm(cross(right,forward));
    return{forward,right,up};
  }
}

class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext("2d",{alpha:false,desynchronized:true});
    this.w=0;this.h=0;this.dpr=1;
    this.camera=new Camera();
    this.commands=[];
    this.light=norm(V(-.35,.9,.4));
  }

  resize(){
    const rect=this.canvas.getBoundingClientRect();
    const maxDpr=innerWidth<700?1.45:1.8;
    const dpr=Math.min(window.devicePixelRatio||1,maxDpr);
    const w=Math.max(10,Math.round(rect.width*dpr));
    const h=Math.max(10,Math.round(rect.height*dpr));
    if(w!==this.canvas.width||h!==this.canvas.height){
      this.canvas.width=w;this.canvas.height=h;
      this.w=w;this.h=h;this.dpr=dpr;
    }
  }

  project(p){
    const cam=this.camera,b=cam.basis(),rel=sub(p,cam.pos);
    const x=dot(rel,b.right),y=dot(rel,b.up),z=dot(rel,b.forward);
    if(z<=.15)return null;
    const f=(this.h*.5)/Math.tan(cam.fov*Math.PI/360);
    return{x:this.w*.5+x*f/z,y:this.h*.52-y*f/z,z,scale:f/z};
  }

  clear(skyTop="#78bfe1",skyBottom="#d8eef3",ground="#315e49"){
    const c=this.ctx;
    const g=c.createLinearGradient(0,0,0,this.h);
    g.addColorStop(0,skyTop);g.addColorStop(.64,skyBottom);g.addColorStop(.645,ground);g.addColorStop(1,color(ground,-.2));
    c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
    const haze=c.createRadialGradient(this.w*.72,this.h*.15,0,this.w*.72,this.h*.15,this.w*.5);
    haze.addColorStop(0,"rgba(255,246,205,.30)");haze.addColorStop(1,"rgba(255,246,205,0)");
    c.fillStyle=haze;c.fillRect(0,0,this.w,this.h);
  }

  begin(){this.commands.length=0}

  polygon(points,fill,stroke=null,width=1,lightFactor=0){
    const ps=points.map(p=>this.project(p));
    if(ps.some(p=>!p))return;
    const depth=ps.reduce((s,p)=>s+p.z,0)/ps.length;
    let finalFill=fill;
    if(lightFactor!==0&&typeof fill==="string"&&fill[0]==="#"){
      const a=sub(points[1],points[0]),b=sub(points[2],points[0]);
      const n=norm(cross(a,b));
      const l=clamp(dot(n,this.light)*.35+.25,-.22,.28)*lightFactor;
      finalFill=color(fill,l);
    }
    this.commands.push({type:"poly",ps,fill:finalFill,stroke,width:width*this.dpr,depth});
  }

  line3(a,b,stroke,width=1,alpha=1){
    const pa=this.project(a),pb=this.project(b);if(!pa||!pb)return;
    this.commands.push({type:"line",pa,pb,stroke,alpha,width:width*this.dpr*(pa.scale+pb.scale)*.045,depth:(pa.z+pb.z)/2});
  }

  circle3(p,r,fill,stroke=null){
    const pp=this.project(p);if(!pp)return;
    this.commands.push({type:"circle",p:pp,r:Math.max(.5,r*pp.scale),fill,stroke,depth:pp.z});
  }

  box(center,size,fill="#687a86"){
    const x=size.x/2,y=size.y/2,z=size.z/2;
    const p=[
      add(center,V(-x,-y,-z)),add(center,V(x,-y,-z)),add(center,V(x,y,-z)),add(center,V(-x,y,-z)),
      add(center,V(-x,-y,z)),add(center,V(x,-y,z)),add(center,V(x,y,z)),add(center,V(-x,y,z))
    ];
    const faces=[
      [0,1,2,3,.70],[4,7,6,5,1],[0,4,5,1,.78],[3,2,6,7,1.12],[1,5,6,2,.88],[0,3,7,4,.65]
    ];
    for(const f of faces){
      this.polygon(f.slice(0,4).map(i=>p[i]),color(fill,(f[4]-1)*.45),null,0,0);
    }
  }

  cylinder(center,radius,height,fill="#8799a5",segments=12){
    const top=[],bot=[];
    for(let i=0;i<segments;i++){
      const a=i/segments*TAU;
      top.push(add(center,V(Math.cos(a)*radius,height/2,Math.sin(a)*radius)));
      bot.push(add(center,V(Math.cos(a)*radius,-height/2,Math.sin(a)*radius)));
    }
    this.polygon(top, color(fill,.12));
    for(let i=0;i<segments;i++){
      const j=(i+1)%segments;
      this.polygon([bot[i],bot[j],top[j],top[i]],color(fill,(i/segments-.5)*.18));
    }
  }

  groundGrid(extent=22,step=3,alpha=.13){
    for(let i=-extent;i<=extent;i+=step){
      this.line3(V(i,.02,-extent),V(i,.02,extent),`rgba(226,245,244,${alpha})`,.35);
      this.line3(V(-extent,.02,i),V(extent,.02,i),`rgba(226,245,244,${alpha})`,.35);
    }
  }

  flush(){
    const c=this.ctx;
    this.commands.sort((a,b)=>b.depth-a.depth);
    c.lineCap="round";c.lineJoin="round";
    for(const cmd of this.commands){
      if(cmd.type==="poly"){
        c.beginPath();
        c.moveTo(cmd.ps[0].x,cmd.ps[0].y);
        for(let i=1;i<cmd.ps.length;i++)c.lineTo(cmd.ps[i].x,cmd.ps[i].y);
        c.closePath();
        if(cmd.fill){c.fillStyle=cmd.fill;c.fill()}
        if(cmd.stroke){c.strokeStyle=cmd.stroke;c.lineWidth=cmd.width;c.stroke()}
      }else if(cmd.type==="line"){
        c.globalAlpha=cmd.alpha;
        c.beginPath();c.moveTo(cmd.pa.x,cmd.pa.y);c.lineTo(cmd.pb.x,cmd.pb.y);
        c.strokeStyle=cmd.stroke;c.lineWidth=clamp(cmd.width,.55*this.dpr,7*this.dpr);c.stroke();
        c.globalAlpha=1;
      }else if(cmd.type==="circle"){
        c.beginPath();c.arc(cmd.p.x,cmd.p.y,cmd.r,0,TAU);
        c.fillStyle=cmd.fill;c.fill();
        if(cmd.stroke){c.strokeStyle=cmd.stroke;c.lineWidth=1*this.dpr;c.stroke()}
      }
    }
  }
}

function catmull(points,t,closed=true){
  const n=points.length;
  const u=t*(closed?n:n-1);
  let i=Math.floor(u),f=u-i;
  if(closed)i=((i%n)+n)%n; else i=clamp(i,0,n-2);
  const get=k=>closed?points[(k+n)%n]:points[clamp(k,0,n-1)];
  const p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
  const f2=f*f,f3=f2*f;
  return V(
    .5*((2*p1.x)+(-p0.x+p2.x)*f+(2*p0.x-5*p1.x+4*p2.x-p3.x)*f2+(-p0.x+3*p1.x-3*p2.x+p3.x)*f3),
    .5*((2*p1.y)+(-p0.y+p2.y)*f+(2*p0.y-5*p1.y+4*p2.y-p3.y)*f2+(-p0.y+3*p1.y-3*p2.y+p3.y)*f3),
    .5*((2*p1.z)+(-p0.z+p2.z)*f+(2*p0.z-5*p1.z+4*p2.z-p3.z)*f2+(-p0.z+3*p1.z-3*p2.z+p3.z)*f3)
  );
}
function tangent(points,t,closed=true){
  const e=.001;
  return norm(sub(catmull(points,fract(t+e),closed),catmull(points,fract(t-e+1),closed)));
}

const SCENES={
  woodie:{
    rail:"#6e3827",support:"#87674b",train:"#d9443f",
    path:[V(-10,1,-5),V(-8,7,-4),V(-4,10,-2),V(0,3,0),V(4,8,2),V(8,4,4),V(10,1,5),V(5,.8,7),V(-2,1,6),V(-8,2,2)]
  },
  launch:{
    rail:"#287bd1",support:"#566b7d",train:"#f1b841",
    path:[V(-11,1,-4),V(-5,1,-4),V(-1,2,-3),V(2,10,-1),V(5,4,1),V(9,2,4),V(10,1,7),V(3,1,7),V(-3,3,5),V(-8,2,2)]
  },
  invert:{
    rail:"#4a3895",support:"#687789",train:"#4bd4c3",
    path:[V(-10,1,-5),V(-6,7,-4),V(-1,5,-3),V(1,10,0),V(4,6,2),V(8,2,4),V(7,1,7),V(1,2,7),V(-5,4,4),V(-9,2,0)]
  },
  hyper:{
    rail:"#d7612f",support:"#667482",train:"#d83f58",
    path:[V(-11,1,-5),V(-8,3,-4),V(-4,13,-3),V(0,4,-1),V(4,11,1),V(8,5,4),V(11,2,6),V(5,1,8),V(-2,2,7),V(-8,4,2)]
  },
  giga:{
    rail:"#173d77",support:"#566a7d",train:"#ef5b6a",
    path:[V(-12,1,-5),V(-9,4,-4),V(-4,15,-3),V(1,5,-1),V(5,13,1),V(10,5,4),V(12,2,7),V(4,1,9),V(-3,3,7),V(-10,5,1)]
  }
};

function drawCoaster(r,time,name){
  const cfg=SCENES[name]||SCENES.hyper;
  r.groundGrid(18,3,.10);
  const path=cfg.path;
  const samples=86;
  const pts=[];
  for(let i=0;i<=samples;i++)pts.push(catmull(path,i/samples,true));

  // structural supports
  for(let i=0;i<samples;i+=5){
    const p=pts[i];
    if(p.y>.8){
      r.line3(V(p.x,.05,p.z),V(p.x,p.y-.12,p.z),cfg.support,.75,.82);
      const foot=.42;
      r.line3(V(p.x-foot,.05,p.z),V(p.x+foot,.05,p.z),cfg.support,.45,.55);
    }
  }

  // twin rails and cross ties
  for(let i=0;i<samples;i++){
    const p=pts[i],q=pts[i+1];
    const t=norm(sub(q,p));
    const side=norm(cross(V(0,1,0),t));
    const sep=.22;
    r.line3(add(p,mul(side,sep)),add(q,mul(side,sep)),cfg.rail,1.05);
    r.line3(add(p,mul(side,-sep)),add(q,mul(side,-sep)),cfg.rail,1.05);
    if(i%3===0)r.line3(add(p,mul(side,-.30)),add(p,mul(side,.30)),color(cfg.rail,-.25),.45,.9);
  }

  // station
  r.box(V(-8.8,.65,-4.9),V(3.1,1.25,1.8),"#304655");
  r.box(V(-8.8,1.45,-4.9),V(3.5,.12,2.1),"#647986");

  // train
  const speed=name==="launch"?.065:name==="giga"?.035:.045;
  const base=fract(time*speed+.15);
  for(let car=0;car<4;car++){
    const t=fract(base-car*.012);
    const p=catmull(path,t,true),tan=tangent(path,t,true);
    const side=norm(cross(V(0,1,0),tan));
    const c=add(p,V(0,.18,0));
    r.box(c,V(.72,.42,.52),cfg.train);
    r.circle3(add(c,mul(side,.32)),.09,"#152532");
    r.circle3(add(c,mul(side,-.32)),.09,"#152532");
  }
}

function drawCarousel(r,time){
  r.groundGrid(14,2.5,.09);
  const center=V(0,.25,0);
  r.cylinder(center,4.8,.42,"#9c5e36",28);
  r.cylinder(V(0,3.2,0),.32,6.2,"#c9a26a",14);
  const roof=[];
  for(let i=0;i<24;i++){
    const a=i/24*TAU;
    roof.push(V(Math.cos(a)*5.1,4.7,Math.sin(a)*5.1));
  }
  r.polygon(roof,"#b92f43");
  // conical roof fan
  for(let i=0;i<24;i++){
    const a=i/24*TAU,b=(i+1)/24*TAU;
    const col=i%2?"#d9c16e":"#c64455";
    r.polygon([V(0,6.4,0),V(Math.cos(a)*5.1,4.7,Math.sin(a)*5.1),V(Math.cos(b)*5.1,4.7,Math.sin(b)*5.1)],col);
  }
  const rot=time*.55;
  for(let i=0;i<10;i++){
    const a=rot+i/10*TAU;
    const rad=3.6;
    const x=Math.cos(a)*rad,z=Math.sin(a)*rad;
    const bob=Math.sin(time*2+i)*.35;
    r.line3(V(x,1,z),V(x,4.8,z),"#dcc69b",.45);
    r.box(V(x,1.45+bob,z),V(.75,.5,.36),i%2?"#287bd1":"#e7a838");
  }
}

function drawDrop(r,time){
  r.groundGrid(13,2.5,.09);
  r.box(V(0,5,0),V(.8,10,.8),"#617581");
  r.box(V(0,10.3,0),V(2.4,.45,2.4),"#243e50");
  const phase=(Math.sin(time*.8-Math.PI/2)+1)/2;
  const eased=phase<.7?phase/.7:1-(phase-.7)/.3;
  const y=1.8+clamp(eased,0,1)*7.6;
  r.cylinder(V(0,y,0),2.1,.55,"#c64251",18);
  for(let i=0;i<12;i++){
    const a=i/12*TAU;
    r.box(V(Math.cos(a)*1.72,y-.15,Math.sin(a)*1.72),V(.45,.42,.45),"#e5b84d");
  }
  r.box(V(0,.25,0),V(5.2,.5,5.2),"#435a66");
}

function drawDodgems(r,time){
  r.groundGrid(14,2.5,.06);
  r.box(V(0,.25,0),V(12,.5,8),"#4a5860");
  const posts=[[-6,-4],[-6,4],[6,-4],[6,4]];
  posts.forEach(([x,z])=>r.box(V(x,2.3,z),V(.28,4.6,.28),"#5c7080"));
  r.box(V(0,4.6,0),V(12.8,.25,8.8),"#31516a");
  for(let i=0;i<7;i++){
    const a=time*(.35+i*.03)+i*1.7;
    const x=Math.sin(a*1.3+i)*4.6,z=Math.cos(a*.9+i*.7)*2.8;
    const col=["#d84f5f","#2c87da","#efb841","#2fb89b"][i%4];
    r.box(V(x,.65,z),V(1.1,.55,.75),col);
    r.line3(V(x,1,z),V(x,4.4,z),"rgba(210,227,234,.6)",.3);
  }
}

function drawRapids(r,time){
  r.groundGrid(16,2.5,.06);
  // river ribbon from two spline-like loops
  const path=[V(-9,.2,-3),V(-5,.2,-6),V(1,.2,-5),V(7,.2,-2),V(8,.2,3),V(3,.2,6),V(-4,.2,5),V(-9,.2,2)];
  const samples=70;
  for(let i=0;i<samples;i++){
    const p=catmull(path,i/samples,true),q=catmull(path,(i+1)/samples,true);
    const t=norm(sub(q,p)),side=norm(cross(V(0,1,0),t));
    r.line3(add(p,mul(side,.95)),add(q,mul(side,.95)),"#4fb4d3",2.4,.75);
    r.line3(add(p,mul(side,-.95)),add(q,mul(side,-.95)),"#2c86a4",2.4,.75);
  }
  // rocks
  [[-5,0],[-2,4],[5,-1],[3,5],[7,3]].forEach((p,i)=>{
    r.box(V(p[0],.45,p[1]),V(1+i%2*.4,.9,1.1),"#6e6c61");
  });
  const t=fract(time*.055+.2),p=catmull(path,t,true);
  r.cylinder(add(p,V(0,.42,0)),1.05,.45,"#e59b32",16);
  for(let i=0;i<6;i++){
    const a=i/6*TAU;
    r.circle3(add(p,V(Math.cos(a)*.6,.76,Math.sin(a)*.6)),.12,"#e9d8ad");
  }
}

function drawDarkRide(r,time){
  r.groundGrid(15,3,.06);
  // path and manor
  r.box(V(0,2.1,0),V(9,4.2,5.4),"#403b55");
  r.box(V(-3.2,4.7,0),V(2.2,5.4,4.5),"#504866");
  r.box(V(3.0,4.1,0),V(2.8,4.3,4.6),"#4b435f");
  // roofs
  const roof=(cx,w,y,z)=>{
    r.polygon([V(cx-w/2,y,z-2.6),V(cx+w/2,y,z-2.6),V(cx,y+2,z-2.6)],"#2b283b");
    r.polygon([V(cx-w/2,y,z+2.6),V(cx,y+2,z+2.6),V(cx+w/2,y,z+2.6)],"#242233");
  };
  roof(0,9,4.2,0);roof(-3.2,2.8,7.4,0);roof(3,3.4,6.25,0);
  // glowing windows
  for(const x of [-3.5,-1.3,1.3,3.5]){
    for(const y of [1.7,3.2]){
      const pulse=.55+.45*Math.sin(time*1.2+x);
      r.box(V(x,y,-2.72),V(.65,.8,.08),pulse>.55?"#f4cf62":"#d6a93c");
    }
  }
  r.box(V(0,1,-2.75),V(1.3,2,.12),"#1b1a25");
  // queue cart
  const px=Math.sin(time*.45)*3.3;
  r.box(V(px,.45,-3.3),V(1.3,.55,.8),"#4c91b6");
}

function drawOutlet(r,time,type){
  r.groundGrid(12,2.5,.07);
  const palettes={
    coffee:["#2d4453","#d2a069","#f0dfc0"],
    burger:["#a94238","#f0b746","#f9e2a8"],
    souvenir:["#345b82","#6eb7de","#f3e5bd"],
    icecream:["#db6e8b","#73c7d4","#fff0de"],
    restaurant:["#4a5b49","#a8b871","#f0d8ae"],
    premium:["#292c38","#b59657","#efe4c8"]
  };
  const p=palettes[type]||palettes.souvenir;
  r.box(V(0,1.6,0),V(7,3.2,5),p[0]);
  r.box(V(0,3.35,0),V(7.5,.28,5.5),color(p[0],-.18));
  r.box(V(0,2.45,-2.55),V(4.5,.8,.14),p[1]);
  r.box(V(-1.9,1.25,-2.58),V(1.8,1.45,.12),p[2]);
  r.box(V(1.7,1.2,-2.58),V(1.1,2.35,.12),"#263b49");
  // awning
  for(let i=0;i<7;i++){
    r.box(V(-3+i,3.0,-2.85),V(.95,.14,.75),i%2?p[1]:"#f3f4ed");
  }
  // animated guests
  for(let i=0;i<4;i++){
    const x=-4.5+i*2.2+Math.sin(time*.45+i)*.45;
    r.cylinder(V(x,.75,-4.0+i*.2),.16,1.1,["#416e95","#d75e5e","#c79d41","#508b6a"][i]);
    r.circle3(V(x,1.45,-4.0+i*.2),.22,"#d4aa84");
  }
}

function drawPark(r,time,data){
  r.groundGrid(24,3,.08);
  // pathways
  r.line3(V(-17,.04,1),V(17,.04,1),"rgba(226,221,196,.9)",4.2);
  r.line3(V(-5,.05,-12),V(-5,.05,10),"rgba(226,221,196,.75)",2.6);
  r.line3(V(6,.05,-10),V(6,.05,11),"rgba(226,221,196,.65)",2.3);

  const rides=(data&&data.rides)||[];
  const positions=[
    V(-10,0,-5),V(-3,0,-5),V(5,0,-5),V(11,0,-3),
    V(-10,0,5),V(-2,0,5),V(6,0,5),V(12,0,6)
  ];

  rides.slice(0,8).forEach((id,i)=>{
    const p=positions[i];
    // Render simplified landmark geometry rather than nested cameras.
    if(id==="carousel"){
      r.cylinder(add(p,V(0,.25,0)),2.0,.35,"#9c5e36",18);
      r.cylinder(add(p,V(0,1.7,0)),.2,3.3,"#caa56d",10);
      r.circle3(add(p,V(0,3.5,0)),1.9,"#bc4050");
    }else if(id==="drop"){
      r.box(add(p,V(0,2.6,0)),V(.35,5.2,.35),"#607681");
      const y=1.1+(Math.sin(time*.8+i)+1)*1.7;
      r.box(add(p,V(0,y,0)),V(2.2,.4,2.2),"#c74754");
    }else if(id==="dark"){
      r.box(add(p,V(0,1.4,0)),V(4.2,2.8,3.2),"#454058");
      r.box(add(p,V(-1.2,3.0,0)),V(1.2,3.1,2.4),"#514962");
    }else{
      const c=SCENES[id]||SCENES.hyper;
      const path=c.path.map(q=>add(mul(q,.22),p));
      for(let j=0;j<path.length;j++){
        const a=path[j],b=path[(j+1)%path.length];
        r.line3(a,b,c.rail,.65,.9);
        if(j%2===0&&a.y>.5)r.line3(V(a.x,.03,a.z),a,c.support,.35,.65);
      }
    }
  });

  // Entrance
  r.box(V(-15,1.1,1),V(3.6,2.2,1.3),"#1f526a");
  r.box(V(-15,2.5,1),V(4.2,.35,1.7),"#d8a742");

  // moving guests
  for(let i=0;i<14;i++){
    const t=fract(time*.025+i/14);
    const x=lerp(-13,12,t);
    const z=1+Math.sin(i*2.4)*.55;
    r.cylinder(V(x,.45,z),.10,.65,["#d55561","#2e83c5","#dda743","#2f9c83"][i%4],8);
    r.circle3(V(x,.9,z),.13,"#d6ae8b");
  }
}

class Scene{
  constructor(canvas){
    this.canvas=canvas;
    this.renderer=new Renderer(canvas);
    this.type=canvas.dataset.scene||"hyper";
    this.outlet=canvas.dataset.outlet||"souvenir";
    this.mini=canvas.dataset.mini==="1";
    this.visible=true;
    this.last=0;
    this.fps=this.mini?24:(innerWidth<700?30:42);
    this.parkData=null;
    if(canvas.dataset.park){
      try{this.parkData=JSON.parse(decodeURIComponent(canvas.dataset.park))}catch{}
    }
  }

  draw(ms){
    const r=this.renderer;
    r.resize();
    if(!r.w||!r.h)return;
    const time=ms/1000;

    let yaw=Math.sin(time*.09)*.05;
    if(this.type==="park"){
      r.camera.pos=V(18,17,24);
      r.camera.target=V(0,1.8,0);
      r.camera.fov=43;
      r.clear("#82cce4","#d8eef0","#39755a");
      r.begin();drawPark(r,time,this.parkData);r.flush();return;
    }

    r.camera.pos=V(15+Math.sin(time*.08)*1.1,10.5,22);
    r.camera.target=V(0,3.1,0);
    r.camera.fov=this.mini?47:42;
    r.clear("#78c5e3","#dceff3","#3d795b");
    r.begin();

    switch(this.type){
      case"carousel":drawCarousel(r,time);break;
      case"dodgems":drawDodgems(r,time);break;
      case"drop":drawDrop(r,time);break;
      case"rapids":drawRapids(r,time);break;
      case"dark":drawDarkRide(r,time);break;
      case"outlet":drawOutlet(r,time,this.outlet);break;
      case"woodie":
      case"launch":
      case"invert":
      case"hyper":
      case"giga":drawCoaster(r,time,this.type);break;
      default:drawCoaster(r,time,"hyper");
    }
    r.flush();
  }
}

const scenes=new Map();
let running=false;
const reduced=matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
const observer=("IntersectionObserver" in window)?new IntersectionObserver(entries=>{
  for(const e of entries){
    const s=scenes.get(e.target);if(s)s.visible=e.isIntersecting;
  }
},{rootMargin:"100px"}):null;

function scan(root=document){
  root.querySelectorAll("canvas.park3d-canvas").forEach(canvas=>{
    if(scenes.has(canvas))return;
    const s=new Scene(canvas);
    scenes.set(canvas,s);
    if(observer)observer.observe(canvas);
    s.draw(performance.now());
  });
  for(const [canvas,s] of scenes){
    if(!document.documentElement.contains(canvas)){
      if(observer)observer.unobserve(canvas);
      scenes.delete(canvas);
    }
  }
  if(!running){running=true;requestAnimationFrame(loop)}
}

function loop(ms){
  for(const s of scenes.values()){
    if(!s.visible)continue;
    const interval=1000/(reduced?2:s.fps);
    if(ms-s.last>=interval){
      s.last=ms;
      s.draw(ms);
    }
  }
  requestAnimationFrame(loop);
}

const mo=new MutationObserver(records=>{
  let needs=false;
  for(const rec of records){
    if(rec.addedNodes&&rec.addedNodes.length){needs=true;break}
  }
  if(needs)scan();
});
mo.observe(document.documentElement,{childList:true,subtree:true});

window.Park3D={scan,scenes};

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>scan());
}else scan();

})();
