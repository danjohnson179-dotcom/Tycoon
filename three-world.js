import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createPostFX, ParticlePool, WeatherParticles } from './three-effects.js';
import { ParkEnvironment } from './three-environment.js';
import {
  createRideAsset,
  createOutlet,
  applyAssetState,
  updateRide
} from './three-rides.js';

/*
  Park Empire v1.06.0 — Three.js premium park world
  ==================================================

  Integration boundary:
    window.ParkEmpireWorldBridge.snapshot() <- business simulation
    window.ParkEmpireThreeWorld.sync(snapshot) <- rendering

  The renderer never modifies cash, rides, guests, finance, difficulty or save
  data. It visualises the authoritative state coming from game.js.

  Static-hosting model:
    - ES modules
    - pinned Three.js CDN import map in index.html
    - no backend
    - no build step required
*/

const MOBILE=matchMedia('(max-width: 760px)').matches;
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

const RIDE_SLOTS=[
  [-12,-7],[-5,-10],[4,-10],[12,-7],
  [-12,6],[-4,9],[5,9],[12,6],
  [-14,0],[14,0]
];

const OUTLET_SLOTS=[
  [-12,-1],[-9,2],[-5,-2],[-1,2],
  [4,-2],[8,2],[11,-1],[-1,-8],
  [1,7],[8,-7]
];

function assetKey(kind,uid){return`${kind}:${uid}`}

class ThreeParkWorld{
  constructor(mount){
    this.mount=mount;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color(0x91cfe2);
    this.scene.fog=new THREE.FogExp2(0xaad6df,.009);

    this.renderer=null;
    this.camera=null;
    this.controls=null;
    this.environment=null;
    this.fx=null;
    this.weather=null;
    this.post=null;

    this.assetRoot=new THREE.Group();
    this.assetRoot.name='ParkAssets';
    this.scene.add(this.assetRoot);

    this.assetViews=new Map();
    this.snapshot=null;
    this.previousState=new Map();

    this.clock=new THREE.Clock();
    this.frame=0;
    this.lastSize={w:0,h:0};

    this.parkLighting=[];
  }

