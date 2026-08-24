import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import MapView from "../components/MapView";import Header from "../components/Header";
import DeliveryCard from "../components/DeliveryCard";
import LocationTracker from "../components/LocationTracker";
import GlowButton from "../components/GlowButton";
import {
  getDeliveries,
  updateDeliveryStatus as updateDeliveryStatusAPI,
} from "../api/api";

import {
  getOfflineUpdates,
  saveOfflineUpdate,
  removeOfflineUpdate,
} from "../utils/offlineStorage";


function Dashboard() {

  // =========================
  // STATE
  // =========================

  const [driverLocation, setDriverLocation] =
    useState(null);

  const [selectedDelivery, setSelectedDelivery] =
    useState(null);

  const [deliveries, setDeliveries] =
    useState([]);

  const [loadingDeliveries, setLoadingDeliveries] =
    useState(true);

  const [deliveryError, setDeliveryError] =
    useState("");

  const [isOnline, setIsOnline] =
    useState(navigator.onLine);

  const [syncing, setSyncing] =
    useState(false);

  const [syncStatus, setSyncStatus] =
    useState(
      navigator.onLine
        ? "Online"
        : "Offline"
    );


  // =========================
  // OFFLINE SYNC
  // =========================

  useEffect(() => {

    const syncOfflineUpdates =
      async () => {

        const offlineUpdates =
          getOfflineUpdates();


        // Nothing to sync
        if (
          offlineUpdates.length === 0
        ) {

          setSyncing(false);

          // Normal state
          if (navigator.onLine) {
            setSyncStatus("Online");
          } else {
            setSyncStatus("Offline");
          }

          return;
        }


        console.log(
          "Offline updates found:",
          offlineUpdates
        );


        setSyncing(true);
        setSyncStatus("Syncing");


        let syncSuccessful =
          true;


        // Sync from last item
        for (
          let i =
            offlineUpdates.length - 1;
          i >= 0;
          i--
        ) {

          const update =
            offlineUpdates[i];


          try {

            console.log(
              "Syncing delivery:",
              update.deliveryId,
              update.status
            );


            await updateDeliveryStatusAPI(
              update.deliveryId,
              update.status
            );


            console.log(
              "Offline update synced:",
              update
            );


            removeOfflineUpdate(i);

          } catch (error) {

            syncSuccessful =
              false;

            console.error(
              "Failed to sync update:",
              update,
              error
            );

          }

        }


        setSyncing(false);


        const remainingUpdates =
          getOfflineUpdates();


        // Everything successfully synced
        if (
          syncSuccessful &&
          remainingUpdates.length === 0
        ) {

          setSyncStatus("Synced");


          console.log(
            "Offline delivery sync completed"
          );


          // Return to normal Online status
          // after a short delay
          setTimeout(() => {

            if (navigator.onLine) {

              setSyncStatus("Online");

            }

          }, 2000);

        }

        // Some updates still remain
        else if (
          remainingUpdates.length > 0
        ) {

          setSyncStatus(
            "Saved Offline"
          );

        }

      };


    // =========================
    // INTERNET RESTORED
    // =========================

    const handleOnline =
      async () => {

        console.log(
          "Internet connection restored"
        );


        setIsOnline(true);


        const offlineUpdates =
          getOfflineUpdates();


        if (
          offlineUpdates.length > 0
        ) {

          await syncOfflineUpdates();

        } else {

          setSyncStatus("Online");

        }

      };


    // =========================
    // INTERNET LOST
    // =========================

    const handleOffline =
      () => {

        console.log(
          "Internet connection lost"
        );


        setIsOnline(false);

        setSyncStatus("Offline");

      };


    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );


    // Check for updates when
    // Dashboard first loads
    if (navigator.onLine) {

      const existingUpdates =
        getOfflineUpdates();


      if (
        existingUpdates.length > 0
      ) {

        syncOfflineUpdates();

      }

    }


    return () => {

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );

    };

  }, []);


  // =========================
  // LOAD DELIVERIES
  // =========================

  useEffect(() => {

    const driverId =
      localStorage.getItem(
        "driverId"
      );


    console.log(
      "Dashboard loaded"
    );

    console.log(
      "Driver ID:",
      driverId
    );


    if (!driverId) {

      setDeliveryError(
        "Driver ID not found."
      );

      setLoadingDeliveries(false);

      return;

    }


    getDeliveries(driverId)

      .then((data) => {

        console.log(
          "Deliveries from backend:",
          data
        );


        const formattedDeliveries =
          data.map(
            (delivery) => ({

              id:
                delivery.deliveryId,

              customer:
                delivery.dropoffPoint,

              location:
                delivery.dropoffPoint,

              status:
                delivery.status,

              urgency:
                delivery.priority,

              pickupPoint:
                delivery.pickupPoint,

            })
          );


        setDeliveries(
          formattedDeliveries
        );

      })

      .catch((error) => {

        console.error(
          "Delivery error:",
          error
        );

        setDeliveryError(
          error.message
        );

      })

      .finally(() => {

        setLoadingDeliveries(false);

      });

  }, []);


  // =========================
  // UPDATE DELIVERY STATUS
  // =========================

  const updateDeliveryStatus =
    async (
      id,
      newStatus
    ) => {

      console.log(
        "Updating delivery:",
        id,
        newStatus
      );


      // =========================
      // OFFLINE
      // =========================

      if (!navigator.onLine) {

        saveOfflineUpdate(
          id,
          newStatus
        );


        setSyncStatus(
          "Saved Offline"
        );


        // Update UI immediately

        setDeliveries(
          (prevDeliveries) =>
            prevDeliveries.map(
              (delivery) =>
                delivery.id === id
                  ? {
                      ...delivery,
                      status:
                        newStatus,
                    }
                  : delivery
            )
        );


        setSelectedDelivery(
          (prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    newStatus,
                }
              : prev
        );


        console.log(
          "Delivery update saved offline"
        );


        return;

      }


      // =========================
      // ONLINE
      // =========================

      try {

        await updateDeliveryStatusAPI(
          id,
          newStatus
        );


        // Update UI

        setDeliveries(
          (prevDeliveries) =>
            prevDeliveries.map(
              (delivery) =>
                delivery.id === id
                  ? {
                      ...delivery,
                      status:
                        newStatus,
                    }
                  : delivery
            )
        );


        setSelectedDelivery(
          (prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    newStatus,
                }
              : prev
        );


        // Normal online operation
        setSyncStatus("Online");


        console.log(
          "Status updated successfully"
        );

      }


      // =========================
      // BACKEND REQUEST FAILED
      // =========================

      catch (error) {

        console.error(
          "Status update failed:",
          error
        );


        // Save locally

        saveOfflineUpdate(
          id,
          newStatus
        );


        setSyncStatus(
          "Saved Offline"
        );


        // Update UI immediately

        setDeliveries(
          (prevDeliveries) =>
            prevDeliveries.map(
              (delivery) =>
                delivery.id === id
                  ? {
                      ...delivery,
                      status:
                        newStatus,
                    }
                  : delivery
            )
        );


        setSelectedDelivery(
          (prev) =>
            prev
              ? {
                  ...prev,
                  status:
                    newStatus,
                }
              : prev
        );


        console.log(
          "Update saved offline because server was unavailable"
        );

      }

    };


  // =========================
  // LOGOUT
  // =========================

  const logout = () => {

    localStorage.removeItem(
      "driverLoggedIn"
    );

    localStorage.removeItem(
      "driverId"
    );

    localStorage.removeItem(
      "driverName"
    );

    localStorage.removeItem(
      "assignedVehicleId"
    );

    localStorage.removeItem(
      "driverToken"
    );


    window.location.href =
      "/driver/#/login";

  };


  // =========================
  // PRIORITY UI
  // =========================

  const getUrgencyInfo =
    (urgency) => {

      if (!urgency) {

        return {
          label: "Normal",
          className:
            "bg-green-100 text-green-700",
        };

      }


      const value =
        urgency.toUpperCase();


      if (
        value.includes("HIGH") ||
        value.includes("URGENT") ||
        value.includes("PERISHABLE")
      ) {

        return {
          label: "High Priority",
          className:
            "bg-red-100 text-red-700",
        };

      }


      if (
        value.includes("MEDIUM")
      ) {

        return {
          label: "Medium Priority",
          className:
            "bg-orange-100 text-orange-700",
        };

      }


      return {
        label: "Normal Priority",
        className:
          "bg-green-100 text-green-700",
      };

    };


  // =========================
  // STATUS COLOR
  // =========================

  const getSyncStatusClass =
    () => {

      if (
        syncStatus === "Offline"
      ) {

        return "text-red-600";

      }


      if (
        syncStatus === "Saved Offline"
      ) {

        return "text-orange-600";

      }


      if (
        syncStatus === "Syncing"
      ) {

        return "text-blue-600";

      }


      if (
        syncStatus === "Synced"
      ) {

        return "text-green-600";

      }


      if (
        syncStatus === "Online"
      ) {

        return "text-green-600";

      }


      return "text-gray-600";

    };


  // =========================
  // STATUS EMOJI
  // =========================

  const getSyncEmoji =
    () => {

      if (
        syncStatus === "Offline"
      ) {

        return "🔴";

      }


      if (
        syncStatus === "Saved Offline"
      ) {

        return "🟠";

      }


      if (
        syncStatus === "Syncing"
      ) {

        return "🔵";

      }


      if (
        syncStatus === "Synced"
      ) {

        return "🟢";

      }


      if (
        syncStatus === "Online"
      ) {

        return "🟢";

      }


      return "";

    };


  // =========================
  // UI
  // =========================

  return (

  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.4 }}
    className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50"
  >


      {/* HEADER */}

