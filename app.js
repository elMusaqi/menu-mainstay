// ==========================================
// 1. STATE & DATA GLOBAL
// ==========================================
let currentCart = []; // Array untuk menyimpan pesanan keranjang
let cameraStream = null; // Menyimpan status kamera aktif

// ==========================================
// 2. LOGIKA JAM LIVE REAL-TIME
// ==========================================
function updateClock() {
    const clockElement = document.getElementById('live-clock');
    if (!clockElement) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    clockElement.textContent = `${hours}:${minutes}:${seconds} WIB`;
}

// Jalankan jam setiap detik
setInterval(updateClock, 1000);
updateClock(); // Panggil fungsi pertama kali agar tidak menunggu 1 detik


// ==========================================
// 3. SISTEM KAMERA ABSENSI (SMART ATTENDANCE)
// ==========================================
const attendanceModal = document.getElementById('modal-attendance');
const reviewModal = document.getElementById('modal-attendance-review');

// Fungsi mengaktifkan kamera depan
async function startCamera() {
    const cameraContainer = document.querySelector('#modal-attendance .aspect-square');
    if (!cameraContainer) return;

    try {
        // Minta akses kamera depan (user) ke browser HP
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' }, 
            audio: false 
        });

        // Buat elemen video jika belum ada
        let videoEl = document.getElementById('attendance-video');
        if (!videoEl) {
            videoEl = document.createElement('video');
            videoEl.id = 'attendance-video';
            videoEl.autoplay = true;
            videoEl.playsInline = true;
            videoEl.className = 'w-full h-full object-cover absolute inset-0 z-10 rounded-2xl';
            cameraContainer.appendChild(videoEl);
        }
        
        videoEl.srcObject = cameraStream;
        
    } catch (err) {
        console.error("Akses kamera ditolak atau tidak tersedia:", err);
        alert("Mohon izinkan akses kamera pada browser Anda untuk melakukan absensi.");
    }
}

// Fungsi mematikan kamera (Hemat baterai)
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Override fungsi buka tutup modal khusus untuk kamera
window.openAttendanceModal = function() {
    document.getElementById('modal-attendance').classList.remove('hidden');
    startCamera();
}

window.closeAttendanceModal = function() {
    document.getElementById('modal-attendance').classList.add('hidden');
    stopCamera();
}

// Logika jepret absen & munculkan review
function handleAbsen(type) {
    const pinInput = document.querySelector('#modal-attendance input[type="password"]');
    
    if (!pinInput.value) {
        alert("Masukkan PIN Anda terlebih dahulu!");
        return;
    }

    closeAttendanceModal();
    pinInput.value = ''; // Kosongkan PIN kembali
    
    reviewModal.classList.remove('hidden');
    
    // Set timer otomatis menutup pop-up sukses dalam 5 detik
    setTimeout(() => {
        reviewModal.classList.add('hidden');
    }, 5000);
}

// Pasang event listener ke tombol MASUK dan PULANG
document.addEventListener('DOMContentLoaded', () => {
    const absenButtons = document.querySelectorAll('#modal-attendance button.flex-1');
    if (absenButtons.length >= 2) {
        absenButtons[0].addEventListener('click', () => handleAbsen('masuk'));
        absenButtons[1].addEventListener('click', () => handleAbsen('pulang'));
    }
});


// ==========================================
// 4. SINKRONISASI LOGO UNIVERSAL (DASBOR OWNER)
// ==========================================
window.syncUniversalLogo = function() {
    const inputUrl = document.getElementById('input-logo-url').value;
    
    if (!inputUrl) {
        alert("Harap paste link URL gambar logo terlebih dahulu!");
        return;
    }

    // A. Update Preview di dalam Form Owner
    const previewImg = document.getElementById('preview-logo-upload');
    previewImg.src = inputUrl;
    previewImg.classList.remove('hidden');

    // B. Update Logo Header Web (Kiri Atas)
    const headerLogoImg = document.getElementById('header-logo-img');
    const headerLogoIcon = document.getElementById('header-logo-icon');
    if(headerLogoImg && headerLogoIcon) {
        headerLogoImg.src = inputUrl;
        headerLogoImg.classList.remove('hidden');
        headerLogoIcon.classList.add('hidden');
    }

    // C. Update Favicon (Ikon Tab Browser)
    const favicon = document.getElementById('favicon-universal');
    if(favicon) favicon.href = inputUrl;

    // D. Update Meta Image Open Graph (Thumbnail Link WA)
    const metaOg = document.getElementById('meta-og-image');
    if(metaOg) metaOg.setAttribute('content', inputUrl);

    // E. SINKRONISASI MANIFEST DINAMIS (Ikon PWA di HP ikut berubah)
    updateDynamicManifest(inputUrl);

    alert("Sukses! Logo Universal (PWA, Favicon, Web, Link WA) berhasil disinkronkan!");
};

