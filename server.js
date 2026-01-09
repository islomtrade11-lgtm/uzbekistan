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
</svg>
<p>Нажмите на область</p>
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
Реальные данные · Без утечки API ключей · Fly.io
</footer>

<script>
setInterval(function(){
  document.getElementById("time").innerText =
    new Date().toLocaleString("ru-RU");
},1000);

async function loadRegion(name,lat,lon){
  document.getElementById("region").innerText=name;

  const r = await fetch("/api?lat="+lat+"&lon="+lon).then(r=>r.json());

  document.getElementById("weather").innerHTML =
    "<div>🌡 "+r.temp+" °C</div>"+
    "<div>🤗 "+r.feels+" °C</div>"+
    "<div>💧 "+r.humidity+"%</div>"+
    "<div>📈 "+r.pressure_mm+" мм</div>"+
    "<div>🌬 "+r.wind+" м/с</div>"+
    "<div>👁 "+r.visibility_km+" км</div>";

  document.getElementById("weatherHuman").innerText =
    r.temp<0?"Морозно, риск переохлаждения":
    r.temp<10?"Холодно, нужна тёплая одежда":
    r.temp<20?"Прохладно, комфортно":
    r.temp<30?"Тепло, отличная погода":
    "Жарко, избегайте солнца";

  document.getElementById("air").innerText =
    "AQI "+r.air.aqi+", PM2.5 "+r.air.pm25+" µg/m³";

  document.getElementById("airHuman").innerHTML =
    r.air.aqi<=2?"<span class='good'>Воздух безопасен</span>":
    r.air.aqi==3?"<span class='warn'>Чувствительным лучше ограничить прогулки</span>":
    "<span class='bad'>Лучше оставаться в помещении</span>";

  drawChart(r.forecast);
}

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
