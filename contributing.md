# Contributing

1. [Fork](https://help.github.com/articles/fork-a-repo/) this repository to your own GitHub account and then [clone](https://help.github.com/articles/cloning-a-repository/) it to your local device
2. Install the Node.js version from `.nvmrc`, then enable Corepack: `nvm install && corepack enable`
3. Install the dependencies: `pnpm install --frozen-lockfile`
4. Run the checks: `pnpm lint && pnpm test:main && pnpm build`
5. Build the code, start the app, and watch for changes: `pnpm start`

To make sure that your code works in the finished app, you can generate the binary:

```sh
pnpm run pack
```

After that, you'll see the app in the `dist` folder. Kap requires macOS 13 or newer.
