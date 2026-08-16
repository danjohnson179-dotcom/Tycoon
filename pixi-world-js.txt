import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  BlurFilter,
  ColorMatrixFilter,
} from 'https://cdn.jsdelivr.net/npm/pixi.js@8.18.1/dist/pixi.min.mjs';

/*
  Park Empire v1.05.0 — PixiJS WebGL park world
  ------------------------------------------------
  This file contains presentation only.

  Business simulation:
      game.js

  UI:
      index.html / styles.css

  Render world:
      this module

  No CanvasRenderingContext2D is used. The game world is a PixiJS scene graph
  rendered through WebGL.

  Art upgrade path:
  -----------------
  The fallback building art below is generated into high-resolution Pixi
  textures once, then displayed as Sprites. Replace those generated textures
  later with frames from high-resolution texture atlases without touching the
  business simulation or world placement logic.
*/

const PIXI_VERSION='8.18.1';
const TILE_W=104;
const TILE_H=52;
const COLS=18;
const ROWS=18;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const iso=(gx,gy)=>({
  x:(gx-gy)*(TILE_W/2),
  y:(gx+gy)*(TILE_H/2)
});

const RIDE_STYLE={
  carousel:{kind:'carousel',accent:0xd94f64,roof:0xb63c50,body:0xdab66f,size:[2,2]},
  dodgems:{kind:'dodgems',accent:0x46a7df,roof:0x365e7a,body:0x627886,size:[2,2]},
  drop:{kind:'drop',accent:0xdb5967,roof:0x374d60,body:0x637885,size:[2,2]},
  rapids:{kind:'rapids',accent:0x3da4c3,roof:0x355e69,body:0x6f7a64,size:[3,2]},
  woodie:{kind:'coaster',accent:0x8a4f34,roof:0x5d4636,body:0x76604b,size:[3,2]},
  launch:{kind:'coaster',accent:0x2c88e4,roof:0x334d67,body:0x546b7e,size:[3,2]},
  invert:{kind:'coaster',accent:0x6654bc,roof:0x3e405e,body:0x596676,size:[3,2]},
  dark:{kind:'dark',accent:0x9b7ac7,roof:0x2f2c43,body:0x4b465f,size:[3,2]},
  hyper:{kind:'coaster',accent:0xe06b35,roof:0x4c4650,body:0x68737b,size:[4,2]},
  giga:{kind:'coaster',accent:0x244c8a,roof:0x33435a,body:0x53677a,size:[4,3]}
};

const OUTLET_STYLE={
  coffee:{accent:0x46b89e,roof:0x755043,body:0xe2cfaa,size:[1,1]},
  burger:{accent:0xe49a3c,roof:0xa84b3e,body:0xe6c695,size:[1,1]},
  souvenir:{accent:0x4d98d1,roof:0x3d5e80,body:0xcbddea,size:[1,1]},
  icecream:{accent:0xe27795,roof:0x68bacd,body:0xf0d5da,size:[1,1]},
  restaurant:{accent:0x93b85b,roof:0x496149,body:0xe1d5ba,size:[2,1]},
  premium:{accent:0xb89b58,roof:0x2e3039,body:0xd5ccb6,size:[2,1]}
};

class ParkWorld {
  constructor(mount){
    this.mount=mount;
    this.app=new Application();

    this.root=new Container();
    this.parallaxFar=new Container();
    this.parallaxNear=new Container();
    this.ground=new Container();
    this.pathLayer=new Container();
    this.shadowLayer=new Container();
    this.entityLayer=new Container();
    this.guestLayer=new Container();
    this.fxLayer=new Container();
    this.weatherLayer=new Container();

    this.entityLayer.sortableChildren=true;
    this.shadowLayer.sortableChildren=true;

    this.textures=new Map();
    this.views=new Map();
    this.snapshot=null;
    this.prevKeys=new Set();

    this.camera={
      x:0,y:0,targetX:0,targetY:0,vx:0,vy:0,
      zoom:.82,targetZoom:.82,zoomVelocity:0,
      dragging:false,lastX:0,lastY:0,dragDistance:0,pinchDistance:0
    };

    this.guestPool=[];
    this.activeGuests=[];
    this.rainPool=[];
    this.activeRain=[];
    this.particlePool=[];
    this.activeParticles=[];

    this.reducedMotion=matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
  }

