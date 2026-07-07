// ══ EQUIPMENT ══
function addPumpRow(type='',eidos='',products='',epistomia=''){
  const row=document.createElement('div');
  row.className='pump-row';
  row.style.cssText='display:grid;grid-template-columns:120px 130px 1fr 80px 32px;gap:6px;align-items:center';
  row.innerHTML=
    '<select class="form-control pump-type" style="font-size:12px">'
    +'<option value="">—</option>'
    +'<option value="Αντλία"'+(type==='Αντλία'?' selected':'')+'>Αντλία</option>'
    +'<option value="Διανομέας"'+(type==='Διανομέας'?' selected':'')+'>Διανομέας</option>'
    +'</select>'
    +'<select class="form-control pump-eidos" style="font-size:12px">'
    +'<option value="">—</option>'
    +['Μονή','Διδυμη','Τριδυμη','Τετραδυμη','Πενταδυμη'].map(function(e){return '<option'+(eidos===e?' selected':'')+'>'+e+'</option>';}).join('')
    +'</select>'
    +'<input class="form-control pump-products" placeholder="Προϊόντα π.χ. Αμ.95, Diesel" style="font-size:12px" value="'+esc(products)+'">'
    +'<input class="form-control pump-epistomia" type="number" min="0" placeholder="Επιστ." style="font-size:12px" value="'+esc(epistomia||'')+'">'
    +'<button type="button" class="btn-icon" onclick="this.closest(\'.pump-row\').remove()" title="Αφαίρεση">✕</button>';
  document.getElementById('ef-pumps-list').appendChild(row);
}

function addTankRow(fuel='',liters='',mitroo='',ogkom='',abolished=false,abolishedRef=''){
  const row=document.createElement('div');
  row.className='tank-row';
  row.style.cssText=`display:flex;gap:6px;align-items:center;flex-wrap:wrap;background:${abolished?'#f8fafc':'#f8f9fa'};padding:8px;border-radius:6px;border:1px solid #e2e8f0;${abolished?'opacity:0.65':''}`;
  row.innerHTML=
    `<input class="form-control tank-mitroo" placeholder="Αρ.Μητρώου" style="flex:2;min-width:160px${abolished?';text-decoration:line-through;color:var(--text3)':''}" value="${mitroo||''}" title="Μορφή: 12345678-Τ-39-12345">` +
    `<select class="form-control tank-fuel" style="flex:1;min-width:110px" onchange="checkCustomFuel(this);updateTankSummary()">` +
    `<option value="">— Καύσιμο —</option>` +
    FUEL_TYPES.map(f=>`<option${f===fuel?' selected':''}>${f}</option>`).join('') +
    `<option value="__custom__"${!FUEL_TYPES.includes(fuel)&&fuel?' selected':''}>Άλλο…</option>` +
    `</select>` +
    `<input class="form-control tank-fuel-custom" placeholder="Νέο καύσιμο" style="width:100px;display:${!FUEL_TYPES.includes(fuel)&&fuel?'block':'none'}" value="${!FUEL_TYPES.includes(fuel)&&fuel?fuel:''}" oninput="updateTankSummary()">` +
    `<input class="form-control tank-liters" type="number" min="0" step="0.01" placeholder="Λίτρα" style="width:90px" value="${liters||''}" oninput="updateTankSummary()">` +
    `<input class="form-control tank-ogkom" placeholder="Ογκομετρητής" style="width:120px" value="${ogkom||''}" title="Αρ. Ογκομετρητή">` +
    // Κατάργηση — inline
    `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:${abolished?'#dc2626':'var(--text3)'};white-space:nowrap" title="Κατηργήθηκε">` +
    `<input type="checkbox" class="tank-abolished" ${abolished?'checked':''} onchange="tankAbolishedToggle(this)" style="cursor:pointer">` +
    `<span>❌</span></label>` +
    `<input class="form-control tank-abolished-ref" placeholder="Αρ. Απόφ. κατάργησης" style="width:160px;display:${abolished?'':'none'}" value="${abolishedRef||''}" title="Αριθμός Απόφασης Κατάργησης">` +
    `<button type="button" class="btn-icon" onclick="this.closest('.tank-row').remove();updateTankSummary()" title="Αφαίρεση">✕</button>`;
  document.getElementById('ef-tanks-list').appendChild(row);
  updateTankSummary();
}

function tankAbolishedToggle(cb){
  const row=cb.closest('.tank-row');
  const refInp=row.querySelector('.tank-abolished-ref');
  const mitroo=row.querySelector('.tank-mitroo');
  const abolished=cb.checked;
  if(refInp) refInp.style.display=abolished?'':'none';
  row.style.opacity=abolished?'0.6':'1';
  row.style.background=abolished?'#f8fafc':'#f8f9fa';
  if(mitroo) mitroo.style.textDecoration=abolished?'line-through':'';
  if(mitroo) mitroo.style.color=abolished?'var(--text3)':'';
  cb.closest('label').style.color=abolished?'#dc2626':'var(--text3)';
  updateTankSummary();
}


