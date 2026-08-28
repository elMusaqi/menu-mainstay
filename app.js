// ============================================================================
// MAINSTAY DRINK E-MENU & POS (CLEAN V2) - BAGIAN 1
// ============================================================================

// ============================================================================
// 1. IMPORT FIREBASE & INISIALISASI (TULANG PUNGGUNG UTUH)
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAwBNnNulXL2MA1QGUOu1BAEqnihqHFn0o",
    authDomain: "mainstay-pos.firebaseapp.com",
    databaseURL: "https://mainstay-pos-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "mainstay-pos",
    storageBucket: "mainstay-pos.firebasestorage.app",
    messagingSenderId: "97498275061",
    appId: "1:97498275061:web:c2088d6672aabb5886b9bc",
    measurementId: "G-WL2PV7WB5L"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ============================================================================
// 2. VARIABEL GLOBAL & STATE APLIKASI
// ============================================================================
window.currentCart = JSON.parse(localStorage.getItem('cartMainstay')) || [];
window.katalogMenu = JSON.parse(localStorage.getItem('dbKatalogMainstay')) || []; 
window.databaseMember = JSON.parse(localStorage.getItem('dbMemberMainstay')) || [];
window.dbStaf = JSON.parse(localStorage.getItem('dbStafMainstay')) || [];
window.dbVoucher = JSON.parse(localStorage.getItem('dbVoucherMainstay')) || [];
window.stokBarangDB = JSON.parse(localStorage.getItem('stokBarangMainstay')) || [];
window.stokLogDB = JSON.parse(localStorage.getItem('stokLogMainstay')) || [];
window.arusKasDB = JSON.parse(localStorage.getItem('arusKasMainstay')) || [];

window.pesananMasukDB = []; 
window.pesananDapurDB = [];
window.pesananSelesaiDB = [];
window.nomorAntreanHariIni = parseInt(localStorage.getItem('antreanMainstay')) || 1;

window.kategoriAktif = 'all';
window.currentMenuDetail = null;
window.targetLoginRole = ''; 

// Konfigurasi Default Sistem (Dilebur dengan data dari LocalStorage)
window.systemConfig = Object.assign({
    nomorWA: "628977099557",
    tokoBuka: true,
    audioAktif: true,
    pinKasir: "123456",
    pinOwner: "888888",
    urlSpreadsheet: "https://script.google.com/macros/s/AKfycbzI64IPe7yAuN2ogQJ2Vs0Q8y3rBkwNawUXlpJAOHJ3M8yh-YgKaLBAJFqc8NCXSPOZ/exec",
    qrisUrl: "qris-mainstay.png",
    logoUrl: "logo-512.png",
    mapsEmbed: "",
    draftWA: {
        qris: "Halo Mainstay, ini bukti transfer QRIS saya untuk pesanan nomor: ",
        cash: "Halo Mainstay, saya memesan via E-Menu untuk pesanan Instant (Bayar di Kasir). Nomor pesanan: ",
        po: "Halo Mainstay, saya melakukan PRE-ORDER. Saya akan segera melunasinya agar pesanan diproses. Nomor PO: "
    },
    footerStruk: "Terima Kasih!\nPassword WiFi: mainstay2026"
}, JSON.parse(localStorage.getItem('mainstayConfig')) || {});

window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { 
    nama: 'Master Owner', pin: '888888', foto: '', wa: '628977099557', rekening: '' 
};

// ============================================================================
// 3. MESIN WAKTU REAL-TIME (VERSI FINAL ULTRA-KOMPAK DARI PATCH 61)
// ============================================================================
window.updateClock = function() {
    const now = new Date();
    const hari = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][now.getDay()];
    const bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][now.getMonth()];
    const tgl = `${hari}, ${String(now.getDate()).padStart(2,'0')} ${bln} ${now.getFullYear()}`;
    const jam = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;

    const el = document.getElementById('live-clock');
    if (el) {
        el.className = "text-right ml-auto flex flex-col justify-center shrink-0";
        el.innerHTML = `
            <span style="font-size: 9px; font-weight: 700; color: #6b7280; line-height: 1;">${tgl}</span>
            <span style="font-size: 11px; font-weight: 900; color: #d97706; line-height: 1; margin-top: 2px;">${jam}</span>
        `;
    }
};
setInterval(window.updateClock, 1000);
window.updateClock();

// ============================================================================
// 4. SISTEM AUDIO & NOTIFIKASI VISUAL
// ============================================================================
window.playAudio = function(type) {
    if (!window.systemConfig.audioAktif) return; 
    try {
        let audio = document.getElementById(type === 'masuk' ? 'audio-masuk' : 'audio-siap');
        if (type === 'masuk') window.triggerScreenFlash('masuk');
        else window.triggerScreenFlash('siap');
        
        if (audio) {
            audio.currentTime = 0; 
            audio.play().catch(e => console.log("Audio diblokir browser:", e));
        }
    } catch (err) { console.error("Gagal putar audio:", err); }
};

window.triggerScreenFlash = function(type) {
    const flashEl = document.getElementById('screen-flash');
    if (!flashEl) return;
    
    flashEl.className = type === 'masuk' 
        ? 'fixed inset-0 bg-blue-500 opacity-30 pointer-events-none z-[200] transition-opacity duration-300'
        : 'fixed inset-0 bg-green-500 opacity-30 pointer-events-none z-[200] transition-opacity duration-300';
    
    flashEl.classList.remove('hidden');
    setTimeout(() => {
        flashEl.classList.add('opacity-0');
        setTimeout(() => flashEl.classList.add('hidden'), 300);
    }, 200);
};

// ============================================================================
// 5. NAVIGASI BAWAH & KEAMANAN SESI (LOCKSCREEN KASIR/OWNER)
// ============================================================================
window.switchRoleView = function(role) {
    const currentSession = localStorage.getItem('sesiMainstay') || 'customer';
    if (role === 'customer' && currentSession === 'customer') return;

    // Cegah pindah tab jika sedang login
    if (currentSession === 'kasir' && role !== 'kasir') return alert("Akses Terkunci!\nAnda sedang login sebagai Staf Kasir. Harap Logout terlebih dahulu.");
    if (currentSession === 'owner' && role !== 'owner') return alert("Akses Terkunci!\nAnda sedang login sebagai Master Owner. Harap Kunci/Logout terlebih dahulu.");

    // Minta PIN jika mau masuk area terlarang tapi belum login
    if ((role === 'kasir' || role === 'owner') && currentSession !== role) {
        window.targetLoginRole = role;
        window.openLoginModal(role);
        return;
    }

    window.renderView(role);
    window.highlightNav(role);
};

