// ══ CONSTANTS & STATE ══


const KEYS={inst:'otp3_inst',proto:'otp3_proto',certs:'otp3_certs',equip:'otp3_equip',nomos:'otp3_nomos'};
const CREDS={user:'admin',pass:'protocol2024'};


// ══ ΤΥΠΟΙ ΕΓΚΑΤΑΣΤΑΣΕΩΝ ══
const INST_TYPES = [
  'Πρατήριο Υγρών Καυσίμων',
  'Μικτό Πρατήριο',
  'Πρατήριο ΙΧ Container',
  'Στεγασμένος Σταθμός',
  'Υπαίθριος Σταθμός',
  'Σταθμός Βαρέων Οχημάτων',
  'Parking Σκαφών',
  'Συνεργείο',
  'Πλυντήριο',
  'Λιπαντήριο',
  'ΙΚΤΕΟ',
  'ΕΧΕΣ'
];
// Τύποι με βυτιοφόρο
const TYPES_WITH_VYTIO = ['Πρατήριο Υγρών Καυσίμων','Μικτό Πρατήριο'];
// Τύποι που ΔΕΝ εμφανίζονται στα φίλτρα πρατηρίων
const TYPES_FUEL = ['Πρατήριο Υγρών Καυσίμων','Μικτό Πρατήριο','Πρατήριο ΙΧ Container'];
// Migration: παλιά Λοιπές+subtype → νέος τύπος
const LEGACY_SUBTYPE_MAP = {
  'Συνεργείο':'Συνεργείο','Πλυντήριο':'Πλυντήριο','Λιπαντήριο':'Λιπαντήριο',
  'Στεγασμένος Σταθμός':'Στεγασμένος Σταθμός','Υπαίθριος Σταθμός':'Υπαίθριος Σταθμός',
  'Σταθμός Βαρέων Οχημάτων':'Σταθμός Βαρέων Οχημάτων','Parking Σκαφών':'Parking Σκαφών',
  'ΙΚΤΕΟ':'ΙΚΤΕΟ','Άλλο…':'Λοιπές Εγκαταστάσεις'
};

// ══ STATE ══
// ══ MIGRATION: Λοιπές+subtype → νέος τύπος ══
let _migrated=false;
function migrateInstTypes(){
  if(_migrated) return;
  _migrated=true;
  let changed=0;
  installations.forEach(function(i){
    if(i.type==='Λοιπές Εγκαταστάσεις' && i.subtype){
      const newType=LEGACY_SUBTYPE_MAP[i.subtype]||'Λοιπές Εγκαταστάσεις';
      if(newType!==i.type){ i.type=newType; i.subtype=''; changed++; }
    }
  });
  if(changed>0){ save('inst',installations); console.log('Migration: '+changed+' εγγραφές ενημερώθηκαν'); }
}

let _certMigrated=false;
function migrateCertTypes(){
  if(_certMigrated) return;
  _certMigrated=true;
  // Χάρτης μετονομασίας: παλιό → νέο
  const RENAME_MAP={
    'Πυρασφάλεια':              'Πιστ. Πυροπροστασίας',
    'Πιστ. Αεροφυλακίου':      'Πιστ. Αεροσυμπιεστή',
    'Πιστ. Αεροφυλακίου LPG':  'Πιστ. Αεροσυμπιεστή LPG',
    // Προσαρμογή ορθογραφίας custom τύπων
    'Πιστοποητικο συμμορφωσης CNG': 'Πιστ. Συμμόρφωσης CNG',
    'Πιστοποιητικο ανιχνευτων CO':  'Πιστ. Ανιχνευτών CO',
    'Βεβαιωση ΕΥΔΑΠ':          'Βεβαίωση ΕΥΔΑΠ',
    'Χρηση Γης':                'Χρήση Γης',
    '1η Αδ Λειτυργιας':        '1η Άδεια Λειτουργίας',
    'Αδ Ιδρυσης':              'Άδεια Ίδρυσης',
    'Αδ Λειτουργιας Σταθμού':  'Άδεια Λειτουργίας Σταθμού'
  };
  // Τύποι που διαγράφονται (χωρίς αντικατάσταση)
  const DELETE_TYPES=new Set(['Πιστ. Δεξαμενών Υγρών LPG']);

  let renamed=0, deleted=0;
  const before=certificates.length;
  // Διαγραφή
  certificates=certificates.filter(function(c){
    if(DELETE_TYPES.has(c.type)){ deleted++; return false; }
    return true;
  });
  // Μετονομασία
  certificates.forEach(function(c){
    if(RENAME_MAP[c.type]){ c.type=RENAME_MAP[c.type]; renamed++; }
  });
  if(renamed>0||deleted>0){
    save('certs',certificates);
    console.log('[certMigration] Μετονομάστηκαν:'+renamed+' Διαγράφηκαν:'+deleted);
    toast('✓ Ενημέρωση τύπων πιστοποιητικών: '+renamed+' μετονομάστηκαν'+(deleted?' · '+deleted+' διαγράφηκαν':''),'success');
  }
}

