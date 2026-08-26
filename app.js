// ============================================================================
// PART 1: INISIALISASI FIREBASE & VARIABEL GLOBAL
// ============================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, update, get, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Konfigurasi Sistem (Patch 52, 56)
window.systemConfig = JSON.parse(localStorage.getItem('mainstayConfig')) || {
    nomorWA: "628977099557",
    tokoBuka: true,
    audioAktif: true,
    pinKasir: "123456",
    pinOwner: "888888",
    logoUrl: "logo-512.png",
    qrisUrl: "qris-mainstay.png",
    mapsEmbed: "",
    linkIG: "",
    linkFB: "",
    linkTT: "",
    draftWA: {
        qris: "Halo, saya bayar via QRIS.",
        cash: "Halo, saya bayar Tunai.",
        po: "Halo, ini Pre-Order."
    },
    footerStruk: "Terima Kasih!\nPassword WiFi: mainstay2026"
};

// Database Pengguna & Entitas
window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || {
    nama: 'Master Owner',
    pin: '888888',
    foto: '',
    wa: '628977099557',
    rekening: ''
};
window.dbStaf = JSON.parse(localStorage.getItem('dbStafMainstay')) || [];
window.databaseMember = JSON.parse(localStorage.getItem('dbMemberMainstay')) || [];
window.dbVoucher = JSON.parse(localStorage.getItem('dbVoucherMainstay')) || [];

// Database Produk & Transaksi
window.katalogMenu = JSON.parse(localStorage.getItem('dbKatalogMainstay')) || [];
window.stokBarangDB = JSON.parse(localStorage.getItem('stokBarangMainstay')) || [];
window.stokLogDB = JSON.parse(localStorage.getItem('stokLogMainstay')) || [];
window.arusKasDB = JSON.parse(localStorage.getItem('arusKasMainstay')) || [];

// Database Konten Tambahan
window.dbSosmed = JSON.parse(localStorage.getItem('sosmedMainstay')) || [];
window.marqueeData = JSON.parse(localStorage.getItem('marqueeMainstay')) || [];
window.carouselData = JSON.parse(localStorage.getItem('carouselMainstay')) || [];
window.opsiTambahan = {
    es: ['Normal Ice', 'Less Ice', 'No Ice'],
    gula: ['Normal Sugar', 'Less Sugar', 'No Sugar'],
    topping: JSON.parse(localStorage.getItem('toppingMainstay')) || []
};

// State Transaksi & UI Dinamis
window.currentCart = JSON.parse(localStorage.getItem('cartMainstay')) || [];
window.kasirCart = [];
window.pesananMasukDB = JSON.parse(localStorage.getItem('db_masuk')) || [];
window.pesananDapurDB = JSON.parse(localStorage.getItem('db_dapur')) || [];
window.pesananSelesaiDB = JSON.parse(localStorage.getItem('db_selesai')) || [];
window.nomorAntreanHariIni = parseInt(localStorage.getItem('antreanMainstay')) || 1;

window.kategoriAktif = 'all';
window.posKategoriAktif = 'semua';
window.isPosKasirActive = false;
window.targetLoginRole = '';
window.currentMenuDetail = null;
window.pesananAktif = null;
// ============================================================================
// PART 2: FUNGSI INTI UI & UTILITY (JAM, AUDIO, NAVIGASI)
// ============================================================================

// Jam Minimalis Teks Murni (Patch 61)
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

// Sistem Audio Notifikasi
window.playAudio = function(type) {
    if (!window.systemConfig.audioAktif) return;
    try {
        let audio = document.getElementById(type === 'masuk' ? 'audio-masuk' : 'audio-siap');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log("Audio diblokir oleh browser:", e));
        }
    } catch (err) {
        console.error("Error pemutaran audio:", err);
    }
};

// Navigasi Role & Render View Utama
window.switchRoleView = function(role) {
    const sesi = localStorage.getItem('sesiMainstay') || 'customer';
    
    // Proteksi Lintas Sesi (Agar tidak bentrok)
    if ((sesi === 'kasir' || sesi === 'owner-kasir') && role !== 'kasir') {
        return alert("Harap Logout Kasir terlebih dahulu!");
    }
    if (sesi === 'owner' && role !== 'owner') {
        return alert("Harap Kunci Panel Master terlebih dahulu!");
    }
    
    // Trigger Modal Login jika belum ada sesi
    if ((role === 'kasir' || role === 'owner') && sesi !== role) {
        window.targetLoginRole = role;
        const modalLogin = document.getElementById('modal-login');
        if (modalLogin) {
            modalLogin.classList.remove('hidden');
            modalLogin.classList.add('flex', 'z-[9999]'); // Pastikan z-index tinggi
        }
        return;
    }
    window.renderView(role);
};

window.renderView = function(role) {
    ['customer', 'kasir', 'owner'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
            if (v === role) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
};

// Handler Upload Gambar & Preview (Base64)
window.handleImageUpload = function(inputElement, targetInputId, previewImgId = null) {
    const file = inputElement.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById(targetInputId).value = e.target.result;
        if (previewImgId && document.getElementById(previewImgId)) {
            document.getElementById(previewImgId).src = e.target.result;
        }
    };
    reader.readAsDataURL(file);
};
// ============================================================================
// PART 3: AUTENTIKASI, LOCKSCREEN KASIR & ABSENSI KAMERA
// ============================================================================

// --- SISTEM LOGIN MASTER OWNER ---
window.prosesLogin = function() {
    const pinInput = document.getElementById('login-pin');
    if (!pinInput) return;
    
    const pin = pinInput.value;
    const pinBos = window.ownerProfile.pin || '888888';
    
    if (pin === pinBos) {
        localStorage.setItem('sesiMainstay', 'owner');
        document.getElementById('modal-login').classList.add('hidden');
        window.renderView('owner');
        window.playAudio('siap');
        pinInput.value = ''; // Reset input
    } else {
        alert("PIN Master Salah!");
    }
};

window.kunciPanelMaster = function() {
    localStorage.removeItem('sesiMainstay');
    window.renderView('customer');
    alert("Panel Master Terkunci.");
};

// --- SISTEM LOGIN KASIR ---
window.prosesLoginKasir = function() {
    const pinInput = document.getElementById('login-kasir-pin');
    if (!pinInput) return;
    
    const pin = pinInput.value;
    const pinBos = window.ownerProfile.pin || '888888';
    
    if (pin === pinBos) {
        localStorage.setItem('sesiMainstay', 'owner-kasir');
        window.setupMasukKasir();
    } else {
        const staf = window.dbStaf.find(s => s.pin === pin);
        if (staf) {
            localStorage.setItem('sesiMainstay', 'kasir');
            window.setupMasukKasir();
        } else {
            alert("PIN Salah / Tidak terdaftar!");
        }
    }
    pinInput.value = ''; // Reset input
};

window.logoutKasir = function() {
    localStorage.removeItem('sesiMainstay');
    window.renderView('customer');
};

window.setupMasukKasir = function() {
    const viewLogin = document.getElementById('view-login');
    if(viewLogin) viewLogin.classList.add('hidden');
    
    window.renderView('kasir');
    window.setupHeaderKasir();
    
    // Panggil render list jika fungsi sudah di-load di part selanjutnya
    if (typeof window.renderListKasir === 'function') window.renderListKasir();
    
    window.playAudio('siap');
    window.cekKunciKasir();
};

// --- PENGATURAN HEADER & LOCKSCREEN KASIR ---
window.setupHeaderKasir = function() {
    const sesi = localStorage.getItem('sesiMainstay');
    const btnAbsen = document.querySelector('#view-kasir button[onclick="window.bukaAbsensi()"]');
    const dropdownStaf = document.getElementById('kasir-staf-dropdown');

    if (sesi === 'owner-kasir' || sesi === 'owner') {
        if (btnAbsen) btnAbsen.style.display = 'none';
        if (dropdownStaf) {
            dropdownStaf.innerHTML = `<option value="OWNER">${window.ownerProfile.nama} (Owner)</option>`;
            dropdownStaf.disabled = true;
        }
    } else {
        if (btnAbsen) btnAbsen.style.display = 'flex';
        if (dropdownStaf) {
            dropdownStaf.disabled = false;
            window.updateDropdownKasir();
        }
    }
};

window.updateDropdownKasir = function() {
    const dp = document.getElementById('kasir-staf-dropdown');
    if (!dp || localStorage.getItem('sesiMainstay') === 'owner-kasir') return;
    
    const hadir = window.dbStaf.filter(s => s.statusHadir);
    
    if (hadir.length > 0) {
        dp.disabled = false;
        dp.innerHTML = hadir.map(s => `<option value="${s.nama}">${s.nama} (Online)</option>`).join('');
    } else {
        dp.disabled = true;
        dp.innerHTML = `<option value="">-- WAJIB ABSEN --</option>`;
    }
    window.cekKunciKasir();
};

window.cekKunciKasir = function() {
    const overlay = document.getElementById('kasir-lock-overlay');
    if (!overlay) return;
    
    const sesi = localStorage.getItem('sesiMainstay');
    // Jika owner, atau ada staf yang hadir, buka kunci layarnya
    if (sesi === 'owner-kasir' || (window.dbStaf && window.dbStaf.some(s => s.statusHadir))) {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
    } else {
        // Tampilkan Lockscreen dengan z-index di bawah Modal Absensi
        overlay.classList.remove('hidden');
        overlay.classList.add('flex', 'z-[200]');
    }
};

// --- SISTEM ABSENSI (KAMERA) ---
window.streamAbsensi = null;

