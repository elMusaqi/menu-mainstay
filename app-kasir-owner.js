// KASIR POS, DIRECT CAMERA ATTENDANCE, 4-OPTION POSTER QR, & HRM OWNER ENGINE

let cameraStream = null;
let selectedQrOption = 1;

/* ===================================================
   DIRECT CAMERA ATTENDANCE (NO GALLERY & POP-UP 3 DETIK)
   =================================================== */
function openDirectCameraAttendance() {
    document.getElementById('att-camera-staff').innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    document.getElementById('modal-camera-attendance').classList.remove('hidden');

    const video = document.getElementById('att-video-stream');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
        .then(stream => { cameraStream = stream; video.srcObject = stream; })
        .catch(() => { showToast("Gagal mengakses kamera HP!", true); closeDirectCameraAttendance(); });
}

function closeDirectCameraAttendance() {
    if (cameraStream) { cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; }
    document.getElementById('modal-camera-attendance').classList.add('hidden');
}

function captureAndSubmitAttendance(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const staffName = document.getElementById('att-camera-staff').value;
        const pin = document.getElementById('att-camera-pin').value;
        const staffObj = store.staff.find(s => s.name === staffName && s.pin === pin);

        if (!staffObj) return showToast("PIN Staf Salah!", true);

        const video = document.getElementById('att-video-stream');
        const canvas = document.getElementById('att-photo-canvas');
        canvas.width = video.videoWidth || 320; canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const stampTime = getFormattedRealTime();
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(10, canvas.height - 35, canvas.width - 20, 25);
        ctx.fillStyle = "#fbbf24"; ctx.font = "bold 11px sans-serif";
        ctx.fillText(`STAMP: ${stampTime}`, 15, canvas.height - 18);

        const photoData = canvas.toDataURL('image/jpeg');

        // HITUNG STATUS KETERLAMBATAN AUTOMATIS
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [shiftH, shiftM] = (staffObj.shiftIn || "08:00").split(':').map(Number);
        const targetMins = shiftH * 60 + shiftM + (parseInt(staffObj.toleranceMinutes) || 15);

        let lateStatusText = "🟢 Tepat Waktu";
        let isLate = false;
        let lateMins = 0;

        if (document.getElementById('att-camera-type').value === 'IN' && currentMins > targetMins) {
            isLate = true; lateMins = currentMins - (shiftH * 60 + shiftM);
            lateStatusText = `🔴 Terlambat ${lateMins} Menit`;
        }

        const logEntry = {
            id: Date.now(), staffName: staffName, type: document.getElementById('att-camera-type').value,
            timestamp: stampTime, photo: photoData, isLate: isLate, lateMins: lateMins, lateStatusText: lateStatusText
        };

        store.attendance.unshift(logEntry);
        saveStore('attendance'); closeDirectCameraAttendance();

        // TAMPILKAN POP-UP RINGKASAN 3 DETIK
        document.getElementById('sum-att-photo').src = photoData;
        document.getElementById('sum-att-name').innerText = staffName;
        document.getElementById('sum-att-type').innerText = logEntry.type === 'IN' ? 'Clock-In (Masuk)' : 'Clock-Out (Pulang)';
        document.getElementById('sum-att-time').innerText = stampTime;
        document.getElementById('sum-att-late').innerText = lateStatusText;
        document.getElementById('modal-attendance-summary').classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('modal-attendance-summary').classList.add('hidden');
        }, 3000);
    });
}

/* ===================================================
   KASIR POS & KITCHEN PIPELINE
   =================================================== */