<Header
  isOnline={isOnline}
  syncStatus={syncStatus}
  driverName={
    localStorage.getItem("driverName") || "Driver"
  }
  onLogout={logout}
/>

      <section className="mx-auto max-w-5xl px-4 pt-5 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-emerald-500 p-5 text-white shadow-lg">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Today's delivery progress</p>
              <p className="mt-1 text-3xl font-bold">
                {deliveries.filter((delivery) => delivery.status === "Delivered").length} / {deliveries.length}
              </p>
            </div>
            <p className="text-2xl font-bold">
              {deliveries.length === 0 ? 0 : Math.round((deliveries.filter((delivery) => delivery.status === "Delivered").length / deliveries.length) * 100)}%
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/25">
            <div
              className="h-full rounded-full bg-white transition-all duration-700"
              style={{ width: `${deliveries.length === 0 ? 0 : Math.round((deliveries.filter((delivery) => delivery.status === "Delivered").length / deliveries.length) * 100)}%` }}
            />
          </div>
        </div>
      </section>


      {/* MAIN */}

      <motion.main
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.1 }}
  className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6"
>


        {/* GPS TRACKER */}

        <LocationTracker
          onLocationUpdate={
            setDriverLocation
          }
        />


        {/* MAP */}

        <section className="rounded-xl bg-white p-5 shadow-sm">

          <h2 className="text-lg font-semibold">

            Optimized Route

          </h2>


          <p className="mt-2 text-sm text-gray-500">

            Your optimized delivery route

          </p>


          <div className="mt-4">

            <MapView />

          </div>


          {driverLocation && (

            <div className="mt-4 rounded-lg bg-green-50 p-3">

              <p className="text-sm font-medium text-green-700">

                📍 GPS Location Active

              </p>


              <p className="mt-1 text-xs text-green-600">

                Latitude:{" "}

                {driverLocation.latitude.toFixed(
                  5
                )}

                <br />

                Longitude:{" "}

                {driverLocation.longitude.toFixed(
                  5
                )}

              </p>

            </div>

          )}

        </section>


        {/* DELIVERIES */}

        <motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.3 }}
