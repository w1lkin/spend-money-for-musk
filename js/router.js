// Hash 路由模块 - SPA 页面切换
// 支持 #shop / #achievements / #share 三个路由

let renderers = {};

function updateNavActive(route) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.route === route);
  });
}

function handleRouteChange() {
  const hash = window.location.hash.replace('#', '') || 'shop';
  const route = hash.split('/')[0];

  updateNavActive(route);

  const container = document.getElementById('page-container');
  if (container) {
    container.scrollTop = 0;
  }

  if (renderers[route]) {
    renderers[route]();
  } else {
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
  const hash = window.location.hash.replace('#', '') || 'shop';
  return hash.split('/')[0];
}

export { updateNavActive };
