import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// ======================================================
// CHECK LOGIN
// ======================================================

function isDriverLoggedIn() {
  const loggedIn =
    localStorage.getItem("driverLoggedIn") === "true";

  const driverId =
    localStorage.getItem("driverId");

  return loggedIn && !!driverId;
}

// ======================================================
// PROTECTED ROUTE
// ======================================================

function ProtectedRoute() {
  if (!isDriverLoggedIn()) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Dashboard />;
}

// ======================================================
// LOGIN ROUTE
// ======================================================

function LoginRoute() {
  if (isDriverLoggedIn()) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Login />;
}

// ======================================================
// APP
// ======================================================

function App() {
  return (
    <Routes>

      {/* Root */}

      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      {/* Login */}

      <Route
        path="/login"
        element={<LoginRoute />}
      />

      {/* Protected Dashboard */}

      <Route
        path="/dashboard"
        element={<ProtectedRoute />}
      />

      {/* Unknown URL */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;