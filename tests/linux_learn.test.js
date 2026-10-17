// Run with: node --test tests/linux_learn.test.js
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync('linux_learn.js','utf8');
const deck=JSON.parse(fs.readFileSync('linux-deck.json','utf8'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const loaded=(async()=>{const m={exports:{}};await new AsyncFunction('module','process',source)(m,process);return m.exports;})();
const date=(y,m,d,h=0,min=0)=>new Date(y,m-1,d,h,min);
const anchor='2026-10-17';
test('100 complete unique cards; ten themed days; shell grammar parses without execution',async()=>{
 const api=await loaded;api.validateDeck(deck);
 assert.equal(deck.cards.length,100);
 assert.equal(new Set(deck.cards.map(c=>c.id)).size,100);
 assert.equal(new Set(deck.cards.map(c=>c.theme)).size,10);
 for(const c of deck.cards) {
  assert.equal(c.requirements.sudo,c.command.startsWith('sudo '));
  for(const u of c.sourceUrls)assert.equal(new URL(u).protocol,'https:');
  const result=spawnSync('bash',['-n'],{input:c.command,encoding:'utf8',timeout:5000});
  assert.equal(result.status,0,`${c.id}: ${result.stderr}`);
 }
 for(const id of ['linux-03-09','linux-10-05','linux-10-06'])assert.ok(deck.cards.find(c=>c.id===id).changesSystemState);
 assert.equal(deck.cards.filter(c=>c.changesSystemState).length,3);
 const copy=structuredClone(deck);copy.cards[1].id=copy.cards[0].id;assert.throws(()=>api.validateDeck(copy));
 const missing=structuredClone(deck);delete missing.cards[0].output;assert.throws(()=>api.validateDeck(missing));
});
test('calendar determinism, all cards covered before wrap, missed days and negative modulo',async()=>{
 const a=await loaded,seen=new Set();
 for(let i=0;i<10;i++) {
  const cards=a.dailyCards(deck,anchor,date(2026,10,17+i,9));
  assert.equal(cards.length,10);assert.equal(cards[0].day,i+1);
  assert.deepEqual(cards,a.dailyCards(deck,anchor,date(2026,10,17+i,23,59)));
  cards.forEach(c=>seen.add(c.id));
 }
 assert.equal(seen.size,100);
 assert.deepEqual(a.dailyCards(deck,anchor,date(2026,10,27)),deck.cards.slice(0,10));
 assert.equal(a.dailyCards(deck,anchor,date(2026,10,16))[0].day,10);
 assert.equal(a.dailyCards(deck,'2026-12-31',date(2027,1,1))[0].day,2);
 assert.equal(a.dailyCards(deck,'2024-02-28',date(2024,3,1))[0].day,3);
 assert.throws(()=>a.ordinal('2026-02-30'));
});
test('hourly window boundaries and custom start minute',async()=>{
 const a=await loaded,s={...a.DEFAULTS};
 for(const [h,m,slot] of [[0,0,0],[8,59,0],[9,0,0],[9,59,0],[10,0,1],[17,59,8],[18,0,9],[23,59,9]])assert.equal(a.currentSlot(date(2026,10,17,h,m),s),slot);
 const c={...s,startHour:7,startMinute:30};
 assert.equal(a.currentSlot(date(2026,10,17,8,29),c),0);
 assert.equal(a.currentSlot(date(2026,10,17,8,30),c),1);
 assert.equal(a.nextRefresh(date(2026,10,17,9),s).getHours(),10);
 assert.equal(a.localKey(a.nextRefresh(date(2026,10,17,19),s)),'2026-10-18');
 assert.throws(()=>a.validateSettings({...s,startHour:15}));
 assert.throws(()=>a.validateSettings({...s,notificationDays:6}));
});
test('future-only horizon, exact card links, capacity, stable IDs, disabling and stale cleanup',async()=>{
 const a=await loaded,s={...a.DEFAULTS,notifications:true};
 const plan=a.notificationPlan(deck,s,anchor,date(2026,10,17,8),'Linux & Learn');
 assert.equal(plan.length,50);assert.equal(new Set(plan.map(p=>p.identifier)).size,50);
 assert.deepEqual(plan,a.notificationPlan(deck,s,anchor,date(2026,10,17,8),'Linux & Learn'));
 plan.forEach((p,i)=>{
  assert.ok(p.date>date(2026,10,17,8));assert.equal(p.cardId,deck.cards[i].id);
  const q=new URL(p.url).searchParams;assert.equal(q.get('scriptName'),'Linux & Learn');assert.equal(q.get('card'),p.cardId);assert.equal(q.get('day'),p.day);
 });
 assert.equal(a.notificationPlan(deck,s,anchor,date(2026,10,17,9),'X').length,49);
 assert.equal(a.notificationPlan(deck,s,anchor,date(2026,10,17,19),'X').length,40);
 assert.equal(a.notificationPlan(deck,s,anchor,date(2026,10,17,8),'X',3).length,3);
 assert.equal(a.notificationPlan(deck,s,anchor,date(2026,10,17,8),'X',0).length,0);
 assert.deepEqual(a.notificationPlan(deck,a.DEFAULTS,anchor,date(2026,10,17),'X'),[]);
 const pending=[{identifier:'another-script:1'},{identifier:a.NAMESPACE+'obsolete'},{identifier:plan[0].identifier}];
 assert.deepEqual(a.notificationDiff(pending,plan),[a.NAMESPACE+'obsolete']);
 assert.deepEqual(a.notificationDiff(pending,[]),[a.NAMESPACE+'obsolete',plan[0].identifier]);
});
test('notification deep link opens original card even on a later day',async()=>{
 const a=await loaded,s={...a.DEFAULTS};
 assert.equal(a.openedCard(deck,anchor,date(2026,10,20),s,{card:'linux-01-03',day:anchor}).card.id,'linux-01-03');
 assert.equal(a.openedCard(deck,anchor,date(2026,10,20),s,{}, {userInfo:{cardId:'linux-01-04',day:anchor}}).card.id,'linux-01-04');
 assert.equal(a.openedCard(deck,anchor,date(2026,10,20),s,{card:'linux-01-03',day:'garbage'}).day,null);
 assert.equal(a.openedCard(deck,anchor,date(2026,10,20,10),s,{card:'missing'}).card.id,'linux-04-02');
});
test('DST and timezone changes preserve local date groups and wall-clock notification slots',async()=>{
 const a=await loaded,old=process.env.TZ;
 try {
  for(const tz of ['Asia/Manila','America/New_York','Europe/Berlin']) {
   process.env.TZ=tz;
   for(const [anchorDate,now] of [['2026-03-07',date(2026,3,7,8)],['2026-10-31',date(2026,10,31,8)]]) {
    const plan=a.notificationPlan(deck,{...a.DEFAULTS,notifications:true},anchorDate,now,'X');
    assert.equal(plan.length,50);
    for(let i=0;i<50;i++) {assert.equal(plan[i].date.getHours(),9+i%10);assert.equal(plan[i].cardId,deck.cards[i].id);}
   }
  }
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});

// Mock actual Scriptable scheduling calls and persistent files, not only the plan helper.
function host() {
 const files=new Map(),pending=new Map([['other:1',{identifier:'other:1'}]]),removed=[];
 const root='/documents/LinuxLearn/';
 files.set(root+'linux-deck.json',JSON.stringify(deck));
 files.set(root+'settings.json',JSON.stringify({startHour:9,startMinute:0,notifications:true,notificationDays:5,sound:false}));
 files.set(root+'progress.json',JSON.stringify({anchorDate:anchor,seen:{},lastViewed:null}));
 class FakeDate extends Date {constructor(...args){super(...(args.length?args:[new Date(2026,9,17,8).getTime()]));}}
 class Notification {
  static async allPending(){return [...pending.values()];}
  static async removePending(ids){for(const id of ids){assert.ok(id.startsWith('linux-admin-v1:'));removed.push(id);pending.delete(id);}}
  static resetCurrent(){}
  setTriggerDate(d){this.nextTriggerDate=d;}
  async schedule(){pending.set(this.identifier,this);}
 }
 const context={Date:FakeDate,Notification,console,config:{runsInWidget:false},args:{shortcutParameter:'schedule',queryParameters:{}},
  FileManager:{local:()=>({documentsDirectory:()=>'/documents',joinPath:(a,b)=>a+'/'+b,fileExists:p=>p==='/documents/LinuxLearn'||files.has(p),readString:p=>files.get(p),writeString:(p,v)=>files.set(p,v)})},
  Script:{name:()=> 'Linux Learn',complete:()=>{}}};
 return {files,pending,removed,context,root,run:()=>vm.runInNewContext(`(async()=>{${source}\n})()`,context)};
}
test('Scriptable adapter rerun replaces stable IDs, updates window, preserves other scripts, disables cleanly',async()=>{
 const h=host();await h.run();assert.equal(h.pending.size,51);await h.run();assert.equal(h.pending.size,51);
 for(const n of h.pending.values())if(n.identifier.startsWith('linux-admin-v1:')) {assert.equal(n.body,deck.cards.find(c=>c.id===n.userInfo.cardId).command);assert.equal(n.nextTriggerDate.getMinutes(),0);}
 const s=JSON.parse(h.files.get(h.root+'settings.json'));s.startMinute=30;h.files.set(h.root+'settings.json',JSON.stringify(s));await h.run();
 assert.equal(h.pending.size,51);assert.ok([...h.pending.values()].filter(n=>n.identifier.startsWith('linux-admin-v1:')).every(n=>n.nextTriggerDate.getMinutes()===30));
 s.notifications=false;h.files.set(h.root+'settings.json',JSON.stringify(s));await h.run();assert.deepEqual([...h.pending.keys()],['other:1']);
});
test('Scriptable adapter budgets for other pending notifications',async()=>{
 const h=host();for(let i=2;i<=58;i++)h.pending.set(`other:${i}`,{identifier:`other:${i}`});
 await h.run();assert.equal(h.pending.size,60);assert.equal(JSON.parse(h.files.get(h.root+'progress.json')).notifications.count,2);
});
test('full card viewer exposes answer and native navigation/copy/source actions',async()=>{
 const h=host();h.context.args={queryParameters:{card:'linux-01-03',day:anchor}};
 const tables=[],copied=[],opened=[];
 class UITable {constructor(){this.rows=[];tables.push(this);}addRow(r){this.rows.push(r);}removeAllRows(){this.rows=[];}reload(){}async present(){}}
 class UITableRow {constructor(){this.cells=[];}addText(title,subtitle){const c={title,subtitle};this.cells.push(c);return c;}}
 h.context.UITable=UITable;h.context.UITableRow=UITableRow;h.context.Font={boldSystemFont:()=>'',regularMonospacedSystemFont:()=>'',systemFont:()=>''};
 h.context.Color=class {};
 h.context.Pasteboard={copyString:x=>copied.push(x)};h.context.Safari={open:x=>opened.push(x)};
 await h.run();
 const table=tables[0];const row=label=>table.rows.find(r=>r.cells[0].title===label);
 assert.equal(table.rows[1].cells[0].subtitle,deck.cards[2].command);
 assert.ok(row('Explanation'));assert.ok(row('Flags, arguments and stages'));assert.ok(row('What to look for'));
 await row('Copy Command').onSelect();assert.equal(copied[0],deck.cards[2].command);
 await row('Open Source').onSelect();assert.equal(opened[0],deck.cards[2].sourceUrl);
 await row('Next').onSelect();assert.equal(table.rows[1].cells[0].subtitle,deck.cards[3].command);
 await row('Previous').onSelect();assert.equal(table.rows[1].cells[0].subtitle,deck.cards[2].command);
 assert.equal(JSON.parse(h.files.get(h.root+'progress.json')).lastViewed.id,deck.cards[2].id);
});
test('widget renders current slot with exact-card tap URL and does not schedule notifications',async()=>{
 const h=host();h.context.config={runsInWidget:true,widgetFamily:'medium'};
 class ListWidget {constructor(){this.text=[];}setPadding(){}addText(x){this.text.push(x);return {};}addSpacer(){}}
 h.context.ListWidget=ListWidget;h.context.Color=class {};
 h.context.Font={regularMonospacedSystemFont:()=>'',systemFont:()=>''};
 let rendered;h.context.Script.setWidget=w=>{rendered=w;};
 await h.run();assert.ok(rendered.text.includes(deck.cards[0].command));
 assert.equal(new URL(rendered.url).searchParams.get('card'),deck.cards[0].id);
 assert.equal(rendered.refreshAfterDate.getHours(),9);assert.equal(h.pending.size,1);
 assert.ok(JSON.parse(h.files.get(h.root+'progress.json')).seen[deck.cards[0].id]);
});

test('DST gap does not normalize two notifications onto the same instant',async()=>{
 const a=await loaded,old=process.env.TZ;
 try {process.env.TZ='America/New_York';
  const plan=a.notificationPlan(deck,{...a.DEFAULTS,notifications:true,startHour:0},'2026-03-08',date(2026,3,7,23),'X');
  const march8=plan.filter(p=>p.day==='2026-03-08');
  assert.equal(march8.length,9);assert.equal(new Set(march8.map(p=>p.date.getTime())).size,9);
 }finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
});
