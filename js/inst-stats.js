// ══ ΣΤΑΤΙΣΤΙΚΑ ΕΓΚΑΤΑΣΤΑΣΕΩΝ ══
function renderInstStats(){
  if(installations.length===0 && USE_FIREBASE){ setTimeout(renderInstStats,600); return; }
  const today=new Date(); today.setHours(0,0,0,0);
  const twoYearsAgo=new Date(today); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear()-2);
  const typeEl_is_f_type=document.getElementById('is-f-type');
  const fTypes_is_f_type=typeEl_is_f_type?Array.from(typeEl_is_f_type.selectedOptions).map(o=>o.value).filter(v=>v!==''):[];
  const fAuto=(document.getElementById('is-f-autopsia')||{value:''}).value;
  // DD checkboxes
  const selTopos=getDdSelected('dd-is-topo');
  const selStatus=[...document.querySelectorAll('#dd-is-status input:not([value="__all__"]):checked')].map(function(i){return i.value;});
  const selEquip=[...document.querySelectorAll('#dd-is-equip input:not([value="__all__"]):checked')].map(function(i){return i.value;});
  const selYpef=getDdSelected('dd-is-ypef');

  let arr=[...installations].filter(function(i){return i.type!=='ΕΧΕΣ';});
  var _isTypeEl=document.getElementById('is-f-type');
  var _isFTypes=_isTypeEl?Array.from(_isTypeEl.selectedOptions).map(function(o){return o.value;}).filter(function(v){return v!=='';}) :[];
  if(_isFTypes.length>0) arr=arr.filter(function(i){return _isFTypes.includes(i.type);});
  if(selTopos.length) arr=arr.filter(function(i){return selTopos.includes(i.topothesia||'');});

  if(selStatus.length){
    arr=arr.filter(function(i){
      return selStatus.some(function(s){
        if(s==='active') return !i.sfrагisi&&!i.anaklisi;
        if(s==='sfrагisi') return i.sfrагisi;
        if(s==='anaklisi') return i.anaklisi;
        if(s==='inactive') return i.sfrагisi||i.anaklisi;
        return false;
      });
    });
  }

  if(selEquip.length){
    arr=arr.filter(function(i){
      const eq=equipment.find(function(e){return e.fak===i.fak;})||{};
      return selEquip.every(function(fEquip){
        if(fEquip==='plyntirio') return eq.plyntirio;
        if(fEquip==='plyntirio_pros') return eq.plyntirio_pros;
        if(fEquip==='plyntirio_auto') return eq.plyntirio_auto;
        if(fEquip==='anif') return eq.anif_plyntirio||eq.anif_lipantirio;
        if(fEquip==='lipantirio') return eq.lipantirio;
        if(fEquip==='steg_freatia') return eq.steg_freatia;
        if(fEquip==='offset_filling') return eq.offset_filling;
        if(fEquip==='auto_politis') return eq.auto_politis;
        if(fEquip==='lakkos') return eq.lakkos;
        return true;
      });
    });
  }
  if(fAuto==='has') arr=arr.filter(function(i){return i.autopsia;});
  else if(fAuto==='none') arr=arr.filter(function(i){return !i.autopsia;});
  else if(fAuto==='old') arr=arr.filter(function(i){return i.autopsia&&new Date(i.autopsia)<twoYearsAgo;});
  if(selYpef.length) arr=arr.filter(function(i){return selYpef.includes(i.ypeuthinos||'');});

  // Stat cards — με null check
  var _elTotal=document.getElementById('is-r-total');
  var _elActive=document.getElementById('is-r-active');
  var _elInactive=document.getElementById('is-r-inactive');
  if(_elTotal) _elTotal.textContent=arr.length;
  if(_elActive) _elActive.textContent=arr.filter(function(i){return !i.sfrагisi&&!i.anaklisi;}).length;
  if(_elInactive) _elInactive.textContent=arr.filter(function(i){return i.sfrагisi||i.anaklisi;}).length;
  document.getElementById('is-r-autopsia').textContent=arr.filter(function(i){return i.autopsia;}).length;

  // Πίνακας
  const tbody=document.getElementById('is-tbody');
  if(!tbody) return;
  if(!arr.length){
    tbody.innerHTML='<tr><td colspan="7" class="table-empty">Δεν βρέθηκαν εγκαταστάσεις</td></tr>';
    document.getElementById('is-count').textContent='';
    return;
  }
  tbody.innerHTML=arr.map(function(i){
    const inactive=i.sfrагisi||i.anaklisi;
    const rowClass2=inactive?'row-phase4 clickable':'clickable';
    const status=inactive?
      '<span style="color:#dc2626;font-weight:600">🔒 '+(i.sfrагisi?'Σφράγιση':'')+(i.sfrагisi&&i.anaklisi?'/':'')+(i.anaklisi?'Ανάκληση':'')+'</span>':
      '<span style="color:#16a34a">✅ Ενεργή</span>';
    const autoDate=i.autopsia?fmtDate(i.autopsia):'<span class="muted">—</span>';
    const autoStyle=i.autopsia&&new Date(i.autopsia)<twoYearsAgo?'color:#f97316;font-weight:600':'';
    const eq=equipment.find(function(e){return e.fak===i.fak;})||{};
    const equipBadges=[];
    if(eq.plyntirio) equipBadges.push('🚗 Πλυντήριο'+(eq.plyntirio_pros?' (Προσ.)':'')+(eq.anif_plyntirio?' + Αν.':''));
    if(eq.lipantirio) equipBadges.push('🛢 Λιπαντήριο'+(eq.anif_lipantirio?' + Αν.':''));
    if(eq.steg_freatia) equipBadges.push('Στεγ.Φρεάτια');
    if(eq.offset_filling) equipBadges.push('Offset');
    if(eq.auto_politis) equipBadges.push('Αυτ.Πωλητής');
    if(eq.lakkos) equipBadges.push('Λάκκος');
    return '<tr class="clickable" onclick="instStatsOpenInst(\''+esc(i.fak)+'\')" title="Κλικ → Επεξεργασία εγκατάστασης">'
      +'<td class="mono"><strong>'+esc(i.fak)+'</strong></td>'
      +'<td>'+esc(i.name)+'</td>'
      +'<td>'+esc(i.topothesia||'')+'</td>'
      +'<td style="font-size:11px">'+esc(i.type||'')+(i.subtype?' — '+esc(i.subtype):'')+'</td>'
      +'<td>'+status+'</td>'
      +'<td style="font-size:12px;'+autoStyle+'">'+autoDate+'</td>'
      +'<td style="font-size:11px;">'+esc(i.ypeuthinos||'—')+'</td>'
      +'<td style="font-size:11px;color:var(--text2)">'+equipBadges.join(' · ')+'</td>'
      +'</tr>';
  }).join('');
  document.getElementById('is-count').textContent=arr.length+' εγκαταστάσεις';
}

