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

## 阶段 4：Electron 43 升级结果

| 检查 | 结果 |
| --- | --- |
| Electron 运行时 | 43.1.1，Node 24.18.0，Chromium 150.0.7871.114 |
| arm64 运行证明 | 开发 Electron 和打包后的 Kap 均报告 `process.arch === 'arm64'`；主程序及 Electron Framework 均为 Mach-O arm64 |
| Renderer 隔离 | 所有 BrowserWindow 在 preload、context isolation 基础上进一步启用 sandbox |
| 旧兼容代码 | 删除 `enableRemoteModule`、自定义 `file://` 协议放行以及调试用 DYLD entitlement |
| 配套依赖 | electron-builder 26.15.3、electron-updater 6.8.9、electron-log 5.4.4、electron-store 8.2.0、electron-util 0.17.2 |
| 自动化检查 | 30 tests 通过，70.75 秒；TypeScript、Vite 构建通过；Node 20.19.4 下 lint 仅保留既有 warning |
| arm64 目录包 | 通过，379 MB；`codesign --verify --deep --strict` 通过，最低系统版本为 macOS 12.0 |
| 公证 | 已改用 electron-builder 内置 `mac.notarize`；本机没有 Apple 公证凭据，构建明确跳过，未宣称通过 |

Electron 43 的框架和资源使目录包由阶段 3 的 289 MB 增至 379 MB，增加约 31%。这项回归不影响原生架构结论，但需要在阶段 8 检查语言资源和最终 DMG 压缩结果，不能通过未经验证的签名忽略规则掩盖。

完整签名打包耗时 546.31 秒，主要时间消耗在逐文件签名。删除协议 workaround 后，开发态 Editor 仍能直接加载本地录制文件，视频 `readyState` 为 4。Cropper、Editor、Preferences 和窗口菜单在 Electron 43 sandbox 中完成 smoke test，Renderer 内 `window.require` 与 `window.process` 仍为 `undefined`。

最低系统版本已从 macOS 10.12 提高到 12.0，这是 Electron 43 的运行要求；阶段 6 已在用户确认后进一步提高到 macOS 13。

## 阶段 5：Apple Silicon 导出结果

| 检查 | 结果 |
| --- | --- |
| FFmpeg | ffmpeg-static 5.3.0 / FFmpeg 6.0；打包文件为 Mach-O arm64 |
| GIF 工具 | gifsicle 7.0.1 / 1.93；打包文件为 arm64+x64 universal，不再仅含 x86_64 |
| MP4 直拷 | 7,442,205 bytes 的未编辑 H.264 文件使用 `COPYFILE_FICLONE` 耗时 4.26 ms，输出逐字节一致 |
| 编码模式 | VideoToolbox 支持 H.264/HEVC；libx264/libx265 软件编码仍保留，可在 Preferences 切换 |
| 自动化检查 | 34 tests 通过，66.99 秒；覆盖直拷、直拷取消清理、编辑判断和硬/软件编码选择 |
| build / lint | TypeScript、Vite 构建通过；Node 20.19.4 下 lint 仅保留 19 个既有 warning |
| arm64 目录包 | 无签名 pack 通过，385 MB；Kap、FFmpeg 为 arm64，gifsicle 为包含 arm64 的 universal 二进制 |

没有引入 gifski。当前产品暴露了无损和 `--lossy=50` 两种 GIF 行为；直接切换到 gifski 需要新增 PNG 帧中间管线且会改变该选项语义。升级 universal gifsicle 是解决 Rosetta 依赖的最小改动，GIF 三阶段管线是否值得重写应由独立 profile 决定。

同一台 arm64 Mac、同一段 30 秒 1080p/60 FPS 测试素材的编码结果如下。`user` CPU 时间比墙钟时间更能反映多核占用；文件大小来自本次测试样本，不能代表所有录屏内容。

| 格式 | 编码器 | 墙钟时间 | user CPU | 文件大小 |
| --- | --- | ---: | ---: | ---: |
| H.264 | libx264 | 6.52 s | 30.98 s | 279 KB |
| H.264 | h264_videotoolbox | 9.20 s | 12.11 s | 261 KB |
| HEVC | libx265 | 30.28 s | 176.94 s | 267 KB |
| HEVC | hevc_videotoolbox | 10.00 s | 11.93 s | 679 KB |