function updateTankSummary(){
  const summary=document.getElementById('ef-tank-summary');
  if(!summary)return;
  // Συλλογή δεδομένων από τις γραμμές
  const rows=[...document.querySelectorAll('.tank-row')];
  const totals={};
  rows.forEach(function(row){
    // Εξαιρούμε κατηργημένες δεξαμενές από τον υπολογισμό
    const abolishedCb=row.querySelector('.tank-abolished');
    if(abolishedCb&&abolishedCb.checked) return;
    const sel=row.querySelector('.tank-fuel');
    const custom=row.querySelector('.tank-fuel-custom');
    const fuel=sel&&sel.value==='__custom__'?(custom?custom.value.trim():''):(sel?sel.value:'');
    const liters=parseFloat((row.querySelector('.tank-liters').value||'').replace(',','.'))||0;
    if(fuel&&liters>0) totals[fuel]=(totals[fuel]||0)+liters;
  });
  // Ομαδοποίηση ανά κατηγορία
  const catTotals={};
  const catColors={'Βενζίνες':'#dbeafe','Πετρέλαια':'#fef9c3','Αέρια':'#dcfce7'};
  const catBorders={'Βενζίνες':'#93c5fd','Πετρέλαια':'#fde68a','Αέρια':'#86efac'};
  Object.entries(totals).forEach(function(e){
    const fuel=e[0],lt=e[1];
    let cat='Λοιπά';
    Object.entries(FUEL_CATEGORIES).forEach(function(ce){
      if(ce[1].includes(fuel)) cat=ce[0];
    });
    if(!catTotals[cat]) catTotals[cat]={total:0,fuels:{}};
    catTotals[cat].total+=lt;
    catTotals[cat].fuels[fuel]=(catTotals[cat].fuels[fuel]||0)+lt;
  });
  if(!Object.keys(catTotals).length){summary.innerHTML='';return;}
  summary.innerHTML=Object.entries(catTotals).map(function(e){
    const cat=e[0],data=e[1];
    const bg=catColors[cat]||'#f1f5f9';
    const border=catBorders[cat]||'#cbd5e1';
    const details=Object.entries(data.fuels).map(function(fe){
      return `<span style="font-size:10px;color:#475569">${fe[0]}: ${fe[1].toLocaleString('el-GR',{maximumFractionDigits:0})}L</span>`;
    }).join(' · ');
    return `<div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:6px 12px">`
      +`<div style="font-size:11px;font-weight:700;color:#1e293b">${cat}</div>`
      +`<div style="font-size:13px;font-weight:700;color:#0f172a">${data.total.toLocaleString('el-GR',{maximumFractionDigits:0})} L</div>`
      +`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:2px">${details}</div>`
      +`</div>`;
  }).join('');
}
function checkCustomFuel(sel){
  const row=sel.closest('.tank-row');
  if(!row)return;
  const customInp=row.querySelector('.tank-fuel-custom');
  if(!customInp)return;
  if(sel.value==='__custom__'){
    customInp.style.display='block';
    customInp.focus();
  } else {
    customInp.style.display='none';
    customInp.value='';
  }
}

