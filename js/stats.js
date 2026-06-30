// ══ DASHBOARD ══
function renderDash(){
  // Guest: κρύψε πρωτόκολλο στην αρχική
  if(_serverRole==='guest'){
    ['s-proto','s-done','s-phase2','s-pending'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.textContent='—';
    });
    var sec=document.getElementById('dash-proto-section');
    if(sec) sec.style.display='none';
    return; // Μην συνεχίσεις τη renderDash
  }
  updateBadges();
  if(typeof protoCheckReminders==='function') protoCheckReminders();
  const today=new Date(); today.setHours(0,0,0,0);
  const done=protocol.filter(p=>p.teliko).length;
  const phase2=protocol.filter(p=>!p.teliko&&p.hm_exerx).length;
  const pending=protocol.filter(p=>!p.teliko&&!p.hm_exerx).length;
  document.getElementById('s-proto-done').textContent=done;
  document.getElementById('s-proto-phase2').textContent=phase2;
  document.getElementById('s-proto-pending').textContent=pending;
  const expiredCerts=certificates.filter(c=>c.expiry&&new Date(c.expiry)<today).length;
  document.getElementById('s-certs-expired').textContent=expiredCerts;
  const allDays=protocol.filter(p=>p.teliko&&p.hm_xreosis).map(p=>{
    const d=Math.round((new Date(p.teliko)-new Date(p.hm_xreosis))/(1000*60*60*24));
    return d>=0?d:null;
  }).filter(d=>d!==null);
  const avgAll=allDays.length?Math.round(allDays.reduce((a,b)=>a+b,0)/allDays.length):null;
  document.getElementById('s-avg-days').textContent=avgAll!==null?avgAll+'':'—';

  // ── Ανά τύπο εγκατάστασης ──
  const FUEL=['Πρατήριο Υγρών Καυσίμων','Μικτό Πρατήριο','Πρατήριο ΙΧ Container'];
  const STATHMOI=['Στεγασμένος Σταθμός','Υπαίθριος Σταθμός'];
  const pratires=installations.filter(i=>FUEL.includes(i.type)).length;
  const synergia=installations.filter(i=>i.type==='Συνεργείο').length;
  const plynteria=installations.filter(i=>i.type==='Πλυντήριο'||i.type==='Λιπαντήριο').length;
  const stathmoi=installations.filter(i=>STATHMOI.includes(i.type)).length;
  const ikteo=installations.filter(i=>i.type==='ΙΚΤΕΟ').length;
  const locked=installations.filter(i=>i.sfragisi||i.anaklisi).length;
  const setV=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  setV('s-inst-pratires',pratires);
  setV('s-inst-synergia',synergia);
  setV('s-inst-plynteria',plynteria);
  setV('s-inst-stathmoi',stathmoi);
  setV('s-inst-ikteo',ikteo);
  setV('s-inst-lock',locked);
  // Χρώμα στο lock card: κόκκινο αν >0
  const lockCard=document.querySelector('[id="s-inst-lock"]');
  if(lockCard){
    const card=lockCard.closest('.stat-card');
    if(card) card.style.outline=locked>0?'2px solid #dc2626':'';
  }
  // Τελευταίες 10 κινήσεις
  const recent=[...protocol].sort((a,b)=>(b.hm_xreosis||'').localeCompare(a.hm_xreosis||'')).slice(0,10);
  const rl=document.getElementById('recent-list');
  if(!rl)return;
  if(!recent.length){rl.innerHTML='<div class="table-empty">Δεν υπάρχουν κινήσεις</div>';return;}
  rl.innerHTML='<table class="tbl"><thead><tr><th>Ημ.Χρέωσης</th><th>ΦΑΚ</th><th>Αιτών</th><th>Αίτημα</th><th>Μηχ/κός</th><th>Τελικό</th></tr></thead><tbody>'
    +recent.map(p=>'<tr>'
      +'<td class="mono">'+fmtDate(p.hm_xreosis)+'</td>'
      +'<td class="mono"><strong>'+esc(p.fak)+'</strong></td>'
      +'<td>'+esc(p.aition)+'</td>'
      +'<td>'+esc(p.aitima)+'</td>'
      +'<td>'+esc(p.mixanikos)+'</td>'
      +'<td>'+(p.teliko?'<span class="badge badge-green">'+fmtDate(p.teliko)+'</span>':'<span class="badge badge-gray">—</span>')+'</td>'
      +'</tr>').join('')
    +'</tbody></table>';
}

