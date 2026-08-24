const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const API = isLocal
  ? "http://127.0.0.1:8000"
  : window.location.origin;
  const driverPwaLink = document.getElementById("driver-pwa-link");

if (driverPwaLink) {
  driverPwaLink.href = isLocal
    ? "http://127.0.0.1:8000/driver/driver.index.html"
    : "/driver/driver.index.html";
}
const $ = (selector) => document.querySelector(selector);
let map, line, driverMarker, endpointMarker, driverPollingStarted = false;
const driverIcon = L.divIcon({ className: "driver-marker", html: "🚚", iconSize: [34, 34], iconAnchor: [17, 17] });

async function updateDriverMarker() {
  try {
    const response = await fetch(API + "/api/driver/D0001/location");
    if (!response.ok || !map) return;
    const location = await response.json();
    const point = [location.latitude, location.longitude];
    if (driverMarker) driverMarker.setLatLng(point);
    else driverMarker = L.marker(point, { icon: driverIcon }).addTo(map).bindPopup("🚚 Driver live location");
  } catch (_) {}
}

function startDriverPolling() {
  if (driverPollingStarted) return;
  driverPollingStarted = true;
  updateDriverMarker();
  setInterval(updateDriverMarker, 5000);
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.onclick = () => {
    document.querySelectorAll("[data-view], .view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    $("#" + button.dataset.view).classList.add("active");
    if (button.dataset.view === "operations") {
      if (!map) {
        map = L.map("map").setView([20.3, 85.82], 8);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors" }).addTo(map);
        startDriverPolling();
      }
      load();
    }
  };
});

$("#location-button").onclick = () => navigator.geolocation.getCurrentPosition(
  (position) => {
    const form = $("#order-form");
    form.latitude.value = position.coords.latitude;
    form.longitude.value = position.coords.longitude;
    $("#location-status").textContent = "Location captured.";
  },
  () => { $("#location-status").textContent = "Location unavailable; village lookup will be used."; }
);

$("#order-form").onsubmit = async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target));
  payload.latitude = payload.latitude ? +payload.latitude : null;
  payload.longitude = payload.longitude ? +payload.longitude : null;
  const output = $("#order-result");
  output.hidden = false;
  output.textContent = "Processing…";
  try {
    const response = await fetch(API + "/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const order = await response.json();
    if (!response.ok) throw Error(order.detail);
    output.innerHTML = `<b>Order ${order.order_id} received.</b><br>${order.category} to ${order.village}; priority ${Math.round(order.priority_score)}; predicted ETA ${Math.round(order.eta_minutes)} min.`;
    event.target.reset();
  } catch (error) { output.textContent = error.message + " — start the backend at " + API; }
};

async function load() {
  const body = $("#orders-body");
  try {
    const orders = await (await fetch(API + "/api/orders")).json();
    body.innerHTML = orders.length ? orders.map((order) => `<tr><td>${order.order_id}</td><td>${order.customer_name}</td><td>${order.village}</td><td>${Math.round(order.priority_score || 0)}</td><td>${Math.round(order.eta_minutes || 0)} min</td><td>${order.status}</td></tr>`).join("") : '<tr><td colspan="6">No customer orders yet.</td></tr>';
  } catch (_) { body.innerHTML = '<tr><td colspan="6">API unavailable.</td></tr>'; }
}

$("#refresh-orders").onclick = load;
$("#plan-orders").onclick = async () => {
  const status = $("#routing-status");
  status.textContent = "Optimising and requesting road geometry…";
  try {
    const response = await fetch(API + "/api/orders/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const result = await response.json();
    if (!response.ok) throw Error(result.detail);
    const coordinates = result.road_route?.coordinates || [];
    if (line) map.removeLayer(line);
    if (coordinates.length > 1) {
      line = L.polyline(coordinates, { color: "#146c5a", weight: 5 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [25, 25] });
      if (endpointMarker) map.removeLayer(endpointMarker);
      endpointMarker = L.marker(coordinates[coordinates.length - 1]).addTo(map).bindPopup("📍 Final delivery endpoint");
    }
    const output = $("#route-summary");
    output.hidden = false;
    output.innerHTML = `<b>${result.road_route.routing_mode}</b> · ${result.road_route.distance_km} km · ${result.road_route.duration_minutes} min`;
    status.textContent = "";
    load();
  } catch (error) { status.textContent = error.message; }
};
