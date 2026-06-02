# Liquidation Price Calculator

一个轻量的 Mac 本地强平价格计算器。前端使用 Vite + React + TypeScript，桌面端使用 Tauri 打包，避免 Electron 的高内存占用。

## 本地开发

本地只需要 Node.js，不需要安装 Rust：

```bash
npm install
npm run dev
```

本地开发命令只启动前端页面，用于调试计算逻辑和界面。`.dmg` 桌面安装包通过 GitHub Actions 在线构建。

## GitHub Actions 构建 DMG

推送到 `main` 或 `master` 后，或在 GitHub Actions 页面手动运行 `Build macOS App` 工作流。工作流会在 `macos-latest` runner 上安装 Rust、构建 Tauri 应用，并上传 `.dmg` 和 `.app` 构建产物。

## 计算模型

当前实现采用简化逐仓模型，同时输出做多和做空强平价：

- 杠杆模式：输入现价、杠杆倍数、维持保证金率。
- 保证金模式：输入现价、保证金总额、仓位、维持保证金率。
- 仓位单位支持 `手` 和 `USDT`；`手` 按标的数量计算，`USDT` 按名义价值除以现价换算成标的数量。

实际交易所强平价还会受手续费、资金费率、阶梯维持保证金、风险限额、滑点和标记价格规则影响，本工具用于快速估算。
