// Variables used by Scriptable.
// icon-color: deep-blue; icon-glyph: terminal;
// Linux learning cards. No Linux command in this file or its deck is executed.
// Pure functions above main are also exercised by tests/linux_learn.test.js.
const NAMESPACE = 'linux-admin-v1:';
const DEFAULTS = Object.freeze({startHour: 9, startMinute: 0, notifications: false,
  notificationDays: 5, sound: false});
function localKey(date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0')].join('-');
}
function ordinal(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error('Invalid calendar date');
  const [y,m,d] = key.split('-').map(Number);
  const n = new Date(Date.UTC(y,m-1,d));
  if (n.toISOString().slice(0,10) !== key) throw new Error('Invalid calendar date');
  return n.getTime()/86400000;
}
function mod(n,m) { return ((n%m)+m)%m; }
function validateSettings(s) {
  if (!Number.isInteger(s.startHour) || s.startHour<0 || s.startHour>14 ||
      !Number.isInteger(s.startMinute) || s.startMinute<0 || s.startMinute>59 ||
      !Number.isInteger(s.notificationDays) || s.notificationDays<1 || s.notificationDays>5 ||
      typeof s.notifications!=='boolean' || typeof s.sound!=='boolean') {
    throw new Error('Invalid settings: start hour 0–14, minute 0–59, horizon 1–5 days.');
  }
}
function validateDeck(deck) {
  if (deck.schemaVersion!==1 || !Array.isArray(deck.cards) || !deck.cards.length || deck.cards.length%10) {
    throw new Error('Deck must use schemaVersion 1 and contain complete groups of ten cards.');
  }
  const ids = new Set();
  deck.cards.forEach((c,i) => {
    if (typeof c.id!=='string' || !/^[a-z0-9-]+$/.test(c.id) || ids.has(c.id)) throw new Error('Duplicate/invalid card ID');
    ids.add(c.id);
    for (const k of ['theme','title','command','explanation','output','stateChange','sourceUrl']) {
      if (typeof c[k]!=='string' || !c[k].trim()) throw new Error(`Missing ${k} on ${c.id}`);
    }
    if (c.day!==Math.floor(i/10)+1 || !Array.isArray(c.breakdown) || !c.breakdown.length ||
        c.breakdown.some(b=>typeof b!=='string'||!b.trim()) ||
        typeof c.changesSystemState!=='boolean' || !c.requirements ||
        typeof c.requirements.platform!=='string' || !c.requirements.platform.trim() ||
        typeof c.requirements.notes!=='string' || !c.requirements.notes.trim() ||
        typeof c.requirements.sudo!=='boolean' ||
        !Array.isArray(c.requirements.packages) || !c.requirements.packages.length ||
        !Array.isArray(c.requirements.additionalPackages) ||
        [...c.requirements.packages,...c.requirements.additionalPackages].some(p=>typeof p!=='string'||!p.trim()) ||
        !Array.isArray(c.sourceUrls) || !c.sourceUrls.includes(c.sourceUrl) ||
        c.sourceUrls.some(u=>!/^https:\/\/[^\s/]+\/[^\s]+$/.test(u))) throw new Error(`Invalid card ${c.id}`);
    if (c.theme!==deck.cards[Math.floor(i/10)*10].theme) throw new Error('Each group of ten must share a theme.');
  });
}
function dailyCards(deck, anchor, date) {
  const day = mod(ordinal(localKey(date))-ordinal(anchor), deck.cards.length/10);
  return deck.cards.slice(day*10,day*10+10);
}
function slotDate(date, slot, s) {
  // Construct wall-clock dates afresh. Never add 24h milliseconds across DST.
  return new Date(date.getFullYear(),date.getMonth(),date.getDate(),s.startHour+slot,s.startMinute,0,0);
}
function currentSlot(date,s) {
  const minutes=date.getHours()*60+date.getMinutes();
  return Math.max(0,Math.min(9,Math.floor((minutes-s.startHour*60-s.startMinute)/60)));
}
function nextRefresh(now,s) {
  for (let i=0;i<10;i++) { const d=slotDate(now,i,s); if(d>now) return d; }
  return new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
}
function cardURL(scriptName,id,day) {
  return `scriptable:///run?scriptName=${encodeURIComponent(scriptName)}&card=${encodeURIComponent(id)}&day=${encodeURIComponent(day)}`;
}
function notificationPlan(deck,s,anchor,now,scriptName,capacity=50) {
  validateSettings(s);
  if (!s.notifications) return [];
  const plan=[];
  for(let offset=0;offset<s.notificationDays;offset++) {
    const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12);
    const key=localKey(date), cards=dailyCards(deck,anchor,date);
    for(let slot=0;slot<10;slot++) {
      const fire=slotDate(date,slot,s);
      if(fire<=now) continue; // Never deliver missed slots in a burst.
      // A spring-forward gap has no such wall-clock hour: skip, do not double-book.
      if(fire.getHours()!==s.startHour+slot || fire.getMinutes()!==s.startMinute) continue;
      const c=cards[slot];
      plan.push({identifier:`${NAMESPACE}${key}:${slot}`,date:fire,cardId:c.id,day:key,
        title:`Linux ${slot+1}/10 · ${c.title}`,body:c.command,
        url:cardURL(scriptName,c.id,key)});
    }
  }
  return plan.slice(0,Math.max(0,Math.min(50,Math.floor(capacity))));
}
function notificationDiff(pending,plan) {
  const wanted=new Set(plan.map(p=>p.identifier));
  return pending.filter(n=>n.identifier.startsWith(NAMESPACE)&&!wanted.has(n.identifier)).map(n=>n.identifier);
}
function selectOpenedCard(deck,anchor,now,query,notification) {
  const id=query.card || (notification && notification.userInfo && notification.userInfo.cardId);
  const found=deck.cards.find(c=>c.id===id);
  let day=query.day || (notification && notification.userInfo && notification.userInfo.day);
  if(found && day) {
    try {
      ordinal(day);
      const [y,m,d]=day.split('-').map(Number);
      if(dailyCards(deck,anchor,new Date(y,m-1,d,12)).some(c=>c.id===id)) return {card:found,day};
    } catch (_) { /* Invalid/stale day: still open exact stable card ID below. */ }
  }
  if(found) return {card:found,day:null};
  throw new Error('Unknown card ID');
}
// Explicit settings parameter wrapper keeps selection independent of app globals.
function openedCard(deck,anchor,now,s,query={},notification=null) {
  const id=query.card || notification?.userInfo?.cardId;
  if(!id || !deck.cards.some(c=>c.id===id)) return {card:dailyCards(deck,anchor,now)[currentSlot(now,s)],day:localKey(now)};
  return selectOpenedCard(deck,anchor,now,query,notification);
}

