import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      
      // ========================================
      // BUNDLE OPTIMIZATION
      // ========================================
      build: {
        // Target modern browsers for smaller bundles
        target: 'es2020',
        
        // Enable minification
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: true,
            pure_funcs: mode === 'production' ? ['console.log', 'console.debug'] : []
          }
        },
        
        // Chunk size warning threshold
        chunkSizeWarningLimit: 500,
        
        // Code splitting configuration
        rollupOptions: {
          output: {
            // Manual chunk splitting for optimal caching
            manualChunks: {
              // Vendor chunk - core React
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              
              // Firebase chunk - all Firebase modules
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/storage', 'firebase/data-connect'],
              
              // UI Libraries chunk
              'vendor-ui': ['lucide-react', 'qrcode.react'],
              
              // Charts chunk - only loaded when needed
              'vendor-charts': ['recharts']
            },
            
            // Optimize chunk file names
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId || '';
              if (facadeModuleId.includes('node_modules')) {
                return 'assets/vendor/[name]-[hash].js';
              }
              return 'assets/[name]-[hash].js';
            },
            
            // Optimize asset file names
            assetFileNames: (assetInfo) => {
              const name = assetInfo.name || '';
              if (/\.(gif|jpe?g|png|svg|webp)$/.test(name)) {
                return 'assets/images/[name]-[hash][extname]';
              }
              if (/\.css$/.test(name)) {
                return 'assets/css/[name]-[hash][extname]';
              }
              if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
                return 'assets/fonts/[name]-[hash][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
            
            // Entry file names
            entryFileNames: 'assets/[name]-[hash].js'
          },
          
          // Tree-shaking optimization
          treeshake: {
            moduleSideEffects: 'no-external',
            propertyReadSideEffects: false
          }
        },
        
        // Generate source maps for error tracking (hidden in production)
        sourcemap: mode === 'production' ? 'hidden' : true,
        
        // CSS optimization
        cssCodeSplit: true,
        cssMinify: true,
        
        // Report compressed size
        reportCompressedSize: true
      },
      
      // ========================================
      // DEPENDENCY OPTIMIZATION
      // ========================================
      optimizeDeps: {
        // Pre-bundle these dependencies
        include: [
          'react',
          'react-dom',
          'react-router-dom',
          'lucide-react'
        ],
        
        // Exclude large optional deps from pre-bundling
        exclude: ['recharts']
      },
      
      // ========================================
      // PREVIEW SERVER (for testing production builds)
      // ========================================
      preview: {
        port: 3001,
        host: '0.0.0.0'
      }
    };
});