function resetDashFilters(){
  document.querySelectorAll('#dash-year-checks input').forEach(i=>i.checked=false);
  const mhxSel=document.getElementById('dash-mhx-checks');
  if(mhxSel&&mhxSel.tagName==='SELECT')[...mhxSel.options].forEach(o=>o.selected=false);
  ['dash-f-sheet','dash-f-energeia'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const fak=document.getElementById('dash-f-fak');if(fak)fak.value='';
  renderDash();
}

// ══ DROPDOWN CHECKBOX HELPERS ══
function buildDdCheckboxes(panelId,labelId,vals,allLabel,onChangeFn){
  const panel=document.getElementById(panelId);
  if(!panel) return;
  // Rebuild αν αλλάξαν οι τιμές
  const existing=panel.querySelectorAll('input[type=checkbox]:not([value="__all__"])');
  if(existing.length===vals.length) return; // ήδη ενημερωμένο
  const prevSel=new Set([...panel.querySelectorAll('input:checked')].map(i=>i.value));
  panel.innerHTML='';
  // "Όλα" option
  const hr=document.createElement('hr'); hr.className='dd-divider';
  const allLbl=document.createElement('label');
  const allCb=document.createElement('input');
  allCb.type='checkbox'; allCb.value='__all__'; allCb.checked=prevSel.size===0||prevSel.has('__all__');
  allCb.addEventListener('change',function(){
    if(this.checked) panel.querySelectorAll('input:not([value="__all__"])').forEach(function(i){i.checked=false;});
    updateDdLabel(panelId,labelId,allLabel);
    onChangeFn();
  });
  allLbl.appendChild(allCb); allLbl.appendChild(document.createTextNode(' '+allLabel));
  allLbl.style.fontWeight='600';
  panel.appendChild(allLbl);
  panel.appendChild(hr);
  vals.forEach(function(v){
    const lbl=document.createElement('label');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.value=v;
    cb.checked=prevSel.has(v);
    cb.addEventListener('change',function(){
      if(this.checked) panel.querySelector('input[value="__all__"]').checked=false;
      if(!panel.querySelectorAll('input:not([value="__all__"]):checked').length)
        panel.querySelector('input[value="__all__"]').checked=true;
      updateDdLabel(panelId,labelId,allLabel);
      onChangeFn();
    });
    lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' '+v));
    panel.appendChild(lbl);
  });
  updateDdLabel(panelId,labelId,allLabel);
}

function updateDdLabel(panelId,labelId,allLabel){
  const panel=document.getElementById(panelId);
  const labelEl=document.getElementById(labelId);
  if(!panel||!labelEl) return;
  const sel=[...panel.querySelectorAll('input:not([value="__all__"]):checked')].map(i=>i.value);
  if(sel.length===0) labelEl.textContent=allLabel;
  else if(sel.length===1) labelEl.textContent=sel[0].length>18?sel[0].substring(0,18)+'…':sel[0];
  else labelEl.textContent=sel.length+' επιλεγμένα';
}

function getDdSelected(panelId){
  const panel=document.getElementById(panelId);
  if(!panel) return [];
  const allCb=panel.querySelector('input[value="__all__"]');
  if(allCb&&allCb.checked) return [];
  return [...panel.querySelectorAll('input:not([value="__all__"]):checked')].map(i=>i.value);
}

function resetDdCheckboxes(panelId,labelId,allLabel){
  const panel=document.getElementById(panelId);
  if(!panel) return;
  panel.querySelectorAll('input').forEach(function(i){i.checked=false;});
  const allCb=panel.querySelector('input[value="__all__"]');
  if(allCb) allCb.checked=true;
  const labelEl=document.getElementById(labelId);
  if(labelEl) labelEl.textContent=allLabel;
}

