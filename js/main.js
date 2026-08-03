// 主入口 - 初始化应用、路由注册、身价设置

import { initRouter } from './router.js';
import { loadProducts, renderShop } from './shop.js';
import { renderAchievements, renderShare } from './share.js';
import { initNetWorth } from './api.js';
import { hydrateStoreFromCloud } from './store.js';

async function initApp() {
  // 硬登录门：未登录不能玩
  window.GamePlatform.init();
  await window.GamePlatform.mountGate({ gameId: 'spend-money-for-musk' });
  window.GamePlatform.mountBar(document.getElementById('gp-bar'), { gameId: 'spend-money-for-musk' });
  window.GamePlatform.mountLeaderboard(document.getElementById('gp-leaderboard'), { gameId: 'spend-money-for-musk' });

  // 登录后从云端恢复存档
  await hydrateStoreFromCloud();

  // 初始化随机身价（刷新时重新生成，会话内固定）
  initNetWorth();

  // 预热产品数据
  await loadProducts();

  // 初始化哈希路由
  initRouter({
    shop: () => renderShop(),
    achievements: () => renderAchievements(),
    share: () => renderShare()
  });
}

initApp().catch(console.error);
