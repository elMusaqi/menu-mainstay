// CUSTOMER ENGINE: KATALOG, MEMBER BROADCAST, VARIAN ACTIVE BORDER, KERANJANG & DIRECT WA AUTOMATION

// ==========================================
// MEMBER BROADCAST WA & STEMPEL SYSTEM
// ==========================================

function openJoinMemberModal() {
    document.getElementById('modal-join-member').classList.remove('hidden');
}

function closeJoinMemberModal() {
    document.getElementById('modal-join-member').classList.add('hidden');
}

function submitJoinMember(btn) {
    const nameInput = document.getElementById('mb-name-input');
    const phoneInput = document.getElementById('mb-phone-input');
    const consentCheck = document.getElementById('mb-consent-check');

    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    let phone = phoneInput.value.replace(/[^0-9]/g, '');

    if (!name || !phone) {
        showToast("Mohon lengkapi Nama & Nomor WhatsApp!", true);
        return;
    }

    if (!consentCheck || !consentCheck.checked) {
        showToast("Mohon setujui persetujuan broadcast promo!", true);
        return;
    }

    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const existingIndex = store.members.findIndex(m => m.phone === phone);
    if (existingIndex >= 0) {
        store.members[existingIndex].name = name;
        store.members[existingIndex].consent = true;
    } else {
        store.members.push({
            id: Date.now(),
            name: name,
            phone: phone,
            consent: true,
            stamps: 0,
            joinedAt: getFormattedRealTime()
        });
    }

    saveStore('members');

    triggerButtonLoading(btn, () => {
        closeJoinMemberModal();
        renderMemberStamps();
        showToast(`Selamat Kak ${name}, Anda resmi terdaftar sebagai Member Broadcast!`);
        
        // Auto fill form checkout
        if (document.getElementById('cust-name-input')) document.getElementById('cust-name-input').value = name;
        if (document.getElementById('cust-phone-input')) document.getElementById('cust-phone-input').value = phone;
    });
}

function renderMemberStamps() {
    const container = document.getElementById('stamp-indicators');
    if (!container) return;
    container.innerHTML = '';

    const savedPhone = document.getElementById('cust-phone-input') ? document.getElementById('cust-phone-input').value.replace(/[^0-9]/g, '') : '';
    let currentMember = store.members.find(m => m.phone === savedPhone || (savedPhone.startsWith('0') && m.phone === '62' + savedPhone.substring(1)));
    
    let activeStamps = currentMember ? currentMember.stamps || 0 : 0;

    for (let i = 1; i <= 6; i++) {
        container.innerHTML += `
            <div class="w-6 h-6 rounded-lg ${i <= activeStamps ? 'bg-slate-900 border-themebrand-400 text-themebrand-400' : 'bg-white/20 border-white/40 text-white'} border flex items-center justify-center font-black text-[10px]">
                ${i <= activeStamps ? '<i class="fa-solid fa-check"></i>' : i}
            </div>
        `;
    }

    const btnJoin = document.getElementById('btn-join-member');
    if (btnJoin) {
        if (currentMember) {
            btnJoin.innerText = "✓ Member Aktif";
            btnJoin.className = "px-3 py-1.5 bg-slate-900 text-themebrand-400 rounded-xl font-extrabold text-[10px] whitespace-nowrap shadow border border-themebrand-500/50";
        } else {
            btnJoin.innerText = "Join Member";
            btnJoin.className = "btn-press px-3 py-1.5 bg-slate-900 text-white rounded-xl font-extrabold text-[10px] whitespace-nowrap shadow";
        }
    }
}

// ==========================================
// KATALOG & FILTER MENU
// ==========================================

function renderCustomerCategories() {
    const container = document.getElementById('cust-categories');
    if (!container) return;
    container.innerHTML = `<button type="button" onclick="filterMenu('Semua')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${currentCategory === 'Semua' ? 'bg-themebrand-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700'} whitespace-nowrap transition">Semua</button>`;
    store.categories.forEach(cat => {
        container.innerHTML += `<button type="button" onclick="filterMenu('${cat}')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${currentCategory === cat ? 'bg-themebrand-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700'} whitespace-nowrap transition">${cat}</button>`;
    });
}

