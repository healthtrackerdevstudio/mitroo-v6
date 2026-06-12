// ══ PROTOCOL VOCABULARY CANONICALIZATION (v5.08) ══
// Extensible map: canonical → variants. Both Αίτημα και Τελική Εξ. Ενέργεια
// τραβάνε από την ίδια λίστα, οπότε το cleanup ενοποιεί παραλλαγές χρηστών
// που μολύνουν το autocomplete (ΑΔ ΛΕΙΤ, Αδ Λειτ, Αδεια Λετουργίας...).
// Variants γράφονται normalized (πεζά, χωρίς τόνους/τελείες). Δες _normGr().
const PROTO_CANON_MAP=[
  {
    canonical:'ΑΔ ΛΕΙΤΟΥΡΓΙΑΣ',
    variants:[
      'αδ λειτ',
      'αδ λειτουργιας',
      'αδεια λειτουργιας',
      'αδεια λετουργιας',   // typo missing 'ι'
      'α λειτουργιας',
    ]
  },
  {
    canonical:'ΑΛΛ ΔΙΚΑΙΟΥΧΟΥ',
    variants:[
      'αλλ δικ',
      'αλλ δικαιουχ',
      'αλλ δικαιουχου',
      'αλλαγη δικαιουχου',
    ]
  },
  {
    canonical:'ΕΓΓΡΑΦΟ',
    // Όλες οι παραλλαγές με προέκταση (ΕΛΛΙΠΗ, ΣΕ ΑΑΔΕ κλπ) ενοποιούνται
    // σε σκέτο "ΕΓΓΡΑΦΟ". Αν θες να διατηρηθεί η προέκταση ως πληροφορία,
    // αφαίρεσε το αντίστοιχο variant παρακάτω (θα το χάσει η ενοποίηση).
    variants:[
      'εγγραφο',
      'εγγραφα',
      'εγγρφαο',                            // typo (α↔φ swap)
      'εγγρφαο σε ατ',                      // typo + ΑΤ destination
      'εγγραφο ελλιπη',
      'εγγραφο σε ααδε',
      'εγγραφο σε νομικη',
      'εγγραφο σε υδομ',
      'εγγραφο στο υμε',
      'εγγραφο στην αποκεντρωμενη',
      'εγγραφο για ελεγχ πληρ',
      'εγγραφο για ελλιπη',
      'εγγραφο για κωδικο',
      'εγγραφο με κεα',
      'εγγραφο προς υπηρεσιες',
      'εγγραφο προς υπδ',
    ]
  }
  // Επόμενες ομάδες προστίθενται εδώ:
  // { canonical:'ΑΔ ΙΔΡΥΣΗΣ', variants:['αδ ιδρ','αδεια ιδρυσης',...] },
];

// Normalize Greek text για robust comparison:
// — lowercase, αφαίρεση τόνων/διαλυτικών, dots→space, collapse multiple spaces, trim
function _normGr(s){
  if(!s) return '';
  let x=String(s).toLowerCase();
  x=x.replace(/[άΆ]/g,'α').replace(/[έΈ]/g,'ε').replace(/[ήΉ]/g,'η')
     .replace(/[ίΊϊΐ]/g,'ι').replace(/[όΌ]/g,'ο').replace(/[ύΎϋΰ]/g,'υ').replace(/[ώΏ]/g,'ω');
  x=x.replace(/[.,·]/g,' ').replace(/\s+/g,' ').trim();
  return x;
}

// Επιστρέφει την canonical μορφή ή null αν δεν ανήκει σε ομάδα.
// Idempotent: αν η τιμή είναι ήδη canonical, επιστρέφει την ίδια.
function _findCanonical(value){
  const n=_normGr(value);
  if(!n) return null;
  for(const grp of PROTO_CANON_MAP){
    if(grp.variants.includes(n)) return grp.canonical;
    if(n===_normGr(grp.canonical)) return grp.canonical;
  }
  return null;
}

// Σαρώνει το protocol για παραλλαγές. dryRun=true → preview μόνο.
// Επιστρέφει {aitima:[{idx,fak,from,to}], energeia:[...]}.
function cleanupProtoVocab(dryRun){
  const changes={aitima:[], energeia:[]};
  protocol.forEach(function(p,idx){
    if(p.aitima){
      const canon=_findCanonical(p.aitima);
      if(canon && p.aitima!==canon){
        changes.aitima.push({idx:idx, fak:p.fak||'?', from:p.aitima, to:canon});
        if(!dryRun) p.aitima=canon;
      }
    }
    if(p.energeia){
      const canon=_findCanonical(p.energeia);
      if(canon && p.energeia!==canon){
        changes.energeia.push({idx:idx, fak:p.fak||'?', from:p.energeia, to:canon});
        if(!dryRun) p.energeia=canon;
      }
    }
  });
  return changes;
}


