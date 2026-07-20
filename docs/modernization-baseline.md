# 现代化基线

记录日期：2026-07-20  
基线提交：`c42692fa63ac71ed192e01684beb78a1b864aa88`

## 环境

| 项目 | 值 |
| --- | --- |
| CPU 架构 | arm64 |
| macOS | 26.5.1（25F80） |
| Xcode | 26.3（17C529） |
| Node.js | 24.11.1 |
| pnpm | 10.33.2 |
| 基线 Yarn | 1.22.22 |

## 依赖与磁盘

| 项目 | 值 |
| --- | ---: |
| 直接运行时依赖 | 58 |
| 直接开发依赖 | 36 |
| `node_modules` | 813 MB |
| Electron 13 文件 | 192 MB |
| Next.js 包 | 30 MB |
| FFmpeg 包 | 39 MB |
| Next 构建缓存 | 16 MB |
| 导出的 Renderer | 2.1 MB（文件内容合计 1,772,157 bytes） |
| 编译后的 main | 1.1 MB |

## 干净安装

当前 lockfile 不能直接在 Node 24 上安装：

```text
eslint-import-resolver-webpack@0.13.1: The engine "node" is incompatible
Expected "^16 || ... || ^6". Got "24.11.1".
```

忽略旧 engine 限制后，Electron 13 的默认二进制下载持续无进展。基线环境使用以下临时兼容步骤完成依赖链接：

```sh
ELECTRON_SKIP_BINARY_DOWNLOAD=1 yarn install --frozen-lockfile --ignore-engines
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ node node_modules/electron/install.js
```

这些步骤只用于复现旧版本，不是现代化后的目标安装方式。

安装还报告了 `unstated` 与 React 17 不匹配，以及 ESLint、TypeScript ESLint 等多组 peer dependency 不匹配。

## 二进制架构

| 二进制 | 版本 | 架构 |
| --- | --- | --- |
| Electron | 13.6.9 | arm64 |
| ffmpeg-static | 4.4.1 | arm64 |
| gifsicle | 5.2.0 | **x86_64** |

本机安装已直接证明 GIF 压缩步骤需要 Rosetta。FFmpeg 在本机依赖安装中是 arm64，但仍需在最终 DMG 内再次检查，不能只检查 `node_modules`。

## 静态检查

| 检查 | 结果 | 耗时/说明 |
| --- | --- | --- |
| `yarn build-main` | 通过 | 3.15 秒 |
| `yarn test:main` | 通过 | 26 tests，65.09 秒 |
| `yarn lint` | 失败 | 旧插件调用 Node 24 已删除的 `util.isDate` |
| `yarn build-renderer` | 失败 | Webpack 4 使用现代 OpenSSL 不支持的 hash |

Renderer 仅在临时设置 `NODE_OPTIONS=--openssl-legacy-provider` 后才能构建：

```sh
NODE_OPTIONS=--openssl-legacy-provider yarn build-renderer
```

缓存已存在时耗时 4.70 秒。构建结果确认全部页面均为静态导出，不存在运行时 SSR：

| 页面 | 页面 JS | First Load JS |
| --- | ---: | ---: |
| cropper | 11.7 kB | 149 kB |
| editor | 183 kB | 316 kB |
| preferences | 6.64 kB | 162 kB |
| exports | 2.86 kB | 136 kB |
| config | 3.76 kB | 159 kB |
| dialog | 2.17 kB | 99.1 kB |
| 共享 | - | 96.9 kB |

## 运行时性能记录

自动化基线目前覆盖转换管线和构建管线。以下 GUI 指标需要在阶段 1 的开发计时日志加入后，在相同显示器配置上补录；旧版本没有可靠埋点，人工秒表不足以区分窗口创建、页面加载和显示耗时。

| 场景 | 基线 | 阶段 1 目标 |
| --- | --- | --- |
| Cropper 首次打开 | 待开发计时日志补录 | 不劣于旧实现 |
| Cropper 再次打开 | 待开发计时日志补录 | 降低至少 70%，或低于 300 ms |
| 右键菜单 | 待开发计时日志补录 | 热路径不重新枚举音频设备 |
| 30 秒 1080p 录制停止 | 阶段 6 补录 | CPU、丢帧和等待时间均不劣化 |
| 未编辑 MP4 导出 | 阶段 5 补录 | 接近文件复制耗时 |
| GIF/HEVC 导出 | 阶段 5 补录 | 记录 CPU、耗时和文件大小对比 |

## 已确认的现代化必要性

- Next/Webpack 4 已无法在现代 Node 默认配置下构建。
- 旧 lint 工具链已无法在现代 Node 运行。
- 当前安装包含 x86_64-only gifsicle。
- Electron 下载、engine 和 peer dependency 约束使干净安装不可复现。
- main 和现有 26 个测试仍可运行，可作为后续小步迁移的回归基础。
