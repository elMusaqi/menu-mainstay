/* ==========================================================================
   MAINSTAY DRINK - CORE APP LOGIC & POS SYSTEM
   Fungsi: Render Katalog, Keranjang, Checkout WA, Profiling Staf, & Voucher
   ========================================================================== */

// ==========================================================================
// 1. DATA DUMMY AWAL
// ==========================================================================
let catalogItems = [
    { id: 1, name: "Es Kopi Mainstay", category: "coffee", price: 18000, desc: "Kopi susu gula aren khas Mainstay dengan cita rasa creamy.", img: "https://via.placeholder.com/200/D97706/FFFFFF?text=Es+Kopi" },
    { id: 2, name: "Americano Fresh", category: "coffee", price: 15000, desc: "Double shot espresso dengan air mineral dingin segar.", img: "https://via.placeholder.com/200/1E293B/FFFFFF?text=Americano" },
    { id: 3, name: "Matcha Latte Creamy", category: "non-coffee", price: 22000, desc: "Bubuk matcha Jepang asli dipadukan dengan susu segar.", img: "https://via.placeholder.com/200/059669/FFFFFF?text=Matcha" },
    { id: 4, name: "Chocolate Melt", category: "non-coffee", price: 20000, desc: "Cokelat pekat pilihan dengan tekstur lembut.", img: "https://via.placeholder.com/200/b45309/FFFFFF?text=Chocolate" }
];

let activeVouchers = [
    { code: "MAINSTAT10", type: "nominal", value: 10000, status: "Aktif" },
    { code: "DISKON20", type: "percentage", value: 20, status: "Aktif" }
];

let staffMembers = [
    { id: 201, name: "Jasir Kiram", role: "Kasir Toko", shift: "09:00 - 17:00", status: "active", avatar: "https://via.placeholder.com/50/111827/FFFFFF?text=JK" },
    { id: 202, name: "Hamar Kdano", role: "Staf Barista", shift: "15:00 - 22:00", status: "offline", avatar: "https://via.placeholder.com/50/059669/FFFFFF?text=HK" }
];

let currentCart = [];
let activeCartDiscount = 0;
let selectedProduct = null;
let currentModalQty = 1;


// ==========================================================================
// 2. SISTEM MANAJEMEN MODAL
// ==========================================================================
function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove("active");
}

function openOwnerPinModal() {
    document.getElementById("ownerPinModal").classList.add("active");
}

function verifyOwnerPin() {
    const pin = document.getElementById("ownerPinInput").value;
    if (pin === "1234" || pin === "8888") { // PIN Master (Contoh)
        closeModal("ownerPinModal");
        document.getElementById("ownerDashboardModal").classList.add("active");
        
        // Ubah status toko menjadi BUKA
        const badge = document.getElementById("storeStatusBadge");
        if (badge) {
            badge.classList.remove("closed");
            badge.classList.add("open");
            document.getElementById("storeStatusText").innerText = "BUKA";
        }
    } else {
        alert("PIN Master Owner Salah! Akses Ditolak.");
    }
}

// Navigasi Tab di dalam Dasbor Owner
function switchOwnerTab(tabId) {
    // Sembunyikan semua tab konten
    document.querySelectorAll(".owner-tab-content").forEach(el => el.style.display = "none");
    // Hapus status aktif di tombol
    document.querySelectorAll(".owner-nav-tabs .filter-pill").forEach(el => el.classList.remove("active"));
    
    // Tampilkan yang dipilih
    document.getElementById(tabId).style.display = "block";
    event.currentTarget.classList.add("active");
}


