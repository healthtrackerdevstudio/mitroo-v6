// ══════════════════════════════════════════════════════════
//  inst-folder.js  —  Φάκελος Εγκατάστασης v2
//  Αρχιτεκτονική: το folder modal είναι ο container.
//  Tabs Εξοπλισμός/Πιστοποιητικά ανοίγουν τα υπάρχοντα
//  modals (modal-equip, modal-cert) πάνω από το folder.
//  Μόνο τα tabs Στοιχεία, Στατιστικά, Ιστορικό έχουν
//  inline περιεχόμενο.
// ══════════════════════════════════════════════════════════

let _folderFak   = null;
let _folderTab   = 'stoixeia';
let _folderDirty = {};

const FOLDER_TABS = ['stoixeia','pistopoiitika','exoplismos','statistika','istoriko'];

// ─────────────────────────────────────────────────────────
//  ΑΝΟΙΓΜΑ / ΚΛΕΙΣΙΜΟ ΦΑΚΕΛΟΥ
// ─────────────────────────────────────────────────────────
function openFolder(fak, tab='stoixeia'){
  _folderFak   = fak;
  _folderDirty = {};
  const inst = installations.find(i=>i.fak===fak)||{};
  document.getElementById('folder-title').innerHTML =
    `🗂️ <strong>${esc(fak)}</strong> — ${esc(inst.name||'')}`;
  document.getElementById('modal-folder').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  folderSwitchTab(tab);
  folderApplyModalBg();
}

function closeFolder(){
  const hasDirty = Object.values(_folderDirty).some(Boolean);
  if(hasDirty && !confirm('Έχουν γίνει αλλαγές που δεν έχουν αποθηκευτεί.\nΚλείσιμο χωρίς αποθήκευση;')) return;
  _folderFak   = null;
  _folderDirty = {};
  const m = document.querySelector('#modal-folder .modal');
  if(m){ m.style.background=''; m.style.borderTop=''; }
  document.getElementById('modal-folder').style.display = 'none';
  document.body.style.overflow = '';
}

// ─────────────────────────────────────────────────────────
//  TAB NAVIGATION
// ─────────────────────────────────────────────────────────
function folderSwitchTab(tab){
  _folderTab = tab;
  FOLDER_TABS.forEach(t=>{
    const btn = document.getElementById('folder-tab-'+t);
    if(btn) btn.classList.toggle('active', t===tab);
    const panel = document.getElementById('folder-panel-'+t);
    if(panel) panel.style.display = t===tab ? '' : 'none';
  });
  // Per-tab save buttons
  ['stoixeia','pistopoiitika','exoplismos'].forEach(t=>{
    const b = document.getElementById('folder-save-'+t);
    if(b) b.style.display = t===tab ? '' : 'none';
  });
  if(tab==='stoixeia')        folderLoadStoixeia();
  else if(tab==='statistika') folderLoadStatistika();
  else if(tab==='istoriko')   folderLoadIstoriko();
  // Πιστοποιητικά/Εξοπλισμός: τα panels δείχνουν shortcut buttons
  else if(tab==='pistopoiitika') folderLoadPistopoiitikaPanel();
  else if(tab==='exoplismos')    folderLoadExoplismosPanel();
}

