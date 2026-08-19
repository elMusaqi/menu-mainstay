// KASIR & OWNER ENGINE: PIPELINE BAR ANTREAN, DIREK WA VERIFIKASI, HRM STAF, KAMERA ABSENSI & GRAFIK OMSET

// ==========================================
// KASIR POS & KITCHEN PIPELINE
// ==========================================

function setKasirSubTab(tab) {
    const btnPos = document.getElementById('btn-kasir-pos');
    const btnKitchen = document.getElementById('btn-kasir-kitchen');
    const contentPos = document.getElementById('kasir-pos-content');
    const contentKitchen = document.getElementById('kasir-kitchen-content');

    if (tab === 'pos') {
        if (btnPos) btnPos.className = "btn-press sub-tab-btn active px-3.5 py-2 rounded-xl text-xs font-bold text-center";
        if (btnKitchen) btnKitchen.className = "btn-press sub-tab-btn px-3.5 py-2 rounded-xl text-xs font-bold text-center relative";
        if (contentPos) contentPos.classList.remove('hidden');
        if (contentKitchen) contentKitchen.classList.add('hidden');
        renderKasirMenu();
    } else {
        if (btnPos) btnPos.className = "btn-press sub-tab-btn px-3.5 py-2 rounded-xl text-xs font-bold text-center";
        if (btnKitchen) btnKitchen.className = "btn-press sub-tab-btn active px-3.5 py-2 rounded-xl text-xs font-bold text-center relative";
        if (contentPos) contentPos.classList.add('hidden');
        if (contentKitchen) contentKitchen.classList.remove('hidden');
        renderKasirPipeline();
    }
}

function setKasirLayout(layout) {
    kasirLayout = layout;
    const btnGrid = document.getElementById('btn-kasir-grid');
    const btnList = document.getElementById('btn-kasir-list');
    if (layout === 'grid') {
        if (btnGrid) btnGrid.className = "p-2 rounded-xl text-xs text-themebrand-600 bg-themebrand-100 font-bold";
        if (btnList) btnList.className = "p-2 rounded-xl text-xs text-slate-400 font-bold";
    } else {
        if (btnGrid) btnGrid.className = "p-2 rounded-xl text-xs text-slate-400 font-bold";
        if (btnList) btnList.className = "p-2 rounded-xl text-xs text-themebrand-600 bg-themebrand-100 font-bold";
    }
    renderKasirMenu();
}

function renderKasirMenu() {
    const grid = document.getElementById('kasir-menu-grid');
    if (!grid) return;
    
    const searchInput = document.getElementById('kasir-search');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    grid.className = kasirLayout === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 gap-3' : 'space-y-2.5';
    grid.innerHTML = '';

    const filtered = store.menu.filter(m => m.name.toLowerCase().includes(search));

    filtered.forEach(m => {
        grid.innerHTML += `
            <div class="${kasirLayout === 'grid' ? 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-2' : 'bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3'}">
                <div class="${kasirLayout === 'grid' ? 'space-y-2' : 'flex items-center gap-3 flex-1 min-w-0'}">
                    <img src="${m.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80'}" class="${kasirLayout === 'grid' ? 'w-full h-28' : 'w-14 h-14 shrink-0'} rounded-xl object-cover">
                    <div class="min-w-0 flex-1">
                        <p class="font-black text-xs text-slate-900 truncate">${m.name}</p>
                        <p class="text-xs font-black text-themebrand-600 mt-0.5">Rp ${m.price.toLocaleString()}</p>
                    </div>
                </div>
                <button type="button" onclick="prepareAddToCart(${m.id})" class="btn-press bg-slate-900 text-themebrand-400 px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 self-end sm:self-center shadow">
                    + Tambah
                </button>
            </div>
        `;
    });
}

