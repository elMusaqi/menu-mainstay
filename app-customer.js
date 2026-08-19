// LOGIKA CUSTOMER: MENU, KERANJANG, & DRAF WHATSAPP OTOMATIS

function renderCustomerCategories() {
    const container = document.getElementById('cust-categories');
    container.innerHTML = `<button type="button" onclick="filterMenu('Semua')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${currentCategory === 'Semua' ? 'bg-themebrand-600 text-white' : 'bg-white border text-slate-700'} whitespace-nowrap shadow-sm">Semua</button>`;
    store.categories.forEach(cat => {
        container.innerHTML += `<button type="button" onclick="filterMenu('${cat}')" class="px-4 py-1.5 rounded-xl text-xs font-bold ${currentCategory === cat ? 'bg-themebrand-600 text-white' : 'bg-white border text-slate-700'} whitespace-nowrap shadow-sm">${cat}</button>`;
    });
}

function filterMenu(cat) { currentCategory = cat; renderCustomerCategories(); renderCustomerMenu(); }

function renderCustomerMenu() {
    const grid = document.getElementById('cust-menu-grid');
    const search = document.getElementById('cust-search').value.toLowerCase();
    grid.className = customerLayout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 gap-3' : 'space-y-2';
    grid.innerHTML = '';

    store.menu.filter(m => (currentCategory === 'Semua' || m.category === currentCategory) && m.name.toLowerCase().includes(search)).forEach(m => {
        grid.innerHTML += `
            <div class="${customerLayout === 'grid' ? 'bg-white p-3 rounded-2xl border shadow-sm' : 'bg-white p-3 rounded-2xl border flex items-center gap-3'}">
                <img src="${m.image}" class="${customerLayout === 'grid' ? 'w-full h-32 mb-2 rounded-xl object-cover' : 'w-16 h-16 rounded-xl object-cover'}">
                <div class="flex-1 min-w-0">
                    <p class="font-black text-xs truncate">${m.name}</p>
                    <p class="text-[10px] text-slate-500 truncate mb-1">${m.desc}</p>
                    <p class="text-xs font-bold text-themebrand-600">Rp ${m.price.toLocaleString()}</p>
                </div>
                <button type="button" onclick="prepareAddToCart(${m.id})" class="btn-press bg-slate-900 text-white w-8 h-8 rounded-full shadow-md"><i class="fa-solid fa-plus text-[10px]"></i></button>
            </div>
        `;
    });
}

function prepareAddToCart(id) {
    activeOptionItem = store.menu.find(m => m.id === id);
    document.getElementById('opt-item-name').innerText = activeOptionItem.name;
    document.getElementById('box-opt-ice').className = activeOptionItem.optIce ? '' : 'hidden';
    document.getElementById('box-opt-sugar').className = activeOptionItem.optSugar ? '' : 'hidden';
    document.getElementById('box-opt-hot').className = activeOptionItem.optHot ? 'p-2 bg-amber-50 border rounded-xl font-bold text-amber-900 text-center' : 'hidden';
    document.getElementById('box-opt-boba').className = activeOptionItem.optBoba ? 'flex items-center gap-2 p-2 bg-slate-50 rounded-xl border' : 'hidden';
    document.getElementById('modal-item-options').classList.remove('hidden');
}

function selectIce(val) {
    selectedIce = val;
    document.querySelectorAll('.opt-btn-ice').forEach(btn => {
        btn.className = btn.id === `opt-ice-${val.split(' ')[0].toLowerCase()}` ? 'opt-btn-ice py-1.5 bg-themebrand-100 text-themebrand-900 font-bold rounded-xl border border-themebrand-500' : 'opt-btn-ice py-1.5 bg-slate-50 text-slate-600 rounded-xl border';
    });
}

function selectSugar(val) {
    selectedSugar = val;
    document.querySelectorAll('.opt-btn-sugar').forEach(btn => {
        btn.className = btn.id === `opt-sugar-${val.split('%')[0]}` ? 'opt-btn-sugar py-1.5 bg-themebrand-100 text-themebrand-900 font-bold rounded-xl border border-themebrand-500' : 'opt-btn-sugar py-1.5 bg-slate-50 text-slate-600 rounded-xl border';
    });
}

function confirmAddToCartWithOptions() {
    const item = { ...activeOptionItem, ice: selectedIce, sugar: selectedSugar, boba: document.getElementById('opt-topping-boba').checked };
    cart.push(item);
    showToast("Berhasil ditambah ke keranjang!");
    closeOptionModal();
    updateCartFloatingBar();
}

function closeOptionModal() { document.getElementById('modal-item-options').classList.add('hidden'); }

function updateCartFloatingBar() {
    const bar = document.getElementById('floating-cart');
    if (cart.length > 0) {
        bar.classList.remove('translate-y-32');
        document.getElementById('cart-item-count').innerText = `${cart.length} Item`;
        document.getElementById('cart-total-price').innerText = `Rp ${cart.reduce((a, b) => a + b.price, 0).toLocaleString()}`;
    } else {
        bar.classList.add('translate-y-32');
    }
}

function openCartModal() { document.getElementById('modal-cart').classList.remove('hidden'); renderCartModalItems(); }
function closeCartModal() { document.getElementById('modal-cart').classList.add('hidden'); }

