import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import svgr from "vite-plugin-svgr";
import { ViteSvgComponentPlugin } from 'auto-svg-component-generator';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), ViteSvgComponentPlugin({
    svgFileDir: 'src/assets/icons',
    outputDir: 'src/components/icons',
    useSvgr: true,
    typescript: true
  })],
})
