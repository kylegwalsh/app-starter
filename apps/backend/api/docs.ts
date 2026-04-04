import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { ZodToJsonSchemaConverter } from '@orpc/zod';
import { config } from '@repo/config';

/**
 * The HTML for the login page served at /api/login for Swagger authentication.
 * This allows users to login, which saves the session cookie in the browser so that they
 * can invoke protected endpoints.
 */
export const internalDocsLoginHTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>API Login</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fafafa; }
    form { background: #fff; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,.1); width: 320px; }
    h2 { margin: 0 0 1rem; font-size: 1.25rem; }
    label { display: block; margin-bottom: .25rem; font-size: .875rem; font-weight: 500; }
    input { width: 100%; padding: .5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; padding: .5rem; background: #111; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-size: .875rem; }
    button:hover { background: #333; }
    .error { color: #dc2626; font-size: .8rem; display: none; margin-bottom: .5rem; }
  </style>
</head>
<body>
  <form id="login">
    <h2>API Login</h2>
    <p class="error" id="error"></p>
    <label for="email">Email</label>
    <input type="email" id="email" name="email" required />
    <label for="password">Password</label>
    <input type="password" id="password" name="password" required />
    <button type="submit">Sign in</button>
  </form>
  <script>
    document.getElementById('login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('error');
      err.style.display = 'none';
      try {
        const res = await fetch('/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
          }),
        });
        if (!res.ok) throw new Error('Invalid credentials');
        window.location.href = '/api';
      } catch (ex) {
        err.textContent = ex.message;
        err.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

/**
 * Custom head content injected into the Swagger UI page.
 * It adds a custom login button redirecting to our login page.
 */
const internalDocsHead = `
<style>
  /* Reduce top spacing in the info section */
  .information-container { padding: 10px 0; }
  .information-container .info { margin: 10px 0; }

  /* Style the login button to match the native Authorize button */
  .scheme-container .auth-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    background: transparent;
    color: #49cc90;
    border: 2px solid #49cc90;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    font-family: sans-serif;
    white-space: nowrap;
    cursor: pointer;
    line-height: 1;
  }
  .scheme-container .auth-btn:hover { background: rgba(73, 204, 144, 0.1); }

  /* Hide the native Authorize button since ours replaces it */
  .scheme-container .auth-wrapper { display: none; }

  .scheme-container section.schemes { display: flex; align-items: center; }
  .scheme-container section.schemes > :first-child { flex: 1; }
</style>
<script>
  // Inject an Authenticate button into the scheme-container (where Authorize normally sits)
  // Swagger UI renders async, so we poll until the target element exists
  const interval = setInterval(() => {
    const target = document.querySelector('.scheme-container section.schemes');
    if (!target) return;
    clearInterval(interval);
    const btn = document.createElement('a');
    btn.href = '/api/login';
    btn.className = 'auth-btn';
    btn.innerHTML = 'Authenticate <svg width="15" height="17" viewBox="0 0 20 20" fill="#49cc90"><use href="#locked" xlink:href="#locked"></use></svg>';
    target.appendChild(btn);
  }, 100);
</script>`;

/** OpenAPI reference plugin configured with Swagger UI, auth button, and spec options */
export const internalDocsPlugin = new OpenAPIReferencePlugin({
  docsProvider: 'swagger',
  schemaConverters: [new ZodToJsonSchemaConverter()],
  docsHead: internalDocsHead,
  specGenerateOptions: {
    info: {
      title: config.app.name,
      version: '1.0.0',
      description: 'Sign in to authenticate your session before using protected endpoints.',
    },
    servers: [{ url: `${config.api.url}/api` }],
  },
});