  async init(){
    const resolution=Math.min(devicePixelRatio||1,innerWidth<700?1.55:2);

    await this.app.init({
      resizeTo:this.mount,
      autoDensity:true,
      resolution,
      preference:['webgl'],
      preferWebGLVersion:2,
      antialias:true,
      backgroundColor:0x8fcfe2,
      powerPreference:'high-performance',
      roundPixels:false
    });

    this.mount.appendChild(this.app.canvas);

    this.app.stage.addChild(this.parallaxFar,this.parallaxNear,this.root);
    this.root.addChild(
      this.ground,
      this.pathLayer,
      this.shadowLayer,
      this.entityLayer,
      this.guestLayer,
      this.fxLayer,
      this.weatherLayer
    );

    const grade=new ColorMatrixFilter();
    grade.saturate(.10,true);
    grade.contrast(1.035,true);
    this.root.filters=[grade];

    this.buildParallax();
    this.buildTerrain();
    this.createTextures();
    this.bindCamera();
    this.centerCamera();

    this.app.ticker.maxFPS=innerWidth<700?40:60;
    this.app.ticker.add(t=>this.update(Math.min(t.elapsedMS/1000,.05)));

    return this;
  }

  buildParallax(){
    const sky=new Graphics();
    sky.rect(-2200,-1300,4400,2600).fill(0x8fcfe2);
    for(let i=0;i<11;i++){
      sky.ellipse(-1250+i*260,80+(i%3)*18,320,145)
         .fill({color:i%2?0x719e88:0x7ba58c,alpha:.82});
    }
    this.parallaxFar.addChild(sky);

    for(let i=0;i<48;i++){
      const tree=new Graphics()
        .rect(-3,0,6,34).fill(0x486b54)
        .circle(0,-5,20+(i%3)*2).fill({color:i%2?0x3f795d:0x477f62,alpha:.94});
      tree.x=-1150+i*50;
      tree.y=110+(i%5)*7;
      this.parallaxNear.addChild(tree);
    }
  }

  buildTerrain(){
    for(let y=0;y<ROWS;y++){
      for(let x=0;x<COLS;x++){
        const p=iso(x,y);
        const tile=new Graphics();
        const even=(x+y)%2===0;
        tile.poly([
          -TILE_W/2,0,
          0,-TILE_H/2,
          TILE_W/2,0,
          0,TILE_H/2
        ])
        .fill({color:even?0x73ab79:0x6ca375})
        .stroke({color:0x5e9169,width:1,alpha:.34});
        tile.position.set(p.x,p.y);
        this.ground.addChild(tile);
      }
    }

    // Main circulation spine and side avenues.
    this.drawIsoPath([[1,9],[16,9]],7,0xe4d9b7);
    this.drawIsoPath([[6,2],[6,16]],4.8,0xe4d9b7);
    this.drawIsoPath([[11,3],[11,16]],4.2,0xd9cfad);

    // Entrance plaza.
    const plaza=iso(1,9);
    const g=new Graphics()
      .ellipse(0,0,110,40).fill({color:0xded3b2})
      .ellipse(0,-1,90,30).stroke({color:0xf3ead1,width:2,alpha:.7});
    g.position.set(plaza.x,plaza.y);
    this.pathLayer.addChild(g);
  }

  drawIsoPath(points,width,color){
    const g=new Graphics();
    for(let i=0;i<points.length-1;i++){
      const a=iso(points[i][0],points[i][1]);
      const b=iso(points[i+1][0],points[i+1][1]);
      g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({
        color,width,alpha:.90
      });
    }
    this.pathLayer.addChild(g);
  }

