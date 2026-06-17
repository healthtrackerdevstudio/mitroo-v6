// ══ ΝΟΜΟΘΕΣΙΑ v6 — Auto-indexing + AI Search ══

// ── State ──
// nomosIndex δηλώνεται στο config.js ως global
let nomosIndexing = false;
let nomosIndexHandle = null;
let nomosSearchResults = [];
let nomosAiPending = false;
const NOMOS_GEMINI_KEY_STORE = 'nomos_gemini_key';
const NOMOS_INDEX_STORE = 'nomos_index_v6';

// ── Gemini key ──
function getNomosGeminiKey(){
  try{ return localStorage.getItem(NOMOS_GEMINI_KEY_STORE)||''; }catch(e){ return ''; }
}
function setNomosGeminiKey(k){
  try{ localStorage.setItem(NOMOS_GEMINI_KEY_STORE, k.trim()); }catch(e){}
}

// ══ INDEXEDDB STORAGE (κύριο — δεν μπλοκάρεται από Tracking Prevention) ══
function nomosIdbSave(data){
  return new Promise((resolve)=>{
    try{
      const req = indexedDB.open('mitroo_nomos',1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('idx');
      req.onsuccess = e => {
        const idb = e.target.result;
        const tx = idb.transaction('idx','readwrite');
        tx.objectStore('idx').put(JSON.stringify(data),'nomosIndex');
        tx.oncomplete = ()=>{ idb.close(); resolve(true); };
        tx.onerror   = ()=>{ idb.close(); resolve(false); };
      };
      req.onerror = ()=>resolve(false);
    }catch(e){ resolve(false); }
  });
}

function nomosIdbLoad(){
  return new Promise((resolve)=>{
    try{
      const req = indexedDB.open('mitroo_nomos',1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('idx');
      req.onsuccess = e => {
        const idb = e.target.result;
        const tx = idb.transaction('idx','readonly');
        const get = tx.objectStore('idx').get('nomosIndex');
        get.onsuccess = ()=>{ idb.close();
          try{ resolve(get.result ? JSON.parse(get.result) : null); }
          catch(e){ resolve(null); }
        };
        get.onerror = ()=>{ idb.close(); resolve(null); };
      };
      req.onerror = ()=>resolve(null);
    }catch(e){ resolve(null); }
  });
}

// ── Load index ──
async function nomosLoadIndex(){
  // 1. IndexedDB (κύριο, γρήγορο)
  const idb = await nomosIdbLoad();
  if(idb && idb.length){ nomosIndex=idb; console.log('[nomos] Loaded from IndexedDB:',nomosIndex.length); return; }

  // 2. Firestore chunks (backup)
  if(typeof USE_FIREBASE!=='undefined' && USE_FIREBASE && typeof db!=='undefined' && db){
    try{
      let all=[];
      for(let c=0;c<20;c++){
        const snap=await db.collection('nomosIndex').doc('chunk_'+c).get();
        if(!snap.exists) break;
        all=all.concat(snap.data().items||[]);
      }
      if(all.length){ nomosIndex=all; await nomosIdbSave(nomosIndex);
        console.log('[nomos] Loaded from Firestore:',nomosIndex.length); return; }
    }catch(e){ console.warn('[nomos] Firestore load error:',e); }
  }
  console.log('[nomos] No existing index found');
}

// ── Save index ──
// Κάθε 50 νέα αρχεία → IndexedDB (γρήγορο, χωρίς όρια)
// Μόνο στο τέλος → Firestore (για cross-device sync)
async function nomosSaveIndex(forceFirestore=false){
  // Πάντα IndexedDB
  await nomosIdbSave(nomosIndex);

  // Firestore μόνο στο τέλος (forceFirestore=true)
  if(forceFirestore && typeof USE_FIREBASE!=='undefined' && USE_FIREBASE && typeof db!=='undefined' && db){
    try{
      const CHUNK=300;
      const chunks=[];
      for(let i=0;i<nomosIndex.length;i+=CHUNK)
        chunks.push(nomosIndex.slice(i,i+CHUNK));

      for(let i=0;i<chunks.length;i++){
        await db.collection('nomosIndex').doc('chunk_'+i).set({
          items:chunks[i], updated:Date.now(),
          total:nomosIndex.length, chunkCount:chunks.length
        });
        // 1 δευτερόλεπτο μεταξύ writes — αποφεύγει το resource-exhausted
        await new Promise(r=>setTimeout(r,1000));
      }
      // Καθαρισμός παλιών chunks
      for(let i=chunks.length;i<30;i++){
        try{ await db.collection('nomosIndex').doc('chunk_'+i).delete(); }catch(e){}
      }
      console.log('[nomos] Firestore save OK:',nomosIndex.length,'εγγραφές σε',chunks.length,'chunks');
    }catch(e){ console.warn('[nomos] Firestore save error:',e.message); }
  }
}

// ── Wake Lock ──
let _wakeLock=null;
async function nomosRequestWakeLock(){
  if(!('wakeLock' in navigator)) return;
  try{ _wakeLock=await navigator.wakeLock.request('screen');
    console.log('[nomos] Wake Lock ενεργό'); }
  catch(e){ console.warn('[nomos] Wake Lock:',e.message); }
}
function nomosReleaseWakeLock(){
  if(_wakeLock){ try{_wakeLock.release();}catch(e){} _wakeLock=null; }
}

// ── Path → κατηγορία ──
function nomosPathToCategory(path){
  const parts=path.replace(/\\/g,'/').split('/').filter(Boolean);
  return {cat:parts[0]||'',subcat:parts[1]||'',subcat2:parts[2]||''};
}

// ── Filename → metadata ──
function nomosMetaFromFilename(filename){
  const name=filename.replace(/\.(pdf|docx|doc)$/i,'');
  let type='Άλλο';
  if(/\bΝ\.?\s*\d|νόμος/i.test(name)) type='Νόμος';
  else if(/\bΠΔ\b|Π\.Δ\./i.test(name)) type='ΠΔ';
  else if(/\bΥΑ\b|ΥΠ\.?ΑΠ|Υπουργ.*Απόφ/i.test(name)) type='ΥΑ';
  else if(/\bΦΕΚ\b/i.test(name)) type='ΦΕΚ';
  else if(/εγκύκλ|circular/i.test(name)) type='Εγκύκλιος';
  else if(/οδηγία|directive/i.test(name)) type='Οδηγία ΕΕ';
  const yearMatch=name.match(/\b(19[89]\d|20[012]\d)\b/);
  return {type, year:yearMatch?yearMatch[1]:'', title:name};
}

// ── PDF extraction ──
async function nomosExtractPdfText(file){
  try{
    if(!window.pdfjsLib) return '';
    const url=URL.createObjectURL(file);
    let pdf;
    try{ pdf=await pdfjsLib.getDocument(url).promise; }
    finally{ URL.revokeObjectURL(url); }

    const total=pdf.numPages;
    let text='';
    const pages = total<=10
      ? Array.from({length:total},(_,i)=>i+1)
      : [1,2,3,Math.floor(total/2),Math.ceil(total/2),total-1,total]
          .filter((p,i,a)=>p>=1&&p<=total&&a.indexOf(p)===i);

    for(const n of pages){
      const page=await pdf.getPage(n);
      const c=await page.getTextContent();
      text+=c.items.map(s=>s.str).join(' ')+'\n';
      page.cleanup(); // αποδέσμευση μνήμης σελίδας
    }
    if(text.trim().length<20) return ''; // scanned → skip
    return text.replace(/\s+/g,' ').trim().slice(0,1500);
  }catch(e){ return ''; }
}

// ── DOCX extraction ──
async function nomosExtractDocxText(file){
  try{
    if(!window.mammoth) return '';
    const ab=await file.arrayBuffer();
    const r=await mammoth.extractRawText({arrayBuffer:ab});
    return (r.value||'').replace(/\s+/g,' ').trim().slice(0,1500);
  }catch(e){ return ''; }
}

// ── Hash ──
function nomosHash(str){
  let h=0;
  for(let i=0;i<str.length;i++) h=(Math.imul(31,h)+str.charCodeAt(i))|0;
  return Math.abs(h).toString(36);
}

// ══ ΚΥΡΙΑ ΣΥΝΑΡΤΗΣΗ INDEXING ══
async function nomosStartIndexing(){
  console.log('[nomos] nomosStartIndexing called');
  if(nomosIndexing){ toast('Το indexing τρέχει ήδη','info'); return; }

  if(!window.showDirectoryPicker){
    alert('⚠️ Ο browser δεν υποστηρίζει επιλογή φακέλου.\n➜ Χρησιμοποίησε Chrome ή Edge.');
    return;
  }

  let dirHandle;
  try{
    dirHandle=await window.showDirectoryPicker({mode:'read'});
    console.log('[nomos] folder:',dirHandle.name);
  }catch(e){
    if(e.name==='AbortError') return;
    toast('Σφάλμα επιλογής φακέλου: '+e.message,'error');
    return;
  }

  nomosIndexHandle=dirHandle;
  nomosIndexing=true;
  nomosUpdateIndexUI('running');
  await nomosRequestWakeLock();

  const wrap=document.getElementById('nomos-progress-wrap');
  if(wrap) wrap.style.display='';
  nomosSetProgress(0,1,'Σάρωση αρχείων…');

  const existingIds=new Set(nomosIndex.map(e=>e.id));
  let done=0, newCount=0;

  try{
    await nomosProcessDir(dirHandle,'',existingIds,{
      onFile: async(file,relPath)=>{
        done++;
        const id=nomosHash(relPath);
        if(existingIds.has(id)) return;

        const ext=file.name.split('.').pop().toLowerCase();
        let snippet='';
        try{
          if(ext==='pdf') snippet=await nomosExtractPdfText(file);
          else if(ext==='docx'||ext==='doc') snippet=await nomosExtractDocxText(file);
        }catch(e){}

        const {cat,subcat,subcat2}=nomosPathToCategory(relPath);
        const {type,year,title}=nomosMetaFromFilename(file.name);

        nomosIndex.push({id,filename:file.name,path:relPath,
          cat,subcat,subcat2,title,type,year,snippet,score:0,indexed_at:Date.now()});
        existingIds.add(id);
        newCount++;

        nomosSetProgress(done,Math.max(done,6989),
          `${done} επεξεργάστηκαν · ${newCount} νέα indexed · σύνολο: ${nomosIndex.length}`);

        // IndexedDB save κάθε 50 νέα (γρήγορο, χωρίς Firestore quota)
        if(newCount%50===0){
          await nomosIdbSave(nomosIndex);
          await new Promise(r=>setTimeout(r,100)); // yield
        } else {
          await new Promise(r=>setTimeout(r,8)); // μικρό yield
        }
      },
      isStopped:()=>!nomosIndexing
    });
  }catch(e){
    console.error('[nomos] Indexing error:',e);
    toast('Σφάλμα: '+e.message,'error');
  }

  // Τελικό save: IndexedDB + Firestore
  nomosSetProgress(done,done,'💾 Αποθήκευση index…');
  await nomosSaveIndex(true); // forceFirestore=true μόνο εδώ

  nomosIndexing=false;
  nomosReleaseWakeLock();
  nomosUpdateIndexUI('done');
  nomosSetProgress(done,done,
    `✅ Ολοκληρώθηκε! ${newCount} νέα · σύνολο: ${nomosIndex.length}`);
  populateNomosFilters();
  renderNomos();
  updateBadges();
  toast(`✅ Index: ${nomosIndex.length} αρχεία`,'success');
}

// ── Streaming directory walker ──
async function nomosProcessDir(dirHandle,relPath,existingIds,callbacks){
  for await(const [name,handle] of dirHandle){
    if(callbacks.isStopped()) return;
    const childPath=relPath?relPath+'/'+name:name;
    if(handle.kind==='directory'){
      await nomosProcessDir(handle,childPath,existingIds,callbacks);
    } else if(/\.(pdf|docx|doc)$/i.test(name)){
      try{
        const file=await handle.getFile();
        await callbacks.onFile(file,childPath);
      }catch(e){ console.warn('[nomos] File error:',name,e.message); }
    }
  }
}

// ── Stop ──
function nomosStopIndexing(){
  nomosIndexing=false;
  nomosReleaseWakeLock();
  // Save στο IndexedDB (γρήγορο)
  nomosIdbSave(nomosIndex).then(()=>toast('⏸ Διακόπηκε — πρόοδος αποθηκεύτηκε ('+nomosIndex.length+' αρχεία)','info'));
  nomosUpdateIndexUI('stopped');
}

// ── Clear ──
async function nomosClearIndex(){
  if(!confirm(`Διαγραφή index (${nomosIndex.length} εγγραφές);`)) return;
  nomosIndex=[];
  await nomosIdbSave([]);
  renderNomos(); updateBadges();
  toast('Index διαγράφηκε','info');
}

// ── Progress UI ──
function nomosSetProgress(done,total,msg){
  const bar=document.getElementById('nomos-progress-bar');
  const txt=document.getElementById('nomos-progress-txt');
  if(!bar||!txt) return;
  bar.style.width=(total>0?Math.round(done/total*100):0)+'%';
  txt.textContent=msg;
}

function nomosUpdateIndexUI(state){
  const btnStart=document.getElementById('nomos-btn-index');
  const btnStop=document.getElementById('nomos-btn-stop');
  const wrap=document.getElementById('nomos-progress-wrap');
  if(!btnStart) return;
  if(state==='running'){
    btnStart.disabled=true; btnStart.textContent='⏳ Indexing…';
    if(btnStop) btnStop.style.display='';
    if(wrap) wrap.style.display='';
  } else {
    btnStart.disabled=false; btnStart.textContent='📂 Επιλογή φακέλου & Index';
    if(btnStop) btnStop.style.display='none';
  }
}

// ══ AI ΑΝΑΖΗΤΗΣΗ (Gemini) ══
async function nomosAiSearch(query,candidates){
  const key=getNomosGeminiKey();
  if(!key) return null;
  const prompt=`Νομικά αρχεία. Ο χρήστης ψάχνει: "${query}".
Επέστρεψε ΜΟΝΟ JSON array με τα ids των 3 πιο σχετικών, με σειρά σχετικότητας.
Αρχεία:
${JSON.stringify(candidates.map(c=>({id:c.id,title:c.title,path:c.path,snippet:(c.snippet||'').slice(0,200)})))}
Απάντηση (ΜΟΝΟ JSON array):`;
  try{
    const res=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify({contents:[{parts:[{text:prompt}]}],
         generationConfig:{temperature:0,maxOutputTokens:200}})});
    const data=await res.json();
    const text=data?.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const match=text.match(/\[.*\]/s);
    if(match) return JSON.parse(match[0]);
  }catch(e){ console.warn('Gemini:',e); }
  return null;
}

