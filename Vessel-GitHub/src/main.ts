import * as T from 'three';
import {wheelPixels,zoomStep} from './zoom-motion.mjs';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import baselinePlan from '../data/phase5-plan.json';
import reconstructedPlan from '../data/reconstruction-plan.json';
import envelope from '../data/visual-envelope.json';
const isReconstruction=new URLSearchParams(location.search).get('version')!=='phase5';
const visualUpgrade=isReconstruction&&new URLSearchParams(location.search).get('finish')!=='phase6';
const plan=isReconstruction?reconstructedPlan:baselinePlan;
import './style.css';
import {cameraClear,clearCameraMove} from './camera-clearance.mjs';
type Point=[number,number,number];
type Deck=typeof plan.platforms[number];type Flight=typeof plan.stairs[number];
window.addEventListener('error',event=>{const error=document.getElementById('error');if(error){error.hidden=false;error.textContent='The 3D scene could not finish loading. '+event.message;}document.getElementById('loading')?.remove()});
const $=<E extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as E;
const v=(q:number[])=>new T.Vector3(q[0],q[1],q[2]);
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;renderer.outputColorSpace=T.SRGBColorSpace;$('scene').appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#eae7de');scene.fog=new T.Fog('#eae7de',160,380);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.04,500);camera.position.set(44,30,46);
// Reproducible elevation captures use an orthographic camera, never a mesh transform.
const captureElevation=new URLSearchParams(location.search).get('capture');
let reviewCamera:T.OrthographicCamera|null=null;
if(captureElevation==='front'||captureElevation==='side'){
 reviewCamera=new T.OrthographicCamera(-35*camera.aspect,35*camera.aspect,35,-35,.04,500);
 reviewCamera.position.set(captureElevation==='side'?140:0,22.45,captureElevation==='front'?140:0);reviewCamera.lookAt(0,22.45,0);
}
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,9,0);controls.enableDamping=true;controls.dampingFactor=.075;const cameraBounds=new T.Box3();for(const d of plan.platforms){const r=Math.hypot(d.radialSize,d.tangentSize)/2;cameraBounds.expandByPoint(v(d.center).addScalar(r));cameraBounds.expandByPoint(v(d.center).addScalar(-r));}const sceneRadius=cameraBounds.getBoundingSphere(new T.Sphere()).radius;
controls.minDistance=Math.max(camera.near*12,sceneRadius*.012);controls.maxDistance=sceneRadius*5;controls.enableZoom=false;controls.rotateSpeed=.65;controls.maxPolarAngle=Math.PI*.495;controls.zoomSpeed=.75;controls.panSpeed=.65;controls.listenToKeyEvents(window);
// A local procedural urban light field: bright sky cards and dark vertical facades.
// Reflection-only scene; no remote HDR, decorative building shell, or bloom.
const pmrem=new T.PMREMGenerator(renderer),env=new T.Scene();env.background=new T.Color('#b9c4d0');
const envObjects:T.Mesh[]=[];
function envBox(color:string,intensity:number,pos:Point,size:Point){const m=new T.Mesh(new T.BoxGeometry(...size),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));m.position.set(...pos);env.add(m);envObjects.push(m);return m;}
envBox('#f9fbff',1.45,[0,35,0],[90,1,90]);envBox(visualUpgrade?'#8c969c':'#aca59c',visualUpgrade?.85:.85,[0,-12,0],[100,1,100]);
if(visualUpgrade){
 // Reflection-only neutral plaza strips produce readable metallic contrast on downward-facing panels.
 for(let i=0;i<10;i++){const card=envBox(i%3===0?'#f4f7fb':'#30424e',i%3===0?2.0:.75,[-32+i*7,-10.8,0],[i%3===0?2.2:5,.2,70]);card.rotation.y=.35;}
 envBox('#fbfdff',2.8,[-28,8,18],[3,38,12]);envBox('#dce6f2',1.5,[28,2,-12],[5,25,18]);
}
for(let i=0;i<12;i++){const a=i*Math.PI/6,r=38;const m=envBox(i%3===0?'#182532':i%3===1?'#e5edf6':'#8a9cae',i%3===1?1.65:.55,[Math.cos(a)*r,9,Math.sin(a)*r],[i%3===1?10:6,35,2]);m.rotation.y=-a+Math.PI/2;}
scene.environment=pmrem.fromScene(env,.015).texture;for(const m of envObjects){m.geometry.dispose();(m.material as T.Material).dispose()}pmrem.dispose();
scene.add(new T.HemisphereLight('#fff9f0','#a4a79e',.7));
const sun=new T.DirectionalLight('#fff1e3',2.6);sun.position.set(-35,75,35);sun.target.position.set(0,20,0);scene.add(sun.target);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-44;sun.shadow.camera.right=44;sun.shadow.camera.top=44;sun.shadow.camera.bottom=-44;sun.shadow.camera.near=1;sun.shadow.camera.far=170;sun.shadow.normalBias=.045;sun.shadow.bias=-.0001;sun.shadow.radius=3;scene.add(sun);
const fill=new T.DirectionalLight('#d9eaff',.8);fill.position.set(40,45,-30);scene.add(fill);
const mats={
 copperWarm:new T.MeshPhysicalMaterial({color:visualUpgrade?'#d69b75':'#c08b70',metalness:1,roughness:visualUpgrade?.25:.17,envMapIntensity:visualUpgrade?1.1:.95,clearcoat:.25,clearcoatRoughness:.13}),
 copper:new T.MeshPhysicalMaterial({color:visualUpgrade?'#b97550':'#b77858',metalness:1,roughness:visualUpgrade?.22:.14,envMapIntensity:visualUpgrade?1.1:.95,clearcoat:.25,clearcoatRoughness:.12}),
 edge:new T.MeshStandardMaterial({color:'#d7c6b4',metalness:.95,roughness:.19,envMapIntensity:1}),
 tread:new T.MeshStandardMaterial({color:'#747676',metalness:.08,roughness:.82}),
 dark:new T.MeshStandardMaterial({color:'#51443f',metalness:.85,roughness:.28,envMapIntensity:.8}),
 stone:new T.MeshStandardMaterial({color:'#d4d4c9',roughness:.88}),
 glass:new T.MeshPhysicalMaterial({color:'#ffffff',metalness:0,roughness:visualUpgrade?.025:.045,transmission:visualUpgrade?1:.96,thickness:visualUpgrade?.006:.018,ior:visualUpgrade?1.45:1.5,transparent:true,opacity:1,depthWrite:false,side:T.DoubleSide,envMapIntensity:visualUpgrade?.55:.8})
};
type MatKey=keyof typeof mats;const bins:Record<MatKey,T.BufferGeometry[]>={copperWarm:[],copper:[],edge:[],tread:[],dark:[],stone:[],glass:[]};
function box(center:T.Vector3,size:Point,material:MatKey,angle=0){const g=new T.BoxGeometry(...size);const m=new T.Matrix4().compose(center,new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-angle),new T.Vector3(1,1,1));g.applyMatrix4(m);bins[material].push(g)}
function beam(a:T.Vector3,b:T.Vector3,width:number,depth:number,material:MatKey){const delta=b.clone().sub(a);const g=new T.BoxGeometry(width,depth,delta.length());const m=new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(delta.z,0,-delta.x).normalize(),delta.clone().normalize().cross(new T.Vector3(delta.z,0,-delta.x).normalize()),delta.clone().normalize())),new T.Vector3(1,1,1));g.applyMatrix4(m);bins[material].push(g)}
function rod(a:T.Vector3,b:T.Vector3,radius:number,material:MatKey){const delta=b.clone().sub(a);const g=new T.CylinderGeometry(radius,radius,delta.length(),8,1);g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()),new T.Vector3(1,1,1)));bins[material].push(g)}
function deckPoint(d:Deck,r:number,t:number,y=0){return new T.Vector3(d.center[0]+Math.cos(d.angle)*r-Math.sin(d.angle)*t,d.center[1]+y,d.center[2]+Math.sin(d.angle)*r+Math.cos(d.angle)*t)}
function rail(a:T.Vector3,b:T.Vector3,glass=true){const topA=a.clone().add(new T.Vector3(0,1.1,0)),topB=b.clone().add(new T.Vector3(0,1.1,0));rod(topA,topB,visualUpgrade?.022:.025,'edge');rod(a.clone().add(new T.Vector3(0,.14,0)),b.clone().add(new T.Vector3(0,.14,0)),.025,'dark');
 const n=Math.max(1,Math.ceil(a.distanceTo(b)/(visualUpgrade?1.8:1.15)));for(let i=0;i<=n;i++){const q=a.clone().lerp(b,i/n);rod(q,q.clone().add(new T.Vector3(0,1.1,0)),visualUpgrade?.011:.014,'edge')}
 if(glass){if(visualUpgrade)quad([a.clone().add(new T.Vector3(0,.18,0)),b.clone().add(new T.Vector3(0,.18,0)),b.clone().add(new T.Vector3(0,1.02,0)),a.clone().add(new T.Vector3(0,1.02,0))],'glass');else beam(a.clone().add(new T.Vector3(0,.6,0)),b.clone().add(new T.Vector3(0,.6,0)),.018,.84,'glass');}}
