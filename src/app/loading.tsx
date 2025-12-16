export default function Loading() {
  return (
    <div className="flex items-center justify-center p-6 h-screen">
      <div className="animate-spin border-t-2 border-b-2 border-gray-200 h-10 w-10 rounded-full" />
      <p className="ml-4 text-xl font-semibold color-gray-200">Loading...</p>
    </div>
  );
}
