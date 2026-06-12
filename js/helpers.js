// ══ HELPERS ══
function uid(){return 'id_'+Date.now()+'_'+Math.random().toString(36).substr(2,6);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtDate(d){
  if(!d) return '';
  try{
    // Already dd/mm/yyyy
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(d))) return d;
    // yyyy-mm-dd (standard HTML date input)
    if(/^\d{4}-\d{2}-\d{2}/.test(String(d))){
      const parts=String(d).substring(0,10).split('-');
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    // Fallback: try Date parsing
    const dt=new Date(d);
    if(!isNaN(dt)) return dt.toLocaleDateString('el-GR',{day:'2-digit',month:'2-digit',year:'numeric'});
    return String(d);
  }catch(e){return String(d);}
}
// Normalizes any date string to yyyy-mm-dd for <input type="date">
function toISODate(d){
  if(!d) return '';
  const s=String(d).trim();
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0,10);
  // dd/mm/yyyy
  if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){
    const[dd,mm,yyyy]=s.split('/');
    return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  return s;
}
function clearOnEsc(inp,fn){if(event.key==='Escape'){inp.value='';window[fn]();}}

// ── SAVE FEEDBACK HELPER (v5.30) ──────────────────────────────────
// flashSaveThenClose — now a simple direct wrapper (no setTimeout)
// The 420ms animation was causing unreliable modal closing across browsers.
function flashSaveThenClose(modalId, cb){
  try{ closeModal(modalId); }catch(e){ console.error('closeModal:',e); }
  try{ if(cb) cb(); }catch(e){ console.error('flashSaveThenClose cb:',e); }
}

function toast(msg,type='success'){
  const el=document.getElementById('toast');
  if(!el) return;
  // Force animation restart: remove class, trigger reflow, re-add class
  el.textContent=msg;
  el.className='';          // strip all classes first
  void el.offsetWidth;      // force reflow — browser "forgets" animation ran
  el.className='show '+type;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){ el.classList.remove('show'); },3200);
}