window.bukaAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if (modal) {
        modal.classList.remove('hidden');
        // z-[9999] agar muncul di atas lockscreen
        modal.classList.add('flex', 'z-[9999]'); 
        
        // Render list staf di dropdown absensi
        const select = document.getElementById('absen-staf-select');
        if (select) {
            select.innerHTML = '<option value="">Pilih Nama Staf</option>' + 
                window.dbStaf.map(s => `<option value="${s.nama}">${s.nama} ${s.statusHadir ? '(Sedang Hadir)' : ''}</option>`).join('');
        }
    }
};

window.tutupAbsensi = function() {
    const modal = document.getElementById('modal-absensi');
    if (modal) modal.classList.add('hidden');
    if (window.streamAbsensi) {
        window.streamAbsensi.getTracks().forEach(track => track.stop());
        window.streamAbsensi = null;
    }
    const video = document.getElementById('video-absensi');
    const canvas = document.getElementById('canvas-absensi');
    const hasil = document.getElementById('hasil-foto-absensi');
    if (video) video.classList.add('hidden');
    if (canvas) canvas.classList.add('hidden');
    if (hasil) { hasil.classList.add('hidden'); hasil.src = ''; }
};

window.startKameraAbsensi = async function() {
    const video = document.getElementById('video-absensi');
    const btnSnap = document.querySelector('button[onclick="window.snapFotoAbsensi()"]');
    if (!video) return;

    try {
        window.streamAbsensi = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = window.streamAbsensi;
        video.classList.remove('hidden');
        if(btnSnap) btnSnap.classList.remove('hidden');
        
        // Sembunyikan hasil foto jika sebelumnya ada
        const hasil = document.getElementById('hasil-foto-absensi');
        if (hasil) hasil.classList.add('hidden');
        
    } catch (err) {
        console.error("Gagal akses kamera:", err);
        alert("Tidak dapat mengakses kamera: " + err.message);
    }
};

window.snapFotoAbsensi = function() {
    const video = document.getElementById('video-absensi');
    const canvas = document.getElementById('canvas-absensi');
    const hasil = document.getElementById('hasil-foto-absensi');
    const btnSnap = document.querySelector('button[onclick="window.snapFotoAbsensi()"]');

    if (!video || !canvas || !hasil) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    
    hasil.src = canvas.toDataURL('image/jpeg');
    hasil.classList.remove('hidden');
    video.classList.add('hidden');
    if(btnSnap) btnSnap.classList.add('hidden');

    if (window.streamAbsensi) {
        window.streamAbsensi.getTracks().forEach(track => track.stop());
        window.streamAbsensi = null;
    }
};

window.prosesAbsensi = function() {
    const nama = document.getElementById('absen-staf-select')?.value;
    const tipe = document.getElementById('absen-tipe-select')?.value;
    const hasil = document.getElementById('hasil-foto-absensi');

    if (!nama || !tipe) return alert("Pilih Staf dan Tipe Absen!");
    if (!hasil || !hasil.src || hasil.src.includes('hidden') || hasil.src === window.location.href) {
        return alert("Harap ambil foto selfie terlebih dahulu!");
    }

    const stafIdx = window.dbStaf.findIndex(s => s.nama === nama);
    if (stafIdx === -1) return alert("Staf tidak ditemukan!");

    if (tipe === 'Masuk') {
        if (window.dbStaf[stafIdx].statusHadir) return alert("Staf sudah absen masuk sebelumnya!");
        window.dbStaf[stafIdx].statusHadir = true;
    } else {
        if (!window.dbStaf[stafIdx].statusHadir) return alert("Staf belum absen masuk!");
        window.dbStaf[stafIdx].statusHadir = false;
    }

    // Menyimpan data staf ke memori lokal
    localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
    
    alert(`Absen ${tipe} berhasil untuk ${nama}!`);
    window.tutupAbsensi();
    window.updateDropdownKasir(); // Ini otomatis membuka gembok lockscreen jika sukses
};
// ============================================================================
// PART 4: POS INTERNAL KASIR & KALKULATOR UANG CEPAT
// ============================================================================

window.posInternalTotal = 0;

window.bukaPOS = function() {
    window.filterPOS('semua');
    window.renderPOSInternalCart();
    window.toggleKalkulatorPOS();
    
    const modal = document.getElementById('modal-pos-internal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'z-[9999]'); // Pastikan di atas layer lain
    }
};

window.tutupPOS = function() {
    const modal = document.getElementById('modal-pos-internal');
    if (modal) modal.classList.add('hidden');
    
    // Reset kalkulator & nama jika ditutup
    const uangInput = document.getElementById('pos-uang-diterima');
    const namaInput = document.getElementById('pos-nama-pelanggan');
    if (uangInput) uangInput.value = '';
    if (namaInput) namaInput.value = '';
};

window.filterPOS = function(kategori) {
    window.posKategoriAktif = kategori;
    const grid = document.getElementById('pos-internal-grid');
    if (!grid) return;
    
    const menuList = kategori === 'semua' 
        ? window.katalogMenu 
        : window.katalogMenu.filter(m => m.kategori === kategori);
    
    grid.innerHTML = menuList.map(m => {
        const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
        return `
        <div class="bg-white p-2 rounded-xl shadow-sm border ${isHabis ? 'border-red-200 opacity-50 grayscale' : 'border-gray-200 cursor-pointer hover:border-amber-500'} relative transition-all" onclick="${isHabis ? "alert('Menu ini sedang habis!');" : `window.isPosKasirActive = true; window.openMenuDetail('${m.id}');`}">
            ${isHabis ? `<span class="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded z-10 tracking-widest">HABIS</span>` : ''}
            <img src="${m.img}" class="w-full aspect-square object-cover rounded-lg mb-1.5">
            <h4 class="text-[11px] font-black leading-tight text-gray-900 line-clamp-1 mb-0.5">${m.nama}</h4>
            <p class="text-[10px] font-black text-amber-600">Rp ${m.hargaDiskon || m.hargaNormal}</p>
        </div>`;
    }).join('');
};

window.renderPOSInternalCart = function() {
    const container = document.getElementById('pos-internal-cart');
    const totalEl = document.getElementById('pos-internal-total');
    if (!container || !totalEl) return;

    window.posInternalTotal = 0;
    
    if (window.kasirCart.length === 0) {
        container.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold">Keranjang Kasir Kosong</div>`;
        totalEl.textContent = "Rp 0";
        window.hitungKembalian(); // Update kalkulator otomatis
        return;
    }

    container.innerHTML = window.kasirCart.map((item, index) => {
        const subtotal = item.hargaTotal * item.qty;
        window.posInternalTotal += subtotal;
        
        // Tampilkan varian jika ada
        let opsiText = [];
        if(item.opsi && item.opsi.es) opsiText.push(item.opsi.es);
        if(item.opsi && item.opsi.gula) opsiText.push(item.opsi.gula);
        if(item.opsi && item.opsi.topping && item.opsi.topping.length > 0) opsiText.push(item.opsi.topping.join(', '));
        const catatanText = item.catatan ? `Catatan: ${item.catatan}` : '';

        return `
        <div class="flex justify-between items-start border-b border-gray-100 pb-2 mb-2 last:border-0 last:mb-0">
            <div class="flex-1 pr-2">
                <h5 class="text-[11px] font-black text-gray-800 line-clamp-1">${item.nama}</h5>
                ${opsiText.length > 0 ? `<p class="text-[9px] text-gray-500 font-medium leading-tight">${opsiText.join(' • ')}</p>` : ''}
                ${catatanText ? `<p class="text-[9px] text-amber-600 font-medium leading-tight italic">${catatanText}</p>` : ''}
                <p class="text-[10px] font-bold text-amber-600 mt-0.5">Rp ${subtotal}</p>
            </div>
            <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                <button onclick="window.ubahQtyPOS(${index}, -1)" class="w-5 h-5 flex items-center justify-center bg-white rounded text-red-500 font-bold shadow-sm">-</button>
                <span class="text-[11px] font-black w-4 text-center">${item.qty}</span>
                <button onclick="window.ubahQtyPOS(${index}, 1)" class="w-5 h-5 flex items-center justify-center bg-amber-500 rounded text-white font-bold shadow-sm">+</button>
            </div>
        </div>`;
    }).join('');

    totalEl.textContent = `Rp ${window.posInternalTotal}`;
    window.hitungKembalian(); // Sinkronkan kembalian saat cart berubah
};

window.ubahQtyPOS = function(index, delta) {
    if (window.kasirCart[index]) {
        window.kasirCart[index].qty += delta;
        if (window.kasirCart[index].qty <= 0) {
            window.kasirCart.splice(index, 1);
        }
        window.renderPOSInternalCart();
    }
};

window.toggleKalkulatorPOS = function() {
    const tipeBayar = document.getElementById('pos-tipe-bayar')?.value;
    const kalkulatorDiv = document.getElementById('pos-kalkulator');
    if (!kalkulatorDiv) return;

    if (tipeBayar === 'Tunai') {
        kalkulatorDiv.style.display = 'block';
        kalkulatorDiv.innerHTML = `
            <label class="text-[10px] font-black text-blue-800 block mb-2">PILIH UANG DITERIMA (QUICK CASH)</label>
            <div class="grid grid-cols-5 gap-1 mb-2">
                <button onclick="window.setUangCepat(window.posInternalTotal)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded shadow-sm active:bg-blue-50">PAS</button>
                <button onclick="window.setUangCepat(10000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded shadow-sm active:bg-blue-50">10K</button>
                <button onclick="window.setUangCepat(20000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded shadow-sm active:bg-blue-50">20K</button>
                <button onclick="window.setUangCepat(50000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded shadow-sm active:bg-blue-50">50K</button>
                <button onclick="window.setUangCepat(100000)" class="bg-white border border-blue-200 text-blue-700 text-[10px] font-black py-2 rounded shadow-sm active:bg-blue-50">100K</button>
            </div>
            <input type="number" id="pos-uang-diterima" placeholder="Atau ketik manual..." class="w-full bg-white border border-blue-200 rounded p-2 text-sm font-black outline-none mb-1 focus:border-blue-500" oninput="window.hitungKembalian()">
            <div class="flex justify-between items-end border-t border-blue-200 pt-2 mt-2">
                <span class="text-[10px] font-bold text-gray-500">KEMBALIAN:</span>
                <span id="pos-kembalian" class="text-lg font-black text-blue-600">Rp 0</span>
            </div>
        `;
        window.hitungKembalian(); 
    } else { 
        kalkulatorDiv.style.display = 'none'; 
    }
};

