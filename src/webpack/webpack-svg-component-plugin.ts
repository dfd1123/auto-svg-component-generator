import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import SvgComponentGenerator, { type SvgComponentGeneratorOption } from '../svgComponentGenerator';
import type { Compiler } from 'webpack';

type WebpackPluginOptions = Omit<SvgComponentGeneratorOption, 'type'> & {
  // Types
};

class WebpackSvgComponentPlugin {
  private svgCompGenerator: SvgComponentGenerator;
  private readonly svgFileDir: string;
  private watcher?: FSWatcher;

  constructor({ svgFileDir, outputDir, typescript, useSvgr, title, description }: WebpackPluginOptions) {
    this.svgFileDir = path.join(process.cwd(), svgFileDir);
    this.svgCompGenerator = new SvgComponentGenerator({
      type: 'webpack-react',
      svgFileDir,
      outputDir,
      typescript,
      useSvgr,
      title,
      description
    });

    process.once('SIGINT', () => {
      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }
      process.exit(0);
    });
  }

  async apply(compiler: Compiler) {
    const isDevMode = compiler.options.mode === 'development';
    const isTarget =
      compiler.options.name !== 'edge-server' && Array.isArray(compiler.options.target)
        ? compiler.options.target.includes('web')
        : compiler.options.target === 'web';

    if (isTarget) {
      compiler.hooks.compile.tap('WebpackSvgComponentPlugin', () => {
        if (!isDevMode) {
          void this.svgCompGenerator.generate();
        } else if (!this.watcher) {
          void this.svgCompGenerator.generate();

          // Watcher가 이미 존재하지 않는 경우에만 생성
          this.watcher = chokidar.watch(this.svgFileDir, {
            persistent: true,
            awaitWriteFinish: true
          });

          const watchGenerate = (filePath: string) => {
            if (filePath.endsWith('.svg')) {
              this.svgCompGenerator.generate();
            }
          };

          this.watcher.on('add', watchGenerate);
          this.watcher.on('change', watchGenerate);
          this.watcher.on('unlink', watchGenerate);
        }
      });
    }
  }
}

export default WebpackSvgComponentPlugin;
