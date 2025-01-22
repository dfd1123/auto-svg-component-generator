const babel = require('@rollup/plugin-babel').default;
const typescript = require('@rollup/plugin-typescript');
const json = require('@rollup/plugin-json');
const terser = require('@rollup/plugin-terser');
const ignore = require('rollup-plugin-ignore');
const resolve = require('@rollup/plugin-node-resolve').nodeResolve; // NodeResolve 함수를 직접 가져옴
const commonjs = require('@rollup/plugin-commonjs');

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const plugins = [
    json(),
    ignore(['fsevents']),
    resolve({
        extensions,
    }),
    commonjs(),
    typescript(),
    babel({
        babelHelpers: 'runtime',
        exclude: 'node_modules/**',
        extensions,
        plugins: [
            '@babel/plugin-transform-runtime'
            ]
    }),
]

if (process.env.NODE_ENV === 'production') {
	plugins.push(terser({
        compress: {
          unused: true,
          dead_code: true,
          conditionals: true,
          pure_funcs: ['console.log', 'console.debug', 'console.warn'],
        },
        mangle: {
          toplevel: true,
        },
        output: {
          comments: false,
        },
    }));
}

module.exports = [{
    external: [/@babel\/runtime/, /fsevents/],
    plugins: plugins,
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: process.env.NODE_ENV !== 'production',
        },
        {
            file: 'dist/index.esm.js',
            format: 'esm',
            sourcemap: process.env.NODE_ENV !== 'production',
        }
    ],
    treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
    },
}];