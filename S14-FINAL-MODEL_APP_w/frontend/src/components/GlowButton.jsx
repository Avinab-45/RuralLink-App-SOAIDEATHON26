function GlowButton({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative
        w-auto
        rounded-xl
        bg-gradient-to-r
        from-red-600
        via-red-500
        to-blue-700
        px-5
        py-2.5
        font-semibold
        text-white
        shadow-lg
        shadow-red-500/30
        transition-all
        duration-200

        hover:-translate-y-0.5
        hover:scale-[1.02]
        hover:shadow-xl
        hover:shadow-blue-500/40

        active:translate-y-0
        active:scale-[0.98]

        focus:outline-none
        focus:ring-2
        focus:ring-red-400/50

        disabled:cursor-not-allowed
        disabled:opacity-60
        disabled:hover:translate-y-0
        disabled:hover:scale-100
        disabled:hover:shadow-lg

        ${className}
      `}
    >
      {children}
    </button>
  );
}

export default GlowButton;