window.setUangCepat = function(nominal) {
    const inputUang = document.getElementById('pos-uang-diterima');
    if (inputUang) {
        inputUang.value = nominal;
        window.hitungKembalian();
    }
};

window.hitungKembalian = function() {
    const inputUang = document.getElementById('pos-uang-diterima');
    const elKembalian = document.getElementById('pos-kembalian');
    if (!inputUang || !elKembalian) return;

    const uang = parseInt(inputUang.value) || 0;
    const kembali = uang - window.posInternalTotal;
    
    if (uang === 0) { 
        elKembalian.textContent = "Rp 0"; 
        elKembalian.className = "text-lg font-black text-blue-600"; 
    } else if (kembali < 0) { 
        elKembalian.textContent = "Kurang Rp " + Math.abs(kembali); 
        elKembalian.className = "text-lg font-black text-red-500"; 
    } else { 
        elKembalian.textContent = "Rp " + kembali; 
        elKembalian.className = "text-lg font-black text-green-600"; 
    }
};

window.checkoutPOSInternal = function() {
    if (window.kasirCart.length === 0) {
        return alert("Keranjang masih kosong!");
    }
    
    const tipeBayar = document.getElementById('pos-tipe-bayar')?.value || 'Tunai';
    const uang = parseInt(document.getElementById('pos-uang-diterima')?.value) || 0;
    const namaInput = document.getElementById('pos-nama-pelanggan')?.value || 'Customer POS';
    
    // Validasi Uang Tunai
    if (tipeBayar === 'Tunai' && uang < window.posInternalTotal) {
        return alert("Uang yang dimasukkan kurang dari Total Belanja!");
    }

    // Menentukan siapa Kasir yang bertugas
    const sesi = localStorage.getItem('sesiMainstay');
    let aktor = 'Sistem Kasir';
    if (sesi === 'owner-kasir') {
        aktor = window.ownerProfile.nama + ' (Master)';
    } else {
        const dropdownStaf = document.getElementById('kasir-staf-dropdown');
        aktor = 'Kasir - ' + (dropdownStaf ? dropdownStaf.value : 'Offline');
    }

    // Generate Nomor Antrean
    const noAntrean = `POS-${String(window.nomorAntreanHariIni).padStart(3, '0')}`;

    const pesananBaru = {
        noAntrean: noAntrean,
        nama: namaInput,
        phone: '-', 
        tipeOrder: 'Instant (Di Toko)', 
        metodeBayar: tipeBayar, 
        totalBayar: window.posInternalTotal,
        uangDiterima: tipeBayar === 'Tunai' ? uang : window.posInternalTotal,
        kembalian: tipeBayar === 'Tunai' ? (uang - window.posInternalTotal) : 0,
        items: JSON.parse(JSON.stringify(window.kasirCart)), 
        actor: aktor, 
        isMember: false, 
        waktu: new Date().toLocaleString('id-ID')
    };

    // Masukkan ke database lokal pesanan masuk
    window.pesananMasukDB.unshift(pesananBaru);
    
    // Update nomor antrean
    window.nomorAntreanHariIni++; 
    localStorage.setItem('antreanMainstay', window.nomorAntreanHariIni);
    
    // Simpan & Render Ulang
    if (typeof window.simpanDatabaseKasir === 'function') window.simpanDatabaseKasir();
    if (typeof window.renderListKasir === 'function') window.renderListKasir();
    
    // Bersihkan Keranjang POS & Tutup Modal
    window.kasirCart = []; 
    window.renderPOSInternalCart();
    window.tutupPOS();
    
    window.playAudio('masuk'); 
    alert(`Pesanan ${noAntrean} atas nama ${namaInput} berhasil diproses!`);
};
// ============================================================================
// PART 5: DETAIL MENU (VARIAN) & MANAJEMEN PESANAN KASIR
// ============================================================================

