// CUSTOMER FRONTEND & CATALOG INTERACTION MANAGEMENT

function startFlashSaleTimer() {
    let duration = 3600 * 5; // 5 Jam countdown
    setInterval(() => {
        let h = Math.floor(duration / 3600);
        let m = Math.floor((duration % 3600) / 60);
        let s = duration % 60;
        const el = document.getElementById('flash-timer');
        if (el) el.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
        if (duration > 0) duration--;
    }, 1000);
}

function updateStampRuleDescription() {
    const rewardItem = store.menu.find(m => m.id === store.stampRewardItemId);
    const rewardName = rewardItem ? rewardItem.name : "Minuman Gratis";
    const descEl = document.getElementById('stamp-rule-desc');
    if (descEl) {
        descEl.innerText = `Dapatkan 1 stempel tiap min. belanja Rp ${store.stampMinSpend.toLocaleString('id-ID')}! Kumpulkan 5 stempel untuk klaim ${rewardName} gratis.`;
    }
}

function renderMemberStamps() {
    // Digunakan untuk gambaran umum di layar awal customer
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<div class="w-6 h-6 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-[10px] shadow"><i class="fa-solid fa-star"></i></div>`;
    }
    const container = document.getElementById('stamp-indicators');
    if (container) container.innerHTML = html;
}

function renderCustomerCategories() {
    const categories = ['Semua', ...store.categories];
    const el = document.getElementById('cust-categories');
    if (!el) return;
    el.innerHTML = categories.map(c => `
        <button type="button" onclick="selectCategory('${c}')" class="px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${c === currentCategory ? 'bg-slate-900 text-amberbrand-400 shadow-sm' : 'bg-white text-slate-700 hover:bg-amber-100/50 border border-amber-200'}">${c}</button>
    `).join('');
}

function selectCategory(cat) { currentCategory = cat; renderCustomerCategories(); renderCustomerMenu(); }

function setCustomerLayout(layout) {
    customerLayout = layout;
    document.getElementById('btn-cust-grid').className = layout === 'grid' ? "p-1.5 sm:p-2 rounded-xl text-xs text-amberbrand-600 bg-amber-100" : "p-1.5 sm:p-2 rounded-xl text-xs text-slate-400";
    document.getElementById('btn-cust-list').className = layout === 'list' ? "p-1.5 sm:p-2 rounded-xl text-xs text-amberbrand-600 bg-amber-100" : "p-1.5 sm:p-2 rounded-xl text-xs text-slate-400";
    renderCustomerMenu();
}

function renderCustomerMenu() {
    const keyword = document.getElementById('cust-search').value.toLowerCase();
    const filtered = store.menu.filter(m => (m.name.toLowerCase().includes(keyword) || (m.desc && m.desc.toLowerCase().includes(keyword))) && (currentCategory === 'Semua' || m.category === currentCategory));

    const container = document.getElementById('cust-menu-grid');

    if (customerLayout === 'grid') {
        container.className = "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4";
        container.innerHTML = filtered.map(item => {
            const isFlash = store.flashSaleItem && store.flashSaleItem.itemId === item.id;
            const displayPrice = isFlash ? store.flashSaleItem.flashPrice : item.price;

            return `
                <div class="bg-white rounded-3xl p-3 sm:p-3.5 border border-amber-200 shadow-sm flex flex-col justify-between hover:border-amberbrand-500/50 transition group relative overflow-hidden">
                    ${isFlash ? `<span class="absolute top-2 left-2 bg-rose-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full z-10 shadow">🔥 FLASH SALE</span>` : ''}
                    <div class="space-y-2 sm:space-y-3">
                        <div class="relative w-full h-28 sm:h-36 rounded-2xl overflow-hidden bg-amber-50/50">
                            <img src="${item.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80'}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" alt="${item.name}">
                            <span class="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-md text-amberbrand-700 font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-lg border border-amber-200">${item.category}</span>
                        </div>
                        <div>
                            <h3 class="font-bold text-xs text-slate-900 group-hover:text-amberbrand-600 transition line-clamp-1">${item.name}</h3>
                            <p class="text-[10px] text-slate-500 mt-0.5 line-clamp-2">${item.desc || '-'}</p>
                        </div>
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-amber-100 flex items-center justify-between gap-1">
                        <div>
                            ${isFlash ? `<span class="text-[10px] text-slate-400 line-through block">Rp ${item.price.toLocaleString('id-ID')}</span>` : ''}
                            <span class="font-black text-xs text-amberbrand-700 truncate">Rp ${displayPrice.toLocaleString('id-ID')}</span>
                        </div>
                        <button type="button" onclick="openOptionModal(${item.id})" class="px-2.5 py-1.5 bg-amber-100 text-amberbrand-900 hover:bg-slate-900 hover:text-amberbrand-400 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0">+ Tambah</button>
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
                <div class="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between gap-2.5 hover:border-amberbrand-500/50 transition">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=100&q=80'}" class="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shrink-0">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5">
                            <h3 class="font-bold text-xs text-slate-900 truncate">${item.name}</h3>
                            <span class="text-[8px] sm:text-[9px] bg-amber-100 text-amberbrand-900 px-1.5 py-0.5 rounded font-bold shrink-0">${item.category}</span>
                            ${isFlash ? `<span class="text-[8px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded shrink-0">FLASH SALE</span>` : ''}
                        </div>
                        <p class="text-[10px] text-slate-500 truncate mt-0.5">${item.desc || '-'}</p>
                        <p class="font-black text-xs text-amberbrand-700 mt-0.5">Rp ${displayPrice.toLocaleString('id-ID')}</p>
                    </div>
                    <button type="button" onclick="openOptionModal(${item.id})" class="px-3 py-1.5 bg-amber-100 text-amberbrand-900 hover:bg-slate-900 hover:text-amberbrand-400 rounded-xl text-xs font-bold transition shrink-0">+ Tambah</button>
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
    selectIce('Normal Ice');
    selectSugar('100% Sugar');
    document.getElementById('modal-item-options').classList.remove('hidden');
}

