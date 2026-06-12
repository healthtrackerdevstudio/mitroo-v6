// ════════════════════════════════════════════════════════════════════
// ΠΕΠΡΑΓΜΕΝΑ ΕΞΑΜΗΝΟΥ — αυτόματος υπολογισμός από πρωτόκολλο
// ════════════════════════════════════════════════════════════════════

// Helper: case-insensitive keyword match on a value
function _pmatch(val){
  if(!val) return false;
  const v=_normGr(val);
  const keys=[].slice.call(arguments,1);
  return keys.some(function(k){ return v.includes(_normGr(k)); });
}

// Mapping Excel Α/Α → criteria για αντιστοίχηση με κινήσεις πρωτοκόλλου.
// fn(p, inst) → true αν η κίνηση ανήκει στη σειρά.
// ref2025a, ref2025b: γνωστές τιμές για επαλήθευση.
// ════════════════════════════════════════════════════════════════════
// ΠΕΠΡΑΓΜΕΝΑ ΕΞΑΜΗΝΟΥ — Configurable v2 (v5.30)
// Config stored in localStorage key 'peprag_cfg' as JSON array.
// Each row: { id, active, aa, grp, desc, kw_aitima, kw_energy, kw_excl, inst_cat }
// kw_* = pipe-separated normalized keywords (matched via _normGr)
// ════════════════════════════════════════════════════════════════════

