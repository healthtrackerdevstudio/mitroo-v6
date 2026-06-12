// ══ LOGIN ══
function doLogin(){
  const u=document.getElementById('l-user').value.trim();
  const p=document.getElementById('l-pass').value;
  const errEl=document.getElementById('login-error');
  errEl.style.display='none';
  if(!u && !p){ errEl.textContent='Συμπλήρωσε email και κωδικό'; errEl.style.display='block'; return; }
  if(!u){ errEl.textContent='Συμπλήρωσε το email'; errEl.style.display='block'; return; }
  if(!p){ errEl.textContent='Συμπλήρωσε τον κωδικό'; errEl.style.display='block'; return; }
  // Firebase Auth mode
  if(USE_FIREBASE){
    if(!window.fbAuth){
      // Αρχικοποίηση Firebase πρώτα
      if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      db=firebase.firestore();
      window.fbAuth=firebase.auth();
    }
    const btn=document.querySelector('.login-btn');
    if(btn){btn.disabled=true;btn.textContent='Σύνδεση...';}
    window.fbAuth.signInWithEmailAndPassword(u,p)
      .then(function(cred){
        const email=cred.user.email;
        const username=email.split('@')[0];
        // Καθόρισε role βάσει email
        const role=email.startsWith('admin')?'admin':email.startsWith('guest')?'guest':'user';
        sessionStorage.setItem('auth','1');
        sessionStorage.setItem('fb_email',email);
        sessionStorage.setItem('fb_role',role);
        _serverRole=role;
        afterLogin(username);
      })
      .catch(function(err){
        console.error('Firebase Auth error:', err.code, err.message);
        const msgs={
          'auth/user-not-found':'Ο χρήστης δεν υπάρχει στο Firebase Authentication.',
          'auth/wrong-password':'Λάθος κωδικός.',
          'auth/invalid-email':'Μη έγκυρο email.',
          'auth/invalid-credential':'Λάθος email ή κωδικός.',
          'auth/too-many-requests':'Πολλές αποτυχημένες προσπάθειες. Δοκίμασε αργότερα.',
          'auth/network-request-failed':'Πρόβλημα σύνδεσης δικτύου.',
          'auth/operation-not-allowed':'Η email/password σύνδεση δεν είναι ενεργοποιημένη στο Firebase.',
        };
        errEl.textContent = msgs[err.code] || ('Σφάλμα: '+err.code);
        errEl.style.display='block';
        if(btn){btn.disabled=false;btn.textContent='Είσοδος';}
      });
    return;
  }
  // Local fallback (file://)
  if(u===CREDS.user&&p===CREDS.pass){
    sessionStorage.setItem('auth','1');
    afterLogin(u);
  } else {
    document.getElementById('l-err').textContent='Λανθασμένα στοιχεία εισόδου';
  }
}
// ══ BACKUP / RESTORE ══

// ══ FIREBASE IMPORT ══
async function fbImportFromBackup(){
  if(!db){ toast('Firebase δεν είναι συνδεδεμένο','error'); return; }
  if(!confirm('Θα ανεβάσεις τα τοπικά δεδομένα (Εγκαταστάσεις, Πιστοποιητικά, Εξοπλισμός) στο Firebase.\n\nΑυτό θα αντικαταστήσει ό,τι υπάρχει στο Firebase.\n\nΣυνέχεια;')) return;
  toast('Ανέβασμα δεδομένων στο Firebase...');
  try {
    await Promise.all([
      fbSave('installations', installations),
      fbSave('certificates', certificates),
      fbSave('equipment', equipment),
    ]);
    // Φόρτωση κοινοποιήσεων από localStorage αν υπάρχουν
    const koin = JSON.parse(localStorage.getItem('docgen_koinopoiiseis')||'null');
    if(koin) await fbSave('koinopoiiseis', koin);
    toast('✅ Δεδομένα ανέβηκαν στο Firebase επιτυχώς!','success');
  } catch(e) {
    toast('❌ Σφάλμα: '+e.message,'error');
  }
}

