// CONFIGURASI FIREBASE REALTIME DATABASE MAINSTAY POS
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// DEFAULT STORE STATE
const DEFAULT_THEME = {
    restoName: "Mainstay Drink Shop",
    restoPhone: "6281234567890",
    broadcastWaLink: "https://chat.whatsapp.com/DEMO-LINK-BROADCAST",
    restoIg: "@mainstay.drinkshop",
    restoTikTok: "@mainstay.official",
    logoUrl: "",
    appIconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png",
    isStoreOpenManual: true,
    openTime: "09:00",
    closeTime: "21:00"
};

const DEFAULT_OWNER_PROFILE = {
    name: "Owner Master",
    pin: "9999",
    qrisUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MAINSTAY-QRIS-DEMO"
};

const DEFAULT_CATEGORIES = ["Boba & Milk Tea", "Coffee Series", "Fruit Tea", "Snacks & Extras"];

const DEFAULT_MENU = [
    { id: 101, name: "Brown Sugar Boba Milk", category: "Boba & Milk Tea", price: 22000, desc: "Susu segar dengan gula aren asli dan boba kenyal.", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80", optIce: true, optSugar: true },
    { id: 102, name: "Signature Mainstay Coffee", category: "Coffee Series", price: 18000, desc: "Kopi susu gula aren andalan Mainstay.", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80", optIce: true, optSugar: true },
    { id: 103, name: "Fresh Mango Jasmine Tea", category: "Fruit Tea", price: 16000, desc: "Teh melati segar rasa mangga manis dingin.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80", optIce: true, optSugar: true }
];

const DEFAULT_BANNERS = [
    { id: 1, tag: "🥤 PRE-ORDER & INSTANT", title: "Mainstay Drink Shop", desc: "Melayani pesanan langsung & Pre-Order untuk event / acara khusus Anda!", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80" },
    { id: 2, tag: "🔥 PROMO KHUSUS", title: "Diskon Up To 30%", desc: "Dapatkan potongan harga hemat untuk varian Boba Series setiap hari!", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1000&q=80" }
];

let store = {
    theme: JSON.parse(localStorage.getItem('app_theme')) || DEFAULT_THEME,
    ownerProfile: JSON.parse(localStorage.getItem('app_owner_profile')) || DEFAULT_OWNER_PROFILE,
    banners: JSON.parse(localStorage.getItem('app_banners')) || DEFAULT_BANNERS,
    categories: JSON.parse(localStorage.getItem('app_categories')) || DEFAULT_CATEGORIES,
    menu: JSON.parse(localStorage.getItem('app_menu')) || DEFAULT_MENU,
    members: [],
    staff: JSON.parse(localStorage.getItem('app_staff')) || [
        { id: 1, name: "Kasir Budi", phone: "6281234567891", pin: "1111", photoUrl: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }
    ],
    orders: []
};

let cart = [];
let selectedOrderType = 'now';
let selectedPayMethod = 'qris';
let currentRole = 'customer';
let currentCategory = 'Semua';
let activeKasirStaff = null;
let currentSlideIndex = 0;
let carouselInterval = null;
let isStoreOpenCurrent = true;

// JAM LIVE WIB (TANGGAL & JAM BERPISAH / STACKED)
function startLiveClock() {
    setInterval(() => {
        const now = new Date();
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dateStr = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} WIB`;

        const dateEl = document.getElementById('live-date-display');
        const timeEl = document.getElementById('live-time-display');
        if (dateEl) dateEl.innerText = dateStr;
        if (timeEl) timeEl.innerText = timeStr;

        checkStoreOperationalStatus(now);
    }, 1000);
}

// LOGIKA STATUS BUKA/TUTUP TOKO (MANUAL & JAM OPERASIONAL)
function checkStoreOperationalStatus(nowObj) {
    const now = nowObj || new Date();
    const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const isManualOpen = store.theme.isStoreOpenManual !== false;
    const openTime = store.theme.openTime || "09:00";
    const closeTime = store.theme.closeTime || "21:00";

    const isWithinHours = currentHM >= openTime && currentHM < closeTime;
    isStoreOpenCurrent = isManualOpen && isWithinHours;

    const badge = document.getElementById('header-store-badge');
    const closedBanner = document.getElementById('store-closed-banner');
    const closedMsg = document.getElementById('store-closed-msg');

    if (badge) {
        if (isStoreOpenCurrent) {
            badge.className = "px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300";
            badge.innerText = "BUKA";
        } else {
            badge.className = "px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300";
            badge.innerText = "TUTUP";
        }
    }

    if (closedBanner) {
        if (!isStoreOpenCurrent && currentRole === 'customer') {
            closedBanner.classList.remove('hidden');
            if (closedMsg) {
                if (!isManualOpen) closedMsg.innerText = "Toko sedang ditutup manual oleh Owner.";
                else closedMsg.innerText = `Toko Buka Pukul ${openTime} - ${closeTime} WIB. Pemesanan dikunci sementara.`;
            }
        } else {
            closedBanner.classList.add('hidden');
        }
    }
}

// REALTIME FIREBASE SYNC
function listenToRealtimeCloud() {
    db.ref('orders').on('value', (snapshot) => {
        const data = snapshot.val();
        store.orders = data ? Object.keys(data).map(k => ({ firebaseKey: k, ...data[k] })).reverse() : [];
        if (typeof renderKasirPipeline === 'function') renderKasirPipeline();
        if (typeof updateBadges === 'function') updateBadges();
        if (typeof updateOwnerStats === 'function') updateOwnerStats();
    });

    db.ref('members').on('value', (snapshot) => {
        const data = snapshot.val();
        store.members = data ? Object.keys(data).map(k => ({ firebaseKey: k, ...data[k] })).reverse() : [];
        if (typeof renderOwnerMembersTable === 'function') renderOwnerMembersTable();
    });
}

// HELPER UPLOAD DUAL SOURCE (FILE HP & LINK URL)
function handleDualFileUpload(event, targetInputId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const inputEl = document.getElementById(targetInputId);
            if (inputEl) inputEl.value = e.target.result;
            showToast("Gambar Berhasil Dimuat!");
        };
        reader.readAsDataURL(file);
    }
}

function triggerButtonLoading(btnEl, callback) {
    if (!btnEl) return callback();
    btnEl.classList.add('btn-loading');
    setTimeout(() => {
        btnEl.classList.remove('btn-loading');
        callback();
    }, 250);
}

// CAROUSEL BANNER ENGINE
function initCarousel() {
    renderCarouselSlides();
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(() => { nextSlide(); }, 4000);
}

function renderCarouselSlides() {
    const slidesContainer = document.getElementById('carousel-slides');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!slidesContainer) return;

    slidesContainer.innerHTML = '';
    if (dotsContainer) dotsContainer.innerHTML = '';

    if (store.banners.length === 0) {
        slidesContainer.innerHTML = `<div class="w-full shrink-0 p-6 text-center text-xs font-bold text-slate-400">Belum ada banner iklan.</div>`;
        return;
    }

    store.banners.forEach((b, idx) => {
        const bgStyle = b.image ? `background-image: linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.7)), url('${b.image}'); background-size: cover; background-position: center;` : '';
        slidesContainer.innerHTML += `
            <div class="w-full shrink-0 p-5 sm:p-6 flex flex-col justify-center space-y-1 min-h-[140px]" style="${bgStyle}">
                <span class="inline-block px-2.5 py-0.5 bg-amber-500 text-slate-950 font-black rounded-lg text-[9px] w-fit uppercase">${b.tag || 'PROMO'}</span>
                <h3 class="font-extrabold text-sm sm:text-lg text-white leading-tight">${b.title}</h3>
                <p class="text-[10px] sm:text-xs text-slate-200 line-clamp-2">${b.desc}</p>
            </div>
        `;

        if (dotsContainer) {
            dotsContainer.innerHTML += `<button type="button" onclick="goToSlide(${idx})" class="w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-amber-400 w-5' : 'bg-white/40'}"></button>`;
        }
    });

    updateSlidePosition();
}

function updateSlidePosition() {
    const slidesContainer = document.getElementById('carousel-slides');
    if (slidesContainer) slidesContainer.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
}

function nextSlide() {
    if (store.banners.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % store.banners.length;
    updateSlidePosition();
}

function goToSlide(idx) {
    currentSlideIndex = idx;
    updateSlidePosition();
}

// MANAGEMENT ROLE & VERIFIKASI PIN
function setRole(role) {
    if (role === 'kasir' && !activeKasirStaff) {
        requestAccess('kasir');
        return;
    }
    if (role === 'owner') {
        requestAccess('owner');
        return;
    }
    applyRoleView(role);
}

function applyRoleView(role) {
    currentRole = role;
    ['customer', 'kasir', 'owner'].forEach(r => {
        document.getElementById(`view-${r}`)?.classList.add('hidden');
        document.getElementById(`btn-role-${r}`)?.classList.remove('active');
    });

    document.getElementById(`view-${role}`)?.classList.remove('hidden');
    document.getElementById(`btn-role-${role}`)?.classList.add('active');

    checkStoreOperationalStatus();

    if (role === 'customer') {
        if (typeof renderCustomerCategories === 'function') renderCustomerCategories();
        if (typeof renderCustomerMenu === 'function') renderCustomerMenu();
        initCarousel();
    } else if (role === 'kasir') {
        updateKasirStaffUI();
        if (typeof renderKasirMenu === 'function') renderKasirMenu();
        if (typeof renderKasirPipeline === 'function') renderKasirPipeline();
    } else if (role === 'owner') {
        applyBrandingUI();
        if (typeof renderOwnerBrandingTab === 'function') renderOwnerBrandingTab();
        if (typeof renderOwnerMembersTable === 'function') renderOwnerMembersTable();
        if (typeof renderOwnerInventory === 'function') renderOwnerInventory();
        if (typeof updateOwnerStats === 'function') updateOwnerStats();
    }
    updateBadges();
}

function updateKasirStaffUI() {
    if (activeKasirStaff) {
        if (document.getElementById('active-kasir-name')) document.getElementById('active-kasir-name').innerText = activeKasirStaff.name;
        if (document.getElementById('active-kasir-photo') && activeKasirStaff.photoUrl) {
            document.getElementById('active-kasir-photo').src = activeKasirStaff.photoUrl;
        }
    }
}

function requestAccess(role) {
    pendingTargetRole = role;
    document.getElementById('auth-title').innerText = role === 'owner' ? "Masukkan PIN Owner" : "Masukkan PIN Kasir";
    document.getElementById('auth-pin').value = '';
    document.getElementById('modal-auth')?.classList.remove('hidden');
}

function closeAuthModal() {
    document.getElementById('modal-auth')?.classList.add('hidden');
}

function submitAuth() {
    const pin = document.getElementById('auth-pin').value;
    const masterPin = store.ownerProfile.pin || "9999";

    if (pendingTargetRole === 'owner') {
        if (pin === masterPin) {
            closeAuthModal();
            applyRoleView('owner');
        } else {
            showToast("PIN Owner Salah!", true);
        }
    } else if (pendingTargetRole === 'kasir') {
        const foundStaff = store.staff.find(s => s.pin === pin);
        if (foundStaff || pin === masterPin) {
            activeKasirStaff = foundStaff || { name: "Master Owner / Kasir" };
            closeAuthModal();
            applyRoleView('kasir');
            showToast(`Selamat Tugas, Kak ${activeKasirStaff.name}!`);
        } else {
            showToast("PIN Kasir Salah!", true);
        }
    }
}

function lockKasirSession() {
    activeKasirStaff = null;
    applyRoleView('customer');
    showToast("Layar Kasir Dikunci!");
}

function saveStore(key) {
    localStorage.setItem(`app_${key}`, JSON.stringify(store[key]));
    updateBadges();
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.remove('translate-x-80', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-x-80', 'opacity-0'), 2500);
}

function updateBadges() {
    const activeOrders = store.orders.filter(o => o.status === 'Pending' || o.status === 'Cooking').length;
    ['badge-pending-orders', 'badge-kitchen-kitchen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (activeOrders > 0) { el.innerText = activeOrders; el.classList.remove('hidden'); }
            else { el.classList.add('hidden'); }
        }
    });
}

function applyBrandingUI() {
    if (document.getElementById('app-resto-name')) document.getElementById('app-resto-name').innerText = store.theme.restoName;
    if (document.getElementById('rec-resto-title')) document.getElementById('rec-resto-title').innerText = store.theme.restoName;
    if (document.getElementById('rec-ig-footer')) document.getElementById('rec-ig-footer').innerText = `IG: ${store.theme.restoIg || '@mainstay.drinkshop'}`;

    const logoIcon = document.getElementById('app-logo-icon');
    const logoImg = document.getElementById('app-logo-img');
    if (logoImg && logoIcon) {
        if (store.theme.logoUrl && store.theme.logoUrl.trim() !== '') {
            logoImg.src = store.theme.logoUrl;
            logoImg.classList.remove('hidden');
            logoIcon.classList.add('hidden');
        } else {
            logoImg.classList.add('hidden');
            logoIcon.classList.remove('hidden');
        }
    }

    const iconUrl = store.theme.appIconUrl || DEFAULT_THEME.appIconUrl;
    if (document.getElementById('dynamic-favicon')) document.getElementById('dynamic-favicon').href = iconUrl;
}

window.onload = function() {
    startLiveClock();
    applyBrandingUI();
    initCarousel();
    listenToRealtimeCloud();
    if (typeof renderCustomerCategories === 'function') renderCustomerCategories();
    if (typeof renderCustomerMenu === 'function') renderCustomerMenu();
};
