import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { loadMqttTls } from '../lib/mqtt-tls.js';

test('MQTT TLS credentials validate without network access', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'mqtt-tls-test-'));
  try {
    for (const name of ['first', 'second']) {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, name + '.key'), '-out', join(dir, name + '.crt'), '-days', '2', '-subj', '/CN=synthetic-test'], { stdio: 'ignore' });
    }
    const b64 = file => readFileSync(join(dir, file)).toString('base64');
    const env = { KEY_B64: b64('first.key'), CERT_B64: b64('first.crt'), CA_B64: b64('first.crt') };
    await t.test('valid matching credentials preserve PEM bytes', () => {
      assert.deepEqual(loadMqttTls(env).key, readFileSync(join(dir, 'first.key')));
    });
    await t.test('missing value is rejected', () => assert.throws(() => loadMqttTls({ ...env, KEY_B64: '' }), /missing/));
    await t.test('raw PEM, wrapped and malformed Base64 are rejected', () => {
      for (const value of [readFileSync(join(dir, 'first.key'), 'utf8'), env.KEY_B64 + '\n', '!!!!']) {
        assert.throws(() => loadMqttTls({ ...env, KEY_B64: value }), /Base64/);
      }
    });
    await t.test('double encoding is rejected', () => assert.throws(() => loadMqttTls({ ...env, CERT_B64: Buffer.from(env.CERT_B64).toString('base64') }), /invalid PEM/));
    await t.test('mismatched private key is rejected', () => assert.throws(() => loadMqttTls({ ...env, KEY_B64: b64('second.key') }), /do not match/));
    await t.test('invalid CA is rejected', () => assert.throws(() => loadMqttTls({ ...env, CA_B64: Buffer.from('invalid').toString('base64') }), /CA_B64: invalid/));
    await t.test('expired or not yet valid certificates are rejected', () => {
      for (const now of [0, Date.now() + 10 * 86400000]) assert.throws(() => loadMqttTls(env, now), /validity/);
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
