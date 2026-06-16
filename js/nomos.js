// ══ ΝΟΜΟΘΕΣΙΑ v6 — Auto-indexing + AI Search ══

// ── State ──
// nomosIndex δηλώνεται στο config.js ως global
let nomosIndexing = false;
let nomosIndexHandle = null;
let nomosSearchResults = [];
let nomosAiPending = false;
const NOMOS_GEMINI_KEY_STORE = 'nomos_gemini_key';
const NOMOS_INDEX_STORE = 'nomos_index_v6';
const NOMOS_BATCH = 10;        // 10 αρχεία ανά batch (λιγότερο freeze)

// ── Gemini key (αποθηκεύεται local) ──
function getNomosGeminiKey(){
  return localStorage.getItem(NOMOS_GEMINI_KEY_STORE)||'';
}
function setNomosGeminiKey(k){
  localStorage.setItem(NOMOS_GEMINI_KEY_STORE, k.trim());
}

// ── Load/Save index (Firestore ή localStorage) ──
async function nomosLoadIndex(){
  // Firestore chunks
  if(USE_FIREBASE && db){
    try{
      let all = [];
      for(let c=0; c<20; c++){
        const snap = await db.collection('nomosIndex').doc('chunk_'+c).get();
        if(!snap.exists) break;
        all = all.concat(snap.data().items||[]);
      }
      if(all.length){ nomosIndex = all; return; }
      // Fallback: παλιό single-doc format
      const old = await db.collection('nomosIndex').doc('v6').get();
      if(old.exists){ nomosIndex = old.data().items||[]; return; }
    }catch(e){ console.warn('Firestore load error:', e); }
  }
  // localStorage fallback
  try{
    const raw = localStorage.getItem(NOMOS_INDEX_STORE);
    if(raw) nomosIndex = JSON.parse(raw);
  }catch(e){}
}

async function nomosSaveIndex(){
  if(USE_FIREBASE && db){
    try{
      const CHUNK = 200; // μικρότερα chunks — πιο ασφαλές
      const chunks = [];
      for(let i=0; i<nomosIndex.length; i+=CHUNK)
        chunks.push(nomosIndex.slice(i,i+CHUNK));

      // Γράψιμο chunks σε ξεχωριστά batches (όχι ένα μεγάλο)
      for(let i=0; i<chunks.length; i++){
        await db.collection('nomosIndex').doc('chunk_'+i).set({
          items: chunks[i],
          updated: Date.now(),
          total: nomosIndex.length,
          chunkCount: chunks.length
        });
      }
      // Διαγραφή τυχόν παλιών chunks που περίσσεψαν
      const delBatch = db.batch();
      for(let i=chunks.length; i<chunks.length+10; i++)
        delBatch.delete(db.collection('nomosIndex').doc('chunk_'+i));
      await delBatch.commit();
    }catch(e){ console.warn('Firestore save error:', e); }
  }
  // localStorage fallback
  try{
    const json = JSON.stringify(nomosIndex);
    if(json.length < 4*1024*1024)
      localStorage.setItem(NOMOS_INDEX_STORE, json);
    else
      localStorage.removeItem(NOMOS_INDEX_STORE);
  }catch(e){}
}

// ── Wake Lock: αποτρέπει throttling όταν το tab γίνεται inactive ──
let _wakeLock = null;
async function nomosRequestWakeLock(){
  if(!('wakeLock' in navigator)) return;
  try{
    _wakeLock = await navigator.wakeLock.request('screen');
    console.log('[nomos] Wake Lock ενεργό — tab δεν θα κοιμηθεί');
  }catch(e){ console.warn('[nomos] Wake Lock απέτυχε:', e.message); }
}
function nomosReleaseWakeLock(){
  if(_wakeLock){ try{ _wakeLock.release(); }catch(e){} _wakeLock=null;
    console.log('[nomos] Wake Lock αποδεσμεύτηκε');
  }
}
function nomosPathToCategory(path){
  const parts = path.replace(/\\/g,'/').split('/').filter(Boolean);
  return {
    cat:    parts[0]||'',
    subcat: parts[1]||'',
    subcat2:parts[2]||''
  };
}

