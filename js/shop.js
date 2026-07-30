// 商店主页 - 身价展示、进度条、分类筛选、商品网格、搜索、选购加减、结算

import { getStore, saveStore, getCurrentPurchaseQty, addToCurrentPurchase, removeFromCurrentPurchase, hasCurrentPurchase, checkoutSettlement } from './store.js';
import { formatCurrency, debounce, showToast } from './utils.js';
import { getDisplayNetWorth } from './api.js';
import { navigate } from './router.js';
import { checkAchievements, computeTitle } from './achievements.js';

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

/**
 * 渲染进度条 —— 展示本次选购金额占身价的比例
 */
function renderProgressBar(parent, store) {
  const total = getDisplayNetWorth();
  const spent = store.totalSpent || 0;
  const remaining = Math.max(0, total - spent);
  const pct = total > 0 ? Math.min(100, (spent / total) * 100) : 0;

  parent.innerHTML =
    '<div class="progress-section">' +
      '<div class="progress-header">' +
        '<span>本次选购 ' + formatCurrency(spent) + '</span>' +
        '<span>' + pct.toFixed(1) + '%</span>' +
      '</div>' +
      '<div class="progress-bar">' +
        '<div class="progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="progress-header" style="justify-content:flex-end;margin-top:4px;">' +
        '<span>剩余 ' + formatCurrency(remaining) + '</span>' +
      '</div>' +
    '</div>';
}

/**
 * 飞入动画 —— 从商品按钮飞到进度条
 */
function flyToProgress(fromEl) {
  const progress = document.querySelector('.progress-fill');
  if (!progress) return;

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = progress.getBoundingClientRect();
  const ball = document.createElement('span');
  ball.textContent = '💸';
  ball.style.cssText =
    'position:fixed;z-index:9999;font-size:20px;' +
    'left:' + (fromRect.left + fromRect.width / 2) + 'px;' +
    'top:' + fromRect.top + 'px;' +
    'transition:all 0.5s cubic-bezier(0.17,0.67,0.5,1.03);';
  document.body.appendChild(ball);

  requestAnimationFrame(() => {
    ball.style.left = (toRect.left + toRect.width / 2) + 'px';
    ball.style.top = toRect.top + 'px';
    ball.style.transform = 'scale(0.3)';
    ball.style.opacity = '0.3';
  });

  setTimeout(() => ball.remove(), 550);
}

/**
 * 更新顶部余额显示
 */
function updateNetWorthDisplay() {
  const el = document.getElementById('net-worth-display');
  if (!el) return;
  const store = getStore();
  const spent = store.totalSpent || 0;
  const nw = getDisplayNetWorth();
  const remaining = Math.max(0, nw - spent);
  el.textContent = formatCurrency(remaining);
}

/**
 * 增加选购数量
 */
function handleAddPurchase(product, fromEl) {
  const store = getStore();

  if (product.price > store.balance) {
    showToast('钱不够了！还剩 ' + formatCurrency(store.balance));
    return;
  }

  addToCurrentPurchase(store, product);
  saveStore(store);

  updateProgressBar();
  updateNetWorthDisplay();
  refreshProductGrid();

  if (fromEl) flyToProgress(fromEl);
}

/**
 * 减少选购数量
 */
function handleRemovePurchase(product) {
  const store = getStore();
  if (getCurrentPurchaseQty(store, product.id) <= 0) return;

  removeFromCurrentPurchase(store, product);
  saveStore(store);

  updateProgressBar();
  updateNetWorthDisplay();
  refreshProductGrid();
}

// 以下变量在 renderShop 闭包中使用，用于刷新商品网格
let refreshProductGrid = () => {};
let activeCategoryForRefresh = 'coffee';
let searchQueryForRefresh = '';

