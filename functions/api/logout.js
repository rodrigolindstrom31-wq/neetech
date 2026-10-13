import { cookieHeader } from "../_lib/auth.js";
export async function onRequestPost({ request }) {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": cookieHeader("", request.url.startsWith("https://"), true) } });
}