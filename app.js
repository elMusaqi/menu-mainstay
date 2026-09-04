// ============================================================================
// MAINSTAY DRINK POS - TAHAP 1: INISIALISASI FIREBASE & STATE GLOBAL
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getDatabase, ref, onValue, push, set, update, get, remove 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 1. KONFIGURASI FIREBASE (Sesuai Blueprint)
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

// 2. VARIABEL STATE GLOBAL
let currentRole = 'customer'; 
let activeStaff = null;
let activeCategoryFilter = 'all';
let cart = [];
let currentDetailMenu = null;
let detailQty = 1;

// State Sinkronisasi Database
let globalMenus = {};
let globalOrders = {};
let globalStaff = {};
let globalInventory = {};
let globalExpenses = {};

const MASTER_PIN = "888888";
const PLACEHOLDER_IMG = "logo-192.png";

// Data Dummy Katalog (Hanya muncul jika Database Firebase benar-benar kosong)
const dummyCatalog = {
    "dummy_1": { name: "Kopi Susu Aren (Contoh)", category: "coffee", price: 18000, imageUrl: "logo-192.png", isAvailable: true, isBestSeller: true },
    "dummy_2": { name: "Matcha Latte (Contoh)", category: "non-coffee", price: 20000, imageUrl: "logo-192.png", isAvailable: true, isBestSeller: false }
};

// 3. FUNGSI UTILITAS UMUM
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
};

const startClock = () => {
    const clockEl = document.getElementById('live-clock');
    if(clockEl) {
        setInterval(() => {
            const now = new Date();
            clockEl.innerHTML = `${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`;
        }, 1000);
    }
};

