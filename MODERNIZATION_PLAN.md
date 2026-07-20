# Kap 现代化与性能优化计划

## 实施进度

- [x] 阶段 0：建立可复现基线（`7abd968`）
- [x] 阶段 1：复用 Cropper 窗口并缓存音频设备（`dfb2aa2`）
- [x] 阶段 2：用 Vite 替换 Next.js（`607fbbd`）
- [x] 阶段 3：移除 remote，建立安全 IPC 边界（`c445334`）
- [x] 阶段 4：升级 Electron（`0a5d1eb`）
- [x] 阶段 5：优化 ARM 导出管线
- [x] 阶段 6：迁移录屏到 ScreenCaptureKit
- [x] 阶段 7：删除和升级其余依赖，迁移 pnpm
- [ ] 阶段 8：跨架构回归与发布准备

## 目标

在不重写整个产品的前提下，完成以下工作：

- 修复 Apple Silicon 机器上选区窗口、菜单、录制和导出的主要性能瓶颈。
- 删除 Next.js、`electron-next`、Electron `remote` 等不再需要或已经淘汰的架构。
- 将 Electron、React、TypeScript、构建工具和其余依赖升级到受支持版本。
- 保留现有录制、编辑、导出、插件和自动更新能力。
- 让每个阶段都能单独测试、提交和回滚，避免一次性大升级后无法定位回归。

## 当前基线

- Electron 13.6.9、Next.js 10、React 17、TypeScript 4、Yarn 1。
- Renderer 在构建时执行 `next build` 和 `next export`，运行时只是加载静态 HTML，并没有运行 SSR 服务。
- Cropper 每次打开都会销毁并重新创建所有显示器对应的透明全屏窗口。
- Renderer 开启了 `nodeIntegration` 和 `enableRemoteModule`，并关闭了 `contextIsolation`。
- H.264、HEVC、GIF 等导出依赖旧版 FFmpeg/gifsicle，现有 arm64 安装包可能包含 x86_64 工具。
- 录屏依赖旧版 Aperture Node 包装层，没有使用现代 ScreenCaptureKit 管线。

## 目标架构

```text
Electron main
  ├─ 窗口、菜单、更新、插件和文件系统
  ├─ preload + 明确的 IPC 接口
  ├─ ScreenCaptureKit 原生录制助手
  └─ 原生 arm64/universal 导出工具

Vite renderer
  ├─ 一个静态 HTML 外壳
  ├─ 按窗口路由动态加载 React 页面
  └─ 不包含 Node/Electron 特权 API
```

不新增通用框架、依赖注入层或第二套路由系统。Vite 只负责静态 Renderer 构建；Electron main 继续负责桌面能力。

## 实施原则

1. 每个阶段先记录基线，再修改，再用同一场景复测。
2. 先删除即将废弃的依赖，再升级剩余依赖，避免迁移无用代码。
3. 性能改动和依赖升级分开提交，确保回归可以定位。
4. 不直接合入现有大型上游 PR；只复用已经确认的问题分析和小型实现思路。
5. Apple Silicon 是主要优化目标，但 Electron Renderer 和 JS 代码继续保持 x64 兼容。

## 阶段 0：建立可复现基线

### 工作内容

- 记录当前 macOS、CPU、Node、包管理器和构建产物架构。
- 建立最小性能记录表：
  - 冷启动到托盘可用。
  - 第一次打开 Cropper。
  - 关闭后第二次打开 Cropper。
  - 右键菜单打开。
  - 30 秒 1080p H.264 录制的停止等待时间。
  - 同一文件导出 MP4、GIF、HEVC 的耗时和峰值 CPU。
- 用 `file`/`lipo -info` 检查 Electron、FFmpeg、gifsicle 和原生模块架构。
- 记录当前测试、lint、TypeScript 编译和打包是否能在干净环境运行。

### 完成标准

- 基线命令和结果写入 `docs/modernization-baseline.md`。
- 已知的环境或旧依赖安装失败被明确记录，不通过修改业务代码掩盖。

## 阶段 1：修复 Cropper 和菜单热路径

### 工作内容

