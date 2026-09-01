/* ==========================================================================
   MAINSTAY DRINK POS - FULL SYSTEM SCRIPT (PART 1 DARI 3)
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
    // INFO: Ganti dengan Config Firebase Anda nanti jika diperlukan. Ini menggunakan database default.
    databaseURL: "https://mainstaydrink-default-rtdb.firebaseio.com/" 
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- GLOBAL STATE ---
window.AppState = {
    menus: {}, rawMenus: {},
    orders: {}, rawOrders: {},
    inventory: {}, rawInventory: {},
    staff: {}, rawStaff: {},
    attendance: {}, rawAttendance: {},
    finance: {}, rawFinance: {},
    storeSettings: {}, rawSettings: {},
    members: {}, rawMembers: {},
    cart: [],
    activeStaffName: "Guest",
    targetLoginRole: "kasir"
};

window.activeKategori = 'all';

// --- FORMAT RUPIAH ---
window.formatRupiah = function(angka) {
    if(!angka) return 'Rp 0';
    return 'Rp ' + parseInt(angka).toLocaleString('id-ID');
};

// --- FETCH DATA DARI FIREBASE ---
function initFirebase() {
    const refs = ['menus', 'orders', 'inventory', 'staff', 'attendance', 'finance', 'storeSettings', 'members'];
    refs.forEach(key => {
        onValue(ref(db, key), (snapshot) => {
            const data = snapshot.val() || {};
            window.AppState[key] = data;
            const capKey = key.charAt(0).toUpperCase() + key.slice(1);
            window.AppState[`raw${capKey}`] = data;
            
            if(key === 'menus') window.renderKatalog();
            if(key === 'orders') {
                if(typeof window.renderKasirList === 'function') window.renderKasirList();
                if(typeof window.updateDashboardOwner === 'function') window.updateDashboardOwner();
            }
            if(key === 'storeSettings') window.applyTokoSettings();
        });
    });
}

// --- FUNGSI TAMPILAN UTAMA & NAVIGASI BAWAH ---
window.switchRoleView = function(role) {
    document.getElementById('view-customer').classList.add('hidden');
    document.getElementById('view-kasir').classList.add('hidden');
    document.getElementById('view-owner').classList.add('hidden');
    
    document.querySelectorAll('.nav-indicator').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-gray-400');
    });

    const targetView = document.getElementById(`view-${role}`);
    const targetNav = document.getElementById(`nav-${role}`);
    
    if(targetView) targetView.classList.remove('hidden');
    if(targetNav) {
        targetNav.classList.remove('text-gray-400');
        targetNav.classList.add('text-amber-500');
        targetNav.querySelector('.nav-indicator').classList.remove('hidden');
    }

    const footer = document.getElementById('customer-footer');
    if(footer) {
        if(role === 'customer') footer.classList.remove('hidden');
        else footer.classList.add('hidden');
    }

    if(role === 'kasir') {
        if(window.AppState.activeStaffName === "Guest") {
            window.AppState.targetLoginRole = 'kasir';
            document.getElementById('login-title').innerText = "Akses Kasir";
            document.getElementById('login-desc').innerText = "Masukkan PIN Kasir Anda.";
            document.getElementById('modal-login').classList.remove('hidden');
            document.getElementById('modal-login').classList.add('flex');
            switchRoleView('customer'); 
        } else {
            if(typeof window.renderKasirList === 'function') window.renderKasirList();
        }
    }
    
    if(role === 'owner') {
        if(window.AppState.activeStaffName !== "Owner Master") {
            window.AppState.targetLoginRole = 'owner';
            document.getElementById('login-title').innerText = "Pusat Kendali Master";
            document.getElementById('login-desc').innerText = "Masukkan PIN Owner untuk melanjutkan.";
            document.getElementById('modal-login').classList.remove('hidden');
            document.getElementById('modal-login').classList.add('flex');
            switchRoleView('customer');
        } else {
            if(typeof window.updateDashboardOwner === 'function') window.updateDashboardOwner();
        }
    }
};

window.closeLoginModal = function() {
    document.getElementById('modal-login').classList.add('hidden');
    document.getElementById('modal-login').classList.remove('flex');
    switchRoleView('customer');
};

window.prosesLogin = function() {
    const pin = document.getElementById('login-pin').value;
    const err = document.getElementById('login-error');
    const target = window.AppState.targetLoginRole;
    
    if(pin === '888888' && target === 'owner') {
        err.classList.add('hidden');
        window.AppState.activeStaffName = "Owner Master";
        document.getElementById('modal-login').classList.add('hidden');
        document.getElementById('modal-login').classList.remove('flex');
        switchRoleView('owner');
        return;
    }
    
    if((pin === '123456' || pin === '654321' || pin === '888888') && target === 'kasir') {
        err.classList.add('hidden');
        window.AppState.activeStaffName = pin === '888888' ? "Owner Master" : "Kasir Shift";
        document.getElementById('modal-login').classList.add('hidden');
        document.getElementById('modal-login').classList.remove('flex');
        switchRoleView('kasir');
        return;
    }
    
    err.classList.remove('hidden');
};

window.prosesLogout = function(role) {
    if(confirm(`Yakin ingin keluar dari akses ${role}?`)) {
        window.AppState.activeStaffName = "Guest";
        switchRoleView('customer');
    }
};

// --- JAM & TANGGAL REALTIME ---
setInterval(() => {
    const el = document.getElementById('live-clock');
    if(el) {
        const now = new Date();
        el.innerText = now.toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'}) + ' WIB';
    }
}, 1000);
/* ==========================================================================
   MAINSTAY DRINK POS - FULL SYSTEM SCRIPT (PART 2 DARI 3)
   ========================================================================== */

