import * as THREE from 'three';

/*
  Attraction factory for the live Park Empire save.

  The procedural models are deliberately richer than primitive placeholders:
  PBR materials, layered geometry, emissive lighting, moving subassemblies,
  smooth coaster TubeGeometry rails and ride-specific animation.

  Swap path:
  Each factory returns a regular THREE.Group. A future glTF asset can replace
  the procedural internals without changing three-world.js or game.js.
*/

const UP=new THREE.Vector3(0,1,0);

function mat(color,{
  roughness=.58,
  metalness=.16,
  emissive=0x000000,
  emissiveIntensity=0,
  transparent=false,
  opacity=1
}={}){
  return new THREE.MeshStandardMaterial({
    color,roughness,metalness,emissive,emissiveIntensity,transparent,opacity
  });
}

function physical(color,{
  roughness=.38,metalness=.12,clearcoat=.45,clearcoatRoughness=.28,
  emissive=0x000000,emissiveIntensity=0
}={}){
  return new THREE.MeshPhysicalMaterial({
    color,roughness,metalness,clearcoat,clearcoatRoughness,
    emissive,emissiveIntensity
  });
}

function shadowify(object){
  object.traverse(o=>{
    if(o.isMesh){
      o.castShadow=true;
      o.receiveShadow=true;
    }
  });
  return object;
}

function addBulb(group,pos,color=0xffd66b,scale=.11){
  const bulb=new THREE.Mesh(
    new THREE.SphereGeometry(scale,8,6),
    mat(color,{roughness:.3,metalness:.05,emissive:color,emissiveIntensity:2.6})
  );
  bulb.position.copy(pos);
  group.add(bulb);
  return bulb;
}

function createFoundation(w,d,color=0x65727a){
  const g=new THREE.Group();
  const slab=new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(w,d)*.62,Math.max(w,d)*.68,.25,8),
    mat(color,{roughness:.92,metalness:.02})
  );
  slab.position.y=.12;
  g.add(slab);
  return g;
}

export function createCarousel(){
  const root=createFoundation(5.8,5.8,0x68736b);
  root.userData.kind='carousel';

  const turntable=new THREE.Group();
  turntable.position.y=.28;
  root.add(turntable);
  root.userData.rotor=turntable;

  const deck=new THREE.Mesh(
    new THREE.CylinderGeometry(2.85,2.9,.32,32),
    physical(0xa86c42,{roughness:.48,clearcoat:.4})
  );
  deck.position.y=.18;
  turntable.add(deck);

  const poleMat=mat(0xe1c98f,{roughness:.34,metalness:.48});
  const centerPole=new THREE.Mesh(new THREE.CylinderGeometry(.12,.17,4.6,12),poleMat);
  centerPole.position.y=2.4;
  turntable.add(centerPole);

  // Conical fabric roof.
  const roof=new THREE.Mesh(
    new THREE.ConeGeometry(3.25,1.55,36,1,true),
    physical(0xc94a5b,{roughness:.42,clearcoat:.35})
  );
  roof.position.y=4.65;
  turntable.add(roof);

  const crown=new THREE.Mesh(
    new THREE.SphereGeometry(.28,12,8),
    mat(0xffd16c,{roughness:.25,metalness:.55,emissive:0xffaa33,emissiveIntensity:.5})
  );
  crown.position.y=5.46;
  turntable.add(crown);

  const horses=[];
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    const hg=new THREE.Group();
    hg.position.set(Math.cos(a)*2.05,1.35,Math.sin(a)*2.05);
    hg.rotation.y=-a+Math.PI/2;

    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,3.0,8),poleMat);
    pole.position.y=1.1;
    hg.add(pole);

    const body=new THREE.Mesh(
      new THREE.CapsuleGeometry(.18,.58,4,8),
      physical(i%2?0xf2e2c3:0xded7ce,{roughness:.55,clearcoat:.18})
    );
    body.rotation.z=Math.PI/2;
    body.position.set(0,.55,0);
    body.scale.set(1.25,.8,.72);
    hg.add(body);

    const head=new THREE.Mesh(
      new THREE.SphereGeometry(.17,10,8),
      mat(i%2?0xf2e2c3:0xded7ce,{roughness:.64})
    );
    head.position.set(.38,.72,0);
    hg.add(head);

    const saddle=new THREE.Mesh(
      new THREE.BoxGeometry(.26,.12,.35),
      mat(i%3===0?0x397fc0:i%3===1?0xb74e61:0xd5a63e,{roughness:.48})
    );
    saddle.position.set(-.05,.75,0);
    hg.add(saddle);

    // Four slim legs.
    for(const sx of [-.18,.18]){
      for(const sz of [-.10,.10]){
        const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.48,6),body.material);
        leg.position.set(sx,.20,sz);
        leg.rotation.z=sx>0?.28:-.28;
        hg.add(leg);
      }
    }

    turntable.add(hg);
    horses.push(hg);
  }
  root.userData.horses=horses;

  // Ring of emissive bulbs.
  const bulbs=[];
  for(let i=0;i<28;i++){
    const a=i/28*Math.PI*2;
    bulbs.push(addBulb(turntable,new THREE.Vector3(Math.cos(a)*2.9,4.15,Math.sin(a)*2.9),i%2?0xffd366:0xfff1ae,.075));
  }
  root.userData.bulbs=bulbs;

  return shadowify(root);
}

