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
}// ============================================================================
// KODE MASTER FINAL MAINSTAY POS - BAGIAN 1
// (VARIABEL, UTILITAS, & INJEKSI HTML UTAMA)
// ============================================================================

// 1. DEKLARASI VARIABEL INTI & STATE
window.databaseStaf = [];
window.profilOwner = { nama: "Master Owner", wa: "", rekening: "", pin: "888888", foto: "" };
window.masterTopping = [];
window.databaseStok = [];
window.riwayatAbsensi = [];
window.riwayatTransaksiLokal = [];
window.katalogMenu = [];
window.systemConfig = { logoUrl: "logo-512.png", qrisUrl: "qris-mainstay.png" };
window.statusStokTerkunci = false;
window.tanggalSistemSekarang = new Date().toLocaleDateString('id-ID');

window.cameraStream = null;
window.tempTotalBayarKasir = 0;
window.tempSelectedToppings = [];
window.isKasirMode = false;
window.isProcessingCheckout = false;
window.isAuthenticated = false;
window.posKategoriAktif = 'all';

// KONEKSI GOOGLE APPS SCRIPT (Silakan isi URL Spreadsheet Anda nanti di antara kutip ini)
window.URL_GOOGLE_APPS_SCRIPT = ""; 

// 2. UTILITAS (AUDIO, KOMPRESI FOTO, & ESCAPE HTML)
window.playAudio = function(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'masuk') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.1); } 
        else if (type === 'error') { osc.type = 'square'; osc.frequency.setValueAtTime(300, ctx.currentTime); gain.gain.setValueAtTime(0.1, ctx.currentTime); osc.start(); osc.stop(ctx.currentTime + 0.3); }
    } catch(e) {}
};

window.escapeHTML = function(str) { return str ? str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag)) : ""; };

window.prosesUploadGambar = function(event, targetId, previewId) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas'); const MAX = 500;
            canvas.width = MAX; canvas.height = img.height * (MAX / img.width);
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const b64 = canvas.toDataURL('image/jpeg', 0.6); // Kompresi 60% agar memori HP/Browser aman
            const inputEl = document.getElementById(targetId); if(inputEl) { inputEl.value = b64; inputEl.dispatchEvent(new Event('input', {bubbles:true})); }
            const prev = document.getElementById(previewId); if(prev) { prev.src = b64; prev.classList.remove('hidden'); if(prev.nextElementSibling) prev.nextElementSibling.classList.add('hidden'); }
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
};

// 3. PEMUATAN DATA LOKAL & LISTENER FIREBASE
document.addEventListener('DOMContentLoaded', () => {
    // Tarik data anti-mati lampu
    if(localStorage.getItem('mainstay_dbStaf')) window.databaseStaf = JSON.parse(localStorage.getItem('mainstay_dbStaf'));
    if(localStorage.getItem('mainstay_dbOwner')) window.profilOwner = JSON.parse(localStorage.getItem('mainstay_dbOwner'));
    if(localStorage.getItem('mainstay_dbTopping')) window.masterTopping = JSON.parse(localStorage.getItem('mainstay_dbTopping'));
    if(localStorage.getItem('mainstay_dbStok')) window.databaseStok = JSON.parse(localStorage.getItem('mainstay_dbStok'));
    if(localStorage.getItem('mainstay_dbAbsen')) window.riwayatAbsensi = JSON.parse(localStorage.getItem('mainstay_dbAbsen'));
    if(localStorage.getItem('mainstay_dbTransaksi')) window.riwayatTransaksiLokal = JSON.parse(localStorage.getItem('mainstay_dbTransaksi'));
    if(localStorage.getItem('mainstay_dbMenu')) window.katalogMenu = JSON.parse(localStorage.getItem('mainstay_dbMenu'));
    if(localStorage.getItem('mainstay_dbConfig')) window.systemConfig = Object.assign(window.systemConfig, JSON.parse(localStorage.getItem('mainstay_dbConfig')));
    
    // Injeksi Menu Pancingan agar Layar Customer tidak blank putih saat pertama kali install
    if(window.katalogMenu.length === 0) {
        window.katalogMenu = [{ id: "M1", nama: "Es Teh Pancingan", kategori: "tea", harga: 5000, stok: 100, image: "", opsiTopping: [] }];
        localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu));
    }

    // Sambungan Live ke Firebase
    if (window.db && window.fbOnValue) {
        window.fbOnValue(window.fbRef(window.db, 'katalog_menu'), (snap) => { if(snap.exists()){ window.katalogMenu = Object.values(snap.val()); localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu)); if(typeof window.renderKatalog === 'function') window.renderKatalog(); if(typeof window.renderKategoriFilter === 'function') window.renderKategoriFilter(); }});
        window.fbOnValue(window.fbRef(window.db, 'master_topping'), (snap) => { if(snap.exists()){ window.masterTopping = snap.val(); localStorage.setItem('mainstay_dbTopping', JSON.stringify(window.masterTopping)); }});
        window.fbOnValue(window.fbRef(window.db, 'inventaris_stok'), (snap) => { if(snap.exists()){ window.databaseStok = Object.values(snap.val()); localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok)); if(typeof window.renderPanelStok === 'function') window.renderPanelStok(); if(typeof window.renderStokStaf === 'function') window.renderStokStaf(); }});
        window.fbOnValue(window.fbRef(window.db, 'hrd_karyawan'), (snap) => { if(snap.exists()){ window.databaseStaf = Object.values(snap.val()); localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf)); if(typeof window.renderPanelHRD === 'function') window.renderPanelHRD(); }});
        window.fbOnValue(window.fbRef(window.db, 'riwayat_absen'), (snap) => { if(snap.exists()){ window.riwayatAbsensi = snap.val(); localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi)); }});
        window.fbOnValue(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), (snap) => { if(snap.exists()){ const dataKunci = snap.val(); if (dataKunci.tanggal === window.tanggalSistemSekarang) { window.statusStokTerkunci = dataKunci.isLocked; } else { window.statusStokTerkunci = false; window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: false }); } if(typeof window.updateTombolGembokOwner === 'function') window.updateTombolGembokOwner(); }});
        window.fbOnValue(window.fbRef(window.db, 'konfigurasi_web'), (snap) => { if(snap.exists()){ window.systemConfig = Object.assign(window.systemConfig, snap.val()); localStorage.setItem('mainstay_dbConfig', JSON.stringify(window.systemConfig)); setTimeout(() => { if (document.getElementById('header-logo-img')) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl || 'logo-512.png'; if (document.getElementById('qris-img-display')) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl || 'qris-mainstay.png'; if (document.getElementById('kasir-qris-img')) document.getElementById('kasir-qris-img').src = window.systemConfig.qrisUrl || 'qris-mainstay.png'; }, 100); }});
    }

    // Sensor Ganti Hari (Membuka gembok otomatis saat jam 00:00)
    setInterval(() => {
        const dateNow = new Date().toLocaleDateString('id-ID');
        if(window.tanggalSistemSekarang !== dateNow) { window.tanggalSistemSekarang = dateNow; window.statusStokTerkunci = false; if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: dateNow, isLocked: false }); if(typeof window.updateTombolGembokOwner === 'function') window.updateTombolGembokOwner(); }
    }, 60000);
});

// 4. INJEKSI UI MODAL KHUSUS (LOGIN, ABSENSI, & POS KASIR)
document.addEventListener('DOMContentLoaded', () => {
    const essentialModalsHTML = `
    <!-- 4.1 MODAL LOGIN (OTORISASI) -->
    <div id="modal-login" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] hidden items-center justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white"><h2 class="font-black text-lg"><i class="fa-solid fa-lock text-amber-500 mr-2"></i> Otorisasi</h2><button onclick="window.closeLoginModal()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="p-6 bg-slate-50 text-center">
                <input type="password" id="login-pin" class="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-center text-2xl font-black focus:border-amber-500 mb-2 shadow-sm" placeholder="******" maxlength="6" inputmode="numeric">
                <p id="login-error" class="text-xs font-black text-red-500 hidden mb-4 bg-red-50 py-2 rounded-lg">PIN Salah!</p>
                <button onclick="window.prosesLogin()" class="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-amber-600 transition">MASUK</button>
            </div>
        </div>
    </div>
    
    <!-- 4.2 MODAL ABSENSI KAMERA -->
    <div id="modal-absensi" class="fixed inset-0 bg-black/90 backdrop-blur-md z-[999] hidden flex-col items-center justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 relative flex flex-col">
            <div class="flex justify-between items-center mb-4"><h2 class="font-black text-lg text-gray-900"><i class="fa-solid fa-camera text-blue-500 mr-2"></i> Verifikasi Kehadiran</h2><button onclick="window.closeAbsensi()" class="w-8 h-8 bg-gray-100 rounded-full text-gray-600 hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden mb-4 border-4 border-dashed border-gray-200 flex items-center justify-center"><video id="attendance-video" class="absolute inset-0 w-full h-full object-cover hidden" autoplay playsinline></video></div>
            <input type="password" id="absen-pin" class="w-full bg-slate-50 border-2 border-gray-200 rounded-2xl p-3 text-center text-lg font-black focus:border-blue-500 mb-4" placeholder="Ketik PIN Staf" maxlength="6" inputmode="numeric">
            <button onclick="window.prosesAbsen('Masuk')" class="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition"><i class="fa-solid fa-camera mr-2"></i> MULAI ABSEN MASUK</button>
        </div>
    </div>
    
    <!-- 4.3 LAYAR DEDICATED POS KASIR (FULLSCREEN) -->
    <div id="modal-pos-kasir" class="fixed inset-0 bg-slate-50 z-[150] hidden flex-col">
        <div class="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md shrink-0"><h2 class="font-black text-lg"><i class="fa-solid fa-cash-register text-amber-400 mr-2"></i> KASIR: INPUT POS</h2><button onclick="window.tutupOrderKasir()" class="bg-gray-800 w-8 h-8 rounded-full text-white hover:bg-red-500 transition shadow-sm"><i class="fa-solid fa-arrow-left"></i></button></div>
        <div id="pos-kategori-container" class="flex gap-2 overflow-x-auto p-4 bg-white border-b shrink-0 shadow-sm"></div>
        <div id="pos-menu-container" class="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-4 pb-32 content-start"></div>
        <div class="absolute bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
            <div><p class="text-[10px] font-bold text-gray-500 uppercase">Total Tagihan</p><h3 id="pos-total-harga" class="text-xl font-black text-amber-500">Rp 0</h3><p id="pos-total-item" class="text-[10px] font-bold text-gray-400">0 Item</p></div>
            <div class="flex gap-2"><button onclick="window.openCartModal()" class="bg-indigo-50 text-indigo-600 px-3 py-3 rounded-2xl font-black shadow-sm flex items-center gap-2"><i class="fa-solid fa-basket-shopping"></i> <span class="hidden md:inline">KERANJANG</span></button><button onclick="window.prosesCheckout()" class="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black shadow-lg flex items-center gap-2"><i class="fa-solid fa-money-bill-wave"></i> BAYAR</button></div>
        </div>
    </div>

    <!-- 4.4 GEMBOK KASIR (DI DALAM VIEW KASIR) -->
    `;
    
    if(!document.getElementById('modal-login')) document.body.insertAdjacentHTML('beforeend', essentialModalsHTML);
    
    // Injeksi Gembok Kasir
    const viewKasir = document.getElementById('view-kasir');
    if (viewKasir && !document.getElementById('kasir-blocker')) {
        viewKasir.classList.add('relative');
        viewKasir.insertAdjacentHTML('afterbegin', `<div id="kasir-blocker" class="absolute inset-0 bg-slate-50/95 backdrop-blur-md z-[40] flex flex-col items-center justify-center hidden min-h-screen pb-32"><div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6"><i class="fa-solid fa-lock text-4xl text-gray-300"></i></div><h3 class="text-xl font-black text-gray-900 mb-1">Akses Terkunci</h3><p class="text-xs font-bold text-gray-500 mb-8 px-8 text-center">Halo, Staf! Wajib Absen Masuk sebelum menerima pesanan.</p><button onclick="window.openAbsensi()" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg"><i class="fa-solid fa-camera mr-2"></i> MULAI ABSEN MASUK</button></div>`);
    }

    // Injeksi Tombol Logout dan Set Gambar Default
    setTimeout(() => {
        if (viewKasir && !document.getElementById('btn-logout-kasir')) viewKasir.insertAdjacentHTML('afterbegin', `<button id="btn-logout-kasir" onclick="window.prosesLogout()" class="absolute top-4 right-4 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-black border border-red-100 hover:bg-red-600 hover:text-white transition shadow-sm z-[100]"><i class="fa-solid fa-power-off mr-2"></i>LOGOUT</button>`);
        const ownerNav = document.querySelector('.owner-nav');
        if (ownerNav && !document.getElementById('btn-logout-owner')) ownerNav.insertAdjacentHTML('beforeend', `<button id="btn-logout-owner" onclick="window.prosesLogout()" class="w-full flex flex-col items-center justify-center p-3 rounded-2xl transition bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100 shadow-sm mt-4"><i class="fa-solid fa-power-off text-xl mb-1"></i><span class="text-[10px] font-black uppercase">LOGOUT</span></button>`);
        
        if (document.getElementById('header-logo-img')) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl || 'logo-512.png';
        if (document.getElementById('qris-img-display')) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl || 'qris-mainstay.png';
        if (document.getElementById('kasir-qris-img')) document.getElementById('kasir-qris-img').src = window.systemConfig.qrisUrl || 'qris-mainstay.png';
    }, 500);
});
// ============================================================================
// KODE MASTER FINAL MAINSTAY POS - BAGIAN 2
// (KEAMANAN, ABSENSI, KERANJANG, POS KASIR, & PEMBAYARAN)
// ============================================================================