// --- PENERAPAN LOGO, SOSMED, WA, DAN QRIS ---
window.applyTokoSettings = function() {
    const s = window.AppState.storeSettings;
    if (!s) return;
    
    // Terapkan Logo
    const img = document.getElementById('header-logo-img');
    const icon = document.getElementById('header-logo-icon');
    if(s.logo && img && icon) {
        img.src = s.logo;
        img.classList.remove('hidden');
        icon.classList.add('hidden');
    }
    
    // Terapkan Link Footer (Maps & Sosmed)
    const linkWA = document.getElementById('link-wa');
    const linkIG = document.getElementById('link-ig');
    const linkTikTok = document.getElementById('link-tiktok');
    
    if (s.phoneWA && linkWA) {
        let wa = s.phoneWA.startsWith('0') ? '62' + s.phoneWA.substring(1) : s.phoneWA;
        linkWA.href = `https://wa.me/${wa}?text=Halo%20Mainstay%20Drink,%20saya%20ingin%20pesan...`;
    }
    if (s.ig && linkIG) linkIG.href = s.ig;
    if (s.tiktok && linkTikTok) linkTikTok.href = s.tiktok;
    
    // Terapkan QRIS Pembayaran
    const qrisImg = document.getElementById('qris-img-display');
    if (s.qris && qrisImg) qrisImg.src = s.qris;
};

