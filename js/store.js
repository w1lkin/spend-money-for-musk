// 数据存储模块 - 云端 KV 封装（原 localStorage 已移除）
// 所有金额以美元内部存储
// totalSpent / purchasedItems 为「本次选购」数据，结算后重置
// lifetimeSpent / lifetimeItems 为「累计」数据，结算后累加不重置
// settlementHistory 保留最近10次结算快照

const STORAGE_KEY = 'musk_spender';
const MAX_SETTLEMENT_HISTORY = 10;

export const STORE_DEFAULTS = {
  nickname: '',
  balance: 0,
  totalSpent: 0,       // 本次选购累计花费（结算后重置）
  purchasedItems: [],  // 本次选购商品列表（结算后重置）
  cart: [],
  lifetimeSpent: 0,    // 累计总花费（不重置）
  lifetimeItems: [],   // 累计商品列表（不重置）
  settlementHistory: [], // 最近10次结算快照 [{items, totalAmount, time, title}]
  unlockedAchievements: [],
  unlockedTitles: [],
  currentTitle: null,
  cachedNetWorth: 0,
  cachedNetWorthTime: null,
  currency: 'auto',
  gameStartTime: null,
  lastCheckout: null,
  dataVersion: 0
};

// 默认随机昵称池
const NICKNAMES = [
  '花钱小能手', '散财童子', '氪金战士', '剁手达人',
  '败家练习生', '消费艺术家', '银河购物狂', '财富蒸发器'
];

function randomNickname() {
  return NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)];
}

// 内存缓存：登录门通过后从云端 hydrate 一次；之后所有读写走内存，写操作 debounce 同步到云端
let _cache = null;
let _cloudHydrated = false;
let _saveTimer = null;

function defaultStore() {
  return {
    ...STORE_DEFAULTS,
    nickname: randomNickname(),
    gameStartTime: Date.now(),
    purchasedItems: [],
    cart: [],
    lifetimeItems: [],
    unlockedAchievements: [],
    unlockedTitles: [],
    settlementHistory: [],
  };
}

// 登录后调用一次，从云端拉取存档填入内存缓存
export async function hydrateStoreFromCloud() {
  if (_cloudHydrated) return getStore();
  try {
    const remote = await window.GamePlatform.getKV(STORAGE_KEY);
    if (remote && typeof remote === 'object') {
      _cache = { ...STORE_DEFAULTS, ...remote };
    }
  } catch (e) { console.warn('hydrate store failed:', e); }
  _cloudHydrated = true;
  return getStore();
}

/**
 * 读取存储数据（内存缓存；未 hydrate 时用默认值）
 */
export function getStore() {
  if (_cache) return _cache;
  _cache = defaultStore();
  return _cache;
}

export function saveStore(store) {
  _cache = store;
  // debounce 写云端，避免每次操作都发请求
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      window.GamePlatform.setKV(STORAGE_KEY, store);
    } catch (e) { console.error('Failed to save store to cloud:', e); }
  }, 800);
}

// ===== 本次选购操作（商品卡片加减） =====

/**
 * 获取本次选购中某商品的购买数量
 */
export function getCurrentPurchaseQty(store, productId) {
  const items = store.purchasedItems || [];
  const item = items.find(i => i.id === productId);
  return item ? item.qty : 0;
}

/**
 * 获取本次选购总额
 */
export function getCurrentSpent(store) {
  return store.totalSpent || 0;
}

/**
 * 增加某商品到本次选购
 */
export function addToCurrentPurchase(store, product) {
  store.purchasedItems = store.purchasedItems || [];
  const existing = store.purchasedItems.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    store.purchasedItems.push({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      emoji: product.emoji,
      qty: 1,
      time: Date.now()
    });
  }
  store.totalSpent = (store.totalSpent || 0) + product.price;
  store.balance = Math.max(0, (store.balance || 0) - product.price);
}

/**
 * 减少某商品从本次选购（减到0则移除）
 */
export function removeFromCurrentPurchase(store, product) {
  store.purchasedItems = store.purchasedItems || [];
  const idx = store.purchasedItems.findIndex(i => i.id === product.id);
  if (idx === -1) return;

  const item = store.purchasedItems[idx];
  if (item.qty > 1) {
    item.qty -= 1;
  } else {
    store.purchasedItems.splice(idx, 1);
  }
  store.totalSpent = Math.max(0, (store.totalSpent || 0) - product.price);
  store.balance = (store.balance || 0) + product.price;
}

/**
 * 本次选购是否有商品
 */
export function hasCurrentPurchase(store) {
  return (store.purchasedItems || []).length > 0 && (store.totalSpent || 0) > 0;
}

// ===== 结算操作 =====

/**
 * 获取最近一次结算快照（用于分享页展示）
 */
export function getLastSettlement(store) {
  const history = store.settlementHistory || [];
  return history.length > 0 ? history[history.length - 1] : null;
}

/**
 * 获取结算历史记录
 */
export function getSettlementHistory(store) {
  return store.settlementHistory || [];
}

/**
 * 执行结算：
 * 1. 将本次选购合并到累计数据
 * 2. 保存结算快照到历史
 * 3. 重置本次选购数据
 * 4. 恢复余额
 */
export function checkoutSettlement(store, netWorth, title) {
  if (!hasCurrentPurchase(store)) return null;

  // 生成结算快照
  const snapshot = {
    items: JSON.parse(JSON.stringify(store.purchasedItems)),
    totalAmount: store.totalSpent,
    time: Date.now(),
    title: title || store.currentTitle || '花钱新手',
    netWorth: netWorth
  };

  // 合并到累计数据
  store.lifetimeSpent = (store.lifetimeSpent || 0) + store.totalSpent;

  const lifetimeItems = store.lifetimeItems || [];
  snapshot.items.forEach(snapItem => {
    const existing = lifetimeItems.find(li => li.id === snapItem.id);
    if (existing) {
      existing.qty += snapItem.qty;
    } else {
      lifetimeItems.push({ ...snapItem });
    }
  });
  store.lifetimeItems = lifetimeItems;

  // 保存快照到结算历史（保留最近10次）
  store.settlementHistory = store.settlementHistory || [];
  store.settlementHistory.push(snapshot);
  if (store.settlementHistory.length > MAX_SETTLEMENT_HISTORY) {
    store.settlementHistory = store.settlementHistory.slice(-MAX_SETTLEMENT_HISTORY);
  }

  // 重置本次选购
  store.purchasedItems = [];
  store.totalSpent = 0;
  store.balance = netWorth || 0;
  store.lastCheckout = Date.now();

  saveStore(store);

  // 战绩上报云端：score = 累计成就数（越大越好）
  try {
    window.GamePlatform.submitScore('spend-money-for-musk', (store.lifetimeItems || []).length, {
      balance: store.balance, lifetimeSpent: store.lifetimeSpent,
    });
  } catch (e) { console.warn('submit score failed:', e); }

  return snapshot;
}

// ===== Cart（保留但不再使用） =====

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