function setKasirSubTab(tab) {
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    if (tab === 'pos') {
        document.getElementById('btn-kasir-pos').classList.add('active');
        document.getElementById('kasir-pos-content').classList.remove('hidden'); document.getElementById('kasir-kitchen-content').classList.add('hidden');
    } else {
        document.getElementById('btn-kasir-kitchen').classList.add('active');
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
            <div class="mt-2 flex justify-between items-center"><span class="font-bold text-themebrand-700">Rp ${item.price.toLocaleString('id-ID')}</span><button type="button" onclick="openOptionModal(${item.id})" class="btn-press px-2 py-1 bg-slate-900 text-themebrand-400 rounded-lg">+ Tambah</button></div>
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
                ${next ? `<button type="button" onclick="updateOrderStatus('${o.id}', '${next}')" class="btn-press px-3 py-1 bg-slate-900 text-themebrand-400 rounded-xl text-[10px]">${btn}</button>` : '<span class="text-emerald-600 text-[10px]">Lunas</span>'}
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
   4 OPSI DESAIN POSTER QR DISPLAY TOKO
   =================================================== */
function openQrModalOptions() {
    selectQrDesign(1);
    document.getElementById('modal-qr-options').classList.remove('hidden');
}
function closeQrModalOptions() { document.getElementById('modal-qr-options').classList.add('hidden'); }

function selectQrDesign(optionNum) {
    selectedQrOption = optionNum;
    [1, 2, 3, 4].forEach(n => {
        const btn = document.getElementById(`btn-qr-opt-${n}`);
        if (btn) btn.className = n === optionNum ? "p-2 rounded-xl font-bold border text-left bg-slate-900 text-themebrand-400 border-themebrand-500 shadow" : "p-2 rounded-xl font-bold border text-left bg-slate-50 text-slate-700";
    });

    const header = document.getElementById('qr-poster-header');
    const footer = document.getElementById('qr-poster-footer');
    const qrBox = document.getElementById('qr-code-box');
    const currentUrl = window.location.href;

    qrBox.innerHTML = '';
    new QRCode(qrBox, { text: currentUrl, width: 140, height: 140, colorDark: "#111827", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });

    if (optionNum === 1) { // POLOS CLEAN MENTAH
        header.innerHTML = ''; footer.innerHTML = '<p class="text-[9px] text-slate-400 font-bold uppercase">QR Code Mentah (Clean)</p>';
    } else if (optionNum === 2) { // STANDEE AKRILIK KASIR
        header.innerHTML = `<h3 class="font-black text-sm uppercase text-slate-900">${store.theme.restoName}</h3><p class="text-[9px] font-extrabold text-themebrand-700 uppercase">TAKEAWAY & PRE-ORDER</p>`;
        footer.innerHTML = `<p class="font-black text-xs text-slate-900">SCAN DI SINI TO ORDER</p><p class="text-[9px] font-bold text-slate-500">Pesan Cepat • Bebas Antre</p>`;
    } else if (optionNum === 3) { // POSTER DINDING PLAYFUL
        header.innerHTML = `<span class="bg-themebrand-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">🥤 MINUMAN ANDALANMU</span><h3 class="font-black text-base text-slate-900 mt-1">${store.theme.restoName}</h3>`;
        footer.innerHTML = `<p class="font-extrabold text-xs text-themebrand-700">SELF ORDER & PRE-ORDER</p><p class="text-[9px] font-bold text-slate-600">Scan via Kamera HP / WA Anda</p>`;
    } else if (optionNum === 4) { // STIKER MINI CUP
        header.innerHTML = `<p class="font-black text-xs text-slate-900 uppercase">★ ${store.theme.restoName} ★</p>`;
        footer.innerHTML = `<p class="text-[8px] font-black text-slate-500 uppercase">SCAN MENU DIGITAL</p>`;
    }
}

function downloadSelectedQrPNG(btnEl) {
    triggerButtonLoading(btnEl, () => {
        showToast("Gambar Poster QR Berhasil Diunduh!");
        closeQrModalOptions();
    });
}
function printSelectedQrStandee() { window.print(); }

/* ===================================================
   OWNER DASHBOARD: PROFIL OWNER & HRM STAF
   =================================================== */
function setOwnerTab(tab) {
    document.querySelectorAll('.owner-tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-owner-${tab}`).classList.add('active');

    ['ownerprofile', 'staffhrm', 'attendancelog', 'branding', 'banners', 'categories', 'inventory', 'flashsale', 'stamps', 'integrations', 'backup'].forEach(t => {
        const el = document.getElementById(`owner-content-${t}`);
        if (el) el.classList.add('hidden');
    });
    document.getElementById(`owner-content-${tab}`).classList.remove('hidden');
}

function renderOwnerProfileTab() {
    document.getElementById('ow-name').value = store.ownerProfile.name || 'Owner Mainstay';
    document.getElementById('ow-pin').value = store.ownerProfile.pin || '9999';
    document.getElementById('ow-bank').value = store.ownerProfile.bank || '';
    document.getElementById('ow-rekening').value = store.ownerProfile.rekening || '';
    document.getElementById('cfg-ow-photo-url').value = store.ownerProfile.photoUrl || '';
    document.getElementById('cfg-ow-qris-url').value = store.ownerProfile.qrisUrl || '';
}

function saveOwnerProfile(btnEl) {
    triggerButtonLoading(btnEl, () => {
        store.ownerProfile = {
            name: document.getElementById('ow-name').value.trim() || 'Owner Mainstay',
            pin: document.getElementById('ow-pin').value.trim() || '9999',
            bank: document.getElementById('ow-bank').value.trim(),
            rekening: document.getElementById('ow-rekening').value.trim(),
            photoUrl: document.getElementById('cfg-ow-photo-url').value.trim(),
            qrisUrl: document.getElementById('cfg-ow-qris-url').value.trim()
        };
        saveStore('ownerProfile'); showToast("Profil Owner Disimpan!");
    });
}

function renderStaffHRMTab() {
    const listEl = document.getElementById('hrm-staff-list');
    const selectEl = document.getElementById('bonus-staff-select');

    selectEl.innerHTML = store.staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    listEl.innerHTML = store.staff.map((s, idx) => {
        let waUrl = `https://wa.me/${(s.phone || '628123456789').replace(/[^0-9]/g, '')}?text=Halo%20${encodeURIComponent(s.name)}`;
        const totalBonus = (s.bonuses || []).reduce((sum, b) => sum + b.amount, 0);

        return `
            <div class="bg-white p-4 rounded-3xl border text-xs space-y-3 shadow-sm">
                <div class="flex items-center justify-between border-b pb-2">
                    <div class="flex items-center gap-2.5">
                        <img src="${s.photoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" class="w-10 h-10 rounded-2xl object-cover border">
                        <div><p class="font-extrabold text-slate-900">${s.name}</p><p class="text-[10px] text-slate-500">PIN: <span class="font-mono font-bold">${s.pin}</span> | Shift: ${s.shiftIn}-${s.shiftOut}</p></div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <a href="${waUrl}" target="_blank" class="px-2.5 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-300"><i class="fa-brands fa-whatsapp mr-1"></i> WA Staf</a>
                        <button type="button" onclick="store.staff.splice(${idx},1); saveStore('staff'); renderStaffHRMTab();" class="px-2.5 py-1.5 bg-rose-100 text-rose-700 rounded-xl font-bold">Hapus</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-2xl border text-[10px]">
                    <div><span class="text-slate-400">Gaji Utama:</span><p class="font-bold text-slate-900">Rp ${(s.salaryRate || 0).toLocaleString('id-ID')} (${s.salaryType})</p></div>
                    <div><span class="text-slate-400">Rekening:</span><p class="font-bold text-slate-900">${s.bank || '-'} ${s.rekening || ''}</p></div>
                    <div><span class="text-slate-400">Extra Bonus:</span><p class="font-bold text-emerald-600">Rp ${totalBonus.toLocaleString('id-ID')}</p></div>
                    <div><span class="text-slate-400">Denda Terlambat:</span><p class="font-bold text-rose-600">Rp ${(s.lateFinePerHour || 0).toLocaleString('id-ID')}/Jam</p></div>
                </div>
            </div>
        `;
    }).join('');
}

function submitStaffProfile(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const name = document.getElementById('hrm-staff-name').value.trim();
        const pin = document.getElementById('hrm-staff-pin').value.trim();
        if (!name || !pin) return showToast("Isi Nama & PIN Staf!", true);

        store.staff.push({
            id: Date.now(), name: name, phone: document.getElementById('hrm-staff-phone').value.trim(), pin: pin,
            shiftIn: document.getElementById('hrm-shift-in').value || "08:00",
            shiftOut: document.getElementById('hrm-shift-out').value || "16:00",
            toleranceMinutes: parseInt(document.getElementById('hrm-shift-tolerance').value) || 15,
            salaryType: document.getElementById('hrm-salary-type').value,
            salaryRate: parseInt(document.getElementById('hrm-salary-rate').value) || 0,
            lateFinePerHour: parseInt(document.getElementById('hrm-late-fine').value) || 0,
            bank: document.getElementById('hrm-staff-bank').value.trim(),
            rekening: document.getElementById('hrm-staff-rekening').value.trim(),
            rekName: document.getElementById('hrm-staff-rekname').value.trim(),
            photoUrl: document.getElementById('hrm-staff-photourl').value.trim(),
            qrisUrl: document.getElementById('hrm-staff-qrisurl').value.trim(),
            bonuses: []
        });

        saveStore('staff'); renderStaffHRMTab(); showToast("Profil Staf Disimpan!");
    });
}

function addStaffBonus(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const staffId = parseInt(document.getElementById('bonus-staff-select').value);
        const amount = parseInt(document.getElementById('bonus-amount-input').value);
        if (!staffId || isNaN(amount)) return showToast("Isi nominal bonus!", true);

        const staff = store.staff.find(s => s.id === staffId);
        if (staff) {
            if (!staff.bonuses) staff.bonuses = [];
            staff.bonuses.push({
                amount: amount,
                label: document.getElementById('bonus-label-select').value,
                desc: document.getElementById('bonus-desc-input').value.trim(),
                date: getFormattedRealTime()
            });
            saveStore('staff'); renderStaffHRMTab(); showToast("Bonus Berhasil Ditambahkan!");
        }
    });
}