async function main() {
  const fm=FileManager.local();
  const root=fm.joinPath(fm.documentsDirectory(),'LinuxLearn');
  if(!fm.fileExists(root)) fm.createDirectory(root,true);
  const path=name=>fm.joinPath(root,name);
  function read(name,fallback) {
    if(!fm.fileExists(path(name))) return fallback;
    try {return JSON.parse(fm.readString(path(name)));}
    catch (_) {throw new Error(`${name} contains invalid JSON. Back it up, then repair it before rerunning.`);}
  }
  function write(name,value) {fm.writeString(path(name),JSON.stringify(value,null,2));}
  // On first interactive launch, import via Files once. Runtime reads only local JSON.
  if(!fm.fileExists(path('linux-deck.json'))) {
    if(config.runsInWidget || args.shortcutParameter==='schedule') throw new Error('Open this script in Scriptable first to import linux-deck.json.');
    const a=new Alert();a.title='Import Linux deck';a.message='Choose the supplied linux-deck.json in Files. A copy will be saved locally on this iPhone.';a.addAction('Choose JSON');a.addCancelAction('Cancel');
    if(await a.presentAlert()===-1) return;
    const chosen=await DocumentPicker.open(['public.json']);
    if(!chosen.length) return;
    const data=Data.fromFile(chosen[0]);
    const deck=JSON.parse(data.toRawString());validateDeck(deck);
    write('linux-deck.json',deck);
  }
  let deck=read('linux-deck.json');validateDeck(deck);
  let settings={...DEFAULTS,...read('settings.json',{})};validateSettings(settings);
  const state=read('progress.json',{anchorDate:localKey(new Date()),seen:{},lastViewed:null});
  ordinal(state.anchorDate);
  if(!state.seen || typeof state.seen!=='object' || Array.isArray(state.seen)) throw new Error('Invalid progress.seen');
  if(!fm.fileExists(path('progress.json'))) write('progress.json',state);
  if(!fm.fileExists(path('settings.json'))) write('settings.json',settings);
  const scriptName=Script.name();
  const now=new Date();
  const selected=openedCard(deck,state.anchorDate,now,settings,args.queryParameters||{},args.notification);
  if(args.notification) Notification.resetCurrent();

  async function schedule() {
    const pending=await Notification.allPending();
    const other=pending.filter(n=>!n.identifier.startsWith(NAMESPACE)).length;
    // Stay below the commonly encountered per-app pending limit; other scripts share it.
    const plan=notificationPlan(deck,settings,state.anchorDate,new Date(),scriptName,Math.max(0,60-other));
    const obsolete=notificationDiff(pending,plan);
    if(obsolete.length) await Notification.removePending(obsolete);
    for(const item of plan) {
      const n=new Notification();n.identifier=item.identifier;n.title=item.title;n.body=item.body;
      n.threadIdentifier=NAMESPACE;n.openURL=item.url;n.userInfo={cardId:item.cardId,day:item.day};
      n.sound=settings.sound?'default':null;n.setTriggerDate(item.date);await n.schedule();
    }
    state.notifications={updatedAt:new Date().toISOString(),count:plan.length,
      lastTrigger:plan.length?plan[plan.length-1].date.toISOString():null};
    write('progress.json',state);
    return plan;
  }
  function labels(c) {
    return [c.changesSystemState?'CHANGES STATE':'INSPECTION',c.requirements.sudo?'SUDO':null,
      c.requirements.additionalPackages.length?'EXTRA: '+c.requirements.additionalPackages.join(', '):null].filter(Boolean).join(' · ');
  }
  function record(c) {
    const time=new Date().toISOString();state.seen[c.id]=time;state.lastViewed={id:c.id,at:time};write('progress.json',state);
  }
  function widget(c) {
    const w=new ListWidget();w.backgroundColor=new Color('#101b2d');w.setPadding(12,14,12,14);
    w.url=cardURL(scriptName,c.id,localKey(now));w.refreshAfterDate=nextRefresh(now,settings);
    const large=config.widgetFamily==='large';
    function text(value,size,color,lines,mono=false) {
      const t=w.addText(value);t.font=mono?Font.regularMonospacedSystemFont(size):Font.systemFont(size);
      t.textColor=new Color(color);t.lineLimit=lines;t.minimumScaleFactor=0.85;return t;
    }
    const slot=currentSlot(now,settings);
    text(`${c.theme} · ${slot+1}/10`,11,'#70d6c5',1);w.addSpacer(4);
    text(c.title,large?17:14,'#ffffff',large?2:1);w.addSpacer(5);
    text(c.command,large?14:12,'#ffe3a1',large?7:4,true);w.addSpacer(4);
    if(large) {text(c.explanation,13,'#e1e8f3',3);w.addSpacer(7);text(c.output,12,'#bcc9dd',3);w.addSpacer(5);}
    text(labels(c),9,'#f7ba91',large?2:1);w.addSpacer();
    text('Tap for full card · iOS controls refresh',9,'#a2b1c7',1);
    return w;
  }
  if(config.runsInWidget) {
    // A widget reflects the wall-clock slot; browsing never pins it to a manual selection.
    const c=dailyCards(deck,state.anchorDate,now)[currentSlot(now,settings)];record(c);
    Script.setWidget(widget(c));Script.complete();return;
  }
  if(args.shortcutParameter==='schedule' || args.queryParameters?.action==='schedule') {
    const plan=await schedule();console.log(`Linux learning: ${plan.length} notifications pending after refill.`);Script.complete();return;
  }
  let scheduleMessage='';
  try {await schedule();} catch(e) {scheduleMessage=`Notification scheduling failed: ${e.message}. Check iOS notification permission and rerun.`;}
  const table=new UITable();table.showSeparators=false;
  let card=selected.card, viewedDay=selected.day;
  function paragraph(title,body,mono=false) {
    const row=new UITableRow();const cell=row.addText(title,body);
    cell.titleFont=Font.boldSystemFont(15);cell.subtitleFont=mono?Font.regularMonospacedSystemFont(14):Font.systemFont(14);
    // Conservative height for narrow phones; the table scrolls through the whole answer.
    const chars=mono?30:38;
    const lines=body.split('\n').reduce((n,line)=>n+Math.max(1,Math.ceil(line.length/chars)),0);
    row.height=36+lines*20;table.addRow(row);
  }
  function action(title,fn) {
    const row=new UITableRow();row.height=46;row.dismissOnSelect=false;
    row.addText(title).titleColor=new Color('#2676bd');
    row.onSelect=async()=>{try{await fn();}catch(e){const a=new Alert();a.title='Linux learning';a.message=String(e.message||e);a.addAction('OK');await a.presentAlert();}};
    table.addRow(row);
  }
  async function settingsDialog() {
    const a=new Alert();a.title='Learning window';
    a.message='Ten hourly slots. Start hour 0–14 and minute 0–59; the last slot is nine hours later. Notification horizon: 1–5 calendar days including today.';
    a.addTextField('Start hour',String(settings.startHour));a.addTextField('Minute',String(settings.startMinute));a.addTextField('Days ahead',String(settings.notificationDays));
    a.addAction(settings.notifications?'Save · notifications ON':'Save · notifications OFF');
    a.addAction(settings.notifications?'Save · turn notifications OFF':'Save · turn notifications ON');a.addCancelAction('Cancel');
    const choice=await a.presentAlert();if(choice<0)return;
    const candidate={...settings,startHour:Number(a.textFieldValue(0)),startMinute:Number(a.textFieldValue(1)),notificationDays:Number(a.textFieldValue(2)),notifications:choice===1?!settings.notifications:settings.notifications};
    validateSettings(candidate);settings=candidate;write('settings.json',settings);
    await schedule();scheduleMessage='Settings saved; future notifications rebuilt.';render();
  }
  function render() {
    record(card);table.removeAllRows();
    paragraph(`${card.theme} · ${card.id}`,`${viewedDay||'Deck browsing'} · ${labels(card)}`);
    paragraph(card.title,card.command,true);
    action('Previous',()=>move(-1));action('Next',()=>move(1));
    action('Copy Command',()=>{Pasteboard.copyString(card.command);});
    action('Open Source',()=>Safari.open(card.sourceUrl));
    paragraph('Explanation',card.explanation);
    paragraph('Flags, arguments and stages',card.breakdown.map(b=>'• '+b).join('\n'));
    paragraph('What to look for',card.output);
    paragraph('Requirements',`${card.requirements.platform}\nPackages: ${card.requirements.packages.join(', ')}\nAdditional packages: ${card.requirements.additionalPackages.join(', ')||'none'}\nSudo: ${card.requirements.sudo?'required':'not required'}\n${card.requirements.notes}`);
    paragraph('System state',card.stateChange);
    card.sourceUrls.forEach((u,i)=>action(`Source ${i+1}: ${u}`,()=>Safari.open(u)));
    const last=state.notifications?.lastTrigger;
    paragraph('Learning schedule',`Ten hourly slots starting ${String(settings.startHour).padStart(2,'0')}:${String(settings.startMinute).padStart(2,'0')}. Notifications ${settings.notifications?'ON':'OFF'}. ${last?'Last queued trigger: '+new Date(last).toLocaleString()+'.':'No future notifications queued.'}\n${scheduleMessage}\nRendered/opened ${Object.keys(state.seen).length}/${deck.cards.length} cards. Missed widget refreshes cannot prove a card was read.`);
    action('Settings / notifications',settingsDialog);
    action('Import replacement deck',async()=>{
      const chosen=await DocumentPicker.open(['public.json']);if(!chosen.length)return;
      const replacement=JSON.parse(Data.fromFile(chosen[0]).toRawString());validateDeck(replacement);
      write('linux-deck.json',replacement);deck=replacement;
      const date=new Date();card=dailyCards(deck,state.anchorDate,date)[currentSlot(date,settings)];viewedDay=localKey(date);
      // Only count stable IDs that remain in the new deck.
      const ids=new Set(deck.cards.map(c=>c.id));
      state.seen=Object.fromEntries(Object.entries(state.seen).filter(([id])=>ids.has(id)));
      await schedule();scheduleMessage='Replacement deck saved locally and notifications rebuilt.';render();
    });
    action('Refill future notifications',async()=>{await schedule();scheduleMessage='Notification queue refilled.';render();});
    action('Toggle notification sound',async()=>{settings.sound=!settings.sound;write('settings.json',settings);await schedule();scheduleMessage=`Sound ${settings.sound?'on':'off'}.`;render();});
    action('Preview medium widget',async()=>{await widget(card).presentMedium();});
    table.reload();
  }
  function move(delta) {
    // Navigate the ten cards of the opened date; exact-ID fallback browses its themed group.
    let set;
    if(viewedDay) {const [y,m,d]=viewedDay.split('-').map(Number);set=dailyCards(deck,state.anchorDate,new Date(y,m-1,d,12));}
    else {const i=deck.cards.findIndex(c=>c.id===card.id);set=deck.cards.slice(Math.floor(i/10)*10,Math.floor(i/10)*10+10);}
    card=set[mod(set.findIndex(c=>c.id===card.id)+delta,10)];render();
  }
  render();await table.present();Script.complete();
}
// Node tests load the pure functions without launching the iOS app.
if(typeof module!=='undefined' && typeof process!=='undefined') {
  module.exports={DEFAULTS,NAMESPACE,localKey,ordinal,validateSettings,validateDeck,dailyCards,
    slotDate,currentSlot,nextRefresh,cardURL,notificationPlan,notificationDiff,openedCard};
} else {
  try {await main();} catch(e) {
    if(config.runsInWidget) {
      const w=new ListWidget();w.addText('Linux learning needs setup');w.addText(String(e.message||e));
      w.url=URLScheme.forRunningScript();Script.setWidget(w);
    } else if(args.shortcutParameter==='schedule' || args.queryParameters?.action==='schedule') {
      throw e; // Make automation failures visible to Shortcuts.
    } else {const a=new Alert();a.title='Linux learning';a.message=String(e.message||e);a.addAction('OK');await a.presentAlert();}
    Script.complete();
  }
}
