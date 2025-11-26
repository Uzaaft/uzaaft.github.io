interface Env {
  ASSETS: { fetch: (request: Request | string) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Try to fetch the asset
    const response = await env.ASSETS.fetch(request);

    // If the asset is not found (404), serve the custom 404 page
    if (response.status === 404) {
      const notFoundUrl = new URL("/404.html", url.origin);
      const notFoundResponse = await env.ASSETS.fetch(notFoundUrl);
      
      // If custom 404 page exists, return it with 404 status
      if (notFoundResponse.status === 200) {
        return new Response(notFoundResponse.body, {
          status: 404,
          headers: notFoundResponse.headers,
        });
      }
    }

    return response;
  },
};