function addExtraEquip(val=''){
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:6px;align-items:center';
  row.innerHTML=`<input class="form-control extra-equip-inp" placeholder="Περιγραφή εξοπλισμού" value="${val}" style="flex:1">`+
    `<button type="button" class="btn-icon" onclick="this.closest('div').remove()" title="Αφαίρεση">✕</button>`;
  document.getElementById('ef-extra-list').appendChild(row);
}
function toggleAnifotiko(type){
  const cb=document.getElementById('ef-'+type);
  const row=document.getElementById('row-anif-'+type);
  if(row)row.style.display=cb&&cb.checked?'':'none';
}
function renderEquip(){
  const q=(document.getElementById('equip-search')||{value:''}).value.toLowerCase();
  let arr=[...equipment];
  if(q) arr=arr.filter(e=>(e.fak||'').toLowerCase().includes(q));
  arr.sort((a,b)=>(a.fak||'').localeCompare(b.fak||''));
  const tbody=document.getElementById('equip-tbody');
  if(!tbody)return;
  if(!arr.length){tbody.innerHTML=`<tr><td colspan="7" class="table-empty">Δεν βρέθηκαν εγγραφές εξοπλισμού</td></tr>`;document.getElementById('equip-count').textContent='';return;}

  // Helper: map fuel name to a CSS class slug (Greek-safe)
  const fuelClass=f=>{
    const s=String(f||'').trim();
    if(/^DΘ$|^DTH$|Diesel|Πετρ/i.test(s)) return 'f-DTH';
    if(/^U95\b|^Unleaded\s*95|^Β95|^95\b/i.test(s)) return 'f-U95';
    if(/^U98\b|^98\b|Premium/i.test(s)) return 'f-U98';
    if(/^Dk\b|Kero|Κηρ/i.test(s)) return 'f-Dk';
    if(/LPG|Υγρ/i.test(s)) return 'f-LPG';
    if(/CNG|Φυσ/i.test(s)) return 'f-CNG';
    return '';
  };
  const fmtL=n=>Number(n||0).toLocaleString('el-GR',{maximumFractionDigits:0});

  tbody.innerHTML=arr.map(e=>{
    // ── ΑΝΤΛΙΕΣ: count + breakdown pills ─────────────────────────
    const pumps=e.pumps||[];
    let pumpsCell='<span class="eq-empty">—</span>';
    if(pumps.length){
      const byType={};
      pumps.forEach(p=>{
        const k=[p.type,p.eidos].filter(Boolean).join(' ').trim()||'—';
        byType[k]=(byType[k]||0)+1;
      });
      const pills=Object.entries(byType)
        .map(([k,n])=>`<span class="eq-pill">${n}× ${esc(k)}</span>`).join('');
      pumpsCell=`<div class="eq-cell">
        <div class="eq-cell-head"><span class="eq-count">${pumps.length}</span> ${pumps.length===1?'αντλία':'αντλίες'}</div>
        <div class="eq-pills">${pills}</div>
      </div>`;
    } else if(e.antlies){
      pumpsCell=`<div class="eq-cell"><div class="eq-cell-head"><span class="eq-count">${esc(e.antlies)}</span></div></div>`;
    }

    // ── ΔΕΞΑΜΕΝΕΣ: count + total + fuel pills ────────────────────
    const tanks=e.tanks||[];
    let tanksCell='<span class="eq-empty">—</span>';
    if(tanks.length){
      const activeTanks=tanks.filter(t=>!t.abolished);
      const abolishedTanks=tanks.filter(t=>t.abolished);
      const fuelAgg={};
      activeTanks.forEach(t=>{
        const f=t.fuel||'?';
        if(!fuelAgg[f]) fuelAgg[f]={liters:0,count:0};
        fuelAgg[f].liters+=Number(t.liters||0);
        fuelAgg[f].count++;
      });
      const grand=Object.values(fuelAgg).reduce((s,v)=>s+v.liters,0);
      const pills=Object.entries(fuelAgg)
        .sort((a,b)=>b[1].liters-a[1].liters)
        .map(([f,v])=>`<span class="eq-pill ${fuelClass(f)}" title="${v.count} δεξ.">${esc(f)} <strong>${fmtL(v.liters)}L</strong></span>`)
        .join('');
      const abolBadge=abolishedTanks.length
        ?`<span style="font-size:10px;color:#dc2626;margin-left:4px" title="${abolishedTanks.map(t=>t.mitroo||'').join(', ')}">❌ ${abolishedTanks.length} κατηργ.</span>`:'';
      tanksCell=`<div class="eq-cell">
        <div class="eq-cell-head"><span class="eq-count">${activeTanks.length}</span> ενεργές · <span style="color:#475569;font-weight:500">${fmtL(grand)} L</span>${abolBadge}</div>
        <div class="eq-pills">${pills}</div>
      </div>`;
    }

    // ── ΔΙΑΝ. LPG/CNG ────────────────────────────────────────────
    const dianCount=(e.pumps||[]).filter(p=>p.type==='Διανομέας').length || e.dian_lpg_cng || 0;
    const dianCell=dianCount
      ? `<div class="eq-num">${esc(dianCount)}</div>`
      : '<span class="eq-empty">—</span>';

    // ── ΗΕΟ (φορτιστές) ──────────────────────────────────────────
    const heoCell=e.fortistes
      ? `<div class="eq-num">${esc(e.fortistes)}</div>`+
        (e.fortistes_theseis?`<div class="eq-num-sub">${esc(e.fortistes_theseis)} θέσ.</div>`:'')+
        (e.fortistes_ischys?`<div class="eq-num-sub">${esc(e.fortistes_ischys)} kW</div>`:'')
      : '<span class="eq-empty">—</span>';

    // ── ΕΞΤΡΑ ───────────────────────────────────────────────────
    const extras=[];
    if(e.plyntirio) extras.push('Πλυντ.'+(e.anif_plyntirio?' ↑':''));
    if(e.lipantirio) extras.push('Λιπαντ.'+(e.anif_lipantirio?' ↑':''));
    if(e.artho25) extras.push('Αρ.25');
    if(e.artho27) extras.push('Αρ.27');
    if(e.stage2) extras.push('Stage II');
    if(e.pezodromiko) extras.push('Πεζοδρ.');
    if(e.steg_freatia) extras.push('Στεγ.Φρ.');
    if(e.offset_filling) extras.push('Offset');
    if(e.auto_politis) extras.push('Αυτ.Πωλ.');
    if(e.lakkos) extras.push('Λάκκος');
    (e.extra_equip||[]).forEach(x=>{ if(x) extras.push(x); });
    const extraCell=extras.length
      ? `<div class="eq-pills">${extras.map(x=>`<span class="eq-pill">${esc(x)}</span>`).join('')}</div>`
      : '<span class="eq-empty">—</span>';

    return `<tr class="clickable" onclick="openEquipModal('${esc(e.fak)}')" title="Κλικ για επεξεργασία">
      <td class="mono"><strong>${esc(e.fak)}</strong> <button class="btn-icon" style="font-size:11px;padding:1px 4px;color:var(--primary);opacity:.7" onclick="event.stopPropagation();navToInst('${esc(e.fak)}')" title="Άνοιγμα εγκατάστασης">🏢</button></td>
      <td>${pumpsCell}</td>
      <td>${tanksCell}</td>
      <td style="text-align:center">${dianCell}</td>
      <td style="text-align:center">${heoCell}</td>
      <td>${extraCell}</td>
      <td class="actions" onclick="event.stopPropagation()" style="white-space:nowrap;text-align:right">
        <button class="btn-icon" onclick="openEquipModal('${esc(e.fak)}')" title="Επεξεργασία">✏️</button>
        <button class="btn-icon" onclick="confirmDelete('Διαγραφή εξοπλισμού «${esc(e.fak)}»;',()=>deleteEquip('${esc(e.fak)}'))" title="Διαγραφή">🗑</button>
      </td>
    </tr>`;
  }).join('');

  // Σύνολα λίτρων ανά καύσιμο
  const fuelTotals={};
  equipment.forEach(e=>{
    (e.tanks||[]).forEach(t=>{
      if(!t.fuel||!t.liters) return;
      fuelTotals[t.fuel]=(fuelTotals[t.fuel]||0)+Number(t.liters);
    });
  });
  const fuelHtml=Object.entries(fuelTotals).sort((a,b)=>b[1]-a[1]).map(([f,l])=>
    `<span style="margin-right:12px"><strong>${esc(f)}:</strong> ${l.toLocaleString('el-GR',{maximumFractionDigits:0})} L</span>`
  ).join('');
  document.getElementById('equip-count').innerHTML=
    `${arr.length} εγγραφές`+
    (fuelHtml?`<span style="margin-left:16px;color:var(--text3)">|</span> <span style="font-size:12px;color:var(--text2)">Σύνολα: ${fuelHtml}</span>`:'');
}
function openEquipModal(fak=null){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  closeAllAcLists();
  try{
  editEquipId=fak;
  const eq=fak?equipment.find(e=>e.fak===fak)||{}:{};
  document.getElementById('modal-equip-title').textContent=fak?'Επεξεργασία Εξοπλισμού':'Νέα Εγγραφή Εξοπλισμού';
  const fakSel=document.getElementById('ef-fak');
  const fakInp=document.getElementById('ef-fak');
  fakInp.value=fak||'';
  fakInp.disabled=!!fak;
  document.getElementById('ef-fak-edit').value=fak||'';
  const f=n=>document.getElementById(n);
  // Αντλίες
  const pumpsList=document.getElementById('ef-pumps-list');
  pumpsList.innerHTML='';
  const pumps=eq.pumps||[];
  if(pumps.length) pumps.forEach(p=>addPumpRow(p.type,p.eidos,p.products,p.epistomia));
  else addPumpRow();
  f('ef-fortistes').value=eq.fortistes||'';
  // Load fortistes_theseis and ischys (may be missing in older records)
  const ftSel=document.getElementById('ef-fortistes-theseis');
  if(ftSel) ftSel.value=eq.fortistes_theseis||'';
  const fiSel=document.getElementById('ef-fortistes-ischys');
  if(fiSel) fiSel.value=eq.fortistes_ischys||'';
  f('ef-lipantirio').checked=!!eq.lipantirio;
  f('ef-anif-plyntirio').checked=!!eq.anif_plyntirio;
  f('ef-anif-lipantirio').checked=!!eq.anif_lipantirio;
  toggleAnifotiko('plyntirio');toggleAnifotiko('lipantirio');
  f('ef-a25').checked=!!eq.artho25;
  if(f('ef-stage2')) f('ef-stage2').checked=!!eq.stage2;
  f('ef-a27').checked=!!eq.artho27;
  if(f('ef-pezodromiko')) f('ef-pezodromiko').checked=!!eq.pezodromiko;
  f('ef-plyntirio-pros').checked=!!eq.plyntirio_pros;
  f('ef-steg-freatia').checked=!!eq.steg_freatia;
  f('ef-offset-filling').checked=!!eq.offset_filling;
  f('ef-auto-politis').checked=!!eq.auto_politis;
  f('ef-lakkos').checked=!!eq.lakkos;
  f('ef-notes').value=eq.notes||'';
  const tanksList=document.getElementById('ef-tanks-list');
  tanksList.innerHTML='';
  const tanks=eq.tanks||[];
  if(tanks.length)tanks.forEach(t=>addTankRow(t.fuel,t.liters,t.mitroo||'',t.ogkom||'',t.abolished||false,t.abolished_ref||''));
  else addTankRow();
  updateTankSummary();
  const extraList=document.getElementById('ef-extra-list');
  extraList.innerHTML='';
  (eq.extra_equip||[]).forEach(e=>addExtraEquip(e));
  // Conditional sections βάσει τύπου εγκατάστασης
  const inst = installations.find(i=>i.fak===fak)||{};
  const instType = inst.type||'';
  const showIkteo = instType==='ΙΚΤΕΟ';
  const showAnypt = ['Συνεργείο','Πλυντήριο','Λιπαντήριο'].includes(instType);
  const ikteoSec = document.getElementById('eq-ikteo-section');
  const anyptSec = document.getElementById('eq-anyptotika-section');
  if(ikteoSec) ikteoSec.style.display = showIkteo ? 'block' : 'none';
  if(anyptSec) anyptSec.style.display = showAnypt ? 'block' : 'none';
  // Φόρτωση διαδρόμων ΙΚΤΕΟ
  if(showIkteo){
    const dList = document.getElementById('ef-diadromoi-list');
    if(dList){ dList.innerHTML=''; (eq.diadromoi||[]).forEach(d=>addDiadromos(d)); }
  }
  // Φόρτωση ανυψωτικών
  if(showAnypt){
    const aList = document.getElementById('ef-anyptotika-list');
    if(aList){ aList.innerHTML=''; (eq.anyptotika||[]).forEach(a=>addAnyptotiko(a)); }
    const elYp = document.getElementById('ef-elaiod-yparksi');
    const elEn = document.getElementById('ef-elaiod-en858');
    if(elYp) elYp.value = eq.elaiod_yparksi||'';
    if(elEn) elEn.value = eq.elaiod_en858||'';
    toggleElaiodEN858();
  }
  openModal('modal-equip');
  qnavShow('equip',fak);
  }catch(e){console.error('openEquipModal error:',e);toast('Σφάλμα: '+e.message,'error');}
}