function coasterCurve(scale=1,height=1){
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5,.6,-2.3),
    new THREE.Vector3(-3.9,2.7*height,-2.2),
    new THREE.Vector3(-2.2,5.6*height,-1.7),
    new THREE.Vector3(-.6,2.0*height,-.6),
    new THREE.Vector3(1.2,4.0*height,.2),
    new THREE.Vector3(3.5,1.7*height,1.3),
    new THREE.Vector3(5.1,1.0,2.6),
    new THREE.Vector3(3.5,.65,4.1),
    new THREE.Vector3(.2,1.1,3.9),
    new THREE.Vector3(-3,1.75,2.5),
    new THREE.Vector3(-5,.7,.4)
  ].map(v=>v.multiplyScalar(scale)),true,'catmullrom',.25);
}

function createTrackGroup({accent=0x2f87e0,support=0x63717c,scale=1,height=1,wood=false}={}){
  const group=new THREE.Group();
  const curve=coasterCurve(scale,height);

  const detailed=new THREE.Group();
  const simple=new THREE.Group();

  const railMat=physical(accent,{roughness:wood?.72:.38,metalness:wood?.08:.48,clearcoat:wood?.08:.38});
  const supportMat=mat(support,{roughness:.62,metalness:wood?.05:.48});

  // Twin smooth rails.
  const railA=new THREE.Mesh(new THREE.TubeGeometry(curve,170,.075*scale,7,true),railMat);
  const railB=new THREE.Mesh(new THREE.TubeGeometry(curve,170,.075*scale,7,true),railMat);
  railA.position.y=.08;
  railB.position.y=-.08;
  detailed.add(railA,railB);

  // Far LOD single centerline.
  const simpleRail=new THREE.Mesh(new THREE.TubeGeometry(curve,65,.10*scale,5,true),railMat);
  simple.add(simpleRail);

  // Supports + ties sampled along curve.
  const tieGeo=new THREE.BoxGeometry(.62*scale,.08*scale,.09*scale);
  const tieMat=mat(wood?0x744a34:0x4d5962,{roughness:.72,metalness:wood?.02:.35});
  const supportGeo=new THREE.CylinderGeometry(.035*scale,.06*scale,1,6);

  for(let i=0;i<58;i++){
    const t=i/58;
    const p=curve.getPointAt(t);
    const tangent=curve.getTangentAt(t).normalize();
    const side=new THREE.Vector3().crossVectors(UP,tangent).normalize();

    const tie=new THREE.Mesh(tieGeo,tieMat);
    tie.position.copy(p);
    tie.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),side);
    detailed.add(tie);

    if(i%3===0&&p.y>.45){
      const h=p.y-.08;
      const supportMesh=new THREE.Mesh(supportGeo,supportMat);
      supportMesh.scale.y=h;
      supportMesh.position.set(p.x,h/2,p.z);
      detailed.add(supportMesh);

      if(wood){
        const brace1=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,Math.max(.4,h*1.05),5),supportMat);
        brace1.position.set(p.x+.22,h*.48,p.z);
        brace1.rotation.z=.22;
        detailed.add(brace1);
      }
    }
  }

  const lod=new THREE.LOD();
  lod.addLevel(detailed,0);
  lod.addLevel(simple,33);
  group.add(lod);

  // Compact station.
  const station=new THREE.Group();
  const platform=new THREE.Mesh(
    new THREE.BoxGeometry(3.4*scale,.28*scale,1.5*scale),
    mat(0x5f6870,{roughness:.82})
  );
  platform.position.set(-4.6*scale,.3*scale,-2.25*scale);
  station.add(platform);

  const roof=new THREE.Mesh(
    new THREE.BoxGeometry(3.6*scale,.14*scale,1.8*scale),
    physical(wood?0x674536:0x354f66,{roughness:.55,metalness:.18})
  );
  roof.position.set(-4.6*scale,1.65*scale,-2.25*scale);
  station.add(roof);

  for(const x of [-5.9,-3.3]){
    for(const z of [-2.8,-1.7]){
      const post=new THREE.Mesh(
        new THREE.CylinderGeometry(.04,.05,1.5,7),
        supportMat
      );
      post.position.set(x*scale,.9*scale,z*scale);
      station.add(post);
    }
  }
  group.add(station);

  // Animated train: 4 PBR cars.
  const train=new THREE.Group();
  for(let c=0;c<4;c++){
    const car=new THREE.Group();

    const chassis=new THREE.Mesh(
      new THREE.BoxGeometry(.58*scale,.23*scale,.42*scale),
      physical(c%2?0xe65368:0xf0b444,{roughness:.35,metalness:.25,clearcoat:.6})
    );
    car.add(chassis);

    const seat=new THREE.Mesh(
      new THREE.BoxGeometry(.34*scale,.22*scale,.34*scale),
      mat(0x273542,{roughness:.65,metalness:.08})
    );
    seat.position.y=.18*scale;
    car.add(seat);

    train.add(car);
  }
  group.add(train);

  group.userData.curve=curve;
  group.userData.train=train;
  group.userData.rideKind='coaster';
  group.userData.trainOffset=Math.random();

  return shadowify(group);
}