// --- LOGIKA POP-UP DETAIL MENU (ES, GULA, TOPPING) ---
window.openMenuDetail = function(id) {
    const menu = window.katalogMenu.find(m => m.id === id);
    if (!menu) return;
    
    window.currentMenuDetail = { ...menu, qty: 1, opsi: { es: 'Normal Ice', gula: 'Normal Sugar', topping: [] } };
    
    // Render Info Dasar
    const imgEl = document.getElementById('detail-img');
    const namaEl = document.getElementById('detail-nama');
    const hargaEl = document.getElementById('detail-harga');
    const descEl = document.getElementById('detail-desc');
    
    if (imgEl) imgEl.src = menu.img;
    if (namaEl) namaEl.textContent = menu.nama;
    if (hargaEl) hargaEl.textContent = `Rp ${menu.hargaDiskon || menu.hargaNormal}`;
    if (descEl) descEl.textContent = menu.deskripsi || 'Tidak ada deskripsi.';
    
    // Reset Catatan & Qty
    const noteEl = document.getElementById('detail-note');
    if (noteEl) noteEl.value = '';
    window.updateDetailQtyDisplay();

    // Render Pilihan Es & Gula (Hanya jika bukan makanan/snack)
    const extraOpts = document.getElementById('detail-extra-options');
    if (extraOpts) {
        if (menu.kategori === 'makanan' || menu.kategori === 'snack') {
            extraOpts.innerHTML = ''; 
        } else {
            extraOpts.innerHTML = `
                <div class="mb-3">
                    <label class="text-[10px] font-black text-gray-800 block mb-1">TINGKAT ES</label>
                    <div class="flex gap-2">
                        ${window.opsiTambahan.es.map(es => `
                            <button onclick="window.setOpsiDetail('es', '${es}')" class="opsi-es flex-1 py-1.5 border border-gray-200 rounded text-[10px] font-bold ${es === 'Normal Ice' ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white text-gray-600'}">${es}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="mb-3">
                    <label class="text-[10px] font-black text-gray-800 block mb-1">TINGKAT GULA</label>
                    <div class="flex gap-2">
                        ${window.opsiTambahan.gula.map(g => `
                            <button onclick="window.setOpsiDetail('gula', '${g}')" class="opsi-gula flex-1 py-1.5 border border-gray-200 rounded text-[10px] font-bold ${g === 'Normal Sugar' ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white text-gray-600'}">${g}</button>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    // Tampilkan Modal (Gunakan z-index paling tinggi agar bisa menimpa POS Kasir)
    const modal = document.getElementById('modal-detail');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'z-[99999]');
    }
};

window.closeMenuDetail = function() {
    const modal = document.getElementById('modal-detail');
    if (modal) modal.classList.add('hidden');
    
    window.currentMenuDetail = null;
    window.isPosKasirActive = false; // Reset flag POS Kasir
};

window.setOpsiDetail = function(jenis, nilai) {
    if (!window.currentMenuDetail) return;
    window.currentMenuDetail.opsi[jenis] = nilai;
    
    // Update UI tombol opsi
    document.querySelectorAll(`.opsi-${jenis}`).forEach(btn => {
        if (btn.innerText === nilai) {
            btn.className = `opsi-${jenis} flex-1 py-1.5 border border-amber-500 bg-amber-100 rounded text-[10px] font-bold text-amber-700`;
        } else {
            btn.className = `opsi-${jenis} flex-1 py-1.5 border border-gray-200 bg-white rounded text-[10px] font-bold text-gray-600`;
        }
    });
};

window.ubahQtyDetail = function(delta) {
    if (!window.currentMenuDetail) return;
    window.currentMenuDetail.qty += delta;
    if (window.currentMenuDetail.qty < 1) window.currentMenuDetail.qty = 1;
    window.updateDetailQtyDisplay();
};

window.updateDetailQtyDisplay = function() {
    const el = document.getElementById('detail-qty');
    if (el) el.textContent = window.currentMenuDetail ? window.currentMenuDetail.qty : 1;
};

window.tambahKeKeranjang = function() {
    if (!window.currentMenuDetail) return;
    
    const catatan = document.getElementById('detail-note')?.value || '';
    const itemToAdd = {
        ...window.currentMenuDetail,
        catatan: catatan,
        hargaTotal: parseInt(window.currentMenuDetail.hargaDiskon || window.currentMenuDetail.hargaNormal)
    };

    if (window.isPosKasirActive) {
        // Masuk ke Keranjang POS Internal Kasir
        window.kasirCart.push(itemToAdd);
        window.renderPOSInternalCart();
    } else {
        // Masuk ke Keranjang Customer Publik
        window.currentCart.push(itemToAdd);
        localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
        if (typeof window.renderCart === 'function') window.renderCart();
        alert(`${itemToAdd.nama} ditambahkan ke keranjang!`);
    }
    
    window.closeMenuDetail();
};


// --- FIREBASE SYNC & MANAJEMEN PESANAN (KASIR) ---
window.simpanDatabaseKasir = function() {
    // 1. Simpan ke Local Storage untuk backup offline
    localStorage.setItem('db_masuk', JSON.stringify(window.pesananMasukDB));
    localStorage.setItem('db_dapur', JSON.stringify(window.pesananDapurDB));
    localStorage.setItem('db_selesai', JSON.stringify(window.pesananSelesaiDB));

    // 2. Simpan ke Firebase (Jika online)
    if (typeof db !== 'undefined') {
        set(ref(db, 'mainstay/pesanan'), {
            masuk: window.pesananMasukDB, 
            dapur: window.pesananDapurDB,
            selesai: window.pesananSelesaiDB, 
            antrean: window.nomorAntreanHariIni
        }).catch(e => console.error("Firebase Sync Gagal:", e));
    }
};

// Merender 3 Kolom Pesanan (Masuk, Proses Dapur, Selesai)
window.renderListKasir = function() {
    const listMasuk = document.getElementById('list-pesanan-masuk');
    const listDapur = document.getElementById('list-pesanan-dapur');
    const listSelesai = document.getElementById('list-pesanan-selesai');

    if (listMasuk) listMasuk.innerHTML = window.generateHTMLListPesanan(window.pesananMasukDB, 'masuk');
    if (listDapur) listDapur.innerHTML = window.generateHTMLListPesanan(window.pesananDapurDB, 'dapur');
    if (listSelesai) listSelesai.innerHTML = window.generateHTMLListPesanan(window.pesananSelesaiDB, 'selesai');
};

window.generateHTMLListPesanan = function(dataArray, status) {
    if (!dataArray || dataArray.length === 0) {
        return `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-white rounded-xl border border-gray-100">Belum ada pesanan</div>`;
    }

    return dataArray.map(p => `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 relative overflow-hidden">
            <div class="absolute top-0 right-0 bg-gray-900 text-white text-[9px] font-black px-2 py-1 rounded-bl-xl z-10">${p.noAntrean}</div>
            
            <div class="pr-10 mb-2">
                <h4 class="text-[12px] font-black text-gray-900">${p.nama}</h4>
                <p class="text-[9px] font-bold text-gray-500">${p.tipeOrder} • ${p.metodeBayar}</p>
                <p class="text-[8px] font-medium text-gray-400 mt-0.5">${p.waktu} • Oleh: ${p.actor}</p>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-2 mb-2 border border-gray-100 space-y-1">
                ${p.items.map(item => `
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <p class="text-[10px] font-bold text-gray-800 leading-tight">${item.qty}x ${item.nama}</p>
                            ${item.opsi && item.opsi.es ? `<p class="text-[8px] text-gray-500">${item.opsi.es}, ${item.opsi.gula}</p>` : ''}
                            ${item.catatan ? `<p class="text-[8px] text-amber-600 italic">Note: ${item.catatan}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="flex justify-between items-center mb-3">
                <span class="text-[10px] font-bold text-gray-500">Total Bayar:</span>
                <span class="text-[12px] font-black text-green-600">Rp ${p.totalBayar}</span>
            </div>

            <div class="flex gap-2">
                ${status === 'masuk' ? `
                    <button onclick="window.terimaPesanan('${p.noAntrean}')" class="flex-1 bg-amber-500 text-white text-[10px] font-black py-2 rounded-lg shadow active:bg-amber-600">PROSES DAPUR</button>
                    <button onclick="window.tolakPesanan('${p.noAntrean}', 'masuk')" class="w-10 bg-red-100 text-red-600 text-[10px] font-black rounded-lg border border-red-200">X</button>
                ` : status === 'dapur' ? `
                    <button onclick="window.selesaikanPesanan('${p.noAntrean}')" class="flex-1 bg-green-500 text-white text-[10px] font-black py-2 rounded-lg shadow active:bg-green-600">SELESAI / PICKUP</button>
                ` : `
                    <button onclick="window.cetakStruk('${p.noAntrean}')" class="flex-1 bg-blue-100 text-blue-600 border border-blue-200 text-[10px] font-black py-2 rounded-lg">CETAK STRUK</button>
                `}
            </div>
        </div>
    `).join('');
};

window.terimaPesanan = function(noAntrean) {
    const sesi = localStorage.getItem('sesiMainstay');
    const dropdown = document.getElementById('kasir-staf-dropdown');
    
    // Validasi Absensi Kasir
    if (sesi !== 'owner-kasir' && (!dropdown || !dropdown.value)) {
        return alert("Harap Absen Masuk terlebih dahulu!");
    }

    const idx = window.pesananMasukDB.findIndex(o => o.noAntrean === noAntrean);
    if (idx > -1) {
        const pesanan = window.pesananMasukDB.splice(idx, 1)[0];
        window.pesananDapurDB.unshift(pesanan);
        window.simpanDatabaseKasir();
        window.renderListKasir();
        // Cetak struk otomatis masuk dapur (Opsional jika printer Bluetooth aktif)
    }
};

window.selesaikanPesanan = function(noAntrean) {
    const idx = window.pesananDapurDB.findIndex(o => o.noAntrean === noAntrean);
    if (idx > -1) {
        const pesanan = window.pesananDapurDB.splice(idx, 1)[0];
        window.pesananSelesaiDB.unshift(pesanan);
        
        // Catat ke Arus Kas
        window.arusKasDB.unshift({
            id: 'TRX-' + new Date().getTime(),
            tanggal: new Date().toLocaleDateString('id-ID'),
            keterangan: `Penjualan ${noAntrean}`,
            kategori: 'Pemasukan',
            nominal: pesanan.totalBayar,
            operator: pesanan.actor
        });
        localStorage.setItem('arusKasMainstay', JSON.stringify(window.arusKasDB));

        window.simpanDatabaseKasir();
        window.renderListKasir();
        window.playAudio('siap');
    }
};

window.tolakPesanan = function(noAntrean, asal) {
    if (!confirm(`Batalkan pesanan ${noAntrean}?`)) return;
    
    if (asal === 'masuk') {
        const idx = window.pesananMasukDB.findIndex(o => o.noAntrean === noAntrean);
        if (idx > -1) window.pesananMasukDB.splice(idx, 1);
    }
    window.simpanDatabaseKasir();
    window.renderListKasir();
};
// ============================================================================
// PART 6: KERANJANG CUSTOMER, CETAK STRUK, & PENGATURAN SISTEM
// ============================================================================

// --- KERANJANG CUSTOMER (PUBLIK) ---
window.renderCart = function() {
    const cartEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!cartEl || !totalEl) return;

    let totalBayar = 0;
    
    if (window.currentCart.length === 0) {
        cartEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">Keranjang belanja Anda kosong.</div>`;
        totalEl.textContent = 'Rp 0';
        return;
    }

    cartEl.innerHTML = window.currentCart.map((item, index) => {
        const subtotal = item.hargaTotal * item.qty;
        totalBayar += subtotal;
        
        let opsiText = [];
        if(item.opsi && item.opsi.es) opsiText.push(item.opsi.es);
        if(item.opsi && item.opsi.gula) opsiText.push(item.opsi.gula);
        if(item.opsi && item.opsi.topping && item.opsi.topping.length > 0) opsiText.push(item.opsi.topping.join(', '));
        
        return `
        <div class="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
            <div class="flex-1 pr-3">
                <h4 class="text-[12px] font-black text-gray-800">${item.nama}</h4>
                ${opsiText.length > 0 ? `<p class="text-[10px] text-gray-500 font-medium">${opsiText.join(' • ')}</p>` : ''}
                ${item.catatan ? `<p class="text-[10px] text-amber-600 font-medium italic">Catatan: ${item.catatan}</p>` : ''}
                <p class="text-[11px] font-bold text-amber-600 mt-1">Rp ${subtotal}</p>
            </div>
            <div class="flex flex-col items-end gap-2">
                <button onclick="window.hapusDariKeranjang(${index})" class="text-red-500 p-1 bg-red-50 rounded"><i class="fas fa-trash text-[10px]"></i></button>
                <div class="flex items-center gap-2 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button onclick="window.ubahQtyCustomer(${index}, -1)" class="w-6 h-6 flex justify-center items-center bg-white rounded shadow-sm text-red-500 font-bold">-</button>
                    <span class="text-[12px] font-black w-4 text-center">${item.qty}</span>
                    <button onclick="window.ubahQtyCustomer(${index}, 1)" class="w-6 h-6 flex justify-center items-center bg-amber-500 rounded shadow-sm text-white font-bold">+</button>
                </div>
            </div>
        </div>`;
    }).join('');

    totalEl.textContent = `Rp ${totalBayar}`;
};

window.ubahQtyCustomer = function(index, delta) {
    if (window.currentCart[index]) {
        window.currentCart[index].qty += delta;
        if (window.currentCart[index].qty <= 0) window.currentCart.splice(index, 1);
        localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
        window.renderCart();
    }
};

window.hapusDariKeranjang = function(index) {
    window.currentCart.splice(index, 1);
    localStorage.setItem('cartMainstay', JSON.stringify(window.currentCart));
    window.renderCart();
};

window.checkoutCustomerWA = function() {
    if (window.currentCart.length === 0) return alert('Keranjang masih kosong!');
    
    const nama = document.getElementById('cust-nama')?.value || 'Customer';
    const noMeja = document.getElementById('cust-meja')?.value || 'Takeaway';
    const metode = document.getElementById('cust-bayar')?.value || 'Cash';
    
    let total = 0;
    let pesan = `Halo Mainstay! Saya ingin memesan:\n\n*Nama:* ${nama}\n*Meja/Ambil:* ${noMeja}\n*Pembayaran:* ${metode}\n\n*Rincian Pesanan:*\n`;
    
    window.currentCart.forEach(item => {
        const subtotal = item.hargaTotal * item.qty;
        total += subtotal;
        pesan += `- ${item.qty}x ${item.nama} (Rp ${subtotal})\n`;
        if (item.opsi.es) pesan += `  Varian: ${item.opsi.es}, ${item.opsi.gula}\n`;
        if (item.catatan) pesan += `  Note: ${item.catatan}\n`;
    });
    
    pesan += `\n*TOTAL: Rp ${total}*\n\n${window.systemConfig.draftWA[metode.toLowerCase()] || 'Tolong diproses ya!'}`;
    
    const urlWA = `https://wa.me/${window.systemConfig.nomorWA}?text=${encodeURIComponent(pesan)}`;
    
    // Simpan ke database lokal publik sebagai antrean
    window.currentCart = [];
    localStorage.removeItem('cartMainstay');
    window.renderCart();
    
    window.open(urlWA, '_blank');
    document.getElementById('modal-cart')?.classList.add('hidden');
};

// --- CETAK STRUK (PRINT THERMAL) ---
window.cetakStruk = function(noAntrean) {
    // Cari pesanan di Dapur atau Selesai
    let pesanan = window.pesananSelesaiDB.find(p => p.noAntrean === noAntrean) || window.pesananDapurDB.find(p => p.noAntrean === noAntrean);
    if (!pesanan) return alert('Data pesanan tidak ditemukan!');

    const strukWindow = window.open('', '_blank', 'width=300,height=600');
    if (!strukWindow) return alert('Izinkan Pop-up untuk mencetak struk!');

    const strukHTML = `
        <html>
        <head>
            <title>Struk - ${noAntrean}</title>
            <style>
                body { font-family: monospace; width: 58mm; margin: 0; padding: 10px; color: #000; font-size: 12px; }
                .text-center { text-align: center; }
                .bold { font-weight: bold; }
                .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
                .flex-between { display: flex; justify-content: space-between; }
                .item-row { margin-bottom: 3px; }
            </style>
        </head>
        <body>
            <div class="text-center bold" style="font-size: 16px;">MAINSTAY DRINK</div>
            <div class="text-center">Jl. Contoh No. 123</div>
            <div class="divider"></div>
            <div class="flex-between"><span>No: ${pesanan.noAntrean}</span><span>${pesanan.waktu.split(' ')[0]}</span></div>
            <div class="flex-between"><span>Kasir: ${pesanan.actor.split(' - ')[1] || 'Owner'}</span><span>${pesanan.waktu.split(' ')[1]}</span></div>
            <div class="flex-between"><span>Pelanggan: ${pesanan.nama}</span></div>
            <div class="divider"></div>
            
            ${pesanan.items.map(item => `
                <div class="item-row flex-between">
                    <span>${item.qty}x ${item.nama.substring(0, 12)}</span>
                    <span>${item.qty * item.hargaTotal}</span>
                </div>
                ${item.opsi && item.opsi.es ? `<div style="font-size:10px; padding-left:10px;">- ${item.opsi.es}, ${item.opsi.gula}</div>` : ''}
            `).join('')}
            
            <div class="divider"></div>
            <div class="flex-between bold"><span>TOTAL</span><span>Rp ${pesanan.totalBayar}</span></div>
            <div class="flex-between"><span>Bayar (${pesanan.metodeBayar})</span><span>Rp ${pesanan.uangDiterima || pesanan.totalBayar}</span></div>
            <div class="flex-between"><span>Kembali</span><span>Rp ${pesanan.kembalian || 0}</span></div>
            <div class="divider"></div>
            <div class="text-center" style="white-space: pre-line; font-size: 10px;">
                ${window.systemConfig.footerStruk}
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); }
            </script>
        </body>
        </html>
    `;
    
    strukWindow.document.write(strukHTML);
    strukWindow.document.close();
};

// --- PENGATURAN WEB (KEBAL ERROR) ---
window.simpanWebPastiJalan = function() {
    try {
        const elBuka = document.getElementById('ew-toko-buka');
        const elAudio = document.getElementById('ew-audio');
        const elWa = document.getElementById('ew-wa');
        
        if (elBuka) window.systemConfig.tokoBuka = elBuka.checked;
        if (elAudio) window.systemConfig.audioAktif = elAudio.checked;
        if (elWa) window.systemConfig.nomorWA = elWa.value;
        
        // Cek ID elemen lain jika ada di DOM
        ['maps', 'ig', 'fb', 'tt'].forEach(id => {
            const el = document.getElementById('ew-' + id);
            if (el) window.systemConfig[`link${id.toUpperCase()}`] = el.value;
        });

        const logo = document.getElementById('ew-logo')?.value;
        const qris = document.getElementById('ew-qris')?.value;
        
        if (logo) { 
            window.systemConfig.logoUrl = logo; 
            const headerLogo = document.getElementById('header-logo-img');
            if(headerLogo) headerLogo.src = logo; 
        }
        if (qris) window.systemConfig.qrisUrl = qris;
        
        localStorage.setItem('mainstayConfig', JSON.stringify(window.systemConfig));
        alert("Pengaturan Toko berhasil disimpan!");
    } catch (e) {
        alert("Terjadi kesalahan saat menyimpan pengaturan: " + e.message);
    }
};

// --- PROFIL OWNER MUTLAK ---
window.bukaFormOwner = function() {
    // Selalu baca data paling baru
    window.ownerProfile = JSON.parse(localStorage.getItem('ownerProfileMainstay')) || { nama: 'Master Owner', pin: '888888', wa: '', rekening: '', foto: '' };
    
    document.getElementById('owner-nama').value = window.ownerProfile.nama;
    document.getElementById('owner-pin').value = window.ownerProfile.pin;
    document.getElementById('owner-wa').value = window.ownerProfile.wa;
    document.getElementById('owner-rek').value = window.ownerProfile.rekening;
    document.getElementById('owner-foto').value = window.ownerProfile.foto;
    
    const modal = document.getElementById('modal-form-owner');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex', 'z-[9999]');
    }
};

window.simpanFormOwnerMutlak = function() {
    const dataBaru = {
        nama: document.getElementById('owner-nama').value,
        pin: document.getElementById('owner-pin').value,
        wa: document.getElementById('owner-wa').value,
        rekening: document.getElementById('owner-rek').value,
        foto: document.getElementById('owner-foto').value
    };
    
    if (!dataBaru.nama || !dataBaru.pin) {
        return alert("Nama dan PIN Master wajib diisi!");
    }
    
    // Update global state & LocalStorage
    window.ownerProfile = dataBaru;
    localStorage.setItem('ownerProfileMainstay', JSON.stringify(dataBaru));
    
    const modal = document.getElementById('modal-form-owner');
    if (modal) modal.classList.add('hidden');
    
    alert("Profil & PIN Owner berhasil diperbarui! Silakan gunakan PIN baru untuk login selanjutnya.");
};
// ============================================================================
// PART 7: INISIALISASI UTAMA & EVENT LISTENER (KUNCI BEBAS DUPLIKAT)
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    // 1. Muat Logo Anti-Cache (Memastikan gambar terbaru selalu muncul)
    const ts = new Date().getTime();
    if (window.systemConfig && window.systemConfig.logoUrl) {
        const headerLogo = document.getElementById('header-logo-img');
        if (headerLogo) headerLogo.src = window.systemConfig.logoUrl + '?v=' + ts;
    }

    // 2. Perbaikan Mutlak Tombol "Kembali" di Panel Master (Fix Patch 49)
    // Otomatis mencari semua tombol "kembali" di panel bawah dan memberikan fungsi tutup yang benar
    document.querySelectorAll('.panel-slide-up .bg-gray-900 button').forEach(btn => {
        btn.onclick = function() {
            const panel = this.closest('.panel-slide-up');
            if (panel) {
                // Efek transisi turun
                panel.classList.add('translate-y-full'); 
                // Sembunyikan setelah animasi selesai
                setTimeout(() => panel.classList.add('hidden'), 300); 
            }
        };
    });

    // 3. Hubungkan Tombol "Simpan Pengaturan Web" Secara Aman
    // Menghapus atribut onclick lama di HTML yang sering memicu error tumpuk
    const btnSimpanWeb = document.querySelector('#panel-edit-web button:last-of-type');
    if (btnSimpanWeb) {
        btnSimpanWeb.removeAttribute('onclick');
        btnSimpanWeb.addEventListener('click', window.simpanWebPastiJalan);
    }

    // 4. Jalankan Fungsi Awal Secara Berurutan
    window.updateClock();
    
    if (typeof window.renderCart === 'function') window.renderCart();
    if (typeof window.renderKatalog === 'function') window.renderKatalog('all');
    
    // 5. Cek Sesi Terakhir Pengguna (Auto-Login jika belum logout)
    const sesi = localStorage.getItem('sesiMainstay');
    if (sesi === 'kasir' || sesi === 'owner-kasir') {
        window.setupMasukKasir();
    } else if (sesi === 'owner') {
        window.renderView('owner');
    } else {
        window.renderView('customer');
    }

    console.log("[Mainstay System] Inisialisasi Selesai. Sistem bersih dari duplikasi event.");
});
// ============================================================================
// PART 8: MANAJEMEN KATALOG MENU (CUSTOMER & PANEL MASTER)
// ============================================================================

