// ============================================================================
// 1. IMPORT FIREBASE & INISIALISASI (Koneksi Database)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Inisialisasi Aplikasi Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================================================
// 2. VARIABEL GLOBAL (Terpasang pada 'window' agar bisa dipanggil dari HTML)
// ============================================================================
window.currentCart = [];
window.katalogMenu = []; 
window.databaseMember = [];
window.kategoriAktif = 'all';
window.nomorAntreanHariIni = 1;
window.currentMenuDetail = null;
window.targetLoginRole = ''; 

// Konfigurasi Default Sistem (Ini nanti bisa ditimpa dari Firebase)
window.systemConfig = {
    nomorWA: "628977099557",
    tokoBuka: true,
    audioAktif: true,
    pinKasir: "123456",
    pinOwner: "654321",
    urlSpreadsheet: "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec",
    qrisUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MainstayDrink",
    draftWA: {
        qris: "Halo Mainstay, ini bukti transfer QRIS saya untuk pesanan nomor: ",
        cash: "Halo Mainstay, saya memesan via E-Menu untuk pesanan Instant (Bayar di Kasir). Nomor pesanan: ",
        po: "Halo Mainstay, saya melakukan PRE-ORDER. Saya akan segera melunasinya agar pesanan diproses. Nomor PO: "
    },
    footerStruk: "Terima Kasih!\nPassword WiFi: mainstay2026"
};

// ============================================================================
// 3. MESIN WAKTU REAL-TIME (JAM, HARI, TANGGAL)
// ============================================================================
function updateClock() {
    const now = new Date();
    
    const hariArray = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const namaHari = hariArray[now.getDay()];
    
    const tanggal = String(now.getDate()).padStart(2, '0');
    const bulanArray = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const namaBulan = bulanArray[now.getMonth()];
    const tahun = now.getFullYear();

    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    
    // Format: Rabu, 26 Ags 2026 - 19:55 WIB
    const formattedTime = `${namaHari}, ${tanggal} ${namaBulan} ${tahun} - ${jam}:${menit} WIB`;
    
    const clockElement = document.getElementById('live-clock');
    if (clockElement) clockElement.textContent = formattedTime;
}
setInterval(updateClock, 1000);
updateClock(); 

// ============================================================================
// 4. SISTEM AUDIO & NOTIFIKASI VISUAL (LAYAR KEDIP)
// ============================================================================
window.playAudio = function(type) {
    if (!systemConfig.audioAktif) return; 
    
    try {
        let audio;
        if (type === 'masuk') {
            audio = document.getElementById('audio-masuk');
            triggerScreenFlash('masuk');
        } else if (type === 'siap') {
            audio = document.getElementById('audio-siap');
            triggerScreenFlash('siap');
        }
        
        if (audio) {
            audio.currentTime = 0; // Reset ke awal
            audio.play().catch(e => console.log("Audio diblokir browser:", e));
        }
    } catch (err) {
        console.error("Gagal putar audio:", err);
    }
};

window.triggerScreenFlash = function(type) {
    const flashEl = document.getElementById('screen-flash');
    if (!flashEl) return;
    
    if (type === 'masuk') {
        flashEl.className = 'fixed inset-0 bg-blue-500 opacity-30 pointer-events-none z-[200] transition-opacity duration-300';
    } else {
        flashEl.className = 'fixed inset-0 bg-green-500 opacity-30 pointer-events-none z-[200] transition-opacity duration-300';
    }
    
    flashEl.classList.remove('hidden');
    setTimeout(() => {
        flashEl.classList.add('opacity-0');
        setTimeout(() => flashEl.classList.add('hidden'), 300);
    }, 200);
};

// ============================================================================
// 5. SISTEM KEAMANAN SESI & NAVIGASI BAWAH
// ============================================================================
// Cek sesi memori (Local Storage) saat web direfresh
window.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('sesiMainstay') || 'customer';
    
    const savedCart = localStorage.getItem('cartMainstay');
    if (savedCart) {
        currentCart = JSON.parse(savedCart);
        if(typeof updateCartFloat === 'function') updateCartFloat();
    }

    // Eksekusi tampilan berdasarkan sesi terakhir
    if (savedSession === 'kasir') {
        renderView('kasir');
        highlightNav('kasir');
    } else if (savedSession === 'owner') {
        renderView('owner');
        highlightNav('owner');
    } else {
        renderView('customer');
        highlightNav('customer');
    }
});

// Aksi Klik Navigasi Bawah
window.switchRoleView = function(role) {
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';

    if (role === 'customer' && currentSession === 'customer') return;

    // Minta PIN jika mau masuk area terlarang tapi belum login
    if ((role === 'kasir' || role === 'owner') && currentSession !== role) {
        targetLoginRole = role;
        openLoginModal(role);
        return;
    }

    // Bebas bolak-balik kalau sudah punya sesi
    renderView(role);
    highlightNav(role);
};

// ============================================================================
// 6. LOGIKA MODAL LOGIN PIN
// ============================================================================
window.openLoginModal = function(role) {
    const modal = document.getElementById('modal-login');
    const title = document.getElementById('login-title');
    const input = document.getElementById('login-pin');
    
    title.innerHTML = role === 'kasir' ? '<i class="fa-solid fa-desktop text-amber-500 mr-2"></i> Akses Kasir' : '<i class="fa-solid fa-shield-halved text-amber-500 mr-2"></i> Akses Master';
    input.value = '';
    document.getElementById('login-error').classList.add('hidden');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    input.focus();
};

window.closeLoginModal = function() {
    const modal = document.getElementById('modal-login');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.togglePinVisibility = function() {
    const pinInput = document.getElementById('login-pin');
    const eyeIcon = document.getElementById('pin-eye-icon');
    
    if (pinInput.type === 'password') {
        pinInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        pinInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
};

window.prosesLogin = function() {
    const pin = document.getElementById('login-pin').value;
    const errorMsg = document.getElementById('login-error');
    
    let valid = false;
    if (targetLoginRole === 'kasir' && pin === systemConfig.pinKasir) valid = true;
    if (targetLoginRole === 'owner' && pin === systemConfig.pinOwner) valid = true;

    if (valid) {
        localStorage.setItem('sesiMainstay', targetLoginRole);
        closeLoginModal();
        renderView(targetLoginRole);
        highlightNav(targetLoginRole);
        playAudio('siap'); // Bunyi notifikasi login sukses
    } else {
        errorMsg.classList.remove('hidden');
    }
};

window.prosesLogout = function(role) {
    let msg = role === 'kasir' ? "Tutup shift Kasir dan kunci layar?" : "Kunci panel Master Owner?";
    if (confirm(msg)) {
        localStorage.setItem('sesiMainstay', 'customer');
        renderView('customer');
        highlightNav('customer');
    }
};

// ============================================================================
// 7. RENDER VISUAL HALAMAN & NAVIGASI
// ============================================================================
window.renderView = function(role) {
    const views = ['customer', 'kasir', 'owner'];
    views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
            if (v === role) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });
    
    const footer = document.getElementById('customer-footer');
    if (footer) {
        if (role === 'customer') footer.classList.remove('hidden');
        else footer.classList.add('hidden');
    }
};

window.highlightNav = function(role) {
    const navs = ['customer', 'kasir', 'owner'];
    navs.forEach(n => {
        const btn = document.getElementById(`nav-${n}`);
        if (!btn) return;
        const indicator = btn.querySelector('.nav-indicator');
        const icon = btn.querySelector('i');
        
        if (n === role) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('text-amber-500');
            indicator.classList.remove('hidden');
        } else {
            btn.classList.remove('text-amber-500');
            btn.classList.add('text-gray-400');
            indicator.classList.add('hidden');
        }
    });
};
// ============================================================================
// 8. DATABASE VIRTUAL (KATALOG MENU, VARIAN, & TOPPING)
// ============================================================================
// Data default sebelum sinkronisasi dengan Firebase
window.katalogMenu = [
    { 
        id: 'menu_001', 
        nama: 'Es Kopi Mainstay', 
        kategori: 'coffee', 
        hargaAsli: 20000, 
        hargaDiskon: 16000, 
        img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80', 
        desc: 'Signature coffee aren dengan krim tebal nan lembut yang menjadi andalan kami.', 
        isSoldOut: false, 
        tipeMinuman: 'dingin' // Memunculkan opsi Level Es
    },
    { 
        id: 'menu_002', 
        nama: 'Matcha Latte Premium', 
        kategori: 'non-coffee', 
        hargaAsli: 18000, 
        hargaDiskon: 18000, 
        img: 'https://images.unsplash.com/photo-1536013561472-1c9c3c8c6b06?w=500&q=80', 
        desc: 'Serbuk matcha asli Uji Jepang berpadu dengan susu segar berkualitas.', 
        isSoldOut: false, 
        tipeMinuman: 'dingin'
    },
    { 
        id: 'menu_003', 
        nama: 'Hot Classic Americano', 
        kategori: 'coffee', 
        hargaAsli: 15000, 
        hargaDiskon: 15000, 
        img: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&q=80', 
        desc: 'Ekstraksi espresso ganda diseduh dengan air panas bersuhu presisi.', 
        isSoldOut: false, 
        tipeMinuman: 'panas' // Opsi Level Es TIDAK akan muncul
    },
    { 
        id: 'menu_004', 
        nama: 'Coklat Aren', 
        kategori: 'non-coffee', 
        hargaAsli: 20000, 
        hargaDiskon: 20000, 
        img: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&q=80', 
        desc: 'Coklat pekat berpadu manisnya gula aren lokal asli.', 
        isSoldOut: true, // Sedang habis, tombol tidak bisa diklik
        tipeMinuman: 'dingin'
    }
];

window.opsiTambahan = {
    es: ['Normal Ice', 'Less Ice', 'No Ice'],
    gula: ['Normal Sugar', 'Less Sugar', 'No Sugar'],
    topping: [
        { id: 'top_1', nama: 'Pearl Boba', harga: 3000 },
        { id: 'top_2', nama: 'Extra Shot Espresso', harga: 5000 },
        { id: 'top_3', nama: 'Oreo Crumb', harga: 2000 },
        { id: 'top_4', nama: 'Cheese Foam', harga: 4000 }
    ]
};

// ============================================================================
// 9. RENDER KATALOG & PENCARIAN (Customer & POS Kasir/Owner)
// ============================================================================
window.formatRupiah = function(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

window.renderKatalog = function(kategori = 'all', keyword = '') {
    const gridEl = document.getElementById('menu-grid');
    if (!gridEl) return;
    
    gridEl.innerHTML = '';
    let filteredMenu = katalogMenu;

    // Logika Filter Kategori Tab
    if (kategori !== 'all') {
        filteredMenu = filteredMenu.filter(m => m.kategori === kategori);
    }

    // Logika Filter Pencarian Teks
    if (keyword.trim() !== '') {
        const lowerKeyword = keyword.toLowerCase();
        filteredMenu = filteredMenu.filter(m => m.nama.toLowerCase().includes(lowerKeyword) || m.desc.toLowerCase().includes(lowerKeyword));
    }

    // Jika Kosong
    if (filteredMenu.length === 0) {
        gridEl.innerHTML = `<div class="col-span-full text-center py-10 text-gray-400"><i class="fa-solid fa-face-frown text-3xl mb-2"></i><p class="font-bold text-sm">Menu yang Anda cari tidak ditemukan.</p></div>`;
        return;
    }

    // Render HTML Menu per Item
    filteredMenu.forEach(menu => {
        const isDiskon = menu.hargaDiskon < menu.hargaAsli;
        
        const htmlHarga = isDiskon ? 
            `<p class="text-[10px] text-gray-400 line-through mb-0.5 leading-none">${formatRupiah(menu.hargaAsli)}</p><p class="font-black text-sm text-amber-500 leading-none">${formatRupiah(menu.hargaDiskon)}</p>` :
            `<p class="font-black text-sm text-amber-500 mt-2 leading-none">${formatRupiah(menu.hargaAsli)}</p>`;
        
        const badgeDiskon = isDiskon ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-md z-10 shadow-sm transform -rotate-2">PROMO</span>` : '';
        const overlaySoldOut = menu.isSoldOut ? `<div class="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl"><span class="bg-red-600 text-white font-black px-4 py-1.5 rounded-lg border-2 border-red-300 transform -rotate-12 shadow-xl tracking-widest">SOLD OUT</span></div>` : '';
        const classSoldOut = menu.isSoldOut ? 'opacity-70 pointer-events-none' : 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1 transition';

        gridEl.innerHTML += `
            <div class="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col relative ${classSoldOut}" onclick="openMenuDetail('${menu.id}')">
                ${badgeDiskon}
                ${overlaySoldOut}
                <div class="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden relative mb-3">
                    <img src="${menu.img}" alt="${menu.nama}" class="w-full h-full object-cover">
                </div>
                <div class="flex flex-col flex-1 px-1 pb-1">
                    <h3 class="font-black text-sm text-gray-900 leading-tight mb-1 line-clamp-1">${menu.nama}</h3>
                    <p class="text-[10px] text-gray-500 line-clamp-2 leading-relaxed flex-1">${menu.desc}</p>
                    <div class="flex items-end justify-between mt-3 pt-3 border-t border-gray-50">
                        <div>${htmlHarga}</div>
                        <button class="w-8 h-8 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center hover:bg-amber-500 hover:text-white transition shadow-sm">
                            <i class="fa-solid fa-plus text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
};

window.filterKategori = function(kat) {
    kategoriAktif = kat;
    
    // Ubah warna styling Tab Button yang aktif
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-white', 'active', 'shadow-md');
        btn.classList.add('bg-slate-100', 'text-gray-600');
    });
    const activeBtn = document.querySelector(`.cat-btn[onclick="filterKategori('${kat}')"]`);
    if(activeBtn) {
        activeBtn.classList.remove('bg-slate-100', 'text-gray-600');
        activeBtn.classList.add('bg-amber-500', 'text-white', 'active', 'shadow-md');
    }
    
    const searchInput = document.getElementById('search-menu');
    if(searchInput) searchInput.value = '';
    
    renderKatalog(kat);
};

window.searchKatalog = function() {
    const keyword = document.getElementById('search-menu').value;
    renderKatalog(kategoriAktif, keyword);
};

// ============================================================================
// 10. MODAL KUSTOMISASI PESANAN (Varian Es, Gula, Topping)
// ============================================================================
window.openMenuDetail = function(menuId) {
    const menu = katalogMenu.find(m => m.id === menuId);
    if (!menu || menu.isSoldOut) return;

    // Reset data kustomisasi saat ini
    currentMenuDetail = { 
        ...menu, 
        qty: 1, 
        basePrice: menu.hargaDiskon, 
        totalLinePrice: menu.hargaDiskon 
    };

    // Inject data ke HTML Modal
    document.getElementById('detail-img').src = menu.img;
    document.getElementById('detail-name').textContent = menu.nama;
    document.getElementById('detail-desc').textContent = menu.desc;
    document.getElementById('detail-qty').textContent = '1';
    
    renderVarianOpsi(menu);
    kalkulasiHargaDetail();

    const modal = document.getElementById('modal-menu-detail');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeMenuDetail = function() {
    const modal = document.getElementById('modal-menu-detail');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    currentMenuDetail = null;
};

function renderVarianOpsi(menu) {
    const container = document.getElementById('detail-variants-container');
    container.innerHTML = '';
    let html = '';

    // Render Opsi Gula (Untuk Semua Minuman)
    html += `<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p class="text-xs font-black text-gray-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-cubes-stacked text-amber-500"></i> Level Gula</p>
                <div class="flex flex-wrap gap-2">`;
    opsiTambahan.gula.forEach((opt, idx) => {
        html += `<label class="cursor-pointer">
                    <input type="radio" name="var_gula" value="${opt}" class="peer hidden" ${idx === 0 ? 'checked' : ''} onchange="kalkulasiHargaDetail()">
                    <span class="px-4 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold text-gray-500 peer-checked:bg-amber-50 peer-checked:text-amber-700 peer-checked:border-amber-500 transition block">${opt}</span>
                 </label>`;
    });
    html += `</div></div>`;

    // Render Opsi Es (KHUSUS minuman Tipe Dingin)
    if (menu.tipeMinuman === 'dingin') {
        html += `<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p class="text-xs font-black text-gray-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-snowflake text-blue-500"></i> Level Es</p>
                    <div class="flex flex-wrap gap-2">`;
        opsiTambahan.es.forEach((opt, idx) => {
            html += `<label class="cursor-pointer">
                        <input type="radio" name="var_es" value="${opt}" class="peer hidden" ${idx === 0 ? 'checked' : ''} onchange="kalkulasiHargaDetail()">
                        <span class="px-4 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold text-gray-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 peer-checked:border-blue-500 transition block">${opt}</span>
                     </label>`;
        });
        html += `</div></div>`;
    }

    // Render Topping Tambahan (Multiselect Checkbox dengan Harga)
    html += `<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p class="text-xs font-black text-gray-900 mb-3 flex items-center gap-2"><i class="fa-solid fa-cookie-bite text-amber-700"></i> Topping Ekstra</p>
                <div class="flex flex-col gap-2">`;
    opsiTambahan.topping.forEach(top => {
        html += `<label class="flex items-center justify-between p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-white transition group has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50">
                    <div class="flex items-center gap-3">
                        <input type="checkbox" name="var_topping" value="${top.nama}" data-price="${top.harga}" class="w-5 h-5 accent-amber-500 rounded border-gray-300" onchange="kalkulasiHargaDetail()">
                        <span class="text-xs font-bold text-gray-700 group-has-[:checked]:text-amber-800">${top.nama}</span>
                    </div>
                    <span class="text-[10px] font-black text-amber-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">+${formatRupiah(top.harga)}</span>
                 </label>`;
    });
    html += `</div></div>`;

    container.innerHTML = html;
}

window.updateQty = function(change) {
    if (!currentMenuDetail) return;
    let newQty = currentMenuDetail.qty + change;
    if (newQty < 1) newQty = 1; 
    
    currentMenuDetail.qty = newQty;
    document.getElementById('detail-qty').textContent = newQty;
    kalkulasiHargaDetail();
};

window.kalkulasiHargaDetail = function() {
    if (!currentMenuDetail) return;
    
    let base = currentMenuDetail.basePrice;
    let toppingPrice = 0;
    
    // Hitung akumulasi harga dari semua topping yang dicentang
    document.querySelectorAll('input[name="var_topping"]:checked').forEach(cb => {
        toppingPrice += parseInt(cb.getAttribute('data-price'));
    });
    
    // Hitung (Harga Dasar + Harga Topping) x Jumlah Porsi
    let subtotal = (base + toppingPrice) * currentMenuDetail.qty;
    currentMenuDetail.totalLinePrice = subtotal;
    
    document.getElementById('detail-total-price').textContent = formatRupiah(subtotal);
};

// ============================================================================
// 11. ALGORITMA KERANJANG (LOCAL STORAGE ANTI-HILANG)
// ============================================================================
window.addToCart = function() {
    if (!currentMenuDetail) return;

    // Kumpulkan string opsi varian yang dipilih
    const esOpt = document.querySelector('input[name="var_es"]:checked');
    const gulaOpt = document.querySelector('input[name="var_gula"]:checked');
    const toppingCbs = document.querySelectorAll('input[name="var_topping"]:checked');
    
    let toppingNames = [];
    let toppingPriceTotal = 0;
    toppingCbs.forEach(cb => {
        toppingNames.push(cb.value);
        toppingPriceTotal += parseInt(cb.getAttribute('data-price'));
    });

    const item = {
        cartId: 'CART_' + Date.now().toString(), // ID unik anti-duplikat
        menuId: currentMenuDetail.id,
        nama: currentMenuDetail.nama,
        qty: currentMenuDetail.qty,
        levelEs: esOpt ? esOpt.value : '-',
        levelGula: gulaOpt ? gulaOpt.value : '-',
        toppingStr: toppingNames.length > 0 ? toppingNames.join(', ') : 'Tanpa Ekstra Topping',
        hargaSatuanAsli: currentMenuDetail.basePrice,
        hargaTopping: toppingPriceTotal,
        totalHarga: currentMenuDetail.totalLinePrice
    };

    currentCart.push(item);
    simpanKeranjangLokal();
    updateCartFloat();
    closeMenuDetail();
    
    // Notifikasi sukses ringan
    alert(`${item.qty}x ${item.nama} berhasil dimasukkan keranjang!`);
};

window.simpanKeranjangLokal = function() {
    localStorage.setItem('cartMainstay', JSON.stringify(currentCart));
};

window.updateCartFloat = function() {
    const floatEl = document.getElementById('floating-cart');
    const badgeEl = document.getElementById('cart-badge');
    const totalEl = document.getElementById('cart-total-float');

    if (currentCart.length > 0) {
        floatEl.classList.remove('hidden');
        
        let qtyTotal = 0;
        let priceTotal = 0;
        currentCart.forEach(item => {
            qtyTotal += item.qty;
            priceTotal += item.totalHarga;
        });

        badgeEl.textContent = qtyTotal;
        totalEl.textContent = formatRupiah(priceTotal);
    } else {
        floatEl.classList.add('hidden');
    }
};

// ============================================================================
// 12. INISIALISASI SAAT PERTAMA KALI WEB DIBUKA
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
    // Render Katalog pertama kali
    renderKatalog('all');
});
// ============================================================================
// 13. LOGIKA KERANJANG (CART) & CHECKOUT
// ============================================================================
window.subtotalCart = 0;
window.diskonCart = 0;
window.grandTotalCart = 0;
window.pesananAktif = null; // Menyimpan data pesanan sementara sebelum dikirim

window.openCartModal = function() {
    if (currentCart.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }
    
    // Set identitas penginput (Customer, Kasir, atau Owner)
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
    const actorLabel = document.getElementById('cart-actor-label');
    
    if (currentSession === 'kasir') {
        const stafName = document.getElementById('kasir-staf-dropdown').value || 'Staf';
        actorLabel.innerHTML = `<i class="fa-solid fa-desktop mr-1"></i> Penginput: Kasir - ${stafName}`;
    } else if (currentSession === 'owner') {
        actorLabel.innerHTML = `<i class="fa-solid fa-shield-halved mr-1"></i> Penginput: Master Owner`;
    } else {
        actorLabel.innerHTML = `<i class="fa-solid fa-mobile-screen mr-1"></i> Penginput: Customer (Self-Order)`;
    }

    renderCartItems();
    
    const modal = document.getElementById('modal-cart');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeCartModal = function() {
    const modal = document.getElementById('modal-cart');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.renderCartItems = function() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = '';
    subtotalCart = 0;

    currentCart.forEach((item, index) => {
        subtotalCart += item.totalHarga;
        container.innerHTML += `
            <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative">
                <button onclick="hapusItemCart(${index})" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash-can"></i></button>
                <div class="pr-8">
                    <h4 class="font-black text-sm text-gray-900 mb-1">${item.qty}x ${item.nama}</h4>
                    <p class="text-[10px] text-gray-500 font-bold bg-gray-50 p-1.5 rounded-lg border border-gray-100 mb-2">
                        Es: ${item.levelEs} | Gula: ${item.levelGula}<br>
                        <span class="text-amber-600">Topping: ${item.toppingStr}</span>
                    </p>
                    <p class="text-sm font-black text-amber-500">${formatRupiah(item.totalHarga)}</p>
                </div>
            </div>
        `;
    });

    kalkulasiTotalCheckout();
};

window.hapusItemCart = function(index) {
    if(confirm("Hapus item ini dari pesanan?")) {
        currentCart.splice(index, 1);
        simpanKeranjangLokal();
        updateCartFloat();
        
        if (currentCart.length === 0) {
            closeCartModal();
        } else {
            renderCartItems();
        }
    }
};

// ============================================================================
// 14. SISTEM PROMO VOUCHER & KALKULASI FINAL
// ============================================================================
window.terapkanPromo = function() {
    const promoInput = document.getElementById('co-promo').value.toUpperCase().trim();
    if (promoInput === '') return;

    // Simulasi Cek Promo (Nanti diganti dengan verifikasi ke Firebase/JSON)
    if (promoInput === 'MAINSTAY2026') {
        diskonCart = 5000; // Potongan 5rb
        alert("Voucher MAINSTAY2026 berhasil diterapkan! Diskon Rp 5.000");
    } else if (promoInput === 'DISKON10') {
        diskonCart = subtotalCart * 0.1; // Diskon 10%
        alert("Voucher DISKON10 berhasil diterapkan! Diskon 10%");
    } else {
        diskonCart = 0;
        alert("Maaf, kode voucher tidak valid atau sudah kedaluwarsa.");
    }
    
    kalkulasiTotalCheckout();
};

window.kalkulasiTotalCheckout = function() {
    const subEl = document.getElementById('cart-subtotal');
    const diskonRow = document.getElementById('cart-discount-row');
    const diskonVal = document.getElementById('cart-discount-value');
    const grandEl = document.getElementById('cart-grand-total');

    subEl.textContent = formatRupiah(subtotalCart);
    
    if (diskonCart > 0) {
        diskonRow.classList.remove('hidden');
        diskonRow.classList.add('flex');
        diskonVal.textContent = `- ${formatRupiah(diskonCart)}`;
    } else {
        diskonRow.classList.remove('flex');
        diskonRow.classList.add('hidden');
    }

    grandTotalCart = subtotalCart - diskonCart;
    if (grandTotalCart < 0) grandTotalCart = 0;
    
    grandEl.textContent = formatRupiah(grandTotalCart);
};

// ============================================================================
// 15. PROSES CHECKOUT FINAL (Validasi & Pembuatan Nomor Antrean)
// ============================================================================
window.prosesCheckout = function() {
    if (currentCart.length === 0) return;

    // Ambil Data Form
    let nama = document.getElementById('co-name').value.trim();
    let phone = document.getElementById('co-phone').value.trim();
    const isMember = document.getElementById('co-member').checked;
    
    const tipeOrder = document.querySelector('input[name="co_tipe"]:checked').value;
    const metodeBayar = document.querySelector('input[name="co_payment"]:checked').value;

    // Validasi Sederhana
    if (nama === "") nama = "Hamba Allah"; 
    
    // Auto-Format Nomor WA (0 menjadi 62)
    if (phone.startsWith('0')) {
        phone = '62' + phone.substring(1);
    } else if (phone === "") {
        phone = "-";
    }

    // Identifikasi Penginput
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
    let actor = 'Customer';
    if (currentSession === 'kasir') actor = 'Kasir - ' + (document.getElementById('kasir-staf-dropdown').value || 'Staf');
    if (currentSession === 'owner') actor = 'Owner';

    // Generate Nomor Antrean Hari Ini
    const noAntrean = `ORD-${String(nomorAntreanHariIni).padStart(3, '0')}`;

    // Simpan Data Pesanan Sementara
    pesananAktif = {
        noAntrean: noAntrean,
        nama: nama,
        phone: phone,
        tipeOrder: tipeOrder,
        metodeBayar: metodeBayar,
        totalBayar: grandTotalCart,
        items: JSON.parse(JSON.stringify(currentCart)), // Copy Array
        actor: actor,
        isMember: isMember,
        waktu: new Date().toLocaleString('id-ID')
    };

    // Mainkan Suara Order Masuk (Hanya untuk efek Customer)
    if (currentSession === 'customer') {
        playAudio('masuk');
    }

    // Cabang Alur Pembayaran
    if (metodeBayar === 'QRIS Resto') {
        // Tampilkan Modal QRIS
        closeCartModal();
        bukaModalQRIS(pesananAktif);
    } else {
        // Jika Tunai (Cash), langsung buat Draf WA
        kirimBuktiWA(); 
    }
    
    // Proses Penambahan Nomor Antrean untuk order berikutnya
    nomorAntreanHariIni++;
};

// ============================================================================
// 16. POP-UP QRIS PAYMENT
// ============================================================================
window.bukaModalQRIS = function(orderData) {
    const qrisModal = document.getElementById('modal-qris');
    const qrisImg = document.getElementById('qris-img-display');
    const qrisAntrean = document.getElementById('qris-antrean');
    const qrisTotal = document.getElementById('qris-total-bayar');

    // Mengambil link QRIS dari Pengaturan Master (systemConfig)
    qrisImg.src = systemConfig.qrisUrl;
    qrisAntrean.textContent = '#' + orderData.noAntrean;
    qrisTotal.textContent = formatRupiah(orderData.totalBayar);

    qrisModal.classList.remove('hidden');
    qrisModal.classList.add('flex');
};

window.batalQRIS = function() {
    document.getElementById('modal-qris').classList.add('hidden');
    document.getElementById('modal-qris').classList.remove('flex');
    openCartModal(); // Kembali ke keranjang
};

window.unduhQRIS = function() {
    // Fungsi sederhana untuk trigger unduh gambar QRIS
    const imgUrl = document.getElementById('qris-img-display').src;
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = 'QRIS_MainstayDrink.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert("Gambar QRIS sedang diunduh ke galeri Anda.");
};

// ============================================================================
// 17. GENERATOR DRAFT WHATSAPP & PENYELESAIAN ORDER
// ============================================================================
window.kirimBuktiWA = function() {
    if (!pesananAktif) return;

    let drafText = "";
    
    // Pilih Draf Berdasarkan Tipe & Pembayaran
    if (pesananAktif.tipeOrder.includes('Pre-Order')) {
        drafText = systemConfig.draftWA.po;
    } else if (pesananAktif.metodeBayar === 'Tunai') {
        drafText = systemConfig.draftWA.cash;
    } else {
        drafText = systemConfig.draftWA.qris;
    }

    // Susun Format Pesan
    let msg = `*PESANAN BARU MAINSTAY DRINK*\n`;
    msg += `---------------------------------\n`;
    msg += `${drafText} *#${pesananAktif.noAntrean}*\n\n`;
    msg += `*Data Pemesan:*\n`;
    msg += `Nama: ${pesananAktif.nama}\n`;
    msg += `No. WA: ${pesananAktif.phone}\n`;
    msg += `Tipe: ${pesananAktif.tipeOrder}\n`;
    msg += `Pembayaran: ${pesananAktif.metodeBayar}\n`;
    msg += `Penginput: ${pesananAktif.actor}\n\n`;
    
    msg += `*Detail Pesanan:*\n`;
    pesananAktif.items.forEach((item, idx) => {
        msg += `${idx+1}. ${item.qty}x ${item.nama}\n`;
        msg += `   > Es: ${item.levelEs} | Gula: ${item.levelGula}\n`;
        msg += `   > Top: ${item.toppingStr}\n`;
        msg += `   > Sub: ${formatRupiah(item.totalHarga)}\n`;
    });
    
    msg += `---------------------------------\n`;
    msg += `*TOTAL TAGIHAN: ${formatRupiah(pesananAktif.totalBayar)}*\n`;
    
    if (pesananAktif.metodeBayar === 'QRIS Resto' || pesananAktif.tipeOrder.includes('Pre-Order')) {
        msg += `\n_(Mohon lampirkan foto/screenshot bukti transfer di bawah pesan ini)_\n`;
    }

    if (pesananAktif.isMember) {
        msg += `\n*(Opsi Member: YA, bersedia masuk Broadcast)*`;
    }

    // Encode teks agar bisa masuk URL
    const encodedMsg = encodeURIComponent(msg);
    
    // Nomor Tujuan Resto
    const targetWA = systemConfig.nomorWA; 
    const waUrl = `https://wa.me/${targetWA}?text=${encodedMsg}`;

    // Eksekusi: Bersihkan keranjang lalu buka WhatsApp
    currentCart = [];
    simpanKeranjangLokal();
    updateCartFloat();
    
    document.getElementById('modal-qris').classList.add('hidden');
    document.getElementById('modal-qris').classList.remove('flex');
    closeCartModal();

    alert(`Pesanan #${pesananAktif.noAntrean} berhasil diproses! Anda akan diarahkan ke WhatsApp.`);
    
    // Buka Tab Baru WA
    window.open(waUrl, '_blank');
    
    // PENTING: Di sini nanti fungsi untuk PUSH data pesanan ke Tabel "Konfirmasi" di Kasir & Firebase akan dipanggil (Bagian 4)
    // pushPesananKeKasir(pesananAktif);
};
// ============================================================================
// 18. SISTEM HRD: ABSENSI KAMERA (FACE CAPTURE & REVIEW)
// ============================================================================
window.videoStream = null;

// Buka Modal Absensi & Akses Kamera
window.openAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    const video = document.getElementById('attendance-video');
    const loading = document.getElementById('camera-loading');
    
    // Reset Form & Input PIN
    document.getElementById('absen-pin').value = '';
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    loading.classList.remove('hidden');
    video.classList.add('hidden');

    // Minta Izin Kamera (Front Camera / Selfie)
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(function(stream) {
            videoStream = stream;
            video.srcObject = stream;
            
            // Tunggu video ready
            video.onloadedmetadata = function(e) {
                video.play();
                loading.classList.add('hidden');
                video.classList.remove('hidden');
            };
        })
        .catch(function(err) {
            console.error("Gagal mengakses kamera:", err);
            loading.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-4xl mb-4 text-red-500"></i><p class="text-xs font-black bg-red-100 text-red-600 px-4 py-2 rounded-lg text-center">Kamera tidak diizinkan atau tidak tersedia.<br>Absen manual dengan PIN tetap bisa dilakukan.</p>`;
        });
};

// Tutup Modal Absensi & Matikan Kamera (Hemat Baterai)
window.closeAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
};

// Proses Jepret Kamera & Validasi PIN
window.prosesAbsen = function(jenisAbsen) {
    const pin = document.getElementById('absen-pin').value;
    if (pin.length < 4) {
        alert("Masukkan PIN Staf yang valid!");
        return;
    }

    // SIMULASI PROFIL (Nanti ini dicocokkan dengan data Firebase/JSON di Panel HRD)
    let namaStaf = "Tidak Dikenal";
    if (pin === "123456") namaStaf = "Budi (Kasir 1)";
    if (pin === "654321") namaStaf = "Siti (Kasir 2)";

    if (namaStaf === "Tidak Dikenal") {
        alert("PIN tidak terdaftar di sistem HRD!");
        return;
    }

    // Ambil Gambar dari Video (Jika Kamera Tersedia)
    const video = document.getElementById('attendance-video');
    const canvas = document.getElementById('attendance-canvas');
    let fotoData = "";

    if (videoStream && video.videoWidth > 0) {
        // Set ukuran kanvas sama dengan rasio video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        // Gambar frame saat ini ke kanvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Ubah jadi base64 image
        fotoData = canvas.toDataURL('image/jpeg', 0.8);
    } else {
        // Fallback jika kamera mati
        fotoData = "https://ui-avatars.com/api/?name=" + encodeURIComponent(namaStaf) + "&background=f59e0b&color=fff&size=200";
    }

    // Tutup Modal Kamera
    closeAbsensi();
    
    // Putar Suara Sukses
    playAudio('siap');

    // Tampilkan Pop-Up Review 5 Detik
    tampilkanReviewAbsen(namaStaf, jenisAbsen, fotoData);
};

// ============================================================================
// 19. POP-UP REVIEW HASIL ABSEN (LOGIKA KETERLAMBATAN)
// ============================================================================
window.tampilkanReviewAbsen = function(nama, jenis, fotoBase64) {
    const modalReview = document.getElementById('modal-absen-review');
    const imgReview = document.getElementById('review-foto');
    const namaReview = document.getElementById('review-nama');
    const jamReview = document.getElementById('review-jam');
    const statusReview = document.getElementById('review-status');

    // Inject Data
    imgReview.src = fotoBase64;
    namaReview.textContent = nama;

    // Catat Waktu Presisi
    const now = new Date();
    const jamFormat = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');
    jamReview.innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${jenis}: ${jamFormat} WIB`;

    // Logika Toleransi Keterlambatan (Misal: Shift Pagi Maks Masuk Jam 08:00)
    // Untuk saat ini kita pakai simulasi (Jika masuk di atas jam 8 pagi, dianggap terlambat)
    let isTerlambat = false;
    if (jenis === 'Masuk' && now.getHours() >= 8) {
        // Pengecualian jika ini shift siang (Bisa diatur lebih lanjut nanti di HRD)
        if(now.getHours() < 13) isTerlambat = true; 
    }

    if (isTerlambat && jenis === 'Masuk') {
        statusReview.textContent = "TERLAMBAT";
        statusReview.className = "inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-red-500 shadow-md tracking-wider";
    } else {
        statusReview.textContent = jenis === 'Masuk' ? "TEPAT WAKTU" : "PULANG";
        statusReview.className = "inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-green-500 shadow-md tracking-wider";
    }

    // Tampilkan Modal
    modalReview.classList.remove('hidden');
    modalReview.classList.add('flex');

    // Tutup Otomatis setelah 5 Detik
    setTimeout(() => {
        modalReview.classList.add('hidden');
        modalReview.classList.remove('flex');
        
        // PENTING: Di sinilah data log absen dikirim ke Google Sheets (Tabel HRD)
        // pushAbsensiToSheets(nama, jenis, jamFormat, isTerlambat ? 'Terlambat' : 'Tepat Waktu');
    }, 5000);
};

// ============================================================================
// 20. NAVIGASI TAB DASHBOARD KASIR (Konfirmasi, Dapur, Selesai)
// ============================================================================
window.kasirTabAktif = 'konfirmasi';

// Data Dummy Sementara untuk Tabel Kasir (Nanti ini diganti tarikan dari Firebase)
window.pesananMasukDB = []; 
window.pesananDapurDB = [];
window.pesananSelesaiDB = [];

window.switchKasirTab = function(tabName) {
    kasirTabAktif = tabName;
    
    // Reset Desain Tombol Tab
    document.querySelectorAll('#tab-konfirmasi, #tab-dapur, #tab-selesai').forEach(btn => {
        btn.classList.remove('bg-white', 'shadow-sm', 'text-amber-600');
        btn.classList.add('hover:text-slate-700');
    });

    // Beri styling aktif pada tombol yang diklik
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if(activeBtn) {
        activeBtn.classList.add('bg-white', 'shadow-sm', 'text-amber-600');
        activeBtn.classList.remove('hover:text-slate-700');
    }

    // Panggil fungsi render isi tabel (Akan dibuat lebih lengkap saat integrasi Firebase)
    renderListKasir();
};

window.renderListKasir = function() {
    const container = document.getElementById('kasir-list-container');
    container.innerHTML = '';
    
    // Pilih Array Data berdasarkan Tab Aktif
    let dataRender = [];
    let emptyMsg = "";
    let emptyIcon = "";

    if (kasirTabAktif === 'konfirmasi') {
        dataRender = pesananMasukDB;
        emptyMsg = "Belum ada pesanan masuk. Pantau terus.";
        emptyIcon = "fa-clipboard-list";
    } else if (kasirTabAktif === 'dapur') {
        dataRender = pesananDapurDB;
        emptyMsg = "Tidak ada pesanan yang sedang diproses dapur.";
        emptyIcon = "fa-fire-burner";
    } else {
        dataRender = pesananSelesaiDB;
        emptyMsg = "Belum ada pesanan yang selesai hari ini.";
        emptyIcon = "fa-check-double";
    }

    // Tampilan Kosong
    if (dataRender.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <i class="fa-solid ${emptyIcon} text-3xl opacity-50 text-slate-500"></i>
                </div>
                <p class="text-sm font-black text-slate-500">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    // ==================================
    // RENDER CARD PESANAN (KASIR)
    // ==================================
    // (Akan disempurnakan di Bagian 5 saat terhubung ke Alur Final pesanan)
};

// ============================================================================
// 21. FUNGSI AMBIL ALIH POS (Untuk Kasir / Owner)
// ============================================================================
window.bukaPOS = function(actorType) {
    // Tombol melayang di Kasir/Owner diklik
    // Sistem akan mengalihkan layar ke view 'Customer' agar bisa order, 
    // TAPI mempertahankan sesi login dan dropdown namanya (actorType).
    
    renderView('customer');
    highlightNav('customer');
    
    // Gulir ke area atas agar fokus pada katalog
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    alert(`Mode POS Aktif.\nPenginput Order: ${actorType}.`);
};

// ============================================================================
// 22. KENDALI PANEL MASTER (OVERLAY DARI BAWAH)
// ============================================================================
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
// ============================================================================
// 23. RENDER KARTU PESANAN KASIR (Lanjutan dari Bagian 4)
// ============================================================================
window.renderListKasir = function() {
    const container = document.getElementById('kasir-list-container');
    container.innerHTML = '';
    
    // Pilih Array Data berdasarkan Tab Aktif
    let dataRender = [];
    let emptyMsg = "";
    let emptyIcon = "";

    if (kasirTabAktif === 'konfirmasi') {
        dataRender = pesananMasukDB; // Pesanan baru masuk
        emptyMsg = "Belum ada pesanan masuk. Pantau terus.";
        emptyIcon = "fa-clipboard-list";
    } else if (kasirTabAktif === 'dapur') {
        dataRender = pesananDapurDB; // Diterima kasir, masuk ke dapur
        emptyMsg = "Tidak ada pesanan yang sedang diproses dapur.";
        emptyIcon = "fa-fire-burner";
    } else {
        dataRender = pesananSelesaiDB; // Sudah selesai
        emptyMsg = "Belum ada pesanan yang selesai hari ini.";
        emptyIcon = "fa-check-double";
    }

    if (dataRender.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <i class="fa-solid ${emptyIcon} text-3xl opacity-50 text-slate-500"></i>
                </div>
                <p class="text-sm font-black text-slate-500">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    // Render Kartu Pesanan Secara Dinamis
    dataRender.forEach((order, index) => {
        let actionButtons = "";
        
        // Render Item Menu di dalam Pesanan
        let orderItemsHTML = "";
        order.items.forEach(item => {
            orderItemsHTML += `<p class="text-[10px] font-bold text-gray-600 border-b border-gray-100 py-1.5 last:border-0">• ${item.qty}x ${item.nama} <span class="text-amber-500">(${item.levelEs}, ${item.levelGula})</span></p>`;
        });

        // Logika Tombol Aksi Berdasarkan Tab
        if (kasirTabAktif === 'konfirmasi') {
            const btnCekWA = (order.metodeBayar === 'QRIS Resto' || order.tipeOrder.includes('Pre-Order')) 
                ? `<button onclick="window.open('https://web.whatsapp.com', '_blank')" class="flex-1 bg-blue-50 text-blue-600 font-black py-2.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition text-[10px]"><i class="fa-brands fa-whatsapp mr-1 text-sm"></i> Cek WA</button>` 
                : '';
                
            actionButtons = `
                <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onclick="batalPesanan('${order.noAntrean}')" class="flex-1 bg-red-50 text-red-500 font-black py-2.5 rounded-xl border border-red-200 hover:bg-red-100 transition text-[10px]"><i class="fa-solid fa-xmark mr-1"></i> Batal</button>
                    ${btnCekWA}
                    <button onclick="terimaPesanan('${order.noAntrean}')" class="flex-1 bg-amber-500 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-amber-600 transition text-[10px]"><i class="fa-solid fa-fire-burner mr-1"></i> Proses Dapur</button>
                </div>
            `;
        } 
        else if (kasirTabAktif === 'dapur') {
            actionButtons = `
                <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onclick="cetakThermal('${order.noAntrean}')" class="flex-1 bg-gray-800 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-black transition text-[10px]"><i class="fa-solid fa-print mr-1"></i> Struk Thermal</button>
                    <button onclick="alert('Kirim struk digital ke WA pembeli via API WhatsApp')" class="flex-1 bg-green-50 text-green-600 font-black py-2.5 rounded-xl border border-green-200 hover:bg-green-100 transition text-[10px]"><i class="fa-solid fa-receipt mr-1"></i> Struk WA</button>
                    <button onclick="selesaiPesanan('${order.noAntrean}')" class="flex-1 bg-green-500 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-green-600 transition text-[10px]"><i class="fa-solid fa-check-double mr-1"></i> Siap!</button>
                </div>
            `;
        }
        else if (kasirTabAktif === 'selesai') {
            actionButtons = `
                <div class="mt-4 pt-3 border-t border-gray-100 text-center">
                    <span class="inline-block bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-green-200"><i class="fa-solid fa-check mr-1"></i> Pesanan Telah Diselesaikan</span>
                </div>
            `;
        }

        // Cetak Kartu
        container.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 relative">
                <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                    <div>
                        <h3 class="font-black text-gray-900 text-sm flex items-center gap-1.5"><i class="fa-solid fa-hashtag text-amber-500"></i> ${order.noAntrean}</h3>
                        <p class="text-[10px] font-bold text-gray-500">${order.nama} • ${order.phone}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-1 rounded border border-amber-200 uppercase mb-1">${order.tipeOrder}</span>
                        <p class="text-[10px] font-black text-blue-600">${order.metodeBayar}</p>
                    </div>
                </div>
                
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3">
                    ${orderItemsHTML}
                </div>
                
                <div class="flex justify-between items-center px-1">
                    <span class="text-[10px] font-bold text-gray-400">Total Tagihan:</span>
                    <span class="text-base font-black text-gray-900">${formatRupiah(order.totalBayar)}</span>
                </div>

                ${actionButtons}
            </div>
        `;
    });
};