function renderKasirPipeline() {
    const listPending = document.getElementById('list-pending');
    const listCooking = document.getElementById('list-cooking');
    const listCompleted = document.getElementById('list-completed');

    if (!listPending || !listCooking || !listCompleted) return;

    const pendingOrders = store.orders.filter(o => o.status === 'Pending');
    const cookingOrders = store.orders.filter(o => o.status === 'Cooking');
    const completedOrders = store.orders.filter(o => o.status === 'Completed');

    if (document.getElementById('cnt-pending')) document.getElementById('cnt-pending').innerText = pendingOrders.length;
    if (document.getElementById('cnt-cooking')) document.getElementById('cnt-cooking').innerText = cookingOrders.length;
    if (document.getElementById('cnt-completed')) document.getElementById('cnt-completed').innerText = completedOrders.length;

    listPending.innerHTML = pendingOrders.length === 0 ? `<p class="text-[11px] text-slate-400 font-medium text-center py-4">Tidak ada order masuk</p>` : '';
    listCooking.innerHTML = cookingOrders.length === 0 ? `<p class="text-[11px] text-slate-400 font-medium text-center py-4">Belum ada proses buat</p>` : '';
    listCompleted.innerHTML = completedOrders.length === 0 ? `<p class="text-[11px] text-slate-400 font-medium text-center py-4">Belum ada pesanan selesai</p>` : '';

    pendingOrders.forEach(o => {
        let cleanPhone = o.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

        listPending.innerHTML += `
            <div class="bg-amber-50/50 p-3 rounded-2xl border border-amber-200 space-y-2 text-xs shadow-sm">
                <div class="flex items-center justify-between font-black border-b border-amber-200/60 pb-1.5">
                    <span class="text-slate-900">${o.id}</span>
                    <span class="text-amber-800 text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-md">${o.schedule || 'Instant'}</span>
                </div>
                <div>
                    <p class="font-bold text-slate-800">${o.name} (${o.phone})</p>
                    <p class="text-[10px] text-slate-500 font-medium">${o.items.map(i => i.name).join(', ')}</p>
                    <p class="font-black text-themebrand-700 mt-1">Total: Rp ${o.total.toLocaleString()}</p>
                </div>
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                    <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-press bg-emerald-600 text-white font-extrabold text-center py-1.5 rounded-xl text-[10px] shadow-sm flex items-center justify-center gap-1">
                        <i class="fa-brands fa-whatsapp text-xs"></i> Cek Chat WA
                    </a>
                    <button type="button" onclick="updateOrderStatus('${o.id}', 'Cooking')" class="btn-press bg-slate-900 text-themebrand-400 font-black py-1.5 rounded-xl text-[10px] shadow-sm">
                        Konfirmasi Lunas
                    </button>
                </div>
            </div>
        `;
    });

    cookingOrders.forEach(o => {
        listCooking.innerHTML += `
            <div class="bg-blue-50/50 p-3 rounded-2xl border border-blue-200 space-y-2 text-xs shadow-sm">
                <div class="flex items-center justify-between font-black border-b border-blue-200/60 pb-1.5">
                    <span class="text-slate-900">${o.id}</span>
                    <span class="text-blue-800 text-[10px] bg-blue-200/80 px-2 py-0.5 rounded-md">Sedang Dibuat</span>
                </div>
                <div>
                    <p class="font-bold text-slate-800">${o.name}</p>
                    <p class="text-[10px] text-slate-500 font-medium">${o.items.map(i => i.name).join(', ')}</p>
                </div>
                <button type="button" onclick="updateOrderStatus('${o.id}', 'Completed')" class="btn-press w-full bg-blue-600 text-white font-black py-1.5 rounded-xl text-[10px] shadow-sm">
                    <i class="fa-solid fa-check mr-1"></i> Selesai & Siap Ambil
                </button>
            </div>
        `;
    });

    completedOrders.forEach(o => {
        let cleanPhone = o.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

        let msgReceipt = `*MAINSTAY DRINK SHOP - STRUK DIGITAL LUNAS*\n----------------------------------------\n📋 *ID Order:* ${o.id}\n Waktu: ${o.timestamp}\n\n👤 Pemesan: ${o.name}\n💰 *TOTAL LUNAS: Rp ${o.total.toLocaleString()}*\n----------------------------------------\nHalo Kak ${o.name}! Pesanan Anda sudah selesai dibuat dan siap diambil / disajikan. Terima kasih!`;

        listCompleted.innerHTML += `
            <div class="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-200 space-y-2 text-xs shadow-sm">
                <div class="flex items-center justify-between font-black border-b border-emerald-200/60 pb-1.5">
                    <span class="text-slate-900">${o.id}</span>
                    <span class="text-emerald-800 text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded-md">Selesai</span>
                </div>
                <div>
                    <p class="font-bold text-slate-800">${o.name}</p>
                    <p class="text-[10px] text-slate-500 font-medium">Rp ${o.total.toLocaleString()}</p>
                </div>
                <div class="grid grid-cols-2 gap-1.5 pt-1">
                    <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgReceipt)}" target="_blank" class="btn-press bg-slate-900 text-themebrand-400 font-bold text-center py-1.5 rounded-xl text-[10px] shadow-sm">
                        <i class="fa-brands fa-whatsapp mr-1"></i> Struk WA
                    </a>
                    <button type="button" onclick="printPhysicalOrder('${o.id}')" class="btn-press bg-slate-100 text-slate-800 font-bold border py-1.5 rounded-xl text-[10px]">
                        <i class="fa-solid fa-print mr-1"></i> Thermal
                    </button>
                </div>
            </div>
        `;
    });
}

