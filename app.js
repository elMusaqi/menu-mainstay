// ============================================================================
// MAINSTAY DRINK POS - FINAL ENGINE (BAGIAN 1)
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getDatabase, ref, onValue, push, set, update, get, remove 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwBNnNulXL2MA1QGUOu1BAEqnihqHFn0o",
    authDomain: "mainstay-pos.firebaseapp.com",
    databaseURL: "https://mainstay-pos-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mainstay-pos",
    storageBucket: "mainstay-pos.firebasestorage.app",
    messagingSenderId: "97498275061",
    appId: "1:97498275061:web:c2088d6672aabb5886b9bc",
    measurementId: "G-WL2PV7WB5L"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// GLOBAL STATE
let currentRole = 'customer'; 
let activeStaff = null;
let activeCategoryFilter = 'all';
let cart = [];
let currentDetailMenu = null;
let detailQty = 1;

let globalMenus = {};
let globalOrders = {};
let globalStaff = {};
let globalInventory = {};
let globalExpenses = {};

const MASTER_PIN = "888888";
const PLACEHOLDER_IMG = "logo-192.png";

const dummyCatalog = {
    "d1": { name: "Kopi Susu Aren", category: "coffee", price: 18000, imageUrl: "logo-192.png", isAvailable: true, isBestSeller: true },
    "d2": { name: "Matcha Latte", category: "non-coffee", price: 20000, imageUrl: "logo-192.png", isAvailable: true, isBestSeller: false }
};

const formatRupiah = (number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);

const startClock = () => {
    const clockEl = document.getElementById('live-clock');
    if(clockEl) setInterval(() => clockEl.innerHTML = `${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`, 1000);
};

// ============================================================================
// FIX LAYOUT: HAPUS BOTTOM NAV, HAPUS PADDING BAWAH, MUNCULKAN LOGO HEADER
// ============================================================================
const applyLayoutFixes = () => {
    const bottomNav = document.querySelector('nav');
    if(bottomNav) bottomNav.style.display = 'none';

    const appContainer = document.getElementById('app-container');
    if(appContainer) appContainer.classList.remove('pb-20');
    
    ['view-customer', 'view-kasir', 'view-owner'].forEach(id => {
        const sec = document.getElementById(id);
        if(sec) sec.classList.remove('pb-32');
    });

    // Modifikasi memunculkan Logo Gambar di Header sesuai request Anda
    const logoImg = document.getElementById('header-logo-img');
    const logoIcon = document.getElementById('header-logo-icon');
    if(logoImg && logoIcon) {
        logoImg.classList.remove('hidden');
        logoIcon.classList.add('hidden');
    }
};

const initFirebaseListeners = () => {
    onValue(ref(db, 'menus'), (snapshot) => {
        globalMenus = snapshot.exists() ? snapshot.val() : dummyCatalog;
        if(currentRole === 'customer') window.renderKatalog();
        if(currentRole === 'owner' && document.getElementById('owner-menu-list')) window.renderPanelMenu();
    });
    onValue(ref(db, 'orders'), (snapshot) => {
        globalOrders = snapshot.val() || {};
        if(currentRole === 'kasir') { window.renderKasirOrders(); window.updateLiveCashDrawer(); }
        if(currentRole === 'owner') window.updateOwnerDashboard();
    });
    onValue(ref(db, 'staff'), (snapshot) => {
        globalStaff = snapshot.val() || {};
        if(currentRole === 'owner' && document.getElementById('owner-staff-list')) window.renderPanelHRD();
    });
    onValue(ref(db, 'inventory_raw'), (snapshot) => {
        globalInventory = snapshot.val() || {};
        if(currentRole === 'owner' && document.getElementById('owner-inventory-list')) window.renderPanelInventory();
    });
    onValue(ref(db, 'expenses'), (snapshot) => {
        globalExpenses = snapshot.val() || {};
        if(currentRole === 'owner' && document.getElementById('owner-laporan-list')) window.renderPanelLaporan();
    });
};

// ============================================================================
// MESIN CUSTOMER & KERANJANG BELANJA
// ============================================================================
window.filterKategori = (kategori, btnEl) => {
    activeCategoryFilter = kategori;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    if(btnEl) {
        btnEl.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btnEl.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    }
    window.renderKatalog();
};

