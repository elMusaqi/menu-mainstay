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
// ============================================================================
// MAINSTAY DRINK POS - FINAL ENGINE (BAGIAN 2)
// ============================================================================

// SYSTEM ROUTING & LOGIN GATE
window.switchRoleView = (role) => {
    document.getElementById('view-customer').classList.add('hidden');
    document.getElementById('view-kasir').classList.add('hidden');
    document.getElementById('view-owner').classList.add('hidden');
    currentRole = role;
    document.getElementById(`view-${role}`).classList.remove('hidden');

    if(role === 'kasir') { window.renderKasirOrders(); window.updateLiveCashDrawer(); }
    if(role === 'owner') window.updateOwnerDashboard();
};

window.bukaModalLogin = () => { document.getElementById('modal-login').classList.replace('hidden', 'flex'); document.getElementById('login-pin').value = ''; document.getElementById('login-error').classList.add('hidden'); };
window.closeModalLogin = () => document.getElementById('modal-login').classList.replace('flex', 'hidden');

window.prosesLogin = async () => {
    const pin = document.getElementById('login-pin').value;
    const errorEl = document.getElementById('login-error');
    errorEl.classList.add('hidden'); 
    
    if (pin === MASTER_PIN) {
        localStorage.setItem('mainstay_session_role', 'owner');
        window.closeModalLogin(); window.switchRoleView('owner'); return;
    }
    try {
        const settingsSnap = await get(ref(db, 'store_settings'));
        if (settingsSnap.exists() && settingsSnap.val().emergency_pin === pin) {
            localStorage.setItem('mainstay_session_role', 'owner');
            window.closeModalLogin(); window.switchRoleView('owner'); return;
        }
        let authenticatedStaff = null;
        Object.keys(globalStaff).forEach(key => { if (globalStaff[key].pin === pin) authenticatedStaff = { id: key, ...globalStaff[key] }; });
        
        if (authenticatedStaff) {
            activeStaff = authenticatedStaff;
            localStorage.setItem('mainstay_session_role', 'kasir');
            localStorage.setItem('mainstay_session_staff', JSON.stringify(activeStaff));
            document.getElementById('kasir-active-name').innerText = activeStaff.name;
            window.closeModalLogin(); window.switchRoleView('kasir');
        } else { errorEl.classList.remove('hidden'); }
    } catch (e) { alert("Gagal memvalidasi. Cek koneksi."); }
};
window.prosesLogout = (role) => {
    if(confirm('Keluar dari sistem?')) {
        localStorage.removeItem('mainstay_session_role'); localStorage.removeItem('mainstay_session_staff');
        if(role === 'kasir') activeStaff = null;
        window.switchRoleView('customer');
    }
};

// ============================================================================
// KASIR VIEW & ORDER MANAGEMENT
// ============================================================================
let activeKasirTab = 'pending';
window.switchKasirTab = (tabId) => {
    activeKasirTab = tabId.replace('tab-', ''); 
    ['pending', 'proses', 'selesai'].forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        if(btn) { btn.classList.toggle('bg-amber-500', t === activeKasirTab); btn.classList.toggle('text-white', t === activeKasirTab); btn.classList.toggle('text-gray-500', t !== activeKasirTab); }
    });
    window.renderKasirOrders(); 
};

