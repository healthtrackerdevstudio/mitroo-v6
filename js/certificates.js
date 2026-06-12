// ══ CERTIFICATES ══
function renderCerts(){
  const q=(document.getElementById('cert-search')||{value:''}).value.toLowerCase();
  const fType=(document.getElementById('cert-f-type')||{value:''}).value;
  const fStatus=(document.getElementById('cert-f-status')||{value:''}).value;
  const today=new Date();today.setHours(0,0,0,0);
  const in30=new Date(today);in30.setDate(in30.getDate()+30);
  let arr=[...certificates];
  if(q) arr=arr.filter(function(c){return (c.fak+c.type+(c.foreis||'')).toLowerCase().includes(q);});
  if(fType) arr=arr.filter(function(c){return c.type===fType;});
  const byFak={};
  arr.forEach(function(c){
    if(!byFak[c.fak]) byFak[c.fak]={fak:c.fak,certs:[]};
    byFak[c.fak].certs.push(c);
  });
  let fakArr=Object.values(byFak).map(function(g){
    let expired=0,expiring=0,active=0;
    g.certs.forEach(function(c){
      if(!c.expiry){active++;return;}
      const exp=new Date(c.expiry);
      if(exp<today) expired++;
      else if(exp<=in30) expiring++;
      else active++;
    });
    return {fak:g.fak,certs:g.certs,expired:expired,expiring:expiring,active:active,total:g.certs.length};
  });
  if(fStatus==='expired') fakArr=fakArr.filter(function(g){return g.expired>0;});
  else if(fStatus==='expiring') fakArr=fakArr.filter(function(g){return g.expiring>0&&g.expired===0;});
  else if(fStatus==='active') fakArr=fakArr.filter(function(g){return g.expired===0&&g.expiring===0;});
  fakArr.sort(function(a,b){return a.fak.localeCompare(b.fak);});
  const tbody=document.getElementById('cert-tbody');
  if(!tbody)return;
  if(!fakArr.length){
    tbody.innerHTML='<tr><td colspan="7" class="table-empty">Δεν βρέθηκαν εγγραφές</td></tr>';
    document.getElementById('cert-count').textContent='';
    return;
  }
  tbody.innerHTML=fakArr.map(function(g){
    const inst=installations.find(function(i){return i.fak===g.fak;});
    const name=inst?inst.name:'';
    let statusBadge='';
    if(g.expired>0)
      statusBadge='<span class="badge badge-red">⚠️ Ληγμένο ('+g.expired+')</span>';
    else if(g.expiring>0)
      statusBadge='<span class="badge badge-orange">⏰ Λήγει σύντομα ('+g.expiring+')</span>';
    else
      statusBadge='<span class="badge badge-green">✅ Σε ισχύ ('+g.active+')</span>';
    return '<tr style="cursor:pointer" data-openfak="'+esc(g.fak)+'">'
      +'<td class="mono"><strong>'+esc(g.fak)+'</strong> <button class="btn-icon" style="font-size:11px;padding:1px 4px;color:var(--primary);opacity:.7" onclick="event.stopPropagation();navToInst(\''+esc(g.fak)+'\')" title="Άνοιγμα εγκατάστασης">🏢</button></td>'
      +'<td style="font-size:12px">'+esc(name)+'</td>'
      +'<td class="mono" style="text-align:center">'+g.total+'</td>'
      +'<td style="text-align:center">'+(g.expired>0?'<span style="color:#ef4444;font-weight:700">'+g.expired+'</span>':'<span class="muted">0</span>')+'</td>'
      +'<td style="text-align:center">'+(g.expiring>0?'<span style="color:#f97316;font-weight:700">'+g.expiring+'</span>':'<span class="muted">0</span>')+'</td>'
      +'<td>'+statusBadge+'</td>'
      +'<td class="muted" style="font-size:11px;color:var(--text3)">κλικ για λεπτομέρειες →</td>'
      +'</tr>';
  }).join('');
  document.getElementById('cert-count').textContent=fakArr.length+' ΦΑΚ, '+arr.length+' πιστοποιητικά';
}

