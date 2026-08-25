// ==========================================
// MAINSTAY DRINK - POS & E-MENU
// Client-side application logic
// ==========================================

'use strict';

// ------------------------------------------
// 1. STATE & DATA
// ------------------------------------------
let currentCart = [];
let cameraStream = null;
let attendanceReviewTimer = null;

const SIZE_PRICES = {
    Small: 0,
    Medium: 3000,
    Large: 6000
};

const MENU_CATALOG = {
    menu_1: {
        name: 'Es Kopi Mainstay',
        description: 'Kopi susu gula aren original dengan krim lembut racikan khusus.',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80',
        basePrice: 16000
    },
    menu_2: {
        name: 'Matcha Latte',
        description: 'Serbuk matcha premium Jepang berpadu susu segar.',
        image: 'https://images.unsplash.com/photo-1536013561472-1c9c3c8c6b06?w=500&q=80',
        basePrice: 18000
    }
};

let currentSelectedMenu = {
    id: 'menu_1',
    name: MENU_CATALOG.menu_1.name,
    description: MENU_CATALOG.menu_1.description,
    image: MENU_CATALOG.menu_1.image,
    basePrice: MENU_CATALOG.menu_1.basePrice,
    size: 'Small',
    qty: 1,
    note: ''
};

const rupiah = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

// ------------------------------------------
// 2. BASIC NAVIGATION & MODALS
// ------------------------------------------
window.switchRoleView = function(role) {
    const validRoles = ['customer', 'kasir', 'owner'];
    if (!validRoles.includes(role)) return;

    validRoles.forEach((name) => {
        const view = document.getElementById(`view-${name}`);
        const button = document.getElementById(`btn-view-${name}`);

        if (view) view.classList.toggle('hidden', name !== role);

        if (button) {
            button.classList.toggle('bg-[#ea580c]', name === role);
            button.classList.toggle('text-white', name === role);
            button.classList.toggle('bg-gray-100', name !== role);
            button.classList.toggle('text-gray-500', name !== role);
        }
    });
};

window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
};

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};

window.openCartReview = function() {
    renderCartReview();
    openModal('modal-cart-review');
};

// ------------------------------------------
// 3. LIVE CLOCK
// ------------------------------------------
function updateClock() {
    const clockElement = document.getElementById('live-clock');
    if (!clockElement) return;

    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((part) => String(part).padStart(2, '0'))
        .join(':');

    clockElement.textContent = `${time} WIB`;
}

// ------------------------------------------
// 4. SMART ATTENDANCE / CAMERA
// ------------------------------------------
async function startCamera() {
    const cameraContainer = document.querySelector('#modal-attendance .aspect-square');
    if (!cameraContainer) return;

    if (!navigator.mediaDevices?.getUserMedia) {
        alert('Browser ini tidak mendukung akses kamera.');
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false
        });

        let videoEl = document.getElementById('attendance-video');

        if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = 'attendance-video';
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.muted = true;
            videoEl.className = 'w-full h-full object-cover absolute inset-0 z-10 rounded-2xl';
            cameraContainer.appendChild(videoEl);
        }

        videoEl.srcObject = cameraStream;
    } catch (error) {
        console.error('Akses kamera gagal:', error);
        alert('Kamera tidak bisa digunakan. Pastikan izin kamera sudah diberikan dan halaman dibuka melalui HTTPS atau localhost.');
    }
}

function stopCamera() {
    if (!cameraStream) return;

    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;

    const videoEl = document.getElementById('attendance-video');
    if (videoEl) videoEl.srcObject = null;
}

window.openAttendanceModal = function() {
    openModal('modal-attendance');
    startCamera();
};

window.closeAttendanceModal = function() {
    closeModal('modal-attendance');
    stopCamera();
};

function handleAbsen(type) {
    const pinInput = document.querySelector('#modal-attendance input[type="password"]');
    const reviewModal = document.getElementById('modal-attendance-review');

    if (!pinInput) {
        console.error('Input PIN absensi tidak ditemukan.');
        return;
    }

    if (!pinInput.value.trim()) {
        alert('Masukkan PIN Anda terlebih dahulu!');
        return;
    }

    window.closeAttendanceModal();

    pinInput.value = '';

    if (!reviewModal) return;

    reviewModal.classList.remove('hidden');

    const statusText = reviewModal.querySelector('[data-attendance-status]');
    if (statusText) {
        statusText.textContent = type === 'masuk' ? 'Absen Masuk berhasil' : 'Absen Pulang berhasil';
    }

    clearTimeout(attendanceReviewTimer);
    attendanceReviewTimer = setTimeout(() => {
        reviewModal.classList.add('hidden');
    }, 5000);
}