// Εμφάνιση Firebase upload button μόνο αν είμαστε σε Firebase mode
function updateFbButton(){
  const btn = document.getElementById('btn-fb-import');
  if(btn) btn.style.display = 'none'; // hide old button
  const lbl=document.getElementById('btn-fb-upload-label');
  if(lbl) lbl.style.display=(USE_FIREBASE&&db)?'inline-flex':'none';
}


// Backup μόνο κοινών δεδομένων (για Firebase upload)
function backupShared(){
  const now=new Date();
  const ts=now.getFullYear()+''+String(now.getMonth()+1).padStart(2,'0')+''+String(now.getDate()).padStart(2,'0');
  const payload={
    version:'v5.30',
    exported_at:now.toISOString(),
    type:'shared',
    inst:installations,
    certs:certificates,
    equip:equipment,
    koin:JSON.parse(localStorage.getItem('docgen_koinopoiiseis')||'[]')
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='shared_backup_'+ts+'.json';
  a.click();
  toast('✅ Backup κοινών δεδομένων αποθηκεύτηκε','success');
}

// Import κοινών από αρχείο → Firebase
function importSharedToFirebase(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async function(e){
    try{
      const data=JSON.parse(e.target.result);
      const inst=data.inst||data.installations||[];
      const certs=data.certs||data.certificates||[];
      const equip=data.equip||data.equipment||[];
      const koin=data.koin||[];
      if(!db){ toast('Firebase δεν είναι συνδεδεμένο','error'); return; }
      toast('Ανέβασμα στο Firebase...');
      await Promise.all([
        fbSave('installations',inst),
        fbSave('certificates',certs),
        fbSave('equipment',equip),
        koin.length?fbSave('koinopoiiseis',koin):Promise.resolve()
      ]);
      installations=inst; certificates=certs; equipment=equip;
      save('inst',inst); save('certs',certs); save('equip',equip);
      updateBadges(); renderDash(); renderInst(); renderCerts(); renderEquip();
      toast('✅ '+inst.length+' εγκ., '+certs.length+' πιστ., '+equip.length+' εξοπλ. ανέβηκαν στο Firebase!','success');
    }catch(err){ toast('❌ '+err.message,'error'); }
  };
  reader.readAsText(file);
  input.value='';
}

function backupData(){
  const now=new Date();
  const ts=now.getFullYear()+''+String(now.getMonth()+1).padStart(2,'0')+''+String(now.getDate()).padStart(2,'0')+'_'+String(now.getHours()).padStart(2,'0')+''+String(now.getMinutes()).padStart(2,'0');
  const payload={
    version:'v5.30',
    exported_at:now.toISOString(),
    inst:installations,
    proto:protocol,
    certs:certificates,
    equip:equipment
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`protokollo_backup_${ts}.json`;
  a.click();
  toast(`✓ Backup αποθηκεύτηκε: protokollo_backup_${ts}.json`,'success');
}

function restoreData(input){
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const d=JSON.parse(e.target.result);
      if(USE_FIREBASE){
        // Firebase mode: restore μόνο πρωτόκολλο
        const proto=d.protocol||d.proto||[];
        if(!proto.length){ toast('Δεν βρέθηκε πρωτόκολλο στο αρχείο','error'); return; }
        if(!confirm('Θα αντικαταστήσεις το πρωτόκολλό σου με '+proto.length+' εγγραφές. Συνέχεια;')) return;
        protocol=proto;
        save('proto',protocol);
        // Ανέβασμα στο Firebase
        const fbEmail=sessionStorage.getItem('fb_email')||'';
        if(fbEmail && db){
          const protoKey='protocol_'+fbEmail.toLowerCase().replace(/[@.]/g,'_');
          fbSave(protoKey, protocol).then(function(){
            toast('✅ Πρωτόκολλο επαναφέρθηκε ('+protocol.length+' εγγραφές)','success');
          });
        }
        renderProto(); updateBadges(); renderDash();
      } else {
        // Local mode: restore όλα
        if(!confirm('Θα αντικαταστήσεις όλα τα δεδομένα. Συνέχεια;')) return;
        if(d.installations) installations=d.installations;
        if(d.protocol) protocol=d.protocol;
        if(d.certificates) certificates=d.certificates;
        if(d.equipment) equipment=d.equipment;
        save('inst',installations); save('proto',protocol);
        save('certs',certificates); save('equip',equipment);
        toast('✅ Δεδομένα επαναφέρθηκαν','success');
        updateBadges(); renderDash(); renderInst(); renderProto(); renderCerts(); renderEquip();
      }
    }catch(err){ toast('❌ '+err.message,'error'); }
  };
  reader.readAsText(file);
  input.value='';
}
function afterLogin(username){
  // Ενημέρωσε πάντα το role από το sessionStorage
  const _fbEmailNow=sessionStorage.getItem('fb_email')||'';
  if(_fbEmailNow){
    _serverRole=_fbEmailNow.startsWith('admin')?'admin':_fbEmailNow.startsWith('guest')?'guest':'user';
  }
  // Αν το app είναι ήδη ορατό με τον ίδιο χρήστη, μην ξανατρέξεις
  const appVisible=(document.getElementById('app').style.display==='flex');
  const sameUser=(document.getElementById('topbar-user').textContent===username);
  if(appVisible && sameUser){ return; }
  document.getElementById('topbar-user').textContent=username;
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='flex';
  document.getElementById('app').style.flexDirection='column';
  // Αρχικοποίηση Firebase ΠΡΩΤΑ
  if(USE_FIREBASE){ initFirebase(); setTimeout(updateFbButton, 1000); }
  // Φόρτωση protocol από Firebase (chunked) με merge vs localStorage
  if(USE_FIREBASE){
    setTimeout(function(){
      if(!db) return;
      const fbEmail=sessionStorage.getItem('fb_email')||'';
      if(!fbEmail) return;
      const protoKey='protocol_'+fbEmail.toLowerCase().replace(/[@.]/g,'_');
      const localProto=JSON.parse(localStorage.getItem(KEYS.proto)||'null')||[];
      fbLoadProto(protoKey).then(function(fbData){
        var final;
        if(!fbData || fbData.length===0){
          // Firebase άδειο → χρησιμοποίησε localStorage
          final = localProto;
          if(final.length>0){
            fbSaveProto(protoKey, final); // ανέβασε στο Firebase
            toast('✅ Πρωτόκολλο (τοπικό): '+final.length+' εγγραφές');
          } else {
            toast('ℹ️ Δεν βρέθηκε πρωτόκολλο');
          }
        } else if(localProto.length > fbData.length){
          // localStorage έχει περισσότερες κινήσεις (offline δουλειά)
          // Merge: κράτα όλες τις κινήσεις, χωρίς duplicates
          var fbIds=new Set(fbData.map(function(p){return p._id;}));
          var extra=localProto.filter(function(p){return !fbIds.has(p._id);});
          final = fbData.concat(extra);
          // Ταξινόμησε χρονολογικά
          final.sort(function(a,b){return (a.hm_xreosis||'') > (b.hm_xreosis||'') ? 1 : -1;});
          fbSaveProto(protoKey, final); // sync στο Firebase
          toast('✅ Πρωτόκολλο: '+final.length+' εγγραφές ('+extra.length+' offline συγχρον.)');
        } else {
          // Firebase είναι ενημερωμένο
          final = fbData;
          toast('✅ Πρωτόκολλο: '+final.length+' εγγραφές');
        }
        protocol = final;
        localStorage.setItem(KEYS.proto, JSON.stringify(final));
        renderProto(); updateBadges(); renderDash();
      }).catch(function(e){
        // Δεν υπάρχει internet — χρησιμοποίησε localStorage
        console.error('proto load error:', e);
        if(localProto.length>0){
          protocol=localProto;
          renderProto(); updateBadges(); renderDash();
          toast('⚠️ Offline — Πρωτόκολλο από τοπική μνήμη: '+localProto.length+' εγγραφές');
        } else {
          toast('⚠️ Offline — Δεν βρέθηκε τοπικό πρωτόκολλο');
        }
      });
    }, 1000);
  }
  // Guest: απόκρυψη κουμπιών + μπλοκάρισμα
  if(_serverRole==='guest'){
    // Κρύψε όλα τα κουμπιά επεξεργασίας μετά από λίγο (να έχει φορτωθεί το DOM)
    setTimeout(function(){
      // Κουμπιά επεξεργασίας/διαγραφής
      document.querySelectorAll(
        'button[onclick*="openInstModal"], button[onclick*="deleteInst"],' +
        'button[onclick*="openEquipModal"], button[onclick*="deleteEquip"],' +
        'button[onclick*="openCertModal"], button[onclick*="deleteCert"],' +
        'button[onclick*="openProtoModal"], button[onclick*="deleteProto"],' +
        '.btn-primary:not(.guest-ok), .btn-danger'
      ).forEach(function(b){ b.style.display='none'; });
      // Guest: κρύψε ΟΛΑ τα topbar κουμπιά εκτός Έξοδος
      ['btn-backup-all','btn-backup-kina','btn-fb-upload-label','btn-fb-import',
       'btn-eisag-proto','btn-restore'].forEach(function(id){
        var el=document.getElementById(id);
        if(el) el.style.display='none';
      });
      // Κρύψε Nav Πρωτόκολλο και Doc Generator
      var navProto=document.getElementById('nav-proto');
      var navDocgen=document.getElementById('nav-docgen');
      if(navProto) navProto.style.display='none';
      if(navDocgen) navDocgen.style.display='none';
      // Badge Επισκέπτης — μόνο μία φορά
      if(!document.getElementById('guest-badge')){
        var badge=document.createElement('span');
        badge.id='guest-badge';
        badge.textContent=' [Επισκέπτης]';
        badge.style.cssText='color:#f97316;font-size:12px;margin-left:4px';
        var tu=document.getElementById('topbar-user');
        if(tu) tu.after(badge);
      }
    }, 500);
  }
  loadData();
}