// ── Keyword search ──
function nomosKeywordSearch(query){
  const words=query.toLowerCase().split(/\s+/).filter(w=>w.length>2);
  if(!words.length) return [...nomosIndex];
  return nomosIndex.filter(e=>{
    const h=(e.title+' '+e.filename+' '+e.path+' '+(e.snippet||'')+' '+e.cat+' '+e.subcat).toLowerCase();
    return words.some(w=>h.includes(w));
  });
}

async function nomosDoSearch(){
  const q=(document.getElementById('nomos-search')||{value:''}).value.trim();
  const fCat=(document.getElementById('nomos-f-folder')||{value:''}).value;
  const fSub=(document.getElementById('nomos-f-sub')||{value:''}).value;
  const fType=(document.getElementById('nomos-f-type')||{value:''}).value;
  const fYear=(document.getElementById('nomos-f-year')||{value:''}).value;

  let results=[...nomosIndex];
  if(fCat)  results=results.filter(e=>e.cat===fCat);
  if(fSub)  results=results.filter(e=>e.subcat===fSub);
  if(fType) results=results.filter(e=>e.type===fType);
  if(fYear) results=results.filter(e=>e.year===fYear);

  if(q){
    results=nomosKeywordSearch(q).filter(e=>
      (!fCat||e.cat===fCat)&&(!fSub||e.subcat===fSub)&&
      (!fType||e.type===fType)&&(!fYear||e.year===fYear));
    if(results.length>5 && getNomosGeminiKey() && !nomosAiPending){
      nomosAiPending=true;
      const aiBtn=document.getElementById('nomos-ai-status');
      if(aiBtn) aiBtn.textContent='🤖 AI…';
      const aiIds=await nomosAiSearch(q,results.slice(0,30));
      nomosAiPending=false;
      if(aiBtn) aiBtn.textContent='';
      if(aiIds&&aiIds.length){
        const aiMap=new Map(aiIds.map((id,i)=>[id,i]));
        results=[
          ...aiIds.map(id=>results.find(e=>e.id===id)).filter(Boolean),
          ...results.filter(e=>!aiMap.has(e.id))
        ];
      }
    }
  }

  results.sort((a,b)=>(b.score||0)-(a.score||0)||(b.indexed_at||0)-(a.indexed_at||0));
  nomosSearchResults=results;
  renderNomosResults(results,q);
}

