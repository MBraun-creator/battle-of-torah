// All requests are intercepted. The real live and preview websites are never contacted.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const config=JSON.parse(fs.readFileSync(path.join(root,'preview/site.json')));
const previewDir=process.argv[2]||'/workspace/sites/battle-of-torah-preview/dist';
const preview=fs.readFileSync(path.join(previewDir,'index.html'),'utf8');
const info=JSON.parse(fs.readFileSync(path.join(previewDir,'preview-info.json')));
const live=cp.execFileSync('git',['show','origin/main:index.html'],{cwd:root,encoding:'utf8'});
const profile=fs.mkdtempSync('/tmp/battle-preview-isolation-');
const options={executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']};
let context,checks=0;const errors=[];
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
async function launch(){
 context=await chromium.launchPersistentContext(profile,options);
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===new URL(config.preview_url).origin)return route.fulfill({contentType:'text/html',body:preview});
  if(url.origin===new URL(config.live_url).origin)return route.fulfill({contentType:'text/html',body:live});
  return route.abort();
 });
}
async function open(url){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>soundDbReady);return p}
async function soundRows(p){return p.evaluate(()=>new Promise((resolve,reject)=>{const r=soundDB.transaction('sounds','readonly').objectStore('sounds').getAll();r.onsuccess=()=>resolve(r.result.map(x=>({id:x.id,name:x.name,size:x.blob.size})));r.onerror=()=>reject(r.error)}))}
(async()=>{
 await check('Preview bytes match the selected GitHub development commit exactly',async()=>{assert.equal(preview,cp.execFileSync('git',['show',info.source_commit+':index.html'],{cwd:root,encoding:'utf8'}));assert.equal(info.source_branch,'dev/version-64');assert.equal(info.game_version,64);assert.notEqual(new URL(config.preview_url).origin,new URL(config.live_url).origin)});
 await launch();let livePage=await open(config.live_url),previewPage=await open(config.preview_url);
 await check('Live-origin test data is inaccessible to the preview origin',async()=>{
  await livePage.evaluate(async()=>{localStorage.setItem('bt_questions_v2',JSON.stringify([['Live','Live-only question','',['A','B','C','D'],0,'']]));localStorage.setItem('bt_game_heading_v1',JSON.stringify({title:'Live title',topic:'Live topic'}));localStorage.setItem('bt_castle_0',defaults[0]);await storeSound({id:'live-only-sound',category:'good',name:'Live only.wav',blob:new Blob([new Uint8Array([1,2,3])],{type:'audio/wav'}),lastModified:1})});
  assert.equal(await previewPage.evaluate(()=>localStorage.getItem('bt_questions_v2')),null);assert.equal(await previewPage.evaluate(()=>localStorage.getItem('bt_game_heading_v1')),null);assert.deepEqual(await soundRows(previewPage),[]);
 });
 await check('Preview uses the same keys and database name without changing live test data',async()=>{
  await previewPage.evaluate(async()=>{localStorage.setItem('bt_questions_v2',JSON.stringify([['Preview','Preview-only question','',['A','B','C','D'],0,'']]));localStorage.setItem('bt_game_heading_v1',JSON.stringify({title:'Preview title',topic:'Preview topic'}));await storeSound({id:'preview-only-sound',category:'good',name:'Preview only.wav',blob:new Blob([new Uint8Array([9,8,7,6])],{type:'audio/wav'}),lastModified:2})});
  assert.match(await livePage.evaluate(()=>localStorage.bt_questions_v2),/Live-only question/);assert.deepEqual(await soundRows(livePage),[{id:'live-only-sound',name:'Live only.wav',size:3}]);assert.deepEqual(await soundRows(previewPage),[{id:'preview-only-sound',name:'Preview only.wav',size:4}]);
 });
 await check('Both origins keep separate questions, headings and sounds after refresh',async()=>{
  await livePage.reload();await previewPage.reload();await livePage.waitForFunction(()=>customSounds.good.length===1);await previewPage.waitForFunction(()=>customSounds.good.length===1);
  assert.deepEqual(await livePage.evaluate(()=>[Q[0][1],gameHeading.title,customSounds.good[0].name]),['Live-only question','Live title','Live only.wav']);assert.deepEqual(await previewPage.evaluate(()=>[Q[0][1],gameHeading.title,customSounds.good[0].name]),['Preview-only question','Preview title','Preview only.wav']);
 });
 await check('Student rosters are independent in each tab',async()=>{await livePage.evaluate(()=>{roster=[{id:1,name:'Live student',team:0,used:false}]});await previewPage.evaluate(()=>{roster=[{id:2,name:'Preview student',team:0,used:false}]});assert.equal(await livePage.evaluate(()=>roster[0].name),'Live student');assert.equal(await previewPage.evaluate(()=>roster[0].name),'Preview student')});
 await check('Separate storage persists after browser restart at the same preview URL',async()=>{
  await context.close();await launch();livePage=await open(config.live_url);previewPage=await open(config.preview_url);await livePage.waitForFunction(()=>customSounds.good.length===1);await previewPage.waitForFunction(()=>customSounds.good.length===1);assert.equal(await livePage.evaluate(()=>gameHeading.title),'Live title');assert.equal(await previewPage.evaluate(()=>gameHeading.title),'Preview title');assert.equal((await soundRows(livePage))[0].id,'live-only-sound');assert.equal((await soundRows(previewPage))[0].id,'preview-only-sound');
 });
 assert.deepEqual(errors,[]);console.log(checks+' checks passed; no uncaught errors. All traffic was intercepted; no live data was accessed.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{if(context)await context.close();fs.rmSync(profile,{recursive:true,force:true})});
