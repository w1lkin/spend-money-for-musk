// 数据存储模块 - localStorage 封装
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

/**
 * 读取存储数据，自动迁移旧版本数据
 */
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
        lifetimeItems: [],
        unlockedAchievements: [],
        unlockedTitles: [],
        settlementHistory: []
      };
      saveStore(defaults);
      return defaults;
    }
    const data = JSON.parse(raw);

    // 迁移：旧版本没有 lifetime 字段时，把旧数据转为累计数据，清空当前选购
    if (data.lifetimeSpent === undefined) {
      data.lifetimeSpent = (data.totalSpent && data.totalSpent > 0) ? data.totalSpent : 0;
      data.totalSpent = 0;
      data.purchasedItems = [];
    }
    if (data.lifetimeItems === undefined) {
      if (data.purchasedItems && data.purchasedItems.length > 0) {
        data.lifetimeItems = JSON.parse(JSON.stringify(data.purchasedItems));
        data.purchasedItems = [];
      } else {
        data.lifetimeItems = [];
      }
    }

    return {
      ...STORE_DEFAULTS,
      ...data,
      gameStartTime: data.gameStartTime || Date.now(),
      lifetimeSpent: data.lifetimeSpent || 0,
      lifetimeItems: data.lifetimeItems || [],
      settlementHistory: data.settlementHistory || []
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