>

          <h2 className="mb-3 text-lg font-semibold">

            Assigned Deliveries

          </h2>


          {loadingDeliveries && (

            <div className="rounded-xl bg-white p-5 text-center shadow-sm">

              <p className="text-gray-500">

                Loading deliveries...

              </p>

            </div>

          )}


          {!loadingDeliveries &&
            deliveryError && (

              <div className="rounded-xl bg-red-50 p-5 shadow-sm">

                <p className="font-medium text-red-700">

                  Failed to load deliveries

                </p>


                <p className="mt-1 text-sm text-red-600">

                  {deliveryError}

                </p>

              </div>

            )}


          {!loadingDeliveries &&
            !deliveryError &&
            deliveries.length === 0 && (

              <div className="rounded-xl bg-white p-5 text-center shadow-sm">

                <p className="text-gray-500">

                  No deliveries assigned.

                </p>

              </div>

            )}


          <div className="space-y-3">

            {deliveries.map(
              (delivery) => (

                <DeliveryCard
                  key={
                    delivery.id
                  }
                  delivery={
                    delivery
                  }
                  onSelect={
                    setSelectedDelivery
                  }
                />

              )
            )}

          </div>

        </motion.section>


        {/* DELIVERY DETAILS */}

        {selectedDelivery && (

          <motion.section
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.2 }}
  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
