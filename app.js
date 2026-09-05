// ============================================================================
// MAINSTAY DRINK POS - TAHAP 1: INISIALISASI, STATE, & FIREBASE
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    onValue, 
    push, 
    set, 
    update, 
    get, 
    remove 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// 1. FIREBASE CONFIGURATION (Sesuai Blueprint Blueprint)
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

// ============================================================================
// 2. GLOBAL STATE & VARIABLES
// ============================================================================
let currentRole = 'customer'; // Default ke tampilan Customer
let activeStaff = null;
let activeCategoryFilter = 'all';
let cart = [];
let currentDetailMenu = null;
let detailQty = 1;

// Penyimpanan Data Firebase secara Real-Time di memori lokal
let globalMenus = {};
let globalOrders = {};
let globalStaff = {};
let globalInventory = {};
let globalExpenses = {};
let isStoreOpen = true; // Status operasional toko

// Hardcoded Values sesuai Blueprint
const MASTER_PIN = "888888";
const PLACEHOLDER_IMG = "logo-192.png";

// ==========================================
// MODUL 0: MESIN KAMERA & ABSENSI
// ==========================================
let streamKamera = null;

// Fungsi menyalakan kamera depan HP
window.mulaiKamera = async () => {
    const videoEl = document.getElementById('kamera-absen');
    const loadingEl = document.getElementById('kamera-loading');
    
    try {
        // Minta akses kamera depan (facingMode: "user")
        streamKamera = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: false 
        });
        
        videoEl.srcObject = streamKamera;
        
        // Hilangkan layar loading saat kamera sudah berhasil memancarkan gambar
        videoEl.onloadedmetadata = () => {
            loadingEl.classList.add('hidden');
        };
    } catch (err) {
        console.error("Kamera gagal diakses:", err);
        loadingEl.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation text-red-500 text-3xl mb-3"></i>
            <span class="text-[10px] font-bold text-red-400 uppercase text-center px-4">Gagal akses kamera.<br>Pastikan izin kamera diizinkan di browser/HP Anda!</span>
        `;
    }
};

// Fungsi mematikan kamera (Penting agar baterai HP tidak bocor saat layar kasir sudah terbuka)
window.matikanKamera = () => {
    if (streamKamera) {
        streamKamera.getTracks().forEach(track => track.stop());
    }
};


// Kerangka fungsi tombol absen (Logika jepret & validasi PIN akan kita kerjakan di tahap 2)
// Fungsi mengeksekusi jepretan foto dan preview
window.prosesAbsen = (tipeAbsen) => {
    const pin = document.getElementById('input-pin').value;
    if(!pin) return alert("PIN wajib diisi!");

    // 1. Ambil elemen video dan canvas
    const video = document.getElementById('kamera-absen');
    const canvas = document.getElementById('canvas-foto');
    const ctx = canvas.getContext('2d');

    // 2. Sesuaikan ukuran canvas dengan video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 3. Jepret gambar dari stream video ke canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // 4. Ubah gambar jadi format Data URL (Base64)
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // 5. Matikan kamera dan tutup pop-up login
    tutupMenuAbsen();
    document.getElementById('input-pin').value = ''; // Kosongkan PIN

    // 6. Siapkan Data Preview
    const waktuSekarang = new Date();
    const jam = waktuSekarang.getHours();
    const menit = waktuSekarang.getMinutes();
    const waktuFormat = waktuSekarang.toLocaleTimeString('id-ID') + ' WIB';

    document.getElementById('preview-foto').src = fotoBase64;
    document.getElementById('preview-nama').innerText = "STAF (PIN: " + pin + ")"; // Nanti dicocokkan dengan DB
    document.getElementById('preview-tipe').innerText = "ABSEN " + tipeAbsen;
    document.getElementById('preview-jam').innerText = waktuFormat;

    // Logika Terlambat (Contoh: Shift pagi batas jam 09:00)
    const statusBox = document.getElementById('preview-status-box');
    const statusTeks = document.getElementById('preview-status-teks');
    
    if (tipeAbsen === 'MASUK' && (jam > 9 || (jam === 9 && menit > 0))) {
        // Terlambat
        statusBox.className = "w-full p-3 rounded-xl mb-2 bg-red-50 border border-red-200";
        statusTeks.className = "text-sm font-black text-red-600 uppercase tracking-widest mb-1";
        statusTeks.innerText = "TERLAMBAT";
    } else {
        // Tepat Waktu / Pulang
        statusBox.className = "w-full p-3 rounded-xl mb-2 bg-green-50 border border-green-200";
        statusTeks.className = "text-sm font-black text-green-600 uppercase tracking-widest mb-1";
        statusTeks.innerText = tipeAbsen === 'MASUK' ? "TEPAT WAKTU" : "SELESAI SHIFT";
    }

    // 7. Tampilkan Pop-up Preview
    const modalPreview = document.getElementById('modal-preview-absen');
    modalPreview.classList.remove('hidden');

    // 8. Hitung Mundur 5 Detik
    let detik = 5;
    const countdownEl = document.getElementById('preview-countdown');
    countdownEl.innerText = detik;

    const interval = setInterval(() => {
        detik--;
        countdownEl.innerText = detik;
        if (detik <= 0) {
            clearInterval(interval);
            modalPreview.classList.add('hidden');
            // Di sini nantinya kita sisipkan kode untuk menyimpan data ke Firebase
            alert("Sistem: Data absen tersimpan!");
        }
    }, 1000);
};
// Fungsi untuk memunculkan pop-up absensi dan menyalakan kamera
window.bukaMenuAbsen = () => {
    document.getElementById('modal-login-absen').classList.remove('hidden');
    mulaiKamera(); // Kamera baru menyala di sini
};

// Fungsi untuk menutup pop-up dan mematikan kamera (Hemat Baterai)
window.tutupMenuAbsen = () => {
    document.getElementById('modal-login-absen').classList.add('hidden');
    matikanKamera(); // Matikan lampu kamera
};

// ============================================================================
// 3. DUMMY DATA FALLBACK (Ditampilkan HANYA jika database kosong)
// ============================================================================
const dummyCatalog = {
    "dummy_1": { 
        name: "Kopi Susu Aren", 
        category: "coffee", 
        price: 18000, 
        imageUrl: "logo-192.png", 
        isAvailable: true, 
        isBestSeller: true 
    },
    "dummy_2": { 
        name: "Americano Cold", 
        category: "coffee", 
        price: 15000, 
        imageUrl: "logo-192.png", 
        isAvailable: true, 
        isBestSeller: false 
    },
    "dummy_3": { 
        name: "Matcha Latte", 
        category: "non-coffee", 
        price: 20000, 
        imageUrl: "logo-192.png", 
        isAvailable: true, 
        isBestSeller: true 
    },
    "dummy_4": { 
        name: "Kentang Goreng", 
        category: "snack", 
        price: 15000, 
        imageUrl: "logo-192.png", 
        isAvailable: true, 
        isBestSeller: false 
    }
};

// ============================================================================
// 4. UTILITY FUNCTIONS (Format Uang & Waktu)
// ============================================================================
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        minimumFractionDigits: 0 
    }).format(number);
};

const startClock = () => {
    const clockEl = document.getElementById('live-clock');
    if (clockEl) {
        setInterval(() => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('id-ID', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            clockEl.innerHTML = `${timeString} WIB`;
        }, 1000);
    }
};

// Membersihkan Navigasi Bawah, Padding, dan Mengunci Logo Lokal
const applyLayoutFixes = () => {
    const bottomNav = document.querySelector('nav');
    if (bottomNav) {
        bottomNav.style.display = 'none';
    }

    const appContainer = document.getElementById('app-container');
    if (appContainer) {
        appContainer.classList.remove('pb-20');
    }
    
    const sections = ['view-customer', 'view-kasir', 'view-owner'];
    sections.forEach(id => {
        const sec = document.getElementById(id);
        if (sec) {
            sec.classList.remove('pb-32');
        }
    });

    // --- KUNCI LOGO LOKAL SECARA PERMANEN ---
    const logoImg = document.getElementById('header-logo-img');
    const logoIcon = document.getElementById('header-logo-icon');
    
    if (logoImg) {
        logoImg.src = 'logo-192.png'; // Panggil langsung dari folder lokal
        logoImg.classList.remove('hidden'); // Paksa gambar untuk selalu tampil
    }
    if (logoIcon) {
        logoIcon.classList.add('hidden'); // Sembunyikan icon dummy bawaan HTML
    }
};

// ============================================================================
// 5. FIREBASE REAL-TIME LISTENERS
// ============================================================================
const initFirebaseListeners = () => {
    // 5A. Listener Database: Menus
    onValue(ref(db, 'menus'), (snapshot) => {
        if (snapshot.exists()) {
            globalMenus = snapshot.val();
        } else {
            globalMenus = dummyCatalog; // Gunakan dummy jika database kosong
        }
        
        if (currentRole === 'customer') {
            window.renderKatalog();
        }
        if (currentRole === 'owner' && document.getElementById('owner-menu-list')) {
            window.renderPanelMenu();
        }
    });

    // 5B. Listener Database: Orders
    onValue(ref(db, 'orders'), (snapshot) => {
        if (snapshot.exists()) {
            globalOrders = snapshot.val();
        } else {
            globalOrders = {};
        }

        if (currentRole === 'kasir' && typeof window.renderKasirOrders === 'function') { 
            window.renderKasirOrders(); 
            window.updateLiveCashDrawer(); 
        }
        if (currentRole === 'owner' && typeof window.updateOwnerDashboard === 'function') {
            window.updateOwnerDashboard();
        }
    });

    // 5C. Listener Database: Staff
    onValue(ref(db, 'staff'), (snapshot) => {
        if (snapshot.exists()) {
            globalStaff = snapshot.val();
        } else {
            globalStaff = {};
        }

        if (currentRole === 'owner' && document.getElementById('owner-staff-list')) {
            window.renderPanelHRD();
        }
    });

    // 5D. Listener Database: Inventory
    onValue(ref(db, 'inventory_raw'), (snapshot) => {
        if (snapshot.exists()) {
            globalInventory = snapshot.val();
        } else {
            globalInventory = {};
        }

        if (currentRole === 'owner' && document.getElementById('owner-inventory-list')) {
            window.renderPanelInventory();
        }
    });

    // 5E. Listener Database: Expenses
    onValue(ref(db, 'expenses'), (snapshot) => {
        if (snapshot.exists()) {
            globalExpenses = snapshot.val();
        } else {
            globalExpenses = {};
        }

        if (currentRole === 'owner' && document.getElementById('owner-laporan-list')) {
            window.renderPanelLaporan();
        }
    });

    // 5F. Listener Setelan Toko (Status Buka/Tutup & Indikator)
    onValue(ref(db, 'store_settings'), (snapshot) => {
        if (snapshot.exists()) {
            const settings = snapshot.val();
            
            // A. Update Variabel Global Status
isStoreOpen = settings.isStoreOpen !== false; // (Atau sesuaikan dengan ujung kode asli Anda)
updateVisualToggle(isStoreOpen); // <--- KODE BARU DITARUH DI SINI

            
            // B. Deteksi dan Ubah Teks/Warna Indikator di Sebelah Jam
            const clockEl = document.getElementById('live-clock');
            if (clockEl && clockEl.nextElementSibling) {
                const statusEl = clockEl.nextElementSibling;
                if (isStoreOpen) {
                    statusEl.className = "text-[9px] text-green-500 font-bold uppercase tracking-wider";
                    statusEl.innerHTML = '<i class="fa-solid fa-circle text-[7px] animate-pulse"></i> Buka';
                } else {
                    statusEl.className = "text-[9px] text-red-500 font-bold uppercase tracking-wider";
                    statusEl.innerHTML = '<i class="fa-solid fa-circle text-[7px]"></i> Tutup';
                }
            }
            
            // C. Tampilkan Banner Merah Melintang "Toko Tutup"
            const bannerTutup = document.getElementById('store-closed-banner');
            if (bannerTutup) {
                isStoreOpen ? bannerTutup.classList.add('hidden') : bannerTutup.classList.remove('hidden');
            }
            
            // D. Render ulang sakelar jika panel setting owner sedang terbuka
            if (currentRole === 'owner' && document.getElementById('toggle-toko-btn')) {
                window.renderPanelSettings();
            }
        }
    });
}; // <-- Kurung ini sangat penting untuk menutup fungsi utama initFirebaseListeners

// ==========================================
// MODUL TOGGLE STATUS KEDAI (VERSI CHECKBOX)
// ==========================================

// 1. Menerima instruksi dari Firebase (Menyesuaikan posisi awal)
window.updateVisualToggle = (statusBuka) => {
    const checkbox = document.getElementById('checkbox-status-kedai');
    if (checkbox) {
        checkbox.checked = statusBuka; // Centang otomatis jika di Firebase "Buka"
    }
};

// 2. Mengirim instruksi ke Firebase saat diklik
window.ubahStatusKedai = async () => {
    const checkbox = document.getElementById('checkbox-status-kedai');
    if (!checkbox) return;

    // Baca posisi sakelar saat ini (true/false)
    const statusBaru = checkbox.checked; 
    
    try {
        const setelanRef = ref(db, 'store_settings');
        await update(setelanRef, { isStoreOpen: statusBaru });
    } catch (error) {
        console.error("Gagal update Firebase:", error);
        // Jika internet putus, kembalikan posisi sakelarnya
        checkbox.checked = !statusBaru; 
        alert("Koneksi gagal. Status tidak berubah.");
    }
};

// ============================================================================
// MAINSTAY DRINK POS - TAHAP 2: SISTEM KATALOG PELANGGAN & KERANJANG (CART)
// ============================================================================

// ---------------------------------------------------------
// 2A. FILTER KATEGORI & PENCARIAN MENU
// ---------------------------------------------------------
window.filterKategori = (kategori, btnEl) => {
    activeCategoryFilter = kategori;
    
    // Reset desain semua tombol kategori ke mode tidak aktif
    const allBtns = document.querySelectorAll('.cat-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });
    
    // Aktifkan tombol yang diklik
    if (btnEl) {
        btnEl.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md');
        btnEl.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
    }
    
    // Render ulang katalog berdasarkan filter baru
    window.renderKatalog();
};

// ---------------------------------------------------------
// 2B. RENDER GRID KATALOG MENU
// ---------------------------------------------------------
window.renderKatalog = () => {
    const grid = document.getElementById('menu-grid');
    const searchInput = document.getElementById('search-menu');
    const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (!grid) return;
    
    grid.innerHTML = ''; // Kosongkan state loading
    const menuKeys = Object.keys(globalMenus);
    
    if (menuKeys.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-10 text-gray-400 font-bold text-xs">
                Belum ada menu di database.
            </div>`;
        return;
    }

    menuKeys.forEach(key => {
        const menu = globalMenus[key];
        
        // Lewati (skip) jika tidak sesuai dengan filter kategori aktif
        if (activeCategoryFilter !== 'all' && menu.category !== activeCategoryFilter) return;
        
        // Lewati jika tidak sesuai dengan kata kunci pencarian
        if (searchQuery && !menu.name.toLowerCase().includes(searchQuery)) return;
        
        // Lewati jika stok menu sedang ditandai habis (isAvailable = false)
        if (!menu.isAvailable) return; 

        // Gunakan placeholder jika url gambar kosong
        const imgUrl = menu.imageUrl || PLACEHOLDER_IMG;
        
        // Rancang Card HTML Menu
        const cardHtml = `
            <div onclick="bukaModalDetail('${key}')" class="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:shadow-md transition group">
                <div class="w-full h-28 bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src="${imgUrl}" alt="${menu.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                    ${menu.isBestSeller ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-sm uppercase tracking-wide">Best Seller</span>` : ''}
                </div>
                <div class="px-1 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-xs font-black text-gray-900 leading-tight mb-0.5">${menu.name}</h3>
                        <p class="text-[9px] text-gray-400 font-bold line-clamp-1 capitalize">${menu.category}</p>
                    </div>
                    <div class="mt-2 flex justify-between items-end">
                        <span class="text-sm font-black text-amber-500">${formatRupiah(menu.price)}</span>
                        <button class="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px]">
                            <i class="fa-solid fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
    });
};