// Cert tbody click handler
function certTbodyClick(e){
  const tr=e.target.closest('tr[data-openfak]');
  if(tr) openCertsFakModal(tr.dataset.openfak);
}

function openCertsFakModal(fak){
  const today=new Date();today.setHours(0,0,0,0);
  const certs=certificates.filter(function(c){return c.fak===fak;})
    .sort(function(a,b){return (a.type||'').localeCompare(b.type||'');});
  const inst=installations.find(function(i){return i.fak===fak;});
  const name=inst?inst.name:'';
  const existing=document.getElementById('certs-fak-overlay');
  if(existing) existing.remove();
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center';
  overlay.id='certs-fak-overlay';
  const tbody=certs.map(function(c){
    const cs=certStatus(c.expiry);
    const docBtn=c.doc_link?'<a href="'+esc(c.doc_link)+'" target="_blank" class="btn-icon">📎</a>':'';
    return '<tr>'
      +'<td style="font-size:12px">'+esc(c.type)+'</td>'
      +'<td class="mono muted" style="font-size:11px">'+esc(c.num||'')+'</td>'
      +'<td class="mono" style="font-size:11px">'+fmtDate(c.issue_date)+'</td>'
      +'<td class="mono" style="font-size:11px">'+fmtDate(c.expiry)+'</td>'
      +'<td>'+cs+'</td>'
      +'<td class="actions">'
        +docBtn
        +'<button class="btn-icon" data-editcert="'+esc(c._id||'')+'" title="Επεξεργασία">✏️</button>'
        +'<button class="btn-icon" data-delcert="'+esc(c._id||'')+'" title="Διαγραφή">🗑</button>'
      +'</td>'
      +'</tr>';
  }).join('');
  overlay.innerHTML='<div style="background:var(--surface);border-radius:var(--radius-lg);padding:24px;max-width:820px;width:95vw;max-height:85vh;overflow-y:auto;box-shadow:var(--shadow-lg)" id="certs-fak-content">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'
    +'<div><div style="font-size:16px;font-weight:700">'+esc(fak)+'</div>'
    +'<div style="font-size:12px;color:var(--text3)">'+esc(name)+'</div></div>'
    +'<div style="display:flex;gap:8px">'
    +'<button class="btn btn-secondary btn-sm" onclick="navToInst(\''+esc(fak)+'\')" title="Εγκατάσταση">🏢 Εγκατάσταση</button>'
    +'<button class="btn btn-secondary btn-sm" onclick="navToProto(\''+esc(fak)+'\')" title="Πρωτόκολλο">📋 Πρωτόκολλο</button>'
    +'<button class="btn btn-secondary btn-sm" onclick="printCertsFak()">🖨️ Εκτύπωση</button>'
    +'<button class="btn btn-primary btn-sm" data-addcertfak2="'+esc(fak)+'">➕ Προσθήκη</button>'
    +'<button class="modal-close" onclick="closeCertsFakModal()">✕</button>'
    +'</div></div>'
    +'<table class="tbl" id="certs-fak-table" style="font-size:12px"><thead><tr>'
    +'<th>Τύπος</th><th>Αρ./Κωδ.</th><th>Έκδοση</th><th>Λήξη</th><th>Κατάσταση</th><th></th>'
    +'</tr></thead><tbody>'+(tbody||'<tr><td colspan="6" class="table-empty">Δεν υπάρχουν</td></tr>')+'</tbody></table>'
    +'<div id="certs-fak-printinfo" style="display:none;margin-top:12px;font-size:11px;color:var(--text3)">Εκτυπώθηκε: '+new Date().toLocaleDateString('el-GR')+'</div>'
    +'</div>';
  overlay.addEventListener('click',function(e){
    if(e.target===overlay){closeCertsFakModal();return;}
    const eb=e.target.closest('[data-editcert]');
    if(eb){closeCertsFakModal();openCertModal(eb.dataset.editcert);return;}
    const db=e.target.closest('[data-delcert]');
    if(db){
      confirmDelete('Διαγραφή πιστοποιητικού;',function(){
        deleteCert(db.dataset.delcert);
        closeCertsFakModal();
      });
      return;
    }
    const ab=e.target.closest('[data-addcertfak2]');
    if(ab){closeCertsFakModal();openCertModal(null,ab.dataset.addcertfak2);return;}
  });
  document.body.appendChild(overlay);
}