// ─────────────────────────────────────────────────────────
//  DIRTY TRACKING
// ─────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────
//  TAB: ΣΤΟΙΧΕΙΑ (inline form)
// ─────────────────────────────────────────────────────────
function folderLoadStoixeia(){
  const panel = document.getElementById('folder-panel-stoixeia');
  if(!panel || !_folderFak) return;
  const i = installations.find(x=>x.fak===_folderFak)||{};
  const v = (f,def='') => esc(i[f]||def);
  const chk = f => i[f] ? 'checked' : '';
  const topoList = [...new Set(installations.map(x=>x.topothesia).filter(Boolean))].sort();

  panel.innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px 16px;padding:4px">

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

    <div class="form-group ff" style="grid-column:1/-1"><label>Επωνυμία <span class="req">*</span></label>
      <input class="form-control" id="if-name" value="${v('name')}"></div>

    <div class="form-group"><label>ΑΦΜ</label>
      <input class="form-control" id="if-afm" value="${v('afm')}"></div>

    <div class="form-group"><label>Περιοχή</label>
      <input class="form-control" id="if-topothesia" value="${v('topothesia')}" list="folder-topo-list" autocomplete="off">
      <datalist id="folder-topo-list">${topoList.map(t=>`<option value="${esc(t)}">`).join('')}</datalist></div>

    <div class="form-group ff" style="grid-column:1/-1"><label>Διεύθυνση <span class="req">*</span></label>
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

    <div class="form-group ff" style="grid-column:1/-1"><label>Σημειώσεις</label>
      <textarea class="form-control" id="if-notes" rows="3">${v('notes')}</textarea></div>

    <!-- Τακτοποίηση -->
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius);padding:8px 12px;grid-column:1/-1;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#15803d;white-space:nowrap;flex-shrink:0;min-width:130px">
        <input type="checkbox" id="if-taktopoi" ${chk('taktopoi')}
          onchange="(function(cb){const w=document.getElementById('if-taktopoi-wrap');if(w)w.style.display=cb.checked?'flex':'none';})(this)">
        🗂️ Τακτοποίηση</label>
      <div id="if-taktopoi-wrap" style="display:${i.taktopoi?'flex':'none'};gap:10px;flex:1;align-items:flex-end;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:2px">
          <label style="font-size:11px;color:var(--text3)">Αριθμός</label>
          <input class="form-control" id="if-taktopoi-num" value="${v('taktopoi_num')}" placeholder="πχ. 12345/2026" style="width:170px"></div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:180px">
          <label style="font-size:11px;color:var(--text3)">Νόμος</label>
          <input class="form-control" id="if-taktopoi-nomos" value="${v('taktopoi_nomos')}" placeholder="πχ. Ν.4495/2017"></div>
      </div>
    </div>

    <!-- Σφράγιση -->
    <div id="sfragisi-row" style="background:#fff5f5;border:1px solid #fecaca;border-radius:var(--radius);padding:8px 12px;grid-column:1/-1;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#dc2626;white-space:nowrap;flex-shrink:0;min-width:130px">
        <input type="checkbox" id="if-sfragisi" ${chk('sfragisi')}
          onchange="(function(cb){const w=document.getElementById('if-sfragisi-wrap');if(w)w.style.display=cb.checked?'flex':'none';folderApplyModalBg();})(this)">
        🔒 Σφράγιση</label>
      <div id="if-sfragisi-wrap" style="display:${i.sfragisi?'flex':'none'};gap:10px;flex:1;align-items:flex-end;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:2px">
          <label style="font-size:11px;color:var(--text3)">Ημ. Σφράγισης</label>
          <input class="form-control" type="date" id="if-sfragisi-ap" value="${v('sfragisi_ap')}" style="width:160px"></div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:180px">
          <label style="font-size:11px;color:var(--text3)">Αρ. Απόφασης</label>
          <input class="form-control" id="if-sfragisi-ref" value="${v('sfragisi_ref')}" placeholder="Αρ. Πρωτ."></div>
      </div>
    </div>

    <!-- Ανάκληση ΑΛ -->
    <div id="anaklisi-row" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:var(--radius);padding:8px 12px;grid-column:1/-1;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:600;color:#7c3aed;white-space:nowrap;flex-shrink:0;min-width:130px">
        <input type="checkbox" id="if-anaklisi" ${chk('anaklisi')}
          onchange="(function(cb){const w=document.getElementById('if-anaklisi-wrap');if(w)w.style.display=cb.checked?'flex':'none';folderApplyModalBg();})(this)">
        🚫 Ανάκληση ΑΛ</label>
      <div id="if-anaklisi-wrap" style="display:${i.anaklisi?'flex':'none'};gap:10px;flex:1;align-items:flex-end;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:2px">
          <label style="font-size:11px;color:var(--text3)">Ημ. Ανάκλησης</label>
          <input class="form-control" type="date" id="if-anaklisi-ap" value="${v('anaklisi_ap')}" style="width:160px"></div>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:180px">
          <label style="font-size:11px;color:var(--text3)">Αρ. Απόφασης</label>
          <input class="form-control" id="if-anaklisi-ref" value="${v('anaklisi_ref')}" placeholder="Αρ. Πρωτ."></div>
      </div>
    </div>

  </div>`;

  // Dirty tracking — μόνο μετά από user interaction
  setTimeout(()=>{
    panel.querySelectorAll('input,select,textarea').forEach(el=>{
      el.addEventListener('change', ()=>folderMarkDirty('stoixeia'));
      el.addEventListener('input',  ()=>folderMarkDirty('stoixeia'));
    });
    if(typeof onInstTypeChange==='function') onInstTypeChange();
    folderApplyModalBg();
  }, 80);
}

function folderSaveStoixeia(){
  if(!_folderFak) return;
  const g  = id=>{ const el=document.getElementById(id); return el?el.value.trim():''; };
  const gc = id=>{ const el=document.getElementById(id); return !!(el&&el.checked); };
  const name = g('if-name');
  if(!name){ toast('⚠️ Η Επωνυμία είναι υποχρεωτική','error'); return; }
  const address = g('if-address');
  if(!address){ toast('⚠️ Η Διεύθυνση είναι υποχρεωτική','error'); return; }
  const idx = installations.findIndex(i=>i.fak===_folderFak);
  if(idx<0){ toast('Δεν βρέθηκε η εγκατάσταση','error'); return; }
  const typeRaw = g('if-type');
  const type = typeRaw==='__other__' ? g('if-other-type') : typeRaw;
  installations[idx] = {
    ...installations[idx],
    sheet:g('if-sheet'), type, adeia_num:g('if-adeia-num'),
    name, afm:g('if-afm'), topothesia:g('if-topothesia'), address,
    tel:g('if-tel'), email:g('if-email'), ypeuthinos:g('if-ypeuthinos'),
    vytio:g('if-vytio'), autopsia:g('if-autopsia'), adeia_lixis:g('if-adeia-lixis'),
    notes:g('if-notes'),
    taktopoi:gc('if-taktopoi'), taktopoi_num:g('if-taktopoi-num'), taktopoi_nomos:g('if-taktopoi-nomos'),
    sfragisi:gc('if-sfragisi'), sfragisi_ap:g('if-sfragisi-ap'), sfragisi_ref:g('if-sfragisi-ref'),
    anaklisi:gc('if-anaklisi'), anaklisi_ap:g('if-anaklisi-ap'), anaklisi_ref:g('if-anaklisi-ref'),
  };
  save('inst', installations);
  folderClearDirty('stoixeia');
  try{ updateBadges(); renderInst(); }catch(e){}
  toast('✓ Στοιχεία αποθηκεύτηκαν','success');
}

// ─────────────────────────────────────────────────────────
//  TAB: ΠΙΣΤΟΠΟΙΗΤΙΚΑ
//  Εμφανίζει τη λίστα inline + κουμπιά που ανοίγουν το
//  υπάρχον modal-cert (πάνω από το folder modal)
// ─────────────────────────────────────────────────────────
function folderLoadPistopoiitikaPanel(){
  const panel = document.getElementById('folder-panel-pistopoiitika');
  if(!panel || !_folderFak) return;
  folderRenderCertList(panel);
}

function folderRenderCertList(panel){
  if(!panel) panel = document.getElementById('folder-panel-pistopoiitika');
  if(!panel) return;
  const fakCerts = certificates.filter(c=>c.fak===_folderFak)
    .sort((a,b)=>(a.type||'').localeCompare(b.type||''));
  const today = new Date(); today.setHours(0,0,0,0);

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:13px;font-weight:600;color:var(--text)">${fakCerts.length} πιστοποιητικά για ΦΑΚ ${esc(_folderFak)}</span>
      <button class="btn btn-primary btn-sm" onclick="folderAddNewCert()">+ Νέο Πιστοποιητικό</button>
    </div>
    <div style="overflow-x:auto">
    <table class="tbl" style="font-size:12px"><thead><tr>
      <th>Τύπος</th><th>Αρ.</th><th>Έκδοση</th><th>Λήξη</th><th>Κατάσταση</th><th style="width:60px"></th>
    </tr></thead><tbody>
    ${fakCerts.length ? fakCerts.map(c=>{
      const exp = c.expiry ? new Date(c.expiry) : null;
      const expired = exp && exp < today;
      const soonDays = exp && !expired ? Math.round((exp-today)/86400000) : -1;
      const soon = soonDays>=0 && soonDays<=30;
      const badge = expired ? '<span class="badge badge-red">Ληγμένο</span>'
        : soon ? `<span class="badge badge-orange">${soonDays}μ.</span>`
        : exp ? '<span class="badge badge-green">OK</span>' : '';
      return `<tr style="${expired?'background:#fff5f5':''}">
        <td style="font-weight:600">${esc(c.type||'')}</td>
        <td class="mono muted">${esc(c.num||'—')}</td>
        <td class="mono">${c.issue_date?fmtDate(c.issue_date):'—'}</td>
        <td class="mono">${c.expiry?fmtDate(c.expiry):'—'}</td>
        <td>${badge}</td>
        <td style="white-space:nowrap">
          <button class="btn-icon" onclick="folderEditCert('${esc(c._id||'')}')" title="Επεξεργασία">✏️</button>
          <button class="btn-icon" onclick="folderDeleteCert('${esc(c._id||'')}')" title="Διαγραφή" style="color:#dc2626">🗑</button>
        </td>
      </tr>`;
    }).join('') : '<tr><td colspan="6" class="table-empty">Δεν υπάρχουν πιστοποιητικά</td></tr>'}
    </tbody></table></div>`;
}

