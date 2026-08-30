// ============================================================================
// MAINSTAY DRINK POS - TAHAP 1: FONDASI, FIREBASE & NAVIGASI SESI
// ============================================================================

// ----------------------------------------------------------------------------
// 1. IMPORT FIREBASE CDN (Wajib ada type="module" di HTML)
// ----------------------------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";

// Konfigurasi Database Firebase Anda
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

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
window.db = getDatabase(app);
const analytics = getAnalytics(app);

// Ekspos fungsi Firebase ke window agar bisa dipakai di Tahap selanjutnya
window.fbRef = ref;
window.fbSet = set;
window.fbOnValue = onValue;
window.fbPush = push;
window.fbUpdate = update;
window.fbGet = get;
window.fbRemove = remove;

// ----------------------------------------------------------------------------
// 2. VARIABEL GLOBAL & PENGATURAN SISTEM UTAMA
// ----------------------------------------------------------------------------
window.katalogMenu = []; // Akan diisi dari Firebase di Tahap 2
window.currentCart = JSON.parse(localStorage.getItem('cartMainstay')) || [];
window.databaseMember = [];
window.kategoriAktif = 'all';
window.nomorAntreanHariIni = parseInt(localStorage.getItem('antreanMainstay')) || 1;
window.currentMenuDetail = null;
window.qtyCounter = 1; // Variabel khusus untuk modal detail HTML Anda
window.targetLoginRole = ''; 
window.isKasirMode = false; // Flag status ambil alih POS
window.tempOrderData = null; // Menyimpan data sementara sebelum kirim WA

// Konfigurasi Sistem Default (Bisa ditimpa oleh data dari Panel Owner nantinya)
window.systemConfig = {
    nomorWA: "628977099557",
    tokoBuka: true,
    audioAktif: true,
    pinOwner: "888888",
    urlSpreadsheet: "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec",
    footerStruk: "Terima Kasih!\nPassword WiFi: mainstay2026"
};

// Data Dummy Karyawan (Nantinya akan diganti sinkronisasi dengan Firebase HRD)
window.dbStaf = [
    { id: "S01", nama: "Kasir 1", pin: "123456" },
    { id: "S02", nama: "Kasir 2", pin: "654321" }
];

// ----------------------------------------------------------------------------
// 3. UTILITAS: JAM REAL-TIME, AUDIO, & INJEKSI STRUK
// ----------------------------------------------------------------------------
window.updateClock = function() {
    const now = new Date();
    const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const dateStr = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
    const el = document.getElementById('live-clock');
    if (el) el.innerText = `${dateStr} ${jam} WIB`;
};
setInterval(window.updateClock, 1000);

window.playAudio = function(type) {
    if (!window.systemConfig.audioAktif) return;
    try {
        const audioEl = document.getElementById(`audio-${type}`);
        if (audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch(e => console.warn("Browser memblokir autoplay audio."));
        }
        
        // Efek Flash Kedip di layar
        const flash = document.getElementById('screen-flash');
        if(flash) {
            flash.classList.remove('hidden');
            flash.classList.add(type === 'masuk' ? 'bg-blue-500' : 'bg-green-500');
            flash.classList.replace('opacity-0', 'opacity-30');
            setTimeout(() => {
                flash.classList.replace('opacity-30', 'opacity-0');
                setTimeout(() => {
                    flash.classList.add('hidden');
                    flash.classList.remove('bg-blue-500', 'bg-green-500');
                }, 300);
            }, 200);
        }
    } catch (err) { console.error(err); }
};

// ----------------------------------------------------------------------------
// 4. NAVIGASI HALAMAN & SISTEM LOGIN (Menyesuaikan ID HTML)
// ----------------------------------------------------------------------------
window.switchRoleView = function(role) {
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
    
    // Cek Autentikasi jika mencoba masuk ke halaman terlindungi
    if (role !== 'customer' && currentSession !== role) {
        window.targetLoginRole = role;
        
        // Sesuaikan teks judul modal sesuai HTML
        const titleEl = document.getElementById('login-title');
        if (titleEl) {
            titleEl.innerHTML = role === 'owner' 
                ? '<i class="fa-solid fa-shield-halved text-amber-500 mr-2"></i> Akses Master' 
                : '<i class="fa-solid fa-desktop text-amber-500 mr-2"></i> Akses Kasir';
        }
        
        document.getElementById('login-pin').value = '';
        document.getElementById('login-error').classList.add('hidden');
        
        const modal = document.getElementById('modal-login');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
        return;
    }

    // Tampilkan View yang direquest, sembunyikan yang lain
    ['customer', 'kasir', 'owner'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.classList.toggle('hidden', v !== role);
    });
    
    // Styling Indikator Bottom Navigation (Menyesuaikan class HTML Tailwind)
    ['customer', 'kasir', 'owner'].forEach(n => {
        const btn = document.getElementById(`nav-${n}`);
        if (!btn) return;
        const indicator = btn.querySelector('.nav-indicator');
        
        if (n === role) {
            btn.classList.add('text-amber-500'); btn.classList.remove('text-gray-400');
            if(indicator) indicator.classList.remove('hidden');
        } else {
            btn.classList.add('text-gray-400'); btn.classList.remove('text-amber-500');
            if(indicator) indicator.classList.add('hidden');
        }
    });

    // Sembunyikan elemen Customer (Footer Maps) saat masuk panel staf
    const footer = document.getElementById('customer-footer');
    if (footer) footer.classList.toggle('hidden', role !== 'customer');

    // Jika masuk Owner, update data otomatis (Fungsinya ada di Tahap 5)
    if (role === 'owner' && typeof window.updateStatistikOwner === 'function') {
        window.updateStatistikOwner();
    }
};

window.closeLoginModal = function() {
    const modal = document.getElementById('modal-login');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.togglePinVisibility = function() {
    const input = document.getElementById('login-pin');
    const icon = document.getElementById('pin-eye-icon');
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

window.prosesLogin = function() {
    const inputEl = document.getElementById('login-pin');
    const errorEl = document.getElementById('login-error');
    if (!inputEl) return;
    
    const pin = inputEl.value;
    
    if (window.targetLoginRole === 'owner') {
        if (pin === window.systemConfig.pinOwner) {
            localStorage.setItem('sesiMainstay', 'owner');
            window.closeLoginModal();
            window.switchRoleView('owner');
            window.playAudio('siap');
        } else {
            if(errorEl) errorEl.classList.remove('hidden');
        }
    } else if (window.targetLoginRole === 'kasir') {
        // Cek PIN Staf atau PIN Owner (Bos bisa login sebagai kasir)
        const staf = window.dbStaf.find(s => s.pin === pin);
        if (staf || pin === window.systemConfig.pinOwner) {
            localStorage.setItem('sesiMainstay', 'kasir');
            window.closeLoginModal();
            window.switchRoleView('kasir');
            window.playAudio('siap');
        } else {
            if(errorEl) errorEl.classList.remove('hidden');
        }
    }
};

window.prosesLogout = function(role) {
    const pesan = role === 'kasir' ? "Tutup shift Kasir dan kembali ke Menu?" : "Kunci panel Master Owner?";
    if (confirm(pesan)) {
        localStorage.setItem('sesiMainstay', 'customer');
        window.switchRoleView('customer');
    }
};

// ----------------------------------------------------------------------------
// 5. INISIALISASI SAAT HALAMAN SELESAI DIMUAT (DOM READY)
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // A. Sinkronisasi Konfigurasi dari LocalStorage (jika ada)
    const savedConfig = localStorage.getItem('mainstayConfig');
    if (savedConfig) {
        window.systemConfig = Object.assign(window.systemConfig, JSON.parse(savedConfig));
    }

    // B. Inject area struk tersembunyi karena di HTML belum disediakan
    if(!document.getElementById('area-cetak-struk')) {
        const printArea = document.createElement('div');
        printArea.id = 'area-cetak-struk';
        printArea.className = 'hidden'; // Disembunyikan dengan Tailwind
        document.body.appendChild(printArea);
    }

    // C. Jalankan Jam Pertama Kali
    window.updateClock();

    // D. Kembalikan User ke View terakhirnya (Customer / Kasir / Owner)
    const sesiAktif = localStorage.getItem('sesiMainstay') || 'customer';
    window.switchRoleView(sesiAktif);
});
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 2: KATALOG FIREBASE & MODAL MENU
// ============================================================================