window.renderKasirOrders = () => {
    const container = document.getElementById('kasir-orders-container');
    if(!container) return;
    container.innerHTML = '';
    let pendingCount = 0;
    Object.keys(globalOrders).forEach(key => {
        const order = globalOrders[key];
        if(order.status === 'pending') pendingCount++;
        if (order.status === activeKasirTab) {
            const itemsHtml = order.items.map(item => `<p class="text-[10px] font-bold text-gray-700">- ${item.qty}x ${item.name}</p>`).join('');
            let actionButtons = '';
            if (activeKasirTab === 'pending') {
                actionButtons = `<div class="grid grid-cols-2 gap-2 mt-3"><button onclick="updateOrderStatus('${key}', 'proses')" class="bg-amber-500 text-white text-[10px] font-black py-2 rounded-lg">Terima & Masak</button><button onclick="batalOrder('${key}')" class="bg-slate-100 text-red-500 text-[10px] font-black py-2 rounded-lg border">Batal</button></div>`;
            } else if (activeKasirTab === 'proses') {
                actionButtons = `<div class="grid grid-cols-2 gap-2 mt-3"><button onclick="cetakStruk('${key}')" class="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black py-2 rounded-lg">Struk</button><button onclick="updateOrderStatus('${key}', 'selesai')" class="bg-green-500 text-white text-[10px] font-black py-2 rounded-lg">Selesai</button></div>`;
            }
            container.insertAdjacentHTML('beforeend', `<div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3"><div class="flex justify-between items-start mb-2 border-b border-gray-50 pb-2"><div><span class="text-[9px] bg-slate-100 text-slate-600 font-black px-2 py-1 rounded-md">${order.orderId}</span><h3 class="text-xs font-black text-gray-900 mt-1">${order.customerName}</h3></div><div class="text-right"><p class="text-xs font-black text-amber-500">${formatRupiah(order.totalAmount)}</p></div></div><div class="mb-1">${itemsHtml}</div>${actionButtons}</div>`);
        }
    });
    if (container.innerHTML === '') container.innerHTML = `<div class="text-center py-10"><i class="fa-solid fa-inbox text-3xl text-gray-300 mb-3"></i><p class="text-xs font-bold text-gray-400">Kosong.</p></div>`;
    const badgePending = document.getElementById('badge-pending');
    if(badgePending) { badgePending.innerText = pendingCount; badgePending.classList.toggle('hidden', pendingCount === 0); }
};

window.updateOrderStatus = async (key, status) => update(ref(db, `orders/${key}`), { status });

// MODIFIKASI: Batal Order HANYA menggunakan Confirm Pop-Up (Tanpa PIN)
window.batalOrder = async (key) => {
    if(confirm("Yakin ingin membatalkan pesanan ini?")) {
        try { await remove(ref(db, `orders/${key}`)); alert("Pesanan dibatalkan."); } 
        catch(e) { alert("Gagal membatalkan."); }
    }
};

window.updateLiveCashDrawer = () => {
    let totalOmzet = 0, targetLaci = 0; 
    Object.values(globalOrders).forEach(o => {
        if (o.status !== 'pending') {
            totalOmzet += o.totalAmount;
            if (o.paymentMethod === 'Cash') targetLaci += o.totalAmount;
        }
    });
    if(document.getElementById('kasir-omzet-total')) document.getElementById('kasir-omzet-total').innerText = formatRupiah(totalOmzet);
    if(document.getElementById('kasir-drawer-target')) document.getElementById('kasir-drawer-target').innerText = formatRupiah(targetLaci);
};

// ============================================================================
// FULL 8-PANEL MASTER OWNER & CRUD FIREBASE
// ============================================================================
window.updateOwnerDashboard = () => {
    let todayOmzet = 0; Object.values(globalOrders).forEach(o => { if(o.status !== 'pending') todayOmzet += o.totalAmount; });
    if(document.getElementById('owner-omzet-today')) document.getElementById('owner-omzet-today').innerText = formatRupiah(todayOmzet);
    if(document.getElementById('owner-profit-month')) document.getElementById('owner-profit-month').innerText = formatRupiah(todayOmzet * 0.4); 
};
window.closePanel = () => document.getElementById('owner-inner-panels-container').innerHTML = '';

window.openPanel = (panelId) => {
    const fnMap = { 'panel-menu': window.renderPanelMenu, 'panel-hrd': window.renderPanelHRD, 'panel-inventory': window.renderPanelInventory, 'panel-laporan': window.renderPanelLaporan, 'panel-promo': window.renderPanelPromo, 'panel-settings': window.renderPanelSettings, 'panel-member': window.renderPanelMember, 'panel-database': window.renderPanelDatabase };
    if(fnMap[panelId]) fnMap[panelId]();
};