function quad(points:T.Vector3[],material:MatKey){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(q=>q.toArray()),3));g.setAttribute('uv',new T.Float32BufferAttribute(points.length===3?[0,0,1,0,.5,1]:[0,0,1,0,1,1,0,1],2));g.setIndex(points.length===3?[0,1,2]:[0,1,2,0,2,3]);g.computeVertexNormals();bins[material].push(g)}
function polygonSlab(points:T.Vector3[],depth:number,material:MatKey,drop=0){
 const shape=new T.Shape();points.forEach((q,i)=>i?shape.lineTo(q.x,q.z):shape.moveTo(q.x,q.z));shape.closePath();
 const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});g.setIndex(Array.from({length:g.getAttribute('position').count},(_,i)=>i));g.rotateX(Math.PI/2);g.translate(0,points[0].y-drop,0);bins[material].push(g);
}
for(const d of plan.platforms){
 const finish:MatKey=Math.floor(d.center[1]/6)%2?'copperWarm':'copper';
 const outline=d.outline.map(([r,t])=>deckPoint(d,r,t));
 polygonSlab(outline,d.thickness-.025,finish,.025);polygonSlab(outline,.025,'tread');
 for(let i=0;i<d.outline.length;i++){
  const [ra,ta]=d.outline[i], [rb,tb]=d.outline[(i+1)%d.outline.length];
  const a=deckPoint(d,ra,ta),b=deckPoint(d,rb,tb);
  // One continuous fascia datum wraps each polygon and meets the stair soffits.
  beam(a.clone().add(new T.Vector3(0,-.25,0)),b.clone().add(new T.Vector3(0,-.25,0)),.065,.44,finish);
  if(d.center[1]===0)continue;
  if(Math.abs(ta-tb)>.001){beam(a.clone().add(new T.Vector3(0,.14,0)),b.clone().add(new T.Vector3(0,.14,0)),.075,.30,finish);rail(a,b);continue;}
  const holes:number[][]=[];
  for(const f of plan.stairs){const q=f.from===d.id?f.start:f.to===d.id?f.end:null;if(!q)continue;
   const rx=q[0]-d.center[0],rz=q[2]-d.center[2],localT=-Math.sin(d.angle)*rx+Math.cos(d.angle)*rz;if(Math.abs(localT-ta)>.01)continue;
   const r=Math.cos(d.angle)*rx+Math.sin(d.angle)*rz;
   const dot=Math.abs((-Math.sin(d.angle)*(f.end[0]-f.start[0])+Math.cos(d.angle)*(f.end[2]-f.start[2]))/f.run);
   const half=f.width/(2*dot)+.07;holes.push([r-half,r+half]);
  }
  const loEdge=Math.min(ra,rb),hiEdge=Math.max(ra,rb);holes.sort((a,b)=>a[0]-b[0]);let start=loEdge;
  for(const [lo,hi] of [...holes,[hiEdge,hiEdge]]){if(lo-start>.06){const x=deckPoint(d,start,ta),y=deckPoint(d,Math.min(lo,hiEdge),ta);beam(x.clone().add(new T.Vector3(0,.14,0)),y.clone().add(new T.Vector3(0,.14,0)),.075,.30,finish);rail(x,y);}start=Math.max(start,hi);}
 }
}
for(const junction of plan.junctions){
 const shape=new T.Shape();junction.points.forEach((q,i)=>i?shape.lineTo(q[0],q[2]):shape.moveTo(q[0],q[2]));shape.closePath();
 for(const [depth,key] of [[junction.thickness-.025,'copper'],[.025,'tread']] as const){const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1});geometry.setIndex(Array.from({length:geometry.getAttribute('position').count},(_,i)=>i));geometry.rotateX(Math.PI/2);geometry.translate(0,junction.points[0][1]-(key==='copper'?.025:0),0);bins[key].push(geometry);}
}
for(const s of plan.stairs){const a=v(s.start),b=v(s.end);const along=new T.Vector3(b.x-a.x,0,b.z-a.z).normalize();const across=new T.Vector3(-along.z,0,along.x);const angle=Math.atan2(along.z,along.x);const going=s.run/s.steps, rise=s.rise/s.steps;
 for(let i=0;i<s.steps;i++){const q=a.clone().addScaledVector(along,(i+.5)*going);q.y=a.y+(i+1)*rise-.075;box(q,[going+.008,.15,s.width],'tread',angle);const edge=q.clone().addScaledVector(along,-going/2+.022);edge.y+=.076;box(edge,[.04,.014,s.width-.035],'edge',angle)}
 // Folded copper soffit and deep side fascias turn each flight into a solid architectural module.
 beam(a.clone().add(new T.Vector3(0,-.29,0)),b.clone().add(new T.Vector3(0,-.29,0)),s.width,.40,'dark');
 if(isReconstruction)beam(a.clone().add(new T.Vector3(0,-.48,0)),b.clone().add(new T.Vector3(0,-.48,0)),s.width,.02,'copper');
 for(const side of [-1,1]){const sa=a.clone().addScaledVector(across,side*(s.width/2+.025)),sb=b.clone().addScaledVector(across,side*(s.width/2+.025));beam(sa.clone().add(new T.Vector3(0,-.08,0)),sb.clone().add(new T.Vector3(0,-.08,0)),.10,.78,isReconstruction&&!visualUpgrade&&sa.clone().add(sb).dot(across)*side<0?'dark':Math.floor(a.y/6)%2?'copperWarm':'copper');rail(sa,sb);}
}
// Lightweight visual skins stay outside the circulation graph and below walkable surfaces.
if(visualUpgrade){mats.copper.side=T.DoubleSide;mats.copperWarm.side=T.DoubleSide;for(const panel of envelope.panels)quad(panel.points.map(v),panel.material as MatKey);}
// Ground-level access apron. Its surface is flush with the entrance landings.
const plaza=new T.Mesh(new T.RingGeometry(4.5,29,128),mats.stone);plaza.rotation.x=-Math.PI/2;plaza.position.y=-.012;plaza.receiveShadow=true;scene.add(plaza);
const floor=new T.Mesh(new T.PlaneGeometry(600,600),new T.MeshStandardMaterial({color:'#e4e2d7',roughness:.94}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;floor.receiveShadow=true;scene.add(floor);
for(const radius of [4.6,28.6,29]){const ring=new T.Mesh(new T.TorusGeometry(radius,.025,4,160),mats.dark);ring.rotation.x=Math.PI/2;ring.position.y=.006;scene.add(ring)}
// Paving joints establish scale without decorative city geometry.
for(let i=0;i<48;i++){const a=i*Math.PI/24;beam(new T.Vector3(Math.cos(a)*4.6,-.004,Math.sin(a)*4.6),new T.Vector3(Math.cos(a)*28.6,-.004,Math.sin(a)*28.6),.014,.007,'dark')}
for(const k of Object.keys(bins) as MatKey[]){const gs=bins[k];if(!gs.length)continue;const merged=mergeGeometries(gs,false);if(!merged)throw Error(`Could not merge ${k}`);const mesh=new T.Mesh(merged,mats[k]);mesh.castShadow=k!=='glass';mesh.receiveShadow=true;mesh.name=k;scene.add(mesh);for(const g of gs)g.dispose();}
// Route is derived directly from the graph IDs; no independent decorative route.
const byId=new Map(plan.platforms.map(d=>[d.id,d]));const routePoints:T.Vector3[]=[v(plan.entrance.point),v(byId.get(plan.entrance.platform)!.center)];
for(const id of plan.route.stairs){const s=plan.stairs.find(s=>s.id===id)!;routePoints.push(v(s.start));for(let i=1;i<=s.steps;i++){const q=v(s.start).lerp(v(s.end),i/s.steps);routePoints.push(q)}routePoints.push(v(byId.get(s.to)!.center));}
routePoints.push(deckPoint(byId.get(plan.route.platforms.at(-1)!)!,1.1,0));
const path=new T.Group();path.visible=false;scene.add(path);const pathMat=new T.MeshBasicMaterial({color:'#d56b20',toneMapped:false});
for(let i=1;i<routePoints.length;i++){const a=routePoints[i-1].clone().add(new T.Vector3(0,.21,0)),b=routePoints[i].clone().add(new T.Vector3(0,.21,0));const delta=b.clone().sub(a);const mesh=new T.Mesh(new T.CylinderGeometry(.065,.065,delta.length(),6),pathMat);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());path.add(mesh)}
for(const id of plan.route.platforms){const d=byId.get(id)!;const dot=new T.Mesh(new T.RingGeometry(.28,.39,32),pathMat);dot.rotation.x=-Math.PI/2;dot.position.copy(v(d.center)).y+=.04;path.add(dot)}
// Batch every static route segment and marker into one draw call.
const routeGeometries:T.BufferGeometry[]=[];
for(const child of [...path.children]){const mesh=child as T.Mesh;mesh.updateMatrix();const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);routeGeometries.push(g);mesh.geometry.dispose();path.remove(mesh)}
const routeMerged=mergeGeometries(routeGeometries,false);if(routeMerged)path.add(new T.Mesh(routeMerged,pathMat));for(const g of routeGeometries)g.dispose();
const beacon=new T.Mesh(new T.SphereGeometry(.13,12,8),new T.MeshStandardMaterial({color:'#fff4ce',emissive:'#ffd47e',emissiveIntensity:1.8}));path.add(beacon);
const cumulative=[0];for(let i=1;i<routePoints.length;i++)cumulative.push(cumulative.at(-1)!+routePoints[i-1].distanceTo(routePoints[i]));const routeLength=cumulative.at(-1)!;const tourDuration=Math.max(85,routeLength/1.15);
function pointAt(distance:number){const d=T.MathUtils.clamp(distance,0,routeLength);let i=cumulative.findIndex(x=>x>=d);if(i<1)i=1;const len=cumulative[i]-cumulative[i-1];return routePoints[i-1].clone().lerp(routePoints[i],len?(d-cumulative[i-1])/len:0)}
let view='exterior';let tour=false;let tourElapsed=0;let transition:null|{start:number,duration:number,positions:T.Vector3[],a:T.Vector3,b:T.Vector3,onDone?:()=>void,fromFov:number,toFov:number}=null;let pathEnabled=false;let ready=true;
const dollyKeys=new Set<string>();let preciseDolly=false;
let zoomGoal=0,zoomVelocity=0,zoomActive=false;let framingOffset=innerWidth>700?.02:0;
function cancelZoom(){dollyKeys.clear();zoomActive=false;zoomVelocity=0;zoomGoal=Math.log(Math.max(controls.minDistance,camera.position.distanceTo(controls.target)));}
function owner(){return transition?'preset':tour?'tour':'manual';}
const presets={exterior:{pos:new T.Vector3(70,56,74),target:new T.Vector3(0,22,0)},interior:{pos:new T.Vector3(0,9.6,0),target:new T.Vector3(-8,30,-5)},top:{pos:new T.Vector3(.05,100,.05),target:new T.Vector3(0,22,0)}};
function stopTour(){cancelZoom();tour=false;paused=false;$('tour-status').hidden=true;$('tour').innerHTML='<span>▶</span> Explore the Route';controls.enabled=true;}
function setPath(enabled:boolean){pathEnabled=enabled;path.visible=enabled;$('path').setAttribute('aria-pressed',String(enabled));}
function flushControls(){const position=camera.position.clone(),target=controls.target.clone(),damping=controls.enableDamping;controls.enableDamping=false;controls.update();camera.position.copy(position);controls.target.copy(target);controls.update();controls.enableDamping=damping;cancelZoom();}

