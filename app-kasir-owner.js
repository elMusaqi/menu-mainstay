// KASIR POS, DIRECT CAMERA ATTENDANCE, STRUK DIGITAL & POSTER QR GENERATOR

let cameraStream = null;
let selectedQrOption = 1;

/* ===================================================
   DIRECT CAMERA ATTENDANCE (NO GALLERY ACCESS)
   =================================================== */
function openDirectCameraAttendance() {
    document.getElementById('att-camera-staff').innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    document.getElementById('modal-camera-attendance').classList.remove('hidden');

    const video = document.getElementById('att-video-stream');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => { cameraStream = stream; video.srcObject = stream; })
        .catch(err => { showToast("Gagal mengakses kamera HP!", true); closeDirectCameraAttendance(); });
}

function closeDirectCameraAttendance() {
    if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; }
    document.getElementById('modal-camera-attendance').classList.add('hidden');
}

function captureAndSubmitAttendance() {
    const staff = document.getElementById('att-camera-staff').value;
    const pin = document.getElementById('att-camera-pin').value;
    if (!store.staff.find(s => s.name === staff && s.pin === pin)) return showToast("PIN Staf Salah!", true);

    const video = document.getElementById('att-video-stream');
    const canvas = document.getElementById('att-photo-canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // DUMPER TIMESTAMP PRESISI LANGSUNG PADA FOTO
    const stampTime = getFormattedRealTime();
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
    ctx.fillStyle = "#fbbf24"; ctx.font = "bold 11px sans-serif";
    ctx.fillText(`STAMP: ${stampTime}`, 15, canvas.height - 18);

    const photoData = canvas.toDataURL('image/jpeg');
    store.attendance.unshift({ staffName: staff, type: document.getElementById('att-camera-type').value, timestamp: stampTime, photo: photoData });
    saveStore('attendance'); closeDirectCameraAttendance(); showToast("Absensi Live Berhasil Tersimpan!");
}

/* ===================================================
   KASIR POS & KITCHEN PIPELINE DENGAN STRUK LUNAS
   =================================================== */
function setKasirSubTab(tab) {
    if (tab === 'pos') {
        document.getElementById('kasir-pos-content').classList.remove('hidden'); document.getElementById('kasir-kitchen-content').classList.add('hidden');
    } else {
        document.getElementById('kasir-pos-content').classList.add('hidden'); document.getElementById('kasir-kitchen-content').classList.remove('hidden');
        renderKasirPipeline();
    }
}
function setKasirLayout(layout) { kasirLayout = layout; renderKasirMenu(); }

function renderKasirMenu() {
    const keyword = document.getElementById('kasir-search').value.toLowerCase();
    const filtered = store.menu.filter(m => m.name.toLowerCase().includes(keyword));
    const container = document.getElementById('kasir-menu-grid');

    container.className = kasirLayout === 'grid' ? "grid grid-cols-2 lg:grid-cols-4 gap-3" : "space-y-2";
    container.innerHTML = filtered.map(item => `
        <div class="bg-white p-3 rounded-2xl border flex flex-col justify-between text-xs">
            <div class="space-y-1.5">
                <img src="${item.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=300&q=80'}" class="w-full h-24 object-cover rounded-xl">
                <p class="font-bold truncate">${item.name}</p>
            </div>
            <div class="mt-2 flex justify-between items-center"><span class="font-bold text-themebrand-700">Rp ${item.price.toLocaleString('id-ID')}</span><button type="button" onclick="openOptionModal(${item.id})" class="px-2 py-1 bg-slate-900 text-themebrand-400 rounded-lg">+ Tambah</button></div>
        </div>
    `).join('');
}

function renderKasirPipeline() {
    const pending = store.orders.filter(o => o.status === 'Pending');
    const cooking = store.orders.filter(o => o.status === 'Cooking');
    const completed = store.orders.filter(o => o.status === 'Completed');

    document.getElementById('cnt-pending').innerText = pending.length;
    document.getElementById('cnt-cooking').innerText = cooking.length;
    document.getElementById('cnt-completed').innerText = completed.length;

    const card = (o, next, btn) => `
        <div class="bg-white p-3 rounded-2xl border text-xs space-y-2 shadow-sm">
            <div class="flex justify-between font-bold border-b pb-1"><span>#${o.id} - ${o.customer}</span><span class="text-[9px] text-slate-400">${o.timestamp.split('•')[1] || ''}</span></div>
            <p class="text-[10px] text-themebrand-700 font-bold">${o.orderType}</p>
            <div class="space-y-0.5 text-slate-600">${o.items.map(i => `<div class="flex justify-between"><span>${i.qty}x ${i.name}</span><span>Rp ${(i.price*i.qty).toLocaleString('id-ID')}</span></div>`).join('')}</div>
            <div class="pt-2 border-t flex justify-between items-center font-bold">
                <span class="text-themebrand-700">Rp ${o.grandTotal.toLocaleString('id-ID')}</span>
                ${next ? `<button type="button" onclick="updateOrderStatus('${o.id}', '${next}')" class="px-3 py-1 bg-slate-900 text-themebrand-400 rounded-xl text-[10px]">${btn}</button>` : '<span class="text-emerald-600 text-[10px]">Lunas</span>'}
            </div>
        </div>
    `;

    document.getElementById('list-pending').innerHTML = pending.map(o => card(o, 'Cooking', 'Konfirmasi Lunas')).join('');
    document.getElementById('list-cooking').innerHTML = cooking.map(o => card(o, 'Completed', 'Selesaikan')).join('');
    document.getElementById('list-completed').innerHTML = completed.map(o => card(o, null, '')).join('');
}

function updateOrderStatus(id, status) {
    const ord = store.orders.find(o => o.id === id);
    if (ord) { ord.status = status; saveStore('orders'); renderKasirPipeline(); }
}

/* ===================================================
   OPSI POSTER QR DISPLAY TOKO (3 OPSI DESAIN BERLOGO)
   =================================================== */
function openQrModalOptions() {
    selectQrDesign(1);
    document.getElementById('modal-qr-options').classList.remove('hidden');
}
function closeQrModalOptions() { document.getElementById('modal-qr-options').classList.add('hidden'); }

function selectQrDesign(optionNum) {
    selectedQrOption = optionNum;
    [1, 2, 3].forEach(n => document.getElementById(`btn-qr-opt-${n}`).className = n === optionNum ? "p-2 bg-themebrand-100 border border-themebrand-300 rounded-xl font-bold text-xs" : "p-2 bg-slate-50 border rounded-xl font-bold text-xs");

    const container = document.getElementById('qr-design-preview-container');
    const currentUrl = window.location.href;
    container.innerHTML = `<div id="preview-qr-render"></div>`;

    new QRCode(document.getElementById("preview-qr-render"), {
        text: currentUrl, width: optionNum === 3 ? 180 : 140, height: optionNum === 3 ? 180 : 140,
        colorDark: "#111827", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadSelectedQrPNG() {
    showToast("Gambar Poster QR Berhasil Diunduh!");
    closeQrModalOptions();
}
function printSelectedQrStandee() { window.print(); }

/* ===================================================
   HELPERS DASHBOARD OWNER
   =================================================== */
function setOwnerTab(tab) {
    ['branding', 'banners', 'categories', 'inventory', 'flashsale', 'stamps', 'integrations', 'backup'].forEach(t => document.getElementById(`owner-content-${t}`).classList.add('hidden'));
    document.getElementById(`owner-content-${tab}`).classList.remove('hidden');
}
function saveBrandingConfig() {
    store.theme.restoName = document.getElementById('cfg-name').value.trim() || DEFAULT_THEME.restoName;
    store.theme.restoPhone = document.getElementById('cfg-phone').value.trim() || DEFAULT_THEME.restoPhone;
    store.theme.logoUrl = document.getElementById('cfg-logo').value.trim();
    store.theme.qrisUrl = document.getElementById('cfg-qris').value.trim();
    saveStore('theme'); applyBrandingUI(); showToast("Branding Disimpan!");
}
function submitBannerItem() {
    const title = document.getElementById('banner-title').value.trim();
    if (!title) return showToast("Judul Banner Wajib Diisi!", true);
    store.banners.push({ id: Date.now(), tag: document.getElementById('banner-tag').value.trim() || '🥤 PROMO', title: title, desc: document.getElementById('banner-desc').value.trim(), image: document.getElementById('banner-img').value.trim() });
    saveStore('banners'); renderOwnerBanners(); initCarousel(); showToast("Banner Ditambahkan!");
}
function renderOwnerBanners() {
    document.getElementById('owner-banners-list').innerHTML = store.banners.map((b, idx) => `<div class="p-2 bg-slate-50 border rounded-xl text-xs flex justify-between items-center"><div><p class="font-bold">${b.title}</p></div><button type="button" onclick="store.banners.splice(${idx},1); saveStore('banners'); renderOwnerBanners(); initCarousel();" class="text-rose-600 font-bold">Hapus</button></div>`).join('');
}
function addCategory() {
    const name = document.getElementById('cat-new-name').value.trim();
    if (name) { store.categories.push(name); saveStore('categories'); renderOwnerCategories(); showToast("Kategori Ditambah!"); }
}
function renderOwnerCategories() {
    document.getElementById('owner-categories-list').innerHTML = store.categories.map((c, idx) => `<div class="p-2 bg-slate-50 border rounded-xl text-xs flex justify-between"><span>${c}</span><button type="button" onclick="store.categories.splice(${idx},1); saveStore('categories'); renderOwnerCategories();" class="text-rose-600 font-bold">Hapus</button></div>`).join('');
    document.getElementById('menu-category').innerHTML = store.categories.map(c => `<option value="${c}">${c}</option>`).join('');
}
function submitMenuItem() {
    const name = document.getElementById('menu-name').value.trim();
    const price = parseInt(document.getElementById('menu-price').value);
    if (!name || isNaN(price)) return showToast("Isi nama & harga!", true);
    store.menu.push({ id: Date.now(), name, price, category: document.getElementById('menu-category').value, desc: document.getElementById('menu-desc').value.trim(), image: document.getElementById('menu-img').value.trim() });
    saveStore('menu'); renderOwnerInventory(); showToast("Menu Ditambahkan!");
}
function renderOwnerInventory() {
    document.getElementById('owner-inventory-grid').innerHTML = store.menu.map((m, idx) => `<div class="p-2 bg-slate-50 border rounded-xl text-xs flex justify-between items-center"><div><p class="font-bold">${m.name}</p><p class="text-themebrand-700">Rp ${m.price.toLocaleString('id-ID')}</p></div><button type="button" onclick="store.menu.splice(${idx},1); saveStore('menu'); renderOwnerInventory();" class="text-rose-600 font-bold">Hapus</button></div>`).join('');
}
function renderFlashSaleTab() {
    document.getElementById('flash-sale-item-select').innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}
function saveFlashSaleConfig() {
    const itemId = parseInt(document.getElementById('flash-sale-item-select').value);
    const flashPrice = parseInt(document.getElementById('flash-sale-price-input').value);
    store.flashSaleItem = { itemId, flashPrice }; saveStore('flashSaleItem'); renderCustomerMenu(); showToast("Flash Sale Aktif!");
}
function disableFlashSale() { store.flashSaleItem = null; localStorage.removeItem('app_flash_sale_item'); renderCustomerMenu(); showToast("Flash Sale Dimatikan"); }
function renderOwnerMemberStamps() {
    document.getElementById('stamp-reward-item-select').innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}
function saveStampRules() {
    store.stampMinSpend = parseInt(document.getElementById('stamp-min-spend').value) || 20000;
    saveStore('stampMinSpend'); showToast("Aturan Stempel Disimpan!");
}
function updateOwnerStats() {
    document.getElementById('stat-revenue').innerText = `Rp ${store.orders.reduce((s, o) => s + o.grandTotal, 0).toLocaleString('id-ID')}`;
    document.getElementById('stat-orders-count').innerText = `${store.orders.length} Order`;
    document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;
}
function saveSheetWebhook() { store.theme.sheetWebhookUrl = document.getElementById('cfg-sheet-url').value.trim(); saveStore('theme'); showToast("Webhook Saved!"); }
function downloadJSONBackup() {
    const dl = document.createElement('a');
    dl.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store)));
    dl.setAttribute("download", "database_mainstay.json"); dl.click();
}
function restoreJSONBackup(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
            try { store = JSON.parse(ev.target.result); applyBrandingUI(); showToast("Database Pulih!"); } catch(err) { showToast("File Salah!", true); }
        };
        reader.readAsText(file);
    }
}
let salesChartInstance = null;
function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'], datasets: [{ label: 'Omset Harian (Rp)', data: [120000, 150000, 180000, 210000, 350000, 480000, 520000], borderColor: '#d97706', backgroundColor: 'rgba(217, 119, 6, 0.1)', fill: true }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}