// ============================================================================
// 6. LOGIKA LOGIN UNIFIED (PANEL MASTER & KASIR) DARI PATCH 61
// ============================================================================
window.openLoginModal = function(role) {
    const modal = document.getElementById('modal-login');
    document.getElementById('login-title').innerHTML = role === 'kasir' ? '<i class="fa-solid fa-desktop text-amber-500 mr-2"></i> Akses Kasir' : '<i class="fa-solid fa-shield-halved text-amber-500 mr-2"></i> Akses Master';
    document.getElementById('login-pin').value = '';
    document.getElementById('login-error').classList.add('hidden');
    
    // Sesuaikan input untuk owner vs kasir
    if(role === 'kasir') {
        document.getElementById('login-pin').id = 'login-kasir-pin';
    } else {
        const inp = document.getElementById('login-kasir-pin');
        if(inp) inp.id = 'login-pin';
    }
    
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

window.closeLoginModal = function() {
    const modal = document.getElementById('modal-login');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
};

window.prosesLogin = function() {
    const pin = document.getElementById('login-pin').value;
    const pinBos = window.ownerProfile.pin || '888888'; 

    if (pin === pinBos) {
        localStorage.setItem('sesiMainstay', 'owner');
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-owner').classList.remove('hidden');
        window.playAudio('siap');
        if (typeof window.updateStatistikOwner === 'function') window.updateStatistikOwner();
    } else {
        document.getElementById('login-error').classList.remove('hidden');
    }
};

window.prosesLoginKasir = function() {
    const pin = document.getElementById('login-kasir-pin').value;
    if (!pin) return alert("Harap masukkan PIN!");

    const pinBos = window.ownerProfile.pin || '888888'; 

    if (pin === pinBos) {
        // MODE BOS (OWNER MASUK KASIR)
        localStorage.setItem('sesiMainstay', 'owner-kasir'); 
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('view-kasir').classList.remove('hidden');
        
        if(typeof window.renderListKasir === 'function') window.renderListKasir();
        if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
        
        const overlay = document.getElementById('kasir-lock-overlay');
        if (overlay) { overlay.classList.add('hidden'); overlay.classList.remove('flex'); }
        
        window.playAudio('siap');
        alert("Selamat datang, Master Owner! Sistem telah menyesuaikan ke mode Owner.");
    } else {
        // MODE STAF KASIR
        const staf = window.dbStaf.find(s => s.pin === pin);
        if(staf) {
            localStorage.setItem('sesiMainstay', 'kasir');
            document.getElementById('view-login').classList.add('hidden');
            document.getElementById('view-kasir').classList.remove('hidden');
            
            if(typeof window.renderListKasir === 'function') window.renderListKasir();
            if(typeof window.setupHeaderKasir === 'function') window.setupHeaderKasir();
            window.playAudio('siap');
        } else {
            alert("PIN Salah atau tidak terdaftar di HRD!");
        }
    }
};

window.prosesLogout = function(role) {
    let msg = role === 'kasir' ? "Tutup shift Kasir dan kunci layar?" : "Kunci panel Master Owner?";
    if (confirm(msg)) {
        localStorage.setItem('sesiMainstay', 'customer');
        window.renderView('customer');
        window.highlightNav('customer');
    }
};

// ============================================================================
// 7. RENDER VISUAL & PENUTUP POP-UP KLIK LUAR AREA
// ============================================================================
window.renderView = function(role) {
    ['customer', 'kasir', 'owner'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
            if (v === role) el.classList.remove('hidden');
            else el.classList.add('hidden');
        }
    });
    const footer = document.getElementById('customer-footer');
    if (footer) footer.classList.toggle('hidden', role !== 'customer');
};

window.highlightNav = function(role) {
    ['customer', 'kasir', 'owner'].forEach(n => {
        const btn = document.getElementById(`nav-${n}`);
        if (btn) {
            const indicator = btn.querySelector('.nav-indicator');
            if (n === role) {
                btn.classList.replace('text-gray-400', 'text-amber-500');
                if(indicator) indicator.classList.remove('hidden');
            } else {
                btn.classList.replace('text-amber-500', 'text-gray-400');
                if(indicator) indicator.classList.add('hidden');
            }
        }
    });
};

// Tutup Pop-Up Jika Area Gelap Diklik (Disatukan dari Patch 32 & 38)
window.addEventListener('click', function(e) {
    const modalMap = {
        'modal-menu-detail': window.closeMenuDetail,
        'modal-cart': window.closeCartModal,
        'modal-login': window.closeLoginModal,
        'modal-receipt-customer': window.tutupReceiptCustomer
    };
    for (let id in modalMap) {
        const modal = document.getElementById(id);
        if (modal && !modal.classList.contains('hidden') && e.target === modal) {
            modalMap[id]();
        }
    }
});

// Refresh Tampilan Saat Web Dibuka
window.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('sesiMainstay') || 'customer';
    
    // Render tampilan sesuai Sesi
    if (savedSession === 'kasir' || savedSession === 'owner-kasir') {
        window.renderView('kasir');
        window.highlightNav('kasir');
    } else if (savedSession === 'owner') {
        window.renderView('owner');
        window.highlightNav('owner');
    } else {
        window.renderView('customer');
        window.highlightNav('customer');
    }

    // Bypass Cache Gambar Header
    const ts = new Date().getTime();
    const elImg = document.getElementById('header-logo-img');
    if(elImg) {
        elImg.src = window.systemConfig.logoUrl + '?v=' + ts;
        elImg.classList.remove('hidden');
        const elIkon = document.getElementById('header-logo-icon');
        if(elIkon) elIkon.classList.add('hidden');
    }
});
// ============================================================================
// MAINSTAY DRINK E-MENU & POS (CLEAN V2) - BAGIAN 2
// ============================================================================

