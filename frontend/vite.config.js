import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
var apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/api/, '/api'); }
            }
        }
    }
});
