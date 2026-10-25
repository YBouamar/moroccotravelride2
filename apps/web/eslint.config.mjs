import nextVitals from 'eslint-config-next/core-web-vitals';
import root from '../../eslint.config.mjs';

// Root config last: its typescript-eslint parser must win over the Next.js parser.
const config = [{ ignores: ['.next/**', 'next-env.d.ts', 'public/**'] }, ...nextVitals, ...root];

export default config;
