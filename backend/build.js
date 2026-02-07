import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function build() {
    try {
        console.log('Building backend bundle...');

        // Clean dist folder first
        const distPath = path.join(__dirname, 'dist');
        if (fs.existsSync(distPath)) {
            fs.removeSync(distPath);
            console.log('Cleaned dist folder');
        }
        fs.ensureDirSync(distPath);

        // Packages that might have bundling issues - mark as external
        const externalPackages = [
            'body-parser',
            'iconv-lite',
            'raw-body'
        ];

        await esbuild.build({
            entryPoints: [path.join(__dirname, 'server.js')],
            bundle: true,
            platform: 'node',
            target: 'node20',
            format: 'cjs',
            outfile: path.join(__dirname, 'dist', 'server.bundle.js'),
            external: externalPackages,
            minify: false,
            sourcemap: true,
            logLevel: 'info'
        });

        console.log('✅ Backend bundle created!');
        console.log('📦 Copying external dependencies...');

        // Copy external packages to dist/node_modules
        const distNodeModules = path.join(__dirname, 'dist', 'node_modules');
        fs.ensureDirSync(distNodeModules);

        for (const pkg of externalPackages) {
            const srcPath = path.join(__dirname, 'node_modules', pkg);
            const destPath = path.join(distNodeModules, pkg);

            if (fs.existsSync(srcPath)) {
                fs.copySync(srcPath, destPath);
                console.log(`  ✓ Copied ${pkg}`);
            }
        }

        console.log('✅ Build complete!');
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

build();