function doLogout(){
  if(_serverRole!=='guest'){
    // Save protocol to Firebase πριν logout
    if(USE_FIREBASE && db && protocol.length>0){
      const fbEmail=sessionStorage.getItem('fb_email')||'';
      if(fbEmail){
        const protoKey='protocol_'+fbEmail.toLowerCase().replace(/[@.]/g,'_');
        fbSaveProto(protoKey, protocol);
      }
    }
    autoBackupOnLogout();
  }
  if(USE_FIREBASE && window.fbAuth) window.fbAuth.signOut().catch(function(){});
  sessionStorage.clear();
  var _ls=document.getElementById('login-screen');
  var _ap=document.getElementById('app');
  var _lp=document.getElementById('l-pass');
  var _le=document.getElementById('l-err');
  if(_ls) _ls.style.display='flex';
  if(_ap) _ap.style.display='none';
  if(_ap) _ap.style.flexDirection='';
  if(_lp) _lp.value='';
  if(_le) _le.textContent='';
}

function autoBackupOnLogout(){
  try{
    const fbEmail=sessionStorage.getItem('fb_email')||'';
    const username=fbEmail?fbEmail.split('@')[0]:'user';
    // Firebase mode: backup μόνο πρωτόκολλο (τα κοινά είναι στο Firebase)
    // Local mode: backup όλα
    const data = USE_FIREBASE ? {
      version:'v5.30',
      exported: new Date().toISOString(),
      type:'protocol_only',
      user: fbEmail,
      protocol
    } : {
      version:'v5.30',
      exported: new Date().toISOString(),
      type:'full',
      installations,protocol,certificates,equipment
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    a.href=url; a.download='backup_'+username+'_'+ts+'.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }catch(e){console.error('Auto backup failed:',e);}
}
window.onload=()=>{
  if(USE_FIREBASE){
    // Firebase mode: αρχικοποίηση και έλεγχος auth state
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db=firebase.firestore();
    window.fbAuth=firebase.auth();
    window.fbAuth.onAuthStateChanged(function(user){
      if(user){
        const username=user.email.split('@')[0];
        const role=user.email.startsWith('admin')?'admin':user.email.startsWith('guest')?'guest':'user';
        _serverRole=role;
        sessionStorage.setItem('auth','1');
        sessionStorage.setItem('fb_email',user.email);
        sessionStorage.setItem('fb_role',role);
        afterLogin(username);
      } else {
        // Επαναφορά login button — ο browser μπορεί να κρατήσει
        // το "Σύνδεση... / disabled" state από προηγούμενη προσπάθεια
        const lb=document.querySelector('.login-btn');
        if(lb){lb.disabled=false;lb.textContent='Είσοδος';}
        document.getElementById('login-screen').style.display='flex';
        document.getElementById('app').style.display='none';
        setTimeout(function(){ const el=document.getElementById('l-user'); if(el) el.focus(); },100);
      }
    });
  } else {
    // Local mode
    if(sessionStorage.getItem('auth')){
      document.getElementById('l-user').value=CREDS.user;
      doLogin();
    } else {
      document.getElementById('l-user').focus();
    }
  }
};

// ══ IMPORT FROM V2 ══
function checkImportAvailable(){
  // If v2 data exists in same origin, update the description
  const hasV2=localStorage.getItem('otp2_inst')||localStorage.getItem('otp2_proto');
  const alreadyImported=localStorage.getItem('otp3_v2_imported');
  const desc=document.getElementById('import-desc');
  if(hasV2&&!alreadyImported&&desc){
    desc.innerHTML='<strong style="color:var(--success)">✓ Βρέθηκαν δεδομένα v2!</strong> Πάτα «🔄 Αυτόματα» για άμεση μεταφορά.';
  }
  if(alreadyImported==='done'){
    const sec=document.getElementById('import-section');
    if(sec)sec.style.display='none';
  }
}

// ── Αυτόματη μεταφορά (μόνο αν v2 είναι στο ίδιο origin) ──
function tryAutoImport(){
  const v2inst=localStorage.getItem('otp2_inst');
  const v2proto=localStorage.getItem('otp2_proto');
  if(!v2inst&&!v2proto){
    toast('Δεν βρέθηκαν δεδομένα v2 σε αυτόν τον browser. Χρησιμοποίησε Εξαγωγή/Εισαγωγή JSON.','error');
    return;
  }
  applyImportData(
    JSON.parse(v2inst||'[]'),
    JSON.parse(localStorage.getItem('otp2_proto')||'[]'),
    JSON.parse(localStorage.getItem('otp2_certs')||'[]'),
    JSON.parse(localStorage.getItem('otp2_equip')||'[]')
  );
}

// ── Εισαγωγή ΜΟΝΟ κινήσεων πρωτοκόλλου (δεν αγγίζει εγκαταστάσεις/πιστ/εξοπλ) ──
function importProtoOnly(input){
  const file=input.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      const proto=data.proto||[];
      if(!Array.isArray(proto)||!proto.length){toast('Δεν βρέθηκαν κινήσεις πρωτοκόλλου στο αρχείο','error');return;}
      // Merge: αποφυγή διπλοτύπων βάσει proto_eisx+fak
      const existing=new Set(protocol.map(p=>(p.fak||'')+'|'+(p.proto_eisx||'')));
      let added=0,skipped=0;
      proto.forEach(p=>{
        const key=(p.fak||'')+'|'+(p.proto_eisx||'');
        if(!existing.has(key)||!p.proto_eisx){
          if(!p._id)p._id=uid();
          protocol.push(p);
          existing.add(key);
          added++;
        } else skipped++;
      });
      save('proto',protocol);
      updateBadges();renderProto();renderDash();populateYearFilter();
      toast(`✓ Εισαγωγή: ${added} νέες κινήσεις${skipped?' ('+skipped+' διπλότυπα παραλείφθηκαν)':''}`,'success');
    }catch(err){
      toast('Σφάλμα ανάγνωσης αρχείου: '+err.message,'error');
    }
  };
  reader.readAsText(file);
  input.value='';
}

