/* ==========================================================================
   MAINSTAY COFFEE - APPLICATION ENGINE (BAGIAN 3)
   Theme: Slate & Amber Clean
   Features: State Sync, Real-time Clock, Banner Auto-Equip, 
             POS Cart, Loyalty Stamp Anti-Fraud, WA Draft, & Owner Control
   ========================================================================== */

// 1. DATA MENU BAWAAN (DEFAULT CATALOG)
const DEFAULT_MENU_ITEMS = [
  { id: "M01", name: "Espresso Mainstay", category: "coffee", price: 15000, img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400" },
  { id: "M02", name: "Kopi Susu Aren", category: "coffee", price: 18000, img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400" },
  { id: "M03", name: "Americano Ice", category: "coffee", price: 16000, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400" },
  { id: "M04", name: "Matcha Latte", category: "non-coffee", price: 20000, img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400" },
  { id: "M05", name: "Chocolate Ice", category: "non-coffee", price: 19000, img: "https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=400" },
  { id: "M06", name: "Croissant Butter", category: "food", price: 22000, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400" }
];

// 2. STATE SYSTEM UTAMA
let cart = [];
let activeCategory = "all";
let currentCarouselIndex = 0;
let carouselTimer = null;
let currentUser = null; // null | { role: 'owner'|'staff', data: ... }

// 3. UTILITY FUNCTIONS
const Utils = {
  formatRp(amount) {
    return "Rp " + Number(amount || 0).toLocaleString("id-ID");
  },
  
  getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const d = pad(now.getDate());
    const m = pad(now.getMonth() + 1);
    const y = now.getFullYear();
    const h = pad(now.getHours());
    const min = pad(now.getMinutes());
    const s = pad(now.getSeconds());
    return `${d}/${m}/${y} ${h}:${min}:${s} WIB`;
  },

  getDayDate() {
    const now = new Date();
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  }
};

// 4. APP CONTROLLER
const App = {
  init() {
    this.startClock();
    this.renderBranding();
    this.renderMenuGrid();
    Carousel.init();
    POS.renderMenu();
    this.switchView('customer');
    if (window.feather) feather.replace();
  },

  startClock() {
    setInterval(() => {
      const clockEl = document.getElementById("realtimeClock");
      const dateEl = document.getElementById("realtimeDayDate");
      if (clockEl) clockEl.innerText = new Date().toLocaleTimeString("id-ID") + " WIB";
      if (dateEl) dateEl.innerText = Utils.getDayDate();
    }, 1000);
  },

  renderBranding() {
    const b = mainStore.state.branding;
    document.getElementById("headerRestoName").innerText = b.restoName || "Mainstay Coffee";
    document.getElementById("headerTagline").innerText = b.tagline || "";
    if (b.logoUrl) document.getElementById("headerLogo").src = b.logoUrl;
    
    // Running text
    const marquee = document.getElementById("marqueeText");
    const container = document.getElementById("runningTextContainer");
    if (marquee && container) {
      if (b.enableRunningText && b.runningText) {
        container.style.display = "block";
        marquee.innerText = b.runningText;
      } else {
        container.style.display = "none";
      }
    }

    // Maps
    const iframe = document.getElementById("googleMapsIframe");
    if (iframe && b.socialMedia.mapsEmbedUrl) {
      iframe.src = b.socialMedia.mapsEmbedUrl;
    }

    // Social Media
    const sosmedBox = document.getElementById("socialMediaIcons");
    if (sosmedBox) {
      sosmedBox.innerHTML = `
        <a href="${b.socialMedia.instagram}" target="_blank" class="p-2.5 bg-slate-950 border border-slate-800 rounded-full text-amber-500 hover:border-amber-500 transition">
          <i data-feather="instagram" class="w-4 h-4"></i>
        </a>
        <a href="${b.socialMedia.tiktok}" target="_blank" class="p-2.5 bg-slate-950 border border-slate-800 rounded-full text-amber-500 hover:border-amber-500 transition">
          <i data-feather="video" class="w-4 h-4"></i>
        </a>
        <a href="https://wa.me/${b.universalWaNumber}" target="_blank" class="p-2.5 bg-slate-950 border border-slate-800 rounded-full text-amber-500 hover:border-amber-500 transition">
          <i data-feather="message-circle" class="w-4 h-4"></i>
        </a>
      `;
      if (window.feather) feather.replace();
    }
  },

  switchView(viewName) {
    document.querySelectorAll(".view-section").forEach(el => el.classList.add("hidden"));
    if (viewName === 'customer') document.getElementById("viewCustomer").classList.remove("hidden");
    if (viewName === 'pos') document.getElementById("viewPOS").classList.remove("hidden");
    if (viewName === 'owner') document.getElementById("viewOwner").classList.remove("hidden");
  },

  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove("hidden");
  },

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add("hidden");
  },

  filterCategory(cat) {
    activeCategory = cat;
    document.querySelectorAll(".cat-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
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
        <div class="space-y-1 my-1">
          <h3 class="text-xs font-bold text-slate-100 line-clamp-1">${item.name}</h3>
          <p class="text-xs font-semibold text-amber-400">${Utils.formatRp(item.price)}</p>
        </div>
        <button onclick="POS.addToCart('${item.id}')" class="btn-amber text-xs py-1.5 w-full font-bold flex items-center justify-center gap-1">
          <i data-feather="plus" class="w-3.5 h-3.5"></i> Pesan
        </button>
      </div>
    `).join("");

    if (window.feather) feather.replace();
  },

  processLogin() {
    const pin = document.getElementById("inputLoginPin").value.trim();
    const store = mainStore.state;

    // Check Owner PIN
    if (pin === store.profiles.owner.pin) {
      currentUser = { role: "owner", data: store.profiles.owner };
      this.closeModal("modalLogin");
      document.getElementById("inputLoginPin").value = "";
      Owner.initDashboard();
      this.switchView("owner");
      return;
    }

    // Check Staff PIN
    const staff = store.profiles.staffs.find(s => s.pin === pin && s.active);
    if (staff) {
      currentUser = { role: "staff", data: staff };
      this.closeModal("modalLogin");
      document.getElementById("inputLoginPin").value = "";
      this.switchView("pos");
      alert(`Selamat bekerja, ${staff.name}!`);
      return;
    }

    alert("PIN Salah atau akun tidak aktif!");
  },

  logout() {
    currentUser = null;
    this.switchView("customer");
  },

  handleImportJSON() {
    const fileInput = document.getElementById("jsonImportInput");
    if (!fileInput.files || fileInput.files.length === 0) {
      alert("Pilih file JSON terlebih dahulu!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      mainStore.importJSONBackup(e.target.result);
    };
    reader.readAsText(fileInput.files[0]);
  }
};

// 5. CAROUSEL BANNER ENGINE
const Carousel = {
  init() {
    this.render();
    this.startAutoPlay();
  },

  render() {
    const track = document.getElementById("carouselSlides");
    const dots = document.getElementById("carouselIndicators");
    const banners = mainStore.state.banners.filter(b => b.active);

    if (!track || banners.length === 0) return;

    track.innerHTML = banners.map(b => `
      <div class="carousel-slide" onclick="Carousel.clickBanner('${b.autoEquipVoucherId}')">
        ${b.mediaType === 'video' 
          ? `<video src="${b.mediaUrl}" autoplay loop muted playsinline></video>`
          : `<img src="${b.mediaUrl}" alt="Banner Promo">`
        }
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

  goTo(index) {
    currentCarouselIndex = index;
    this.update();
  },

  update() {
    const track = document.getElementById("carouselSlides");
    if (track) track.style.transform = `translateX(-${currentCarouselIndex * 100}%)`;
    
    document.querySelectorAll(".carousel-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentCarouselIndex);
    });
  },

  startAutoPlay() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => this.next(), 6000);
  },

  clickBanner(voucherId) {
    if (voucherId) {
      alert("Promo Banner Diaktifkan! Diskon otomatis terpasang.");
      POS.appliedVoucherId = voucherId;
      POS.renderCart();
    }
  }
};

// 6. POS & CHECKOUT ENGINE
const POS = {
  appliedVoucherId: null,

  renderMenu() {
    const grid = document.getElementById("posMenuGrid");
    if (!grid) return;

    grid.innerHTML = DEFAULT_MENU_ITEMS.map(item => `
      <div class="menu-card">
        <img src="${item.img}" alt="${item.name}" class="menu-card-img">
        <div class="space-y-1 my-1">
          <h3 class="text-xs font-bold text-slate-100 line-clamp-1">${item.name}</h3>
          <p class="text-xs font-semibold text-amber-400">${Utils.formatRp(item.price)}</p>
        </div>
        <button onclick="POS.addToCart('${item.id}')" class="btn-amber text-xs py-1.5 w-full font-bold">
          + Tambah
        </button>
      </div>
    `).join("");
  },

  addToCart(itemId) {
    const item = DEFAULT_MENU_ITEMS.find(m => m.id === itemId);
    if (!item) return;

    const existing = cart.find(c => c.id === itemId);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ ...item, qty: 1 });
    }
    this.renderCart();
  },

  changeQty(itemId, delta) {
    const index = cart.findIndex(c => c.id === itemId);
    if (index !== -1) {
      cart[index].qty += delta;
      if (cart[index].qty <= 0) cart.splice(index, 1);
    }
    this.renderCart();
  },

  clearCart() {
    cart = [];
    this.appliedVoucherId = null;
    this.renderCart();
  },

  getCalculations() {
    const subtotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    let discount = 0;

    if (this.appliedVoucherId) {
      const v = mainStore.state.vouchers.find(x => x.id === this.appliedVoucherId);
      if (v && v.active) {
        discount = v.discountType === 'nominal' ? v.discountValue : (subtotal * v.discountValue / 100);
      }
    }

    const total = Math.max(0, subtotal - discount);
    return { subtotal, discount, total };
  },

  renderCart() {
    const container = document.getElementById("posCartItems");
    if (!container) return;

    if (cart.length === 0) {
      container.innerHTML = `<p class="text-slate-500 text-center py-6">Keranjang masih kosong</p>`;
    } else {
      container.innerHTML = cart.map(i => `
        <div class="flex items-center justify-between py-2">
          <div>
            <p class="font-bold text-slate-200">${i.name}</p>
            <p class="text-[10px] text-slate-400">${Utils.formatRp(i.price)} x ${i.qty}</p>
          </div>
          <div class="flex items-center gap-1">
            <button onclick="POS.changeQty('${i.id}', -1)" class="w-5 h-5 bg-slate-800 rounded text-slate-300 flex items-center justify-center font-bold">-</button>
            <span class="w-6 text-center font-bold">${i.qty}</span>
            <button onclick="POS.changeQty('${i.id}', 1)" class="w-5 h-5 bg-slate-800 rounded text-slate-300 flex items-center justify-center font-bold">+</button>
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
      alert("Keranjang belanja kosong!");
      return;
    }

    const name = document.getElementById("posCustomerName").value.trim() || "Pelanggan";
    const phone = document.getElementById("posCustomerPhone").value.trim();
    const method = document.getElementById("posPaymentMethod").value;
    const { subtotal, discount, total } = this.getCalculations();

    // Process Loyalty Stamp
    const stampResult = StampEngine.processTransactionStamp(phone, name, total);

    // Generate WA Draft Message
    const timestamp = stampResult.timestamp || Utils.getTimestamp();
    const itemDetails = cart.map(i => `- ${i.name} x ${i.qty} : ${Utils.formatRp(i.price * i.qty)}`).join("\n");
    
    let stampText = "Non-Member";
    if (phone) {
      stampText = `${stampResult.totalStamps} / ${stampResult.targetStamps}`;
    }

    const waText = `----------------------------------------
*TRANSAKSI BERHASIL - MAINSTAY COFFEE*
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
💡 [Kumpulkan stempel untuk klaim Voucher Kopi Gratis!]
----------------------------------------
*Simpan pesan ini sebagai bukti sah transaksi & stempel Anda.*
----------------------------------------`;

    // Open WhatsApp
    const targetWa = phone || mainStore.state.branding.universalWaNumber;
    const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');

    // Reset Cart
    this.clearCart();
    document.getElementById("posCustomerName").value = "";
    document.getElementById("posCustomerPhone").value = "";
    alert("Transaksi Selesai & Draft Struk Digital dikirim!");
  }
};

// 7. MEMBER LOYALTY CONTROLLER
const Member = {
  checkStamps() {
    const phone = document.getElementById("checkMemberPhone").value.trim();
    const box = document.getElementById("stampResultBox");
    if (!phone) {
      alert("Masukkan nomor WhatsApp!");
      return;
    }

    const customer = mainStore.state.customers[phone];
    const target = mainStore.state.loyaltyConfig.targetStamps;
    const stamps = customer ? customer.totalStamps : 0;

    box.classList.remove("hidden");
    let circlesHTML = "";
    for (let i = 1; i <= target; i++) {
      circlesHTML += `<div class="stamp-circle ${i <= stamps ? 'active' : ''}">${i <= stamps ? '☕' : i}</div>`;
    }

    box.innerHTML = `
      <p class="font-bold text-slate-100">${customer ? customer.name : 'Pelanggan'}</p>
      <div class="stamp-grid my-3">${circlesHTML}</div>
      <p class="text-xs text-amber-400 font-semibold">Total Stempel: ${stamps} / ${target}</p>
    `;
  },

  joinMember() {
    const name = document.getElementById("joinMemberName").value.trim();
    const phone = document.getElementById("joinMemberPhone").value.trim();

    if (!name || !phone) {
      alert("Lengkapi Nama dan Nomor WA!");
      return;
    }

    if (!mainStore.state.customers[phone]) {
      mainStore.state.customers[phone] = { name, isMember: true, totalStamps: 0, history: [] };
    } else {
      mainStore.state.customers[phone].isMember = true;
    }
    mainStore.saveState();

    alert("Pendaftaran Berhasil! Anda akan diarahkan ke WhatsApp Broadcast Resto.");
    window.open(mainStore.state.branding.waBroadcastUrl, '_blank');
    App.closeModal('modalMemberJoin');
  }
};

// 8. DASHBOARD OWNER CONTROLLER
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
    document.getElementById("ownPolicyText").value = b.policyText;

    // Profiles
    document.getElementById("ownOwnerName").value = mainStore.state.profiles.owner.name;
    document.getElementById("ownOwnerPin").value = mainStore.state.profiles.owner.pin;
    document.getElementById("ownOwnerPhone").value = mainStore.state.profiles.owner.phone;

    // Spreadsheet
    document.getElementById("ownSpreadsheetUrlInput").value = mainStore.state.masterSpreadsheetUrl;
    document.getElementById("btnOpenSpreadsheet").href = mainStore.state.masterSpreadsheetUrl;

    this.renderStaffTable();
    this.renderVoucherTable();
  },

  switchTab(tabName) {
    document.querySelectorAll(".owner-tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".owner-tab-content").forEach(c => c.classList.add("hidden"));
    event.target.classList.add("active");

    if (tabName === 'branding') document.getElementById("tabOwnerBranding").classList.remove("hidden");
    if (tabName === 'vouchers') document.getElementById("tabOwnerVouchers").classList.remove("hidden");
    if (tabName === 'stamps') document.getElementById("tabOwnerStamps").classList.remove("hidden");
    if (tabName === 'profiles') document.getElementById("tabOwnerProfiles").classList.remove("hidden");
    if (tabName === 'attendance') document.getElementById("tabOwnerAttendance").classList.remove("hidden");
    if (tabName === 'database') document.getElementById("tabOwnerDatabase").classList.remove("hidden");
  },

  handleFileUpload(inputEl, targetInputId) {
    if (inputEl.files && inputEl.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById(targetInputId).value = e.target.result;
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
    b.policyText = document.getElementById("ownPolicyText").value;

    mainStore.saveState();
    App.renderBranding();
    alert("Branding berhasil diperbarui!");
  },

  saveOwnerProfile() {
    const o = mainStore.state.profiles.owner;
    o.name = document.getElementById("ownOwnerName").value;
    o.pin = document.getElementById("ownOwnerPin").value;
    o.phone = document.getElementById("ownOwnerPhone").value;
    mainStore.saveState();
    alert("Profil Owner berhasil diperbarui!");
  },

  renderStaffTable() {
    const tbody = document.getElementById("staffTableBody");
    if (!tbody) return;

    tbody.innerHTML = mainStore.state.profiles.staffs.map(s => `
      <tr>
        <td class="p-3 font-bold">${s.name}</td>
        <td class="p-3 font-mono">${s.pin}</td>
        <td class="p-3 uppercase text-amber-400 font-semibold">${s.salaryCategory}</td>
        <td class="p-3">${Utils.formatRp(s.salaryAmount)}</td>
        <td class="p-3">
          <a href="https://wa.me/${s.phone}" target="_blank" class="btn-slate text-[10px] py-1 px-2 text-emerald-400">
            Direct WA
          </a>
        </td>
        <td class="p-3">
          <button onclick="Owner.deleteStaff('${s.id}')" class="text-rose-400 hover:underline">Hapus</button>
        </td>
      </tr>
    `).join("");
  },

  openStaffModal() {
    const name = prompt("Nama Staf Baru:");
    const pin = prompt("PIN Kasir Staf (4 digit):");
    const phone = prompt("No WhatsApp Staf:");
    const salaryAmount = Number(prompt("Nominal Gaji (Rp):") || 0);

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
        <td class="p-3 font-mono font-bold text-amber-400">${v.code}</td>
        <td class="p-3">${v.title}</td>
        <td class="p-3 font-semibold">${v.discountType === 'nominal' ? Utils.formatRp(v.discountValue) : v.discountValue + '%'}</td>
        <td class="p-3 uppercase">${v.targetScope}</td>
        <td class="p-3"><span class="text-emerald-400">Aktif</span></td>
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

// INITIALIZE APP ON DOM READY
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
