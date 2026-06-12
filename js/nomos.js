// ══ ΝΟΜΟΘΕΣΙΑ ══

function importNomosIndex(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      if(!Array.isArray(data)){toast('Μη έγκυρο αρχείο index','error');return;}
      nomosIndex=data;
      save('nomos',nomosIndex);
      populateNomosFilters();
      renderNomos();
      updateBadges();
      toast('Εισήχθησαν '+nomosIndex.length+' εγγραφές νομοθεσίας','success');
    }catch(err){toast('Σφάλμα ανάγνωσης JSON: '+err.message,'error');}
  };
  reader.readAsText(file,'utf-8');
  input.value='';
}


// ══ ΝΟΜΟΘΕΣΙΑ: Import/Export ══

// Import κοινού index (admin → Firebase, όλοι βλέπουν)
function importNomosShared(input){
  if(_serverRole==='guest'){ toast('⛔ Δεν έχεις δικαίωμα','error'); return; }
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      const arr=Array.isArray(data)?data:(data.nomos||data.items||data.nomosIndex||[]);
      if(!arr.length){ toast('Δεν βρέθηκαν εγγραφές νομοθεσίας','error'); return; }
      nomosIndex=arr;
      save('nomos',nomosIndex);
      // Αποθήκευση στο Firebase αν είμαστε online
      if(USE_FIREBASE && db){
        fbSave('nomos', nomosIndex).then(function(){
          toast('✅ Index νομοθεσίας ανέβηκε στο Firebase ('+arr.length+' εγγραφές)','success');
        });
      } else {
        toast('✅ Index νομοθεσίας φορτώθηκε ('+arr.length+' εγγραφές)','success');
      }
      populateNomosFilters(); renderNomos();
    }catch(err){ toast('❌ '+err.message,'error'); }
  };
  reader.readAsText(file);
  input.value='';
}

// Import προσωπικής λίστας (localStorage μόνο)
function importNomosPersonal(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const data=JSON.parse(e.target.result);
      const arr=Array.isArray(data)?data:(data.nomos||data.items||data.nomosIndex||[]);
      if(!arr.length){ toast('Δεν βρέθηκαν εγγραφές','error'); return; }
      // Αποθήκευση στο localStorage με ξεχωριστό key
      const fbEmail=sessionStorage.getItem('fb_email')||'local';
      const personalKey='nomos_personal_'+fbEmail.replace(/[@.]/g,'_');
      localStorage.setItem(personalKey, JSON.stringify(arr));
      // Συγχώνευση με το κοινό index
      const combined=[...nomosIndex,...arr];
      // Απόκρυψη διπλότυπων βάσει _id
      const seen=new Set();
      const unique=combined.filter(function(x){ 
        const k=x._id||x.id||(x.title+x.fek); 
        if(seen.has(k)) return false; 
        seen.add(k); return true; 
      });
      nomosIndex=unique;
      toast('✅ Προσωπική λίστα φορτώθηκε ('+arr.length+' εγγραφές, σύνολο: '+unique.length+')','success');
      populateNomosFilters(); renderNomos();
    }catch(err){ toast('❌ '+err.message,'error'); }
  };
  reader.readAsText(file);
  input.value='';
}

