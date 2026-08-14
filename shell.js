const ORIGINS = {
  catalog: 'https://carparts-catalog-vue.vercel.app',
  cart: 'https://checkoutapp1.netlify.app',
  account: 'https://e-commerce-microfrontend-account-or.vercel.app'
}

const pendingMessages = {
  catalog: [],
  cart: [],
  account: []
}

function showToast(message) {
  const toast = document.querySelector('#toast')
  toast.textContent = message
  toast.classList.add('is-visible')

  window.clearTimeout(showToast.timeoutId)
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible')
  }, 3200)
}

function openView(viewName) {
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.classList.toggle('is-hidden', panel.dataset.panel !== viewName)
  })

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName)
  })

  window.location.hash = viewName
}

function sendToFrame(frameName, type, detail) {
  const frame = document.querySelector(`#${frameName}-frame`)
  const targetOrigin = ORIGINS[frameName]

  if (!frame || !targetOrigin) return

  const message = {
    source: 'shell',
    type,
    detail
  }

  if (frame.dataset.ready !== 'true') {
    pendingMessages[frameName].push(message)
    return
  }

  frame.contentWindow.postMessage(message, targetOrigin)
}

function flushPendingMessages(frameName) {
  const frame = document.querySelector(`#${frameName}-frame`)
  const targetOrigin = ORIGINS[frameName]

  if (!frame || !targetOrigin) return

  pendingMessages[frameName].forEach((message) => {
    frame.contentWindow.postMessage(message, targetOrigin)
  })

  pendingMessages[frameName] = []
}

function registerFrame(frameName) {
  const frame = document.querySelector(`#${frameName}-frame`)

  frame.addEventListener('load', () => {
    frame.dataset.ready = 'true'
    flushPendingMessages(frameName)
  })
}

window.addEventListener('DOMContentLoaded', () => {
  registerFrame('catalog')
  registerFrame('cart')
  registerFrame('account')

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => openView(button.dataset.view))
  })

  const requestedView = window.location.hash.replace('#', '')
  if (['catalog', 'cart', 'account'].includes(requestedView)) {
    openView(requestedView)
  }
})

window.addEventListener('message', (event) => {
  const message = event.data

  if (!message || typeof message !== 'object') return

  if (
    event.origin === ORIGINS.account &&
    message.source === 'account' &&
    message.type === 'account:wishlist-item-removed'
  ) {
    sendToFrame('catalog', 'shell:wishlist-item-removed', message.detail)
    showToast('Wishlist item removed.')
    return
  }

  if (
    event.origin === ORIGINS.account &&
    message.source === 'account' &&
    message.type === 'account:wishlist-cleared'
  ) {
    sendToFrame('catalog', 'shell:wishlist-cleared', message.detail)
    showToast('Wishlist cleared.')
    return
  }

  if (
    event.origin === ORIGINS.catalog &&
    message.source === 'catalog' &&
    message.type === 'catalog:add-to-cart'
  ) {
    sendToFrame('cart', 'shell:add-to-cart', message.detail)
    openView('cart')
    showToast('Product sent from Catalog to Cart.')
    return
  }

  if (
    event.origin === ORIGINS.catalog &&
    message.source === 'catalog' &&
    message.type === 'catalog:toggle-wishlist'
  ) {
    sendToFrame('account', 'shell:toggle-wishlist', message.detail)
    showToast('Added to Wishlist')
    return
  }

  if (
    event.origin === ORIGINS.cart &&
    message.source === 'cart' &&
    message.type === 'cart:order-placed'
  ) {
    sendToFrame('account', 'shell:order-placed', message.detail)
    openView('account')
    showToast('Order sent to Account history.')
    return
  }

  if (
    event.origin === ORIGINS.account &&
    message.source === 'account' &&
    message.type === 'account:move-to-cart'
  ) {
    sendToFrame('cart', 'shell:add-to-cart', message.detail)
    openView('cart')
    showToast('Wishlist item sent to Cart.')
  }
})