function isStatusAllChange(cb){
  if(cb.checked) document.querySelectorAll('#dd-is-status input:not([value="__all__"])').forEach(function(i){i.checked=false;});
  updateDdLabel('dd-is-status','dd-is-status-label','Όλες');
  renderInstStats();
}
function isStatusCbChange(){
  const any=document.querySelectorAll('#dd-is-status input:not([value="__all__"]):checked').length>0;
  document.getElementById('is-status-all').checked=!any;
  updateDdLabel('dd-is-status','dd-is-status-label','Όλες');
  renderInstStats();
}
function isEquipAllChange(cb){
  if(cb.checked) document.querySelectorAll('#dd-is-equip input:not([value="__all__"])').forEach(function(i){i.checked=false;});
  updateDdLabel('dd-is-equip','dd-is-equip-label','Όλες');
  renderInstStats();
}
function isEquipCbChange(){
  const any=document.querySelectorAll('#dd-is-equip input:not([value="__all__"]):checked').length>0;
  document.getElementById('is-equip-all').checked=!any;
  updateDdLabel('dd-is-equip','dd-is-equip-label','Όλες');
  renderInstStats();
}

function resetInstStats(){
  const el=document.getElementById('is-f-type'); if(el) el.value='';
  const el2=document.getElementById('is-f-autopsia'); if(el2) el2.value='';
  ['dd-is-topo','dd-is-status','dd-is-equip','dd-is-ypef'].forEach(function(id){
    const panel=document.getElementById(id);
    if(!panel) return;
    panel.querySelectorAll('input').forEach(function(i){i.checked=false;});
    const allCb=panel.querySelector('input[value="__all__"]');
    if(allCb) allCb.checked=true;
  });
  document.getElementById('dd-is-topo-label').textContent='Όλες';
  document.getElementById('dd-is-status-label').textContent='Όλες';
  document.getElementById('dd-is-equip-label').textContent='Όλες';
  const ypefLbl=document.getElementById('dd-is-ypef-label');
  if(ypefLbl) ypefLbl.textContent='Όλοι';
  renderInstStats();
}

function populateInstStatsFilters(){
  buildDdCheckboxes('dd-is-topo','dd-is-topo-label',
    [...new Set(installations.map(function(i){return i.topothesia;}).filter(Boolean))].sort(),
    'Όλες',renderInstStats);
  buildDdCheckboxes('dd-is-ypef','dd-is-ypef-label',
    [...new Set(installations.map(function(i){return i.ypeuthinos;}).filter(Boolean))].sort(),
    'Όλοι',renderInstStats);
}