// ----------------------------------------------------------------------------
// 5. SISTEM KEAMANAN (LOGIN & LOGOUT)
// ----------------------------------------------------------------------------
if (!window.switchLayarAsliTanpaGembok) window.switchLayarAsliTanpaGembok = window.switchRoleView;

window.switchRoleView = function(role) {
    if ((role === 'owner' || role === 'kasir') && window.isAuthenticated === false) {
        window.targetLoginRole = role; 
        const modal = document.getElementById('modal-login');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); const pinInput = document.getElementById('login-pin'); if (pinInput) pinInput.value = ''; const err = document.getElementById('login-error'); if(err) err.classList.add('hidden'); } 
        return;
    }
    if (role === 'customer') {
        window.isAuthenticated = false; window.isKasirMode = false; localStorage.removeItem('isOwnerInKasir');
        const headerTitle = document.querySelector('#view-customer h1, #view-customer h2');
        if (headerTitle && window.judulAsliCustomer) headerTitle.innerHTML = window.judulAsliCustomer;
        const btnPlus = document.getElementById('btn-plus-order-kasir'); if(btnPlus) btnPlus.classList.add('hidden');
    }
    window.switchLayarAsliTanpaGembok(role);
};

window.prosesLogin = function() {
    const pin = document.getElementById('login-pin')?.value || '';
    const err = document.getElementById('login-error');
    if (pin === 'RESET88') {
        if (!window.profilOwner) window.profilOwner = { nama: "Master Owner" };
        window.profilOwner.pin = '888888'; localStorage.setItem('mainstay_dbOwner', JSON.stringify(window.profilOwner));
        document.getElementById('login-pin').value = ''; return alert("SISTEM PEMULIHAN AKTIF:\nPIN Owner telah di-reset ke 888888.");
    }
    if (!pin) { if (err) { err.classList.remove('hidden'); err.innerText = "Harap masukkan PIN!"; } return; }
    if (!window.profilOwner || !window.profilOwner.pin) window.profilOwner = { nama: "Master Owner", pin: "888888" };
    
    const staf = window.databaseStaf ? window.databaseStaf.find(s => s.pin === pin) : null;

    if (pin === window.profilOwner.pin) {
        window.closeLoginModal(); window.isAuthenticated = true;
        if (window.targetLoginRole === 'kasir') {
            localStorage.setItem('isOwnerInKasir', 'true'); window.isKasirMode = true; window.switchRoleView('kasir'); document.getElementById('kasir-blocker')?.classList.add('hidden');
        } else { window.switchRoleView('owner'); }
    } else if (staf && window.targetLoginRole === 'kasir') {
        window.closeLoginModal(); window.isAuthenticated = true; localStorage.setItem('isOwnerInKasir', 'false'); window.isKasirMode = true; window.switchRoleView('kasir');
        const stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
        if (stafHadir.length > 0) document.getElementById('kasir-blocker')?.classList.add('hidden'); else document.getElementById('kasir-blocker')?.classList.remove('hidden');
    } else { if (err) { err.classList.remove('hidden'); err.innerText = "PIN Salah / Tidak Terdaftar!"; } }
};

window.closeLoginModal = function() { const m = document.getElementById('modal-login'); if(m){ m.classList.add('hidden'); m.classList.remove('flex'); } };

window.prosesLogout = function() {
    if(confirm("Yakin ingin Keluar (Logout)?")) {
        window.isAuthenticated = false; window.isKasirMode = false; localStorage.removeItem('isOwnerInKasir');
        if (window.currentCart && window.currentCart.length > 0) { window.currentCart = []; localStorage.removeItem('cartMainstay'); if(typeof window.updateCartFloat === 'function') window.updateCartFloat(); }
        window.switchLayarAsliTanpaGembok('customer');
    }
};

// ----------------------------------------------------------------------------
// 6. ABSENSI KAMERA & LOGIKA JAM SHIFT
// ----------------------------------------------------------------------------
window.openAbsensi = async function() {
    const modal = document.getElementById('modal-absensi'); const video = document.getElementById('attendance-video');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        window.cameraStream = stream;
        if (video) { video.srcObject = stream; video.onloadedmetadata = () => { video.play(); video.classList.remove('hidden'); }; }
    } catch(err) { alert("Akses kamera gagal / ditolak browser."); window.closeAbsensi(); }
};

window.closeAbsensi = function() {
    if (window.cameraStream) { window.cameraStream.getTracks().forEach(t => t.stop()); window.cameraStream = null; }
    const m = document.getElementById('modal-absensi'); if(m) { m.classList.add('hidden'); m.classList.remove('flex'); }
};

window.prosesAbsen = function(tipe) {
    const pin = document.getElementById('absen-pin')?.value;
    const staf = window.databaseStaf.find(s => s.pin === pin);
    if (!staf) return alert("PIN Tidak Terdaftar!");
    
    let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
    if (tipe === 'Masuk' && stafHadir.includes(staf.nama)) { window.playAudio('error'); return alert(`DITOLAK!\n${staf.nama} sudah Absen Masuk.`); }
    if ((tipe === 'Keluar' || tipe === 'Pulang') && !stafHadir.includes(staf.nama)) { window.playAudio('error'); return alert(`DITOLAK!\n${staf.nama} tidak aktif dalam shift.`); }

    let fotoWajah = "";
    const video = document.getElementById('attendance-video');
    if (video && !video.classList.contains('hidden')) {
        const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = video.videoHeight * (300 / video.videoWidth);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height); fotoWajah = canvas.toDataURL('image/jpeg', 0.4); 
    }
    
    let durasiKerja = "-";
    if (tipe === 'Masuk' && staf.shift && staf.shift.includes('-')) {
        const [jamTarget, menitTarget] = staf.shift.split('-')[0].trim().split(':');
        const waktuTarget = new Date(); waktuTarget.setHours(jamTarget, menitTarget, 0, 0);
        const selisihMenit = Math.floor((new Date() - waktuTarget) / 60000);
        if (selisihMenit > 15) durasiKerja = `Terlambat ${selisihMenit} Menit`; else if (selisihMenit < -15) durasiKerja = `Lebih Awal ${Math.abs(selisihMenit)} Menit`; else durasiKerja = "Tepat Waktu";
    } else if (tipe === 'Keluar' || tipe === 'Pulang') {
        const riwayat = JSON.parse(localStorage.getItem('mainstay_dbAbsen')) || [];
        const msk = riwayat.slice().reverse().find(l => l.nama === staf.nama && l.tipe === 'Masuk');
        if (msk) { const selisihMs = new Date() - new Date(msk.waktu); durasiKerja = `${Math.floor(selisihMs / 3600000)} Jam ${Math.floor((selisihMs % 3600000) / 60000)} Menit`; }
    }

    const dataAbsen = { id: 'ABS' + Date.now(), waktu: new Date().toISOString(), nama: staf.nama, tipe: tipe, foto: fotoWajah, durasi: durasiKerja };
    window.riwayatAbsensi.push(dataAbsen); localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi));
    if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), window.riwayatAbsensi);

    if (tipe === 'Masuk') { stafHadir.push(staf.nama); document.getElementById('kasir-blocker')?.classList.add('hidden'); } 
    else {
        stafHadir = stafHadir.filter(n => n !== staf.nama);
        if (stafHadir.length === 0) { document.getElementById('kasir-blocker')?.classList.remove('hidden'); window.statusStokTerkunci = true; if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: true }); }
    }
    
    localStorage.setItem('stafHadirMainstay', JSON.stringify(stafHadir)); window.closeAbsensi();
    let msg = `Berhasil Absen ${tipe}: ${staf.nama}`;
    if (tipe === 'Masuk' && durasiKerja.includes('Terlambat')) msg += `\n⚠️ PERHATIAN: Anda ${durasiKerja}!`; else if (tipe === 'Keluar' || tipe === 'Pulang') msg += `\nKerja: ${durasiKerja}`;
    alert(msg);
};

// ----------------------------------------------------------------------------
// 7. LAYAR POS KASIR (DEDICATED FULLSCREEN) & QUICK ADD
// ----------------------------------------------------------------------------
window.bukaOrderKasir = function() {
    window.isKasirMode = true; 
    const m = document.getElementById('modal-pos-kasir'); if(m){ m.classList.remove('hidden'); m.classList.add('flex'); }
    window.renderPOSKategori(); window.renderPOSMenu('all'); window.updatePOSCartSummary();
};

window.tutupOrderKasir = function() {
    if (window.currentCart && window.currentCart.length > 0) { if(!confirm("Ada pesanan belum dibayar. Yakin ingin batal?")) return; window.currentCart = []; localStorage.removeItem('cartMainstay'); window.updatePOSCartSummary(); }
    const m = document.getElementById('modal-pos-kasir'); if(m){ m.classList.add('hidden'); m.classList.remove('flex'); }
};

window.renderPOSKategori = function() {
    const c = document.getElementById('pos-kategori-container'); if (!c) return;
    const unik = ['Semua']; window.katalogMenu.forEach(m => { if(m.kategori) { const k = m.kategori.charAt(0).toUpperCase() + m.kategori.slice(1); if (!unik.includes(k)) unik.push(k); }});
    c.innerHTML = '';
    unik.forEach((kat) => {
        const isAktif = (window.posKategoriAktif === 'all' && kat === 'Semua') || window.posKategoriAktif === kat.toLowerCase();
        c.innerHTML += `<button onclick="window.renderPOSMenu('${kat === 'Semua' ? 'all' : kat.toLowerCase()}')" class="px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition shadow-sm ${isAktif ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}">${kat}</button>`;
    });
};

window.renderPOSMenu = function(kategori) {
    window.posKategoriAktif = kategori; window.renderPOSKategori(); 
    const c = document.getElementById('pos-menu-container'); if(!c) return;
    let filtered = kategori !== 'all' ? window.katalogMenu.filter(m => m.kategori && m.kategori.toLowerCase() === kategori) : window.katalogMenu;
    c.innerHTML = '';
    if (filtered.length === 0) { c.innerHTML = '<div class="col-span-full text-center py-10 text-gray-400 font-bold text-xs">Kosong.</div>'; return; }

    filtered.forEach(item => {
        const isHabis = item.stok === 0;
        const badgeTop = (item.opsiTopping && item.opsiTopping.length > 0) ? '<span class="absolute top-2 left-2 bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10"><i class="fa-solid fa-wand-magic-sparkles"></i></span>' : '';
        const badgeStok = isHabis ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">HABIS</span>' : '';
        c.innerHTML += `
        <div onclick="window.tambahCepatKeKeranjang(event, '${item.id}')" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative cursor-pointer hover:border-amber-400 transition active:scale-95 flex flex-col h-full group">
            ${badgeTop}${badgeStok}
            <div class="h-24 w-full bg-slate-100 relative shrink-0">${item.image ? `<img src="${item.image}" class="w-full h-full object-cover ${isHabis ? 'grayscale opacity-50' : ''}">` : `<div class="w-full h-full flex items-center justify-center text-gray-300"><i class="fa-solid fa-image text-2xl"></i></div>`}<div class="absolute inset-0 bg-amber-500/20 hidden group-active:block transition"></div></div>
            <div class="p-3 flex-1 flex flex-col justify-between"><h3 class="font-black text-xs text-gray-900 leading-tight mb-2 ${isHabis ? 'text-gray-400' : ''}">${item.nama}</h3><div class="flex justify-between items-center"><span class="text-[10px] font-black ${isHabis ? 'text-gray-400' : 'text-amber-500'}">Rp ${parseInt(item.harga).toLocaleString('id-ID')}</span>${!isHabis ? `<div class="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center pointer-events-none"><i class="fa-solid fa-plus text-[10px]"></i></div>` : ''}</div></div>
        </div>`;
    });
};