window.simpanNodeData = async (node, payload, callback) => {
    try { await push(ref(db, node), payload); alert("Tersimpan!"); if(callback) callback(); } 
    catch(e) { alert("Gagal menyimpan."); }
};
window.hapusNodeData = async (node, key, callback) => {
    if(confirm("Hapus data secara permanen?")) {
        try { await remove(ref(db, `${node}/${key}`)); if(callback) callback(); } 
        catch(e) { alert("Gagal hapus."); }
    }
};

window.renderPanelMenu = () => {
    let listHtml = Object.keys(globalMenus).map(key => `<div class="bg-white p-3 rounded-xl border mb-2 flex justify-between"><div><h4 class="text-xs font-black">${globalMenus[key].name}</h4><p class="text-[10px] text-amber-500">${formatRupiah(globalMenus[key].price)}</p></div><button onclick="hapusNodeData('menus', '${key}', renderPanelMenu)" class="text-red-500"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="text-[10px]">Kosong</p>';
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Katalog Menu</h2></div><div class="flex-1 overflow-y-auto p-5 pb-safe"><div class="bg-white p-4 rounded-xl border mb-4"><input type="text" id="fm-name" placeholder="Nama Menu" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold"><input type="number" id="fm-price" placeholder="Harga" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold"><select id="fm-cat" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold"><option value="coffee">Coffee</option><option value="non-coffee">Non-Coffee</option><option value="snack">Snack</option></select><button onclick="if(!document.getElementById('fm-name').value) return alert('Isi Nama!'); simpanNodeData('menus', {name: document.getElementById('fm-name').value, price: Number(document.getElementById('fm-price').value), category: document.getElementById('fm-cat').value, isAvailable: true}, renderPanelMenu)" class="w-full bg-amber-500 text-white py-3.5 rounded-xl font-black text-xs">Tambah Menu</button></div>${listHtml}</div></div>`;
};

window.renderPanelHRD = () => {
    let listHtml = Object.keys(globalStaff).map(key => `<div class="bg-white p-3 rounded-xl border mb-2 flex justify-between"><div><h4 class="text-xs font-black">${globalStaff[key].name}</h4><p class="text-[10px] text-gray-500">PIN: ${globalStaff[key].pin}</p></div><button onclick="hapusNodeData('staff', '${key}', renderPanelHRD)" class="text-red-500"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="text-[10px]">Kosong</p>';
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">HRD Staff</h2></div><div class="flex-1 overflow-y-auto p-5 pb-safe"><div class="bg-white p-4 rounded-xl border mb-4"><input type="text" id="fs-name" placeholder="Nama" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold"><input type="number" id="fs-pin" placeholder="PIN (6 Digit)" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold"><button onclick="if(!document.getElementById('fs-pin').value) return alert('Isi PIN!'); simpanNodeData('staff', {name: document.getElementById('fs-name').value, pin: document.getElementById('fs-pin').value, role: 'Kasir'}, renderPanelHRD)" class="w-full bg-purple-600 text-white py-3.5 rounded-xl font-black text-xs">Daftarkan</button></div>${listHtml}</div></div>`;
};

window.renderPanelInventory = () => {
    let listHtml = Object.keys(globalInventory).map(key => `<div class="bg-white p-3 rounded-xl border mb-2 flex justify-between"><h4 class="text-xs font-black">${globalInventory[key].name}</h4><div class="flex gap-3"><span class="text-xs font-black text-orange-500">${globalInventory[key].qty} ${globalInventory[key].unit}</span><button onclick="hapusNodeData('inventory_raw', '${key}', renderPanelInventory)" class="text-red-400"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') || '<p class="text-[10px]">Kosong</p>';
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Gudang Bahan</h2></div><div class="flex-1 overflow-y-auto p-5 pb-safe"><div class="bg-white p-4 rounded-xl border mb-4"><input type="text" id="fi-name" placeholder="Nama Bahan" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold"><div class="flex gap-2 mb-3"><input type="number" id="fi-qty" placeholder="Jml" class="w-1/2 bg-slate-50 border p-3 rounded-xl text-xs font-bold"><input type="text" id="fi-unit" placeholder="Satuan" class="w-1/2 bg-slate-50 border p-3 rounded-xl text-xs font-bold"></div><button onclick="if(!document.getElementById('fi-name').value) return alert('Isi data!'); simpanNodeData('inventory_raw', {name: document.getElementById('fi-name').value, qty: Number(document.getElementById('fi-qty').value), unit: document.getElementById('fi-unit').value}, renderPanelInventory)" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-xs">Input Stok</button></div>${listHtml}</div></div>`;
};

window.renderPanelLaporan = () => {
    let listHtml = Object.keys(globalExpenses).map(key => `<div class="bg-white p-3 rounded-xl border mb-2 flex justify-between"><h4 class="text-xs font-black">${globalExpenses[key].desc}</h4><div class="flex gap-3"><span class="text-xs font-black text-red-500">-${formatRupiah(globalExpenses[key].amount)}</span><button onclick="hapusNodeData('expenses', '${key}', renderPanelLaporan)" class="text-red-400"><i class="fa-solid fa-xmark"></i></button></div></div>`).join('') || '<p class="text-[10px]">Kosong</p>';
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Keuangan</h2></div><div class="flex-1 overflow-y-auto p-5 pb-safe"><div class="bg-white p-4 rounded-xl border mb-4"><input type="text" id="fe-desc" placeholder="Keperluan" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold"><input type="number" id="fe-amount" placeholder="Nominal" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold"><button onclick="if(!document.getElementById('fe-desc').value) return; simpanNodeData('expenses', {desc: document.getElementById('fe-desc').value, amount: Number(document.getElementById('fe-amount').value), date: Date.now()}, renderPanelLaporan)" class="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-xs">Catat Keluar</button></div>${listHtml}</div></div>`;
};

window.renderPanelPromo = async () => {
    const snap = await get(ref(db, 'vouchers')); const vouchers = snap.exists() ? snap.val() : {};
    let listHtml = Object.keys(vouchers).map(key => `<div class="bg-pink-50 p-3 rounded-xl border border-pink-200 mb-2 flex justify-between"><div><h4 class="text-sm font-black text-pink-600">${vouchers[key].code}</h4><p class="text-[9px] text-gray-600">Diskon: ${formatRupiah(vouchers[key].discount)}</p></div><button onclick="hapusNodeData('vouchers', '${key}', window.renderPanelPromo)" class="text-red-500"><i class="fa-solid fa-trash"></i></button></div>`).join('') || '<p class="text-[10px]">Kosong</p>';
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Promo Voucher</h2></div><div class="flex-1 overflow-y-auto p-5 pb-safe"><div class="bg-white p-4 rounded-xl border mb-4"><input type="text" id="fv-code" placeholder="Kode (Cth: PROMO5)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold uppercase"><input type="number" id="fv-disc" placeholder="Nominal Diskon" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold"><button onclick="simpanNodeData('vouchers', {code: document.getElementById('fv-code').value.toUpperCase(), discount: Number(document.getElementById('fv-disc').value), active: true}, window.renderPanelPromo)" class="w-full bg-pink-500 text-white py-3.5 rounded-xl font-black text-xs">Buat Voucher</button></div>${listHtml}</div></div>`;
};

window.renderPanelSettings = async () => {
    const snap = await get(ref(db, 'store_settings')); const settings = snap.exists() ? snap.val() : {};
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Setting Toko</h2></div><div class="flex-1 p-5 pb-safe"><div class="bg-white p-5 rounded-2xl border shadow-sm"><h3 class="text-sm font-black mb-2">PIN Darurat (Reset)</h3><input type="text" id="fset-pin" value="${settings.emergency_pin || ''}" placeholder="PIN Darurat Baru" class="w-full bg-slate-50 border p-4 rounded-xl mb-4 text-sm font-black tracking-widest"><button onclick="update(ref(db, 'store_settings'), {emergency_pin: document.getElementById('fset-pin').value}); alert('Tersimpan!'); closePanel();" class="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs">Simpan Setelan</button></div></div></div>`;
};

window.renderPanelMember = () => {
    let memberCount = 0; Object.values(globalOrders).forEach(o => { if(o.isNewMember) memberCount++; });
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Data Member</h2></div><div class="flex-1 p-5 flex flex-col items-center justify-center"><h3 class="text-4xl font-black text-gray-900 mb-1">${memberCount}</h3><p class="text-xs font-bold text-gray-500 uppercase">Total Member Join</p></div></div>`;
};

window.renderPanelDatabase = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `<div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in"><div class="bg-gray-900 text-white p-4 flex items-center gap-3"><button onclick="closePanel()"><i class="fa-solid fa-arrow-left"></i></button><h2 class="font-black text-lg">Wipe Database</h2></div><div class="flex-1 p-5 pb-safe mt-5"><div class="bg-red-50 p-5 rounded-2xl border border-red-200"><h3 class="text-sm font-black text-red-600 mb-2">Tutup Buku (Wipe Harian)</h3><p class="text-[10px] text-gray-500 mb-5">Semua data pesanan hari ini di layar kasir akan dihapus permanen.</p><button onclick="if(confirm('Yakin ingin hapus antrean hari ini?')) { remove(ref(db, 'orders')); alert('Buku Ditutup!'); closePanel(); }" class="w-full bg-red-500 text-white py-4 rounded-xl font-black text-xs uppercase">Bersihkan Antrean</button></div></div></div>`;
};

// ============================================================================
// STAMP, CETAK & INISIALISASI
// ============================================================================
window.bukaModalStamp = () => { document.getElementById('modal-stamp').classList.replace('hidden', 'flex'); document.getElementById('stamp-result-area').classList.add('hidden'); };
window.closeModalStamp = () => document.getElementById('modal-stamp').classList.replace('flex', 'hidden');
window.cekStampMember = () => {
    const phone = document.getElementById('stamp-phone-check').value; if(!phone) return alert('Isi WA!');
    document.getElementById('stamp-result-area').classList.remove('hidden'); document.getElementById('stamp-member-name').innerText = `Member: ${phone}`;
    document.getElementById('stamp-visual-dots').innerHTML = '<i class="fa-solid fa-circle text-amber-500"></i><i class="fa-solid fa-circle text-amber-500"></i><i class="fa-solid fa-circle text-gray-200"></i>';
    document.getElementById('stamp-count-text').innerText = '2/5';
};

window.cetakStruk = (orderKey) => {
    const order = globalOrders[orderKey]; if(!order) return;
    const html = `<div style="text-align:center; border-bottom:1px dashed #000; padding-bottom:5px; margin-bottom:5px;"><b>MAINSTAY DRINK</b></div><div>ID: ${order.orderId}<br>Tgl: ${new Date(order.timestamp).toLocaleString('id-ID')}<br>Plg: ${order.customerName}</div><div style="border-top:1px dashed #000; padding-top:5px; margin-top:5px;">${order.items.map(i => `${i.qty}x ${i.name}<br>&nbsp;&nbsp;${formatRupiah(i.price)} = ${formatRupiah(i.total)}`).join('<br>')}</div><div style="border-top:1px dashed #000; padding-top:5px; margin-top:5px; font-weight:bold;">TOTAL: ${formatRupiah(order.totalAmount)}</div>`;
    document.getElementById('printable-receipt').innerHTML = html; window.print();
};

const restorePersistentSession = () => {
    const savedRole = localStorage.getItem('mainstay_session_role');
    if (savedRole === 'owner') { window.switchRoleView('owner'); } 
    else if (savedRole === 'kasir') { activeStaff = JSON.parse(localStorage.getItem('mainstay_session_staff')); document.getElementById('kasir-active-name').innerText = activeStaff.name; window.switchRoleView('kasir'); } 
    else { window.switchRoleView('customer'); }
};

document.addEventListener('DOMContentLoaded', () => {
    applyLayoutFixes(); startClock(); initFirebaseListeners(); restorePersistentSession();
});