function closeOptionModal() { document.getElementById('modal-item-options').classList.add('hidden'); }

function selectIce(val) {
    selectedIce = val;
    ['normal','less','none'].forEach(k => document.getElementById(`opt-ice-${k}`).className = "py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200");
    if (val === 'Normal Ice') document.getElementById('opt-ice-normal').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
    if (val === 'Less Ice') document.getElementById('opt-ice-less').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
    if (val === 'No Ice') document.getElementById('opt-ice-none').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
}

function selectSugar(val) {
    selectedSugar = val;
    ['100','50','0'].forEach(k => document.getElementById(`opt-sugar-${k}`).className = "py-1.5 bg-slate-50 text-slate-600 rounded-xl border border-slate-200");
    if (val === '100% Sugar') document.getElementById('opt-sugar-100').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
    if (val === '50% Sugar') document.getElementById('opt-sugar-50').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
    if (val === 'No Sugar') document.getElementById('opt-sugar-0').className = "py-1.5 bg-amber-100 text-amberbrand-900 font-bold rounded-xl border border-amber-300";
}

function confirmAddToCartWithOptions() {
    if (!activeOptionItem) return;
    const hasBoba = document.getElementById('opt-topping-boba').checked;
    const extraPrice = hasBoba ? 3000 : 0;
    
    // Check if flash sale price applies
    const isFlash = store.flashSaleItem && store.flashSaleItem.itemId === activeOptionItem.id;
    const basePrice = isFlash ? store.flashSaleItem.flashPrice : activeOptionItem.price;
    const itemPrice = basePrice + extraPrice;
    
    const optionNote = `${selectedIce}, ${selectedSugar}${hasBoba ? ', +Extra Boba' : ''}${isFlash ? ' (Flash Sale)' : ''}`;

    const cartKey = `${activeOptionItem.id}_${optionNote}`;
    const exist = cart.find(c => c.cartKey === cartKey);

    if (exist) exist.qty += 1;
    else cart.push({ cartKey: cartKey, id: activeOptionItem.id, name: activeOptionItem.name, price: itemPrice, options: optionNote, qty: 1 });

    closeOptionModal();
    updateCartFloatingBar();
    showToast(`+1 ${activeOptionItem.name}`);
}

