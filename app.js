const PRIVATE_REPO="cedarparkjacob/PTCGP-Collection-Private",DATA_URL="./data/cards.json",IMAGE_BASE="https://raw.githubusercontent.com/Vociferix/ptcgp-images/master/",LOCAL_KEY="pocketdex.collection.v1";
let cards=[],sets=[],collection={schema_version:1,updated_at:null,cards:{},binders:[],kantoOrder:{},binderColumns:{}},activeView="collection",activeBinderId="",githubToken="",catalogReady=false,kantoHoldTimer=null,kantoDrag=null,kantoGesture=null,kantoDragged=false,kantoSuppressClickUntil=0,kantoHoldStartX=0,kantoHoldStartY=0,kantoFocusDex=null;
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function loadLocal(){try{const x=JSON.parse(localStorage.getItem(LOCAL_KEY)||"null");if(x?.cards)collection=x;if(!Array.isArray(collection.binders))collection.binders=[];if(!collection.kantoOrder||typeof collection.kantoOrder!=="object")collection.kantoOrder={};if(!collection.binderColumns||typeof collection.binderColumns!=="object")collection.binderColumns={}}catch(e){console.warn(e)}}
function saveLocal(){collection.updated_at=new Date().toISOString();try{localStorage.setItem(LOCAL_KEY,JSON.stringify(collection))}catch(e){console.warn(e)}}
function qty(id){return Number(collection.cards[id]?.owned||0)}function wished(id){return!!collection.cards[id]?.wishlist}
function change(id,n){const x=collection.cards[id]||(collection.cards[id]={owned:0,wishlist:false});x.owned=Math.max(0,Math.min(999,x.owned+n));if(!x.owned&&!x.wishlist)delete collection.cards[id];if(activeView==="kanto151"&&n>0){const c=cards.find(v=>v.id===id);if(c)kantoFocusDex=String(c.natdex_number)}saveLocal();render()}
function wish(id){const x=collection.cards[id]||(collection.cards[id]={owned:0,wishlist:false});x.wishlist=!x.wishlist;if(!x.owned&&!x.wishlist)delete collection.cards[id];saveLocal();render()}
function totals(){const owned=cards.filter(c=>qty(c.id)>0),unique=new Set(owned.filter(c=>c.card_type==="pokemon"&&c.natdex_number).map(c=>c.natdex_number));return{total:cards.length,versions:owned.length,quantity:owned.reduce((n,c)=>n+qty(c.id),0),pokemon:unique.size,pct:cards.length?Math.round(owned.length/cards.length*100):0}}
function filterOptions(id,items){$("#"+id).innerHTML=items.map(([v,n])=>'<label><input type="checkbox" value="'+esc(v)+'"> '+esc(n)+'</label>').join("")}
function filters(){filterOptions("set-filter",sets.map(x=>[x.code,x.code+" · "+x.name]));const rs=[...new Map(cards.filter(c=>c.rarity).map(c=>[c.rarity,c.rarity_name||c.rarity]))];filterOptions("rarity-filter",rs);updateFilterLabels()}
function selected(id){return [...$("#"+id).querySelectorAll("input:checked")].map(o=>o.value)}
function updateFilterLabels(){document.querySelectorAll(".filter-dropdown").forEach(d=>{const n=d.querySelectorAll(".filter-menu input:checked").length,b=d.querySelector(".filter-toggle"),c=b.querySelector(".filter-count");c.textContent=n?"("+n+")":"";b.classList.toggle("has-selection",n>0)})}
function closeFilterMenus(except){document.querySelectorAll(".filter-dropdown.open").forEach(d=>{if(d!==except){d.classList.remove("open");d.querySelector(".filter-toggle").setAttribute("aria-expanded","false")}})}
function filtered(){const q=$("#search").value.toLowerCase().trim(),setsOn=selected("set-filter"),raritiesOn=selected("rarity-filter"),typesOn=selected("type-filter"),ownershipOn=selected("ownership-filter");let list=cards.filter(c=>(!q||[c.name,c.natdex_number,c.set_name,c.set,c.rarity_name,c.illustrator].join(" ").toLowerCase().includes(q))&&(!setsOn.length||setsOn.includes(c.set))&&(!raritiesOn.length||raritiesOn.includes(c.rarity))&&(!typesOn.length||typesOn.includes(c.card_type))&&(!ownershipOn.length||(ownershipOn.includes("owned")&&qty(c.id)>0)||(ownershipOn.includes("missing")&&!qty(c.id))||(ownershipOn.includes("wishlist")&&wished(c.id)))&&(activeView!=="wishlist"||wished(c.id)));const setOrder=new Map(sets.map((s,i)=>[s.code,i]));const cmp=(x,y)=>String(x??"").localeCompare(String(y??""),undefined,{numeric:true,sensitivity:"base"});const sort=$("#sort-filter").value;list.sort((a,b)=>{let n=0;if(sort.startsWith("dex-")){const ax=Number(a.natdex_number)||9999,bx=Number(b.natdex_number)||9999;n=ax-bx||cmp(a.name,b.name)||cmp(a.number_label,b.number_label);if(sort==="dex-desc")n=-n}else if(sort.startsWith("rarity-")){n=cmp(a.rarity_name||a.rarity,b.rarity_name||b.rarity)||cmp(a.name,b.name);if(sort==="rarity-desc")n=-n}else if(sort.startsWith("set-")){n=(setOrder.get(a.set)??9999)-(setOrder.get(b.set)??9999)||cmp(a.number_label,b.number_label)||cmp(a.name,b.name);if(sort==="set-desc")n=-n}else{n=cmp(a.name,b.name)||cmp(a.number_label,b.number_label);if(sort==="name-desc")n=-n}return n});return list}
function cardHTML(c,binderId=null){return '<article class="card"><div class="card-image"><img loading="lazy" src="'+esc(IMAGE_BASE+c.image)+'" alt="'+esc(c.name)+'" onerror="this.outerHTML=\'<div class=fallback>Image unavailable</div>\'"></div><div class="card-info"><div class="card-title" title="'+esc(c.name)+'">'+esc(c.name)+'</div><div class="card-sub">'+esc(c.set+" · "+c.number_label+" · "+(c.natdex_number?"#"+c.natdex_number:"Trainer"))+'</div><div class="card-tags"><span class="tag">'+esc(c.rarity_name||c.rarity||"Promo")+'</span>'+(c.is_foil?'<span class="tag">Foil</span>':"")+(c.is_reprint?'<span class="tag">Reprint</span>':"")+'</div><div class="card-controls"><div class="qty"><button data-a="minus" data-id="'+c.id+'">−</button><span>'+qty(c.id)+'</span><button data-a="plus" data-id="'+c.id+'">+</button></div><button class="heart '+(wished(c.id)?"on":"")+'" data-a="wish" data-id="'+c.id+'">♥</button>'+(binderId?'<button class="binder-card-toggle" data-a="binder-toggle" data-id="'+c.id+'">'+(collection.binders.find(x=>x.id===binderId)?.cardIds.includes(c.id)?'Remove':'Add to binder')+'</button>':'')+'</div></div></article>'}
function renderCards(list){$("#result-count").textContent=list.length.toLocaleString()+" card versions";$("#content").className="card-grid";$("#content").innerHTML=list.length?list.slice(0,500).map(cardHTML).join(""):'<div class="empty">No cards match these filters.</div>';if(list.length>500)$("#result-count").textContent+=" · showing first 500; narrow search"}
function renderSets(){$("#content").className="panel-grid";$("#content").innerHTML=sets.map(s=>{const g=cards.filter(c=>c.set===s.code),h=g.filter(c=>qty(c.id)>0).length,p=g.length?Math.round(h/g.length*100):0;return '<article class="set-panel"><h3>'+esc(s.name)+'</h3><p>'+esc(s.code)+(s.is_promo?" · Promo":"")+' · '+g.length+' versions</p><div class="progress"><span style="width:'+p+'%"></span></div><div class="progress-label"><span>'+h+' / '+g.length+' owned</span><span>'+p+'%</span></div></article>'}).join("");$("#result-count").textContent=sets.length+" expansions"}
function rarityRank(c){
 const ranks={C:1,U:2,R:3,RR:4,AR:5,SR:6,SAR:6.5,IM:7,S:8,SSR:9,UR:10};
 return ranks[String(c.rarity||"").toUpperCase()]||0;
}
function renderKanto151(){
 const scrollPositions=new Map([...document.querySelectorAll(".kanto-strip")].map(s=>[s.closest(".kanto-row").dataset.dex,s.scrollLeft]));
 const byDex=new Map();
 cards.filter(c=>c.card_type==="pokemon"&&Number(c.natdex_number)>=1&&Number(c.natdex_number)<=151).forEach(c=>{const n=Number(c.natdex_number);if(!byDex.has(n))byDex.set(n,[]);byDex.get(n).push(c)});
 const groups=[...byDex.entries()].sort((a,b)=>a[0]-b[0]);
 const versionCount=groups.reduce((n,[,a])=>n+a.length,0);
 $("#content").className="kanto-list";
 $("#result-count").textContent=groups.length+" Pokémon · "+versionCount.toLocaleString()+" card versions";
 $("#view-caption").textContent="ORIGINAL 151 · OWNED FIRST · RAREST LEFT";
 $("#content").innerHTML=groups.map(([dex,items])=>{
   const base=items.slice().sort((a,b)=>String(a.number_label||"").localeCompare(String(b.number_label||""),undefined,{numeric:true})||String(a.name).localeCompare(String(b.name)));
   const ordered=orderedKantoItems(dex,items);
   return '<section class="kanto-row" data-dex="'+dex+'"><div class="kanto-heading"><span class="kanto-number">#'+String(dex).padStart(3,"0")+'</span><strong>'+esc(base[0]?.name||"")+'</strong><span class="kanto-hint">Hold card, then drag · Swipe to scroll</span></div><div class="kanto-strip">'+ordered.map(c=>'<button type="button" class="kanto-card '+(qty(c.id)>0?'owned':'missing')+'" data-a="kanto-add" data-id="'+esc(c.id)+'" data-dex="'+dex+'" title="'+esc(c.name+" · "+c.set+" · "+c.number_label+" · "+(c.rarity_name||c.rarity||""))+'" aria-label="Add '+esc(c.name+" "+c.set+" "+c.number_label)+' to collection"><img loading="lazy" draggable="false" src="'+esc(IMAGE_BASE+c.image)+'" alt="'+esc(c.name)+'" onerror="this.outerHTML=\'<span class=kanto-fallback>Image unavailable</span>\'"><span class="kanto-card-label">'+esc((c.rarity_name||c.rarity||"Card")+" · "+c.set+" · "+c.number_label)+'</span></button>').join("")+'</div></section>';
 }).join("");
 document.querySelectorAll(".kanto-row").forEach(row=>{
   const dex=row.dataset.dex;
   if(kantoFocusDex===dex)row.querySelector(".kanto-strip").scrollLeft=0;
   else {const saved=scrollPositions.get(dex);if(saved!==undefined)row.querySelector(".kanto-strip").scrollLeft=saved}
 });
 kantoFocusDex=null;
}
function renderDex(){const m=new Map();cards.filter(c=>c.card_type==="pokemon"&&c.natdex_number).forEach(c=>{let p=m.get(c.natdex_number)||{name:c.name,n:c.natdex_number,total:0,owned:0};p.total++;if(qty(c.id))p.owned++;m.set(c.natdex_number,p)});const a=[...m.values()].sort((x,y)=>x.n-y.n);$("#content").className="panel-grid";$("#content").innerHTML=a.map(p=>'<article class="dex-panel"><span class="dex-number">#'+String(p.n).padStart(4,"0")+'</span><div><h3>'+esc(p.name)+'</h3><p>'+p.owned+' of '+p.total+' versions owned</p></div><span class="dex-count">'+(p.owned?"●":"○")+'</span></article>').join("");$("#result-count").textContent=a.length+" unique Pokémon"}

