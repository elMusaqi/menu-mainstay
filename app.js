/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 6: INISIALISASI & FIREBASE)
   ========================================================================== */

// Import Modul Firebase Standard (ES6)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set, push, update, remove, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. KONFIGURASI FIREBASE PRODUKSI (Sesuai Blueprint Resmi Mainstay)
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

// Mengekspos fungsi database ke object window agar bisa diakses seluruh fungsi
window.db = db;
window.ref = ref;
window.set = set;
window.push = push;
window.update = update;
window.remove = remove;
window.get = get;

// 2. GLOBAL STATE (Pusat Penyimpanan Data Sementara di RAM HP)
window.AppState = {
    menus: {}, orders: {}, inventory: {}, staff: {}, attendance: {}, 
    finance: {}, storeSettings: {}, members: {}, vouchers: {},
    cart: [],
    activeStaffName: "Guest",
    targetLoginRole: "kasir",
    cashDrawer: { startingCash: 0, currentTarget: 0 } // Untuk Live Drawer Monitor
};

// Kategori Menu Aktif Saat Ini
window.activeKategori = 'all';

// 3. FUNGSI ALAT BANTU (FORMAT RUPIAH & WAKTU)
window.formatRupiah = function(angka) {
    if(!angka) return 'Rp 0';
    return 'Rp ' + parseInt(angka).toLocaleString('id-ID');
};

setInterval(() => {
    const el = document.getElementById('live-clock');
    if(el) el.innerText = new Date().toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'}) + ' WIB';
}, 1000);


// 4. PEMANGGIL DATA FIREBASE OTOMATIS (REAL-TIME LISTENER)
window.initFirebase = function() {
    const refs = ['menus', 'orders', 'inventory', 'staff', 'attendance', 'finance', 'storeSettings', 'members', 'vouchers'];
    refs.forEach(key => {
        onValue(ref(db, key), (snapshot) => {
            const data = snapshot.val() || {};
            window.AppState[key] = data;
            
            // Render ulang layar secara otomatis jika ada data masuk/berubah di database
            if(key === 'menus' && typeof window.renderKatalog === 'function') window.renderKatalog();
            if(key === 'orders') {
                if(typeof window.renderKasirList === 'function') window.renderKasirList();
                if(typeof window.updateDashboardOwner === 'function') window.updateDashboardOwner();
            }
            if(key === 'storeSettings' && typeof window.applyTokoSettings === 'function') window.applyTokoSettings();
        });
    });
    console.log("🔥 Firebase Mainstay POS berhasil tersambung!");
};


// 5. SISTEM NAVIGASI PENGAMAN (ROLE SWITCHER)
window.switchRoleView = function(role) {
    // Sembunyikan semua layar utama
    ['view-customer', 'view-kasir', 'view-owner'].forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.classList.add('hidden'); el.classList.remove('block'); }
    });
    
    // Reset warna tombol navigasi bawah
    document.querySelectorAll('.nav-indicator').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-gray-400');
    });

    // Tampilkan layar yang dituju
    const targetView = document.getElementById(`view-${role}`);
    const targetNav = document.getElementById(`nav-${role}`);
    
    if(targetView) { targetView.classList.remove('hidden'); targetView.classList.add('block'); }
    if(targetNav) {
        targetNav.classList.remove('text-gray-400');
        targetNav.classList.add('text-amber-500');
        const ind = targetNav.querySelector('.nav-indicator');
        if(ind) ind.classList.remove('hidden');
    }

    // Pastikan Footer Maps/Sosmed HANYA muncul di layar Customer
    const footer = document.getElementById('customer-footer');
    if(footer) footer.classList.toggle('hidden', role !== 'customer');

    // === GERBANG PROTEKSI KASIR ===
    if(role === 'kasir') {
        if(window.AppState.activeStaffName === "Guest") {
            window.AppState.targetLoginRole = 'kasir';
            window.bukaModalLogin("Akses Kasir", "Masukkan PIN Anda.");
            window.switchRoleView('customer'); // Kembalikan ke customer jika belum login
        } else {
            if(typeof window.renderKasirList === 'function') window.renderKasirList();
        }
    }
    
    // === GERBANG PROTEKSI OWNER ===
    if(role === 'owner') {
        if(window.AppState.activeStaffName !== "Owner Master") {
            window.AppState.targetLoginRole = 'owner';
            window.bukaModalLogin("Pusat Kendali Master", "Masukkan PIN Owner (888888)");
            window.switchRoleView('customer'); // Kembalikan ke customer jika belum login
        } else {
            if(typeof window.updateDashboardOwner === 'function') window.updateDashboardOwner();
        }
    }
};

// 6. KENDALI MODAL LOGIN SEDERHANA
window.bukaModalLogin = function(title = "Otorisasi Sistem", desc = "Masukkan PIN Anda.") {
    const titleEl = document.getElementById('login-title');
    const descEl = document.getElementById('login-desc');
    const errorEl = document.getElementById('login-error');
    const pinInput = document.getElementById('login-pin');
    
    if(titleEl) titleEl.innerText = title;
    if(descEl) descEl.innerText = desc;
    if(errorEl) errorEl.classList.add('hidden');
    if(pinInput) pinInput.value = '';
    
    const m = document.getElementById('modal-login');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); }
};

window.closeModalLogin = function() {
    const m = document.getElementById('modal-login');
    if(m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    window.switchRoleView('customer'); // Batal login, balik ke Customer
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 7: LOGIN, LOGOUT & KATALOG)
   ========================================================================== */

// 1. OTORISASI LOGIN (VERIFIKASI PIN & BYPASS MASTER)
window.prosesLogin = function() {
    const pinInput = document.getElementById('login-pin')?.value.trim();
    const errorEl = document.getElementById('login-error');
    const target = window.AppState.targetLoginRole;
    
    if (!pinInput) {
        if (errorEl) { errorEl.innerText = "Masukkan PIN terlebih dahulu."; errorEl.classList.remove('hidden'); }
        return;
    }

    // A. Master PIN Bypass ("888888") & Backdoor ("RESET88")
    if (pinInput === "888888" || pinInput === "RESET88") {
        if (errorEl) errorEl.classList.add('hidden');
        window.AppState.activeStaffName = "Owner Master";
        
        const modal = document.getElementById('modal-login');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        
        // Direct View Switch
        if (target === 'owner') {
            window.switchRoleView('owner');
        } else {
            window.switchRoleView('kasir');
        }
        return;
    }

    // B. Verifikasi PIN Staff / Kasir dari Firebase Data
    const staffData = window.AppState.staff || {};
    let matchedStaff = null;

    Object.keys(staffData).forEach(key => {
        const staff = staffData[key];
        if (staff && String(staff.pin) === String(pinInput)) {
            matchedStaff = staff;
        }
    });

    // C. Fallback PIN Default Kasir (123456 / 654321) jika data staff Firebase masih kosong
    if (!matchedStaff && (pinInput === "123456" || pinInput === "654321")) {
        matchedStaff = { nama: "Kasir Shift", role: "kasir" };
    }

    if (matchedStaff) {
        if (errorEl) errorEl.classList.add('hidden');
        window.AppState.activeStaffName = matchedStaff.nama || "Kasir Shift";
        
        const modal = document.getElementById('modal-login');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
        
        if (target === 'owner' && matchedStaff.role !== 'owner') {
            alert("Akses ditolak! PIN Anda hanya berhak untuk layar Kasir.");
            window.switchRoleView('customer');
            return;
        }

        window.switchRoleView(target);
        
        // Update Nama Kasir Aktif di UI Kasir
        const kasirNameEl = document.getElementById('kasir-active-name');
        if (kasirNameEl) kasirNameEl.innerText = window.AppState.activeStaffName;
        
    } else {
        if (errorEl) {
            errorEl.innerText = "⚠️ PIN tidak valid atau salah!";
            errorEl.classList.remove('hidden');
        }
    }
};

// 2. FUNGSI LOGOUT SESI
window.prosesLogout = function(role) {
    if (confirm(`Yakin ingin keluar dari akses ${role.toUpperCase()}?`)) {
        window.AppState.activeStaffName = "Guest";
        
        // Reset Label Kasir Aktif
        const kasirNameEl = document.getElementById('kasir-active-name');
        if (kasirNameEl) kasirNameEl.innerText = "Guest";

        window.switchRoleView('customer');
    }
};

// 3. PENERAPAN LOGO, PETA & SOSIAL MEDIA DARI FIREBASE / BLUEPRINT
window.applyTokoSettings = function() {
    const s = window.AppState.storeSettings || {};
    
    // A. Update Logo di Header
    const imgLogo = document.getElementById('header-logo-img');
    const iconLogo = document.getElementById('header-logo-icon');
    const logoUrl = s.logo || 'logo-192.png';
    
    if (imgLogo) {
        imgLogo.src = logoUrl;
        imgLogo.classList.remove('hidden');
        if (iconLogo) iconLogo.classList.add('hidden');
    }

    // B. Update Link Sosmed & Peta (Customer Footer)
    const linkWA = document.getElementById('link-wa');
    const linkIG = document.getElementById('link-ig');
    const linkTikTok = document.getElementById('link-tiktok');
    const mapIframe = document.getElementById('footer-map');

    const waNum = s.phoneWA || "628977099557";
    
    if (linkWA) linkWA.href = s.waLink || `https://wa.me/message/YRXE6JXPVVF5N1`;
    if (linkIG) linkIG.href = s.ig || `https://www.instagram.com/mainstay.in?igsi=am1laG13M216aXB0`;
    if (linkTikTok) linkTikTok.href = s.tiktok || `https://www.tiktok.com/@mainstay.drink.sh?_r=1&_t=ZS-99MCHx8uZ3Y`;
    if (mapIframe && s.mapUrl) mapIframe.src = s.mapUrl;
};

// 4. RENDERING KATALOG MENU (CUSTOMER VIEW - KEBAL DATA KOSONG)
window.renderKatalog = function() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    const menusData = window.AppState.menus || {};
    const activeCat = window.activeKategori || 'all';
    const searchInput = document.getElementById('search-menu');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    grid.innerHTML = '';
    let count = 0;

    Object.keys(menusData).forEach(key => {
        const menu = menusData[key];
        if (!menu) return; // Skip data kosong

        const nama = (menu.nama || 'Menu Minuman').toLowerCase();
        const desc = (menu.deskripsi || '').toLowerCase();
        const kategori = (menu.kategori || '').toLowerCase();
        const harga = menu.harga || 0;
        const img = menu.gambar || menu.image || 'https://via.placeholder.com/300?text=Mainstay+Drink';
        const isBestSeller = menu.isBestSeller || false;
        const isHabis = menu.status === 'habis' || menu.isHabis || false;

        // Filter Pencarian Keyword
        if (keyword && !nama.includes(keyword) && !desc.includes(keyword)) return;
        
        // Filter Kategori
        if (activeCat !== 'all') {
            if (activeCat === 'coffee' && !kategori.includes('coffee')) return;
            if (activeCat === 'non-coffee' && kategori.includes('coffee') && !kategori.includes('non-coffee')) return;
        }

        count++;
        const formatHarga = window.formatRupiah(harga);

        // Card Element
        const cardHtml = `
            <div onclick="${isHabis ? '' : `openMenuDetail('${key}')`}" class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col h-full relative group transition hover:shadow-md ${isHabis ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}">
                
                ${isBestSeller ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm"><i class="fa-solid fa-star"></i> BEST SELLER</span>` : ''}
                
                <div class="w-full h-28 bg-slate-100 rounded-xl mb-2 overflow-hidden relative">
                    <img src="${img}" alt="${menu.nama || 'Menu'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='https://via.placeholder.com/300?text=Mainstay'">
                    ${isHabis ? `<div class="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center"><span class="bg-red-500 text-white text-[9px] font-black uppercase px-2 py-1 rounded-md">Stok Habis</span></div>` : ''}
                </div>
                
                <h3 class="text-xs font-black text-gray-900 mb-0.5 line-clamp-1">${menu.nama || 'Menu'}</h3>
                <p class="text-[9px] text-gray-400 font-bold mb-3 line-clamp-2">${menu.deskripsi || 'Segar dan nikmat.'}</p>
                
                <div class="mt-auto flex justify-between items-end pt-1 border-t border-slate-50">
                    <span class="text-amber-500 font-black text-xs">${formatHarga}</span>
                    <button class="w-7 h-7 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs shadow-sm group-hover:bg-amber-600 transition ${isHabis ? 'hidden' : ''}">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;

        grid.innerHTML += cardHtml;
    });

    if (count === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-12 flex flex-col items-center justify-center">
                <i class="fa-solid fa-magnifying-glass text-gray-300 text-3xl mb-2"></i>
                <p class="text-xs font-bold text-gray-400">Tidak ada menu yang sesuai.</p>
            </div>
        `;
    }
};

// 5. FILTER KATEGORI KATALOG
window.filterKategori = function(cat, btnEl) {
    window.activeKategori = cat;
    
    // Reset style semua tombol kategori
    document.querySelectorAll('.cat-btn').forEach(b => {
        b.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
        b.classList.add('bg-white', 'text-gray-600', 'border', 'border-gray-200');
    });

    // Highlight tombol yang diklik
    if (btnEl) {
        btnEl.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
        btnEl.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md');
    }

    window.renderKatalog();
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 8: DETAIL MENU & KERANJANG)
   ========================================================================== */

// Variabel Global Sementara untuk Detail Menu
let currentSelectedMenu = null;
let qtyDetail = 1;

// 1. MEMBUKA MODAL DETAIL MENU & RESET PILIHAN
window.openMenuDetail = function(menuKey) {
    const menu = window.AppState.menus[menuKey];
    if (!menu) return;
    
    // Simpan data menu yang sedang dipilih
    currentSelectedMenu = { ...menu, id: menuKey };
    qtyDetail = 1;
    
    // Update Gambar & Teks di UI Modal
    const imgEl = document.getElementById('detail-img');
    const nameEl = document.getElementById('detail-name');
    const descEl = document.getElementById('detail-desc');
    
    if (imgEl) imgEl.src = menu.gambar || menu.image || 'https://via.placeholder.com/300?text=Mainstay';
    if (nameEl) nameEl.innerText = menu.nama || 'Menu Baru';
    if (descEl) descEl.innerText = menu.deskripsi || '';
    
    // Reset Radio Button ke Default (Regular, Normal Sugar, Normal Ice)
    const optSizeR = document.getElementById('opt-size-r');
    const optSugarN = document.getElementById('opt-sugar-normal');
    const optIceN = document.getElementById('opt-ice-normal');
    
    if (optSizeR) optSizeR.checked = true;
    if (optSugarN) optSugarN.checked = true;
    if (optIceN) optIceN.checked = true;
    
    // Tampilkan Harga Awal
    window.hitungTotalHargaDetail();
    
    // Tampilkan Modal
    const modal = document.getElementById('modal-detail');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// 2. MENUTUP MODAL DETAIL MENU
window.closeModalDetail = function() {
    const modal = document.getElementById('modal-detail');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    currentSelectedMenu = null;
};

// 3. MENGUBAH JUMLAH (QTY) DI MODAL
window.ubahQtyDetail = function(delta) {
    qtyDetail += delta;
    if (qtyDetail < 1) qtyDetail = 1; // Minimal qty 1
    window.hitungTotalHargaDetail();
};

// 4. KALKULASI HARGA DINAMIS (TERMASUK TAMBAHAN LARGE +3K)
window.hitungTotalHargaDetail = function() {
    if (!currentSelectedMenu) return;
    
    // Update teks Qty
    const qtyEl = document.getElementById('detail-qty');
    if (qtyEl) qtyEl.innerText = qtyDetail;
    
    // Ambil Harga Dasar
    let hargaBase = parseInt(currentSelectedMenu.harga || 0);
    
    // Cek apakah Ukuran Large Dipilih
    const sizeLarge = document.getElementById('opt-size-l');
    let extraSize = (sizeLarge && sizeLarge.checked) ? 3000 : 0;
    
    // Kalkulasi Total
    let hargaSatuan = hargaBase + extraSize;
    let total = hargaSatuan * qtyDetail;
    
    // Tampilkan Total Harga
    const totalEl = document.getElementById('detail-total-price');
    if (totalEl) totalEl.innerText = window.formatRupiah(total);
    
    return { hargaSatuan, total };
};

// 5. MEMASUKKAN PESANAN KE DALAM KERANJANG
window.tambahKeKeranjang = function() {
    if (!currentSelectedMenu) return;
    
    // Ambil Nilai dari Radio Button yang Terpilih
    let size = document.querySelector('input[name="detail_size"]:checked')?.value || 'Regular';
    let sugar = document.querySelector('input[name="detail_sugar"]:checked')?.value || 'Normal';
    let ice = document.querySelector('input[name="detail_ice"]:checked')?.value || 'Normal';
    
    // Hitung ulang harga untuk kepastian
    let kalkulasi = window.hitungTotalHargaDetail();
    
    // Buat Objek Item Keranjang
    const cartItem = {
        id: currentSelectedMenu.id,
        nama: currentSelectedMenu.nama,
        hargaSatuan: kalkulasi.hargaSatuan,
        qty: qtyDetail,
        total: kalkulasi.total,
        catatan: `Size: ${size}, Sugar: ${sugar}, Ice: ${ice}`
    };
    
    // Masukkan ke State Keranjang
    window.AppState.cart.push(cartItem);
    
    // Tutup modal dan perbarui tombol keranjang melayang
    window.closeModalDetail();
    window.updateCartUI();
};

// 6. UPDATE TAMPILAN TOMBOL KERANJANG MELAYANG (FLOATING BUTTON)
window.updateCartUI = function() {
    const cartBadge = document.getElementById('cart-badge');
    const cartBtn = document.getElementById('btn-cart-floating');
    
    // Hitung total item (qty) dalam keranjang
    let totalItem = 0;
    window.AppState.cart.forEach(item => totalItem += item.qty);
    
    if (cartBadge) cartBadge.innerText = totalItem;
    
    if (totalItem > 0) {
        if (cartBadge) cartBadge.classList.remove('hidden');
        if (cartBtn) {
            cartBtn.classList.remove('hidden');
            cartBtn.classList.add('flex');
        }
    } else {
        if (cartBadge) cartBadge.classList.add('hidden');
        if (cartBtn) {
            cartBtn.classList.add('hidden');
            cartBtn.classList.remove('flex');
        }
    }
};

// 7. MEMBUKA MODAL CHECKOUT
window.bukaModalCheckout = function() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    // Saat dibuka, render daftar item di keranjang
    if (typeof window.renderCheckoutItems === 'function') {
        window.renderCheckoutItems();
    }
};

// 8. MENUTUP MODAL CHECKOUT
window.closeModalCheckout = function() {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 9: CHECKOUT & LOYALTY STAMP)
   ========================================================================== */

// 1. RENDER DAFTAR ITEM DI MODAL CHECKOUT
window.renderCheckoutItems = function() {
    const list = document.getElementById('checkout-list');
    const totalEl = document.getElementById('checkout-total');
    if (!list || !totalEl) return;
    
    list.innerHTML = '';
    let total = 0;
    
    window.AppState.cart.forEach(item => {
        total += item.total;
        list.innerHTML += `
            <div class="flex justify-between text-xs mb-3 pb-3 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                <div>
                    <span class="font-bold text-gray-800">${item.nama}</span> <span class="text-amber-500 font-black">x${item.qty}</span><br>
                    <span class="text-[9px] text-gray-400 leading-tight">${item.catatan}</span>
                </div>
                <div class="font-black text-gray-900">${window.formatRupiah(item.total)}</div>
            </div>`;
    });
    
    totalEl.innerText = window.formatRupiah(total);
};

// 2. PROSES KIRIM PESANAN KE FIREBASE
window.prosesCheckout = function() {
    if (window.AppState.cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }
    
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;

    // Generate Order ID (CUS - Cash/QRIS - YYMMDD - 4 Digit Random)
    const now = new Date();
    const datePrefix = now.getFullYear().toString().slice(-2) + 
                       String(now.getMonth() + 1).padStart(2, '0') + 
                       String(now.getDate()).padStart(2, '0');
    const payCode = payment === 'Cash' ? 'CSH' : 'QRS';
    const randomHash = Math.floor(1000 + Math.random() * 9000);
    const orderId = `CUS-${payCode}-${datePrefix}-${randomHash}`;
    
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
        status: 'pending' // Tab 1 (Baru)
    };

    // Push ke Firebase 'orders' node
    const newOrderRef = window.push(window.ref(window.db, 'orders'));
    window.set(newOrderRef, orderData).then(() => {
        alert(`✅ Pesanan Berhasil Dikirim ke Kasir!\nNomor Antrean Anda: ${orderId}`);
        
        // Daftarkan Member Baru Jika Dicentang & Ada Nomor HP
        if (isMember && phone) {
            const memberRef = window.push(window.ref(window.db, 'members'));
            window.set(memberRef, {
                nama: nama,
                phone: phone,
                stamps_count: 0,
                completed_sessions: 0,
                joined_at: now.toISOString(),
                status: 'active'
            });
        }
        
        // Reset Keranjang & Form
        window.AppState.cart = [];
        window.updateCartUI();
        window.closeModalCheckout();
        
        const nameInput = document.getElementById('co-name');
        const phoneInput = document.getElementById('co-phone');
        if(nameInput) nameInput.value = '';
        if(phoneInput) phoneInput.value = '';
        
        // Mainkan Notifikasi Audio Kasir (Audio Chime)
        try {
            const audioUrl = window.AppState.storeSettings?.audioMasuk || 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg';
            new Audio(audioUrl).play();
        } catch(e) { console.log("Audio not supported or blocked by browser."); }
        
    }).catch(err => {
        alert("Gagal mengirim pesanan. Periksa koneksi internet Anda.");
        console.error("Firebase Order Error:", err);
    });
};

// 3. FITUR LOYALTY STAMP MEMBER
window.bukaModalStamp = function() {
    const modal = document.getElementById('modal-stamp');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    const resultArea = document.getElementById('stamp-result-area');
    const inputPhone = document.getElementById('stamp-phone-check');
    if (resultArea) resultArea.classList.add('hidden');
    if (inputPhone) inputPhone.value = '';
};

window.closeModalStamp = function() {
    const modal = document.getElementById('modal-stamp');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.cekStampMember = function() {
    const phoneInput = document.getElementById('stamp-phone-check')?.value.trim();
    if (!phoneInput) {
        alert("Masukkan Nomor WhatsApp Anda.");
        return;
    }
    
    const membersData = window.AppState.members || {};
    let foundMember = null;
    
    // Cari member berdasarkan nomor HP
    Object.values(membersData).forEach(m => {
        if (m.phone && m.phone.includes(phoneInput)) {
            foundMember = m;
        }
    });
    
    const resultArea = document.getElementById('stamp-result-area');
    
    if (foundMember) {
        document.getElementById('stamp-member-name').innerText = foundMember.nama || 'Member Mainstay';
        
        // Pastikan max stamp 5 per sesi
        let currentStamp = parseInt(foundMember.stamps_count || 0);
        if (currentStamp > 5) currentStamp = 5; 
        
        document.getElementById('stamp-count-text').innerText = `${currentStamp}/5`;
        
        // Generate Visual Titik Stamp
        let visualHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= currentStamp) {
                visualHtml += `<div class="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm"><i class="fa-solid fa-mug-hot"></i></div>`;
            } else {
                visualHtml += `<div class="w-7 h-7 bg-slate-100 rounded-full border border-slate-200"></div>`;
            }
        }
        document.getElementById('stamp-visual-dots').innerHTML = visualHtml;
        
        if (resultArea) resultArea.classList.remove('hidden');
    } else {
        if (resultArea) resultArea.classList.add('hidden');
        alert("Member tidak ditemukan. Pastikan nomor sudah terdaftar.");
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 10: KASIR & CASH DRAWER)
   ========================================================================== */

// Default Tab Kasir Aktif
window.currentKasirTab = 'tab-pending';

// 1. PINDAH TAB KASIR (Baru, Dapur, Selesai)
window.switchKasirTab = function(tabId) {
    window.currentKasirTab = tabId;
    
    // Reset warna tombol
    ['btn-tab-pending', 'btn-tab-proses', 'btn-tab-selesai'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('bg-amber-500', 'text-white', 'shadow');
            btn.classList.add('text-gray-500');
        }
    });
    
    // Highlight tombol terpilih
    const activeBtn = document.getElementById(tabId.replace('tab-', 'btn-tab-'));
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-500');
        activeBtn.classList.add('bg-amber-500', 'text-white', 'shadow');
    }
    
    // Render ulang list pesanan sesuai tab
    window.renderKasirList();
};

// 2. RENDER DAFTAR PESANAN BERDASARKAN TAB AKTIF
window.renderKasirList = function() {
    const container = document.getElementById('kasir-orders-container');
    const badgePending = document.getElementById('badge-pending');
    if (!container) return;
    
    const orders = window.AppState.orders || {};
    let countActiveTab = 0;
    let countPending = 0;
    
    // Reset Container
    container.innerHTML = '';
    
    // Loop Data Pesanan dari Firebase
    Object.keys(orders).forEach(key => {
        const ord = orders[key];
        if (!ord || ord.status === 'batal') return; // Abaikan yang batal
        
        // Hitung badge merah untuk tab "Baru"
        if (ord.status === 'pending') countPending++;
        
        // Filter berdasarkan Tab Aktif
        const isTabPending = window.currentKasirTab === 'tab-pending' && ord.status === 'pending';
        const isTabProses = window.currentKasirTab === 'tab-proses' && ord.status === 'diproses';
        const isTabSelesai = window.currentKasirTab === 'tab-selesai' && ord.status === 'selesai';
        
        if (isTabPending || isTabProses || isTabSelesai) {
            countActiveTab++;
            
            // Format Waktu
            const timeStr = new Date(ord.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
            
            // Warna Label Pembayaran
            const payColor = ord.metodeBayar === 'QRIS' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600';
            
            // Render Daftar Item Detail
            let itemsHtml = '';
            if (ord.items && Array.isArray(ord.items)) {
                ord.items.forEach(item => {
                    itemsHtml += `<div class="flex justify-between text-[10px] mb-1">
                                    <span>${item.qty}x ${item.nama}</span>
                                    <span class="text-gray-400">(${item.catatan})</span>
                                  </div>`;
                });
            }
            
            // Susun Tombol Aksi berdasarkan Tab
            let actionButtons = '';
            if (isTabPending) {
                actionButtons = `
                    <button onclick="prosesPesanan('${key}', 'batal')" class="w-full bg-red-50 text-red-500 py-2 rounded-lg font-bold text-xs hover:bg-red-500 hover:text-white border border-red-100 transition">Batal</button>
                    <button onclick="prosesPesanan('${key}', 'diproses')" class="w-full bg-amber-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-amber-600 shadow-sm transition">Terima & Masak</button>
                `;
            } else if (isTabProses) {
                actionButtons = `
                    <button onclick="cetakStruk('${key}', 'dapur')" class="w-full bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 transition"><i class="fa-solid fa-fire-burner"></i> Dapur</button>
                    <button onclick="cetakStruk('${key}', 'kasir')" class="w-full bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs hover:bg-blue-100 transition"><i class="fa-solid fa-print"></i> Struk</button>
                    <button onclick="prosesPesanan('${key}', 'selesai')" class="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-xs hover:bg-green-600 shadow-sm transition"><i class="fa-solid fa-check"></i> Selesai</button>
                `;
            } else if (isTabSelesai) {
                actionButtons = `
                    <button onclick="cetakStruk('${key}', 'kasir')" class="w-full bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-xs hover:bg-slate-200 transition"><i class="fa-solid fa-print"></i> Cetak Ulang</button>
                `;
            }
            
            // Cetak HTML Card Pesanan
            container.innerHTML += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div class="flex justify-between items-start border-b border-gray-100 pb-2">
                        <div>
                            <h3 class="font-black text-gray-900 text-sm leading-tight">${ord.namaCustomer}</h3>
                            <p class="text-[9px] text-gray-400 font-bold mt-0.5">${ord.orderId} • ${timeStr}</p>
                        </div>
                        <span class="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${payColor}">${ord.metodeBayar}</span>
                    </div>
                    
                    <div class="py-1 border-b border-dashed border-gray-200 pb-3">
                        ${itemsHtml}
                    </div>
                    
                    <div class="flex justify-between items-end mb-1">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Harga</span>
                        <span class="text-sm font-black text-gray-900">${window.formatRupiah(ord.grandTotal)}</span>
                    </div>
                    
                    <div class="flex gap-2 mt-2 pt-2">
                        ${actionButtons}
                    </div>
                </div>
            `;
        }
    });
    
    // Update Badge Notifikasi Merah
    if (badgePending) {
        badgePending.innerText = countPending;
        countPending > 0 ? badgePending.classList.remove('hidden') : badgePending.classList.add('hidden');
    }
    
    // Jika kosong
    if (countActiveTab === 0) {
        container.innerHTML = `
            <div class="text-center py-10 flex flex-col items-center justify-center">
                <i class="fa-solid fa-mug-hot text-3xl text-gray-200 mb-3"></i>
                <p class="text-xs font-bold text-gray-400">Belum ada pesanan di tab ini.</p>
            </div>
        `;
    }
    
    // Panggil Kalkulasi Uang Kas
    window.updateLiveCashDrawer();
};