// ------------------------------------------
// 5. UNIVERSAL LOGO
// ------------------------------------------
window.syncUniversalLogo = function() {
    const input = document.getElementById('input-logo-url');
    const inputUrl = input?.value.trim();

    if (!inputUrl) {
        alert('Harap paste link URL gambar logo terlebih dahulu!');
        return;
    }

    try {
        new URL(inputUrl);
    } catch {
        alert('URL logo tidak valid.');
        return;
    }

    const previewImg = document.getElementById('preview-logo-upload');
    if (previewImg) {
        previewImg.src = inputUrl;
        previewImg.classList.remove('hidden');
    }

    const headerLogoImg = document.getElementById('header-logo-img');
    const headerLogoIcon = document.getElementById('header-logo-icon');

    if (headerLogoImg) {
        headerLogoImg.src = inputUrl;
        headerLogoImg.classList.remove('hidden');
    }
    if (headerLogoIcon) headerLogoIcon.classList.add('hidden');

    const favicon = document.getElementById('favicon-universal');
    if (favicon) favicon.href = inputUrl;

    const metaOg = document.getElementById('meta-og-image');
    if (metaOg) metaOg.setAttribute('content', inputUrl);

    // Simpan supaya perubahan logo tetap ada saat halaman dibuka lagi.
    localStorage.setItem('mainstay_logo_url', inputUrl);

    // Catatan: browser tidak mengizinkan JavaScript mengubah file manifest.json
    // permanen dari sisi client. Karena itu kita sinkronkan UI + favicon + meta,
    // bukan mengganti file manifest fisik.
    alert('Logo berhasil disinkronkan ke tampilan web, favicon, dan metadata.');
};

function restoreSavedLogo() {
    const savedLogo = localStorage.getItem('mainstay_logo_url');
    if (!savedLogo) return;

    const input = document.getElementById('input-logo-url');
    if (input) input.value = savedLogo;

    const previewImg = document.getElementById('preview-logo-upload');
    if (previewImg) {
        previewImg.src = savedLogo;
        previewImg.classList.remove('hidden');
    }

    const headerLogoImg = document.getElementById('header-logo-img');
    const headerLogoIcon = document.getElementById('header-logo-icon');
    if (headerLogoImg) {
        headerLogoImg.src = savedLogo;
        headerLogoImg.classList.remove('hidden');
    }
    if (headerLogoIcon) headerLogoIcon.classList.add('hidden');

    const favicon = document.getElementById('favicon-universal');
    if (favicon) favicon.href = savedLogo;

    const metaOg = document.getElementById('meta-og-image');
    if (metaOg) metaOg.setAttribute('content', savedLogo);
}

// ------------------------------------------
// 6. MENU DETAIL & QUANTITY
// ------------------------------------------
function getSelectedSizePrice() {
    return currentSelectedMenu.basePrice + SIZE_PRICES[currentSelectedMenu.size];
}

function updateMenuDetailUI() {
    const item = MENU_CATALOG[currentSelectedMenu.id];
    if (!item) return;

    const name = document.getElementById('menu-detail-name');
    const description = document.getElementById('menu-detail-description');
    const image = document.getElementById('menu-detail-image');
    const quantity = document.getElementById('menu-qty');
    const note = document.getElementById('menu-note');

    if (name) name.textContent = item.name;
    if (description) description.textContent = item.description;
    if (image) {
        image.src = item.image;
        image.alt = item.name;
    }
    if (quantity) quantity.textContent = currentSelectedMenu.qty;
    if (note) note.value = currentSelectedMenu.note;

    ['Small', 'Medium', 'Large'].forEach((size) => {
        const radio = document.querySelector(`input[name="size"][value="${size}"]`);
        const label = radio?.parentElement;
        const priceEl = document.getElementById(`menu-price-${size.toLowerCase()}`);

        if (priceEl) priceEl.textContent = rupiah(item.basePrice + SIZE_PRICES[size]);

        if (radio && radio.checked && label) {
            label.classList.remove('border-gray-200');
            label.classList.add('border-[#ea580c]', 'bg-orange-50');
        } else if (label) {
            label.classList.remove('border-[#ea580c]', 'bg-orange-50');
            label.classList.add('border-gray-200');
        }
    });

    const addButton = document.getElementById('btn-add-to-cart');
    if (addButton) {
        const total = getSelectedSizePrice() * currentSelectedMenu.qty;
        addButton.innerHTML = `<span>Tambah Pesanan</span><span>${rupiah(total)}</span>`;
    }
}

