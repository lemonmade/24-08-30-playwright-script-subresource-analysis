import('http://localhost:8080/bar.js');
import('https://cdn.shopify.com/shopifycloud/shop-js/client.js')
console.log('foo');

document.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = 'http://localhost:8080/baz.js';
  script.type = 'module';
  document.body.appendChild(script);
});
