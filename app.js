/* ==========================================================================
   MAINSTAY DRINK POS - MAIN APPLICATION SCRIPT (app.js) 
   Target Device: Infinix Note 30 Pro & Multi-Device Responsive
   ========================================================================== */

/* --------------------------------------------------------------------------
   PART 1: FIREBASE INIT, GLOBAL STATE, & UTILITIES
   -------------------------------------------------------------------------- */

// 1. IMPORT FIREBASE SDK (MODULAR)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. HARDCODED FIREBASE CONFIGURATION (Data Produksi Wajib)
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

// 3. INITIALIZE FIREBASE APP & DATABASE
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Wajib mengekspos db ke window agar bisa diakses oleh fungsi di part selanjutnya
window.db = db; 

// 4. GLOBAL APPLICATION STATE (Menyimpan Konteks Sesi & Navigasi)
window.AppState = {
    currentRole: 'customer',       // Peran yang sedang aktif: 'customer', 'kasir', 'owner'
    targetLoginRole: '',           // Mengingat modal login mana yang sedang dibuka
    activeStaffName: null,         // Mencatat nama staf yang sedang Check-In (Absen)
    cart: [],                      // Keranjang pesanan customer / kasir
    activeMenuForDetail: null,     // Menu yang sedang dibuka detail/kustomisasinya
    currentAttendanceStream: null, // Stream video kamera depan untuk absensi
    storeSettings: {
        phoneWA: '628977099557',   // Default WA Resto (bisa diganti di panel)
        isOpen: true,              // Emergency Switch Toko
        audioEnabled: true
    },
    // Elemen Audio untuk notifikasi 3-Tab Dapur
    audioMasuk: document.getElementById('audio-masuk'),
    audioSiap: document.getElementById('audio-siap')
};

// 5. CORE UTILITIES & FORMATTER
// Menjalankan jam digital real-time beserta detik (HH:MM:SS) di Header
window.initLiveClock = function() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;

    setInterval(() => {
        const now = new Date();
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
        
        const dateStr = now.toLocaleDateString('id-ID', dateOptions);
        const timeStr = now.toLocaleTimeString('id-ID', timeOptions);
        
        clockEl.innerText = `${dateStr} ${timeStr} WIB`;
    }, 1000);
};

// Mengubah format angka menjadi format mata uang Rupiah
window.formatRupiah = function(angka) {
    if(!angka) return "Rp 0";
    return 'Rp ' + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Mengubah otomatis format nomor HP (awalan 0 menjadi 62)
window.formatPhoneWA = function(phone) {
    let p = phone.trim();
    if (p.startsWith('0')) {
        p = '62' + p.substring(1);
    }
    return p;
};

// Mengontrol Screen Flash Visual (Animasi Kedip Layar untuk Notifikasi)
window.triggerScreenFlash = function() {
    const flash = document.getElementById('screen-flash');
    if(flash) {
        flash.classList.remove('hidden');
        flash.classList.remove('opacity-0');
        flash.classList.add('opacity-30');
        
        setTimeout(() => {
            flash.classList.add('opacity-0');
            flash.classList.remove('opacity-30');
            setTimeout(() => flash.classList.add('hidden'), 300);
        }, 400);
    }
};

// Menjalankan fungsi dasar saat HTML selesai dimuat
window.addEventListener('DOMContentLoaded', () => {
    initLiveClock();
    console.log("Mainstay POS - Part 1 (Core) Initialized.");
});
/* --------------------------------------------------------------------------
   PART 2: SPA ROLE SWITCHING, CONTEXT-AWARE NAVIGATION & PIN AUTH
   -------------------------------------------------------------------------- */

// 1. SWITCH ROLE VIEW (Navigasi Bawah & SPA Container)
window.switchRoleView = function(role) {
    window.AppState.currentRole = role;
    
    // Sembunyikan semua kontainer layar utama
    document.getElementById('view-customer').classList.add('hidden');
    document.getElementById('view-kasir').classList.add('hidden');
    document.getElementById('view-owner').classList.add('hidden');
    
    // Reset gaya Navigasi Bawah (Bottom Nav) ke mode pasif
    document.querySelectorAll('.nav-indicator').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('text-amber-500');
        el.classList.add('text-gray-400');
    });

    // Logika Pemilihan Tampilan Berdasarkan Peran
    if (role === 'customer') {
        document.getElementById('view-customer').classList.remove('hidden');
        document.getElementById('nav-customer').classList.remove('text-gray-400');
        document.getElementById('nav-customer').classList.add('text-amber-500');
        document.getElementById('nav-customer').querySelector('.nav-indicator').classList.remove('hidden');
    } 
    else if (role === 'kasir') {
        // Keamanan: Cegah akses langsung, wajib lewat verifikasi PIN
        openLoginModal('kasir');
    } 
    else if (role === 'owner') {
        // Keamanan: Cegah akses langsung, wajib lewat verifikasi PIN
        openLoginModal('owner');
    }
};

// 2. MODAL LOGIN (Membuka panel PIN dengan konteks target)
window.openLoginModal = function(targetRole) {
    window.AppState.targetLoginRole = targetRole;
    
    const modal = document.getElementById('modal-login');
    const title = document.getElementById('login-title');
    const desc = document.getElementById('login-desc');
    const pinInput = document.getElementById('login-pin');
    
    // Set teks instruksi sesuai peran
    if (targetRole === 'kasir') {
        title.innerText = "PIN Kasir / Staff";
        desc.innerText = "Masukkan 6 digit PIN staff Anda untuk mulai bertugas.";
    } else {
        title.innerText = "Master PIN Owner";
        desc.innerText = "Masukkan PIN Master untuk otorisasi akses penuh (Owner).";
    }
    
    // Bersihkan form
    pinInput.value = '';
    pinInput.type = 'password';
    document.getElementById('pin-eye-icon').classList.replace('fa-eye-slash', 'fa-eye');
    document.getElementById('login-error').classList.add('hidden');
    
    // Tampilkan Modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    // Auto-focus input PIN (Delay sedikit agar modal render dulu)
    setTimeout(() => pinInput.focus(), 100);
};

// 3. CONTEXT-AWARE EXIT (Tutup modal login tanpa merusak sesi halaman belakang)
window.closeLoginModal = function() {
    document.getElementById('modal-login').classList.add('hidden');
    document.getElementById('modal-login').classList.remove('flex');
    
    // Kembalikan highlight navigasi bawah ke peran yang saat ini sedang aktif secara nyata
    // (Misal: batal login owner, tombol nav kembali nyala di customer)
    switchRoleView(window.AppState.currentRole === window.AppState.targetLoginRole ? 'customer' : window.AppState.currentRole);
};

// 4. TOGGLE PIN VISIBILITY (Mata Intip PIN)
window.togglePinVisibility = function() {
    const pinInput = document.getElementById('login-pin');
    const eyeIcon = document.getElementById('pin-eye-icon');
    
    if (pinInput.type === 'password') {
        pinInput.type = 'text';
        eyeIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pinInput.type = 'password';
        eyeIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

// 5. PROSES VALIDASI LOGIN PIN
window.prosesLogin = function() {
    const pinInput = document.getElementById('login-pin').value.trim();
    const errorMsg = document.getElementById('login-error');
    const target = window.AppState.targetLoginRole;
    
    // Validasi kosong
    if (!pinInput || pinInput.length < 4) {
        errorMsg.innerText = "PIN terlalu pendek!";
        errorMsg.classList.remove('hidden');
        return;
    }

    errorMsg.classList.add('hidden');
    
    // === AUTENTIKASI OWNER ===
    if (target === 'owner') {
        // Cek Master PIN dari hardcoded blueprint
        if (pinInput === "888888" || pinInput === "RESET88") {
            // Sukses Login Owner
            document.getElementById('modal-login').classList.add('hidden');
            document.getElementById('modal-login').classList.remove('flex');
            
            // Tampilkan UI Owner
            window.AppState.currentRole = 'owner';
            document.getElementById('view-owner').classList.remove('hidden');
            document.getElementById('nav-owner').classList.remove('text-gray-400');
            document.getElementById('nav-owner').classList.add('text-amber-500');
            document.getElementById('nav-owner').querySelector('.nav-indicator').classList.remove('hidden');
            
            // Panggil fungsi render Dashboard Owner (akan dibuat di part selanjutnya)
            if(typeof window.loadOwnerDashboard === 'function') window.loadOwnerDashboard();
            
        } else {
            errorMsg.innerText = "Master PIN Salah atau Ditolak!";
            errorMsg.classList.remove('hidden');
        }
    } 
    
    // === AUTENTIKASI KASIR ===
    else if (target === 'kasir') {
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
            const { get, ref } = module;
            const staffRef = ref(window.db, 'staff');
            
            get(staffRef).then((snapshot) => {
                let isValid = false;
                let activeStaff = "Staf Kasir";
                
                // Jika ada data di Firebase
                if (snapshot.exists()) {
                    snapshot.forEach((child) => {
                        const stafData = child.val();
                        if (stafData.pin === pinInput) {
                            isValid = true;
                            activeStaff = stafData.name;
                        }
                    });
                }
                
                // Fallback PIN default sesuai di HTML untuk testing
                if (pinInput === "123456" || pinInput === "654321") {
                    isValid = true;
                    activeStaff = pinInput === "123456" ? "Budi (Kasir 1)" : "Siti (Kasir 2)";
                }
                
                if (isValid) {
                    // Sukses Login Kasir
                    window.AppState.activeStaffName = activeStaff;
                    document.getElementById('modal-login').classList.add('hidden');
                    document.getElementById('modal-login').classList.remove('flex');
                    
                    // Tampilkan UI Kasir
                    window.AppState.currentRole = 'kasir';
                    document.getElementById('view-kasir').classList.remove('hidden');
                    document.getElementById('nav-kasir').classList.remove('text-gray-400');
                    document.getElementById('nav-kasir').classList.add('text-amber-500');
                    document.getElementById('nav-kasir').querySelector('.nav-indicator').classList.remove('hidden');
                    
                    // Panggil fungsi render Pesanan Kasir (di part selanjutnya)
                    if(typeof window.loadKasirOrders === 'function') window.loadKasirOrders();
                    
                } else {
                    errorMsg.innerText = "PIN Staff Tidak Ditemukan!";
                    errorMsg.classList.remove('hidden');
                }
            }).catch(err => {
                errorMsg.innerText = "Gagal terhubung ke server.";
                errorMsg.classList.remove('hidden');
            });
        });
    }
};

// 6. PROSES LOGOUT SESI (Keluar Aman)
window.prosesLogout = function(role) {
    if (confirm(`Apakah Anda yakin ingin mengakhiri sesi ${role === 'owner' ? 'Owner' : 'Kasir'}?`)) {
        // Bersihkan state staff aktif
        window.AppState.activeStaffName = null;
        // Kembalikan paksa layar ke mode Customer Publik
        switchRoleView('customer');
    }
};

console.log("Mainstay POS - Part 2 (Navigation & PIN Auth) Initialized.");
/* --------------------------------------------------------------------------
   PART 3: KATALOG MENU (FIREBASE), FILTERING, KUSTOMISASI & FLOATING CART
   -------------------------------------------------------------------------- */

window.AppState.menuData = []; // Menyimpan raw data menu untuk keperluan filter & pencarian

// 1. AMBIL DATA MENU DARI FIREBASE (Real-Time Database)
window.loadCatalogMenu = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        const menuRef = ref(window.db, 'menu');
        
        onValue(menuRef, (snapshot) => {
            let data = snapshot.val();
            
            // Dummy Data Fallback (Akan muncul jika database Firebase masih kosong)
            if (!data) {
                data = [
                    { id: '1', name: 'Es Kopi Mainstay', category: 'coffee', price: 16000, normalPrice: 20000, img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300', available: true, bestSeller: true, stampEligible: true, desc: 'Kopi signature khas Mainstay dengan gula aren asli.' },
                    { id: '2', name: 'Matcha Latte Premium', category: 'non-coffee', price: 18000, normalPrice: 22000, img: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300', available: true, bestSeller: true, stampEligible: true, desc: 'Teh hijau matcha jepang dipadukan dengan susu segar.' },
                    { id: '3', name: 'Choco Hazelnut', category: 'non-coffee', price: 17000, normalPrice: 17000, img: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=300', available: false, bestSeller: false, stampEligible: true, desc: 'Coklat kental dengan perisa kacang hazelnut.' }
                ];
            } else {
                // Konversi format Objek Firebase menjadi Array
                data = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            }
            
            window.AppState.menuData = data;
            
            // Render pertama kali menampilkan semua menu (Kategori 'all')
            window.filterKategori('all'); 
        });
    });
};