  createTextures(){
    for(const [id,s] of Object.entries(RIDE_STYLE)){
      const art=this.makeRideTexture(id,s);
      const tex=this.app.renderer.generateTexture({target:art,resolution:2});
      art.destroy(true);
      this.textures.set(`ride:${id}`,tex);
    }

    for(const [id,s] of Object.entries(OUTLET_STYLE)){
      const art=this.makeOutletTexture(id,s);
      const tex=this.app.renderer.generateTexture({target:art,resolution:2});
      art.destroy(true);
      this.textures.set(`outlet:${id}`,tex);
    }

    const guest=new Graphics()
      .circle(0,-12,4).fill(0xd8ae8b)
      .roundRect(-4,-8,8,13,3).fill(0x3e85c5)
      .rect(-3,5,2,7).fill(0x243b4b)
      .rect(1,5,2,7).fill(0x243b4b);
    this.textures.set('guest',this.app.renderer.generateTexture({target:guest,resolution:2}));
    guest.destroy(true);

    const dust=new Graphics()
      .circle(0,0,5).fill({color:0xf0c66e,alpha:.95})
      .circle(0,0,11).fill({color:0xf0c66e,alpha:.15});
    this.textures.set('dust',this.app.renderer.generateTexture({target:dust,resolution:2}));
    dust.destroy(true);
  }

  makeIsoBlock(g,W,H,Z,body,roof){
    g.poly([-W/2,0,0,H/2,0,H/2+Z,-W/2,Z]).fill(body);
    g.poly([0,H/2,W/2,0,W/2,Z,0,H/2+Z]).fill(tint(body,-.12));
    g.poly([-W/2,0,0,-H/2,W/2,0,0,H/2]).fill(roof);
  }

  makeRideTexture(id,s){
    const g=new Graphics();
    const W=98*s.size[0],H=48*s.size[1];
    const kind=s.kind;

    if(kind==='carousel'){
      g.ellipse(0,0,86,36).fill(0xa76d45);
      g.rect(-5,-78,10,82).fill(0xd9c99f);
      for(let i=0;i<12;i++){
        const a=i/12*Math.PI*2;
        g.moveTo(0,-68).lineTo(Math.cos(a)*48,-42+Math.sin(a)*17)
          .stroke({color:i%2?s.accent:0xe9c565,width:7});
      }
      g.circle(0,-67,8).fill(0xf2d27b);
    }else if(kind==='dodgems'){
      this.makeIsoBlock(g,W,H,54,s.body,s.roof);
      g.roundRect(-W*.35,-12,W*.7,12,3).fill(s.accent);
      g.rect(-W*.42,-62,W*.84,6).fill(0xdde7eb);
    }else if(kind==='drop'){
      g.ellipse(0,4,80,30).fill(0x445b67);
      g.rect(-6,-142,12,146).fill(0x70838d);
      g.roundRect(-35,-86,70,15,6).fill(s.accent);
      g.rect(-28,-154,56,8).fill(0x344a5b);
    }else if(kind==='rapids'){
      g.ellipse(0,0,W*.72,H*.65).stroke({color:s.accent,width:22});
      g.ellipse(0,0,W*.48,H*.38).fill({color:0x518865,alpha:.55});
      g.circle(34,-10,12).fill(0xe39e37);
    }else if(kind==='dark'){
      this.makeIsoBlock(g,W,H,90,s.body,s.roof);
      g.rect(-W*.28,18,W*.18,25).fill(0xf3d469);
      g.rect(W*.08,28,W*.17,26).fill(0xe8c45f);
      g.rect(-12,42,24,48).fill(0x222536);
      g.poly([-W*.44,0,0,-H*.65,W*.44,0]).fill(0x29273b);
    }else{
      // Coaster: station + layered track silhouette.
      this.makeIsoBlock(g,W*.42,H*.48,42,s.body,s.roof);
      g.moveTo(-W*.47,-8)
       .bezierCurveTo(-W*.28,-78,-W*.04,-112,W*.10,-30)
       .bezierCurveTo(W*.20,24,W*.31,-80,W*.47,-8)
       .stroke({color:s.accent,width:id==='giga'?10:8});
      for(let i=-4;i<=4;i++){
        const x=i*W*.105;
        const yy=-7-Math.abs(i)*3;
        g.moveTo(x,3).lineTo(x,yy-28)
         .stroke({color:0x657682,width:3,alpha:.80});
      }
      g.roundRect(W*.17,-57,34,10,4).fill(0xef5c6d);
    }

    // Highlight helps procedural fallback art read at mobile size.
    g.ellipse(-W*.12,-H*.20,W*.28,H*.16).fill({color:0xffffff,alpha:.06});
    return g;
  }