// ============================================================================
// 8. RENDER KATALOG MENU & FILTER KATEGORI
// ============================================================================
window.renderKatalogCustomer = function() {
    const grid = document.getElementById('menu-grid-customer');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const menuAktif = window.katalogMenu.filter(m => m.tersedia !== false);
    const filtered = window.kategoriAktif === 'all' 
        ? menuAktif 
        : menuAktif.filter(m => m.kategori === window.kategoriAktif);
        
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center text-gray-500 py-10">Belum ada menu di kategori ini.</div>`;
        return;
    }
    
    filtered.forEach(menu => {
        // Cek stok jika menu terhubung dengan stok bahan baku utama
        let stokAman = true;
        if (menu.bahanBakuId) {
            const bahan = window.stokBarangDB.find(b => b.id === menu.bahanBakuId);
            if (bahan && bahan.qty <= 0) stokAman = false;
        }

        const div = document.createElement('div');
        div.className = `bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative ${!stokAman ? 'opacity-50' : ''}`;
        div.innerHTML = `
            ${!stokAman ? '<div class="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded z-10">HABIS</div>' : ''}
            <div class="h-32 bg-gray-200 relative">
                <img src="${menu.foto || 'placeholder.jpg'}" alt="${menu.nama}" class="w-full h-full object-cover object-center" onerror="this.src='https://via.placeholder.com/150?text=No+Image'">
            </div>
            <div class="p-3 flex flex-col flex-grow">
                <h3 class="font-bold text-gray-800 text-sm leading-tight mb-1">${menu.nama}</h3>
                <p class="text-xs text-gray-500 mb-2 line-clamp-2">${menu.deskripsi || ''}</p>
                <div class="mt-auto flex justify-between items-center">
                    <span class="font-bold text-amber-600">Rp ${menu.harga.toLocaleString('id-ID')}</span>
                    <button onclick="${stokAman ? `window.openMenuDetail('${menu.id}')` : ''}" 
                            class="${stokAman ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-400 cursor-not-allowed'} text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(div);
    });
};

window.filterKategori = function(kat) {
    window.kategoriAktif = kat;
    
    // Highlight tombol kategori
    document.querySelectorAll('.btn-kategori').forEach(btn => {
        if(btn.dataset.kat === kat) {
            btn.classList.add('bg-amber-500', 'text-white');
            btn.classList.remove('bg-gray-100', 'text-gray-600');
        } else {
            btn.classList.remove('bg-amber-500', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-600');
        }
    });
    
    window.renderKatalogCustomer();
};

// ============================================================================
// 9. KUSTOMISASI PESANAN (MENU DETAIL MODAL)
// ============================================================================
window.openMenuDetail = function(id) {
    if(!window.systemConfig.tokoBuka && localStorage.getItem('sesiMainstay') === 'customer') {
        return alert("Mohon maaf, toko sedang tutup.");
    }

    const menu = window.katalogMenu.find(m => m.id === id);
    if (!menu) return;
    
    window.currentMenuDetail = JSON.parse(JSON.stringify(menu)); // Clone object
    window.currentMenuDetail.qty = 1;
    window.currentMenuDetail.opsi = { es: 'Normal', gula: 'Normal', topping: [] };
    
    document.getElementById('detail-foto').src = menu.foto || 'https://via.placeholder.com/400?text=Mainstay';
    document.getElementById('detail-nama').innerText = menu.nama;
    document.getElementById('detail-deskripsi').innerText = menu.deskripsi || '';
    
    // Render Topping (Otomatis deteksi dari pengaturan menu)
    const containerTopping = document.getElementById('detail-topping-container');
    if (containerTopping) {
        if(menu.kategori === 'makanan' || menu.kategori === 'snack') {
            containerTopping.classList.add('hidden'); // Sembunyikan opsi es/gula untuk makanan
        } else {
            containerTopping.classList.remove('hidden');
        }
        
        // Reset radio buttons es & gula
        document.querySelectorAll('input[name="es"]').forEach(r => r.checked = (r.value === 'Normal'));
        document.querySelectorAll('input[name="gula"]').forEach(r => r.checked = (r.value === 'Normal'));
        
        // Uncheck all toppings
        document.querySelectorAll('input[name="topping"]').forEach(cb => cb.checked = false);
    }
    
    document.getElementById('detail-catatan').value = '';
    
    window.updateSubtotalDetail();
    
    const modal = document.getElementById('modal-menu-detail');
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

window.closeMenuDetail = function() {
    const modal = document.getElementById('modal-menu-detail');
    modal.classList.add('hidden'); modal.classList.remove('flex');
    window.currentMenuDetail = null;
};

window.ubahQtyDetail = function(delta) {
    if(!window.currentMenuDetail) return;
    let newQty = window.currentMenuDetail.qty + delta;
    if(newQty >= 1) {
        window.currentMenuDetail.qty = newQty;
        window.updateSubtotalDetail();
    }
};

window.updateSubtotalDetail = function() {
    if(!window.currentMenuDetail) return;
    
    let subtotal = window.currentMenuDetail.harga;
    let extraTopping = 0;
    
    // Hitung tambahan harga dari topping yang di-check
    document.querySelectorAll('input[name="topping"]:checked').forEach(cb => {
        extraTopping += parseInt(cb.dataset.harga || 0);
    });
    
    subtotal += extraTopping;
    subtotal *= window.currentMenuDetail.qty;
    
    document.getElementById('detail-qty').innerText = window.currentMenuDetail.qty;
    document.getElementById('detail-btn-harga').innerText = `Rp ${subtotal.toLocaleString('id-ID')}`;
};

window.tambahKeKeranjang = function() {
    if(!window.currentMenuDetail) return;
    
    // Ambil data opsi yang dipilih
    if(document.querySelector('input[name="es"]:checked')) {
        window.currentMenuDetail.opsi.es = document.querySelector('input[name="es"]:checked').value;
    }
    if(document.querySelector('input[name="gula"]:checked')) {
        window.currentMenuDetail.opsi.gula = document.querySelector('input[name="gula"]:checked').value;
    }
    
    let toppingList = [];
    let extraHarga = 0;
    document.querySelectorAll('input[name="topping"]:checked').forEach(cb => {
        toppingList.push(cb.value);
        extraHarga += parseInt(cb.dataset.harga || 0);
    });
    
    window.currentMenuDetail.opsi.topping = toppingList;
    window.currentMenuDetail.hargaSatuanAkhir = window.currentMenuDetail.harga + extraHarga;
    window.currentMenuDetail.catatan = document.getElementById('detail-catatan').value;
    
    // Generate unique ID untuk item di keranjang (agar topping berbeda tidak tergabung)
    const cartItemId = `${window.currentMenuDetail.id}-${window.currentMenuDetail.opsi.es}-${window.currentMenuDetail.opsi.gula}-${toppingList.join('-')}`;
    
    const existingIndex = window.currentCart.findIndex(item => item.cartItemId === cartItemId && item.catatan === window.currentMenuDetail.catatan);
    
    if (existingIndex > -1) {
        window.currentCart[existingIndex].qty += window.currentMenuDetail.qty;
    } else {
        window.currentMenuDetail.cartItemId = cartItemId;
        window.currentCart.push(window.currentMenuDetail);
    }
    
    window.saveCart();
    window.closeMenuDetail();
    
    // Tampilkan notifikasi kecil (Toast)
    alert(`${window.currentMenuDetail.nama} ditambahkan ke keranjang!`);
};

// ============================================================================
// 10. MANAJEMEN KERANJANG (CART)
// ============================================================================
window.saveCart = function() {
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.renderCartBadge();
    window.renderCartModal();
};

window.renderCartBadge = function() {
    const badges = document.querySelectorAll('.cart-badge');
    let totalItems = 0;
    window.currentCart.forEach(item => totalItems += item.qty);
    
    badges.forEach(b => {
        b.innerText = totalItems;
        b.classList.toggle('hidden', totalItems === 0);
    });
};

window.openCartModal = function() {
    window.renderCartModal();
    const modal = document.getElementById('modal-cart');
    modal.classList.remove('hidden'); modal.classList.add('flex');
};

window.closeCartModal = function() {
    const modal = document.getElementById('modal-cart');
    modal.classList.add('hidden'); modal.classList.remove('flex');
};

window.renderCartModal = function() {
    const list = document.getElementById('cart-items-list');
    if(!list) return;
    
    list.innerHTML = '';
    let grandTotal = 0;
    
    if(window.currentCart.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-gray-500">Keranjang masih kosong.</div>`;
        document.getElementById('cart-grandtotal').innerText = 'Rp 0';
        document.getElementById('btn-checkout').disabled = true;
        document.getElementById('btn-checkout').classList.add('opacity-50');
        return;
    }
    
    document.getElementById('btn-checkout').disabled = false;
    document.getElementById('btn-checkout').classList.remove('opacity-50');
    
    window.currentCart.forEach((item, index) => {
        let itemTotal = item.hargaSatuanAkhir * item.qty;
        grandTotal += itemTotal;
        
        let detailOpsi = '';
        if(item.kategori !== 'makanan' && item.kategori !== 'snack') {
            detailOpsi = `Es: ${item.opsi.es} | Gula: ${item.opsi.gula}`;
        }
        if(item.opsi.topping && item.opsi.topping.length > 0) {
            detailOpsi += ` | + ${item.opsi.topping.join(', ')}`;
        }
        
        list.innerHTML += `
            <div class="flex items-center justify-between p-3 border-b border-gray-100">
                <div class="flex-grow pr-2">
                    <h4 class="font-bold text-sm text-gray-800">${item.nama}</h4>
                    <p class="text-[10px] text-gray-500 leading-tight">${detailOpsi}</p>
                    ${item.catatan ? `<p class="text-[10px] text-amber-600 mt-1 italic">Catatan: "${item.catatan}"</p>` : ''}
                    <div class="font-bold text-amber-600 text-sm mt-1">Rp ${item.hargaSatuanAkhir.toLocaleString('id-ID')}</div>
                </div>
                <div class="flex items-center space-x-3 bg-gray-100 rounded-lg p-1">
                    <button onclick="window.ubahQtyCart(${index}, -1)" class="w-6 h-6 bg-white rounded text-gray-600 font-bold shadow-sm">-</button>
                    <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                    <button onclick="window.ubahQtyCart(${index}, 1)" class="w-6 h-6 bg-amber-500 text-white rounded font-bold shadow-sm">+</button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('cart-grandtotal').innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
};

window.ubahQtyCart = function(index, delta) {
    let newQty = window.currentCart[index].qty + delta;
    if(newQty <= 0) {
        if(confirm("Hapus item ini dari keranjang?")) {
            window.currentCart.splice(index, 1);
        }
    } else {
        window.currentCart[index].qty = newQty;
    }
    window.saveCart();
};

// ============================================================================
// 11. ALGORITMA CHECKOUT MUTLAK (CUSTOMER & KASIR) - DARI PATCH 55
// ============================================================================
window.prosesCheckout = function() {
    if(window.currentCart.length === 0) return;
    
    const namaPelanggan = document.getElementById('cart-nama')?.value || 'Guest';
    const tipePesanan = document.getElementById('cart-tipe-pesanan')?.value || 'Takeaway'; 
    const metodeBayar = document.getElementById('cart-metode-bayar')?.value || 'Cash';
    
    let grandTotal = 0;
    window.currentCart.forEach(item => grandTotal += (item.hargaSatuanAkhir * item.qty));
    
    // Generate ID Pesanan (ORD-YYMMDD-XXX)
    const date = new Date();
    const dateStr = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
    const orderId = `ORD-${dateStr}-${String(window.nomorAntreanHariIni).padStart(3, '0')}`;
    
    const timestamp = date.getTime();
    
    const pesananBaru = {
        orderId: orderId,
        antrean: window.nomorAntreanHariIni,
        nama: namaPelanggan,
        waktuMasuk: timestamp,
        items: [...window.currentCart],
        total: grandTotal,
        tipe: tipePesanan, // Dine-in, Takeaway, Pre-Order
        metodeBayar: metodeBayar, // QRIS, Cash
        statusBayar: metodeBayar === 'Cash' ? 'Belum Lunas' : 'Menunggu Validasi QRIS',
        statusPesanan: 'Antre',
        kasir: localStorage.getItem('sesiMainstay') === 'kasir' ? 'Staff POS' : 'E-Menu (Mandiri)'
    };

    // 1. Simpan ke Database Lokal (Memory)
    window.pesananMasukDB.push(pesananBaru);
    window.nomorAntreanHariIni++;
    localStorage.setItem('antreanMainstay', window.nomorAntreanHariIni);
    
    // 2. Jika Sistem Kasir yang Checkout, langsung potong stok (Bagian Kasir akan menangani ini lebih detail)
    if(localStorage.getItem('sesiMainstay') === 'kasir' || localStorage.getItem('sesiMainstay') === 'owner-kasir') {
        pesananBaru.statusBayar = 'Lunas';
        pesananBaru.statusPesanan = 'Dapur';
        if(typeof window.pindahkanKeDapur === 'function') window.pindahkanKeDapur(orderId);
    }
    
    // 3. Clear Keranjang
    window.currentCart = [];
    window.saveCart();
    window.closeCartModal();
    
    // 4. Redirect / Tampilkan Bukti Pesanan
    window.tampilkanStrukCustomer(pesananBaru);
    
    // Trigger Firebase (Jika Aktif)
    if(typeof window.syncFirebaseOrder === 'function') window.syncFirebaseOrder(pesananBaru);
    
    // Trigger Audio di Perangkat Kasir (Simulasi Event)
    window.playAudio('masuk');
};

// Tampilan Struk / Bukti Pesanan Untuk Customer (Jika pesan mandiri)
window.tampilkanStrukCustomer = function(pesanan) {
    const strukEl = document.getElementById('modal-receipt-customer');
    if(!strukEl) return alert(`Pesanan Berhasil! Nomor Antrean Anda: ${pesanan.antrean}`);
    
    document.getElementById('receipt-no').innerText = pesanan.antrean;
    document.getElementById('receipt-id').innerText = pesanan.orderId;
    document.getElementById('receipt-nama').innerText = pesanan.nama;
    document.getElementById('receipt-total').innerText = `Rp ${pesanan.total.toLocaleString('id-ID')}`;
    
    // Area QRIS handling
    const areaQris = document.getElementById('receipt-qris-area');
    if (pesanan.metodeBayar === 'QRIS' && areaQris) {
        areaQris.classList.remove('hidden');
        document.getElementById('receipt-qris-img').src = window.systemConfig.qrisUrl;
    } else if (areaQris) {
        areaQris.classList.add('hidden');
    }
    
    strukEl.classList.remove('hidden'); strukEl.classList.add('flex');
};

window.tutupReceiptCustomer = function() {
    const strukEl = document.getElementById('modal-receipt-customer');
    if(strukEl) { strukEl.classList.add('hidden'); strukEl.classList.remove('flex'); }
};

window.kirimKonfirmasiWA = function() {
    // Fungsi ini akan mengambil data struk yang sedang terbuka dan mengirim via WA
    const id = document.getElementById('receipt-id').innerText;
    const total = document.getElementById('receipt-total').innerText;
    
    // Cari data pesanan asli (bisa dari pesananMasukDB)
    const pesanan = window.pesananMasukDB.find(p => p.orderId === id);
    if(!pesanan) return alert("Data pesanan tidak ditemukan.");

    let draftMsg = "";
    if (pesanan.metodeBayar === 'QRIS') draftMsg = window.systemConfig.draftWA.qris;
    else if (pesanan.tipe === 'Pre-Order') draftMsg = window.systemConfig.draftWA.po;
    else draftMsg = window.systemConfig.draftWA.cash;

    const pesan = `${draftMsg}${id}\nAtas Nama: ${pesanan.nama}\nTotal: ${total}\n\n*Catatan:* Saya lampirkan bukti bayar (jika QRIS). Terima kasih!`;
    const noWA = window.systemConfig.nomorWA;
    const url = `https://api.whatsapp.com/send?phone=${noWA}&text=${encodeURIComponent(pesesan)}`;
    
    window.open(url, '_blank');
};

// Render awal saat file dimuat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.renderKatalogCustomer();
        window.renderCartBadge();
    });
} else {
    window.renderKatalogCustomer();
    window.renderCartBadge();
}
// ============================================================================
// MAINSTAY DRINK E-MENU & POS (CLEAN V2) - BAGIAN 3
// ============================================================================

