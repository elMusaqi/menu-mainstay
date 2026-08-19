// APP CORE STATE, INITIALIZATION & UTILITIES ENGINE

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error:', err));
    });
}

const DEFAULT_THEME = {
    restoName: "Mainstay Drink Shop",
    restoPhone: "6281234567890",
    logoUrl: "",
    qrisUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MAINSTAY-QRIS-DEMO",
    appIconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png",
    sheetWebhookUrl: "",
    themeColor: "amber",
    ftTitle: "Hubungi & Kunjungi Kami",
    ftDesc: "Pesan via GrabFood, GoFood, atau datang langsung ke outlet kami!",
    linkGrab: "https://grab.com",
    linkGoFood: "https://gofood.link",
    linkIg: "https://instagram.com",
    linkTikTok: "https://tiktok.com",
    linkMaps: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126715.84271922964!2d110.34702425!3d-6.9932!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708b4d3f0a0e23%3A0x4027a76e352f2f0!2sSemarang%2C%20Jawa%20Tengah!5e0!3m2!1sid!2sid!4v1680000000000!5m2!1sid!2sid"
};

const DEFAULT_OWNER_PROFILE = {
    name: "Owner Mainstay",
    pin: "9999",
    bank: "BCA",
    rekening: "8830192831",
    photoUrl: "",
    qrisUrl: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=MAINSTAY-QRIS-DEMO"
};

const DEFAULT_CATEGORIES = ["Boba & Milk Tea", "Coffee Series", "Fruit Tea", "Snacks & Extras"];

const DEFAULT_MENU = [
    { id: 101, name: "Brown Sugar Boba Milk", category: "Boba & Milk Tea", price: 22000, desc: "Susu segar dengan gula aren asli dan boba kenyal.", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: false, optSugar: true, optBoba: true },
    { id: 102, name: "Signature Mainstay Coffee", category: "Coffee Series", price: 18000, desc: "Kopi susu gula aren andalan Mainstay.", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: true, optSugar: true, optBoba: true },
    { id: 103, name: "Fresh Mango Jasmine Tea", category: "Fruit Tea", price: 16000, desc: "Teh melati segar rasa mangga manis dingin.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: false, optSugar: true, optBoba: true }
];

const DEFAULT_BANNERS = [
    { id: 1, tag: "🥤 PRE-ORDER & INSTANT", title: "Mainstay Drink Shop", desc: "Melayani pesanan langsung & Pre-Order untuk event / acara khusus Anda!", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=1000&q=80" },
    { id: 2, tag: "🔥 PROMO KHUSUS", title: "Diskon Up To 30%", desc: "Dapatkan potongan harga hemat untuk varian Boba Series setiap hari!", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=1000&q=80" }
];

const THEME_PALETTES = {
    amber: { 50: '#fffbe3', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 900: '#78350f' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' }
};

let store = {
    theme: JSON.parse(localStorage.getItem('app_theme')) || DEFAULT_THEME,
    ownerProfile: JSON.parse(localStorage.getItem('app_owner_profile')) || DEFAULT_OWNER_PROFILE,
    banners: JSON.parse(localStorage.getItem('app_banners')) || DEFAULT_BANNERS,
    categories: JSON.parse(localStorage.getItem('app_categories')) || DEFAULT_CATEGORIES,
    menu: JSON.parse(localStorage.getItem('app_menu')) || DEFAULT_MENU,
    staff: JSON.parse(localStorage.getItem('app_staff')) || [
        {
            id: 1, name: "Kasir Budi", phone: "6281234567891", pin: "1111",
            shiftIn: "08:00", shiftOut: "16:00", toleranceMinutes: 15,
            salaryType: "daily", salaryRate: 80000, lateFinePerHour: 10000,
            bank: "BCA", rekening: "1234567890", rekName: "Budi Santoso",
            photoUrl: "", qrisUrl: "", bonuses: []
        }
    ],
    discounts: JSON.parse(localStorage.getItem('app_discounts')) || [{ id: 1, label: "Tanpa Diskon", value: 0 }, { id: 2, label: "Promo Member (Rp 3.000)", value: 3000 }],
    orders: JSON.parse(localStorage.getItem('app_orders')) || [],
    attendance: JSON.parse(localStorage.getItem('app_attendance')) || [],
    stampMinSpend: parseInt(localStorage.getItem('app_stamp_min_spend')) || 20000,
    stampRewardItemId: parseInt(localStorage.getItem('app_stamp_reward_item_id')) || 101,
    flashSaleItem: JSON.parse(localStorage.getItem('app_flash_sale_item')) || null
};

let cart = [];
let selectedOrderType = 'now';
let selectedPayMethod = 'qris';
let currentRole = 'customer';
let currentCategory = 'Semua';
let customerLayout = 'grid';
let kasirLayout = 'grid';
let pendingTargetRole = '';
let pendingCheckoutOrder = null;
let activeOptionItem = null;
let selectedIce = 'Normal Ice';
let selectedSugar = '100% Sugar';
let currentSlideIndex = 0;
let carouselInterval = null;

// ENGINE JAM REAL-TIME WIB
function getFormattedRealTime() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${dayName}, ${date} ${monthName} ${year} • ${hours}:${minutes}:${seconds} WIB`;
}

function startLiveClock() {
    setInterval(() => {
        const display = document.getElementById('live-clock-display');
        if (display) display.innerText = getFormattedRealTime();
    }, 1000);
}

// CAROUSEL ENGINE
function initCarousel() {
    renderCarouselSlides();
    if (carouselInterval) clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        nextSlide();
    }, 4000);
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
        const bgStyle = b.image ? `background-image: linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.8)), url('${b.image}'); background-size: cover; background-position: center;` : '';
        slidesContainer.innerHTML += `
            <div class="w-full shrink-0 p-5 sm:p-6 flex flex-col justify-center space-y-1 min-h-[140px]" style="${bgStyle}">
                <span class="inline-block px-2.5 py-0.5 bg-themebrand-500 text-slate-950 font-black rounded-lg text-[9px] w-fit uppercase tracking-wider shadow">${b.tag || 'PROMO'}</span>
                <h3 class="font-extrabold text-sm sm:text-lg text-white leading-tight">${b.title}</h3>
                <p class="text-[10px] sm:text-xs text-slate-300 line-clamp-2">${b.desc}</p>
            </div>
        `;

        if (dotsContainer) {
            dotsContainer.innerHTML += `
                <button type="button" onclick="goToSlide(${idx})" class="w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-themebrand-400 w-5' : 'bg-white/40'}"></button>
            `;
        }
    });

    updateSlidePosition();
}

function updateSlidePosition() {
    const slidesContainer = document.getElementById('carousel-slides');
    if (slidesContainer) {
        slidesContainer.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }
    const dotsContainer = document.getElementById('carousel-dots');
    if (dotsContainer) {
        Array.from(dotsContainer.children).forEach((dot, idx) => {
            dot.className = `w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-themebrand-400 w-5' : 'bg-white/40'}`;
        });
    }
}

