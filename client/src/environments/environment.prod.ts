/**
 * Production. The browser calls the API directly rather than through a host
 * redirect: Netlify's proxy times out at 26 seconds, which a cold start on a
 * free-tier backend can exceed.
 */
export const environment = {
  apiBase: 'https://recovery-prevention-app.onrender.com',
};
