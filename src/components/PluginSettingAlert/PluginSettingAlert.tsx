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
  const [mockRequest, setMockRequest] = useState<Record<string, unknown> | null>(null);

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

    // Mock only — no network call is made. Illustrates forwarding
    // Builder's existing session credentials (apiKey / authHeaders) to a
    // proxy you control, which would validate them against Builder's own
    // API before using a real secret server-side. See CLAUDE.md discussion
    // on why a plugin should never hold a privileged secret in the browser.
    const request = {
      url: 'https://your-proxy.example.com/api/privileged-call',
      method: 'POST',
      headers: {
        ...maskHeaders(user?.authHeaders),
        'x-builder-api-key': mask(user?.apiKey),
      },
      body: { savedValue },
    };
    setMockRequest(request);
    console.log('Mock authenticated request to proxy (values redacted):', request);
  }, []);

  return (
    <div className={styles.page}>
      <h1>Plugin Setting Alert</h1>
      <p>
        Saved value: <strong>{value ?? '(none)'}</strong>
      </p>
      <h2>Mock proxy request</h2>
      <p>
        Illustrates forwarding <code>appState.user.apiKey</code> and{' '}
        <code>appState.user.authHeaders</code> to a proxy you control. No
        network call is made; values below are redacted.
      </p>
      <pre className={styles.mockRequest}>
        {JSON.stringify(mockRequest, null, 2)}
      </pre>
    </div>
  );
}
