import {loadConfig,supportsBrowserFlashing,baudRateNumber,offsetNumber,checkRanges,checkMergedFactoryImage,downloadFileName,MAX_FIRMWARE_BYTES} from './config.js';
import {flashAmeba,FLASH_BASE} from './ameba.js';
import {md5} from './md5.js';
import {t,setLanguage,currentLanguage,deviceText} from './i18n.js';
import {createViewer} from './models.js';

const $=id=>document.getElementById(id);
const state={config:null,device:null,family:'all',busy:false,loader:null,transport:null,port:null,chip:null,portLabel:null,connectionMessage:null,progressKey:'waitingFirmware',progressValues:{}};
const viewer=createViewer($('deviceStage'),$('modelCanvas'));
let toastTimer;
const releases=()=>state.device?.releases||[];
const release=()=>releases()[Number($('releaseSelect').value)];
const serialReady=()=>window.isSecureContext&&'serial' in navigator;

function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5000);}
function log(message,level='info'){
  if($('flashTerminal').hidden)return;
  const row=document.createElement('div'),time=document.createElement('span'),content=document.createElement('span');
  time.className='log-time';time.textContent=new Date().toLocaleTimeString(currentLanguage(),{hour12:false})+'  ';
  content.className='log-'+level;content.textContent=String(message).replace(/\x1b\[[0-9;]*m/g,'');row.append(time,content);$('log').append(row);
  while($('log').children.length>400)$('log').firstElementChild.remove();$('log').scrollTop=$('log').scrollHeight;
}
function showError(error){
  const names={NotFoundError:'noPort',NotAllowedError:'permissionDenied',NetworkError:'networkError',InvalidStateError:'portBusy'};
  const message=names[error?.name]?t(names[error.name]):error?.message||String(error);
  state.connectionMessage=message;if(!$('flashTerminal').hidden)log(message,'error');toast(message);renderConnection();return message;
}
function setProgress(value,key,values={}){const n=Math.max(0,Math.min(100,Math.floor(value)));$('progressPercent').textContent=n+'%';$('progressBar').style.width=n+'%';$('progressTrack').setAttribute('aria-valuenow',String(n));if(key){state.progressKey=key;state.progressValues=values;}$('progressLabel').textContent=t(state.progressKey,state.progressValues);}
function mark(id,ready){$(id).classList.toggle('ready',ready);if($(id).classList.contains('readiness-item'))$(id).lastElementChild.textContent=ready?'✓':'○';}
function renderConnection(){
  const connected=Boolean(state.loader),supported=serialReady();
  $('environment').classList.toggle('warning',!supported);$('environmentText').textContent=t(supported?'browserReady':'browserUnavailable');$('envTag').textContent=t(supported?'readyTag':'unavailableTag');
  $('connectionState').classList.toggle('connected',connected);$('connectionState').lastElementChild.textContent=t(connected?'connected':'disconnected');
  $('connectStepState').textContent=t(connected?'stepReady':'stepPending');$('connectStepState').classList.toggle('ready',connected);$('connectCard').classList.toggle('connected',connected);
  $('connectButton').textContent=t(state.device&&!supportsBrowserFlashing(state.device)?'downloadOnly':connected?'disconnect':'choosePort');
  $('chipInfo').textContent=connected?t('chipReady',{chip:state.chip}):state.device?t('waitingChip',{chip:state.device.chip}):t('waitingPort');
  $('connectionHint').textContent=state.connectionMessage||t(state.device&&!supportsBrowserFlashing(state.device)?'externalFirmwareHint':state.device?.flashProtocol==='ameba'?'amebaConnectHint':'connectHint');$('portInfo').textContent=state.portLabel||t('portPrivacy');
  mark('checkBrowser',supported);mark('checkUsb',Boolean(state.port));mark('checkChip',connected);
  $('checkChip').lastElementChild.textContent=t(state.device?.flashProtocol==='ameba'?'checkPort':'checkChip');
}
function selectedBaudRate(){
  try {const rate=baudRateNumber($('baudRate').value);$('baudRate').setCustomValidity('');return rate;}
  catch {$('baudRate').setCustomValidity(t('baudInvalid'));throw new Error(t('baudInvalid'));}
}
function updateControls(){
  const connected=Boolean(state.loader),available=Boolean(release()),confirmed=$('confirmFlash').checked;
  $('connectButton').disabled=state.busy||!serialReady()||!supportsBrowserFlashing(state.device)||(!connected&&!$('baudRate').checkValidity());$('flashButton').disabled=state.busy||!supportsBrowserFlashing(state.device)||!connected||!available||!confirmed||!$('baudRate').checkValidity();
  $('flashButtonLabel').textContent=t(!supportsBrowserFlashing(state.device)?'downloadOnly':state.busy?'processing':'startFlash');$('downloadButton').disabled=state.busy||!available;$('baudRate').disabled=state.busy||!supportsBrowserFlashing(state.device);
  for(const id of ['releaseSelect','confirmFlash','search'])$(id).disabled=state.busy;
  $('confirmFlash').disabled=state.busy||!supportsBrowserFlashing(state.device);
  for(const button of document.querySelectorAll('.device-card,.filters button'))button.disabled=state.busy||connected;
  mark('readyDevice',connected);mark('readyFirmware',available);mark('readyConfirm',confirmed);
  const ready=connected&&available&&confirmed;$('flashStepState').textContent=t(state.busy&&!$('flashTerminal').hidden?'stepRunning':ready?'stepReady':'stepPending');$('flashStepState').classList.toggle('ready',ready);
  renderConnection();
}
function renderDevices(){
  if(!state.config)return;$('deviceCount').textContent=String(state.config.devices.length);
  const query=$('search').value.toLocaleLowerCase(currentLanguage()).trim();
  const visible=state.config.devices.filter(d=>(state.family==='all'||d.chip===state.family)&&`${d.name} ${d.chip} ${deviceText(d.id,0)}`.toLocaleLowerCase(currentLanguage()).includes(query));
  $('deviceList').replaceChildren();
  for(const d of visible){
    const button=document.createElement('button');button.type='button';button.className='device-card'+(d===state.device?' selected':'');button.setAttribute('aria-pressed',String(d===state.device));
    const icon=document.createElement('span');icon.className='board-icon';icon.textContent='♠';
    const main=document.createElement('span'),name=document.createElement('strong'),chip=document.createElement('span');name.textContent=d.name;chip.className='chip-caption';chip.textContent=d.chip;main.append(name,chip);
    const meta=document.createElement('span'),count=document.createElement('span'),tag=document.createElement('span');meta.className='card-meta';count.textContent=d.downloadOnly?t('downloadOnly'):d.releases.length?t(d.releases.length===1?'versionOne':'versions',{count:d.releases.length}):t('comingSoon');tag.textContent=d.visual.toUpperCase()+' ↗';meta.append(count,tag);button.append(icon,main,meta);
    button.addEventListener('click',()=>selectDevice(d));$('deviceList').append(button);
  }
  if(!visible.length){const empty=document.createElement('p');empty.className='no-results';empty.textContent=t('noResults');$('deviceList').append(empty);}updateControls();
}
function renderDeviceDetails(){
  const device=state.device;
  const driverKey=device?.flashProtocol==='ameba'?'driverBw16':['ESP32_DIV_2.0','ESP32_DIV_V2.1','RF-CLOWN_V2','NRFBOX_V3','NRF24_JAMMER'].includes(device?.id)?'driverCp2102':device?.chip==='ESP32-C5'?'driverCh340':null;
  $('driverNotice').hidden=!driverKey;$('driverMessage').textContent=driverKey?t(driverKey):'';

}
function applyDeviceMode(device){
  const downloadOnly=Boolean(device?.downloadOnly),ameba=device?.flashProtocol==='ameba';
  $('connectStep').hidden=downloadOnly;$('flashStep').hidden=downloadOnly;$('firmwareStepIndex').textContent=downloadOnly?'01':'02';$('amebaGuide').hidden=!ameba;
}
function selectDevice(device){
  if(state.busy||state.loader)return;state.device=device;state.connectionMessage=null;state.portLabel=null;applyDeviceMode(device);
  $('selectedName').textContent=device.name;$('selectedFamily').textContent=`${device.chip} / ${t('hardware')}`;$('selectedDescription').textContent=deviceText(device.id,0)||device.description;
  $('selectedIndex').textContent=`${String(state.config.devices.indexOf(device)+1).padStart(2,'0')} / ${String(state.config.devices.length).padStart(2,'0')}`;
  $('deviceNotice').textContent=deviceText(device.id,1)||device.note||'';$('deviceNotice').hidden=!$('deviceNotice').textContent;viewer.setDevice(device.id);renderDeviceDetails();
  $('releaseSelect').replaceChildren();if(releases().length)releases().forEach((r,i)=>$('releaseSelect').add(new Option(r.version,String(i))));else $('releaseSelect').add(new Option(t('noFirmware'),''));
  $('confirmFlash').checked=false;renderRelease();renderDevices();setProgress(0,device.downloadOnly?(releases().length?'progressDownloadReady':'progressDownloadOnly'):releases().length?'progressChoose':'progressWaiting');
}
function renderRelease(){
  const r=release(),downloadOnly=Boolean(state.device?.downloadOnly),ameba=state.device?.flashProtocol==='ameba';$('releaseMeta').textContent=r?`${r.date?r.date+' · ':''}${t(r.parts.length===1?'releaseFileOne':'releaseFiles',{count:r.parts.length})}`:'';$('partsList').replaceChildren();
  if(r)for(const p of r.parts){const item=document.createElement('div'),address=offsetNumber(p.offset)+(ameba?FLASH_BASE:0);item.textContent=downloadOnly?`${downloadFileName(p)} · SHA-256`:`0x${address.toString(16).padStart(ameba?8:6,'0')}  ←  ${p.path.split('/').pop()} · SHA-256`;$('partsList').append(item);}
  else{const empty=document.createElement('div');empty.className='empty-note';empty.textContent=t('emptyFirmware');$('partsList').append(empty);}
  $('releaseNotes').textContent=[r?.eraseAll?t('factoryEraseNote'):'',r?.notes||''].filter(Boolean).join(' ');
  const confirmation=document.querySelector('.confirm-box [data-i18n]');confirmation.dataset.i18n=r?.eraseAll?'confirmErase':downloadOnly?'confirmDownload':'confirmFlash';confirmation.textContent=t(confirmation.dataset.i18n);
  $('confirmFlash').hidden=downloadOnly;$('confirmFlash').checked=false;updateControls();
}
async function disconnect(){
  const transport=state.transport;state.loader=null;state.transport=null;state.chip=null;
  if(transport)try{await transport.disconnect();if(transport.waitForUnlock)await transport.waitForUnlock(1500);}catch(error){log(error.message,'warn');}
  if(state.port?.readable&&!state.port.readable.locked&&!state.port.writable?.locked)try{await state.port.close();}catch{}
  state.port=null;state.portLabel=null;updateControls();
}
async function openLoader(baudrate){
  if(!supportsBrowserFlashing(state.device))throw new Error(t('externalFirmwareHint'));
  if(state.device.flashProtocol==='ameba'){
    state.loader={kind:'ameba'};state.chip='RTL8720DN';state.connectionMessage=t('amebaConnected');return;
  }
  const {ESPLoader,Transport}=await import('./vendor/esptool/bundle.js');
  state.transport=new Transport(state.port,true);
  const loader=new ESPLoader({transport:state.transport,baudrate,romBaudrate:115200,debugLogging:false,terminal:{clean:()=>{},writeLine:line=>log(line),write:line=>log(line)}});
  const detected=await loader.main(),chip=loader.chip?.CHIP_NAME||detected;
  if(String(chip).toUpperCase()!==state.device.chip.toUpperCase())throw new Error(t('chipMismatch',{actual:chip,device:state.device.name,expected:state.device.chip}));
  state.loader=loader;state.chip=chip;state.connectionMessage=t('connectedLog',{chip});
}
async function applyBaudRate(baudrate){
  if(state.transport.baudrate===baudrate)return;
  log(t('baudReconnecting',{baud:baudrate}));
  const previous=state.transport;state.loader=null;
  await previous.disconnect();
  await openLoader(baudrate);
  log(t('baudApplied',{baud:state.transport.baudrate}));
}
async function connect(){
  if(state.loader){state.busy=true;updateControls();await disconnect();state.busy=false;state.connectionMessage=null;updateControls();return;}
  if(!supportsBrowserFlashing(state.device)||!serialReady())return;state.busy=true;state.connectionMessage=null;updateControls();
  try{
    const baudrate=selectedBaudRate();
    state.port=await navigator.serial.requestPort();const info=state.port.getInfo();state.portLabel=info.usbVendorId?t('portVid',{vid:info.usbVendorId.toString(16).padStart(4,'0'),pid:(info.usbProductId||0).toString(16).padStart(4,'0')}):t('portAuthorized');updateControls();
    await openLoader(baudrate);setProgress(0,release()?'progressConnected':'progressNoFirmware');
  }catch(error){showError(error);await disconnect();}finally{state.busy=false;updateControls();}
}
async function fetchPart(part,signal){
  const response=await fetch(new URL(part.path,location.href),{cache:'no-store',signal,credentials:'same-origin'});
  if(!response.ok)throw new Error(t('downloadError',{path:part.path,status:response.status}));
  if(/text\/html|application\/json/i.test(response.headers.get('Content-Type')||''))throw new Error(t('notBinary',{path:part.path}));
  if(Number(response.headers.get('Content-Length'))>MAX_FIRMWARE_BYTES)throw new Error(t('tooLarge'));
  const reader=response.body.getReader(),chunks=[];let length=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_FIRMWARE_BYTES)throw new Error(t('tooLarge'));chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  if(!length)throw new Error(t('emptyBinary',{path:part.path}));const bytes=new Uint8Array(length);let cursor=0;for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.length;}
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(digest!==part.sha256.toLowerCase())throw new Error(t('shaError',{path:part.path}));log(t('shaVerified',{path:part.path}),'success');return bytes;
}
async function flashAmebaDevice(){
  $('flashTerminal').hidden=false;$('log').replaceChildren();state.busy=true;updateControls();
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(new Error('Download timeout')),120000);
  let lastPhase='',lastPart='';
  try{
    const baudrate=selectedBaudRate();
    const selected=release();if(!selected)throw new Error(t('noRelease'));log(t('flashStart',{device:state.device.name,version:selected.version}));setProgress(0,'progressDownload');
    const flashloader={...state.device.ameba.flashloader,bytes:await fetchPart(state.device.ameba.flashloader,abort.signal)};
    const parts=[];
    for(const part of selected.parts)parts.push({bytes:await fetchPart(part,abort.signal),offset:offsetNumber(part.offset),name:part.path.split('/').pop()});
    checkRanges(parts.map(p=>({address:p.offset,bytes:p.bytes})));
    const total=flashloader.bytes.length+parts.reduce((sum,p)=>sum+p.bytes.length,0);
    log(t('writingLog',{count:parts.length+1,kb:(total/1024).toFixed(1)}));
    clearTimeout(timer);
    const progress=p=>{
      const partKey=p.phase==='write'?String(p.index):'';
      if(p.phase!==lastPhase||(p.phase==='write'&&partKey!==lastPart)){
        lastPhase=p.phase;
        if(p.phase==='write'){lastPart=partKey;log(t('amebaWritingPart',{name:p.name,index:p.index+1,total:p.total}));}
        else{const keys={enter:'amebaEntering',flashloader:'amebaBootloader',reset:'amebaResetting',erase:'amebaErasing',finalize:'amebaFinalizing',done:'amebaDone'};if(keys[p.phase])log(t(keys[p.phase]),p.phase==='done'?'success':'info');}
      }
      const percent=p.totalBytes?Math.min(99,Math.floor(p.writtenBytes/p.totalBytes*99)):0;
      const key={enter:'amebaEntering',flashloader:'amebaBootloader',reset:'amebaResetting',erase:'amebaErasing',write:'progressWriting',finalize:'amebaFinalizing'}[p.phase]||'progressWriting';
      setProgress(p.phase==='done'?100:percent,key,p.phase==='write'?{index:p.index+1,total:p.total}:{});
    };
    await flashAmeba({port:state.port,flashloader:{bytes:flashloader.bytes,address:offsetNumber(flashloader.address)},parts:parts.map(p=>({bytes:p.bytes,address:FLASH_BASE+p.offset,name:p.name})),baudRate:baudrate,log:line=>log(line),onProgress:progress,signal:abort.signal,
      onManual:()=>{state.connectionMessage=t('amebaManual');log(t('amebaManual'),'warn');toast(t('amebaManual'));renderConnection();}});
    setProgress(100,'progressComplete');state.connectionMessage=t('amebaDone');toast(t('amebaDone'));
  }catch(error){setProgress(0,'progressStopped');showError(error);}
  finally{clearTimeout(timer);await disconnect();state.busy=false;$('confirmFlash').checked=false;updateControls();}
}
async function flash(){
  if($('flashButton').disabled)return;
  if(state.device?.flashProtocol==='ameba')return flashAmebaDevice();
  $('flashTerminal').hidden=false;$('log').replaceChildren();state.busy=true;updateControls();
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(new Error('Download timeout')),120000);
  try{
    const baudrate=selectedBaudRate();
    const selected=release();if(!selected)throw new Error(t('noRelease'));log(t('flashStart',{device:state.device.name,version:selected.version}));setProgress(0,'progressDownload');
    const parts=[];for(const part of selected.parts)parts.push({bytes:await fetchPart(part,abort.signal),address:offsetNumber(part.offset)});
    checkRanges(parts);if(selected.eraseAll&&parts.length===1&&parts[0].address===0)checkMergedFactoryImage(parts[0].bytes,state.device.chip);
    await applyBaudRate(baudrate);
    const total=parts.reduce((sum,p)=>sum+p.bytes.length,0),sizes=parts.map(p=>p.bytes.length);log(t('writingLog',{count:parts.length,kb:(total/1024).toFixed(1)}));
    if(selected.eraseAll){setProgress(0,'progressErasing');log(t('erasingLog'),'warn');}
    await state.loader.writeFlash({fileArray:parts.map(p=>({data:p.bytes,address:p.address})),flashSize:'keep',flashMode:'keep',flashFreq:'keep',eraseAll:selected.eraseAll===true,compress:true,
      reportProgress:(index,written,length)=>{const previous=sizes.slice(0,index).reduce((a,b)=>a+b,0);setProgress(Math.min(99,(previous+sizes[index]*Math.min(1,written/length))/total*99),'progressWriting',{index:index+1,total:parts.length});},calculateMD5Hash:image=>md5(image)});
    setProgress(100,'progressComplete');log(t('flashComplete'),'success');try{await state.loader.after('hard_reset');log(t('resetSent'));}catch{log(t('resetManual'),'warn');}toast(t('flashed'));
  }catch(error){setProgress(0,'progressStopped');showError(error);}finally{clearTimeout(timer);await disconnect();state.busy=false;$('confirmFlash').checked=false;updateControls();}
}
function saveFile(name,content,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function download(){const selected=release();if(!selected)return;state.busy=true;updateControls();const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),120000);try{if(state.device?.flashProtocol==='ameba')saveFile(state.device.ameba.flashloader.path.split('/').pop(),await fetchPart(state.device.ameba.flashloader,abort.signal));for(const part of selected.parts)saveFile(downloadFileName(part),await fetchPart(part,abort.signal));toast(t('downloaded'));}catch(error){showError(error);}finally{clearTimeout(timer);state.busy=false;updateControls();}}
function refreshLanguage(){
  try{selectedBaudRate();}catch{}
  const confirmed=$('confirmFlash').checked;setLanguage($('languageSelect').value);
  if(state.device){$('selectedName').textContent=state.device.name;$('selectedFamily').textContent=`${state.device.chip} / ${t('hardware')}`;$('selectedDescription').textContent=deviceText(state.device.id,0);$('deviceNotice').textContent=deviceText(state.device.id,1);if(!releases().length)$('releaseSelect').options[0].text=t('noFirmware');renderRelease();$('confirmFlash').checked=confirmed;}
  if(state.loader)state.connectionMessage=t(state.device?.flashProtocol==='ameba'?'amebaConnected':'connectedLog',{chip:state.chip});else state.connectionMessage=null;
  renderDevices();setProgress(Number($('progressPercent').textContent.replace('%','')),state.progressKey,state.progressValues);updateControls();
}

