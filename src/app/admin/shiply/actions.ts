"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/admin/requireAdmin";
import { importShiplyJobsFromXlsx, refreshShiplyJobsFromXlsx } from "@/lib/shiply";

export async function importShiplyXlsx(formData: FormData) {
  const gate = await requireAdminAction();
  if ("error" in gate) return gate;

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Please upload a spreadsheet file." };
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { error: "File must be a .xlsx, .xls or .csv spreadsheet." };
  }

  const fullRefresh = formData.get("fullRefresh") === "on";
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = fullRefresh
      ? await refreshShiplyJobsFromXlsx(buf, { filename: file.name })
      : await importShiplyJobsFromXlsx(buf, { filename: file.name });
    revalidatePath("/");
    revalidatePath("/matrix");
    revalidatePath("/admin");
    revalidatePath("/admin/shiply");
    revalidatePath("/admin/jobs");
    return { ok: true, fullRefresh, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed." };
  }
}

