export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetPath = url.pathname.replace(/^\/proxy-api/, "") || "/";
  const targetUrl = `http://app.brevo.host:2632${targetPath}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  return fetch(targetUrl, {
    method: context.request.method,
    headers,
    body: context.request.method !== "GET" && context.request.method !== "HEAD"
      ? context.request.body
      : undefined,
    redirect: "follow"
  });
}
