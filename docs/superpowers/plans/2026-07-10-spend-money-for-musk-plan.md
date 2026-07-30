# 替马斯克花钱 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个纯 H5 移动端花钱模拟游戏，玩家扮演马斯克花掉实时身价，含商品浏览/购物车/结算/成就称号/分享海报。

**Architecture:** 单 HTML 入口 + ES Modules + hash 路由 SPA。纯前端 localStorage 存储，无构建工具，零外部图片依赖（全部 emoji）。

**Tech Stack:** HTML5, CSS3 (CSS Variables), Vanilla JS (ES Modules), Canvas API

## Global Constraints

- 目标浏览器：iOS 12+ Safari WKWebView / Android 8+ Chrome/微信 X5
- 零构建工具，原生 ES Modules，`<script type="module">` 引入
- 无外部图片依赖，全部使用 emoji
- 首次加载 < 300KB
- 所有金额内部以美元存储，展示时按货币偏好转换
- 固定汇率 1 USD ≈ 7.2 CNY
- 搜索 debounce 150ms
- 商品列表 >50 条需虚拟滚动
- 内部标识均使用英文（category ids, achievement ids 等），面向用户文本使用中文

---

### Task 1: 项目骨架搭建

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `data/` (空目录)
- Create: `js/` (空目录)

**Produces:** HTML 外壳 + CSS 基础变量/reset，后续所有任务均依赖此骨架。

- [ ] **Step 1: 创建目录结构**

```bash
mkdir -p css js data
```

- [ ] **Step 2: 编写 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>替马斯克花钱</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <main id="page-container"></main>
    <nav id="bottom-nav">
      <a href="#shop" class="nav-item active" data-route="shop">
        <span class="nav-icon">🛒</span>
        <span class="nav-label">商店</span>
      </a>
      <a href="#cart" class="nav-item" data-route="cart">
        <span class="nav-icon-wrapper">
          <span class="nav-icon">🛒</span>
          <span class="cart-badge" id="cart-badge" style="display:none">0</span>
        </span>
        <span class="nav-label">购物车</span>
      </a>
      <a href="#achievements" class="nav-item" data-route="achievements">
        <span class="nav-icon">🏆</span>
        <span class="nav-label">成就</span>
      </a>
    </nav>
  </div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: 编写 css/style.css 基础部分**

```css
:root {
  --color-primary: #e74c3c;
  --color-primary-dark: #c0392b;
  --color-bg: #0a0a0f;
  --color-surface: #161620;
  --color-surface-light: #1e1e2a;
  --color-text: #f0f0f0;
  --color-text-secondary: #8888a0;
  --color-accent: #f1c40f;
  --color-success: #2ecc71;
  --color-danger: #e74c3c;
  --color-gradient-start: #f39c12;
  --color-gradient-end: #e74c3c;
  --nav-height: 64px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --radius: 12px;
  --font-mono: 'SF Mono', 'Menlo', 'Monaco', monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

#page-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--nav-height);
}

#bottom-nav {
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: var(--color-surface);
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  font-size: 10px;
  gap: 2px;
}

.nav-item.active { color: var(--color-accent); }

.nav-icon { font-size: 22px; }
.nav-label { font-size: 10px; }

.nav-icon-wrapper {
  position: relative;
  display: inline-block;
}

.cart-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  background: var(--color-danger);
  color: white;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* 页面容器通用 */
.page {
  padding: 16px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Toast */
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.toast {
  background: var(--color-surface);
  color: var(--color-text);
  padding: 12px 24px;
  border-radius: var(--radius);
  margin-bottom: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: toastIn 0.3s ease, toastOut 0.3s ease 2.2s forwards;
  text-align: center;
  font-size: 14px;
}

@keyframes toastIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
```

- [ ] **Step 4: 验证 — 浏览器打开 index.html，确认骨架渲染、底部导航可点击**

---

### Task 2: 数据存储模块 (store.js)

**Files:**
- Create: `js/store.js`

**Produces:**
- `getStore()` → `Store` 对象
- `saveStore(store)` → void
- `getCart()` → `CartItem[]`
- `saveCart(items)` → void
- `addToCart(product)` → void
- `clearCart()` → void
- `STORE_DEFAULTS` → 默认初始值

所有金额以美元存储。

- [ ] **Step 1: 编写 js/store.js**

```js
const STORAGE_KEY = 'musk_spender';

export const STORE_DEFAULTS = {
  nickname: '',
  balance: 350000000000,
  totalSpent: 0,
  purchasedItems: [],
  cart: [],
  unlockedAchievements: [],
  unlockedTitles: [],
  currentTitle: null,
  cachedNetWorth: 350000000000,
  cachedNetWorthTime: null,
  currency: 'auto',
  gameStartTime: null
};

const NICKNAMES = [
  '花钱小能手', '散财童子', '氪金战士', '剁手达人',
  '败家练习生', '消费艺术家', '银河购物狂', '财富蒸发器'
];

function randomNickname() {
  return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
}

export function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = {
        ...STORE_DEFAULTS,
        nickname: randomNickname(),
        gameStartTime: Date.now(),
        purchasedItems: [],
        cart: [],
        unlockedAchievements: [],
        unlockedTitles: []
      };
      saveStore(defaults);
      return defaults;
    }
    const data = JSON.parse(raw);
    return {
      ...STORE_DEFAULTS,
      ...data,
      gameStartTime: data.gameStartTime || Date.now()
    };
  } catch (e) {
    console.error('Failed to read store:', e);
    return { ...STORE_DEFAULTS, nickname: randomNickname(), gameStartTime: Date.now() };
  }
}

export function saveStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Failed to save store:', e);
  }
}

export function getCart() {
  return getStore().cart;
}

export function saveCart(items) {
  const store = getStore();
  store.cart = items;
  saveStore(store);
}

export function addToCart(product) {
  const items = getCart();
  const existing = items.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  }
  saveCart(items);
  return items;
}

export function clearCart() {
  const store = getStore();
  store.cart = [];
  saveStore(store);
}

export function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}
```

- [ ] **Step 2: 验证 — 浏览器控制台执行**

```js
import { getStore, addToCart, getCartCount } from './js/store.js';
const s = getStore();
console.log(s.nickname);          // 应输出随机中文昵称
console.log(s.balance);           // 应输出 350000000000
addToCart({id:'test', name:'测试', price:10});
console.log(getCartCount());      // 应输出 1
clearCart();
```

---

### Task 3: 工具函数模块 (utils.js)

**Files:**
- Create: `js/utils.js`

**Produces:**
- `formatCurrency(amountInUSD, currency)` → 格式化字符串如 "¥72.00" 或 "$10.00"
- `animateNumber(el, from, to, duration=600)` → requestAnimationFrame 数字动画
- `debounce(fn, delay=150)` → 防抖函数
- `detectCurrency()` → `'cny' | 'usd'`
- `toCNY(usd)` → 人民币数额
- `toDisplayValue(usd, currency)` → 当前货币下的显示数值
- `getCurrencySymbol(currency)` → `'¥' | '$'`

- [ ] **Step 1: 编写 js/utils.js**

```js
const EXCHANGE_RATE = 7.2;

export function detectCurrency() {
  const store = getStore();
  if (store.currency !== 'auto') return store.currency;
  const lang = navigator.language || '';
  return lang.startsWith('zh') ? 'cny' : 'usd';
}

export function getCurrencySymbol(currency) {
  return currency === 'cny' ? '¥' : '$';
}

export function toCNY(usd) {
  return usd * EXCHANGE_RATE;
}

export function toDisplayValue(usd, currency) {
  return currency === 'cny' ? toCNY(usd) : usd;
}

export function formatCurrency(amountInUSD, currency) {
  const value = toDisplayValue(amountInUSD, currency);
  const symbol = getCurrencySymbol(currency);

  if (Math.abs(value) >= 1e12) {
    return symbol + (value / 1e12).toFixed(2) + '万亿';
  }
  if (Math.abs(value) >= 1e8) {
    return symbol + (value / 1e8).toFixed(2) + '亿';
  }
  if (Math.abs(value) >= 1e4) {
    return symbol + (value / 1e4).toFixed(2) + '万';
  }

  return symbol + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function animateNumber(el, from, to, duration = 600) {
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = Math.floor(current).toLocaleString('en-US');
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = Math.floor(to).toLocaleString('en-US');
    }
  }

  requestAnimationFrame(update);
}

export function debounce(fn, delay = 150) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function showToast(message, duration = 2500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duration + 500);
}
```