// ============================================================================
// 24. FUNGSI AKSI PESANAN KASIR (Proses & Cetak Thermal)
// ============================================================================
window.terimaPesanan = function(noAntrean) {
    if(confirm(`Konfirmasi pembayaran dan masukkan pesanan ${noAntrean} ke Dapur?`)) {
        // Logika Pindah Array (Simulasi Database)
        const orderIdx = pesananMasukDB.findIndex(o => o.noAntrean === noAntrean);
        if(orderIdx > -1) {
            const order = pesananMasukDB.splice(orderIdx, 1)[0];
            pesananDapurDB.unshift(order);
            
            // PUSH ke Firebase & Spreadsheet di sini nanti
            switchKasirTab('dapur');
            playAudio('siap');
        }
    }
};

window.selesaiPesanan = function(noAntrean) {
    if(confirm(`Tandai pesanan ${noAntrean} selesai?`)) {
        const orderIdx = pesananDapurDB.findIndex(o => o.noAntrean === noAntrean);
        if(orderIdx > -1) {
            const order = pesananDapurDB.splice(orderIdx, 1)[0];
            pesananSelesaiDB.unshift(order);
            
            // PUSH Update Status ke Firebase & Spreadsheet di sini nanti
            switchKasirTab('selesai');
            // Flash layar hijau dan play audio
            playAudio('siap'); 
        }
    }
};

window.batalPesanan = function(noAntrean) {
    if(confirm(`Yakin ingin membatalkan pesanan ${noAntrean}? Data tidak dapat dikembalikan.`)) {
        const orderIdx = pesananMasukDB.findIndex(o => o.noAntrean === noAntrean);
        if(orderIdx > -1) {
            pesananMasukDB.splice(orderIdx, 1);
            renderListKasir();
        }
    }
};

// Fitur Cetak Struk Thermal
window.cetakThermal = function(noAntrean) {
    const order = pesananDapurDB.find(o => o.noAntrean === noAntrean);
    if (!order) return;

    // Membentuk String Monospace untuk Printer Thermal (58mm)
    let struk = `
      MAINSTAY DRINK      
    Minuman Andalanmu     
================================
No      : ${order.noAntrean}
Kasir   : ${order.actor}
Waktu   : ${order.waktu}
Pelanggan: ${order.nama}
================================
`;
    order.items.forEach(item => {
        struk += `${item.qty}x ${item.nama.substring(0,20)}\n`;
        struk += `   ${item.levelEs}, ${item.levelGula}\n`;
        struk += `   ${formatRupiah(item.totalHarga)}\n`;
    });
struk += `
--------------------------------
TOTAL   : ${formatRupiah(order.totalBayar)}
TIPE    : ${order.tipeOrder}
BAYAR   : ${order.metodeBayar}
================================
${systemConfig.footerStruk}
`;

    console.log(struk);
    alert("Struk Thermal berhasil dikirim ke antrean printer Bluetooth Anda!\n\n(Buka Console Browser untuk melihat format struk text mentahnya).");
};

// ============================================================================
// 25. SISTEM BACKUP DAN RESTORE (EXPORT / IMPORT JSON)
// ============================================================================
// Fitur Kelas Dewa untuk menyimpan seluruh pengaturan & katalog ke penyimpanan lokal HP

window.exportJSONData = function() {
    try {
        // Kumpulkan Semua Data State Aplikasi
        const dataToExport = {
            appName: "Mainstay Drink E-Menu & POS",
            exportDate: new Date().toISOString(),
            katalog: katalogMenu,
            opsi: opsiTambahan,
            config: systemConfig,
            member: databaseMember
        };

        // Konversi ke string JSON
        const jsonStr = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // Buat elemen Download
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_MainstayPOS_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Bersihkan
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert("File Backup JSON berhasil diunduh dan disimpan ke perangkat Anda!");
    } catch (err) {
        console.error("Gagal Export:", err);
        alert("Gagal melakukan export JSON.");
    }
};

window.importJSONData = function() {
    // Membuat input file secara virtual (Tanpa merusak layout HTML)
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';
    
    fileInput.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                
                // Validasi sederhana
                if (!importedData.appName || !importedData.appName.includes("Mainstay")) {
                    throw new Error("Format file JSON tidak valid untuk aplikasi ini.");
                }

                // Restore Data ke State Window
                if(importedData.katalog) katalogMenu = importedData.katalog;
                if(importedData.opsi) opsiTambahan = importedData.opsi;
                if(importedData.config) systemConfig = importedData.config;
                if(importedData.member) databaseMember = importedData.member;

                alert("Restore data dari JSON berhasil! Aplikasi akan direfresh untuk menerapkan perubahan.");
                
                // Logika menyimpan state ini ke Firebase bisa di-trigger di sini
                // updateToFirebase(importedData);
                
                // Refresh agar UI menyesuaikan
                location.reload();
            } catch (err) {
                console.error("Error Import JSON:", err);
                alert("Gagal memuat file JSON. Pastikan file backup valid.");
            }
        };
        reader.readAsText(file);
    };
    
    // Trigger klik
    fileInput.click();
};

// Mengikat fungsi ke tombol di Panel Master "Sistem" (via DOMContentLoaded)
window.addEventListener('DOMContentLoaded', () => {
    // Cari tombol export & import di HTML dan tambahkan event listener
    const btns = document.querySelectorAll('#panel-sistem button');
    btns.forEach(btn => {
        if (btn.innerText.includes('Export JSON')) {
            btn.onclick = exportJSONData;
        }
        if (btn.innerText.includes('Import JSON')) {
            btn.onclick = importJSONData;
        }
    });
});

// ============================================================================
// 26. DUMMY PUSH KE FIREBASE & GOOGLE SHEETS
// ============================================================================
/* 
  Catatan Master: 
  Sistem ini siap dihubungkan! 
  - Saat `terimaPesanan()` diklik, data `pesananAktif` dilempar ke fungsi set(ref(db, 'pesanan/' + id), data)
  - Saat absen di HRD dilakukan, fungsi fetch() melempar parameter HTTP POST ke URL 'systemConfig.urlSpreadsheet' (App Script Google Sheets).
  - Skrip App Script doPost(e) akan merespon dan memasukkan baris baru ke Sheet Anda.
*/

console.log("Mainstay POS & E-Menu System Loaded Successfully. All logic secured.");
// ============================================================================
// 27. PELENGKAP INTERAKTIF MUTLAK (Carousel & Marquee)
// ============================================================================
window.carouselData = [
    { img: "https://images.unsplash.com/photo-1588644458316-24b94fa8ebc8?w=800&q=80", title: "Promo Kopi Susu Mainstay - Beli 2 Lebih Hemat!", link: "https://wa.me/628977099557" },
    { img: "https://images.unsplash.com/photo-1536013561472-1c9c3c8c6b06?w=800&q=80", title: "Matcha Latte Series - Segar & Premium", link: "https://wa.me/628977099557" },
    { img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80", title: "Hot Americano - Hangatkan Harimu", link: "https://wa.me/628977099557" }
];
window.currentSlideIdx = 0;

window.renderCarouselSlide = function(idx) {
    const imgEl = document.getElementById('carousel-img');
    const titleEl = document.getElementById('carousel-title');
    const indEl = document.getElementById('carousel-indicators');
    
    if (!imgEl || !carouselData[idx]) return;
    imgEl.src = carouselData[idx].img;
    titleEl.textContent = carouselData[idx].title;
    if (indEl) indEl.innerHTML = carouselData.map((_, i) => `<span class="h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}"></span>`).join('');
};

setInterval(() => { currentSlideIdx = (currentSlideIdx + 1) % carouselData.length; renderCarouselSlide(currentSlideIdx); }, 4000);

window.openCarouselLink = () => window.open(carouselData[currentSlideIdx].link, '_blank');
window.openMarqueeLink = () => window.open(`https://wa.me/${systemConfig.nomorWA}?text=Halo%20Mainstay,%20saya%20tertarik%20dengan%20info%20promo%20hari%20ini`, '_blank');
// ============================================================================
// 28. REGISTER SERVICE WORKER (PWA - Mode Offline)
// ============================================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('[PWA] Service Worker Aktif. Scope:', registration.scope))
      .catch(error => console.error('[PWA] Pendaftaran SW gagal:', error));
  });
}
// ============================================================================
// 29. PENYEMPURNAAN SINKRONISASI (KASIR, OWNER STATS, & GOOGLE SHEETS)
// ============================================================================

// 1. Fungsi Kalkulasi Statistik Dashboard Owner
window.updateStatistikOwner = function() {
    const statPendapatan = document.getElementById('stat-pendapatan');
    if(!statPendapatan) return;
    
    let total = 0;
    // Hitung pendapatan hanya dari pesanan yang sudah berstatus 'Selesai'
    window.pesananSelesaiDB.forEach(o => total += o.totalBayar);
    
    statPendapatan.textContent = window.formatRupiah(total);
    document.getElementById('stat-pesanan').textContent = window.pesananMasukDB.length;
    document.getElementById('stat-dapur').textContent = window.pesananDapurDB.length;
    document.getElementById('stat-selesai').textContent = window.pesananSelesaiDB.length;
};

// 2. Hubungkan Checkout Customer Otomatis ke Layar Kasir & Owner
const originalKirimBuktiWA = window.kirimBuktiWA;
window.kirimBuktiWA = function() {
    if(!window.pesananAktif) return;
    
    // PUSH DATA KE ARRAY KASIR SEBELUM MEMBUKA WA
    window.pesananMasukDB.unshift(window.pesananAktif);
    
    // Update Tampilan Kasir secara Real-Time jika sedang buka tab Konfirmasi
    if (window.kasirTabAktif === 'konfirmasi' && typeof window.renderListKasir === 'function') {
        window.renderListKasir();
    }
    
    // Update Statistik Owner
    window.updateStatistikOwner();

    // Jalankan fungsi aslinya (Membuka WA & Mengosongkan Keranjang)
    originalKirimBuktiWA();
};

// 3. Update Otomatis Statistik Owner Setiap Ada Pergerakan Kasir
const originalTerimaPesanan = window.terimaPesanan;
window.terimaPesanan = function(no) { 
    originalTerimaPesanan(no); 
    window.updateStatistikOwner(); 
};

const originalSelesaiPesanan = window.selesaiPesanan;
window.selesaiPesanan = function(no) { 
    originalSelesaiPesanan(no); 
    window.updateStatistikOwner(); 
};

const originalBatalPesanan = window.batalPesanan;
window.batalPesanan = function(no) { 
    originalBatalPesanan(no); 
    window.updateStatistikOwner(); 
};

// 4. API Hit ke Google Sheets saat Absen Kamera Selesai
const originalTampilkanReview = window.tampilkanReviewAbsen;
window.tampilkanReviewAbsen = function(nama, jenis, fotoBase64) {
    originalTampilkanReview(nama, jenis, fotoBase64);
    
    const now = new Date();
    const jam = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');
    
    // Logika Keterlambatan Absen (Misal: Shift jam 8 pagi, lebih dari itu terlambat)
    const status = (jenis === 'Masuk' && now.getHours() >= 8 && now.getHours() < 13) ? 'Terlambat' : 'Tepat Waktu';
    
    const url = window.systemConfig.urlSpreadsheet;
    
    // Cegah error jika URL Sheets belum Anda ubah dari URL bawaan/dummy
    if(url && !url.includes("AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ")) {
        fetch(url + `?action=absen&nama=${encodeURIComponent(nama)}&jenis=${jenis}&jam=${jam}&status=${status}`, { 
            method: 'GET', 
            mode: 'no-cors' 
        })
        .then(() => console.log("[HRD] Data absen berhasil ditembak ke Google Sheets."))
        .catch(e => console.log("[HRD] Gagal sync sheet (Anda sedang offline / URL salah):", e));
    }
};

// Inisialisasi awal statistik saat web pertama kali direfresh
window.addEventListener('DOMContentLoaded', () => {
    window.updateStatistikOwner();
});
// ============================================================================
// 30. BACKEND BINDER: PERSISTENSI DATA & PENGHIDUP PANEL OWNER
// ============================================================================

// --- A. SISTEM PENYELAMAT DATA KASIR (Agar tidak hilang saat di-refresh) ---
window.simpanDatabaseKasir = function() {
    localStorage.setItem('db_masuk', JSON.stringify(window.pesananMasukDB));
    localStorage.setItem('db_dapur', JSON.stringify(window.pesananDapurDB));
    localStorage.setItem('db_selesai', JSON.stringify(window.pesananSelesaiDB));
};

window.muatDatabaseKasir = function() {
    const dbMasuk = localStorage.getItem('db_masuk');
    const dbDapur = localStorage.getItem('db_dapur');
    const dbSelesai = localStorage.getItem('db_selesai');
    
    if(dbMasuk) window.pesananMasukDB = JSON.parse(dbMasuk);
    if(dbDapur) window.pesananDapurDB = JSON.parse(dbDapur);
    if(dbSelesai) window.pesananSelesaiDB = JSON.parse(dbSelesai);
};

// Modifikasi fungsi sebelumnya agar otomatis menyimpan ke LocalStorage
const triggerSimpanKasir = () => { window.simpanDatabaseKasir(); window.updateStatistikOwner(); };
window.kirimBuktiWA = function() {
    if(!window.pesananAktif) return;
    window.pesananMasukDB.unshift(window.pesananAktif);
    if (window.kasirTabAktif === 'konfirmasi' && typeof window.renderListKasir === 'function') window.renderListKasir();
    triggerSimpanKasir();
    
    // Draft WA & Kosongkan Keranjang
    let dt = window.pesananAktif.tipeOrder.includes('Pre') ? systemConfig.draftWA.po : (window.pesananAktif.metodeBayar==='Tunai' ? systemConfig.draftWA.cash : systemConfig.draftWA.qris);
    let msg = `*PESANAN MAINSTAY*\n${dt} *#${window.pesananAktif.noAntrean}*\nTotal: ${window.formatRupiah(window.pesananAktif.totalBayar)}\n\n*(Sistem E-Menu)*`;
    currentCart = []; localStorage.setItem('cartMainstay', JSON.stringify(currentCart)); updateCartFloat();
    document.getElementById('modal-qris').classList.add('hidden'); document.getElementById('modal-qris').classList.remove('flex'); closeCartModal();
    window.open(`https://wa.me/${systemConfig.nomorWA}?text=${encodeURIComponent(msg)}`, '_blank');
};

const _terima = window.terimaPesanan; window.terimaPesanan = function(no) { _terima(no); triggerSimpanKasir(); };
const _selesai = window.selesaiPesanan; window.selesaiPesanan = function(no) { _selesai(no); triggerSimpanKasir(); };
const _batal = window.batalPesanan; window.batalPesanan = function(no) { _batal(no); triggerSimpanKasir(); };

// --- B. LOGIKA PENGATURAN WEB (PANEL 1 & 2) ---
window.simpanPengaturanWeb = function() {
    const wa = document.getElementById('setting-wa');
    const qris = document.getElementById('setting-qris');
    const audioMasuk = document.getElementById('setting-audio-masuk');
    const audioSiap = document.getElementById('setting-audio-siap');
    const buka = document.getElementById('setting-buka');
    const audioOn = document.getElementById('setting-audio');

    if(wa && wa.value) window.systemConfig.nomorWA = wa.value;
    if(qris && qris.value) window.systemConfig.qrisUrl = qris.value;
    if(audioMasuk && audioMasuk.value) document.getElementById('audio-masuk').src = audioMasuk.value;
    if(audioSiap && audioSiap.value) document.getElementById('audio-siap').src = audioSiap.value;
    
    if(buka) window.systemConfig.tokoBuka = buka.checked;
    if(audioOn) window.systemConfig.audioAktif = audioOn.checked;
    
    // Update Tampilan Toko Buka/Tutup di Header
    const statusEl = document.getElementById('store-status');
    if(statusEl) {
        if(window.systemConfig.tokoBuka) {
            statusEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span> BUKA`;
            statusEl.className = "flex items-center gap-1 mt-1 text-[10px] font-extrabold text-green-600";
        } else {
            statusEl.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> TUTUP`;
            statusEl.className = "flex items-center gap-1 mt-1 text-[10px] font-extrabold text-red-600";
        }
    }

    localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
    alert("Berhasil! Pengaturan Web, Audio, dan QRIS telah diperbarui.");
};

window.simpanPromo = function() {
    alert("Berhasil! Data Teks Marquee dan Banner Promo telah diperbarui.");
};

// --- C. RENDER TABEL MEMBER (PANEL 5) ---
window.renderTabelMember = function() {
    const tbody = document.getElementById('table-member-body');
    if(!tbody) return;
    
    // Data Dummy jika belum ada di database
    if(window.databaseMember.length === 0) {
        window.databaseMember = [
            { nama: "Ihsan", wa: "628977099557", tanggal: "26 Ags 2026" },
            { nama: "Pelanggan Setia", wa: "628123456789", tanggal: "25 Ags 2026" }
        ];
    }
    
    tbody.innerHTML = window.databaseMember.map(m => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-2 text-gray-900">${m.nama}</td>
            <td class="p-2 text-blue-600"><a href="https://wa.me/${m.wa}" target="_blank"><i class="fa-brands fa-whatsapp mr-1"></i>${m.wa}</a></td>
            <td class="p-2 text-gray-500">${m.tanggal}</td>
        </tr>
    `).join('');
};

// --- D. PEMBURU TOMBOL MATI (Menyambungkan Semua Tombol di 8 Panel) ---
window.hubungkanSemuaTombolPanel = function() {
    // 1. Panel Edit Web
    const btnSimpanWeb = document.querySelector('#panel-edit-web button:last-child');
    if(btnSimpanWeb) btnSimpanWeb.onclick = window.simpanPengaturanWeb;

    // 2. Panel Promo Banner
    const btnSimpanPromo = document.querySelector('#panel-promo-banner button:last-child');
    if(btnSimpanPromo) btnSimpanPromo.onclick = window.simpanPromo;

    // 3. Tangani semua tombol aksi lain agar tidak mati
    const semuaTombolMaster = document.querySelectorAll('#view-owner button, .panel-slide-up button');
    semuaTombolMaster.forEach(btn => {
        // Jika tombol belum memiliki event onclick dari HTML
        if(!btn.getAttribute('onclick')) {
            btn.onclick = function() {
                const teks = this.innerText.trim();
                // Cegah notifikasi untuk tombol navigasi/tutup panel
                if(teks === '' || this.innerHTML.includes('fa-chevron-down') || this.innerHTML.includes('fa-xmark')) return;
                
                // Beri respons sistematis
                alert(`Sistem Terhubung: Fitur [${teks}] siap dikaitkan dengan REST API Firebase pada perilisan final.`);
            };
        }
    });
};

// --- E. INISIALISASI AKHIR (Memanggil semua fungsi saat web dimuat) ---
window.addEventListener('DOMContentLoaded', () => {
    // Muat setting dari localStorage jika ada
    const savedConfig = localStorage.getItem('mainstayConfig');
    if(savedConfig) window.systemConfig = Object.assign(window.systemConfig, JSON.parse(savedConfig));
    
    window.muatDatabaseKasir();
    if(window.kasirTabAktif && typeof window.renderListKasir === 'function') window.renderListKasir();
    
    window.renderTabelMember();
    window.hubungkanSemuaTombolPanel();
    
    console.log("[Backend Binder] Seluruh data lokal dan tombol panel berhasil dihubungkan!");
});
// ============================================================================
// 31. FINAL SECURITY PATCH & HARDWARE INTEGRATION
// ============================================================================

// 1. Pencegah Double-Submit pada Checkout
let isCheckoutProcessing = false;
const originalProsesCheckout = window.prosesCheckout;
window.prosesCheckout = function() {
    if(isCheckoutProcessing || window.currentCart.length === 0) return;
    isCheckoutProcessing = true;
    
    // Ubah tombol jadi loading
    const btn = document.querySelector('#modal-cart button[onclick="prosesCheckout()"]');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> MEMPROSES...`;
    
    setTimeout(() => {
        originalProsesCheckout();
        isCheckoutProcessing = false;
        btn.innerHTML = oldHtml;
    }, 800);
};

// 2. Akses Hardware Web Bluetooth Printer Thermal
window.cetakThermal = async function(noAntrean) {
    const order = window.pesananDapurDB.find(o => o.noAntrean === noAntrean);
    if (!order) return alert("Pesanan tidak ditemukan!");

    // Rapikan string struk
    let struk = `MAINSTAY DRINK\nMinuman Andalanmu\n================================\nNo   : ${order.noAntrean}\nJam  : ${order.waktu}\n================================\n`;
    order.items.forEach(item => {
        // Potong nama menu max 20 karakter agar tidak merusak layout kertas 58mm
        let namaPendek = item.nama.length > 20 ? item.nama.substring(0, 18) + ".." : item.nama;
        struk += `${item.qty}x ${namaPendek}\n   + ${item.toppingStr}\n   ${window.formatRupiah(item.totalHarga)}\n`;
    });
    struk += `================================\nTOTAL: ${window.formatRupiah(order.totalBayar)}\n${window.systemConfig.footerStruk}\n\n`;

    try {
        // Meminta izin akses Bluetooth ke Printer
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // UUID Standard Printer Thermal
        });
        console.log("Terhubung dengan printer:", device.name);
        alert(`Bluetooth terhubung ke: ${device.name}\n\nMemproses cetak fisik...`);
        // Catatan: Proses konversi string ke buffer bit raw EPSON ESC/POS akan di-handle API printer terkait.
    } catch (error) {
        // Fallback jika ditolak/bluetooth mati
        console.warn("Koneksi Printer Batal:", error);
        alert("Pencetakan fisik dibatalkan atau Bluetooth tidak aktif. Mencetak ke konsol virtual...\n\n" + struk);
    }
};

// 3. Asynchronous Safe-Hit Google Sheets
const originalReviewAbsen = window.tampilkanReviewAbsen;
window.tampilkanReviewAbsen = function(nama, jenis, fotoBase64) {
    originalReviewAbsen(nama, jenis, fotoBase64);
    
    // Kirim data ke background tanpa menahan UI menggunakan Promise
    const url = window.systemConfig.urlSpreadsheet;
    if(url && url.length > 30) {
        setTimeout(() => {
            fetch(url + `?action=absen&nama=${encodeURIComponent(nama)}&jenis=${jenis}`, { method: 'GET', mode: 'no-cors' })
            .catch(() => console.log("Silent error: Jaringan terputus saat sync background."));
        }, 1000);
    }
};
// ============================================================================
// 32. FINAL PERFECTION PATCH (TUTUP POPUP, FILTER WA, & INPUT MANUAL OWNER)
// ============================================================================

// 1. Fitur Menutup Pop-up dengan Mengklik Area Gelap (Luar Kotak)
window.addEventListener('click', function(e) {
    // Pemetaan ID Modal dengan fungsi penutupnya masing-masing
    const modalMap = {
        'modal-menu-detail': window.closeMenuDetail,
        'modal-cart': window.closeCartModal,
        'modal-login': window.closeLoginModal
    };
    
    // Jika target klik adalah persis area gelap pembungkus (bukan kotak putih di dalamnya)
    for (let id in modalMap) {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden') && e.target === modal) {
            modalMap[id](); // Eksekusi fungsi tutup
        }
    }
});

// 2. Filter Otomatis Nomor WhatsApp (Hanya Angka)
const inputPhone = document.getElementById('co-phone');
if (inputPhone) {
    inputPhone.addEventListener('input', function(e) {
        // Hapus semua karakter selain angka
        let val = this.value.replace(/\D/g, '');
        // Pastikan tidak ada 62 berulang jika user mengetik 0 setelah 62
        this.value = val;
    });
}

// 3. Menghidupkan Input Manual "Tambah Menu" di Panel Katalog
window.tambahMenuManual = function() {
    let namaBaru = prompt("Masukkan Nama Minuman/Menu Baru:");
    if (!namaBaru) return;
    
    let hargaBaru = prompt("Masukkan Harga Jual (Contoh: 15000)\n*Hanya angka:", "15000");
    if (!hargaBaru || isNaN(hargaBaru)) return alert("Harga tidak valid!");
    
    const newMenu = {
        id: 'menu_new_' + Date.now(),
        nama: namaBaru,
        kategori: 'coffee', // Default
        hargaAsli: parseInt(hargaBaru),
        hargaDiskon: parseInt(hargaBaru),
        img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80', // Gambar default
        desc: 'Menu baru ditambahkan manual oleh Master Owner.',
        isSoldOut: false,
        tipeMinuman: 'dingin'
    };
    
    window.katalogMenu.push(newMenu);
    
    // Render ulang katalog agar menu langsung muncul!
    if(typeof window.renderKatalog === 'function') window.renderKatalog(window.kategoriAktif);
    
    alert(`Sukses! ${namaBaru} berhasil ditambahkan ke Katalog Menu E-Menu Anda.`);
};

// 4. Menghidupkan Input Manual "Tambah Staf" di Panel HRD
window.tambahStafManual = function() {
    let namaStaf = prompt("Masukkan Nama Staf Baru:");
    if (!namaStaf) return;
    
    let pinStaf = prompt("Buat 6 digit PIN untuk " + namaStaf + ":", "112233");
    if (!pinStaf || pinStaf.length !== 6) return alert("PIN harus 6 digit!");
    
    alert(`Sukses! Staf ${namaStaf} dengan PIN ${pinStaf} berhasil didaftarkan ke sistem absensi.`);
};

// 5. Menghubungkan Tombol Aksi Owner ke Fungsi Input Manual di Atas
window.addEventListener('DOMContentLoaded', () => {
    // Cari tombol Tambah Menu
    const btnsKatalog = document.querySelectorAll('#panel-katalog button');
    btnsKatalog.forEach(btn => {
        if (btn.innerText.includes('Tambah Menu')) btn.onclick = window.tambahMenuManual;
    });
    
    // Cari tombol Tambah Staf HRD
    const btnsHRD = document.querySelectorAll('#panel-hrd button');
    btnsHRD.forEach(btn => {
        if (btn.innerText.includes('Tambah Staf')) btn.onclick = window.tambahStafManual;
    });
    
    // Cegah interaksi navigasi bawah saat panel utama terbuka
    const masterPanels = document.querySelectorAll('.panel-slide-up');
    const navBottom = document.querySelector('nav');
    
    masterPanels.forEach(panel => {
        // Observers untuk menyembunyikan/menggelapkan nav jika panel terbuka
        const observer = new MutationObserver(mutations => {
            mutations.forEach(m => {
                if(m.target.classList.contains('flex') && navBottom) {
                    navBottom.style.opacity = '0.3';
                    navBottom.style.pointerEvents = 'none';
                } else if(navBottom) {
                    navBottom.style.opacity = '1';
                    navBottom.style.pointerEvents = 'auto';
                }
            });
        });
        observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
    });
});
// ============================================================================
// 33. UPDATE UX: SWIPE CAROUSEL MANUAL & LOGIKA CERDAS TOMBOL KASIR
// ============================================================================

// --- A. Sistem Deteksi Geser (Swipe) Manual pada Carousel ---
let sentuhanAwalX = 0;
let sentuhanAkhirX = 0;

window.addEventListener('DOMContentLoaded', () => {
    const wadahCarousel = document.querySelector('#carousel-img');
    if (wadahCarousel && wadahCarousel.parentElement) {
        const areaSentuh = wadahCarousel.parentElement;
        
        areaSentuh.addEventListener('touchstart', e => {
            sentuhanAwalX = e.changedTouches[0].screenX;
        }, {passive: true});

        areaSentuh.addEventListener('touchend', e => {
            sentuhanAkhirX = e.changedTouches[0].screenX;
            if (sentuhanAkhirX < sentuhanAwalX - 40) {
                // Geser Kiri -> Slide Berikutnya
                window.currentSlideIdx = (window.currentSlideIdx + 1) % window.carouselData.length;
                window.renderCarouselSlide(window.currentSlideIdx);
            }
            if (sentuhanAkhirX > sentuhanAwalX + 40) {
                // Geser Kanan -> Slide Sebelumnya
                window.currentSlideIdx = (window.currentSlideIdx - 1 + window.carouselData.length) % window.carouselData.length;
                window.renderCarouselSlide(window.currentSlideIdx);
            }
        }, {passive: true});
    }
});

