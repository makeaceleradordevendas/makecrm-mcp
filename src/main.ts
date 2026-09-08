import { createRuntime } from './runtime.js';

const { app, config, redis } = createRuntime();
const http = app.listen(config.PORT, config.HOST, () => {
  console.info(JSON.stringify({ event: 'server_started', port: config.PORT }));
});
http.requestTimeout = 15000;
http.headersTimeout = 10000;
http.keepAliveTimeout = 5000;
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => { http.closeAllConnections(); process.exit(1); }, 15000).unref();
  http.close(() => {
    if (redis.isOpen) redis.destroy();
    clearTimeout(deadline);
    process.exitCode = 0;
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