window.tambahCepatKeKeranjang = function(event, id) {
    event.stopPropagation(); 
    const item = window.katalogMenu.find(m => m.id === id);
    if(!item || item.stok <= 0) return alert("Stok Habis!");
    if(item.opsiTopping && item.opsiTopping.length > 0) { window.openMenuDetail(id); return; }

    window.currentCart = window.currentCart || [];
    const idx = window.currentCart.findIndex(c => c.id === item.id);
    if(idx > -1) {
        if (window.currentCart[idx].qty + 1 > item.stok) return alert(`Stok "${item.nama}" tidak cukup!`);
        window.currentCart[idx].qty += 1; window.currentCart[idx].subtotal = window.currentCart[idx].qty * window.currentCart[idx].harga;
    } else {
        window.currentCart.push({ cartId: Date.now().toString(), id: item.id, nama: item.nama, harga: parseInt(item.harga), qty: 1, subtotal: parseInt(item.harga), kategori: item.kategori });
    }
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.playAudio('masuk'); window.updatePOSCartSummary(); if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
    
    const btn = event.currentTarget; const old = btn.innerHTML;
    btn.innerHTML = '<div class="absolute inset-0 bg-green-500 flex items-center justify-center text-white text-2xl"><i class="fa-solid fa-check"></i></div>';
    setTimeout(() => { btn.innerHTML = old; }, 300);
};

window.updatePOSCartSummary = function() {
    const elTot = document.getElementById('pos-total-harga'); const elItm = document.getElementById('pos-total-item');
    if(elTot && elItm && window.currentCart) {
        elTot.innerText = `Rp ${window.currentCart.reduce((sum, i) => sum + i.subtotal, 0).toLocaleString('id-ID')}`;
        elItm.innerText = `${window.currentCart.reduce((sum, i) => sum + i.qty, 0)} Item`;
    }
};

const oldUpdateCartFloat = window.updateCartFloat;
window.updateCartFloat = function() { if(typeof oldUpdateCartFloat === 'function') oldUpdateCartFloat(); window.updatePOSCartSummary(); };

// ----------------------------------------------------------------------------
// 8. KONTROL KERANJANG (PLUS, MINUS, TONG SAMPAH)
// ----------------------------------------------------------------------------
if (!window.originalOpenCartModal) window.originalOpenCartModal = window.openCartModal;
window.openCartModal = function() {
    window.originalOpenCartModal();
    const c = document.getElementById('cart-items-container') || document.querySelector('.cart-items');
    if (c) {
        Array.from(c.children).forEach((el, i) => {
            const kanan = el.querySelector('.text-right') || el.querySelector('div:last-child');
            if (kanan && !kanan.querySelector('.btn-qty-control')) kanan.insertAdjacentHTML('beforeend', `<div class="flex items-center justify-end gap-2 mt-2 btn-qty-control"><button onclick="window.ubahQtyCartItem(${i}, -1)" class="w-7 h-7 bg-slate-100 rounded text-gray-700 font-black hover:bg-slate-200 transition">-</button><span class="text-xs font-black w-5 text-center">${window.currentCart[i].qty}</span><button onclick="window.ubahQtyCartItem(${i}, 1)" class="w-7 h-7 bg-amber-100 text-amber-700 rounded font-black hover:bg-amber-200 transition">+</button></div>`);
            if (!el.querySelector('.btn-hapus-item')) (el.querySelector('.flex.justify-between') || el).insertAdjacentHTML('beforeend', `<button onclick="window.hapusSatuItemKeranjang(${i})" class="btn-hapus-item ml-3 w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition shadow-sm shrink-0"><i class="fa-solid fa-trash text-[10px]"></i></button>`);
        });
    }
};

window.ubahQtyCartItem = function(index, jml) {
    const item = window.currentCart[index];
    if (jml > 0) { const menu = window.katalogMenu.find(m => m.id === item.id); if (menu && (item.qty + jml) > menu.stok) return alert(`Stok sisa ${menu.stok}.`); }
    item.qty += jml; item.subtotal = item.qty * item.harga;
    if (item.qty <= 0) return window.hapusSatuItemKeranjang(index);
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.updateCartFloat(); window.openCartModal();
};

window.hapusSatuItemKeranjang = function(index) {
    if (confirm("Hapus pesanan ini?")) { window.currentCart.splice(index, 1); localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart)); window.updateCartFloat(); if (window.currentCart.length === 0 && typeof window.closeCartModal === 'function') window.closeCartModal(); else window.openCartModal(); }
};

// ----------------------------------------------------------------------------
// 9. PEMBAYARAN KASIR, POTONG STOK OTOMATIS & GOOGLE SPREADSHEET
// ----------------------------------------------------------------------------
if (!window.originalProsesCheckout) window.originalProsesCheckout = window.prosesCheckout;
window.prosesCheckout = function() {
    if (window.isKasirMode) {
        if (!window.currentCart || window.currentCart.length === 0) return alert("Keranjang kosong.");
        window.tempTotalBayarKasir = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
        
        let htmlPayment = `
        <div id="modal-payment-kasir" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] flex flex-col items-center justify-end md:justify-center p-4">
            <div class="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[95vh]">
                <button onclick="document.getElementById('modal-payment-kasir').remove(); window.openCartModal();" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-600 hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
                <div class="overflow-y-auto flex-1 pb-4">
                    <h2 class="text-xl font-black text-gray-900 mb-1"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i>Pembayaran</h2>
                    <label class="text-[10px] font-black text-gray-500 uppercase">Kasir:</label><select id="kasir-staf-dropdown" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 mb-2 cursor-pointer"></select>
                    <div class="grid grid-cols-2 gap-2 mt-2 mb-2"><div><label class="text-[10px] font-black text-gray-500 uppercase">Pelanggan</label><input type="text" id="kasir-nama-pelanggan" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold" placeholder="Opsional"></div><div><label class="text-[10px] font-black text-gray-500 uppercase">Diskon (Rp)</label><input type="number" id="kasir-input-diskon" onkeyup="window.hitungKembalian()" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-red-500" placeholder="0"></div></div>
                    <div class="mt-2 mb-4"><label class="text-[10px] font-black text-gray-500 uppercase">Metode:</label><div class="grid grid-cols-2 gap-2 mt-1"><button id="btn-tunai" onclick="window.pilihMetodeKasir('Tunai')" class="bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500 transition">TUNAI</button><button id="btn-qris" onclick="window.pilihMetodeKasir('QRIS')" class="bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2 transition">QRIS</button></div><input type="hidden" id="kasir-metode-terpilih" value="Tunai"></div>
                    <div class="bg-gray-900 text-white p-4 rounded-2xl mb-4 text-center"><p class="text-[10px] font-black text-gray-400 uppercase">Total Tagihan</p><h3 id="pay-total" class="text-3xl font-black text-amber-400">Rp ${window.tempTotalBayarKasir.toLocaleString('id-ID')}</h3></div>
                    <div id="kasir-qris-container" class="hidden flex-col items-center justify-center mb-4 p-4 border-2 border-dashed border-amber-300 bg-amber-50 rounded-2xl"><p class="text-[10px] font-black text-amber-600 mb-2 uppercase">Scan QRIS</p><img id="kasir-qris-img" src="${window.systemConfig.qrisUrl}" class="w-40 h-40 object-contain rounded-xl shadow-sm"></div>
                    <div id="kasir-input-uang-area"><input type="number" id="pay-input" onkeyup="window.hitungKembalian()" class="w-full bg-slate-50 border rounded-xl p-4 text-2xl text-center font-black mb-3" placeholder="0" inputmode="numeric"><div class="grid grid-cols-3 gap-2 mb-6"><button onclick="window.setUang(0)" class="bg-amber-100 text-amber-700 font-black py-3 rounded-xl text-[10px]">PAS</button><button onclick="window.setUang(10000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">10K</button><button onclick="window.setUang(20000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">20K</button><button onclick="window.setUang(50000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">50K</button><button onclick="window.setUang(100000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">100K</button><button onclick="window.setUang('clear')" class="bg-red-50 text-red-500 font-black py-3 rounded-xl text-[10px]"><i class="fa-solid fa-delete-left text-sm"></i></button></div><div class="flex justify-between items-center border-t border-gray-100 pt-4"><span class="text-xs font-black text-gray-700">Kembalian:</span><span id="pay-kembalian" class="text-2xl font-black text-green-500">Rp 0</span></div></div>
                </div>
                <div class="shrink-0 pt-2"><button onclick="window.finalisasiPembayaranKasir()" class="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-lg"><i class="fa-solid fa-print mr-2"></i> CETAK STRUK</button></div>
            </div>
        </div>`;
        
        const oldModal = document.getElementById('modal-payment-kasir'); if(oldModal) oldModal.remove();
        document.body.insertAdjacentHTML('beforeend', htmlPayment);
        
        const dd = document.getElementById('kasir-staf-dropdown');
        if (localStorage.getItem('isOwnerInKasir') === 'true') { dd.innerHTML = `<option value="Master Owner">Master Owner</option>`; } 
        else { const h = JSON.parse(localStorage.getItem('stafHadirMainstay')) || []; if(h.length === 0) dd.innerHTML = `<option value="Kasir">Kasir</option>`; h.forEach(n => dd.innerHTML += `<option value="${n}">${n}</option>`); }
        
        if (typeof window.closeCartModal === 'function') window.closeCartModal();
    } else { window.originalProsesCheckout(); }
};

window.pilihMetodeKasir = function(m) {
    document.getElementById('kasir-metode-terpilih').value = m;
    const bt = document.getElementById('btn-tunai'); const bq = document.getElementById('btn-qris');
    const u = document.getElementById('kasir-input-uang-area'); const q = document.getElementById('kasir-qris-container');
    if (m === 'QRIS') { bt.className = "bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2"; bq.className = "bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500 shadow-md"; u.classList.add('hidden'); q.classList.remove('hidden'); q.classList.add('flex'); window.setUang(window.tempTotalBayarKasir); } 
    else { bt.className = "bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500 shadow-md"; bq.className = "bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2"; u.classList.remove('hidden'); q.classList.add('hidden'); q.classList.remove('flex'); window.setUang('clear'); }
};

window.setUang = function(n) { const i = document.getElementById('pay-input'); if(n === 'clear') i.value = ''; else if(n === 0) i.value = window.tempTotalBayarKasir; else i.value = n; window.hitungKembalian(); };

window.hitungKembalian = function() {
    const sub = window.currentCart.reduce((s, i) => s + i.subtotal, 0);
    let dsk = parseInt(document.getElementById('kasir-input-diskon')?.value) || 0; if (dsk > sub) { dsk = sub; document.getElementById('kasir-input-diskon').value = dsk; }
    const tot = sub - dsk; window.tempTotalBayarKasir = tot; document.getElementById('pay-total').innerText = `Rp ${tot.toLocaleString('id-ID')}`;
    
    const inpStr = document.getElementById('pay-input').value; const u = inpStr === '' ? 0 : parseInt(inpStr);
    const k = u - tot; const el = document.getElementById('pay-kembalian');
    if (inpStr === '') { el.innerText = "MENUNGGU UANG"; el.className = "text-xl font-black text-amber-500 uppercase"; } 
    else if (k < 0) { el.innerText = "UANG KURANG!"; el.className = "text-2xl font-black text-red-500 uppercase"; } 
    else { el.innerText = `Rp ${k.toLocaleString('id-ID')}`; el.className = "text-2xl font-black text-green-500"; }
};

