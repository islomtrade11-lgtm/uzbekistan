import http from "http";
import fetch from "node-fetch";

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.error("OPENWEATHER_API_KEY is missing");
  process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Uzbekistan Weather</title>
</head>
<body>
<h1>🇺🇿 Uzbekistan Weather Portal</h1>
<p>Выберите регион на карте</p>
<script>
async function load(lat, lon){
  const r = await fetch('/api?lat=' + lat + '&lon=' + lon);
  const d = await r.json();
  document.body.innerHTML += '<pre>' + JSON.stringify(d, null, 2) + '</pre>';
}
load(41.2995, 69.2401);
</script>
</body>
</html>`;

async function getData(lat, lon) {
  const weatherUrl =
    "https://api.openweathermap.org/data/2.5/weather" +
    "?lat=" + lat +
    "&lon=" + lon +
    "&units=metric" +
    "&lang=ru" +
    "&appid=" + API_KEY;

  const airUrl =
    "https://api.openweathermap.org/data/2.5/air_pollution" +
    "?lat=" + lat +
    "&lon=" + lon +
    "&appid=" + API_KEY;

  const forecastUrl =
    "https://api.openweathermap.org/data/2.5/forecast" +
    "?lat=" + lat +
    "&lon=" + lon +
    "&units=metric" +
    "&appid=" + API_KEY;

  const w = await fetch(weatherUrl).then(r => r.json());
  const a = await fetch(airUrl).then(r => r.json());
  const f = await fetch(forecastUrl).then(r => r.json());

  return {
    temp: w.main.temp,
    feels: w.main.feels_like,
    humidity: w.main.humidity,
    pressure_mm: Math.round(w.main.pressure * 0.75),
    wind: w.wind.speed,
    clouds: w.clouds.all,
    visibility_km: w.visibility / 1000,
    sunrise: w.sys.sunrise * 1000,
    sunset: w.sys.sunset * 1000,
    air: {
      aqi: a.list[0].main.aqi,
      pm25: a.list[0].components.pm2_5
    },
    forecast: f.list.slice(0, 8).map(x => x.main.temp)
  };
}

http.createServer(async (req, res) => {
  if (req.url.startsWith("/api")) {
    const url = new URL(req.url, "http://localhost");
    const lat = url.searchParams.get("lat");
    const lon = url.searchParams.get("lon");

    try {
      const data = await getData(lat, lon);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500);
      res.end("API error");
    }
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}).listen(PORT, () => {
  console.log("Server started on port", PORT);
});

