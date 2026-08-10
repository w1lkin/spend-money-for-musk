# 替马斯克花钱

## 项目概览

纯前端趣味消费模拟：在预算内为马斯克「剁手」，体验花钱的快乐。

- **形态**：`index.html` + `css/` + `js/` + `data/products.json`，零依赖
- **数据驱动**：商品列表在 `data/products.json`
- **数据本地**：购物车 / 预算状态保存在 `localStorage`
- **移动适配**：触屏 + 微信 webview
- **部署域名**：`https://spend-money-for-musk.pages.dev/`

## 本地运行

```sh
cd spend-money-for-musk
python3 -m http.server 8000
# 浏览器访问 http://localhost:8000
```

> 分享卡片二维码依赖 `api.qrserver.com`，需 http(s) 来源加载，**不要用 `file://` 直接打开**。

## 文件结构

```
spend-money-for-musk/
├── index.html
├── css/
├── js/
└── data/
    └── products.json   # 商品数据
```

## 约定

- **改商品先改 `data/products.json`**，不要硬编码到 JS
- `js/` 负责渲染与交互，`css/` 负责样式
- 购买逻辑全部在浏览器本地运行
