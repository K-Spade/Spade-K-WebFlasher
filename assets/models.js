import * as THREE from './vendor/three/three.module.js';

const COLORS = {black:0x111512, pcb:0x101b15, edge:0x2d3830, metal:0x9ca8a0, gold:0xd3a765, green:0x60fc56, glass:0x07110f};
const mat = (color, extra={}) => new THREE.MeshStandardMaterial({color, roughness:.48, metalness:.24, ...extra});
const materials = {
  black:mat(COLORS.black),pcb:mat(COLORS.pcb),edge:mat(COLORS.edge),
  face:mat(0x18221b,{roughness:.72,metalness:.08}),recess:mat(0x080c0a,{roughness:.9}),
  metal:mat(COLORS.metal,{metalness:.72}),screw:mat(0x626c67,{roughness:.48,metalness:.65}),
  gold:mat(COLORS.gold,{metalness:.72}),green:mat(COLORS.green,{emissive:0x1e5b18,emissiveIntensity:.3}),
  glass:mat(COLORS.glass,{metalness:.35,roughness:.17}),button:mat(0x353d36,{roughness:.68}),red:mat(0x9c3c2f,{roughness:.62})
};
const sharedMaterials=new Set(Object.values(materials));

function box(parent,w,h,d,x,y,z,material=materials.black) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
function cylinder(parent,r1,r2,h,x,y,z,material=materials.black,rotation=0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,12),material);
  mesh.position.set(x,y,z); mesh.rotation.z=rotation; parent.add(mesh); return mesh;
}
function faceDisc(parent,r,depth,x,y,z,material,segments=24) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,depth,segments),material);
  mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function roundedShape(w,h,r) {
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);s.closePath();return s;
}
function roundedBox(parent,w,h,d,x,y,z,material,r=.04) {
  const bevel=Math.min(.012,d/5);
  const geometry=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth:d-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:6});
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z-d/2+bevel);parent.add(mesh);return mesh;
}
function line(parent,points,color=COLORS.green,opacity=.45) {
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
  const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity}));parent.add(mesh);
}
function texture(lines,accent=COLORS.green) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const c=canvas.getContext('2d');c.fillStyle='#07110f';c.fillRect(0,0,512,512);
  c.strokeStyle='#244f38';c.lineWidth=3;c.strokeRect(12,12,488,488);
  c.fillStyle='#60fc56';c.font='bold 24px monospace';c.fillText(lines[0]||'SPADE K',32,55);
  c.strokeStyle='#234533';c.beginPath();c.moveTo(27,76);c.lineTo(485,76);c.stroke();
  for(let i=0;i<4;i++) {c.fillStyle=i===0?'#143a21':'#12231b';c.fillRect(32,105+i*86,448,62);c.strokeStyle=i===0?'#60fc56':'#3a5d44';c.strokeRect(32,105+i*86,448,62);c.fillStyle=i===0?'#d3ffca':'#8fae9a';c.font='23px monospace';c.fillText(lines[i+1]||['WiFi','Bluetooth','Tools','Settings'][i],52,143+i*86);}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;
}
function labelTexture(text) {
  const rows=text.split('\n'),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=rows.length>1?208:160;
  const c=canvas.getContext('2d');c.fillStyle='#e6f3df';c.textAlign='center';
  const maxWidth=920;
  let size=rows.length>1?83:108;
  while(size>54){c.font=`700 ${size}px monospace`;if(rows.every(row=>c.measureText(row).width<=maxWidth))break;size-=3;}
  const lineHeight=rows.length>1?88:120;
  rows.forEach((row,i)=>{c.font=`700 ${size}px monospace`;c.fillText(row,512,rows.length>1?79+i*lineHeight:118);});
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}
function label(parent,text,w,h,x,y,z,back=false) {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:labelTexture(text),transparent:true,depthWrite:false,side:THREE.DoubleSide}));
  mesh.position.set(x,y,z);if(back)mesh.rotation.y=Math.PI;parent.add(mesh);
}
function screw(parent,x,y,z) {
  faceDisc(parent,.072,.012,x,y,z,materials.recess);
  faceDisc(parent,.049,.009,x,y,z+.011,materials.screw);
  box(parent,.045,.009,.003,x,y,z+.018,materials.recess);
}
// Visual interpretation of the owner's reference photo; not a wiring diagram.
function nrf24Jammer(g) {
  const baseZ=.08;
  roundedBox(g,3.42,2.55,.14,0,-.03,0,materials.black,.18);
  roundedBox(g,3.34,2.47,.012,0,-.03,baseZ,materials.pcb,.14);
  for(const x of [-1.55,1.55])for(const y of [-1.14,1.08])screw(g,x,y,.09);

  // Central ESP32 DEV board, metal RF shield, USB socket and two buttons.
  roundedBox(g,1.11,2.18,.09,0,.04,.15,materials.edge,.045);
  roundedBox(g,1.04,2.11,.014,0,.04,.203,materials.pcb,.025);
  roundedBox(g,.78,.83,.075,0,.59,.255,materials.metal,.025);
  label(g,'ESP32',.64,.19,0,.64,.299);
  label(g,'DEV',.44,.11,0,.43,.299);
  box(g,.36,.31,.055,0,-.56,.249,materials.black);
  for(const x of [-.46,.46])for(let i=0;i<18;i++) {
    const y=-.91+i*.111;
    faceDisc(g,.035,.024,x,y,.23,materials.metal,12);
    faceDisc(g,.016,.026,x,y,.245,materials.recess,10);
  }
  for(let i=0;i<5;i++) {
    box(g,.064,.13,.026,-.3+i*.15,-.18,.236,materials.metal);
    box(g,.044,.095,.029,-.3+i*.15,-.18,.257,materials.face);
  }
  for(const x of [-.23,.23])for(let i=0;i<6;i++)box(g,.043,.025,.021,x,-.7+i*.048,.25,materials.metal);
  button(g,-.34,-.9,.235,.055);button(g,.34,-.9,.235,.055);
  label(g,'EN',.16,.065,-.34,-.76,.25);label(g,'BOOT',.22,.065,.34,-.76,.25);
  roundedBox(g,.4,.31,.14,0,-1.01,.28,materials.metal,.025);
  roundedBox(g,.29,.2,.012,0,-1,.356,materials.edge,.02);
  box(g,.1,.09,.012,0,-.98,.366,materials.black);
  const usb=new THREE.Group();usb.position.set(0,.02,.28);g.add(usb);port(usb,-1.11);

  // Two narrow radio daughterboards, matching the photo's symmetric layout.
  for(const x of [-1.12,1.12]) {
    roundedBox(g,.69,1.81,.075,x,.19,.15,materials.edge,.026);
    roundedBox(g,.64,1.76,.01,x,.19,.194,materials.pcb,.015);
    box(g,.25,.25,.032,x,.1,.224,materials.black);
    box(g,.22,.2,.032,x,-.4,.224,materials.black);
    for(let i=0;i<5;i++)for(const side of [-1,1]) {
      box(g,.037,.023,.014,x+side*.147,.012+i*.043,.23,materials.metal);
      box(g,.032,.022,.014,x+side*.131,-.476+i*.035,.23,materials.metal);
    }
    for(let i=0;i<7;i++) {
      const cx=x+(i%2?-.23:.23), cy=.63-i*.172;
      box(g,.09,.047,.019,cx,cy,.215,materials.metal);
      box(g,.048,.037,.022,cx,cy,.228,materials.face);
    }
    box(g,.12,.18,.025,x+.21,-.43,.22,materials.metal);
    for(const dx of [-.2,0,.2])for(const y of [-.57,-.69])faceDisc(g,.035,.025,x+dx,y,.219,materials.metal,12);
    for(const dx of [-.26,.26])faceDisc(g,.036,.019,x+dx,.99,.21,materials.metal,12);
    label(g,'NRF24',.45,.09,x,-.48,.247);
  }

  // Three bare gold SMA connectors: no invented rubber antennas or display.
  for(const x of [-1.12,0,1.12]) {
    const connectorZ=x===0?.13:.25;
    box(g,.28,.22,.09,x,1.015,connectorZ,materials.gold);
    cylinder(g,.112,.112,.19,x,1.14,connectorZ,materials.gold);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.105,6),materials.gold);
    nut.position.set(x,1.205,connectorZ);g.add(nut);
    cylinder(g,.1,.1,.32,x,1.39,connectorZ,materials.gold);
    for(let j=0;j<7;j++)cylinder(g,.111,.111,.016,x,1.255+j*.041,connectorZ,materials.gold);
    cylinder(g,.069,.069,.008,x,1.555,connectorZ,materials.recess);
    cylinder(g,.022,.022,.012,x,1.561,connectorZ,materials.gold);
  }

  // Bottom edge has two rows of exposed header pins.
  for(const cx of [-.88,.88]) {
    box(g,.88,.12,.1,cx,-1.13,.145,materials.black);
    for(let i=0;i<8;i++) {
      const x=cx-.3675+i*.105;
      faceDisc(g,.029,.017,x,-1.13,.211,materials.metal,10);
      box(g,.026,.46,.026,x,-1.4,.11,materials.metal);
    }
  }
  for(const x of [-1.52,1.52]) {
    const textGroup=new THREE.Group();textGroup.position.set(x,0,.1);textGroup.rotation.z=x<0?Math.PI/2:-Math.PI/2;g.add(textGroup);
    label(textGroup,'NRF24 JAMMER',1.62,.18,0,0,.01);
  }
  label(g,'SPADE K',.58,.09,0,-1.2,.09);
}
function plate(parent,w,h,caseDepth=.18,cased=false) {
  const body=roundedBox(parent,w,h,caseDepth,0,0,0,cased?materials.black:materials.pcb,.09);
  roundedBox(parent,w-.08,h-.08,.015,0,0,caseDepth/2+.012,cased?materials.face:materials.pcb,.07);
  for(const x of [-w/2+.14,w/2-.14])for(const y of [-h/2+.14,h/2-.14])screw(parent,x,y,caseDepth/2+.035);
  return body;
}
function antenna(parent,x,top,length=.95,thick=.085) {
  cylinder(parent,thick*1.35,thick*1.35,.13,x,top+.07,0,materials.gold);
  cylinder(parent,thick,thick*1.15,length,x,top+.16+length/2,0,materials.black);
  cylinder(parent,thick*.91,thick*.91,.035,x,top+.16+length*.89,0,materials.edge);
}
function screen(parent,w,h,x,y,z,lines) {
  roundedBox(parent,w+.16,h+.16,.035,x,y,z,materials.recess,.055);
  roundedBox(parent,w+.045,h+.045,.015,x,y,z+.027,materials.edge,.025);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture(lines),toneMapped:false}));face.position.set(x,y,z+.037);parent.add(face);
}
function button(parent,x,y,z,r=.09,color=materials.button) {
  const outer=r*2.55,cap=r*1.72;
  roundedBox(parent,outer+.035,outer+.035,.012,x,y,z-.018,materials.screw,r*.38);
  roundedBox(parent,outer,outer,.031,x,y,z,materials.recess,r*.35);
  roundedBox(parent,cap,cap,.035,x,y,z+.03,color,r*.3);
  roundedBox(parent,cap*.68,cap*.68,.007,x,y,z+.052,color,r*.18);
}
function port(parent,bottom) {
  const socket=new THREE.Group();socket.position.set(0,bottom+.014,0);socket.rotation.x=Math.PI/2;parent.add(socket);
  // The connector face is in the XZ plane; its outward normal points down.
  roundedBox(socket,.57,.25,.045,0,0,-.007,materials.edge,.095);
  roundedBox(socket,.37,.12,.008,0,0,.019,materials.recess,.055);
  const rim=roundedShape(.48,.19,.08);
  const opening=new THREE.Path(roundedShape(.35,.105,.047).getPoints(12).reverse());opening.closePath();rim.holes.push(opening);
  const shell=new THREE.Mesh(new THREE.ExtrudeGeometry(rim,{depth:.012,bevelEnabled:false,curveSegments:12}),materials.screw);
  shell.position.z=.022;socket.add(shell);
  roundedBox(socket,.17,.019,.003,0,-.006,.023,materials.gold,.008);
}
function sideSMA(parent,w,y) {
  const x=w/2;
  cylinder(parent,.085,.085,.18,x+.075,y,0,materials.gold,Math.PI/2);
  const nut=new THREE.Mesh(new THREE.CylinderGeometry(.125,.125,.095,6),materials.gold);nut.rotation.z=Math.PI/2;nut.position.set(x+.21,y,0);parent.add(nut);
  cylinder(parent,.067,.067,.18,x+.34,y,0,materials.black,Math.PI/2);
  cylinder(parent,.105,.105,.15,x+.43,y+.12,0,materials.black);
  cylinder(parent,.069,.085,.64,x+.43,y+.51,0,materials.black);
  cylinder(parent,.067,.067,.022,x+.43,y+.78,0,materials.edge);
}
function backNFC(parent,h,depth) {
  const z=-depth/2-.022;
  roundedBox(parent,1.18,1.78,.012,0,.05,z,materials.face,.11);
  for(const size of [1, .84, .68]) {
    const points=roundedShape(size,1.37*size,.12).getPoints(10).map(p=>[p.x,p.y+.02,z-.011]);
    line(parent,points,0xc7ae73,.7);
  }
  label(parent,'NFC',.83,.3,0,.05,z-.018,true);
  label(parent,'13.56 MHz',.73,.15,0,-.9,z-.018,true);
  label(parent,'ESP32-DIV\nV2.1',1.2,.31,0,h/2-.36,z-.018,true);
}
function traces(parent,w,h,z) {
  for(let i=0;i<13;i++) {const x=-w/2+.16+(i%6)*(w-.32)/6;const y=-h/2+.29+Math.floor(i/6)*.25;
    line(parent,[[x,y,z],[x+.12,y+.12,z],[x+.12,y+.39,z]],0x528953,.18);
  }
}

