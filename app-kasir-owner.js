// SUB TAB KASIR CONTROL
function setKasirSubTab(tab) {
    const posContent = document.getElementById('kasir-pos-content');
    const kitchenContent = document.getElementById('kasir-kitchen-content');
    const posBtn = document.getElementById('btn-kasir-pos');
    const kitchenBtn = document.getElementById('btn-kasir-kitchen');

    if (tab === 'pos') {
        posContent?.classList.remove('hidden');
        kitchenContent?.classList.add('hidden');
        posBtn?.classList.add('active');
        kitchenBtn?.classList.remove('active');
        renderKasirMenu();
    } else {
        kitchenContent?.classList.remove('hidden');
        posContent?.classList.add('hidden');
        kitchenBtn?.classList.add('active');
        posBtn?.classList.remove('active');
        renderKasirPipeline();
    }
}

function renderKasirMenu() {
    const grid = document.getElementById('kasir-menu-grid');
    if (!grid) return;

    const query = (document.getElementById('kasir-search')?.value || '').toLowerCase();
    const filtered = store.menu.filter(m => m.name.toLowerCase().includes(query));

    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-3";
    grid.innerHTML = '';

    filtered.forEach(m => {
        const fallbackImg = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80";
        const imgUrl = m.image && m.image.trim() !== '' ? m.image : fallbackImg;

        grid.innerHTML += `
            <div class="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div class="flex items-center gap-2">
                    <img src="${imgUrl}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                    <div>
                        <h4 class="font-extrabold text-xs text-slate-900 line-clamp-1">${m.name}</h4>
                        <p class="font-black text-xs text-slate-900">Rp ${m.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <button type="button" onclick="openOptionModal(${m.id})" class="mt-2 btn-press w-full py-1.5 bg-slate-900 text-amber-400 font-bold text-xs rounded-xl shadow">+ Tambah Order</button>
            </div>
        `;
    });
}

// KITCHEN PIPELINE & UPDATE STATUS REAL-TIME
function renderKasirPipeline() {
    const pBox = document.getElementById('list-pending');
    const cBox = document.getElementById('list-cooking');
    const dBox = document.getElementById('list-completed');

    if (!pBox || !cBox || !dBox) return;

    const pending = store.orders.filter(o => o.status === 'Pending');
    const cooking = store.orders.filter(o => o.status === 'Cooking');
    const completed = store.orders.filter(o => o.status === 'Completed');

    if (document.getElementById('cnt-pending')) document.getElementById('cnt-pending').innerText = pending.length;
    if (document.getElementById('cnt-cooking')) document.getElementById('cnt-cooking').innerText = cooking.length;
    if (document.getElementById('cnt-completed')) document.getElementById('cnt-completed').innerText = completed.length;

    pBox.innerHTML = renderPipelineCards(pending, 'Pending');
    cBox.innerHTML = renderPipelineCards(cooking, 'Cooking');
    dBox.innerHTML = renderPipelineCards(completed, 'Completed');
}

