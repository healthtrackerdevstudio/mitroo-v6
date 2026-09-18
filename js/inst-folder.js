// ══════════════════════════════════════════════════════════
//  inst-folder.js  —  Φάκελος Εγκατάστασης (tabbed modal)
//  Tabs: Στοιχεία · Πιστοποιητικά · Εξοπλισμός · Στατιστικά · Ιστορικό
// ══════════════════════════════════════════════════════════

let _folderFak = null;          // τρέχων ανοιχτός φάκελος
let _folderTab = 'stoixeia';    // τρέχον tab
let _folderDirty = {};          // {tab: true/false} — unsaved changes
const FOLDER_TABS = ['stoixeia','pistopoiitika','exoplismos','statistika','istoriko'];

// ── Άνοιγμα φακέλου ──────────────────────────────────────
function openFolder(fak, tab='stoixeia'){
  _folderFak = fak;
  _folderDirty = {};
  const inst = installations.find(i=>i.fak===fak);
  const title = inst ? `${esc(fak)} — ${esc(inst.name||'')}` : esc(fak);
  document.getElementById('folder-title').innerHTML = `🗂️ ${title}`;
  // Κρύψε τη λίστα εγκαταστάσεων
  const instView = document.getElementById('view-inst');
  if(instView) instView.style.display = 'none';
  // Άνοιξε modal
  document.getElementById('modal-folder').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  folderSwitchTab(tab);
}

// ── Κλείσιμο φακέλου ─────────────────────────────────────
function closeFolder(){
  const hasDirty = Object.values(_folderDirty).some(Boolean);
  if(hasDirty){
    if(!confirm('Έχουν γίνει αλλαγές που δεν έχουν αποθηκευτεί.\nΚλείσιμο χωρίς αποθήκευση;')) return;
  }
  _folderFak = null;
  _folderDirty = {};
  document.getElementById('modal-folder').style.display = 'none';
  document.body.style.overflow = '';
  // Επαναφορά λίστας
  const instView = document.getElementById('view-inst');
  if(instView) instView.style.display = '';
}