// ── Εξαγωγή μεταδεδομένων από filename ──
function nomosMetaFromFilename(filename){
  const name = filename.replace(/\.(pdf|docx|doc)$/i,'');
  // Τύπος εγγράφου
  let type = 'Άλλο';
  if(/\bΝ\.?\s*\d|νόμος/i.test(name)) type='Νόμος';
  else if(/\bΠΔ\b|Π\.Δ\./i.test(name)) type='ΠΔ';
  else if(/\bΥΑ\b|ΥΠ\.?ΑΠ|Υπουργ.*Απόφ/i.test(name)) type='ΥΑ';
  else if(/\bΦΕΚ\b/i.test(name)) type='ΦΕΚ';
  else if(/εγκύκλ|circular/i.test(name)) type='Εγκύκλιος';
  else if(/οδηγία|directive/i.test(name)) type='Οδηγία ΕΕ';
  // Έτος
  const yearMatch = name.match(/\b(19[89]\d|20[012]\d)\b/);
  const year = yearMatch ? yearMatch[1] : '';
  return {type, year, title: name};
}

// ── PDF text extraction (readable only) ──
async function nomosExtractPdfText(file){
  try{
    if(!window.pdfjsLib) return '';
    // Χρήση URL object αντί arrayBuffer — λιγότερη μνήμη
    const url = URL.createObjectURL(file);
    let pdf;
    try{ pdf = await pdfjsLib.getDocument(url).promise; }
    finally{ URL.revokeObjectURL(url); }

    const totalPages = pdf.numPages;
    let text = '';

    if(totalPages <= 10){
      for(let i=1; i<=totalPages; i++){
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(s=>s.str).join(' ') + '\n';
      }
    } else {
      const mid = Math.floor(totalPages/2);
      const pagesToRead = [1,2,3, mid,mid+1, totalPages-1,totalPages]
        .filter((p,i,a)=>p>=1&&p<=totalPages&&a.indexOf(p)===i);
      for(const pageNum of pagesToRead){
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        text += content.items.map(s=>s.str).join(' ') + '\n';
      }
    }
    // Αν δεν βρέθηκε κείμενο → scanned PDF, skip
    if(text.trim().length < 20) return '';
    return text.trim().slice(0,4000);
  }catch(e){ return ''; }
}

// ── DOCX text extraction (mammoth.js) ──
async function nomosExtractDocxText(file){
  try{
    if(window.mammoth){
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({arrayBuffer});
      return (result.value||'').replace(/\s+/g,' ').trim().slice(0,4000);
    }
  }catch(e){}
  return '';
}

// ── Hash για unique ID ──
function nomosHash(str){
  let h=0;
  for(let i=0;i<str.length;i++){ h=(Math.imul(31,h)+str.charCodeAt(i))|0; }
  return Math.abs(h).toString(36);
}

