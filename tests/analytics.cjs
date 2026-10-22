'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const original = fs.readFileSync(path.join(__dirname, '../dist/analytics.js'), 'utf8');

function run({account = 'upb-test-fixture', host = 'https://guihpontes13.github.io',
  pathname = '/explorador-upb/', visibility = 'visible', prerendering = false,
  nav = {}, hash = '', frame = false, reject = false} = {}) {
  const requests = [], listeners = new Map();
  const document = {
    visibilityState: visibility, prerendering,
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: event => listeners.delete(event)
  };
  Object.defineProperty(document, 'title', {get() {throw Error('Do not read user-visible titles');}});
  const window = {
    location: {origin: host, pathname, hash},
    fetch: (url, opts) => {
      requests.push({url, opts});
      return reject ? Promise.reject(Error('blocked')) : Promise.resolve({});
    }
  };
  Object.defineProperty(window.location, 'search', {get() {throw Error('Do not read URL queries');}});
  window.self = window;
  window.top = frame ? {} : window;
  vm.runInNewContext(original.replace("const ACCOUNT_CODE = '';", "const ACCOUNT_CODE = " + JSON.stringify(account) + ";"),
    {window, document, navigator: nav, URLSearchParams, Date});
  return {requests, show() {
    document.visibilityState = 'visible'; document.prerendering = false;
    for (const fn of [...listeners.values()]) fn();
  }};
}

assert.equal(run({account: ''}).requests.length, 0, 'inactive config must make no requests');
for (const account of ['../invalid', 'bad.example', 'https://bad', '-bad', 'bad-'])
  assert.equal(run({account}).requests.length, 0);
assert.equal(run({host: 'http://localhost:8080'}).requests.length, 0);
assert.equal(run({host: 'https://fork.example'}).requests.length, 0);
assert.equal(run({pathname: '/another-site/'}).requests.length, 0);
assert.equal(run({frame: true}).requests.length, 0);
assert.equal(run({nav: {webdriver: true}}).requests.length, 0);
assert.equal(run({nav: {doNotTrack: '1'}}).requests.length, 0);
assert.equal(run({nav: {globalPrivacyControl: true}}).requests.length, 0);
assert.equal(run({hash: '#sem-estatisticas'}).requests.length, 0);
for (const options of [{visibility: 'hidden'}, {prerendering: true}]) {
  const x = run(options);
  assert.equal(x.requests.length, 0);
  x.show(); x.show();
  assert.equal(x.requests.length, 1, 'foreground transitions must not duplicate visits');
}
const x = run();
assert.equal(x.requests.length, 1);
const {url, opts} = x.requests[0];
const u = new URL(url);
assert.equal(u.origin, 'https://upb-test-fixture.goatcounter.com');
assert.equal(u.pathname, '/count');
assert.deepEqual([...u.searchParams.keys()], ['p', 't', 'r', 'rnd']);
assert.equal(u.searchParams.get('p'), '/explorador-upb/');
assert.equal(u.searchParams.get('t'), 'Explorador U–Pb');
assert.equal(u.searchParams.get('r'), '');
assert.equal(opts.credentials, 'omit');
assert.equal(opts.referrerPolicy, 'no-referrer');
assert.equal(opts.redirect, 'error');
assert.equal(run({pathname: '/explorador-upb/index.html'}).requests.length, 1);
assert.doesNotThrow(() => run({reject: true}));
const html = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
assert.equal((html.match(/src="analytics.js"/g) || []).length, 1);
console.log('Analytics: inactive config, destination, fixed payload, credential/referrer omission, visibility, opt-outs and failure isolation passed. No requests sent to a real service.');
