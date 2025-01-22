import path from 'path';
import { remove, existsSync, promises } from 'fs-extra';
import _debounce from 'lodash/debounce';
import _startCase from 'lodash/startCase';
import { SVG_ATTRIBUTE_KEYS } from './svgConst';
import { type Config as SvgConfig } from 'svgo';
import { optimize } from 'svgo';
import _camelCase from 'lodash/camelCase';

const { readdir, readFile, writeFile, mkdir } = promises;

type BaseSvgComponentGeneratorOption = {
  type?: 'webpack-react' | 'webpack-vue' | 'vite-react' | 'vite-vue' | 'turbopack-react';
  svgFileDir: string;
  outputDir?: string;
  typescript?: boolean;
  title?: boolean;
  description?: boolean;
  svgo?: Omit<SvgConfig, 'path'>;
}

type UseSvgrSvgComponentGeneratorOption = BaseSvgComponentGeneratorOption & {
  useSvgr: true;
  svgo?: never;
  title?: never;
  description?: never;
}

type SvgoSvgComponentGeneratorOption = BaseSvgComponentGeneratorOption & {
  useSvgr?: false;
  svgo: Omit<SvgConfig, 'path'>;
  title?: boolean;
  description?: boolean;
}

export type SvgComponentGeneratorOption = UseSvgrSvgComponentGeneratorOption | SvgoSvgComponentGeneratorOption;

/**
 * SvgComponentGenerator 클래스는 SVG 파일들을 React 컴포넌트로 변환합니다.
 * 이 클래스는 SVG 파일들이 저장된 디렉토리를 읽고, 각 SVG 파일을 React 컴포넌트로 변환하여
 * 지정된 출력 디렉토리에 저장합니다. TypeScript를 지원하며, 필요에 따라 SVGR을 사용할 수 있습니다.
 */
class SvgComponentGenerator {
  /**
   * 프레임워크 타입
   */
  private readonly type: 'webpack-react' | 'webpack-vue' | 'vite-react' | 'vite-vue' | 'turbopack-react';
  /**
   * SVG 파일들이 위치한 디렉토리 경로
   */
  private readonly svgFileDir: string;
  /**
   * TypeScript를 사용할지 여부
   */
  private readonly typescript: boolean;
  /**
   * 변환된 컴포넌트들이 저장될 출력 디렉토리 경로
   */
  private readonly outputDir: string;
  /**
   * SVGR을 사용할지 여부
   */
	private readonly useSvgr: boolean;
  /**
   * SVG Title 태그를 노출할지 여부
   */
  private readonly title: boolean;
  /**
   * SVG Desc 태그를 노출할지 여부
   */
  private readonly description: boolean;
  /**
	 * SVGO 옵션
	 */
	private readonly svgo?: Omit<SvgConfig, 'path'>;

  /**
   * SvgComponentGenerator 클래스의 생성자입니다.
   * @param {SvgComponentGeneratorOption} SVG 컴포넌트 생성 옵션 객체
   */
  constructor({
    type,
    svgFileDir,
    outputDir,
    typescript = false,
    title,
    description,
    useSvgr,
    svgo
  }: SvgComponentGeneratorOption) {
    this.type = type;
    this.svgFileDir = svgFileDir;
    this.outputDir = outputDir ?? svgFileDir;
    this.typescript = typescript;
    this.useSvgr = useSvgr;
    this.title = title;
    this.description = description;
    this.svgo = svgo ?? {};
  }