// ── ΚΥΡΙΑ ΣΥΝΑΡΤΗΣΗ INDEXING ──
async function nomosStartIndexing(){
  console.log('[nomos] nomosStartIndexing called');
  if(nomosIndexing){ toast('Το indexing τρέχει ήδη','info'); return; }

  // Browser detection
  console.log('[nomos] showDirectoryPicker:', typeof window.showDirectoryPicker);
  if(!window.showDirectoryPicker){
    const isFirefox = navigator.userAgent.includes('Firefox');
    const isSafari  = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    let msg = '⚠️ Ο browser σου δεν υποστηρίζει επιλογή φακέλου (File System Access API).\n\n';
    if(isFirefox) msg += 'Firefox δεν υποστηρίζει αυτή τη λειτουργία.\n➜ Χρησιμοποίησε Chrome ή Edge.';
    else if(isSafari) msg += 'Safari δεν υποστηρίζει αυτή τη λειτουργία.\n➜ Χρησιμοποίησε Chrome ή Edge.';
    else msg += '➜ Χρησιμοποίησε Google Chrome ή Microsoft Edge (έκδοση 86+).';
    alert(msg);
    return;
  }

  // Επιλογή φακέλου
  let dirHandle;
  console.log('[nomos] opening directory picker…');
  try{
    dirHandle = await window.showDirectoryPicker({mode:'read'});
    console.log('[nomos] folder selected:', dirHandle.name);
  }catch(e){
    console.error('[nomos] picker error:', e.name, e.message);
    if(e.name==='AbortError') return; // χρήστης έκλεισε το dialog
    if(e.name==='SecurityError'){
      alert('Σφάλμα ασφαλείας: Βεβαιώσου ότι η σελίδα φορτώνεται μέσω HTTPS (Netlify).');
    } else {
      toast('Σφάλμα επιλογής φακέλου: '+e.message,'error');
      console.error('showDirectoryPicker error:', e);
    }
    return;
  }

  nomosIndexHandle = dirHandle;
  nomosIndexing = true;
  nomosUpdateIndexUI('running');
  await nomosRequestWakeLock(); // αποτρέπει throttling

  // Εμφάνιση progress wrap
  const wrap = document.getElementById('nomos-progress-wrap');
  if(wrap) wrap.style.display='';
  nomosSetProgress(0,1,'Σάρωση αρχείων — παρακαλώ περίμενε…');

  // Συλλογή αρχείων
  let allFiles = [];
  try{
    await nomosCollectFiles(nomosIndexHandle, '', allFiles);
  }catch(e){
    toast('Σφάλμα ανάγνωσης φακέλου: '+e.message,'error');
    console.error('nomosCollectFiles error:', e);
    nomosIndexing = false;
    nomosUpdateIndexUI('done');
    return;
  }

  if(!allFiles.length){
    toast('Δεν βρέθηκαν PDF/DOCX αρχεία στον φάκελο','info');
    nomosIndexing = false;
    nomosUpdateIndexUI('done');
    return;
  }

  const total = allFiles.length;
  let done = 0, newCount = 0;
  const existingIds = new Set(nomosIndex.map(e=>e.id));

  nomosSetProgress(0, total, `Βρέθηκαν ${total} αρχεία — ξεκινά indexing…`);

  for(let i=0; i<allFiles.length; i+=NOMOS_BATCH){
    if(!nomosIndexing) break;

    const batch = allFiles.slice(i, i+NOMOS_BATCH);
    for(const {file, relPath} of batch){
      if(!nomosIndexing) break;
      const id = nomosHash(relPath);
      if(existingIds.has(id)){ done++; continue; }

      const ext = file.name.split('.').pop().toLowerCase();
      let snippet = '';
      try{
        if(ext==='pdf') snippet = await nomosExtractPdfText(file);
        else if(ext==='docx'||ext==='doc') snippet = await nomosExtractDocxText(file);
      }catch(e){ console.warn('Extract error:', file.name, e); }

      const {cat,subcat,subcat2} = nomosPathToCategory(relPath);
      const {type,year,title}    = nomosMetaFromFilename(file.name);

      nomosIndex.push({id,filename:file.name,path:relPath,cat,subcat,subcat2,title,type,year,snippet,score:0,indexed_at:Date.now()});
      existingIds.add(id);
      newCount++;
      done++;
    }

    nomosSetProgress(done, total, `${done} / ${total} αρχεία (${newCount} νέα)…`);
    // Αποθήκευση κάθε 10 αρχεία
    try{ await nomosSaveIndex(); }catch(e){ console.warn('Save error:', e); }
    // Yield 50ms — δίνει χρόνο στον browser να μην παγώσει
    await new Promise(r=>setTimeout(r,50));
  }

  nomosIndexing = false;
  nomosReleaseWakeLock();
  nomosUpdateIndexUI('done');

  const msg = nomosIndexing===false && done===total
    ? `✅ Ολοκληρώθηκε! ${newCount} νέα / ${nomosIndex.length} σύνολο`
    : `⏸ Διακόπηκε — ${done}/${total} (${nomosIndex.length} σύνολο)`;
  nomosSetProgress(total, total, msg);

  populateNomosFilters();
  renderNomos();
  updateBadges();
  toast(nomosIndex.length ? `✅ Index: ${nomosIndex.length} αρχεία` : 'Index κενό','success');
}

