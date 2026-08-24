import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginDriver } from "../api/api";
import GlowButton from "../components/GlowButton";
function Login() {
  const navigate = useNavigate();

  const [driverId, setDriverId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

 const handleLogin = async (e) => {
  e.preventDefault();

  setError("");

  if (!driverId || !password) {
    setError("Please enter Driver ID and password.");
    return;
  }

  try {
    setLoading(true);

    const data = await loginDriver(driverId, password);

    console.log("Login response:", data);

    // Backend returns:
    // {
    //   token,
    //   driverId,
    //   name,
    //   assignedVehicleId
    // }

    if (!data || !data.driverId) {
      throw new Error("Invalid login response from server.");
    }

    localStorage.setItem("driverLoggedIn", "true");
    localStorage.setItem("driverId", data.driverId);
    localStorage.setItem("driverName", data.name || "");
    localStorage.setItem(
      "assignedVehicleId",
      data.assignedVehicleId || ""
    );
    localStorage.setItem("driverToken", data.token || "");

    navigate("/dashboard");

  } catch (err) {
    console.error("Login error:", err);

    setError(
      err.message || "Unable to connect to the server."
    );

  } finally {
    setLoading(false);
  }
};

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">

      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">

        <h1 className="text-2xl font-bold text-gray-900">
          Driver Login
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Sign in to access your deliveries
        </p>

        <form
          onSubmit={handleLogin}
          className="mt-6 space-y-4"
        >

          {/* Driver ID */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Driver ID
            </label>

            <input
              type="text"
              value={driverId}
              onChange={(e) =>
                setDriverId(e.target.value)
              }
              placeholder="Enter Driver ID"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Login Button */}
         <GlowButton
  type="submit"
  disabled={loading}
  className="w-full py-3"
>
  {loading ? "Signing in..." : "Login"}
</GlowButton>

        </form>

      </div>

    </div>
  );
}

export default Login;