function toggleDropdown(panelId){
  const panel=document.getElementById(panelId);
  if(!panel) return;
  const isOpen=panel.style.display!=='none';
  // Κλείσε όλα τα ανοιχτά
  document.querySelectorAll('.dd-panel').forEach(function(p){p.style.display='none';});
  if(!isOpen) panel.style.display='block';
}
// Κλείσε dropdowns όταν κλικ εκτός
document.addEventListener('click',function(e){
  if(!e.target.closest('.dd-wrap')) document.querySelectorAll('.dd-panel').forEach(function(p){p.style.display='none';});
});

function renderStats(){
  const today=new Date(); today.setHours(0,0,0,0);

  // Έτη dropdown με checkboxes
  const years=[...new Set(protocol.map(p=>(p.hm_xreosis||'').substring(0,4)).filter(y=>/^\d{4}$/.test(y)&&parseInt(y)>=2000))].sort();
  buildDdCheckboxes('dd-years','dd-years-label',years,'Όλα τα έτη',renderStats);

  // Ενέργεια dropdown με checkboxes
  const energVals=[...new Set(protocol.map(p=>p.energeia).filter(Boolean))].sort();
  buildDdCheckboxes('dd-energ','dd-energ-label',energVals,'Όλες',renderStats);

  // Μηχανικός checkboxes (scroll box — παραμένει ως έχει)
  const mhxCont=document.getElementById('dash-mhx-checks');
  if(mhxCont){
    const mhxVals=[...new Set(protocol.map(p=>p.mixanikos).filter(Boolean))].sort();
    if(mhxCont.querySelectorAll('input').length!==mhxVals.length+1){
      const prevSelected=new Set([...mhxCont.querySelectorAll('input:checked')].map(i=>i.value));
      mhxCont.innerHTML='';
      const allLbl=document.createElement('label');
      allLbl.style.cssText='display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0;font-weight:600';
      const allCb=document.createElement('input');
      allCb.type='checkbox'; allCb.value='__all__'; allCb.id='mhx-all';
      allCb.checked=prevSelected.size===0||prevSelected.has('__all__');
      allCb.addEventListener('change',function(){
        if(this.checked) mhxCont.querySelectorAll('input:not(#mhx-all)').forEach(function(i){i.checked=false;});
        renderStats();
      });
      allLbl.appendChild(allCb); allLbl.appendChild(document.createTextNode(' Όλοι'));
      mhxCont.appendChild(allLbl);
      mhxVals.forEach(function(v){
        const lbl=document.createElement('label');
        lbl.style.cssText='display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:2px 0';
        const cb=document.createElement('input'); cb.type='checkbox'; cb.value=v;
        cb.checked=prevSelected.has(v);
        cb.addEventListener('change',function(){
          if(this.checked) document.getElementById('mhx-all').checked=false;
          if(!mhxCont.querySelectorAll('input:not(#mhx-all):checked').length) document.getElementById('mhx-all').checked=true;
          renderStats();
        });
        lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' '+v));
        mhxCont.appendChild(lbl);
      });
    }
  }

  // Φίλτρα
  const selYears=getDdSelected('dd-years');
  const selEnerg=getDdSelected('dd-energ');
  const allMhxChecked=document.getElementById('mhx-all')&&document.getElementById('mhx-all').checked;
  const selMhx=allMhxChecked?[]:[...document.querySelectorAll('#dash-mhx-checks input:not(#mhx-all):checked')].map(function(i){return i.value;});
  const fSheet=(document.getElementById('dash-f-sheet')||{value:''}).value;
  const fFak=(document.getElementById('dash-f-fak')||{value:''}).value.toLowerCase();
  let arr=[...protocol];
  if(selYears.length) arr=arr.filter(function(p){return selYears.includes((p.hm_xreosis||'').substring(0,4));});
  if(fSheet) arr=arr.filter(function(p){return p.sheet===fSheet;});
  if(selEnerg.length) arr=arr.filter(function(p){return selEnerg.includes(p.energeia||'');});
  if(selMhx.length) arr=arr.filter(function(p){return selMhx.includes(p.mixanikos||'');});
  if(fFak) arr=arr.filter(function(p){return (p.fak||'').toLowerCase().includes(fFak);});
  // Stats
  document.getElementById('dash-r-total').textContent=arr.length;
  document.getElementById('dash-r-done').textContent=arr.filter(function(p){return p.teliko;}).length;
  document.getElementById('dash-r-pending').textContent=arr.filter(function(p){return !p.teliko;}).length;
  const fDays=arr.filter(function(p){return p.teliko&&p.hm_xreosis;}).map(function(p){
    const d=Math.round((new Date(p.teliko)-new Date(p.hm_xreosis))/(1000*60*60*24));
    return d>=0?d:null;
  }).filter(function(d){return d!==null;});
  const fAvg=fDays.length?Math.round(fDays.reduce(function(a,b){return a+b;},0)/fDays.length):null;
  document.getElementById('dash-r-avg').textContent=(fAvg!==null?fAvg+'':'—')+' ημ.';
  // Breakdown
  const bd=document.getElementById('dash-mhx-breakdown');
  if(bd){
    if(!arr.length){bd.innerHTML='<div style="color:var(--text3);font-size:12px">Δεν υπάρχουν δεδομένα</div>';return;}
    const total=arr.length;
    const counts={};
    arr.forEach(function(p){const k=p.mixanikos||'(χωρίς)';counts[k]=(counts[k]||0)+1;});
    const sorted=Object.entries(counts).sort(function(a,b){return b[1]-a[1];});
    bd.innerHTML='<div style="display:flex;flex-direction:column;gap:6px">'
      +sorted.map(function(e){
        const name=e[0],cnt=e[1];
        const pct=Math.round(cnt/total*100);
        return '<div style="display:flex;align-items:center;gap:10px;font-size:12px">'
          +'<div style="width:140px;text-align:right;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="'+esc(name)+'">'+esc(name)+'</div>'
          +'<div style="flex:1;background:var(--surface2);border-radius:4px;height:18px;position:relative;min-width:80px">'
          +'<div style="width:'+Math.max(2,pct)+'%;background:var(--accent);height:100%;border-radius:4px;opacity:0.75"></div>'
          +'</div>'
          +'<div style="width:80px;font-weight:600">'+cnt+' <span style="color:var(--text3);font-weight:400">('+pct+'%)</span></div>'
          +'</div>';
      }).join('')+'</div>';
  }
  // Completion table
  const ctbody=document.getElementById('dash-completion-tbody');
  if(ctbody){
    const compArr=arr.filter(function(p){return p.teliko&&p.hm_xreosis;}).map(function(p){
      const days=Math.round((new Date(p.teliko)-new Date(p.hm_xreosis))/(1000*60*60*24));
      return {p:p,days:days>=0?days:null};
    }).filter(function(x){return x.days!==null;}).sort(function(a,b){return b.days-a.days;});
    if(!compArr.length){
      ctbody.innerHTML='<tr><td colspan="7" class="table-empty">Δεν υπάρχουν ολοκληρωμένες</td></tr>';
    } else {
      ctbody.innerHTML=compArr.map(function(x){
        const p=x.p, d=x.days;
        const col=d>60?'color:#ef4444':d>30?'color:#f97316':'color:#22c55e';
        return '<tr>'
          +'<td class="mono"><strong>'+esc(p.fak)+'</strong></td>'
          +'<td class="mono muted">'+esc(p.proto_eisx)+'</td>'
          +'<td class="mono">'+fmtDate(p.hm_xreosis)+'</td>'
          +'<td class="mono">'+fmtDate(p.teliko)+'</td>'
          +'<td style="font-weight:600;'+col+'">'+d+'</td>'
          +'<td>'+esc(p.aitima)+'</td>'
          +'<td>'+esc(p.mixanikos)+'</td>'
          +'</tr>';
      }).join('');
    }
  }
}

function resetDashFilters(){
  resetDdCheckboxes('dd-years','dd-years-label','Όλα τα έτη');
  resetDdCheckboxes('dd-energ','dd-energ-label','Όλες');
  document.querySelectorAll('#dash-mhx-checks input:not(#mhx-all)').forEach(function(i){i.checked=false;});
  const allCb=document.getElementById('mhx-all'); if(allCb) allCb.checked=true;
  const fs=document.getElementById('dash-f-sheet'); if(fs) fs.value='';
  const fak=document.getElementById('dash-f-fak'); if(fak) fak.value='';
  renderStats();
}