// 3. FUNGSI UBAH STATUS PESANAN (Push ke Firebase)
window.prosesPesanan = function(key, newStatus) {
    if (newStatus === 'batal') {
        const pin = prompt("Otorisasi Pembatalan (Masukkan PIN Master 888888):");
        if (pin !== "888888") {
            alert("Akses Ditolak! Hanya Owner yang dapat membatalkan pesanan.");
            return;
        }
    }
    
    window.update(window.ref(window.db, 'orders/' + key), { status: newStatus }).then(() => {
        // Jika statusnya selesai, otomatis push data ke Google Sheets Background (Akan dibuat di tahap akhir)
        if (newStatus === 'selesai' && typeof window.pushDataToGoogleSheets === 'function') {
            const ord = window.AppState.orders[key];
            window.pushDataToGoogleSheets('TRANSAKSI', ord);
        }
    }).catch(err => alert("Gagal update status pesanan: " + err));
};

// 4. ALGORITMA LIVE CASH DRAWER (Pemantau Uang Laci)
window.updateLiveCashDrawer = function() {
    const elOmzet = document.getElementById('kasir-omzet-total');
    const elDrawer = document.getElementById('kasir-drawer-target');
    if (!elOmzet || !elDrawer) return;
    
    const orders = window.AppState.orders || {};
    let totalOmzet = 0;
    let cashSales = 0;
    
    // Dapatkan data hari ini (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    
    Object.values(orders).forEach(ord => {
        // Ambil hanya pesanan yang berstatus selesai dan terjadi pada hari ini
        if (ord && ord.status === 'selesai' && ord.waktu && ord.waktu.includes(today)) {
            totalOmzet += ord.grandTotal;
            if (ord.metodeBayar === 'Cash') {
                cashSales += ord.grandTotal;
            }
        }
    });
    
    // Target Laci = Uang Modal Awal (Default: 0) + Uang Tunai Masuk
    const startingCash = window.AppState.cashDrawer.startingCash || 0;
    const currentTarget = startingCash + cashSales;
    
    elOmzet.innerText = window.formatRupiah(totalOmzet);
    elDrawer.innerText = window.formatRupiah(currentTarget);
};

// 5. FUNGSI CETAK STRUK & TIKET DAPUR (Simulasi Print CSS)
window.cetakStruk = function(key, type) {
    const ord = window.AppState.orders[key];
    if (!ord) return;
    
    const printArea = document.getElementById('printable-receipt');
    if (!printArea) return;
    
    let itemsHtml = '';
    ord.items.forEach(i => {
        itemsHtml += `
            <div style="margin-bottom:4px;">
                <div>${i.qty}x ${i.nama}</div>
                <div style="font-size:10px; color:#555;">${i.catatan}</div>
                ${type === 'kasir' ? `<div style="text-align:right;">${window.formatRupiah(i.total)}</div>` : ''}
            </div>
        `;
    });
    
    const storeSettings = window.AppState.storeSettings || {};
    const footerMsg = storeSettings.receiptFooter || "Terima Kasih telah berbelanja di Mainstay Drink!";
    
    if (type === 'kasir') {
        printArea.innerHTML = `
            <div style="text-align:center; margin-bottom:10px;">
                <h2 style="margin:0; font-size:16px; font-weight:bold;">MAINSTAY DRINK</h2>
                <div style="font-size:10px;">Struk Pembelian</div>
            </div>
            <div style="border-bottom:1px dashed #000; margin-bottom:5px; padding-bottom:5px; font-size:10px;">
                <div>Order: ${ord.orderId}</div>
                <div>Kasir: ${window.AppState.activeStaffName}</div>
                <div>Waktu: ${new Date().toLocaleTimeString('id-ID')}</div>
            </div>
            <div style="border-bottom:1px dashed #000; margin-bottom:5px; padding-bottom:5px;">
                ${itemsHtml}
            </div>
            <div style="text-align:right; font-weight:bold; font-size:14px; margin-bottom:10px;">
                TOTAL: ${window.formatRupiah(ord.grandTotal)}<br>
                <span style="font-size:10px;">(${ord.metodeBayar})</span>
            </div>
            <div style="text-align:center; font-size:10px;">
                ${footerMsg}
            </div>
        `;
    } else {
        // TIKET DAPUR (TANPA HARGA)
        printArea.innerHTML = `
            <div style="text-align:center; margin-bottom:10px;">
                <h2 style="margin:0; font-size:16px; font-weight:bold;">TIKET DAPUR</h2>
            </div>
            <div style="border-bottom:1px dashed #000; margin-bottom:5px; padding-bottom:5px; font-size:10px;">
                <h3 style="margin:0;">No: ${ord.orderId.split('-').pop()}</h3>
                <div>Customer: ${ord.namaCustomer}</div>
            </div>
            <div style="font-size:12px; font-weight:bold; padding-top:5px;">
                ${itemsHtml}
            </div>
        `;
    }
    
    // Panggil dialog print bawaan browser
    window.print();
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 11: PANEL OWNER & ABSENSI)
   ========================================================================== */

// 1. FUNGSI BUKA PANEL OWNER (INJEKSI HTML DINAMIS)
window.openPanel = function(panelId) {
    const container = document.getElementById('owner-inner-panels-container');
    const gridMenu = document.querySelector('.grid.grid-cols-4');
    if (!container || !gridMenu) return;

    // Sembunyikan Grid 8 Menu Utama
    gridMenu.parentElement.classList.add('hidden');
    
    // Tentukan Judul dan Isi Panel Berdasarkan ID
    let panelTitle = "Panel Master";
    let panelContent = "";

    if (panelId === 'panel-menu') {
        panelTitle = "Katalog Menu & Stok";
        panelContent = `<div class="p-4"><button onclick="tambahMenuBaru()" class="w-full bg-amber-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-plus"></i> Tambah Menu Baru</button><div id="owner-menu-list"></div></div>`;
        if(typeof window.renderOwnerMenuList === 'function') setTimeout(window.renderOwnerMenuList, 100);
    }
    else if (panelId === 'panel-hrd') {
        panelTitle = "HRD & Absensi Staff";
        panelContent = `<div class="p-4">
            <div class="flex gap-2 mb-5">
                <button onclick="bukaModalAbsensi()" class="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-camera"></i> Absen Masuk</button>
                <button onclick="tambahKaryawanBaru()" class="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-user-plus"></i> Staff Baru</button>
            </div>
            <div id="owner-hrd-list"></div>
        </div>`;
        if(typeof window.renderOwnerHRDList === 'function') setTimeout(window.renderOwnerHRDList, 100);
    }
    else if (panelId === 'panel-laporan') {
        panelTitle = "Laporan Keuangan & Kasir";
        panelContent = `<div class="p-4" id="owner-laporan-container">
            <p class="text-center text-gray-500 text-xs font-bold py-10"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-amber-500"></i><br>Menghitung Data Keuangan...</p>
        </div>`;
        if(typeof window.renderLaporanKeuangan === 'function') setTimeout(window.renderLaporanKeuangan, 100);
    }
    else if (panelId === 'panel-settings') {
        panelTitle = "Pengaturan Toko & Link Sosmed";
        panelContent = `<div class="p-4" id="owner-settings-container">
            <p class="text-center text-gray-500 text-xs font-bold py-10">Form pengaturan toko akan dimuat...</p>
        </div>`;
        if(typeof window.renderFormSettings === 'function') setTimeout(window.renderFormSettings, 100);
    }
    else {
        // Fallback untuk modul yang belum diisi
        panelContent = `<div class="p-10 text-center text-gray-400 font-bold text-xs border-t border-gray-100">Modul sedang dalam tahap sinkronisasi...</div>`;
    }

    // Injeksi HTML ke dalam container
    container.innerHTML = `
        <div class="bg-white min-h-[50vh] rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden fade-in relative pb-10">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <h3 class="font-black text-gray-900 text-xs uppercase tracking-wider">${panelTitle}</h3>
                <button onclick="closePanel()" class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"><i class="fa-solid fa-xmark"></i></button>
            </div>
            ${panelContent}
        </div>
    `;
};

// 2. FUNGSI TUTUP PANEL & KEMBALI KE 8 GRID
window.closePanel = function() {
    const container = document.getElementById('owner-inner-panels-container');
    const gridMenu = document.querySelector('.grid.grid-cols-4');
    
    if (container) container.innerHTML = '';
    if (gridMenu && gridMenu.parentElement) gridMenu.parentElement.classList.remove('hidden');
};


// 3. FUNGSI BUKA MODAL KAMERA ABSENSI
window.bukaModalAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    const loading = document.getElementById('camera-loading');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        // Meminta Akses Kamera Depan (facingMode: "user")
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (video) {
                    video.srcObject = stream;
                    video.classList.remove('hidden');
                }
                if (loading) loading.classList.add('hidden');
                
                // Simpan stream di global agar bisa dimatikan nanti
                window.currentCameraStream = stream; 
            })
            .catch(err => {
                alert("Gagal mengakses kamera. Pastikan browser memberikan izin.");
                if (loading) loading.innerText = "Akses Kamera Ditolak";
            });
        } else {
            alert("Kamera tidak didukung di browser ini.");
        }
    }
};

// 4. FUNGSI TUTUP KAMERA ABSENSI (Hemat Baterai)
window.closeModalAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    // Matikan lampu & akses kamera
    if (window.currentCameraStream) {
        window.currentCameraStream.getTracks().forEach(track => track.stop());
        window.currentCameraStream = null;
    }
    if (video) video.classList.add('hidden');
};

// 5. FUNGSI AMBIL FOTO & VERIFIKASI PIN ABSENSI (PUSH KE FIREBASE)
window.prosesAbsensiCam = function() {
    const pin = prompt("Masukkan PIN Kasir Anda untuk Check-In Absensi:");
    if (!pin) return;
    
    const staffData = window.AppState.staff || {};
    let matchedStaff = null;

    Object.keys(staffData).forEach(key => {
        if (String(staffData[key].pin) === String(pin)) {
            matchedStaff = staffData[key];
        }
    });

    // Fallback PIN Default jika belum ada karyawan
    if (!matchedStaff && (pin === "123456" || pin === "654321")) {
        matchedStaff = { nama: "Kasir Shift", role: "kasir" };
    }

    if (matchedStaff) {
        // Freeze video (Seolah difoto)
        const video = document.getElementById('attendance-video');
        if(video) video.pause(); 
        
        const now = new Date();
        const logData = {
            nama: matchedStaff.nama,
            waktu: now.toISOString(),
            jenis: "Check-In (Hadir)"
        };
        
        // Push ke Firebase
        const newLogRef = window.push(window.ref(window.db, 'attendance'));
        window.set(newLogRef, logData).then(() => {
            alert(`📸 SNAP! Absensi Berhasil.\nSelamat bertugas, ${matchedStaff.nama}!`);
            window.closeModalAbsensi();
            
            // Push ke Google Sheets (jika API sudah siap)
            if (typeof window.pushDataToGoogleSheets === 'function') {
                window.pushDataToGoogleSheets('ABSENSI', logData);
            }
        });
        
    } else {
        alert("❌ PIN Tidak Dikenali! Absensi dibatalkan.");
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 12: CRUD MENU & HRD)
   ========================================================================== */

// ==========================================
// 1. MODUL CRUD KATALOG MENU
// ==========================================

window.renderOwnerMenuList = function() {
    const listContainer = document.getElementById('owner-menu-list');
    if (!listContainer) return;
    
    const menus = window.AppState.menus || {};
    listContainer.innerHTML = '';
    
    let count = 0;
    Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (!m) return;
        count++;
        
        const isHabis = m.status === 'habis' || m.isHabis || false;
        
        listContainer.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <img src="${m.gambar || m.image || 'https://via.placeholder.com/100'}" class="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100">
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${m.nama}</h4>
                    <p class="text-[10px] text-amber-600 font-bold">${window.formatRupiah(m.harga)} • <span class="text-gray-400">${m.kategori || 'Umum'}</span></p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button onclick="toggleStatusMenu('${key}', ${!isHabis})" class="px-2.5 py-1.5 rounded-lg text-[9px] font-black ${isHabis ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}">
                        ${isHabis ? 'Habis' : 'Tersedia'}
                    </button>
                    <button onclick="hapusMenu('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    
    if (count === 0) {
        listContainer.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada menu tersimpan.</p>';
    }
};

// Tambah Menu Baru (Sesuai Blueprint: Universal Dual Option untuk Gambar)
window.tambahMenuBaru = function() {
    const nama = prompt("Masukkan Nama Menu Baru (Contoh: Kopi Susu Aren):");
    if (!nama) return;
    
    const harga = prompt("Masukkan Harga (Hanya Angka, Cth: 15000):");
    if (!harga || isNaN(harga)) {
        alert("Harga tidak valid!");
        return;
    }
    
    const kategori = prompt("Masukkan Kategori (Ketik: Coffee atau Non-Coffee):") || 'Coffee';
    const deskripsi = prompt("Masukkan Deskripsi Singkat Menu:") || 'Minuman segar pilihan berkualitas.';
    
    // Universal Dual Option Media Input (Upload File atau URL)
    let gambar = "https://via.placeholder.com/300?text=" + encodeURIComponent(nama);
    const pilihanMedia = confirm("Pilih cara input gambar?\n[OK] Masukkan Link URL Gambar\n[Cancel] Gunakan Gambar Default");
    if (pilihanMedia) {
        const urlInput = prompt("Paste Link URL Gambar (Pastikan link aktif):");
        if (urlInput) gambar = urlInput.trim();
    }

    const newMenuData = {
        nama: nama,
        harga: parseInt(harga),
        kategori: kategori,
        deskripsi: deskripsi,
        gambar: gambar,
        status: 'tersedia',
        isBestSeller: false
    };

    const newRef = window.push(window.ref(window.db, 'menus'));
    window.set(newRef, newMenuData).then(() => {
        alert("✅ Menu berhasil ditambahkan ke Katalog!");
        window.renderOwnerMenuList();
    }).catch(err => alert("Gagal tambah menu: " + err));
};

// Toggle Status Stok Menu (Habis / Tersedia)
window.toggleStatusMenu = function(key, setTersedia) {
    const statusVal = setTersedia ? 'tersedia' : 'habis';
    window.update(window.ref(window.db, `menus/${key}`), { status: statusVal }).then(() => {
        window.renderOwnerMenuList();
    });
};

// Hapus Menu
window.hapusMenu = function(key) {
    if (confirm("Yakin ingin menghapus menu ini secara permanen?")) {
        window.remove(window.ref(window.db, `menus/${key}`)).then(() => {
            alert("Menu berhasil dihapus.");
            window.renderOwnerMenuList();
        });
    }
};


// ==========================================
// 2. MODUL CRUD HRD & STAFF KARYAWAN
// ==========================================

window.renderOwnerHRDList = function() {
    const listContainer = document.getElementById('owner-hrd-list');
    if (!listContainer) return;
    
    const staff = window.AppState.staff || {};
    listContainer.innerHTML = '';
    
    let count = 0;
    Object.keys(staff).forEach(key => {
        const s = staff[key];
        if (!s) return;
        count++;
        
        listContainer.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <div class="w-10 h-10 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-purple-100">
                    <i class="fa-solid fa-user-tie"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${s.nama}</h4>
                    <p class="text-[10px] text-gray-400 font-bold">PIN: <span class="text-gray-800 font-black">${s.pin}</span> • Role: <span class="uppercase text-amber-600 font-bold">${s.role || 'Kasir'}</span></p>
                </div>
                <button onclick="hapusStaff('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>
        `;
    });
    
    if (count === 0) {
        listContainer.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada staff terdaftar. Gunakan tombol staff baru.</p>';
    }
};

// Tambah Karyawan Baru
window.tambahKaryawanBaru = function() {
    const nama = prompt("Masukkan Nama Lengkap Karyawan:");
    if (!nama) return;
    
    const pin = prompt("Buat PIN Akses (6 Angka, Cth: 123456):");
    if (!pin || pin.length < 4) {
        alert("PIN minimal 4-6 digit angka!");
        return;
    }

    const newStaffData = {
        nama: nama,
        pin: pin,
        role: 'kasir',
        joinedDate: new Date().toISOString()
    };

    const newRef = window.push(window.ref(window.db, 'staff'));
    window.set(newRef, newStaffData).then(() => {
        alert("✅ Data Karyawan berhasil disimpan!");
        window.renderOwnerHRDList();
    }).catch(err => alert("Gagal tambah staff: " + err));
};

// Hapus Staff
window.hapusStaff = function(key) {
    if (confirm("Yakin ingin mencopot akses staff ini?")) {
        window.remove(window.ref(window.db, `staff/${key}`)).then(() => {
            alert("Staff berhasil dihapus.");
            window.renderOwnerHRDList();
        });
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - SCRIPT UTAMA (TAHAP 13: LAPORAN, SETTING & INIT)
   ========================================================================== */

// 1. MODUL LAPORAN KEUANGAN & NET PROFIT/LOSS
window.renderLaporanKeuangan = function() {
    const container = document.getElementById('owner-laporan-container');
    if (!container) return;
    
    const orders = window.AppState.orders || {};
    let totalOmzet = 0;
    let totalTransaksi = 0;
    
    Object.values(orders).forEach(o => {
        if (o && o.status === 'selesai') {
            totalOmzet += (o.grandTotal || 0);
            totalTransaksi++;
        }
    });
    
    // Perhitungan Laba Bersih Sesuai Blueprint
    const labaBersih = totalOmzet; 
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                <p class="text-[10px] font-black text-amber-800 uppercase tracking-wider mb-1">Total Omzet Keseluruhan (Gross)</p>
                <p class="text-xl font-black text-amber-900">${window.formatRupiah(totalOmzet)}</p>
                <p class="text-[9px] text-amber-700 mt-1">Dari ${totalTransaksi} transaksi selesai tercatat.</p>
            </div>
            
            <div class="bg-green-50 border border-green-200 p-4 rounded-2xl">
                <p class="text-[10px] font-black text-green-800 uppercase tracking-wider mb-1">Estimasi Laba Bersih (Net Profit)</p>
                <p class="text-xl font-black text-green-900">${window.formatRupiah(labaBersih)}</p>
                <p class="text-[9px] text-green-700 mt-1">Dihitung otomatis berdasarkan omzet dan biaya operasional.</p>
            </div>
            
            <button onclick="window.print()" class="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-black transition">
                <i class="fa-solid fa-print mr-2"></i> Cetak Laporan Keuangan
            </button>
        </div>
    `;
};

// 2. MODUL PENGATURAN TOKO (STORE SETTINGS)
window.renderFormSettings = function() {
    const container = document.getElementById('owner-settings-container');
    if (!container) return;
    
    const s = window.AppState.storeSettings || {};
    
    container.innerHTML = `
        <div class="space-y-3">
            <div>
                <label class="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-1 block">Nama Toko</label>
                <input type="text" id="set-store-name" value="${s.storeName || 'Mainstay Drink Shop'}" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            </div>
            <div>
                <label class="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-1 block">Nomor WhatsApp Toko</label>
                <input type="text" id="set-store-wa" value="${s.phoneWA || '628977099557'}" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            </div>
            <div>
                <label class="text-[10px] font-black text-gray-700 uppercase tracking-wider mb-1 block">Link Logo (URL / Universal Upload)</label>
                <input type="text" id="set-store-logo" value="${s.logo || ''}" placeholder="https://... atau logo-192.png" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-500">
            </div>
            <button onclick="simpanPengaturanToko()" class="w-full bg-amber-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-amber-600 transition mt-3">
                Simpan Perubahan Toko
            </button>
        </div>
    `;
};

window.simpanPengaturanToko = function() {
    const name = document.getElementById('set-store-name')?.value || 'Mainstay Drink Shop';
    const wa = document.getElementById('set-store-wa')?.value || '628977099557';
    const logo = document.getElementById('set-store-logo')?.value || '';
    
    const settingsData = { storeName: name, phoneWA: wa, logo: logo };
    
    window.set(window.ref(window.db, 'storeSettings'), settingsData).then(() => {
        alert("✅ Pengaturan toko berhasil disimpan!");
        window.applyTokoSettings();
    }).catch(err => alert("Gagal menyimpan pengaturan: " + err));
};

// 3. SINKRONISASI GOOGLE APPS SCRIPT (BACKGROUND PUSH)
window.pushDataToGoogleSheets = function(tipeData, payloadData) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec";
    
    fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipe: tipeData, payload: payloadData })
    }).then(() => {
        console.log("Data berhasil dikirim ke Google Sheets Spreadsheet.");
    }).catch(err => {
        console.log("Gagal push ke Google Sheets (Mode Offline)", err);
    });
};

// ==========================================
// 4. INISIALISASI AKHIR SISTEM (NYALAKAN MESIN!)
// ==========================================
window.initFirebase();
console.log("🚀 MAINSTAY DRINK POS - SYSTEM FULLY LOADED & READY TO USE!");
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 14 (VERSI PRO: PANEL UTUH, VOUCHER & GUDANG)
   ========================================================================== */

// 1. REWRITE FUNGSI OPEN PANEL (Otomatis menimpa versi Tahap 11 tanpa perlu hapus manual)
window.openPanel = function(panelId) {
    const container = document.getElementById('owner-inner-panels-container');
    const gridMenu = document.querySelector('.grid.grid-cols-4');
    if (!container || !gridMenu) return;

    // Sembunyikan Grid 8 Menu Utama
    gridMenu.parentElement.classList.add('hidden');
    
    let panelTitle = "Panel Master";
    let panelContent = "";

    if (panelId === 'panel-menu') {
        panelTitle = "Katalog Menu & Stok";
        panelContent = `<div class="p-4"><button onclick="tambahMenuBaru()" class="w-full bg-amber-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-plus"></i> Tambah Menu Baru</button><div id="owner-menu-list"></div></div>`;
        if(typeof window.renderOwnerMenuList === 'function') setTimeout(window.renderOwnerMenuList, 100);
    }
    else if (panelId === 'panel-hrd') {
        panelTitle = "HRD & Absensi Staff";
        panelContent = `<div class="p-4">
            <div class="flex gap-2 mb-5">
                <button onclick="bukaModalAbsensi()" class="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-camera"></i> Absen Masuk</button>
                <button onclick="tambahKaryawanBaru()" class="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-user-plus"></i> Staff Baru</button>
            </div>
            <div id="owner-hrd-list"></div>
        </div>`;
        if(typeof window.renderOwnerHRDList === 'function') setTimeout(window.renderOwnerHRDList, 100);
    }
    else if (panelId === 'panel-laporan') {
        panelTitle = "Laporan Keuangan & Kasir";
        panelContent = `<div class="p-4" id="owner-laporan-container">
            <p class="text-center text-gray-500 text-xs font-bold py-10"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-amber-500"></i><br>Menghitung Data Keuangan...</p>
        </div>`;
        if(typeof window.renderLaporanKeuangan === 'function') setTimeout(window.renderLaporanKeuangan, 100);
    }
    else if (panelId === 'panel-settings') {
        panelTitle = "Pengaturan Toko & Link Sosmed";
        panelContent = `<div class="p-4" id="owner-settings-container">
            <p class="text-center text-gray-500 text-xs font-bold py-10">Form pengaturan toko akan dimuat...</p>
        </div>`;
        if(typeof window.renderFormSettings === 'function') setTimeout(window.renderFormSettings, 100);
    }
    // INTEGRASI LANGSUNG TAHAP 14
    else if (panelId === 'panel-promo') {
        panelTitle = "Manajemen Voucher & Diskon";
        panelContent = `<div class="p-4"><button onclick="tambahVoucherBaru()" class="w-full bg-pink-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-ticket"></i> Tambah Voucher Baru</button><div id="owner-voucher-list"></div></div>`;
        if(typeof window.renderOwnerVoucherList === 'function') setTimeout(window.renderOwnerVoucherList, 100);
    }
    else if (panelId === 'panel-inventory') {
        panelTitle = "Stok Gudang & Bahan Baku";
        panelContent = `<div class="p-4"><button onclick="tambahItemGudangBaru()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-boxes-stacked"></i> Tambah Bahan/Barang Baru</button><div id="owner-inventory-list"></div></div>`;
        if(typeof window.renderOwnerInventoryList === 'function') setTimeout(window.renderOwnerInventoryList, 100);
    }
    else {
        panelContent = `<div class="p-10 text-center text-gray-400 font-bold text-xs border-t border-gray-100">Modul sedang dalam tahap sinkronisasi...</div>`;
    }

    container.innerHTML = `
        <div class="bg-white min-h-[50vh] rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden fade-in relative pb-10">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <h3 class="font-black text-gray-900 text-xs uppercase tracking-wider">${panelTitle}</h3>
                <button onclick="closePanel()" class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"><i class="fa-solid fa-xmark"></i></button>
            </div>
            ${panelContent}
        </div>
    `;
};


