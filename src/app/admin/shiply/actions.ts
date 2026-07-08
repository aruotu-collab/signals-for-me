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
  if (!(file instanceof File)) return { error: "Please upload a spreadsheet file." };
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return { error: "File must be a .xlsx, .xls or .csv spreadsheet." };
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    const result = await importShiplyJobsFromXlsx(buf, { filename: file.name });
    revalidatePath("/");
    revalidatePath("/matrix");
    return { ok: true, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Import failed." };
  }
}

