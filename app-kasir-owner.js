// OPERASIONAL KASIR & PIPELINE KITCHEN
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

    grid.innerHTML = '';
    filtered.forEach(m => {
        grid.innerHTML += `
            <div class="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div class="flex items-center gap-2">
                    <img src="${m.image || 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=500&q=80'}" class="w-10 h-10 rounded-xl object-cover shrink-0">
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

    return ordersList.map(o => `
        <div class="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b pb-1 font-extrabold">
                <span class="text-slate-900">${o.id}</span>
                <span class="text-[10px] text-amber-700 font-bold">${o.type.toUpperCase()}</span>
            </div>
            <p class="font-bold text-slate-800">${o.name} (${o.phone})</p>
            <div class="flex items-center justify-between pt-1">
                <span class="font-black text-slate-900">Rp ${o.total.toLocaleString('id-ID')}</span>
                <div class="flex items-center gap-1">
                    ${statusType === 'Pending' ? `<button type="button" onclick="updateOrderStatus('${o.id}', 'Cooking')" class="px-2 py-1 bg-blue-600 text-white rounded-lg font-bold text-[10px]">Buat</button>` : ''}
                    ${statusType === 'Cooking' ? `<button type="button" onclick="updateOrderStatus('${o.id}', 'Completed')" class="px-2 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[10px]">Selesai</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

function updateOrderStatus(id, newStatus) {
    const order = store.orders.find(o => o.id === id);
    if (order && order.firebaseKey) {
        db.ref(`orders/${order.firebaseKey}`).update({ status: newStatus }).then(() => {
            showToast(`Status Order ${id} diperbarui!`);
        });
    }
}

// DASHBOARD OWNER NAVIGATION
function setOwnerTab(tab) {
    const tabs = ['branding', 'members', 'inventory', 'banners', 'staffhrm', 'ownerprofile'];
    tabs.forEach(t => {
        document.getElementById(`owner-content-${t}`)?.classList.add('hidden');
        document.getElementById(`tab-owner-${t}`)?.classList.remove('active');
    });

    document.getElementById(`owner-content-${tab}`)?.classList.remove('hidden');
    document.getElementById(`tab-owner-${tab}`)?.classList.add('active');

    if (tab === 'branding') renderOwnerBrandingTab();
    if (tab === 'members') renderOwnerMembersTable();
    if (tab === 'inventory') renderOwnerInventory();
}

function renderOwnerBrandingTab() {
    if (document.getElementById('cfg-resto-name')) document.getElementById('cfg-resto-name').value = store.theme.restoName || '';
    if (document.getElementById('cfg-resto-phone')) document.getElementById('cfg-resto-phone').value = store.theme.restoPhone || '';
    if (document.getElementById('cfg-broadcast-wa-link')) document.getElementById('cfg-broadcast-wa-link').value = store.theme.broadcastWaLink || '';
    if (document.getElementById('cfg-logo-url')) document.getElementById('cfg-logo-url').value = store.theme.logoUrl || '';
}

function saveBrandingConfig(btn) {
    store.theme.restoName = document.getElementById('cfg-resto-name').value;
    store.theme.restoPhone = document.getElementById('cfg-resto-phone').value;
    store.theme.broadcastWaLink = document.getElementById('cfg-broadcast-wa-link').value;
    store.theme.logoUrl = document.getElementById('cfg-logo-url').value;

    saveStore('theme');
    applyBrandingUI();
    showToast("Pengaturan Branding Tersimpan!");
}

function renderOwnerMembersTable() {
    const tbody = document.getElementById('owner-members-tbody');
    if (!tbody) return;

    if (store.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-bold">Belum ada member terdaftar.</td></tr>`;
        return;
    }

    tbody.innerHTML = store.members.map(m => `
        <tr class="hover:bg-slate-50 font-semibold">
            <td class="p-2 text-slate-900 font-extrabold">${m.name}</td>
            <td class="p-2 text-slate-600">${m.phone}</td>
            <td class="p-2 text-[10px] text-slate-500">${m.joinedAt || '-'}</td>
            <td class="p-2 text-center">
                <a href="https://wa.me/${m.phone}" target="_blank" class="px-2 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[10px]"><i class="fa-brands fa-whatsapp"></i> Chat</a>
            </td>
        </tr>
    `).join('');
}

function updateOwnerStats() {
    const totalRev = store.orders.reduce((a, b) => a + (b.total || 0), 0);
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').innerText = `Rp ${totalRev.toLocaleString('id-ID')}`;
    if (document.getElementById('stat-orders-count')) document.getElementById('stat-orders-count').innerText = `${store.orders.length} Order`;
    if (document.getElementById('stat-menu-count')) document.getElementById('stat-menu-count').innerText = `${store.menu.length} Item`;
}
