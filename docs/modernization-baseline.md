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

## 阶段 2：Vite 迁移结果

| 检查 | 结果 |
| --- | --- |
| Renderer 构建 | 通过，Vite 8.1.5 构建 246 个模块耗时 0.62 秒 |
| Renderer 产物 | 943,022 bytes（不含 source map），较基线减少 46.8% |
| 共享入口 | 202.70 kB，gzip 64.59 kB；各窗口页面继续按需加载 |
| 开发态 smoke test | 通过，双显示器 Cropper 均完成渲染；首次打开 1,378 ms |
| 自动化测试 | 29 tests 通过，63.06 秒 |
| lint | Node 20.19.4 下通过，保留 18 个既有 warning |
| arm64 目录包 | 通过，`Kap.app` 主程序为 Mach-O arm64，包内包含 Vite 入口和 20 个 JS chunk |

生产包中已不存在 `next` 和 `electron-next`。Vite 只构建静态文件，Electron 继续通过 `loadFile` 加载，不会启动本地 Web 服务。

首次 Cropper 数据包含 Vite 开发服务器的冷启动和依赖预构建开销；阶段 1 的窗口复用收益应以同一进程内第二次打开的数据衡量，不能把这项开发态数据等同于生产启动性能。

## 阶段 3：Renderer 隔离结果

| 检查 | 结果 |
| --- | --- |
| BrowserWindow 安全配置 | 全部使用 preload，`nodeIntegration: false`、`enableRemoteModule: false`、`contextIsolation: true` |
| Renderer 特权调用 | Electron `remote` 和直接 Electron/Node 访问已移除，桌面能力改由固定的 `window.kap` API 提供 |
| IPC 边界 | 现有 `electron-better-ipc` 兼容层仅允许明确列出的 channel；新能力按命名方法暴露，不提供任意 invoke |
| 冗余依赖 | 删除依赖 `electron-timber` 及 3 个 Renderer Electron shim；同时删除 180 余行失效注释代码 |
| CSP | 限制脚本、连接、图片和媒体来源，不再允许内联脚本 |
| 自动化测试 | 30 tests 通过，63.46 秒；新增 BrowserWindow 隔离配置回归测试 |
| lint / build | Node 20.19.4 下通过；Vite 构建 245 个模块耗时 0.62 秒 |
| 开发态 smoke test | 双显示器 Cropper、Editor、Preferences 及窗口/上下文菜单正常；CDP 证实 `window.require`、`window.process` 均为 `undefined` |
| arm64 目录包 | 通过，289 MB；主程序为 Mach-O arm64，asar 包含 `dist-js/preload.js`，不含 Next/electron-next/electron-timber |

迁移中发现 `electron-timber` 会为后创建的窗口注册一份依赖 `remote` 的 session preload，导致 Preferences 的安全 preload 失效。该日志桥接不是产品功能，因此直接删除。Preferences 的打开动作也改为命名 IPC，不再尝试把 BrowserWindow 作为响应序列化；调整后窗口能在隔离上下文中正常挂载。

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
