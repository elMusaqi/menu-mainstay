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
}
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 1: CORE STATE & CLOUD SYNC)
// ============================================================================

// 1. Deklarasi Variabel Global
window.databaseStaf = window.dbStaf || [];
window.profilOwner = { nama: "Master Owner", wa: "", rekening: "", pin: window.systemConfig ? window.systemConfig.pinOwner : "888888", foto: "" };
window.masterTopping = [{ id: 'T01', nama: 'Boba Premium', harga: 3000 }, { id: 'T02', nama: 'Cheese Foam', harga: 4000 }];
window.databaseStok = [];
window.riwayatAbsensi = [];
window.riwayatTransaksiLokal = [];
window.statusStokTerkunci = false;
window.tanggalSistemSekarang = new Date().toLocaleDateString('id-ID');
window.cameraStream = null;
window.tempCompressedImage = null;
window.tempTotalBayarKasir = 0;
window.currentDiscountValue = 0;
window.tempNamaPelangganKasir = "Walk-in";
window.tempSelectedToppings = [];
window.isKasirMode = false;
window.isProcessingCheckout = false;

// 2. Tarik Data dari Brankas Lokal saat Web Dibuka (Anti-Mati Lampu)
document.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('mainstay_dbStaf')) window.databaseStaf = JSON.parse(localStorage.getItem('mainstay_dbStaf'));
    if(localStorage.getItem('mainstay_dbOwner')) window.profilOwner = JSON.parse(localStorage.getItem('mainstay_dbOwner'));
    if(localStorage.getItem('mainstay_dbTopping')) window.masterTopping = JSON.parse(localStorage.getItem('mainstay_dbTopping'));
    if(localStorage.getItem('mainstay_dbStok')) window.databaseStok = JSON.parse(localStorage.getItem('mainstay_dbStok'));
    if(localStorage.getItem('mainstay_dbAbsen')) window.riwayatAbsensi = JSON.parse(localStorage.getItem('mainstay_dbAbsen'));
    if(localStorage.getItem('mainstay_dbTransaksi')) window.riwayatTransaksiLokal = JSON.parse(localStorage.getItem('mainstay_dbTransaksi'));
    if(localStorage.getItem('mainstay_dbMenu')) window.katalogMenu = JSON.parse(localStorage.getItem('mainstay_dbMenu'));
    if(localStorage.getItem('mainstay_dbConfig')) window.systemConfig = Object.assign(window.systemConfig || {}, JSON.parse(localStorage.getItem('mainstay_dbConfig')));
});

// 3. Listener Firebase Live Sync (Menyambungkan Banyak Device Sekaligus)
document.addEventListener('DOMContentLoaded', () => {
    if (window.db && window.fbOnValue) {
        window.fbOnValue(window.fbRef(window.db, 'katalog_menu'), (snap) => {
            if (snap.exists()) { window.katalogMenu = Object.values(snap.val()); localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu)); if(typeof window.renderKatalog === 'function') window.renderKatalog(); if(typeof window.renderKategoriFilter === 'function') window.renderKategoriFilter(); }
        });
        window.fbOnValue(window.fbRef(window.db, 'master_topping'), (snap) => {
            if (snap.exists()) { window.masterTopping = snap.val() || []; localStorage.setItem('mainstay_dbTopping', JSON.stringify(window.masterTopping)); }
        });
        window.fbOnValue(window.fbRef(window.db, 'inventaris_stok'), (snap) => {
            if (snap.exists()) { window.databaseStok = Object.values(snap.val()); localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok)); if(typeof window.renderPanelStok === 'function') window.renderPanelStok(); if(typeof window.renderStokStaf === 'function') window.renderStokStaf(); }
        });
        window.fbOnValue(window.fbRef(window.db, 'hrd_karyawan'), (snap) => {
            if (snap.exists()) { window.databaseStaf = Object.values(snap.val()); localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf)); if(typeof window.renderPanelHRD === 'function') window.renderPanelHRD(); }
        });
        window.fbOnValue(window.fbRef(window.db, 'riwayat_absen'), (snap) => {
            if (snap.exists()) { window.riwayatAbsensi = snap.val() || []; localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi)); }
        });
        window.fbOnValue(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), (snap) => {
            if (snap.exists()) { 
                const dataKunci = snap.val(); 
                if (dataKunci.tanggal === window.tanggalSistemSekarang) window.statusStokTerkunci = dataKunci.isLocked; 
                else { window.statusStokTerkunci = false; window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: false }); }
                if(typeof window.updateTombolGembokOwner === 'function') window.updateTombolGembokOwner();
            }
        });
        window.fbOnValue(window.fbRef(window.db, 'konfigurasi_web'), (snap) => {
            if (snap.exists()) { 
                window.systemConfig = snap.val(); localStorage.setItem('mainstay_dbConfig', JSON.stringify(window.systemConfig));
                if (document.getElementById('header-logo-img') && window.systemConfig.logoUrl) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl;
                if (document.getElementById('qris-img-display') && window.systemConfig.qrisUrl) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl;
            }
        });
    }
});
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 2: UTILITIES & SECURITY)
// ============================================================================

// 1. Anti-Hacker (Mencegah pelanggan/staf menyuntikkan virus ke dalam nama)
window.escapeHTML = function(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
};

// 2. Fungsi Upload Dual Mode (Bisa file dari galeri, bisa URL)
window.prosesUploadGambar = function(event, targetInputId, previewImgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result;
            const inputEl = document.getElementById(targetInputId);
            if (inputEl) {
                inputEl.value = base64Data; 
                // Pancing event 'input' agar preview URL mendeteksi perubahan
                const eventInput = new Event('input', { bubbles: true });
                inputEl.dispatchEvent(eventInput);
            }
            if (previewImgId && document.getElementById(previewImgId)) {
                document.getElementById(previewImgId).src = base64Data;
                document.getElementById(previewImgId).classList.remove('hidden');
                if(document.getElementById(previewImgId).nextElementSibling) {
                    document.getElementById(previewImgId).nextElementSibling.classList.add('hidden');
                }
            }
        };
        reader.readAsDataURL(file);
    }
};

// 3. Listener Preview Gambar Jika Owner Mengetik URL Manual (Bukan File)
document.addEventListener('DOMContentLoaded', () => {
    const inputUrlMenu = document.getElementById('menu-foto');
    if (inputUrlMenu) {
        inputUrlMenu.addEventListener('input', function() {
            const url = this.value;
            const fileInput = this.nextElementSibling;
            if (fileInput && fileInput.type === 'file') {
                let previewContainer = document.getElementById('menu-preview-container');
                if (!previewContainer) {
                    this.insertAdjacentHTML('beforebegin', `
                        <div id="menu-preview-container" class="w-full h-32 mb-2 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center hidden">
                            <img id="menu-preview-img-url" src="" class="w-full h-full object-cover">
                        </div>
                    `);
                    previewContainer = document.getElementById('menu-preview-container');
                }
                const previewImg = document.getElementById('menu-preview-img-url');
                if (url.trim() !== '') {
                    previewImg.src = url;
                    previewContainer.classList.remove('hidden');
                } else {
                    previewContainer.classList.add('hidden');
                }
            }
        });
    }
});
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 3: LOGIN & ABSENSI KAMERA)
// ============================================================================

// 1. Pencegahan Kebocoran Sesi Owner Saat Tab Ditutup
window.addEventListener('beforeunload', () => {
    if (localStorage.getItem('isOwnerInKasir') === 'true') {
        localStorage.removeItem('isOwnerInKasir');
    }
});

// 2. Fungsi Login Mutlak
window.prosesLogin = function() {
    const pin = document.getElementById('login-pin')?.value;
    const errorEl = document.getElementById('login-error');
    if (!pin) return;

    if (window.targetLoginRole === 'kasir') {
        const staf = window.databaseStaf.find(s => s.pin === pin);
        
        // Cek Master Owner Login ke Kasir
        if (pin === window.profilOwner.pin) {
            localStorage.setItem('isOwnerInKasir', 'true');
            document.getElementById('kasir-blocker')?.classList.add('hidden');
            window.closeLoginModal();
            window.switchRoleView('kasir');
            window.isKasirMode = true; 
        } 
        // Cek Staf Login ke Kasir
        else if (staf) {
            localStorage.setItem('isOwnerInKasir', 'false');
            window.closeLoginModal();
            window.switchRoleView('kasir');
            window.isKasirMode = true; 
            
            let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
            if (stafHadir.length > 0) document.getElementById('kasir-blocker')?.classList.add('hidden');
            else document.getElementById('kasir-blocker')?.classList.remove('hidden');
        } else {
            if(errorEl) errorEl.classList.remove('hidden');
        }
    } else if (window.targetLoginRole === 'owner') {
        // Master Owner Login ke Dasbor Utama
        if (pin === window.profilOwner.pin) {
            window.closeLoginModal();
            window.switchRoleView('owner');
        } else {
            if(errorEl) errorEl.classList.remove('hidden');
        }
    }
};

window.prosesLogout = function(role) {
    if (role === 'kasir') {
        localStorage.removeItem('isOwnerInKasir');
        window.isKasirMode = false;
        
        // Hapus keranjang nyangkut saat logout
        window.currentCart = [];
        localStorage.removeItem('cartMainstay');
        if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
        
        window.switchRoleView('customer');
    } else if (role === 'owner') {
        window.switchRoleView('customer');
    }
};

// 3. Modul Kamera & Jepret Memori Kecil (Kompresi)
window.openAbsensi = async function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        window.cameraStream = stream;
        if (video) {
            video.srcObject = stream;
            video.onloadedmetadata = () => { video.play(); video.classList.remove('hidden'); document.getElementById('camera-loading')?.classList.add('hidden'); };
        }
    } catch(err) { 
        alert("Akses kamera gagal / ditolak oleh browser Anda."); 
        window.closeAbsensi(); 
    }
};

window.closeAbsensi = function() {
    if (window.cameraStream) { window.cameraStream.getTracks().forEach(track => track.stop()); window.cameraStream = null; }
    const modal = document.getElementById('modal-absensi');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    
    // Kembalikan teks tombol ke "Mulai Absen Masuk" jika sebelumnya diubah jadi Pulang
    const btnAbsen = document.querySelector('#modal-absensi button.bg-red-600');
    if(btnAbsen) {
        btnAbsen.innerHTML = '<i class="fa-solid fa-camera mr-2"></i> MULAI ABSEN MASUK';
        btnAbsen.setAttribute('onclick', "window.prosesAbsen('Masuk')");
        btnAbsen.className = "w-full bg-blue-600 text-white font-black py-4 rounded-2xl mt-4 hover:bg-blue-700 transition";
    }
};