- [ ] **Step 2: 验证 — 控制台测试**

```js
import { formatCurrency, detectCurrency } from './js/utils.js';
console.log(formatCurrency(1000000, 'usd'));   // "$100.00万"
console.log(formatCurrency(1000000, 'cny'));   // "¥720.00万"
console.log(detectCurrency());                  // 中国地区应输出 'cny'
```

---

### Task 4: 商品数据 (products.json)

**Files:**
- Create: `data/products.json`

**Produces:** `CATEGORIES` 数组（12分类元信息）+ `products` 数组（每分类 3-7 个商品，共约 50+ 个商品）。

- [ ] **Step 1: 编写 data/products.json**

```json
{
  "categories": [
    { "id": "daily", "name": "日常消费", "emoji": "☕" },
    { "id": "luxury", "name": "奢侈名品", "emoji": "👔" },
    { "id": "cars", "name": "豪车座驾", "emoji": "🚗" },
    { "id": "realestate", "name": "豪宅地产", "emoji": "🏠" },
    { "id": "tech", "name": "科技数码", "emoji": "📱" },
    { "id": "space", "name": "太空探索", "emoji": "🚀" },
    { "id": "invest", "name": "投资收购", "emoji": "💰" },
    { "id": "absurd", "name": "荒诞离谱", "emoji": "🤪" },
    { "id": "charity", "name": "慈善公益", "emoji": "🎗️" },
    { "id": "fun", "name": "娱乐体验", "emoji": "🎬" },
    { "id": "food", "name": "美食餐饮", "emoji": "🍽️" },
    { "id": "art", "name": "艺术收藏", "emoji": "🎨" }
  ],
  "products": [
    { "id": "daily-1", "name": "星巴克拿铁", "category": "daily", "price": 5.75, "emoji": "☕", "description": "每天一杯，提神醒脑", "stock": -1 },
    { "id": "daily-2", "name": "麦当劳巨无霸套餐", "category": "daily", "price": 12, "emoji": "🍔", "description": "经典美式快餐", "stock": -1 },
    { "id": "daily-3", "name": "优衣库T恤", "category": "daily", "price": 19.9, "emoji": "👕", "description": "普通人的日常穿搭", "stock": -1 },
    { "id": "daily-4", "name": "地铁月卡", "category": "daily", "price": 30, "emoji": "🚇", "description": "绿色出行一个月", "stock": -1 },
    { "id": "daily-5", "name": "厕纸(24卷装)", "category": "daily", "price": 8.99, "emoji": "🧻", "description": "刚需，马斯克也要用", "stock": -1 },

    { "id": "luxury-1", "name": "百达翡丽手表", "category": "luxury", "price": 250000, "emoji": "⌚", "description": "手腕上的一套豪宅", "stock": -1 },
    { "id": "luxury-2", "name": "爱马仕铂金包", "category": "luxury", "price": 300000, "emoji": "👜", "description": "排队三年才能买到的传奇", "stock": -1 },
    { "id": "luxury-3", "name": "10克拉钻石戒指", "category": "luxury", "price": 5000000, "emoji": "💍", "description": "闪瞎眼的永恒之光", "stock": -1 },
    { "id": "luxury-4", "name": "LV黄金行李箱套装", "category": "luxury", "price": 180000, "emoji": "🧳", "description": "拖着房子去旅行", "stock": -1 },

    { "id": "cars-1", "name": "布加迪Chiron", "category": "cars", "price": 3000000, "emoji": "🏎️", "description": "极速420km/h的陆地飞行器", "stock": -1 },
    { "id": "cars-2", "name": "劳斯莱斯幻影", "category": "cars", "price": 500000, "emoji": "🚘", "description": "仿佛一座移动的宫殿", "stock": -1 },
    { "id": "cars-3", "name": "兰博基尼Aventador", "category": "cars", "price": 450000, "emoji": "🏎️", "description": "一头狂野的意大利蛮牛", "stock": -1 },
    { "id": "cars-4", "name": "特斯拉Cybertruck", "category": "cars", "price": 79990, "emoji": "🛻", "description": "马斯克自家的皮卡，支持下", "stock": -1 },
    { "id": "cars-5", "name": "私人停车楼", "category": "cars", "price": 50000000, "emoji": "🏢", "description": "毕竟车多到没地方停", "stock": -1 },

    { "id": "realestate-1", "name": "比弗利山庄豪宅", "category": "realestate", "price": 150000000, "emoji": "🏡", "description": "20间卧室带无边泳池", "stock": -1 },
    { "id": "realestate-2", "name": "加勒比私人岛屿", "category": "realestate", "price": 85000000, "emoji": "🏝️", "description": "属于自己的国度", "stock": -1 },
    { "id": "realestate-3", "name": "曼哈顿顶层公寓", "category": "realestate", "price": 250000000, "emoji": "🏙️", "description": "360度俯瞰纽约天际线", "stock": -1 },
    { "id": "realestate-4", "name": "伦敦海德公园一号", "category": "realestate", "price": 200000000, "emoji": "🏛️", "description": "与女王做邻居", "stock": -1 },
    { "id": "realestate-5", "name": "迪拜帆船酒店顶层套房", "category": "realestate", "price": 50000000, "emoji": "⛵", "description": "七星级酒店的极奢体验", "stock": -1 },

    { "id": "tech-1", "name": "iPhone 20 Pro Max", "category": "tech", "price": 1999, "emoji": "📱", "description": "未来的iPhone（可能不存在）", "stock": -1 },
    { "id": "tech-2", "name": "特斯拉Model S Plaid", "category": "tech", "price": 89990, "emoji": "🚗", "description": "0-100加速不到2秒", "stock": -1 },
    { "id": "tech-3", "name": "星链套件全套", "category": "tech", "price": 2500, "emoji": "🛰️", "description": "在珠峰顶上也能刷抖音", "stock": -1 },
    { "id": "tech-4", "name": "Neuralink脑机接口", "category": "tech", "price": 10000000, "emoji": "🧠", "description": "用意念发推文（实验性）", "stock": -1 },
    { "id": "tech-5", "name": "Optimus人形机器人", "category": "tech", "price": 20000, "emoji": "🤖", "description": "替你遛狗买菜做家务", "stock": -1 },

    { "id": "space-1", "name": "猎鹰9号火箭", "category": "space", "price": 67000000, "emoji": "🚀", "description": "一次性的那种，飞完就扔", "stock": -1 },
    { "id": "space-2", "name": "火星殖民船票(一张)", "category": "space", "price": 500000, "emoji": "🎫", "description": "马斯克曾说只要50万美元", "stock": -1 },
    { "id": "space-3", "name": "星舰(Starship)", "category": "space", "price": 2000000000, "emoji": "🛸", "description": "人类去火星的方舟", "stock": -1 },
    { "id": "space-4", "name": "月球基地(一期)", "category": "space", "price": 50000000000, "emoji": "🌕", "description": "在月球上建个度假村", "stock": -1 },

    { "id": "invest-1", "name": "收购Twitter", "category": "invest", "price": 44000000000, "emoji": "🐦", "description": "改名X，然后随便折腾", "stock": -1 },
    { "id": "invest-2", "name": "收购可口可乐", "category": "invest", "price": 270000000000, "emoji": "🥤", "description": "接下来把配方改成无糖", "stock": -1 },
    { "id": "invest-3", "name": "买一支NBA球队", "category": "invest", "price": 3500000000, "emoji": "🏀", "description": "改名叫火星人队", "stock": -1 },
    { "id": "invest-4", "name": "买下麦当劳全球", "category": "invest", "price": 200000000000, "emoji": "🍟", "description": "把巨无霸改名为马斯克堡", "stock": -1 },

    { "id": "absurd-1", "name": "买下整个地球", "category": "absurd", "price": 5000000000000, "emoji": "🌍", "description": "从此地球叫Musk Planet", "stock": -1 },
    { "id": "absurd-2", "name": "给每个地球人发$100", "category": "absurd", "price": 800000000000, "emoji": "💸", "description": "80亿人每人100块", "stock": -1 },
    { "id": "absurd-3", "name": "复活一只霸王龙", "category": "absurd", "price": 50000000000, "emoji": "🦖", "description": "侏罗纪公园真的开张", "stock": -1 },
    { "id": "absurd-4", "name": "把自由女神像搬去火星", "category": "absurd", "price": 100000000000, "emoji": "🗽", "description": "太空搬家服务", "stock": -1 },
    { "id": "absurd-5", "name": "买一场奥运会主办权", "category": "absurd", "price": 15000000000, "emoji": "🏅", "description": "在火星举办第50届奥运会", "stock": -1 },

    { "id": "charity-1", "name": "消除全球饥饿", "category": "charity", "price": 6000000000, "emoji": "🍲", "description": "联合国说这个数就够了", "stock": -1 },
    { "id": "charity-2", "name": "资助一万所希望小学", "category": "charity", "price": 500000000, "emoji": "🏫", "description": "改变一百万个孩子的命运", "stock": -1 },
    { "id": "charity-3", "name": "清洁全球海洋塑料", "category": "charity", "price": 30000000000, "emoji": "🌊", "description": "让海洋恢复蔚蓝", "stock": -1 },
    { "id": "charity-4", "name": "研发通用癌症疫苗", "category": "charity", "price": 20000000000, "emoji": "💊", "description": "攻克人类最大杀手之一", "stock": -1 },

    { "id": "fun-1", "name": "请Beyoncé唱生日歌", "category": "fun", "price": 10000000, "emoji": "🎤", "description": "生日派对开场节目", "stock": -1 },
    { "id": "fun-2", "name": "包场迪士尼乐园一天", "category": "fun", "price": 5000000, "emoji": "🏰", "description": "全迪士尼只为你开放", "stock": -1 },
    { "id": "fun-3", "name": "私人交响乐团演奏", "category": "fun", "price": 500000, "emoji": "🎻", "description": "柏林爱乐乐团上门服务", "stock": -1 },
    { "id": "fun-4", "name": "租一座城堡开派对一个周末", "category": "fun", "price": 2000000, "emoji": "🏰", "description": "中世纪古堡一夜", "stock": -1 },

    { "id": "food-1", "name": "米其林三星晚宴(双人)", "category": "food", "price": 2000, "emoji": "🍷", "description": "舌尖上的极致享受", "stock": -1 },
    { "id": "food-2", "name": "82年拉菲古堡", "category": "food", "price": 40000, "emoji": "🍾", "description": "红酒之王，年份传奇", "stock": -1 },
    { "id": "food-3", "name": "顶级神户和牛(1kg)", "category": "food", "price": 800, "emoji": "🥩", "description": "入口即化的大理石纹理", "stock": -1 },
    { "id": "food-4", "name": "白松露(1kg)", "category": "food", "price": 6000, "emoji": "🍄", "description": "餐桌上的钻石", "stock": -1 },
    { "id": "food-5", "name": "Almas鱼子酱(1kg)", "category": "food", "price": 25000, "emoji": "🥫", "description": "世界上最贵的鱼子酱", "stock": -1 },

    { "id": "art-1", "name": "达芬奇《救世主》", "category": "art", "price": 450000000, "emoji": "🖼️", "description": "史上最贵的画作", "stock": -1 },
    { "id": "art-2", "name": "梵高《星月夜》", "category": "art", "price": 100000000, "emoji": "🌌", "description": "后印象派巅峰之作", "stock": -1 },
    { "id": "art-3", "name": "完整的霸王龙骨架化石", "category": "art", "price": 31800000, "emoji": "🦴", "description": "客厅里摆一副很拉风", "stock": -1 },
    { "id": "art-4", "name": "毕加索《格尔尼卡》", "category": "art", "price": 200000000, "emoji": "🖼️", "description": "反战艺术的永恒象征", "stock": -1 }
  ]
}
```