// ══ ΙΚΤΕΟ: Διαδρομοί ══
function addDiadromos(d=null){
  const cont=document.getElementById('ef-diadromoi-list');
  if(!cont) return;
  const idx=cont.children.length+1;
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:8px;align-items:center;padding:6px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius)';
  row.innerHTML=`<span style="font-size:11px;color:var(--text3);min-width:20px">${idx}.</span>
    <select class="form-control" style="flex:1">
      <option value="">Τύπος Διαδρόμου</option>
      <option ${d&&d.tipos==='Βαρέων'?'selected':''}>Βαρέων Οχημάτων</option>
      <option ${d&&d.tipos==='Ελαφρών'?'selected':''}>Ελαφρών Οχημάτων</option>
      <option ${d&&d.tipos==='Μοτο'?'selected':''}>Μοτοσυκλετών</option>
      <option ${d&&d.tipos==='Quad'?'selected':''}>Quad</option>
    </select>
    <input class="form-control" style="flex:1" placeholder="Αρ. / Κωδ. Διαδρόμου" value="${d?.kodikos||''}">
    <button type="button" class="btn-icon" onclick="this.closest('div').remove();renumberRows('ef-diadromoi-list')">🗑</button>`;
  cont.appendChild(row);
}

// ══ Ανυψωτικά ══
function addAnyptotiko(a=null){
  const cont=document.getElementById('ef-anyptotika-list');
  if(!cont) return;
  const idx=cont.children.length+1;
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:8px;align-items:center;padding:6px;background:#f8fafc;border:1px solid var(--border);border-radius:var(--radius)';
  row.innerHTML=`<span style="font-size:11px;color:var(--text3);min-width:20px">${idx}.</span>
    <select class="form-control" style="flex:1">
      <option value="">Τύπος Ανυψωτικού</option>
      <option ${a&&a.tipos==='Δικόλωνο'?'selected':''}>Δικόλωνο</option>
      <option ${a&&a.tipos==='Τετρακόλωνο'?'selected':''}>Τετρακόλωνο</option>
      <option ${a&&a.tipos==='Ψαλιδωτό'?'selected':''}>Ψαλιδωτό</option>
    </select>
    <input class="form-control" style="flex:0 0 80px" type="number" min="1" placeholder="Αρ." value="${a?.arithmos||'1'}">
    <button type="button" class="btn-icon" onclick="this.closest('div').remove();renumberRows('ef-anyptotika-list')">🗑</button>`;
  cont.appendChild(row);
}