window.prosesAbsen = function(tipe) {
    const pin = document.getElementById('absen-pin')?.value;
    const staf = window.databaseStaf.find(s => s.pin === pin);
    if (!staf) return alert("PIN Tidak Terdaftar! Silakan hubungi Owner.");
    
    let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
    
    // Validasi Anti Spam Absen
    if (tipe === 'Masuk' && stafHadir.includes(staf.nama)) {
        if(typeof window.playAudio === 'function') window.playAudio('masuk');
        return alert(`DITOLAK!\n${staf.nama} sudah Absen Masuk.`);
    }
    if ((tipe === 'Keluar' || tipe === 'Pulang') && !stafHadir.includes(staf.nama)) {
        if(typeof window.playAudio === 'function') window.playAudio('masuk');
        return alert(`DITOLAK!\n${staf.nama} tidak terdeteksi dalam shift.`);
    }

    // Kompresi Foto Ekstrem (Hemat 90% Memori)
    let fotoWajah = "";
    const video = document.getElementById('attendance-video');
    if (video && !video.classList.contains('hidden')) {
        const canvas = document.createElement('canvas');
        const scale = 300 / video.videoWidth;
        canvas.width = 300;
        canvas.height = video.videoHeight * scale;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        fotoWajah = canvas.toDataURL('image/jpeg', 0.4); 
    }
    
    // Kalkulator Gaji Waktu (Otomatis)
    let durasiKerja = "-";
    if (tipe === 'Keluar' || tipe === 'Pulang') {
        const riwayat = JSON.parse(localStorage.getItem('mainstay_dbAbsen')) || [];
        const absenMasukTerakhir = riwayat.slice().reverse().find(l => l.nama === staf.nama && l.tipe === 'Masuk');
        if (absenMasukTerakhir) {
            const waktuMasuk = new Date(absenMasukTerakhir.waktu);
            const selisihMs = new Date() - waktuMasuk;
            durasiKerja = `${Math.floor(selisihMs / 3600000)} Jam ${Math.floor((selisihMs % 3600000) / 60000)} Menit`;
        }
    }

    // Simpan Data Absen
    const dataAbsen = { id: 'ABS' + Date.now(), waktu: new Date().toISOString(), nama: staf.nama, tipe: tipe, foto: fotoWajah, durasi: durasiKerja };
    window.riwayatAbsensi.push(dataAbsen);
    localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi));
    if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), window.riwayatAbsensi);

    // Kunci / Buka Gembok Operasional
    if (tipe === 'Masuk') {
        stafHadir.push(staf.nama);
        document.getElementById('kasir-blocker')?.classList.add('hidden'); 
    } else {
        stafHadir = stafHadir.filter(nama => nama !== staf.nama);
        if (stafHadir.length === 0) {
            document.getElementById('kasir-blocker')?.classList.remove('hidden'); 
            window.statusStokTerkunci = true; 
            if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: true });
        }
    }
    
    localStorage.setItem('stafHadirMainstay', JSON.stringify(stafHadir));
    window.closeAbsensi();
    alert(`Berhasil Absen ${tipe}: ${staf.nama}\n${durasiKerja !== "-" ? `Kerja: ${durasiKerja}` : 'Selamat Bekerja!'}`);
};