// ==========================================================================
// 3. RENDER KATALOG & KUSTOMISASI MINUMAN
// ==========================================================================
function renderCatalog(category = 'all') {
    const grid = document.getElementById("catalogGrid");
    if (!grid) return;
    grid.innerHTML = "";

    const filtered = category === 'all' ? catalogItems : catalogItems.filter(i => i.category === category);

    filtered.forEach(item => {
        grid.innerHTML += `
            <div class="product-card" onclick="openProductModal(${item.id})">
                <img src="${item.img}" class="product-img" alt="${item.name}">
                <div class="product-info">
                    <h4 class="product-title">${item.name}</h4>
                    <p class="product-desc">${item.desc}</p>
                    <span class="product-price">Rp ${item.price.toLocaleString('id-ID')}</span>
                    <button class="btn-orange full-width mt-2">Tambah</button>
                </div>
            </div>
        `;
    });
}

function filterCatalogCategory(cat) {
    document.querySelectorAll("#categoryTabs .filter-pill").forEach(p => p.classList.remove("active"));
    event.currentTarget.classList.add("active");
    renderCatalog(cat);
}

function openProductModal(id) {
    selectedProduct = catalogItems.find(p => p.id === id);
    if (!selectedProduct) return;

    document.getElementById("modalProductName").innerText = selectedProduct.name;
    document.getElementById("modalProductPrice").innerText = "Rp " + selectedProduct.price.toLocaleString('id-ID');
    document.getElementById("modalProductDesc").innerText = selectedProduct.desc;
    document.getElementById("modalProductImage").src = selectedProduct.img;
    
    // Reset Qty & Pilihan
    currentModalQty = 1;
    document.getElementById("modalQtyValue").innerText = currentModalQty;
    document.querySelectorAll('input[name="topping"]').forEach(cb => cb.checked = false);
    document.getElementById("modalSpecialNotes").value = "";

    document.getElementById("productDetailModal").classList.add("active");
}

function adjustQty(amount) {
    currentModalQty += amount;
    if (currentModalQty < 1) currentModalQty = 1;
    document.getElementById("modalQtyValue").innerText = currentModalQty;
    calcModalPrice();
}

function calcModalPrice() {
    if (!selectedProduct) return;
    let base = selectedProduct.price;
    document.querySelectorAll('input[name="topping"]:checked').forEach(cb => {
        base += parseFloat(cb.getAttribute("data-price") || 0);
    });
    const total = base * currentModalQty;
    document.getElementById("modalProductPrice").innerText = "Rp " + total.toLocaleString('id-ID');
}


// ==========================================================================
// 4. LOGIKA KERANJANG & CHECKOUT WA
// ==========================================================================
function addToCartFromModal() {
    let toppings = [];
    let toppingPrice = 0;
    
    document.querySelectorAll('input[name="topping"]:checked').forEach(cb => {
        toppings.push(cb.value);
        toppingPrice += parseFloat(cb.getAttribute("data-price") || 0);
    });

    const levelEs = document.querySelector('input[name="levelEs"]:checked')?.value || 'Normal';
    const levelGula = document.querySelector('input[name="levelGula"]:checked')?.value || 'Normal';
    const notes = document.getElementById("modalSpecialNotes").value;

    const unitPrice = selectedProduct.price + toppingPrice;

    currentCart.push({
        id: selectedProduct.id,
        name: selectedProduct.name,
        price: unitPrice,
        qty: currentModalQty,
        levelEs, levelGula, toppings, notes
    });

    closeModal("productDetailModal");
    updateCartDisplay();
    
    // Panggil Notifikasi Suara & Kedip (dari admin-kasir.js)
    if (typeof triggerNewOrderNotification === 'function') {
        triggerNewOrderNotification();
    }
}

