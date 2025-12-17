// CDN Configuration and Utilities

import { NextResponse } from "next/server";

export interface CDNConfig {
  provider: "cloudflare" | "cloudfront" | "custom";
  cacheControl?: string;
  edgeCacheTTL?: number;
  browserCacheTTL?: number;
}

// CDN cache headers
export function addCDNHeaders(
  response: NextResponse,
  config: CDNConfig = { provider: "cloudflare" },
): NextResponse {
  const edgeTTL = config.edgeCacheTTL || 3600;
  const browserTTL = config.browserCacheTTL || 300;

  switch (config.provider) {
    case "cloudflare":
      // CloudFlare specific headers
      response.headers.set("CF-Cache-Status", "DYNAMIC");
      response.headers.set("Cache-Control", `public, max-age=${browserTTL}, s-maxage=${edgeTTL}`);
      break;

    case "cloudfront":
      // CloudFront specific headers
      response.headers.set("Cache-Control", `public, max-age=${browserTTL}, s-maxage=${edgeTTL}`);
      response.headers.set("X-Cache", "Miss from cloudfront");
      break;

    default:
      response.headers.set("Cache-Control", `public, max-age=${browserTTL}, s-maxage=${edgeTTL}`);
  }

  // Vary header for CDN
  response.headers.set("Vary", "Accept-Encoding, Accept-Language");

  return response;
}

// Purge CDN cache (call CDN API)
export async function purgeCDNCache(urls: string[]): Promise<void> {
  const provider = process.env.CDN_PROVIDER || "cloudflare";

  switch (provider) {
    case "cloudflare":
      // CloudFlare API call
      if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ZONE_ID) {
        await fetch(
          `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ files: urls }),
          },
        );
      }
      break;

    case "cloudfront":
      // AWS CloudFront API call
      if (process.env.AWS_DISTRIBUTION_ID) {
        // Use AWS SDK to create invalidation
        // const cloudfront = new CloudFrontClient({});
        // await cloudfront.send(new CreateInvalidationCommand({...}));
        console.log("CloudFront invalidation not implemented - use AWS SDK");
      }
      break;
  }
}

// Prefetch resources for CDN
export function addPrefetchHeaders(response: NextResponse, resources: string[]): NextResponse {
  const linkHeader = resources.map((url) => `<${url}>; rel=prefetch`).join(", ");
  response.headers.set("Link", linkHeader);
  return response;
}

// Cache status header
export function addCacheStatusHeader(
  response: NextResponse,
  status: "HIT" | "MISS" | "BYPASS" | "STALE",
): NextResponse {
  response.headers.set("X-Cache-Status", status);
  return response;
}

