import { handleVerify } from "@/lib/handle-verify";

export async function POST(req: Request) {
  return handleVerify(req);
}

export async function GET(req: Request) {
  return handleVerify(req);
}