- 将 Cropper 生命周期拆成“隐藏”和“销毁”：普通关闭只隐藏，应用退出才销毁。
- 每次打开时按当前显示器列表协调窗口池：复用已有窗口、更新 bounds、补建新增显示器窗口、销毁已移除显示器窗口。
- 每次显示前重新发送 display/选区状态，避免复用窗口保留过期状态。
- 确保 Escape、多显示器增删、Space 切换、开始录制和取消录制不会触发递归关闭或失去焦点。
- 缓存右键菜单中昂贵的音频设备枚举结果；只在设备变化或设置变化后失效。
- 在开发模式记录 Cropper 首开、复开和菜单构建耗时。

### 完成标准

- Cropper 第二次打开不再创建 BrowserWindow。
- 单显示器和多显示器均可连续打开、取消、再次打开。
- 热打开耗时相对基线至少下降 70%，或低于 300 ms；若硬件限制未达到，保留实测数据。
- 菜单打开不再每次同步等待音频设备枚举。

## 阶段 2：用 Vite 替换 Next.js

### 工作内容

- 新增最小 Vite + React 构建配置。
- 使用一个静态 HTML 外壳，根据 `route` 参数动态导入现有页面；保持页面级代码拆分。
- 开发环境由 Vite dev server 提供 Renderer，生产环境由 Electron `loadFile` 加载构建产物。
- 保留现有 `styled-jsx` 写法，先通过独立 Babel 插件编译，避免同时重写约 90 处样式。
- 删除 `next`、`electron-next`、Next 配置、Next 类型文件和 `.next` 相关脚本。
- 更新打包文件清单，使 electron-builder 只包含 Vite 产物。

### 完成标准

- Cropper、Editor、Preferences、Exports、Dialog、Config 六类窗口均能在开发和打包模式打开。
- 生产应用不启动本地 Web 服务，不包含 Next.js/electron-next。
- Renderer 构建时间和产物大小被记录并与基线比较。

## 阶段 3：移除 remote，建立安全 IPC 边界

### 工作内容

- 按实际调用点整理 Renderer 所需能力，不暴露通用 `ipcRenderer` 或任意 channel。
- 为各窗口加载 preload，通过 `contextBridge` 暴露窄接口：窗口操作、设置、导出状态、文件选择、插件操作和系统信息。
- 将 `remote.getCurrentWindow()`、`remote.require()`、直接 Node 文件系统访问迁移到 main/preload。
- 将现有 remote state 通信迁移为明确的 IPC 请求和订阅。
- 设置 `nodeIntegration: false`、`enableRemoteModule: false`、`contextIsolation: true`，可用时启用 sandbox。
- 为 preload API 增加共享 TypeScript 类型和最小 IPC 回归测试。

### 完成标准

- Renderer 中不存在 Electron `remote`、Node 内置模块或直接 `ipcRenderer` 导入。
- 所有 BrowserWindow 使用隔离上下文；开发者工具控制台不能直接访问 Node。
- 原有窗口、插件、导出和设置操作通过 smoke test。

## 阶段 4：升级 Electron

### 工作内容

- 在阶段 2、3 解除阻塞后升级 Electron 及 electron-builder/updater/log/store 等配套包。
- 迁移过程中按 Electron breaking changes 分检查点验证，不长期停留在已结束支持的中间版本。
- 当前最终目标为 Electron 43；实施时以当时仍受官方支持的稳定版本为准。
- 删除已经成为默认值的兼容开关和旧 Electron workaround。
- 检查权限、协议、自动更新、签名、公证、窗口透明度和 macOS 菜单行为。

### 完成标准

- `process.arch` 在 arm64 包中为 `arm64`，应用无需 Rosetta。
- 冷启动、窗口创建和内存数据不劣于阶段 1 基线。
- 签名、公证、DMG、协议唤起和自动更新 smoke test 通过。

### 实施结果

- Electron 已升级到 43.1.1，配套升级 electron-builder、updater、log、store 和 util。
- 所有 BrowserWindow 进一步启用 sandbox；删除旧 `file://` 协议 workaround 和调试用 DYLD entitlement。
- electron-builder 改用内置公证配置；本地 arm64 目录包已通过签名校验，但当前环境没有 Apple 公证凭据，因此真实公证、DMG、协议唤起和自动更新发布链路统一留到阶段 8 验证。
- 最低系统版本已由 macOS 10.12 提高到 12.0；阶段 6 再决定是否随 ScreenCaptureKit 提高到 13。