  makeOutletTexture(id,s){
    const g=new Graphics();
    const W=95*s.size[0],H=46*s.size[1];
    this.makeIsoBlock(g,W,H,58,s.body,s.roof);

    g.roundRect(-W*.26,16,W*.22,23,3).fill({color:0x9edcf0,alpha:.88});
    g.roundRect(W*.07,20,W*.18,36,3).fill(0x405462);
    g.roundRect(-W*.30,45,W*.60,10,3).fill(s.accent);

    for(let i=0;i<5;i++){
      g.rect(-W*.31+i*(W*.155),-7,W*.14,8).fill(i%2?s.accent:0xf3f0df);
    }
    return g;
  }

  layoutSnapshot(snapshot){
    const items=[];
    snapshot.rides.forEach(r=>items.push({kind:'ride',data:r}));
    snapshot.outlets.forEach(o=>items.push({kind:'outlet',data:o}));

    // Deterministic layout: asset UID/type order means the same save gets
    // the same park arrangement every time without needing placement data.
    const rideSlots=[
      [3,5],[7,4],[11,5],[14,7],[3,12],[7,13],[11,12],[14,11],[8,8],[5,9]
    ];
    const outletSlots=[
      [3,8],[4,9],[7,8],[8,9],[11,8],[12,9],[6,11],[10,11]
    ];

    let ri=0,oi=0;
    return items.map(item=>{
      const slot=item.kind==='ride'
        ?rideSlots[(ri++)%rideSlots.length]
        :outletSlots[(oi++)%outletSlots.length];
      return {...item,gx:slot[0],gy:slot[1]};
    });
  }

  sync(snapshot){
    if(!snapshot)return;
    this.snapshot=snapshot;

    const layout=this.layoutSnapshot(snapshot);
    const alive=new Set();

    for(const item of layout){
      const key=`${item.kind}:${item.data.uid}`;
      alive.add(key);

      let view=this.views.get(key);
      if(!view){
        view=this.createEntityView(item);
        this.views.set(key,view);
        if(this.prevKeys.size>0)this.spawnDust(item.gx,item.gy,14);
      }
      this.updateEntityView(view,item);
    }

    for(const [key,view] of this.views){
      if(alive.has(key))continue;
      view.container.destroy({children:true});
      this.views.delete(key);
    }

    this.prevKeys=alive;
    this.syncGuests(snapshot.guestsInPark||0);
    this.syncWeather(snapshot.weather||'');
  }

  createEntityView(item){
    const container=new Container();
    container.sortableChildren=true;

    const texture=this.textures.get(`${item.kind}:${item.data.id}`);
    const shadow=new Sprite(texture);
    shadow.anchor.set(.5,1);
    shadow.tint=0x07151e;
    shadow.alpha=.20;
    shadow.scale.set(1.03,.44);
    shadow.position.set(8,14);

    const shadowWrap=new Container();
    shadowWrap.addChild(shadow);
    shadowWrap.filters=[new BlurFilter({strength:4.5,quality:2})];
    shadowWrap.zIndex=0;

    const sprite=new Sprite(texture);
    sprite.anchor.set(.5,1);
    sprite.zIndex=2;

    const ambient=new Graphics();
    ambient.zIndex=3;

    const stateOverlay=new Graphics();
    stateOverlay.zIndex=4;

    container.addChild(shadowWrap,sprite,ambient,stateOverlay);
    this.entityLayer.addChild(container);

    return{
      container,sprite,ambient,stateOverlay,
      kind:item.kind,
      id:item.data.id,
      lastKey:''
    };
  }