// --- KATALOG CUSTOMER (ANTI ERROR DATA KOSONG) ---
window.renderKatalog = function() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    const menusData = window.AppState.menus || {};
    const activeCat = window.activeKategori || 'all';
    const searchInput = document.getElementById('search-menu');
    const keyword = searchInput ? searchInput.value.toLowerCase() : '';
    
    grid.innerHTML = '';
    let count = 0;

    Object.keys(menusData).forEach(key => {
        const menu = menusData[key];
        if (!menu) return;

        const nama = (menu.nama || 'Menu Baru').toLowerCase();
        const desc = (menu.deskripsi || '').toLowerCase();
        const kategori = (menu.kategori || '');
        const harga = menu.harga || 0;
        const img = menu.gambar || 'https://via.placeholder.com/300?text=Menu';

        if (keyword && !nama.includes(keyword) && !desc.includes(keyword)) return;
        
        if (activeCat !== 'all') {
            if (typeof kategori === 'string' && !kategori.toLowerCase().includes(activeCat.toLowerCase())) return;
            if (Array.isArray(kategori) && !kategori.some(k => k && k.toLowerCase().includes(activeCat.toLowerCase()))) return;
        }

        count++;
        const formatRp = window.formatRupiah(harga);

        grid.innerHTML += `
            <div class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full cursor-pointer hover:shadow-md transition" onclick="openMenuDetail('${key}')">
                <div class="w-full h-28 bg-gray-100 rounded-xl mb-3 overflow-hidden">
                    <img src="${img}" class="w-full h-full object-cover">
                </div>
                <h3 class="text-sm font-black text-gray-900 mb-1">${menu.nama || 'Menu'}</h3>
                <p class="text-[10px] text-gray-500 font-bold mb-3 line-clamp-2">${menu.deskripsi || ''}</p>
                <div class="mt-auto flex justify-between items-end">
                    <span class="text-amber-500 font-black text-sm">${formatRp}</span>
                    <button class="w-8 h-8 bg-amber-500 rounded-full text-white flex items-center justify-center shadow-sm pointer-events-none">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
    });

    if (count === 0) grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400 font-bold">Belum ada menu di kategori ini.</div>';
};

// (Perbaikan Error NodeList classList ada di sini - menggunakan forEach)
window.filterKategori = function(cat, element) {
    window.activeKategori = cat;
    document.querySelectorAll('.cat-btn').forEach(b => {
        if(b && b.classList) {
            b.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
            b.classList.add('bg-slate-100', 'text-gray-600');
        }
    });
    if(element && element.classList) {
        element.classList.remove('bg-slate-100', 'text-gray-600');
        element.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md');
    }
    window.renderKatalog();
};

// --- MODAL DETAIL MINUMAN ---
let currentSelectedMenu = null;
let qtyDetail = 1;

window.openMenuDetail = function(menuKey) {
    const menu = window.AppState.menus[menuKey];
    if(!menu) return;
    currentSelectedMenu = { ...menu, id: menuKey };
    qtyDetail = 1;
    
    document.getElementById('detail-img').src = menu.gambar || 'https://via.placeholder.com/300';
    document.getElementById('detail-name').innerText = menu.nama || '';
    document.getElementById('detail-desc').innerText = menu.deskripsi || '';
    
    // Reset Radio Buttons
    const sizeR = document.getElementById('opt-size-r');
    const sugarN = document.getElementById('opt-sugar-normal');
    const iceN = document.getElementById('opt-ice-normal');
    if(sizeR) sizeR.checked = true;
    if(sugarN) sugarN.checked = true;
    if(iceN) iceN.checked = true;
    
    window.hitungTotalHargaDetail();
    
    document.getElementById('modal-detail').classList.remove('hidden');
    document.getElementById('modal-detail').classList.add('flex');
};

window.closeMenuDetail = function() {
    document.getElementById('modal-detail').classList.add('hidden');
    document.getElementById('modal-detail').classList.remove('flex');
};

window.ubahQtyDetail = function(delta) {
    qtyDetail += delta;
    if(qtyDetail < 1) qtyDetail = 1;
    window.hitungTotalHargaDetail();
};

window.hitungTotalHargaDetail = function() {
    if(!currentSelectedMenu) return;
    document.getElementById('detail-qty').innerText = qtyDetail;
    
    let hargaBase = parseInt(currentSelectedMenu.harga || 0);
    const sizeL = document.getElementById('opt-size-l');
    let extraSize = (sizeL && sizeL.checked) ? 3000 : 0;
    let total = (hargaBase + extraSize) * qtyDetail;
    
    document.getElementById('detail-total-price').innerText = window.formatRupiah(total);
    return total;
};

// --- SISTEM KERANJANG BELANJA ---
window.tambahKeKeranjang = function() {
    if(!currentSelectedMenu) return;
    
    let size = document.querySelector('input[name="detail_size"]:checked')?.value || 'Regular';
    let sugar = document.querySelector('input[name="detail_sugar"]:checked')?.value || 'Normal';
    let ice = document.querySelector('input[name="detail_ice"]:checked')?.value || 'Normal';
    
    let extraSize = size === 'Large (+3K)' ? 3000 : 0;
    let hargaSatuan = parseInt(currentSelectedMenu.harga || 0) + extraSize;
    let totalHarga = hargaSatuan * qtyDetail;
    
    window.AppState.cart.push({
        id: currentSelectedMenu.id,
        nama: currentSelectedMenu.nama,
        hargaSatuan: hargaSatuan,
        qty: qtyDetail,
        total: totalHarga,
        catatan: `Size: ${size}, Sugar: ${sugar}, Ice: ${ice}`
    });
    
    window.closeMenuDetail();
    window.updateCartUI();
};

window.updateCartUI = function() {
    const cartBadge = document.getElementById('cart-badge');
    const cartBtn = document.getElementById('btn-cart-floating');
    
    let totalItem = 0;
    window.AppState.cart.forEach(item => totalItem += item.qty);
    
    if(cartBadge) cartBadge.innerText = totalItem;
    
    if(totalItem > 0) {
        if(cartBadge) cartBadge.classList.remove('hidden');
        if(cartBtn) {
            cartBtn.classList.remove('hidden');
            cartBtn.classList.add('flex');
        }
    } else {
        if(cartBadge) cartBadge.classList.add('hidden');
        if(cartBtn) {
            cartBtn.classList.add('hidden');
            cartBtn.classList.remove('flex');
        }
    }
};

window.openCheckout = function() {
    document.getElementById('checkout-modal').classList.remove('hidden');
    document.getElementById('checkout-modal').classList.add('flex');
    window.renderCheckoutItems();
};

window.closeCheckout = function() {
    document.getElementById('checkout-modal').classList.add('hidden');
    document.getElementById('checkout-modal').classList.remove('flex');
};
/* ==========================================================================
   MAINSTAY DRINK POS - FULL SYSTEM SCRIPT (PART 3 AKHIR)
   ========================================================================== */

// --- PROSES CHECKOUT & PUSH KE FIREBASE ---
window.renderCheckoutItems = function() {
    const list = document.getElementById('checkout-list');
    const totalEl = document.getElementById('checkout-total');
    if(!list || !totalEl) return;
    
    list.innerHTML = '';
    let total = 0;
    
    window.AppState.cart.forEach(item => {
        total += item.total;
        list.innerHTML += `
            <div class="flex justify-between text-xs mb-2 pb-2 border-b border-gray-100">
                <div>
                    <span class="font-bold text-gray-800">${item.nama}</span> <span class="text-amber-500 font-black">x${item.qty}</span><br>
                    <span class="text-[9px] text-gray-400">${item.catatan}</span>
                </div>
                <div class="font-black text-gray-900">${window.formatRupiah(item.total)}</div>
            </div>`;
    });
    totalEl.innerText = window.formatRupiah(total);
};

window.prosesCheckout = function() {
    if(window.AppState.cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }
    
    const nama = document.getElementById('co-name')?.value || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;

    const now = new Date();
    // Membuat ID Unik (BulanTahun-6DigitRandom)
    const monthPrefix = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
    const orderId = `ORD-${monthPrefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);

    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending' // Status awal pesanan baru
    };

    // Panggil Firebase dari Module Scope (Part 1)
    import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js").then((module) => {
        const { getDatabase, ref, set, push } = module;
        const db = getDatabase();
        const newOrderRef = push(ref(db, 'orders'));
        
        set(newOrderRef, orderData).then(() => {
            alert(`✅ Pesanan Berhasil Dibuat!\nNomor Pesanan Anda: ${orderId}`);
            
            // Simpan Member jika dicentang
            if(isMember && phone) {
                const memberRef = push(ref(db, 'members'));
                set(memberRef, { nama: nama, phone: phone, joinDate: now.toISOString() });
            }
            
            window.AppState.cart = [];
            window.updateCartUI();
            window.closeCheckout();
            
            // Bunyikan Notifikasi Kasir (Jika diizinkan browser)
            try {
                const audio = new Audio(window.AppState.storeSettings?.audioMasuk || 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
                audio.play();
            } catch(e) {}
            
        }).catch(err => {
            alert("Terjadi kesalahan jaringan saat checkout: " + err.message);
        });
    });
};


