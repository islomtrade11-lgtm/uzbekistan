import http from "http";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.error("OPENWEATHER_API_KEY is missing");
  process.exit(1);
}

/* ================= HTML ================= */
const HTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Uzbekistan Weather</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
:root{
  --bg:#f6f7f9;
  --card:#ffffff;
  --text:#111827;
  --muted:#6b7280;
  --accent:#3b82f6;
  --good:#16a34a;
  --warn:#d97706;
}

*{box-sizing:border-box}

body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto;
  background:var(--bg);
  color:var(--text);
}

/* ===== HEADER ===== */
header{
  padding:24px 16px 12px;
  text-align:center;
}
header h1{
  margin:0;
  font-size:24px;
  font-weight:600;
}
header p{
  margin:6px 0 0;
  font-size:14px;
  color:var(--muted);
}

/* ===== CITY PILLS ===== */
.city-pills{
  display:flex;
  gap:10px;
  justify-content:center;
  flex-wrap:wrap;
  margin-top:14px;
}
.pill{
  background:var(--card);
  border-radius:14px;
  padding:8px 12px;
  font-size:14px;
  box-shadow:0 6px 18px rgba(0,0,0,.06);
  cursor:pointer;
}
.pill.active{
  outline:2px solid var(--accent);
}

/* ===== MAP ===== */
.map-wrap{
  margin:20px auto 0;
  max-width:1100px;
  padding:0 12px;
}
.map{
  position:relative;
}
.map object{
  width:100%;
  height:420px;
  display:block;
}

/* ===== DOTS ===== */
.city-dot{
  position:absolute;
  transform:translate(-50%,-50%);
  cursor:pointer;
}
.city-dot .dot{
  width:14px;
  height:14px;
  border-radius:50%;
  background:var(--accent);
  box-shadow:0 0 0 8px rgba(59,130,246,.18);
}
.city-dot.active .dot{
  box-shadow:0 0 0 10px rgba(59,130,246,.28);
}

/* ===== CITY PANEL ===== */
.panel{
  max-width:1100px;
  margin:16px auto 0;
  padding:0 12px;
}
.panel-inner{
  background:var(--card);
  border-radius:20px;
  padding:16px;
  box-shadow:0 10px 30px rgba(0,0,0,.08);
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.panel h2{
  grid-column:1 / -1;
  margin:0 0 6px;
  font-size:18px;
}
.stat{
  background:#f9fafb;
  border-radius:14px;
  padding:12px;
}
.stat span{
  display:block;
  font-size:13px;
  color:var(--muted);
}
.stat strong{
  font-size:18px;
  font-weight:500;
}
.panel-note{
  grid-column:1 / -1;
  font-size:14px;
  color:var(--muted);
}

/* ===== POPULAR ===== */
.popular{
  max-width:1100px;
  margin:28px auto 0;
  padding:0 12px;
}
.popular h3{
  margin:0 0 10px;
  font-size:16px;
}
.popular-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
  gap:12px;
}
.city-card{
  background:var(--card);
  border-radius:16px;
  padding:12px;
  box-shadow:0 6px 18px rgba(0,0,0,.06);
}
.city-card strong{
  font-size:15px;
}
.city-card span{
  display:block;
  margin-top:6px;
  font-size:14px;
  color:var(--muted);
}

/* ===== FOOTER ===== */
footer{
  text-align:center;
  margin:30px 0 16px;
  font-size:13px;
  color:var(--muted);
}
</style>
</head>

<body>

<header>
  <h1>Uzbekistan Weather</h1>
  <p id="time"></p>
  <div class="city-pills" id="pills"></div>
</header>

<div class="map-wrap">
  <div class="map" id="map">
    <object data="/uzbekistan.svg" type="image/svg+xml"></object>
  </div>
</div>

<div class="panel">
  <div class="panel-inner" id="panel">
    <h2 id="panelTitle">Выберите город</h2>
    <div class="panel-note">Нажмите на точку на карте или выберите город выше.</div>
  </div>
</div>

<section class="popular">
  <h3>Popular Cities</h3>
  <div class="popular-grid" id="popular"></div>
</section>

<footer>
Real-time weather · Air quality · Uzbekistan
</footer>

<script>
/* ===== TIME ===== */
setInterval(function(){
  document.getElementById("time").innerText =
    new Date().toLocaleString("ru-RU");
},1000);

/* ===== DATA ===== */
const cities = [
  {key:"tashkent", name:"Tashkent", lat:41.2995, lon:69.2401, x:63, y:38},
  {key:"samarkand", name:"Samarkand", lat:39.6542, lon:66.9597, x:50, y:52},
  {key:"bukhara", name:"Bukhara", lat:39.7747, lon:64.4286, x:42, y:50},
  {key:"khiva", name:"Khiva", lat:41.3890, lon:60.3422, x:30, y:40},
  {key:"nukus", name:"Nukus", lat:42.4531, lon:59.6103, x:26, y:36},
  {key:"fergana", name:"Fergana", lat:40.3864, lon:71.7864, x:70, y:44}
];

let selectedKey = null;

