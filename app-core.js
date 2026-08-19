// APP CORE STATE, DUAL-UPLOAD HELPER, & REAL-TIME CLOCK ENGINE

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW error:', err));
    });
}

const DEFAULT_THEME = {
    restoName: "Mainstay Drink Shop",
    restoPhone: "6281234567890",
    logoUrl: "",
    qrisUrl: "",
    appIconUrl: "https://cdn-icons-png.flaticon.com/512/3081/3081162.png",
    sheetWebhookUrl: "",
    themeColor: "amber",
    ftTitle: "Hubungi & Kunjungi Kami",
    ftDesc: "Pesan via GrabFood, GoFood, atau datang langsung ke outlet kami!",
    linkGrab: "",
    linkGoFood: "",
    linkIg: "",
    linkTikTok: "",
    linkMaps: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d126715.84271922964!2d110.34702425!3d-6.9932!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e708b4d3f0a0e23%3A0x4027a76e352f2f0!2sSemarang%2C%20Jawa%20Tengah!5e0!3m2!1sid!2sid!4v1680000000000!5m2!1sid!2sid"
};

const DEFAULT_OWNER_PROFILE = {
    name: "Owner Mainstay",
    pin: "9999",
    bank: "BCA",
    rekening: "8830192831",
    photoUrl: "",
    qrisUrl: ""
};

const DEFAULT_CATEGORIES = ["Boba & Milk Tea", "Coffee Series", "Fruit Tea", "Snacks & Extras"];

const DEFAULT_MENU = [
    { id: 101, name: "Brown Sugar Boba Milk", category: "Boba & Milk Tea", price: 22000, desc: "Susu segar dengan gula aren asli dan boba kenyal.", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: false, optSugar: true, optBoba: true },
    { id: 102, name: "Signature Mainstay Coffee", category: "Coffee Series", price: 18000, desc: "Kopi susu gula aren andalan Mainstay.", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: true, optSugar: true, optBoba: true },
    { id: 103, name: "Fresh Mango Jasmine Tea", category: "Fruit Tea", price: 16000, desc: "Teh melati segar rasa mangga manis dingin.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80", optIce: true, optHot: false, optSugar: true, optBoba: true }
];

const DEFAULT_BANNERS = [
    { id: 1, tag: "🥤 PRE-ORDER & INSTANT", title: "Mainstay Drink Shop", desc: "Melayani pesanan langsung & Pre-Order untuk event / acara khusus Anda!", image: "" },
    { id: 2, tag: "🔥 PROMO KHUSUS", title: "Diskon Up To 30%", desc: "Dapatkan potongan harga hemat untuk varian Boba Series setiap hari Jumat!", image: "" }
];

