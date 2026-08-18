// KASIR & OWNER DASHBOARD ENGINE WITH EDIT STAMPS, REWARD CHOICE, FLASH SALE & STANDALONE SVG BARCODE STANDEE

/* ===================================================
   KASIR MODE LOGIC
   =================================================== */
function setKasirSubTab(tab) {
    if (tab === 'pos') {
        document.getElementById('kasir-pos-content').classList.remove('hidden');
        document.getElementById('kasir-kitchen-content').classList.add('hidden');
        document.getElementById('btn-kasir-pos').className = "flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-amberbrand-400 shadow-sm text-center";
        document.getElementById('btn-kasir-kitchen').className = "flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 text-center";
    } else {
        document.getElementById('kasir-pos-content').classList.add('hidden');
        document.getElementById('kasir-kitchen-content').classList.remove('hidden');
        document.getElementById('btn-kasir-pos').className = "flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 text-center";
        document.getElementById('btn-kasir-kitchen').className = "flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-amberbrand-400 shadow-sm text-center";
        renderKasirPipeline();
    }
}

function renderKasirMenu() {
    const keyword = document.getElementById('kasir-search').value.toLowerCase();
    const filtered = store.menu.filter(m => m.name.toLowerCase().includes(keyword));
    const container = document.getElementById('kasir-menu-grid');

    if (kasirLayout === 'grid') {
        container.className = "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4";
        container.innerHTML = filtered.map(item => `
            <div class="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200 shadow-sm flex justify-between items-center text-xs">
                <div class="min-w-0 pr-1">
                    <p class="font-bold text-slate-900 truncate">${item.name}</p>
                    <p class="text-amberbrand-700 font-extrabold mt-0.5">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <button type="button" onclick="openOptionModal(${item.id})" class="px-2.5 py-1.5 bg-slate-900 text-amberbrand-400 rounded-xl font-bold hover:bg-slate-800 transition shrink-0">+ Tambah</button>
            </div>
        `).join('');
    } else {
        container.className = "space-y-2";
        container.innerHTML = filtered.map(item => `
            <div class="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between text-xs gap-2">
                <div class="min-w-0">
                    <p class="font-bold text-slate-900 truncate">${item.name} <span class="text-[9px] bg-amber-100 text-amberbrand-900 px-1.5 py-0.5 rounded font-bold">${item.category}</span></p>
                    <p class="text-amberbrand-700 font-extrabold mt-0.5">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <button type="button" onclick="openOptionModal(${item.id})" class="px-3 py-1.5 bg-slate-900 text-amberbrand-400 rounded-xl font-bold hover:bg-slate-800 transition shrink-0">+ Tambah</button>
            </div>
        `).join('');
    }
}

function renderKasirPipeline() {
    updatePendingBadge();
    const pending = store.orders.filter(o => o.status === 'Pending');
    const cooking = store.orders.filter(o => o.status === 'Cooking');
    const completed = store.orders.filter(o => o.status === 'Completed');

    document.getElementById('cnt-pending').innerText = pending.length;
    document.getElementById('cnt-cooking').innerText = cooking.length;
    document.getElementById('cnt-completed').innerText = completed.length;

    const card = (o, next, btn) => `
        <div class="bg-white p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2 shadow-sm">
            <div class="flex justify-between items-center border-b border-amber-100 pb-2">
                <span class="font-bold text-slate-900">#${o.id} - ${o.customer}</span>
                <span class="text-[10px] text-slate-400">${o.timestamp.split(',')[1] || ''}</span>
            </div>
            <div class="space-y-1 text-slate-600">
                ${o.items.map(i => `<div class="flex justify-between"><span>${i.qty}x ${i.name} (${i.options||'Normal'})</span><span>Rp ${(i.price*i.qty).toLocaleString('id-ID')}</span></div>`).join('')}
            </div>
            <div class="pt-2 border-t border-amber-100 flex justify-between items-center font-bold">
                <span class="text-amberbrand-700">Rp ${o.grandTotal.toLocaleString('id-ID')}</span>
                ${next ? `<button type="button" onclick="updateOrderStatus('${o.id}', '${next}')" class="px-3 py-1 bg-slate-900 text-amberbrand-400 rounded-xl text-[10px] hover:bg-slate-800">${btn}</button>` : '<span class="text-emerald-600 text-[10px]">Lunas</span>'}
            </div>
        </div>
    `;

    document.getElementById('list-pending').innerHTML = pending.map(o => card(o, 'Cooking', 'Proses Buat')).join('');
    document.getElementById('list-cooking').innerHTML = cardCooking(cooking);
    document.getElementById('list-completed').innerHTML = completed.map(o => card(o, null, '')).join('');
}