// ----------------------------------------------------------------------------
// 1. SINKRONISASI KATALOG DARI FIREBASE (Real-time Listener)
// ----------------------------------------------------------------------------
window.loadMenuFromFirebase = function() {
    if (!window.db || !window.fbOnValue || !window.fbRef) {
        console.warn("Sistem Firebase belum terhubung sempurna.");
        return;
    }

    const menuRef = window.fbRef(window.db, 'menu');
    
    // fbOnValue akan terus memantau database. Jika ada perubahan stok dari Owner,
    // layar pelanggan/kasir akan otomatis terupdate tanpa perlu di-refresh.
    window.fbOnValue(menuRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Konversi dari Object Firebase ke Array JavaScript
            window.katalogMenu = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
        } else {
            // Fallback Data Default (Hanya aktif jika database Firebase Anda kosong)
            window.katalogMenu = [
                { id: 'm1', nama: 'Es Kopi Mainstay', harga: 16000, kategori: 'coffee', stok: 50, image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=300', deskripsi: 'Kopi susu gula aren andalan.' },
                { id: 'm2', nama: 'Matcha Latte', harga: 18000, kategori: 'non-coffee', stok: 20, image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=300', deskripsi: 'Perpaduan matcha premium dan susu segar.' },
                { id: 'm3', nama: 'Americano Dingin', harga: 14000, kategori: 'coffee', stok: 0, image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300', deskripsi: 'Kopi hitam murni tanpa gula.' }
            ];
        }
        
        // Render ulang tampilan jika data berubah
        window.renderKatalog(window.kategoriAktif !== 'all' ? '' : ''); 
    });
};

// ----------------------------------------------------------------------------
// 2. RENDER KATALOG KE HTML (Menyesuaikan ID "menu-grid")
// ----------------------------------------------------------------------------
window.renderKatalog = function(query = '') {
    const container = document.getElementById('menu-grid');
    if (!container) return;

    container.innerHTML = '';

    // Logika Filter Berdasarkan Kategori dan Input Pencarian
    let menuTampil = window.katalogMenu;
    
    if (window.kategoriAktif !== 'all') {
        menuTampil = menuTampil.filter(m => m.kategori === window.kategoriAktif);
    }
    if (query) {
        menuTampil = menuTampil.filter(m => m.nama.toLowerCase().includes(query.toLowerCase()));
    }

    if (menuTampil.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400 font-bold">Menu tidak ditemukan.</div>`;
        return;
    }

    // Render ke DOM menggunakan struktur Tailwind dari file asli
    menuTampil.forEach(item => {
        const div = document.createElement('div');
        div.className = "bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow relative group";
        div.onclick = () => window.openMenuDetail(item.id);
        
        div.innerHTML = `
            <div class="relative h-32 bg-gray-200 overflow-hidden">
                <img src="${item.image}" alt="${item.nama}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                ${item.stok <= 0 ? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10"><span class="text-white font-black text-xs px-3 py-1 bg-red-500 rounded-full shadow-md tracking-wider">HABIS</span></div>` : ''}
            </div>
            <div class="p-3">
                <h3 class="font-black text-gray-800 text-xs md:text-sm mb-1 leading-tight line-clamp-2">${item.nama}</h3>
                <p class="text-amber-500 font-black text-xs md:text-sm">Rp ${parseInt(item.harga).toLocaleString('id-ID')}</p>
            </div>
        `;
        container.appendChild(div);
    });
};

// ----------------------------------------------------------------------------
// 3. FILTER KATEGORI & SEARCH BAR
// ----------------------------------------------------------------------------
window.filterKategori = function(kategori) {
    window.kategoriAktif = kategori;
    
    // Update warna tombol Tab Kategori (Oranye untuk aktif, Abu untuk tidak aktif)
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(`'${kategori}'`)) {
            btn.className = "cat-btn active shrink-0 px-5 py-2.5 rounded-full text-xs font-black bg-amber-500 text-white shadow-md transition";
        } else {
            btn.className = "cat-btn shrink-0 px-5 py-2.5 rounded-full text-xs font-bold bg-slate-100 text-gray-600 hover:bg-slate-200 transition";
        }
    });
    
    // Reset bar pencarian ketika pengguna memencet tab kategori lain
    const searchInput = document.getElementById('search-menu');
    if (searchInput) searchInput.value = '';
    
    window.renderKatalog();
};

window.searchKatalog = function() {
    const query = document.getElementById('search-menu').value;
    window.renderKatalog(query);
};

// ----------------------------------------------------------------------------
// 4. MODAL DETAIL MENU & LOGIKA KUANTITAS
// ----------------------------------------------------------------------------
window.openMenuDetail = function(id) {
    const item = window.katalogMenu.find(m => m.id === id);
    if (!item) return;
    
    // Cegah menu habis dimasukkan ke keranjang
    if (item.stok <= 0) return alert("Maaf, stok menu ini sedang habis.");

    window.currentMenuDetail = item;
    window.qtyCounter = 1; // Reset kalkulator ke 1 setiap kali buka modal baru

    // Menginjeksi data menu ke ID yang sudah Anda sediakan di index.html
    const imgEl = document.getElementById('detail-img');
    if(imgEl) imgEl.src = item.image;
    
    const nameEl = document.getElementById('detail-name');
    if(nameEl) nameEl.innerText = item.nama;
    
    const descEl = document.getElementById('detail-desc');
    if(descEl) descEl.innerText = item.deskripsi || "Pilihan tepat untuk menyegarkan harimu.";
    
    const qtyEl = document.getElementById('detail-qty');
    if(qtyEl) qtyEl.innerText = window.qtyCounter;
    
    window.updateDetailPrice();

    // Memunculkan panel animasi pop-up (Modal)
    const modal = document.getElementById('modal-menu-detail');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeMenuDetail = function() {
    const modal = document.getElementById('modal-menu-detail');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    window.currentMenuDetail = null;
};

window.updateQty = function(change) {
    let newQty = window.qtyCounter + change;
    
    // Validasi wajar: Tidak boleh minus, dan dibatasi pesanan maksimum
    if (newQty < 1) newQty = 1; 
    if (newQty > 50) newQty = 50; 
    
    window.qtyCounter = newQty;
    
    const qtyEl = document.getElementById('detail-qty');
    if(qtyEl) qtyEl.innerText = window.qtyCounter;
    
    window.updateDetailPrice();
};

window.updateDetailPrice = function() {
    if (!window.currentMenuDetail) return;
    const total = window.currentMenuDetail.harga * window.qtyCounter;
    const priceEl = document.getElementById('detail-total-price');
    if (priceEl) {
        priceEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
    }
};

// ----------------------------------------------------------------------------
// 5. TRIGGER LOAD FIREBASE SAAT AWAL (Menyatu dengan DOMContentLoaded)
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const sesiAktif = localStorage.getItem('sesiMainstay') || 'customer';
    
    // Hanya ambil data katalog Firebase jika posisinya sedang di halaman Customer
    if (sesiAktif === 'customer' || sesiAktif === 'kasir') {
        // Beri sedikit jeda 500ms agar koneksi Tahap 1 terinisialisasi sempurna 
        setTimeout(() => {
            if(typeof window.loadMenuFromFirebase === 'function') {
                window.loadMenuFromFirebase();
            }
        }, 500);
    }
});
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 3: KERANJANG, VOUCHER & CHECKOUT
// ============================================================================

// ----------------------------------------------------------------------------
// 1. TAMBAH KE KERANJANG (ADD TO CART)
// ----------------------------------------------------------------------------
window.addToCart = function() {
    if (!window.currentMenuDetail) return;
    
    // Membuat objek barang yang dimasukkan ke keranjang
    const cartItem = {
        cartId: Date.now().toString(), // ID unik per item di keranjang
        id: window.currentMenuDetail.id,
        nama: window.currentMenuDetail.nama,
        harga: window.currentMenuDetail.harga,
        qty: window.qtyCounter,
        subtotal: window.currentMenuDetail.harga * window.qtyCounter,
        kategori: window.currentMenuDetail.kategori
    };

    window.currentCart.push(cartItem);
    
    // Simpan ke memori browser agar pesanan tidak hilang kalau ke-refresh
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    
    window.closeMenuDetail();
    window.updateCartFloat();
    window.playAudio('masuk'); // Mainkan notifikasi suara
};

// ----------------------------------------------------------------------------
// 2. UPDATE TOMBOL KERANJANG MELAYANG (FLOATING CART)
// ----------------------------------------------------------------------------
window.updateCartFloat = function() {
    const floatEl = document.getElementById('floating-cart');
    const badgeEl = document.getElementById('cart-badge');
    const totalEl = document.getElementById('cart-total-float');
    
    if (!floatEl) return;

    if (window.currentCart.length > 0) {
        let totalQty = window.currentCart.reduce((sum, item) => sum + item.qty, 0);
        let totalPrice = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
        
        if (badgeEl) badgeEl.innerText = totalQty;
        if (totalEl) totalEl.innerText = `Rp ${totalPrice.toLocaleString('id-ID')}`;
        
        // Munculkan tombol dari bawah (efek Tailwind)
        floatEl.classList.remove('hidden');
    } else {
        // Sembunyikan jika keranjang kosong
        floatEl.classList.add('hidden');
    }
};

// ----------------------------------------------------------------------------
// 3. RENDER ISI MODAL KERANJANG (REVIEW PESANAN)
// ----------------------------------------------------------------------------
window.openCartModal = function() {
    const container = document.getElementById('cart-items-container');
    if (!container) return;
    
    container.innerHTML = '';
    let grandTotal = 0;

    window.currentCart.forEach(item => {
        grandTotal += item.subtotal;
        
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100";
        div.innerHTML = `
            <div>
                <h4 class="font-black text-gray-800 text-sm">${item.nama}</h4>
                <p class="text-[10px] font-bold text-gray-500">${item.qty}x @ Rp ${parseInt(item.harga).toLocaleString('id-ID')}</p>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-black text-amber-500 text-sm">Rp ${parseInt(item.subtotal).toLocaleString('id-ID')}</span>
                <button onclick="window.removeFromCart('${item.cartId}')" class="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash text-xs"></i></button>
            </div>
        `;
        container.appendChild(div);
    });

    // Reset dan Update Total Harga
    window.currentDiscountValue = 0; // Reset diskon global
    
    document.getElementById('cart-subtotal').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
    document.getElementById('cart-discount-row').classList.add('hidden');
    document.getElementById('cart-grand-total').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
    
    // Label aktor pesanan
    const actorLabel = document.getElementById('cart-actor-label');
    if(actorLabel) {
        actorLabel.innerText = window.isKasirMode ? 'Penginput: KASIR' : 'Penginput: Customer';
        actorLabel.className = window.isKasirMode ? 'text-[10px] font-bold text-amber-700 mt-1 bg-amber-100 px-2 py-0.5 rounded-md inline-block' : 'text-[10px] font-bold text-gray-500 mt-1 bg-gray-100 px-2 py-0.5 rounded-md inline-block';
    }
    
    document.getElementById('modal-cart').classList.remove('hidden');
    document.getElementById('modal-cart').classList.add('flex');
};

window.closeCartModal = function() {
    const modal = document.getElementById('modal-cart');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.removeFromCart = function(cartId) {
    window.currentCart = window.currentCart.filter(item => item.cartId !== cartId);
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.updateCartFloat();
    
    if(window.currentCart.length === 0) {
        window.closeCartModal();
    } else {
        window.openCartModal(); // Refresh ulang tampilan keranjang
    }
};

// ----------------------------------------------------------------------------
// 4. MESIN VOUCHER & PROMO (CRM)
// ----------------------------------------------------------------------------
// Database Dummy Voucher (Nanti bisa disambung ke Firebase Panel Owner)
window.dbVoucher = {
    "MAINSTAY20": { tipe: "persen", nilai: 20, minBelanja: 50000, maxDiskon: 15000 },
    "DISKON10K": { tipe: "nominal", nilai: 10000, minBelanja: 30000 }
};

window.currentDiscountValue = 0; // Menyimpan besaran diskon aktif

window.terapkanPromo = function() {
    const promoInput = document.getElementById('co-promo');
    if (!promoInput || promoInput.value.trim() === '') return alert("Masukkan kode voucher terlebih dahulu!");

    const kode = promoInput.value.toUpperCase();
    const voucher = window.dbVoucher[kode];

    if (!voucher) return alert("Kode voucher tidak valid atau sudah kadaluarsa.");

    let currentSubtotal = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    
    if (currentSubtotal < voucher.minBelanja) {
        return alert(`Voucher ini membutuhkan minimal belanja Rp ${voucher.minBelanja.toLocaleString('id-ID')}`);
    }

    let nilaiDiskon = 0;
    if (voucher.tipe === 'persen') {
        nilaiDiskon = currentSubtotal * (voucher.nilai / 100);
        if (voucher.maxDiskon && nilaiDiskon > voucher.maxDiskon) nilaiDiskon = voucher.maxDiskon;
    } else if (voucher.tipe === 'nominal') {
        nilaiDiskon = voucher.nilai;
    }

    window.currentDiscountValue = nilaiDiskon;
    let grandTotal = currentSubtotal - nilaiDiskon;

    // Update UI Rincian Biaya
    document.getElementById('cart-discount-row').classList.remove('hidden');
    document.getElementById('cart-discount-value').innerText = `- Rp ${nilaiDiskon.toLocaleString('id-ID')}`;
    document.getElementById('cart-grand-total').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
    
    alert(`Voucher ${kode} berhasil diterapkan!\nAnda hemat Rp ${nilaiDiskon.toLocaleString('id-ID')}`);
};

// ----------------------------------------------------------------------------
// 5. PROSES CHECKOUT PELANGGAN & GENERATOR ORDER
// ----------------------------------------------------------------------------
window.prosesCheckout = function() {
    if (window.currentCart.length === 0) return alert("Keranjang belanja kosong.");
    
    // Mengambil Form Data Diri
    const inputNama = document.getElementById('co-name');
    const inputPhone = document.getElementById('co-phone');
    const inputMember = document.getElementById('co-member'); // Checkbox CRM
    
    let nama = inputNama && inputNama.value.trim() !== '' ? inputNama.value : (window.isKasirMode ? 'Pelanggan Walk-in' : 'Pelanggan E-Menu');
    let phone = inputPhone ? inputPhone.value : '';
    let isDaftarMember = inputMember ? inputMember.checked : false;
    
    // Format Nomor WA (Ubah 08 jadi 628)
    if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
    }
    
    // Mengambil Pilihan Radio Button Tipe & Pembayaran
    const tipeRadio = document.querySelector('input[name="co_tipe"]:checked');
    const paymentRadio = document.querySelector('input[name="co_payment"]:checked');
    
    const tipe = tipeRadio ? tipeRadio.value : 'Instant';
    const payment = paymentRadio ? paymentRadio.value : 'Tunai';

    // Generate ID Pesanan (Format: ORD-Waktu)
    const noPesanan = `ORD-${Date.now().toString().slice(-4)}`;
    
    // Kalkulasi Total
    const subtotal = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAkhir = subtotal - window.currentDiscountValue;
    
    // Bungkus Data Transaksi
    const dataTransaksi = {
        waktu: new Date().toISOString(),
        noStruk: noPesanan,
        pelanggan: nama,
        telepon: phone,
        daftarMember: isDaftarMember,
        tipe: tipe,
        metodePembayaran: payment,
        kasir: window.isKasirMode ? document.getElementById('kasir-staf-dropdown').value : 'E-Menu',
        item: window.currentCart,
        diskon: window.currentDiscountValue,
        totalTagihan: totalAkhir,
        statusDapur: 'baru' // Untuk badge dapur owner/kasir
    };

    // JIKA TRANSAKSI DILAKUKAN OLEH KASIR (AMBIL ALIH POS)
    if (window.isKasirMode) {
        // Dilempar ke fungsi Kasir di Tahap 4
        if(typeof window.simpanTransaksiKasir === 'function') {
            window.simpanTransaksiKasir(dataTransaksi);
        } else {
            console.error("Fungsi Kasir belum siap.");
        }
        return;
    }

    // JIKA CUSTOMER MEMILIH QRIS RESTO
    if (payment === 'QRIS Resto') {
        const qrisTotalEl = document.getElementById('qris-total-bayar');
        const qrisAntreanEl = document.getElementById('qris-antrean');
        const qrisImgDisplay = document.getElementById('qris-img-display');
        
        if(qrisTotalEl) qrisTotalEl.innerText = `Rp ${totalAkhir.toLocaleString('id-ID')}`;
        if(qrisAntreanEl) qrisAntreanEl.innerText = `#${noPesanan}`;
        
        // Set gambar QRIS dari konfigurasi toko
        if(qrisImgDisplay && window.systemConfig.qrisUrl) {
            qrisImgDisplay.src = window.systemConfig.qrisUrl;
        }

        // Simpan data order sementara untuk dikirim via WA setelah transfer
        window.tempOrderData = dataTransaksi; 
        
        document.getElementById('modal-qris').classList.remove('hidden');
        document.getElementById('modal-qris').classList.add('flex');
    } 
    // JIKA CUSTOMER MEMILIH TUNAI
    else {
        window.kirimBuktiWA(dataTransaksi);
    }
};

// ----------------------------------------------------------------------------
// 6. MODAL QRIS & PENGIRIMAN KE WHATSAPP
// ----------------------------------------------------------------------------
window.batalQRIS = function() {
    document.getElementById('modal-qris').classList.add('hidden');
    document.getElementById('modal-qris').classList.remove('flex');
};

window.unduhQRIS = function() {
    alert("Silakan ambil Screenshot (Tangkapan Layar) HP Anda untuk menyimpan barcode QRIS ini.");
};

window.kirimBuktiWA = function(data = window.tempOrderData) {
    if (!data) return alert("Data pesanan tidak ditemukan.");

    let teks = `Halo Mainstay, saya memesan via E-Menu:\n\n`;
    teks += `*Nama:* ${data.pelanggan}\n`;
    
    // Opsional: Cek apakah customer setuju jadi member
    if(data.daftarMember && data.telepon !== '') teks += `_Saya setuju mendaftar Member (No: ${data.telepon})_\n`;
    
    teks += `*Tipe Pesanan:* ${data.tipe}\n`;
    teks += `*Pembayaran:* ${data.metodePembayaran}\n`;
    teks += `*No. Antrean:* ${data.noStruk}\n\n`;
    teks += `*Rincian Pesanan:*\n`;
    
    data.item.forEach(i => teks += `- ${i.nama} (${i.qty}x) = Rp ${i.subtotal.toLocaleString('id-ID')}\n`);
    
    if (data.diskon > 0) {
        teks += `\n*Diskon Voucher:* - Rp ${data.diskon.toLocaleString('id-ID')}`;
    }
    
    teks += `\n*TOTAL TAGIHAN: Rp ${data.totalTagihan.toLocaleString('id-ID')}*\n\n`;
    
    if (data.metodePembayaran === 'QRIS Resto') {
        teks += window.systemConfig.draftWA ? window.systemConfig.draftWA.qris + data.noStruk : `_Bersama pesan ini saya lampirkan bukti transfer QRIS._`;
    }

    // Bersihkan Keranjang setelah checkout berhasil
    window.currentCart = [];
    localStorage.removeItem('cartMainstay');
    window.currentDiscountValue = 0;
    window.tempOrderData = null;
    
    window.updateCartFloat();
    window.closeCartModal();
    window.batalQRIS();

    // Kosongkan form input
    const inputNama = document.getElementById('co-name');
    const inputPhone = document.getElementById('co-phone');
    if(inputNama) inputNama.value = '';
    if(inputPhone) inputPhone.value = '';

    // Buka tautan WhatsApp Admin Resto
    const targetWA = window.systemConfig.nomorWA || "628977099557";
    window.open(`https://wa.me/${targetWA}?text=${encodeURIComponent(teks)}`, '_blank');
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 4: SISTEM KASIR, GOOGLE SHEETS & STRUK THERMAL
// ============================================================================

// ----------------------------------------------------------------------------
// 1. MODE AMBIL ALIH POS (KASIR ORDER MANUAL)
// ----------------------------------------------------------------------------
window.bukaPOS = function(role) {
    window.isKasirMode = true; // Kunci sistem ke mode staf internal
    
    // Pindahkan layar ke halaman Katalog Customer
    window.switchRoleView('customer');
    
    // Ubah visual teks tombol "Checkout" di keranjang melayang menjadi tombol "Cetak"
    const cartBtnUI = document.querySelector('#floating-cart .bg-amber-500');
    if (cartBtnUI) {
        cartBtnUI.innerHTML = 'Bayar & Cetak <i class="fa-solid fa-print ml-1"></i>';
    }
    
    alert(`⚡ MODE AMBIL ALIH POS AKTIF\nDimulai oleh: ${role}.\n\nPesanan yang Anda proses sekarang akan langsung dicetak ke printer kasir dan tidak akan dikirim via WhatsApp.`);
};

// ----------------------------------------------------------------------------
// 2. SIMPAN TRANSAKSI & REKAP DATABASE FIREBASE
// ----------------------------------------------------------------------------
window.simpanTransaksiKasir = async function(dataTransaksi) {
    // Asumsi default untuk mempercepat antrean: uang tunai pas sesuai tagihan
    dataTransaksi.uangDiterima = dataTransaksi.totalTagihan;
    dataTransaksi.uangKembali = 0;

    try {
        // A. Kirim data transaksi secara real-time ke Firebase (Database Utama)
        if (window.db && window.fbPush && window.fbSet) {
            const historiRef = window.fbRef(window.db, 'transaksi_hari_ini');
            const transaksiBaruRef = window.fbPush(historiRef);
            await window.fbSet(transaksiBaruRef, dataTransaksi);
        }

        // B. Backup paralel ke Google Spreadsheet (Background Process)
        window.kirimKeSpreadsheet(dataTransaksi);

        // C. Eksekusi Print Struk Thermal
        window.cetakStrukThermal(dataTransaksi);
        
        // Reset state & keranjang (dilakukan setelah print selesai di dalam cetakStrukThermal)
    } catch (error) {
        console.error("Sistem Kasir Error:", error);
        alert("Terjadi kegagalan saat menyimpan transaksi ke server.");
    }
};

// ----------------------------------------------------------------------------
// 3. INTEGRASI GOOGLE SPREADSHEET (APPS SCRIPT)
// ----------------------------------------------------------------------------
window.kirimKeSpreadsheet = function(data) {
    const scriptURL = window.systemConfig.urlSpreadsheet;
    if (!scriptURL) {
        console.warn("URL Google Sheets belum dikonfigurasi.");
        return;
    }

    // Format Payload data agar gampang dibaca di kolom Excel/Sheets
    const payload = {
        action: 'catat_transaksi',
        noStruk: data.noStruk,
        kasir: data.kasir,
        pelanggan: data.pelanggan,
        total: data.totalTagihan,
        metode: data.metodePembayaran,
        // Gabungkan seluruh array item menjadi 1 teks baris koma
        detailPesanan: data.item.map(i => `${i.nama} (${i.qty}x)`).join(', '),
        tanggal: data.waktu
    };

    // Gunakan fungsi Fetch No-Cors agar berjalan di belakang layar tanpa loading
    fetch(scriptURL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        console.log(`Berhasil mem-backup Struk ${data.noStruk} ke Google Sheets.`);
    }).catch(err => {
        console.error("Gagal mengirim ke Google Sheets:", err);
    });
};

// ----------------------------------------------------------------------------
// 4. GENERATOR STRUK THERMAL (BLUETOOTH / USB PRINTER)
// ----------------------------------------------------------------------------
window.cetakStrukThermal = function(data) {
    const areaStruk = document.getElementById('area-cetak-struk');
    if (!areaStruk) return;

    // Desain HTML ini diukur presisi untuk kertas thermal ukuran 58mm / 80mm
    let htmlStruk = `
        <div style="width: 100%; max-width: 300px; font-family: monospace; font-size: 12px; margin: 0 auto; color: #000; padding: 10px; border: 1px dashed #ccc;">
            
            <div style="text-align: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; font-weight: 900;">MAINSTAY DRINK</h3>
                <p style="margin: 2px 0;">Semarang, Indonesia</p>
                <p style="margin: 2px 0; font-size: 10px;">${new Date(data.waktu).toLocaleString('id-ID')}</p>
            </div>
            
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin-bottom: 5px;">
                <table style="width: 100%; font-size: 12px;">
                    <tr><td>No: ${data.noStruk}</td><td style="text-align: right;">${data.kasir}</td></tr>
                    <tr><td colspan="2">Pelanggan: ${data.pelanggan} (${data.tipe})</td></tr>
                </table>
            </div>
            
            <table style="width: 100%; font-size: 12px; margin-bottom: 5px;">
    `;

    // Looping setiap menu yang dipesan ke dalam struk
    data.item.forEach(item => {
        htmlStruk += `
            <tr><td colspan="2" style="padding-top: 4px;"><strong>${item.nama}</strong></td></tr>
            <tr>
                <td>${item.qty} x ${parseInt(item.harga).toLocaleString('id-ID')}</td>
                <td style="text-align: right;">${parseInt(item.subtotal).toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    // Bagian Footer Harga
    htmlStruk += `
            </table>
            
            <div style="border-top: 1px dashed #000; padding-top: 5px;">
                <table style="width: 100%; font-size: 12px; font-weight: bold;">
                    ${data.diskon > 0 ? `<tr><td>Diskon</td><td style="text-align: right;">- Rp ${data.diskon.toLocaleString('id-ID')}</td></tr>` : ''}
                    <tr><td>TOTAL</td><td style="text-align: right;">Rp ${data.totalTagihan.toLocaleString('id-ID')}</td></tr>
                    <tr><td>(${data.metodePembayaran})</td><td style="text-align: right;">Rp ${data.uangDiterima.toLocaleString('id-ID')}</td></tr>
                </table>
            </div>
            
            <div style="text-align: center; margin-top: 15px; font-size: 10px;">
                <p style="margin: 2px 0;">${window.systemConfig.footerStruk.replace(/\n/g, '<br>')}</p>
            </div>
        </div>
    `;

    // Injeksi ke elemen HTML tersembunyi
    areaStruk.innerHTML = htmlStruk;

    // Putar audio sukses
    window.playAudio('siap');

    // Proses "Membajak Layar" sesaat untuk memicu fungsi Print Browser
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = areaStruk.innerHTML;
    
    window.print(); // Memicu kotak dialog printer
    
    // Kembalikan layar ke HTML asli dan reload untuk mereset seluruh Event Listener JavaScript dengan aman
    document.body.innerHTML = originalContent;
    
    // Reset Data Keranjang sebelum Reload
    localStorage.removeItem('cartMainstay');
    window.currentCart = [];
    
    window.location.reload(); 
};

// ----------------------------------------------------------------------------
// 5. NAVIGASI TAB DASHBOARD KASIR (Konfirmasi, Dapur, Selesai)
// ----------------------------------------------------------------------------
window.switchKasirTab = function(tabName) {
    // Fungsi ini mengatur efek visual pada tombol Tab di Halaman Kasir (HTML index.html Anda)
    ['konfirmasi', 'dapur', 'selesai'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (!btn) return;
        
        if (t === tabName) {
            btn.className = "flex-1 py-2.5 text-xs font-black rounded-xl transition bg-white shadow-sm text-amber-600 relative";
        } else {
            btn.className = "flex-1 py-2.5 text-xs font-black text-slate-500 rounded-xl transition relative hover:text-slate-700";
        }
    });
    
    // Nanti di Tahap 5 kita akan menambahkan fungsi untuk merender list pesanan ke tab-tab ini
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 5 (FINAL): ABSENSI KAMERA, DASBOR OWNER & PANEL
// ============================================================================

// ----------------------------------------------------------------------------
// 1. SISTEM ABSENSI HRD (AKSES KAMERA & REVIEW WAJAH)
// ----------------------------------------------------------------------------
window.cameraStream = null;

window.openAbsensi = async function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    const loading = document.getElementById('camera-loading');
    
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    
    try {
        // Meminta izin akses kamera depan (selfie)
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        window.cameraStream = stream;
        
        if (video) {
            video.srcObject = stream;
            // Menunggu kamera siap, lalu matikan loading animasi
            video.onloadedmetadata = () => {
                video.play();
                video.classList.remove('hidden');
                if(loading) loading.classList.add('hidden');
            };
        }
    } catch(err) {
        alert("Gagal mengakses kamera. Pastikan browser diizinkan untuk menggunakan kamera.\nError: " + err.message);
        window.closeAbsensi();
    }
};

window.closeAbsensi = function() {
    // Mematikan lampu/akses kamera agar tidak menyedot baterai
    if (window.cameraStream) {
        window.cameraStream.getTracks().forEach(track => track.stop());
        window.cameraStream = null;
    }
    
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    const loading = document.getElementById('camera-loading');
    
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    if(video) { video.classList.add('hidden'); video.srcObject = null; }
    if(loading) loading.classList.remove('hidden');
};

window.prosesAbsen = function(tipe) {
    const pinInput = document.getElementById('absen-pin');
    if (!pinInput || pinInput.value.trim() === '') return alert("Harap masukkan PIN Karyawan!");

    const pin = pinInput.value;
    const staf = window.dbStaf.find(s => s.pin === pin);

    if (!staf) return alert("PIN Tidak Terdaftar di HRD!");

    // Menangkap frame (foto) dari Video Stream
    const video = document.getElementById('attendance-video');
    const canvas = document.getElementById('attendance-canvas');
    let photoData = '';
    
    if (video && canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Mengubah foto jadi data Base64 dengan kualitas 70% agar ringan
        photoData = canvas.toDataURL('image/jpeg', 0.7); 
    }

    const now = new Date();
    
    // Siapkan UI Modal Review Absen
    const reviewModal = document.getElementById('modal-absen-review');
    const imgReview = document.getElementById('review-foto');
    const namaReview = document.getElementById('review-nama');
    const jamReview = document.getElementById('review-jam');
    const statusReview = document.getElementById('review-status');

    if(imgReview) imgReview.src = photoData;
    if(namaReview) namaReview.innerText = staf.nama;
    if(jamReview) jamReview.innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${tipe}: ${now.toLocaleTimeString('id-ID')} WIB`;
    
    // Status (Misal jam 07:00 adalah batas masuk)
    if (tipe === 'Masuk' && now.getHours() >= 8) {
        if(statusReview) {
            statusReview.innerText = 'TERLAMBAT';
            statusReview.className = 'inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-red-500 shadow-md tracking-wider';
        }
    } else {
        if(statusReview) {
            statusReview.innerText = tipe === 'Masuk' ? 'TEPAT WAKTU' : 'PULANG';
            statusReview.className = 'inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-green-500 shadow-md tracking-wider';
        }
    }

    // Bersihkan form dan matikan kamera
    pinInput.value = '';
    window.closeAbsensi();
    window.playAudio('siap');

    // Tampilkan Animasi Review
    if (reviewModal) {
        reviewModal.classList.remove('hidden');
        reviewModal.classList.add('flex');
    }

    // A. Simpan ke Firebase Database HRD
    if (window.db && window.fbPush && window.fbSet) {
        const absenRef = window.fbRef(window.db, 'absensi_harian');
        window.fbPush(absenRef).then(newRef => {
            window.fbSet(newRef, {
                waktu: now.toISOString(),
                idStaf: staf.id,
                nama: staf.nama,
                tipe: tipe,
                // fotoBase64: photoData // Buka komentar ini jika ingin foto tersimpan di server
            });
        });
    }

    // B. Sembunyikan Review Otomatis setelah 4 detik
    setTimeout(() => {
        if (reviewModal) {
            reviewModal.classList.add('hidden');
            reviewModal.classList.remove('flex');
        }
    }, 4000);
};

// ----------------------------------------------------------------------------
// 2. DASBOR OWNER (STATISTIK KEUANGAN REAL-TIME FIREBASE)
// ----------------------------------------------------------------------------
window.updateStatistikOwner = function() {
    if (!window.db || !window.fbOnValue || !window.fbRef) return;
    
    const transaksiRef = window.fbRef(window.db, 'transaksi_hari_ini');

    // fbOnValue akan meng-update dasbor setiap ada transaksi kasir yang masuk detik itu juga
    window.fbOnValue(transaksiRef, (snapshot) => {
        let totalPendapatan = 0;
        let pesananBaru = 0;
        let pesananDapur = 0;
        let pesananSelesai = 0;

        if (snapshot.exists()) {
            const listTransaksi = Object.values(snapshot.val());
            
            listTransaksi.forEach(trx => {
                totalPendapatan += trx.totalTagihan;
                
                // Menghitung status badge dapur
                if (trx.statusDapur === 'baru' || !trx.statusDapur) pesananBaru++;
                else if (trx.statusDapur === 'dapur') pesananDapur++;
                else if (trx.statusDapur === 'selesai') pesananSelesai++;
            });
        }

        // Tembak angka ke dalam HTML
        const elUang = document.getElementById('stat-pendapatan');
        const elBaru = document.getElementById('stat-pesanan');
        const elDapur = document.getElementById('stat-dapur');
        const elSelesai = document.getElementById('stat-selesai');

        if(elUang) elUang.innerText = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
        if(elBaru) elBaru.innerText = pesananBaru;
        if(elDapur) elDapur.innerText = pesananDapur;
        if(elSelesai) elSelesai.innerText = pesananSelesai;
    });
};

// ----------------------------------------------------------------------------
// 3. FUNGSI BUKA-TUTUP 8 PANEL RAHASIA OWNER
// ----------------------------------------------------------------------------
window.openPanel = function(panelId) {
    const el = document.getElementById(panelId);
    if(el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
};

window.closePanel = function(panelId) {
    const el = document.getElementById(panelId);
    if(el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};

// ============================================================================
// SELAMAT! MAINSTAY DRINK POS SYSTEM BERHASIL DIINISIALISASI.
// ============================================================================
console.log("🚀 Mainstay Drink POS (Tahap 1-5) 100% Siap Beroperasi!");
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 6: SINKRONISASI ARUS KAS SPREADSHEET
// ============================================================================

window.tarikDataLaporanSpreadsheet = async function() {
    const panel = document.getElementById('panel-laporan');
    if (!panel) return;

    // Mengincar elemen teks HTML Anda secara spesifik (karena tidak ada ID di index.html)
    const elTotalUang = panel.querySelector('h3.text-3xl');
    const elTotalTrx = panel.querySelector('p.text-\\[10px\\]');
    
    if (elTotalUang) elTotalUang.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-lg mr-2"></i> Sinkronisasi...';
    
    try {
        // Melakukan request pembacaan data ke URL Google Script Anda
        const url = window.systemConfig.urlSpreadsheet + "?action=get_laporan";
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Tembak angka asli dari Spreadsheet ke HTML
            if (elTotalUang) elTotalUang.innerText = `Rp ${parseInt(data.total_pendapatan).toLocaleString('id-ID')}`;
            if (elTotalTrx) elTotalTrx.innerText = `Dari ${data.total_transaksi} Transaksi`;
        } else {
            throw new Error("Respon Google Script gagal");
        }
    } catch(error) {
        console.error("Gagal menarik laporan:", error);
        if (elTotalUang) elTotalUang.innerText = "Gagal Terhubung";
        if (elTotalTrx) elTotalTrx.innerText = "Periksa URL Script atau Koneksi Internet";
    }
};

// Modifikasi fungsi openPanel dari Tahap 5 agar otomatis menarik data 
// setiap kali tombol "Laporan" ditekan oleh Owner
const oldOpenPanel = window.openPanel;
window.openPanel = function(panelId) {
    // Panggil fungsi buka panel yang asli
    oldOpenPanel(panelId);
    
    // Jika panel yang dibuka adalah panel laporan, jalankan sinkronisasi Spreadsheet
    if (panelId === 'panel-laporan') {
        window.tarikDataLaporanSpreadsheet();
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 6: CRUD HRD, PROFIL OWNER, LOGO & QRIS CUSTOM
// ============================================================================

window.databaseStaf = window.dbStaf || []; 
// Otomatis menggunakan nama Mas Ihsan sebagai profil default
window.profilOwner = { nama: "M. Ihsan", wa: "", rekening: "", pin: window.systemConfig ? window.systemConfig.pinOwner : "888888" };

// --- 1. INISIALISASI UI (LOGO, QRIS, TOMBOL LOGOUT, & INJEKSI FORM HRD) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // A. Pasang Logo 512 PNG ke Header Web
    const logoImg = document.getElementById('header-logo-img');
    const logoIcon = document.getElementById('header-logo-icon');
    if (logoImg) {
        logoImg.src = 'logo-512.png';        
        logoImg.classList.remove('hidden');  
        if (logoIcon) logoIcon.classList.add('hidden'); 
    }

    // B. Pasang QRIS "qris-mainstay.png" ke Modal Pembayaran
    if(window.systemConfig) window.systemConfig.qrisUrl = "qris-mainstay.png";
    const qrisImgDisplay = document.getElementById('qris-img-display');
    if (qrisImgDisplay) {
        qrisImgDisplay.src = "qris-mainstay.png"; 
    }

    // C. Ubah Tombol "Kunci" di Dasbor Owner menjadi "Log Out"
    const btnKunci = document.querySelector('button[onclick="prosesLogout(\\'owner\\')"]');
    if(btnKunci) {
        btnKunci.innerHTML = '<i class="fa-solid fa-right-from-bracket text-red-400 group-hover:text-white transition"></i> Log Out';
    }

    // D. Injeksi UI Modal Form HRD ke dalam HTML
    if (!document.getElementById('modal-form-hrd')) {
        const modalHTML = `
        <div id="modal-form-hrd" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
            <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0">
                    <h2 id="hrd-form-title" class="font-black text-lg"><i class="fa-solid fa-user-plus text-teal-400 mr-2"></i>Tambah Karyawan</h2>
                    <button onclick="window.tutupFormHRD()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
                    <input type="hidden" id="hrd-id">
                    <input type="hidden" id="hrd-role" value="staf">
                    
                    <div class="flex gap-4 items-center">
                        <div class="w-16 h-16 bg-gray-100 rounded-full border border-gray-300 flex items-center justify-center text-2xl text-gray-400 overflow-hidden relative">
                            <img id="hrd-preview-foto" src="" class="absolute inset-0 w-full h-full object-cover hidden">
                            <i class="fa-solid fa-camera"></i>
                        </div>
                        <div class="flex-1">
                            <label class="block mb-1">URL Foto (PNG/JPG)</label>
                            <input type="text" id="hrd-foto" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500" placeholder="https://...">
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block mb-1">Nama Lengkap</label>
                            <input type="text" id="hrd-nama" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500">
                        </div>
                        <div>
                            <label class="block mb-1">PIN Login (6 Angka)</label>
                            <input type="text" id="hrd-pin" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500" maxlength="6">
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block mb-1">No. WhatsApp</label>
                            <input type="text" id="hrd-wa" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500">
                        </div>
                        <div>
                            <label class="block mb-1">E-Wallet / Rekening</label>
                            <input type="text" id="hrd-rekening" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500" placeholder="BCA 123... / OVO 08...">
                        </div>
                    </div>

                    <div id="hrd-area-gaji" class="space-y-4 p-4 border border-teal-100 bg-teal-50 rounded-xl mt-2">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-1">Status Karyawan</label>
                                <select id="hrd-tipe-kerja" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500">
                                    <option value="Tetap">Tetap</option>
                                    <option value="Kontrak">Kontrak</option>
                                    <option value="Part-time">Part-time</option>
                                </select>
                            </div>
                            <div>
                                <label class="block mb-1">Jam Kerja (Shift)</label>
                                <input type="text" id="hrd-shift" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500" placeholder="08:00 - 16:00">
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block mb-1">Tipe Gaji</label>
                                <select id="hrd-tipe-gaji" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500">
                                    <option value="Per Jam">Per Jam</option>
                                    <option value="Harian">Harian</option>
                                    <option value="Mingguan">Mingguan</option>
                                    <option value="Bulanan">Bulanan</option>
                                </select>
                            </div>
                            <div>
                                <label class="block mb-1">Nominal Gaji (Rp)</label>
                                <input type="number" id="hrd-nominal-gaji" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-teal-500">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button onclick="window.simpanDataHRD()" class="w-full bg-teal-600 text-white font-black py-3 rounded-xl hover:bg-teal-700 transition">SIMPAN DATA</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
});

// --- 2. FUNGSI RENDER LIST HRD KE PANEL OWNER ---
window.renderPanelHRD = function() {
    const panel = document.getElementById('panel-hrd');
    if (!panel) return;
    
    const containerUtama = panel.querySelector('.space-y-5');
    if (!containerUtama) return;

    containerUtama.innerHTML = ''; 

    // Render Profil Owner
    containerUtama.innerHTML += `
        <div class="bg-gray-900 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between mb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-xl font-black">
                    ${window.profilOwner.nama.charAt(0)}
                </div>
                <div>
                    <h3 class="font-black text-sm text-amber-400">Master Owner</h3>
                    <p class="text-[10px] font-bold text-gray-400">${window.profilOwner.nama} | PIN: ${window.profilOwner.pin}</p>
                </div>
            </div>
            <button onclick="window.bukaFormOwner()" class="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-pen text-amber-400"></i> Edit</button>
        </div>
    `;

    // Render Container Profil Staf
    let htmlStaf = `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
            <h3 class="text-xs font-black text-gray-900 uppercase tracking-wider">Database Karyawan</h3>
            <button onclick="window.bukaFormStaf()" class="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-teal-200 transition"><i class="fa-solid fa-plus"></i> Tambah Staf</button>
        </div>
        <div class="space-y-2">`;

    window.databaseStaf.forEach((staf, index) => {
        htmlStaf += `
        <div class="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50 group">
            <div class="flex items-center gap-3">
                ${staf.foto ? `<img src="${staf.foto}" class="w-10 h-10 rounded-full object-cover border border-gray-200">` : `<div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-gray-500"><i class="fa-solid fa-user"></i></div>`}
                <div>
                    <span class="text-xs font-black text-gray-900 block">${staf.nama} <span class="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded ml-1">${staf.jobType || 'Staf'}</span></span>
                    <span class="text-gray-500 text-[10px] font-bold">PIN: ${staf.pin} | Shift: ${staf.shift || '-'}</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                ${staf.wa ? `<a href="https://wa.me/${staf.wa}" target="_blank" class="w-8 h-8 flex items-center justify-center bg-green-50 text-green-600 rounded-lg hover:bg-green-500 hover:text-white transition"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                <button onclick="window.editStaf(${index})" class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.hapusStaf(${index})" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    });

    if(window.databaseStaf.length === 0) htmlStaf += `<p class="text-xs text-center py-4 text-gray-400 font-bold">Belum ada data staf.</p>`;
    htmlStaf += `</div></div>`;
    
    containerUtama.innerHTML += htmlStaf;
};

// --- 3. FUNGSI KENDALI FORM (Buka, Simpan, Tutup) ---
window.bukaFormOwner = function() {
    document.getElementById('hrd-form-title').innerHTML = '<i class="fa-solid fa-shield-halved text-amber-500 mr-2"></i>Edit Profil Owner';
    document.getElementById('hrd-role').value = 'owner';
    document.getElementById('hrd-area-gaji').classList.add('hidden'); 
    
    document.getElementById('hrd-nama').value = window.profilOwner.nama;
    document.getElementById('hrd-pin').value = window.profilOwner.pin;
    document.getElementById('hrd-wa').value = window.profilOwner.wa || '';
    document.getElementById('hrd-rekening').value = window.profilOwner.rekening || '';
    
    document.getElementById('modal-form-hrd').classList.remove('hidden');
    document.getElementById('modal-form-hrd').classList.add('flex');
};

window.bukaFormStaf = function() {
    document.getElementById('hrd-form-title').innerHTML = '<i class="fa-solid fa-user-plus text-teal-500 mr-2"></i>Tambah Staf Baru';
    document.getElementById('hrd-role').value = 'staf';
    document.getElementById('hrd-id').value = '';
    document.getElementById('hrd-area-gaji').classList.remove('hidden');
    
    ['hrd-nama', 'hrd-pin', 'hrd-wa', 'hrd-rekening', 'hrd-foto', 'hrd-shift', 'hrd-nominal-gaji'].forEach(id => document.getElementById(id).value = '');
    
    document.getElementById('modal-form-hrd').classList.remove('hidden');
    document.getElementById('modal-form-hrd').classList.add('flex');
};

window.editStaf = function(index) {
    const staf = window.databaseStaf[index];
    document.getElementById('hrd-form-title').innerHTML = '<i class="fa-solid fa-pen-to-square text-teal-500 mr-2"></i>Edit Staf';
    document.getElementById('hrd-role').value = 'staf';
    document.getElementById('hrd-id').value = index;
    document.getElementById('hrd-area-gaji').classList.remove('hidden');
    
    document.getElementById('hrd-nama').value = staf.nama;
    document.getElementById('hrd-pin').value = staf.pin;
    document.getElementById('hrd-wa').value = staf.wa || '';
    document.getElementById('hrd-rekening').value = staf.rekening || '';
    document.getElementById('hrd-foto').value = staf.foto || '';
    document.getElementById('hrd-tipe-kerja').value = staf.jobType || 'Tetap';
    document.getElementById('hrd-shift').value = staf.shift || '';
    document.getElementById('hrd-tipe-gaji').value = staf.salaryType || 'Bulanan';
    document.getElementById('hrd-nominal-gaji').value = staf.salaryAmount || '';
    
    document.getElementById('modal-form-hrd').classList.remove('hidden');
    document.getElementById('modal-form-hrd').classList.add('flex');
};

window.hapusStaf = function(index) {
    if(confirm(`Yakin ingin menghapus karyawan ${window.databaseStaf[index].nama}?`)) {
        window.databaseStaf.splice(index, 1);
        window.dbStaf = window.databaseStaf; 
        window.renderPanelHRD();
    }
};

window.simpanDataHRD = function() {
    const role = document.getElementById('hrd-role').value;
    
    if (role === 'owner') {
        window.profilOwner.nama = document.getElementById('hrd-nama').value;
        window.profilOwner.pin = document.getElementById('hrd-pin').value;
        window.profilOwner.wa = document.getElementById('hrd-wa').value;
        window.profilOwner.rekening = document.getElementById('hrd-rekening').value;
        if(window.systemConfig) window.systemConfig.pinOwner = window.profilOwner.pin; 
    } else {
        const idIndex = document.getElementById('hrd-id').value;
        const stafData = {
            id: idIndex !== '' ? window.databaseStaf[idIndex].id : "S" + Date.now(),
            nama: document.getElementById('hrd-nama').value,
            pin: document.getElementById('hrd-pin').value,
            wa: document.getElementById('hrd-wa').value,
            rekening: document.getElementById('hrd-rekening').value,
            foto: document.getElementById('hrd-foto').value,
            jobType: document.getElementById('hrd-tipe-kerja').value,
            shift: document.getElementById('hrd-shift').value,
            salaryType: document.getElementById('hrd-tipe-gaji').value,
            salaryAmount: document.getElementById('hrd-nominal-gaji').value
        };
        
        if (idIndex !== '') {
            window.databaseStaf[idIndex] = stafData;
        } else {
            window.databaseStaf.push(stafData);
        }
        window.dbStaf = window.databaseStaf;
    }
    
    window.tutupFormHRD();
    window.renderPanelHRD();
    alert("Data berhasil disimpan!");
};

window.tutupFormHRD = function() {
    document.getElementById('modal-form-hrd').classList.add('hidden');
    document.getElementById('modal-form-hrd').classList.remove('flex');
};

// --- 4. OVERRIDE FUNGSI OPEN PANEL AGAR ME-RENDER HRD ---
const lamaOpenPanelHRD = window.openPanel;
window.openPanel = function(panelId) {
    if(typeof lamaOpenPanelHRD === 'function') lamaOpenPanelHRD(panelId);
    if(panelId === 'panel-hrd') window.renderPanelHRD();
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 7: CRUD MENU, MASTER TOPPING & EDIT WEB
// ============================================================================

// 1. DATA MASTER TOPPING
window.masterTopping = [
    { id: 'T01', nama: 'Boba Premium', harga: 3000 },
    { id: 'T02', nama: 'Cheese Foam', harga: 4000 }
];
window.tempSelectedToppings = []; // Menyimpan topping saat pelanggan mencentang

// 2. FUNGSI DUAL GAMBAR (UBAH FILE KE URL BASE64)
window.prosesUploadGambar = function(event, targetInputId, previewImgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            // Masukkan hasil konversi file ke dalam kolom input URL
            document.getElementById(targetInputId).value = base64Data; 
            // Tampilkan ke gambar preview jika ada
            if (previewImgId && document.getElementById(previewImgId)) {
                document.getElementById(previewImgId).src = base64Data;
                document.getElementById(previewImgId).classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

// 3. AKTIVASI PANEL EDIT WEB (SOSMED, MAPS, LOGO DUAL)
document.addEventListener('DOMContentLoaded', () => {
    // Suntikkan Tombol Upload File di bawah Input Teks Logo & QRIS
    const inputLogo = document.getElementById('setting-logo');
    if (inputLogo && !document.getElementById('file-logo')) {
        inputLogo.insertAdjacentHTML('afterend', `<input type="file" id="file-logo" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-logo', 'header-logo-img')">`);
    }
    
    const inputQris = document.getElementById('setting-qris');
    if (inputQris && !document.getElementById('file-qris')) {
        inputQris.insertAdjacentHTML('afterend', `<input type="file" id="file-qris" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-qris', 'qris-img-display')">`);
    }

    // Sambungkan Tombol Simpan di Panel Edit Web
    const panelWeb = document.getElementById('panel-edit-web');
    if (panelWeb) {
        const btnSimpanWeb = panelWeb.querySelector('button.bg-blue-600');
        if (btnSimpanWeb) {
            btnSimpanWeb.onclick = function() {
                window.systemConfig.nomorWA = document.getElementById('setting-wa').value;
                window.systemConfig.logoUrl = document.getElementById('setting-logo').value;
                window.systemConfig.ig = document.getElementById('setting-ig').value;
                window.systemConfig.tiktok = document.getElementById('setting-tiktok').value;
                window.systemConfig.qrisUrl = document.getElementById('setting-qris').value;
                
                // Ambil link Maps murni (Membersihkan tag <iframe> jika pengguna salah copy)
                let mapRaw = document.getElementById('setting-maps').value;
                if(mapRaw.includes('src="')) mapRaw = mapRaw.split('src="')[1].split('"')[0];
                window.systemConfig.maps = mapRaw;

                // Terapkan Perubahan Langsung ke Tampilan Pelanggan
                if (document.getElementById('header-logo-img') && window.systemConfig.logoUrl) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl;
                if (document.getElementById('qris-img-display') && window.systemConfig.qrisUrl) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl;
                
                if (document.getElementById('link-ig') && window.systemConfig.ig) document.getElementById('link-ig').href = window.systemConfig.ig;
                if (document.getElementById('link-tiktok') && window.systemConfig.tiktok) document.getElementById('link-tiktok').href = window.systemConfig.tiktok;
                if (document.getElementById('footer-map') && window.systemConfig.maps) document.getElementById('footer-map').src = window.systemConfig.maps;

                alert("Pengaturan Sosmed, Maps, dan Web Berhasil Disimpan!");
            };
        }
    }
});

// 4. INJEKSI UI MODAL FORM MENU & MASTER TOPPING KE HTML
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('modal-form-menu')) {
        const modalMenuHTML = `
        <div id="modal-form-menu" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
            <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0">
                    <h2 id="form-menu-title" class="font-black text-lg"><i class="fa-solid fa-mug-hot text-amber-400 mr-2"></i>Edit Menu</h2>
                    <button onclick="window.tutupFormMenu()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
                    <input type="hidden" id="menu-id">
                    
                    <div>
                        <label class="block mb-1">Nama Menu</label>
                        <input type="text" id="menu-nama" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-amber-500">
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block mb-1">Kategori</label>
                            <select id="menu-kategori" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-amber-500">
                                <option value="coffee">Coffee</option>
                                <option value="non-coffee">Non-Coffee</option>
                            </select>
                        </div>
                        <div>
                            <label class="block mb-1">Harga (Rp)</label>
                            <input type="number" id="menu-harga" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-amber-500">
                        </div>
                    </div>
                    
                    <div>
                        <label class="block mb-1">Gambar Menu (URL / Upload)</label>
                        <input type="text" id="menu-foto" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-amber-500" placeholder="https://...">
                        <input type="file" id="file-menu" class="mt-2 text-[10px] w-full text-amber-600 bg-amber-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'menu-foto')">
                    </div>
                    
                    <!-- Area Master Topping (Checkbox) -->
                    <div class="border border-amber-100 bg-amber-50 p-4 rounded-xl mt-2">
                        <label class="block mb-2 font-black text-amber-800"><i class="fa-solid fa-layer-group mr-1"></i> Izinkan Topping pada Menu ini:</label>
                        <div id="container-topping-checkbox" class="space-y-2 max-h-32 overflow-y-auto">
                            <!-- Dirender JS -->
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button onclick="window.simpanDataMenu()" class="w-full bg-amber-500 text-white font-black py-3 rounded-xl hover:bg-amber-600 transition">SIMPAN MENU</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalMenuHTML);
    }
});

// 5. MENGGANTI FUNGSI TOMBOL DI PANEL KATALOG OWNER
const lamaOpenPanelKatalog = window.openPanel;
window.openPanel = function(panelId) {
    if(typeof lamaOpenPanelKatalog === 'function') lamaOpenPanelKatalog(panelId);
    
    if(panelId === 'panel-katalog') {
        const panel = document.getElementById('panel-katalog');
        if(!panel) return;
        
        // Ubah Fungsi Tombol Tambah Menu & Master Topping (Mengincar tombol di HTML asli)
        const btnTambah = panel.querySelector('button.bg-amber-500');
        const btnKategori = panel.querySelector('button.bg-gray-800');
        
        if (btnTambah) btnTambah.onclick = () => window.bukaFormMenu('');
        if (btnKategori) {
            btnKategori.innerHTML = '<i class="fa-solid fa-list-check mr-1"></i> Master Topping';
            btnKategori.onclick = () => alert("Master Topping Tersedia:\n" + window.masterTopping.map(t => `- ${t.nama} (Rp ${t.harga})`).join('\n'));
        }
        
        // Render List Menu
        window.renderAdminKatalog(panel);
    }
};

window.renderAdminKatalog = function(panel) {
    // Kita sisipkan wadah list ke dalam panel-katalog HTML
    let listContainer = document.getElementById('admin-katalog-list');
    if (!listContainer) {
        panel.querySelector('.flex-1').insertAdjacentHTML('beforeend', '<div id="admin-katalog-list" class="space-y-3 mt-4"></div>');
        listContainer = document.getElementById('admin-katalog-list');
    }
    
    listContainer.innerHTML = '';
    window.katalogMenu.forEach((item, index) => {
        listContainer.innerHTML += `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <img src="${item.image}" class="w-12 h-12 rounded-lg object-cover border border-gray-200">
                <div>
                    <h4 class="font-black text-sm text-gray-900">${item.nama}</h4>
                    <p class="text-[10px] font-bold text-amber-500">Rp ${item.harga.toLocaleString('id-ID')} | <span class="text-gray-500 uppercase">${item.kategori}</span></p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button onclick="window.bukaFormMenu('${item.id}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button>
            </div>
        </div>`;
    });
};

// 6. FUNGSI BUKA & SIMPAN FORM MENU
window.bukaFormMenu = function(idMenu) {
    const isEdit = idMenu !== '';
    const item = isEdit ? window.katalogMenu.find(m => m.id === idMenu) : null;
    
    document.getElementById('form-menu-title').innerHTML = isEdit ? '<i class="fa-solid fa-pen mr-2 text-amber-400"></i> Edit Menu' : '<i class="fa-solid fa-plus mr-2 text-amber-400"></i> Tambah Menu Baru';
    
    document.getElementById('menu-id').value = isEdit ? item.id : '';
    document.getElementById('menu-nama').value = isEdit ? item.nama : '';
    document.getElementById('menu-kategori').value = isEdit ? item.kategori : 'coffee';
    document.getElementById('menu-harga').value = isEdit ? item.harga : '';
    document.getElementById('menu-foto').value = isEdit ? item.image : '';
    document.getElementById('file-menu').value = ''; // Reset input file
    
    // Render Checkbox Master Topping
    const containerTop = document.getElementById('container-topping-checkbox');
    containerTop.innerHTML = '';
    window.masterTopping.forEach(top => {
        const isChecked = isEdit && item.opsiTopping && item.opsiTopping.includes(top.id) ? 'checked' : '';
        containerTop.innerHTML += `
            <label class="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded-lg cursor-pointer">
                <input type="checkbox" class="master-top-cb w-4 h-4 accent-amber-500" value="${top.id}" ${isChecked}>
                <span class="text-xs text-gray-700">${top.nama} (+Rp ${top.harga})</span>
            </label>
        `;
    });

    document.getElementById('modal-form-menu').classList.remove('hidden');
    document.getElementById('modal-form-menu').classList.add('flex');
};

window.tutupFormMenu = function() {
    document.getElementById('modal-form-menu').classList.add('hidden');
    document.getElementById('modal-form-menu').classList.remove('flex');
};

window.simpanDataMenu = function() {
    const id = document.getElementById('menu-id').value;
    
    // Ambil Topping yang dicentang Owner
    const cbToppings = document.querySelectorAll('.master-top-cb:checked');
    const opsiTopping = Array.from(cbToppings).map(cb => cb.value);

    const dataMenu = {
        id: id !== '' ? id : 'M' + Date.now(),
        nama: document.getElementById('menu-nama').value,
        kategori: document.getElementById('menu-kategori').value,
        harga: parseInt(document.getElementById('menu-harga').value) || 0,
        image: document.getElementById('menu-foto').value,
        stok: 100,
        opsiTopping: opsiTopping
    };

    if (id !== '') {
        const index = window.katalogMenu.findIndex(m => m.id === id);
        window.katalogMenu[index] = dataMenu;
    } else {
        window.katalogMenu.push(dataMenu);
    }
    
    // Jika Anda memakai Firebase, tambahkan fungsi push/set ke window.db di sini
    window.renderKatalog(); // Update UI Pelanggan
    window.renderAdminKatalog(document.getElementById('panel-katalog'));
    window.tutupFormMenu();
    alert("Menu berhasil disimpan!");
};

// 7. MEMUNCULKAN TOPPING DI LAYAR PELANGGAN SAAT MEMESAN
const oldOpenMenuDetail = window.openMenuDetail;
window.openMenuDetail = function(id) {
    if(typeof oldOpenMenuDetail === 'function') oldOpenMenuDetail(id);
    
    const item = window.katalogMenu.find(m => m.id === id);
    const varContainer = document.getElementById('detail-variants-container');
    window.tempSelectedToppings = []; // Reset topping pesanan
    
    if(varContainer) {
        varContainer.innerHTML = ''; // Kosongkan wadah varian HTML
        if (item && item.opsiTopping && item.opsiTopping.length > 0) {
            let htmlTopping = `
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 class="text-sm font-black text-gray-900 mb-3"><i class="fa-solid fa-wand-magic-sparkles text-amber-500 mr-2"></i>Tambahan Topping</h4>
                <div class="space-y-2">`;
            
            item.opsiTopping.forEach(topId => {
                const topData = window.masterTopping.find(t => t.id === topId);
                if(topData) {
                    htmlTopping += `
                    <label class="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-amber-500 transition has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                        <div class="flex items-center gap-3">
                            <input type="checkbox" class="plg-top-cb w-5 h-5 accent-amber-500" value='${JSON.stringify(topData)}' onchange="window.hitungToppingPelanggan()">
                            <span class="text-xs font-bold text-gray-800">${topData.nama}</span>
                        </div>
                        <span class="text-[10px] font-black text-amber-500">+ Rp ${topData.harga.toLocaleString('id-ID')}</span>
                    </label>`;
                }
            });
            htmlTopping += `</div></div>`;
            varContainer.innerHTML = htmlTopping;
        }
    }
};

window.hitungToppingPelanggan = function() {
    const cbPelanggan = document.querySelectorAll('.plg-top-cb:checked');
    window.tempSelectedToppings = Array.from(cbPelanggan).map(cb => JSON.parse(cb.value));
    window.updateDetailPrice(); // Panggil ulang fungsi hitung harga
};

// 8. UPDATE PERHITUNGAN HARGA (MENU + TOPPING x QTY)
window.updateDetailPrice = function() {
    if (!window.currentMenuDetail) return;
    
    let hargaDasarMenu = parseInt(window.currentMenuDetail.harga);
    let hargaTopping = window.tempSelectedToppings.reduce((sum, t) => sum + parseInt(t.harga), 0);
    
    // (Harga Minuman + Harga Topping) dikali Jumlah Pesanan
    const total = (hargaDasarMenu + hargaTopping) * window.qtyCounter;
    
    const priceEl = document.getElementById('detail-total-price');
    if (priceEl) priceEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
};

// 9. OVERRIDE FUNGSI ADD TO CART AGAR MENYIMPAN NAMA TOPPING
const oldAddToCart = window.addToCart;
window.addToCart = function() {
    if (!window.currentMenuDetail) return;
    
    let hargaDasarMenu = parseInt(window.currentMenuDetail.harga);
    let hargaTopping = window.tempSelectedToppings.reduce((sum, t) => sum + parseInt(t.harga), 0);
    let stringTopping = window.tempSelectedToppings.map(t => t.nama).join(', ');
    
    let namaMenuFinal = window.currentMenuDetail.nama;
    if (stringTopping !== '') namaMenuFinal += ` (+ ${stringTopping})`;

    const cartItem = {
        cartId: Date.now().toString(),
        id: window.currentMenuDetail.id,
        nama: namaMenuFinal,
        harga: hargaDasarMenu + hargaTopping,
        qty: window.qtyCounter,
        subtotal: (hargaDasarMenu + hargaTopping) * window.qtyCounter,
        kategori: window.currentMenuDetail.kategori
    };

    window.currentCart.push(cartItem);
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    
    window.closeMenuDetail();
    window.updateCartFloat();
    window.playAudio('masuk'); 
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 8 (REVISI): KASIR, DROPDOWN STAF & ABSENSI
// ============================================================================

// 1. INJEKSI UI: MODAL PEMBAYARAN & BLOCKER ABSENSI
document.addEventListener('DOMContentLoaded', () => {
    // Sembunyikan tombol "Ambil Alih POS" besar milik Owner
    const ownerPOSBtn = document.querySelector('button[onclick="bukaPOS(\\'owner\\')"]');
    if (ownerPOSBtn && ownerPOSBtn.parentElement) {
        ownerPOSBtn.parentElement.classList.add('hidden');
    }

    // Injeksi Blocker Absensi ke Halaman Kasir
    const viewKasir = document.getElementById('view-kasir');
    if (viewKasir && !document.getElementById('kasir-blocker')) {
        viewKasir.classList.add('relative');
        viewKasir.insertAdjacentHTML('afterbegin', `
            <div id="kasir-blocker" class="absolute inset-0 bg-slate-50/95 backdrop-blur-md z-[40] flex flex-col items-center justify-center hidden min-h-screen pb-32">
                <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6 border border-gray-100">
                    <i class="fa-solid fa-lock text-4xl text-gray-300"></i>
                </div>
                <h3 class="text-xl font-black text-gray-900 mb-1">Akses Terkunci</h3>
                <p class="text-xs font-bold text-gray-500 mb-8 px-8 text-center">Halo, Staf! Anda wajib melakukan Absen Masuk dengan foto wajah sebelum dapat menerima pesanan.</p>
                <button onclick="window.openAbsensi()" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_5px_15px_rgba(37,99,235,0.4)] hover:bg-blue-700 transition flex items-center gap-3">
                    <i class="fa-solid fa-camera text-lg"></i> MULAI ABSEN MASUK
                </button>
            </div>
        `);
    }

    // Injeksi Modal Kalkulator Pembayaran Khusus Kasir (Ada Dropdown Penginput)
    if (!document.getElementById('modal-payment-kasir')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="modal-payment-kasir" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] hidden flex-col items-center justify-end md:justify-center p-4 fade-in">
                <div class="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl panel-slide-up relative overflow-hidden flex flex-col max-h-[95vh]">
                    <button onclick="window.tutupPaymentKasir()" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-600 hover:bg-red-500 hover:text-white transition z-10"><i class="fa-solid fa-xmark"></i></button>
                    
                    <div class="overflow-y-auto flex-1 pb-4 hide-scrollbar">
                        <h2 class="text-xl font-black text-gray-900 mb-1"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i>Pembayaran</h2>
                        <p class="text-[10px] font-bold text-gray-500 mb-5">Pilih/ketik nominal uang yang diterima dari pelanggan.</p>
                        
                        <div class="mb-4 text-left">
                            <label class="text-[10px] font-black text-gray-500 uppercase tracking-wide">Penginput Pesanan:</label>
                            <select id="kasir-staf-dropdown" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-amber-500 mt-1 cursor-pointer">
                                <!-- Diisi otomatis oleh JS -->
                            </select>
                        </div>

                        <div class="bg-gray-900 text-white p-4 rounded-2xl mb-4 text-center shadow-inner relative overflow-hidden">
                            <div class="absolute top-0 right-0 w-24 h-24 bg-amber-500 opacity-20 rounded-full blur-2xl -mr-5 -mt-5"></div>
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 relative z-10">Total Tagihan</p>
                            <h3 id="pay-total" class="text-3xl font-black text-amber-400 relative z-10">Rp 0</h3>
                        </div>

                        <label class="text-xs font-black text-gray-700 block mb-2 uppercase tracking-wide">Uang Diterima (Rp)</label>
                        <input type="number" id="pay-input" onkeyup="window.hitungKembalian()" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-4 text-2xl text-center tracking-wider font-black focus:outline-none focus:border-amber-500 focus:bg-white transition mb-3" placeholder="0" inputmode="numeric">
                        
                        <div class="grid grid-cols-3 gap-2 mb-6">
                            <button onclick="window.setUang(0)" class="bg-amber-100 text-amber-700 font-black py-3 rounded-xl text-[10px] hover:bg-amber-200 border border-amber-200 shadow-sm">UANG PAS</button>
                            <button onclick="window.setUang(10000)" class="bg-white text-gray-700 font-black py-3 rounded-xl text-[10px] hover:bg-slate-100 border border-gray-200 shadow-sm">10.000</button>
                            <button onclick="window.setUang(20000)" class="bg-white text-gray-700 font-black py-3 rounded-xl text-[10px] hover:bg-slate-100 border border-gray-200 shadow-sm">20.000</button>
                            <button onclick="window.setUang(50000)" class="bg-white text-gray-700 font-black py-3 rounded-xl text-[10px] hover:bg-slate-100 border border-gray-200 shadow-sm">50.000</button>
                            <button onclick="window.setUang(100000)" class="bg-white text-gray-700 font-black py-3 rounded-xl text-[10px] hover:bg-slate-100 border border-gray-200 shadow-sm">100.000</button>
                            <button onclick="window.setUang('clear')" class="bg-red-50 text-red-500 font-black py-3 rounded-xl text-[10px] hover:bg-red-100 border border-red-100 shadow-sm"><i class="fa-solid fa-delete-left text-sm"></i></button>
                        </div>

                        <div class="flex justify-between items-center border-t border-gray-100 pt-4">
                            <span class="text-xs font-black text-gray-700 uppercase tracking-widest">Kembalian:</span>
                            <span id="pay-kembalian" class="text-2xl font-black text-green-500">Rp 0</span>
                        </div>
                    </div>

                    <div class="shrink-0 pt-2 bg-white">
                        <button onclick="window.finalisasiPembayaranKasir()" class="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-[0_5px_15px_rgba(245,158,11,0.4)] hover:bg-amber-600 transition flex items-center justify-center gap-2">
                            <i class="fa-solid fa-print text-lg"></i> PROSES & CETAK STRUK
                        </button>
                    </div>
                </div>
            </div>
        `);
    }
});