function nextSlide() {
    if (store.banners.length === 0) return;
    currentSlideIndex = (currentSlideIndex + 1) % store.banners.length;
    updateSlidePosition();
}

function prevSlide() {
    if (store.banners.length === 0) return;
    currentSlideIndex = (currentSlideIndex - 1 + store.banners.length) % store.banners.length;
    updateSlidePosition();
}

function goToSlide(idx) {
    currentSlideIndex = idx;
    updateSlidePosition();
}

// DUAL FILE UPLOAD HELPER
function handleDualFileUpload(event, targetInputId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById(targetInputId).value = e.target.result;
            showToast("File Gambar Berhasil Dimuat!");
        };
        reader.readAsDataURL(file);
    }
}

// VISUAL FEEDBACK & LOADING SPINNER HELPER
function triggerButtonLoading(btnEl, callback) {
    if (!btnEl) return callback();
    btnEl.classList.add('btn-loading');
    setTimeout(() => {
        btnEl.classList.remove('btn-loading');
        callback();
    }, 250);
}

// INITIALIZATION
window.onload = function() {
    startLiveClock();
    applyThemeColor(store.theme.themeColor || 'amber');
    applyBrandingUI();
    initCarousel();
    if (typeof renderCustomerCategories === 'function') renderCustomerCategories();
    if (typeof renderCustomerMenu === 'function') renderCustomerMenu();
    if (typeof renderMemberStamps === 'function') renderMemberStamps();
    if (typeof updateCartFloatingBar === 'function') updateCartFloatingBar();
    updateBadges();
    updateStampRuleDescription();
};

function saveStore(key) { 
    localStorage.setItem(`app_${key}`, JSON.stringify(store[key])); 
    updateBadges(); 
}

