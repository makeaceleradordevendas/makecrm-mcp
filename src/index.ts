import { createRuntime } from './runtime.js';
import { createStartupApp } from './bootstrap.js';

// Entrada Express reconhecida pela Vercel. Configurar Root Directory = raiz do repositório.
// Manter como única entrada detectável (app/index/server na raiz ou em src).
export default createStartupApp(createRuntime);