function folderAddNewCert(){
  // Ανοίγει το υπάρχον cert modal με προεπιλεγμένο ΦΑΚ
  openCertModal(null, _folderFak);
  // Μετά το κλείσιμο του cert modal, ανανέωση λίστας
  _folderPendingCertRefresh = true;
}

function folderEditCert(id){
  const c = certificates.find(x=>x._id===id);
  if(!c){ toast('Δεν βρέθηκε το πιστοποιητικό','error'); return; }
  openCertModal(c, null);
  _folderPendingCertRefresh = true;
}

function folderDeleteCert(id){
  if(!confirm('Διαγραφή πιστοποιητικού;')) return;
  certificates = certificates.filter(c=>c._id!==id);
  save('certs', certificates);
  folderRenderCertList();
  toast('🗑 Διαγράφηκε','info');
  try{ updateBadges(); renderCerts(); }catch(e){}
}

// Flag για ανανέωση λίστας μετά από cert modal
let _folderPendingCertRefresh = false;
// Καλείται από closeModal όταν κλείνει το modal-cert
function folderOnCertModalClose(){
  if(_folderPendingCertRefresh && _folderFak){
    _folderPendingCertRefresh = false;
    folderRenderCertList();
    try{ updateBadges(); renderCerts(); }catch(e){}
  }
}