const KANTO_BINDER_ID="original-151-auto";
function orderedKantoItems(dex,items){
 const base=items.slice().sort((a,b)=>String(a.number_label||"").localeCompare(String(b.number_label||""),undefined,{numeric:true})||String(a.name).localeCompare(String(b.name)));
 const saved=Array.isArray(collection.kantoOrder[String(dex)])?collection.kantoOrder[String(dex)]:[];
 const manualOrder=new Map(saved.map((id,i)=>[id,i]));
 return base.slice().sort((a,b)=>{
   const ownedDiff=Number(qty(b.id)>0)-Number(qty(a.id)>0);
   if(ownedDiff)return ownedDiff;
   const rarityDiff=rarityRank(b)-rarityRank(a);
   if(rarityDiff)return rarityDiff;
   return (manualOrder.get(a.id)??999999)-(manualOrder.get(b.id)??999999)
     ||String(a.number_label||"").localeCompare(String(b.number_label||""),undefined,{numeric:true})
     ||String(a.name).localeCompare(String(b.name));
 });
}
function original151BinderCards(){
 const groups=new Map();
 cards.filter(c=>c.card_type==="pokemon"&&Number(c.natdex_number)>=1&&Number(c.natdex_number)<=151).forEach(c=>{
   const dex=Number(c.natdex_number);if(!groups.has(dex))groups.set(dex,[]);groups.get(dex).push(c);
 });
 return [...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([dex,items])=>orderedKantoItems(dex,items)[0]).filter(Boolean);
}
function activeBinder(){
 if(activeBinderId===KANTO_BINDER_ID)return{id:KANTO_BINDER_ID,name:"Original 151",cardIds:original151BinderCards().map(c=>c.id),automatic:true};
 return collection.binders.find(b=>b.id===activeBinderId)||collection.binders[0]||null
}
function createBinder(){const input=$("#binder-name"),name=input.value.trim();if(!name){input.focus();return}const b={id:"binder-"+Date.now(),name:name,cardIds:[]};collection.binders.push(b);activeBinderId=b.id;input.value="";saveLocal();renderBinders()}
function toggleBinderCard(id){const b=activeBinder();if(!b)return;const i=b.cardIds.indexOf(id);if(i>=0)b.cardIds.splice(i,1);else if(qty(id)>0)b.cardIds.push(id);saveLocal();renderBinders()}
function binderCardHTML(c,binderId=null,label=null){return '<article class="binder-card-frame"><img loading="lazy" src="'+esc(IMAGE_BASE+c.image)+'" alt="'+esc(c.name)+'" title="'+esc(c.name)+'" onerror="this.outerHTML=\'<div class=binder-image-fallback>Image unavailable</div>\'">'+(binderId?'<button type="button" class="binder-card-toggle" data-a="binder-toggle" data-id="'+esc(c.id)+'">'+esc(label||"Remove")+'</button>':"")+'</article>'}
function renderBinders(){if(!Array.isArray(collection.binders))collection.binders=[];if(!collection.binderColumns||typeof collection.binderColumns!=="object")collection.binderColumns={};if(!activeBinderId)activeBinderId=collection.binders[0]?.id||KANTO_BINDER_ID;let b=activeBinder();if(b)activeBinderId=b.id;const columns=b?(Number(collection.binderColumns[b.id])||4):4;const columnOptions=Array.from({length:10},(_,i)=>i+1).map(n=>'<option value="'+n+'" '+(n===columns?"selected":"")+'>'+n+'</option>').join("");const options='<option value="'+KANTO_BINDER_ID+'" '+(b?.id===KANTO_BINDER_ID?'selected':'')+'>Original 151 · Auto</option>'+collection.binders.map(x=>'<option value="'+esc(x.id)+'" '+(b&&x.id===b.id?'selected':'')+'>'+esc(x.name)+'</option>').join('');const owned=cards.filter(c=>qty(c.id)>0);const inBinder=b?(b.automatic?original151BinderCards():owned.filter(c=>b.cardIds.includes(c.id))):[];const available=b&&!b.automatic?owned.filter(c=>!b.cardIds.includes(c.id)):[];$("#content").className="binder-view";$("#result-count").textContent="";$("#content").innerHTML='<div class="binder-toolbar"><div class="binder-create"><input id="binder-name" type="text" maxlength="40" placeholder="New binder name"><button class="primary" data-a="binder-create">Create binder</button></div>'+(b?'<label class="binder-picker">Current binder <select id="binder-select">'+options+'</select></label><label class="binder-columns">Columns <select id="binder-columns">'+columnOptions+'</select></label>':'')+'</div>'+(b?'<section class="binder-section"><div class="binder-section-head"><div><h2>'+esc(b.name)+'</h2><p>'+(b.automatic?'One card per Pokémon · '+inBinder.length+' Pokémon · follows the far-left card in Original 151':inBinder.length+' owned card versions in this binder')+'</p></div></div><div class="binder-card-grid" style="grid-template-columns:repeat('+columns+',minmax(0,1fr))">'+(inBinder.length?inBinder.map(c=>binderCardHTML(c,b.automatic?null:b.id,"Remove")).join(''):'<div class="empty">No cards are available in this binder yet.</div>')+'</div></section>'+(b.automatic?'':'<section class="binder-section"><h3>Add owned cards</h3><div class="binder-card-grid" style="grid-template-columns:repeat('+columns+',minmax(0,1fr))">'+(available.length?available.map(c=>binderCardHTML(c,b.id,"Add to binder")).join(''):'<div class="empty">'+(owned.length?'All owned cards are already in this binder.':'No owned cards yet. Use the + button in Collection to record cards you own.')+'</div>')+'</div></section>'):'<div class="empty">Create your first binder to organize selected cards you own.</div>')}