function rfClown(g) {
  const w=3.2,h=2.1,z=.15;plate(g,w,h,.15);traces(g,w,h,z);
  [-1.13,-.38,.38,1.13].forEach(x=>antenna(g,x,h/2,.88,.075));
  screen(g,.83,.48,-.08,.4,z+.03,['RF CLOWN','RADIO','SCAN','TOOLS','SETTINGS']);
  roundedBox(g,.67,.42,.055,-1.09,-.15,z+.03,materials.metal,.035);
  [0,.72,1.24].forEach(x=>roundedBox(g,.47,.4,.06,x,-.18,z+.03,materials.black,.025));
  [-.35,0,.35].forEach(x=>button(g,x,-.53,z,.095));
  label(g,'RF CLOWN V2',1.8,.3,-.38,-.84,z+.04);port(g,-h/2);
}
function div(g,newer) {
  const w=1.75,h=3.1,z=.16;plate(g,w,h,.2,false);traces(g,w,h,z);
  [-.58,-.2,.2,.58].forEach((x,i)=>antenna(g,x,h/2,i===0?.67:.78,.075));
  screen(g,1.38,1.76,0,.4,z+.06,['ESP32-DIV','WiFi','IR Remote','Bluetooth','Tools']);
  const color=newer?materials.red:materials.button;
  [[0,-.91],[-.27,-1.12],[0,-1.12],[.27,-1.12],[0,-1.33]].forEach(([x,y])=>button(g,x,y,z,.073,color));
  label(g,newer?'ESP32-DIV V2.1':'ESP32-DIV V2.0',1.48,.29,0,-.68,z+.025);
  port(g,-h/2);
  if(newer){sideSMA(g,w,.24);backNFC(g,h,.2);}
}
function nrf(g) {
  const w=1.55,h=2.75,z=.15;plate(g,w,h,.16);traces(g,w,h,z);
  [-.44,0,.44].forEach(x=>antenna(g,x,h/2,.9,.075));
  screen(g,.9,.57,0,.66,z+.04,['nRFBOX','SCAN','TX','RX','SET']);
  label(g,'nRFBOX V3',1.34,.38,0,1.07,z+.04);
  [[0,-.12],[-.27,-.42],[0,-.42],[.27,-.42],[0,-.73]].forEach(([x,y])=>button(g,x,y,z,.098,materials.red));
  roundedBox(g,.38,.28,.05,.4,-1.04,z+.025,materials.black,.03);
  for(const dx of [-.16,-.08,0,.08,.16])box(g,.025,.04,.01,.4+dx,-1.21,z+.052,materials.screw);
  port(g,-h/2);
}
function marauder(g,mini) {
  const w=mini?1.28:1.83,h=mini?2.45:2.75,z=.19;plate(g,w,h,.32,true);
  antenna(g,-w*.25,h/2,mini?.76:.9,mini?.07:.115);antenna(g,w*.25,h/2,mini?.99:.75,.07);
  screen(g,w-.38,mini?.78:1.42,0,mini?.44:.2,z+.04,['ESP32 Marauder','WiFi','Bluetooth','GPS','Reboot']);
  if(mini){label(g,'MARAUDER\nMINI V3',1.1,.42,0,-.47,z+.055);button(g,0,-.86,z+.02,.105);}
  else {label(g,'MARAUDER V8',1.55,.31,0,-.86,z+.055);}
  port(g,-h/2);
}