// ══ PROTOCOL ══
function getProtoFiltered(){
  const q=(document.getElementById('proto-search')||{value:''}).value.toLowerCase();
  const fSheet=(document.getElementById('proto-f-sheet')||{value:''}).value;
  const selYears=getSelectedYears();
  const fPhase=window._protoPhaseFilter||'';
  let arr=[...protocol];
  if(q) arr=arr.filter(p=>(p.fak+p.aition+p.aitima+p.proto_eisx+p.proto_exerx+p.mixanikos+p.energeia).toLowerCase().includes(q));
  if(fSheet) arr=arr.filter(p=>p.sheet===fSheet);
  if(selYears.length>0) arr=arr.filter(p=>selYears.includes((p.hm_xreosis||'').substring(0,4)));
  if(fPhase){
    arr=arr.filter(p=>{
      if(fPhase==='4') return !!p.rejected;
      if(fPhase==='3') return !p.rejected && !!p.teliko;
      if(fPhase==='2') return !p.rejected && !p.teliko && !!p.hm_exerx;
      if(fPhase==='1') return !p.rejected && !p.teliko && !p.hm_exerx;
      return true;
    });
  }
  // Υπολογισμός _phase για sorting: 1=Προς Ενέργεια, 2=Προς Υπογραφές, 3=Υπογεγραμμένο, 4=Απορρίφθηκε
  arr=arr.map(p=>({...p,_phase:p.rejected?'4':p.teliko?'3':p.hm_exerx?'2':'1'}));
  const{col,dir}=sortState.proto;
  arr.sort((a,b)=>(a[col]||'').localeCompare(b[col]||'')*dir);
  return arr;
}

// ══ PROTO PHASE FILTER ══
window._protoPhaseFilter = '';
window._protoYearFilter = [];

function setProtoPhaseFilter(phase){
  window._protoPhaseFilter = (window._protoPhaseFilter === phase) ? '' : phase;
  renderProto();
}

function toggleYearDropdown(){
  var p=document.getElementById('proto-year-panel');
  if(!p) return;
  p.style.display = p.style.display==='none' ? 'block' : 'none';
  // Κλείσιμο με κλικ εκτός
  if(p.style.display==='block'){
    setTimeout(function(){
      document.addEventListener('click', function closeYP(e){
        if(!p.contains(e.target) && e.target.id!=='proto-year-btn'){
          p.style.display='none';
          document.removeEventListener('click', closeYP);
        }
      });
    }, 100);
  }
}

function onYearAllChange(cb){
  var checks=document.querySelectorAll('#proto-year-checks input[type=checkbox]');
  checks.forEach(function(c){ c.checked=cb.checked; });
  updateYearLabel();
  renderProto();
}

function onYearCbChange(){
  var checks=document.querySelectorAll('#proto-year-checks input[type=checkbox]');
  var all=document.getElementById('proto-year-all');
  var allChecked=[...checks].every(function(c){return c.checked;});
  if(all) all.checked=allChecked;
  updateYearLabel();
  renderProto();
}

function updateYearLabel(){
  var checks=[...document.querySelectorAll('#proto-year-checks input[type=checkbox]:checked')];
  var label=document.getElementById('proto-year-label');
  if(!label) return;
  var allCb=document.getElementById('proto-year-all');
  if(allCb && allCb.checked){
    label.textContent='Όλα Έτη';
  } else if(checks.length===0){
    label.textContent='Κανένα έτος';
  } else if(checks.length===1){
    label.textContent=checks[0].value;
  } else {
    label.textContent=checks.length+' έτη';
  }
}

function getSelectedYears(){
  var allCb=document.getElementById('proto-year-all');
  if(allCb && allCb.checked) return [];
  return [...document.querySelectorAll('#proto-year-checks input[type=checkbox]:checked')]
    .map(function(c){return c.value;});
}

function populateYearFilter(){
  const years=[...new Set(
    protocol
      .map(p=>(p.hm_xreosis||'').substring(0,4))
      .filter(y=>y.length===4 && /^\d{4}$/.test(y) && parseInt(y)>=2000 && parseInt(y)<=2099)
  )].sort().reverse();
  const checks=document.getElementById('proto-year-checks');
  if(!checks) return;
  checks.innerHTML=years.map(y=>
    `<label style="display:flex;align-items:center;gap:8px;padding:4px 12px;cursor:pointer;font-size:13px">
      <input type="checkbox" value="${y}" checked onchange="onYearCbChange()"> ${y}
    </label>`
  ).join('');
  updateYearLabel();
}


