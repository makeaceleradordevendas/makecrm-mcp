import express from 'express';
import { createRuntime } from './runtime.js';
import { createStartupApp } from './bootstrap.js';

// Entrada Express reconhecida pela Vercel. Configurar Root Directory = raiz do repositório.
// O detector da Vercel exige import direto do framework nesta entrada.
const app = express();
app.disable('x-powered-by');
app.use(createStartupApp(createRuntime));
export default app;
