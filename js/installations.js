// ══ INSTALLATIONS ══
function getInstFiltered(){
  const q=(document.getElementById('inst-search')||{value:''}).value.toLowerCase();
  const fSheet=(document.getElementById('inst-f-sheet')||{value:''}).value;
  const fCat=(document.getElementById('inst-f-cat')||{value:''}).value;
  // Multi-select για τύπο
  const typeEl=document.getElementById('inst-f-type');
  const fTypes=typeEl?Array.from(typeEl.selectedOptions).map(o=>o.value).filter(v=>v!==''):[];
  let arr=[...installations];
  if(q) arr=arr.filter(i=>(i.fak+i.name+i.topothesia+i.address+i.afm+i.tel).toLowerCase().includes(q));
  if(fSheet==='inst') arr=arr.filter(i=>i.type!=='ΕΧΕΣ');
  else if(fSheet==='exes') arr=arr.filter(i=>i.type==='ΕΧΕΣ');
  if(fTypes.length>0) arr=arr.filter(i=>fTypes.includes(i.type));
  if(fCat) arr=arr.filter(i=>i.cat===fCat);
  // Φίλτρο ανάκληση/σφράγιση (από dashboard card 🔒)
  if(window._instLockFilter){ arr=arr.filter(i=>i.sfragisi||i.anaklisi); }
  const{col,dir}=sortState.inst;
  arr.sort((a,b)=>(a[col]||'').localeCompare(b[col]||'')*dir);
  return arr;
}
function renderInst(){
  const arr=getInstFiltered();
  const tbody=document.getElementById('inst-tbody');
  if(!tbody)return;
  if(!arr.length){tbody.innerHTML=`<tr><td colspan="8" class="table-empty">Δεν βρέθηκαν εγκαταστάσεις</td></tr>`;document.getElementById('inst-count').textContent='';return;}
  tbody.innerHTML=arr.map(i=>{
    const inactive=i.sfragisi||i.anaklisi;
    const rowCls3=inactive?'row-phase4 clickable':'clickable';
    const lockBadge=inactive?'<span title="'+(i.sfragisi?'Σε Σφράγιση':'')+(i.sfragisi&&i.anaklisi?' / ':'')+(i.anaklisi?'Σε Ανάκληση ΑΛ':'')+'"> 🔒</span>':'';
    const takBadge=i.taktopoi?`<span style="font-size:10px;background:#dcfce7;color:#15803d;padding:1px 4px;border-radius:6px" title="Τακτοποίηση${i.taktopoi_num?' αρ.'+i.taktopoi_num:''}${i.taktopoi_nomos?' — '+i.taktopoi_nomos:''}"> 🗂️</span>`:'';
    const today2=new Date(); today2.setHours(0,0,0,0);
    const adeiaBadge=i.adeia_lixis&&new Date(i.adeia_lixis)<today2?'<span title="Ληγμένη Άδεια: '+fmtDate(i.adeia_lixis)+'" style="color:#f97316"> ⚠️</span>':'';
    return `<tr class="${rowCls3}" onclick="openInstModal('${esc(i.fak)}')" title="Κλικ για επεξεργασία">
    <td class="mono">${esc(i.fak)}${lockBadge}${adeiaBadge}</td>
    <td><strong>${esc(i.name)}</strong>${takBadge}</td>
    <td>${esc(i.topothesia)}</td>
    <td class="mono muted">${esc(i.afm)}</td>
    <td>${typeTag(i.type,i.subtype)}</td>
    <td>${i.cat?`<span class="badge ${i.cat==='ΔΧ'?'badge-blue':'badge-orange'}">${i.cat}</span>`:''}</td>
    <td class="muted" style="font-size:11px">${esc(i.adeia)}</td>
    <td class="actions" onclick="event.stopPropagation()">
      ${i.coords?'<button class="btn-icon" onclick="openInstMap(\''+esc(i.coords)+'\',\''+esc(i.name||i.fak)+'\')" title="Άνοιγμα σε χάρτη">📍</button>':''}
      ${i.maps_link?'<button class="btn-icon" onclick="openKmlLink(this)" data-path="'+esc(i.maps_link)+'" title="Άνοιγμα/Αντιγραφή KML">🗺</button>':''}
      <button class="btn-icon" onclick="printInstReport('${esc(i.fak)}')" title="Εκτύπωση αναφοράς">🖨️</button>
      <button class="btn-icon" onclick="openInstModal('${esc(i.fak)}')" title="Επεξεργασία">✏️</button>
      <button class="btn-icon" onclick="confirmDelete('Διαγραφή εγκατάστασης «${esc(i.fak)}»;',()=>deleteInst('${esc(i.fak)}'))" title="Διαγραφή">🗑</button>
    </td>
  </tr>`;
  }).join('');
  document.getElementById('inst-count').textContent=`${arr.length} από ${installations.length} εγκαταστάσεις`;
}
function typeTag(t,sub){
  if(!t) return '';
  const clsMap={
    'Πρατήριο Υγρών Καυσίμων':'badge-blue',
    'Μικτό Πρατήριο':'badge-teal',
    'Πρατήριο ΙΧ Container':'badge-teal',
    'Στεγασμένος Σταθμός':'badge-purple',
    'Υπαίθριος Σταθμός':'badge-purple',
    'Συνεργείο':'badge-orange',
    'Πλυντήριο':'badge-blue',
    'Λιπαντήριο':'badge-orange',
    'ΙΚΤΕΟ':'badge-red',
    'ΕΧΕΣ':'badge-gray',
    'Λοιπές Εγκαταστάσεις':'badge-orange'
  };
  const labelMap={
    'Πρατήριο Υγρών Καυσίμων':'ΠΥΚ',
    'Μικτό Πρατήριο': sub ? 'Μικτό ('+sub+')' : 'Μικτό',
    'Πρατήριο ΙΧ Container':'Container',
    'Στεγασμένος Σταθμός':'Στεγ.Σταθμός',
    'Υπαίθριος Σταθμός':'Υπαίθρ.Σταθμός',
    'Συνεργείο':'Συνεργείο',
    'Πλυντήριο':'Πλυντήριο',
    'Λιπαντήριο':'Λιπαντήριο',
    'ΙΚΤΕΟ':'ΙΚΤΕΟ',
    'ΕΧΕΣ':'ΕΧΕΣ',
    'Λοιπές Εγκαταστάσεις': sub||'Λοιπές'
  };
  const label = labelMap[t] || t;
  const cls = clsMap[t] || 'badge-gray';
  return '<span class="badge '+cls+'" title="'+t+'">'+label+'</span>';
}

