# Kap

[English](README.md)

Kap 是一款开源的 macOS 录屏工具。这个仓库是一个独立维护的 fork，重点解决启动和导出缓慢、现代 macOS 兼容、Apple silicon 与 Intel 原生支持等问题，并为继续扩展录屏功能打下基础。

> 本项目 fork 自 [wulkano/Kap](https://github.com/wulkano/Kap)，与原作者无关，也不受原作者认可或维护。项目保留原始版权声明和 MIT 许可证。

## 为什么重写 Kap？

上游项目自 2022 年 10 月后没有再发布功能版本，之后 `main` 分支唯一的提交是 2024 年 2 月更新 CI 配置。与此同时，它的运行时和原生依赖已经落后于当前 macOS 与 Node.js 支持的版本。

这个 fork 主要解决以下问题：

- **打开录屏选择器很慢。** 原实现每次打开时都会销毁并重建每块显示器对应的 Cropper `BrowserWindow`；其中一个窗口关闭时还会再次触发全部 Cropper 的清理流程，因此重复打开会持续承担窗口销毁、Renderer 重载和多显示器同步的成本。现在改为复用窗口池。
- **导出性能很差。** 未编辑的 MP4 也会被重新编码，H.264/HEVC 仅使用软件编码时会消耗大量 CPU 和时间。现在未修改的 MP4 直接 clone/copy，并可使用 VideoToolbox 硬件编码，同时保留软件回退。
- **架构适配不完整。** 多个随应用打包的辅助程序只有 Intel 版本，导致看似原生的 Apple silicon 构建仍会在常见路径进入 Rosetta。现在最终应用只包含目标架构或 universal Mach-O，并分别构建 arm64 和 x64 版本。
- **引入了不必要的 Web 框架能力。** Kap 的 Renderer 都是本地静态页面，不使用服务端渲染。Next.js 及其面向 SSR 的构建链增加了体积和兼容问题，却没有提供运行时价值，因此已替换为 Vite。
- **难以继续扩展。** 维护后的代码库将用于加入录屏倒计时、更清晰的屏幕提示，以及更多录制和编辑功能。

## 已完成的改进

- 使用 universal ScreenCaptureKit 辅助程序替换旧 AVFoundation 录屏程序，支持系统音频、麦克风、暂停/恢复、取消和清理。
- 移除 Electron `remote`，使用上下文隔离的 Renderer 和带类型的 preload/IPC 边界。
- 升级 Electron、React、TypeScript 和测试工具链，并用 Vite 替换 Next.js。
- 复用 Cropper 窗口并缓存音频设备查询，减少常用界面路径中的重复工作。
- 增加未修改 MP4 直拷、带软件回退的 VideoToolbox H.264/HEVC 编码，以及基于 FFmpeg 的 GIF 生成。
- 用一个 universal Swift 系统辅助程序替换仅支持 Intel 的原生依赖。
- 从 Yarn 迁移到 pnpm，减少直接依赖，并清除生产依赖中的已知漏洞。
- 增加 arm64/x64 独立 CI 打包、包内二进制架构检查和多架构更新元数据。

详细实施计划、性能数据和验证结果见 [MODERNIZATION_PLAN.md](MODERNIZATION_PLAN.md) 与 [docs/modernization-baseline.md](docs/modernization-baseline.md)。

## 下载与安装

从 [GitHub Releases](https://github.com/rrbe/Kap/releases) 下载最新 DMG。Apple silicon Mac 选择 `arm64`，Intel Mac 选择 `x64`。

Kap 要求 macOS 13 或更高版本。

### Gatekeeper 提示

这个 fork 的发行版本使用 ad-hoc 签名，不经过 Apple 公证。这样不再依赖原作者的 Developer ID 证书，但 macOS 不会把它视为“已认证开发者”发行的应用。

将 Kap 复制到 `/Applications` 后，在首次启动前移除隔离属性：

```sh
xattr -dr com.apple.quarantine /Applications/Kap.app
```

请只对从本仓库下载且由你确认可信的发行版本执行此操作。

## 使用方法

点击菜单栏图标，选择录制区域，然后按下录制按钮。再次点击菜单栏图标即可停止录制。

录制期间可以按住 Option 点击菜单栏图标暂停，或右键点击查看更多操作。

## 开发

```sh
nvm install
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

运行 `pnpm test` 执行 lint 和自动化测试。贡献说明见 [contributing.md](contributing.md)，插件 API 见 [docs/plugins.md](docs/plugins.md)。

## 许可证与归属

Kap 使用 [MIT License](LICENSE.md)。本 fork 保留原项目历史、版权声明和贡献者归属，但由当前仓库独立维护，与原作者无关。
