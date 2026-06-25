// ══ MAP ICONS ══
const MAP_ICONS = {
  'Πρατήριο Υγρών Καυσίμων': {color:'#1a4a8a', emoji:'⛽', label:'Πρατήριο Υγρών'},
  'Μικτό Πρατήριο':          {color:'#1e6e3a', emoji:'⛽', label:'Μικτό Πρατήριο'},
  'Πρατήριο ΙΧ Container':   {color:'#0e7490', emoji:'🚛', label:'Container'},
  'Στεγασμένος Σταθμός':     {color:'#7c3aed', emoji:'🅿️', label:'Στεγ. Σταθμός'},
  'Υπαίθριος Σταθμός':       {color:'#6d28d9', emoji:'🅿️', label:'Υπαίθρ. Σταθμός'},
  'Συνεργείο':               {color:'#92400e', emoji:'🔧', label:'Συνεργείο'},
  'Πλυντήριο':               {color:'#0369a1', emoji:'🫧', label:'Πλυντήριο'},
  'Λιπαντήριο':              {color:'#854d0e', emoji:'🛢️', label:'Λιπαντήριο'},
  'ΙΚΤΕΟ':                   {color:'#b91c1c', emoji:'🔍', label:'ΙΚΤΕΟ'},
  'ΕΧΕΣ':                    {color:'#374151', emoji:'🚗', label:'ΕΧΕΣ'},
  'default':                 {color:'#64748b', emoji:'📍', label:'Εγκατάσταση'}
};

function getInstIconKey(inst){
  // Νέοι ξεχωριστοί τύποι → απευθείας lookup
  if(inst.type && MAP_ICONS[inst.type]) return inst.type;
  // Legacy fallback: subtype
  if(inst.subtype && MAP_ICONS[inst.subtype]) return inst.subtype;
  return 'default';
}

function makeMapIcon(inst,selected){
  const key=getInstIconKey(inst);
  const ico=MAP_ICONS[key]||MAP_ICONS['default'];
  const size=selected?40:32;
  const inactive=inst.sfrагisi||inst.anaklisi;
  const opacity=inactive?'0.5':'1';
  const border=selected?'3px solid '+ico.color:'2px solid '+ico.color;
  const bg=ico.color+'22';
  const shadow=selected?'box-shadow:0 0 0 3px '+ico.color+'55;':'';
  const html='<div style="width:'+size+'px;height:'+size+'px;border-radius:50%;'+
    'background:'+bg+';border:'+border+';display:flex;align-items:center;'+
    'justify-content:center;font-size:'+(size*0.55)+'px;opacity:'+opacity+';'+shadow+
    'cursor:pointer;">'+ico.emoji+'</div>';
  return L.divIcon({
    className:'',
    html:html,
    iconSize:[size,size],
    iconAnchor:[size/2,size],
    popupAnchor:[0,-size]
  });
}

function initMap(){
  if(leafletMap){
    // Μόνο αν το container έχει πλάτος → υπάρχει ήδη σωστά
    return;
  }
  leafletMap=L.map('leaflet-map').setView([38.0,23.8],10);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains:'abcd', maxZoom:19
  }).addTo(leafletMap);
  // Legend
  const leg=document.getElementById('map-legend');
  if(leg && typeof MAP_ICONS!=='undefined'){
    leg.innerHTML=Object.entries(MAP_ICONS).filter(([k])=>k!=='default').map(([k,v])=>
      '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:12px;background:'+v.color+'18;border:1px solid '+v.color+'40">'+
      '<span>'+v.emoji+'</span><span style="color:'+v.color+';font-weight:600;font-size:11px">'+v.label+'</span></span>'
    ).join('');
  }
}

