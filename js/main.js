// 主入口 - 初始化应用、路由注册、身价设置

import { initRouter } from './router.js';
import { loadProducts, renderShop } from './shop.js';
import { renderAchievements, renderShare } from './share.js';
import { initNetWorth } from './api.js';

async function initApp() {
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
