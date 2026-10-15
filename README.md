# lazy_ass_scripts

## Travel times widget (`traffic.js`)

A Scriptable Home Screen widget showing traffic-aware driving estimates from
TomTom for Home → Himlayan, Home → Palengke, Home → Work, and Work → Home.

- **Small:** four compact route rows. A `~` marks a saved estimate.
- **Medium:** four linear rows, route names on the left and large travel times on
  the right, with a traffic strip beneath each name.
- **Large:** roomy rows with distance and traffic delay beneath the route name.
- Traffic strips run from origin (left) to destination (right), proportional to
  distance. Mint means no reported incident, amber means minor or unclassified
  traffic, red means moderate traffic, and dark red means major traffic or closure.
  These are reported incident sections, not a measurement of every road's speed.
  Gray means traffic is unavailable or the estimate is saved; old cached estimates
  still work without traffic details.
- Failed requests use the last successful estimate for up to 24 hours. Saved
  estimates appear in amber with their age; routes without usable data show as
  unavailable. The footer shows the oldest saved estimate when any are in use.
- Requests run concurrently with a ten-second timeout each.

### Install on your iPhone

1. Copy `traffic.js` into a script in the Scriptable app. Keep your TomTom API key
   in `API_KEY`, and adjust `coordinates` and `routes` if needed.
2. Run it in Scriptable to preview the medium widget. This also saves the first
   successful estimates. There is no results alert.
3. Add a **Scriptable** widget to your Home Screen. Choose medium for the row layout.
4. Long-press the widget, choose **Edit Widget**, and select this script.

The Home Screen widget fetches and renders estimates when iOS refreshes it.
`REFRESH_MINUTES` requests a refresh after 15 minutes; iOS controls the actual
schedule, so this is not a continuous traffic display. The footer shows when
estimates were fetched, rather than the last time the widget rendered.

### Taps and customization

Tapping a route row opens driving directions in Apple Maps. Small widgets have
one tap target, so tapping anywhere opens the first route. Tapping the background
of a medium or large widget also opens the first route. Maps calculates its own
route and estimate, which can differ from TomTom.

Scriptable's documented URL setting overrides the widget's configured tap
behavior. This directs taps to Maps; it does not provide a tap-to-refresh action
or guarantee that a tap can do nothing. Set `OPEN_MAPS_ON_TAP = false` to use the
tap behavior configured in Scriptable instead (which may open Scriptable).

Set `PREVIEW_SIZE` to `"small"`, `"medium"`, or `"large"` to change the in-app
preview. Home Screen widgets select their layout automatically. These layouts
are intended for Home Screen widgets, not Lock Screen accessories.

Implementation references: [Scriptable widgets](https://docs.scriptable.app/listwidget/),
[route row links](https://docs.scriptable.app/widgetstack/), and
[TomTom routing](https://docs.tomtom.com/routing-api/documentation/tomtom-maps/v1/calculate-route).

## Terminal activity (`productive.js`)

Run `node productive.js` for simulated build activity. Press Ctrl+C to stop.
