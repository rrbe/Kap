# 依赖版本策略

记录日期：2026-07-22

## 安装与检查

项目使用 pnpm 10 和 hoisted `node_modules` 布局：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm audit --prod
```

`postinstall` 会先确保 Electron 二进制已下载，再由 electron-builder 为 Electron 43 ABI 重建原生模块。`pnpm.onlyBuiltDependencies` 只放行 Electron 和 FFmpeg 的安装脚本；`mac-screen-capture-permissions` 的 Node ABI 安装脚本被忽略，由 electron-builder 生成与 Electron 匹配的版本。

项目根目录统一使用 pnpm，不包含运行时包管理器或第三方插件安装链路。

## 当前规模

当前有 15 个直接运行时依赖和 26 个直接开发依赖。生产依赖审计应在每次发布前通过 `pnpm audit --prod` 复核。

项目内的 universal Swift 助手提供录屏和系统集成能力，避免通过只包含 Intel 二进制的旧依赖启动 Rosetta 进程。

## 有意保留的版本

| 依赖 | 当前版本线 | 暂不升级主版本的原因 |
| --- | --- | --- |
| `electron-store` | 8 | 11 为 ESM-only，而 Electron main 当前仍编译为 CommonJS |
| `execa` | 5 | 10 为 ESM-only，现有 FFmpeg 与系统进程调用仍由 CommonJS main 加载 |
| `p-cancelable` | 2 | 4 为 ESM-only，当前转换和导出取消流程直接依赖 v2 API |
| `plist` | 3 | 5 为 ESM-only，仅用于 macOS 文件剪贴板 property list |
| Babel | 7.29 | Babel 8 与当前 styled-jsx/Rolldown 构建组合不兼容 |
| AVA | 6.4 | AVA 8 要求 Node 24.12 以上，而当前开发环境与 Electron 对齐在 Node 24.11 |
| TypeScript | 5.7 | 与 XO 0.60 内置的 TypeScript ESLint 版本匹配 |
| XO / XO React | 0.60 / 0.27 | 新版迁移需要改用 ESLint flat config，应单独审查规则变化 |
| `type-fest` | 4 | v5 要求 TypeScript 5.9、ESM 和 strict，而当前 main 为 CommonJS |
| `@types/node` | 24 | 与 Electron 43 内置的 Node 24 API 对齐 |

升级 ESM-only 运行时依赖的共同前置条件是将 Electron main 迁移为 ESM。该迁移应作为独立变更进行。