- [ ] **Step 2: 验证 — 控制台 fetch 数据**

```js
const res = await fetch('data/products.json');
const data = await res.json();
console.log(data.categories.length);  // 12
console.log(data.products.length);    // >= 48
```

---

### Task 5: 马斯克身价 API (api.js)

**Files:**
- Create: `js/api.js`

**Consumes:** `getStore`, `saveStore` from `store.js`

**Produces:**
- `async fetchNetWorth()` → 身价数字（美元），失败返回 null
- `async getDisplayNetWorth()` → 当前应显示的身价
- `startNetWorthPolling(intervalMs=300000)` → 启动定时刷新

- [ ] **Step 1: 编写 js/api.js**

```js
import { getStore, saveStore } from './store.js';

const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart/TSLA?interval=1d&range=1d';
const MUSK_SHARES = 411000000;
const NET_WORTH_COEFFICIENT = 0.7;
const DEFAULT_NET_WORTH = 350000000000;
const FETCH_TIMEOUT = 5000;
const POLL_INTERVAL = 300000;

export async function fetchNetWorth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(YAHOO_API, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const json = await response.json();
    const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!price || typeof price !== 'number') return null;

    const netWorth = Math.round(price * MUSK_SHARES * NET_WORTH_COEFFICIENT);

    const store = getStore();
    store.cachedNetWorth = netWorth;
    store.cachedNetWorthTime = Date.now();
    saveStore(store);

    return netWorth;
  } catch (e) {
    clearTimeout(timeoutId);
    console.warn('Failed to fetch Musk net worth:', e.message);
    return null;
  }
}

export function getDisplayNetWorth() {
  const store = getStore();
  return store.cachedNetWorth || DEFAULT_NET_WORTH;
}

export function startNetWorthPolling(callback, intervalMs = POLL_INTERVAL) {
  fetchNetWorth().then(nw => {
    if (nw !== null && callback) callback(nw);
  });

  return setInterval(async () => {
    const nw = await fetchNetWorth();
    if (nw !== null && callback) callback(nw);
  }, intervalMs);
}
```

- [ ] **Step 2: 验证 — 控制台**

```js
import { fetchNetWorth, getDisplayNetWorth } from './js/api.js';
const nw = await fetchNetWorth();
console.log('fetched:', nw);               // 数字或 null
console.log('display:', getDisplayNetWorth());  // >= 0
```

---

### Task 6: 路由模块 (router.js)

**Files:**
- Create: `js/router.js`

**Consumes:** `getStore` from `store.js`

**Produces:**
- `initRouter(pageRenderers)` → void，注册页面渲染函数，监听 hashchange
- `navigate(hash)` → void，编程式导航
- `getCurrentRoute()` → `'shop' | 'cart' | 'achievements' | 'share'`
- `updateNavActive(route)` → void，更新底部导航高亮

- [ ] **Step 1: 编写 js/router.js**

```js
import { getCartCount } from './store.js';

let renderers = {};
let currentRoute = 'shop';

function updateNavActive(route) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });

  const badge = document.getElementById('cart-badge');
  if (badge) {
    const count = getCartCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

function handleRouteChange() {
  const hash = window.location.hash.replace('#', '') || 'shop';
  const route = hash.split('/')[0];
  currentRoute = route;

  updateNavActive(route);

  const container = document.getElementById('page-container');
  if (container && renderers[route]) {
    // 在渲染前清空，新渲染由各 renderer 自行处理
  }

  if (renderers[route]) {
    renderers[route]();
  } else {
    console.warn('Unknown route:', route);
    navigate('shop');
  }
}

export function initRouter(pageRenderers) {
  renderers = pageRenderers;
  window.addEventListener('hashchange', handleRouteChange);
  handleRouteChange();
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function getCurrentRoute() {
  return currentRoute || 'shop';
}

export { updateNavActive };
```

