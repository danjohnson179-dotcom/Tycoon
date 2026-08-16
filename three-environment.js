import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

/*
  Terrain, sky, clouds, vegetation, paths and guest population.
  Repeated vegetation and guests use InstancedMesh to minimize draw calls.
*/

const dummy=new THREE.Object3D();

function pbr(color,{roughness=.82,metalness=.02,emissive=0x000000,emissiveIntensity=0}={}){
  return new THREE.MeshStandardMaterial({
    color,roughness,metalness,emissive,emissiveIntensity
  });
}

function makeNoiseTexture(size=128){
  const data=new Uint8Array(size*size*4);
  for(let i=0;i<size*size;i++){
    const n=145+Math.floor(Math.random()*55);
    data[i*4]=n*.72;
    data[i*4+1]=n;
    data[i*4+2]=n*.70;
    data[i*4+3]=255;
  }
  const tex=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(15,15);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.needsUpdate=true;
  return tex;
}

export class ParkEnvironment{
  constructor(scene){
    this.scene=scene;
    this.group=new THREE.Group();
    this.group.name='Environment';
    scene.add(this.group);

    this.sun=new THREE.DirectionalLight(0xfff0d0,2.6);
    this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1536,1536);
    this.sun.shadow.camera.left=-34;
    this.sun.shadow.camera.right=34;
    this.sun.shadow.camera.top=34;
    this.sun.shadow.camera.bottom=-34;
    this.sun.shadow.camera.near=.1;
    this.sun.shadow.camera.far=90;
    this.sun.shadow.bias=-.00025;
    this.sun.shadow.normalBias=.03;
    scene.add(this.sun);

    this.hemi=new THREE.HemisphereLight(0xbfe8ff,0x47614f,1.6);
    scene.add(this.hemi);

    this.sky=null;
    this.clouds=[];
    this.water=null;
    this.treeInstances=null;
    this.propInstances=null;
    this.pathCurve=null;

    this.guestMesh=null;
    this.guestCount=0;
    this.guestAgents=[];
    this.maxGuests=96;

