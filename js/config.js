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
  'ΙΚΤΕΟ':'ΙΚΤΕΟ','Άλλο…':'Λοιπές Εγκαταστάσεις'
};

// ══ STATE ══
// ══ MIGRATION: Λοιπές+subtype → νέος τύπος ══
let _migrated=false;
function migrateInstTypes(){
  if(_migrated) return; // τρέχει μόνο μια φορά ανά session
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
  'Πιστ. Αεροφυλακίου','Πιστ. Αεροφυλακίου LPG','Ετήσια Ανταποδοτικά Τέλη',
  'Πιστ. Δεξαμενών Υγρών','Πιστ. Δεξαμενής LPG',
  'Πιστ. Υδραυλικής Δοκιμασίας Υγρών','Πιστ. Υδραυλικής Δοκιμασίας LPG',
  'Πιστ. Ανυψωτικού','ΒΗΕ','Πιστ. Stage II',
  'Πιστ. Εξαεριστικών Δεξαμενών Υγρών','Πιστ. Ανιχνευτών LPG',
  'Πιστ. Ανιχνευτών Αρθ. 25','Τακτοποίηση','Κυκλοφοριακή Σύνδεση','Άδεια Δόμησης'
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

