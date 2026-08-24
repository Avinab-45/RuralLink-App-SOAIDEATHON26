import StatusPill from "./StatusPill";
import {
  normalizeDeliveryStatus,
  DELIVERY_STATUS,
} from "../utils/deliveryStatus";

function DeliveryCard({ delivery, onSelect }) {
  const urgency = String(
    delivery.urgency || ""
  ).toUpperCase();

 const isHigh =
    urgency.includes("EMERGENCY") ||
    urgency.includes("HIGH") ||
    urgency.includes("URGENT") ||
    urgency.includes("PERISHABLE");

  const isMedium =
    urgency.includes("MEDIUM");

  const normalizedStatus =
    normalizeDeliveryStatus(delivery.status);

  const urgencyLabel = isHigh
    ? "HIGH PRIORITY"
    : isMedium
    ? "MEDIUM PRIORITY"
    : "NORMAL";

  const urgencyClass = isHigh
    ? "bg-red-50 text-red-700 border-red-100"
    : isMedium
    ? "bg-orange-50 text-orange-700 border-orange-100"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <button
      type="button"
      onClick={() => onSelect(delivery)}
      className="
        group
        w-full
        rounded-2xl
        border
        border-gray-100
        bg-white
        p-5
        text-left
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-0.5
        hover:border-gray-200
        hover:shadow-lg
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500/30
      "
    >
      {/* TOP ROW */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Delivery
            </span>

            {delivery.id && (
              <span className="text-xs font-medium text-gray-400">
                #{delivery.id}
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-base font-bold text-gray-900 sm:text-lg">
            {delivery.customer || "Unknown destination"}
          </h3>
        </div>

        {/* URGENCY */}
        <span
          className={`
            shrink-0
            rounded-full
            border
            px-3
            py-1.5
            text-[10px]
            font-bold
            tracking-wide
            ${urgencyClass}
          `}
        >
          {urgencyLabel}
        </span>
      </div>

      {/* DESTINATION */}
      <div className="mt-4 rounded-xl bg-gray-50 p-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
            <span className="text-sm">📍</span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Drop-off
            </p>

            <p className="mt-0.5 truncate text-sm font-medium text-gray-800">
              {delivery.location || "Location unavailable"}
            </p>
          </div>
        </div>
      </div>

      {/* PICKUP */}
      {delivery.pickupPoint && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <span>📦</span>

          <span className="font-medium text-gray-600">
            Pickup:
          </span>

          <span className="truncate">
            {delivery.pickupPoint}
          </span>
        </div>
      )}

      {/* DIVIDER */}
      <div className="my-4 border-t border-gray-100" />

      {/* BOTTOM ROW */}
      <div className="flex items-center justify-between gap-3">
        <StatusPill
          status={normalizedStatus}
        />

        <span className="
          text-xs
          font-semibold
          text-blue-600
          transition-colors
          group-hover:text-blue-700
        ">
          View Details →
        </span>
      </div>
    </button>
  );
}

export default DeliveryCard;