const GPS_STORAGE_KEY = "offlineDriverLocation";

export const saveOfflineLocation = (location) => {
  localStorage.setItem(
    GPS_STORAGE_KEY,
    JSON.stringify({
      ...location,
      savedAt: new Date().toISOString(),
    })
  );

  console.log("GPS location saved offline:", location);
};

export const getOfflineLocation = () => {
  const data = localStorage.getItem(GPS_STORAGE_KEY);

  if (!data) {
    return null;
  }

  return JSON.parse(data);
};

export const removeOfflineLocation = () => {
  localStorage.removeItem(GPS_STORAGE_KEY);
};