function filterMenu(cat) { 
    currentCategory = cat; 
    renderCustomerCategories(); 
    renderCustomerMenu(); 
}

function setCustomerLayout(layout) {
    customerLayout = layout;
    const btnGrid = document.getElementById('btn-cust-grid');
    const btnList = document.getElementById('btn-cust-list');
    if (layout === 'grid') {
        btnGrid.className = "p-2 rounded-xl text-xs text-themebrand-600 bg-themebrand-100 font-bold";
        btnList.className = "p-2 rounded-xl text-xs text-slate-400 font-bold";
    } else {
        btnGrid.className = "p-2 rounded-xl text-xs text-slate-400 font-bold";
        btnList.className = "p-2 rounded-xl text-xs text-themebrand-600 bg-themebrand-100 font-bold";
    }
    renderCustomerMenu();
}

function renderCustomerMenu() {
    const grid = document.getElementById('cust-menu-grid');
    if (!grid) return;
    
    const searchInput = document.getElementById('cust-search');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    grid.className = customerLayout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 gap-3' : 'space-y-2.5';
    grid.innerHTML = '';

    const filtered = store.menu.filter(m => (currentCategory === 'Semua' || m.category === currentCategory) && m.name.toLowerCase().includes(search));

    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-full p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-1"><i class="fa-solid fa-mug-hot text-2xl text-slate-300"></i><p class="font-bold text-xs text-slate-500">Menu tidak ditemukan</p></div>`;
        return;
    }

    filtered.forEach(m => {
        const isFlash = store.flashSaleItem && store.flashSaleItem.id === m.id;
        const displayPrice = isFlash ? store.flashSaleItem.flashPrice : m.price;

        grid.innerHTML += `
            <div class="${customerLayout === 'grid' ? 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2' : 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3'}">
                <div class="${customerLayout === 'grid' ? 'space-y-2' : 'flex items-center gap-3 flex-1 min-w-0'}">
                    <div class="relative ${customerLayout === 'grid' ? 'w-full h-32' : 'w-16 h-16 shrink-0'} rounded-xl overflow-hidden bg-slate-100">
                        <img src="${m.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80'}" class="w-full h-full object-cover">
                        ${isFlash ? `<span class="absolute top-1 left-1 bg-rose-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse">FLASH SALE</span>` : ''}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-black text-xs text-slate-900 truncate">${m.name}</p>
                        <p class="text-[10px] text-slate-500 truncate mb-1">${m.desc || 'Segar dan nikmat'}</p>
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs font-black text-themebrand-600 whitespace-nowrap">Rp ${displayPrice.toLocaleString()}</span>
                            ${isFlash ? `<span class="text-[9px] text-slate-400 line-through whitespace-nowrap">Rp ${m.price.toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button type="button" onclick="prepareAddToCart(${m.id})" class="btn-press bg-slate-900 text-themebrand-400 w-8 h-8 rounded-xl flex items-center justify-center font-black shadow shrink-0 self-end sm:self-center">
                    <i class="fa-solid fa-plus text-xs"></i>
                </button>
            </div>
        `;
    });
}

// ==========================================
// KUSTOMISASI VARIAN ACTIVE BORDER
// ==========================================

function prepareAddToCart(id) {
    activeOptionItem = store.menu.find(m => m.id === id);
    if (!activeOptionItem) return;

    document.getElementById('opt-item-name').innerText = activeOptionItem.name;
    document.getElementById('box-opt-ice').className = activeOptionItem.optIce !== false ? '' : 'hidden';
    document.getElementById('box-opt-sugar').className = activeOptionItem.optSugar !== false ? '' : 'hidden';
    document.getElementById('box-opt-hot').className = activeOptionItem.optHot ? 'p-2 bg-amber-50 border border-amber-200 rounded-xl font-bold text-amber-900 text-center' : 'hidden';
    document.getElementById('box-opt-boba').className = activeOptionItem.optBoba !== false ? 'flex items-center gap-2 p-2 bg-slate-50 rounded-xl border' : 'hidden';

    selectIce('Normal Ice');
    selectSugar('100% Sugar');
    const toppingCheck = document.getElementById('opt-topping-boba');
    if (toppingCheck) toppingCheck.checked = false;

    document.getElementById('modal-item-options').classList.remove('hidden');
}

function selectIce(val) {
    selectedIce = val;
    ['normal', 'less', 'none'].forEach(type => {
        const btn = document.getElementById(`opt-ice-${type}`);
        if (btn) {
            if ((type === 'normal' && val === 'Normal Ice') || (type === 'less' && val === 'Less Ice') || (type === 'none' && val === 'No Ice')) {
                btn.className = 'opt-btn-ice py-1.5 active-border font-bold rounded-xl';
            } else {
                btn.className = 'opt-btn-ice py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200';
            }
        }
    });
}

function selectSugar(val) {
    selectedSugar = val;
    ['100', '50', '0'].forEach(type => {
        const btn = document.getElementById(`opt-sugar-${type}`);
        if (btn) {
            if ((type === '100' && val === '100% Sugar') || (type === '50' && val === '50% Sugar') || (type === '0' && val === 'No Sugar')) {
                btn.className = 'opt-btn-sugar py-1.5 active-border font-bold rounded-xl';
            } else {
                btn.className = 'opt-btn-sugar py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200';
            }
        }
    });
}

function confirmAddToCartWithOptions() {
    if (!activeOptionItem) return;

    const toppingBoba = document.getElementById('opt-topping-boba') ? document.getElementById('opt-topping-boba').checked : false;
    const isFlash = store.flashSaleItem && store.flashSaleItem.id === activeOptionItem.id;
    let basePrice = isFlash ? store.flashSaleItem.flashPrice : activeOptionItem.price;
    if (toppingBoba) basePrice += 3000;

    const cartItem = {
        cartId: Date.now() + Math.random(),
        id: activeOptionItem.id,
        name: activeOptionItem.name,
        price: basePrice,
        ice: activeOptionItem.optIce !== false ? selectedIce : 'Default',
        sugar: activeOptionItem.optSugar !== false ? selectedSugar : 'Default',
        hot: activeOptionItem.optHot || false,
        boba: toppingBoba
    };

    cart.push(cartItem);
    showToast("Pesanan ditambahkan ke keranjang!");
    closeOptionModal();
    updateCartFloatingBar();
}

function closeOptionModal() { 
    document.getElementById('modal-item-options').classList.add('hidden'); 
}

function updateCartFloatingBar() {
    const bar = document.getElementById('floating-cart');
    if (!bar) return;

    if (cart.length > 0) {
        bar.classList.remove('translate-y-32');
        const countEl = document.getElementById('cart-item-count');
        const priceEl = document.getElementById('cart-total-price');
        if (countEl) countEl.innerText = `${cart.length} Item`;
        if (priceEl) {
            const total = cart.reduce((sum, i) => sum + i.price, 0);
            priceEl.innerText = `Rp ${total.toLocaleString()}`;
        }
    } else {
        bar.classList.add('translate-y-32');
    }
}

function openCartModal() { 
    document.getElementById('modal-cart').classList.remove('hidden'); 
    renderCartModalItems(); 
}

function closeCartModal() { 
    document.getElementById('modal-cart').classList.add('hidden'); 
}

function setOrderType(type) {
    selectedOrderType = type;
    const btnNow = document.getElementById('btn-order-now');
    const btnPo = document.getElementById('btn-order-po');
    const boxPo = document.getElementById('box-preorder-schedule');

    if (type === 'now') {
        btnNow.className = 'btn-press py-2 rounded-xl font-bold active-border shadow-lg';
        btnPo.className = 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700 border-slate-200';
        if (boxPo) boxPo.classList.add('hidden');
    } else {
        btnNow.className = 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700 border-slate-200';
        btnPo.className = 'btn-press py-2 rounded-xl font-bold active-border shadow-lg';
        if (boxPo) boxPo.classList.remove('hidden');

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const poDate = document.getElementById('po-date-input');
        const poTime = document.getElementById('po-time-input');
        if (poDate && !poDate.value) poDate.value = tomorrow.toISOString().split('T')[0];
        if (poTime && !poTime.value) poTime.value = "13:00";
    }
}

function setPayMethod(method) {
    selectedPayMethod = method;
    const btnQris = document.getElementById('btn-pay-qris');
    const btnCash = document.getElementById('btn-pay-cash');

    if (method === 'qris') {
        btnQris.className = 'btn-press py-2 rounded-xl font-bold active-border shadow-lg';
        btnCash.className = 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700 border-slate-200';
    } else {
        btnQris.className = 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700 border-slate-200';
        btnCash.className = 'btn-press py-2 rounded-xl font-bold active-border shadow-lg';
    }
}

function removeFromCart(cartId) {
    cart = cart.filter(c => c.cartId !== cartId);
    renderCartModalItems();
    updateCartFloatingBar();
    if (cart.length === 0) closeCartModal();
}

function renderCartModalItems() {
    const list = document.getElementById('cart-items-list');
    if (!list) return;

    list.innerHTML = cart.map((item) => `
        <div class="flex justify-between items-center text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div class="flex-1 pr-2">
                <p class="font-black text-slate-900">${item.name}</p>
                <p class="text-[10px] text-slate-500 font-medium">${item.ice !== 'Default' ? item.ice : ''} ${item.sugar !== 'Default' ? '• ' + item.sugar : ''} ${item.boba ? '• Extra Boba (+3k)' : ''}</p>
                <p class="text-xs font-extrabold text-themebrand-700 mt-0.5">Rp ${item.price.toLocaleString()}</p>
            </div>
            <button type="button" onclick="removeFromCart(${item.cartId})" class="text-rose-500 hover:text-rose-700 p-1.5 font-bold"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');

    const subtotal = cart.reduce((a, b) => a + b.price, 0);
    if (document.getElementById('summary-subtotal')) document.getElementById('summary-subtotal').innerText = `Rp ${subtotal.toLocaleString()}`;
    if (document.getElementById('summary-grandtotal')) document.getElementById('summary-grandtotal').innerText = `Rp ${subtotal.toLocaleString()}`;
}

// ==========================================
// FORMATTER DRAF WHATSAPP & CHECKOUT DIRECT
// ==========================================

function submitCheckout(btn) {
    const nameInput = document.getElementById('cust-name-input');
    const phoneInput = document.getElementById('cust-phone-input');

    if (!nameInput || !phoneInput) return;
    const name = nameInput.value.trim();
    let phone = phoneInput.value.replace(/[^0-9]/g, '');

    if (!name || !phone) {
        showToast("Mohon isi Nama & Nomor WhatsApp!", true);
        return;
    }

    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const memberObj = store.members.find(m => m.phone === phone);
    const subtotal = cart.reduce((a, b) => a + b.price, 0);

    if (memberObj && subtotal >= store.stampMinSpend) {
        memberObj.stamps = ((memberObj.stamps || 0) + 1) % 6;
        saveStore('members');
        renderMemberStamps();
    }

    const orderId = '#ORD-' + Date.now().toString().slice(-4);

    let scheduleText = "Ambil Langsung (Instant)";
    if (selectedOrderType === 'preorder') {
        const poDate = document.getElementById('po-date-input').value;
        const poTime = document.getElementById('po-time-input').value;
        scheduleText = `📅 PRE-ORDER (${poDate} Pukul ${poTime} WIB)`;
    }

    const orderData = {
        id: orderId,
        name: name,
        phone: phone,
        items: [...cart],
        type: selectedOrderType,
        payMethod: selectedPayMethod,
        schedule: scheduleText,
        status: 'Pending',
        total: subtotal,
        timestamp: getFormattedRealTime()
    };

    store.orders.push(orderData);
    saveStore('orders');

    triggerButtonLoading(btn, () => {
        closeCartModal();
        
        // Langsung eksekusi draf WhatsApp tanpa menampilkan pop-up struk
        executeDirectWhatsappMessage(orderData);

        cart = [];
        updateCartFloatingBar();
        nameInput.value = '';
        phoneInput.value = '';
        showToast("Pesanan berhasil dikirim ke WhatsApp!");
    });
}

function executeDirectWhatsappMessage(order) {
    let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
    if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);

    let msg = "";

    if (order.payMethod === 'qris') {
        msg = `*MAINSTAY DRINK SHOP - KONFIRMASI QRIS*\n----------------------------------------\n📋 *DETAIL PESANAN*\n• ID Order: ${order.id}\n• Waktu Pesan: ${order.timestamp}\n• Tipe Order: ${order.schedule}\n\n👤 *DATA PELANGGAN*\n• Nama: ${order.name}\n• No. WA: ${order.phone}\n\n🥤 *RINCIAN ITEM PESANAN:*\n`;
        order.items.forEach((item, i) => {
            msg += `${i+1}. ${item.name} (${item.ice}, ${item.sugar}${item.boba ? ', +Extra Boba' : ''}) - Rp ${item.price.toLocaleString()}\n`;
        });
        msg += `\n💰 *TOTAL TAGIHAN: Rp ${order.total.toLocaleString()}*\n----------------------------------------\n Lampirkan foto bukti pembayaran QRIS / transfer di bawah pesan ini. Terima kasih!`;
    } else if (order.type === 'preorder') {
        msg = `*MAINSTAY DRINK SHOP - JADWAL PRE-ORDER*\n----------------------------------------\n📋 *DETAIL PESANAN PRE-ORDER*\n• ID Order: ${order.id}\n• Waktu Pemesanan: ${order.timestamp}\n• ${order.schedule}\n\n👤 *DATA PELANGGAN*\n• Nama: ${order.name}\n• No. WA: ${order.phone}\n\n🥤 *RINCIAN ITEM PESANAN:*\n`;
        order.items.forEach((item, i) => {
            msg += `${i+1}. ${item.name} (${item.ice}, ${item.sugar}${item.boba ? ', +Extra Boba' : ''}) - Rp ${item.price.toLocaleString()}\n`;
        });
        msg += `\n💰 *TOTAL TAGIHAN PRE-ORDER: Rp ${order.total.toLocaleString()}*\n----------------------------------------\n⚠️ *CATATAN PENTING PRE-ORDER:*\nPemesanan Pre-Order WAJIB LUNAS 100% di awal (Kami TIDAK MENERIMA pembayaran DP / Uang Muka) demi memastikan ketersediaan stok & slot antrean pembuatan.\n\n Lampirkan foto bukti pembayaran QRIS / transfer LUNAS 100% di bawah pesan ini (atau konfirmasikan jika bayar di kasir saat pengambilan). Terima kasih!`;
    } else {
        msg = `*MAINSTAY DRINK SHOP - PESAN BAYAR DI KASIR*\n----------------------------------------\n📋 *DETAIL PESANAN*\n• ID Order: ${order.id}\n• Waktu Pesan: ${order.timestamp}\n• Tipe Order: ${order.schedule}\n\n👤 *DATA PELANGGAN*\n• Nama: ${order.name}\n• No. WA: ${order.phone}\n\n🥤 *RINCIAN ITEM PESANAN:*\n`;
        order.items.forEach((item, i) => {
            msg += `${i+1}. ${item.name} (${item.ice}, ${item.sugar}${item.boba ? ', +Extra Boba' : ''}) - Rp ${item.price.toLocaleString()}\n`;
        });
        msg += `\n💰 *TOTAL PAYABLE KASIR: Rp ${order.total.toLocaleString()}*\n----------------------------------------\nHalo Admin! Saya sudah buat pesanan di atas dan akan melakukan pembayaran Tunai / EDC langsung di meja Kasir. Mohon diproses ya, terima kasih!`;
    }

    const waLink = `https://wa.me/${waResto}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
}

function openPaymentModal(order) {
    pendingCheckoutOrder = order;
    const qrisDisplay = document.getElementById('qris-img-display');
    const amountDisplay = document.getElementById('qris-amount-display');

    if (qrisDisplay) qrisDisplay.src = store.ownerProfile.qrisUrl || store.theme.qrisUrl;
    if (amountDisplay) amountDisplay.innerText = `Rp ${order.total.toLocaleString()}`;

    document.getElementById('qris-view').classList.remove('hidden');
    document.getElementById('receipt-view').classList.add('hidden');
    document.getElementById('modal-payment').classList.remove('hidden');
}

// DOWLOAD REAL QRIS IMAGE
function downloadQrisImage() {
    const src = store.ownerProfile.qrisUrl || store.theme.qrisUrl;
    if (!src) return showToast("Gambar QRIS belum dikonfigurasi!", true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const a = document.createElement('a');
        a.href = canvas.toDataURL("image/png");
        a.download = `QRIS-Mainstay-Drink.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Gambar QRIS berhasil diunduh!");
    };
    img.onerror = function() {
        const a = document.createElement('a');
        a.href = src;
        a.download = `QRIS-Mainstay-Drink.png`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Membuka berkas QRIS...");
    };
}

