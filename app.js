import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x11151c);

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
camera.position.set(7, 7, 9);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0,0,0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.9));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(5, 9, 6); sun.castShadow = true; scene.add(sun);

const grid = new THREE.GridHelper(40, 40, 0x536079, 0x2d3444);
scene.add(grid);

const pieces = [];
let selected = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const defs = {
  heavy: { name:'Heavyprock', size:[2.5,0.22,5], color:0x6f788a, weight:500, area:12.5 },
  wall: { name:'Panel pared', size:[2.5,2.4,0.12], color:0xd9dde6, weight:90, area:0 },
  arch: { name:'Arco 5 m', size:[5,2.8,0.16], color:0x2d6cdf, weight:180, area:0 }
};

function makePiece(type){
  const d = defs[type];
  let obj;
  if(type === 'arch'){
    obj = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({color:d.color, metalness:.35, roughness:.35});
    const legGeo = new THREE.BoxGeometry(.16,2.6,.16);
    const topGeo = new THREE.BoxGeometry(5,.16,.16);
    const l1 = new THREE.Mesh(legGeo,mat), l2 = new THREE.Mesh(legGeo,mat), top = new THREE.Mesh(topGeo,mat);
    l1.position.set(-2.5,1.3,0); l2.position.set(2.5,1.3,0); top.position.set(0,2.6,0);
    obj.add(l1,l2,top);
  } else {
    const geo = new THREE.BoxGeometry(...d.size);
    const mat = new THREE.MeshStandardMaterial({color:d.color, roughness:.55});
    obj = new THREE.Mesh(geo,mat);
    obj.castShadow = true; obj.receiveShadow = true;
    obj.position.y = d.size[1]/2;
  }
  obj.userData = { type, ...d, id: Date.now()+Math.random() };
  obj.position.x = pieces.length % 4 * 2.7;
  obj.position.z = Math.floor(pieces.length / 4) * 2.7;
  scene.add(obj); pieces.push(obj); select(obj); updateStats();
}

function select(obj){
  if(selected) selected.traverse?.(m=>{ if(m.material?.emissive) m.material.emissive.set(0x000000); });
  selected = obj;
  if(selected) selected.traverse?.(m=>{ if(m.material?.emissive) m.material.emissive.set(0x24324f); });
  document.querySelector('#selectedInfo').textContent = selected ? `${selected.userData.name} · X ${selected.position.x.toFixed(1)} · Z ${selected.position.z.toFixed(1)}` : 'Nada seleccionado';
}

function updateStats(){
  document.querySelector('#pieceCount').textContent = pieces.length;
  document.querySelector('#weight').textContent = `${pieces.reduce((a,p)=>a+p.userData.weight,0)} kg`;
  document.querySelector('#area').textContent = `${pieces.reduce((a,p)=>a+p.userData.area,0).toFixed(1)} m²`;
}

document.querySelectorAll('.piece').forEach(b=>b.onclick=()=>makePiece(b.dataset.type));
document.querySelector('#deleteBtn').onclick=()=>{ if(!selected)return; scene.remove(selected); pieces.splice(pieces.indexOf(selected),1); selected=null; select(null); updateStats(); };
document.querySelector('#rotateBtn').onclick=()=>{ if(selected){ selected.rotation.y += Math.PI/2; } };
document.querySelector('#resetBtn').onclick=()=>{ pieces.forEach(p=>scene.remove(p)); pieces.length=0; selected=null; select(null); updateStats(); localStorage.removeItem('modularProject'); };
['XMinus','XPlus','ZMinus','ZPlus'].forEach(k=>document.querySelector('#move'+k).onclick=()=>move(k));
function move(k){ if(!selected)return; const step=.5; if(k==='XMinus')selected.position.x-=step; if(k==='XPlus')selected.position.x+=step; if(k==='ZMinus')selected.position.z-=step; if(k==='ZPlus')selected.position.z+=step; select(selected); }

document.querySelector('#saveBtn').onclick=()=>{
  const data = pieces.map(p=>({type:p.userData.type,x:p.position.x,y:p.position.y,z:p.position.z,rot:p.rotation.y}));
  localStorage.setItem('modularProject', JSON.stringify(data));
  alert('Proyecto guardado en este navegador.');
};

function load(){
  const data = JSON.parse(localStorage.getItem('modularProject')||'[]');
  data.forEach(item=>{ makePiece(item.type); selected.position.set(item.x,item.y,item.z); selected.rotation.y=item.rot; });
  select(null); updateStats();
}

canvas.addEventListener('pointerdown', e=>{
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX-rect.left)/rect.width)*2-1;
  pointer.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hits = raycaster.intersectObjects(pieces,true);
  if(hits.length){ let o=hits[0].object; while(o.parent && !pieces.includes(o)) o=o.parent; select(o); }
});

function resize(){
  const rect = canvas.parentElement.getBoundingClientRect();
  camera.aspect = rect.width / rect.height; camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height, false);
}
window.addEventListener('resize', resize);
function animate(){ resize(); controls.update(); renderer.render(scene,camera); requestAnimationFrame(animate); }
load(); animate();