// ============================================================================
// 12. DASHBOARD KASIR: DAFTAR PESANAN MASUK & VALIDASI
// ============================================================================
window.renderListKasir = function() {
    const listMasuk = document.getElementById('kasir-pesanan-masuk');
    if (!listMasuk) return;

    listMasuk.innerHTML = '';
    if (window.pesananMasukDB.length === 0) {
        listMasuk.innerHTML = `<div class="text-center py-10 text-gray-400 font-medium"><i class="fa-solid fa-mug-hot text-4xl mb-3 block"></i>Belum ada pesanan masuk.</div>`;
        return;
    }

    // Sort: Antrean terkecil di atas
    const pesananSorted = [...window.pesananMasukDB].sort((a, b) => a.antrean - b.antrean);

    pesananSorted.forEach(order => {
        const isLunas = order.statusBayar === 'Lunas';
        const bgCard = isLunas ? 'bg-white border-green-200' : 'bg-red-50 border-red-200';
        const badgeBayar = isLunas
            ? `<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold uppercase"><i class="fa-solid fa-check mr-1"></i> LUNAS (${order.metodeBayar})</span>`
            : `<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase animate-pulse"><i class="fa-solid fa-clock mr-1"></i> CEK ${order.metodeBayar}</span>`;

        let itemsHtml = order.items.map(item =>
            `<div class="text-sm text-gray-700 flex justify-between items-start border-b border-gray-100 pb-1 mb-1 last:border-0">
                <span class="flex-1">
                    <span class="font-bold">${item.qty}x</span> ${item.nama} 
                    <div class="text-[11px] text-gray-500 leading-tight">(${item.opsi.es}, ${item.opsi.gula}${item.opsi.topping && item.opsi.topping.length ? ' | +'+item.opsi.topping.join(', ') : ''})</div>
                </span>
                <span class="font-medium text-gray-800 ml-2">Rp ${(item.hargaSatuanAkhir * item.qty).toLocaleString('id-ID')}</span>
            </div>`
        ).join('');

        const actionBtn = !isLunas
            ? `<button onclick="window.validasiPembayaran('${order.orderId}')" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded mt-3 shadow-sm transition-colors uppercase tracking-wide text-sm"><i class="fa-solid fa-file-invoice-dollar mr-2"></i>Validasi Pembayaran</button>`
            : `<button onclick="window.pindahkanKeDapur('${order.orderId}')" class="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded mt-3 shadow-sm transition-colors uppercase tracking-wide text-sm"><i class="fa-solid fa-fire-burner mr-2"></i>Proses ke Dapur</button>`;

        listMasuk.innerHTML += `
            <div class="${bgCard} border-2 rounded-xl p-3 shadow-sm mb-3 relative overflow-hidden">
                ${order.tipe === 'Pre-Order' ? '<div class="absolute -right-6 top-3 bg-purple-500 text-white text-[10px] font-bold px-8 py-1 rotate-45 shadow">PRE-ORDER</div>' : ''}
                
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-black text-xl text-gray-800 leading-none mb-1">#${String(order.antrean).padStart(3,'0')}</div>
                        <div class="font-bold text-sm text-gray-700 uppercase">${order.nama}</div>
                        <div class="text-[10px] text-gray-400 mt-1">${order.orderId} | ${order.tipe}</div>
                    </div>
                    <div class="text-right flex flex-col items-end">
                        ${badgeBayar}
                        <div class="font-bold text-amber-600 text-lg mt-2">Rp ${order.total.toLocaleString('id-ID')}</div>
                    </div>
                </div>
                <div class="bg-gray-50/50 rounded-lg p-2 mb-1">
                    ${itemsHtml}
                </div>
                ${actionBtn}
            </div>
        `;
    });
};