function confirmPaymentAndReceipt(btn) {
    if (!pendingCheckoutOrder) return;
    executeDirectWhatsappMessage(pendingCheckoutOrder);
    
    document.getElementById('qris-view').classList.add('hidden');
    document.getElementById('receipt-view').classList.remove('hidden');
    renderReceipt(pendingCheckoutOrder);
}

function renderReceipt(order) {
    document.getElementById('rec-id').innerText = order.id;
    document.getElementById('rec-timestamp').innerText = order.timestamp;
    document.getElementById('rec-type').innerText = order.schedule;
    document.getElementById('rec-name').innerText = order.name;
    document.getElementById('rec-phone').innerText = order.phone;
    document.getElementById('rec-total').innerText = `Rp ${order.total.toLocaleString()}`;

    const itemsContainer = document.getElementById('rec-items-list');
    if (itemsContainer) {
        itemsContainer.innerHTML = order.items.map(item => `
            <div class="flex justify-between items-center text-[11px]">
                <div>
                    <p class="font-bold text-slate-800">${item.name}</p>
                    <p class="text-[9px] text-slate-500">${item.ice} | ${item.sugar} ${item.boba ? '| Extra Boba' : ''}</p>
                </div>
                <span class="font-bold text-slate-900">Rp ${item.price.toLocaleString()}</span>
            </div>
        `).join('');
    }

    const verifyQrBox = document.getElementById('receipt-verify-qr');
    if (verifyQrBox) {
        verifyQrBox.innerHTML = '';
        new QRCode(verifyQrBox, {
            text: `VERIFIED-MAINSTAY-${order.id}-${order.total}`,
            width: 70,
            height: 70
        });
    }

    let customerPhone = order.phone.replace(/[^0-9]/g, '');
    if (customerPhone.startsWith('0')) customerPhone = '62' + customerPhone.substring(1);
    
    let msgReceipt = `*MAINSTAY DRINK SHOP - STRUK DIGITAL LUNAS*\n----------------------------------------\n📋 *ID Order:* ${order.id}\n Waktu: ${order.timestamp}\n Tipe: ${order.schedule}\n\n👤 Pemesan: ${order.name}\n💰 *TOTAL LUNAS: Rp ${order.total.toLocaleString()}*\n----------------------------------------\nTerima kasih Kak ${order.name}! Pesanan Anda sedang diproses. Simpan struk digital resmi ini sebagai bukti pembayaran sah.`;
    
    const btnWaCust = document.getElementById('btn-wa-customer');
    if (btnWaCust) btnWaCust.href = `https://wa.me/${customerPhone}?text=${encodeURIComponent(msgReceipt)}`;
}

// DOWLOAD REAL STRUK DIGITAL (PNG)
function downloadReceiptPNG(btn) {
    const receiptEl = document.getElementById('printable-area');
    if (!receiptEl) return showToast("Struk tidak ditemukan!", true);

    showToast("Memproses unduhan gambar...");
    html2canvas(receiptEl, { scale: 2, useCORS: true }).then(canvas => {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `Struk_${document.getElementById('rec-id').innerText || 'Mainstay'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Struk PNG Berhasil Diunduh!");
    }).catch(() => {
        showToast("Gagal mengunduh gambar struk!", true);
    });
}

function closePaymentModal() { 
    document.getElementById('modal-payment').classList.add('hidden'); 
}

function printReceiptPhysical() { 
    window.print(); 
}