let installations=[],protocol=[],certificates=[],equipment=[];
let nomosIndex=[]; // διαχειρίζεται αποκλειστικά από nomos.js
let leafletMap=null, mapMarkers=[], mapSelected=new Set();
let editInstId=null,editProtoId=null,editCertId=null,editEquipId=null;
let sortState={inst:{col:'fak',dir:1},proto:{col:'hm_xreosis',dir:-1},certs:{col:'expiry',dir:1},equip:{col:'fak',dir:1}};
let toastTimer;
let nomosSortState={col:'year',dir:-1};

const CERT_TYPES=[
  'Πιστ. Πυροπροστασίας','Ογκομετρικός Πίνακας','ΥΔΕ',
  'Πιστ. Αεροσυμπιεστή','Πιστ. Αεροσυμπιεστή LPG',
  'Ετήσια Ανταποδοτικά Τέλη',
  'Πιστ. Δεξαμενών Υγρών','Πιστ. Δεξαμενής LPG',
  'Πιστ. Υδραυλικής Δοκιμασίας Υγρών','Πιστ. Υδραυλικής Δοκιμασίας LPG',
  'Πιστ. Ανυψωτικού','ΒΗΕ','Πιστ. Stage II',
  'Πιστ. Εξαεριστικών Δεξαμενών Υγρών','Πιστ. Ανιχνευτών LPG',
  'Πιστ. Ανιχνευτών Αρθ. 25','Πιστ. Ανιχνευτών CO',
  'Πιστ. Συμμόρφωσης CNG',
  'Τακτοποίηση','Κυκλοφοριακή Σύνδεση','Άδεια Δόμησης',
  'Χρήση Γης','Βεβαίωση ΕΥΔΑΠ',
  '1η Άδεια Λειτουργίας','Άδεια Ίδρυσης','Άδεια Λειτουργίας Σταθμού'
];
const FUEL_TYPES=['U95','U95+','U98','U100','Dk','DkPremium','DΘ','DΦ','LPG','CNG','AdBlue'];

const FUEL_CATEGORIES={
  'Βενζίνες':['U95','U95+','U98','U100'],
  'Πετρέλαια':['Dk','DkPremium','DΘ','DΦ'],
  'Αέρια':['LPG','CNG']
};


// ══ LISTS for autocomplete ══
const engineers=['ΑΔΑΜΟΠΟΥΛΟΣ','ΓΕΩΡΓΟΠΟΥΛΟΣ','ΔΗΜΗΤΡΙΟΥ','ΖΑΧΑΡΙΑΔΗΣ','ΚΑΡΑΓΙΑΝΝΗΣ','ΠΑΠΑΔΟΠΟΥΛΟΣ','ΣΤΑΥΡΑΚΑΚΗΣ'];
let engineers_dynamic=[...engineers];
let aitions_list=[];
const aitimata_list_defaults=['Άδεια Δόμησης','Άδεια Εγκατάστασης','Άδεια Λειτουργίας','Ανανέωση Άδειας','Αυτοψία','ΒΗΕ','Γνωμοδότηση','Διοικητική Πράξη','Έγγραφη Απάντηση','Έγκριση Σχεδίων','Έλεγχος','Εγκατάσταση GPL','Εγκατάσταση CNG','Καταγγελία','Κυκλοφοριακή Σύνδεση','Μετρολογία','Ογκομετρικός Πίνακας','Πιστοποιητικό Πυροπροστασίας','Τακτοποίηση','Τροποποίηση Άδειας','ΥΔΕ','Χορήγηση Άδειας'];
let aitimata_list=[...aitimata_list_defaults];