function cardCooking(cookingOrders) {
    return cookingOrders.map(o => `
        <div class="bg-white p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2 shadow-sm">
            <div class="flex justify-between items-center border-b border-amber-100 pb-2">
                <span class="font-bold text-slate-900">#${o.id} - ${o.customer}</span>
                <span class="text-[10px] text-slate-400">${o.timestamp.split(',')[1] || ''}</span>
            </div>
            <div class="space-y-1 text-slate-600">
                ${o.items.map(i => `<div class="flex justify-between"><span>${i.qty}x ${i.name} (${i.options||'Normal'})</span><span>Rp ${(i.price*i.qty).toLocaleString('id-ID')}</span></div>`).join('')}
            </div>
            <div class="pt-2 border-t border-amber-100 flex justify-between items-center font-bold">
                <span class="text-amberbrand-700">Rp ${o.grandTotal.toLocaleString('id-ID')}</span>
                <button type="button" onclick="updateOrderStatus('${o.id}', 'Completed')" class="px-3 py-1 bg-slate-900 text-amberbrand-400 rounded-xl text-[10px] hover:bg-slate-800">Selesaikan</button>
            </div>
        </div>
    `).join('');
}

function updateOrderStatus(id, status) {
    const ord = store.orders.find(o => o.id === id);
    if (ord) { ord.status = status; saveStore('orders'); renderKasirPipeline(); }
}

function updatePendingBadge() {
    const count = store.orders.filter(o => o.status === 'Pending').length;
    const badge = document.getElementById('badge-pending-orders');
    if (count > 0) { badge.innerText = count; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
}

async function connectBluetoothPrinter() {
    if (!navigator.bluetooth) return showToast("Browser tidak mendukung Bluetooth API", true);
    try {
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });
        showToast(`Terhubung ke: ${bluetoothDevice.name || 'Printer'}`);
    } catch (err) { showToast("Gagal konek Bluetooth", true); }
}

function printReceipt() { window.print(); }

/* ===================================================
   STANDALONE BARCODE / QR STANDEE GENERATOR (FIXED ERROR)
   =================================================== */
