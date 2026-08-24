const mockDeliveries = [
  {
    id: 1,
    village: 'Village A',
    goods: 'Medicines',
    quantity: '20 boxes',
    priority: 'HIGH',
    distance: '12 km',
    status: 'ASSIGNED',
  },

  {
    id: 2,
    village: 'Village B',
    goods: 'Rice',
    quantity: '100 kg',
    priority: 'NORMAL',
    distance: '18 km',
    status: 'ASSIGNED',
  },

  {
    id: 3,
    village: 'Village C',
    goods: 'Vegetables',
    quantity: '50 kg',
    priority: 'HIGH',
    distance: '25 km',
    status: 'ASSIGNED',
  },
]


export const mockGetDriverDeliveries = async () => {

  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })

  return mockDeliveries
}


export const mockUpdateDeliveryStatus = async (
  deliveryId,
  status
) => {

  await new Promise((resolve) => {
    setTimeout(resolve, 300)
  })

  console.log(
    `Mock API: Delivery ${deliveryId} → ${status}`
  )

  return {
    success: true,
    deliveryId,
    status,
  }
}


export const mockGetDriverRoute = async () => {

  await new Promise((resolve) => {
    setTimeout(resolve, 300)
  })

  return {
    route: [
      [20.2961, 85.8245],
      [20.305, 85.835],
      [20.315, 85.845],
      [20.325, 85.855],
    ],
  }
}