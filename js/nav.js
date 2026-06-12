// ══ NAV ══
function showView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  document.getElementById('nav-'+v).classList.add('active');
  // Re-render active view to ensure fresh data
  if(v==='proto')renderProto();
  else if(v==='inst')renderInst();
  else if(v==='certs')renderCerts();
  else if(v==='equip')renderEquip();
  else if(v==='stats')renderStats();
  else if(v==='inst-stats'){
    // Καλούμε πάντα με μικρό delay για να είναι έτοιμο το DOM
    setTimeout(function(){
      populateInstStatsFilters();
      renderInstStats();
    }, 100);
  }
  else if(v==='docgen'){dgInit();dgRenderKoinMgr&&dgRenderKoinMgr();}
  else if(v==='docgen-koin-mgr'){dgRenderKoinMgr();dgPopulateMgrCat();}
  else if(v==='map'){
    if(!leafletMap){ initMap(); }
    setTimeout(function(){
      if(leafletMap){
        leafletMap.invalidateSize(true);
        renderMap();
      }
    }, 50);
  }
  else if(v==='nomos')renderNomos();
  else if(v==='dash')renderDash();
}

// ══ BADGES ══
function updateBadges(){
  document.getElementById('badge-inst').textContent=installations.length;
  document.getElementById('badge-proto').textContent=protocol.length;
  document.getElementById('badge-certs').textContent=certificates.length;
  document.getElementById('badge-equip').textContent=equipment.length;
  document.getElementById('badge-nomos').textContent=nomosIndex.length;
  document.getElementById('s-inst').textContent=installations.length;
  document.getElementById('s-proto').textContent=protocol.length;
  document.getElementById('s-certs').textContent=certificates.length;
  document.getElementById('s-equip').textContent=equipment.length;
}