window.kirimKeSpreadsheet = function(data) {
    if (!window.URL_GOOGLE_APPS_SCRIPT) return;
    const fd = new URLSearchParams(); fd.append('waktu', data.waktu); fd.append('noStruk', data.noStruk); fd.append('kasir', data.kasir); fd.append('pelanggan', data.pelanggan); fd.append('item', data.item.map(i => `${i.nama} (x${i.qty})`).join(', ')); fd.append('metodePembayaran', data.metodePembayaran); fd.append('totalTagihan', data.totalTagihan); fd.append('uangDiterima', data.uangDiterima); fd.append('uangKembali', data.uangKembali); fd.append('diskon', data.diskon);
    fetch(window.URL_GOOGLE_APPS_SCRIPT, { method: 'POST', body: fd, mode: 'no-cors' }).catch(e => console.error(e));
};

window.cetakStrukThermal = function(data) {
    let itemHTML = ''; data.item.forEach(i => { itemHTML += `<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px; align-items:flex-start;"><span style="flex:1; padding-right:10px; word-break:break-word;">${i.nama} x${i.qty}</span><span style="font-weight:bold; white-space:nowrap;">${(i.harga * i.qty).toLocaleString('id-ID')}</span></div>`; });
    const tgl = new Date(data.waktu); const wl = `${tgl.getDate().toString().padStart(2, '0')}/${(tgl.getMonth()+1).toString().padStart(2, '0')}/${tgl.getFullYear()} ${tgl.getHours().toString().padStart(2, '0')}:${tgl.getMinutes().toString().padStart(2, '0')}`;
    const html = `<html><head><title>Struk</title><style>body{font-family:'Courier New',monospace;width:58mm;margin:0 auto;color:#000}h2{text-align:center;font-size:16px;margin-bottom:2px}p{text-align:center;font-size:10px;margin-top:0;margin-bottom:10px}.line{border-top:1px dashed #000;margin:10px 0}.bold{font-weight:bold}</style></head><body><h2>MAINSTAY DRINK</h2><p>Order: ${data.noStruk}<br>Oleh: ${data.kasir}<br>Plg: ${data.pelanggan}<br>${wl}</p><div class="line"></div>${itemHTML}<div class="line"></div><div style="display:flex; justify-content:space-between; font-size:12px;"><span>Subtotal:</span><span>${(data.totalTagihan + data.diskon).toLocaleString('id-ID')}</span></div><div style="display:flex; justify-content:space-between; font-size:12px; color:red;"><span>Diskon:</span><span>-${data.diskon.toLocaleString('id-ID')}</span></div><div style="display:flex; justify-content:space-between; font-size:14px; margin-top:5px;" class="bold"><span>TOTAL:</span><span>${data.totalTagihan.toLocaleString('id-ID')}</span></div><div style="display:flex; justify-content:space-between; font-size:12px; margin-top:5px;"><span>${data.metodePembayaran}:</span><span>${data.uangDiterima.toLocaleString('id-ID')}</span></div><div style="display:flex; justify-content:space-between; font-size:12px;"><span>Kembali:</span><span>${data.uangKembali.toLocaleString('id-ID')}</span></div><div class="line"></div><p>Terima Kasih!<br>Mainstay POS</p><script>window.onload=function(){window.print();window.close();}</script></body></html>`;
    const w = window.open('', '_blank', 'width=300,height=500'); if(w) { w.document.write(html); w.document.close(); }
};

window.finalisasiPembayaranKasir = async function() {
    if (window.isProcessingCheckout) return; window.isProcessingCheckout = true;
    const uStr = document.getElementById('pay-input').value; const u = uStr === '' ? 0 : parseInt(uStr);
    const k = u - window.tempTotalBayarKasir; const met = document.getElementById('kasir-metode-terpilih').value;
    if (k < 0 && met === 'Tunai') { window.isProcessingCheckout = false; return alert("Uang kurang!"); }

    let kurang = []; window.currentCart.forEach(c => { let idx = window.katalogMenu.findIndex(m => m.id === c.id); if(idx > -1 && window.katalogMenu[idx].stok < c.qty) kurang.push(`${c.nama} (Sisa: ${window.katalogMenu[idx].stok})`); });
    if (kurang.length > 0) { window.isProcessingCheckout = false; return alert(`CHECKOUT GAGAL! Stok habis:\n- ${kurang.join('\n- ')}`); }

    // Potong Stok
    window.currentCart.forEach(c => { let idx = window.katalogMenu.findIndex(m => m.id === c.id); if (idx > -1) window.katalogMenu[idx].stok = Math.max(0, window.katalogMenu[idx].stok - c.qty); });
    localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu)); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'katalog_menu'), window.katalogMenu);
    
    // Paket Data
    const dsk = parseInt(document.getElementById('kasir-input-diskon')?.value) || 0;
    const plg = document.getElementById('kasir-nama-pelanggan')?.value.trim();
    const data = { waktu: new Date().toISOString(), noStruk: `ORD-${Date.now().toString().slice(-4)}`, pelanggan: plg !== '' ? window.escapeHTML(plg) : "Walk-in", kasir: document.getElementById('kasir-staf-dropdown')?.value || 'Kasir', metodePembayaran: met, item: [...window.currentCart], diskon: dsk, totalTagihan: window.tempTotalBayarKasir, uangDiterima: u, uangKembali: k };
    
    // Simpan ke Firebase & Lokal
    if (window.db && window.fbPush && window.fbSet) { try { await window.fbSet(window.fbPush(window.fbRef(window.db, 'transaksi_hari_ini')), data); } catch (e) {} }
    window.riwayatTransaksiLokal.push(data); localStorage.setItem('mainstay_dbTransaksi', JSON.stringify(window.riwayatTransaksiLokal));
    
    // Eksekusi API & Cetak
    window.kirimKeSpreadsheet(data); window.cetakStrukThermal(data);
    
    // Bersihkan
    document.getElementById('modal-payment-kasir').remove(); window.currentCart = []; localStorage.removeItem('cartMainstay'); window.updateCartFloat();
    setTimeout(() => { window.isProcessingCheckout = false; }, 1000);
};
// ============================================================================
// KODE MASTER FINAL MAINSTAY POS - BAGIAN 3 (TERAKHIR)
// (PANEL OWNER: HRD, STOK, MENU, OMZET, & WEB CONFIG)
// ============================================================================

// ----------------------------------------------------------------------------
// 10. NAVIGASI PANEL OWNER & TOMBOL "KEMBALI"
// ----------------------------------------------------------------------------
window.openPanel = function(panelId) {
    document.querySelectorAll('.panel-owner-content').forEach(p => { p.classList.add('hidden'); p.classList.remove('flex'); });
    const target = document.getElementById(panelId);
    if(target) {
        target.classList.remove('hidden'); target.classList.add('flex');
        
        // Injeksi tombol kembali otomatis jika bukan di halaman depan Dasbor
        if (panelId !== 'panel-dashboard' && panelId !== 'panel-home' && !target.querySelector('.btn-kembali-dasbor')) {
            target.insertAdjacentHTML('afterbegin', `<button onclick="window.openPanel('panel-dashboard')" class="btn-kembali-dasbor mb-4 bg-white text-gray-700 px-4 py-2 rounded-xl text-xs font-black border border-gray-200 hover:bg-gray-100 transition flex items-center gap-2 w-max shadow-sm"><i class="fa-solid fa-arrow-left"></i> Kembali ke Menu Utama</button>`);
        }

        if (panelId === 'panel-hrd') window.renderPanelHRD();
        if (panelId === 'panel-stok') window.renderPanelStok();
        if (panelId === 'panel-katalog') {
            const btnKat = target.querySelector('button.bg-gray-800'); if(btnKat) { btnKat.innerHTML = '<i class="fa-solid fa-list-check mr-1"></i> Master Topping'; btnKat.onclick = () => window.bukaMasterTopping(); }
            const btnImp = Array.from(target.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('import'));
            if(btnImp) { if(!document.getElementById('file-import-menu')) target.insertAdjacentHTML('beforeend', `<input type="file" id="file-import-menu" class="hidden" accept=".csv" onchange="window.prosesImportCSV(event)">`); btnImp.onclick = () => document.getElementById('file-import-menu').click(); }
            const btnTam = target.querySelector('button.bg-amber-500'); if(btnTam) btnTam.onclick = () => window.bukaFormMenu('');
            window.renderAdminKatalog(target);
        }
    }
};

// ----------------------------------------------------------------------------
// 11. MANAJEMEN HRD (PROFIL, SHIFT TIME PICKER, FORCE LOGOUT)
// ----------------------------------------------------------------------------
window.renderPanelHRD = function() {
    const p = document.getElementById('panel-hrd'); if (!p) return; const c = p.querySelector('.space-y-5'); if (!c) return;
    const isOnline = (nama) => (JSON.parse(localStorage.getItem('stafHadirMainstay')) || []).includes(nama);
    
    let html = `<div class="bg-gray-900 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between mb-4"><div class="flex items-center gap-4"><div class="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-xl font-black overflow-hidden">${window.profilOwner.foto ? `<img src="${window.profilOwner.foto}" class="w-full h-full object-cover">` : window.profilOwner.nama.charAt(0)}</div><div><h3 class="font-black text-sm text-amber-400">Master Owner</h3><p class="text-[10px] font-bold text-gray-400">${window.profilOwner.nama}</p></div></div><button onclick="window.bukaFormOwner()" class="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-pen text-amber-400"></i> Edit</button></div>`;
    
    html += `<div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"><h3 class="text-xs font-black text-gray-900 uppercase">Database Karyawan</h3><div class="flex gap-2"><button onclick="window.bukaRiwayatAbsen()" class="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-indigo-200 transition">Log Absen</button><button onclick="window.bukaFormStaf()" class="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-teal-200 transition">Tambah Staf</button></div></div><div class="space-y-2">`;
    
    if(window.databaseStaf.length === 0) html += `<p class="text-xs text-center py-4 text-gray-400 font-bold">Belum ada staf.</p>`;
    window.databaseStaf.forEach((s, i) => {
        html += `<div class="flex justify-between items-center p-3 border rounded-xl bg-gray-50"><div class="flex items-center gap-3">${s.foto ? `<img src="${s.foto}" class="w-10 h-10 rounded-full object-cover border">` : `<div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-gray-500"><i class="fa-solid fa-user"></i></div>`}<div><span class="text-xs font-black text-gray-900 flex items-center">${s.nama} <span class="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded ml-1">${s.jobType||'Staf'}</span> ${isOnline(s.nama) ? '<span class="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>' : ''}</span><span class="text-gray-500 text-[10px] font-bold block mt-0.5">PIN: *** | Shift: ${s.shift||'-'}</span></div></div><div class="flex gap-1">${isOnline(s.nama) ? `<button onclick="window.paksaPulangStaf('${s.nama}')" class="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition" title="Paksa Pulang"><i class="fa-solid fa-person-walking-arrow-right"></i></button>` : ''}<button onclick="window.editStaf(${i})" class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button><button onclick="window.hapusStaf(${i})" class="w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button></div></div>`;
    });
    c.innerHTML = html + `</div></div>`;
};

