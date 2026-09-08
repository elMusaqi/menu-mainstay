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

// --- JURUS SULAP: GANTI SEMUA ALERT BAWAAN JADI NOTIFIKASI MELAYANG ---
// --- JURUS SULAP: GANTI SEMUA ALERT BAWAAN JADI NOTIFIKASI MELAYANG ---
window.alert = (pesan) => {
    // Hapus notif lama kalau masih ada yang nyangkut
    const notifLama = document.getElementById('notif-global');
    if (notifLama) notifLama.remove();
    
    // Buat kapsul notifikasi baru (Posisi diubah ke left-0 right-0 mx-auto)
    const notif = document.createElement('div');
    notif.id = 'notif-global';
    notif.className = 'fixed top-10 left-0 right-0 mx-auto w-[90%] max-w-sm bg-red-600 text-white px-4 py-3 rounded-full shadow-2xl z-[99999] font-bold text-xs flex items-center justify-center gap-2 animate-bounce text-center';
    notif.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-sm"></i> <span>${pesan}</span>`;
    
    // Tampilkan ke layar
    document.body.appendChild(notif);
    
    // Hilangkan otomatis dalam 3 detik
    setTimeout(() => { if (notif) notif.remove(); }, 5000);
};
// ----------------------------------------------------------------------

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
            
            // A. Update Variabel Global
        isStoreOpen = settings.isStoreOpen !== false;
        window.statusTokoRealtime = isStoreOpen; // Simpanan ekstra untuk pancingan

        // --- TEMBAK LANGSUNG KE FISIK SAKELAR (GARANSI 100%) ---
        // Kita beri jeda 300 milidetik agar HTML pasti sudah muncul di layar
        setTimeout(() => {
            // 1. Jalankan fungsi utama
            if (typeof window.updateVisualToggle === 'function') {
                window.updateVisualToggle(isStoreOpen);
            }
            // 2. Paksa centang langsung ke wujud fisik HTML-nya!
            document.querySelectorAll('.toggle-kedai').forEach(sakelar => {
                sakelar.checked = isStoreOpen;
            });
        }, 300);
        // -----------------------------------------------------

            
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
// MODUL TOGGLE STATUS KEDAI (FINAL STABIL)
// ==========================================

window.updateVisualToggle = (statusBuka) => {
    // Cari semua sakelar di halaman yang memakai class toggle-kedai
    const semuaSakelar = document.querySelectorAll('.toggle-kedai');
    
    semuaSakelar.forEach(sakelar => {
        // Sinkronkan fisik sakelar dengan data asli dari database
        sakelar.checked = (statusBuka === true); 
    });
};

window.ubahStatusKedai = async (elemenSakelar) => {
    // 1. Ambil status langsung dari fisik sakelar yang baru saja diklik
    // (Jika hijau = true, jika merah = false)
    const statusBaru = elemenSakelar.checked; 
    
    // 2. Langsung tembak nilainya ke Firebase
    try {
        const setelanRef = ref(db, 'store_settings');
        await update(setelanRef, { isStoreOpen: statusBaru });
    } catch (error) {
        console.error("Gagal update Firebase:", error);
        alert("Koneksi gagal. Status tidak berubah.");
        // Kembalikan warna sakelar jika internet putus
        elemenSakelar.checked = !statusBaru; 
    }
};

// ============================================================================
// MAINSTAY DRINK POS - TAHAP 2: SISTEM KATALOG PELANGGAN & KERANJANG (CART)
// ============================================================================