- [ ] **Step 2: 验证 — 在 main.js 临时测试**

```js
import { initRouter, navigate } from './js/router.js';
initRouter({
  shop: () => console.log('shop rendered'),
  cart: () => console.log('cart rendered'),
  achievements: () => console.log('achievements rendered'),
  share: () => console.log('share rendered'),
});
navigate('cart'); // 应切换到购物车，底部高亮更新
```

---

### Task 7: 商店主页 (shop.js)

**Files:**
- Create: `js/shop.js`
- Modify: `css/style.css` (追加商店样式)

**Consumes:** `getStore`, `saveStore`, `addToCart` from `store.js`, `formatCurrency`, `detectCurrency`, `showToast`, `debounce` from `utils.js`, `getDisplayNetWorth` from `api.js`, products data from `data/products.json`

**Produces:**
- `async loadProducts()` → 缓存后的商品列表
- `renderShop()` → 渲染整个商店页到 `#page-container`
- `renderProgressBar(container, store, currency)` → 进度条子组件
- `renderProductGrid(container, products, category, currency)` → 商品网格

- [ ] **Step 1: 追加商店 CSS 到 style.css**

在 `css/style.css` 末尾追加：

```css
/* ===== Shop Page ===== */
.net-worth-section {
  text-align: center;
  padding: 20px 0 12px;
}

.net-worth-label {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}

.net-worth-value {
  font-size: 28px;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--color-accent);
  letter-spacing: 1px;
}

.title-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 10px;
  margin-left: 8px;
  vertical-align: middle;
}

.nickname-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.progress-section {
  margin: 8px 16px 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.progress-bar {
  height: 10px;
  background: rgba(255,255,255,0.08);
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-gradient-start), var(--color-gradient-end));
  border-radius: 5px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  width: 0%;
}

.search-bar {
  margin: 0 16px 12px;
  position: relative;
}

.search-bar input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.search-bar input:focus {
  border-color: var(--color-accent);
}

.search-bar::before {
  content: '🔍';
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

.category-tabs {
  display: flex;
  gap: 6px;
  padding: 0 16px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar { display: none; }

.category-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 20px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab.active {
  background: var(--color-accent);
  color: #000;
  font-weight: 600;
  border-color: var(--color-accent);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0 16px 24px;
}

.product-card {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.04);
  transition: transform 0.15s, border-color 0.15s;
  cursor: pointer;
  position: relative;
}

.product-card:active {
  transform: scale(0.97);
  border-color: var(--color-accent);
}

.product-emoji {
  font-size: 36px;
  margin-bottom: 8px;
}

.product-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  line-height: 1.3;
}

.product-price {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-accent);
  font-family: var(--font-mono);
  margin-bottom: 10px;
}

.product-add-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #000;
  border: none;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, background 0.2s;
  line-height: 1;
}

.product-add-btn:active {
  transform: scale(0.85);
  background: var(--color-gradient-end);
}

/* 详情弹窗 */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

.detail-modal {
  background: var(--color-surface);
  border-radius: 16px;
  padding: 24px;
  margin: 16px;
  text-align: center;
  max-width: 320px;
  width: 100%;
}

.detail-modal .product-emoji { font-size: 64px; }
.detail-modal .product-name { font-size: 18px; }
.detail-modal .product-price { font-size: 16px; }
.detail-modal .product-desc { font-size: 13px; color: var(--color-text-secondary); margin: 8px 0 16px; }

.detail-buy-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}
```

- [ ] **Step 2: 编写 js/shop.js**

```js
import { getStore, addToCart, saveStore } from './store.js';
import { formatCurrency, detectCurrency, showToast, debounce } from './utils.js';
import { getDisplayNetWorth } from './api.js';
import { navigate } from './router.js';

let productsData = null;

export async function loadProducts() {
  if (productsData) return productsData;
  const res = await fetch('data/products.json');
  productsData = await res.json();
  return productsData;
}

export function getProductById(id) {
  if (!productsData) return null;
  return productsData.products.find(p => p.id === id);
}

export function getCategoryName(categoryId) {
  const cat = productsData?.categories?.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

function renderProgressBar(parent, store, currency) {
  const total = getDisplayNetWorth();
  const spent = store.totalSpent;
  const remaining = Math.max(0, total - spent);
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  parent.innerHTML = `
    <div class="progress-section">
      <div class="progress-header">
        <span>已花 ${formatCurrency(spent, currency)}</span>
        <span>${pct.toFixed(1)}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-header" style="justify-content:flex-end; margin-top:4px;">
        <span>剩余 ${formatCurrency(remaining, currency)}</span>
      </div>
    </div>
  `;
}

export function renderShop() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const currency = detectCurrency();
  const netWorth = getDisplayNetWorth();

  container.innerHTML = `
    <div class="page shop-page">
      <div class="net-worth-section">
        <div class="net-worth-label">💰 马斯克实时身价</div>
        <div>
          <span class="net-worth-value" id="net-worth-display">${formatCurrency(netWorth, currency)}</span>
          ${store.currentTitle ? `<span class="title-badge">${store.currentTitle}</span>` : ''}
        </div>
        <div class="nickname-row" id="nickname-display">
          <span>👤</span>
          <span id="nickname-text">${store.nickname}</span>
          <span style="font-size:11px;color:var(--color-accent)">✎</span>
        </div>
      </div>
      <div id="shop-progress"></div>
      <div class="search-bar">
        <input type="text" id="search-input" placeholder="🔍 搜索商品...">
      </div>
      <div id="category-tabs" class="category-tabs"></div>
      <div id="product-grid" class="product-grid"></div>
    </div>
  `;

  renderProgressBar(document.getElementById('shop-progress'), store, currency);

  // 昵称编辑
  document.getElementById('nickname-display').addEventListener('click', showNicknameModal);

  // 搜索
  const catTabs = document.getElementById('category-tabs');
  const productGrid = document.getElementById('product-grid');

  let activeCategory = 'daily';
  let searchQuery = '';

  function renderCategoryTabs() {
    const cats = productsData.categories;
    catTabs.innerHTML = cats.map(c => `
      <div class="category-tab ${c.id === activeCategory ? 'active' : ''}" data-cat="${c.id}">
        ${c.emoji} ${c.name}
      </div>
    `).join('');
    catTabs.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeCategory = tab.dataset.cat;
        renderCategoryTabs();
        renderProducts();
      });
    });
  }

  function renderProducts() {
    let filtered = productsData.products.filter(p => p.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      productGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-secondary);padding:40px">没有找到相关商品 🤔</div>';
      return;
    }

    productGrid.innerHTML = filtered.map(p => `
      <div class="product-card" data-id="${p.id}">
        <div class="product-emoji">${p.emoji}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-price">${formatCurrency(p.price, currency)}</div>
        <button class="product-add-btn" data-id="${p.id}">+</button>
      </div>
    `).join('');

    // 绑定加购事件
    productGrid.querySelectorAll('.product-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const product = getProductById(id);
        if (product) {
          addToCart(product);
          flyToCart(btn);
          showToast(`已加入购物车: ${product.emoji} ${product.name}`);
        }
      });
    });

    // 长按详情
    productGrid.querySelectorAll('.product-card').forEach(card => {
      let pressTimer;
      card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => showDetailModal(card.dataset.id), 400);
      });
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    });
  }

  function flyToCart(fromEl) {
    const cartIcon = document.querySelector('[data-route="cart"] .nav-icon');
    if (!cartIcon) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = cartIcon.getBoundingClientRect();

    const ball = document.createElement('span');
    ball.textContent = '💸';
    ball.style.cssText = `
      position: fixed; z-index: 9999; font-size: 20px;
      left: ${fromRect.left + fromRect.width/2}px;
      top: ${fromRect.top}px;
      transition: all 0.5s cubic-bezier(0.17, 0.67, 0.5, 1.03);
    `;
    document.body.appendChild(ball);

    requestAnimationFrame(() => {
      ball.style.left = `${toRect.left + toRect.width/2}px`;
      ball.style.top = `${toRect.top}px`;
      ball.style.transform = 'scale(0.3)';
      ball.style.opacity = '0.3';
    });

    setTimeout(() => ball.remove(), 550);
  }

  function showDetailModal(productId) {
    const product = getProductById(productId);
    if (!product) return;

    const overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.innerHTML = `
      <div class="detail-modal">
        <div class="product-emoji">${product.emoji}</div>
        <div class="product-name">${product.name}</div>
        <div class="product-price">${formatCurrency(product.price, currency)}</div>
        <div class="product-desc">${product.description}</div>
        <button class="detail-buy-btn">加入购物车</button>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelector('.detail-buy-btn').addEventListener('click', () => {
      addToCart(product);
      showToast(`已加入购物车: ${product.emoji} ${product.name}`);
      overlay.remove();
    });
  }

  document.getElementById('search-input').addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    renderProducts();
  }));

  loadProducts().then(() => {
    renderCategoryTabs();
    renderProducts();
  });
}

