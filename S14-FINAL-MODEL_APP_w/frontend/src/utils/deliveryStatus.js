// ======================================================
// S14 DRIVER PWA - DELIVERY STATUS NORMALIZATION
// ======================================================

// Internal frontend status values.
// These are the ONLY values the UI should use.
export const DELIVERY_STATUS = {
  ASSIGNED: "assigned",
  PICKED_UP: "picked_up",
  IN_TRANSIT: "in_transit",
  DELIVERED: "delivered",
  FAILED: "failed",
};

// Convert any status received from the backend
// or older frontend code into our standard status.
export const normalizeDeliveryStatus = (status) => {
  if (!status) {
    return DELIVERY_STATUS.ASSIGNED;
  }

  const value = String(status)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  switch (value) {
    case "pending":
    case "assigned":
      return DELIVERY_STATUS.ASSIGNED;

    case "picked_up":
    case "pickup":
      return DELIVERY_STATUS.PICKED_UP;

    case "in_transit":
    case "out_for_delivery":
      return DELIVERY_STATUS.IN_TRANSIT;

    case "delivered":
      return DELIVERY_STATUS.DELIVERED;

    case "failed":
      return DELIVERY_STATUS.FAILED;

    default:
      console.warn(
        "Unknown delivery status received:",
        status
      );

      return value;
  }
};

// Convert our internal status into a clean
// human-readable label for the UI.
export const getDeliveryStatusLabel = (status) => {
  const normalizedStatus =
    normalizeDeliveryStatus(status);

  switch (normalizedStatus) {
    case DELIVERY_STATUS.ASSIGNED:
      return "Assigned";

    case DELIVERY_STATUS.PICKED_UP:
      return "Picked Up";

    case DELIVERY_STATUS.IN_TRANSIT:
      return "In Transit";

    case DELIVERY_STATUS.DELIVERED:
      return "Delivered";

    case DELIVERY_STATUS.FAILED:
      return "Failed";

    default:
      return "Unknown";
  }
};

// Check whether a delivery has reached a final state.
export const isDeliveryCompleted = (status) => {
  const normalizedStatus =
    normalizeDeliveryStatus(status);

  return (
    normalizedStatus ===
      DELIVERY_STATUS.DELIVERED ||
    normalizedStatus ===
      DELIVERY_STATUS.FAILED
  );
};