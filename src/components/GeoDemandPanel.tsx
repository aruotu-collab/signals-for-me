import type { GeoStats } from "@/lib/demand";

function Tier({
  title,
  rows,
}: {
  title: string;
  rows: { location: string; count: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="mt-2 space-y-1.5">
        {rows.map((g) => (
          <div key={`${title}-${g.location}`} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-300">{g.location}</span>
            <span className="font-medium text-white">{g.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GeoDemandPanel({ geo }: { geo: GeoStats }) {
  const hasData =
    geo.countries.length > 0 ||
    geo.regions.length > 0 ||
    geo.areas.length > 0 ||
    geo.legacy.length > 0;
  if (!hasData) return null;

  return (
    <div className="space-y-4">
      <Tier title="Country" rows={geo.countries} />
      <Tier title="State / region" rows={geo.regions} />
      <Tier title="Town / area" rows={geo.areas} />
      {geo.areas.length === 0 && geo.legacy.length > 0 && (
        <Tier title="Area (estimated)" rows={geo.legacy} />
      )}
    </div>
  );
}