function renumberRows(listId){
  const cont=document.getElementById(listId);
  if(!cont) return;
  Array.from(cont.children).forEach((row,i)=>{
    const num=row.querySelector('span');
    if(num) num.textContent=(i+1)+'.';
  });
}

function toggleElaiodEN858(){
  const val=(document.getElementById('ef-elaiod-yparksi')||{value:''}).value;
  const wrap=document.getElementById('ef-elaiod-en858-wrap');
  if(wrap) wrap.style.display=val==='yes'?'flex':'none';
}

// Συλλογή δεδομένων ανυψωτικών/διαδρόμων για saveEquip
function collectDiadromoi(){
  const cont=document.getElementById('ef-diadromoi-list');
  if(!cont) return [];
  return Array.from(cont.children).map(row=>{
    const sels=row.querySelectorAll('select,input');
    return {tipos:sels[0]?.value||'', kodikos:sels[1]?.value||''};
  }).filter(d=>d.tipos);
}

function collectAnyptotika(){
  const cont=document.getElementById('ef-anyptotika-list');
  if(!cont) return [];
  return Array.from(cont.children).map(row=>{
    const sels=row.querySelectorAll('select,input');
    return {tipos:sels[0]?.value||'', arithmos:parseInt(sels[1]?.value)||1};
  }).filter(a=>a.tipos);
}