>


            <div className="flex items-center justify-between">

              <h2 className="text-lg font-semibold">

                Delivery Details

              </h2>


              <button
                onClick={() =>
                  setSelectedDelivery(
                    null
                  )
                }
                className="rounded-lg px-3 py-1 text-sm text-gray-500 transition hover:bg-gray-100"
              >

                Close

              </button>

            </div>


            <div className="mt-4 space-y-4">


              {/* CUSTOMER */}

              <div>

                <p className="text-sm text-gray-500">

                  Customer / Destination

                </p>


                <p className="font-medium">

                  {
                    selectedDelivery.customer
                  }

                </p>

              </div>


              {/* PICKUP */}

              {selectedDelivery.pickupPoint && (

                <div>

                  <p className="text-sm text-gray-500">

                    Pickup Point

                  </p>


                  <p className="font-medium">

                    {
                      selectedDelivery.pickupPoint
                    }

                  </p>

                </div>

              )}


              {/* DROP OFF */}

              <div>

                <p className="text-sm text-gray-500">

                  Drop-off Location

                </p>


                <p className="font-medium">

                  {
                    selectedDelivery.location
                  }

                </p>

              </div>


              {/* URGENCY */}

              <div>

                <p className="text-sm text-gray-500">

                  Urgency

                </p>


                {(() => {

                  const urgencyInfo =
                    getUrgencyInfo(
                      selectedDelivery.urgency
                    );


                  return (

                    <span
                      className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${urgencyInfo.className}`}
                    >

                      {
                        urgencyInfo.label
                      }

                    </span>

                  );

                })()}

              </div>


              {/* STATUS */}

              <div>

                <p className="text-sm text-gray-500">

                  Status

                </p>


                <span className="inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">

                  {
                    selectedDelivery.status
                  }

                </span>


                {/* PENDING → PICKED UP */}

                {(selectedDelivery.status ===
                  "Pending" ||
                  selectedDelivery.status ===
                  "ASSIGNED") && (

                  <button
                    onClick={() =>
                      updateDeliveryStatus(
                        selectedDelivery.id,
                        "Picked Up"
                      )
                    }
                    className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >

                    Picked Up

                  </button>

                )}


                {/* PICKED UP → IN TRANSIT */}

                {selectedDelivery.status ===
                  "Picked Up" && (

                  <button
                    onClick={() =>
                      updateDeliveryStatus(
                        selectedDelivery.id,
                        "In Transit"
                      )
                    }
                    className="mt-4 ml-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
                  >

                    In Transit

                  </button>

                )}


                {/* IN TRANSIT → COMPLETE */}

                {selectedDelivery.status ===
                  "In Transit" && (

                  <button
                    onClick={() =>
                      updateDeliveryStatus(
                        selectedDelivery.id,
                        "Delivered"
                      )
                    }
                    className="mt-4 ml-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                  >

                    Complete delivery

                  </button>

                )}


                {/* DELIVERED MESSAGE */}

                {selectedDelivery.status ===
                  "Delivered" && (

                  <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">

                    ✓ Delivery completed successfully

                  </div>

                )}



              </div>

            </div>

          </motion.section>

        )}

      </motion.main>

    </motion.div>

);
}

export default Dashboard;