function updateCartFloatingBar() {
    const floatBar = document.getElementById('floating-cart');
    if (cart.length === 0 || currentRole === 'owner') { floatBar.classList.add('translate-y-32'); return; }
    floatBar.classList.remove('translate-y-32');
    document.getElementById('cart-total-price').innerText = `Rp ${cart.reduce((s, i) => s + (i.price * i.qty), 0).toLocaleString('id-ID')}`;
    document.getElementById('cart-item-count').innerText = `${cart.reduce((s, i) => s + i.qty, 0)} Item`;
}

function openCartModal() {
    renderCartModalItems();
    if (currentRole === 'kasir') {
        document.getElementById('kasir-checkout-opts').classList.remove('hidden');
        document.getElementById('select-kasir-staff').innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        document.getElementById('select-kasir-discount').innerHTML = store.discounts.map(d => `<option value="${d.id}">${d.label}</option>`).join('');
    } else {
        document.getElementById('kasir-checkout-opts').classList.add('hidden');
    }
    document.getElementById('modal-cart').classList.remove('hidden');
}

function closeCartModal() { document.getElementById('modal-cart').classList.add('hidden'); }

function renderCartModalItems() {
    document.getElementById('cart-items-list').innerHTML = cart.map((item, idx) => `
        <div class="flex items-center justify-between p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs">
            <div>
                <p class="font-bold text-slate-900">${item.name}</p>
                <p class="text-[10px] text-slate-500">${item.options || ''}</p>
                <p class="text-amberbrand-700 font-extrabold text-[11px] mt-0.5">Rp ${(item.price * item.qty).toLocaleString('id-ID')}</p>
            </div>
            <div class="flex items-center gap-2 bg-white p-1 rounded-xl border border-amber-200 shrink-0">
                <button type="button" onclick="changeQty(${idx}, -1)" class="w-6 h-6 rounded-lg bg-amber-100 text-slate-800 font-black">-</button>
                <span class="w-5 text-center font-bold text-slate-900">${item.qty}</span>
                <button type="button" onclick="changeQty(${idx}, 1)" class="w-6 h-6 rounded-lg bg-amber-100 text-slate-800 font-black">+</button>
            </div>
        </div>
    `).join('');

    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    let discountVal = 0;
    if (currentRole === 'kasir') {
        const discObj = store.discounts.find(d => d.id === parseInt(document.getElementById('select-kasir-discount').value));
        if (discObj) discountVal = discObj.value;
    }
    const grandTotal = Math.max(0, subtotal - discountVal);

    document.getElementById('summary-subtotal').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
    document.getElementById('summary-grandtotal').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
}

function changeQty(idx, delta) {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    renderCartModalItems(); updateCartFloatingBar();
    if (cart.length === 0) closeCartModal();
}

function submitCheckout() {
    const name = document.getElementById('cust-name-input').value.trim();
    const phone = document.getElementById('cust-phone-input').value.trim();
    if (!name || !phone) return showToast("Mohon isi nama & WA!", true);

    const subtotal = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    let discountVal = 0;
    let handler = "Customer Self-Order";

    if (currentRole === 'kasir') {
        handler = document.getElementById('select-kasir-staff').value;
        const discObj = store.discounts.find(d => d.id === parseInt(document.getElementById('select-kasir-discount').value));
        if (discObj) discountVal = discObj.value;
    }

    pendingCheckoutOrder = {
        id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        customer: name, phone: phone, items: [...cart],
        subtotal: subtotal, discount: discountVal,
        grandTotal: Math.max(0, subtotal - discountVal),
        handledBy: handler, status: currentRole === 'kasir' ? 'Cooking' : 'Pending',
        timestamp: new Date().toLocaleString('id-ID')
    };

    closeCartModal();
    openPaymentModal(pendingCheckoutOrder);
}