// Display-only interpretation of the owner's BW16 board photo.
function bw16(g) {
  const redPCB=mat(0x8c2632,{roughness:.73,metalness:.12});
  const bluePCB=mat(0x17455b,{roughness:.67,metalness:.16});
  const frame=mat(0xb7c7bd,{roughness:.5,metalness:.2});
  const ribbon=mat(0xa67b28,{roughness:.56,metalness:.35});
  roundedBox(g,2.35,2.85,.12,0,0,0,redPCB,.12);
  roundedBox(g,2.27,2.77,.014,0,0,.07,redPCB,.1);
  // Blue display PCB mounted above the red carrier.
  roundedBox(g,1.75,2.68,.065,-.23,.025,.13,bluePCB,.07);
  for(const x of [-1,.54])for(const y of [-1.18,1.23]){
    faceDisc(g,.072,.016,x,y,.176,materials.metal);
    faceDisc(g,.04,.018,x,y,.189,materials.recess);
  }
  // Pale screen surround and dark glass with the site's green display style.
  roundedBox(g,1.69,2.31,.065,-.23,.06,.202,frame,.045);
  screen(g,1.49,2.1,-.23,.06,.237,['BW16','RTL8720DN','SPADE K','FIRMWARE','READY']);
  // Exposed orange ribbon and the display's bottom PCB marking.
  box(g,.77,.17,.023,-.23,-1.123,.183,ribbon);
  for(let i=0;i<10;i++)box(g,.012,.15,.007,-.57+i*.075,-1.123,.199,materials.gold);
  label(g,'128 x 160 TFT',1.28,.11,-.23,-1.27,.175);
  for(let i=0;i<8;i++){
    faceDisc(g,.026,.018,-.73+i*.145,1.275,.176,materials.metal,12);
    box(g,.045,.085,.021,-.73+i*.145,1.32,.132,materials.metal);
  }
  // Three round black push-buttons on square silver switch bodies.
  for(const y of [.83,0,-.83]){
    for(const dx of [-.11,.11])for(const dy of [-.16,.16])box(g,.052,.087,.018,.91+dx,y+dy,.095,materials.metal);
    roundedBox(g,.35,.35,.05,.91,y,.135,materials.metal,.025);
    for(const dx of [-.12,.12])for(const dy of [-.12,.12])faceDisc(g,.025,.012,.91+dx,y+dy,.17,materials.screw,12);
    faceDisc(g,.103,.12,.91,y,.219,materials.black,24);
    faceDisc(g,.092,.008,.91,y,.284,materials.button,24);
    line(g,[[.77,y-.23,.083],[.71,y-.23,.083],[.71,y-.38,.083],[.79,y-.44,.083]],0xb26a56,.45);
  }
  // Small side switch and lower connector, as visible in the reference.
  box(g,.15,.2,.12,-1.22,-.17,.018,materials.black);
  for(let i=0;i<4;i++){
    box(g,.055,.13,.028,.76+i*.1,-1.19,.09,materials.metal);
    box(g,.042,.14,.06,-.18+i*.11,-1.44,.008,materials.metal);
  }
  roundedBox(g,.75,.85,.06,0,0,-.104,materials.edge,.03);
  label(g,'BW16',.65,.18,0,.08,-.143,true);
}

