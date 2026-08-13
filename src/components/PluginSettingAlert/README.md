# Plugin Setting Alert

A minimal reference implementation showing how a Builder.io plugin can:

1. Expose its own configuration field in Builder's admin UI (**Space Settings → Plugins**)
2. Add a custom icon + page to Builder's left admin sidebar
3. Read the saved configuration value back out at runtime from the browser

It's intentionally small — the goal is to demonstrate the mechanism cleanly, not to ship a finished feature.

## What it does

- Adds a **Setting Alert** entry to Space Settings → Plugins, with one field: **Saved Value**.
- Adds a new icon to Builder's left admin sidebar. Clicking it opens a page that reads the saved value back out and shows it in a browser `alert()`.
- Also demonstrates (as mocks — no network calls are made) two ways a plugin could authenticate itself to a backend proxy for calling privileged third-party APIs safely: forwarding Builder's own session credentials (weaker), and a token verifiable against the org's SSO identity provider (recommended). See **Security notes** below.

## How it's wired up

Two Builder registration calls, in [`src/plugins/plugin-setting-alert.tsx`](../../plugins/plugin-setting-alert.tsx):

```tsx
// Gives the plugin a settings form in Space Settings → Plugins
Builder.register('plugin', {
  id: PLUGIN_ID,
  name: 'Plugin Setting Alert',
  settings: [{ name: 'savedValue', type: 'string', helperText: '...' }],
  ctaText: 'Save Changes',
});

// Adds the icon + page to the left admin sidebar
Builder.register('appTab', {
  name: 'Setting Alert',
  path: 'plugin-setting-alert',
  icon: ICON,
  component: PluginSettingAlert,
});
```

The component ([`PluginSettingAlert.tsx`](./PluginSettingAlert.tsx)) reads the saved value from `appState.user.organization.value.settings.plugins.get(PLUGIN_ID)` — the same store Builder's settings form writes to.

## Setting it up in Builder.io

1. Build/serve the plugin (see the repo root [README](../../../README.md) for `npm run dev` / `npm run build`).
2. In Builder.io, go to **Space Settings → Plugins → Edit → Add Plugin**, and enter the plugin URL **with a `pluginId` query param appended** — this is required for the settings button to appear:
   - Dev: `http://localhost:1268/plugin-setting-alert.system.js?pluginId=plugin-setting-alert`
   - Prod: `https://your-cdn.com/plugin-setting-alert.system.[hash].js?pluginId=plugin-setting-alert`
3. Save, then reload the Builder.io app.
4. Back in **Space Settings → Plugins**, click **Edit Plugin Settings** next to the new entry, enter a value in **Saved Value**, and click **Save Changes**.
5. Look for the new icon in the left admin sidebar. Clicking it alerts the saved value.

## Security notes

This is a **reference pattern**, not a hardened secrets solution. Worth calling out explicitly, since the settings field here is stored in plain client-visible org settings:

- **`type: 'password'` (used on similar fields elsewhere in this repo) only masks the input box** — it does not encrypt storage. Any value saved this way is readable by anyone with access to that value in the browser (devtools, any other plugin loaded in the same admin session, general org-settings payloads).
- **There's no isolation between plugins in the browser.** Every plugin bundle Builder loads runs in the same page, sharing the same `appState`. A value saved by one plugin's settings form is technically readable by any other plugin's code running in that session.
- **If a value needs real confidentiality** (a third-party API key with write/billing/elevated privileges, or any call that returns PII), don't store or use it directly in browser-side plugin code at all. Route the actual privileged call through a backend you control, and authenticate the plugin → proxy leg with one of the two options below.

### Recommended: a token verifiable against your SSO identity provider — most secure option

If the org's Builder login is already SSO-backed, the strongest option is to have the plugin present a token that your backend can independently verify against that *same* identity provider — piggybacking on trust that already exists, rather than trying to forward or re-verify anything from Builder's own session.

The exact mechanics depend on the IdP and protocol involved (OIDC and SAML solve this differently, and this customer specifically uses SAML), and are best worked out with whoever owns that identity/SSO integration on the customer's side — they'll know the IdP's actual capabilities and constraints better than we can guess from here. At a high level, the shape to aim for:
- The plugin obtains some proof of the admin's identity from the org's existing IdP, ideally without an extra visible login step (the admin is already authenticated there).
- That proof is sent to your proxy, which verifies it against something cryptographic (a published key, a certificate, etc.) — not just trusted at face value.
- Only after that verification does your proxy touch the real secret and make the privileged call.

This is the one family of options here with genuine verification behind it, rather than a plausibility check. Nothing about it comes from Builder — `appState.user` only exposes Builder's own derived session credentials (`id`, `apiKey`, `authHeaders`), never the original SSO token/assertion the admin used to log into Builder in the first place. Builder's backend consumes that during login and doesn't hand it back to the browser, so this has to be an independent check against the IdP, not something borrowed from Builder's session.

### Baseline (weaker): forwarding Builder's own session credentials

The mock request built in `PluginSettingAlert.tsx` also shows the simpler, weaker alternative: forwarding `appState.user.apiKey` and `appState.user.authHeaders` to your proxy.
- `apiKey` is the org's **public** API key — Builder's own docs say it's fine to expose publicly, so verifying it (e.g. against the real Content API at `https://cdn.builder.io/api/v3/content/{model}?apiKey=...`) only proves the string is *a* valid key, not that this specific request is legitimate.
- `authHeaders` are described by Builder as "pre-built auth headers for authenticated requests," but there's no documented Builder endpoint your proxy can call to verify them server-side — treat this as a plausibility check at best, not real authentication.

Use the SSO option above whenever it's available; fall back to this only when it isn't.

- Only your proxy — never the browser — should hold the real privileged secret, regardless of which option above authenticates the request to it.
- Builder also has a dedicated **Private Keys** feature (`appState.globalState.getPluginPrivateKey(pluginId)`), which is better administered (org-admin-gated, not bundled into general settings) but still hands the raw value to browser JS once called — so it doesn't remove the need for a proxy if the key must never touch the browser.
- If the privileged call returns PII, apply the same "least privilege" thinking to the *response*: have the proxy return only the fields the UI actually needs rather than passing through the full upstream record, log who accessed what at the proxy (not the plugin) for audit purposes, and don't log fetched PII to the browser console or persist it into Builder content/settings.

## Files

```
src/components/PluginSettingAlert/
  PluginSettingAlert.tsx          # Sidebar-tab component: reads the saved setting, alerts it,
                                   # and renders two mock (no-network) authenticated-proxy requests
                                   # (session-credential forwarding vs. SSO-verifiable token)
  PluginSettingAlert.module.scss
  index.ts
src/plugins/
  plugin-setting-alert.tsx        # Builder.register('plugin', ...) + Builder.register('appTab', ...)
```