// 2. LOGIKA ABSENSI: MENYIMPAN ARRAY STAF YANG HADIR
const oldProsesAbsenKasir = window.prosesAbsen;
window.prosesAbsen = function(tipe) {
    const pin = document.getElementById('absen-pin')?.value;
    const staf = window.dbStaf.find(s => s.pin === pin);
    
    // Panggil sistem kamera asli
    if(typeof oldProsesAbsenKasir === 'function') oldProsesAbsenKasir(tipe);
    
    if (staf) {
        let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
        
        if (tipe === 'Masuk') {
            if (!stafHadir.includes(staf.nama)) stafHadir.push(staf.nama);
        } else if (tipe === 'Keluar' || tipe === 'Pulang') {
            stafHadir = stafHadir.filter(nama => nama !== staf.nama);
        }
        
        localStorage.setItem('stafHadirMainstay', JSON.stringify(stafHadir));

        // Jika ada minimal 1 staf yang hadir, gembok terbuka
        if (stafHadir.length > 0) {
            document.getElementById('kasir-blocker')?.classList.add('hidden');
        } else {
            document.getElementById('kasir-blocker')?.classList.remove('hidden');
        }
    }
};

// 3. LOGIKA LOGIN: OWNER BYPASS GEMBOK, STAF CEK ABSEN
const oldProsesLoginKhususKasir = window.prosesLogin;
window.prosesLogin = function() {
    const pin = document.getElementById('login-pin')?.value;

    if (window.targetLoginRole === 'kasir') {
        const staf = window.dbStaf.find(s => s.pin === pin);

        if (pin === window.systemConfig.pinOwner) {
            // BOS LOGIN -> Bypass semua aturan
            localStorage.setItem('isOwnerInKasir', 'true');
            document.getElementById('kasir-blocker')?.classList.add('hidden');
            window.closeLoginModal();
            window.switchRoleView('kasir');
            window.playAudio('siap');
            window.isKasirMode = true; // Langsung nyalakan mode order internal
        }
        else if (staf) {
            // STAF LOGIN -> Cek array absensi
            localStorage.setItem('isOwnerInKasir', 'false');
            window.closeLoginModal();
            window.switchRoleView('kasir');
            window.playAudio('siap');
            window.isKasirMode = true; 

            let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
            if (stafHadir.length > 0) {
                document.getElementById('kasir-blocker')?.classList.add('hidden');
            } else {
                document.getElementById('kasir-blocker')?.classList.remove('hidden');
            }
        } else {
            document.getElementById('login-error')?.classList.remove('hidden');
        }
    } else {
        oldProsesLoginKhususKasir(); // Biarkan login Panel Owner berjalan normal
    }
};

