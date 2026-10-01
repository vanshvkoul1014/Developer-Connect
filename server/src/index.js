import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app.js';

// Resolve from this module so npm workspace commands find the root .env too.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
const app = createApp({
  staticPath: process.env.NODE_ENV === 'production' ? fileURLToPath(new URL('../../client/dist/', import.meta.url)) : undefined,
  trustProxy: process.env.DYNO ? 1 : false
});
const port = Number(process.env.PORT) || 5000;
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env');
await mongoose.connect(process.env.MONGODB_URI);
const server = app.listen(port, '0.0.0.0', () => console.log(`App listening on port ${port}`));
let closing = false;
const shutdown = () => {
  if (closing) return;
  closing = true;
  server.close(async () => { await mongoose.disconnect(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