// Fungsi memicu modal absen menjadi mode Pulang
window.mulaiAbsenPulang = function() {
    if(confirm("Yakin ingin Absen Pulang? Pastikan rekap dan fisik stok sudah sesuai!")) {
        const btnAbsen = document.querySelector('#modal-absensi button.bg-blue-600');
        if(btnAbsen) {
            btnAbsen.innerHTML = '<i class="fa-solid fa-camera mr-2"></i> REKAM FOTO & ABSEN PULANG';
            btnAbsen.setAttribute('onclick', "window.prosesAbsen('Keluar')");
            btnAbsen.className = "w-full bg-red-600 text-white font-black py-4 rounded-2xl mt-4 hover:bg-red-700 transition";
        }
        window.openAbsensi();
    }
};
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 4: INJEKSI UI & MODAL LENGKAP)
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Injeksi Gembok Kasir
    const viewKasir = document.getElementById('view-kasir');
    if (viewKasir && !document.getElementById('kasir-blocker')) {
        viewKasir.classList.add('relative');
        viewKasir.insertAdjacentHTML('afterbegin', `
            <div id="kasir-blocker" class="absolute inset-0 bg-slate-50/95 backdrop-blur-md z-[40] flex flex-col items-center justify-center hidden min-h-screen pb-32">
                <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6"><i class="fa-solid fa-lock text-4xl text-gray-300"></i></div>
                <h3 class="text-xl font-black text-gray-900 mb-1">Akses Terkunci</h3>
                <p class="text-xs font-bold text-gray-500 mb-8 px-8 text-center">Halo, Staf! Wajib Absen Masuk dengan foto wajah sebelum menerima pesanan.</p>
                <button onclick="window.openAbsensi()" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg"><i class="fa-solid fa-camera mr-2"></i> MULAI ABSEN MASUK</button>
            </div>
        `);
    }

    // 2. Injeksi Tombol Melayang (Kasir Plus, Absen Pulang, Stok Staf, Batal Kasir)
    if (!document.getElementById('btn-plus-order-kasir')) {
        document.body.insertAdjacentHTML('beforeend', `
            <button id="btn-plus-order-kasir" onclick="window.bukaOrderKasir()" class="fixed bottom-24 right-6 bg-amber-500 text-white w-14 h-14 rounded-full shadow-[0_5px_15px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center hover:bg-amber-600 transition z-50 hidden"><i class="fa-solid fa-plus text-2xl"></i></button>
            <button id="btn-stok-staf" onclick="window.bukaListStokStaf()" class="fixed bottom-24 left-6 bg-indigo-600 text-white w-14 h-14 rounded-full shadow-2xl flex flex-col items-center justify-center hover:bg-indigo-700 transition z-50 hidden"><i class="fa-solid fa-boxes-stacked text-xl"></i><span class="text-[8px] font-black mt-0.5">STOK</span></button>
            <button id="btn-absen-pulang" onclick="window.mulaiAbsenPulang()" class="fixed top-6 right-6 bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-2xl z-[45] hidden border border-red-700 hover:bg-red-600 transition"><i class="fa-solid fa-right-from-bracket mr-1"></i> Absen Pulang</button>
            <button id="btn-back-to-kasir" onclick="window.kembaliKeDashboardKasir()" class="fixed top-24 left-4 bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black shadow-2xl z-50 hidden items-center gap-2 border border-gray-700"><i class="fa-solid fa-arrow-left"></i> Batal / Ke Dasbor Kasir</button>
        `);
    }

    // 3. Injeksi Seluruh Modal Form & Log (HRD, Menu, Master Topping, Payment, Stok, Absen, Omzet)
    const allModalsHTML = `
    <!-- MODAL HRD -->
    <div id="modal-form-hrd" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
        <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 id="hrd-form-title" class="font-black text-lg">Form Karyawan</h2><button onclick="window.tutupFormHRD()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
                <input type="hidden" id="hrd-id"><input type="hidden" id="hrd-role" value="staf">
                <div class="flex gap-4 items-center">
                    <div class="w-16 h-16 bg-gray-100 rounded-full border flex items-center justify-center text-2xl text-gray-400 overflow-hidden relative"><img id="hrd-preview-foto" src="" class="absolute inset-0 w-full h-full object-cover hidden"><i class="fa-solid fa-camera"></i></div>
                    <div class="flex-1"><label class="block mb-1">URL Foto (Bisa Upload)</label><input type="text" id="hrd-foto" class="w-full bg-slate-50 border rounded-xl p-2.5"><input type="file" class="mt-1 text-[10px] w-full cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'hrd-foto', 'hrd-preview-foto')"></div>
                </div>
                <div class="grid grid-cols-2 gap-3"><div><label class="block mb-1">Nama Lengkap</label><input type="text" id="hrd-nama" class="w-full bg-slate-50 border rounded-xl p-2.5"></div><div><label class="block mb-1">PIN Login</label><input type="text" id="hrd-pin" class="w-full bg-slate-50 border rounded-xl p-2.5" maxlength="6"></div></div>
                <div class="grid grid-cols-2 gap-3"><div><label class="block mb-1">No. WhatsApp</label><input type="text" id="hrd-wa" class="w-full bg-slate-50 border rounded-xl p-2.5"></div><div><label class="block mb-1">Rekening / E-Wallet</label><input type="text" id="hrd-rekening" class="w-full bg-slate-50 border rounded-xl p-2.5"></div></div>
                <div id="hrd-area-gaji" class="space-y-4 p-4 border border-teal-100 bg-teal-50 rounded-xl mt-2">
                    <div class="grid grid-cols-2 gap-3"><div><label class="block mb-1">Tipe Kerja</label><select id="hrd-tipe-kerja" class="w-full bg-white border rounded-xl p-2.5"><option>Tetap</option><option>Kontrak</option><option>Part-time</option></select></div><div><label class="block mb-1">Jam Shift</label><input type="text" id="hrd-shift" class="w-full bg-white border rounded-xl p-2.5" placeholder="08:00 - 16:00"></div></div>
                    <div class="grid grid-cols-2 gap-3"><div><label class="block mb-1">Tipe Gaji</label><select id="hrd-tipe-gaji" class="w-full bg-white border rounded-xl p-2.5"><option>Per Jam</option><option>Harian</option><option>Mingguan</option><option>Bulanan</option></select></div><div><label class="block mb-1" id="label-nominal-gaji">Nominal Gaji / Bulan (Rp)</label><input type="number" id="hrd-nominal-gaji" class="w-full bg-white border rounded-xl p-2.5"></div></div>
                </div>
            </div>
            <div class="p-4 bg-gray-50 border-t shrink-0"><button onclick="window.simpanDataHRD()" class="w-full bg-teal-600 text-white font-black py-3 rounded-xl">SIMPAN DATA</button></div>
        </div>
    </div>

    <!-- MODAL FORM MENU & KATEGORI -->
    <div id="modal-form-menu" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4">
        <div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 id="form-menu-title" class="font-black text-lg">Edit Menu</h2><button onclick="window.tutupFormMenu()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700">
                <input type="hidden" id="menu-id">
                <div><label class="block mb-1">Nama Menu</label><input type="text" id="menu-nama" class="w-full bg-slate-50 border rounded-xl p-2.5"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block mb-1">Kategori</label>
                        <input type="text" id="menu-kategori" list="list-kategori-menu" class="w-full bg-white border border-gray-200 rounded-xl p-2.5" placeholder="Ketik kategori...">
                        <datalist id="list-kategori-menu"><option value="Coffee"></option><option value="Non-Coffee"></option><option value="Tea"></option><option value="Snack"></option></datalist>
                    </div>
                    <div><label class="block mb-1">Harga (Rp)</label><input type="number" id="menu-harga" class="w-full bg-slate-50 border rounded-xl p-2.5"></div>
                </div>
                <div>
                    <label class="block mb-1">Gambar (URL / Upload)</label>
                    <input type="text" id="menu-foto" class="w-full bg-slate-50 border rounded-xl p-2.5 mb-2">
                    <input type="file" class="mt-2 text-[10px] w-full text-amber-600 bg-amber-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'menu-foto', 'menu-preview-img-url')">
                </div>
                <div class="border border-amber-100 bg-amber-50 p-4 rounded-xl mt-2">
                    <label class="block mb-2 font-black text-amber-800">Master Topping Checkbox:</label>
                    <div id="container-topping-checkbox" class="space-y-2 max-h-32 overflow-y-auto"></div>
                </div>
            </div>
            <div class="p-4 bg-gray-50 border-t shrink-0"><button onclick="window.simpanDataMenu()" class="w-full bg-amber-500 text-white font-black py-3 rounded-xl hover:bg-amber-600">SIMPAN MENU</button></div>
        </div>
    </div>

    <!-- MODAL MASTER TOPPING -->
    <div id="modal-master-topping" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] hidden items-center justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 class="font-black text-lg"><i class="fa-solid fa-list-check text-amber-500 mr-2"></i>Master Topping</h2><button onclick="window.tutupMasterTopping()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div>
            <div class="p-4 bg-amber-50 border-b border-amber-100 flex gap-2 items-center"><input type="text" id="top-input-nama" placeholder="Nama Topping" class="flex-1 bg-white border rounded-xl p-2.5 text-xs font-bold"><input type="number" id="top-input-harga" placeholder="Harga (Rp)" class="w-24 bg-white border rounded-xl p-2.5 text-xs font-bold"><button onclick="window.tambahMasterTopping()" class="bg-amber-500 text-white w-10 h-10 rounded-xl font-black"><i class="fa-solid fa-plus"></i></button></div>
            <div id="list-master-topping" class="p-4 overflow-y-auto space-y-2 flex-1 bg-slate-50"></div>
        </div>
    </div>

    <!-- MODAL KASIR PAYMENT -->
    <div id="modal-payment-kasir" class="fixed inset-0 bg-black/80 backdrop-blur-md z-[250] hidden flex-col items-center justify-end md:justify-center p-4">
        <div class="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[95vh]">
            <button onclick="window.tutupPaymentKasir()" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-600 hover:bg-red-500 hover:text-white transition z-10"><i class="fa-solid fa-xmark"></i></button>
            <div class="overflow-y-auto flex-1 pb-4">
                <h2 class="text-xl font-black text-gray-900 mb-1"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i>Pembayaran</h2>
                <label class="text-[10px] font-black text-gray-500 uppercase">Penginput Pesanan:</label><select id="kasir-staf-dropdown" class="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-sm font-bold text-gray-800 mb-2 cursor-pointer"></select>
                <div class="grid grid-cols-2 gap-2 mt-2 mb-2">
                    <div><label class="text-[10px] font-black text-gray-500 uppercase">Nama Pelanggan (Opsional)</label><input type="text" id="kasir-nama-pelanggan" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold" placeholder="Contoh: Budi"></div>
                    <div><label class="text-[10px] font-black text-gray-500 uppercase">Potongan Diskon (Rp)</label><input type="number" id="kasir-input-diskon" onkeyup="window.hitungKembalian()" class="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-red-500" placeholder="0"></div>
                </div>
                <div class="mt-2 mb-4">
                    <label class="text-[10px] font-black text-gray-500 uppercase">Metode Pembayaran:</label>
                    <div class="grid grid-cols-2 gap-2 mt-1"><button id="btn-tunai" onclick="window.pilihMetodeKasir('Tunai')" class="bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500">TUNAI</button><button id="btn-qris" onclick="window.pilihMetodeKasir('QRIS')" class="bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2 border-gray-200">QRIS / NON-TUNAI</button></div>
                    <input type="hidden" id="kasir-metode-terpilih" value="Tunai">
                </div>
                <div class="bg-gray-900 text-white p-4 rounded-2xl mb-4 text-center"><p class="text-[10px] font-black text-gray-400 uppercase">Total Tagihan</p><h3 id="pay-total" class="text-3xl font-black text-amber-400">Rp 0</h3></div>
                
                <div id="kasir-qris-container" class="hidden flex-col items-center justify-center mb-4 p-4 border-2 border-dashed border-amber-300 bg-amber-50 rounded-2xl">
                    <p class="text-[10px] font-black text-amber-600 mb-2 uppercase text-center">Silakan scan QRIS di bawah ini</p>
                    <img id="kasir-qris-img" src="" class="w-40 h-40 object-contain rounded-xl shadow-sm">
                </div>

                <div id="kasir-input-uang-area">
                    <input type="number" id="pay-input" onkeyup="window.hitungKembalian()" class="w-full bg-slate-50 border rounded-xl p-4 text-2xl text-center font-black focus:border-amber-500 mb-3" placeholder="0" inputmode="numeric">
                    <div class="grid grid-cols-3 gap-2 mb-6"><button onclick="window.setUang(0)" class="bg-amber-100 text-amber-700 font-black py-3 rounded-xl text-[10px]">UANG PAS</button><button onclick="window.setUang(10000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">10.000</button><button onclick="window.setUang(20000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">20.000</button><button onclick="window.setUang(50000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">50.000</button><button onclick="window.setUang(100000)" class="bg-white border text-gray-700 font-black py-3 rounded-xl text-[10px]">100.000</button><button onclick="window.setUang('clear')" class="bg-red-50 text-red-500 font-black py-3 rounded-xl text-[10px]"><i class="fa-solid fa-delete-left text-sm"></i></button></div>
                    <div class="flex justify-between items-center border-t border-gray-100 pt-4"><span class="text-xs font-black text-gray-700">Kembalian:</span><span id="pay-kembalian" class="text-2xl font-black text-green-500">Rp 0</span></div>
                </div>
            </div>
            <div class="shrink-0 pt-2"><button onclick="window.finalisasiPembayaranKasir()" class="w-full bg-amber-500 text-white font-black py-4 rounded-2xl hover:bg-amber-600 transition"><i class="fa-solid fa-print mr-2"></i> CETAK STRUK</button></div>
        </div>
    </div>

    <!-- MODAL LIST STOK STAF & MODAL FORM STOK TIMBANGAN -->
    <div id="modal-staf-list-stok" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] hidden items-center justify-center p-4"><div class="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"><div class="px-6 py-4 bg-indigo-600 flex justify-between items-center text-white shrink-0"><div><h2 class="font-black text-lg">Update Stok Harian</h2><p id="status-gembok-staf" class="text-[10px] font-bold text-indigo-200">Status: TERBUKA</p></div><button onclick="window.tutupListStokStaf()" class="w-8 h-8 bg-indigo-500 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div><div id="staf-stok-container" class="p-4 overflow-y-auto flex-1 space-y-2 bg-slate-50"></div></div></div>
    <div id="modal-form-stok" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center p-4"><div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"><div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 id="stok-form-title" class="font-black text-lg">Update Stok</h2><button onclick="window.tutupFormStok()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div><div class="p-6 overflow-y-auto space-y-4 flex-1 text-xs font-bold text-gray-700"><input type="hidden" id="stok-id"><input type="hidden" id="stok-foto"><div id="area-stok-nama-kategori" class="space-y-4"><div><label class="block mb-1">Nama Barang</label><input type="text" id="stok-nama" class="w-full bg-slate-50 border rounded-xl p-2.5"></div><div><label class="block mb-1">Kategori</label><select id="stok-kategori" class="w-full bg-white border rounded-xl p-2.5"><option>Bahan Baku</option><option>Kemasan</option><option>Operasional</option></select></div></div><div class="grid grid-cols-2 gap-3"><div><label class="block mb-1">Sisa Stok Fisik</label><input type="number" step="0.01" id="stok-jumlah" class="w-full bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 font-black text-indigo-700 text-lg"></div><div><label class="block mb-1">Satuan</label><input type="text" id="stok-satuan" list="list-satuan" class="w-full bg-slate-50 border rounded-xl p-2.5"><datalist id="list-satuan"><option value="Kg"></option><option value="Gram"></option><option value="Liter"></option><option value="Pcs"></option><option value="Pack"></option></datalist></div></div><div class="border border-indigo-100 bg-indigo-50 p-4 rounded-xl mt-2 text-center"><label class="block mb-2 font-black text-indigo-800"><i class="fa-solid fa-camera mr-1"></i> Bukti Fisik / Timbangan</label><div class="w-full h-32 bg-slate-200 rounded-xl overflow-hidden relative border-2 border-dashed border-indigo-200 flex items-center justify-center mb-2"><img id="stok-preview-foto" src="" class="absolute inset-0 w-full h-full object-cover hidden"><i id="stok-icon-kamera" class="fa-solid fa-image text-4xl text-indigo-300"></i></div><input type="file" id="file-stok-bukti" class="text-[10px] w-full text-indigo-600 bg-white p-2 rounded-lg cursor-pointer border shadow-sm" accept="image/*" capture="environment" onchange="window.prosesUploadGambar(event, 'stok-foto', 'stok-preview-foto'); document.getElementById('stok-icon-kamera').classList.add('hidden');"></div></div><div class="p-4 bg-gray-50 border-t shrink-0"><button onclick="window.simpanDataStok()" class="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition">SIMPAN HASIL REKAP</button></div></div></div>

    <!-- MODAL RIWAYAT ABSEN & OMZET OWNER -->
    <div id="modal-riwayat-absen" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] hidden items-center justify-center p-4"><div class="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"><div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 class="font-black text-lg"><i class="fa-solid fa-clock-rotate-left text-teal-400 mr-2"></i>Log Kehadiran Staf</h2><button onclick="window.tutupRiwayatAbsen()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div><div id="list-riwayat-absen" class="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50"></div><div class="p-3 bg-white border-t text-center"><button onclick="window.bersihkanRiwayatAbsen()" class="text-[10px] text-red-500 font-bold hover:underline">Bersihkan Riwayat Bulan Ini</button></div></div></div>
    <div id="modal-riwayat-transaksi" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] hidden items-center justify-center p-4"><div class="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"><div class="px-6 py-4 bg-gray-900 flex justify-between items-center text-white shrink-0"><h2 class="font-black text-lg"><i class="fa-solid fa-receipt text-green-400 mr-2"></i>Log Transaksi Harian</h2><button onclick="window.tutupRiwayatTransaksi()" class="w-8 h-8 bg-gray-800 rounded-full hover:bg-red-500 transition"><i class="fa-solid fa-xmark"></i></button></div><div id="list-riwayat-transaksi" class="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50"></div></div></div>
    `;

    document.body.insertAdjacentHTML('beforeend', allModalsHTML);

    // 4. Injeksi Interaktif UI Lainnya (Gaji Label, Tombol Cek Omzet, Ganti Logo)
    const dropdownTipeGaji = document.getElementById('hrd-tipe-gaji');
    const labelNominalGaji = document.getElementById('label-nominal-gaji');
    if (dropdownTipeGaji && labelNominalGaji) {
        dropdownTipeGaji.addEventListener('change', function() {
            if (this.value === 'Per Jam') labelNominalGaji.innerText = 'Nominal Gaji / Jam (Rp)';
            else if (this.value === 'Harian') labelNominalGaji.innerText = 'Nominal Gaji / Hari (Rp)';
            else if (this.value === 'Mingguan') labelNominalGaji.innerText = 'Nominal Gaji / Minggu (Rp)';
            else labelNominalGaji.innerText = 'Nominal Gaji / Bulan (Rp)';
        });
    }

    const ownerNav = document.querySelector('.owner-nav');
    if (ownerNav && !document.getElementById('btn-cek-omzet')) {
        ownerNav.insertAdjacentHTML('afterbegin', `<button id="btn-cek-omzet" onclick="window.bukaRiwayatTransaksi()" class="w-full flex flex-col items-center justify-center p-3 rounded-2xl transition bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-100 shadow-sm mb-2"><i class="fa-solid fa-sack-dollar text-xl mb-1"></i><span class="text-[10px] font-black uppercase">Cek Omzet</span></button>`);
    }

    const inputLogo = document.getElementById('setting-logo');
    if (inputLogo && !document.getElementById('file-logo')) inputLogo.insertAdjacentHTML('afterend', `<input type="file" id="file-logo" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-logo', 'header-logo-img')">`);
    
    const inputQris = document.getElementById('setting-qris');
    if (inputQris && !document.getElementById('file-qris')) inputQris.insertAdjacentHTML('afterend', `<input type="file" id="file-qris" class="mt-2 text-[10px] w-full text-blue-600 bg-blue-50 p-2 rounded-lg cursor-pointer" accept="image/*" onchange="window.prosesUploadGambar(event, 'setting-qris', 'qris-img-display')">`);
});
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 5: CRUD HRD & KONFIGURASI WEB)
// ============================================================================

// 1. Simpan Web Config
document.addEventListener('DOMContentLoaded', () => {
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
                let mapRaw = document.getElementById('setting-maps').value;
                if(mapRaw.includes('src="')) mapRaw = mapRaw.split('src="')[1].split('"')[0];
                window.systemConfig.maps = mapRaw;

                if (document.getElementById('header-logo-img') && window.systemConfig.logoUrl) document.getElementById('header-logo-img').src = window.systemConfig.logoUrl;
                if (document.getElementById('qris-img-display') && window.systemConfig.qrisUrl) document.getElementById('qris-img-display').src = window.systemConfig.qrisUrl;
                
                localStorage.setItem('mainstay_dbConfig', JSON.stringify(window.systemConfig));
                if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'konfigurasi_web'), window.systemConfig);
                alert("Pengaturan Berhasil Disimpan & Live!");
            };
        }
    }
});

