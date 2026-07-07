"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { importShiplyJobsFromXlsx } from "@/lib/shiply";

export async function importShiplyXlsx(formData: FormData) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) return { error: "Unauthorized." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Please upload an .xlsx file." };
  if (!file.name.toLowerCase().endsWith(".xlsx")) return { error: "File must be an .xlsx spreadsheet." };

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = await importShiplyJobsFromXlsx(buf);
    revalidatePath("/");
    revalidatePath("/matrix");
    return { ok: true, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed." };
  }
}

