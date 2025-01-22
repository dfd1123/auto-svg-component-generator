require('@babel/register')({
    extensions: ['.ts', '.tsx']
  });
  
const SvgComponentGenerator = require('./svgComponentGenerator.ts').default;

const svgComponentGenerator = new SvgComponentGenerator({
    svgFileDir: 'src/assets/svgs',
    outputDir: 'src/assets/svgs',
    typescript: true,
});

svgComponentGenerator.generate();