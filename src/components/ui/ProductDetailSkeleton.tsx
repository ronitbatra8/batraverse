import Skeleton from "./Skeleton";

export default function ProductDetailSkeleton({ light = false }: { light?: boolean }) {
  return (
    <div className="min-h-screen pb-20">
      <div className="mx-auto max-w-[100rem] px-5 pt-6 sm:px-10">
        <div className="flex items-center gap-2">
          <Skeleton light={light} className="h-2.5 w-12" />
          <Skeleton light={light} className="h-2.5 w-3 rounded-none" />
          <Skeleton light={light} className="h-2.5 w-20" />
          <Skeleton light={light} className="h-2.5 w-3 rounded-none" />
          <Skeleton light={light} className="h-2.5 w-36" />
        </div>
      </div>

      <div className="mx-auto mt-8 grid max-w-[100rem] gap-8 px-5 sm:px-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-3">
          <Skeleton light={light} className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} light={light} className="aspect-square flex-1 rounded-xl" />
            ))}
          </div>
          <Skeleton light={light} className="h-20 w-full rounded-2xl" />
        </div>

        <div className="flex flex-col">
          <Skeleton light={light} className="h-3 w-32" />
          <Skeleton light={light} className="mt-3 h-9 w-3/4" />
          <Skeleton light={light} className="mt-4 h-3 w-40" />
          <div className={`my-5 h-px ${light ? "bg-dark-200/60" : "bg-white/10"}`} />
          <Skeleton light={light} className="h-3 w-full" />
          <Skeleton light={light} className="mt-2 h-3 w-11/12" />
          <Skeleton light={light} className="mt-2 h-3 w-4/6" />
          <Skeleton light={light} className="mt-6 h-3 w-24" />
          <div className="mt-3 flex gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} light={light} className="h-8 w-8 rounded-full" />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} light={light} className="h-10 w-16 rounded-xl" />
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Skeleton light={light} className="h-12 flex-1 rounded-xl" />
            <Skeleton light={light} className="h-12 flex-1 rounded-xl" />
            <Skeleton light={light} className="h-12 w-16 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}