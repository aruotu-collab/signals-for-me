import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { AdminNav } from "@/components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await requireAdminSession("/admin");

  return (
    <div>
      <AdminNav email={email} />
      {children}
    </div>
  );
}