window.bukaFormOwner = function() { document.getElementById('hrd-form-title').innerHTML = 'Edit Profil Owner'; document.getElementById('hrd-role').value = 'owner'; document.getElementById('hrd-area-gaji').classList.add('hidden'); document.getElementById('hrd-nama').value = window.profilOwner.nama; document.getElementById('hrd-pin').value = window.profilOwner.pin; document.getElementById('hrd-foto').value = window.profilOwner.foto || ''; const p = document.getElementById('hrd-preview-foto'); if(window.profilOwner.foto) { p.src = window.profilOwner.foto; p.classList.remove('hidden'); } else { p.classList.add('hidden'); } document.getElementById('modal-form-hrd').classList.replace('hidden', 'flex'); };
window.bukaFormStaf = function() { document.getElementById('hrd-form-title').innerHTML = 'Tambah Staf Baru'; document.getElementById('hrd-role').value = 'staf'; document.getElementById('hrd-id').value = ''; document.getElementById('hrd-area-gaji').classList.remove('hidden'); ['hrd-nama','hrd-pin','hrd-foto','hrd-shift-start','hrd-shift-end'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; }); document.getElementById('hrd-preview-foto').classList.add('hidden'); document.getElementById('modal-form-hrd').classList.replace('hidden', 'flex'); };
window.editStaf = function(i) { const s = window.databaseStaf[i]; document.getElementById('hrd-form-title').innerHTML = 'Edit Staf'; document.getElementById('hrd-role').value = 'staf'; document.getElementById('hrd-id').value = i; document.getElementById('hrd-area-gaji').classList.remove('hidden'); document.getElementById('hrd-nama').value = s.nama; document.getElementById('hrd-pin').value = s.pin; document.getElementById('hrd-foto').value = s.foto || ''; if (s.shift && s.shift.includes('-')) { const [st, en] = s.shift.split('-'); document.getElementById('hrd-shift-start').value = st.trim(); document.getElementById('hrd-shift-end').value = en.trim(); } const p = document.getElementById('hrd-preview-foto'); if(s.foto) { p.src = s.foto; p.classList.remove('hidden'); } else { p.classList.add('hidden'); } document.getElementById('modal-form-hrd').classList.replace('hidden', 'flex'); };
window.tutupFormHRD = function() { document.getElementById('modal-form-hrd').classList.replace('flex', 'hidden'); };

window.simpanDataHRD = function() {
    if (document.getElementById('hrd-role').value === 'owner') {
        window.profilOwner.nama = document.getElementById('hrd-nama').value; window.profilOwner.pin = document.getElementById('hrd-pin').value; window.profilOwner.foto = document.getElementById('hrd-foto').value; localStorage.setItem('mainstay_dbOwner', JSON.stringify(window.profilOwner));
    } else {
        const idIdx = document.getElementById('hrd-id').value; const st = document.getElementById('hrd-shift-start').value; const en = document.getElementById('hrd-shift-end').value; const sh = (st && en) ? `${st} - ${en}` : '';
        const d = { id: idIdx !== '' ? window.databaseStaf[idIdx].id : "S" + Date.now(), nama: document.getElementById('hrd-nama').value, pin: document.getElementById('hrd-pin').value, foto: document.getElementById('hrd-foto').value, jobType: document.getElementById('hrd-tipe-kerja')?.value || 'Tetap', shift: sh };
        if (idIdx !== '') window.databaseStaf[idIdx] = d; else window.databaseStaf.push(d);
        localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf));
        if (window.db && window.fbSet) { let fb = {}; window.databaseStaf.forEach(x => fb[x.id] = x); window.fbSet(window.fbRef(window.db, 'hrd_karyawan'), fb); }
    }
    window.tutupFormHRD(); window.renderPanelHRD(); alert("Data HRD disimpan!");
};

window.hapusStaf = function(i) { const s = window.databaseStaf[i]; if ((JSON.parse(localStorage.getItem('stafHadirMainstay')) || []).includes(s.nama)) return alert(`Gagal! ${s.nama} sedang aktif bekerja. Paksa pulang dulu.`); if(confirm(`Hapus ${s.nama}?`)) { window.databaseStaf.splice(i, 1); localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf)); if (window.db && window.fbSet) { let fb = {}; window.databaseStaf.forEach(x => fb[x.id] = x); window.fbSet(window.fbRef(window.db, 'hrd_karyawan'), fb); } window.renderPanelHRD(); } };
window.paksaPulangStaf = function(n) { if(confirm(`Paksa pulang ${n}?`)) { let h = JSON.parse(localStorage.getItem('stafHadirMainstay')) || []; h = h.filter(x => x !== n); localStorage.setItem('stafHadirMainstay', JSON.stringify(h)); if (h.length === 0) { document.getElementById('kasir-blocker')?.classList.remove('hidden'); window.statusStokTerkunci = true; if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: true }); } window.riwayatAbsensi.push({ id: 'ABS' + Date.now(), waktu: new Date().toISOString(), nama: n, tipe: 'Pulang (Force By Owner)', foto: '', durasi: '-' }); localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi)); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), window.riwayatAbsensi); window.renderPanelHRD(); } };

// ----------------------------------------------------------------------------
// 12. MANAJEMEN STOK INVENTARIS
// ----------------------------------------------------------------------------
window.updateTombolGembokOwner = function() { const b = document.getElementById('btn-toggle-kunci'); if(!b) return; if(window.statusStokTerkunci) { b.innerHTML = '<i class="fa-solid fa-lock text-red-500"></i> Izin Staf: TERKUNCI'; b.className = "ml-2 bg-red-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-black border border-red-200 shadow-sm flex items-center gap-2"; } else { b.innerHTML = '<i class="fa-solid fa-lock-open text-green-500"></i> Izin Staf: TERBUKA'; b.className = "ml-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black border border-slate-300 shadow-sm flex items-center gap-2"; } };
window.toggleKunciOwner = function() { window.statusStokTerkunci = !window.statusStokTerkunci; if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: window.statusStokTerkunci }); window.updateTombolGembokOwner(); };

window.renderPanelStok = function() {
    const p = document.getElementById('panel-stok'); if (!p) return;
    const ha = p.querySelector('.flex.justify-between.items-center'); if (ha && !document.getElementById('btn-toggle-kunci')) ha.insertAdjacentHTML('beforeend', `<button id="btn-toggle-kunci" onclick="window.toggleKunciOwner()" class="ml-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black border shadow-sm flex items-center gap-2"></button>`);
    window.updateTombolGembokOwner();
    
    const cu = p.querySelector('.flex-1') || p; const old = document.getElementById('admin-stok-list'); if(old) old.remove();
    let h = `<div id="admin-stok-list" class="space-y-3 mt-4">`;
    if (window.databaseStok.length === 0) h += `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Gudang kosong.</div>`;
    window.databaseStok.forEach(i => { const low = parseFloat(i.jumlah) <= 5; h += `<div class="${low?'bg-red-50 border-red-200':'bg-white border-gray-100'} p-4 rounded-2xl shadow-sm border flex items-center justify-between"><div class="flex items-center gap-4">${i.fotoBukti ? `<img src="${i.fotoBukti}" class="w-10 h-10 rounded-xl object-cover border">` : `<div class="w-10 h-10 rounded-xl bg-white border flex items-center justify-center"><i class="fa-solid fa-box ${low?'text-red-500':'text-indigo-500'}"></i></div>`}<div><h4 class="font-black text-sm text-gray-900">${i.nama} ${low?'<span class="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase">Menipis</span>':''}</h4><p class="text-[10px] font-bold text-gray-500">${i.kategori}</p></div></div><div class="flex items-center gap-4"><div class="text-right"><span class="block text-[10px] font-bold text-gray-400">SISA</span><span class="font-black text-lg ${low?'text-red-600':'text-indigo-600'}">${i.jumlah} <span class="text-xs">${i.satuan}</span></span></div><div class="flex flex-col gap-1 border-l pl-3"><button onclick="window.bukaFormStok('${i.id}')" class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-pen"></i></button><button onclick="window.hapusStok('${i.id}')" class="w-7 h-7 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-trash"></i></button></div></div></div>`; });
    cu.insertAdjacentHTML('beforeend', h + `</div>`);
};

window.renderStokStaf = function() {
    const c = document.getElementById('staf-stok-container'); const l = document.getElementById('status-gembok-staf'); if (!c) return;
    if (window.statusStokTerkunci) { l.innerText = "🔒 TERKUNCI (Tutup)"; l.classList.replace('text-indigo-200', 'text-amber-300'); } else { l.innerText = "🔓 TERBUKA"; l.classList.replace('text-amber-300', 'text-indigo-200'); }
    c.innerHTML = window.databaseStok.length === 0 ? '<p class="text-center text-xs text-gray-400 mt-4">Kosong.</p>' : '';
    window.databaseStok.forEach(i => { c.innerHTML += `<div class="bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between gap-3">${i.fotoBukti ? `<img src="${i.fotoBukti}" class="w-10 h-10 rounded-lg object-cover border shrink-0">` : `<div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-300 flex items-center justify-center shrink-0"><i class="fa-solid fa-camera"></i></div>`}<div class="flex-1"><h4 class="font-black text-sm text-gray-900">${i.nama}</h4><p class="text-[10px] font-bold text-gray-500">Tercatat: ${i.jumlah} ${i.satuan}</p></div><button onclick="window.bukaFormStok('${i.id}')" class="${window.statusStokTerkunci ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'} px-4 py-2 rounded-lg text-xs font-black transition">${window.statusStokTerkunci ? 'Terkunci' : 'Update'}</button></div>`; });
};

window.bukaFormStok = function(id) {
    const own = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true'; const isEdit = id !== ''; const item = isEdit ? window.databaseStok.find(b => b.id === id) : null;
    if (!own && window.statusStokTerkunci) { window.playAudio('error'); return alert("AKSES DITOLAK!\nOwner telah mengunci sistem stok."); }
    document.getElementById('stok-form-title').innerHTML = isEdit ? 'Update Stok' : 'Tambah Barang'; document.getElementById('stok-id').value = isEdit ? item.id : ''; document.getElementById('stok-nama').value = isEdit ? item.nama : ''; document.getElementById('stok-jumlah').value = isEdit ? item.jumlah : ''; document.getElementById('stok-satuan').value = isEdit ? item.satuan : '';
    document.getElementById('file-stok-bukti').value = ''; const p = document.getElementById('stok-preview-foto'); const c = document.getElementById('stok-icon-kamera');
    if (isEdit && item && item.fotoBukti) { document.getElementById('stok-foto').value = item.fotoBukti; p.src = item.fotoBukti; p.classList.remove('hidden'); c.classList.add('hidden'); } else { document.getElementById('stok-foto').value = ''; p.src = ''; p.classList.add('hidden'); c.classList.remove('hidden'); }
    if (!own && isEdit) { document.getElementById('stok-nama').readOnly = true; document.getElementById('stok-kategori').disabled = true; document.getElementById('stok-nama').classList.add('bg-gray-100'); } else { document.getElementById('stok-nama').readOnly = false; document.getElementById('stok-kategori').disabled = false; document.getElementById('stok-nama').classList.remove('bg-gray-100'); }
    document.getElementById('modal-form-stok').classList.replace('hidden', 'flex');
};
window.tutupFormStok = function() { document.getElementById('modal-form-stok').classList.replace('flex', 'hidden'); };

window.simpanDataStok = function() {
    const own = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    if (window.statusStokTerkunci && !own) { window.playAudio('error'); return alert("GAGAL MENYIMPAN!\nToko ditutup."); }
    const nm = document.getElementById('stok-nama').value.trim(); const jm = document.getElementById('stok-jumlah').value;
    if(nm === '' || jm === '') return alert("Nama & Jumlah wajib diisi!");
    const id = document.getElementById('stok-id').value; const d = { id: id !== '' ? id : 'INV' + Date.now(), nama: nm, kategori: document.getElementById('stok-kategori').value, jumlah: parseFloat(jm), satuan: document.getElementById('stok-satuan').value || 'Pcs', fotoBukti: document.getElementById('stok-foto').value };
    if (id !== '') window.databaseStok[window.databaseStok.findIndex(b => b.id === id)] = d; else window.databaseStok.push(d);
    localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok));
    if (window.db && window.fbSet) { let fb = {}; window.databaseStok.forEach(b => fb[b.id] = b); window.fbSet(window.fbRef(window.db, 'inventaris_stok'), fb); }
    window.tutupFormStok(); if (document.getElementById('panel-stok') && !document.getElementById('panel-stok').classList.contains('hidden')) window.renderPanelStok(); if (document.getElementById('modal-staf-list-stok') && !document.getElementById('modal-staf-list-stok').classList.contains('hidden')) window.renderStokStaf(); alert("Stok tersimpan.");
};
window.hapusStok = function(id) { const own = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true'; if (!own) return alert("Hanya Owner."); if(confirm("Hapus barang?")) { window.databaseStok = window.databaseStok.filter(b => b.id !== id); localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok)); if (window.db && window.fbSet) { let fb = {}; window.databaseStok.forEach(b => fb[b.id] = b); window.fbSet(window.fbRef(window.db, 'inventaris_stok'), fb); } window.renderPanelStok(); } };
window.bukaListStokStaf = function() { document.getElementById('modal-staf-list-stok').classList.replace('hidden', 'flex'); window.renderStokStaf(); }; window.tutupListStokStaf = function() { document.getElementById('modal-staf-list-stok').classList.replace('flex', 'hidden'); };

// ----------------------------------------------------------------------------
// 13. MANAJEMEN MENU & MASTER TOPPING (IMPORT CSV)
// ----------------------------------------------------------------------------
window.renderAdminKatalog = function(p) {
    let c = document.getElementById('admin-katalog-list'); if (!c) { (p.querySelector('.flex-1') || p).insertAdjacentHTML('beforeend', '<div id="admin-katalog-list" class="space-y-3 mt-4"></div>'); c = document.getElementById('admin-katalog-list'); }
    c.innerHTML = window.katalogMenu.length === 0 ? '<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Belum ada menu. Import CSV atau Tambah Manual.</div>' : '';
    window.katalogMenu.forEach(i => { const hb = i.stok === 0; c.innerHTML += `<div class="bg-white p-4 rounded-2xl shadow-sm border ${hb?'border-red-200 bg-red-50':'border-gray-100'} flex items-center justify-between"><div class="flex items-center gap-3"><div class="w-12 h-12 shrink-0">${i.image ? `<img src="${i.image}" class="w-full h-full rounded-lg object-cover border ${hb?'grayscale opacity-50':''}">` : `<div class="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border"><i class="fa-solid fa-image"></i></div>`}</div><div><h4 class="font-black text-sm ${hb?'text-gray-400':'text-gray-900'}">${i.nama} ${hb?'<span class="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded">HABIS</span>':''}</h4><p class="text-[10px] font-bold ${hb?'text-gray-400':'text-amber-500'}">Rp ${parseInt(i.harga).toLocaleString('id-ID')} | <span class="uppercase">${i.kategori}</span></p></div></div><div class="flex gap-2"><button onclick="window.toggleSoldOutMenu('${i.id}')" class="w-8 h-8 rounded-lg transition text-[10px] ${hb?'bg-red-500 text-white':'bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white'}"><i class="fa-solid fa-ban"></i></button><button onclick="window.bukaFormMenu('${i.id}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button><button onclick="window.hapusMenu('${i.id}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button></div></div>`; });
};

window.toggleSoldOutMenu = function(id) { const i = window.katalogMenu.findIndex(m => m.id === id); if (i > -1) { window.katalogMenu[i].stok = window.katalogMenu[i].stok === 0 ? 100 : 0; window.simpanMenuHanyaData(); } };
window.hapusMenu = function(id) { if(confirm("Hapus menu ini?")) { window.katalogMenu = window.katalogMenu.filter(m => m.id !== id); window.simpanMenuHanyaData(); } };
window.simpanMenuHanyaData = function() { localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu)); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'katalog_menu'), window.katalogMenu); const p = document.getElementById('panel-katalog'); if (p && !p.classList.contains('hidden')) window.renderAdminKatalog(p); if(typeof window.renderKatalog === 'function') window.renderKatalog(); if(typeof window.renderKategoriFilter === 'function') window.renderKategoriFilter(); };

