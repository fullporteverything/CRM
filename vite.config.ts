import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

const shim = (p: string) => fileURLToPath(new URL(`./src/shims/${p}`, import.meta.url))

// `--mode artifact` builds one self-contained HTML file for previewing the demo
// as a claude.ai Artifact. React comes from the CDN there, so it is aliased to
// the globals the UMD builds define.
export default defineConfig(({ mode }) => {
  const artifact = mode === 'artifact'
  return {
    esbuild: {
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    },
    resolve: artifact
      ? { alias: { 'react-dom/client': shim('react-dom-client.ts'), react: shim('react.ts') } }
      : {},
    plugins: artifact
      ? [
          viteSingleFile(),
          {
            name: 'react-from-cdn',
            transformIndexHtml: (html: string) =>
              html.replace(
                '<!-- react-cdn -->',
                [
                  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
                  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js',
                ]
                  .map((src) => `<script src="${src}" crossorigin="anonymous"></script>`)
                  .join('\n'),
              ),
          },
        ]
      : [],
    build: { outDir: artifact ? 'dist-artifact' : 'dist' },
  }
})
