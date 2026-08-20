/* ==========================================================================
   APP.JS - CLIENT LOGIC, CART, VOUCHER, QRIS, WA DRAFT & SESSION PERSISTENCE
   Mainstay POS & Catalog Application
   ========================================================================== */

// Global State
let menuData = [];
let cart = [];
let appliedVoucher = null;
let currentDetailItem = null;
let detailQty = 1;

// Default System Configuration (Owner Web Config)
let webConfig = {
    brandName: "Mainstay Coffee",
    tagline: "Teman Nongkrong Terbaik",
    waNumber: "6281234567890",
    openTime: "08:00",
    closeTime: "22:00",
    forceClosed: false,
    qrisUrl: "https://via.placeholder.com/300x300/1e293b/ffffff?text=QRIS+Resto+Mainstay",
    qrisDownloadUrl: "https://via.placeholder.com/600x600/1e293b/ffffff?text=QRIS+Resto+Mainstay"
};

// Initial Sample Menu Data
const defaultMenuData = [
    {
        id: "M01",
        name: "Es Kopi Mainstay",
        category: "coffee",
        price: 18000,
        desc: "Kopi susu gula aren khas Mainstay dengan cita rasa creamy & manis pas.",
        img: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&q=80",
        allowIce: true,
        allowSugar: true,
        allowTopping: true,
        active: true
    },
    {
        id: "M02",
        name: "Americano Fresh",
        category: "coffee",
        price: 15000,
        desc: "Double shot espresso dengan air mineral dingin yang menyegarkan.",
        img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80",
        allowIce: true,
        allowSugar: true,
        allowTopping: false,
        active: true
    },
    {
        id: "M03",
        name: "Matcha Latte Creamy",
        category: "non-coffee",
        price: 22000,
        desc: "Bubuk matcha Jepang asli dipadukan dengan susu segar premium.",
        img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&q=80",
        allowIce: true,
        allowSugar: true,
        allowTopping: true,
        active: true
    },
    {
        id: "M04",
        name: "Chocolate Melt",
        category: "non-coffee",
        price: 20000,
        desc: "Cokelat pekat pilihan dengan tekstur lembut khas Mainstay.",
        img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400&q=80",
        allowIce: true,
        allowSugar: true,
        allowTopping: true,
        active: true
    },
    {
        id: "M05",
        name: "Kentang Goreng Keju",
        category: "snack",
        price: 15000,
        desc: "French fries renyah bertabur bumbu keju gurih.",
        img: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80",
        allowIce: false,
        allowSugar: false,
        allowTopping: false,
        active: true
    },
    {
        id: "M06",
        name: "Croissant Butter",
        category: "snack",
        price: 18000,
        desc: "Pastry hangat dengan lapisan butter renyah dan harum.",
        img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80",
        allowIce: false,
        allowSugar: false,
        allowTopping: false,
        active: true
    }
];

// Available Toppings List
const availableToppings = [
    { id: "T01", name: "Extra Shot Espresso", price: 5000 },
    { id: "T02", name: "Boba Creamy", price: 4000 },
    { id: "T03", name: "Grass Jelly", price: 3000 },
    { id: "T04", name: "Cheese Foam", price: 5000 }
];

