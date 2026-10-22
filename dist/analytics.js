/* SPDX-License-Identifier: GPL-3.0-or-later
 * Optional pageview counter. Set ACCOUNT_CODE only after the owner has created
 * a GoatCounter account and confirmed its dashboard is private.
 * Public site code only: never put a password or API token here.
 * Protocol: https://www.goatcounter.com/help/pixel
 */
(function () {
  'use strict';

  const ACCOUNT_CODE = '';
  const SITE_ORIGIN = 'https://guihpontes13.github.io';
  const SITE_PATH = '/explorador-upb/';
  const PAGE_TITLE = 'Explorador U–Pb';

  // No configured account means no network requests or third-party code.
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(ACCOUNT_CODE)) return;
  if (window.location.origin !== SITE_ORIGIN) return;
  if (![SITE_PATH, SITE_PATH + 'index.html'].includes(window.location.pathname)) return;
  if (window.top !== window.self || navigator.webdriver) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' ||
      navigator.globalPrivacyControl === true) return;
  if (window.location.hash === '#sem-estatisticas') return;
  if (typeof window.fetch !== 'function') return;

  let sent = false;
  function countOnceVisible() {
    if (sent || document.visibilityState !== 'visible' || document.prerendering) return;
    sent = true;
    document.removeEventListener('visibilitychange', countOnceVisible);
    document.removeEventListener('prerenderingchange', countOnceVisible);

    // Fixed values only: never read document.title, query parameters, referrers,
    // file inputs, chart data, sample names, or application state.
    const params = new URLSearchParams({
      p: SITE_PATH,
      t: PAGE_TITLE,
      r: '',
      rnd: String(Date.now())
    });
    try {
      void window.fetch('https://' + ACCOUNT_CODE + '.goatcounter.com/count?' + params, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        redirect: 'error',
        keepalive: true
      }).catch(function () { /* Counting must not affect the explorer. */ });
    } catch (_) { /* Fetch may be blocked by browser settings. */ }
  }

  document.addEventListener('visibilitychange', countOnceVisible);
  document.addEventListener('prerenderingchange', countOnceVisible);
  countOnceVisible();
}());
