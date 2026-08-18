// APP CORE STATE & INITIALIZATION MANAGEMENT
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
    sheetWebhookUrl: ""
};

const DEFAULT_CATEGORIES = ["Boba & Milk Tea", "Coffee Series", "Fruit Tea", "Snacks & Extras"];

const DEFAULT_MENU = [
    { id: 101, name: "Brown Sugar Boba Milk", category: "Boba & Milk Tea", price: 22000, desc: "Susu segar dengan gula aren asli dan boba kenyal.", image: "https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80" },
    { id: 102, name: "Signature Mainstay Coffee", category: "Coffee Series", price: 18000, desc: "Kopi susu gula aren andalan Mainstay.", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80" },
    { id: 103, name: "Fresh Mango Jasmine Tea", category: "Fruit Tea", price: 16000, desc: "Teh melati segar rasa mangga manis dingin.", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=500&q=80" }
];

const OWNER_MASTER_PIN = "9999";

let store = {
    theme: JSON.parse(localStorage.getItem('app_theme')) || DEFAULT_THEME,
    categories: JSON.parse(localStorage.getItem('app_categories')) || DEFAULT_CATEGORIES,
    menu: JSON.parse(localStorage.getItem('app_menu')) || DEFAULT_MENU,
    staff: JSON.parse(localStorage.getItem('app_staff')) || [{ name: "Kasir Budi", pin: "1111" }, { name: "Kasir Siti", pin: "2222" }],
    discounts: JSON.parse(localStorage.getItem('app_discounts')) || [{ id: 1, label: "Tanpa Diskon", value: 0 }, { id: 2, label: "Promo Member (Rp 3.000)", value: 3000 }],
    orders: JSON.parse(localStorage.getItem('app_orders')) || [],
    attendance: JSON.parse(localStorage.getItem('app_attendance')) || [],
    
    // Config Stempel
    stampMinSpend: parseInt(localStorage.getItem('app_stamp_min_spend')) || 20000,
    stampRewardItemId: parseInt(localStorage.getItem('app_stamp_reward_item_id')) || 101,
    customStamps: JSON.parse(localStorage.getItem('app_custom_stamps')) || {}, // { "cleanPhone": count }
    
    // Config Flash Sale
    flashSaleItem: JSON.parse(localStorage.getItem('app_flash_sale_item')) || null // { itemId: 101, flashPrice: 12000 }
};

let cart = [];
let currentRole = 'customer';
let currentCategory = 'Semua';
let customerLayout = 'grid';
let kasirLayout = 'grid';
let pendingTargetRole = '';
let tempAttPhoto = '';
let pendingCheckoutOrder = null;
let bluetoothDevice = null;

let activeOptionItem = null;
let selectedIce = 'Normal Ice';
let selectedSugar = '100% Sugar';

window.onload = function() {
    applyBrandingUI();
    renderCustomerCategories();
    renderCustomerMenu();
    renderMemberStamps();
    startFlashSaleTimer();
    updateCartFloatingBar();
    updateStampRuleDescription();
};

function saveStore(key) { 
    localStorage.setItem(`app_${key}`, JSON.stringify(store[key])); 
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
        utterance.lang = 'id-ID';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function applyBrandingUI() {
    document.getElementById('app-resto-name').innerText = store.theme.restoName;
    document.getElementById('rec-resto-title').innerText = store.theme.restoName;

    const logoIcon = document.getElementById('app-logo-icon');
    const logoImg = document.getElementById('app-logo-img');
    if (store.theme.logoUrl && store.theme.logoUrl.trim() !== '') {
        logoImg.src = store.theme.logoUrl;
        logoImg.classList.remove('hidden');
        logoIcon.classList.add('hidden');
    } else {
        logoImg.classList.add('hidden');
        logoIcon.classList.remove('hidden');
    }

    const iconUrl = store.theme.appIconUrl || DEFAULT_THEME.appIconUrl;
    document.getElementById('dynamic-favicon').href = iconUrl;
    document.getElementById('dynamic-apple-touch').href = iconUrl;

    if (document.getElementById('cfg-name')) {
        document.getElementById('cfg-name').value = store.theme.restoName;
        document.getElementById('cfg-phone').value = store.theme.restoPhone;
        document.getElementById('cfg-logo').value = store.theme.logoUrl || '';
        document.getElementById('cfg-qris').value = store.theme.qrisUrl || '';
        document.getElementById('cfg-app-icon').value = store.theme.appIconUrl || '';
        document.getElementById('cfg-sheet-url').value = store.theme.sheetWebhookUrl || '';
    }
}

function handleFileUpload(e, targetProperty, targetInputId) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            store.theme[targetProperty] = ev.target.result;
            if (targetInputId) document.getElementById(targetInputId).value = ev.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function setRole(role) {
    currentRole = role;
    ['customer', 'kasir', 'owner'].forEach(r => {
        document.getElementById(`view-${r}`).classList.add('hidden');
        document.getElementById(`btn-role-${r}`).className = "px-2.5 sm:px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-slate-700 hover:text-slate-900 relative";
    });

    document.getElementById(`view-${role}`).classList.remove('hidden');
    document.getElementById(`btn-role-${role}`).className = "px-2.5 sm:px-3 py-1.5 rounded-xl transition flex items-center gap-1 bg-slate-900 text-amberbrand-400 shadow-sm relative";

    if (role === 'customer') { renderCustomerCategories(); renderCustomerMenu(); }
    else if (role === 'kasir') { renderKasirMenu(); renderKasirPipeline(); }
    else if (role === 'owner') { 
        applyBrandingUI(); 
        renderOwnerCategories(); 
        renderOwnerInventory(); 
        renderOwnerMemberStamps(); 
        renderFlashSaleTab();
        updateOwnerStats(); 
        initSalesChart(); 
    }
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
        if (pin === OWNER_MASTER_PIN) { closeAuthModal(); setRole('owner'); }
        else showToast("PIN Master Owner Salah!", true);
    } else if (pendingTargetRole === 'kasir') {
        if (store.staff.some(s => s.pin === pin) || pin === OWNER_MASTER_PIN) { closeAuthModal(); setRole('kasir'); }
        else showToast("PIN Kasir Salah!", true);
    }
}