// ══ ΕΚΤΥΠΩΣΗ ΑΝΑΦΟΡΑΣ ΕΓΚΑΤΑΣΤΑΣΗΣ ══
function printInstReport(fak){
  const inst=installations.find(function(i){return i.fak===fak;});
  if(!inst){toast('Εγκατάσταση δεν βρέθηκε','error');return;}
  const eq=equipment.find(function(e){return e.fak===fak;})||{};
  const today=new Date(); today.setHours(0,0,0,0);
  const fakCerts=certificates.filter(function(c){return c.fak===fak;}).sort(function(a,b){return (a.type||'').localeCompare(b.type||'');});

  function certStatusText(expiry){
    if(!expiry) return 'Αόριστης Διάρκειας';
    const d=new Date(expiry);
    if(d<today) return '❌ ΛΗΓΜΕΝΟ ('+fmtDate(expiry)+')';
    const days=Math.round((d-today)/(1000*60*60*24));
    if(days<=30) return '⚠️ Λήγει σε '+days+' ημ. ('+fmtDate(expiry)+')';
    return '✅ '+fmtDate(expiry);
  }

  const inactive=inst.sfrагisi||inst.anaklisi;
  const statusHtml=inactive?
    '<div style="background:#fee2e2;border:2px solid #ef4444;border-radius:6px;padding:10px;margin:12px 0;color:#991b1b;font-weight:600;font-size:14px">🔒 '
    +(inst.sfrагisi?'ΣΕ ΣΦΡΑΓΙΣΗ'+(inst.sfrагisi_ap?' — Αρ.Απόφ.: '+inst.sfrагisi_ap:''):'')
    +(inst.sfrагisi&&inst.anaklisi?' / ':'')
    +(inst.anaklisi?'ΣΕ ΑΝΑΚΛΗΣΗ ΑΛ'+(inst.anaklisi_ap?' — Αρ.Απόφ.: '+inst.anaklisi_ap:''):'')
    +'</div>':'';

  const equipList=[];
  if(eq.plyntirio) equipList.push('Πλυντήριο'+(eq.plyntirio_pros?' (Προσαρμοσμένο)':'')+(eq.plyntirio_auto?' (Αυτόματο)':'')+(eq.anif_plyntirio?' + Ανυψωτικό':''));
  if(eq.lipantirio) equipList.push('Λιπαντήριο'+(eq.anif_lipantirio?' + Ανυψωτικό':''));
  if(eq.artho25) equipList.push('⚡ ΑΡΘΡΟ 25');
  if(eq.stage2) equipList.push('Stage II');
  if(eq.artho27) equipList.push('Άρθρο 27');
  if(eq.pezodromiko) equipList.push('🚶 ΠΕΖΟΔΡΟΜΙΑΚΟ');
  if(eq.steg_freatia) equipList.push('Στεγανά Φρεάτια');
  if(eq.offset_filling) equipList.push('Offset Filling');
  if(eq.auto_politis) equipList.push('Αυτόματος Πωλητής');
  if(eq.lakkos) equipList.push('Λάκκος Επιθεώρησης');
  // Πρόσθετος εξοπλισμός (free text)
  if(eq.extra_equip&&eq.extra_equip.length){
    eq.extra_equip.forEach(function(e){if(e) equipList.push(e);});
  }

  const tanksHtml=(eq.tanks||[]).length?'<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr style="background:#f0f0f0"><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Αρ.Μητρώου</th><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Καύσιμο</th><th style="padding:4px 8px;text-align:right;border:1px solid #ddd">Λίτρα</th><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Ογκομετρητής</th></tr>'
    +(eq.tanks||[]).map(function(t){return '<tr><td style="padding:4px 8px;border:1px solid #ddd">'+esc(t.mitroo||'')+'</td><td style="padding:4px 8px;border:1px solid #ddd">'+esc(t.fuel||'')+'</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:right">'+(t.liters?Number(t.liters).toLocaleString('el-GR'):'—')+'</td><td style="padding:4px 8px;border:1px solid #ddd">'+esc(t.ogkom||'')+'</td></tr>';}).join('')
    +'</table>':'<em style="color:#666">Δεν έχουν καταχωρηθεί δεξαμενές</em>';

  const certsHtml=fakCerts.length?'<table style="width:100%;border-collapse:collapse;margin-top:6px"><tr style="background:#f0f0f0"><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Τύπος</th><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Αρ./Κωδ.</th><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Έκδοση</th><th style="padding:4px 8px;text-align:left;border:1px solid #ddd">Λήξη / Κατάσταση</th></tr>'
    +fakCerts.map(function(c){
      const expired=c.expiry&&new Date(c.expiry)<today;
      return '<tr style="'+(expired?'background:#fff5f5':'')+'"><td style="padding:4px 8px;border:1px solid #ddd">'+esc(c.type||'')+'</td><td style="padding:4px 8px;border:1px solid #ddd;font-family:monospace;font-size:11px">'+esc(c.num||'')+'</td><td style="padding:4px 8px;border:1px solid #ddd">'+fmtDate(c.issue_date)+'</td><td style="padding:4px 8px;border:1px solid #ddd">'+certStatusText(c.expiry)+'</td></tr>';
    }).join('')+'</table>':'<em style="color:#666">Δεν έχουν καταχωρηθεί πιστοποιητικά</em>';

  const win=window.open('','_blank','width=900,height=700');
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Αναφορά — '+fak+'</title>'
    +'<style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#000}'
    +'h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;background:#e8ecf0;padding:6px 10px;border-radius:4px;margin:16px 0 8px}'
    +'.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px}'
    +'.info-row{display:flex;gap:6px}.info-label{color:#555;min-width:130px}.info-val{font-weight:500}'
    +'.footer{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}'
    +'@media print{button{display:none!important}}'
    +'</style></head><body>');
  win.document.write('<div style="display:flex;justify-content:space-between;align-items:flex-start">');
  win.document.write('<div><h1>'+esc(fak)+' — '+esc(inst.name)+'</h1><div style="color:#555;font-size:11px">'+esc(inst.type||'')+(inst.subtype?' / '+esc(inst.subtype):'')+'</div></div>');
  win.document.write('<div style="text-align:right;font-size:10px;color:#888">Εκτυπώθηκε: '+new Date().toLocaleDateString('el-GR')+'<br>Τεχνικό Τμήμα Μεταφορών</div></div>');
  win.document.write(statusHtml);
  win.document.write('<h2>🏢 Στοιχεία Εγκατάστασης</h2><div class="info-grid">');
  [['ΑΦΜ',inst.afm],['Αρ. Άδειας',inst.adeia],['Διεύθυνση',inst.address],['Περιοχή',inst.topothesia],
   ['Τηλέφωνο',inst.tel],['Email',inst.email],['Υπεύθυνος',inst.ypeuthinos],['Βυτιοφόρο',inst.vytio],['Κατηγορία',inst.cat],
   ['Τελ. Αυτοψία',inst.autopsia?fmtDate(inst.autopsia):'—']
  ].forEach(function(r){if(r[1]) win.document.write('<div class="info-row"><span class="info-label">'+r[0]+':</span><span class="info-val">'+esc(r[1])+'</span></div>');});
  win.document.write('</div>');
  if(inst.notes) win.document.write('<div style="margin-top:8px;padding:6px;background:#f9f9f9;border-radius:4px;font-size:11px"><strong>Παρατηρήσεις:</strong> '+esc(inst.notes)+'</div>');
  win.document.write('<h2>🔧 Εξοπλισμός</h2>');
  const pumpsHtml2=(eq.pumps||[]).length?
    (eq.pumps.map(function(p,i){return (i+1)+'. '+[p.type,p.eidos,p.products,p.epistomia?p.epistomia+' επιστόμια':''].filter(Boolean).join(' — ');}).join('<br>'))
    :'<em style="color:#666">Δεν έχουν καταχωρηθεί αντλίες</em>';
  win.document.write('<div style="margin-bottom:8px"><strong>Αντλίες/Διανομείς:</strong><br>'+pumpsHtml2+'</div>');
  if(eq.fortistes) win.document.write('<div style="margin-bottom:6px"><strong>Φορτιστές ΗΕΟ:</strong> '+eq.fortistes+'</div>');
  if(equipList.length) win.document.write('<div style="margin-bottom:8px">'+equipList.map(function(e){
    var isSpecial=(e.indexOf('ΑΡΘΡΟ 25')>=0||e.indexOf('ΠΕΖΟΔΡΟΜΙΑΚΟ')>=0);
    var bg=isSpecial?'#fff3cd':'#f0f0f0';
    var fw=isSpecial?'bold':'normal';
    var border=isSpecial?'2px solid #e67e00':'none';
    return '<span style="background:'+bg+';padding:2px 8px;border-radius:3px;margin-right:4px;font-size:11px;font-weight:'+fw+';border:'+border+'">✓ '+e+'</span>';
  }).join('')+'</div>');
  win.document.write('<strong>Δεξαμενές:</strong>'+tanksHtml);
  win.document.write('<h2>📄 Πιστοποιητικά</h2>'+certsHtml);
  win.document.write('<div class="footer">© Τεχνικό Τμήμα Μεταφορών — ΠΕ Ανατολικής Αττικής — Μητρώο Πρατηρίων v6.0</div>');
  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},500);
}

// ── Διαλειτουργικότητα: από Στατιστικά Εγκ. → modal επεξεργασίας ──
function instStatsOpenInst(fak){
  closeAllModals();
  showView('inst');
  setTimeout(function(){ openInstModal(fak); }, 80);
}