window.validasiPembayaran = function(orderId) {
    if(!confirm("Validasi pembayaran ini?\nPastikan mutasi dana QRIS/Uang Tunai sudah Anda terima/cek.")) return;

    const idx = window.pesananMasukDB.findIndex(p => p.orderId === orderId);
    if(idx > -1) {
        window.pesananMasukDB[idx].statusBayar = 'Lunas';
        window.renderListKasir();
    }
};

// ============================================================================
// 13. KITCHEN DISPLAY (DAPUR) & PEMOTONGAN STOK OTOMATIS (CORE LOGIC)
// ============================================================================
window.pindahkanKeDapur = function(orderId) {
    const idx = window.pesananMasukDB.findIndex(p => p.orderId === orderId);
    if(idx > -1) {
        const order = window.pesananMasukDB[idx];

        // LOGIKA EMAS: POTONG STOK OTOMATIS HANYA SAAT MASUK DAPUR
        window.potongStokOtomatis(order.items);

        order.statusPesanan = 'Dapur';
        window.pesananDapurDB.push(order);
        window.pesananMasukDB.splice(idx, 1);

        window.renderListKasir();
        if(typeof window.renderPesananDapur === 'function') window.renderPesananDapur();
    }
};

window.potongStokOtomatis = function(items) {
    let stokBerubah = false;

    items.forEach(item => {
        // Cari master menu untuk mengetahui bahan baku utamanya (Linkage)
        const masterMenu = window.katalogMenu.find(m => m.id === item.id);
        if(masterMenu && masterMenu.bahanBakuId) {
            const stokIdx = window.stokBarangDB.findIndex(s => s.id === masterMenu.bahanBakuId);
            if(stokIdx > -1) {
                // Potong QTY bahan baku
                window.stokBarangDB[stokIdx].qty -= item.qty;
                stokBerubah = true;

                // Catat ke Log Stok Otomatis
                window.stokLogDB.push({
                    waktu: new Date().getTime(),
                    tipe: 'KELUAR',
                    bahanId: masterMenu.bahanBakuId,
                    namaBahan: window.stokBarangDB[stokIdx].nama,
                    qty: item.qty,
                    keterangan: `Auto-Pengurangan: Penjualan E-Menu`
                });
            }
        }
    });

    if(stokBerubah) {
        // Simpan ke memory lokal permanen
        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        localStorage.setItem('stokLogMainstay', JSON.stringify(window.stokLogDB));
        
        // Refresh katalog Customer (jika ada yang qty-nya menyentuh 0, otomatis "HABIS")
        if(typeof window.renderKatalogCustomer === 'function') window.renderKatalogCustomer();
        // Refresh tabel stok di Owner jika sedang terbuka
        if(typeof window.renderTabelStokOwner === 'function') window.renderTabelStokOwner();
    }
};

