
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { seedRestaurants } from "./seed-data.js";
const ADMIN_EMAIL="a51733123@gmail.com", firebaseConfig={"apiKey": "AIzaSyAteQ0HuaUaUZXZYqeLO9yUYPKD1N8deUY", "authDomain": "peipei-rabbit-map.firebaseapp.com", "projectId": "peipei-rabbit-map", "storageBucket": "peipei-rabbit-map.firebasestorage.app", "messagingSenderId": "101991780527", "appId": "1:101991780527:web:48ff82e36670f28360445a", "measurementId": "G-R5GMXZGB7M"};
const app=initializeApp(firebaseConfig), db=getFirestore(app), auth=getAuth(app), IS_ADMIN=document.body.dataset.mode==="admin";
let places=[], map, layer, markers={}, user=null, isAdmin=false;
const $=id=>document.getElementById(id);
function statusEmoji(s){return s==="已攻略"?"🐰☕":s==="預約中"?"🐰✨":s==="待確認"?"🐰📖":s==="未攻略"?"📍":"🐰"}
function labelClass(s){return s==="已攻略"?"labelDone":s==="預約中"?"labelReserve":s==="待確認"?"labelPending":"labelTodo"}
function pill(s){return s==="已攻略"?"pdone":s==="未攻略"?"ptodo":"ppending"}
function icon(p){return L.divIcon({html:`<div class="markerWrap"><div class="customMarker">${statusEmoji(p.status)}</div><span class="statusLabel ${labelClass(p.status)}">${p.status}</span><span class="markerNum">${p.id}</span></div>`,className:"",iconSize:[92,72],iconAnchor:[31,36],popupAnchor:[0,-34]})}
function initMap(){map=L.map("map").setView([23.75,121.05],7);L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);layer=L.layerGroup().addTo(map)}
function renderMarkers(){layer.clearLayers();markers={};for(const p of places){const m=L.marker([+p.lat,+p.lng],{icon:icon(p)}).addTo(layer);m.bindPopup(`<b>${p.id}. ${p.name}</b><br>📍 ${p.address}<br>☎️ ${p.phone||"待補"}<br>🐰 ${p.rabbit_note||""}<br><br><a href="${p.google_maps}" target="_blank">開啟 Google 地圖</a>`);m.on("click",()=>$("card-"+p.id)?.scrollIntoView({behavior:"smooth",block:"center"}));markers[p.id]=m}}
window.fitAll=()=>{const g=L.featureGroup(Object.values(markers));if(g.getLayers().length)map.fitBounds(g.getBounds().pad(.18))}
function stats(){const done=places.filter(p=>p.status==="已攻略"),r=places.length?done.length/places.length*100:0;$("done").textContent=done.length;$("total").textContent=places.length;$("cities").textContent=new Set(done.map(p=>p.city)).size;$("bar").style.width=r+"%"}
window.renderCards=()=>{const reg=$("region").value,st=$("status").value,q=$("search").value.trim().toLowerCase();$("cards").innerHTML="";places.filter(p=>(!reg||p.region===reg)&&(!st||p.status===st)).filter(p=>!q||[p.name,p.city,p.address,p.rabbit_note].join(" ").toLowerCase().includes(q)).forEach(p=>{const edit=IS_ADMIN&&isAdmin;const sel=edit?`<select onchange="changeStatus('${p.id}',this.value)"><option ${p.status==="待確認"?"selected":""}>待確認</option><option ${p.status==="預約中"?"selected":""}>預約中</option><option ${p.status==="已攻略"?"selected":""}>已攻略</option><option ${p.status==="未攻略"?"selected":""}>未攻略</option></select>`:"";const tmpl=edit?`<button onclick="fillTemplate('${p.id}')">套用模板</button>`:"";const d=document.createElement("div");d.className="card";d.id="card-"+p.id;d.innerHTML=`<div class="thumb">${statusEmoji(p.status)}</div><div><span class="pill ${pill(p.status)}">${p.status}</span> ${sel}<h3>${p.id}. ${p.name}</h3><div>📍 ${p.address}<br>☎️ ${p.phone||"待補"}<br>🐰 ${p.rabbit_note||""}</div><div class="actions"><a class="link" href="${p.google_maps}" target="_blank">Google 地圖</a><a class="link" href="${p.source}" target="_blank">來源</a>${tmpl}<button onclick="focusMarker('${p.id}')">定位圖釘</button></div></div>`;$("cards").appendChild(d)})}
window.focusMarker=id=>{const p=places.find(x=>String(x.id)===String(id));map.setView([+p.lat,+p.lng],14);markers[p.id]?.openPopup()}
window.changeStatus=async(id,status)=>{if(!isAdmin)return alert("只有管理員可以修改");await updateDoc(doc(db,"restaurants",String(id).padStart(3,"0")),{status})}
window.seedData=async()=>{if(!isAdmin)return alert("請先用管理員帳號登入");if(!confirm("匯入 7 筆餐廳資料？"))return;for(const p of seedRestaurants){const id=String(p.id).padStart(3,"0");await setDoc(doc(db,"restaurants",id),{...p,id})}alert("匯入完成")}
window.loginGoogle=()=>signInWithPopup(auth,new GoogleAuthProvider()); window.logoutGoogle=()=>signOut(auth);
function template(p){const done=places.filter(x=>x.status==="已攻略").length;return `🐰 培培兔子友善餐廳攻略 #${String(p.id).padStart(3,"0")}\n\n📍地點：${p.name}\n🗺️城市：${p.city}\n✅狀態：${p.status}\n🐰培培反應：\n⭐兔友善感受：\n🏍️路線心得：\n\n目前進度：${done} / ${places.length}\n#培培環台計畫 #兔子友善餐廳 #兔兔日常`}
window.fillTemplate=id=>{$("template").value=template(places.find(x=>String(x.id)===String(id)))}
window.copyTemplate=()=>{$("template").select();document.execCommand("copy");alert("已複製")}
window.copyPublicTemplate=()=>{const url="https://peipei-map.github.io/peipei-rabbit-map/";const done=places.filter(p=>p.status==="已攻略").length;const text=`🐰 培培環台兔子友善餐廳地圖上線！\n\n目前收錄 ${places.length} 個兔子友善餐廳／據點，已攻略 ${done} 個。\n歡迎推薦更多兔兔友善店家給培培 ❤️\n\n🗺️ 地圖：${url}\n\n#培培環台計畫 #兔子友善餐廳 #兔兔日常`;navigator.clipboard?.writeText(text).then(()=>alert("Threads 模板已複製")).catch(()=>alert(text))}
window.downloadRecap=()=>{alert("年度回顧圖卡功能保留中，下一版可再美化輸出。")}
function authBox(){if(!IS_ADMIN)return; $("auth").innerHTML=!user?`<button onclick="loginGoogle()">Google 登入</button>`: isAdmin?`管理員登入中：${user.email} <button onclick="logoutGoogle()">登出</button>`:`目前登入：${user.email}（非管理員） <button onclick="logoutGoogle()">登出</button>`; $("seed").classList.toggle("hidden",!isAdmin)}
function render(){stats();renderCards();renderMarkers();authBox()}
onAuthStateChanged(auth,u=>{user=u;isAdmin=!!u&&u.email===ADMIN_EMAIL;render()});
initMap();onSnapshot(query(collection(db,"restaurants"),orderBy("id")),snap=>{places=snap.docs.map(d=>({id:d.id,...d.data()}));render();if(places.length)fitAll()},e=>{$("cards").innerHTML=`<p>讀取 Firestore 失敗：${e.message}</p>`});
