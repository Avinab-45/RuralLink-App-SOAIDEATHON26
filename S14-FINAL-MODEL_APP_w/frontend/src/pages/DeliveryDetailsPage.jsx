import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DeliveryDetails from '../components/DeliveryDetails'

function DeliveryDetailsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const originalDelivery = location.state?.delivery

  const [delivery, setDelivery] = useState(originalDelivery)

  if (!delivery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="rounded-xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Delivery not found
          </h1>

          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handleStatusChange = (newStatus) => {
    setDelivery((currentDelivery) => ({
      ...currentDelivery,
      status: newStatus,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Header */}
      <header className="bg-blue-600 text-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <h1 className="text-lg font-bold">
            Delivery Details
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl p-4">

        <DeliveryDetails
          delivery={delivery}
          onBack={() => navigate('/dashboard')}
          onStatusChange={handleStatusChange}
        />

      </main>

    </div>
  )
}

export default DeliveryDetailsPage