const PEPRAG_DEFAULT_CFG=[
  {id:'r01',active:true,  aa:11, grp:'Πλυντήρια-Λιπαντήρια',  desc:'Γνωστοποίηση (Μεταβολή-Παύση) πλυντηρίου-λιπαντηρίου', kw_aitima:'πλυντ|λιπαντ', kw_energy:'', kw_excl:'', inst_cat:''},
  {id:'r02',active:true,  aa:17, grp:'Στεγασμένοι Σταθμοί',    desc:'Έγκριση σχεδιαγραμμάτων στεγασμένου σταθμού',            kw_aitima:'εγκρ|σχεδ',    kw_energy:'', kw_excl:'', inst_cat:''},
  {id:'r03',active:true,  aa:18, grp:'Στεγασμένοι Σταθμοί',    desc:'Βεβ. Νόμιμης Λειτουργίας στεγ. σταθμού (υλοποίηση)',     kw_aitima:'βεβαι|λειτ',   kw_energy:'', kw_excl:'', inst_cat:''},
  {id:'r04',active:true,  aa:21, grp:'Πρατήρια ΔΧ',            desc:'Άδεια Ίδρυσης πρατηρίου ΔΧ',                             kw_aitima:'ιδρυσ|εγκατ',  kw_energy:'', kw_excl:'', inst_cat:'ΔΧ'},
  {id:'r05',active:false, aa:22, grp:'Πρατήρια ΔΧ',            desc:'Αρχική ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ ΔΧ',                               kw_aitima:'αρχικ|πρωτη',  kw_energy:'', kw_excl:'', inst_cat:'ΔΧ'},
  {id:'r06',active:true,  aa:23, grp:'Πρατήρια ΔΧ',            desc:'Έγκριση σχεδίων πρατηρίου ΔΧ',                           kw_aitima:'εγκρ|σχεδ',    kw_energy:'', kw_excl:'πλυντ|λιπαντ', inst_cat:'ΔΧ'},
  {id:'r07',active:true,  aa:24, grp:'Πρατήρια ΔΧ',            desc:'ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ μετά υλοποίηση ΔΧ',                      kw_aitima:'αδ λειτ|λειτουργιας', kw_energy:'', kw_excl:'ιδρυσ|αλλ δικ|ογκομ', inst_cat:'ΔΧ'},
  {id:'r08',active:true,  aa:25, grp:'Πρατήρια ΔΧ',            desc:'ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ λόγω αλλαγής δικαιούχου ΔΧ',             kw_aitima:'αλλ δικ|αλλαγ δικ', kw_energy:'', kw_excl:'', inst_cat:'ΔΧ'},
  {id:'r09',active:true,  aa:26, grp:'Πρατήρια ΔΧ',            desc:'ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ λόγω νέων Ογκομ. Πινάκων ΔΧ',            kw_aitima:'ογκομετρ',     kw_energy:'', kw_excl:'', inst_cat:'ΔΧ'},
  {id:'r10',active:true,  aa:27, grp:'Πρατήρια ΙΧ',            desc:'Άδεια Ίδρυσης πρατηρίου ΙΧ',                             kw_aitima:'ιδρυσ|εγκατ',  kw_energy:'', kw_excl:'', inst_cat:'ΙΧ'},
  {id:'r11',active:true,  aa:28, grp:'Πρατήρια ΙΧ',            desc:'ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ πρατηρίου ΙΧ',                            kw_aitima:'αδ λειτ|λειτουργιας', kw_energy:'', kw_excl:'', inst_cat:'ΙΧ'},
  {id:'r12',active:true,  aa:51, grp:'Αποφάσεις',              desc:'Απόφαση απαγόρευσης/ανάκλησης/αφαίρεσης Άδειας',         kw_aitima:'ανακλ|απαγορ|αφαιρ', kw_energy:'ανακλ|απαγορ', kw_excl:'', inst_cat:''},
  {id:'r13',active:true,  aa:52, grp:'Αποφάσεις',              desc:'Απόφαση σφράγισης εγκατάστασης',                          kw_aitima:'σφραγ',         kw_energy:'σφραγ', kw_excl:'', inst_cat:''},
  {id:'r14',active:true,  aa:54, grp:'Πεπραγμένα',             desc:'Πρότυπες Περιβαλλοντικές Δεσμεύσεις (ΠΠΔ)',              kw_aitima:'ππδ|περιβαλλ|τακτοπ', kw_energy:'ππδ', kw_excl:'', inst_cat:''},
  {id:'r15',active:true,  aa:55, grp:'Πεπραγμένα',             desc:'Βεβαίωση Ηλεκτρολογικού Ελέγχου (ΒΗΕ)',                 kw_aitima:'βηε|ηλεκτρολ', kw_energy:'βηε', kw_excl:'', inst_cat:''},
  {id:'r16',active:true,  aa:56, grp:'Πεπραγμένα',             desc:'Αυτοψίες',                                                kw_aitima:'αυτοψ',         kw_energy:'',     kw_excl:'', inst_cat:''},
  {id:'r17',active:true,  aa:57, grp:'Πεπραγμένα',             desc:'Καταγγελίες',                                             kw_aitima:'καταγγ',        kw_energy:'',     kw_excl:'', inst_cat:''},
  {id:'r18',active:true,  aa:58, grp:'Έγγραφα',                desc:'Έγγραφα (απαντητικά, κλήσεις κτλ)',                       kw_aitima:'εγγραφ',        kw_energy:'εγγραφ', kw_excl:'', inst_cat:''},
  {id:'r19',active:true,  aa:82, grp:'ΕΧΕΣ',                   desc:'Οχήματα Ειδικού Σκοπού (ΕΧΕΣ)',                           kw_aitima:'εχεσ|οχημα|αυτοκιν|ιεκ|εξεσ', kw_energy:'', kw_excl:'', inst_cat:''},
  {id:'r20',active:true,  aa:89, grp:'Αποφάσεις',              desc:'Αποφάσεις Διοικητικών Κυρώσεων',                         kw_aitima:'κυρωσ|προστιμ|διοικ κυρ', kw_energy:'', kw_excl:'', inst_cat:''},
];

// Load or initialize config from localStorage
function pepGetCfg(){
  try{ const s=localStorage.getItem('peprag_cfg'); if(s) return JSON.parse(s); }catch(e){}
  return PEPRAG_DEFAULT_CFG.map(function(r){return Object.assign({},r);});
}
function pepSaveCfgToStorage(cfg){
  try{ localStorage.setItem('peprag_cfg', JSON.stringify(cfg)); }catch(e){}
}