// 2. RENDER GRID KATALOG MENU KE DALAM HTML
window.renderMenuGrid = function(menus) {
    const grid = document.getElementById('menu-grid');
    grid.innerHTML = '';
    
    // Tampilan jika hasil filter/pencarian kosong
    if (menus.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400 font-bold"><i class="fa-solid fa-face-frown text-3xl mb-2 text-slate-300"></i><br>Menu tidak ditemukan...</div>`;
        return;
    }

    menus.forEach(menu => {
        // Logika Status "Habis" / Sold Out dari Blueprint
        const isHabis = !menu.available;
        
        // Pengaturan gaya visual & fungsi klik berdasarkan stok
        const clickAction = isHabis ? "" : `onclick="openMenuDetail('${menu.id}')"`;
        const visualClass = isHabis ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer group active:scale-95 hover:shadow-lg";
        const badgeBestSeller = menu.bestSeller ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-10 shadow-sm">⭐ Best Seller</span>` : '';
        const badgeSoldOut = isHabis ? `<div class="absolute inset-0 bg-black/40 z-20 flex items-center justify-center"><span class="bg-red-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg transform -rotate-12 border-2 border-white">HABIS</span></div>` : '';
        const coretHarga = (menu.normalPrice > menu.price) ? `<span class="text-[9px] text-gray-400 line-through ml-1">${window.formatRupiah(menu.normalPrice)}</span>` : '';

        // Injeksi komponen Card
        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden transition duration-300 transform ${visualClass}`;
        
        if(!isHabis) card.setAttribute("onclick", clickAction);

        card.innerHTML = `
            ${badgeBestSeller}
            <div class="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden mb-3 relative border border-slate-200">
                ${badgeSoldOut}
                <img src="${menu.img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy" alt="${menu.name}">
            </div>
            <div>
                <h4 class="font-black text-xs text-gray-900 line-clamp-1 leading-snug">${menu.name}</h4>
                <div class="flex items-center gap-1 mt-1">
                    <span class="text-xs font-black text-amber-600 drop-shadow-sm">${window.formatRupiah(menu.price)}</span>
                    ${coretHarga}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
};

// 3. FILTER MENU BERDASARKAN TAB KATEGORI
window.filterKategori = function(kategoriId) {
    // Reset visual warna semua tombol tab kategori
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-slate-100', 'text-gray-600');
    });
    
    // Beri warna terang pada tab yang sedang diklik (mencocokkan onClick value)
    const activeBtn = Array.from(document.querySelectorAll('.cat-btn')).find(btn => btn.getAttribute('onclick').includes(kategoriId));
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-100', 'text-gray-600');
        activeBtn.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md');
    }

    // Filter data asli berdasarkan ID kategori
    let filtered = window.AppState.menuData;
    if (kategoriId !== 'all') {
        filtered = filtered.filter(m => m.category === kategoriId);
    }
    
    // Kosongkan form pencarian saat berpindah tab
    const searchInput = document.getElementById('search-menu');
    if (searchInput) searchInput.value = '';
    
    window.renderMenuGrid(filtered);
};

// 4. PENCARIAN MENU (SEARCH BAR)
window.searchKatalog = function() {
    const keyword = document.getElementById('search-menu').value.toLowerCase();
    
    // Kembalikan highlight tab ke 'all' saat mencari manual
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-slate-100', 'text-gray-600');
    });

    const filtered = window.AppState.menuData.filter(m => 
        m.name.toLowerCase().includes(keyword) || 
        (m.desc && m.desc.toLowerCase().includes(keyword))
    );
    
    window.renderMenuGrid(filtered);
};

// 5. MEMBUKA MODAL KUSTOMISASI DETAIL MENU (Klik dari grid)
window.openMenuDetail = function(menuId) {
    // Temukan objek menu dari ID
    const menu = window.AppState.menuData.find(m => m.id.toString() === menuId.toString());
    if (!menu) return;
    
    window.AppState.activeMenuForDetail = menu;
    
    // Tulis data dasar ke Modal HTML
    document.getElementById('detail-img').src = menu.img;
    document.getElementById('detail-name').innerText = menu.name;
    document.getElementById('detail-desc').innerText = menu.desc || 'Minuman segar pilihan berkualitas.';
    document.getElementById('detail-qty').innerText = "1"; // Reset Qty selalu ke 1
    document.getElementById('detail-total-price').innerText = window.formatRupiah(menu.price);
    
    // Bangun Elemen HTML Kustomisasi Pintar (Ice, Sugar, Size)
    const variantContainer = document.getElementById('detail-variants-container');
    variantContainer.innerHTML = `
        <!-- Pilihan Ukuran (Dynamic Pricing) -->
        <div>
            <label class="text-[10px] font-black text-gray-500 block mb-2 uppercase tracking-wide">Ukuran Gelas (Size)</label>
            <div class="grid grid-cols-2 gap-3">
                <label class="p-3 border-2 border-slate-200 rounded-xl text-xs font-black text-center cursor-pointer has-[:checked]:bg-amber-50 has-[:checked]:border-amber-500 transition shadow-sm hover:shadow-md">
                    <input type="radio" name="var_size" value="Reguler" data-price="0" class="hidden" checked onchange="kalkulasiHargaDetail()"> Reguler
                </label>
                <label class="p-3 border-2 border-slate-200 rounded-xl text-xs font-black text-center cursor-pointer has-[:checked]:bg-amber-50 has-[:checked]:border-amber-500 transition shadow-sm hover:shadow-md">
                    <input type="radio" name="var_size" value="Large" data-price="3000" class="hidden" onchange="kalkulasiHargaDetail()"> Large (+Rp 3rb)
                </label>
            </div>
        </div>
        
        <!-- Pilihan Gula & Es -->
        <div class="grid grid-cols-2 gap-4 mt-1">
            <div>
                <label class="text-[10px] font-black text-gray-500 block mb-2 uppercase tracking-wide">Level Gula</label>
                <select id="var_sugar" class="w-full bg-slate-50 border border-slate-200 text-xs font-black rounded-xl p-3 focus:outline-none focus:border-amber-500 shadow-inner">
                    <option value="Normal">Normal (100%)</option>
                    <option value="Less Sugar">Less (50%)</option>
                    <option value="No Sugar">No Sugar (0%)</option>
                </select>
            </div>
            <div>
                <label class="text-[10px] font-black text-gray-500 block mb-2 uppercase tracking-wide">Level Es</label>
                <select id="var_ice" class="w-full bg-slate-50 border border-slate-200 text-xs font-black rounded-xl p-3 focus:outline-none focus:border-amber-500 shadow-inner">
                    <option value="Normal">Normal Ice</option>
                    <option value="Less Ice">Less Ice</option>
                    <option value="No Ice">No Ice</option>
                </select>
            </div>
        </div>
    `;
    
    // Tampilkan Modal Animasi Naik (Slide Up)
    const modal = document.getElementById('modal-menu-detail');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// 6. TUTUP MODAL DETAIL (Context-Aware Exit)
window.closeMenuDetail = function() {
    const modal = document.getElementById('modal-menu-detail');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    window.AppState.activeMenuForDetail = null; // Bersihkan state memori menu
};

// 7. TAMBAH/KURANG KUANTITAS MENU (Tombol Plus Minus)
window.updateQty = function(change) {
    const qtyEl = document.getElementById('detail-qty');
    let currentQty = parseInt(qtyEl.innerText) || 1;
    
    currentQty += change;
    if(currentQty < 1) currentQty = 1; // Mengunci agar tidak bisa minus atau 0
    
    qtyEl.innerText = currentQty;
    window.kalkulasiHargaDetail(); // Update grand total di tombol bawah secara live
};

// 8. LIVE KALKULASI HARGA DI TOMBOL CHECKOUT (Size + Qty)
window.kalkulasiHargaDetail = function() {
    const menu = window.AppState.activeMenuForDetail;
    if(!menu) return;
    
    const qty = parseInt(document.getElementById('detail-qty').innerText) || 1;
    let basePrice = parseInt(menu.price);
    
    // Deteksi harga varian (misal pilih Large +3000)
    const selectedSize = document.querySelector('input[name="var_size"]:checked');
    if (selectedSize && selectedSize.dataset.price) {
        basePrice += parseInt(selectedSize.dataset.price);
    }
    
    // Set Grand Total Akhir
    const grandTotal = basePrice * qty;
    document.getElementById('detail-total-price').innerText = window.formatRupiah(grandTotal);
};

// 9. PROSES TAMBAH KE KERANJANG (MASUK DATA STATE KERANJANG)
window.addToCart = function() {
    const menu = window.AppState.activeMenuForDetail;
    const qty = parseInt(document.getElementById('detail-qty').innerText);
    
    // Tarik value kustomisasi HTML
    const sizeOption = document.querySelector('input[name="var_size"]:checked');
    const sugarOption = document.getElementById('var_sugar').value;
    const iceOption = document.getElementById('var_ice').value;
    
    let unitPrice = parseInt(menu.price);
    let variantText = []; // Tempat penampung text pesanan dapur
    
    // Analisa Teks Varian
    if (sizeOption.value !== "Reguler") {
        unitPrice += parseInt(sizeOption.dataset.price);
        variantText.push(`Size: ${sizeOption.value}`);
    }
    if (sugarOption !== "Normal") variantText.push(`Gula: ${sugarOption}`);
    if (iceOption !== "Normal") variantText.push(`Es: ${iceOption}`);
    
    // Penggabungan Catatan Kustomisasi untuk dapur
    const notes = variantText.length > 0 ? variantText.join(', ') : 'Original';
    const subtotal = unitPrice * qty;
    
    // Simpan dalam format Objek JSON rapih
    const cartItem = {
        id: menu.id + "_" + Date.now(), // Unik Anti-Collision ID item
        menuId: menu.id,
        name: menu.name,
        qty: qty,
        unitPrice: unitPrice,
        subtotal: subtotal,
        notes: notes,
        stampEligible: menu.stampEligible
    };
    
    window.AppState.cart.push(cartItem);
    
    // Bersihkan layar & beri efek visual sukses
    window.closeMenuDetail();
    window.updateCartBadge();
    window.triggerScreenFlash();
};

// 10. UPDATE VISUAL TOMBOL KERANJANG MELAYANG (FLOATING CART)
window.updateCartBadge = function() {
    const badgeEl = document.getElementById('cart-badge');
    const totalFloatEl = document.getElementById('cart-total-float');
    const floatingCartPanel = document.getElementById('floating-cart');
    
    let totalItems = 0;
    let grandTotal = 0;
    
    // Kalkulasi Total Global Keranjang
    window.AppState.cart.forEach(item => {
        totalItems += item.qty;
        grandTotal += item.subtotal;
    });
    
    badgeEl.innerText = totalItems;
    totalFloatEl.innerText = window.formatRupiah(grandTotal);
    
    // Otomatis Muncul/Sembunyi berdasarkan isi keranjang
    if (totalItems > 0) {
        floatingCartPanel.classList.remove('hidden');
    } else {
        floatingCartPanel.classList.add('hidden');
    }
};

// Panggil fungsi muat data menu (Delay sedikit setelah file js siap di DOM)
setTimeout(() => {
    if(typeof window.loadCatalogMenu === 'function') window.loadCatalogMenu();
}, 200);

console.log("Mainstay POS - Part 3 (Catalog & Floating Cart) Initialized.");
/* --------------------------------------------------------------------------
   PART 4: KERANJANG BELANJA (CART REVIEW), CHECKOUT & QRIS HANDLING
   -------------------------------------------------------------------------- */

window.AppState.cartDiscount = 0; // State untuk menyimpan nominal diskon voucher

// 1. MEMBUKA MODAL KERANJANG (CART SUMMARY REVIEW)
window.openCartModal = function() {
    const modal = document.getElementById('modal-cart');
    const container = document.getElementById('cart-items-container');
    
    // Label penginput otomatis berubah (Apakah Kasir/Owner yg ambil alih, atau murni Customer)
    let actorLabel = window.AppState.currentRole === 'customer' ? 'Customer Publik' : 
                    (window.AppState.currentRole === 'kasir' ? `Kasir (${window.AppState.activeStaffName})` : 'Owner (Master)');
    document.getElementById('cart-actor-label').innerText = `Penginput: ${actorLabel}`;
    
    container.innerHTML = ''; // Bersihkan kontainer lama
    let subtotal = 0;
    
    // Looping daftar pesanan dari Global State Cart
    window.AppState.cart.forEach((item, index) => {
        subtotal += item.subtotal;
        
        container.innerHTML += `
            <div class="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                <div class="pr-8">
                    <h5 class="text-sm font-black text-gray-900 leading-tight">${item.name}</h5>
                    <p class="text-[10px] font-bold text-gray-500 mt-1 bg-white inline-block px-2 py-0.5 rounded border border-gray-200">
                        ${item.qty}x @ ${window.formatRupiah(item.unitPrice)}
                    </p>
                    <p class="text-[9px] font-black text-amber-600 mt-1 uppercase tracking-wider"><i class="fa-solid fa-pen-clip text-gray-400 mr-1"></i> ${item.notes}</p>
                </div>
                <div class="text-right flex flex-col items-end">
                    <span class="text-sm font-black text-amber-600 drop-shadow-sm">${window.formatRupiah(item.subtotal)}</span>
                    <button onclick="hapusItemKeranjang(${index})" class="mt-2 w-7 h-7 bg-red-100 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash-can text-xs"></i></button>
                </div>
            </div>
        `;
    });
    
    // Render Total Angka Transparansi
    document.getElementById('cart-subtotal').innerText = window.formatRupiah(subtotal);
    
    const grandTotal = subtotal - window.AppState.cartDiscount;
    document.getElementById('cart-grand-total').innerText = window.formatRupiah(grandTotal);
    
    // Tampilkan Modal Animasi Naik (Slide Up)
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

// 2. TUTUP MODAL KERANJANG
window.closeCartModal = function() {
    document.getElementById('modal-cart').classList.add('hidden');
    document.getElementById('modal-cart').classList.remove('flex');
};

// 3. HAPUS ITEM DARI KERANJANG (Fitur Koreksi)
window.hapusItemKeranjang = function(index) {
    if(confirm("Hapus item ini dari pesanan?")) {
        window.AppState.cart.splice(index, 1);
        window.updateCartBadge(); // Update ikon mengapung
        
        // Jika keranjang jadi kosong, otomatis tutup modal
        if (window.AppState.cart.length === 0) {
            window.closeCartModal();
        } else {
            window.openCartModal(); // Re-render modal keranjang
        }
    }
};

// 4. TERAPKAN VOUCHER PROMO (Visual Front-End)
window.terapkanPromo = function() {
    const promoCode = document.getElementById('co-promo').value.trim().toUpperCase();
    if (!promoCode) return;
    
    // (Integrasi Pengecekan Database Firebase Voucher akan ada di Part Lanjutan)
    // Untuk saat ini, mari buat contoh dummy voucher "PROMO20" potongan 20rb
    if (promoCode === "PROMO20") {
        window.AppState.cartDiscount = 20000;
        document.getElementById('cart-discount-row').classList.remove('hidden');
        document.getElementById('cart-discount-value').innerText = `- ${window.formatRupiah(20000)}`;
        alert("🎉 Voucher berhasil diterapkan!");
        window.openCartModal(); // Re-render nominal
    } else {
        alert("Kode Voucher tidak valid atau sudah kedaluwarsa!");
        window.AppState.cartDiscount = 0;
        document.getElementById('cart-discount-row').classList.add('hidden');
        window.openCartModal();
    }
};

// 5. PROSES CHECKOUT FINAL KE FIREBASE (Order Generation)
window.prosesCheckout = function() {
    // Validasi Keranjang Kosong
    if (window.AppState.cart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }

    const name = document.getElementById('co-name').value.trim();
    let phone = document.getElementById('co-phone').value.trim();
    const orderType = document.querySelector('input[name="co_tipe"]:checked').value;
    
    // Logika Blueprint: Pre-Order WAJIB isi Nama & Nomor WA
    if (orderType === "Pre-Order (PO)") {
        if (!name || !phone) {
            alert("⚠️ Sistem Pre-Order (PO) MEWAJIBKAN pengisian Nama dan Nomor WhatsApp aktif!");
            return;
        }
    }
    
    // Format nomor HP agar otomatis jadi awalan 62 (Standar WhatsApp)
    if (phone) phone = window.formatPhoneWA(phone);
    
    const isMember = document.getElementById('co-member').checked; // Klasifikasi Member
    const paymentMethod = document.querySelector('input[name="co_payment"]:checked').value;
    
    // Kalkulasi Total
    let subtotal = 0;
    window.AppState.cart.forEach(item => subtotal += item.subtotal);
    const grandTotal = subtotal - window.AppState.cartDiscount;
    
    // ==========================================
    // GENERATE ANTI-COLLISION ORDER ID PINTAR
    // ==========================================
    // Aturan Blueprint: {Aktor}-{Metode/Tipe}-{YYMMDD}-{Hash}
    const actorPrefix = window.AppState.currentRole === 'customer' ? 'CUS' : 'KSR';
    const typeMiddle = orderType === "Pre-Order (PO)" ? 'PO' : (paymentMethod === 'Tunai' ? 'CSH' : 'QRS');
    
    // Ambil format tanggal YYMMDD (Misal: 260901 untuk 1 Sep 2026)
    const dateObj = new Date();
    const yy = dateObj.getFullYear().toString().slice(-2);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    
    // Random 4 digit hash unik (Kombinasi Huruf dan Angka)
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const orderId = `${actorPrefix}-${typeMiddle}-${yy}${mm}${dd}-${hash}`;
    
    // ==========================================
    // STRUKTUR DATA PESANAN YANG AKAN DI-PUSH KE FIREBASE
    // ==========================================
    const orderData = {
        orderId: orderId,
        actor: window.AppState.currentRole, // 'customer', 'kasir', 'owner'
        staffName: window.AppState.activeStaffName || 'Mandiri (Self-Order)',
        customerName: name || 'Anonim',
        customerPhone: phone || '',
        isMember: isMember,
        orderType: orderType,
        paymentMethod: paymentMethod,
        items: window.AppState.cart,
        subtotal: subtotal,
        discount: window.AppState.cartDiscount,
        grandTotal: grandTotal,
        status: 'pending', // Masuk ke Dapur Tab 1 (Konfirmasi)
        timestamp: Date.now()
    };

    // Impor modular Firebase dan eksekusi penyimpanan (Kirim ke Realtime Database)
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        const orderRef = ref(window.db, 'orders/' + orderId);
        
        // Simpan data order
        set(orderRef, orderData).then(() => {
            // Bersihkan Keranjang Setelah Berhasil Disimpan
            window.AppState.cart = [];
            window.AppState.cartDiscount = 0;
            document.getElementById('co-name').value = '';
            document.getElementById('co-phone').value = '';
            document.getElementById('co-promo').value = '';
            window.updateCartBadge();
            window.closeCartModal();
            
            // Pemicu Suara Bel "Pesanan Masuk" di latar belakang jika pengaturan aktif
            if(window.AppState.storeSettings.audioEnabled && window.AppState.audioMasuk) {
                 window.AppState.audioMasuk.play().catch(e => console.log("Audio play diizinkan user interaction."));
            }
            
            // NAVIGASI SETELAH SUKSES (QRIS vs TUNAI)
            if (paymentMethod === 'QRIS Resto') {
                // Tampilkan Modal QRIS
                document.getElementById('qris-antrean').innerText = orderId;
                document.getElementById('qris-total-bayar').innerText = window.formatRupiah(grandTotal);
                
                // Ambil link QRIS dari Pengaturan Toko
                import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((mod) => {
                    mod.get(mod.ref(window.db, 'settings/qris')).then((snap) => {
                        const qrisImg = snap.val() || 'qris-mainstay.png';
                        document.getElementById('qris-img-display').src = qrisImg;
                    });
                });
                
                document.getElementById('modal-qris').classList.remove('hidden');
                document.getElementById('modal-qris').classList.add('flex');
            } else {
                // Jika Tunai
                alert(`✅ Pesanan Tunai Berhasil Dibuat!\nNo. Order: ${orderId}\n\nSilakan tunjukkan nomor ini ke kasir untuk melakukan pembayaran.`);
                window.switchRoleView('customer'); // Kembalikan ke layar utama
            }
            
        }).catch((error) => {
            alert("Terjadi kesalahan sistem saat memproses pesanan. Coba lagi.");
            console.error(error);
        });
    });
};