    this.createTerrain();
    this.createSky();
    this.createPaths();
    this.createWater();
    this.createTrees();
    this.createProps();
    this.createClouds();
    this.createGuests();
  }

  createTerrain(){
    const geo=new THREE.PlaneGeometry(62,62,56,56);
    geo.rotateX(-Math.PI/2);

    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),z=pos.getZ(i);
      const edge=Math.max(Math.abs(x),Math.abs(z))/31;
      const h=
        Math.sin(x*.18)*.08+
        Math.cos(z*.22)*.07+
        Math.sin((x+z)*.11)*.06+
        Math.max(0,edge-.72)*.28;
      pos.setY(i,h);
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();

    const grassTex=makeNoiseTexture();
    const mat=new THREE.MeshStandardMaterial({
      color:0x6e9d69,
      roughness:.96,
      metalness:0,
      map:grassTex
    });

    const terrain=new THREE.Mesh(geo,mat);
    terrain.receiveShadow=true;
    terrain.name='Terrain';
    this.group.add(terrain);

    // Small darker perimeter for depth.
    const skirt=new THREE.Mesh(
      new THREE.CylinderGeometry(34,34,1.2,6),
      pbr(0x4b7050,{roughness:1})
    );
    skirt.position.y=-.64;
    skirt.receiveShadow=true;
    this.group.add(skirt);
  }

  createSky(){
    const sky=new Sky();
    sky.scale.setScalar(450);
    this.scene.add(sky);
    this.sky=sky;

    const u=sky.material.uniforms;
    u.turbidity.value=7.2;
    u.rayleigh.value=2.0;
    u.mieCoefficient.value=.004;
    u.mieDirectionalG.value=.82;
  }

  createPaths(){
    const pathMat=pbr(0xd6c7a6,{roughness:.94});
    const borderMat=pbr(0x9b8d75,{roughness:.9});

    const segments=[
      [[-23,0],[23,0]],
      [[-8,-22],[-8,21]],
      [[8,-21],[8,22]],
      [[-18,-11],[17,-11]],
      [[-18,11],[18,11]]
    ];

    for(const [[x1,z1],[x2,z2]] of segments){
      const len=Math.hypot(x2-x1,z2-z1);
      const width=Math.abs(z2-z1)>Math.abs(x2-x1)?2.35:2.7;

      const path=new THREE.Mesh(
        new THREE.BoxGeometry(
          Math.abs(x2-x1)>0?len:width,
          .08,
          Math.abs(z2-z1)>0?len:width
        ),
        pathMat
      );

      path.position.set((x1+x2)/2,.07,(z1+z2)/2);
      path.receiveShadow=true;
      this.group.add(path);

      // Two narrow kerbs.
      const vertical=Math.abs(z2-z1)>Math.abs(x2-x1);
      for(const sign of [-1,1]){
        const kerb=new THREE.Mesh(
          new THREE.BoxGeometry(
            vertical?.14:len,
            .12,
            vertical?len:.14
          ),
          borderMat
        );
        kerb.position.copy(path.position);
        if(vertical)kerb.position.x+=sign*(width/2+.12);
        else kerb.position.z+=sign*(width/2+.12);
        kerb.receiveShadow=true;
        this.group.add(kerb);
      }
    }

    this.pathCurve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22,.18,0),
      new THREE.Vector3(-8,.18,0),
      new THREE.Vector3(-8,.18,11),
      new THREE.Vector3(8,.18,11),
      new THREE.Vector3(8,.18,0),
      new THREE.Vector3(22,.18,0),
      new THREE.Vector3(8,.18,-11),
      new THREE.Vector3(-8,.18,-11)
    ],true,'catmullrom',.25);
  }

  createWater(){
    const geo=new THREE.CircleGeometry(5.8,48);
    geo.rotateX(-Math.PI/2);

    const mat=new THREE.MeshPhysicalMaterial({
      color:0x329ac0,
      roughness:.14,
      metalness:.04,
      transmission:.05,
      transparent:true,
      opacity:.86,
      clearcoat:1,
      clearcoatRoughness:.16
    });

    const water=new THREE.Mesh(geo,mat);
    water.position.set(17,.15,-17);
    water.receiveShadow=true;
    this.group.add(water);
    this.water=water;

    const rim=new THREE.Mesh(
      new THREE.TorusGeometry(5.9,.25,10,48),
      pbr(0x8f8770,{roughness:.9})
    );
    rim.rotateX(Math.PI/2);
    rim.position.copy(water.position);
    rim.position.y=.17;
    rim.castShadow=true;
    this.group.add(rim);

    // Fountain centerpiece.
    const pedestal=new THREE.Mesh(
      new THREE.CylinderGeometry(.8,1.2,1.3,20),
      pbr(0xa79b83,{roughness:.78})
    );
    pedestal.position.set(17,.78,-17);
    pedestal.castShadow=true;
    pedestal.receiveShadow=true;
    this.group.add(pedestal);
  }

  createTrees(){
    const count=130;
    const trunkGeo=new THREE.CylinderGeometry(.13,.18,1.5,7);
    const crownGeo=new THREE.IcosahedronGeometry(.9,1);
    const trunkMat=pbr(0x6b4d34,{roughness:1});
    const crownMat=pbr(0x3d7651,{roughness:.95});

    const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count);
    const crowns=new THREE.InstancedMesh(crownGeo,crownMat,count);
    trunks.castShadow=true;
    crowns.castShadow=true;
    trunks.receiveShadow=true;
    crowns.receiveShadow=true;

    const reserved=p=>{
      const ax=Math.abs(p.x),az=Math.abs(p.z);
      return ax<24&&az<13 || Math.hypot(p.x-17,p.z+17)<8;
    };

    let i=0,attempts=0;
    while(i<count&&attempts<2000){
      attempts++;
      const p=new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(57),
        0,
        THREE.MathUtils.randFloatSpread(57)
      );
      if(reserved(p))continue;

      const s=.68+Math.random()*.9;
      dummy.position.set(p.x,.75*s,p.z);
      dummy.scale.set(s,s,s);
      dummy.rotation.y=Math.random()*Math.PI*2;
      dummy.updateMatrix();
      trunks.setMatrixAt(i,dummy.matrix);

      dummy.position.set(p.x,1.8*s,p.z);
      dummy.scale.set(s*(.82+Math.random()*.25),s,s*(.82+Math.random()*.25));
      dummy.updateMatrix();
      crowns.setMatrixAt(i,dummy.matrix);
      i++;
    }

    trunks.count=i;
    crowns.count=i;
    trunks.instanceMatrix.needsUpdate=true;
    crowns.instanceMatrix.needsUpdate=true;

    this.group.add(trunks,crowns);
    this.treeInstances={trunks,crowns};
  }

  createProps(){
    // Instanced benches and lamps.
    const benchGeo=new THREE.BoxGeometry(1.25,.16,.32);
    const benchMat=pbr(0x6e4931,{roughness:.88});
    const benches=new THREE.InstancedMesh(benchGeo,benchMat,34);
    benches.castShadow=true;

    const lampGeo=new THREE.CylinderGeometry(.04,.06,2.15,7);
    const lampMat=new THREE.MeshStandardMaterial({
      color:0x394954,roughness:.52,metalness:.62
    });
    const lamps=new THREE.InstancedMesh(lampGeo,lampMat,46);
    lamps.castShadow=true;

    for(let i=0;i<34;i++){
      const side=i%2?-1:1;
      const z=-10+i*.62;
      dummy.position.set(side*3.3,.42,z);
      dummy.rotation.y=Math.PI/2;
      dummy.scale.set(1,1,1);
      dummy.updateMatrix();
      benches.setMatrixAt(i,dummy.matrix);
    }

    for(let i=0;i<46;i++){
      const row=i%2;
      const idx=Math.floor(i/2);
      dummy.position.set(row?-10.1:10.1,1.1,-11+idx);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(1,1,1);
      dummy.updateMatrix();
      lamps.setMatrixAt(i,dummy.matrix);
    }
    benches.instanceMatrix.needsUpdate=true;
    lamps.instanceMatrix.needsUpdate=true;
    this.group.add(benches,lamps);
    this.propInstances={benches,lamps};
  }

  createClouds(){
    // Volumetric-style cloud clusters. This is intentionally cheaper than
    // full ray-marched volumetrics: overlapping low-poly volumes use a
    // procedural shader with soft fresnel/noise density.
    const geo=new THREE.SphereGeometry(1,14,10);

    this.cloudMaterial=new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      uniforms:{
        uTime:{value:0},
        uTint:{value:new THREE.Color(0xffffff)},
        uOpacity:{value:.52}
      },
      vertexShader:`
        varying vec3 vNormalW;
        varying vec3 vWorld;
        void main(){
          vec4 world=modelMatrix*vec4(position,1.0);
          vWorld=world.xyz;
          vNormalW=normalize(mat3(modelMatrix)*normal);
          gl_Position=projectionMatrix*viewMatrix*world;
        }
      `,
      fragmentShader:`
        uniform float uTime;
        uniform vec3 uTint;
        uniform float uOpacity;
        varying vec3 vNormalW;
        varying vec3 vWorld;

        float hash(vec3 p){
          p=fract(p*.1031);
          p+=dot(p,p.yzx+33.33);
          return fract((p.x+p.y)*p.z);
        }

        void main(){
          float edge=pow(clamp(abs(vNormalW.y)*.55+.45,0.0,1.0),.55);
          float n=hash(floor(vWorld*1.4+uTime*.025));
          float density=smoothstep(.08,.92,edge*(.82+n*.28));
          float a=density*uOpacity;
          if(a<.035)discard;
          vec3 col=uTint*(.91+n*.11);
          gl_FragColor=vec4(col,a);
        }
      `
    });

    for(let c=0;c<9;c++){
      const group=new THREE.Group();
      const count=5+(c%4);
      for(let i=0;i<count;i++){
        const m=new THREE.Mesh(geo,this.cloudMaterial);
        m.scale.set(
          1.8+Math.random()*2.2,
          .75+Math.random()*.7,
          1.2+Math.random()*1.5
        );
        m.position.set(
          (i-count/2)*1.6+Math.random(),
          Math.random()*.5,
          Math.random()*1.8
        );
        group.add(m);
      }
      group.position.set(
        -36+c*10,
        14+Math.random()*5,
        -20+Math.random()*40
      );
      group.userData.speed=.18+Math.random()*.14;
      this.scene.add(group);
      this.clouds.push(group);
    }
  }

  createGuests(){
    const bodyGeo=new THREE.CapsuleGeometry(.12,.42,3,6);
    const bodyMat=new THREE.MeshStandardMaterial({
      color:0x4a83b8,roughness:.8,metalness:0
    });

    const mesh=new THREE.InstancedMesh(bodyGeo,bodyMat,this.maxGuests);
    mesh.castShadow=true;
    mesh.count=0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(mesh);
    this.guestMesh=mesh;

    for(let i=0;i<this.maxGuests;i++){
      this.guestAgents.push({
        t:Math.random(),
        speed:.012+Math.random()*.018,
        phase:Math.random()*Math.PI*2,
        scale:.85+Math.random()*.25,
        color:new THREE.Color().setHSL(Math.random(),.34,.52)
      });
      mesh.setColorAt(i,this.guestAgents[i].color);
    }
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  setGuestPopulation(parkGuests){
    // One visual person represents many simulated visitors.
    this.guestCount=THREE.MathUtils.clamp(Math.round(parkGuests/38),0,this.maxGuests);
    this.guestMesh.count=this.guestCount;
  }

  updateGuests(dt,time){
    const tangent=new THREE.Vector3();
    for(let i=0;i<this.guestCount;i++){
      const a=this.guestAgents[i];
      a.t=(a.t+a.speed*dt)%1;

      const p=this.pathCurve.getPointAt(a.t);
      this.pathCurve.getTangentAt(a.t,tangent);

      dummy.position.set(
        p.x,
        .52+Math.sin(time*5+a.phase)*.025,
        p.z
      );
      dummy.rotation.set(0,Math.atan2(tangent.x,tangent.z),0);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      this.guestMesh.setMatrixAt(i,dummy.matrix);
    }
    this.guestMesh.instanceMatrix.needsUpdate=true;
  }

  updateDayNight(dayFraction,weather=''){
    // Sunrise -> midday -> sunset -> night.
    const f=THREE.MathUtils.clamp(dayFraction,0,1);
    const sunAngle=THREE.MathUtils.lerp(-.15,Math.PI*1.12,f);
    const sunHeight=Math.sin(sunAngle);
    const sunX=Math.cos(sunAngle)*35;
    const sunY=Math.max(-5,sunHeight*34);
    const sunZ=18;

    this.sun.position.set(sunX,sunY,sunZ);
    this.sun.target.position.set(0,0,0);
    this.scene.add(this.sun.target);

    const daylight=THREE.MathUtils.smoothstep(Math.max(0,sunHeight),0,.8);
    const twilight=1-Math.abs(f-.5)*2;

    this.sun.intensity=.12+daylight*3.2;
    this.hemi.intensity=.35+daylight*1.6;

    this.sun.color.set(daylight>.45?0xfff0d2:0xff9c66);
    this.hemi.color.set(daylight>.25?0xbfe7ff:0x4b5d86);
    this.hemi.groundColor.set(daylight>.25?0x465e48:0x1a2430);

    const phi=THREE.MathUtils.degToRad(90-(sunHeight*58+18));
    const theta=THREE.MathUtils.degToRad(185);
    const sunPos=new THREE.Vector3().setFromSphericalCoords(1,phi,theta);
    this.sky.material.uniforms.sunPosition.value.copy(sunPos);

    const overcast=/rain|overcast/i.test(weather);
    this.sky.material.uniforms.turbidity.value=overcast?13:7;
    this.sky.material.uniforms.rayleigh.value=overcast?1.2:2.1;

    this.clouds.forEach(c=>{c.visible=true;});
    if(this.cloudMaterial){
      this.cloudMaterial.uniforms.uOpacity.value=overcast?.72:.50;
      this.cloudMaterial.uniforms.uTint.value.set(daylight>.25?0xffffff:0x9caec7);
    }

    // Water catches more light during daytime.
    this.water.material.color.set(daylight>.25?0x339ec4:0x183e58);
    this.water.material.roughness=daylight>.25?.14:.25;
  }

  update(dt,time){
    if(this.cloudMaterial)this.cloudMaterial.uniforms.uTime.value=time;

    for(const c of this.clouds){
      c.position.x+=c.userData.speed*dt;
      if(c.position.x>42)c.position.x=-45;
    }

    if(this.water){
      this.water.material.opacity=.83+Math.sin(time*.8)*.025;
    }

    this.updateGuests(dt,time);
  }

  dispose(){
    this.group.traverse(o=>{
      o.geometry?.dispose?.();
      if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
      else o.material?.dispose?.();
    });
    this.group.removeFromParent();
    this.sky?.removeFromParent();
    this.clouds.forEach(c=>c.removeFromParent());
  }
}