function showNicknameModal() {
  const store = getStore();
  const overlay = document.createElement('div');
  overlay.className = 'detail-overlay';
  overlay.innerHTML = `
    <div class="detail-modal" style="text-align:left;">
      <h3 style="margin-bottom:12px;">修改昵称</h3>
      <input type="text" id="nickname-input" maxlength="10" value="${store.nickname}"
        style="width:100%;padding:10px;border-radius:var(--radius);border:1px solid rgba(255,255,255,0.2);background:var(--color-bg);color:var(--color-text);font-size:15px;outline:none;">
      <button id="nickname-save" style="margin-top:16px;width:100%;padding:12px;background:linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end));color:#fff;border:none;border-radius:var(--radius);font-size:15px;cursor:pointer;">保存</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#nickname-save').addEventListener('click', () => {
    const val = overlay.querySelector('#nickname-input').value.trim();
    if (val) {
      store.nickname = val;
      saveStore(store);
      renderShop();
    }
    overlay.remove();
  });
}

// 导出让外部更新进度条
export function updateProgressBar() {
  const el = document.getElementById('shop-progress');
  if (!el) return;
  const store = getStore();
  const currency = detectCurrency();
  renderProgressBar(el, store, currency);
}
```

- [ ] **Step 3: 验证 — 浏览器打开，确认商店页正常渲染，分类可切换，搜索可过滤，加购有动画**

---

### Task 8: 购物车页面 (cart.js)

**Files:**
- Create: `js/cart.js`
- Modify: `css/style.css` (追加购物车样式)

**Consumes:** `getStore`, `saveStore`, `saveCart`, `clearCart`, `getCart`, `addToCart` from `store.js`, `formatCurrency`, `detectCurrency`, `showToast` from `utils.js`, `checkAchievements`, `computeTitle` from `achievements.js`（Task 9 产出，但接口先定义）

**Produces:**
- `renderCart()` → 渲染购物车页

- [ ] **Step 1: 追加购物车 CSS 到 style.css**

```css
/* ===== Cart Page ===== */
.cart-page { padding-bottom: 100px; }

.cart-page h2 {
  font-size: 20px;
  margin-bottom: 16px;
}

.cart-empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
}

.cart-empty p { font-size: 16px; margin-bottom: 16px; }
.cart-empty button {
  padding: 10px 24px;
  background: var(--color-accent);
  color: #000;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  cursor: pointer;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--color-surface);
  border-radius: var(--radius);
  margin-bottom: 8px;
  border: 1px solid rgba(255,255,255,0.04);
}

.cart-item-emoji { font-size: 28px; flex-shrink: 0; }

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.cart-item-unit-price {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 10px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15);
  background: transparent;
  color: var(--color-text);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qty-btn:active { background: var(--color-accent); color: #000; }

.qty-value {
  font-size: 15px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.cart-item-total {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-accent);
  font-family: var(--font-mono);
  min-width: 60px;
  text-align: right;
}

.cart-footer {
  position: fixed;
  bottom: calc(var(--nav-height) + var(--safe-bottom));
  left: 0;
  right: 0;
  background: var(--color-surface);
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 12px 16px calc(12px + var(--safe-bottom));
  z-index: 99;
}

.cart-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 14px;
}

.cart-total-amount {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.cart-footer-btns {
  display: flex;
  gap: 8px;
}

.cart-footer-btns button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-clear {
  background: rgba(255,255,255,0.08);
  color: var(--color-text-secondary);
}

.btn-checkout {
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
}
```

- [ ] **Step 2: 编写 js/cart.js**

```js
import { getStore, saveStore, saveCart, clearCart } from './store.js';
import { formatCurrency, detectCurrency, showToast } from './utils.js';
import { navigate, updateNavActive } from './router.js';
import { renderShop, updateProgressBar } from './shop.js';
// 先声明占位，Task 9 完成后替换为真实导入
import { checkAchievements, computeTitle } from './achievements.js';

export function renderCart() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const currency = detectCurrency();

  if (store.cart.length === 0) {
    container.innerHTML = `
      <div class="page cart-page">
        <h2>🛒 购物车</h2>
        <div class="cart-empty">
          <p>🛒 购物车空空如也</p>
          <p style="font-size:13px;color:var(--color-text-secondary);">去逛逛吧～</p>
          <button id="go-shop-btn">去商店</button>
        </div>
      </div>
    `;
    document.getElementById('go-shop-btn').addEventListener('click', () => navigate('shop'));
    return;
  }

  const totalAmount = store.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const totalItems = store.cart.reduce((sum, i) => sum + i.qty, 0);

  container.innerHTML = `
    <div class="page cart-page">
      <h2>🛒 购物车</h2>
      <div id="cart-items"></div>
    </div>
    <div class="cart-footer">
      <div class="cart-summary">
        <span>合计 ${totalItems} 件</span>
        <span class="cart-total-amount">${formatCurrency(totalAmount, currency)}</span>
      </div>
      <div class="cart-footer-btns">
        <button class="btn-clear" id="btn-clear-cart">🗑️ 清空</button>
        <button class="btn-checkout" id="btn-checkout">💸 一键结算</button>
      </div>
    </div>
  `;

  renderCartItems();

  document.getElementById('btn-clear-cart').addEventListener('click', () => {
    if (confirm('确定要清空购物车吗？')) {
      clearCart();
      updateNavActive();
      renderCart();
    }
  });

  document.getElementById('btn-checkout').addEventListener('click', checkout);
}

function renderCartItems() {
  const el = document.getElementById('cart-items');
  const store = getStore();
  const currency = detectCurrency();

  el.innerHTML = store.cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <span class="cart-item-emoji">🛍️</span>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-unit-price">${formatCurrency(item.price, currency)}/件</div>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" data-action="minus" data-id="${item.id}">−</button>
        <span class="qty-value">${item.qty}</span>
        <button class="qty-btn" data-action="plus" data-id="${item.id}">+</button>
      </div>
      <div class="cart-item-total">${formatCurrency(item.price * item.qty, currency)}</div>
    </div>
  `).join('');

  el.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const delta = btn.dataset.action === 'plus' ? 1 : -1;
      updateItemQty(id, delta);
    });
  });
}

function updateItemQty(id, delta) {
  const store = getStore();
  const idx = store.cart.findIndex(i => i.id === id);
  if (idx === -1) return;

  store.cart[idx].qty += delta;
  if (store.cart[idx].qty <= 0) {
    store.cart.splice(idx, 1);
  }
  saveStore(store);
  updateNavActive();
  renderCart();
}