## 阶段 5：优化 ARM 导出管线

### 工作内容

- 替换或重新打包 FFmpeg，保证 arm64 DMG 内为原生 arm64/universal 二进制。
- 删除 x86_64-only GIF 工具；优先选择能保留现有无损/有损选项且具有 arm64 构建的最小替代方案。
- 为完全未编辑的 H.264 MP4 增加直拷快路径；只有裁剪、缩放、变速、静音或转码时才运行 FFmpeg。
- 为 H.264/HEVC 增加 VideoToolbox 快速模式，同时保留软件编码高质量模式。
- 保持取消、进度、错误提示和临时文件清理行为。

### 完成标准

- 打包后的 FFmpeg/GIF 工具不包含仅 x86_64 的可执行文件。
- 未编辑 H.264 MP4 导出接近文件复制耗时，且音视频 metadata 可正常播放。
- 硬件编码模式在 Apple Silicon 上实际使用 VideoToolbox，并记录速度、CPU 和文件大小对比。
- 现有转换测试扩展到直拷、裁剪、静音和取消路径。

### 实施结果

- FFmpeg 升级到 6.0 arm64，gifsicle 升级为同时包含 arm64/x64 的 universal 构建，打包后的导出工具不再依赖 Rosetta。
- 没有引入 gifski：它需要增加 PNG 帧中间管线并改变现有有损压缩行为，而 universal gifsicle 已直接解决本阶段的架构问题。
- 未编辑、未静音、无插件的 H.264 MP4 使用文件系统 clone/copy 快路径；编辑器会明确检测尺寸、帧率和时间范围变化。
- H.264/HEVC 提供 VideoToolbox 模式，同时保留 libx264/libx265 软件编码；偏好设置允许用户在低 CPU 与软件编码之间切换。
- 30 秒 1080p 实测中，VideoToolbox 的 HEVC 墙钟耗时降低 67%，H.264 的 CPU 时间降低 61%；H.264 墙钟耗时在当前低动态测试素材上反而增加 41%，因此不把硬件模式描述为所有场景都更快。

## 阶段 6：迁移录屏到 ScreenCaptureKit

### 决策门

ScreenCaptureKit/Aperture 3 的最简路径需要把最低系统版本提高到 macOS 13。本阶段已确认仅支持 macOS 13 及以上，不保留旧录屏回退管线。

- 提高最低版本到 macOS 13；或
- 为旧系统继续维护旧 Aperture 回退管线。

默认建议提高到 macOS 13，避免同时维护两套原生录制实现。

### 工作内容

- 用 Aperture 3/ScreenCaptureKit 替换旧 Aperture Node 包装层；如 Node 包装层仍不支持新版原生库，只实现 Kap 实际使用的最小 Swift 助手接口。
- 支持屏幕/窗口区域、鼠标、麦克风、系统音频、暂停/恢复和取消。
- 优先让录制输出与 MP4 直拷快路径衔接，减少停止录制后的二次编码。
- 对权限拒绝、显示器拔插、睡眠/唤醒和录制中应用退出做恢复测试。

### 完成标准

- Apple Silicon 录制不再依赖旧 CGDisplayStream/AVCaptureScreenInput 管线。
- 1080p/4K 录制的 CPU、丢帧、停止等待时间不劣于旧实现，并记录对比。
- 多显示器、系统音频、麦克风和暂停恢复 smoke test 通过。

### 实施结果

- 最低系统版本提高到 macOS 13；删除旧 `aperture` Node/AVFoundation 录屏依赖，改为固定 Aperture 3.0.0 的最小 Swift 助手。
- 助手直接链接 ScreenCaptureKit，并构建为 arm64+x86_64 universal 可执行文件；Node 侧只保留启动、命令协议和异常退出恢复。
- 支持区域、光标、麦克风、系统音频、暂停/恢复和取消；点击高亮只在原生 API 支持的 macOS 15 及以上显示。
- 上游 Aperture 3 在“系统音频 + 暂停恢复”组合下会生成损坏 MP4。本实现让暂停结束当前片段、恢复时启动新片段，停止时用 AVFoundation passthrough 合并，避免重编码并通过组合 smoke test。
- 两块显示器均完成区域录制；系统音频、内置麦克风、暂停恢复、取消清理和异常启动自动化/实机检查通过。
- 30 秒 1080p 和 15 秒 4K 连续变化画面中，新管线的录制进程 CPU、内存和停止等待均低于旧管线；具体数据记录在 `docs/modernization-baseline.md`。