  updateEntityView(view,item){
    const p=iso(item.gx,item.gy);
    view.container.position.set(p.x,p.y+20);
    view.container.zIndex=(item.gx+item.gy)*100+(item.data.uid||0)*.001;

    const d=item.data;
    const stateKey=`${d.daysLeft}-${d.down}-${Math.round(d.condition||100)}`;
    if(view.lastKey===stateKey)return;
    view.lastKey=stateKey;

    view.stateOverlay.clear();

    const underConstruction=(d.daysLeft||0)>0;
    const down=!!d.down;
    const condition=d.condition??100;

    view.sprite.alpha=underConstruction?.62:down?.55:1;
    view.sprite.tint=underConstruction?0xcbd6da:down?0x9ca6ab:condition<55?0xf0c2b6:0xffffff;

    if(underConstruction){
      const w=view.kind==='ride'?105:72;
      view.stateOverlay
        .rect(-w/2,-86,w,4).fill({color:0xe5b65a,alpha:.92})
        .rect(-w/2,-40,w,4).fill({color:0xe5b65a,alpha:.92});
      for(let x=-w/2;x<=w/2;x+=26){
        view.stateOverlay.rect(x,-93,3,94).fill({color:0xbd8e3d,alpha:.88});
      }
      view.stateOverlay.roundRect(-42,7,84,8,4).fill({color:0x092332,alpha:.78});
      const totalGuess=Math.max(1,(d.daysLeft||1)+2);
      const pct=clamp(1-d.daysLeft/totalGuess,.08,.92);
      view.stateOverlay.roundRect(-40,9,80*pct,4,2).fill({color:0x58dfc0});
    }

    if(down){
      view.stateOverlay
        .roundRect(-34,-90,68,20,7).fill({color:0x992f43,alpha:.92});
    }
  }

  syncGuests(count){
    // Scaled population: visual agents represent groups rather than every guest.
    const target=clamp(Math.round(count/45),0,42);

    while(this.activeGuests.length<target){
      let s=this.guestPool.pop();
      if(!s){
        s=new Sprite(this.textures.get('guest'));
        s.anchor.set(.5,1);
        s.scale.set(.72);
      }
      s.tint=[
        0xffffff,0xc9e2ff,0xffd3da,0xd8f0c6,0xffe4b9
      ][this.activeGuests.length%5];
      this.guestLayer.addChild(s);

      const route=this.activeGuests.length%3;
      this.activeGuests.push({
        sprite:s,
        t:Math.random(),
        speed:.018+Math.random()*.015,
        route,
        bob:Math.random()*Math.PI*2
      });
    }

    while(this.activeGuests.length>target){
      const g=this.activeGuests.pop();
      g.sprite.removeFromParent();
      this.guestPool.push(g.sprite);
    }
  }

  syncWeather(name){
    const rain=/rain/i.test(name);
    const heavy=/heavy/i.test(name);
    const desired=rain?(heavy?46:24):0;

    while(this.activeRain.length<desired){
      let line=this.rainPool.pop();
      if(!line){
        line=new Graphics().moveTo(0,0).lineTo(-7,18)
          .stroke({color:0xc7e6f1,width:1,alpha:.48});
      }
      line.x=Math.random()*this.app.screen.width;
      line.y=Math.random()*this.app.screen.height;
      this.weatherLayer.addChild(line);
      this.activeRain.push({display:line,speed:300+Math.random()*230});
    }

    while(this.activeRain.length>desired){
      const r=this.activeRain.pop();
      r.display.removeFromParent();
      this.rainPool.push(r.display);
    }
  }