export function createViewer(stage,host) {
  let renderer;
  try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'}); }
  catch { host.textContent='3D unavailable in this browser'; return {setDevice(){},dispose(){}}; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.draggable=false;host.replaceChildren(renderer.domElement);
  const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,0,7.5);
  scene.add(new THREE.AmbientLight(0xffffff,2.2));
  const key=new THREE.DirectionalLight(0xb8ffbd,3.2);key.position.set(-3,5,6);scene.add(key);
  const fill=new THREE.DirectionalLight(0xcad4ff,1.7);fill.position.set(4,-2,4);scene.add(fill);
  let model=new THREE.Group();scene.add(model);let rx=-.16,ry=-.32,drag=null,frame=0;
  function disposeModel(){
    model.traverse(object=>{
      object.geometry?.dispose();
      const material=object.material;
      if(material&&!sharedMaterials.has(material)){material.map?.dispose();material.dispose();}
    });
  }
  function render(){model.rotation.set(rx,ry,.02);renderer.render(scene,camera);}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function setDevice(id){cancelAnimationFrame(frame);scene.remove(model);disposeModel();model=new THREE.Group();scene.add(model);
    if(id==='RF-CLOWN_V2')rfClown(model);
    else if(id==='ESP32_DIV_V2.1')div(model,true);
    else if(id==='ESP32_DIV_2.0')div(model,false);
    else if(id==='NRFBOX_V3')nrf(model);
    else if(id==='NRF24_JAMMER')nrf24Jammer(model);
    else if(id==='MARAUDER_V8')marauder(model,false);
    else if(id==='MARAUDER_MINI_V3')marauder(model,true);
    else if(id==='BW16')bw16(model);
    else {plate(model,1.45,2.65,.14);label(model,'SPADE K',1,.22,0,0,.11);}
    rx=-.16;ry=-.32;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){model.scale.setScalar(1);render();return;}
    const started=performance.now();
    const enter=now=>{const p=Math.min(1,(now-started)/650),ease=1-Math.pow(1-p,3);ry=-.82+.5*ease;model.scale.setScalar(.76+.24*ease);render();if(p<1)frame=requestAnimationFrame(enter);};
    frame=requestAnimationFrame(enter);
  }
  stage.addEventListener('dragstart',e=>e.preventDefault());
  stage.addEventListener('selectstart',e=>e.preventDefault());
  stage.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();cancelAnimationFrame(frame);stage.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
  stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();ry+=(e.clientX-drag.x)*.008;rx=Math.max(-.9,Math.min(.9,rx+(e.clientY-drag.y)*.008));drag.x=e.clientX;drag.y=e.clientY;render();});
  const end=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;stage.classList.remove('dragging');if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('lostpointercapture',()=>{drag=null;stage.classList.remove('dragging');});
  stage.addEventListener('keydown',e=>{const moves={ArrowLeft:[0,-.15],ArrowRight:[0,.15],ArrowUp:[-.15,0],ArrowDown:[.15,0]};if(!moves[e.key])return;e.preventDefault();rx=Math.max(-.9,Math.min(.9,rx+moves[e.key][0]));ry+=moves[e.key][1];render();});
  resize();return {setDevice,dispose(){cancelAnimationFrame(frame);observer.disconnect();disposeModel();renderer.dispose();}};
}
