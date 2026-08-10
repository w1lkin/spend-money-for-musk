# CHANGELOG

## [2.0.0] - 2026-08-10

### Docs
- 新建 `AGENTS.md`（项目架构与 AI 协作指南）
- 更新 `README.md`，统一格式

---

## [1.0.0] - 2026-07

### Added
- 替马斯克花钱初始版本：趣味消费模拟游戏
- `index.html` + `css/` + `js/` + `data/products.json`，零依赖
- 数据驱动：商品列表在 `data/products.json`
- 购物车 / 预算状态 localStorage 持久化
- 分享卡片生成（1200×1600 Canvas + QR 码）
- 移动端适配 + 微信 webview 优化

### Changed
- 接入 GamePlatform 登录门
- 移除顶部用户栏与天梯榜浮层
- 底部 tab "首页"→"主页"，"门户"→"游戏"
- 域名改回 Cloudflare Pages 默认域名 `spend-money-for-musk.pages.dev`
- 部署至 Cloudflare Pages