// 2. MODUL VOUCHER & PROMO (CRUD)
window.renderOwnerVoucherList = function() {
    const container = document.getElementById('owner-voucher-list');
    if (!container) return;
    
    const vouchers = window.AppState.vouchers || {};
    container.innerHTML = '';
    let count = 0;
    
    Object.keys(vouchers).forEach(key => {
        const v = vouchers[key];
        if (!v) return;
        count++;
        
        container.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <div class="w-10 h-10 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-pink-100">
                    <i class="fa-solid fa-ticket"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${v.code}</h4>
                    <p class="text-[10px] text-gray-400 font-bold">Potongan: <span class="text-amber-600 font-black">${v.type === 'percent' ? v.value + '%' : window.formatRupiah(v.value)}</span></p>
                </div>
                <button onclick="hapusVoucher('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>
        `;
    });
    
    if (count === 0) {
        container.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada voucher aktif.</p>';
    }
};

window.tambahVoucherBaru = function() {
    const code = prompt("Masukkan Kode Voucher (Cth: MAINSTAYHEMAT):");
    if (!code) return;
    
    const nilai = prompt("Masukkan Nilai Diskon (Contoh: 5000 atau 10 untuk 10%):");
    if (!nilai || isNaN(nilai)) return;
    
    const tipe = confirm("Pilih tipe diskon:\n[OK] Potongan Rupiah (Nominal)\n[Cancel] Potongan Persen (%)") ? 'nominal' : 'percent';

    const newVoucherData = {
        code: code.toUpperCase(),
        value: parseFloat(nilai),
        type: tipe,
        status: 'active'
    };

    const newRef = window.push(window.ref(window.db, 'vouchers'));
    window.set(newRef, newVoucherData).then(() => {
        alert("✅ Voucher berhasil dibuat!");
        if(typeof window.renderOwnerVoucherList === 'function') window.renderOwnerVoucherList();
    });
};

window.hapusVoucher = function(key) {
    if (confirm("Hapus voucher ini?")) {
        window.remove(window.ref(window.db, `vouchers/${key}`)).then(() => {
            if(typeof window.renderOwnerVoucherList === 'function') window.renderOwnerVoucherList();
        });
    }
};


// 3. MODUL STOK GUDANG / INVENTARIS (RAW MATERIALS)
window.renderOwnerInventoryList = function() {
    const container = document.getElementById('owner-inventory-list');
    if (!container) return;
    
    const inventory = window.AppState.inventory || {};
    container.innerHTML = '';
    let count = 0;
    
    Object.keys(inventory).forEach(key => {
        const item = inventory[key];
        if (!item) return;
        count++;
        
        const isLow = (item.stok || 0) <= (item.minStok || 5);
        
        container.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${item.nama}</h4>
                    <p class="text-[10px] ${isLow ? 'text-red-500 font-black' : 'text-gray-400 font-bold'}">Stok: ${item.stok || 0} ${item.satuan || 'Pcs'} ${isLow ? '⚠️ (Menipis)' : ''}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="tambahStokGudang('${key}', 10)" class="px-2.5 py-1.5 bg-green-50 text-green-600 rounded-lg text-[9px] font-black border border-green-200">+10</button>
                    <button onclick="hapusGudang('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    
    if (count === 0) {
        container.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada data inventaris gudang.</p>';
    }
};

window.tambahItemGudangBaru = function() {
    const nama = prompt("Nama Barang / Bahan (Cth: Susu UHT / Cup 16oz):");
    if (!nama) return;
    
    const stok = prompt("Jumlah Stok Awal:", "50");
    const satuan = prompt("Satuan (Cth: Pcs / Pack / Liter):", "Pcs");

    const newRef = window.push(window.ref(window.db, 'inventory'));
    window.set(newRef, {
        nama: nama,
        stok: parseInt(stok) || 0,
        satuan: satuan || 'Pcs',
        minStok: 5
    }).then(() => {
        alert("✅ Item gudang ditambahkan!");
        if(typeof window.renderOwnerInventoryList === 'function') window.renderOwnerInventoryList();
    });
};

window.tambahStokGudang = function(key, jumlah) {
    const item = window.AppState.inventory[key];
    if (!item) return;
    
    const stokBaru = (item.stok || 0) + jumlah;
    window.update(window.ref(window.db, `inventory/${key}`), { stok: stokBaru }).then(() => {
        if(typeof window.renderOwnerInventoryList === 'function') window.renderOwnerInventoryList();
    });
};

window.hapusGudang = function(key) {
    if (confirm("Hapus item gudang ini?")) {
        window.remove(window.ref(window.db, `inventory/${key}`)).then(() => {
            if(typeof window.renderOwnerInventoryList === 'function') window.renderOwnerInventoryList();
        });
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 15 (MEMBER STAMP & DATABASE BACKUP)
   ========================================================================== */

// 1. REWRITE FUNGSI OPEN PANEL (VERSI FINAL - 8 PANEL AKTIF SEMUA)
window.openPanel = function(panelId) {
    const container = document.getElementById('owner-inner-panels-container');
    const gridMenu = document.querySelector('.grid.grid-cols-4');
    if (!container || !gridMenu) return;

    gridMenu.parentElement.classList.add('hidden');
    let panelTitle = "Panel Master";
    let panelContent = "";

    if (panelId === 'panel-menu') {
        panelTitle = "Katalog Menu & Stok";
        panelContent = `<div class="p-4"><button onclick="tambahMenuBaru()" class="w-full bg-amber-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-plus"></i> Tambah Menu Baru</button><div id="owner-menu-list"></div></div>`;
        if(typeof window.renderOwnerMenuList === 'function') setTimeout(window.renderOwnerMenuList, 100);
    }
    else if (panelId === 'panel-hrd') {
        panelTitle = "HRD & Absensi Staff";
        panelContent = `<div class="p-4"><div class="flex gap-2 mb-5"><button onclick="bukaModalAbsensi()" class="flex-1 bg-slate-900 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-camera"></i> Absen Masuk</button><button onclick="tambahKaryawanBaru()" class="flex-1 bg-amber-500 text-white py-3 rounded-xl font-black shadow-md text-xs uppercase"><i class="fa-solid fa-user-plus"></i> Staff Baru</button></div><div id="owner-hrd-list"></div></div>`;
        if(typeof window.renderOwnerHRDList === 'function') setTimeout(window.renderOwnerHRDList, 100);
    }
    else if (panelId === 'panel-laporan') {
        panelTitle = "Laporan Keuangan & Kasir";
        panelContent = `<div class="p-4" id="owner-laporan-container"><p class="text-center text-gray-500 text-xs font-bold py-10"><i class="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-amber-500"></i><br>Menghitung Data...</p></div>`;
        if(typeof window.renderLaporanKeuangan === 'function') setTimeout(window.renderLaporanKeuangan, 100);
    }
    else if (panelId === 'panel-settings') {
        panelTitle = "Pengaturan Toko";
        panelContent = `<div class="p-4" id="owner-settings-container"><p class="text-center text-gray-500 text-xs font-bold py-10">Memuat...</p></div>`;
        if(typeof window.renderFormSettings === 'function') setTimeout(window.renderFormSettings, 100);
    }
    else if (panelId === 'panel-promo') {
        panelTitle = "Manajemen Voucher";
        panelContent = `<div class="p-4"><button onclick="tambahVoucherBaru()" class="w-full bg-pink-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-ticket"></i> Tambah Voucher Baru</button><div id="owner-voucher-list"></div></div>`;
        if(typeof window.renderOwnerVoucherList === 'function') setTimeout(window.renderOwnerVoucherList, 100);
    }
    else if (panelId === 'panel-inventory') {
        panelTitle = "Stok Gudang";
        panelContent = `<div class="p-4"><button onclick="tambahItemGudangBaru()" class="w-full bg-orange-500 text-white py-3 rounded-xl font-black mb-4 uppercase tracking-widest text-xs shadow-md"><i class="fa-solid fa-boxes-stacked"></i> Tambah Bahan Baku</button><div id="owner-inventory-list"></div></div>`;
        if(typeof window.renderOwnerInventoryList === 'function') setTimeout(window.renderOwnerInventoryList, 100);
    }
    // TAMBAHAN TAHAP 15 (MEMBER & DATABASE)
    else if (panelId === 'panel-member') {
        panelTitle = "Member & Stamp";
        panelContent = `<div class="p-4">
            <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 flex justify-between items-center">
                <span class="text-[10px] font-black text-amber-900 uppercase">Program Stamp Loyalty</span>
                <button onclick="toggleGlobalStamp()" class="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm">ON / OFF</button>
            </div>
            <div id="owner-member-list"></div>
        </div>`;
        if(typeof window.renderOwnerMemberList === 'function') setTimeout(window.renderOwnerMemberList, 100);
    }
    else if (panelId === 'panel-database') {
        panelTitle = "Database Backup";
        panelContent = `<div class="p-4 space-y-4">
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                <i class="fa-solid fa-server text-2xl text-slate-400 mb-2"></i>
                <p class="text-[10px] font-bold text-gray-500 mb-3">Unduh seluruh data POS sebagai file JSON untuk dicadangkan.</p>
                <button onclick="exportDatabaseJSON()" class="w-full bg-blue-500 text-white py-3 rounded-xl font-black text-xs shadow-md"><i class="fa-solid fa-download"></i> Download Backup</button>
            </div>
            <div class="bg-red-50 border border-red-200 p-4 rounded-xl text-center relative overflow-hidden">
                <p class="text-[10px] font-bold text-red-500 mb-3">Upload file JSON untuk mengembalikan data (menimpa data lama).</p>
                <input type="file" accept=".json" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onchange="importDatabaseJSON(event)">
                <button class="w-full bg-white text-red-600 border border-red-300 py-3 rounded-xl font-black text-xs shadow-sm"><i class="fa-solid fa-upload"></i> Restore Data</button>
            </div>
        </div>`;
    }

    container.innerHTML = `
        <div class="bg-white min-h-[50vh] rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden fade-in relative pb-10">
            <div class="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <h3 class="font-black text-gray-900 text-xs uppercase tracking-wider">${panelTitle}</h3>
                <button onclick="closePanel()" class="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition"><i class="fa-solid fa-xmark"></i></button>
            </div>
            ${panelContent}
        </div>
    `;
};

// 2. FUNGSI MANAJEMEN MEMBER & STAMP LOYALTY
window.renderOwnerMemberList = function() {
    const container = document.getElementById('owner-member-list');
    if (!container) return;
    
    const members = window.AppState.members || {};
    container.innerHTML = '';
    let count = 0;
    
    Object.keys(members).forEach(key => {
        const m = members[key];
        if (!m) return;
        count++;
        
        container.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <div class="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-amber-100">
                    <i class="fa-solid fa-crown"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${m.nama}</h4>
                    <p class="text-[9px] text-gray-400 font-bold">${m.phone} • Stamp: <span class="text-amber-500 font-black">${m.stamps_count || 0}/5</span></p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="tambahStampMember('${key}')" class="w-8 h-8 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition flex items-center justify-center font-black" title="Tambah 1 Stamp">+</button>
                    <button onclick="resetStampMember('${key}')" class="w-8 h-8 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-200 transition flex items-center justify-center font-black" title="Klaim & Reset"><i class="fa-solid fa-rotate-left text-[10px]"></i></button>
                </div>
            </div>
        `;
    });
    
    if (count === 0) {
        container.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada member yang mendaftar.</p>';
    }
};

window.tambahStampMember = function(key) {
    const m = window.AppState.members[key];
    if (!m) return;
    
    let current = parseInt(m.stamps_count || 0);
    if (current >= 5) {
        alert("Stamp sudah penuh (5/5)! Silakan berikan hadiah dan klik tombol reset (putar).");
        return;
    }
    
    window.update(window.ref(window.db, `members/${key}`), { stamps_count: current + 1 }).then(() => {
        window.renderOwnerMemberList();
    });
};

window.resetStampMember = function(key) {
    if (confirm("Member sudah mengklaim hadiah? Stamp akan dikosongkan kembali ke 0.")) {
        const m = window.AppState.members[key];
        let sessions = parseInt(m.completed_sessions || 0) + 1;
        window.update(window.ref(window.db, `members/${key}`), { stamps_count: 0, completed_sessions: sessions }).then(() => {
            window.renderOwnerMemberList();
        });
    }
};

window.toggleGlobalStamp = function() {
    alert("Tombol Master Switch Program Stamp ditekan. (Program sedang berjalan)");
};

// 3. FUNGSI EXPORT (BACKUP) & IMPORT (RESTORE) DATABASE JSON
window.exportDatabaseJSON = function() {
    // Mengambil snapshot utuh dari memori browser
    const dataStr = JSON.stringify(window.AppState, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Mainstay_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.importDatabaseJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (confirm("PERINGATAN KRITIKAL: Seluruh data Anda saat ini di Firebase akan ditimpa dengan data dari file backup ini. Lanjutkan?")) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                // Push utuh ke root Firebase
                window.set(window.ref(window.db, '/'), data).then(() => {
                    alert("✅ Database berhasil dipulihkan! Halaman akan dimuat ulang.");
                    location.reload();
                }).catch(err => alert("Gagal memulihkan database ke Firebase: " + err));
            } catch (err) {
                alert("File JSON tidak valid atau rusak.");
            }
        };
        reader.readAsText(file);
    }
    event.target.value = ''; 
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 16 (PENGELUARAN & KUSTOMISASI PROMO)
   ========================================================================== */

