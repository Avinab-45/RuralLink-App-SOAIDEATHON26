import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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

      const data = await loginDriver(
        driverId,
        password
      );

      console.log("Login response:", data);

      if (!data || !data.driverId) {
        throw new Error(
          "Invalid login response from server."
        );
      }

      localStorage.setItem(
        "driverLoggedIn",
        "true"
      );

      localStorage.setItem(
        "driverId",
        data.driverId
      );

      localStorage.setItem(
        "driverName",
        data.name || ""
      );

      localStorage.setItem(
        "assignedVehicleId",
        data.assignedVehicleId || ""
      );

      localStorage.setItem(
        "driverToken",
        data.token || ""
      );

      navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.message ||
          "Unable to connect to the server."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="
      relative
      flex
      min-h-screen
      items-center
      justify-center
      overflow-hidden
      bg-slate-950
      px-4
      py-8
    ">

      {/* Background decoration */}
      <div className="
        pointer-events-none
        absolute
        inset-0
        overflow-hidden
      ">

        <div className="
          absolute
          -left-32
          -top-32
          h-72
          w-72
          rounded-full
          bg-blue-500/20
          blur-3xl
        " />

        <div className="
          absolute
          -bottom-32
          -right-32
          h-80
          w-80
          rounded-full
          bg-emerald-500/20
          blur-3xl
        " />

        <div className="
          absolute
          left-1/2
          top-1/2
          h-96
          w-96
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-blue-600/5
          blur-3xl
        " />

      </div>


      {/* Login container */}

      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className="
          relative
          z-10
          w-full
          max-w-md
        "
      >

        {/* Logo / Brand */}

        <div className="
          mb-7
          text-center
        ">

          <div className="
            mx-auto
            mb-4
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-2xl
            bg-gradient-to-br
            from-blue-500
            to-emerald-500
            text-3xl
            shadow-xl
            shadow-blue-500/20
          ">
            🚚
          </div>

          <h1 className="
            text-2xl
            font-bold
            tracking-tight
            text-white
          ">
            RuralLink
          </h1>

          <p className="
            mt-1
            text-sm
            text-slate-400
          ">
            Driver Delivery Network
          </p>

        </div>


        {/* Login card */}

        <div className="
          rounded-3xl
          border
          border-white/10
          bg-white/[0.07]
          p-6
          shadow-2xl
          backdrop-blur-xl
          sm:p-8
        ">

          <div className="mb-6">

            <h2 className="
              text-xl
              font-semibold
              text-white
            ">
              Welcome back
            </h2>

            <p className="
              mt-1
              text-sm
              text-slate-400
            ">
              Sign in to access your deliveries
            </p>

          </div>


          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Driver ID */}

            <div>

              <label
                htmlFor="driverId"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-slate-300
                "
              >
                Driver ID
              </label>

              <input
                id="driverId"
                type="text"
                value={driverId}
                onChange={(e) =>
                  setDriverId(e.target.value)
                }
                placeholder="Enter your Driver ID"
                autoComplete="username"
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-slate-900/70
                  px-4
                  py-3
                  text-sm
                  text-white
                  placeholder:text-slate-500
                  outline-none
                  transition
                  focus:border-blue-500/70
                  focus:ring-2
                  focus:ring-blue-500/20
                "
              />

            </div>


            {/* Password */}

            <div>

              <label
                htmlFor="password"
                className="
                  mb-2
                  block
                  text-sm
                  font-medium
                  text-slate-300
                "
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-slate-900/70
                  px-4
                  py-3
                  text-sm
                  text-white
                  placeholder:text-slate-500
                  outline-none
                  transition
                  focus:border-blue-500/70
                  focus:ring-2
                  focus:ring-blue-500/20
                "
              />

            </div>


            {/* Error */}

            {error && (

              <motion.div
                initial={{
                  opacity: 0,
                  y: -5,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                className="
                  rounded-xl
                  border
                  border-red-500/20
                  bg-red-500/10
                  p-3
                  text-sm
                  text-red-300
                "
              >
                {error}
              </motion.div>

            )}


            {/* Login button */}

            <GlowButton
              type="submit"
              disabled={loading}
              className="
                w-full
                py-3
                text-sm
              "
            >
              {loading
                ? "Signing in..."
                : "Sign in to Dashboard"}
            </GlowButton>

          </form>


          {/* Footer */}

          <div className="
            mt-6
            border-t
            border-white/10
            pt-5
            text-center
          ">

            <p className="
              text-xs
              text-slate-500
            ">
              Authorized drivers only
            </p>

          </div>

        </div>


        {/* Bottom text */}

        <p className="
          mt-5
          text-center
          text-xs
          text-slate-500
        ">
          S14 • AI-Optimized Rural Last-Mile Network
        </p>

      </motion.div>

    </div>
  );
}

export default Login;