function renderStats(){const t=totals(),done=sets.filter(s=>{const g=cards.filter(c=>c.set===s.code);return g.length&&g.every(c=>qty(c.id)>0)}).length,w=cards.filter(c=>wished(c.id)).length,tr=cards.filter(c=>c.card_type==="trainer"&&qty(c.id)>0).length;$("#content").className="stat-grid";$("#content").innerHTML=[["Unique versions owned",t.versions+" / "+t.total],["Total cards owned",t.quantity],["Pokémon represented",t.pokemon],["Expansions completed",done+" / "+sets.length],["Wishlist entries",w],["Trainer versions owned",tr]].map(([a,b])=>'<article class="stat-panel"><strong>'+b+'</strong><span>'+a.toUpperCase()+'</span></article>').join("");$("#result-count").textContent="Collection overview"}
function render(){if(!catalogReady)return;const t=totals();$("#stat-owned").textContent=t.quantity.toLocaleString();$("#stat-unique").textContent=t.pokemon.toLocaleString();$("#stat-completion").textContent=t.pct+"%";$("#view-caption").textContent=activeView==="kanto151"?"ORIGINAL 151 · ALL CARD VERSIONS":activeView.toUpperCase();$(".toolbar").style.display=["collection","wishlist"].includes(activeView)?"grid":"none";if(activeView==="kanto151"){renderKanto151();return}else if(activeView==="binders"){renderBinders();return}else if(activeView==="expansions")renderSets();else if(activeView==="pokedex")renderDex();else if(activeView==="stats")renderStats();else{if(activeView==="wishlist")$("#ownership-filter").value="wishlist";else if($("#ownership-filter").value==="wishlist")$("#ownership-filter").value="all";renderCards(filtered())}}
function view(v){activeView=v;document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$("#search").value="";document.querySelectorAll(".filter-menu input").forEach(o=>o.checked=false);updateFilterLabels();closeFilterMenus();$("#sort-filter").value="name-asc";render()}
async function load(){try{const r=await fetch(DATA_URL+"?v="+Date.now());if(!r.ok)throw Error("Catalog not built yet ("+r.status+"). Start the Update card catalog workflow in GitHub Actions.");const d=await r.json();cards=d.cards||[];sets=d.sets||[];if(!cards.length)throw Error("Catalog is empty.");filters();catalogReady=true;$("#catalog-status").textContent=cards.length.toLocaleString()+" versions · ready";render()}catch(e){$("#catalog-status").textContent="Catalog unavailable";$("#content").innerHTML='<div class="empty">'+esc(e.message)+'</div>';console.error(e)}}
async function connect(){githubToken=$("#github-token").value.trim();if(!githubToken){$("#github-message").textContent="Paste your token first.";return}$("#github-message").textContent="Checking repository…";try{const r=await fetch("https://api.github.com/repos/"+PRIVATE_REPO,{headers:{Authorization:"Bearer "+githubToken,Accept:"application/vnd.github+json"}});if(!r.ok)throw Error("GitHub check failed ("+r.status+"). Check token permissions.");const repo=await r.json();if(repo.visibility!=="private"){githubToken="";throw Error("STOP: GitHub reports this repository is PUBLIC. Change Settings → General → Danger Zone → visibility to Private. No collection data was sent.")}const c=await fetch("https://api.github.com/repos/"+PRIVATE_REPO+"/contents/collection.json",{headers:{Authorization:"Bearer "+githubToken,Accept:"application/vnd.github+json"}});if(c.status!==200&&c.status!==404)throw Error("Collection access failed ("+c.status+").");$("#github-message").textContent="Private repository verified. "+(c.status===200?"Existing collection found.":"Ready for first sync.")}catch(e){$("#github-message").textContent=e.message}}
function b64(s){const b=new TextEncoder().encode(s);let x="";b.forEach(v=>x+=String.fromCharCode(v));return btoa(x)}
async function sync(){if(!githubToken){$("#github-message").textContent="Verify the private repository first.";return}$("#github-message").textContent="Verifying privacy and syncing…";try{const h={Authorization:"Bearer "+githubToken,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},r=await fetch("https://api.github.com/repos/"+PRIVATE_REPO,{headers:h});if(!r.ok)throw Error("Repository check failed ("+r.status+").");const meta=await r.json();if(meta.visibility!=="private"){githubToken="";throw Error("Repository is not private. Sync blocked.")}const u="https://api.github.com/repos/"+PRIVATE_REPO+"/contents/collection.json",old=await fetch(u,{headers:h});let sha;if(old.status===200)sha=(await old.json()).sha;else if(old.status!==404)throw Error("Could not read collection file.");const body={message:"Update Pocketdex collection",content:b64(JSON.stringify(collection,null,2)),branch:meta.default_branch};if(sha)body.sha=sha;const saved=await fetch(u,{method:"PUT",headers:{...h,"Content-Type":"application/json"},body:JSON.stringify(body)});if(!saved.ok)throw Error((await saved.json()).message||"GitHub save failed.");$("#github-message").textContent="Synced successfully to the private repository."}catch(e){$("#github-message").textContent=e.message}}
function exportData(){const u=URL.createObjectURL(new Blob([JSON.stringify(collection,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=u;a.download="pocketdex-collection-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(u)}
async function importData(f){try{const d=JSON.parse(await f.text());if(!d.cards||typeof d.cards!=="object")throw Error("Not a Pocketdex collection file.");collection={schema_version:1,updated_at:new Date().toISOString(),cards:d.cards,binders:Array.isArray(d.binders)?d.binders:[],kantoOrder:d.kantoOrder&&typeof d.kantoOrder==="object"?d.kantoOrder:{},binderColumns:d.binderColumns&&typeof d.binderColumns==="object"?d.binderColumns:{}};saveLocal();render();$("#github-message").textContent="Imported into this browser. Sync to GitHub when ready."}catch(e){$("#github-message").textContent=e.message}}
document.addEventListener("click",e=>{const b=e.target.closest("[data-a]");if(!b)return;if(b.dataset.a==="kanto-add"){if(Date.now()<kantoSuppressClickUntil)return;change(b.dataset.id,1);return}if(b.dataset.a==="plus")change(b.dataset.id,1);if(b.dataset.a==="minus")change(b.dataset.id,-1);if(b.dataset.a==="wish")wish(b.dataset.id);if(b.dataset.a==="binder-create")createBinder();if(b.dataset.a==="binder-toggle")toggleBinderCard(b.dataset.id)});
document.addEventListener("change",e=>{if(e.target.matches("#binder-select")){activeBinderId=e.target.value;renderBinders()}if(e.target.matches("#binder-columns")){const b=activeBinder();if(b){collection.binderColumns=collection.binderColumns||{};collection.binderColumns[b.id]=Math.max(1,Math.min(10,Number(e.target.value)||4));saveLocal();renderBinders()}}});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>view(b.dataset.view)));
document.addEventListener("pointerdown",e=>{
 const card=e.target.closest(".kanto-card");if(!card||activeView!=="kanto151"||e.button!==0)return;
 clearTimeout(kantoHoldTimer);kantoDrag=null;
 kantoGesture={card,strip:card.parentElement,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startScroll:card.parentElement.scrollLeft,scrolling:false,dragging:false};
 kantoHoldTimer=setTimeout(()=>{
   if(!kantoGesture||kantoGesture.card!==card||kantoGesture.scrolling)return;
   kantoGesture.dragging=true;kantoDrag={card,dex:card.dataset.dex,pointerId:e.pointerId};
   card.classList.add("dragging");
   try{card.setPointerCapture(e.pointerId)}catch(err){}
 },450);
});
document.addEventListener("pointermove",e=>{
 if(!kantoGesture||e.pointerId!==kantoGesture.pointerId)return;
 if(kantoDrag&&kantoDrag.pointerId===e.pointerId){
   e.preventDefault();
   const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(".kanto-card");
   if(!target||target===kantoDrag.card||target.dataset.dex!==kantoDrag.dex)return;
   const strip=target.parentElement,rect=target.getBoundingClientRect();
   if(e.clientX<rect.left+rect.width/2)strip.insertBefore(kantoDrag.card,target);
   else strip.insertBefore(kantoDrag.card,target.nextSibling);
   return;
 }
 const dx=e.clientX-kantoGesture.startX,dy=e.clientY-kantoGesture.startY;
 if(!kantoGesture.scrolling&&!kantoGesture.dragging&&Math.hypot(dx,dy)>8){
   clearTimeout(kantoHoldTimer);kantoHoldTimer=null;
   if(Math.abs(dx)>Math.abs(dy))kantoGesture.scrolling=true;
 }
 if(kantoGesture.scrolling){e.preventDefault();kantoGesture.strip.scrollLeft=kantoGesture.startScroll-dx}
});
document.addEventListener("pointerup",e=>{
 if(!kantoGesture||e.pointerId!==kantoGesture.pointerId)return;
 clearTimeout(kantoHoldTimer);kantoHoldTimer=null;
 if(kantoDrag&&kantoDrag.pointerId===e.pointerId){
   const {card,dex}=kantoDrag,strip=card.parentElement;
   collection.kantoOrder[String(dex)]=[...strip.querySelectorAll(".kanto-card")].map(x=>x.dataset.id);
   card.classList.remove("dragging");kantoDrag=null;kantoSuppressClickUntil=Date.now()+600;saveLocal();
 }else if(kantoGesture.scrolling){kantoSuppressClickUntil=Date.now()+350}
 kantoGesture=null;
});
document.addEventListener("pointercancel",e=>{
 if(!kantoGesture||e.pointerId!==kantoGesture.pointerId)return;
 clearTimeout(kantoHoldTimer);kantoHoldTimer=null;
 if(kantoDrag){kantoDrag.card.classList.remove("dragging");kantoDrag=null}
 kantoGesture=null;
});
document.addEventListener("change",e=>{if(e.target.id==="binder-select"){activeBinderId=e.target.value;renderBinders()}});
document.querySelectorAll(".filter-toggle").forEach(b=>b.addEventListener("click",()=>{const d=b.closest(".filter-dropdown"),open=!d.classList.contains("open");closeFilterMenus(d);d.classList.toggle("open",open);b.setAttribute("aria-expanded",String(open))}));
document.addEventListener("click",e=>{if(!e.target.closest(".filter-dropdown"))closeFilterMenus()});
document.addEventListener("change",e=>{if(e.target.matches(".filter-menu input")){updateFilterLabels();if(!["collection","wishlist","kanto151"].includes(activeView))view("collection");else render()}});
$("#search").addEventListener("input",()=>{if(!["collection","wishlist","kanto151"].includes(activeView))view("collection");else render()});
$("#sort-filter").addEventListener("change",()=>{if(!["collection","wishlist","kanto151"].includes(activeView))view("collection");else render()});
$("#settings-open").addEventListener("click",()=>$("#settings-dialog").showModal());$("#connect-github").addEventListener("click",connect);$("#sync-github").addEventListener("click",sync);$("#export-data").addEventListener("click",exportData);$("#import-data").addEventListener("change",e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=""});
loadLocal();load();