// Tab switching
function pepSwitchTab(tab){
  ['results','config','discover'].forEach(function(t){
    document.getElementById('pep-panel-'+t).style.display=t===tab?'block':'none';
    document.getElementById('pep-tab-'+t).classList.toggle('active',t===tab);
  });
}

// Matching: returns true if protocol entry p (with installation inst) matches config row r
function pepMatchRow(p, inst, r){
  // inst_cat filter
  if(r.inst_cat && (!inst || inst.cat!==r.inst_cat)) return false;
  // exclusions: any exclusion keyword in aitima OR energeia → reject
  if(r.kw_excl){
    const ex=r.kw_excl.split('|').map(function(k){return k.trim();}).filter(Boolean);
    if(ex.some(function(k){ return _pmatch(p.aitima,k)||_pmatch(p.energeia,k); })) return false;
  }
  // aitima keywords
  const kwa=r.kw_aitima?r.kw_aitima.split('|').map(function(k){return k.trim();}).filter(Boolean):[];
  // energeia keywords
  const kwe=r.kw_energy?r.kw_energy.split('|').map(function(k){return k.trim();}).filter(Boolean):[];
  if(kwa.length===0 && kwe.length===0) return false; // no keywords = skip
  const matchA=kwa.length===0 || kwa.some(function(k){ return _pmatch(p.aitima,k)||(p.aitima||'').toUpperCase()===k.toUpperCase(); });
  const matchE=kwe.length===0 || kwe.some(function(k){ return _pmatch(p.energeia,k)||(p.energeia||'').toUpperCase()===k.toUpperCase(); });
  // If both specified: either can match (OR). If only one specified: that must match.
  if(kwa.length>0 && kwe.length>0) return matchA || matchE;
  return matchA && matchE; // at least the specified one must match
}

let _pepResults=null;

function openPepragmenaModal(){
  const yearSel=document.getElementById('pep-year');
  if(yearSel&&!yearSel.options.length){
    const years=[...new Set(protocol.map(function(p){ return p.hm_xreosis?p.hm_xreosis.substring(0,4):''; }).filter(Boolean))].sort().reverse();
    if(!years.includes('2026')) years.unshift('2026');
    years.forEach(function(y){
      const o=document.createElement('option'); o.value=y; o.textContent=y;
      if(y==='2026') o.selected=true;
      yearSel.appendChild(o);
    });
  }
  pepUpdateDates();
  pepSwitchTab('results');
  openModal('modal-peprag');
}

function pepUpdateDates(){
  const sem=document.getElementById('pep-semester').value;
  const year=document.getElementById('pep-year').value;
  const cw=document.getElementById('pep-custom-wrap');
  const lbl=document.getElementById('pep-range-label');
  if(sem==='custom'){
    if(cw) cw.style.display='flex';
    if(lbl) lbl.textContent='';
  } else {
    if(cw) cw.style.display='none';
    const from=sem==='A'?year+'-01-01':year+'-07-01';
    const to  =sem==='A'?year+'-06-30':year+'-12-31';
    if(lbl) lbl.textContent=fmtDate(from)+' – '+fmtDate(to);
    document.getElementById('pep-col-header').textContent=year+(sem==='A'?'Α':'Β');
  }
}

function pepGetPeriod(){
  const sem=document.getElementById('pep-semester').value;
  const year=document.getElementById('pep-year').value;
  if(sem==='custom'){
    return {from:document.getElementById('pep-from').value, to:document.getElementById('pep-to').value};
  }
  return {from:sem==='A'?year+'-01-01':year+'-07-01', to:sem==='A'?year+'-06-30':year+'-12-31'};
}

