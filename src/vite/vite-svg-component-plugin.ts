import chokidar, { FSWatcher } from 'chokidar';
import SvgComponentGenerator, { type SvgComponentGeneratorOption } from '../svgComponentGenerator';

type VitePluginOptions = Omit<SvgComponentGeneratorOption, 'type'> & {
  // Types
};

let watcher: FSWatcher | null = null; // 전역 또는 모듈 수준의 변수로 watcher를 관리
const fileRegex = /\.svg$/;

const ViteSvgComponentPlugin = ({
  svgFileDir,
  outputDir,
  typescript,
  useSvgr,
  title,
  description
}: VitePluginOptions) => ({
  name: 'vite-svg-component-plugin',
  buildStart() {
    const svgCompGenerator = new SvgComponentGenerator({
      type: 'vite-react',
      svgFileDir,
      outputDir,
      typescript,
      useSvgr,
      title,
      description
    });

    if (process.env.NODE_ENV !== 'production') {
      if (!watcher) {
        // Watcher가 이미 존재하지 않는 경우에만 생성
        watcher = chokidar.watch(svgFileDir, { persistent: true, ignored: /\/svg\/types\// });

        watcher.on('add', svgCompGenerator.generate);
        watcher.on('unlink', svgCompGenerator.generate);
      }
    } else {
      void svgCompGenerator.generate();
    }
  },
  buildEnd() {
    if (watcher) {
      // 빌드가 끝나면 watcher를 닫기
      watcher.close();
      watcher = null; // Watcher 참조를 제거
    }
  }
});

// SIGINT 이벤트 리스너를 전역으로 한 번만 등록
process.once('SIGINT', () => {
  if (watcher) {
    watcher.close();
  }

  process.exit(0);
});

export { ViteSvgComponentPlugin };