// 6. FUNGSI PENUTUPAN / PEMBATALAN TAMPILAN QRIS
window.batalQRIS = function() {
    document.getElementById('modal-qris').classList.add('hidden');
    document.getElementById('modal-qris').classList.remove('flex');
    window.switchRoleView('customer');
};

// 7. FUNGSI UNDUH GAMBAR QRIS (Native JS Pemicu Download)
window.unduhQRIS = function() {
    const qrisSrc = document.getElementById('qris-img-display').src;
    // Karena keterbatasan cross-origin tanpa backend, kita gunakan trik tab baru
    window.open(qrisSrc, '_blank');
};

// 8. FUNGSI KIRIM BUKTI WA OTOMATIS (WhatsApp API Text Formatting)
window.kirimBuktiWA = function() {
    const orderId = document.getElementById('qris-antrean').innerText;
    const nomorTujuan = window.AppState.storeSettings.phoneWA;
    const pesanTeks = encodeURIComponent(`Halo Kak, ini bukti transfer QRIS saya untuk pembayaran pesanan nomor:\n*${orderId}*\n\n(Mohon dilampirkan foto tangkapan layar/screenshot bukti transfer di bawah chat ini).`);
    
    // Redirect ke WhatsApp (Otomatis buka aplikasi WA di HP)
    window.open(`https://wa.me/${nomorTujuan}?text=${pesanTeks}`, '_blank');
    
    // Tutup modal
    window.batalQRIS();
};

console.log("Mainstay POS - Part 4 (Cart, Checkout & QRIS) Initialized.");
/* --------------------------------------------------------------------------
   PART 5: DASHBOARD KASIR, 3-TAB KITCHEN SYSTEM & THERMAL PRINTING
   -------------------------------------------------------------------------- */

window.AppState.activeKasirTab = 'konfirmasi'; // Default tab kasir
window.AppState.rawOrders = {}; // Cache order data untuk cetak struk

// 1. PINDAH TAB KASIR (Konfirmasi, Dapur, Selesai)
window.switchKasirTab = function(tabName) {
    window.AppState.activeKasirTab = tabName;
    
    // Reset gaya tombol tab
    const tabs = ['konfirmasi', 'dapur', 'selesai'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if(btn) {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-amber-600');
            btn.classList.add('text-slate-500');
        }
    });
    
    // Aktifkan tab yang dipilih
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if(activeBtn) {
        activeBtn.classList.add('bg-white', 'shadow-sm', 'text-amber-600');
        activeBtn.classList.remove('text-slate-500');
    }
    
    // Muat ulang daftar pesanan sesuai tab aktif
    window.renderKasirList();
};

// 2. LOAD DATA PESANAN DARI FIREBASE (Real-Time Listener)
window.loadKasirOrders = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        const ordersRef = ref(window.db, 'orders');
        
        onValue(ordersRef, (snapshot) => {
            const data = snapshot.val();
            window.AppState.rawOrders = data || {};
            
            let countPending = 0;
            let countDapur = 0;
            
            // Hitung Badge Notifikasi
            if(data) {
                Object.values(data).forEach(ord => {
                    if(ord.status === 'pending') countPending++;
                    if(ord.status === 'dapur') countDapur++;
                });
            }
            
            // Update UI Badge Angka
            const badgeKonfirmasi = document.getElementById('badge-konfirmasi');
            const badgeDapur = document.getElementById('badge-dapur');
            
            if(badgeKonfirmasi) {
                badgeKonfirmasi.innerText = countPending;
                if(countPending > 0) badgeKonfirmasi.classList.remove('hidden');
                else badgeKonfirmasi.classList.add('hidden');
            }
            
            if(badgeDapur) {
                badgeDapur.innerText = countDapur;
                if(countDapur > 0) badgeDapur.classList.remove('hidden');
                else badgeDapur.classList.add('hidden');
            }
            
            // Render Daftar Visual
            window.renderKasirList();
        });
    });
};