window.renderPesananDapur = function() {
    const listDapur = document.getElementById('dapur-pesanan-list');
    if (!listDapur) return;

    listDapur.innerHTML = '';
    if (window.pesananDapurDB.length === 0) {
        listDapur.innerHTML = `<div class="col-span-full text-center py-20 text-gray-300 font-medium"><i class="fa-solid fa-mug-saucer text-6xl mb-4 block"></i>Dapur bersih.<br>Belum ada tiket pesanan.</div>`;
        return;
    }

    window.pesananDapurDB.forEach(order => {
        let itemsHtml = order.items.map(item =>
            `<li class="text-sm font-bold text-gray-800 border-b border-amber-200/50 py-3 last:border-0">
                <div class="flex items-start">
                    <span class="bg-amber-500 text-white px-2 py-1 rounded text-lg mr-3 shadow-sm">${item.qty}x</span> 
                    <div class="flex-1">
                        <span class="text-lg">${item.nama}</span>
                        <div class="text-sm text-gray-600 font-normal mt-1 leading-snug">
                            <i class="fa-regular fa-snowflake text-blue-400 w-4"></i> ${item.opsi.es} <br>
                            <i class="fa-solid fa-cubes-stacked text-amber-400 w-4"></i> ${item.opsi.gula}
                            ${item.opsi.topping && item.opsi.topping.length ? '<br><i class="fa-solid fa-ice-cream text-pink-400 w-4"></i> + '+item.opsi.topping.join(', ') : ''}
                        </div>
                        ${item.catatan ? `<div class="mt-2 bg-red-100 text-red-700 p-2 rounded text-xs italic"><i class="fa-solid fa-bullhorn mr-1"></i> "${item.catatan}"</div>` : ''}
                    </div>
                </div>
            </li>`
        ).join('');

        listDapur.innerHTML += `
            <div class="bg-[#fffdf7] border-2 border-amber-300 rounded-xl shadow-md overflow-hidden flex flex-col h-full">
                <div class="bg-amber-300 p-3 flex justify-between items-center">
                    <div class="font-black text-2xl text-amber-900">#${String(order.antrean).padStart(3,'0')}</div>
                    <div class="bg-amber-900 text-amber-100 text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider">${order.tipe}</div>
                </div>
                <div class="p-4 flex-1">
                    <div class="font-bold text-gray-500 text-xs uppercase mb-1">Nama Pemesan:</div>
                    <div class="font-black text-xl text-gray-800 mb-4 border-b-2 border-dashed border-gray-300 pb-2">${order.nama}</div>
                    <ul>
                        ${itemsHtml}
                    </ul>
                </div>
                <div class="p-3 bg-amber-50 mt-auto border-t border-amber-200">
                    <button onclick="window.selesaikanPesanan('${order.orderId}')" class="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-lg text-lg shadow-md uppercase tracking-widest transition-transform transform active:scale-95">
                        <i class="fa-solid fa-bell-concierge mr-2"></i> Selesai
                    </button>
                </div>
            </div>
        `;
    });
};