## 阶段 7：删除和升级其余依赖

### 工作内容

- 先删除无引用或可由 Node 标准库替代的包，例如 `move-file`、`tmp`、`cp-file`、`make-dir` 等；以实际引用扫描和测试为准。
- 将根包管理器迁移到 pnpm 10，设置 `packageManager` 和 Electron 项目所需的 `node-linker=hoisted`。
- 根据 `pnpm ignored-builds` 结果，只在 `pnpm.onlyBuiltDependencies` 放行确实需要安装脚本的 Electron/esbuild/原生依赖。
- 保留插件安装器当前需要的 Yarn 运行时，直到插件安装协议被单独替换；不要误删它。
- 分组升级 React、Sentry、TypeScript、lint/test、Electron 工具包和剩余运行时依赖。
- 删除升级后不再需要的类型包、polyfill、兼容配置和重复工具。
- 对每个保留的旧版本记录明确原因；否则 `pnpm outdated` 应为空。

### 完成标准

- 干净 checkout 可以用文档中的单组 pnpm 命令安装、测试、构建和打包。
- lockfile 只保留 pnpm lockfile，安装脚本白名单最小化。
- 无未解释的过期直接依赖、无已知高危生产依赖告警。

### 实施结果

- 根项目由 Yarn 1 迁移到 pnpm 10.33.2，保留 hoisted 布局；干净删除 `node_modules` 后的 frozen-lockfile 安装已通过。
- 直接运行时依赖由 58 个降到 25 个，开发依赖由 36 个降到 28 个；删除了 Next/remote 相关包、旧文件工具、GIF 二进制、旧状态库、旧 IPC 包以及可由 Node/Electron 原生 API 替代的辅助包。
- React 升级到 19.2，Sentry Electron 升级到 7.15，TypeScript 升级到 5.7，AVA 升级到 6.4，Sinon 升级到 22，AJV 升级到 8.20；lint 现在直接在 Node 24 上运行。
- 屏幕权限依赖由 x86_64-only 可执行文件升级为 Electron ABI 的 arm64 原生模块；Electron、FFmpeg、权限模块和 ScreenCaptureKit 助手均不需要 Rosetta。
- 生产依赖审计无已知漏洞。仍显示为 outdated 的 CommonJS/ESM 边界和工具链版本均记录在 `docs/dependency-policy.md`。
- 完整构建、38 项测试、应用启动、Preferences、Editor 和 IPC smoke test 通过；lint 只保留 15 个既有 TODO/FIXME warning。

## 阶段 8：跨架构回归与发布准备

### 工作内容

- 在 arm64 和 x64 上执行安装、测试、打包和关键用户流程。
- 对比最终版与阶段 0 的启动、Cropper、菜单、录制、导出、CPU、内存和包体积。
- 验证签名、公证、Sparkle/electron-updater 更新、插件升级和历史录制恢复。
- 更新 README、contributing、maintaining 和发布说明。

### 发布门槛

- arm64 应用和所有随包二进制均无需 Rosetta。
- 所有自动化检查通过；无法自动化的 macOS 流程有明确 smoke test 记录。
- 性能结果达到各阶段标准，或对未达标项提供 profile 证据和后续 issue。

## 提交与回滚边界

建议按以下逻辑提交，避免把行为变化和机械升级混在一起：

1. `docs: add modernization baseline`
2. `perf: reuse cropper windows`
3. `perf: cache expensive menu data`
4. `refactor: replace next with vite`
5. `refactor: replace electron remote with preload ipc`
6. `chore: upgrade electron toolchain`
7. `perf: use native arm export tools`
8. `perf: add mp4 copy and videotoolbox paths`
9. `refactor: migrate capture to screencapturekit`
10. `chore: migrate dependencies to pnpm`
11. `docs: record modernization results`

每个提交都必须保持对应阶段可构建；若阶段内必须拆分，使用同一主题的小提交，不通过 force push 改写已经共享的历史。
