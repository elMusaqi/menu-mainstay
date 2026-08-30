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