function calcAndShowPepragmena(){
  const {from:fromStr,to:toStr}=pepGetPeriod();
  if(!fromStr||!toStr){toast('Ορίστε ημερομηνίες','error');return;}
  const from=new Date(fromStr); from.setHours(0,0,0,0);
  const to=new Date(toStr);     to.setHours(23,59,59,999);
  const instMap={}; installations.forEach(function(i){instMap[i.fak]=i;});
  const inPeriod=protocol.filter(function(p){
    if(!p.hm_xreosis) return false;
    const d=new Date(p.hm_xreosis);
    return d>=from && d<=to;
  });
  const cfg=pepGetCfg().filter(function(r){return r.active;});
  _pepResults=cfg.map(function(r){
    const matches=inPeriod.filter(function(p){ return pepMatchRow(p,instMap[p.fak]||null,r); });
    return Object.assign({},r,{count:matches.length, faks:[...new Set(matches.map(function(p){return p.fak;}))]});
  });
  const colLabel=document.getElementById('pep-col-header').textContent;
  document.getElementById('pep-total-label').textContent=
    '📊 Σύνολο κινήσεων: '+inPeriod.length+' | Κατηγοριοποιημένες: '+_pepResults.reduce(function(s,r){return s+r.count;},0);
  let lastGrp='';
  document.getElementById('pep-results').innerHTML=_pepResults.map(function(r){
    const grpHdr=r.grp!==lastGrp
      ?'<div style="background:#f1f5f9;padding:4px 14px;font-size:10px;font-weight:700;color:#1a3a6b;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e2e8f0">'+esc(r.grp)+'</div>':'';
    lastGrp=r.grp;
    const c=r.count; const cc=c>0?'#15803d':'#94a3b8';
    return grpHdr+'<div style="display:grid;grid-template-columns:44px 1fr 130px 90px;padding:6px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;align-items:center"'+
      (c>0?' title="FAK: '+r.faks.slice(0,20).join(', ')+'"':'')+'>'+
      '<span style="color:#94a3b8;font-size:11px">'+r.aa+'</span>'+
      '<span>'+esc(r.desc)+'</span>'+
      '<span style="font-size:11px;color:#64748b">'+esc(r.grp)+'</span>'+
      '<span style="text-align:center;font-weight:700;color:'+cc+';font-size:16px">'+c+'</span>'+
      '</div>';
  }).join('');
  document.getElementById('pep-export-btn').disabled=false;
}

// ── CONFIG TAB ────────────────────────────────────────────────────
function pepRenderConfig(){
  const cfg=pepGetCfg();
  const rows=cfg.map(function(r,idx){
    const id='peprow_'+idx;
    return '<div style="display:grid;grid-template-columns:28px 42px 120px 1fr 160px 130px 60px 36px;gap:3px;padding:4px 8px;border-bottom:1px solid #f1f5f9;align-items:center" data-idx="'+idx+'">'+
      '<input type="checkbox"'+(r.active?' checked':'')+' onchange="pepToggleRow('+idx+',this.checked)" style="margin:0">'+
      '<input class="form-control" value="'+esc(r.aa)+'" onchange="pepUpdateCell('+idx+',\'aa\',this.value)" style="font-size:11px;padding:3px 5px;text-align:center">'+
      '<input class="form-control" value="'+esc(r.grp)+'" onchange="pepUpdateCell('+idx+',\'grp\',this.value)" style="font-size:11px;padding:3px 5px">'+
      '<input class="form-control" value="'+esc(r.desc)+'" onchange="pepUpdateCell('+idx+',\'desc\',this.value)" style="font-size:11px;padding:3px 5px">'+
      '<input class="form-control" value="'+esc(r.kw_aitima)+'" onchange="pepUpdateCell('+idx+',\'kw_aitima\',this.value)" style="font-size:11px;padding:3px 5px" placeholder="εγκρ|σχεδ|..." title="Λ.κ. Αιτήματος — χωρισμένα με |">'+
      '<input class="form-control" value="'+esc(r.kw_energy)+'" onchange="pepUpdateCell('+idx+',\'kw_energy\',this.value)" style="font-size:11px;padding:3px 5px" placeholder="εγγραφ|..." title="Λ.κ. Ενέργειας — χωρισμένα με |">'+
      '<select class="form-control" onchange="pepUpdateCell('+idx+',\'inst_cat\',this.value)" style="font-size:11px;padding:3px 5px">'+
        '<option value=""'+(r.inst_cat===''?' selected':'')+'>Όλες</option>'+
        '<option value="ΔΧ"'+(r.inst_cat==='ΔΧ'?' selected':'')+'>ΔΧ</option>'+
        '<option value="ΙΧ"'+(r.inst_cat==='ΙΧ'?' selected':'')+'>ΙΧ</option>'+
      '</select>'+
      '<button class="btn-icon" onclick="pepDeleteRow('+idx+')" title="Διαγραφή" style="color:#dc2626;font-size:14px">🗑</button>'+
      '</div>';
  }).join('');
  document.getElementById('pep-config-rows').innerHTML=rows||'<div style="padding:20px;text-align:center;color:#94a3b8">Καμία γραμμή</div>';
}