// 4. LISTENER REAL-TIME FIREBASE
const initFirebaseListeners = () => {
    onValue(ref(db, 'menus'), (snapshot) => {
        // Fallback ke dummyCatalog jika database kosong agar toko tidak blank
        globalMenus = snapshot.exists() ? snapshot.val() : dummyCatalog;
        if(currentRole === 'customer') renderKatalog();
        if(currentRole === 'owner' && document.getElementById('owner-menu-list')) window.renderPanelMenu();
    });

    onValue(ref(db, 'orders'), (snapshot) => {
        globalOrders = snapshot.val() || {};
        if(currentRole === 'kasir' && typeof renderKasirOrders === 'function') { 
            renderKasirOrders(); 
            if(typeof updateLiveCashDrawer === 'function') updateLiveCashDrawer(); 
        }
        if(currentRole === 'owner' && typeof updateOwnerDashboard === 'function') updateOwnerDashboard();
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
// MAINSTAY DRINK POS - TAHAP 2: MESIN CUSTOMER & KERANJANG
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
    renderKatalog();
};

window.renderKatalog = () => {
    const grid = document.getElementById('menu-grid');
    const searchQuery = (document.getElementById('search-menu').value || '').toLowerCase();
    if(!grid) return;
    grid.innerHTML = ''; 

    const menuKeys = Object.keys(globalMenus);
    if (menuKeys.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-bold text-xs">Belum ada menu di database.</div>`;
        return;
    }

    menuKeys.forEach(key => {
        const menu = globalMenus[key];
        if (activeCategoryFilter !== 'all' && menu.category !== activeCategoryFilter) return;
        if (searchQuery && !menu.name.toLowerCase().includes(searchQuery)) return;
        if (!menu.isAvailable) return; 

        const imgUrl = menu.imageUrl || PLACEHOLDER_IMG;
        const cardHtml = `
            <div onclick="bukaModalDetail('${key}')" class="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-md transition group">
                <div class="w-full h-28 bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src="${imgUrl}" alt="${menu.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                    ${menu.isBestSeller ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">Best Seller</span>` : ''}
                </div>
                <div class="px-1 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-xs font-black text-gray-900 leading-tight mb-0.5">${menu.name}</h3>
                        <p class="text-[9px] text-gray-400 font-bold line-clamp-1">${menu.category}</p>
                    </div>
                    <div class="mt-2 flex justify-between items-end">
                        <span class="text-sm font-black text-amber-500">${formatRupiah(menu.price)}</span>
                        <button class="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px]"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
};

window.bukaModalDetail = (menuKey) => {
    currentDetailMenu = { key: menuKey, ...globalMenus[menuKey] };
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

    cart.push({
        id: currentDetailMenu.key, name: currentDetailMenu.name, qty: detailQty,
        price: itemPrice, total: itemPrice * detailQty, notes: `${size}, ${sugar}, ${ice}`
    });

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
                <div>
                    <p class="text-xs font-black text-gray-900">${item.name}</p>
                    <p class="text-[9px] text-gray-500 font-bold">${item.notes}</p>
                    <p class="text-[10px] text-amber-500 font-black mt-0.5">${item.qty} x ${formatRupiah(item.price)}</p>
                </div>
                <button onclick="hapusItemKeranjang(${index})" class="text-red-400 hover:text-red-600"><i class="fa-solid fa-trash text-sm"></i></button>
            </div>
        `);
    });

    document.getElementById('checkout-total').innerText = formatRupiah(grandTotal);
    document.getElementById('checkout-modal').classList.replace('hidden', 'flex');
};

window.closeModalCheckout = () => document.getElementById('checkout-modal').classList.replace('flex', 'hidden');

window.hapusItemKeranjang = (index) => {
    cart.splice(index, 1);
    window.updateCartBadge();
    cart.length === 0 ? window.closeModalCheckout() : window.bukaModalCheckout();
};

window.prosesCheckout = async () => {
    if (cart.length === 0) return alert('Keranjang kosong!');
    
    // Auto-Generate Order ID
    const today = new Date();
    const prefixDate = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0');
    const seq = String(Object.keys(globalOrders).length + 1).padStart(3, '0');
    const orderId = `CSH-${prefixDate}${seq}`;

    const payload = {
        orderId: orderId,
        customerName: document.getElementById('co-name').value || 'Guest',
        customerPhone: document.getElementById('co-phone').value || '-',
        items: cart,
        totalAmount: cart.reduce((acc, item) => acc + item.total, 0),
        paymentMethod: document.querySelector('input[name="co_payment"]:checked').value,
        status: 'pending',
        timestamp: Date.now()
    };

    try {
        await push(ref(db, 'orders'), payload);
        alert(`Pesanan berhasil dikirim ke kasir!\nID: ${payload.orderId}`);
        cart = [];
        window.updateCartBadge();
        window.closeModalCheckout();
    } catch (error) {
        alert("Gagal mengirim pesanan. Periksa koneksi.");
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 5: FULL 8-PANEL MASTER OWNER & CRUD FIREBASE
// ============================================================================

window.updateOwnerDashboard = () => {
    let todayOmzet = 0;
    Object.values(globalOrders).forEach(o => { 
        if(o.status !== 'pending') todayOmzet += o.totalAmount; 
    });
    const omzetEl = document.getElementById('owner-omzet-today');
    const profitEl = document.getElementById('owner-profit-month');
    if(omzetEl) omzetEl.innerText = formatRupiah(todayOmzet);
    if(profitEl) profitEl.innerText = formatRupiah(todayOmzet * 0.4); // Asumsi Net 40%
};

window.closePanel = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = '';
};

// Router Pembuka 8 Panel Owner
window.openPanel = (panelId) => {
    const fnMap = {
        'panel-menu': window.renderPanelMenu,
        'panel-hrd': window.renderPanelHRD,
        'panel-inventory': window.renderPanelInventory,
        'panel-laporan': window.renderPanelLaporan,
        'panel-promo': window.renderPanelPromo,
        'panel-settings': window.renderPanelSettings,
        'panel-member': window.renderPanelMember,
        'panel-database': window.renderPanelDatabase
    };
    if(fnMap[panelId]) fnMap[panelId]();
};

// Global Reusable CRUD Handlers untuk Owner Panel
window.simpanNodeData = async (node, payload, callback) => {
    const btn = event.target.closest('button');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menyimpan...';
    try {
        await push(ref(db, node), payload);
        alert("Sukses! Data disimpan ke Database.");
        if(callback) callback();
    } catch(e) {
        alert("Gagal menyimpan data.");
    } finally {
        btn.innerHTML = oriText;
    }
};

window.hapusNodeData = async (node, key, callback) => {
    if(confirm("PERINGATAN: Yakin ingin menghapus data ini secara permanen?")) {
        try {
            await remove(ref(db, `${node}/${key}`));
            if(callback) callback();
        } catch(e) { alert("Gagal menghapus."); }
    }
};

// --- PANEL 1: KATALOG MENU ---
window.renderPanelMenu = () => {
    let listHtml = Object.keys(globalMenus).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-2">
            <div>
                <h4 class="text-xs font-black text-gray-900">${globalMenus[key].name}</h4>
                <p class="text-[10px] text-gray-500 font-bold uppercase">${globalMenus[key].category} • <span class="text-amber-500">${formatRupiah(globalMenus[key].price)}</span></p>
            </div>
            <button onclick="hapusNodeData('menus', '${key}', renderPanelMenu)" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>`).join('') || '<p class="text-[10px] text-center text-gray-400">Database Menu Kosong</p>';

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Katalog Menu</h2><p class="text-[10px] text-amber-400 font-bold">Sinkronisasi Real-time</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm">
                    <input type="text" id="fm-name" placeholder="Nama Menu (Cth: Kopi Aren)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold focus:border-amber-500 outline-none">
                    <input type="number" id="fm-price" placeholder="Harga (Cth: 15000)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold focus:border-amber-500 outline-none">
                    <select id="fm-cat" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold focus:border-amber-500 outline-none">
                        <option value="coffee">Coffee</option><option value="non-coffee">Non-Coffee</option><option value="snack">Snack</option>
                    </select>
                    <button onclick="simpanNodeData('menus', {name: document.getElementById('fm-name').value, price: Number(document.getElementById('fm-price').value), category: document.getElementById('fm-cat').value, isAvailable: true}, renderPanelMenu)" class="w-full bg-amber-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider"><i class="fa-solid fa-plus"></i> Tambah Menu</button>
                </div>
                <h3 class="text-xs font-black text-gray-900 mb-3 border-b pb-2">Menu Tersimpan</h3>
                <div>${listHtml}</div>
            </div>
        </div>`;
};

// --- PANEL 2: HRD STAFF ---
window.renderPanelHRD = () => {
    let listHtml = Object.keys(globalStaff).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-2 border-l-4 border-l-purple-500">
            <div>
                <h4 class="text-xs font-black text-gray-900">${globalStaff[key].name}</h4>
                <p class="text-[10px] text-gray-500 font-bold bg-slate-100 px-2 py-0.5 rounded mt-1 w-fit">PIN Kasir: ${globalStaff[key].pin}</p>
            </div>
            <button onclick="hapusNodeData('staff', '${key}', renderPanelHRD)" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>`).join('') || '<p class="text-[10px] text-center text-gray-400">Belum Ada Karyawan</p>';

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">HRD & Karyawan</h2><p class="text-[10px] text-purple-400 font-bold">Atur PIN Login Kasir</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm">
                    <input type="text" id="fs-name" placeholder="Nama Karyawan" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold focus:border-purple-500 outline-none">
                    <input type="number" id="fs-pin" placeholder="Buat 6 Digit PIN" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold tracking-widest focus:border-purple-500 outline-none">
                    <button onclick="simpanNodeData('staff', {name: document.getElementById('fs-name').value, pin: document.getElementById('fs-pin').value, role: 'Kasir'}, renderPanelHRD)" class="w-full bg-purple-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider"><i class="fa-solid fa-user-plus"></i> Daftarkan</button>
                </div>
                <h3 class="text-xs font-black text-gray-900 mb-3 border-b pb-2">Karyawan Aktif</h3>
                <div>${listHtml}</div>
            </div>
        </div>`;
};

// --- PANEL 3: INVENTORY (GUDANG) ---
window.renderPanelInventory = () => {
    let listHtml = Object.keys(globalInventory).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center mb-2 shadow-sm">
            <div>
                <h4 class="text-xs font-black text-gray-900">${globalInventory[key].name}</h4>
                <p class="text-xs font-black text-orange-500 mt-1">${globalInventory[key].qty} ${globalInventory[key].unit}</p>
            </div>
            <button onclick="hapusNodeData('inventory_raw', '${key}', renderPanelInventory)" class="text-red-400 p-2"><i class="fa-solid fa-trash text-sm"></i></button>
        </div>`).join('') || '<p class="text-[10px] text-center text-gray-400">Gudang Kosong</p>';

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Stok Gudang</h2><p class="text-[10px] text-orange-400 font-bold">Bahan Baku (Raw)</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border mb-4 shadow-sm">
                    <input type="text" id="fi-name" placeholder="Nama Bahan (Cup, Susu, dll)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold outline-none">
                    <div class="flex gap-2 mb-3">
                        <input type="number" id="fi-qty" placeholder="Jumlah" class="w-1/2 bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none">
                        <input type="text" id="fi-unit" placeholder="Satuan (Pcs/L)" class="w-1/2 bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none">
                    </div>
                    <button onclick="simpanNodeData('inventory_raw', {name: document.getElementById('fi-name').value, qty: document.getElementById('fi-qty').value, unit: document.getElementById('fi-unit').value}, renderPanelInventory)" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-xs uppercase"><i class="fa-solid fa-box-open"></i> Input Stok</button>
                </div>
                <div>${listHtml}</div>
            </div>
        </div>`;
};

// --- PANEL 4: LAPORAN (PENGELUARAN) ---
window.renderPanelLaporan = () => {
    let listHtml = Object.keys(globalExpenses).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center mb-2 shadow-sm border-l-4 border-l-red-500">
            <div>
                <h4 class="text-xs font-black text-gray-900">${globalExpenses[key].desc}</h4>
                <p class="text-[9px] text-gray-400">${new Date(globalExpenses[key].date).toLocaleDateString()}</p>
            </div>
            <div class="text-right flex items-center gap-3">
                <span class="text-xs font-black text-red-500">-${formatRupiah(globalExpenses[key].amount)}</span>
                <button onclick="hapusNodeData('expenses', '${key}', renderPanelLaporan)" class="text-gray-300 hover:text-red-500"><i class="fa-solid fa-xmark"></i></button>
            </div>
        </div>`).join('') || '<p class="text-[10px] text-center text-gray-400">Belum ada pengeluaran dicatat.</p>';

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Keuangan & Kasbon</h2><p class="text-[10px] text-green-400 font-bold">Catat Pengeluaran Operasional</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border mb-4 shadow-sm">
                    <input type="text" id="fe-desc" placeholder="Keperluan (Cth: Token Listrik)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-bold outline-none focus:border-green-500">
                    <input type="number" id="fe-amount" placeholder="Nominal Rp" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold outline-none focus:border-green-500">
                    <button onclick="simpanNodeData('expenses', {desc: document.getElementById('fe-desc').value, amount: Number(document.getElementById('fe-amount').value), date: Date.now()}, renderPanelLaporan)" class="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider"><i class="fa-solid fa-money-bill-transfer"></i> Catat Pengeluaran</button>
                </div>
                <h3 class="text-xs font-black text-gray-900 mb-3 border-b pb-2">Riwayat Pengeluaran</h3>
                <div>${listHtml}</div>
            </div>
        </div>`;
};

// --- PANEL 5: PROMO & VOUCHER ---
window.renderPanelPromo = async () => {
    // Ambil data voucher on the fly
    const snap = await get(ref(db, 'vouchers'));
    const vouchers = snap.exists() ? snap.val() : {};
    
    let listHtml = Object.keys(vouchers).map(key => `
        <div class="bg-white p-3 rounded-xl border border-dashed border-pink-300 flex justify-between items-center mb-2 bg-pink-50/30">
            <div>
                <h4 class="text-xs font-black text-pink-600">${vouchers[key].code}</h4>
                <p class="text-[9px] font-bold text-gray-600">Diskon: Rp ${vouchers[key].discount}</p>
            </div>
            <button onclick="hapusNodeData('vouchers', '${key}', window.renderPanelPromo)" class="text-red-400"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('') || '<p class="text-[10px] text-center text-gray-400">Tidak ada Promo Aktif</p>';

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Promo & Voucher</h2><p class="text-[10px] text-pink-400 font-bold">Sebar kode ke pelanggan</p></div>
            </div>
            <div class="flex-1 overflow-y-auto p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border mb-4 shadow-sm border-pink-100">
                    <input type="text" id="fv-code" placeholder="Kode Unik (Cth: JUMATBERKAH)" class="w-full bg-slate-50 border p-3 rounded-xl mb-2 text-xs font-black uppercase outline-none">
                    <input type="number" id="fv-disc" placeholder="Nominal Diskon (Cth: 5000)" class="w-full bg-slate-50 border p-3 rounded-xl mb-3 text-xs font-bold outline-none">
                    <button onclick="simpanNodeData('vouchers', {code: document.getElementById('fv-code').value.toUpperCase(), discount: Number(document.getElementById('fv-disc').value), active: true}, window.renderPanelPromo)" class="w-full bg-pink-500 text-white py-3.5 rounded-xl font-black text-xs uppercase"><i class="fa-solid fa-ticket"></i> Buat Voucher</button>
                </div>
                <div>${listHtml}</div>
            </div>
        </div>`;
};

// --- PANEL 6: SETTINGS TOKO ---
window.renderPanelSettings = async () => {
    const snap = await get(ref(db, 'store_settings'));
    const settings = snap.exists() ? snap.val() : { emergency_pin: '', store_name: 'Mainstay Drink' };

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Setting Toko</h2><p class="text-[10px] text-slate-400 font-bold">Konfigurasi Sistem</p></div>
            </div>
            <div class="flex-1 p-5 pb-safe">
                <div class="bg-white p-4 rounded-xl border shadow-sm">
                    <label class="text-[10px] font-bold text-gray-500 mb-1 block">PIN Darurat (Backup Master)</label>
                    <input type="text" id="fset-pin" value="${settings.emergency_pin || ''}" placeholder="PIN Darurat" class="w-full bg-slate-50 border p-3 rounded-xl mb-4 text-xs font-bold tracking-widest outline-none">
                    
                    <button onclick="update(ref(db, 'store_settings'), {emergency_pin: document.getElementById('fset-pin').value}); alert('Setelan Disimpan!'); closePanel();" class="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider"><i class="fa-solid fa-save"></i> Simpan Setelan</button>
                </div>
            </div>
        </div>`;
};