function openInstModal(fak=null){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  closeAllAcLists();
  // Populate Περιοχή datalist from existing installation topothesia values
  const tdl=document.getElementById('topo-datalist');
  if(tdl){
    const topos=[...new Set(installations.map(function(i){return i.topothesia;}).filter(Boolean))].sort();
    tdl.innerHTML=topos.map(function(t){return '<option value="'+t.replace(/"/g,'&quot;')+'">';}).join('');
  }
  editInstId=fak;
  const i=fak?installations.find(x=>x.fak===fak):null;
  document.getElementById('modal-inst-title').textContent=fak?'Επεξεργασία Εγκατάστασης':'Νέα Εγκατάσταση';
  const f=id=>document.getElementById(id);
  f('if-fak').value=i?i.fak:'';
  f('if-fak').disabled=!!fak;
  f('if-fak').style.border='';
  f('if-fak').title='';
  // Κουμπί αλλαγής ΦΑΚ — reset state + εμφάνιση μόνο σε επεξεργασία υπάρχουσας
  const unlockBtn=document.getElementById('if-fak-unlock-btn');
  if(unlockBtn){
    unlockBtn.style.display=fak?'':'none';
    unlockBtn.textContent='✏️ Αλλαγή ΦΑΚ';
    unlockBtn.disabled=false;
  }
  f('if-sheet').value=i?i.sheet:'';
  f('if-name').value=i?i.name:'';
  f('if-afm').value=i?i.afm:'';
  f('if-adeia').value=i?i.adeia:'';
  f('if-address').value=i?i.address:'';
  f('if-topothesia').value=i?i.topothesia:'';
  f('if-tel').value=i?i.tel:'';
  f('if-email').value=i?i.email:'';
  f('if-ypeuthinos').value=i?i.ypeuthinos||'':'';
  // Τακτοποίηση
  const takCb=document.getElementById('if-taktopoi');
  const takWrap=document.getElementById('if-taktopoi-wrap');
  if(takCb){
    takCb.checked=!!(i&&i.taktopoi);
    if(takWrap) takWrap.style.display=(i&&i.taktopoi)?'':'none';
  }
  f('if-taktopoi-num').value=i?i.taktopoi_num||'':'';
  f('if-taktopoi-nomos').value=i?i.taktopoi_nomos||'':'';
  f('if-vytio').value=i?i.vytio||'':'';
  f('if-adeia-typos').value=i?i.adeia_typos||'':'';
  f('if-adeia-lixis').value=i?i.adeia_lixis||'':'';
  f('if-steg-antlies').value=i?i.steg_antlies||'':'';
  f('if-steg-exyp').value=i?i.steg_exyp||'':'';
  f('if-steg-theseis').value=i?i.steg_theseis||'':'';
  f('if-cat').value=i?i.cat:'';
  f('if-type').value=i?i.type:'';
  f('if-maps_link').value=i?i.maps_link:'';
  f('if-coords').value=i?i.coords:'';
  f('if-notes').value=i?i.notes:'';
  // Σφράγιση / Ανάκληση
  const sfr=document.getElementById('if-sfragisi');
  const ana=document.getElementById('if-anaklisi');
  if(sfr){sfr.checked=!!(i&&i.sfragisi);}
  if(ana){ana.checked=!!(i&&i.anaklisi);}
  const sfrAp=document.getElementById('if-sfragisi-ap');
  const anaAp=document.getElementById('if-anaklisi-ap');
  if(sfrAp){sfrAp.value=i?i.sfragisi_ap||'':('')}
  if(anaAp){anaAp.value=i?i.anaklisi_ap||'':('')}
  // Αμεταβίβαστα
  const ametaCb=document.getElementById('if-ameta');
  const ametaAp=document.getElementById('if-ameta-ap');
  if(ametaCb){ametaCb.checked=!!(i&&i.ameta);}
  if(ametaAp){ametaAp.value=i?i.ameta_ap||'':'';}
  toggleInstStatus();
  toggleInstStatus();
  // Subtype
  if(i&&i.type==='Μικτό Πρατήριο'){
    f('if-subtype-mikto').value=i.subtype||'';
  } else if(i&&i.type==='Λοιπές Εγκαταστάσεις'&&i.subtype){
    const presets=['Συνεργείο','Πλυντήριο','Λιπαντήριο','Στεγασμένος Σταθμός','Υπαίθριος Σταθμός','ΙΚΤΕΟ'];
    if(presets.includes(i.subtype)){f('if-subtype-sel').value=i.subtype;f('if-subtype-txt').style.display='none';}
    else{f('if-subtype-sel').value='__other__';f('if-subtype-txt').style.display='';f('if-subtype-txt').value=i.subtype;}
  } else {f('if-subtype-sel').value='';f('if-subtype-txt').style.display='none';f('if-subtype-txt').value='';f('if-subtype-mikto').value='';}
  // Νέα πεδία τύπου
  const sv = (id, val) => { const el=document.getElementById(id); if(el) el.value=val||''; };
  sv('if-ikteo-exousiodotisi', i?.ikteo_exousiodotisi);
  sv('if-synergeia-katigoria', i?.synergeia_katigoria);
  sv('if-synergeia-ypeuthinos', i?.synergeia_ypeuthinos);
  sv('if-plyntirio-katigoria', i?.plyntirio_katigoria);
  sv('if-plyntirio-theseis', i?.plyntirio_theseis);
  sv('if-plyntirio-eidos', i?.plyntirio_eidos);
  sv('if-plyntirio-exypirethisi', i?.plyntirio_exypirethisi);
  // Ειδικότητα συνεργείου (multi-select)
  const eidEl = document.getElementById('if-synergeia-eidikotita');
  if(eidEl){
    const saved = Array.isArray(i?.synergeia_eidikotita) ? i.synergeia_eidikotita : [];
    Array.from(eidEl.options).forEach(o => o.selected = saved.includes(o.value));
  }
  onInstTypeChange();
  // Γέμισμα datalist τοποθεσίας από υπάρχουσες τιμές
  var dl=document.getElementById('topo-datalist');
  if(dl){
    var topos=[...new Set(installations.map(function(i){return (i.topothesia||'').trim();}).filter(Boolean))].sort();
    dl.innerHTML=topos.map(function(t){return '<option value="'+t+'">';}).join('');
  }
  openModal('modal-inst');
  qnavShow('inst',fak);
}
function toggleInstStatus(){
  const sfr=document.getElementById('if-sfragisi');
  const ana=document.getElementById('if-anaklisi');
  const ameta=document.getElementById('if-ameta');
  const sfrWrap=document.getElementById('if-sfragisi-wrap');
  const anaWrap=document.getElementById('if-anaklisi-wrap');
  const ametaWrap=document.getElementById('if-ameta-wrap');
  if(sfrWrap) sfrWrap.style.display=sfr&&sfr.checked?'block':'none';
  if(anaWrap) anaWrap.style.display=ana&&ana.checked?'block':'none';
  if(ametaWrap) ametaWrap.style.display=ameta&&ameta.checked?'block':'none';
}

function toggleSubtype(){
  const t=document.getElementById('if-type').value;
  document.getElementById('subtype-row').style.display=t==='Λοιπές Εγκαταστάσεις'?'':'none';
  document.getElementById('subtype-mikto-row').style.display=t==='Μικτό Πρατήριο'?'':'none';
  if(t!=='Λοιπές Εγκαταστάσεις'){document.getElementById('if-subtype-sel').value='';document.getElementById('if-subtype-txt').style.display='none';document.getElementById('if-subtype-txt').value='';}
  if(t!=='Μικτό Πρατήριο') document.getElementById('if-subtype-mikto').value='';
  toggleSubtypeExtras();
}
function toggleSubtypeExtras(){
  const sub=document.getElementById('if-subtype-sel').value;
  const showExtras=['Πλυντήριο','Λιπαντήριο','Στεγασμένος Σταθμός','Υπαίθριος Σταθμός'].includes(sub);
  const extrasRow=document.getElementById('subtype-extras-row');
  if(extrasRow) extrasRow.style.display=showExtras?'block':'none';
  const stegDiv=document.getElementById('extras-steg');
  if(stegDiv) stegDiv.style.display=sub==='Στεγασμένος Σταθμός'?'flex':'none';
}
function syncSubtype(){
  const sel=document.getElementById('if-subtype-sel').value;
  document.getElementById('if-subtype-txt').style.display=sel==='__other__'?'':'none';
}

function onInstTypeChange(){
  const t=document.getElementById('if-type').value;
  const sheet=(document.getElementById('if-sheet')||{value:''}).value;
  // Κρύψε ΕΧΕΣ αν sheet=auto
  const exesOpt=document.getElementById('if-type-exes');
  if(exesOpt){ exesOpt.style.display=sheet==='auto'?'none':''; }
  if(sheet==='auto' && t==='ΕΧΕΣ'){
    document.getElementById('if-type').value='';
  }
  // Βυτιοφόρο: μόνο για πρατήρια υγρών
  const vytioRow=document.getElementById('vytio-row');
  if(vytioRow) vytioRow.style.display=TYPES_WITH_VYTIO.includes(t)?'block':'none';
  if(!TYPES_WITH_VYTIO.includes(t)) document.getElementById('if-vytio').value='';
  // Μικτό subtype
  const subMiktoRow=document.getElementById('subtype-mikto-row');
  if(subMiktoRow) subMiktoRow.style.display=t==='Μικτό Πρατήριο'?'':'none';
  // Παλιό Λοιπές subtype row — κρύβουμε (δεν χρειάζεται πλέον)
  const subRow=document.getElementById('subtype-row');
  if(subRow) subRow.style.display='none';
  // Παλιά extras — κρύβουμε
  const extrasRow=document.getElementById('subtype-extras-row');
  if(extrasRow) extrasRow.style.display='none';
  // ΙΚΤΕΟ
  const ikteoRow=document.getElementById('ikteo-row');
  if(ikteoRow) ikteoRow.style.display=t==='ΙΚΤΕΟ'?'block':'none';
  // Συνεργείο
  const synRows=document.getElementById('synergeia-rows');
  if(synRows) synRows.style.display=t==='Συνεργείο'?'block':'none';
  // Πλυντήριο
  const plyRows=document.getElementById('plyntirio-rows');
  if(plyRows) plyRows.style.display=t==='Πλυντήριο'?'block':'none';
}
// Backward compat aliases
function toggleSubtype(){ onInstTypeChange(); }
function toggleSubtypeExtras(){}

function normalizeFak(f){
  return f.trim().toUpperCase().replace(/[./]/g,'_').replace(/\s+/g,' ').replace(/_+/g,'_');
}

function saveInst(){
  const fak=document.getElementById('if-fak').value.trim();
  if(!fak){toast('⚠️ Το ΦΑΚ είναι υποχρεωτικό','error');return;}

  // ── Υποχρεωτικά πεδία ────────────────────────────────────────
  const reqName=document.getElementById('if-name').value.trim();
  if(!reqName){toast('⚠️ Η Επωνυμία είναι υποχρεωτική','error');document.getElementById('if-name').focus();return;}
  if(!editInstId){
    // Νέα εγκατάσταση — πλήρης έλεγχος υποχρεωτικών
    const reqSheet=document.getElementById('if-sheet').value.trim();
    if(!reqSheet){toast('⚠️ Το Τμήμα / Φύλλο είναι υποχρεωτικό','error');return;}
    const reqAddress=document.getElementById('if-address').value.trim();
    if(!reqAddress){toast('⚠️ Η Διεύθυνση είναι υποχρεωτική','error');document.getElementById('if-address').focus();return;}
    const reqTopo=document.getElementById('if-topothesia').value.trim();
    if(!reqTopo){toast('⚠️ Η Περιοχή είναι υποχρεωτική','error');document.getElementById('if-topothesia').focus();return;}
    const reqAfm0=document.getElementById('if-afm').value.trim();
    if(!reqAfm0){toast('⚠️ Το ΑΦΜ είναι υποχρεωτικό (9 ψηφία)','error');document.getElementById('if-afm').focus();return;}
  }
  // ΑΦΜ format — πάντα αν έχει συμπληρωθεί
  const reqAfm=document.getElementById('if-afm').value.trim();
  if(reqAfm&&!/^\d{9}$/.test(reqAfm)){toast('⚠️ ΑΦΜ: ακριβώς 9 αριθμητικά ψηφία','error');document.getElementById('if-afm').focus();return;}
  // ─────────────────────────────────────────────────────────────

  // Duplicate check — μόνο για νέες εγγραφές
  if(!editInstId){
    const fakNorm=normalizeFak(fak);
    const similar=installations.filter(function(i){
      return normalizeFak(i.fak||'')===fakNorm;
    });
    if(similar.length>0){
      var names=similar.map(function(i){return i.fak+' ('+i.name+')';}).join(', ');
      if(!confirm('⚠️ Υπάρχει ήδη εγκατάσταση με παρόμοιο αριθμό φακέλου:\n'+names+'\n\nΣυνέχεια;')) return;
    }
  }
  const type=document.getElementById('if-type').value;
  let subtype='';
  if(type==='Μικτό Πρατήριο'){
    subtype=document.getElementById('if-subtype-mikto').value;
  } else if(type==='Λοιπές Εγκαταστάσεις'){
    const subtypeSel=document.getElementById('if-subtype-sel').value;
    subtype=subtypeSel==='__other__'?document.getElementById('if-subtype-txt').value.trim():subtypeSel;
  }
  const obj={
    fak,
    sheet:document.getElementById('if-sheet').value,
    name:document.getElementById('if-name').value.trim(),
    afm:document.getElementById('if-afm').value.trim(),
    adeia:document.getElementById('if-adeia').value.trim(),
    address:document.getElementById('if-address').value.trim(),
    topothesia:document.getElementById('if-topothesia').value.trim(),
    tel:document.getElementById('if-tel').value.trim(),
    email:document.getElementById('if-email').value.trim(),
    ypeuthinos:document.getElementById('if-ypeuthinos').value.trim(),
    taktopoi:!!(document.getElementById('if-taktopoi')&&document.getElementById('if-taktopoi').checked),
    taktopoi_num:document.getElementById('if-taktopoi-num')?document.getElementById('if-taktopoi-num').value.trim():'',
    taktopoi_nomos:document.getElementById('if-taktopoi-nomos')?document.getElementById('if-taktopoi-nomos').value.trim():'',
    vytio:document.getElementById('if-vytio').value.trim(),
    adeia_typos:document.getElementById('if-adeia-typos').value,
    adeia_lixis:document.getElementById('if-adeia-lixis').value,
    steg_antlies:document.getElementById('if-steg-antlies').value,
    steg_exyp:document.getElementById('if-steg-exyp').value,
    steg_theseis:document.getElementById('if-steg-theseis').value,
    cat:document.getElementById('if-cat').value,
    type,subtype,
    subtype,
    maps_link:document.getElementById('if-maps_link').value.trim(),
    coords:document.getElementById('if-coords').value.trim(),
    notes:document.getElementById('if-notes').value.trim(),
    sfragisi:document.getElementById('if-sfragisi')?document.getElementById('if-sfragisi').checked:false,
    sfragisi_ap:document.getElementById('if-sfragisi-ap')?document.getElementById('if-sfragisi-ap').value.trim():'',
    anaklisi:document.getElementById('if-anaklisi')?document.getElementById('if-anaklisi').checked:false,
    anaklisi_ap:document.getElementById('if-anaklisi-ap')?document.getElementById('if-anaklisi-ap').value.trim():'',
    ameta:document.getElementById('if-ameta')?document.getElementById('if-ameta').checked:false,
    ameta_ap:document.getElementById('if-ameta-ap')?document.getElementById('if-ameta-ap').value.trim():'',
    // Νέα πεδία ανά τύπο
    ikteo_exousiodotisi:(document.getElementById('if-ikteo-exousiodotisi')||{value:''}).value.trim(),
    synergeia_eidikotita:(()=>{const el=document.getElementById('if-synergeia-eidikotita');return el?Array.from(el.selectedOptions).map(o=>o.value):[];})(),
    synergeia_katigoria:(document.getElementById('if-synergeia-katigoria')||{value:''}).value,
    synergeia_ypeuthinos:(document.getElementById('if-synergeia-ypeuthinos')||{value:''}).value.trim(),
    plyntirio_katigoria:(document.getElementById('if-plyntirio-katigoria')||{value:''}).value,
    plyntirio_theseis:(document.getElementById('if-plyntirio-theseis')||{value:''}).value,
    plyntirio_eidos:(document.getElementById('if-plyntirio-eidos')||{value:''}).value,
    plyntirio_exypirethisi:(document.getElementById('if-plyntirio-exypirethisi')||{value:''}).value
  };
  if(editInstId){
    const idx=installations.findIndex(i=>i.fak===editInstId);
    // Ανίχνευση αλλαγής ΦΑΚ
    if(fak !== editInstId){
      // Έλεγχος αν το νέο ΦΑΚ υπάρχει ήδη
      if(installations.find(i=>i.fak===fak)){
        toast('Το ΦΑΚ "'+fak+'" υπάρχει ήδη — επέλεξε διαφορετικό','error');
        return;
      }
      // Cascade rename σε όλα τα modules
      const cascadeResult=instRenameFakCascade(editInstId, fak);
      if(idx>=0) installations[idx]={...installations[idx],...obj};
      else installations.push(obj);
      save('inst',installations);
      closeModal('modal-inst');
      const msg='✓ ΦΑΚ άλλαξε: '+editInstId+' → '+fak+'\n'
        +'Πρωτόκολλο: '+cascadeResult.proto+' · Πιστ/κά: '+cascadeResult.certs+' · Εξοπλ: '+cascadeResult.equip;
      toast(msg,'success');
      try{ updateBadges(); renderInst(); renderProto(); renderCerts(); renderEquip(); }catch(e){}
      return;
    }
    if(idx>=0)installations[idx]={...installations[idx],...obj};
    else installations.push(obj);
  } else {
    if(installations.find(i=>i.fak===fak)){toast('Αυτό το ΦΑΚ υπάρχει ήδη','error');return;}
    installations.push(obj);
  }
  save('inst',installations);
  closeModal('modal-inst');
  toast(editInstId?'✓ Εγκατάσταση ενημερώθηκε':'✓ Εγκατάσταση αποθηκεύτηκε','success');
  try{ updateBadges(); renderInst(); }catch(e){ console.warn('renderInst:',e); }
}
function deleteInst(fak){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  var relCerts=certificates.filter(function(c){return c.fak===fak;}).length;
  var relEquip=equipment.filter(function(e){return e.fak===fak;}).length;
  installations=installations.filter(function(i){return i.fak!==fak;});
  if(relCerts>0){ certificates=certificates.filter(function(c){return c.fak!==fak;}); save('certs',certificates); }
  if(relEquip>0){ equipment=equipment.filter(function(e){return e.fak!==fak;}); save('equip',equipment); }
  save('inst',installations);
  try{ updateBadges();renderInst();renderDash();if(relCerts>0)renderCerts();if(relEquip>0)renderEquip(); }catch(e){}
  var extra=[];
  if(relCerts>0) extra.push(relCerts+' πιστ/κά');
  if(relEquip>0) extra.push(relEquip+' εξοπλ.');
  toast('🗑 Εγκατάσταση «'+fak+'» διαγράφηκε'+(extra.length?' (+ '+extra.join(', ')+')':''),'info');
}


// ── Ξεκλείδωμα ΦΑΚ για διόρθωση ──────────────────────────────────
function instUnlockFak(){
  const oldFak=document.getElementById('if-fak').value.trim();
  if(!confirm(
    '⚠️ Αλλαγή ΦΑΚ\n\n'+
    'Το ΦΑΚ είναι μοναδικό αναγνωριστικό.\n'+
    'Αν το αλλάξεις, θα ενημερωθούν αυτόματα:\n'+
    '• Πρωτόκολλο\n• Πιστοποιητικά\n• Εξοπλισμός\n\n'+
    'Τρέχον ΦΑΚ: '+oldFak+'\n\n'+
    'Συνέχεια;'
  )) return;
  const inp=document.getElementById('if-fak');
  inp.disabled=false;
  inp.focus();
  inp.select();
  inp.style.border='2px solid #f97316';
  inp.title='Πληκτρολόγησε το νέο ΦΑΚ — η αλλαγή θα εφαρμοστεί στην Αποθήκευση';
  const btn=document.getElementById('if-fak-unlock-btn');
  if(btn){ btn.textContent='⚠️ Σε αλλαγή…'; btn.disabled=true; }
}

// ── Cascade rename ΦΑΚ σε όλα τα modules ──────────────────────────
function instRenameFakCascade(oldFak, newFak){
  let changed=0;
  // Πρωτόκολλο
  protocol.forEach(p=>{ if(p.fak===oldFak){p.fak=newFak;changed++;} });
  if(changed) save('proto',protocol);
  // Πιστοποιητικά
  let cc=0;
  certificates.forEach(c=>{ if(c.fak===oldFak){c.fak=newFak;cc++;} });
  if(cc) save('certs',certificates);
  // Εξοπλισμός
  let ce=0;
  equipment.forEach(e=>{ if(e.fak===oldFak){e.fak=newFak;ce++;} });
  if(ce) save('equip',equipment);
  return {proto:changed, certs:cc, equip:ce};
}

// ── Τακτοποίηση toggle ──
function toggleTaktopoi(cb){
  const wrap=document.getElementById('if-taktopoi-wrap');
  if(wrap) wrap.style.display=cb.checked?'':'none';
}