let _pepCfgEditing=pepGetCfg();

function pepUpdateCell(idx,field,val){
  _pepCfgEditing=pepGetCfg();
  _pepCfgEditing[idx][field]=field==='active'?Boolean(val):(field==='aa'?Number(val)||0:val);
}
function pepToggleRow(idx,checked){
  _pepCfgEditing=pepGetCfg();
  _pepCfgEditing[idx].active=checked;
  pepSaveCfgToStorage(_pepCfgEditing);
}
function pepDeleteRow(idx){
  _pepCfgEditing=pepGetCfg();
  _pepCfgEditing.splice(idx,1);
  pepSaveCfgToStorage(_pepCfgEditing);
  pepRenderConfig();
  toast('Γραμμή αφαιρέθηκε','info');
}
function pepAddRow(){
  const cfg=pepGetCfg();
  cfg.push({id:'r'+Date.now(),active:true,aa:cfg.length+1,grp:'Νέα Κατηγορία',desc:'Νέα Γραμμή',
    kw_aitima:'',kw_energy:'',kw_excl:'',inst_cat:''});
  pepSaveCfgToStorage(cfg);
  pepRenderConfig();
}
function pepSaveConfig(){
  // Read current values from DOM inputs
  const rows=document.querySelectorAll('#pep-config-rows [data-idx]');
  const cfg=pepGetCfg();
  rows.forEach(function(row){
    const idx=parseInt(row.dataset.idx);
    const inputs=row.querySelectorAll('input,select');
    if(inputs[0]) cfg[idx].active=inputs[0].checked;
    if(inputs[1]) cfg[idx].aa=Number(inputs[1].value)||0;
    if(inputs[2]) cfg[idx].grp=inputs[2].value;
    if(inputs[3]) cfg[idx].desc=inputs[3].value;
    if(inputs[4]) cfg[idx].kw_aitima=inputs[4].value.trim();
    if(inputs[5]) cfg[idx].kw_energy=inputs[5].value.trim();
    if(inputs[6]) cfg[idx].inst_cat=inputs[6].value;
  });
  pepSaveCfgToStorage(cfg);
  toast('✓ Ρύθμιση αποθηκεύτηκε','success');
}
function pepResetConfig(){
  if(!confirm('Επαναφορά στις προεπιλεγμένες γραμμές; Θα χαθούν οι αλλαγές σας.')) return;
  pepSaveCfgToStorage(PEPRAG_DEFAULT_CFG.map(function(r){return Object.assign({},r);}));
  pepRenderConfig();
  toast('✓ Επαναφορά προεπιλογών','info');
}

// Wire config tab render on click
document.addEventListener('click',function(e){
  if(e.target && e.target.id==='pep-tab-config') pepRenderConfig();
});

