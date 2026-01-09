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
<meta charset="UTF-8" />
<title>Uzbekistan Weather</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />

<style>
:root{
  --bg:#f6f7f9;
  --card:#ffffff;
  --text:#111827;
  --muted:#6b7280;
  --accent:#3b82f6;
  --good:#16a34a;
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
  padding:28px 16px 12px;
  text-align:center;
}
header h1{
  margin:0;
  font-size:26px;
  font-weight:600;
}
header p{
  margin-top:6px;
  font-size:14px;
  color:var(--muted);
}

/* ===== CITY BAR ===== */
.city-bar{
  display:flex;
  gap:12px;
  justify-content:center;
  margin-top:16px;
}
.city-pill{
  background:var(--card);
  border-radius:14px;
  padding:10px 14px;
  font-size:14px;
  box-shadow:0 8px 24px rgba(0,0,0,.06);
}

/* ===== MAP SECTION ===== */
.map-wrap{
  position:relative;
  margin:20px auto 0;
  max-width:900px;
  padding:0 12px;
}
.map-bg{
  background:var(--card);
  border-radius:24px;
  padding:16px;
}
.map-bg object{
  width:100%;
  height:420px;
  opacity:.9;
}

/* ===== CITY DOTS ===== */
.city-dot{
  position:absolute;
  transform:translate(-50%,-50%);
  cursor:pointer;
}
.city-dot .dot{
  width:14px;
  height:14px;
  background:var(--accent);
  border-radius:50%;
  box-shadow:0 0 0 6px rgba(59,130,246,.15);
}
.city-dot span{
  display:block;
  margin-top:6px;
  font-size:13px;
  color:#1f2937;
  white-space:nowrap;
}

/* ===== FLOAT CARD ===== */
.card{
  position:absolute;
  background:var(--card);
  border-radius:18px;
  padding:16px;
  width:220px;
  box-shadow:0 20px 40px rgba(0,0,0,.15);
  display:none;
  z-index:10;
}
.card h3{
  margin:0;
  font-size:16px;
}
.card .temp{
  font-size:32px;
  font-weight:500;
  margin:6px 0;
}
.card .desc{
  font-size:14px;
  color:var(--muted);
}
.card .meta{
  margin-top:10px;
  font-size:13px;
  color:#374151;
}

/* ===== POPULAR ===== */
.popular{
  max-width:900px;
  margin:40px auto 0;
  padding:0 16px;
}
.popular h2{
  font-size:18px;
  margin-bottom:12px;
}
.popular-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
  gap:14px;
}
.city-card{
  background:var(--card);
  border-radius:16px;
  padding:14px;
  box-shadow:0 8px 24px rgba(0,0,0,.06);
}
.city-card strong{
  font-size:16px;
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
  margin:40px 0 20px;
  font-size:13px;
  color:var(--muted);
}
</style>
</head>

<body>

<header>
  <h1>Uzbekistan Cities</h1>
  <p id="time"></p>

  <div class="city-bar" id="quickBar"></div>
</header>

<div class="map-wrap">
  <div class="map-bg">
    <object data="/uzbekistan.svg" type="image/svg+xml"></object>
  </div>

  <!-- FLOAT CARD -->
  <div class="card" id="infoCard"></div>

  <!-- DOTS -->
</div>

<section class="popular">
  <h2>Popular Cities</h2>
  <div class="popular-grid" id="popular"></div>
</section>

<footer>
Real-time weather · Air quality · Uzbekistan
</footer>

<script>
/* ===== TIME ===== */
setInterval(()=>time.innerText=new Date().toLocaleString("ru-RU"),1000);

/* ===== CITIES ===== */
const cities=[
  {key:"tashkent",name:"Tashkent",lat:41.2995,lon:69.2401,x:63,y:38},
  {key:"samarkand",name:"Samarkand",lat:39.6542,lon:66.9597,x:50,y:52},
  {key:"bukhara",name:"Bukhara",lat:39.7747,lon:64.4286,x:42,y:50},
  {key:"khiva",name:"Khiva",lat:41.3890,lon:60.3422,x:30,y:40},
  {key:"nukus",name:"Nukus",lat:42.4531,lon:59.6103,x:26,y:36},
  {key:"fergana",name:"Fergana",lat:40.3864,lon:71.7864,x:70,y:44}
];

const mapWrap=document.querySelector(".map-wrap");
const card=document.getElementById("infoCard");

/* ===== DOTS ===== */
cities.forEach(c=>{
  const d=document.createElement("div");
  d.className="city-dot";
  d.style.left=c.x+"%";
  d.style.top=c.y+"%";
  d.innerHTML=`<div class="dot"></div><span>${c.name}</span>`;
  d.onclick=()=>showCity(c,d);
  mapWrap.appendChild(d);
});

/* ===== QUICK BAR ===== */
cities.slice(0,4).forEach(c=>{
  quickBar.innerHTML+=`<div class="city-pill">${c.name}</div>`;
});

/* ===== POPULAR ===== */
cities.forEach(c=>{
  popular.innerHTML+=`
    <div class="city-card">
      <strong>${c.name}</strong>
      <span id="p-${c.key}">Loading…</span>
    </div>`;
});

/* ===== SHOW CARD ===== */
async function showCity(c,el){
  const r=await fetch("/api?lat="+c.lat+"&lon="+c.lon).then(r=>r.json());

  card.innerHTML=`
    <h3>${c.name}</h3>
    <div class="temp">${Math.round(r.temp)}°</div>
    <div class="desc">${r.temp>20?"Sunny":"Cloudy"}</div>
    <div class="meta">
      Air: ${r.air.aqi<=2?"Good":"Moderate"}<br>
      Wind: ${r.wind} m/s
    </div>
  `;

  card.style.left=el.offsetLeft+20+"px";
  card.style.top=el.offsetTop-10+"px";
  card.style.display="block";

  document.getElementById("p-"+c.key).innerText=
    Math.round(r.temp)+"° · "+(r.air.aqi<=2?"Good":"Moderate");
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