  spawnDust(gx,gy,count=10){
    const p=iso(gx,gy);
    for(let i=0;i<count;i++){
      let s=this.particlePool.pop();
      if(!s){
        s=new Sprite(this.textures.get('dust'));
        s.anchor.set(.5);
      }
      s.position.set(p.x+(Math.random()-.5)*45,p.y-24+(Math.random()-.5)*26);
      const sc=.3+Math.random()*.5;
      s.scale.set(sc);
      s.alpha=.85;
      this.fxLayer.addChild(s);
      this.activeParticles.push({
        display:s,
        life:.6+Math.random()*.5,
        vx:(Math.random()-.5)*55,
        vy:-25-Math.random()*38
      });
    }
  }

  bindCamera(){
    const canvas=this.app.canvas;
    const c=this.camera;
    const pointers=new Map();

    canvas.addEventListener('pointerdown',e=>{
      canvas.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      c.dragging=true;
      c.lastX=e.clientX;
      c.lastY=e.clientY;
      c.dragDistance=0;

      if(pointers.size===2){
        const p=[...pointers.values()];
        c.pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
      }
    },{passive:false});

    canvas.addEventListener('pointermove',e=>{
      if(!pointers.has(e.pointerId))return;
      pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

      if(pointers.size===2){
        const p=[...pointers.values()];
        const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
        if(c.pinchDistance){
          c.targetZoom=clamp(c.targetZoom*(dist/c.pinchDistance),.52,1.55);
        }
        c.pinchDistance=dist;
        return;
      }

      if(!c.dragging)return;
      const dx=e.clientX-c.lastX;
      const dy=e.clientY-c.lastY;
      c.lastX=e.clientX;
      c.lastY=e.clientY;
      c.dragDistance+=Math.hypot(dx,dy);
      c.targetX+=dx;
      c.targetY+=dy;
      c.vx=dx*25;
      c.vy=dy*25;
    },{passive:false});

    const release=e=>{
      pointers.delete(e.pointerId);
      c.dragging=pointers.size>0;
      c.pinchDistance=0;
    };

    canvas.addEventListener('pointerup',release);
    canvas.addEventListener('pointercancel',release);

    canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      const down=Math.sign(e.deltaY)>0;
      c.targetZoom=clamp(c.targetZoom*(down?.90:1.11),.52,1.55);
      c.zoomVelocity+=down?-.05:.05;
    },{passive:false});
  }

  centerCamera(){
    const p=iso(8.5,8.5);
    this.camera.x=this.camera.targetX=this.app.screen.width/2-p.x;
    this.camera.y=this.camera.targetY=this.app.screen.height*.36-p.y;
  }

  updateCamera(dt){
    const c=this.camera;

    if(!c.dragging){
      c.targetX+=c.vx*dt;
      c.targetY+=c.vy*dt;
      c.vx*=Math.pow(.86,dt*60);
      c.vy*=Math.pow(.86,dt*60);
    }

    c.targetZoom=clamp(c.targetZoom+c.zoomVelocity,.52,1.55);
    c.zoomVelocity*=Math.pow(.82,dt*60);

    c.x+=(c.targetX-c.x)*(1-Math.pow(.0005,dt));
    c.y+=(c.targetY-c.y)*(1-Math.pow(.0005,dt));
    c.zoom+=(c.targetZoom-c.zoom)*(1-Math.pow(.001,dt));

    this.root.position.set(c.x,c.y);
    this.root.scale.set(c.zoom);

    this.parallaxFar.position.set(c.x*.04,c.y*.018);
    this.parallaxNear.position.set(c.x*.085,c.y*.035);
  }

  updateEntityAnimation(time){
    for(const view of this.views.values()){
      view.ambient.clear();
      const d=[...this.views.entries()].find(([,v])=>v===view)?.[0];
      if(!d)continue;

      if(view.kind==='ride'){
        const style=RIDE_STYLE[view.id];
        if(!style)continue;

        if(style.kind==='carousel'){
          for(let i=0;i<7;i++){
            const a=time*.8+i/7*Math.PI*2;
            view.ambient.circle(Math.cos(a)*31,-41+Math.sin(a)*10,3)
              .fill({color:i%2?0xf0c55a:0x53c9b5});
          }
        }else if(style.kind==='drop'){
          const y=-38-(Math.sin(time*.8)+1)*31;
          view.ambient.roundRect(-27,y,54,9,4).fill({color:style.accent,alpha:.95});
        }else if(style.kind==='coaster'){
          const t=(time*.14)%1;
          const x=-52+t*104;
          const y=-43-Math.sin(t*Math.PI)*35;
          view.ambient.roundRect(x-9,y-4,18,8,3)
            .fill({color:0xf05d70,alpha:.98});
        }else if(style.kind==='rapids'){
          const a=time*.6;
          view.ambient.circle(Math.cos(a)*34,-4+Math.sin(a)*15,8)
            .fill({color:0xe49a35,alpha:.98});
        }
      }
    }
  }

  updateGuests(dt,time){
    const routes=[
      [[1,9],[16,9]],
      [[6,3],[6,15]],
      [[11,4],[11,15]]
    ];

    for(const g of this.activeGuests){
      g.t=(g.t+g.speed*dt*30)%1;
      const route=routes[g.route];
      const a=iso(route[0][0],route[0][1]);
      const b=iso(route[1][0],route[1][1]);
      const x=lerp(a.x,b.x,g.t);
      const y=lerp(a.y,b.y,g.t);
      g.sprite.position.set(x,y+Math.sin(time*4+g.bob)*1.4);
      g.sprite.zIndex=Math.round((y+4000)*10);
    }
    this.guestLayer.sortableChildren=true;
  }

  updateParticles(dt){
    for(let i=this.activeParticles.length-1;i>=0;i--){
      const p=this.activeParticles[i];
      p.life-=dt;
      p.display.x+=p.vx*dt;
      p.display.y+=p.vy*dt;
      p.display.alpha=clamp(p.life/.65,0,1);
      p.display.scale.x*=.996;
      p.display.scale.y*=.996;

      if(p.life<=0){
        p.display.removeFromParent();
        this.particlePool.push(p.display);
        this.activeParticles.splice(i,1);
      }
    }
  }

  updateWeather(dt){
    for(const r of this.activeRain){
      r.display.y+=r.speed*dt;
      r.display.x-=r.speed*.22*dt;
      if(r.display.y>this.app.screen.height+30){
        r.display.y=-30;
        r.display.x=Math.random()*this.app.screen.width;
      }
    }
  }

  cull(){
    const scale=this.camera.zoom;
    const margin=260;

    for(const v of this.views.values()){
      const sx=v.container.x*scale+this.camera.x;
      const sy=v.container.y*scale+this.camera.y;
      v.container.renderable=
        sx>-margin&&sx<this.app.screen.width+margin&&
        sy>-margin&&sy<this.app.screen.height+margin;
    }
  }

  update(dt){
    const time=performance.now()/1000;
    this.updateCamera(dt);
    this.updateEntityAnimation(this.reducedMotion?0:time);
    this.updateGuests(dt,time);
    this.updateParticles(dt);
    this.updateWeather(dt);
    this.cull();
  }
}

function tint(hex,amount){
  let r=(hex>>16)&255,g=(hex>>8)&255,b=hex&255;
  if(amount>=0){
    r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount;
  }else{
    r*=1+amount;g*=1+amount;b*=1+amount;
  }
  return(Math.round(r)<<16)|(Math.round(g)<<8)|Math.round(b);
}

let world=null;
let latest=null;

async function boot(){
  const mount=document.getElementById('pixiParkMount');
  if(!mount)return;

  world=new ParkWorld(mount);
  await world.init();

  latest=window.ParkEmpireWorldBridge?.snapshot?.()||latest;
  if(latest)world.sync(latest);

  window.ParkEmpirePixiWorld={
    sync(snapshot){
      latest=snapshot;
      world?.sync(snapshot);
    },
    recenter(){
      world?.centerCamera();
    },
    version:PIXI_VERSION
  };
}

window.ParkEmpirePixiWorld={
  sync(snapshot){latest=snapshot;},
  recenter(){},
  version:PIXI_VERSION
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
