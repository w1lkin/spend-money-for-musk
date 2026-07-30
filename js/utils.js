// 工具函数模块 - 统一人民币展示

const EXCHANGE_RATE = 7.2;

// 始终返回人民币
export function getUserCurrency() {
  return 'cny';
}

// 美元转人民币
export function toCNY(usd) {
  return usd * EXCHANGE_RATE;
}

// 格式化为人民币（精确到元，千分位分隔）
export function formatCurrency(amountInUSD) {
  const value = toCNY(amountInUSD);
  return '\u00a5' + Math.round(value).toLocaleString('en-US');
}

export function animateNumber(el, from, to, duration = 600) {
  const start = performance.now();

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * eased;
    el.textContent = '\u00a5' + Math.floor(current).toLocaleString('en-US');
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = '\u00a5' + Math.floor(to).toLocaleString('en-US');
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

export function showToast(message, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// 底部导入保留
import { getStore } from './store.js';

// 保留旧接口兼容
export function detectCurrency() { return 'cny'; }
export function getCurrencySymbol() { return '\u00a5'; }
export function toDisplayValue(usd) { return toCNY(usd); }