// ── Αλλαγή tab ───────────────────────────────────────────
function folderSwitchTab(tab){
  _folderTab = tab;
  // Nav buttons
  FOLDER_TABS.forEach(t=>{
    const btn = document.getElementById('folder-tab-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
  });
  // Panels
  FOLDER_TABS.forEach(t=>{
    const panel = document.getElementById('folder-panel-'+t);
    if(panel) panel.style.display = t===tab ? '' : 'none';
  });
  // Φόρτωση περιεχομένου tab
  if(tab==='stoixeia')        folderLoadStoixeia();
  else if(tab==='pistopoiitika') folderLoadPistopoiitika();
  else if(tab==='exoplismos') folderLoadExoplismos();
  else if(tab==='statistika') folderLoadStatistika();
  else if(tab==='istoriko')   folderLoadIstoriko();
  folderUpdateTabSaveBtns(tab);
}

// ── Dirty tracking ────────────────────────────────────────
function folderMarkDirty(tab){
  _folderDirty[tab] = true;
  const btn = document.getElementById('folder-tab-'+tab);
  if(btn && !btn.querySelector('.dirty-dot')){
    const dot = document.createElement('span');
    dot.className = 'dirty-dot';
    dot.style.cssText = 'display:inline-block;width:6px;height:6px;background:#f97316;border-radius:50%;margin-left:5px;vertical-align:middle';
    btn.appendChild(dot);
  }
}
function folderClearDirty(tab){
  _folderDirty[tab] = false;
  const btn = document.getElementById('folder-tab-'+tab);
  if(btn){ const dot=btn.querySelector('.dirty-dot'); if(dot) dot.remove(); }
}

// ══ TAB: ΣΤΟΙΧΕΙΑ ══════════════════════════════════════════
function folderLoadStoixeia(){
  const panel = document.getElementById('folder-panel-stoixeia');
  if(!panel || !_folderFak) return;
  // Χρησιμοποιούμε το υπάρχον openInstModal — αλλά render στο panel
  const inst = installations.find(i=>i.fak===_folderFak)||{};
  panel.innerHTML = buildStoixeiaForm(inst);
  // Dirty tracking μόνο μετά από user interaction
  setTimeout(()=>{
    panel.querySelectorAll('input,select,textarea').forEach(el=>{
      el.addEventListener('change', ()=>folderMarkDirty('stoixeia'));
      el.addEventListener('input',  ()=>folderMarkDirty('stoixeia'));
    });
    onInstTypeChange();
  }, 100);
}

function buildStoixeiaForm(i){
  const v = (f,def='') => esc(i[f]||def);
  const chk = (f) => i[f] ? 'checked' : '';
  // Datalist για Περιοχή από υπάρχουσες τιμές
  const topoList = [...new Set(installations.map(x=>x.topothesia).filter(Boolean))].sort();
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px 16px;padding:4px">

    <div class="form-group"><label>ΦΑΚ</label>
      <input class="form-control" id="if-fak" value="${v('fak')}" disabled></div>

    <div class="form-group"><label>Τμήμα / Φύλλο</label>
      <select class="form-control" id="if-sheet" onchange="onInstTypeChange()">
        <option value="">—</option>
        <option${i.sheet==='inst'?' selected':''} value="inst">Εγκαταστάσεις</option>
        <option${i.sheet==='auto'?' selected':''} value="auto">Αυτοκίνητα</option>
      </select></div>

    <div class="form-group"><label>Τύπος Εγκατάστασης</label>
      <select class="form-control" id="if-type" onchange="onInstTypeChange()">
        <option value="">—</option>
        ${INST_TYPES.map(t=>`<option${i.type===t?' selected':''}>${t}</option>`).join('')}
        <option value="__other__"${!INST_TYPES.includes(i.type)&&i.type?' selected':''}>Άλλο…</option>
      </select></div>

    <div class="form-group"><label>Άδεια Λειτουργίας — Αρ.</label>
      <input class="form-control" id="if-adeia-num" value="${v('adeia_num')}"></div>

    <div class="form-group" id="if-other-wrap" style="display:none">
      <label>Άλλος Τύπος</label>
      <input class="form-control" id="if-other-type" value="${!INST_TYPES.includes(i.type)?v('type'):''}"></div>

    <div class="form-group ff"><label>Επωνυμία <span class="req">*</span></label>
      <input class="form-control" id="if-name" value="${v('name')}"></div>

    <div class="form-group"><label>ΑΦΜ</label>
      <input class="form-control" id="if-afm" value="${v('afm')}"></div>

    <div class="form-group"><label>Περιοχή</label>
      <input class="form-control" id="if-topothesia" placeholder="π.χ. ΒΑΡΗ" list="folder-topo-datalist" autocomplete="off" value="${v('topothesia')}">
      <datalist id="folder-topo-datalist">${topoList.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>

    <div class="form-group ff"><label>Διεύθυνση <span class="req">*</span></label>
      <input class="form-control" id="if-address" value="${v('address')}"></div>

    <div class="form-group"><label>Τηλέφωνο</label>
      <input class="form-control" id="if-tel" value="${v('tel')}"></div>

    <div class="form-group"><label>Email</label>
      <input class="form-control" type="email" id="if-email" value="${v('email')}"></div>

    <div class="form-group"><label>Υπεύθυνος Λειτουργίας</label>
      <input class="form-control" id="if-ypeuthinos" value="${v('ypeuthinos')}"></div>

    <div class="form-group" id="vytio-row" style="display:none">
      <label>Βυτιοφόρο Όχημα</label>
      <input class="form-control" id="if-vytio" value="${v('vytio')}" placeholder="ΑΑΑ-1234" maxlength="10" style="max-width:140px"></div>

    <div class="form-group"><label>Τελευταία Αυτοψία</label>
      <input class="form-control" type="date" id="if-autopsia" value="${v('autopsia')}" style="max-width:175px"></div>

    <div class="form-group"><label>Λήξη Άδειας</label>
      <input class="form-control" type="date" id="if-adeia-lixis" value="${v('adeia_lixis')}" style="max-width:175px"></div>

    <div class="form-group ff"><label>Σημειώσεις</label>
      <textarea class="form-control" id="if-notes" rows="3">${v('notes')}</textarea></div>

    <!-- Τακτοποίηση -->
    <div class="form-group ff" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);padding:10px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;color:#15803d">
        <input type="checkbox" id="if-taktopoi" onchange="toggleTaktopoi(this)" ${chk('taktopoi')}>🗂️ Τακτοποίηση</label>
      <div id="if-taktopoi-wrap" style="${i.taktopoi?'':'display:none'};margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
        <div><label style="font-size:12px">Αριθμός</label>
          <input class="form-control" id="if-taktopoi-num" value="${v('taktopoi_num')}" style="max-width:200px;margin-top:4px"></div>
        <div style="flex:1;min-width:180px"><label style="font-size:12px">Νόμος</label>
          <input class="form-control" id="if-taktopoi-nomos" value="${v('taktopoi_nomos')}" style="margin-top:4px"></div>
      </div>
    </div>

    <!-- Σφράγιση -->
    <div class="form-group ff" id="sfragisi-row" style="background:#fff5f5;border:1px solid #fecaca;border-radius:var(--radius);padding:10px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#dc2626;margin-bottom:0">
        <input type="checkbox" id="if-sfragisi" ${chk('sfragisi')}
          onchange="(function(cb){const w=document.getElementById('if-sfragisi-wrap');if(w)w.style.display=cb.checked?'flex':'none';})(this)">
        🔒 Σφράγιση</label>
      <div id="if-sfragisi-wrap" style="display:${i.sfragisi?'flex':'none'};gap:10px;flex-wrap:nowrap;align-items:center;margin-top:8px">
        <div style="flex:none"><label style="font-size:11px">Ημ. Σφράγισης</label>
          <input class="form-control" type="date" id="if-sfragisi-ap" value="${v('sfragisi_ap')}" style="width:155px;margin-top:3px"></div>
        <div style="flex:none;min-width:200px"><label style="font-size:11px">Αρ. Απόφασης</label>
          <input class="form-control" id="if-sfragisi-ref" value="${v('sfragisi_ref')}" placeholder="Αρ. Πρωτ." style="width:200px;margin-top:3px"></div>
      </div>
    </div>

    <!-- Ανάκληση ΑΛ -->
    <div class="form-group ff" id="anaklisi-row" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:var(--radius);padding:10px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#7c3aed;margin-bottom:0">
        <input type="checkbox" id="if-anaklisi" ${chk('anaklisi')}
          onchange="(function(cb){const w=document.getElementById('if-anaklisi-wrap');if(w)w.style.display=cb.checked?'flex':'none';})(this)">
        🚫 Ανάκληση ΑΛ</label>
      <div id="if-anaklisi-wrap" style="display:${i.anaklisi?'flex':'none'};gap:10px;flex-wrap:nowrap;align-items:center;margin-top:8px">
        <div style="flex:none"><label style="font-size:11px">Ημ. Ανάκλησης</label>
          <input class="form-control" type="date" id="if-anaklisi-ap" value="${v('anaklisi_ap')}" style="width:155px;margin-top:3px"></div>
        <div style="flex:none;min-width:200px"><label style="font-size:11px">Αρ. Απόφασης</label>
          <input class="form-control" id="if-anaklisi-ref" value="${v('anaklisi_ref')}" placeholder="Αρ. Πρωτ." style="width:200px;margin-top:3px"></div>
      </div>
    </div>

  </div>`;
}

function folderSaveStoixeia(){
  // Χρησιμοποιούμε την υπάρχουσα saveInst() αλλά με _folderFak ως editInstId
  const prevEdit = editInstId;
  editInstId = _folderFak;
  const ok = saveInstSilent(); // επιστρέφει true/false χωρίς να κλείνει modal
  editInstId = prevEdit;
  if(ok){ folderClearDirty('stoixeia'); toast('✓ Στοιχεία αποθηκεύτηκαν','success'); }
}

// ══ TAB: ΠΙΣΤΟΠΟΙΗΤΙΚΑ ═════════════════════════════════════
function folderLoadPistopoiitika(){
  const panel = document.getElementById('folder-panel-pistopoiitika');
  if(!panel || !_folderFak) return;
  // Re-use renderCerts filtered by fak — render inline
  const fakCerts = certificates.filter(c=>c.fak===_folderFak);
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:13px;font-weight:600">${fakCerts.length} πιστοποιητικά</span>
      <button class="btn btn-primary btn-sm" onclick="folderAddCert()">+ Νέο</button>
    </div>
    <div id="folder-cert-list"></div>`;
  folderRenderCertList();
}

function folderRenderCertList(){
  const cont = document.getElementById('folder-cert-list');
  if(!cont) return;
  const fakCerts = certificates.filter(c=>c.fak===_folderFak)
    .sort((a,b)=>(a.type||'').localeCompare(b.type||''));
  if(!fakCerts.length){
    cont.innerHTML='<div style="padding:20px;text-align:center;color:var(--text3)">Δεν υπάρχουν πιστοποιητικά</div>';
    return;
  }
  const today=new Date(); today.setHours(0,0,0,0);
  cont.innerHTML=`<table class="tbl" style="font-size:12px"><thead><tr>
    <th>Τύπος</th><th>Αρ.</th><th>Έκδοση</th><th>Λήξη</th><th>Κατάσταση</th><th></th>
  </tr></thead><tbody>`+fakCerts.map(c=>{
    const exp=c.expiry?new Date(c.expiry):null;
    const expired=exp&&exp<today;
    const soonDays=exp&&!expired?Math.round((exp-today)/86400000):-1;
    const soon=soonDays>=0&&soonDays<=30;
    const badge=expired?'<span class="badge badge-red">Ληγμένο</span>'
      :soon?`<span class="badge badge-orange">${soonDays}μ.</span>`
      :exp?'<span class="badge badge-green">OK</span>':'';
    const rowStyle=expired?'background:#fff5f5':'';
    return `<tr style="${rowStyle}">
      <td style="font-weight:600">${esc(c.type||'')}</td>
      <td class="mono muted">${esc(c.num||'—')}</td>
      <td class="mono">${c.issue_date?fmtDate(c.issue_date):'—'}</td>
      <td class="mono">${c.expiry?fmtDate(c.expiry):'—'}</td>
      <td>${badge}</td>
      <td style="white-space:nowrap">
        <button class="btn-icon" onclick="folderEditCert('${c._id}')" title="Επεξεργασία">✏️</button>
        <button class="btn-icon" onclick="folderDeleteCert('${c._id}')" title="Διαγραφή" style="color:#dc2626">🗑</button>
      </td>
    </tr>`;
  }).join('')+'</tbody></table>';
}

function folderAddCert(){
  // Ανοίγει το υπάρχον cert modal με prefill ΦΑΚ
  openCertModal(null, _folderFak);
}
function folderEditCert(id){
  const c = certificates.find(x=>x._id===id);
  if(c) openCertModal(c);
}
function folderDeleteCert(id){
  if(!confirm('Διαγραφή πιστοποιητικού;')) return;
  certificates = certificates.filter(c=>c._id!==id);
  save('certs',certificates);
  folderRenderCertList();
  toast('🗑 Διαγράφηκε','info');
}

// ══ TAB: ΕΞΟΠΛΙΣΜΟΣ ════════════════════════════════════════
function folderLoadExoplismos(){
  const panel = document.getElementById('folder-panel-exoplismos');
  if(!panel || !_folderFak) return;

  // Καλούμε το openEquipModal κανονικά — φορτώνει τα δεδομένα στα IDs
  openEquipModal(_folderFak);

  // Μετά τη φόρτωση, παίρνουμε το modal body και το μεταφέρουμε στο panel
  setTimeout(()=>{
    const modalEl = document.getElementById('modal-equip');
    const bodyEl  = modalEl ? modalEl.querySelector('.modal-body') : null;
    if(!bodyEl){ panel.innerHTML='<div style="padding:20px;color:var(--text3)">Σφάλμα φόρτωσης</div>'; return; }

    // Κλείνουμε το overlay (κρύβουμε μόνο το overlay wrapper, όχι το content)
    if(modalEl) modalEl.style.display = 'none';
    document.body.style.overflow = ''; // restore scroll

    // Μεταφέρουμε το bodyEl DOM node απευθείας στο panel (όχι clone — για να δουλεύουν τα IDs)
    panel.innerHTML = '';
    panel.appendChild(bodyEl);

    // Κουμπί αποθήκευσης
    const saveDiv = document.createElement('div');
    saveDiv.style.cssText = 'padding:12px 0;display:flex;justify-content:flex-end';
    saveDiv.innerHTML = '<button class="btn btn-primary" onclick="folderSaveExoplismos()">💾 Αποθήκευση Εξοπλισμού</button>';
    panel.appendChild(saveDiv);

    // Dirty tracking
    panel.querySelectorAll('input,select,textarea').forEach(el=>{
      el.addEventListener('change', ()=>folderMarkDirty('exoplismos'));
      el.addEventListener('input',  ()=>folderMarkDirty('exoplismos'));
    });
  }, 300);
}

function folderSaveExoplismos(){
  // Πριν το save, επαναφέρουμε το modal body στο modal (χρειάζεται για το saveEquip)
  const modalEl = document.getElementById('modal-equip');
  const panel   = document.getElementById('folder-panel-exoplismos');
  const bodyEl  = panel ? panel.querySelector('.modal-body') : null;
  if(modalEl && bodyEl){
    const footer = modalEl.querySelector('.modal-footer');
    if(footer) modalEl.insertBefore(bodyEl, footer);
    else modalEl.appendChild(bodyEl);
  }
  saveEquip(); // αποθηκεύει και κλείνει το modal (display:none — δεν φαίνεται)
  folderClearDirty('exoplismos');
  toast('✓ Εξοπλισμός αποθηκεύτηκε','success');
  // Ξαναφόρτωσε το panel
  setTimeout(()=>folderLoadExoplismos(), 100);
}

// ══ TAB: ΣΤΑΤΙΣΤΙΚΑ ════════════════════════════════════════
function folderLoadStatistika(){
  const panel = document.getElementById('folder-panel-statistika');
  if(!panel || !_folderFak) return;
  // Φόρτωση inst-stats φιλτραρισμένα για τον ΦΑΚ
  const eq = equipment.find(e=>e.fak===_folderFak)||{};
  const inst = installations.find(i=>i.fak===_folderFak)||{};
  panel.innerHTML = buildFolderStatistika(inst, eq);
}

function buildFolderStatistika(inst, eq){
  const tanks = eq.tanks||[];
  const activeTanks = tanks.filter(t=>!t.abolished);
  const totalL = activeTanks.reduce((s,t)=>s+Number(t.liters||0),0);
  const certs = certificates.filter(c=>c.fak===inst.fak);
  const today = new Date(); today.setHours(0,0,0,0);
  const expiredCerts = certs.filter(c=>c.expiry&&new Date(c.expiry)<today);
  const protoCount = protocol.filter(p=>p.fak===inst.fak).length;
  const cardStyle='background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px;min-height:70px';
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;padding:4px">
    <div style="${cardStyle}">
      <div style="font-size:22px">📄</div>
      <div><div style="font-size:22px;font-weight:700;color:var(--accent)">${certs.length}</div>
        <div style="font-size:11px;color:var(--text3)">Πιστοποιητικά</div></div></div>
    <div style="${cardStyle}${expiredCerts.length?';background:#fff5f5':''}">
      <div style="font-size:22px">⚠️</div>
      <div><div style="font-size:22px;font-weight:700;color:${expiredCerts.length?'#dc2626':'var(--text)'}">${expiredCerts.length}</div>
        <div style="font-size:11px;color:var(--text3)">Ληγμένα</div></div></div>
    <div style="${cardStyle}">
      <div style="font-size:22px">🛢️</div>
      <div><div style="font-size:22px;font-weight:700;color:#0891b2">${activeTanks.length}</div>
        <div style="font-size:11px;color:var(--text3)">Ενεργές Δεξαμενές</div></div></div>
    <div style="${cardStyle}">
      <div style="font-size:22px">📊</div>
      <div><div style="font-size:18px;font-weight:700;color:#7c3aed">${totalL?totalL.toLocaleString('el-GR')+'L':'—'}</div>
        <div style="font-size:11px;color:var(--text3)">Χωρητικότητα</div></div></div>
    <div style="${cardStyle}">
      <div style="font-size:22px">📋</div>
      <div><div style="font-size:22px;font-weight:700;color:#d97706">${protoCount}</div>
        <div style="font-size:11px;color:var(--text3)">Κινήσεις Πρωτ.</div></div></div>
  </div>
  <div style="margin-top:16px;padding:4px">
    <button class="btn btn-secondary btn-sm" onclick="printInstReport('${esc(inst.fak||'')}')">🖨️ Εκτύπωση Report</button>
  </div>`;
}

// ══ TAB: ΙΣΤΟΡΙΚΟ ══════════════════════════════════════════
function folderLoadIstoriko(){
  const panel = document.getElementById('folder-panel-istoriko');
  if(!panel || !_folderFak) return;
  // Φιλτράρισμα πρωτοκόλλου για τον ΦΑΚ (από όλους τους χρήστες)
  const history = protocol.filter(p=>p.fak===_folderFak)
    .sort((a,b)=>(b.hm_xreosis||'').localeCompare(a.hm_xreosis||''));
  if(!history.length){
    panel.innerHTML='<div style="padding:20px;text-align:center;color:var(--text3)">Δεν υπάρχουν κινήσεις πρωτοκόλλου για αυτή την εγκατάσταση</div>';
    return;
  }
  panel.innerHTML=`<div style="overflow-x:auto">
    <table class="tbl" style="font-size:12px">
      <thead><tr>
        <th>Ημ. Χρέωσης</th><th>Αρ. Πρωτ. Εισ.</th><th>Αιτών</th>
        <th>Αίτημα</th><th>Τελ.Εξ.Ενέργεια</th><th>Κατάσταση</th><th>Χρήστης</th>
      </tr></thead>
      <tbody>${history.map(p=>{
        const phase=p.rejected?'<span class="badge badge-red" style="font-size:10px">❌</span>'
          :p.teliko?'<span class="badge badge-green" style="font-size:10px">✓</span>'
          :p.hm_exerx?'<span class="badge badge-yellow" style="font-size:10px">→</span>'
          :'<span class="badge badge-blue" style="font-size:10px">⏳</span>';
        const rawUser = p.user || p._user || '';
        const user = rawUser ? rawUser.split('@')[0] : '—';
        return `<tr style="cursor:pointer" onclick="openProtoModal('${esc(p._id||'')}')">
          <td class="mono">${fmtDate(p.hm_xreosis)}</td>
          <td class="mono muted">${esc(p.proto_eisx||'')}</td>
          <td>${esc(p.aition||'')}</td>
          <td style="color:var(--text2)">${esc(p.aitima||'')}</td>
          <td style="color:var(--text2)">${esc(p.energeia||'—')}</td>
          <td>${phase}</td>
          <td style="font-size:11px;color:var(--text3)">${esc(user)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

// ── Εμφάνιση/απόκρυψη per-tab save buttons ──────────────────
function folderUpdateTabSaveBtns(tab){
  const btns = {
    'stoixeia':'folder-save-stoixeia',
    'pistopoiitika':'folder-save-pistopoiitika',
    'exoplismos':'folder-save-exoplismos'
  };
  Object.entries(btns).forEach(([t,id])=>{
    const el=document.getElementById(id);
    if(el) el.style.display = t===tab ? '' : 'none';
  });
}
function folderSaveAll(){
  const dirty = Object.entries(_folderDirty).filter(([,v])=>v).map(([k])=>k);
  if(!dirty.length){ toast('Δεν υπάρχουν αλλαγές για αποθήκευση','info'); return; }
  dirty.forEach(tab=>{
    if(tab==='stoixeia') folderSaveStoixeia();
  });
  toast('✓ Αποθηκεύτηκαν όλες οι αλλαγές','success');
}

// ══ Helpers ════════════════════════════════════════════════
// Καλείται από openInstModal όταν ανοίγει φάκελος — χρησιμοποιεί folder ΦΑΚ
function navToFolderTab(tab){
  if(_folderFak) folderSwitchTab(tab);
}

// Ανοίγει φάκελο και πηγαίνει στο σωστό tab από dashboard/cross-nav
function navToFolder(fak, tab='stoixeia'){
  showView('inst');
  setTimeout(()=>openFolder(fak, tab), 50);
}