/* ==========================================================================
   INITIALIZATION & SESSION PERSISTENCE
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadLocalData();
    initLiveClock();
    renderMenuCatalog('all');
    checkSessionPersistence();
});

// Load Data from Local Storage
function loadLocalData() {
    const savedMenu = localStorage.getItem("mainstay_menu");
    menuData = savedMenu ? JSON.parse(savedMenu) : defaultMenuData;

    const savedConfig = localStorage.getItem("mainstay_config");
    if (savedConfig) {
        webConfig = JSON.parse(savedConfig);
        applyWebConfig();
    }
}

// Apply Web Config to Header & Titles
function applyWebConfig() {
    document.getElementById("web-title").innerText = `${webConfig.brandName} - Official POS Catalog`;
    document.getElementById("header-brand-name").innerText = webConfig.brandName;
    document.getElementById("header-tagline").innerText = webConfig.tagline;
    if (webConfig.qrisUrl) {
        document.getElementById("qris-image-display").src = webConfig.qrisUrl;
    }
}

// Live Clock & Operating Hours Verification
function initLiveClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const timeStr = `${hours}:${minutes}:${seconds} WIB`;
    const dateOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', dateOptions);

    const clockElem = document.getElementById("live-clock");
    const dateElem = document.getElementById("live-date");
    if (clockElem) clockElem.innerText = timeStr;
    if (dateElem) dateElem.innerText = dateStr;

    checkStoreStatus(hours, minutes);
}

function checkStoreStatus(hours, minutes) {
    const currentTimeVal = parseInt(hours + minutes);
    const openVal = parseInt(webConfig.openTime.replace(":", ""));
    const closeVal = parseInt(webConfig.closeTime.replace(":", ""));

    const badge = document.getElementById("store-status-badge");
    const dot = document.getElementById("status-dot");
    const text = document.getElementById("status-text");

    let isOpen = true;
    if (webConfig.forceClosed) {
        isOpen = false;
    } else if (openVal && closeVal) {
        if (currentTimeVal < openVal || currentTimeVal >= closeVal) {
            isOpen = false;
        }
    }

    if (isOpen) {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300";
        dot.className = "w-2 h-2 rounded-full bg-emerald-600 animate-pulse status-dot-active";
        text.innerText = "● BUKA";
    } else {
        badge.className = "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300";
        dot.className = "w-2 h-2 rounded-full bg-rose-600";
        text.innerText = "● TUTUP";
    }
}

/* ==========================================================================
   SESSION PERSISTENCE CHECK (ANTI-KELUAR REFRESH)
   ========================================================================== */
function checkSessionPersistence() {
    const session = localStorage.getItem("mainstay_session");
    if (session) {
        const sessionData = JSON.parse(session);
        if (sessionData.isLoggedIn) {
            document.getElementById("customer-view").classList.add("hidden");
            document.getElementById("floating-cart-btn").classList.add("hidden");

            if (sessionData.role === "owner") {
                document.getElementById("kasir-view").classList.remove("hidden");
                document.getElementById("logged-user-badge").innerText = "Owner Master";
                document.getElementById("logged-user-badge").className = "px-3 py-1 bg-slate-900 text-amber-400 font-bold text-xs rounded-full border border-slate-700";
                document.getElementById("owner-dashboard-btn").classList.remove("hidden");
                switchTabKasir("owner");
            } else {
                document.getElementById("kasir-view").classList.remove("hidden");
                document.getElementById("logged-user-badge").innerText = `Kasir (${sessionData.staffName || "Staf"})`;
                document.getElementById("logged-user-badge").className = "px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full border border-amber-300";
                document.getElementById("owner-dashboard-btn").classList.add("hidden");
                switchTabKasir("kasir");
            }
        }
    }
}

/* ==========================================================================
   CATALOG RENDER & CATEGORY FILTER
   ========================================================================== */