function renderMap(){
  if(!leafletMap) return;
  // Καθαρισμός markers
  mapMarkers.forEach(function(m){leafletMap.removeLayer(m.marker);});
  mapMarkers=[];

  // Φίλτρα
  const fTop=(document.getElementById('map-f-topothesia')||{value:''}).value;
  const _mapTypeEl=document.getElementById('map-f-type');
  const fTypes=_mapTypeEl?Array.from(_mapTypeEl.selectedOptions).map(function(o){return o.value;}).filter(function(v){return v!=='';}):[]; 
  const fType=fTypes.length===1?fTypes[0]:'';
  const fCat=(document.getElementById('map-f-cat')||{value:''}).value;

  // Populate περιοχές
  const topoSel=document.getElementById('map-f-topothesia');
  if(topoSel&&topoSel.options.length<=1){
    const topos=[...new Set(installations.map(i=>i.topothesia).filter(Boolean))].sort();
    topos.forEach(function(t){const o=document.createElement('option');o.value=t;o.textContent=t;topoSel.appendChild(o);});
  }

  const fFakMap=(document.getElementById('map-search-fak')||{value:''}).value.toLowerCase();
  // Φιλτράρισμα
  let arr=installations.filter(function(i){return i.coords&&i.type!=='ΕΧΕΣ';});
  if(fTop) arr=arr.filter(function(i){return i.topothesia===fTop;});
  if(fTypes.length>0) arr=arr.filter(function(i){return fTypes.includes(i.type);});
  if(fCat) arr=arr.filter(function(i){return i.cat===fCat;});
  if(fFakMap) arr=arr.filter(function(i){return (i.fak+' '+i.name).toLowerCase().includes(fFakMap);});
  let validCount=0;
  const bounds=[];

  arr.forEach(function(inst){
    const parts=inst.coords.replace(/\s/g,'').split(',');
    if(parts.length<2) return;
    const lat=parseFloat(parts[0]);
    const lng=parseFloat(parts[1]);
    if(isNaN(lat)||isNaN(lng)) return;
    validCount++;
    bounds.push([lat,lng]);

    const isSel=mapSelected.has(inst.fak);
    const marker=L.marker([lat,lng],{icon:makeMapIcon(inst,isSel)});

    // Popup
    const hasCerts=certificates.filter(function(c){return c.fak===inst.fak;}).length;
    const today=new Date();today.setHours(0,0,0,0);
    const expiredCerts=certificates.filter(function(c){return c.fak===inst.fak&&c.expiry&&new Date(c.expiry)<today;}).length;
    const expBadge=expiredCerts>0?`<span style="color:#dc2626;font-weight:700"> ⚠️ ${expiredCerts} ληγμένα</span>`:'';
    const selBadge=isSel?'<span style="color:#059669;font-weight:700"> ✓ Επιλεγμένο</span>':'';

    marker.bindPopup(
      `<div style="font-size:13px;min-width:210px">`
      +`<div style="font-weight:700;margin-bottom:4px">${esc(inst.fak)}</div>`
      +`<div style="color:#475569;margin-bottom:6px">${esc(inst.name)}</div>`
      +`<div style="font-size:11px;color:#64748b">${esc(inst.topothesia||'')} ${esc(inst.address||'')}</div>`
      +`<div style="font-size:11px;margin-top:4px">${esc(inst.type||'')}${inst.subtype?' — '+esc(inst.subtype):''}</div>`
      +`<div style="font-size:11px;margin-top:4px">📄 ${hasCerts} πιστ/κά${expBadge}</div>`
      +`<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">`
      +`<button onclick="leafletMap.closePopup();navToInst('${esc(inst.fak)}')" style="font-size:11px;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#f8fafc">🏢 Εγκατάσταση</button>`
      +`<button onclick="leafletMap.closePopup();navToProto('${esc(inst.fak)}')" style="font-size:11px;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:#f8fafc">📋 Πρωτόκολλο</button>`
      +`<button onclick="mapToggleSelect('${esc(inst.fak)}')" style="font-size:11px;padding:3px 8px;border:1px solid #cbd5e1;border-radius:4px;cursor:pointer;background:${isSel?'#dcfce7':'#f8fafc'}">${isSel?'✓ Επιλεγμένο':'🗺️ Δρομολόγιο'}</button>`
      +`</div>${selBadge}</div>`
    );

    marker.addTo(leafletMap);
    mapMarkers.push({fak:inst.fak,marker:marker,lat:lat,lng:lng});
  });

  // Fit bounds
  if(bounds.length>0) leafletMap.fitBounds(bounds,{padding:[30,30]});
  if(bounds.length===1) leafletMap.setZoom(15);

  // Ενημέρωση counter
  const countEl=document.getElementById('map-count');
  if(countEl) countEl.textContent=validCount+' εγκαταστάσεις με συντεταγμένες από '+installations.length+' συνολικά';
  updateMapSelectedInfo();
}

function mapToggleSelect(fak){
  if(mapSelected.has(fak)) mapSelected.delete(fak);
  else mapSelected.add(fak);
  renderMap();
  // Κλείσε popup
  leafletMap.closePopup();
}

function mapSelectAll(){
  mapMarkers.forEach(function(m){mapSelected.add(m.fak);});
  renderMap();
}

function mapClearAll(){
  mapSelected.clear();
  renderMap();
}

function updateMapSelectedInfo(){
  const info=document.getElementById('map-selected-info');
  if(!info) return;
  if(mapSelected.size===0){
    info.textContent='Κλικ σε pin → popup → "+ Δρομολόγιο" για επιλογή εγκαταστάσεων';
    return;
  }
  const names=[...mapSelected].map(function(fak){
    const i=installations.find(function(x){return x.fak===fak;});
    return i?i.fak:'?';
  }).join(' → ');
  info.innerHTML='<strong>'+mapSelected.size+' επιλεγμένες:</strong> '+esc(names)
    +' &nbsp;<button onclick="mapRouteSelected()" style="font-size:11px;padding:3px 10px;background:#2563eb;color:#fff;border:none;border-radius:4px;cursor:pointer">🧭 Άνοιγμα Δρομολογίου</button>';
}

function mapRouteSelected(){
  if(mapSelected.size===0){toast('Επέλεξε εγκαταστάσεις από τον χάρτη','error');return;}
  const coords=[];
  [...mapSelected].forEach(function(fak){
    const m=mapMarkers.find(function(x){return x.fak===fak;});
    if(m) coords.push(m.lat+','+m.lng);
  });
  if(coords.length===0){toast('Οι επιλεγμένες εγκαταστάσεις δεν έχουν συντεταγμένες','error');return;}
  if(coords.length===1){
    window.open('https://www.google.com/maps/search/?api=1&query='+coords[0],'_blank');
  } else {
    const origin=coords[0];
    const dest=coords[coords.length-1];
    const waypoints=coords.slice(1,-1).join('|');
    let url='https://www.google.com/maps/dir/'+origin+'/';
    if(waypoints) url+=waypoints.replace(/\|/g,'/')+'/';
    url+=dest;
    window.open(url,'_blank');
  }
}


// ── Διαλειτουργικότητα: από modal εγκατάστασης → χάρτης ──
function navToMap(fak){
  closeAllModals();
  showView('map');
  setTimeout(function(){
    if(!leafletMap){ initMap(); }
    // Βρες το marker του ΦΑΚ και άνοιξε το popup
    const found = mapMarkers.find(function(m){ return m.fak===fak; });
    if(found){
      leafletMap.setView([found.lat, found.lng], 15);
      found.marker.openPopup();
    } else {
      // Η εγκατάσταση δεν έχει συντεταγμένες
      toast('⚠️ Η εγκατάσταση δεν έχει καταχωρημένες συντεταγμένες στον χάρτη','info');
    }
  }, 150);
}
