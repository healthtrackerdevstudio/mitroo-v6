// ══ NAV ══
function showView(v){
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el=>el.classList.remove('active'));
  document.getElementById('view-'+v).classList.add('active');
  const navBtn=document.getElementById('nav-'+v);
  if(navBtn) navBtn.classList.add('active');
  else {
    // Sub-views χωρίς δικό τους nav button (πχ docgen-koin-mgr, docgen-para-mgr)
    // κρατάνε ενεργό το nav-docgen
    const dgBtn=document.getElementById('nav-docgen');
    if(dgBtn && v.startsWith('docgen')) dgBtn.classList.add('active');
  }
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
  else if(v==='docgen-para-mgr'){dgRenderParaMgrList();}
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
  const sv=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  sv('badge-inst',installations.length);
  sv('badge-proto',protocol.length);
  sv('badge-certs',certificates.length);
  sv('badge-equip',equipment.length);
  sv('badge-nomos',(typeof nomosIndex!=='undefined'?nomosIndex.length:0));
  sv('s-proto',protocol.length);
  sv('s-certs',certificates.length);
  sv('s-equip',equipment.length);
  // Ενημέρωση stats bar νομοθεσίας
  if(typeof nomosUpdateStats==='function') nomosUpdateStats();
}