const mapEl = document.getElementById("map");
const pillsEl = document.getElementById("pills");
const panelEl = document.getElementById("panel");
const popularEl = document.getElementById("popular");

/* ===== PILLS ===== */
cities.forEach(function(c){
  const p = document.createElement("div");
  p.className = "pill";
  p.textContent = c.name;
  p.onclick = function(){ selectCity(c.key); };
  pillsEl.appendChild(p);
});

/* ===== POPULAR ===== */
cities.forEach(function(c){
  const card = document.createElement("div");
  card.className = "city-card";
  const t = document.createElement("strong");
  t.textContent = c.name;
  const s = document.createElement("span");
  s.id = "pop-" + c.key;
  s.textContent = "Loading…";
  card.appendChild(t);
  card.appendChild(s);
  card.onclick = function(){ selectCity(c.key); };
  popularEl.appendChild(card);
});

/* ===== DOTS ===== */
cities.forEach(function(c){
  const d = document.createElement("div");
  d.className = "city-dot";
  d.style.left = c.x + "%";
  d.style.top = c.y + "%";

  const dot = document.createElement("div");
  dot.className = "dot";

  d.appendChild(dot);
  d.onclick = function(){ selectCity(c.key); };

  mapEl.appendChild(d);
});

/* ===== SELECT ===== */
async function selectCity(key){
  if(selectedKey === key) return;
  selectedKey = key;

  // active states
  Array.from(document.querySelectorAll(".pill")).forEach(function(p){
    p.classList.toggle("active", p.textContent === cityByKey(key).name);
  });
  Array.from(document.querySelectorAll(".city-dot")).forEach(function(d,i){
    d.classList.toggle("active", cities[i].key === key);
  });

  const c = cityByKey(key);
  const r = await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(function(r){return r.json();});

  renderPanel(c, r);
  const pop = document.getElementById("pop-"+key);
  if(pop) pop.textContent = Math.round(r.temp) + "° · " + (r.air.aqi<=2?"Good":"Moderate");
}

function cityByKey(key){
  return cities.filter(function(c){ return c.key === key; })[0];
}

/* ===== PANEL ===== */
function renderPanel(c, r){
  panelEl.innerHTML = "";

  const h = document.createElement("h2");
  h.id = "panelTitle";
  h.textContent = c.name;

  const s1 = stat("Температура", Math.round(r.temp) + "°");
  const s2 = stat("Ощущается", Math.round(r.feels) + "°");
  const s3 = stat("Ветер", r.wind + " м/с");
  const s4 = stat("Воздух", r.air.aqi<=2 ? "Хороший" : "Средний");

  const note = document.createElement("div");
  note.className = "panel-note";
  note.textContent =
    r.temp < 5 ? "Холодно, нужна тёплая одежда." :
    r.temp < 15 ? "Прохладно, комфортно для прогулок." :
    "Тёплая и комфортная погода.";

  panelEl.appendChild(h);
  panelEl.appendChild(s1);
  panelEl.appendChild(s2);
  panelEl.appendChild(s3);
  panelEl.appendChild(s4);
  panelEl.appendChild(note);
}

function stat(label, value){
  const d = document.createElement("div");
  d.className = "stat";
  const s = document.createElement("span");
  s.textContent = label;
  const v = document.createElement("strong");
  v.textContent = value;
  d.appendChild(s);
  d.appendChild(v);
  return d;
}
</script>

</body>
</html>
`;
/* ================= DATA ================= */
async function getData(lat, lon) {
  const w = await fetch(
    "https://api.openweathermap.org/data/2.5/weather?lat="+lat+
    "&lon="+lon+"&units=metric&lang=ru&appid="+API_KEY
  ).then(r=>r.json());

  const a = await fetch(
    "https://api.openweathermap.org/data/2.5/air_pollution?lat="+lat+
    "&lon="+lon+"&appid="+API_KEY
  ).then(r=>r.json());

  const f = await fetch(
    "https://api.openweathermap.org/data/2.5/forecast?lat="+lat+
    "&lon="+lon+"&units=metric&appid="+API_KEY
  ).then(r=>r.json());

  return {
    temp:w.main.temp,
    feels:w.main.feels_like,
    humidity:w.main.humidity,
    pressure_mm:Math.round(w.main.pressure*0.75),
    wind:w.wind.speed,
    visibility_km:w.visibility/1000,
    air:{
      aqi:a.list[0].main.aqi,
      pm25:a.list[0].components.pm2_5
    },
    forecast:f.list.slice(0,8).map(x=>x.main.temp)
  };
}

/* ================= SERVER ================= */
http.createServer(async function(req,res){
  if(req.url.startsWith("/api")){
    const u=new URL(req.url,"http://x");
    try{
      const data=await getData(
        u.searchParams.get("lat"),
        u.searchParams.get("lon")
      );
      res.writeHead(200,{"Content-Type":"application/json"});
      res.end(JSON.stringify(data));
    }catch{
      res.writeHead(500);res.end("API error");
    }
    return;
  }
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});
  res.end(HTML);
}).listen(PORT,function(){
  console.log("✅ Server running on",PORT);
});