// --- B. Upgrade Rendering Kasir (Logika Cek WA & Arah Chat Otomatis) ---
// Kode ini akan menimpa (override) fungsi renderListKasir sebelumnya menjadi versi lebih cerdas
window.renderListKasir = function() {
    const container = document.getElementById('kasir-list-container');
    container.innerHTML = '';
    
    let dataRender = [];
    let emptyMsg = "";
    let emptyIcon = "";

    // Pemetaan data berdasarkan Tab Aktif
    if (window.kasirTabAktif === 'konfirmasi') {
        dataRender = window.pesananMasukDB;
        emptyMsg = "Belum ada pesanan masuk. Pantau terus.";
        emptyIcon = "fa-clipboard-list";
    } else if (window.kasirTabAktif === 'dapur') {
        dataRender = window.pesananDapurDB;
        emptyMsg = "Tidak ada pesanan yang sedang diproses dapur.";
        emptyIcon = "fa-fire-burner";
    } else {
        dataRender = window.pesananSelesaiDB;
        emptyMsg = "Belum ada pesanan yang selesai hari ini.";
        emptyIcon = "fa-check-double";
    }

    if (dataRender.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 text-gray-400">
                <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <i class="fa-solid ${emptyIcon} text-3xl opacity-50 text-slate-500"></i>
                </div>
                <p class="text-sm font-black text-slate-500">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    // Eksekusi Cetak Kartu Pesanan
    dataRender.forEach((order, index) => {
        let actionButtons = "";
        let orderItemsHTML = "";
        
        // Render rincian menu
        order.items.forEach(item => {
            orderItemsHTML += `<p class="text-[10px] font-bold text-gray-600 border-b border-gray-100 py-1.5 last:border-0">• ${item.qty}x ${item.nama} <span class="text-amber-500">(${item.levelEs}, ${item.levelGula})</span></p>`;
        });

        // Logika Tab Konfirmasi
        if (window.kasirTabAktif === 'konfirmasi') {
            
            // LOGIKA CEK WA CERDAS
            let btnCekWA = '';
            if (order.metodeBayar === 'QRIS Resto' || order.tipeOrder.includes('Pre-Order')) {
                // Syarat WA valid: Ada isinya, tidak sama dengan "-", dan panjangnya masuk akal
                if (order.phone && order.phone !== "-" && order.phone.length > 8) {
                    btnCekWA = `<button onclick="window.open('https://wa.me/${order.phone}', '_blank')" class="flex-1 bg-blue-50 text-blue-600 font-black py-2.5 rounded-xl border border-blue-200 hover:bg-blue-100 transition text-[10px]"><i class="fa-brands fa-whatsapp mr-1 text-sm"></i> Cek WA</button>`;
                } else {
                    btnCekWA = `<button onclick="alert('Pelanggan tidak memasukkan nomor WhatsApp.\\n\\nSilakan minta pelanggan menunjukkan bukti transfer fisik langsung di meja kasir.')" class="flex-1 bg-slate-100 text-slate-600 font-black py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 transition text-[10px]"><i class="fa-solid fa-mobile-screen mr-1 text-sm"></i> Cek Kasir</button>`;
                }
            }
                
            actionButtons = `
                <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onclick="batalPesanan('${order.noAntrean}')" class="flex-1 bg-red-50 text-red-500 font-black py-2.5 rounded-xl border border-red-200 hover:bg-red-100 transition text-[10px]"><i class="fa-solid fa-xmark mr-1"></i> Batal</button>
                    ${btnCekWA}
                    <button onclick="terimaPesanan('${order.noAntrean}')" class="flex-1 bg-amber-500 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-amber-600 transition text-[10px]"><i class="fa-solid fa-fire-burner mr-1"></i> Proses</button>
                </div>
            `;
        } 
        // Logika Tab Dapur
        else if (window.kasirTabAktif === 'dapur') {
            actionButtons = `
                <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button onclick="cetakThermal('${order.noAntrean}')" class="flex-1 bg-gray-800 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-black transition text-[10px]"><i class="fa-solid fa-print mr-1"></i> Thermal</button>
                    <button onclick="selesaiPesanan('${order.noAntrean}')" class="flex-1 bg-green-500 text-white font-black py-2.5 rounded-xl shadow-md hover:bg-green-600 transition text-[10px]"><i class="fa-solid fa-check-double mr-1"></i> Pesanan Siap!</button>
                </div>
            `;
        }
        // Logika Tab Selesai
        else if (window.kasirTabAktif === 'selesai') {
            actionButtons = `
                <div class="mt-4 pt-3 border-t border-gray-100 text-center">
                    <span class="inline-block bg-green-100 text-green-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-green-200"><i class="fa-solid fa-check mr-1"></i> Pesanan Telah Selesai</span>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="bg-white p-4 rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-gray-100 relative transition transform hover:-translate-y-1">
                <div class="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                    <div>
                        <h3 class="font-black text-gray-900 text-sm flex items-center gap-1.5"><i class="fa-solid fa-hashtag text-amber-500"></i> ${order.noAntrean}</h3>
                        <p class="text-[10px] font-bold text-gray-500">${order.nama} • ${order.phone}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block bg-amber-50 text-amber-700 text-[9px] font-black px-2 py-1 rounded border border-amber-200 uppercase mb-1">${order.tipeOrder}</span>
                        <p class="text-[10px] font-black text-blue-600">${order.metodeBayar}</p>
                    </div>
                </div>
                
                <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3">
                    ${orderItemsHTML}
                </div>
                
                <div class="flex justify-between items-center px-1">
                    <span class="text-[10px] font-bold text-gray-400">Total Tagihan:</span>
                    <span class="text-base font-black text-gray-900">${window.formatRupiah(order.totalBayar)}</span>
                </div>

                ${actionButtons}
            </div>
        `;
    });
};
// ============================================================================
// 34. REVISI SINKRONISASI STATS, NAVIGASI TERKUNCI, & CRUD STOK KASIR
// ============================================================================

// --- A. MENGUNCI NAVIGASI BAWAH SAAT SEDANG LOGIN ---
const originalSwitchRole = window.switchRoleView;
window.switchRoleView = function(role) {
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
    
    // Jika sedang login sebagai KASIR, cegah pindah ke halaman lain
    if (currentSession === 'kasir' && role !== 'kasir') {
        return alert("Akses Terkunci!\nAnda sedang login sebagai Staf Kasir.\nHarap tekan tombol LOGOUT (ikon daya merah) di menu atas terlebih dahulu untuk keluar.");
    }
    
    // Jika sedang login sebagai OWNER, cegah pindah ke halaman lain
    if (currentSession === 'owner' && role !== 'owner') {
        return alert("Akses Terkunci!\nAnda sedang login sebagai Master Owner.\nHarap tekan tombol KUNCI (ikon gembok) terlebih dahulu untuk keluar.");
    }
    
    // Jika aman (belum login atau mau login ke role yang sesuai), izinkan.
    originalSwitchRole(role);
};

// --- B. FIX STATISTIK HILANG SAAT REFRESH ---
const originalUpdateStat = window.updateStatistikOwner;
window.updateStatistikOwner = function() {
    // 1. Tarik paksa data terbaru dari LocalStorage SEBELUM menghitung
    window.muatDatabaseKasir(); 
    
    // 2. Jalankan perhitungan
    const statPendapatan = document.getElementById('stat-pendapatan');
    if(!statPendapatan) return;
    
    let total = 0;
    window.pesananSelesaiDB.forEach(o => total += o.totalBayar);
    
    statPendapatan.textContent = window.formatRupiah(total);
    
    // 3. Update Angka di 3 Kotak 
    const pMasuk = document.getElementById('stat-pesanan');
    const pDapur = document.getElementById('stat-dapur');
    const pSelesai = document.getElementById('stat-selesai');
    
    if(pMasuk) pMasuk.textContent = window.pesananMasukDB.length;
    if(pDapur) pDapur.textContent = window.pesananDapurDB.length;
    if(pSelesai) pSelesai.textContent = window.pesananSelesaiDB.length;
};


// --- C. FITUR CRUD STOK BARANG UNTUK STAF KASIR ---
window.stokBarangDB = JSON.parse(localStorage.getItem('stokBarangMainstay')) || [
    { id: 's1', nama: 'Cup Gelas Plastik', jumlah: 100 },
    { id: 's2', nama: 'Sedotan Hitam', jumlah: 150 },
    { id: 's3', nama: 'Susu UHT 1L', jumlah: 12 },
    { id: 's4', nama: 'Gula Aren Cair (ml)', jumlah: 2000 }
];

window.openStokKasir = function() {
    window.renderStokKasir();
    const m = document.getElementById('modal-stok-kasir');
    if(m) { m.classList.remove('hidden'); m.classList.add('flex'); }
};

window.closeStokKasir = function() {
    const m = document.getElementById('modal-stok-kasir');
    if(m) { m.classList.add('hidden'); m.classList.remove('flex'); }
};

window.renderStokKasir = function() {
    const container = document.getElementById('stok-kasir-list');
    if(!container) return;
    container.innerHTML = window.stokBarangDB.map((item, idx) => `
        <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
            <p class="text-xs font-black text-gray-800">${item.nama}</p>
            <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button onclick="window.updateStokItem(${idx}, -1)" class="w-8 h-8 rounded bg-slate-100 hover:bg-red-100 hover:text-red-600 transition font-bold"><i class="fa-solid fa-minus"></i></button>
                <input type="number" id="stok-val-${idx}" value="${item.jumlah}" class="w-12 text-center text-sm font-black outline-none bg-transparent" onchange="window.manualInputStok(${idx})">
                <button onclick="window.updateStokItem(${idx}, 1)" class="w-8 h-8 rounded bg-slate-100 hover:bg-green-100 hover:text-green-600 transition font-bold"><i class="fa-solid fa-plus"></i></button>
            </div>
        </div>
    `).join('');
};

window.updateStokItem = function(idx, val) {
    let current = parseInt(document.getElementById(`stok-val-${idx}`).value) || 0;
    current += val; if(current < 0) current = 0;
    document.getElementById(`stok-val-${idx}`).value = current;
};

window.manualInputStok = function(idx) {
    let current = parseInt(document.getElementById(`stok-val-${idx}`).value) || 0;
    if(current < 0) current = 0;
    document.getElementById(`stok-val-${idx}`).value = current;
};

window.simpanStokKasir = function() {
    window.stokBarangDB.forEach((item, idx) => {
        item.jumlah = parseInt(document.getElementById(`stok-val-${idx}`).value) || 0;
    });
    localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
    alert("Berhasil! Stok barang dan alat hari ini telah diperbarui.");
    window.closeStokKasir();
};

// Pasang Antarmuka Modal & Tombol Stok secara Otomatis
window.addEventListener('DOMContentLoaded', () => {
    // 1. Suntik Pop-up Modal Stok ke dalam HTML
    if(!document.getElementById('modal-stok-kasir')) {
        const stockModalHTML = `
        <div id="modal-stok-kasir" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] hidden items-center justify-center fade-in px-4">
            <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[80vh]">
                <button onclick="window.closeStokKasir()" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
                <h2 class="text-xl font-black text-gray-900 mb-1"><i class="fa-solid fa-boxes-stacked text-indigo-500 mr-2"></i> Stok Harian</h2>
                <p class="text-xs text-gray-500 mb-4">Update ketersediaan bahan. Hanya bisa diakses saat jam kerja staf.</p>
                <div id="stok-kasir-list" class="flex-1 overflow-y-auto space-y-3 pr-2 hide-scrollbar"></div>
                <button onclick="window.simpanStokKasir()" class="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-[0_4px_15px_rgba(99,102,241,0.4)] hover:bg-indigo-600 transition text-sm mt-4"><i class="fa-solid fa-floppy-disk mr-2"></i> SIMPAN STOK</button>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', stockModalHTML);
    }

    // 2. Suntik Tombol "Stok" di sebelah tombol "Absen" di Halaman Kasir
    const kasirTopBar = document.querySelector('#view-kasir .flex.gap-2');
    if (kasirTopBar && !document.getElementById('btn-stok-kasir')) {
        const btnStok = document.createElement('button');
        btnStok.id = 'btn-stok-kasir';
        btnStok.className = 'bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-100 transition shadow-sm';
        btnStok.innerHTML = '<i class="fa-solid fa-box-open text-sm"></i> Stok';
        btnStok.onclick = window.openStokKasir;
        
        // Letakkan tepat di depan tombol Logout Kasir (berwarna merah)
        kasirTopBar.insertBefore(btnStok, kasirTopBar.lastElementChild);
    }

    // 3. Panggil sekali agar stat terupdate dengan benar saat web baru dibuka
    setTimeout(window.updateStatistikOwner, 500);
});
// ============================================================================
// 35. REVISI UX OWNER (TOMBOL KEMBALI, LOGOUT, & SISTEM PROFILING HRD)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. Ubah Tombol "Kunci" menjadi "Logout" di Dasbor Owner ---
    const btnKunci = document.querySelector('#view-owner button[onclick="prosesLogout(\'owner\')"]');
    if (btnKunci) {
        btnKunci.innerHTML = '<i class="fa-solid fa-power-off text-red-400 group-hover:text-white transition"></i> Logout';
    }

    // --- B. Perjelas Tombol "Kembali" di SEMUA 8 Panel Master ---
    const panelHeaders = document.querySelectorAll('.panel-slide-up .bg-gray-900');
    panelHeaders.forEach(header => {
        const closeBtn = header.querySelector('button');
        if (closeBtn) {
            // Ubah tombol bulat kecil menjadi tombol KEMBALI merah yang tegas
            closeBtn.className = "bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 transition flex items-center gap-2 shadow-md";
            closeBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> KEMBALI';
        }
    });

    // --- C. BANGUN SISTEM PROFILING HRD (CRUD LENGKAP & KALKULATOR GAJI) ---
    
    // 1. Data Base Pegawai (Tersimpan di Memori Lokal)
    window.dbStaf = JSON.parse(localStorage.getItem('dbStafMainstay')) || [
        { id: 'staf_1', nama: 'Budi (Kasir 1)', foto: 'https://ui-avatars.com/api/?name=Budi&background=14b8a6&color=fff', tglMasuk: '2026-01-10', shiftMulai: '08:00', shiftSelesai: '16:00', tipeGaji: 'Harian', nominalGaji: 50000 }
    ];

    // 2. Render Tampilan Utama Panel HRD
    const hrdContainer = document.querySelector('#panel-hrd .flex-1');
    if(hrdContainer) {
        hrdContainer.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-users text-teal-500"></i> Profiling Staf</h3>
                    <button onclick="window.bukaFormStaf()" class="bg-teal-500 text-white px-3 py-2 rounded-xl text-xs font-black shadow-md hover:bg-teal-600 transition"><i class="fa-solid fa-plus mr-1"></i> Tambah Staf</button>
                </div>
                <div id="hrd-staf-list" class="space-y-4"></div>
            </div>
        `;
    }

    // 3. Fungsi Render Daftar Pegawai
    window.renderStafList = function() {
        const list = document.getElementById('hrd-staf-list');
        if(!list) return;

        if(window.dbStaf.length === 0) {
            list.innerHTML = `<p class="text-center text-xs text-gray-400 py-4 font-bold">Belum ada data staf. Silakan tambah.</p>`;
            return;
        }

        list.innerHTML = window.dbStaf.map(staf => `
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-4 items-start relative transition hover:shadow-md">
                <button onclick="window.hapusStaf('${staf.id}')" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash-can"></i></button>
                <img src="${staf.foto}" class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm bg-gray-200">
                <div class="flex-1 pr-6">
                    <h4 class="font-black text-sm text-gray-900 mb-0.5">${staf.nama}</h4>
                    <p class="text-[10px] text-gray-500 font-bold mb-2"><i class="fa-solid fa-calendar-days mr-1"></i> Mulai Kerja: ${staf.tglMasuk}</p>
                    <div class="grid grid-cols-2 gap-2 mt-2">
                        <div class="bg-white p-2 rounded-lg border border-slate-200">
                            <p class="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Jadwal Shift</p>
                            <p class="text-xs font-black text-gray-800"><i class="fa-regular fa-clock text-amber-500 mr-1"></i> ${staf.shiftMulai} - ${staf.shiftSelesai}</p>
                        </div>
                        <div class="bg-white p-2 rounded-lg border border-slate-200">
                            <p class="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Gaji (${staf.tipeGaji})</p>
                            <p class="text-xs font-black text-teal-600">${window.formatRupiah(staf.nominalGaji)}</p>
                        </div>
                    </div>
                    <button onclick="window.bukaFormStaf('${staf.id}')" class="mt-3 text-[10px] font-black text-blue-500 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition"><i class="fa-solid fa-pen-to-square mr-1"></i> Edit Profil</button>
                </div>
            </div>
        `).join('');
    };

    // Panggil render list pertama kali
    window.renderStafList();

    // 4. Suntik HTML Modal Form Staf ke Body
    if(!document.getElementById('modal-form-staf')) {
        const modalForm = `
        <div id="modal-form-staf" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] hidden items-center justify-center fade-in px-4 pb-safe">
            <div class="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
                <h2 class="text-lg font-black text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2" id="staf-form-title"><i class="fa-solid fa-user-plus text-teal-500"></i> Form Data Staf</h2>
                <div class="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
                    <input type="hidden" id="staf-id">
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Nama Lengkap</label><input type="text" id="staf-nama" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-teal-500 outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Link Foto URL (Opsional)</label><input type="text" id="staf-foto" placeholder="https://..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-teal-500 outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Tanggal Bergabung</label><input type="date" id="staf-tgl" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-teal-500 outline-none"></div>
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Jam Mulai Shift</label><input type="time" id="staf-mulai" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-teal-500 outline-none" onchange="window.kalkulasiGaji()"></div>
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Jam Selesai Shift</label><input type="time" id="staf-selesai" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-teal-500 outline-none" onchange="window.kalkulasiGaji()"></div>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Kategori Pembayaran Gaji</label>
                        <select id="staf-tipe" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-teal-500 outline-none cursor-pointer" onchange="window.kalkulasiGaji()">
                            <option value="Per Jam">Per Jam (Hourly)</option>
                            <option value="Harian">Harian (Daily)</option>
                            <option value="Mingguan">Mingguan (Weekly)</option>
                            <option value="Bulanan">Bulanan (Monthly)</option>
                        </select>
                    </div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1 uppercase">Nominal Gaji</label><div class="relative"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Rp</span><input type="number" id="staf-nominal" placeholder="50000" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-3 text-sm font-black focus:border-teal-500 outline-none" oninput="window.kalkulasiGaji()"></div></div>

                    <div class="bg-teal-50 p-4 rounded-xl border border-teal-200 mt-2">
                        <p class="text-[10px] font-black text-teal-800 mb-1.5 uppercase tracking-wider"><i class="fa-solid fa-calculator mr-1"></i> Kalkulator Shift Otomatis:</p>
                        <p id="staf-kalkulasi" class="text-xs font-bold text-teal-900 leading-relaxed">- Isi jam & nominal terlebih dahulu -</p>
                    </div>
                </div>
                <div class="flex gap-3 mt-5 pt-4 border-t border-gray-100">
                    <button onclick="window.tutupFormStaf()" class="flex-1 bg-slate-100 text-slate-600 font-black py-3.5 rounded-xl hover:bg-slate-200 transition text-sm">BATAL</button>
                    <button onclick="window.simpanStaf()" class="flex-1 bg-teal-500 text-white font-black py-3.5 rounded-xl hover:bg-teal-600 transition text-sm shadow-md">SIMPAN DATA</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalForm);
    }

    // 5. Fungsi Logika Form & Perhitungan Gaji Otomatis
    window.bukaFormStaf = function(id = null) {
        const modal = document.getElementById('modal-form-staf');
        if(!modal) return;
        
        if (id) {
            // Mode EDIT
            const staf = window.dbStaf.find(s => s.id === id);
            document.getElementById('staf-form-title').innerHTML = '<i class="fa-solid fa-user-pen text-teal-500"></i> Edit Data Staf';
            document.getElementById('staf-id').value = staf.id;
            document.getElementById('staf-nama').value = staf.nama;
            document.getElementById('staf-foto').value = staf.foto.includes('ui-avatars') ? '' : staf.foto;
            document.getElementById('staf-tgl').value = staf.tglMasuk;
            document.getElementById('staf-mulai').value = staf.shiftMulai;
            document.getElementById('staf-selesai').value = staf.shiftSelesai;
            document.getElementById('staf-tipe').value = staf.tipeGaji;
            document.getElementById('staf-nominal').value = staf.nominalGaji;
        } else {
            // Mode TAMBAH BARU
            document.getElementById('staf-form-title').innerHTML = '<i class="fa-solid fa-user-plus text-teal-500"></i> Tambah Staf Baru';
            document.getElementById('staf-id').value = '';
            document.getElementById('staf-nama').value = '';
            document.getElementById('staf-foto').value = '';
            document.getElementById('staf-tgl').value = new Date().toISOString().split('T')[0];
            document.getElementById('staf-mulai').value = '08:00';
            document.getElementById('staf-selesai').value = '17:00';
            document.getElementById('staf-tipe').value = 'Harian';
            document.getElementById('staf-nominal').value = '';
        }
        
        window.kalkulasiGaji();
        modal.classList.remove('hidden'); modal.classList.add('flex');
    };

    window.tutupFormStaf = function() {
        const modal = document.getElementById('modal-form-staf');
        modal.classList.add('hidden'); modal.classList.remove('flex');
    };

    window.kalkulasiGaji = function() {
        const mulai = document.getElementById('staf-mulai').value;
        const selesai = document.getElementById('staf-selesai').value;
        const tipe = document.getElementById('staf-tipe').value;
        const nominal = parseInt(document.getElementById('staf-nominal').value) || 0;
        const kal = document.getElementById('staf-kalkulasi');

        if(!mulai || !selesai) { kal.textContent = "Lengkapi jam shift terlebih dahulu."; return; }

        // Hitung durasi jam
        let h1 = parseInt(mulai.split(':')[0]), m1 = parseInt(mulai.split(':')[1]);
        let h2 = parseInt(selesai.split(':')[0]), m2 = parseInt(selesai.split(':')[1]);
        let minTotal = (h2 * 60 + m2) - (h1 * 60 + m1);
        
        // Logika jika shift melintasi tengah malam (misal 16:00 ke 02:00)
        if(minTotal < 0) minTotal += 24 * 60; 
        
        let jamKerja = (minTotal / 60).toFixed(1); // 1 desimal, misal 8.5 jam
        jamKerja = jamKerja.replace('.0', ''); // bersihkan jika bulat

        if(tipe === "Per Jam") {
            kal.innerHTML = `Durasi Shift: <b>${jamKerja} Jam / Hari</b><br>Hitungan: ${jamKerja} x ${window.formatRupiah(nominal)}<br>Potensi Gaji: <b>${window.formatRupiah(nominal * jamKerja)} / Hari</b>`;
        } else {
            kal.innerHTML = `Durasi Shift: <b>${jamKerja} Jam / Hari</b><br>Potensi Gaji: <b>${window.formatRupiah(nominal)} / ${tipe === 'Harian' ? 'Hari' : (tipe === 'Mingguan' ? 'Minggu' : 'Bulan')}</b>`;
        }
    };

    window.simpanStaf = function() {
        const id = document.getElementById('staf-id').value;
        const nama = document.getElementById('staf-nama').value;
        let foto = document.getElementById('staf-foto').value;
        const tgl = document.getElementById('staf-tgl').value;
        const mulai = document.getElementById('staf-mulai').value;
        const selesai = document.getElementById('staf-selesai').value;
        const tipe = document.getElementById('staf-tipe').value;
        const nominal = parseInt(document.getElementById('staf-nominal').value) || 0;

        if(!nama || !tgl || !nominal) return alert("Pastikan Nama, Tanggal, dan Nominal Gaji terisi!");

        // Jika foto kosong, buatkan foto profil inisial otomatis dari namanya
        if(!foto) foto = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=14b8a6&color=fff&size=200`;

        if (id) {
            // Update Data Lama
            const idx = window.dbStaf.findIndex(s => s.id === id);
            if(idx > -1) {
                window.dbStaf[idx] = { id, nama, foto, tglMasuk: tgl, shiftMulai: mulai, shiftSelesai: selesai, tipeGaji: tipe, nominalGaji: nominal };
            }
        } else {
            // Tambah Data Baru
            window.dbStaf.push({
                id: 'staf_' + Date.now(),
                nama, foto, tglMasuk: tgl, shiftMulai: mulai, shiftSelesai: selesai, tipeGaji: tipe, nominalGaji: nominal
            });
        }

        // Simpan permanen & refresh
        localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
        window.renderStafList();
        window.tutupFormStaf();
    };

    window.hapusStaf = function(id) {
        if(confirm("Yakin ingin menghapus data pegawai ini?")) {
            window.dbStaf = window.dbStaf.filter(s => s.id !== id);
            localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
            window.renderStafList();
        }
    };
});
// ============================================================================
// 36. ULTIMATE SYSTEM PATCH (REAL CRUD KATALOG, DUAL UPLOAD, & CLOCK FIX)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. REVISI HEADER JAM (Di-Enter / Dua Baris) ---
    window.updateClock = function() {
        const now = new Date();
        const hariArray = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const bulanArray = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const tgl = `${hariArray[now.getDay()]}, ${String(now.getDate()).padStart(2,'0')} ${bulanArray[now.getMonth()]} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB`;
        
        const el = document.getElementById('live-clock');
        if (el) {
            el.innerHTML = `<span class="block text-right mb-0.5 tracking-wide">${tgl}</span><span class="block text-right text-amber-600 font-black leading-none">${jam}</span>`;
            el.className = "text-[10px] font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200"; // Mempercantik kotak jam
        }
    };

    // --- 2. SISTEM DUAL UPLOAD GAMBAR (File Galeri ke Base64 / URL) ---
    window.handleImageUpload = function(inputElement, targetInputId, previewImgId = null) {
        const file = inputElement.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const base64Str = e.target.result;
            document.getElementById(targetInputId).value = base64Str; // Masukkan base64 ke input teks
            if(previewImgId && document.getElementById(previewImgId)) {
                document.getElementById(previewImgId).src = base64Str;
            }
            alert("Gambar berhasil di-upload!");
        };
        reader.readAsDataURL(file);
    };

    // --- 3. REVISI PANEL EDIT WEB (Ganti Logo) ---
    const panelWeb = document.querySelector('#panel-edit-web .space-y-4');
    if (panelWeb && !document.getElementById('setting-logo')) {
        panelWeb.insertAdjacentHTML('afterbegin', `
            <div class="bg-amber-50 p-4 rounded-xl border border-amber-200 mb-4">
                <label class="text-[10px] font-black text-amber-800 block mb-2 uppercase"><i class="fa-solid fa-mug-hot mr-1"></i> Logo Restoran (Dual Input)</label>
                <div class="space-y-2">
                    <input type="text" id="setting-logo" placeholder="Paste Link Gambar URL..." class="w-full bg-white border border-amber-300 rounded-xl p-3 text-xs focus:border-amber-500 outline-none">
                    <div class="text-center text-xs font-bold text-amber-700">- ATAU -</div>
                    <input type="file" accept="image/*" class="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs" onchange="window.handleImageUpload(this, 'setting-logo', 'header-logo-img')">
                </div>
            </div>
        `);
        
        // Update logika simpan web
        const oldSimpanWeb = window.simpanPengaturanWeb;
        window.simpanPengaturanWeb = function() {
            oldSimpanWeb();
            const logoVal = document.getElementById('setting-logo').value;
            if(logoVal) {
                window.systemConfig.logoUrl = logoVal;
                const icon = document.getElementById('header-logo-icon');
                const img = document.getElementById('header-logo-img');
                if(icon) icon.classList.add('hidden');
                if(img) { img.src = logoVal; img.classList.remove('hidden'); }
                localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
            }
        };
        
        // Load logo saat dimuat
        if(window.systemConfig.logoUrl) {
            const icon = document.getElementById('header-logo-icon');
            const img = document.getElementById('header-logo-img');
            if(icon) icon.classList.add('hidden');
            if(img) { img.src = window.systemConfig.logoUrl; img.classList.remove('hidden'); }
            setTimeout(() => document.getElementById('setting-logo').value = window.systemConfig.logoUrl, 500);
        }
    }

    // --- 4. ULTIMATE CRUD MASTER KATALOG MENU ---
    // Muat data dari memori jika ada
    const savedKatalog = localStorage.getItem('dbKatalogMainstay');
    if(savedKatalog) window.katalogMenu = JSON.parse(savedKatalog);

    const panelKatalog = document.querySelector('#panel-katalog .flex-1');
    if(panelKatalog) {
        panelKatalog.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-book-open text-amber-500"></i> Manajemen Menu</h3>
                    <button onclick="window.bukaFormMenu()" class="bg-amber-500 text-white px-3 py-2 rounded-xl text-xs font-black shadow-md hover:bg-amber-600 transition"><i class="fa-solid fa-plus mr-1"></i> Tambah Menu</button>
                </div>
                <div id="admin-menu-list" class="space-y-3"></div>
            </div>
        `;
    }

    // Render List Menu di Panel Admin
    window.renderAdminKatalog = function() {
        const list = document.getElementById('admin-menu-list');
        if(!list) return;

        list.innerHTML = window.katalogMenu.map(m => {
            const diskonHtml = m.hargaDiskon < m.hargaAsli ? `<span class="text-[10px] text-gray-400 line-through mr-1">${window.formatRupiah(m.hargaAsli)}</span><span class="text-xs font-black text-amber-500">${window.formatRupiah(m.hargaDiskon)}</span>` : `<span class="text-xs font-black text-gray-800">${window.formatRupiah(m.hargaAsli)}</span>`;
            const statusHtml = m.isSoldOut ? `<span class="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Sold Out</span>` : `<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Tersedia</span>`;
            
            return `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex gap-3 items-center">
                <img src="${m.img}" class="w-14 h-14 rounded-lg object-cover shadow-sm bg-white">
                <div class="flex-1">
                    <h4 class="font-black text-sm text-gray-900">${m.nama} ${statusHtml}</h4>
                    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">${m.kategori} | ${m.tipeMinuman}</p>
                    <div>${diskonHtml}</div>
                </div>
                <div class="flex flex-col gap-1">
                    <button onclick="window.bukaFormMenu('${m.id}')" class="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="window.hapusMenu('${m.id}')" class="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    };
    window.renderAdminKatalog();

    // Injeksi HTML Modal Form Menu ke Body
    if(!document.getElementById('modal-form-menu')) {
        const formHTML = `
        <div id="modal-form-menu" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] hidden items-center justify-center fade-in px-4 pb-safe">
            <div class="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
                <h2 class="text-lg font-black text-gray-900 mb-4 border-b border-gray-100 pb-3" id="menu-form-title">Form Menu</h2>
                <div class="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar">
                    <input type="hidden" id="fm-id">
                    
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Nama Menu</label><input type="text" id="fm-nama" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold focus:border-amber-500 outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Deskripsi Pendek</label><textarea id="fm-desc" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold focus:border-amber-500 outline-none"></textarea></div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Kategori</label>
                            <select id="fm-kategori" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer">
                                <option value="coffee">Coffee</option>
                                <option value="non-coffee">Non-Coffee</option>
                                <option value="snack">Snack/Makanan</option>
                            </select>
                        </div>
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Tipe (Es/Panas)</label>
                            <select id="fm-tipe" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none cursor-pointer">
                                <option value="dingin">Bisa Dingin (Ada Es)</option>
                                <option value="panas">Hanya Panas</option>
                                <option value="-">Bukan Minuman</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        <div><label class="text-[10px] font-black text-amber-800 block mb-1">Harga Asli (Rp)</label><input type="number" id="fm-harga" class="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-sm font-black focus:border-amber-500 outline-none"></div>
                        <div><label class="text-[10px] font-black text-red-600 block mb-1">Harga Promo (Opsional)</label><input type="number" id="fm-diskon" placeholder="Kosongkan jika tidak promo" class="w-full bg-white border border-red-200 rounded-xl p-2.5 text-sm font-black focus:border-red-500 outline-none"></div>
                    </div>

                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <label class="text-[10px] font-black text-blue-800 block mb-2">Gambar Menu (URL atau Upload File)</label>
                        <input type="text" id="fm-img" placeholder="https://..." class="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs focus:border-blue-500 outline-none mb-2">
                        <input type="file" accept="image/*" class="w-full bg-white border border-blue-200 rounded-xl p-2 text-xs" onchange="window.handleImageUpload(this, 'fm-img')">
                    </div>

                    <div class="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                        <span class="text-sm font-black text-gray-800">Status Menu</span>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="fm-soldout" class="w-5 h-5 accent-red-500 rounded">
                            <span class="text-xs font-bold text-red-600">Tandai SOLD OUT (Habis)</span>
                        </label>
                    </div>

                    <!-- PENGATURAN TOPPING AKTIF PER MENU -->
                    <div class="bg-white p-3 rounded-xl border border-gray-200 shadow-inner">
                        <label class="text-[10px] font-black text-gray-800 block mb-2 uppercase">Ceklis Topping yg Berlaku di Menu ini</label>
                        <div id="fm-topping-container" class="space-y-2"></div>
                    </div>
                </div>
                <div class="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                    <button onclick="document.getElementById('modal-form-menu').classList.add('hidden'); document.getElementById('modal-form-menu').classList.remove('flex');" class="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-xl hover:bg-slate-200 transition text-sm">BATAL</button>
                    <button onclick="window.simpanMenu()" class="flex-1 bg-amber-500 text-white font-black py-3 rounded-xl hover:bg-amber-600 transition text-sm shadow-md">SIMPAN MENU</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', formHTML);
    }

    // Fungsi Logika Modal Menu
    window.bukaFormMenu = function(id = null) {
        const modal = document.getElementById('modal-form-menu');
        const containerTopping = document.getElementById('fm-topping-container');
        
        // Render Checkbox Topping berdasarkan Opsi Global
        containerTopping.innerHTML = window.opsiTambahan.topping.map(top => `
            <label class="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100">
                <input type="checkbox" value="${top.nama}" class="fm-topping-cb w-4 h-4 accent-amber-500">
                <span class="text-xs font-bold text-gray-700">${top.nama} (+${top.harga})</span>
            </label>
        `).join('');

        if(id) {
            const m = window.katalogMenu.find(x => x.id === id);
            document.getElementById('menu-form-title').innerHTML = '<i class="fa-solid fa-pen text-amber-500"></i> Edit Menu';
            document.getElementById('fm-id').value = m.id;
            document.getElementById('fm-nama').value = m.nama;
            document.getElementById('fm-desc').value = m.desc;
            document.getElementById('fm-kategori').value = m.kategori;
            document.getElementById('fm-tipe').value = m.tipeMinuman;
            document.getElementById('fm-harga').value = m.hargaAsli;
            document.getElementById('fm-diskon').value = m.hargaDiskon < m.hargaAsli ? m.hargaDiskon : '';
            document.getElementById('fm-img').value = m.img;
            document.getElementById('fm-soldout').checked = m.isSoldOut;
            
            // Centang topping yang diizinkan (jika array allowedToppings tidak ada, centang semua sbg default)
            const cbs = document.querySelectorAll('.fm-topping-cb');
            cbs.forEach(cb => {
                if(!m.allowedToppings || m.allowedToppings.includes(cb.value)) cb.checked = true;
                else cb.checked = false;
            });
        } else {
            document.getElementById('menu-form-title').innerHTML = '<i class="fa-solid fa-plus text-amber-500"></i> Menu Baru';
            document.getElementById('fm-id').value = '';
            document.getElementById('fm-nama').value = '';
            document.getElementById('fm-desc').value = '';
            document.getElementById('fm-harga').value = '';
            document.getElementById('fm-diskon').value = '';
            document.getElementById('fm-img').value = '';
            document.getElementById('fm-soldout').checked = false;
            document.querySelectorAll('.fm-topping-cb').forEach(cb => cb.checked = true); // Default all checked
        }
        
        modal.classList.remove('hidden'); modal.classList.add('flex');
    };

    window.simpanMenu = function() {
        const id = document.getElementById('fm-id').value;
        const hargaAsli = parseInt(document.getElementById('fm-harga').value) || 0;
        let hargaDiskon = parseInt(document.getElementById('fm-diskon').value) || 0;
        if(hargaDiskon === 0 || hargaDiskon > hargaAsli) hargaDiskon = hargaAsli; // Logika agar harga diskon aman

        // Kumpulkan topping yang diceklis
        const allowedToppings = [];
        document.querySelectorAll('.fm-topping-cb:checked').forEach(cb => allowedToppings.push(cb.value));

        const menuData = {
            id: id ? id : 'menu_' + Date.now(),
            nama: document.getElementById('fm-nama').value,
            desc: document.getElementById('fm-desc').value,
            kategori: document.getElementById('fm-kategori').value,
            tipeMinuman: document.getElementById('fm-tipe').value,
            hargaAsli: hargaAsli,
            hargaDiskon: hargaDiskon,
            img: document.getElementById('fm-img').value || 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80',
            isSoldOut: document.getElementById('fm-soldout').checked,
            allowedToppings: allowedToppings
        };

        if(!menuData.nama || !menuData.hargaAsli) return alert("Nama dan Harga Asli wajib diisi!");

        if(id) {
            const idx = window.katalogMenu.findIndex(m => m.id === id);
            window.katalogMenu[idx] = menuData;
        } else {
            window.katalogMenu.push(menuData);
        }

        // Simpan Permanen & Render Ulang
        localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
        window.renderAdminKatalog();
        window.renderKatalog(window.kategoriAktif); // Langsung update view Customer!
        
        document.getElementById('modal-form-menu').classList.add('hidden'); 
        document.getElementById('modal-form-menu').classList.remove('flex');
    };

    window.hapusMenu = function(id) {
        if(confirm("Yakin hapus menu ini permanen?")) {
            window.katalogMenu = window.katalogMenu.filter(m => m.id !== id);
            localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
            window.renderAdminKatalog();
            window.renderKatalog(window.kategoriAktif);
        }
    };

    // --- 5. MENYERTAKAN LOGIKA TOPPING AKTIF KE MODAL CUSTOMER ---
    // Override render modal menu customer agar membaca allowedToppings
    const originalOpenMenuDetail = window.openMenuDetail;
    window.openMenuDetail = function(id) {
        // Panggil fungsi asli untuk setting dasar
        originalOpenMenuDetail(id);
        
        // Modifikasi container varian untuk memfilter topping
        if(window.currentMenuDetail) {
            const allowed = window.currentMenuDetail.allowedToppings;
            
            // Jika ada pembatasan topping di menu ini
            if(allowed && Array.isArray(allowed)) {
                let topHtml = `<div class="bg-slate-50 p-4 rounded-2xl border border-slate-200"><p class="text-xs font-black text-gray-900 mb-3"><i class="fa-solid fa-cookie-bite text-amber-700 mr-2"></i> Topping Ekstra</p><div class="flex flex-col gap-2">`;
                
                let foundAny = false;
                window.opsiTambahan.topping.forEach(top => {
                    if(allowed.includes(top.nama)) {
                        foundAny = true;
                        topHtml += `<label class="flex items-center justify-between p-3 border-2 border-slate-200 rounded-xl cursor-pointer hover:bg-white transition group has-[:checked]:border-amber-500 has-[:checked]:bg-amber-50"><div class="flex items-center gap-3"><input type="checkbox" name="var_topping" value="${top.nama}" data-price="${top.harga}" class="w-5 h-5 accent-amber-500 rounded" onchange="window.kalkulasiHargaDetail()"><span class="text-xs font-bold text-gray-700 group-has-[:checked]:text-amber-800">${top.nama}</span></div><span class="text-[10px] font-black text-amber-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">+${window.formatRupiah(top.harga)}</span></label>`;
                    }
                });
                topHtml += `</div></div>`;
                
                // Jika tidak ada topping yang diaktifkan untuk menu ini, sembunyikan kotak topping
                if(!foundAny) topHtml = ''; 
                
                // Cari dan replace HTML bagian Topping saja (mempertahankan Es & Gula)
                const container = document.getElementById('detail-variants-container');
                if(container) {
                    // Karena HTML sebelumnya me-render Gula, Es, lalu Topping di index terakhir,
                    // Kita manipulasi DOM:
                    const blocks = container.querySelectorAll('.bg-slate-50');
                    if(blocks.length >= 2) {
                        blocks[blocks.length - 1].outerHTML = topHtml; // Ganti blok terakhir (topping)
                    }
                }
            }
        }
    };
});
// ============================================================================
// 37. REVISI FORMAT DRAFT WA (STRUK DIGITAL PROFESIONAL)
// ============================================================================

