# AutoSvgComponentGenerator

`AutoSvgComponentGenerator` is a generator that automatically converts `.svg` files into React components. `AutoSvgComponentGenerator` automatically generates `index.tsx` or `index.jsx` in React component format when `.svg` files are added, moved, modified or deleted.

<br /><br />

## Installation
```sh
// use npm
npm install --save-dev auto-svg-component-generator

// use yarn
yarn add --D auto-svg-component-generator
```

<br /><br />

## Naming Convention
SVG components are generated based on the svg file name, and the naming convention for generating SVG components is as follows:

```
ico-react.svg => SvgIcoReact
```
<br /><br />

## Auto-generated Types
`SvgComponentGenerator` automatically generates not only components but also useful types whenever `.svg` files are added, moved, deleted, or modified.

1. Type generation for file names
```ts
export type StaticSvgIconName = 'ico-close' | 'ico-search' | 'next' | 'react' | 'vercel';
```

2. Type generation for SVG component names
```ts
export type SvgComponentName = 'SvgIcoClose' | 'SvgIcoSearch' | 'SvgNext' | 'SvgReact' | 'SvgVercel';
```
<br /><br />

## Usage

### webpack (nextjs, cra)

`next.config.js`

```js
const { WebpackSvgComponentPlugin } = require('auto-svg-component-generator');

/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config) => {
    const fileLoaderRule = config.module.rules.find(rule => rule.test && rule.test.test('.svg'));
    fileLoaderRule.exclude = /\.svg$/;

    // svgr configuration
    config.module.rules.push({
      loader: '@svgr/webpack',
      options: {
        prettier: false,
        svgo: true,
        svgoConfig: {
          plugins: [
            {
              name: 'removeViewBox',
              active: false
            }
          ]
        },
        titleProp: true
      },
      test: /\.svg$/
    });

    config.plugins.push(new WebpackSvgComponentPlugin({
      svgFileDir: './public/svgs',
      useSvgr: true // Please set it to true when using svgr.
    }))

    return config;
  }
};
```

### vite 

`vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { viteSvgComponentPlugin } from 'auto-svg-component-generator'

export default defineConfig({
  plugins: [
    react(), 
    viteSvgComponentPlugin({
      svgFileDir: 'src/assets/svgs', 
      typescript: true
    })],
})
```
<br/><br/>

## `AutoSvgComponentGenerator` Options

| Option         | Type                   | Default        | Description                                                                                                                                                                                                  |
|----------------|------------------------|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| svgFileDir     | `string` | - (Required)   | Directory path where project's `.svg` files are stored    |
| outputDir      | `string` | `svgFileDir`   | Output directory path where converted components will be stored. Default is `svgFileDir` |
| typescript     | `boolean` | `false`        | Sets whether to use TypeScript. If `true`, generates `index.tsx` file and `types/index.d.ts`. If `false`, generates `index.jsx`                                               |
| useSvgr        | `boolean` | `false`        | Sets whether to use `svgr`. If `true`, generates components using `svgr`. If `false`, doesn't use `svgr`                                                                 |
| title          | `boolean` | `false`        | Sets whether to show the `title` tag of `svg` files. If `true`, shows the `title` tag. If `false`, doesn't show the `title` tag (ignored when `useSvgr: true`)                                                                 |
| description    | `boolean` | `false`        | Sets whether to show the `desc` tag of `svg` files. If `true`, shows the `desc` tag. If `false`, doesn't show the `desc` tag (ignored when `useSvgr: true`)                                                                 |
| svgo           | `Omit<SvgConfig, 'path'>` | `undefined`        | Sets `svgo` options when `useSvgr` is `false` (ignored when `useSvgr: true`)       |
<br />

```ts 
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { viteSvgComponentPlugin } from 'auto-svg-component-generator'

export default defineConfig({
  plugins: [
    react(), 
    viteSvgComponentPlugin({
      svgFileDir: 'src/assets/svgs',
      title: true,
      description: true,
      svgo: {
        plugins: [
            { 
                name: 'removeViewBox', 
                active: false 
            }
        ]
      }
    })],
})
```

<br />

## Cautions!

- For `vite`, version `4.0.0` or higher is required.
- For `next.js`, you must use `webpack` in `next.config.js`. (`turbopack` is not supported.)
- When using the `useSvgr` option, you must install `svgr` and apply it to webpack before use.
- It is recommended to use it with `svgr`. (`svgr` is relatively stable.)
- When `useSvgr` is `true`, the `svgo`, `title`, and `description` options are ignored.
