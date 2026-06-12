const MiniDocGen = {
  async generate(base64data, data) {
    const bin=atob(base64data), bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    const zip=new JSZip();
    const loaded=await zip.loadAsync(bytes.buffer);
    const proc=async(fn)=>{
      const f=loaded.file(fn); if(!f) return;
      let xml=await f.async('string');
      // 3 περάσματα normalize (split runs)
      for(let p=0;p<3;p++){const prev=xml; xml=MiniDocGen._norm(xml); if(xml===prev) break;}
      xml=MiniDocGen._loops(xml,data);
      xml=MiniDocGen._repl(xml,data);
      loaded.file(fn,xml);
    };
    await proc('word/document.xml');
    for(const p of ['word/header1.xml','word/header2.xml','word/header3.xml',
                    'word/footer1.xml','word/footer2.xml','word/footer3.xml']) await proc(p);
    return await loaded.generateAsync({type:'blob',
      mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
  },

  _esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/\n/g,'</w:t><w:br/><w:t xml:space="preserve">');
  },

  _norm(xml){
    // Αφαίρεσε spell markers
    xml=xml.replace(/<w:proofErr[^/]*\/>/g,'');
    // Run regex: χειρίζεται self-closing tags (π.χ. lastRenderedPageBreak) πριν <w:t>
    const rp=/<w:r(?:\s[^>]*)?>(?:<w:rPr>(?:(?!<w:t>)[\s\S])*?<\/w:rPr>)?(?:<w:[a-zA-Z]+\/>)*<w:t[^>]*>(.*?)<\/w:t>\s*<\/w:r>/gs;
    const runs=[]; let m;
    while((m=rp.exec(xml))!==null){
      const rpr=(/<w:rPr>[\s\S]*?<\/w:rPr>/s.exec(m[0])||[''])[0];
      runs.push({s:m.index,e:m.index+m[0].length,t:m[1],rpr});
    }
    const noWt=(a,b)=>!xml.slice(a,b).includes('<w:t');
    const out=[]; let pos=0,i=0;
    const OPENS=[['{{#','#','d'],['{{/','/',  'd'],['{{','','d'],['{#','#','s'],['{/','/','s'],['{','','s']];
    while(i<runs.length){
      const r=runs[i]; const ts=r.t.trim();
      let pfx=null,bw=null,tb='';
      for(const [sfx,p,b] of OPENS){
        if(ts.endsWith(sfx)){pfx=p;bw=b;tb=r.t.slice(0,r.t.lastIndexOf(sfx));break;}
      }
      if(pfx!==null&&i+2<runs.length){
        const cl=bw==='d'?'}}':'}';
        const parts=pfx?[pfx]:[];
        let j=i+1,ok=false;
        while(j<runs.length&&j<i+10){
          const tj=runs[j].t.trim();
          if(tj===cl||tj.startsWith(cl)){
            const adj=Array.from({length:j-i},(_,k)=>k+i)
              .every(k=>noWt(runs[k].e,runs[k+1].s));
            const key=parts.join('');
            if(adj&&/^[#\/]?[a-zA-Z_]\w*$/.test(key)){
              out.push(xml.slice(pos,r.s));
              if(tb.trim()) out.push('<w:r>'+r.rpr+'<w:t xml:space="preserve">'+MiniDocGen._esc(tb)+'</w:t></w:r>');
              out.push('<w:r><w:t>'+(bw==='d'?'{{'+key+'}}':'{'+key+'}')+'</w:t></w:r>');
              const af=tj.slice(cl.length).trim();
              if(af) out.push('<w:r><w:t xml:space="preserve"> '+MiniDocGen._esc(af)+'</w:t></w:r>');
              pos=runs[j].e;i=j+1;ok=true;
            }
            break;
          } else if(/^[a-zA-Z0-9_#\/]+$/.test(tj)){parts.push(tj);j++;}
          else break;
        }
        if(!ok) i++;
      } else i++;
    }
    out.push(xml.slice(pos));
    return out.join('');
  },

  _loops(xml,data){
    // {#key}...{/key} ή {{#key}}...{{/key}}
    const keys=[...new Set([...[...xml.matchAll(/\{#(\w+)\}/g)],
                             ...[...xml.matchAll(/\{\{#(\w+)\}\}/g)]].map(m=>m[1]))];
    let res=xml;
    for(const key of keys){
      const arr=data[key]; if(!Array.isArray(arr)||!arr.length) continue;
      let op=-1; for(const p of ['{{#'+key+'}}','{#'+key+'}']){const i=res.indexOf(p);if(i>=0){op=i;break;}}
      if(op<0) continue;
      let cp=-1; for(const p of ['{{/'+key+'}}','{/'+key+'}']){const i=res.indexOf(p,op);if(i>=0){cp=i;break;}}
      if(cp<0){console.warn('No close for loop:',key);continue;}
      const ps=res.lastIndexOf('<w:p ',op), pe=res.indexOf('</w:p>',op)+6;
      const cs=res.lastIndexOf('<w:p ',cp), ce=res.indexOf('</w:p>',cp)+6;
      const tpl=res.slice(pe,cs);
      const expanded=arr.map(item=>{
        let t=tpl;
        for(const [k,v] of Object.entries(item)){
          const ev=MiniDocGen._esc(String(v==null?'':v));
          t=t.split('{{'+k+'}}').join(ev).split('{'+k+'}').join(ev);
        }
        return t;
      }).join('');
      res=res.slice(0,ps)+expanded+res.slice(ce);
    }
    return res;
  },

  _repl(xml,data){
    // {{key}} πρώτα
    let res=xml.replace(/\{\{(\w+)\}\}/g,(_,key)=>{
      if(key in data&&!Array.isArray(data[key])) return MiniDocGen._esc(String(data[key]==null?'':data[key]));
      return _;
    });
    // {key} μετά (όχι loop markers)
    res=res.replace(/\{([a-zA-Z_]\w*)\}/g,(_,key)=>{
      if(key in data&&!Array.isArray(data[key])) return MiniDocGen._esc(String(data[key]==null?'':data[key]));
      return _;
    });
    return res;
  }
};

// ══ DOC GENERATOR ══
const DG_KOIN_KEY='docgen_koinopoiiseis';
const DG_TPL_KEY='docgen_templates';
const DG_KOIN_DEFAULT=[{"id":1,"cat":"ΑΝΑΠΤΥΞΗ","name":"Δ/νση Ανάπτυξης ΠΕ Ανατ. Αττικής Τμήμα Εμπορίου","addr":"17ο χλμ Λ. Μαραθώνος,     15351 Παλλήνη","email":"","region":""},{"id":2,"cat":"ΑΤ","name":"Ν. Μάκρης","addr":"Λ. Διονύσου 3, 19005 Νέα Μάκρη","email":"","region":"Ν.Μακρη, Μαραθωνας"},{"id":3,"cat":"ΑΤ","name":"Λαυρεωτικής","addr":"Αγίας Παρασκευής 18 19500 Λάυριο","email":"at.lavreotikis@astynomia.gr","region":""},{"id":4,"cat":"ΑΤ","name":"Ραφηνας-Πικερμιου","addr":"Προποντίδος 6 19009 Ραφήνα","email":"at.rafinas@astynomia.gr","region":""},{"id":5,"cat":"ΑΤ","name":"Αχαρνων","addr":"Πληθώνος Γεμιστού 52-54, 13671 Αχαρνες","email":"ataacharnon@astynomia.gr","region":""},{"id":6,"cat":"ΑΤ","name":"Παλλήνης","addr":"Θεσσαλονίκης 30 & Βοιωτίας, 15344 Γερακας","email":"atpallinis@hellenicpolice.gr","region":""},{"id":7,"cat":"ΑΤ","name":"Ωρωπού","addr":"1ο χλμ. Λ.Σκάλας Ωρωπού-Χαλκουτσίου, 190 15","email":"atoropion@astynomia.gr","region":"Ωρωπος"},{"id":8,"cat":"ΑΤ","name":"Παιανίας","addr":"Καραολή και Δημητρίου 25, Παιανία 190 02","email":"at.paianias@astynomia.gr","region":"Παιανιας, Γλυκα Νεαρ"},{"id":9,"cat":"ΑΤ","name":"Σπατων -Αρτεμιδος","addr":"Μάρκου 2, Σπάτα 190 04","email":"atspaton@astynomia.gr","region":"Σπατα, Αρτεμιδα"},{"id":10,"cat":"ΑΤ","name":"Μαρκοπούλου","addr":"Λ.Πορτο Ραφτη 72, 19003 Μαρκόπουλο","email":"atmarkopoulou@astynomia.gr","region":""},{"id":11,"cat":"ΑΤ","name":"Κορωπίου","addr":"Αντωνίου Κιούση 19, Κορωπί 194 00","email":"atkropias@astynomia.gr","region":""},{"id":12,"cat":"ΑΤ","name":"Αστυνομικός Σταθμός Εκάλης","addr":"Μιμόζας & Αγορας, 14578 Εκάλη","email":"","region":"Δροσια"},{"id":13,"cat":"ΑΤ","name":"Βαρης Βουλας Βουλιαγμενης","addr":"Αφροδιτης 5, 16671 Βουλιαγμενη","email":"atvouliagmenis@astynomia.gr","region":"ΒΒΒ"},{"id":14,"cat":"ΑΤ","name":"Αστυν. Σταθμος Καλυβίων","addr":"Σπ. Μαλτέζου & Αντ. Λαδά, 190 10, Καλύβια","email":"askalyvion@astynomia.gr","region":""},{"id":15,"cat":"ΑΤ","name":"Διονυσου","addr":"Ηρ. Πολυτεχνείου 5-Αγ. Στέφανος,14565","email":"atdionusou@astynomia.gr","region":""},{"id":16,"cat":"ΑΤ","name":"Αυλωνα","addr":"Παλαιά Εθνική Οδός Αθηνών - Χαλκίδας, 19011 Αυλώνας","email":"atavlonos@astynomia.gr","region":""},{"id":17,"cat":"ΑΤ","name":"Αστυν. Σταθμός Πορτο Ραφτη","addr":"Πόρτο Ράφτη1, Τ.Κ.: 19 003","email":"as.portorafti@astynomia.gr","region":""},{"id":18,"cat":"ΑΤ","name":"Κερατεας","addr":"Δ. Λιούμη & Β. Παπανικολάου, Τ.Κ. 190 01, Κερατέα","email":"atkerateas@astynomia.gr","region":""},{"id":19,"cat":"ΑΤ","name":"Σαρωνικου","addr":"Κύπρου έναντι 15Α, περιοχή Χερώνες, Τ.Κ. 19010, Λαγονήσι Καλυβίων Σαρωνικού Αττικής","email":"atsaronikou@astynomia.gr","region":""},{"id":20,"cat":"ΑΤ","name":"Μαραθώνος","addr":"Λ.Διονυσίου 3,19005, Νέα Μάκρη Αττικής","email":"atmarathona@astynomia.gr","region":""},{"id":21,"cat":"ΑΤ","name":"Καπανδριτίου","addr":"Λεωφόρος Καλάμου 29, 19014 Καπανδρίτι Αττικής","email":"","region":""},{"id":22,"cat":"Δ.Ο.Υ","name":"ΦΑΕ Αθηνων","addr":"Λεωφ. Ελ. Βενιζέλου 55, 17671 Καλλιθέα","email":"","region":""},{"id":23,"cat":"Δ.Ο.Υ","name":"Δ.Ο.Υ. Παλλήνης","addr":"Εθ. Αντιστάσεως 43, Παλλήνη 153 51","email":"","region":""},{"id":24,"cat":"Δ.Ο.Υ","name":"ΔΥΟ Κορωπίου","addr":"Λεωφ. Βασιλέως Κωνσταντίνου 156, Κορωπί 194 00","email":"","region":""},{"id":25,"cat":"Δ.Ο.Υ","name":"Αγίων Αναργύρων","addr":"Πριγκιπίσσης Όλγας 3 & Λ. Δημοκρατίας, 13561 Αγιοι Αναργυροι","email":"","region":""},{"id":26,"cat":"Δ.Ο.Υ","name":"Γλυφαδας","addr":"Δημητρίου Γούναρη 227, 16674 Γλυφάδα","email":"","region":""},{"id":27,"cat":"Δ.Ο.Υ","name":"Κηφισιας","addr":"Αχαρνών 43, Κηφισιά 145 61, Ελλάδα","email":"","region":""},{"id":28,"cat":"ΕΛΥΤ","name":"ΕΛΥΤ Αττικλης","addr":"Ακτή Κονδύλη 32, 18545 Πειραιάς","email":"elytatteaudun@1986.syzefxis.gov.gr","region":""},{"id":29,"cat":"Π.Υ","name":"Πυροσβεστική Υπηρεσία Νέας Μάκρης","addr":"35ο χλμ Λ. Μαραθώνος , 19005 Ν. Μακρη","email":"","region":""},{"id":30,"cat":"Π.Υ","name":"ΣΤ Γραφειο Πυρασφαλείας/ 6ος Πυρκος Σταθμός","addr":"Ολυμπιακό Χωρίο , 13676 Θρακομακεδόνες","email":"","region":"Καλαμος, Αγ Στεφανος, Καπανδριτι, κρυονερι, Αχαρνες"},{"id":31,"cat":"Π.Υ","name":"Δ΄ Γραφείο Πυρασφαλείας 12ος Πυροσβεστικός Σταθμός","addr":"Κ. Μιλήση 3 & Λ. Μαραθώνος, 153 51 Παλλήνη","email":"","region":"Γλυκα Νερα, Παλλήνη"},{"id":32,"cat":"Π.Υ","name":"ΔΙ.Π.Υ  Ανατολικής Αττικής /Γραφειο Πυρασφαλείας","addr":"Περιφερειακή οδός Μαρκοπούλου-Π. Ράφτη  19003 Μαρκόπουλο","email":"dpy.anatattik@psnet.gr","region":"Μαρκόπουλο, Λαυριο, Σαρωνικός, Ν. Μακρη, Κορωπί, Μαραθωνας"},{"id":33,"cat":"Π.Υ","name":"ΔΙΠΥ Αθηνων","addr":"Πειραιώς 31, Αθήνα 105 53","email":"dpyathin@psnet.gr","region":""},{"id":34,"cat":"Π.Υ","name":"Πυροσβεστική Υπηρεσία Λαυρίου","addr":"Πλ Ηρώων, 19500 Λαύριο","email":"","region":""},{"id":35,"cat":"Π.Υ","name":"ΔΙΠΥ Βοιωτιας","addr":"Αισχύλου και Φιλολαου, Λιβαδεια 32131","email":"","region":""},{"id":36,"cat":"ΠΕΡΙΒΑΛΛΟΝ","name":"Δ/νση Περιβάλλοντος","addr":"Πολυτεχνείου 4, 104 33 Αθήνα","email":"","region":""},{"id":37,"cat":"ΤΕΧΝΙΚΕΣ","name":"Τεχνικες Υπηρεσίες Δημου Ραφηνας","addr":"Αραφινίδων Αλών 12, 19009 Ραφήνα","email":"","region":""},{"id":38,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δήμος Μαραθώνος Τεχνική Υπηρεσία","addr":"Λ, Μαραθώνος 104, 19005 Ν. Μάκρη","email":"","region":""},{"id":39,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δήμος Μαρκοπούλου Μεσογαίας/Τεχνικές Υπηρεσίες","addr":"Παπαδημητρίου 33, 19003 Μαρκόπουλο","email":"ydom@markopoulo.gr","region":"Δήμοι Ανάβυσσος,  Καλύβια Θορικού, Κορωπί, Μαρκόπουλο Μεσογαίας, Παιανίας. Κοινότητες: Κουβαράς, Παλαιά Φώκαια, Σαρωνίδα"},{"id":40,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημος Παιανιας Τεχνικες υπηρεσίας","addr":"Καραολή Δημητρίου 38Α 19002 Παιανία","email":"","region":"Γλυκα νερα, Παιανια"},{"id":41,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημος Αχαρνων Τεχνικες Υπηρεσιες","addr":"Φιλαδελφειας 87 και Μποσδα 13673 Αχαρνες","email":"","region":"Ελευθεριάδου 2132072438"},{"id":42,"cat":"ΤΕΧΝΙΚΕΣ","name":"Τεχνικες Υπηρεσίες Δημου ΒΒΒ","addr":"Κ. Καραμανλη 18, 16673 Βούλα","email":"","region":""},{"id":43,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημος Ωρωπου/ Τεχνικες Υπηρεσίες","addr":"Λεωφορος Χαλκουτσίου 50, 19015 Σκαλα Ωρωπού","email":"ty@oropos.gov.gr","region":"Καλαμος, Ωρωπός, Πολυδενδρι, Αυλώνα, Μαλακασσα, Χαλκούτσι, Δροσια, Καπανδριτι"},{"id":44,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημος Λαυρεωτικής/ Τεχνικές Υπηρεσιες","addr":"Κουντουρίωτου 1, 19500 Λαυριο","email":"","region":"Λαυριο, Κερατεα"},{"id":45,"cat":"ΥΔΟΜ","name":"Δνση πολεοδομιας Δημος Ωρωπου","addr":"πλ. Δημαρχείου 190 14 Καπανδρίτι","email":"","region":"Δήμος  Αυλώνα, , Καλάμου, Ωρωπίων. Κοινότητες Αφιδνών, Βαρνάβα, Καπανδριτίου, Κρυονερίου, Μαλακάσας, Μαρκόπουλου Ωρωπού, Πολυδενδρίου, Ροδόπολης, Σταμάτας, Συκαμίνου"},{"id":46,"cat":"ΥΔΟΜ","name":"Υπηρεσια Δομησης Μαραθωνα","addr":"Λ. Μαραθώνος 104, 19005 Ν. Μάκρη","email":"","region":"Μαραθωνας, Γραμματικο, Ν,Μακρη"},{"id":47,"cat":"ΥΔΟΜ","name":"Υπηρεσία Δόμησης Δήμου Παλλήνης","addr":"Αγίου Μηνά και Αιδηψού, Ανθουσα","email":"ydom@0156.syzefxis.gov.gr","region":"Δήμοι Γέρακας, Γλυκά Νερά,  Παιανίας, Παλλήνης, Ραφήνα, και Κοινότητες Ανθούσας, Άνω Σουλίου,  Καλεντζίου, Κουβαρά, Πικερμίου"},{"id":48,"cat":"ΥΔΟΜ","name":"Υπηρεσία Δόμησης Λαυρεωτικής","addr":"Βασ. Φρειδερίκης 6 & Αγ. Χαραλάμπους ,19001, Κερατέα","email":"ydom_grammateia@lavreotiki.gr","region":"Κερατεα, Λαυρεωτική, Αγ. Κωννος"},{"id":49,"cat":"ΥΔΟΜ","name":"Δήμος Μαρκοπούλου Μεσογαίας/  Τμ Πολεοδομίας και Πολεοδ Εφαρμογών","addr":"Παπαδημητρίου 33, 19003 Μαρκόπουλο","email":"ydom@markopoulo.gr","region":"Δήμοι Ανάβυσσος,  Καλύβια Θορικού,  Μαρκόπουλο Μεσογαίας, Παιανίας. Κοινότητες: Κουβαράς, Παλαιά Φώκαια, Σαρωνίδα"},{"id":50,"cat":"ΥΔΟΜ","name":"Δήμος Διονύσου/ Τεχνικές Υπηρεσίες\\ Υπηρεσία Δομησης","addr":"Λ. Γ. Λαμπράκη 19, 14572 Δροσιά","email":"","region":"Διονυσος, Αγ Στεφανος, Ανοιξη, Κρυονερι, Σταματα, Δροσια"},{"id":51,"cat":"ΥΔΟΜ","name":"Δημος Αχαρνων Δνση Δομησης","addr":"Φιλαδελφειας 87 και Μποσδα 13673 Αχαρνες","email":"","region":"Αχαρνες"},{"id":52,"cat":"ΥΔΟΜ","name":"Υπηρεσία Δόμησης Δήμου Βαρης Βουλας Βουλιαγμενης","addr":"Κ. Καραμανλη 18, 16673 Βούλα","email":"","region":"Βαρη, Βουλα, Βουλιαγμενη"},{"id":53,"cat":"ΥΔΟΜ","name":"Δνση Πολεοδομιας Δ. Σπατων","addr":"Βας Παυλου & Δημ. Χρηστου Μπεκα 4","email":"","region":""},{"id":54,"cat":"ΥΔΟΜ","name":"Δημος Ωρωπού / Δνης Πολεοδομίας","addr":"19014 Καπανδρίτι","email":"","region":"Καλαμος, Ωρωπός, Πολυδενδρι, Αυλώνα, Μαλακασσα, Χαλκούτσι, Δροσια, Καπανδριτι"},{"id":55,"cat":"ΥΔΟΜ","name":"Δημος Σπατων Δομηση","addr":"Βασ Παυλου και Χρ Μπεκα","email":"","region":"Σπατα Λουτσα"},{"id":56,"cat":"ΥΔΟΜ","name":"Δημος Κρωπίας","addr":"Β. ΠΑΠΠΑ 16 , Κορωπί","email":"ydom@koropi.gr.","region":"Κορωπί"},{"id":57,"cat":"ΥΔΟΜ","name":"Δημος Σαρωνικου","addr":"Αθηνών & Ρήγα Φεραίου, 19 010","email":"","region":"Σαρωνικος"},{"id":58,"cat":"ΥΠΕΝ","name":"ΥΠΕΝ/ Γενική Δ/νση Ενέργειας   Δ/νση Υδρογονανθράκων","addr":"Μεσογείων 119 115 26 Αθήνα","email":"tm.Org.Ep@prv.ypeka.gr","region":""},{"id":59,"cat":"ΓΓΠΣ","name":"Ανεξάρτητη Αρχή Δημοσίων Εσοδών/ Γενική Δνση Ηλεκτρονικής Διακυβέρνησης/ Δνση Ανάπτυξης Τελωνειακών Ελεγκτικών και Επιχειρησιακών Εφαρμογών/ Υποδνση Ανάπτυξης Τελωνειακών Εφαρμογών / Τμημα Δ","addr":"Πειραιώς  72 & Πύργου, 183 46 Μοσχάτο","email":"date.4@aade.gr","region":""},{"id":60,"cat":"Δ.Ο.Υ","name":"ΚΕΦΟΔΕ ΑΤΤΙΚΗΣ","addr":"Σμύρνης 23 & Κυδωνιών, 17778 Ταύρος","email":"kefode.attikis@aade.gr","region":""},{"id":61,"cat":"ΕΤΑΙΡΙΑ","name":"ΕΤΕΚΑ Α.Ε.","addr":"Λ. ΔΗΜΟΚΡΑΤΙΑΣ 142, 18863 ΠΕΡΑΜΑ","email":"info@eteka.gr","region":""},{"id":62,"cat":"ΕΤΑΙΡΙΑ","name":"ΑΙΓΑΙΟΝ ΟΪΛ Α.Ε.","addr":"ΑΚΤΗ ΚΟΝΔΥΛΗ 10, 18545 ΠΕΙΡΑΙΑΣ","email":"retail@aegeanoil.gr","region":""},{"id":63,"cat":"ΕΤΑΙΡΙΑ","name":"ΕΛΛΗΝΙΚΑ ΚΑΥΣΙΜΑ ΟΡΥΚΤΕΛΑΙΑ ΜΟΝΟΠΡΟΣΩΠΗ ΑΝΩΝΥΜΟΣ ΒΙΟΜΗΧΑΝΙΚΗ  ΚΑΙ ΕΜΠΟΡΙΚΗ ΕΤΑΙΡΕΙΑ δ.τ. «ΕΚΟ ΑΒΕΕ»","addr":"ΧΕΙΜΑΡΡΑΣ 8Α ,  15125 ΑΜΑΡΟΥΣΙΟ ΑΤΤΙΚΗΣ","email":"info@hellenic-petroleum.gr","region":""},{"id":64,"cat":"ΕΤΑΙΡΙΑ","name":"ΕΛΛΗΝΙΚΑ ΠΕΤΡΕΛΑΙΑ Α.Ε.","addr":"ΧΕΙΜΑΡΡΑΣ 8Α , 15125 ΑΜΑΡΟΥΣΙΟ ΑΤΤΙΚΗΣ","email":"info@hellenic-petroleum.gr","region":""},{"id":65,"cat":"ΕΤΑΙΡΙΑ","name":"ΚΑΛΥΨΩ Κ.Ε.Α. Α.Ε.","addr":"ΧΕΙΜΑΡΡΑΣ 8Α , 15125 ΑΜΑΡΟΥΣΙΟ ΑΤΤΙΚΗΣ","email":"info@hellenic-petroleum.gr","region":""},{"id":66,"cat":"ΕΤΑΙΡΙΑ","name":"ΕΛΙΝΟΙΛ Α.Ε.","addr":"ΠΗΓΩΝ 33, 14564 ΚΗΦΙΣΙΑ","email":"info@elin.gr","region":""},{"id":67,"cat":"ΕΤΑΙΡΙΑ","name":"ΡΕΒΟΙΛ Α.Ε. - Ε.Π.","addr":"ΚΑΠΟΔΙΣΤΡΙΟΥ 5, 16672 ΒΑΡΗ","email":"revoil@revoil.gr","region":""},{"id":68,"cat":"ΕΤΑΙΡΙΑ","name":"ΣΙΛΚ ΟΙΛ Α.Ε.","addr":"ΦΙΛΩΝΟΣ 131, 18536 ΠΕΙΡΑΙΑΣ","email":"","region":""},{"id":69,"cat":"ΕΤΑΙΡΙΑ","name":"AVINOIL Α.Β.Ε.Ν.Ε.Π.","addr":"12Α ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"info@avinoil.gr","region":""},{"id":70,"cat":"ΕΤΑΙΡΙΑ","name":"CORAL Α.Ε.","addr":"12Α ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"CSC-Hellas@ceg.gr","region":""},{"id":71,"cat":"ΕΤΑΙΡΙΑ","name":"ΜΑΚΡΑΙΩΝ ΜΟΝΟΠΡΟΣΩΠΗ Α.Ε.","addr":"ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"info@avinoil.gr","region":""},{"id":72,"cat":"ΕΤΑΙΡΙΑ","name":"ΚΟΝΚΑΤ Α.Τ.Ε.","addr":"12Α ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"info@avinoil.gr","region":""},{"id":73,"cat":"ΕΤΑΙΡΙΑ","name":"ΜΥΡΤΕΑ Α.Ε.","addr":"12Α ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"info@avinoil.gr","region":""},{"id":74,"cat":"ΕΤΑΙΡΙΑ","name":"ΕΡΜΗΣ ΑΕΜΕΕ","addr":"12Α ΗΡΩΔΟΥ ΑΤΤΙΚΟΥ, 15124 ΑΜΑΡΟΥΣΙΟ  ΑΤΤΙΚΗΣ","email":"info@avinoil.gr","region":""},{"id":75,"cat":"ΕΤΑΙΡΙΑ","name":"CETRACORE - JETOIL A.E.","addr":"ΑΘΑΝΑΣΊΟΥ ΔΙΑΚΟΥ 16, 11742 ΑΘΗΝΑ","email":"","region":""},{"id":76,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημου Διονυσου","addr":"Λ. Λαμπρακη 19, 14572 Δροσια","email":"","region":"Διονυσος, Αγιος Στεφανος, δροσια"},{"id":77,"cat":"ΤΕΧΝΙΚΕΣ","name":"Δημου Παλληνης","addr":"Ιθάκης 12, Γέρακας","email":"","region":""},{"id":78,"cat":"ΑΑΔΕ","name":"ΑΑΔΕ/Γενική Διεύθυνση Ηλεκτρονικής Διακυβέρνησης/Διεύθυνση Ανάπτυξης Τελωνειακών Ελεγκτικών και Επιχειρησιακών Εφαρμογών/Υποδιεύθυνση Ανάπτυξης Τελωνειακών Εφαρμογών, Τμήμα Δ’","addr":"Πειραιώς  72 & Πύργου, 183 46 Μοσχάτο","email":"date.4@aade.gr","region":""}];

let dgKoinData=[];
let dgKoinSelected=[];
let dgKoinActiveCat='';
let dgSelectedFak=null;
let dgSelectedProtos=new Set();
let dgSelectedTemplateId=null;

function dgInit(){
  const stored=localStorage.getItem(DG_KOIN_KEY);
  dgKoinData=stored?JSON.parse(stored):JSON.parse(JSON.stringify(DG_KOIN_DEFAULT));
  dgRenderKoinCats();
  dgRenderKoinList();
  dgPopulateMgrCat();
}

// ── Autocomplete ΦΑΚ ──
function acDocgenFak(inp){
  const q=inp.value.trim().toLowerCase();
  const list=document.getElementById('ac-dg-fak');
  if(!q){list.style.display='none';return;}
  const hits=installations.filter(i=>i.type!=='ΕΧΕΣ'&&(i.fak+i.name).toLowerCase().includes(q)).slice(0,8);
  if(!hits.length){list.style.display='none';return;}
  list.innerHTML=hits.map(i=>`<div class="ac-item" onclick="dgSetFak('${esc(i.fak)}')">${esc(i.fak)} — ${esc(i.name)}</div>`).join('');
  list.style.display='block';
}

function dgSetFak(fak){
  dgSelectedFak=fak;
  document.getElementById('dg-fak').value=fak;
  document.getElementById('ac-dg-fak').style.display='none';
  dgSelectedProtos.clear();
  // Preview εγκατάστασης
  const inst=installations.find(i=>i.fak===fak);
  const prev=document.getElementById('dg-inst-preview');
  if(inst){
    prev.style.display='block';
    prev.innerHTML=`<strong>${esc(inst.name)}</strong><br><span style="color:var(--text3)">${esc(inst.type||'')}${inst.subtype?' — '+esc(inst.subtype):''} · ${esc(inst.topothesia||'')}</span>`;
  }
  dgRenderProtoList();
  dgSuggestKoin();
}

// ── Πρωτόκολλα ──
function dgIsPhase1(p){
  return !p.rejected && !p.teliko && !p.hm_exerx;
}

function dgRenderProtoList(){
  const cont=document.getElementById('dg-proto-list');
  if(!dgSelectedFak){cont.innerHTML='<div style="padding:10px;color:var(--text3);font-size:12px;text-align:center">Επέλεξε ΦΑΚ πρώτα…</div>';return;}
  const protos=protocol.filter(p=>p.fak===dgSelectedFak && dgIsPhase1(p))
    .sort((a,b)=>(b.hm_xreosis||'').localeCompare(a.hm_xreosis||''));
  if(!protos.length){
    cont.innerHTML=`<div style="padding:12px;font-size:12px">
      <div style="color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px;margin-bottom:8px">
        ⚠️ Δεν υπάρχει ανοιχτό «Προς Ενέργεια» πρωτόκολλο για αυτόν τον φάκελο.
      </div>
      <div style="color:var(--text2);margin-bottom:8px">Για να γίνει <strong>οικοθεν ενέργεια</strong> δημιουργήστε νέα κίνηση:</div>
      <button class="btn btn-primary btn-sm" onclick="dgCreateAutoProto()" style="width:100%">
        ➕ Δημιουργία κίνησης (Αρ. Εισερχ.: 0, Ημ.: σήμερα)
      </button>
    </div>`;
    return;
  }
  cont.innerHTML=protos.map(p=>{
    const id=p._id||p.proto_eisx||'';
    const chk=dgSelectedProtos.has(id);
    return `<div style="display:flex;gap:8px;padding:7px 10px;border-bottom:1px solid var(--border);align-items:flex-start;cursor:pointer" onclick="dgToggleProto('${esc(id)}')">
      <input type="checkbox" ${chk?'checked':''} onclick="event.stopPropagation();dgToggleProto('${esc(id)}')">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;font-weight:600">${esc(p.proto_eisx||'')} <span style="color:var(--text3);font-weight:400">${fmtDate(p.hm_xreosis)}</span></div>
        <div style="font-size:11px;color:var(--text2)">${esc(p.aitima||'').substring(0,60)}</div>
        ${p.mixanikos?'<div style="font-size:10px;color:var(--text3)">'+esc(p.mixanikos)+'</div>':''}
      </div>
    </div>`;
  }).join('');
}

function dgCreateAutoProto(){
  if(!dgSelectedFak) return;
  const today=new Date().toISOString().substring(0,10);
  const newId='dg_'+Date.now();
  const newProto={
    _id:newId,
    fak:dgSelectedFak,
    sheet:'Εγκαταστάσεις',
    proto_eisx:'0',
    hm_xreosis:today,
    aition:(installations.find(i=>i.fak===dgSelectedFak)||{}).name||dgSelectedFak,
    aitima:'Οικοθεν ενέργεια',
    mixanikos:'',
    hm_exerx:'',proto_exerx:'',energeia:'',teliko:'',rejected:false,notes:''
  };
  protocol.push(newProto);
  save('proto',protocol);
  dgSelectedProtos.add(newId);
  dgRenderProtoList();
  toast('✅ Νέα κίνηση δημιουργήθηκε (Αρ.0, σήμερα)');
}

function dgToggleProto(id){
  if(dgSelectedProtos.has(id)) dgSelectedProtos.delete(id);
  else dgSelectedProtos.add(id);
  dgRenderProtoList();
}

function dgSelectAllProto(){
  const protos=protocol.filter(p=>p.fak===dgSelectedFak && dgIsPhase1(p));
  protos.forEach(p=>{const id=p._id||p.proto_eisx||'';dgSelectedProtos.add(id);});
  dgRenderProtoList();
}

// ── Templates ──
let dgTemplateBuffer = null; // Αποθηκεύεται μόνο στη μνήμη

function dgLoadTemplate(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    // Αποθήκευση ως base64
    const bytes = new Uint8Array(e.target.result);
    let b64 = '';
    for(let i=0;i<bytes.length;i++) b64 += String.fromCharCode(bytes[i]);
    dgTemplateBuffer = btoa(b64);
    document.getElementById('dg-tpl-name').textContent = '✅ ' + file.name;
    document.getElementById('dg-tpl-name').style.color = 'var(--accent2,#059669)';
    toast('Template "'+file.name+'" φορτώθηκε');
  };
  reader.readAsArrayBuffer(file);
  input.value = '';
}

// ── Κοινοποιήσεις ──
// ── Κοινοποιήσεις ──
function dgGetCats(){return [...new Set(dgKoinData.map(k=>k.cat).filter(Boolean))].sort();}

function dgRenderKoinCats(){
  const cats=dgGetCats();
  const cont=document.getElementById('dg-koin-cats');
  if(!cont) return;
  cont.innerHTML='<button class="cat-btn'+(dgKoinActiveCat===''?' active':'')+'" onclick="dgSetKoinCat(\'\')">Όλες</button>'
    +cats.map(c=>'<button class="cat-btn'+(dgKoinActiveCat===c?' active':'')+'" onclick="dgSetKoinCat(\''+c+'\')">'+c+'</button>').join('');
}

function dgSetKoinCat(cat){dgKoinActiveCat=cat;dgRenderKoinCats();dgRenderKoinList();}

function dgRenderKoinList(){
  const q=(document.getElementById('dg-koin-search')||{value:''}).value.toLowerCase();
  let arr=dgKoinData.filter(k=>k.name);
  if(dgKoinActiveCat) arr=arr.filter(k=>k.cat===dgKoinActiveCat);
  if(q) arr=arr.filter(k=>(k.name+k.addr+k.cat+k.region).toLowerCase().includes(q));
  const selIds=new Set(dgKoinSelected.map(k=>k.id));
  const cont=document.getElementById('dg-koin-list');
  if(!cont) return;
  if(!arr.length){cont.innerHTML='<div style="padding:10px;text-align:center;color:var(--text3);font-size:12px">Κανένα αποτέλεσμα</div>';return;}
  cont.innerHTML=arr.map(k=>`
    <div style="display:flex;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border);align-items:flex-start;cursor:pointer" onclick="dgToggleKoin(${k.id})">
      <input type="checkbox" ${selIds.has(k.id)?'checked':''} onclick="event.stopPropagation();dgToggleKoin(${k.id})" style="margin-top:2px">
      <div style="min-width:0">
        <div style="font-size:10px;color:var(--accent);font-weight:700">${esc(k.cat)}</div>
        <div style="font-size:12px;font-weight:600">${esc(k.name)}</div>
        <div style="font-size:10px;color:var(--text3)">${esc(k.addr)}${k.email?' · '+esc(k.email):''}</div>
      </div>
    </div>`).join('');
}

function dgToggleKoin(id){
  const k=dgKoinData.find(x=>x.id===id);
  if(!k) return;
  const idx=dgKoinSelected.findIndex(x=>x.id===id);
  if(idx>=0) dgKoinSelected.splice(idx,1);
  else dgKoinSelected.push(k);
  dgUpdateKoinCount();
  dgRenderKoinList();
  dgRenderKoinSelected();
}

function dgUpdateKoinCount(){
  const el=document.getElementById('dg-koin-count');
  if(el) el.textContent=dgKoinSelected.length+' επιλεγμένες';
}

function dgClearKoin(){
  dgKoinSelected=[];
  dgUpdateKoinCount();
  dgRenderKoinList();
  dgRenderKoinSelected();
}

function dgSuggestKoin(){
  if(!dgSelectedFak) return;
  const inst=installations.find(i=>i.fak===dgSelectedFak);
  if(!inst||!inst.topothesia) return;
  const region=inst.topothesia.toLowerCase();
  const suggestions=dgKoinData.filter(k=>{
    const kr=(k.region||'').toLowerCase();
    return kr&&region.split(/[\s,]+/).some(w=>w.length>3&&kr.includes(w));
  });
  if(!suggestions.length){toast('Δεν βρέθηκαν προτάσεις για "'+inst.topothesia+'"');return;}
  suggestions.forEach(k=>{if(!dgKoinSelected.find(s=>s.id===k.id)) dgKoinSelected.push(k);});
  dgUpdateKoinCount();
  dgRenderKoinList();
  dgRenderKoinSelected();
  toast('Προστέθηκαν '+suggestions.length+' κοινοποιήσεις για "'+inst.topothesia+'"');
}

function dgRenderKoinSelected(){
  const cont=document.getElementById('dg-koin-selected');
  if(!cont) return;
  if(!dgKoinSelected.length){cont.innerHTML='<div style="padding:10px;text-align:center;color:var(--text3);font-size:12px">Καμία επιλογή</div>';return;}
  cont.innerHTML=dgKoinSelected.map((k,i)=>`
    <div style="display:flex;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border);align-items:center" draggable="true" data-kidx="${i}">
      <span style="cursor:grab;color:var(--text3)">⠿</span>
      <span style="color:var(--text3);font-size:10px;min-width:16px">${i+1}.</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600">${esc(k.name)}</div>
        <div style="font-size:10px;color:var(--text3)">${esc(k.addr)}</div>
      </div>
      <button class="btn-icon" onclick="dgRemoveKoin(${k.id})" style="font-size:11px">✕</button>
    </div>`).join('');
  // Drag reorder
  let dragIdx=null;
  cont.querySelectorAll('[draggable]').forEach((el,i)=>{
    el.addEventListener('dragstart',()=>{dragIdx=i;el.style.opacity='.4';});
    el.addEventListener('dragend',()=>{el.style.opacity='1';});
    el.addEventListener('dragover',e=>e.preventDefault());
    el.addEventListener('drop',e=>{
      e.preventDefault();
      if(dragIdx===null||dragIdx===i) return;
      const moved=dgKoinSelected.splice(dragIdx,1)[0];
      dgKoinSelected.splice(i,0,moved);
      dragIdx=null;
      dgRenderKoinSelected();
    });
  });
}

function dgRemoveKoin(id){
  dgKoinSelected=dgKoinSelected.filter(k=>k.id!==id);
  dgUpdateKoinCount();
  dgRenderKoinList();
  dgRenderKoinSelected();
}

function dgSaveKoin(){localStorage.setItem(DG_KOIN_KEY,JSON.stringify(dgKoinData));}

// ── Κοινοποιήσεις Manager ──
function dgPopulateMgrCat(){
  const sel=document.getElementById('koin-mgr-cat');
  if(!sel) return;
  const cats=dgGetCats();
  sel.innerHTML='<option value="">Όλες κατηγορίες</option>'+cats.map(c=>'<option>'+c+'</option>').join('');
}

function dgRenderKoinMgr(){
  const fCat=(document.getElementById('koin-mgr-cat')||{value:''}).value;
  const q=(document.getElementById('koin-mgr-search')||{value:''}).value.toLowerCase();
  let arr=dgKoinData.filter(k=>k.name);
  if(fCat) arr=arr.filter(k=>k.cat===fCat);
  if(q) arr=arr.filter(k=>(k.name+k.addr+k.cat).toLowerCase().includes(q));
  const cont=document.getElementById('dg-koin-mgr-rows');
  if(!cont) return;
  cont.innerHTML=arr.map(k=>`
    <div style="display:grid;grid-template-columns:90px 1fr 1fr 1fr 120px 30px;gap:4px;padding:4px 8px;border-bottom:1px solid var(--border);align-items:center">
      <input class="form-control" style="font-size:10px;padding:3px 5px" value="${esc(k.cat)}" onchange="dgUpdateKoin(${k.id},'cat',this.value)" placeholder="Κατ.">
      <input class="form-control" style="font-size:10px;padding:3px 5px" value="${esc(k.name)}" onchange="dgUpdateKoin(${k.id},'name',this.value)" placeholder="Όνομα">
      <input class="form-control" style="font-size:10px;padding:3px 5px" value="${esc(k.addr||'')}" onchange="dgUpdateKoin(${k.id},'addr',this.value)" placeholder="Διεύθυνση">
      <input class="form-control" style="font-size:10px;padding:3px 5px" value="${esc(k.email||'')}" onchange="dgUpdateKoin(${k.id},'email',this.value)" placeholder="Email">
      <input class="form-control" style="font-size:10px;padding:3px 5px" value="${esc(k.region||'')}" onchange="dgUpdateKoin(${k.id},'region',this.value)" placeholder="Χωρ.Αρμ.">
      <button class="btn-icon" onclick="dgDeleteKoin(${k.id})" style="color:#dc2626">🗑</button>
    </div>`).join('');
}

function dgUpdateKoin(id,field,val){
  const k=dgKoinData.find(x=>x.id===id);
  if(k){k[field]=val;dgSaveKoin();dgRenderKoinCats();}
}

function dgDeleteKoin(id){
  if(!confirm('Διαγραφή φορέα;')) return;
  dgKoinData=dgKoinData.filter(k=>k.id!==id);
  dgKoinSelected=dgKoinSelected.filter(k=>k.id!==id);
  dgSaveKoin();
  dgRenderKoinMgr();
  dgRenderKoinCats();
  dgRenderKoinList();
  dgRenderKoinSelected();
  toast('Φορέας διαγράφηκε');
}

function dgKoinMgrAdd(){
  const newId=Math.max(...dgKoinData.map(k=>k.id),0)+1;
  dgKoinData.unshift({id:newId,cat:'',name:'Νέος Φορέας',addr:'',email:'',region:''});
  dgSaveKoin();
  dgRenderKoinMgr();
  dgRenderKoinCats();
  dgPopulateMgrCat();
}

function dgKoinExport(){
  const blob=new Blob([JSON.stringify(dgKoinData,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='koinopoiiseis_updated.json';
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);URL.revokeObjectURL(url);
  toast('Εξήχθη koinopoiiseis_updated.json');
}

// ── Build Data ──
function dgBuildData(protoObj){
  const inst=installations.find(i=>i.fak===dgSelectedFak)||{};
  const eq=equipment.find(e=>e.fak===dgSelectedFak)||{};
  const p=protoObj||{};
  const today=new Date();
  const months=['Ιανουαρίου','Φεβρουαρίου','Μαρτίου','Απριλίου','Μαΐου','Ιουνίου','Ιουλίου','Αυγούστου','Σεπτεμβρίου','Οκτωβρίου','Νοεμβρίου','Δεκεμβρίου'];
  // Αντλίες ως κείμενο
  const pumps=eq.pumps||[];
  let pumpsText='';
  if(pumps.length){
    const antlies=pumps.filter(x=>x.type==='Αντλία');
    const dianomeis=pumps.filter(x=>x.type==='Διανομέας');
    const parts=[];
    if(antlies.length){
      const grouped={};
      antlies.forEach(a=>{const key=a.eidos||'';if(!grouped[key])grouped[key]=[];grouped[key].push(a);});
      Object.entries(grouped).forEach(([eidos,arr])=>{
        const prods=[...new Set(arr.map(a=>a.products).filter(Boolean))].join(', ');
        const epist=arr.reduce((s,a)=>s+(parseInt(a.epistomia)||0),0);
        parts.push(arr.length+' αντλία'+(arr.length>1?'ες':'')+' '+eidos+(prods?' ('+prods+')':'')+(epist?' με '+epist+' επιστόμια':''));
      });
    }
    dianomeis.forEach(d=>{
      parts.push('1 διανομέας'+(d.eidos?' '+d.eidos:'')+(d.products?' ('+d.products+')':''));
    });
    pumpsText=parts.join(', ');
  }
  // Δεξαμενές
  const tanksText=(eq.tanks||[]).map(t=>{
    const tp=[];
    if(t.mitroo) tp.push('Αρ.Μητρ.:'+t.mitroo);
    if(t.fuel) tp.push(t.fuel);
    if(t.liters) tp.push(Number(t.liters).toLocaleString('el-GR')+'L');
    if(t.ogkom) tp.push('Ογκ.:'+t.ogkom);
    return tp.join(' ');
  }).join(' | ');
  // Extras
  const extras=[];
  if(eq.plyntirio) extras.push('Πλυντήριο'+(eq.plyntirio_pros?' (Προσ.)':'')+(eq.plyntirio_auto?' (Αυτ.)':''));
  if(eq.lipantirio) extras.push('Λιπαντήριο');
  if(eq.artho25) extras.push('Αρθ.25/Stage II');
  if(eq.artho27) extras.push('Αρθ.27');
  if(eq.steg_freatia) extras.push('Στεγ.Φρεάτια');
  if(eq.offset_filling) extras.push('Offset Filling');
  if(eq.auto_politis) extras.push('Αυτ.Πωλητής');
  if(eq.lakkos) extras.push('Λάκκος Επιθ.');
  (eq.extra_equip||[]).forEach(e=>{if(e)extras.push(e);});
  return {
    fak:dgSelectedFak,
    today:today.toLocaleDateString('el-GR'),
    today_long:today.getDate()+' '+months[today.getMonth()]+' '+today.getFullYear(),
    proto_eisx:p.proto_eisx||'',
    hm_xreosis:p.hm_xreosis?new Date(p.hm_xreosis).toLocaleDateString('el-GR'):'',
    aition:p.aition||inst.name||'',
    aitima:p.aitima||'',
    mixanikos:p.mixanikos||'',
    hm_exerx:p.hm_exerx?new Date(p.hm_exerx).toLocaleDateString('el-GR'):'',
    proto_exerx:p.proto_exerx||'',
    energeia:p.energeia||'',
    notes:p.notes||'',
    inst_name:inst.name||'',
    inst_afm:inst.afm||'',
    inst_adeia:inst.adeia||'',
    inst_adeia_typos:inst.adeia_typos||'',
    inst_adeia_lixis:inst.adeia_lixis?new Date(inst.adeia_lixis).toLocaleDateString('el-GR'):'',
    inst_address:inst.address||'',
    inst_topothesia:inst.topothesia||'',
    inst_tel:inst.tel||'',
    inst_type:inst.type||'',
    inst_subtype:inst.subtype||'',
    inst_ypeuthinos:inst.ypeuthinos||'',
    inst_vytio:inst.vytio||'',
    inst_coords:inst.coords||'',
    inst_autopsia:inst.autopsia?new Date(inst.autopsia).toLocaleDateString('el-GR'):'',
    eq_pumps_text:pumpsText,
    eq_tanks_text:tanksText,
    eq_fortistes:eq.fortistes?(eq.fortistes+(eq.fortistes_theseis?' με '+eq.fortistes_theseis+' θέσεις':'')):'' ,
    eq_extras:extras.join(', '),
    koinopoiiseis:dgKoinSelected.map(function(k){return {koin_name:k.name||'',koin_addr:k.addr||'',koin_email:k.email||''};
    }),
    tanks_list:(eq.tanks||[]).map(function(t){return {mitroo:t.mitroo||'',fuel:t.fuel||'',liters:t.liters?String(t.liters):'',ogkom:t.ogkom||''};
    }),
    pumps_list:(eq.pumps||[]).map(function(p,idx){return {pump_num:String(idx+1),pump_type:p.type||'',pump_eidos:p.eidos||'',pump_products:p.products||'',pump_epistomia:p.epistomia?String(p.epistomia):'',pump_num_text:String(idx+1)};
    })
  };
}

// ── Generate ──
function dgGenerate(){
  if(!dgSelectedFak){toast('Επέλεξε ΦΑΚ','error');return;}
  if(typeof JSZip==='undefined'){toast('❌ Η βιβλιοθήκη JSZip δεν φορτώθηκε. Ελέγξε σύνδεση internet.','error');return;}
  if(!dgTemplateBuffer){toast('❌ Φόρτωσε template .docx πρώτα (Βήμα 3)','error');return;}
  const selProtos=protocol.filter(p=>{
    const id=p._id||p.proto_eisx||'';
    return p.fak===dgSelectedFak&&dgSelectedProtos.has(id);
  });
  const protoObj=selProtos.length?selProtos[0]:null;
  const data=dgBuildData(protoObj);
  // Προσθήκη loops arrays
  const eq2=equipment.find(function(e){return e.fak===dgSelectedFak;})||{};
  data.tanks=(eq2.tanks||[]).map(function(t){
    return {mitroo:t.mitroo||'',fuel:t.fuel||'',liters:t.liters?String(t.liters):'',ogkom:t.ogkom||''};
  });
  data.pumps_list=(eq2.pumps||[]).map(function(p,idx){
    return {pump_num:String(idx+1),pump_type:p.type||'',pump_eidos:p.eidos||'',
            pump_products:p.products||'',pump_epistomia:p.epistomia?String(p.epistomia):''};
  });
  data.koinopoiiseis=dgKoinSelected.map(function(k){
    return {koin_name:k.name||'',koin_addr:k.addr||'',koin_email:k.email||''};
  });
  data.protocollist=selProtos.map(p=>({
    proto_eisx:p.proto_eisx||'',
    hm_xreosis:p.hm_xreosis?new Date(p.hm_xreosis).toLocaleDateString('el-GR'):'',
    aitima:p.aitima||'',
    mixanikos:p.mixanikos||''
  }));
  // Filename
  let filename=(document.getElementById('dg-filename')||{value:''}).value||'{{fak}}_{{today}}.docx';
  Object.entries(data).forEach(([k,v])=>{
    if(typeof v==='string') filename=filename.replace(new RegExp('\\{\\{'+k+'\\}\\}','g'),v.replace(/[\/\\:*?"<>|]/g,'_'));
  });
  // Παραγωγή με MiniDocGen (built-in, δεν χρειάζεται CDN)
  MiniDocGen.generate(dgTemplateBuffer,data).then(function(blob){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('✅ Έγγραφο "'+filename+'" κατεβαίνει στον φάκελο Downloads');
  }).catch(function(err){
    console.error('dgGenerate error:',err);
    toast('❌ Σφάλμα παραγωγής: '+err.message,'error');
  });
}


