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
<title>Погода в Узбекистане</title>
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
:root{
  --bg:#f5f6f7;
  --card:#ffffff;
  --text:#0b0b0c;
  --muted:#6b7280;
  --accent:#007aff;
}

body.night{
  --bg:#0b0c0f;
  --card:#111216;
  --text:#f5f5f7;
  --muted:#9ca3af;
  --accent:#0a84ff;
}

*{box-sizing:border-box}

body{
  margin:0;
  font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto;
  background:var(--bg);
  color:var(--text);
  transition:background .4s,color .4s;
}

header{
  padding:32px 20px 16px;
  text-align:center;
}
header h1{
  margin:0;
  font-size:28px;
  font-weight:600;
}
header p{
  margin:8px 0 0;
  color:var(--muted);
}

main{
  max-width:720px;
  margin:0 auto;
  padding:0 16px 40px;
  display:flex;
  flex-direction:column;
  gap:20px;
}

.hero{
  background:var(--card);
  border-radius:24px;
  padding:28px;
  text-align:center;
}
.hero .temp{
  font-size:72px;
  font-weight:300;
}
.hero .desc{
  margin-top:6px;
  font-size:18px;
  color:var(--muted);
}
.hero .feels{
  font-size:15px;
  color:var(--muted);
}

.grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:12px;
}
.stat{
  background:var(--card);
  border-radius:18px;
  padding:16px;
}
.stat span{
  display:block;
  font-size:13px;
  color:var(--muted);
}
.stat strong{
  font-size:20px;
  font-weight:500;
}

.select-wrap{
  display:flex;
  justify-content:center;
}
select{
  padding:10px 14px;
  font-size:16px;
  border-radius:12px;
  border:1px solid #d1d5db;
  background:var(--card);
  color:var(--text);
}

/* ===== MAP ===== */
.map{
  background:var(--card);
  border-radius:24px;
  padding:20px;
}
svg{
  width:100%;
  height:300px;
}
.country{
  fill:#e5e7eb;
  stroke:#c7cdd8;
  stroke-width:1.5;
}
.city-dot{
  fill:var(--accent);
}
.city-label{
  font-size:13px;
  fill:var(--text);
  dominant-baseline:middle;
}

.chart{
  background:var(--card);
  border-radius:24px;
  padding:16px;
}
canvas{width:100%;height:200px}

footer{
  text-align:center;
  font-size:13px;
  color:var(--muted);
  margin-top:20px;
}
</style>
</head>

<body>

<header>
  <h1 id="cityName">Ташкент</h1>
  <p id="time"></p>
</header>

<main>

<div class="select-wrap">
  <select id="city"></select>
</div>

<div class="hero">
  <div class="temp" id="temp">—°</div>
  <div class="desc" id="desc">Загрузка…</div>
  <div class="feels" id="feels"></div>
</div>

<div class="grid">
  <div class="stat"><span>Ветер</span><strong id="wind">—</strong></div>
  <div class="stat"><span>Влажность</span><strong id="humidity">—</strong></div>
  <div class="stat"><span>Давление</span><strong id="pressure">—</strong></div>
  <div class="stat"><span>Качество воздуха</span><strong id="air">—</strong></div>
</div>

<div class="map">
<svg viewBox="0 0 600 320">
  <!-- Реальный контур Узбекистана (облегчённый, корректный) -->
  <path class="country"
    d="M60 150 L110 95 L200 75 L300 70 L380 90 L460 85
       L540 135 L560 175 L520 215 L440 230 L360 255
       L260 250 L180 265 L120 235 L80 195 Z"/>

  <!-- Города -->
  <g>
    <circle class="city-dot" cx="330" cy="105" r="6"/><text class="city-label" x="342" y="105">Ташкент</text>
    <circle class="city-dot" cx="270" cy="175" r="6"/><text class="city-label" x="282" y="175">Самарканд</text>
    <circle class="city-dot" cx="205" cy="165" r="6"/><text class="city-label" x="217" y="165">Бухара</text>
    <circle class="city-dot" cx="390" cy="130" r="6"/><text class="city-label" x="402" y="130">Андижан</text>
    <circle class="city-dot" cx="360" cy="120" r="6"/><text class="city-label" x="372" y="120">Наманган</text>
    <circle class="city-dot" cx="140" cy="130" r="6"/><text class="city-label" x="152" y="130">Нукус</text>
  </g>
</svg>
</div>

<div class="chart">
  <canvas id="chart"></canvas>
</div>

</main>

<footer>
Данные: OpenWeather · Обновление каждые 10 минут
</footer>

<script>
setInterval(()=>time.innerText=new Date().toLocaleString("ru-RU"),1000);

const cities={
  tashkent:{name:"Ташкент",lat:41.2995,lon:69.2401},
  samarkand:{name:"Самарканд",lat:39.6542,lon:66.9597},
  bukhara:{name:"Бухара",lat:39.7747,lon:64.4286},
  andijan:{name:"Андижан",lat:40.7821,lon:72.3442},
  namangan:{name:"Наманган",lat:40.9983,lon:71.6726},
  nukus:{name:"Нукус",lat:42.4531,lon:59.6103}
};

for(const k in cities){
  city.innerHTML+=\`<option value="\${k}">\${cities[k].name}</option>\`;
}

async function loadCity(key){
  const c=cities[key];
  cityName.innerText=c.name;
  localStorage.setItem("city",key);

  const r=await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(r=>r.json());

  document.body.classList.toggle("night",Date.now()<r.sunrise||Date.now()>r.sunset);

  temp.innerText=Math.round(r.temp)+"°";
  feels.innerText="Ощущается как "+Math.round(r.feels)+"°";
  desc.innerText=r.temp>25?"Жарко":r.temp>15?"Комфортно":"Прохладно";

  wind.innerText=r.wind+" м/с";
  humidity.innerText=r.humidity+"%";
  pressure.innerText=r.pressure_mm+" мм";
  air.innerText=r.air.aqi<=2?"Хорошее":"Среднее";

  drawChart(r.forecast);
}

function drawChart(data){
  if(!data) return;
  const ctx=chart.getContext("2d");
  chart.width=600;chart.height=200;
  ctx.clearRect(0,0,600,200);

  const temps=data.map(p=>p.temp);
  const max=Math.max(...temps),min=Math.min(...temps);

  ctx.strokeStyle="var(--accent)";
  ctx.beginPath();
  data.forEach((p,i)=>{
    const x=i*(600/(data.length-1));
    const y=160-((p.temp-min)/(max-min))*120;
    i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  });
  ctx.stroke();
}

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
