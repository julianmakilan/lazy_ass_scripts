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
    "traffic=true", "travelMode=car", "routeType=fastest", "departAt=now",
    "sectionType=traffic", "routeRepresentation=polyline"
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

// Normalize traffic sections to distance fractions, rather than point counts:
// route geometry points are not evenly spaced along the road.
function trafficSegments(route) {
  const points = route.legs?.flatMap(leg => leg.points || []) || [];
  if (points.length < 2 || !Array.isArray(route.sections)) return null;
  const offsets = [0];
  const radians = value => value * Math.PI / 180;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const h = Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 +
      Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) *
      Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
    offsets.push(offsets[i - 1] + 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))));
  }
  const total = offsets[offsets.length - 1];
  if (!Number.isFinite(total) || total <= 0) return null;
  return route.sections.filter(section => section.sectionType === "TRAFFIC")
    .flatMap(section => {
      const start = offsets[section.startPointIndex];
      const end = offsets[section.endPointIndex];
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
      return [{ start: start / total, end: end / total,
        severity: section.magnitudeOfDelay || 0 }];
    });
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
  const calculated = data.routes[0];
  return {
    minutes: Math.max(1, Math.ceil(seconds / 60)),
    distance: calculated.summary.lengthInMeters,
    delay: calculated.summary.trafficDelayInSeconds,
    traffic: trafficSegments(calculated)
  };
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
    const estimate = await getTravelTime(route);
    const updatedAt = Date.now();
    cache[key] = { ...estimate, updatedAt };
    return { route, ...estimate, updatedAt, saved: false };
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
  slow: new Color("F6C977"), heavy: new Color("FA7474"),
  severe: new Color("D84160"), unknown: new Color("536176")
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

// Left edge is the origin; right edge is the destination. Gray means unknown.
function trafficBar(result, width, height) {
  const drawing = new DrawContext();
  drawing.size = new Size(width, height);
  drawing.respectScreenScale = true;
  drawing.opaque = false;
  const known = !result.saved && Array.isArray(result.traffic);
  drawing.setFillColor(known ? palette.accent : palette.unknown);
  drawing.fillRect(new Rect(0, 0, width, height));
  if (known) {
    // Paint the most severe sections last if incidents overlap.
    [...result.traffic].sort((a, b) => a.severity - b.severity).forEach(segment => {
      const colors = [palette.warning, palette.slow, palette.heavy, palette.severe, palette.severe];
      drawing.setFillColor(colors[segment.severity] || palette.warning);
      const x = Math.max(0, Math.min(1, segment.start)) * width;
      const end = Math.max(0, Math.min(1, segment.end)) * width;
      drawing.fillRect(new Rect(x, 0, Math.min(width - x, Math.max(1, end - x)), height));
    });
  }
  return drawing.getImage();
}

function addRoute(parent, result, compact, large) {
  const row = parent.addStack();
  row.centerAlignContent();
  if (OPEN_MAPS_ON_TAP && !compact) row.url = mapsUrl(result.route);
  const info = row.addStack();
  info.layoutVertically();
  text(info, routeLabel(result.route), compact ? 9 : large ? 14 : 11, palette.text, true);
  if (large) {
    info.addSpacer(4);
    const details = [];
    if (Number.isFinite(result.distance)) details.push(`${(result.distance / 1000).toFixed(1)} km`);
    if (result.saved) details.push(`Saved ${savedAge(result.updatedAt)}`);
    else if (Number.isFinite(result.delay)) details.push(result.delay > 0 ?
      `+${Math.ceil(result.delay / 60)} min traffic` : "No reported delay");
    if (!result.saved && !Array.isArray(result.traffic)) details.push("Traffic unavailable");
    text(info, details.join(" · ") || "Unavailable", 10, palette.muted);
  }
  info.addSpacer(large ? 7 : 3);
  const width = compact ? 76 : large ? 205 : 165;
  const height = large ? 5 : 3;
  const bar = info.addImage(trafficBar(result, width, height));
  bar.imageSize = new Size(width, height);
  bar.cornerRadius = height / 2;
  row.addSpacer();
  row.addSpacer(compact ? 3 : 8);
  const color = result.saved || result.minutes === null ? palette.warning : palette.accent;
  const duration = text(row, result.minutes === null ? "—" :
    `${result.saved ? "~" : ""}${formatMinutes(result.minutes)}`,
    compact ? 12 : large ? 30 : 20, color, true);
  duration.rightAlignText();
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
  widget.addSpacer(large ? 18 : 5);

  results.forEach((result, index) => {
    if (index) widget.addSpacer(large ? 18 : compact ? 5 : 3);
    addRoute(widget, result, compact, large);
  });

  widget.addSpacer();
  widget.addSpacer(4);
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