function setOrderType(type) {
    selectedOrderType = type;
    document.getElementById('btn-order-now').className = type === 'now' ? 'btn-press py-2 rounded-xl font-bold border transition bg-slate-900 text-themebrand-400 ring-2 ring-themebrand-500 shadow-lg' : 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700';
    document.getElementById('btn-order-po').className = type === 'preorder' ? 'btn-press py-2 rounded-xl font-bold border transition bg-slate-900 text-themebrand-400 ring-2 ring-themebrand-500 shadow-lg' : 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700';
    document.getElementById('box-preorder-schedule').className = type === 'preorder' ? 'p-3 bg-themebrand-50 border border-themebrand-200 rounded-xl space-y-2' : 'hidden';
}

function setPayMethod(method) {
    selectedPayMethod = method;
    document.getElementById('btn-pay-qris').className = method === 'qris' ? 'btn-press py-2 rounded-xl font-bold border transition bg-slate-900 text-themebrand-400 ring-2 ring-themebrand-500 shadow-lg' : 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700';
    document.getElementById('btn-pay-cash').className = method === 'cash' ? 'btn-press py-2 rounded-xl font-bold border transition bg-slate-900 text-themebrand-400 ring-2 ring-themebrand-500 shadow-lg' : 'btn-press py-2 rounded-xl font-bold border transition bg-white text-slate-700';
}

function renderCartModalItems() {
    const list = document.getElementById('cart-items-list');
    list.innerHTML = cart.map((item, idx) => `
        <div class="flex justify-between items-center text-xs">
            <div class="flex-1"><p class="font-bold">${item.name}</p><p class="text-[10px] text-slate-500">${item.ice} | ${item.sugar} ${item.boba ? '| Extra Boba' : ''}</p></div>
            <p class="font-bold">Rp ${item.price.toLocaleString()}</p>
        </div>
    `).join('');
    const subtotal = cart.reduce((a, b) => a + b.price, 0);
    document.getElementById('summary-subtotal').innerText = `Rp ${subtotal.toLocaleString()}`;
    document.getElementById('summary-grandtotal').innerText = `Rp ${subtotal.toLocaleString()}`;
}

function submitCheckout(btn) {
    const name = document.getElementById('cust-name-input').value;
    const phone = document.getElementById('cust-phone-input').value.replace(/[^0-9]/g, '');
    if (!name || !phone) return showToast("Mohon isi Nama & No. WA!", true);

    const orderId = '#ORD-' + Date.now().toString().slice(-4);
    const orderData = { id: orderId, name, phone, items: cart, type: selectedOrderType, payMethod: selectedPayMethod, status: 'Pending', total: cart.reduce((a, b) => a + b.price, 0), timestamp: new Date().toISOString() };
    
    store.orders.push(orderData);
    saveStore('orders');
    triggerButtonLoading(btn, () => {
        closeCartModal();
        if (selectedPayMethod === 'qris') openPaymentModal(orderData);
        else generateOrderDraftWA(orderData);
    });
}

function generateOrderDraftWA(order) {
    let msg = `*MAINSTAY DRINK SHOP - ${order.type === 'preorder' ? 'JADWAL PRE-ORDER' : 'PESANAN BAYAR DI KASIR'}*\n----------------------------------------\n📋 *DETAIL PESANAN*\n• ID Order: ${order.id}\n• Tipe Order: ${order.type === 'preorder' ? 'Pre-Order' : 'Takeaway'}\n\n👤 *DATA PELANGGAN*\n• Nama: ${order.name}\n• No. WA: ${order.phone}\n\n🥤 *RINCIAN ITEM:*\n`;
    order.items.forEach((item, i) => msg += `${i+1}. ${item.name} (${item.ice}, ${item.sugar}) - Rp ${item.price.toLocaleString()}\n`);
    msg += `\n💰 *TOTAL TAGIHAN: Rp ${order.total.toLocaleString()}*\n----------------------------------------\n`;
    
    if (order.type === 'preorder') msg += `⚠️ *CATATAN PENTING PRE-ORDER:*\nPemesanan WAJIB LUNAS 100% (TIDAK TERIMA DP).\nLampirkan bukti transfer LUNAS di bawah ini.`;
    else msg += `Halo Admin! Saya buat pesanan dan bayar tunai di Kasir. Mohon diproses ya.`;

    const waLink = `https://wa.me/${(store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
}

function openPaymentModal(order) {
    pendingCheckoutOrder = order;
    document.getElementById('qris-img-display').src = store.theme.qrisUrl;
    document.getElementById('qris-amount-display').innerText = `Rp ${order.total.toLocaleString()}`;
    document.getElementById('qris-view').classList.remove('hidden');
    document.getElementById('receipt-view').classList.add('hidden');
    document.getElementById('modal-payment').classList.remove('hidden');
}

function confirmPaymentAndReceipt(btn) {
    // Generate Draf QRIS WA
    let msg = `*MAINSTAY DRINK SHOP - KONFIRMASI QRIS*\n----------------------------------------\n📋 *ID Order:* ${pendingCheckoutOrder.id}\n👤 *Nama:* ${pendingCheckoutOrder.name}\n💰 *Total:* Rp ${pendingCheckoutOrder.total.toLocaleString()}\n\nLampirkan foto bukti pembayaran QRIS / transfer di bawah pesan ini. Terima kasih!`;
    const waLink = `https://wa.me/${(store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(waLink, '_blank');
    
    document.getElementById('qris-view').classList.add('hidden');
    document.getElementById('receipt-view').classList.remove('hidden');
    renderReceipt(pendingCheckoutOrder);
}