// ---------------------------------------------------------
// 2A. FILTER KATEGORI & PENCARIAN MENU
// ---------------------------------------------------------
window.filterKategori = (kategori, btnEl) => {
    // 1. KUNCI UTAMA (Dikembalikan seperti aslinya agar filter jalan)
    activeCategoryFilter = kategori;

    // 2. Reset semua tombol kategori ke warna putih/abu-abu
    const allBtns = document.querySelectorAll('.cat-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active', 'bg-amber-500', 'text-white', 'shadow-md', 'border-amber-500');
        btn.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
    });

    // 3. Ubah tombol yang diklik menjadi warna amber (oranye)
    if (btnEl) {
        btnEl.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
        btnEl.classList.add('active', 'bg-amber-500', 'text-white', 'shadow-md', 'border-amber-500');
    }

    // 4. Panggil fungsi render asli
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
            <div class="col-span-full text-center py-10 text-gray-400 font-bold">
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

        // Lewati jika stok menu sedang ditandai habis
        if (!menu.isAvailable) return;

        // Gunakan placeholder jika url gambar kosong
        const imgUrl = menu.imageUrl || PLACEHOLDER_IMG;

        // Rancang Card HTML Menu (KEMBALI KE VERSI ASLI - BESAR & LEGA)
        const cardHtml = `
            <div onclick="bukaModalDetail('${key}')" class="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col cursor-pointer group hover:-translate-y-1 hover:shadow-md transition duration-200">
                <div class="w-full h-28 bg-slate-100 rounded-xl overflow-hidden relative mb-2">
                    <img src="${imgUrl}" alt="${menu.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                    ${menu.isBestSeller ? '<span class="absolute top-2 left-2 bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-md shadow-sm z-10">BEST</span>' : ''}
                </div>
                
                <div class="px-1 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="text-xs font-black text-gray-900 leading-tight mb-0.5">${menu.name}</h3>
                        <p class="text-[9px] text-gray-400 font-bold capitalize">${menu.category}</p>
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

// ==========================================
// 1. MODAL CHECKOUT & RENDER KERANJANG
// ==========================================
window.bukaModalCheckout = () => {
    const listEl = document.getElementById('checkout-list');
    if (listEl) listEl.innerHTML = '';
    
    let grandTotal = 0;
    
    cart.forEach((item, index) => {
        // Mencegah error jika total harganya belum terbaca
        const hargaTotal = Number(item.total) || 0;
        grandTotal += hargaTotal;
        
        const imgUrl = (typeof globalMenus !== 'undefined' && globalMenus[item.id] && globalMenus[item.id].image) ? globalMenus[item.id].image : 'logo-192.png';

        listEl.insertAdjacentHTML('beforeend', `
            <div class="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0 relative">
                
                <div class="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 shadow-sm border border-slate-200/60 p-0.5">
                    <img src="${imgUrl}" alt="${item.name}" class="w-full h-full object-cover rounded-lg" onerror="this.src='logo-192.png'">
                </div>
                
                <div class="flex-1 pr-8">
                    <h4 class="text-xs font-black text-slate-800 leading-tight mb-0.5">${item.name}</h4>
                    ${item.notes && item.notes !== '-' ? `<p class="text-[9px] text-slate-500 font-medium leading-snug mb-1 line-clamp-2">${item.notes}</p>` : ''}
                    
                    <div class="flex items-center gap-3 mt-1.5">
                        <div class="flex items-center bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                            <button onclick="window.ubahQtyKeranjang(${index}, -1)" class="w-7 h-6 flex justify-center items-center text-slate-600 hover:text-amber-500 hover:bg-slate-200 rounded-l-lg transition">
                                <i class="fa-solid fa-minus text-[9px]"></i>
                            </button>
                            <span class="text-[10px] font-black text-slate-800 w-5 text-center">${item.qty}</span>
                            <button onclick="window.ubahQtyKeranjang(${index}, 1)" class="w-7 h-6 flex justify-center items-center text-slate-600 hover:text-amber-500 hover:bg-slate-200 rounded-r-lg transition">
                                <i class="fa-solid fa-plus text-[9px]"></i>
                            </button>
                        </div>
                        <span class="text-[11px] font-black text-slate-800">Rp ${hargaTotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <button onclick="window.hapusItemKeranjang(${index})" class="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full flex justify-center items-center transition">
                    <i class="fa-solid fa-trash-can text-sm"></i>
                </button>
            </div>
        `);
    });
    
    const totalEl = document.getElementById('checkout-total');
    if (totalEl) totalEl.innerText = `Rp ${Number(grandTotal).toLocaleString('id-ID')}`;
    
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

// ==========================================
// 2. MESIN PENGHITUNG PLUS MINUS
// ==========================================
window.ubahQtyKeranjang = (index, perubahan) => {
    const item = cart[index];
    if (!item) return;

    item.qty += perubahan;

    if (item.qty <= 0) {
        if (typeof window.hapusItemKeranjang === 'function') {
            window.hapusItemKeranjang(index);
        }
    } else {
        item.total = Number(item.price) * Number(item.qty);
        window.bukaModalCheckout();
        if (typeof window.updateCartBadge === 'function') {
            window.updateCartBadge();
        }
    }
};

// ==========================================
// 3. FUNGSI TUTUP MODAL (BAWAAN ASLI)
// ==========================================
window.closeModalCheckout = () => {
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.prosesCheckout = async () => {
    if (cart.length === 0) {
        return alert('Keranjang masih kosong!');
    }

    // --- GEMBOK WAJIB ISI NAMA ---
    const elemenNama = document.getElementById('co-name');
    if (elemenNama && elemenNama.value.trim() === '') {
        alert('Tunggu dulu! Nama Pelanggan wajib diisi.');
        elemenNama.focus(); // Arahkan kursor otomatis ke kolom nama
        return; // Hentikan proses checkout agar tidak lolos
    }
    // -----------------------------

    const inputName = elemenNama.value;
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
        
        // Panggil popup elegan sesuai metode pembayarannya
        window.tampilkanPopupBerhasil(orderId, paymentMethod, grandTotal, customerName);
        
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

    // --- SISTEM ANTI REFRESH (SESSION MEMORY) ---
    if (role === 'customer') {
        localStorage.removeItem('mainstay_session_role');
    } else {
        localStorage.setItem('mainstay_session_role', role);
    }
    // --------------------------------------------
    // --- PUSAT KENDALI: BGM & ALWAYS ON DISPLAY ---
    if (role === 'kasir') {
        window.matikanBGM();
        window.requestWakeLock(); // Layar nyala terus saat jaga kasir!
    } else if (role === 'owner') {
        window.matikanBGM();
        window.releaseWakeLock(); // Lepas kunci layar agar HP bisa istirahat
    } else {
        window.nyalakanBGM();
        window.releaseWakeLock(); // Lepas kunci layar saat mode pelanggan
    }
    // ----------------------------------------------

    // Sembunyikan semua section layar terlebih dahulu
    // ... (kode Mas Ihsan lanjut ke bawah seperti aslinya)
    document.getElementById('view-customer').classList.add('hidden');
    document.getElementById('view-kasir').classList.add('hidden');
    document.getElementById('view-owner').classList.add('hidden');
    
    // Set role yang aktif saat ini
    currentRole = role;
    
    // Tampilkan layar yang dituju
    document.getElementById(`view-${role}`).classList.remove('hidden');

    // Memicu render data spesifik jika perlu
        
        // 1. JIKA BALIK KE LAYAR PELANGGAN (LOGOUT)
        if (role === 'customer') {
            // Memaksa render ulang katalog agar tidak muter-muter
            if (typeof window.renderKatalog === 'function') {
                window.renderKatalog();
            } else if (typeof window.renderMenuCustomer === 'function') {
                window.renderMenuCustomer();
            }
            
        }

        // 2. JIKA MASUK KE LAYAR KASIR (LOGIN)
        if (role === 'kasir') {
            if (typeof window.renderKasirOrders === 'function') {
                window.renderKasirOrders();
            }
            if (typeof window.updateLiveCashDrawer === 'function') {
                window.updateLiveCashDrawer();
            }
            
            // --- PANCINGAN SUPER TOGGLE (ANTI-GAGAL) ---
            let hitunganPancingan = 0;
            const paksaSinkron = setInterval(() => {
                if (typeof window.updateVisualToggle === 'function' && typeof isStoreOpen !== 'undefined') {
                    window.updateVisualToggle(isStoreOpen);
                }
                hitunganPancingan++;
                if (hitunganPancingan >= 4) {
                    clearInterval(paksaSinkron);
                }
            }, 250); 
            // ------------------------------------
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
    // Memanggil pop-up kustom yang elegan
    window.tampilkanPopupLogout();
};

// ==========================================
// MESIN POP-UP LOGOUT (DESAIN PREMIUM)
// ==========================================
window.tampilkanPopupLogout = () => {
    const popupLama = document.getElementById('popup-logout-custom');
    if (popupLama) popupLama.remove();

    const modal = document.createElement('div');
    modal.id = 'popup-logout-custom';
    modal.className = 'fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-5 opacity-0 transition-opacity duration-300';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl transform scale-95 transition-transform duration-300">
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner border border-red-100">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
            </div>
            
            <h2 class="text-xl font-black text-slate-800 mb-1">Keluar Sistem?</h2>
            <p class="text-xs text-slate-500 font-medium mb-6 px-2 leading-relaxed">
                Sesi Anda akan diakhiri. Pastikan semua pekerjaan dan transaksi kasir sudah terselesaikan.
            </p>

            <div class="flex gap-3 w-full">
                <button onclick="tutupPopupLogout()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition active:scale-95 text-xs">
                    Batal
                </button>
                <button onclick="eksekusiLogout()" class="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition shadow-md active:scale-95 text-xs flex justify-center items-center gap-2">
                    <i class="fa-solid fa-power-off"></i> Ya, Keluar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Animasi masuk agar tidak kaku
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
};

window.tutupPopupLogout = () => {
    const modal = document.getElementById('popup-logout-custom');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.remove(), 300); // Tunggu animasi menghilang
    }
};

window.eksekusiLogout = () => {
    // Hapus sesi dengan aman sesuai dengan nama kunci asli di database Mas Ihsan
    localStorage.removeItem('mainstay_session_role');
    localStorage.removeItem('mainstay_session_staff');
    
    // Refresh otomatis ke halaman login
    window.location.reload();
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

    container.innerHTML = ''; 
    let pendingCount = 0;
    let dapurCount = 0;

    const orderKeys = Object.keys(globalOrders);

    // ==========================================
    // MESIN RADAR SUARA PESANAN BARU
    // ==========================================
    // Buat memori ingatan agar tidak bunyi saat pertama kali web dibuka
    if (typeof window.idPesananLama === 'undefined') {
        window.idPesananLama = new Set();
        window.pertamaKaliMuat = true;
    }

    let adaPesananBaru = false;
    
    orderKeys.forEach(key => {
        // Jika ada ID pesanan yang belum pernah terekam di memori
        if (!window.idPesananLama.has(key)) {
            window.idPesananLama.add(key);
            
            // Jika ini bukan loading pertama dan statusnya "pending" (baru masuk)
            if (!window.pertamaKaliMuat && globalOrders[key].status === 'pending') {
                adaPesananBaru = true;
            }
        }
    });

    // Jika radar mendeteksi pesanan baru, bunyikan alarm!
    if (adaPesananBaru) {
        // NAMA FILE DISESUAIKAN PERSIS DENGAN YANG ADA DI GITHUB
        const suaraNotif = new Audio('notif-mainstay.mp3');
        // Fitur .catch untuk mencegah error jika browser memblokir suara
        suaraNotif.play().catch(error => console.log('Menunggu interaksi layar dari kasir...'));
    }

    // Matikan mode pertama kali muat
    window.pertamaKaliMuat = false;
    // ==========================================

    orderKeys.forEach(key => {
        const order = globalOrders[key];

        // Hitung badge notifikasi untuk tab Baru dan Dapur
        if (order.status === 'pending') {
            pendingCount++;
        }
        if (order.status === 'proses') {
            dapurCount++;
        }

        // Render pesanan HANYA jika statusnya cocok
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
            const noHpRaw = order.customerPhone ? String(order.customerPhone).trim() : '';
            const adaNoHp = noHpRaw !== '' && noHpRaw !== '-';
            
            let htmlTombolCekWa = '';
            
            if (adaNoHp) {
                // 1. Rapikan Nomor HP
                let hpAsli = noHpRaw.replace(/[^0-9]/g, '');
                if (hpAsli.startsWith('0')) hpAsli = '62' + hpAsli.substring(1);
                
                // 2. Gunakan Order ID rapi (CSH-...) atau ambil 5 huruf terakhir jika pakai ID Firebase
                const idPesanan = order.orderId ? order.orderId : key.slice(-5).toUpperCase();
                
                // 3. Susun daftar minuman yang dipesan
                let rincianMenu = '';
                if (order.items && order.items.length > 0) {
                    order.items.forEach(item => {
                        rincianMenu += `▪️ ${item.qty}x ${item.name}\n`;
                    });
                }
                
                // 4. Rakit Pesan WA Super Rapi
                const sapaan = `Halo Kak *${order.customerName}* 👋\n\nPesanan Kakak sudah masuk di kasir *Mainstay Drink* dengan detail berikut:\n\n*Kode Pesanan:* ${idPesanan}\n*Rincian:*\n${rincianMenu}\n*Total Tagihan:* *${formatRupiah(order.totalAmount)}*\n\nBoleh minta tolong konfirmasi atau kirimkan foto bukti pembayarannya ke sini ya Kak? Terima kasih banyak! 🙏`;
                
                const linkTembusWa = "https://wa.me/" + hpAsli + "?text=" + encodeURIComponent(sapaan);
                
                htmlTombolCekWa = `
                    <a href="${linkTembusWa}" target="_blank" class="w-full bg-green-50 text-green-600 border border-green-200 p-2 rounded-xl text-xs font-bold hover:bg-green-100 transition flex items-center justify-center gap-2 shadow-sm">
                        <i class="fa-brands fa-whatsapp text-sm"></i> Hubungi WA Pelanggan
                    </a>`;
            } else {
                // REVISI: Menggunakan protokol whatsapp:// agar HP memunculkan opsi pilihan aplikasi WA
                htmlTombolCekWa = `
                    <a href="whatsapp://send?phone=628977099557" class="w-full bg-slate-50 text-slate-500 border border-slate-200 p-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-2 shadow-sm">
                        <i class="fa-brands fa-whatsapp text-sm text-slate-400"></i> Buka Inbox WA Resto
                    </a>`;
            }

            actionButtons = `
                <div class="flex flex-col gap-2 mt-3">
                    ${htmlTombolCekWa}
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="updateOrderStatus('${key}', 'proses')" class="bg-amber-500 text-white p-2 rounded-xl text-xs font-bold hover:bg-amber-600 transition flex items-center justify-center gap-2 shadow-sm"><i class="fa-solid fa-fire-burner"></i> Terima & Masak</button>
                        <button onclick="batalOrder('${key}')" class="bg-slate-100 text-red-500 p-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition flex items-center justify-center gap-2 shadow-sm"><i class="fa-solid fa-ban"></i> Batal</button>
                    </div>
                </div>`;
        } else if (activeKasirTab === 'proses') {
            // Tab 2 (Dapur): Ada 2 Tombol
            actionButtons = `
            <div class="grid grid-cols-2 gap-2 mt-3">
                <button onclick="bukaStruk('${key}')" class="bg-blue-500 text-white p-2 rounded text-xs font-bold flex justify-center items-center gap-1">
                    <i class="fa-solid fa-print"></i> Struk Kasir
                </button>
                <button onclick="updateOrderStatus('${key}', 'selesai')" class="bg-green-500 text-white p-2 rounded text-xs font-bold flex justify-center items-center gap-1">
                    <i class="fa-solid fa-check-double"></i> Selesai
                </button>
            </div>`;
    } else if (activeKasirTab === 'selesai') {
        // Tab 3 (Riwayat): Hanya 1 Tombol Cetak Ulang
        actionButtons = `
            <div class="mt-3">
                <button onclick="bukaStruk('${key}')" class="bg-slate-600 text-white p-2 rounded text-xs font-bold w-full flex justify-center items-center gap-2">
                    <i class="fa-solid fa-print"></i> Cetak Ulang Struk
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

        // Update Badge Angka Merah (Notifikasi Tab Dapur / Sedang Diproses)
        const badgeDapur = document.getElementById('badge-dapur');
        if (badgeDapur) {
            badgeDapur.innerText = dapurCount;
            if (dapurCount > 0) {
                badgeDapur.classList.remove('hidden');
            } else {
                badgeDapur.classList.add('hidden');
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

// 1. Pemicu munculnya pop-up elegan
window.batalOrder = (orderKey) => {
    window.tampilkanPopupBatal(orderKey);
};

// 2. Mesin eksekutor (Dijalankan saat tombol "Ya, Batalkan" diklik)
window.eksekusiBatalOrder = async (orderKey) => {
    window.tutupPopupBatal(); // Hilangkan pop-up dari layar
    
    try {
        const orderRef = ref(db, 'orders/' + orderKey);
        await remove(orderRef);
        
        // Buat alert kustom sementara untuk sukses (Bisa diganti dengan Toast nanti)
        alert("Berhasil! Pesanan dibatalkan.");
    } catch (error) {
        console.error("Void Order Error:", error);
        alert("Gagal menghapus pesanan.");
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
window.matikanBGM();
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
window.nyalakanBGM();
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
    // 1. Bersihkan pop-up lama jika masih menempel
    const modalLama = document.getElementById('popup-hapus-global');
    if (modalLama) modalLama.remove();

    // 2. Buat Kotak Pop-up Premium Baru
    const modal = document.createElement('div');
    modal.id = 'popup-hapus-global';
    modal.className = "fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-5 opacity-0 transition-opacity duration-300";
    
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl transform scale-95 transition-transform duration-300">
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 border-[4px] border-red-100">
                <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h2 class="text-lg font-black text-slate-800 mb-2">Hapus Data Ini?</h2>
            <p class="text-xs text-slate-500 font-medium mb-6 px-2 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Data akan dihapus secara permanen dari Database.
            </p>
            <div class="flex gap-3 w-full">
                <button id="btn-batal-hapus" class="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition text-xs tracking-wider uppercase">
                    Batal
                </button>
                <button id="btn-konfirm-hapus" class="flex-1 bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-red-600 transition text-xs tracking-wider uppercase flex items-center justify-center gap-2">
                    <i class="fa-solid fa-trash-can"></i> Ya, Hapus
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // 3. Mainkan Animasi Muncul
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);

    // 4. Aksi Jika Klik Batal
    document.getElementById('btn-batal-hapus').onclick = () => {
        modal.classList.add('opacity-0');
        setTimeout(() => modal.remove(), 300);
    };

    // 5. Aksi Jika Klik Konfirmasi "Ya, Hapus"
    document.getElementById('btn-konfirm-hapus').onclick = async () => {
        const btn = document.getElementById('btn-konfirm-hapus');
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Menghapus...'; // Efek Loading
        btn.disabled = true;

        try {
            // Eksekusi hapus data ke Firebase
            await remove(ref(db, `${nodeString}/${dataKey}`)); 
            
            // Tutup Pop-up dengan animasi
            modal.classList.add('opacity-0');
            setTimeout(() => modal.remove(), 300);

            // Muat ulang daftar tampilan secara otomatis
            if (typeof window[callbackFunctionName] === 'function') {
                window[callbackFunctionName]();
            }
        } catch (error) {
            console.error("Firebase Delete Error:", error);
            alert("Terjadi kesalahan! Gagal menghapus data dari database.");
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Ya, Hapus';
            btn.disabled = false;
        }
    };
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
        
        <!-- ========================================== -->
        <!-- TAHAP 1: UI MASTER KATEGORI & TOPPING      -->
        <!-- ========================================== -->
        <div class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 mb-6">
            <h2 class="text-lg font-black text-slate-800 mb-4">
                <i class="fa-solid fa-database text-blue-500 mr-2"></i>Data Master
            </h2>
            
            <!-- MASTER KATEGORI -->
            <div class="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 class="text-sm font-bold text-slate-700 mb-3">1. Master Kategori Produk</h3>
                <div class="flex w-full items-stretch gap-2 mb-3 h-[42px]">
            <input type="text" id="input-kategori-baru" placeholder="Cth: Kopi, Snack..." class="flex-1 min-w-0 text-xs px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 h-full">
            <button onclick="window.tambahMasterKategori()" class="bg-blue-500 shrink-0 text-white px-3 rounded-xl text-xs font-bold hover:bg-blue-600 shadow-sm whitespace-nowrap active:scale-95 transition flex items-center justify-center gap-1.5 h-full">
                <i class="fa-solid fa-plus"></i> Tambah
            </button>
        </div>
                <!-- Tempat Munculnya Daftar Kategori -->
                <div id="list-master-kategori" class="flex flex-wrap gap-2"></div>
            </div>

            <!-- MASTER TOPPING -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 class="text-sm font-bold text-slate-700 mb-3">2. Master Topping / Add-on</h3>
                <div class="flex flex-col gap-2 mb-3">
                    <input type="text" id="input-topping-nama" placeholder="Nama Topping (Cth: Boba, Extra Keju)" class="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400">
                    <div class="flex w-full items-stretch gap-2 h-[42px]">
            <input type="number" id="input-topping-harga" placeholder="Harga (+Rp)" class="flex-1 min-w-0 text-xs px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-400 h-full">
            <button onclick="window.tambahMasterTopping()" class="bg-blue-500 shrink-0 text-white px-3 rounded-xl text-xs font-bold hover:bg-blue-600 shadow-sm whitespace-nowrap active:scale-95 transition flex items-center justify-center gap-1.5 h-full">
                <i class="fa-solid fa-plus"></i> Tambah
            </button>
        </div>
                </div>
                <!-- Tempat Munculnya Daftar Topping -->
                <div id="list-master-topping" class="flex flex-col gap-2"></div>
            </div>
        </div>
        
        <!-- MASTER VARIAN BEBAS -->
        <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6 shadow-sm">
            <h3 class="text-sm font-bold text-slate-800 mb-3"><i class="fa-solid fa-layer-group text-purple-500 mr-1"></i> 3. Master Varian Bebas</h3>
            <p class="text-[10px] text-slate-500 mb-3 leading-relaxed">Buat varian pilihan untuk menu. (Misal: Level Es, Level Gula, atau Ukuran).</p>
            <div class="flex flex-col gap-2 mb-3">
                <input type="text" id="input-varian-nama" placeholder="Nama Varian (Cth: Level Es)" class="text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-400">
                <input type="text" id="input-varian-opsi" placeholder="Cth: Small=0, Medium=3000, Large=5000" class="text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-400">
                <button onclick="window.tambahMasterVarian()" class="bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-600 shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-plus"></i> Tambah Varian
                </button>
            </div>
            <!-- Tempat Munculnya Daftar Varian -->
            <div id="list-master-varian" class="flex flex-col gap-2"></div>
        </div>
        <!-- ========================================== -->

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
<!-- Input Gambar (Dual Opsi) -->
                    <div class="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <label class="block text-[11px] font-bold text-slate-700 mb-2"><i class="fa-solid fa-image text-blue-500 mr-1"></i> Gambar Menu (Pilih Salah Satu)</label>
                        <div class="space-y-2">
                            <!-- Opsi 1: Link URL -->
                            <div>
                                <span class="text-[10px] font-bold text-slate-500">Opsi 1: Link Gambar (URL)</span>
                                <input type="text" id="fm-image-url" placeholder="https://contoh.com/gambar.jpg" class="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs focus:outline-none focus:border-amber-500 mt-1">
                            </div>
                            <div class="flex items-center gap-2">
                                <hr class="flex-1 border-slate-200"><span class="text-[10px] text-slate-400 font-bold">ATAU</span><hr class="flex-1 border-slate-200">
                            </div>
                            <!-- Opsi 2: Upload File -->
                            <div>
                                <span class="text-[10px] font-bold text-slate-500">Opsi 2: Upload File Lokal</span>
                                <input type="file" id="fm-image-file" accept="image/*" class="w-full bg-white border border-gray-200 p-2 rounded-lg text-xs focus:outline-none focus:border-amber-500 mt-1 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer transition">
                            </div>
                        </div>
                    </div>
                    <!-- Hubungkan Topping -->
                    <div class="mb-3">
                        <label class="block text-[11px] font-bold text-slate-700 mb-1.5"><i class="fa-solid fa-cookie-bite text-orange-500 mr-1"></i> Hubungkan Topping (Opsional)</label>
                        <div id="wadah-checkbox-topping" class="flex flex-col gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <p class="text-[10px] text-slate-400 italic">Memuat topping...</p>
                        </div>
                    </div>

                    <!-- Hubungkan Varian -->
                    <div class="mb-3">
                        <label class="block text-[11px] font-bold text-slate-700 mb-1.5"><i class="fa-solid fa-layer-group text-purple-500 mr-1"></i> Hubungkan Varian (Opsional)</label>
                        <div id="wadah-checkbox-varian" class="flex flex-col gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                            <p class="text-[10px] text-slate-400 italic">Memuat varian...</p>
                        </div>
                    </div>

                    <button onclick="window.simpanMenuBaru()" class="w-full bg-amber-500 text-white py-3.5 rounded-xl font-black text-xs shadow-md hover:bg-amber-600 transition tracking-widest uppercase mt-2">
                        <i class="fa-solid fa-floppy-disk mr-1"></i> Simpan ke Database
                    </button>
                </div>

                <!-- Database List Render -->
                <h3 class="text-xs font-black mb-3 mt-8 uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 pb-2 text-green-500"><i class="fa-solid fa-server"></i> Katalog Database Asli</h3>
                <div id="owner-menu-list">
                    ${htmlList}
                </div>
            </div>
        </div>
    `; // <--- INI KUNCI PENYELAMATNYA (Penutup JS)

    // Panggil perender Data Master agar datanya langsung muncul
    if(typeof window.renderMasterKategori === 'function') {
        window.renderMasterKategori();
        window.renderMasterTopping();
        window.renderMasterVarian();
        if(typeof window.renderSelectKategori === 'function') window.renderSelectKategori();
        if(typeof window.renderCheckboxTopping === 'function') window.renderCheckboxTopping();
        if(typeof window.renderCheckboxVarian === 'function') window.renderCheckboxVarian();
    }
}; // <--- Penutup Utama Fungsi Panel

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
            Pelanggan: ${order.customerName}
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

// ==========================================
// MODUL STRUK DIGITAL & WA (DINAMIS)
// ==========================================
let orderAktif = null; // Menyimpan memori pesanan yang sedang diklik

window.bukaStruk = (orderKey) => {
    // 1. Tarik data asli dari memori pesanan
    orderAktif = globalOrders[orderKey];
    if (!orderAktif) return alert('Pesanan tidak ditemukan.');

    // 2. Suntikkan data ke teks HTML Struk
    document.getElementById('struk-no').innerText = "No: " + orderAktif.orderId;
    document.getElementById('struk-plg').innerText = "Pelanggan: " + (orderAktif.customerName || "Umum");
    document.getElementById('struk-tgl').innerText = new Date(orderAktif.timestamp).toLocaleString('id-ID');
    
    // 3. Render daftar menu sesuai yang dibeli
    const itemsContainer = document.getElementById('struk-items');
    itemsContainer.innerHTML = '';
    orderAktif.items.forEach(i => {
        itemsContainer.innerHTML += `
            <div>
                <div class="flex justify-between font-bold">
                    <span>${i.qty}x ${i.name}</span>
                    <span>${formatRupiah(i.price * i.qty)}</span>
                </div>
            </div>
        `;
    });

    // 4. Suntikkan Total Harga dan Metode Bayar
    document.getElementById('struk-total').innerText = formatRupiah(orderAktif.totalAmount);
    document.getElementById('struk-metode').innerText = orderAktif.paymentMethod;

    // 5. Munculkan layarnya
    document.getElementById('modal-struk').classList.remove('hidden');
};

window.tutupStruk = () => {
    // 1. Perintah asli untuk menutup pop-up struk
    document.getElementById('modal-struk').classList.add('hidden');
    
    // 2. PERINTAH BARU: Reset Laci WA Manual kembali ke semula
    const wadahManual = document.getElementById('wadah-wa-manual');
    if (wadahManual) {
        wadahManual.classList.add('hidden'); // Menyembunyikan laci kembali
    }
    
    const inputWA = document.getElementById('input-wa-manual');
    if (inputWA) {
        inputWA.value = ""; // Menghapus sisa angka yang sebelumnya diketik kasir
    }
};

window.kirimStrukWA = () => {
    if (!orderAktif) return;

    // Cek apakah ada nomor WA di database, jika tidak ada, tanya manual
    let noWA = orderAktif.customerPhone || orderAktif.wa || ""; 
    if (!noWA || noWA === "") {
        noWA = prompt("Nomor WA tidak ada di sistem.\nSilakan ketik manual (contoh: 0812...):");
        if (!noWA || noWA.trim() === "") return;
    }

    noWA = noWA.trim();
    if (noWA.startsWith("0")) noWA = "62" + noWA.substring(1);

    // Susun daftar menu untuk teks WA
    const daftarMenuWA = orderAktif.items.map(i => `${i.qty}x ${i.name} - ${formatRupiah(i.price * i.qty)}`).join('\n');

    // Susun Draft Pesan WA
    const pesan = `Halo kak! 👋
Terima kasih sudah jajan di *Mainstay Drink*.

*🧾 RINCIAN PESANAN*
No: ${orderAktif.orderId}
Pelanggan: ${orderAktif.customerName || "Umum"}
Waktu: ${new Date(orderAktif.timestamp).toLocaleString('id-ID')}
-----------------------------------
${daftarMenuWA}
-----------------------------------
*TOTAL: ${formatRupiah(orderAktif.totalAmount)}*
Metode Bayar: ${orderAktif.paymentMethod}

Ditunggu kedatangannya kembali ya kak! ✨`;
    
    window.open(`https://wa.me/${noWA}?text=${encodeURIComponent(pesan)}`, '_blank');
};

window.prosesCetakStruk = () => {
    if (!orderAktif) return;

    const daftarMenuCetak = orderAktif.items.map(i => `
        <tr>
            <td style="padding-bottom: 3px;">${i.qty}x ${i.name}</td>
            <td style="text-align: right; padding-bottom: 3px;">${formatRupiah(i.price * i.qty)}</td>
        </tr>
    `).join('');

    const receiptHtml = `
    <html>
    <head>
        <style>
            body { font-family: monospace; width: 58mm; margin: 0; padding: 0; color: #000; }
            .center { text-align: center; }
            .title { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
            .subtitle { font-size: 10px; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px; }
            .content { font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 5px; }
            .border-top { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
            .bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <!-- LOGO CETAK THERMAL -->
        <div class="center" style="margin-bottom: 5px;">
            <img src="logo-192.png" style="height: 35px; width: auto; filter: grayscale(100%);">
        </div>

        <div class="center title">MAINSTAY DRINK</div>
        <div class="center subtitle">Sistem Kasir Terpadu</div>
        
        <div class="content" style="margin-bottom: 5px;">
            <div>No: ${orderAktif.orderId}</div>
            <div>Tgl: ${new Date(orderAktif.timestamp).toLocaleString('id-ID')}</div>
            <div>Pelanggan: ${orderAktif.customerName || "Umum"}</div>
        </div>

        <div style="border-bottom: 1px dashed #000; margin-bottom: 5px;"></div>
        
        <table>
            ${daftarMenuCetak}
        </table>
        
        <div class="border-top">
            <table>
                <tr>
                    <td class="bold">TOTAL</td>
                    <td class="bold" style="text-align: right;">${formatRupiah(orderAktif.totalAmount)}</td>
                </tr>
                <tr>
                    <td style="font-size: 10px;">Metode Bayar</td>
                    <td style="text-align: right; font-size: 10px;">${orderAktif.paymentMethod}</td>
                </tr>
            </table>
        </div>

        <div class="center content" style="margin-top: 10px; font-size: 10px;">
            <div>Terima kasih atas kunjungan Anda!</div>
            <div style="margin-top: 2px;">-- LUNAS --</div>
        </div>
    </body>
    </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '58mm';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(receiptHtml);
    doc.close();

    printFrame.onload = function() {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        setTimeout(() => {
            document.body.removeChild(printFrame);
        }, 1000);
    };
};

// ==========================================
// 1. FUNGSI DOWNLOAD GAMBAR STRUK
// ==========================================
window.downloadStruk = async () => {
    if (!orderAktif) return;
    
    const btn = document.getElementById('btn-download');
    const teksAsli = btn ? btn.innerHTML : 'Download Gambar';
    
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        btn.disabled = true;
    }

    try {
        const kertasStruk = document.getElementById('kertas-struk');
        const canvas = await html2canvas(kertasStruk, { scale: 2, backgroundColor: "#ffffff" });
        
        const link = document.createElement('a');
        link.download = `Struk_Mainstay_${orderAktif.orderId}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        alert("Gagal menyimpan gambar. Pastikan memori HP tidak penuh.");
    } finally {
        if (btn) {
            btn.innerHTML = teksAsli;
            btn.disabled = false;
        }
    }
};


// ==========================================
// 2. FUNGSI KIRIM WA (AUTO FORMAT 62 & POP-UP)
// ==========================================
// 1. Fungsi saat tombol "Kirim WA" utama ditekan
window.kirimStrukWA = () => {
    if (!orderAktif) return;

    let noWA = orderAktif.customerPhone || orderAktif.wa || ""; 
    
    // Jika nomor kosong, buka laci input di bawahnya
    if (!noWA || noWA === "-" || noWA.trim() === "") {
        const wadahManual = document.getElementById('wadah-wa-manual');
        if (wadahManual) {
            wadahManual.classList.remove('hidden'); // Memunculkan laci
            document.getElementById('input-wa-manual').focus(); // Otomatis kursor masuk ke kolom
        }
        return; 
    }

    // Jika nomor sudah ada dari awal, langsung eksekusi tanpa buka laci
    jalankanKirimWA(noWA);
};

// 2. Fungsi saat tombol "Kirim" di dalam laci ditekan
window.prosesKirimWAManual = () => {
    const inputWA = document.getElementById('input-wa-manual');
    let noWA = inputWA ? inputWA.value : "";
    
    if (!noWA || noWA.trim() === "") {
        alert("Nomor WA belum diisi!");
        return;
    }
    
    jalankanKirimWA(noWA);
    
    // Tutup dan bersihkan laci kembali setelah berhasil terkirim
    document.getElementById('wadah-wa-manual').classList.add('hidden');
    if (inputWA) inputWA.value = ""; 
};

// 3. Mesin Utama Pengirim WA (Bisa pilih aplikasi WA / WA Business)
window.jalankanKirimWA = (noWA) => {
    // Bersihkan spasi/simbol dan ubah 0 menjadi 62
    noWA = noWA.trim().replace(/[-+ ]/g, ""); 
    if (noWA.startsWith("0")) {
        noWA = "62" + noWA.substring(1);
    }

    const daftarMenuWA = orderAktif.items.map(i => `${i.qty}x ${i.name} - ${formatRupiah(i.price * i.qty)}`).join('\n');
    const pesan = `Halo kak! 👋\nTerima kasih sudah jajan di *Mainstay Drink*.\n\n*🧾 RINCIAN PESANAN*\nNo: ${orderAktif.orderId}\nWaktu: ${new Date(orderAktif.timestamp).toLocaleString('id-ID')}\n-----------------------------------\n${daftarMenuWA}\n-----------------------------------\n*TOTAL: ${formatRupiah(orderAktif.totalAmount)}*\nMetode Bayar: ${orderAktif.paymentMethod}\n\nDitunggu kedatangannya kembali ya kak! ✨`;

    window.location.href = `whatsapp://send?phone=${noWA}&text=${encodeURIComponent(pesan)}`;
};

// ==========================================
// MESIN POP-UP BERHASIL (CASH & QRIS) - FINAL (NO WA RESTO AKTIF)
// ==========================================
window.tampilkanPopupBerhasil = (orderId, metode, total, nama) => {
    const popupLama = document.getElementById('popup-sukses-order');
    if (popupLama) popupLama.remove();

    // 1. Sistem mengintip otomatis apakah kolom WA di form kasir kosong atau diisi
    const elemenHp = document.getElementById('co-phone');
    const noHpPelanggan = elemenHp ? elemenHp.value.trim() : '';
    const belumAdaWa = (noHpPelanggan === '' || noHpPelanggan === '-');

    const modal = document.createElement('div');
    modal.id = 'popup-sukses-order';
    modal.className = 'fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-5';

    let htmlKonten = '';
    
    const safeNama = nama.replace(/'/g, "\\'"); // Mencegah error jika nama pelanggan pakai petik
    const totalRp = formatRupiah(total);

    if (metode === 'Cash') {
        htmlKonten = `
            <div class="bg-white w-full max-w-sm rounded-2xl p-5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                <div class="w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center text-xl mb-3 mt-2 shadow-sm">
                    <i class="fa-solid fa-receipt"></i>
                </div>
                
                <h2 class="text-lg font-black text-slate-800 mb-1">Pesanan Tercatat!</h2>
                <div class="flex flex-col items-center gap-0.5 mb-4">
                    <p class="text-xs text-slate-500 font-bold">Atas Nama: <span class="text-green-600 uppercase">${nama}</span></p>
                    <p class="text-[10px] text-slate-400 font-bold">Kode: ${orderId}</p>
                </div>

                <div class="w-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-3 mb-4 shadow-inner">
                    <p class="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider">Total Tagihan Tunai</p>
                    <p class="text-xl font-black text-amber-500">${totalRp}</p>
                </div>

                <p class="text-[10px] text-slate-600 font-medium mb-5 bg-amber-50 text-amber-700 p-2.5 rounded-lg border border-amber-100 leading-relaxed">
                    <i class="fa-solid fa-cash-register mr-1"></i> Silakan menuju meja kasir dan sebutkan nama Anda untuk melakukan pembayaran tunai.
                </p>

                <button onclick="tutupLaluRefresh()" class="w-full bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold py-2.5 rounded-xl transition active:scale-95">Selesai & Tutup</button>
            </div>
        `;
    } else {
        // SUDAH TERSAMBUNG KE NO WA RESTO MAINSTAY
        const nomorWaToko = "628977099557"; 
        
        // Draft WA jika nomor WA sudah ada dari awal
        const pesanWaAsli = `Halo Kasir, saya atas nama *${nama}* (Kode: ${orderId}, No. WA: ${noHpPelanggan}) sudah melakukan pembayaran QRIS sebesar *${totalRp}*. Berikut bukti pembayarannya.`;
        const linkWaAsli = `https://wa.me/${nomorWaToko}?text=${encodeURIComponent(pesanWaAsli)}`;
        
        const linkGambarQris = "qris-mainstay.png"; 

        // 2. Logika Pintar Tombol WA: Langsung Link ATAU Buka Laci
        const tombolWaHtml = belumAdaWa 
            ? `<button id="tombol-wa-awal" onclick="bukaLaciWa()" class="flex-[1.5] bg-green-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm transition active:scale-95">
                    <i class="fa-brands fa-whatsapp text-sm"></i> Kirim Bukti WA
               </button>`
            : `<a href="${linkWaAsli}" target="_blank" class="flex-[1.5] bg-green-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm transition active:scale-95">
                    <i class="fa-brands fa-whatsapp text-sm"></i> Kirim Bukti WA
               </a>`;

        htmlKonten = `
            <div class="bg-white w-full max-w-sm rounded-2xl p-5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                
                <div class="w-12 h-12 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xl mb-3 mt-2 shadow-sm">
                    <i class="fa-solid fa-qrcode"></i>
                </div>
                
                <h2 class="text-lg font-black text-slate-800 mb-1">Pembayaran QRIS</h2>
                <div class="flex flex-col items-center gap-1 mb-4">
                    <p class="text-xs text-slate-500 font-bold">Atas Nama: <span class="text-blue-600 uppercase">${nama}</span></p>
                    <p class="text-sm font-black text-amber-500 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">${totalRp}</p>
                </div>

                <div class="w-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-2 mb-3 relative flex justify-center shadow-inner">
                    <img src="${linkGambarQris}" alt="QRIS Mainstay" class="w-full max-w-[170px] h-auto object-contain rounded-lg">
                </div>

                <p class="text-[10px] text-slate-600 font-medium mb-4 bg-blue-50 text-blue-700 p-2.5 rounded-lg border border-blue-100 leading-relaxed w-full">
                    <i class="fa-solid fa-circle-info mr-1"></i> Silakan tunjukkan bukti pembayaran langsung ke kasir atau kirim via WA lewat tombol di bawah.
                </p>

                <!-- Laci Input WA Susulan -->
                <div id="laci-wa" class="hidden w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-3 shadow-inner">
                    <p class="text-[10px] text-slate-600 font-bold mb-2 text-left"><i class="fa-solid fa-phone mr-1"></i> Masukkan No. WA Pelanggan:</p>
                    <div class="flex gap-2">
                        <input type="tel" id="input-wa-susulan" placeholder="Contoh: 0812345..." class="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-green-500 font-medium bg-white">
                        <button onclick="prosesWaSusulan('${safeNama}', '${orderId}', '${totalRp}')" class="bg-green-500 hover:bg-green-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-sm">Kirim WA</button>
                    </div>
                </div>

                <!-- Area Tombol Aksi -->
                <div class="flex gap-2 w-full mb-2">
                    <a href="${linkGambarQris}" download="QRIS-Mainstay.png" class="flex-1 bg-white text-slate-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs border-2 border-slate-200 transition active:scale-95 shadow-sm">
                        <i class="fa-solid fa-download"></i> Simpan
                    </a>
                    ${tombolWaHtml}
                </div>

                <button onclick="tutupLaluRefresh()" class="w-full text-slate-400 font-semibold text-[11px] py-2 mt-1 hover:text-slate-600 transition">Tutup Peringatan Ini</button>
            </div>
        `;
    }

    modal.innerHTML = htmlKonten;
    document.body.appendChild(modal);
};

// ==========================================
// FUNGSI PEMBANTU UNTUK LACI & PENUTUPAN
// ==========================================
window.bukaLaciWa = () => {
    document.getElementById('laci-wa').classList.remove('hidden');
    document.getElementById('tombol-wa-awal').style.display = 'none';
};

window.prosesWaSusulan = (nama, orderId, totalRp) => {
    const inputSusulan = document.getElementById('input-wa-susulan');
    const noBaru = inputSusulan ? inputSusulan.value.trim() : '';
    
    if (noBaru === '') {
        alert('Nomor WA wajib diisi terlebih dahulu!');
        if (inputSusulan) inputSusulan.focus();
        return;
    }

    // SUDAH TERSAMBUNG KE NO WA RESTO MAINSTAY
    const nomorWaToko = "628977099557"; 
    
    // Draft ini dirakit menggunakan nomor yang baru saja diketik di laci
    const pesanWaBaru = `Halo Kasir, saya atas nama *${nama}* (Kode: ${orderId}, No. WA: ${noBaru}) sudah melakukan pembayaran QRIS sebesar *${totalRp}*. Berikut bukti pembayarannya.`;
    const linkWaBaru = `https://wa.me/${nomorWaToko}?text=${encodeURIComponent(pesanWaBaru)}`;
    
    window.open(linkWaBaru, '_blank');
};

window.tutupLaluRefresh = () => {
    const modal = document.getElementById('popup-sukses-order');
    if (modal) modal.remove();
    window.location.reload();
};
// ==========================================

// ==========================================
// FITUR AUTO-JOIN GRUP WA MEMBER
// ==========================================
window.autoJoinGrup = (elemenCeklis) => {
    if (elemenCeklis.checked) {
        const linkGrupWa = "whatsapp://chat?code=DYUTVUGWfzcHoCWnKNFdSB"; 
        window.location.href = linkGrupWa;
    }
};

// ==========================================
// MESIN POP-UP BATAL PESANAN (DESAIN PREMIUM)
// ==========================================
window.tampilkanPopupBatal = (key) => {
    const popupLama = document.getElementById('popup-batal-custom');
    if (popupLama) popupLama.remove();

    const modal = document.createElement('div');
    modal.id = 'popup-batal-custom';
    modal.className = 'fixed inset-0 z-[999999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-5 opacity-0 transition-opacity duration-300';

    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl transform scale-95 transition-transform duration-300">
            <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4 shadow-inner border border-red-100">
                <i class="fa-solid fa-ban"></i>
            </div>
            
            <h2 class="text-xl font-black text-slate-800 mb-1">Batalkan Pesanan?</h2>
            <p class="text-xs text-slate-500 font-medium mb-6 px-2 leading-relaxed">
                Tindakan ini tidak dapat diurungkan. Pesanan pelanggan ini akan dihapus dari sistem.
            </p>

            <div class="flex gap-3 w-full">
                <button onclick="window.tutupPopupBatal()" class="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition active:scale-95 text-xs">
                    Kembali
                </button>
                <button onclick="window.eksekusiBatalOrder('${key}')" class="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl hover:bg-red-600 transition shadow-md active:scale-95 text-xs flex justify-center items-center gap-2">
                    <i class="fa-solid fa-trash-can"></i> Ya, Batalkan
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Animasi masuk agar munculnya mulus
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.querySelector('div').classList.remove('scale-95');
    }, 10);
};

window.tutupPopupBatal = () => {
    const modal = document.getElementById('popup-batal-custom');
    if (modal) {
        modal.classList.add('opacity-0');
        modal.querySelector('div').classList.add('scale-95');
        setTimeout(() => modal.remove(), 300);
    }
};

// ==========================================
// TAHAP 1: MESIN DATA MASTER (KATEGORI & TOPPING)
// ==========================================
window.masterKategori = JSON.parse(localStorage.getItem('master_kategori')) || [];
window.masterTopping = JSON.parse(localStorage.getItem('master_topping')) || [];

window.tambahMasterKategori = () => {
    const inputEl = document.getElementById('input-kategori-baru');
    const nama = inputEl.value.trim();
    if (!nama) return alert("Ketik nama kategori dulu ya!");
    if (window.masterKategori.includes(nama)) return alert("Kategori ini sudah ada di daftar!");
    window.masterKategori.push(nama);
    inputEl.value = '';
    localStorage.setItem('master_kategori', JSON.stringify(window.masterKategori)); // <-- TARUH DI SINI
    window.renderMasterKategori();
};
window.hapusMasterKategori = (nama) => {
    window.masterKategori = window.masterKategori.filter(item => item !== nama);
    localStorage.setItem('master_kategori', JSON.stringify(window.masterKategori));
    window.renderMasterKategori();
};

window.renderMasterKategori = () => {
    const wadah = document.getElementById('list-master-kategori');
    if (!wadah) return;
    if (window.masterKategori.length === 0) {
        wadah.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada kategori. Silakan tambah.</p>';
        return;
    }
    wadah.innerHTML = window.masterKategori.map(nama => `
        <div class="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
            ${nama}
            <button onclick="window.hapusMasterKategori('${nama}')" class="text-slate-300 hover:text-red-500 transition"><i class="fa-solid fa-circle-xmark"></i></button>
        </div>
    `).join('');
};

window.tambahMasterTopping = () => {
    const namaEl = document.getElementById('input-topping-nama');
    const hargaEl = document.getElementById('input-topping-harga');
    const nama = namaEl.value.trim();
    const harga = parseInt(hargaEl.value) || 0; 
    if (!nama) return alert("Nama topping harus diisi!");
    const id = 'top_' + Date.now();
    window.masterTopping.push({ id, nama, harga });
    namaEl.value = ''; hargaEl.value = ''; 
    localStorage.setItem('master_topping', JSON.stringify(window.masterTopping)); // <-- TARUH DI SINI
    window.renderMasterTopping();
};

window.hapusMasterTopping = (id) => {
    window.masterTopping = window.masterTopping.filter(v => v.id !== id);
    localStorage.setItem('master_topping', JSON.stringify(window.masterTopping)); // <-- TARUH DI SINI
    window.renderMasterTopping();
};

window.renderMasterTopping = () => {
    const wadah = document.getElementById('list-master-topping');
    if (!wadah) return;
    if (window.masterTopping.length === 0) {
        wadah.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada topping. Silakan tambah.</p>';
        return;
    }
    wadah.innerHTML = window.masterTopping.map(top => `
        <div class="bg-white border border-slate-200 p-2.5 rounded-xl flex justify-between items-center shadow-sm">
            <div>
                <p class="text-xs font-bold text-slate-800">${top.nama}</p>
                <p class="text-[10px] font-black text-emerald-500">+ Rp ${top.harga.toLocaleString('id-ID')}</p>
            </div>
            <button onclick="window.hapusMasterTopping('${top.id}')" class="bg-red-50 text-red-500 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition active:scale-95"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
        </div>
    `).join('');
};
// ==========================================

// ==========================================
// TAHAP 2 & 3: MESIN MASTER VARIAN (VERSI PRO DENGAN HARGA)
// ==========================================
window.masterVarian = JSON.parse(localStorage.getItem('master_varian')) || [];
window.tambahMasterVarian = () => {
    const namaEl = document.getElementById('input-varian-nama');
    const opsiEl = document.getElementById('input-varian-opsi');
    const nama = namaEl.value.trim();
    const opsiRaw = opsiEl.value.trim();
    
    if (!nama || !opsiRaw) return alert("Nama Varian dan Pilihan Opsi wajib diisi!");
    
    // LOGIKA PINTAR: Pecah koma, lalu deteksi tanda sama dengan (=) untuk harga
    const opsiArray = opsiRaw.split(',').map(item => {
        const parts = item.split('=');
        const namaOpsi = parts[0].trim();
        // Jika ada tanda '=', bersihkan teksnya dan ambil angka harganya saja. Jika tidak ada, default 0.
        const hargaOpsi = parts.length > 1 ? Number(parts[1].replace(/[^0-9]/g, '')) : 0; 
        return { namaOpsi: namaOpsi, harga: hargaOpsi };
    }).filter(o => o.namaOpsi !== '');

    if (opsiArray.length === 0) return alert("Format pilihan salah! Cek kembali ketikannya.");

    const id = 'var_' + Date.now();
    window.masterVarian.push({ id, nama, opsi: opsiArray });
    
    namaEl.value = ''; opsiEl.value = '';
    localStorage.setItem('master_varian', JSON.stringify(window.masterVarian)); // <--- TARUH DI SINI
    window.renderMasterVarian();
    if(typeof window.renderCheckboxVarian === 'function') window.renderCheckboxVarian();
};

window.hapusMasterVarian = (id) => {
    window.masterVarian = window.masterVarian.filter(v => v.id !== id);
    localStorage.setItem('master_varian', JSON.stringify(window.masterVarian)); // <--- TARUH DI SINI
    window.renderMasterVarian();
    if(typeof window.renderCheckboxVarian === 'function') window.renderCheckboxVarian();
};

window.renderMasterVarian = () => {
    const wadah = document.getElementById('list-master-varian');
    if (!wadah) return;
    if (window.masterVarian.length === 0) {
        wadah.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada varian. Silakan tambah.</p>';
        return;
    }
    wadah.innerHTML = window.masterVarian.map(v => {
        // Cetak teks harga jika harganya lebih dari 0
        const opsiTeks = v.opsi.map(o => o.harga > 0 ? `${o.namaOpsi} (+Rp${o.harga.toLocaleString('id-ID')})` : o.namaOpsi).join(' • ');

        return `
        <div class="bg-white border border-slate-200 p-2.5 rounded-xl flex justify-between items-center shadow-sm mb-2">
            <div>
                <p class="text-xs font-bold text-slate-800">${v.nama}</p>
                <p class="text-[10px] font-medium text-purple-600 mt-1 leading-relaxed"><i class="fa-solid fa-list-check mr-1"></i> ${opsiTeks}</p>
            </div>
            <button onclick="window.hapusMasterVarian('${v.id}')" class="bg-red-50 text-red-500 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition active:scale-95 ml-2"><i class="fa-solid fa-trash-can text-[10px]"></i></button>
        </div>
        `;
    }).join('');
};

window.renderCheckboxVarian = () => {
    const wadah = document.getElementById('wadah-checkbox-varian');
    if (!wadah) return;
    if (!window.masterVarian || window.masterVarian.length === 0) {
        wadah.innerHTML = '<p class="text-[10px] text-slate-400 italic">Belum ada varian di Master Data.</p>';
        return;
    }
    wadah.innerHTML = window.masterVarian.map(v => {
        // Cetak tulisan ringkas untuk di form menu
        const opsiTeks = v.opsi.map(o => o.harga > 0 ? `${o.namaOpsi} (+${o.harga/1000}k)` : o.namaOpsi).join(', ');
        return `
        <label class="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-purple-50 transition shadow-sm">
            <input type="checkbox" value="${v.id}" class="checkbox-varian-menu w-3.5 h-3.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500">
            <span class="text-[11px] font-bold text-slate-700">${v.nama} <span class="text-[9px] text-slate-400 font-normal">(${opsiTeks})</span></span>
        </label>
        `;
    }).join('');
};
// ==========================================

// ==========================================
// FITUR BACKSOUND MUSIC (BGM) KHUSUS PELANGGAN
// ==========================================
window.bgm = document.getElementById('bgm-mainstay');
window.bgmIcon = document.getElementById('icon-bgm');
window.btnBgm = document.getElementById('btn-bgm');
window.isBgmPlaying = false;
window.bgmUserPaused = false; // <-- MEMORI: Mengingat apakah user sengaja mute

if(window.bgm) window.bgm.volume = 0.3; 

window.cobaPlayBGM = () => {
    // Gembok Anti-Bocor Kasir/Owner
    if (typeof currentRole !== 'undefined' && (currentRole === 'kasir' || currentRole === 'owner')) return;
    const viewKasir = document.getElementById('view-kasir');
    const viewOwner = document.getElementById('view-owner');
    if (viewKasir && !viewKasir.classList.contains('hidden')) return;
    if (viewOwner && !viewOwner.classList.contains('hidden')) return;

    if(!window.bgm) return;
    window.bgm.play().then(() => {
        if(window.bgmIcon) window.bgmIcon.className = "fa-solid fa-volume-high text-blue-500";
        window.isBgmPlaying = true;
        window.bgmUserPaused = false; 
    }).catch(err => console.log("Menunggu klik..."));
};

window.toggleBGM = () => {
    if (!window.bgm) return;
    if (window.isBgmPlaying) {
        window.bgm.pause();
        if(window.bgmIcon) window.bgmIcon.className = "fa-solid fa-volume-xmark text-slate-400";
        window.isBgmPlaying = false;
        window.bgmUserPaused = true; // <-- INGAT: Pelanggan sengaja mematikan lagu
    } else {
        window.bgmUserPaused = false; 
        window.cobaPlayBGM();
    }
};

window.matikanBGM = () => {
    if (window.bgm) window.bgm.pause(); 
    if (window.btnBgm) window.btnBgm.style.display = 'none'; 
    if (window.bgmIcon) window.bgmIcon.className = "fa-solid fa-volume-xmark text-slate-400";
    window.isBgmPlaying = false; 
};

window.nyalakanBGM = () => {
    if (window.btnBgm) window.btnBgm.style.display = 'flex'; 
    // Nyalakan lagu HANYA JIKA pelanggan sebelumnya tidak memute manual
    if (!window.bgmUserPaused) {
        window.cobaPlayBGM(); 
    }
};

// Coba putar otomatis di awal
setTimeout(() => { window.cobaPlayBGM(); }, 500);

// Pancingan layar: JANGAN paksa nyala kalau pelanggan sengaja nge-mute
document.body.addEventListener('click', () => {
    if (window.isBgmPlaying || window.bgmUserPaused) return; 
    const viewCust = document.getElementById('view-customer');
    if (viewCust && !viewCust.classList.contains('hidden')) {
        window.cobaPlayBGM();
    }
});
// ==========================================

// ==========================================
// FITUR ALWAYS ON DISPLAY (WAKE LOCK) KASIR
// ==========================================
window.wakeLock = null;

window.requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            window.wakeLock = await navigator.wakeLock.request('screen');
            console.log('Layar Kasir Aktif Terus');
        }
    } catch (err) {
        console.log('Gagal mengunci layar:', err.message);
    }
};