function updateCartDisplay() {
    const list = document.getElementById("cartItemsList");
    const floatingCart = document.getElementById("floatingCart");
    let subtotal = 0;
    let totalItems = 0;

    if (currentCart.length === 0) {
        if(list) list.innerHTML = `<p class="text-muted text-center" style="padding:20px 0;">Keranjang masih kosong</p>`;
        document.getElementById("cartSubtotal").innerText = "Rp 0";
        document.getElementById("cartDiscount").innerText = "-Rp 0";
        document.getElementById("cartTotal").innerText = "Rp 0";
        floatingCart.style.display = "none";
        return;
    }

    floatingCart.style.display = "block"; // Munculkan cart melayang
    if(list) list.innerHTML = "";

    currentCart.forEach(item => {
        let itemSub = item.price * item.qty;
        subtotal += itemSub;
        totalItems += item.qty;

        if(list) {
            list.innerHTML += `
                <div style="margin-bottom: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong style="font-size:0.95rem; color:var(--dark-main);">${item.name} <span style="color:var(--primary-orange);">x${item.qty}</span></strong>
                        <strong style="font-size:0.95rem;">Rp ${itemSub.toLocaleString('id-ID')}</strong>
                    </div>
                    <div class="text-muted" style="font-size:0.8rem; margin-top:4px;">
                        Es: ${item.levelEs} | Gula: ${item.levelGula}
                        ${item.toppings.length ? '<br>Topping: ' + item.toppings.join(', ') : ''}
                        ${item.notes ? '<br>Catatan: ' + item.notes : ''}
                    </div>
                </div>
            `;
        }
    });

    const finalTotal = Math.max(0, subtotal - activeCartDiscount);

    // Update Angka di Floating Cart
    document.getElementById("floatingCartCount").innerText = totalItems;
    document.getElementById("floatingCartTotal").innerText = "Rp " + finalTotal.toLocaleString('id-ID');

    // Update Angka di Modal Checkout
    if(document.getElementById("cartSubtotal")){
        document.getElementById("cartSubtotal").innerText = "Rp " + subtotal.toLocaleString('id-ID');
        document.getElementById("cartDiscount").innerText = "-Rp " + activeCartDiscount.toLocaleString('id-ID');
        document.getElementById("cartTotal").innerText = "Rp " + finalTotal.toLocaleString('id-ID');
    }
}

function openCartModal() {
    document.getElementById("cartModal").classList.add("active");
}

function applyCartVoucher() {
    const code = document.getElementById("cartVoucherInput").value.trim().toUpperCase();
    const voucher = activeVouchers.find(v => v.code === code);

    if (!voucher) {
        alert("Kode voucher tidak valid atau tidak ditemukan!");
        return;
    }

    if (voucher.type === "nominal") {
        activeCartDiscount = voucher.value;
    } else {
        // Kalkulasi diskon persentase berdasarkan subtotal
        let subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        activeCartDiscount = subtotal * (voucher.value / 100);
    }
    
    updateCartDisplay();
    alert(`Promo berhasil! Anda mendapat potongan Rp ${activeCartDiscount.toLocaleString('id-ID')}`);
}

