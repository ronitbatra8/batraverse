import Skeleton from "./Skeleton";

export default function ProductGridSkeleton({
  light = false,
  count = 24,
}: {
  light?: boolean;
  count?: number;
}) {
  return (
    <div className="mx-auto max-w-[100rem] px-0 py-10 sm:px-5 md:px-10">
      <div className="grid grid-cols-2 gap-px sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="block overflow-hidden rounded-none sm:rounded-2xl">
            <Skeleton
              light={light}
              className="aspect-[4/5] w-full rounded-none sm:aspect-[4/3] sm:rounded-2xl"
            />
            <div className="p-4">
              <Skeleton light={light} className="h-3 w-3/4" />
              <Skeleton light={light} className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}