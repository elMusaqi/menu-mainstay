// CUSTOMER FRONTEND, CAROUSEL & AUTO-DRAFT WA GENERATOR ENGINE

let currentSlideIdx = 0;
let carouselTimer = null;

function initCarousel() { renderCarouselSlides(); startCarouselAutoPlay(); }

function renderCarouselSlides() {
    const container = document.getElementById('carousel-slides');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!container) return;

    if (store.banners.length === 0) {
        container.innerHTML = `<div class="min-w-full p-6 space-y-2"><span class="px-3 py-1 rounded-full bg-themebrand-500 text-slate-950 text-[10px] font-black uppercase">🥤 PRE-ORDER & INSTANT</span><h2 class="text-xl font-black">${store.theme.restoName}</h2><p class="text-xs text-slate-300">Pesan minuman segar favoritmu sekarang!</p></div>`;
        return;
    }

    container.innerHTML = store.banners.map((b) => `
        <div class="min-w-full relative flex flex-col justify-end p-6 min-h-[180px]">
            ${b.image ? `<img src="${b.image}" class="absolute inset-0 w-full h-full object-cover z-0 opacity-40">` : ''}
            <div class="relative z-10 space-y-1">
                <span class="px-2.5 py-0.5 rounded-full bg-themebrand-500 text-slate-950 text-[9px] font-black uppercase inline-block">${b.tag || '🥤 PROMO'}</span>
                <h2 class="text-lg font-black text-white">${b.title}</h2>
                <p class="text-xs text-slate-200 line-clamp-2">${b.desc || ''}</p>
            </div>
        </div>
    `).join('');

    dotsContainer.innerHTML = store.banners.map((_, idx) => `<button type="button" onclick="goToSlide(${idx})" class="w-2 h-2 rounded-full transition ${idx === currentSlideIdx ? 'bg-themebrand-400 w-5' : 'bg-white/40'}"></button>`).join('');
}

function updateSlidePosition() {
    const container = document.getElementById('carousel-slides');
    if (container) container.style.transform = `translateX(-${currentSlideIdx * 100}%)`;
    renderCarouselSlides();
}
function nextSlide() { if (store.banners.length === 0) return; currentSlideIdx = (currentSlideIdx + 1) % store.banners.length; updateSlidePosition(); }
function prevSlide() { if (store.banners.length === 0) return; currentSlideIdx = (currentSlideIdx - 1 + store.banners.length) % store.banners.length; updateSlidePosition(); }
function goToSlide(idx) { currentSlideIdx = idx; updateSlidePosition(); }
function startCarouselAutoPlay() { if (carouselTimer) clearInterval(carouselTimer); carouselTimer = setInterval(() => nextSlide(), 4000); }

function updateStampRuleDescription() {
    const rewardItem = store.menu.find(m => m.id === store.stampRewardItemId);
    const descEl = document.getElementById('stamp-rule-desc');
    if (descEl) descEl.innerText = `Dapatkan 1 stempel tiap min. belanja Rp ${store.stampMinSpend.toLocaleString('id-ID')}! Kumpulkan 5 stempel untuk klaim ${rewardItem ? rewardItem.name : 'Minuman'} gratis.`;
}

function renderMemberStamps() {
    let html = '';
    for (let i = 1; i <= 5; i++) html += `<div class="w-6 h-6 rounded-full bg-white text-slate-900 font-black flex items-center justify-center text-[10px] shadow"><i class="fa-solid fa-star text-themebrand-500"></i></div>`;
    const container = document.getElementById('stamp-indicators');
    if (container) container.innerHTML = html;
}

function renderCustomerCategories() {
    const categories = ['Semua', ...store.categories];
    const el = document.getElementById('cust-categories');
    if (!el) return;
    el.innerHTML = categories.map(c => `<button type="button" onclick="selectCategory('${c}')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${c === currentCategory ? 'bg-slate-900 text-themebrand-400' : 'bg-white text-slate-700 border'}">${c}</button>`).join('');
}
function selectCategory(cat) { currentCategory = cat; renderCustomerCategories(); renderCustomerMenu(); }
function setCustomerLayout(layout) { customerLayout = layout; renderCustomerMenu(); }