function processWhatsAppCheckout() {
    const custName = document.getElementById("custNameInput").value;
    const custPhone = document.getElementById("custPhoneInput").value;

    if (currentCart.length === 0) {
        alert("Keranjang masih kosong!"); return;
    }
    if (!custName || !custPhone) {
        alert("Mohon lengkapi Nama dan Nomor WhatsApp pemesan."); return;
    }

    const orderType = document.querySelector('input[name="orderType"]:checked').value;
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    let text = `Halo *Mainstay Drink*, pesanan baru masuk! 🥤\n\n`;
    text += `👤 *Pemesan:* ${custName} (${custPhone})\n`;
    text += `🏷️ *Tipe Pesanan:* ${orderType}\n`;
    text += `💳 *Pembayaran:* ${paymentMethod}\n\n`;
    text += `*DAFTAR PESANAN:*\n`;
    
    currentCart.forEach(i => {
        text += `▪️ ${i.name} (x${i.qty})\n`;
        text += `   Es: ${i.levelEs}, Gula: ${i.levelGula}\n`;
        if(i.toppings.length) text += `   Topping: ${i.toppings.join(', ')}\n`;
        if(i.notes) text += `   Catatan: ${i.notes}\n`;
    });
    
    text += `\n*Total Tagihan:* ${document.getElementById("cartTotal").innerText}`;

    // Nomor WA Resto (bisa diambil dari storeConfig jika ada)
    const waNumber = "628123456789"; 
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`, "_blank");
}


// ==========================================================================
// 5. MANAJEMEN STAF & VOUCHER (DASBOR OWNER)
// ==========================================================================
function renderOwnerDashboardData() {
    // 1. Render Staf
    const staffList = document.getElementById("ownerStaffListContainer");
    const absentSelect = document.getElementById("absentStaffSelect");
    
    if (staffList) staffList.innerHTML = "";
    if (absentSelect) absentSelect.innerHTML = "";

    staffMembers.forEach(s => {
        let statusDot = s.status === 'active' ? 'active' : (s.status === 'busy' ? 'busy' : 'offline');
        let statusText = s.status === 'active' ? 'Absen Masuk' : (s.status === 'busy' ? 'Melayani Kasir' : 'Pulang/Offline');

        if(staffList) {
            staffList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border-color);">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <img src="${s.avatar}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                        <div>
                            <strong style="color:var(--dark-main);">${s.name}</strong>
                            <div style="font-size:0.75rem; color:var(--text-muted);"><span class="live-status-dot ${statusDot}"></span> ${statusText}</div>
                        </div>
                    </div>
                    <button class="btn-icon-dark" onclick="unlockStaffManualOwner(${s.id})" title="Buka Akses Staf">🔓</button>
                </div>
            `;
        }

        if(absentSelect) {
            absentSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.role})</option>`;
        }
    });

    // 2. Render Voucher
    const voucherList = document.getElementById("ownerVoucherListContainer");
    if(voucherList) {
        voucherList.innerHTML = "";
        activeVouchers.forEach(v => {
            let labelVal = v.type === "nominal" ? `Rp ${v.value.toLocaleString('id-ID')}` : `${v.value}%`;
            voucherList.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--border-color);">
                    <div>
                        <strong style="color:var(--dark-main); font-size:1.05rem;">${v.code}</strong>
                        <p style="font-size:0.8rem; color:var(--primary-green); font-weight:700;">Diskon: ${labelVal}</p>
                    </div>
                    <span class="status-badge open">Aktif</span>
                </div>
            `;
        });
    }
}

function unlockStaffManualOwner(id) {
    const staf = staffMembers.find(s => s.id === id);
    if (staf) {
        staf.status = "active";
        renderOwnerDashboardData();
        alert(`Sesi kasir untuk ${staf.name} berhasil diaktifkan paksa oleh Owner.`);
    }
}

function getActiveStaffCount() {
    return staffMembers.filter(s => s.status === 'active' || s.status === 'busy').length;
}

// Fitur Absensi Kamera (Bisa dipanggil jika staf ingin absen)
function openStaffAbsenceModal() {
    document.getElementById("staffAbsenceModal").classList.add("active");
}

function saveStaffAbsence() {
    const staffId = parseInt(document.getElementById("absentStaffSelect").value);
    const type = document.getElementById("absentTypeSelect").value;
    const pin = document.getElementById("absentPinInput").value;

    if (!pin) {
        alert("Harap masukkan PIN absensi!"); return;
    }

    const staf = staffMembers.find(s => s.id === staffId);
    if (staf) {
        staf.status = type === 'masuk' ? 'active' : 'offline';
        renderOwnerDashboardData();
        closeModal("staffAbsenceModal");
        alert(`Berhasil! Absensi ${type} untuk ${staf.name} tersimpan dengan foto kamera.`);
    }
}

function createNewVoucher() {
    const code = document.getElementById("voucherCode").value.trim().toUpperCase();
    const type = document.getElementById("voucherType").value;
    const value = parseFloat(document.getElementById("voucherValue").value || 0);

    if (!code || !value) {
        alert("Kode dan Nilai Diskon wajib diisi!"); return;
    }

    activeVouchers.push({ code, type, value, status: "Aktif" });
    renderOwnerDashboardData();
    alert("Voucher promo baru siap digunakan!");
}

// ==========================================================================
// 6. INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    renderCatalog();
    renderOwnerDashboardData();
});