window.bukaFormMenu = function(id) {
    const isE = id !== ''; const item = isE ? window.katalogMenu.find(m => m.id === id) : null;
    document.getElementById('form-menu-title').innerHTML = isE ? 'Edit Menu' : 'Tambah Menu'; document.getElementById('menu-id').value = isE ? item.id : ''; document.getElementById('menu-nama').value = isE ? item.nama : ''; document.getElementById('menu-kategori').value = isE ? item.kategori : ''; document.getElementById('menu-harga').value = isE ? item.harga : ''; document.getElementById('menu-foto').value = isE && item.image ? item.image : '';
    const tc = document.getElementById('container-topping-checkbox'); tc.innerHTML = '';
    if (window.masterTopping.length === 0) tc.innerHTML = '<p class="text-[10px] text-gray-400">Belum ada topping.</p>'; else window.masterTopping.forEach(t => { tc.innerHTML += `<label class="flex items-center gap-3 bg-white p-2 border rounded-lg"><input type="checkbox" class="master-top-cb w-4 h-4" value="${t.id}" ${isE && item.opsiTopping?.includes(t.id) ? 'checked' : ''}><span class="text-xs font-bold">${t.nama} (+Rp ${parseInt(t.harga).toLocaleString('id-ID')})</span></label>`; });
    document.getElementById('modal-form-menu').classList.replace('hidden', 'flex');
};
window.tutupFormMenu = function() { document.getElementById('modal-form-menu').classList.replace('flex', 'hidden'); };
window.simpanDataMenu = function() { const nm = document.getElementById('menu-nama').value.trim(); const hg = parseInt(document.getElementById('menu-harga').value) || 0; if (nm === '' || hg === 0) return alert("Nama/Harga salah!"); const id = document.getElementById('menu-id').value; const ops = Array.from(document.querySelectorAll('.master-top-cb:checked')).map(c => c.value); const dm = { id: id !== '' ? id : 'M' + Date.now(), nama: nm, kategori: document.getElementById('menu-kategori').value.toLowerCase().trim() || 'umum', harga: hg, image: document.getElementById('menu-foto').value, stok: id !== '' ? window.katalogMenu.find(m => m.id === id).stok : 100, opsiTopping: ops }; if (id !== '') window.katalogMenu[window.katalogMenu.findIndex(m => m.id === id)] = dm; else window.katalogMenu.push(dm); window.simpanMenuHanyaData(); window.tutupFormMenu(); alert("Menu disimpan!"); };

window.bukaMasterTopping = function() { document.getElementById('modal-master-topping').classList.replace('hidden', 'flex'); window.renderMasterTopping(); }; window.tutupMasterTopping = function() { document.getElementById('modal-master-topping').classList.replace('flex', 'hidden'); if(!document.getElementById('modal-form-menu').classList.contains('hidden')) window.bukaFormMenu(document.getElementById('menu-id').value); };
window.renderMasterTopping = function() { const l = document.getElementById('list-master-topping'); l.innerHTML = window.masterTopping.length === 0 ? '<div class="text-center py-6 text-gray-400 font-bold text-xs border-2 border-dashed rounded-xl">Kosong.</div>' : ''; window.masterTopping.forEach((t, i) => { l.innerHTML += `<div class="bg-white p-3 rounded-xl border flex justify-between items-center mb-2"><div><h4 class="text-xs font-black">${t.nama}</h4><p class="text-[10px] font-bold text-amber-500">+ Rp ${parseInt(t.harga).toLocaleString('id-ID')}</p></div><button onclick="window.hapusMasterTopping(${i})" class="w-7 h-7 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button></div>`; }); };
window.tambahMasterTopping = function() { const nm = document.getElementById('top-input-nama').value.trim(); const hg = document.getElementById('top-input-harga').value; if(!nm || !hg) return alert("Isi data!"); window.masterTopping.push({ id: 'T' + Date.now(), nama: nm, harga: parseInt(hg) }); document.getElementById('top-input-nama').value = ''; document.getElementById('top-input-harga').value = ''; window.simpanToppingHanyaData(); window.renderMasterTopping(); };
window.hapusMasterTopping = function(i) { if(confirm("Hapus topping?")) { window.masterTopping.splice(i, 1); window.simpanToppingHanyaData(); window.renderMasterTopping(); } };
window.simpanToppingHanyaData = function() { localStorage.setItem('mainstay_dbTopping', JSON.stringify(window.masterTopping)); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'master_topping'), window.masterTopping); };

window.prosesImportCSV = function(e) { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = function(ev) { const br = ev.target.result.split('\n'); let c = 0; for(let i = 1; i < br.length; i++) { if(br[i].trim() === '') continue; const k = br[i].split(','); if(k.length >= 3) { window.katalogMenu.push({ id: 'M' + Date.now() + i, nama: k[0].trim(), kategori: k[1].trim().toLowerCase(), harga: parseInt(k[2].trim()) || 0, image: k[3] ? k[3].trim() : '', stok: 100, opsiTopping: [] }); c++; } } window.simpanMenuHanyaData(); alert(`Berhasil Import ${c} Menu.`); e.target.value = ''; }; r.readAsText(f); };

// ----------------------------------------------------------------------------
// 14. RIWAYAT OMZET, ABSEN & SETTING WEB (SAVE)
// ----------------------------------------------------------------------------
window.bukaRiwayatTransaksi = function() {
    const l = document.getElementById('list-riwayat-transaksi'); l.innerHTML = '';
    const r = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    if (r.length === 0) l.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Belum ada transaksi.</div>`;
    else [...r].reverse().forEach((t, i) => { l.innerHTML += `<div class="bg-white p-4 rounded-xl border shadow-sm mb-2"><div class="flex justify-between items-start border-b pb-2"><div><span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-black">${t.noStruk}</span><span class="text-[9px] text-gray-400 ml-2 font-bold">${new Date(t.waktu).toLocaleTimeString('id-ID')}</span></div><span class="text-sm font-black text-gray-900">Rp ${t.totalTagihan.toLocaleString('id-ID')}</span></div><p class="text-xs font-bold text-gray-600 mt-2">${t.item.map(x => `${x.nama} (x${x.qty})`).join(', ')}</p><div class="flex justify-between items-center mt-2"><div class="text-[10px] font-bold text-gray-400 flex flex-col"><span>Oleh: ${t.kasir} | Plg: ${t.pelanggan}</span><span class="text-amber-500 uppercase">${t.metodePembayaran}</span></div><button onclick="window.cetakUlangStruk(${i})" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[9px] font-black border"><i class="fa-solid fa-print"></i> Cetak</button></div></div>`; });
    document.getElementById('modal-riwayat-transaksi').classList.replace('hidden', 'flex');
};
window.tutupRiwayatTransaksi = function() { document.getElementById('modal-riwayat-transaksi').classList.replace('flex', 'hidden'); };
window.cetakUlangStruk = function(ri) { const r = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || []; window.cetakStrukThermal([...r].reverse()[ri]); };

window.bukaRiwayatAbsen = function() {
    const l = document.getElementById('list-riwayat-absen'); l.innerHTML = '';
    if (window.riwayatAbsensi.length === 0) l.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Belum ada absen.</div>`;
    else [...window.riwayatAbsensi].reverse().forEach(lg => { const t = new Date(lg.waktu); l.innerHTML += `<div class="bg-white p-3 rounded-xl border flex gap-4 shadow-sm items-center mb-2">${lg.foto ? `<img src="${lg.foto}" class="w-12 h-12 rounded-xl object-cover border">` : `<div class="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400"><i class="fa-solid fa-user-slash"></i></div>`}<div class="flex-1"><h4 class="text-xs font-black text-gray-900">${lg.nama}</h4><p class="text-[9px] font-bold text-gray-400">${t.getDate()}/${t.getMonth()+1} - ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}</p>${lg.durasi && lg.durasi !== "-" ? `<span class="block mt-1 text-[9px] font-black text-indigo-500">Kerja: ${lg.durasi}</span>` : ''}</div><div class="shrink-0"><span class="${lg.tipe === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded text-[9px] font-black uppercase">${lg.tipe}</span></div></div>`; });
    document.getElementById('modal-riwayat-absen').classList.replace('hidden', 'flex');
};
window.tutupRiwayatAbsen = function() { document.getElementById('modal-riwayat-absen').classList.replace('flex', 'hidden'); };
window.bersihkanRiwayatAbsen = function() { if(confirm("Hapus semua riwayat absen?")) { window.riwayatAbsensi = []; localStorage.setItem('mainstay_dbAbsen', JSON.stringify([])); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), []); window.bukaRiwayatAbsen(); } };

