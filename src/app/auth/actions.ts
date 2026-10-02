"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Ends the session and returns to the home page. Used as a form action, so it works without client JS. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