// ─────────────────────────────────────────────────────────
//  TAB: ΕΞΟΠΛΙΣΜΟΣ
//  Εμφανίζει σύνοψη + κουμπί που ανοίγει το modal-equip
// ─────────────────────────────────────────────────────────
function folderLoadExoplismosPanel(){
  const panel = document.getElementById('folder-panel-exoplismos');
  if(!panel || !_folderFak) return;
  const eq = equipment.find(e=>e.fak===_folderFak)||{};
  const tanks = eq.tanks||[];
  const activeTanks = tanks.filter(t=>!t.abolished);
  const abolishedTanks = tanks.filter(t=>t.abolished);
  const totalL = activeTanks.reduce((s,t)=>s+Number(t.liters||0),0);
  const hasPumps = (eq.pumps||[]).length > 0;
  const hasPlynteria = (eq.plynteria||[]).length > 0 || eq.plyntirio;
  const hasLipaderia = (eq.lipaderia||[]).length > 0 || eq.lipantirio;

  const extras = [];
  if(eq.stage2) extras.push('Stage II'+(eq.stage2_dx?' →ΔΞ'+eq.stage2_dx:''));
  if(eq.artho25) extras.push('Αρ.25');
  if(eq.artho27) extras.push('Αρ.27');
  if(eq.steg_freatia) extras.push('Στεγ.Φρεάτια');
  if(eq.auto_politis) extras.push('Αυτ.Πωλητής');
  if(eq.offset_filling) extras.push('Offset');
  if(eq.lakkos) extras.push('Λάκκος');
  if(eq.eisroes) extras.push('Εισρ.-Εκρ.');
  if(eq.pezodromiko) extras.push('Πεζοδρομιακό');

  panel.innerHTML = `
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:13px;font-weight:600">Εξοπλισμός ΦΑΚ ${esc(_folderFak)}</span>
      <button class="btn btn-primary btn-sm" onclick="folderOpenEquipModal()">✏️ Επεξεργασία Εξοπλισμού</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600">🛢️ ΔΕΞΑΜΕΝΕΣ</div>
        ${activeTanks.length ? activeTanks.map(t=>`
          <div style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="font-weight:600">${esc(t.fuel||'—')}</span>
            <span style="color:var(--text3);font-size:11px"> · ${Number(t.liters||0).toLocaleString('el-GR')}L</span>
            ${t.mitroo?`<div style="font-size:10px;color:var(--text3);font-family:monospace">${esc(t.mitroo)}</div>`:''}
          </div>`).join('') : '<div style="font-size:12px;color:var(--text3)">Καμία</div>'}
        ${abolishedTanks.length ? `<div style="font-size:11px;color:#dc2626;margin-top:4px">❌ ${abolishedTanks.length} κατηργημένες</div>` : ''}
        <div style="font-size:12px;font-weight:700;margin-top:6px;color:var(--accent)">${totalL?totalL.toLocaleString('el-GR')+' L σύνολο':''}</div>
      </div>
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600">⛽ ΑΝΤΛΙΕΣ &amp; ΕΞΟΠΛΙΣΜΟΣ</div>
        <div style="font-size:12px">${hasPumps?'✓ Αντλίες καυσίμων':'—'}</div>
        <div style="font-size:12px">${hasPlynteria?'✓ Πλυντήριο':'—'}</div>
        <div style="font-size:12px">${hasLipaderia?'✓ Λιπαντήριο':'—'}</div>
        ${eq.fortistes?`<div style="font-size:12px">✓ Φορτιστές: ${esc(eq.fortistes)}</div>`:''}
      </div>
      ${extras.length ? `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px">
        <div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:600">🔧 ΕΠΙΠΛΕΟΝ</div>
        ${extras.map(e=>`<div style="font-size:12px">✓ ${esc(e)}</div>`).join('')}
      </div>` : ''}
    </div>`;
}

