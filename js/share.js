// 成就页 + 分享页 - 称号墙、成就徽章、品类消费分布、结算历史、分享海报

import { getStore, saveStore, getLastSettlement, getSettlementHistory } from './store.js';
import { formatCurrency, showToast } from './utils.js';
import { getAllAchievements, getUnlockedTitles, getCategorySpending, renderSettlementHistory } from './achievements.js';
import { navigate } from './router.js';

const SHARE_URL = 'https://spend-money-for-musk.w1lkin.site/';

/**
 * 成就页面
 */
export function renderAchievements() {
  const container = document.getElementById('page-container');
  const store = getStore();
  const allAchievements = getAllAchievements();
  const unlockedTitles = getUnlockedTitles();
  const settlementHistory = getSettlementHistory(store);

  const totalSpentForDisplay = store.lifetimeSpent || 0;
  const balanceForDisplay = store.balance || 0;

  container.innerHTML =
    '<div class="page achievements-page">' +
      '<div class="title-section">' +
        '<div class="current-title">' + (store.currentTitle || '花钱新手') + '</div>' +
        '<div class="title-list" id="title-list"></div>' +
      '</div>' +
      '<div class="spending-stats">' +
        '<div class="spending-big-num">' + formatCurrency(totalSpentForDisplay) + '</div>' +
        '<div class="spending-sub">累计花掉 | 剩余 ' + formatCurrency(Math.max(0, balanceForDisplay)) + '</div>' +
      '</div>' +
      '<h3 style="margin-bottom:10px;">成就 (' + allAchievements.filter(a=>a.unlocked).length + '/' + allAchievements.length + ')</h3>' +
      '<div class="achievement-grid" id="achievement-grid"></div>' +
      '<h3 style="margin-bottom:10px;">品类消费分布</h3>' +
      '<div class="category-breakdown" id="category-breakdown"></div>' +
      '<h3 style="margin-bottom:10px;">结算记录（最近10次）</h3>' +
      '<div class="settlement-history" id="settlement-history"></div>' +
      '<button class="btn-share" id="btn-go-share">生成分享海报</button>' +
    '</div>';

  renderTitleList(unlockedTitles, store);
  renderAchievementGrid(allAchievements);
  renderCategoryBreakdown();
  renderSettlementHistory(document.getElementById('settlement-history'), settlementHistory);

  document.getElementById('btn-go-share').addEventListener('click', () => generateShareCard());
}

function renderTitleList(titles, store) {
  const el = document.getElementById('title-list');
  if (titles.length === 0) {
    el.innerHTML = '<span style="font-size:12px;color:var(--color-text-secondary);">暂无称号，快去花钱吧！</span>';
    return;
  }
  el.innerHTML = titles.map(t =>
    '<span class="title-chip' + (t === store.currentTitle ? ' worn' : '') + '" data-title="' + t + '">' + t + '</span>'
  ).join('');

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
  el.innerHTML = achievements.map(a =>
    '<div class="achievement-badge' + (a.unlocked ? '' : ' locked') + '">' +
      '<div class="badge-icon">' + (a.unlocked ? a.icon : '🔒') + '</div>' +
      '<div class="badge-name">' + a.name + '</div>' +
      '<div class="badge-desc">' + a.desc + '</div>' +
    '</div>'
  ).join('');
}

function renderCategoryBreakdown() {
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
    return (
      '<div class="bar-row">' +
        '<span class="bar-label">' + getCatEmoji(s.category) + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="bar-pct">' + formatCurrency(s.totalSpent) + '</span>' +
      '</div>'
    );
  }).join('');
}

function getCatEmoji(catId) {
  const map = {
    coffee: '☕', grocery: '🛒', clothing: '👔', food: '🍔', digital: '📱',
    vehicle: '🚗', property: '🏠', entertain: '🎮', gift: '🎁',
    travel: '✈️', invest: '💼', absurd: '🤪'
  };
  return map[catId] || '📦';
}

// ===== 分享页 =====

export function renderShare() {
  generateShareCard();
}

// ===== 分享海报生成（含本次结算商品信息） =====

