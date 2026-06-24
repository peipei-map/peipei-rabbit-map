import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, doc, setDoc, updateDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { seedRestaurants } from "./seed-data.js";

const ADMIN_EMAIL="a51733123@gmail.com";
const ICON_VERSION="v35-final-20260622";

const firebaseConfig={"apiKey":"AIzaSyAteQ0HuaUaUZXZYqeLO9yUYPKD1N8deUY","authDomain":"peipei-rabbit-map.firebaseapp.com","projectId":"peipei-rabbit-map","storageBucket":"peipei-rabbit-map.firebasestorage.app","messagingSenderId":"101991780527","appId":"1:101991780527:web:48ff82e36670f28360445a","measurementId":"G-R5GMXZGB7M"};

const app=initializeApp(firebaseConfig), db=getFirestore(app), auth=getAuth(app), IS_ADMIN=document.body.dataset.mode==="admin";
let places=[], map, layer, markers={}, user=null, isAdmin=false;
const $=id=>document.getElementById(id);

function statusImage(s){
  return s==="已攻略"?"./images/done.png?"+ICON_VERSION:
         s==="預約中"?"./images/reserve.png?"+ICON_VERSION:
         s==="待確認"?"./images/pending.png?"+ICON_VERSION:
         s==="未攻略"?"./images/todo.png?"+ICON_VERSION:
         "./images/pending.png?"+ICON_VERSION;
}

function labelClass(s){
  return s==="已攻略"?"labelDone":
         s==="預約中"?"labelReserve":
         s==="待確認"?"labelPending":
         "labelTodo";
}

function pill(s){
  return s==="已攻略"?"pdone":
         s==="預約中"?"preserve":
         s==="未攻略"?"ptodo":
         "ppending";
}

function icon(p){
  const todoClass = p.status==="未攻略" ? "todoIcon" : "";

  return L.divIcon({
    html:`
      <div class="markerWrap">
        <img
          class="markerImg ${todoClass}"
          src="${statusImage(p.status)}"
          alt="${p.status}"
        >
      </div>
    `,
    className:"",
    iconSize:[110,90],
    iconAnchor:[55,45],
    popupAnchor:[0,-45]
  });
}

function initMap(){
 map=L.map("map").setView([23.75,121.05],7);

if(window.innerWidth <= 760){
  map.dragging.disable();
  map.touchZoom.disable();
  map.doubleClickZoom.disable();
  map.scrollWheelZoom.disable();
  map.boxZoom.disable();
  map.keyboard.disable();

  if(map.tap){
    map.tap.disable();
  }
}
}

function renderMarkers(){
  layer.clearLayers();
  markers={};

  for(const p of places){
    const m=L.marker([+p.lat,+p.lng],{icon:icon(p)}).addTo(layer);

    m.bindPopup(`
      <b>${p.id}. ${p.name}</b><br>
      狀態：${p.status}<br>
      📍 ${p.address}<br>
      ☎️ ${p.phone||"待補"}<br>
      🐰 ${p.rabbit_note||""}<br><br>
      <a href="${p.google_maps}" target="_blank">開啟 Google 地圖</a>
    `);

    m.on("click",()=>$("card-"+p.id)?.scrollIntoView({
      behavior:"smooth",
      block:"center"
    }));

    markers[p.id]=m;
  }
}

window.fitAll=()=>{
  const g=L.featureGroup(Object.values(markers));

  if(g.getLayers().length){
    map.fitBounds(g.getBounds().pad(.18));
  }else{
    map.setView([23.75,121.05],7);
  }
}

function countStatus(s){
  return places.filter(p=>p.status===s).length;
}

function stats(){
  const done=countStatus("已攻略");
  const reserved=countStatus("預約中");
  const pending=countStatus("待確認");
  const todo=countStatus("未攻略");
  const r=places.length?done/places.length*100:0;

  $("done").textContent=done;

  if($("reserved")) $("reserved").textContent=reserved;
  if($("pending")) $("pending").textContent=pending;
  if($("todo")) $("todo").textContent=todo;
  if($("total")) $("total").textContent=places.length;

  $("bar").style.width=r+"%";
}