// 2. Render Panel HRD Terpusat
window.renderPanelHRD = function() {
    const panel = document.getElementById('panel-hrd');
    if (!panel) return;
    const containerUtama = panel.querySelector('.space-y-5');
    if (!containerUtama) return;
    
    // Header Owner
    containerUtama.innerHTML = `
        <div class="bg-gray-900 p-5 rounded-2xl shadow-sm text-white flex items-center justify-between mb-4">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-xl font-black overflow-hidden">${window.profilOwner.foto ? `<img src="${window.profilOwner.foto}" class="w-full h-full object-cover">` : window.profilOwner.nama.charAt(0)}</div>
                <div><h3 class="font-black text-sm text-amber-400">Master Owner</h3><p class="text-[10px] font-bold text-gray-400">${window.profilOwner.nama} | PIN: *** (Rahasia)</p></div>
            </div>
            <button onclick="window.bukaFormOwner()" class="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-pen text-amber-400"></i> Edit</button>
        </div>
    `;

    // Database Karyawan (Dengan Titik Online & Paksa Pulang)
    let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
    let htmlStaf = `<div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"><div class="flex justify-between items-center mb-4 border-b border-gray-100 pb-2"><h3 class="text-xs font-black text-gray-900 uppercase tracking-wider">Database Karyawan</h3><div class="flex items-center gap-2"><button onclick="window.bukaRiwayatAbsen()" class="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-indigo-200 transition"><i class="fa-solid fa-clock-rotate-left"></i> Log Absen</button><button onclick="window.bukaFormStaf()" class="bg-teal-100 text-teal-700 px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-teal-200 transition"><i class="fa-solid fa-plus"></i> Tambah Staf</button></div></div><div class="space-y-2">`;

    window.databaseStaf.forEach((staf, index) => {
        const isOnline = stafHadir.includes(staf.nama);
        htmlStaf += `
        <div class="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50 group">
            <div class="flex items-center gap-3">
                ${staf.foto ? `<img src="${staf.foto}" class="w-10 h-10 rounded-full object-cover border border-gray-200">` : `<div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-gray-500"><i class="fa-solid fa-user"></i></div>`}
                <div>
                    <span class="text-xs font-black text-gray-900 flex items-center">${staf.nama} <span class="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded ml-1">${staf.jobType || 'Staf'}</span> ${isOnline ? '<span class="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" title="Sedang Aktif"></span>' : ''}</span>
                    <span class="text-gray-500 text-[10px] font-bold block mt-0.5">PIN: *** (Rahasia) | Shift: ${staf.shift || '-'}</span>
                </div>
            </div>
            <div class="flex items-center gap-1">
                ${isOnline ? `<button onclick="window.paksaPulangStaf('${staf.nama}')" class="w-8 h-8 flex items-center justify-center bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition" title="Paksa Absen Pulang"><i class="fa-solid fa-person-walking-arrow-right"></i></button>` : ''}
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

// 3. Kontrol Form HRD & Simpan Data
window.bukaFormOwner = function() {
    document.getElementById('hrd-form-title').innerHTML = '<i class="fa-solid fa-shield-halved text-amber-500 mr-2"></i>Edit Profil Owner';
    document.getElementById('hrd-role').value = 'owner';
    document.getElementById('hrd-area-gaji').classList.add('hidden'); 
    document.getElementById('hrd-nama').value = window.profilOwner.nama;
    document.getElementById('hrd-pin').value = window.profilOwner.pin;
    document.getElementById('hrd-wa').value = window.profilOwner.wa || '';
    document.getElementById('hrd-rekening').value = window.profilOwner.rekening || '';
    document.getElementById('hrd-foto').value = window.profilOwner.foto || '';
    const previewImg = document.getElementById('hrd-preview-foto');
    if(window.profilOwner.foto) { previewImg.src = window.profilOwner.foto; previewImg.classList.remove('hidden'); } 
    else { previewImg.src = ''; previewImg.classList.add('hidden'); }
    
    document.getElementById('modal-form-hrd').classList.remove('hidden');
    document.getElementById('modal-form-hrd').classList.add('flex');
};

window.bukaFormStaf = function() {
    document.getElementById('hrd-form-title').innerHTML = '<i class="fa-solid fa-user-plus text-teal-500 mr-2"></i>Tambah Staf Baru';
    document.getElementById('hrd-role').value = 'staf';
    document.getElementById('hrd-id').value = '';
    document.getElementById('hrd-area-gaji').classList.remove('hidden');
    ['hrd-nama', 'hrd-pin', 'hrd-wa', 'hrd-rekening', 'hrd-foto', 'hrd-shift', 'hrd-nominal-gaji'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('hrd-preview-foto').classList.add('hidden');
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
    
    const previewImg = document.getElementById('hrd-preview-foto');
    if(staf.foto) { previewImg.src = staf.foto; previewImg.classList.remove('hidden'); } else { previewImg.classList.add('hidden'); }
    
    document.getElementById('modal-form-hrd').classList.remove('hidden');
    document.getElementById('modal-form-hrd').classList.add('flex');
};

window.simpanDataHRD = function() {
    const role = document.getElementById('hrd-role').value;
    if (role === 'owner') {
        window.profilOwner.nama = document.getElementById('hrd-nama').value;
        window.profilOwner.pin = document.getElementById('hrd-pin').value;
        window.profilOwner.wa = document.getElementById('hrd-wa').value;
        window.profilOwner.rekening = document.getElementById('hrd-rekening').value;
        window.profilOwner.foto = document.getElementById('hrd-foto').value;
        if(window.systemConfig) window.systemConfig.pinOwner = window.profilOwner.pin; 
        
        localStorage.setItem('mainstay_dbOwner', JSON.stringify(window.profilOwner));
        localStorage.setItem('mainstay_dbConfig', JSON.stringify(window.systemConfig));
        if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'konfigurasi_web'), window.systemConfig);
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
        if (idIndex !== '') window.databaseStaf[idIndex] = stafData;
        else window.databaseStaf.push(stafData);
        
        window.dbStaf = window.databaseStaf;
        localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf));
        if (window.db && window.fbSet) {
            let firebaseObj = {}; window.databaseStaf.forEach(s => firebaseObj[s.id] = s);
            window.fbSet(window.fbRef(window.db, 'hrd_karyawan'), firebaseObj);
        }
    }
    window.tutupFormHRD();
    window.renderPanelHRD();
    alert("Data berhasil disimpan!");
};

window.hapusStaf = function(index) {
    const stafYangDihapus = window.databaseStaf[index];
    const stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
    
    if (stafHadir.includes(stafYangDihapus.nama)) {
        if(typeof window.playAudio === 'function') window.playAudio('masuk');
        return alert(`PENGHAPUSAN DITOLAK!\n\nKaryawan "${stafYangDihapus.nama}" SEDANG AKTIF di toko. Harap Paksa Pulang terlebih dahulu.`);
    }
    
    if(confirm(`Yakin ingin menghapus ${stafYangDihapus.nama}?`)) {
        window.databaseStaf.splice(index, 1);
        window.dbStaf = window.databaseStaf; 
        localStorage.setItem('mainstay_dbStaf', JSON.stringify(window.databaseStaf));
        if (window.db && window.fbSet) {
            let firebaseObj = {}; window.databaseStaf.forEach(s => firebaseObj[s.id] = s);
            window.fbSet(window.fbRef(window.db, 'hrd_karyawan'), firebaseObj);
        }
        window.renderPanelHRD();
    }
};

window.tutupFormHRD = function() { document.getElementById('modal-form-hrd').classList.add('hidden'); document.getElementById('modal-form-hrd').classList.remove('flex'); };
window.paksaPulangStaf = function(namaStaf) {
    if(confirm(`Paksa Absen Pulang untuk ${namaStaf}?`)) {
        let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
        stafHadir = stafHadir.filter(nama => nama !== namaStaf);
        localStorage.setItem('stafHadirMainstay', JSON.stringify(stafHadir));
        
        if (stafHadir.length === 0) {
            document.getElementById('kasir-blocker')?.classList.remove('hidden'); 
            window.statusStokTerkunci = true; 
            if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: true });
        }
        
        window.riwayatAbsensi = JSON.parse(localStorage.getItem('mainstay_dbAbsen')) || [];
        window.riwayatAbsensi.push({ id: 'ABS' + Date.now(), waktu: new Date().toISOString(), nama: namaStaf, tipe: 'Pulang (Force By Owner)', foto: '', durasi: '-' });
        localStorage.setItem('mainstay_dbAbsen', JSON.stringify(window.riwayatAbsensi));
        if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), window.riwayatAbsensi);
        alert(`Berhasil memaksa ${namaStaf} untuk pulang.`);
        window.renderPanelHRD();
    }
};
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 6: CRUD MENU, KATEGORI & TOPPING)
// ============================================================================

