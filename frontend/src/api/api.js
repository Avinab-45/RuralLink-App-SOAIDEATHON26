import axios from "axios";

// ======================================================
// S14 DRIVER PWA - API CONFIGURATION
// ======================================================

const API = axios.create({
  // Keep the PWA same-origin by default. Vite and nginx proxy /api to FastAPI.
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ======================================================
// DRIVER LOGIN
// ======================================================

export const loginDriver = async (driverId, password) => {
  try {
    const response = await API.post("/api/driver/login", {
      driverId,
      password,
    });

    return response.data;
  } catch (error) {
    console.error("Driver login failed:", error);

    if (error.response) {
      console.error("Backend response:", error.response.data);
      console.error("Status:", error.response.status);
    } else if (error.request) {
      console.error("No response from backend:", error.request);
    } else {
      console.error("Request error:", error.message);
    }

    throw error;
  }
};

// ======================================================
// GET DRIVER DELIVERIES
// ======================================================

export const getDriverDeliveries = async (driverId) => {
  const response = await API.get(
    `/api/driver/${driverId}/deliveries`
  );

  return response.data;
};

// Keep this function because your existing components
// may already be using getDeliveries().
export const getDeliveries = async (driverId) => {
  return getDriverDeliveries(driverId);
};

// ======================================================
// GET DRIVER ROUTE
// ======================================================

export const getDriverRoute = async (driverId) => {
  const response = await API.get(
    `/api/driver/${driverId}/route`
  );

  return response.data;
};

// ======================================================
// UPDATE DRIVER GPS LOCATION
// ======================================================

export const updateDriverLocation = async (
  driverId,
  latitude,
  longitude
) => {
  const response = await API.post(
    `/api/driver/${driverId}/location`,
    {
      latitude,
      longitude,
    }
  );

  return response.data;
};

// ======================================================
// UPDATE DELIVERY STATUS
// ======================================================

export const updateDeliveryStatus = async (
  deliveryId,
  status
) => {
  const response = await API.patch(
    `/api/driver/deliveries/${deliveryId}/status`,
    {
      status,
    }
  );

  return response.data;
};

// ======================================================
// EXPORT AXIOS INSTANCE
// ======================================================

export default API;