// --- RENDER KATALOG UNTUK CUSTOMER (PUBLIK) ---
window.renderKatalog = function(kategori = 'all') {
    window.kategoriAktif = kategori;
    const grid = document.getElementById('menu-grid-customer');
    if (!grid) return;

    // Filter menu berdasarkan kategori
    const menuTampil = kategori === 'all' 
        ? window.katalogMenu 
        : window.katalogMenu.filter(m => m.kategori === kategori);

    if (menuTampil.length === 0) {
        grid.innerHTML = `<div class="col-span-2 text-center text-gray-400 py-8 text-xs font-bold">Kategori ini kosong</div>`;
        return;
    }

    grid.innerHTML = menuTampil.map(menu => {
        const isHabis = (menu.isSoldOut === true || menu.isSoldOut === "true");
        return `
        <div class="bg-white rounded-2xl p-2.5 shadow-sm border ${isHabis ? 'border-red-200 opacity-60 grayscale' : 'border-gray-100 hover:border-amber-400'} relative transition-all">
            ${isHabis ? `<span class="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded z-10">HABIS</span>` : ''}
            
            <div class="relative w-full aspect-square rounded-xl overflow-hidden mb-2">
                <img src="${menu.img}" alt="${menu.nama}" class="w-full h-full object-cover">
            </div>
            
            <h3 class="text-[13px] font-black leading-tight text-gray-800 line-clamp-2 mb-1">${menu.nama}</h3>
            ${menu.hargaDiskon ? `
                <div class="flex items-center gap-1.5 mb-2">
                    <span class="text-[12px] font-black text-amber-600">Rp ${menu.hargaDiskon}</span>
                    <span class="text-[9px] font-bold text-gray-400 line-through">Rp ${menu.hargaNormal}</span>
                </div>
            ` : `
                <div class="text-[12px] font-black text-amber-600 mb-2">Rp ${menu.hargaNormal}</div>
            `}
            
            <button onclick="${isHabis ? "alert('Maaf, menu ini sedang habis.')" : `window.openMenuDetail('${menu.id}')`}" 
                class="w-full py-2 rounded-xl text-[11px] font-black transition-all shadow-sm ${isHabis ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white active:bg-amber-500'}">
                ${isHabis ? 'KOSONG' : 'TAMBAH'}
            </button>
        </div>`;
    }).join('');
};