  async init(){
    this.renderer=new THREE.WebGLRenderer({
      antialias:!MOBILE,
      alpha:false,
      powerPreference:'high-performance',
      stencil:false,
      depth:true
    });

    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,MOBILE?1.35:1.8));
    this.renderer.setSize(this.mount.clientWidth,this.mount.clientHeight,false);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.04;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    this.mount.appendChild(this.renderer.domElement);

    this.createCamera();
    this.environment=new ParkEnvironment(this.scene);
    this.fx=new ParticlePool(this.scene,MOBILE?100:180);
    this.weather=new WeatherParticles(this.scene,MOBILE?430:850);
    this.createParkLighting();
    this.createEntrance();
    this.createContactShadowReceiver();

    this.post=createPostFX(this.renderer,this.scene,this.camera,{mobile:MOBILE});

    this.bindResize();
    this.animate();

    return this;
  }

  createCamera(){
    const aspect=Math.max(.5,this.mount.clientWidth/Math.max(1,this.mount.clientHeight));
    const frustum=MOBILE?34:30;

    this.camera=new THREE.OrthographicCamera(
      -frustum*aspect/2,
      frustum*aspect/2,
      frustum/2,
      -frustum/2,
      .1,
      180
    );

    // Fixed isometric direction. OrbitControls handles smooth pan/zoom only.
    this.camera.position.set(31,31,31);
    this.camera.lookAt(0,0,0);

    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableRotate=false;
    this.controls.enableDamping=true;
    this.controls.dampingFactor=.075;
    this.controls.enablePan=true;
    this.controls.screenSpacePanning=true;
    this.controls.panSpeed=.72;
    this.controls.zoomSpeed=.78;
    this.controls.minZoom=.55;
    this.controls.maxZoom=1.65;
    this.controls.target.set(0,0,0);
    this.controls.update();
  }

  createContactShadowReceiver(){
    // Transparent-ish receiver beneath central park area helps soften contact.
    const mat=new THREE.ShadowMaterial({
      color:0x17301f,
      opacity:.17,
      transparent:true
    });
    const plane=new THREE.Mesh(new THREE.PlaneGeometry(55,55),mat);
    plane.rotation.x=-Math.PI/2;
    plane.position.y=.105;
    plane.receiveShadow=true;
    this.scene.add(plane);
  }

  createParkLighting(){
    // Decorative park lights become visible naturally at night.
    const bulbGeo=new THREE.SphereGeometry(.10,8,6);
    const bulbMat=new THREE.MeshStandardMaterial({
      color:0xffdf8b,
      emissive:0xffb637,
      emissiveIntensity:0,
      roughness:.3
    });

    const poleMat=new THREE.MeshStandardMaterial({
      color:0x344957,roughness:.5,metalness:.55
    });

    const positions=[];
    for(let x=-20;x<=20;x+=4.5){
      positions.push([x,-1.8],[x,1.8]);
    }
    for(let z=-18;z<=18;z+=4.5){
      positions.push([-9.7,z],[9.7,z]);
    }

    for(const [x,z] of positions){
      const g=new THREE.Group();
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,2.15,6),poleMat);
      pole.position.y=1.08;
      pole.castShadow=true;
      g.add(pole);

      const bulb=new THREE.Mesh(bulbGeo,bulbMat.clone());
      bulb.position.y=2.18;
      g.add(bulb);

      const point=new THREE.PointLight(0xffc66b,0,4.8,2);
      point.position.y=2.15;
      g.add(point);

      g.position.set(x,.12,z);
      this.scene.add(g);
      this.parkLighting.push({group:g,bulb,point});
    }
  }

  createEntrance(){
    const g=new THREE.Group();

    const stone=new THREE.MeshStandardMaterial({
      color:0xd6d0bf,roughness:.84,metalness:.02
    });
    const metal=new THREE.MeshStandardMaterial({
      color:0x2e536a,roughness:.42,metalness:.48
    });
    const signMat=new THREE.MeshStandardMaterial({
      color:0x2f83df,
      roughness:.3,
      metalness:.18,
      emissive:0x174fa1,
      emissiveIntensity:.55
    });

    for(const x of [-2.4,2.4]){
      const pier=new THREE.Mesh(new THREE.BoxGeometry(.8,3.0,.8),stone);
      pier.position.set(x,1.6,0);
      pier.castShadow=true; pier.receiveShadow=true;
      g.add(pier);
    }

    const beam=new THREE.Mesh(new THREE.BoxGeometry(5.6,.55,.65),metal);
    beam.position.y=3.0;
    beam.castShadow=true;
    g.add(beam);

    const sign=new THREE.Mesh(new THREE.BoxGeometry(3.8,.72,.18),signMat);
    sign.position.set(0,3.05,-.42);
    g.add(sign);

    for(let i=-2;i<=2;i++){
      const gate=new THREE.Mesh(new THREE.BoxGeometry(.07,1.45,.5),metal);
      gate.position.set(i*.9,.8,.4);
      g.add(gate);
    }

    g.position.set(-20,.1,0);
    g.rotation.y=Math.PI/2;
    this.scene.add(g);
  }

  layoutSnapshot(snapshot){
    const list=[];
    snapshot.rides.forEach((r,i)=>{
      const p=RIDE_SLOTS[i%RIDE_SLOTS.length];
      list.push({kind:'ride',data:r,x:p[0],z:p[1]});
    });
    snapshot.outlets.forEach((o,i)=>{
      const p=OUTLET_SLOTS[i%OUTLET_SLOTS.length];
      list.push({kind:'outlet',data:o,x:p[0],z:p[1]});
    });
    return list;
  }

  createConstructionScaffold(size=5){
    const g=new THREE.Group();
    const mat=new THREE.MeshStandardMaterial({
      color:0xd3a64a,roughness:.7,metalness:.35
    });

    const w=size,h=4.4;
    for(const x of [-w/2,w/2]){
      for(const z of [-w/2,w/2]){
        const p=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,h,5),mat);
        p.position.set(x,h/2,z);
        p.castShadow=true;
        g.add(p);
      }
    }

    for(const y of [1.2,2.4,3.6]){
      for(const z of [-w/2,w/2]){
        const bar=new THREE.Mesh(new THREE.BoxGeometry(w+.1,.06,.06),mat);
        bar.position.set(0,y,z);
        g.add(bar);
      }
      for(const x of [-w/2,w/2]){
        const bar=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,w+.1),mat);
        bar.position.set(x,y,0);
        g.add(bar);
      }
    }

    const tarp=new THREE.Mesh(
      new THREE.PlaneGeometry(w*.82,1.0),
      new THREE.MeshStandardMaterial({
        color:0x2b83c7,roughness:.78,transparent:true,opacity:.76,
        side:THREE.DoubleSide
      })
    );
    tarp.position.set(0,2.6,-w/2-.04);
    g.add(tarp);

    return g;
  }

  createContactBlob(radius=3){
    const geo=new THREE.CircleGeometry(radius,24);
    const mat=new THREE.MeshBasicMaterial({
      color:0x163120,
      transparent:true,
      opacity:.13,
      depthWrite:false
    });
    const m=new THREE.Mesh(geo,mat);
    m.rotation.x=-Math.PI/2;
    m.position.y=.13;
    return m;
  }

  createAssetView(item){
    const root=new THREE.Group();
    root.position.set(item.x,.12,item.z);
    root.userData.key=assetKey(item.kind,item.data.uid);

    const visual=item.kind==='ride'
      ?createRideAsset(item.data.id)
      :createOutlet(item.data.id);

    visual.userData.assetId=item.data.id;
    root.add(visual);

    const blob=this.createContactBlob(item.kind==='ride'?3.1:1.8);
    root.add(blob);

    let scaffold=null;
    if((item.data.daysLeft||0)>0){
      scaffold=this.createConstructionScaffold(item.kind==='ride'?6:3.4);
      root.add(scaffold);
    }

    root.traverse(o=>{
      if(o.isMesh){
        o.castShadow=true;
        o.receiveShadow=true;
      }
    });

    this.assetRoot.add(root);

    const view={
      root,visual,blob,scaffold,
      item,
      lastState:'',
      createdAt:performance.now()/1000
    };

    this.assetViews.set(root.userData.key,view);

    this.fx.emit(root.position.clone().add(new THREE.Vector3(0,1,0)),{
      count:MOBILE?8:14,
      color:0xf2c769,
      emissive:0x5f4300,
      spread:2.4,
      speed:3.0,
      life:.85
    });

    return view;
  }

  updateAssetView(view,item){
    view.item=item;
    view.root.position.set(item.x,.12,item.z);

    const d=item.data;
    const stateKey=`${d.daysLeft||0}-${!!d.down}-${Math.round(d.condition??100)}`;
    if(view.lastState===stateKey)return;

    const prev=view.lastState;
    view.lastState=stateKey;

    applyAssetState(view.visual,d);

    const building=(d.daysLeft||0)>0;
    if(building&&!view.scaffold){
      view.scaffold=this.createConstructionScaffold(item.kind==='ride'?6:3.4);
      view.root.add(view.scaffold);
    }
    if(!building&&view.scaffold){
      view.scaffold.removeFromParent();
      view.scaffold.traverse(o=>{
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      view.scaffold=null;

      if(prev){
        const burstPos=view.root.position.clone().add(new THREE.Vector3(0,1.5,0));
        // Opening celebration: three small pooled bursts read as confetti
        // without needing a separate emitter or extra draw-heavy system.
        this.fx.emit(burstPos,{count:MOBILE?6:10,color:0x67e1c2,emissive:0x145b49,spread:3.2,speed:4.4,life:1.1});
        this.fx.emit(burstPos,{count:MOBILE?5:9,color:0xffcf62,emissive:0x5d3d00,spread:3.2,speed:4.1,life:1.0});
        this.fx.emit(burstPos,{count:MOBILE?5:9,color:0xef6680,emissive:0x64162b,spread:3.2,speed:4.3,life:1.05});
      }
    }

    // Down rides visibly desaturate and emit occasional service sparks.
    view.root.userData.down=!!d.down;
    view.root.userData.building=building;
  }

  sync(snapshot){
    if(!snapshot)return;
    this.snapshot=snapshot;

    const layout=this.layoutSnapshot(snapshot);
    const alive=new Set();

    for(const item of layout){
      const key=assetKey(item.kind,item.data.uid);
      alive.add(key);
      const view=this.assetViews.get(key)||this.createAssetView(item);
      this.updateAssetView(view,item);
    }

    for(const [key,view] of this.assetViews){
      if(alive.has(key))continue;
      this.disposeObject(view.root);
      view.root.removeFromParent();
      this.assetViews.delete(key);
    }

    this.environment.setGuestPopulation(snapshot.guestsInPark||0);
    this.weather.setWeather(snapshot.weather||'');
  }

  disposeObject(root){
    root.traverse(o=>{
      o.geometry?.dispose?.();
      if(Array.isArray(o.material))o.material.forEach(m=>{
        // Keep shared base materials attached via userData from state changes.
        if(!m.userData?.shared)m.dispose?.();
      });
      else o.material?.dispose?.();
    });
  }

  dayFraction(){
    if(!this.snapshot)return .22;
    const total=Math.max(1,this.snapshot.totalTicks||1);
    const t=THREE.MathUtils.clamp((this.snapshot.liveTick||0)/total,0,1);
    // Compress a full sunrise -> night lighting arc into the trading day.
    // This is visual time only; authoritative business time remains in game.js.
    return .13+t*.84;
  }

  updateRideAnimations(dt,time){
    for(const view of this.assetViews.values()){
      if(view.item.kind!=='ride')continue;

      const d=view.item.data;
      const active=(d.daysLeft||0)<=0&&!d.down;
      const activity=active?(this.snapshot?.running?1:.28):0;

      updateRide(
        view.visual,
        d.id,
        REDUCED?0:time,
        REDUCED?0:dt,
        activity
      );

      // Small service sparks on broken rides.
      if(d.down&&!REDUCED&&Math.random()<dt*.65){
        this.fx.emit(view.root.position.clone().add(new THREE.Vector3(0,1.2,0)),{
          count:3,
          color:0xff9f52,
          emissive:0xff4d16,
          spread:.7,
          speed:2.2,
          life:.42,
          gravity:4
        });
      }

      // Water spray on rapids.
      if(d.id==='rapids'&&active&&!REDUCED&&Math.random()<dt*.85){
        this.fx.emit(view.root.position.clone().add(new THREE.Vector3(0,.7,0)),{
          count:2,
          color:0xaeefff,
          emissive:0x0e4b61,
          spread:1.2,
          speed:1.8,
          life:.55,
          gravity:4.8,
          size:.65
        });
      }
    }
  }

  updateNightLights(fraction){
    const darkness=1-THREE.MathUtils.smoothstep(
      Math.sin(fraction*Math.PI),
      .08,.62
    );

    for(let i=0;i<this.parkLighting.length;i++){
      const l=this.parkLighting[i];
      const sparkle=.88+Math.sin(performance.now()*.0017+i)*.12;
      l.bulb.material.emissiveIntensity=darkness*3.4*sparkle;
      l.point.intensity=darkness*(MOBILE?.18:.34);
    }

    // Attraction emissive components are already present; exposure shift makes
    // them increasingly prominent after sunset.
    this.renderer.toneMappingExposure=THREE.MathUtils.lerp(.82,1.08,1-darkness*.48);
  }

  update(dt,time){
    if(!this.snapshot)return;

    this.controls.update();

    const f=this.dayFraction();
    this.environment.updateDayNight(f,this.snapshot.weather||'');
    this.environment.update(dt,time);
    this.updateRideAnimations(dt,time);
    this.updateNightLights(f);

    this.fx.update(dt);
    this.weather.update(dt,this.controls.target);

    this.frame++;
  }

  render(){
    this.post.render();
  }

  animate(){
    const loop=()=>{
      const dt=Math.min(this.clock.getDelta(),.05);
      const time=this.clock.elapsedTime;

      this.resizeIfNeeded();
      this.update(dt,time);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resizeIfNeeded(){
    const w=this.mount.clientWidth;
    const h=this.mount.clientHeight;
    if(w===this.lastSize.w&&h===this.lastSize.h)return;
    this.lastSize={w,h};

    const aspect=w/Math.max(1,h);
    const frustum=MOBILE?34:30;
    this.camera.left=-frustum*aspect/2;
    this.camera.right=frustum*aspect/2;
    this.camera.top=frustum/2;
    this.camera.bottom=-frustum/2;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w,h,false);
    this.post.resize(w,h);
  }

  bindResize(){
    const ro=new ResizeObserver(()=>this.resizeIfNeeded());
    ro.observe(this.mount);
    this.resizeObserver=ro;
  }

  recenter(){
    this.controls.target.set(0,0,0);
    this.camera.position.set(31,31,31);
    this.camera.zoom=1;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  dispose(){
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.post?.dispose();
    this.fx?.dispose();
    this.weather?.dispose();
    this.environment?.dispose();

    this.scene.traverse(o=>{
      o.geometry?.dispose?.();
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
      else o.material?.dispose?.();
    });

    this.renderer?.dispose();
    this.renderer?.domElement?.remove();
  }
}

let world=null;
let pendingSnapshot=null;

async function boot(){
  const mount=document.getElementById('threeParkMount');
  if(!mount)return;

  try{
    world=new ThreeParkWorld(mount);
    await world.init();

    const initial=
      pendingSnapshot||
      window.ParkEmpireWorldBridge?.snapshot?.();

    if(initial)world.sync(initial);

    window.ParkEmpireThreeWorld={
      sync(snapshot){
        pendingSnapshot=snapshot;
        world?.sync(snapshot);
      },
      recenter(){world?.recenter()},
      renderer:'Three.js r185 / WebGL'
    };
  }catch(err){
    console.error('Three.js park world failed to initialise',err);
    mount.innerHTML=
      '<div style="display:grid;place-items:center;height:100%;padding:20px;color:#d7e8f0;font:12px system-ui;text-align:center">WebGL park view could not initialise on this device. The business simulation remains available.</div>';
  }
}

// Stub exists before async initialization so game.js can safely sync.
window.ParkEmpireThreeWorld={
  sync(snapshot){pendingSnapshot=snapshot},
  recenter(){},
  renderer:'Three.js r185 / WebGL'
};

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot,{once:true});
}else{
  boot();
}