// 1. Render Admin Katalog dengan Tombol Sold Out & Hapus Lengkap
window.renderAdminKatalog = function(panel) {
    let listContainer = document.getElementById('admin-katalog-list');
    if (!listContainer) {
        panel.querySelector('.flex-1').insertAdjacentHTML('beforeend', '<div id="admin-katalog-list" class="space-y-3 mt-4"></div>');
        listContainer = document.getElementById('admin-katalog-list');
    }
    
    listContainer.innerHTML = '';
    window.katalogMenu.forEach((item) => {
        const isHabis = item.stok === 0;
        const badgeHabis = isHabis ? '<span class="ml-2 text-[8px] bg-red-500 text-white px-2 py-0.5 rounded uppercase font-black">HABIS</span>' : '';
        const btnHabisClass = isHabis ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white';
        
        listContainer.innerHTML += `
        <div class="bg-white p-4 rounded-2xl shadow-sm border ${isHabis ? 'border-red-200 bg-red-50' : 'border-gray-100'} flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="relative"><img src="${item.image}" class="w-12 h-12 rounded-lg object-cover border border-gray-200 ${isHabis ? 'grayscale opacity-50' : ''}"></div>
                <div><h4 class="font-black text-sm ${isHabis ? 'text-gray-400' : 'text-gray-900'}">${item.nama} ${badgeHabis}</h4><p class="text-[10px] font-bold ${isHabis ? 'text-gray-400' : 'text-amber-500'}">Rp ${item.harga.toLocaleString('id-ID')} | <span class="uppercase">${item.kategori}</span></p></div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.toggleSoldOutMenu('${item.id}')" class="w-8 h-8 rounded-lg transition text-[10px] ${btnHabisClass}" title="Tandai Habis/Tersedia"><i class="fa-solid fa-ban"></i></button>
                <button onclick="window.bukaFormMenu('${item.id}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen"></i></button>
                <button onclick="window.hapusMenu('${item.id}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    });
};

window.toggleSoldOutMenu = function(id) {
    const itemIndex = window.katalogMenu.findIndex(m => m.id === id);
    if (itemIndex > -1) {
        window.katalogMenu[itemIndex].stok = window.katalogMenu[itemIndex].stok === 0 ? 100 : 0;
        window.simpanMenuHanyaData();
    }
};

window.hapusMenu = function(id) {
    const item = window.katalogMenu.find(m => m.id === id);
    if(confirm(`Yakin ingin menghapus menu: ${item.nama}?`)) {
        window.katalogMenu = window.katalogMenu.filter(m => m.id !== id);
        window.simpanMenuHanyaData();
    }
};

window.simpanMenuHanyaData = function() {
    localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu));
    if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'katalog_menu'), window.katalogMenu);
    window.renderAdminKatalog(document.getElementById('panel-katalog'));
    if(typeof window.renderKatalog === 'function') window.renderKatalog();
    window.renderKategoriFilter();
};

// 2. Kategori Filter Dinamis Pelanggan
window.renderKategoriFilter = function() {
    const containerFilter = document.querySelector('.flex.gap-3.overflow-x-auto') || document.getElementById('kategori-container');
    if (!containerFilter) return;

    const kategoriUnik = ['Semua'];
    window.katalogMenu.forEach(m => {
        const kat = m.kategori.charAt(0).toUpperCase() + m.kategori.slice(1);
        if (!kategoriUnik.includes(kat)) kategoriUnik.push(kat);
    });

    containerFilter.innerHTML = '';
    kategoriUnik.forEach((kat, index) => {
        const activeClass = index === 0 ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200';
        containerFilter.innerHTML += `<button onclick="window.filterMenuByKategori('${kat === 'Semua' ? 'all' : kat.toLowerCase()}')" class="px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition shadow-sm hover:bg-gray-900 hover:text-white filter-btn ${activeClass}">${kat}</button>`;
    });
};

window.filterMenuByKategori = function(kategori) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-gray-900', 'text-white');
        btn.classList.add('bg-white', 'text-gray-600', 'border', 'border-gray-200');
        if (btn.innerText.toLowerCase() === kategori || (kategori === 'all' && btn.innerText === 'Semua')) {
            btn.classList.add('bg-gray-900', 'text-white');
            btn.classList.remove('bg-white', 'text-gray-600');
        }
    });
    window.kategoriAktif = kategori; 
    if(typeof window.renderKatalog === 'function') window.renderKatalog();
};

// 3. Form Menu Buka / Simpan
window.bukaFormMenu = function(idMenu) {
    const isEdit = idMenu !== '';
    const item = isEdit ? window.katalogMenu.find(m => m.id === idMenu) : null;
    document.getElementById('form-menu-title').innerHTML = isEdit ? '<i class="fa-solid fa-pen mr-2 text-amber-400"></i> Edit Menu' : '<i class="fa-solid fa-plus mr-2 text-amber-400"></i> Tambah Menu';
    document.getElementById('menu-id').value = isEdit ? item.id : '';
    document.getElementById('menu-nama').value = isEdit ? item.nama : '';
    document.getElementById('menu-kategori').value = isEdit ? item.kategori : '';
    document.getElementById('menu-harga').value = isEdit ? item.harga : '';
    document.getElementById('menu-foto').value = isEdit ? item.image : '';
    
    // Checkbox Master Topping
    const containerTop = document.getElementById('container-topping-checkbox');
    containerTop.innerHTML = '';
    window.masterTopping.forEach(top => {
        const isChecked = isEdit && item.opsiTopping && item.opsiTopping.includes(top.id) ? 'checked' : '';
        containerTop.innerHTML += `<label class="flex items-center gap-3 bg-white p-2 border border-gray-200 rounded-lg cursor-pointer"><input type="checkbox" class="master-top-cb w-4 h-4 accent-amber-500" value="${top.id}" ${isChecked}><span class="text-xs text-gray-700">${top.nama} (+Rp ${top.harga})</span></label>`;
    });

    // Pancing URL preview
    const eventInput = new Event('input', { bubbles: true });
    document.getElementById('menu-foto').dispatchEvent(eventInput);

    document.getElementById('modal-form-menu').classList.remove('hidden');
    document.getElementById('modal-form-menu').classList.add('flex');
};

window.tutupFormMenu = function() { document.getElementById('modal-form-menu').classList.add('hidden'); document.getElementById('modal-form-menu').classList.remove('flex'); };

window.simpanDataMenu = function() {
    const id = document.getElementById('menu-id').value;
    const cbToppings = document.querySelectorAll('.master-top-cb:checked');
    const opsiTopping = Array.from(cbToppings).map(cb => cb.value);

    const dataMenu = {
        id: id !== '' ? id : 'M' + Date.now(),
        nama: document.getElementById('menu-nama').value,
        kategori: document.getElementById('menu-kategori').value,
        harga: parseInt(document.getElementById('menu-harga').value) || 0,
        image: document.getElementById('menu-foto').value,
        stok: 100, // Default stok
        opsiTopping: opsiTopping
    };

    if (id !== '') { const index = window.katalogMenu.findIndex(m => m.id === id); window.katalogMenu[index] = dataMenu; } 
    else { window.katalogMenu.push(dataMenu); }
    
    window.simpanMenuHanyaData();
    window.tutupFormMenu();
    alert("Menu berhasil disimpan!");
};

// 4. Master Topping CRUD
window.bukaMasterTopping = function() {
    document.getElementById('modal-master-topping').classList.remove('hidden'); document.getElementById('modal-master-topping').classList.add('flex');
    window.renderMasterTopping();
};
window.tutupMasterTopping = function() {
    document.getElementById('modal-master-topping').classList.add('hidden'); document.getElementById('modal-master-topping').classList.remove('flex');
    if(!document.getElementById('modal-form-menu').classList.contains('hidden')) { window.bukaFormMenu(document.getElementById('menu-id').value); }
};
window.renderMasterTopping = function() {
    const list = document.getElementById('list-master-topping'); list.innerHTML = '';
    window.masterTopping.forEach((top, index) => {
        list.innerHTML += `<div class="bg-white p-3 rounded-xl border flex justify-between items-center shadow-sm"><div><h4 class="text-xs font-black text-gray-900">${top.nama}</h4><p class="text-[10px] font-bold text-amber-500">+ Rp ${top.harga.toLocaleString('id-ID')}</p></div><button onclick="window.hapusMasterTopping(${index})" class="w-7 h-7 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button></div>`;
    });
};
window.tambahMasterTopping = function() {
    const nama = document.getElementById('top-input-nama').value; const harga = document.getElementById('top-input-harga').value;
    if(!nama || !harga) return alert("Wajib diisi!");
    window.masterTopping.push({ id: 'T' + Date.now(), nama: nama, harga: parseInt(harga) });
    document.getElementById('top-input-nama').value = ''; document.getElementById('top-input-harga').value = '';
    window.simpanToppingHanyaData(); window.renderMasterTopping();
};
window.hapusMasterTopping = function(index) {
    if(confirm(`Hapus topping ${window.masterTopping[index].nama}?`)) { window.masterTopping.splice(index, 1); window.simpanToppingHanyaData(); window.renderMasterTopping(); }
};
window.simpanToppingHanyaData = function() {
    localStorage.setItem('mainstay_dbTopping', JSON.stringify(window.masterTopping));
    if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'master_topping'), window.masterTopping);
};

// 5. Import CSV Menu & Routing Panel Owner
document.addEventListener('DOMContentLoaded', () => {
    const panelKatalog = document.getElementById('panel-katalog');
    if (panelKatalog && !document.getElementById('file-import-menu')) panelKatalog.insertAdjacentHTML('beforeend', `<input type="file" id="file-import-menu" class="hidden" accept=".csv" onchange="window.prosesImportCSV(event)">`);
});

window.openPanel = function(panelId) {
    document.querySelectorAll('.panel-owner-content').forEach(p => { p.classList.add('hidden'); p.classList.remove('flex'); });
    const target = document.getElementById(panelId);
    if(target) {
        target.classList.remove('hidden'); target.classList.add('flex');
        if (panelId === 'panel-hrd') window.renderPanelHRD();
        if (panelId === 'panel-stok' && typeof window.renderPanelStok === 'function') window.renderPanelStok();
        if (panelId === 'panel-katalog') {
            const panelKat = document.getElementById('panel-katalog');
            // Ganti teks tombol Kategori jadi Topping
            const btnKategori = panelKat.querySelector('button.bg-gray-800');
            if (btnKategori) { btnKategori.innerHTML = '<i class="fa-solid fa-list-check mr-1"></i> Master Topping'; btnKategori.onclick = () => window.bukaMasterTopping(); }
            // Hidupkan tombol Import & Tambah
            const btnImport = Array.from(panelKat.querySelectorAll('button')).find(btn => btn.innerText.toLowerCase().includes('import'));
            if (btnImport) btnImport.onclick = () => document.getElementById('file-import-menu').click();
            const btnTambah = panelKat.querySelector('button.bg-amber-500');
            if (btnTambah) btnTambah.onclick = () => window.bukaFormMenu('');
            window.renderAdminKatalog(panelKat);
        }
    }
};

window.prosesImportCSV = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const baris = e.target.result.split('\n'); let count = 0;
        for(let i = 1; i < baris.length; i++) {
            if(baris[i].trim() === '') continue;
            const kolom = baris[i].split(',');
            if(kolom.length >= 3) {
                window.katalogMenu.push({ id: 'M' + Date.now() + i, nama: kolom[0].trim(), kategori: kolom[1].trim().toLowerCase(), harga: parseInt(kolom[2].trim()) || 0, image: kolom[3] ? kolom[3].trim() : '', stok: 100, opsiTopping: [] });
                count++;
            }
        }
        window.simpanMenuHanyaData(); alert(`${count} Menu di-import!`); event.target.value = ''; 
    };
    reader.readAsText(file);
};
// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 7: INVENTARIS STOK & GEMBOK)
// ============================================================================

window.renderPanelStok = function() {
    const panel = document.getElementById('panel-stok');
    if (!panel) return;
    
    const headerArea = panel.querySelector('.flex.justify-between.items-center');
    if (headerArea && !document.getElementById('btn-toggle-kunci')) {
        headerArea.insertAdjacentHTML('beforeend', `<button id="btn-toggle-kunci" onclick="window.toggleKunciOwner()" class="ml-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-200 transition border shadow-sm flex items-center gap-2"><i class="fa-solid fa-lock-open text-green-500"></i> Izin Staf: TERBUKA</button>`);
    }
    window.updateTombolGembokOwner();

    const containerUtama = panel.querySelector('.flex-1') || panel;
    let htmlStok = `<div id="admin-stok-list" class="space-y-3 mt-4">`;

    if (window.databaseStok.length === 0) {
        htmlStok += `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed border-gray-200 rounded-2xl">Gudang kosong.</div>`;
    } else {
        window.databaseStok.forEach((item) => {
            const isLow = parseFloat(item.jumlah) <= 5;
            const thumbnailHTML = item.fotoBukti ? `<img src="${item.fotoBukti}" class="w-10 h-10 rounded-xl object-cover border shadow-sm">` : `<div class="w-10 h-10 rounded-xl bg-white border flex items-center justify-center shadow-sm"><i class="fa-solid fa-box ${isLow ? 'text-red-500' : 'text-indigo-500'} text-lg"></i></div>`;
            
            htmlStok += `
            <div class="${isLow ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'} p-4 rounded-2xl shadow-sm border flex items-center justify-between">
                <div class="flex items-center gap-4">${thumbnailHTML}<div><h4 class="font-black text-sm text-gray-900">${item.nama} ${isLow ? '<span class="ml-2 text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase">Menipis</span>' : ''}</h4><p class="text-[10px] font-bold text-gray-500">${item.kategori}</p></div></div>
                <div class="flex items-center gap-4"><div class="text-right"><span class="block text-[10px] font-bold text-gray-400 uppercase">Sisa Stok</span><span class="font-black text-lg ${isLow ? 'text-red-600' : 'text-indigo-600'}">${item.jumlah} <span class="text-xs">${item.satuan}</span></span></div><div class="flex flex-col gap-1 border-l pl-3"><button onclick="window.bukaFormStok('${item.id}')" class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-pen"></i></button><button onclick="window.hapusStok('${item.id}')" class="w-7 h-7 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition text-[10px]"><i class="fa-solid fa-trash"></i></button></div></div>
            </div>`;
        });
    }
    htmlStok += `</div>`;
    const oldList = document.getElementById('admin-stok-list'); if(oldList) oldList.remove();
    containerUtama.insertAdjacentHTML('beforeend', htmlStok);
};

