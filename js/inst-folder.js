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
  // Dirty tracking σε οποιοδήποτε input/select/textarea αλλάξει
  panel.querySelectorAll('input,select,textarea').forEach(el=>{
    el.addEventListener('change', ()=>folderMarkDirty('stoixeia'), {once:false});
    el.addEventListener('input',  ()=>folderMarkDirty('stoixeia'), {once:false});
  });
  // Εφαρμογή onInstTypeChange για να φανούν τα σωστά sections
  setTimeout(onInstTypeChange, 50);
}

function buildStoixeiaForm(i){
  const v = (f,def='') => esc(i[f]||def);
  const chk = (f) => i[f] ? 'checked' : '';
  return `<div class="form-grid" style="padding:4px">
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
    <div class="form-group" id="if-other-wrap" style="display:none">
      <label>Άλλος Τύπος</label>
      <input class="form-control" id="if-other-type" value="${!INST_TYPES.includes(i.type)?v('type'):''}"></div>
    <div class="form-group ff"><label>Επωνυμία <span class="req">*</span></label>
      <input class="form-control" id="if-name" value="${v('name')}"></div>
    <div class="form-group"><label>ΑΦΜ</label>
      <input class="form-control" id="if-afm" value="${v('afm')}"></div>
    <div class="form-group"><label>Περιοχή</label>
      <input class="form-control" id="if-topothesia" value="${v('topothesia')}"></div>
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
      <input class="form-control" id="if-vytio" value="${v('vytio')}" style="max-width:120px" maxlength="8"></div>
    <div class="form-group"><label>Τελευταία Αυτοψία</label>
      <input class="form-control" type="date" id="if-autopsia" value="${v('autopsia')}"></div>
    <div class="form-group"><label>Άδεια Λειτουργίας — Αρ.</label>
      <input class="form-control" id="if-adeia-num" value="${v('adeia_num')}"></div>
    <div class="form-group"><label>Λήξη Άδειας</label>
      <input class="form-control" type="date" id="if-adeia-lixis" value="${v('adeia_lixis')}"></div>
    <div class="form-group"><label>Σημειώσεις</label>
      <textarea class="form-control" id="if-notes" rows="2">${v('notes')}</textarea></div>
    <!-- Τακτοποίηση -->
    <div class="form-group ff" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);padding:10px">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;color:#15803d">
        <input type="checkbox" id="if-taktopoi" onchange="toggleTaktopoi(this)" ${chk('taktopoi')}>🗂️ Τακτοποίηση</label>
      <div id="if-taktopoi-wrap" style="display:${i.taktopoi?'':'none'};margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">
        <div><label style="font-size:12px">Αριθμός</label>
          <input class="form-control" id="if-taktopoi-num" value="${v('taktopoi_num')}" style="max-width:200px;margin-top:4px"></div>
        <div style="flex:1;min-width:180px"><label style="font-size:12px">Νόμος</label>
          <input class="form-control" id="if-taktopoi-nomos" value="${v('taktopoi_nomos')}" style="margin-top:4px"></div>
      </div>
    </div>
    <!-- Σφράγιση/Ανάκληση -->
    <div class="form-group" id="sfragisi-row">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="if-sfragisi" onchange="toggleSfragisiWrap(this)" ${chk('sfragisi')}> Σφράγιση</label>
      <div id="if-sfragisi-wrap" style="display:${i.sfragisi?'':'none'};margin-top:6px">
        <input class="form-control" type="date" id="if-sfragisi-ap" value="${v('sfragisi_ap')}" style="max-width:180px"></div>
    </div>
    <div class="form-group" id="anaklisi-row">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
        <input type="checkbox" id="if-anaklisi" onchange="toggleAnaklisiWrap(this)" ${chk('anaklisi')}> Ανάκληση ΑΛ</label>
      <div id="if-anaklisi-wrap" style="display:${i.anaklisi?'':'none'};margin-top:6px">
        <input class="form-control" type="date" id="if-anaklisi-ap" value="${v('anaklisi_ap')}" style="max-width:180px"></div>
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
  cont.innerHTML=fakCerts.map(c=>{
    const exp=c.expiry?new Date(c.expiry):null;
    const expired=exp&&exp<today;
    const soonDays=exp&&!expired?Math.round((exp-today)/86400000):-1;
    const soon=soonDays>=0&&soonDays<=30;
    const badge=expired?'<span class="badge badge-red">Ληγμένο</span>'
      :soon?`<span class="badge badge-orange">Λήγει σε ${soonDays}μ.</span>`:'';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);${expired?'background:#fff5f5':''}">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${esc(c.type||'')} ${badge}</div>
        <div style="font-size:11px;color:var(--text3)">
          ${c.num?'Αρ: '+esc(c.num)+' · ':''}
          ${c.issue_date?'Έκδ: '+fmtDate(c.issue_date)+' · ':''}
          ${c.expiry?'Λήξη: '+fmtDate(c.expiry):''}
        </div>
      </div>
      <button class="btn-icon" onclick="folderEditCert('${c._id}')" title="Επεξεργασία">✏️</button>
      <button class="btn-icon" onclick="folderDeleteCert('${c._id}')" title="Διαγραφή" style="color:#dc2626">🗑</button>
    </div>`;
  }).join('');
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
  panel.innerHTML = `<div id="folder-equip-inner" style="padding:4px"></div>
    <div style="margin-top:12px;display:flex;justify-content:flex-end">
      <button class="btn btn-primary" onclick="folderSaveExoplismos()">💾 Αποθήκευση Εξοπλισμού</button>
    </div>`;
  // Ανοίγουμε το equipment modal content inline
  openEquipModal(_folderFak, true); // true = inline mode
}
function folderSaveExoplismos(){
  saveEquip(true); // true = silent (no closeModal)
  folderClearDirty('exoplismos');
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
  return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:4px">
    <div class="stat-card"><div class="stat-icon blue">📄</div>
      <div><div class="stat-value">${certs.length}</div><div class="stat-label">Πιστοποιητικά</div></div></div>
    <div class="stat-card" style="${expiredCerts.length?'background:#fff5f5':''}">
      <div class="stat-icon red">⚠️</div>
      <div><div class="stat-value" style="color:${expiredCerts.length?'#dc2626':'inherit'}">${expiredCerts.length}</div>
        <div class="stat-label">Ληγμένα</div></div></div>
    <div class="stat-card"><div class="stat-icon green">🛢️</div>
      <div><div class="stat-value">${activeTanks.length}</div><div class="stat-label">Δεξαμενές</div></div></div>
    <div class="stat-card"><div class="stat-icon purple">📊</div>
      <div><div class="stat-value">${totalL?totalL.toLocaleString('el-GR')+'L':'—'}</div>
        <div class="stat-label">Χωρητικότητα</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">📋</div>
      <div><div class="stat-value">${protoCount}</div><div class="stat-label">Κινήσεις Πρωτ.</div></div></div>
  </div>
  <div style="margin-top:16px">
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
        const user=p.user||p._user||'—';
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

// ══ Global Save ════════════════════════════════════════════
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