VideoToolbox 在该样本上让 HEVC 墙钟时间降低约 67%、user CPU 降低约 93%，代价是文件增大约 154%。H.264 的 user CPU 降低约 61%，但墙钟时间增加约 41%；因此界面将其描述为降低 CPU 使用，而不是承诺所有素材都更快。完全未编辑的 H.264 MP4 会绕过这两类编码器，直接走文件 clone/copy 快路径。

## 阶段 6：ScreenCaptureKit 录屏结果

旧管线使用 `aperture` 6.1.2 的 AVFoundation 录屏可执行文件；新管线使用 Aperture 3.0.0/ScreenCaptureKit 和 Kap 的最小 Swift 命令助手。两者都在 arm64 原生运行，录制同一块 Retina 显示器上的同一选区，并用持续位于选区内的光标运动制造连续画面变化。CPU/RSS 是录制进程每秒采样的平均值，停止等待从发送停止命令计到 MP4 完成写入。

| 场景 | 管线 | 平均 CPU | 平均 RSS | 停止等待 | 输出帧/时长 |
| --- | --- | ---: | ---: | ---: | ---: |
| 30 秒 1080p | 旧 AVFoundation | 8.15% | 45,979 KB | 137 ms | 883 / 29.43 s |
| 30 秒 1080p | 新 ScreenCaptureKit | 7.51% | 40,731 KB | 50 ms | 902 / 30.97 s |
| 15 秒 4K | 旧 AVFoundation | 8.06% | 46,334 KB | 315 ms | 422 / 14.10 s |
| 15 秒 4K | 新 ScreenCaptureKit | 7.58% | 40,924 KB | 245 ms | 455 / 15.53 s |

1080p 下新管线的采样 CPU 降低约 8%、RSS 降低约 11%、停止等待降低约 64%；4K 下对应降低约 6%、12% 和 22%。旧管线输出固定 30 FPS，新管线按 ScreenCaptureKit 提供的变化帧写入，实测平均 29.13 FPS（1080p）和 29.29 FPS（4K）；由于两种原生 API 的开始事件和时间戳边界不同，不能把文件时长差直接解释为丢帧，但连续画面帧数没有回退。

功能 smoke test 覆盖：两块物理显示器的区域录制、系统音频、内置麦克风、暂停/恢复后无重编码片段合并，以及取消后输出和片段目录清理。系统音频与暂停同时启用的上游损坏问题已复现并通过分段方案修复。显示器拔插和系统睡眠会走原生助手错误退出与 main 进程清理路径；实际拔线/睡眠的发布包人工测试保留到阶段 8。

自动化测试增加到 37 项并全部通过，TypeScript、Vite 和 Swift universal 构建通过；Node 22 下 lint 只保留 19 个既有 warning。无签名 arm64 目录包为 383 MB，最低系统版本为 macOS 13；包内助手位于 `app.asar.unpacked`，同时包含 arm64/x86_64 并直接链接 ScreenCaptureKit，旧 `aperture` Node 包不再存在。

## 阶段 7：依赖与包管理结果

| 检查 | 结果 |
| --- | --- |
| 包管理器 | pnpm 10.33.2；frozen-lockfile 干净安装通过 |
| 直接依赖 | 运行时 58 → 25；开发 36 → 28 |
| 安装目录 | 813 MB → 746 MB |
| 核心版本 | React 19.2.7、TypeScript 5.7.3、AVA 6.4.1、Sinon 22、AJV 8.20、Sentry Electron 7.15 |
| 原生架构 | Electron、FFmpeg、屏幕权限模块均为 arm64；录屏助手为 arm64+x86_64 universal |
| 自动化检查 | 38 tests、TypeScript、Vite、Swift universal 构建通过；Node 24 lint 仅有 15 个既有 TODO/FIXME warning |
| 生产依赖审计 | `pnpm audit --prod` 无已知漏洞 |

最终实现不再包含独立 gifsicle：GIF 由 FFmpeg 的 palettegen/paletteuse 直接完成，有损选项通过 palette 色数保留。阶段 5 曾使用 universal gifsicle 解除 Rosetta 阻塞，阶段 7 又删除了这一步和对应二进制，转换测试继续覆盖无损、非 Retina 和有损 GIF。

Renderer 与 main 之间的 `electron-better-ipc` 包也已删除。preload 继续执行 channel 白名单和页面来源校验，main 使用约束在项目内的请求/响应实现；Cropper、Preferences 和 Editor 的应用级 smoke test 已覆盖这条边界。