function renderMenuCatalog(category) {
    const grid = document.getElementById("menu-grid");
    grid.innerHTML = "";

    const filtered = category === 'all' ? menuData.filter(m => m.active) : menuData.filter(m => m.category === category && m.active);

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400 text-xs">Belum ada menu di kategori ini.</div>`;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("div");
        card.className = "menu-card bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="h-32 sm:h-36 w-full bg-slate-100 relative overflow-hidden">
                    <img src="${item.img}" alt="${item.name}" class="w-full h-full object-cover">
                </div>
                <div class="p-3">
                    <h3 class="font-bold text-xs text-slate-900 line-clamp-1">${item.name}</h3>
                    <p class="text-[10px] text-slate-500 line-clamp-2 mt-1 mb-2">${item.desc}</p>
                </div>
            </div>
            <div class="p-3 pt-0 flex items-center justify-between mt-auto">
                <span class="font-bold text-xs text-amber-700">Rp ${item.price.toLocaleString('id-ID')}</span>
                <button onclick="openMenuDetail('${item.id}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1">
                    <i class="fa-solid fa-plus text-[10px]"></i> Tambah
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function filterCategory(category) {
    document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
    event.currentTarget.classList.add("active");
    renderMenuCatalog(category);
}

/* ==========================================================================
   CUSTOMIZATION MENU MODAL
   ========================================================================== */
function openMenuDetail(itemId) {
    currentDetailItem = menuData.find(m => m.id === itemId);
    if (!currentDetailItem) return;

    detailQty = 1;
    document.getElementById("detail-qty").innerText = detailQty;
    document.getElementById("detail-item-img").src = currentDetailItem.img;
    document.getElementById("detail-item-name").innerText = currentDetailItem.name;
    document.getElementById("detail-item-price").innerText = `Rp ${currentDetailItem.price.toLocaleString('id-ID')}`;
    document.getElementById("detail-item-desc").innerText = currentDetailItem.desc;
    document.getElementById("detail-notes").value = "";

    // Show/Hide Options based on Owner Checkbox Config
    const iceContainer = document.getElementById("opt-ice-container");
    const sugarContainer = document.getElementById("opt-sugar-container");
    const toppingContainer = document.getElementById("opt-topping-container");

    if (currentDetailItem.allowIce) iceContainer.classList.remove("hidden");
    else iceContainer.classList.add("hidden");

    if (currentDetailItem.allowSugar) sugarContainer.classList.remove("hidden");
    else sugarContainer.classList.add("hidden");

    if (currentDetailItem.allowTopping) {
        toppingContainer.classList.remove("hidden");
        renderToppingsList();
    } else {
        toppingContainer.classList.add("hidden");
    }

    document.getElementById("modal-menu-detail").classList.remove("hidden");
}

function renderToppingsList() {
    const container = document.getElementById("topping-list");
    container.innerHTML = "";
    availableToppings.forEach(top => {
        const item = document.createElement("label");
        item.className = "flex items-center justify-between text-xs border rounded-lg p-2 cursor-pointer hover:bg-slate-50";
        item.innerHTML = `
            <div class="flex items-center gap-2">
                <input type="checkbox" name="opt-topping" value="${top.name}" data-price="${top.price}" class="rounded text-amber-600 focus:ring-amber-500">
                <span class="text-slate-700">${top.name}</span>
            </div>
            <span class="font-semibold text-slate-500">+Rp ${top.price.toLocaleString('id-ID')}</span>
        `;
        container.appendChild(item);
    });
}

function adjustDetailQty(delta) {
    detailQty += delta;
    if (detailQty < 1) detailQty = 1;
    document.getElementById("detail-qty").innerText = detailQty;
}

function confirmAddToCart() {
    if (!currentDetailItem) return;

    let selectedIce = "";
    if (currentDetailItem.allowIce) {
        const iceRadio = document.querySelector('input[name="opt-ice"]:checked');
        if (iceRadio) selectedIce = iceRadio.value;
    }

    let selectedSugar = "";
    if (currentDetailItem.allowSugar) {
        const sugarRadio = document.querySelector('input[name="opt-sugar"]:checked');
        if (sugarRadio) selectedSugar = sugarRadio.value;
    }

    let selectedToppings = [];
    let toppingsCost = 0;
    if (currentDetailItem.allowTopping) {
        document.querySelectorAll('input[name="opt-topping"]:checked').forEach(chk => {
            const price = parseInt(chk.getAttribute("data-price"));
            selectedToppings.push({ name: chk.value, price: price });
            toppingsCost += price;
        });
    }

    const notes = document.getElementById("detail-notes").value.trim();
    const unitPrice = currentDetailItem.price + toppingsCost;

    // Cart Item Object
    const cartItem = {
        cartItemId: Date.now().toString(),
        menuId: currentDetailItem.id,
        name: currentDetailItem.name,
        price: currentDetailItem.price,
        unitPrice: unitPrice,
        qty: detailQty,
        totalPrice: unitPrice * detailQty,
        ice: selectedIce,
        sugar: selectedSugar,
        toppings: selectedToppings,
        notes: notes
    };

    cart.push(cartItem);
    updateCartFloatingBar();
    closeModal("modal-menu-detail");
}

/* ==========================================================================
   CART & FLOATING BAR LOGIC
   ========================================================================== */
function updateCartFloatingBar() {
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);

    document.getElementById("cart-count-badge").innerText = totalCount;
    document.getElementById("cart-total-price").innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;

    const floatingBtn = document.getElementById("floating-cart-btn");
    if (totalCount > 0) {
        floatingBtn.classList.remove("hidden");
    } else {
        floatingBtn.classList.add("hidden");
    }
}

function openCartModal() {
    renderCartItems();
    calculateCartTotals();
    document.getElementById("modal-cart").classList.remove("hidden");
}