// ── Recursive file collector ──
async function nomosCollectFiles(dirHandle, relPath, results){
  for await(const [name, handle] of dirHandle){
    const childPath = relPath ? relPath+'/'+name : name;
    if(handle.kind==='directory'){
      await nomosCollectFiles(handle, childPath, results);
    } else if(/\.(pdf|docx|doc)$/i.test(name)){
      try{
        const file = await handle.getFile();
        results.push({file, relPath: childPath});
      }catch(e){}
    }
  }
}

// ── Stop indexing ──
function nomosStopIndexing(){
  nomosIndexing = false;
  nomosReleaseWakeLock();
  nomosUpdateIndexUI('stopped');
  toast('Indexing διακόπηκε — αποθηκεύτηκε η πρόοδος','info');
}

// ── Clear index ──
async function nomosClearIndex(){
  if(!confirm(`Διαγραφή όλου του index (${nomosIndex.length} εγγραφές); Δεν αναιρείται.`)) return;
  nomosIndex = [];
  await nomosSaveIndex();
  renderNomos();
  updateBadges();
  toast('Index διαγράφηκε','info');
}

// ── Progress UI ──
function nomosSetProgress(done, total, msg){
  const bar = document.getElementById('nomos-progress-bar');
  const txt = document.getElementById('nomos-progress-txt');
  if(!bar||!txt) return;
  const pct = total>0 ? Math.round(done/total*100) : 0;
  bar.style.width = pct+'%';
  txt.textContent = msg;
}

function nomosUpdateIndexUI(state){
  const btnStart = document.getElementById('nomos-btn-index');
  const btnStop  = document.getElementById('nomos-btn-stop');
  const btnClear = document.getElementById('nomos-btn-clear');
  const wrap     = document.getElementById('nomos-progress-wrap');
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

async function nomosAiSearch(query, candidates){
  const key = getNomosGeminiKey();
  if(!key) return null;
  const prompt = `Έχεις τα παρακάτω νομικά αρχεία (JSON). Ο χρήστης ψάχνει: "${query}".
Επέστρεψε ΜΟΝΟ JSON array με τα ids των 3 πιο σχετικών αρχείων, με σειρά σχετικότητας.
Αρχεία:
${JSON.stringify(candidates.map(c=>({id:c.id,title:c.title,path:c.path,snippet:c.snippet?.slice(0,300)})))}
Απάντηση (ΜΟΝΟ JSON array of ids, πχ ["abc","def","ghi"]):`;

  try{
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({contents:[{parts:[{text:prompt}]}],
        generationConfig:{temperature:0,maxOutputTokens:200}})
    });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const match = text.match(/\[.*\]/s);
    if(match) return JSON.parse(match[0]);
  }catch(e){ console.warn('Gemini error:',e); }
  return null;
}

// ── Keyword search (local, γρήγορο) ──
function nomosKeywordSearch(query){
  const words = query.toLowerCase().split(/\s+/).filter(w=>w.length>2);
  if(!words.length) return [...nomosIndex];
  return nomosIndex.filter(e=>{
    const haystack = (e.title+' '+e.filename+' '+e.path+' '+e.snippet+' '+e.cat+' '+e.subcat).toLowerCase();
    return words.some(w=>haystack.includes(w));
  });
}