// --- RENDER KATALOG DI PANEL MASTER OWNER ---
window.renderAdminKatalog = function() {
    const listAdmin = document.getElementById('admin-katalog-list');
    if (!listAdmin) return;

    if (window.katalogMenu.length === 0) {
        listAdmin.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl">Belum ada menu di katalog.</div>`;
        return;
    }

    listAdmin.innerHTML = window.katalogMenu.map((m, index) => {
        const isHabis = (m.isSoldOut === true || m.isSoldOut === "true");
        return `
        <div class="flex items-center justify-between bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div class="flex items-center gap-3">
                <img src="${m.img}" class="w-12 h-12 rounded-lg object-cover bg-gray-100">
                <div>
                    <h4 class="text-[12px] font-black text-gray-800">${m.nama}</h4>
                    <p class="text-[10px] font-bold text-amber-600">Rp ${m.hargaDiskon || m.hargaNormal}</p>
                    <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${isHabis ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                        ${isHabis ? 'Habis' : 'Tersedia'}
                    </span>
                </div>
            </div>
            <div class="flex gap-2">
                <button onclick="window.toggleStatusMenu('${m.id}')" class="w-8 h-8 flex justify-center items-center rounded-lg bg-gray-100 text-gray-600 shadow-sm active:bg-gray-200">
                    <i class="fas fa-power-off text-[12px]"></i>
                </button>
                <button onclick="window.hapusMenu('${m.id}')" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-100 text-red-500 shadow-sm active:bg-red-200">
                    <i class="fas fa-trash text-[12px]"></i>
                </button>
            </div>
        </div>`;
    }).join('');
};

// --- TAMBAH MENU BARU DARI PANEL MASTER ---
window.simpanMenu = function() {
    const id = 'M-' + new Date().getTime();
    const nama = document.getElementById('input-nama-menu')?.value;
    const kategori = document.getElementById('input-kategori-menu')?.value;
    const hargaNormal = document.getElementById('input-harga-normal')?.value;
    const hargaDiskon = document.getElementById('input-harga-diskon')?.value;
    const deskripsi = document.getElementById('input-deskripsi')?.value;
    const imgBase64 = document.getElementById('preview-menu-base64')?.value;

    if (!nama || !hargaNormal || !kategori) {
        return alert("Nama, Kategori, dan Harga Normal wajib diisi!");
    }

    const menuBaru = {
        id: id,
        nama: nama,
        kategori: kategori,
        hargaNormal: hargaNormal,
        hargaDiskon: hargaDiskon || null,
        deskripsi: deskripsi || '',
        img: imgBase64 || 'default-menu.png',
        isSoldOut: false
    };

    window.katalogMenu.push(menuBaru);
    localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
    
    // Reset Form
    document.getElementById('input-nama-menu').value = '';
    document.getElementById('input-harga-normal').value = '';
    document.getElementById('input-harga-diskon').value = '';
    document.getElementById('input-deskripsi').value = '';
    if(document.getElementById('preview-menu-base64')) document.getElementById('preview-menu-base64').value = '';
    if(document.getElementById('preview-img-menu')) document.getElementById('preview-img-menu').src = '';
    
    // Sembunyikan panel tambah menu jika ada
    const panelForm = document.getElementById('panel-tambah-menu');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }
    
    window.renderAdminKatalog();
    window.renderKatalog(window.kategoriAktif);
    alert("Menu baru berhasil ditambahkan!");
};

// --- HAPUS & UBAH STATUS MENU ---
window.hapusMenu = function(id) {
    if (!confirm("Yakin ingin menghapus menu ini?")) return;
    
    window.katalogMenu = window.katalogMenu.filter(m => m.id !== id);
    localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
    
    window.renderAdminKatalog();
    window.renderKatalog(window.kategoriAktif);
};

window.toggleStatusMenu = function(id) {
    const idx = window.katalogMenu.findIndex(m => m.id === id);
    if (idx > -1) {
        // Toggle (Jika true jadi false, jika false jadi true)
        window.katalogMenu[idx].isSoldOut = !window.katalogMenu[idx].isSoldOut;
        localStorage.setItem('dbKatalogMainstay', JSON.stringify(window.katalogMenu));
        
        window.renderAdminKatalog();
        window.renderKatalog(window.kategoriAktif);
    }
};
// ============================================================================
// PART 9: MANAJEMEN STAF KASIR & PELANGGAN (MEMBER)
// ============================================================================

// --- MANAJEMEN STAF KASIR ---
window.renderTabelStaf = function() {
    const listEl = document.getElementById('admin-staf-list');
    if (!listEl) return;

    if (window.dbStaf.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-gray-100">Belum ada data staf.</div>`;
        return;
    }

    listEl.innerHTML = window.dbStaf.map((staf, index) => `
        <div class="flex items-center justify-between bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div>
                <h4 class="text-[12px] font-black text-gray-800">${staf.nama}</h4>
                <p class="text-[10px] font-bold text-gray-500 mb-1">PIN Login: <span class="tracking-widest">${staf.pin}</span></p>
                <span class="text-[9px] font-bold px-2 py-0.5 rounded-full ${staf.statusHadir ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}">
                    ${staf.statusHadir ? 'Hadir (Online)' : 'Offline'}
                </span>
            </div>
            <button onclick="window.hapusStaf(${index})" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-100 text-red-500 shadow-sm active:bg-red-200">
                <i class="fas fa-trash text-[12px]"></i>
            </button>
        </div>
    `).join('');
};

window.simpanStaf = function() {
    const nama = document.getElementById('input-nama-staf')?.value;
    const pin = document.getElementById('input-pin-staf')?.value;

    if (!nama || !pin) {
        return alert("Nama dan PIN Staf wajib diisi!");
    }
    
    // Proteksi PIN agar tidak bentrok dengan Owner atau staf lain
    if (pin === window.ownerProfile.pin) {
        return alert("PIN ini sudah digunakan oleh Master Owner. Gunakan PIN lain!");
    }
    if (window.dbStaf.some(s => s.pin === pin)) {
        return alert("PIN ini sudah digunakan oleh staf lain. Gunakan PIN yang unik!");
    }

    // Masukkan ke database
    window.dbStaf.push({ nama: nama, pin: pin, statusHadir: false });
    localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));

    // Bersihkan form
    document.getElementById('input-nama-staf').value = '';
    document.getElementById('input-pin-staf').value = '';

    // Animasi tutup panel tambah staf
    const panelForm = document.getElementById('panel-tambah-staf');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }

    window.renderTabelStaf();
    alert(`Data staf atas nama ${nama} berhasil ditambahkan!`);
};

window.hapusStaf = function(index) {
    const namaStaf = window.dbStaf[index].nama;
    if (!confirm(`Yakin ingin menghapus staf ${namaStaf} dari sistem?`)) return;
    
    window.dbStaf.splice(index, 1);
    localStorage.setItem('dbStafMainstay', JSON.stringify(window.dbStaf));
    window.renderTabelStaf();
};

// --- MANAJEMEN PELANGGAN (MEMBER) ---
window.renderTabelMember = function() {
    const listEl = document.getElementById('admin-member-list');
    if (!listEl) return;

    if (window.databaseMember.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-gray-100">Belum ada data member.</div>`;
        return;
    }

    listEl.innerHTML = window.databaseMember.map((member, index) => `
        <div class="flex items-center justify-between bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div>
                <h4 class="text-[12px] font-black text-gray-800">${member.nama}</h4>
                <p class="text-[10px] font-bold text-gray-500">${member.phone}</p>
                <p class="text-[9px] font-medium text-amber-600 mt-0.5">Total Poin: ${member.poin || 0}</p>
            </div>
            <button onclick="window.hapusMember(${index})" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-100 text-red-500 shadow-sm active:bg-red-200">
                <i class="fas fa-trash text-[12px]"></i>
            </button>
        </div>
    `).join('');
};

