import { createRuntime } from './runtime.js';
import { createStartupApp } from './bootstrap.js';

// Entrada Express reconhecida pela Vercel. Configurar Root Directory = raiz do repositório.
export default createStartupApp(createRuntime);