export function createCoaster(id='launch'){
  const configs={
    woodie:{accent:0x8a4e34,support:0x765d46,scale:.92,height:.92,wood:true},
    launch:{accent:0x2a86df,support:0x596d7c,scale:1,height:1,wood:false},
    invert:{accent:0x6753bb,support:0x5d6975,scale:1.03,height:1.05,wood:false},
    hyper:{accent:0xe06a36,support:0x64737e,scale:1.16,height:1.24,wood:false},
    giga:{accent:0x244f91,support:0x566a7b,scale:1.30,height:1.42,wood:false}
  };
  return createTrackGroup(configs[id]||configs.launch);
}

export function createFerrisWheel(){
  const root=createFoundation(6.2,6.2,0x69767c);
  root.userData.kind='ferris';

  const supportMat=mat(0x596a75,{roughness:.55,metalness:.55});
  const wheelMat=physical(0x418ed1,{roughness:.36,metalness:.48,clearcoat:.4});

  for(const sx of [-1,1]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.10,.15,5.5,8),supportMat);
    leg.position.set(sx*1.25,2.65,0);
    leg.rotation.z=sx*.24;
    root.add(leg);
  }

  const rotor=new THREE.Group();
  rotor.position.y=4.75;
  root.add(rotor);
  root.userData.rotor=rotor;

  const rim=new THREE.Mesh(new THREE.TorusGeometry(3.45,.095,10,64),wheelMat);
  rotor.add(rim);

  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.55,16),supportMat);
  hub.rotation.x=Math.PI/2;
  rotor.add(hub);

  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2;
    const spoke=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,3.4,5),supportMat);
    spoke.position.set(Math.cos(a)*1.7,Math.sin(a)*1.7,0);
    spoke.rotation.z=-a+Math.PI/2;
    rotor.add(spoke);
  }

  const cabins=[];
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    const pivot=new THREE.Group();
    pivot.position.set(Math.cos(a)*3.45,Math.sin(a)*3.45,0);

    const cabin=new THREE.Mesh(
      new THREE.BoxGeometry(.72,.62,.70),
      physical(i%3===0?0xe35c70:i%3===1?0x53b9bf:0xe6b54e,{roughness:.4,clearcoat:.5})
    );
    cabin.position.y=-.30;
    pivot.add(cabin);
    rotor.add(pivot);
    cabins.push(pivot);
  }
  root.userData.cabins=cabins;

  return shadowify(root);
}