// Fungsi merakit ulang manifest.json secara real-time di browser
function updateDynamicManifest(newIconUrl) {
    const manifestLink = document.getElementById('manifest-link');
    if (!manifestLink) return;

    const myDynamicManifest = {
        "name": "Mainstay Drink - POS & E-Menu",
        "short_name": "Mainstay",
        "description": "Pesan minuman andalanmu dengan mudah dan tanpa antre.",
        "start_url": "./index.html",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#ea580c",
        "orientation": "portrait",
        "icons": [
            {
                "src": newIconUrl,
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": newIconUrl,
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
        ]
    };

    const stringManifest = JSON.stringify(myDynamicManifest);
    const blob = new Blob([stringManifest], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(blob);
    
    manifestLink.setAttribute('href', manifestURL);
}


// ==========================================
// 5. LOGIKA KERANJANG BELANJA (CART SYSTEM)
// ==========================================
const sizePrices = {
    'Small': 16000,
    'Medium': 19000,
    'Large': 22000
};

let currentSelectedMenu = {
    name: 'Es Kopi Mainstay',
    basePrice: 16000,
    size: 'Small',
    qty: 1
};

function updateMenuDetailPrice() {
    const total = currentSelectedMenu.basePrice * currentSelectedMenu.qty;
    const btnAdd = document.querySelector('#modal-menu-detail button.bg-\\[\\#ea580c\\]');
    if (btnAdd) {
        btnAdd.innerHTML = `<span>Tambah Pesanan</span><span>Rp ${total.toLocaleString('id-ID')}</span>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sizeRadios = document.querySelectorAll('input[name="size"]');
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const sizeLabel = e.target.nextElementSibling.innerText;
            currentSelectedMenu.size = sizeLabel;
            currentSelectedMenu.basePrice = sizePrices[sizeLabel] || 16000;
            updateMenuDetailPrice();
            
            sizeRadios.forEach(r => {
                r.parentElement.classList.remove('border-[#ea580c]', 'bg-orange-50');
                r.parentElement.classList.add('border-gray-200');
            });
            e.target.parentElement.classList.remove('border-gray-200');
            e.target.parentElement.classList.add('border-[#ea580c]', 'bg-orange-50');
        });
    });

    const btnAdd = document.querySelector('#modal-menu-detail button.bg-\\[\\#ea580c\\]');
    if(btnAdd) {
        btnAdd.onclick = addToCart;
    }

    updateFloatingCartUI();
});

window.addToCart = function() {
    currentCart.push({
        id: Date.now(),
        name: currentSelectedMenu.name,
        size: currentSelectedMenu.size,
        qty: currentSelectedMenu.qty,
        price: currentSelectedMenu.basePrice,
        total: currentSelectedMenu.basePrice * currentSelectedMenu.qty
    });
    
    closeModal('modal-menu-detail');
    updateFloatingCartUI();
    currentSelectedMenu.qty = 1;
};

function updateFloatingCartUI() {
    const floatingCart = document.getElementById('floating-cart');
    if (!floatingCart) return;

    if (currentCart.length === 0) {
        floatingCart.classList.add('hidden');
        return;
    } else {
        floatingCart.classList.remove('hidden');
    }

    let totalItems = 0;
    let totalPrice = 0;

    currentCart.forEach(item => {
        totalItems += item.qty;
        totalPrice += item.total;
    });

    const badge = floatingCart.querySelector('.absolute.bg-red-500');
    if (badge) badge.textContent = totalItems;

    const priceEl = floatingCart.querySelector('.text-sm.font-extrabold');
    if (priceEl) priceEl.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
}


// ==========================================
// 6. TAMBAHAN AUDIT KODE (ORDER MANUAL & TAB KASIR)
// ==========================================

// Fungsi tombol Order Manual di Kasir
window.openKasirCatalog = function() {
    switchRoleView('customer');
};

// Logika Interaktif Tab Navigasi Kasir (Konfirmasi ➔ Dapur ➔ Selesai)
document.addEventListener('DOMContentLoaded', () => {
    const kasirTabs = document.querySelectorAll('#view-kasir .overflow-x-auto button');
    
    kasirTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            kasirTabs.forEach(t => {
                t.classList.remove('bg-[#ea580c]', 'text-white', 'shadow');
                t.classList.add('bg-gray-100', 'text-gray-500');
            });
            const clickedTab = e.currentTarget;
            clickedTab.classList.remove('bg-gray-100', 'text-gray-500');
            clickedTab.classList.add('bg-[#ea580c]', 'text-white', 'shadow');
        });
    });
});


// ==========================================
// 7. INTERAKSI CAROUSEL VIDEO PROMO
// ==========================================
window.handleCarouselClick = function() {
    const video = document.getElementById('main-carousel-video');
    if(video) {
        if(video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }
}


// ==========================================
// 8. REGISTRASI SERVICE WORKER (MESIN PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('Mesin PWA (ServiceWorker) sukses terdaftar:', registration.scope);
            })
            .catch(err => {
                console.log('ServiceWorker gagal terdaftar:', err);
            });
    });
}
// ==========================================
// 9. HELPER TAMBAHAN UNTUK MODAL DETAIL MENU
// ==========================================
window.openMenuDetail = function(menuId) {
    // Membuka modal detail menu ketika tombol plus (+) di kartu produk ditekan
    const modal = document.getElementById('modal-menu-detail');
    if(modal) {
        modal.classList.remove('hidden');
    }
};
