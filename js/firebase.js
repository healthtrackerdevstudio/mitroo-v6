// ══ FIREBASE ══
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAy85ZlyBN2XhxM0YomF5e-79Hh7pXMD1I",
  authDomain: "mhtroo-egkatastaseon.firebaseapp.com",
  projectId: "mhtroo-egkatastaseon",
  storageBucket: "mhtroo-egkatastaseon.firebasestorage.app",
  messagingSenderId: "147489897930",
  appId: "1:147489897930:web:3c33bbbd98503424c7a333"
};

// Ανίχνευση mode: αν τρέχει από http → Firebase mode
const USE_FIREBASE = (location.protocol==='http:'||location.protocol==='https:');
let db = null;

function initFirebase(){
  if(!USE_FIREBASE) return;
  try {
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    window.fbAuth = firebase.auth();
    console.log('Firebase initialized OK');
  } catch(e) {
    console.error('Firebase init error:', e);
  }
}

// Firebase collections
const FB_COLLECTIONS = {
  inst:  'installations',
  certs: 'certificates',
  equip: 'equipment',
  koin:  'koinopoiiseis',
  tpl:   'templates'
};

// Αποθήκευση array σε Firestore ως single document
async function fbSave(collection, data){
  if(!db) return;
  try {
    await db.collection(collection).doc('data').set({items: data, updated: new Date().toISOString()});
  } catch(e) { console.error('fbSave error:', collection, e); }
}

// Φόρτωση array από Firestore
async function fbLoad(collection){
  if(!db) return null;
  try {
    const doc = await db.collection(collection).doc('data').get();
    if(!doc.exists) return [];
    const data = doc.data();
    // Υποστήριξη και array και JSON string
    let items = data.items;
    if(typeof items === 'string'){
      try { items = JSON.parse(items); } catch(e){ items = []; }
    }
    return Array.isArray(items) ? items : [];
  } catch(e) { console.error('fbLoad error:', collection, e); return null; }
}

// ══ CHUNKED PROTOCOL (1000 κινήσεις/chunk) ══
const PROTO_CHUNK_SIZE = 1000;

async function fbSaveProto(collection, data){
  if(!db) return;
  try {
    const chunks = [];
    for(var ci=0; ci<data.length; ci+=PROTO_CHUNK_SIZE){
      chunks.push(data.slice(ci, ci+PROTO_CHUNK_SIZE));
    }
    const batch = db.batch();
    chunks.forEach(function(chunk, idx){
      batch.set(db.collection(collection).doc('chunk_'+idx),
        {items:chunk, updated:new Date().toISOString()});
    });
    batch.set(db.collection(collection).doc('_meta'),
      {chunks:chunks.length, total:data.length, updated:new Date().toISOString()});
    await batch.commit();
    // Αποθήκευση και στο localStorage ως backup
    try{localStorage.setItem('proto_fb_backup_'+collection, JSON.stringify(data));}catch(e){}
  } catch(e) { console.error('fbSaveProto error:', e); }
}

async function fbLoadProto(collection){
  if(!db) return null;
  try {
    const meta = await db.collection(collection).doc('_meta').get();
    if(!meta.exists){
      // Fallback: παλιό format single doc
      const old = await db.collection(collection).doc('data').get();
      if(old.exists){ const it=old.data().items||[]; return Array.isArray(it)?it:[]; }
      return [];
    }
    const numChunks = meta.data().chunks||0;
    if(numChunks===0) return [];
    const promises = [];
    for(var i=0; i<numChunks; i++) promises.push(db.collection(collection).doc('chunk_'+i).get());
    const docs = await Promise.all(promises);
    var all = [];
    docs.forEach(function(d){ if(d.exists) all=all.concat(d.data().items||[]); });
    return all;
  } catch(e) {
    // Fallback: localStorage backup
    console.error('fbLoadProto error:', e);
    try{
      const bk=localStorage.getItem('proto_fb_backup_'+collection);
      if(bk) return JSON.parse(bk);
    }catch(e2){}
    return null;
  }
}

// Real-time listener για κοινά δεδομένα
function fbListen(collection, callback){
  if(!db) return;
  db.collection(collection).doc('data').onSnapshot(snap => {
    if(snap.exists) callback(snap.data().items || []);
  });
}


// KEYS και CREDS ορίζονται στο config.js

