// Run the real TS/TSX modules with node:test on Node 18+, without a second test framework.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function createLoader(mocks = {}) {
  const cache = new Map();
  function load(filename) {
    filename = path.resolve(root, filename);
    if (Object.hasOwn(mocks, filename)) return mocks[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = createRequire(filename);
    const requireModule = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('.') || id.startsWith('@/')) {
        const base = id.startsWith('@/') ? path.join(root, id.slice(2)) : path.resolve(path.dirname(filename), id);
        const resolved = [base, `${base}.ts`, `${base}.tsx`].find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
        if (resolved?.match(/\.tsx?$/)) return load(resolved);
      }
      return localRequire(id);
    };
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename })(requireModule, module, module.exports);
    return module.exports;
  }
  return load;
}

module.exports = { createLoader, root };
