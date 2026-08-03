# 替马斯克花钱（Spend Money for Musk）

纯前端趣味消费模拟游戏：在预算内为马斯克「剁手」，体验花钱的快乐。

## 特性

- **纯静态**：`index.html` + `css/` + `js/` + `data/products.json`，零依赖、无构建步骤。
- **数据驱动**：商品列表在 `data/products.json`，改商品先改 JSON。
- **无需联网**：购买逻辑全部在浏览器本地运行。
- **数据本地**：购物车 / 预算状态保存在本机 `localStorage`。
- **移动端适配**：针对触屏与微信 webview 优化。
- **分享卡片**：游戏内可生成 1200×1600 分享图（二维码需联网）。

## 本地运行

```sh
cd spend-money-for-musk
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

> 分享卡片的二维码依赖 `api.qrserver.com`，必须经 `http(s)` 来源加载，请用本地服务器方式打开，不要直接 `file://` 打开。

## 文件结构

```
spend-money-for-musk/
├── index.html
├── css/
├── js/
└── data/
    └── products.json   # 商品数据
```

## 部署

已部署至 Cloudflare Pages：`spend-money-for-musk.pages.dev`
