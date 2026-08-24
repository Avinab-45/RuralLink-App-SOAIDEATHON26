function NetworkStatus() {
  const isOnline = true

  return (
    <div
      className={`px-4 py-2 text-sm font-medium ${
        isOnline
          ? 'bg-green-100 text-green-700'
          : 'bg-red-100 text-red-700'
      }`}
    >
      {isOnline ? '🟢 Online' : '🔴 Offline'}
    </div>
  )
}

export default NetworkStatus