function renderCartItems() {
    const container = document.getElementById("cart-items-container");
    container.innerHTML = "";

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center py-6 text-slate-400 text-xs">Keranjang belanja Anda masih kosong.</div>`;
        return;
    }

    cart.forEach((item, index) => {
        let optionsText = [];
        if (item.ice) optionsText.push(item.ice);
        if (item.sugar) optionsText.push(item.sugar);
        if (item.toppings.length > 0) {
            optionsText.push("Topping: " + item.toppings.map(t => t.name).join(", "));
        }
        if (item.notes) optionsText.push(`Catatan: "${item.notes}"`);

        const cartCard = document.createElement("div");
        cartCard.className = "p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3";
        cartCard.innerHTML = `
            <div class="flex-1">
                <h4 class="font-bold text-xs text-slate-900">${item.name}</h4>
                <p class="text-[10px] text-slate-500">${optionsText.join(" • ")}</p>
                <p class="font-bold text-xs text-amber-700 mt-1">Rp ${item.totalPrice.toLocaleString('id-ID')}</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex items-center border border-slate-300 rounded-lg bg-white">
                    <button onclick="changeCartQty(${index}, -1)" class="px-2 py-1 text-slate-600 font-bold text-xs">-</button>
                    <span class="px-2 py-1 text-xs font-bold">${item.qty}</span>
                    <button onclick="changeCartQty(${index}, 1)" class="px-2 py-1 text-slate-600 font-bold text-xs">+</button>
                </div>
                <button onclick="removeCartItem(${index})" class="text-rose-600 text-xs px-1"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        container.appendChild(cartCard);
    });
}

function changeCartQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    } else {
        cart[index].totalPrice = cart[index].unitPrice * cart[index].qty;
    }
    renderCartItems();
    calculateCartTotals();
    updateCartFloatingBar();
}

function removeCartItem(index) {
    cart.splice(index, 1);
    renderCartItems();
    calculateCartTotals();
    updateCartFloatingBar();
}

/* ==========================================================================
   VOUCHER & PROMO SYSTEM
   ========================================================================== */
function applyVoucherCode() {
    const codeInput = document.getElementById("cart-voucher-input").value.trim().toUpperCase();
    const custPhone = document.getElementById("cust-phone").value.trim();

    if (!codeInput) {
        alert("Masukkan kode voucher terlebih dahulu!");
        return;
    }

    const savedVouchers = JSON.parse(localStorage.getItem("mainstay_vouchers") || "[]");
    const foundVoucher = savedVouchers.find(v => v.code === codeInput && v.active);

    if (!foundVoucher) {
        alert("Kode voucher tidak ditemukan atau sudah tidak aktif!");
        return;
    }

    // Check Target
    if (foundVoucher.target === "member" || foundVoucher.target === "specific") {
        if (!custPhone) {
            alert("Isi Nomor WhatsApp Anda terlebih dahulu untuk memverifikasi hak penggunaan voucher ini!");
            return;
        }

        if (foundVoucher.target === "specific" && foundVoucher.targetPhone !== custPhone) {
            alert("Mohon maaf, kode voucher ini khusus untuk nomor WhatsApp tertentu!");
            return;
        }
    }

    // Check Usages Limit
    if (foundVoucher.usages >= foundVoucher.limitQty) {
        alert("Mohon maaf, kuota penggunaan kode voucher ini sudah habis!");
        return;
    }

    appliedVoucher = foundVoucher;
    document.getElementById("voucher-applied-info").classList.remove("hidden");
    document.getElementById("voucher-name-label").innerText = `${foundVoucher.code} (${foundVoucher.type === 'nominal' ? 'Rp ' + foundVoucher.val.toLocaleString('id-ID') : foundVoucher.val + '%'})`;
    calculateCartTotals();
}

function removeVoucher() {
    appliedVoucher = null;
    document.getElementById("cart-voucher-input").value = "";
    document.getElementById("voucher-applied-info").classList.add("hidden");
    calculateCartTotals();
}

function calculateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;

    if (appliedVoucher) {
        if (appliedVoucher.type === "nominal") {
            discount = appliedVoucher.val;
        } else if (appliedVoucher.type === "percent") {
            discount = Math.round((subtotal * appliedVoucher.val) / 100);
        }
    }

    if (discount > subtotal) discount = subtotal;
    const grandtotal = subtotal - discount;

    document.getElementById("summary-subtotal").innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById("summary-discount").innerText = `-Rp ${discount.toLocaleString('id-ID')}`;
    document.getElementById("summary-grandtotal").innerText = `Rp ${grandtotal.toLocaleString('id-ID')}`;
}

/* ==========================================================================
   CHECKOUT & WHATSAPP DRAFT LOGIC
   ========================================================================== */
function processCheckout() {
    const custName = document.getElementById("cust-name").value.trim();
    const custPhone = document.getElementById("cust-phone").value.trim();
    const orderType = document.querySelector('input[name="order-type"]:checked').value;
    const payMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const isRegisterMember = document.getElementById("register-member-check").checked;

    if (!custName || !custPhone) {
        alert("Mohon lengkapi Nama dan Nomor WhatsApp Pemesan!");
        return;
    }

    if (cart.length === 0) {
        alert("Keranjang belanja Anda masih kosong!");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    let discount = 0;
    if (appliedVoucher) {
        discount = appliedVoucher.type === "nominal" ? appliedVoucher.val : Math.round((subtotal * appliedVoucher.val) / 100);
        if (discount > subtotal) discount = subtotal;
    }
    const grandtotal = subtotal - discount;

    // Save New Order Object
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    const orderData = {
        orderId: orderId,
        date: new Date().toISOString(),
        custName: custName,
        custPhone: custPhone,
        orderType: orderType,
        payMethod: payMethod,
        items: [...cart],
        subtotal: subtotal,
        discount: discount,
        grandtotal: grandtotal,
        voucherCode: appliedVoucher ? appliedVoucher.code : "-",
        status: "Masuk", // Step 1 Pipeline
        isMember: isRegisterMember
    };

    // Save to Local Orders
    const existingOrders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
    existingOrders.push(orderData);
    localStorage.setItem("mainstay_orders", JSON.stringify(existingOrders));

    // Register Member if checked
    if (isRegisterMember) {
        registerNewMember(custName, custPhone);
    }

    // Branching by Payment Method
    if (payMethod === "QRIS") {
        document.getElementById("qris-total-display").innerText = `Total: Rp ${grandtotal.toLocaleString('id-ID')}`;
        window.currentCheckoutOrder = orderData;
        closeModal("modal-cart");
        document.getElementById("modal-qris").classList.remove("hidden");
    } else {
        // CASH Payment: Direct redirect to WA without QRIS pop-up
        sendWhatsappOrder(orderData);
        clearCartAndReset();
        closeModal("modal-cart");
    }
}

function confirmQrisToWhatsapp() {
    if (window.currentCheckoutOrder) {
        sendWhatsappOrder(window.currentCheckoutOrder);
        clearCartAndReset();
        closeModal("modal-qris");
    }
}

function sendWhatsappOrder(order) {
    let itemsText = "";
    order.items.forEach((item, i) => {
        let opts = [];
        if (item.ice) opts.push(item.ice);
        if (item.sugar) opts.push(item.sugar);
        if (item.toppings.length > 0) opts.push("Top: " + item.toppings.map(t => t.name).join(", "));
        if (item.notes) opts.push(`Note: "${item.notes}"`);

        itemsText += `${i + 1}. *${item.name}* (${item.qty}x)\n   ${opts.join(" | ")}\n   Rp ${item.totalPrice.toLocaleString('id-ID')}\n`;
    });

    let instructionText = "";
    if (order.payMethod === "QRIS") {
        instructionText = "📌 *INSTRUKSI PEMBAYARAN:*\nMohon lampirkan / kirim *Bukti Transfer / Screenshot QRIS* di bawah pesan ini agar pesanan dapat langsung diproses.";
    } else {
        instructionText = "📌 *INSTRUKSI PEMBAYARAN:*\nPembayaran dilakukan langsung di *Kasir Toko* saat kedatangan / pengambilan pesanan. Silakan tunjukkan Kode Order ini kepada Kasir.";
    }

    const waDraft = `*DRAFT PESANAN - ${webConfig.brandName.toUpperCase()}*
---------------------------------------
📋 *KODE ORDER:* #${order.orderId}
👤 *Nama:* ${order.custName}
📱 *No. WA:* ${order.custPhone}
🏷️ *Tipe Pesanan:* ${order.orderType}
💳 *Metode Bayar:* ${order.payMethod}
---------------------------------------
*RINCIAN PESANAN:*
${itemsText}
---------------------------------------
*Subtotal:* Rp ${order.subtotal.toLocaleString('id-ID')}
*Potongan Voucher:* -Rp ${order.discount.toLocaleString('id-ID')}
*TOTAL BAYAR:* *Rp ${order.grandtotal.toLocaleString('id-ID')}*
---------------------------------------
${instructionText}

Terima kasih!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${webConfig.waNumber}&text=${encodeURIComponent(waDraft)}`;
    window.open(waUrl, '_blank');
}

function clearCartAndReset() {
    cart = [];
    appliedVoucher = null;
    document.getElementById("cust-name").value = "";
    document.getElementById("cust-phone").value = "";
    document.getElementById("cart-voucher-input").value = "";
    document.getElementById("voucher-applied-info").classList.add("hidden");
    updateCartFloatingBar();
}

function downloadQrisBarcode() {
    const qrisElem = document.getElementById("qris-capture-area");
    html2canvas(qrisElem).then(canvas => {
        const link = document.createElement("a");
        link.download = `QRIS-${webConfig.brandName}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    }).catch(err => {
        alert("Gagal mengunduh barcode QRIS. Silakan screenshot layar HP Anda.");
    });
}