function saveEquip(){
  const fak=editEquipId||document.getElementById('ef-fak').value;
  if(!fak){toast('Επιλέξτε ΦΑΚ','error');return;}
  const f=n=>document.getElementById(n);
  // Collect tanks
  const tanks=[...document.querySelectorAll('.tank-row')].map(row=>{
    const fuelSel=row.querySelector('.tank-fuel');
    const fuelCustom=row.querySelector('.tank-fuel-custom');
    const fuelVal=fuelSel&&fuelSel.value==='__custom__'?(fuelCustom?fuelCustom.value.trim():''):( fuelSel?fuelSel.value.trim():'');
    const ogkomEl=row.querySelector('.tank-ogkom');
    const abolishedCb=row.querySelector('.tank-abolished');
    const abolishedRefEl=row.querySelector('.tank-abolished-ref');
    return {
      mitroo:row.querySelector('.tank-mitroo').value.trim(),
      fuel:fuelVal,
      liters:parseFloat((row.querySelector('.tank-liters').value||'').replace(',','.'))||0,
      ogkom:ogkomEl?ogkomEl.value.trim():'',
      abolished:!!(abolishedCb&&abolishedCb.checked),
      abolished_ref:abolishedRefEl?abolishedRefEl.value.trim():''
    };
  }).filter(t=>t.fuel||t.liters||t.mitroo);
  // Collect extra equipment
  const extra_equip=[...document.querySelectorAll('.extra-equip-inp')].map(i=>i.value.trim()).filter(Boolean);
  const obj={
    fak,
    pumps:[...document.querySelectorAll('.pump-row')].map(function(row){
      return {
        type:row.querySelector('.pump-type').value,
        eidos:row.querySelector('.pump-eidos').value,
        products:row.querySelector('.pump-products').value.trim(),
        epistomia:row.querySelector('.pump-epistomia').value
      };
    }).filter(function(p){return p.type||p.products;}),
    fortistes:f('ef-fortistes').value,
    fortistes_theseis:f('ef-fortistes-theseis').value,
    fortistes_ischys:f('ef-fortistes-ischys')?f('ef-fortistes-ischys').value:'',
    tanks,extra_equip,
    plyntirio:f('ef-plyntirio').checked,anif_plyntirio:f('ef-anif-plyntirio').checked,
    plyntirio_pros:f('ef-plyntirio-pros').checked,
    plyntirio_auto:f('ef-plyntirio-auto').checked,
    lipantirio:f('ef-lipantirio').checked,anif_lipantirio:f('ef-anif-lipantirio').checked,
    artho25:f('ef-a25').checked,stage2:f('ef-stage2')?f('ef-stage2').checked:false,artho27:f('ef-a27').checked,pezodromiko:f('ef-pezodromiko')?f('ef-pezodromiko').checked:false,
    steg_freatia:f('ef-steg-freatia').checked,
    offset_filling:f('ef-offset-filling').checked,
    auto_politis:f('ef-auto-politis').checked,
    lakkos:f('ef-lakkos').checked,
    notes:f('ef-notes').value.trim(),
    // Νέα πεδία
    diadromoi:collectDiadromoi(),
    anyptotika:collectAnyptotika(),
    elaiod_yparksi:(document.getElementById('ef-elaiod-yparksi')||{value:''}).value,
    elaiod_en858:(document.getElementById('ef-elaiod-en858')||{value:''}).value
  };
  const idx=equipment.findIndex(e=>e.fak===fak);
  if(idx>=0)equipment[idx]=obj;
  else equipment.push(obj);
  save('equip',equipment);
  closeModal('modal-equip');
  toast('✓ Εξοπλισμός αποθηκεύτηκε','success');
  try{ updateBadges(); renderEquip(); }catch(e){ console.warn('renderEquip:',e); }
}
function deleteEquip(fak){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  equipment=equipment.filter(e=>e.fak!==fak);
  save('equip',equipment);
  try{ updateBadges();renderEquip(); }catch(e){}
  toast('🗑 Εξοπλισμός «'+fak+'» διαγράφηκε','info');
}

// ══ SORT ══
function sortTbl(tbl,col){
  const s=sortState[tbl];
  s.dir=(s.col===col)?-s.dir:1;
  s.col=col;
  document.querySelectorAll(`[id^="sa-${tbl}-"]`).forEach(el=>{el.textContent='↕';el.classList.remove('active');});
  const el=document.getElementById(`sa-${tbl}-${col}`);
  if(el){el.textContent=s.dir===1?'↑':'↓';el.classList.add('active');}
  if(tbl==='inst')renderInst();
  else if(tbl==='proto')renderProto();
  else if(tbl==='certs')renderCerts();
}

