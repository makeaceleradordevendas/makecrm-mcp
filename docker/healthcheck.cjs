const http = require('node:http');

// Verifica o processo, preservando a validação de Host da aplicação.
// A conectividade Redis é verificada separadamente pelo Traefik em /readyz.
try {
  const req = http.get({
    hostname: '127.0.0.1', port: Number(process.env.PORT || 3000), path: '/healthz',
    headers: { host: new URL(process.env.PUBLIC_URL).host }, timeout: 3000,
  }, res => {
    res.resume();
    res.on('end', () => process.exit(res.statusCode === 200 ? 0 : 1));
    res.on('error', () => process.exit(1));
  });
  req.on('timeout', () => req.destroy());
  req.on('error', () => process.exit(1));
} catch {
  process.exit(1);
}