function drawCenteredText(ctx, text, x, y, font) {
  ctx.font = font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  ctx.fillText(text, x - m.width / 2, y);
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function generateShareCard() {
  const store = getStore();
  const settlement = getLastSettlement(store);

  const W = 1200, H = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // MUJI 风格 - 自然白底
  ctx.fillStyle = '#f5f3ef';
  ctx.fillRect(0, 0, W, H);

  // 顶部装饰细线
  ctx.strokeStyle = '#7a6e5d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 60);
  ctx.lineTo(W - 120, 60);
  ctx.stroke();

  // 标题
  ctx.fillStyle = '#4a4a4a';
  drawCenteredText(ctx, '替马斯克花钱', W / 2, 160, 'bold 68px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif');

  // 表情行
  drawCenteredText(ctx, '💰 🛒 🎉', W / 2, 245, '52px sans-serif');

  // 昵称 + 称号
  ctx.fillStyle = '#999';
  drawCenteredText(ctx, store.nickname + ' · ' + (store.currentTitle || '花钱新手'), W / 2, 310, '34px -apple-system, "PingFang SC", sans-serif');

  if (settlement) {
    // 本次结算标题
    ctx.fillStyle = '#7a6e5d';
    drawCenteredText(ctx, '本次结算', W / 2, 380, 'bold 34px -apple-system, "PingFang SC", sans-serif');

    // 结算金额
    const totalItems = settlement.items.reduce((sum, item) => sum + item.qty, 0);
    ctx.fillStyle = '#4a4a4a';
    drawCenteredText(ctx, formatCurrency(settlement.totalAmount), W / 2, 460, 'bold 72px -apple-system, "PingFang SC", sans-serif');

    // 共 N 件
    ctx.fillStyle = '#999';
    drawCenteredText(ctx, '共 ' + totalItems + ' 件商品', W / 2, 510, '28px -apple-system, "PingFang SC", sans-serif');

    // 剩余金额
    const remainingUSD = Math.max(0, (settlement.netWorth || store.balance || 0));
    ctx.fillStyle = '#b55a4a';
    drawCenteredText(ctx, '剩余 ' + formatCurrency(remainingUSD), W / 2, 565, 'bold 44px -apple-system, "PingFang SC", sans-serif');

    // 虚线分隔
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(140, 615);
    ctx.lineTo(W - 140, 615);
    ctx.stroke();
    ctx.setLineDash([]);

    // 购买清单标题
    ctx.fillStyle = '#999';
    drawCenteredText(ctx, '购买清单', W / 2, 655, '24px -apple-system, "PingFang SC", sans-serif');

    // 按价格降序，最多显示20件
    const sortedItems = [...settlement.items].sort((a, b) => b.price - a.price);
    const maxItems = 20;
    const itemsToShow = sortedItems.slice(0, maxItems);
    const itemCount = settlement.items.length;
    const showCount = itemsToShow.length;
    const itemStartY = 682;
    // 根据件数动态调整行距
    let itemGap = 38;
    if (showCount > 15) itemGap = 20;
    else if (showCount > 10) itemGap = 25;
    else if (showCount > 6) itemGap = 32;

    // 表头
    ctx.fillStyle = '#aaa';
    ctx.font = '20px -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('商品', 180, itemStartY);
    ctx.textAlign = 'right';
    ctx.fillText('数量', 680, itemStartY);
    ctx.fillText('单价', 880, itemStartY);
    ctx.fillText('金额', 1050, itemStartY);

    // 分隔线
    ctx.strokeStyle = '#e0ddd8';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(140, itemStartY + 12);
    ctx.lineTo(W - 140, itemStartY + 12);
    ctx.stroke();

    const rowFont = showCount > 10 ? '20px' : '22px';
    const priceFont = showCount > 10 ? '18px' : '20px';

    itemsToShow.forEach((item, i) => {
      const y = itemStartY + 34 + i * itemGap;

      ctx.fillStyle = '#4a4a4a';
      ctx.font = rowFont + ' -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      const itemLabel = (item.emoji || '📦') + ' ' + item.name;
      const maxNameWidth = 460;
      let displayLabel = itemLabel;
      if (ctx.measureText(itemLabel).width > maxNameWidth) {
        while (displayLabel.length > 4 && ctx.measureText(displayLabel + '…').width > maxNameWidth) {
          displayLabel = displayLabel.slice(0, -1);
        }
        displayLabel += '…';
      }
      ctx.fillText(displayLabel, 180, y);

      ctx.textAlign = 'right';
      ctx.fillText('×' + item.qty, 680, y);

      ctx.fillStyle = '#7a6e5d';
      ctx.font = priceFont + ' "SF Mono", "Menlo", monospace';
      ctx.fillText(formatCurrency(item.price), 880, y);
      ctx.fillText(formatCurrency(item.price * item.qty), 1050, y);
    });

    // 显示省略提示
    if (itemCount > maxItems) {
      const hintY = itemStartY + 34 + showCount * itemGap;
      ctx.fillStyle = '#999';
      ctx.font = '18px -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('… 共 ' + itemCount + ' 种商品，以上展示前 ' + maxItems + ' 种', W / 2, hintY);
    }

    // 累计统计行
    const afterItemsY = itemStartY + 34 + showCount * itemGap + (itemCount > maxItems ? 26 : 8);
    ctx.strokeStyle = '#e0ddd8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, afterItemsY);
    ctx.lineTo(W - 140, afterItemsY);
    ctx.stroke();

    ctx.fillStyle = '#4a4a4a';
    ctx.font = 'bold 24px -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('累计已花', 180, afterItemsY + 36);
    ctx.fillStyle = '#7a6e5d';
    ctx.textAlign = 'right';
    ctx.fillText(formatCurrency(store.lifetimeSpent || 0), 1050, afterItemsY + 36);

    // 底部引导
    const sloganY = afterItemsY + 90;
    ctx.fillStyle = '#7a6e5d';
    drawCenteredText(ctx, '你也来替马斯克花钱吧！', W / 2, sloganY, 'italic 30px "Times New Roman", "Songti SC", serif');
  } else {
    // 无结算数据时显示累计数据
    ctx.fillStyle = '#7a6e5d';
    drawCenteredText(ctx, '累计花掉', W / 2, 400, 'bold 34px -apple-system, "PingFang SC", sans-serif');
    drawCenteredText(ctx, formatCurrency(store.lifetimeSpent || 0), W / 2, 490, 'bold 88px -apple-system, "PingFang SC", sans-serif');

    ctx.fillStyle = '#999';
    drawCenteredText(ctx, '剩余 ' + formatCurrency(Math.max(0, store.balance || 0)), W / 2, 560, '32px -apple-system, "PingFang SC", sans-serif');

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(140, 640);
    ctx.lineTo(W - 140, 640);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#7a6e5d';
    drawCenteredText(ctx, '你也来替马斯克花钱吧！', W / 2, 760, 'italic 36px "Times New Roman", "Songti SC", serif');
  }

  // 加载二维码
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  qrImg.onload = () => {
    const qs = 160, qx = (W - qs) / 2, qy = H - 260;
    ctx.fillStyle = '#fff';
    rr(ctx, qx - 14, qy - 14, qs + 28, qs + 28, 22);
    ctx.fill();
    ctx.strokeStyle = '#7a6e5d';
    ctx.lineWidth = 2;
    rr(ctx, qx - 14, qy - 14, qs + 28, qs + 28, 22);
    ctx.stroke();
    ctx.drawImage(qrImg, qx, qy, qs, qs);

    ctx.fillStyle = '#aaa';
    drawCenteredText(ctx, '扫码或长按识别 · 和朋友一起玩', W / 2, H - 20, '20px -apple-system, "PingFang SC", sans-serif');

    showOverlay(canvas);
  };
  qrImg.onerror = () => showOverlay(canvas);
  qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' +
    encodeURIComponent(SHARE_URL) + '&margin=8';
}

function showOverlay(canvas) {
  const img = document.getElementById('share-card-img');
  if (img) img.src = canvas.toDataURL('image/png');

  const overlay = document.getElementById('share-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  const closeBtn = document.getElementById('share-close-btn');
  if (closeBtn) {
    closeBtn.onclick = hideShareCard;
  }
  if (overlay) {
    overlay.onclick = function(e) {
      if (e.target === overlay) hideShareCard();
    };
  }
}

function hideShareCard() {
  const overlay = document.getElementById('share-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  // 关闭后返回商店
  navigate('shop');
}