// Pastikan Logout mematikan mode internal
const oldProsesLogoutKasir = window.prosesLogout;
window.prosesLogout = function(role) {
    if (role === 'kasir') {
        localStorage.removeItem('isOwnerInKasir');
        window.isKasirMode = false;
    }
    oldProsesLogoutKasir(role);
};

// 4. OVERRIDE TOMBOL KERANJANG AGAR MUNCUL KALKULATOR UANG & DROPDOWN STAF
window.tempTotalBayarKasir = 0;

const oldProsesCheckoutKasir = window.prosesCheckout;
window.prosesCheckout = function() {
    // Tombol checkout dipencet dari dalam halaman kasir (isKasirMode)
    if (window.isKasirMode || localStorage.getItem('sesiMainstay') === 'kasir') {
        if (window.currentCart.length === 0) return alert("Keranjang kosong.");
        
        // A. Kalkulasi Harga
        const subtotal = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
        window.tempTotalBayarKasir = subtotal - window.currentDiscountValue;
        
        document.getElementById('pay-total').innerText = `Rp ${window.tempTotalBayarKasir.toLocaleString('id-ID')}`;
        document.getElementById('pay-input').value = '';
        document.getElementById('pay-kembalian').innerText = 'Rp 0';
        document.getElementById('pay-kembalian').classList.replace('text-red-500', 'text-green-500');
        
        // B. Merender Dropdown Penginput (Sesuai Data Absen)
        const dropdown = document.getElementById('kasir-staf-dropdown');
        if (dropdown) {
            dropdown.innerHTML = '';
            let isOwner = localStorage.getItem('isOwnerInKasir') === 'true';
            let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
            
            if (isOwner) dropdown.innerHTML += `<option value="Owner">Master Owner</option>`;
            
            stafHadir.forEach(nama => {
                dropdown.innerHTML += `<option value="${nama}">${nama}</option>`;
            });

            if (dropdown.innerHTML === '') dropdown.innerHTML = `<option value="Kasir Bebas">Belum Absen</option>`;
        }

        window.closeCartModal();
        document.getElementById('modal-payment-kasir').classList.remove('hidden');
        document.getElementById('modal-payment-kasir').classList.add('flex');
    } else {
        // Jika pembeli mandiri (Customer), teruskan ke WA/QRIS
        oldProsesCheckoutKasir(); 
    }
};

