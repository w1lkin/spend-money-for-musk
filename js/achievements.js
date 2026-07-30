// 成就与称号计算模块 - 成就定义、触发检测、称号判定、品类消费统计
// 所有成就基于「累计」数据（lifetimeSpent / lifetimeItems），不随结算重置而消失

import { getStore } from './store.js';
import { getProductById, getCategoryName } from './shop.js';
import { formatCurrency } from './utils.js';

const ALL_CATS = ['coffee','grocery','clothing','food','digital','vehicle','property','entertain','gift','travel','invest','absurd'];

export const ACHIEVEMENTS = [
  // 花费里程碑（基于累计）
  { id: 'spend-1K', name: '初试身手', desc: '累计花掉 $1,000', icon: '💸', check: s => (s.lifetimeSpent || 0) >= 1000 },
  { id: 'spend-10K', name: '小试牛刀', desc: '累计花掉 $1 万', icon: '💰', check: s => (s.lifetimeSpent || 0) >= 10000 },
  { id: 'spend-100K', name: '花钱能手', desc: '累计花掉 $10 万', icon: '💎', check: s => (s.lifetimeSpent || 0) >= 100000 },
  { id: 'spend-1M', name: '百万负翁', desc: '累计花掉 $100 万', icon: '🏦', check: s => (s.lifetimeSpent || 0) >= 1000000 },
  { id: 'spend-10M', name: '千万散财', desc: '累计花掉 $1000 万', icon: '🔥', check: s => (s.lifetimeSpent || 0) >= 10000000 },
  { id: 'spend-100M', name: '亿掷千金', desc: '累计花掉 $1 亿', icon: '👑', check: s => (s.lifetimeSpent || 0) >= 100000000 },
  { id: 'spend-1B', name: '十亿败家子', desc: '累计花掉 $10 亿', icon: '🌌', check: s => (s.lifetimeSpent || 0) >= 1000000000 },

  // 品类成就（基于累计）
  { id: 'cat-coffee-200', name: '咖啡续命', desc: '咖啡奶茶类买满200件', icon: '☕', check: s => getLifetimeCatQty(s, 'coffee') >= 200 },
  { id: 'cat-grocery-200', name: '超市杀手', desc: '日用百货类买满200件', icon: '🛒', check: s => getLifetimeCatQty(s, 'grocery') >= 200 },
  { id: 'cat-clothing-50', name: '时尚达人', desc: '服饰穿搭类买满50件', icon: '👔', check: s => getLifetimeCatQty(s, 'clothing') >= 50 },
  { id: 'cat-food-100', name: '吃货天王', desc: '快餐小吃类买满100件', icon: '🍔', check: s => getLifetimeCatQty(s, 'food') >= 100 },
  { id: 'cat-digital-30', name: '数码控', desc: '数码产品类买满30件', icon: '📱', check: s => getLifetimeCatQty(s, 'digital') >= 30 },
  { id: 'cat-vehicle-10', name: '座驾收藏家', desc: '出行座驾类买满10辆', icon: '🚗', check: s => getLifetimeCatQty(s, 'vehicle') >= 10 },
  { id: 'cat-property-5', name: '有房一族', desc: '房产置业类买满5套', icon: '🏠', check: s => getLifetimeCatQty(s, 'property') >= 5 },
  { id: 'cat-entertain-50', name: '派对之王', desc: '娱乐消遣类买满50件', icon: '🎮', check: s => getLifetimeCatQty(s, 'entertain') >= 50 },
  { id: 'cat-gift-50', name: '散财童子', desc: '送礼请客类买满50件', icon: '🎁', check: s => getLifetimeCatQty(s, 'gift') >= 50 },
  { id: 'cat-travel-20', name: '旅行达人', desc: '旅行度假类买满20次', icon: '✈️', check: s => getLifetimeCatQty(s, 'travel') >= 20 },
  { id: 'cat-invest-5', name: '资本大鳄', desc: '投资理财类买满5笔', icon: '💼', check: s => getLifetimeCatQty(s, 'invest') >= 5 },
  { id: 'cat-absurd-20', name: '任性之王', desc: '任性消费类买满20件', icon: '🤪', check: s => getLifetimeCatQty(s, 'absurd') >= 20 },

  // 特殊成就
  { id: 'all-cats', name: '全能散财王', desc: '每个分类都至少买过1件', icon: '🌟', check: s => {
    const cats = new Set();
    (s.lifetimeItems || []).forEach(item => {
      const p = getProductById(item.id);
      if (p) cats.add(p.category);
    });
    return cats.size >= 12;
  }},
  { id: 'single-10K', name: '大手笔', desc: '单次结算超 $1 万', icon: '💪', check: (s, last) => last >= 10000 },
  { id: 'single-100K', name: '一掷千金', desc: '单次结算超 $10 万', icon: '💣', check: (s, last) => last >= 100000 },
  { id: 'single-1M', name: '疯狂剁手', desc: '单次结算超 $100 万', icon: '🤯', check: (s, last) => last >= 1000000 },
  { id: 'no-spend', name: '守财奴', desc: '3分钟后仍未花一分钱', icon: '🐷', check: s => (s.lifetimeSpent || 0) === 0 && Date.now() - s.gameStartTime > 180000 },
];

