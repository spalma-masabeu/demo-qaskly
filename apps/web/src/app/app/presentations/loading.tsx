export default function PresentationsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded bg-gray-100" />
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-primary-light" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="aspect-video animate-pulse bg-gray-100" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="flex gap-2">
                <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
                <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