window.simpanMember = function() {
    const nama = document.getElementById('input-nama-member')?.value;
    const phone = document.getElementById('input-phone-member')?.value;

    if (!nama || !phone) {
        return alert("Nama dan Nomor Handphone/WhatsApp wajib diisi!");
    }

    // Pengecekan nomor HP duplikat
    if (window.databaseMember.some(m => m.phone === phone)) {
        return alert("Nomor Handphone ini sudah terdaftar sebagai member!");
    }

    const idMember = 'MEM-' + new Date().getTime();
    window.databaseMember.push({ id: idMember, nama: nama, phone: phone, poin: 0 });
    localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));

    // Bersihkan form
    document.getElementById('input-nama-member').value = '';
    document.getElementById('input-phone-member').value = '';

    // Animasi tutup panel
    const panelForm = document.getElementById('panel-tambah-member');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }

    window.renderTabelMember();
    alert(`Member baru atas nama ${nama} berhasil ditambahkan!`);
};

window.hapusMember = function(index) {
    const namaMember = window.databaseMember[index].nama;
    if (!confirm(`Yakin ingin menghapus member ${namaMember}?`)) return;
    
    window.databaseMember.splice(index, 1);
    localStorage.setItem('dbMemberMainstay', JSON.stringify(window.databaseMember));
    window.renderTabelMember();
};
// ============================================================================
// PART 10: MANAJEMEN STOK BARANG & ARUS KAS (KEUANGAN)
// ============================================================================

// --- MANAJEMEN STOK BARANG ---
window.renderTabelStok = function() {
    const listEl = document.getElementById('admin-stok-list');
    if (!listEl) return;

    if (window.stokBarangDB.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-gray-100">Belum ada data stok bahan/barang.</div>`;
        return;
    }

    listEl.innerHTML = window.stokBarangDB.map((item) => `
        <div class="bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="text-[12px] font-black text-gray-800">${item.namaBarang}</h4>
                    <p class="text-[10px] font-bold text-gray-500">Sisa Stok: <span class="text-amber-600 font-black">${item.qty} ${item.satuan}</span></p>
                </div>
                <button onclick="window.hapusBarangStok('${item.id}')" class="text-red-400 p-1 bg-red-50 rounded shadow-sm active:bg-red-100">
                    <i class="fas fa-trash text-[10px]"></i>
                </button>
            </div>
            
            <div class="flex gap-2 border-t border-gray-100 pt-2 mt-1">
                <button onclick="window.prosesUpdateStok('${item.id}', 'masuk')" class="flex-1 py-1.5 bg-green-100 text-green-700 text-[9px] font-black rounded border border-green-200 active:bg-green-200">
                    + STOK MASUK
                </button>
                <button onclick="window.prosesUpdateStok('${item.id}', 'keluar')" class="flex-1 py-1.5 bg-red-100 text-red-700 text-[9px] font-black rounded border border-red-200 active:bg-red-200">
                    - STOK KELUAR
                </button>
            </div>
        </div>
    `).join('');
};

window.simpanStokBarang = function() {
    const nama = document.getElementById('input-nama-barang')?.value;
    const satuan = document.getElementById('input-satuan-barang')?.value; // contoh: Pcs, Gram, Liter
    const qtyAwal = parseInt(document.getElementById('input-qty-awal')?.value) || 0;

    if (!nama || !satuan) {
        return alert("Nama Barang dan Satuan wajib diisi!");
    }

    const idBarang = 'STK-' + new Date().getTime();
    window.stokBarangDB.push({ id: idBarang, namaBarang: nama, satuan: satuan, qty: qtyAwal });
    localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));

    // Bersihkan form
    document.getElementById('input-nama-barang').value = '';
    document.getElementById('input-satuan-barang').value = '';
    document.getElementById('input-qty-awal').value = '';

    // Tutup panel tambah barang
    const panelForm = document.getElementById('panel-tambah-stok');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }

    window.renderTabelStok();
    alert(`Data barang ${nama} berhasil ditambahkan!`);
};

window.prosesUpdateStok = function(idBarang, jenis) {
    const barangIdx = window.stokBarangDB.findIndex(b => b.id === idBarang);
    if (barangIdx === -1) return;
    
    const barang = window.stokBarangDB[barangIdx];
    const qtyInput = prompt(`Masukkan jumlah stok ${jenis === 'masuk' ? 'MASUK' : 'KELUAR'} untuk ${barang.namaBarang} (Satuan: ${barang.satuan}):`, "0");
    
    if (qtyInput === null || qtyInput.trim() === "") return; // Batal
    
    const qtyNum = parseInt(qtyInput);
    if (isNaN(qtyNum) || qtyNum <= 0) return alert("Jumlah harus berupa angka lebih dari 0!");

    const keterangan = prompt(`Catatan / Keterangan (Opsional):`, `${jenis === 'masuk' ? 'Restock bahan' : 'Pemakaian harian'}`);
    const waktu = new Date().toLocaleString('id-ID');

    if (jenis === 'masuk') {
        window.stokBarangDB[barangIdx].qty += qtyNum;
    } else {
        if (window.stokBarangDB[barangIdx].qty < qtyNum) {
            return alert(`Gagal! Stok tidak cukup. Sisa stok saat ini hanya ${barang.qty} ${barang.satuan}.`);
        }
        window.stokBarangDB[barangIdx].qty -= qtyNum;
    }

    // Catat ke log histori stok
    window.stokLogDB.unshift({
        idBarang: barang.id,
        namaBarang: barang.namaBarang,
        jenis: jenis,
        qty: qtyNum,
        sisaStok: window.stokBarangDB[barangIdx].qty,
        satuan: barang.satuan,
        keterangan: keterangan || '-',
        waktu: waktu
    });

    // Simpan ke local storage
    localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
    localStorage.setItem('stokLogMainstay', JSON.stringify(window.stokLogDB));

    window.renderTabelStok();
    if (typeof window.renderLogStok === 'function') window.renderLogStok();
    alert(`Stok ${barang.namaBarang} berhasil diupdate!`);
};

window.hapusBarangStok = function(idBarang) {
    if (!confirm("Yakin ingin menghapus barang ini dari daftar inventaris?")) return;
    window.stokBarangDB = window.stokBarangDB.filter(b => b.id !== idBarang);
    localStorage.setItem('stokBarangMainstay', JSON.stringify(window.stokBarangDB));
    window.renderTabelStok();
};


// --- ARUS KAS & LAPORAN KEUANGAN ---
window.renderArusKas = function() {
    const listEl = document.getElementById('admin-aruskas-list');
    const totalEl = document.getElementById('admin-aruskas-total');
    if (!listEl) return;

    let totalSaldo = 0;

    if (window.arusKasDB.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-gray-100">Belum ada transaksi arus kas.</div>`;
        if (totalEl) totalEl.textContent = 'Rp 0';
        return;
    }

    listEl.innerHTML = window.arusKasDB.map((trx, index) => {
        if (trx.kategori === 'Pemasukan') {
            totalSaldo += trx.nominal;
        } else {
            totalSaldo -= trx.nominal;
        }

        const isPemasukan = trx.kategori === 'Pemasukan';
        
        return `
        <div class="flex items-center justify-between bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div class="flex-1 pr-2">
                <p class="text-[8px] font-bold text-gray-400 mb-0.5">${trx.tanggal}</p>
                <h4 class="text-[11px] font-black text-gray-800 line-clamp-1">${trx.keterangan}</h4>
                <p class="text-[9px] font-medium text-gray-500 mt-0.5">Oleh: ${trx.operator || 'Owner'}</p>
            </div>
            <div class="text-right flex flex-col items-end">
                <span class="text-[12px] font-black ${isPemasukan ? 'text-green-600' : 'text-red-500'}">
                    ${isPemasukan ? '+' : '-'} Rp ${trx.nominal}
                </span>
                <button onclick="window.hapusArusKas(${index})" class="mt-1 text-[9px] font-bold text-gray-400 hover:text-red-500 underline">Batalkan</button>
            </div>
        </div>`;
    }).join('');

    if (totalEl) {
        totalEl.textContent = `Rp ${totalSaldo}`;
        totalEl.className = `text-xl font-black ${totalSaldo >= 0 ? 'text-green-600' : 'text-red-600'}`;
    }
};

window.simpanArusKasManual = function() {
    const kategori = document.getElementById('input-kategori-kas')?.value; // 'Pemasukan' atau 'Pengeluaran'
    const nominal = parseInt(document.getElementById('input-nominal-kas')?.value) || 0;
    const keterangan = document.getElementById('input-keterangan-kas')?.value;

    if (nominal <= 0 || !keterangan) {
        return alert("Nominal dan Keterangan wajib diisi dengan benar!");
    }

    const sesi = localStorage.getItem('sesiMainstay');
    const operator = sesi === 'owner' ? window.ownerProfile.nama + ' (Master)' : 'Sistem POS';

    window.arusKasDB.unshift({
        id: 'KAS-' + new Date().getTime(),
        tanggal: new Date().toLocaleDateString('id-ID'),
        keterangan: keterangan,
        kategori: kategori,
        nominal: nominal,
        operator: operator
    });

    localStorage.setItem('arusKasMainstay', JSON.stringify(window.arusKasDB));

    // Bersihkan form
    document.getElementById('input-nominal-kas').value = '';
    document.getElementById('input-keterangan-kas').value = '';

    // Tutup panel
    const panelForm = document.getElementById('panel-tambah-kas');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }

    window.renderArusKas();
    alert(`Data arus kas (${kategori}) berhasil dicatat!`);
};

window.hapusArusKas = function(index) {
    if (!confirm("Peringatan: Yakin ingin menghapus catatan transaksi ini dari laporan?")) return;
    
    window.arusKasDB.splice(index, 1);
    localStorage.setItem('arusKasMainstay', JSON.stringify(window.arusKasDB));
    window.renderArusKas();
};
// ============================================================================
// PART 11: MANAJEMEN VOUCHER DISKON & PROMO/KONTEN SOSMED (FINAL)
// ============================================================================

