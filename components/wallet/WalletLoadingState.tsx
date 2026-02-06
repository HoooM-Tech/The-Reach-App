'use client';

export function WalletLoadingState() {
  return (
    <div className="min-h-screen bg-[#FFF5F5]">
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
        <div className="h-96 bg-gray-200 rounded-2xl" />
      </main>
    </div>
  );
}