window.renderCards=()=>{
  const reg=$("region").value;
  const st=$("status").value;
  const q=$("search").value.trim().toLowerCase();

  $("cards").innerHTML="";

  places
    .filter(p=>(!reg||p.region===reg)&&(!st||p.status===st))
    .filter(p=>!q||[p.name,p.city,p.address,p.rabbit_note].join(" ").toLowerCase().includes(q))
    .forEach(p=>{
      const edit=IS_ADMIN&&isAdmin;

      const sel=edit?`
        <select onchange="changeStatus('${p.id}',this.value)">
          <option ${p.status==="待確認"?"selected":""}>待確認</option>
          <option ${p.status==="預約中"?"selected":""}>預約中</option>
          <option ${p.status==="已攻略"?"selected":""}>已攻略</option>
          <option ${p.status==="未攻略"?"selected":""}>未攻略</option>
        </select>
      `:"";

      const tmpl=edit?`<button onclick="fillTemplate('${p.id}')">套用模板</button>`:"";

      const d=document.createElement("div");
      d.className="card";
      d.id="card-"+p.id;

      d.innerHTML=`
        <div class="thumb">
          <img src="${statusImage(p.status)}" alt="${p.status}">
        </div>

        <div class="cardBody">
          <span class="pill ${pill(p.status)}">${p.status}</span>
          ${sel}
          <h3>${p.id}. ${p.name}</h3>
          <div class="meta">
            📍 ${p.address}<br>
            ☎️ ${p.phone||"待補"}<br>
            🐰 ${p.rabbit_note||""}
          </div>
        </div>

        <div class="actions">
          <a class="link" href="${p.google_maps}" target="_blank">Google 地圖</a>
          <a class="link" href="${p.source}" target="_blank">來源</a>
          ${tmpl}
          <button onclick="focusMarker('${p.id}')">定位圖釘</button>
        </div>
      `;

      $("cards").appendChild(d);
    });
}

window.focusMarker=id=>{
  const p=places.find(x=>String(x.id)===String(id));
  if(!p)return;

  map.setView([+p.lat,+p.lng],14);
  markers[p.id]?.openPopup();
}

window.changeStatus=async(id,status)=>{
  if(!isAdmin)return alert("只有管理員可以修改");

  await updateDoc(
    doc(db,"restaurants",String(id).padStart(3,"0")),
    {status}
  );
}

window.seedData=async()=>{
  if(!isAdmin)return alert("請先用管理員帳號登入");

  if(!confirm("匯入 7 筆餐廳資料？"))return;

  for(const p of seedRestaurants){
    const id=String(p.id).padStart(3,"0");
    await setDoc(doc(db,"restaurants",id),{...p,id});
  }

  alert("匯入完成");
}

window.loginGoogle=()=>signInWithPopup(auth,new GoogleAuthProvider());
window.logoutGoogle=()=>signOut(auth);

function template(p){
  const done=countStatus("已攻略");

  return `🐰 培培兔子友善餐廳攻略 #${String(p.id).padStart(3,"0")}

📍地點：${p.name}
🗺️城市：${p.city}
✅狀態：${p.status}
🐰培培反應：
⭐兔友善感受：
🏍️路線心得：

目前進度：${done} / ${places.length}
#培培環台計畫 #兔子友善餐廳 #兔兔日常`;
}

window.fillTemplate=id=>{
  const p=places.find(x=>String(x.id)===String(id));
  if(p && $("template")) $("template").value=template(p);
}

window.copyTemplate=()=>{
  $("template").select();
  document.execCommand("copy");
  alert("已複製");
}

window.copyPublicTemplate=()=>{
  const url="https://peipei-map.github.io/peipei-rabbit-map/";

  const text=`🐰 培培環台兔子友善餐廳地圖上線！

目前收錄 ${places.length} 個兔子友善餐廳／據點。
歡迎推薦更多兔兔友善店家給培培 ❤️

🗺️ 地圖：${url}

#培培環台計畫 #兔子友善餐廳 #兔兔日常`;

  navigator.clipboard?.writeText(text)
    .then(()=>alert("Threads 模板已複製"))
    .catch(()=>alert(text));
}

window.downloadRecap=()=>{
  alert("年度回顧圖卡功能保留中，下一版可再美化輸出。");
}

function authBox(){
  if(!IS_ADMIN)return;

  $("auth").innerHTML=!user?
    `<button onclick="loginGoogle()">Google 登入</button>`:
    isAdmin?
      `管理員登入中：${user.email} <button onclick="logoutGoogle()">登出</button>`:
      `目前登入：${user.email}（非管理員） <button onclick="logoutGoogle()">登出</button>`;

  if($("seed")) $("seed").classList.toggle("hidden",!isAdmin);
}

function render(){
  stats();
  renderCards();
  renderMarkers();
  authBox();
}

onAuthStateChanged(auth,u=>{
  user=u;
  isAdmin=!!u&&u.email===ADMIN_EMAIL;
  render();
});

initMap();

onSnapshot(
  query(collection(db,"restaurants"),orderBy("id")),
  snap=>{
    places=snap.docs.map(d=>({id:d.id,...d.data()}));
    render();
    if(places.length)fitAll();
  },
  e=>{
    $("cards").innerHTML=`<p>讀取 Firestore 失敗：${e.message}</p>`;
  }
);