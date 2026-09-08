import { createRuntime } from './runtime.js';

// Entrada Express reconhecida pela Vercel. Configurar Root Directory = raiz do repositório.
const runtime = createRuntime();
export default runtime.app;