async function nomosDoSearch(){
  const q = (document.getElementById('nomos-search')||{value:''}).value.trim();
  const fCat = (document.getElementById('nomos-f-folder')||{value:''}).value;
  const fSub = (document.getElementById('nomos-f-sub')||{value:''}).value;
  const fType = (document.getElementById('nomos-f-type')||{value:''}).value;
  const fYear = (document.getElementById('nomos-f-year')||{value:''}).value;

  let results = [...nomosIndex];
  if(fCat)  results = results.filter(e=>e.cat===fCat);
  if(fSub)  results = results.filter(e=>e.subcat===fSub);
  if(fType) results = results.filter(e=>e.type===fType);
  if(fYear) results = results.filter(e=>e.year===fYear);

  if(q){
    // Keyword φίλτρο πρώτα
    results = nomosKeywordSearch(q).filter(e=>
      (!fCat||e.cat===fCat)&&(!fSub||e.subcat===fSub)&&
      (!fType||e.type===fType)&&(!fYear||e.year===fYear)
    );

    // AI reranking αν έχουμε Gemini key και >5 αποτελέσματα
    if(results.length>5 && getNomosGeminiKey() && !nomosAiPending){
      nomosAiPending = true;
      const aiBtn = document.getElementById('nomos-ai-status');
      if(aiBtn) aiBtn.textContent='🤖 AI αναζήτηση…';
      const top30 = results.slice(0,30);
      const aiIds = await nomosAiSearch(q, top30);
      nomosAiPending = false;
      if(aiBtn) aiBtn.textContent='';
      if(aiIds && aiIds.length){
        const aiMap = new Map(aiIds.map((id,i)=>[id,i]));
        // AI top 3 πρώτα, μετά τα υπόλοιπα
        results = [
          ...aiIds.map(id=>results.find(e=>e.id===id)).filter(Boolean),
          ...results.filter(e=>!aiMap.has(e.id))
        ];
      }
    }
  }

  // Ταξινόμηση: score (feedback) πρώτα
  results.sort((a,b)=>(b.score||0)-(a.score||0)||(b.indexed_at||0)-(a.indexed_at||0));

  nomosSearchResults = results;
  renderNomosResults(results, q);
}

// ── Feedback: "Αυτό ήταν!" ──
async function nomosFeedback(id){
  const entry = nomosIndex.find(e=>e.id===id);
  if(!entry) return;
  entry.score = (entry.score||0)+1;
  await nomosSaveIndex();
  toast('👍 Ευχαριστώ! Θα εμφανίζεται ψηλότερα στο μέλλον','success');
  // Visual feedback
  const row = document.querySelector(`[data-nomos-id="${id}"]`);
  if(row) row.style.background='#f0fdf4';
}