// ============================================================================
// 14. PENYELESAIAN PESANAN & PENCATATAN ARUS KAS (OTOMATIS)
// ============================================================================
window.selesaikanPesanan = function(orderId) {
    const idx = window.pesananDapurDB.findIndex(p => p.orderId === orderId);
    if(idx > -1) {
        const order = window.pesananDapurDB[idx];
        
        if(!confirm(`Tandai pesanan #${order.antrean} atas nama ${order.nama} SELESAI?`)) return;

        order.statusPesanan = 'Selesai';
        order.waktuSelesai = new Date().getTime();

        // Pindah ke memori Pesanan Selesai
        window.pesananSelesaiDB.push(order);
        window.pesananDapurDB.splice(idx, 1);

        // LOGIKA EMAS: Otomatis masukkan omset ke Buku Kas!
        window.arusKasDB.push({
            id: 'KAS-' + new Date().getTime(),
            waktu: order.waktuSelesai,
            tipe: 'MASUK',
            kategori: 'Penjualan POS',
            nominal: order.total,
            metode: order.metodeBayar,
            keterangan: `Penjualan #${String(order.antrean).padStart(3,'0')} a/n ${order.nama}`
        });
        localStorage.setItem('arusKasMainstay', JSON.stringify(window.arusKasDB));

        // Refresh Tampilan Dapur
        window.renderPesananDapur();

        // Trigger Notifikasi Suara (Opsional)
        window.playAudio('siap');
    }
};

// Navigasi Internal Panel Kasir
window.switchKasirTab = function(tabName) {
    document.getElementById('kasir-panel-masuk').classList.toggle('hidden', tabName !== 'masuk');
    document.getElementById('kasir-panel-dapur').classList.toggle('hidden', tabName !== 'dapur');
    
    // Warnai tombol navigasi kasir
    document.getElementById('btn-tab-masuk').classList.toggle('bg-amber-100', tabName === 'masuk');
    document.getElementById('btn-tab-masuk').classList.toggle('text-amber-700', tabName === 'masuk');
    document.getElementById('btn-tab-dapur').classList.toggle('bg-amber-100', tabName === 'dapur');
    document.getElementById('btn-tab-dapur').classList.toggle('text-amber-700', tabName === 'dapur');

    if(tabName === 'masuk') window.renderListKasir();
    if(tabName === 'dapur') window.renderPesananDapur();
};
// ============================================================================
// MAINSTAY DRINK E-MENU & POS (CLEAN V2) - BAGIAN 4 (TERAKHIR)
// ============================================================================

// ============================================================================
// 15. DASHBOARD OWNER: STATISTIK & NAVIGASI PANEL MASTER
// ============================================================================
window.updateStatistikOwner = function() {
    let totalPendapatan = 0;
    let totalPesananSelesai = window.pesananSelesaiDB.length;
    
    // Hitung pendapatan hari ini dari Buku Kas (Hanya tipe MASUK & Penjualan)
    const hariIni = new Date().toDateString();
    window.arusKasDB.forEach(kas => {
        if(kas.tipe === 'MASUK' && new Date(kas.waktu).toDateString() === hariIni) {
            totalPendapatan += kas.nominal;
        }
    });

    const elPendapatan = document.getElementById('stat-pendapatan');
    const elPesanan = document.getElementById('stat-pesanan');
    
    if(elPendapatan) elPendapatan.innerText = `Rp ${totalPendapatan.toLocaleString('id-ID')}`;
    if(elPesanan) elPesanan.innerText = totalPesananSelesai;
};

window.switchOwnerTab = function(tabName) {
    const tabs = ['menu', 'stok', 'kas', 'hrd', 'pengaturan'];
    tabs.forEach(t => {
        const panel = document.getElementById(`owner-panel-${t}`);
        const btn = document.getElementById(`btn-owner-${t}`);
        if(panel) panel.classList.toggle('hidden', t !== tabName);
        if(btn) {
            btn.classList.toggle('bg-amber-500', t === tabName);
            btn.classList.toggle('text-white', t === tabName);
            btn.classList.toggle('bg-white', t !== tabName);
            btn.classList.toggle('text-gray-600', t !== tabName);
        }
    });

    // Render data sesuai tab yang dibuka
    if(tabName === 'menu') window.renderTabelMenuOwner();
    if(tabName === 'stok') window.renderTabelStokOwner();
    if(tabName === 'kas') window.renderTabelKasOwner();
};