// ── Εξαγωγή δεδομένων v2 σε JSON (τρέξε από το v2 αρχείο!) ──
function exportV2JSON(){
  const v2inst=localStorage.getItem('otp2_inst');
  const v2proto=localStorage.getItem('otp2_proto');
  if(!v2inst&&!v2proto){
    toast('Δεν βρέθηκαν δεδομένα v2 σε αυτό το αρχείο. Άνοιξε πρώτα το v2 αρχείο και πάτησε Εξαγωγή εκεί.','error');
    return;
  }
  const data={
    inst:JSON.parse(localStorage.getItem('otp2_inst')||'[]'),
    proto:JSON.parse(localStorage.getItem('otp2_proto')||'[]'),
    certs:JSON.parse(localStorage.getItem('otp2_certs')||'[]'),
    equip:JSON.parse(localStorage.getItem('otp2_equip')||'[]'),
    exported:new Date().toISOString(),
    version:'v2'
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='protokollo_v2_export.json';
  a.click();
  toast('Εξαγωγή ολοκληρώθηκε! Αποθηκεύτηκε ως protokollo_v2_export.json','success');
}

// ── Εισαγωγή από JSON αρχείο ──
function importFromJSON(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      // Support both v2 export format and raw arrays
      const inst=data.inst||data;
      const proto=data.proto||[];
      const certs=data.certs||[];
      const equip=data.equip||[];
      if(!Array.isArray(inst)){toast('Μη έγκυρο αρχείο JSON','error');return;}
      applyImportData(inst,proto,certs,equip);
    }catch(err){
      toast('Σφάλμα ανάγνωσης αρχείου: '+err.message,'error');
    }
  };
  reader.readAsText(file);
  input.value=''; // reset so same file can be re-selected
}

