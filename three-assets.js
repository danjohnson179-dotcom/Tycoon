import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/*
  Optional production asset layer.

  The shipped v1.06 world is procedural so GitHub Pages can run immediately
  with no asset bundle. When professional GLB models/PBR maps are available,
  this registry lets you replace procedural ride internals without changing
  the business simulation or the world bridge.

  Recommended:
  - GLB/glTF for attractions/buildings.
  - 2K textures for hero rides, 1K for standard buildings, 512 or less for props.
  - KTX2/Basis compression can be added later if you ship the transcoder files.
  - Keep model origin at ground-center and approximately 1 Three unit = 1 metre.
*/

export class AssetLibrary{
  constructor(renderer){
    this.renderer=renderer;
    this.gltf=new GLTFLoader();
    this.rgbe=new RGBELoader();
    this.models=new Map();
    this.textures=new Map();
    this.environment=null;
  }

  async loadModel(key,url){
    if(this.models.has(key))return this.models.get(key);
    const gltf=await this.gltf.loadAsync(url);

    gltf.scene.traverse(o=>{
      if(o.isMesh){
        o.castShadow=true;
        o.receiveShadow=true;

        // Respect authored PBR values while ensuring correct color texture space.
        for(const slot of ['map','emissiveMap']){
          if(o.material?.[slot])o.material[slot].colorSpace=THREE.SRGBColorSpace;
        }
      }
    });

    this.models.set(key,gltf.scene);
    return gltf.scene;
  }

  cloneModel(key){
    const model=this.models.get(key);
    return model?model.clone(true):null;
  }

  async loadTexture(key,url,{srgb=true,repeat=null}={}){
    if(this.textures.has(key))return this.textures.get(key);

    const tex=await new THREE.TextureLoader().loadAsync(url);
    if(srgb)tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());

    if(repeat){
      tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
      tex.repeat.set(repeat[0],repeat[1]);
    }

    this.textures.set(key,tex);
    return tex;
  }

  async loadEnvironment(url){
    const hdr=await this.rgbe.loadAsync(url);
    hdr.mapping=THREE.EquirectangularReflectionMapping;

    // PMREM converts an HDR panorama into the filtered cubemap expected by
    // MeshStandardMaterial / MeshPhysicalMaterial for realistic reflections.
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const env=pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();

    this.environment=env;
    return env;
  }

  dispose(){
    for(const model of this.models.values()){
      model.traverse(o=>{
        o.geometry?.dispose?.();
        if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());
        else o.material?.dispose?.();
      });
    }
    for(const tex of this.textures.values())tex.dispose?.();
    this.environment?.dispose?.();
    this.models.clear();
    this.textures.clear();
  }
}