window.tutupPaymentKasir = function() {
    document.getElementById('modal-payment-kasir').classList.add('hidden');
    document.getElementById('modal-payment-kasir').classList.remove('flex');
    window.openCartModal(); // Balik ke review keranjang
};

// 5. KALKULATOR UANG
window.setUang = function(nominal) {
    const inputEl = document.getElementById('pay-input');
    if (nominal === 'clear') inputEl.value = '';
    else if (nominal === 0) inputEl.value = window.tempTotalBayarKasir; // Uang Pas
    else inputEl.value = nominal; 
    
    window.hitungKembalian();
};

window.hitungKembalian = function() {
    const uangDiterima = parseInt(document.getElementById('pay-input').value) || 0;
    const kembalian = uangDiterima - window.tempTotalBayarKasir;
    const elKembali = document.getElementById('pay-kembalian');
    
    if (kembalian < 0 && uangDiterima !== 0) {
        elKembali.innerText = "UANG KURANG!";
        elKembali.classList.replace('text-green-500', 'text-red-500');
    } else {
        elKembali.innerText = `Rp ${kembalian.toLocaleString('id-ID')}`;
        elKembali.classList.replace('text-red-500', 'text-green-500');
    }
};

// 6. FINALISASI & PRINT (Mengambil Nama dari Dropdown)
window.finalisasiPembayaranKasir = function() {
    const uangDiterima = parseInt(document.getElementById('pay-input').value) || 0;
    const kembalian = uangDiterima - window.tempTotalBayarKasir;
    
    if (kembalian < 0) {
        window.playAudio('masuk'); 
        return alert("Uang pembayaran kurang dari total tagihan!");
    }
    
    // Ambil nama dari Dropdown Penginput
    const dropdown = document.getElementById('kasir-staf-dropdown');
    const namaKasirAktif = dropdown ? dropdown.value : 'Kasir';
    const noPesanan = `ORD-${Date.now().toString().slice(-4)}`;
    
    const dataTransaksi = {
        waktu: new Date().toISOString(),
        noStruk: noPesanan,
        pelanggan: "Walk-in (Offline)", 
        telepon: "-",
        daftarMember: false,
        tipe: "Instant / Dine-in",
        metodePembayaran: "Tunai",
        kasir: namaKasirAktif, 
        item: window.currentCart,
        diskon: window.currentDiscountValue,
        totalTagihan: window.tempTotalBayarKasir,
        uangDiterima: uangDiterima, 
        uangKembali: kembalian,
        statusDapur: 'baru'
    };
    
    document.getElementById('modal-payment-kasir').classList.add('hidden');
    document.getElementById('modal-payment-kasir').classList.remove('flex');
    
    // Kirim data ke sistem print & spreadsheet (Dari fungsi Tahap 4)
    if(typeof window.simpanTransaksiKasirLama === 'undefined') {
        window.simpanTransaksiKasirLama = window.simpanTransaksiKasir;
        window.simpanTransaksiKasir = async function(data) {
            try {
                if (window.db && window.fbPush && window.fbSet) {
                    const trRef = window.fbPush(window.fbRef(window.db, 'transaksi_hari_ini'));
                    await window.fbSet(trRef, data);
                }
                if(typeof window.kirimKeSpreadsheet === 'function') window.kirimKeSpreadsheet(data);
                if(typeof window.cetakStrukThermal === 'function') window.cetakStrukThermal(data); 
            } catch (error) { console.error("Gagal simpan:", error); }
        };
    }
    
    window.simpanTransaksiKasir(dataTransaksi);
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 9: CRUD INVENTARISASI STOK BARANG & SATUAN
// ============================================================================

// 1. DATA DUMMY AWAL (Bisa dikosongkan nanti jika disambung Firebase)
window.databaseStok = [
    { id: 'INV01', nama: 'Biji Kopi Arabica', kategori: 'Bahan Baku', jumlah: 2.5, satuan: 'Kg' },
    { id: 'INV02', nama: 'Cup Plastik 16oz', kategori: 'Kemasan', jumlah: 500, satuan: 'Pcs' },
    { id: 'INV03', nama: 'Susu UHT Full Cream', kategori: 'Bahan Baku', jumlah: 12, satuan: 'Liter' }
];

// 2. INJEKSI UI MODAL FORM STOK BARANG KE HTML
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('modal-form-stok')) {
        const modalStokHTML = `
        <div id="modal-form-stok" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
            <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0">
                    <h2 id="stok-form-title" class="font-black text-lg"><i class="fa-solid fa-boxes-stacked text-indigo-400 mr-2"></i>Input Barang</h2>
                    <button onclick="window.tutupFormStok()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
                    <input type="hidden" id="stok-id">
                    
                    <div>
                        <label class="block mb-1">Nama Barang / Bahan</label>
                        <input type="text" id="stok-nama" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500" placeholder="Contoh: Gula Aren">
                    </div>
                    
                    <div>
                        <label class="block mb-1">Kategori Barang</label>
                        <select id="stok-kategori" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500">
                            <option value="Bahan Baku">Bahan Baku Utama</option>
                            <option value="Kemasan">Kemasan (Cup, Sedotan, Plastik)</option>
                            <option value="Operasional">Alat Kebersihan / Operasional</option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block mb-1">Jumlah / Kuantitas</label>
                            <input type="number" step="0.01" id="stok-jumlah" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500" placeholder="0">
                        </div>
                        <div>
                            <label class="block mb-1">Satuan</label>
                            <!-- Fitur Satuan Fleksibel (Input Datalist) -->
                            <input type="text" id="stok-satuan" list="list-satuan" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500" placeholder="Kg / Liter / Pcs">
                            <datalist id="list-satuan">
                                <option value="Kg"></option>
                                <option value="Gram"></option>
                                <option value="Liter"></option>
                                <option value="Ml"></option>
                                <option value="Pcs"></option>
                                <option value="Pack"></option>
                                <option value="Box"></option>
                                <option value="Karton"></option>
                            </datalist>
                        </div>
                    </div>
                </div>
                <div class="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
                    <button onclick="window.simpanDataStok()" class="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition">SIMPAN KE GUDANG</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalStokHTML);
    }
});

// 3. FUNGSI MENGGAMBAR (RENDER) LIST STOK KE PANEL OWNER
window.renderPanelStok = function() {
    const panel = document.getElementById('panel-stok');
    if (!panel) return;

    // Bersihkan isi panel dan siapkan strukturnya (menarget class flex-1 bawaan HTML)
    const containerUtama = panel.querySelector('.flex-1');
    if (!containerUtama) return;

    let htmlStok = `
        <div class="flex justify-between items-center mb-4 mt-2">
            <div>
                <h3 class="text-sm font-black text-gray-900">Inventarisasi Barang</h3>
                <p class="text-[10px] text-gray-500 font-bold">Pantau stok bahan baku & kemasan harian.</p>
            </div>
            <button onclick="window.bukaFormStok('')" class="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-200 transition shadow-sm"><i class="fa-solid fa-plus mr-1"></i> Input Barang</button>
        </div>
        <div class="space-y-3">
    `;

    if (window.databaseStok.length === 0) {
        htmlStok += `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed border-gray-200 rounded-2xl">Gudang kosong. Belum ada barang yang diinput.</div>`;
    } else {
        window.databaseStok.forEach((item, index) => {
            // Indikator peringatan jika stok menipis (Di bawah 5)
            const isLow = parseFloat(item.jumlah) <= 5;
            const bgClass = isLow ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100';
            const iconColor = isLow ? 'text-red-500' : 'text-indigo-500';
            
            htmlStok += `
            <div class="${bgClass} p-4 rounded-2xl shadow-sm border flex items-center justify-between group">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                        <i class="fa-solid fa-box ${iconColor} text-lg"></i>
                    </div>
                    <div>
                        <h4 class="font-black text-sm text-gray-900">${item.nama} ${isLow ? '<span class="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Menipis</span>' : ''}</h4>
                        <p class="text-[10px] font-bold text-gray-500">${item.kategori}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-right">
                        <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sisa Stok</span>
                        <span class="font-black text-lg ${isLow ? 'text-red-600' : 'text-indigo-600'}">${item.jumlah} <span class="text-xs">${item.satuan}</span></span>
                    </div>
                    <div class="flex flex-col gap-1 border-l border-gray-200 pl-3">
                        <button onclick="window.bukaFormStok('${item.id}')" class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-pen"></i></button>
                        <button onclick="window.hapusStok('${item.id}')" class="w-7 h-7 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>`;
        });
    }

    htmlStok += `</div>`;
    containerUtama.innerHTML = htmlStok;
};