// ============================================================================
// 16. MANAJEMEN KATALOG MENU (CRUD SIMPEL & SOLID)
// ============================================================================
window.renderTabelMenuOwner = function() {
    const tbody = document.getElementById('tabel-menu-body');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    window.katalogMenu.forEach((menu, index) => {
        tbody.innerHTML += `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="p-3">
                    <div class="flex items-center">
                        <img src="${menu.foto || 'placeholder.jpg'}" class="w-10 h-10 rounded object-cover mr-3" onerror="this.src='https://via.placeholder.com/50'">
                        <div>
                            <div class="font-bold text-sm text-gray-800">${menu.nama}</div>
                            <div class="text-[10px] text-gray-400 uppercase">${menu.kategori}</div>
                        </div>
                    </div>
                </td>
                <td class="p-3 text-sm font-bold text-gray-700">Rp ${menu.harga.toLocaleString('id-ID')}</td>
                <td class="p-3 text-sm">
                    <span class="${menu.tersedia !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-1 rounded text-xs font-bold">
                        ${menu.tersedia !== false ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                </td>
                <td class="p-3 text-right">
                    <button onclick="window.toggleStatusMenu(${index})" class="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded mr-1">Status</button>
                    <button onclick="window.hapusMenu(${index})" class="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
};

window.toggleStatusMenu = function(index) {
    if(window.katalogMenu[index].tersedia === false) {
        window.katalogMenu[index].tersedia = true;
    } else {
        window.katalogMenu[index].tersedia = false;
    }
    localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
    window.renderTabelMenuOwner();
    window.renderKatalogCustomer(); // Refresh tampilan depan
};

window.hapusMenu = function(index) {
    if(confirm(`Yakin ingin menghapus menu ${window.katalogMenu[index].nama}?`)) {
        window.katalogMenu.splice(index, 1);
        localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
        window.renderTabelMenuOwner();
        window.renderKatalogCustomer();
    }
};

// ============================================================================
// 17. MANAJEMEN STOK BAHAN BAKU
// ============================================================================
window.renderTabelStokOwner = function() {
    const tbody = document.getElementById('tabel-stok-body');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    window.stokBarangDB.forEach((stok, index) => {
        const isKritis = stok.qty <= (stok.minQty || 5);
        tbody.innerHTML += `
            <tr class="border-b border-gray-100 hover:bg-gray-50 ${isKritis ? 'bg-red-50' : ''}">
                <td class="p-3 text-sm font-bold text-gray-800">${stok.nama}</td>
                <td class="p-3 text-sm font-bold ${isKritis ? 'text-red-600' : 'text-gray-700'}">
                    ${stok.qty} ${stok.satuan}
                    ${isKritis ? '<span class="ml-2 text-[10px] bg-red-500 text-white px-1 rounded animate-pulse">KRITIS</span>' : ''}
                </td>
                <td class="p-3 text-right">
                    <button onclick="window.tambahStok(${index})" class="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded shadow-sm">+ Stok</button>
                </td>
            </tr>
        `;
    });
};

window.tambahStok = function(index) {
    const currentStok = window.stokBarangDB[index];
    const tambah = prompt(`Masukkan jumlah stok yang masuk untuk ${currentStok.nama} (Satuan: ${currentStok.satuan}):\nSisa saat ini: ${currentStok.qty}`);
    
    if(tambah && !isNaN(tambah) && parseInt(tambah) > 0) {
        currentStok.qty += parseInt(tambah);
        
        // Catat Log Masuk
        window.stokLogDB.push({
            waktu: new Date().getTime(),
            tipe: 'MASUK',
            bahanId: currentStok.id,
            namaBahan: currentStok.nama,
            qty: parseInt(tambah),
            keterangan: 'Restock Manual (Master)'
        });
        
        localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
        localStorage.setItem('stokLogMainstay', JSON.stringify(window.stokLogDB));
        window.renderTabelStokOwner();
        window.renderKatalogCustomer(); // Refresh depan jika tadinya habis
    }
};

// ============================================================================
// 18. MANAJEMEN BUKU KAS (ARUS KAS)
// ============================================================================
window.renderTabelKasOwner = function() {
    const tbody = document.getElementById('tabel-kas-body');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    // Urutkan dari yang terbaru
    const kasSorted = [...window.arusKasDB].sort((a, b) => b.waktu - a.waktu);
    
    kasSorted.forEach(kas => {
        const isMasuk = kas.tipe === 'MASUK';
        const date = new Date(kas.waktu);
        const tglStr = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
        
        tbody.innerHTML += `
            <tr class="border-b border-gray-100 hover:bg-gray-50 text-sm">
                <td class="p-3">
                    <div class="text-gray-500 text-[10px]">${tglStr}</div>
                    <div class="font-medium text-gray-800">${kas.keterangan}</div>
                </td>
                <td class="p-3">
                    <span class="${isMasuk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} px-2 py-0.5 rounded text-[10px] font-bold">
                        ${kas.kategori}
                    </span>
                </td>
                <td class="p-3 text-right font-bold ${isMasuk ? 'text-green-600' : 'text-red-600'}">
                    ${isMasuk ? '+' : '-'} Rp ${kas.nominal.toLocaleString('id-ID')}
                </td>
            </tr>
        `;
    });
};

// ============================================================================
// 19. SINKRONISASI FIREBASE & GOOGLE SHEETS
// ============================================================================
window.syncFirebaseOrder = function(pesananData) {
    if(!window.db) return; // Jika firebase belum diinisialisasi
    
    try {
        const orderRef = window.firebaseRef(window.db, 'pesanan/' + pesananData.orderId);
        window.firebaseSet(orderRef, pesananData)
            .then(() => console.log("Pesanan tersinkronisasi ke Firebase Backup"))
            .catch(err => console.error("Gagal sync Firebase:", err));
    } catch(e) {
        console.log("Firebase Database Realtime (Modul tidak aktif/error)");
    }
};

window.exportLaporanKeSheet = function() {
    const url = window.systemConfig.urlSpreadsheet;
    if(!url || url === '') {
        return alert("Gagal: Link Google Apps Script Spreadsheet belum diisi di Pengaturan!");
    }
    
    const btn = document.getElementById('btn-export-sheet');
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengirim...';
        btn.disabled = true;
    }

    // Simulasi payload data yang dikirim ke Sheet
    const payload = {
        action: 'export_kas',
        dataKas: window.arusKasDB,
        tanggalExport: new Date().getTime()
    };

    fetch(url, {
        method: 'POST',
        mode: 'no-cors', // Apps Script biasa menggunakan no-cors dari client
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).then(() => {
        alert("Laporan Arus Kas berhasil dikirim ke Google Sheets!");
        if(btn) {
            btn.innerHTML = '<i class="fa-solid fa-file-excel mr-2"></i> Backup ke Google Sheets';
            btn.disabled = false;
        }
    }).catch(err => {
        console.error(err);
        alert("Terjadi kesalahan jaringan saat mengirim ke Google Sheets.");
        if(btn) {
            btn.innerHTML = '<i class="fa-solid fa-file-excel mr-2"></i> Backup ke Google Sheets';
            btn.disabled = false;
        }
    });
};

// ============================================================================
// INIT: MUAT FUNGSI FIREBASE DARI MODUL AGAR BISA DIGUNAKAN DI SCOPE WINDOW
// ============================================================================
import { ref as firebaseRef, set as firebaseSet } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
window.firebaseRef = firebaseRef;
window.firebaseSet = firebaseSet;

console.log("MAINSTAY DRINK POS - ENGINE V2 LOADED SUCCESSFULLY!");