export function createDropTower(){
  const root=createFoundation(4.8,4.8,0x626f76);
  root.userData.kind='drop';

  const tower=new THREE.Mesh(
    new THREE.CylinderGeometry(.22,.31,10.2,12),
    mat(0x637984,{roughness:.42,metalness:.58})
  );
  tower.position.y=5.15;
  root.add(tower);

  const cap=new THREE.Mesh(
    new THREE.CylinderGeometry(1.0,.62,.42,16),
    physical(0x334e62,{roughness:.42,metalness:.38})
  );
  cap.position.y=10.3;
  root.add(cap);

  const gondola=new THREE.Group();
  const ring=new THREE.Mesh(
    new THREE.CylinderGeometry(1.65,1.65,.40,24),
    physical(0xcb4e5d,{roughness:.34,metalness:.22,clearcoat:.5})
  );
  gondola.add(ring);

  for(let i=0;i<14;i++){
    const a=i/14*Math.PI*2;
    const seat=new THREE.Mesh(
      new THREE.BoxGeometry(.32,.35,.32),
      mat(0xe9b94d,{roughness:.55})
    );
    seat.position.set(Math.cos(a)*1.38,-.28,Math.sin(a)*1.38);
    gondola.add(seat);
  }
  gondola.position.y=1.5;
  root.add(gondola);
  root.userData.gondola=gondola;

  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2;
    addBulb(cap,new THREE.Vector3(Math.cos(a)*.72,.12,Math.sin(a)*.72),0xffe27c,.06);
  }

  return shadowify(root);
}

export function createDodgems(){
  const root=createFoundation(6.5,5.4,0x606a6d);
  root.userData.kind='dodgems';

  const floor=new THREE.Mesh(
    new THREE.BoxGeometry(6.6,.20,5.0),
    physical(0x48545a,{roughness:.52,metalness:.24})
  );
  floor.position.y=.28;
  root.add(floor);

  const roof=new THREE.Mesh(
    new THREE.BoxGeometry(6.9,.18,5.3),
    physical(0x35536a,{roughness:.42,metalness:.30})
  );
  roof.position.y=3.15;
  root.add(roof);

  for(const x of [-3.15,3.15]){
    for(const z of [-2.35,2.35]){
      const post=new THREE.Mesh(
        new THREE.CylinderGeometry(.06,.08,3,8),
        mat(0x657985,{roughness:.48,metalness:.52})
      );
      post.position.set(x,1.65,z);
      root.add(post);
    }
  }

  const cars=[];
  const colors=[0xdd5365,0x3187d2,0xe1ad43,0x3eb194,0x845fc1,0xec7a3d];
  for(let i=0;i<8;i++){
    const car=new THREE.Group();
    const body=new THREE.Mesh(
      new THREE.BoxGeometry(.75,.28,.52),
      physical(colors[i%colors.length],{roughness:.38,clearcoat:.55})
    );
    body.position.y=.16;
    car.add(body);

    const bumper=new THREE.Mesh(
      new THREE.TorusGeometry(.42,.055,7,16),
      mat(0x1f2b32,{roughness:.7})
    );
    bumper.rotation.x=Math.PI/2;
    bumper.position.y=.10;
    car.add(bumper);

    root.add(car);
    cars.push(car);
  }
  root.userData.cars=cars;

  return shadowify(root);
}

export function createRapids(){
  const root=new THREE.Group();
  root.userData.kind='rapids';

  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4,0,-2),
    new THREE.Vector3(-1.5,0,-4),
    new THREE.Vector3(2.3,0,-3.4),
    new THREE.Vector3(4.4,0,-.4),
    new THREE.Vector3(3.1,0,3.4),
    new THREE.Vector3(-.8,0,4.0),
    new THREE.Vector3(-4.0,0,2.0)
  ],true);

  const water=new THREE.Mesh(
    new THREE.TubeGeometry(curve,96,.74,14,true),
    new THREE.MeshPhysicalMaterial({
      color:0x3199bd,roughness:.17,metalness:.04,
      clearcoat:.65,clearcoatRoughness:.12,
      transparent:true,opacity:.86
    })
  );
  water.position.y=.16;
  root.add(water);

  const bank=new THREE.Mesh(
    new THREE.TubeGeometry(curve,96,.98,14,true),
    mat(0x766f5e,{roughness:.92})
  );
  bank.position.y=-.06;
  root.add(bank);
  // Render water after bank.
  bank.renderOrder=0;
  water.renderOrder=1;

  const raft=new THREE.Mesh(
    new THREE.CylinderGeometry(.58,.64,.26,16),
    physical(0xe29b36,{roughness:.38,clearcoat:.45})
  );
  raft.position.y=.46;
  root.add(raft);

  root.userData.curve=curve;
  root.userData.raft=raft;

  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2;
    const rock=new THREE.Mesh(
      new THREE.DodecahedronGeometry(.35+Math.random()*.28,0),
      mat(i%2?0x77756b:0x65675e,{roughness:1})
    );
    rock.scale.y=.65;
    rock.position.set(Math.cos(a)*(4.7+Math.random()),.18,Math.sin(a)*(4.1+Math.random()));
    root.add(rock);
  }

  return shadowify(root);
}

