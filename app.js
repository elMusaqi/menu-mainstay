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
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 4: Modal Checkout, Kalkulasi Total, & Pengiriman Order ke Firebase
 */

import { push, set, ref, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi firebase db dan formatRupiah sudah ada di Bagian 1)

// ============================================================================
// A. BUKA/TUTUP MODAL & RENDER LIST KERANJANG
// ============================================================================

window.bukaModalCheckout = function() {
    const modalEl = document.getElementById('checkout-modal');
    if (!modalEl) return;

    if (STATE.cart.length === 0) {
        alert("Keranjang Anda masih kosong. Silakan pilih menu terlebih dahulu.");
        return;
    }

    renderCheckoutList();
    
    modalEl.classList.remove('hidden');
    modalEl.classList.add('flex'); // Pakai flex agar modal rata tengah sesuai HTML Anda
};

window.closeModalCheckout = function() {
    const modalEl = document.getElementById('checkout-modal');
    if (modalEl) {
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
    }
};

function renderCheckoutList() {
    const listContainer = document.getElementById('checkout-list');
    if (!listContainer) return;

    let htmlList = '';
    STATE.checkoutInfo.subtotal = 0; // Reset hitungan

    STATE.cart.forEach((item) => {
        STATE.checkoutInfo.subtotal += item.totalPrice;

        // Desain List Keranjang Sesuai Tema UI Anda
        htmlList += `
            <div class="flex gap-3 mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0 items-center">
                <div class="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-gray-200 shadow-sm">
                    <img src="${item.image}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                    <h4 class="font-black text-gray-900 text-sm leading-tight">${item.name}</h4>
                    <p class="text-[9px] text-gray-500 font-bold mb-1">${item.notes || 'Tanpa catatan'}</p>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs font-black text-amber-500">${item.qty}x ${formatRupiah(item.unitPrice)}</span>
                        <span class="font-black text-gray-900 text-sm">${formatRupiah(item.totalPrice)}</span>
                    </div>
                </div>
                <button onclick="hapusItemKeranjang('${item.cartId}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shrink-0 shadow-sm">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        `;
    });

    listContainer.innerHTML = htmlList;
    
    // Set Grand Total (Untuk tampilan Customer, Grand Total = Subtotal)
    STATE.checkoutInfo.grandTotal = STATE.checkoutInfo.subtotal;
    
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) totalEl.innerText = formatRupiah(STATE.checkoutInfo.grandTotal);
}

// ============================================================================
// B. HAPUS ITEM DARI KERANJANG
// ============================================================================

window.hapusItemKeranjang = function(cartId) {
    // Saring cart, buang item yang ID-nya cocok
    STATE.cart = STATE.cart.filter(item => item.cartId !== cartId);
    
    window.updateCartBadge(); // Update ikon bubble floating button (Dari Bagian 3)
    
    if (STATE.cart.length === 0) {
        closeModalCheckout(); // Jika keranjang habis, tutup modal otomatis
    } else {
        renderCheckoutList(); // Render ulang sisa item & harga
    }
};

// ============================================================================
// C. PROSES PENGIRIMAN ORDER KE DATABASE (CHECKOUT)
// ============================================================================