// 4. FUNGSI FORM (Buka, Tutup, Simpan, Hapus)
window.bukaFormStok = function(idBarang) {
    const isEdit = idBarang !== '';
    const item = isEdit ? window.databaseStok.find(b => b.id === idBarang) : null;
    
    document.getElementById('stok-form-title').innerHTML = isEdit ? '<i class="fa-solid fa-pen mr-2 text-indigo-400"></i> Edit Stok Barang' : '<i class="fa-solid fa-box-open mr-2 text-indigo-400"></i> Tambah Barang Baru';
    
    document.getElementById('stok-id').value = isEdit ? item.id : '';
    document.getElementById('stok-nama').value = isEdit ? item.nama : '';
    document.getElementById('stok-kategori').value = isEdit ? item.kategori : 'Bahan Baku';
    document.getElementById('stok-jumlah').value = isEdit ? item.jumlah : '';
    document.getElementById('stok-satuan').value = isEdit ? item.satuan : '';
    
    document.getElementById('modal-form-stok').classList.remove('hidden');
    document.getElementById('modal-form-stok').classList.add('flex');
};

window.tutupFormStok = function() {
    document.getElementById('modal-form-stok').classList.add('hidden');
    document.getElementById('modal-form-stok').classList.remove('flex');
};

window.hapusStok = function(idBarang) {
    const item = window.databaseStok.find(b => b.id === idBarang);
    if(confirm(`Yakin ingin menghapus ${item.nama} dari daftar inventaris?`)) {
        window.databaseStok = window.databaseStok.filter(b => b.id !== idBarang);
        window.renderPanelStok();
    }
};

