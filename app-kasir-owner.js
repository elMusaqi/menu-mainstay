// LOGIKA KASIR & OWNER DASHBOARD

function renderKasirPipeline() {
    const lists = { pending: [], cooking: [], completed: [] };
    store.orders.forEach(o => {
        const itemHtml = `
            <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div class="flex justify-between font-bold"><span>${o.id}</span><span>${o.name}</span></div>
                <div class="text-[10px] text-slate-500">${o.items.map(i => i.name).join(', ')}</div>
                <div class="flex gap-1.5 mt-2">
                    ${o.status === 'Pending' ? `
                        <a href="https://wa.me/${o.phone.replace(/[^0-9]/g, '')}" target="_blank" class="flex-1 bg-emerald-500 text-white text-center py-1.5 rounded-lg font-bold">📱 Cek WA</a>
                        <button onclick="updateOrderStatus('${o.id}', 'Cooking')" class="flex-1 bg-slate-900 text-white py-1.5 rounded-lg font-bold">Konfirmasi Lunas</button>
                    ` : o.status === 'Cooking' ? `
                        <button onclick="updateOrderStatus('${o.id}', 'Completed')" class="w-full bg-themebrand-600 text-white py-1.5 rounded-lg font-bold">Selesai / Siap Ambil</button>
                    ` : `
                        <button onclick="sendDigitalReceipt('${o.id}')" class="w-full bg-blue-600 text-white py-1.5 rounded-lg font-bold">Kirim Struk WA</button>
                    `}
                </div>
            </div>
        `;
        lists[o.status.toLowerCase()].push(itemHtml);
    });
    
    document.getElementById('list-pending').innerHTML = lists.pending.join('');
    document.getElementById('list-cooking').innerHTML = lists.cooking.join('');
    document.getElementById('list-completed').innerHTML = lists.completed.join('');
    
    document.getElementById('cnt-pending').innerText = lists.pending.length;
    document.getElementById('cnt-cooking').innerText = lists.cooking.length;
    document.getElementById('cnt-completed').innerText = lists.completed.length;
}

function updateOrderStatus(id, status) {
    const order = store.orders.find(o => o.id === id);
    if (order) {
        order.status = status;
        saveStore('orders');
        renderKasirPipeline();
        showToast(`Pesanan ${id} kini: ${status}`);
    }
}

function sendDigitalReceipt(id) {
    const o = store.orders.find(ord => ord.id === id);
    let msg = `*MAINSTAY DRINK SHOP - STRUK DIGITAL LUNAS*\n----------------------------------------\nID Order: ${o.id}\nStatus: LUNAS / PAID\nTotal: Rp ${o.total.toLocaleString()}\n\nTerima kasih Kak ${o.name}! Pesanan Anda sudah siap.\nUnduh Struk: https://mainstaydrink.shop/receipt/${o.id}`;
    window.open(`https://wa.me/${o.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
}

// FUNGSI ABSENSI KAMERA LIVE
function openDirectCameraAttendance() {
    const video = document.getElementById('att-video-stream');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } }).then(stream => { video.srcObject = stream; });
    document.getElementById('modal-camera-attendance').classList.remove('hidden');
}

function closeDirectCameraAttendance() {
    const video = document.getElementById('att-video-stream');
    if (video.srcObject) video.srcObject.getTracks().forEach(track => track.stop());
    document.getElementById('modal-camera-attendance').classList.add('hidden');
}

function captureAndSubmitAttendance(btn) {
    const canvas = document.getElementById('att-photo-canvas');
    const video = document.getElementById('att-video-stream');
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL('image/jpeg');

    const entry = {
        name: document.getElementById('att-camera-staff').value,
        type: document.getElementById('att-camera-type').value,
        time: new Date().toISOString(),
        photo: photo
    };
    store.attendance.push(entry);
    saveStore('attendance');
    
    // Tampilkan Ringkasan & Tutup Otomatis 3 Detik
    document.getElementById('sum-att-name').innerText = entry.name;
    document.getElementById('sum-att-photo').src = photo;
    document.getElementById('modal-attendance-summary').classList.remove('hidden');
    setTimeout(() => { document.getElementById('modal-attendance-summary').classList.add('hidden'); closeDirectCameraAttendance(); }, 3000);
}

// FUNGSI PEMBARUAN BRANDING & LINK
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
    showToast("Konfigurasi Branding Tersimpan!");
}