document.addEventListener('DOMContentLoaded', () => {
    const pWeb = document.getElementById('panel-edit-web');
    if (pWeb) {
        const btnSave = pWeb.querySelector('button.bg-blue-600');
        if (btnSave) btnSave.onclick = function() {
            window.systemConfig.nomorWA = document.getElementById('setting-wa')?.value || ''; window.systemConfig.ig = document.getElementById('setting-ig')?.value || ''; window.systemConfig.tiktok = document.getElementById('setting-tiktok')?.value || '';
            window.systemConfig.logoUrl = document.getElementById('setting-logo')?.value || window.systemConfig.logoUrl; window.systemConfig.qrisUrl = document.getElementById('setting-qris')?.value || window.systemConfig.qrisUrl;
            let mRaw = document.getElementById('setting-maps')?.value || ''; if(mRaw.includes('src="')) mRaw = mRaw.split('src="')[1].split('"')[0]; window.systemConfig.maps = mRaw;
            
            if (document.getElementById('header-logo-img')) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl;
            if (document.getElementById('qris-img-display')) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl;
            if (document.getElementById('kasir-qris-img')) document.getElementById('kasir-qris-img').src = window.systemConfig.qrisUrl;
            
            localStorage.setItem('mainstay_dbConfig', JSON.stringify(window.systemConfig));
            if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'konfigurasi_web'), window.systemConfig);
            alert("Pengaturan Berhasil Disimpan & Live!");
        };
    }
});
// ============================================================================
// PATCH GABUNGAN FINAL: UX CUSTOMER, DUAL UPLOAD, & SISTEM 3 TAB DAPUR
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ------------------------------------------------------------------------
    // A. DUAL OPTION (UPLOAD FILE & PASTE LINK) PADA CONFIG & STOK
    // ------------------------------------------------------------------------
    const inputLogo = document.getElementById('setting-logo');
    if (inputLogo && !document.getElementById('file-logo')) inputLogo.insertAdjacentHTML('afterend', `<input type="file" id="file-logo" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-logo', 'header-logo-img')">`);
    
    const inputQris = document.getElementById('setting-qris');
    if (inputQris && !document.getElementById('file-qris')) inputQris.insertAdjacentHTML('afterend', `<input type="file" id="file-qris" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-qris', 'qris-img-display')">`);

    const stokHidden = document.getElementById('stok-foto');
    if (stokHidden && stokHidden.type === 'hidden') {
        stokHidden.type = 'text'; stokHidden.className = 'w-full bg-white border border-indigo-200 text-indigo-700 rounded-xl p-2.5 text-xs font-bold mb-2'; stokHidden.placeholder = 'Paste link URL / Upload foto di bawah...';
        const areaKamera = document.querySelector('.border-indigo-100.bg-indigo-50'); if(areaKamera) areaKamera.insertBefore(stokHidden, areaKamera.firstChild);
    }

    // ------------------------------------------------------------------------
    // B. INJEKSI MODAL SISTEM PESANAN 3 TAB (KONFIRMASI, DAPUR, REKAP)
    // ------------------------------------------------------------------------
    const htmlManajemenPesanan = `
    <div id="modal-manajemen-pesanan" class="fixed inset-0 bg-slate-50 z-[200] hidden flex-col">
        <div class="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md shrink-0">
            <h2 class="font-black text-lg"><i class="fa-solid fa-bell-concierge text-amber-400 mr-2"></i> MANAJEMEN PESANAN</h2>
            <button onclick="document.getElementById('modal-manajemen-pesanan').classList.replace('flex', 'hidden');" class="bg-gray-800 w-8 h-8 rounded-full text-white hover:bg-red-500 transition shadow-sm"><i class="fa-solid fa-arrow-left"></i></button>
        </div>
        
        <div class="flex bg-white border-b shadow-sm shrink-0">
            <button onclick="window.renderTabPesanan('pending')" id="tab-btn-pending" class="flex-1 py-3 text-xs font-black text-gray-500 border-b-4 border-transparent transition">KONFIRMASI <span id="badge-pending" class="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px] ml-1 hidden">0</span></button>
            <button onclick="window.renderTabPesanan('dimasak')" id="tab-btn-dimasak" class="flex-1 py-3 text-xs font-black text-gray-500 border-b-4 border-transparent transition">DAPUR <span id="badge-dimasak" class="bg-amber-500 text-white px-1.5 py-0.5 rounded-full text-[10px] ml-1 hidden">0</span></button>
            <button onclick="window.renderTabPesanan('selesai')" id="tab-btn-selesai" class="flex-1 py-3 text-xs font-black text-gray-500 border-b-4 border-transparent transition">REKAP / SELESAI</button>
        </div>
        
        <div id="container-list-pesanan" class="flex-1 overflow-y-auto p-4 bg-slate-100 space-y-3"></div>
    </div>`;
    
    if(!document.getElementById('modal-manajemen-pesanan')) document.body.insertAdjacentHTML('beforeend', htmlManajemenPesanan);

    // Tambahkan tombol Akses Dapur di layar utama Kasir
    setTimeout(() => {
        const viewKasir = document.getElementById('view-kasir');
        if (viewKasir && !document.getElementById('btn-akses-dapur')) {
            viewKasir.insertAdjacentHTML('beforeend', `<button id="btn-akses-dapur" onclick="window.bukaManajemenPesanan()" class="absolute bottom-24 right-4 bg-teal-500 text-white w-14 h-14 rounded-full shadow-[0_5px_15px_rgba(20,184,166,0.5)] flex flex-col items-center justify-center hover:bg-teal-600 transition z-[45]"><i class="fa-solid fa-bell-concierge text-2xl"></i><span class="text-[8px] font-black">DAPUR</span></button>`);
        }
    }, 500);
});

// ------------------------------------------------------------------------
// C. LOGIKA RENDER KATALOG CUSTOMER (DENGAN TOMBOL PLUS INSTAN)
// ------------------------------------------------------------------------
window.renderKatalog = function() {
    const container = document.getElementById('menu-container') || document.querySelector('.menu-grid') || document.getElementById('katalog-list');
    if(!container) return;
    
    let filteredMenu = window.kategoriAktif && window.kategoriAktif !== 'all' ? window.katalogMenu.filter(m => m.kategori && m.kategori.toLowerCase() === window.kategoriAktif) : window.katalogMenu;
    container.innerHTML = filteredMenu.length === 0 ? '<div class="col-span-full text-center py-10"><p class="text-gray-400 font-bold text-xs">Menu tidak ditemukan.</p></div>' : '';

    filteredMenu.forEach(item => {
        const isHabis = item.stok === 0;
        const topBadge = (item.opsiTopping && item.opsiTopping.length > 0) ? '<span class="absolute top-2 left-2 bg-amber-500 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-md z-10">TOPPING</span>' : '';
        const stokBadge = isHabis ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-md uppercase z-10">Habis</span>' : '';

        // Desain baru untuk Customer: Klik area gambar buka detail, klik tombol + langsung masuk keranjang
        container.innerHTML += `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group transition hover:border-amber-300">
            ${topBadge}${stokBadge}
            <div onclick="window.openMenuDetail('${item.id}')" class="h-32 w-full bg-slate-100 relative overflow-hidden cursor-pointer">
                ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover ${isHabis ? 'grayscale opacity-50' : 'group-hover:scale-105 transition'}">` : `<div class="w-full h-full flex items-center justify-center text-gray-300"><i class="fa-solid fa-image text-3xl"></i></div>`}
            </div>
            <div class="p-3">
                <h3 onclick="window.openMenuDetail('${item.id}')" class="font-black text-sm text-gray-900 line-clamp-1 cursor-pointer ${isHabis ? 'text-gray-400' : ''}">${item.nama}</h3>
                <div class="flex justify-between items-end mt-2">
                    <span class="text-xs font-black ${isHabis ? 'text-gray-400' : 'text-amber-500'}">Rp ${parseInt(item.harga).toLocaleString('id-ID')}</span>
                    ${!isHabis ? `<button onclick="window.tambahCepatKeKeranjang(event, '${item.id}')" class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition shadow-sm z-20"><i class="fa-solid fa-plus text-sm"></i></button>` : ''}
                </div>
            </div>
        </div>`;
    });
};

// ------------------------------------------------------------------------
// D. LOGIKA 3 TAB MANAJEMEN PESANAN & STATUS DAPUR
// ------------------------------------------------------------------------
window.bukaManajemenPesanan = function() {
    document.getElementById('modal-manajemen-pesanan').classList.replace('hidden', 'flex');
    window.renderTabPesanan('pending'); // Buka tab Konfirmasi secara default
};

window.renderTabPesanan = function(statusTab) {
    // Reset warna tab aktif
    ['pending', 'dimasak', 'selesai'].forEach(tab => {
        const btn = document.getElementById(`tab-btn-${tab}`);
        if(btn) { btn.classList.remove('border-amber-500', 'text-gray-900'); btn.classList.add('border-transparent', 'text-gray-500'); }
    });
    const btnAktif = document.getElementById(`tab-btn-${statusTab}`);
    if(btnAktif) { btnAktif.classList.remove('border-transparent', 'text-gray-500'); btnAktif.classList.add('border-amber-500', 'text-gray-900'); }

    const container = document.getElementById('container-list-pesanan');
    container.innerHTML = '';
    
    let riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    
    // Perbaikan kompatibilitas: Beri status 'selesai' untuk transaksi lama yang tidak punya status
    riwayat = riwayat.map(tr => { if(!tr.statusDapur) tr.statusDapur = 'selesai'; return tr; });
    localStorage.setItem('mainstay_dbTransaksi', JSON.stringify(riwayat));

    let filtered = riwayat.filter(tr => tr.statusDapur === statusTab).reverse();

    // Update Angka Notifikasi Merah/Kuning
    const cPending = riwayat.filter(tr => tr.statusDapur === 'pending').length;
    const cDimasak = riwayat.filter(tr => tr.statusDapur === 'dimasak').length;
    const bdgP = document.getElementById('badge-pending'); if(bdgP) { bdgP.innerText = cPending; cPending > 0 ? bdgP.classList.remove('hidden') : bdgP.classList.add('hidden'); }
    const bdgD = document.getElementById('badge-dimasak'); if(bdgD) { bdgD.innerText = cDimasak; cDimasak > 0 ? bdgD.classList.remove('hidden') : bdgD.classList.add('hidden'); }

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-20"><i class="fa-solid fa-mug-hot text-4xl text-gray-300 mb-3"></i><p class="text-xs font-bold text-gray-400">Tidak ada pesanan di tahap ini.</p></div>`;
        return;
    }

    filtered.forEach(tr => {
        let btnHTML = '';
        const plgWA = tr.pelangganWA || ''; // Asumsi kita menyimpan WA pelanggan jika QRIS

        // TAB 1: KONFIRMASI (PENDING)
        if (statusTab === 'pending') {
            btnHTML = `<button onclick="window.ubahStatusPesanan('${tr.noStruk}', 'dimasak')" class="w-full bg-blue-500 text-white font-black py-2.5 rounded-xl shadow-sm hover:bg-blue-600 transition mb-2">TERIMA & MASAK</button>`;
            if (tr.metodePembayaran === 'QRIS' || plgWA) {
                btnHTML += `<a href="https://wa.me/${plgWA}" target="_blank" class="w-full flex items-center justify-center bg-green-100 text-green-700 font-black py-2 rounded-xl border border-green-200 hover:bg-green-200 transition text-xs"><i class="fa-brands fa-whatsapp mr-1"></i> Hubungi WA Customer</a>`;
            } else if (tr.metodePembayaran === 'Tunai') {
                btnHTML += `<div class="w-full text-center bg-amber-50 text-amber-600 font-black py-2 rounded-xl text-xs border border-amber-200"><i class="fa-solid fa-money-bill"></i> Tagih Cash di Kasir</div>`;
            }
        } 
        // TAB 2: DAPUR (DIMASAK)
        else if (statusTab === 'dimasak') {
            btnHTML = `<button onclick="window.ubahStatusPesanan('${tr.noStruk}', 'selesai')" class="w-full bg-teal-500 text-white font-black py-3 rounded-xl shadow-sm hover:bg-teal-600 transition text-lg"><i class="fa-solid fa-check-double mr-2"></i> SELESAI MASAK</button>`;
        } 
        // TAB 3: REKAP (SELESAI)
        else if (statusTab === 'selesai') {
            btnHTML = `<div class="flex gap-2"><button onclick="window.cetakUlangStrukByNo('${tr.noStruk}')" class="flex-1 bg-gray-100 text-gray-700 font-black py-2 rounded-xl border hover:bg-gray-200 transition text-xs"><i class="fa-solid fa-print mr-1"></i> Cetak Fisik</button><button onclick="window.cetakStrukDigital('${tr.noStruk}')" class="flex-1 bg-green-500 text-white font-black py-2 rounded-xl shadow-sm hover:bg-green-600 transition text-xs"><i class="fa-brands fa-whatsapp mr-1"></i> Kirim Struk Digital</button></div>`;
        }

        // Tampilan Kartu Pesanan
        container.innerHTML += `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div class="flex justify-between items-center border-b pb-2 mb-3">
                <div>
                    <h4 class="font-black text-sm text-gray-900">${tr.pelanggan || 'Walk-in'}</h4>
                    <span class="text-[9px] text-gray-400 font-bold">Struk: ${tr.noStruk} | ${new Date(tr.waktu).toLocaleTimeString('id-ID')}</span>
                </div>
                <div class="text-right">
                    <span class="block text-xs font-black text-amber-500 uppercase">${tr.metodePembayaran}</span>
                    <span class="text-sm font-black text-gray-900">Rp ${tr.totalTagihan.toLocaleString('id-ID')}</span>
                </div>
            </div>
            <ul class="text-xs font-bold text-gray-700 space-y-1 mb-4">
                ${tr.item.map(i => `<li class="flex justify-between"><span class="flex-1 pr-2">${i.nama}</span><span>x${i.qty}</span></li>`).join('')}
            </ul>
            ${btnHTML}
        </div>`;
    });
};