// ── Κοινή λογική εφαρμογής εισαγωγής ──
function applyImportData(v2inst,v2proto,v2certs,v2equip){
  try{
    const newInst=v2inst.map(i=>({
      fak:i.fak||'',sheet:i.sheet||'',name:i.name||'',
      afm:i.afm||'',adeia:i.adeia||'',
      address:i.address||'',topothesia:i.topothesia||'',
      tel:i.tel||'',email:i.email||'',
      cat:i.cat||'',type:i.type||'',subtype:i.subtype||'',
      maps_link:i.maps_link||'',coords:i.coords||'',
      notes:i.notes||''
    }));
    // Ensure proto entries have _id
    const newProto=v2proto.map(p=>{
      // v2 field name mapping
      const mapped={
        _id:p._id||uid(),
        fak:p.fak||p.FAK||'',
        sheet:p.sheet||p.tmima||'',
        aition:p.aition||p.aitoon||p.applicant||'',
        aitima:p.aitima||p.request||p.aitema||'',
        proto_eisx:p.proto_eisx||p.arProtoEisx||p.ar_proto_eisx||'',
        hm_xreosis:p.hm_xreosis||p.hmXreosis||p.date||'',
        mixanikos:p.mixanikos||p.engineer||'',
        hm_exerx:p.hm_exerx||p.hmExerx||'',
        energeia:p.energeia||p.action||'',
        proto_exerx:p.proto_exerx||p.arProtoExerx||'',
        proto_exerx_link:p.proto_exerx_link||p.link||p.pdf_link||'',
        teliko:p.teliko||p.finalDate||'',
        paralavi:p.paralavi||'',
        notes:p.notes||p.paratirisis||'',
        status:p.status||''
      };
      return mapped;
    });

    installations=newInst;
    protocol=newProto;
    certificates=v2certs;
    equipment=v2equip;

    save('inst',installations);
    save('proto',protocol);
    save('certs',certificates);
    save('equip',equipment);
    localStorage.setItem('otp3_v2_imported','done');

    const sec=document.getElementById('import-section');
    if(sec)sec.style.display='none';

    updateBadges();renderDash();renderInst();renderProto();renderCerts();renderEquip();populateYearFilter();
    toast(`✓ Μεταφορά: ${newInst.length} εγκαταστάσεις, ${newProto.length} κινήσεις πρωτοκόλλου`,'success');
  }catch(e){
    toast('Σφάλμα κατά τη μεταφορά: '+e.message,'error');
  }
}


