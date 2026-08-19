// CUSTOMER CATALOG & FILTER ENGINE
function renderCustomerCategories() {
    const box = document.getElementById('cust-categories');
    if (!box) return;

    let html = `<button type="button" onclick="filterCustomerCategory('Semua')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${currentCategory === 'Semua' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'bg-slate-100 text-slate-600'}">Semua Menu</button>`;
    
    store.categories.forEach(cat => {
        html += `<button type="button" onclick="filterCustomerCategory('${cat}')" class="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${currentCategory === cat ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'bg-slate-100 text-slate-600'}">${cat}</button>`;
    });

    box.innerHTML = html;
}

function filterCustomerCategory(cat) {
    currentCategory = cat;
    renderCustomerCategories();
    renderCustomerMenu();
}

function renderCustomerMenu() {
    const grid = document.getElementById('cust-menu-grid');
    if (!grid) return;

    const query = (document.getElementById('cust-search')?.value || '').toLowerCase();
    const filtered = store.menu.filter(m => {
        const matchesCategory = currentCategory === 'Semua' || m.category === currentCategory;
        const matchesSearch = m.name.toLowerCase().includes(query) || (m.desc && m.desc.toLowerCase().includes(query));
        return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.className = "col-span-full py-12 text-center text-slate-400 space-y-2";
        grid.innerHTML = `<i class="fa-solid fa-mug-hot text-3xl"></i><p class="text-xs font-bold">Menu tidak ditemukan.</p>`;
        return;
    }

    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-3";
    grid.innerHTML = '';

    filtered.forEach(m => {
        const fallbackImg = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80";
        const imgUrl = m.image && m.image.trim() !== '' ? m.image : fallbackImg;

        grid.innerHTML += `
            <div class="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-amber-400 transition-all">
                <div class="space-y-2">
                    <div class="w-full h-28 rounded-xl overflow-hidden bg-slate-100">
                        <img src="${imgUrl}" alt="${m.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    </div>
                    <div>
                        <span class="text-[9px] font-extrabold text-slate-400 uppercase">${m.category}</span>
                        <h4 class="font-extrabold text-xs text-slate-900 line-clamp-1">${m.name}</h4>
                        <p class="text-[10px] text-slate-500 line-clamp-2 mt-0.5">${m.desc || ''}</p>
                    </div>
                </div>
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between mt-2">
                    <p class="font-black text-xs text-slate-900">Rp ${m.price.toLocaleString('id-ID')}</p>
                    <button type="button" onclick="openOptionModal(${m.id})" class="btn-press px-2.5 py-1.5 bg-slate-900 text-amber-400 font-extrabold text-xs rounded-xl shadow">
                        + Tambah
                    </button>
                </div>
            </div>
        `;
    });
}

// LOGIKA MEMBER VIP
function openJoinMemberModal() {
    document.getElementById('mb-name-input').value = '';
    document.getElementById('mb-phone-input').value = '';
    document.getElementById('mb-consent-check').checked = true;
    document.getElementById('modal-join-member')?.classList.remove('hidden');
}

function closeJoinMemberModal() {
    document.getElementById('modal-join-member')?.classList.add('hidden');
}

function submitJoinMember(btn) {
    const nameInput = document.getElementById('mb-name-input');
    const phoneInput = document.getElementById('mb-phone-input');
    const consentCheck = document.getElementById('mb-consent-check');

    if (!nameInput || !phoneInput) return;

    const name = nameInput.value.trim();
    let phone = phoneInput.value.replace(/[^0-9]/g, '');

    if (!name || !phone) {
        showToast("Mohon isi Nama Lengkap & Nomor WhatsApp!", true);
        return;
    }

    if (!consentCheck || !consentCheck.checked) {
        showToast("Mohon centang persetujuan untuk bergabung!", true);
        return;
    }

    if (phone.startsWith('0')) phone = '62' + phone.substring(1);

    const memberData = {
        name: name,
        phone: phone,
        joinedAt: getFormattedRealTime()
    };

    triggerButtonLoading(btn, () => {
        db.ref('members').child(phone).set(memberData).then(() => {
            closeJoinMemberModal();
            showToast(`Selamat Kak ${name}, Anda terdaftar sebagai Member VIP!`);

            if (document.getElementById('cust-name-input')) document.getElementById('cust-name-input').value = name;
            if (document.getElementById('cust-phone-input')) document.getElementById('cust-phone-input').value = phone;

            const targetWaLink = store.theme.broadcastWaLink && store.theme.broadcastWaLink.trim() !== '' 
                ? store.theme.broadcastWaLink 
                : `https://wa.me/${(store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Halo Admin, saya ' + name + ' (' + phone + ') mendaftar Member VIP!')}`;
            
            window.open(targetWaLink, '_blank');
        }).catch(() => {
            showToast("Gagal menyimpan data member. Cek koneksi!", true);
        });
    });
}

// KUSTOMISASI VARIAN MINUMAN & KERANJANG
let activeOptionItem = null;
let selectedIce = 'Normal Ice';
let selectedSugar = '100% Sugar';

function openOptionModal(id) {
    const item = store.menu.find(m => m.id === id);
    if (!item) return;
    activeOptionItem = item;
    selectedIce = 'Normal Ice';
    selectedSugar = '100% Sugar';

    document.getElementById('opt-item-name').innerText = `Kustomisasi: ${item.name}`;
    document.getElementById('box-opt-ice').style.display = item.optIce ? 'block' : 'none';
    document.getElementById('box-opt-sugar').style.display = item.optSugar ? 'block' : 'none';

    selectIce('Normal Ice');
    selectSugar('100% Sugar');

    document.getElementById('modal-item-options')?.classList.remove('hidden');
}

function closeOptionModal() {
    document.getElementById('modal-item-options')?.classList.add('hidden');
}

function selectIce(val) {
    selectedIce = val;
    ['Normal Ice', 'Less Ice', 'No Ice'].forEach(i => {
        const btn = document.getElementById(`opt-ice-${i.split(' ')[0].toLowerCase()}`);
        if (btn) btn.className = i === val ? "opt-btn-ice py-1.5 active-border font-bold rounded-xl" : "opt-btn-ice py-1.5 bg-slate-50 border rounded-xl";
    });
}

function selectSugar(val) {
    selectedSugar = val;
    const key = val.startsWith('100') ? '100' : (val.startsWith('50') ? '50' : '0');
    ['100', '50', '0'].forEach(s => {
        const btn = document.getElementById(`opt-sugar-${s}`);
        if (btn) btn.className = s === key ? "opt-btn-sugar py-1.5 active-border font-bold rounded-xl" : "opt-btn-sugar py-1.5 bg-slate-50 border rounded-xl";
    });
}

function confirmAddToCartWithOptions() {
    if (!activeOptionItem) return;

    let optionsList = [];
    if (activeOptionItem.optIce) optionsList.push(selectedIce);
    if (activeOptionItem.optSugar) optionsList.push(selectedSugar);

    cart.push({
        id: activeOptionItem.id,
        name: activeOptionItem.name,
        price: activeOptionItem.price,
        options: optionsList.join(', ')
    });

    closeOptionModal();
    updateCartFloatingBar();
    showToast(`${activeOptionItem.name} masuk keranjang!`);
}

function updateCartFloatingBar() {
    const bar = document.getElementById('floating-cart');
    const cntEl = document.getElementById('cart-item-count');
    const totEl = document.getElementById('cart-total-price');

    if (!bar) return;

    if (cart.length > 0) {
        const total = cart.reduce((a, b) => a + b.price, 0);
        cntEl.innerText = `${cart.length} Item Minuman`;
        totEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
        bar.classList.remove('translate-y-32');
    } else {
        bar.classList.add('translate-y-32');
    }
}

function openCartModal() {
    renderCartList();
    document.getElementById('modal-cart')?.classList.remove('hidden');
}

function closeCartModal() {
    document.getElementById('modal-cart')?.classList.add('hidden');
}

function renderCartList() {
    const box = document.getElementById('cart-items-list');
    if (!box) return;

    if (cart.length === 0) {
        box.innerHTML = `<div class="py-6 text-center text-slate-400 font-bold">Keranjang masih kosong.</div>`;
        document.getElementById('summary-grandtotal').innerText = 'Rp 0';
        return;
    }

    let html = '';
    let grandTotal = 0;

    cart.forEach((item, idx) => {
        grandTotal += item.price;
        html += `
            <div class="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                    <h5 class="font-extrabold text-xs text-slate-900">${item.name}</h5>
                    <p class="text-[10px] text-amber-700 font-medium">${item.options || 'Normal'}</p>
                    <p class="font-black text-xs text-slate-900 mt-0.5">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <button type="button" onclick="removeFromCart(${idx})" class="text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });

    box.innerHTML = html;
    document.getElementById('summary-grandtotal').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCartList();
    updateCartFloatingBar();
}

function setOrderType(type) {
    selectedOrderType = type;
    const nowBtn = document.getElementById('btn-order-now');
    const poBtn = document.getElementById('btn-order-po');
    const scheduleBox = document.getElementById('box-preorder-schedule');

    if (type === 'now') {
        nowBtn.className = "py-2 rounded-xl font-bold active-border shadow";
        poBtn.className = "py-2 rounded-xl font-bold border bg-white";
        scheduleBox.classList.add('hidden');
    } else {
        poBtn.className = "py-2 rounded-xl font-bold active-border shadow";
        nowBtn.className = "py-2 rounded-xl font-bold border bg-white";
        scheduleBox.classList.remove('hidden');
    }
}

function setPayMethod(method) {
    selectedPayMethod = method;
    const qrisBtn = document.getElementById('btn-pay-qris');
    const cashBtn = document.getElementById('btn-pay-cash');

    if (method === 'qris') {
        qrisBtn.className = "py-2 rounded-xl font-bold active-border shadow";
        cashBtn.className = "py-2 rounded-xl font-bold border bg-white";
    } else {
        cashBtn.className = "py-2 rounded-xl font-bold active-border shadow";
        qrisBtn.className = "py-2 rounded-xl font-bold border bg-white";
    }
}

// CHECKOUT & DIREKTORI WHATSAPP
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

    const subtotal = cart.reduce((a, b) => a + b.price, 0);
    const orderId = '#ORD-' + Date.now().toString().slice(-4);
    const timestampStr = getFormattedRealTime();

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
        timestamp: timestampStr
    };

    triggerButtonLoading(btn, () => {
        db.ref('orders').push(orderData).then(() => {
            closeCartModal();
            executeDirectWhatsappMessage(orderData);
            cart = [];
            updateCartFloatingBar();
            nameInput.value = '';
            phoneInput.value = '';
            showToast("Pesanan terkirim ke Kasir & WA!");
        }).catch(() => {
            showToast("Gagal mengirim pesanan!", true);
        });
    });
}

function executeDirectWhatsappMessage(order) {
    const cleanPhone = (store.theme.restoPhone || "6281234567890").replace(/[^0-9]/g, '');
    let itemDetails = order.items.map(i => `• ${i.name} (${i.options || 'Normal'}) - Rp ${i.price.toLocaleString('id-ID')}`).join('\n');

    let msg = `*🍹 ${store.theme.restoName.toUpperCase()}*\n`;
    msg += `----------------------------------------\n`;
    msg += `*KODE ORDER:* ${order.id}\n`;
    msg += `*Waktu Order:* ${order.timestamp}\n\n`;
    msg += `*DATA PEMESAN:*\n`;
    msg += `• Nama: ${order.name}\n`;
    msg += `• No. WA: ${order.phone}\n`;
    msg += `• Tipe Order: ${order.schedule}\n`;
    msg += `• Metode Bayar: ${order.payMethod.toUpperCase()}\n\n`;
    msg += `*RINCIAN MINUMAN:*\n${itemDetails}\n`;
    msg += `----------------------------------------\n`;
    msg += `*TOTAL BAYAR:* Rp ${order.total.toLocaleString('id-ID')}\n`;
    msg += `----------------------------------------\n\n`;

    if (order.payMethod === 'qris') {
        msg += `📌 *INSTRUKSI PEMBAYARAN QRIS:*\n`;
        msg += `Mohon sertakan *Bukti Transfer / Screenshot Pembayaran QRIS* di bawah pesan ini agar pesanan dapat langsung diproses oleh Kasir.\n\n`;
    } else {
        msg += `📌 *INSTRUKSI PEMBAYARAN CASH:*\n`;
        msg += `Pembayaran dilakukan langsung di Kasir Toko saat pengambilan pesanan.\n\n`;
    }

    msg += `Terima kasih atas pesanan Anda!`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}
