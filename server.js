import http from "http";
import fetch from "node-fetch";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.error("❌ OPENWEATHER_API_KEY не задан");
  process.exit(1);
}

/* ================== HTML (ОДИН РАЗ) ================== */
const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Узбекистан — погода и экология</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
:root{
  --bg:#f4f6f8;--card:#fff;--text:#0f172a;
}
body.dark{
  --bg:#020617;--card:#020617;--text:#e5e7eb;
}
*{box-sizing:border-box}
body{
  margin:0;font-family:system-ui,Arial;
  background:var(--bg);color:var(--text);
}
header{
  background:linear-gradient(135deg,#2563eb,#16a34a);
  color:#fff;padding:20px;text-align:center;
}
main{
  max-width:1200px;margin:auto;
  padding:20px;display:grid;gap:20px;
}
.card{
  background:var(--card);
  border-radius:16px;padding:20px;
  box-shadow:0 12px 24px rgba(0,0,0,.15);
}
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  gap:12px;
}
svg path{
  fill:#c7d2fe;stroke:#1e293b;cursor:pointer;
}
svg path:hover{fill:#38bdf8}
.good{color:#16a34a;font-weight:600}
.warn{color:#d97706;font-weight:600}
.bad{color:#dc2626;font-weight:600}
canvas{width:100%;height:240px}
footer{text-align:center;font-size:13px;opacity:.7}
</style>
</head>

<body>

<header>
  <h1>🇺🇿 Узбекистан — погода и экология</h1>
  <p id="time"></p>
</header>

<main>

<div class="card">
<h2>🗺 Области Узбекистана</h2>
<svg viewBox="0 0 600 350">
  <path d="M60 160 L140 90 L210 120 L200 190 L120 210 Z"
    onclick="loadRegion('Ташкент',41.2995,69.2401)"/>
  <path d="M200 190 L210 120 L300 130 L320 200 L260 240 Z"
    onclick="loadRegion('Самарканд',39.6542,66.9597)"/>
  <path d="M320 200 L300 130 L380 120 L450 160 L390 230 Z"
    onclick="loadRegion('Бухара',39.7747,64.4286)"/>
  <path d="M120 210 L200 190 L260 240 L180 280 L100 260 Z"
    onclick="loadRegion('Кашкадарья',38.861,65.7847)"/>
  <path d="M390 230 L450 160 L520 200 L500 260 L430 280 Z"
    onclick="loadRegion('Хорезм',41.3565,60.8567)"/>
</svg>
<p>Нажмите на область</p>
</div>

<div class="card">
<h2 id="region">Данные региона</h2>
<div class="grid" id="weather"></div>
<p id="weatherHuman"></p>
</div>

<div class="card">
<h2>🌫 Экология и UV</h2>
<p id="air"></p>
<p id="airHuman"></p>
<p id="uvHuman"></p>
</div>

<div class="card">
<h2>📊 Температура на 24 часа</h2>
<canvas id="chart"></canvas>
</div>

</main>

<footer>
Реальные данные · Интерпретация для людей · Fly.io
</footer>

<script>
setInterval(()=>{
  const d=new Date();
  document.getElementById("time").innerText=d.toLocaleString("ru-RU");
},1000);

async function loadRegion(name,lat,lon){
  document.getElementById("region").innerText=name;

  const r=await fetch(\`/api?lat=\${lat}&lon=\${lon}\`).then(r=>r.json());

  document.body.classList.toggle("dark",
    Date.now()<r.sunrise || Date.now()>r.sunset
  );

  document.getElementById("weather").innerHTML=\`
    <div>🌡 \${r.temp} °C</div>
    <div>🤗 \${r.feels} °C</div>
    <div>💧 \${r.humidity}%</div>
    <div>📈 \${r.pressure_mm} мм</div>
    <div>🌬 \${r.wind} м/с</div>
    <div>☁ \${r.clouds}%</div>
    <div>👁 \${r.visibility_km} км</div>\`;

  document.getElementById("weatherHuman").innerText=
    r.temp<0?"Морозно, высокий риск переохлаждения":
    r.temp<10?"Холодно, нужна тёплая одежда":
    r.temp<20?"Прохладно, комфортно":
    r.temp<30?"Тепло, отличная погода":
    "Жарко, избегайте солнца";

  document.getElementById("air").innerText=
    \`AQI \${r.air.aqi}, PM2.5 \${r.air.pm25} µg/m³\`;

  document.getElementById("airHuman").innerHTML=
    r.air.aqi<=2?"<span class='good'>Воздух безопасен</span>":
    r.air.aqi==3?"<span class='warn'>Чувствительным лучше сократить прогулки</span>":
    "<span class='bad'>Нежелательно находиться на улице</span>";

  document.getElementById("uvHuman").innerText=
    r.uv<3?"UV низкий — безопасно":
    r.uv<7?"UV умеренный — используйте защиту":
    "UV высокий — избегайте солнца";

  drawChart(r.forecast);
}

function drawChart(data){
  const c=document.getElementById("chart");
  const ctx=c.getContext("2d");
  c.width=600;c.height=240;
  ctx.clearRect(0,0,c.width,c.height);
  const max=Math.max(...data),min=Math.min(...data);
  ctx.beginPath();ctx.strokeStyle="#2563eb";
  data.forEach((t,i)=>{
    const x=i*(c.width/(data.length-1));
    const y=c.height-((t-min)/(max-min))*c.height;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
}
</script>

</body>
</html>`;

/* ================== API ================== */
async function getData(lat, lon) {
  const [w, a, f, u] = await Promise.all([
    fetch(\`https://api.openweathermap.org/data/2.5/weather?lat=\${lat}&lon=\${lon}&units=metric&lang=ru&appid=\${API_KEY}\`).then(r=>r.json()),
    fetch(\`https://api.openweathermap.org/data/2.5/air_pollution?lat=\${lat}&lon=\${lon}&appid=\${API_KEY}\`).then(r=>r.json()),
    fetch(\`https://api.openweathermap.org/data/2.5/forecast?lat=\${lat}&lon=\${lon}&units=metric&appid=\${API_KEY}\`).then(r=>r.json()),
    fetch(\`https://api.openweathermap.org/data/2.5/uvi?lat=\${lat}&lon=\${lon}&appid=\${API_KEY}\`).then(r=>r.json())
  ]);

  return {
    temp:w.main.temp,
    feels:w.main.feels_like,
    humidity:w.main.humidity,
    pressure_mm:Math.round(w.main.pressure*0.75),
    wind:w.wind.speed,
    clouds:w.clouds.all,
    visibility_km:w.visibility/1000,
    sunrise:w.sys.sunrise*1000,
    sunset:w.sys.sunset*1000,
    uv:u.value,
    air:{
      aqi:a.list[0].main.aqi,
      pm25:a.list[0].components.pm2_5
    },
    forecast:f.list.slice(0,8).map(x=>x.main.temp)
  };
}

/* ================== SERVER ================== */
http.createServer(async (req,res)=>{
  if (req.url.startsWith("/api")) {
    const url=new URL(req.url,"http://x");
    const lat=url.searchParams.get("lat");
    const lon=url.searchParams.get("lon");
    try{
      const data=await getData(lat,lon);
      res.writeHead(200,{"Content-Type":"application/json"});
      res.end(JSON.stringify(data));
    }catch{
      res.writeHead(500);res.end();
    }
    return;
  }

  res.writeHead(200,{"Content-Type":"text/html"});
  res.end(html);
}).listen(PORT,()=>console.log("✅ Server on",PORT));
