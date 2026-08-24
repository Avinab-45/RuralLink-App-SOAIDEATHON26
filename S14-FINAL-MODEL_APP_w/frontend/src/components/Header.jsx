import { motion } from "framer-motion";

function Header({
  isOnline,
  syncStatus,
  driverName,
  onLogout,
}) {
  const getStatusStyle = () => {
    switch (syncStatus) {
      case "Offline":
        return {
          wrapper:
            "border-red-200 bg-red-50 text-red-700",
          dot: "bg-red-500",
        };

      case "Saved Offline":
        return {
          wrapper:
            "border-orange-200 bg-orange-50 text-orange-700",
          dot: "bg-orange-500",
        };

      case "Syncing":
        return {
          wrapper:
            "border-blue-200 bg-blue-50 text-blue-700",
          dot: "bg-blue-500",
        };

      case "Synced":
        return {
          wrapper:
            "border-green-200 bg-green-50 text-green-700",
          dot: "bg-green-500",
        };

      default:
        return {
          wrapper:
            "border-green-200 bg-green-50 text-green-700",
          dot: "bg-green-500",
        };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <header className="
      sticky
      top-0
      z-[1000]
      border-b
      border-slate-200
      bg-white/90
      shadow-sm
      backdrop-blur-xl
    ">

      <div className="
        mx-auto
        flex
        max-w-6xl
        items-center
        justify-between
        gap-4
        px-4
        py-3
        sm:px-6
      ">

        {/* Driver information */}

        <div className="
          flex
          min-w-0
          items-center
          gap-3
        ">

          <div className="relative shrink-0">

            <div className="
              flex
              h-11
              w-11
              items-center
              justify-center
              overflow-hidden
              rounded-full
              border-2
              border-white
              bg-gradient-to-br
              from-blue-500
              to-emerald-500
              text-lg
              shadow-md
            ">

              <img
                src="/driver.png"
                alt="Driver"
                className="
                  h-full
                  w-full
                  object-cover
                "
                onError={(e) => {
                  e.currentTarget.style.display =
                    "none";
                }}
              />

            </div>

            {/* Online indicator */}

            <span
              className={`
                absolute
                bottom-0
                right-0
                h-3
                w-3
                rounded-full
                border-2
                border-white
                ${
                  isOnline
                    ? "bg-green-500"
                    : "bg-red-500"
                }
              `}
            />

          </div>


          <div className="min-w-0">

            <h1 className="
              truncate
              text-sm
              font-bold
              text-slate-900
              sm:text-base
            ">
              RuralLink Driver
            </h1>

            <p className="
              truncate
              text-xs
              text-slate-500
            ">
              Welcome, {driverName || "Driver"}
            </p>

          </div>

        </div>


        {/* Right controls */}

        <div className="
          flex
          shrink-0
          items-center
          gap-2
          sm:gap-3
        ">

          {/* Connection status */}

          <motion.div
            animate={
              syncStatus === "Syncing"
                ? { opacity: [0.6, 1, 0.6] }
                : { opacity: 1 }
            }
            transition={{
              duration: 1.2,
              repeat:
                syncStatus === "Syncing"
                  ? Infinity
                  : 0,
            }}
            className={`
              flex
              items-center
              gap-2
              rounded-full
              border
              px-3
              py-1.5
              text-xs
              font-semibold
              ${statusStyle.wrapper}
            `}
          >

            <span
              className={`
                h-2
                w-2
                rounded-full
                ${statusStyle.dot}
              `}
            />

            <span className="hidden sm:inline">
              {syncStatus}
            </span>

            <span className="sm:hidden">
              {isOnline ? "Online" : "Offline"}
            </span>

          </motion.div>


          {/* Logout */}

          <button
            type="button"
            onClick={onLogout}
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              py-2
              text-xs
              font-semibold
              text-slate-700
              shadow-sm
              transition
              hover:border-red-200
              hover:bg-red-50
              hover:text-red-600
              sm:px-4
              sm:text-sm
            "
          >
            Logout
          </button>

        </div>

      </div>

    </header>
  );
}

export default Header;