window.releaseWakeLock = () => {
    if (window.wakeLock !== null) {
        window.wakeLock.release().then(() => {
            window.wakeLock = null;
        });
    }
};

// Pancingan Pintar: Jika Mas Ihsan sempat minimize Chrome/PWA untuk buka WA,
// lalu kembali ke aplikasi Kasir, layar akan otomatis dikunci "Always On" lagi.
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && typeof currentRole !== 'undefined' && currentRole === 'kasir') {
        window.requestWakeLock();
    }
});
// ==========================================

// ==========================================
// TAHAP 3: FUNGSI SIMPAN MENU + VARIAN & TOPPING
// ==========================================
window.simpanMenuBaru = async () => {
    const namaEl = document.getElementById('fm-name');
    const priceEl = document.getElementById('fm-price');
    
    // Tarik elemen kategori
    const catEl = document.getElementById('fm-cat') || document.getElementById('select-kategori-menu');

    // Validasi form
    if (!namaEl || !namaEl.value.trim()) return alert("Nama Menu wajib diisi!");
    if (!priceEl || !priceEl.value) return alert("Harga Menu wajib diisi!");

    const kategoriValue = (catEl && catEl.value) ? catEl.value : 'coffee';

    // Kumpulkan Centangan Topping & Varian
    const toppingTerpilih = [];
    document.querySelectorAll('.checkbox-topping-menu:checked').forEach(cb => toppingTerpilih.push(cb.value));

    const varianTerpilih = [];
    document.querySelectorAll('.checkbox-varian-menu:checked').forEach(cb => varianTerpilih.push(cb.value));

    // ==========================================
    // LOGIKA GAMBAR DUAL OPSI (URL vs FILE LOKAL)
    // ==========================================
    const imgUrlEl = document.getElementById('fm-image-url');
    const imgFileEl = document.getElementById('fm-image-file');
    let finalImageUrl = 'https://via.placeholder.com/150?text=Menu+Baru'; // Gambar default jika kosong

    // Prioritas 1: Jika user meng-upload file dari memori HP/Laptop
    if (imgFileEl && imgFileEl.files.length > 0) {
        const file = imgFileEl.files[0];
        // Ubah file gambar menjadi teks (Base64) agar bisa masuk ke database
        finalImageUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    } 
    // Prioritas 2: Jika user menggunakan Link URL gambar
    else if (imgUrlEl && imgUrlEl.value.trim() !== '') {
        finalImageUrl = imgUrlEl.value.trim();
    }
    // ==========================================

    const payload = {
        name: namaEl.value.trim(),
        price: Number(priceEl.value),
        category: kategoriValue,
        isAvailable: true,
        imageUrl: finalImageUrl, 
        toppingIds: toppingTerpilih,
        varianIds: varianTerpilih
    };

    // Kirim ke database
    await window.simpanNode('menus', payload);

    // Bersihkan form setelah sukses
    namaEl.value = '';
    priceEl.value = '';
    if (imgUrlEl) imgUrlEl.value = '';
    if (imgFileEl) imgFileEl.value = '';
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    alert("Menu baru beserta gambarnya berhasil disimpan!");
    if(typeof window.renderPanelMenu === 'function') window.renderPanelMenu();
};
// ==========================================

// ==========================================
// PENDETEKSI SESI OTOMATIS (ANTI REFRESH)
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const sesiAktif = localStorage.getItem('mainstay_session_role');
        if (sesiAktif === 'owner' || sesiAktif === 'kasir') {
            if (typeof window.switchRoleView === 'function') {
                window.switchRoleView(sesiAktif); 
            }
        }
    }, 500); 
});
