import Link from "next/link";

import { DemandCard } from "@/components/DemandCard";

import { DEMAND_CATEGORIES, categoryLabel, countDemandIdeas, getDemandIdeas } from "@/lib/demand";



export const dynamic = "force-dynamic";



const PAGE_SIZE = 24;



export default async function IdeasPage({

  searchParams,

}: {

  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;

}) {

  const params = await searchParams;

  const sort = (params.sort as "trending" | "score" | "new") || "score";

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const offset = (page - 1) * PAGE_SIZE;



  const [ideas, total] = await Promise.all([

    getDemandIdeas({

      category: params.category,

      sort,

      limit: PAGE_SIZE,

      offset,

    }),

    countDemandIdeas(params.category),

  ]);



  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (p: number) => {

    const sp = new URLSearchParams();

    if (params.category) sp.set("category", params.category);

    if (sort !== "score") sp.set("sort", sort);

    if (p > 1) sp.set("page", String(p));

    const s = sp.toString();

    return s ? `?${s}` : "";

  };



  return (

    <div className="space-y-8">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <span className="chip border border-white/10 bg-white/5 text-slate-300">Customer Demand</span>

          <h1 className="mt-3 text-3xl font-bold text-white">Vote for what you want</h1>

          <p className="mt-2 max-w-xl text-slate-400">

            Real problems people wish someone would solve. Pick a category, read the pain point, and vote — your

            demand helps businesses know what to build.

          </p>

        </div>

        <Link href="/submit" className="btn-primary shrink-0 px-5 py-2.5">

          Submit an idea

        </Link>

      </div>



      {/* Category + sort */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <form className="flex flex-wrap items-center gap-2" action="/ideas" method="get">

          <label className="text-sm text-slate-400">Category</label>

          <select

            name="category"

            defaultValue={params.category ?? ""}

            className="rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white"

          >

            <option value="">All categories ({total.toLocaleString()} ideas)</option>

            {DEMAND_CATEGORIES.map((c) => (

              <option key={c.key} value={c.key}>

                {c.icon} {c.label}

              </option>

            ))}

          </select>

          <input type="hidden" name="sort" value={sort} />

          <button type="submit" className="btn-ghost px-3 py-2 text-sm">

            Filter

          </button>

        </form>



        <div className="flex gap-2 text-sm">

          {(

            [

              ["score", "Highest demand"],

              ["trending", "Trending"],

              ["new", "Newest"],

            ] as const

          ).map(([key, label]) => (

            <Link

              key={key}

              href={`/ideas?${new URLSearchParams({

                ...(params.category ? { category: params.category } : {}),

                ...(key !== "score" ? { sort: key } : {}),

              }).toString()}`}

              className={`rounded-lg px-3 py-1.5 ${sort === key ? "bg-brand-500/20 text-brand-200" : "text-slate-400 hover:bg-white/5"}`}

            >

              {label}

            </Link>

          ))}

        </div>

      </div>



      {params.category && (

        <p className="text-sm text-slate-500">

          Browsing <span className="text-slate-300">{categoryLabel(params.category)}</span> · {total} ideas

        </p>

      )}



      {ideas.length === 0 ? (

        <div className="card p-12 text-center">

          <p className="text-slate-400">No ideas yet in this category.</p>

          <Link href="/submit" className="btn-primary mt-4 inline-flex px-5 py-2">

            Be the first to submit

          </Link>

        </div>

      ) : (

        <>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            {ideas.map((idea) => (

              <DemandCard

                key={idea.id}

                id={idea.id}

                title={idea.title}

                description={idea.description}

                category={idea.category}

                location={idea.location}

                stats={idea.stats}

              />

            ))}

          </div>



          {totalPages > 1 && (

            <div className="flex items-center justify-center gap-3 text-sm">

              {page > 1 ? (

                <Link href={`/ideas${qs(page - 1)}`} className="btn-ghost px-4 py-2">

                  ← Previous

                </Link>

              ) : null}

              <span className="text-slate-500">

                Page {page} of {totalPages}

              </span>

              {page < totalPages ? (

                <Link href={`/ideas${qs(page + 1)}`} className="btn-ghost px-4 py-2">

                  Next →

                </Link>

              ) : null}

            </div>

          )}

        </>

      )}

    </div>

  );

}