window.renderStokStaf = function() {
    const container = document.getElementById('staf-stok-container'); const labelStatus = document.getElementById('status-gembok-staf');
    if (!container) return;
    if (window.statusStokTerkunci) { labelStatus.innerText = "Status: 🔒 TERKUNCI"; labelStatus.classList.replace('text-indigo-200', 'text-amber-300'); } 
    else { labelStatus.innerText = "Status: 🔓 TERBUKA"; labelStatus.classList.replace('text-amber-300', 'text-indigo-200'); }

    let htmlStaf = '';
    window.databaseStok.forEach(item => {
        const thumbnailHTML = item.fotoBukti ? `<img src="${item.fotoBukti}" class="w-10 h-10 rounded-lg object-cover border shrink-0">` : `<div class="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-300 flex items-center justify-center shrink-0"><i class="fa-solid fa-camera"></i></div>`;
        htmlStaf += `<div class="bg-white p-3 rounded-xl shadow-sm border flex items-center justify-between gap-3">${thumbnailHTML}<div class="flex-1"><h4 class="font-black text-sm text-gray-900">${item.nama}</h4><p class="text-[10px] font-bold text-gray-500">${item.jumlah} ${item.satuan}</p></div><button onclick="window.bukaFormStok('${item.id}')" class="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-black hover:bg-indigo-600 hover:text-white transition">Update</button></div>`;
    });
    container.innerHTML = htmlStaf;
};

window.bukaFormStok = function(idBarang) {
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    const isEdit = idBarang !== ''; const item = isEdit ? window.databaseStok.find(b => b.id === idBarang) : null;
    
    document.getElementById('stok-form-title').innerHTML = isEdit ? '<i class="fa-solid fa-pen mr-2 text-indigo-400"></i> Update Stok' : '<i class="fa-solid fa-box-open mr-2 text-indigo-400"></i> Tambah Barang';
    document.getElementById('stok-id').value = isEdit ? item.id : '';
    document.getElementById('stok-nama').value = isEdit ? item.nama : '';
    document.getElementById('stok-kategori').value = isEdit ? item.kategori : 'Bahan Baku';
    document.getElementById('stok-jumlah').value = isEdit ? item.jumlah : '';
    document.getElementById('stok-satuan').value = isEdit ? item.satuan : '';
    
    document.getElementById('file-stok-bukti').value = ''; 
    const previewImg = document.getElementById('stok-preview-foto'); const iconCam = document.getElementById('stok-icon-kamera');
    if (isEdit && item && item.fotoBukti) { document.getElementById('stok-foto').value = item.fotoBukti; previewImg.src = item.fotoBukti; previewImg.classList.remove('hidden'); iconCam.classList.add('hidden'); } 
    else { document.getElementById('stok-foto').value = ''; previewImg.src = ''; previewImg.classList.add('hidden'); iconCam.classList.remove('hidden'); }

    if (!isOwner && isEdit) { document.getElementById('stok-nama').readOnly = true; document.getElementById('stok-kategori').disabled = true; document.getElementById('stok-nama').classList.add('bg-gray-100', 'text-gray-500'); } 
    else { document.getElementById('stok-nama').readOnly = false; document.getElementById('stok-kategori').disabled = false; document.getElementById('stok-nama').classList.remove('bg-gray-100', 'text-gray-500'); }

    document.getElementById('modal-form-stok').classList.remove('hidden'); document.getElementById('modal-form-stok').classList.add('flex');
};
window.tutupFormStok = function() { document.getElementById('modal-form-stok').classList.add('hidden'); document.getElementById('modal-form-stok').classList.remove('flex'); };

window.simpanDataStok = function() {
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    if (window.statusStokTerkunci && !isOwner) { if(typeof window.playAudio === 'function') window.playAudio('masuk'); return alert("GAGAL MENYIMPAN!\nToko ditutup / dikunci Owner."); }
    
    const nama = document.getElementById('stok-nama').value.trim(); const jumlah = document.getElementById('stok-jumlah').value;
    if(nama === '' || jumlah === '') return alert("Nama dan Jumlah wajib diisi!");

    const id = document.getElementById('stok-id').value;
    const dataBarang = { id: id !== '' ? id : 'INV' + Date.now(), nama: nama, kategori: document.getElementById('stok-kategori').value, jumlah: parseFloat(jumlah), satuan: document.getElementById('stok-satuan').value || 'Pcs', fotoBukti: document.getElementById('stok-foto').value };

    if (id !== '') window.databaseStok[window.databaseStok.findIndex(b => b.id === id)] = dataBarang; else window.databaseStok.push(dataBarang);
    
    localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok));
    if (window.db && window.fbSet) { let fbObj = {}; window.databaseStok.forEach(b => fbObj[b.id] = b); window.fbSet(window.fbRef(window.db, 'inventaris_stok'), fbObj); }

    window.tutupFormStok();
    if (!document.getElementById('panel-stok')?.classList.contains('hidden')) window.renderPanelStok();
    if (!document.getElementById('modal-staf-list-stok')?.classList.contains('hidden')) window.renderStokStaf();
    alert(isOwner ? "Stok Master disimpan." : "Bukti fisik disetorkan.");
};

window.hapusStok = function(idBarang) {
    const isOwner = localStorage.getItem('sesiMainstay') === 'owner' || localStorage.getItem('isOwnerInKasir') === 'true';
    if (!isOwner) return alert("Hanya Owner yang bisa hapus.");
    if(confirm(`Yakin hapus barang ini?`)) {
        window.databaseStok = window.databaseStok.filter(b => b.id !== idBarang);
        localStorage.setItem('mainstay_dbStok', JSON.stringify(window.databaseStok));
        if (window.db && window.fbSet) { let fbObj = {}; window.databaseStok.forEach(b => fbObj[b.id] = b); window.fbSet(window.fbRef(window.db, 'inventaris_stok'), fbObj); }
        window.renderPanelStok();
    }
};

window.bukaListStokStaf = function() { document.getElementById('modal-staf-list-stok').classList.remove('hidden'); document.getElementById('modal-staf-list-stok').classList.add('flex'); window.renderStokStaf(); };
window.tutupListStokStaf = function() { document.getElementById('modal-staf-list-stok').classList.add('hidden'); document.getElementById('modal-staf-list-stok').classList.remove('flex'); };
window.toggleKunciOwner = function() { window.statusStokTerkunci = !window.statusStokTerkunci; if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'pengaturan_sistem/kunci_stok'), { tanggal: window.tanggalSistemSekarang, isLocked: window.statusStokTerkunci }); window.updateTombolGembokOwner(); };
window.updateTombolGembokOwner = function() {
    const btn = document.getElementById('btn-toggle-kunci'); if (!btn) return;
    if (window.statusStokTerkunci) { btn.innerHTML = '<i class="fa-solid fa-lock text-red-500"></i> Izin Staf: TERKUNCI'; btn.className = "ml-2 bg-red-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-black border border-red-200 shadow-sm flex items-center gap-2"; } 
    else { btn.innerHTML = '<i class="fa-solid fa-lock-open text-green-500"></i> Izin Staf: TERBUKA'; btn.className = "ml-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black border border-slate-300 shadow-sm flex items-center gap-2"; }
};

// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 8: ALUR KERANJANG PINTAR)
// ============================================================================

// 1. Kontrol Layar Order Kasir vs Customer
if (!window.originalSwitchRoleView) window.originalSwitchRoleView = window.switchRoleView;
window.switchRoleView = function(role) {
    if (window.currentCart && window.currentCart.length > 0) {
        window.currentCart = []; localStorage.removeItem('cartMainstay');
        if (typeof window.updateCartFloat === 'function') window.updateCartFloat();
    }
    window.originalSwitchRoleView(role);
    const btnPlus = document.getElementById('btn-plus-order-kasir'); const btnPulang = document.getElementById('btn-absen-pulang');
    if (btnPlus) btnPlus.classList.toggle('hidden', role !== 'kasir');
    if (btnPulang) btnPulang.classList.toggle('hidden', role !== 'kasir');
};

window.bukaOrderKasir = function() {
    window.isKasirMode = true; 
    document.getElementById('view-kasir').classList.add('hidden'); document.getElementById('view-customer').classList.remove('hidden');
    document.getElementById('btn-back-to-kasir').classList.remove('hidden');
    const stafAktif = localStorage.getItem('isOwnerInKasir') === 'true' ? 'Owner' : 'Kasir';
    alert(`[MODE KASIR]\nPilih menu pesanan untuk diinput oleh: ${stafAktif}`);
};

window.kembaliKeDashboardKasir = function() {
    if (window.currentCart && window.currentCart.length > 0) {
        if(!confirm("Ada pesanan belum dibayar. Batalkan pesanan ini?")) return;
        window.currentCart = []; localStorage.removeItem('cartMainstay');
        if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
    }
    document.getElementById('view-customer').classList.add('hidden'); document.getElementById('view-kasir').classList.remove('hidden');
    document.getElementById('btn-back-to-kasir').classList.add('hidden');
};

// 2. Modul Detail Menu & Topping Live
if (!window.originalOpenMenuDetail) window.originalOpenMenuDetail = window.openMenuDetail;
window.openMenuDetail = function(id) {
    const item = window.katalogMenu.find(m => m.id === id);
    if (item && item.stok === 0) { if(typeof window.playAudio === 'function') window.playAudio('masuk'); return alert(`Menu ${item.nama} sedang HABIS (Sold Out).`); }
    
    window.originalOpenMenuDetail(id);
    const varContainer = document.getElementById('detail-variants-container'); window.tempSelectedToppings = [];
    if(varContainer) {
        varContainer.innerHTML = ''; 
        if (item && item.opsiTopping && item.opsiTopping.length > 0) {
            let htmlTopping = `<div class="bg-slate-50 p-4 rounded-2xl border mb-4"><h4 class="text-sm font-black text-gray-900 mb-3"><i class="fa-solid fa-wand-magic-sparkles text-amber-500 mr-2"></i>Tambahan Topping</h4><div class="space-y-2">`;
            item.opsiTopping.forEach(topId => {
                const topData = window.masterTopping.find(t => t.id === topId);
                if(topData) htmlTopping += `<label class="flex items-center justify-between p-3 bg-white rounded-xl border cursor-pointer hover:border-amber-500 transition has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50"><div class="flex items-center gap-3"><input type="checkbox" class="plg-top-cb w-5 h-5 accent-amber-500" value='${JSON.stringify(topData)}' onchange="window.hitungToppingPelanggan()"><span class="text-xs font-bold text-gray-800">${topData.nama}</span></div><span class="text-[10px] font-black text-amber-500">+ Rp ${topData.harga.toLocaleString('id-ID')}</span></label>`;
            });
            varContainer.innerHTML = htmlTopping + `</div></div>`;
        }
    }
};

window.hitungToppingPelanggan = function() { window.tempSelectedToppings = Array.from(document.querySelectorAll('.plg-top-cb:checked')).map(cb => JSON.parse(cb.value)); window.updateDetailPrice(); };
window.updateDetailPrice = function() {
    if (!window.currentMenuDetail) return;
    const total = (parseInt(window.currentMenuDetail.harga) + window.tempSelectedToppings.reduce((s, t) => s + parseInt(t.harga), 0)) * window.qtyCounter;
    if (document.getElementById('detail-total-price')) document.getElementById('detail-total-price').innerText = `Rp ${total.toLocaleString('id-ID')}`;
};

