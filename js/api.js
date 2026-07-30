// 马斯克身价 - 页面刷新时随机生成 2-4 万亿人民币，会话内固定

import { getStore, saveStore } from './store.js';

const MIN_NET_WORTH_CNY = 2000000000000;  // 2万亿
const MAX_NET_WORTH_CNY = 4000000000000;  // 4万亿
const EXCHANGE_RATE = 7.2;

function generateRandomNetWorth() {
  const cny = MIN_NET_WORTH_CNY + Math.random() * (MAX_NET_WORTH_CNY - MIN_NET_WORTH_CNY);
  return Math.round(cny / EXCHANGE_RATE);
}

export function initNetWorth() {
  const store = getStore();
  const existing = sessionStorage.getItem('musk_session_networth');

  if (existing) {
    // 会话内（路由切换），使用已有值
    return parseInt(existing, 10);
  }

  // 新会话（刷新或首次进入），生成新的随机身价
  const newNetWorth = generateRandomNetWorth();
  sessionStorage.setItem('musk_session_networth', String(newNetWorth));

  // 更新商店数据：余额 = 新身价 - 已花费
  store.balance = Math.max(0, newNetWorth - store.totalSpent);
  store.cachedNetWorth = newNetWorth;
  saveStore(store);

  return newNetWorth;
}

export function getDisplayNetWorth() {
  const existing = sessionStorage.getItem('musk_session_networth');
  if (existing) return parseInt(existing, 10);

  // 降级
  const store = getStore();
  return store.cachedNetWorth || Math.round(350000000000);
}

// 保留接口兼容，但 main.js 现在应调用 initNetWorth
export function startNetWorthPolling(callback) {
  const nw = initNetWorth();
  if (callback) callback(nw);
  // 不再轮询，返回空定时器
  return 0;
}

export async function fetchNetWorth() {
  return initNetWorth();
}
