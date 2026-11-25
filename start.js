import 'dotenv/config';
import { loadMqttTls } from './lib/mqtt-tls.js';

try {
  loadMqttTls();
  console.log('MQTT credentials: format, key match and validity checks passed');
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
await import('./app.js');