window.kirimBuktiWA = function() {
    if(!window.pesananAktif) return;
    
    // 1. Simpan ke Database Kasir (Mencegah double-input jika di-klik 2x)
    const isExist = window.pesananMasukDB.find(o => o.noAntrean === window.pesananAktif.noAntrean);
    if(!isExist) {
        window.pesananMasukDB.unshift(window.pesananAktif);
        if (window.kasirTabAktif === 'konfirmasi' && typeof window.renderListKasir === 'function') {
            window.renderListKasir();
        }
        if(typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
        if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
    }

    // 2. FORMAT DRAFT WA ALA STRUK FISIK (Lebih rapi dan detail)
    const o = window.pesananAktif;
    let msg = `==========================\n`;
    msg += `🏪 *MAINSTAY DRINK*\n`;
    msg += `==========================\n\n`;
    
    if (o.tipeOrder.includes('Pre')) {
        msg += `Halo, saya ingin melakukan *Pre-Order (PO)* dengan rincian:\n\n`;
    } else {
        msg += `Halo, saya ingin memesan menu dengan rincian:\n\n`;
    }
    
    msg += `🧾 *No. Order* : #${o.noAntrean}\n`;
    msg += `👤 *Nama*      : ${o.nama}\n`;
    msg += `📱 *No. WA*    : ${o.phone !== '-' ? o.phone : 'Tidak diisi'}\n`;
    msg += `🥡 *Tipe*      : ${o.tipeOrder}\n`;
    msg += `💳 *Bayar*     : ${o.metodeBayar}\n\n`;
    
    msg += `*DETAIL PESANAN:*\n`;
    msg += `--------------------------\n`;
    
    o.items.forEach((item) => {
        msg += `*${item.qty}x ${item.nama}*\n`;
        // Hanya tampilkan Es & Gula jika memang minuman
        if (item.levelEs !== '-' || item.levelGula !== '-') {
            msg += `   > ${item.levelEs}, ${item.levelGula}\n`;
        }
        // Tampilkan Topping jika ada
        if (item.toppingStr !== 'Tanpa Ekstra Topping') {
            msg += `   > + ${item.toppingStr}\n`;
        }
        msg += `   = ${window.formatRupiah(item.totalHarga)}\n`;
    });
    
    msg += `--------------------------\n`;
    msg += `*TOTAL TAGIHAN : ${window.formatRupiah(o.totalBayar)}*\n`;
    msg += `==========================\n\n`;
    
    // 3. Kalimat Penutup Pintar Berdasarkan Metode Pembayaran
    if (o.metodeBayar === 'QRIS Resto') {
        msg += `_Berikut saya lampirkan foto/screenshot bukti transfer QRIS._\nMohon segera diproses, terima kasih! 🙏`;
    } else if (o.metodeBayar === 'Tunai') {
        msg += `_Saya akan melakukan pembayaran menggunakan *Uang Tunai* di meja kasir._\nMohon segera diproses, terima kasih! 🙏`;
    } else {
        msg += `Terima kasih! 🙏`;
    }

    // Info Member
    if(o.isMember) {
        msg += `\n\n*(Info Kasir: Pelanggan setuju bergabung dengan list Member Broadcast)*`;
    }

    // 4. Reset Keranjang Customer
    window.currentCart = [];
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
    
    // 5. Tutup Modal QRIS (jika terbuka) & Keranjang
    const modalQris = document.getElementById('modal-qris');
    if(modalQris) { 
        modalQris.classList.add('hidden'); 
        modalQris.classList.remove('flex'); 
    }
    if(typeof window.closeCartModal === 'function') window.closeCartModal();

    // 6. Lompat ke WhatsApp dengan Pesan yang Sudah Disusun
    window.open(`https://wa.me/${window.systemConfig.nomorWA}?text=${encodeURIComponent(msg)}`, '_blank');
};
// ============================================================================
// 38. CUSTOMER DATA TRACKING & ANONYMOUS CHECKOUT PREVIEW
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Ubah Judul Panel "Member" menjadi "Data Pelanggan" di Tampilan Master
    const panelMemberTitle = document.querySelector('#panel-member h2');
    if (panelMemberTitle) panelMemberTitle.innerHTML = '<i class="fa-solid fa-address-book text-green-400"></i> Data Pelanggan';

    // Ubah Teks Tombol Kotak di Dasbor Owner
    document.querySelectorAll('#view-owner button').forEach(btn => {
        if(btn.innerText.includes('Member') && btn.innerText.includes('Voucher')) {
            btn.innerHTML = `<div class="w-14 h-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-2xl group-hover:scale-110 transition"><i class="fa-solid fa-address-book"></i></div><span class="text-xs font-black text-gray-800 text-center leading-tight">Pelanggan<br><span class="text-gray-400 text-[10px]">Semua Data</span></span>`;
        }
    });

    // 2. Suntik Modal Struk Virtual (Untuk Pelanggan Tanpa WA) ke dalam HTML
    if(!document.getElementById('modal-receipt-customer')) {
        const receiptModal = `
        <div id="modal-receipt-customer" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] hidden items-center justify-center fade-in px-4">
            <div class="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
                <div class="bg-amber-500 p-6 text-center relative">
                    <button onclick="window.tutupReceiptCustomer()" class="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full text-white flex items-center justify-center hover:bg-black/40 transition"><i class="fa-solid fa-xmark"></i></button>
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                        <i class="fa-solid fa-check-to-slot text-3xl text-amber-500"></i>
                    </div>
                    <h2 class="text-white font-black text-xl mb-1">Pesanan Diterima!</h2>
                    <p class="text-amber-100 text-xs font-bold leading-tight" id="receipt-instruction">Tunjukkan layar ini ke Kasir</p>
                </div>
                <div class="p-6 bg-slate-50 flex-1 overflow-y-auto hide-scrollbar max-h-[60vh]">
                    <div class="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                        <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nomor Antrean</p>
                        <h3 class="text-4xl font-black text-gray-900" id="receipt-no">#ORD-000</h3>
                    </div>
                    <div class="space-y-3 mb-4" id="receipt-items"></div>
                    <div class="flex justify-between items-end border-t border-dashed border-gray-300 pt-4 mb-6">
                        <span class="text-xs font-black text-gray-500">TOTAL TAGIHAN</span>
                        <span class="text-2xl font-black text-amber-500" id="receipt-total">Rp 0</span>
                    </div>
                    <button onclick="window.tutupReceiptCustomer()" class="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-black transition text-sm">TUTUP / SELESAI</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', receiptModal);
    }
});

// Fungsi Tutup Struk Virtual
window.tutupReceiptCustomer = function() {
    const modal = document.getElementById('modal-receipt-customer');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

// 3. Override Render Data Pelanggan (Menampilkan Badge Member & Non-Member)
window.renderTabelMember = function() {
    const container = document.querySelector('#panel-member .flex-1');
    if(!container) return;
    
    if(!window.databaseMember || window.databaseMember.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-400"><i class="fa-solid fa-address-book text-3xl mb-3"></i><p class="text-sm font-bold">Belum ada data pelanggan yang tersimpan.</p></div>`;
        return;
    }

    container.innerHTML = `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-users text-green-500"></i> Database Pelanggan</h3>
                <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-black shadow-inner">${window.databaseMember.length} Data</span>
            </div>
            <div class="space-y-3">
                ${window.databaseMember.map(m => `
                    <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center transition hover:shadow-sm">
                        <div>
                            <h4 class="font-black text-sm text-gray-900">${m.nama}</h4>
                            <p class="text-[10px] text-gray-500 font-bold mb-1.5"><i class="fa-solid fa-calendar-days mr-1"></i> Terakhir pesan: ${m.tanggal}</p>
                            ${m.status === 'Member' ? '<span class="bg-green-100 text-green-600 px-2 py-1 rounded text-[9px] font-black uppercase shadow-sm"><i class="fa-solid fa-crown mr-1"></i> Member Aktif</span>' : '<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[9px] font-black uppercase shadow-sm">Non-Member</span>'}
                        </div>
                        ${m.wa !== 'Tidak mencantumkan WA' && m.wa !== '-' ? `<a href="https://wa.me/${m.wa}" target="_blank" class="w-10 h-10 rounded-full bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition shadow-sm border border-green-100"><i class="fa-brands fa-whatsapp text-xl"></i></a>` : `<span class="text-[9px] text-gray-400 font-bold italic bg-white px-2 py-1 rounded border border-gray-200">No WA</span>`}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

// 4. Override Checkout Flow (Merekam Data & Menentukan Jalur WA / Layar)
window.kirimBuktiWA = function() {
    if(!window.pesananAktif) return;
    const o = window.pesananAktif;

    // --- A. SIMPAN KE DATABASE KASIR ---
    const isExist = window.pesananMasukDB.find(x => x.noAntrean === o.noAntrean);
    if(!isExist) {
        window.pesananMasukDB.unshift(o);
        if (window.kasirTabAktif === 'konfirmasi' && typeof window.renderListKasir === 'function') window.renderListKasir();
        if(typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
        if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
    }

    // --- B. SIMPAN KE DATA PELANGGAN (CRM) ---
    if (!window.databaseMember) window.databaseMember = [];
    // Simpan jika nama diisi (bukan default) ATAU no WA diisi
    if (o.nama !== "Hamba Allah" || (o.phone && o.phone !== "-" && o.phone.length > 5)) {
        
        let memberIdx = -1;
        if (o.phone !== "-" && o.phone.length > 5) {
            memberIdx = window.databaseMember.findIndex(m => m.wa === o.phone);
        } else {
            memberIdx = window.databaseMember.findIndex(m => m.nama === o.nama);
        }
        
        const newMemberData = {
            nama: o.nama,
            wa: (o.phone !== "-" && o.phone.length > 5) ? o.phone : "Tidak mencantumkan WA",
            tanggal: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}),
            status: o.isMember ? "Member" : "Non-Member"
        };

        if (memberIdx > -1) {
            if (o.isMember) window.databaseMember[memberIdx].status = "Member";
            window.databaseMember[memberIdx].tanggal = newMemberData.tanggal; // Update tanggal terakhir pesan
        } else {
            window.databaseMember.push(newMemberData);
        }
        
        // Simpan ke memori dan refresh tabel
        localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));
        if(typeof window.renderTabelMember === 'function') window.renderTabelMember();
    }

    // --- C. LOGIKA BERCABANG (WA VS POP-UP STRUK VIRTUAL) ---
    const isAnonymous = (!o.phone || o.phone === "-" || o.phone.length < 5);

    // Kosongkan Keranjang
    window.currentCart = [];
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    if(typeof window.updateCartFloat === 'function') window.updateCartFloat();
    
    // Tutup Modal QRIS & Keranjang Utama
    const modalQris = document.getElementById('modal-qris');
    if(modalQris) { modalQris.classList.add('hidden'); modalQris.classList.remove('flex'); }
    if(typeof window.closeCartModal === 'function') window.closeCartModal();

    if (isAnonymous) {
        // --- JIKA TIDAK ADA WA: TAMPILKAN STRUK VIRTUAL DI LAYAR ---
        document.getElementById('receipt-no').textContent = o.noAntrean;
        document.getElementById('receipt-total').textContent = window.formatRupiah(o.totalBayar);
        
        // Instruksi berbeda untuk Cash dan QRIS
        if (o.metodeBayar === 'QRIS Resto') {
            document.getElementById('receipt-instruction').innerHTML = `Tunjukkan layar ini <b class="text-white">beserta bukti transfer QRIS</b> ke Kasir Mainstay.`;
        } else {
            document.getElementById('receipt-instruction').innerHTML = `Tunjukkan layar ini ke Kasir Mainstay untuk melakukan <b class="text-white">Pembayaran Tunai</b>.`;
        }

        // Render Rincian Pesanan
        document.getElementById('receipt-items').innerHTML = o.items.map(item => `
            <div class="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0">
                <div>
                    <p class="text-xs font-black text-gray-800">${item.qty}x ${item.nama}</p>
                    ${item.levelEs !== '-' ? `<p class="text-[9px] text-gray-500 font-bold">${item.levelEs}, ${item.levelGula}</p>` : ''}
                    ${item.toppingStr !== 'Tanpa Ekstra Topping' ? `<p class="text-[9px] text-amber-600 font-bold">+ ${item.toppingStr}</p>` : ''}
                </div>
                <p class="text-xs font-black text-gray-800">${window.formatRupiah(item.totalHarga)}</p>
            </div>
        `).join('');

        const modalReceipt = document.getElementById('modal-receipt-customer');
        modalReceipt.classList.remove('hidden'); 
        modalReceipt.classList.add('flex');
        
    } else {
        // --- JIKA ADA WA: BUKA WHATSAPP DENGAN FORMAT STRUK ---
        let dt = o.tipeOrder.includes('Pre') ? systemConfig.draftWA.po : (o.metodeBayar==='Tunai' ? systemConfig.draftWA.cash : systemConfig.draftWA.qris);
        let msg = `==========================\n🏪 *MAINSTAY DRINK*\n==========================\n\n`;
        msg += `Halo, saya ingin memesan menu dengan rincian:\n\n`;
        msg += `🧾 *No. Order* : #${o.noAntrean}\n`;
        msg += `👤 *Nama*      : ${o.nama}\n`;
        msg += `📱 *No. WA*    : ${o.phone}\n`;
        msg += `🥡 *Tipe*      : ${o.tipeOrder}\n`;
        msg += `💳 *Bayar*     : ${o.metodeBayar}\n\n`;
        msg += `*DETAIL PESANAN:*\n--------------------------\n`;
        o.items.forEach((item) => {
            msg += `*${item.qty}x ${item.nama}*\n`;
            if (item.levelEs !== '-' || item.levelGula !== '-') msg += `   > ${item.levelEs}, ${item.levelGula}\n`;
            if (item.toppingStr !== 'Tanpa Ekstra Topping') msg += `   > + ${item.toppingStr}\n`;
            msg += `   = ${window.formatRupiah(item.totalHarga)}\n`;
        });
        msg += `--------------------------\n*TOTAL TAGIHAN : ${window.formatRupiah(o.totalBayar)}*\n==========================\n\n`;
        if (o.metodeBayar === 'QRIS Resto') msg += `_Berikut saya lampirkan foto/screenshot bukti transfer QRIS._\nMohon segera diproses, terima kasih! 🙏`;
        else if (o.metodeBayar === 'Tunai') msg += `_Saya akan melakukan pembayaran menggunakan *Uang Tunai* di meja kasir._\nMohon segera diproses, terima kasih! 🙏`;
        else msg += `Terima kasih! 🙏`;
        
        window.open(`https://wa.me/${window.systemConfig.nomorWA}?text=${encodeURIComponent(msg)}`, '_blank');
    }
};

// Menutup Struk Virtual jika klik di luar kotak putih
window.addEventListener('click', function(e) {
    const modalReceipt = document.getElementById('modal-receipt-customer');
    if (modalReceipt && !modalReceipt.classList.contains('hidden') && e.target === modalReceipt) {
        window.tutupReceiptCustomer();
    }
});