// Export προσωπικής λίστας
function exportNomosPersonal(){
  const fbEmail=sessionStorage.getItem('fb_email')||'local';
  const personalKey='nomos_personal_'+fbEmail.replace(/[@.]/g,'_');
  const personal=JSON.parse(localStorage.getItem(personalKey)||'[]');
  if(!personal.length){ toast('Δεν υπάρχει προσωπική λίστα νομοθεσίας','error'); return; }
  const blob=new Blob([JSON.stringify(personal,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='nomos_personal_'+fbEmail.split('@')[0]+'.json';
  a.click();
  toast('✅ Εξαγωγή προσωπικής λίστας ('+personal.length+' εγγραφές)');
}

function populateNomosFilters(){
  const fSel=document.getElementById('nomos-f-folder');
  if(fSel){
    const folders=[...new Set(nomosIndex.map(function(n){return n.folder;}).filter(Boolean))].sort();
    fSel.innerHTML='<option value="">Όλοι οι φάκελοι</option>';
    folders.forEach(function(f){const o=document.createElement('option');o.value=f;o.textContent=f;fSel.appendChild(o);});
  }
  const ySel=document.getElementById('nomos-f-year');
  if(ySel){
    const years=[...new Set(nomosIndex.map(function(n){return n.year;}).filter(function(y){return y&&y.length===4;}))].sort(function(a,b){return b-a;});
    ySel.innerHTML='<option value="">Όλα τα έτη</option>';
    years.forEach(function(y){const o=document.createElement('option');o.value=y;o.textContent=y;ySel.appendChild(o);});
  }
}

function onNomosTopFolderChange(){
  const fFolder=document.getElementById('nomos-f-folder')?document.getElementById('nomos-f-folder').value:'';
  const subSel=document.getElementById('nomos-f-sub');
  if(subSel){
    const seen={};
    const subs=[];
    nomosIndex.forEach(function(n){
      if(fFolder&&n.folder!==fFolder) return;
      if(!n.subfolder) return;
      const first=n.subfolder.indexOf('\\')>=0?n.subfolder.substring(0,n.subfolder.indexOf('\\')):n.subfolder;
      if(first&&!seen[first]){seen[first]=1;subs.push(first);}
    });
    subs.sort();
    subSel.innerHTML='<option value="">Όλοι οι υποφάκελοι</option>';
    subs.forEach(function(s){const o=document.createElement('option');o.value=s;o.textContent=s;subSel.appendChild(o);});
  }
  renderNomos();
}

function getNomosFiltered(){
  const q=document.getElementById('nomos-search')?document.getElementById('nomos-search').value.toLowerCase():'';
  const fFolder=document.getElementById('nomos-f-folder')?document.getElementById('nomos-f-folder').value:'';
  const fSub=document.getElementById('nomos-f-sub')?document.getElementById('nomos-f-sub').value:'';
  const fType=document.getElementById('nomos-f-type')?document.getElementById('nomos-f-type').value:'';
  const fYear=document.getElementById('nomos-f-year')?document.getElementById('nomos-f-year').value:'';
  let arr=nomosIndex.slice();
  if(q) arr=arr.filter(function(n){
    return ((n.filename||n.title||'')+' '+(n.keywords||'')+' '+(n.subfolder||'')+' '+(n.proto||'')+' '+(n.folder||'')).toLowerCase().indexOf(q)>=0;
  });
  if(fFolder) arr=arr.filter(function(n){return n.folder===fFolder;});
  if(fSub) arr=arr.filter(function(n){
    var sub=n.subfolder||'';
    return sub===fSub||sub.indexOf(fSub+'\\')===0;
  });
  if(fType) arr=arr.filter(function(n){return n.type===fType;});
  if(fYear) arr=arr.filter(function(n){return n.year===fYear;});
  var col=nomosSortState.col, dir=nomosSortState.dir;
  arr.sort(function(a,b){return ((a[col]||'').localeCompare(b[col]||''))*dir;});
  return arr;
}

function renderNomos(){
  const arr=getNomosFiltered();
  const tbody=document.getElementById('nomos-tbody');
  if(!tbody)return;
  if(!arr.length){
    const msg=nomosIndex.length===0?'Δεν έχει φορτωθεί index — πατήστε Εισαγωγή Index':'Δεν βρέθηκαν αποτελέσματα';
    tbody.innerHTML='<tr><td colspan="7" class="table-empty">'+msg+'</td></tr>';
    document.getElementById('nomos-count').textContent='';
    return;
  }
  const typeColors={
    'Νόμος':'badge-blue','ΠΔ':'badge-teal','ΥΑ':'badge-orange',
    'ΦΕΚ':'badge-purple','Εγκύκλιος':'badge-green','Απόφαση':'badge-orange',
    'Ερώτημα/Απάντηση':'badge-blue','Οδηγία ΕΕ':'badge-teal',
    'Πρότυπο':'badge-gray','Εγχειρίδιο':'badge-gray','Άλλο':'badge-gray'
  };
  const show=arr.slice(0,200);
  const rows=show.map(function(n){
    const tc=typeColors[n.type]||'badge-gray';
    const extBadge=(n.ext&&n.ext!=='PDF')?'<span class="badge badge-gray" style="font-size:10px">'+esc(n.ext)+'</span> ':'';
    const displayName=n.filename||n.title||'';
    const shortName=displayName.length>80?displayName.substring(0,80)+'…':displayName;
    const localPath=n.path||'';
    const shortSub=(n.subfolder||'').length>35?(n.subfolder||'').substring(0,35)+'…':(n.subfolder||'');
    const copyBtn=localPath?'<button class="btn-icon" onclick="copyNomosPath(this)" data-path="'+esc(localPath)+'" title="Αντιγραφή διαδρομής">📋</button>':'';
    return '<tr>'
      +'<td><span class="badge '+tc+'" style="white-space:nowrap;font-size:10px">'+esc(n.type)+'</span></td>'
      +'<td style="max-width:360px;font-size:12px">'+extBadge+'<span title="'+esc(displayName)+'">'+esc(shortName)+'</span></td>'
      +'<td class="mono" style="font-weight:600">'+esc(n.year)+'</td>'
      +'<td class="mono muted" style="font-size:11px">'+esc(n.proto)+'</td>'
      +'<td style="font-size:11px;color:var(--text3)">'+esc(n.folder)+'</td>'
      +'<td style="font-size:11px;color:var(--text3)" title="'+esc(n.subfolder||'')+'">'+esc(shortSub)+'</td>'
      +'<td class="actions">'+copyBtn+'</td>'
      +'</tr>';
  });
  tbody.innerHTML=rows.join('');
  const more=arr.length>200?' <span style="color:var(--text3)">— εμφανίζονται 200 από '+arr.length+', εξειδίκευσε την αναζήτηση</span>':'';
  document.getElementById('nomos-count').innerHTML=arr.length+' αποτελέσματα από '+nomosIndex.length+' εγγραφές'+more;
}

function copyNomosPath(btn){
  const path=btn.getAttribute('data-path');
  if(!path)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(path).then(function(){
      toast('Διαδρομή αντιγράφηκε! Επικόλλησε στον Explorer (Ctrl+L)','success');
    }).catch(function(){nomosPathFallback(path);});
  } else {
    nomosPathFallback(path);
  }
}

function nomosPathFallback(text){
  const ta=document.createElement('textarea');
  ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('Διαδρομή αντιγράφηκε! Επικόλλησε στον Explorer (Ctrl+L)','success');}
  catch(e){toast('Αδυναμία αντιγραφής','error');}
  document.body.removeChild(ta);
}

</script>
