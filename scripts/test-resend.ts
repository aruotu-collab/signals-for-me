import { readFileSync } from "fs";

function getKey() {
  return (
    process.env.RESEND_API_KEY ||
    readFileSync(".env", "utf8").match(/RESEND_API_KEY="([^"]+)"/)?.[1]
  );
}

async function send(from: string, to: string) {
  const key = getKey();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: "SignalsForMe test", html: "<p>test</p>", text: "test" }),
  });
  console.log(`from=${from} to=${to}`);
  console.log("Status:", res.status, await res.text());
  console.log("");
}

async function main() {
  await send("Signals For Me <onboarding@resend.dev>", "aruotu@gmail.com");
  await send("Signals For Me <signals@signalsforme.com>", "aruovicaffiliates@gmail.com");
}

main();