function closeCertsFakModal(){
  const o=document.getElementById('certs-fak-overlay');
  if(o)o.remove();
}

function printCertsFak(){
  const content=document.getElementById('certs-fak-content');
  if(!content)return;
  // Εμφάνισε ημερομηνία εκτύπωσης
  const pi=document.getElementById('certs-fak-printinfo');
  if(pi){pi.style.display='block'; pi.textContent='Εκτυπώθηκε: '+new Date().toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'});}
  // Άνοιξε νέο παράθυρο εκτύπωσης με μόνο τον πίνακα
  const win=window.open('','_blank','width=900,height=600');
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8">'
    +'<title>Πιστοποιητικά</title>'
    +'<style>'
    +'body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#000}'
    +'h2{margin:0 0 4px 0;font-size:16px}'
    +'.sub{font-size:11px;color:#666;margin-bottom:16px}'
    +'table{width:100%;border-collapse:collapse;margin-top:8px}'
    +'th{background:#f0f0f0;border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:11px}'
    +'td{border:1px solid #ddd;padding:5px 8px;font-size:11px}'
    +'.expired{color:#dc2626;font-weight:600}'
    +'.expiring{color:#ea580c;font-weight:600}'
    +'.active{color:#16a34a}'
    +'.footer{margin-top:16px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}'
    +'@media print{button{display:none!important}}'
    +'</style></head><body>');
  // Τίτλος
  const title=content.querySelector('div>div>div');
  const fak=title?title.textContent:'';
  const sub=content.querySelector('div>div>div+div');
  const name=sub?sub.textContent:'';
  win.document.write('<h2>'+fak+'</h2><div class="sub">'+name+'</div>');
  // Πίνακας — αφαίρεσε την τελευταία στήλη (actions)
  const table=document.getElementById('certs-fak-table');
  if(table){
    const clone=table.cloneNode(true);
    // Αφαίρεσε action cells
    clone.querySelectorAll('th:last-child,td:last-child').forEach(function(el){el.remove();});
    // Προσθέσε κλάσεις χρώματος βάσει text
    clone.querySelectorAll('td').forEach(function(td){
      if(td.textContent.includes('Ληγμένο')) td.className='expired';
      else if(td.textContent.includes('Λήγει')) td.className='expiring';
      else if(td.textContent.includes('Ενεργό')) td.className='active';
    });
    win.document.write(clone.outerHTML);
  }
  win.document.write('<div class="footer">Εκτυπώθηκε: '+new Date().toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})+'</div>');
  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  setTimeout(function(){win.print();},400);
}

function certStatus(expiry){
  if(!expiry) return '<span class="badge badge-gray">Αόριστη</span>';
  const today=new Date();today.setHours(0,0,0,0);
  const exp=new Date(expiry);
  const diff=Math.floor((exp-today)/(1000*60*60*24));
  if(diff<0) return `<span class="badge badge-red">Ληγμένο (${Math.abs(diff)} ημ.)</span>`;
  if(diff<=30) return `<span class="badge badge-orange">Λήγει σε ${diff} ημ.</span>`;
  return `<span class="badge badge-green">Ενεργό</span>`;
}
function buildCertTypeOptions(selectedVal=''){
  const customTypes=[...new Set(certificates.map(x=>x.type).filter(t=>t&&!CERT_TYPES.includes(t)))].sort();
  return '<option value="">— Τύπος —</option>'+
    CERT_TYPES.map(t=>`<option${t===selectedVal?' selected':''}>${t}</option>`).join('')+
    customTypes.map(t=>`<option${t===selectedVal?' selected':''}>${t}</option>`).join('')+
    `<option value="__other__"${selectedVal==='__other__'?' selected':''}>Νέα εγγραφή…</option>`;
}