window.addToCart = function() {
    if (!window.currentMenuDetail) return;
    const hargaTop = window.tempSelectedToppings.reduce((s, t) => s + parseInt(t.harga), 0);
    const strTop = window.tempSelectedToppings.map(t => t.nama).join(', ');
    const cartItem = { cartId: Date.now().toString(), id: window.currentMenuDetail.id, nama: window.currentMenuDetail.nama + (strTop ? ` (+ ${strTop})` : ''), harga: parseInt(window.currentMenuDetail.harga) + hargaTop, qty: window.qtyCounter, subtotal: (parseInt(window.currentMenuDetail.harga) + hargaTop) * window.qtyCounter, kategori: window.currentMenuDetail.kategori };
    
    // Cek stok saat add to cart
    const menuAsli = window.katalogMenu.find(m => m.id === cartItem.id);
    if(menuAsli && cartItem.qty > menuAsli.stok) return alert(`Stok ${menuAsli.nama} tidak cukup! (Sisa ${menuAsli.stok})`);

    window.currentCart.push(cartItem); localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.closeMenuDetail(); window.updateCartFloat(); if(typeof window.playAudio === 'function') window.playAudio('masuk'); 
};

// 3. Modifikasi Keranjang (Hapus & Plus Minus)
if (!window.originalOpenCartModal) window.originalOpenCartModal = window.openCartModal;
window.openCartModal = function() {
    window.originalOpenCartModal();
    const cartContainer = document.getElementById('cart-items-container') || document.querySelector('.cart-items');
    if (cartContainer) {
        Array.from(cartContainer.children).forEach((htmlItem, i) => {
            const areaKanan = htmlItem.querySelector('.text-right') || htmlItem.querySelector('div:last-child');
            if (areaKanan && !areaKanan.querySelector('.btn-qty-control')) {
                areaKanan.insertAdjacentHTML('beforeend', `<div class="flex items-center justify-end gap-2 mt-2 btn-qty-control"><button onclick="window.ubahQtyCartItem(${i}, -1)" class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-black">-</button><span class="text-xs font-black w-4 text-center">${window.currentCart[i].qty}</span><button onclick="window.ubahQtyCartItem(${i}, 1)" class="w-6 h-6 bg-slate-100 rounded flex items-center justify-center font-black">+</button></div>`);
            }
            if (!htmlItem.querySelector('.btn-hapus-item')) {
                const flexArea = htmlItem.querySelector('.flex.justify-between') || htmlItem;
                flexArea.insertAdjacentHTML('beforeend', `<button onclick="window.hapusSatuItemKeranjang(${i})" class="btn-hapus-item ml-3 w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center transition shrink-0"><i class="fa-solid fa-trash text-[10px]"></i></button>`);
            }
        });
    }
};

window.ubahQtyCartItem = function(index, jumlahPerubahan) {
    const itemCart = window.currentCart[index];
    if (jumlahPerubahan > 0) {
        const menuAsli = window.katalogMenu.find(m => m.id === itemCart.id);
        if (menuAsli && (itemCart.qty + jumlahPerubahan) > menuAsli.stok) return alert(`Gagal! Sisa stok "${menuAsli.nama}" hanya tinggal ${menuAsli.stok}.`);
    }
    itemCart.qty += jumlahPerubahan; itemCart.subtotal = itemCart.qty * itemCart.harga;
    if (itemCart.qty <= 0) return window.hapusSatuItemKeranjang(index);
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    if (typeof window.updateCartFloat === 'function') window.updateCartFloat();
    window.openCartModal();
};

window.hapusSatuItemKeranjang = function(index) {
    if (confirm("Hapus item ini?")) {
        window.currentCart.splice(index, 1); localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
        if (typeof window.updateCartFloat === 'function') window.updateCartFloat();
        if (window.currentCart.length === 0 && typeof window.closeCartModal === 'function') window.closeCartModal(); else window.openCartModal();
    }
};

// ============================================================================
// MAINSTAY DRINK POS - MASTER CODE (TAHAP 9: KASIR, STRUK THERMAL & OMZET)
// ============================================================================

// 1. Persiapan Checkout Kasir (Membuka Modal)
if (!window.originalProsesCheckout) window.originalProsesCheckout = window.prosesCheckout;
window.prosesCheckout = function() {
    if (window.isKasirMode) {
        if (!window.currentCart || window.currentCart.length === 0) return alert("Keranjang kosong.");
        window.tempTotalBayarKasir = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
        document.getElementById('pay-total').innerText = `Rp ${window.tempTotalBayarKasir.toLocaleString('id-ID')}`;
        document.getElementById('kasir-nama-pelanggan').value = ''; document.getElementById('kasir-input-diskon').value = '';
        
        const dropdown = document.getElementById('kasir-staf-dropdown');
        if (dropdown) {
            dropdown.innerHTML = localStorage.getItem('isOwnerInKasir') === 'true' ? `<option value="Owner">Master Owner</option>` : '';
            (JSON.parse(localStorage.getItem('stafHadirMainstay')) || []).forEach(nama => dropdown.innerHTML += `<option value="${nama}">${nama}</option>`);
        }
        
        window.pilihMetodeKasir('Tunai');
        window.closeCartModal();
        document.getElementById('modal-payment-kasir').classList.remove('hidden'); document.getElementById('modal-payment-kasir').classList.add('flex');
    } else { window.originalProsesCheckout(); }
};
window.tutupPaymentKasir = function() { document.getElementById('modal-payment-kasir').classList.add('hidden'); document.getElementById('modal-payment-kasir').classList.remove('flex'); window.openCartModal(); };

// 2. Kalkulator Uang Cerdas & Diskon
window.pilihMetodeKasir = function(metode) {
    document.getElementById('kasir-metode-terpilih').value = metode;
    const btnTunai = document.getElementById('btn-tunai'); const btnQris = document.getElementById('btn-qris');
    const areaInputUang = document.getElementById('kasir-input-uang-area'); const qrisContainer = document.getElementById('kasir-qris-container');
    
    if (metode === 'QRIS') {
        btnTunai.className = "bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2"; btnQris.className = "bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500";
        areaInputUang.classList.add('hidden'); qrisContainer.classList.remove('hidden'); qrisContainer.classList.add('flex'); window.setUang(window.tempTotalBayarKasir);
    } else {
        btnTunai.className = "bg-amber-500 text-white py-2 rounded-lg text-xs font-black border-2 border-amber-500"; btnQris.className = "bg-white text-gray-500 py-2 rounded-lg text-xs font-black border-2";
        areaInputUang.classList.remove('hidden'); qrisContainer.classList.add('hidden'); qrisContainer.classList.remove('flex'); window.setUang('clear');
    }
};

window.setUang = function(nominal) {
    const inputEl = document.getElementById('pay-input');
    if (nominal === 'clear') inputEl.value = ''; else if (nominal === 0) inputEl.value = window.tempTotalBayarKasir; else inputEl.value = nominal; 
    window.hitungKembalian();
};

window.hitungKembalian = function() {
    const subtotalAsli = window.currentCart.reduce((sum, item) => sum + item.subtotal, 0);
    const inputDiskon = document.getElementById('kasir-input-diskon');
    let diskonManual = parseInt(inputDiskon?.value) || 0;
    if (diskonManual > subtotalAsli) { diskonManual = subtotalAsli; if(inputDiskon) inputDiskon.value = diskonManual; } // Capping

    const totalSetelahDiskon = subtotalAsli - diskonManual;
    const inputUangEl = document.getElementById('pay-input');
    
    // Smart Uang Pas
    if (parseInt(inputUangEl.value) === window.tempTotalBayarKasir && window.tempTotalBayarKasir !== totalSetelahDiskon) inputUangEl.value = totalSetelahDiskon > 0 ? totalSetelahDiskon : '';
    
    window.tempTotalBayarKasir = totalSetelahDiskon; 
    document.getElementById('pay-total').innerText = `Rp ${totalSetelahDiskon.toLocaleString('id-ID')}`;

    const inputUangStr = inputUangEl.value; const uangDiterima = inputUangStr === '' ? 0 : parseInt(inputUangStr);
    const elKembali = document.getElementById('pay-kembalian'); const kembalian = uangDiterima - totalSetelahDiskon;

    if (inputUangStr === '') { elKembali.innerText = "MENUNGGU UANG"; elKembali.className = "text-xl font-black text-amber-500 uppercase"; } 
    else if (kembalian < 0) { elKembali.innerText = "UANG KURANG!"; elKembali.className = "text-2xl font-black text-red-500 uppercase"; } 
    else { elKembali.innerText = `Rp ${kembalian.toLocaleString('id-ID')}`; elKembali.className = "text-2xl font-black text-green-500"; }
};

// 3. Finalisasi Eksekusi (Anti Spam, Potong Stok, Simpan Data)
window.finalisasiPembayaranKasir = async function() {
    if (window.isProcessingCheckout) return; window.isProcessingCheckout = true;

    const inputUangStr = document.getElementById('pay-input').value; const uangDiterima = inputUangStr === '' ? 0 : parseInt(inputUangStr);
    const kembalian = uangDiterima - window.tempTotalBayarKasir;
    const metode = document.getElementById('kasir-metode-terpilih').value;
    
    if (kembalian < 0 && metode === 'Tunai') { window.isProcessingCheckout = false; return alert("Pembayaran ditolak. Uang kurang!"); }

    // Race Condition: Cek stok di detik terakhir
    let barangKurang = [];
    window.currentCart.forEach(cartItem => {
        let menuIdx = window.katalogMenu.findIndex(m => m.id === cartItem.id);
        if(menuIdx > -1 && window.katalogMenu[menuIdx].stok < cartItem.qty) barangKurang.push(`${cartItem.nama} (Sisa: ${window.katalogMenu[menuIdx].stok})`);
    });
    if (barangKurang.length > 0) { window.isProcessingCheckout = false; return alert(`CHECKOUT GAGAL! Stok kedahuluan habis:\n- ${barangKurang.join('\n- ')}`); }

    // Potong Stok
    window.currentCart.forEach(cartItem => { let menuIdx = window.katalogMenu.findIndex(m => m.id === cartItem.id); if (menuIdx > -1) { window.katalogMenu[menuIdx].stok = Math.max(0, window.katalogMenu[menuIdx].stok - cartItem.qty); } });
    localStorage.setItem('mainstay_dbMenu', JSON.stringify(window.katalogMenu));
    if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'katalog_menu'), window.katalogMenu);
    if (typeof window.renderKatalog === 'function') window.renderKatalog();

    // Siapkan Data Transaksi
    const namaPlgInp = document.getElementById('kasir-nama-pelanggan')?.value.trim();
    const diskonManual = parseInt(document.getElementById('kasir-input-diskon')?.value) || 0;
    
    const dataTransaksi = {
        waktu: new Date().toISOString(), noStruk: `ORD-${Date.now().toString().slice(-4)}`, pelanggan: namaPlgInp !== '' ? window.escapeHTML(namaPlgInp) : "Walk-in", 
        kasir: document.getElementById('kasir-staf-dropdown') ? document.getElementById('kasir-staf-dropdown').value : 'Kasir', 
        metodePembayaran: metode, item: [...window.currentCart], diskon: diskonManual, totalTagihan: window.tempTotalBayarKasir, uangDiterima: uangDiterima, uangKembali: kembalian, statusDapur: 'selesai'
    };
    
    // Simpan ke Firebase & Lokal
    if (window.db && window.fbPush && window.fbSet) {
        try { const trRef = window.fbPush(window.fbRef(window.db, 'transaksi_hari_ini')); await window.fbSet(trRef, dataTransaksi); } catch (e) { console.error("Simpan cloud gagal:", e); }
    }
    window.riwayatTransaksiLokal.push(dataTransaksi); localStorage.setItem('mainstay_dbTransaksi', JSON.stringify(window.riwayatTransaksiLokal));

    document.getElementById('modal-payment-kasir').classList.add('hidden'); document.getElementById('modal-payment-kasir').classList.remove('flex');
    if(typeof window.kirimKeSpreadsheet === 'function') window.kirimKeSpreadsheet(dataTransaksi);
    
    // Cetak Struk
    window.cetakStrukThermal(dataTransaksi);
    
    // Reset Bersih
    window.currentCart = []; localStorage.removeItem('cartMainstay'); if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
    document.getElementById('kasir-nama-pelanggan').value = ''; document.getElementById('kasir-input-diskon').value = '';
    window.pilihMetodeKasir('Tunai'); document.getElementById('btn-back-to-kasir').classList.add('hidden');
    document.getElementById('view-customer').classList.add('hidden'); document.getElementById('view-kasir').classList.remove('hidden');

    setTimeout(() => { window.isProcessingCheckout = false; }, 2000);
};

