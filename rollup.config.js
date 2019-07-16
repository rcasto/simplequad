import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import { uglify } from "rollup-plugin-uglify";

const extensions = [
  '.js',
  '.ts',
];
const name = 'SimpleQuad';
const plugins = [
  // Allows node_modules resolution
  resolve({ extensions }),
  // Allow bundling cjs modules. Rollup doesn't understand cjs
  commonjs(),
  // Compile TypeScript/JavaScript files
  babel({ extensions, include: ['src/**/*'] }),
];
const outputs = [];

// Need to add minifier plugin if called with minify flag
if (shouldMinify(process.argv)) {
    plugins.push(uglify());
    outputs.push({
      file: getFileName('umd.min'),
      format: 'umd',
      name,
      exports: 'named',
    });
} else {
  outputs.push({
    file: getFileName('umd'),
    format: 'umd',
    name,
  });
  outputs.push({
    file: getFileName('esm'),
    format: 'esm',
  });
}

function shouldMinify(args) {
    return (args || []).indexOf('--minify') > -1;
}

function getFileName(format = '') {
    return `dist/simplequad.${format}.js`;
}

export default {
  input: './src/index.ts',
  // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en#external-e-external
  external: [],
  plugins,
  output: outputs,
};