// ── DISCOVER TAB ─────────────────────────────────────────────────
function pepDiscover(){
  const {from:fromStr,to:toStr}=pepGetPeriod();
  if(!fromStr||!toStr){toast('Ορίστε ημερομηνίες στο tab Αποτελέσματα','warning');return;}
  const from=new Date(fromStr); from.setHours(0,0,0,0);
  const to=new Date(toStr);     to.setHours(23,59,59,999);
  const inPeriod=protocol.filter(function(p){
    if(!p.hm_xreosis) return false;
    const d=new Date(p.hm_xreosis); return d>=from && d<=to;
  });
  const instMap={}; installations.forEach(function(i){instMap[i.fak]=i;});
  // Count aitima values
  const aitimaCounts={};
  inPeriod.forEach(function(p){
    const a=(p.aitima||'(κενό)');
    aitimaCounts[a]=(aitimaCounts[a]||0)+1;
  });
  // Check which are matched by config
  const cfg=pepGetCfg().filter(function(r){return r.active;});
  const matched={};
  inPeriod.forEach(function(p){
    const inst=instMap[p.fak]||null;
    cfg.forEach(function(r){
      if(pepMatchRow(p,inst,r)) matched[(p.aitima||'(κενό)')]=r.desc;
    });
  });
  const sorted=Object.entries(aitimaCounts).sort(function(a,b){return b[1]-a[1];});
  const html=sorted.map(function(kv){
    const [val,cnt]=kv;
    const matchedBy=matched[val];
    const bg=matchedBy?'#f0fdf4':'#fff7ed';
    const dot=matchedBy?'🟢':'🟠';
    return '<div style="display:flex;align-items:center;gap:10px;padding:6px 14px;border-bottom:1px solid #f1f5f9;background:'+bg+'">'+
      '<span style="font-size:16px">'+dot+'</span>'+
      '<span style="flex:1;font-size:12px;font-weight:500">'+esc(val)+'</span>'+
      '<span class="badge badge-gray" style="min-width:32px;text-align:center">'+cnt+'</span>'+
      (matchedBy?'<span style="font-size:11px;color:#15803d;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(matchedBy)+'">→ '+esc(matchedBy)+'</span>':'<button class="btn btn-secondary btn-sm" onclick="pepCreateRowFrom(\''+esc(val)+'\')" style="font-size:11px">+ Νέα Γραμμή</button>')+
      '</div>';
  }).join('');
  document.getElementById('pep-discover-results').innerHTML=
    '<div style="padding:8px 14px;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0">🟢 = καλύπτεται  🟠 = αταίριαστο  |  '+inPeriod.length+' κινήσεις  |  '+sorted.length+' μοναδικά Αιτήματα</div>'+html;
}

function pepCreateRowFrom(aitima){
  const cfg=pepGetCfg();
  cfg.push({id:'r'+Date.now(),active:true,aa:cfg.length+1,grp:'Νέα Κατηγορία',
    desc:aitima,kw_aitima:_normGr(aitima),kw_energy:'',kw_excl:'',inst_cat:''});
  pepSaveCfgToStorage(cfg);
  pepSwitchTab('config');
  pepRenderConfig();
  toast('✓ Νέα γραμμή για "'+aitima+'" — ρυθμίστε και αποθηκεύστε','info');
}

// ── EXPORT ───────────────────────────────────────────────────────
function exportPepragmenaCSV(){
  if(!_pepResults){toast('Κάντε πρώτα Υπολογισμό','warning');return;}
  const col=document.getElementById('pep-col-header').textContent;
  const lines=['Α/Α,Κατηγορία,Αντικείμενο,'+col];
  _pepResults.forEach(function(r){ lines.push([r.aa,'"'+r.grp+'"','"'+r.desc+'"',r.count].join(',')); });
  const blob=new Blob(['\uFEFF'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='Πεπραγμένα_'+col+'.csv'; a.click();
  toast('✓ CSV εξήχθη','success');
}

function exportPepragmenaXLSX(){
  if(!_pepResults){toast('Κάντε πρώτα Υπολογισμό','warning');return;}
  if(typeof XLSX==='undefined'){toast('⚠ Βιβλιοθήκη Excel μη διαθέσιμη','warning');return;}
  const col=document.getElementById('pep-col-header').textContent;
  const ws_data=[['Α/Α','Κατηγορία','Αντικείμενο',col]];
  _pepResults.forEach(function(r){ ws_data.push([r.aa,r.grp,r.desc,r.count]); });
  const ws=XLSX.utils.aoa_to_sheet(ws_data);
  ws['!cols']=[{wch:6},{wch:22},{wch:54},{wch:12}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,'Πεπραγμένα',ws);
  XLSX.writeFile(wb,'Πεπραγμένα_'+col+'.xlsx');
  toast('✓ Excel εξήχθη','success');
}
// ════════════════════════════════════════════════════════════════════

// Ανοίγει το cleanup modal με preview των αλλαγών

// Ανοίγει το cleanup modal με preview των αλλαγών
function openCleanupModal(){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  const changes=cleanupProtoVocab(true);
  const total=changes.aitima.length+changes.energeia.length;
  const tbody=document.getElementById('cleanup-preview-tbody');
  const summary=document.getElementById('cleanup-summary');
  const applyBtn=document.getElementById('cleanup-apply-btn');
  // Mapping table
  const mapHtml=PROTO_CANON_MAP.map(function(g){
    return '<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">'
      +g.variants.map(function(v){return '<span class="badge badge-gray" style="margin:1px">'+esc(v)+'</span>';}).join(' ')
      +'</td><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">→</td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9"><strong style="color:#1a3a6b">'+esc(g.canonical)+'</strong></td></tr>';
  }).join('');
  document.getElementById('cleanup-mapping-tbody').innerHTML=mapHtml;
  // Preview body
  if(total===0){
    summary.innerHTML='<span style="color:#15803d;font-weight:600">✓ Όλες οι εγγραφές είναι ήδη κανονικοποιημένες</span> — δεν χρειάζεται καμία αλλαγή.';
    tbody.innerHTML='<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8">Καμία αλλαγή</td></tr>';
    applyBtn.disabled=true;
    applyBtn.style.opacity='0.5';
  } else {
    summary.innerHTML='<strong>'+total+' εγγραφές</strong> θα ενημερωθούν: '
      +'<span class="badge badge-blue">'+changes.aitima.length+' στο Αίτημα</span> '
      +'<span class="badge badge-purple">'+changes.energeia.length+' στην Τελ. Εξ. Ενέργεια</span>';
    const rows=[].concat(
      changes.aitima.map(function(c){return Object.assign({field:'Αίτημα'},c);}),
      changes.energeia.map(function(c){return Object.assign({field:'Τελ.Ενέργεια'},c);})
    );
    tbody.innerHTML=rows.slice(0,500).map(function(c){
      return '<tr><td class="mono" style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:11px">'+esc(c.fak)+'</td>'
        +'<td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:11px"><span class="badge '+(c.field==='Αίτημα'?'badge-blue':'badge-purple')+'">'+c.field+'</span></td>'
        +'<td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#dc2626">'+esc(c.from)+'</td>'
        +'<td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#15803d;font-weight:600">'+esc(c.to)+'</td></tr>';
    }).join('') + (rows.length>500?'<tr><td colspan="4" style="padding:8px;text-align:center;color:#94a3b8;font-size:11px">… και άλλες '+(rows.length-500)+' γραμμές</td></tr>':'');
    applyBtn.disabled=false;
    applyBtn.style.opacity='1';
  }
  openModal('modal-cleanup');
}

function applyCleanup(){
  const changes=cleanupProtoVocab(false); // false = apply
  save('proto',protocol);
  // Rebuild autocomplete list απαλλαγμένη από τις παλιές παραλλαγές
  aitimata_list=[...new Set([...aitimata_list_defaults,...protocol.map(p=>p.aitima).filter(Boolean),...protocol.map(p=>p.energeia).filter(Boolean)])].sort();
  closeModal('modal-cleanup');
  toast('✅ Εφαρμόστηκαν '+(changes.aitima.length+changes.energeia.length)+' αλλαγές','success');
  if(typeof renderProto==='function') renderProto();
  if(typeof renderStats==='function') renderStats();
}
// ══ END VOCABULARY CANONICALIZATION ══