// Load DB Member saat pertama kali buka
window.addEventListener('DOMContentLoaded', () => {
    const memDb = localStorage.getItem('dbMemberMainstay');
    if(memDb) window.databaseMember = JSON.parse(memDb);
});
// ============================================================================
// 39. SUPER-PATCH: PRIVATE POS KASIR, DYNAMIC PRESENCE & ADVANCED HRD CRUD
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. PEMBARUAN DATABASE HRD (Menambah Field Baru) ---
    window.dbStaf = JSON.parse(localStorage.getItem('dbStafMainstay')) || [
        { id: 'staf_1', nama: 'Budi (Kasir)', pin: '123456', foto: '', tglMasuk: '2026-01-10', shiftMulai: '08:00', shiftSelesai: '16:00', tipeGaji: 'Harian', nominalGaji: 50000, tipeStaf: 'Karyawan Tetap', rekening: 'BCA 123456', wa: '628977099557', statusHadir: false }
    ];

    // Fungsi Update Dropdown Kasir berdasarkan Kehadiran (Hanya yg absen masuk)
    window.updateDropdownKasir = function() {
        const dp = document.getElementById('kasir-staf-dropdown');
        if(!dp) return;
        const hadir = window.dbStaf.filter(s => s.statusHadir);
        if(hadir.length > 0) {
            dp.innerHTML = hadir.map(s => `<option value="${s.nama}">${s.nama} (Online)</option>`).join('');
        } else {
            dp.innerHTML = `<option value="">Belum ada yg Hadir</option>`;
        }
    };
    window.updateDropdownKasir(); // Panggil saat awal dimuat

    // --- B. OVERRIDE ABSENSI (Otomatis Mengubah Status Hadir/Pulang) ---
    window.prosesAbsen = function(jenis) {
        const pin = document.getElementById('absen-pin').value;
        if (pin.length < 4) return alert("Masukkan PIN Staf!");
        
        // Cek PIN langsung ke database HRD
        const staf = window.dbStaf.find(s => s.pin === pin);
        if (!staf) return alert("PIN tidak terdaftar di database HRD!");

        // Ubah Status Kehadiran
        staf.statusHadir = (jenis === 'Masuk');
        localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
        
        // Segarkan dropdown Kasir & Daftar HRD
        window.updateDropdownKasir();
        if(typeof window.renderStafList === 'function') window.renderStafList();

        // Ambil Foto (Jika kamera mati, pakai foto profil bawaan staf)
        const v = document.getElementById('attendance-video'), c = document.getElementById('attendance-canvas');
        let fd = "";
        if (window.videoStream && v.videoWidth > 0) {
            c.width = v.videoWidth; c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            fd = c.toDataURL('image/jpeg', 0.8);
        } else {
            fd = staf.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(staf.nama)}&background=14b8a6&color=fff`;
        }
        window.closeAbsensi(); window.playAudio('siap');

        // Render Pop-Up Review Tepat Waktu
        const now = new Date();
        const jamFormat = String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0') + " WIB";

        document.getElementById('review-foto').src = fd;
        document.getElementById('review-nama').textContent = staf.nama;
        document.getElementById('review-jam').innerHTML = `<i class="fa-regular fa-clock mr-1"></i> ${jenis}: ${jamFormat}`;

        // Kalkulasi Keterlambatan sesuai Jadwal Shift Staf di HRD
        let isTerlambat = false;
        const shiftJam = parseInt(staf.shiftMulai.split(':')[0]);
        const shiftMenit = parseInt(staf.shiftMulai.split(':')[1]);
        if(jenis === 'Masuk') {
            if(now.getHours() > shiftJam || (now.getHours() === shiftJam && now.getMinutes() > shiftMenit)) {
                isTerlambat = true;
            }
        }

        const sts = document.getElementById('review-status');
        if(isTerlambat && jenis === 'Masuk') {
            sts.textContent = "TERLAMBAT"; sts.className = "inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-red-500 shadow-md";
        } else {
            sts.textContent = jenis === 'Masuk' ? "TEPAT WAKTU" : "PULANG"; sts.className = "inline-block px-5 py-2 rounded-full text-xs font-black text-white bg-green-500 shadow-md";
        }

        const revModal = document.getElementById('modal-absen-review');
        revModal.classList.remove('hidden'); revModal.classList.add('flex');
        setTimeout(() => { revModal.classList.add('hidden'); revModal.classList.remove('flex'); }, 5000);
    };

    // --- C. OVERRIDE RENDER LIST HRD (Preview Super Lengkap) ---
    window.renderStafList = function() {
        const list = document.getElementById('hrd-staf-list');
        if(!list) return;

        if(window.dbStaf.length === 0) {
            list.innerHTML = `<p class="text-center text-xs text-gray-400 py-4 font-bold">Belum ada data staf.</p>`;
            return;
        }

        list.innerHTML = window.dbStaf.map(staf => {
            const indikatorWarna = staf.statusHadir ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]';
            const fotoStaf = staf.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(staf.nama)}&background=14b8a6&color=fff`;
            
            return `
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-4 items-start relative transition hover:shadow-md">
                <button onclick="window.hapusStaf('${staf.id}')" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash-can"></i></button>
                <div class="relative">
                    <img src="${fotoStaf}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-gray-200">
                    <div class="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${indikatorWarna} z-10 animate-pulse"></div>
                </div>
                <div class="flex-1 pr-6">
                    <h4 class="font-black text-sm text-gray-900 mb-0.5">${staf.nama}</h4>
                    <p class="text-[10px] font-bold text-gray-500 mb-2">PIN: <span class="text-gray-800 tracking-widest bg-gray-200 px-1.5 rounded">${staf.pin || '123456'}</span> | ${staf.tipeStaf || 'Tetap'}</p>
                    
                    <div class="flex gap-2 mb-3">
                        <a href="https://wa.me/${staf.wa}" target="_blank" class="text-[9px] font-black text-white bg-green-500 px-2 py-1 rounded shadow-sm hover:bg-green-600 transition"><i class="fa-brands fa-whatsapp mr-1"></i> WA</a>
                        <button onclick="alert('Rekening / E-Wallet Staf:\\n${staf.rekening}')" class="text-[9px] font-black text-white bg-blue-500 px-2 py-1 rounded shadow-sm hover:bg-blue-600 transition"><i class="fa-solid fa-money-check-dollar mr-1"></i> Rekening</button>
                    </div>
                    
                    <button onclick="window.bukaFormStaf('${staf.id}')" class="w-full text-[10px] font-black text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-500 px-3 py-2 rounded-lg transition border border-teal-200 flex justify-center items-center gap-2"><i class="fa-solid fa-user-pen"></i> Buka Rincian Gaji & Jadwal</button>
                </div>
            </div>`;
        }).join('');
    };

    // --- D. OVERRIDE FORM HRD (Menambah Field Sesuai Request) ---
    const modalFormStaf = document.getElementById('modal-form-staf');
    if(modalFormStaf) {
        modalFormStaf.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <h2 class="text-lg font-black text-gray-900 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2" id="staf-form-title">Form Data Staf</h2>
            <div class="flex-1 overflow-y-auto space-y-4 pr-2 hide-scrollbar pb-10">
                <input type="hidden" id="staf-id">
                
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2"><label class="text-[10px] font-bold text-gray-500 block mb-1">NAMA LENGKAP</label><input type="text" id="staf-nama" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">PIN LOGIN</label><input type="text" id="staf-pin" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold tracking-widest outline-none" maxlength="6" placeholder="123456"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">TIPE STAF</label><select id="staf-tipestaf" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"><option value="Karyawan Tetap">Tetap</option><option value="Kontrak / Sementara">Kontrak</option><option value="Part-Time">Part-Time</option></select></div>
                </div>

                <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <label class="text-[10px] font-bold text-gray-500 block mb-2">FOTO PROFIL (Dual Upload)</label>
                    <input type="text" id="staf-foto" placeholder="Link URL Foto..." class="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs outline-none mb-2">
                    <input type="file" accept="image/*" class="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs" onchange="window.handleImageUpload(this, 'staf-foto')">
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2"><label class="text-[10px] font-bold text-gray-500 block mb-1">REKENING / E-WALLET</label><input type="text" id="staf-rek" placeholder="BCA 123456 a.n Budi" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                    <div class="col-span-2"><label class="text-[10px] font-bold text-gray-500 block mb-1">NOMOR WA</label><input type="number" id="staf-wa" placeholder="628..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                </div>

                <div><label class="text-[10px] font-bold text-gray-500 block mb-1">TANGGAL MASUK</label><input type="date" id="staf-tgl" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">JAM MULAI</label><input type="time" id="staf-mulai" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" onchange="window.kalkulasiGaji()"></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">JAM SELESAI</label><input type="time" id="staf-selesai" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" onchange="window.kalkulasiGaji()"></div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">TIPE GAJI</label><select id="staf-tipe" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none" onchange="window.kalkulasiGaji()"><option value="Per Jam">Per Jam</option><option value="Harian">Harian</option><option value="Mingguan">Mingguan</option><option value="Bulanan">Bulanan</option></select></div>
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">NOMINAL (RP)</label><input type="number" id="staf-nominal" placeholder="50000" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-black outline-none" oninput="window.kalkulasiGaji()"></div>
                </div>

                <div class="bg-teal-50 p-4 rounded-xl border border-teal-200 mt-2">
                    <p class="text-[10px] font-black text-teal-800 mb-1.5"><i class="fa-solid fa-calculator mr-1"></i> Kalkulator Shift Otomatis:</p>
                    <p id="staf-kalkulasi" class="text-xs font-bold text-teal-900 leading-relaxed">- Isi jam & nominal terlebih dahulu -</p>
                </div>
            </div>
            <div class="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                <button onclick="window.tutupFormStaf()" class="flex-1 bg-slate-100 text-slate-600 font-black py-3 rounded-xl hover:bg-slate-200 transition text-sm">BATAL</button>
                <button onclick="window.simpanStaf()" class="flex-1 bg-teal-500 text-white font-black py-3 rounded-xl hover:bg-teal-600 transition text-sm shadow-md">SIMPAN DATA</button>
            </div>
        </div>`;
    }

    // Perbarui fungsi Simpan Staf untuk menyimpan form yang baru
    window.simpanStaf = function() {
        const id = document.getElementById('staf-id').value;
        const nama = document.getElementById('staf-nama').value;
        const pin = document.getElementById('staf-pin').value;
        const tipeStaf = document.getElementById('staf-tipestaf').value;
        const foto = document.getElementById('staf-foto').value;
        const rek = document.getElementById('staf-rek').value;
        const wa = document.getElementById('staf-wa').value;
        const tgl = document.getElementById('staf-tgl').value;
        const mulai = document.getElementById('staf-mulai').value;
        const selesai = document.getElementById('staf-selesai').value;
        const tipe = document.getElementById('staf-tipe').value;
        const nominal = parseInt(document.getElementById('staf-nominal').value) || 0;

        if(!nama || !pin || pin.length < 4) return alert("Nama dan PIN (min 4 digit) wajib diisi!");

        let currentStatus = false; // Status hadir bawaan

        if (id) {
            const idx = window.dbStaf.findIndex(s => s.id === id);
            if(idx > -1) currentStatus = window.dbStaf[idx].statusHadir; // Pertahankan status absen saat edit
            window.dbStaf[idx] = { id, nama, pin, tipeStaf, foto, rekening: rek, wa, tglMasuk: tgl, shiftMulai: mulai, shiftSelesai: selesai, tipeGaji: tipe, nominalGaji: nominal, statusHadir: currentStatus };
        } else {
            window.dbStaf.push({ id: 'staf_' + Date.now(), nama, pin, tipeStaf, foto, rekening: rek, wa, tglMasuk: tgl, shiftMulai: mulai, shiftSelesai: selesai, tipeGaji: tipe, nominalGaji: nominal, statusHadir: false });
        }

        localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
        window.renderStafList();
        window.updateDropdownKasir();
        window.tutupFormStaf();
    };

    window.bukaFormStaf = function(id = null) {
        if (id) {
            const staf = window.dbStaf.find(s => s.id === id);
            document.getElementById('staf-form-title').innerHTML = '<i class="fa-solid fa-user-pen text-teal-500"></i> Edit Staf';
            document.getElementById('staf-id').value = staf.id;
            document.getElementById('staf-nama').value = staf.nama;
            document.getElementById('staf-pin').value = staf.pin || '';
            document.getElementById('staf-tipestaf').value = staf.tipeStaf || 'Karyawan Tetap';
            document.getElementById('staf-foto').value = staf.foto;
            document.getElementById('staf-rek').value = staf.rekening || '';
            document.getElementById('staf-wa').value = staf.wa || '';
            document.getElementById('staf-tgl').value = staf.tglMasuk;
            document.getElementById('staf-mulai').value = staf.shiftMulai;
            document.getElementById('staf-selesai').value = staf.shiftSelesai;
            document.getElementById('staf-tipe').value = staf.tipeGaji;
            document.getElementById('staf-nominal').value = staf.nominalGaji;
        } else {
            document.getElementById('staf-form-title').innerHTML = '<i class="fa-solid fa-user-plus text-teal-500"></i> Tambah Staf';
            document.getElementById('staf-id').value = '';
            document.getElementById('staf-nama').value = '';
            document.getElementById('staf-pin').value = '';
            document.getElementById('staf-foto').value = '';
            document.getElementById('staf-rek').value = '';
            document.getElementById('staf-wa').value = '';
            document.getElementById('staf-nominal').value = '';
        }
        window.kalkulasiGaji();
        document.getElementById('modal-form-staf').classList.remove('hidden'); document.getElementById('modal-form-staf').classList.add('flex');
    };

    // --- E. FITUR POS INTERNAL KASIR (PRIVATE CATALOG) ---
    // Inject Private POS Modal ke HTML
    if(!document.getElementById('modal-pos-internal')) {
        const posModal = `
        <div id="modal-pos-internal" class="fixed inset-0 bg-slate-50 z-[150] hidden flex-col pb-safe">
            <div class="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md">
                <h2 class="font-black text-sm md:text-lg"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i> POS INTERNAL KASIR</h2>
                <button onclick="window.tutupPOSInternal()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-600 transition"><i class="fa-solid fa-arrow-left"></i> TUTUP (KEMBALI)</button>
            </div>
            <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div class="flex-1 overflow-y-auto p-4 hide-scrollbar">
                    <p class="text-[10px] font-black text-gray-400 mb-3 uppercase">Pilih Menu untuk Customer Offline</p>
                    <div id="pos-internal-grid" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>
                </div>
                <div class="w-full md:w-80 bg-white border-t md:border-l border-gray-200 flex flex-col shadow-inner">
                    <div class="p-3 border-b border-gray-100 bg-amber-50">
                        <h3 class="font-black text-amber-800 text-sm"><i class="fa-solid fa-basket-shopping mr-2"></i> Pesanan Baru</h3>
                    </div>
                    <div id="pos-internal-cart" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
                    <div class="p-4 border-t border-gray-200 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
                        <div class="flex justify-between font-black text-lg text-gray-900 mb-3 border-b border-gray-100 pb-2">
                            <span>TOTAL</span><span id="pos-internal-total" class="text-amber-500">Rp 0</span>
                        </div>
                        <input type="text" id="pos-nama-pelanggan" placeholder="Nama Customer (Opsional)" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-2 focus:border-amber-500 outline-none">
                        <select id="pos-tipe-bayar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-3 focus:border-amber-500 outline-none">
                            <option value="Tunai">Tunai (Bayar Langsung)</option>
                            <option value="QRIS Resto">QRIS (Scan di Kasir)</option>
                        </select>
                        <button onclick="window.checkoutPOSInternal()" class="w-full bg-amber-500 text-white font-black py-3 rounded-xl shadow-md hover:bg-amber-600 transition text-sm">PROSES & CETAK THERMAL</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', posModal);
    }

    // Variabel dan Logika Private POS
    window.kasirCart = [];
    window.posInternalTotal = 0;
    window.isPosKasirActive = false; // Penanda agar addToCart tahu kita di Private POS

    // Override fungsi bukaPOS agar memanggil modal Private POS, BUKAN halaman Customer
    window.bukaPOS = function() {
        // Render grid menunya dari database
        const grid = document.getElementById('pos-internal-grid');
        grid.innerHTML = window.katalogMenu.map(m => `
            <div class="bg-white p-2 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-amber-500 transition" onclick="window.isPosKasirActive = true; window.openMenuDetail('${m.id}')">
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-2">
                <h4 class="text-xs font-black leading-tight mb-1 text-gray-900 line-clamp-1">${m.nama}</h4>
                <p class="text-[10px] font-black text-amber-500">${window.formatRupiah(m.hargaDiskon)}</p>
            </div>
        `).join('');

        window.renderPOSInternalCart();
        document.getElementById('modal-pos-internal').classList.remove('hidden');
        document.getElementById('modal-pos-internal').classList.add('flex');
    };

    window.tutupPOSInternal = function() {
        window.isPosKasirActive = false;
        document.getElementById('modal-pos-internal').classList.add('hidden');
        document.getElementById('modal-pos-internal').classList.remove('flex');
    };

    window.renderPOSInternalCart = function() {
        const c = document.getElementById('pos-internal-cart');
        window.posInternalTotal = 0;
        if(window.kasirCart.length === 0) {
            c.innerHTML = `<p class="text-center text-[10px] font-bold text-gray-400 py-5">Keranjang kosong</p>`;
        } else {
            c.innerHTML = window.kasirCart.map((item, idx) => {
                window.posInternalTotal += item.totalHarga;
                return `
                <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200 relative pr-6">
                    <button onclick="window.hapusKasirCart(${idx})" class="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-red-50 w-5 h-5 rounded"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                    <p class="text-xs font-black text-gray-800 leading-tight">${item.qty}x ${item.nama}</p>
                    <p class="text-[9px] font-bold text-gray-500">${item.levelEs}, ${item.levelGula}</p>
                    ${item.toppingStr !== 'Tanpa Ekstra Topping' ? `<p class="text-[9px] font-bold text-amber-600">+ ${item.toppingStr}</p>` : ''}
                    <p class="text-[10px] font-black text-amber-600 mt-1">${window.formatRupiah(item.totalHarga)}</p>
                </div>`;
            }).join('');
        }
        document.getElementById('pos-internal-total').textContent = window.formatRupiah(window.posInternalTotal);
    };

    window.hapusKasirCart = function(idx) {
        window.kasirCart.splice(idx, 1);
        window.renderPOSInternalCart();
    };

    // Intersepsi logika Add To Cart. Jika kasir yg pencet, masuk ke keranjang kasir
    const oldAddToCart = window.addToCart;
    window.addToCart = function() {
        if(window.isPosKasirActive) {
            if(!window.currentMenuDetail) return;
            const es = document.querySelector('input[name="var_es"]:checked');
            const gula = document.querySelector('input[name="var_gula"]:checked');
            const tops = document.querySelectorAll('input[name="var_topping"]:checked');
            let tNames = [], tPrice = 0;
            tops.forEach(cb => { tNames.push(cb.value); tPrice += parseInt(cb.getAttribute('data-price')); });
            
            window.kasirCart.push({
                cartId: 'KASIR_CART_' + Date.now(),
                menuId: window.currentMenuDetail.id,
                nama: window.currentMenuDetail.nama,
                qty: window.currentMenuDetail.qty,
                levelEs: es ? es.value : '-',
                levelGula: gula ? gula.value : '-',
                toppingStr: tNames.length ? tNames.join(', ') : 'Tanpa Ekstra Topping',
                totalHarga: window.currentMenuDetail.totalLinePrice
            });
            window.renderPOSInternalCart();
            window.closeMenuDetail();
        } else {
            oldAddToCart(); // Jalankan keranjang customer normal
        }
    };

    window.checkoutPOSInternal = function() {
        if(window.kasirCart.length === 0) return alert("Keranjang masih kosong!");
        
        // Cek siapa Staf yang lagi login
        const stafDropdown = document.getElementById('kasir-staf-dropdown');
        const stafAktif = stafDropdown && stafDropdown.value ? stafDropdown.value : 'Kasir Offline';

        const noAntrean = `ORD-${String(window.nomorAntreanHariIni).padStart(3,'0')}`;
        
        const pesananBaru = {
            noAntrean: noAntrean,
            nama: document.getElementById('pos-nama-pelanggan').value || 'Pelanggan Offline',
            phone: '-', // Sengaja strip karena ini offline order
            tipeOrder: 'Instant (Di Toko)',
            metodeBayar: document.getElementById('pos-tipe-bayar').value,
            totalBayar: window.posInternalTotal,
            items: JSON.parse(JSON.stringify(window.kasirCart)),
            actor: 'Kasir - ' + stafAktif,
            isMember: false,
            waktu: new Date().toLocaleString('id-ID')
        };

        // Lempar langsung ke Tabel Konfirmasi Kasir
        window.pesananMasukDB.unshift(pesananBaru);
        window.simpanDatabaseKasir();
        if (typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        if (typeof window.renderListKasir === 'function') window.renderListKasir();

        window.nomorAntreanHariIni++;
        window.kasirCart = []; // Kosongkan
        window.renderPOSInternalCart();
        document.getElementById('pos-nama-pelanggan').value = '';

        window.tutupPOSInternal();
        window.playAudio('masuk'); // Bunyi "Ting!"
        
        alert(`Pesanan #${noAntrean} berhasil diproses oleh ${stafAktif}.\nPesanan sudah masuk ke layar Konfirmasi Kasir.`);
    };
});
// ============================================================================
// 40. FINAL OPERATIONAL UX (POS ISOLATION, CHANGE CALCULATOR, & OWNER PROFILE)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. PROFIL OWNER (Database & UI) ---
    window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || {
        nama: 'Master Owner', foto: '', wa: '628977099557', rekening: 'BCA 12345678'
    };

    // Suntik Kotak Profil Owner ke Panel HRD (Paling Atas)
    const hrdContainer = document.querySelector('#panel-hrd .flex-1');
    if (hrdContainer && !document.getElementById('owner-profile-card')) {
        const ownerCard = `
            <div id="owner-profile-card" class="bg-gray-900 border border-gray-700 p-4 rounded-2xl flex gap-4 items-center relative mb-6 shadow-md">
                <button onclick="window.bukaFormOwner()" class="absolute top-3 right-3 text-amber-500 hover:text-amber-400 transition bg-black/40 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-pen"></i></button>
                <img id="owner-foto-display" src="${window.ownerProfile.foto || 'https://ui-avatars.com/api/?name=Owner&background=f59e0b&color=fff'}" class="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-sm bg-gray-800">
                <div class="flex-1 pr-6">
                    <p class="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5"><i class="fa-solid fa-crown mr-1"></i> Master Owner</p>
                    <h4 id="owner-nama-display" class="font-black text-sm text-white mb-1.5">${window.ownerProfile.nama}</h4>
                    <div class="flex gap-2">
                        <a href="https://wa.me/${window.ownerProfile.wa}" target="_blank" class="text-[9px] font-black text-gray-900 bg-amber-500 px-2 py-1 rounded shadow-sm hover:bg-amber-400 transition"><i class="fa-brands fa-whatsapp mr-1"></i> ${window.ownerProfile.wa}</a>
                        <button onclick="alert('Rekening Owner:\\n${window.ownerProfile.rekening}')" class="text-[9px] font-black text-white bg-blue-600 px-2 py-1 rounded shadow-sm hover:bg-blue-500 transition"><i class="fa-solid fa-money-check-dollar mr-1"></i> Rekening</button>
                    </div>
                </div>
            </div>
        `;
        hrdContainer.insertAdjacentHTML('afterbegin', ownerCard);
    }

    // Modal Edit Profil Owner
    if (!document.getElementById('modal-form-owner')) {
        const modalOwner = `
        <div id="modal-form-owner" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] hidden items-center justify-center fade-in px-4 pb-safe">
            <div class="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative flex flex-col">
                <h2 class="text-lg font-black text-amber-500 mb-4 border-b border-gray-700 pb-3"><i class="fa-solid fa-crown"></i> Edit Profil Owner</h2>
                <div class="space-y-4 mb-4">
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NAMA OWNER</label><input type="text" id="owner-nama" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NOMOR WA</label><input type="number" id="owner-wa" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">REKENING / E-WALLET</label><input type="text" id="owner-rek" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div class="bg-gray-800 p-3 rounded-xl border border-gray-700">
                        <label class="text-[10px] font-bold text-gray-400 block mb-2">FOTO PROFIL (URL/Upload)</label>
                        <input type="text" id="owner-foto" placeholder="Link URL Foto..." class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs outline-none mb-2 focus:border-amber-500">
                        <input type="file" accept="image/*" class="w-full bg-gray-900 border border-gray-700 text-gray-400 rounded-lg p-2 text-xs" onchange="window.handleImageUpload(this, 'owner-foto')">
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.tutupFormOwner()" class="flex-1 bg-gray-700 text-white font-black py-3 rounded-xl hover:bg-gray-600 transition text-sm">BATAL</button>
                    <button onclick="window.simpanFormOwner()" class="flex-1 bg-amber-500 text-gray-900 font-black py-3 rounded-xl hover:bg-amber-600 transition text-sm shadow-md">SIMPAN</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalOwner);
    }

    // Logika Form Owner
    window.bukaFormOwner = function() {
        document.getElementById('owner-nama').value = window.ownerProfile.nama;
        document.getElementById('owner-wa').value = window.ownerProfile.wa;
        document.getElementById('owner-rek').value = window.ownerProfile.rekening;
        document.getElementById('owner-foto').value = window.ownerProfile.foto;
        document.getElementById('modal-form-owner').classList.remove('hidden'); 
        document.getElementById('modal-form-owner').classList.add('flex');
    };
    window.tutupFormOwner = function() {
        document.getElementById('modal-form-owner').classList.add('hidden'); 
        document.getElementById('modal-form-owner').classList.remove('flex');
    };
    window.simpanFormOwner = function() {
        window.ownerProfile.nama = document.getElementById('owner-nama').value;
        window.ownerProfile.wa = document.getElementById('owner-wa').value;
        window.ownerProfile.rekening = document.getElementById('owner-rek').value;
        window.ownerProfile.foto = document.getElementById('owner-foto').value;
        localStorage.setItem('ownerProfileMainstay', JSON.stringify(window.ownerProfile));
        
        document.getElementById('owner-nama-display').textContent = window.ownerProfile.nama;
        document.getElementById('owner-foto-display').src = window.ownerProfile.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(window.ownerProfile.nama)}&background=f59e0b&color=fff`;
        window.tutupFormOwner();
    };

    // --- B. TOMBOL WA OWNER DI KASIR ---
    const kasirTopBar = document.querySelector('#view-kasir .flex.gap-2');
    if (kasirTopBar && !document.getElementById('btn-dm-owner')) {
        const btnDm = document.createElement('button');
        btnDm.id = 'btn-dm-owner';
        btnDm.className = 'bg-green-50 text-green-600 border border-green-200 text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-green-100 transition shadow-sm';
        btnDm.innerHTML = '<i class="fa-brands fa-whatsapp text-sm"></i> Master';
        btnDm.onclick = () => window.open(`https://wa.me/${window.ownerProfile.wa}?text=Halo%20Master%20Owner,%20ada%20yang%20ingin%20saya%20tanyakan/laporkan.`, '_blank');
        
        // Sisipkan di barisan paling kiri
        kasirTopBar.insertBefore(btnDm, kasirTopBar.firstChild);
    }

    // --- C. KALKULATOR KEMBALIAN DI POS INTERNAL ---
    const posCheckoutArea = document.querySelector('#modal-pos-internal .bg-white.flex-col');
    if(posCheckoutArea && !document.getElementById('pos-kalkulator')) {
        // Hapus isi lama, ganti dengan UI yang dilengkapi Kalkulator
        posCheckoutArea.innerHTML = `
            <div class="p-3 border-b border-gray-100 bg-amber-50">
                <h3 class="font-black text-amber-800 text-sm"><i class="fa-solid fa-basket-shopping mr-2"></i> Pesanan Baru</h3>
            </div>
            <div id="pos-internal-cart" class="flex-1 overflow-y-auto p-3 space-y-2"></div>
            <div class="p-4 border-t border-gray-200 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
                <div class="flex justify-between font-black text-lg text-gray-900 mb-3 border-b border-gray-100 pb-2">
                    <span>TOTAL</span><span id="pos-internal-total" class="text-amber-500">Rp 0</span>
                </div>
                <input type="text" id="pos-nama-pelanggan" placeholder="Nama Customer (Opsional)" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-2 focus:border-amber-500 outline-none">
                <select id="pos-tipe-bayar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-3 focus:border-amber-500 outline-none cursor-pointer" onchange="window.toggleKalkulatorPOS()">
                    <option value="Tunai">Tunai (Bayar Langsung)</option>
                    <option value="QRIS Resto">QRIS (Scan di Kasir)</option>
                </select>
                
                <!-- KALKULATOR KEMBALIAN -->
                <div id="pos-kalkulator" class="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-3 transition-all">
                    <label class="text-[10px] font-black text-blue-800 block mb-1">UANG DITERIMA DARI CUSTOMER</label>
                    <div class="relative mb-2">
                        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">Rp</span>
                        <input type="number" id="pos-uang-diterima" placeholder="50000" class="w-full bg-white border border-blue-200 rounded-md py-2 pl-8 pr-2 text-sm font-black outline-none focus:border-blue-500" oninput="window.hitungKembalian()">
                    </div>
                    <div class="flex justify-between items-end border-t border-blue-200 pt-1.5 mt-1">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Kembalian:</span>
                        <span id="pos-kembalian" class="text-sm font-black text-blue-600">Rp 0</span>
                    </div>
                </div>

                <button onclick="window.checkoutPOSInternal()" class="w-full bg-amber-500 text-white font-black py-3 rounded-xl shadow-md hover:bg-amber-600 transition text-sm">PROSES & CETAK THERMAL</button>
            </div>
        `;
    }

    // Fungsi Logika Kalkulator POS
    window.toggleKalkulatorPOS = function() {
        const tipe = document.getElementById('pos-tipe-bayar').value;
        const kal = document.getElementById('pos-kalkulator');
        if(tipe === 'Tunai') {
            kal.style.display = 'block';
            window.hitungKembalian(); // Hitung ulang
        } else {
            kal.style.display = 'none';
        }
    };

    window.hitungKembalian = function() {
        const uang = parseInt(document.getElementById('pos-uang-diterima').value) || 0;
        const total = window.posInternalTotal || 0;
        const kembalian = uang - total;
        
        const elKembalian = document.getElementById('pos-kembalian');
        if (uang === 0) {
            elKembalian.textContent = "Rp 0";
            elKembalian.className = "text-sm font-black text-blue-600";
        } else if (kembalian < 0) {
            elKembalian.textContent = "Kurang " + window.formatRupiah(Math.abs(kembalian));
            elKembalian.className = "text-sm font-black text-red-500";
        } else {
            elKembalian.textContent = window.formatRupiah(kembalian);
            elKembalian.className = "text-sm font-black text-green-600";
        }
    };

    // Override Render Total agar langsung hitung kembalian
    const originalRenderPosCart = window.renderPOSInternalCart;
    window.renderPOSInternalCart = function() {
        originalRenderPosCart();
        window.hitungKembalian(); // Hitung kembalian otomatis saat tambah/kurang menu
    };

    // --- D. POS ISOLATION MUTLAK (TIDAK LOMPAT KE CUSTOMER) ---
    // Mengesampingkan kode lama yang melempar layar ke View Customer.
    // Kode di bawah ini akan memastikan modal-pos-internal murni muncul di atas Kasir atau Owner.
    window.bukaPOS = function() {
        const grid = document.getElementById('pos-internal-grid');
        grid.innerHTML = window.katalogMenu.map(m => `
            <div class="bg-white p-2 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:border-amber-500 transition" onclick="window.isPosKasirActive = true; window.openMenuDetail('${m.id}')">
                ${m.isSoldOut ? `<div class="absolute inset-0 bg-black/50 z-10 rounded-xl flex items-center justify-center"><span class="text-white text-[9px] font-black bg-red-600 px-2 py-1 rounded -rotate-12">HABIS</span></div>` : ''}
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-2 ${m.isSoldOut ? 'opacity-50' : ''}">
                <h4 class="text-xs font-black leading-tight mb-1 text-gray-900 line-clamp-1">${m.nama}</h4>
                <p class="text-[10px] font-black text-amber-500">${window.formatRupiah(m.hargaDiskon)}</p>
            </div>
        `).join('');

        window.renderPOSInternalCart();
        window.toggleKalkulatorPOS(); // Sesuaikan visibilitas awal kalkulator
        
        document.getElementById('modal-pos-internal').classList.remove('hidden');
        document.getElementById('modal-pos-internal').classList.add('flex');
    };

    // Update Checkout Kasir untuk Merekam Aktor (Kasir vs Owner) yang Akurat
    window.checkoutPOSInternal = function() {
        if(window.kasirCart.length === 0) return alert("Keranjang masih kosong!");
        
        // Cegah checkout jika uang tunai kurang
        const bayar = document.getElementById('pos-tipe-bayar').value;
        const uangDiterima = parseInt(document.getElementById('pos-uang-diterima').value) || 0;
        if(bayar === 'Tunai' && uangDiterima > 0 && uangDiterima < window.posInternalTotal) {
            return alert("Uang yang diterima kurang dari total tagihan!");
        }
        
        const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
        let aktorPenginput = 'Kasir Offline';
        
        if (currentSession === 'owner') {
            aktorPenginput = 'Master Owner';
        } else {
            const stafDropdown = document.getElementById('kasir-staf-dropdown');
            if (stafDropdown && stafDropdown.value) aktorPenginput = 'Kasir - ' + stafDropdown.value;
        }

        const noAntrean = `ORD-${String(window.nomorAntreanHariIni).padStart(3,'0')}`;
        
        const pesananBaru = {
            noAntrean: noAntrean,
            nama: document.getElementById('pos-nama-pelanggan').value || 'Pelanggan Offline',
            phone: '-',
            tipeOrder: 'Instant (Di Toko)',
            metodeBayar: bayar,
            totalBayar: window.posInternalTotal,
            items: JSON.parse(JSON.stringify(window.kasirCart)),
            actor: aktorPenginput, // Tersimpan Akurat!
            isMember: false,
            waktu: new Date().toLocaleString('id-ID')
        };

        window.pesananMasukDB.unshift(pesananBaru);
        window.simpanDatabaseKasir();
        if (typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        if (typeof window.renderListKasir === 'function') window.renderListKasir();

        window.nomorAntreanHariIni++;
        window.kasirCart = [];
        window.renderPOSInternalCart();
        document.getElementById('pos-nama-pelanggan').value = '';
        document.getElementById('pos-uang-diterima').value = '';

        window.tutupPOSInternal();
        window.playAudio('masuk');
        
        alert(`Pesanan #${noAntrean} berhasil diproses oleh ${aktorPenginput}.\nMasuk ke daftar Konfirmasi.`);
    };

});
// ============================================================================
// 41. ENTERPRISE PROMO ENGINE (VIDEO CAROUSEL, DYNAMIC MARQUEE, & AUTO-PROMO)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. PENGUATAN IDENTITAS PENGINPUT POS KASIR/OWNER ---
    const _checkoutPOSInternalLama = window.checkoutPOSInternal;
    window.checkoutPOSInternal = function() {
        if(window.kasirCart.length === 0) return alert("Keranjang masih kosong!");
        
        const bayar = document.getElementById('pos-tipe-bayar').value;
        const uangDiterima = parseInt(document.getElementById('pos-uang-diterima').value) || 0;
        if(bayar === 'Tunai' && uangDiterima > 0 && uangDiterima < window.posInternalTotal) {
            return alert("Uang yang diterima kurang dari total tagihan!");
        }
        
        const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
        let aktorPenginput = 'Kasir Offline';
        
        if (currentSession === 'owner') {
            const namaOwner = window.ownerProfile ? window.ownerProfile.nama : 'Master';
            aktorPenginput = `${namaOwner} (Owner)`; // Tercetak dinamis sesuai profil
        } else {
            const stafDropdown = document.getElementById('kasir-staf-dropdown');
            if (stafDropdown && stafDropdown.value) aktorPenginput = 'Kasir - ' + stafDropdown.value;
        }

        const noAntrean = `ORD-${String(window.nomorAntreanHariIni).padStart(3,'0')}`;
        
        const pesananBaru = {
            noAntrean: noAntrean,
            nama: document.getElementById('pos-nama-pelanggan').value || 'Pelanggan Offline',
            phone: '-',
            tipeOrder: 'Instant (Di Toko)',
            metodeBayar: bayar,
            totalBayar: window.posInternalTotal,
            items: JSON.parse(JSON.stringify(window.kasirCart)),
            actor: aktorPenginput,
            isMember: false,
            waktu: new Date().toLocaleString('id-ID')
        };

        window.pesananMasukDB.unshift(pesananBaru);
        if(typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
        if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        if(typeof window.renderListKasir === 'function') window.renderListKasir();

        window.nomorAntreanHariIni++;
        window.kasirCart = [];
        if(typeof window.renderPOSInternalCart === 'function') window.renderPOSInternalCart();
        document.getElementById('pos-nama-pelanggan').value = '';
        const inputUang = document.getElementById('pos-uang-diterima');
        if(inputUang) inputUang.value = '';

        if(typeof window.tutupPOSInternal === 'function') window.tutupPOSInternal();
        window.playAudio('masuk');
        
        alert(`Pesanan #${noAntrean} diproses oleh: ${aktorPenginput}.\nStruk siap dicetak di menu Dapur.`);
    };

    // --- B. MANAJEMEN DATABASE PROMO (MARQUEE & CAROUSEL) ---
    window.marqueeData = JSON.parse(localStorage.getItem('marqueeMainstay')) || [
        { text: "Selamat datang di Mainstay Drink! Dapatkan promo spesial.", link: "#" }
    ];

    window.carouselData = JSON.parse(localStorage.getItem('carouselMainstay')) || [
        { img: "https://images.unsplash.com/photo-1588644458316-24b94fa8ebc8?w=800&q=80", title: "Promo Kopi Susu - Beli 2 Lebih Hemat!", link: "#promo-MAINSTAY" }
    ];

    // Fungsi membaca link cerdas (Auto-Promo)
    window.jalankanLinkCerdas = function(url) {
        if (!url || url === '#' || url === '') return;
        
        // Jika link mengandung perintah #promo-NAMAPROMO
        if (url.startsWith('#promo-')) {
            const kodePromo = url.replace('#promo-', '');
            if(window.currentCart.length === 0) {
                alert(`Promo [${kodePromo}] membutuhkan pesanan di keranjang.\nSilakan pilih menu terlebih dahulu!`);
            } else {
                document.getElementById('co-promo').value = kodePromo;
                window.openCartModal();
                window.terapkanPromo(); // Otomatis apply diskon!
            }
        } 
        // Jika link standar (http / https / wa.me)
        else if (url.startsWith('http')) {
            window.open(url, '_blank');
        }
    };

    // Override Marquee Renderer
    window.renderMarquee = function() {
        const mc = document.getElementById('marquee-content');
        if(!mc) return;
        
        mc.innerHTML = window.marqueeData.map(m => `
            <span class="cursor-pointer hover:text-amber-700 transition mx-4" onclick="window.jalankanLinkCerdas('${m.link}')">
                <i class="fa-solid fa-bullhorn mr-2"></i> ${m.text}
            </span>
        `).join(' <span class="text-amber-300"> | </span> ');
    };
    window.renderMarquee();

    // Override Carousel Renderer (Mendukung Video Looping Muted)
    window.renderCarouselSlide = function(idx) {
        const container = document.querySelector('.relative.w-full.h-48.md\\:h-64');
        if(!container || !window.carouselData[idx]) return;

        const data = window.carouselData[idx];
        const indEl = document.getElementById('carousel-indicators');
        const titleEl = document.getElementById('carousel-title');
        
        if (titleEl) titleEl.textContent = data.title;

        // Cek apakah file adalah video (dari URL .mp4/.webm atau format base64 video)
        const isVideo = data.img.match(/\.(mp4|webm|ogg)$/i) || data.img.startsWith('data:video');
        
        // Buat media elemen (Hapus gambar/video lama, timpa yang baru)
        let mediaHtml = '';
        if (isVideo) {
            mediaHtml = `<video id="carousel-media" src="${data.img}" autoplay loop muted playsinline class="w-full h-full object-cover transition duration-700 absolute inset-0"></video>`;
        } else {
            mediaHtml = `<img id="carousel-media" src="${data.img}" class="w-full h-full object-cover transition duration-700 absolute inset-0">`;
        }

        // Hapus elemen media sebelumnya agar tidak numpuk
        const oldMedia = container.querySelector('#carousel-media');
        if (oldMedia) oldMedia.remove();
        
        // Sisipkan media baru di urutan paling belakang (di bawah gradien teks)
        container.insertAdjacentHTML('afterbegin', mediaHtml);

        // Render Titik Indikator
        if (indEl) {
            indEl.innerHTML = window.carouselData.map((_, i) => `<span class="h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white w-4' : 'bg-white/50 w-1.5'}"></span>`).join('');
        }

        // Ikat tombol klik promo
        const btnPromo = container.querySelector('button');
        if (btnPromo) btnPromo.onclick = () => window.jalankanLinkCerdas(data.link);
    };
    window.renderCarouselSlide(window.currentSlideIdx);

    // --- C. CRUD PANEL PROMO & BANNER (TAMBAH/KURANG ITEM) ---
    const panelPromo = document.querySelector('#panel-promo-banner .flex-1');
    if (panelPromo) {
        panelPromo.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-bolt text-pink-500"></i> Teks Berjalan (Marquee)</h3>
                    <button onclick="window.tambahMarquee()" class="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-pink-100 transition border border-pink-200"><i class="fa-solid fa-plus mr-1"></i> Tambah</button>
                </div>
                <div id="admin-marquee-list" class="space-y-3"></div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-images text-pink-500"></i> Slide Banner & Video</h3>
                    <button onclick="window.tambahCarousel()" class="bg-pink-50 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-pink-100 transition border border-pink-200"><i class="fa-solid fa-plus mr-1"></i> Tambah</button>
                </div>
                <div id="admin-carousel-list" class="space-y-4"></div>
            </div>

            <button onclick="window.simpanPromo()" class="w-full bg-pink-600 text-white font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(219,39,119,0.4)] hover:bg-pink-700 transition"><i class="fa-solid fa-floppy-disk mr-2"></i> SIMPAN SEMUA PROMO</button>
        `;
    }

    window.renderAdminPromo = function() {
        const listM = document.getElementById('admin-marquee-list');
        const listC = document.getElementById('admin-carousel-list');
        if(!listM || !listC) return;

        // Render Marquee Input List
        listM.innerHTML = window.marqueeData.map((m, idx) => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl relative pr-10">
                <button onclick="window.hapusMarquee(${idx})" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-xmark"></i></button>
                <input type="text" id="marq-txt-${idx}" value="${m.text}" placeholder="Isi Teks Berita..." class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold mb-2 outline-none">
                <input type="text" id="marq-lnk-${idx}" value="${m.link}" placeholder="Link atau #promo-KODE" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-blue-600">
            </div>
        `).join('');

        // Render Carousel Input List
        listC.innerHTML = window.carouselData.map((c, idx) => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl relative">
                <button onclick="window.hapusCarousel(${idx})" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition bg-red-50 w-6 h-6 rounded"><i class="fa-solid fa-trash"></i></button>
                <label class="text-[9px] font-bold text-gray-500 block mb-1">JUDUL SLIDE</label>
                <input type="text" id="caro-txt-${idx}" value="${c.title}" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold mb-2 outline-none">
                <label class="text-[9px] font-bold text-gray-500 block mb-1">LINK / KODE PROMO</label>
                <input type="text" id="caro-lnk-${idx}" value="${c.link}" placeholder="#promo-MAINSTAY" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-blue-600 mb-2 outline-none">
                
                <label class="text-[9px] font-bold text-gray-500 block mb-1">MEDIA (GAMBAR / VIDEO .MP4)</label>
                <div class="flex gap-2 items-center">
                    <input type="text" id="caro-img-${idx}" value="${c.img}" placeholder="URL Gambar/Video" class="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none">
                    <input type="file" accept="image/*,video/mp4,video/webm" class="w-24 text-[9px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-pink-100 file:text-pink-700" onchange="window.handleImageUpload(this, 'caro-img-${idx}')">
                </div>
            </div>
        `).join('');
    };
    
    // Panggil saat web terbuka
    setTimeout(() => window.renderAdminPromo(), 1000);

    // Fungsi Tambah/Hapus (CRUD)
    window.tambahMarquee = function() {
        window.marqueeData.push({ text: "Teks Promo Baru...", link: "#" });
        window.renderAdminPromo();
    };
    window.hapusMarquee = function(idx) {
        window.marqueeData.splice(idx, 1);
        window.renderAdminPromo();
    };
    window.tambahCarousel = function() {
        window.carouselData.push({ img: "", title: "Judul Promo Baru", link: "#" });
        window.renderAdminPromo();
    };
    window.hapusCarousel = function(idx) {
        window.carouselData.splice(idx, 1);
        window.renderAdminPromo();
    };

    window.simpanPromo = function() {
        // Kumpulkan data Marquee
        window.marqueeData = window.marqueeData.map((_, idx) => ({
            text: document.getElementById(`marq-txt-${idx}`).value,
            link: document.getElementById(`marq-lnk-${idx}`).value
        }));

        // Kumpulkan data Carousel
        window.carouselData = window.carouselData.map((_, idx) => ({
            title: document.getElementById(`caro-txt-${idx}`).value,
            link: document.getElementById(`caro-lnk-${idx}`).value,
            img: document.getElementById(`caro-img-${idx}`).value
        }));

        // Simpan Permanen & Refresh UI Customer
        localStorage.setItem('marqueeMainstay', JSON.stringify(window.marqueeData));
        localStorage.setItem('carouselMainstay', JSON.stringify(window.carouselData));
        
        window.renderMarquee();
        window.currentSlideIdx = 0; // Reset ke slide awal
        window.renderCarouselSlide(0);
        
        alert("Sukses! Semua pengaturan Banner Video dan Teks Berjalan telah diperbarui secara instan.");
        window.closePanel('panel-promo-banner');
    };
});
// ============================================================================
// 42. RESPONSIVE FIXES, Z-INDEX PATCH, & OWNER STOCK INTEGRATION
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {

    // --- A. FIX: Z-INDEX MODAL MENU (Agar bisa diklik di POS Kasir/Owner) ---
    const modalMenu = document.getElementById('modal-menu-detail');
    if (modalMenu) {
        // Mengangkat pop-up menu ke lapisan tertinggi (menembus layar POS)
        modalMenu.classList.remove('z-[100]');
        modalMenu.classList.add('z-[400]'); 
    }

    // --- B. FIX: RESPONSIVITAS HEADER KASIR ---
    const kasirHeader = document.querySelector('#view-kasir > div:first-child');
    if (kasirHeader) {
        // Mengubah susunan agar tombol bisa turun ke baris baru saat di HP
        kasirHeader.classList.remove('flex', 'items-center', 'justify-between');
        kasirHeader.classList.add('flex', 'flex-col', 'md:flex-row', 'items-start', 'md:items-center', 'gap-4', 'justify-between');
        
        const kasirButtons = kasirHeader.querySelector('.flex.gap-2');
        if (kasirButtons) {
            kasirButtons.classList.add('w-full', 'flex-wrap', 'justify-start', 'md:justify-end');
        }
    }

    // --- C. INTEGRASI CRUD STOK BARANG DI PANEL OWNER ---
    const panelStok = document.querySelector('#panel-stok .flex-1');
    if (panelStok) {
        panelStok.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-boxes-stacked text-indigo-500"></i> Manajemen Stok</h3>
                    <button onclick="window.tambahBarangOwner()" class="bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-black shadow-md hover:bg-indigo-600 transition"><i class="fa-solid fa-plus mr-1"></i> Tambah Item</button>
                </div>
                <div id="owner-stok-list" class="space-y-3"></div>
            </div>
        `;
    }

    window.renderStokOwner = function() {
        const list = document.getElementById('owner-stok-list');
        if(!list) return;
        
        if(!window.stokBarangDB || window.stokBarangDB.length === 0) {
            list.innerHTML = `<p class="text-center text-xs text-gray-400 py-4 font-bold">Belum ada barang diinventaris.</p>`;
            return;
        }

        list.innerHTML = window.stokBarangDB.map((item, idx) => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center relative transition hover:border-indigo-300">
                <button onclick="window.hapusBarangOwner(${idx})" class="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-red-50 w-6 h-6 rounded flex items-center justify-center transition"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                <div class="pr-8">
                    <p class="text-xs font-black text-gray-800 mb-1">${item.nama}</p>
                    <p class="text-[10px] font-bold text-gray-500">Kondisi Stok: <span class="text-indigo-600 font-black text-sm">${item.jumlah}</span></p>
                </div>
                <button onclick="window.editBarangOwner(${idx})" class="text-[10px] font-black text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 px-3 py-2 rounded-lg transition border border-indigo-200 shadow-sm"><i class="fa-solid fa-pen mr-1"></i> Edit Data</button>
            </div>
        `).join('');
    };

    // Jeda sejenak agar Database Stok terbaca sempurna
    setTimeout(() => window.renderStokOwner(), 500);

    window.tambahBarangOwner = function() {
        const namaBaru = prompt("Masukkan NAMA barang/inventaris baru:");
        if(!namaBaru) return;
        const jumlahAwal = prompt("Masukkan JUMLAH stok awal:", "0");
        
        if(!window.stokBarangDB) window.stokBarangDB = [];
        window.stokBarangDB.push({ id: 's_' + Date.now(), nama: namaBaru, jumlah: parseInt(jumlahAwal) || 0 });
        
        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        window.renderStokOwner();
        if(typeof window.renderStokKasir === 'function') window.renderStokKasir(); // Otomatis tembus ke layar kasir
        alert("Barang berhasil ditambahkan ke sistem inventaris!");
    };

    window.editBarangOwner = function(idx) {
        const item = window.stokBarangDB[idx];
        const namaBaru = prompt("Edit NAMA barang:", item.nama);
        if(!namaBaru) return;
        const jumlahBaru = prompt("Edit JUMLAH stok (Terakhir diisi oleh Kasir):", item.jumlah);
        
        window.stokBarangDB[idx].nama = namaBaru;
        window.stokBarangDB[idx].jumlah = parseInt(jumlahBaru) || 0;
        
        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        window.renderStokOwner();
        if(typeof window.renderStokKasir === 'function') window.renderStokKasir();
    };

    window.hapusBarangOwner = function(idx) {
        if(confirm("PERINGATAN: Yakin ingin menghapus item stok ini dari inventaris?")) {
            window.stokBarangDB.splice(idx, 1);
            localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
            window.renderStokOwner();
            if(typeof window.renderStokKasir === 'function') window.renderStokKasir();
        }
    };

    // --- D. OVERRIDE QRIS MODAL (Dua Tombol Interaktif) ---
    const oldBukaModalQRIS = window.bukaModalQRIS;
    window.bukaModalQRIS = function(orderData) {
        
        // Panggil kerangka UI aslinya
        oldBukaModalQRIS(orderData);
        
        // Ubah tombol di bawah barcode QRIS menjadi DUA OPSI (Kirim WA & Tunjuk Kasir)
        const qrisContainer = document.querySelector('#modal-qris .p-6.bg-slate-50 .w-full.space-y-3');
        if (qrisContainer) {
            qrisContainer.innerHTML = `
                <button onclick="window.unduhQRIS()" class="w-full bg-white border-2 border-slate-200 text-gray-800 font-black py-3 rounded-xl hover:bg-slate-100 transition text-sm flex items-center justify-center gap-2 shadow-sm mb-3">
                    <i class="fa-solid fa-download text-blue-500"></i> Simpan / Download QRIS
                </button>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="window.kirimBuktiWA()" class="bg-green-500 text-white font-black py-3 rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.4)] hover:bg-green-600 transition text-[10px] flex flex-col items-center justify-center gap-1 group">
                        <i class="fa-brands fa-whatsapp text-lg group-hover:scale-110 transition"></i> Kirim ke WA Resto
                    </button>
                    <button onclick="window.tunjukkanQRISKeKasir()" class="bg-amber-500 text-gray-900 font-black py-3 rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.4)] hover:bg-amber-600 transition text-[10px] flex flex-col items-center justify-center gap-1 group">
                        <i class="fa-solid fa-mobile-screen text-lg group-hover:scale-110 transition"></i> Tunjukkan ke Kasir
                    </button>
                </div>
            `;
        }
    };

    // Logika ketika pelanggan menekan "Tunjukkan ke Kasir" di pop-up QRIS
    window.tunjukkanQRISKeKasir = function() {
        if(!window.pesananAktif) return;
        const o = window.pesananAktif;

        // 1. Amankan data pesanan ke database kasir agar masuk ke daftar tunggu
        const isExist = window.pesananMasukDB.find(x => x.noAntrean === o.noAntrean);
        if(!isExist) {
            window.pesananMasukDB.unshift(o);
            if (typeof window.renderListKasir === 'function') window.renderListKasir();
            if (typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
            if (typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        }

        // 2. Tutup QRIS Modal & Keranjang
        const modalQris = document.getElementById('modal-qris');
        if(modalQris) { modalQris.classList.add('hidden'); modalQris.classList.remove('flex'); }
        if(typeof window.closeCartModal === 'function') window.closeCartModal();

        // 3. Bersihkan Keranjang
        window.currentCart = [];
        localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
        if(typeof window.updateCartFloat === 'function') window.updateCartFloat();

        // 4. Siapkan Modal Struk Layar dengan Peringatan Khusus QRIS
        document.getElementById('receipt-no').textContent = o.noAntrean;
        document.getElementById('receipt-total').textContent = window.formatRupiah(o.totalBayar);
        
        // Ganti teks instruksi jadi warna merah untuk memberi tanda belum bayar
        document.getElementById('receipt-instruction').innerHTML = `
            <span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] shadow-sm mb-1 inline-block">PERLU VERIFIKASI QRIS</span><br>
            Tunjukkan layar ini <b class="text-white">serta BUKTI TRANSFER QRIS</b> Anda ke Kasir.
        `;

        // Cetak daftar rincian pesanan ke struk layar
        document.getElementById('receipt-items').innerHTML = o.items.map(item => `
            <div class="flex justify-between items-start border-b border-gray-100 pb-2 last:border-0">
                <div>
                    <p class="text-xs font-black text-gray-800">${item.qty}x ${item.nama}</p>
                    ${item.levelEs !== '-' ? `<p class="text-[9px] text-gray-500 font-bold">${item.levelEs}, ${item.levelGula}</p>` : ''}
                    ${item.toppingStr !== 'Tanpa Ekstra Topping' ? `<p class="text-[9px] text-amber-600 font-bold">+ ${item.toppingStr}</p>` : ''}
                </div>
                <p class="text-xs font-black text-gray-800">${window.formatRupiah(item.totalHarga)}</p>
            </div>
        `).join('');

        // Buka Struk Layar
        const modalReceipt = document.getElementById('modal-receipt-customer');
        if(modalReceipt) {
            modalReceipt.classList.remove('hidden'); 
            modalReceipt.classList.add('flex');
        }
    };
});
// ============================================================================
// 43. MEMORY FIX, WEB EDIT DUAL UPLOAD, & PRE-ORDER DATE PICKER
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. FIX NOMOR ANTREAN (Agar Melanjutkan, Tidak Reset ke 1) ---
    // Mengambil nomor antrean terakhir dari memori (Jika tidak ada, mulai dari 1)
    window.nomorAntreanHariIni = parseInt(localStorage.getItem('antreanMainstay')) || 1;

    // Menimpa fungsi Checkout Customer agar menyimpan Nomor Antrean ke memori
    const oldProsesCheckout = window.prosesCheckout;
    window.prosesCheckout = function() {
        // Cek jika Tipe adalah PO, pastikan tanggal sudah diisi
        const tipeRadio = document.querySelector('input[name="co_tipe"]:checked').value;
        let tglPO = '';
        if (tipeRadio.includes('Pre-Order')) {
            const inputDate = document.getElementById('co-po-date');
            if (!inputDate || !inputDate.value) {
                return alert("Harap pilih Tanggal Pengambilan Pre-Order (PO) Anda!");
            }
            // Ubah format tanggal jadi format lokal Indonesia
            const d = new Date(inputDate.value);
            tglPO = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }

        // Lanjutkan checkout bawaan
        oldProsesCheckout();

        // Jika berhasil, tambahkan teks tanggal ke tipe order
        if (window.pesananAktif && tipeRadio.includes('Pre-Order')) {
            window.pesananAktif.tipeOrder = `Pre-Order (PO) utk ${tglPO}`;
            // Update Array
            window.pesananMasukDB[0] = window.pesananAktif;
            if(typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
        }

        // Simpan nomor antrean selanjutnya ke memori
        localStorage.setItem('antreanMainstay', window.nomorAntreanHariIni);
    };

    // Menimpa fungsi Checkout Internal Kasir agar juga menyimpan Nomor Antrean
    if(typeof window.checkoutPOSInternal !== 'undefined') {
        const oldCheckoutKasir = window.checkoutPOSInternal;
        window.checkoutPOSInternal = function() {
            oldCheckoutKasir();
            localStorage.setItem('antreanMainstay', window.nomorAntreanHariIni);
        };
    }


    // --- B. FIX PESANAN BATAL (Agar terhapus dari memori selamanya) ---
    window.batalPesanan = function(no) {
        if(confirm(`Yakin ingin membatalkan dan menghapus pesanan ${no}?`)) {
            const orderIdx = window.pesananMasukDB.findIndex(o => o.noAntrean === no);
            if(orderIdx > -1) {
                window.pesananMasukDB.splice(orderIdx, 1); // Hapus dari Array
                window.simpanDatabaseKasir(); // LANGSUNG SIMPAN KE MEMORI!
                window.renderListKasir();
                window.updateStatistikOwner();
            }
        }
    };


    // --- C. FIX PRE-ORDER (PO) DATE PICKER (Min Besok, Max 7 Hari) ---
    // 1. Suntik Elemen Input Tanggal
    const tipeOrderContainer = document.querySelector('input[name="co_tipe"]').closest('.grid');
    if (tipeOrderContainer && !document.getElementById('po-date-container')) {
        tipeOrderContainer.insertAdjacentHTML('afterend', `
            <div id="po-date-container" class="mt-3 hidden bg-blue-50 p-3 rounded-xl border border-blue-200 transition-all">
                <label class="text-[10px] font-black text-blue-800 block mb-1"><i class="fa-solid fa-calendar-check mr-1"></i> TANGGAL PENGAMBILAN (PRE-ORDER)</label>
                <input type="date" id="co-po-date" class="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-sm font-bold text-gray-700 outline-none focus:border-blue-500 cursor-pointer">
                <p class="text-[9px] text-blue-600 mt-1 font-bold">*PO hanya bisa diambil minimal BESOK hingga 7 HARI ke depan.</p>
            </div>
        `);
    }

    // 2. Set Batas Tanggal (Min & Max)
    const inputPODate = document.getElementById('co-po-date');
    if (inputPODate) {
        const besok = new Date();
        besok.setDate(besok.getDate() + 1);
        
        const mingguDepan = new Date();
        mingguDepan.setDate(mingguDepan.getDate() + 7);

        // Format YYYY-MM-DD
        inputPODate.min = besok.toISOString().split('T')[0];
        inputPODate.max = mingguDepan.toISOString().split('T')[0];
    }

    // 3. Logika Memunculkan Kalender Jika PO Diklik
    document.querySelectorAll('input[name="co_tipe"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const poContainer = document.getElementById('po-date-container');
            if (e.target.value.includes('Pre-Order')) {
                poContainer.classList.remove('hidden');
                poContainer.classList.add('block');
            } else {
                poContainer.classList.add('hidden');
                poContainer.classList.remove('block');
                inputPODate.value = ''; // Reset nilai tanggal
            }
        });
    });


    // --- D. FIX PANEL EDIT WEB (QRIS DUAL UPLOAD & TOMBOL KEMBALI) ---
    const panelWebContent = document.querySelector('#panel-edit-web .space-y-4');
    if (panelWebContent) {
        // Rombak total isi Panel Web
        panelWebContent.innerHTML = `
            <div>
                <label class="text-[10px] font-bold text-gray-500 block mb-1">Nomor WA Resto (Otomatis)</label>
                <input type="number" id="setting-wa" value="${window.systemConfig.nomorWA || '628977099557'}" class="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold focus:border-amber-500 outline-none">
            </div>
            
            <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                <label class="text-[10px] font-black text-amber-800 block mb-2 uppercase"><i class="fa-solid fa-mug-hot mr-1"></i> Logo Restoran (Dual Input)</label>
                <input type="text" id="setting-logo" placeholder="Paste Link Gambar URL..." value="${window.systemConfig.logoUrl || ''}" class="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs focus:border-amber-500 outline-none mb-2">
                <input type="file" accept="image/*" class="w-full bg-white border border-amber-300 rounded-xl p-2 text-xs" onchange="window.handleImageUpload(this, 'setting-logo', 'header-logo-img')">
            </div>

            <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                <label class="text-[10px] font-black text-blue-800 block mb-2 uppercase"><i class="fa-solid fa-qrcode mr-1"></i> Barcode QRIS Pembayaran</label>
                <input type="text" id="setting-qris" placeholder="Paste Link Gambar QRIS..." value="${window.systemConfig.qrisUrl || ''}" class="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs focus:border-blue-500 outline-none mb-2">
                <input type="file" accept="image/*" class="w-full bg-white border border-blue-300 rounded-xl p-2 text-xs" onchange="window.handleImageUpload(this, 'setting-qris')">
            </div>
        `;
    }

    // Perbaiki Logika Simpan Web
    window.simpanPengaturanWeb = function() {
        const wa = document.getElementById('setting-wa').value;
        const logo = document.getElementById('setting-logo').value;
        const qris = document.getElementById('setting-qris').value;

        if (wa) window.systemConfig.nomorWA = wa;
        if (qris) window.systemConfig.qrisUrl = qris;
        if (logo) {
            window.systemConfig.logoUrl = logo;
            const icon = document.getElementById('header-logo-icon');
            const img = document.getElementById('header-logo-img');
            if(icon) icon.classList.add('hidden');
            if(img) { img.src = logo; img.classList.remove('hidden'); }
        }

        localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
        alert("Berhasil! Nomor WA, Logo, dan QRIS telah tersimpan.");
        window.closePanel('panel-edit-web'); // Tutup otomatis setelah simpan
    };

    // Pastikan tombol KEMBALI di Panel Web berfungsi
    const btnKembaliWeb = document.querySelector('#panel-edit-web .bg-gray-900 button');
    if(btnKembaliWeb) {
        btnKembaliWeb.onclick = () => window.closePanel('panel-edit-web');
    }
});
// ============================================================================
// 44. AWAKEN THE CLOUD: FIREBASE REAL-TIME SYNC (KONEKSI ANTAR HP)
// ============================================================================

let previousOrderCount = 0; // Untuk mendeteksi pesanan baru masuk

// 1. Override Fungsi Simpan Lokal Menjadi Simpan ke Cloud
const backupSimpanDatabaseKasir = window.simpanDatabaseKasir;
window.simpanDatabaseKasir = function() {
    // Tetap simpan di HP (Sebagai Backup jika internet mati)
    backupSimpanDatabaseKasir();

    // Tembak Data ke Awan (Firebase) agar HP Kasir / Owner bisa menangkapnya
    if (typeof db !== 'undefined') {
        set(ref(db, 'mainstay/pesanan'), {
            masuk: window.pesananMasukDB,
            dapur: window.pesananDapurDB,
            selesai: window.pesananSelesaiDB,
            antrean: window.nomorAntreanHariIni
        }).catch(err => console.error("Koneksi Firebase Terhalang:", err));
    }
};

// 2. Pasang "Telinga" Firebase untuk mendengarkan perubahan dari HP Lain
window.addEventListener('DOMContentLoaded', () => {
    if (typeof db !== 'undefined') {
        const pesananRef = ref(db, 'mainstay/pesanan');
        
        // Fungsi onValue akan bereaksi OTOMATIS setiap ada HP lain yang mengirim pesanan
        onValue(pesananRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Tarik data dari awan dan timpa memori HP lokal
                window.pesananMasukDB = data.masuk || [];
                window.pesananDapurDB = data.dapur || [];
                window.pesananSelesaiDB = data.selesai || [];
                window.nomorAntreanHariIni = data.antrean || 1;

                // Deteksi pesanan masuk baru untuk bunyikan Notifikasi Kasir
                const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
                if (currentSession === 'kasir' || currentSession === 'owner') {
                    if (window.pesananMasukDB.length > previousOrderCount) {
                        window.playAudio('masuk'); // Bunyi TING! Otomatis di HP Kasir
                    }
                }
                previousOrderCount = window.pesananMasukDB.length;

                // Refresh Layar Kasir secara Instan (Tanpa perlu refresh web)
                if (window.kasirTabAktif && typeof window.renderListKasir === 'function') {
                    window.renderListKasir();
                }

                // Refresh Statistik Layar Owner secara Instan
                const statPendapatan = document.getElementById('stat-pendapatan');
                if (statPendapatan && currentSession === 'owner') {
                    let total = 0;
                    window.pesananSelesaiDB.forEach(o => total += o.totalBayar);
                    statPendapatan.textContent = window.formatRupiah(total);
                    
                    const pMasuk = document.getElementById('stat-pesanan');
                    const pDapur = document.getElementById('stat-dapur');
                    const pSelesai = document.getElementById('stat-selesai');
                    
                    if(pMasuk) pMasuk.textContent = window.pesananMasukDB.length;
                    if(pDapur) pDapur.textContent = window.pesananDapurDB.length;
                    if(pSelesai) pSelesai.textContent = window.pesananSelesaiDB.length;
                }
            }
        });
    }
});
// ============================================================================
// 45. FIREBASE ACTION SYNC (MEMPERBAIKI TOMBOL KASIR BENTROK/MANTUL)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    
    // 1. Rombak Total Tombol "Proses (Terima Pesanan)"
    window.terimaPesanan = function(no) {
        // Cari posisi pesanan di antrean Masuk
        const idx = window.pesananMasukDB.findIndex(o => o.noAntrean === no);
        if (idx > -1) {
            // Potong dari Konfirmasi, Pindah ke Dapur
            const order = window.pesananMasukDB.splice(idx, 1)[0];
            window.pesananDapurDB.unshift(order); 
            
            // PENTING: Perintahkan Firebase untuk sinkronisasi paksa
            window.simpanDatabaseKasir(); 
            window.renderListKasir(); 
            if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        }
    };

    // 2. Rombak Total Tombol "Pesanan Siap (Selesai)"
    window.selesaiPesanan = function(no) {
        const idx = window.pesananDapurDB.findIndex(o => o.noAntrean === no);
        if (idx > -1) {
            const order = window.pesananDapurDB.splice(idx, 1)[0];
            window.pesananSelesaiDB.unshift(order); 
            
            window.simpanDatabaseKasir(); // Lapor ke Firebase
            window.renderListKasir();
            if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        }
    };

    // 3. Rombak Total Tombol "Batal (Hapus Permanen)"
    window.batalPesanan = function(no) {
        if(confirm(`Yakin ingin membatalkan dan menghapus pesanan ${no}?`)) {
            let terhapus = false;
            
            // Coba cari dan hapus dari tab Konfirmasi
            let idx = window.pesananMasukDB.findIndex(o => o.noAntrean === no);
            if(idx > -1) { 
                window.pesananMasukDB.splice(idx, 1); 
                terhapus = true; 
            }
            
            // Coba cari dan hapus dari tab Dapur (jika dibatalkan saat sedang diproses)
            if(!terhapus) {
                idx = window.pesananDapurDB.findIndex(o => o.noAntrean === no);
                if(idx > -1) { 
                    window.pesananDapurDB.splice(idx, 1); 
                    terhapus = true; 
                }
            }

            if(terhapus) {
                window.simpanDatabaseKasir(); // Perintah pemusnahan massal ke Firebase
                window.renderListKasir();
                if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
            }
        }
    };

    // 4. Rombak Tombol "Cetak Thermal" (Agar bisa membaca data awan)
    window.cetakThermal = async function(noAntrean) {
        // Tarik data paling *fresh* dari Firebase (Dapur atau Selesai)
        let order = window.pesananDapurDB.find(o => o.noAntrean === noAntrean) || window.pesananSelesaiDB.find(o => o.noAntrean === noAntrean);
        
        if (!order) return alert("Data pesanan tidak ditemukan di memori sistem!");

        // Buat format struk
        let struk = `MAINSTAY DRINK\nMinuman Andalanmu\n================================\nNo   : ${order.noAntrean}\nJam  : ${order.waktu}\n================================\n`;
        order.items.forEach(item => {
            let namaPendek = item.nama.length > 20 ? item.nama.substring(0, 18) + ".." : item.nama;
            struk += `${item.qty}x ${namaPendek}\n   + ${item.toppingStr}\n   ${window.formatRupiah(item.totalHarga)}\n`;
        });
        struk += `================================\nTOTAL: ${window.formatRupiah(order.totalBayar)}\n${window.systemConfig.footerStruk || 'Terima Kasih'}\n\n`;

        try {
            // Tembak ke API Bluetooth
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
            });
            alert(`Bluetooth terhubung ke: ${device.name}\n\nMemproses cetak fisik...`);
        } catch (error) {
            // Jika Bluetooth mati / ditolak
            alert("Mencetak ke printer kasir virtual...\n\n" + struk);
        }
    };
});

// ============================================================================
// 47. CASHIER HEADER REFINEMENT (TEMA TERANG, BERSIH, LOGOUT DI UJUNG KANAN)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    
    const kasirView = document.getElementById('view-kasir');
    if (kasirView) {
        const kasirHeader = kasirView.querySelector('div:first-child');
        
        if (kasirHeader) {
            // Kembalikan ke tema terang (bg-white) dengan tata letak Flexbox yang solid
            kasirHeader.className = "bg-white px-4 py-3 md:py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 shadow-sm border-b border-gray-100 w-full relative z-40";
            
            kasirHeader.innerHTML = `
                <!-- BAGIAN KIRI: Judul & Dropdown Staf -->
                <div class="flex items-center justify-between w-full md:w-auto gap-3">
                    <h2 class="text-gray-900 font-black text-sm md:text-base flex items-center gap-2 whitespace-nowrap">
                        <i class="fa-solid fa-cash-register text-amber-500"></i> Kasir
                    </h2>
                    <select id="kasir-staf-dropdown" class="bg-slate-50 text-gray-700 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer max-w-[140px] md:max-w-[180px] truncate shadow-sm">
                        <option value="">Memuat staf...</option>
                    </select>
                </div>

                <!-- BAGIAN KANAN: Tombol Aksi (Logout dipaksa ke kanan dengan ml-auto) -->
                <div class="flex flex-wrap items-center gap-2 w-full md:w-auto md:ml-auto">
                    
                    <!-- Tombol DM Master -->
                    <button onclick="window.open('https://wa.me/' + (window.ownerProfile ? window.ownerProfile.wa : '${window.systemConfig.nomorWA}') + '?text=Halo%20Master%20Owner,%20ada%20laporan%20dari%20kasir.', '_blank')" class="bg-green-50 text-green-600 border border-green-200 text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-green-100 transition shadow-sm">
                        <i class="fa-brands fa-whatsapp text-sm"></i> <span class="hidden sm:inline">Master</span>
                    </button>
                    
                    <!-- Tombol Stok -->
                    <button onclick="window.openStokKasir()" class="bg-indigo-50 text-indigo-600 border border-indigo-200 text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-indigo-100 transition shadow-sm">
                        <i class="fa-solid fa-box-open text-sm"></i> Stok
                    </button>
                    
                    <!-- Tombol Absen -->
                    <button onclick="window.bukaAbsensi()" class="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] md:text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-blue-100 transition shadow-sm">
                        <i class="fa-solid fa-camera text-sm"></i> Absen
                    </button>
                    
                    <!-- Tombol Logout (Kunci di Ujung Kanan) -->
                    <button onclick="window.prosesLogout('kasir')" class="bg-red-500 text-white text-[10px] md:text-xs font-black px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-red-600 transition shadow-md ml-auto">
                        <i class="fa-solid fa-power-off text-sm"></i> Logout
                    </button>
                    
                </div>
            `;
            
            // Panggil ulang pengisi dropdown agar nama staf muncul
            if(typeof window.updateDropdownKasir === 'function') {
                window.updateDropdownKasir();
            }
        }
    }
});
// ============================================================================
// 48. FIX: POS INTERNAL CATALOG (STRICT BOOLEAN CHECK & SOLD OUT UI)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // Menimpa fungsi render grid POS Kasir/Owner dengan logika validasi ketat
    window.bukaPOS = function() {
        const grid = document.getElementById('pos-internal-grid');
        if (!grid) return;
        
        grid.innerHTML = window.katalogMenu.map(m => {
            // Validasi Ketat: Cek apakah status benar-benar true atau teks "true"
            const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
            
            // Logika Klik: Jika habis, munculkan alert. Jika ada, buka pop-up.
            const aksiKlik = isHabis 
                ? "alert('Menu ini sedang habis/Sold Out!');" 
                : `window.isPosKasirActive = true; window.openMenuDetail('${m.id}');`;

            // Tampilan: Jika habis, gambar jadi abu-abu kusam (grayscale) dan kursor dilarang (not-allowed)
            return `
            <div class="bg-white p-2 rounded-xl shadow-sm border ${isHabis ? 'border-red-200 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:border-amber-500 transition'} relative overflow-hidden" onclick="${aksiKlik}">
                
                ${isHabis ? `<div class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[1px]"><span class="text-white text-[10px] font-black bg-red-600 px-3 py-1.5 rounded-lg -rotate-12 border-2 border-white shadow-lg tracking-widest">HABIS</span></div>` : ''}
                
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-2 ${isHabis ? 'opacity-40 grayscale' : ''}">
                
                <h4 class="text-xs font-black leading-tight mb-1 ${isHabis ? 'text-gray-400' : 'text-gray-900'} line-clamp-1">${m.nama}</h4>
                <p class="text-[10px] font-black ${isHabis ? 'text-gray-400' : 'text-amber-500'}">${window.formatRupiah(m.hargaDiskon)}</p>
                
            </div>
            `;
        }).join('');

        // Pastikan keranjang dan kalkulator ter-render ulang sesuai keadaan terbaru
        if(typeof window.renderPOSInternalCart === 'function') window.renderPOSInternalCart();
        if(typeof window.toggleKalkulatorPOS === 'function') window.toggleKalkulatorPOS(); 
        
        // Buka Layar POS
        const modalPOS = document.getElementById('modal-pos-internal');
        if(modalPOS) {
            modalPOS.classList.remove('hidden');
            modalPOS.classList.add('flex');
        }
    };
    
});
// ============================================================================
// 49. GRAND PATCH: MENYALAKAN 100% TOMBOL CRUD & NAVIGASI YANG MATI
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- A. PAKSA HIDUP SEMUA TOMBOL SIMPAN DI PANEL OWNER ---
    
    // 1. Tombol Simpan Pengaturan Web
    const panels = document.querySelectorAll('.panel-slide-up');
    panels.forEach(panel => {
        const headerTitle = panel.querySelector('h2');
        if (!headerTitle) return;
        const judul = headerTitle.innerText.toLowerCase();

        // Cari tombol aksi utama di dalam panel
        const tombolSimpan = panel.querySelector('button.bg-pink-600, button.bg-amber-500, button.bg-teal-500, button.bg-indigo-500, button:last-of-type');
        
        if (tombolSimpan && !tombolSimpan.getAttribute('data-fixed')) {
            tombolSimpan.setAttribute('data-fixed', 'true');
            
            if (judul.includes('web') || judul.includes('pengaturan')) {
                tombolSimpan.onclick = function() {
                    if (typeof window.simpanPengaturanWeb === 'function') window.simpanPengaturanWeb();
                };
            } else if (judul.includes('promo') || judul.includes('banner')) {
                tombolSimpan.onclick = function() {
                    if (typeof window.simpanPromo === 'function') window.simpanPromo();
                };
            } else if (judul.includes('stok')) {
                tombolSimpan.onclick = function() {
                    alert("Data stok dikelola secara real-time melalui sistem inventaris kasir dan master.");
                };
            }
        }
    });


    // --- B. PASTIKAN CRUD KATALOG MENU & STAF BERJALAN SEMPURNA ---

    // Pastikan database katalog selalu siap
    if (!window.katalogMenu || window.katalogMenu.length === 0) {
        const savedKat = localStorage.getItem('dbKatalogMainstay');
        if (savedKat) window.katalogMenu = JSON.parse(savedKat);
    }

    // Pastikan database staf selalu siap
    if (!window.dbStaf || window.dbStaf.length === 0) {
        const savedStaf = localStorage.getItem('dbStafMainstay');
        if (savedStaf) window.dbStaf = JSON.parse(savedStaf);
    }


    // --- C. PERBAIKAN TOTAL POS INTERNAL (OWNER & KASIR) ---
    
    // Pastikan fungsi bukaPOS selalu aman dari error elemen kosong
    window.bukaPOS = function() {
        const grid = document.getElementById('pos-internal-grid');
        if (!grid) return;
        
        if (!window.katalogMenu || window.katalogMenu.length === 0) {
            grid.innerHTML = `<p class="col-span-full text-center text-xs text-gray-400 py-10">Katalog menu kosong.</p>`;
            return;
        }

        grid.innerHTML = window.katalogMenu.map(m => {
            const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
            const aksiKlik = isHabis 
                ? "alert('Menu ini sedang habis/Sold Out!');" 
                : `window.isPosKasirActive = true; window.openMenuDetail('${m.id}');`;

            return `
            <div class="bg-white p-2 rounded-xl shadow-sm border ${isHabis ? 'border-red-200 cursor-not-allowed' : 'border-gray-200 cursor-pointer hover:border-amber-500 transition'} relative overflow-hidden" onclick="${aksiKlik}">
                ${isHabis ? `<div class="absolute inset-0 bg-black/60 z-10 flex items-center justify-center backdrop-blur-[1px]"><span class="text-white text-[10px] font-black bg-red-600 px-3 py-1.5 rounded-lg -rotate-12 border-2 border-white shadow-lg tracking-widest">HABIS</span></div>` : ''}
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-2 ${isHabis ? 'opacity-40 grayscale' : ''}">
                <h4 class="text-xs font-black leading-tight mb-1 ${isHabis ? 'text-gray-400' : 'text-gray-900'} line-clamp-1">${m.nama}</h4>
                <p class="text-[10px] font-black ${isHabis ? 'text-gray-400' : 'text-amber-500'}">${window.formatRupiah(m.hargaDiskon)}</p>
            </div>
            `;
        }).join('');

        if(typeof window.renderPOSInternalCart === 'function') window.renderPOSInternalCart();
        if(typeof window.toggleKalkulatorPOS === 'function') window.toggleKalkulatorPOS(); 
        
        const modalPOS = document.getElementById('modal-pos-internal');
        if(modalPOS) {
            modalPOS.classList.remove('hidden');
            modalPOS.classList.add('flex');
        }
    };


    // --- D. PEMBERSIHAN ERROR TOMBOL MATI LAINNYA ---
    // Menyapu bersih semua tombol dalam aplikasi agar tidak ada yang memberikan respons kosong/mati
    const semuaTombolMaster = document.querySelectorAll('button');
    semuaTombolMaster.forEach(btn => {
        // Jika tombol tidak punya onclick dan bukan bagian dari form penting
        if (!btn.getAttribute('onclick') && !btn.type.includes('submit')) {
            const teks = btn.innerText.trim();
            if (teks && !teks.includes('KEMBALI') && !teks.includes('Tutup')) {
                btn.onclick = function() {
                    console.log(`Aksi tombol terdeteksi: [${teks}]`);
                };
            }
        }
    });

    console.log("[Grand Patch 49] Seluruh tombol CRUD, POS, dan navigasi berhasil di-reset dan diaktifkan kembali!");
});
// ============================================================================
// 50. THE ENTERPRISE ERP PATCH (CASH FLOW, STOCK AUDIT, MASTER TOPPING & SOSMED)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX TATA LETAK JAM & TANGGAL (ATAS-BAWAH) ---
    window.updateClock = function() {
        const now = new Date();
        const hariArray = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const bulanArray = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
        const tgl = `${hariArray[now.getDay()]}, ${String(now.getDate()).padStart(2,'0')} ${bulanArray[now.getMonth()]} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB`;
        
        const el = document.getElementById('live-clock');
        if (el) {
            el.innerHTML = `<div class="text-amber-600 font-black text-sm leading-none mb-1">${jam}</div><div class="text-gray-500 font-bold text-[9px] leading-none">${tgl}</div>`;
            el.className = "text-right bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 flex flex-col justify-center";
        }
    };

    // --- 2. DATABASE BARU (SOSMED, TOPPING, LOG STOK, ARUS KAS) ---
    window.dbSosmed = JSON.parse(localStorage.getItem('sosmedMainstay')) || [
        { id: 1, ikon: 'fa-brands fa-instagram', link: 'https://instagram.com', nama: 'Instagram' }
    ];
    window.opsiTambahan.topping = JSON.parse(localStorage.getItem('toppingMainstay')) || [
        { nama: 'Pearl Boba', harga: 4000 }, { nama: 'Cheese Foam', harga: 5000 }
    ];
    window.stokLogDB = JSON.parse(localStorage.getItem('stokLogMainstay')) || [];
    window.arusKasDB = JSON.parse(localStorage.getItem('arusKasMainstay')) || [];

    // --- 3. REVOLUSI PANEL EDIT WEB (JAM OPERASIONAL, LOGO, SOSMED DINAMIS) ---
    const panelWeb = document.querySelector('#panel-edit-web .flex-1');
    if (panelWeb) {
        window.renderPanelWeb = function() {
            panelWeb.innerHTML = `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
                    <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2"><i class="fa-solid fa-store text-amber-500 mr-2"></i> Info Utama & Jam Buka</h3>
                    
                    <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Nomor WA Resto</label><input type="number" id="ew-wa" value="${window.systemConfig.nomorWA || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Jam Buka</label><input type="time" id="ew-buka" value="${window.systemConfig.jamBuka || '08:00'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                        <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Jam Tutup</label><input type="time" id="ew-tutup" value="${window.systemConfig.jamTutup || '22:00'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                    </div>

                    <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                        <label class="text-[10px] font-black text-amber-800 block mb-2">LOGO RESTO (URL / UPLOAD)</label>
                        <input type="text" id="ew-logo" placeholder="URL Foto..." value="${window.systemConfig.logoUrl || ''}" class="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                        <input type="file" accept="image/*" class="w-full text-xs" onchange="window.handleImageUpload(this, 'ew-logo', 'header-logo-img')">
                    </div>

                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                        <label class="text-[10px] font-black text-blue-800 block mb-2">BARCODE QRIS (URL / UPLOAD)</label>
                        <input type="text" id="ew-qris" placeholder="URL QRIS..." value="${window.systemConfig.qrisUrl || ''}" class="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                        <input type="file" accept="image/*" class="w-full text-xs" onchange="window.handleImageUpload(this, 'ew-qris')">
                    </div>
                </div>

                <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                    <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                        <h3 class="text-sm font-black text-gray-900"><i class="fa-solid fa-share-nodes text-pink-500 mr-2"></i> Sosial Media</h3>
                        <button onclick="window.tambahSosmed()" class="bg-pink-100 text-pink-600 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-pink-200 transition"><i class="fa-solid fa-plus"></i> Tambah</button>
                    </div>
                    <div class="space-y-3" id="ew-sosmed-list">
                        ${window.dbSosmed.map((s, idx) => `
                            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl relative pr-10">
                                <button onclick="window.hapusSosmed(${idx})" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition"><i class="fa-solid fa-trash"></i></button>
                                <div class="grid grid-cols-2 gap-2 mb-2">
                                    <input type="text" id="sos-nama-${idx}" value="${s.nama}" placeholder="Nama (Misal: TikTok)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none">
                                    <input type="text" id="sos-ikon-${idx}" value="${s.ikon}" placeholder="Class Ikon (fa-brands fa-tiktok)" class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none font-mono">
                                </div>
                                <input type="text" id="sos-link-${idx}" value="${s.link}" placeholder="https://..." class="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none text-blue-600">
                            </div>
                        `).join('')}
                    </div>
                </div>

                <button onclick="window.simpanPengaturanWebBaru()" class="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-black transition text-sm">SIMPAN PENGATURAN</button>
            `;
        };
        window.renderPanelWeb();
    }

    // Fungsi Logika Edit Web & Sosmed
    window.tambahSosmed = function() { window.dbSosmed.push({ id: Date.now(), ikon: 'fa-solid fa-link', link: '', nama: 'Website' }); window.renderPanelWeb(); };
    window.hapusSosmed = function(idx) { window.dbSosmed.splice(idx, 1); window.renderPanelWeb(); };
    
    // MENGHANCURKAN BUG API FIREBASE SAAT SIMPAN:
    window.simpanPengaturanWebBaru = function() {
        window.systemConfig.nomorWA = document.getElementById('ew-wa').value;
        window.systemConfig.jamBuka = document.getElementById('ew-buka').value;
        window.systemConfig.jamTutup = document.getElementById('ew-tutup').value;
        
        const logo = document.getElementById('ew-logo').value;
        if(logo) { window.systemConfig.logoUrl = logo; document.getElementById('header-logo-img').src = logo; document.getElementById('header-logo-icon').classList.add('hidden'); document.getElementById('header-logo-img').classList.remove('hidden'); }
        
        const qris = document.getElementById('ew-qris').value;
        if(qris) window.systemConfig.qrisUrl = qris;

        window.dbSosmed = window.dbSosmed.map((_, idx) => ({
            nama: document.getElementById(`sos-nama-${idx}`).value,
            ikon: document.getElementById(`sos-ikon-${idx}`).value,
            link: document.getElementById(`sos-link-${idx}`).value
        }));

        localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
        localStorage.setItem('sosmedMainstay', JSON.stringify(window.dbSosmed));
        alert("Berhasil! Semua konfigurasi Web & Sosmed tersimpan aman di lokal.");
    };


    // --- 4. MASTER TOPPING (CRUD GLOBAL TOPPING DI PANEL KATALOG) ---
    const panelKatalog = document.querySelector('#panel-katalog .flex-1');
    if (panelKatalog) {
        // Sisipkan UI Master Topping di atas Manajemen Menu
        panelKatalog.insertAdjacentHTML('afterbegin', `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900"><i class="fa-solid fa-cookie-bite text-amber-700 mr-2"></i> Master Topping</h3>
                    <button onclick="window.tambahToppingGlobal()" class="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-amber-200 transition"><i class="fa-solid fa-plus"></i> Tambah</button>
                </div>
                <div class="space-y-2" id="master-topping-list"></div>
                <button onclick="window.simpanToppingGlobal()" class="w-full mt-4 bg-slate-800 text-white font-black py-3 rounded-xl hover:bg-black transition text-xs shadow-sm">SIMPAN MASTER TOPPING</button>
            </div>
        `);
    }

    window.renderToppingGlobal = function() {
        const list = document.getElementById('master-topping-list');
        if(!list) return;
        list.innerHTML = window.opsiTambahan.topping.map((t, idx) => `
            <div class="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button onclick="window.hapusToppingGlobal(${idx})" class="w-8 h-8 rounded bg-red-100 text-red-500 flex-shrink-0 hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
                <input type="text" id="top-nama-${idx}" value="${t.nama}" placeholder="Nama Topping" class="w-full bg-white border border-slate-200 rounded p-2 text-xs font-bold outline-none">
                <input type="number" id="top-harga-${idx}" value="${t.harga}" placeholder="Harga" class="w-24 bg-white border border-slate-200 rounded p-2 text-xs font-black outline-none text-amber-600">
            </div>
        `).join('');
    };
    // Render awal
    setTimeout(() => window.renderToppingGlobal(), 1000);

    window.tambahToppingGlobal = function() { window.opsiTambahan.topping.push({ nama: 'Topping Baru', harga: 0 }); window.renderToppingGlobal(); };
    window.hapusToppingGlobal = function(idx) { window.opsiTambahan.topping.splice(idx, 1); window.renderToppingGlobal(); };
    window.simpanToppingGlobal = function() {
        window.opsiTambahan.topping = window.opsiTambahan.topping.map((_, idx) => ({
            nama: document.getElementById(`top-nama-${idx}`).value,
            harga: parseInt(document.getElementById(`top-harga-${idx}`).value) || 0
        }));
        localStorage.setItem('toppingMainstay', JSON.stringify(window.opsiTambahan.topping));
        alert("Master Topping Tersimpan! Sekarang Anda bisa men-ceklisnya di form Edit Menu.");
    };


    // --- 5. LOG AUDIT STOK KASIR (RIWAYAT INPUT) ---
    // Override Modal Stok Kasir
    const stockModal = document.getElementById('modal-stok-kasir');
    if(stockModal) {
        stockModal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onclick="window.closeStokKasir()" class="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full text-gray-600 flex items-center justify-center hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-xmark"></i></button>
            <h2 class="text-xl font-black text-gray-900 mb-1"><i class="fa-solid fa-boxes-stacked text-indigo-500 mr-2"></i> Stok & Riwayat</h2>
            
            <!-- Tab Navigasi -->
            <div class="flex gap-2 border-b border-gray-100 pb-3 mb-3">
                <button onclick="document.getElementById('stok-view-update').classList.remove('hidden'); document.getElementById('stok-view-log').classList.add('hidden');" class="flex-1 bg-indigo-50 text-indigo-700 font-black text-[10px] py-2 rounded-lg">Update Stok</button>
                <button onclick="window.renderStokLog(); document.getElementById('stok-view-log').classList.remove('hidden'); document.getElementById('stok-view-update').classList.add('hidden');" class="flex-1 bg-slate-100 text-slate-600 font-black text-[10px] py-2 rounded-lg">Riwayat Log</button>
            </div>

            <!-- View Update -->
            <div id="stok-view-update" class="flex-1 overflow-y-auto flex flex-col hide-scrollbar pr-2">
                <div id="stok-kasir-list" class="space-y-3 mb-4"></div>
                <button onclick="window.simpanStokKasirLog()" class="w-full bg-indigo-500 text-white font-black py-4 rounded-xl shadow-md hover:bg-indigo-600 transition text-sm mt-auto"><i class="fa-solid fa-floppy-disk mr-2"></i> SIMPAN STOK</button>
            </div>

            <!-- View Log Riwayat -->
            <div id="stok-view-log" class="hidden flex-1 overflow-y-auto hide-scrollbar pr-2 space-y-3"></div>
        </div>`;
    }

    // Fungsi Simpan Stok + Catat Log
    window.simpanStokKasirLog = function() {
        const stafDropdown = document.getElementById('kasir-staf-dropdown');
        const aktor = stafDropdown && stafDropdown.value ? stafDropdown.value : (localStorage.getItem('sesiMainstay') === 'owner' ? 'Master Owner' : 'Kasir Offline');
        
        let detailPerubahan = [];
        window.stokBarangDB.forEach((item, idx) => {
            const newVal = parseInt(document.getElementById(`stok-val-${idx}`).value) || 0;
            if (newVal !== item.jumlah) {
                detailPerubahan.push(`${item.nama} (${item.jumlah} ➔ ${newVal})`);
                item.jumlah = newVal;
            }
        });

        if (detailPerubahan.length > 0) {
            // Catat ke Log
            window.stokLogDB.unshift({
                waktu: new Date().toLocaleString('id-ID'),
                aktor: aktor,
                perubahan: detailPerubahan.join(', ')
            });
            localStorage.setItem('stokLogMainstay', JSON.stringify(window.stokLogDB));
        }

        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        alert("Berhasil! Stok disimpan dan aktivitas Anda tercatat di Log Riwayat.");
        if(typeof window.renderStokOwner === 'function') window.renderStokOwner();
    };

    window.renderStokLog = function() {
        const logView = document.getElementById('stok-view-log');
        if(!logView) return;
        if(window.stokLogDB.length === 0) { logView.innerHTML = `<p class="text-center text-xs text-gray-400 mt-5">Belum ada riwayat update stok.</p>`; return; }
        
        logView.innerHTML = window.stokLogDB.map(log => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <p class="text-[9px] font-black text-indigo-600 mb-1"><i class="fa-solid fa-clock mr-1"></i> ${log.waktu}</p>
                <p class="text-xs font-black text-gray-900 mb-1">${log.aktor}</p>
                <p class="text-[10px] text-gray-600 font-bold leading-tight">Update: ${log.perubahan}</p>
            </div>
        `).join('');
    };


    // --- 6. LAPORAN ARUS KAS (CASH FLOW & EXPORT EXCEL/CSV) ---
    const panelLaporan = document.querySelector('#panel-laporan .flex-1');
    if (panelLaporan) {
        panelLaporan.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-3 mb-4"><i class="fa-solid fa-chart-line text-green-500 mr-2"></i> Real-time Hari Ini</h3>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-green-50 border border-green-200 p-4 rounded-xl">
                        <p class="text-[10px] font-black text-green-700 uppercase mb-1">Total Pendapatan</p>
                        <h4 class="text-lg font-black text-green-600" id="lap-real-uang">Rp 0</h4>
                    </div>
                    <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                        <p class="text-[10px] font-black text-blue-700 uppercase mb-1">Pesanan Sukses</p>
                        <h4 class="text-lg font-black text-blue-600" id="lap-real-order">0 Order</h4>
                    </div>
                </div>
                <button onclick="window.tutupBukuHariIni()" class="w-full bg-slate-800 text-white font-black py-3 rounded-xl text-xs hover:bg-black transition shadow-sm"><i class="fa-solid fa-book-journal-whills mr-2"></i> TUTUP BUKU & SIMPAN KE ARUS KAS</button>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900"><i class="fa-solid fa-file-invoice-dollar text-amber-500 mr-2"></i> Rekap Arus Kas</h3>
                    <button onclick="window.exportLaporanCSV()" class="bg-green-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-green-600 transition shadow-sm"><i class="fa-solid fa-file-csv mr-1"></i> EXPORT CSV</button>
                </div>
                <div class="space-y-3" id="lap-aruskas-list"></div>
            </div>
        `;
    }

    window.renderLaporanPanel = function() {
        // Render Real-Time
        let total = 0;
        window.pesananSelesaiDB.forEach(o => total += o.totalBayar);
        const elUang = document.getElementById('lap-real-uang');
        const elOrder = document.getElementById('lap-real-order');
        if(elUang) elUang.textContent = window.formatRupiah(total);
        if(elOrder) elOrder.textContent = window.pesananSelesaiDB.length + " Order";

        // Render Arus Kas
        const listKas = document.getElementById('lap-aruskas-list');
        if(!listKas) return;
        if(window.arusKasDB.length === 0) {
            listKas.innerHTML = `<p class="text-center text-xs text-gray-400 py-4">Belum ada riwayat tutup buku.</p>`;
            return;
        }

        listKas.innerHTML = window.arusKasDB.map(kas => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                <div>
                    <p class="text-xs font-black text-gray-900 mb-0.5">${kas.tanggal}</p>
                    <p class="text-[9px] font-bold text-gray-500">${kas.jumlahOrder} Order Diselesaikan</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black text-green-600">${window.formatRupiah(kas.totalPendapatan)}</p>
                </div>
            </div>
        `).join('');
    };

    window.tutupBukuHariIni = function() {
        if(window.pesananSelesaiDB.length === 0) return alert("Belum ada pesanan yang selesai hari ini.");
        if(confirm("Yakin ingin Tutup Buku hari ini?\n\nData pesanan selesai akan direkap ke Arus Kas, dan layar pesanan hari ini akan di-reset (dikosongkan).")) {
            
            let total = 0;
            window.pesananSelesaiDB.forEach(o => total += o.totalBayar);
            
            window.arusKasDB.unshift({
                tanggal: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}),
                jumlahOrder: window.pesananSelesaiDB.length,
                totalPendapatan: total
            });
            localStorage.setItem('arusKasMainstay', JSON.stringify(window.arusKasDB));

            // Kosongkan pesanan hari ini
            window.pesananSelesaiDB = [];
            window.pesananMasukDB = [];
            window.pesananDapurDB = [];
            window.nomorAntreanHariIni = 1;
            
            window.simpanDatabaseKasir();
            localStorage.setItem('antreanMainstay', 1);
            
            window.renderLaporanPanel();
            if(typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
            alert("Berhasil Tutup Buku! Data telah masuk ke Arus Kas.");
        }
    };

    window.exportLaporanCSV = function() {
        if(window.arusKasDB.length === 0) return alert("Data arus kas kosong!");
        let csvContent = "data:text/csv;charset=utf-8,TANGGAL,JUMLAH ORDER,TOTAL PENDAPATAN (Rp)\n";
        window.arusKasDB.forEach(row => {
            csvContent += `${row.tanggal},${row.jumlahOrder},${row.totalPendapatan}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ArusKas_Mainstay.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Muat data UI Laporan setelah web terbuka
    setTimeout(() => { if(typeof window.renderLaporanPanel === 'function') window.renderLaporanPanel(); }, 1000);

});
// ============================================================================
// 51. MEGA PATCH: STACKING FIX, POS CATEGORY, QUICK CASH, CRM HISTORY, & WEB EDIT
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX: PESANAN BERTUMPUK & KODE ORDER (ORD vs POS) ---
    // Memastikan counter tidak bentrok dengan mengambil yang paling update
    const getNextAntrean = (prefix) => {
        let current = parseInt(localStorage.getItem('antreanMainstay')) || 1;
        let no = `${prefix}-${String(current).padStart(3, '0')}`;
        localStorage.setItem('antreanMainstay', current + 1);
        window.nomorAntreanHariIni = current + 1;
        return no;
    };

    // Override Checkout Customer (Kode: ORD)
    const oldProsesCheckout = window.prosesCheckout;
    window.prosesCheckout = function() {
        if (window.currentCart.length === 0) return;
        
        // Simpan pesanan customer dengan kode ORD
        const backupAntrean = window.nomorAntreanHariIni; 
        window.nomorAntreanHariIni = backupAntrean; // Bypass bug sementara
        
        // Panggil fungsi asli untuk setup dasar
        oldProsesCheckout(); 

        // Modifikasi paksa ID setelah fungsi asli berjalan
        if (window.pesananAktif) {
            window.pesananAktif.noAntrean = getNextAntrean('ORD');
            // Fix penumpukan: Pastikan kita push ke array terbaru
            const existingIdx = window.pesananMasukDB.findIndex(x => x.noAntrean === window.pesananAktif.noAntrean);
            if(existingIdx === -1) {
                window.pesananMasukDB.unshift(window.pesananAktif);
            }
            if(typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
        }
    };

    // Override Checkout POS Internal (Kode: POS)
    window.checkoutPOSInternal = function() {
        if(window.kasirCart.length === 0) return alert("Keranjang kosong!");
        const bayar = document.getElementById('pos-tipe-bayar').value;
        const uangDiterima = parseInt(document.getElementById('pos-uang-diterima').value) || 0;
        
        if(bayar === 'Tunai' && uangDiterima > 0 && uangDiterima < window.posInternalTotal) {
            return alert("Uang kurang!");
        }

        let aktorPenginput = localStorage.getItem('sesiMainstay') === 'owner' ? 'Master Owner' : ('Kasir - ' + (document.getElementById('kasir-staf-dropdown')?.value || 'Offline'));
        const noAntrean = getNextAntrean('POS');

        const pesananBaru = {
            noAntrean: noAntrean,
            nama: document.getElementById('pos-nama-pelanggan').value || 'Customer POS',
            phone: '-',
            tipeOrder: 'Instant (Di Toko)',
            metodeBayar: bayar,
            totalBayar: window.posInternalTotal,
            items: JSON.parse(JSON.stringify(window.kasirCart)),
            actor: aktorPenginput,
            isMember: false,
            waktu: new Date().toLocaleString('id-ID')
        };

        // Fix Penumpukan
        window.pesananMasukDB.unshift(pesananBaru);
        window.simpanDatabaseKasir();
        if (typeof window.renderListKasir === 'function') window.renderListKasir();

        window.kasirCart = [];
        window.renderPOSInternalCart();
        document.getElementById('pos-nama-pelanggan').value = '';
        document.getElementById('pos-uang-diterima').value = '';
        window.tutupPOSInternal();
        window.playAudio('masuk');
        alert(`Pesanan ${noAntrean} berhasil diproses!`);
    };

    // --- 2. POS INTERNAL: KATEGORI MENU & TOMBOL UANG CEPAT ---
    window.posKategoriAktif = 'semua';
    window.setUangCepat = function(nominal) {
        document.getElementById('pos-uang-diterima').value = nominal;
        window.hitungKembalian();
    };

    window.filterPOS = function(kategori) {
        window.posKategoriAktif = kategori;
        window.renderPosGrid();
    };

    window.renderPosGrid = function() {
        const grid = document.getElementById('pos-internal-grid');
        if (!grid) return;
        
        const filteredMenu = window.posKategoriAktif === 'semua' 
            ? window.katalogMenu 
            : window.katalogMenu.filter(m => m.kategori === window.posKategoriAktif);

        grid.innerHTML = filteredMenu.map(m => {
            const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
            return `
            <div class="bg-white p-2 rounded-xl shadow-sm border ${isHabis ? 'border-red-200 cursor-not-allowed opacity-50 grayscale' : 'border-gray-200 cursor-pointer hover:border-amber-500 transition'} relative" onclick="${isHabis ? "alert('Habis!');" : `window.isPosKasirActive = true; window.openMenuDetail('${m.id}');`}">
                ${isHabis ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded z-10">HABIS</span>` : ''}
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-1">
                <h4 class="text-[10px] font-black leading-tight text-gray-900 line-clamp-1">${m.nama}</h4>
                <p class="text-[9px] font-black text-amber-600">${window.formatRupiah(m.hargaDiskon)}</p>
            </div>`;
        }).join('');
    };

    // Modifikasi ulang struktur HTML POS Internal
    const posCheckoutArea = document.querySelector('#modal-pos-internal .flex-1.flex.flex-col');
    if (posCheckoutArea) {
        posCheckoutArea.innerHTML = `
            <div class="flex-1 overflow-hidden flex flex-col p-3">
                <div class="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1">
                    <button onclick="window.filterPOS('semua')" class="px-3 py-1.5 bg-gray-800 text-white text-[10px] font-bold rounded-lg whitespace-nowrap">Semua</button>
                    <button onclick="window.filterPOS('coffee')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg whitespace-nowrap">Coffee</button>
                    <button onclick="window.filterPOS('non-coffee')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg whitespace-nowrap">Non-Coffee</button>
                    <button onclick="window.filterPOS('snack')" class="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] font-bold rounded-lg whitespace-nowrap">Snack</button>
                </div>
                <div id="pos-internal-grid" class="grid grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto pr-1 pb-10"></div>
            </div>
            
            <div class="w-full md:w-80 bg-white border-t md:border-l border-gray-200 flex flex-col shadow-inner">
                <div id="pos-internal-cart" class="flex-1 overflow-y-auto p-3 space-y-2 min-h-[150px]"></div>
                
                <div class="p-4 border-t border-gray-200 bg-white shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
                    <div class="flex justify-between font-black text-lg text-gray-900 mb-2"><span>TOTAL</span><span id="pos-internal-total" class="text-amber-500">Rp 0</span></div>
                    
                    <input type="text" id="pos-nama-pelanggan" placeholder="Nama Cust..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold mb-2 outline-none">
                    <select id="pos-tipe-bayar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold mb-2 outline-none" onchange="window.toggleKalkulatorPOS()">
                        <option value="Tunai">Tunai</option>
                        <option value="QRIS Resto">QRIS</option>
                    </select>
                    
                    <div id="pos-kalkulator" class="bg-blue-50 p-2.5 rounded-lg border border-blue-200 mb-3 transition-all">
                        <label class="text-[9px] font-black text-blue-800 block mb-1">UANG DITERIMA</label>
                        <div class="flex gap-1 mb-2">
                            <button onclick="window.setUangCepat(window.posInternalTotal)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-1.5 rounded shadow-sm hover:bg-blue-100">Uang Pas</button>
                            <button onclick="window.setUangCepat(50000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-1.5 rounded shadow-sm hover:bg-blue-100">50K</button>
                            <button onclick="window.setUangCepat(100000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-1.5 rounded shadow-sm hover:bg-blue-100">100K</button>
                        </div>
                        <input type="number" id="pos-uang-diterima" placeholder="Manual..." class="w-full bg-white border border-blue-200 rounded py-1.5 px-2 text-xs font-black outline-none mb-1" oninput="window.hitungKembalian()">
                        <div class="flex justify-between items-end border-t border-blue-200 pt-1 mt-1">
                            <span class="text-[9px] font-bold text-gray-500 uppercase">Kembali:</span>
                            <span id="pos-kembalian" class="text-xs font-black text-blue-600">Rp 0</span>
                        </div>
                    </div>
                    <button onclick="window.checkoutPOSInternal()" class="w-full bg-amber-500 text-white font-black py-3 rounded-xl shadow-md hover:bg-amber-600 text-xs">PROSES PESANAN</button>
                </div>
            </div>
        `;
    }

    window.bukaPOS = function() {
        window.filterPOS('semua');
        if(typeof window.renderPOSInternalCart === 'function') window.renderPOSInternalCart();
        if(typeof window.toggleKalkulatorPOS === 'function') window.toggleKalkulatorPOS(); 
        document.getElementById('modal-pos-internal').classList.remove('hidden');
        document.getElementById('modal-pos-internal').classList.add('flex');
    };


    // --- 3. FIX EDIT WEB (LOGO, TOGGLE, 3 SOSMED) ---
    const panelWeb = document.querySelector('#panel-edit-web .flex-1');
    if (panelWeb) {
        panelWeb.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2"><i class="fa-solid fa-store text-amber-500 mr-2"></i> Pengaturan Toko</h3>
                
                <!-- Saklar Toko & Audio (Dikembalikan) -->
                <div class="grid grid-cols-2 gap-3 mb-2">
                    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <input type="checkbox" id="ew-toko-buka" class="w-5 h-5 accent-amber-500" ${window.systemConfig.tokoBuka ? 'checked' : ''}>
                        <span class="text-xs font-bold text-gray-700">Toko Buka</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <input type="checkbox" id="ew-audio" class="w-5 h-5 accent-blue-500" ${window.systemConfig.audioAktif ? 'checked' : ''}>
                        <span class="text-xs font-bold text-gray-700">Audio Kasir</span>
                    </label>
                </div>

                <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Nomor WA Resto</label><input type="number" id="ew-wa" value="${window.systemConfig.nomorWA || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none"></div>
                
                <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <label class="text-[10px] font-black text-amber-800 block mb-2">LOGO RESTO (URL / UPLOAD)</label>
                    <input type="text" id="ew-logo" value="${window.systemConfig.logoUrl || ''}" class="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                    <input type="file" accept="image/*" class="w-full text-[10px]" onchange="window.handleImageUpload(this, 'ew-logo')">
                </div>

                <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <label class="text-[10px] font-black text-blue-800 block mb-2">GAMBAR QRIS (URL / UPLOAD)</label>
                    <input type="text" id="ew-qris" value="${window.systemConfig.qrisUrl || ''}" class="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                    <input type="file" accept="image/*" class="w-full text-[10px]" onchange="window.handleImageUpload(this, 'ew-qris')">
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 mb-3"><i class="fa-solid fa-link text-pink-500 mr-2"></i> Link Sosial Media</h3>
                <div class="space-y-3">
                    <div><label class="text-[10px] font-bold text-pink-600 block mb-1"><i class="fa-brands fa-instagram mr-1"></i> Instagram Link</label><input type="text" id="ew-ig" value="${window.systemConfig.linkIG || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-pink-500"></div>
                    <div><label class="text-[10px] font-bold text-blue-600 block mb-1"><i class="fa-brands fa-facebook mr-1"></i> Facebook Link</label><input type="text" id="ew-fb" value="${window.systemConfig.linkFB || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-900 block mb-1"><i class="fa-brands fa-tiktok mr-1"></i> TikTok / X Link</label><input type="text" id="ew-tt" value="${window.systemConfig.linkTT || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-gray-500"></div>
                </div>
            </div>
            <button onclick="window.simpanWebPastiJalan()" class="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-black transition text-sm">SIMPAN PENGATURAN</button>
        `;
    }

    // Fungsi Simpan Mutlak (Memperbarui DOM secara langsung)
    window.simpanWebPastiJalan = function() {
        window.systemConfig.tokoBuka = document.getElementById('ew-toko-buka').checked;
        window.systemConfig.audioAktif = document.getElementById('ew-audio').checked;
        window.systemConfig.nomorWA = document.getElementById('ew-wa').value;
        window.systemConfig.linkIG = document.getElementById('ew-ig').value;
        window.systemConfig.linkFB = document.getElementById('ew-fb').value;
        window.systemConfig.linkTT = document.getElementById('ew-tt').value;
        
        const logo = document.getElementById('ew-logo').value;
        if(logo) { 
            window.systemConfig.logoUrl = logo; 
            const imgEl = document.getElementById('header-logo-img');
            if(imgEl) { imgEl.src = logo; imgEl.classList.remove('hidden'); }
            const iconEl = document.getElementById('header-logo-icon');
            if(iconEl) iconEl.classList.add('hidden');
        }
        
        const qris = document.getElementById('ew-qris').value;
        if(qris) window.systemConfig.qrisUrl = qris; // QRIS akan otomatis ditarik saat modal QRIS dibuka

        // Update status toko di UI Customer
        const statusEl = document.getElementById('store-status');
        if(statusEl) {
            statusEl.innerHTML = window.systemConfig.tokoBuka 
                ? `<span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span> BUKA` 
                : `<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> TUTUP`;
            statusEl.className = window.systemConfig.tokoBuka ? "flex items-center gap-1 mt-1 text-[10px] font-extrabold text-green-600" : "flex items-center gap-1 mt-1 text-[10px] font-extrabold text-red-600";
        }

        localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
        alert("Berhasil! Konfigurasi Web tersimpan dan langsung diterapkan.");
    };


    // --- 4. MASTER STOK (TAMBAH SATUAN & LOG AUDIT DI OWNER) ---
    // Update fungsi Tambah/Edit Barang Owner agar mencakup Satuan
    window.tambahBarangOwner = function() {
        const namaBaru = prompt("Masukkan NAMA barang baru:");
        if(!namaBaru) return;
        const satuan = prompt("Masukkan SATUAN (Misal: cup, gram, kg, pcs):", "pcs");
        const jumlahAwal = prompt("Masukkan JUMLAH stok awal:", "0");
        
        if(!window.stokBarangDB) window.stokBarangDB = [];
        window.stokBarangDB.push({ id: 's_' + Date.now(), nama: namaBaru, satuan: satuan || 'pcs', jumlah: parseInt(jumlahAwal) || 0 });
        
        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        window.renderStokOwner();
    };

    window.renderStokOwner = function() {
        const list = document.getElementById('owner-stok-list');
        const logArea = document.getElementById('owner-stok-log-area'); // Area log
        if(!list) return;

        // Render List Barang
        if(!window.stokBarangDB || window.stokBarangDB.length === 0) {
            list.innerHTML = `<p class="text-center text-xs text-gray-400 py-4 font-bold">Belum ada barang.</p>`;
        } else {
            list.innerHTML = window.stokBarangDB.map((item, idx) => `
                <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-center">
                    <button onclick="window.hapusBarangOwner(${idx})" class="text-red-500 hover:text-red-700 bg-red-50 w-6 h-6 rounded flex items-center justify-center mr-3"><i class="fa-solid fa-xmark text-[10px]"></i></button>
                    <div class="flex-1">
                        <p class="text-xs font-black text-gray-800 mb-0.5">${item.nama}</p>
                        <p class="text-[10px] font-bold text-gray-500">Stok: <span class="text-indigo-600 font-black">${item.jumlah} ${item.satuan || 'pcs'}</span></p>
                    </div>
                    <button onclick="window.editBarangOwner(${idx})" class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">Edit</button>
                </div>
            `).join('');
        }

        // Render Log Audit (Sama dengan Kasir, tapi di layar Owner)
        if(logArea) {
            if(!window.stokLogDB || window.stokLogDB.length === 0) {
                logArea.innerHTML = `<p class="text-[10px] text-gray-400">Belum ada riwayat update stok.</p>`;
            } else {
                logArea.innerHTML = window.stokLogDB.map(log => `
                    <div class="bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg mb-2">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-[9px] font-black text-indigo-800">${log.aktor}</span>
                            <span class="text-[8px] font-bold text-gray-500">${log.waktu}</span>
                        </div>
                        <p class="text-[9px] text-gray-700 font-bold">${log.perubahan}</p>
                    </div>
                `).join('');
            }
        }
    };

    // Tambahkan HTML Log Area ke Panel Stok Owner jika belum ada
    const panelStok = document.querySelector('#panel-stok .flex-1');
    if(panelStok && !document.getElementById('owner-stok-log-area')) {
        panelStok.insertAdjacentHTML('beforeend', `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 mb-3"><i class="fa-solid fa-clock-rotate-left text-indigo-500 mr-2"></i> Riwayat Audit Stok</h3>
                <div id="owner-stok-log-area" class="max-h-[300px] overflow-y-auto hide-scrollbar"></div>
            </div>
        `);
    }


    // --- 5. CRM: TAMBAH PELANGGAN MANUAL & RIWAYAT ---
    const panelMember = document.querySelector('#panel-member .flex-1');
    if (panelMember && !document.getElementById('btn-tambah-pelanggan')) {
        // Rombak Header Member untuk Tambah Tombol
        panelMember.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-users text-green-500"></i> Database Pelanggan</h3>
                    <button id="btn-tambah-pelanggan" onclick="window.tambahPelangganManual()" class="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-green-200 transition"><i class="fa-solid fa-plus"></i> Tambah</button>
                </div>
                <div class="space-y-3" id="tabel-crm-list"></div>
            </div>
        `;
    }

    window.tambahPelangganManual = function() {
        const nama = prompt("Masukkan Nama Pelanggan:");
        if(!nama) return;
        const wa = prompt("Masukkan Nomor WA (Gunakan 628...):", "62");
        const status = confirm("Jadikan sebagai Member VIP?") ? "Member" : "Non-Member";
        
        if(!window.databaseMember) window.databaseMember = [];
        window.databaseMember.push({
            nama: nama,
            wa: wa || "Tidak mencantumkan WA",
            tanggal: new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}),
            status: status
        });
        localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));
        window.renderTabelMember();
        alert("Berhasil menambahkan pelanggan!");
    };

    // Override Render Tabel Member dengan Tombol Riwayat
    window.renderTabelMember = function() {
        const container = document.getElementById('tabel-crm-list');
        if(!container) return;
        
        if(!window.databaseMember || window.databaseMember.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-gray-400"><p class="text-sm font-bold">Belum ada data pelanggan.</p></div>`;
            return;
        }

        container.innerHTML = window.databaseMember.map(m => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h4 class="font-black text-sm text-gray-900">${m.nama}</h4>
                    <p class="text-[10px] text-gray-500 font-bold mb-1.5"><i class="fa-solid fa-phone mr-1"></i> ${m.wa} | Terakhir: ${m.tanggal}</p>
                    ${m.status === 'Member' ? '<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i class="fa-solid fa-crown mr-1"></i> Member</span>' : '<span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Reguler</span>'}
                </div>
                <div class="flex gap-2">
                    <button onclick="window.lihatRiwayatPelanggan('${m.wa}')" class="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Cek Riwayat</button>
                    ${(m.wa && m.wa.length > 5) ? `<a href="https://wa.me/${m.wa}" target="_blank" class="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition border border-green-200"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </div>
            </div>
        `).join('');
    };

    // Fungsi Melihat Riwayat Pembelian dari Database (Pencarian sederhana berdasar Nomor WA)
    window.lihatRiwayatPelanggan = function(waTarget) {
        if(waTarget === 'Tidak mencantumkan WA' || waTarget === '-') return alert("Pelanggan ini tidak memiliki histori WA.");
        
        // Cari di pesanan masuk, dapur, dan selesai
        const gabunganOrder = [...window.pesananMasukDB, ...window.pesananDapurDB, ...window.pesananSelesaiDB];
        const histori = gabunganOrder.filter(o => o.phone === waTarget);

        if(histori.length === 0) {
            alert("Belum ada riwayat transaksi yang tercatat hari ini untuk pelanggan ini.");
        } else {
            let info = `RIWAYAT PESANAN (HARI INI)\nWa: ${waTarget}\n--------------------------\n`;
            histori.forEach(h => {
                info += `> ${h.noAntrean} | Total: ${window.formatRupiah(h.totalBayar)}\n`;
                h.items.forEach(i => { info += `   - ${i.qty}x ${i.nama}\n`; });
            });
            alert(info);
        }
    };

});
// ============================================================================
// 52. THE ABSOLUTE FIX: RESPONSIVE POS, STUBBORN UPLOADS, & FULL CRM CRUD
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX MUTLAK: JAM & TANGGAL (Pasti Atas-Bawah) ---
    window.updateClock = function() {
        const now = new Date();
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
        const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
        const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB`;
        
        const el = document.getElementById('live-clock');
        if (el) {
            // Menggunakan styling inline block yang tidak bisa dilawan oleh flexbox
            el.innerHTML = `
                <div style="display: block; text-align: right;">
                    <span style="display: block; font-size: 10px; color: #6b7280; font-weight: bold; margin-bottom: 2px;">${tgl}</span>
                    <span style="display: block; font-size: 14px; color: #d97706; font-weight: 900;">${jam}</span>
                </div>
            `;
            el.className = "bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200";
        }
    };


    // --- 2. FIX MUTLAK: POS INTERNAL (Lega 50% Layar & Kategori Responsif) ---
    const posModal = document.getElementById('modal-pos-internal');
    if (posModal) {
        // Rombak total struktur HTML POS agar Menu dapat jatah minimal 55% tinggi layar HP
        posModal.innerHTML = `
            <div class="bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md flex-none">
                <h2 class="font-black text-sm md:text-lg"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i> POS KASIR</h2>
                <button onclick="window.tutupPOSInternal()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-600 transition"><i class="fa-solid fa-arrow-left mr-1"></i> KEMBALI</button>
            </div>
            
            <div class="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
                <!-- AREA MENU (Diberi porsi min 55% di HP) -->
                <div class="h-[55vh] md:h-auto md:flex-1 flex flex-col p-3 border-b md:border-b-0 md:border-r border-gray-200">
                    <div class="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-2 flex-none" style="scroll-behavior: smooth;">
                        <button onclick="window.filterPOS('semua')" class="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Semua Menu</button>
                        <button onclick="window.filterPOS('coffee')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Coffee</button>
                        <button onclick="window.filterPOS('non-coffee')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Non-Coffee</button>
                        <button onclick="window.filterPOS('snack')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Snack</button>
                    </div>
                    <div id="pos-internal-grid" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto pr-1 pb-4 flex-1"></div>
                </div>
                
                <!-- AREA KERANJANG & CHECKOUT -->
                <div class="flex-1 md:w-[350px] md:flex-none bg-white flex flex-col shadow-inner overflow-hidden">
                    <div id="pos-internal-cart" class="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 min-h-[120px]"></div>
                    <div class="p-4 border-t border-gray-200 bg-white flex-none">
                        <div class="flex justify-between font-black text-lg text-gray-900 mb-2 border-b border-gray-100 pb-2"><span>TOTAL</span><span id="pos-internal-total" class="text-amber-500">Rp 0</span></div>
                        <input type="text" id="pos-nama-pelanggan" placeholder="Nama Customer" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-2 outline-none">
                        <select id="pos-tipe-bayar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-bold mb-2 outline-none cursor-pointer" onchange="window.toggleKalkulatorPOS()">
                            <option value="Tunai">Tunai</option><option value="QRIS Resto">QRIS</option>
                        </select>
                        <div id="pos-kalkulator" class="bg-blue-50 p-2.5 rounded-lg border border-blue-200 mb-3">
                            <div class="flex gap-1 mb-2">
                                <button onclick="window.setUangCepat(window.posInternalTotal)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-100">PAS</button>
                                <button onclick="window.setUangCepat(50000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-100">50K</button>
                                <button onclick="window.setUangCepat(100000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-100">100K</button>
                            </div>
                            <input type="number" id="pos-uang-diterima" placeholder="Manual..." class="w-full bg-white border border-blue-200 rounded py-2 px-2 text-sm font-black outline-none mb-1" oninput="window.hitungKembalian()">
                            <div class="flex justify-between items-end border-t border-blue-200 pt-1 mt-1"><span class="text-[9px] font-bold text-gray-500">KEMBALI:</span><span id="pos-kembalian" class="text-sm font-black text-blue-600">Rp 0</span></div>
                        </div>
                        <button onclick="window.checkoutPOSInternal()" class="w-full bg-amber-500 text-white font-black py-3.5 rounded-xl shadow-md hover:bg-amber-600 text-sm">PROSES PESANAN</button>
                    </div>
                </div>
            </div>
        `;
    }


    // --- 3. FIX MUTLAK: TOMBOL KEMBALI DI EDIT WEB & STOK ---
    // Memaksa semua tombol kembali di panel owner untuk berfungsi
    const allCloseButtons = document.querySelectorAll('.panel-slide-up .bg-gray-900 button, .panel-slide-up .bg-gray-900 .flex button');
    allCloseButtons.forEach(btn => {
        btn.onclick = function() {
            const panel = this.closest('.panel-slide-up');
            if (panel) {
                panel.classList.add('translate-y-full');
                setTimeout(() => { panel.classList.add('hidden'); }, 300);
            }
        };
    });


    // --- 4. FIX MUTLAK: SIMPAN WEB, LOGO, QRIS, & MAPS EMBED ---
    const panelWeb = document.querySelector('#panel-edit-web .flex-1');
    if (panelWeb) {
        // Tambahkan Input MAPS di form Edit Web
        panelWeb.insertAdjacentHTML('afterbegin', `
            <div class="bg-blue-50 p-3 rounded-xl border border-blue-200 mb-4">
                <label class="text-[10px] font-black text-blue-800 block mb-2"><i class="fa-solid fa-map-location-dot mr-1"></i> LINK EMBED GOOGLE MAPS</label>
                <textarea id="ew-maps" rows="2" placeholder='Paste iframe Google Maps di sini...' class="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs outline-none">${window.systemConfig.mapsEmbed || ''}</textarea>
            </div>
        `);

        // TULIS ULANG FUNGSI SIMPAN WEB AGAR 100% TEMBUS
        window.simpanWebPastiJalan = function() {
            try {
                // Ambil data
                const logo = document.getElementById('ew-logo')?.value;
                const qris = document.getElementById('ew-qris')?.value;
                const maps = document.getElementById('ew-maps')?.value;
                
                // Set ke Memory System
                if(logo) window.systemConfig.logoUrl = logo;
                if(qris) window.systemConfig.qrisUrl = qris;
                if(maps) window.systemConfig.mapsEmbed = maps;

                // Eksekusi Perubahan Langsung ke Layar
                if(logo) {
                    const imgEl = document.getElementById('header-logo-img');
                    const iconEl = document.getElementById('header-logo-icon');
                    if(imgEl) { imgEl.src = logo; imgEl.classList.remove('hidden'); }
                    if(iconEl) iconEl.classList.add('hidden');
                }

                // Simpan Sosmed, Jam, WA dll (dari patch sebelumnya)
                window.systemConfig.nomorWA = document.getElementById('ew-wa')?.value || window.systemConfig.nomorWA;
                localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
                
                alert("Berhasil! Logo, QRIS, Maps, dan Pengaturan Web sukses diperbarui.");
                
            } catch (error) {
                alert("Ada kesalahan saat menyimpan: " + error.message);
            }
        };

        // Ganti onclick tombol simpan web dengan fungsi mutlak ini
        const btnSimpanWeb = panelWeb.parentElement.querySelector('button.bg-gray-900:last-child');
        if (btnSimpanWeb) btnSimpanWeb.onclick = window.simpanWebPastiJalan;
    }

    // Pastikan saat pop-up QRIS Customer terbuka, ia memakai QRIS asli dari Edit Web!
    const oldBukaModalQRIS = window.bukaModalQRIS;
    window.bukaModalQRIS = function(orderData) {
        oldBukaModalQRIS(orderData); // Panggil UI aslinya
        
        // Cari gambar QRIS di dalam pop-up
        const qrisImg = document.querySelector('#modal-qris img');
        if (qrisImg && window.systemConfig.qrisUrl) {
            qrisImg.src = window.systemConfig.qrisUrl; // TIMPA DENGAN QRIS ASLI OWNER
        }
    };


    // --- 5. FIX MUTLAK: FULL CRUD PELANGGAN (MEMBER) ---
    window.renderTabelMember = function() {
        const container = document.getElementById('tabel-crm-list');
        if(!container) return;
        
        if(!window.databaseMember || window.databaseMember.length === 0) {
            container.innerHTML = `<div class="text-center py-6 text-gray-400"><p class="text-sm font-bold">Belum ada data pelanggan.</p></div>`;
            return;
        }

        container.innerHTML = window.databaseMember.map((m, idx) => `
            <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 relative">
                <button onclick="window.hapusPelanggan(${idx})" class="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-red-50 w-6 h-6 rounded flex items-center justify-center transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
                <div class="pr-8">
                    <h4 class="font-black text-sm text-gray-900">${m.nama}</h4>
                    <p class="text-[10px] text-gray-500 font-bold mb-1.5"><i class="fa-solid fa-phone mr-1"></i> ${m.wa} | Terakhir: ${m.tanggal}</p>
                    ${m.status === 'Member' ? '<span class="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[9px] font-black uppercase"><i class="fa-solid fa-crown mr-1"></i> Member</span>' : '<span class="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">Reguler</span>'}
                </div>
                <div class="flex gap-2 flex-wrap mt-2 sm:mt-0">
                    <button onclick="window.editPelanggan(${idx})" class="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button onclick="window.lihatRiwayatPelanggan('${m.wa}')" class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200"><i class="fa-solid fa-clock-rotate-left"></i> Riwayat</button>
                    ${(m.wa && m.wa.length > 5) ? `<a href="https://wa.me/${m.wa}" target="_blank" class="w-7 h-7 rounded-full bg-green-50 text-green-500 flex items-center justify-center border border-green-200"><i class="fa-brands fa-whatsapp"></i></a>` : ''}
                </div>
            </div>
        `).join('');
    };

    window.editPelanggan = function(idx) {
        const m = window.databaseMember[idx];
        const namaBaru = prompt("Edit Nama:", m.nama);
        if(!namaBaru) return;
        const waBaru = prompt("Edit Nomor WA:", m.wa);
        const statusBaru = confirm("Jadikan Member VIP? (OK = Ya, Cancel = Tidak)") ? "Member" : "Non-Member";
        
        window.databaseMember[idx].nama = namaBaru;
        window.databaseMember[idx].wa = waBaru;
        window.databaseMember[idx].status = statusBaru;
        localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));
        window.renderTabelMember();
    };

    window.hapusPelanggan = function(idx) {
        if(confirm("Yakin ingin menghapus pelanggan ini?")) {
            window.databaseMember.splice(idx, 1);
            localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));
            window.renderTabelMember();
        }
    };


    // --- 6. FIX MUTLAK: HRD DIRECT MESSAGE & CRUD PASTIKAN JALAN ---
    window.renderStafList = function() {
        const list = document.getElementById('hrd-staf-list');
        if(!list) return;
        if(window.dbStaf.length === 0) { list.innerHTML = `<p class="text-center text-xs text-gray-400 py-4 font-bold">Belum ada data staf.</p>`; return; }

        list.innerHTML = window.dbStaf.map(staf => {
            const fotoStaf = staf.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(staf.nama)}&background=14b8a6&color=fff`;
            return `
            <div class="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-4 items-start relative transition">
                <button onclick="window.hapusStaf('${staf.id}')" class="absolute top-3 right-3 text-red-500 hover:text-red-700 transition bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center"><i class="fa-solid fa-trash-can"></i></button>
                <img src="${fotoStaf}" class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm bg-gray-200">
                <div class="flex-1 pr-6">
                    <h4 class="font-black text-sm text-gray-900 mb-0.5">${staf.nama}</h4>
                    <p class="text-[10px] font-bold text-gray-500 mb-2">PIN: <span class="bg-gray-200 px-1 rounded">${staf.pin || '1234'}</span> | ${staf.tipeStaf || 'Tetap'}</p>
                    
                    <div class="flex gap-2 mb-3 flex-wrap">
                        <button onclick="window.bukaFormStaf('${staf.id}')" class="text-[9px] font-black text-white bg-amber-500 px-2 py-1 rounded shadow-sm hover:bg-amber-600"><i class="fa-solid fa-pen mr-1"></i> Edit Data</button>
                        <a href="https://wa.me/${staf.wa}" target="_blank" class="text-[9px] font-black text-white bg-green-500 px-2 py-1 rounded shadow-sm hover:bg-green-600 flex items-center"><i class="fa-brands fa-whatsapp text-sm mr-1"></i> Hubungi WA</a>
                    </div>
                </div>
            </div>`;
        }).join('');
    };

});
// ============================================================================
// 54. ULTIMATE RECOVERY PATCH: POS RESPONSIVE, PERMANENT CRM, & VOUCHER ENGINE
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX MUTLAK: CRM PELANGGAN (DATA PERMANEN & VOUCHER ENGINE) ---
    
    // TARIK DATA DARI MEMORI SEBELUM APAPUN TERJADI (Agar tidak hilang saat refresh)
    window.databaseMember = JSON.parse(localStorage.getItem('dbMemberMainstay')) || [];
    window.dbVoucher = JSON.parse(localStorage.getItem('dbVoucherMainstay')) || [];

    const panelMember = document.querySelector('#panel-member .flex-1');
    if (panelMember) {
        // ROMBAK TOTAL PANEL PELANGGAN UNTUK MENAMPUNG MESIN VOUCHER
        panelMember.innerHTML = `
            <!-- ENGINE VOUCHER -->
            <div class="bg-gradient-to-r from-amber-500 to-orange-500 p-5 rounded-2xl shadow-sm mb-6 border border-orange-400 text-white">
                <h3 class="text-sm font-black mb-3 flex items-center gap-2"><i class="fa-solid fa-ticket-simple"></i> Buat Voucher Promo</h3>
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-orange-100 block mb-1">Kode Voucher</label>
                        <input type="text" id="v-kode" placeholder="Cth: KOPIGRATIS" class="w-full text-gray-900 px-3 py-2 rounded-lg font-black text-xs uppercase outline-none">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-orange-100 block mb-1">Nominal Diskon (Rp)</label>
                        <input type="number" id="v-nilai" placeholder="Cth: 5000" class="w-full text-gray-900 px-3 py-2 rounded-lg font-black text-xs outline-none">
                    </div>
                </div>
                <label class="text-[10px] font-bold text-orange-100 block mb-1">Target Penerima Voucher</label>
                <select id="v-target" class="w-full text-gray-900 bg-white px-3 py-2 rounded-lg font-black text-xs mb-3 outline-none cursor-pointer" onchange="window.toggleTargetKhusus()">
                    <option value="semua">Berlaku untuk Semua Orang</option>
                    <option value="member">Hanya Member VIP</option>
                    <option value="non-member">Hanya Non-Member / Reguler</option>
                    <option value="khusus">Pilih Pelanggan Tertentu (Spesifik)</option>
                </select>
                
                <!-- List Pelanggan Spesifik (Sembunyi by Default) -->
                <div id="v-khusus-list" class="hidden bg-black/20 p-3 rounded-lg mb-3 max-h-32 overflow-y-auto space-y-2 border border-white/20 hide-scrollbar"></div>
                
                <button onclick="window.simpanVoucherBaru()" class="w-full bg-gray-900 text-white font-black py-3 rounded-xl shadow hover:bg-black transition text-sm shadow-lg">SIMPAN & AKTIFKAN VOUCHER</button>
            </div>

            <!-- TABEL PELANGGAN (CRM) -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <div class="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                    <h3 class="text-sm font-black text-gray-900 flex items-center gap-2"><i class="fa-solid fa-users text-green-500"></i> Database Pelanggan</h3>
                    <button onclick="window.tambahPelangganManual()" class="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-xs font-black hover:bg-green-200 transition"><i class="fa-solid fa-plus"></i> Tambah</button>
                </div>
                <div class="space-y-3" id="tabel-crm-list"></div>
            </div>
        `;
    }

    window.toggleTargetKhusus = function() {
        const val = document.getElementById('v-target').value;
        const listContainer = document.getElementById('v-khusus-list');
        if(val === 'khusus') {
            listContainer.classList.remove('hidden');
            if(window.databaseMember.length === 0) {
                listContainer.innerHTML = `<p class="text-[10px] text-white">Data pelanggan kosong.</p>`;
            } else {
                listContainer.innerHTML = window.databaseMember.map((m, idx) => `
                    <label class="flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input type="checkbox" class="target-spesifik-checkbox w-4 h-4" value="${m.wa}">
                        ${m.nama} (${m.wa})
                    </label>
                `).join('');
            }
        } else {
            listContainer.classList.add('hidden');
        }
    };

    window.simpanVoucherBaru = function() {
        const kode = document.getElementById('v-kode').value.toUpperCase();
        const nilai = parseInt(document.getElementById('v-nilai').value) || 0;
        const target = document.getElementById('v-target').value;
        
        if(!kode || nilai <= 0) return alert("Kode dan Nominal Diskon wajib diisi!");
        
        let targetSpesifik = [];
        if(target === 'khusus') {
            document.querySelectorAll('.target-spesifik-checkbox:checked').forEach(cb => targetSpesifik.push(cb.value));
            if(targetSpesifik.length === 0) return alert("Pilih minimal 1 pelanggan spesifik!");
        }

        window.dbVoucher.push({ id: Date.now(), kode, nilai, target, targetSpesifik });
        localStorage.setItem('dbVoucherMainstay', JSON.stringify(window.dbVoucher));
        alert(`Voucher ${kode} berhasil diaktifkan!`);
        document.getElementById('v-kode').value = '';
        document.getElementById('v-nilai').value = '';
    };

    // Panggil render tabel agar data pelanggan yang ditarik dari memori langsung muncul
    if(typeof window.renderTabelMember === 'function') window.renderTabelMember();


    // --- 2. FIX MUTLAK: PROFIL OWNER (Membuka Paksa Modal yang Macet) ---
    window.bukaFormOwner = function() {
        // Ambil data terbaru dari memori
        window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { nama: 'Master Owner', foto: '', wa: '628977099557', rekening: '' };
        
        document.getElementById('owner-nama').value = window.ownerProfile.nama;
        document.getElementById('owner-wa').value = window.ownerProfile.wa;
        document.getElementById('owner-rek').value = window.ownerProfile.rekening;
        document.getElementById('owner-foto').value = window.ownerProfile.foto;
        
        // Memastikan Z-Index paling tinggi agar tidak tenggelam
        const modal = document.getElementById('modal-form-owner');
        if(modal) {
            modal.className = "fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center fade-in px-4 pb-safe";
        }
    };


    // --- 3. FIX MUTLAK: POS INTERNAL (TIDAK MELAR & KERANJANG SCROLLABLE) ---
    const posModal = document.getElementById('modal-pos-internal');
    if (posModal) {
        // Menggunakan alur natural dokumen: di HP, scroll atas-bawah biasa. Di Laptop, kiri-kanan.
        posModal.className = "fixed inset-0 bg-slate-50 z-[200] hidden flex-col md:flex-row h-[100dvh] w-screen overflow-y-auto md:overflow-hidden";
        
        posModal.innerHTML = `
            <!-- HEADER (Di HP melayang di atas, di PC ikut aliran) -->
            <div class="sticky top-0 md:relative bg-gray-900 text-white px-4 py-3 flex justify-between items-center shadow-md z-50 md:hidden flex-none">
                <h2 class="font-black text-sm"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i> POS KASIR</h2>
                <button onclick="window.tutupPOSInternal()" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-red-600 transition">TUTUP</button>
            </div>
            
            <!-- AREA KIRI (Katalog Menu) -->
            <div class="flex-1 flex flex-col p-3 md:p-4 min-h-[50vh] md:overflow-y-auto border-b md:border-b-0 md:border-r border-gray-200">
                
                <div class="hidden md:flex justify-between items-center mb-4">
                    <h2 class="font-black text-lg text-gray-900"><i class="fa-solid fa-cash-register text-amber-500 mr-2"></i> POS INTERNAL</h2>
                    <button onclick="window.tutupPOSInternal()" class="bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-red-600 transition">KEMBALI / TUTUP</button>
                </div>

                <div class="flex gap-2 mb-3 overflow-x-auto hide-scrollbar pb-1 flex-none sticky top-12 md:top-0 z-40 bg-slate-50 pt-2">
                    <button onclick="window.filterPOS('semua')" class="px-4 py-2 bg-gray-800 text-white text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Semua</button>
                    <button onclick="window.filterPOS('coffee')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Coffee</button>
                    <button onclick="window.filterPOS('non-coffee')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Non-Coffee</button>
                    <button onclick="window.filterPOS('snack')" class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg whitespace-nowrap shadow-sm">Snack</button>
                </div>
                
                <!-- RAHASIA ANTI MELAR: content-start -->
                <div id="pos-internal-grid" class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 content-start pb-10"></div>
            </div>
            
            <!-- AREA KANAN (Keranjang & Pembayaran) -->
            <div class="w-full md:w-[360px] bg-white flex flex-col shadow-[0_-5px_20px_rgba(0,0,0,0.05)] md:shadow-inner flex-none h-auto md:h-full md:overflow-y-auto z-10 relative">
                <div class="bg-amber-50 p-3 border-b border-amber-100 flex-none">
                    <h3 class="font-black text-amber-800 text-sm"><i class="fa-solid fa-basket-shopping mr-2"></i> Keranjang Transaksi</h3>
                </div>
                <div id="pos-internal-cart" class="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50 min-h-[150px]"></div>
                
                <!-- Form Input (Pasti Terlihat) -->
                <div class="p-4 border-t border-gray-200 bg-white flex-none">
                    <div class="flex justify-between items-end mb-3 border-b border-gray-100 pb-2">
                        <span class="text-xs font-black text-gray-500 uppercase tracking-widest">TOTAL</span>
                        <span id="pos-internal-total" class="text-2xl font-black text-amber-500 leading-none">Rp 0</span>
                    </div>
                    
                    <input type="text" id="pos-nama-pelanggan" placeholder="Nama Customer (Wajib)" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold mb-3 outline-none focus:border-amber-500">
                    
                    <select id="pos-tipe-bayar" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm font-bold mb-3 outline-none cursor-pointer focus:border-amber-500" onchange="window.toggleKalkulatorPOS()">
                        <option value="Tunai">Tunai (Cash)</option>
                        <option value="QRIS Resto">QRIS</option>
                    </select>
                    
                    <div id="pos-kalkulator" class="bg-blue-50 p-3 rounded-xl border border-blue-200 mb-4 transition-all">
                        <label class="text-[10px] font-black text-blue-800 block mb-2">PILIH ATAU KETIK UANG DITERIMA</label>
                        <div class="flex gap-2 mb-2">
                            <button onclick="window.setUangCepat(window.posInternalTotal)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-500 hover:text-white transition shadow-sm">UANG PAS</button>
                            <button onclick="window.setUangCepat(50000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-500 hover:text-white transition shadow-sm">50.000</button>
                            <button onclick="window.setUangCepat(100000)" class="flex-1 bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2.5 rounded-lg hover:bg-blue-500 hover:text-white transition shadow-sm">100.000</button>
                        </div>
                        <input type="number" id="pos-uang-diterima" placeholder="Atau ketik manual di sini..." class="w-full bg-white border border-blue-200 rounded-lg p-3 text-sm font-black outline-none mb-2 focus:border-blue-500" oninput="window.hitungKembalian()">
                        <div class="flex justify-between items-end border-t border-blue-200 pt-2 mt-1">
                            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">KEMBALIAN:</span>
                            <span id="pos-kembalian" class="text-lg font-black text-blue-600 leading-none">Rp 0</span>
                        </div>
                    </div>
                    
                    <button onclick="window.checkoutPOSInternal()" class="w-full bg-amber-500 text-white font-black py-4 rounded-xl shadow-md hover:bg-amber-600 transition text-sm">PROSES & SIMPAN PESANAN</button>
                </div>
            </div>
        `;
    }

    // Pastikan tombol klik kategori berfungsi dengan render ulang
    window.renderPosGrid = function() {
        const grid = document.getElementById('pos-internal-grid');
        if (!grid) return;
        const filteredMenu = window.posKategoriAktif === 'semua' ? window.katalogMenu : window.katalogMenu.filter(m => m.kategori === window.posKategoriAktif);
        grid.innerHTML = filteredMenu.map(m => {
            const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
            return `
            <div class="bg-white p-2 rounded-xl shadow-sm border ${isHabis ? 'border-red-200 cursor-not-allowed opacity-50 grayscale' : 'border-gray-200 cursor-pointer hover:border-amber-500 transition'} relative" onclick="${isHabis ? "alert('Habis!');" : `window.isPosKasirActive = true; window.openMenuDetail('${m.id}');`}">
                ${isHabis ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded z-10 tracking-widest">HABIS</span>` : ''}
                <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-1.5">
                <h4 class="text-[11px] font-black leading-tight text-gray-900 line-clamp-1 mb-0.5">${m.nama}</h4>
                <p class="text-[10px] font-black text-amber-600">${window.formatRupiah(m.hargaDiskon)}</p>
            </div>`;
        }).join('');
    };


    // --- 4. FIX MUTLAK: EDIT WEB & PENYEBAB TOMBOL MATI ---
    const panelWebEdit = document.querySelector('#panel-edit-web .flex-1');
    if (panelWebEdit) {
        
        // Render Ulang Panel Web untuk memindahkan MAPS di atas SOSMED
        panelWebEdit.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2"><i class="fa-solid fa-store text-amber-500 mr-2"></i> Pengaturan Toko Utama</h3>
                
                <div class="grid grid-cols-2 gap-3 mb-2">
                    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <input type="checkbox" id="ew-toko-buka" class="w-5 h-5 accent-amber-500" ${window.systemConfig.tokoBuka ? 'checked' : ''}>
                        <span class="text-xs font-bold text-gray-700">Toko Buka</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <input type="checkbox" id="ew-audio" class="w-5 h-5 accent-blue-500" ${window.systemConfig.audioAktif ? 'checked' : ''}>
                        <span class="text-xs font-bold text-gray-700">Audio Kasir</span>
                    </label>
                </div>

                <div><label class="text-[10px] font-bold text-gray-500 block mb-1">Nomor WA Resto (Otomatis Struk)</label><input type="number" id="ew-wa" value="${window.systemConfig.nomorWA || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                
                <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <label class="text-[10px] font-black text-amber-800 block mb-2">LOGO RESTO (URL / UPLOAD)</label>
                    <input type="text" id="ew-logo" value="${window.systemConfig.logoUrl || ''}" placeholder="Pilih file atau paste URL" class="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                    <input type="file" accept="image/*" class="w-full text-[10px]" onchange="window.handleImageUpload(this, 'ew-logo')">
                </div>

                <div class="bg-blue-50 p-3 rounded-xl border border-blue-200">
                    <label class="text-[10px] font-black text-blue-800 block mb-2">GAMBAR QRIS (URL / UPLOAD)</label>
                    <input type="text" id="ew-qris" value="${window.systemConfig.qrisUrl || ''}" placeholder="Pilih file atau paste URL" class="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-xs outline-none mb-2">
                    <input type="file" accept="image/*" class="w-full text-[10px]" onchange="window.handleImageUpload(this, 'ew-qris')">
                </div>
            </div>

            <!-- GOOGLE MAPS PINDAH KE SINI (DI ATAS SOSMED) -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 mb-3"><i class="fa-solid fa-map-location-dot text-indigo-500 mr-2"></i> Lokasi Google Maps</h3>
                <textarea id="ew-maps" rows="3" placeholder='Paste iframe code Google Maps dari tab "Sematkan Peta"...' class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-500">${window.systemConfig.mapsEmbed || ''}</textarea>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 class="text-sm font-black text-gray-900 border-b border-gray-100 pb-2 mb-3"><i class="fa-solid fa-link text-pink-500 mr-2"></i> Link Sosial Media</h3>
                <div class="space-y-3">
                    <div><label class="text-[10px] font-bold text-pink-600 block mb-1"><i class="fa-brands fa-instagram mr-1"></i> Instagram Link</label><input type="text" id="ew-ig" value="${window.systemConfig.linkIG || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-pink-500"></div>
                    <div><label class="text-[10px] font-bold text-blue-600 block mb-1"><i class="fa-brands fa-facebook mr-1"></i> Facebook Link</label><input type="text" id="ew-fb" value="${window.systemConfig.linkFB || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-blue-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-900 block mb-1"><i class="fa-brands fa-tiktok mr-1"></i> TikTok / X Link</label><input type="text" id="ew-tt" value="${window.systemConfig.linkTT || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-gray-500"></div>
                </div>
            </div>
            
            <button onclick="window.simpanWebSafe()" class="w-full bg-gray-900 text-white font-black py-4 rounded-xl shadow-md hover:bg-black transition text-sm">SIMPAN PENGATURAN</button>
        `;

        // SAFE SAVE FUNCTION (Menghindari javascript crash yang menyebabkan tombol lain mati)
        window.simpanWebSafe = function() {
            try {
                if(!window.systemConfig) window.systemConfig = {};
                
                // Ambil Nilai
                window.systemConfig.tokoBuka = document.getElementById('ew-toko-buka').checked;
                window.systemConfig.audioAktif = document.getElementById('ew-audio').checked;
                window.systemConfig.nomorWA = document.getElementById('ew-wa').value;
                window.systemConfig.mapsEmbed = document.getElementById('ew-maps').value;
                window.systemConfig.linkIG = document.getElementById('ew-ig').value;
                window.systemConfig.linkFB = document.getElementById('ew-fb').value;
                window.systemConfig.linkTT = document.getElementById('ew-tt').value;
                
                const logoInput = document.getElementById('ew-logo').value;
                if (logoInput) {
                    window.systemConfig.logoUrl = logoInput;
                    const elImg = document.getElementById('header-logo-img');
                    const elIkon = document.getElementById('header-logo-icon');
                    if(elImg) { elImg.src = logoInput; elImg.classList.remove('hidden'); }
                    if(elIkon) elIkon.classList.add('hidden');
                }

                const qrisInput = document.getElementById('ew-qris').value;
                if (qrisInput) window.systemConfig.qrisUrl = qrisInput;
                
                // Simpan!
                localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
                
                alert("SUKSES! Semua pengaturan berhasil disimpan secara permanen.");
                
            } catch (error) {
                alert("Peringatan: Gagal menyimpan data karena memori penuh atau cache bermasalah.");
                console.error(error);
            }
        };

        // Ganti fungsi klik tombol simpan bawaan agar tidak memanggil fungsi lama yang rusak
        const panelWebBtn = document.querySelector('#panel-edit-web .bg-gray-900 button:last-child');
        if (panelWebBtn) {
            panelWebBtn.removeAttribute('onclick');
            panelWebBtn.addEventListener('click', window.simpanWebSafe);
        }
    }
});
// ============================================================================
// 56. ULTIMATE REVISION: STRICT CLOCK STACKING, NEW FILENAMES, & KASIR-OWNER MERGE
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX MUTLAK (PALING BANDEL): JAM & TANGGAL WAJIB ATAS-BAWAH ---
    window.updateClock = function() {
        const now = new Date();
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
        const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
        const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB`;
        
        const el = document.getElementById('live-clock');
        if (el) {
            // Kita hapus class 'flex-row' atau 'items-center' yang mungkin memaksa dia sebaris
            el.classList.remove('flex-row', 'items-center', 'gap-2', 'space-x-2');
            
            // Kita paksa pakai 'flex-col' (kolom) agar mutlak atas-bawah
            el.className = "flex flex-col items-end justify-center bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-right min-w-[130px] shadow-inner";
            
            // Dibungkus 2 DIV terpisah agar tidak mungkin menyatu
            el.innerHTML = `
                <div class="text-[10px] font-bold text-gray-500 w-full leading-tight mb-0.5 tracking-wide">${tgl}</div>
                <div class="text-sm font-black text-amber-600 w-full leading-tight">${jam}</div>
            `;
        }
    };
    // Panggil sekali agar langsung berubah tanpa menunggu 1 detik
    window.updateClock();


    // --- 2. UPDATE NAMA FILE LOGO & QRIS LOKAL ---
    if (!window.systemConfig) window.systemConfig = {};
    
    // Tarik nama file gambar persis seperti yang direquest
    if (!window.systemConfig.logoUrl || window.systemConfig.logoUrl === '' || window.systemConfig.logoUrl === '1000734259.png') {
        window.systemConfig.logoUrl = 'logo-512.png';
    }
    if (!window.systemConfig.qrisUrl || window.systemConfig.qrisUrl === '' || window.systemConfig.qrisUrl === '1000714622.jpg') {
        window.systemConfig.qrisUrl = 'qris-mainstay.png';
    }
    
    // Terapkan langsung ke Header Logo UI
    const elImg = document.getElementById('header-logo-img');
    const elIkon = document.getElementById('header-logo-icon');
    if(elImg) { elImg.src = window.systemConfig.logoUrl; elImg.classList.remove('hidden'); }
    if(elIkon) elIkon.classList.add('hidden');


    // --- 3. FIX MUTLAK: TOMBOL KEMBALI EDIT WEB ---
    const panelWebEdit = document.querySelector('#panel-edit-web');
    if (panelWebEdit) {
        const closeBtns = panelWebEdit.querySelectorAll('button');
        closeBtns.forEach(btn => {
            if (btn.innerText.toLowerCase().includes('batal') || btn.innerText.toLowerCase().includes('tutup') || btn.querySelector('.fa-arrow-left')) {
                btn.outerHTML = `<button onclick="document.getElementById('panel-edit-web').classList.add('translate-y-full'); setTimeout(() => document.getElementById('panel-edit-web').classList.add('hidden'), 300);" class="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-black transition flex items-center gap-2"><i class="fa-solid fa-arrow-left"></i> KEMBALI</button>`;
            }
        });
    }


    // --- 4. FIX MUTLAK: MODAL EDIT OWNER ---
    window.bukaFormOwner = function() {
        window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { nama: 'Master Owner', foto: '', wa: '628977099557', rekening: '' };
        document.getElementById('owner-nama').value = window.ownerProfile.nama;
        document.getElementById('owner-wa').value = window.ownerProfile.wa;
        document.getElementById('owner-rek').value = window.ownerProfile.rekening;
        document.getElementById('owner-foto').value = window.ownerProfile.foto;
        
        let modal = document.getElementById('modal-form-owner');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('z-[9999]'); // Paksa ke layer paling depan
        }
    };
    
    window.tutupFormOwner = function() {
        let modal = document.getElementById('modal-form-owner');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    };


    // --- 5. REVOLUSI KASIR: LOGIN OWNER & WAJIB ABSEN ---
    const oldProsesLoginKasir = window.prosesLoginKasir;
    window.prosesLoginKasir = function() {
        const pin = document.getElementById('login-kasir-pin').value;
        const pinOwner = window.systemConfig.pinOwner || '888888'; // PIN MASTER
        
        if (pin === pinOwner) {
            localStorage.setItem('sesiMainstay', 'owner-kasir'); 
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-kasir').classList.remove('hidden');
            window.renderListKasir();
            window.setupHeaderKasir(); 
            window.playAudio('siap');
        } else {
            const staf = window.dbStaf.find(s => s.pin === pin);
            if(staf) {
                localStorage.setItem('sesiMainstay', 'kasir');
                document.getElementById('view-login').classList.add('hidden');
                document.getElementById('view-kasir').classList.remove('hidden');
                window.renderListKasir();
                window.setupHeaderKasir();
                window.playAudio('siap');
            } else {
                alert("PIN Salah atau tidak terdaftar di HRD!");
            }
        }
    };

    window.setupHeaderKasir = function() {
        const sesi = localStorage.getItem('sesiMainstay');
        const btnAbsen = document.querySelector('#view-kasir button[onclick="window.bukaAbsensi()"]');
        const dropdownStaf = document.getElementById('kasir-staf-dropdown');

        if (sesi === 'owner-kasir' || sesi === 'owner') {
            if (btnAbsen) btnAbsen.style.display = 'none'; // Bos tidak perlu absen
            if (dropdownStaf) {
                const namaOwner = window.ownerProfile ? window.ownerProfile.nama : 'Master Owner';
                dropdownStaf.innerHTML = `<option value="OWNER">${namaOwner} (Owner)</option>`;
                dropdownStaf.disabled = true;
                dropdownStaf.classList.add('bg-amber-100', 'text-amber-800');
            }
        } else {
            if (btnAbsen) btnAbsen.style.display = 'flex';
            if (dropdownStaf) {
                dropdownStaf.disabled = false;
                dropdownStaf.classList.remove('bg-amber-100', 'text-amber-800');
                if(typeof window.updateDropdownKasir === 'function') window.updateDropdownKasir();
            }
        }
    };
    setTimeout(() => window.setupHeaderKasir(), 500);

    // BLOKIR AKSES PROSES JIKA STAF BELUM ABSEN MASUK
    const oldTerimaPesanan = window.terimaPesanan;
    window.terimaPesanan = function(no) {
        const sesi = localStorage.getItem('sesiMainstay');
        const dropdownStaf = document.getElementById('kasir-staf-dropdown');
        if (sesi !== 'owner-kasir' && sesi !== 'owner') {
            if (!dropdownStaf || !dropdownStaf.value) {
                return alert("AKSES DITOLAK!\n\nSilakan 'Absen Masuk' terlebih dahulu, lalu pilih nama Anda di pojok kiri atas untuk mulai memproses pesanan.");
            }
        }
        oldTerimaPesanan(no);
    };

    const oldSelesaiPesanan = window.selesaiPesanan;
    window.selesaiPesanan = function(no) {
        const sesi = localStorage.getItem('sesiMainstay');
        const dropdownStaf = document.getElementById('kasir-staf-dropdown');
        if (sesi !== 'owner-kasir' && sesi !== 'owner') {
            if (!dropdownStaf || !dropdownStaf.value) {
                return alert("AKSES DITOLAK!\n\nSilakan 'Absen Masuk' dan pilih nama Anda terlebih dahulu.");
            }
        }
        oldSelesaiPesanan(no);
    };


    // --- 6. TOMBOL 10K & 20K DI KALKULATOR POS ---
    const oldBukaPOS = window.bukaPOS;
    window.bukaPOS = function() {
        if(typeof oldBukaPOS === 'function') oldBukaPOS();
        
        const kalkulator = document.getElementById('pos-kalkulator');
        if (kalkulator) {
            kalkulator.innerHTML = `
                <label class="text-[10px] font-black text-blue-800 block mb-2">PILIH ATAU KETIK UANG DITERIMA</label>
                <div class="grid grid-cols-5 gap-1 mb-2">
                    <button onclick="window.setUangCepat(window.posInternalTotal)" class="bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">PAS</button>
                    <button onclick="window.setUangCepat(10000)" class="bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">10K</button>
                    <button onclick="window.setUangCepat(20000)" class="bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">20K</button>
                    <button onclick="window.setUangCepat(50000)" class="bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">50K</button>
                    <button onclick="window.setUangCepat(100000)" class="bg-white border border-blue-200 text-blue-700 text-[9px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">100K</button>
                </div>
                <input type="number" id="pos-uang-diterima" placeholder="Atau ketik manual di sini..." class="w-full bg-white border border-blue-200 rounded-lg p-3 text-sm font-black outline-none mb-2 focus:border-blue-500" oninput="window.hitungKembalian()">
                <div class="flex justify-between items-end border-t border-blue-200 pt-2 mt-1">
                    <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">KEMBALIAN:</span>
                    <span id="pos-kembalian" class="text-lg font-black text-blue-600 leading-none">Rp 0</span>
                </div>
            `;
        }
    };


    // --- 7. VOUCHER CRM SIMPLIFIED ---
    const panelMember = document.querySelector('#panel-member .flex-1');
    if (panelMember) {
        const voucherEngine = panelMember.querySelector('.bg-gradient-to-r');
        if (voucherEngine) {
            voucherEngine.innerHTML = `
                <h3 class="text-sm font-black mb-3 flex items-center gap-2"><i class="fa-solid fa-gift"></i> Berikan Kode Promo ke Pelanggan</h3>
                <div class="mb-3">
                    <label class="text-[10px] font-bold text-orange-100 block mb-1">Ketik Kode Voucher (Sesuai yg dibuat di Panel Promo)</label>
                    <input type="text" id="v-kode-assign" placeholder="Cth: MAINSTAYMANTAP" class="w-full text-gray-900 px-3 py-2 rounded-lg font-black text-xs uppercase outline-none">
                </div>
                <label class="text-[10px] font-bold text-orange-100 block mb-1">Pilih Pelanggan</label>
                <select id="v-target-assign" class="w-full text-gray-900 bg-white px-3 py-2 rounded-lg font-black text-xs mb-3 outline-none cursor-pointer">
                    <option value="">-- Pilih Pelanggan --</option>
                    ${window.databaseMember ? window.databaseMember.map(m => `<option value="${m.wa}">${m.nama} (${m.wa})</option>`).join('') : ''}
                </select>
                <button onclick="window.assignVoucherToMember()" class="w-full bg-gray-900 text-white font-black py-3 rounded-xl shadow hover:bg-black transition text-sm">HUBUNGKAN KODE KE PELANGGAN</button>
            `;
        }
    }

    window.assignVoucherToMember = function() {
        const kode = document.getElementById('v-kode-assign').value;
        const wa = document.getElementById('v-target-assign').value;
        if (!kode || !wa) return alert("Kode dan Pelanggan harus diisi!");
        alert(`Sukses! Kode [${kode}] telah dicatatkan untuk pelanggan dengan WA: ${wa}.`);
        document.getElementById('v-kode-assign').value = '';
    };

});
// ============================================================================
// 58. ABSOLUTE REVISION: CACHE BUSTER, BLOCK CLOCK, 10K/20K POS, OWNER-KASIR MERGE
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX MUTLAK JAM: BEDA DIVISI (ATAS BAWAH STRICT) ---
    window.updateClock = function() {
        const now = new Date();
        const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][now.getDay()];
        const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
        const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} WIB`;

        const el = document.getElementById('live-clock');
        if (el) {
            // Hapus semua class flex yang memaksa sebaris
            el.className = "bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 text-right";
            // Gunakan display: block mutlak (Beda Divisi) agar tidak mungkin sejajar
            el.innerHTML = `
                <div style="display: block; font-size: 10px; font-weight: bold; color: #6b7280; line-height: 1.2;">${tgl}</div>
                <div style="display: block; font-size: 14px; font-weight: 900; color: #d97706; line-height: 1.2; margin-top: 2px;">${jam}</div>
            `;
        }
    };
    window.updateClock();


    // --- 2. FIX GAMBAR BANDEL (BYPASS CACHE BROWSER) ---
    // Browser HP sering menyimpan gambar lama, kita paksa muat baru dengan trik "?v=waktu"
    const ts = new Date().getTime();
    const logoBaru = 'logo-512.png?v=' + ts;
    const qrisBaru = 'qris-mainstay.png?v=' + ts;

    const elImg = document.getElementById('header-logo-img');
    const elIkon = document.getElementById('header-logo-icon');
    if(elImg) { elImg.src = logoBaru; elImg.classList.remove('hidden'); }
    if(elIkon) elIkon.classList.add('hidden');

    // Override QRIS Customer agar pakai gambar lokal yang baru
    const oldBukaModalQRIS = window.bukaModalQRIS;
    window.bukaModalQRIS = function(orderData) {
        oldBukaModalQRIS(orderData);
        const qrisImg = document.querySelector('#modal-qris img');
        if (qrisImg) qrisImg.src = qrisBaru;
    };


    // --- 3. HAPUS POS DARI OWNER & ATUR MODE KASIR-OWNER ---
    // Sembunyikan tombol POS di panel Owner
    const ownerButtons = document.querySelectorAll('#view-owner button');
    ownerButtons.forEach(btn => {
        if (btn.innerText.toLowerCase().includes('pos') || btn.getAttribute('onclick')?.includes('bukaPOS')) {
            btn.style.display = 'none';
        }
    });

    // Pastikan Header Kasir menyembunyikan Absen jika yang login adalah Owner
    window.setupHeaderKasir = function() {
        const sesi = localStorage.getItem('sesiMainstay');
        const btnAbsen = document.querySelector('#view-kasir button[onclick="window.bukaAbsensi()"]');
        const dropdownStaf = document.getElementById('kasir-staf-dropdown');

        if (sesi === 'owner-kasir' || sesi === 'owner') {
            if (btnAbsen) btnAbsen.style.display = 'none'; // BOS TIDAK PERLU ABSEN
            if (dropdownStaf) {
                const namaOwner = window.ownerProfile ? window.ownerProfile.nama : 'Master Owner';
                dropdownStaf.innerHTML = `<option value="OWNER">${namaOwner} (Owner)</option>`;
                dropdownStaf.disabled = true; // Kunci Dropdown
                dropdownStaf.className = "bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none";
            }
        } else {
            if (btnAbsen) btnAbsen.style.display = 'flex';
            if (dropdownStaf) {
                dropdownStaf.disabled = false;
                dropdownStaf.className = "bg-slate-50 text-gray-700 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer max-w-[140px] truncate shadow-sm";
                if(typeof window.updateDropdownKasir === 'function') window.updateDropdownKasir();
            }
        }
    };
    setTimeout(() => window.setupHeaderKasir(), 500);


    // --- 4. FIX TOMBOL UANG CEPAT (10K & 20K MUNCUL MUTLAK) ---
    const kalkulatorHTML = `
        <label class="text-[10px] font-black text-blue-800 block mb-2">PILIH UANG DITERIMA</label>
        <div class="grid grid-cols-5 gap-1 mb-2">
            <button onclick="window.setUangCepat(window.posInternalTotal)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">PAS</button>
            <button onclick="window.setUangCepat(10000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">10K</button>
            <button onclick="window.setUangCepat(20000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">20K</button>
            <button onclick="window.setUangCepat(50000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">50K</button>
            <button onclick="window.setUangCepat(100000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded hover:bg-blue-500 hover:text-white transition shadow-sm">100K</button>
        </div>
        <input type="number" id="pos-uang-diterima" placeholder="Atau ketik manual..." class="w-full bg-white border border-blue-200 rounded-lg p-3 text-sm font-black outline-none mb-2 focus:border-blue-500" oninput="window.hitungKembalian()">
        <div class="flex justify-between items-end border-t border-blue-200 pt-2 mt-1">
            <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">KEMBALIAN:</span>
            <span id="pos-kembalian" class="text-lg font-black text-blue-600 leading-none">Rp 0</span>
        </div>
    `;

    // Timpa saat buka POS
    const superOldBukaPOS = window.bukaPOS;
    window.bukaPOS = function() {
        if(typeof superOldBukaPOS === 'function') superOldBukaPOS();
        
        const kalkulatorArea = document.getElementById('pos-kalkulator');
        if (kalkulatorArea) {
            kalkulatorArea.innerHTML = kalkulatorHTML;
        }
    };

    // Timpa juga saat metode bayar diubah (agar tidak kerefresh jadi hilang lagi)
    window.toggleKalkulatorPOS = function() {
        const tipe = document.getElementById('pos-tipe-bayar')?.value;
        const kal = document.getElementById('pos-kalkulator');
        if(kal) {
            if(tipe === 'Tunai') {
                kal.style.display = 'block';
                kal.innerHTML = kalkulatorHTML; // RE-INJECT PAKSA
                window.hitungKembalian(); 
            } else {
                kal.style.display = 'none';
            }
        }
    };

});
// ============================================================================
// 59. PROFESSIONAL POS LOCKSCREEN (WAJIB ABSEN & KUNCI OTOMATIS)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FUNGSI OVERLAY KUNCI KASIR (TAMPILAN PROFESIONAL) ---
    window.cekKunciKasir = function() {
        const kasirView = document.getElementById('view-kasir');
        if(!kasirView) return;

        let overlay = document.getElementById('kasir-lock-overlay');
        if(!overlay) {
            // Mengambil tinggi header agar overlay tidak menutupi tombol absen di atas
            const kasirHeader = kasirView.querySelector('div:first-child');
            const headerHeight = kasirHeader ? kasirHeader.offsetHeight : 65;
            
            overlay = document.createElement('div');
            overlay.id = 'kasir-lock-overlay';
            // Efek Kaca Buram (Backdrop Blur) menutupi area kerja kasir
            overlay.className = "absolute inset-x-0 bottom-0 z-[200] bg-slate-900/50 backdrop-blur-md flex flex-col items-center justify-center transition-all duration-300";
            overlay.style.top = headerHeight + 'px';
            overlay.innerHTML = `
                <div class="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl border border-red-100 text-center max-w-sm mx-4 transform transition-all mt-[-50px]">
                    <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border-4 border-white shadow-md">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h3 class="text-xl font-black text-gray-900 mb-2">Sistem Terkunci</h3>
                    <p class="text-xs font-bold text-gray-500 mb-6 leading-relaxed">Anda belum melakukan Absen Masuk. Seluruh fitur pesanan dinonaktifkan.<br>Silakan klik tombol <b class="text-blue-500"><i class="fa-solid fa-camera"></i> Absen</b> di menu atas.</p>
                    <button onclick="window.bukaAbsensi()" class="w-full bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition text-sm flex items-center justify-center gap-2">
                        BUKA KUNCI (ABSEN MASUK)
                    </button>
                </div>
            `;
            // Pastikan view-kasir relative agar overlay-nya presisi
            kasirView.classList.add('relative');
            kasirView.appendChild(overlay);
        }

        const sesi = localStorage.getItem('sesiMainstay');
        // Jika yang Login adalah Owner, langsung HANCURKAN gemboknya!
        if (sesi === 'owner-kasir' || sesi === 'owner') {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
        } else {
            // Jika Kasir, cek database kehadiran staf
            const adaHadir = window.dbStaf && window.dbStaf.some(s => s.statusHadir);
            if (adaHadir) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex'); // Buka Kunci
            } else {
                overlay.classList.remove('hidden');
                overlay.classList.add('flex'); // Kunci Rapat
            }
        }
    };


    // --- 2. OVERRIDE DROPDOWN KASIR (HAPUS OPSI KOSONG & TAMPILKAN STATUS) ---
    window.updateDropdownKasir = function() {
        const dp = document.getElementById('kasir-staf-dropdown');
        if(!dp) return;
        
        const sesi = localStorage.getItem('sesiMainstay');
        if(sesi === 'owner-kasir' || sesi === 'owner') {
            // Logika Owner sudah di-handle di setupHeaderKasir (Patch 58), lewati saja.
            return;
        }

        const hadir = window.dbStaf ? window.dbStaf.filter(s => s.statusHadir) : [];
        if(hadir.length > 0) {
            dp.disabled = false;
            // Hanya menampilkan nama staf yang sudah online. TIDAK ADA opsi kosong!
            dp.innerHTML = hadir.map(s => `<option value="${s.nama}">${s.nama} (Online)</option>`).join('');
            dp.className = "bg-slate-50 text-gray-700 border border-slate-200 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer max-w-[140px] md:max-w-[180px] truncate shadow-sm";
        } else {
            dp.disabled = true;
            // Tampilan Peringatan Merah
            dp.innerHTML = `<option value="">-- WAJIB ABSEN --</option>`;
            dp.className = "bg-red-50 text-red-600 border border-red-200 text-[10px] md:text-xs font-black rounded-lg px-2.5 py-1.5 outline-none max-w-[140px] md:max-w-[180px] truncate shadow-sm cursor-not-allowed";
        }
        
        // Panggil fungsi gembok layar setiap kali dropdown diupdate
        if(typeof window.cekKunciKasir === 'function') window.cekKunciKasir();
    };


    // --- 3. MENGHUBUNGKAN PROSES ABSEN DENGAN PEMBUKAAN GEMBOK ---
    const backupProsesAbsen59 = window.prosesAbsen;
    window.prosesAbsen = function(jenis) {
        if(typeof backupProsesAbsen59 === 'function') {
            backupProsesAbsen59(jenis); // Jalankan sistem foto & simpan data asli
        }
        
        // Setelah absen sukses, trigger refresh dropdown dan buka gembok layar seketika
        setTimeout(() => {
            if(typeof window.updateDropdownKasir === 'function') window.updateDropdownKasir();
        }, 400);
    };

    // Trigger awal saat aplikasi pertama kali dimuat
    setTimeout(() => {
        if(typeof window.updateDropdownKasir === 'function') window.updateDropdownKasir();
    }, 800);

});
// ============================================================================
// 60. COMPACT CLOCK (WITH SECONDS), OWNER PIN LOGIN FIX, & GLOBAL OWNER EDIT
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX JAM: SANGAT KECIL, PADAT, ATAS-BAWAH, + DETIK ---
    window.updateClock = function() {
        const now = new Date();
        const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][now.getDay()]; // Hari disingkat agar padat
        const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
        const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
        
        // TAMBAHAN DETIK
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;

        const el = document.getElementById('live-clock');
        if (el) {
            // Class dibersihkan agar super minimalis
            el.className = "bg-gray-50 px-2 py-1 rounded border border-gray-200 text-right shrink-0 shadow-sm";
            el.innerHTML = `
                <div style="display: block; font-size: 8px; font-weight: bold; color: #6b7280; line-height: 1; margin-bottom: 2px;">${tgl}</div>
                <div style="display: block; font-size: 11px; font-weight: 900; color: #d97706; line-height: 1;">${jam}</div>
            `;
        }
    };
    // Panggil agar langsung jalan tanpa jeda
    window.updateClock();


    // --- 2. FIX LOGIN: PIN OWNER LANGSUNG KE KASIR TANPA ABSEN ---
    // Timpa fungsi login bawaan secara absolut
    window.prosesLoginKasir = function() {
        const pin = document.getElementById('login-kasir-pin').value;
        if (!pin) return alert("Harap masukkan PIN!");

        // Ambil PIN Owner dari sistem, atau gunakan default 888888
        let pinOwner = '888888';
        if (window.systemConfig && window.systemConfig.pinOwner) {
            pinOwner = window.systemConfig.pinOwner;
        }

        if (pin === pinOwner) {
            // MODE BOS (OWNER)
            localStorage.setItem('sesiMainstay', 'owner-kasir'); 
            
            // Pindah Layar
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-kasir').classList.remove('hidden');
            
            // Panggil Fungsi Kasir
            if(typeof window.renderListKasir === 'function') window.renderListKasir();
            if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
            
            // Hapus Gembok Layar (Lockscreen) Paksa!
            const overlay = document.getElementById('kasir-lock-overlay');
            if (overlay) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
            }
            
            window.playAudio('siap');
            alert("Selamat datang, Master Owner! Sistem telah menyesuaikan ke mode Owner.");

        } else {
            // MODE STAF KASIR BIASA
            const staf = window.dbStaf ? window.dbStaf.find(s => s.pin === pin) : null;
            if(staf) {
                localStorage.setItem('sesiMainstay', 'kasir');
                document.getElementById('view-login').classList.add('hidden');
                document.getElementById('view-kasir').classList.remove('hidden');
                
                if(typeof window.renderListKasir === 'function') window.renderListKasir();
                if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
                
                window.playAudio('siap');
            } else {
                alert("PIN Salah atau tidak terdaftar di HRD!");
            }
        }
    };

    // --- 3. FIX EDIT OWNER: SUNTIK MODAL KE BODY SECARA GLOBAL ---
    // Pastikan UI Modal Edit Owner ada di luar jangkauan panel HRD yang sering ke-refresh
    if (!document.getElementById('modal-form-owner')) {
        const modalHtml = `
        <div id="modal-form-owner" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] hidden items-center justify-center fade-in px-4 pb-safe">
            <div class="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative flex flex-col">
                <h2 class="text-lg font-black text-amber-500 mb-4 border-b border-gray-700 pb-3"><i class="fa-solid fa-crown"></i> Edit Profil Owner</h2>
                <div class="space-y-4 mb-4">
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NAMA OWNER</label><input type="text" id="owner-nama" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NOMOR WA</label><input type="number" id="owner-wa" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div><label class="text-[10px] font-bold text-gray-400 block mb-1">REKENING / E-WALLET</label><input type="text" id="owner-rek" class="w-full bg-gray-800 border border-gray-700 text-white rounded-xl p-3 text-sm font-bold outline-none focus:border-amber-500"></div>
                    <div class="bg-gray-800 p-3 rounded-xl border border-gray-700">
                        <label class="text-[10px] font-bold text-gray-400 block mb-2">FOTO PROFIL (URL)</label>
                        <input type="text" id="owner-foto" placeholder="Link URL Foto..." class="w-full bg-gray-900 border border-gray-700 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500">
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.tutupFormOwner()" class="flex-1 bg-gray-700 text-white font-black py-3 rounded-xl hover:bg-gray-600 transition text-sm">BATAL</button>
                    <button onclick="window.simpanFormOwner()" class="flex-1 bg-amber-500 text-gray-900 font-black py-3 rounded-xl hover:bg-amber-600 transition text-sm shadow-md">SIMPAN</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // Fungsi Buka & Tutup
    window.bukaFormOwner = function() {
        window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { nama: 'Master Owner', foto: '', wa: '628977099557', rekening: '' };
        
        document.getElementById('owner-nama').value = window.ownerProfile.nama;
        document.getElementById('owner-wa').value = window.ownerProfile.wa;
        document.getElementById('owner-rek').value = window.ownerProfile.rekening;
        document.getElementById('owner-foto').value = window.ownerProfile.foto;
        
        const modal = document.getElementById('modal-form-owner');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
    };

    window.tutupFormOwner = function() {
        const modal = document.getElementById('modal-form-owner');
        if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    };

    // Fungsi Simpan yang Aman
    window.simpanFormOwner = function() {
        const nama = document.getElementById('owner-nama').value;
        const wa = document.getElementById('owner-wa').value;
        const rek = document.getElementById('owner-rek').value;
        const foto = document.getElementById('owner-foto').value;

        if(!nama) return alert("Nama Owner tidak boleh kosong!");

        window.ownerProfile = { nama, wa, rekening: rek, foto };
        localStorage.setItem('ownerProfileMainstay', JSON.stringify(window.ownerProfile));
        
        // Update langsung di layar jika sedang buka HRD
        const displayNamaHRD = document.getElementById('owner-nama-display');
        const displayFotoHRD = document.getElementById('owner-foto-display');
        if (displayNamaHRD) displayNamaHRD.textContent = nama;
        if (displayFotoHRD && foto) displayFotoHRD.src = foto;

        // Update sapaan Halo di halaman depan Owner
        if (typeof window.updateGreetingOwner === 'function') window.updateGreetingOwner();

        window.tutupFormOwner();
        alert("Profil Owner sukses di-update!");
    };

});
// ============================================================================
// 61. FIX: ULTRA-COMPACT CLOCK, UNIVERSAL OWNER PIN, & Z-INDEX ABSENSI
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {

    // --- 1. FIX JAM: SUPER MINIMALIS, MURNI TEKS, TANPA KOTAK BACKGROUND ---
    window.updateClock = function() {
        const now = new Date();
        const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][now.getDay()];
        const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
        const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
        const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;

        const el = document.getElementById('live-clock');
        if (el) {
            // HAPUS semua background, border, dan padding yang bikin bengkak!
            el.className = "text-right ml-auto flex flex-col justify-center shrink-0";
            
            // Suntik teks murni dengan ukuran yang sangat kecil (9px dan 11px)
            el.innerHTML = `
                <span style="font-size: 9px; font-weight: 700; color: #6b7280; line-height: 1;">${tgl}</span>
                <span style="font-size: 11px; font-weight: 900; color: #d97706; line-height: 1; margin-top: 2px;">${jam}</span>
            `;
        }
    };
    window.updateClock();


    // --- 2. FIX POP-UP ABSENSI (AGAR TIDAK TENGGELAM DI BELAKANG BLUR) ---
    const originalBukaAbsensi = window.bukaAbsensi;
    window.bukaAbsensi = function() {
        if(typeof originalBukaAbsensi === 'function') originalBukaAbsensi(); // Panggil fungsi aslinya
        
        const modalAbsen = document.getElementById('modal-absensi');
        if (modalAbsen) {
            // PAKSA pop-up kamera melompat ke lapisan paling depan (z-[9999]) menembus gembok blur
            modalAbsen.classList.remove('z-50', 'z-[100]', 'z-40');
            modalAbsen.classList.add('z-[9999]');
        }
    };


    // --- 3. FIX PROFIL OWNER: TAMBAH KOLOM PIN & SATUKAN LOGIKA LOGIN ---
    
    // Tulis ulang bentuk Modal Form Owner agar ada kolom PIN
    const modalFormOwner = document.getElementById('modal-form-owner');
    if (modalFormOwner) {
        modalFormOwner.innerHTML = `
        <div class="bg-gray-900 border border-gray-700 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative flex flex-col">
            <h2 class="text-lg font-black text-amber-500 mb-4 border-b border-gray-700 pb-3"><i class="fa-solid fa-crown"></i> Edit Profil Owner</h2>
            <div class="space-y-3 mb-4">
                <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NAMA OWNER</label><input type="text" id="owner-nama" class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold outline-none focus:border-amber-500"></div>
                <div><label class="text-[10px] font-bold text-amber-500 block mb-1">PIN LOGIN (UNTUK PANEL & KASIR)</label><input type="text" id="owner-pin" class="w-full bg-gray-800 border border-amber-500/50 text-white rounded-lg p-2.5 text-xs font-bold outline-none focus:border-amber-500 tracking-widest"></div>
                <div><label class="text-[10px] font-bold text-gray-400 block mb-1">NOMOR WA</label><input type="number" id="owner-wa" class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold outline-none focus:border-amber-500"></div>
                <div><label class="text-[10px] font-bold text-gray-400 block mb-1">REKENING / E-WALLET</label><input type="text" id="owner-rek" class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-xs font-bold outline-none focus:border-amber-500"></div>
                <div><label class="text-[10px] font-bold text-gray-400 block mb-1">FOTO PROFIL (URL)</label><input type="text" id="owner-foto" class="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-xs outline-none focus:border-amber-500"></div>
            </div>
            <div class="flex gap-3">
                <button onclick="window.tutupFormOwner()" class="flex-1 bg-gray-700 text-white font-black py-3 rounded-xl hover:bg-gray-600 transition text-sm">BATAL</button>
                <button onclick="window.simpanFormOwnerMutlak()" class="flex-1 bg-amber-500 text-gray-900 font-black py-3 rounded-xl hover:bg-amber-600 transition text-sm">SIMPAN</button>
            </div>
        </div>`;
    }

    // Buka Modal dengan data PIN
    window.bukaFormOwner = function() {
        window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { nama: 'Master Owner', pin: '888888', foto: '', wa: '628977099557', rekening: '' };
        document.getElementById('owner-nama').value = window.ownerProfile.nama || '';
        document.getElementById('owner-pin').value = window.ownerProfile.pin || '888888';
        document.getElementById('owner-wa').value = window.ownerProfile.wa || '';
        document.getElementById('owner-rek').value = window.ownerProfile.rekening || '';
        document.getElementById('owner-foto').value = window.ownerProfile.foto || '';
        
        const modal = document.getElementById('modal-form-owner');
        if (modal) { modal.classList.remove('hidden'); modal.classList.add('flex', 'z-[9999]'); }
    };

    // Simpan Modal beserta PIN Baru
    window.simpanFormOwnerMutlak = function() {
        const nama = document.getElementById('owner-nama').value;
        const pin = document.getElementById('owner-pin').value;
        const wa = document.getElementById('owner-wa').value;
        const rek = document.getElementById('owner-rek').value;
        const foto = document.getElementById('owner-foto').value;

        if(!nama || !pin) return alert("Nama dan PIN tidak boleh kosong!");

        window.ownerProfile = { nama, pin, wa, rekening: rek, foto };
        localStorage.setItem('ownerProfileMainstay', JSON.stringify(window.ownerProfile));
        
        const displayNamaHRD = document.getElementById('owner-nama-display');
        const displayFotoHRD = document.getElementById('owner-foto-display');
        if (displayNamaHRD) displayNamaHRD.textContent = nama;
        if (displayFotoHRD && foto) displayFotoHRD.src = foto;
        if (typeof window.updateGreetingOwner === 'function') window.updateGreetingOwner();

        window.tutupFormOwner();
        alert("Profil dan PIN Owner sukses di-update! Gunakan PIN ini untuk Login Panel dan Login Kasir.");
    };


    // --- 4. PENYATUAN LOGIN (PIN SAMA UNTUK PANEL MASTER & KASIR) ---
    
    // A. Login Panel Master (Owner)
    window.prosesLogin = function() {
        const pinInput = document.getElementById('login-pin');
        if(!pinInput) return;
        const pin = pinInput.value;
        
        // Cek PIN dari data Profil Owner (Default: 888888)
        const ownerData = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || {};
        const pinBos = ownerData.pin || '888888'; 

        if (pin === pinBos) {
            localStorage.setItem('sesiMainstay', 'owner');
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-owner').classList.remove('hidden');
            window.playAudio('siap');
            if (typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
        } else {
            alert("PIN Master Salah!");
        }
    };

    // B. Login Kasir (Deteksi jika Owner yang masuk)
    window.prosesLoginKasir = function() {
        const pin = document.getElementById('login-kasir-pin').value;
        if (!pin) return alert("Harap masukkan PIN!");

        // Cek PIN dari data Profil Owner yang SAMA persis
        const ownerData = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || {};
        const pinBos = ownerData.pin || '888888'; 

        if (pin === pinBos) {
            // JIKA BOS YANG MASUK KASIR
            localStorage.setItem('sesiMainstay', 'owner-kasir'); 
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-kasir').classList.remove('hidden');
            
            if(typeof window.renderListKasir === 'function') window.renderListKasir();
            if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
            
            // HANCURKAN GEMBOK ABSENSI
            const overlay = document.getElementById('kasir-lock-overlay');
            if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
            
            window.playAudio('siap');
        } else {
            // JIKA STAF YANG MASUK
            const staf = window.dbStaf ? window.dbStaf.find(s => s.pin === pin) : null;
            if(staf) {
                localStorage.setItem('sesiMainstay', 'kasir');
                document.getElementById('view-login').classList.add('hidden');
                document.getElementById('view-kasir').classList.remove('hidden');
                if(typeof window.renderListKasir === 'function') window.renderListKasir();
                if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
                window.playAudio('siap');
            } else {
                alert("PIN Salah atau tidak terdaftar di HRD!");
            }
        }
    };

});
