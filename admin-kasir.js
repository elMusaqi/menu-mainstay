/* ==========================================================================
   MAINSTAY DRINK - ADMIN & STORE CONFIGURATION MODULE
   Fungsi: Identitas Toko, Notifikasi Audio, Kedip Layar, & Auto-Logout
   ========================================================================== */

// Objek untuk menyimpan state konfigurasi resto
window.storeConfig = {
    name: "Mainstay Drink",
    tagline: "Minuman Andalanmu",
    openTime: "09:00",
    closeTime: "22:00",
    audioLoop: true,
    screenFlash: true,
    autoLogoutOnClose: true,
    audioUrl: null
};

let audioPlayer = new Audio();

// ==========================================================================
// 1. UPDATE BRANDING REAL-TIME
// ==========================================================================
function updateBrandName(val) {
    const el = document.getElementById("headerBrandName");
    if (el) el.innerText = val || "Mainstay Drink";
    window.storeConfig.name = val;
}

function updateTagline(val) {
    const el = document.getElementById("headerTagline");
    if (el) el.innerText = val || "Minuman Andalanmu";
    window.storeConfig.tagline = val;
}

function previewImage(input, targetId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(targetId);
            if (img) img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// ==========================================================================
// 2. SISTEM NOTIFIKASI (AUDIO & KEDIP LAYAR)
// ==========================================================================
function handleAudioUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        window.storeConfig.audioUrl = URL.createObjectURL(file);
        audioPlayer.src = window.storeConfig.audioUrl;
        audioPlayer.loop = window.storeConfig.audioLoop;
    }
}

function triggerNewOrderNotification() {
    // Putar Audio
    if (window.storeConfig.audioUrl) {
        const loopToggle = document.getElementById("toggleAudioLoop");
        audioPlayer.loop = loopToggle ? loopToggle.checked : true;
        
        audioPlayer.play().catch(err => {
            console.log("Browser memblokir pemutaran audio otomatis:", err);
        });
    }

    // Efek Kedipan Layar
    const flashToggle = document.getElementById("toggleScreenFlash");
    if (flashToggle && flashToggle.checked) {
        document.body.classList.add("flash-screen-active");
        
        // Hentikan kedipan otomatis setelah 4 detik (atau bisa dihentikan manual oleh staf)
        setTimeout(() => {
            document.body.classList.remove("flash-screen-active");
        }, 4000);
    }
}

// ==========================================================================
// 3. SIMPAN KONFIGURASI TOKO
// ==========================================================================
function saveStoreConfig() {
    const openEl = document.getElementById("inputOpenTime");
    const closeEl = document.getElementById("inputCloseTime");
    const loopEl = document.getElementById("toggleAudioLoop");
    const flashEl = document.getElementById("toggleScreenFlash");
    const logoutEl = document.getElementById("toggleAutoLogout");

    if (openEl) window.storeConfig.openTime = openEl.value;
    if (closeEl) window.storeConfig.closeTime = closeEl.value;
    if (loopEl) window.storeConfig.audioLoop = loopEl.checked;
    if (flashEl) window.storeConfig.screenFlash = flashEl.checked;
    if (logoutEl) window.storeConfig.autoLogoutOnClose = logoutEl.checked;

    alert("Konfigurasi Toko & Notifikasi Berhasil Disimpan!");
}

// ==========================================================================
// 4. PENGECEKAN JAM TUTUP & AUTO-LOGOUT
// ==========================================================================
function checkAutoLogoutClosing() {
    if (!window.storeConfig.autoLogoutOnClose) return;

    const now = new Date();
    // Konversi jam saat ini menjadi format HH:MM
    const currentHM = now.toTimeString().substring(0, 5);
    const closeTime = window.storeConfig.closeTime;

    if (currentHM >= closeTime) {
        // Cek apakah ada fungsi pengecekan staf aktif (akan dibuat di app.js)
        if (typeof getActiveStaffCount === 'function' && getActiveStaffCount() > 0) {
            console.log("Jam tutup toko telah tercapai, tetapi masih ada staf yang tercatat aktif melayani. Penguncian ditunda.");
        } else {
            console.log("Jam tutup toko telah tercapai dan tidak ada staf aktif. Sistem dikunci.");
            
            // Ubah status badge di header
            const badge = document.getElementById("storeStatusBadge");
            const text = document.getElementById("storeStatusText");
            
            if (badge) {
                badge.classList.remove("open");
                badge.classList.add("closed");
            }
            if (text) text.innerText = "TUTUP";
        }
    }
}

// Jalankan pengecekan setiap 30 detik
setInterval(checkAutoLogoutClosing, 30000);
