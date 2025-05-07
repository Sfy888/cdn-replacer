import { globSync } from 'glob'; // 用于文件匹配
import fs from 'fs'; // 文件系统操作
import path from 'path'; // 路径处理

import { normalizePath } from 'vite'; // Vite提供的路径标准化工具

/**
 * Vite插件：将静态资源引用替换为CDN链接
 * @param {Object} options 插件配置选项
 * @param {boolean} [options.enabled] 是否启用插件
 * @param {string} options.cdnPrefix CDN前缀URL
 * @param {string} [options.staticPrefix] 静态资源前缀，默认为"static"
 * @param {string[]} [options.ignore] 要忽略的文件模式
 * @returns {Object} Vite插件对象
 */
export default function cdnReplacer(options) {
  let baseConfig = '/'; // 基础路径配置
  let buildConfig = {}; // 构建配置

  // 如果明确设置了enabled为false，则不启用插件
  if (options.enabled !== void 0 && !options.enabled) {
    return;
  }

  return {
    name: 'cdn-replacer', // 插件名称
    enforce: 'post', // 插件执行顺序：后置
    apply: 'build', // 仅在构建时应用

    /**
     * 解析Vite配置
     * @param {Object} config Vite配置对象
     */
    configResolved(config) {
      baseConfig = config.base; // 保存基础路径
      buildConfig = config.build; // 保存构建配置
    },

    // 在打包完成后执行
    closeBundle: {
      sequential: true, // 顺序执行
      order: 'post', // 执行顺序：最后
      async handler() {
        // 验证cdnPrefix必须是URL格式
        if (!/^[http|\/\/]/i.test(options.cdnPrefix)) {
          throw Error('[cdn-replacer] cdnPrefix must be a url');
        }
        // 获取所有options.staticResourceDirectory当前目录下的文件夹名称和文件名称，在名称需要加上/ 组成数组
        const staticResourceDirectory = options.staticResourceDirectory || 'public';
        if (!staticResourceDirectory) {
          throw new Error('[cdn-replacer] options.staticResourceDirectory is required');
        }
        const normalizedPath = normalizePath(staticResourceDirectory);
        const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });
        const pubResult = entries.map(entry => `/${entry.name}`);
        // 获取输出目录路径并标准化
        const outDirPath = normalizePath(path.resolve(normalizePath(buildConfig.outDir)));
        const ssrClient = buildConfig.ssrManifest; // 是否为SSR客户端构建
        const ssrServer = buildConfig.ssr; // 是否为SSR服务端构建

        // 获取所有需要处理的文件
        const files = globSync('**', {
          nodir: true, // 不包括目录
          dot: true, // 包括点文件
          absolute: true, // 返回绝对路径
          cwd: outDirPath, // 工作目录
          ignore:
            // 自定义忽略规则
            options.ignore !== undefined
              ? options.ignore
              : // SSR客户端构建忽略ssr-manifest.json
              ssrClient
              ? ['**/ssr-manifest.json']
              : // SSR服务端构建忽略所有文件
              ssrServer
              ? ['**']
              : // 默认不忽略
                '',
        });

        const startTime = new Date().getTime(); // 记录开始时间
        let count = { file: 0, replace: 0 }; // 计数器

        // 遍历处理每个文件
        for (const fileFullPath of files) {
          const filePath = normalizePath(fileFullPath);
          // 获取相对于输出目录的路径
          const ourDirFilePath = filePath.split(outDirPath)[1];
          const fileContent = fs.readFileSync(filePath, 'utf8'); // 读取文件内容

          let newContent = fileContent;
          // 遍历pubResult数组，检查文件内容是否包含其中的内容
          for (const item of pubResult) {
            // 构建正则表达式，匹配以单引号或双引号开头，包含 item 且后续可能有其他内容的字符串
            const regex = new RegExp(
              `(["'])${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.*?)(["'])`,
              'g'
            );
            newContent = newContent.replace(regex, (match, p1, p2, p3) => {
              count.replace++; // 增加替换计数
              return `${p1}${options.cdnPrefix}${item}${p2}${p3}`; // 替换为带CDN前缀的内容
            });
          }
          // 如果内容有变化，则写入文件
          if (newContent !== fileContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            count.file++; // 增加文件计数
            console.log(`Updated: ${buildConfig.outDir + ourDirFilePath}`);
          }
        }
        // 计算并输出处理耗时
        const duration = (new Date().getTime() - startTime) / 1000;
        console.log(
          `\n更新 ${count.file} 个文件:，共替换 ${count.replace} 处，用时 ${duration.toFixed(
            2
          )}秒\n`
        );
      },
    },
  };
}