function applyThemeColor(colorKey) {
    const palette = THEME_PALETTES[colorKey] || THEME_PALETTES.amber;
    store.theme.themeColor = colorKey;
    saveStore('theme');
    const root = document.documentElement;
    Object.keys(palette).forEach(shade => root.style.setProperty(`--color-brand-${shade}`, palette[shade]));
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

    const logoIcon = document.getElementById('app-logo-icon');
    const logoImg = document.getElementById('app-logo-img');
    if (logoImg && logoIcon) {
        if (store.theme.logoUrl && store.theme.logoUrl.trim() !== '') {
            logoImg.src = store.theme.logoUrl; logoImg.classList.remove('hidden'); logoIcon.classList.add('hidden');
        } else {
            logoImg.classList.add('hidden'); logoIcon.classList.remove('hidden');
        }
    }

    const iconUrl = store.theme.appIconUrl || DEFAULT_THEME.appIconUrl;
    if (document.getElementById('dynamic-favicon')) document.getElementById('dynamic-favicon').href = iconUrl;
    if (document.getElementById('dynamic-apple-touch')) document.getElementById('dynamic-apple-touch').href = iconUrl;

    // FOOTER LINKS & MAPS
    if (document.getElementById('ft-header-title')) {
        document.getElementById('ft-header-title').innerText = store.theme.ftTitle || DEFAULT_THEME.ftTitle;
        document.getElementById('ft-header-desc').innerText = store.theme.ftDesc || DEFAULT_THEME.ftDesc;
        
        let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
        if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);
        
        if (document.getElementById('link-platform-grab')) document.getElementById('link-platform-grab').href = store.theme.linkGrab || '#';
        if (document.getElementById('link-platform-gofood')) document.getElementById('link-platform-gofood').href = store.theme.linkGoFood || '#';
        if (document.getElementById('link-platform-ig')) document.getElementById('link-platform-ig').href = store.theme.linkIg || '#';
        if (document.getElementById('link-platform-tiktok')) document.getElementById('link-platform-tiktok').href = store.theme.linkTikTok || '#';
        if (document.getElementById('link-platform-wa')) document.getElementById('link-platform-wa').href = `https://wa.me/${waResto}`;
        if (document.getElementById('iframe-google-maps')) document.getElementById('iframe-google-maps').src = store.theme.linkMaps || DEFAULT_THEME.linkMaps;
    }
}

function setRole(role) {
    currentRole = role;
    ['customer', 'kasir', 'owner'].forEach(r => {
        const v = document.getElementById(`view-${r}`);
        const b = document.getElementById(`btn-role-${r}`);
        if (v) v.classList.add('hidden');
        if (b) b.classList.remove('active');
    });
    const activeView = document.getElementById(`view-${role}`);
    const activeBtn = document.getElementById(`btn-role-${role}`);
    if (activeView) activeView.classList.remove('hidden');
    if (activeBtn) activeBtn.classList.add('active');

    if (role === 'customer') { 
        if (typeof renderCustomerCategories === 'function') renderCustomerCategories(); 
        if (typeof renderCustomerMenu === 'function') renderCustomerMenu(); 
        initCarousel(); 
    }
    else if (role === 'kasir') { 
        if (typeof renderKasirMenu === 'function') renderKasirMenu(); 
        if (typeof renderKasirPipeline === 'function') renderKasirPipeline(); 
    }
    else if (role === 'owner') { 
        applyBrandingUI(); 
        if (typeof renderOwnerProfileTab === 'function') renderOwnerProfileTab();
        if (typeof renderStaffHRMTab === 'function') renderStaffHRMTab();
        if (typeof renderAttendanceLogTab === 'function') renderAttendanceLogTab();
        if (typeof renderOwnerBanners === 'function') renderOwnerBanners();
        if (typeof renderOwnerCategories === 'function') renderOwnerCategories();
        if (typeof renderOwnerInventory === 'function') renderOwnerInventory();
        if (typeof renderOwnerMemberStamps === 'function') renderOwnerMemberStamps();
        if (typeof renderFlashSaleTab === 'function') renderFlashSaleTab();
        if (typeof updateOwnerStats === 'function') updateOwnerStats();
        if (typeof initSalesChart === 'function') initSalesChart();
    }
    if (typeof updateCartFloatingBar === 'function') updateCartFloatingBar();
    updateBadges();
}

function requestAccess(role) {
    pendingTargetRole = role;
    const titleEl = document.getElementById('auth-title');
    if (titleEl) titleEl.innerText = role === 'owner' ? "Akses Dashboard Owner Master" : "Akses Mode Kasir POS";
    const pinEl = document.getElementById('auth-pin');
    if (pinEl) pinEl.value = '';
    const modalEl = document.getElementById('modal-auth');
    if (modalEl) modalEl.classList.remove('hidden');
}

function closeAuthModal() { 
    const modalEl = document.getElementById('modal-auth');
    if (modalEl) modalEl.classList.add('hidden'); 
}

function submitAuth() {
    const pin = document.getElementById('auth-pin').value;
    const masterPin = store.ownerProfile.pin || "9999";

    if (pendingTargetRole === 'owner') {
        if (pin === masterPin) { closeAuthModal(); setRole('owner'); } 
        else showToast("PIN Master Owner Salah!", true);
    } else if (pendingTargetRole === 'kasir') {
        if (store.staff.some(s => s.pin === pin) || pin === masterPin) { closeAuthModal(); setRole('kasir'); } 
        else showToast("PIN Kasir Salah!", true);
    }
}

function updateStampRuleDescription() {
    const el = document.getElementById('stamp-rule-desc');
    if (el) el.innerText = `Dapatkan 1 stempel tiap min. belanja Rp ${store.stampMinSpend.toLocaleString()}!`;
}
