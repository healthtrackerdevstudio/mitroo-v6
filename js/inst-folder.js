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

const FOLDER_TABS = ['stoixeia','pistopoiitika','exoplismos','statistika','istoriko','streetview'];

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
  else if(tab==='streetview') folderLoadStreetView();
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
      <input class="form-control" id="if-vytio" value="${v('vytio')}" placeholder="ΑΑΑ-1234, ΒΒΒ-5678" maxlength="20" style="max-width:280px"></div>

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
    // Εμφάνιση κουμπιού εκτύπωσης στο footer
    const printBtn = document.getElementById('folder-print-stoixeia');
    if(printBtn) printBtn.style.display='';
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
//  TAB: ΠΙΣΤΟΠΟΙΗΤΙΚΑ — πλήρως inline, χωρίς εξωτερικό modal
// ─────────────────────────────────────────────────────────
let _certEditId = null; // null = νέο, string = επεξεργασία υπάρχοντος

function folderLoadPistopoiitikaPanel(){
  const panel = document.getElementById('folder-panel-pistopoiitika');
  if(!panel || !_folderFak) return;
  _certEditId = null;
  folderRenderCertTab(panel);
}

function folderRenderCertTab(panel){
  if(!panel) panel = document.getElementById('folder-panel-pistopoiitika');
  if(!panel) return;
  const fakCerts = certificates.filter(c=>c.fak===_folderFak)
    .sort((a,b)=>(a.type||'').localeCompare(b.type||''));
  const today = new Date(); today.setHours(0,0,0,0);

  // Λίστα πιστοποιητικών
  const listHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <span style="font-size:13px;font-weight:600">${fakCerts.length} πιστοποιητικά</span>
      <button class="btn btn-primary btn-sm" onclick="folderCertEdit(null)">+ Νέο</button>
    </div>
    <div style="overflow-x:auto;margin-bottom:16px">
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
        const isEditing = _certEditId === c._id;
        return `<tr style="${expired?'background:#fff5f5':''}${isEditing?';outline:2px solid var(--primary)':''}">
          <td style="font-weight:600">${esc(c.type||'')}</td>
          <td class="mono muted">${esc(c.num||'—')}</td>
          <td class="mono">${c.issue_date?fmtDate(c.issue_date):'—'}</td>
          <td class="mono">${c.expiry?fmtDate(c.expiry):'—'}</td>
          <td>${badge}</td>
          <td style="white-space:nowrap">
            <button class="btn-icon" onclick="folderCertEdit('${esc(c._id||'')}')" title="Επεξεργασία">✏️</button>
            <button class="btn-icon" onclick="folderCertDelete('${esc(c._id||'')}')" title="Διαγραφή" style="color:#dc2626">🗑</button>
          </td>
        </tr>`;
      }).join('') : '<tr><td colspan="6" class="table-empty">Δεν υπάρχουν πιστοποιητικά</td></tr>'}
      </tbody></table>
    </div>`;

  // Inline φόρμα επεξεργασίας
  const editC = _certEditId ? certificates.find(c=>c._id===_certEditId) : null;
  const isNew = !_certEditId;
  const typeOpts = buildCertTypeOptions(editC?editC.type:'');
  const formHtml = `
    <div style="background:${isNew?'#f0fdf4':'#fffbeb'};border:1px solid ${isNew?'#bbf7d0':'#fde68a'};border-radius:var(--radius);padding:14px">
      <div style="font-size:13px;font-weight:700;margin-bottom:12px;color:${isNew?'#15803d':'#92400e'}">
        ${isNew?'➕ Νέο Πιστοποιητικό':'✏️ Επεξεργασία: '+esc(editC?editC.type:'')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">
        <div class="form-group" style="margin:0">
          <label style="font-size:11px">Τύπος <span class="req">*</span></label>
          <select class="form-control" id="fc-type" onchange="folderCertTypeChange(this)" style="margin-top:3px">${typeOpts}</select>
          <input class="form-control" id="fc-type-custom" placeholder="Νέος τύπος…" style="display:none;margin-top:4px" value="">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px">Αρ. Πιστοποιητικού</label>
          <input class="form-control" id="fc-num" value="${esc(editC?editC.num||'':'')} " style="margin-top:3px">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px">Ημ. Έκδοσης</label>
          <input class="form-control" type="date" id="fc-issue" value="${editC?editC.issue_date||'':''}" style="margin-top:3px">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px">Ημ. Λήξης</label>
          <input class="form-control" type="date" id="fc-expiry" value="${editC?editC.expiry||'':''}" style="margin-top:3px">
        </div>
        <div class="form-group" style="margin:0">
          <label style="font-size:11px">Link εγγράφου</label>
          <input class="form-control" id="fc-link" value="${esc(editC?editC.doc_link||'':'')} " style="margin-top:3px">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-primary btn-sm" onclick="folderCertSave()">💾 Αποθήκευση</button>
        <button class="btn btn-secondary btn-sm" onclick="folderCertCancelEdit()">Άκυρο</button>
      </div>
    </div>`;

  panel.innerHTML = listHtml + formHtml;

  // Trim whitespace from prefilled values
  const numEl = document.getElementById('fc-num');
  if(numEl) numEl.value = numEl.value.trim();
  const linkEl = document.getElementById('fc-link');
  if(linkEl) linkEl.value = linkEl.value.trim();
}

function folderCertTypeChange(sel){
  const custom = document.getElementById('fc-type-custom');
  if(custom) custom.style.display = sel.value==='__other__' ? '' : 'none';
}

function folderCertEdit(id){
  _certEditId = id; // null = νέο
  folderRenderCertTab();
  // Scroll στη φόρμα
  setTimeout(()=>{
    const form = document.querySelector('#folder-panel-pistopoiitika [id^="fc-type"]');
    if(form) form.scrollIntoView({behavior:'smooth', block:'nearest'});
  }, 50);
}

function folderCertCancelEdit(){
  _certEditId = null;
  folderRenderCertTab();
}

function folderCertSave(){
  const typeSel = document.getElementById('fc-type');
  const typeCus = document.getElementById('fc-type-custom');
  const type = typeSel.value==='__other__' ? (typeCus?typeCus.value.trim():'') : typeSel.value;
  if(!type){ toast('Επίλεξε τύπο πιστοποιητικού','error'); return; }

  const obj = {
    fak:        _folderFak,
    type,
    num:        (document.getElementById('fc-num').value||'').trim(),
    issue_date: document.getElementById('fc-issue').value,
    expiry:     document.getElementById('fc-expiry').value,
    doc_link:   (document.getElementById('fc-link').value||'').trim(),
    notes:      ''
  };

  if(_certEditId){
    // Επεξεργασία
    const idx = certificates.findIndex(c=>c._id===_certEditId);
    if(idx>=0) certificates[idx] = {...certificates[idx], ...obj};
  } else {
    // Νέο — έλεγχος για διπλότυπο
    const isDup = certificates.some(c=>
      c.fak===_folderFak && c.type===type && c.num===obj.num && c.issue_date===obj.issue_date
    );
    if(isDup){ toast('⚠️ Υπάρχει ήδη αυτό το πιστοποιητικό','warning'); return; }
    obj._id = uid();
    certificates.push(obj);
  }

  save('certs', certificates);
  try{ updateBadges(); renderCerts(); }catch(e){}
  toast(_certEditId ? '✓ Πιστοποιητικό ενημερώθηκε' : '✓ Πιστοποιητικό προστέθηκε','success');
  _certEditId = null;
  folderRenderCertTab();
}

function folderCertDelete(id){
  if(!confirm('Διαγραφή πιστοποιητικού;')) return;
  certificates = certificates.filter(c=>c._id!==id);
  save('certs', certificates);
  try{ updateBadges(); renderCerts(); }catch(e){}
  if(_certEditId===id) _certEditId = null;
  folderRenderCertTab();
  toast('🗑 Διαγράφηκε','info');
}

// Δεν χρειάζεται πλέον εξωτερικό modal για certs
function folderAddNewCert(){ folderCertEdit(null); }
function folderEditCert(id){ folderCertEdit(id); }
function folderDeleteCert(id){ folderCertDelete(id); }
let _folderPendingCertRefresh = false;
function folderOnCertModalClose(){
  if(_folderPendingCertRefresh && _folderFak){
    _folderPendingCertRefresh = false;
    folderRenderCertTab();
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
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div style="font-size:12px;color:var(--text3)">${history.length} κινήσεις</div>
      <button class="btn btn-secondary btn-sm" onclick="folderPrintIstoriko()">🖨️ Εκτύπωση</button>
    </div>
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
//  ΕΚΤΥΠΩΣΗ ΙΣΤΟΡΙΚΟΥ
// ─────────────────────────────────────────────────────────
function folderPrintIstoriko(){
  const inst = installations.find(i=>i.fak===_folderFak)||{};
  const history = protocol.filter(p=>p.fak===_folderFak)
    .sort((a,b)=>(b.hm_xreosis||'').localeCompare(a.hm_xreosis||''));

  const win = window.open('','_blank','width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
  <title>Ιστορικό — ${esc(_folderFak)}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#111}
    h2{font-size:16px;margin-bottom:4px}
    .sub{font-size:12px;color:#555;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#f0f0f0;padding:6px 8px;text-align:left;border:1px solid #ccc;font-size:11px}
    td{padding:5px 8px;border:1px solid #ddd;font-size:11px}
    tr:nth-child(even){background:#fafafa}
    .badge-done{color:#16a34a;font-weight:700}
    .badge-pend{color:#d97706;font-weight:700}
    .badge-rej{color:#dc2626;font-weight:700}
    .badge-prog{color:#2563eb;font-weight:700}
    .footer{margin-top:20px;font-size:10px;color:#999;border-top:1px solid #ddd;padding-top:8px}
    @media print{body{padding:0}}
  </style></head><body>
  <h2>Ιστορικό Κινήσεων Πρωτοκόλλου</h2>
  <div class="sub">
    ΦΑΚ: <strong>${esc(_folderFak)}</strong> — ${esc(inst.name||'')}
    ${inst.address?'<br>'+esc(inst.address):''}
    <br>Εκτύπωση: ${new Date().toLocaleDateString('el-GR')}
  </div>
  <table>
    <thead><tr>
      <th>Ημ. Χρέωσης</th><th>Αρ. Πρωτ. Εισ.</th><th>Αιτών</th>
      <th>Αίτημα</th><th>Τελ.Εξ.Ενέργεια</th><th>Αρ. Πρωτ. Εξ.</th><th>Κατάσταση</th><th>Χρήστης</th>
    </tr></thead>
    <tbody>
    ${history.map(p=>{
      let status,cls;
      if(p.rejected){status='❌ Απορρίφθηκε';cls='badge-rej';}
      else if(p.teliko){status='✓ Ολοκλ.'+fmtDate(p.teliko);cls='badge-done';}
      else if(p.hm_exerx){status='→ Προς Υπογραφή';cls='badge-prog';}
      else{status='⏳ Σε Εξέλιξη';cls='badge-pend';}
      const user = p.user ? p.user.split('@')[0] : '—';
      return `<tr>
        <td>${fmtDate(p.hm_xreosis)}</td>
        <td>${esc(p.proto_eisx||'')}</td>
        <td>${esc(p.aition||'')}</td>
        <td>${esc(p.aitima||'')}</td>
        <td>${esc(p.energeia||'—')}</td>
        <td>${esc(p.proto_exerx||'')}</td>
        <td class="${cls}">${status}</td>
        <td>${esc(user)}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>
  <div class="footer">Σύνολο κινήσεων: ${history.length} · Μητρώο Εγκαταστάσεων</div>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
  win.document.close();
}