export const TITLES = [
  { id: 't-billion-spender', name: '十亿败家子', check: s => (s.lifetimeSpent || 0) >= 1000000000 },
  { id: 't-hundred-mil', name: '亿万负翁', check: s => (s.lifetimeSpent || 0) >= 100000000 },
  { id: 't-coffee', name: '咖啡成瘾者', check: s => lifetimeTopCat(s) === 'coffee' },
  { id: 't-grocery', name: '超市战神', check: s => lifetimeTopCat(s) === 'grocery' },
  { id: 't-clothing', name: '时尚达人', check: s => lifetimeTopCat(s) === 'clothing' },
  { id: 't-food', name: '饕餮', check: s => lifetimeTopCat(s) === 'food' },
  { id: 't-digital', name: '数码控', check: s => lifetimeTopCat(s) === 'digital' },
  { id: 't-vehicle', name: '车奴', check: s => lifetimeTopCat(s) === 'vehicle' },
  { id: 't-property', name: '地球房东', check: s => lifetimeTopCat(s) === 'property' },
  { id: 't-entertain', name: '派对之王', check: s => lifetimeTopCat(s) === 'entertain' },
  { id: 't-gift', name: '散财童子', check: s => lifetimeTopCat(s) === 'gift' },
  { id: 't-travel', name: '旅行达人', check: s => lifetimeTopCat(s) === 'travel' },
  { id: 't-invest', name: '资本大鳄', check: s => lifetimeTopCat(s) === 'invest' },
  { id: 't-absurd', name: '任性之王', check: s => lifetimeTopCat(s) === 'absurd' },
  { id: 't-new-rich', name: '新任首富', check: s => s.balance > 300000000000 },
];

/**
 * 累计购买中某品类总数量
 */
function getLifetimeCatQty(store, catId) {
  return (store.lifetimeItems || []).reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p && p.category === catId ? item.qty : 0);
  }, 0);
}

/**
 * 累计购买中某品类总金额
 */
function getLifetimeCatSpent(store, catId) {
  return (store.lifetimeItems || []).reduce((sum, item) => {
    const p = getProductById(item.id);
    return sum + (p && p.category === catId ? item.price * item.qty : 0);
  }, 0);
}

/**
 * 累计购买中花钱最多的品类
 */
function lifetimeTopCat(store) {
  let max = 0;
  let top = null;
  ALL_CATS.forEach(c => {
    const spent = getLifetimeCatSpent(store, c);
    if (spent > max) { max = spent; top = c; }
  });
  return top;
}

/**
 * 各品类累计消费分布
 */
export function getCategorySpending(store) {
  return ALL_CATS.map(c => ({
    category: c,
    totalSpent: getLifetimeCatSpent(store, c),
    totalQty: getLifetimeCatQty(store, c)
  }));
}

/**
 * 检查新解锁的成就
 */
export function checkAchievements(store, lastCheckoutAmount = 0) {
  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(a => {
    if ((store.unlockedAchievements || []).includes(a.id)) return;
    const passed = a.check.length > 1 ? a.check(store, lastCheckoutAmount) : a.check(store);
    if (passed) {
      store.unlockedAchievements = store.unlockedAchievements || [];
      store.unlockedAchievements.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

/**
 * 计算当前称号
 */
export function computeTitle(store) {
  for (const t of TITLES) {
    if (t.check(store)) return t.name;
  }
  if ((store.lifetimeSpent || 0) === 0) return '花钱新手';
  return '花钱新手';
}

/**
 * 获取所有成就（含锁定/解锁状态）
 */
export function getAllAchievements() {
  const store = getStore();
  return ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: (store.unlockedAchievements || []).includes(a.id)
  }));
}

/**
 * 获取已解锁称号列表
 */
export function getUnlockedTitles() {
  const store = getStore();
  return TITLES.filter(t => t.check(store)).map(t => t.name);
}

// ===== 结算历史渲染 =====

/**
 * 渲染结算历史列表
 * @param {HTMLElement} el 容器元素
 * @param {Array} history 结算记录数组
 */
export function renderSettlementHistory(el, history) {
  if (!el) return;
  if (!history || history.length === 0) {
    el.innerHTML = '<div style="color:var(--color-text-secondary);font-size:13px;text-align:center;padding:20px;">暂无结算记录，快去花钱吧！</div>';
    return;
  }

  // 倒序显示（最新的在前）
  el.innerHTML = [...history].reverse().map((settlement, index) => {
    const timeStr = new Date(settlement.time).toLocaleString('zh-CN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const totalItems = settlement.items.reduce((sum, item) => sum + item.qty, 0);

    return (
      '<div class="settlement-item">' +
        '<div class="settlement-item-header">' +
          '<span class="settlement-item-time">' + timeStr + '</span>' +
          '<span class="settlement-item-total">' + formatCurrency(settlement.totalAmount) + '</span>' +
        '</div>' +
        '<div class="settlement-item-goods">' +
          settlement.items.slice(0, 5).map(item =>
            '<span class="settlement-good-chip">' +
              (item.emoji || '📦') + ' ' + item.name + ' ×' + item.qty +
            '</span>'
          ).join('') +
          (settlement.items.length > 5
            ? '<span class="settlement-good-chip">...等' + settlement.items.length + '种</span>'
            : '') +
        '</div>' +
        '<div class="settlement-item-meta">' +
          '<span>' + totalItems + '件商品</span>' +
          '<span>· ' + (settlement.title || '花钱新手') + '</span>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}