function registerNewMember(name, phone) {
    const savedMembers = JSON.parse(localStorage.getItem("mainstay_members") || "[]");
    if (!savedMembers.some(m => m.phone === phone)) {
        savedMembers.push({
            name: name,
            phone: phone,
            joinedDate: new Date().toLocaleDateString('id-ID')
        });
        localStorage.setItem("mainstay_members", JSON.stringify(savedMembers));
    }
}

function openMemberModal() {
    const name = prompt("Masukkan Nama Lengkap Anda:");
    const phone = prompt("Masukkan Nomor WhatsApp Anda (Contoh: 08123456789):");
    if (name && phone) {
        registerNewMember(name, phone);
        alert("Selamat! Anda telah resmi menjadi Member Mainstay.");
    }
}

/* ==========================================================================
   LOGIN & SECURITY LOGIC (SHOW PIN & ALERT MERAH)
   ========================================================================== */
function openLoginModal() {
    document.getElementById("login-pin-input").value = "";
    document.getElementById("login-error-alert").classList.add("hidden");
    document.getElementById("modal-login").classList.remove("hidden");
}

function togglePinVisibility() {
    const pinInput = document.getElementById("login-pin-input");
    const isChecked = document.getElementById("show-pin-check").checked;
    pinInput.type = isChecked ? "text" : "password";
}

