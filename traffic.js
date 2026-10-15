// variables global

const API_KEY = "wTe5VyVhyVMCX484BXK6Zf6JF7hHg1zS";

const coordinates = [
    {name: "home", lat: 14.69051701371328, lon: 121.0496412509684},
    {name: "work", lat: 14.594697004167411, lon: 121.05615162213148},
    {name: "himlayan", lat: 14.678994, lon: 121.046116},
    {name: "palengke", lat: 14.676274255568435, lon: 121.04330010863876}
];

const locations = Object.fromEntries(
  coordinates.map(({ name, lat, lon }) => [name, { lat, lon }])
);

const routes = [
  { name: "Home to Himlayan", from: locations.home, to: locations.himlayan },
  { name: "Home to palengke", from: locations.home, to: locations.palengke },
  { name: "Home to work", from: locations.home, to: locations.work },
  { name: "Work to home", from: locations.work, to: locations.home }
];



// code

function makeRouteUrl(route) {
  const coordinates =
    `${route.from.lat},${route.from.lon}:` +
    `${route.to.lat},${route.to.lon}`;

  const query = [
    `key=${encodeURIComponent(API_KEY)}`,
    "traffic=true",
    "travelMode=car",
    "routeType=fastest"
  ].join("&");

  return `https://api.tomtom.com/routing/1/calculateRoute/${coordinates}/json?${query}`;
}


// 3. FETCH ONE ROUTE'S TRAVEL TIME
async function getTravelTime(route) {
  for (const [label, point] of [["origin", route.from], ["destination", route.to]]) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) {
      throw new Error(`Missing or invalid ${label} coordinates for ${route.name}`);
    }
  }

  const request = new Request(makeRouteUrl(route));
  request.method = "GET";

  const data = await request.loadJSON();

  // TomTom returns durations in seconds.
  if (!data.routes || !data.routes.length || !data.routes[0].summary) {
    throw new Error(data.error?.description || "TomTom returned no route");
  }
  const seconds = data.routes[0].summary.travelTimeInSeconds;
  return Math.round(seconds / 60);
}


// 4. FORMAT MINUTES FOR DISPLAY
function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}


// 5. CHECK ALL ROUTES
const results = [];

for (const route of routes) {
  try {
    const minutes = await getTravelTime(route);
    results.push({
      name: route.name,
      time: formatMinutes(minutes),
      error: null
    });
  } catch (error) {
    results.push({
      name: route.name,
      time: null,
      error: String(error)
    });
  }
}


// 6. SHOW RESULTS
const lines = results.map(result =>
  result.error
    ? `${result.name}: Unable to load`
    : `${result.name}: ${result.time}`
);

const output = new Alert();
output.title = "Current Travel Times";
output.message = lines.join("\n");
output.addAction("Done");
await output.presentAlert();