仍保留的旧主版本主要是 CommonJS main 与 ESM-only 新版本之间的边界。具体版本、理由和升级前置条件记录在 `docs/dependency-policy.md`，不把无运行时性能收益的 main ESM/插件 ABI 迁移混入本轮。

## 阶段 8：跨架构与发布结果

阶段 7 后继续扫描最终 arm64 app，发现 `mac-open-with`、`mac-windows` 和 `macos-audio-devices` 的最新版仍只包含 x86_64 可执行文件。它们分别位于启动、音频菜单和窗口选择路径，意味着“Electron 与 FFmpeg 为 arm64”仍不足以证明整个应用不需要 Rosetta。本轮把三者所需的最小能力合并到 `kap-system` Swift 助手，并删除对应 npm 包。

| 检查 | arm64 | x64 |
| --- | ---: | ---: |
| Node/Electron 原生环境 | Node 24.11.1 arm64 | Node 24.11.1 x64（Rosetta 验收环境） |
| app 目录大小 | 402 MB | 436 MB |
| DMG 大小 | 147 MB | 154 MB |
| DMG 校验 | `hdiutil verify` 通过 | `hdiutil verify` 通过 |
| 最低 macOS | 13.0.0 | 13.0.0 |
| 包内 Mach-O | 19 个目标架构或 universal | 19 个目标架构或 universal |
| 原生辅助程序 | `kap-capture`、`kap-system` 均为 universal | 两个助手的 x86_64 slice 均直接运行通过 |

arm64 完整 38 项测试通过。x64 Node/FFmpeg 环境覆盖同一套 38 项测试；验收过程中实际暴露并修复了 Intel FFmpeg 不接受 VideoToolbox `-q:v`、以及 HEVC 硬件会话不可用时没有回退的两项问题。最终开发态启动完成 preload/IPC、系统辅助程序初始化和双显示器 Cropper 渲染；Vite 冷启动场景的 Cropper 打开为 1,617 ms，不与没有可靠埋点的旧版本首开数据作虚假对比。

最终 DMG 的 SHA-256：

- arm64：`8585120d2d694f6b2c66f0891761d62b6b50c6ced361f99d79f7b6f07af5d2f6`
- x64：`fd6efe69ba1cdf5c2fcaa09c600baf1ab51625a25d1268b380b4691b38a11b12`

现代化验收时，本机没有 `Developer ID Application` 身份和 Apple 公证凭据，所以当时的本地 DMG 使用 `CSC_IDENTITY_AUTO_DISCOVERY=false` 生成，只用于结构和功能验收。仓库成为独立 fork 后，发行配置改用 ad-hoc 签名且不执行 Apple 公证；CI 对两个架构执行 `codesign` 完整性检查，但 Gatekeeper 不会信任这类签名。由于 ad-hoc 签名无法跨版本提供稳定的 designated requirement，自动更新链路已删除，发行版改为从 GitHub Releases 手动升级。

## 运行时性能记录

自动化基线目前覆盖转换管线和构建管线。以下 GUI 指标需要在阶段 1 的开发计时日志加入后，在相同显示器配置上补录；旧版本没有可靠埋点，人工秒表不足以区分窗口创建、页面加载和显示耗时。

| 场景 | 基线 | 阶段 1 目标 |
| --- | --- | --- |
| Cropper 首次打开 | 待开发计时日志补录 | 不劣于旧实现 |
| Cropper 再次打开 | 待开发计时日志补录 | 降低至少 70%，或低于 300 ms |
| 右键菜单 | 待开发计时日志补录 | 热路径不重新枚举音频设备 |
| 30 秒 1080p 录制停止 | 新管线 CPU 7.51%、RSS 40,731 KB、停止 50 ms | 相对旧管线分别降低约 8%、11%、64% |
| 未编辑 MP4 导出 | 阶段 5 补录 | 接近文件复制耗时 |
| GIF/HEVC 导出 | 阶段 5 补录 | 记录 CPU、耗时和文件大小对比 |

## 已确认的现代化必要性

- Next/Webpack 4 已无法在现代 Node 默认配置下构建。
- 旧 lint 工具链已无法在现代 Node 运行。
- 当前安装包含 x86_64-only gifsicle。
- Electron 下载、engine 和 peer dependency 约束使干净安装不可复现。
- main 和现有 26 个测试仍可运行，可作为后续小步迁移的回归基础。
