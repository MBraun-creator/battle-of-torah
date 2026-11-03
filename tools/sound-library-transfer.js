/* Standalone, offline sound backup controls. No database is opened or upgraded here.
   The legacy installer uses the original page's already-open soundDB connection. */
(function installSoundLibraryTransfer() {
 'use strict';
 if (document.getElementById('sound-library-transfer')) return;
 const exportOnly = document.currentScript?.dataset.exportOnly === 'true';
 const categories = ['good','bad','attack','repair','shield','elimination','win'];
 const format = 'battle-of-torah-sound-library';
 const maxFileBytes = 512 * 1024 * 1024;
 const maxAudioBytes = 350 * 1024 * 1024;
 const maxSoundBytes = 20 * 1024 * 1024;
 let pending = null, busy = false, downloadURL = null;
 const panel = document.createElement('section');
 panel.id = 'sound-library-transfer';
 panel.style.cssText = 'border:2px solid #b9985d;border-radius:8px;padding:12px;margin:12px 0;background:#171c20;color:#fff0d0;text-align:left';
 const title = document.createElement('h3');title.textContent = exportOnly ? 'Export original Sound Library' : 'Sound Library Backup';
 const info = document.createElement('p');info.textContent = exportOnly
  ? 'Exports your original audio without changing browser storage. Keep this original file open until your backup is saved.'
  : 'Back up every uploaded sound. Import only adds sounds; existing sounds are kept and exact duplicates are skipped.';
 const actions = document.createElement('div');actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
 function makeButton(text, id, handler) {
  const b=document.createElement('button');b.type='button';b.className='goldbtn';b.id=id;b.textContent=text;b.onclick=handler;return b;
 }
 const status=document.createElement('p');status.id='sound-transfer-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.style.whiteSpace='pre-wrap';
 const download=document.createElement('a');download.id='sound-backup-download';download.className='goldbtn';download.style.display='none';
 const review=document.createElement('div');review.id='sound-import-review';review.hidden=true;
 const summary=document.createElement('p');summary.id='sound-import-summary';
 const confirm=makeButton('Add sounds — keep existing library','sound-import-confirm',commitImport);
 const cancel=makeButton('Cancel import','sound-import-cancel',()=>{pending=null;review.hidden=true;setStatus('Import canceled. No stored sounds were changed.');});
 review.append(summary,confirm,cancel);
 const exportButton=makeButton('Export Sound Library','export-sound-library',exportLibrary);
 const verifyButton=makeButton('Verify Sound Library','verify-sound-library',verifyLibrary);
 const inventory=document.createElement('div');inventory.id='sound-library-inventory';
 actions.append(verifyButton,exportButton);panel.append(title,info,actions,inventory,download,review,status);
 let importButton=null,input=null;
 if (!exportOnly) {
  input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.hidden=true;input.id='sound-library-backup-file';
  input.onchange=()=>{const f=input.files[0];input.value='';if(f)prepareImport(f);};
  importButton=makeButton('Import Sound Library','import-sound-library',()=>input.click());
  actions.append(importButton);panel.append(input);
 }
 if (exportOnly) {
  panel.style.cssText+=';position:fixed;right:12px;bottom:12px;z-index:2147483646;max-width:520px;width:calc(100vw - 24px);max-height:65vh;overflow:auto;box-sizing:border-box;font:16px Georgia,serif';
  actions.append(makeButton('Close exporter','close-sound-exporter',()=>{if(downloadURL)URL.revokeObjectURL(downloadURL);panel.remove();}));
  document.body.append(panel);
 } else {
  const box=document.querySelector('#soundmodal .soundbox');
  if(!box)throw Error('Sound Library window not found.');
  box.insertBefore(panel,document.getElementById('soundgrid'));
 }
 function setStatus(text){status.textContent=text;}
 function setBusy(value){busy=value;exportButton.disabled=value;verifyButton.disabled=value;if(importButton)importButton.disabled=value;confirm.disabled=value;cancel.disabled=value;}
 function database(){
  if(typeof soundDB==='undefined'||!soundDB)throw Error('The original sound database is not available yet. Open the Sound Library and wait for it to load. No database was created or changed.');
  if(soundDB.name!=='battle_teams_custom_sounds'||!soundDB.objectStoreNames.contains('sounds'))throw Error('Unexpected sound database format. Nothing was changed.');
  return soundDB;
 }
 function readRecords(db){
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('sounds','readonly');const request=tx.objectStore('sounds').getAll();let records;
   request.onsuccess=()=>{records=request.result;};
   tx.oncomplete=()=>resolve(records);
   tx.onerror=tx.onabort=()=>reject(tx.error||request.error||Error('Could not read the sound database.'));
  });
 }
 async function verifyLibrary(){
  if(busy)return;setBusy(true);inventory.replaceChildren();setStatus('Checking stored sounds without changing them…');
  try{
   const db=database(),records=await readRecords(db);const address=document.createElement('p');
   address.textContent='Reading '+db.name+' at '+location.href;address.style.overflowWrap='anywhere';inventory.append(address);
   const list=document.createElement('ul');list.style.cssText='max-height:180px;overflow:auto';
   for(const r of records){const item=document.createElement('li');item.textContent=r.category+' — '+r.name+' ('+(r.blob instanceof Blob?r.blob.size.toLocaleString()+' bytes':'unreadable audio')+')';list.append(item);}
   inventory.append(list);
   setStatus(records.length?'Found '+records.length+' stored sounds. Verify these are your original filenames before exporting. This check made no changes.':'No stored sounds found in this tab. Return to the original file, profile, and location; do not assume a newly downloaded file can access the original storage.');
  }catch(e){setStatus('Verification stopped: '+e.message);}finally{setBusy(false);}
 }
 function readBlob(blob,method='readAsArrayBuffer'){
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error||Error('Could not read audio data.'));reader[method](blob);});
 }
 async function digest(bytes){
  if(!globalThis.crypto?.subtle)throw Error('SHA-256 verification is unavailable in this browser context. Use a current Safari version. Nothing was changed.');
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 }
 function base64(bytes){
  let text='';const a=new Uint8Array(bytes);
  for(let i=0;i<a.length;i+=32768)text+=String.fromCharCode.apply(null,a.subarray(i,i+32768));
  return btoa(text);
 }
 function decode(text,length){
  if(typeof text!=='string'||text.length!==4*Math.ceil(length/3)||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('Invalid audio encoding.');
  const binary=atob(text);if(binary.length!==length)throw Error('Audio length does not match the backup.');
  const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return bytes;
 }
 function checkMetadata(r){
  if(!r||!categories.includes(r.category)||typeof r.name!=='string'||!r.name.length||r.name.length>4096)throw Error('Invalid sound category or filename.');
  if(typeof r.mimeType!=='string'||r.mimeType.length>255||!/^[\x20-\x7e]*$/.test(r.mimeType))throw Error('Invalid audio MIME type.');
  if(!Number.isInteger(r.byteLength)||r.byteLength<0||r.byteLength>maxSoundBytes)throw Error('An audio file is invalid or exceeds 20 MB.');
  for(const key of ['lastModified','fileLastModified'])if(r[key]!==null&&(!Number.isSafeInteger(r[key])||r[key]<0))throw Error('Invalid sound timestamp.');
 }
 async function exportLibrary(){
  if(busy)return;setBusy(true);setStatus('Reading and verifying original audio…');
  // Hide any previous download so a failed new export cannot look successful.
  download.style.display='none';if(downloadURL){URL.revokeObjectURL(downloadURL);downloadURL=null;}
  try{
   const records=await readRecords(database());const sounds=[];let totalBytes=0;
   if(exportOnly&&!records.length)throw Error('No stored sounds were found in this tab. Return to the original v59 file and use Verify Sound Library before exporting.');
   if(records.length>10000)throw Error('This library exceeds the 10,000-sound backup limit. No sounds were omitted; export stopped.');
   for(const r of records){
    if(!(r.blob instanceof Blob))throw Error('A stored sound has no readable audio Blob. Export stopped; nothing was changed.');
    totalBytes+=r.blob.size;if(totalBytes>maxAudioBytes)throw Error('This library exceeds the 350 MB audio backup limit. No sounds were omitted; export stopped.');
    const item={originalId:r.id,category:r.category,name:r.name,mimeType:r.blob.type,byteLength:r.blob.size,lastModified:r.lastModified??null,fileLastModified:r.blob instanceof File?r.blob.lastModified:null};
    checkMetadata(item);const bytes=await readBlob(r.blob);item.sha256=await digest(bytes);item.dataBase64=base64(bytes);sounds.push(item);
   }
   const backup={format,schemaVersion:1,exportedAt:new Date().toISOString(),soundCount:sounds.length,totalBytes,sounds};
   const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});
   if(blob.size>maxFileBytes)throw Error('The backup exceeds 512 MB. No partial backup was created.');
   downloadURL=URL.createObjectURL(blob);download.href=downloadURL;download.download='battle-of-torah-sounds-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';
   download.textContent='Download Sound Library Backup ('+sounds.length+' sounds)';download.style.display='inline-block';
   setStatus('Backup ready: '+sounds.length+' sounds, '+totalBytes.toLocaleString()+' original audio bytes. Click Download to save the single JSON file. No stored sounds were changed.');
  }catch(e){setStatus('Export stopped: '+e.message);}finally{setBusy(false);}
 }
 function fingerprint(r,hash){return JSON.stringify([r.category,r.name,r.blob.type,hash]);}
 async function prepareImport(file){
  if(exportOnly)return;
  if(busy)return;pending=null;review.hidden=true;setBusy(true);setStatus('Validating every sound before making any changes…');
  try{
   if(file.size>maxFileBytes)throw Error('The backup exceeds 512 MB.');
   const backup=JSON.parse(await readBlob(file,'readAsText'));
   if(!backup||backup.format!==format||backup.schemaVersion!==1||!Array.isArray(backup.sounds)||backup.sounds.length>10000||backup.soundCount!==backup.sounds.length)throw Error('Not a supported Sound Library backup.');
   const incoming=[];let total=0;
   for(const item of backup.sounds){
    checkMetadata(item);total+=item.byteLength;if(total>maxAudioBytes)throw Error('The library exceeds 350 MB of audio.');
    if(typeof item.sha256!=='string'||!/^[a-f0-9]{64}$/.test(item.sha256))throw Error('Missing or invalid audio checksum.');
    const bytes=decode(item.dataBase64,item.byteLength);if(await digest(bytes)!==item.sha256)throw Error('Audio checksum mismatch for '+item.name+'.');
    const blob=item.fileLastModified===null?new Blob([bytes],{type:item.mimeType}):new File([bytes],item.name,{type:item.mimeType,lastModified:item.fileLastModified});
    incoming.push({category:item.category,name:item.name,blob,lastModified:item.lastModified,sourceId:item.originalId,hash:item.sha256});
   }
   if(!Number.isSafeInteger(backup.totalBytes)||backup.totalBytes!==total)throw Error('Backup byte count does not match its contents.');
   const existing=await readRecords(database()),seen=new Set(),names=new Set();
   for(const r of existing){
    if(!(r.blob instanceof Blob))throw Error('An existing sound cannot be verified. Import stopped to protect the library.');
    seen.add(fingerprint(r,await digest(await readBlob(r.blob))));names.add(JSON.stringify([r.category,r.name]));
   }
   const additions=[];let duplicates=0,collisions=0;
   for(const r of incoming){
    const key=fingerprint(r,r.hash);
    if(seen.has(key)){duplicates++;continue;}
    if(names.has(JSON.stringify([r.category,r.name])))collisions++;
    seen.add(key);names.add(JSON.stringify([r.category,r.name]));additions.push(r);
   }
   if(!additions.length){setStatus('No new sounds to add. '+duplicates+' exact duplicate(s) skipped. Existing sounds were unchanged.');return;}
   pending={additions,duplicates};
   const counts=categories.map(cat=>[cat,additions.filter(r=>r.category===cat).length]).filter(([,n])=>n).map(([cat,n])=>cat+': '+n).join(', ');
   summary.textContent='Add '+additions.length+' sounds? Keep all '+existing.length+' existing sounds and skip '+duplicates+' exact duplicate(s). '+collisions+' same-name sound(s) will be kept as separate recordings.\nCategories: '+counts;
   review.hidden=false;setStatus('Backup verified. Confirm below to add sounds, or cancel without changing anything.');
  }catch(e){setStatus('Import stopped: '+e.message+' No stored sounds were changed.');}finally{setBusy(false);}
 }
 function addAtomically(db,records){
  return new Promise((resolve,reject)=>{
   if(exportOnly){reject(Error('This legacy exporter cannot write to the database.'));return;}
   const tx=db.transaction('sounds','readwrite');const store=tx.objectStore('sounds');
   tx.oncomplete=resolve;tx.onerror=tx.onabort=()=>reject(tx.error||Error('The sound import transaction was aborted.'));
   try{
    for(const r of records){
     const id=crypto.randomUUID?crypto.randomUUID():'sound-import-'+Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16)).join('-');
     // add() intentionally refuses key collisions. Never put(), clear(), or delete().
     store.add({id,category:r.category,name:r.name,blob:r.blob,lastModified:r.lastModified,sourceId:r.sourceId});
    }
   }catch(e){tx.abort();reject(e);}
  });
 }
 async function commitImport(){
  if(exportOnly)return;
  if(busy||!pending)return;const plan=pending;pending=null;review.hidden=true;setBusy(true);setStatus('Adding sounds. Existing sounds will be kept…');
  let committed=false;
  try{
   const db=database();await addAtomically(db,plan.additions);committed=true;
   const all=await readRecords(db);
   if(typeof customSounds!=='undefined'&&typeof renderSoundLibrary==='function'){
    for(const cat of categories)customSounds[cat]=all.filter(r=>r.category===cat);
    renderSoundLibrary();
   }
   setStatus('Imported '+plan.additions.length+' sounds; skipped '+plan.duplicates+' exact duplicate(s). All existing sounds were kept.');
  }catch(e){setStatus(committed
   ? 'Sounds were saved, but the display could not reload: '+e.message+' Reopen the game to reload the saved library.'
   : 'Import failed: '+e.message+' The whole import was canceled. Existing sounds were kept.');
  }finally{setBusy(false);}
 }
})();