function updateOrderStatus(id, newStatus) {
    const order = store.orders.find(o => o.id === id);
    if (order) {
        order.status = newStatus;
        saveStore('orders');
        renderKasirPipeline();
        showToast(`Status Order ${id} diperbarui menjadi ${newStatus}!`);
    }
}

function printPhysicalOrder(id) {
    const order = store.orders.find(o => o.id === id);
    if (order) {
        renderReceipt(order);
        window.print();
    }
}

// ==========================================
// KAMERA ABSENSI LIVE STAF ENGINE
// ==========================================

function openDirectCameraAttendance() {
    const staffSelect = document.getElementById('att-camera-staff');
    if (staffSelect) {
        staffSelect.innerHTML = store.staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }

    const video = document.getElementById('att-video-stream');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
            .then(stream => {
                video.srcObject = stream;
            })
            .catch(err => {
                showToast("Gagal mengakses kamera HP!", true);
            });
    }

    document.getElementById('modal-camera-attendance').classList.remove('hidden');
}

function closeDirectCameraAttendance() {
    const video = document.getElementById('att-video-stream');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('modal-camera-attendance').classList.add('hidden');
}

function captureAndSubmitAttendance(btn) {
    const staffName = document.getElementById('att-camera-staff').value;
    const type = document.getElementById('att-camera-type').value;
    const pin = document.getElementById('att-camera-pin').value;

    const staffObj = store.staff.find(s => s.name === staffName);
    if (!staffObj || staffObj.pin !== pin) {
        showToast("PIN Staf Tidak Valid!", true);
        return;
    }

    const video = document.getElementById('att-video-stream');
    const canvas = document.getElementById('att-photo-canvas');
    if (!canvas || !video) return;

    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL('image/jpeg', 0.7);

    const now = new Date();
    const formattedTime = getFormattedRealTime();

    // Hitung Keterlambatan
    let lateStatus = "Tepat Waktu";
    if (type === 'IN') {
        const [shiftHour, shiftMin] = staffObj.shiftIn.split(':').map(Number);
        const shiftInTime = new Date(now);
        shiftInTime.setHours(shiftHour, shiftMin + (staffObj.toleranceMinutes || 15), 0);

        if (now > shiftInTime) {
            const diffMinutes = Math.floor((now - shiftInTime) / 60000);
            lateStatus = `Terlambat ${diffMinutes} Menit`;
        }
    }

    const attRecord = {
        id: 'ATT-' + Date.now().toString().slice(-4),
        staffName: staffName,
        type: type === 'IN' ? '🟢 Clock-In (Masuk)' : '🔴 Clock-Out (Pulang)',
        timestamp: formattedTime,
        lateStatus: lateStatus,
        photo: photoData
    };

    store.attendance.unshift(attRecord);
    saveStore('attendance');

    triggerButtonLoading(btn, () => {
        document.getElementById('sum-att-name').innerText = staffName;
        document.getElementById('sum-att-type').innerText = attRecord.type;
        document.getElementById('sum-att-time').innerText = formattedTime;
        document.getElementById('sum-att-late').innerText = lateStatus;
        document.getElementById('sum-att-photo').src = photoData;

        document.getElementById('modal-attendance-summary').classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('modal-attendance-summary').classList.add('hidden');
            closeDirectCameraAttendance();
            document.getElementById('att-camera-pin').value = '';
        }, 3000);
    });
}