window.renderKatalog = () => {
    const grid = document.getElementById('menu-grid');
    const searchQuery = (document.getElementById('search-menu').value || '').toLowerCase();
    if(!grid) return;
    grid.innerHTML = ''; 

    const menuKeys = Object.keys(globalMenus);
    if (menuKeys.length === 0) return grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-bold text-xs">Belum ada menu di database.</div>`;

    menuKeys.forEach(key => {
        const menu = globalMenus[key];
        if (activeCategoryFilter !== 'all' && menu.category !== activeCategoryFilter) return;
        if (searchQuery && !menu.name.toLowerCase().includes(searchQuery)) return;
        if (!menu.isAvailable) return; 

        const imgUrl = menu.imageUrl || PLACEHOLDER_IMG;
        grid.insertAdjacentHTML('beforeend', `
            <div onclick="bukaModalDetail('${key}')" class="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-md transition">
                <div class="w-full h-28 bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src="${imgUrl}" alt="${menu.name}" class="w-full h-full object-cover">
                    ${menu.isBestSeller ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-sm uppercase">Best Seller</span>` : ''}
                </div>
                <div class="px-1 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-xs font-black text-gray-900 leading-tight mb-0.5">${menu.name}</h3>
                        <p class="text-[9px] text-gray-400 font-bold">${menu.category}</p>
                    </div>
                    <div class="mt-2 flex justify-between items-end">
                        <span class="text-sm font-black text-amber-500">${formatRupiah(menu.price)}</span>
                        <button class="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px]"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>`);
    });
};

window.bukaModalDetail = (key) => {
    currentDetailMenu = { key, ...globalMenus[key] };
    detailQty = 1;
    document.getElementById('detail-name').innerText = currentDetailMenu.name;
    document.getElementById('detail-img').src = currentDetailMenu.imageUrl || PLACEHOLDER_IMG;
    document.getElementById('detail-qty').innerText = detailQty;
    window.hitungTotalHargaDetail();
    document.getElementById('modal-detail').classList.replace('hidden', 'flex');
};

window.closeModalDetail = () => document.getElementById('modal-detail').classList.replace('flex', 'hidden');

window.ubahQtyDetail = (amount) => {
    if (detailQty + amount >= 1) {
        detailQty += amount;
        document.getElementById('detail-qty').innerText = detailQty;
        window.hitungTotalHargaDetail();
    }
};

window.hitungTotalHargaDetail = () => {
    if (!currentDetailMenu) return;
    let basePrice = Number(currentDetailMenu.price);
    const sizeInput = document.querySelector('input[name="detail_size"]:checked');
    if (sizeInput && sizeInput.value.includes('Large')) basePrice += 3000;
    document.getElementById('detail-total-price').innerText = formatRupiah(basePrice * detailQty);
};

window.tambahKeKeranjang = () => {
    const size = document.querySelector('input[name="detail_size"]:checked').value;
    const sugar = document.querySelector('input[name="detail_sugar"]:checked').value;
    const ice = document.querySelector('input[name="detail_ice"]:checked').value;
    let itemPrice = Number(currentDetailMenu.price);
    if (size.includes('Large')) itemPrice += 3000;

    cart.push({ id: currentDetailMenu.key, name: currentDetailMenu.name, qty: detailQty, price: itemPrice, total: itemPrice * detailQty, notes: `${size}, ${sugar}, ${ice}` });
    window.updateCartBadge();
    window.closeModalDetail();
};

window.updateCartBadge = () => {
    const btnCart = document.getElementById('btn-cart-floating');
    const badge = document.getElementById('cart-badge');
    if(btnCart && badge) {
        if (cart.length > 0) {
            btnCart.classList.replace('hidden', 'flex');
            badge.innerText = cart.length;
        } else {
            btnCart.classList.replace('flex', 'hidden');
        }
    }
};

window.bukaModalCheckout = () => {
    const listEl = document.getElementById('checkout-list');
    listEl.innerHTML = '';
    let grandTotal = 0;
    cart.forEach((item, index) => {
        grandTotal += item.total;
        listEl.insertAdjacentHTML('beforeend', `
            <div class="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                <div><p class="text-xs font-black text-gray-900">${item.name}</p><p class="text-[9px] text-gray-500 font-bold">${item.notes}</p><p class="text-[10px] text-amber-500 font-black mt-0.5">${item.qty} x ${formatRupiah(item.price)}</p></div>
                <button onclick="hapusItemKeranjang(${index})" class="text-red-400 hover:text-red-600"><i class="fa-solid fa-trash text-sm"></i></button>
            </div>`);
    });
    document.getElementById('checkout-total').innerText = formatRupiah(grandTotal);
    document.getElementById('checkout-modal').classList.replace('hidden', 'flex');
};

window.closeModalCheckout = () => document.getElementById('checkout-modal').classList.replace('flex', 'hidden');
window.hapusItemKeranjang = (index) => { cart.splice(index, 1); window.updateCartBadge(); cart.length === 0 ? window.closeModalCheckout() : window.bukaModalCheckout(); };

window.prosesCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong!');
    const payload = {
        orderId: `CSH-${String(new Date().getDate()).padStart(2, '0')}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Object.keys(globalOrders).length + 1).padStart(3, '0')}`,
        customerName: document.getElementById('co-name').value || 'Guest',
        customerPhone: document.getElementById('co-phone').value || '-',
        items: cart, totalAmount: cart.reduce((acc, item) => acc + item.total, 0),
        paymentMethod: document.querySelector('input[name="co_payment"]:checked').value,
        status: 'pending', timestamp: Date.now()
    };
    try {
        await push(ref(db, 'orders'), payload);
        alert(`Pesanan terkirim!\nID: ${payload.orderId}`);
        cart = []; window.updateCartBadge(); window.closeModalCheckout();
    } catch (e) { alert("Gagal mengirim pesanan."); }
};