// 3. RENDER KARTU PESANAN KE DALAM TAB YANG AKTIF
window.renderKasirList = function() {
    const container = document.getElementById('kasir-list-container');
    if(!container) return;
    container.innerHTML = '';
    
    const orders = window.AppState.rawOrders;
    const tab = window.AppState.activeKasirTab;
    
    // Filter pesanan sesuai tab (pending / dapur / selesai)
    const filteredOrders = Object.values(orders).filter(ord => ord.status === tab);
    
    // Urutkan: Jika pending (terlama di atas agar dikerjakan dulu). Jika selesai (terbaru di atas).
    filteredOrders.sort((a, b) => tab === 'selesai' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <i class="fa-solid fa-clipboard-list text-3xl opacity-50 text-slate-500"></i>
                </div>
                <p class="text-sm font-black text-slate-500">Belum ada antrean di tab ini.</p>
            </div>
        `;
        return;
    }
    
    // Render Kartu Pesanan HTML
    filteredOrders.forEach(ord => {
        const isQRIS = ord.paymentMethod === 'QRIS Resto';
        const qrisBadge = isQRIS ? `<span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px]"><i class="fa-solid fa-qrcode"></i> QRIS (Cek WA)</span>` : `<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[9px]"><i class="fa-solid fa-money-bill-wave"></i> TUNAI</span>`;
        const timeStr = new Date(ord.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        
        let actionsHtml = '';
        
        // Tombol Aksi Berdasarkan Tab
        if (tab === 'pending') {
            actionsHtml = `
                <button onclick="updateOrderStatus('${ord.orderId}', 'dapur')" class="flex-1 bg-green-500 text-white text-xs font-black py-2.5 rounded-xl shadow-sm hover:bg-green-600 transition"><i class="fa-solid fa-fire-burner mr-1"></i> Terima & Masak</button>
                <button onclick="batalkanPesanan('${ord.orderId}')" class="flex-1 bg-red-50 text-red-600 text-xs font-black py-2.5 rounded-xl shadow-sm border border-red-200 hover:bg-red-100 transition"><i class="fa-solid fa-xmark mr-1"></i> Batalkan</button>
            `;
        } else if (tab === 'dapur') {
            actionsHtml = `
                <div class="w-full flex gap-2 flex-wrap md:flex-nowrap">
                    <button onclick="cetakStruk('${ord.orderId}', false)" class="flex-1 bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black py-2.5 rounded-lg shadow-sm hover:bg-blue-100 transition"><i class="fa-solid fa-receipt mr-1"></i> Struk Kasir</button>
                    <button onclick="cetakStruk('${ord.orderId}', true)" class="flex-1 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black py-2.5 rounded-lg shadow-sm hover:bg-amber-100 transition"><i class="fa-solid fa-ticket mr-1"></i> Tiket Dapur</button>
                    <button onclick="kirimStrukWA('${ord.orderId}')" class="flex-1 bg-green-500 text-white text-[10px] font-black py-2.5 rounded-lg shadow-sm hover:bg-green-600 transition"><i class="fa-brands fa-whatsapp text-sm"></i> Kirim Struk</button>
                    <button onclick="updateOrderStatus('${ord.orderId}', 'selesai')" class="w-full md:w-auto bg-gray-900 text-white text-xs font-black px-5 py-2.5 rounded-lg shadow-sm hover:bg-black transition"><i class="fa-solid fa-check mr-1"></i> Selesai</button>
                </div>
            `;
        } else if (tab === 'selesai') {
            actionsHtml = `
                <button onclick="cetakStruk('${ord.orderId}', false)" class="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"><i class="fa-solid fa-print mr-1"></i> Cetak Ulang Struk</button>
            `;
        }

        const card = document.createElement('div');
        card.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-3";
        card.innerHTML = `
            <div class="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded tracking-wider">${ord.orderId}</span>
                        <span class="text-[9px] font-bold text-gray-400"><i class="fa-regular fa-clock"></i> ${timeStr}</span>
                    </div>
                    <h4 class="font-black text-sm text-gray-900">${ord.customerName} <span class="text-[10px] text-gray-500 font-bold">(${ord.customerPhone || '-'})</span></h4>
                    <p class="text-[10px] font-black text-gray-500 mt-1 uppercase"><i class="fa-solid fa-motorcycle text-amber-500 mr-1"></i> ${ord.orderType}</p>
                </div>
                <div class="text-right">
                    <span class="text-sm font-black text-amber-600 block mb-1">${window.formatRupiah(ord.grandTotal)}</span>
                    ${qrisBadge}
                </div>
            </div>
            
            <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs font-bold text-gray-700">
                <p class="text-[9px] text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-200 pb-1">Detail Pesanan:</p>
                <ul class="space-y-1">
                    ${(ord.items || []).map(item => `
                        <li class="flex justify-between">
                            <span>${item.qty}x ${item.name} <span class="text-amber-600 text-[9px]">(${item.notes})</span></span>
                            ${tab !== 'dapur' ? `<span class="text-gray-400 text-[9px]">${window.formatRupiah(item.subtotal)}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="flex gap-2 mt-1">
                ${actionsHtml}
            </div>
        `;
        container.appendChild(card);
    });
};

// 4. UPDATE STATUS PESANAN (Terima / Selesai)
window.updateOrderStatus = function(orderId, newStatus) {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, update } = module;
        const orderRef = ref(window.db, 'orders/' + orderId);
        
        update(orderRef, { status: newStatus }).then(() => {
            if (newStatus === 'dapur' && window.AppState.storeSettings.audioEnabled && window.AppState.audioSiap) {
                // Bunyikan nada sukses diterima (opsional)
            }
        });
    });
};

// 5. BATALKAN PESANAN (Dengan Validasi PIN Owner Khusus Void - Sesuai Blueprint)
window.batalkanPesanan = function(orderId) {
    const pin = prompt("Keamanan Ketat: Pesanan batal membutuhkan otorisasi PIN Master Owner (Void/Refund Log). Masukkan PIN:");
    if (pin !== "888888") {
        alert("Otorisasi Gagal! PIN Master salah.");
        return;
    }
    
    const alasan = prompt("Masukkan alasan pembatalan (Cth: Bahan habis, Customer kabur):");
    if(!alasan) return;

    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, update } = module;
        // Kita ubah status menjadi batal, dan mencatat void log (Blueprint Part 15)
        const orderRef = ref(window.db, 'orders/' + orderId);
        update(orderRef, { 
            status: 'batal',
            voidReason: alasan,
            voidBy: 'Owner',
            voidTimestamp: Date.now()
        }).then(() => {
            alert(`Pesanan ${orderId} resmi dibatalkan dan tercatat di Log Void.`);
        });
    });
};

// 6. LOGIKA CETAK STRUK THERMAL (CSS @media print)
window.cetakStruk = function(orderId, isDapurOnly = false) {
    const ord = window.AppState.rawOrders[orderId];
    if(!ord) return alert("Data pesanan tidak ditemukan!");
    
    // Pastikan kontainer cetak tersedia di DOM (Inject dinamis jika belum ada)
    let printContainer = document.getElementById('printable-receipt');
    if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.id = 'printable-receipt';
        document.body.appendChild(printContainer);
    }
    
    const timeStr = new Date(ord.timestamp).toLocaleDateString('id-ID', {
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit'
    });
    
    const namaKasir = document.getElementById('kasir-staf-dropdown').value || window.AppState.activeStaffName;
    const isOwner = window.AppState.currentRole === 'owner';
    const handlerName = isOwner ? 'Owner (Master)' : namaKasir;

    // --- HTML STRUK TIKET DAPUR (TANPA HARGA) ---
    if (isDapurOnly) {
        printContainer.innerHTML = `
            <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 16px;">TIKET DAPUR</h2>
                <h3 style="margin: 5px 0 0; font-size: 18px; font-weight: bold;">ORDER: ${orderId}</h3>
                <p style="margin: 3px 0; font-size: 12px;">Tipe: <b>${ord.orderType.toUpperCase()}</b></p>
            </div>
            <p style="margin: 2px 0;">Customer: <b>${ord.customerName}</b></p>
            <p style="margin: 2px 0;">Waktu: ${timeStr}</p>
            <hr style="border: 1px dashed #000; margin: 5px 0;">
            <ul style="list-style: none; padding: 0; margin: 0; font-size: 14px;">
                ${(ord.items || []).map(item => `
                    <li style="margin-bottom: 8px;">
                        <span style="font-weight: bold; font-size: 16px;">${item.qty}x ${item.name}</span><br>
                        <i style="font-size: 12px; margin-left: 15px;">- ${item.notes}</i>
                    </li>
                `).join('')}
            </ul>
            <hr style="border: 1px dashed #000; margin: 10px 0;">
            <p style="text-align: center; font-size: 10px;">~ Mainstay Drink Kitchen ~</p>
        `;
    } 
    // --- HTML STRUK KASIR LENGKAP (DENGAN HARGA) ---
    else {
        printContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 10px;">
                <h2 style="margin: 0; font-size: 18px;">MAINSTAY DRINK</h2>
                <p style="margin: 2px 0; font-size: 10px;">Minuman Andalanmu</p>
            </div>
            <hr style="border: 1px dashed #000; margin: 5px 0;">
            <p style="margin: 2px 0; font-size: 11px;">Order: ${orderId}</p>
            <p style="margin: 2px 0; font-size: 11px;">Tgl: ${timeStr}</p>
            <p style="margin: 2px 0; font-size: 11px;">Kasir: ${handlerName}</p>
            <p style="margin: 2px 0; font-size: 11px;">Cust: ${ord.customerName}</p>
            <hr style="border: 1px dashed #000; margin: 5px 0;">
            <table style="width: 100%; font-size: 11px; margin-bottom: 5px;">
                ${(ord.items || []).map(item => `
                    <tr>
                        <td colspan="2" style="padding-top: 4px;"><b>${item.name}</b></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 5px;">${item.qty}x @ ${item.unitPrice}</td>
                        <td style="text-align: right;">${item.subtotal}</td>
                    </tr>
                    <tr><td colspan="2" style="font-size: 9px; font-style: italic; padding-left: 5px; color: #555;">Kust: ${item.notes}</td></tr>
                `).join('')}
            </table>
            <hr style="border: 1px dashed #000; margin: 5px 0;">
            ${ord.discount > 0 ? `<p style="margin: 2px 0; font-size: 11px; text-align: right;">Diskon: -${ord.discount}</p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; font-weight: bold; text-align: right;">TOTAL: ${window.formatRupiah(ord.grandTotal)}</p>
            <p style="margin: 2px 0; font-size: 11px; text-align: right;">Metode: ${ord.paymentMethod}</p>
            <hr style="border: 1px dashed #000; margin: 10px 0;">
            <p style="text-align: center; font-size: 10px;">Terima kasih telah berbelanja!<br>IG: @mainstay.in</p>
        `;
    }
    
    // Eksekusi print browser (Otomatis ditangkap oleh @media print di CSS)
    window.print();
};

// 7. KIRIM STRUK DIGITAL VIA WHATSAPP (Draft API)
window.kirimStrukWA = function(orderId) {
    const ord = window.AppState.rawOrders[orderId];
    if(!ord || !ord.customerPhone) {
        alert("Nomor WhatsApp customer tidak tersedia pada pesanan ini.");
        return;
    }

    const gmapsReviewLink = "https://g.page/mainstay-drink-shop/review?ad";
    let detailItems = ord.items.map(item => `- ${item.qty}x ${item.name} (${item.notes})`).join('\n');
    
    const teksWA = `Halo ${ord.customerName}!\n\nPesanan Anda dari *Mainstay Drink* sudah siap! 🥤\n\n*No. Order:* ${ord.orderId}\n*Rincian Pesanan:*\n${detailItems}\n\n*Total Tagihan:* ${window.formatRupiah(ord.grandTotal)}\n\nTerima kasih telah berbelanja minuman andalanmu! Jika Anda suka, yuk bantu berikan bintang 5 di Google Maps kami:\n⭐ ${gmapsReviewLink}`;
    
    let phone = window.formatPhoneWA(ord.customerPhone);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(teksWA)}`, '_blank');
};

console.log("Mainstay POS - Part 5 (Kasir & Dapur) Initialized.");
/* --------------------------------------------------------------------------
   PART 6: LIVE CASH DRAWER MONITOR, KAS KELUAR & SHIFT CLOSING (AUDIT)
   -------------------------------------------------------------------------- */

window.AppState.dailyFinance = {
    startingCash: 0, // Modal Awal Laci
    totalCashSales: 0, // Penjualan Tunai
    totalQrisSales: 0, // Penjualan QRIS
    totalOutflows: 0   // Kas Keluar / Prive Tunai
};

// 1. LISTENER KEUANGAN HARIAN (Firebase)
window.loadDailyFinance = function() {
    const todayStr = new Date().toISOString().slice(0,10); // Format: YYYY-MM-DD
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        const financeRef = ref(window.db, `finance_daily/${todayStr}`);
        
        onValue(financeRef, (snapshot) => {
            const data = snapshot.val() || {};
            window.AppState.dailyFinance.startingCash = data.startingCash || 0;
            
            // Hitung total Kas Keluar hari ini
            let outTotal = 0;
            if(data.outflows) {
                Object.values(data.outflows).forEach(out => outTotal += out.amount);
            }
            window.AppState.dailyFinance.totalOutflows = outTotal;
            
            window.calculateLiveCashDrawer();
        });
    });
};

// 2. KALKULASI REAL-TIME & RENDER DASHBOARD LACI KASIR
window.calculateLiveCashDrawer = function() {
    let cashSales = 0;
    let qrisSales = 0;
    
    // Iterasi dari rawOrders (yang diload di Part 5) untuk hari ini
    const todayCode = new Date().toISOString().slice(2,10).replace(/-/g,''); // Format: YYMMDD
    
    Object.values(window.AppState.rawOrders).forEach(ord => {
        // Abaikan pesanan yang dibatalkan
        if (ord.status === 'batal') return;
        
        // Pastikan hanya pesanan hari ini (berdasarkan OrderID)
        if (ord.orderId.includes(todayCode)) {
            if (ord.paymentMethod === 'Tunai') cashSales += ord.grandTotal;
            if (ord.paymentMethod === 'QRIS Resto') qrisSales += ord.grandTotal;
        }
    });
    
    window.AppState.dailyFinance.totalCashSales = cashSales;
    window.AppState.dailyFinance.totalQrisSales = qrisSales;
    
    // RUMUS EXPECTED CASH (TARGET LACI)
    const startingCash = window.AppState.dailyFinance.startingCash;
    const outflows = window.AppState.dailyFinance.totalOutflows;
    const expectedCash = startingCash + cashSales - outflows;
    const totalOmzet = cashSales + qrisSales;
    
    // Inject atau Update UI Live Cash Drawer di layar Kasir
    window.renderLiveCashUI(totalOmzet, expectedCash);
};

// 3. INJEKSI ELEMEN UI LIVE CASH KE TAMPILAN KASIR
window.renderLiveCashUI = function(omzet, targetKas) {
    const kasirView = document.getElementById('view-kasir');
    if (!kasirView) return;
    
    let cashPanel = document.getElementById('live-cash-panel');
    
    // Jika panel belum ada, buat dan sisipkan di bawah Header Kasir
    if (!cashPanel) {
        cashPanel = document.createElement('div');
        cashPanel.id = 'live-cash-panel';
        cashPanel.className = 'bg-gray-900 px-4 py-3 shadow-md border-b-4 border-amber-500 z-20 relative text-white flex justify-between items-center';
        
        // Sisipkan setelah elemen header pertama di dalam view-kasir
        const headerKasir = kasirView.querySelector('.sticky.top-\\[68px\\]');
        if (headerKasir && headerKasir.nextSibling) {
            headerKasir.parentNode.insertBefore(cashPanel, headerKasir.nextSibling);
        } else {
            kasirView.prepend(cashPanel);
        }
    }
    
    cashPanel.innerHTML = `
        <div>
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Target Fisik Uang di Laci</p>
            <h3 class="text-xl font-black text-amber-400 leading-none">${window.formatRupiah(targetKas)}</h3>
        </div>
        <div class="text-right flex gap-3 items-center">
            <div class="hidden md:block text-right pr-3 border-r border-gray-700">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total Omzet Harian</p>
                <p class="text-sm font-bold text-white">${window.formatRupiah(omzet)}</p>
            </div>
            <button onclick="prosesKasKeluar()" class="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-black px-3 py-2 rounded-lg transition"><i class="fa-solid fa-money-bill-transfer mr-1"></i> Kas Keluar</button>
            <button onclick="prosesTutupShift()" class="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-lg transition shadow-[0_0_10px_rgba(239,68,68,0.3)]"><i class="fa-solid fa-lock mr-1"></i> Tutup Shift</button>
        </div>
    `;
};

