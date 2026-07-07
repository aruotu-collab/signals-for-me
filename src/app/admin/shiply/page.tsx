import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { AdminNav } from "@/components/AdminNav";
import { ShiplyImportForm } from "./ShiplyImportForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shiply Import", robots: { index: false, follow: false } };

export default async function AdminShiplyImportPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/login?callbackUrl=/admin/shiply");
  if (!isAdminEmail(email)) notFound();

  return (
    <div>
      <AdminNav email={email} />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Shiply import</h1>
        <p className="text-sm text-slate-400">
          Upload your `shiply_all_routes_driver_planner.xlsx` file. We import the `Jobs Detail` sheet and rebuild the
          swipe matrix index.
        </p>
      </div>
      <ShiplyImportForm />
    </div>
  );
}

