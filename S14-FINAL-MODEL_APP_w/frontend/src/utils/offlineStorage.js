const STORAGE_KEY = "offlineDeliveryUpdates";

// Get saved offline updates
export const getOfflineUpdates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to read offline updates:", error);
    return [];
  }
};

// Save a delivery update for later
export const saveOfflineUpdate = (deliveryId, status) => {
  try {
    const updates = getOfflineUpdates();

    updates.push({
      deliveryId,
      status,
      savedAt: new Date().toISOString(),
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updates)
    );

    console.log("Delivery update saved offline:", {
      deliveryId,
      status,
    });
  } catch (error) {
    console.error("Failed to save offline update:", error);
  }
};

// Remove an update after successful sync
export const removeOfflineUpdate = (index) => {
  try {
    const updates = getOfflineUpdates();

    updates.splice(index, 1);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updates)
    );
  } catch (error) {
    console.error("Failed to remove offline update:", error);
  }
};

// Clear all offline updates
export const clearOfflineUpdates = () => {
  localStorage.removeItem(STORAGE_KEY);
};