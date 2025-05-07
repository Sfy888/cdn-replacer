cdn-replacer

将项目中打包后生产文件替换静态资源地址为cdn地址

# 功能特性

- 几乎零配置，使用 `vite` `outDir` 路径，替换里面的资源地址为cdn地址

# 安装

适用 vite 5 的 ESM 版本：

```bash
npm i -D cdn-replacer@latest
```

# 基本使用

1. 在 vite.config.js 中注册本插件
2. 设置插件参数

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cdnReplacer from 'cdn-replacer'

const options = {
  cdnPrefix: 'https://cdn.example.com/static',
  staticPrefix: 'static',
  ignore: '',
  enabled: true
}

const prod = process.env.NODE_ENV === 'production'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), cdnReplacer(options)]
})
```

3. 打包发布生产代码

```
pnpm run build
```

插件将会在打包完成后，即可把静态资源文件上传到cdn里。

# 配置项

| 配置名        | 说明 | 类型 | 默认值 |
|--------------|-------------|------|---------|
| cdnPrefix    | CDN地址前缀，以http或者https或者//开头 | string |  |
| staticPrefix | public静态资源前缀，默认static，前后无需夹\/，如果是多级目录前缀，则写为“static\/cdn”,意思是将public下static里面cdn的资源都变成cdn链接 | string |  |
| ignore       | 文件及文件夹忽略规则。如果你使用空字符串 `''`，将不会忽略任何文件 | string[]或者string | `''` |
| enabled      | 是否启用本插件 | boolean | true |
| staticResourceDirectory      | 静态资源目录 | string | public |

