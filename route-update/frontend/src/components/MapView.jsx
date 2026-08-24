import { useEffect, useRef, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import {
  getDriverRoute,
  updateDriverLocation,
} from "../api/api";

import {
  saveOfflineLocation,
  getOfflineLocation,
  removeOfflineLocation,
} from "../utils/gpsStorage";

import "leaflet/dist/leaflet.css";

// ======================================================
// FIX LEAFLET MARKER ICONS
// ======================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

function FitRouteBounds({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) {
      map.fitBounds(coordinates, {
        padding: [28, 28],
        maxZoom: 13,
      });
    }
  }, [coordinates, map]);

  return null;
}

// ======================================================
// MAP VIEW
// ======================================================

function MapView() {
  const [location, setLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [error, setError] = useState("");
  const [gpsStatus, setGpsStatus] = useState("Starting GPS...");
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [stopCoordinates, setStopCoordinates] = useState([]);

  // Prevent excessive GPS API requests
  const lastSentTime = useRef(0);

  // Prevent updates after component unmount
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    const driverId = localStorage.getItem("driverId");

    // ==================================================
    // DRIVER ID CHECK
    // ==================================================

    if (!driverId) {
      setError("Driver ID not found. Please login again.");
      setGpsStatus("GPS unavailable");
      return;
    }

    // ==================================================
    // GPS SUPPORT CHECK
    // ==================================================

    if (!navigator.geolocation) {
      setError(
        "GPS is not supported by this browser/device."
      );

      setGpsStatus("GPS not supported");
      return;
    }

    // ==================================================
    // GET ROUTE
    // ==================================================

    getDriverRoute(driverId)
      .then((data) => {
        if (!isMounted.current) return;

        console.log("Route from backend:", data);

        setRouteInfo({
          distance: data.distance,
          estimatedTime: data.estimatedTime,
          stops: data.route || [],
        });

        setRouteCoordinates(data.coordinates || []);
        setStopCoordinates(data.stopCoordinates || []);
      })
      .catch((err) => {
        console.error("Route error:", err);

        if (isMounted.current) {
          setError(
            "Unable to load route. GPS will continue working."
          );
        }
      });

    // ==================================================
    // SYNC OFFLINE GPS
    // ==================================================

    const handleOnline = async () => {
      console.log("Internet restored.");

      const offlineLocation = getOfflineLocation();

      if (!offlineLocation) {
        console.log("No offline GPS location to sync.");
        return;
      }

      console.log(
        "Syncing offline GPS:",
        offlineLocation
      );

      try {
        await updateDriverLocation(
          driverId,
          offlineLocation.latitude,
          offlineLocation.longitude
        );

        removeOfflineLocation();

        console.log(
          "Offline GPS synced successfully."
        );

        if (isMounted.current) {
          setGpsStatus("Online");
          setError("");
        }
      } catch (err) {
        console.error(
          "Offline GPS sync failed:",
          err
        );

        if (isMounted.current) {
          setGpsStatus("Online - GPS sync pending");
        }
      }
    };

    window.addEventListener("online", handleOnline);

    // ==================================================
    // INTERNET STATUS
    // ==================================================

    const handleOffline = () => {
      console.log("Internet disconnected.");

      if (isMounted.current) {
        setGpsStatus("Offline - GPS saved locally");
      }
    };

    window.addEventListener("offline", handleOffline);

    // ==================================================
    // LIVE GPS
    // ==================================================

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        if (!isMounted.current) return;

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const currentLocation = {
          latitude,
          longitude,
          accuracy: position.coords.accuracy,
        };

        console.log(
          "Driver GPS location:",
          currentLocation
        );

        // Update map immediately
        setLocation(currentLocation);

        setError("");

        // Show GPS status
        if (navigator.onLine) {
          setGpsStatus("Online - GPS active");
        } else {
          setGpsStatus("Offline - GPS saved locally");
        }

        const now = Date.now();

        // Send GPS at most once every 10 seconds
        const shouldSend =
          now - lastSentTime.current >= 10000;

        // =================================================
        // OFFLINE
        // =================================================

        if (!navigator.onLine) {
          saveOfflineLocation(currentLocation);

          console.log(
            "GPS saved locally because device is offline."
          );

          return;
        }

        // =================================================
        // ONLINE
        // =================================================

        if (shouldSend) {
          try {
            await updateDriverLocation(
              driverId,
              latitude,
              longitude
            );

            lastSentTime.current = now;

            console.log(
              "GPS location sent to backend."
            );

            if (isMounted.current) {
              setGpsStatus("Online - GPS synced");
            }
          } catch (err) {
            console.error(
              "GPS API update failed:",
              err
            );

            // Save latest location locally
            saveOfflineLocation(currentLocation);

            if (isMounted.current) {
              setGpsStatus(
                "Online - GPS saved locally"
              );
            }
          }
        }
      },

      (err) => {
        console.error("GPS error:", err);

        if (!isMounted.current) return;

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError(
              "Location permission was denied. Please allow location access in your browser/app settings."
            );
            setGpsStatus("Location permission denied");
            break;

          case err.POSITION_UNAVAILABLE:
            setError(
              "Your current location is unavailable. Check your GPS/location settings."
            );
            setGpsStatus("GPS unavailable");
            break;

          case err.TIMEOUT:
            setError(
              "GPS request timed out. Trying again..."
            );
            setGpsStatus("Searching for GPS...");
            break;

          default:
            setError(
              "Unable to access your current location."
            );
            setGpsStatus("GPS error");
        }
      },

      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      isMounted.current = false;

      navigator.geolocation.clearWatch(
        watchId
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  // ======================================================
  // MAP CENTER
  // ======================================================

  const mapCenter = location
    ? [
        location.latitude,
        location.longitude,
      ]
    : [20.2961, 85.8245];

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="space-y-4">

      {/* GPS STATUS */}

      <div className="rounded-xl bg-gray-100 p-3">
        <p className="text-sm font-semibold text-gray-700">
          GPS Status
        </p>

        <p className="mt-1 text-sm text-gray-600">
          {gpsStatus}
        </p>
      </div>

      {/* CURRENT LOCATION */}

      {location && (
        <div className="rounded-xl bg-green-50 p-4">

          <p className="font-semibold text-green-700">
            📍 Your Current Location
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Latitude:{" "}
            {location.latitude.toFixed(6)}
          </p>

          <p className="text-sm text-gray-600">
            Longitude:{" "}
            {location.longitude.toFixed(6)}
          </p>

          <p className="text-sm text-gray-600">
            Accuracy:{" "}
            {Math.round(location.accuracy)} meters
          </p>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ROUTE INFORMATION */}

      {routeInfo && (
        <div className="rounded-xl bg-blue-50 p-4">

          <p className="font-semibold text-blue-700">
            🛣️ Optimized Route
          </p>

          <div className="mt-3 space-y-2">

            {routeInfo.stops.map(
              (stop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3"
                >

                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>

                  <span className="text-sm font-medium text-gray-700">
                    {stop}
                  </span>

                </div>
              )
            )}

          </div>

          <div className="mt-4 flex gap-8 border-t pt-3 text-sm">

            <div>
              <p className="text-gray-500">
                Distance
              </p>

              <p className="font-semibold">
                {routeInfo.distance}
              </p>
            </div>

            <div>
              <p className="text-gray-500">
                Estimated Time
              </p>

              <p className="font-semibold">
                {routeInfo.estimatedTime}
              </p>
            </div>

          </div>

        </div>
      )}

      {/* MAP */}

      <div className="relative z-0 overflow-hidden rounded-xl border shadow-sm">

        <MapContainer
  center={mapCenter}
  style={{ zIndex: 0 }}
          zoom={13}
          scrollWheelZoom={true}
          className="h-96 w-full"
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitRouteBounds coordinates={routeCoordinates} />

          {/* DRIVER LOCATION */}

          {location && (
            <Marker
              position={[
                location.latitude,
                location.longitude,
              ]}
            >
              <Popup>
                📍 <strong>Driver Location</strong>
                <br />
                You are here.
              </Popup>
            </Marker>
          )}

          {/* ROUTE */}

          {routeCoordinates.length > 1 && (
            <Polyline
              positions={routeCoordinates}
              pathOptions={{
                color: "blue",
                weight: 6,
                opacity: 0.8,
              }}
            />
          )}

          {/* ROUTE STOPS: only actual delivery stops, never every road-line point. */}

          {stopCoordinates.map(
            (stop, index) => (
              <Marker
                key={`${stop.name}-${index}`}
                position={stop.coordinates}
              >
                <Popup>
                  <strong>
                    {index === 0 ? "Start" : `Stop ${index}`}: {stop.name}
                  </strong>
                </Popup>
              </Marker>
            )
          )}

        </MapContainer>

      </div>

      {/* LOADING */}

      {!location && !error && (
        <div className="rounded-xl bg-gray-100 p-6 text-center text-sm text-gray-600">
          Getting your current location...
        </div>
      )}

    </div>
  );
}

export default MapView;
