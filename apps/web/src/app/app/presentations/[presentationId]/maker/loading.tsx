export default function MakerLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex h-14 items-center gap-3 border-b border-gray-200 px-4">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-4 w-64 max-w-[45vw] animate-pulse rounded bg-gray-200" />
        <div className="ml-auto h-8 w-28 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-8 w-24 animate-pulse rounded-lg bg-primary-light" />
      </div>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        <aside className="hidden w-[20%] border-r border-gray-200 p-3 md:block">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="aspect-video animate-pulse rounded-lg bg-gray-100"
              />
            ))}
          </div>
        </aside>
        <section className="hidden flex-1 items-center justify-center bg-gray-50 p-8 md:flex">
          <div className="aspect-video w-full max-w-3xl animate-pulse rounded-xl bg-white shadow-sm" />
        </section>
        <aside className="flex-1 border-l border-gray-200 p-5 md:w-[25%] md:flex-none">
          <div className="space-y-5">
            <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-32 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </aside>
      </div>
    </div>
  );
}