// ── Feedback ──
async function nomosFeedback(id){
  const e=nomosIndex.find(e=>e.id===id);
  if(!e) return;
  e.score=(e.score||0)+1;
  await nomosIdbSave(nomosIndex);
  toast('👍 Θα εμφανίζεται ψηλότερα!','success');
  const row=document.querySelector(`[data-nomos-id="${id}"]`);
  if(row) row.style.background='#f0fdf4';
}

// ── Open file (copy path) ──
function nomosOpenFile(path){
  const box=document.getElementById('nomos-path-box');
  const txt=document.getElementById('nomos-path-txt');
  if(box&&txt){
    txt.value=path.replace(/\//g,'\\');
    box.style.display='';
    txt.select();
    try{ document.execCommand('copy'); toast('📋 Διαδρομή αντιγράφηκε!','success'); }
    catch(e){}
  }
}

// ── Render ──
function renderNomosResults(results,query){
  const tbody=document.getElementById('nomos-tbody');
  const countEl=document.getElementById('nomos-count');
  if(!tbody) return;
  if(!results.length){
    tbody.innerHTML='<tr><td colspan="6" class="table-empty">Δεν βρέθηκαν αρχεία</td></tr>';
    if(countEl) countEl.textContent=''; return;
  }
  const show=results.slice(0,200);
  const q=(query||'').toLowerCase();
  tbody.innerHTML=show.map((e,idx)=>{
    const isAiTop=idx<3&&q&&getNomosGeminiKey();
    const aiBadge=isAiTop?'<span style="font-size:10px;background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:8px;margin-left:4px">AI ✦</span>':'';
    const scoreBadge=e.score>0?`<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:1px 5px;border-radius:8px">★${e.score}</span>`:'';
    const snippet=e.snippet?`<div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:400px">${esc(e.snippet.slice(0,120))}</div>`:'';
    return `<tr data-nomos-id="${e.id}" ${isAiTop?'style="background:linear-gradient(90deg,#eff6ff,transparent)"':''}>
      <td style="font-size:11px"><span class="badge badge-gray">${esc(e.type)}</span></td>
      <td><div>${esc(e.title)}${aiBadge}${scoreBadge}</div>${snippet}</td>
      <td style="font-size:12px">${esc(e.year)}</td>
      <td style="font-size:11px;color:var(--text3)">${esc(e.cat)}</td>
      <td style="font-size:11px;color:var(--text3)">${esc(e.subcat)}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-secondary btn-sm" onclick="nomosOpenFile('${esc(e.path)}')" title="Αντιγραφή διαδρομής">📋</button>
        <button class="btn btn-secondary btn-sm" onclick="nomosFeedback('${e.id}')" title="Αυτό ήταν!">👍</button>
      </div></td>
    </tr>`;
  }).join('');
  if(countEl) countEl.textContent=results.length>200
    ?`Εμφανίζονται 200 από ${results.length}`:`${results.length} αρχεία`;
}

function renderNomos(){ nomosDoSearch(); }

// ── Filters ──
function populateNomosFilters(){
  const sv=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html;};
  const cats=[...new Set(nomosIndex.map(e=>e.cat).filter(Boolean))].sort();
  const types=[...new Set(nomosIndex.map(e=>e.type).filter(Boolean))].sort();
  const years=[...new Set(nomosIndex.map(e=>e.year).filter(Boolean))].sort().reverse();
  sv('nomos-f-folder','<option value="">Όλες οι κατηγορίες</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join(''));
  sv('nomos-f-type','<option value="">Όλοι οι τύποι</option>'+types.map(t=>`<option>${esc(t)}</option>`).join(''));
  sv('nomos-f-year','<option value="">Όλα τα έτη</option>'+years.map(y=>`<option>${esc(y)}</option>`).join(''));
}

function onNomosTopFolderChange(){
  const fCat=(document.getElementById('nomos-f-folder')||{value:''}).value;
  const subcats=[...new Set(nomosIndex.filter(e=>!fCat||e.cat===fCat).map(e=>e.subcat).filter(Boolean))].sort();
  const fSub=document.getElementById('nomos-f-sub');
  if(fSub) fSub.innerHTML='<option value="">Όλοι οι υποφάκελοι</option>'+subcats.map(s=>`<option>${esc(s)}</option>`).join('');
  nomosDoSearch();
}

// ── Init ──
async function nomosInit(){
  await nomosLoadIndex();
  populateNomosFilters();
  renderNomos();
  nomosUpdateStats();
}

// ── Gemini key dialog ──
function nomosShowKeyDialog(){
  const current=getNomosGeminiKey();
  const key=prompt(
    'Gemini API Key (δωρεάν από aistudio.google.com)\n'+
    'Αποθηκεύεται στον browser σου.\n\n'+
    (current?'Τρέχον key: …'+current.slice(-8):'Δεν υπάρχει key.'),current);
  if(key===null) return;
  if(key.trim()){ setNomosGeminiKey(key.trim()); toast('✅ Gemini key αποθηκεύτηκε','success'); }
  else{ try{localStorage.removeItem(NOMOS_GEMINI_KEY_STORE);}catch(e){} toast('Gemini key αφαιρέθηκε','info'); }
}

// ── Stats bar ──
function nomosUpdateStats(){
  const el=document.getElementById('nomos-total-count');
  if(el) el.textContent='Index: '+nomosIndex.length+' αρχεία'+(getNomosGeminiKey()?' · AI 🤖 ενεργό':'');
}