// --- PANEL 7: MEMBER & STAMP ---
window.renderPanelMember = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Database Member</h2><p class="text-[10px] text-amber-400 font-bold">Loyalty & Stamp</p></div>
            </div>
            <div class="flex-1 p-5 text-center text-gray-500 text-xs font-bold flex flex-col items-center justify-center mt-10">
                <i class="fa-solid fa-users text-4xl text-amber-500 mb-4 opacity-50"></i>
                <p>Database Member terekam otomatis saat pelanggan melakukan checkout dan memasukkan nomor WhatsApp.</p>
            </div>
        </div>`;
};

// --- PANEL 8: DATABASE & BACKUP ---
window.renderPanelDatabase = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-arrow-left"></i></button>
                <div><h2 class="font-black text-lg leading-none">Data & Backup</h2><p class="text-[10px] text-cyan-400 font-bold">Wipe & Export Data</p></div>
            </div>
            <div class="flex-1 p-5 pb-safe flex flex-col gap-4 mt-4">
                <div class="bg-red-50 p-4 rounded-xl border border-red-200">
                    <h3 class="text-xs font-black text-red-600 mb-1">Tutup Buku (Harian)</h3>
                    <p class="text-[10px] text-red-500 mb-3">Tindakan ini akan menghapus seluruh data antrean pesanan di layar Kasir agar siap untuk esok hari.</p>
                    <button onclick="if(confirm('Wipe semua pesanan hari ini?')) { remove(ref(db, 'orders')); alert('Antrean Bersih!'); closePanel(); }" class="w-full bg-red-500 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-sm"><i class="fa-solid fa-broom"></i> Bersihkan Antrean</button>
                </div>
            </div>
        </div>`;
};

// ==============================================================
