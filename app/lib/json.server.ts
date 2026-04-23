const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
}

export function optionsResponse() {
  return new Response(null, { status: 204, headers: cors });
}
