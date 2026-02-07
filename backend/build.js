import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
    try {
        console.log('Building backend bundle...');

        await esbuild.build({
            entryPoints: [path.join(__dirname, 'server.js')],
            bundle: true,
            platform: 'node',
            target: 'node20',
            format: 'cjs',
            outfile: path.join(__dirname, 'dist', 'server.bundle.js'),
            external: [], // Bundle everything
            minify: false, // Keep readable for debugging
            sourcemap: true,
            logLevel: 'info'
        });

        console.log('✅ Backend bundle created successfully!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
