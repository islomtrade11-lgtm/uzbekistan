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
<title>Узбекистан — погода и экология</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
:root{
  --bg:#f4f6f8;
  --card:#ffffff;
  --text:#0f172a;
  --accent:#2563eb;
}
body.night{
  --bg:#020617;
  --card:#020617;
  --text:#e5e7eb;
  --accent:#38bdf8;
}
body{
  margin:0;
  font-family:system-ui;
  background:var(--bg);
  color:var(--text);
  transition:background .5s,color .5s;
}
header{
  background:linear-gradient(135deg,#2563eb,#16a34a);
  color:#fff;
  padding:20px;
  text-align:center;
}
main{
  max-width:1200px;
  margin:auto;
  padding:20px;
  display:grid;
  gap:20px;
}
.card{
  background:var(--card);
  border-radius:16px;
  padding:20px;
  box-shadow:0 10px 20px rgba(0,0,0,.15);
}
.citybar{display:flex;gap:12px;justify-content:center;margin-top:10px}
select{padding:8px 12px;font-size:16px;border-radius:8px}

.small{font-size:14px;opacity:.75}
.good{color:#16a34a;font-weight:600}
.warn{color:#d97706;font-weight:600}
.bad{color:#dc2626;font-weight:600}

/* ===== MAP ===== */
.map-wrap{position:relative;overflow:hidden;border-radius:12px}
#map{width:100%;height:360px}
.map-outline{fill:#e0e7ff;stroke:#1e293b;stroke-width:2}

/* heatmap */
.heat-cold{fill:#93c5fd}
.heat-cool{fill:#bfdbfe}
.heat-warm{fill:#fde68a}
.heat-hot{fill:#fca5a5}

/* cities */
.city-dot{fill:#2563eb;cursor:pointer}
.city-dot.active{fill:#dc2626}
.city-label{font-size:10px;pointer-events:none}

/* wind */
.wind-arrow{
  stroke:#0f172a;
  stroke-width:2;
  opacity:.7;
  marker-end:url(#arrow);
}

/* layers */
.layers{
  display:flex;
  gap:16px;
  margin-bottom:10px;
  font-size:14px;
}

/* chart */
canvas{width:100%;height:260px}

#tooltip{
  position:absolute;
  background:#000;
  color:#fff;
  padding:6px 8px;
  border-radius:6px;
  font-size:13px;
  display:none;
  pointer-events:none;
}
</style>
</head>

<body>

<header>
  <h1>🇺🇿 Узбекистан — погода и экология</h1>
  <p id="time"></p>
  <div class="citybar">
    <label>Город:</label>
    <select id="city"></select>
  </div>
</header>

<div class="card" id="summary" style="margin:20px auto;max-width:1200px">
  <h2 id="summaryTitle">Сейчас</h2>
  <ul id="summaryList" style="list-style:none;padding:0;font-size:18px"></ul>
  <p class="small" id="updatedAt"></p>
</div>

<main>

<!-- ===== MAP ===== -->
<div class="card">
<h2>🗺 Карта Узбекистана</h2>

<div class="layers">
  <label><input type="checkbox" id="toggleHeat" checked> Температура</label>
  <label><input type="checkbox" id="toggleWind" checked> Ветер</label>
</div>

<div class="map-wrap">
<svg id="map" viewBox="0 0 600 300">

<defs>
<marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3"
  orient="auto">
  <path d="M0,0 L0,6 L9,3 z" fill="#0f172a"/>
</marker>
</defs>

<!-- outline -->
<path id="heatmap" class="map-outline"
  d="M40 140 L80 90 L150 70 L260 60 L340 90 L420 80 L500 120
     L520 160 L480 200 L420 210 L360 230 L280 220 L200 240
     L140 210 L90 190 Z"/>

<!-- cities -->
<g id="citiesLayer"></g>

<!-- wind -->
<g id="windLayer"></g>

</svg>
</div>

<p class="small">Карта интерактивная: города, температура, ветер</p>
</div>

<!-- ===== WEATHER ===== -->
<div class="card">
<h2 id="region">Данные региона</h2>
<div id="weather"></div>
</div>

<!-- ===== CHART ===== -->
<div class="card">
<h2>📊 Температура на 24 часа</h2>
<canvas id="chart"></canvas>
</div>

</main>

<div id="tooltip"></div>

<script>
/* ===== TIME ===== */
setInterval(()=>time.innerText=new Date().toLocaleString("ru-RU"),1000);

/* ===== CITIES (ВСЕ) ===== */
const cities={
  tashkent:{name:"Ташкент",lat:41.2995,lon:69.2401,x:330,y:95},
  samarkand:{name:"Самарканд",lat:39.6542,lon:66.9597,x:260,y:160},
  bukhara:{name:"Бухара",lat:39.7747,lon:64.4286,x:190,y:150},
  andijan:{name:"Андижан",lat:40.7821,lon:72.3442,x:380,y:120},
  namangan:{name:"Наманган",lat:40.9983,lon:71.6726,x:360,y:110},
  fergana:{name:"Фергана",lat:40.3864,lon:71.7864,x:350,y:125},
  kokand:{name:"Коканд",lat:40.5286,lon:70.9425,x:340,y:115},
  jizzakh:{name:"Джизак",lat:40.1250,lon:67.8800,x:240,y:150},
  navoiy:{name:"Навои",lat:40.0844,lon:65.3792,x:210,y:140},
  qarshi:{name:"Карши",lat:38.8606,lon:65.7890,x:240,y:190},
  termiz:{name:"Термез",lat:37.2242,lon:67.2783,x:260,y:230},
  urgench:{name:"Ургенч",lat:41.5500,lon:60.6333,x:130,y:120},
  nukus:{name:"Нукус",lat:42.4531,lon:59.6103,x:110,y:110}
};

/* selector */
for(const k in cities){
  const o=document.createElement("option");
  o.value=k;o.textContent=cities[k].name;
  city.appendChild(o);
}

/* draw city dots */
for(const k in cities){
  const c=cities[k];
  citiesLayer.innerHTML+=
    '<circle class="city-dot" id="dot-'+k+'" cx="'+c.x+'" cy="'+c.y+'" r="4" onclick="selectCity(\\''+k+'\\')"/>'+
    '<text class="city-label" x="'+(c.x+5)+'" y="'+(c.y-5)+'">'+c.name+'</text>';
}

/* ===== MAIN LOAD ===== */
async function loadCity(key){
  localStorage.setItem("city",key);
  const c=cities[key];
  region.innerText=c.name;
  summaryTitle.innerText="Сейчас в "+c.name;

  const r=await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(r=>r.json());

  // day/night
  document.body.classList.toggle("night",Date.now()<r.sunrise||Date.now()>r.sunset);

  // summary
  summaryList.innerHTML=
    "<li>"+(r.temp<10?"🧥 Холодно":"😊 Комфортно")+"</li>"+
    "<li>"+(r.air.aqi<=2?"🌫 Воздух хороший":"⚠️ Воздух средний")+"</li>";
  updatedAt.innerText="Обновлено только что";

  // weather
  weather.innerHTML="🌡 "+r.temp+" °C · 🤗 "+r.feels+" °C · 🌬 "+r.wind+" м/с";

  // heatmap
  heatmap.className="map-outline "+(
    r.temp<0?"heat-cold":
    r.temp<10?"heat-cool":
    r.temp<25?"heat-warm":
    "heat-hot"
  );

  // wind
  windLayer.innerHTML="";
  const len=Math.min(30,r.wind*3);
  const rad=(r.wind_deg-90)*Math.PI/180;
  windLayer.innerHTML=
    '<line class="wind-arrow" x1="'+c.x+'" y1="'+c.y+'" x2="'+
    (c.x+Math.cos(rad)*len)+'" y2="'+
    (c.y+Math.sin(rad)*len)+'"/>';

  drawChart(r.forecast);
  highlight(key);
}

function selectCity(k){
  city.value=k;
  loadCity(k);
}
function highlight(k){
  document.querySelectorAll(".city-dot").forEach(d=>d.classList.remove("active"));
  const el=document.getElementById("dot-"+k);
  if(el) el.classList.add("active");
}

/* layers toggle */
toggleHeat.onchange=()=>heatmap.style.display=toggleHeat.checked?"":"none";
toggleWind.onchange=()=>windLayer.style.display=toggleWind.checked?"":"none";

/* ===== CHART ===== */
function drawChart(data){
  if(!data||!data.length) return;
  const ctx=chart.getContext("2d");
  chart.width=600;chart.height=260;
  ctx.clearRect(0,0,600,260);

  const temps=data.map(p=>p.temp);
  const max=Math.max(...temps),min=Math.min(...temps);
  const pad=40;

  ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--accent");
  ctx.beginPath();
  data.forEach((p,i)=>{
    const x=pad+i*((600-pad*2)/(data.length-1));
    const y=220-((p.temp-min)/(max-min))*180;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
}

/* start */
city.onchange=()=>loadCity(city.value);
const saved=localStorage.getItem("city")||"tashkent";
city.value=saved;
loadCity(saved);
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
