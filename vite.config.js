import { defineConfig } from 'vite';
import { createReadStream, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

// The app is built on HTML Imports (polyfilled by webcomponentsjs v1) and Gluon 0.0.x,
// which Vite cannot bundle. The element sources in `src/` are served and copied as-is
// (publicDir), and the runtime dependencies are exposed under `/vendor/` from node_modules.
const require = createRequire(import.meta.url);
const pkgDir = name => path.dirname(require.resolve(`${name}/package.json`));

const VENDOR = {
  webcomponentsjs: { dir: pkgDir('@webcomponents/webcomponentsjs'), files: /^webcomponents-[\w-]+\.js(\.map)?$/ },
  gluonjs: { dir: pkgDir('gluonjs'), files: /^gluon\.html$/ }
};

const CONTENT_TYPES = { '.js': 'text/javascript', '.map': 'application/json', '.html': 'text/html' };

const vendorFiles = function*() {
  for (const [name, { dir, files }] of Object.entries(VENDOR)) {
    for (const file of readdirSync(dir)) {
      if (files.test(file) && statSync(path.join(dir, file)).isFile()) {
        yield { url: `vendor/${name}/${file}`, file: path.join(dir, file) };
      }
    }
  }
};

const vendor = () => ({
  name: 'cryptodex-vendor',
  configureServer(server) {
    const map = new Map([...vendorFiles()].map(({ url, file }) => [`/${url}`, file]));
    server.middlewares.use((req, res, next) => {
      const file = map.get(req.url.split('?')[0]);
      if (!file) return next();
      res.setHeader('Content-Type', CONTENT_TYPES[path.extname(file)] || 'application/octet-stream');
      createReadStream(file).pipe(res);
    });
  },
  generateBundle() {
    for (const { url, file } of vendorFiles()) {
      this.emitFile({ type: 'asset', fileName: url, source: readFileSync(file) });
    }
  }
});

export default defineConfig({
  publicDir: 'src',
  plugins: [vendor()]
});