function printQrStandee() {
    const currentUrl = window.location.href;
    const printWin = window.open('', '_blank');
    
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak QR Meja - ${store.theme.restoName}</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; background-color: #fcfbf7; }
                .standee-card { border: 4px solid #f59e0b; padding: 35px 25px; border-radius: 28px; max-width: 360px; margin: auto; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
                .resto-title { font-size: 24px; font-weight: 900; color: #111827; margin: 0; text-transform: uppercase; }
                .resto-subtitle { color: #d97706; font-weight: 800; font-size: 13px; margin-top: 6px; letter-spacing: 1px; }
                #qrcode-box { margin: 25px auto; display: inline-block; padding: 15px; background: white; border: 2px border-style #f59e0b; border-radius: 16px; }
                .instruction { font-size: 13px; font-weight: 700; color: #374151; margin-top: 10px; }
                .table-tag { display: inline-block; margin-top: 15px; padding: 6px 16px; background-color: #fef3c7; color: #b45309; font-weight: 800; border-radius: 12px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="standee-card">
                <h2 class="resto-title">${store.theme.restoName}</h2>
                <div class="resto-subtitle">MINUMAN ANDALANMU • SELF ORDER</div>
                
                <div id="qrcode-box"></div>
                
                <div class="instruction">Scan Kode QR Ini Untuk Langsung Pesan Dari Meja Anda</div>
                <div class="table-tag">SILAHKAN DUDUK & PESAN</div>
            </div>

            <script>
                new QRCode(document.getElementById("qrcode-box"), {
                    text: "${currentUrl}",
                    width: 220,
                    height: 220,
                    colorDark : "#111827",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });

                setTimeout(() => {
                    window.print();
                    window.close();
                }, 700);
            <\/script>
        </body>
        </html>
    `);
    printWin.document.close();
}


/* ===================================================
   OWNER DASHBOARD LOGIC
   =================================================== */
function setOwnerTab(tab) {
    ['branding', 'categories', 'inventory', 'flashsale', 'stamps', 'integrations', 'backup'].forEach(t => {
        document.getElementById(`owner-content-${t}`).classList.add('hidden');
        document.getElementById(`tab-owner-${t}`).className = "flex-1 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 whitespace-nowrap";
    });
    document.getElementById(`owner-content-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-owner-${tab}`).className = "flex-1 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amberbrand-900 whitespace-nowrap";

    if (tab === 'stamps') renderOwnerMemberStamps();
    if (tab === 'flashsale') renderFlashSaleTab();
}

function saveBrandingConfig() {
    store.theme.restoName = document.getElementById('cfg-name').value.trim() || DEFAULT_THEME.restoName;
    store.theme.restoPhone = document.getElementById('cfg-phone').value.trim() || DEFAULT_THEME.restoPhone;
    store.theme.logoUrl = document.getElementById('cfg-logo').value.trim();
    store.theme.qrisUrl = document.getElementById('cfg-qris').value.trim();
    store.theme.appIconUrl = document.getElementById('cfg-app-icon').value.trim() || DEFAULT_THEME.appIconUrl;
    saveStore('theme'); applyBrandingUI(); showToast("Toko & Favicon Diperbarui!");
}

function saveSheetWebhook() {
    store.theme.sheetWebhookUrl = document.getElementById('cfg-sheet-url').value.trim();
    saveStore('theme'); showToast("Webhook Saved!");
}

/* ===================================================
   EDIT STEMPEL, MIN SPEND & PRODUCT REWARD
   =================================================== */
function renderOwnerMemberStamps() {
    // Fill Config Fields
    document.getElementById('stamp-min-spend').value = store.stampMinSpend || 20000;
    
    // Fill Reward Dropdown Select
    const rewardSelect = document.getElementById('stamp-reward-item-select');
    if (rewardSelect) {
        rewardSelect.innerHTML = store.menu.map(m => `
            <option value="${m.id}" ${m.id === store.stampRewardItemId ? 'selected' : ''}>${m.name} (Rp ${m.price.toLocaleString('id-ID')})</option>
        `).join('');
    }

    // Render Member Stamp List per No WA
    const memberSummary = {};

    // 1. Accumulate completed orders
    store.orders.forEach(order => {
        if (!order.phone) return;
        const cleanPhone = order.phone.replace(/[^0-9]/g, '');
        if (!memberSummary[cleanPhone]) {
            memberSummary[cleanPhone] = {
                name: order.customer,
                phone: cleanPhone,
                totalOrders: 0,
                autoStamps: 0
            };
        }
        if (order.status === 'Completed' && order.grandTotal >= store.stampMinSpend) {
            const earned = Math.floor(order.grandTotal / store.stampMinSpend);
            memberSummary[cleanPhone].totalOrders += 1;
            memberSummary[cleanPhone].autoStamps += earned;
        }
    });

    // 2. Include custom stamps override
    Object.keys(store.customStamps).forEach(phone => {
        if (!memberSummary[phone]) {
            memberSummary[phone] = {
                name: "Member " + phone,
                phone: phone,
                totalOrders: 0,
                autoStamps: 0
            };
        }
    });

    const listContainer = document.getElementById('owner-stamps-list');
    const members = Object.values(memberSummary);

    if (members.length === 0) {
        listContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada transaksi member yang tercatat.</p>`;
        return;
    }

    listContainer.innerHTML = members.map(m => {
        const currentCustom = store.customStamps[m.phone];
        const effectiveStamps = (currentCustom !== undefined) ? currentCustom : m.autoStamps;
        const rewardCount = Math.floor(effectiveStamps / 5);
        const stampRemainder = effectiveStamps % 5;

        return `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs gap-2">
                <div>
                    <p class="font-bold text-slate-900">${m.name} <span class="text-slate-500 font-normal">(${m.phone})</span></p>
                    <p class="text-[10px] text-slate-500 mt-0.5">Total Belanja Lunas: ${m.totalOrders}x | Hak Gratis Minuman: <strong class="text-emerald-600">${rewardCount}x</strong></p>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <span class="px-2.5 py-1 bg-amberbrand-500 text-slate-950 rounded-xl font-extrabold text-[11px] shadow-sm">
                        🎟️ ${stampRemainder}/5 (${effectiveStamps} Total)
                    </span>
                    <button type="button" onclick="editStampForMember('${m.phone}', ${effectiveStamps})" class="px-2.5 py-1 bg-slate-900 text-amberbrand-400 font-bold rounded-xl text-[10px] hover:bg-slate-800">
                        <i class="fa-solid fa-pen-to-square mr-1"></i> Edit Stempel
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function saveStampRules() {
    const minSpend = parseInt(document.getElementById('stamp-min-spend').value);
    const rewardItemId = parseInt(document.getElementById('stamp-reward-item-select').value);

    if (!isNaN(minSpend) && minSpend > 0) {
        store.stampMinSpend = minSpend;
        localStorage.setItem('app_stamp_min_spend', minSpend);
    }

    if (rewardItemId) {
        store.stampRewardItemId = rewardItemId;
        localStorage.setItem('app_stamp_reward_item_id', rewardItemId);
    }

    updateStampRuleDescription();
    showToast("Aturan Stempel & Reward Berhasil Disimpan!");
}

function editStampForMember(phone, currentStamps) {
    const newCountStr = prompt(`Edit total jumlah stempel untuk No WA (${phone}):`, currentStamps);
    if (newCountStr !== null) {
        const newCount = parseInt(newCountStr);
        if (!isNaN(newCount) && newCount >= 0) {
            store.customStamps[phone] = newCount;
            saveStore('customStamps');
            renderOwnerMemberStamps();
            showToast(`Stempel untuk ${phone} diperbarui menjadi ${newCount}!`);
        } else {
            showToast("Jumlah stempel tidak valid!", true);
        }
    }
}

/* ===================================================
   FLASH SALE MANAGEMENT LOGIC
   =================================================== */
function renderFlashSaleTab() {
    const selectEl = document.getElementById('flash-sale-item-select');
    if (selectEl) {
        selectEl.innerHTML = store.menu.map(m => `
            <option value="${m.id}" ${store.flashSaleItem && store.flashSaleItem.itemId === m.id ? 'selected' : ''}>${m.name} (Harga Normal: Rp ${m.price.toLocaleString('id-ID')})</option>
        `).join('');
    }

    const statusEl = document.getElementById('flash-sale-active-status');
    if (statusEl) {
        if (store.flashSaleItem) {
            const item = store.menu.find(m => m.id === store.flashSaleItem.itemId);
            const itemName = item ? item.name : "Produk";
            statusEl.innerHTML = `
                <p class="font-bold text-rose-600">🔥 FLASH SALE AKTIF</p>
                <p class="text-xs text-slate-800 mt-1">Item: <strong>${itemName}</strong></p>
                <p class="text-xs text-slate-800">Harga Promo: <strong>Rp ${store.flashSaleItem.flashPrice.toLocaleString('id-ID')}</strong></p>
            `;
        } else {
            statusEl.innerText = "Belum ada item Flash Sale diset.";
        }
    }
}

function saveFlashSaleConfig() {
    const itemId = parseInt(document.getElementById('flash-sale-item-select').value);
    const flashPrice = parseInt(document.getElementById('flash-sale-price-input').value);

    if (isNaN(flashPrice) || flashPrice <= 0) return showToast("Isi harga diskon Flash Sale!", true);

    store.flashSaleItem = { itemId, flashPrice };
    localStorage.setItem('app_flash_sale_item', JSON.stringify(store.flashSaleItem));
    
    renderFlashSaleTab();
    renderCustomerMenu();
    showToast("Item Flash Sale Berhasil Diaktifkan!");
}

function disableFlashSale() {
    store.flashSaleItem = null;
    localStorage.removeItem('app_flash_sale_item');
    renderFlashSaleTab();
    renderCustomerMenu();
    showToast("Flash Sale Dimatikan");
}

/* ===================================================
   CHART & OTHER OWNER INVENTORY HELPERS
   =================================================== */
let salesChartInstance = null;
function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            datasets: [{
                label: 'Omset Harian (Rp)',
                data: [120000, 150000, 180000, 210000, 350000, 480000, 520000],
                borderColor: '#d97706',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function addCategory() {
    const name = document.getElementById('cat-new-name').value.trim();
    if (name && !store.categories.includes(name)) {
        store.categories.push(name);
        saveStore('categories');
        document.getElementById('cat-new-name').value = '';
        renderOwnerCategories();
        showToast("Kategori Berhasil Ditambah!");
    }
}

function removeCategory(idx) {
    store.categories.splice(idx, 1);
    saveStore('categories');
    renderOwnerCategories();
    showToast("Kategori Dihapus!");
}

function renderOwnerCategories() {
    document.getElementById('owner-categories-list').innerHTML = store.categories.map((c, idx) => `
        <div class="flex justify-between items-center p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs">
            <span class="font-bold text-slate-900">${c}</span>
            <button type="button" onclick="removeCategory(${idx})" class="text-rose-600 font-bold">Hapus</button>
        </div>
    `).join('');

    const catSelect = document.getElementById('menu-category');
    if (catSelect) catSelect.innerHTML = store.categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function submitMenuItem() {
    const name = document.getElementById('menu-name').value.trim();
    const price = parseInt(document.getElementById('menu-price').value);
    if (!name || isNaN(price)) return showToast("Isi nama & harga!", true);

    store.menu.push({
        id: Date.now(), name, price,
        category: document.getElementById('menu-category').value,
        desc: document.getElementById('menu-desc').value.trim(),
        image: document.getElementById('menu-img').value.trim()
    });
    saveStore('menu'); renderOwnerInventory(); showToast("Menu Ditambahkan!");
}

function renderOwnerInventory() {
    document.getElementById('owner-inventory-grid').innerHTML = store.menu.map((m, idx) => `
        <div class="flex items-center justify-between p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs gap-3">
            <img src="${m.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=100&q=80'}" class="w-10 h-10 rounded-xl object-cover shrink-0">
            <div class="flex-1 min-w-0">
                <p class="font-bold text-slate-900 truncate">${m.name} <span class="text-[10px] bg-amber-100 text-amberbrand-900 px-1.5 py-0.5 rounded ml-1">${m.category}</span></p>
                <p class="text-amberbrand-700 font-extrabold">Rp ${m.price.toLocaleString('id-ID')}</p>
            </div>
            <button type="button" onclick="store.menu.splice(${idx},1); saveStore('menu'); renderOwnerInventory();" class="text-rose-600 font-bold shrink-0">Hapus</button>
        </div>
    `).join('');
}

function updateOwnerStats() {
    document.getElementById('stat-revenue').innerText = `Rp ${store.orders.reduce((s, o) => s + o.grandTotal, 0).toLocaleString('id-ID')}`;
    document.getElementById('stat-orders-count').innerText = `${store.orders.length} Order`;
    document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;
}

function openAttendanceModal() {
    document.getElementById('att-staff-select').innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    tempAttPhoto = '';
    document.getElementById('modal-attendance').classList.remove('hidden');
}

function closeAttendanceModal() { document.getElementById('modal-attendance').classList.add('hidden'); }

function previewAttPhoto(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            tempAttPhoto = ev.target.result;
            document.getElementById('att-preview-img').src = tempAttPhoto;
            document.getElementById('att-preview-box').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function submitAttendance() {
    const staff = document.getElementById('att-staff-select').value;
    const pin = document.getElementById('att-pin-input').value;
    if (!store.staff.find(s => s.name === staff && s.pin === pin)) return showToast("PIN Staf Salah!", true);

    store.attendance.unshift({ staffName: staff, type: document.getElementById('att-type-select').value === 'IN' ? 'Masuk Shift' : 'Pulang Shift', timestamp: new Date().toLocaleString('id-ID'), photo: tempAttPhoto });
    saveStore('attendance'); closeAttendanceModal(); showToast("Absen Tersimpan!");
}

function downloadJSONBackup() {
    const dl = document.createElement('a');
    dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store)));
    dl.setAttribute("download", "database_mainstay_drinkshop.json"); dl.click();
}

function restoreJSONBackup(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                store = JSON.parse(ev.target.result);
                ['theme','categories','menu','staff','discounts','orders','attendance','customStamps'].forEach(k => saveStore(k));
                applyBrandingUI(); showToast("Database Pulih!");
            } catch(err) { showToast("File Salah!", true); }
        };
        reader.readAsText(file);
    }
}