function openPaymentModal(order) {
    document.getElementById('qris-amount-display').innerText = `Rp ${order.grandTotal.toLocaleString('id-ID')}`;
    
    const qrisUrl = store.theme.qrisUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PAY_${order.id}`;
    document.getElementById('qris-img-display').src = qrisUrl;
    document.getElementById('btn-download-qris').href = qrisUrl;

    document.getElementById('rec-id').innerText = `#${order.id}`;
    document.getElementById('rec-name').innerText = order.customer;
    document.getElementById('rec-phone').innerText = order.phone;
    document.getElementById('rec-total').innerText = `Rp ${order.grandTotal.toLocaleString('id-ID')}`;

    document.getElementById('rec-items-list').innerHTML = order.items.map(i => `
        <div class="flex justify-between text-[11px] text-slate-700">
            <span>${i.qty}x ${i.name} (${i.options || 'Normal'})</span>
            <span>Rp ${(i.price * i.qty).toLocaleString('id-ID')}</span>
        </div>
    `).join('');

    let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
    if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);

    let msgResto = `*NOTA MASUK MAINSTAY DRINK SHOP*%0A%0A*ID:* #${order.id}%0A*Pemesan:* ${order.customer}%0A*WA Customer:* ${order.phone}%0A*Total:* Rp ${order.grandTotal.toLocaleString('id-ID')}%0A_Mohon diproses, terima kasih!_`;
    document.getElementById('btn-wa-resto').href = `https://wa.me/${waResto}?text=${msgResto}`;

    let waCust = order.phone.replace(/[^0-9]/g, '');
    if (waCust.startsWith('0')) waCust = '62' + waCust.substring(1);

    let msgCust = `*MAINSTAY DRINK SHOP - MINUMAN ANDALANMU*%0A%0A*Terima Kasih Kak ${order.customer}!*%0APesanan Kakak #${order.id} Senilai *Rp ${order.grandTotal.toLocaleString('id-ID')}* telah berhasil dibuat.`;
    document.getElementById('btn-wa-customer').href = `https://wa.me/${waCust}?text=${msgCust}`;

    document.getElementById('qris-view').classList.remove('hidden');
    document.getElementById('receipt-view').classList.add('hidden');
    document.getElementById('modal-payment').classList.remove('hidden');
}

function confirmPaymentAndReceipt() {
    if (pendingCheckoutOrder) {
        store.orders.unshift(pendingCheckoutOrder);
        saveStore('orders');
        
        // Auto Hitung Stempel berdasarkan Minimum Belanja
        if (pendingCheckoutOrder.grandTotal >= store.stampMinSpend) {
            const cleanPhone = pendingCheckoutOrder.phone.replace(/[^0-9]/g, '');
            const earnedStamps = Math.floor(pendingCheckoutOrder.grandTotal / store.stampMinSpend);
            
            if (!store.customStamps[cleanPhone]) store.customStamps[cleanPhone] = 0;
            store.customStamps[cleanPhone] += earnedStamps;
            saveStore('customStamps');
            
            showToast(`+${earnedStamps} Stempel Member Ditambahkan!`);
        }

        // Notifikasi Suara Vokal Masuk
        speakOrderNotification(`Pesanan Baru Masuk dari ${pendingCheckoutOrder.customer}`);

        // Sync ke Google Sheets Webhook
        if (store.theme.sheetWebhookUrl) {
            fetch(store.theme.sheetWebhookUrl, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pendingCheckoutOrder)
            }).catch(e => console.log('Sheets Sync Error'));
        }

        let waResto = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
        if (waResto.startsWith('0')) waResto = '62' + waResto.substring(1);
        let msgResto = `*NOTA MASUK MAINSTAY DRINK SHOP*%0A%0A*ID:* #${pendingCheckoutOrder.id}%0A*Pemesan:* ${pendingCheckoutOrder.customer}%0A*WA Customer:* ${pendingCheckoutOrder.phone}%0A*Total:* Rp ${pendingCheckoutOrder.grandTotal.toLocaleString('id-ID')}%0A_Mohon diproses, terima kasih!_`;
        
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