window.simpanDataStok = function() {
    const id = document.getElementById('stok-id').value;
    const jumlahInput = document.getElementById('stok-jumlah').value;
    
    // Validasi agar kolom nama dan jumlah tidak kosong
    if(document.getElementById('stok-nama').value.trim() === '') return alert("Nama barang wajib diisi!");
    if(jumlahInput === '') return alert("Jumlah stok wajib diisi!");

    const dataBarang = {
        id: id !== '' ? id : 'INV' + Date.now(),
        nama: document.getElementById('stok-nama').value,
        kategori: document.getElementById('stok-kategori').value,
        jumlah: parseFloat(jumlahInput), // Memungkinkan angka desimal seperti 1.5 Kg
        satuan: document.getElementById('stok-satuan').value || 'Pcs'
    };

    if (id !== '') {
        const index = window.databaseStok.findIndex(b => b.id === id);
        window.databaseStok[index] = dataBarang;
    } else {
        window.databaseStok.push(dataBarang);
    }
    
    window.tutupFormStok();
    window.renderPanelStok();
    alert("Data inventaris berhasil diperbarui!");
};

// 5. MENGGABUNGKAN RENDER STOK KE DALAM FUNGSI NAVIGASI PANEL
const lamaOpenPanelStok = window.openPanel;
window.openPanel = function(panelId) {
    if(typeof lamaOpenPanelStok === 'function') lamaOpenPanelStok(panelId);
    
    // Jika owner mengklik tombol panel "Stok", render datanya
    if(panelId === 'panel-stok') {
        window.renderPanelStok();
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 10: SINKRONISASI STOK LIVE & GEMBOK KEAMANAN
// ============================================================================

window.statusStokTerkunci = false;
window.tanggalSistemSekarang = new Date().toLocaleDateString('id-ID'); // Format: DD/MM/YYYY

// 1. MENGHUBUNGKAN STOK & GEMBOK KE FIREBASE (REAL-TIME LIVE)
document.addEventListener('DOMContentLoaded', () => {
    if (window.db && window.fbOnValue) {
        
        // A. Pantau Pergerakan Data Stok (Live Update)
        window.fbOnValue(window.fbRef(window.db, 'inventaris_stok'), (snap) => {
            if (snap.exists()) {
                window.databaseStok = Object.values(snap.val());
            }
            
            // Auto-Refresh Layar Owner jika sedang membuka panel stok
            const panelOwner = document.getElementById('panel-stok');
            if (panelOwner && !panelOwner.classList.contains('hidden')) {
                window.renderPanelStok();
            }
            
            // Auto-Refresh Layar Staf jika sedang membuka modal stok
            const modalStaf = document.getElementById('modal-staf-list-stok');
            if (modalStaf && !modalStaf.classList.contains('hidden')) {
                window.renderStokStaf();
            }
        });

        // B. Pantau Status Gembok Harian
        window.fbOnValue(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), (snap) => {
            if (snap.exists()) {
                const dataKunci = snap.val();
                // Jika tanggal berbeda (sudah ganti hari), otomatis buka gembok
                if (dataKunci.tanggal === window.tanggalSistemSekarang) {
                    window.statusStokTerkunci = dataKunci.isLocked;
                } else {
                    window.statusStokTerkunci = false;
                    window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: false });
                }
            }
            
            // Update visual tombol gembok di layar Owner
            window.updateTombolGembokOwner();
        });
    }
});