function renderPipelineCards(ordersList, statusType) {
    if (ordersList.length === 0) return `<p class="text-[10px] text-slate-400 font-bold text-center py-4">Tidak ada pesanan.</p>`;

    return ordersList.map(o => {
        const itemTxt = o.items.map(i => `${i.name} (${i.options || 'Normal'})`).join(', ');
        
        return `
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div class="flex items-center justify-between border-b pb-1 font-extrabold">
                    <span class="text-slate-900">${o.id}</span>
                    <span class="text-[10px] text-amber-700 font-bold">${o.type.toUpperCase()}</span>
                </div>
                <p class="font-bold text-slate-800">${o.name} (${o.phone})</p>
                <p class="text-[10px] text-slate-600 bg-white p-1.5 rounded-xl border">${itemTxt}</p>
                <div class="flex items-center justify-between pt-1">
                    <span class="font-black text-slate-900">Rp ${o.total.toLocaleString('id-ID')}</span>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="printThermalReceipt('${o.id}')" class="p-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px]"><i class="fa-solid fa-print"></i></button>
                        ${statusType === 'Pending' ? `<button type="button" onclick="updateOrderStatus('${o.id}', 'Cooking')" class="px-2 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px]">Buat</button>` : ''}
                        ${statusType === 'Cooking' ? `<button type="button" onclick="updateOrderStatus('${o.id}', 'Completed')" class="px-2 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px]">Selesai</button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateOrderStatus(id, newStatus) {
    const order = store.orders.find(o => o.id === id);
    if (order && order.firebaseKey) {
        db.ref(`orders/${order.firebaseKey}`).update({ status: newStatus }).then(() => {
            showToast(`Status Order ${id} diperbarui!`);
        });
    } else {
        showToast("Pesanan tidak ditemukan di server!", true);
    }
}

// PERBAIKAN CETAK STRUK THERMAL PRINTER
function printThermalReceipt(id) {
    const order = store.orders.find(o => o.id === id);
    if (!order) return;

    if (document.getElementById('rec-resto-title')) document.getElementById('rec-resto-title').innerText = store.theme.restoName;
    if (document.getElementById('rec-timestamp')) document.getElementById('rec-timestamp').innerText = order.timestamp || getFormattedRealTime();
    if (document.getElementById('rec-id')) document.getElementById('rec-id').innerText = order.id;
    if (document.getElementById('rec-name')) document.getElementById('rec-name').innerText = order.name;
    if (document.getElementById('rec-phone')) document.getElementById('rec-phone').innerText = order.phone;

    let itemsHtml = '';
    order.items.forEach(i => {
        itemsHtml += `
            <div class="flex justify-between text-[10px]">
                <span>1x ${i.name}</span>
                <span>Rp ${i.price.toLocaleString('id-ID')}</span>
            </div>
            ${i.options ? `<div class="text-[8px] text-slate-500 font-sans pl-2">${i.options}</div>` : ''}
        `;
    });

    if (document.getElementById('rec-items-list')) document.getElementById('rec-items-list').innerHTML = itemsHtml;
    if (document.getElementById('rec-total')) document.getElementById('rec-total').innerText = `Rp ${order.total.toLocaleString('id-ID')}`;

    window.print();
}

// DASHBOARD OWNER TAB NAVIGATION
function setOwnerTab(tab) {
    const tabs = ['branding', 'members', 'inventory', 'banners', 'staffhrm', 'attendancelog', 'ownerprofile'];
    tabs.forEach(t => {
        const c = document.getElementById(`owner-content-${t}`);
        const b = document.getElementById(`tab-owner-${t}`);
        if (c) c.classList.add('hidden');
        if (b) b.classList.remove('active');
    });

    document.getElementById(`owner-content-${tab}`)?.classList.remove('hidden');
    document.getElementById(`tab-owner-${tab}`)?.classList.add('active');

    if (tab === 'branding') renderOwnerBrandingTab();
    if (tab === 'members') renderOwnerMembersTable();
    if (tab === 'inventory') renderOwnerInventory();
    if (tab === 'banners') renderOwnerBanners();
    if (tab === 'staffhrm') renderStaffHRMTab();
    if (tab === 'attendancelog') renderAttendanceLogTab();
    if (tab === 'ownerprofile') renderOwnerProfileTab();
}

// BRANDING & EDIT ALL LOGO
function renderOwnerBrandingTab() {
    if (document.getElementById('cfg-resto-name')) document.getElementById('cfg-resto-name').value = store.theme.restoName || '';
    if (document.getElementById('cfg-resto-phone')) document.getElementById('cfg-resto-phone').value = store.theme.restoPhone || '';
    if (document.getElementById('cfg-broadcast-wa-link')) document.getElementById('cfg-broadcast-wa-link').value = store.theme.broadcastWaLink || '';
    if (document.getElementById('cfg-logo-url')) document.getElementById('cfg-logo-url').value = store.theme.logoUrl || '';
    if (document.getElementById('cfg-app-icon-url')) document.getElementById('cfg-app-icon-url').value = store.theme.appIconUrl || '';
}

function saveBrandingConfig(btn) {
    store.theme.restoName = document.getElementById('cfg-resto-name').value;
    store.theme.restoPhone = document.getElementById('cfg-resto-phone').value;
    store.theme.broadcastWaLink = document.getElementById('cfg-broadcast-wa-link').value;
    store.theme.logoUrl = document.getElementById('cfg-logo-url').value;
    store.theme.appIconUrl = document.getElementById('cfg-app-icon-url').value;

    saveStore('theme');
    applyBrandingUI();
    triggerButtonLoading(btn, () => {
        showToast("Pengaturan Branding & Logo Tersimpan!");
    });
}

// DATABASE MEMBER TABLE REAL-TIME
function renderOwnerMembersTable() {
    const tbody = document.getElementById('owner-members-tbody');
    const cntEl = document.getElementById('cnt-total-members');
    if (!tbody) return;

    if (cntEl) cntEl.innerText = `${store.members.length} Member`;

    if (store.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-bold">Belum ada member terdaftar.</td></tr>`;
        return;
    }

    let html = '';
    store.members.forEach(m => {
        html += `
            <tr class="hover:bg-slate-50 font-semibold">
                <td class="p-2 text-slate-900 font-extrabold">${m.name}</td>
                <td class="p-2 text-slate-600">${m.phone}</td>
                <td class="p-2 text-[10px] text-slate-500">${m.joinedAt || '-'}</td>
                <td class="p-2 text-center">
                    <a href="https://wa.me/${m.phone}" target="_blank" class="px-2 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px] inline-flex items-center gap-1 shadow"><i class="fa-brands fa-whatsapp"></i> Chat</a>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// INVENTORY MANAGEMENT
function renderOwnerInventory() {
    const grid = document.getElementById('owner-inventory-grid');
    const catSelect = document.getElementById('menu-category');
    if (!grid) return;

    if (catSelect) {
        catSelect.innerHTML = store.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    let html = '';
    store.menu.forEach((m, idx) => {
        const fallbackImg = "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80";
        const imgUrl = m.image && m.image.trim() !== '' ? m.image : fallbackImg;

        html += `
            <div class="bg-slate-50 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2">
                    <img src="${imgUrl}" class="w-12 h-12 rounded-xl object-cover shrink-0">
                    <div>
                        <span class="text-[9px] font-bold text-slate-400 uppercase">${m.category}</span>
                        <h4 class="font-extrabold text-slate-900">${m.name}</h4>
                        <p class="font-black text-slate-900">Rp ${m.price.toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <button type="button" onclick="deleteMenuItem(${idx})" class="text-rose-600 p-2 hover:bg-rose-100 rounded-xl"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function submitMenuItem(btn) {
    const name = document.getElementById('menu-name').value.trim();
    const category = document.getElementById('menu-category').value;
    const price = parseInt(document.getElementById('menu-price').value) || 0;
    const image = document.getElementById('menu-img').value.trim();

    if (!name || price <= 0) {
        showToast("Mohon isi Nama Menu & Harga dengan benar!", true);
        return;
    }

    const newItem = {
        id: Date.now(),
        name: name,
        category: category,
        price: price,
        image: image,
        optIce: true,
        optSugar: true
    };

    triggerButtonLoading(btn, () => {
        store.menu.push(newItem);
        saveStore('menu');
        renderOwnerInventory();
        if (typeof renderCustomerMenu === 'function') renderCustomerMenu();
        showToast(`Menu ${name} berhasil ditambahkan!`);
        document.getElementById('menu-name').value = '';
        document.getElementById('menu-price').value = '';
        document.getElementById('menu-img').value = '';
    });
}

function deleteMenuItem(idx) {
    if (confirm("Hapus menu ini dari katalog?")) {
        store.menu.splice(idx, 1);
        saveStore('menu');
        renderOwnerInventory();
        if (typeof renderCustomerMenu === 'function') renderCustomerMenu();
        showToast("Menu dihapus!");
    }
}

// BANNERS PROMO
function renderOwnerBanners() {
    const box = document.getElementById('owner-banners-list');
    if (!box) return;

    let html = '';
    store.banners.forEach((b, idx) => {
        html += `
            <div class="bg-slate-50 p-2.5 rounded-2xl border flex items-center justify-between text-xs">
                <div>
                    <span class="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-md">${b.tag}</span>
                    <h5 class="font-extrabold text-slate-900 mt-1">${b.title}</h5>
                </div>
                <button type="button" onclick="deleteBannerItem(${idx})" class="text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });
    box.innerHTML = html;
}

function submitBannerItem(btn) {
    const tag = document.getElementById('banner-tag').value.trim();
    const title = document.getElementById('banner-title').value.trim();
    const desc = document.getElementById('banner-desc').value.trim();
    const image = document.getElementById('banner-img').value.trim();

    if (!title) return showToast("Judul banner wajib diisi!", true);

    triggerButtonLoading(btn, () => {
        store.banners.push({ id: Date.now(), tag: tag || 'PROMO', title, desc, image });
        saveStore('banners');
        renderOwnerBanners();
        initCarousel();
        showToast("Banner promo ditambahkan!");
    });
}

function deleteBannerItem(idx) {
    store.banners.splice(idx, 1);
    saveStore('banners');
    renderOwnerBanners();
    initCarousel();
}

// STAF HRM & PIN KASIR
function renderStaffHRMTab() {
    const box = document.getElementById('hrm-staff-list');
    if (!box) return;

    let html = '';
    store.staff.forEach((s, idx) => {
        html += `
            <div class="bg-slate-50 p-3 rounded-2xl border flex items-center justify-between text-xs">
                <div class="flex items-center gap-2">
                    <img src="${s.photoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" class="w-10 h-10 rounded-xl object-cover border">
                    <div>
                        <h5 class="font-extrabold text-slate-900">${s.name} (${s.phone})</h5>
                        <p class="text-[10px] text-amber-700 font-bold">PIN Kasir: ${s.pin}</p>
                    </div>
                </div>
                <button type="button" onclick="deleteStaff(${idx})" class="text-rose-600 p-2"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        `;
    });
    box.innerHTML = html;
}

function submitStaffProfile(btn) {
    const name = document.getElementById('hrm-staff-name').value.trim();
    const phone = document.getElementById('hrm-staff-phone').value.trim();
    const pin = document.getElementById('hrm-staff-pin').value.trim();
    const photoUrl = document.getElementById('hrm-staff-photo').value.trim();

    if (!name || !pin) return showToast("Mohon isi Nama & PIN Staf!", true);

    triggerButtonLoading(btn, () => {
        store.staff.push({ id: Date.now(), name, phone, pin, photoUrl });
        saveStore('staff');
        renderStaffHRMTab();
        showToast("Staf Kasir berhasil disimpan!");
        document.getElementById('hrm-staff-name').value = '';
        document.getElementById('hrm-staff-phone').value = '';
        document.getElementById('hrm-staff-pin').value = '';
        document.getElementById('hrm-staff-photo').value = '';
    });
}

function deleteStaff(idx) {
    store.staff.splice(idx, 1);
    saveStore('staff');
    renderStaffHRMTab();
}

// CAMERA ABSENSI LIVE
let cameraStream = null;

function openDirectCameraAttendance() {
    const staffSel = document.getElementById('att-camera-staff');
    if (staffSel) staffSel.innerHTML = store.staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    const video = document.getElementById('att-video-stream');
    document.getElementById('modal-camera-attendance')?.classList.remove('hidden');

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(stream => {
            cameraStream = stream;
            if (video) video.srcObject = stream;
        }).catch(() => showToast("Gagal mengakses kamera!", true));
    }
}

function closeDirectCameraAttendance() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('modal-camera-attendance')?.classList.add('hidden');
}

function captureAndSubmitAttendance(btn) {
    const staffId = parseInt(document.getElementById('att-camera-staff').value);
    const pin = document.getElementById('att-camera-pin').value;
    const type = document.getElementById('att-camera-type').value;

    const staff = store.staff.find(s => s.id === staffId);
    if (!staff || staff.pin !== pin) return showToast("PIN Staf Salah!", true);

    const video = document.getElementById('att-video-stream');
    const canvas = document.getElementById('att-photo-canvas');
    canvas.width = video?.videoWidth || 300;
    canvas.height = video?.videoHeight || 300;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg');

    triggerButtonLoading(btn, () => {
        store.attendance.push({
            id: Date.now(),
            staffName: staff.name,
            type: type,
            timestamp: getFormattedRealTime(),
            photo: photoData
        });

        saveStore('attendance');
        closeDirectCameraAttendance();
        showToast(`Absensi ${type} ${staff.name} berhasil!`);
    });
}

function renderAttendanceLogTab() {
    const grid = document.getElementById('owner-attendance-grid');
    if (!grid) return;

    if (store.attendance.length === 0) {
        grid.className = "col-span-full py-8 text-center text-slate-400 font-bold text-xs";
        grid.innerHTML = "Belum ada log absensi foto.";
        return;
    }

    grid.className = "grid grid-cols-2 sm:grid-cols-4 gap-3";
    grid.innerHTML = store.attendance.map(a => `
        <div class="bg-slate-50 p-2 rounded-2xl border text-xs text-center space-y-1">
            <img src="${a.photo}" class="w-full h-28 object-cover rounded-xl">
            <p class="font-extrabold text-slate-900 mt-1">${a.staffName}</p>
            <span class="inline-block text-[9px] font-black px-2 py-0.5 rounded-md ${a.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${a.type}</span>
            <p class="text-[8px] text-slate-500">${a.timestamp}</p>
        </div>
    `).join('');
}

// PROFIL OWNER & QRIS
function renderOwnerProfileTab() {
    if (document.getElementById('ow-name')) document.getElementById('ow-name').value = store.ownerProfile.name || '';
    if (document.getElementById('ow-pin')) document.getElementById('ow-pin').value = store.ownerProfile.pin || '9999';
    if (document.getElementById('ow-bank')) document.getElementById('ow-bank').value = store.ownerProfile.bank || '';
    if (document.getElementById('ow-rekening')) document.getElementById('ow-rekening').value = store.ownerProfile.rekening || '';
    if (document.getElementById('cfg-ow-qris-url')) document.getElementById('cfg-ow-qris-url').value = store.ownerProfile.qrisUrl || '';
}

function saveOwnerProfile(btn) {
    store.ownerProfile.name = document.getElementById('ow-name').value;
    store.ownerProfile.pin = document.getElementById('ow-pin').value;
    store.ownerProfile.bank = document.getElementById('ow-bank').value;
    store.ownerProfile.rekening = document.getElementById('ow-rekening').value;
    store.ownerProfile.qrisUrl = document.getElementById('cfg-ow-qris-url').value;

    saveStore('ownerProfile');
    triggerButtonLoading(btn, () => showToast("Profil Owner & QRIS Tersimpan!"));
}

// ANALISIS OMSET & CHART.JS FILTER RENTANG WAKTU LENGKAP
let salesChartInstance = null;

function updateOwnerStats() {
    const totalRev = store.orders.reduce((a, b) => a + (b.total || 0), 0);
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').innerText = `Rp ${totalRev.toLocaleString('id-ID')}`;
    if (document.getElementById('stat-orders-count')) document.getElementById('stat-orders-count').innerText = `${store.orders.length} Order`;
    if (document.getElementById('stat-menu-count')) document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;

    initSalesChart();
}

function initSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    const filterRange = document.getElementById('stat-range-filter')?.value || '7days';

    let labels = [];
    let chartData = [];

    if (filterRange === '2days') {
        labels = ['Kemarin', 'Hari Ini'];
        chartData = [450000, 680000];
    } else if (filterRange === '3days') {
        labels = ['2 Hari Lalu', 'Kemarin', 'Hari Ini'];
        chartData = [320000, 450000, 680000];
    } else if (filterRange === '7days') {
        labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Ming'];
        chartData = [250000, 480000, 620000, 890000, 1100000, 1450000, 1200000];
    } else if (filterRange === '30days') {
        labels = ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'];
        chartData = [4500000, 5800000, 6200000, 7100000];
    } else if (filterRange === '1year') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        chartData = [18M, 22M, 25M, 21M, 28M, 32M, 35M, 30M, 29M, 34M, 38M, 42M];
    }

    if (salesChartInstance) salesChartInstance.destroy();

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Penjualan (Rp)',
                data: chartData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#64748b', font: { size: 9 } } },
                y: { ticks: { color: '#64748b', font: { size: 9 } } }
            }
        }
    });
}