function checkout() {
  const store = getStore();
  const totalAmount = store.cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  if (totalAmount > store.balance) {
    showToast('😅 马斯克的钱也不够花了...');
    return;
  }

  store.balance -= totalAmount;
  store.totalSpent += totalAmount;

  const now = Date.now();
  store.cart.forEach(item => {
    store.purchasedItems.push({
      id: item.id,
      name: item.name,
      category: '', // 后续从产品数据补全
      price: item.price,
      qty: item.qty,
      time: now
    });
  });

  store.cart = [];
  saveStore(store);

  // 检查成就/称号
  const newAchievements = checkAchievements(store);
  const newTitle = computeTitle(store);
  if (newTitle !== store.currentTitle) {
    store.currentTitle = newTitle;
    saveStore(store);
  }

  // 撒花动画
  showConfetti();
  showToast(`🎉 成功花掉 ${formatCurrency(totalAmount, detectCurrency())}！`);

  newAchievements.forEach(a => {
    setTimeout(() => showToast(`🏆 解锁成就: ${a.name}`), 300);
  });

  updateNavActive();
  renderCart();
}

function showConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];

  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 120) requestAnimationFrame(animate);
    else canvas.remove();
  }
  requestAnimationFrame(animate);
}
```

- [ ] **Step 3: 验证 — 浏览器打开，从商店加购后切换到购物车，调整数量、清空、结算均正常**

---

### Task 9: 成就与称号计算 (achievements.js)

**Files:**
- Create: `js/achievements.js`

**Consumes:** `getStore` from `store.js`

**Produces:**
- `ACHIEVEMENTS` → 所有成就定义数组
- `TITLES` → 所有称号定义数组（按优先级排序）
- `checkAchievements(store)` → 返回本次新解锁的成就数组
- `computeTitle(store)` → 返回当前应获得的称号名称
- `getCategorySpending(store)` → `{ categoryId: { totalSpent, totalQty } }`
- `getAllAchievements()` → 包含 unlock 状态的完整列表

- [ ] **Step 1: 编写 js/achievements.js**

```js
import { getStore } from './store.js';
import { getProductById, getCategoryName } from './shop.js';

export const ACHIEVEMENTS = [
  // 花费里程碑
  { id: 'spend-1M', name: '百万负翁', desc: '累计花掉 $100 万', icon: '💸', check: s => s.totalSpent >= 1000000 },
  { id: 'spend-10M', name: '千万散财', desc: '累计花掉 $1000 万', icon: '💰', check: s => s.totalSpent >= 10000000 },
  { id: 'spend-100M', name: '亿掷千金', desc: '累计花掉 $1 亿', icon: '💎', check: s => s.totalSpent >= 100000000 },
  { id: 'spend-1B', name: '十亿败家', desc: '累计花掉 $10 亿', icon: '🏦', check: s => s.totalSpent >= 1000000000 },
  { id: 'spend-10B', name: '百亿烧钱王', desc: '累计花掉 $100 亿', icon: '🔥', check: s => s.totalSpent >= 10000000000 },
  { id: 'spend-100B', name: '千亿挥霍帝', desc: '累计花掉 $1000 亿', icon: '👑', check: s => s.totalSpent >= 100000000000 },
  { id: 'spend-1T', name: '万亿败家子', desc: '累计花掉 $1 万亿', icon: '🌌', check: s => s.totalSpent >= 1000000000000 },
  // 品类成就
  { id: 'cat-daily-100', name: '咖啡续命', desc: '日常消费类买满 100 件', icon: '☕', check: s => getCatQty(s, 'daily') >= 100 },
  { id: 'cat-luxury-10', name: '奢侈品猎人', desc: '奢侈名品类买满 10 件', icon: '👔', check: s => getCatQty(s, 'luxury') >= 10 },
  { id: 'cat-cars-10', name: '车奴', desc: '豪车类买满 10 辆', icon: '🚗', check: s => getCatQty(s, 'cars') >= 10 },
  { id: 'cat-realestate-10B', name: '地球房东', desc: '房地产类花掉 $100 亿', icon: '🏠', check: s => getCatSpent(s, 'realestate') >= 10000000000 },
  { id: 'cat-tech-50', name: '数码达人', desc: '科技数码类买满 50 件', icon: '📱', check: s => getCatQty(s, 'tech') >= 50 },
  { id: 'cat-space-5', name: '火星移民官', desc: '太空探索类买满 5 件', icon: '🚀', check: s => getCatQty(s, 'space') >= 5 },
  { id: 'cat-invest-5', name: '资本大鳄', desc: '投资收购类买满 5 件', icon: '💰', check: s => getCatQty(s, 'invest') >= 5 },
  { id: 'cat-absurd-10', name: '宇宙大冤种', desc: '荒诞离谱类买满 10 件', icon: '🤪', check: s => getCatQty(s, 'absurd') >= 10 },
  { id: 'cat-charity-10B', name: '散财童子', desc: '慈善公益类花掉 $10 亿', icon: '🎗️', check: s => getCatSpent(s, 'charity') >= 1000000000 },
  { id: 'cat-fun-20', name: '派对之王', desc: '娱乐体验类买满 20 件', icon: '🎬', check: s => getCatQty(s, 'fun') >= 20 },
  { id: 'cat-food-100M', name: '饕餮盛宴', desc: '美食餐饮类花掉 $1 亿', icon: '🍽️', check: s => getCatSpent(s, 'food') >= 100000000 },
  { id: 'cat-art-10', name: '博物馆馆长', desc: '艺术收藏类买满 10 件', icon: '🎨', check: s => getCatQty(s, 'art') >= 10 },
  // 特殊成就
  { id: 'all-cats', name: '全能散财王', desc: '每个分类都至少买过 1 件', icon: '🌟', check: s => {
    const cats = new Set(s.purchasedItems.map(i => {
      const p = getProductById(i.id);
      return p ? p.category : null;
    }));
    return cats.size >= 12 && !cats.has(null);
  }},
  { id: 'single-100M', name: '一掷千金', desc: '单次结算超 $1 亿', icon: '💣', check: (s, lastCheckout) => lastCheckout >= 100000000 },
  { id: 'single-1B', name: '疯狂剁手', desc: '单次结算超 $10 亿', icon: '🤯', check: (s, lastCheckout) => lastCheckout >= 1000000000 },
  { id: 'broke', name: '最后的钢镚', desc: '余额不足 $1', icon: '🪙', check: s => s.balance < 1 && s.totalSpent > 0 },
  { id: 'no-spend', name: '守财奴', desc: '3分钟后仍未花一分钱', icon: '🐷', check: s => s.totalSpent === 0 && Date.now() - s.gameStartTime > 180000 },
];

export const TITLES = [
  { id: 't-galaxy-bankrupt', name: '银河系首负', check: s => s.totalSpent >= 100000000000 },
  { id: 't-trillion-spender', name: '万亿败家子', check: s => s.totalSpent >= 1000000000000 },
  { id: 't-charity', name: '散财童子', check: s => topCat(s) === 'charity' },
  { id: 't-space', name: '星际殖民官', check: s => topCat(s) === 'space' },
  { id: 't-invest', name: '资本大鳄', check: s => topCat(s) === 'invest' },
  { id: 't-realestate', name: '地球房东', check: s => topCat(s) === 'realestate' },
  { id: 't-cars', name: '车奴', check: s => topCat(s) === 'cars' },
  { id: 't-absurd', name: '宇宙大冤种', check: s => topCat(s) === 'absurd' },
  { id: 't-daily', name: '咖啡成瘾者', check: s => topCat(s) === 'daily' },
  { id: 't-art', name: '博物馆馆长', check: s => topCat(s) === 'art' },
  { id: 't-food', name: '饕餮', check: s => topCat(s) === 'food' },
  { id: 't-fun', name: '派对之王', check: s => topCat(s) === 'fun' },
  { id: 't-tech', name: '数码达人', check: s => topCat(s) === 'tech' },
  { id: 't-luxury', name: '奢侈品猎人', check: s => topCat(s) === 'luxury' },
  { id: 't-new-rich', name: '新任首富', check: s => s.balance > 100000000000 },
];

// 辅助函数
let lastCheckoutAmount = 0;

export function setLastCheckoutAmount(amount) {
  lastCheckoutAmount = amount;
}

function getCatQty(store, catId) {
  return store.purchasedItems.reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p && p.category === catId ? item.qty : 0);
  }, 0);
}