// ─────────────────────────────────────────────────────────
//  TAB: STREET VIEW
// ─────────────────────────────────────────────────────────
function folderLoadStreetView(){
  const panel = document.getElementById('folder-panel-streetview');
  if(!panel || !_folderFak) return;
  const inst = installations.find(i=>i.fak===_folderFak)||{};
  const coords = inst.coords||'';

  if(!coords){
    panel.innerHTML=`
      <div style="padding:40px;text-align:center;color:var(--text3)">
        <div style="font-size:32px;margin-bottom:12px">📍</div>
        <div style="font-size:14px;margin-bottom:8px">Δεν υπάρχουν συντεταγμένες για αυτή την εγκατάσταση</div>
        <div style="font-size:12px">Πρόσθεσε συντεταγμένες στο tab <strong>Στοιχεία</strong> ή τοποθέτησε pin στο <strong>Χάρτη</strong></div>
      </div>`;
    return;
  }

  // Parsing: "lat,lng" ή "lat, lng"
  const parts = coords.split(',').map(s=>s.trim());
  const lat = parts[0], lng = parts[1];

  if(!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))){
    panel.innerHTML=`<div style="padding:20px;color:#dc2626">⚠️ Μη έγκυρες συντεταγμένες: ${esc(coords)}</div>`;
    return;
  }

  // Google Street View Embed URL (δωρεάν χωρίς API key για embed)
  const svUrl = `https://www.google.com/maps?q=${lat},${lng}&layer=c&cbll=${lat},${lng}&cbp=12,0,,0,0&output=svembed`;
  // Εναλλακτικά: απευθείας άνοιγμα στο Google Maps Street View
  const gmUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  panel.innerHTML=`
    <div style="margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--text3)">📍 ${esc(coords)}</span>
      <a href="${gmUrl}" target="_blank" class="btn btn-primary btn-sm">🌍 Άνοιγμα Street View</a>
      <a href="${mapUrl}" target="_blank" class="btn btn-secondary btn-sm">🗺️ Άνοιγμα σε Maps</a>
    </div>
    <div style="position:relative;width:100%;padding-bottom:60%;height:0;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border)">
      <iframe
        src="https://www.google.com/maps/embed/v1/streetview?key=AIzaSyAy85ZlyBN2XhxM0YomF5e-79Hh7pXMD1I&location=${lat},${lng}&heading=0&pitch=0&fov=90"
        style="position:absolute;top:0;left:0;width:100%;height:100%;border:0"
        allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade">
      </iframe>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-top:6px">
      Αν το Street View δεν εμφανίζεται, πάτα «🌍 Άνοιγμα Street View» για άνοιγμα στο Google Maps.
    </div>`;
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
