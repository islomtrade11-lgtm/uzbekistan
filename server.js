import http from "http";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.error("OPENWEATHER_API_KEY is missing");
  process.exit(1);
}

/* ================= HTML ================= */
/* ================= HTML ================= */
const HTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Узбекистан — погода и экология</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{margin:0;font-family:system-ui;background:#f4f6f8;color:#0f172a}
header{background:linear-gradient(135deg,#2563eb,#16a34a);color:#fff;padding:20px;text-align:center}
main{max-width:1200px;margin:auto;padding:20px;display:grid;gap:20px}
.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 10px 20px rgba(0,0,0,.15)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
svg path{fill:#c7d2fe;stroke:#1e293b;cursor:pointer}
svg path:hover{fill:#38bdf8}
.good{color:#16a34a;font-weight:600}
.warn{color:#d97706;font-weight:600}
.bad{color:#dc2626;font-weight:600}
canvas{width:100%;height:240px}
footer{text-align:center;font-size:13px;opacity:.7}
#summary ul li{margin-bottom:8px}
select{padding:8px 12px;font-size:16px;border-radius:8px}
.citybar{display:flex;gap:12px;align-items:center;justify-content:center;margin-top:10px}
</style>
</head>

<body>

<header>
  <h1>🇺🇿 Узбекистан — погода и экология</h1>
  <p id="time"></p>

  <!-- ВЫБОР ГОРОДА -->
  <div class="citybar">
    <label for="city">Город:</label>
    <select id="city"></select>
  </div>
</header>

<!-- ГЛАВНЫЙ ВЫВОД -->
<div class="card" id="summary" style="margin:20px auto;max-width:1200px">
  <h2 id="summaryTitle">Сейчас</h2>
  <ul id="summaryList" style="list-style:none;padding:0;font-size:18px"></ul>
</div>

<main>

<div class="card">
<h2>🗺 Области Узбекистана</h2>
<svg viewBox="0 0 600 350">
  <path d="M60 160 L140 90 L210 120 L200 190 L120 210 Z"
    onclick="selectCity('tashkent')"/>
  <path d="M200 190 L210 120 L300 130 L320 200 L260 240 Z"
    onclick="selectCity('samarkand')"/>
  <path d="M320 200 L300 130 L380 120 L450 160 L390 230 Z"
    onclick="selectCity('bukhara')"/>
</svg>
<p>Нажмите на область или выберите город</p>
</div>

<div class="card">
<h2 id="region">Данные региона</h2>
<div class="grid" id="weather"></div>
<p id="weatherHuman"></p>
</div>

<div class="card">
<h2>🌫 Экология</h2>
<p id="air"></p>
<p id="airHuman"></p>
</div>

<div class="card">
<h2>📊 Температура на 24 часа</h2>
<canvas id="chart"></canvas>
</div>

</main>

<footer>
Реальные данные · Обновляется автоматически · Fly.io
</footer>

<script>
/* ===== ВРЕМЯ ===== */
setInterval(function(){
  document.getElementById("time").innerText =
    new Date().toLocaleString("ru-RU");
},1000);

/* ===== ГОРОДА ===== */
const cities = {
  tashkent: { name:"Ташкент", lat:41.2995, lon:69.2401 },
  samarkand:{ name:"Самарканд", lat:39.6542, lon:66.9597 },
  bukhara:  { name:"Бухара", lat:39.7747, lon:64.4286 }
};

/* ===== СЕЛЕКТОР ===== */
const select = document.getElementById("city");
for (const k in cities) {
  const o = document.createElement("option");
  o.value = k;
  o.textContent = cities[k].name;
  select.appendChild(o);
}

/* ===== ЧЕЛОВЕЧЕСКИЙ ВЫВОД ===== */
function buildSummary(r){
  const list=[];
  if(r.temp<0) list.push("❄️ Очень холодно — риск переохлаждения");
  else if(r.temp<10) list.push("🧥 Холодно — нужна тёплая одежда");
  else if(r.temp<20) list.push("🧣 Прохладно — лёгкая куртка");
  else if(r.temp<30) list.push("😊 Комфортная температура");
  else list.push("🔥 Жарко — избегайте солнца");

  if(r.air.aqi<=2) list.push("🌫 Воздух безопасен для прогулок");
  else if(r.air.aqi==3) list.push("⚠️ Воздух средний — осторожно");
  else list.push("🚫 Плохой воздух — лучше остаться дома");

  return list;
}

/* ===== ЗАГРУЗКА ===== */
async function loadCity(key){
  const c=cities[key];
  localStorage.setItem("city",key);

  document.getElementById("region").innerText=c.name;
  document.getElementById("summaryTitle").innerText="Сейчас в "+c.name;

  const r=await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(r=>r.json());

  document.getElementById("summaryList").innerHTML =
    buildSummary(r).map(t=>"<li>"+t+"</li>").join("");

  document.getElementById("weather").innerHTML =
    "<div>🌡 "+r.temp+" °C</div>"+
    "<div>🤗 "+r.feels+" °C</div>"+
    "<div>💧 "+r.humidity+"%</div>"+
    "<div>📈 "+r.pressure_mm+" мм</div>"+
    "<div>🌬 "+r.wind+" м/с</div>"+
    "<div>👁 "+r.visibility_km+" км</div>";

  document.getElementById("air").innerText =
    "AQI "+r.air.aqi+", PM2.5 "+r.air.pm25+" µg/m³";

  document.getElementById("airHuman").innerHTML =
    r.air.aqi<=2?"<span class='good'>Воздух безопасен</span>":
    r.air.aqi==3?"<span class='warn'>Лучше осторожно</span>":
    "<span class='bad'>Лучше остаться дома</span>";

  drawChart(r.forecast);
}

/* ===== КАРТА ===== */
function selectCity(key){
  select.value=key;
  loadCity(key);
}

/* ===== СТАРТ ===== */
select.onchange=function(){ loadCity(this.value); };

const saved = localStorage.getItem("city") || "tashkent";
select.value=saved;
loadCity(saved);

/* ===== ГРАФИК ===== */
function drawChart(data){
  const c=document.getElementById("chart");
  const ctx=c.getContext("2d");
  c.width=600;c.height=240;
  ctx.clearRect(0,0,c.width,c.height);
  const max=Math.max.apply(null,data);
  const min=Math.min.apply(null,data);
  ctx.beginPath();ctx.strokeStyle="#2563eb";
  data.forEach(function(t,i){
    const x=i*(c.width/(data.length-1));
    const y=c.height-((t-min)/(max-min))*c.height;
    if(i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
  });
  ctx.stroke();
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
