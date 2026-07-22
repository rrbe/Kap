# Kap

[English](README.md)

Kap 是一款开源的 macOS 录屏工具。

## 功能

- 录制选定区域，支持鼠标指针、点击高亮、系统音频和麦克风音频。
- 通过菜单栏暂停和继续录制。
- 裁剪、缩放、调整帧率，并导出为 MP4、HEVC、AV1、WebM、GIF 或 APNG。
- 使用 VideoToolbox 加速 H.264 和 HEVC 导出。
- 将结果保存到磁盘、复制受支持的格式，或用其他应用打开。
- 原生支持 Apple silicon 和 Intel Mac。

## 安装

从 [GitHub Releases](https://github.com/rrbe/Kap/releases) 下载最新 DMG。Apple silicon 选择 `arm64`，Intel Mac 选择 `x64`。Kap 要求 macOS 13 或更高版本。

发行包使用 ad-hoc 签名，未经过 Apple 公证，并且需要手动升级。将 Kap 复制到 `/Applications` 后，在首次启动前移除隔离属性：

```sh
xattr -dr com.apple.quarantine /Applications/Kap.app
```

请只对从本仓库下载且确认可信的发行包运行此命令。

## 使用

点击菜单栏图标，选择录制区域并按下录制按钮。再次点击图标即可停止。录制期间可以按住 Option 点击图标暂停，或右键点击查看更多操作。

在编辑器中调整片段，然后选择导出格式和输出方式并开始转换。

## 开发

```sh
nvm install
corepack enable
pnpm install --frozen-lockfile
pnpm start
```

运行 `pnpm test` 执行 lint 和自动化测试，运行 `pnpm build` 生成生产构建。

## 许可证

Kap 使用 [MIT License](LICENSE.md)。