function addCertRow(data={}){
  const row=document.createElement('div');
  row.className='cert-row';
  row.style.cssText='display:grid;grid-template-columns:220px 120px 110px 110px 1fr 32px;gap:6px;align-items:center;background:#f8f9fa;padding:6px;border-radius:6px;border:1px solid #e2e8f0';
  const rid='cr_'+Math.random().toString(36).slice(2,7);
  row.dataset.rid=rid;
  row.innerHTML=
    `<div style="display:flex;flex-direction:column;gap:3px">
       <select class="form-control cert-row-type" onchange="syncCertRowType(this)" style="font-size:12px">${buildCertTypeOptions(data.type||'')}</select>
       <input class="form-control cert-row-type-txt" placeholder="Νέος τύπος…" style="font-size:12px;display:${data.type&&!CERT_TYPES.includes(data.type)&&data.type!=='__other__'?'block':'none'}" value="${data.type&&!CERT_TYPES.includes(data.type)?data.type:''}">
     </div>`+
    `<input class="form-control cert-row-num" placeholder="Αρ./Κωδ." style="font-size:12px" value="${data.num||''}">` +
    `<input class="form-control cert-row-issue" type="date" style="font-size:12px" value="${data.issue_date||''}">` +
    `<input class="form-control cert-row-exp" type="date" style="font-size:12px" value="${data.expiry||''}">` +
    `<div style="display:flex;gap:4px;align-items:center">
       <input class="form-control cert-row-link" placeholder="URL ή διαδρομή αρχείου" style="font-size:12px;flex:1" value="${data.doc_link||''}">
       <label class="btn btn-secondary btn-sm" style="cursor:pointer;white-space:nowrap;padding:4px 6px;font-size:11px" title="Επιλογή αρχείου">📂<input type="file" style="display:none" onchange="setCertRowLink(this)"></label>
     </div>`+
    `<button type="button" class="btn-icon" onclick="removeCertRow(this)" title="Διαγραφή πιστοποιητικού" style="color:var(--danger)">🗑</button>`;
  // Store existing _id if editing
  if(data._id) row.dataset.id=data._id;
  document.getElementById('cf-cert-rows').appendChild(row);
}

function syncCertRowType(sel){
  const txt=sel.closest('.cert-row').querySelector('.cert-row-type-txt');
  if(txt) txt.style.display=sel.value==='__other__'?'block':'none';
}

function setCertRowLink(input){
  const linkEl=input.closest('div').querySelector('.cert-row-link');
  if(linkEl&&input.files[0]) linkEl.value=input.files[0].name;
}

function openCertModal(id=null, pfFak=null){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  closeAllAcLists();
  try{
  editCertId=id||null;
  document.getElementById('modal-cert-title').textContent=id?'Επεξεργασία Πιστοποιητικού':'Νέα Καρτέλα Πιστοποιητικών';
  const fakInp=document.getElementById('cf-fak');
  document.getElementById('cf-cert-rows').innerHTML='';
  if(id){
    const c=certificates.find(x=>x._id===id);
    if(c){
      fakInp.value=c.fak;
      fakInp.disabled=true;
      addCertRow(c);
      // Load autopsia για τον ΦΑΚ
      const inst=installations.find(function(i){return i.fak===c.fak;});
      const autoEl=document.getElementById('cf-autopsia');
      if(autoEl) autoEl.value=inst?inst.autopsia||'':'';
    }
  } else {
    fakInp.value=pfFak||'';
    fakInp.disabled=false;
    addCertRow();
    // Load autopsia αν υπάρχει ΦΑΚ
    if(pfFak){
      const inst=installations.find(function(i){return i.fak===pfFak;});
      const autoEl=document.getElementById('cf-autopsia');
      if(autoEl) autoEl.value=inst?inst.autopsia||'':'';
    }
  }
  openModal('modal-cert');
  const fakVal=document.getElementById('cf-fak').value;
  qnavShow('cert',fakVal||pfFak||null);
  }catch(e){console.error('openCertModal error:',e);toast('Σφάλμα: '+e.message,'error');}
}