function submitLoginPin() {
    const pinInput = document.getElementById("login-pin-input").value.trim();
    const errorAlert = document.getElementById("login-error-alert");

    const ownerMasterPin = localStorage.getItem("mainstay_owner_pin") || "9999";
    const savedStaffs = JSON.parse(localStorage.getItem("mainstay_staffs") || "[]");

    // Default sample cashier if empty
    if (savedStaffs.length === 0) {
        savedStaffs.push({ name: "Kasir Toko", pin: "1234", phone: "081234567890", bank: "BCA 12345678" });
        localStorage.setItem("mainstay_staffs", JSON.stringify(savedStaffs));
    }

    if (pinInput === ownerMasterPin) {
        // Login as Owner
        errorAlert.classList.add("hidden");
        saveSession("owner", "Owner Master");
        closeModal("modal-login");
        checkSessionPersistence();
    } else {
        const foundStaff = savedStaffs.find(s => s.pin === pinInput);
        if (foundStaff) {
            // Login as Cashier
            errorAlert.classList.add("hidden");
            saveSession("kasir", foundStaff.name);
            closeModal("modal-login");
            checkSessionPersistence();
        } else {
            // Wrong PIN
            errorAlert.classList.remove("hidden");
        }
    }
}

function saveSession(role, staffName) {
    const sessionData = {
        isLoggedIn: true,
        role: role,
        staffName: staffName,
        loginTime: new Date().toISOString()
    };
    localStorage.setItem("mainstay_session", JSON.stringify(sessionData));
}

function logoutStaf() {
    localStorage.removeItem("mainstay_session");
    document.getElementById("kasir-view").classList.add("hidden");
    document.getElementById("owner-view").classList.add("hidden");
    document.getElementById("customer-view").classList.remove("hidden");
    updateCartFloatingBar();
}

/* ==========================================================================
   GENERIC MODAL CLOSE HANDLER (STANDAR TOMBOL X SILANG)
   ========================================================================== */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("hidden");
    }
}