// ══ MODAL helpers ══
function openModal(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.add('open');
  el.style.display='flex';
}
function closeModal(id){
  const el=document.getElementById(id);
  if(!el) return;
  el.classList.remove('open');
  el.style.display='none';
}
// Κλείνει ΟΛΕΣ τις ac-list dropdowns — καλείται πάντα πριν ανοίξει modal
// ── Debounce: αποτρέπει πολλαπλά renders ανά keystroke ──────────────
const _db={};
function debounce(key,fn,delay){
  clearTimeout(_db[key]);
  _db[key]=setTimeout(fn, delay||200);
}
function debouncedRenderInst(){ debounce('inst',renderInst); }
function debouncedRenderProto(){ debounce('proto',renderProto); }
function debouncedRenderCerts(){ debounce('certs',renderCerts); }
function debouncedRenderEquip(){ debounce('equip',renderEquip); }
// ────────────────────────────────────────────────────────────────────

function closeAllAcLists(){
  document.querySelectorAll('.ac-list').forEach(function(l){l.classList.remove('show');});
}
function confirmDelete(msg,fn){
  document.getElementById('confirm-msg').textContent=msg;
  document.getElementById('confirm-ok').onclick=function(){ closeModal('modal-confirm'); fn(); };
  openModal('modal-confirm');
}
// Close modal on overlay click — με mousedown tracking ώστε το drag
// επιλογής κειμένου από μέσα προς τα έξω να ΜΗΝ κλείνει το modal
let _mdownTarget=null;
document.addEventListener('mousedown',function(e){ _mdownTarget=e.target; });
document.addEventListener('click',function(e){
  if(e.target.classList.contains('modal-overlay')){
    // Κλείσε ΜΟΝΟ αν και το mousedown έγινε στο overlay (πραγματικό εξωτερικό click)
    // — όχι αν ο χρήστης έκανε drag selection από πεδίο προς τα έξω
    if(_mdownTarget && _mdownTarget.classList.contains('modal-overlay')){
      closeModal(e.target.id);
    }
  }
  _mdownTarget=null;
});

// ══ AUTOCOMPLETE ══
function acFak(inp){
  const q=inp.value.toLowerCase();
  const list=document.getElementById('ac-fak');
  const sorted=[...installations].sort((a,b)=>a.fak.localeCompare(b.fak));
  // Always show all if empty, filter if typing
  const matches=q?sorted.filter(i=>(i.fak+' '+i.name).toLowerCase().includes(q)):sorted;
  if(!matches.length){list.innerHTML=`<div class="ac-item muted" style="color:var(--text3);cursor:default">Νέος ΦΑΚ – θα δημιουργηθεί</div>`;list.classList.add('show');return;}
  list.innerHTML=matches.map(i=>`<div class="ac-item" onclick="selectFak('${esc(i.fak)}','${esc(i.name)}','${esc(i.sheet)}')">${esc(i.fak)} – <span style='color:var(--text2)'>${esc(i.name)}</span></div>`).join('')+
    (q&&!sorted.find(i=>i.fak.toLowerCase()===q)?`<div class="ac-item" style="border-top:1px solid var(--border);color:var(--accent);font-style:italic" onclick="document.getElementById('pf-fak').value=document.getElementById('pf-fak').value;document.getElementById('ac-fak').classList.remove('show')">✚ Νέος ΦΑΚ «${esc(inp.value)}»</div>`:'');
  list.classList.add('show');
}
function selectFak(fak,name,sheet){
  document.getElementById('pf-fak').value=fak;
  document.getElementById('ac-fak').classList.remove('show');
  if(document.getElementById('pf-sheet')&&sheet)document.getElementById('pf-sheet').value=sheet;
  if(document.getElementById('pf-aition')&&!document.getElementById('pf-aition').value)document.getElementById('pf-aition').value=name;
}
function acAition(inp){
  // Merge aitions_list + installations names for autocomplete
  const instNames=installations.map(i=>i.name).filter(Boolean);
  const merged=[...new Set([...aitions_list,...instNames])].sort();
  acList(inp,'pf-aition','ac-aition',merged);
}
function acList(inp,inpId,listId,arr){
  const q=inp.value.toLowerCase();
  const list=document.getElementById(listId);
  const matches=q?arr.filter(v=>v.toLowerCase().includes(q)):arr;
  if(!matches.length){list.classList.remove('show');return;}
  list.innerHTML=matches.map(v=>`<div class="ac-item" onclick="selectAc('${esc(v)}','${inpId}','${listId}')">${esc(v)}</div>`).join('');
  list.classList.add('show');
}
function selectAc(val,inpId,listId){
  document.getElementById(inpId).value=val;
  document.getElementById(listId).classList.remove('show');
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.ac-wrap'))document.querySelectorAll('.ac-list').forEach(l=>l.classList.remove('show'));
});