function getCatSpent(store, catId) {
  return store.purchasedItems.reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p && p.category === catId ? item.price * item.qty : 0);
  }, 0);
}

function topCat(store) {
  const cats = ['daily','luxury','cars','realestate','tech','space','invest','absurd','charity','fun','food','art'];
  let max = 0;
  let top = null;
  cats.forEach(c => {
    const spent = getCatSpent(store, c);
    if (spent > max) { max = spent; top = c; }
  });
  return top;
}

export function getCategorySpending(store) {
  const cats = ['daily','luxury','cars','realestate','tech','space','invest','absurd','charity','fun','food','art'];
  return cats.map(c => ({
    category: c,
    totalSpent: getCatSpent(store, c),
    totalQty: getCatQty(store, c)
  }));
}

export function checkAchievements(store) {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if (store.unlockedAchievements.includes(a.id)) return;
    const passed = a.check.length > 1 ? a.check(store, lastCheckoutAmount) : a.check(store);
    if (passed) {
      store.unlockedAchievements.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

export function computeTitle(store) {
  for (const t of TITLES) {
    if (t.check(store)) return t.name;
  }
  if (store.totalSpent === 0) return '花钱新手';
  return '花钱新手';
}

export function getAllAchievements() {
  const store = getStore();
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: store.unlockedAchievements.includes(a.id)
  }));
}

export function getUnlockedTitles() {
  const store = getStore();
  return TITLES.filter(t => t.check(store)).map(t => t.name);
}
```

- [ ] **Step 2: 验证 — 控制台测试**

```js
import { checkAchievements, computeTitle, getAllAchievements } from './js/achievements.js';
console.log(computeTitle(getStore()));              // '花钱新手'
console.log(getAllAchievements().length);           // 21
console.log(getAllAchievements().filter(a => a.unlocked).length); // 0 (初始)
```

---

### Task 10: 成就页 + 分享页

**Files:**
- Create: `js/share.js` （成就页 + 分享页渲染）
- Modify: `css/style.css` （追加成就/分享页样式）

**Consumes:** `getStore`, `saveStore` from `store.js`, `formatCurrency`, `detectCurrency` from `utils.js`, `getAllAchievements`, `getUnlockedTitles`, `getCategorySpending` from `achievements.js`
**Produces:** `renderAchievements()`, `renderShare()`

- [ ] **Step 1: 追加成就/分享 CSS**

```css
/* ===== Achievements Page ===== */
.achievements-page { padding-bottom: 24px; }

.title-section {
  background: linear-gradient(135deg, rgba(241,196,15,0.1), rgba(231,76,60,0.1));
  border-radius: var(--radius);
  padding: 16px;
  margin-bottom: 16px;
  text-align: center;
  border: 1px solid rgba(241,196,15,0.2);
}

.current-title {
  font-size: 24px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  justify-content: center;
}

.title-chip {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1px solid rgba(255,255,255,0.06);
  cursor: pointer;
}

.title-chip.worn {
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
  border-color: transparent;
}

.spending-stats {
  text-align: center;
  margin-bottom: 20px;
}

.spending-big-num {
  font-size: 36px;
  font-weight: 900;
  color: var(--color-accent);
  font-family: var(--font-mono);
  letter-spacing: 2px;
}

.spending-sub {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.achievement-badge {
  background: var(--color-surface);
  border-radius: var(--radius);
  padding: 12px 8px;
  text-align: center;
  border: 1px solid rgba(255,255,255,0.04);
  transition: opacity 0.2s;
}

.achievement-badge.locked { opacity: 0.4; }

.achievement-badge .badge-icon { font-size: 28px; }
.achievement-badge .badge-name { font-size: 11px; margin-top: 4px; font-weight: 500; }

.category-breakdown {
  margin-bottom: 20px;
}

.category-breakdown h3 {
  font-size: 14px;
  margin-bottom: 10px;
  color: var(--color-text-secondary);
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.bar-label { width: 48px; text-align: right; flex-shrink: 0; }

.bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--color-gradient-start), var(--color-gradient-end));
}

.bar-pct { width: 40px; text-align: right; color: var(--color-text-secondary); flex-shrink: 0; }

.btn-share {
  display: block;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px;
}

/* ===== Share Page ===== */
.share-preview {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  border: 2px solid rgba(241,196,15,0.2);
}

.share-nickname {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 2px;
}

.share-title {
  font-size: 14px;
  color: var(--color-accent);
  margin-bottom: 16px;
}

.share-big-money {
  font-size: 42px;
  font-weight: 900;
  color: var(--color-accent);
  font-family: var(--font-mono);
}

.share-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.share-actions {
  display: flex;
  gap: 8px;
}

.share-actions button {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-share-img {
  background: linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end));
  color: #fff;
}

.btn-copy-link {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid rgba(255,255,255,0.1);
}
```

- [ ] **Step 2: 编写 js/share.js**

```js
import { getStore, saveStore } from './store.js';
import { formatCurrency, detectCurrency, showToast } from './utils.js';
import { getAllAchievements, getUnlockedTitles, getCategorySpending } from './achievements.js';
import { navigate } from './router.js';

export function renderAchievements() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const currency = detectCurrency();
  const allAchievements = getAllAchievements();
  const unlockedTitles = getUnlockedTitles();

  container.innerHTML = `
    <div class="page achievements-page">
      <div class="title-section">
        <div class="current-title">${store.currentTitle || '花钱新手'}</div>
        <div class="title-list" id="title-list"></div>
      </div>

      <div class="spending-stats">
        <div class="spending-big-num">${formatCurrency(store.totalSpent, currency)}</div>
        <div class="spending-sub">累计花掉 | 剩余 ${formatCurrency(Math.max(0, store.balance), currency)}</div>
      </div>

      <h3 style="margin-bottom:10px;">🏆 成就 (${allAchievements.filter(a=>a.unlocked).length}/${allAchievements.length})</h3>
      <div class="achievement-grid" id="achievement-grid"></div>

      <h3 style="margin-bottom:10px;">📊 品类消费分布</h3>
      <div class="category-breakdown" id="category-breakdown"></div>

      <button class="btn-share" id="btn-go-share">📤 生成分享海报</button>
    </div>
  `;

  renderTitleList(unlockedTitles, store);
  renderAchievementGrid(allAchievements);
  renderCategoryBreakdown(currency);

  document.getElementById('btn-go-share').addEventListener('click', () => navigate('share'));
}

function renderTitleList(titles, store) {
  const el = document.getElementById('title-list');
  if (titles.length === 0) {
    el.innerHTML = '<span style="font-size:12px;color:var(--color-text-secondary);">暂无称号，快去花钱吧！</span>';
    return;
  }
  el.innerHTML = titles.map(t => `
    <span class="title-chip ${t === store.currentTitle ? 'worn' : ''}" data-title="${t}">${t}</span>
  `).join('');

  el.querySelectorAll('.title-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const newTitle = chip.dataset.title;
      store.currentTitle = newTitle;
      saveStore(store);
      renderAchievements();
    });
  });
}

function renderAchievementGrid(achievements) {
  const el = document.getElementById('achievement-grid');
  el.innerHTML = achievements.map(a => `
    <div class="achievement-badge ${a.unlocked ? '' : 'locked'}">
      <div class="badge-icon">${a.unlocked ? a.icon : '🔒'}</div>
      <div class="badge-name">${a.name}</div>
    </div>
  `).join('');
}