function renderProto(){
  const arr=getProtoFiltered();
  const tbody=document.getElementById('proto-tbody');
  if(!tbody)return;
  if(!arr.length){tbody.innerHTML=`<tr><td colspan="11" class="table-empty">Δεν βρέθηκαν κινήσεις</td></tr>`;document.getElementById('proto-count').textContent='';return;}
  tbody.innerHTML=arr.map(p=>{
    const isRejected=p.rejected;
    const rowCls=isRejected?'row-phase4':p.teliko?'row-phase3':p.hm_exerx?'row-phase2':'row-phase1';
    let phaseIndicator='';
    if(isRejected){ phaseIndicator=''; }
    // Φάση 1 — χωρίς χρώμα (μόνο χρέωση)
    const teliko=isRejected?
                 `<span class="badge badge-red">❌ Απορρίφθηκε${p.rejected_date?' '+fmtDate(p.rejected_date):''}</span>`:
                 p.teliko?`<span class="badge badge-green">✅ ${fmtDate(p.teliko)}</span>`:
                 p.hm_exerx?`<span class="badge badge-blue">🔵 Προς Υπογραφές</span>`:
                 p.hm_xreosis?`<span class="badge badge-gray">⬜ Προς Ενέργεια</span>`:
                 `<span class="badge badge-gray">Νέο</span>`;
    return `<tr class="${rowCls} clickable" onclick="openProtoModal('${p._id||''}')" title="Κλικ για επεξεργασία">
      <td class="mono"><strong>${esc(p.fak)}</strong></td>
      <td class="mono muted">${esc(p.proto_eisx)}</td>
      <td class="mono">${fmtDate(p.hm_xreosis)}</td>
      <td>${esc(p.aition)}</td>
      <td>${esc(p.aitima)}</td>
      <td>${esc(p.mixanikos)}</td>
      <td class="mono muted">${fmtDate(p.hm_exerx)}</td>
      <td class="mono muted">${p.proto_exerx?`<a href="${p.proto_exerx_link||'#'}" target="${p.proto_exerx_link?'_blank':'_self'}" style="color:var(--accent);text-decoration:none">${esc(p.proto_exerx)}</a>`:''}</td>
      <td style="font-size:12px;color:var(--text2)">${esc(p.energeia||'')}</td>
      <td>${teliko}</td>
      <td class="actions" onclick="event.stopPropagation()">
        <button class="btn-icon" onclick="openProtoModal('${p._id||''}')" title="Επεξεργασία">✏️</button>
        <button class="btn-icon" onclick="confirmDelete('Διαγραφή κίνησης;',()=>deleteProto('${p._id||''}'))" title="Διαγραφή">🗑</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('proto-count').textContent=`${arr.length} από ${protocol.length} κινήσεις`;

  // Phase summary στο toolbar
  const phase1=protocol.filter(p=>!p.rejected&&!p.teliko&&!p.hm_exerx).length;
  const phase2=protocol.filter(p=>!p.rejected&&!p.teliko&&p.hm_exerx).length;
  const phase3=protocol.filter(p=>!p.rejected&&p.teliko).length;
  const rejected=protocol.filter(p=>p.rejected).length;
  const summary=document.getElementById('proto-phase-summary');
  if(summary){
    // Αριθμοί βάσει ετών (αν έχουν επιλεγεί)
    var selYrs=getSelectedYears();
    var baseArr=(selYrs.length>0)?protocol.filter(function(p){return selYrs.includes((p.hm_xreosis||'').substring(0,4));}):protocol;
    var c1=baseArr.filter(function(p){return !p.rejected&&!p.teliko&&!p.hm_exerx;}).length;
    var c2=baseArr.filter(function(p){return !p.rejected&&!p.teliko&&p.hm_exerx;}).length;
    var c3=baseArr.filter(function(p){return !p.rejected&&p.teliko;}).length;
    var c4=baseArr.filter(function(p){return p.rejected;}).length;
    var fP=window._protoPhaseFilter||'';
    function phSpan(id,cls,ph,label,cnt){
      const active=fP===ph;
      const activeStyle=active?'box-shadow:0 0 0 2.5px #1a3a6b;font-weight:600;':'';
      return '<span id="'+id+'" data-phase="'+ph+'" class="phase-pill '+cls+(active?' active':'')+'" style="'+activeStyle+'">'+label+': <strong>'+cnt+'</strong></span>';
    }
    summary.innerHTML=
      phSpan('phase-btn-1','phase-pill-1','1','⬜ Προς Ενέργεια',c1)+' '+
      phSpan('phase-btn-2','phase-pill-2','2','🔵 Προς Υπογραφές',c2)+' '+
      phSpan('phase-btn-4','phase-pill-4','4','❌ Απορριφθέντα',c4)+' '+
      phSpan('phase-btn-3','phase-pill-3','3','✅ Ολοκληρωμένα',c3);
    summary.onclick=function(e){
      var span=e.target.closest('[data-phase]');
      if(!span) return;
      var ph=span.getAttribute('data-phase');
      window._protoPhaseFilter=(window._protoPhaseFilter===ph&&ph!=='')?'':ph;
      renderProto();
    };
  }
}
function acModalFak(inp,inpId,listId){
  const q=inp.value.toLowerCase();
  const list=document.getElementById(listId);
  if(!list)return;
  // Keep qnav in sync as user types — only enable when FAK matches an installation
  const exactMatch=installations.find(i=>i.fak===inp.value.trim());
  const modalKey=inpId==='cf-fak'?'cert':(inpId==='ef-fak'?'equip':(inpId==='if-fak'?'inst':null));
  if(modalKey) qnavShow(modalKey, exactMatch?exactMatch.fak:null);
  const sorted=[...installations].sort((a,b)=>a.fak.localeCompare(b.fak));
  const matches=q?sorted.filter(i=>(i.fak+' '+i.name).toLowerCase().includes(q)):sorted;
  if(!matches.length){list.classList.remove('show');return;}
  list.innerHTML=matches.slice(0,30).map(i=>
    `<div class="ac-item" onclick="selectModalFak('${esc(i.fak)}','${esc(i.name)}','${inpId}','${listId}')">`
    +`<strong>${esc(i.fak)}</strong> <span class="muted" style="font-size:11px">– ${esc(i.name)}</span></div>`
  ).join('');
  list.classList.add('show');
}

function selectModalFak(fak,name,inpId,listId){
  const inp=document.getElementById(inpId);
  if(inp) inp.value=fak;
  const list=document.getElementById(listId);
  if(list) list.classList.remove('show');
  // Αν είναι ef-fak, ενημέρωσε και το hidden field
  if(inpId==='ef-fak'){
    const hidden=document.getElementById('ef-fak-edit');
    if(hidden) hidden.value=fak;
    qnavShow('equip',fak);
  } else if(inpId==='cf-fak'){
    qnavShow('cert',fak);
  } else if(inpId==='if-fak'){
    qnavShow('inst',fak);
  }
}

// ══ QUICK NAV ══
let qnavFak=null; // Τρέχων ΦΑΚ για quick nav

function qnavShow(modalId, fak){
  qnavFak=fak||null;
  const bar=document.getElementById('qnav-'+modalId);
  if(!bar) return;
  // Always visible — dim & lock buttons when no FAK yet
  bar.style.display='flex';
  if(fak){
    bar.classList.remove('nofak');
  } else {
    bar.classList.add('nofak');
  }
  // Update label
  const span=bar.querySelector('span');
  if(span) span.textContent=fak?('Φάκελος: '+fak):'Φάκελος: (επιλέξτε ΦΑΚ για navigation)';
}

function qnavGo(target){
  if(!qnavFak) return;
  const fak=qnavFak;
  // Κλείσε όλα τα modals
  ['modal-inst','modal-cert','modal-equip'].forEach(id=>closeModal(id));
  // Άνοιξε το target
  if(target==='inst'){
    showView('inst');
    setTimeout(function(){openInstModal(fak);},100);
  } else if(target==='certs'){
    showView('certs');
    setTimeout(function(){openCertsFakModal(fak);},100);
  } else if(target==='equip'){
    showView('equip');
    setTimeout(function(){openEquipModal(fak);},100);
  } else if(target==='proto'){
    showView('proto');
    // Φιλτράρισμα πρωτοκόλλου για τον ΦΑΚ
    setTimeout(function(){
      const search=document.getElementById('proto-search');
      if(search){search.value=fak;renderProto();}
    },100);
  }
}

function toggleRejectedDate(cb){
  const wrap=document.getElementById('pf-rejected-date-wrap');
  if(wrap) wrap.style.display=cb.checked?'block':'none';
  // Αν τσεκαριστεί, βάλε σημερινή ημερομηνία αν είναι άδειο
  if(cb.checked){
    const dateEl=document.getElementById('pf-rejected-date');
    if(dateEl&&!dateEl.value) dateEl.value=new Date().toISOString().slice(0,10);
  }
}

function openProtoModal(id=null,prefillFak=null){
  closeAllAcLists();
  // Rebuild λίστας από protocol (ώστε να έχει όλες τις τιμές, όχι μόνο defaults)
  aitimata_list=[...new Set([...aitimata_list_defaults,
    ...protocol.map(function(p){return p.aitima;}).filter(Boolean),
    ...protocol.map(function(p){return p.energeia;}).filter(Boolean)
  ])].sort();
  editProtoId=id||null;
  const p=id?protocol.find(x=>x._id===id):null;
  document.getElementById('modal-proto-title').textContent=id?'Επεξεργασία Κίνησης':'Νέα Κίνηση Πρωτοκόλλου';
  const f=n=>document.getElementById(n);
  const v=k=>p?p[k]||'':'';
  f('pf-fak').value=prefillFak||v('fak');
  f('pf-sheet').value=v('sheet');
  f('pf-aition').value=v('aition');
  if(!p&&prefillFak){const i=installations.find(x=>x.fak===prefillFak);if(i&&!f('pf-aition').value)f('pf-aition').value=i.name;}
  f('pf-aitima').value=v('aitima');
  f('pf-proto_eisx').value=v('proto_eisx');
  f('pf-hm_xreosis').value=toISODate(v('hm_xreosis'));
  f('pf-mixanikos').value=v('mixanikos');
  f('pf-hm_exerx').value=toISODate(v('hm_exerx'));
  f('pf-energeia').value=v('energeia');
  f('pf-proto_exerx').value=v('proto_exerx');
  f('pf-proto_exerx_link').value=v('proto_exerx_link');
  f('pf-teliko').value=toISODate(v('teliko'));
  f('pf-notes').value=v('notes');
  // Απορρίφθηκε
  const rejCb=f('pf-rejected');
  const rejDate=f('pf-rejected-date');
  const rejWrap=f('pf-rejected-date-wrap');
  if(rejCb){rejCb.checked=!!(p&&p.rejected);}
  if(rejDate){rejDate.value=v('rejected_date');}
  if(rejWrap){rejWrap.style.display=(p&&p.rejected)?'block':'none';}
  openModal('modal-proto');
  // Καθαρισμός παλιών alerts
  const existingAlert=document.getElementById('proto-fak-alerts');
  if(existingAlert) existingAlert.remove();
  // Έλεγχος δικλείδων ΜΟΝΟ αν υπάρχει συγκεκριμένος ΦΑΚ (επεξεργασία ή prefill)
  const fakVal=prefillFak||(p?p.fak:'');
  if(fakVal) setTimeout(function(){checkFakAlerts(fakVal);},300);
}
let _fakAlertTimer=null;
function checkFakAlertsDelayed(fak){
  clearTimeout(_fakAlertTimer);
  if(!fak||fak.length<3) return;
  _fakAlertTimer=setTimeout(function(){checkFakAlerts(fak);},600);
}

function checkFakAlerts(fak){
  const today=new Date(); today.setHours(0,0,0,0);
  const alerts=[];

  // 1. Ληγμένα πιστοποιητικά
  const fakCerts=certificates.filter(function(c){return c.fak===fak;});
  const expired=fakCerts.filter(function(c){return c.expiry&&new Date(c.expiry)<today;});
  if(expired.length>0){
    alerts.push({
      type:'danger',
      icon:'⚠️',
      msg:'Ληγμένα πιστοποιητικά ('+expired.length+'): '+expired.map(function(c){return c.type;}).join(', ')
    });
  }

  // 2. Έλεγχος εξοπλισμού vs πιστοποιητικών
  const eq=equipment.find(function(e){return e.fak===fak;});
  const inst=installations.find(function(i){return i.fak===fak;});
  // Μόνο μη-ληγμένα πιστοποιητικά
  const validCerts=fakCerts.filter(function(c){return !c.expiry||new Date(c.expiry)>=today;});
  const certTypesLower=validCerts.map(function(c){return (c.type||'').trim().toLowerCase();});
  function hasCert(needle){return certTypesLower.some(function(t){return t.includes(needle.toLowerCase());});}

  if(eq){
    // Ανυψωτικό → Πιστ. Ανυψωτικού
    if((eq.anif_plyntirio||eq.anif_lipantirio)&&!hasCert('ανυψωτικ')){
      alerts.push({type:'warning',icon:'🔧',msg:'Δηλώθηκε Ανυψωτικό αλλά δεν υπάρχει "Πιστ. Ανυψωτικού"'});
    }
    // Stage II → Πιστ. Stage II
    if(eq.artho25&&!hasCert('stage')){
      alerts.push({type:'warning',icon:'💨',msg:'Δηλώθηκε Stage II (Αρθ.25) αλλά δεν υπάρχει "Πιστ. Stage II"'});
    }
    // Δεξαμενές LPG/CNG → αντίστοιχα πιστοποιητικά
    const hasTankLPG=(eq.tanks||[]).some(function(t){return (t.fuel||'').toUpperCase()==='LPG';});
    const hasTankCNG=(eq.tanks||[]).some(function(t){return (t.fuel||'').toUpperCase()==='CNG';});
    if(hasTankLPG&&!hasCert('αεροφυλακ')&&!hasCert('lpg')){
      alerts.push({type:'warning',icon:'🟡',msg:'Υπάρχει δεξαμενή LPG αλλά δεν υπάρχει "Πιστ. Αεροφυλακίου LPG"'});
    }
    if(hasTankCNG&&!hasCert('αεροφυλακ')){
      alerts.push({type:'warning',icon:'🟢',msg:'Υπάρχει δεξαμενή CNG αλλά δεν υπάρχει "Πιστ. Αεροφυλακίου"'});
    }
  }

  // 3. Τύπος εγκατάστασης vs πιστοποιητικά
  if(inst){
    if(inst.type==='Μικτό Πρατήριο'){
      if((inst.subtype==='GPL'||inst.subtype==='GPL+CNG')&&!hasCert('αεροφυλακ')&&!hasCert('lpg')){
        alerts.push({type:'warning',icon:'🟡',msg:'Μικτό Πρατήριο LPG αλλά δεν υπάρχει "Πιστ. Αεροφυλακίου LPG"'});
      }
      if((inst.subtype==='CNG'||inst.subtype==='GPL+CNG')&&!hasCert('αεροφυλακ')){
        alerts.push({type:'warning',icon:'🟢',msg:'Μικτό Πρατήριο CNG αλλά δεν υπάρχει "Πιστ. Αεροφυλακίου"'});
      }
    }
  }

  // 4. Υποχρεωτικά πιστοποιητικά για ΟΛΑ τα πρατήρια (εκτός Λοιπές Εγκαταστάσεις)
  const isPratIrio = inst && inst.type && !inst.type.includes('Λοιπές');
  if(isPratIrio){
    // Ελέγχει αν υπάρχει ΕΓΚΥΡΟ (μη ληγμένο) πιστοποιητικό
    function hasValidCert(needle){
      return validCerts.some(function(c){return (c.type||'').toLowerCase().includes(needle.toLowerCase());});
    }
    function hasValidCertExcl(needle, excl){
      return validCerts.some(function(c){
        const t=(c.type||'').toLowerCase();
        return t.includes(needle.toLowerCase()) && !t.includes(excl.toLowerCase());
      });
    }

    // Για ΟΛΕΣ τις εγκαταστάσεις — Πιστ. Πυροπροστασίας
    if(!hasValidCert('πυροπροστ')){
      alerts.push({type:'danger',icon:'🔥',
        msg:fakCerts.some(c=>(c.type||'').toLowerCase().includes('πυροπροστ'))
          ?'⚠️ Πιστ. Πυροπροστασίας έχει ΛΗΞΕΙ'
          :'❌ Λείπει Πιστ. Πυροπροστασίας (υποχρεωτικό)'});
    }
    // ΥΔΕ
    if(!hasValidCert('υδε')){
      alerts.push({type:'danger',icon:'📋',
        msg:fakCerts.some(c=>(c.type||'').toLowerCase().includes('υδε'))
          ?'⚠️ ΥΔΕ έχει ΛΗΞΕΙ'
          :'❌ Λείπει ΥΔΕ (υποχρεωτικό)'});
    }
    // Πιστ. Δεξαμενών Υγρών (όχι LPG/CNG)
    if(!hasValidCertExcl('δεξαμεν','lpg')&&!hasValidCertExcl('δεξαμεν','cng')){
      // Ελέγχει αν υπάρχει δεξαμενή υγρών
      const hasLiquidTanks = !eq || (eq.tanks||[]).some(t=>{
        const f=(t.fuel||'').toUpperCase();
        return f!=='LPG'&&f!=='CNG'&&f!=='';
      });
      if(hasLiquidTanks){
        alerts.push({type:'danger',icon:'⛽',
          msg:fakCerts.some(c=>{const t=(c.type||'').toLowerCase();return t.includes('δεξαμεν')&&!t.includes('lpg')&&!t.includes('cng');})
            ?'⚠️ Πιστ. Δεξαμενών Υγρών έχει ΛΗΞΕΙ'
            :'❌ Λείπει Πιστ. Δεξαμενών Υγρών (υποχρεωτικό)'});
      }
    }
    // Πιστ. Εξαεριστικών
    if(!hasValidCert('εξαεριστ')){
      alerts.push({type:'warning',icon:'💨',
        msg:fakCerts.some(c=>(c.type||'').toLowerCase().includes('εξαεριστ'))
          ?'⚠️ Πιστ. Εξαεριστικών έχει ΛΗΞΕΙ'
          :'⚠️ Λείπει Πιστ. Εξαεριστικών'});
    }
    // Πιστ. Αεροσυμπιεστή (regular, not LPG)
    if(!hasValidCertExcl('αεροσυμπιεστ','lpg')&&!hasValidCertExcl('αεροφυλακ','lpg')){
      alerts.push({type:'warning',icon:'🔧',
        msg:fakCerts.some(c=>{const t=(c.type||'').toLowerCase();return (t.includes('αεροσυμπιεστ')||t.includes('αεροφυλακ'))&&!t.includes('lpg');})
          ?'⚠️ Πιστ. Αεροσυμπιεστή έχει ΛΗΞΕΙ'
          :'⚠️ Λείπει Πιστ. Αεροσυμπιεστή'});
    }

    // Μικτό Πρατήριο — επιπλέον υποχρεωτικά
    if(inst.type==='Μικτό Πρατήριο'){
      const isLPG = inst.subtype==='GPL'||inst.subtype==='GPL+CNG';
      const isCNG = inst.subtype==='CNG'||inst.subtype==='GPL+CNG';
      if(isLPG){
        // Πιστ. Αεροσυμπιεστή LPG
        if(!hasValidCert('αεροσυμπιεστ lpg')&&!hasValidCert('αεροφυλακ lpg')&&
           !validCerts.some(c=>{const t=(c.type||'').toLowerCase();return (t.includes('αεροσυμπιεστ')||t.includes('αεροφυλακ'))&&t.includes('lpg');})){
          alerts.push({type:'danger',icon:'🟡',
            msg:'❌ Λείπει Πιστ. Αεροσυμπιεστή LPG (υποχρεωτικό για Μικτό LPG)'});
        }
        // Πιστ. Δεξαμενής LPG
        if(!validCerts.some(c=>{const t=(c.type||'').toLowerCase();return t.includes('δεξαμεν')&&t.includes('lpg');})){
          alerts.push({type:'danger',icon:'🟡',
            msg:fakCerts.some(c=>{const t=(c.type||'').toLowerCase();return t.includes('δεξαμεν')&&t.includes('lpg');})
              ?'⚠️ Πιστ. Δεξαμενής LPG έχει ΛΗΞΕΙ'
              :'❌ Λείπει Πιστ. Δεξαμενής LPG (υποχρεωτικό για Μικτό LPG)'});
        }
      }
      if(isCNG){
        // Πιστ. Δεξαμενής CNG
        if(!validCerts.some(c=>{const t=(c.type||'').toLowerCase();return t.includes('δεξαμεν')&&t.includes('cng');})){
          alerts.push({type:'danger',icon:'🟢',
            msg:'❌ Λείπει Πιστ. Δεξαμενής CNG (υποχρεωτικό για Μικτό CNG)'});
        }
      }
    }
  }

  if(!alerts.length) return;

  // Εμφάνιση alerts μέσα στο modal
  showProtoAlerts(fak,alerts);
}

function showProtoAlerts(fak,alerts){
  // Αφαίρεσε υπάρχοντα alert banner
  const existing=document.getElementById('proto-fak-alerts');
  if(existing) existing.remove();

  const colors={danger:'#fee2e2',warning:'#fef9c3'};
  const borders={danger:'#fca5a5',warning:'#fde68a'};
  const textColors={danger:'#991b1b',warning:'#854d0e'};

  const banner=document.createElement('div');
  banner.id='proto-fak-alerts';
  banner.style.cssText='margin:0 0 12px 0;border-radius:8px;overflow:hidden';
  banner.innerHTML='<div style="background:#f1f5f9;padding:6px 12px;font-size:11px;font-weight:700;color:#475569;border-bottom:1px solid #e2e8f0">⚠️ Ειδοποιήσεις για ΦΑΚ: '+esc(fak)+'</div>'
    +alerts.map(function(a){
      return '<div style="background:'+colors[a.type]+';border-left:3px solid '+borders[a.type]+';padding:6px 12px;font-size:12px;color:'+textColors[a.type]+'">'
        +a.icon+' '+a.msg+'</div>';
    }).join('');

  // Βάλε στην αρχή του modal body
  const modalBody=document.querySelector('#modal-proto .modal-body');
  if(modalBody) modalBody.insertBefore(banner,modalBody.firstChild);
}

function saveProto(){
  const fak=document.getElementById('pf-fak').value.trim();
  if(!fak){toast('Το ΦΑΚ είναι υποχρεωτικό','error');return;}
  const g=id=>document.getElementById(id)?document.getElementById(id).value.trim():'';
  const rejected=document.getElementById('pf-rejected')?document.getElementById('pf-rejected').checked:false;
  const obj={
    fak,sheet:g('pf-sheet'),aition:g('pf-aition'),aitima:g('pf-aitima'),
    proto_eisx:g('pf-proto_eisx'),hm_xreosis:g('pf-hm_xreosis'),
    mixanikos:g('pf-mixanikos'),hm_exerx:g('pf-hm_exerx'),
    energeia:g('pf-energeia'),proto_exerx:g('pf-proto_exerx'),
    proto_exerx_link:g('pf-proto_exerx_link'),teliko:g('pf-teliko'),
    notes:g('pf-notes'),
    rejected:rejected,
    rejected_date:rejected?g('pf-rejected-date'):''
  };

  // ══ ΕΛΕΓΧΟΣ ΔΙΠΛΟΕΓΓΡΑΦΗΣ ══
  if(!editProtoId && obj.proto_eisx && obj.hm_xreosis){
    // Έλεγχος 1: ίδιος αρ.πρωτ. + ίδια ημερομηνία + ίδιος ΦΑΚ
    const exactDup=protocol.find(p=>
      p.fak===obj.fak &&
      p.proto_eisx===obj.proto_eisx &&
      p.hm_xreosis===obj.hm_xreosis
    );
    if(exactDup){
      toast('⚠️ Υπάρχει ήδη καταχώρηση με τον ίδιο ΦΑΚ, Αρ.Εισ. και Ημ.Χρέωσης!','error');
      return;
    }
    // Έλεγχος 2: ίδιος αρ.πρωτ. + ίδιο έτος (διαφορετικός ΦΑΚ)
    const sameYear=obj.hm_xreosis.substring(0,4);
    const yearDup=protocol.find(p=>
      p.proto_eisx===obj.proto_eisx &&
      (p.hm_xreosis||'').substring(0,4)===sameYear &&
      p.fak!==obj.fak
    );
    if(yearDup){
      // Προειδοποίηση μόνο (όχι μπλοκάρισμα) — ο ίδιος αρ.πρωτ. μπορεί να αφορά διαφορετικό ΦΑΚ
      if(!confirm('⚠️ Ο Αρ.Εισ. "'+obj.proto_eisx+'" υπάρχει ήδη για το '+sameYear+' (ΦΑΚ: '+yearDup.fak+').\n\nΣυνέχεια καταχώρησης;')){
        return;
      }
    }
  }

  // Add new inst if not exists
  if(!installations.find(i=>i.fak===fak)){
    installations.push({fak,sheet:obj.sheet,name:obj.aition||'',afm:'',adeia:'',address:'',topothesia:'',tel:'',email:'',cat:'',type:'',subtype:'',maps_link:'',coords:'',notes:''});
    save('inst',installations);
  }
  if(editProtoId){
    const idx=protocol.findIndex(p=>p._id===editProtoId);
    if(idx>=0)protocol[idx]={...protocol[idx],...obj};
    else{obj._id=uid();protocol.push(obj);}
  } else {
    obj._id=uid();
    protocol.push(obj);
  }
  save('proto',protocol);
  // update dynamic lists
  if(obj.aition&&!aitions_list.includes(obj.aition)){aitions_list.push(obj.aition);aitions_list.sort();}
  if(obj.aitima&&!aitimata_list.includes(obj.aitima)){aitimata_list.push(obj.aitima);aitimata_list.sort();}
  if(obj.energeia&&!aitimata_list.includes(obj.energeia)){aitimata_list.push(obj.energeia);aitimata_list.sort();}
  if(obj.mixanikos&&!engineers_dynamic.includes(obj.mixanikos)){engineers_dynamic.push(obj.mixanikos);engineers_dynamic.sort();}
  closeModal('modal-proto');
  toast(editProtoId?'✓ Κίνηση ενημερώθηκε':'✓ Κίνηση αποθηκεύτηκε','success');
  try{ updateBadges();renderProto();renderDash();populateYearFilter(); }catch(e){ console.warn('renderProto:',e); }
}
function deleteProto(id){
  protocol=protocol.filter(p=>p._id!==id);
  save('proto',protocol);
  try{ updateBadges();renderProto();renderDash(); }catch(e){}
  toast('🗑 Κίνηση διαγράφηκε','info');
}