// 4. PENCATATAN KAS KELUAR / PRIVE TUNAI
window.prosesKasKeluar = function() {
    const nominal = prompt("Masukkan nominal Kas Keluar / Prive yang diambil dari laci (Angka saja):");
    if (!nominal || isNaN(nominal)) return;
    
    const alasan = prompt("Masukkan alasan / keterangan pengeluaran (Cth: Beli es batu, Prive Owner):");
    if (!alasan) return;
    
    const todayStr = new Date().toISOString().slice(0,10);
    const idKasKeluar = "OUT-" + Date.now();
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        const outRef = ref(window.db, `finance_daily/${todayStr}/outflows/${idKasKeluar}`);
        
        set(outRef, {
            amount: parseInt(nominal),
            reason: alasan,
            staff: window.AppState.activeStaffName || 'Owner',
            timestamp: Date.now()
        }).then(() => {
            alert(`Berhasil mencatat kas keluar sejumlah ${window.formatRupiah(nominal)}.`);
        });
    });
};

// 5. TUTUP SHIFT & AUDIT KASIR (Pencocokan Sistem vs Fisik)
window.prosesTutupShift = function() {
    if (!window.AppState.activeStaffName) {
        alert("Sesi tidak valid. Silakan login ulang.");
        return;
    }
    
    const startingCash = window.AppState.dailyFinance.startingCash;
    const cashSales = window.AppState.dailyFinance.totalCashSales;
    const outflows = window.AppState.dailyFinance.totalOutflows;
    const expectedCash = startingCash + cashSales - outflows;
    
    alert(`PERSIAPAN TUTUP SHIFT\n\nNama Staf: ${window.AppState.activeStaffName}\nSilakan hitung seluruh uang fisik yang ada di dalam laci kasir sekarang.`);
    
    const physicalCashInput = prompt("Masukkan total uang fisik (Cash) yang ada di laci (Angka saja):");
    if (physicalCashInput === null || physicalCashInput === "") return;
    
    const physicalCash = parseInt(physicalCashInput);
    if (isNaN(physicalCash)) {
        alert("Input harus berupa angka!");
        return;
    }
    
    const selisih = physicalCash - expectedCash;
    let statusSelisih = "SEIMBANG (BALANCE) ✅";
    if (selisih > 0) statusSelisih = `LEBIH (PLUS) ${window.formatRupiah(selisih)} ⚠️`;
    if (selisih < 0) statusSelisih = `KURANG (MINUS) ${window.formatRupiah(Math.abs(selisih))} ❌`;
    
    const konfirmasi = confirm(`--- HASIL AUDIT SHIFT ---\n\nTarget Sistem: ${window.formatRupiah(expectedCash)}\nUang Fisik di Laci: ${window.formatRupiah(physicalCash)}\nStatus: ${statusSelisih}\n\nApakah Anda yakin ingin menutup shift dan menyimpan log ini?`);
    
    if (konfirmasi) {
        const shiftId = "SHIFT-" + Date.now();
        const shiftLog = {
            staffName: window.AppState.activeStaffName,
            startingCash: startingCash,
            cashSales: cashSales,
            outflows: outflows,
            expectedCash: expectedCash,
            physicalCash: physicalCash,
            discrepancy: selisih,
            timestamp: Date.now()
        };
        
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
            const { ref, set } = module;
            const logRef = ref(window.db, `shift_logs/${shiftId}`);
            
            set(logRef, shiftLog).then(() => {
                alert("Shift berhasil ditutup dan diaudit. Anda akan dikeluarkan dari sistem.");
                window.prosesLogout('kasir');
            });
        });
    }
};

// Override loadKasirOrders dari Part 5 agar memanggil loadDailyFinance juga
const originalLoadKasirOrders = window.loadKasirOrders;
window.loadKasirOrders = function() {
    originalLoadKasirOrders();
    window.loadDailyFinance();
};

console.log("Mainstay POS - Part 6 (Live Cash Drawer & Shift Closing) Initialized.");
/* --------------------------------------------------------------------------
   PART 7: OWNER MASTER PANEL (DASHBOARD, SETTINGS, & CATALOG CRUD)
   -------------------------------------------------------------------------- */

// 1. RENDER DASHBOARD OWNER (Statistik Pendapatan & Pesanan Real-Time)
window.loadOwnerDashboard = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        const ordersRef = ref(window.db, 'orders');
        
        onValue(ordersRef, (snapshot) => {
            const data = snapshot.val() || {};
            
            let totalPendapatanHariIni = 0;
            let countBaru = 0;
            let countDapur = 0;
            let countSelesai = 0;
            
            const todayCode = new Date().toISOString().slice(2,10).replace(/-/g,''); // YYMMDD
            
            Object.values(data).forEach(ord => {
                // Hanya hitung pesanan hari ini yang TIDAK dibatalkan
                if (ord.orderId.includes(todayCode) && ord.status !== 'batal') {
                    // Pendapatan kotor (setelah diskon, sebelum HPP/Prive)
                    totalPendapatanHariIni += ord.grandTotal;
                    
                    if (ord.status === 'pending') countBaru++;
                    if (ord.status === 'dapur') countDapur++;
                    if (ord.status === 'selesai') countSelesai++;
                }
            });
            
            // Injeksi ke HTML Dashboard Owner
            const elPendapatan = document.getElementById('stat-pendapatan');
            const elBaru = document.getElementById('stat-pesanan');
            const elDapur = document.getElementById('stat-dapur');
            const elSelesai = document.getElementById('stat-selesai');
            
            if(elPendapatan) elPendapatan.innerText = window.formatRupiah(totalPendapatanHariIni);
            if(elBaru) elBaru.innerText = countBaru;
            if(elDapur) elDapur.innerText = countDapur;
            if(elSelesai) elSelesai.innerText = countSelesai;
        });
        
        // Panggil fungsi penyiapan form di dalam panel
        window.loadOwnerSettings();
        window.renderMasterKatalog();
    });
};

// 2. LOAD PENGATURAN TOKO (Form Edit Web & Kontak)
window.loadOwnerSettings = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get } = module;
        
        get(ref(window.db, 'settings')).then((snapshot) => {
            if (snapshot.exists()) {
                const s = snapshot.val();
                
                // Isi input form HTML dengan data dari Firebase
                if(document.getElementById('setting-wa')) document.getElementById('setting-wa').value = s.phoneWA || '';
                if(document.getElementById('setting-logo')) document.getElementById('setting-logo').value = s.logo || '';
                if(document.getElementById('setting-ig')) document.getElementById('setting-ig').value = s.ig || '';
                if(document.getElementById('setting-tiktok')) document.getElementById('setting-tiktok').value = s.tiktok || '';
                if(document.getElementById('setting-qris')) document.getElementById('setting-qris').value = s.qris || '';
                if(document.getElementById('setting-maps')) document.getElementById('setting-maps').value = s.mapsEmbed || '';
                if(document.getElementById('setting-buka')) document.getElementById('setting-buka').checked = s.isOpen !== false; // default true
                if(document.getElementById('setting-audio')) document.getElementById('setting-audio').checked = s.audioEnabled !== false; // default true
                if(document.getElementById('setting-audio-masuk')) document.getElementById('setting-audio-masuk').value = s.audioMasukUrl || '';
                if(document.getElementById('setting-audio-siap')) document.getElementById('setting-audio-siap').value = s.audioSiapUrl || '';
            }
        });
    });
};

// 3. SIMPAN PENGATURAN TOKO KE FIREBASE
// Fungsi ini dipanggil oleh tombol "SIMPAN PENGATURAN WEB" di dalam HTML panel-edit-web
window.saveOwnerSettings = function() {
    const newSettings = {
        phoneWA: document.getElementById('setting-wa').value.trim(),
        logo: document.getElementById('setting-logo').value.trim(),
        ig: document.getElementById('setting-ig').value.trim(),
        tiktok: document.getElementById('setting-tiktok').value.trim(),
        qris: document.getElementById('setting-qris').value.trim(),
        mapsEmbed: document.getElementById('setting-maps').value.trim(),
        isOpen: document.getElementById('setting-buka').checked,
        audioEnabled: document.getElementById('setting-audio').checked,
        audioMasukUrl: document.getElementById('setting-audio-masuk').value.trim(),
        audioSiapUrl: document.getElementById('setting-audio-siap').value.trim()
    };

    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        set(ref(window.db, 'settings'), newSettings).then(() => {
            alert("Pengaturan Toko berhasil disimpan dan langsung aktif!");
            // Update Global State
            window.AppState.storeSettings = newSettings;
            
            // Terapkan pengaturan audio custom jika ada
            if (newSettings.audioMasukUrl && window.AppState.audioMasuk) window.AppState.audioMasuk.src = newSettings.audioMasukUrl;
            if (newSettings.audioSiapUrl && window.AppState.audioSiap) window.AppState.audioSiap.src = newSettings.audioSiapUrl;
        }).catch(err => {
            alert("Gagal menyimpan pengaturan: " + err.message);
        });
    });
};

// 4. RENDER DAFTAR MASTER KATALOG MENU (Panel Owner)
window.renderMasterKatalog = function() {
    // Kita gunakan window.AppState.menuData yang sudah diload di Part 3
    const menus = window.AppState.menuData || [];
    
    // Cari elemen pembungkus di HTML (kita buatkan ID virtual jika di HTML statik belum ada wadah <ul> nya)
    // Di file index.html Anda, daftar katalog mentah ada di dalam #panel-katalog
    const panelKatalog = document.getElementById('panel-katalog');
    if (!panelKatalog) return;
    
    // Cari kontainer list, jika belum ada kita inject
    let listContainer = document.getElementById('master-menu-list');
    if (!listContainer) {
        // Hapus elemen statik bawaan HTML dan ganti dengan kontainer dinamis
        const divLists = panelKatalog.querySelectorAll('.bg-white.p-4.rounded-2xl.shadow-sm'); // Ambil card contoh
        divLists.forEach(d => { if(!d.id) d.remove(); }); 
        
        listContainer = document.createElement('div');
        listContainer.id = 'master-menu-list';
        listContainer.className = 'space-y-3';
        
        // Masukkan ke dalam flex-1 area
        const wrapper = panelKatalog.querySelector('.flex-1');
        if(wrapper) wrapper.appendChild(listContainer);
    }
    
    listContainer.innerHTML = ''; // Bersihkan kontainer
    
    if (menus.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-xs font-bold text-gray-500 py-6">Katalog masih kosong.</p>';
        return;
    }
    
    menus.forEach(menu => {
        const itemHtml = document.createElement('div');
        itemHtml.className = "bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between transition hover:border-amber-300";
        
        // Logika Toggle Checkbox Stok (Biru/Hijau jika tersedia, Merah/Mati jika habis)
        const isChecked = menu.available ? 'checked' : '';
        const coretHarga = (menu.normalPrice > menu.price) ? `<span class="text-gray-400 line-through ml-1">${window.formatRupiah(menu.normalPrice)}</span>` : '';
        
        itemHtml.innerHTML = `
            <div class="flex items-center gap-3 w-2/3">
                <img src="${menu.img}" class="w-12 h-12 rounded-lg object-cover border border-gray-200">
                <div>
                    <h4 class="font-black text-sm text-gray-900 line-clamp-1">${menu.name}</h4>
                    <p class="text-[10px] font-bold text-amber-600">${window.formatRupiah(menu.price)} ${coretHarga}</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${isChecked} onchange="toggleMenuStock('${menu.id}', this.checked)">
                    <div class="w-9 h-5 bg-red-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    <span class="ml-2 text-[9px] font-black text-gray-500 uppercase hidden md:inline">Stok</span>
                </label>
                <button onclick="editMasterMenu('${menu.id}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button>
            </div>
        `;
        listContainer.appendChild(itemHtml);
    });
};

// 5. FITUR DARURAT: SWITCH HABIS/TERSEDIA (Emergency Stock Toggle)
window.toggleMenuStock = function(menuId, isAvailable) {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, update } = module;
        const menuRef = ref(window.db, `menu/${menuId}`);
        
        update(menuRef, { available: isAvailable }).then(() => {
            // Berhasil diupdate, UI pelanggan langsung berubah via real-time listener di Part 3
            console.log(`Menu ${menuId} status ketersediaan diubah menjadi: ${isAvailable}`);
        });
    });
};

// 6. PLACEHOLDER UNTUK BUKA MODAL FORM TAMBAH/EDIT MENU (Akan dibuat di part selanjutnya)
window.editMasterMenu = function(menuId) {
    alert("Fitur Form Edit/Tambah Menu akan dirender pada Modul CRUD Lanjutan (Part berikutnya). Mode: Edit ID " + menuId);
};

