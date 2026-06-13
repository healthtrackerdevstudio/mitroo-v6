// ══ SERVER MODE DETECTION ══
let _serverRole  = sessionStorage.getItem('srv_role')  || 'user';

// API helper
async function apiCall(method, endpoint, data) {
  if(typeof SERVER_MODE === 'undefined' || !SERVER_MODE) return null;
  try {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': _serverToken || ''
      }
    };
    if(data !== undefined) opts.body = JSON.stringify(data);
    const r = await fetch(API_BASE + endpoint, opts);
    const j = await r.json();
    if(r.status === 401) { doLogout(); return null; }
    return j;
  } catch(e) {
    console.error('API error:', e);
    return null;
  }
}

// Server-aware save
async function saveToServer(key, data) {
  if(typeof SERVER_MODE === 'undefined' || !SERVER_MODE) return;
  await apiCall('POST', '/data/' + key, data);
}

// Load all data from server
async function loadDataFromServer() {
  const [inst, proto, certs, equip] = await Promise.all([
    apiCall('GET', '/data/inst'),
    apiCall('GET', '/data/proto'),
    apiCall('GET', '/data/certs'),
    apiCall('GET', '/data/equip'),
  ]);
  if(inst  !== null) installations = inst;
  if(proto !== null) protocol      = proto;
  if(certs !== null) certificates  = certs;
  if(equip !== null) equipment     = equip;
  // Build dynamic lists
  aitions_list=[...new Set(protocol.map(p=>p.aition).filter(Boolean))].sort();
  aitimata_list=[...new Set([...(aitimata_list_defaults||[]),...protocol.map(p=>p.aitima).filter(Boolean),...protocol.map(p=>p.energeia).filter(Boolean)])].sort();
  engineers_dynamic=[...new Set([...engineers,...protocol.map(p=>p.mixanikos).filter(Boolean)])].sort();
}

// ══ PERSISTENCE ══
function save(key,data){
  // Guest: μπλοκάρισμα αποθήκευσης κοινών δεδομένων
  if(_serverRole==='guest' && key!=='proto'){
    toast('⛔ Δεν έχεις δικαίωμα τροποποίησης','error');
    return;
  }
  // Πάντα αποθήκευση στο localStorage (backup + πρωτόκολλο)
  try{localStorage.setItem(KEYS[key],JSON.stringify(data));}catch(e){}
  // Firebase: κοινά δεδομένα
  if(USE_FIREBASE && db && FB_COLLECTIONS[key]){
    fbSave(FB_COLLECTIONS[key], data);
  }
  // Protocol: localStorage + Firebase chunked
  if(USE_FIREBASE && key==='proto'){
    if(db){
      const fbEmail=sessionStorage.getItem('fb_email')||'';
      if(fbEmail){
        const protoKey='protocol_'+fbEmail.toLowerCase().replace(/[@.]/g,'_');
        fbSaveProto(protoKey, data).catch(function(){
          // Αποτυχία Firebase — δεδομένα ασφαλή στο localStorage
          console.warn('Firebase unavailable — protocol saved locally only');
        });
      }
    }
    // Πάντα στο localStorage ανεξάρτητα από Firebase
  }
  // LAN server fallback (disabled in v5 — SERVER_MODE removed)
  // if(typeof SERVER_MODE !== 'undefined' && SERVER_MODE && !USE_FIREBASE) saveToServer(key,data);
}

function loadData(){
  if(USE_FIREBASE && db){
    // Firebase mode: φόρτωση κοινών από Firestore, πρωτόκολλο από localStorage
    Promise.all([
      fbLoad('installations'),
      fbLoad('certificates'),
      fbLoad('equipment'),
    ]).then(function(results){
      installations = results[0] || [];
      certificates  = results[1] || [];
      equipment     = results[2] || [];
      // Πρωτόκολλο: πάντα localStorage
      protocol = JSON.parse(localStorage.getItem(KEYS.proto)||'null')||[];
      // nomosIndex: φορτώνεται από nomosInit() μετά το login
      _afterLoad();
      // Real-time listeners για κοινά
      fbListen('installations', function(d){
        installations=d;
        updateBadges(); renderInst(); renderDash();
        // renderInstStats με μικρό delay για να είναι έτοιμα τα filters
        setTimeout(function(){ populateInstStatsFilters(); renderInstStats(); }, 200);
      });
      fbListen('certificates',  function(d){ certificates=d;  updateBadges(); renderCerts(); });
      fbListen('equipment',     function(d){ equipment=d;     renderEquip(); });
    });
    return;
  }
  // Local mode (file://): localStorage
  installations=JSON.parse(localStorage.getItem(KEYS.inst)||'null')||[];
  protocol=JSON.parse(localStorage.getItem(KEYS.proto)||'null')||[];
  certificates=JSON.parse(localStorage.getItem(KEYS.certs)||'[]');
  equipment=JSON.parse(localStorage.getItem(KEYS.equip)||'[]');
  // nomosIndex: φορτώνεται από nomosInit() μετά το login
  _afterLoad();
}

function _afterLoad(){
  aitions_list=[...new Set(protocol.map(p=>p.aition).filter(Boolean))].sort();
  aitimata_list=[...new Set([...(aitimata_list_defaults||[]),...protocol.map(p=>p.aitima).filter(Boolean),...protocol.map(p=>p.energeia).filter(Boolean)])].sort();
  engineers_dynamic=[...new Set([...engineers,...protocol.map(p=>p.mixanikos).filter(Boolean)])].sort();
  migrateInstTypes();
  updateBadges(); renderDash(); renderInst(); renderProto(); renderCerts(); renderEquip(); populateYearFilter(); renderInstStats();
}