// ── Open file ──
function nomosOpenFile(path){
  // Για OneDrive: δεν μπορούμε να ανοίξουμε local files από browser
  // Εμφανίζουμε το path για copy-paste στον Explorer
  const box = document.getElementById('nomos-path-box');
  const txt = document.getElementById('nomos-path-txt');
  if(box&&txt){
    txt.value = path.replace(/\//g,'\\');
    box.style.display='';
    txt.select();
    try{ document.execCommand('copy'); toast('📋 Διαδρομή αντιγράφηκε!','success'); }
    catch(e){}
  }
}

// ── Render results table ──
function renderNomosResults(results, query){
  const tbody = document.getElementById('nomos-tbody');
  const countEl = document.getElementById('nomos-count');
  if(!tbody) return;

  if(!results.length){
    tbody.innerHTML='<tr><td colspan="7" class="table-empty">Δεν βρέθηκαν αρχεία</td></tr>';
    if(countEl) countEl.textContent='';
    return;
  }

  const show = results.slice(0,200);
  const q = (query||'').toLowerCase();

  tbody.innerHTML = show.map((e,idx)=>{
    const isAiTop = idx<3 && q && getNomosGeminiKey();
    const rowStyle = isAiTop ? 'background:linear-gradient(90deg,#eff6ff,transparent)' : '';
    const aiBadge = isAiTop ? '<span style="font-size:10px;background:#dbeafe;color:#1d4ed8;padding:1px 5px;border-radius:8px;margin-left:4px">AI ✦</span>' : '';
    const scoreBadge = e.score>0 ? `<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:1px 5px;border-radius:8px" title="Επιλέχθηκε ${e.score} φορές">★${e.score}</span>` : '';
    const snippet = e.snippet ? `<div style="font-size:11px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px">${esc(e.snippet.slice(0,120))}</div>` : '';
    return `<tr data-nomos-id="${e.id}" style="${rowStyle}">
      <td style="font-size:11px"><span class="badge badge-gray">${esc(e.type)}</span></td>
      <td><div>${esc(e.title)}${aiBadge}${scoreBadge}</div>${snippet}</td>
      <td style="font-size:12px">${esc(e.year)}</td>
      <td style="font-size:11px;color:var(--text3)">${esc(e.cat)}</td>
      <td style="font-size:11px;color:var(--text3)">${esc(e.subcat)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-secondary btn-sm" onclick="nomosOpenFile('${esc(e.path)}')" title="Αντιγραφή διαδρομής">📋</button>
          <button class="btn btn-secondary btn-sm" onclick="nomosFeedback('${e.id}')" title="Αυτό ήταν που έψαχνα!">👍</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  if(countEl) countEl.textContent = results.length>200
    ? `Εμφανίζονται 200 από ${results.length} αποτελέσματα`
    : `${results.length} αρχεία`;
}

// alias για compatibility
function renderNomos(){ nomosDoSearch(); }

// ── Populate filters ──
function populateNomosFilters(){
  const cats  = [...new Set(nomosIndex.map(e=>e.cat).filter(Boolean))].sort();
  const types = [...new Set(nomosIndex.map(e=>e.type).filter(Boolean))].sort();
  const years = [...new Set(nomosIndex.map(e=>e.year).filter(Boolean))].sort().reverse();

  const fCat = document.getElementById('nomos-f-folder');
  if(fCat){
    const prev = fCat.value;
    fCat.innerHTML='<option value="">Όλες οι κατηγορίες</option>'+
      cats.map(c=>`<option ${c===prev?'selected':''}>${esc(c)}</option>`).join('');
  }
  const fType = document.getElementById('nomos-f-type');
  if(fType){
    const prev = fType.value;
    fType.innerHTML='<option value="">Όλοι οι τύποι</option>'+
      types.map(t=>`<option ${t===prev?'selected':''}>${esc(t)}</option>`).join('');
  }
  const fYear = document.getElementById('nomos-f-year');
  if(fYear){
    const prev = fYear.value;
    fYear.innerHTML='<option value="">Όλα τα έτη</option>'+
      years.map(y=>`<option ${y===prev?'selected':''}>${esc(y)}</option>`).join('');
  }
}

function onNomosTopFolderChange(){
  const fCat = (document.getElementById('nomos-f-folder')||{value:''}).value;
  const subcats = [...new Set(
    nomosIndex.filter(e=>!fCat||e.cat===fCat).map(e=>e.subcat).filter(Boolean)
  )].sort();
  const fSub = document.getElementById('nomos-f-sub');
  if(fSub){
    fSub.innerHTML='<option value="">Όλοι οι υποφάκελοι</option>'+
      subcats.map(s=>`<option>${esc(s)}</option>`).join('');
  }
  nomosDoSearch();
}

// ── Init (καλείται από afterLogin) ──
async function nomosInit(){
  await nomosLoadIndex();
  populateNomosFilters();
  renderNomos();
}

// ── Gemini key dialog ──
function nomosShowKeyDialog(){
  const current = getNomosGeminiKey();
  const key = prompt(
    'Gemini API Key (δωρεάν από aistudio.google.com)\n' +
    'Αποθηκεύεται μόνο στον browser σου (localStorage).\n\n' +
    (current ? 'Τρέχον key: …'+current.slice(-8) : 'Δεν υπάρχει key ακόμα.'),
    current
  );
  if(key===null) return; // cancel
  if(key.trim()){
    setNomosGeminiKey(key.trim());
    toast('✅ Gemini API key αποθηκεύτηκε','success');
  } else {
    localStorage.removeItem(NOMOS_GEMINI_KEY_STORE);
    toast('Gemini key αφαιρέθηκε','info');
  }
}

// ── Update stats bar ──
function nomosUpdateStats(){
  const el = document.getElementById('nomos-total-count');
  if(el) el.textContent = 'Index: '+nomosIndex.length+' αρχεία'+(getNomosGeminiKey()?' · AI 🤖 ενεργό':'');
}