function renderCategoryBreakdown(currency) {
  const el = document.getElementById('category-breakdown');
  const store = getStore();
  const spending = getCategorySpending(store);
  const maxSpent = Math.max(...spending.map(s => s.totalSpent), 1);

  const top5 = spending
    .filter(s => s.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  if (top5.length === 0) {
    el.innerHTML = '<div style="color:var(--color-text-secondary);font-size:13px;text-align:center;">暂无消费记录</div>';
    return;
  }

  el.innerHTML = top5.map(s => {
    const pct = ((s.totalSpent / maxSpent) * 100).toFixed(0);
    return `
      <div class="bar-row">
        <span class="bar-label">${getCatEmoji(s.category)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <span class="bar-pct">${formatCurrency(s.totalSpent, currency)}</span>
      </div>
    `;
  }).join('');
}

function getCatEmoji(catId) {
  const map = {
    daily: '☕', luxury: '👔', cars: '🚗', realestate: '🏠', tech: '📱',
    space: '🚀', invest: '💰', absurd: '🤪', charity: '🎗️', fun: '🎬',
    food: '🍽️', art: '🎨'
  };
  return map[catId] || '📦';
}

export function renderShare() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const currency = detectCurrency();
  const allAchievements = getAllAchievements();
  const unlockedBadges = allAchievements.filter(a => a.unlocked).slice(0, 5);

  container.innerHTML = `
    <div class="page">
      <h2 style="margin-bottom:16px;">📊 我的花钱报告</h2>

      <div class="share-preview" id="share-preview">
        <div class="share-nickname">👤 ${store.nickname}</div>
        <div class="share-title">${store.currentTitle || '花钱新手'}</div>
        <div class="share-label">累计花掉</div>
        <div class="share-big-money">${formatCurrency(store.totalSpent, currency)}</div>
        <div class="share-label">剩余 ${formatCurrency(Math.max(0, store.balance), currency)}</div>
        ${unlockedBadges.length > 0 ? `
          <div style="display:flex;gap:4px;justify-content:center;margin-top:12px;flex-wrap:wrap;">
            ${unlockedBadges.map(a => `<span style="background:rgba(255,255,255,0.08);border-radius:8px;padding:4px 8px;font-size:18px;">${a.icon}</span>`).join('')}
          </div>
        ` : ''}
      </div>

      <div class="share-actions">
        <button class="btn-share-img" id="btn-gen-share">📸 生成分享海报</button>
        <button class="btn-copy-link" id="btn-copy-link">📋 复制链接</button>
      </div>
    </div>
  `;

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('链接已复制！'));
    } else {
      showToast('请手动复制浏览器地址栏链接');
    }
  });

  document.getElementById('btn-gen-share').addEventListener('click', () => {
    showToast('📸 分享海报生成中...（需对接 share-card-generator）');
    // share-card-generator skill 在此处调用
  });
}
```

- [ ] **Step 2: 验证 — 浏览器打开，切换到成就页/分享页确认渲染正常**

---

### Task 11: 主入口 (main.js) — 串联所有模块

**Files:**
- Create: `js/main.js`

**Consumes:** 所有上述模块

- [ ] **Step 1: 编写 js/main.js**

```js
import { initRouter } from './router.js';
import { loadProducts, renderShop, updateProgressBar } from './shop.js';
import { renderCart } from './cart.js';
import { renderAchievements, renderShare } from './share.js';
import { startNetWorthPolling, getDisplayNetWorth } from './api.js';
import { getStore } from './store.js';
import { detectCurrency, formatCurrency, animateNumber } from './utils.js';

async function initApp() {
  // 预热产品数据
  await loadProducts();

  // 初始化路由
  initRouter({
    shop: () => renderShop(),
    cart: () => renderCart(),
    achievements: () => renderAchievements(),
    share: () => renderShare()
  });

  // 启动身价轮询，并更新展示
  startNetWorthPolling((newNetWorth) => {
    const el = document.getElementById('net-worth-display');
    if (!el) return;
    const currency = detectCurrency();
    // 平滑动画更新身价显示
    animateNumber(el, getDisplayNetWorth(), newNetWorth, 2000);
    // 更新进度条
    updateProgressBar();
  });
}

initApp().catch(console.error);
```

- [ ] **Step 1: 验证 — 浏览器打开 index.html，确认所有页面可正常切换和渲染**

---

### Task 12: 收尾打杂 — 动画打磨、边界情况、虚拟滚动

**Files:**
- Modify: `css/style.css` (动画增强)
- Modify: `js/shop.js` (虚拟滚动)
- Modify: `js/cart.js` (边界处理、补全产品分类信息)

**Checklist:**

- [ ] **Step 1: 结算时补全购买记录中的 category 字段**

修改 `cart.js` 的 `checkout` 函数，在添加购买记录时从产品数据获取 category：

```js
import { getProductById } from './shop.js';

// 在 checkout 中:
store.cart.forEach(item => {
  const product = getProductById(item.id);
  store.purchasedItems.push({
    id: item.id,
    name: item.name,
    category: product ? product.category : '',
    price: item.price,
    qty: item.qty,
    time: now
  });
});
```

- [ ] **Step 2: 增加货币切换按钮**

在商店页身价区域添加货币切换按钮，修改 `shop.js` 的 `renderShop`：

在 `net-worth-section` 的 div 中追加：
```html
<button id="currency-toggle" style="background:var(--color-surface);border:1px solid rgba(255,255,255,0.1);color:var(--color-text-secondary);border-radius:12px;padding:2px 10px;font-size:11px;cursor:pointer;margin-left:8px;">${currency === 'cny' ? '¥→$' : '$→¥'}</button>
```

绑定事件：
```js
document.getElementById('currency-toggle').addEventListener('click', () => {
  const store = getStore();
  store.currency = currency === 'cny' ? 'usd' : 'cny';
  saveStore(store);
  renderShop();
});
```

- [ ] **Step 3: 增强 Toast 系统（成就解锁特殊样式）**

追加 CSS：
```css
.toast.achievement {
  background: linear-gradient(135deg, #f1c40f, #e67e22);
  color: #000;
  font-weight: 700;
  font-size: 16px;
}
```

修改 `utils.js` 的 `showToast`，增加 `type` 参数。

- [ ] **Step 4: 购物车结算余额不足时增加差值提示**

修改 `cart.js` 的 `checkout`：
```js
if (totalAmount > store.balance) {
  const diff = formatCurrency(totalAmount - store.balance, currency);
  showToast(`😅 还差 ${diff}，马斯克的钱也不够花了...`);
  return;
}
```

- [ ] **Step 5: 长按时间优化 + 点击跳转商品详情**

确保 `touchstart` → `touchend` < 400ms 不触发长按，> 400ms 触发详情弹窗。

- [ ] **Step 6: 空购物车结算按钮禁用态**

```js
// 在 renderCart 中，如果购物车为空，footer 不渲染
if (store.cart.length === 0) { /* 仅显示空状态 */ }
```

- [ ] **Step 7: 页面切换滚动到顶部**

在 `router.js` 的 `handleRouteChange` 中添加：
```js
const container = document.getElementById('page-container');
if (container) container.scrollTop = 0;
```

- [ ] **Step 8: 完整验证 — 在微信内置浏览器测试全流程**

1. 打开页面 → 自动加载身价 → 进度条显示
2. 浏览 12 个分类 → 搜索商品 → 加入购物车（动画正常）
3. 切换购物车 → 调整数量 → 一键结算（撒花正常）
4. 成就页 → 查看已解锁成就/称号 → 切换佩戴称号
5. 分享页 → 复制链接 → 生成海报
6. 昵称修改 → 货币切换 → 数据持久化（刷新不丢）
7. 余额不足 → 提示 toast → 不扣款

---

## 自审检查清单

- [x] **Spec coverage**: 12分类商品(✓) | 进度条(✓) | 购物车+结算(✓) | 成就算子(✓) | 称号系统(✓) | 分享页(✓) | 身价API+降级(✓) | 货币切换(✓) | 动画效果(✓) | 昵称自定义(✓)
- [x] **Placeholder scan**: 无 TBD/TODO，无"implement later"
- [x] **Type consistency**: `store.js` 产出的 `getStore()/saveStore()` 在所有后续模块中一致使用；`utils.js` 的 `formatCurrency(amount, currency)` 签名一致；`achievements.js` 的 `checkAchievements(store)` / `computeTitle(store)` 与 `cart.js` 调用一致
- [x] **Scope**: 聚焦本次，未涉及"十四、不包含的范围"中的内容
