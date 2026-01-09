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
  transition:background .6s,color .6s;
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
  transition:background .6s;
}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:12px;
}
.good{color:#16a34a;font-weight:600}
.warn{color:#d97706;font-weight:600}
.bad{color:#dc2626;font-weight:600}
canvas{width:100%;height:260px}
footer{text-align:center;font-size:13px;opacity:.8}
#summary ul li{margin-bottom:8px}
select{padding:8px 12px;font-size:16px;border-radius:8px}
.citybar{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:10px}
.small{font-size:14px;opacity:.75}

/* карта */
svg{max-width:100%}
svg path{
  fill:#c7d2fe;
  stroke:#1e293b;
  cursor:pointer;
  transition:.3s;
}
svg path:hover{fill:#38bdf8}
svg path.active{fill:#2563eb}

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

<!-- КАРТА (НЕ УБРАНА!) -->
<div class="card">
<h2>🗺 Карта Узбекистана</h2>
<svg viewBox="0 0 600 350">
  <path id="map-tashkent"  d="M60 160 L140 90 L210 120 L200 190 L120 210 Z" onclick="selectCity('tashkent')"/>
  <path id="map-samarkand" d="M200 190 L210 120 L300 130 L320 200 L260 240 Z" onclick="selectCity('samarkand')"/>
  <path id="map-bukhara"   d="M320 200 L300 130 L380 120 L450 160 L390 230 Z" onclick="selectCity('bukhara')"/>
  <path id="map-nukus"     d="M450 160 L520 190 L540 250 L480 280 L420 240 Z" onclick="selectCity('nukus')"/>
</svg>
<p class="small">Можно выбрать город на карте или в списке выше</p>
</div>

<div class="card">
<h2 id="region">Данные региона</h2>
<div class="grid" id="weather"></div>
<p id="weatherHuman" class="small"></p>
</div>

<div class="card">
<h2>🌫 Экология</h2>
<p id="air"></p>
<p id="airHuman"></p>
<p id="airExplain" class="small"></p>
</div>

<div class="card">
<h2>📊 Температура на 24 часа</h2>
<canvas id="chart"></canvas>
<p id="forecastText" class="small"></p>
</div>

</main>

<footer>
Данные обновляются каждые 10 минут · OpenWeather · Fly.io
</footer>

<div id="tooltip"></div>

<script>
/* ===== ВРЕМЯ ===== */
setInterval(()=>time.innerText=new Date().toLocaleString("ru-RU"),1000);

/* ===== ВСЕ ГОРОДА (НИЧЕГО НЕ УБРАНО) ===== */
const cities={
  tashkent:{name:"Ташкент",lat:41.2995,lon:69.2401},
  samarkand:{name:"Самарканд",lat:39.6542,lon:66.9597},
  bukhara:{name:"Бухара",lat:39.7747,lon:64.4286},
  andijan:{name:"Андижан",lat:40.7821,lon:72.3442},
  namangan:{name:"Наманган",lat:40.9983,lon:71.6726},
  fergana:{name:"Фергана",lat:40.3864,lon:71.7864},
  kokand:{name:"Коканд",lat:40.5286,lon:70.9425},
  jizzakh:{name:"Джизак",lat:40.1250,lon:67.8800},
  navoiy:{name:"Навои",lat:40.0844,lon:65.3792},
  qarshi:{name:"Карши",lat:38.8606,lon:65.7890},
  termiz:{name:"Термез",lat:37.2242,lon:67.2783},
  urgench:{name:"Ургенч",lat:41.5500,lon:60.6333},
  nukus:{name:"Нукус",lat:42.4531,lon:59.6103}
};

/* селектор */
for(const k in cities){
  const o=document.createElement("option");
  o.value=k;
  o.textContent=cities[k].name;
  city.appendChild(o);
}

/* ===== ГЛАВНАЯ ЗАГРУЗКА ===== */
async function loadCity(key){
  localStorage.setItem("city",key);
  const c=cities[key];

  region.innerText=c.name;
  summaryTitle.innerText="Сейчас в "+c.name;

  const r=await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(r=>r.json());

  /* день / ночь */
  document.body.classList.toggle("night",Date.now()<r.sunrise||Date.now()>r.sunset);

  summaryList.innerHTML=
    "<li>"+(r.temp<10?"🧥 Холодно — одевайтесь теплее":"😊 Комфортная погода")+"</li>"+
    "<li>"+(r.air.aqi<=2?"🌫 Воздух безопасен":"⚠️ Лучше без нагрузок")+"</li>";

  updatedAt.innerText="Обновлено только что";

  weather.innerHTML=
    "<div>🌡 "+r.temp+" °C</div>"+
    "<div>🤗 "+r.feels+" °C</div>"+
    "<div>💧 "+r.humidity+"%</div>"+
    "<div>🌬 "+r.wind+" м/с</div>";

  weatherHuman.innerText =
    r.temp<10?"На улице холодно.":
    r.temp<20?"Прохладно, комфортно.":
    "Погода комфортная.";

  air.innerText="AQI "+r.air.aqi+", PM2.5 "+r.air.pm25;
  airHuman.innerHTML=r.air.aqi<=2?"<span class='good'>Хороший воздух</span>":"<span class='warn'>Средний воздух</span>";
  airExplain.innerText=r.air.aqi<=2?"Можно спокойно гулять":"Лучше снизить нагрузку";

  drawChart(r.forecast);
  highlightMap(key);
}

/* карта ↔ селектор */
function selectCity(key){
  city.value=key;
  loadCity(key);
}
function highlightMap(key){
  document.querySelectorAll("svg path").forEach(p=>p.classList.remove("active"));
  const el=document.getElementById("map-"+key);
  if(el) el.classList.add("active");
}

/* ===== ГРАФИК ===== */
function drawChart(data){
  const ctx=chart.getContext("2d");
  chart.width=600;
  chart.height=260;
  ctx.clearRect(0,0,600,260);

  const temps=data.map(x=>x.temp);
  const max=Math.max(...temps),min=Math.min(...temps);

  ctx.strokeStyle=getComputedStyle(document.body).getPropertyValue("--accent");
  ctx.beginPath();
  data.forEach((p,i)=>{
    const x=i*(600/(data.length-1));
    const y=240-((p.temp-min)/(max-min))*200;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();

  chart.onmousemove=e=>{
    const i=Math.round(e.offsetX/(600/(data.length-1)));
    if(!data[i]) return tooltip.style.display="none";
    tooltip.style.display="block";
    tooltip.style.left=e.pageX+10+"px";
    tooltip.style.top=e.pageY-30+"px";
    tooltip.innerText=new Date(data[i].time).getHours()+":00 — "+data[i].temp+"°C";
  };
  chart.onmouseleave=()=>tooltip.style.display="none";
}

/* старт */
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