function beginTransition(position:T.Vector3,target:T.Vector3,duration=2.6,onDone?:()=>void,overhead=false,fromFov=camera.fov){flushControls();const a=camera.position.clone(),positions=[a];if(overhead){positions.push(new T.Vector3(a.x,56,a.z),new T.Vector3(position.x,56,position.z))}positions.push(position);transition={start:performance.now(),duration,positions,a:controls.target.clone(),b:target.clone(),onDone,fromFov,toFov:camera.fov};camera.fov=fromFov;camera.updateProjectionMatrix();controls.enabled=false;}
function linearPoints(points:T.Vector3[],t:number){const lengths=points.slice(1).map((p,i)=>p.distanceTo(points[i])),total=lengths.reduce((a,b)=>a+b,0);let distance=t*total;for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const u=lengths[i]?T.MathUtils.clamp(distance/lengths[i],0,1):1;return points[i].clone().lerp(points[i+1],u*u*u*(u*(u*6-15)+10));}distance-=lengths[i]}return points.at(-1)!.clone();}

function setView(name:keyof typeof presets,instant=false){const previousView=view,previousFov=camera.fov;flushControls();stopTour();view=name;controls.maxPolarAngle=name==='interior'?Math.PI*.95:Math.PI*.495;camera.fov=name==='interior'?74:43;camera.updateProjectionMatrix();document.body.classList.toggle('interior',name==='interior');document.body.classList.toggle('overhead',name==='top');const viewport=$('scene').getBoundingClientRect();renderer.setSize(viewport.width,viewport.height);camera.aspect=viewport.width/viewport.height;camera.updateProjectionMatrix();for(const n of ['exterior','interior','top']){$(n).classList.toggle('active',name===n);$(n).setAttribute('aria-pressed',String(name===n))}
 $('view-label').textContent={exterior:'EXPLORE THE STRUCTURE',interior:'INSIDE VESSEL',top:'THE SPATIAL NETWORK'}[name];$('view-copy').innerHTML={exterior:'A remarkable network of stairways, platforms, and open space.',interior:'Look up. Discover how every level connects.',top:'One structure. Multiple paths. Endless perspectives.'}[name];
 const p=presets[name];const destination=p.pos.clone();if(name==='exterior'||name==='top'){const delta=destination.clone().sub(p.target);const vertical=T.MathUtils.degToRad(camera.fov/2),half=Math.min(vertical,Math.atan(Math.tan(vertical)*camera.aspect));const fit=name==='top'?44.9-p.target.y+(isReconstruction?35:27)/Math.tan(half):39/Math.sin(half);destination.copy(p.target).add(delta.setLength(Math.max(delta.length(),fit)/(name==='exterior'&&innerWidth>760?1.12:1)));}if(instant){transition=null;controls.enabled=true;camera.position.copy(destination);lastClearCamera.copy(destination);controls.target.copy(p.target);controls.update()}else beginTransition(destination,p.target,name==='interior'?(previousView==='interior'?1.2:4):3,undefined,(name==='interior'||previousView==='interior')&&(previousView!==name||Math.hypot(camera.position.x,camera.position.z)>plan.centralVoid.minimumRadius-1),previousFov);}