function folderOpenEquipModal(){
  openEquipModal(_folderFak);
  _folderPendingEquipRefresh = true;
}

let _folderPendingEquipRefresh = false;
function folderOnEquipModalClose(){
  if(_folderPendingEquipRefresh && _folderFak){
    _folderPendingEquipRefresh = false;
    folderLoadExoplismosPanel();
    try{ renderEquip(); }catch(e){}
  }
}

// ─────────────────────────────────────────────────────────
//  TAB: ΣΤΑΤΙΣΤΙΚΑ (inline)
// ─────────────────────────────────────────────────────────
function folderLoadStatistika(){
  const panel = document.getElementById('folder-panel-statistika');
  if(!panel || !_folderFak) return;
  const inst = installations.find(i=>i.fak===_folderFak)||{};
  const eq   = equipment.find(e=>e.fak===_folderFak)||{};
  const tanks = (eq.tanks||[]).filter(t=>!t.abolished);
  const totalL = tanks.reduce((s,t)=>s+Number(t.liters||0),0);
  const certs = certificates.filter(c=>c.fak===_folderFak);
  const today = new Date(); today.setHours(0,0,0,0);
  const expired = certs.filter(c=>c.expiry&&new Date(c.expiry)<today).length;
  const soon = certs.filter(c=>{
    if(!c.expiry) return false;
    const d=new Date(c.expiry), diff=Math.round((d-today)/86400000);
    return diff>=0&&diff<=30;
  }).length;
  const protoCount = protocol.filter(p=>p.fak===_folderFak).length;
  const protoOpen  = protocol.filter(p=>p.fak===_folderFak&&!p.teliko&&!p.rejected).length;

  const card = (icon,val,label,color='var(--accent)',bg='var(--surface)') =>
    `<div style="background:${bg};border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px">
      <div style="font-size:24px">${icon}</div>
      <div><div style="font-size:22px;font-weight:700;color:${color}">${val}</div>
        <div style="font-size:11px;color:var(--text3)">${label}</div></div>
    </div>`;

  panel.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:4px">
      ${card('📄', certs.length, 'Πιστοποιητικά')}
      ${card('⚠️', expired, 'Ληγμένα', expired?'#dc2626':'var(--text)', expired?'#fff5f5':'var(--surface)')}
      ${card('🔔', soon, 'Λήγουν σύντομα', soon?'#d97706':'var(--text)')}
      ${card('🛢️', tanks.length, 'Ενεργές Δεξαμενές', '#0891b2')}
      ${card('📊', totalL?totalL.toLocaleString('el-GR')+'L':'—', 'Χωρητικότητα', '#7c3aed')}
      ${card('📋', protoCount, 'Κινήσεις Πρωτ.', '#d97706')}
      ${card('⏳', protoOpen, 'Σε εξέλιξη', protoOpen?'#f97316':'var(--text)')}
    </div>
    <div style="margin-top:16px;padding:4px">
      <button class="btn btn-secondary btn-sm" onclick="printInstReport('${esc(_folderFak)}')">🖨️ Εκτύπωση Report</button>
    </div>`;
}

// ─────────────────────────────────────────────────────────
//  TAB: ΙΣΤΟΡΙΚΟ (inline — φιλτράρει πρωτόκολλο ανά ΦΑΚ)
// ─────────────────────────────────────────────────────────
function folderLoadIstoriko(){
  const panel = document.getElementById('folder-panel-istoriko');
  if(!panel || !_folderFak) return;

  const history = protocol.filter(p=>p.fak===_folderFak)
    .sort((a,b)=>(b.hm_xreosis||'').localeCompare(a.hm_xreosis||''));

  if(!history.length){
    panel.innerHTML='<div style="padding:30px;text-align:center;color:var(--text3)">Δεν υπάρχουν κινήσεις πρωτοκόλλου για αυτή την εγκατάσταση</div>';
    return;
  }

  panel.innerHTML=`
    <div style="font-size:12px;color:var(--text3);margin-bottom:8px">${history.length} κινήσεις</div>
    <div style="overflow-x:auto">
    <table class="tbl" style="font-size:12px"><thead><tr>
      <th>Ημ. Χρέωσης</th><th>Αρ. Πρωτ. Εισ.</th><th>Αιτών</th>
      <th>Αίτημα</th><th>Τελ.Εξ.Ενέργεια</th><th>Κατάσταση</th><th>Χρήστης</th>
    </tr></thead><tbody>
    ${history.map(p=>{
      const phase = p.rejected ? '<span class="badge badge-red" style="font-size:10px">❌</span>'
        : p.teliko ? '<span class="badge badge-green" style="font-size:10px">✓</span>'
        : p.hm_exerx ? '<span class="badge badge-yellow" style="font-size:10px">→</span>'
        : '<span class="badge badge-blue" style="font-size:10px">⏳</span>';
      const user = p.user ? p.user.split('@')[0] : '—';
      return `<tr style="cursor:pointer" onclick="openProtoModal('${esc(p._id||'')}')">
        <td class="mono">${fmtDate(p.hm_xreosis)}</td>
        <td class="mono muted">${esc(p.proto_eisx||'')}</td>
        <td>${esc(p.aition||'')}</td>
        <td style="color:var(--text2)">${esc(p.aitima||'')}</td>
        <td style="color:var(--text2)">${esc(p.energeia||'—')}</td>
        <td>${phase}</td>
        <td style="font-size:11px;color:var(--text3)">${esc(user)}</td>
      </tr>`;
    }).join('')}
    </tbody></table></div>`;
}

// ─────────────────────────────────────────────────────────
//  GLOBAL SAVE
// ─────────────────────────────────────────────────────────
function folderSaveAll(){
  const dirty = Object.entries(_folderDirty).filter(([,v])=>v).map(([k])=>k);
  if(!dirty.length){ toast('Δεν υπάρχουν αλλαγές','info'); return; }
  if(dirty.includes('stoixeia')) folderSaveStoixeia();
  toast('✓ Αποθηκεύτηκαν όλες οι αλλαγές','success');
}

// ─────────────────────────────────────────────────────────
//  ΦΟΝΤΟ MODAL (Σφράγιση / Ανάκληση)
// ─────────────────────────────────────────────────────────
function folderApplyModalBg(){
  const modal = document.querySelector('#modal-folder .modal');
  if(!modal) return;
  const sfr = document.getElementById('if-sfragisi');
  const ana = document.getElementById('if-anaklisi');
  if(sfr&&sfr.checked){
    modal.style.background = '#fff0f0';
    modal.style.borderTop  = '4px solid #dc2626';
  } else if(ana&&ana.checked){
    modal.style.background = '#faf5ff';
    modal.style.borderTop  = '4px solid #7c3aed';
  } else {
    modal.style.background = '';
    modal.style.borderTop  = '';
  }
}

// ─────────────────────────────────────────────────────────
//  HELPERS — καλούνται από άλλα modules
// ─────────────────────────────────────────────────────────
// Cross-navigation από dashboard/protocol/etc
function navToFolder(fak, tab='stoixeia'){
  showView('inst');
  setTimeout(()=>openFolder(fak, tab), 50);
}