// 4. Engine Cetak Struk Thermal 58mm
window.cetakStrukThermal = function(data) {
    let itemHTML = ''; data.item.forEach(i => { itemHTML += `<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;"><span style="flex:1;">${i.nama} x${i.qty}</span><span style="font-weight:bold;">${(i.harga * i.qty).toLocaleString('id-ID')}</span></div>`; });
    const tgl = new Date(data.waktu); const waktuLokal = `${tgl.getDate().toString().padStart(2, '0')}/${(tgl.getMonth()+1).toString().padStart(2, '0')}/${tgl.getFullYear()} ${tgl.getHours().toString().padStart(2, '0')}:${tgl.getMinutes().toString().padStart(2, '0')}`;
    
    const printContent = `
        <html><head><style>body { font-family: 'Courier New', Courier, monospace; width: 58mm; margin: 0 auto; color: #000; } h2 { text-align: center; font-size: 16px; margin-bottom: 2px; } p { text-align: center; font-size: 10px; margin-top: 0; margin-bottom: 10px; } .line { border-top: 1px dashed #000; margin: 10px 0; } .bold { font-weight: bold; }</style></head>
        <body>
            <h2>MAINSTAY DRINK</h2>
            <p>Order: ${data.noStruk}<br>Kasir: ${data.kasir}<br>Plg: ${data.pelanggan}<br>Waktu: ${waktuLokal}</p>
            <div class="line"></div>${itemHTML}<div class="line"></div>
            <div style="display:flex; justify-content:space-between; font-size:12px;"><span>Subtotal:</span><span>${(data.totalTagihan + data.diskon).toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:red;"><span>Diskon:</span><span>-${data.diskon.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:14px;" class="bold"><span>TOTAL:</span><span>${data.totalTagihan.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-top:5px;"><span>${data.metodePembayaran}:</span><span>${data.uangDiterima.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:12px;"><span>Kembali:</span><span>${data.uangKembali.toLocaleString('id-ID')}</span></div>
            <div class="line"></div><p>Terima Kasih!<br>Powered by Mainstay POS</p>
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body></html>`;
    
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (printWindow) { printWindow.document.write(printContent); printWindow.document.close(); }
};

// 5. Panel Omzet & Log Absensi Owner
window.bukaRiwayatTransaksi = function() {
    const list = document.getElementById('list-riwayat-transaksi'); list.innerHTML = '';
    const riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || [];
    if (riwayat.length === 0) { list.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Belum ada transaksi.</div>`; } 
    else {
        [...riwayat].reverse().forEach((tr, index) => {
            const strItem = tr.item.map(i => `${i.nama} (x${i.qty})`).join(', ');
            list.innerHTML += `<div class="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-2"><div class="flex justify-between items-start border-b pb-2"><div><span class="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-black">${tr.noStruk}</span><span class="text-[9px] text-gray-400 ml-2 font-bold">${new Date(tr.waktu).toLocaleTimeString('id-ID')}</span></div><span class="text-sm font-black text-gray-900">Rp ${tr.totalTagihan.toLocaleString('id-ID')}</span></div><p class="text-xs font-bold text-gray-600 line-clamp-2">${strItem}</p><div class="flex justify-between items-center mt-1"><div class="text-[10px] font-bold text-gray-400 flex flex-col"><span>Oleh: ${tr.kasir} | Plg: ${tr.pelanggan}</span><span class="text-amber-500 uppercase">${tr.metodePembayaran}</span></div><button onclick="window.cetakUlangStruk(${index})" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[9px] font-black border"><i class="fa-solid fa-print mr-1"></i> Cetak Ulang</button></div></div>`;
        });
    }
    document.getElementById('modal-riwayat-transaksi').classList.remove('hidden'); document.getElementById('modal-riwayat-transaksi').classList.add('flex');
};
window.tutupRiwayatTransaksi = function() { document.getElementById('modal-riwayat-transaksi').classList.add('hidden'); document.getElementById('modal-riwayat-transaksi').classList.remove('flex'); };
window.cetakUlangStruk = function(reverseIndex) { const riwayat = JSON.parse(localStorage.getItem('mainstay_dbTransaksi')) || []; window.cetakStrukThermal([...riwayat].reverse()[reverseIndex]); };

window.bukaRiwayatAbsen = function() {
    const list = document.getElementById('list-riwayat-absen'); list.innerHTML = '';
    if (window.riwayatAbsensi.length === 0) { list.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-xs border-2 border-dashed rounded-2xl">Belum ada absen.</div>`; } 
    else {
        [...window.riwayatAbsensi].reverse().forEach(log => {
            const tgl = new Date(log.waktu); const strWaktu = `${tgl.getDate()}/${tgl.getMonth()+1}/${tgl.getFullYear()} - ${tgl.getHours().toString().padStart(2, '0')}:${tgl.getMinutes().toString().padStart(2, '0')}`;
            const imgHTML = log.foto ? `<img src="${log.foto}" class="w-12 h-12 rounded-xl object-cover border">` : `<div class="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400"><i class="fa-solid fa-user-slash"></i></div>`;
            const durasiBadge = log.durasi && log.durasi !== "-" ? `<span class="block mt-1 text-[9px] font-black text-indigo-500"><i class="fa-solid fa-stopwatch"></i> Kerja: ${log.durasi}</span>` : '';
            list.innerHTML += `<div class="bg-white p-3 rounded-xl border flex gap-4 shadow-sm items-center">${imgHTML}<div class="flex-1"><h4 class="text-xs font-black text-gray-900">${log.nama}</h4><p class="text-[9px] font-bold text-gray-400">${strWaktu}</p>${durasiBadge}</div><div class="shrink-0"><span class="${log.tipe === 'Masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded text-[9px] font-black uppercase">${log.tipe}</span></div></div>`;
        });
    }
    document.getElementById('modal-riwayat-absen').classList.remove('hidden'); document.getElementById('modal-riwayat-absen').classList.add('flex');
};
window.tutupRiwayatAbsen = function() { document.getElementById('modal-riwayat-absen').classList.add('hidden'); document.getElementById('modal-riwayat-absen').classList.remove('flex'); };
window.bersihkanRiwayatAbsen = function() { if(confirm("Hapus semua riwayat absen?")) { window.riwayatAbsensi = []; localStorage.setItem('mainstay_dbAbsen', JSON.stringify([])); if (window.db && window.fbSet) window.fbSet(window.fbRef(window.db, 'riwayat_absen'), []); window.bukaRiwayatAbsen(); } };

// ============================================================================
// SYSTEM REBUILD COMPLETE: 100% UNIFIED, ZERO STACKING BUGS, ENTERPRISE READY.
// ============================================================================
// ============================================================================
// PATCH PENGHUBUNG TOMBOL LOGIN HTML (MODAL CONTROLLER)
// ============================================================================

window.bukaLoginModal = function(role) {
    // Memberitahu sistem siapa yang sedang mencoba login ('kasir' atau 'owner')
    window.targetLoginRole = role; 
    
    // Membuka jendela pop-up login
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    // Kosongkan kolom PIN dan sembunyikan pesan error sebelumnya
    const pinInput = document.getElementById('login-pin');
    if (pinInput) pinInput.value = '';
    
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.add('hidden');
};

window.closeLoginModal = function() {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};
// ============================================================================
// SUPER RESCUE PATCH (BYPASS LOGIN & FORCE VIEW SWITCH)
// ============================================================================

// 1. MEMASTIKAN LAYAR BENAR-BENAR BERPINDAH (MENGGANTIKAN FUNGSI BAWAAN)
window.switchRoleView = function(role) {
    // Cari semua kemungkinan ID layar di HTML Anda
    const viewCustomer = document.getElementById('view-customer');
    const viewKasir = document.getElementById('view-kasir');
    const viewOwner = document.getElementById('view-owner') || document.getElementById('view-admin') || document.getElementById('panel-owner');

    // Sembunyikan semuanya
    if (viewCustomer) viewCustomer.classList.add('hidden');
    if (viewKasir) viewKasir.classList.add('hidden');
    if (viewOwner) viewOwner.classList.add('hidden');

    // Munculkan layar yang diminta
    if (role === 'customer' && viewCustomer) viewCustomer.classList.remove('hidden');
    if (role === 'kasir' && viewKasir) viewKasir.classList.remove('hidden');
    if (role === 'owner' && viewOwner) viewOwner.classList.remove('hidden');

    // Logika Tombol Melayang Kasir
    const btnPlus = document.getElementById('btn-plus-order-kasir'); 
    const btnPulang = document.getElementById('btn-absen-pulang');
    if (btnPlus) btnPlus.classList.toggle('hidden', role !== 'kasir');
    if (btnPulang) btnPulang.classList.toggle('hidden', role !== 'kasir');
};

// 2. FUNGSI LOGIN ANTI-GAGAL & BYPASS SUPER ADMIN
window.prosesLogin = function() {
    // Cari input PIN (Berjaga-jaga jika ID HTML Anda berbeda)
    const pinInput = document.getElementById('login-pin') || document.querySelector('input[type="password"]');
    const pin = pinInput ? pinInput.value : '';
    const errorEl = document.getElementById('login-error');

    if (!pin) {
        alert("Harap masukkan PIN!");
        return;
    }

    // Amankan data Owner jika memori (LocalStorage) corrupt
    if (!window.profilOwner || !window.profilOwner.pin) {
        window.profilOwner = { nama: "Master Owner", pin: "888888" };
    }

    // KUNCI MASTER DARURAT (SUPER ADMIN BYPASS)
    if (pin === '999999') {
         window.profilOwner.pin = '888888'; // Reset PIN kembali ke default
         localStorage.setItem('mainstay_dbOwner', JSON.stringify(window.profilOwner));
         window.closeLoginModal();
         window.switchRoleView('owner');
         alert("SISTEM RESCUE AKTIF!\nAnda masuk menggunakan jalur Super Admin.\nPIN Master Owner telah di-reset kembali menjadi: 888888");
         return;
    }

    const staf = window.databaseStaf ? window.databaseStaf.find(s => s.pin === pin) : null;

    if (pin === window.profilOwner.pin) {
        // Jika PIN Owner
        window.closeLoginModal();
        if (window.targetLoginRole === 'kasir') {
            localStorage.setItem('isOwnerInKasir', 'true');
            document.getElementById('kasir-blocker')?.classList.add('hidden');
            window.switchRoleView('kasir');
            window.isKasirMode = true; 
        } else {
            window.switchRoleView('owner');
        }
    } else if (staf) {
        // Jika PIN Staf
        localStorage.setItem('isOwnerInKasir', 'false');
        window.closeLoginModal();
        window.switchRoleView('kasir');
        window.isKasirMode = true; 
        
        let stafHadir = JSON.parse(localStorage.getItem('stafHadirMainstay')) || [];
        if (stafHadir.length > 0) document.getElementById('kasir-blocker')?.classList.add('hidden');
        else document.getElementById('kasir-blocker')?.classList.remove('hidden');
    } else {
        // Jika PIN Salah
        if (errorEl) {
            errorEl.classList.remove('hidden');
            errorEl.innerText = "PIN Salah!";
        } else {
            alert("PIN Salah atau Tidak Terdaftar!");
        }
    }
};

window.closeLoginModal = function() {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    const pinInput = document.getElementById('login-pin') || document.querySelector('input[type="password"]');
    if (pinInput) pinInput.value = ''; // Kosongkan saat ditutup
};
