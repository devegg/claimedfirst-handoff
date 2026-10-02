import { handleCron } from "@/lib/handle-cron";

export const dynamic = "force-dynamic";

// Vercel cron sends GET with Authorization: Bearer $CRON_SECRET.
export async function GET(req: Request) {
  return handleCron(req);
}
