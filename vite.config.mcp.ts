import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/mcp/server.ts'),
			name: 'mcp-server',
			fileName: 'server',
			formats: ['cjs']
		},
		rollupOptions: {
			external: (id) => {
				// Externalize Node.js built-ins (both 'x' and 'node:x' forms)
				if (id === 'process' || id === 'node:process') return true;
				if (id.startsWith('node:')) return true;
				return ['path', 'fs', 'fs/promises', 'os', 'crypto', 'stream', 'util', 'events', 'buffer', 'child_process', 'url'].includes(id);
			},
			output: {
				entryFileNames: 'server.js'
			}
		},
		outDir: 'out/mcp',
		sourcemap: true,
		minify: false, // Keep readable for debugging
		target: 'node16',
		emptyOutDir: true
	}
});
