import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/*
  Post-processing + pooled effects.
  Expensive passes are automatically reduced/disabled on smaller devices.
*/

const VignetteChromaticShader={
  uniforms:{
    tDiffuse:{value:null},
    vignetteStrength:{value:.28},
    aberration:{value:.00055}
  },
  vertexShader:`
    varying vec2 vUv;
    void main(){
      vUv=uv;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
    }
  `,
  fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float vignetteStrength;
    uniform float aberration;
    varying vec2 vUv;
    void main(){
      vec2 centered=vUv-.5;
      float d=dot(centered,centered);
      vec2 off=centered*aberration*(.6+d*2.0);
      float r=texture2D(tDiffuse,vUv+off).r;
      float g=texture2D(tDiffuse,vUv).g;
      float b=texture2D(tDiffuse,vUv-off).b;
      vec3 col=vec3(r,g,b);
      col*=1.0-d*vignetteStrength;
      gl_FragColor=vec4(col,1.0);
    }
  `
};

export function createPostFX(renderer,scene,camera,{mobile=false}={}){
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));

  let ssao=null;
  if(!mobile){
    ssao=new SSAOPass(scene,camera,renderer.domElement.clientWidth,renderer.domElement.clientHeight,16);
    ssao.kernelRadius=7;
    ssao.minDistance=.0012;
    ssao.maxDistance=.075;
    composer.addPass(ssao);
  }

  const bloom=new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.clientWidth,renderer.domElement.clientHeight),
    mobile?.20:.34,
    .58,
    .82
  );
  composer.addPass(bloom);

  const finish=new ShaderPass(VignetteChromaticShader);
  finish.uniforms.vignetteStrength.value=mobile?.18:.27;
  finish.uniforms.aberration.value=mobile?.00022:.00052;
  composer.addPass(finish);

  // Official Three.js guidance recommends OutputPass at the end of a post chain
  // so renderer tone mapping and output color-space conversion are preserved.
  const output=new OutputPass();
  composer.addPass(output);

  return{
    composer,
    resize(w,h){
      composer.setSize(w,h);
      if(ssao?.setSize)ssao.setSize(w,h);
    },
    render(){composer.render()},
    dispose(){
      composer.dispose?.();
      ssao?.dispose?.();
      bloom.dispose?.();
      finish.dispose?.();
      output.dispose?.();
    }
  };
}

export class ParticlePool{
  constructor(scene,capacity=180){
    this.scene=scene;
    this.capacity=capacity;
    this.active=[];
    this.pool=[];

    const geometry=new THREE.IcosahedronGeometry(.10,0);
    const material=new THREE.MeshStandardMaterial({
      color:0xffd36b,
      emissive:0x5d3c00,
      emissiveIntensity:.35,
      roughness:.42,
      metalness:.06
    });

    for(let i=0;i<capacity;i++){
      const m=new THREE.Mesh(geometry,material.clone());
      m.visible=false;
      m.castShadow=false;
      scene.add(m);
      this.pool.push(m);
    }
  }

  emit(position,{
    count=12,
    color=0xffd36b,
    emissive=0x5d3c00,
    spread=2.2,
    speed=3.5,
    life=.85,
    gravity=5.5,
    size=.9
  }={}){
    for(let i=0;i<count;i++){
      const mesh=this.pool.pop();
      if(!mesh)break;
      mesh.visible=true;
      mesh.position.copy(position);
      mesh.position.x+=(Math.random()-.5)*spread;
      mesh.position.z+=(Math.random()-.5)*spread;
      mesh.scale.setScalar((.55+Math.random()*.7)*size);
      mesh.material.color.setHex(color);
      mesh.material.emissive.setHex(emissive);
      mesh.material.opacity=1;
      mesh.material.transparent=true;

      this.active.push({
        mesh,
        life,
        max:life,
        gravity,
        vel:new THREE.Vector3(
          (Math.random()-.5)*speed,
          1.4+Math.random()*speed,
          (Math.random()-.5)*speed
        )
      });
    }
  }

  update(dt){
    for(let i=this.active.length-1;i>=0;i--){
      const p=this.active[i];
      p.life-=dt;
      p.vel.y-=p.gravity*dt;
      p.mesh.position.addScaledVector(p.vel,dt);
      p.mesh.rotation.x+=dt*5;
      p.mesh.rotation.y+=dt*7;
      p.mesh.material.opacity=THREE.MathUtils.clamp(p.life/p.max,0,1);

      if(p.life<=0){
        p.mesh.visible=false;
        this.active.splice(i,1);
        this.pool.push(p.mesh);
      }
    }
  }

  dispose(){
    for(const m of [...this.active.map(x=>x.mesh),...this.pool]){
      m.geometry.dispose();
      m.material.dispose();
      m.removeFromParent();
    }
    this.active.length=0;
    this.pool.length=0;
  }
}

export class WeatherParticles{
  constructor(scene,max=850){
    this.scene=scene;
    this.max=max;
    this.count=0;
    this.mode='clear';

    const geo=new THREE.BufferGeometry();
    const positions=new Float32Array(max*3);
    const speeds=new Float32Array(max);

    for(let i=0;i<max;i++){
      positions[i*3]=(Math.random()-.5)*50;
      positions[i*3+1]=Math.random()*25+3;
      positions[i*3+2]=(Math.random()-.5)*50;
      speeds[i]=8+Math.random()*9;
    }

    geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    geo.setAttribute('speed',new THREE.BufferAttribute(speeds,1));
    geo.setDrawRange(0,0);

    const mat=new THREE.PointsMaterial({
      color:0xccecff,
      size:.07,
      transparent:true,
      opacity:.65,
      depthWrite:false,
      blending:THREE.NormalBlending
    });

    this.points=new THREE.Points(geo,mat);
    this.points.frustumCulled=false;
    scene.add(this.points);
  }

  setWeather(name=''){
    const s=name.toLowerCase();
    this.mode=s.includes('snow')?'snow':s.includes('rain')?'rain':'clear';
    this.count=this.mode==='clear'?0:this.mode==='snow'?260:s.includes('heavy')?760:430;
    this.points.geometry.setDrawRange(0,this.count);
    this.points.material.color.setHex(this.mode==='snow'?0xf4fbff:0xbfddec);
    this.points.material.size=this.mode==='snow'?.15:.055;
  }

  update(dt,cameraTarget){
    if(!this.count)return;
    this.points.position.set(cameraTarget.x,0,cameraTarget.z);

    const pos=this.points.geometry.attributes.position.array;
    const speed=this.points.geometry.attributes.speed.array;

    for(let i=0;i<this.count;i++){
      const k=i*3;
      pos[k+1]-=speed[i]*dt*(this.mode==='snow'?.22:1);
      pos[k]+=this.mode==='snow'?Math.sin(performance.now()*.001+i)*dt*.35:-dt*1.4;

      if(pos[k+1]<.2){
        pos[k]=(Math.random()-.5)*50;
        pos[k+1]=23+Math.random()*8;
        pos[k+2]=(Math.random()-.5)*50;
      }
    }
    this.points.geometry.attributes.position.needsUpdate=true;
  }

  dispose(){
    this.points.geometry.dispose();
    this.points.material.dispose();
    this.points.removeFromParent();
  }
}
