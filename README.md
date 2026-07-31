# 替马斯克花钱（Spend Money for Musk）

纯前端单机趣味小游戏：在预算内为马斯克「剁手」，体验花钱的快乐。

## 单机版特性

- **纯静态**：`index.html` + `css/` + `js/` + `data/products.json`，零依赖、无构建步骤。
- **数据驱动**：商品列表在 `data/products.json`，改商品先改 JSON。
- **无需联网**：购买逻辑全部在浏览器本地运行。
- **数据本地**：购物车 / 预算状态保存在本机 `localStorage`。

## 本地运行

```sh
cd spend-money-for-musk
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

或直接用浏览器打开 `index.html`。

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

可部署到 Cloudflare Pages。

## 版本

当前分支：`release/1.0.0`
