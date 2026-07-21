export default function JoinLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-subtle p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 space-y-2 text-center">
          <div className="mx-auto h-7 w-28 animate-pulse rounded bg-primary-light" />
          <div className="mx-auto h-4 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-primary-light" />
          <div className="mx-auto mt-5 h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-gray-100" />
          <div className="mx-auto mt-6 h-5 w-5 animate-pulse rounded-full bg-primary-light" />
        </div>
      </div>
    </div>
  );
}
