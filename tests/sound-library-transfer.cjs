// Run with: node tests/sound-library-transfer.cjs /path/to/original-v59.html /path/to/generated-helpers
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const legacy=fs.readFileSync(process.argv[2],'utf8');
const helpers=process.argv[3];
const errors=[];let checks=0,browser,sourceContext,targetContext;
const targetProfile=fs.mkdtempSync('/tmp/battle-sound-transfer-tests-');
const launchOptions=process.env.TEST_ENGINE==='webkit'?{headless:true}:{executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']};
const servers=[];
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
async function serve(body){const s=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(body)});await new Promise(r=>s.listen(0,'127.0.0.1',r));servers.push(s);return 'http://127.0.0.1:'+s.address().port}
async function load(context,url){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>soundDbReady);return p}
async function rows(p){return p.evaluate(async()=>{
 const list=await new Promise((resolve,reject)=>{const q=soundDB.transaction('sounds','readonly').objectStore('sounds').getAll();q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 return Promise.all(list.map(async r=>({id:r.id,category:r.category,name:r.name,mime:r.blob.type,lastModified:r.lastModified,fileLastModified:r.blob instanceof File?r.blob.lastModified:null,size:r.blob.size,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await r.blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('')})));
})}
async function count(p){return (await rows(p)).length}
async function exportJSON(p){await p.click('#export-sound-library');await p.waitForFunction(()=>document.getElementById('sound-backup-download').style.display!=='none');const event=p.waitForEvent('download');await p.click('#sound-backup-download');const file=await event;return JSON.parse(fs.readFileSync(await file.path(),'utf8'))}
async function importJSON(p,data){await p.locator('#sound-library-backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))});await p.waitForFunction(()=>!document.getElementById('import-sound-library').disabled)}
async function add(p,record){await p.evaluate(async r=>{const blob=new File([new Uint8Array(r.bytes)],r.name,{type:r.mime,lastModified:r.fileLastModified??1700000000000});await storeSound({id:r.id,category:r.category,name:r.name,blob,lastModified:r.lastModified??1700000001000});},record)}
function wav(index){const b=Buffer.alloc(1644);b.write('RIFF');b.writeUInt32LE(1636,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(1600,40);for(let i=0;i<800;i++)b.writeInt16LE(Math.round(Math.sin(i*(index+1)/8)*1000),44+2*i);return [...b]}
async function openSoundLibrary(p){await p.evaluate(()=>$('setup').style.display='none');await p.click('#settings-menu-button');await p.click('#soundlibrary')}
(async()=>{
 const engine=process.env.TEST_ENGINE==='webkit'?webkit:chromium;
 browser=await engine.launch(launchOptions);
 sourceContext=await browser.newContext({acceptDownloads:true});targetContext=await engine.launchPersistentContext(targetProfile,{...launchOptions,acceptDownloads:true});
 const sourceURL=await serve(legacy),targetURL=await serve(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const src=await load(sourceContext,sourceURL);let dst=await load(targetContext,targetURL);
 const cats=['good','bad','attack','repair','shield','elimination','win'];
 for(let i=0;i<cats.length;i++)await add(src,{id:'original-'+i,category:cats[i],name:i===0?'שמח 🎵.wav':cats[i]+'.wav',mime:i===1?'':'audio/wav',bytes:wav(i)});
 await add(src,{id:'large',category:'attack',name:'large.wav',mime:'audio/wav',bytes:Array.from({length:1024*1024+3},(_,i)=>i%256)});
 await add(src,{id:'empty',category:'good',name:'empty.wav',mime:'audio/wav',bytes:[]});
 const original=await rows(src);
 await check('Both helper pages copy the exact intended installer without accessing a database',async()=>{
  for(const [html,js,label] of [['original-sound-export-helper.html','install-original-sound-exporter.js','Exporter'],['destination-sound-import-helper.html','install-destination-sound-transfer.js','Importer']]){
   const helper=await sourceContext.newPage();await helper.goto(await serve(fs.readFileSync(path.join(helpers,html),'utf8')));
   assert.equal(await helper.locator('#code').inputValue(),fs.readFileSync(path.join(helpers,js),'utf8'));
   await helper.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedInstaller=text}}}));await helper.getByRole('button',{name:'Copy '+label,exact:true}).click();assert.equal(await helper.evaluate(()=>copiedInstaller),fs.readFileSync(path.join(helpers,js),'utf8'));
   await helper.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Simulated Safari clipboard denial')}}}));await helper.getByRole('button',{name:'Copy '+label,exact:true}).click();assert.match(await helper.locator('#status').textContent(),/Command-C/);assert.deepEqual(await helper.evaluate(()=>indexedDB.databases()),[]);await helper.close();
  }
 });
 await check('Original v59 temporary exporter installs without file edits or opening a database',async()=>{
  await src.evaluate(()=>{window.soundModes=[];window.nativeTransaction=IDBDatabase.prototype.transaction;IDBDatabase.prototype.transaction=function(...args){window.soundModes.push(args[1]||'readonly');return window.nativeTransaction.apply(this,args)};indexedDB.open=()=>{throw Error('Exporter must not open a database')}});
  await src.addScriptTag({content:fs.readFileSync(path.join(helpers,'install-original-sound-exporter.js'),'utf8')});
  assert.equal(await src.locator('#export-sound-library').count(),1);assert.equal(await src.locator('#import-sound-library').count(),0);
 });
 let backup;
 await check('Verify original filenames and count using read-only transactions',async()=>{await src.click('#verify-sound-library');await src.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Found 9'));assert.match(await src.locator('#sound-library-inventory').textContent(),/שמח/);assert.match(await src.locator('#sound-library-inventory').textContent(),/battle_teams_custom_sounds/);assert.deepEqual(await rows(src),original)});
 await check('Export downloads one valid backup with every category, filename, timestamp and exact Blob bytes',async()=>{
  backup=await exportJSON(src);assert.equal(backup.soundCount,9);assert.equal(backup.totalBytes,original.reduce((n,r)=>n+r.size,0));
  for(const record of backup.sounds){const r=original.find(r=>r.id===record.originalId);assert.equal(record.sha256,r.hash);assert.equal(createHash('sha256').update(Buffer.from(record.dataBase64,'base64')).digest('hex'),r.hash);assert.equal(record.name,r.name);assert.equal(record.mimeType,r.mime);assert.equal(record.lastModified,r.lastModified);assert.equal(record.fileLastModified,r.fileLastModified)}
  assert.deepEqual(await rows(src),original);assert((await src.evaluate(()=>soundModes)).every(mode=>mode==='readonly'));
 });
 await check('Installed export-only v59 download preserves all original source text',async()=>{
  const patched=fs.readFileSync(path.join(helpers,'the_battle_of_torah_v59.html'),'utf8');const begin='<!-- BEGIN SOUND LIBRARY TRANSFER -->',end='<!-- END SOUND LIBRARY TRANSFER -->\n';const a=patched.indexOf(begin),b=patched.indexOf(end,a)+end.length;assert.equal(patched.slice(0,a)+patched.slice(b),legacy);
  const legacyPage=await load(sourceContext,await serve(patched));assert.equal(await legacyPage.locator('#export-sound-library').count(),1);assert.equal(await legacyPage.locator('#import-sound-library').count(),0);await legacyPage.close();
 });
 await check('Existing destination records with matching original IDs and names are preserved',async()=>{
  await add(dst,{id:'original-0',category:'good',name:'שמח 🎵.wav',mime:'audio/wav',bytes:[10,20,30]});
  await add(dst,{id:'existing-duplicate',category:'bad',name:'bad.wav',mime:'',bytes:wav(1)});
  await openSoundLibrary(dst);assert.equal(await count(dst),2);
 });
 const existing=await rows(dst);
 await check('Permanent v64 buttons are visible and Import opens the backup file chooser',async()=>{
  assert.equal(await dst.evaluate(()=>GAME_VERSION),64);assert.equal(await dst.locator('#export-sound-library').isVisible(),true);assert.equal(await dst.locator('#import-sound-library').isVisible(),true);
  const chosen=dst.waitForEvent('filechooser');await dst.click('#import-sound-library');const chooser=await chosen;await chooser.setFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await dst.waitForFunction(()=>!document.getElementById('import-sound-library').disabled);assert.equal(await dst.locator('#sound-import-review').isVisible(),true);assert.deepEqual(await rows(dst),existing);await dst.click('#sound-import-cancel');
 });
 await check('Validation and Cancel perform no writes',async()=>{
  await importJSON(dst,backup);assert.equal(await dst.locator('#sound-import-review').isVisible(),true);assert.match(await dst.locator('#sound-import-summary').textContent(),/Add 8 sounds/);assert.deepEqual(await rows(dst),existing);await dst.click('#sound-import-cancel');assert.deepEqual(await rows(dst),existing);
 });
 await check('Round-trip import appends all new sounds and keeps existing IDs/bytes',async()=>{
  await importJSON(dst,backup);await dst.click('#sound-import-confirm');await dst.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Imported'));
  const all=await rows(dst);assert.equal(all.length,10);for(const r of existing)assert.deepEqual(all.find(x=>x.id===r.id),r);
  for(const r of original)assert(all.some(x=>x.category===r.category&&x.name===r.name&&x.mime===r.mime&&x.hash===r.hash&&x.fileLastModified===r.fileLastModified));
  assert.equal(await dst.evaluate(()=>Object.values(customSounds).flat().length),10);
 });
 const imported=await rows(dst);
 await check('Repeated imports skip exact duplicates without adding or overwriting records',async()=>{await importJSON(dst,backup);assert.match(await dst.locator('#sound-transfer-status').textContent(),/9 exact duplicate/);assert.deepEqual(await rows(dst),imported)});
 await check('Restored WAV Blob remains decodable and plays to completion',async()=>{assert.equal(await dst.evaluate(async()=>{const r=customSounds.good.find(r=>r.name==='שמח 🎵.wav'&&r.blob.size>100);const url=URL.createObjectURL(r.blob);try{const audio=new Audio(url);await new Promise((resolve,reject)=>{audio.onended=resolve;audio.onerror=()=>reject(Error('Audio decoding failed'));audio.play().catch(reject)});return audio.duration>0;}finally{URL.revokeObjectURL(url)}}),true)});
 await check('A duplicate within a backup is skipped too',async()=>{const data=structuredClone(backup);data.sounds.push(data.sounds[0]);data.soundCount++;data.totalBytes+=data.sounds[0].byteLength;await importJSON(dst,data);assert.match(await dst.locator('#sound-transfer-status').textContent(),/10 exact duplicate/);assert.deepEqual(await rows(dst),imported)});
 for(const [name,mutate] of [
  ['corrupt bytes',b=>{b.sounds[0].dataBase64='AAAA';}],
  ['corrupt checksum',b=>{b.sounds[1].sha256='0'.repeat(64);}],
  ['unknown category',b=>{b.sounds[0].category='unknown';}],
  ['invalid filename',b=>{b.sounds[0].name='';}],
  ['unsupported schema',b=>{b.schemaVersion=99;}],
  ['wrong byte count',b=>{b.totalBytes++;}],
  ['invalid base64',b=>{const r=b.sounds.find(r=>r.byteLength>0);r.dataBase64='!'.repeat(r.dataBase64.length);}],
  ['invalid timestamp',b=>{b.sounds[0].lastModified='yesterday';}]
 ])await check('Reject '+name+' before writing any sounds',async()=>{const data=structuredClone(backup);mutate(data);await importJSON(dst,data);assert.match(await dst.locator('#sound-transfer-status').textContent(),/Import stopped/);assert.deepEqual(await rows(dst),imported)});
 await check('Reject malformed JSON without changing storage',async()=>{await importJSON(dst,'{broken');assert.match(await dst.locator('#sound-transfer-status').textContent(),/Import stopped/);assert.deepEqual(await rows(dst),imported)});
 let newBackup=structuredClone(backup);
 newBackup.sounds=newBackup.sounds.slice(0,2).map((r,i)=>({...r,name:'new-'+i+'.wav'}));newBackup.soundCount=2;newBackup.totalBytes=newBackup.sounds.reduce((n,r)=>n+r.byteLength,0);
 await check('Quota/write failure rolls back the complete import transaction',async()=>{
  await importJSON(dst,newBackup);await dst.evaluate(()=>{window.nativeAdd=IDBObjectStore.prototype.add;let calls=0;IDBObjectStore.prototype.add=function(...args){if(++calls===2)throw new DOMException('Simulated quota failure','QuotaExceededError');return nativeAdd.apply(this,args)}});
  await dst.click('#sound-import-confirm');await dst.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Import failed'));assert.deepEqual(await rows(dst),imported);await dst.evaluate(()=>IDBObjectStore.prototype.add=nativeAdd);
 });
 await check('Import retry after failure succeeds and double-click does not add twice',async()=>{
  await importJSON(dst,newBackup);await dst.locator('#sound-import-confirm').evaluate(b=>{b.click();b.click()});await dst.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Imported'));assert.equal(await count(dst),12);
 });
 await check('Imported library survives page reload and re-exports matching audio checksums',async()=>{
  const before=await rows(dst);await dst.reload();await dst.waitForFunction(()=>Object.values(customSounds).flat().length===12);assert.deepEqual(await rows(dst),before);await openSoundLibrary(dst);const next=await exportJSON(dst);assert.equal(next.soundCount,12);for(const r of next.sounds)assert.equal(createHash('sha256').update(Buffer.from(r.dataBase64,'base64')).digest('hex'),r.sha256);
 });
 await check('Imported sound data survives closing and reopening the destination browser',async()=>{const before=await rows(dst);await targetContext.close();targetContext=await engine.launchPersistentContext(targetProfile,{...launchOptions,acceptDownloads:true});dst=await load(targetContext,targetURL);await dst.waitForFunction(()=>Object.values(customSounds).flat().length===12);assert.deepEqual(await rows(dst),before)});
 await check('Temporary importer works on unmodified v63 without deploying',async()=>{
  const p=await load(targetContext,await serve(require('node:child_process').execFileSync('git',['show','266dcd8:index.html'],{cwd:root,encoding:'utf8'})));await openSoundLibrary(p);await p.addScriptTag({content:fs.readFileSync(path.join(helpers,'install-destination-sound-transfer.js'),'utf8')});await importJSON(p,backup);await p.click('#sound-import-confirm');await p.waitForFunction(()=>Object.values(customSounds).flat().length===9);await p.close();
 });
 await check('Repeat installation does not duplicate buttons',async()=>{await src.addScriptTag({content:fs.readFileSync(path.join(helpers,'install-original-sound-exporter.js'),'utf8')});assert.equal(await src.locator('#sound-library-transfer').count(),1)});
 await check('Missing original database refuses export without opening/creating one',async()=>{
  const other=await sourceContext.newPage();await other.goto(await serve('<!doctype html><body>No game database</body>'));await other.addScriptTag({content:fs.readFileSync(path.join(helpers,'install-original-sound-exporter.js'),'utf8')});await other.click('#export-sound-library');await other.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Export stopped'));assert.match(await other.locator('#sound-transfer-status').textContent(),/No database was created/);assert.deepEqual(await other.evaluate(()=>indexedDB.databases()),[]);await other.close();
 });
 await check('An empty newly opened game refuses legacy export and tells the user to find the original context',async()=>{
  const other=await load(sourceContext,await serve(legacy));await other.addScriptTag({content:fs.readFileSync(path.join(helpers,'install-original-sound-exporter.js'),'utf8')});await other.click('#verify-sound-library');await other.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('No stored sounds'));await other.click('#export-sound-library');await other.waitForFunction(()=>document.getElementById('sound-transfer-status').textContent.startsWith('Export stopped'));assert.equal(await other.locator('#sound-backup-download').isVisible(),false);assert.equal(await count(other),0);await other.close();
 });
 await check('v64 preserves v63 game code except version metadata and the backup module',async()=>{
  const now=fs.readFileSync(path.join(root,'index.html'),'utf8');const begin='<!-- BEGIN SOUND LIBRARY TRANSFER -->',end='<!-- END SOUND LIBRARY TRANSFER -->\n';const a=now.indexOf(begin),b=now.indexOf(end,a)+end.length;assert.equal(now.slice(0,a)+now.slice(b),require('node:child_process').execFileSync('git',['show','266dcd8:index.html'],{cwd:root,encoding:'utf8'}).replace('const GAME_VERSION=63;','const GAME_VERSION=64;'));assert.equal(require('node:child_process').execFileSync('git',['show','f93e8ed:tools/sound-library-transfer.js'],{cwd:root,encoding:'utf8'}),fs.readFileSync(path.join(root,'tools/sound-library-transfer.js'),'utf8'));
 });
 await check('2, 3 and 4 team starts, roster import, skip, end and restart still work',async()=>{
  for(const n of [2,3,4]){
   const p=await load(targetContext,targetURL);await p.locator('.team-count-option[data-count="'+n+'"]').click();await p.evaluate(()=>{Q=Array.from({length:12},(_,i)=>['Test','Q'+i,'',['A','B','C','D'],0,'']);$('roster-text').value='Last Name,First Name\nStudent,One\nStudent,Two';loadRosterNames()});await p.click('#roster-random');await p.click('#start');await p.click('#team-reveal-begin');assert.equal(await p.locator('.castle').count(),n);if(await p.locator('#reveal-selected-question').isVisible())await p.click('#reveal-selected-question');await p.evaluate(()=>skipCurrentQuestion());assert.equal(await p.evaluate(()=>turn),0);await p.evaluate(()=>finishGameImmediately());await p.click('#victory-dismiss');await p.click('#restart');await p.click('#restart-yes');assert.equal(await p.evaluate(()=>phase),'setup');await p.close();
  }
 });
 assert.deepEqual(errors,[]);console.log(checks+' checks passed; no uncaught browser errors.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(targetContext)await targetContext.close();if(browser)await browser.close();for(const s of servers)s.close();fs.rmSync(targetProfile,{recursive:true,force:true})});