// Tambahkan event listener untuk tombol Simpan Web di HTML yang statis
document.addEventListener('DOMContentLoaded', () => {
    // Cari tombol simpan pengaturan web dan lekatkan fungsinya
    const panelWeb = document.getElementById('panel-edit-web');
    if (panelWeb) {
        const btnSimpanWeb = panelWeb.querySelector('button.bg-blue-600');
        if (btnSimpanWeb) {
            btnSimpanWeb.setAttribute('onclick', 'saveOwnerSettings()');
        }
    }
});

console.log("Mainstay POS - Part 7 (Owner Dashboard & Settings) Initialized.");
/* --------------------------------------------------------------------------
   PART 8: INVENTORY (STOK BAHAN BAKU) & MEMBER CRM (DATA PELANGGAN)
   -------------------------------------------------------------------------- */

// ==========================================
// A. MANAJEMEN INVENTARIS (STOK BAHAN & ALAT)
// ==========================================
window.AppState.inventoryData = {};

window.loadInventory = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        onValue(ref(window.db, 'inventory'), (snapshot) => {
            window.AppState.inventoryData = snapshot.val() || {};
            window.renderInventory();
        });
    });
};

window.renderInventory = function() {
    const panelStok = document.getElementById('panel-stok');
    if (!panelStok) return;

    // Cari area tabel di dalam panel stok
    let tbody = panelStok.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const items = Object.entries(window.AppState.inventoryData);

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-gray-400">Belum ada data stok barang.</td></tr>';
        return;
    }

    items.forEach(([id, item]) => {
        // Logika Low Stock Threshold (Peringatan Stok Menipis) dari Blueprint
        const isLow = item.qty <= (item.minQty || 10);
        const qtyClass = isLow ? 'text-red-500 font-black' : 'text-indigo-600';
        const warningIcon = isLow ? '<i class="fa-solid fa-triangle-exclamation mr-1"></i> ' : '';
        const warningText = isLow ? ' <span class="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded ml-1">Tipis</span>' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3 text-gray-900 border-b border-gray-50">${item.name}</td>
            <td class="px-4 py-3 ${qtyClass} border-b border-gray-50">${warningIcon}${item.qty} ${item.unit}${warningText}</td>
            <td class="px-4 py-3 text-right border-b border-gray-50">
                <button onclick="editInventory('${id}')" class="text-blue-500 bg-blue-50 w-7 h-7 rounded-lg hover:bg-blue-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-pen-to-square"></i></button>
                <button onclick="hapusInventory('${id}')" class="text-red-500 bg-red-50 w-7 h-7 rounded-lg hover:bg-red-500 hover:text-white transition ml-1 shadow-sm"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.tambahInventory = function() {
    const name = prompt("Nama Barang / Bahan (Cth: Cup Plastik 16oz):");
    if (!name) return;
    const qty = prompt("Jumlah Stok Fisik Saat Ini (Angka):");
    if (!qty || isNaN(qty)) return;
    const unit = prompt("Satuan (Cth: pcs, gram, bungkus, renceng):");
    if (!unit) return;
    
    // Tentukan batas minimum untuk memicu warna merah/alert
    let minQty = prompt("Batas Minimum Stok untuk Peringatan (Angka, Default: 10):");
    minQty = minQty && !isNaN(minQty) ? parseInt(minQty) : 10;

    const id = "INV-" + Date.now();
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        set(ref(window.db, `inventory/${id}`), {
            name: name,
            qty: parseInt(qty),
            unit: unit,
            minQty: minQty,
            updatedAt: Date.now(),
            updatedBy: window.AppState.currentRole
        }).then(() => {
            alert(`Barang ${name} berhasil ditambahkan!`);
        });
    });
};

window.editInventory = function(id) {
    const item = window.AppState.inventoryData[id];
    if (!item) return;

    const newQty = prompt(`Update Stok Baru untuk "${item.name}"\nStok saat ini: ${item.qty} ${item.unit}`, item.qty);
    
    if (newQty && !isNaN(newQty)) {
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
            const { ref, update } = module;
            update(ref(window.db, `inventory/${id}`), {
                qty: parseInt(newQty),
                updatedAt: Date.now(),
                updatedBy: window.AppState.currentRole
            }).then(() => {
                // Beri efek flash jika stok diedit
                window.triggerScreenFlash();
            });
        });
    }
};

window.hapusInventory = function(id) {
    if (confirm("⚠️ PERHATIAN: Apakah Anda yakin ingin menghapus barang ini secara permanen dari inventaris?")) {
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
            const { ref, remove } = module;
            remove(ref(window.db, `inventory/${id}`));
        });
    }
};

// ==========================================
// B. MANAJEMEN DATABASE MEMBER & CRM
// ==========================================
window.AppState.membersData = {};

window.loadMembers = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        onValue(ref(window.db, 'members'), (snapshot) => {
            window.AppState.membersData = snapshot.val() || {};
            window.renderMembers();
        });
    });
};

window.renderMembers = function() {
    const tbody = document.getElementById('table-member-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    const members = Object.entries(window.AppState.membersData);

    if (members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-400">Belum ada member yang bergabung.</td></tr>';
        return;
    }

    // Urutkan berdasarkan yang paling baru bergabung (Descending)
    members.sort((a, b) => (b[1].joinedAt || 0) - (a[1].joinedAt || 0));

    members.forEach(([phone, member]) => {
        // Tampilkan tanggal bergabung
        const dateStr = member.joinedAt 
            ? new Date(member.joinedAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: '2-digit'})
            : '-';
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3 text-gray-900 border-b border-gray-50">${member.name}</td>
            <td class="p-3 text-green-600 border-b border-gray-50"><i class="fa-brands fa-whatsapp"></i> ${phone}</td>
            <td class="p-3 text-gray-400 text-[10px] border-b border-gray-50">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
};

// Ekspor Data Member ke CSV / Excel
window.exportMemberCSV = function() {
    const members = Object.values(window.AppState.membersData);
    if (members.length === 0) {
        alert("Tidak ada data member untuk diekspor.");
        return;
    }

    // Format Header CSV
    let csvContent = "data:text/csv;charset=utf-8,Nama,No. WhatsApp,Tanggal Bergabung,Jumlah Stamp,Sesi Selesai\n";
    
    // Looping data member ke baris CSV
    members.forEach(m => {
        const dateStr = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('id-ID') : '-';
        // Cegah error koma pada nama
        const cleanName = m.name ? m.name.replace(/,/g, '') : 'Anonim'; 
        const row = `"${cleanName}","${m.phone}","${dateStr}","${m.stamps || 0}","${m.completedSessions || 0}"`;
        csvContent += row + "\r\n";
    });

    // Proses Download Otomatis Browser
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const today = new Date().toISOString().slice(0,10);
    link.setAttribute("download", `Database_Member_Mainstay_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// C. PENGIKATAN (BINDING) EVENT KE TOMBOL HTML STATIS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hubungkan tombol "Tambah Bahan" di Panel Stok
    const panelStok = document.getElementById('panel-stok');
    if (panelStok) {
        const btnTambahStok = panelStok.querySelector('button.bg-indigo-500');
        if (btnTambahStok) btnTambahStok.setAttribute('onclick', 'tambahInventory()');
    }

    // 2. Hubungkan tombol "Export Data" di Panel Member
    const panelMember = document.getElementById('panel-member');
    if (panelMember) {
        const btnExport = panelMember.querySelector('button.bg-gray-800');
        if (btnExport) btnExport.setAttribute('onclick', 'exportMemberCSV()');
    }
});

// Panggil fungsi muat data Firebase saat aplikasi jalan
setTimeout(() => {
    if(typeof window.loadInventory === 'function') window.loadInventory();
    if(typeof window.loadMembers === 'function') window.loadMembers();
}, 800);

console.log("Mainstay POS - Part 8 (Inventory & CRM Member) Initialized.");
/* --------------------------------------------------------------------------
   PART 9: MEMBER AUTO-REGISTRATION, LOYALTY STAMPS & REWARD SYSTEM
   -------------------------------------------------------------------------- */

// 1. LOGIKA INTI: SINKRONISASI MEMBER & PENAMBAHAN STAMP (Berjalan Latar Belakang)
// Fungsi ini akan secara otomatis dipanggil sesaat setelah pesanan berhasil dibuat (Checkout)
window.prosesLoyaltyMember = function(phone, name, cartItems, isJoinChecked) {
    if (!phone) return; // Tidak ada nomor WA = tidak bisa dilacak
    
    const cleanPhone = window.formatPhoneWA(phone);
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get, set, update } = module;
        const memberRef = ref(window.db, `members/${cleanPhone}`);
        
        get(memberRef).then((snapshot) => {
            const memberExists = snapshot.exists();
            
            // Jika tidak centang daftar member dan belum pernah jadi member, abaikan.
            if (!isJoinChecked && !memberExists) return;
            
            // Hitung berapa item di keranjang yang berhak dapat stamp
            // (Menu bundling murah / diskon besar yang di-set stampEligible: false di blueprint tidak akan dihitung)
            let newStamps = 0;
            cartItems.forEach(item => {
                if (item.stampEligible !== false) { // Default dianggap eligible jika tidak ada flag false
                    newStamps += item.qty;
                }
            });
            
            if (memberExists) {
                // UPDATE MEMBER LAMA
                const data = snapshot.val();
                let totalStamps = (data.stamps || 0) + newStamps;
                let sessions = data.completedSessions || 0;
                
                // Konversi 5 Stamp menjadi 1 Sesi Selesai (Sesuai Blueprint)
                while (totalStamps >= 5) {
                    totalStamps -= 5;
                    sessions += 1;
                }
                
                update(memberRef, {
                    name: name, // Perbarui nama jika ada perubahan ejaan
                    stamps: totalStamps,
                    completedSessions: sessions,
                    lastTx: Date.now()
                });
                
            } else {
                // PENDAFTARAN MEMBER BARU (Pertama kali centang)
                let totalStamps = newStamps;
                let sessions = 0;
                
                while (totalStamps >= 5) {
                    totalStamps -= 5;
                    sessions += 1;
                }
                
                set(memberRef, {
                    name: name,
                    phone: cleanPhone,
                    joinedAt: Date.now(),
                    stamps: totalStamps,
                    completedSessions: sessions,
                    lastTx: Date.now()
                });
            }
        });
    });
};

// 2. CEK STATUS STAMP OLEH CUSTOMER (WIDGET SELF-SERVICE)
window.cekStatusStamp = function() {
    const inputPhone = prompt("Masukkan Nomor WhatsApp Anda untuk mengecek status Stamp & Reward:");
    if (!inputPhone) return;
    
    const cleanPhone = window.formatPhoneWA(inputPhone);
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get } = module;
        
        get(ref(window.db, `members/${cleanPhone}`)).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const sisaStamp = data.stamps || 0;
                const sesiSelesai = data.completedSessions || 0;
                
                // Visualisasi Titik Stamp Sederhana
                let dots = "";
                for(let i = 1; i <= 5; i++) {
                    dots += i <= sisaStamp ? "🟢" : "⚪";
                }
                
                let pesan = `Halo, ${data.name}!\n\n`;
                pesan += `Progress Stamp Anda:\n${dots} (${sisaStamp}/5)\n\n`;
                pesan += `Sesi Penuh (Siap Klaim Reward): ${sesiSelesai} Sesi\n\n`;
                
                if (sesiSelesai > 0) {
                    pesan += "🎉 KABAR BAIK! Anda memiliki Reward yang bisa diklaim ke Kasir hari ini!";
                } else {
                    pesan += `Kumpulkan ${5 - sisaStamp} minuman lagi untuk mendapatkan minuman gratis!`;
                }
                
                alert(pesan);
            } else {
                alert("Nomor Anda belum terdaftar sebagai Member Mainstay Drink. Silakan centang 'Daftar Member' pada saat checkout pesanan Anda berikutnya!");
            }
        }).catch(err => {
            alert("Gagal terhubung ke database. Coba lagi.");
        });
    });
};

// 3. KLAIM REWARD (HANYA BISA DILAKUKAN OLEH KASIR / OWNER)
window.klaimRewardMember = function() {
    // Pastikan hanya Kasir atau Owner yang bisa mengakses fungsi ini
    if (window.AppState.currentRole === 'customer') {
        alert("Akses ditolak. Hanya Staf yang bisa memproses klaim reward.");
        return;
    }
    
    const inputPhone = prompt("Masukkan No. WA Member yang ingin mengklaim reward:");
    if (!inputPhone) return;
    
    const cleanPhone = window.formatPhoneWA(inputPhone);
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get, update } = module;
        const memberRef = ref(window.db, `members/${cleanPhone}`);
        
        get(memberRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                if (data.completedSessions && data.completedSessions > 0) {
                    const konfirmasi = confirm(`Member ${data.name} memiliki ${data.completedSessions} Sesi Reward.\n\nApakah Anda yakin ingin memproses 1 klaim minuman gratis sekarang? (Sesi akan dikurangi 1)`);
                    
                    if (konfirmasi) {
                        update(memberRef, {
                            completedSessions: data.completedSessions - 1
                        }).then(() => {
                            alert("Klaim berhasil diproses! Silakan berikan minuman gratis (reward) kepada pelanggan.");
                        });
                    }
                } else {
                    alert(`Member ${data.name} belum memiliki Sesi Penuh (Siap Klaim). Sisa stamp saat ini: ${data.stamps}/5`);
                }
            } else {
                alert("Data Member tidak ditemukan.");
            }
        });
    });
};

// 4. MENGHUBUNGKAN (HOOK) LOGIKA KE FUNGSI CHECKOUT PART 4
// Kita override sedikit fungsi prosesCheckout() dari Part 4 agar otomatis memanggil fungsi Loyalty di atas.
const originalProsesCheckout = window.prosesCheckout;
window.prosesCheckout = function() {
    // Ambil data sebelum checkout dieksekusi oleh original function
    const name = document.getElementById('co-name') ? document.getElementById('co-name').value.trim() : '';
    const phone = document.getElementById('co-phone') ? document.getElementById('co-phone').value.trim() : '';
    const isMember = document.getElementById('co-member') ? document.getElementById('co-member').checked : false;
    
    // Copy isi keranjang saat ini
    const currentCart = JSON.parse(JSON.stringify(window.AppState.cart)); 
    
    // Eksekusi checkout bawaan (Part 4)
    if(typeof originalProsesCheckout === 'function') {
        originalProsesCheckout();
    }
    
    // Jalankan sistem Loyalty Stamp di latar belakang jika keranjang tidak kosong
    if (currentCart.length > 0 && phone) {
        window.prosesLoyaltyMember(phone, name, currentCart, isMember);
    }
};

console.log("Mainstay POS - Part 9 (Member Loyalty Stamps) Initialized.");
/* --------------------------------------------------------------------------
   PART 10: HRD MASTER (PROFIL STAFF, GAJI, & LOG ABSENSI KAMERA)
   -------------------------------------------------------------------------- */

window.AppState.staffData = {};
window.AppState.attendanceLogs = {};

// 1. MEMUAT DATA STAF & ABSENSI HARI INI DARI FIREBASE
window.loadHRDData = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, onValue } = module;
        
        // A. Load Data Staff (Untuk Profil & Otorisasi PIN)
        onValue(ref(window.db, 'staff'), (snapshot) => {
            window.AppState.staffData = snapshot.val() || {};
            window.renderStaffList();
            window.updateKasirDropdown(); // Update dropdown kasir di Dashboard Kasir
        });
        
        // B. Load Log Absensi Khusus Hari Ini
        const todayStr = new Date().toISOString().slice(0,10); // Format YYYY-MM-DD
        onValue(ref(window.db, `attendance_logs/${todayStr}`), (snapshot) => {
            window.AppState.attendanceLogs = snapshot.val() || {};
            window.renderAttendanceLogs();
        });
    });
};

// 2. RENDER DAFTAR KARYAWAN KE PANEL HRD (Owner)
window.renderStaffList = function() {
    const panel = document.getElementById('panel-hrd');
    if (!panel) return;
    
    // Cari elemen <h3> "Profiling PIN Karyawan" untuk dijadikan patokan injeksi DOM
    const h3Staff = Array.from(panel.querySelectorAll('h3')).find(el => el.innerText.includes('Profiling PIN Karyawan'));
    if (!h3Staff) return;
    
    // Buat/Temukan kontainer dinamis
    let container = document.getElementById('dynamic-staff-list');
    if (!container) {
        container = document.createElement('div');
        container.id = 'dynamic-staff-list';
        container.className = 'space-y-2 mt-3';
        h3Staff.parentElement.appendChild(container);
        
        // Hapus elemen dummy statis bawaan HTML
        const staticItems = h3Staff.parentElement.querySelectorAll('.flex.justify-between.items-center.p-3');
        staticItems.forEach(item => item.remove());
    }
    
    container.innerHTML = '';
    const staffs = Object.entries(window.AppState.staffData);
    
    if (staffs.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 font-bold text-center py-4">Belum ada data staf terdaftar.</p>';
        return;
    }
    
    // Loop dan render elemen staf
    staffs.forEach(([id, staff]) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50 font-bold text-xs shadow-sm hover:border-teal-300 transition';
        div.innerHTML = `
            <div>
                <span class="text-gray-900">${staff.name} <span class="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-1 tracking-widest uppercase">${staff.type}</span></span><br>
                <span class="text-teal-600 text-[10px]">PIN: ${staff.pin} | Gaji: ${window.formatRupiah(staff.salaryBase)}/${staff.salaryType}</span>
            </div>
            <button onclick="hapusStaff('${id}')" class="text-red-500 w-8 h-8 bg-red-50 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
};

// 3. TAMBAH PROFIL KARYAWAN & STRUKTUR GAJI
window.tambahStaff = function() {
    const name = prompt("Nama Lengkap Karyawan / Staf Kasir:");
    if (!name) return;
    
    const pin = prompt("Buat 6 Digit PIN Karyawan (Untuk akses Kasir & Absen):");
    if (!pin || pin.length < 4) return alert("PIN tidak valid. Minimal 4 angka.");
    
    const type = prompt("Tipe Kepegawaian (Tetap / Kontrak / Freelance):", "Tetap");
    if (!type) return;
    
    const salaryType = prompt("Sistem Gaji (Jam / Harian / Mingguan / Bulanan):", "Harian");
    if (!salaryType) return;
    
    const salaryBase = prompt(`Masukkan Nominal Gaji pokok per-${salaryType}:\n(Hanya angka, contoh: 50000)`);
    if (!salaryBase || isNaN(salaryBase)) return alert("Nominal gaji harus berupa angka.");
    
    const staffId = "STF-" + Date.now();
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        set(ref(window.db, `staff/${staffId}`), {
            name: name,
            pin: pin,
            type: type,
            salaryType: salaryType,
            salaryBase: parseInt(salaryBase),
            joinedAt: Date.now()
        }).then(() => alert(`Profil Staf "${name}" berhasil ditambahkan!`));
    });
};

// 4. HAPUS KARYAWAN
window.hapusStaff = function(id) {
    if (confirm("Hapus profil staf ini dari sistem? (Log absensi dan transaksi masa lalu akan tetap aman sebagai arsip)")) {
        import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
            const { ref, remove } = module;
            remove(ref(window.db, `staff/${id}`));
        });
    }
};