// --- MANAJEMEN VOUCHER DISKON ---
window.renderAdminVoucher = function() {
    const listEl = document.getElementById('admin-voucher-list');
    if (!listEl) return;

    if (window.dbVoucher.length === 0) {
        listEl.innerHTML = `<div class="p-4 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl border border-gray-100">Belum ada voucher aktif.</div>`;
        return;
    }

    listEl.innerHTML = window.dbVoucher.map((v, index) => `
        <div class="flex items-center justify-between bg-white p-3 mb-2 rounded-xl border border-gray-100 shadow-sm">
            <div>
                <h4 class="text-[12px] font-black text-amber-600 tracking-widest">${v.kode}</h4>
                <p class="text-[10px] font-bold text-gray-800 mt-0.5">Diskon: ${v.tipe === 'persen' ? v.nominal + '%' : 'Rp ' + v.nominal}</p>
                <p class="text-[9px] font-medium text-gray-500">Kuota: ${v.kuota} | Min. Belanja: Rp ${v.minBelanja}</p>
            </div>
            <button onclick="window.hapusVoucher(${index})" class="w-8 h-8 flex justify-center items-center rounded-lg bg-red-100 text-red-500 shadow-sm active:bg-red-200">
                <i class="fas fa-trash text-[12px]"></i>
            </button>
        </div>
    `).join('');
};

window.simpanVoucher = function() {
    const kode = document.getElementById('input-kode-voucher')?.value?.toUpperCase();
    const tipe = document.getElementById('input-tipe-voucher')?.value; // 'persen' atau 'nominal'
    const nominal = parseInt(document.getElementById('input-nominal-voucher')?.value) || 0;
    const kuota = parseInt(document.getElementById('input-kuota-voucher')?.value) || 0;
    const minBelanja = parseInt(document.getElementById('input-min-belanja')?.value) || 0;

    if (!kode || nominal <= 0) {
        return alert("Kode dan Nominal Diskon wajib diisi dengan benar!");
    }
    
    if (window.dbVoucher.some(v => v.kode === kode)) {
        return alert("Kode voucher ini sudah ada! Buat kode yang berbeda.");
    }

    window.dbVoucher.push({ kode: kode, tipe: tipe, nominal: nominal, kuota: kuota, minBelanja: minBelanja });
    localStorage.setItem('dbVoucherMainstay', JSON.stringify(window.dbVoucher));

    // Reset form
    document.getElementById('input-kode-voucher').value = '';
    document.getElementById('input-nominal-voucher').value = '';
    document.getElementById('input-kuota-voucher').value = '';
    document.getElementById('input-min-belanja').value = '';

    // Tutup panel form
    const panelForm = document.getElementById('panel-tambah-voucher');
    if (panelForm) {
        panelForm.classList.add('translate-y-full');
        setTimeout(() => panelForm.classList.add('hidden'), 300);
    }

    window.renderAdminVoucher();
    alert(`Voucher ${kode} berhasil ditambahkan!`);
};

window.hapusVoucher = function(index) {
    if (!confirm("Yakin ingin menghapus voucher ini?")) return;
    window.dbVoucher.splice(index, 1);
    localStorage.setItem('dbVoucherMainstay', JSON.stringify(window.dbVoucher));
    window.renderAdminVoucher();
};


// --- MANAJEMEN PROMO PENGUMUMAN (MARQUEE / TULISAN BERJALAN) ---
window.renderAdminMarquee = function() {
    const listEl = document.getElementById('admin-marquee-list');
    const displayPublik = document.getElementById('marquee-display'); // ID di tampilan customer
    
    // Update tampilan di area customer (jika ada elemennya)
    if (displayPublik) {
        if (window.marqueeData.length > 0) {
            displayPublik.innerHTML = `<marquee class="text-[10px] font-bold text-white bg-amber-500 py-1.5 flex items-center">${window.marqueeData.join(' &nbsp; • &nbsp; ')}</marquee>`;
        } else {
            displayPublik.innerHTML = '';
        }
    }

    // Update list di panel admin
    if (!listEl) return;
    if (window.marqueeData.length === 0) {
        listEl.innerHTML = `<div class="p-3 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl">Belum ada teks pengumuman.</div>`;
        return;
    }

    listEl.innerHTML = window.marqueeData.map((text, index) => `
        <div class="flex items-center justify-between bg-white p-2.5 mb-2 rounded-lg border border-gray-100 shadow-sm">
            <p class="text-[11px] font-medium text-gray-800 line-clamp-1 flex-1 pr-2">${text}</p>
            <button onclick="window.hapusMarquee(${index})" class="text-red-500 p-1.5 bg-red-50 rounded shadow-sm">
                <i class="fas fa-trash text-[10px]"></i>
            </button>
        </div>
    `).join('');
};

window.simpanMarquee = function() {
    const text = document.getElementById('input-text-marquee')?.value;
    if (!text) return alert("Teks pengumuman tidak boleh kosong!");

    window.marqueeData.push(text);
    localStorage.setItem('marqueeMainstay', JSON.stringify(window.marqueeData));
    
    document.getElementById('input-text-marquee').value = '';
    window.renderAdminMarquee();
};

window.hapusMarquee = function(index) {
    window.marqueeData.splice(index, 1);
    localStorage.setItem('marqueeMainstay', JSON.stringify(window.marqueeData));
    window.renderAdminMarquee();
};


// --- MANAJEMEN GAMBAR CAROUSEL (BANNER PROMO) ---
window.renderAdminCarousel = function() {
    const listEl = document.getElementById('admin-carousel-list');
    
    // Trigger render ke tampilan customer jika fungsi render HTML-nya ada
    if (typeof window.renderCarouselPublik === 'function') window.renderCarouselPublik();

    if (!listEl) return;
    if (window.carouselData.length === 0) {
        listEl.innerHTML = `<div class="p-3 text-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl">Belum ada banner promo.</div>`;
        return;
    }

    listEl.innerHTML = window.carouselData.map((imgBase64, index) => `
        <div class="relative rounded-xl overflow-hidden mb-2 border border-gray-100 shadow-sm aspect-[21/9]">
            <img src="${imgBase64}" class="w-full h-full object-cover">
            <button onclick="window.hapusCarousel(${index})" class="absolute top-2 right-2 w-7 h-7 flex justify-center items-center bg-red-500 text-white rounded-lg shadow">
                <i class="fas fa-trash text-[10px]"></i>
            </button>
        </div>
    `).join('');
};

window.simpanCarousel = function() {
    const imgBase64 = document.getElementById('input-img-carousel')?.value;
    if (!imgBase64) return alert("Pilih gambar terlebih dahulu!");

    window.carouselData.push(imgBase64);
    localStorage.setItem('carouselMainstay', JSON.stringify(window.carouselData));
    
    // Bersihkan input gambar
    document.getElementById('input-img-carousel').value = '';
    const previewArea = document.getElementById('preview-carousel');
    if (previewArea) previewArea.src = '';
    
    window.renderAdminCarousel();
};

window.hapusCarousel = function(index) {
    if (!confirm("Hapus banner ini dari tampilan aplikasi?")) return;
    window.carouselData.splice(index, 1);
    localStorage.setItem('carouselMainstay', JSON.stringify(window.carouselData));
    window.renderAdminCarousel();
};

// Event listener tambahan untuk memuat data promo & pengumuman saat web dibuka
window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.renderAdminMarquee === 'function') window.renderAdminMarquee();
    if (typeof window.renderAdminCarousel === 'function') window.renderAdminCarousel();
});
// ============================================================================
// PERBAIKAN BUG: NAVIGASI STUCK, LOGOUT, EXIT LOGIN, & FOOTER
// ============================================================================

// 1. Fungsi Exit/Tutup Modal Login (Ini yang bikin layar nge-blank/stuck)
window.tutupLogin = function() {
    const modalLogin = document.getElementById('modal-login');
    if (modalLogin) {
        modalLogin.classList.add('hidden');
        modalLogin.classList.remove('flex', 'z-[9999]');
    }
};

// 2. Perbaikan Render View & Sembunyikan Footer di Kasir/Owner
window.renderView = function(role) {
    // Pindah-pindah tampilan utama
    ['customer', 'kasir', 'owner'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
            if (v === role) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });

    // Cari area Footer / Maps / Sosmed (Deteksi otomatis dari tag <footer> atau ID)
    const elemenFooter = document.querySelector('footer') || document.getElementById('footer') || document.getElementById('footer-area');
    
    // Logika Sembunyikan Footer
    if (elemenFooter) {
        if (role === 'customer') {
            elemenFooter.style.display = ''; // Munculkan kembali untuk Publik
        } else {
            elemenFooter.style.display = 'none'; // Sembunyikan untuk Kasir & Owner
        }
    }
    
    // Pastikan modal login juga otomatis tertutup saat ganti view
    window.tutupLogin();
};

// 3. Perbaikan Fungsi Logout (Logout Kasir & Kunci Master)
window.logoutKasir = function() {
    localStorage.removeItem('sesiMainstay');
    window.renderView('customer');
    
    // Bersihkan sisa-sisa pop up kasir jika ada yang nyangkut
    const lockOverlay = document.getElementById('kasir-lock-overlay');
    if (lockOverlay) lockOverlay.classList.add('hidden');
    
    alert("Berhasil Logout dari Sistem Kasir.");
};

window.kunciPanelMaster = function() {
    localStorage.removeItem('sesiMainstay');
    window.renderView('customer');
    alert("Berhasil keluar. Panel Master telah dikunci aman.");
};