window.ubahStatusPesanan = function(noStruk, statusBaru) {
    let riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    let idx = riwayat.findIndex(tr => tr.noStruk === noStruk);
    if(idx > -1) {
        riwayat[idx].statusDapur = statusBaru;
        localStorage.setItem('mainstay_dbTransaksi', JSON.stringify(riwayat));
        
        // Update ke Firebase jika online
        if (window.db && window.fbSet) {
            // Kita butuh ID firebase aslinya jika ingin update presisi, 
            // Namun untuk amannya kita push riwayat utuh atau update via backend.
            // Sebagai solusi offline-first, lokal diutamakan.
        }
        
        // Render ulang tab sebelumnya (agar hilang dari layar itu)
        window.renderTabPesanan(statusBaru === 'dimasak' ? 'pending' : 'dimasak');
        if(typeof window.playAudio === 'function') window.playAudio('masuk');
    }
};

window.cetakUlangStrukByNo = function(noStruk) {
    let riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    let tr = riwayat.find(t => t.noStruk === noStruk);
    if(tr && typeof window.cetakStrukThermal === 'function') window.cetakStrukThermal(tr);
};

// Fitur Struk Digital (Generate Teks Rapi untuk dikirim via WhatsApp)
window.cetakStrukDigital = function(noStruk) {
    let riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    let data = riwayat.find(t => t.noStruk === noStruk);
    if(!data) return;

    let tgl = new Date(data.waktu).toLocaleString('id-ID');
    let strItem = data.item.map(i => `▪️ ${i.nama} (x${i.qty}) = Rp ${(i.harga * i.qty).toLocaleString('id-ID')}`).join('%0A');
    
    let templateWA = `*STRUK DIGITAL MAINSTAY DRINK*%0A%0A` +
        `No: ${data.noStruk}%0A` +
        `Waktu: ${tgl}%0A` +
        `Kasir: ${data.kasir}%0A` +
        `Pelanggan: ${data.pelanggan}%0A%0A` +
        `*Pesanan:*%0A${strItem}%0A%0A` +
        `Subtotal: Rp ${(data.totalTagihan + data.diskon).toLocaleString('id-ID')}%0A` +
        `Diskon: -Rp ${data.diskon.toLocaleString('id-ID')}%0A` +
        `*TOTAL: Rp ${data.totalTagihan.toLocaleString('id-ID')}*%0A` +
        `Status: ${data.metodePembayaran.toUpperCase()} (LUNAS)%0A%0A` +
        `_Terima kasih telah berbelanja di Mainstay!_`;

    // Lempar ke WhatsApp Web/App (Tinggal pilih kontak)
    window.open(`https://api.whatsapp.com/send?text=${templateWA}`, '_blank');
};

// ------------------------------------------------------------------------
// E. MODIFIKASI FINALISASI CHECKOUT AGAR MASUK KE TAB 'PENDING'
// ------------------------------------------------------------------------
const checkoutLamaTanpaStatus = window.finalisasiPembayaranKasir;
window.finalisasiPembayaranKasir = async function() {
    // Memastikan status pesanan yang baru masuk kasir statusnya adalah "pending" (Tab 1 Konfirmasi)
    // agar bisa di-proses di Dapur.
    window.statusDapurPaksa = 'pending'; 
    if(typeof checkoutLamaTanpaStatus === 'function') await checkoutLamaTanpaStatus();
};
// ============================================================================
// PATCH BARU: STATISTIK REAL-TIME (OMZET & ORDER) UNTUK OWNER & KASIR
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. INJEKSI KOTAK STATISTIK DI HALAMAN DEPAN OWNER
    const panelDashboardOwner = document.getElementById('panel-dashboard');
    if (panelDashboardOwner && !document.getElementById('owner-stats-container')) {
        // Suntikkan di atas 8 kotak menu owner
        panelDashboardOwner.insertAdjacentHTML('afterbegin', `
            <div id="owner-stats-container" class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 w-full max-w-4xl mx-auto">
                <div class="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider opacity-80">Pendapatan Hari Ini</span>
                        <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><i class="fa-solid fa-rupiah-sign text-xs"></i></div>
                    </div>
                    <h3 id="stat-omzet-owner" class="text-2xl font-black">Rp 0</h3>
                </div>
                <div class="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider opacity-80">Order Selesai</span>
                        <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><i class="fa-solid fa-check-double text-xs"></i></div>
                    </div>
                    <h3 id="stat-selesai-owner" class="text-2xl font-black">0 <span class="text-xs font-normal">Pesanan</span></h3>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-2xl shadow-lg text-white flex flex-col justify-between">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider opacity-80">Sedang Diproses</span>
                        <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"><i class="fa-solid fa-fire-burner text-xs"></i></div>
                    </div>
                    <h3 id="stat-proses-owner" class="text-2xl font-black">0 <span class="text-xs font-normal">Pesanan</span></h3>
                </div>
            </div>
        `);
    }

    // 2. INJEKSI KOTAK STATISTIK DI HALAMAN DEPAN KASIR (View Kasir)
    const viewKasir = document.getElementById('view-kasir');
    if (viewKasir && !document.getElementById('kasir-stats-container')) {
        // Suntikkan di bawah tombol Buka Kasir / Akses Dapur
        viewKasir.insertAdjacentHTML('beforeend', `
            <div id="kasir-stats-container" class="grid grid-cols-3 gap-2 mt-8 w-full max-w-sm mx-auto px-4 absolute bottom-8 left-0 right-0 z-10">
                <div class="bg-white border border-green-200 p-3 rounded-2xl shadow-sm text-center">
                    <i class="fa-solid fa-sack-dollar text-green-500 text-lg mb-1"></i>
                    <p class="text-[8px] font-black text-gray-400 uppercase">Omzet Shift</p>
                    <h4 id="stat-omzet-kasir" class="text-xs font-black text-green-600 line-clamp-1">Rp 0</h4>
                </div>
                <div class="bg-white border border-teal-200 p-3 rounded-2xl shadow-sm text-center">
                    <i class="fa-solid fa-check-double text-teal-500 text-lg mb-1"></i>
                    <p class="text-[8px] font-black text-gray-400 uppercase">Selesai</p>
                    <h4 id="stat-selesai-kasir" class="text-xs font-black text-teal-600">0</h4>
                </div>
                <div class="bg-white border border-amber-200 p-3 rounded-2xl shadow-sm text-center">
                    <i class="fa-solid fa-bell-concierge text-amber-500 text-lg mb-1 animate-bounce"></i>
                    <p class="text-[8px] font-black text-gray-400 uppercase">Antrean</p>
                    <h4 id="stat-proses-kasir" class="text-xs font-black text-amber-600">0</h4>
                </div>
            </div>
        `);
    }

    // Panggil fungsi perhitungan saat aplikasi pertama kali dimuat
    setTimeout(window.updateStatistikRealtime, 1500);
});

// 3. FUNGSI PERHITUNGAN MATEMATIS REAL-TIME (Murni dari Database)
window.updateStatistikRealtime = function() {
    // Ambil data asli dari memori lokal (tersinkron Firebase)
    const riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    
    let totalPendapatan = 0;
    let orderSelesai = 0;
    let orderDiproses = 0; // Termasuk status 'pending' (konfirmasi) dan 'dimasak' (dapur)

    // Hitung berdasarkan data hari ini saja (opsional jika riwayat tidak pernah dihapus)
    const tanggalHariIni = new Date().toLocaleDateString('id-ID');

    riwayat.forEach(tr => {
        // Validasi: pastikan format statusDapur aman
        if (!tr.statusDapur) tr.statusDapur = 'selesai'; 

        // Hanya hitung transaksi di tanggal yang sama dengan hari ini
        const tanggalTrx = new Date(tr.waktu).toLocaleDateString('id-ID');
        if (tanggalTrx === tanggalHariIni) {
            
            // Kalkulasi Pendapatan (Hanya hitung yang lunas/uang diterima, bisa disesuaikan)
            // Di sistem kita, kalau struk tercetak berarti uang sudah lunas
            totalPendapatan += parseInt(tr.totalTagihan);

            // Klasifikasi Status Dapur
            if (tr.statusDapur === 'selesai') {
                orderSelesai += 1;
            } else if (tr.statusDapur === 'pending' || tr.statusDapur === 'dimasak') {
                orderDiproses += 1;
            }
        }
    });

    // Tembakkan angka hasil perhitungan ke elemen UI Owner
    const oOmzet = document.getElementById('stat-omzet-owner');
    const oSelesai = document.getElementById('stat-selesai-owner');
    const oProses = document.getElementById('stat-proses-owner');
    
    if (oOmzet) oOmzet.innerText = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
    if (oSelesai) oSelesai.innerHTML = `${orderSelesai} <span class="text-xs font-normal">Pesanan</span>`;
    if (oProses) oProses.innerHTML = `${orderDiproses} <span class="text-xs font-normal">Pesanan</span>`;

    // Tembakkan angka hasil perhitungan ke elemen UI Kasir
    const kOmzet = document.getElementById('stat-omzet-kasir');
    const kSelesai = document.getElementById('stat-selesai-kasir');
    const kProses = document.getElementById('stat-proses-kasir');

    if (kOmzet) kOmzet.innerText = `Rp ${(totalPendapatan > 999999 ? (totalPendapatan/1000000).toFixed(1) + 'M' : totalPendapatan.toLocaleString('id-ID'))}`;
    if (kSelesai) kSelesai.innerText = orderSelesai;
    if (kProses) kProses.innerText = orderDiproses;
};

// 4. MEMASANG SENSOR AGAR ANGKA BERUBAH OTOMATIS SAAT ADA TRANSAKSI BARU
// Timpa fungsi asli agar mengeksekusi updateStatistikRealtime setelah checkout/ubah status
const originalFinalisasiKasirUntukStatistik = window.finalisasiPembayaranKasir;
window.finalisasiPembayaranKasir = async function() {
    if(typeof originalFinalisasiKasirUntukStatistik === 'function') await originalFinalisasiKasirUntukStatistik();
    window.updateStatistikRealtime(); // Hitung ulang omzet seketika setelah bayar!
};

const originalUbahStatusPesananUntukStatistik = window.ubahStatusPesanan;
window.ubahStatusPesanan = function(noStruk, statusBaru) {
    if(typeof originalUbahStatusPesananUntukStatistik === 'function') originalUbahStatusPesananUntukStatistik(noStruk, statusBaru);
    window.updateStatistikRealtime(); // Hitung ulang status antrean seketika saat dapur dipencet!
};

// Pasang interval otomatis agar kasir tidak perlu refresh untuk melihat pesanan masuk via QRIS online
setInterval(window.updateStatistikRealtime, 30000); // Sinkronisasi angka setiap 30 detik