// 5. UPDATE DROPDOWN PEMILIH KASIR DI DASHBOARD
window.updateKasirDropdown = function() {
    const dropdown = document.getElementById('kasir-staf-dropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    const staffs = Object.values(window.AppState.staffData);
    
    if (staffs.length === 0) {
        dropdown.innerHTML = '<option value="Owner">Master Mode</option>';
        return;
    }
    
    // Isi otomatis berdasarkan nama staf
    staffs.forEach(staff => {
        const opt = document.createElement('option');
        opt.value = staff.name;
        opt.innerText = staff.name;
        dropdown.appendChild(opt);
    });
};

// 6. PROSES ABSEN KAMERA (Override Fungsi HTML) -> Upload ke Firebase
window.prosesAbsen = function(tipe) {
    const pin = document.getElementById('absen-pin').value.trim();
    if(!pin) {
        alert("Masukkan PIN absensi terlebih dahulu!");
        return;
    }
    
    // Pencocokan PIN dengan Database HRD
    let staffName = "Unknown";
    const staffs = Object.values(window.AppState.staffData);
    const matchedStaff = staffs.find(s => s.pin === pin);
    
    if (matchedStaff) {
        staffName = matchedStaff.name;
    } else if (pin === "888888") {
        staffName = "Owner Master";
    } else {
        alert("PIN tidak ditemukan dalam database HRD! Silakan hubungi Owner.");
        return;
    }
    
    // Tangkap Frame Foto dari Video Latar Belakang (Base64)
    const video = document.getElementById('attendance-video');
    const canvas = document.getElementById('attendance-canvas');
    let photoDataUrl = "";
    
    if (video && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        // Gambar frame dari video feed
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Kompres menjadi JPEG ukuran kecil (Quality 0.4) agar Firebase Realtime Database tidak bengkak
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.4); 
    }
    
    const todayStr = new Date().toISOString().slice(0,10);
    const logId = "ATT-" + Date.now();
    const currentTime = Date.now();
    
    // Push Data ke Firebase
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, set } = module;
        set(ref(window.db, `attendance_logs/${todayStr}/${logId}`), {
            staffName: staffName,
            pin: pin,
            type: tipe, // 'Masuk' atau 'Keluar'
            timestamp: currentTime,
            photoBase64: photoDataUrl
        }).then(() => {
            // Tutup Kamera Latar
            window.closeAbsensi();
            
            // Tampilkan Modal Review 5 Detik
            const reviewModal = document.getElementById('modal-absen-review');
            document.getElementById('review-foto').src = photoDataUrl; // Tampilkan hasil jepretan
            document.getElementById('review-nama').innerText = staffName;
            document.getElementById('review-jam').innerText = `Absen ${tipe}: ${new Date(currentTime).toLocaleTimeString('id-ID')} WIB`;
            
            reviewModal.classList.remove('hidden');
            reviewModal.classList.add('flex');
            
            // Hilangkan otomatis setelah 5 detik
            setTimeout(() => {
                reviewModal.classList.add('hidden');
                reviewModal.classList.remove('flex');
            }, 5000);
        });
    });
};

// 7. RENDER LOG ABSENSI (DENGAN FOTO) KE PANEL OWNER
window.renderAttendanceLogs = function() {
    const panel = document.getElementById('panel-hrd');
    if (!panel) return;
    
    const h3Log = Array.from(panel.querySelectorAll('h3')).find(el => el.innerText.includes('Log Absensi Hari Ini'));
    if (!h3Log) return;
    
    let container = document.getElementById('dynamic-attendance-list');
    if (!container) {
        container = document.createElement('div');
        container.id = 'dynamic-attendance-list';
        container.className = 'space-y-3 mt-3';
        h3Log.parentElement.appendChild(container);
        
        // Hapus dummy statis HTML
        const staticLogs = h3Log.parentElement.querySelectorAll('.flex.gap-3.items-center');
        staticLogs.forEach(item => item.remove());
    }
    
    container.innerHTML = '';
    const logs = Object.values(window.AppState.attendanceLogs);
    
    // Urutkan paling baru di atas
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    if (logs.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 font-bold text-center py-4">Belum ada aktivitas absensi hari ini.</p>';
        return;
    }
    
    logs.forEach(log => {
        const timeStr = new Date(log.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'});
        const badgeColor = log.type === 'Masuk' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
        
        const div = document.createElement('div');
        div.className = 'flex gap-3 items-center border border-gray-100 p-2 rounded-xl bg-white shadow-sm';
        div.innerHTML = `
            <div class="w-10 h-10 bg-slate-200 rounded-lg overflow-hidden border border-slate-300 flex items-center justify-center">
                ${log.photoBase64 ? `<img src="${log.photoBase64}" class="w-full h-full object-cover transform scale-x-[-1]">` : '<i class="fa-solid fa-user text-gray-400"></i>'}
            </div>
            <div class="flex-1">
                <p class="text-xs font-black text-gray-900">${log.staffName}</p>
                <p class="text-[9px] font-bold text-gray-500">Absen ${log.type}: ${timeStr} WIB</p>
            </div>
            <span class="text-[9px] font-black ${badgeColor} px-2 py-1 rounded tracking-wider uppercase shadow-sm">${log.type}</span>
        `;
        container.appendChild(div);
    });
};

// 8. BINDING TOMBOL HTML
document.addEventListener('DOMContentLoaded', () => {
    const panelHrd = document.getElementById('panel-hrd');
    if (panelHrd) {
        const btnTambah = panelHrd.querySelector('button.bg-teal-100'); // Tombol "Tambah Staf"
        if (btnTambah) btnTambah.setAttribute('onclick', 'tambahStaff()');
    }
});

// Otomatis Panggil Saat App JS Berjalan
setTimeout(() => {
    if(typeof window.loadHRDData === 'function') window.loadHRDData();
}, 1200);

console.log("Mainstay POS - Part 10 (HRD & Attendance Logs) Initialized.");
/* --------------------------------------------------------------------------
   PART 11: LAPORAN KEUANGAN (LABA/RUGI) & SISTEM BACKUP DATABASE (JSON)
   -------------------------------------------------------------------------- */

// ==========================================
// A. MODUL LAPORAN KEUANGAN (FINANCIAL REPORTS)
// ==========================================

window.loadLaporanKeuangan = function() {
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get } = module;
        
        // Tarik data 'orders' dan 'finance_daily' secara bersamaan untuk kalkulasi Laba/Rugi
        Promise.all([
            get(ref(window.db, 'orders')),
            get(ref(window.db, 'finance_daily'))
        ]).then(([ordersSnap, financeSnap]) => {
            const orders = ordersSnap.val() || {};
            const finance = financeSnap.val() || {};
            
            window.renderLaporanBulanIni(orders, finance);
        });
    });
};