export function createDarkRide(){
  const root=createFoundation(7.2,5.0,0x55595f);
  root.userData.kind='dark';

  const bodyMat=physical(0x494459,{roughness:.78,metalness:.04});
  const roofMat=physical(0x29283a,{roughness:.70,metalness:.10});

  const main=new THREE.Mesh(new THREE.BoxGeometry(6.5,3.2,4.4),bodyMat);
  main.position.y=1.85;
  root.add(main);

  const towerA=new THREE.Mesh(new THREE.BoxGeometry(1.7,5.2,2.8),bodyMat);
  towerA.position.set(-2.2,2.75,0);
  root.add(towerA);

  const towerB=new THREE.Mesh(new THREE.BoxGeometry(1.9,4.5,2.9),bodyMat);
  towerB.position.set(2.1,2.4,0);
  root.add(towerB);

  const roofA=new THREE.Mesh(new THREE.ConeGeometry(1.65,1.6,4),roofMat);
  roofA.rotation.y=Math.PI/4;
  roofA.position.set(-2.2,6.05,0);
  root.add(roofA);

  const roofB=new THREE.Mesh(new THREE.ConeGeometry(1.7,1.5,4),roofMat);
  roofB.rotation.y=Math.PI/4;
  roofB.position.set(2.1,5.25,0);
  root.add(roofB);

  const windows=[];
  for(const x of [-2.8,-1.2,1.2,2.8]){
    for(const y of [1.65,2.7]){
      const w=new THREE.Mesh(
        new THREE.PlaneGeometry(.55,.75),
        mat(0xffd76b,{roughness:.3,emissive:0xffb536,emissiveIntensity:2.3})
      );
      w.position.set(x,y,2.211);
      root.add(w);
      windows.push(w);
    }
  }
  root.userData.windows=windows;

  return shadowify(root);
}

export function createOutlet(id='coffee'){
  const root=new THREE.Group();
  root.userData.kind='outlet';

  const cfg={
    coffee:[0xe0caa8,0x745043,0x43ad99],
    burger:[0xe2c190,0xa64a3e,0xe3a338],
    souvenir:[0xcbdcea,0x3c5e7e,0x4e97ce],
    icecream:[0xedd3da,0x68b9c9,0xdc7290],
    restaurant:[0xe0d4ba,0x496149,0x93b65d],
    premium:[0xd3c9b4,0x2e3038,0xb59657]
  }[id]||[0xd8d0bb,0x455d6e,0x4da3be];

  const width=['restaurant','premium'].includes(id)?4.1:2.7;
  const main=new THREE.Mesh(
    new THREE.BoxGeometry(width,2.25,2.6),
    physical(cfg[0],{roughness:.66,clearcoat:.12})
  );
  main.position.y=1.2;
  root.add(main);

  const roof=new THREE.Mesh(
    new THREE.BoxGeometry(width+.25,.22,2.85),
    physical(cfg[1],{roughness:.48,metalness:.12})
  );
  roof.position.y=2.45;
  root.add(roof);

  const sign=new THREE.Mesh(
    new THREE.BoxGeometry(width*.62,.45,.12),
    mat(cfg[2],{roughness:.4,emissive:cfg[2],emissiveIntensity:.55})
  );
  sign.position.set(0,1.95,1.36);
  root.add(sign);

  const glassMat=new THREE.MeshPhysicalMaterial({
    color:0x9edbef,roughness:.12,metalness:.04,
    transmission:.18,transparent:true,opacity:.72
  });
  const window=new THREE.Mesh(new THREE.PlaneGeometry(width*.55,.82),glassMat);
  window.position.set(-width*.12,1.05,1.315);
  root.add(window);

  // Awning slats.
  for(let i=0;i<7;i++){
    const slat=new THREE.Mesh(
      new THREE.BoxGeometry(width/7*.90,.08,.55),
      mat(i%2?cfg[2]:0xf4eee0,{roughness:.72})
    );
    slat.position.set(-width*.43+i*(width/7),1.72,1.58);
    slat.rotation.x=-.22;
    root.add(slat);
  }

  root.userData.sign=sign;
  return shadowify(root);
}