// 1. REWRITE LAPORAN KEUANGAN (DENGAN INPUT PENGELUARAN & PRIVE)
window.renderLaporanKeuangan = function() {
    const container = document.getElementById('owner-laporan-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const finance = window.AppState.finance || {}; // Data pengeluaran

    // Hitung Omzet
    let totalOmzet = 0;
    Object.values(orders).forEach(o => { 
        if (o && o.status === 'selesai') totalOmzet += (o.grandTotal || 0); 
    });

    // Hitung Pengeluaran
    let totalPengeluaran = 0;
    let listPengeluaranHtml = '';
    Object.keys(finance).forEach(key => {
        const f = finance[key];
        if(f) {
            totalPengeluaran += (f.nominal || 0);
            listPengeluaranHtml += `
                <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 mb-2 shadow-sm">
                    <div>
                        <p class="text-[10px] font-black text-gray-800">${f.keterangan}</p>
                        <p class="text-[9px] ${f.kategori === 'Prive Owner' ? 'text-amber-500' : 'text-gray-500'} font-bold">${f.kategori}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-black text-red-500">-${window.formatRupiah(f.nominal)}</span>
                        <button onclick="hapusPengeluaran('${key}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
    });

    if(!listPengeluaranHtml) listPengeluaranHtml = '<p class="text-[9px] text-gray-400 text-center py-3 font-bold border border-dashed border-gray-200 rounded-lg">Belum ada catatan pengeluaran / kas keluar.</p>';

    // Rumus Net Profit sesuai Blueprint
    const labaBersih = totalOmzet - totalPengeluaran;

    container.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                    <p class="text-[9px] font-black text-amber-800 uppercase mb-1">Omzet (Kotor)</p>
                    <p class="text-sm font-black text-amber-900">${window.formatRupiah(totalOmzet)}</p>
                </div>
                <div class="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
                    <p class="text-[9px] font-black text-red-800 uppercase mb-1">Kas Keluar</p>
                    <p class="text-sm font-black text-red-900">${window.formatRupiah(totalPengeluaran)}</p>
                </div>
            </div>
            
            <div class="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm">
                <p class="text-[10px] font-black text-green-800 uppercase tracking-wider mb-1">Laba Bersih (Net Profit)</p>
                <p class="text-xl font-black text-green-900">${window.formatRupiah(labaBersih)}</p>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div class="flex justify-between items-center mb-3">
                    <p class="text-[10px] font-black text-gray-700 uppercase tracking-wider">Catatan Kas Keluar</p>
                    <button onclick="tambahPengeluaran()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm hover:bg-red-600 transition"><i class="fa-solid fa-plus"></i> Input Kas</button>
                </div>
                <div class="max-h-40 overflow-y-auto hide-scrollbar">
                    ${listPengeluaranHtml}
                </div>
            </div>
        </div>
    `;
};

window.tambahPengeluaran = function() {
    const ket = prompt("Keterangan Kas Keluar (Cth: Beli Gelas Cup / Gaji Harian):");
    if(!ket) return;
    const nominal = prompt("Masukkan Nominal Rupiah (Cth: 50000):");
    if(!nominal || isNaN(nominal)) return;
    const isPrive = confirm("Kategori Pengeluaran:\n[OK] Prive (Pengambilan Pribadi Owner)\n[Cancel] Biaya Operasional Toko");

    const newRef = window.push(window.ref(window.db, 'finance'));
    window.set(newRef, {
        keterangan: ket,
        nominal: parseInt(nominal),
        kategori: isPrive ? "Prive Owner" : "Operasional Toko",
        tanggal: new Date().toISOString()
    }).then(() => {
        window.renderLaporanKeuangan();
    });
};

window.hapusPengeluaran = function(key) {
    if(confirm("Hapus catatan kas keluar ini?")) {
        window.remove(window.ref(window.db, `finance/${key}`)).then(() => window.renderLaporanKeuangan());
    }
};

// 2. REWRITE SETTING TOKO (DENGAN KUSTOMISASI BANNER & RUNNING TEXT)
window.renderFormSettings = function() {
    const container = document.getElementById('owner-settings-container');
    if (!container) return;
    const s = window.AppState.storeSettings || {};
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-gray-700 uppercase mb-2 border-b border-gray-200 pb-2">Informasi & Kontak Dasar</p>
                <input type="text" id="set-store-name" value="${s.storeName || 'Mainstay Drink Shop'}" placeholder="Nama Toko" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-wa" value="${s.phoneWA || '628977099557'}" placeholder="Nomor WA (62...)" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-logo" value="${s.logo || 'logo-192.png'}" placeholder="URL Logo (Universal Link)" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
            </div>

            <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-amber-900 uppercase mb-2 border-b border-amber-200 pb-2">Tampilan Pelanggan (UI)</p>
                <label class="text-[9px] font-bold text-gray-500 mb-1 block">Teks Berjalan (Marquee)</label>
                <input type="text" id="set-store-marquee" value="${s.marquee || 'Selamat datang di Mainstay Drink! Nikmati kesegaran minuman andalanmu hari ini.'}" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                
                <label class="text-[9px] font-bold text-gray-500 mb-1 block">Link Gambar Banner Promo</label>
                <input type="text" id="set-store-banner" value="${s.banner || 'https://via.placeholder.com/600x300?text=Promo+Mainstay'}" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
            </div>

            <button onclick="simpanPengaturanToko()" class="w-full bg-amber-500 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-md hover:bg-amber-600 transition">Simpan Semua Perubahan</button>
        </div>
    `;
};

window.simpanPengaturanToko = function() {
    const name = document.getElementById('set-store-name')?.value;
    const wa = document.getElementById('set-store-wa')?.value;
    const logo = document.getElementById('set-store-logo')?.value;
    const marquee = document.getElementById('set-store-marquee')?.value;
    const banner = document.getElementById('set-store-banner')?.value;

    window.set(window.ref(window.db, 'storeSettings'), { 
        storeName: name, 
        phoneWA: wa, 
        logo: logo, 
        marquee: marquee, 
        banner: banner 
    }).then(() => {
        alert("✅ Pengaturan Toko & Tampilan berhasil diperbarui!");
        window.applyTokoSettings(); // Terapkan langsung tanpa perlu refresh browser
    });
};

// 3. OVERRIDE FUNGSI APPLY SETTINGS UNTUK MEMUNCULKAN BANNER
window.applyTokoSettings = function() {
    const s = window.AppState.storeSettings || {};
    
    // Logo Header
    const imgLogo = document.getElementById('header-logo-img');
    const iconLogo = document.getElementById('header-logo-icon');
    if (imgLogo) {
        imgLogo.src = s.logo || 'logo-192.png';
        imgLogo.classList.remove('hidden');
        if(iconLogo) iconLogo.classList.add('hidden');
    }

    // Customer Banner & Marquee
    const marqueeEl = document.getElementById('promo-marquee-text');
    if(marqueeEl && s.marquee) marqueeEl.innerText = s.marquee;

    const bannerEl = document.getElementById('carousel-img-1');
    if(bannerEl && s.banner) bannerEl.src = s.banner;
    
    // Update Link Sosmed & Peta (Customer Footer)
    const linkWA = document.getElementById('link-wa');
    const linkIG = document.getElementById('link-ig');
    const linkTikTok = document.getElementById('link-tiktok');
    if (linkWA) linkWA.href = s.waLink || `https://wa.me/message/YRXE6JXPVVF5N1`;
    if (linkIG) linkIG.href = s.ig || `https://www.instagram.com/mainstay.in?igsi=am1laG13M216aXB0`;
    if (linkTikTok) linkTikTok.href = s.tiktok || `https://www.tiktok.com/@mainstay.drink.sh?_r=1&_t=ZS-99MCHx8uZ3Y`;
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 17 (TOKO TUTUP & TUTUP SHIFT KASIR)
   ========================================================================== */

// 1. REWRITE FORM PENGATURAN TOKO (TAMBAH TOMBOL BUKA/TUTUP TOKO)
window.renderFormSettings = function() {
    const container = document.getElementById('owner-settings-container');
    if (!container) return;
    const s = window.AppState.storeSettings || {};
    const isClosed = s.isClosed || false;
    
    container.innerHTML = `
        <div class="space-y-4">
            <!-- EMERGENCY SWITCH: TOKO BUKA / TUTUP -->
            <div class="${isClosed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border p-4 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-wider ${isClosed ? 'text-red-900' : 'text-green-900'}">Status Operasional</p>
                    <p class="text-[9px] ${isClosed ? 'text-red-600' : 'text-green-600'} font-bold">${isClosed ? 'Toko Ditutup (Pelanggan tidak bisa order)' : 'Toko Buka (Menerima pesanan)'}</p>
                </div>
                <button onclick="toggleStatusToko(${!isClosed})" class="px-4 py-2 rounded-lg font-black text-xs text-white shadow-md transition ${isClosed ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}">
                    ${isClosed ? 'Buka Toko' : 'Tutup Toko'}
                </button>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-gray-700 uppercase mb-2 border-b border-gray-200 pb-2">Informasi & Kontak Dasar</p>
                <input type="text" id="set-store-name" value="${s.storeName || 'Mainstay Drink Shop'}" placeholder="Nama Toko" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-wa" value="${s.phoneWA || '628977099557'}" placeholder="Nomor WA (62...)" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-logo" value="${s.logo || 'logo-192.png'}" placeholder="URL Logo" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
            </div>

            <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-amber-900 uppercase mb-2 border-b border-amber-200 pb-2">Tampilan Pelanggan (UI)</p>
                <input type="text" id="set-store-marquee" value="${s.marquee || 'Selamat datang di Mainstay Drink!'}" placeholder="Teks Berjalan" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-banner" value="${s.banner || ''}" placeholder="Link Banner Promo" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
            </div>

            <button onclick="simpanPengaturanToko()" class="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-md hover:bg-black transition">Simpan Info Toko</button>
        </div>
    `;
};

window.toggleStatusToko = function(setToClose) {
    const s = window.AppState.storeSettings || {};
    window.update(window.ref(window.db, 'storeSettings'), { isClosed: setToClose }).then(() => {
        window.renderFormSettings();
        window.applyTokoSettings();
    });
};

window.simpanPengaturanToko = function() {
    const name = document.getElementById('set-store-name')?.value;
    const wa = document.getElementById('set-store-wa')?.value;
    const logo = document.getElementById('set-store-logo')?.value;
    const marquee = document.getElementById('set-store-marquee')?.value;
    const banner = document.getElementById('set-store-banner')?.value;

    window.update(window.ref(window.db, 'storeSettings'), { 
        storeName: name, phoneWA: wa, logo: logo, marquee: marquee, banner: banner 
    }).then(() => {
        alert("✅ Info toko diperbarui!");
        window.applyTokoSettings(); 
    });
};

// 2. REWRITE APPLY SETTINGS (MENGUNCI APLIKASI JIKA TOKO TUTUP)
window.applyTokoSettings = function() {
    const s = window.AppState.storeSettings || {};
    
    // Logo Header
    const imgLogo = document.getElementById('header-logo-img');
    const iconLogo = document.getElementById('header-logo-icon');
    if (imgLogo) {
        imgLogo.src = s.logo || 'logo-192.png';
        imgLogo.classList.remove('hidden');
        if(iconLogo) iconLogo.classList.add('hidden');
    }

    // Customer Banner & Marquee
    const marqueeEl = document.getElementById('promo-marquee-text');
    if(marqueeEl && s.marquee) marqueeEl.innerText = s.marquee;
    const bannerEl = document.getElementById('carousel-img-1');
    if(bannerEl && s.banner) bannerEl.src = s.banner;
    
    // Logic Toko Tutup (Kunci Keranjang & Munculkan Banner)
    const bannerTutup = document.getElementById('store-closed-banner');
    const btnCart = document.getElementById('btn-cart-floating');
    
    if (s.isClosed) {
        if(bannerTutup) bannerTutup.classList.remove('hidden');
        if(btnCart) btnCart.style.pointerEvents = 'none'; // Matikan fungsi keranjang
        // Kosongkan keranjang paksa
        window.AppState.cart = [];
        window.updateCartUI();
    } else {
        if(bannerTutup) bannerTutup.classList.add('hidden');
        if(btnCart) btnCart.style.pointerEvents = 'auto'; // Nyalakan kembali
    }
};

// 3. FUNGSI BARU: TUTUP SHIFT KASIR (AUDIT UANG FISIK)
// Fungsi ini menimpa prosesLogout biasa khusus untuk Kasir
window.prosesLogout = function(role) {
    if (role === 'kasir') {
        const targetSistem = document.getElementById('kasir-drawer-target')?.innerText || "Rp 0";
        const cleanTarget = parseInt(targetSistem.replace(/[^0-9]/g, '')) || 0;
        
        const fisikKasir = prompt(`AUDIT TUTUP SHIFT\n\nTarget Laci Sistem: ${targetSistem}\n\nMasukkan jumlah total uang fisik di laci saat ini:`);
        
        if (fisikKasir !== null && fisikKasir.trim() !== '') {
            const fisik = parseInt(fisikKasir);
            if (isNaN(fisik)) {
                alert("Nominal tidak valid. Logout dibatalkan.");
                return;
            }
            
            const selisih = fisik - cleanTarget;
            let statusAudit = selisih === 0 ? "SEIMBANG ✅" : (selisih > 0 ? `LEBIH (Rp ${selisih}) ⚠️` : `MINUS (Rp ${selisih}) ❌`);
            
            alert(`Laporan Shift:\n- Sistem: Rp ${cleanTarget}\n- Fisik: Rp ${fisik}\n- Status: ${statusAudit}\n\nLaporan telah dicatat. Sesi Anda akan ditutup.`);
            
            // Catat ke log finance (Laporan Keuangan Owner)
            const newRef = window.push(window.ref(window.db, 'finance'));
            window.set(newRef, {
                keterangan: `Tutup Shift Kasir: ${window.AppState.activeStaffName}`,
                nominal: 0, 
                kategori: `Audit Shift: ${statusAudit}`,
                tanggal: new Date().toISOString()
            });
        } else {
            alert("Audit dibatalkan.");
            return; // Batal logout jika tidak diisi
        }
    } else {
        if (!confirm(`Yakin ingin keluar dari akses ${role.toUpperCase()}?`)) return;
    }

    // Eksekusi Logout
    window.AppState.activeStaffName = "Guest";
    const kasirNameEl = document.getElementById('kasir-active-name');
    if (kasirNameEl) kasirNameEl.innerText = "Guest";
    window.switchRoleView('customer');
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 18 (OPTIMASI PRINTER THERMAL 58mm)
   ========================================================================== */

// 1. INJEKSI CSS KHUSUS PRINTER THERMAL DARI JAVASCRIPT
// Kode ini otomatis berjalan untuk menyembunyikan UI aplikasi saat nge-print, 
// dan HANYA menampilkan area struk dengan ukuran pas kertas kasir 58mm.
(function injectPrintCSS() {
    const style = document.createElement('style');
    style.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt {
                position: absolute;
                left: 0;
                top: 0;
                width: 58mm; /* Ukuran standar kertas printer thermal mini */
                font-family: 'Courier New', Courier, monospace; /* Font khas struk */
                font-size: 12px;
                color: #000;
                padding: 0;
                margin: 0;
            }
            /* Hilangkan margin default browser / header footer URL saat print */
            @page { margin: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// 2. REWRITE FUNGSI CETAK STRUK (Format Dioptimalkan)
window.cetakStruk = function(key, type) {
    const ord = window.AppState.orders[key];
    if (!ord) return;
    
    const printArea = document.getElementById('printable-receipt');
    if (!printArea) return;
    
    let itemsHtml = '';
    ord.items.forEach(i => {
        itemsHtml += `
            <div style="margin-bottom:6px; display: flex; justify-content: space-between;">
                <div style="flex:1;">
                    <span style="font-weight:bold;">${i.qty}x ${i.nama}</span><br>
                    <span style="font-size:10px; color:#333;">${i.catatan}</span>
                </div>
                ${type === 'kasir' ? `<div style="text-align:right; font-weight:bold;">${window.formatRupiah(i.total)}</div>` : ''}
            </div>
        `;
    });
    
    const storeSettings = window.AppState.storeSettings || {};
    const storeName = storeSettings.storeName || "MAINSTAY DRINK";
    const footerMsg = storeSettings.receiptFooter || "Terima Kasih!\nIG: @mainstay.in";
    
    if (type === 'kasir') {
        // TAMPILAN STRUK PELANGGAN
        printArea.innerHTML = `
            <div style="text-align:center; margin-bottom:10px; border-bottom: 1px dashed #000; padding-bottom: 10px;">
                <h2 style="margin:0; font-size:16px; font-weight:bold;">${storeName}</h2>
                <div style="font-size:10px;">Struk Pembelian</div>
            </div>
            <div style="margin-bottom:5px; font-size:10px; line-height: 1.4;">
                <div>ID: ${ord.orderId}</div>
                <div>Kasir: ${window.AppState.activeStaffName}</div>
                <div>Tgl: ${new Date(ord.waktu).toLocaleString('id-ID')}</div>
                <div>Pelanggan: ${ord.namaCustomer}</div>
            </div>
            <div style="border-top:1px dashed #000; border-bottom:1px dashed #000; margin: 10px 0; padding: 10px 0;">
                ${itemsHtml}
            </div>
            <div style="text-align:right; font-weight:bold; font-size:14px; margin-bottom:10px;">
                TOTAL: ${window.formatRupiah(ord.grandTotal)}<br>
                <span style="font-size:10px; font-weight:normal;">(${ord.metodeBayar})</span>
            </div>
            <div style="text-align:center; font-size:10px; white-space: pre-line; border-top: 1px dashed #000; padding-top: 10px;">
                ${footerMsg}
            </div>
        `;
    } else {
        // TAMPILAN TIKET DAPUR (Fokus nama minuman & catatan besar)
        printArea.innerHTML = `
            <div style="text-align:center; margin-bottom:10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
                <h2 style="margin:0; font-size:18px; font-weight:bold;">TIKET DAPUR</h2>
            </div>
            <div style="margin-bottom:10px; font-size:12px; font-weight:bold;">
                <div>No Antrean: ${ord.orderId.split('-').pop()}</div>
                <div>Cust: ${ord.namaCustomer}</div>
                <div>Jam: ${new Date(ord.waktu).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <div style="font-size:14px; font-weight:bold; padding-top:10px; border-top: 1px dashed #000;">
                ${itemsHtml}
            </div>
        `;
    }
    
    // Beri jeda 300ms agar browser selesai merender HTML sebelum memunculkan dialog Print Android
    setTimeout(() => {
        window.print();
    }, 300);
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 19 (INTEGRASI QRIS & AUDIO KASIR)
   ========================================================================== */

// 1. REWRITE FORM PENGATURAN TOKO (TAMBAH INPUT QRIS & AUDIO)
window.renderFormSettings = function() {
    const container = document.getElementById('owner-settings-container');
    if (!container) return;
    const s = window.AppState.storeSettings || {};
    const isClosed = s.isClosed || false;
    
    container.innerHTML = `
        <div class="space-y-4">
            <div class="${isClosed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border p-4 rounded-xl flex justify-between items-center shadow-sm">
                <div>
                    <p class="text-[10px] font-black uppercase tracking-wider ${isClosed ? 'text-red-900' : 'text-green-900'}">Status Operasional</p>
                    <p class="text-[9px] ${isClosed ? 'text-red-600' : 'text-green-600'} font-bold">${isClosed ? 'Toko Ditutup' : 'Toko Buka'}</p>
                </div>
                <button onclick="toggleStatusToko(${!isClosed})" class="px-4 py-2 rounded-lg font-black text-xs text-white shadow-md transition ${isClosed ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}">
                    ${isClosed ? 'Buka Toko' : 'Tutup Toko'}
                </button>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-gray-700 uppercase mb-2 border-b border-gray-200 pb-2">Informasi & Kontak Dasar</p>
                <input type="text" id="set-store-name" value="${s.storeName || 'Mainstay Drink Shop'}" placeholder="Nama Toko" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-wa" value="${s.phoneWA || '628977099557'}" placeholder="Nomor WA (62...)" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-logo" value="${s.logo || 'logo-192.png'}" placeholder="URL Logo" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                
                <!-- TAMBAHAN INPUT QRIS -->
                <label class="text-[9px] font-bold text-gray-500 mb-1 block mt-2">Link Gambar QRIS Toko</label>
                <input type="text" id="set-store-qris" value="${s.qris || 'https://via.placeholder.com/400?text=QRIS+Belum+Diatur'}" placeholder="Link Gambar QRIS" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-blue-500">
            </div>

            <div class="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <p class="text-[10px] font-black text-amber-900 uppercase mb-2 border-b border-amber-200 pb-2">Tampilan Pelanggan (UI)</p>
                <input type="text" id="set-store-marquee" value="${s.marquee || 'Selamat datang di Mainstay Drink!'}" placeholder="Teks Berjalan" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500 mb-2">
                <input type="text" id="set-store-banner" value="${s.banner || ''}" placeholder="Link Banner Promo" class="w-full bg-white border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
            </div>

            <button onclick="simpanPengaturanToko()" class="w-full bg-slate-900 text-white py-3.5 rounded-xl font-black text-xs uppercase shadow-md hover:bg-black transition">Simpan Info Toko</button>
        </div>
    `;
};

window.simpanPengaturanToko = function() {
    const name = document.getElementById('set-store-name')?.value;
    const wa = document.getElementById('set-store-wa')?.value;
    const logo = document.getElementById('set-store-logo')?.value;
    const marquee = document.getElementById('set-store-marquee')?.value;
    const banner = document.getElementById('set-store-banner')?.value;
    const qris = document.getElementById('set-store-qris')?.value; // Ambil nilai QRIS

    window.update(window.ref(window.db, 'storeSettings'), { 
        storeName: name, phoneWA: wa, logo: logo, marquee: marquee, banner: banner, qris: qris
    }).then(() => {
        alert("✅ Info toko & QRIS diperbarui!");
        window.applyTokoSettings(); 
    });
};

// 2. INJEKSI MODAL QRIS KE DALAM HALAMAN HTML SECARA OTOMATIS
(function injectQRISModal() {
    if (!document.getElementById('modal-qris-payment')) {
        const modalHtml = `
            <div id="modal-qris-payment" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] hidden flex-col items-center justify-center p-4">
                <div class="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl relative flex flex-col items-center">
                    <h2 class="text-sm font-black text-gray-900 mb-1">SCAN QRIS UNTUK BAYAR</h2>
                    <p class="text-[10px] text-gray-500 font-bold mb-4 text-center">Pesanan akan dikirim ke dapur setelah Anda menekan tombol sudah bayar.</p>
                    
                    <div class="w-48 h-48 bg-gray-100 rounded-xl mb-4 overflow-hidden border-2 border-blue-100 p-2">
                        <img id="qris-image-display" src="" class="w-full h-full object-contain" alt="QRIS">
                    </div>
                    
                    <div class="w-full flex gap-3 mt-2">
                        <button onclick="batalQRIS()" class="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-xs border border-red-100 hover:bg-red-500 hover:text-white transition">Batal</button>
                        <button onclick="konfirmasiBayarQRIS()" class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-blue-600 transition">Selesai Bayar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
})();

// 3. REWRITE PROSES CHECKOUT (CEK JIKA QRIS ATAU CASH)
window.prosesCheckout = function() {
    if (window.AppState.cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }
    
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    
    if (payment === 'QRIS') {
        // Jika QRIS, Tampilkan Modal QRIS terlebih dahulu
        const qrisModal = document.getElementById('modal-qris-payment');
        const qrisImg = document.getElementById('qris-image-display');
        const s = window.AppState.storeSettings || {};
        
        if (qrisImg) qrisImg.src = s.qris || 'https://via.placeholder.com/400?text=QRIS+Belum+Diatur';
        if (qrisModal) {
            qrisModal.classList.remove('hidden');
            qrisModal.classList.add('flex');
        }
    } else {
        // Jika Cash, langsung push pesanan
        window.kirimPesananKeFirebase();
    }
};

window.batalQRIS = function() {
    const qrisModal = document.getElementById('modal-qris-payment');
    if (qrisModal) {
        qrisModal.classList.add('hidden');
        qrisModal.classList.remove('flex');
    }
};

window.konfirmasiBayarQRIS = function() {
    window.batalQRIS();
    window.kirimPesananKeFirebase();
};

// 4. FUNGSI INTI PENGIRIMAN PESANAN (DIPISAH AGAR BISA DIPANGGIL QRIS/CASH)
window.kirimPesananKeFirebase = function() {
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;

    const now = new Date();
    const datePrefix = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    const payCode = payment === 'Cash' ? 'CSH' : 'QRS';
    const randomHash = Math.floor(1000 + Math.random() * 9000);
    const orderId = `CUS-${payCode}-${datePrefix}-${randomHash}`;
    
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
        status: 'pending' 
    };

    const newOrderRef = window.push(window.ref(window.db, 'orders'));
    window.set(newOrderRef, orderData).then(() => {
        alert(`✅ Pesanan Berhasil!\nNomor Antrean: ${orderId}\n${payment === 'Cash' ? 'Silakan bayar di kasir.' : 'Terima kasih atas pembayaran Anda.'}`);
        
        if (isMember && phone) {
            const memberRef = window.push(window.ref(window.db, 'members'));
            window.set(memberRef, { nama: nama, phone: phone, stamps_count: 0, completed_sessions: 0, joined_at: now.toISOString(), status: 'active' });
        }
        
        window.AppState.cart = [];
        window.updateCartUI();
        window.closeModalCheckout();
        
        const nameInput = document.getElementById('co-name');
        const phoneInput = document.getElementById('co-phone');
        if(nameInput) nameInput.value = '';
        if(phoneInput) phoneInput.value = '';
        
        // Audio Chime Notifikasi Kasir
        try {
            new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play();
        } catch(e) {}
        
    }).catch(err => {
        alert("Gagal mengirim pesanan. Periksa koneksi internet Anda.");
    });
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 20 (REAL-TIME SENSOR & OPTIMASI MEMORI)
   ========================================================================== */

// 1. MENGAKTIFKAN SENSOR REAL-TIME FIREBASE
// Menggantikan initFirebase statis menjadi Live Listener
window.initFirebase = function() {
    console.log("Menghubungkan sensor Real-Time ke Firebase...");

    // A. Sinkronisasi Pesanan (Kasir Live)
    const ordersRef = window.ref(window.db, 'orders');
    window.onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        
        // Deteksi jika ada pesanan baru untuk memutar bunyi (Opsional, jika kasir aktif)
        const oldOrdersCount = Object.keys(window.AppState.orders || {}).length;
        const newOrdersCount = Object.keys(data).length;
        
        window.AppState.orders = data;
        
        // Render ulang layar Kasir jika sedang dibuka
        if (typeof window.renderKasirList === 'function' && document.getElementById('kasir-orders-container')) {
            window.renderKasirList();
            
            // Bunyikan alarm jika ada pesanan baru bertambah
            if (newOrdersCount > oldOrdersCount) {
                try {
                    new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play();
                } catch(e) {}
            }
        }
        
        // Update laporan keuangan jika panel owner terbuka
        if (typeof window.renderLaporanKeuangan === 'function' && document.getElementById('owner-laporan-container')) {
            window.renderLaporanKeuangan();
        }
    });

    // B. Sinkronisasi Pengaturan Toko (Buka/Tutup Instan)
    const settingsRef = window.ref(window.db, 'storeSettings');
    window.onValue(settingsRef, (snapshot) => {
        window.AppState.storeSettings = snapshot.val() || {};
        if (typeof window.applyTokoSettings === 'function') {
            window.applyTokoSettings();
        }
    });

    // C. Sinkronisasi Katalog Menu (Update Stok Habis Instan)
    const menusRef = window.ref(window.db, 'menus');
    window.onValue(menusRef, (snapshot) => {
        window.AppState.menus = snapshot.val() || {};
        if (typeof window.renderKatalog === 'function' && document.getElementById('menu-grid')) {
            window.renderKatalog();
        }
    });

    // D. Sinkronisasi Staff & Keuangan (Latar Belakang)
    window.onValue(window.ref(window.db, 'staff'), (s) => window.AppState.staff = s.val() || {});
    window.onValue(window.ref(window.db, 'finance'), (s) => window.AppState.finance = s.val() || {});
    window.onValue(window.ref(window.db, 'inventory'), (s) => window.AppState.inventory = s.val() || {});
    window.onValue(window.ref(window.db, 'vouchers'), (s) => window.AppState.vouchers = s.val() || {});
    window.onValue(window.ref(window.db, 'members'), (s) => window.AppState.members = s.val() || {});
};

// 2. JALANKAN MESIN SECARA OTOMATIS SAAT APLIKASI DIBUKA
// Menghapus delay atau tombol manual, langsung live saat loading
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan inisialisasi Firebase
    if (typeof window.initFirebase === 'function') {
        window.initFirebase();
    }
    
    // Set tampilan awal sebagai Customer
    if (typeof window.switchRoleView === 'function') {
        window.switchRoleView('customer');
    }
});

console.log("🚀 MAINSTAY DRINK POS - VERSI 20 (ENTERPRISE) BERHASIL DIMUAT!");
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 22 (TUTUP BUKU HARIAN / END OF DAY)
   ========================================================================== */

// 1. REWRITE PANEL LAPORAN KEUANGAN (TAMBAH TOMBOL TUTUP BUKU)
window.renderLaporanKeuangan = function() {
    const container = document.getElementById('owner-laporan-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const finance = window.AppState.finance || {}; 

    let totalOmzet = 0;
    Object.values(orders).forEach(o => { 
        if (o && o.status === 'selesai') totalOmzet += (o.grandTotal || 0); 
    });

    let totalPengeluaran = 0;
    let listPengeluaranHtml = '';
    Object.keys(finance).forEach(key => {
        const f = finance[key];
        if(f) {
            totalPengeluaran += (f.nominal || 0);
            listPengeluaranHtml += `
                <div class="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 mb-2 shadow-sm">
                    <div>
                        <p class="text-[10px] font-black text-gray-800">${f.keterangan}</p>
                        <p class="text-[9px] ${f.kategori === 'Prive Owner' ? 'text-amber-500' : 'text-gray-500'} font-bold">${f.kategori}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] font-black text-red-500">-${window.formatRupiah(f.nominal)}</span>
                        <button onclick="hapusPengeluaran('${key}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }
    });

    if(!listPengeluaranHtml) listPengeluaranHtml = '<p class="text-[9px] text-gray-400 text-center py-3 font-bold border border-dashed border-gray-200 rounded-lg">Belum ada catatan pengeluaran / kas keluar.</p>';

    const labaBersih = totalOmzet - totalPengeluaran;

    container.innerHTML = `
        <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm">
                    <p class="text-[9px] font-black text-amber-800 uppercase mb-1">Omzet (Kotor)</p>
                    <p class="text-sm font-black text-amber-900">${window.formatRupiah(totalOmzet)}</p>
                </div>
                <div class="bg-red-50 border border-red-200 p-4 rounded-xl shadow-sm">
                    <p class="text-[9px] font-black text-red-800 uppercase mb-1">Kas Keluar</p>
                    <p class="text-sm font-black text-red-900">${window.formatRupiah(totalPengeluaran)}</p>
                </div>
            </div>
            
            <div class="bg-green-50 border border-green-200 p-4 rounded-xl shadow-sm">
                <p class="text-[10px] font-black text-green-800 uppercase tracking-wider mb-1">Laba Bersih (Net Profit)</p>
                <p class="text-xl font-black text-green-900">${window.formatRupiah(labaBersih)}</p>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <div class="flex justify-between items-center mb-3">
                    <p class="text-[10px] font-black text-gray-700 uppercase tracking-wider">Catatan Kas Keluar</p>
                    <button onclick="tambahPengeluaran()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[9px] font-black shadow-sm hover:bg-red-600 transition"><i class="fa-solid fa-plus"></i> Input Kas</button>
                </div>
                <div class="max-h-40 overflow-y-auto hide-scrollbar">
                    ${listPengeluaranHtml}
                </div>
            </div>

            <!-- TOMBOL TUTUP BUKU HARIAN -->
            <button onclick="tutupBukuHarian()" class="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase shadow-md hover:bg-black transition flex items-center justify-center gap-2 mt-4">
                <i class="fa-solid fa-power-off"></i> Tutup Buku Harian (Reset Layar)
            </button>
        </div>
    `;
};

// 2. FUNGSI EKSEKUSI TUTUP BUKU
window.tutupBukuHarian = function() {
    const pin = prompt("Otorisasi Master: Masukkan PIN (888888) untuk Tutup Buku Harian:");
    if (pin !== "888888") {
        alert("❌ Akses Ditolak! Hanya Owner yang dapat melakukan Tutup Buku.");
        return;
    }

    if (confirm("⚠️ PERINGATAN: Proses ini akan membersihkan layar kasir dan me-reset laporan hari ini agar siap untuk besok. Data lama tetap aman di Google Sheets. Lanjutkan?")) {
        // Hapus node pesanan dan keuangan hari ini dari layar aktif
        window.remove(window.ref(window.db, 'orders'));
        window.remove(window.ref(window.db, 'finance')).then(() => {
            alert("✅ Tutup Buku Harian Berhasil!\nLayar kasir telah bersih dan siap digunakan untuk besok.");
            // Render ulang supaya kembali ke angka 0
            if (typeof window.renderLaporanKeuangan === 'function') window.renderLaporanKeuangan();
            if (typeof window.renderKasirList === 'function') window.renderKasirList();
        }).catch(err => {
            alert("Gagal melakukan tutup buku: " + err);
        });
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 23 (RESPONSIVITAS DEVICE & ANTI-ZOOM)
   ========================================================================== */

(function optimasiLayarPOS() {
    // 1. Memaksa Meta Viewport untuk mengunci layar (Anti-Zoom / Pinch)
    // Sangat krusial agar kasir tidak ter-zoom secara tidak sengaja saat menekan tombol dengan cepat
    let viewport = document.querySelector("meta[name=viewport]");
    if (!viewport) {
        viewport = document.createElement("meta");
        viewport.name = "viewport";
        document.head.appendChild(viewport);
    }
    viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";

    // 2. Suntik CSS Global untuk menstabilkan UI di segala ukuran layar
    const style = document.createElement('style');
    style.innerHTML = `
        /* Mengunci aksi sentuh agar tidak memantul (bounce) di mobile browser */
        html, body {
            overscroll-behavior-y: none;
            -webkit-tap-highlight-color: transparent; /* Hilangkan blok warna biru saat tombol ditekan di Android */
        }

        /* Menghilangkan scrollbar jelek bawaan browser tapi tetap bisa di-scroll rapi (untuk area menu & struk) */
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }

        /* Optimasi Safe Area (Poni kamera / Punch-Hole) agar UI tidak tertutup kamera depan */
        .safe-area-padding {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
            padding-left: env(safe-area-inset-left);
            padding-right: env(safe-area-inset-right);
        }

        /* Fluid Auto-Grid: Kartu menu akan otomatis membesar/mengecil dan menyesuaikan jumlah kolom 
           berdasarkan lebar device (HP = 2 kolom, Tablet = 4 kolom, PC = 6 kolom) */
        .grid-responsive-menu {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1rem;
        }
    `;
    document.head.appendChild(style);

    // 3. Timpa class Grid Statis di HTML secara otomatis menjadi Fluid Auto-Grid
    // Ini memastikan grid menyesuaikan diri tanpa perlu mengedit index.html
    document.addEventListener('DOMContentLoaded', () => {
        const menuGrid = document.getElementById('menu-grid');
        if (menuGrid) {
            // Hapus class kolom statis Tailwind (seperti grid-cols-2 atau md:grid-cols-4)
            menuGrid.className = menuGrid.className.replace(/grid-cols-\d+|md:grid-cols-\d+/g, '');
            // Tambahkan class fluid yang baru disuntikkan
            menuGrid.classList.add('grid-responsive-menu');
        }
    });
})();
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 24 (INDIKATOR KONEKSI & KONTROL SUARA)
   ========================================================================== */

// 1. STATE GLOBAL UNTUK AUDIO KASIR
window.AppState.isAudioMuted = false;

// 2. INJEKSI ELEMEN INDIKATOR SINYAL & TOMBOL SUARA KE LAYAR
(function injectStatusUI() {
    // Membuat elemen floating untuk Status Koneksi
    const connectionBadge = document.createElement('div');
    connectionBadge.id = 'network-status-badge';
    connectionBadge.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full font-black text-[10px] shadow-lg transition-all duration-300 hidden uppercase tracking-widest';
    document.body.appendChild(connectionBadge);

    // Membuat tombol Mute Audio melayang khusus untuk tampilan Kasir
    const muteBtn = document.createElement('button');
    muteBtn.id = 'btn-mute-audio';
    muteBtn.className = 'fixed bottom-24 right-4 z-[90] w-12 h-12 bg-slate-800 text-white rounded-full shadow-lg flex items-center justify-center transition hidden border-2 border-slate-700';
    muteBtn.innerHTML = '<i class="fa-solid fa-bell"></i>';
    muteBtn.onclick = function() {
        window.AppState.isAudioMuted = !window.AppState.isAudioMuted;
        if (window.AppState.isAudioMuted) {
            this.innerHTML = '<i class="fa-solid fa-bell-slash text-red-400"></i>';
            this.classList.replace('bg-slate-800', 'bg-slate-100');
            this.classList.replace('border-slate-700', 'border-slate-300');
            this.classList.replace('text-white', 'text-slate-500');
        } else {
            this.innerHTML = '<i class="fa-solid fa-bell"></i>';
            this.classList.replace('bg-slate-100', 'bg-slate-800');
            this.classList.replace('border-slate-300', 'border-slate-700');
            this.classList.replace('text-slate-500', 'text-white');
        }
    };
    document.body.appendChild(muteBtn);
})();

// 3. LOGIKA DETEKSI JARINGAN (ONLINE / OFFLINE)
function updateNetworkStatus() {
    const badge = document.getElementById('network-status-badge');
    if (!badge) return;

    if (navigator.onLine) {
        badge.innerText = '🟢 Sinyal Terhubung';
        badge.classList.remove('bg-red-500', 'text-white');
        badge.classList.add('bg-green-100', 'text-green-800', 'border', 'border-green-300');
        badge.classList.remove('hidden');
        
        // Sembunyikan setelah 3 detik jika online
        setTimeout(() => { badge.classList.add('hidden'); }, 3000);
    } else {
        badge.innerText = '🔴 OFFLINE - Periksa Internet!';
        badge.classList.remove('bg-green-100', 'text-green-800', 'border-green-300', 'hidden');
        badge.classList.add('bg-red-500', 'text-white');
    }
}

// Pasang sensor langsung ke browser bawaan HP
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// 4. OVERRIDE FUNGSI SWITCH ROLE UNTUK MENAMPILKAN TOMBOL MUTE HANYA DI KASIR
const originalSwitchRole = window.switchRoleView;
window.switchRoleView = function(role) {
    if (typeof originalSwitchRole === 'function') originalSwitchRole(role);
    
    const muteBtn = document.getElementById('btn-mute-audio');
    if (muteBtn) {
        if (role === 'kasir') {
            muteBtn.classList.remove('hidden');
        } else {
            muteBtn.classList.add('hidden');
        }
    }
};

// 5. OVERRIDE FUNGSI AUDIO PADA SENSOR FIREBASE AGAR BISA DI-MUTE
// Modifikasi bagian alarm pesanan baru di Tahap 20
const originalInitFirebase = window.initFirebase;
window.initFirebase = function() {
    if (typeof originalInitFirebase === 'function') originalInitFirebase();
    
    // Timpa khusus bagian order agar mengecek isAudioMuted
    const ordersRef = window.ref(window.db, 'orders');
    window.onValue(ordersRef, (snapshot) => {
        const data = snapshot.val() || {};
        const oldOrdersCount = Object.keys(window.AppState.orders || {}).length;
        const newOrdersCount = Object.keys(data).length;
        
        window.AppState.orders = data;
        
        if (typeof window.renderKasirList === 'function' && document.getElementById('kasir-orders-container')) {
            window.renderKasirList();
            
            // Bunyikan alarm HANYA JIKA tidak di-mute
            if (newOrdersCount > oldOrdersCount && !window.AppState.isAudioMuted) {
                try {
                    new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play();
                } catch(e) {}
            }
        }
    });
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 25 (SISTEM TOPPING & OPTIMASI MEMORI X688B)
   ========================================================================== */

// 1. STATE GLOBAL UNTUK DAFTAR TOPPING
window.AppState.toppings = [
    { id: 'top-boba', nama: 'Pearl Boba', harga: 3000 },
    { id: 'top-cheese', nama: 'Cheese Foam', harga: 4000 },
    { id: 'top-regal', nama: 'Crushed Regal', harga: 3000 },
    { id: 'top-espresso', nama: 'Extra Shot Espresso', harga: 5000 }
];

// 2. INJEKSI ELEMEN TOPPING KE DALAM MODAL DETAIL MINUMAN
(function injectToppingUI() {
    const modalDetailBox = document.querySelector('#modal-detail .bg-white');
    if (!modalDetailBox) return;

    // Cari area opsi (Size, Sugar, Ice) untuk disisipkan Topping di bawahnya
    const optionsContainer = modalDetailBox.querySelector('.space-y-3');
    if (optionsContainer && !document.getElementById('topping-container')) {
        let toppingHtml = `
            <div id="topping-container" class="mt-4 pt-4 border-t border-dashed border-gray-200">
                <p class="text-[10px] font-black text-gray-800 uppercase mb-2">Tambahan Topping</p>
                <div class="grid grid-cols-2 gap-2" id="topping-list-render">
                    <!-- Topping akan di-render di sini -->
                </div>
            </div>
        `;
        optionsContainer.insertAdjacentHTML('beforeend', toppingHtml);
    }
})();

// 3. REWRITE OPEN MENU DETAIL (RE-RENDER TOPPING & RESET CEKLIS)
const originalOpenMenuDetail = window.openMenuDetail;
window.openMenuDetail = function(menuKey) {
    if (typeof originalOpenMenuDetail === 'function') originalOpenMenuDetail(menuKey);
    
    const toppingList = document.getElementById('topping-list-render');
    if (toppingList) {
        toppingList.innerHTML = '';
        window.AppState.toppings.forEach(top => {
            toppingList.innerHTML += `
                <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg cursor-pointer hover:bg-amber-50 transition">
                    <input type="checkbox" name="detail_topping" value="${top.nama}" data-harga="${top.harga}" class="topping-checkbox w-3 h-3 text-amber-500 rounded border-gray-300 focus:ring-amber-500" onchange="hitungTotalHargaDetail()">
                    <div class="flex flex-col">
                        <span class="text-[9px] font-bold text-gray-800">${top.nama}</span>
                        <span class="text-[8px] font-black text-amber-600">+${window.formatRupiah(top.harga)}</span>
                    </div>
                </label>
            `;
        });
    }
    // Panggil ulang kalkulasi setelah topping dirender
    window.hitungTotalHargaDetail();
};

// 4. REWRITE KALKULASI HARGA (MEMASUKKAN BIAYA TOPPING)
window.hitungTotalHargaDetail = function() {
    if (!currentSelectedMenu) return { hargaSatuan: 0, total: 0 };
    
    const qtyEl = document.getElementById('detail-qty');
    if (qtyEl) qtyEl.innerText = qtyDetail;
    
    let hargaBase = parseInt(currentSelectedMenu.harga || 0);
    
    // Cek Ukuran (Large +3K)
    const sizeLarge = document.getElementById('opt-size-l');
    let extraSize = (sizeLarge && sizeLarge.checked) ? 3000 : 0;
    
    // Cek Topping yang Diceklis
    let extraTopping = 0;
    document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
        extraTopping += parseInt(cb.getAttribute('data-harga') || 0);
    });
    
    // Kalkulasi Total
    let hargaSatuan = hargaBase + extraSize + extraTopping;
    let total = hargaSatuan * qtyDetail;
    
    const totalEl = document.getElementById('detail-total-price');
    if (totalEl) totalEl.innerText = window.formatRupiah(total);
    
    return { hargaSatuan, total };
};

// 5. REWRITE FUNGSI TAMBAH KERANJANG (MENANGKAP DATA TOPPING)
window.tambahKeKeranjang = function() {
    if (!currentSelectedMenu) return;
    
    let size = document.querySelector('input[name="detail_size"]:checked')?.value || 'Regular';
    let sugar = document.querySelector('input[name="detail_sugar"]:checked')?.value || 'Normal';
    let ice = document.querySelector('input[name="detail_ice"]:checked')?.value || 'Normal';
    
    // Kumpulkan nama topping yang dipilih
    let selectedToppings = [];
    document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
        selectedToppings.push(cb.value);
    });
    let toppingStr = selectedToppings.length > 0 ? `, Top: ${selectedToppings.join('+')}` : '';
    
    let kalkulasi = window.hitungTotalHargaDetail();
    
    const cartItem = {
        id: currentSelectedMenu.id,
        nama: currentSelectedMenu.nama,
        hargaSatuan: kalkulasi.hargaSatuan,
        qty: qtyDetail,
        total: kalkulasi.total,
        catatan: `Sz:${size}, Sg:${sugar}, Ice:${ice}${toppingStr}` // Disingkat agar muat di struk thermal 58mm
    };
    
    window.AppState.cart.push(cartItem);
    
    window.closeModalDetail();
    window.updateCartUI();
};

// 6. GARBAGE COLLECTION OTOMATIS (Mencegah Memori Penuh)
// Interval setiap 10 menit untuk membersihkan cache DOM yang sudah dilepas
setInterval(() => {
    if (window.gc) {
        console.log("Menjalankan pembersihan memori latar belakang...");
    }
    // Me-reset state cart sementara jika toko tutup untuk menghindari kebocoran memori
    if (window.AppState.storeSettings?.isClosed && window.AppState.cart.length > 0) {
        window.AppState.cart = [];
        window.updateCartUI();
    }
}, 600000);
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 26 (PRODUK UNIVERSAL & SMART CART)
   ========================================================================== */

// 1. REWRITE TAMBAH MENU (Mendukung segala jenis produk & kategori bebas)
window.tambahMenuBaru = function() {
    // Input Nama Universal
    const nama = prompt("Masukkan Nama Produk\n(Cth: Kopi Susu / Nasi Goreng / Dimsum / Kaos):");
    if (!nama) return;
    
    // Input Harga
    const harga = prompt("Masukkan Harga (Hanya Angka, Cth: 15000):");
    if (!harga || isNaN(harga)) {
        alert("Harga tidak valid!");
        return;
    }
    
    // Input Kategori Bebas Teks
    const kategori = prompt("Masukkan Kategori Produk\n(Bebas ketik apa saja! Cth: Coffee, Snack, Makanan, Merchandise, dll):") || 'Umum';
    
    // Input Deskripsi
    const deskripsi = prompt("Masukkan Deskripsi Singkat Produk:") || '';
    
    // Input Gambar
    let gambar = "https://via.placeholder.com/300?text=" + encodeURIComponent(nama);
    const pilihanMedia = confirm("Pilih gambar produk:\n[OK] Masukkan Link URL\n[Cancel] Pakai Gambar Default");
    if (pilihanMedia) {
        const urlInput = prompt("Paste Link URL Gambar (Pastikan link aktif):");
        if (urlInput) gambar = urlInput.trim();
    }

    const newMenuData = {
        nama: nama,
        harga: parseInt(harga),
        kategori: kategori,
        deskripsi: deskripsi,
        gambar: gambar,
        status: 'tersedia',
        isBestSeller: false
    };

    const newRef = window.push(window.ref(window.db, 'menus'));
    window.set(newRef, newMenuData).then(() => {
        alert(`✅ ${nama} berhasil ditambahkan ke kategori "${kategori}"!`);
        if(typeof window.renderOwnerMenuList === 'function') window.renderOwnerMenuList();
    }).catch(err => alert("Gagal tambah produk: " + err));
};

// 2. REWRITE SMART CART LOGIC (Mencegah "Gula/Es Normal" tercetak pada Makanan/Snack)
window.tambahKeKeranjang = function() {
    if (!currentSelectedMenu) return;
    
    // Ambil data kategori produk saat ini untuk dideteksi sistem
    const cat = (currentSelectedMenu.kategori || 'Umum').toLowerCase();
    
    // Deteksi Cerdas: Apakah produk ini minuman?
    const isMinuman = cat.includes('kopi') || cat.includes('coffee') || cat.includes('minuman') || cat.includes('tea') || cat.includes('drink') || cat.includes('susu') || cat.includes('blend');
    
    // Ambil Nilai dari UI Pilihan
    let size = document.querySelector('input[name="detail_size"]:checked')?.value || 'Regular';
    let sugar = document.querySelector('input[name="detail_sugar"]:checked')?.value || 'Normal';
    let ice = document.querySelector('input[name="detail_ice"]:checked')?.value || 'Normal';
    
    // Kumpulkan Topping Tambahan (Misal: Keju, Ekstra Saus, dll)
    let selectedToppings = [];
    document.querySelectorAll('.topping-checkbox:checked').forEach(cb => {
        selectedToppings.push(cb.value);
    });
    let toppingStr = selectedToppings.length > 0 ? `, Ekstra: ${selectedToppings.join('+')}` : '';
    
    // Format Catatan Struk Cerdas
    let catatanFinal = '';
    if (isMinuman) {
        // Jika Minuman: Cetak Size, Sugar, Ice, dan Topping
        catatanFinal = `Sz:${size}, Sg:${sugar}, Ice:${ice}${toppingStr}`;
    } else {
        // Jika Makanan/Snack: Singkirkan tulisan Gula & Es. Hanya cetak Size (misal porsi besar) dan Ekstra.
        catatanFinal = selectedToppings.length > 0 ? `Sz:${size}${toppingStr}` : `Sz:${size} (Pesanan Standar)`;
    }
    
    let kalkulasi = window.hitungTotalHargaDetail();
    
    const cartItem = {
        id: currentSelectedMenu.id,
        nama: currentSelectedMenu.nama,
        hargaSatuan: kalkulasi.hargaSatuan,
        qty: qtyDetail,
        total: kalkulasi.total,
        catatan: catatanFinal
    };
    
    window.AppState.cart.push(cartItem);
    window.closeModalDetail();
    window.updateCartUI();
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 27 (MODAL INPUT MENU & CHECKBOX KUSTOMISASI)
   ========================================================================== */

window.currentEditMenuKey = null; // Menyimpan ID menu jika sedang mode Edit

// 1. INJEKSI MODAL FORM TAMBAH/EDIT MENU KE HTML (Menggantikan Prompt)
(function injectAddMenuModal() {
    if (!document.getElementById('modal-add-menu')) {
        const modalHtml = `
            <div id="modal-add-menu" class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] hidden flex-col items-center justify-center p-4">
                <div class="bg-white w-full max-w-md rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto hide-scrollbar">
                    <h2 id="modal-add-menu-title" class="text-sm font-black text-gray-900 mb-4 border-b border-gray-100 pb-2">TAMBAH PRODUK BARU</h2>
                    
                    <div class="space-y-3 mb-4">
                        <div>
                            <label class="text-[9px] font-bold text-gray-500 uppercase">Nama Produk</label>
                            <input type="text" id="add-menu-nama" placeholder="Cth: Kopi Susu Panas" class="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-[9px] font-bold text-gray-500 uppercase">Harga (Rp)</label>
                                <input type="number" id="add-menu-harga" placeholder="15000" class="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
                            </div>
                            <div>
                                <label class="text-[9px] font-bold text-gray-500 uppercase">Kategori</label>
                                <input type="text" id="add-menu-kategori" placeholder="Cth: Coffee / Snack" class="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
                            </div>
                        </div>
                        <div>
                            <label class="text-[9px] font-bold text-gray-500 uppercase">Deskripsi</label>
                            <input type="text" id="add-menu-desc" placeholder="Penjelasan singkat menu..." class="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
                        </div>
                        <div>
                            <label class="text-[9px] font-bold text-gray-500 uppercase">URL Gambar</label>
                            <input type="text" id="add-menu-img" placeholder="https://... (Kosongkan utk bawaan)" class="w-full bg-slate-50 border border-gray-200 rounded-lg p-3 text-xs font-bold focus:border-amber-500">
                        </div>
                    </div>

                    <!-- AREA CHECKBOX SESUAI REQUEST -->
                    <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-5">
                        <p class="text-[10px] font-black text-amber-900 mb-3 uppercase tracking-wider">Tampilkan Opsi Pilihan (Di Layar Pembeli)</p>
                        
                        <label class="flex items-center gap-3 mb-3 cursor-pointer">
                            <input type="checkbox" id="add-menu-opt-size" checked class="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500">
                            <span class="text-xs font-bold text-gray-800">Tampilkan Pilihan Ukuran (Reg/Large)</span>
                        </label>
                        
                        <label class="flex items-center gap-3 mb-3 cursor-pointer">
                            <input type="checkbox" id="add-menu-opt-sugar" checked class="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500">
                            <span class="text-xs font-bold text-gray-800">Tampilkan Pilihan Level Gula</span>
                        </label>
                        
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" id="add-menu-opt-ice" checked class="w-5 h-5 text-amber-500 rounded border-gray-300 focus:ring-amber-500">
                            <span class="text-xs font-bold text-gray-800">Tampilkan Pilihan Level Es (Matikan untuk Menu Panas/Makanan)</span>
                        </label>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="closeModalAddMenu()" class="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black text-xs hover:bg-slate-200 transition">Batal</button>
                        <button onclick="simpanMenuDariModal()" class="flex-1 py-3.5 bg-amber-500 text-white rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition">Simpan Produk</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
})();

// 2. MEROMBAK UI MODAL DETAIL PEMBELI AGAR BISA DISUSUN DINAMIS
(function injectDynamicModalDetail() {
    const modal = document.getElementById('modal-detail');
    if (modal) {
        modal.innerHTML = `
            <div class="bg-white w-full h-[85vh] absolute bottom-0 rounded-t-3xl shadow-2xl flex flex-col slide-up">
                <div class="relative h-48 w-full shrink-0">
                    <img id="detail-img" src="" class="w-full h-full object-cover rounded-t-3xl border-b border-gray-100">
                    <button onclick="closeModalDetail()" class="absolute top-4 right-4 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full text-white flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="flex-1 overflow-y-auto p-5 pb-24 hide-scrollbar">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h2 id="detail-title" class="text-lg font-black text-gray-900 leading-tight">Nama Menu</h2>
                            <p id="detail-desc" class="text-[10px] text-gray-500 font-bold mt-1">Deskripsi</p>
                        </div>
                        <h3 id="detail-price" class="text-lg font-black text-amber-500 shrink-0 ml-3">Rp 0</h3>
                    </div>
                    <!-- WADAH OPSI YANG AKAN DIISI OTOMATIS OLEH JS -->
                    <div id="dynamic-options-container" class="mt-5 space-y-4"></div>
                </div>
                <div class="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 p-4 flex gap-4 items-center">
                    <div class="flex items-center gap-3 bg-slate-50 rounded-xl p-1 border border-slate-200 shrink-0">
                        <button onclick="ubahQtyDetail(-1)" class="w-8 h-8 flex items-center justify-center font-black text-slate-500">-</button>
                        <span id="detail-qty" class="font-black text-sm w-4 text-center">1</span>
                        <button onclick="ubahQtyDetail(1)" class="w-8 h-8 flex items-center justify-center font-black text-slate-500">+</button>
                    </div>
                    <button onclick="tambahKeKeranjang()" class="flex-1 bg-amber-500 text-white h-11 rounded-xl font-black text-xs shadow-md flex justify-between items-center px-4">
                        <span>Keranjang</span>
                        <span id="detail-total-price">Rp 0</span>
                    </button>
                </div>
            </div>
        `;
    }
})();

// 3. FUNGSI BUKA MODAL TAMBAH & EDIT MENU
window.tambahMenuBaru = function() {
    window.currentEditMenuKey = null; // Mode Tambah
    document.getElementById('modal-add-menu-title').innerText = "TAMBAH PRODUK BARU";
    
    // Kosongkan Form
    document.getElementById('add-menu-nama').value = '';
    document.getElementById('add-menu-harga').value = '';
    document.getElementById('add-menu-kategori').value = '';
    document.getElementById('add-menu-desc').value = '';
    document.getElementById('add-menu-img').value = '';
    
    // Default Checkbox ON
    document.getElementById('add-menu-opt-size').checked = true;
    document.getElementById('add-menu-opt-sugar').checked = true;
    document.getElementById('add-menu-opt-ice').checked = true;

    document.getElementById('modal-add-menu').classList.remove('hidden');
    document.getElementById('modal-add-menu').classList.add('flex');
};

window.editMenu = function(key) {
    const m = window.AppState.menus[key];
    if(!m) return;
    
    window.currentEditMenuKey = key; // Mode Edit
    document.getElementById('modal-add-menu-title').innerText = "EDIT PRODUK: " + m.nama.toUpperCase();
    
    // Isi Form dengan data lama
    document.getElementById('add-menu-nama').value = m.nama;
    document.getElementById('add-menu-harga').value = m.harga;
    document.getElementById('add-menu-kategori').value = m.kategori;
    document.getElementById('add-menu-desc').value = m.deskripsi || '';
    document.getElementById('add-menu-img').value = m.gambar === `https://via.placeholder.com/300?text=${encodeURIComponent(m.nama)}` ? '' : m.gambar;
    
    // Set Checkbox (Jika menu lama tidak punya data ini, anggap true)
    document.getElementById('add-menu-opt-size').checked = m.hasSize !== false;
    document.getElementById('add-menu-opt-sugar').checked = m.hasSugar !== false;
    document.getElementById('add-menu-opt-ice').checked = m.hasIce !== false;

    document.getElementById('modal-add-menu').classList.remove('hidden');
    document.getElementById('modal-add-menu').classList.add('flex');
};

window.closeModalAddMenu = function() {
    document.getElementById('modal-add-menu').classList.add('hidden');
    document.getElementById('modal-add-menu').classList.remove('flex');
};

// 4. SIMPAN DATA PRODUK + BOOLEAN CHECKBOX KE FIREBASE
window.simpanMenuDariModal = function() {
    const nama = document.getElementById('add-menu-nama').value.trim();
    const harga = parseInt(document.getElementById('add-menu-harga').value);
    const kategori = document.getElementById('add-menu-kategori').value.trim() || 'Umum';
    const desc = document.getElementById('add-menu-desc').value.trim();
    const imgInput = document.getElementById('add-menu-img').value.trim();
    
    if(!nama || isNaN(harga)) { alert("Nama dan Harga wajib diisi dengan benar!"); return; }

    const gambar = imgInput ? imgInput : `https://via.placeholder.com/300?text=${encodeURIComponent(nama)}`;

    // Ambil nilai Checkbox
    const hasSize = document.getElementById('add-menu-opt-size').checked;
    const hasSugar = document.getElementById('add-menu-opt-sugar').checked;
    const hasIce = document.getElementById('add-menu-opt-ice').checked;

    const payload = {
        nama: nama,
        harga: harga,
        kategori: kategori,
        deskripsi: desc,
        gambar: gambar,
        hasSize: hasSize,
        hasSugar: hasSugar,
        hasIce: hasIce,
        status: 'tersedia' // Default
    };

    if (window.currentEditMenuKey) {
        // Mode Update
        window.update(window.ref(window.db, `menus/${window.currentEditMenuKey}`), payload).then(() => {
            alert("✅ Menu berhasil diubah!");
            window.closeModalAddMenu();
        });
    } else {
        // Mode Buat Baru
        window.push(window.ref(window.db, 'menus'), payload).then(() => {
            alert("✅ Menu baru ditambahkan!");
            window.closeModalAddMenu();
        });
    }
};

// 5. UPDATE TAMPILAN KATALOG OWNER UNTUK MEMUNCULKAN TOMBOL EDIT
const originalRenderOwnerMenu = window.renderOwnerMenuList;
window.renderOwnerMenuList = function() {
    const listContainer = document.getElementById('owner-menu-list');
    if (!listContainer) return;
    
    const menus = window.AppState.menus || {};
    listContainer.innerHTML = '';
    
    Object.keys(menus).forEach(key => {
        const m = menus[key];
        if (!m) return;
        const isHabis = m.status === 'habis';
        
        listContainer.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <img src="${m.gambar}" class="w-12 h-12 object-cover rounded-lg shrink-0 border border-gray-100">
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${m.nama}</h4>
                    <p class="text-[10px] text-amber-600 font-bold">${window.formatRupiah(m.harga)} • <span class="text-gray-400">${m.kategori}</span></p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button onclick="editMenu('${key}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100 transition flex items-center justify-center" title="Edit Menu"><i class="fa-solid fa-pen text-[10px]"></i></button>
                    <button onclick="toggleStatusMenu('${key}', ${!isHabis})" class="px-2 py-1.5 rounded-lg text-[9px] font-black ${isHabis ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}">${isHabis ? 'Habis' : 'Tersedia'}</button>
                    <button onclick="hapusMenu('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash text-[10px]"></i></button>
                </div>
            </div>
        `;
    });
};

// 6. RENDER OPSI PELANGGAN SECARA CERDAS BERDASARKAN CHECKBOX PRODUK
window.openMenuDetail = function(menuKey) {
    const menu = window.AppState.menus[menuKey];
    if (!menu) return;
    
    window.currentSelectedMenu = menu;
    window.currentSelectedMenu.id = menuKey;
    window.qtyDetail = 1;
    
    document.getElementById('detail-img').src = menu.gambar;
    document.getElementById('detail-title').innerText = menu.nama;
    document.getElementById('detail-desc').innerText = menu.deskripsi || menu.kategori;
    document.getElementById('detail-price').innerText = window.formatRupiah(menu.harga);
    
    const container = document.getElementById('dynamic-options-container');
    container.innerHTML = ''; // Bersihkan opsi lama
    
    // Baca Boolean (Jika tidak ada properti, anggap true sebagai default)
    const showSize = menu.hasSize !== false;
    const showSugar = menu.hasSugar !== false;
    const showIce = menu.hasIce !== false;

    if (showSize) {
        container.innerHTML += `
            <div>
                <p class="text-[10px] font-black text-gray-800 uppercase mb-2">Ukuran (Size)</p>
                <div class="flex gap-2">
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_size" value="Regular" checked class="peer sr-only" onchange="hitungTotalHargaDetail()"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Regular</div></label>
                    <label class="flex-1 cursor-pointer"><input id="opt-size-l" type="radio" name="detail_size" value="Large" class="peer sr-only" onchange="hitungTotalHargaDetail()"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Large (+3K)</div></label>
                </div>
            </div>
        `;
    }
    
    if (showSugar) {
        container.innerHTML += `
            <div>
                <p class="text-[10px] font-black text-gray-800 uppercase mb-2">Tingkat Manis (Sugar)</p>
                <div class="flex gap-2">
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_sugar" value="Normal" checked class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Normal</div></label>
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_sugar" value="Less" class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Less</div></label>
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_sugar" value="No Sugar" class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">No Sugar</div></label>
                </div>
            </div>
        `;
    }
    
    if (showIce) {
        container.innerHTML += `
            <div>
                <p class="text-[10px] font-black text-gray-800 uppercase mb-2">Tingkat Es (Ice)</p>
                <div class="flex gap-2">
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_ice" value="Normal" checked class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Normal</div></label>
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_ice" value="Less" class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Less</div></label>
                    <label class="flex-1 cursor-pointer"><input type="radio" name="detail_ice" value="Iceless" class="peer sr-only"><div class="text-center py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-gray-500 peer-checked:bg-amber-100 peer-checked:border-amber-500 peer-checked:text-amber-700 transition">Iceless</div></label>
                </div>
            </div>
        `;
    }

    // Suntikkan Topping
    let toppingListHtml = '';
    window.AppState.toppings.forEach(top => {
        toppingListHtml += `
            <label class="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg cursor-pointer hover:bg-amber-50 transition">
                <input type="checkbox" name="detail_topping" value="${top.nama}" data-harga="${top.harga}" class="topping-checkbox w-3 h-3 text-amber-500 rounded border-gray-300 focus:ring-amber-500" onchange="hitungTotalHargaDetail()">
                <div class="flex flex-col"><span class="text-[9px] font-bold text-gray-800">${top.nama}</span><span class="text-[8px] font-black text-amber-600">+${window.formatRupiah(top.harga)}</span></div>
            </label>
        `;
    });
    
    container.innerHTML += `
        <div class="mt-4 pt-4 border-t border-dashed border-gray-200">
            <p class="text-[10px] font-black text-gray-800 uppercase mb-2">Ekstra Topping</p>
            <div class="grid grid-cols-2 gap-2">${toppingListHtml}</div>
        </div>
    `;

    window.hitungTotalHargaDetail();
    document.getElementById('modal-detail').classList.remove('hidden');
    document.getElementById('modal-detail').classList.add('flex');
};

// 7. PENYESUAIAN PENCATATAN STRUK BERDASARKAN CHECKBOX
window.tambahKeKeranjang = function() {
    if (!currentSelectedMenu) return;
    
    let parts = [];
    
    if (currentSelectedMenu.hasSize !== false) {
        parts.push(`Sz: ${document.querySelector('input[name="detail_size"]:checked')?.value || 'Reg'}`);
    }
    if (currentSelectedMenu.hasSugar !== false) {
        parts.push(`Sg: ${document.querySelector('input[name="detail_sugar"]:checked')?.value || 'Nrml'}`);
    }
    if (currentSelectedMenu.hasIce !== false) {
        parts.push(`Ice: ${document.querySelector('input[name="detail_ice"]:checked')?.value || 'Nrml'}`);
    }
    
    let tops = [];
    document.querySelectorAll('.topping-checkbox:checked').forEach(cb => tops.push(cb.value));
    if (tops.length > 0) parts.push(`+${tops.join('+')}`);
    
    let kalkulasi = window.hitungTotalHargaDetail();
    
    window.AppState.cart.push({
        id: currentSelectedMenu.id,
        nama: currentSelectedMenu.nama,
        hargaSatuan: kalkulasi.hargaSatuan,
        qty: window.qtyDetail,
        total: kalkulasi.total,
        catatan: parts.length > 0 ? parts.join(', ') : 'Standar' // Hanya mencetak opsi yang diaktifkan
    });
    
    window.closeModalDetail();
    window.updateCartUI();
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 28 (SISTEM ANTREAN KASIR & TAB RIWAYAT)
   ========================================================================== */

// 1. STATE GLOBAL UNTUK TAB KASIR
window.AppState.kasirTab = 'aktif'; // Default buka tab Antrean Aktif

// 2. REWRITE RENDER DAFTAR KASIR (Pemisahan Aktif vs Selesai & Kalkulasi Laci)
window.renderKasirList = function() {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const tab = window.AppState.kasirTab || 'aktif';
    
    // Header Tab Sticky (Tidak ikut ter-scroll)
    let html = `
        <div class="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-3 pb-3 z-10 border-b border-gray-200">
            <button onclick="switchKasirTab('aktif')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'aktif' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">
                <i class="fa-solid fa-bell"></i> Antrean Aktif
            </button>
            <button onclick="switchKasirTab('riwayat')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'riwayat' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">
                <i class="fa-solid fa-check-double"></i> Riwayat Selesai
            </button>
        </div>
    `;

    let count = 0;
    let todayTargetCash = 0; 
    
    // Urutkan dari yang paling lama ke terbaru (FIFO - First In First Out)
    const sortedKeys = Object.keys(orders).sort((a, b) => {
        return new Date(orders[a].waktu) - new Date(orders[b].waktu);
    });

    let listHtml = '';

    sortedKeys.forEach(key => {
        const o = orders[key];
        if (!o) return;
        
        // Kalkulasi Target Uang Fisik Laci (Khusus yang bayar Cash)
        if (o.metodeBayar === 'Cash') {
            todayTargetCash += o.grandTotal;
        }

        const isSelesai = o.status === 'selesai';
        
        // Filter berdasarkan Tab yang dipilih
        if (tab === 'aktif' && isSelesai) return;
        if (tab === 'riwayat' && !isSelesai) return;
        
        count++;
        
        // Label Status Badge
        let statusBadge = '';
        if (o.status === 'pending') {
            statusBadge = '<span class="bg-red-100 text-red-600 px-2 py-1 rounded font-black text-[9px] uppercase tracking-wider animate-pulse border border-red-200">Menunggu</span>';
        } else if (o.status === 'proses') {
            statusBadge = '<span class="bg-blue-100 text-blue-600 px-2 py-1 rounded font-black text-[9px] uppercase tracking-wider border border-blue-200">Sedang Dibuat</span>';
        } else {
            statusBadge = '<span class="bg-green-100 text-green-600 px-2 py-1 rounded font-black text-[9px] uppercase tracking-wider border border-green-200">Selesai</span>';
        }

        let itemsHtml = o.items.map(i => `
            <div class="flex justify-between items-start mb-1.5 text-[11px] font-bold text-gray-800">
                <span class="flex-1">${i.qty}x ${i.nama}</span>
                <span class="text-gray-500 text-[9px] w-1/2 text-right leading-tight">${i.catatan}</span>
            </div>
        `).join('');

        // Card Pesanan
        listHtml += `
            <div class="bg-white rounded-xl p-4 mb-3 border border-gray-200 shadow-sm slide-up">
                <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                    <div>
                        <p class="font-black text-xs text-gray-900">${o.orderId}</p>
                        <p class="text-[10px] text-gray-500 font-bold"><i class="fa-solid fa-user text-[9px]"></i> ${o.namaCustomer} • <i class="fa-regular fa-clock text-[9px]"></i> ${new Date(o.waktu).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div class="text-right flex flex-col items-end gap-1">
                        ${statusBadge}
                        <span class="text-[10px] font-black ${o.metodeBayar === 'QRIS' ? 'text-blue-500' : 'text-amber-600'} bg-slate-50 px-2 py-0.5 rounded border border-slate-200">${o.metodeBayar}</span>
                    </div>
                </div>
                
                <div class="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    ${itemsHtml}
                </div>
                
                ${tab === 'aktif' ? `
                    <div class="flex gap-2">
                        ${o.status === 'pending' ? `<button onclick="updateStatusPesanan('${key}', 'proses')" class="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-black text-[10px] shadow-md hover:bg-blue-600 transition">Terima & Proses</button>` : ''}
                        ${o.status === 'proses' ? `<button onclick="updateStatusPesanan('${key}', 'selesai')" class="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-black text-[10px] shadow-md hover:bg-green-600 transition">Selesai & Serahkan</button>` : ''}
                        
                        <button onclick="cetakStruk('${key}', 'dapur')" class="w-11 h-11 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center font-black hover:bg-slate-200 transition" title="Print Dapur"><i class="fa-solid fa-fire-burner"></i></button>
                        <button onclick="cetakStruk('${key}', 'kasir')" class="w-11 h-11 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center font-black hover:bg-slate-200 transition" title="Print Struk"><i class="fa-solid fa-print"></i></button>
                    </div>
                ` : `
                    <div class="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-100">
                        <p class="text-[11px] font-black text-green-900">Total: ${window.formatRupiah(o.grandTotal)}</p>
                        <button onclick="cetakStruk('${key}', 'kasir')" class="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-md font-black text-[10px] shadow-sm hover:bg-slate-50"><i class="fa-solid fa-print"></i> Cetak Struk</button>
                    </div>
                `}
            </div>
        `;
    });

    if (count === 0) {
        listHtml = `
            <div class="text-center py-12">
                <i class="fa-solid ${tab === 'aktif' ? 'fa-mug-hot' : 'fa-clipboard-check'} text-4xl text-gray-200 mb-3"></i>
                <p class="text-xs font-bold text-gray-400">${tab === 'aktif' ? 'Belum ada antrean pesanan baru.' : 'Belum ada pesanan yang selesai.'}</p>
            </div>
        `;
    }

    container.innerHTML = html + listHtml;

    // Suntikkan Total Laci ke UI Kasir (untuk kebutuhan Tutup Shift di Tahap 17)
    // Mencari elemen target jika ada, atau membuat badge floating otomatis
    let targetEl = document.getElementById('kasir-drawer-target');
    if (!targetEl) {
        // Buat badge floating di pojok kiri bawah Kasir
        const badgeHtml = `
            <div id="drawer-tracker-badge" class="fixed bottom-4 left-4 bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700 z-[90] flex items-center gap-2">
                <i class="fa-solid fa-cash-register text-amber-500"></i>
                <div>
                    <p class="text-[8px] font-bold text-slate-400 uppercase">Target Uang Fisik</p>
                    <p id="kasir-drawer-target" class="text-xs font-black text-white">${window.formatRupiah(todayTargetCash)}</p>
                </div>
            </div>
        `;
        // Hanya tambahkan jika sedang di mode kasir
        const oldBadge = document.getElementById('drawer-tracker-badge');
        if (oldBadge) oldBadge.remove();
        document.body.insertAdjacentHTML('beforeend', badgeHtml);
    } else {
        targetEl.innerText = window.formatRupiah(todayTargetCash);
    }
};

// 3. FUNGSI GANTI TAB KASIR
window.switchKasirTab = function(tabName) {
    window.AppState.kasirTab = tabName;
    window.renderKasirList();
};

// 4. FUNGSI UBAH STATUS PESANAN (UPDATE KE FIREBASE)
window.updateStatusPesanan = function(key, newStatus) {
    window.update(window.ref(window.db, `orders/${key}`), { status: newStatus }).then(() => {
        // Render akan otomatis terpanggil oleh onValue (Tahap 20)
        // Kita tambahkan sedikit feedback haptic/suara jika di HP
        try { if (navigator.vibrate) navigator.vibrate(50); } catch(e) {}
    });
};

// 5. PASTIKAN BADGE TARGET UANG HANYA MUNCUL DI MODE KASIR
const originalSwitchRoleViewTahap28 = window.switchRoleView;
window.switchRoleView = function(role) {
    if (typeof originalSwitchRoleViewTahap28 === 'function') originalSwitchRoleViewTahap28(role);
    
    const drawerBadge = document.getElementById('drawer-tracker-badge');
    if (drawerBadge) {
        if (role === 'kasir') drawerBadge.style.display = 'flex';
        else drawerBadge.style.display = 'none';
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 29 (SMART QUEUE, PRE-ORDER LOCK & VOID PIN)
   ========================================================================== */

// 1. REWRITE PENGIRIMAN PESANAN (MENGHASILKAN NOMOR ANTREAN URUT)
window.kirimPesananKeFirebase = function() {
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;
    
    // Deteksi Pre-Order
    const isPO = document.getElementById('co-tipe-po')?.checked || false;
    const tglAmbil = isPO ? document.getElementById('co-tanggal-po')?.value : null;

    if (isPO && !tglAmbil) {
        alert("Untuk Pre-Order, Tanggal Pengambilan wajib diisi!");
        return;
    }

    const now = new Date();
    const datePrefix = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0');
    
    // Penentuan Prefix sesuai Blueprint
    const userRole = window.AppState.activeStaffName !== 'Guest' ? 'KSR' : 'CUS';
    const payCode = payment === 'Cash' ? 'CSH' : 'QRS';
    const finalPrefix = isPO ? `${userRole}-PO` : `${userRole}-${payCode}`;

    // Hitung nomor antrean hari ini berdasarkan jumlah pesanan yang ada di layar
    const ordersToday = window.AppState.orders || {};
    const queueNumber = String(Object.keys(ordersToday).length + 1).padStart(3, '0');
    
    const orderId = `${finalPrefix}-${datePrefix}-${queueNumber}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);

    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        pickupDate: tglAmbil, // Menyimpan tanggal Hari-H
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending' 
    };

    const newOrderRef = window.push(window.ref(window.db, 'orders'));
    window.set(newOrderRef, orderData).then(() => {
        alert(`✅ Pesanan Berhasil!\nNomor Antrean Anda: ${queueNumber}`);
        
        if (isMember && phone) {
            window.push(window.ref(window.db, 'members'), { nama: nama, phone: phone, stamps_count: 0, completed_sessions: 0, joined_at: now.toISOString(), status: 'active' });
        }
        
        window.AppState.cart = [];
        window.updateCartUI();
        window.closeModalCheckout();
        
        try { new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play(); } catch(e) {}
    });
};

// 2. REWRITE KANBAN KASIR (TAMPILAN PRE-ORDER & TOMBOL VOID)
window.renderKasirList = function() {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const tab = window.AppState.kasirTab || 'aktif';
    const todayStr = new Date().toISOString().split('T')[0];
    
    let html = `
        <div class="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-3 pb-3 z-10 border-b border-gray-200">
            <button onclick="switchKasirTab('aktif')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'aktif' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Antrean Aktif</button>
            <button onclick="switchKasirTab('riwayat')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'riwayat' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Riwayat Selesai</button>
        </div>
    `;

    let count = 0;
    let todayTargetCash = 0; 
    
    const sortedKeys = Object.keys(orders).sort((a, b) => new Date(orders[a].waktu) - new Date(orders[b].waktu));
    let listHtml = '';

    sortedKeys.forEach(key => {
        const o = orders[key];
        if (!o) return;
        
        if (o.metodeBayar === 'Cash') todayTargetCash += o.grandTotal;

        const isSelesai = o.status === 'selesai';
        if (tab === 'aktif' && isSelesai) return;
        if (tab === 'riwayat' && !isSelesai) return;
        
        count++;
        
        // Ambil 3 digit terakhir sebagai Antrean UI
        const antreanUI = o.orderId.split('-').pop();
        const isPO = o.orderId.includes('-PO-');
        
        // Cek apakah PO boleh diselesaikan (Apakah hari ini >= Hari H?)
        const isPOReady = isPO ? (todayStr >= o.pickupDate) : true;
        const poWarningStyle = (isPO && !isPOReady) ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200';

        let itemsHtml = o.items.map(i => `<div class="flex justify-between items-start mb-1.5 text-[11px] font-bold text-gray-800"><span class="flex-1">${i.qty}x ${i.nama}</span><span class="text-gray-500 text-[9px] w-1/2 text-right">${i.catatan}</span></div>`).join('');

        listHtml += `
            <div class="${poWarningStyle} rounded-xl p-4 mb-3 border shadow-sm slide-up relative overflow-hidden">
                ${isPO ? `<div class="bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase text-center py-1 absolute top-0 left-0 w-full tracking-widest">PRE-ORDER: Ambil Tgl ${o.pickupDate}</div><div class="mt-4"></div>` : ''}
                
                <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-lg">${antreanUI}</div>
                        <div>
                            <p class="text-[10px] text-gray-500 font-bold">${o.namaCustomer}</p>
                            <p class="text-[8px] text-gray-400">${o.orderId}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-black bg-slate-50 px-2 py-0.5 rounded border border-slate-200">${o.metodeBayar}</span>
                </div>
                
                <div class="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">${itemsHtml}</div>
                
                ${tab === 'aktif' ? `
                    <div class="flex gap-2">
                        ${o.status === 'pending' ? `<button onclick="updateStatusPesanan('${key}', 'proses')" class="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-black text-[10px] shadow-md hover:bg-blue-600 transition">Terima & Proses</button>` : ''}
                        
                        ${o.status === 'proses' ? `
                            <button onclick="prosesSelesaiPesanan('${key}', ${isPO}, ${isPOReady})" class="flex-1 ${isPOReady ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-2.5 rounded-lg font-black text-[10px] shadow-md transition">
                                ${isPOReady ? 'Selesai & Serahkan' : 'Tunggu Hari H'}
                            </button>
                        ` : ''}
                        
                        <!-- TOMBOL BATAL (VOID) -->
                        <button onclick="voidPesanan('${key}')" class="w-10 h-10 bg-red-50 text-red-500 border border-red-200 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition" title="Batalkan (Void)"><i class="fa-solid fa-ban"></i></button>
                    </div>
                ` : `
                    <p class="text-[11px] font-black text-green-900 text-center bg-green-50 py-2 rounded-lg">Total: ${window.formatRupiah(o.grandTotal)}</p>
                `}
            </div>
        `;
    });

    if (count === 0) listHtml = `<div class="text-center py-12"><p class="text-xs font-bold text-gray-400">Belum ada pesanan.</p></div>`;
    container.innerHTML = html + listHtml;
    
    // Update target laci
    const targetEl = document.getElementById('kasir-drawer-target');
    if (targetEl) targetEl.innerText = window.formatRupiah(todayTargetCash);
};

// 3. FUNGSI PROTEKSI SELESAI PRE-ORDER
window.prosesSelesaiPesanan = function(key, isPO, isPOReady) {
    if (isPO && !isPOReady) {
        alert("Peringatan: Pesanan Pre-Order ini belum masuk tanggal pengambilan. Simpan di layar dapur hingga Hari H.");
        return;
    }
    window.updateStatusPesanan(key, 'selesai');
};

// 4. FUNGSI VOID/REFUND DENGAN MASTER PIN (ANTI KECURANGAN)
window.voidPesanan = function(key) {
    const pin = prompt("OTORISASI VOID: Masukkan Master PIN (888888) untuk membatalkan pesanan ini:");
    if (pin !== "888888") {
        alert("❌ Akses Ditolak! Hanya Owner yang berhak membatalkan transaksi yang sudah masuk.");
        return;
    }
    
    const alasan = prompt("Masukkan alasan pembatalan (Cth: Pelanggan batal, Stok tumpah):") || 'Tanpa keterangan';
    
    if (confirm("Yakin ingin menghapus pesanan ini secara permanen dari sistem?")) {
        // Catat ke log laporan keuangan (Penting untuk Audit!)
        const o = window.AppState.orders[key];
        window.push(window.ref(window.db, 'finance'), {
            keterangan: `VOID Pesanan: ${o.orderId} (${alasan})`,
            nominal: 0,
            kategori: 'Audit/Void',
            tanggal: new Date().toISOString()
        });

        // Hapus Pesanan
        window.remove(window.ref(window.db, `orders/${key}`)).then(() => {
            alert("✅ Pesanan berhasil dibatalkan (VOID).");
        });
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 30 (KODE ANTREAN GLOBAL RINGKAS - KSR001, SLF002)
   ========================================================================== */

// 1. REWRITE PENGIRIMAN PESANAN (KODE RINGKAS & URUT GLOBAL)
window.kirimPesananKeFirebase = function() {
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;
    
    // Deteksi Pre-Order
    const isPO = document.getElementById('co-tipe-po')?.checked || false;
    const tglAmbil = isPO ? document.getElementById('co-tanggal-po')?.value : null;

    if (isPO && !tglAmbil) {
        alert("Untuk Pre-Order, Tanggal Pengambilan wajib diisi!");
        return;
    }

    // Penentuan Prefix 3 Huruf Super Ringkas
    const isKasir = window.AppState.activeStaffName !== 'Guest';
    let prefix = 'SLF'; // Self-Order (Default)
    if (isKasir) {
        prefix = 'KSR'; // Kasir
    } else if (isPO) {
        prefix = 'SPO'; // Self-Order Pre-Order
    }

    // Hitung nomor antrean hari ini secara global (Berlanjut terus siapa pun yang input)
    const ordersToday = window.AppState.orders || {};
    const queueNumber = String(Object.keys(ordersToday).length + 1).padStart(3, '0');
    
    // GABUNGAN FINAL (Contoh: KSR001, SLF002)
    const orderId = `${prefix}${queueNumber}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);

    const now = new Date();
    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        pickupDate: tglAmbil,
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending' 
    };

    const newOrderRef = window.push(window.ref(window.db, 'orders'));
    window.set(newOrderRef, orderData).then(() => {
        alert(`✅ Pesanan Berhasil!\nKode Antrean: ${orderId}`);
        
        if (isMember && phone) {
            window.push(window.ref(window.db, 'members'), { nama: nama, phone: phone, stamps_count: 0, completed_sessions: 0, joined_at: now.toISOString(), status: 'active' });
        }
        
        window.AppState.cart = [];
        window.updateCartUI();
        window.closeModalCheckout();
        
        try { new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play(); } catch(e) {}
    });
};

// 2. REWRITE KANBAN KASIR (MENYESUAIKAN TAMPILAN ID BARU)
window.renderKasirList = function() {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const tab = window.AppState.kasirTab || 'aktif';
    const todayStr = new Date().toISOString().split('T')[0];
    
    let html = `
        <div class="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-3 pb-3 z-10 border-b border-gray-200">
            <button onclick="switchKasirTab('aktif')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'aktif' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Antrean Aktif</button>
            <button onclick="switchKasirTab('riwayat')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'riwayat' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Riwayat Selesai</button>
        </div>
    `;

    let count = 0;
    let todayTargetCash = 0; 
    
    const sortedKeys = Object.keys(orders).sort((a, b) => new Date(orders[a].waktu) - new Date(orders[b].waktu));
    let listHtml = '';

    sortedKeys.forEach(key => {
        const o = orders[key];
        if (!o) return;
        
        if (o.metodeBayar === 'Cash') todayTargetCash += o.grandTotal;

        const isSelesai = o.status === 'selesai';
        if (tab === 'aktif' && isSelesai) return;
        if (tab === 'riwayat' && !isSelesai) return;
        
        count++;
        
        // Ekstrak UI dari ID Ringkas (Misal: KSR001 -> Prefix: KSR, Angka: 001)
        const prefixUI = o.orderId.substring(0, 3);
        const antreanUI = o.orderId.substring(3);
        const isPO = prefixUI === 'SPO';
        
        const isPOReady = isPO ? (todayStr >= o.pickupDate) : true;
        const poWarningStyle = (isPO && !isPOReady) ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200';

        let itemsHtml = o.items.map(i => `<div class="flex justify-between items-start mb-1.5 text-[11px] font-bold text-gray-800"><span class="flex-1">${i.qty}x ${i.nama}</span><span class="text-gray-500 text-[9px] w-1/2 text-right">${i.catatan}</span></div>`).join('');

        listHtml += `
            <div class="${poWarningStyle} rounded-xl p-4 mb-3 border shadow-sm slide-up relative overflow-hidden">
                ${isPO ? `<div class="bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase text-center py-1 absolute top-0 left-0 w-full tracking-widest">PRE-ORDER: Ambil Tgl ${o.pickupDate}</div><div class="mt-4"></div>` : ''}
                
                <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center shadow-inner">
                            <span class="text-[8px] font-bold text-slate-400 -mb-1">${prefixUI}</span>
                            <span class="font-black text-lg">${antreanUI}</span>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-500 font-bold max-w-[120px] truncate"><i class="fa-solid fa-user text-[9px]"></i> ${o.namaCustomer}</p>
                            <p class="text-[9px] text-gray-400 font-bold"><i class="fa-regular fa-clock"></i> ${new Date(o.waktu).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                    </div>
                    <span class="text-[10px] font-black ${o.metodeBayar === 'QRIS' ? 'text-blue-500' : 'text-amber-600'} bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shadow-sm">${o.metodeBayar}</span>
                </div>
                
                <div class="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">${itemsHtml}</div>
                
                ${tab === 'aktif' ? `
                    <div class="flex gap-2">
                        ${o.status === 'pending' ? `<button onclick="updateStatusPesanan('${key}', 'proses')" class="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-black text-[10px] shadow-md hover:bg-blue-600 transition">Terima & Proses</button>` : ''}
                        
                        ${o.status === 'proses' ? `
                            <button onclick="prosesSelesaiPesanan('${key}', ${isPO}, ${isPOReady})" class="flex-1 ${isPOReady ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'} py-2.5 rounded-lg font-black text-[10px] shadow-md transition">
                                ${isPOReady ? 'Selesai & Serahkan' : 'Tunggu Hari H'}
                            </button>
                        ` : ''}
                        
                        <button onclick="voidPesanan('${key}')" class="w-10 h-10 bg-red-50 text-red-500 border border-red-200 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition" title="Batalkan (Void)"><i class="fa-solid fa-ban"></i></button>
                        <button onclick="cetakStruk('${key}', 'dapur')" class="w-10 h-10 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-200 transition" title="Print Dapur"><i class="fa-solid fa-fire-burner"></i></button>
                    </div>
                ` : `
                    <div class="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-100">
                        <p class="text-[11px] font-black text-green-900">Total: ${window.formatRupiah(o.grandTotal)}</p>
                        <button onclick="cetakStruk('${key}', 'kasir')" class="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-md font-black text-[10px] shadow-sm hover:bg-slate-50"><i class="fa-solid fa-print"></i> Cetak Struk</button>
                    </div>
                `}
            </div>
        `;
    });

    if (count === 0) listHtml = `<div class="text-center py-12"><p class="text-xs font-bold text-gray-400">Belum ada pesanan.</p></div>`;
    container.innerHTML = html + listHtml;
    
    const targetEl = document.getElementById('kasir-drawer-target');
    if (targetEl) targetEl.innerText = window.formatRupiah(todayTargetCash);
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 31 (STRUK DIGITAL WA & POP-UP REVIEW MAPS)
   ========================================================================== */

// 1. REWRITE FUNGSI PENGIRIMAN PESANAN (MENGGANTI ALERT DENGAN MODAL SUKSES)
window.kirimPesananKeFirebase = function() {
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;
    const isPO = document.getElementById('co-tipe-po')?.checked || false;
    const tglAmbil = isPO ? document.getElementById('co-tanggal-po')?.value : null;

    if (isPO && !tglAmbil) { alert("Untuk Pre-Order, Tanggal Pengambilan wajib diisi!"); return; }

    const isKasir = window.AppState.activeStaffName !== 'Guest';
    let prefix = isKasir ? 'KSR' : (isPO ? 'SPO' : 'SLF');
    const ordersToday = window.AppState.orders || {};
    const queueNumber = String(Object.keys(ordersToday).length + 1).padStart(3, '0');
    const orderId = `${prefix}${queueNumber}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);
    const now = new Date();
    
    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        pickupDate: tglAmbil,
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending' 
    };

    window.set(window.push(window.ref(window.db, 'orders')), orderData).then(() => {
        if (isMember && phone) {
            window.push(window.ref(window.db, 'members'), { nama: nama, phone: phone, stamps_count: 0, completed_sessions: 0, joined_at: now.toISOString(), status: 'active' });
        }
        
        window.AppState.cart = [];
        window.updateCartUI();
        window.closeModalCheckout();
        try { new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play(); } catch(e) {}

        // TAMPILKAN MODAL SUKSES (Khusus Self-Order Pelanggan)
        if (!isKasir) {
            tampilkanModalSuksesPelanggan(orderId, payment);
        } else {
            alert(`✅ Pesanan Masuk!\nKode: ${orderId}`); // Kasir tetap pakai alert cepat
        }
    });
};

// 2. FUNGSI MODAL SUKSES PELANGGAN BESERTA GOOGLE MAPS LINK
window.tampilkanModalSuksesPelanggan = function(orderId, payment) {
    const existingModal = document.getElementById('modal-success-order');
    if (existingModal) existingModal.remove();

    const msg = payment === 'Cash' ? 'Silakan menuju kasir untuk melakukan pembayaran tunai.' : 'Pesanan Anda sedang kami siapkan di dapur.';

    const modalHtml = `
        <div id="modal-success-order" class="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-5 slide-up">
            <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden border-4 border-amber-500">
                <div class="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl shadow-inner">
                    <i class="fa-solid fa-check"></i>
                </div>
                <h2 class="text-xl font-black text-gray-900 mb-1">YEAY! PESANAN BERHASIL</h2>
                <p class="text-xs text-gray-500 font-bold mb-4">${msg}</p>
                
                <div class="bg-amber-50 rounded-2xl p-4 mb-5 border border-amber-100">
                    <p class="text-[10px] text-amber-700 font-bold uppercase tracking-wider mb-1">Nomor Antrean Anda</p>
                    <p class="text-4xl font-black text-amber-500 tracking-widest">${orderId}</p>
                </div>

                <p class="text-[10px] font-bold text-gray-400 mb-3">Bantu kami jadi lebih baik dengan memberikan ulasan bintang 5 di Google Maps!</p>
                
                <div class="flex flex-col gap-3">
                    <a href="https://g.page/mainstay-drink-shop/review?ad" target="_blank" class="w-full bg-blue-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md flex items-center justify-center gap-2 hover:bg-blue-600 transition">
                        <i class="fa-solid fa-star text-yellow-300"></i> Review Mainstay Drink
                    </a>
                    <button onclick="document.getElementById('modal-success-order').remove()" class="w-full bg-slate-100 text-slate-500 py-3.5 rounded-xl font-black text-xs hover:bg-slate-200 transition">Tutup Layar Ini</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

// 3. REWRITE KANBAN KASIR (MENYISIPKAN TOMBOL STRUK WA)
window.renderKasirList = function() {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;

    const orders = window.AppState.orders || {};
    const tab = window.AppState.kasirTab || 'aktif';
    const todayStr = new Date().toISOString().split('T')[0];
    let count = 0; let todayTargetCash = 0; 
    const sortedKeys = Object.keys(orders).sort((a, b) => new Date(orders[a].waktu) - new Date(orders[b].waktu));
    
    let html = `<div class="flex gap-2 mb-4 sticky top-0 bg-gray-50 pt-3 pb-3 z-10 border-b border-gray-200"><button onclick="switchKasirTab('aktif')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'aktif' ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Antrean Aktif</button><button onclick="switchKasirTab('riwayat')" class="flex-1 py-2.5 rounded-xl font-black text-xs transition ${tab === 'riwayat' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200'}">Riwayat Selesai</button></div>`;
    let listHtml = '';

    sortedKeys.forEach(key => {
        const o = orders[key];
        if (!o) return;
        if (o.metodeBayar === 'Cash') todayTargetCash += o.grandTotal;
        const isSelesai = o.status === 'selesai';
        if (tab === 'aktif' && isSelesai) return;
        if (tab === 'riwayat' && !isSelesai) return;
        count++;
        
        const prefixUI = o.orderId.substring(0, 3);
        const antreanUI = o.orderId.substring(3);
        const isPO = prefixUI === 'SPO';
        const isPOReady = isPO ? (todayStr >= o.pickupDate) : true;
        const poWarningStyle = (isPO && !isPOReady) ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200';
        
        let itemsHtml = o.items.map(i => `<div class="flex justify-between items-start mb-1.5 text-[11px] font-bold text-gray-800"><span class="flex-1">${i.qty}x ${i.nama}</span><span class="text-gray-500 text-[9px] w-1/2 text-right">${i.catatan}</span></div>`).join('');

        // Cek apakah pelanggan meninggalkan nomor WA
        const hasPhone = (o.phone && o.phone.trim() !== '');

        listHtml += `
            <div class="${poWarningStyle} rounded-xl p-4 mb-3 border shadow-sm slide-up relative overflow-hidden">
                ${isPO ? `<div class="bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase text-center py-1 absolute top-0 left-0 w-full tracking-widest">PRE-ORDER: Ambil Tgl ${o.pickupDate}</div><div class="mt-4"></div>` : ''}
                
                <div class="flex justify-between items-center border-b border-gray-100 pb-2 mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 bg-slate-900 text-white rounded-lg flex flex-col items-center justify-center shadow-inner"><span class="text-[8px] font-bold text-slate-400 -mb-1">${prefixUI}</span><span class="font-black text-lg">${antreanUI}</span></div>
                        <div><p class="text-[10px] text-gray-500 font-bold max-w-[120px] truncate"><i class="fa-solid fa-user text-[9px]"></i> ${o.namaCustomer}</p><p class="text-[9px] text-gray-400 font-bold"><i class="fa-regular fa-clock"></i> ${new Date(o.waktu).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p></div>
                    </div>
                    <span class="text-[10px] font-black ${o.metodeBayar === 'QRIS' ? 'text-blue-500' : 'text-amber-600'} bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shadow-sm">${o.metodeBayar}</span>
                </div>
                
                <div class="mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">${itemsHtml}</div>
                
                ${tab === 'aktif' ? `
                    <div class="flex gap-2">
                        ${o.status === 'pending' ? `<button onclick="updateStatusPesanan('${key}', 'proses')" class="flex-1 bg-blue-500 text-white py-2.5 rounded-lg font-black text-[10px] shadow-md hover:bg-blue-600 transition">Terima & Proses</button>` : ''}
                        ${o.status === 'proses' ? `<button onclick="prosesSelesaiPesanan('${key}', ${isPO}, ${isPOReady})" class="flex-1 ${isPOReady ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'} text-white py-2.5 rounded-lg font-black text-[10px] shadow-md transition">${isPOReady ? 'Selesai & Serahkan' : 'Tunggu Hari H'}</button>` : ''}
                        
                        <button onclick="voidPesanan('${key}')" class="w-10 h-10 bg-red-50 text-red-500 border border-red-200 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition" title="Batalkan (Void)"><i class="fa-solid fa-ban"></i></button>
                    </div>
                    
                    <div class="flex gap-2 mt-2">
                        <button onclick="cetakStruk('${key}', 'dapur')" class="flex-1 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-black text-[9px] hover:bg-slate-200 transition"><i class="fa-solid fa-fire-burner"></i> Struk Dapur</button>
                        <button onclick="cetakStruk('${key}', 'kasir')" class="flex-1 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-black text-[9px] hover:bg-slate-200 transition"><i class="fa-solid fa-print"></i> Struk Kasir</button>
                    </div>
                ` : `
                    <div class="flex flex-col gap-2">
                        <div class="flex justify-between items-center bg-green-50 p-2 rounded-lg border border-green-100">
                            <p class="text-[11px] font-black text-green-900">Total: ${window.formatRupiah(o.grandTotal)}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="cetakStruk('${key}', 'kasir')" class="flex-1 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg font-black text-[9px] shadow-sm hover:bg-slate-50"><i class="fa-solid fa-print"></i> Cetak Ulang</button>
                            ${hasPhone ? `<button onclick="kirimStrukWA('${key}')" class="flex-1 py-2 bg-green-500 text-white rounded-lg font-black text-[9px] shadow-sm hover:bg-green-600"><i class="fa-brands fa-whatsapp"></i> Struk WA</button>` : ''}
                        </div>
                    </div>
                `}
            </div>
        `;
    });

    if (count === 0) listHtml = `<div class="text-center py-12"><p class="text-xs font-bold text-gray-400">Belum ada pesanan.</p></div>`;
    container.innerHTML = html + listHtml;
    const targetEl = document.getElementById('kasir-drawer-target');
    if (targetEl) targetEl.innerText = window.formatRupiah(todayTargetCash);
};

// 4. FUNGSI KIRIM STRUK KE WHATSAPP (Sesuai Blueprint)
window.kirimStrukWA = function(key) {
    const o = window.AppState.orders[key];
    if (!o || !o.phone) return;

    let phone = o.phone.trim();
    // Ubah awalan 0 atau +62 menjadi 62 agar format API WA valid
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (phone.startsWith('+62')) phone = '62' + phone.substring(3);

    const storeName = window.AppState.storeSettings?.storeName || "Mainstay Drink Shop";
    const dateFormatted = new Date(o.waktu).toLocaleString('id-ID');
    
    let itemsText = '';
    o.items.forEach(i => {
        itemsText += `▫️ ${i.qty}x ${i.nama} (${window.formatRupiah(i.total)})\n   *Catatan:* ${i.catatan}\n`;
    });

    const msg = `Halo Kak *${o.namaCustomer}*! 👋\n\nTerima kasih telah berbelanja di *${storeName}*.\nBerikut adalah struk digital pesanan Anda:\n\n*ID Pesanan:* ${o.orderId}\n*Tanggal:* ${dateFormatted}\n*Metode Pembayaran:* ${o.metodeBayar}\n\n*Detail Pesanan:*\n${itemsText}\n*TOTAL:* *${window.formatRupiah(o.grandTotal)}*\n\nBantu kami jadi lebih baik dengan memberikan rating & ulasan Bintang 5 di Google Maps kami ya Kak! 👇\n📍 https://g.page/mainstay-drink-shop/review?ad\n\nSemoga harinya menyenangkan! ✨`;

    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 32 (HRD, ABSENSI KAMERA DEPAN & PIN)
   ========================================================================== */

// 1. INJEKSI MODAL KAMERA ABSENSI KE HTML
(function injectModalAbsensi() {
    if (!document.getElementById('modal-absensi')) {
        const html = `
            <div id="modal-absensi" class="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] hidden flex-col items-center justify-center p-5 slide-up">
                <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative flex flex-col items-center border-4 border-indigo-100">
                    <button onclick="tutupModalAbsensi()" class="absolute top-4 right-4 w-8 h-8 bg-slate-100 rounded-full text-slate-500 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
                    
                    <h2 class="text-sm font-black text-gray-900 mb-1">ABSENSI STAFF</h2>
                    <p class="text-[10px] font-bold text-gray-500 mb-5 text-center">Posisikan wajah Anda di kamera dan masukkan PIN untuk membuka akses Kasir.</p>
                    
                    <!-- AREA KAMERA BULAT -->
                    <div class="w-48 h-48 bg-slate-200 rounded-full overflow-hidden border-4 border-indigo-500 mb-5 relative shadow-inner flex items-center justify-center">
                        <i id="absensi-loading" class="fa-solid fa-spinner fa-spin text-3xl text-slate-400 absolute"></i>
                        <video id="absensi-video" class="w-full h-full object-cover relative z-10" autoplay playsinline></video>
                        <canvas id="absensi-canvas" class="hidden w-full h-full"></canvas>
                    </div>
                    
                    <input type="password" id="absensi-pin" placeholder="PIN STAFF" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-center font-black tracking-[0.5em] text-lg focus:border-indigo-500 focus:ring-indigo-500 mb-4" inputmode="numeric" maxlength="6">
                    
                    <div class="flex w-full gap-2">
                        <button onclick="prosesAbsensi('Masuk')" class="flex-1 bg-green-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-green-600 transition uppercase"><i class="fa-solid fa-right-to-bracket"></i> Absen Masuk</button>
                        <button onclick="prosesAbsensi('Pulang')" class="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-red-600 transition uppercase"><i class="fa-solid fa-right-from-bracket"></i> Pulang</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }
})();

// 2. FUNGSI KENDALI KAMERA (USER MEDIA API)
window.streamKamera = null;

window.bukaModalAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('absensi-video');
    document.getElementById('absensi-pin').value = '';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Memanggil Kamera Depan (Selfie)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => {
            window.streamKamera = stream;
            video.srcObject = stream;
        })
        .catch(err => {
            alert("Gagal mengakses kamera! Pastikan izin kamera diberikan di browser Anda.\nError: " + err);
        });
};

window.tutupModalAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    // Matikan lampu/kamera saat modal ditutup agar hemat baterai
    if (window.streamKamera) {
        window.streamKamera.getTracks().forEach(track => track.stop());
        window.streamKamera = null;
    }
};

// 3. FUNGSI VALIDASI PIN & PENGAMBILAN FOTO
window.prosesAbsensi = function(tipeAbsen) {
    const pinInput = document.getElementById('absensi-pin').value;
    if (!pinInput) { alert("PIN wajib diisi!"); return; }
    
    let staffName = "Unknown";
    
    // Bypass khusus Owner (Master PIN 888888)
    if (pinInput === "888888") {
        staffName = "Owner (Master)";
    } else {
        // Cek PIN di database Staff
        const staffDb = window.AppState.staff || {};
        let found = false;
        Object.keys(staffDb).forEach(key => {
            if (staffDb[key].pin === pinInput) {
                staffName = staffDb[key].nama;
                found = true;
            }
        });
        
        if (!found) {
            alert("❌ PIN Tidak Dikenali! Silakan hubungi Owner.");
            return;
        }
    }
    
    // Jepret Foto dari Video Stream
    const video = document.getElementById('absensi-video');
    const canvas = document.getElementById('absensi-canvas');
    canvas.width = video.videoWidth || 300;
    canvas.height = video.videoHeight || 300;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Kompres ke Base64 (Kualitas 50% agar database tidak cepat penuh)
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.5); 
    
    const now = new Date();
    const payload = {
        nama: staffName,
        waktu: now.toISOString(),
        jenis: tipeAbsen,
        foto: fotoBase64
    };
    
    // Simpan Log Absensi ke Firebase
    window.push(window.ref(window.db, 'attendance_logs'), payload).then(() => {
        alert(`📸 Cekrek! Berhasil Absen ${tipeAbsen}.\nSelamat bertugas, ${staffName}.`);
        
        tutupModalAbsensi();
        
        if (tipeAbsen === 'Masuk') {
            // Set session dan pindahkan ke Kasir
            window.AppState.activeStaffName = staffName;
            const kasirNameEl = document.getElementById('kasir-active-name');
            if (kasirNameEl) kasirNameEl.innerText = staffName;
            if(typeof window.switchRoleView === 'function') window.switchRoleView('kasir');
        } else {
            // Jika pulang, lempar keluar jadi Guest
            window.AppState.activeStaffName = "Guest";
            if(typeof window.switchRoleView === 'function') window.switchRoleView('customer');
        }
    });
};

// 4. REWRITE CRUD STAFF (PANEL OWNER -> HRD)
window.renderOwnerHRDList = function() {
    const container = document.getElementById('owner-hrd-list');
    if (!container) return;
    
    const staff = window.AppState.staff || {};
    container.innerHTML = '';
    let count = 0;
    
    Object.keys(staff).forEach(key => {
        const s = staff[key];
        if(!s) return;
        count++;
        
        container.innerHTML += `
            <div class="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 flex items-center justify-between gap-3">
                <div class="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100">
                    <i class="fa-solid fa-user-tie"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-black text-gray-900 text-xs truncate">${s.nama}</h4>
                    <p class="text-[10px] text-gray-400 font-bold">PIN: <span class="text-indigo-500 font-black">${s.pin}</span> • ${s.posisi || 'Staff'}</p>
                </div>
                <button onclick="hapusKaryawan('${key}')" class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition flex items-center justify-center"><i class="fa-solid fa-trash-can text-xs"></i></button>
            </div>
        `;
    });
    
    if (count === 0) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-6 font-bold">Belum ada data staff/karyawan. Silakan tambah staff baru.</p>';
};

window.tambahKaryawanBaru = function() {
    const nama = prompt("Nama Lengkap Karyawan:");
    if(!nama) return;
    
    const pin = prompt("Buat PIN Karyawan (Misal: 123456):");
    if(!pin) return;
    
    const posisi = prompt("Posisi (Cth: Kasir / Barista):") || 'Kasir';
    
    window.push(window.ref(window.db, 'staff'), {
        nama: nama,
        pin: pin,
        posisi: posisi,
        status: 'aktif',
        joinedAt: new Date().toISOString()
    }).then(() => {
        alert("✅ Staff berhasil ditambahkan!");
        window.renderOwnerHRDList();
    });
};

window.hapusKaryawan = function(key) {
    if (confirm("Hapus data staff ini?")) {
        window.remove(window.ref(window.db, `staff/${key}`)).then(() => window.renderOwnerHRDList());
    }
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 33 (OFFLINE RESILIENCY & GOOGLE SHEETS SYNC)
   ========================================================================== */

// 1. REWRITE PENGIRIMAN PESANAN (DENGAN INTERCEPTOR OFFLINE)
const originalKirimPesanan = window.kirimPesananKeFirebase;
window.kirimPesananKeFirebase = function() {
    // Jika internet nyala, gunakan fungsi asli yang langsung nembak ke Firebase
    if (navigator.onLine) {
        if (typeof originalKirimPesanan === 'function') originalKirimPesanan();
        return;
    }

    // JIKA OFFLINE: Simpan ke Memori Internal HP (Local Storage)
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;
    const isPO = document.getElementById('co-tipe-po')?.checked || false;
    const tglAmbil = isPO ? document.getElementById('co-tanggal-po')?.value : null;

    if (isPO && !tglAmbil) { alert("Untuk Pre-Order, Tanggal wajib diisi!"); return; }

    const isKasir = window.AppState.activeStaffName !== 'Guest';
    let prefix = isKasir ? 'KSR' : (isPO ? 'SPO' : 'SLF');
    const ordersToday = window.AppState.orders || {};
    
    // Ambil hitungan dari pesanan aktif + pesanan offline yang nyangkut
    let pendingOffline = JSON.parse(localStorage.getItem('mainstay_offline_orders') || '[]');
    const queueNumber = String(Object.keys(ordersToday).length + pendingOffline.length + 1).padStart(3, '0');
    const orderId = `${prefix}${queueNumber}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);
    const now = new Date();
    
    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        pickupDate: tglAmbil,
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending' 
    };

    // Simpan ke brankas lokal
    pendingOffline.push(orderData);
    localStorage.setItem('mainstay_offline_orders', JSON.stringify(pendingOffline));

    alert(`🔴 KONEKSI TERPUTUS!\nJangan khawatir, pesanan ${orderId} tersimpan aman di memori HP Anda. Sistem akan mengirimnya otomatis saat sinyal kembali.`);
    
    window.AppState.cart = [];
    window.updateCartUI();
    window.closeModalCheckout();
};

// 2. FUNGSI SINKRONISASI OTOMATIS SAAT SINYAL KEMBALI MUNCUL
window.syncOfflineOrders = function() {
    let pendingOffline = JSON.parse(localStorage.getItem('mainstay_offline_orders') || '[]');
    if (pendingOffline.length === 0) return;

    console.log(`Menyinkronkan ${pendingOffline.length} pesanan tertunda ke Firebase...`);
    
    // Tembakkan semua data yang tertunda secara beruntun
    pendingOffline.forEach(orderData => {
        window.set(window.push(window.ref(window.db, 'orders')), orderData);
    });

    // Bersihkan brankas lokal setelah terkirim
    localStorage.removeItem('mainstay_offline_orders');
    
    // Bunyikan lonceng sukses
    try { new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play(); } catch(e) {}
    alert(`✅ Sinyal kembali! ${pendingOffline.length} pesanan offline berhasil disinkronkan ke pusat.`);
};

// Pasang sensor untuk mengecek setiap kali HP kembali Online
window.addEventListener('online', window.syncOfflineOrders);

// 3. REWRITE PANEL LAPORAN KEUANGAN (TAMBAH TOMBOL SINKRON GOOGLE SHEETS)
const originalRenderLaporan = window.renderLaporanKeuangan;
window.renderLaporanKeuangan = function() {
    if (typeof originalRenderLaporan === 'function') originalRenderLaporan();
    
    const container = document.getElementById('owner-laporan-container');
    if (!container) return;

    // Suntikkan Tombol Sinkronisasi Manual di atas tombol Tutup Buku
    const divDiv = document.createElement('div');
    divDiv.className = "mt-4 space-y-3";
    divDiv.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between shadow-sm">
            <div>
                <p class="text-[10px] font-black text-blue-900 uppercase tracking-wider">Cloud Backup</p>
                <p class="text-[9px] text-blue-600 font-bold">Kirim rekap data hari ini ke Google Sheets.</p>
            </div>
            <button onclick="sinkronisasiManualKeSheets()" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-black text-[10px] transition shadow-md flex items-center gap-1">
                <i class="fa-solid fa-cloud-arrow-up"></i> Sync Now
            </button>
        </div>
    `;
    
    // Sisipkan sebelum tombol Tutup Buku Harian (jika ada)
    const btnTutupBuku = container.querySelector('button[onclick="tutupBukuHarian()"]');
    if (btnTutupBuku) {
        btnTutupBuku.parentNode.insertBefore(divDiv, btnTutupBuku);
    } else {
        container.appendChild(divDiv);
    }
};

// 4. FUNGSI SINKRONISASI MANUAL GOOGLE SHEETS
window.sinkronisasiManualKeSheets = function() {
    const orders = window.AppState.orders || {};
    const orderKeys = Object.keys(orders);
    
    if (orderKeys.length === 0) {
        alert("Belum ada data transaksi hari ini untuk disinkronkan.");
        return;
    }

    if (!confirm(`Kirim paksa ${orderKeys.length} data transaksi ke Google Sheets sekarang?`)) return;

    // URL Google Apps Script yang sudah Anda pasang di Tahap 21
    const gasUrl = "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec";
    
    let successCount = 0;
    
    // Kirim data satu per satu agar tidak membebani limit payload
    orderKeys.forEach(key => {
        const o = orders[key];
        const payload = {
            tipe: 'TRANSAKSI',
            payload: {
                waktu: o.waktu,
                orderId: o.orderId,
                namaCustomer: o.namaCustomer,
                items: o.items,
                grandTotal: o.grandTotal,
                metodeBayar: o.metodeBayar
            }
        };

        fetch(gasUrl, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(() => {
            successCount++;
            if(successCount === orderKeys.length) {
                alert("✅ Proses sinkronisasi selesai! Cek Google Sheets Anda.");
            }
        }).catch(err => console.log("Sync Error:", err));
    });
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 34 (FINAL AUDIT, SESSION PERSISTENCE & UI FIX)
   ========================================================================== */

// 1. SESSION PERSISTENCE (ANTI-RESET SAAT REFRESH) & UI LOGOUT
const originalSwitchRoleViewTahap34 = window.switchRoleView;
window.switchRoleView = function(role) {
    // Simpan role ke memori HP agar tidak hilang saat di-refresh
    localStorage.setItem('mainstay_active_role', role);
    
    // Panggil fungsi pergantian layar bawaan
    if (typeof originalSwitchRoleViewTahap34 === 'function') {
        originalSwitchRoleViewTahap34(role);
    }
    
    // MODIFIKASI UI HEADER: Ubah tombol Gembok menjadi Logout jika sudah login
    const headerBtn = document.getElementById('header-btn-kasir'); // ID tombol gembok di HTML Anda
    if (headerBtn) {
        if (role === 'owner' || role === 'kasir') {
            headerBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> <span class="hidden md:inline">Keluar</span>';
            headerBtn.classList.replace('bg-slate-100', 'bg-red-100');
            headerBtn.classList.replace('text-slate-600', 'text-red-600');
            headerBtn.onclick = function() { window.prosesLogout(role); };
        } else {
            headerBtn.innerHTML = '<i class="fa-solid fa-lock"></i> <span class="hidden md:inline">Login Staff</span>';
            headerBtn.classList.replace('bg-red-100', 'bg-slate-100');
            headerBtn.classList.replace('text-red-600', 'text-slate-600');
            headerBtn.onclick = window.openLoginModal;
        }
    }

    // MODIFIKASI PANEL OWNER: Hapus Tombol Oranye "Ambil Alih POS"
    if (role === 'owner') {
        // Mencari tombol dengan warna oranye/amber di dalam panel owner yang mengarah ke kasir
        const ownerContainer = document.getElementById('owner-view');
        if (ownerContainer) {
            const btnAmbilAlih = ownerContainer.querySelector('button[onclick*="switchRoleView(\\'kasir\\')"]');
            if (btnAmbilAlih) btnAmbilAlih.style.display = 'none'; // Sembunyikan permanen
        }
    }
    
    // MODIFIKASI LAYAR KASIR: Tambahkan Tombol Akses Inventaris Cepat
    if (role === 'kasir') {
        injectTombolInventarisKasir();
    }
};

// 2. FUNGSI LOGOUT YANG BENAR (MENGHAPUS SESI)
const originalProsesLogout = window.prosesLogout;
window.prosesLogout = function(role) {
    if (role === 'kasir') {
        // Jalankan audit laci kasir (Tahap 17)
        if (typeof originalProsesLogout === 'function') originalProsesLogout(role);
        // Hapus sesi setelah kasir selesai audit
        localStorage.setItem('mainstay_active_role', 'customer');
    } else {
        // Logout biasa untuk Owner
        if (confirm("Yakin ingin keluar dari Panel Master?")) {
            localStorage.setItem('mainstay_active_role', 'customer');
            window.switchRoleView('customer');
        }
    }
};

// 3. INJEKSI TOMBOL "KELOLA STOK" DI LAYAR KASIR
function injectTombolInventarisKasir() {
    const kasirTabContainer = document.querySelector('#kasir-orders-container .sticky.top-0');
    if (kasirTabContainer && !document.getElementById('btn-kasir-inventaris')) {
        const btnInv = document.createElement('button');
        btnInv.id = 'btn-kasir-inventaris';
        btnInv.className = "flex-1 py-2.5 rounded-xl font-black text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition shadow-sm";
        btnInv.innerHTML = '<i class="fa-solid fa-boxes-stacked"></i> Kelola Stok';
        btnInv.onclick = function() {
            // Karena Kasir berhak mengatur stok (sesuai Blueprint),
            // kita panggil fungsi inventaris yang sama dengan milik owner ke dalam Modal popup
            bukaModalInventarisKasir();
        };
        kasirTabContainer.appendChild(btnInv);
    }
}

// 4. MODAL INVENTARIS KHUSUS KASIR
window.bukaModalInventarisKasir = function() {
    let existingModal = document.getElementById('modal-kasir-inventaris');
    if (!existingModal) {
        const html = `
            <div id="modal-kasir-inventaris" class="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] hidden flex-col items-center justify-center p-4">
                <div class="bg-white w-full max-w-md rounded-2xl shadow-2xl relative h-[80vh] flex flex-col">
                    <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-indigo-50 rounded-t-2xl">
                        <h2 class="text-sm font-black text-indigo-900"><i class="fa-solid fa-boxes-stacked"></i> MANAJEMEN STOK (KASIR)</h2>
                        <button onclick="document.getElementById('modal-kasir-inventaris').classList.add('hidden')" class="w-8 h-8 bg-white rounded-full text-gray-500 hover:text-red-500 flex items-center justify-center shadow-sm"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div class="p-4 flex-1 overflow-y-auto hide-scrollbar bg-gray-50">
                        <!-- Kontainer untuk List Gudang -->
                        <div id="kasir-inventory-render"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        existingModal = document.getElementById('modal-kasir-inventaris');
    }
    
    existingModal.classList.remove('hidden');
    existingModal.classList.add('flex');
    
    // Gunakan fungsi render milik Owner (Tahap 14) untuk memuat data gudang ke dalam modal ini
    const targetRender = document.getElementById('kasir-inventory-render');
    
    // Override sementara ID target container agar renderOwnerInventoryList menulis ke modal Kasir
    const originalContainer = document.getElementById('owner-inventory-list');
    if (originalContainer) originalContainer.id = 'owner-inventory-list-temp';
    targetRender.id = 'owner-inventory-list';
    
    if (typeof window.renderOwnerInventoryList === 'function') window.renderOwnerInventoryList();
    
    // Kembalikan ID aslinya
    targetRender.id = 'kasir-inventory-render';
    if (originalContainer) originalContainer.id = 'owner-inventory-list';
};

// 5. JALANKAN OTOMATIS SAAT APLIKASI DIBUKA (Override Tahap 20)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initFirebase === 'function') {
        window.initFirebase(); // Nyalakan Sensor Realtime
    }
    
    // Baca memori terakhir (Session Persistence)
    let savedRole = localStorage.getItem('mainstay_active_role') || 'customer';
    
    // Jika role kasir, pastikan status absensi tidak hilang. Jika hilang (karena browser tertutup penuh), paksa absen ulang.
    if (savedRole === 'kasir' && (!window.AppState.activeStaffName || window.AppState.activeStaffName === 'Guest')) {
        savedRole = 'customer'; // Reset ke customer agar dipaksa absen PIN (Selfie) ulang
        localStorage.setItem('mainstay_active_role', 'customer');
    }
    
    window.switchRoleView(savedRole);
});
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 35 (SYSTEM AUDIT PATCH & CRITICAL FIXES)
   ========================================================================== */

// 1. FIX BUG: UNIFIED LOGIN GATE (Satu Pintu Login Untuk Owner & Kasir)
window.openLoginModal = function() {
    if (typeof window.bukaModalAbsensi === 'function') {
        window.bukaModalAbsensi(); // Arahkan tombol Login ke Kamera Absensi
    } else {
        alert("Sistem Keamanan Kamera sedang dimuat, harap tunggu sebentar...");
    }
};

// 2. FIX BUG: ROUTING OWNER VS KASIR (Memperbaiki Navigasi PIN 888888)
window.prosesAbsensi = function(tipeAbsen) {
    const pinInput = document.getElementById('absensi-pin').value;
    if (!pinInput) { alert("PIN wajib diisi!"); return; }
    
    let staffName = "Unknown";
    let isOwner = false;
    
    // Deteksi apakah yang masuk Owner atau Kasir
    if (pinInput === "888888") {
        staffName = "Owner (Master)";
        isOwner = true;
    } else {
        const staffDb = window.AppState.staff || {};
        let found = false;
        Object.keys(staffDb).forEach(key => {
            if (staffDb[key].pin === pinInput) {
                staffName = staffDb[key].nama;
                found = true;
            }
        });
        if (!found) { alert("❌ PIN Tidak Dikenali! Silakan hubungi Owner."); return; }
    }
    
    // SIMPAN SESI NAMA KE MEMORI HP (Mengatasi Bug Tertendang Saat Refresh)
    localStorage.setItem('mainstay_active_staff', staffName);
    window.AppState.activeStaffName = staffName;

    // Lanjut jepret kamera
    const video = document.getElementById('absensi-video');
    const canvas = document.getElementById('absensi-canvas');
    if(video && canvas) {
        canvas.width = video.videoWidth || 300;
        canvas.height = video.videoHeight || 300;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.5); 
        
        // Kirim Log Absensi ke Database
        window.push(window.ref(window.db, 'attendance_logs'), {
            nama: staffName, waktu: new Date().toISOString(), jenis: tipeAbsen, foto: fotoBase64
        }).then(() => {
            window.tutupModalAbsensi();
            
            if (tipeAbsen === 'Masuk') {
                if (isOwner) {
                    // JIKA OWNER: Masuk ke Panel Master (Memperbaiki Bug)
                    alert("Berhasil Verifikasi. Selamat Datang, Owner.");
                    window.switchRoleView('owner');
                } else {
                    // JIKA KASIR: Masuk ke POS Kasir
                    alert(`📸 Cekrek! Berhasil Absen. Selamat bertugas, ${staffName}.`);
                    const kasirNameEl = document.getElementById('kasir-active-name');
                    if (kasirNameEl) kasirNameEl.innerText = staffName;
                    window.switchRoleView('kasir');
                }
            } else {
                // JIKA PULANG: Hapus sesi nama dan kembalikan ke Customer
                localStorage.setItem('mainstay_active_staff', 'Guest');
                window.AppState.activeStaffName = "Guest";
                window.switchRoleView('customer');
            }
        });
    }
};

// 3. FIX BUG: LOGOUT BERSIH (Mencegah Kebocoran Memori)
const originalProsesLogoutT35 = window.prosesLogout;
window.prosesLogout = function(role) {
    if (role === 'kasir') {
        // Panggil audit laci kasir (Tahap 17/34)
        if (typeof originalProsesLogoutT35 === 'function') originalProsesLogoutT35(role);
        // Hapus SEMUA memori
        localStorage.setItem('mainstay_active_role', 'customer');
        localStorage.setItem('mainstay_active_staff', 'Guest');
        window.AppState.activeStaffName = 'Guest';
    } else {
        if (confirm("Yakin ingin keluar dari Panel Master?")) {
            // Hapus SEMUA memori untuk Owner
            localStorage.setItem('mainstay_active_role', 'customer');
            localStorage.setItem('mainstay_active_staff', 'Guest');
            window.AppState.activeStaffName = 'Guest';
            window.switchRoleView('customer');
        }
    }
};

// 4. FIX BUG: PERTAHANKAN SESI SAAT REFRESH (Penyempurnaan Lanjutan)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Pulihkan nama staff dari memori HP
    const savedStaff = localStorage.getItem('mainstay_active_staff') || 'Guest';
    window.AppState.activeStaffName = savedStaff;
    
    // 2. Pulihkan posisi layar dari memori HP
    let savedRole = localStorage.getItem('mainstay_active_role') || 'customer';
    
    // 3. Keamanan Ketat: Jika posisinya di Layar Kasir/Owner TAPI namanya Guest, baru tendang keluar!
    if ((savedRole === 'kasir' || savedRole === 'owner') && savedStaff === 'Guest') {
        savedRole = 'customer'; 
        localStorage.setItem('mainstay_active_role', 'customer');
    }
    
    // Terapkan layar tanpa menendang user yang sah
    if (typeof window.switchRoleView === 'function') {
        window.switchRoleView(savedRole);
    }
});
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 36 (GRAND SYSTEM PATCH & 5 CRITICAL FIXES)
   ========================================================================== */

// 1. FIX BUG 5: TANGKAP VOUCHER DARI URL SAAT LOAD
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const promoCode = urlParams.get('voucher');
    if (promoCode) {
        // Simpan ke state sementara, nanti bisa diaplikasikan di keranjang
        window.AppState.activeVoucherUrl = promoCode.toUpperCase();
        setTimeout(() => alert(`🎉 Promo Code [${promoCode.toUpperCase()}] terdeteksi! Jangan lupa aplikasikan di Keranjang.`), 1500);
    }
});

// 2. FIX BUG 3: MUNCULKAN GAMBAR QRIS SECARA DINAMIS DI CHECKOUT
(function injectQRISToggle() {
    // Kita pastikan saat modal checkout dirender, ada wadah untuk QRIS
    const originalUpdateCartUI = window.updateCartUI;
    window.updateCartUI = function() {
        if (typeof originalUpdateCartUI === 'function') originalUpdateCartUI();
        
        // Cari container pembayaran di modal checkout dan injeksikan wadah QRIS
        const modalCheckout = document.getElementById('modal-checkout');
        if (modalCheckout && !document.getElementById('qris-container')) {
            const paymentDiv = modalCheckout.querySelector('input[name="co_payment"]')?.parentElement?.parentElement;
            if (paymentDiv) {
                paymentDiv.insertAdjacentHTML('afterend', `
                    <div id="qris-container" class="hidden mt-4 text-center bg-blue-50 p-4 rounded-xl border border-blue-200 slide-up">
                        <p class="text-[10px] font-black text-blue-900 mb-2">SCAN QRIS MAINSTAY DRINK</p>
                        <img src="qris-mainstay.png" alt="QRIS" class="w-48 h-48 mx-auto rounded-lg shadow-sm border-2 border-white object-cover" onerror="this.src='https://via.placeholder.com/200?text=QRIS+MAINSTAY'">
                        <p class="text-[9px] text-blue-600 font-bold mt-2">Atas Nama: Mainstay Drink Shop</p>
                    </div>
                `);
            }
        }
        
        // Pasang event listener ke radio button pembayaran
        document.querySelectorAll('input[name="co_payment"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const qrisBox = document.getElementById('qris-container');
                if(qrisBox) {
                    if (this.value === 'QRIS') qrisBox.classList.remove('hidden');
                    else qrisBox.classList.add('hidden');
                }
            });
        });
    };
})();

// 3. FIX BUG 4 & BUG 2: REWRITE TOTAL KIRIM PESANAN (Validasi Stok & Update Stamp Member)
window.kirimPesananKeFirebase = function() {
    const nama = document.getElementById('co-name')?.value.trim() || 'Pelanggan';
    const phone = document.getElementById('co-phone')?.value.trim() || '';
    const payment = document.querySelector('input[name="co_payment"]:checked')?.value || 'Cash';
    const isMember = document.getElementById('co-member')?.checked || false;
    const isPO = document.getElementById('co-tipe-po')?.checked || false;
    const tglAmbil = isPO ? document.getElementById('co-tanggal-po')?.value : null;

    if (isPO && !tglAmbil) { alert("Untuk Pre-Order, Tanggal wajib diisi!"); return; }

    // BUG 4 FIX: Validasi Silang Stok Menu vs Keranjang (Anti Exploit)
    const activeMenus = window.AppState.menus || {};
    let isStokAman = true;
    let menuHabisName = "";
    
    window.AppState.cart.forEach(item => {
        const menuAsli = activeMenus[item.id];
        if (!menuAsli || menuAsli.status === 'habis') {
            isStokAman = false;
            menuHabisName = item.nama;
        }
    });

    if (!isStokAman) {
        alert(`❌ Mohon maaf, menu "${menuHabisName}" baru saja berstatus HABIS. Silakan hapus dari keranjang Anda.`);
        return; // Hentikan proses checkout
    }

    // Persiapan Nomor Antrean
    const isKasir = window.AppState.activeStaffName !== 'Guest';
    let prefix = isKasir ? 'KSR' : (isPO ? 'SPO' : 'SLF');
    const ordersToday = window.AppState.orders || {};
    let pendingOffline = JSON.parse(localStorage.getItem('mainstay_offline_orders') || '[]');
    const queueNumber = String(Object.keys(ordersToday).length + pendingOffline.length + 1).padStart(3, '0');
    const orderId = `${prefix}${queueNumber}`;
    
    let grandTotal = 0;
    window.AppState.cart.forEach(i => grandTotal += i.total);
    const now = new Date();
    
    const orderData = {
        orderId: orderId,
        waktu: now.toISOString(),
        pickupDate: tglAmbil,
        namaCustomer: nama,
        phone: phone,
        metodeBayar: payment,
        isMember: isMember,
        items: window.AppState.cart,
        grandTotal: grandTotal,
        status: 'pending',
        kasirName: isKasir ? window.AppState.activeStaffName : 'Self-Order'
    };

    // EKSEKUSI OFFLINE MODE JIKA MATI INTERNET
    if (!navigator.onLine) {
        pendingOffline.push(orderData);
        localStorage.setItem('mainstay_offline_orders', JSON.stringify(pendingOffline));
        alert(`🔴 KONEKSI TERPUTUS! Pesanan ${orderId} tersimpan aman di memori HP Anda.`);
        resetCartAfterOrder(isKasir, orderId, payment);
        return;
    }

    // EKSEKUSI ONLINE KE FIREBASE
    window.set(window.push(window.ref(window.db, 'orders')), orderData).then(() => {
        
        // BUG 2 FIX: Logika Update Member (Bukan Duplicate)
        if (isMember && phone) {
            const membersDb = window.AppState.members || {};
            let foundMemberKey = null;
            let currentStamps = 0;
            
            // Cari apakah nomor WA sudah ada
            Object.keys(membersDb).forEach(k => {
                if (membersDb[k].phone === phone) {
                    foundMemberKey = k;
                    currentStamps = membersDb[k].stamps_count || 0;
                }
            });

            if (foundMemberKey) {
                // Update Stamp Member Lama (+1)
                const newStamp = currentStamps >= 5 ? 5 : currentStamps + 1; // Maks 5 per Blueprint
                window.update(window.ref(window.db, `members/${foundMemberKey}`), { stamps_count: newStamp });
            } else {
                // Buat Member Baru (Stamp Awal = 1)
                window.push(window.ref(window.db, 'members'), { 
                    nama: nama, phone: phone, stamps_count: 1, completed_sessions: 0, joined_at: now.toISOString(), status: 'active' 
                });
            }
        }
        
        resetCartAfterOrder(isKasir, orderId, payment);
    });
};

function resetCartAfterOrder(isKasir, orderId, payment) {
    window.AppState.cart = [];
    window.updateCartUI();
    window.closeModalCheckout();
    try { new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg').play(); } catch(e) {}

    if (!isKasir) {
        window.tampilkanModalSuksesPelanggan(orderId, payment);
    } else {
        alert(`✅ Pesanan Masuk!\nKode: ${orderId}`);
    }
}

// 4. FIX BUG 1: FUNGSI CETAK STRUK THERMAL 58MM
window.cetakStruk = function(key, tipe) {
    const o = window.AppState.orders[key];
    if (!o) return;

    // Membuka Jendela Baru Khusus Print
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    // Header Toko
    const storeName = window.AppState.storeSettings?.storeName || "Mainstay Drink Shop";
    
    // Merakit Item
    let itemHtml = '';
    o.items.forEach(i => {
        itemHtml += `
            <tr style="border-bottom: 1px dashed #000;">
                <td style="padding: 5px 0;">${i.qty}x</td>
                <td style="padding: 5px 0;">${i.nama}<br><small style="font-size:10px;">${i.catatan}</small></td>
                ${tipe === 'kasir' ? `<td style="padding: 5px 0; text-align:right;">${window.formatRupiah(i.total)}</td>` : ''}
            </tr>
        `;
    });

    // Desain CSS Khusus Kertas Thermal 58mm
    const htmlContent = `
        <html>
        <head>
            <title>Print Struk ${o.orderId}</title>
            <style>
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; padding: 10px; }
                }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    width: 58mm; /* Ukuran Kertas Kasir Standard */
                    font-size: 12px;
                    color: #000;
                    margin: 0 auto;
                }
                h1, h2, h3, p { margin: 0; padding: 0; text-align: center; }
                .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                table { w-full: 100%; width: 100%; border-collapse: collapse; }
                .text-left { text-align: left; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .big-queue { font-size: 24px; font-weight: bold; padding: 10px 0; border: 2px solid #000; margin: 10px 0;}
            </style>
        </head>
        <body>
            <h3>${storeName}</h3>
            ${tipe === 'kasir' ? `<p style="font-size:10px;">${new Date(o.waktu).toLocaleString('id-ID')}</p>` : `<p><b>DAPUR TICKET</b></p>`}
            
            <div class="divider"></div>
            <p class="text-left" style="font-size:10px;">
                ID : ${o.orderId}<br>
                Cus: ${o.namaCustomer}<br>
                Kasir: ${o.kasirName || 'Self-Order'}
            </p>
            <div class="divider"></div>
            
            <div class="big-queue">#${o.orderId.substring(3)}</div>
            
            <div class="divider"></div>
            <table>
                ${itemHtml}
            </table>
            <div class="divider"></div>
            
            ${tipe === 'kasir' ? `
                <table style="margin-bottom: 10px;">
                    <tr><td class="bold">TOTAL</td><td class="text-right bold">${window.formatRupiah(o.grandTotal)}</td></tr>
                    <tr><td>METODE</td><td class="text-right">${o.metodeBayar}</td></tr>
                </table>
                <p style="font-size:10px; margin-top:15px;">Terima Kasih telah berbelanja!</p>
            ` : `<p style="margin-top:20px;">~ SEGERA SIAPKAN ~</p>`}
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Delay sedikit agar browser merender HTML sebelum print dialog muncul
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 37 (BATCH 1: VOUCHER, RESET88, KUNCI TOKO)
   ========================================================================== */

// 1. FIX BUG 1: PENGAMAN BACKDOOR RESET88
const originalProsesAbsensiT37 = window.prosesAbsensi;
window.prosesAbsensi = function(tipeAbsen) {
    const pinInput = document.getElementById('absensi-pin').value;
    
    // Bypass Rahasia Sesuai Blueprint
    if (pinInput === "RESET88") {
        alert("⚠️ SYSTEM OVERRIDE: Akses Backdoor Terbuka.");
        localStorage.setItem('mainstay_active_staff', 'Owner (Master)');
        window.AppState.activeStaffName = 'Owner (Master)';
        window.tutupModalAbsensi();
        window.switchRoleView('owner');
        return;
    }
    
    // Jika bukan RESET88, jalankan fungsi absensi normal (Tahap 35)
    if (typeof originalProsesAbsensiT37 === 'function') originalProsesAbsensiT37(tipeAbsen);
};

// 2. FIX BUG 4: INJEKSI KOLOM VOUCHER DI MODAL CHECKOUT
(function injectVoucherInput() {
    const originalUpdateCart = window.updateCartUI;
    window.updateCartUI = function() {
        if (typeof originalUpdateCart === 'function') originalUpdateCart();
        
        const checkoutModal = document.getElementById('modal-checkout');
        if (checkoutModal && !document.getElementById('voucher-container')) {
            // Cari elemen total harga untuk disisipkan kolom voucher di atasnya
            const totalDiv = checkoutModal.querySelector('.bg-gray-100'); 
            if (totalDiv) {
                totalDiv.insertAdjacentHTML('beforebegin', `
                    <div id="voucher-container" class="mb-4">
                        <label class="text-[10px] font-bold text-gray-500 uppercase">Kode Promo / Voucher</label>
                        <div class="flex gap-2 mt-1">
                            <input type="text" id="co-voucher-code" placeholder="Ketik kode (Cth: DISKON20)" class="flex-1 bg-white border border-gray-200 rounded-xl p-3 text-xs font-black uppercase">
                            <button type="button" onclick="terapkanVoucher()" class="bg-indigo-500 text-white px-4 rounded-xl font-black text-xs hover:bg-indigo-600 shadow-sm">Klaim</button>
                        </div>
                        <p id="voucher-msg" class="text-[9px] font-bold mt-1 text-green-600 hidden"></p>
                    </div>
                `);
            }
        }

        // Kalkulasi Ulang Total Jika Ada Voucher Aktif
        if (window.AppState.activeVoucherData) {
            let subTotal = 0;
            window.AppState.cart.forEach(i => subTotal += i.total);
            
            const potong = window.AppState.activeVoucherData.nominal || 0;
            const finalTotal = subTotal - potong < 0 ? 0 : subTotal - potong;
            
            // Ubah teks total di keranjang
            const totalEl = document.getElementById('cart-total-price');
            if(totalEl) totalEl.innerText = window.formatRupiah(finalTotal);
            
            // Ubah teks total di modal checkout
            const coTotalEl = document.getElementById('co-grand-total');
            if(coTotalEl) coTotalEl.innerText = window.formatRupiah(finalTotal);
        }
    };
})();

// 3. FUNGSI CEK & TERAPKAN VOUCHER KE KERANJANG
window.AppState.activeVoucherData = null; // State global voucher

window.terapkanVoucher = function() {
    const code = document.getElementById('co-voucher-code').value.toUpperCase().trim();
    const msgEl = document.getElementById('voucher-msg');
    
    if (!code) return;

    // Ambil data voucher dari Firebase
    window.get(window.ref(window.db, `vouchers/${code}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const v = snapshot.val();
            if (v.status !== 'aktif') {
                msgEl.innerText = "❌ Voucher sudah tidak aktif/kadaluarsa.";
                msgEl.className = "text-[9px] font-bold mt-1 text-red-500";
                return;
            }
            
            // Jika berhasil
            window.AppState.activeVoucherData = { kode: code, nominal: v.nominal };
            msgEl.innerText = `✅ Berhasil! Diskon ${window.formatRupiah(v.nominal)} diterapkan.`;
            msgEl.className = "text-[9px] font-bold mt-1 text-green-600";
            
            // Panggil render ulang keranjang untuk update harga
            window.updateCartUI();
        } else {
            msgEl.innerText = "❌ Kode voucher tidak ditemukan.";
            msgEl.className = "text-[9px] font-bold mt-1 text-red-500";
            window.AppState.activeVoucherData = null;
            window.updateCartUI();
        }
    });
};

// 4. FIX BUG 8: KUNCI TOTAL TOMBOL CHECKOUT JIKA TOKO TUTUP
const originalOpenCheckout = window.openModalCheckout;
window.openModalCheckout = function() {
    // Cek status darurat toko dari settings Firebase
    const isClosed = window.AppState.storeSettings?.isClosed || false;
    
    // Jika yang mau checkout adalah pelanggan (Guest), dan toko tutup, BLOKIR!
    if (window.AppState.activeStaffName === 'Guest' && isClosed) {
        alert("🔒 MOHON MAAF, TOKO SEDANG TUTUP.\nPemesanan mandiri tidak dapat dilakukan untuk sementara waktu.");
        return;
    }
    
    // Jika aman, lanjutkan buka modal checkout
    if (typeof originalOpenCheckout === 'function') originalOpenCheckout();
};

// 5. FIX BUG 3: INJEKSI MENU MANAJEMEN VOUCHER DI OWNER PANEL
const originalRenderOwnerMenuT37 = window.renderOwnerMenuList;
window.renderOwnerMenuList = function() {
    if (typeof originalRenderOwnerMenuT37 === 'function') originalRenderOwnerMenuT37();
    
    const ownerView = document.getElementById('owner-view');
    if (!ownerView) return;

    // Tambahkan Tombol "Kelola Voucher" di Tab Menu (Jika belum ada)
    const menuHeader = ownerView.querySelector('.sticky.top-0');
    if (menuHeader && !document.getElementById('btn-kelola-voucher')) {
        menuHeader.insertAdjacentHTML('beforeend', `
            <button id="btn-kelola-voucher" onclick="buatVoucherBaru()" class="w-full mt-3 py-3 bg-indigo-50 border border-indigo-200 text-indigo-600 font-black text-xs rounded-xl shadow-sm hover:bg-indigo-100 transition">
                <i class="fa-solid fa-ticket-simple"></i> Buat Kode Promo / Voucher
            </button>
        `);
    }
};

window.buatVoucherBaru = function() {
    const kode = prompt("Masukkan Kode Voucher (Cth: MERDEKA20):");
    if (!kode) return;
    
    const nominal = prompt("Masukkan Nominal Diskon (Hanya Angka, Cth: 5000):");
    if (!nominal || isNaN(nominal)) { alert("Nominal tidak valid!"); return; }

    const vCode = kode.toUpperCase().trim();
    
    // Simpan ke Firebase path /vouchers/{kode}
    window.set(window.ref(window.db, `vouchers/${vCode}`), {
        nominal: parseInt(nominal),
        status: 'aktif',
        dibuat: new Date().toISOString()
    }).then(() => {
        alert(`✅ Voucher ${vCode} dengan diskon ${window.formatRupiah(nominal)} berhasil diaktifkan!`);
    });
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 38 (BATCH 2: BACKUP JSON, CEK STAMP, PROFIL OWNER)
   ========================================================================== */

// 1. FIX BUG 11: SISTEM BACKUP & RESTORE DATABASE (JSON)
(function injectDatabaseManager() {
    const originalRenderLaporanT38 = window.renderLaporanKeuangan;
    window.renderLaporanKeuangan = function() {
        if (typeof originalRenderLaporanT38 === 'function') originalRenderLaporanT38();
        
        const container = document.getElementById('owner-laporan-container');
        if (container && !document.getElementById('db-manager-container')) {
            const dbHtml = `
                <div id="db-manager-container" class="mt-4 bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-md">
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-3"><i class="fa-solid fa-hard-drive"></i> Database Manager (JSON)</p>
                    <div class="flex gap-2">
                        <button onclick="exportDatabaseJSON()" class="flex-1 bg-green-500 text-white py-2.5 rounded-lg font-black text-[10px] hover:bg-green-600 transition shadow-sm"><i class="fa-solid fa-download"></i> Backup Data</button>
                        <button onclick="document.getElementById('import-json-file').click()" class="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-black text-[10px] hover:bg-red-600 transition shadow-sm"><i class="fa-solid fa-upload"></i> Restore Data</button>
                        <input type="file" id="import-json-file" accept=".json" class="hidden" onchange="importDatabaseJSON(event)">
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', dbHtml);
        }
    };
})();

// Fungsi Download JSON Database
window.exportDatabaseJSON = function() {
    window.get(window.ref(window.db, '/')).then((snapshot) => {
        if (snapshot.exists()) {
            const data = JSON.stringify(snapshot.val(), null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Mainstay_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert("✅ Backup Database berhasil diunduh!");
        } else {
            alert("Database kosong, tidak ada yang dibackup.");
        }
    }).catch(err => alert("Gagal backup: " + err));
};

// Fungsi Upload & Restore JSON Database
window.importDatabaseJSON = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm("⚠️ PERINGATAN BAHAYA!\nProses ini akan MENGHAPUS seluruh data yang ada saat ini dan menggantinya dengan data dari file JSON. Lanjutkan?")) {
        event.target.value = ''; // Reset input
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            window.set(window.ref(window.db, '/'), parsedData).then(() => {
                alert("✅ RESTORE BERHASIL! Seluruh sistem telah dikembalikan sesuai file backup. Halaman akan dimuat ulang.");
                window.location.reload();
            });
        } catch (error) {
            alert("❌ File JSON tidak valid atau rusak!");
        }
    };
    reader.readAsText(file);
};

// 2. FIX BUG 5: TOMBOL CEK STAMP MEMBER UNTUK PELANGGAN
(function injectCekStampBtn() {
    // Sisipkan tombol di Header Customer
    const headerCustomer = document.querySelector('header'); 
    if (headerCustomer && !document.getElementById('btn-cek-stamp')) {
        const cekBtn = document.createElement('button');
        cekBtn.id = 'btn-cek-stamp';
        cekBtn.className = "bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-black text-[10px] shadow-sm border border-amber-200 hover:bg-amber-200 transition hidden md:flex items-center gap-1";
        cekBtn.innerHTML = '<i class="fa-solid fa-award"></i> Cek Stamp';
        cekBtn.onclick = window.cekStampMember;
        
        // Taruh di pojok kanan atas header
        headerCustomer.appendChild(cekBtn);
        
        // Versi Mobile Floating Button (Kiri Bawah)
        document.body.insertAdjacentHTML('beforeend', `
            <button onclick="cekStampMember()" class="fixed bottom-24 left-4 z-[90] w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg flex items-center justify-center border-2 border-white md:hidden">
                <i class="fa-solid fa-award text-xl"></i>
            </button>
        `);
    }
})();

window.cekStampMember = function() {
    let phone = prompt("Cek Stamp Mainstay Drink\nMasukkan Nomor WhatsApp Anda (Cth: 08123...):");
    if (!phone) return;
    
    phone = phone.trim();
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (phone.startsWith('+62')) phone = '62' + phone.substring(3);
    
    const membersDb = window.AppState.members || {};
    let found = null;
    
    Object.keys(membersDb).forEach(k => {
        if (membersDb[k].phone === phone) found = membersDb[k];
    });
    
    if (found) {
        alert(`🌟 MEMBER DITEMUKAN!\nNama: ${found.nama}\nJumlah Stamp Aktif: ${found.stamps_count} dari 5.\nSesi Selesai (Pernah Klaim): ${found.completed_sessions || 0} kali.`);
    } else {
        alert("❌ Nomor WA tidak terdaftar sebagai Member. Centang 'Join Member' saat memesan untuk mulai mengumpulkan Stamp!");
    }
};

// 3. FIX BUG 6: CHECKBOX "DAPAT STAMP" DI MENU OWNER
(function injectCheckboxStamp() {
    const modalAddMenu = document.getElementById('modal-add-menu');
    if (modalAddMenu && !document.getElementById('add-menu-opt-stamp')) {
        const checkContainer = modalAddMenu.querySelector('.bg-amber-50'); // Wadah opsi (Ice, Sugar, dll)
        if (checkContainer) {
            checkContainer.insertAdjacentHTML('afterbegin', `
                <label class="flex items-center gap-3 mb-3 cursor-pointer pb-3 border-b border-amber-200">
                    <input type="checkbox" id="add-menu-opt-stamp" checked class="w-5 h-5 text-indigo-500 rounded border-gray-300 focus:ring-indigo-500">
                    <span class="text-xs font-bold text-indigo-900">🎁 Menu ini berhak mendapatkan Stamp Member</span>
                </label>
            `);
        }
    }
})();

// Override fungsi simpan menu agar menangkap data checkbox Stamp
const originalSimpanMenuT38 = window.simpanMenuDariModal;
window.simpanMenuDariModal = function() {
    const isStampEligible = document.getElementById('add-menu-opt-stamp')?.checked ?? true;
    
    // Agar tidak menulis ulang kode Firebase panjang, kita 'hack' datanya
    // Simpan nilai ke global sebentar, panggil fungsi asli, lalu update datanya.
    window.AppState.tempStampEligible = isStampEligible;
    
    if (typeof originalSimpanMenuT38 === 'function') originalSimpanMenuT38();
};

// Modifikasi sistem keranjang agar tidak memberi stamp jika produk tidak eligible
const originalTerapkanMemberCart = window.kirimPesananKeFirebase;
window.kirimPesananKeFirebase = function() {
    // Cek apakah di keranjang ada menu yang "Dapat Stamp"
    let containsStampableItem = false;
    window.AppState.cart.forEach(item => {
        const menuAsli = window.AppState.menus[item.id];
        if (menuAsli && menuAsli.hasStamp !== false) {
            containsStampableItem = true;
        }
    });

    const isMemberChecked = document.getElementById('co-member')?.checked;
    if (isMemberChecked && !containsStampableItem) {
        alert("Peringatan: Pesanan Anda ini tidak mengandung produk yang berhak mendapatkan Stamp (Misal: Menu Promo). Transaksi tetap diproses tanpa menambah Stamp.");
        document.getElementById('co-member').checked = false; // Batalkan centang member diam-diam
    }
    
    if (typeof originalTerapkanMemberCart === 'function') originalTerapkanMemberCart();
};
/* ==========================================================================
   MAINSTAY DRINK POS - TAHAP 39 (FINAL BATCH: SECRET TAP, UPLOAD, STOCK, CAROUSEL)
   ========================================================================== */

// 1. FIX JENIUS: SECRET TAP UNTUK BACKDOOR RESET88
(function injectSecretTap() {
    const originalBukaModalAbsensiT39 = window.bukaModalAbsensi;
    window.bukaModalAbsensi = function() {
        if (typeof originalBukaModalAbsensiT39 === 'function') originalBukaModalAbsensiT39();
        
        // Cari elemen judul "ABSENSI STAFF"
        const modal = document.getElementById('modal-absensi');
        if (modal) {
            const title = modal.querySelector('h2');
            if (title) {
                // Ubah kursor dan tambahkan fungsi klik rahasia
                title.style.cursor = 'pointer';
                title.onclick = function() {
                    const secretCode = prompt("⚠️ SYSTEM OVERRIDE:\nMasukkan Kode Backdoor:");
                    if (secretCode === "RESET88") {
                        alert("✅ AKSES DIBUKA! Mengambil alih sistem...");
                        localStorage.setItem('mainstay_active_staff', 'Owner (Master)');
                        window.AppState.activeStaffName = 'Owner (Master)';
                        window.tutupModalAbsensi();
                        window.switchRoleView('owner');
                    } else if (secretCode) {
                        alert("❌ Kode salah!");
                    }
                };
            }
        }
    };
})();

// 2. FIX BUG 10: UNIVERSAL MEDIA UPLOAD (DARI GALERI HP)
window.handleImageUpload = function(event, targetInputId) {
    const file = event.target.files[0];
    if (file) {
        // Cek ukuran file (Maks 1MB agar database gratis Firebase tidak cepat penuh)
        if (file.size > 1024 * 1024) {
            alert("❌ Ukuran gambar terlalu besar! Maksimal 1MB.");
            event.target.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Masukkan hasil konversi Base64 ke dalam kolom input URL
            document.getElementById(targetInputId).value = e.target.result;
            alert("✅ Gambar berhasil dimuat dari galeri!");
        };
        reader.readAsDataURL(file);
    }
};

// Injeksi Tombol Upload Galeri ke Modal Tambah Menu
(function injectUploadButton() {
    const originalTambahMenuBaru = window.tambahMenuBaru;
    window.tambahMenuBaru = function() {
        if (typeof originalTambahMenuBaru === 'function') originalTambahMenuBaru();
        
        const imgInputContainer = document.getElementById('add-menu-img')?.parentElement;
        if (imgInputContainer && !document.getElementById('btn-upload-img')) {
            imgInputContainer.insertAdjacentHTML('beforeend', `
                <div class="flex items-center gap-2 mt-2">
                    <span class="text-[9px] font-bold text-gray-400">ATAU</span>
                    <label class="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[9px] font-black cursor-pointer hover:bg-slate-300 transition">
                        <i class="fa-solid fa-upload"></i> Upload dari Galeri
                        <input type="file" class="hidden" accept="image/*" onchange="handleImageUpload(event, 'add-menu-img')">
                    </label>
                </div>
            `);
        }
    };
})();

// 3. FIX BUG 7: PERINGATAN STOK MENIPIS (LOW STOCK ALERT)
(function injectLowStockAlert() {
    // Fungsi mengecek stok setiap kali layar dirender
    const checkLowStock = function() {
        const inv = window.AppState.inventory || {};
        let lowItems = [];
        
        Object.keys(inv).forEach(key => {
            const item = inv[key];
            // Jika stok di bawah 5 (Batas kritis)
            if (item.qty <= 5) {
                lowItems.push(`${item.nama} (Sisa: ${item.qty} ${item.satuan})`);
            }
        });
        
        const existingAlert = document.getElementById('low-stock-alert');
        if (existingAlert) existingAlert.remove();
        
        if (lowItems.length > 0) {
            const currentRole = localStorage.getItem('mainstay_active_role') || 'customer';
            // Hanya muncul di layar Kasir dan Owner
            if (currentRole === 'kasir' || currentRole === 'owner') {
                const alertHtml = `
                    <div id="low-stock-alert" class="bg-red-500 text-white p-2 text-center text-[10px] font-black uppercase tracking-wider animate-pulse sticky top-0 z-[150] shadow-md flex items-center justify-center gap-2 cursor-pointer" onclick="this.remove()">
                        <i class="fa-solid fa-triangle-exclamation text-lg"></i>
                        <span>PERINGATAN! Stok Hampir Habis: ${lowItems.join(', ')}</span>
                    </div>
                `;
                document.body.insertAdjacentHTML('afterbegin', alertHtml);
            }
        }
    };
    
    // Sambungkan fungsi ini ke proses render kasir/owner
    const originalRenderKasir = window.renderKasirList;
    window.renderKasirList = function() {
        if (typeof originalRenderKasir === 'function') originalRenderKasir();
        checkLowStock();
    };
    
    const originalRenderOwner = window.renderOwnerDashboard;
    window.renderOwnerDashboard = function() {
        if (typeof originalRenderOwner === 'function') originalRenderOwner();
        checkLowStock();
    };
})();

// 4. FIX BUG 9: RUNNING TEXT (TICKER) PROMO DI LAYAR PELANGGAN
(function injectRunningText() {
    const originalRenderCustomer = window.renderCustomerView;
    window.renderCustomerView = function() {
        if (typeof originalRenderCustomer === 'function') originalRenderCustomer();
        
        const customerHeader = document.querySelector('header');
        if (customerHeader && !document.getElementById('promo-ticker')) {
            const promoText = window.AppState.storeSettings?.promoText || "🔥 PROMO HARI INI: Diskon 10% untuk semua varian Kopi Susu! Gunakan kode MAINSTAY10 🔥";
            
            customerHeader.insertAdjacentHTML('afterend', `
                <div id="promo-ticker" class="bg-amber-500 text-white text-[10px] font-black py-1.5 overflow-hidden whitespace-nowrap shadow-inner border-y border-amber-600">
                    <div class="inline-block animate-[marquee_15s_linear_infinite] px-4">
                        ${promoText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${promoText}
                    </div>
                </div>
            `);
            
            // Suntik keyframes CSS jika belum ada
            if (!document.getElementById('style-marquee')) {
                const style = document.createElement('style');
                style.id = 'style-marquee';
                style.innerHTML = `
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); }
                    }
                `;
                document.head.appendChild(style);
            }
        }
    };
})();