// --- FUNGSI PANEL OWNER (8 PANEL) ---
window.openPanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if(panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
    }
};

window.closePanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if(panel) {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
    }
};


// --- FUNGSI KAMERA ABSENSI HRD ---
window.openAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const video = document.getElementById('attendance-video');
        const loading = document.getElementById('camera-loading');
        
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                if(video) {
                    video.srcObject = stream;
                    video.classList.remove('hidden');
                }
                if(loading) loading.classList.add('hidden');
            }).catch(err => {
                alert("Gagal mengakses kamera. Pastikan browser memberikan izin.");
                if(loading) loading.classList.add('hidden');
            });
        } else {
            alert("Fitur kamera tidak didukung di browser ini.");
        }
    }
};

window.closeAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        const video = document.getElementById('attendance-video');
        if(video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.classList.add('hidden');
        }
    }
};


// --- FUNGSI PUSH KE GOOGLE SHEETS (BACKGROUND SPREADSHEET) ---
window.pushDataToGoogleSheets = function(tipeData, payloadData) {
    // URL Web App dari Google Apps Script Anda (Sesuai Blueprint)
    const gasUrl = "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec";
    
    // Kirim data secara diam-diam (no-cors) di latar belakang
    fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tipe: tipeData,
            payload: payloadData
        })
    }).then(() => {
        console.log("Data berhasil di-push ke Google Sheets.");
    }).catch(err => {
        console.log("Gagal push ke Google Sheets (Mode Offline)", err);
    });
};


/* ==========================================================================
   INISIALISASI SISTEM UTAMA (NYALAKAN MESIN!)
   ========================================================================== */
// Jalankan fungsi pengambil data dari Firebase saat file ini selesai dimuat
initFirebase();

// Log sukses di console (Bisa dicek via Inspect Element)
console.log("🚀 MAINSTAY DRINK POS - SYSTEM FULLY LOADED & RUNNING!");