// ══ FILE LINK HELPER ══
function setFileLink(input,targetId){
  const file=input.files[0];
  if(!file)return;
  const url=URL.createObjectURL(file);
  document.getElementById(targetId).value=url;
  // Σήμανση ότι είναι προσωρινό blob
  const el=document.getElementById(targetId);
  if(el) el.style.borderColor='#f97316';
  toast('📎 "'+file.name+'" — ⚠️ Προσωρινό link (χάνεται μετά το κλείσιμο). Για μόνιμο: χρησιμοποίησε OneDrive sharing link','info');
}

function setKmlLink(input,targetId){
  const file=input.files[0];
  if(!file)return;
  const url=URL.createObjectURL(file);
  const el=document.getElementById(targetId);
  if(el){
    el.value=url;
    el.style.borderColor='#f97316';
  }
  toast('🗺 "'+file.name+'" — ⚠️ Προσωρινό link (χάνεται μετά το κλείσιμο). Για μόνιμο: χρησιμοποίησε OneDrive sharing link','info');
}

function openCoordsMap(){
  const coords=document.getElementById('if-coords').value.trim();
  if(!coords){toast('Εισάγετε πρώτα συντεταγμένες','error');return;}
  const name=document.getElementById('if-fak').value||'Εγκατάσταση';
  openInstMap(coords,name);
}

function openInstMap(coords,name){
  const clean=coords.replace(/\s/g,'');
  const parts=clean.split(',');
  if(parts.length<2){toast('Μη έγκυρες συντεταγμένες — format: 37.9234, 23.7891','error');return;}
  const lat=parseFloat(parts[0]);
  const lng=parseFloat(parts[1]);
  if(isNaN(lat)||isNaN(lng)){toast('Μη έγκυρες συντεταγμένες','error');return;}
  const url='https://www.google.com/maps/search/?api=1&query='+lat+','+lng+'&query_place_id='+encodeURIComponent(name||'');
  window.open(url,'_blank');
}

function openKmlLink(el){
  const path=typeof el==='string'?el:(el.getAttribute?el.getAttribute('data-path'):'');
  const clean=(path||'').replace(/^["']+|["']+$/g,'').trim();
  if(!clean)return;

  // Blob URL — άνοιγμα απευθείας (προσωρινό)
  if(clean.startsWith('blob:')){
    window.open(clean,'_blank');
    return;
  }
  // SharePoint/OneDrive URL → Google Maps
  if(clean.startsWith('http')){
    const googleMapsUrl=toGoogleMapsKml(clean);
    window.open(googleMapsUrl,'_blank');
    return;
  }
  // Local path — αντιγραφή clipboard
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(clean).then(function(){
      toast('Διαδρομή αντιγράφηκε! Επικόλλησε στον Explorer (Ctrl+L)','success');
    });
  } else {
    const ta=document.createElement('textarea');
    ta.value=clean;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');toast('Διαδρομή αντιγράφηκε!','success');}
    catch(e){alert('Διαδρομή: '+clean);}
    document.body.removeChild(ta);
  }
}

function toGoogleMapsKml(url){
  // Μετατροπή SharePoint/OneDrive URL σε direct download link
  let directUrl=url;
  // SharePoint business: .../onedrive.aspx?id=PATH → download.aspx?SourceUrl=PATH
  const spMatch=url.match(/sharepoint\.com(.+?)\/onedrive\.aspx\?id=([^&]+)/);
  if(spMatch){
    const base=url.split('/onedrive.aspx')[0];
    const filePath=decodeURIComponent(spMatch[2]);
    directUrl=base+'/_layouts/download.aspx?SourceUrl='+encodeURIComponent(filePath);
  }
  // OneDrive personal: 1drv.ms ή onedrive.live.com
  // Αυτά δεν μπορούν να μετατραπούν εύκολα — ανοίγουμε κατευθείαν
  return 'https://www.google.com/maps?q='+encodeURIComponent(directUrl);
}

// ══ EXPORT CSV ══
function exportInstCSV(){
  const rows=[['ΦΑΚ','Επωνυμία','ΑΦΜ','Άδεια','Διεύθυνση','Περιοχή','Τηλ','Email','Κατηγορία','Τύπος','Υποτύπος','Παρατηρήσεις']];
  getInstFiltered().forEach(i=>rows.push([i.fak,i.name,i.afm,i.adeia,i.address,i.topothesia,i.tel,i.email,i.cat,i.type,i.subtype,i.notes]));
  dlCSV(rows,'egkatastaseis.csv');
}
function exportProtoCSV(){
  const rows=[['ΦΑΚ','Αιτών','Αίτημα','Αρ.Εισ.','Ημ.Χρέωσης','Μηχ/κός','Ημ.Εξ.','Αρ.Εξ.','Τελικό','Παρατηρήσεις']];
  getProtoFiltered().forEach(p=>rows.push([p.fak,p.aition,p.aitima,p.proto_eisx,p.hm_xreosis,p.mixanikos,p.hm_exerx,p.proto_exerx,p.teliko,p.notes]));
  dlCSV(rows,'protokollo.csv');
}
function dlCSV(rows,fn){
  const bom='\uFEFF';
  const csv=bom+rows.map(r=>r.map(c=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=fn;a.click();
}