function renderAttendanceLogTab() {
    const grid = document.getElementById('owner-attendance-grid');
    grid.innerHTML = store.attendance.map(a => `
        <div class="bg-slate-50 p-3 rounded-2xl border space-y-2 text-xs">
            <img src="${a.photo}" class="w-full h-36 object-cover rounded-xl border">
            <div>
                <p class="font-extrabold text-slate-900">${a.staffName}</p>
                <p class="text-[10px] font-bold text-amber-700">${a.type === 'IN' ? 'Clock-In (Masuk)' : 'Clock-Out (Pulang)'}</p>
                <p class="text-[9px] text-slate-500">${a.timestamp}</p>
                <span class="text-[9px] font-bold ${a.isLate ? 'text-rose-600' : 'text-emerald-600'}">${a.lateStatusText}</span>
            </div>
        </div>
    `).join('');
}

/* ===================================================
   HELPERS OTHER OWNER TABS
   =================================================== */
function saveBrandingConfig(btnEl) {
    triggerButtonLoading(btnEl, () => {
        store.theme.restoName = document.getElementById('cfg-name').value.trim() || DEFAULT_THEME.restoName;
        store.theme.restoPhone = document.getElementById('cfg-phone').value.trim() || DEFAULT_THEME.restoPhone;
        store.theme.logoUrl = document.getElementById('cfg-logo').value.trim();
        store.theme.qrisUrl = document.getElementById('cfg-qris').value.trim();
        saveStore('theme'); applyBrandingUI(); showToast("Branding Disimpan!");
    });
}
function submitBannerItem(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const title = document.getElementById('banner-title').value.trim();
        if (!title) return showToast("Judul Banner Wajib!", true);
        store.banners.push({ id: Date.now(), tag: document.getElementById('banner-tag').value.trim() || '🥤 PROMO', title: title, desc: document.getElementById('banner-desc').value.trim(), image: document.getElementById('banner-img').value.trim() });
        saveStore('banners'); renderOwnerBanners(); initCarousel(); showToast("Banner Ditambahkan!");
    });
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
function submitMenuItem(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const name = document.getElementById('menu-name').value.trim();
        const price = parseInt(document.getElementById('menu-price').value);
        if (!name || isNaN(price)) return showToast("Isi nama & harga!", true);
        store.menu.push({ id: Date.now(), name, price, category: document.getElementById('menu-category').value, desc: document.getElementById('menu-desc').value.trim(), image: document.getElementById('menu-img').value.trim() });
        saveStore('menu'); renderOwnerInventory(); showToast("Menu Ditambahkan!");
    });
}
function renderOwnerInventory() {
    document.getElementById('owner-inventory-grid').innerHTML = store.menu.map((m, idx) => `<div class="p-2 bg-slate-50 border rounded-xl text-xs flex justify-between items-center"><div><p class="font-bold">${m.name}</p><p class="text-themebrand-700">Rp ${m.price.toLocaleString('id-ID')}</p></div><button type="button" onclick="store.menu.splice(${idx},1); saveStore('menu'); renderOwnerInventory();" class="text-rose-600 font-bold">Hapus</button></div>`).join('');
}
function renderFlashSaleTab() {
    document.getElementById('flash-sale-item-select').innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}