function renderCustomerMenu() {
    const keyword = document.getElementById('cust-search').value.toLowerCase();
    const filtered = store.menu.filter(m => (m.name.toLowerCase().includes(keyword) || (m.desc && m.desc.toLowerCase().includes(keyword))) && (currentCategory === 'Semua' || m.category === currentCategory));
    const container = document.getElementById('cust-menu-grid');

    if (customerLayout === 'grid') {
        container.className = "grid grid-cols-2 lg:grid-cols-4 gap-3";
        container.innerHTML = filtered.map(item => {
            const isFlash = store.flashSaleItem && store.flashSaleItem.itemId === item.id;
            const displayPrice = isFlash ? store.flashSaleItem.flashPrice : item.price;
            return `
                <div class="bg-white rounded-3xl p-3 border shadow-sm flex flex-col justify-between relative overflow-hidden">
                    ${isFlash ? `<span class="absolute top-2 left-2 bg-rose-600 text-white font-black text-[8px] px-2 py-0.5 rounded-full z-10">🔥 FLASH SALE</span>` : ''}
                    <div class="space-y-2">
                        <div class="w-full h-28 rounded-2xl overflow-hidden bg-slate-100"><img src="${item.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80'}" class="w-full h-full object-cover"></div>
                        <div><h3 class="font-bold text-xs text-slate-900 truncate">${item.name}</h3><p class="text-[10px] text-slate-500 line-clamp-2">${item.desc || '-'}</p></div>
                    </div>
                    <div class="mt-3 pt-2 border-t flex items-center justify-between gap-1">
                        <span class="font-black text-xs text-themebrand-700">Rp ${displayPrice.toLocaleString('id-ID')}</span>
                        <button type="button" onclick="openOptionModal(${item.id})" class="px-2.5 py-1.5 bg-themebrand-100 text-themebrand-900 rounded-xl text-xs font-bold">+ Tambah</button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        container.className = "space-y-2";
        container.innerHTML = filtered.map(item => {
            const isFlash = store.flashSaleItem && store.flashSaleItem.itemId === item.id;
            const displayPrice = isFlash ? store.flashSaleItem.flashPrice : item.price;
            return `
                <div class="bg-white p-2.5 rounded-2xl border flex items-center justify-between text-xs gap-2">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=100&q=80'}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                    <div class="flex-1 min-w-0"><p class="font-bold truncate">${item.name}</p><p class="text-themebrand-700 font-extrabold">Rp ${displayPrice.toLocaleString('id-ID')}</p></div>
                    <button type="button" onclick="openOptionModal(${item.id})" class="px-3 py-1.5 bg-themebrand-100 text-themebrand-900 rounded-xl font-bold">+ Tambah</button>
                </div>
            `;
        }).join('');
    }
}

function openOptionModal(id) {
    const item = store.menu.find(m => m.id === id);
    if (!item) return;
    activeOptionItem = item;
    document.getElementById('opt-item-name').innerText = item.name;
    document.getElementById('opt-topping-boba').checked = false;
    selectIce('Normal Ice'); selectSugar('100% Sugar');
    document.getElementById('modal-item-options').classList.remove('hidden');
}
function closeOptionModal() { document.getElementById('modal-item-options').classList.add('hidden'); }

function selectIce(val) { selectedIce = val; }
function selectSugar(val) { selectedSugar = val; }

function confirmAddToCartWithOptions() {
    if (!activeOptionItem) return;
    const hasBoba = document.getElementById('opt-topping-boba').checked;
    const extraPrice = hasBoba ? 3000 : 0;
    const isFlash = store.flashSaleItem && store.flashSaleItem.itemId === activeOptionItem.id;
    const basePrice = isFlash ? store.flashSaleItem.flashPrice : activeOptionItem.price;
    const optionNote = `${selectedIce}, ${selectedSugar}${hasBoba ? ', +Extra Boba' : ''}`;
    const cartKey = `${activeOptionItem.id}_${optionNote}`;
    const exist = cart.find(c => c.cartKey === cartKey);

    if (exist) exist.qty += 1;
    else cart.push({ cartKey: cartKey, id: activeOptionItem.id, name: activeOptionItem.name, price: basePrice + extraPrice, options: optionNote, qty: 1 });

    closeOptionModal(); updateCartFloatingBar(); showToast(`+1 ${activeOptionItem.name}`);
}

function updateCartFloatingBar() {
    const floatBar = document.getElementById('floating-cart');
    if (cart.length === 0 || currentRole === 'owner') { floatBar.classList.add('translate-y-32'); return; }
    floatBar.classList.remove('translate-y-32');
    document.getElementById('cart-total-price').innerText = `Rp ${cart.reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString('id-ID')}`;
    document.getElementById('cart-item-count').innerText = `${cart.reduce((s, i) => s + i.qty, 0)} Item`;
}

function setOrderType(type) {
    selectedOrderType = type;
    const boxPo = document.getElementById('box-preorder-schedule');
    if (type === 'now') boxPo.classList.add('hidden');
    else {
        boxPo.classList.remove('hidden');
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('po-date-input').value = tomorrow.toISOString().split('T')[0];
        document.getElementById('po-time-input').value = "12:00";
    }
}

function openCartModal() {
    renderCartModalItems(); setOrderType('now');
    if (currentRole === 'kasir') {
        document.getElementById('kasir-checkout-opts').classList.remove('hidden');
        document.getElementById('select-kasir-staff').innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        document.getElementById('select-kasir-discount').innerHTML = store.discounts.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
    } else document.getElementById('kasir-checkout-opts').classList.add('hidden');
    document.getElementById('modal-cart').classList.remove('hidden');
}
function closeCartModal() { document.getElementById('modal-cart').classList.add('hidden'); }

function renderCartModalItems() {
    document.getElementById('cart-items-list').innerHTML = cart.map((item, idx) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border text-xs">
            <div><p class="font-bold text-slate-900">${item.name}</p><p class="text-[10px] text-slate-500">${item.options}</p><p class="text-themebrand-700 font-extrabold">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</p></div>
            <div class="flex items-center gap-1.5 bg-white p-1 rounded-xl border">
                <button type="button" onclick="changeQty(${idx}, -1)" class="w-5 h-5 rounded bg-slate-100 font-black">-</button>
                <span class="w-4 text-center font-bold">${item.qty}</span>
                <button type="button" onclick="changeQty(${idx}, 1)" class="w-5 h-5 rounded bg-slate-100 font-black">+</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    document.getElementById('summary-subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('summary-grandtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
}

function changeQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCartModalItems(); updateCartFloatingBar();
    if (cart.length === 0) closeCartModal();
}

// CHECKOUT ENGINE DENGAN AUTO-DRAFT DRAFT WA PRESISI REAL-TIME
function submitCheckout() {
    const name = document.getElementById('cust-name-input').value.trim();
    const phone = document.getElementById('cust-phone-input').value.trim();
    if (!name || !phone) return showToast("Mohon isi nama & WA!", true);

    const currentTimeStamp = getFormattedRealTime();
    let orderTypeLabel = "Takeaway Instant";
    if (selectedOrderType === 'preorder') {
        const pDate = document.getElementById('po-date-input').value;
        const pTime = document.getElementById('po-time-input').value;
        if (!pDate || !pTime) return showToast("Mohon isi jadwal Pre-Order!", true);
        orderTypeLabel = `PRE-ORDER (${pDate} Pukul ${pTime})`;
    }

    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);

    pendingCheckoutOrder = {
        id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: currentTimeStamp,
        orderType: orderTypeLabel,
        isPreorder: selectedOrderType === 'preorder',
        customer: name, phone: phone, items: [...cart],
        subtotal: subtotal, grandTotal: subtotal,
        status: currentRole === 'kasir' ? 'Cooking' : 'Pending'
    };

    closeCartModal();
    openPaymentModal(pendingCheckoutOrder);
}

function openPaymentModal(order) {
    document.getElementById('qris-amount-display').innerText = `Rp ${order.grandTotal.toLocaleString('id-ID')}`;
    const qrisUrl = store.theme.qrisUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY_${order.id}`;
    document.getElementById('qris-img-display').src = qrisUrl;

    document.getElementById('rec-id').innerText = `#${order.id}`;
    document.getElementById('rec-timestamp').innerText = order.timestamp;
    document.getElementById('rec-type').innerText = order.orderType;
    document.getElementById('rec-name').innerText = order.customer;
    document.getElementById('rec-phone').innerText = order.phone;
    document.getElementById('rec-total').innerText = `Rp ${order.grandTotal.toLocaleString('id-ID')}`;

    document.getElementById('rec-items-list').innerHTML = order.items.map(i => `
        <div class="flex justify-between text-[11px] text-slate-700"><span>${i.qty}x ${i.name} (${i.options})</span><span>Rp ${(i.price * i.qty).toLocaleString('id-ID')}</span></div>
    `).join('');

    // RENDER QR VERIFIKASI STRUK RESMI
    const verifyBox = document.getElementById('receipt-verify-qr');
    verifyBox.innerHTML = '';
    new QRCode(verifyBox, { text: `VERIFIED_${order.id}_${order.timestamp}`, width: 70, height: 70 });

    document.getElementById('qris-view').classList.remove('hidden');
    document.getElementById('receipt-view').classList.add('hidden');
    document.getElementById('modal-payment').classList.remove('hidden');
}

// KONFIRMASI DRAFT WA PELANGGAN KE RESTO (LENGKAP WAKTU REAL-TIME & JEDA BUKTI BAYAR)
function confirmPaymentAndReceipt() {
    if (pendingCheckoutOrder) {
        store.orders.unshift(pendingCheckoutOrder);
        saveStore('orders');

        speakOrderNotification(pendingCheckoutOrder.isPreorder ? `Ada Pesanan Pre Order Baru dari ${pendingCheckoutOrder.customer}` : `Pesanan Baru Masuk dari ${pendingCheckoutOrder.customer}`);

        // GENERATE DRAFT WA TERSTRUKTUR DENGAN HARI, TANGGAL, JAM:MENIT:DETIK
        let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
        if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);

        let itemsText = pendingCheckoutOrder.items.map((i, idx) => `${idx + 1}. ${i.qty}x ${i.name} (${i.options}) - Rp ${(i.price * i.qty).toLocaleString('id-ID')}`).join('%0A');

        let msgResto = `Halo Admin Mainstay Drink Shop! Saya mau konfirmasi pesanan:%0A%0A📋 *DETAIL PESANAN*%0A• ID Pesanan: #${pendingCheckoutOrder.id}%0A• Waktu Pesan: ${pendingCheckoutOrder.timestamp}%0A• Tipe: ${pendingCheckoutOrder.orderType}%0A• Nama Pemesan: ${pendingCheckoutOrder.customer}%0A%0A🥤 *DAFTAR PESANAN:*%0A${itemsText}%0A%0A💰 *TOTAL TAGIHAN:* Rp ${pendingCheckoutOrder.grandTotal.toLocaleString('id-ID')}%0A%0A---%0A Silakan cek lampiran foto bukti transfer/QRIS di bawah ini. Mohon segera diproses ya, terima kasih!`;

        window.open(`https://wa.me/${waResto}?text=${msgResto}`, '_blank');
        pendingCheckoutOrder = null;
    }

    document.getElementById('qris-view').classList.add('hidden');
    document.getElementById('receipt-view').classList.remove('hidden');
}

function closePaymentModal() {
    cart = []; updateCartFloatingBar();
    document.getElementById('modal-payment').classList.add('hidden');
    if (currentRole === 'kasir') renderKasirPipeline();
}
