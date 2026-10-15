// Scriptable Home Screen widget. See README.md for installation.
// Configuration

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



const REFRESH_MINUTES = 15;
const MAX_SAVED_AGE_HOURS = 24;
// A small widget has one tap target: the first route. Other sizes link each route.
const OPEN_MAPS_ON_TAP = true;
const PREVIEW_SIZE = "medium"; // "small", "medium", or "large"

function makeRouteUrl(route) {
  const points = `${route.from.lat},${route.from.lon}:${route.to.lat},${route.to.lon}`;
  const query = [
    `key=${encodeURIComponent(API_KEY)}`,
    "traffic=true", "travelMode=car", "routeType=fastest", "departAt=now"
  ].join("&");
  return `https://api.tomtom.com/routing/1/calculateRoute/${points}/json?${query}`;
}

function mapsUrl(route) {
  return "https://maps.apple.com/?" +
    `saddr=${route.from.lat},${route.from.lon}` +
    `&daddr=${route.to.lat},${route.to.lon}&dirflg=d`;
}

function routeKey(route) {
  return `${route.from.lat},${route.from.lon}:${route.to.lat},${route.to.lon}`;
}

async function getTravelTime(route) {
  for (const point of [route.from, route.to]) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon) ||
        Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) {
      throw new Error("Invalid route coordinates");
    }
  }
  const request = new Request(makeRouteUrl(route));
  request.timeoutInterval = 10;
  const data = await request.loadJSON();
  const seconds = data.routes?.[0]?.summary?.travelTimeInSeconds;
  if (request.response.statusCode !== 200 || !Number.isFinite(seconds) || seconds < 0) {
    // Do not log the request URL: it contains the API key.
    throw new Error("Travel time unavailable");
  }
  return Math.max(1, Math.ceil(seconds / 60));
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours} hr`;
}

function savedAge(timestamp) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

// Local storage keeps previous successful estimates available when offline.
const files = FileManager.local();
const cachePath = files.joinPath(files.documentsDirectory(), "travel-times-cache-v1.json");
let cache = {};
try {
  if (files.fileExists(cachePath)) {
    const saved = JSON.parse(files.readString(cachePath));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) cache = saved;
  }
} catch (_) {
  console.log("Saved travel times could not be read.");
}

const results = await Promise.all(routes.map(async route => {
  const key = routeKey(route);
  try {
    const minutes = await getTravelTime(route);
    const updatedAt = Date.now();
    cache[key] = { minutes, updatedAt };
    return { route, minutes, updatedAt, saved: false };
  } catch (_) {
    const previous = cache[key];
    const age = Date.now() - previous?.updatedAt;
    if (Number.isFinite(previous?.minutes) && previous.minutes > 0 &&
        Number.isFinite(age) && age >= 0 && age < MAX_SAVED_AGE_HOURS * 3600000) {
      return { route, ...previous, saved: true };
    }
    return { route, minutes: null, saved: false };
  }
}));

try {
  files.writeString(cachePath, JSON.stringify(cache));
} catch (_) {
  console.log("Travel times could not be saved.");
}

const palette = {
  text: new Color("F4F7FC"), muted: new Color("A5B4CA"),
  accent: new Color("67E8C5"), warning: new Color("F6C977"),
  card: new Color("FFFFFF", 0.06)
};

function text(parent, value, size, color, bold = false) {
  const label = parent.addText(value);
  label.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
  label.textColor = color;
  label.lineLimit = 1;
  label.minimumScaleFactor = 0.65;
  return label;
}

function routeLabel(route) {
  return route.name.replace(/ to /i, " → ");
}

function addRoute(parent, result, compact, large) {
  const row = parent.addStack();
  if (OPEN_MAPS_ON_TAP && !compact) row.url = mapsUrl(result.route);
  const color = result.saved || result.minutes === null ? palette.warning : palette.accent;
  if (compact) {
    row.centerAlignContent();
    text(row, routeLabel(result.route), 9, palette.muted);
    row.addSpacer(3);
    text(row, result.minutes === null ? "—" :
      `${result.saved ? "~" : ""}${formatMinutes(result.minutes)}`, 11, color, true);
  } else {
    row.layoutVertically();
    row.backgroundColor = palette.card;
    row.cornerRadius = 12;
    row.setPadding(large ? 12 : 4, 10, large ? 12 : 4, 10);
    text(row, routeLabel(result.route), large ? 13 : 10, palette.muted);
    row.addSpacer(2);
    const duration = row.addStack();
    duration.centerAlignContent();
    text(duration, result.minutes === null ? "Unavailable" : formatMinutes(result.minutes),
      large ? 25 : 18, color, true);
    if (result.saved) {
      duration.addSpacer(5);
      text(duration, `Saved ${savedAge(result.updatedAt)}`, 9, palette.warning);
    }
  }
}

function createWidget(family) {
  const widget = new ListWidget();
  const compact = family === "small";
  const large = family === "large" || family === "extraLarge";
  widget.setPadding(10, 12, 10, 12);
  const gradient = new LinearGradient();
  gradient.colors = [new Color("182B46"), new Color("0B1424")];
  gradient.locations = [0, 1];
  widget.backgroundGradient = gradient;
  widget.refreshAfterDate = new Date(Date.now() + REFRESH_MINUTES * 60000);
  if (OPEN_MAPS_ON_TAP && routes.length) widget.url = mapsUrl(routes[0]);

  const header = widget.addStack();
  header.centerAlignContent();
  const icon = header.addImage(SFSymbol.named("car.fill").image);
  icon.imageSize = new Size(16, 13);
  icon.tintColor = palette.accent;
  header.addSpacer(6);
  text(header, "TRAVEL TIMES", compact ? 10 : 11, palette.text, true);
  header.addSpacer();
  if (!compact) text(header, "TOMTOM", 9, palette.muted);
  widget.addSpacer(large ? 14 : 8);

  if (compact || large) {
    results.forEach((result, index) => {
      if (index) widget.addSpacer(large ? 8 : 6);
      addRoute(widget, result, compact, large);
    });
  } else {
    // Two columns keep all four routes visible in a medium widget.
    const grid = widget.addStack();
    const left = grid.addStack();
    left.layoutVertically();
    grid.addSpacer(8);
    const right = grid.addStack();
    right.layoutVertically();
    results.forEach((result, index) => {
      const column = index % 2 === 0 ? left : right;
      if (index >= 2) column.addSpacer(6);
      addRoute(column, result, false, false);
    });
  }

  widget.addSpacer();
  widget.addSpacer(6);
  const saved = results.filter(result => result.saved);
  const unavailable = results.some(result => result.minutes === null);
  if (saved.length) {
    const oldest = Math.min(...saved.map(result => result.updatedAt));
    text(widget, `Saved ${savedAge(oldest)}${unavailable ? " · Some unavailable" : ""}`,
      9, palette.warning);
  } else if (unavailable) {
    text(widget, "Some routes unavailable · Will retry", 9, palette.warning);
  } else {
    const footer = widget.addStack();
    text(footer, "Updated ", 9, palette.muted);
    const timestamp = footer.addDate(new Date(Math.min(...results.map(result => result.updatedAt))));
    timestamp.applyTimeStyle();
    timestamp.font = Font.systemFont(9);
    timestamp.textColor = palette.muted;
  }
  return widget;
}

const family = config.widgetFamily || PREVIEW_SIZE;
const widget = createWidget(family);
Script.setWidget(widget);
if (config.runsInApp) {
  if (family === "small") await widget.presentSmall();
  else if (family === "large") await widget.presentLarge();
  else await widget.presentMedium();
}
Script.complete();