function saveFlashSaleConfig(btnEl) {
    triggerButtonLoading(btnEl, () => {
        const itemId = parseInt(document.getElementById('flash-sale-item-select').value);
        const flashPrice = parseInt(document.getElementById('flash-sale-price-input').value);
        store.flashSaleItem = { itemId, flashPrice }; saveStore('flashSaleItem'); renderCustomerMenu(); showToast("Flash Sale Aktif!");
    });
}
function disableFlashSale() { store.flashSaleItem = null; localStorage.removeItem('app_flash_sale_item'); renderCustomerMenu(); showToast("Flash Sale Dimatikan"); }
function renderOwnerMemberStamps() {
    document.getElementById('stamp-reward-item-select').innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
}
function saveStampRules(btnEl) {
    triggerButtonLoading(btnEl, () => {
        store.stampMinSpend = parseInt(document.getElementById('stamp-min-spend').value) || 20000;
        saveStore('stampMinSpend'); showToast("Aturan Stempel Disimpan!");
    });
}
function updateOwnerStats() {
    document.getElementById('stat-revenue').innerText = `Rp ${store.orders.reduce((s, o) => s + o.grandTotal, 0).toLocaleString('id-ID')}`;
    document.getElementById('stat-orders-count').innerText = `${store.orders.length} Order`;
    document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;
}
function saveSheetWebhook(btnEl) {
    triggerButtonLoading(btnEl, () => {
        store.theme.sheetWebhookUrl = document.getElementById('cfg-sheet-url').value.trim(); saveStore('theme'); showToast("Webhook Saved!");
    });
}
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
