import { useEffect, useState } from 'react';
import * as _appContext from '@builder.io/app-context';
import type { ApplicationContext } from '@builder.io/app-context';
import styles from './PluginSettingAlert.module.scss';

const appState = (_appContext as unknown as { default: ApplicationContext })
  .default;

export const PLUGIN_ID = 'plugin-setting-alert';
const SETTING_NAME = 'savedValue';

// Redact for display/logging — same spirit as `AppStateInspector`'s
// masking of apiKey/authHeaders/tokens. Never log these raw.
function mask(value: unknown): string {
  if (typeof value !== 'string' || !value) return String(value);
  return value.length <= 4 ? '••••' : `${value.slice(0, 4)}${'•'.repeat(6)}`;
}

function maskHeaders(headers: unknown): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};
  return Object.fromEntries(
    Object.entries(headers as Record<string, string>).map(([key, value]) => [
      key,
      mask(value),
    ]),
  );
}

/**
 * Left-sidebar app tab. Registered via `Builder.register('appTab', ...)`.
 * On mount, reads this plugin's own setting (saved via Space Settings →
 * Plugins → Edit Plugin Settings) and alerts it.
 */
export function PluginSettingAlert() {
  const [value, setValue] = useState<string | undefined>(undefined);
  const [baselineRequest, setBaselineRequest] = useState<Record<string, unknown> | null>(null);
  const [ssoRequest, setSsoRequest] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // `organization` isn't part of the shipped `ApplicationContext` stub
    // type (see CLAUDE.md) but exists on the real runtime object.
    const user = appState?.user as any;
    const pluginSettings = user?.organization?.value?.settings?.plugins?.get(PLUGIN_ID);
    const savedValue = pluginSettings?.get(SETTING_NAME);
    setValue(savedValue);
    window.alert(
      savedValue
        ? `Saved value: ${savedValue}`
        : 'No value saved yet — set one in Space Settings → Plugins → Edit Plugin Settings.',
    );

    // Mocks only — no network calls are made. Two ways a plugin could
    // authenticate itself to a proxy you control, so the proxy — not the
    // browser — is what ends up holding any real privileged secret.
    // See the "Security notes" section in this folder's README.md.

    // Baseline (weaker): forward Builder's own session credentials.
    // There's no documented Builder endpoint your proxy can call to verify
    // these server-side, so treat this as a plausibility check at best —
    // not real authentication.
    const baseline = {
      url: 'https://your-proxy.example.com/api/privileged-call',
      method: 'POST',
      headers: {
        ...maskHeaders(user?.authHeaders),
        'x-builder-api-key': mask(user?.apiKey),
      },
      body: { savedValue },
    };

    // Recommended when your org's Builder login is SSO-backed: rather than
    // forwarding anything from Builder's own session (baseline above),
    // have the plugin present a token your backend can independently
    // verify against your org's existing identity provider — the same
    // trust already established for SSO. The exact mechanics depend on
    // your IdP/protocol (OIDC vs. SAML) and are worth working out with
    // whoever owns that integration; see the README for the tradeoff this
    // is solving, without prescribing a specific implementation here.
    const sso = {
      url: 'https://your-proxy.example.com/api/privileged-call',
      method: 'POST',
      headers: {
        Authorization: 'Bearer <token verifiable by your backend against your SSO identity provider>',
      },
      body: { savedValue },
    };

    setBaselineRequest(baseline);
    setSsoRequest(sso);
    console.log('Mock baseline request to proxy (values redacted):', baseline);
    console.log('Mock SSO-verified request to proxy:', sso);
  }, []);

  return (
    <div className={styles.page}>
      <h1>Plugin Setting Alert</h1>
      <p>
        Saved value: <strong>{value ?? '(none)'}</strong>
      </p>

      <h2>Mock proxy requests</h2>
      <p>No network calls are made below — this only illustrates request shape.</p>

      <h3>Baseline: forwarding Builder session credentials</h3>
      <p>
        Forwards <code>appState.user.apiKey</code> and{' '}
        <code>appState.user.authHeaders</code>. Unverifiable server-side —
        treat as a weak sanity check, not authentication.
      </p>
      <pre className={styles.mockRequest}>
        {JSON.stringify(baselineRequest, null, 2)}
      </pre>

      <h3>Recommended: a token verifiable against your SSO identity provider</h3>
      <p>
        If your org's Builder login is SSO-backed, this is the most secure
        option — the proxy can cryptographically verify the token against
        your identity provider rather than trusting forwarded headers. Exact
        mechanics depend on your IdP/protocol; see the README.
      </p>
      <pre className={styles.mockRequest}>
        {JSON.stringify(ssoRequest, null, 2)}
      </pre>
    </div>
  );
}
