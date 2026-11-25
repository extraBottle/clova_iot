import { createPrivateKey, X509Certificate } from 'node:crypto';

function decode(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || !value.length) throw new Error(`${name}: missing`);
  if (value.length % 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(`${name}: expected single-line Base64 of the complete PEM file`);
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.toString('base64') !== value) throw new Error(`${name}: invalid Base64`);
  return bytes;
}

export function loadMqttTls(env = process.env, now = Date.now()) {
  const key = decode(env, 'KEY_B64');
  const cert = decode(env, 'CERT_B64');
  const ca = decode(env, 'CA_B64');
  let privateKey, certificate, root;
  try { privateKey = createPrivateKey(key); } catch { throw new Error('KEY_B64: invalid or encrypted PEM private key'); }
  try { certificate = new X509Certificate(cert); } catch { throw new Error('CERT_B64: invalid PEM certificate'); }
  try { root = new X509Certificate(ca); } catch { throw new Error('CA_B64: invalid PEM certificate'); }
  if (!certificate.checkPrivateKey(privateKey)) throw new Error('MQTT certificate and private key do not match');
  for (const [name, item] of [['CERT_B64', certificate], ['CA_B64', root]]) {
    if (now < Date.parse(item.validFrom) || now >= Date.parse(item.validTo)) throw new Error(`${name}: certificate outside validity period`);
  }
  return { key, cert, ca };
}