export function renderShop() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const netWorth = getDisplayNetWorth();
  const remaining = Math.max(0, netWorth - (store.totalSpent || 0));

  container.innerHTML =
    '<div class="page shop-page">' +
      '<div class="net-worth-section">' +
        '<div class="net-worth-label">马斯克实时身价' +
          '' +
        '</div>' +
        '<div>' +
          '<span class="net-worth-value" id="net-worth-display">' + formatCurrency(remaining) + '</span>' +
          (store.currentTitle ? '<span class="title-badge">' + store.currentTitle + '</span>' : '') +
        '</div>' +
        '<div class="nickname-row" id="nickname-display">' +
          '<span>👤</span>' +
          '<span id="nickname-text">' + store.nickname + '</span>' +
          '<span style="font-size:11px;color:var(--color-accent)">✎</span>' +
        '</div>' +
      '</div>' +
      '<div id="shop-progress"></div>' +
      '<div style="padding:0 16px 8px;display:flex;gap:8px;">' +
        '<button id="btn-settle-share" style="flex:1;padding:10px;background:linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end));color:#fff;border:none;border-radius:var(--radius);font-size:14px;font-weight:600;cursor:pointer;">结算</button>' +
      '</div>' +
      '<div class="search-bar">' +
        '<input type="text" id="search-input" placeholder="搜索商品...">' +
      '</div>' +
      '<div id="category-tabs" class="category-tabs"></div>' +
      '<div id="product-grid" class="product-grid"></div>' +
    '</div>';

  renderProgressBar(document.getElementById('shop-progress'), store);

  // 昵称编辑
  document.getElementById('nickname-display').addEventListener('click', showNicknameModal);

  // 结算按钮
  document.getElementById('btn-settle-share').addEventListener('click', () => {
    const s = getStore();
    if (!hasCurrentPurchase(s)) {
      showToast('还没花钱呢，先去买点什么吧～');
      return;
    }
    const nw = getDisplayNetWorth();

    // 先合并累计数据（触达成就检查需要累计数据），再执行结算
    const snapshot = checkoutSettlement(s, nw);

    // 基于累计数据检查成就
    if (snapshot) {
      const newAchievements = checkAchievements(s, snapshot.totalAmount);
      newAchievements.forEach(a => {
        showToast('🏆 解锁成就：' + a.name, 'achievement');
      });

      const newTitle = computeTitle(s);
      if (newTitle !== s.currentTitle) {
        s.currentTitle = newTitle;
        saveStore(s);
      }
    }

    saveStore(s);
    navigate('share');
  });

  const productGrid = document.getElementById('product-grid');
  let activeCategory = 'coffee';
  let searchQuery = '';

  // 保存引用以便外部刷新
  activeCategoryForRefresh = activeCategory;
  searchQueryForRefresh = searchQuery;

  function renderCategoryTabs() {
    const cats = productsData.categories;
    const catEl = document.getElementById('category-tabs');
    catEl.innerHTML = cats.map(c =>
      '<div class="category-tab' + (c.id === activeCategory ? ' active' : '') + '" data-cat="' + c.id + '">' +
        c.emoji + ' ' + c.name +
      '</div>'
    ).join('');
    catEl.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeCategory = tab.dataset.cat;
        activeCategoryForRefresh = activeCategory;
        renderCategoryTabs();
        renderProducts();
      });
    });
  }

  function renderProducts() {
    const currentStore = getStore();
    let filtered = productsData.products.filter(p => p.category === activeCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      productGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--color-text-secondary);padding:40px">没有找到相关商品</div>';
      return;
    }

    productGrid.innerHTML = filtered.map(p => {
      const qty = getCurrentPurchaseQty(currentStore, p.id);

      if (qty > 0) {
        // 已选购 → 显示加减控件
        return (
          '<div class="product-card" data-id="' + p.id + '">' +
            '<div class="product-emoji">' + p.emoji + '</div>' +
            '<div class="product-name">' + p.name + '</div>' +
            '<div class="product-price">' + formatCurrency(p.price) + '</div>' +
            '<div class="product-qty-controls">' +
              '<button class="qty-btn qty-minus" data-id="' + p.id + '">−</button>' +
              '<span class="qty-value">' + qty + '</span>' +
              '<button class="qty-btn qty-plus" data-id="' + p.id + '">+</button>' +
            '</div>' +
          '</div>'
        );
      } else {
        // 未选购 → 显示加号按钮
        return (
          '<div class="product-card" data-id="' + p.id + '">' +
            '<div class="product-emoji">' + p.emoji + '</div>' +
            '<div class="product-name">' + p.name + '</div>' +
            '<div class="product-price">' + formatCurrency(p.price) + '</div>' +
            '<button class="product-add-btn" data-id="' + p.id + '">+</button>' +
          '</div>'
        );
      }
    }).join('');

    // 加号按钮事件
    productGrid.querySelectorAll('.product-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const product = getProductById(id);
        if (product) handleAddPurchase(product, btn);
      });
    });

    // 加减控件事件
    productGrid.querySelectorAll('.qty-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const product = getProductById(id);
        if (product) handleAddPurchase(product, btn);
      });
    });

    productGrid.querySelectorAll('.qty-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const product = getProductById(id);
        if (product) handleRemovePurchase(product);
      });
    });

    // 长按查看商品详情
    productGrid.querySelectorAll('.product-card').forEach(card => {
      let pressTimer;
      card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => showDetailModal(card.dataset.id), 400);
      });
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('touchmove', () => clearTimeout(pressTimer));
    });
  }

  /**
   * 商品详情弹窗
   */
  function showDetailModal(productId) {
    const product = getProductById(productId);
    if (!product) return;

    const currentStore = getStore();
    const qty = getCurrentPurchaseQty(currentStore, product.id);

    const overlay = document.createElement('div');
    overlay.className = 'detail-overlay';
    overlay.innerHTML =
      '<div class="detail-modal">' +
        '<div class="product-emoji">' + product.emoji + '</div>' +
        '<div class="product-name">' + product.name + '</div>' +
        '<div class="product-price">' + formatCurrency(product.price) + '</div>' +
        '<div class="product-desc">' + product.description + '</div>' +
        (qty > 0
          ? '<div class="detail-qty-controls">' +
              '<button class="qty-btn detail-qty-minus" style="width:36px;height:36px;font-size:20px;">−</button>' +
              '<span class="qty-value" style="margin:0 16px;font-size:20px;">' + qty + '</span>' +
              '<button class="qty-btn detail-qty-plus" style="width:36px;height:36px;font-size:20px;">+</button>' +
            '</div>'
          : '<button class="detail-buy-btn">立即购买</button>') +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // 详情中立即购买
    const buyBtn = overlay.querySelector('.detail-buy-btn');
    if (buyBtn) {
      buyBtn.addEventListener('click', () => {
        handleAddPurchase(product, buyBtn);
        overlay.remove();
      });
    }

    // 详情中加号
    const plusBtn = overlay.querySelector('.detail-qty-plus');
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        handleAddPurchase(product, plusBtn);
        overlay.remove();
      });
    }

    // 详情中减号
    const minusBtn = overlay.querySelector('.detail-qty-minus');
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        handleRemovePurchase(product);
        overlay.remove();
      });
    }
  }

  // 搜索输入
  document.getElementById('search-input').addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    searchQueryForRefresh = searchQuery;
    renderProducts();
  }));

  // 刷新商品网格的函数（保留当前筛选条件）
  refreshProductGrid = () => {
    activeCategory = activeCategoryForRefresh;
    searchQuery = searchQueryForRefresh;
    renderProducts();
  };

  loadProducts().then(() => {
    renderCategoryTabs();
    renderProducts();
  });
}

/**
 * 昵称编辑弹窗
 */
function showNicknameModal() {
  const store = getStore();
  const overlay = document.createElement('div');
  overlay.className = 'detail-overlay';
  overlay.innerHTML =
    '<div class="detail-modal" style="text-align:left;">' +
      '<h3 style="margin-bottom:12px;">修改昵称</h3>' +
      '<input type="text" id="nickname-input" maxlength="10" value="' + store.nickname + '"' +
      ' style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--color-bg);color:var(--color-text);font-size:15px;outline:none;">' +
      '<button id="nickname-save" style="margin-top:16px;width:100%;padding:12px;background:linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end));color:#fff;border:none;border-radius:12px;font-size:15px;cursor:pointer;">保存</button>' +
    '</div>';
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

/**
 * 外部可调用：刷新进度条
 */
export function updateProgressBar() {
  const el = document.getElementById('shop-progress');
  if (!el) return;
  const store = getStore();
  renderProgressBar(el, store);
}