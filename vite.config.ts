import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/extension.ts'),
			name: 'extension',
			fileName: 'extension',
			formats: ['cjs']
		},
		rollupOptions: {
			external: [
				'vscode',
				// External Node.js built-ins (extension runs in Node); include node: prefix so dynamic import('node:net') is not stubbed
				'path',
				'fs',
				'net',
				'node:net',
				'os',
				'node:os',
				'crypto',
				'node:crypto',
				'stream',
				'util',
				'events',
				'buffer',
				'child_process'
			],
			output: {
				entryFileNames: 'extension.js'
			}
		},
		outDir: 'dist',
		sourcemap: true,
		minify: false, // Keep readable for debugging
		target: 'node16',
		emptyOutDir: true
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src')
		}
	}
});