window.prosesCheckout = async function() {
    if (STATE.cart.length === 0) {
        alert("Keranjang kosong."); return;
    }

    // 1. Ambil Data Input dari Form HTML[span_1](start_span)[span_1](end_span)
    const customerName = document.getElementById('co-name').value.trim();
    const customerPhone = document.getElementById('co-phone').value.trim();
    const isMember = document.getElementById('co-member').checked;
    
    // Ambil Metode Pembayaran (Radio Button)
    const paymentRadio = document.querySelector('input[name="co_payment"]:checked');
    const paymentMethod = paymentRadio ? paymentRadio.value : 'Cash'; // Default Cash

    // 2. Validasi Wajib Isi
    if (!customerName) {
        alert("Mohon isi Nama Anda agar pesanan tidak tertukar.");
        document.getElementById('co-name').focus();
        return;
    }

    // 3. Susun Payload (Paket Data) untuk Firebase Sesuai Blueprint
    const orderId = `ORD-${Math.floor(Math.random() * 90000) + 10000}`; // Generate ID unik 5 digit
    
    const orderPayload = {
        orderId: orderId,
        timestamp: serverTimestamp(),
        // Tab System Kasir: Masuk sebagai 'pending_tab1'
        status: 'pending_tab1', 
        
        customerData: {
            name: customerName,
            wa: customerPhone,
            isMemberChecked: isMember
        },
        
        cartData: STATE.cart,
        
        financials: {
            subtotal: STATE.checkoutInfo.subtotal,
            discount: 0, // Diskon akan disetel oleh Kasir nanti
            ojolMarkup: 0,
            grandTotal: STATE.checkoutInfo.grandTotal,
            paymentMethod: paymentMethod, // 'Cash' atau 'QRIS'
            cashGiven: 0 // Belum dibayar, nanti kasir yang input
        },
        
        // Asumsi ini order langsung (Walk-in), bukan PO
        orderType: 'Walk-in',
        source: 'Self-Order'
    };

    try {
        // 4. Ubah Tombol Menjadi Loading
        const btnSubmit = document.querySelector('button[onclick="prosesCheckout()"]');
        const originalBtnText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> MEMPROSES...`;
        btnSubmit.disabled = true;

        // 5. Tembak ke Database /orders
        const orderRef = push(ref(db, 'orders'));
        await set(orderRef, orderPayload);

        // 6. Sukses & Reset Form
        alert(`Pesanan Berhasil Dibuat!\nID Pesanan: ${orderId}\n\nSilakan menuju kasir untuk melakukan pembayaran (${paymentMethod}).`);
        
        STATE.cart = []; // Kosongkan keranjang
        window.updateCartBadge();
        closeModalCheckout();
        
        // Kembalikan form ke kondisi awal
        document.getElementById('co-name').value = '';
        document.getElementById('co-phone').value = '';
        document.getElementById('co-member').checked = false;
        
        btnSubmit.innerHTML = originalBtnText;
        btnSubmit.disabled = false;

        // Bawa user scroll ke atas (kembali lihat banner)
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error("Gagal mengirim pesanan:", error);
        alert("Maaf, terjadi gangguan jaringan. Gagal mengirim pesanan.");
        
        // Kembalikan tombol jika gagal
        const btnSubmit = document.querySelector('button[onclick="prosesCheckout()"]');
        btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane text-amber-500"></i> KIRIM PESANAN KE KASIR`;
        btnSubmit.disabled = false;
    }
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 5: Cashier Dashboard, 3-Tab System, & Order Actions
 */

import { update, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi firebase db dan STATE sudah ada di Bagian 1)

// State khusus untuk navigasi Kasir
STATE.activeKasirTab = 'tab-pending'; // Default tab yang terbuka
STATE.allOrders = []; // Wadah untuk menampung semua pesanan hari ini

// ============================================================================
// A. NAVIGASI 3 TAB KASIR (BARU, DAPUR, SELESAI)
// ============================================================================

window.switchKasirTab = function(tabName) {
    STATE.activeKasirTab = tabName;
    
    // 1. Reset Semua Tombol Tab ke abu-abu (Tidak Aktif)[span_0](start_span)[span_0](end_span)
    const tabs = ['tab-pending', 'tab-proses', 'tab-selesai'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-${t}`);
        if (btn) {
            btn.className = `flex-1 py-2 text-[10px] font-black rounded-lg transition text-gray-500 hover:text-gray-900 text-center uppercase tracking-wide relative`;
        }
    });

    // 2. Warnai Tombol Tab yang Sedang Aktif (Amber/Kuning)[span_1](start_span)[span_1](end_span)
    const activeBtn = document.getElementById(`btn-${tabName}`);
    if (activeBtn) {
        activeBtn.className = `flex-1 py-2 text-[10px] font-black rounded-lg transition text-white bg-amber-500 shadow text-center uppercase tracking-wide relative`;
    }

    // 3. Render ulang daftar pesanan sesuai tab yang dipilih
    renderKasirOrders();
};

// ============================================================================
// B. LISTENER PESANAN REAL-TIME DARI FIREBASE
// ============================================================================

function initKasirOrdersListener() {
    const ordersRef = ref(db, 'orders');
    onValue(ordersRef, (snapshot) => {
        STATE.allOrders = [];
        let pendingCount = 0;

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const orderData = child.val();
                STATE.allOrders.push({ dbKey: child.key, ...orderData });
                
                // Hitung jumlah pesanan baru untuk lencana (badge)
                if (orderData.status === 'pending_tab1') {
                    pendingCount++;
                }
            });
        }

        // Update Lencana Merah (Badge Pending)[span_2](start_span)[span_2](end_span)
        const badgeEl = document.getElementById('badge-pending');
        if (badgeEl) {
            if (pendingCount > 0) {
                badgeEl.innerText = pendingCount;
                badgeEl.classList.remove('hidden');
                badgeEl.classList.add('flex');
            } else {
                badgeEl.classList.add('hidden');
                badgeEl.classList.remove('flex');
            }
        }

        // Render layar pesanan dan hitung uang laci
        renderKasirOrders();
        updateCashDrawerMonitor();
    });
}

// ============================================================================
// C. RENDER DAFTAR PESANAN KE LAYAR KASIR
// ============================================================================

function renderKasirOrders() {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;

    // Filter pesanan berdasarkan Tab Aktif
    let filteredOrders = [];
    if (STATE.activeKasirTab === 'tab-pending') {
        filteredOrders = STATE.allOrders.filter(o => o.status === 'pending_tab1');
    } else if (STATE.activeKasirTab === 'tab-proses') {
        filteredOrders = STATE.allOrders.filter(o => o.status === 'cooking_tab2');
    } else if (STATE.activeKasirTab === 'tab-selesai') {
        // Hanya tampilkan pesanan selesai hari ini
        const today = new Date().toLocaleDateString('en-CA');
        filteredOrders = STATE.allOrders.filter(o => {
            const orderDate = new Date(o.timestamp).toLocaleDateString('en-CA');
            return o.status === 'completed_tab3' && orderDate === today;
        });
    }

    // Jika Kosong
    if (filteredOrders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-10 flex flex-col items-center justify-center fade-in">
                <i class="fa-solid fa-mug-hot text-3xl text-gray-300 mb-3"></i>
                <p class="text-xs font-bold text-gray-400">Tidak ada pesanan di tab ini.</p>
            </div>
        `;
        return;
    }

    // Render Kartu Pesanan
    let htmlContent = '';
    // Sortir: Yang paling baru di atas
    filteredOrders.sort((a, b) => b.timestamp - a.timestamp).forEach(order => {
        const timeString = new Date(order.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        // Render List Item
        let itemDetails = '';
        let totalQty = 0;
        order.cartData.forEach(item => {
            totalQty += item.qty;
            itemDetails += `
                <div class="flex justify-between items-start mb-1 text-xs">
                    <span class="font-bold text-gray-800">${item.qty}x ${item.name}</span>
                </div>
                <div class="text-[9px] text-gray-500 font-bold mb-2 ml-4 leading-tight">${item.notes || ''}</div>
            `;
        });

        // Tentukan Tombol Aksi berdasarkan Tab
        let actionButtons = '';
        if (STATE.activeKasirTab === 'tab-pending') {
            actionButtons = `
                <button onclick="terimaPesanan('${order.dbKey}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-black shadow-[0_4px_10px_rgba(34,197,94,0.3)] transition">TERIMA & MASAK</button>
                <button onclick="batalPesanan('${order.dbKey}')" class="w-12 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-xl flex items-center justify-center transition"><i class="fa-solid fa-xmark"></i></button>
            `;
        } else if (STATE.activeKasirTab === 'tab-proses') {
            actionButtons = `
                <button onclick="selesaiPesanan('${order.dbKey}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-xs font-black shadow-[0_4px_10px_rgba(59,130,246,0.3)] transition">SELESAI MASAK</button>
            `;
        } else {
            actionButtons = `
                <div class="flex-1 bg-slate-100 text-slate-500 py-2 rounded-xl text-xs font-black text-center border border-slate-200">PESANAN SELESAI</div>
            `;
        }

        // Tampilan Kartu Pesanan
        htmlContent += `
            <div class="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm fade-in mb-3">
                <div class="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <div>
                        <h3 class="font-black text-lg text-gray-900 tracking-tight">${order.orderId}</h3>
                        <p class="text-[10px] font-bold text-gray-500 mt-0.5"><i class="fa-solid fa-user text-amber-500 mr-1"></i> ${order.customerData.name} ${order.customerData.isMemberChecked ? '<span class="text-green-500">(Member)</span>' : ''}</p>
                    </div>
                    <div class="text-right">
                        <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded-lg text-[9px] font-black">${timeString}</span>
                        <p class="text-[9px] font-black mt-1 text-gray-500 uppercase tracking-widest">${order.orderType} • ${order.financials.paymentMethod}</p>
                    </div>
                </div>
                
                <div class="mb-4">
                    ${itemDetails}
                </div>
                
                <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                    <span class="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Tagihan</span>
                    <span class="font-black text-amber-600 text-sm">${formatRupiah(order.financials.grandTotal)}</span>
                </div>
                
                <div class="flex gap-2">
                    ${actionButtons}
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlContent;
}

// ============================================================================
// D. FUNGSI AKSI PESANAN (UBAH STATUS)
// ============================================================================

window.terimaPesanan = async function(dbKey) {
    try {
        await update(ref(db, `orders/${dbKey}`), { status: 'cooking_tab2' });
        // Saat diterima, otomatis pindahkan layar kasir ke Tab Dapur agar tidak repot klik
        switchKasirTab('tab-proses');
    } catch (error) {
        alert("Gagal menerima pesanan. Periksa koneksi internet.");
    }
};

window.selesaiPesanan = async function(dbKey) {
    try {
        await update(ref(db, `orders/${dbKey}`), { status: 'completed_tab3' });
        switchKasirTab('tab-selesai');
    } catch (error) {
        alert("Gagal menyelesaikan pesanan.");
    }
};

window.batalPesanan = async function(dbKey) {
    const isConfirm = confirm("Yakin ingin membatalkan pesanan ini? Jika dibatalkan, pesanan tidak bisa dikembalikan.");
    if (!isConfirm) return;
    
    // (Opsional: Anda bisa tambahkan prompt PIN otorisasi Owner di sini jika mau)
    try {
        await update(ref(db, `orders/${dbKey}`), { status: 'void' });
        alert("Pesanan berhasil dibatalkan.");
    } catch (error) {
        alert("Gagal membatalkan pesanan.");
    }
};

// ============================================================================
// E. LIVE CASH DRAWER MONITOR (Menghitung Uang Fisik Laci)
// ============================================================================

function updateCashDrawerMonitor() {
    const today = new Date().toLocaleDateString('en-CA');
    let totalOmzet = 0;
    let targetFisikLaci = 0; // Hanya Uang Tunai (Cash)

    STATE.allOrders.forEach(order => {
        const orderDate = new Date(order.timestamp).toLocaleDateString('en-CA');
        
        // Hanya hitung pesanan yang sudah berstatus 'Selesai' pada hari ini
        if (order.status === 'completed_tab3' && orderDate === today) {
            totalOmzet += order.financials.grandTotal;
            
            // Hitung uang fisik laci jika pembayaran menggunakan Cash
            if (order.financials.paymentMethod === 'Cash') {
                targetFisikLaci += order.financials.grandTotal;
            }
        }
    });

    // Update Widget di HTML Kasir[span_3](start_span)[span_3](end_span)
    const omzetEl = document.getElementById('kasir-omzet-total');
    const laciEl = document.getElementById('kasir-drawer-target');
    
    if (omzetEl) omzetEl.innerText = formatRupiah(totalOmzet);
    if (laciEl) laciEl.innerText = formatRupiah(targetFisikLaci);
}

// Tambahkan inisialisasi ke dalam DOMContentLoaded utama (Suntik di bawah yang sebelumnya)
const prevDOMContentLoadedPart5 = window.onload;
window.onload = function() {
    if (prevDOMContentLoadedPart5) prevDOMContentLoadedPart5();
    // Jalankan listener pesanan
    initKasirOrdersListener();
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 6: Owner Dashboard Analytics & Inner Panel Navigation Injector
 */

import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan formatRupiah sudah ada)

// ============================================================================
// A. INJEKSI STRUKTUR 8 MODAL PANEL (Hemat Ruang HTML)
// ============================================================================

function injectOwnerPanels() {
    const container = document.getElementById('owner-inner-panels-container');
    if (!container) return;

    // Daftar 8 Panel sesuai tombol di HTML Anda
    const panels = [
        { id: 'panel-menu', title: 'Manajemen Katalog Menu', icon: 'fa-burger' },
        { id: 'panel-hrd', title: 'HRD & Manajemen Staff', icon: 'fa-users-gear' },
        { id: 'panel-inventory', title: 'Stok Bahan & Gudang', icon: 'fa-boxes-stacked' },
        { id: 'panel-laporan', title: 'Laporan Keuangan', icon: 'fa-chart-line' },
        { id: 'panel-promo', title: 'Promo & Voucher', icon: 'fa-ticket' },
        { id: 'panel-settings', title: 'Pengaturan Toko', icon: 'fa-store' },
        { id: 'panel-member', title: 'Loyalty Member & Stamp', icon: 'fa-crown' },
        { id: 'panel-database', title: 'Database & Backup', icon: 'fa-database' }
    ];

    let htmlPanels = '';

    panels.forEach(p => {
        // Membuat "Cangkang Modal" seragam untuk setiap panel
        htmlPanels += `
            <div id="${p.id}" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] hidden items-end sm:items-center justify-center fade-in pb-safe">
                <div class="bg-white w-full sm:w-[28rem] h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl flex flex-col relative overflow-hidden shadow-2xl panel-slide-up sm:animate-none">
                    
                    <!-- Header Panel -->
                    <div class="bg-gray-900 px-5 py-4 flex justify-between items-center shrink-0">
                        <h2 class="font-black text-white text-lg flex items-center gap-2">
                            <i class="fa-solid ${p.icon} text-amber-500"></i> ${p.title}
                        </h2>
                        <button onclick="closePanel('${p.id}')" class="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition shadow-sm">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                    
                    <!-- Konten Panel (Akan diisi oleh JS Bagian 7 dst) -->
                    <div id="${p.id}-content" class="flex-1 overflow-y-auto p-5 pb-32 hide-scrollbar bg-slate-50">
                        <div class="text-center py-10 flex flex-col items-center justify-center fade-in">
                            <i class="fa-solid fa-circle-notch fa-spin text-amber-500 text-3xl mb-3"></i>
                            <p class="text-xs font-bold text-gray-400">Memuat Modul...</p>
                        </div>
                    </div>
                    
                </div>
            </div>
        `;
    });

    container.innerHTML = htmlPanels;
}

// ============================================================================
// B. FUNGSI BUKA / TUTUP PANEL
// ============================================================================

window.openPanel = function(panelId) {
    const panelEl = document.getElementById(panelId);
    if (panelEl) {
        panelEl.classList.remove('hidden');
        panelEl.classList.add('flex'); // Pakai flex untuk alignment HTML
    } else {
        alert("Modul belum tersedia atau sedang dalam pengembangan.");
    }
};

window.closePanel = function(panelId) {
    const panelEl = document.getElementById(panelId);
    if (panelEl) {
        panelEl.classList.add('hidden');
        panelEl.classList.remove('flex');
    }
};


// ============================================================================
// C. LIVE ANALYTICS DASHBOARD OWNER (Hitung Omzet & Laba Bersih)
// ============================================================================

function initOwnerDashboardListener() {
    const ordersRef = ref(db, 'orders');
    const expensesRef = ref(db, 'expenses'); // Jika ada tabel pengeluaran operasional

    // 1. Pantau Seluruh Order
    onValue(ordersRef, (snapshot) => {
        let omzetHariIni = 0;
        let labaBersihBulanIni = 0;
        let totalHPP = 0;

        const todayDate = new Date().toLocaleDateString('en-CA'); // Format YYYY-MM-DD
        const currentMonth = todayDate.substring(0, 7); // Format YYYY-MM

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const order = child.val();
                if (order.status === 'completed_tab3') {
                    const orderDateStr = new Date(order.timestamp).toLocaleDateString('en-CA');
                    const orderMonthStr = orderDateStr.substring(0, 7);

                    // A. Hitung Omzet Hari Ini (Penjualan Kasar)
                    if (orderDateStr === todayDate) {
                        omzetHariIni += order.financials.grandTotal;
                    }

                    // B. Hitung Laba Bersih Bulan Ini
                    if (orderMonthStr === currentMonth) {
                        labaBersihBulanIni += order.financials.grandTotal; // Tambah Pemasukan
                        
                        // Potong Modal Bahan (HPP/COGS) dari setiap item terjual
                        order.cartData.forEach(item => {
                            const menuMaster = STATE.menus.find(m => m.id === item.menuId);
                            const itemHPP = menuMaster ? (menuMaster.cogs || 0) : 0;
                            totalHPP += (itemHPP * item.qty);
                        });
                    }
                }
            });
        }

        // Potong HPP dari Total Pemasukan Bulanan
        labaBersihBulanIni = labaBersihBulanIni - totalHPP;
        STATE.tempLabaSebelumBeban = labaBersihBulanIni;

        // Render ke Layar Owner
        renderDashboardOwner(omzetHariIni, labaBersihBulanIni);
    });

    // 2. Pantau Pengeluaran Operasional (Expenses) untuk Laba Bersih Akurat
    onValue(expensesRef, (snapshot) => {
        const todayDate = new Date().toLocaleDateString('en-CA');
        const currentMonth = todayDate.substring(0, 7);
        let totalBebanBulanIni = 0;

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                const exp = child.val();
                if (exp.dateString && exp.dateString.startsWith(currentMonth)) {
                    totalBebanBulanIni += (exp.nominal || 0);
                }
            });
        }

        // Kalkulasi Final Laba Bersih (Pemasukan - HPP - Beban Operasional)
        const finalNetProfit = (STATE.tempLabaSebelumBeban || 0) - totalBebanBulanIni;
        
        const profitEl = document.getElementById('owner-profit-month'); // Sesuai ID di HTML Anda[span_1](start_span)[span_1](end_span)
        if (profitEl) {
            profitEl.innerText = formatRupiah(finalNetProfit);
            // Ubah warna teks jika rugi (merah)
            profitEl.className = finalNetProfit >= 0 ? "text-base font-black text-green-500" : "text-base font-black text-red-500";
        }
    });
}

function renderDashboardOwner(omzetHariIni, labaBersihSementata) {
    const omzetEl = document.getElementById('owner-omzet-today'); // Sesuai ID di HTML Anda[span_2](start_span)[span_2](end_span)
    const profitEl = document.getElementById('owner-profit-month'); // Sesuai ID di HTML Anda[span_3](start_span)[span_3](end_span)
    
    if (omzetEl) omzetEl.innerText = formatRupiah(omzetHariIni);
    
    // Profit ditampilkan sementara (akan dipotong beban operasional oleh listener expenses di atas)
    if (profitEl && !STATE.tempLabaSebelumBeban) {
        profitEl.innerText = formatRupiah(labaBersihSementata);
    }
}


// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT (TAMBAHAN PART 6)
// ============================================================================
const prevDOMContentLoadedPart6 = window.onload;
window.onload = function() {
    if (prevDOMContentLoadedPart6) prevDOMContentLoadedPart6();
    injectOwnerPanels(); // Bangun 8 Modal Panel
    initOwnerDashboardListener(); // Nyalakan Mesin Penghitung Uang
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 7: Owner Panel - Injeksi UI & CRUD Katalog Menu + Kategori
 */

import { push, set, update, remove, ref } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan window.formatRupiah sudah aktif)

let editMenuId = null;

// ============================================================================
// A. INJEKSI ANTARMUKA (UI) PANEL MENU
// ============================================================================

function injectPanelMenuUI() {
    const contentEl = document.getElementById('panel-menu-content');
    if (!contentEl) return;

    // Menyuntikkan HTML Form dan Tabel ke dalam modal Panel Menu
    contentEl.innerHTML = `
        <!-- TAB NAVIGASI INTERNAL PANEL -->
        <div class="flex gap-2 mb-4 bg-slate-200/50 p-1 rounded-xl">
            <button onclick="switchMenuTab('tab-katalog')" id="btn-tab-katalog" class="flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition">Katalog Menu</button>
            <button onclick="switchMenuTab('tab-kategori')" id="btn-tab-kategori" class="flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition">Kategori</button>
        </div>

        <!-- AREA 1: KATALOG MENU -->
        <div id="area-katalog">
            <button onclick="bukaFormMenuOwner()" class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl shadow-sm mb-4 transition flex justify-center items-center gap-2">
                <i class="fa-solid fa-plus"></i> TAMBAH MENU BARU
            </button>
            
            <!-- Form Tambah/Edit Menu (Sembunyi secara default) -->
            <div id="form-menu-container" class="hidden bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
                <h3 id="form-menu-title" class="font-black text-gray-800 border-b pb-2 mb-3">Tambah Menu Baru</h3>
                <form id="form-menu-utama" onsubmit="simpanMenuOwner(event)">
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Nama Menu</label>
                            <input type="text" id="input-menu-name" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-amber-500 outline-none" required>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Kategori</label>
                            <select id="input-menu-category" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-amber-500 outline-none" required>
                                <!-- Opsi kategori akan diisi oleh JS -->
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Harga Jual</label>
                            <input type="number" id="input-menu-price" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" required>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Harga Promo (Coret)</label>
                            <input type="number" id="input-menu-promo" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" placeholder="Opsional">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">HPP / Modal</label>
                            <input type="number" id="input-menu-cogs" class="w-full border rounded-lg p-2 text-sm font-bold outline-none border-red-200 bg-red-50" required>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Stok (Porsi)</label>
                            <input type="number" id="input-menu-portion" class="w-full border rounded-lg p-2 text-sm font-bold outline-none border-blue-200 bg-blue-50" required>
                        </div>
                    </div>

                    <div class="mb-3">
                        <label class="text-[10px] font-bold text-gray-500">URL Gambar (Logo / Link)</label>
                        <input type="text" id="input-menu-image" class="w-full border rounded-lg p-2 text-sm outline-none" placeholder="Contoh: logo-192.png">
                    </div>

                    <div class="bg-amber-50 border border-amber-100 p-3 rounded-xl mb-4">
                        <p class="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Konfigurasi Fitur & Variasi</p>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <label class="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" id="check-bestseller" class="w-4 h-4 text-amber-500 rounded"> Badge Best Seller
                            </label>
                            <label class="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" id="check-ice" class="w-4 h-4 text-amber-500 rounded"> Opsi Level Es
                            </label>
                            <label class="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" id="check-sugar" class="w-4 h-4 text-amber-500 rounded"> Opsi Level Gula
                            </label>
                            <label class="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                <input type="checkbox" id="check-size" class="w-4 h-4 text-amber-500 rounded"> Opsi Ukuran (+Rp)
                            </label>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        <button type="button" onclick="tutupFormMenuOwner()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-black transition">BATAL</button>
                        <button type="submit" class="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-black transition"><i class="fa-solid fa-save"></i> SIMPAN MENU</button>
                    </div>
                </form>
            </div>

            <!-- List Menu Tersimpan -->
            <div id="list-menu-owner" class="flex flex-col gap-2"></div>
        </div>

        <!-- AREA 2: KATEGORI MENU (Tersembunyi secara default) -->
        <div id="area-kategori" class="hidden">
            <div class="flex gap-2 mb-4">
                <input type="text" id="input-kategori-baru" placeholder="Nama Kategori Baru..." class="flex-1 border border-gray-300 rounded-xl p-3 text-sm font-bold focus:border-amber-500 outline-none">
                <button onclick="tambahKategoriOwner()" class="bg-gray-900 text-white px-5 rounded-xl font-black text-sm shadow hover:bg-black transition">Tambah</button>
            </div>
            <div id="list-kategori-owner" class="flex flex-col gap-2"></div>
        </div>
    `;
}

// ============================================================================
// B. NAVIGASI INTERNAL PANEL MENU
// ============================================================================

window.switchMenuTab = function(tabId) {
    const btnKatalog = document.getElementById('btn-tab-katalog');
    const btnKategori = document.getElementById('btn-tab-kategori');
    const areaKatalog = document.getElementById('area-katalog');
    const areaKategori = document.getElementById('area-kategori');

    if(tabId === 'tab-katalog') {
        btnKatalog.className = "flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition";
        btnKategori.className = "flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition";
        areaKatalog.classList.remove('hidden');
        areaKategori.classList.add('hidden');
        renderTabelMenuOwner();
    } else {
        btnKategori.className = "flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition";
        btnKatalog.className = "flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition";
        areaKategori.classList.remove('hidden');
        areaKatalog.classList.add('hidden');
        renderTabelKategoriOwner();
    }
};

// ============================================================================
// C. LOGIKA KATALOG MENU (CRUD)
// ============================================================================

window.renderTabelMenuOwner = function() {
    const listEl = document.getElementById('list-menu-owner');
    if (!listEl) return;

    if (STATE.menus.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Belum ada menu di database.</p>`;
        return;
    }

    let html = '';
    STATE.menus.forEach(menu => {
        const hpp = menu.cogs || 0;
        const profitMargin = menu.normalPrice - hpp;
        
        // Logika Status Tersedia / Habis
        const isHabis = menu.portion <= 0 || menu.status === 'Habis';
        const statusBtn = isHabis 
            ? `<button onclick="toggleStokMenu('${menu.id}', 'Habis')" class="bg-red-100 text-red-600 px-2 py-1 rounded text-[9px] font-black">HABIS</button>`
            : `<button onclick="toggleStokMenu('${menu.id}', 'Tersedia')" class="bg-green-100 text-green-600 px-2 py-1 rounded text-[9px] font-black">TERSEDIA</button>`;

        html += `
            <div class="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3 w-2/3">
                    <img src="${menu.image || 'logo-192.png'}" class="w-12 h-12 object-cover rounded-lg border border-gray-100">
                    <div class="overflow-hidden">
                        <h4 class="font-black text-gray-800 text-sm truncate">${menu.name}</h4>
                        <div class="text-[9px] text-gray-500 flex gap-2 font-bold">
                            <span>Jual: <span class="text-amber-500">${formatRupiah(menu.normalPrice)}</span></span>
                            <span>Modal: <span class="text-red-500">${formatRupiah(hpp)}</span></span>
                        </div>
                        <div class="text-[9px] font-bold text-gray-400 mt-1">Porsi: ${menu.portion} | Margin: ${formatRupiah(profitMargin)}</div>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                    ${statusBtn}
                    <div class="flex gap-1 mt-1">
                        <button onclick="bukaFormMenuOwner('${menu.id}')" class="w-7 h-7 bg-blue-50 text-blue-500 rounded flex items-center justify-center hover:bg-blue-500 hover:text-white transition"><i class="fa-solid fa-pen text-[10px]"></i></button>
                        <button onclick="hapusMenuOwner('${menu.id}', '${menu.name}')" class="w-7 h-7 bg-red-50 text-red-500 rounded flex items-center justify-center hover:bg-red-500 hover:text-white transition"><i class="fa-solid fa-trash text-[10px]"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

window.bukaFormMenuOwner = function(menuId = null) {
    const formContainer = document.getElementById('form-menu-container');
    const formTitle = document.getElementById('form-menu-title');
    const selectCat = document.getElementById('input-menu-category');
    
    // Isi Dropdown Kategori
    if (selectCat) {
        selectCat.innerHTML = STATE.categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    document.getElementById('form-menu-utama').reset();
    editMenuId = menuId;

    if (menuId) {
        formTitle.innerText = "Edit Menu Tersimpan";
        const menu = STATE.menus.find(m => m.id === menuId);
        if (menu) {
            document.getElementById('input-menu-name').value = menu.name;
            document.getElementById('input-menu-category').value = menu.category;
            document.getElementById('input-menu-price').value = menu.normalPrice;
            document.getElementById('input-menu-promo').value = menu.promoPrice || '';
            document.getElementById('input-menu-cogs').value = menu.cogs || 0;
            document.getElementById('input-menu-portion').value = menu.portion || 0;
            document.getElementById('input-menu-image').value = menu.image || '';
            
            document.getElementById('check-bestseller').checked = menu.isBestSeller || false;
            document.getElementById('check-ice').checked = menu.isIceActive || false;
            document.getElementById('check-sugar').checked = menu.isSugarActive || false;
            document.getElementById('check-size').checked = menu.isSizeActive || false;
        }
    } else {
        formTitle.innerText = "Tambah Menu Baru";
    }

    formContainer.classList.remove('hidden');
    // Scroll form ke tampilan
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.tutupFormMenuOwner = function() {
    document.getElementById('form-menu-container').classList.add('hidden');
    editMenuId = null;
};

window.simpanMenuOwner = async function(event) {
    event.preventDefault();
    
    const namaMenu = document.getElementById('input-menu-name').value.trim();
    const portion = parseInt(document.getElementById('input-menu-portion').value) || 0;
    
    // Blueprint: Hardcode data size dummy untuk demo panel jika isSizeActive dicentang
    const isSizeActive = document.getElementById('check-size').checked;
    const defaultSizes = isSizeActive ? [
        { name: "Regular", charge: 0 }, 
        { name: "Large", charge: 3000 }
    ] : [];

    const payload = {
        name: namaMenu,
        category: document.getElementById('input-menu-category').value,
        normalPrice: parseFloat(document.getElementById('input-menu-price').value) || 0,
        promoPrice: parseFloat(document.getElementById('input-menu-promo').value) || 0,
        cogs: parseFloat(document.getElementById('input-menu-cogs').value) || 0,
        portion: portion,
        image: document.getElementById('input-menu-image').value.trim() || 'logo-192.png',
        status: portion > 0 ? 'Tersedia' : 'Habis',
        
        isBestSeller: document.getElementById('check-bestseller').checked,
        isIceActive: document.getElementById('check-ice').checked,
        isSugarActive: document.getElementById('check-sugar').checked,
        isSizeActive: isSizeActive,
        sizes: defaultSizes 
    };

    try {
        if (editMenuId) {
            await update(ref(db, `menus/${editMenuId}`), payload);
            alert(`Menu "${namaMenu}" berhasil di-update!`);
        } else {
            await set(push(ref(db, 'menus')), payload);
            alert(`Menu "${namaMenu}" berhasil ditambahkan!`);
        }
        tutupFormMenuOwner();
        // Render tabel tidak perlu dipanggil manual, karena STATE akan terupdate oleh Listener Firebase di Bagian 2
    } catch (e) {
        alert("Gagal menyimpan menu ke database.");
    }
};

window.hapusMenuOwner = async function(menuId, menuName) {
    const pin = prompt(`Menghapus menu bersifat permanen.\nMasukkan Master PIN Owner untuk menghapus "${menuName}":`);
    if (pin !== "888888") {
        alert("Otorisasi gagal. PIN salah."); return;
    }
    
    try {
        await remove(ref(db, `menus/${menuId}`));
        alert(`Menu "${menuName}" dihapus.`);
    } catch (e) { alert("Gagal menghapus."); }
};

window.toggleStokMenu = async function(menuId, currentStatus) {
    const newStatus = currentStatus === 'Tersedia' ? 'Habis' : 'Tersedia';
    const menu = STATE.menus.find(m => m.id === menuId);
    
    let newPortion = menu.portion;
    if (newStatus === 'Tersedia' && newPortion <= 0) {
        const konfirm = confirm("Porsi menu saat ini 0. Ingin mereset porsi menjadi 50 agar menu bisa Tersedia?");
        if (!konfirm) return;
        newPortion = 50;
    }

    try {
        await update(ref(db, `menus/${menuId}`), { status: newStatus, portion: newPortion });
    } catch (e) { alert("Gagal mengubah status."); }
};

// ============================================================================
// D. LOGIKA KATEGORI (CRUD)
// ============================================================================

window.renderTabelKategoriOwner = function() {
    const listEl = document.getElementById('list-kategori-owner');
    if (!listEl) return;

    let html = '';
    STATE.categories.forEach(cat => {
        html += `
            <div class="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
                <span class="font-black text-gray-800 text-sm uppercase tracking-wide">${cat.name}</span>
                <button onclick="hapusKategoriOwner('${cat.id}', '${cat.name}')" class="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

window.tambahKategoriOwner = async function() {
    const val = document.getElementById('input-kategori-baru').value.trim();
    if (!val) return;
    try {
        await set(push(ref(db, 'categories')), { name: val });
        document.getElementById('input-kategori-baru').value = '';
        renderTabelKategoriOwner();
    } catch (e) { alert("Gagal tambah kategori"); }
};

window.hapusKategoriOwner = async function(catId, catName) {
    if(confirm(`Yakin hapus kategori "${catName}"?`)) {
        await remove(ref(db, `categories/${catId}`));
        renderTabelKategoriOwner();
    }
};

// Hook ke listener yang sudah ada agar data selalu ter-render saat Panel dibuka
const prevOnLoadPart7 = window.onload;
window.onload = function() {
    if (prevOnLoadPart7) prevOnLoadPart7();
    injectPanelMenuUI(); // Suntik HTML ke dalam cangkang modal
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 8: Owner Panel - Injeksi UI & CRUD HRD / Karyawan
 */

import { push, set, update, remove, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan window.formatRupiah sudah aktif)

let editStaffId = null;

// ============================================================================
// A. INJEKSI ANTARMUKA (UI) PANEL HRD
// ============================================================================

function injectPanelHrdUI() {
    const contentEl = document.getElementById('panel-hrd-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
        <!-- Tombol Tambah Staf -->
        <button onclick="bukaFormStaffOwner()" class="w-full bg-purple-500 hover:bg-purple-600 text-white font-black py-3 rounded-xl shadow-sm mb-4 transition flex justify-center items-center gap-2">
            <i class="fa-solid fa-user-plus"></i> DAFTARKAN STAF BARU
        </button>

        <!-- Form Karyawan (Tersembunyi secara default) -->
        <div id="form-staff-container" class="hidden bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5 fade-in">
            <h3 id="form-staff-title" class="font-black text-gray-800 border-b pb-2 mb-3">Form Karyawan</h3>
            <form id="form-staff-utama" onsubmit="simpanStaffOwner(event)">
                
                <!-- Profil Dasar -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Nama Lengkap</label>
                        <input type="text" id="input-staff-name" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-purple-500 outline-none" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Nomor WA</label>
                        <input type="tel" id="input-staff-wa" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-purple-500 outline-none" placeholder="Cth: 0812..." required>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="text-[10px] font-bold text-gray-500">Alamat Lengkap</label>
                    <input type="text" id="input-staff-address" class="w-full border rounded-lg p-2 text-sm focus:border-purple-500 outline-none">
                </div>

                <!-- Kepegawaian -->
                <div class="grid grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Status Pegawai</label>
                        <select id="input-staff-status" class="w-full border rounded-lg p-2 text-sm font-bold outline-none">
                            <option value="Pegawai Tetap">Pegawai Tetap</option>
                            <option value="Kontrak">Kontrak</option>
                            <option value="Part-Time">Part-Time</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">PIN Akses Kasir</label>
                        <input type="text" id="input-staff-pin" class="w-full border rounded-lg p-2 text-sm font-black tracking-widest text-center border-amber-300 bg-amber-50" placeholder="Cth: 123456" required>
                    </div>
                </div>

                <!-- Jam & Gaji -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Jam Masuk</label>
                        <input type="time" id="input-staff-shift-start" class="w-full border rounded-lg p-2 text-sm font-bold" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Jam Pulang</label>
                        <input type="time" id="input-staff-shift-end" class="w-full border rounded-lg p-2 text-sm font-bold" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Skema Gaji</label>
                        <select id="input-staff-salary-type" class="w-full border rounded-lg p-2 text-sm font-bold outline-none">
                            <option value="Per Bulan">Per Bulan</option>
                            <option value="Per Hari">Per Hari</option>
                            <option value="Per Jam">Per Jam</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Nominal Gaji</label>
                        <input type="number" id="input-staff-salary" class="w-full border rounded-lg p-2 text-sm font-bold text-green-600 outline-none" required>
                    </div>
                </div>

                <!-- Tombol Aksi -->
                <div class="flex gap-2">
                    <button type="button" onclick="tutupFormStaffOwner()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-black transition">BATAL</button>
                    <button type="submit" class="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-black transition"><i class="fa-solid fa-save"></i> SIMPAN STAF</button>
                </div>
            </form>
        </div>

        <!-- Area List Karyawan -->
        <div id="list-staff-owner" class="flex flex-col gap-3"></div>
    `;
}


// ============================================================================
// B. LISTENER FIREBASE (Tarik Data Staf secara Real-Time)
// ============================================================================

function initStaffListener() {
    const staffRef = ref(db, 'staff');
    onValue(staffRef, (snapshot) => {
        STATE.staffList = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.staffList.push({ id: child.key, ...child.val() });
            });
        }
        renderTabelStaffOwner();
    });
}


// ============================================================================
// C. LOGIKA RENDER, BUKA FORM, & CRUD STAF
// ============================================================================

function renderTabelStaffOwner() {
    const listEl = document.getElementById('list-staff-owner');
    if (!listEl) return;

    if (STATE.staffList.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Belum ada staf terdaftar.</p>`;
        return;
    }

    let html = '';
    STATE.staffList.forEach(staff => {
        // Formatting Nomor WA untuk Link Chat
        let waLink = staff.waNumber || '';
        if (waLink.startsWith('0')) waLink = '62' + waLink.substring(1);

        // Penentuan Warna Badge
        let badgeColor = 'bg-gray-100 text-gray-600';
        if (staff.employmentStatus === 'Pegawai Tetap') badgeColor = 'bg-blue-100 text-blue-600';
        if (staff.employmentStatus === 'Part-Time') badgeColor = 'bg-purple-100 text-purple-600';
        
        html += `
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div class="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400"><i class="fa-solid fa-user"></i></div>
                        <div>
                            <h4 class="font-black text-gray-800 text-sm">${staff.name}</h4>
                            <span class="inline-block ${badgeColor} px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1">${staff.employmentStatus}</span>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">PIN Akses</p>
                        <p class="font-black text-amber-500 tracking-widest">${staff.pin}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div><i class="fa-regular fa-clock mr-1 text-purple-400"></i> ${staff.shiftStart} - ${staff.shiftEnd}</div>
                    <div class="text-right"><i class="fa-solid fa-money-bill-wave mr-1 text-green-400"></i> ${formatRupiah(staff.salaryRate)} (${staff.salaryInterval})</div>
                </div>
                
                <div class="flex gap-2">
                    <a href="https://wa.me/${waLink}" target="_blank" class="flex-1 bg-green-50 text-green-600 text-center py-2 rounded-lg text-xs font-black hover:bg-green-500 hover:text-white transition shadow-sm"><i class="fa-brands fa-whatsapp"></i> CHAT</a>
                    <button onclick="bukaFormStaffOwner('${staff.id}')" class="flex-1 bg-blue-50 text-blue-500 text-center py-2 rounded-lg text-xs font-black hover:bg-blue-500 hover:text-white transition shadow-sm">EDIT</button>
                    <button onclick="hapusStaffOwner('${staff.id}', '${staff.name}')" class="w-10 bg-red-50 text-red-500 text-center py-2 rounded-lg text-xs font-black hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

window.bukaFormStaffOwner = function(staffId = null) {
    const formContainer = document.getElementById('form-staff-container');
    const formTitle = document.getElementById('form-staff-title');
    document.getElementById('form-staff-utama').reset();
    editStaffId = staffId;

    if (staffId) {
        formTitle.innerText = "Edit Profil Karyawan";
        const staff = STATE.staffList.find(s => s.id === staffId);
        if (staff) {
            document.getElementById('input-staff-name').value = staff.name;
            document.getElementById('input-staff-wa').value = staff.waNumber;
            document.getElementById('input-staff-address').value = staff.address || '';
            document.getElementById('input-staff-status').value = staff.employmentStatus;
            document.getElementById('input-staff-pin').value = staff.pin;
            
            document.getElementById('input-staff-shift-start').value = staff.shiftStart || '08:00';
            document.getElementById('input-staff-shift-end').value = staff.shiftEnd || '17:00';
            document.getElementById('input-staff-salary-type').value = staff.salaryInterval || 'Per Bulan';
            document.getElementById('input-staff-salary').value = staff.salaryRate || 0;
        }
    } else {
        formTitle.innerText = "Daftarkan Staf Baru";
    }

    formContainer.classList.remove('hidden');
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.tutupFormStaffOwner = function() {
    document.getElementById('form-staff-container').classList.add('hidden');
    editStaffId = null;
};

window.simpanStaffOwner = async function(event) {
    event.preventDefault();
    
    const nama = document.getElementById('input-staff-name').value.trim();
    const pin = document.getElementById('input-staff-pin').value.trim();
    
    // Keamanan Dasar
    if (pin === "888888") {
        alert("Peringatan: 888888 adalah Master PIN. Staf tidak boleh menggunakan PIN ini!"); return;
    }

    // Cek Bentrokan PIN (Apakah ada staf lain dengan PIN yang sama)
    const isPinExist = STATE.staffList.some(s => s.pin === pin && s.id !== editStaffId);
    if (isPinExist) {
        alert("Gagal: PIN ini sudah digunakan oleh staf lain. Buat kombinasi PIN yang berbeda!"); return;
    }

    const payload = {
        name: nama,
        waNumber: document.getElementById('input-staff-wa').value.trim(),
        address: document.getElementById('input-staff-address').value.trim(),
        employmentStatus: document.getElementById('input-staff-status').value,
        pin: pin,
        shiftStart: document.getElementById('input-staff-shift-start').value,
        shiftEnd: document.getElementById('input-staff-shift-end').value,
        salaryInterval: document.getElementById('input-staff-salary-type').value,
        salaryRate: parseFloat(document.getElementById('input-staff-salary').value) || 0,
        photoUrl: 'logo-192.png' // Fallback image standar
    };

    try {
        if (editStaffId) {
            await update(ref(db, `staff/${editStaffId}`), payload);
            alert(`Profil Karyawan "${nama}" berhasil di-update!`);
        } else {
            await set(push(ref(db, 'staff')), payload);
            alert(`Staf Baru "${nama}" berhasil didaftarkan! PIN aksesnya adalah: ${pin}`);
        }
        tutupFormStaffOwner();
    } catch (e) {
        alert("Gagal menyimpan data karyawan ke database.");
    }
};

window.hapusStaffOwner = async function(staffId, staffName) {
    const pinConfirm = prompt(`PERINGATAN HRD: Anda akan menghapus akses staf.\nMasukkan Master PIN (888888) untuk menghapus profil "${staffName}":`);
    
    if (pinConfirm !== "888888") {
        alert("Otorisasi gagal. Penghapusan dibatalkan."); return;
    }
    
    try {
        await remove(ref(db, `staff/${staffId}`));
        alert(`Profil Karyawan "${staffName}" telah dihapus.`);
    } catch (e) { alert("Gagal menghapus staf."); }
};

// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT (TAMBAHAN PART 8)
// ============================================================================
const prevOnLoadPart8 = window.onload;
window.onload = function() {
    if (prevOnLoadPart8) prevOnLoadPart8();
    injectPanelHrdUI(); // Menyuntikkan form ke dalam cangkang modal HRD
    initStaffListener(); // Menarik data staf dari database
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 9: Owner Panel (Loyalty Member) & Customer Stamp Checker Engine
 */

import { push, set, remove, ref, onValue, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan window.formatRupiah sudah aktif)

// ============================================================================
// A. INJEKSI ANTARMUKA (UI) PANEL MEMBER (SISI OWNER)
// ============================================================================

function injectPanelMemberUI() {
    const contentEl = document.getElementById('panel-member-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
        <div class="flex gap-2 mb-4 bg-slate-200/50 p-1 rounded-xl">
            <button onclick="switchMemberTab('tab-database')" id="btn-tab-database" class="flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition">Database Member</button>
            <button onclick="switchMemberTab('tab-reward')" id="btn-tab-reward" class="flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition">Atur Hadiah (Rewards)</button>
        </div>

        <!-- AREA 1: DATABASE MEMBER -->
        <div id="area-database-member">
            <div class="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
                <p class="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1"><i class="fa-solid fa-circle-info"></i> Info Sistem</p>
                <p class="text-xs text-amber-700 font-bold">Member akan otomatis terdaftar saat pelanggan melakukan Checkout (jika mencentang opsi Daftar Member).</p>
            </div>
            
            <div class="relative mb-4">
                <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="search-member-owner" onkeyup="renderTabelMemberOwner()" placeholder="Cari Nama / No. WA..." class="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:border-amber-500 shadow-sm transition">
            </div>

            <div id="list-member-owner" class="flex flex-col gap-2"></div>
        </div>

        <!-- AREA 2: ATUR HADIAH (LOYALTY REWARDS) -->
        <div id="area-reward-member" class="hidden">
            <div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
                <h3 class="font-black text-gray-800 border-b pb-2 mb-3">Tambah Opsi Hadiah</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Nama Hadiah</label>
                        <input type="text" id="input-reward-name" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-amber-500 outline-none" placeholder="Cth: Gratis 1 Es Kopi Susu">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Biaya Penukaran (Sesi)</label>
                        <input type="number" id="input-reward-cost" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-amber-500 outline-none" placeholder="Cth: 1 (Artinya butuh 1x penuh / 5 Stamp)">
                    </div>
                </div>
                <button onclick="simpanRewardOwner()" class="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-xs font-black transition shadow">SIMPAN HADIAH</button>
            </div>

            <div id="list-reward-owner" class="flex flex-col gap-2"></div>
        </div>
    `;
}

// ============================================================================
// B. NAVIGASI & LISTENER DATA (SISI OWNER)
// ============================================================================

window.switchMemberTab = function(tabId) {
    const btnDB = document.getElementById('btn-tab-database');
    const btnRw = document.getElementById('btn-tab-reward');
    const areaDB = document.getElementById('area-database-member');
    const areaRw = document.getElementById('area-reward-member');

    if(tabId === 'tab-database') {
        btnDB.className = "flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition";
        btnRw.className = "flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition";
        areaDB.classList.remove('hidden');
        areaRw.classList.add('hidden');
        renderTabelMemberOwner();
    } else {
        btnRw.className = "flex-1 py-2 text-xs font-black rounded-lg bg-amber-500 text-white shadow-sm transition";
        btnDB.className = "flex-1 py-2 text-xs font-black rounded-lg text-gray-500 hover:text-gray-900 transition";
        areaRw.classList.remove('hidden');
        areaDB.classList.add('hidden');
        renderTabelRewardOwner();
    }
};

function initLoyaltyListeners() {
    // 1. Tarik Data Member Database
    const memberRef = ref(db, 'members');
    onValue(memberRef, (snapshot) => {
        STATE.membersList = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.membersList.push({ wa: child.key, ...child.val() });
            });
        }
        renderTabelMemberOwner();
    });

    // 2. Tarik Data Hadiah (Rewards)
    const rewardRef = ref(db, 'loyalty_rewards');
    onValue(rewardRef, (snapshot) => {
        STATE.rewards = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.rewards.push({ id: child.key, ...child.val() });
            });
        }
        renderTabelRewardOwner();
    });
}

// ============================================================================
// C. LOGIKA RENDER & CRUD MEMBER/REWARD (SISI OWNER)
// ============================================================================

window.renderTabelMemberOwner = function() {
    const listEl = document.getElementById('list-member-owner');
    const searchInput = document.getElementById('search-member-owner');
    if (!listEl) return;

    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const filteredMembers = STATE.membersList.filter(m => 
        (m.name && m.name.toLowerCase().includes(query)) || 
        (m.wa && m.wa.includes(query))
    );

    if (filteredMembers.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Member tidak ditemukan.</p>`;
        return;
    }

    let html = '';
    filteredMembers.forEach(m => {
        // Logika Sesi & Stamp (1 Sesi = 5 Stamp)
        const stampKini = m.stamp || 0;
        const totalSesi = m.session || 0;
        
        let formatWa = m.wa || '';
        if (formatWa.startsWith('0')) formatWa = '62' + formatWa.substring(1);

        html += `
            <div class="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                    <h4 class="font-black text-gray-800 text-sm">${m.name}</h4>
                    <p class="text-[10px] text-gray-500 font-bold">${m.wa}</p>
                </div>
                <div class="text-right">
                    <div class="flex gap-2 mb-1 justify-end">
                        <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black">STAMP: ${stampKini}/5</span>
                        <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-black">SESI: ${totalSesi}</span>
                    </div>
                    <a href="https://wa.me/${formatWa}" target="_blank" class="text-[9px] font-black text-green-500 hover:underline"><i class="fa-brands fa-whatsapp"></i> Chat Member</a>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

window.renderTabelRewardOwner = function() {
    const listEl = document.getElementById('list-reward-owner');
    if (!listEl) return;

    if (STATE.rewards.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Belum ada daftar hadiah.</p>`;
        return;
    }

    let html = '';
    STATE.rewards.forEach(r => {
        html += `
            <div class="flex justify-between items-center bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
                <div>
                    <span class="font-black text-gray-800 text-sm block">${r.name}</span>
                    <span class="text-[10px] font-bold text-gray-500">Syarat: ${r.sessionCost} Sesi (Butuh ${r.sessionCost * 5} Stamp)</span>
                </div>
                <button onclick="hapusRewardOwner('${r.id}')" class="text-red-500 p-2 hover:bg-red-50 rounded-lg transition"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
    });
    listEl.innerHTML = html;
};

window.simpanRewardOwner = async function() {
    const name = document.getElementById('input-reward-name').value.trim();
    const cost = parseInt(document.getElementById('input-reward-cost').value);
    
    if(!name || isNaN(cost) || cost < 1) { 
        alert("Nama hadiah dan biaya penukaran (Sesi) wajib diisi dengan benar!"); return; 
    }

    try {
        await set(push(ref(db, 'loyalty_rewards')), { name: name, sessionCost: cost, isActive: true });
        document.getElementById('input-reward-name').value = '';
        document.getElementById('input-reward-cost').value = '';
        alert("Hadiah berhasil ditambahkan!");
    } catch(e) { alert("Gagal menambah hadiah."); }
};

window.hapusRewardOwner = async function(rId) {
    if(confirm("Hapus hadiah ini dari daftar?")) {
        await remove(ref(db, `loyalty_rewards/${rId}`));
    }
};


// ============================================================================
// D. MESIN CEK STAMP PELANGGAN (SISI PELANGGAN - Halaman Utama)
// ============================================================================

window.bukaModalStamp = function() {
    const modalEl = document.getElementById('modal-stamp'); // Binding ke ID HTML Anda[span_1](start_span)[span_1](end_span)
    const inputWa = document.getElementById('stamp-phone-check');
    const resultArea = document.getElementById('stamp-result-area');

    if (modalEl) {
        modalEl.classList.remove('hidden');
        modalEl.classList.add('flex');
        
        // Reset state
        if (inputWa) inputWa.value = '';
        if (resultArea) resultArea.classList.add('hidden');
    }
};

window.closeModalStamp = function() {
    const modalEl = document.getElementById('modal-stamp');
    if (modalEl) {
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
    }
};

window.cekStampMember = async function() {
    const inputWa = document.getElementById('stamp-phone-check').value.trim(); // Binding ke ID HTML Anda[span_2](start_span)[span_2](end_span)
    const resultArea = document.getElementById('stamp-result-area');
    const nameEl = document.getElementById('stamp-member-name');
    const countEl = document.getElementById('stamp-count-text');
    const dotsContainer = document.getElementById('stamp-visual-dots');

    if (!inputWa || inputWa.length < 10) {
        alert("Mohon masukkan nomor WhatsApp yang valid (Minimal 10 digit).");
        return;
    }

    try {
        const btnSubmit = document.querySelector('button[onclick="cekStampMember()"]');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Mencari...`;

        // Telepon Firebase (Cek path /members/NOMOR_WA)
        const memberSnap = await get(child(ref(db), `members/${inputWa}`));
        
        btnSubmit.innerHTML = originalText;

        if (memberSnap.exists()) {
            const memberData = memberSnap.val();
            const currentStamp = memberData.stamp || 0;
            const maxStamp = 5;

            // Render Hasil ke UI HTML Anda[span_3](start_span)[span_3](end_span)
            if (nameEl) nameEl.innerText = memberData.name.toUpperCase();
            if (countEl) countEl.innerText = `${currentStamp}/${maxStamp}`;
            
            // Buat Visual Bulatan Stamp (5 Bulatan)
            if (dotsContainer) {
                let dotsHtml = '';
                for (let i = 1; i <= maxStamp; i++) {
                    if (i <= currentStamp) {
                        // Stamp Terisi (Kuning Emas)
                        dotsHtml += `<div class="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm"><i class="fa-solid fa-mug-hot"></i></div>`;
                    } else {
                        // Stamp Kosong (Abu-abu)
                        dotsHtml += `<div class="w-6 h-6 bg-slate-200 rounded-full border border-slate-300"></div>`;
                    }
                }
                dotsContainer.innerHTML = dotsHtml;
            }

            // Tampilkan Area Hasil
            if (resultArea) {
                resultArea.classList.remove('hidden');
                resultArea.classList.add('fade-in');
            }

        } else {
            alert("Nomor WA belum terdaftar sebagai member. Silakan daftarkan diri Anda saat memesan!");
            if (resultArea) resultArea.classList.add('hidden');
        }

    } catch (error) {
        console.error("Gagal mengecek stamp:", error);
        alert("Terjadi gangguan saat mengecek database.");
    }
};

// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT (TAMBAHAN PART 9)
// ============================================================================
const prevOnLoadPart9 = window.onload;
window.onload = function() {
    if (prevOnLoadPart9) prevOnLoadPart9();
    injectPanelMemberUI(); // Menyuntikkan form ke dalam cangkang modal Member
    initLoyaltyListeners(); // Tarik data member dan hadiah dari DB
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 10: Owner Panel - Promo/Voucher Engine & Inventory (Stok Gudang)
 */

import { push, set, update, remove, ref, onValue, get, child } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan window.formatRupiah sudah aktif)

let editVoucherId = null;
let editInvId = null;

// ============================================================================
// A. INJEKSI ANTARMUKA (UI) PANEL PROMO & INVENTORY
// ============================================================================

function injectPromoAndInventoryUI() {
    // --- 1. INJEKSI UI PANEL PROMO ---
    const promoEl = document.getElementById('panel-promo-content');
    if (promoEl) {
        promoEl.innerHTML = `
            <button onclick="bukaFormVoucherOwner()" class="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-3 rounded-xl shadow-sm mb-4 transition flex justify-center items-center gap-2">
                <i class="fa-solid fa-plus"></i> BUAT KODE VOUCHER BARU
            </button>

            <!-- Form Voucher (Tersembunyi secara default) -->
            <div id="form-voucher-container" class="hidden bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5 fade-in">
                <h3 id="form-voucher-title" class="font-black text-gray-800 border-b pb-2 mb-3">Buat Voucher</h3>
                <form id="form-voucher-utama" onsubmit="simpanVoucherOwner(event)">
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Kode Voucher (Tanpa Spasi)</label>
                            <input type="text" id="input-vou-code" class="w-full border rounded-lg p-2 text-sm font-black tracking-widest uppercase focus:border-pink-500 outline-none" placeholder="Cth: MAINSTAY50" required>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Tipe Diskon</label>
                            <select id="input-vou-type" class="w-full border rounded-lg p-2 text-sm font-bold outline-none">
                                <option value="nominal">Nominal (Rp)</option>
                                <option value="percent">Persentase (%)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Nilai Diskon</label>
                            <input type="number" id="input-vou-value" class="w-full border rounded-lg p-2 text-sm font-bold text-pink-600 focus:border-pink-500 outline-none" required>
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Minimal Belanja (Rp)</label>
                            <input type="number" id="input-vou-min" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-pink-500 outline-none" required>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Target WA (Kosongkan jika untuk umum)</label>
                            <input type="tel" id="input-vou-target" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" placeholder="Cth: 08123456789">
                        </div>
                        <div>
                            <label class="text-[10px] font-bold text-gray-500">Berlaku Sampai (Kedaluwarsa)</label>
                            <input type="date" id="input-vou-valid" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" required>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 mb-4">
                        <input type="checkbox" id="input-vou-active" class="w-4 h-4 text-pink-500" checked>
                        <label class="text-xs font-bold text-gray-700">Voucher Aktif & Bisa Digunakan</label>
                    </div>

                    <div class="flex gap-2">
                        <button type="button" onclick="tutupFormVoucherOwner()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2.5 rounded-xl text-xs font-black transition">BATAL</button>
                        <button type="submit" class="flex-1 bg-gray-900 hover:bg-black text-white py-2.5 rounded-xl text-xs font-black transition"><i class="fa-solid fa-save"></i> SIMPAN VOUCHER</button>
                    </div>
                </form>
            </div>

            <!-- List Voucher -->
            <div id="list-voucher-owner" class="flex flex-col gap-3"></div>
        `;
    }

    // --- 2. INJEKSI UI PANEL INVENTORY (GUDANG) ---
    const invEl = document.getElementById('panel-inventory-content');
    if (invEl) {
        invEl.innerHTML = `
            <div class="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-4">
                <p class="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1"><i class="fa-solid fa-boxes-stacked"></i> Gudang Bahan Baku</p>
                <p class="text-xs text-orange-700 font-bold">Catat stok barang mentah (Cup, Sedotan, Susu, dll). Sistem akan memberi tanda merah jika stok menipis (<= 10).</p>
            </div>

            <form id="form-inv-utama" onsubmit="simpanInventoryOwner(event)" class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
                <div class="flex flex-wrap gap-2 items-end">
                    <div class="flex-1 min-w-[120px]">
                        <label class="text-[10px] font-bold text-gray-500">Nama Barang</label>
                        <input type="text" id="input-inv-name" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-orange-500 outline-none" required>
                    </div>
                    <div class="w-24">
                        <label class="text-[10px] font-bold text-gray-500">Stok Awal</label>
                        <input type="number" id="input-inv-stock" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-orange-500 outline-none" required>
                    </div>
                    <div class="w-24">
                        <label class="text-[10px] font-bold text-gray-500">Satuan</label>
                        <input type="text" id="input-inv-unit" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-orange-500 outline-none" placeholder="Pcs/Kg" required>
                    </div>
                    <button type="submit" class="bg-gray-900 text-white w-10 h-10 rounded-lg shadow hover:bg-black transition flex items-center justify-center">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </form>

            <!-- List Inventory -->
            <div id="list-inventory-owner" class="flex flex-col gap-2"></div>
        `;
    }
}

// ============================================================================
// B. LISTENER & CRUD PROMO VOUCHER
// ============================================================================

function initVoucherListener() {
    const vouRef = ref(db, 'vouchers');
    onValue(vouRef, (snapshot) => {
        STATE.vouchers = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.vouchers.push({ id: child.key, ...child.val() });
            });
        }
        renderTabelVoucherOwner();
    });
}

function renderTabelVoucherOwner() {
    const listEl = document.getElementById('list-voucher-owner');
    if (!listEl) return;

    if (STATE.vouchers.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Belum ada voucher aktif.</p>`;
        return;
    }

    let html = '';
    STATE.vouchers.forEach(v => {
        const isExpired = new Date(v.validUntil) < new Date();
        const badgeColor = v.isActive && !isExpired ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
        const badgeText = v.isActive && !isExpired ? 'AKTIF' : (isExpired ? 'KEDALUWARSA' : 'NONAKTIF');
        const discStr = v.discountType === 'percent' ? `${v.discountValue}%` : formatRupiah(v.discountValue);
        const targetStr = v.targetAudience ? `Khusus WA: ${v.targetAudience}` : 'Berlaku Umum';

        html += `
            <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-black text-pink-500 text-lg tracking-widest bg-pink-50 px-2 py-0.5 rounded border border-pink-100">${v.code}</h4>
                        <span class="${badgeColor} px-2 py-0.5 rounded text-[9px] font-black uppercase">${badgeText}</span>
                    </div>
                    <p class="text-xs font-bold text-gray-800">Diskon: ${discStr} <span class="text-gray-400">| Min: ${formatRupiah(v.minPurchase)}</span></p>
                    <p class="text-[10px] text-gray-500 font-bold mt-1"><i class="fa-solid fa-bullseye"></i> ${targetStr} • Berlaku s/d: ${new Date(v.validUntil).toLocaleDateString('id-ID')}</p>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="bukaFormVoucherOwner('${v.id}')" class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center hover:bg-blue-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-pen text-xs"></i></button>
                    <button onclick="hapusVoucherOwner('${v.id}', '${v.code}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

window.bukaFormVoucherOwner = function(vId = null) {
    const formContainer = document.getElementById('form-voucher-container');
    const formTitle = document.getElementById('form-voucher-title');
    document.getElementById('form-voucher-utama').reset();
    editVoucherId = vId;

    if (vId) {
        formTitle.innerText = "Edit Voucher";
        const v = STATE.vouchers.find(item => item.id === vId);
        if (v) {
            document.getElementById('input-vou-code').value = v.code;
            document.getElementById('input-vou-type').value = v.discountType;
            document.getElementById('input-vou-value').value = v.discountValue;
            document.getElementById('input-vou-min').value = v.minPurchase;
            document.getElementById('input-vou-target').value = v.targetAudience || '';
            document.getElementById('input-vou-valid').value = v.validUntil;
            document.getElementById('input-vou-active').checked = v.isActive;
        }
    } else {
        formTitle.innerText = "Buat Voucher Baru";
    }

    formContainer.classList.remove('hidden');
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.tutupFormVoucherOwner = function() {
    document.getElementById('form-voucher-container').classList.add('hidden');
    editVoucherId = null;
};

window.simpanVoucherOwner = async function(event) {
    event.preventDefault();
    
    const code = document.getElementById('input-vou-code').value.trim().toUpperCase();
    if (code.includes(' ')) {
        alert("Kode Voucher tidak boleh mengandung spasi!"); return;
    }

    const payload = {
        code: code,
        discountType: document.getElementById('input-vou-type').value,
        discountValue: parseFloat(document.getElementById('input-vou-value').value) || 0,
        minPurchase: parseFloat(document.getElementById('input-vou-min').value) || 0,
        targetAudience: document.getElementById('input-vou-target').value.trim() || '',
        validUntil: document.getElementById('input-vou-valid').value,
        isActive: document.getElementById('input-vou-active').checked
    };

    try {
        if (editVoucherId) {
            await update(ref(db, `vouchers/${editVoucherId}`), payload);
            alert(`Voucher ${code} berhasil diperbarui.`);
        } else {
            await set(push(ref(db, 'vouchers')), payload);
            alert(`Voucher ${code} berhasil diterbitkan!`);
        }
        tutupFormVoucherOwner();
    } catch (e) { alert("Gagal menyimpan voucher."); }
};

window.hapusVoucherOwner = async function(vId, vCode) {
    if (confirm(`Yakin ingin menghapus voucher ${vCode} secara permanen?`)) {
        await remove(ref(db, `vouchers/${vId}`));
    }
};

// ============================================================================
// C. LISTENER & CRUD INVENTORY (GUDANG)
// ============================================================================

function initInventoryListener() {
    const invRef = ref(db, 'inventory_raw');
    onValue(invRef, (snapshot) => {
        STATE.inventory = [];
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                STATE.inventory.push({ id: child.key, ...child.val() });
            });
        }
        renderTabelInventoryOwner();
    });
}

function renderTabelInventoryOwner() {
    const listEl = document.getElementById('list-inventory-owner');
    if (!listEl) return;

    if (STATE.inventory.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Gudang kosong.</p>`;
        return;
    }

    let html = '';
    STATE.inventory.forEach(item => {
        // Logika Alert Stok Menipis
        const isLow = item.stock <= 10;
        const stockColor = isLow ? 'text-red-600 bg-red-100' : 'text-gray-800 bg-gray-100';
        const alertIcon = isLow ? `<i class="fa-solid fa-triangle-exclamation text-red-500 animate-pulse" title="Stok Menipis!"></i> ` : '';

        html += `
            <div class="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                <div>
                    <h4 class="font-black text-gray-800 text-sm">${alertIcon}${item.name}</h4>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Sisa: <span class="font-black px-1.5 py-0.5 rounded ${stockColor}">${item.stock} ${item.unit}</span></p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="ubahStokInventory('${item.id}', -1)" class="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg shadow-sm hover:bg-orange-500 hover:text-white transition font-black">-</button>
                    <button onclick="ubahStokInventory('${item.id}', 1)" class="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg shadow-sm hover:bg-orange-500 hover:text-white transition font-black">+</button>
                    <div class="w-[1px] h-6 bg-gray-200 mx-1"></div>
                    <button onclick="hapusInventoryOwner('${item.id}', '${item.name}')" class="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shadow-sm"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
            </div>
        `;
    });
    listEl.innerHTML = html;
}

window.simpanInventoryOwner = async function(event) {
    event.preventDefault();
    const name = document.getElementById('input-inv-name').value.trim();
    const stock = parseInt(document.getElementById('input-inv-stock').value) || 0;
    const unit = document.getElementById('input-inv-unit').value.trim();

    try {
        await set(push(ref(db, 'inventory_raw')), { name, stock, unit });
        document.getElementById('form-inv-utama').reset();
    } catch (e) { alert("Gagal menambah barang gudang."); }
};

window.ubahStokInventory = async function(id, delta) {
    const item = STATE.inventory.find(i => i.id === id);
    if (!item) return;
    
    let newStock = item.stock + delta;
    if (newStock < 0) newStock = 0;

    try {
        await update(ref(db, `inventory_raw/${id}`), { stock: newStock });
    } catch (e) { alert("Gagal merubah stok."); }
};

window.hapusInventoryOwner = async function(id, name) {
    if (confirm(`Hapus barang "${name}" dari gudang?`)) {
        await remove(ref(db, `inventory_raw/${id}`));
    }
};

// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT (TAMBAHAN PART 10)
// ============================================================================
const prevOnLoadPart10 = window.onload;
window.onload = function() {
    if (prevOnLoadPart10) prevOnLoadPart10();
    injectPromoAndInventoryUI(); 
    initVoucherListener();
    initInventoryListener();
};
/**
 * MAINSTAY DRINK POS - FULL INTEGRATION SCRIPT
 * BAGIAN 11 (FINAL): Laporan Keuangan (Expenses), Pengaturan Toko, & Backup Database
 */

import { push, set, remove, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";
// (Asumsi db, STATE, dan window.formatRupiah sudah aktif)

// ============================================================================
// A. INJEKSI ANTARMUKA (UI) 3 PANEL TERAKHIR
// ============================================================================

function injectFinalPanelsUI() {
    // --- 1. INJEKSI UI PANEL LAPORAN KEUANGAN ---
    const lapEl = document.getElementById('panel-laporan-content');
    if (lapEl) {
        lapEl.innerHTML = `
            <div class="bg-green-50 border border-green-200 p-4 rounded-xl mb-5">
                <p class="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1"><i class="fa-solid fa-money-bill-wave"></i> Pencatatan Pengeluaran Kas (Expenses)</p>
                <p class="text-xs text-green-700 font-bold">Catat pengeluaran harian seperti beli es batu, bensin, atau token listrik. Sistem akan otomatis memotongnya dari Total Laba Bersih bulanan Anda.</p>
            </div>

            <form id="form-expense-utama" onsubmit="simpanExpenseOwner(event)" class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Nama Pengeluaran</label>
                        <input type="text" id="input-exp-name" class="w-full border rounded-lg p-2 text-sm font-bold focus:border-green-500 outline-none" placeholder="Cth: Beli Es Batu" required>
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500">Kategori</label>
                        <select id="input-exp-cat" class="w-full border rounded-lg p-2 text-sm font-bold outline-none">
                            <option value="Operasional Harian">Operasional Harian</option>
                            <option value="Tagihan (Listrik/Air)">Tagihan (Listrik/Air)</option>
                            <option value="Transportasi">Transportasi</option>
                            <option value="Lain-lain">Lain-lain</option>
                        </select>
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="text-[10px] font-bold text-gray-500">Nominal (Rp)</label>
                    <input type="number" id="input-exp-amount" class="w-full border rounded-lg p-2 text-sm font-bold text-red-600 focus:border-green-500 outline-none" required>
                </div>
                
                <button type="submit" class="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-xs font-black transition shadow">CATAT PENGELUARAN KAS</button>
            </form>

            <h3 class="text-xs font-black text-gray-900 mb-3 uppercase tracking-wider">Histori Pengeluaran Bulan Ini</h3>
            <div id="list-expense-owner" class="flex flex-col gap-2"></div>
        `;
    }

    // --- 2. INJEKSI UI PANEL SETTINGS ---
    const setEl = document.getElementById('panel-settings-content');
    if (setEl) {
        setEl.innerHTML = `
            <!-- Master Toggle Toko Tutup -->
            <div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5 flex justify-between items-center">
                <div>
                    <h3 class="font-black text-gray-800 text-sm">Status Operasional Toko</h3>
                    <p class="text-[10px] text-gray-500 font-bold">Jika dimatikan, layar pelanggan akan memunculkan banner "Toko Tutup".</p>
                </div>
                <button id="btn-toggle-toko" onclick="toggleStatusTokoOwner()" class="w-16 h-8 bg-green-500 rounded-full relative shadow-inner transition-colors duration-300">
                    <div id="knob-toko" class="w-6 h-6 bg-white rounded-full absolute top-1 right-1 shadow transform transition-transform duration-300"></div>
                </button>
            </div>

            <!-- Setting Link Sosmed -->
            <div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm mb-5">
                <h3 class="font-black text-gray-800 border-b pb-2 mb-3">Tautan Sosial Media (Footer)</h3>
                <div class="flex flex-col gap-3 mb-4">
                    <div>
                        <label class="text-[10px] font-bold text-gray-500"><i class="fa-brands fa-whatsapp text-green-500"></i> Nomor WhatsApp Toko</label>
                        <input type="tel" id="input-set-wa" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" placeholder="08...">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500"><i class="fa-brands fa-instagram text-pink-500"></i> Link Instagram</label>
                        <input type="url" id="input-set-ig" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" placeholder="https://instagram.com/...">
                    </div>
                    <div>
                        <label class="text-[10px] font-bold text-gray-500"><i class="fa-brands fa-tiktok text-black"></i> Link TikTok</label>
                        <input type="url" id="input-set-tiktok" class="w-full border rounded-lg p-2 text-sm font-bold outline-none" placeholder="https://tiktok.com/...">
                    </div>
                </div>
                <button onclick="simpanSosmedOwner()" class="w-full bg-gray-900 hover:bg-black text-white py-3 rounded-xl text-xs font-black transition shadow">SIMPAN LINK SOSMED</button>
            </div>
        `;
    }

    // --- 3. INJEKSI UI PANEL DATABASE ---
    const dbEl = document.getElementById('panel-database-content');
    if (dbEl) {
        dbEl.innerHTML = `
            <div class="bg-cyan-50 border border-cyan-200 p-4 rounded-xl mb-5 text-center">
                <div class="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3"><i class="fa-solid fa-cloud-arrow-down"></i></div>
                <h3 class="font-black text-cyan-900 mb-1">Backup Database Utama</h3>
                <p class="text-xs text-cyan-700 font-bold mb-4">Unduh seluruh riwayat pesanan, profil staf, pengaturan menu, dan data member ke dalam satu file format JSON.</p>
                <button onclick="downloadDatabaseBackup()" class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-3 rounded-xl shadow-md transition">DOWNLOAD (.JSON)</button>
            </div>
            
            <div class="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
                <h3 class="font-black text-red-900 mb-1">Reset Data Bulanan</h3>
                <p class="text-xs text-red-700 font-bold mb-4">Fitur ini akan menghapus antrean order dan mereset nomor nota kembali ke 001. Membutuhkan Master PIN.</p>
                <button onclick="resetAntreanHarian()" class="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl shadow-md transition">TUTUP BUKU HARIAN</button>
            </div>
        `;
    }
}

// ============================================================================
// B. LOGIKA LAPORAN PENGELUARAN (EXPENSES)
// ============================================================================

function initExpenseListener() {
    const expRef = ref(db, 'expenses');
    onValue(expRef, (snapshot) => {
        const listEl = document.getElementById('list-expense-owner');
        if (!listEl) return;
        
        const todayDate = new Date().toLocaleDateString('en-CA');
        const currentMonth = todayDate.substring(0, 7);
        let html = '';
        let isEmpty = true;

        if (snapshot.exists()) {
            // Sort agar yang terbaru di atas
            const dataArr = [];
            snapshot.forEach(child => dataArr.push({ id: child.key, ...child.val() }));
            dataArr.sort((a, b) => b.timestamp - a.timestamp);

            dataArr.forEach(exp => {
                if (exp.dateString && exp.dateString.startsWith(currentMonth)) {
                    isEmpty = false;
                    const dateStr = new Date(exp.timestamp).toLocaleDateString('id-ID');
                    
                    html += `
                        <div class="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center justify-between">
                            <div>
                                <h4 class="font-black text-gray-800 text-sm">${exp.name}</h4>
                                <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">${exp.category} • ${dateStr}</p>
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="font-black text-red-500 text-sm">-${formatRupiah(exp.nominal)}</span>
                                <button onclick="hapusExpenseOwner('${exp.id}', '${exp.name}')" class="text-red-300 hover:text-red-500 transition"><i class="fa-solid fa-trash text-xs"></i></button>
                            </div>
                        </div>
                    `;
                }
            });
        }

        if (isEmpty) {
            listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-6">Tidak ada pengeluaran bulan ini.</p>`;
        } else {
            listEl.innerHTML = html;
        }
    });
}

window.simpanExpenseOwner = async function(event) {
    event.preventDefault();
    const name = document.getElementById('input-exp-name').value.trim();
    const category = document.getElementById('input-exp-cat').value;
    const amount = parseFloat(document.getElementById('input-exp-amount').value) || 0;

    const payload = {
        name: name,
        category: category,
        nominal: amount,
        timestamp: Date.now(),
        dateString: new Date().toLocaleDateString('en-CA')
    };

    try {
        await set(push(ref(db, 'expenses')), payload);
        document.getElementById('form-expense-utama').reset();
        alert(`Pengeluaran ${formatRupiah(amount)} berhasil dicatat.`);
    } catch (e) { alert("Gagal mencatat pengeluaran."); }
};

window.hapusExpenseOwner = async function(id, name) {
    if(confirm(`Hapus catatan pengeluaran "${name}"?`)) await remove(ref(db, `expenses/${id}`));
};

// ============================================================================
// C. LOGIKA PENGATURAN TOKO (SETTINGS) & SOSMED
// ============================================================================

window.toggleStatusTokoOwner = async function() {
    const currentState = STATE.storeSettings.isOpen !== false; // Default true
    const newState = !currentState;
    
    // Animasi tombol UI
    const btn = document.getElementById('btn-toggle-toko');
    const knob = document.getElementById('knob-toko');
    
    if (newState) {
        btn.classList.remove('bg-red-500'); btn.classList.add('bg-green-500');
        knob.classList.remove('left-1'); knob.classList.add('right-1');
    } else {
        btn.classList.remove('bg-green-500'); btn.classList.add('bg-red-500');
        knob.classList.remove('right-1'); knob.classList.add('left-1');
    }

    try {
        await set(ref(db, 'store_settings/isOpen'), newState);
        alert(newState ? "Toko DIBUKA. Pelanggan bisa memesan kembali." : "Toko DITUTUP. Pelanggan tidak bisa membuat pesanan.");
    } catch (e) { alert("Gagal mengubah status toko."); }
};

window.simpanSosmedOwner = async function() {
    const payload = {
        wa: document.getElementById('input-set-wa').value.trim(),
        ig: document.getElementById('input-set-ig').value.trim(),
        tiktok: document.getElementById('input-set-tiktok').value.trim()
    };
    try {
        await set(ref(db, 'store_settings/sosmed'), payload);
        alert("Tautan Sosial Media di halaman pelanggan berhasil diperbarui!");
    } catch (e) { alert("Gagal memperbarui link sosmed."); }
};

// Update UI toggle saat data dari Firebase masuk
function syncSettingsUI() {
    const btn = document.getElementById('btn-toggle-toko');
    const knob = document.getElementById('knob-toko');
    if (btn && knob && STATE.storeSettings) {
        const isOpen = STATE.storeSettings.isOpen !== false;
        if (isOpen) {
            btn.classList.replace('bg-red-500', 'bg-green-500');
            knob.classList.remove('left-1'); knob.classList.add('right-1');
        } else {
            btn.classList.replace('bg-green-500', 'bg-red-500');
            knob.classList.remove('right-1'); knob.classList.add('left-1');
        }
    }
}

// ============================================================================
// D. LOGIKA BACKUP DATABASE (.JSON)
// ============================================================================

window.downloadDatabaseBackup = async function() {
    try {
        const dbSnap = await get(ref(db));
        if (dbSnap.exists()) {
            const data = dbSnap.val();
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `Backup_MainstayPOS_${new Date().toLocaleDateString('id-ID')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert("Database berhasil didownload!");
        }
    } catch (e) { alert("Gagal mengunduh backup."); }
};

window.resetAntreanHarian = function() {
    const pin = prompt("Masukkan Master PIN (888888) untuk Tutup Buku dan mereset nomor antrean:");
    if (pin === "888888") {
        alert("Dalam implementasi nyata, fungsi ini akan membersihkan antrean `/orders` hari ini dan mengembalikan counter ke 001. Untuk keamanan demo, eksekusi pembersihan dinonaktifkan.");
    } else {
        alert("PIN Master salah.");
    }
};

// ============================================================================
// INISIALISASI SAAT HALAMAN DIMUAT (FINAL PART)
// ============================================================================
const prevOnLoadPart11 = window.onload;
window.onload = function() {
    if (prevOnLoadPart11) prevOnLoadPart11();
    injectFinalPanelsUI(); 
    initExpenseListener();
    
    // Sync toggle status toko sedikit tertunda agar state termuat
    setTimeout(syncSettingsUI, 2000); 
};