window.openMenuDetail = function(menuId) {
    const item = MENU_CATALOG[menuId] || MENU_CATALOG.menu_1;

    currentSelectedMenu = {
        id: menuId || 'menu_1',
        name: item.name,
        description: item.description,
        image: item.image,
        basePrice: item.basePrice,
        size: 'Small',
        qty: 1,
        note: ''
    };

    const smallRadio = document.querySelector('input[name="size"][value="Small"]');
    if (smallRadio) smallRadio.checked = true;

    updateMenuDetailUI();
    openModal('modal-menu-detail');
};

function changeSelectedQty(delta) {
    currentSelectedMenu.qty = Math.max(1, Math.min(99, currentSelectedMenu.qty + delta));
    updateMenuDetailUI();
}

// ------------------------------------------
// 7. CART
// ------------------------------------------
window.addToCart = function() {
    const noteInput = document.getElementById('menu-note');
    currentSelectedMenu.note = noteInput?.value.trim() || '';

    const unitPrice = getSelectedSizePrice();
    const existing = currentCart.find(
        (item) =>
            item.menuId === currentSelectedMenu.id &&
            item.size === currentSelectedMenu.size &&
            item.note === currentSelectedMenu.note
    );

    if (existing) {
        existing.qty += currentSelectedMenu.qty;
        existing.total = existing.qty * existing.price;
    } else {
        currentCart.push({
            id: Date.now(),
            menuId: currentSelectedMenu.id,
            name: currentSelectedMenu.name,
            size: currentSelectedMenu.size,
            qty: currentSelectedMenu.qty,
            price: unitPrice,
            note: currentSelectedMenu.note,
            total: unitPrice * currentSelectedMenu.qty
        });
    }

    currentSelectedMenu.qty = 1;
    currentSelectedMenu.note = '';

    closeModal('modal-menu-detail');
    updateFloatingCartUI();
    renderCartReview();
};

function updateFloatingCartUI() {
    const floatingCart = document.getElementById('floating-cart');
    if (!floatingCart) return;

    const totalItems = currentCart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = currentCart.reduce((sum, item) => sum + item.total, 0);

    floatingCart.classList.toggle('hidden', currentCart.length === 0);

    const badge = floatingCart.querySelector('.absolute.bg-red-500');
    const priceEl = floatingCart.querySelector('.text-sm.font-extrabold');

    if (badge) badge.textContent = totalItems;
    if (priceEl) priceEl.textContent = rupiah(totalPrice);
}

function renderCartReview() {
    const list = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const grandTotalEl = document.getElementById('cart-grand-total');

    if (!list) return;

    if (currentCart.length === 0) {
        list.innerHTML = `
            <div class="text-center py-6 text-xs text-gray-400">
                Keranjang masih kosong.
            </div>
            <button onclick="closeModal('modal-cart-review')" class="w-full text-center text-[#ea580c] text-[10px] font-bold p-2 border border-[#ea580c] rounded-lg border-dashed">
                <i class="fa-solid fa-plus mr-1"></i> Tambah Menu
            </button>
        `;
    } else {
        list.innerHTML = currentCart.map((item) => `
            <div class="flex justify-between items-center pb-3 mb-3 border-b border-gray-100 last:border-0 last:mb-0">
                <div class="pr-2">
                    <h4 class="font-bold text-xs text-gray-900">${escapeHtml(item.qty)}x ${escapeHtml(item.name)}</h4>
                    <p class="text-[9px] text-gray-500">Ukuran ${escapeHtml(item.size)}${item.note ? ` • ${escapeHtml(item.note)}` : ''}</p>
                    <p class="font-bold text-xs text-gray-900 mt-1">${rupiah(item.total)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <button data-cart-action="decrease" data-cart-id="${item.id}" class="w-6 h-6 bg-gray-100 rounded text-gray-500 text-[10px]">−</button>
                    <span class="text-[10px] font-bold min-w-3 text-center">${item.qty}</span>
                    <button data-cart-action="increase" data-cart-id="${item.id}" class="w-6 h-6 bg-gray-100 rounded text-[#ea580c] text-[10px]">+</button>
                </div>
            </div>
        `).join('');

        list.insertAdjacentHTML(
            'beforeend',
            `<button onclick="closeModal('modal-cart-review')" class="w-full mt-2 text-center text-[#ea580c] text-[10px] font-bold p-2 border border-[#ea580c] rounded-lg border-dashed">
                <i class="fa-solid fa-plus mr-1"></i> Tambah Menu Lain
            </button>`
        );
    }

    const subtotal = currentCart.reduce((sum, item) => sum + item.total, 0);

    if (subtotalEl) subtotalEl.textContent = rupiah(subtotal);
    if (grandTotalEl) grandTotalEl.textContent = rupiah(subtotal);
}

