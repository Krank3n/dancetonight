import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GOOGLE_GENAI_API_KEY || ''),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GOOGLE_GENAI_API_KEY || ''),
            'process.env.VITE_GOOGLE_GENAI_API_KEY': JSON.stringify(env.VITE_GOOGLE_GENAI_API_KEY || env.GEMINI_API_KEY || ''),
            // Add Node.js process polyfill for browser
            'process.env.NODE_ENV': JSON.stringify(mode)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        build: {
            // Ignore build warnings and errors for deployment
            minify: 'terser',
            sourcemap: false,
            // Increase chunk size warning limit
            chunkSizeWarningLimit: 1000,
            rollupOptions: {
                // Ignore warnings during build
                onwarn(warning, warn) {
                    // Ignore specific warnings that are common in React apps
                    if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
                    if (warning.code === 'SOURCEMAP_ERROR') return;
                    if (warning.code === 'INVALID_ANNOTATION') return;
                    if (warning.message.includes('Use of eval')) return;
                    if (warning.message.includes('Circular dependency')) return;

                    // Only show important warnings
                    if (warning.code === 'UNRESOLVED_IMPORT') {
                        console.warn('Warning: ', warning.message);
                    }
                },
                output: {
                    // Split chunks for better caching
                    manualChunks: {
                        'google-genai': ['@google/genai'],
                        'lottie': ['lottie-react', 'lottie-web', '@lottiefiles/lottie-js'],
                        'react-vendor': ['react', 'react-dom']
                    },
                    // Handle chunk loading errors gracefully
                    chunkFileNames: (chunkInfo) => {
                        const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
                        return `js/${facadeModuleId}-[hash].js`;
                    }
                }
            },
            // Continue build even with errors (use with caution)
            emptyOutDir: true,
            target: 'esnext',
            // Optimize dependencies
            commonjsOptions: {
                include: [/node_modules/],
                transformMixedEsModules: true
            }
        },
        // Ignore TypeScript errors during build
        esbuild: {
            logOverride: {
                'this-is-undefined-in-esm': 'silent',
                'equals-negative-zero': 'silent'
            },
            // Drop console logs in production
            drop: mode === 'production' ? ['console', 'debugger'] : []
        },
        // Handle environment-specific settings
        server: {
            // Development server settings
            port: 3000,
            open: true,
            cors: true
        },
        preview: {
            // Preview server settings
            port: 4173,
            cors: true
        },
        // Optimize dependencies
        optimizeDeps: {
            include: [
                'react',
                'react-dom',
                '@google/genai',
                'lottie-react',
                'lottie-web'
            ],
            // Exclude problematic dependencies from optimization
            exclude: ['@lottiefiles/lottie-js']
        },
        // Handle legacy dependencies
        legacy: {
            buildRollupPlugins: true
        }
    };
});