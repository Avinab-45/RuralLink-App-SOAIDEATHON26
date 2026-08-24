import {
  DELIVERY_STATUS,
  normalizeDeliveryStatus,
  getDeliveryStatusLabel,
} from "../utils/deliveryStatus";

function StatusPill({ status }) {
  const normalizedStatus =
    normalizeDeliveryStatus(status);

  const label =
    getDeliveryStatusLabel(normalizedStatus);

  const styles = {
    [DELIVERY_STATUS.ASSIGNED]:
      "bg-slate-100 text-slate-700 border-slate-200",

    [DELIVERY_STATUS.PICKED_UP]:
      "bg-amber-50 text-amber-700 border-amber-200",

    [DELIVERY_STATUS.IN_TRANSIT]:
      "bg-blue-50 text-blue-700 border-blue-200",

    [DELIVERY_STATUS.DELIVERED]:
      "bg-emerald-50 text-emerald-700 border-emerald-200",

    [DELIVERY_STATUS.FAILED]:
      "bg-red-50 text-red-700 border-red-200",
  };

  const dotStyles = {
    [DELIVERY_STATUS.ASSIGNED]:
      "bg-slate-500",

    [DELIVERY_STATUS.PICKED_UP]:
      "bg-amber-500",

    [DELIVERY_STATUS.IN_TRANSIT]:
      "bg-blue-500",

    [DELIVERY_STATUS.DELIVERED]:
      "bg-emerald-500",

    [DELIVERY_STATUS.FAILED]:
      "bg-red-500",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-2
        rounded-full
        border
        px-3
        py-1.5
        text-xs
        font-semibold
        ${styles[normalizedStatus] || "bg-gray-100 text-gray-700 border-gray-200"}
      `}
    >
      <span
        className={`
          h-1.5
          w-1.5
          rounded-full
          ${dotStyles[normalizedStatus] || "bg-gray-500"}
        `}
      />

      {label}
    </span>
  );
}

export default StatusPill;