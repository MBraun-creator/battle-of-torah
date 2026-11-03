const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const gameFile=require('node:path').resolve(__dirname,'../index.html');
const os=require('node:os');
const profile=fs.mkdtempSync('/tmp/battle-tests-');
const server=require('node:http').createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(gameFile))});
let url;
let context,page;const errors=[];let checks=0;
async function check(name,fn){await fn();checks++;console.log('PASS '+name)}
async function launch(){
 context=await chromium.launchPersistentContext(profile,{executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'],viewport:{width:1440,height:1000}});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>soundDbReady);
}
async function settings(id){await page.click('#settings-menu-button');await page.click(id)}
async function notice(){await page.click('#message-dialog-ok')}
async function top(id){assert(await page.locator(id).evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 await launch();
 await check('Clean startup and balanced style tags',async()=>{assert.equal(await page.evaluate(()=>Q.length),0);assert.equal(await page.locator('style').count(),1)});
 await page.fill('#game-title-input','Torah Class');await page.fill('#game-topic-input','Vayeshev');
 await page.click('#startup-questions-tab');
 await check('Example import selects To dream',async()=>{assert.equal(await page.evaluate(()=>parseImportedQuestions($('qjson').placeholder)[0][4]),1)});
 await check('Question import, confirmation above editor, and save',async()=>{
  await page.fill('#qjson',JSON.stringify(Array.from({length:12},(_,i)=>({category:'Torah',question:'Question '+i,answers:['One','Two','Three','Four'],correct:'B',subtitle:'Pick one',explanation:'Two'}))));
  await page.click('#replaceq');await top('#decision-yes');await page.click('#decision-yes');assert.equal(await page.evaluate(()=>Q.length),12);
  await page.fill('#qtext','Edited question');await page.click('#saveq');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.bt_questions_v2)[0][1]),'Edited question');
 });
 await page.click('#closeq');
 const imageBuffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2400;c.height=1600;const x=c.getContext('2d');x.fillStyle='purple';x.fillRect(0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1]}),'base64');
 await check('Image upload resizes and commits to existing storage key',async()=>{
  await page.setInputFiles('#file',{name:'castle.png',mimeType:'image/png',buffer:imageBuffer});await page.waitForSelector('#message-dialog.show');assert.match(await page.locator('#message-dialog-text').textContent(),/saved for/);
  assert.deepEqual(await page.evaluate(async()=>{let im=new Image();im.src=localStorage.bt_castle_0;await im.decode();return [im.width,im.height,teams[0].photo===im.src]}),[1200,800,true]);await notice();
 });
 const savedImage=await page.evaluate(()=>localStorage.bt_castle_0);
 await check('GIF data stays intact and oversized images are rejected',async()=>{
  const gif='R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const result=await page.evaluate(async gif=>{
   const file=new File([Uint8Array.from(atob(gif),c=>c.charCodeAt(0))],'animated.gif',{type:'image/gif'});
   const data=await prepareCastleImage(file);let rejection='';try{await prepareCastleImage(new File([new Uint8Array(15*1024*1024+1)],'too-big.png',{type:'image/png'}))}catch(e){rejection=e.message}return [data,rejection];
  },gif);assert.equal(result[0],'data:image/gif;base64,'+gif);assert.match(result[1],/under 15 MB/);
 });
 await check('Existing castle storage key is restored without rewriting it',async()=>{await page.evaluate(value=>localStorage.setItem('bt_castle_1',value),savedImage);await page.reload();assert.equal(await page.evaluate(()=>teams[1].photo),savedImage);assert.equal(await page.evaluate(()=>localStorage.bt_castle_1),savedImage)});
 await check('Quota failure preserves prior image and displays truthful notice',async()=>{
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('bt_castle_'))throw new DOMException('Quota full','QuotaExceededError');return originalSetItem.call(this,k,v)}});
  await page.setInputFiles('#file',{name:'new.png',mimeType:'image/png',buffer:imageBuffer});await page.waitForSelector('#message-dialog.show');assert.match(await page.locator('#message-dialog-text').textContent(),/not saved/);assert.equal(await page.evaluate(()=>teams[0].photo),savedImage);assert.equal(await page.evaluate(()=>localStorage.bt_castle_0),savedImage);await notice();await page.evaluate(()=>Storage.prototype.setItem=originalSetItem);
 });
 await check('Invalid image is rejected without replacing saved image',async()=>{
  await page.setInputFiles('#file',{name:'bad.png',mimeType:'image/png',buffer:Buffer.from('bad')});await page.waitForSelector('#message-dialog.show');assert.match(await page.locator('#message-dialog-text').textContent(),/could not be decoded/);assert.equal(await page.evaluate(()=>localStorage.bt_castle_0),savedImage);await notice();
 });
 // Seed a legacy sound through the existing IndexedDB API; new sound through the upload input below.
 const wav=Buffer.alloc(1644);wav.write('RIFF');wav.writeUInt32LE(1636,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(1600,40);
 await page.evaluate(async bytes=>{await storeSound({id:'legacy-sound',category:'bad',name:'legacy.wav',blob:new Blob([new Uint8Array(bytes)],{type:'audio/wav'}),lastModified:1})},[...wav]);
 await page.evaluate(()=>$('setup').style.display='none');
 await settings('#soundlibrary');
 await check('Sound upload persists to IndexedDB and notices appear over sound editor',async()=>{
  await page.locator('#soundgrid input[type=file]').first().setInputFiles({name:'correct.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>customSounds.good.length===1);
  await page.evaluate(()=>gameNotice('Sound editor notice'));await top('#message-dialog-ok');await notice();await page.click('#closesounds');
 });
 await context.close();await launch();
 await check('New browser session restores questions, heading, castle, and old/new sounds',async()=>{
  assert.deepEqual(await page.evaluate(()=>[Q.length,Q[0][1],gameHeading.title,gameHeading.topic,$('game-title-input').value]),[12,'Edited question','Torah Class','Vayeshev','Torah Class']);assert.equal(await page.evaluate(()=>teams[0].photo),savedImage);assert.deepEqual(await page.evaluate(()=>[customSounds.good.length,customSounds.bad[0].id]),[1,'legacy-sound']);
 });
 await check('Saved numeric answer indices keep their original meaning',async()=>{assert.equal(await page.evaluate(()=>Q[0][4]),1)});
 await page.click('#start');await page.click('#team-reveal-begin');
 await check('Zero-HP team can answer and repair without elimination',async()=>{
  await page.evaluate(()=>{teams[0].hp=0;render()});await page.locator('.option').nth(1).click();await page.locator('#buttons button').first().click();await page.click('.action.repair');assert.equal(await page.evaluate(()=>teams[0].hp),5);await page.waitForFunction(()=>phase==='question'&&turn===1);
 });
 await check('Live team editor saves once and logs identity change',async()=>{
  await settings('#edit-teams-live');await page.fill('#live-team-name-0','New Lions');await page.selectOption('#live-team-icon-0','🦁');await page.click('#live-team-save');assert.deepEqual(await page.evaluate(()=>[teams[0].name,teams[0].icon,gameReportEvents.filter(e=>e.type==='team_identity_updated'&&e.teamNumber===1).length]),['New Lions','🦁',1]);
 });
 await check('Player editor notice is visible and close/reopen buttons work',async()=>{
  await page.evaluate(()=>{roster=[{id:1,name:'Student',team:actor,used:false}];activePlayerId=1});await settings('#manage-players-live');await page.locator('#live-player-list button').click();await top('#message-dialog-ok');assert.match(await page.locator('#message-dialog-text').textContent(),/currently answering/);await notice();await page.click('#live-player-close');await settings('#edit-teams-live');await page.click('#live-team-cancel');await page.evaluate(()=>{roster=[];activePlayerId=null;render()});
 });
 await check('Penalty report uses one-based team number and unchanged five HP',async()=>{
  await page.click('#penalty');await page.locator('#penalty-teams button').nth(1).click();assert.deepEqual(await page.evaluate(()=>{let e=gameReportEvents.find(e=>e.type==='manual_penalty');return [e.teamNumber,e.amount,teams[1].hp]}),[2,5,195]);
 });
 await check('Question-edit confirmation is clickable during game and cancel retains game',async()=>{
  await settings('#questionsetup');await page.click('#shuffleq');await top('#decision-no');await page.click('#decision-no');assert.equal(await page.evaluate(()=>turn),1);await page.click('#closeq');
 });
 await check('Wrong answer still offers one eligible steal; undo works',async()=>{
  await page.locator('.option').nth(0).click();await page.getByRole('button',{name:'↶ UNDO',exact:true}).click();assert.equal(await page.evaluate(()=>teams[actor].wrong),0);await page.locator('.option').nth(0).click();await page.locator('#buttons button').first().click();assert.equal(await page.evaluate(()=>phase),'steal');assert(await page.evaluate(()=>actor!==turn%teams.length));await page.locator('.option').nth(1).click();await page.locator('#buttons button').first().click();await page.click('.action.attack');await page.waitForTimeout(2000);assert.equal(await page.evaluate(()=>phase),'battle');await page.locator('#buttons button').click();assert.equal(await page.evaluate(()=>turn),2);
 });
 await check('Shield protection and turn advance remain unchanged',async()=>{
  await page.locator('.option').nth(1).click();await page.locator('#buttons button').first().click();await page.click('.action.shield');assert.equal(await page.evaluate(()=>teams[2].shieldUntil),4);await page.waitForFunction(()=>turn===3);
 });
 await check('End game, victory and downloaded report contain correct title/topic and identity event',async()=>{
  await page.click('#endgame');await page.click('#endgame-yes');await page.waitForSelector('#victory-overlay.show');const download=page.waitForEvent('download');await page.click('.report-download');const d=await download;const data=JSON.parse(fs.readFileSync(await d.path(),'utf8'));assert.equal(data.gameTitle,'Torah Class');assert.equal(data.topic,'Vayeshev');assert(data.events.some(e=>e.type==='team_identity_updated'));await page.click('#victory-dismiss');
 });
 await check('Malformed saved data is retained and produces a visible warning',async()=>{
  await page.evaluate(()=>{localStorage.setItem('bt_questions_v2','invalid json');localStorage.setItem('bt_game_heading_v1','invalid heading')});await page.reload();await page.waitForSelector('#message-dialog.show');assert.deepEqual(await page.evaluate(()=>[localStorage.bt_questions_v2,localStorage.bt_game_heading_v1,Q.length]),['invalid json','invalid heading',0]);await top('#message-dialog-ok');await notice();
 });
 await check('Empty saved bank is valid and does not warn',async()=>{await page.evaluate(()=>{localStorage.setItem('bt_questions_v2','[]');localStorage.setItem('bt_game_heading_v1',JSON.stringify({title:'Valid',topic:''}))});await page.reload();assert.equal(await page.evaluate(()=>Q.length),0);assert.equal(await page.locator('#message-dialog.show').count(),0)});
 assert.deepEqual(errors,[]);console.log(`${checks} checks passed; no uncaught browser errors.`);
 await context.close();server.close();fs.rmSync(profile,{recursive:true,force:true});
})().catch(async e=>{console.error(e);if(context)await context.close();server.close();process.exitCode=1});
