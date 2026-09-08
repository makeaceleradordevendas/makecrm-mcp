import express, { type Express } from 'express';
import { ZodError } from 'zod';

type StartupEvent = { event: 'startup_failed'; invalid_fields?: string[] };

// A configuração continua obrigatória. Uma falha impede todas as operações,
// mas permite responder HTTP e registrar o diagnóstico sem expor credenciais.
export function createStartupApp(
  initialize: () => { app: Express },
  report: (event: StartupEvent) => void = event => console.error(JSON.stringify(event)),
) {
  try {
    return initialize().app;
  } catch (error) {
    report({ event: 'startup_failed', ...(error instanceof ZodError ? {
      invalid_fields: [...new Set(error.issues.map(issue => String(issue.path[0])))],
    } : {}) });
    const app = express();
    app.disable('x-powered-by');
    app.use((_req, res) => {
      res.set({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.status(503).json({ error: 'startup_failed',
        message: 'Servidor indisponível. Verifique as variáveis de ambiente e os Runtime Logs na Vercel.' });
    });
    return app;
  }
}
