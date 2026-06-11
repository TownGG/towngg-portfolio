const CORS_ALLOWLIST = new Set([
  "https://towngg.com",
  "https://www.towngg.com",
  "https://towngg.github.io",
]);

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const CACHE_SECONDS = 300;

const corsHeaders = (origin) => {
  const allowedOrigin = CORS_ALLOWLIST.has(origin) ? origin : "https://towngg.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
    "Content-Type": "application/json; charset=utf-8",
  };
};

const safeError = (origin) => new Response(JSON.stringify({ error: "Telemetry temporarily unavailable." }), {
  status: 502,
  headers: corsHeaders(origin),
});

const toIsoDate = (date) => date.toISOString().slice(0, 10);

const analyticsQuery = `
query SiteTelemetry($zoneTag: string!, $since: DateTime!, $until: DateTime!, $dateStart: Date!, $dateEnd: Date!) {
  viewer {
    zones(filter: { zoneTag: $zoneTag }) {
      summary: httpRequests1hGroups(
        limit: 10000
        filter: { datetime_geq: $since, datetime_lt: $until }
      ) {
        sum {
          visits
          requests
          bytes
          cachedRequests
        }
      }
      trend: httpRequests1dGroups(
        limit: 7
        filter: { date_geq: $dateStart, date_leq: $dateEnd }
        orderBy: [date_ASC]
      ) {
        dimensions {
          date
        }
        sum {
          visits
          requests
        }
      }
    }
  }
}`;

const buildPublicPayload = (data) => {
  const zone = data?.data?.viewer?.zones?.[0];
  if (!zone) throw new Error("Missing zone analytics");

  const summaryTotals = (zone.summary || []).reduce((acc, group) => {
    const sum = group.sum || {};
    acc.visits += Number(sum.visits || 0);
    acc.requests += Number(sum.requests || 0);
    acc.bandwidthBytes += Number(sum.bytes || 0);
    acc.cachedRequests += Number(sum.cachedRequests || 0);
    return acc;
  }, { visits: 0, requests: 0, bandwidthBytes: 0, cachedRequests: 0 });

  const cacheHitRate = summaryTotals.requests > 0
    ? (summaryTotals.cachedRequests / summaryTotals.requests) * 100
    : 0;

  return {
    period: "Last 24 hours",
    updatedAt: new Date().toISOString(),
    summary: {
      visits: summaryTotals.visits,
      requests: summaryTotals.requests,
      bandwidthBytes: summaryTotals.bandwidthBytes,
      cacheHitRate: Number(cacheHitRate.toFixed(2)),
    },
    trend: (zone.trend || []).map((group) => ({
      date: group.dimensions?.date,
      visits: Number(group.sum?.visits || 0),
      requests: Number(group.sum?.requests || 0),
    })).filter((item) => item.date),
    note: "No individual visitor data, IP addresses, logs or security events are displayed.",
  };
};

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed." }), {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== "/site-telemetry") {
      return new Response(JSON.stringify({ error: "Not found." }), {
        status: 404,
        headers: corsHeaders(origin),
      });
    }

    try {
      if (!env.CF_API_TOKEN || !env.CF_ZONE_ID) throw new Error("Missing Worker configuration");

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const until = new Date();
      const since = new Date(until.getTime() - 24 * 60 * 60 * 1000);
      const dateEnd = toIsoDate(until);
      const dateStart = toIsoDate(new Date(until.getTime() - 6 * 24 * 60 * 60 * 1000));

      const response = await fetch(GRAPHQL_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CF_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: analyticsQuery,
          variables: {
            zoneTag: env.CF_ZONE_ID,
            since: since.toISOString(),
            until: until.toISOString(),
            dateStart,
            dateEnd,
          },
        }),
      });

      if (!response.ok) throw new Error("Cloudflare analytics request failed");
      const graph = await response.json();
      if (graph.errors) throw new Error("Cloudflare analytics response error");

      const publicPayload = buildPublicPayload(graph);
      const publicResponse = new Response(JSON.stringify(publicPayload), {
        status: 200,
        headers: corsHeaders(origin),
      });

      ctx.waitUntil(cache.put(cacheKey, publicResponse.clone()));
      return publicResponse;
    } catch (error) {
      return safeError(origin);
    }
  },
};