$('baudRate').addEventListener('change',()=>{try{selectedBaudRate();}catch{}updateControls();});
$('connectButton').addEventListener('click',connect);$('flashButton').addEventListener('click',flash);$('downloadButton').addEventListener('click',download);
$('releaseSelect').addEventListener('change',renderRelease);$('confirmFlash').addEventListener('change',updateControls);$('search').addEventListener('input',renderDevices);$('languageSelect').addEventListener('change',()=>{refreshLanguage();renderDeviceDetails();});
document.querySelectorAll('.filters button').forEach(button=>button.addEventListener('click',()=>{if(state.busy||state.loader)return;state.family=button.dataset.family;document.querySelectorAll('.filters button').forEach(other=>other.classList.toggle('active',other===button));renderDevices();}));
$('saveLog').addEventListener('click',()=>saveFile('spade-k-webflash-log.txt',$('log').innerText,'text/plain;charset=utf-8'));
$('helpOpen').addEventListener('click',()=>$('helpDialog').showModal());for(const id of ['helpClose','helpDone'])$(id).addEventListener('click',()=>$('helpDialog').close());
document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('search').focus();}});
if('serial' in navigator)navigator.serial.addEventListener('disconnect',event=>{if(event.target===state.port){state.loader=null;state.transport=null;state.port=null;state.chip=null;state.portLabel=null;state.connectionMessage=t('deviceDisconnected');if(!$('flashTerminal').hidden)log(t('deviceDisconnected'),'warn');updateControls();}});
async function init(){let saved='es';try{saved=localStorage.getItem('spadek.language')||'es';}catch{}setLanguage(saved);renderConnection();try{state.config=await loadConfig();selectDevice(state.config.devices[0]);}catch(error){showError(error);$('selectedName').textContent=t('catalogError');$('selectedDescription').textContent=t('catalogErrorHelp');}updateControls();}
init();