const THEME_PALETTES = {
    amber: { 50: '#fffbe3', 100: '#fef3c7', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 900: '#78350f' },
    emerald: { 50: '#ecfdf5', 100: '#d1fae5', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b' },
    blue: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
    rose: { 50: '#fff1f2', 100: '#ffe4e6', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337' },
    violet: { 50: '#f5f3ff', 100: '#ede9fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 900: '#4c1d95' },
    slate: { 50: '#f8fafc', 100: '#f1f5f9', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 900: '#0f172a' }
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

// ENGINE REAL-TIME WIB
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

// HELPER UPLOAD BERKAS FILE DUAL OPTION
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

window.onload = function() {
    startLiveClock();
    applyThemeColor(store.theme.themeColor || 'amber');
    applyBrandingUI();
    initCarousel();
    renderCustomerCategories();
    renderCustomerMenu();
    renderMemberStamps();
    updateCartFloatingBar();
    updateBadges();
    updateStampRuleDescription();
};

function saveStore(key) { localStorage.setItem(`app_${key}`, JSON.stringify(store[key])); updateBadges(); }

function applyThemeColor(colorKey) {
    const palette = THEME_PALETTES[colorKey] || THEME_PALETTES.amber;
    store.theme.themeColor = colorKey;
    saveStore('theme');
    const root = document.documentElement;
    Object.keys(palette).forEach(shade => root.style.setProperty(`--color-brand-${shade}`, palette[shade]));
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
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

function speakOrderNotification(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function applyBrandingUI() {
    document.getElementById('app-resto-name').innerText = store.theme.restoName;
    document.getElementById('rec-resto-title').innerText = store.theme.restoName;

    const logoIcon = document.getElementById('app-logo-icon');
    const logoImg = document.getElementById('app-logo-img');
    if (store.theme.logoUrl && store.theme.logoUrl.trim() !== '') {
        logoImg.src = store.theme.logoUrl; logoImg.classList.remove('hidden'); logoIcon.classList.add('hidden');
    } else {
        logoImg.classList.add('hidden'); logoIcon.classList.remove('hidden');
    }

    const iconUrl = store.theme.appIconUrl || DEFAULT_THEME.appIconUrl;
    document.getElementById('dynamic-favicon').href = iconUrl;
    document.getElementById('dynamic-apple-touch').href = iconUrl;

    // FOOTER LINKS & MAPS
    if (document.getElementById('ft-header-title')) {
        document.getElementById('ft-header-title').innerText = store.theme.ftTitle || DEFAULT_THEME.ftTitle;
        document.getElementById('ft-header-desc').innerText = store.theme.ftDesc || DEFAULT_THEME.ftDesc;
        
        let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
        if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);
        
        document.getElementById('link-platform-grab').href = store.theme.linkGrab || '#';
        document.getElementById('link-platform-gofood').href = store.theme.linkGoFood || '#';
        document.getElementById('link-platform-ig').href = store.theme.linkIg || '#';
        document.getElementById('link-platform-tiktok').href = store.theme.linkTikTok || '#';
        document.getElementById('link-platform-wa').href = `https://wa.me/${waResto}`;
        document.getElementById('iframe-google-maps').src = store.theme.linkMaps || DEFAULT_THEME.linkMaps;
    }

    if (document.getElementById('cfg-name')) {
        document.getElementById('cfg-name').value = store.theme.restoName;
        document.getElementById('cfg-phone').value = store.theme.restoPhone;
        document.getElementById('cfg-logo').value = store.theme.logoUrl || '';
        document.getElementById('cfg-qris').value = store.theme.qrisUrl || '';
        document.getElementById('cfg-sheet-url').value = store.theme.sheetWebhookUrl || '';
        document.getElementById('cfg-ft-title').value = store.theme.ftTitle || DEFAULT_THEME.ftTitle;
        document.getElementById('cfg-ft-desc').value = store.theme.ftDesc || DEFAULT_THEME.ftDesc;
        document.getElementById('cfg-link-grab').value = store.theme.linkGrab || '';
        document.getElementById('cfg-link-gofood').value = store.theme.linkGoFood || '';
        document.getElementById('cfg-link-ig').value = store.theme.linkIg || '';
        document.getElementById('cfg-link-tiktok').value = store.theme.linkTikTok || '';
        document.getElementById('cfg-link-maps').value = store.theme.linkMaps || DEFAULT_THEME.linkMaps;
    }
}

function setRole(role) {
    currentRole = role;
    ['customer', 'kasir', 'owner'].forEach(r => {
        document.getElementById(`view-${r}`).classList.add('hidden');
        document.getElementById(`btn-role-${r}`).classList.remove('active');
    });
    document.getElementById(`view-${role}`).classList.remove('hidden');
    document.getElementById(`btn-role-${role}`).classList.add('active');

    if (role === 'customer') { renderCustomerCategories(); renderCustomerMenu(); initCarousel(); }
    else if (role === 'kasir') { renderKasirMenu(); renderKasirPipeline(); }
    else if (role === 'owner') { 
        applyBrandingUI(); renderOwnerProfileTab(); renderStaffHRMTab(); renderAttendanceLogTab();
        renderOwnerBanners(); renderOwnerCategories(); renderOwnerInventory(); renderOwnerMemberStamps(); 
        renderFlashSaleTab(); updateOwnerStats(); initSalesChart(); 
    }
    updateCartFloatingBar(); updateBadges();
}

function requestAccess(role) {
    pendingTargetRole = role;
    document.getElementById('auth-title').innerText = role === 'owner' ? "Akses Dashboard Owner Master" : "Akses Mode Kasir POS";
    document.getElementById('auth-pin').value = '';
    document.getElementById('modal-auth').classList.remove('hidden');
}
function closeAuthModal() { document.getElementById('modal-auth').classList.add('hidden'); }
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