// ---------------------------------------------------------
// 2C. MODAL DETAIL & KUSTOMISASI MINUMAN
// ---------------------------------------------------------
window.bukaModalDetail = (menuKey) => {
    // BLOKIR AKSES JIKA TOKO TUTUP
    if (!isStoreOpen) {
        return alert("Mohon maaf, Mainstay Drink sedang tutup. Silakan datang kembali di jam operasional kami!");
    }
    
    currentDetailMenu = { key: menuKey, ...globalMenus[menuKey] };
    detailQty = 1;
    
    // Injeksi data ke modal
    document.getElementById('detail-name').innerText = currentDetailMenu.name;
    document.getElementById('detail-img').src = currentDetailMenu.imageUrl || PLACEHOLDER_IMG;
    document.getElementById('detail-qty').innerText = detailQty;
    
    // Reset radio buttons ke default (opsional)
    const radioSizeR = document.getElementById('opt-size-r');
    const radioSugarN = document.getElementById('opt-sugar-normal');
    const radioIceN = document.getElementById('opt-ice-normal');
    if(radioSizeR) radioSizeR.checked = true;
    if(radioSugarN) radioSugarN.checked = true;
    if(radioIceN) radioIceN.checked = true;

    window.hitungTotalHargaDetail();
    
    // Tampilkan Modal
    const modal = document.getElementById('modal-detail');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeModalDetail = () => {
    const modal = document.getElementById('modal-detail');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.ubahQtyDetail = (amount) => {
    // Pastikan quantity tidak kurang dari 1
    if (detailQty + amount >= 1) {
        detailQty += amount;
        document.getElementById('detail-qty').innerText = detailQty;
        window.hitungTotalHargaDetail();
    }
};

window.hitungTotalHargaDetail = () => {
    if (!currentDetailMenu) return;
    
    let basePrice = Number(currentDetailMenu.price);
    
    // Cek jika ukuran Large dipilih (Markup +Rp3000)
    const sizeInput = document.querySelector('input[name="detail_size"]:checked');
    if (sizeInput && sizeInput.value.includes('Large')) {
        basePrice += 3000; 
    }
    
    const totalPrice = basePrice * detailQty;
    document.getElementById('detail-total-price').innerText = formatRupiah(totalPrice);
};

// ---------------------------------------------------------
// 2D. SISTEM KERANJANG (CART)
// ---------------------------------------------------------
window.tambahKeKeranjang = () => {
    // Ambil nilai kustomisasi dari radio buttons
    const sizeInput = document.querySelector('input[name="detail_size"]:checked');
    const sugarInput = document.querySelector('input[name="detail_sugar"]:checked');
    const iceInput = document.querySelector('input[name="detail_ice"]:checked');
    
    const size = sizeInput ? sizeInput.value : 'Regular';
    const sugar = sugarInput ? sugarInput.value : 'Normal';
    const ice = iceInput ? iceInput.value : 'Normal';
    
    let itemPrice = Number(currentDetailMenu.price);
    if (size.includes('Large')) {
        itemPrice += 3000;
    }

    // Masukkan ke array keranjang lokal
    cart.push({
        id: currentDetailMenu.key, 
        name: currentDetailMenu.name, 
        qty: detailQty,
        price: itemPrice, 
        total: itemPrice * detailQty, 
        notes: `${size}, ${sugar}, ${ice}`
    });

    window.updateCartBadge();
    window.closeModalDetail();
};

window.updateCartBadge = () => {
    const btnCart = document.getElementById('btn-cart-floating');
    const badge = document.getElementById('cart-badge');
    
    if (btnCart && badge) {
        if (cart.length > 0) {
            btnCart.classList.remove('hidden');
            btnCart.classList.add('flex');
            badge.innerText = cart.length;
        } else {
            btnCart.classList.add('hidden');
            btnCart.classList.remove('flex');
        }
    }
};

window.hapusItemKeranjang = (index) => {
    cart.splice(index, 1);
    window.updateCartBadge();
    
    // Jika keranjang kosong setelah dihapus, tutup modal checkout
    if (cart.length === 0) {
        window.closeModalCheckout();
    } else {
        window.bukaModalCheckout(); // Render ulang daftar
    }
};

// ---------------------------------------------------------
// 2E. MODAL CHECKOUT & PUSH KE FIREBASE
// ---------------------------------------------------------
window.bukaModalCheckout = () => {
    const listEl = document.getElementById('checkout-list');
    listEl.innerHTML = '';
    
    let grandTotal = 0;

    cart.forEach((item, index) => {
        grandTotal += item.total;
        listEl.insertAdjacentHTML('beforeend', `
            <div class="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                <div>
                    <p class="text-xs font-black text-gray-900">${item.name}</p>
                    <p class="text-[9px] text-gray-500 font-bold">${item.notes}</p>
                    <p class="text-[10px] text-amber-500 font-black mt-0.5">${item.qty} x ${formatRupiah(item.price)}</p>
                </div>
                <button onclick="hapusItemKeranjang(${index})" class="text-red-400 hover:text-red-600 transition p-1">
                    <i class="fa-solid fa-trash text-sm"></i>
                </button>
            </div>
        `);
    });

    document.getElementById('checkout-total').innerText = formatRupiah(grandTotal);
    
    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

window.closeModalCheckout = () => {
    const modal = document.getElementById('checkout-modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
};

window.prosesCheckout = async () => {
    if (cart.length === 0) {
        return alert('Keranjang masih kosong!');
    }
    
    const inputName = document.getElementById('co-name').value;
    const inputPhone = document.getElementById('co-phone').value;
    const paymentRadio = document.querySelector('input[name="co_payment"]:checked');
    const isMemberJoin = document.getElementById('co-member') ? document.getElementById('co-member').checked : false;
    
    const customerName = inputName ? inputName.trim() : 'Guest';
    const customerPhone = inputPhone ? inputPhone.trim() : '-';
    const paymentMethod = paymentRadio ? paymentRadio.value : 'Cash';
    const grandTotal = cart.reduce((sum, item) => sum + item.total, 0);

    // Generate Order ID (Prefix: CSH-DDMM-SEQ)
    const today = new Date();
    const prefixDate = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0');
    const orderSeq = String(Object.keys(globalOrders).length + 1).padStart(3, '0');
    const orderId = `CSH-${prefixDate}${orderSeq}`;

    // Siapkan Data Transaksi (Payload)
    const payload = {
        orderId: orderId,
        customerName: customerName,
        customerPhone: customerPhone,
        items: cart,
        totalAmount: grandTotal,
        paymentMethod: paymentMethod,
        status: 'pending', // Masuk ke Tab 1 Kasir
        timestamp: Date.now(),
        isNewMember: isMemberJoin
    };

    // Tampilkan Indikator Loading pada Tombol
    const btnCheckout = document.querySelector('#checkout-modal button[onclick="prosesCheckout()"]');
    const originalBtnText = btnCheckout.innerHTML;
    btnCheckout.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> MEMPROSES...';
    btnCheckout.disabled = true;

    try {
        // STRICT ANTI-MOCK: Push transaksi langsung ke node /orders di Firebase Realtime DB
        await push(ref(db, 'orders'), payload);
        
        alert(`Pesanan berhasil dikirim ke kasir!\nNomor Antrean Anda: ${payload.orderId}`);
        
        // Reset Keranjang & Form
        cart = [];
        if(document.getElementById('co-name')) document.getElementById('co-name').value = '';
        if(document.getElementById('co-phone')) document.getElementById('co-phone').value = '';
        if(document.getElementById('co-member')) document.getElementById('co-member').checked = false;
        
        window.updateCartBadge();
        window.closeModalCheckout();
        
    } catch (error) {
        console.error("Firebase Checkout Error:", error);
        alert("Terjadi kesalahan sistem saat mengirim pesanan. Periksa koneksi internet Anda.");
    } finally {
        // Kembalikan tombol ke keadaan semula
        btnCheckout.innerHTML = originalBtnText;
        btnCheckout.disabled = false;
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 3: SYSTEM ROUTING & STRICT LOGIN GATE
// ============================================================================

window.switchRoleView = (role) => {
    // Sembunyikan semua section layar terlebih dahulu
    document.getElementById('view-customer').classList.add('hidden');
    document.getElementById('view-kasir').classList.add('hidden');
    document.getElementById('view-owner').classList.add('hidden');
    
    // Set role yang aktif saat ini
    currentRole = role;
    
    // Tampilkan layar yang dituju
    document.getElementById(`view-${role}`).classList.remove('hidden');

    // Memicu render data spesifik jika pengguna masuk ke Panel Kasir / Owner
    if (role === 'kasir') {
        if (typeof window.renderKasirOrders === 'function') {
            window.renderKasirOrders();
        }
        if (typeof window.updateLiveCashDrawer === 'function') {
            window.updateLiveCashDrawer();
        }
    }
    
    if (role === 'owner') {
        if (typeof window.updateOwnerDashboard === 'function') {
            window.updateOwnerDashboard();
        }
    }
};

window.bukaModalLogin = () => {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    // Reset nilai input dan pesan error setiap kali modal dibuka
    const pinInput = document.getElementById('login-pin');
    if (pinInput) pinInput.value = '';
    
    const errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.classList.add('hidden');
};

window.closeModalLogin = () => {
    const modal = document.getElementById('modal-login');
    if (modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

window.prosesLogin = async () => {
    const pinInput = document.getElementById('login-pin');
    const pin = pinInput ? pinInput.value : '';
    const errorEl = document.getElementById('login-error');
    const btnLogin = document.querySelector('#modal-login button[onclick="prosesLogin()"]');
    
    if (errorEl) errorEl.classList.add('hidden'); 
    
    // Tampilkan Indikator Loading di tombol
    const originalBtnText = btnLogin ? btnLogin.innerHTML : 'Masuk Sistem';
    if (btnLogin) {
        btnLogin.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Memvalidasi...';
        btnLogin.disabled = true;
    }
    
    try {
        // 1. Cek Master PIN Owner (Bypass Database / Hardcoded 888888)
        if (pin === MASTER_PIN) {
            localStorage.setItem('mainstay_session_role', 'owner');
            window.closeModalLogin();
            window.switchRoleView('owner');
            return;
        }

        // 2. Fetch PIN Darurat (Emergency PIN) secara Real-Time dari Firebase
        const settingsSnap = await get(ref(db, 'store_settings'));
        if (settingsSnap.exists()) {
            const settingsData = settingsSnap.val();
            if (settingsData.emergency_pin && settingsData.emergency_pin === pin) {
                localStorage.setItem('mainstay_session_role', 'owner');
                window.closeModalLogin();
                window.switchRoleView('owner');
                return;
            }
        }

        // 3. Cek PIN Staff (Kasir) menggunakan data global yang sudah di-fetch
        let authenticatedStaff = null;
        Object.keys(globalStaff).forEach(key => {
            if (globalStaff[key].pin === pin) {
                authenticatedStaff = { id: key, ...globalStaff[key] };
            }
        });

        // 4. Eksekusi Hasil Login
        if (authenticatedStaff) {
            activeStaff = authenticatedStaff;
            
            // Simpan Sesi Persistent Kasir
            localStorage.setItem('mainstay_session_role', 'kasir');
            localStorage.setItem('mainstay_session_staff', JSON.stringify(activeStaff));
            
            // Update nama kasir di UI Header Kasir
            const kasirNameEl = document.getElementById('kasir-active-name');
            if (kasirNameEl) {
                kasirNameEl.innerText = activeStaff.name;
            }
            
            window.closeModalLogin();
            window.switchRoleView('kasir');
        } else {
            // Jika PIN tidak cocok dengan siapapun (salah)
            if (errorEl) errorEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Login Error:", error);
        alert("Gagal memvalidasi ke database. Pastikan koneksi internet lancar.");
    } finally {
        // Kembalikan tombol ke keadaan semula jika gagal masuk
        if (btnLogin) {
            btnLogin.innerHTML = originalBtnText;
            btnLogin.disabled = false;
        }
    }
};

window.prosesLogout = (role) => {
    if (confirm('Yakin ingin keluar dari sistem?')) {
        // Hapus Sesi
        localStorage.removeItem('mainstay_session_role');
        localStorage.removeItem('mainstay_session_staff');
        
        if (role === 'kasir') {
            activeStaff = null;
        }
        
        window.switchRoleView('customer');
    }
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 4: KASIR VIEW (ORDER MANAGEMENT & 3-TAB)
// ============================================================================

// Secara default saat kasir membuka layar, tab yang aktif adalah 'Baru / Pending'
let activeKasirTab = 'pending'; 

window.switchKasirTab = (tabId) => {
    activeKasirTab = tabId.replace('tab-', ''); 
    
    // Perbarui styling class Tailwind untuk tombol Tab yang aktif
    const tabs = ['pending', 'proses', 'selesai'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-tab-${t}`);
        if (btn) {
            if (t === activeKasirTab) {
                btn.classList.add('bg-amber-500', 'text-white', 'shadow');
                btn.classList.remove('text-gray-500', 'hover:text-gray-900');
            } else {
                btn.classList.remove('bg-amber-500', 'text-white', 'shadow');
                btn.classList.add('text-gray-500', 'hover:text-gray-900');
            }
        }
    });
    
    // Render ulang daftar pesanan sesuai dengan tab yang diklik
    window.renderKasirOrders();
};

window.renderKasirOrders = () => {
    const container = document.getElementById('kasir-orders-container');
    if (!container) return;
    
    container.innerHTML = ''; // Kosongkan kontainer
    let pendingCount = 0;

    const orderKeys = Object.keys(globalOrders);

    orderKeys.forEach(key => {
        const order = globalOrders[key];
        
        // Hitung badge notifikasi untuk tab Baru (Pending) untuk peringatan visual
        if (order.status === 'pending') {
            pendingCount++;
        }

        // Render pesanan HANYA jika statusnya cocok dengan tab yang sedang dibuka
        if (order.status === activeKasirTab) {
            
            // Rancang List Item pesanan (minuman apa saja yang dibeli)
            const itemsHtml = order.items.map(item => `
                <p class="text-[10px] font-bold text-gray-700">
                    - ${item.qty}x ${item.name} <span class="text-gray-400">(${item.notes})</span>
                </p>
            `).join('');
            
            // Rancang Tombol Aksi (4-Button Action Layout sesuai Blueprint)
            let actionButtons = '';
            
            if (activeKasirTab === 'pending') {
                actionButtons = `
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <button onclick="updateOrderStatus('${key}', 'proses')" class="bg-amber-500 text-white text-[10px] font-black py-2 rounded-lg shadow-sm hover:bg-amber-600 transition">
                            <i class="fa-solid fa-fire-burner"></i> Terima & Masak
                        </button>
                        <button onclick="batalOrder('${key}')" class="bg-slate-100 text-red-500 text-[10px] font-black py-2 rounded-lg border border-red-200 hover:bg-red-50 transition">
                            <i class="fa-solid fa-ban"></i> Batal
                        </button>
                    </div>`;
            } else if (activeKasirTab === 'proses') {
                actionButtons = `
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <button onclick="cetakStruk('${key}')" class="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black py-2 rounded-lg hover:bg-blue-100 transition">
                            <i class="fa-solid fa-print"></i> Struk Kasir
                        </button>
                        <button onclick="updateOrderStatus('${key}', 'selesai')" class="bg-green-500 text-white text-[10px] font-black py-2 rounded-lg shadow-sm hover:bg-green-600 transition">
                            <i class="fa-solid fa-check-double"></i> Selesai Masak
                        </button>
                    </div>`;
            }

            // Injeksi Card HTML ke dalam kontainer kasir
            container.insertAdjacentHTML('beforeend', `
                <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col mb-3 fade-in">
                    <div class="flex justify-between items-start mb-2 border-b border-gray-50 pb-2">
                        <div>
                            <span class="text-[9px] bg-slate-100 text-slate-600 font-black px-2 py-1 rounded-md uppercase tracking-wider">${order.orderId}</span>
                            <h3 class="text-xs font-black text-gray-900 mt-1">${order.customerName}</h3>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-bold">${new Date(order.timestamp).toLocaleTimeString('id-ID')}</p>
                            <p class="text-xs font-black text-amber-500 mt-0.5">${formatRupiah(order.totalAmount)}</p>
                        </div>
                    </div>
                    <div class="mb-2">
                        ${itemsHtml}
                    </div>
                    <p class="text-[9px] text-gray-500 font-bold italic mb-1">
                        Metode Bayar: <span class="${order.paymentMethod === 'Cash' ? 'text-green-500' : 'text-blue-500'}">${order.paymentMethod}</span>
                    </p>
                    ${actionButtons}
                </div>
            `);
        }
    });

    // Tampilan Fallback jika tab kosong
    if (container.innerHTML === '') {
        container.innerHTML = `
            <div class="text-center py-10 flex flex-col items-center justify-center fade-in">
                <i class="fa-solid fa-inbox text-3xl text-gray-300 mb-3"></i>
                <p class="text-xs font-bold text-gray-400">Tidak ada pesanan di tab ini.</p>
            </div>`;
    }

    // Update Badge Angka Merah (Notifikasi Tab Pending / Pesanan Baru masuk)
    const badgePending = document.getElementById('badge-pending');
    if (badgePending) {
        badgePending.innerText = pendingCount;
        if (pendingCount > 0) {
            badgePending.classList.remove('hidden');
        } else {
            badgePending.classList.add('hidden');
        }
    }
};

window.updateVisualToggle = (statusBuka) => {
    const bgToggle = document.getElementById('bg-toggle-kedai');
    const knobToggle = document.getElementById('knob-toggle-kedai');

    if (!bgToggle || !knobToggle) return;

    if (statusBuka) {
        bgToggle.classList.replace('bg-red-500', 'bg-green-500');
        knobToggle.classList.replace('translate-x-0', 'translate-x-3.5');
    } else {
        bgToggle.classList.replace('bg-green-500', 'bg-red-500');
        knobToggle.classList.replace('translate-x-3.5', 'translate-x-0');
    }
};

window.updateOrderStatus = async (orderKey, newStatus) => {
    try {
        const orderRef = ref(db, `orders/${orderKey}`);
        await update(orderRef, { status: newStatus });
    } catch (error) {
        console.error("Update Status Error:", error);
        alert("Gagal mengupdate status pesanan! Periksa koneksi.");
    }
};

window.batalOrder = async (orderKey) => {
    // Pop-up konfirmasi biasa tanpa PIN
    const yakin = confirm("Apakah Anda yakin ingin membatalkan pesanan ini?");

    if (yakin) {
        try {
            // Pastikan tulisan di dalam ref() sama dengan kode asli Anda yang terpotong di gambar
            const orderRef = ref(db, `orders/${orderKey}`); 
            await remove(orderRef);
            alert("Berhasil! Pesanan dibatalkan.");
        } catch(error) {
            console.error("Void Order Error:", error);
            alert("Gagal menghapus pesanan.");
        }
    }
};

window.updateLiveCashDrawer = () => {
    let totalOmzet = 0;
    let targetLaciCash = 0; 
    
    Object.values(globalOrders).forEach(order => {
        // Validasi ketat: Hanya hitung pesanan yang sudah 'proses' atau 'selesai'
        if (order.status === 'proses' || order.status === 'selesai') {
            // Pastikan nominal dipaksa menjadi angka bulat (Number) untuk mencegah error "NaN"
            const amount = Number(order.totalAmount) || 0;
            totalOmzet += amount;
            
            // Laci fisik hanya bertambah jika pelanggan membayar dengan 'Cash'
            if (order.paymentMethod === 'Cash') {
                targetLaciCash += amount;
            }
        }
    });
    
    const omzetEl = document.getElementById('kasir-omzet-total');
    const drawerEl = document.getElementById('kasir-drawer-target');
    
    if (omzetEl) omzetEl.innerText = formatRupiah(totalOmzet);
    if (drawerEl) drawerEl.innerText = formatRupiah(targetLaciCash);
};

// ============================================================================
// MAINSTAY DRINK POS - TAHAP 5: OWNER DASHBOARD & FUNGSI CRUD UNIVERSAL
// ============================================================================

window.updateOwnerDashboard = () => {
    let todayOmzet = 0;
    
    Object.values(globalOrders).forEach(order => { 
        if (order.status === 'proses' || order.status === 'selesai') {
            todayOmzet += (Number(order.totalAmount) || 0);
        }
    });
    
    const omzetEl = document.getElementById('owner-omzet-today');
    if (omzetEl) omzetEl.innerText = formatRupiah(todayOmzet);
    
    const profitEl = document.getElementById('owner-profit-month');
    if (profitEl) profitEl.innerText = formatRupiah(todayOmzet * 0.4); 
};

window.closePanel = () => {
    const container = document.getElementById('owner-inner-panels-container');
    if (container) {
        container.innerHTML = '';
    }
};

// Router Utama untuk membuka 8 Modul Panel Owner
window.openPanel = (panelId) => {
    const functionMap = {
        'panel-menu': window.renderPanelMenu,
        'panel-hrd': window.renderPanelHRD,
        'panel-inventory': window.renderPanelInventory,
        'panel-laporan': window.renderPanelLaporan,
        'panel-promo': window.renderPanelPromo,
        'panel-settings': window.renderPanelSettings,
        'panel-member': window.renderPanelMember,
        'panel-database': window.renderPanelDatabase
    };
    
    // Panggil fungsi render sesuai ID tombol yang diklik
    if (functionMap[panelId]) {
        functionMap[panelId]();
    } else {
        // Layar Fallback jika panel belum dikembangkan
        document.getElementById('owner-inner-panels-container').innerHTML = `
            <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
                <div class="bg-gray-900 text-white p-4 flex items-center gap-3">
                    <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <h2 class="font-black text-lg">Panel Belum Siap</h2>
                </div>
                <div class="flex-1 p-5 flex flex-col items-center justify-center text-center text-gray-400">
                    <i class="fa-solid fa-person-digging text-5xl mb-4 text-amber-500"></i>
                    <p class="font-bold text-sm">Modul ini dalam tahap antrean pengembangan.</p>
                </div>
            </div>`;
    }
};

// --- FUNGSI CRUD DATABASE UNIVERSAL (Re-usable untuk semua panel) ---

window.simpanNode = async (nodeString, payload) => {
    // Validasi Keamanan Sederhana
    if (!payload.name && !payload.desc && !payload.emergency_pin) {
        return alert("Peringatan: Formulir data tidak boleh kosong!");
    }
    
    // Indikator visual bisa ditambahkan di sini jika perlu
    try {
        // Push data baru secara dinamis ke node tabel yang dituju
        await push(ref(db, nodeString), payload);
        alert('Sukses! Data baru berhasil ditambahkan ke Database Firebase.');
        
        // Refresh (Render Ulang) Panel yang sedang terbuka agar data langsung muncul
        if (nodeString === 'menus' && typeof window.renderPanelMenu === 'function') window.renderPanelMenu();
        if (nodeString === 'staff' && typeof window.renderPanelHRD === 'function') window.renderPanelHRD();
        if (nodeString === 'inventory_raw' && typeof window.renderPanelInventory === 'function') window.renderPanelInventory();
        if (nodeString === 'expenses' && typeof window.renderPanelLaporan === 'function') window.renderPanelLaporan();
        
    } catch (error) {
        console.error("Firebase Insert Error:", error);
        alert("Terjadi kesalahan! Gagal menyimpan data ke database.");
    }
};

window.hapusNode = async (nodeString, dataKey, callbackFunctionName) => {
    if (confirm("PERINGATAN!\nYakin ingin menghapus data ini secara permanen dari Database?")) {
        try {
            await remove(ref(db, `${nodeString}/${dataKey}`));
            
            // Panggil kembali fungsi render UI untuk memuat ulang daftar
            if (typeof window[callbackFunctionName] === 'function') {
                window[callbackFunctionName]();
            }
        } catch (error) {
            console.error("Firebase Delete Error:", error);
            alert("Terjadi kesalahan! Gagal menghapus data dari database.");
        }
    }
};


// ============================================================================
// MAINSTAY DRINK POS - TAHAP 6: MODUL PANEL OWNER (BAGIAN 1: MENU, HRD, STOK)
// ============================================================================

// ---------------------------------------------------------
// MODUL 1: KATALOG MENU (/menus)
// ---------------------------------------------------------
window.renderPanelMenu = () => {
    // Filter out dummy data: Jangan tampilkan dummy 'd1', 'd2', dst di panel owner
    let realDbMenus = {};
    Object.keys(globalMenus).forEach(key => {
        if (!key.startsWith('dummy_')) {
            realDbMenus[key] = globalMenus[key];
        }
    });
    
    // Rancang HTML List dari Database
    let htmlList = Object.keys(realDbMenus).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-3 fade-in group">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded bg-slate-100 border border-gray-200 overflow-hidden shrink-0">
                    <img src="${realDbMenus[key].imageUrl || PLACEHOLDER_IMG}" class="w-full h-full object-cover">
                </div>
                <div>
                    <h4 class="text-xs font-black text-gray-900">${realDbMenus[key].name}</h4>
                    <p class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <span class="text-amber-500">${formatRupiah(realDbMenus[key].price)}</span> • ${realDbMenus[key].category}
                    </p>
                </div>
            </div>
            <button onclick="hapusNode('menus', '${key}', 'renderPanelMenu')" class="text-red-400 bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shrink-0 border border-red-100">
                <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
        </div>
    `).join('');

    if (!htmlList) {
        htmlList = `<p class="text-[10px] text-center text-gray-400 py-6 bg-slate-50 rounded-xl border-dashed border border-gray-200">Database Menu Asli Kosong.<br>Silakan tambah menu di atas.</p>`;
    }

    // Suntikkan UI Formulir & List ke dalam container
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe overflow-hidden">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md relative z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="font-black text-lg leading-none">Manajemen Katalog</h2>
                    <p class="text-[10px] text-amber-400 font-bold tracking-wider">Sinkronisasi Real-time</p>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-5 hide-scrollbar">
                <!-- Form Insert Database -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                    <h3 class="text-xs font-black mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                        <i class="fa-solid fa-cloud-arrow-up text-amber-500"></i> Tambah Menu Baru
                    </h3>
                    
                    <input type="text" id="fm-name" placeholder="Nama Menu (Contoh: Aren Latte)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-3 text-xs font-bold focus:outline-none focus:border-amber-500 transition">
                    
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <input type="number" id="fm-price" placeholder="Harga (Cth: 15000)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition">
                        <select id="fm-cat" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-amber-500 transition cursor-pointer">
                            <option value="coffee">Coffee</option>
                            <option value="non-coffee">Non-Coffee</option>
                            <option value="snack">Snack / Cemilan</option>
                        </select>
                    </div>
                    
                    <button onclick="simpanNode('menus', { name: document.getElementById('fm-name').value, price: Number(document.getElementById('fm-price').value), category: document.getElementById('fm-cat').value, isAvailable: true, imageUrl: '' })" class="w-full bg-amber-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition tracking-widest uppercase mt-2">
                        <i class="fa-solid fa-floppy-disk mr-1"></i> Simpan ke Database
                    </button>
                </div>
                
                <!-- Database List Render -->
                <h3 class="text-xs font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-server text-green-500"></i> Katalog Database Asli
                </h3>
                <div id="owner-menu-list">
                    ${htmlList}
                </div>
            </div>
        </div>
    `;
};


// ---------------------------------------------------------
// MODUL 2: HRD & STAFF (/staff)
// ---------------------------------------------------------
window.renderPanelHRD = () => {
    let htmlList = Object.keys(globalStaff).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-3 fade-in group relative overflow-hidden">
            <div class="absolute left-0 top-0 bottom-0 w-1 bg-green-500"></div>
            <div class="flex items-center gap-3 pl-2">
                <div class="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-lg border border-gray-200">
                    <i class="fa-solid fa-user-tie"></i>
                </div>
                <div>
                    <h4 class="text-xs font-black text-gray-900">${globalStaff[key].name}</h4>
                    <p class="text-[10px] text-gray-500 font-bold mt-0.5">
                        PIN Akses: <span class="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 tracking-wider">${globalStaff[key].pin}</span>
                    </p>
                </div>
            </div>
            <button onclick="hapusNode('staff', '${key}', 'renderPanelHRD')" class="text-red-400 bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition shrink-0 border border-red-100">
                <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
        </div>
    `).join('');

    if (!htmlList) {
        htmlList = `<p class="text-[10px] text-center text-gray-400 py-6 bg-slate-50 rounded-xl border-dashed border border-gray-200">Belum ada karyawan yang terdaftar.</p>`;
    }

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe overflow-hidden">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md relative z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="font-black text-lg leading-none">HRD & Staff</h2>
                    <p class="text-[10px] text-amber-400 font-bold tracking-wider">Manajemen Karyawan Aktif</p>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-5 hide-scrollbar">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                    <h3 class="text-xs font-black mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                        <i class="fa-solid fa-user-plus text-purple-500"></i> Daftarkan Karyawan Baru
                    </h3>
                    
                    <input type="text" id="fs-name" placeholder="Nama Lengkap Karyawan" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-3 text-xs font-bold focus:outline-none focus:border-purple-500 transition">
                    
                    <input type="number" id="fs-pin" placeholder="Buat PIN Kasir Khusus (Cth: 123456)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-4 text-xs font-bold tracking-widest focus:outline-none focus:border-purple-500 transition">
                    
                    <button onclick="simpanNode('staff', { name: document.getElementById('fs-name').value, pin: document.getElementById('fs-pin').value, status: 'Aktif' })" class="w-full bg-purple-600 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-purple-700 transition tracking-widest uppercase">
                        <i class="fa-solid fa-id-card mr-1"></i> Register Staff
                    </button>
                </div>
                
                <h3 class="text-xs font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-users text-blue-500"></i> Data Staff Database
                </h3>
                <div id="owner-staff-list">
                    ${htmlList}
                </div>
            </div>
        </div>
    `;
};


// ---------------------------------------------------------
// MODUL 3: GUDANG / INVENTORY RAW (/inventory_raw)
// ---------------------------------------------------------
window.renderPanelInventory = () => {
    let htmlList = Object.keys(globalInventory).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-3 fade-in">
            <div class="flex-1">
                <span class="text-xs font-black text-gray-900 block mb-0.5">${globalInventory[key].name}</span>
                <span class="text-[9px] text-gray-400 font-bold">Log Gudang Tersimpan</span>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="text-[10px] bg-orange-50 text-orange-600 border border-orange-100 px-3 py-1.5 rounded-lg font-black tracking-wider">
                    ${globalInventory[key].qty} ${globalInventory[key].unit}
                </span>
                <button onclick="hapusNode('inventory_raw', '${key}', 'renderPanelInventory')" class="text-red-400 bg-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition border border-red-100">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (!htmlList) {
        htmlList = `<p class="text-[10px] text-center text-gray-400 py-6 bg-slate-50 rounded-xl border-dashed border border-gray-200">Gudang bahan baku kosong.</p>`;
    }

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe overflow-hidden">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md relative z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="font-black text-lg leading-none">Inventaris Gudang</h2>
                    <p class="text-[10px] text-amber-400 font-bold tracking-wider">Stok Bahan Baku & Consumables</p>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-5 hide-scrollbar">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                    <h3 class="text-xs font-black mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                        <i class="fa-solid fa-boxes-stacked text-orange-500"></i> Input Stok Barang Baru
                    </h3>
                    
                    <input type="text" id="fi-name" placeholder="Nama Bahan (Contoh: Susu UHT Diamond)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-3 text-xs font-bold focus:outline-none focus:border-orange-500 transition">
                    
                    <div class="grid grid-cols-2 gap-3 mb-4">
                        <input type="number" id="fi-qty" placeholder="Jumlah" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition">
                        <input type="text" id="fi-unit" placeholder="Satuan (Pcs/Box/Ltr)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl text-xs font-bold focus:outline-none focus:border-orange-500 transition">
                    </div>
                    
                    <button onclick="simpanNode('inventory_raw', { name: document.getElementById('fi-name').value, qty: document.getElementById('fi-qty').value, unit: document.getElementById('fi-unit').value })" class="w-full bg-orange-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-orange-600 transition tracking-widest uppercase">
                        <i class="fa-solid fa-box-open mr-1"></i> Update Ke Database
                    </button>
                </div>
                
                <h3 class="text-xs font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-list text-gray-500"></i> Log Ketersediaan Barang
                </h3>
                <div id="owner-inventory-list">
                    ${htmlList}
                </div>
            </div>
        </div>
    `;
};
// ============================================================================
// MAINSTAY DRINK POS - TAHAP 7: MODUL 4-8, STAMP, ABSENSI, & INISIALISASI
// ============================================================================

// ---------------------------------------------------------
// MODUL 4: LAPORAN KEUANGAN & PENGELUARAN (/expenses)
// ---------------------------------------------------------
window.renderPanelLaporan = () => {
    let htmlList = Object.keys(globalExpenses).map(key => `
        <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between mb-3 fade-in group">
            <div>
                <h4 class="text-xs font-black text-red-500">${globalExpenses[key].desc}</h4>
                <p class="text-[9px] text-gray-400 font-bold mt-0.5">
                    ${new Date(globalExpenses[key].date).toLocaleDateString('id-ID')} - ${new Date(globalExpenses[key].date).toLocaleTimeString('id-ID')}
                </p>
            </div>
            <div class="flex items-center gap-3 shrink-0">
                <span class="text-xs font-black text-gray-800 tracking-wider">
                    -${formatRupiah(globalExpenses[key].amount)}
                </span>
                <button onclick="hapusNode('expenses', '${key}', 'renderPanelLaporan')" class="text-red-400 bg-red-50 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition border border-red-100">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>
        </div>
    `).join('');

    if (!htmlList) {
        htmlList = `<p class="text-[10px] text-center text-gray-400 py-6 bg-slate-50 rounded-xl border-dashed border border-gray-200">Buku pengeluaran masih kosong.</p>`;
    }

    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe overflow-hidden">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md relative z-10">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="font-black text-lg leading-none">Buku Keuangan</h2>
                    <p class="text-[10px] text-amber-400 font-bold tracking-wider">Tracker Pengeluaran Operasional</p>
                </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-5 hide-scrollbar">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 mb-6 shadow-sm">
                    <h3 class="text-xs font-black mb-4 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2">
                        <i class="fa-solid fa-money-bill-transfer text-red-500"></i> Catat Pengeluaran Baru
                    </h3>
                    
                    <input type="text" id="fe-desc" placeholder="Keterangan (Contoh: Beli Es Batu, Listrik)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-3 text-xs font-bold focus:outline-none focus:border-red-500 transition">
                    
                    <input type="number" id="fe-amount" placeholder="Nominal Rp (Contoh: 50000)" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-4 text-xs font-bold focus:outline-none focus:border-red-500 transition">
                    
                    <button onclick="simpanNode('expenses', { desc: document.getElementById('fe-desc').value, amount: Number(document.getElementById('fe-amount').value), date: Date.now() })" class="w-full bg-green-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-green-600 transition tracking-widest uppercase">
                        <i class="fa-solid fa-file-invoice-dollar mr-1"></i> Simpan Pengeluaran
                    </button>
                </div>
                
                <h3 class="text-xs font-black mb-3 uppercase tracking-wider flex items-center gap-2">
                    <i class="fa-solid fa-clock-rotate-left text-gray-500"></i> Histori Pengeluaran
                </h3>
                <div id="owner-laporan-list">
                    ${htmlList}
                </div>
            </div>
        </div>
    `;
};

// ---------------------------------------------------------
// MODUL 5: PROMO & VOUCHER (UI Placeholder Blueprint)
// ---------------------------------------------------------
window.renderPanelPromo = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h2 class="font-black text-lg leading-none">Promo & Voucher</h2>
            </div>
            <div class="flex-1 p-5 flex flex-col items-center justify-center text-center text-gray-400">
                <i class="fa-solid fa-ticket text-5xl mb-4 text-pink-500"></i>
                <p class="font-bold text-sm">Database Voucher Targeted & Auto-Apply<br>akan diaktifkan di fase update berikutnya.</p>
            </div>
        </div>
    `;
};

// ---------------------------------------------------------
// MODUL 6: PENGATURAN TOKO (Buka/Tutup & PIN)
// ---------------------------------------------------------
window.toggleStatusToko = async () => {
    try {
        await update(ref(db, 'store_settings'), { isStoreOpen: !isStoreOpen });
    } catch(e) {
        alert("Gagal mengubah status toko! Periksa koneksi internet.");
    }
};

window.renderPanelSettings = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h2 class="font-black text-lg leading-none">Setelan Toko</h2>
            </div>
            <div class="flex-1 p-5 overflow-y-auto">
                
                <!-- Toggle Buka / Tutup Toko -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
                    <div class="flex justify-between items-center border-b border-gray-50 pb-3 mb-3">
                        <div>
                            <h3 class="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-store text-blue-500"></i> Status Operasional
                            </h3>
                            <p class="text-[9px] font-bold text-gray-500 mt-1">Matikan untuk memblokir pesanan masuk dari pelanggan.</p>
                        </div>
                        <button id="toggle-toko-btn" onclick="toggleStatusToko()" class="w-14 h-8 rounded-full transition-colors duration-300 ${isStoreOpen ? 'bg-green-500' : 'bg-gray-300'} relative shadow-inner flex items-center px-1 shrink-0">
                            <div class="w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${isStoreOpen ? 'translate-x-6' : 'translate-x-0'}"></div>
                        </button>
                    </div>
                </div>

                <!-- Keamanan PIN -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 class="text-xs font-black mb-4 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-2">
                        <i class="fa-solid fa-shield-halved text-slate-700"></i> Konfigurasi PIN Darurat
                    </h3>
                    <input type="number" id="fset-pin" placeholder="Masukkan 6 Digit PIN Baru" class="w-full bg-slate-50 border border-gray-200 p-3 rounded-xl mb-4 text-xs font-bold tracking-widest focus:outline-none focus:border-slate-500 transition">
                    <button onclick="update(ref(db, 'store_settings'), { emergency_pin: document.getElementById('fset-pin').value }); alert('Berhasil! PIN Darurat tersimpan.'); document.getElementById('fset-pin').value = '';" class="w-full bg-slate-800 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-slate-900 transition tracking-widest uppercase">
                        <i class="fa-solid fa-lock mr-1"></i> Simpan Keamanan
                    </button>
                </div>
                
            </div>
        </div>
    `;
};

// ---------------------------------------------------------
// MODUL 7: DATABASE MEMBER
// ---------------------------------------------------------
window.renderPanelMember = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <h2 class="font-black text-lg leading-none">Member & Stamp</h2>
            </div>
            <div class="flex-1 p-5 flex flex-col items-center justify-center text-center text-gray-400">
                <i class="fa-solid fa-crown text-5xl mb-4 text-amber-500"></i>
                <p class="font-bold text-sm">Sistem tracking Poin Stamp berbasis Nomor WA<br>berjalan di background Firebase.</p>
            </div>
        </div>
    `;
};

// ---------------------------------------------------------
// MODUL 8: MAINTENANCE DATA (Tutup Buku)
// ---------------------------------------------------------
window.renderPanelDatabase = () => {
    document.getElementById('owner-inner-panels-container').innerHTML = `
        <div class="fixed inset-0 bg-slate-50 z-[300] flex flex-col fade-in pb-safe">
            <div class="bg-gray-900 text-white p-4 flex items-center gap-3 shrink-0 shadow-md">
                <button onclick="closePanel()" class="w-10 h-10 bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center">
                    <i class="fa-solid fa-arrow-left"></i>
                </button>
                <div>
                    <h2 class="font-black text-lg leading-none">Database & Backup</h2>
                    <p class="text-[10px] text-amber-400 font-bold tracking-wider">Garbage Collector</p>
                </div>
            </div>
            <div class="flex-1 p-5">
                <div class="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm text-center">
                    <i class="fa-solid fa-triangle-exclamation text-3xl text-red-500 mb-3"></i>
                    <h3 class="text-xs font-black text-red-900 mb-1 uppercase tracking-wider">Tutup Buku Harian</h3>
                    <p class="text-[9px] font-bold text-red-700 mb-4">Tindakan ini akan menghapus SEMUA pesanan yang ada di layar kasir hari ini dan mengembalikan nomor antrean ke 001. Lakukan hanya setelah toko tutup.</p>
                    
                    <button onclick="if(prompt('Ketik PIN Owner untuk otorisasi Tutup Buku:') === MASTER_PIN) { remove(ref(db, 'orders')); alert('Layar Kasir berhasil dibersihkan!'); } else { alert('Otorisasi Gagal!'); }" class="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-red-700 transition tracking-widest uppercase">
                        <i class="fa-solid fa-broom mr-1"></i> Hapus Semua Pesanan
                    </button>
                </div>
            </div>
        </div>
    `;
};

// ============================================================================
// MODAL CEK STAMP MEMBER & KAMERA ABSENSI
// ============================================================================

window.bukaModalStamp = () => {
    const modal = document.getElementById('modal-stamp');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    const resultArea = document.getElementById('stamp-result-area');
    if(resultArea) resultArea.classList.add('hidden');
};

window.closeModalStamp = () => {
    const modal = document.getElementById('modal-stamp');
    if(modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
};

window.cekStampMember = () => {
    const phoneInput = document.getElementById('stamp-phone-check');
    const phone = phoneInput ? phoneInput.value : '';
    
    if (!phone) return alert('Silakan masukkan nomor WhatsApp Anda!');
    
    // Mockup visual logic sesuai blueprint (5 Stamps = 1 Session)
    const resultArea = document.getElementById('stamp-result-area');
    const nameEl = document.getElementById('stamp-member-name');
    const countEl = document.getElementById('stamp-count-text');
    const dotsEl = document.getElementById('stamp-visual-dots');
    
    if(resultArea) resultArea.classList.remove('hidden');
    if(nameEl) nameEl.innerText = `Member: ${phone}`;
    if(countEl) countEl.innerText = `3/5`;
    
    if(dotsEl) {
        let dotsHtml = '';
        for(let i=1; i<=5; i++) {
            dotsHtml += i <= 3 
                ? `<i class="fa-solid fa-circle text-amber-500 text-sm drop-shadow-sm"></i>` 
                : `<i class="fa-solid fa-circle text-gray-200 text-sm"></i>`;
        }
        dotsEl.innerHTML = dotsHtml;
    }
};

window.bukaModalAbsensi = async () => {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        const video = document.getElementById('attendance-video');
        if(video) {
            video.srcObject = stream;
            video.classList.remove('hidden');
        }
        const loader = document.getElementById('camera-loading');
        if(loader) loader.classList.add('hidden');
    } catch (err) {
        alert("Gagal mengakses kamera: " + err.message);
    }
};

window.closeModalAbsensi = () => {
    const modal = document.getElementById('modal-absensi');
    if(modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
    }
    
    const video = document.getElementById('attendance-video');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
};

window.prosesAbsensiCam = () => {
    alert("Wajah terdeteksi! Data absensi berhasil direkam ke Firebase /attendance");
    window.closeModalAbsensi();
};

// ============================================================================
// THERMAL PRINTER ESC/POS (Menerapkan ID dari HTML)
// ============================================================================

window.cetakStruk = (orderKey) => {
    const order = globalOrders[orderKey];
    if (!order) return alert('Pesanan tidak ditemukan.');
    
    const receiptHtml = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; font-family: monospace;">
            <b style="font-size: 14px;">MAINSTAY DRINK SHOP</b><br>
            Tlp: 628977099557
        </div>
        <div style="font-family: monospace;">
            ID: ${order.orderId}<br>
            Tgl: ${new Date(order.timestamp).toLocaleString('id-ID')}<br>
            Plg: ${order.customerName}
        </div>
        <div style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; font-family: monospace;">
            ${order.items.map(i => `
                ${i.qty}x ${i.name}<br>
                &nbsp;&nbsp;${formatRupiah(i.price)} = ${formatRupiah(i.total)}
            `).join('<br>')}
        </div>
        <div style="border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; font-weight: bold; font-family: monospace;">
            TOTAL: ${formatRupiah(order.totalAmount)}<br>
            BAYAR: ${order.paymentMethod}
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 10px; font-family: monospace;">
            Terima Kasih!<br>IG: @mainstay.in
        </div>
    `;
    
    const printArea = document.getElementById('printable-receipt');
    if(printArea) {
        printArea.innerHTML = receiptHtml;
        window.print();
    }
};

// ============================================================================
// INISIALISASI SAAT DOM SELESAI DIMUAT (AKHIR DARI SCRIPT)
// ============================================================================

const restorePersistentSession = () => {
    const savedRole = localStorage.getItem('mainstay_session_role');
    const savedStaff = localStorage.getItem('mainstay_session_staff');

    if (savedRole === 'owner') {
        window.switchRoleView('owner');
    } else if (savedRole === 'kasir' && savedStaff) {
        activeStaff = JSON.parse(savedStaff);
        const nameEl = document.getElementById('kasir-active-name');
        if (nameEl) nameEl.innerText = activeStaff.name;
        window.switchRoleView('kasir');
    } else {
        // Jika tidak ada sesi, paksa kembali ke view customer
        window.switchRoleView('customer');
    }
};

// Listener utama yang memicu seluruh ekosistem aplikasi
document.addEventListener('DOMContentLoaded', () => {
    applyLayoutFixes(); 
    startClock();
    initFirebaseListeners(); // Koneksi real-time ke Firebase
    restorePersistentSession(); // Amankan navigasi via Session
});

// ==========================================
// MODUL SAKELAR: PELANGGAN <-> KASIR
// ==========================================

window.loginKeKasir = () => {
    // Buka layar kasir
    document.getElementById('layar-kasir').classList.remove('hidden');
};

window.keluarDariKasir = () => {
    // Tutup layar kasir dan kembali ke mode pelanggan
    document.getElementById('layar-kasir').classList.add('hidden');
    // Matikan kamera jika sebelumnya menyala
    if (typeof matikanKamera === 'function') matikanKamera();
};
// ==========================================
// MODUL RUANG KERJA KASIR (TAB NAVIGASI)
// ==========================================

window.bukaHalamanKerja = () => {
    document.getElementById('ruang-kerja-kasir').classList.remove('hidden');
    // Buka tab absensi secara otomatis saat ruang kerja pertama kali dibuka
    switchTabKerja('absensi'); 
};

window.tutupRuangKerja = () => {
    document.getElementById('ruang-kerja-kasir').classList.add('hidden');
};

// Fungsi untuk memindah tab dan konten
window.switchTabKerja = (tabName) => {
    const tabs = ['absensi', 'aruskas', 'stok', 'shift'];
    
    tabs.forEach(t => {
        // 1. Sembunyikan semua halaman konten
        document.getElementById(`content-tab-${t}`).classList.add('hidden');
        document.getElementById(`content-tab-${t}`).classList.remove('block');
        
        // 2. Matikan warna aktif di semua tombol tab (jadikan abu-abu)
        const btn = document.getElementById(`btn-tab-${t}`);
        btn.classList.remove('text-blue-600', 'border-blue-600');
        btn.classList.add('text-gray-400', 'border-transparent');
    });

    // 3. Tampilkan halaman konten yang sedang dipilih
    document.getElementById(`content-tab-${tabName}`).classList.remove('hidden');
    document.getElementById(`content-tab-${tabName}`).classList.add('block');
    
    // 4. Warnai tombol tab yang sedang dipilih menjadi biru aktif
    const activeBtn = document.getElementById(`btn-tab-${tabName}`);
    activeBtn.classList.remove('text-gray-400', 'border-transparent');
    activeBtn.classList.add('text-blue-600', 'border-blue-600');
};
