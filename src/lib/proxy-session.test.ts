/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { expect, test } from "vitest";
import { handleProxy } from "./proxy-session";

type Cookie = { name: string; value: string; options?: any };
const mkFactory = (opts: { refresh?: Cookie[]; throws?: boolean; calls?: string[] }) => (cfg: { getAll: () => { name: string; value: string }[]; setAll: (l: Cookie[]) => void }) =>
  ({
    auth: {
      getUser: async () => {
        opts.calls?.push("getUser");
        if (opts.throws) throw new Error("auth down");
        if (opts.refresh) cfg.setAll(opts.refresh);
        return { data: { user: null }, error: null };
      },
    },
  }) as any;
const req = (url = "http://localhost/roster", cookie = "sb-x-auth-token=old") => new NextRequest(url, { headers: { cookie } });

test("a refreshed session is written to the response and the request", async () => {
  const request = req();
  const res = await handleProxy(request, { createClient: mkFactory({ refresh: [{ name: "sb-x-auth-token", value: "new", options: { path: "/" } }] }) });
  expect(res.cookies.get("sb-x-auth-token")?.value).toBe("new");
  expect(request.cookies.get("sb-x-auth-token")?.value).toBe("new");
});
test("an unauthenticated request passes through and the user is verified with getUser", async () => {
  const calls: string[] = [];
  const res = await handleProxy(req("http://localhost/", ""), { createClient: mkFactory({ calls }) });
  expect(res.status).toBe(200);
  expect(calls).toEqual(["getUser"]);
});
test("the ref cookie is set from ?ref= and an invalid ref is ignored", async () => {
  const ok = await handleProxy(req("http://localhost/?ref=abcd1234"), { createClient: mkFactory({}) });
  expect(ok.cookies.get("cf_ref")?.value ?? ok.cookies.get("ref")?.value).toBe("abcd1234");
  const bad = await handleProxy(req("http://localhost/?ref=%3Cscript%3E"), { createClient: mkFactory({}) });
  expect(bad.cookies.getAll().some((c) => c.value.includes("script"))).toBe(false);
});
test("a refreshed session and the ref cookie coexist", async () => {
  const res = await handleProxy(req("http://localhost/?ref=abcd1234"), { createClient: mkFactory({ refresh: [{ name: "sb-x-auth-token", value: "new" }] }) });
  expect(res.cookies.get("sb-x-auth-token")?.value).toBe("new");
  expect(res.cookies.getAll().length).toBe(2);
});
test("a thrown auth error does not break the request", async () => {
  const res = await handleProxy(req(), { createClient: mkFactory({ throws: true }) });
  expect(res.status).toBe(200);
});
test("a throwing client factory does not break the request", async () => {
  const res = await handleProxy(req(), { createClient: () => { throw new Error("no env"); } });
  expect(res.status).toBe(200);
});