for(const name of ['exterior','interior','top'] as const)$(name).onclick=()=>{reviewCamera=null;setView(name)};
$('path').onclick=()=>setPath(!pathEnabled);
function startTour(){const previousFov=camera.fov;reviewCamera=null;stopTour();transition=null;setPath(true);view='tour';controls.maxPolarAngle=Math.PI*.95;camera.fov=74;camera.updateProjectionMatrix();document.body.classList.add('interior');document.body.classList.remove('overhead');renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();for(const n of ['exterior','interior','top']){$(n).classList.remove('active');$(n).setAttribute('aria-pressed','false')}
 $('view-label').textContent='INSIDE VESSEL';$('view-copy').textContent='Look up. Discover how every level connects.';$('tour-status').hidden=false;$('tour').innerHTML='<span>Ⅱ</span> Stop Route';const start=pointAt(0).add(new T.Vector3(0,1.6,0));beginTransition(start,pointAt(3).add(new T.Vector3(0,1.4,0)),8,()=>{tour=true;tourElapsed=0},false,previousFov);transition!.positions=[camera.position.clone(),new T.Vector3(camera.position.x,56,camera.position.z),new T.Vector3(34,56,0),new T.Vector3(34,1.6,0),start];}
$('tour').onclick=()=>{if(tour||view==='tour'){transition=null;stopTour();view='interior'}else startTour()};$('tour-stop').onclick=()=>{transition=null;stopTour();view='interior'};
$('level').addEventListener('keydown',event=>event.stopPropagation());
$('level').oninput=()=>{reviewCamera=null;const height=Number(($('level') as HTMLInputElement).value);$('level-value').textContent=`${height.toFixed(1)} m`;presets.interior.pos.set(0,height,0);presets.interior.target.set(-8,Math.min(height+20.4,plan.levels.at(-1)!),-5);setView('interior');};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen()};document.querySelector('.brand')!.addEventListener('click',e=>{e.preventDefault();setView('exterior')});
function takeManualControl(){reviewCamera=null;controls.maxPolarAngle=Math.PI*.95;if(transition||tour||view==='tour'){transition=null;stopTour();flushControls();view=document.body.classList.contains('overhead')?'top':document.body.classList.contains('interior')?'interior':'exterior';}controls.enabled=true;lastClearCamera.copy(camera.position);lastClearTarget.copy(controls.target);}
// Capture-phase input runs before OrbitControls' disabled-state check.
renderer.domElement.tabIndex=0;
renderer.domElement.addEventListener('pointerdown',()=>{renderer.domElement.focus({preventScroll:true});takeManualControl();},{capture:true});
window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&!(e.target instanceof HTMLInputElement)&&!(e.target instanceof HTMLSelectElement))takeManualControl();},{capture:true});
controls.addEventListener('start',()=>{reviewCamera=null;});
function requestZoom(logDelta:number){takeManualControl();const current=Math.log(camera.position.distanceTo(controls.target));if(!zoomActive){zoomGoal=current;zoomVelocity=0;}zoomGoal=T.MathUtils.clamp(zoomGoal+logDelta,Math.max(Math.log(controls.minDistance),current-.45),Math.min(Math.log(controls.maxDistance),current+.45));zoomActive=true;}
// Held-key dolly uses the same distance spring; it never takes camera ownership.
function inForm(element:EventTarget|null){return element instanceof Element&&!!element.closest('input,textarea,select,button,option,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="slider"]');}
window.addEventListener('keydown',e=>{
 if(e.isComposing||e.metaKey||e.ctrlKey||e.altKey||inForm(e.target)||inForm(document.activeElement)||owner()!=='manual')return;
 const key=e.key.toLowerCase();preciseDolly=e.shiftKey;
 if(key==='w'||key==='s'){e.preventDefault();dollyKeys.add(key);reviewCamera=null;}
 else if(key==='r'){e.preventDefault();if(!e.repeat){dollyKeys.clear();reviewCamera=null;setView('exterior');}}
});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(dollyKeys.has(key)){e.preventDefault();dollyKeys.delete(key);}preciseDolly=e.shiftKey;});
function releaseKeyboard(){dollyKeys.clear();preciseDolly=false;}
window.addEventListener('blur',()=>{releaseKeyboard();cancelZoom();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseKeyboard();cancelZoom();}});
document.addEventListener('focusin',e=>{if(inForm(e.target)){releaseKeyboard();cancelZoom();}});
function updateManualDolly(dt:number){
 // Small bounded integration steps make a moving target consistent across frame rates.
 const steps=Math.max(1,Math.ceil(dt*120)),step=dt/steps;
 for(let i=0;i<steps;i++){
  const direction=Number(dollyKeys.has('s'))-Number(dollyKeys.has('w'));
  if(direction&&!inForm(document.activeElement)){
   if(!zoomActive){zoomGoal=Math.log(camera.position.distanceTo(controls.target));zoomVelocity=0;}
   zoomGoal=T.MathUtils.clamp(zoomGoal+direction*(preciseDolly?.07:.35)*step,Math.log(controls.minDistance),Math.log(controls.maxDistance));zoomActive=true;
  }
  updateZoom(step);
 }
}
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();requestZoom(wheelPixels(e.deltaY,e.deltaMode,renderer.domElement.clientHeight,e.ctrlKey)*.0015);},{passive:false});
// Native touch pinch shares the same distance spring; OrbitControls retains two-finger pan.
const touchPoints=new Map<number,T.Vector2>();let pinchDistance=0;
renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){touchPoints.set(e.pointerId,new T.Vector2(e.clientX,e.clientY));if(touchPoints.size===2){const p=[...touchPoints.values()];pinchDistance=p[0].distanceTo(p[1]);}}});
renderer.domElement.addEventListener('pointermove',e=>{if(!touchPoints.has(e.pointerId))return;touchPoints.set(e.pointerId,new T.Vector2(e.clientX,e.clientY));if(touchPoints.size===2){const p=[...touchPoints.values()],next=p[0].distanceTo(p[1]);if(pinchDistance>0&&next>0)requestZoom(Math.log(pinchDistance/next));pinchDistance=next;}});
for(const event of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(event,e=>{touchPoints.delete((e as PointerEvent).pointerId);pinchDistance=0;});
function updateZoom(dt:number){if(!zoomActive)return;const offset=camera.position.clone().sub(controls.target),current=Math.log(offset.length());const [next,velocity]=zoomStep(current,zoomVelocity,zoomGoal,dt);zoomVelocity=velocity;camera.position.copy(controls.target).add(offset.setLength(Math.exp(next)));if(Math.abs(next-zoomGoal)<1e-5&&Math.abs(velocity)<1e-4)cancelZoom();}

function resize(){const rect=$('scene').getBoundingClientRect(),w=rect.width,h=rect.height;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(w>700&&view==='exterior')camera.setViewOffset(w,h,-w*.02,0,w,h);else camera.clearViewOffset();if(view==='exterior'||view==='top')setView(view,true)}
addEventListener('resize',resize);
let tourFrameDt=1/60;
function updateTour(fraction:number){const d=fraction*routeLength;camera.position.copy(pointAt(d)).y+=1.6;let target=pointAt(Math.min(routeLength,d+3.4));target.y+=1.65; if(!clearCameraMove(camera.position.toArray(),target.toArray(),plan,.12)){target=pointAt(Math.min(routeLength,d+1.5));target.y+=1.65;}if(d>routeLength-1){target=camera.position.clone().add(new T.Vector3(-3,-.3,-3))}controls.target.lerp(target,1-Math.exp(-tourFrameDt*4));camera.lookAt(controls.target);$('tour-progress').setAttribute('value',String(fraction));$('tour-stage').textContent=`${fraction<.06?'Entrance':`Level ${String(Math.max(1,plan.levels.filter(y=>y<=camera.position.y-1.6+1e-6).length)).padStart(2,'0')}`} · ${Math.round(fraction*100)}%`;$('elevation').textContent=`${(camera.position.y-1.6).toFixed(1)} m`;}
let cameraBlocks=0;const lastClearCamera=camera.position.clone(),lastClearTarget=controls.target.clone();
function guardCamera(){
 if(tour||transition){lastClearCamera.copy(camera.position);lastClearTarget.copy(controls.target);return;}
 if(!clearCameraMove(lastClearCamera.toArray(),camera.position.toArray(),plan)){
  const candidate=camera.position.clone(),target=controls.target.clone();let lo=0,hi=1;for(let i=0;i<12;i++){const m=(lo+hi)/2;if(clearCameraMove(lastClearCamera.toArray(),lastClearCamera.clone().lerp(candidate,m).toArray(),plan))lo=m;else hi=m;}camera.position.copy(lastClearCamera).lerp(candidate,lo);controls.target.copy(lastClearTarget).lerp(target,lo);flushControls();camera.lookAt(controls.target);cameraBlocks++;lastClearCamera.copy(camera.position);lastClearTarget.copy(controls.target);
 }else{lastClearCamera.copy(camera.position);lastClearTarget.copy(controls.target);}
}
const diagnostic=document.createElement('output');diagnostic.id='runtime-state';diagnostic.hidden=true;document.body.appendChild(diagnostic);
let last=performance.now();let frames=0;let fps=0;let fpsStart=last;let paused=false;
function animate(now:number){const elapsedFrame=Math.min((now-last)/1000,.25),dt=Math.min(elapsedFrame,.06);last=now;tourFrameDt=dt;controls.dampingFactor=1-Math.exp(-8*dt);resizeOffset(dt);
 if(transition){const elapsed=(now-transition.start)/1000;const t=T.MathUtils.clamp(elapsed/transition.duration,0,1),smooth=t*t*(3-2*t);camera.position.copy(linearPoints(transition.positions,t));camera.fov=T.MathUtils.lerp(transition.fromFov,transition.toFov,smooth);camera.updateProjectionMatrix();controls.target.copy(transition.a).lerp(transition.b,smooth);camera.lookAt(controls.target);if(t===1){const done=transition.onDone;transition=null;controls.enabled=true;done?.()}}
 else if(tour){if(!paused)tourElapsed+=dt;const fraction=Math.min(tourElapsed/tourDuration,1);updateTour(fraction);controls.enabled=false;if(fraction===1){tour=false;controls.enabled=true;$('tour').innerHTML='<span>↻</span> Replay the Route';view='interior';}}
 else{controls.update();updateManualDolly(elapsedFrame);camera.lookAt(controls.target);if(view!=='tour')$('elevation').textContent=view==='exterior'?`${plan.parameters.overallHeight.toFixed(1)} m`:`${camera.position.y.toFixed(1)} m`}
 $('elevation-label').textContent=view==='exterior'?'BUILDING HEIGHT':view==='tour'?'ROUTE ELEVATION':'CAMERA ALTITUDE';if(view==='exterior')$('elevation').textContent=`${plan.parameters.overallHeight.toFixed(1)} m`;else if(view!=='tour')$('elevation').textContent=`${camera.position.y.toFixed(1)} m`;
 if(path.visible)beacon.position.copy(pointAt(((now/1000)*2)%routeLength)).y+=.27;
 guardCamera();if(reviewCamera){reviewCamera.left=-35*camera.aspect;reviewCamera.right=35*camera.aspect;reviewCamera.updateProjectionMatrix()}renderer.render(scene,reviewCamera??camera);diagnostic.textContent=JSON.stringify({controlOwner:owner(),dollyKeys:[...dollyKeys],preciseDolly,fov:camera.fov,zoomActive,zoomDistance:camera.position.distanceTo(controls.target),zoomGoal:Math.exp(zoomGoal),distanceLimits:[controls.minDistance,controls.maxDistance],visualUpgrade,decorativePanels:visualUpgrade?envelope.panels.length:0,captureElevation:reviewCamera?captureElevation:null,cameraBlocks,cameraClear:cameraClear(camera.position.toArray(),plan),view,tour,transition:!!transition,pathVisible:path.visible,camera:camera.position.toArray(),target:controls.target.toArray(),fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,tourElapsed,tourDuration,routeLength});frames++;if(now-fpsStart>1000){fps=frames*1000/(now-fpsStart);frames=0;fpsStart=now}requestAnimationFrame(animate);}
function resizeOffset(dt=1/60){const target=innerWidth>700&&view==='exterior'?.02:0;framingOffset=T.MathUtils.lerp(framingOffset,target,1-Math.exp(-7*dt));if(framingOffset>1e-6)camera.setViewOffset(innerWidth,innerHeight,-innerWidth*framingOffset,0,innerWidth,innerHeight);else camera.clearViewOffset();}

resize();setView('exterior',true);controls.update();$('loading').remove();requestAnimationFrame(animate);
// Diagnostic API supports reproducible local verification and exported screenshots.
Object.assign(window,{vessel:{ready,plan,routeLength,routePoints:routePoints.map(q=>q.toArray()),get state(){return {view,tour,transition:!!transition,pathVisible:path.visible,camera:camera.position.toArray(),target:controls.target.toArray(),fps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}},setView:(n:keyof typeof presets,instant=false)=>setView(n,instant),setPath,startTour,seekTour:(t:number)=>{transition=null;tour=true;view='tour';tourElapsed=T.MathUtils.clamp(t,0,1)*tourDuration;paused=true;updateTour(t)},resumeTour:()=>{paused=false},capture:()=>renderer.domElement.toDataURL('image/png')}});

// Version comparison preserves the complete working Phase 5 geometry and navigation data.
const versionSelector=$('geometry-version') as HTMLSelectElement;versionSelector.value=visualUpgrade?'phase8':isReconstruction?'phase6':'phase5';
versionSelector.onchange=()=>{const url=new URL(location.href);url.searchParams.set('version',versionSelector.value==='phase5'?'phase5':'phase6');if(versionSelector.value==='phase6')url.searchParams.set('finish','phase6');else url.searchParams.delete('finish');location.assign(url.toString())};
const counts=[plan.levels.length,plan.stairs.length,plan.platforms.filter(p=>p.kind==='observation').length,plan.platforms.filter(p=>p.kind==='rest').length];
document.querySelectorAll('.stats strong').forEach((node,i)=>node.textContent=String(counts[i]));
document.querySelector('#tour-status > span')!.textContent=`Continuous route · ${plan.route.stairs.length} flights · ${plan.levels.length} elevations`;
// Reproducible review views use the same camera presets and live geometry as the controls.
const reviewPreset=new URLSearchParams(location.search).get('capture');
if(reviewPreset==='top'){reviewCamera=null;setView('top',true);setPath(true)}
if(reviewPreset==='interior'){reviewCamera=null;setView('interior',true)}
