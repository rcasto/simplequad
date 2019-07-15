import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

const extensions = [
  '.js',
  '.ts',
];
const name = 'SimpleQuad';

function getFileName(format) {
    return `dist/simplequad.${format}.js`;
}

export default {
  input: './src/index.ts',

  // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en#external-e-external
  external: [],

  plugins: [
    // Allows node_modules resolution
    resolve({ extensions }),

    // Allow bundling cjs modules. Rollup doesn't understand cjs
    commonjs(),

    // Compile TypeScript/JavaScript files
    babel({ extensions, include: ['src/**/*'] }),
  ],
  output: [{
    file: getFileName('cjs'),
    format: 'cjs',
  }, {
    file: getFileName('es'),
    format: 'es',
  }, {
    file: getFileName('iife'),
    format: 'iife',
    name,
    // https://rollupjs.org/guide/en#output-globals-g-globals
    globals: {},
  }],
};