// 2. INJEKSI UI: TOMBOL UPDATE STOK UNTUK STAF DI HALAMAN KASIR
document.addEventListener('DOMContentLoaded', () => {
    const viewKasir = document.getElementById('view-kasir');
    
    if (viewKasir && !document.getElementById('btn-stok-staf')) {
        // Taruh tombol di pojok kiri bawah atau area kasir
        document.body.insertAdjacentHTML('beforeend', `
            <button id="btn-stok-staf" onclick="window.bukaListStokStaf()" class="fixed bottom-24 left-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl flex flex-col items-center justify-center hover:bg-indigo-700 transition z-50 hidden">
                <i class="fa-solid fa-boxes-stacked text-xl"></i>
                <span class="text-[8px] font-black mt-0.5">STOK</span>
            </button>
        `);
    }

    // Modal List Stok Khusus Staf
    if (!document.getElementById('modal-staf-list-stok')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="modal-staf-list-stok" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] hidden items-center justify-center p-4">
                <div class="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                    <div class="px-6 py-4 bg-indigo-600 flex justify-between items-center text-white shrink-0">
                        <div>
                            <h2 class="font-black text-lg"><i class="fa-solid fa-boxes-stacked mr-2"></i>Update Stok Harian</h2>
                            <p id="status-gembok-staf" class="text-[10px] font-bold text-indigo-200">Status: TERBUKA</p>
                        </div>
                        <button onclick="window.tutupListStokStaf()" class="w-8 h-8 bg-indigo-500 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                    <div id="staf-stok-container" class="p-4 overflow-y-auto flex-1 space-y-2 bg-slate-50">
                        <!-- Render dari JS -->
                    </div>
                </div>
            </div>
        `);
    }
});

// Menampilkan tombol Stok Staf hanya saat mode kasir aktif
const oldSwitchRoleViewTahap10 = window.switchRoleView;
window.switchRoleView = function(role) {
    oldSwitchRoleViewTahap10(role);
    const btnStok = document.getElementById('btn-stok-staf');
    if (btnStok) {
        if (role === 'kasir') btnStok.classList.remove('hidden');
        else btnStok.classList.add('hidden');
    }
};

// 3. UI STOK UNTUK STAF (HANYA BISA UPDATE, TIDAK BISA HAPUS)
window.bukaListStokStaf = function() {
    document.getElementById('modal-staf-list-stok').classList.remove('hidden');
    document.getElementById('modal-staf-list-stok').classList.add('flex');
    window.renderStokStaf();
};

window.tutupListStokStaf = function() {
    document.getElementById('modal-staf-list-stok').classList.add('hidden');
    document.getElementById('modal-staf-list-stok').classList.remove('flex');
};

window.renderStokStaf = function() {
    const container = document.getElementById('staf-stok-container');
    const labelStatus = document.getElementById('status-gembok-staf');
    if (!container) return;

    if (window.statusStokTerkunci) {
        labelStatus.innerText = "Status: 🔒 TERKUNCI (Hubungi Owner)";
        labelStatus.classList.replace('text-indigo-200', 'text-amber-300');
    } else {
        labelStatus.innerText = "Status: 🔓 TERBUKA (Bisa Edit)";
        labelStatus.classList.replace('text-amber-300', 'text-indigo-200');
    }

    container.innerHTML = '';
    window.databaseStok.forEach(item => {
        container.innerHTML += `
        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <h4 class="font-black text-sm text-gray-900">${item.nama}</h4>
                <p class="text-[10px] font-bold text-gray-500">${item.jumlah} ${item.satuan}</p>
            </div>
            <button onclick="window.bukaFormStok('${item.id}')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-black hover:bg-indigo-600 hover:text-white transition">Update</button>
        </div>`;
    });
};

// 4. OVERRIDE FUNGSI SIMPAN STOK (CEK IZIN GEMBOK)
const oldSimpanDataStok = window.simpanDataStok;
window.simpanDataStok = function() {
    const isOwner = localStorage.getItem('isOwnerInKasir') === 'true' || localStorage.getItem('sesiMainstay') === 'owner';
    
    // Cegah staf menyimpan jika gembok aktif
    if (window.statusStokTerkunci && !isOwner) {
        window.playAudio('masuk'); 
        return alert("GAGAL MENYIMPAN!\n\nToko telah ditutup / rekap selesai. Akses edit stok dikunci. Silakan hubungi Owner untuk meminta izin Edit.");
    }
    
    // Ambil data sebelum override
    const id = document.getElementById('stok-id').value;
    const isNew = id === '';

    // Jalankan fungsi simpan dari Tahap 9
    oldSimpanDataStok();
    
    // Konversi array kembali ke Object untuk Firebase
    if (window.db && window.fbSet) {
        let firebaseObj = {};
        window.databaseStok.forEach(b => firebaseObj[b.id] = b);
        window.fbSet(window.fbRef(window.db, 'inventaris_stok'), firebaseObj);
    }
};

// 5. AUTO-LOCK SAAT STAF TERAKHIR PULANG
const oldProsesAbsenTahap10 = window.prosesAbsen;
window.prosesAbsen = function(tipe) {
    oldProsesAbsenTahap10(tipe); // Panggil sistem absensi sebelumnya
    
    if (tipe === 'Keluar' || tipe === 'Pulang') {
        let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
        // Jika sudah tidak ada staf di toko, otomatis gembok stok
        if (stafHadir.length === 0) {
            window.statusStokTerkunci = true;
            if (window.db && window.fbSet) {
                window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: true });
            }
        }
    }
};

// 6. INJEKSI TOMBOL GEMBOK DI PANEL OWNER
const oldRenderPanelStok = window.renderPanelStok;
window.renderPanelStok = function() {
    oldRenderPanelStok(); // Panggil UI list dari Tahap 9
    
    const panel = document.getElementById('panel-stok');
    if (!panel) return;

    const headerArea = panel.querySelector('.flex.justify-between.items-center');
    if (headerArea && !document.getElementById('btn-toggle-kunci')) {
        // Sisipkan tombol kunci di sebelah tombol Input Barang
        headerArea.insertAdjacentHTML('beforeend', `
            <button id="btn-toggle-kunci" onclick="window.toggleKunciOwner()" class="ml-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-200 transition border border-slate-300 shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-lock-open text-green-500"></i> Izin Staf: TERBUKA
            </button>
        `);
        window.updateTombolGembokOwner(); // Sesuaikan state awal
    }
};

window.toggleKunciOwner = function() {
    window.statusStokTerkunci = !window.statusStokTerkunci;
    
    // Tembak ke Firebase agar layar staf di toko langsung terkunci/terbuka detik itu juga
    if (window.db && window.fbSet) {
        window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: window.statusStokTerkunci });
    }
    window.updateTombolGembokOwner();
    
    const statusMsg = window.statusStokTerkunci ? "DIKUNCI. Staf tidak bisa edit stok lagi hari ini." : "DIBUKA. Staf diizinkan mengedit stok.";
    alert("Akses Stok " + statusMsg);
};

window.updateTombolGembokOwner = function() {
    const btn = document.getElementById('btn-toggle-kunci');
    if (!btn) return;

    if (window.statusStokTerkunci) {
        btn.innerHTML = '<i class="fa-solid fa-lock text-red-500"></i> Izin Staf: TERKUNCI';
        btn.classList.replace('bg-slate-100', 'bg-red-50');
        btn.classList.replace('border-slate-300', 'border-red-200');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-lock-open text-green-500"></i> Izin Staf: TERBUKA';
        btn.classList.replace('bg-red-50', 'bg-slate-100');
        btn.classList.replace('border-red-200', 'border-slate-300');
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 11: BUKTI FOTO FISIK/TIMBANGAN REKAP STOK
// ============================================================================

// 1. TIMPA MODAL STOK LAMA DENGAN VERSI BARU (ADA FITUR KAMERA)
const modalStokLama = document.getElementById('modal-form-stok');
if (modalStokLama) modalStokLama.remove(); // Hapus versi lama

const modalStokHTMLBaru = `
<div id="modal-form-stok" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
    <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0">
            <h2 id="stok-form-title" class="font-black text-lg"><i class="fa-solid fa-boxes-stacked text-indigo-400 mr-2"></i>Update Stok</h2>
            <button onclick="window.tutupFormStok()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
            <input type="hidden" id="stok-id">
            <input type="hidden" id="stok-foto"> <!-- Menyimpan data Base64 foto -->
            
            <div id="area-stok-nama-kategori" class="space-y-4">
                <div>
                    <label class="block mb-1">Nama Barang / Bahan</label>
                    <input type="text" id="stok-nama" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500">
                </div>
                <div>
                    <label class="block mb-1">Kategori Barang</label>
                    <select id="stok-kategori" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500">
                        <option value="Bahan Baku">Bahan Baku Utama</option>
                        <option value="Kemasan">Kemasan (Cup, Sedotan)</option>
                        <option value="Operasional">Alat Operasional</option>
                    </select>
                </div>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block mb-1">Sisa Stok Fisik</label>
                    <input type="number" step="0.01" id="stok-jumlah" class="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 outline-none focus:border-indigo-500 text-lg font-black text-indigo-700" placeholder="0">
                </div>
                <div>
                    <label class="block mb-1">Satuan</label>
                    <input type="text" id="stok-satuan" list="list-satuan" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 outline-none focus:border-indigo-500">
                </div>
            </div>

            <!-- AREA UPLOAD FOTO BUKTI FISIK -->
            <div class="border border-indigo-100 bg-indigo-50 p-4 rounded-xl mt-2 text-center">
                <label class="block mb-2 font-black text-indigo-800"><i class="fa-solid fa-camera mr-1"></i> Bukti Timbangan / Fisik</label>
                <div class="w-full h-32 bg-slate-200 rounded-xl overflow-hidden relative border-2 border-dashed border-indigo-200 flex items-center justify-center mb-2">
                    <img id="stok-preview-foto" src="" class="absolute inset-0 w-full h-full object-cover hidden">
                    <i id="stok-icon-kamera" class="fa-solid fa-image text-4xl text-indigo-300"></i>
                </div>
                <!-- Gunakan capture="environment" agar HP langsung membuka Kamera Belakang -->
                <input type="file" id="file-stok-bukti" class="text-[10px] w-full text-indigo-600 bg-white p-2 rounded-lg cursor-pointer border border-indigo-100 shadow-sm" accept="image/*" capture="environment" onchange="window.prosesBuktiStok(event)">
                <p class="text-[9px] text-indigo-500 mt-2 font-normal leading-tight">Gunakan kamera HP untuk memfoto angka pada timbangan atau sisa fisik barang di gudang.</p>
            </div>

        </div>
        <div class="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
            <button onclick="window.simpanDataStok()" class="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition shadow-[0_5px_15px_rgba(79,70,229,0.3)]">SIMPAN HASIL REKAP</button>
        </div>
    </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalStokHTMLBaru);

// 2. FUNGSI PREVIEW FOTO FISIK STOK
window.prosesBuktiStok = function(event) {
    // Meminjam fungsi prosesUploadGambar dari Tahap 7
    window.prosesUploadGambar(event, 'stok-foto', 'stok-preview-foto');
    document.getElementById('stok-icon-kamera').classList.add('hidden');
};

// 3. OVERRIDE BUKA FORM STOK (Agar foto lama / kosong dimuat dengan benar)
window.bukaFormStokTahapLama = window.bukaFormStok;
window.bukaFormStok = function(idBarang) {
    const isEdit = idBarang !== '';
    const item = isEdit ? window.databaseStok.find(b => b.id === idBarang) : null;
    
    // Panggil fungsi lama untuk mengisi nama, jumlah, satuan dll
    window.bukaFormStokTahapLama(idBarang);
    
    // Tambahan untuk Foto Bukti
    const previewImg = document.getElementById('stok-preview-foto');
    const iconCam = document.getElementById('stok-icon-kamera');
    const inputFoto = document.getElementById('stok-foto');
    const inputFile = document.getElementById('file-stok-bukti');
    
    inputFile.value = ''; // Reset input file
    
    if (isEdit && item && item.fotoBukti) {
        inputFoto.value = item.fotoBukti;
        previewImg.src = item.fotoBukti;
        previewImg.classList.remove('hidden');
        iconCam.classList.add('hidden');
    } else {
        inputFoto.value = '';
        previewImg.src = '';
        previewImg.classList.add('hidden');
        iconCam.classList.remove('hidden');
    }

    // Jika yang membuka adalah staf, kunci Nama & Kategori barang agar mereka hanya bisa update Sisa & Foto
    const isOwner = localStorage.getItem('isOwnerInKasir') === 'true' || localStorage.getItem('sesiMainstay') === 'owner';
    const areaNamaKategori = document.getElementById('area-stok-nama-kategori');
    if (!isOwner && isEdit) {
        document.getElementById('stok-nama').readOnly = true;
        document.getElementById('stok-kategori').disabled = true;
        document.getElementById('stok-nama').classList.add('bg-gray-100', 'text-gray-500');
    } else {
        document.getElementById('stok-nama').readOnly = false;
        document.getElementById('stok-kategori').disabled = false;
        document.getElementById('stok-nama').classList.remove('bg-gray-100', 'text-gray-500');
    }
};

// 4. OVERRIDE SIMPAN STOK (Memasukkan Bukti Foto)
window.simpanDataStokTahapLama = window.simpanDataStok;
window.simpanDataStok = function() {
    // Cegah staf menyimpan jika gembok aktif (aturan dari Tahap 10)
    const isOwner = localStorage.getItem('isOwnerInKasir') === 'true' || localStorage.getItem('sesiMainstay') === 'owner';
    if (window.statusStokTerkunci && !isOwner) {
        window.playAudio('masuk'); 
        return alert("GAGAL MENYIMPAN!\n\nToko telah ditutup / rekap selesai. Akses edit stok dikunci. Silakan hubungi Owner untuk meminta izin Edit.");
    }

    const id = document.getElementById('stok-id').value;
    const jumlahInput = document.getElementById('stok-jumlah').value;
    const fotoBukti = document.getElementById('stok-foto').value;
    
    if(document.getElementById('stok-nama').value.trim() === '') return alert("Nama barang wajib diisi!");
    if(jumlahInput === '') return alert("Jumlah stok wajib diisi!");

    const dataBarang = {
        id: id !== '' ? id : 'INV' + Date.now(),
        nama: document.getElementById('stok-nama').value,
        kategori: document.getElementById('stok-kategori').value,
        jumlah: parseFloat(jumlahInput),
        satuan: document.getElementById('stok-satuan').value || 'Pcs',
        fotoBukti: fotoBukti // Menyimpan foto base64
    };

    if (id !== '') {
        const index = window.databaseStok.findIndex(b => b.id === id);
        window.databaseStok[index] = dataBarang;
    } else {
        window.databaseStok.push(dataBarang);
    }
    
    // Lempar ke Firebase
    if (window.db && window.fbSet) {
        let firebaseObj = {};
        window.databaseStok.forEach(b => firebaseObj[b.id] = b);
        window.fbSet(window.fbRef(window.db, 'inventaris_stok'), firebaseObj);
    }

    window.tutupFormStok();
    if (document.getElementById('panel-stok') && !document.getElementById('panel-stok').classList.contains('hidden')) {
        window.renderPanelStok();
    }
    if (document.getElementById('modal-staf-list-stok') && !document.getElementById('modal-staf-list-stok').classList.contains('hidden')) {
        window.renderStokStaf();
    }
    alert("Data inventaris & foto bukti berhasil disimpan!");
};

// 5. UPDATE RENDER STOK UNTUK MENAMPILKAN THUMBNAIL FOTO
window.renderPanelStokTahapLama = window.renderPanelStok;
window.renderPanelStok = function() {
    window.renderPanelStokTahapLama();
    
    const panel = document.getElementById('panel-stok');
    if (!panel) return;
    
    const containerUtama = panel.querySelector('.space-y-3');
    if (!containerUtama) return;

    // Kita rewrite html item agar menampilkan foto jika ada
    let htmlStok = '';
    window.databaseStok.forEach((item) => {
        const isLow = parseFloat(item.jumlah) <= 5;
        const bgClass = isLow ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100';
        const iconColor = isLow ? 'text-red-500' : 'text-indigo-500';
        
        // Memeriksa keberadaan foto
        const thumbnailHTML = item.fotoBukti 
            ? `<img src="${item.fotoBukti}" class="w-10 h-10 rounded-xl object-cover border border-gray-200 shadow-sm">`
            : `<div class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shadow-sm"><i class="fa-solid fa-box ${iconColor} text-lg"></i></div>`;
        
        htmlStok += `
        <div class="${bgClass} p-4 rounded-2xl shadow-sm border flex items-center justify-between group">
            <div class="flex items-center gap-4">
                ${thumbnailHTML}
                <div>
                    <h4 class="font-black text-sm text-gray-900">${item.nama} ${isLow ? '<span class="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">Menipis</span>' : ''}</h4>
                    <p class="text-[10px] font-bold text-gray-500">${item.kategori}</p>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-right">
                    <span class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sisa Stok</span>
                    <span class="font-black text-lg ${isLow ? 'text-red-600' : 'text-indigo-600'}">${item.jumlah} <span class="text-xs">${item.satuan}</span></span>
                </div>
                <div class="flex flex-col gap-1 border-l border-gray-200 pl-3">
                    <button onclick="window.bukaFormStok('${item.id}')" class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="window.hapusStok('${item.id}')" class="w-7 h-7 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    });
    
    if (window.databaseStok.length > 0) {
        containerUtama.innerHTML = htmlStok;
    }
};

window.renderStokStafTahapLama = window.renderStokStaf;
window.renderStokStaf = function() {
    window.renderStokStafTahapLama();
    
    const container = document.getElementById('staf-stok-container');
    if (!container) return;

    let htmlStaf = '';
    window.databaseStok.forEach(item => {
        const thumbnailHTML = item.fotoBukti 
            ? `<img src="${item.fotoBukti}" class="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0">`
            : `<div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-300 flex items-center justify-center shrink-0"><i class="fa-solid fa-camera"></i></div>`;
            
        htmlStaf += `
        <div class="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between gap-3">
            ${thumbnailHTML}
            <div class="flex-1">
                <h4 class="font-black text-sm text-gray-900">${item.nama}</h4>
                <p class="text-[10px] font-bold text-gray-500">${item.jumlah} ${item.satuan}</p>
            </div>
            <button onclick="window.bukaFormStok('${item.id}')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-black hover:bg-indigo-600 hover:text-white transition">Update</button>
        </div>`;
    });
    
    if (window.databaseStok.length > 0) {
        container.innerHTML = htmlStaf;
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 12: HAK PREROGATIF OWNER (CRUD 24/7)
// ============================================================================

// 1. OVERRIDE HAPUS STOK (HANYA OWNER YANG BISA MENGHAPUS)
window.hapusStok = function(idBarang) {
    // Deteksi apakah yang sedang login adalah Owner
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    
    if (!isOwner) {
        window.playAudio('masuk');
        return alert("AKSES DITOLAK!\n\nHanya Master Owner yang diizinkan untuk menghapus daftar barang dari sistem.");
    }

    const item = window.databaseStok.find(b => b.id === idBarang);
    if(confirm(`Yakin ingin menghapus ${item.nama} dari daftar inventaris?`)) {
        window.databaseStok = window.databaseStok.filter(b => b.id !== idBarang);
        
        // Sinkronisasi penghapusan ke Firebase
        if (window.db && window.fbSet) {
            let firebaseObj = {};
            window.databaseStok.forEach(b => firebaseObj[b.id] = b);
            window.fbSet(window.fbRef(window.db, 'inventaris_stok'), firebaseObj);
        }
        window.renderPanelStok();
    }
};

// 2. OVERRIDE SIMPAN STOK (OWNER BYPASS GEMBOK 24/7)
window.simpanDataStok = function() {
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    
    // Gembok hanya berlaku untuk staf. Owner bebas hambatan.
    if (window.statusStokTerkunci && !isOwner) {
        window.playAudio('masuk'); 
        return alert("GAGAL MENYIMPAN!\n\nToko telah ditutup / rekap selesai. Akses edit stok dikunci. Silakan hubungi Owner.");
    }

    const id = document.getElementById('stok-id').value;
    const jumlahInput = document.getElementById('stok-jumlah').value;
    const fotoBukti = document.getElementById('stok-foto').value;
    
    if(document.getElementById('stok-nama').value.trim() === '') return alert("Nama barang wajib diisi!");
    if(jumlahInput === '') return alert("Jumlah stok wajib diisi!");

    const dataBarang = {
        id: id !== '' ? id : 'INV' + Date.now(),
        nama: document.getElementById('stok-nama').value,
        kategori: document.getElementById('stok-kategori').value,
        jumlah: parseFloat(jumlahInput),
        satuan: document.getElementById('stok-satuan').value || 'Pcs',
        fotoBukti: fotoBukti 
    };

    if (id !== '') {
        const index = window.databaseStok.findIndex(b => b.id === id);
        window.databaseStok[index] = dataBarang;
    } else {
        window.databaseStok.push(dataBarang);
    }
    
    // Kirim pembaruan live ke Firebase
    if (window.db && window.fbSet) {
        let firebaseObj = {};
        window.databaseStok.forEach(b => firebaseObj[b.id] = b);
        window.fbSet(window.fbRef(window.db, 'inventaris_stok'), firebaseObj);
    }

    window.tutupFormStok();
    
    // Refresh layar yang sedang terbuka
    if (document.getElementById('panel-stok') && !document.getElementById('panel-stok').classList.contains('hidden')) {
        window.renderPanelStok();
    }
    if (document.getElementById('modal-staf-list-stok') && !document.getElementById('modal-staf-list-stok').classList.contains('hidden')) {
        window.renderStokStaf();
    }
    
    // Beri pesan berbeda untuk Owner agar tahu status prerogatifnya aktif
    if (isOwner) {
        alert("Revisi Super Admin berhasil disimpan.");
    } else {
        alert("Bukti fisik berhasil disetorkan.");
    }
};

// 3. OVERRIDE BUKA FORM STOK (MEMASTIKAN KOLOM NAMA HANYA TERKUNCI UNTUK STAF)
window.bukaFormStokTahap11 = window.bukaFormStok;
window.bukaFormStok = function(idBarang) {
    window.bukaFormStokTahap11(idBarang);
    
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    const isEdit = idBarang !== '';
    
    const inputNama = document.getElementById('stok-nama');
    const inputKategori = document.getElementById('stok-kategori');

    // Jika yang buka adalah staf dan ini proses update, kunci nama barangnya
    if (!isOwner && isEdit) {
        inputNama.readOnly = true;
        inputKategori.disabled = true;
        inputNama.classList.add('bg-gray-100', 'text-gray-500');
    } else {
        // Jika Owner, buka semua gembok kolom teks
        inputNama.readOnly = false;
        inputKategori.disabled = false;
        inputNama.classList.remove('bg-gray-100', 'text-gray-500');
    }
};