// ==========================================
// OWNER DASHBOARD & TAB MANAGEMENT
// ==========================================

function setOwnerTab(tabName) {
    const tabs = ['ownerprofile', 'staffhrm', 'attendancelog', 'branding', 'banners', 'categories', 'inventory', 'flashsale', 'stamps', 'integrations', 'backup'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-owner-${t}`);
        const content = document.getElementById(`owner-content-${t}`);
        if (btn) btn.classList.remove('active');
        if (content) content.classList.add('hidden');
    });

    const activeBtn = document.getElementById(`tab-owner-${tabName}`);
    const activeContent = document.getElementById(`owner-content-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');
    if (activeContent) activeContent.classList.remove('hidden');

    if (tabName === 'inventory') renderOwnerInventory();
    if (tabName === 'staffhrm') renderStaffHRMTab();
    if (tabName === 'attendancelog') renderAttendanceLogTab();
    if (tabName === 'categories') renderOwnerCategories();
    if (tabName === 'banners') renderOwnerBanners();
    if (tabName === 'flashsale') renderFlashSaleTab();
    if (tabName === 'stamps') renderOwnerMemberStamps();
}

function renderOwnerProfileTab() {
    if (document.getElementById('ow-name')) document.getElementById('ow-name').value = store.ownerProfile.name || '';
    if (document.getElementById('ow-pin')) document.getElementById('ow-pin').value = store.ownerProfile.pin || '';
    if (document.getElementById('ow-bank')) document.getElementById('ow-bank').value = store.ownerProfile.bank || '';
    if (document.getElementById('ow-rekening')) document.getElementById('ow-rekening').value = store.ownerProfile.rekening || '';
    if (document.getElementById('cfg-ow-photo-url')) document.getElementById('cfg-ow-photo-url').value = store.ownerProfile.photoUrl || '';
    if (document.getElementById('cfg-ow-qris-url')) document.getElementById('cfg-ow-qris-url').value = store.ownerProfile.qrisUrl || '';
}

function saveOwnerProfile(btn) {
    store.ownerProfile.name = document.getElementById('ow-name').value;
    store.ownerProfile.pin = document.getElementById('ow-pin').value;
    store.ownerProfile.bank = document.getElementById('ow-bank').value;
    store.ownerProfile.rekening = document.getElementById('ow-rekening').value;
    store.ownerProfile.photoUrl = document.getElementById('cfg-ow-photo-url').value;
    store.ownerProfile.qrisUrl = document.getElementById('cfg-ow-qris-url').value;

    saveStore('ownerProfile');
    triggerButtonLoading(btn, () => {
        showToast("Profil Owner Berhasil Diperbarui!");
    });
}

function saveBrandingConfig(btn) {
    store.theme.ftTitle = document.getElementById('cfg-ft-title').value;
    store.theme.ftDesc = document.getElementById('cfg-ft-desc').value;
    store.theme.linkGrab = document.getElementById('cfg-link-grab').value;
    store.theme.linkGoFood = document.getElementById('cfg-link-gofood').value;
    store.theme.linkIg = document.getElementById('cfg-link-ig').value;
    store.theme.linkTikTok = document.getElementById('cfg-link-tiktok').value;
    store.theme.linkMaps = document.getElementById('cfg-link-maps').value;

    saveStore('theme');
    applyBrandingUI();
    triggerButtonLoading(btn, () => {
        showToast("Konfigurasi Branding & Link Medsos Tersimpan!");
    });
}

// STAF & PENGGAJIAN (HRM)
function renderStaffHRMTab() {
    const container = document.getElementById('hrm-staff-list');
    if (!container) return;

    container.innerHTML = store.staff.map(s => `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2 text-xs">
            <div class="flex justify-between items-center border-b pb-2">
                <div>
                    <p class="font-extrabold text-sm text-slate-900">${s.name}</p>
                    <p class="text-[10px] text-themebrand-700 font-bold">Shift: ${s.shiftIn} - ${s.shiftOut} (Toleransi ${s.toleranceMinutes}m)</p>
                </div>
                <button type="button" onclick="deleteStaff(${s.id})" class="text-rose-500 hover:text-rose-700 font-bold"><i class="fa-solid fa-trash-can"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <p><strong>WA:</strong> ${s.phone}</p>
                <p><strong>PIN:</strong> ${s.pin}</p>
                <p><strong>Skema Gaji:</strong> ${s.salaryType} (Rp ${s.salaryRate.toLocaleString()})</p>
                <p><strong>Denda/Jam:</strong> Rp ${s.lateFinePerHour.toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

function submitStaffProfile(btn) {
    const name = document.getElementById('hrm-staff-name').value;
    const phone = document.getElementById('hrm-staff-phone').value;
    const pin = document.getElementById('hrm-staff-pin').value;

    if (!name || !phone || !pin) {
        showToast("Mohon lengkapi data Staf!", true);
        return;
    }

    const newStaff = {
        id: Date.now(),
        name: name,
        phone: phone,
        pin: pin,
        shiftIn: document.getElementById('hrm-shift-in').value || "08:00",
        shiftOut: document.getElementById('hrm-shift-out').value || "16:00",
        toleranceMinutes: parseInt(document.getElementById('hrm-shift-tolerance').value) || 15,
        salaryType: document.getElementById('hrm-salary-type').value,
        salaryRate: parseInt(document.getElementById('hrm-salary-rate').value) || 0,
        lateFinePerHour: parseInt(document.getElementById('hrm-late-fine').value) || 0
    };

    store.staff.push(newStaff);
    saveStore('staff');
    triggerButtonLoading(btn, () => {
        renderStaffHRMTab();
        showToast("Profil Staf Berhasil Ditambahkan!");
    });
}

function deleteStaff(id) {
    store.staff = store.staff.filter(s => s.id !== id);
    saveStore('staff');
    renderStaffHRMTab();
    showToast("Staf Dihapus!");
}

// LOG ABSENSI
function renderAttendanceLogTab() {
    const grid = document.getElementById('owner-attendance-grid');
    if (!grid) return;

    if (store.attendance.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-slate-400 font-medium py-6">Belum ada riwayat absensi staf.</p>`;
        return;
    }

    grid.innerHTML = store.attendance.map(a => `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-2">
            <img src="${a.photo || 'https://via.placeholder.com/150'}" class="w-full h-32 object-cover rounded-xl border">
            <p class="font-extrabold text-slate-900">${a.staffName}</p>
            <p class="text-[10px] font-bold text-amber-800">${a.type}</p>
            <p class="text-[9px] text-slate-500">${a.timestamp}</p>
            <p class="text-[10px] font-black ${a.lateStatus.includes('Terlambat') ? 'text-rose-600' : 'text-emerald-600'}">${a.lateStatus}</p>
        </div>
    `).join('');
}

function exportAttendanceCSV() {
    let csv = "ID,Nama Staf,Tipe,Waktu,Status\n";
    store.attendance.forEach(a => {
        csv += `"${a.id}","${a.staffName}","${a.type}","${a.timestamp}","${a.lateStatus}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_Absensi_Staf_${Date.now()}.csv`;
    a.click();
    showToast("File CSV Absensi Berhasil Diunduh!");
}

// INVENTORY & TOGGLE VARIAN
function renderOwnerInventory() {
    const grid = document.getElementById('owner-inventory-grid');
    const catSelect = document.getElementById('menu-category');

    if (catSelect) {
        catSelect.innerHTML = store.categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (!grid) return;

    grid.innerHTML = store.menu.map(m => `
        <div class="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs">
            <img src="${m.image || 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=500&q=80'}" class="w-14 h-14 rounded-xl object-cover shrink-0">
            <div class="flex-1 min-w-0">
                <p class="font-black text-slate-900 truncate">${m.name}</p>
                <p class="text-[10px] text-slate-500 font-bold">${m.category} • Rp ${m.price.toLocaleString()}</p>
                <div class="flex gap-1.5 mt-1 text-[9px] text-slate-400 font-bold">
                    <span>Es: ${m.optIce !== false ? '✅' : '❌'}</span>
                    <span>Gula: ${m.optSugar !== false ? '✅' : '❌'}</span>
                    <span>Hangat: ${m.optHot ? '✅' : '❌'}</span>
                    <span>Boba: ${m.optBoba !== false ? '✅' : '❌'}</span>
                </div>
            </div>
            <button type="button" onclick="deleteMenuItem(${m.id})" class="text-rose-500 hover:text-rose-700 p-2 font-bold"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
}

function submitMenuItem(btn) {
    const name = document.getElementById('menu-name').value;
    const category = document.getElementById('menu-category').value;
    const price = parseInt(document.getElementById('menu-price').value) || 0;
    const desc = document.getElementById('menu-desc').value;
    const image = document.getElementById('menu-img').value;

    if (!name || price <= 0) {
        showToast("Mohon isi nama dan harga menu!", true);
        return;
    }

    const newItem = {
        id: Date.now(),
        name: name,
        category: category,
        price: price,
        desc: desc,
        image: image,
        optIce: document.getElementById('m-opt-ice').checked,
        optHot: document.getElementById('m-opt-hot').checked,
        optSugar: document.getElementById('m-opt-sugar').checked,
        optBoba: document.getElementById('m-opt-boba').checked
    };

    store.menu.push(newItem);
    saveStore('menu');
    triggerButtonLoading(btn, () => {
        renderOwnerInventory();
        renderCustomerMenu();
        showToast("Menu baru berhasil ditambahkan!");
    });
}

function deleteMenuItem(id) {
    store.menu = store.menu.filter(m => m.id !== id);
    saveStore('menu');
    renderOwnerInventory();
    renderCustomerMenu();
    showToast("Menu berhasil dihapus!");
}

// BANNERS, CATEGORIES, FLASH SALE, STAMPS
function renderOwnerBanners() {
    const container = document.getElementById('owner-banners-list');
    if (!container) return;
    container.innerHTML = store.banners.map(b => `
        <div class="bg-white p-3 rounded-2xl border flex justify-between items-center text-xs">
            <div><p class="font-bold">${b.title}</p><p class="text-[10px] text-slate-500">${b.tag}</p></div>
            <button type="button" onclick="deleteBanner(${b.id})" class="text-rose-500 font-bold"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
}

function submitBannerItem(btn) {
    const newBanner = {
        id: Date.now(),
        tag: document.getElementById('banner-tag').value || '🥤 PROMO',
        title: document.getElementById('banner-title').value || 'Promo Baru',
        desc: document.getElementById('banner-desc').value || '',
        image: document.getElementById('banner-img').value || ''
    };
    store.banners.push(newBanner);
    saveStore('banners');
    triggerButtonLoading(btn, () => {
        renderOwnerBanners();
        initCarousel();
        showToast("Banner Iklan Ditambahkan!");
    });
}

function deleteBanner(id) {
    store.banners = store.banners.filter(b => b.id !== id);
    saveStore('banners');
    renderOwnerBanners();
    initCarousel();
    showToast("Banner Dihapus!");
}

function renderOwnerCategories() {
    const container = document.getElementById('owner-categories-list');
    if (!container) return;
    container.innerHTML = store.categories.map(c => `
        <div class="bg-white p-2.5 rounded-2xl border flex justify-between items-center text-xs font-bold">
            <span>${c}</span>
            <button type="button" onclick="deleteCategory('${c}')" class="text-rose-500"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `).join('');
}

function addCategory() {
    const val = document.getElementById('cat-new-name').value;
    if (val && !store.categories.includes(val)) {
        store.categories.push(val);
        saveStore('categories');
        renderOwnerCategories();
        renderCustomerCategories();
        showToast("Kategori Ditambahkan!");
    }
}

function deleteCategory(cat) {
    store.categories = store.categories.filter(c => c !== cat);
    saveStore('categories');
    renderOwnerCategories();
    renderCustomerCategories();
    showToast("Kategori Dihapus!");
}

function renderFlashSaleTab() {
    const select = document.getElementById('flash-sale-item-select');
    if (select) {
        select.innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name} (Harga Normal: Rp ${m.price.toLocaleString()})</option>`).join('');
    }
}

function saveFlashSaleConfig(btn) {
    const itemId = parseInt(document.getElementById('flash-sale-item-select').value);
    const flashPrice = parseInt(document.getElementById('flash-sale-price-input').value);

    if (itemId && flashPrice > 0) {
        store.flashSaleItem = { id: itemId, flashPrice: flashPrice };
        saveStore('flashSaleItem');
        triggerButtonLoading(btn, () => {
            renderCustomerMenu();
            showToast("Flash Sale Diaktifkan!");
        });
    }
}

function disableFlashSale() {
    store.flashSaleItem = null;
    saveStore('flashSaleItem');
    renderCustomerMenu();
    showToast("Flash Sale Dimatikan!");
}

function renderOwnerMemberStamps() {
    const inputSpend = document.getElementById('stamp-min-spend');
    const selectItem = document.getElementById('stamp-reward-item-select');

    if (inputSpend) inputSpend.value = store.stampMinSpend;
    if (selectItem) {
        selectItem.innerHTML = store.menu.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        selectItem.value = store.stampRewardItemId;
    }
}

function saveStampRules(btn) {
    store.stampMinSpend = parseInt(document.getElementById('stamp-min-spend').value) || 20000;
    store.stampRewardItemId = parseInt(document.getElementById('stamp-reward-item-select').value);

    localStorage.setItem('app_stamp_min_spend', store.stampMinSpend);
    localStorage.setItem('app_stamp_reward_item_id', store.stampRewardItemId);

    triggerButtonLoading(btn, () => {
        updateStampRuleDescription();
        showToast("Aturan Stempel Tersimpan!");
    });
}

// INTEGRATION & BACKUP
function saveSheetWebhook(btn) {
    store.theme.sheetWebhookUrl = document.getElementById('cfg-sheet-url').value;
    saveStore('theme');
    triggerButtonLoading(btn, () => {
        showToast("URL Webhook Google Sheets Tersimpan!");
    });
}

function manualSyncGoogleSheets(btn) {
    if (!store.theme.sheetWebhookUrl) {
        showToast("URL Webhook Google Sheets belum diisi!", true);
        return;
    }

    triggerButtonLoading(btn, () => {
        fetch(store.theme.sheetWebhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orders: store.orders, attendance: store.attendance })
        }).then(() => {
            showToast("Sinkronkan Google Sheets Berhasil!");
        }).catch(() => {
            showToast("Gagal Sinkronkan Google Sheets!", true);
        });
    });
}

function downloadJSONBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Backup_Mainstay_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
}

function restoreJSONBackup(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                store = { ...store, ...imported };
                Object.keys(store).forEach(k => saveStore(k));
                location.reload();
            } catch (err) {
                showToast("Format File JSON Tidak Valid!", true);
            }
        };
        reader.readAsText(file);
    }
}

// ==========================================
// STATISTIK OMSET & CHART.JS ENGINE
// ==========================================

let salesChartInstance = null;

function updateOwnerStats() {
    const filter = document.getElementById('stat-range-filter') ? document.getElementById('stat-range-filter').value : 'today';
    const now = new Date();

    let filteredOrders = store.orders.filter(o => o.status === 'Completed' || o.status === 'Cooking');

    if (filter === 'today') {
        filteredOrders = filteredOrders.filter(o => {
            const d = new Date(o.timestamp);
            return d.toDateString() === now.toDateString();
        });
    } else if (filter === '7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filteredOrders = filteredOrders.filter(o => new Date(o.timestamp) >= sevenDaysAgo);
    } else if (filter === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filteredOrders = filteredOrders.filter(o => new Date(o.timestamp) >= thirtyDaysAgo);
    }

    const totalRev = filteredOrders.reduce((a, b) => a + (b.total || 0), 0);
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').innerText = `Rp ${totalRev.toLocaleString()}`;
    if (document.getElementById('stat-orders-count')) document.getElementById('stat-orders-count').innerText = `${filteredOrders.length} Order`;
    if (document.getElementById('stat-menu-count')) document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;
}

function initSalesChart() {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (salesChartInstance) salesChartInstance.destroy();

    const labels = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const dataValues = [150000, 230000, 180000, 320000, 450000, 600000, 520000];

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Omset Penjualan (Rp)',
                data: dataValues,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ==========================================
// QR STAND DISPLAY POSTER ENGINE (4 OPTIONS)
// ==========================================

let selectedQrDesignOption = 1;

function openQrModalOptions() {
    document.getElementById('modal-qr-options').classList.remove('hidden');
    selectQrDesign(1);
}

function closeQrModalOptions() {
    document.getElementById('modal-qr-options').classList.add('hidden');
}

function selectQrDesign(optionNum) {
    selectedQrDesignOption = optionNum;
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn-qr-opt-${i}`);
        if (btn) {
            btn.className = i === optionNum ? 'p-2 rounded-xl font-bold border border-themebrand-500 bg-themebrand-50 text-themebrand-900 shadow-sm text-left' : 'p-2 rounded-xl font-bold border border-slate-200 bg-white text-slate-700 text-left';
        }
    }

    const header = document.getElementById('qr-poster-header');
    const qrBox = document.getElementById('qr-code-box');
    const footer = document.getElementById('qr-poster-footer');

    if (!header || !qrBox || !footer) return;

    qrBox.innerHTML = '';
    new QRCode(qrBox, {
        text: `https://mainstaydrink.shop/menu?store=${encodeURIComponent(store.theme.restoName)}`,
        width: 140,
        height: 140
    });

    if (optionNum === 1) {
        header.innerHTML = `<p class="font-black text-sm text-slate-900 uppercase">${store.theme.restoName}</p><p class="text-[9px] text-slate-500 font-bold">SCAN UNTUK PESAN ONLINE</p>`;
        footer.innerHTML = `<p class="text-[8px] text-slate-400 font-bold">Powered by Mainstay POS</p>`;
    } else if (optionNum === 2) {
        header.innerHTML = `<p class="font-black text-base text-themebrand-700 uppercase">🥤 ${store.theme.restoName}</p><p class="text-[10px] text-slate-800 font-extrabold">Pesan & Bayar Tanpa Antre!</p>`;
        footer.innerHTML = `<p class="text-[9px] text-slate-600 font-bold">1. Scan QR  2. Pilih Menu  3. Bayar</p>`;
    } else if (optionNum === 3) {
        header.innerHTML = `<p class="font-black text-lg text-rose-600 tracking-tight">HATI-HATI KETAGIHAN! 🧋</p><p class="text-[10px] text-slate-900 font-bold">Scan QR Di Bawah Untuk Lihat Menu Spesial Hari Ini</p>`;
        footer.innerHTML = `<p class="text-[10px] text-themebrand-700 font-black">GET YOUR FAVORITE DRINK NOW!</p>`;
    } else if (optionNum === 4) {
        header.innerHTML = `<p class="font-black text-xs text-slate-900">${store.theme.restoName}</p>`;
        footer.innerHTML = `<p class="text-[8px] text-slate-500 font-bold">Scan Me!</p>`;
    }
}

function downloadSelectedQrPNG(btn) {
    showToast("Mengunduh Poster QR Display Toko...");
}

function printSelectedQrStandee() {
    window.print();
}