export function createRideAsset(id){
  switch(id){
    case'carousel':return createCarousel();
    case'dodgems':return createDodgems();
    case'drop':return createDropTower();
    case'rapids':return createRapids();
    case'dark':return createDarkRide();
    case'ferris':return createFerrisWheel();
    case'woodie':
    case'launch':
    case'invert':
    case'hyper':
    case'giga':
      return createCoaster(id);
    default:return createFerrisWheel();
  }
}

export function applyAssetState(group,data){
  const constructing=(data.daysLeft||0)>0;
  const down=!!data.down;
  const condition=data.condition??100;

  group.traverse(o=>{
    if(!o.isMesh||o.userData.stateExempt)return;
    if(!o.userData.baseMaterial){
      o.userData.baseMaterial=o.material;
    }
    if(constructing||down){
      o.material=o.userData.baseMaterial.clone();
      o.material.color.multiplyScalar(constructing?.72:.52);
      o.material.roughness=Math.min(1,(o.material.roughness??.5)+.15);
    }else{
      o.material=o.userData.baseMaterial;
      if(condition<50){
        o.material=o.userData.baseMaterial.clone();
        if(o.material.color)o.material.color.multiplyScalar(.90);
        o.material.roughness=Math.min(1,(o.material.roughness??.5)+.12);
      }
    }
  });
}

export function updateRide(group,id,time,dt,activity=1){
  const speed=activity;

  if(group.userData.kind==='carousel'){
    group.userData.rotor.rotation.y+=dt*.62*speed;
    group.userData.horses.forEach((h,i)=>{
      h.position.y=1.35+Math.sin(time*2.2+i*.85)*.15*speed;
    });
    group.userData.bulbs.forEach((b,i)=>{
      b.material.emissiveIntensity=1.6+(Math.sin(time*4+i*.7)+1)*.8;
    });
  }

  if(group.userData.kind==='ferris'){
    const rotor=group.userData.rotor;
    rotor.rotation.z-=dt*.14*speed;
    group.userData.cabins.forEach(c=>c.rotation.z=-rotor.rotation.z);
  }

  if(group.userData.kind==='drop'){
    const cycle=(time*.13*speed)%1;
    let y;
    if(cycle<.55)y=THREE.MathUtils.smootherstep(cycle/55e-2,0,1)*8.0+1.5;
    else if(cycle<.68)y=9.5;
    else y=THREE.MathUtils.lerp(9.5,1.5,THREE.MathUtils.smootherstep((cycle-.68)/.32,0,1));
    group.userData.gondola.position.y=y;
  }

  if(group.userData.kind==='dodgems'){
    group.userData.cars.forEach((car,i)=>{
      const a=time*(.30+i*.018)*speed+i*1.71;
      car.position.set(
        Math.sin(a*1.23+i)*2.35,
        .44,
        Math.cos(a*.91+i*.63)*1.65
      );
      car.rotation.y=a*1.7;
    });
  }

  if(group.userData.kind==='rapids'){
    const t=(time*.045*speed)%1;
    const curve=group.userData.curve;
    const p=curve.getPointAt(t);
    const tan=curve.getTangentAt(t);
    group.userData.raft.position.set(p.x,p.y+.46,p.z);
    group.userData.raft.rotation.y=Math.atan2(tan.x,tan.z);
  }

  if(group.userData.kind==='coaster'){
    const t=(time*.032*speed+group.userData.trainOffset)%1;
    const curve=group.userData.curve;
    group.userData.train.children.forEach((car,i)=>{
      const tt=(t-i*.012+1)%1;
      const p=curve.getPointAt(tt);
      const tan=curve.getTangentAt(tt).normalize();
      car.position.copy(p);
      car.position.y+=.15;
      car.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tan);
    });
  }

  if(group.userData.kind==='dark'){
    group.userData.windows.forEach((w,i)=>{
      w.material.emissiveIntensity=1.4+(Math.sin(time*1.4+i*.75)+1)*.9;
    });
  }

  if(group.userData.kind==='outlet'&&group.userData.sign){
    group.userData.sign.material.emissiveIntensity=.35+(Math.sin(time*1.7)+1)*.14;
  }
}