function changeCartQty(id, delta) {
    const item = currentCart.find((cartItem) => cartItem.id === id);
    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {
        currentCart = currentCart.filter((cartItem) => cartItem.id !== id);
    } else {
        item.total = item.qty * item.price;
    }

    updateFloatingCartUI();
    renderCartReview();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

// ------------------------------------------
// 8. KASIR / CAROUSEL
// ------------------------------------------
window.openKasirCatalog = function() {
    switchRoleView('customer');
};

window.handleCarouselClick = function() {
    const video = document.getElementById('main-carousel-video');
    if (!video) return;

    if (video.paused) video.play().catch(() => {});
    else video.pause();
};

// ------------------------------------------
// 9. INITIALIZATION
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);

    // Size radio events
    document.querySelectorAll('input[name="size"]').forEach((radio) => {
        radio.value = radio.nextElementSibling?.textContent.trim() || 'Small';

        radio.addEventListener('change', (event) => {
            const size = event.target.value;
            if (!SIZE_PRICES.hasOwnProperty(size)) return;

            currentSelectedMenu.size = size;
            updateMenuDetailUI();
        });
    });

    // Detail quantity
    document.getElementById('menu-qty-minus')?.addEventListener('click', () => changeSelectedQty(-1));
    document.getElementById('menu-qty-plus')?.addEventListener('click', () => changeSelectedQty(1));

    // Add to cart
    document.getElementById('btn-add-to-cart')?.addEventListener('click', window.addToCart);

    // Cart quantity controls
    document.getElementById('cart-items-list')?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-cart-action]');
        if (!button) return;

        const id = Number(button.dataset.cartId);
        const delta = button.dataset.cartAction === 'increase' ? 1 : -1;
        changeCartQty(id, delta);
    });

    // Attendance buttons
    const attendanceButtons = document.querySelectorAll('#modal-attendance button[data-absen-type]');
    attendanceButtons.forEach((button) => {
        button.addEventListener('click', () => handleAbsen(button.dataset.absenType));
    });

    // Kasir tabs
    const kasirTabs = document.querySelectorAll('#view-kasir .overflow-x-auto button');
    kasirTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            kasirTabs.forEach((other) => {
                other.classList.remove('bg-[#ea580c]', 'text-white', 'shadow');
                other.classList.add('bg-gray-100', 'text-gray-500');
            });
            tab.classList.remove('bg-gray-100', 'text-gray-500');
            tab.classList.add('bg-[#ea580c]', 'text-white', 'shadow');
        });
    });

    // Search menu
    const searchInput = document.getElementById('search-menu-customer');
    const menuCards = [...document.querySelectorAll('#menu-grid-customer > div')];

    searchInput?.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        menuCards.forEach((card) => {
            const text = card.textContent.toLowerCase();
            card.classList.toggle('hidden', query && !text.includes(query));
        });
    });

    // Checkout sederhana: cegah pembayaran saat keranjang kosong.
    document.getElementById('btn-checkout')?.addEventListener('click', () => {
        if (currentCart.length === 0) {
            alert('Keranjang masih kosong. Tambahkan menu terlebih dahulu.');
            return;
        }
        alert(`Pesanan siap dibayar. Total ${rupiah(currentCart.reduce((sum, item) => sum + item.total, 0))}.`);
    });

    // Member form
    document.getElementById('check-member')?.addEventListener('change', (event) => {
        const form = document.getElementById('form-member-inputs');
        if (!form) return;

        form.classList.toggle('opacity-50', !event.target.checked);
        form.classList.toggle('pointer-events-none', !event.target.checked);
    });

    restoreSavedLogo();
    updateMenuDetailUI();
    updateFloatingCartUI();
    renderCartReview();
});

// ------------------------------------------
// 10. SERVICE WORKER
// ------------------------------------------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./sw.js')
            .then((registration) => {
                console.log('Service Worker terdaftar:', registration.scope);
            })
            .catch((error) => {
                console.warn('Service Worker gagal terdaftar:', error);
            });
    });
}
