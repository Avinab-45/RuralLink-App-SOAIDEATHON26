import axios from 'axios'

/*
  This is the address where Member 2's
  Spring Boot backend will eventually run.

  For now we are using a placeholder.
*/

const API_BASE_URL = import.meta.env.VITE_API_URL || ''


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})


/*
  Get deliveries assigned to the driver
*/
export const getDriverDeliveries = async (driverId) => {

  const response = await api.get(
    `/api/driver/deliveries?driverId=${driverId}`
  )

  return response.data
}


/*
  Get optimized route
*/
export const getDriverRoute = async (driverId) => {

  const response = await api.get(
    `/api/driver/route?driverId=${driverId}`
  )

  return response.data
}


/*
  Update delivery status
*/
export const updateDeliveryStatus = async (
  deliveryId,
  status
) => {

  const response = await api.patch(
    `/api/deliveries/${deliveryId}/status`,
    {
      status: status,
    }
  )

  return response.data
}


/*
  Send driver's GPS location
*/
export const sendDriverLocation = async (
  driverId,
  latitude,
  longitude
) => {

  const response = await api.post(
    '/api/driver/location',
    {
      driverId: driverId,
      latitude: latitude,
      longitude: longitude,
    }
  )

  return response.data
}


/*
  Synchronize offline updates
*/
export const syncOfflineUpdates = async (
  updates
) => {

  const response = await api.post(
    '/api/sync',
    {
      updates: updates,
    }
  )

  return response.data
}


export default api