window.renderLaporanBulanIni = function(orders, finance) {
    const panel = document.getElementById('panel-laporan');
    if (!panel) return;
    
    // Identifikasi ID bulan ini (Misal format YYMM: "2609" untuk Sept 2026)
    const now = new Date();
    const currentMonthPrefix = now.getFullYear().toString().slice(-2) + String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthFull = now.toISOString().slice(0,7); // YYYY-MM
    
    let totalGross = 0;
    let totalTx = 0;
    
    // 1. Hitung Pendapatan Kotor (Gross Revenue) dari Pesanan Selesai / Terbayar
    Object.values(orders).forEach(ord => {
        // Cek jika pesanan terjadi di bulan ini dan tidak berstatus 'batal'
        if (ord.status !== 'batal' && ord.orderId.includes(`-${currentMonthPrefix}`)) {
            totalGross += ord.grandTotal;
            totalTx++;
        }
    });
    
    // 2. Hitung Total Pengeluaran (Operasional, Bahan Baku, Prive Kasir/Owner)
    let totalExpenses = 0;
    Object.keys(finance).forEach(dateStr => {
        // Jika tanggal diawali dengan bulan ini (contoh: 2026-09-01 masuk ke 2026-09)
        if (dateStr.startsWith(currentMonthFull)) {
            const dayData = finance[dateStr];
            if (dayData.outflows) {
                Object.values(dayData.outflows).forEach(out => {
                    totalExpenses += out.amount;
                });
            }
        }
    });
    
    // 3. Kalkulasi Laba Bersih (Net Profit)
    const labaBersih = totalGross - totalExpenses;
    
    // 4. Injeksi Visual ke UI (Kartu Ungu Utama)
    const h3Target = panel.querySelector('h3');
    const pTx = panel.querySelector('p.bg-white\\/20');
    
    if (h3Target) h3Target.innerText = window.formatRupiah(totalGross);
    if (pTx) pTx.innerText = `Dari ${totalTx} Transaksi Bulan Ini`;
    
    // 5. Injeksi Rincian Penjabaran (Breakdown) ke Bawah Kartu Ungu
    let breakdownContainer = document.getElementById('finance-breakdown');
    
    // Jika wadah belum ada, ciptakan dinamis
    if (!breakdownContainer) {
        breakdownContainer = document.createElement('div');
        breakdownContainer.id = 'finance-breakdown';
        breakdownContainer.className = 'bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-4';
        
        // Sisipkan sebelum tombol download excel
        const btnDownload = panel.querySelector('button.bg-white');
        if (btnDownload) {
            btnDownload.parentElement.insertBefore(breakdownContainer, btnDownload);
        }
    }
    
    // Warna profit (Hijau jika untung, Merah jika rugi)
    const profitColor = labaBersih >= 0 ? 'text-green-600' : 'text-red-500';
    
    breakdownContainer.innerHTML = `
        <h3 class="text-xs font-black text-gray-900 mb-4 uppercase tracking-wider border-b border-gray-100 pb-2">Rincian Laba/Rugi (Bulan Ini)</h3>
        <div class="space-y-3 font-bold text-xs text-gray-700">
            <div class="flex justify-between"><span>Omzet Kotor (Gross):</span> <span>${window.formatRupiah(totalGross)}</span></div>
            <div class="flex justify-between"><span>Kas Keluar (Expenses/HPP):</span> <span class="text-red-500">- ${window.formatRupiah(totalExpenses)}</span></div>
            <div class="border-t border-gray-200 pt-3 mt-1 flex justify-between font-black text-sm">
                <span>Laba Bersih (Net Profit):</span> <span class="${profitColor}">${window.formatRupiah(labaBersih)}</span>
            </div>
        </div>
    `;
};


// ==========================================
// B. SISTEM & DATABASE (EKSPOR/IMPOR BACKUP JSON)
// ==========================================

// 1. EKSPOR FULL DATABASE (Download .json)
window.exportDatabaseJSON = function() {
    const pass = prompt("Masukkan Master PIN Owner untuk mengunduh Backup Database Keseluruhan:");
    if (pass !== "888888") return alert("Otorisasi Gagal! PIN Master salah.");
    
    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
        const { ref, get } = module;
        // Ambil data dari akar '/' seluruh database
        get(ref(window.db, '/')).then((snapshot) => {
            const fullData = snapshot.val();
            if (!fullData) return alert("Database kosong.");
            
            // Generate JSON String dan paksa browser untuk mendownloadnya
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullData, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            const todayStr = new Date().toISOString().slice(0,10);
            dlAnchorElem.setAttribute("download", `Backup_DB_Mainstay_${todayStr}.json`);
            document.body.appendChild(dlAnchorElem);
            dlAnchorElem.click();
            document.body.removeChild(dlAnchorElem);
        });
    });
};

// 2. IMPOR & RESTORE DATABASE (Upload .json)
window.importDatabaseJSON = function() {
    const pass = prompt("⚠️ PERINGATAN BAHAYA: Tindakan ini akan MENIMPA seluruh data toko saat ini dengan data dari file backup. Masukkan Master PIN Owner untuk melanjutkan:");
    if (pass !== "888888") return alert("Otorisasi Gagal!");
    
    // Buat elemen input file tersembunyi
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = readerEvent => {
            try {
                const content = readerEvent.target.result;
                const parsedData = JSON.parse(content);
                
                if (confirm(`File backup berhasil dibaca. YAKIN INGIN MELAKUKAN RESTORE KESELURUHAN SEKARANG?`)) {
                    import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js").then((module) => {
                        const { ref, set } = module;
                        // Timpa paksa akar root database '/'
                        set(ref(window.db, '/'), parsedData).then(() => {
                            alert("✅ Restore Database BERHASIL! Sistem akan dimuat ulang.");
                            location.reload();
                        }).catch(err => alert("Gagal Restore: " + err.message));
                    });
                }
            } catch (error) {
                alert("Gagal: File JSON tidak valid atau rusak!");
            }
        }
    };
    
    // Buka dialog file sistem operasi
    input.click();
};

// 3. BINDING TOMBOL HTML (Mengaitkan fungsi ke tombol statis)
document.addEventListener('DOMContentLoaded', () => {
    // Binding Panel Sistem (Backup & Restore)
    const panelSistem = document.getElementById('panel-sistem');
    if (panelSistem) {
        const btns = panelSistem.querySelectorAll('button');
        btns.forEach(btn => {
            if (btn.innerText.includes('Export JSON')) btn.setAttribute('onclick', 'exportDatabaseJSON()');
            if (btn.innerText.includes('Import JSON')) btn.setAttribute('onclick', 'importDatabaseJSON()');
            if (btn.innerText.includes('Sinkronisasi Ulang')) btn.setAttribute('onclick', 'location.reload()');
        });
    }
    
    // Binding Panel Laporan
    const panelLaporan = document.getElementById('panel-laporan');
    if (panelLaporan) {
        const btnExcel = panelLaporan.querySelector('button');
        if (btnExcel) btnExcel.setAttribute('onclick', 'alert("Pusat laporan Excel sedang digenerate. File dapat diunduh langsung dari backend Google Sheets Anda.")');
    }
});

// Panggil fungsi render secara otomatis saat aplikasi dimuat penuh
setTimeout(() => {
    if(typeof window.loadLaporanKeuangan === 'function') window.loadLaporanKeuangan();
}, 1500);

console.log("Mainstay POS - Part 11 (Finance Reports & Database JSON) Initialized.");
/* --------------------------------------------------------------------------
   PART 12: EXTERNAL INTEGRATIONS (GOOGLE SHEETS) & OFFLINE RESILIENCY
   -------------------------------------------------------------------------- */

// 1. GOOGLE APPS SCRIPT (GAS) INTEGRATION
// Fungsi universal untuk mem-push data transaksi ke Google Spreadsheet di latar belakang
window.pushDataToGoogleSheets = function(actionType, payloadData) {
    const gasUrl = "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec";
    
    // Bungkus data dengan metadata aksi
    const requestData = {
        action: actionType,
        timestamp: new Date().toISOString(),
        data: payloadData
    };

    // Kirim menggunakan metode POST (mode 'no-cors' wajib agar tidak diblokir oleh browser keamanan/CORS policy)
    fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    }).then(() => {
        console.log(`[GAS Sync] Berhasil mengirim instruksi data: ${actionType}`);
    }).catch(err => {
        console.error(`[GAS Sync] Gagal mengirim data: ${actionType}`, err);
        // Fallback: Jika internet putus saat push, simpan ke antrean lokal (LocalStorage)
        window.saveToOfflineQueue(requestData);
    });
};

// 2. OFFLINE QUEUE SYSTEM (Penyangga Data Saat Internet Kedai Putus)
window.saveToOfflineQueue = function(requestData) {
    let queue = JSON.parse(localStorage.getItem('mainstay_offline_queue') || '[]');
    queue.push(requestData);
    localStorage.setItem('mainstay_offline_queue', JSON.stringify(queue));
};

// Fungsi untuk memproses ulang antrean data saat internet kembali menyala
window.processOfflineQueue = function() {
    let queue = JSON.parse(localStorage.getItem('mainstay_offline_queue') || '[]');
    if (queue.length === 0) return;
    
    console.log(`[Offline Sync] Mencoba memproses ${queue.length} antrean data yang tertunda...`);
    
    // Kosongkan antrean lokal (Asumsi akan sukses, jika gagal akan masuk antrean lagi)
    localStorage.setItem('mainstay_offline_queue', '[]');
    
    queue.forEach(req => {
        window.pushDataToGoogleSheets(req.action, req.data);
    });
};

// 3. OFFLINE/ONLINE STATE LISTENER (PWA RESILIENCY)
// Mengubah indikator di Header UI secara live saat HP / Laptop kehilangan sinyal
window.addEventListener('online', () => {
    const statusEl = document.getElementById('store-status');
    if (statusEl && window.AppState.storeSettings.isOpen) {
        statusEl.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span> BUKA & ONLINE';
        statusEl.classList.replace('text-red-600', 'text-green-600');
    }
    // Proses sinkronisasi otomatis
    window.processOfflineQueue();
});

window.addEventListener('offline', () => {
    const statusEl = document.getElementById('store-status');
    if(statusEl) {
        statusEl.innerHTML = '<span class="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span> OFFLINE (NO SIGNAL)';
        statusEl.classList.replace('text-green-600', 'text-red-600');
    }
    console.warn("⚠️ Koneksi terputus! Aplikasi berjalan dalam mode Offline (Local Cache).");
});

// 4. MENGHUBUNGKAN (HOOK) TRIGGER GOOGLE SHEETS
// Kita memicu push data ke Google Sheets setiap kali pesanan dinyatakan 'selesai' di dapur
const originalSelesaikanPesanan = window.selesaikanPesanan;
window.selesaikanPesanan = function(orderId) {
    // Eksekusi fungsi asli dari Part 5
    if (typeof originalSelesaikanPesanan === 'function') {
        originalSelesaikanPesanan(orderId);
    }
    
    // Tangkap datanya dan kirim ke Spreadsheet
    const ord = window.AppState.rawOrders[orderId];
    if (ord) {
        window.pushDataToGoogleSheets('TRANSAKSI_SELESAI', ord);
    }
};

/* ==========================================================================
   AKHIR DARI SCRIPT APLIKASI APP.JS MAINSTAY DRINK POS
   ========================================================================== */
console.log("Mainstay POS - Part 12 (GAS Sync & Offline Modes) Initialized.");
console.log("🚀 SYSTEM FULLY LOADED & READY TO USE!");
/* ==========================================================================
   PATCH PERBAIKAN: FUNGSI PANEL, KAMERA, LOGO & BYPASS PIN MASTER
   ========================================================================== */

// 1. Fungsi Pembuka & Penutup 8 Panel Owner
window.openPanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if(panel) { panel.classList.remove('hidden'); panel.classList.add('flex'); }
};
window.closePanel = function(panelId) {
    const panel = document.getElementById(panelId);
    if(panel) { panel.classList.add('hidden'); panel.classList.remove('flex'); }
};

// 2. Fungsi Pembuka & Penutup Kamera Absensi
window.openAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.remove('hidden'); modal.classList.add('flex');
        const video = document.getElementById('attendance-video');
        const loading = document.getElementById('camera-loading');
        if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                video.srcObject = stream;
                video.classList.remove('hidden');
                if(loading) loading.classList.add('hidden');
            }).catch(err => {
                alert("Gagal mengakses kamera. Pastikan izin browser diizinkan.");
                if(loading) loading.classList.add('hidden');
            });
        }
    }
};
window.closeAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.add('hidden'); modal.classList.remove('flex');
        const video = document.getElementById('attendance-video');
        if(video && video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.classList.add('hidden');
        }
    }
};

// 3. Perbaikan Override Login Kasir menggunakan PIN Owner (888888)
const originalProsesLogin = window.prosesLogin;
window.prosesLogin = function() {
    const pinInput = document.getElementById('login-pin').value.trim();
    const target = window.AppState.targetLoginRole;
    
    // Jika Owner masuk ke Kasir pakai PIN Master
    if (target === 'kasir' && pinInput === "888888") {
        document.getElementById('login-error').classList.add('hidden');
        window.AppState.activeStaffName = "Owner Master";
        document.getElementById('modal-login').classList.add('hidden');
        document.getElementById('modal-login').classList.remove('flex');
        window.switchRoleView('kasir');
        if(typeof window.loadKasirOrders === 'function') window.loadKasirOrders();
        return;
    }
    // Jika bukan kondisi di atas, jalankan fungsi aslinya
    if(typeof originalProsesLogin === 'function') originalProsesLogin();
};

// 4. Fungsi Perbarui Logo
window.updateLogoToko = function() {
    const logoUrl = window.AppState.storeSettings?.logo;
    const img = document.getElementById('header-logo-img');
    const icon = document.getElementById('header-logo-icon');
    if(logoUrl && img && icon) {
        img.src = logoUrl;
        img.classList.remove('hidden');
        icon.classList.add('hidden');
    }
};

// Panggil perbarui logo setelah settings dimuat
const originalLoadSettings = window.loadOwnerSettings;
window.loadOwnerSettings = function() {
    if(typeof originalLoadSettings === 'function') originalLoadSettings();
    setTimeout(window.updateLogoToko, 1000);
};
