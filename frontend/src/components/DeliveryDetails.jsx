function DeliveryDetails({ delivery, onBack, onStatusChange }) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm font-medium text-blue-600"
      >
        ← Back to Deliveries
      </button>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">
          {delivery.village}
        </h2>

        <div className="mt-4 space-y-2 text-gray-700">
          <p>
            <strong>Goods:</strong> {delivery.goods}
          </p>

          <p>
            <strong>Quantity:</strong> {delivery.quantity}
          </p>

          <p>
            <strong>Priority:</strong> {delivery.priority}
          </p>

          <p>
            <strong>Distance:</strong> {delivery.distance}
          </p>

          <p>
            <strong>Current Status:</strong> {delivery.status}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Update Delivery
        </h3>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <button
            onClick={() => onStatusChange('PICKED_UP')}
            className="rounded-lg bg-yellow-500 px-4 py-3 font-medium text-white"
          >
            Picked Up
          </button>

          <button
            onClick={() => onStatusChange('OUT_FOR_DELIVERY')}
            className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white"
          >
            Out for Delivery
          </button>

          <button
            onClick={() => onStatusChange('DELIVERED')}
            className="rounded-lg bg-green-600 px-4 py-3 font-medium text-white"
          >
            Delivered
          </button>

          <button
            onClick={() => onStatusChange('FAILED')}
            className="rounded-lg bg-red-600 px-4 py-3 font-medium text-white"
          >
            Failed
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeliveryDetails