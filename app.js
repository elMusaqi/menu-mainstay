/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BINDING TARGET: index (4).html
 * BAGIAN 1: Firebase Init, Global State, Real-Time Clock, & Auth Navigation
 */

// 1. IMPOR MODUL FIREBASE (SDK V10 Modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, onValue, get, child, push, set, update, remove, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// 2. KONFIGURASI FIREBASE
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

// 3. STATE GLOBAL (Penyimpanan Memori Sesi Utama)
const STATE = {
    currentUser: null,       
    activeShift: null,       
    storeSettings: { isOpen: true }, // Default buka
    menus: [],               
    categories: [],          
    cart: [],                
    heldBills: [],           
    vouchers: [],
    rewards: [],
    staffList: [],
    checkoutType: 'Walk-in', 
    checkoutInfo: {
        subtotal: 0, discount: 0, ojolMarkup: 0, grandTotal: 0,
        paymentMethod: 'Cash', cashGiven: 0,
        customerData: { name: '', wa: '', isMember: false, address: '' },
        isPO: false, poDetails: { date: '', timeSlot: '' }
    }
};

// ============================================================================
// CORE UTILITIES & UI BINDING
// ============================================================================

// A. Format Rupiah
window.formatRupiah = function(angka) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
    }).format(angka || 0);
};

// B. Global Real-Time Clock (Sesuai ID HTML: live-clock)
function initRealTimeClock() {
    const clockEl = document.getElementById('live-clock');
    if (!clockEl) return;
    
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
    }, 1000);
}

// C. Sistem Navigasi Tampilan (Sesuai ID HTML: view-customer, view-kasir, view-owner)
window.switchRoleView = function(roleView) {
    const views = ['customer', 'kasir', 'owner'];
    
    // 1. Sembunyikan semua view & reset indikator menu bawah
    views.forEach(v => {
        const section = document.getElementById(`view-${v}`);
        const navBtn = document.getElementById(`nav-${v}`);
        
        if (section) section.classList.add('hidden');
        if (navBtn) {
            navBtn.classList.remove('text-amber-500');
            navBtn.classList.add('text-gray-400');
            const indicator = navBtn.querySelector('.nav-indicator');
            if (indicator) indicator.classList.add('hidden');
        }
    });

    // 2. Tampilkan view yang dituju
    const targetSection = document.getElementById(`view-${roleView}`);
    const targetNav = document.getElementById(`nav-${roleView}`);
    
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('fade-in'); // Animasi CSS dari HTML Anda
    }
    
    if (targetNav) {
        targetNav.classList.remove('text-gray-400');
        targetNav.classList.add('text-amber-500');
        const indicator = targetNav.querySelector('.nav-indicator');
        if (indicator) indicator.classList.remove('hidden');
    }

    // 3. Scroll ke atas otomatis
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================================
// SISTEM OTORISASI (DUAL-PIN & MODAL LOGIN BINDING)
// ============================================================================

// Membuka Modal Login HTML Anda
window.bukaModalLogin = function() {
    const modal = document.getElementById('modal-login');
    const inputPin = document.getElementById('login-pin');
    const errorMsg = document.getElementById('login-error');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex'); // Gunakan flex agar items-center bekerja
        if (inputPin) {
            inputPin.value = '';
            inputPin.focus();
        }
        if (errorMsg) errorMsg.classList.add('hidden');
    }
};

