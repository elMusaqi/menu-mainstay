// APP CORE STATE & REAL-TIME CLOCK ENGINE
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
    themeColor: "amber"
};

const DEFAULT_CATEGORIES = ["Boba & Milk Tea", "Coffee Series", "Fruit Tea", "Snacks & Extras"];

const DEFAULT_MENU = [
    { id: 101, name: "Brown Sugar Boba Milk", category: "Boba & Milk Tea", price: 22000, desc: "Susu segar dengan gula aren asli dan boba kenyal.", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80" },
    { id: 102, name: "Signature Mainstay Coffee", category: "Coffee Series", price: 18000, desc: "Kopi susu gula aren andalan Mainstay.", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80" },
    { id: 103, name: "Fresh Mango Jasmine Tea", category: "Fruit Tea", price: 16000, desc: "Teh melati segar rasa mangga manis dingin.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80" }
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

const OWNER_MASTER_PIN = "9999";

let store = {
    theme: JSON.parse(localStorage.getItem('app_theme')) || DEFAULT_THEME,
    banners: JSON.parse(localStorage.getItem('app_banners')) || DEFAULT_BANNERS,
    categories: JSON.parse(localStorage.getItem('app_categories')) || DEFAULT_CATEGORIES,
    menu: JSON.parse(localStorage.getItem('app_menu')) || DEFAULT_MENU,
    staff: JSON.parse(localStorage.getItem('app_staff')) || [{ name: "Kasir Budi", pin: "1111" }, { name: "Kasir Siti", pin: "2222" }],
    discounts: JSON.parse(localStorage.getItem('app_discounts')) || [{ id: 1, label: "Tanpa Diskon", value: 0 }, { id: 2, label: "Promo Member (Rp 3.000)", value: 3000 }],
    orders: JSON.parse(localStorage.getItem('app_orders')) || [],
    attendance: JSON.parse(localStorage.getItem('app_attendance')) || [],
    
    stampMinSpend: parseInt(localStorage.getItem('app_stamp_min_spend')) || 20000,
    stampRewardItemId: parseInt(localStorage.getItem('app_stamp_reward_item_id')) || 101,
    customStamps: JSON.parse(localStorage.getItem('app_custom_stamps')) || {},
    flashSaleItem: JSON.parse(localStorage.getItem('app_flash_sale_item')) || null
};

let cart = [];
let selectedOrderType = 'now';
let currentRole = 'customer';
let currentCategory = 'Semua';
let customerLayout = 'grid';
let kasirLayout = 'grid';
let pendingTargetRole = '';
let pendingCheckoutOrder = null;
let activeOptionItem = null;
let selectedIce = 'Normal Ice';
let selectedSugar = '100% Sugar';

// ENGINE REAL-TIME TIME STAMP (Hari, Tanggal Bulan Tahun • Jam:Menit:Detik WIB)
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

window.onload = function() {
    startLiveClock();
    applyThemeColor(store.theme.themeColor || 'amber');
    applyBrandingUI();
    initCarousel();
    renderCustomerCategories();
    renderCustomerMenu();
    renderMemberStamps();
    updateCartFloatingBar();
    updateStampRuleDescription();
};

function saveStore(key) { localStorage.setItem(`app_${key}`, JSON.stringify(store[key])); }

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

    if (document.getElementById('cfg-name')) {
        document.getElementById('cfg-name').value = store.theme.restoName;
        document.getElementById('cfg-phone').value = store.theme.restoPhone;
        document.getElementById('cfg-logo').value = store.theme.logoUrl || '';
        document.getElementById('cfg-qris').value = store.theme.qrisUrl || '';
        document.getElementById('cfg-sheet-url').value = store.theme.sheetWebhookUrl || '';
    }
}

function setRole(role) {
    currentRole = role;
    ['customer', 'kasir', 'owner'].forEach(r => {
        document.getElementById(`view-${r}`).classList.add('hidden');
        document.getElementById(`btn-role-${r}`).className = "px-3 py-1.5 rounded-xl transition text-slate-700 hover:text-slate-900 relative";
    });
    document.getElementById(`view-${role}`).classList.remove('hidden');
    document.getElementById(`btn-role-${role}`).className = "px-3 py-1.5 rounded-xl transition bg-slate-900 text-themebrand-400 shadow-sm relative";

    if (role === 'customer') { renderCustomerCategories(); renderCustomerMenu(); initCarousel(); }
    else if (role === 'kasir') { renderKasirMenu(); renderKasirPipeline(); }
    else if (role === 'owner') { applyBrandingUI(); renderOwnerBanners(); renderOwnerCategories(); renderOwnerInventory(); renderOwnerMemberStamps(); renderFlashSaleTab(); updateOwnerStats(); initSalesChart(); }
    updateCartFloatingBar();
}

function requestAccess(role) {
    pendingTargetRole = role;
    document.getElementById('auth-title').innerText = role === 'owner' ? "Akses Dashboard Owner" : "Akses Mode Kasir POS";
    document.getElementById('auth-pin').value = '';
    document.getElementById('modal-auth').classList.remove('hidden');
}
function closeAuthModal() { document.getElementById('modal-auth').classList.add('hidden'); }
function submitAuth() {
    const pin = document.getElementById('auth-pin').value;
    if (pendingTargetRole === 'owner') {
        if (pin === OWNER_MASTER_PIN) { closeAuthModal(); setRole('owner'); } else showToast("PIN Master Owner Salah!", true);
    } else if (pendingTargetRole === 'kasir') {
        if (store.staff.some(s => s.pin === pin) || pin === OWNER_MASTER_PIN) { closeAuthModal(); setRole('kasir'); } else showToast("PIN Kasir Salah!", true);
    }
}