  /**
   * SVG 파일 리스트를 파싱하여 타입 정의를 생성합니다.
   * @param {string[]} list SVG 파일 이름 리스트
   * @returns 타입 정의 문자열
   */
  parseSvgListForType(list: string[]) {
    const fileList = list.map((file) => `${file.replace('.svg', '')}`);

    const staticSvgIconName = fileList.map((item) => `'${item}'`).join(' | ') || `''`;
    const svgComponentName =
      fileList
        .map(
          (item) =>
            `'${`Svg${_startCase(item.replace(/\//gi, '-').replace('.svg', '')).replace(/ /gi, '')}'`}`
        )
        .join(' | ') || `''`;
    const particalSvgObj = fileList
      .filter((item) => item.includes('/'))
      .reduce<Record<string, string>>((acc, cur) => {
        const arr = cur.split('/');
        const fileName = arr.pop() || '';

        const directoryPascalName = _startCase(arr.join('-')).replace(/ /gi, '');

        return {
          ...acc,
          [directoryPascalName]: acc[directoryPascalName]
            ? `${acc[directoryPascalName]} | '${fileName}'`
            : `'${fileName}'`
        };
      }, {});

    const particalSvgIconName = Object.entries(particalSvgObj)
      .map(([key, value]) => `export type ${key}IconType = ${value};\n`)
      .join('');

    return { staticSvgIconName, particalSvgIconName, svgComponentName };
  }

  /**
   * SVG 파일 리스트를 파싱하여 파일 객체를 생성하고 React 컴포넌트 문자열을 생성합니다.
   * @param {string[]} list SVG 파일 이름 리스트
   * @param {boolean} useSvgr SVGR을 사용할지 여부
   * @returns React 컴포넌트 문자열과 관련 정보
   */
  async parseSvgListForFile(list: string[], useSvgr: boolean) {
    const fileObject = list.reduce<Record<string, string>>((acc, cur) => {
      const fileName = `Svg${_startCase(cur.replace(/\//gi, '-').replace('.svg', '')).replace(/ /gi, '')}`;
      acc = {
        ...acc,
        [fileName]: cur
      };

      return acc;
    }, {});
    const fileList = Object.entries(fileObject);
    const relativePath = path.relative(this.outputDir, this.svgFileDir).replace(/\\/gi, '/');

    let importString = '';

    if (useSvgr) {
      importString = fileList
        .reduce((acc, [key, value]) => {
          if(this.type === 'vite-react') {
            acc += `import ${key} from '${relativePath}/${value}?react';\n`;
          } else {
            acc += `import ${key} from '${relativePath}/${value}';\n`;
          }
          return acc;
        }, '')
        .replace(/\n$/, '');
    } else {
      for (const [key, value] of fileList) {
        const data = await readFile(`${this.svgFileDir}/${value}`, 'utf8');
  
        const result = optimize(data, {
          ...this.svgo,
          plugins: [
            ...(this.svgo?.plugins ?? [])
          ]
        });

        // SVG 태그와 내용만 추출하는 정규식
        const svgRegex = /<svg[^>]*>([\s\S]*?)<\/svg>/;
        const svgMatch = result.data.match(svgRegex);
        
        if (!svgMatch) {
          console.error(`Failed to extract SVG content from ${value}`);
          continue;
        }

        let svgElement = svgMatch[0];
  
        const regex = /(<svg[^>]*)/;
        const replacement = '$1 {...props}';

        svgElement = svgElement.replace(/(\s[a-z]+[-:][a-z]+)(?==)/g, (match, p1) => {
          // P1은 매칭된 전체 문자열입니다.
          // 이제 -나 :을 기준으로 앞뒤 문자를 변환
          const resultAttr = (p1 as string).replace(/([a-z])[-:]([a-z])/g, (_, p1, p2) =>
            // 첫 번째 그룹과 두 번째 그룹을 연결하되, 두 번째 그룹의 첫 글자는 대문자로 변환
            `${p1}${(p2 as string).toUpperCase()}`,
          );
  
          // 변환된 속성 이름이 SVG_ATTRIBUTE_KEYS 배열에 포함되어 있는지 확인
          // 이 부분은 원래 코드의 의도대로 유지
          if (SVG_ATTRIBUTE_KEYS.includes(resultAttr.trim())) {
            return resultAttr;
          }
  
          // 조건에 맞지 않으면 원래 매칭된 문자열 반환
          return match;
        })
        .replace(/class="/g, 'className="')
        .replace(regex, replacement);
        

        svgElement = svgElement.replace(/style="([^"]*)"/g, (_, p1) => {
          // match는 전체 매칭된 문자열: 'style="mask-type: alpha;"'
          // p1은 첫 번째 캡처 그룹: 'mask-type: alpha'
          return `style={{ ${p1.split(';').filter((item) => {
            const [key, value] = item.split(':').map((item) => item.trim());
            return !!key && !!value;
          }).map((item) => {
            const [key, value] = item.split(':').map((item) => item.trim());
            return `${_camelCase(key)}: '${value}'`;
          }).join(',')} }}`;
        });
  
        if (this.description) {
          svgElement = svgElement.replace(/(<svg[^>]*>)/g, '$1{!!props.description && <desc>{props.description}</desc>}');
        }
  
        if (this.title) {
          svgElement = svgElement.replace(/(<svg[^>]*>)/g, `$1<title>{props.title ?? '${key}'}</title>`);
        }
  
        const type = 'React.SVGAttributes<SVGSVGElement> & { title?: string; description?: string; }';

        importString += `const ${key} = (props${this.typescript ? `: ${type}` : ''} = {}) => { return (${svgElement}); };\n`;
      }
    }

    const exportString = fileList
      .reduce((acc, [key, _value], index) => {
        if (index === 0) {
          acc = 'export {';
        }

        acc += `${index !== 0 ? ',' : ''}  ${key}`;
        if (index === Object.entries(fileObject).length - 1) {
          acc += ' };';
        }

        return acc;
      }, '')
      .replace(/\n$/, '');

    return { importString, exportString };
  }

  /**
   * 주어진 파일 리스트에서 SVG 파일 이름만 필터링합니다.
   * @param {string[]} list 파일 이름 리스트
   * @returns SVG 파일 이름 리스트
   */
  filterSvgFileNameList(list: string[]) {
    return list.filter((name) => name.endsWith('.svg'));
  }

  /**
   * 지정된 디렉토리에서 SVG 파일 리스트를 읽습니다.
   * @param {string} dir SVG 파일이 위치한 디렉토리 경로
   * @param {string} [dirName=''] 현재 디렉토리 이름
   * @returns SVG 파일 경로 리스트
   */
  readSvgFileList = async (dir: string, dirName = ''): Promise<string[]> => {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      dirents.map(async (dirent) => {
        const newDirName = `${dirName ? `${dirName}/` : ''}${dirent.name}`;
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() && dirent.name !== 'types'
          ? this.readSvgFileList(res, newDirName)
          : newDirName;
      })
    );
    const concatList = Array.prototype.concat(...files) as string[];

    return concatList;
  };

