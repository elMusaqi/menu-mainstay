/* ==========================================================================
   MAINSTAY DRINK SHOP - ENGINE & LOGIC (TAHAP 3)
   Pure JavaScript Implementation
   Features: Real-time Live Clock (Stacked Date & Time), POS Cart Engine,
             Anti-Fraud Loyalty Stamp, & Full Owner Dashboard Controls
   ========================================================================== */

// 1. DATA DEFAULT KATALOG MENU
const DEFAULT_MENU_ITEMS = [
  { id: "M01", name: "Espresso Mainstay", category: "coffee", price: 15000, img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400" },
  { id: "M02", name: "Kopi Susu Aren", category: "coffee", price: 18000, img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400" },
  { id: "M03", name: "Americano Ice", category: "coffee", price: 16000, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400" },
  { id: "M04", name: "Matcha Latte", category: "non-coffee", price: 20000, img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400" },
  { id: "M05", name: "Chocolate Ice", category: "non-coffee", price: 19000, img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400" },
  { id: "M06", name: "Croissant Butter", category: "food", price: 22000, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400" }
];

// 2. DEFAULT SYSTEM STATE
const DEFAULT_SYSTEM_STATE = {
  branding: {
    restoName: "Mainstay Drink Shop",
    tagline: "Minuman Andalanmu",
    logoUrl: "",
    faviconUrl: "",
    qrisUrl: "",
    universalWaNumber: "628123456789",
    waBroadcastUrl: "https://chat.whatsapp.com/ExampleGroupLink",
    runningText: "Info: Nikmati diskon spesial untuk Member Mainstay! Pasokan bahan baku segar tiba setiap hari.",
    enableRunningText: true,
    socialMedia: {
      instagram: "https://instagram.com/mainstay.coffee",
      tiktok: "https://tiktok.com/@mainstay.coffee",
      mapsEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.2!2d110.4!3d-6.9!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwNTQnMDAuMCJTIDExMMKwMjQnMDAuMCJF!5e0!3m2!1sid!2sid!4v1"
    }
  },
  loyaltyConfig: {
    minTransactionAmount: 30000,
    targetStamps: 5,
    rewardVoucherId: "VOUCHER_DEFAULT_REWARD"
  },
  masterSpreadsheetUrl: "https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit",
  profiles: {
    owner: {
      name: "Owner Mainstay",
      pin: "9999",
      phone: "628123456789"
    },
    staffs: [
      { id: "STAFF_01", name: "Kasir Utama", pin: "1234", phone: "628987654321", salaryCategory: "monthly", salaryAmount: 2500000, active: true }
    ]
  },
  vouchers: [
    { id: "VOUCHER_DEFAULT_REWARD", code: "STEMPELMEMBER", title: "Hadiah Stempel Gratis Kopi", discountType: "nominal", discountValue: 18000, targetScope: "all", active: true }
  ],
  banners: [
    { id: "BANNER_01", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200", autoEquipVoucherId: "VOUCHER_DEFAULT_REWARD", active: true }
  ],
  customers: {}
};

// 3. SYSTEM STORE MANAGER
class SystemStore {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      const saved = localStorage.getItem("MAINSTAY_SYSTEM_DATA");
      if (saved) return { ...DEFAULT_SYSTEM_STATE, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Gagal membaca LocalStorage:", e);
    }
    return { ...DEFAULT_SYSTEM_STATE };
  }

  saveState() {
    try {
      localStorage.setItem("MAINSTAY_SYSTEM_DATA", JSON.stringify(this.state));
    } catch (e) {
      console.error("Gagal menyimpan ke LocalStorage:", e);
    }
  }

  exportJSONBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `MAINSTAY_BACKUP_${Date.now()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  importJSONBackup(jsonContent) {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed && parsed.branding) {
        this.state = { ...DEFAULT_SYSTEM_STATE, ...parsed };
        this.saveState();
        alert("System Backup JSON berhasil di-restore!");
        window.location.reload();
      } else {
        alert("File JSON tidak valid!");
      }
    } catch (e) {
      alert("Error membaca file JSON: " + e.message);
    }
  }
}

const mainStore = new SystemStore();

// 4. UTILITIES
const Utils = {
  formatRp(num) {
    return "Rp " + Number(num || 0).toLocaleString("id-ID");
  },
  
  // Format waktu lengkap untuk bukti struk/WA: DD/MM/YYYY HH:MM:SS WIB
  getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} WIB`;
  },
  
  // Format Hari & Tanggal Utuh tanpa Titik-Titik
  getDayDate() {
    const now = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
};

// 5. APP CONTROLLER
let cart = [];
let activeCategory = "all";
let currentCarouselIndex = 0;
let carouselTimer = null;

const App = {
  init() {
    this.startClock();
    this.renderBranding();
    this.renderMenuGrid();
    Carousel.init();
    POS.renderMenu();
    this.switchView('customer');
  },

  // Waktu Live: Hari & Tanggal Utuh di Baris 1, Jam/Menit/Detik Live di Baris 2
  startClock() {
    setInterval(() => {
      const clockEl = document.getElementById("realtimeClock");
      const dateEl = document.getElementById("realtimeDayDate");
      if (dateEl) dateEl.innerText = Utils.getDayDate();
      if (clockEl) clockEl.innerText = new Date().toLocaleTimeString("id-ID") + " WIB";
    }, 1000);
  },

  renderBranding() {
    const b = mainStore.state.branding;
    document.getElementById("headerRestoName").innerText = b.restoName || "Mainstay Drink Shop";
    document.getElementById("headerTagline").innerText = b.tagline || "Minuman Andalanmu";
    if (b.logoUrl) document.getElementById("headerLogo").src = b.logoUrl;

    const marquee = document.getElementById("marqueeText");
    const container = document.getElementById("runningTextContainer");
    if (marquee && container) {
      if (b.enableRunningText && b.runningText) {
        container.classList.remove("hidden");
        marquee.innerText = b.runningText;
      } else {
        container.classList.add("hidden");
      }
    }

    const iframe = document.getElementById("googleMapsIframe");
    if (iframe && b.socialMedia.mapsEmbedUrl) iframe.src = b.socialMedia.mapsEmbedUrl;

    const sosmedBox = document.getElementById("socialMediaIcons");
    if (sosmedBox) {
      sosmedBox.innerHTML = `
        <a href="${b.socialMedia.instagram}" target="_blank" style="color:#d97706; text-decoration:none; font-weight:bold; font-size:0.75rem;">Instagram</a>
        <span style="color:#cbd5e1">•</span>
        <a href="${b.socialMedia.tiktok}" target="_blank" style="color:#d97706; text-decoration:none; font-weight:bold; font-size:0.75rem;">TikTok</a>
        <span style="color:#cbd5e1">•</span>
        <a href="https://wa.me/${b.universalWaNumber}" target="_blank" style="color:#d97706; text-decoration:none; font-weight:bold; font-size:0.75rem;">WhatsApp</a>
      `;
    }
  },

  switchView(viewName) {
    document.querySelectorAll(".view-section").forEach(el => el.classList.add("hidden"));
    if (viewName === 'customer') document.getElementById("viewCustomer").classList.remove("hidden");
    if (viewName === 'pos') document.getElementById("viewPOS").classList.remove("hidden");
    if (viewName === 'owner') document.getElementById("viewOwner").classList.remove("hidden");
  },

  openModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
  },

  closeModal(id) {
    document.getElementById(id)?.classList.add("hidden");
  },

  filterCategory(cat, event) {
    activeCategory = cat;
    document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
    if (event) event.target.classList.add("active");
    this.renderMenuGrid();
  },

  renderMenuGrid() {
    const grid = document.getElementById("customerMenuGrid");
    if (!grid) return;

    const items = activeCategory === "all" 
      ? DEFAULT_MENU_ITEMS 
      : DEFAULT_MENU_ITEMS.filter(m => m.category === activeCategory);

    grid.innerHTML = items.map(item => `
      <div class="menu-card">
        <img src="${item.img}" alt="${item.name}" class="menu-card-img">
        <div>
          <h3>${item.name}</h3>
          <p class="price">${Utils.formatRp(item.price)}</p>
        </div>
        <button onclick="POS.addToCart('${item.id}')" class="btn-amber-light btn-sm w-full">+ Pesan</button>
      </div>
    `).join("");
  },

  processLogin() {
    const pin = document.getElementById("inputLoginPin").value.trim();
    const store = mainStore.state;

    if (pin === store.profiles.owner.pin) {
      this.closeModal("modalLogin");
      document.getElementById("inputLoginPin").value = "";
      Owner.initDashboard();
      this.switchView("owner");
      return;
    }

    const staff = store.profiles.staffs.find(s => s.pin === pin && s.active);
    if (staff) {
      this.closeModal("modalLogin");
      document.getElementById("inputLoginPin").value = "";
      this.switchView("pos");
      alert(`Selamat bekerja, ${staff.name}!`);
      return;
    }

    alert("PIN Salah atau akun tidak aktif!");
  },

  logout() {
    this.switchView("customer");
  },

  handleImportJSON() {
    const input = document.getElementById("jsonImportInput");
    if (!input.files || input.files.length === 0) {
      alert("Pilih file JSON!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => mainStore.importJSONBackup(e.target.result);
    reader.readAsText(input.files[0]);
  }
};

// 6. CAROUSEL ENGINE
const Carousel = {
  init() {
    this.render();
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => this.next(), 5000);
  },

  render() {
    const track = document.getElementById("carouselSlides");
    const dots = document.getElementById("carouselIndicators");
    const banners = mainStore.state.banners.filter(b => b.active);
    if (!track || banners.length === 0) return;

    track.innerHTML = banners.map(b => `
      <div class="carousel-slide">
        <img src="${b.mediaUrl}" alt="Banner Promo">
      </div>
    `).join("");

    dots.innerHTML = banners.map((_, i) => `
      <div class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="Carousel.goTo(${i})"></div>
    `).join("");
  },

  next() {
    const banners = mainStore.state.banners.filter(b => b.active);
    currentCarouselIndex = (currentCarouselIndex + 1) % banners.length;
    this.update();
  },

  prev() {
    const banners = mainStore.state.banners.filter(b => b.active);
    currentCarouselIndex = (currentCarouselIndex - 1 + banners.length) % banners.length;
    this.update();
  },

  goTo(i) {
    currentCarouselIndex = i;
    this.update();
  },

  update() {
    const track = document.getElementById("carouselSlides");
    if (track) track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    document.querySelectorAll(".carousel-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentCarouselIndex);
    });
  }
};

// 7. POS & CHECKOUT ENGINE
const POS = {
  renderMenu() {
    const grid = document.getElementById("posMenuGrid");
    if (!grid) return;

    grid.innerHTML = DEFAULT_MENU_ITEMS.map(item => `
      <div class="menu-card">
        <img src="${item.img}" alt="${item.name}" class="menu-card-img">
        <div>
          <h3>${item.name}</h3>
          <p class="price">${Utils.formatRp(item.price)}</p>
        </div>
        <button onclick="POS.addToCart('${item.id}')" class="btn-amber-light btn-sm w-full">+ Tambah</button>
      </div>
    `).join("");
  },

  addToCart(id) {
    const item = DEFAULT_MENU_ITEMS.find(m => m.id === id);
    if (!item) return;

    const exist = cart.find(c => c.id === id);
    if (exist) {
      exist.qty += 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    this.renderCart();
  },

  changeQty(id, delta) {
    const idx = cart.findIndex(c => c.id === id);
    if (idx !== -1) {
      cart[idx].qty += delta;
      if (cart[idx].qty <= 0) cart.splice(idx, 1);
    }
    this.renderCart();
  },

  clearCart() {
    cart = [];
    this.renderCart();
  },

  getCalculations() {
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    return { subtotal, discount: 0, total: subtotal };
  },

  renderCart() {
    const container = document.getElementById("posCartItems");
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `<p class="empty-msg">Keranjang masih kosong</p>`;
    } else {
      container.innerHTML = cart.map(i => `
        <div class="flex-row" style="justify-content:space-between; margin-bottom:0.5rem;">
          <div>
            <strong>${i.name}</strong><br>
            <small style="color:#64748b">${Utils.formatRp(i.price)} x ${i.qty}</small>
          </div>
          <div class="flex-row gap">
            <button onclick="POS.changeQty('${i.id}', -1)" class="btn-light-slate btn-sm" style="padding:0.1rem 0.4rem">-</button>
            <span>${i.qty}</span>
            <button onclick="POS.changeQty('${i.id}', 1)" class="btn-light-slate btn-sm" style="padding:0.1rem 0.4rem">+</button>
          </div>
        </div>
      `).join("");
    }

    const { subtotal, discount, total } = this.getCalculations();
    document.getElementById("posSubtotalText").innerText = Utils.formatRp(subtotal);
    document.getElementById("posDiscountText").innerText = "- " + Utils.formatRp(discount);
    document.getElementById("posTotalText").innerText = Utils.formatRp(total);
  },

  checkout() {
    if (cart.length === 0) {
      alert("Keranjang kosong!");
      return;
    }

    const name = document.getElementById("posCustomerName").value.trim() || "Pelanggan";
    const phone = document.getElementById("posCustomerPhone").value.trim();
    const method = document.getElementById("posPaymentMethod").value;
    const { total } = this.getCalculations();

    const timestamp = Utils.getTimestamp();
    const itemDetails = cart.map(i => `- ${i.name} x ${i.qty} : ${Utils.formatRp(i.price * i.qty)}`).join("\n");

    let stampText = "Non-Member";
    if (phone) {
      if (!mainStore.state.customers[phone]) {
        mainStore.state.customers[phone] = { name, isMember: false, totalStamps: 0 };
      }
      if (total >= mainStore.state.loyaltyConfig.minTransactionAmount) {
        mainStore.state.customers[phone].totalStamps += 1;
      }
      stampText = `${mainStore.state.customers[phone].totalStamps} / ${mainStore.state.loyaltyConfig.targetStamps}`;
      mainStore.saveState();
    }

    const waText = `----------------------------------------
*TRANSAKSI BERHASIL - MAINSTAY DRINK SHOP*
----------------------------------------
📅 Waktu: ${timestamp}
----------------------------------------

*DETAIL PESANAN:*
${itemDetails}

----------------------------------------
*TOTAL : ${Utils.formatRp(total)}*
*BAYAR : ${method}*
*STATUS : LUNAS*
----------------------------------------

🎁 *LOYALTY MEMBER MAINSTAY*
👤 Status: Member
🎟️ Total Stempel Anda: ${stampText}
----------------------------------------
*Simpan pesan ini sebagai bukti sah.*`;

    const targetWa = phone || mainStore.state.branding.universalWaNumber;
    window.open(`https://wa.me/${targetWa}?text=${encodeURIComponent(waText)}`, '_blank');

    this.clearCart();
    document.getElementById("posCustomerName").value = "";
    document.getElementById("posCustomerPhone").value = "";
    alert("Transaksi Selesai & Struk dikirim ke WA!");
  }
};

// 8. MEMBER LOYALTY
const Member = {
  checkStamps() {
    const phone = document.getElementById("checkMemberPhone").value.trim();
    const box = document.getElementById("stampResultBox");
    if (!phone) {
      alert("Masukkan nomor WA!");
      return;
    }

    const customer = mainStore.state.customers[phone];
    const target = mainStore.state.loyaltyConfig.targetStamps;
    const stamps = customer ? customer.totalStamps : 0;

    box.classList.remove("hidden");
    let circles = "";
    for (let i = 1; i <= target; i++) {
      circles += `<div class="stamp-circle ${i <= stamps ? 'active' : ''}">${i <= stamps ? '☕' : i}</div>`;
    }

    box.innerHTML = `
      <strong>${customer ? customer.name : 'Pelanggan'}</strong>
      <div class="stamp-grid">${circles}</div>
      <small style="color:#d97706; font-weight:bold;">Total Stempel: ${stamps} / ${target}</small>
    `;
  },

  joinMember() {
    const name = document.getElementById("joinMemberName").value.trim();
    const phone = document.getElementById("joinMemberPhone").value.trim();

    if (!name || !phone) {
      alert("Isi Nama & No WA!");
      return;
    }

    if (!mainStore.state.customers[phone]) {
      mainStore.state.customers[phone] = { name, isMember: true, totalStamps: 0 };
    } else {
      mainStore.state.customers[phone].isMember = true;
    }
    mainStore.saveState();

    alert("Pendaftaran Berhasil! Mengalihkan ke WA Broadcast...");
    window.open(mainStore.state.branding.waBroadcastUrl, '_blank');
    App.closeModal('modalMemberJoin');
  }
};

// 9. OWNER DASHBOARD CONTROLLER
const Owner = {
  initDashboard() {
    const b = mainStore.state.branding;
    document.getElementById("ownRestoName").value = b.restoName;
    document.getElementById("ownTagline").value = b.tagline;
    document.getElementById("ownUniversalWa").value = b.universalWaNumber;
    document.getElementById("ownWaBroadcastUrl").value = b.waBroadcastUrl;
    document.getElementById("ownLogoUrl").value = b.logoUrl;
    document.getElementById("ownFaviconUrl").value = b.faviconUrl;
    document.getElementById("ownQrisUrl").value = b.qrisUrl;
    document.getElementById("ownRunningText").value = b.runningText;
    document.getElementById("ownMapsEmbedUrl").value = b.socialMedia.mapsEmbedUrl;

    document.getElementById("ownOwnerName").value = mainStore.state.profiles.owner.name;
    document.getElementById("ownOwnerPin").value = mainStore.state.profiles.owner.pin;
    document.getElementById("ownOwnerPhone").value = mainStore.state.profiles.owner.phone;

    document.getElementById("ownSpreadsheetUrlInput").value = mainStore.state.masterSpreadsheetUrl;
    document.getElementById("btnOpenSpreadsheet").href = mainStore.state.masterSpreadsheetUrl;

    this.renderStaffTable();
    this.renderVoucherTable();
  },

  switchTab(tabName, event) {
    document.querySelectorAll(".owner-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".owner-tab-content").forEach(c => c.classList.add("hidden"));
    if (event) event.target.classList.add("active");

    if (tabName === 'branding') document.getElementById("tabOwnerBranding").classList.remove("hidden");
    if (tabName === 'vouchers') document.getElementById("tabOwnerVouchers").classList.remove("hidden");
    if (tabName === 'stamps') document.getElementById("tabOwnerStamps").classList.remove("hidden");
    if (tabName === 'profiles') document.getElementById("tabOwnerProfiles").classList.remove("hidden");
    if (tabName === 'database') document.getElementById("tabOwnerDatabase").classList.remove("hidden");
  },

  handleFileUpload(inputEl, targetId) {
    if (inputEl.files && inputEl.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById(targetId).value = e.target.result;
      };
      reader.readAsDataURL(inputEl.files[0]);
    }
  },

  saveBrandingSettings() {
    const b = mainStore.state.branding;
    b.restoName = document.getElementById("ownRestoName").value;
    b.tagline = document.getElementById("ownTagline").value;
    b.universalWaNumber = document.getElementById("ownUniversalWa").value;
    b.waBroadcastUrl = document.getElementById("ownWaBroadcastUrl").value;
    b.logoUrl = document.getElementById("ownLogoUrl").value;
    b.faviconUrl = document.getElementById("ownFaviconUrl").value;
    b.qrisUrl = document.getElementById("ownQrisUrl").value;
    b.runningText = document.getElementById("ownRunningText").value;
    b.socialMedia.mapsEmbedUrl = document.getElementById("ownMapsEmbedUrl").value;

    mainStore.saveState();
    App.renderBranding();
    alert("Branding berhasil disimpan!");
  },

  saveOwnerProfile() {
    const o = mainStore.state.profiles.owner;
    o.name = document.getElementById("ownOwnerName").value;
    o.pin = document.getElementById("ownOwnerPin").value;
    o.phone = document.getElementById("ownOwnerPhone").value;
    mainStore.saveState();
    alert("Profil Owner disimpan!");
  },

  renderStaffTable() {
    const tbody = document.getElementById("staffTableBody");
    if (!tbody) return;

    tbody.innerHTML = mainStore.state.profiles.staffs.map(s => `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td><code>${s.pin}</code></td>
        <td style="text-transform:uppercase">${s.salaryCategory}</td>
        <td>${Utils.formatRp(s.salaryAmount)}</td>
        <td><a href="https://wa.me/${s.phone}" target="_blank" style="color:#16a34a; font-weight:bold;">Direct WA</a></td>
        <td><button onclick="Owner.deleteStaff('${s.id}')" class="text-danger">Hapus</button></td>
      </tr>
    `).join("");
  },

  openStaffModal() {
    const name = prompt("Nama Staf:");
    const pin = prompt("PIN Kasir:");
    const phone = prompt("No WA:");
    const salaryAmount = Number(prompt("Nominal Gaji Rp:") || 0);

    if (name && pin && phone) {
      mainStore.state.profiles.staffs.push({
        id: "STAFF_" + Date.now(),
        name, pin, phone,
        salaryCategory: "monthly",
        salaryAmount,
        active: true
      });
      mainStore.saveState();
      this.renderStaffTable();
    }
  },

  deleteStaff(id) {
    if (confirm("Hapus staf ini?")) {
      mainStore.state.profiles.staffs = mainStore.state.profiles.staffs.filter(s => s.id !== id);
      mainStore.saveState();
      this.renderStaffTable();
    }
  },

  renderVoucherTable() {
    const tbody = document.getElementById("voucherTableBody");
    if (!tbody) return;

    tbody.innerHTML = mainStore.state.vouchers.map(v => `
      <tr>
        <td><strong style="color:#d97706">${v.code}</strong></td>
        <td>${v.title}</td>
        <td>${v.discountType === 'nominal' ? Utils.formatRp(v.discountValue) : v.discountValue + '%'}</td>
        <td style="text-transform:uppercase">${v.targetScope}</td>
      </tr>
    `).join("");
  },

  saveSpreadsheetUrl() {
    const url = document.getElementById("ownSpreadsheetUrlInput").value.trim();
    mainStore.state.masterSpreadsheetUrl = url;
    document.getElementById("btnOpenSpreadsheet").href = url;
    mainStore.saveState();
    alert("Link Master Spreadsheet disimpan!");
  }
};

// INITIALIZE ON DOM LOAD
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
