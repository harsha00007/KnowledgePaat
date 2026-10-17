// Execute repository TypeScript scripts with the installed TypeScript compiler.
// No package installation, emitted files, or test database mutations.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const original = Module._resolveFilename;
Module._resolveFilename = function(request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  return original.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = function(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  module._compile(result.outputText, filename);
};
require.extensions['.tsx'] = require.extensions['.ts'];
if (require.main === module) require(path.resolve(process.argv[2]));