  /**
   * SVG 타입 파일을 생성합니다.
   * @param {string[]} list SVG 파일 이름 리스트
   */
  async writeSvgTypeFile(list: string[]) {
    if (!this.typescript) {
      return;
    }

    const { staticSvgIconName, particalSvgIconName, svgComponentName } =
      this.parseSvgListForType(list);

    const typeDir = `${this.outputDir}/types`;

    await mkdir(typeDir, { recursive: true });

    if (existsSync(typeDir)) {
      return writeFile(
        `${typeDir}/index.d.ts`,
        `/* eslint-disable */\n/* prettier-ignore */\nexport type StaticSvgIconName = ${staticSvgIconName};\n${particalSvgIconName}` +
          `export type SvgComponentName = ${svgComponentName}`,
        { flag: 'w' }
      )
        .then(() => {
          console.info('✨[Static Svg Type File] is Generated!');
        })
        .catch(console.error);
    }
  }

  /**
   * 정적 SVG export 파일을 생성합니다.
   * @param {string[]} list SVG 파일 이름 리스트
   */
  async writeStaticSvgExportFile(list: string[]) {
    const { importString, exportString } = await this.parseSvgListForFile(list, this.useSvgr);

    const toBeDeleteFile = `${this.outputDir}/index.${this.typescript ? 'jsx' : 'tsx'}`;
    const toBeMakeFile = `${this.outputDir}/index.${this.typescript ? 'tsx' : 'jsx'}`;

    await mkdir(this.outputDir, { recursive: true });

    if (existsSync(toBeDeleteFile)) {
      remove(toBeDeleteFile);
    }

    return writeFile(
      toBeMakeFile,
      `/* eslint-disable */\n/* prettier-ignore */\nimport React from "react";\n\n${importString}\n\n${exportString}`,
      { flag: 'w' }
    )
      .then(() => {
        console.info('✨[Static Svg Export File] is Generated!');
      })
      .catch(console.error);
  }

  generate = _debounce(async () => {
    const fileNameList = await this.readSvgFileList(this.svgFileDir);
    const svgFileList = this.filterSvgFileNameList(fileNameList);

    await this.writeSvgTypeFile(svgFileList);
    await this.writeStaticSvgExportFile(svgFileList);
  }, 300);
}

export default SvgComponentGenerator;