window.closeModalLogin = function() {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

// Memproses PIN yang diketik
window.prosesLogin = async function() {
    const inputEl = document.getElementById('login-pin');
    const errorEl = document.getElementById('login-error');
    const inputPin = inputEl ? inputEl.value.trim() : '';

    if (!inputPin) {
        if(errorEl) { errorEl.innerText = "PIN tidak boleh kosong."; errorEl.classList.remove('hidden'); }
        return;
    }

    // A. Master PIN Owner Gate
    if (inputPin === "888888") {
        STATE.currentUser = { role: 'owner', name: 'Master Owner' };
        closeModalLogin();
        switchRoleView('owner');
        // Panggil render dashboard owner nanti di sini
        return;
    }

    // B. Staff PIN Gate (Mengecek ke tabel /staff)
    try {
        const staffSnap = await get(ref(db, 'staff'));
        if (staffSnap.exists()) {
            const staffData = staffSnap.val();
            let matchedStaff = null;

            for (const key in staffData) {
                if (staffData[key].pin === inputPin) {
                    matchedStaff = { ...staffData[key], id: key, role: 'staff' };
                    break;
                }
            }

            if (matchedStaff) {
                STATE.currentUser = matchedStaff;
                closeModalLogin();
                switchRoleView('kasir');
                
                // Binding nama kasir di Header Layar Kasir
                const kasirNameEl = document.getElementById('kasir-active-name');
                if (kasirNameEl) kasirNameEl.innerText = matchedStaff.name;
                
                return;
            }
        }
        
        // Jika sampai sini, PIN salah atau tidak ada
        if(errorEl) { 
            errorEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> PIN tidak valid atau salah.`; 
            errorEl.classList.remove('hidden'); 
        }

    } catch (error) {
        console.error("Error Auth:", error);
        alert("Gangguan koneksi database saat memverifikasi PIN.");
    }
};

// Fungsi Logout Global
window.prosesLogout = function(role) {
    if (confirm(`Anda yakin ingin keluar dari sesi ${role}?`)) {
        STATE.currentUser = null;
        switchRoleView('customer'); // Kembali ke tampilan aman
        alert("Logout berhasil.");
    }
};

// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initRealTimeClock();
    
    // Paksa aplikasi mulai di Tampilan Customer
    switchRoleView('customer');
});
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 2: Layar Customer (Fetch Toko, Ticker, Kategori, & Grid Menu)
 */

import { get, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi firebase db dan STATE sudah diinisialisasi di Bagian 1)

// ============================================================================
// A. FETCH SETTING TOKO & TICKER MARQUEE
// ============================================================================

function initCustomerDisplayListeners() {
    // 1. Cek Status Buka/Tutup Toko
    const storeRef = ref(db, 'store_settings');
    onValue(storeRef, (snapshot) => {
        if (snapshot.exists()) {
            const settings = snapshot.val();
            STATE.storeSettings = settings;
            
            // Sembunyikan atau tampilkan banner toko tutup berdasarkan ID di HTML
            const closedBanner = document.getElementById('store-closed-banner');
            if (closedBanner) {
                if (settings.isOpen === false) {
                    closedBanner.classList.remove('hidden');
                } else {
                    closedBanner.classList.add('hidden');
                }
            }
        }
    });

    // 2. Fetch Running Text (Marquee Promo)
    const tickerRef = ref(db, 'ticker');
    onValue(tickerRef, (snapshot) => {
        const marqueeEl = document.getElementById('promo-marquee-text');
        if (!marqueeEl) return;

        if (snapshot.exists()) {
            let tickerTexts = [];
            snapshot.forEach((child) => {
                tickerTexts.push(child.val().text);
            });
            // Gabungkan teks dengan pemisah titik
            marqueeEl.innerText = tickerTexts.join('  •••  ');
        } else {
            // Fallback default jika database kosong
            marqueeEl.innerText = "Selamat datang di Mainstay Drink! Nikmati promo spesial hari ini.";
        }
    });

    // 3. Fetch Gambar Banner (Carousel / Promo Utama)
    const carouselRef = ref(db, 'carousel');
    onValue(carouselRef, (snapshot) => {
        const carouselImg = document.getElementById('carousel-img-1');
        const carouselContainer = document.getElementById('promo-carousel-container');
        
        if (!carouselImg || !carouselContainer) return;

        if (snapshot.exists()) {
            // Ambil slide pertama untuk ditampilkan di background
            let firstSlide = null;
            snapshot.forEach(child => { if (!firstSlide) firstSlide = child.val(); });
            
            if (firstSlide && firstSlide.mediaUrl) {
                carouselImg.src = firstSlide.mediaUrl;
                // Update Judul Promo (Mencari tag H2 di dalam container carousel)
                const h2Title = carouselContainer.querySelector('h2');
                if (h2Title && firstSlide.title) h2Title.innerText = firstSlide.title;
            }
        }
    });
}

// ============================================================================
// B. FETCH KATEGORI & SISTEM FILTER
// ============================================================================

window.activeCategory = 'all'; // State filter aktif

function initCategoryListener() {
    const catRef = ref(db, 'categories');
    onValue(catRef, (snapshot) => {
        const catContainer = document.getElementById('category-container');
        if (!catContainer) return;

        STATE.categories = [];
        
        // Buat Tombol "Semua Menu" sebagai tombol wajib pertama
        let htmlContent = `<button onclick="filterKategori('all', this)" class="cat-btn active bg-amber-500 text-white shadow-md px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap uppercase tracking-wide transition border border-transparent">Semua Menu</button>`;
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const cat = child.val();
                STATE.categories.push({ id: child.key, ...cat });
                // Tambahkan sisa tombol kategori
                htmlContent += `<button onclick="filterKategori('${cat.name}', this)" class="cat-btn bg-white text-gray-600 border border-gray-200 px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap uppercase tracking-wide transition hover:bg-slate-100">${cat.name}</button>`;
            });
        }
        
        catContainer.innerHTML = htmlContent;
        // Panggil render grid setelah kategori siap
        if(STATE.menus.length > 0) window.renderKatalog(); 
    });
}

// Fungsi Trigger Saat Pelanggan Menekan Tombol Kategori
window.filterKategori = function(kategori, btnElement) {
    window.activeCategory = kategori;
    
    // Ubah semua warna tombol kembali ke abu-abu putih
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.className = "cat-btn bg-white text-gray-600 border border-gray-200 px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap uppercase tracking-wide transition hover:bg-slate-100";
    });
    
    // Warnai tombol yang baru saja ditekan menjadi Amber (Kuning Emas)
    if (btnElement) {
        btnElement.className = "cat-btn active bg-amber-500 text-white shadow-md px-5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap uppercase tracking-wide transition border border-transparent";
    }
    
    // Render ulang grid menu
    window.renderKatalog();
};

// ============================================================================
// C. FETCH KATALOG MENU & RENDER GRID
// ============================================================================

function initMenuListener() {
    const menuRef = ref(db, 'menus');
    onValue(menuRef, (snapshot) => {
        STATE.menus = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.menus.push({ id: child.key, ...child.val() });
            });
        }
        window.renderKatalog(); // Eksekusi render HTML
    });
}

// Menjalankan pencarian saat pelanggan mengetik di Input '#search-menu'
window.renderKatalog = function() {
    const gridContainer = document.getElementById('menu-grid');
    const searchInput = document.getElementById('search-menu');
    if (!gridContainer) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

    // Filter data berdasarkan kategori aktif DAN kata kunci pencarian
    const filteredMenus = STATE.menus.filter(menu => {
        const matchCategory = (window.activeCategory === 'all' || menu.category === window.activeCategory);
        const matchSearch = menu.name.toLowerCase().includes(query);
        return matchCategory && matchSearch;
    });

    if (filteredMenus.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-span-full text-center py-12 flex flex-col items-center justify-center">
                <i class="fa-solid fa-face-frown text-3xl text-gray-300 mb-3"></i>
                <p class="text-xs font-bold text-gray-400">Maaf, menu tidak ditemukan.</p>
            </div>`;
        return;
    }

    let gridHTML = '';
    filteredMenus.forEach(menu => {
        // Cek apakah stok habis
        const isHabis = menu.status === 'Habis' || menu.portion <= 0;
        const imgEffect = isHabis ? 'grayscale opacity-50' : 'group-hover:scale-105 transition-transform';
        const badgeHabis = isHabis ? `<div class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl"><span class="text-white text-[10px] font-black border border-white px-2 py-1 rounded bg-black/50">HABIS</span></div>` : '';
        const badgeBestSeller = menu.isBestSeller ? `<div class="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-lg z-10 shadow-sm">BEST SELLER</div>` : '';
        
        // Logika Tampilan Harga (Coret Harga Normal jika ada Harga Promo)
        let priceHTML = `<span class="text-amber-500 font-black">${formatRupiah(menu.normalPrice)}</span>`;
        if (menu.promoPrice && menu.promoPrice > 0) {
            priceHTML = `<span class="line-through text-[9px] text-gray-400 mr-1">${formatRupiah(menu.normalPrice)}</span><br><span class="text-amber-500 font-black">${formatRupiah(menu.promoPrice)}</span>`;
        }

        // Tulis Struktur HTML Grid per Produk Sesuai Kerangka Anda
        gridHTML += `
            <div class="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm flex flex-col relative overflow-hidden group cursor-pointer" onclick="${isHabis ? '' : `bukaModalDetail('${menu.id}')`}">
                ${badgeBestSeller}
                <div class="w-full h-24 sm:h-32 bg-slate-100 rounded-xl mb-2 overflow-hidden relative">
                    <img src="${menu.image || 'logo-192.png'}" class="w-full h-full object-cover ${imgEffect}">
                    ${badgeHabis}
                </div>
                <div class="flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-black text-gray-900 text-xs sm:text-sm leading-tight mb-1 truncate">${menu.name}</h3>
                        <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">${menu.category}</p>
                    </div>
                    <div class="mt-2 flex justify-between items-end">
                        <div class="flex flex-col leading-tight">${priceHTML}</div>
                        <button class="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm ${isHabis ? 'opacity-50 cursor-not-allowed' : 'group-hover:bg-amber-600 transition'}">
                            <i class="fa-solid fa-plus text-[10px] sm:text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    gridContainer.innerHTML = gridHTML;
};

// ============================================================================
// PANGGIL SEMUA INISIALISASI
// ============================================================================
// Kita menyisipkan fungsi ini agar berjalan otomatis setelah HTML diload
document.addEventListener('DOMContentLoaded', () => {
    initCustomerDisplayListeners();
    initCategoryListener();
    initMenuListener();
});
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 3: Modal Kustomisasi (Varian) & Logika Masuk Keranjang (Add to Cart)
 */

// State lokal khusus untuk Modal Detail
STATE.activeMenu = null;
STATE.activeQty = 1;
STATE.activePrice = 0;

// ============================================================================
// A. BUKA TUTUP MODAL DETAIL KUSTOMISASI
// ============================================================================

window.bukaModalDetail = function(menuId) {
    const menu = STATE.menus.find(m => m.id === menuId);
    if (!menu) return;

    STATE.activeMenu = menu;
    STATE.activeQty = 1;

    // 1. Binding Data ke Elemen Modal HTML[span_1](start_span)[span_1](end_span)
    const imgEl = document.getElementById('detail-img');
    const nameEl = document.getElementById('detail-name');
    const descEl = document.getElementById('detail-desc');
    const qtyEl = document.getElementById('detail-qty');
    const modalEl = document.getElementById('modal-detail');

    if (imgEl) imgEl.src = menu.image || 'logo-192.png';
    if (nameEl) nameEl.innerText = menu.name;
    if (descEl) descEl.innerText = `Kategori: ${menu.category} | ${menu.isBestSeller ? '⭐ Best Seller' : ''}`;
    if (qtyEl) qtyEl.innerText = STATE.activeQty;

    // 2. Render Varian (Ukuran, Gula, Es) Secara Dinamis
    renderVarianDinamis(menu);

    // 3. Hitung Harga Awal & Tampilkan Modal
    hitungTotalHargaDetail();
    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
    }
};

window.closeModalDetail = function() {
    const modalEl = document.getElementById('modal-detail');
    if (modalEl) {
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
    }
    STATE.activeMenu = null;
};

// ============================================================================
// B. RENDER PILIHAN VARIAN DINAMIS (Berdasarkan Toggle Owner)
// ============================================================================

function renderVarianDinamis(menu) {
    const parent = document.getElementById('detail-desc').parentNode;
    
    // Bersihkan varian lama (Hapus elemen dengan class 'dynamic-variant')
    parent.querySelectorAll('.dynamic-variant').forEach(el => el.remove());

    let htmlVarian = '';

    // 1. Opsi Ukuran (Size) - Jika diaktifkan
    if (menu.isSizeActive && menu.sizes && menu.sizes.length > 0) {
        let sizeOptions = menu.sizes.map((sz, idx) => `
            <label class="relative cursor-pointer">
                <input type="radio" name="detail_size" value="${sz.name}|${sz.charge}" class="peer sr-only" ${idx === 0 ? 'checked' : ''} onchange="hitungTotalHargaDetail()">
                <div class="p-3 border-2 border-gray-200 rounded-xl text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 transition h-full flex flex-col justify-center">
                    <p class="text-xs font-black text-gray-800">${sz.name}</p>
                    ${sz.charge > 0 ? `<p class="text-[9px] font-bold text-amber-600">+ Rp ${sz.charge.toLocaleString('id-ID')}</p>` : ''}
                </div>
            </label>
        `).join('');

        htmlVarian += `
            <div class="mb-5 dynamic-variant fade-in">
                <h3 class="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3 flex justify-between">Pilih Ukuran <span class="text-red-500">*Wajib</span></h3>
                <div class="grid grid-cols-2 gap-3">${sizeOptions}</div>
            </div>
        `;
    }

    // 2. Opsi Gula (Sugar) - Jika diaktifkan
    if (menu.isSugarActive) {
        htmlVarian += `
            <div class="mb-5 dynamic-variant fade-in">
                <h3 class="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Kadar Gula</h3>
                <div class="grid grid-cols-2 gap-3">
                    <label class="relative cursor-pointer">
                        <input type="radio" name="detail_sugar" value="Normal (100%)" class="peer sr-only" checked onchange="hitungTotalHargaDetail()">
                        <div class="p-2 border-2 border-gray-200 rounded-xl text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 transition"><p class="text-xs font-black text-gray-800">Normal</p></div>
                    </label>
                    <label class="relative cursor-pointer">
                        <input type="radio" name="detail_sugar" value="Less Sugar (50%)" class="peer sr-only" onchange="hitungTotalHargaDetail()">
                        <div class="p-2 border-2 border-gray-200 rounded-xl text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 transition"><p class="text-xs font-black text-gray-800">Less</p></div>
                    </label>
                </div>
            </div>
        `;
    }

    // 3. Opsi Es (Ice) - Jika diaktifkan
    if (menu.isIceActive) {
        htmlVarian += `
            <div class="mb-5 dynamic-variant fade-in">
                <h3 class="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">Kadar Es</h3>
                <div class="grid grid-cols-2 gap-3">
                    <label class="relative cursor-pointer">
                        <input type="radio" name="detail_ice" value="Normal Ice" class="peer sr-only" checked onchange="hitungTotalHargaDetail()">
                        <div class="p-2 border-2 border-gray-200 rounded-xl text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 transition"><p class="text-xs font-black text-gray-800">Normal</p></div>
                    </label>
                    <label class="relative cursor-pointer">
                        <input type="radio" name="detail_ice" value="Less Ice" class="peer sr-only" onchange="hitungTotalHargaDetail()">
                        <div class="p-2 border-2 border-gray-200 rounded-xl text-center peer-checked:border-amber-500 peer-checked:bg-amber-50 transition"><p class="text-xs font-black text-gray-800">Less</p></div>
                    </label>
                </div>
            </div>
        `;
    }

    // Suntikkan ke HTML tepat di bawah deskripsi
    document.getElementById('detail-desc').insertAdjacentHTML('afterend', htmlVarian);
}

// ============================================================================
// C. LOGIKA KALKULASI HARGA & QTY
// ============================================================================

window.ubahQtyDetail = function(delta) {
    let newQty = STATE.activeQty + delta;
    if (newQty < 1) newQty = 1; // Minimal qty 1
    
    // Batasi maksimum pembelian sesuai stok (portion) yang tersedia
    if (newQty > STATE.activeMenu.portion) {
        alert(`Maaf, sisa stok menu ini hanya ${STATE.activeMenu.portion} porsi.`);
        return;
    }

    STATE.activeQty = newQty;
    document.getElementById('detail-qty').innerText = STATE.activeQty;
    hitungTotalHargaDetail();
};

window.hitungTotalHargaDetail = function() {
    if (!STATE.activeMenu) return;

    // 1. Ambil Harga Dasar (Prioritaskan Promo)
    let basePrice = STATE.activeMenu.promoPrice > 0 ? STATE.activeMenu.promoPrice : STATE.activeMenu.normalPrice;
    
    // 2. Tambah Harga Ukuran (Size Charge) jika ada
    let sizeCharge = 0;
    const sizeInput = document.querySelector('input[name="detail_size"]:checked');
    if (sizeInput) {
        const parts = sizeInput.value.split('|');
        sizeCharge = parseFloat(parts[1]) || 0;
    }

    // 3. Kalkulasi Akhir
    const unitPrice = basePrice + sizeCharge;
    STATE.activePrice = unitPrice * STATE.activeQty;

    // 4. Update Tampilan ke Tombol HTML[span_2](start_span)[span_2](end_span)
    const priceEl = document.getElementById('detail-total-price');
    if (priceEl) priceEl.innerText = formatRupiah(STATE.activePrice);
};


// ============================================================================
// D. MASUKKAN KE KERANJANG & ANIMASI FLOATING BUTTON
// ============================================================================

window.tambahKeKeranjang = function() {
    if (!STATE.activeMenu) return;

    // Ekstrak Data Varian Terpilih
    const sizeInput = document.querySelector('input[name="detail_size"]:checked');
    const sugarInput = document.querySelector('input[name="detail_sugar"]:checked');
    const iceInput = document.querySelector('input[name="detail_ice"]:checked');

    let selectedSize = sizeInput ? sizeInput.value.split('|')[0] : 'Regular';
    let selectedSugar = sugarInput ? sugarInput.value : 'Normal (100%)';
    let selectedIce = iceInput ? iceInput.value : 'Normal Ice';

    // Susun Catatan Varian (Notes)
    let notesArr = [];
    if (STATE.activeMenu.isSizeActive) notesArr.push(`Size: ${selectedSize}`);
    if (STATE.activeMenu.isSugarActive) notesArr.push(`Gula: ${selectedSugar}`);
    if (STATE.activeMenu.isIceActive) notesArr.push(`Es: ${selectedIce}`);
    
    // Hitung Harga Satuan
    const unitPrice = STATE.activePrice / STATE.activeQty;

    // Buat Objek Keranjang
    const cartItem = {
        cartId: Date.now().toString(), // ID unik per item di keranjang
        menuId: STATE.activeMenu.id,
        name: STATE.activeMenu.name,
        image: STATE.activeMenu.image || 'logo-192.png',
        qty: STATE.activeQty,
        unitPrice: unitPrice,
        totalPrice: STATE.activePrice,
        notes: notesArr.join(', ')
    };

    // Push ke State Global
    STATE.cart.push(cartItem);
    
    // Update Badge & Tutup Modal
    updateCartBadge();
    closeModalDetail();
    
    // Beri Feedback Visual Singkat
    alert(`${STATE.activeMenu.name} berhasil ditambahkan ke keranjang!`);
};

window.updateCartBadge = function() {
    const badgeEl = document.getElementById('cart-badge');
    const floatBtn = document.getElementById('btn-cart-floating'); // HTML Tombol Mengambang[span_3](start_span)[span_3](end_span)
    
    if (badgeEl && floatBtn) {
        if (STATE.cart.length > 0) {
            badgeEl.innerText = STATE.cart.length;
            floatBtn.classList.remove('hidden');
            floatBtn.classList.add('flex');
            
            // Trigger efek bounce singkat
            floatBtn.classList.remove('animate-bounce');
            void floatBtn.offsetWidth; // Trigger DOM reflow
            floatBtn.classList.add('animate-bounce');
        } else {
            floatBtn.classList.add('hidden');
            floatBtn.classList.remove('flex');
        }
    }
};
