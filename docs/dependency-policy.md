# 依赖版本策略

记录日期：2026-07-21

## 安装与检查

项目使用 pnpm 10 和 hoisted `node_modules` 布局：

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test:main
pnpm build
pnpm audit --prod
```

`postinstall` 会先确保 Electron 二进制已下载，再用 electron-builder 为 Electron 43 ABI 重建原生模块。`pnpm.onlyBuiltDependencies` 只包含 Electron 和 FFmpeg；`mac-screen-capture-permissions` 自身的 Node ABI 安装脚本被忽略，由 electron-builder 直接生成正确的 Electron ABI 版本。

插件管理器仍使用 Yarn 1 安装第三方 Kap 插件。它属于插件协议的一部分，不是根项目的包管理器；在插件安装流程迁移前保留。

## 当前规模

| 项目 | 旧基线 | 当前 |
| --- | ---: | ---: |
| 直接运行时依赖 | 58 | 25 |
| 直接开发依赖 | 36 | 28 |
| `node_modules` | 813 MB | 746 MB |

生产依赖审计当前没有已知漏洞。`pnpm outdated` 中仍显示的直接依赖均属于下面的明确兼容边界。

## 有意保留的版本

| 依赖 | 当前版本线 | 不升级到最新主版本的原因 |
| --- | --- | --- |
| `electron-store` | 8 | 11 为 ESM-only；main 与现有插件 ABI 仍是 CommonJS |
| `execa` | 5 | 10 为 ESM-only；转换、FFmpeg 和插件进程调用仍由 CommonJS main 加载 |
| `got` | 11.8.6 | 11 是最后一个 CommonJS 版本线，并已包含该版本线的安全修复；15 为 ESM-only |
| `p-cancelable` | 2 | 4 为 ESM-only；当前转换和插件取消协议直接依赖 v2 API |
| `plist` | 3 | 5 为 ESM-only；仅用于 macOS 文件剪贴板 property list |
| Babel | 7.29 | Babel 8 与当前 styled-jsx/Rolldown 构建组合会停在 transform 阶段；回退后构建恢复到约 0.6 秒 |
| AVA | 6.4 | AVA 8 要求 Node 24.12 以上，而当前开发环境与 Electron 对齐在 Node 24.11/24.x |
| TypeScript | 5.7 | 与 XO 0.60 内置的 TypeScript ESLint 版本匹配；TypeScript 7 与当前 parser 不兼容 |
| XO / XO React | 0.60 / 0.27 | XO 4 和新版 React config 要求 ESLint flat config；迁移不会改善应用运行性能，独立处理更容易审查规则变化 |
| `type-fest` | 4 | v5 要求 TypeScript 5.9、ESM 和 strict；当前 main 为 CommonJS、TypeScript 5.7 |
| `@types/node` | 24 | 与 Electron 43 内置的 Node 24 API 对齐，不使用宿主 Node 26 类型 |

升级上述运行时包的共同前置条件是把 Electron main 改为 ESM，同时通过 `createRequire` 或新版插件协议保持旧 Kap 插件可加载。这个迁移本身不会解决 Apple Silicon 热路径，因此不与本轮性能重构捆绑。