function saveCerts(){
  const fak=document.getElementById('cf-fak').value;
  if(!fak){toast('Επιλέξτε ΦΑΚ','error');return;}
  // Αποθήκευση Τελευταίας Αυτοψίας στην εγκατάσταση
  const autoEl=document.getElementById('cf-autopsia');
  if(autoEl&&autoEl.value){
    const instIdx=installations.findIndex(function(i){return i.fak===fak;});
    if(instIdx>=0) installations[instIdx].autopsia=autoEl.value;
    save('inst',installations);
  }
  const rows=[...document.querySelectorAll('.cert-row')];
  if(!rows.length){toast('Προσθέστε τουλάχιστον ένα πιστοποιητικό','error');return;}
  let saved=0,errors=0;
  rows.forEach(row=>{
    const typeSel=row.querySelector('.cert-row-type');
    const typeTxt=row.querySelector('.cert-row-type-txt');
    const type=typeSel.value==='__other__'?(typeTxt?typeTxt.value.trim():''):typeSel.value;
    if(!type){errors++;return;}
    const obj={
      fak,type,
      num:row.querySelector('.cert-row-num').value.trim(),
      issue_date:row.querySelector('.cert-row-issue').value,
      expiry:row.querySelector('.cert-row-exp').value,
      doc_link:row.querySelector('.cert-row-link').value.trim(),
      notes:''
    };
    const existingId=row.dataset.id||null;
    if(existingId){
      const idx=certificates.findIndex(c=>c._id===existingId);
      if(idx>=0){certificates[idx]={...certificates[idx],...obj};saved++;}
    } else {obj._id=uid();certificates.push(obj);saved++;}
  });
  save('certs',certificates);
  document.getElementById('cf-fak').disabled=false;
  const toastMsg=errors>0
    ?`⚠️ Αποθηκεύτηκαν ${saved} πιστοποιητικά (${errors} παραλείφθηκαν χωρίς τύπο)`
    :`✓ Αποθηκεύτηκαν ${saved} πιστοποιητικά για ΦΑΚ ${fak}`;
  const toastType=errors>0?'warning':'success';
  closeModal('modal-cert');
  toast(toastMsg, toastType);
  try{ updateBadges(); renderCerts(); }catch(e){ console.warn('renderCerts:',e); }
}

// Keep saveCert as alias for single-edit compatibility
function saveCert(){saveCerts();}
function syncCertType(){}
function getCertType(){return '';}

function deleteCert(id){
  if(_serverRole==='guest'){toast('⛔ Δεν έχεις δικαίωμα','error');return;}
  certificates=certificates.filter(c=>c._id!==id);
  save('certs',certificates);
  try{ updateBadges();renderCerts(); }catch(e){}
  toast('🗑 Πιστοποιητικό διαγράφηκε','info');
}

// Αφαίρεση γραμμής πιστοποιητικού από τη φόρμα modal-cert.
// Αν η γραμμή έχει αποθηκευμένο _id → επιβεβαίωση πριν αφαίρεση.
// Η οριστική αποθήκευση γίνεται με κλικ στο κουμπί Αποθήκευση.
function removeCertRow(btn){
  const row=btn.closest('.cert-row');
  if(!row) return;
  if(row.dataset.id){
    confirmDelete('Αφαίρεση πιστοποιητικού;\n(Η διαγραφή οριστικοποιείται με Αποθήκευση)',function(){
      row.remove();
      toast('Γραμμή αφαιρέθηκε — πατήστε Αποθήκευση για να επιβεβαιωθεί','warning');
    });
  } else {
    row.remove(); // νέα γραμμή, χωρίς επιβεβαίωση
  }
}
