// One-shot handoff between NotificationsGate and app/index.jsx for cold starts.
//
// When a push launches the app, the gate learns the target route before auth has
// finished initializing — but app/index.jsx then redirects the logged-in user to
// lastScreenVisited and would override a router.push made too early. So the gate
// parks the route here; index consumes it and redirects there instead. If index
// has already resolved by the time the gate reads the launch response (auth was
// fast), the gate pushes directly.
let pending = null;
let indexResolved = false;

export function setPendingRoute(route) {
  pending = route;
}

export function consumePendingRoute() {
  const route = pending;
  pending = null;
  return route;
}

export function markIndexResolved() {
  indexResolved = true;
}

export function hasIndexResolved() {
  return indexResolved;
}
