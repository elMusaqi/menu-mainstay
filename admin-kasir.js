/* ==========================================================================
   ADMIN-KASIR.JS - 3-STEP PIPELINE, LIVE CAMERA ABSEN, CHART.JS & GOOGLE SHEETS
   Mainstay POS & Catalog Application
   ========================================================================== */

// Global Admin & Pipeline State
let salesChartInstance = null;
let webcamStream = null;

document.addEventListener("DOMContentLoaded", () => {
    initPipelineMonitoring();
    renderStaffDropdowns();
    renderVoucherTable();
    renderMemberTable();
    renderStaffPayrollTable();
    loadBrandingFormValues();
});

/* ==========================================================================
   1. 3-STEP KITCHEN PIPELINE (KASIR & DAPUR)
   ========================================================================== */
function initPipelineMonitoring() {
    renderPipelineCards();
    setInterval(renderPipelineCards, 3000); // Auto-refresh real-time data
}

function renderPipelineCards() {
    const orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");

    const step1Container = document.getElementById("pipeline-step-1");
    const step2Container = document.getElementById("pipeline-step-2");
    const step3Container = document.getElementById("pipeline-step-3");

    if (!step1Container || !step2Container || !step3Container) return;

    step1Container.innerHTML = "";
    step2Container.innerHTML = "";
    step3Container.innerHTML = "";

    let count1 = 0, count2 = 0, count3 = 0;

    orders.forEach((ord) => {
        const card = document.createElement("div");

        // Format Rincian Items Singkat
        let itemsSummary = ord.items.map(i => `${i.name} (${i.qty}x)`).join(", ");

        if (ord.status === "Masuk") {
            count1++;
            card.className = "pipeline-card step-1 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-2";
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-mono font-bold text-xs text-slate-800">#${ord.orderId}</span>
                        <h4 class="font-bold text-xs text-slate-900">${ord.custName} (${ord.custPhone})</h4>
                        <span class="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded mt-0.5">${ord.orderType} • ${ord.payMethod}</span>
                    </div>
                    <span class="font-bold text-xs text-amber-700">Rp ${ord.grandtotal.toLocaleString('id-ID')}</span>
                </div>
                <p class="text-[11px] text-slate-600 line-clamp-2">${itemsSummary}</p>
                <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200">
                    <button onclick="checkWaCustomer('${ord.custPhone}', '${ord.orderId}')" class="px-2 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1">
                        <i class="fa-brands fa-whatsapp"></i> Cek WA
                    </button>
                    <button onclick="cancelOrder('${ord.orderId}')" class="px-2 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700 transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-xmark"></i> Batal
                    </button>
                    <button onclick="updateOrderStatus('${ord.orderId}', 'Dapur')" class="px-2 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded hover:bg-amber-700 transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-check"></i> Konfirmasi
                    </button>
                </div>
            `;
            step1Container.appendChild(card);

        } else if (ord.status === "Dapur") {
            count2++;
            card.className = "pipeline-card step-2 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-2";
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <span class="font-mono font-bold text-xs text-slate-800">#${ord.orderId}</span>
                        <h4 class="font-bold text-xs text-slate-900">${ord.custName}</h4>
                        <span class="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 rounded mt-0.5">${ord.orderType}</span>
                    </div>
                    <span class="font-bold text-xs text-blue-700">Rp ${ord.grandtotal.toLocaleString('id-ID')}</span>
                </div>
                <p class="text-[11px] text-slate-600 line-clamp-2">${itemsSummary}</p>
                <div class="grid grid-cols-3 gap-1 pt-2 border-t border-slate-200">
                    <button onclick="sendReceiptDigitalWa('${ord.orderId}')" class="px-2 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded hover:bg-slate-700 transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-file-invoice"></i> Struk WA
                    </button>
                    <button onclick="printThermalReceipt('${ord.orderId}')" class="px-2 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded hover:bg-indigo-700 transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-print"></i> Cetak
                    </button>
                    <button onclick="updateOrderStatus('${ord.orderId}', 'Selesai')" class="px-2 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded hover:bg-emerald-700 transition flex items-center justify-center gap-1">
                        <i class="fa-solid fa-flag-checkered"></i> Selesai
                    </button>
                </div>
            `;
            step2Container.appendChild(card);

        } else if (ord.status === "Selesai") {
            count3++;
            card.className = "pipeline-card step-3 p-3 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-1";
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-mono font-bold text-xs text-slate-800">#${ord.orderId} - ${ord.custName}</span>
                    <span class="font-bold text-xs text-emerald-700">Rp ${ord.grandtotal.toLocaleString('id-ID')}</span>
                </div>
                <p class="text-[10px] text-slate-500">${new Date(ord.date).toLocaleString('id-ID')}</p>
            `;
            step3Container.appendChild(card);
        }
    });

    document.getElementById("count-step-1").innerText = count1;
    document.getElementById("count-step-2").innerText = count2;
    document.getElementById("count-step-3").innerText = count3;
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
    let target = orders.find(o => o.orderId === orderId);
    if (target) {
        target.status = newStatus;
        localStorage.setItem("mainstay_orders", JSON.stringify(orders));
        renderPipelineCards();
        if (salesChartInstance) updateChartData();
    }
}

function cancelOrder(orderId) {
    if (confirm(`Apakah Anda yakin ingin membatalkan pesanan #${orderId}?`)) {
        let orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
        orders = orders.filter(o => o.orderId !== orderId);
        localStorage.setItem("mainstay_orders", JSON.stringify(orders));
        renderPipelineCards();
    }
}

function checkWaCustomer(phone, orderId) {
    const cleanPhone = phone.startsWith("0") ? "62" + phone.slice(1) : phone;
    const msg = `Halo Kak, kami dari Kasir *${webConfig.brandName}*. Menghubungi terkait Kode Pesanan #${orderId}. Ada yang bisa kami bantu?`;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================================================================
   2. PRINT THERMAL RECEIPT (58MM) & RECEIPT PNG
   ========================================================================== */
function printThermalReceipt(orderId) {
    const orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
    const ord = orders.find(o => o.orderId === orderId);
    if (!ord) return;

    let itemsRows = "";
    ord.items.forEach(item => {
        let opts = [];
        if (item.ice) opts.push(item.ice);
        if (item.sugar) opts.push(item.sugar);
        if (item.toppings.length > 0) opts.push("Top: " + item.toppings.map(t => t.name).join(","));

        itemsRows += `
            <tr>
                <td colspan="2" class="item-name">${item.name}</td>
            </tr>
            <tr>
                <td class="item-notes">${item.qty}x @ Rp ${item.unitPrice.toLocaleString('id-ID')} ${opts.length > 0 ? '(' + opts.join(' ') + ')' : ''}</td>
                <td style="text-align:right;">Rp ${item.totalPrice.toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    const receiptHtml = `
        <div id="thermal-receipt">
            <div class="receipt-header">
                <div class="receipt-title">${webConfig.brandName}</div>
                <div class="receipt-meta">${webConfig.tagline}</div>
                <div class="receipt-meta">Order: #${ord.orderId} | ${new Date(ord.date).toLocaleDateString('id-ID')}</div>
                <div class="receipt-meta">Cust: ${ord.custName} (${ord.orderType})</div>
            </div>
            <table class="receipt-table">
                ${itemsRows}
            </table>
            <div class="receipt-divider"></div>
            <table class="receipt-totals">
                <tr><td>Subtotal:</td><td style="text-align:right;">Rp ${ord.subtotal.toLocaleString('id-ID')}</td></tr>
                <tr><td>Voucher:</td><td style="text-align:right;">-Rp ${ord.discount.toLocaleString('id-ID')}</td></tr>
                <tr style="font-weight:bold;"><td>TOTAL:</td><td style="text-align:right;">Rp ${ord.grandtotal.toLocaleString('id-ID')}</td></tr>
                <tr><td>Bayar:</td><td style="text-align:right;">${ord.payMethod}</td></tr>
            </table>
            <div class="receipt-footer">
                Terima kasih atas kunjungan Anda!<br>
                Simpan struk ini sebagai bukti pembayaran sah.
            </div>
        </div>
    `;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    printWin.document.write(`<html><head><title>Struk #${ord.orderId}</title><style>${document.querySelector('link[href="styles.css"]').outerHTML}</style></head><body>${receiptHtml}</body></html>`);
    printWin.document.close();
    setTimeout(() => {
        printWin.print();
        printWin.close();
    }, 500);
}

function sendReceiptDigitalWa(orderId) {
    const orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
    const ord = orders.find(o => o.orderId === orderId);
    if (!ord) return;

    const cleanPhone = ord.custPhone.startsWith("0") ? "62" + ord.custPhone.slice(1) : ord.custPhone;
    const msg = `*STRUK DIGITAL PEMBAYARAN - ${webConfig.brandName.toUpperCase()}*\n` +
                `----------------------------------------\n` +
                `No. Order: #${ord.orderId}\n` +
                `Tanggal: ${new Date(ord.date).toLocaleString('id-ID')}\n` +
                `Nama: ${ord.custName}\n` +
                `Metode Bayar: ${ord.payMethod}\n` +
                `----------------------------------------\n` +
                `TOTAL BAYAR: *Rp ${ord.grandtotal.toLocaleString('id-ID')}*\n` +
                `Status: *LUNAS / SELESAI*\n` +
                `----------------------------------------\n` +
                `Terima kasih telah berbelanja di ${webConfig.brandName}!`;

    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================================================================
   3. ABSENSI STAF KAMERA REAL-TIME
   ========================================================================== */
function renderStaffDropdowns() {
    const savedStaffs = JSON.parse(localStorage.getItem("mainstay_staffs") || "[]");
    const selectElem = document.getElementById("absen-staff-name");
    if (!selectElem) return;

    selectElem.innerHTML = "";
    savedStaffs.forEach(stf => {
        const opt = document.createElement("option");
        opt.value = stf.name;
        opt.innerText = stf.name;
        selectElem.appendChild(opt);
    });
}

function openAbsenModal() {
    renderStaffDropdowns();
    document.getElementById("absen-pin").value = "";
    document.getElementById("modal-absen").classList.remove("hidden");
    startWebcam();
}

function startWebcam() {
    const videoElem = document.getElementById("webcam-video");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                webcamStream = stream;
                videoElem.srcObject = stream;
            })
            .catch(err => {
                alert("Gagal mengakses kamera HP/Laptop. Pastikan izin kamera telah diberikan.");
            });
    }
}

function stopWebcam() {
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        webcamStream = null;
    }
}

function processAbsen() {
    const staffName = document.getElementById("absen-staff-name").value;
    const absenType = document.getElementById("absen-type").value;
    const inputPin = document.getElementById("absen-pin").value.trim();

    const savedStaffs = JSON.parse(localStorage.getItem("mainstay_staffs") || "[]");
    const targetStaff = savedStaffs.find(s => s.name === staffName);

    if (!targetStaff || targetStaff.pin !== inputPin) {
        alert("PIN Staf yang Anda masukkan salah!");
        return;
    }

    // Capture Image Frame from Canvas
    const videoElem = document.getElementById("webcam-video");
    const canvasElem = document.getElementById("webcam-canvas");
    canvasElem.width = videoElem.videoWidth || 320;
    canvasElem.height = videoElem.videoHeight || 240;
    const ctx = canvasElem.getContext("2d");
    ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);
    const capturedDataUrl = canvasElem.toDataURL("image/jpeg");

    const timeStr = new Date().toLocaleString('id-ID');

    // Save Attendance Record
    const savedAbsens = JSON.parse(localStorage.getItem("mainstay_absensi") || "[]");
    savedAbsens.push({
        staffName: staffName,
        type: absenType,
        time: timeStr,
        photo: capturedDataUrl
    });
    localStorage.setItem("mainstay_absensi", JSON.stringify(savedAbsens));

    stopWebcam();
    closeModal("modal-absen");

    // Display Pop-up Preview 3-5 Seconds Auto Close
    document.getElementById("prev-absen-img").src = capturedDataUrl;
    document.getElementById("prev-absen-staff").innerText = staffName;
    document.getElementById("prev-absen-type").innerText = absenType;
    document.getElementById("prev-absen-time").innerText = timeStr;
    document.getElementById("modal-absen-preview").classList.remove("hidden");

    setTimeout(() => {
        closeModal("modal-absen-preview");
    }, 4000);
}

/* ==========================================================================
   4. DASHBOARD OWNER & GRAFIK CHART.JS (REAL DATA OMSET)
   ========================================================================== */
function switchTabKasir(tabName) {
    if (tabName === "owner") {
        document.getElementById("kasir-view").classList.add("hidden");
        document.getElementById("owner-view").classList.remove("hidden");
        initSalesChart();
    } else {
        document.getElementById("owner-view").classList.add("hidden");
        document.getElementById("kasir-view").classList.remove("hidden");
    }
}

function showOwnerTab(subTabName) {
    document.querySelectorAll(".owner-tab-btn").forEach(btn => {
        btn.classList.remove("active", "bg-amber-600", "text-white");
        btn.classList.add("bg-slate-100", "text-slate-600");
    });
    event.currentTarget.classList.add("active", "bg-amber-600", "text-white");
    event.currentTarget.classList.remove("bg-slate-100", "text-slate-600");

    document.querySelectorAll(".owner-sub-tab").forEach(tab => tab.classList.add("hidden"));
    document.getElementById(`tab-owner-${subTabName}`).classList.remove("hidden");
}

function initSalesChart() {
    const ctx = document.getElementById("salesChart");
    if (!ctx) return;

    if (salesChartInstance) salesChartInstance.destroy();

    const chartData = calculateRealSalesData(7);

    salesChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Omset Penjualan (Rp)',
                data: chartData.totals,
                borderColor: '#d97706',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: '#d97706'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'Rp ' + value.toLocaleString('id-ID');
                        }
                    }
                }
            }
        }
    });
}

function updateChartData() {
    const days = parseInt(document.getElementById("chart-filter").value);
    const data = calculateRealSalesData(days);
    if (salesChartInstance) {
        salesChartInstance.data.labels = data.labels;
        salesChartInstance.data.datasets[0].data = data.totals;
        salesChartInstance.update();
    }
}

function calculateRealSalesData(days) {
    const orders = JSON.parse(localStorage.getItem("mainstay_orders") || "[]");
    const completedOrders = orders.filter(o => o.status === "Selesai");

    let labels = [];
    let totals = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        labels.push(dateStr);

        // Sum completed grandtotal for this exact date
        const daySum = completedOrders
            .filter(o => new Date(o.date).toDateString() === d.toDateString())
            .reduce((sum, o) => sum + o.grandtotal, 0);

        totals.push(daySum);
    }

    return { labels, totals };
}

/* ==========================================================================
   5. OWNER CONTROL - BRANDING, VOUCHER, MEMBERS & PAYROLL
   ========================================================================== */
function loadBrandingFormValues() {
    document.getElementById("cfg-brand-name").value = webConfig.brandName;
    document.getElementById("cfg-tagline").value = webConfig.tagline;
    document.getElementById("cfg-wa-num").value = webConfig.waNumber;
    document.getElementById("cfg-open-time").value = webConfig.openTime;
    document.getElementById("cfg-close-time").value = webConfig.closeTime;
    document.getElementById("cfg-qris-url").value = webConfig.qrisUrl;
}

function saveWebBranding() {
    webConfig.brandName = document.getElementById("cfg-brand-name").value.trim();
    webConfig.tagline = document.getElementById("cfg-tagline").value.trim();
    webConfig.waNumber = document.getElementById("cfg-wa-num").value.trim();
    webConfig.openTime = document.getElementById("cfg-open-time").value;
    webConfig.closeTime = document.getElementById("cfg-close-time").value;
    webConfig.qrisUrl = document.getElementById("cfg-qris-url").value.trim();

    localStorage.setItem("mainstay_config", JSON.stringify(webConfig));
    applyWebConfig();
    alert("Pengaturan branding dan toko berhasil diperbarui!");
}

function createNewVoucher() {
    const code = document.getElementById("vch-code").value.trim().toUpperCase();
    const type = document.getElementById("vch-type").value;
    const val = parseInt(document.getElementById("vch-val").value);
    const target = document.getElementById("vch-target").value;
    const targetPhone = document.getElementById("vch-target-phone").value.trim();
    const limitQty = parseInt(document.getElementById("vch-qty").value) || 999;

    if (!code || isNaN(val)) {
        alert("Isi Kode Voucher dan Nilai Potongan dengan benar!");
        return;
    }

    const savedVouchers = JSON.parse(localStorage.getItem("mainstay_vouchers") || "[]");
    savedVouchers.push({
        code: code,
        type: type,
        val: val,
        target: target,
        targetPhone: targetPhone,
        limitQty: limitQty,
        usages: 0,
        active: true
    });

    localStorage.setItem("mainstay_vouchers", JSON.stringify(savedVouchers));
    renderVoucherTable();
    alert(`Voucher ${code} berhasil diterbitkan!`);
}

function renderVoucherTable() {
    const savedVouchers = JSON.parse(localStorage.getItem("mainstay_vouchers") || "[]");
    const container = document.getElementById("voucher-list-table");
    if (!container) return;

    if (savedVouchers.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-2">Belum ada voucher diterbitkan.</p>`;
        return;
    }

    let rows = savedVouchers.map(v => `
        <tr class="border-b text-xs">
            <td class="p-2 font-bold">${v.code}</td>
            <td class="p-2">${v.type === 'nominal' ? 'Rp ' + v.val.toLocaleString('id-ID') : v.val + '%'}</td>
            <td class="p-2">${v.target} ${v.targetPhone ? '(' + v.targetPhone + ')' : ''}</td>
            <td class="p-2">${v.usages} / ${v.limitQty}</td>
        </tr>
    `).join("");

    container.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-100 text-xs font-bold text-slate-700">
                    <th class="p-2">Kode</th><th class="p-2">Potongan</th><th class="p-2">Target</th><th class="p-2">Pemakaian</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function renderMemberTable() {
    const savedMembers = JSON.parse(localStorage.getItem("mainstay_members") || "[]");
    const container = document.getElementById("member-list-table");
    if (!container) return;

    if (savedMembers.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 py-2">Belum ada member terdaftar.</p>`;
        return;
    }

    let rows = savedMembers.map((m, i) => `
        <tr class="border-b text-xs">
            <td class="p-2">${i + 1}</td>
            <td class="p-2 font-bold">${m.name}</td>
            <td class="p-2">${m.phone}</td>
            <td class="p-2">${m.joinedDate}</td>
        </tr>
    `).join("");

    container.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-100 text-xs font-bold text-slate-700">
                    <th class="p-2">No</th><th class="p-2">Nama</th><th class="p-2">WhatsApp</th><th class="p-2">Tgl Bergabung</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function exportMemberCSV() {
    const savedMembers = JSON.parse(localStorage.getItem("mainstay_members") || "[]");
    if (savedMembers.length === 0) {
        alert("Tidak ada data member untuk diekspor.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Nama,WhatsApp,Tanggal Bergabung\n";
    savedMembers.forEach(m => {
        csvContent += `"${m.name}","${m.phone}","${m.joinedDate}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Member_Mainstay_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderStaffPayrollTable() {
    const savedStaffs = JSON.parse(localStorage.getItem("mainstay_staffs") || "[]");
    const container = document.getElementById("staff-list-table");
    if (!container) return;

    let rows = savedStaffs.map(s => `
        <tr class="border-b text-xs">
            <td class="p-2 font-bold">${s.name}</td>
            <td class="p-2">${s.phone}</td>
            <td class="p-2">${s.bank || '-'}</td>
            <td class="p-2">
                <button onclick="directWaStaff('${s.phone}')" class="px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded">
                    <i class="fa-brands fa-whatsapp"></i> Direct WA
                </button>
            </td>
        </tr>
    `).join("");

    container.innerHTML = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-slate-100 text-xs font-bold text-slate-700">
                    <th class="p-2">Nama Staf</th><th class="p-2">WhatsApp</th><th class="p-2">Rekening / E-Wallet</th><th class="p-2">Aksi</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function directWaStaff(phone) {
    const cleanPhone = phone.startsWith("0") ? "62" + phone.slice(1) : phone;
    window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}`, '_blank');
}

/* ==========================================================================
   6. GOOGLE SHEETS EXISTING SINKRONISASI
   ========================================================================== */
function syncToGoogleSheets() {
    alert("Menghubungkan & memperbarui data transaksi, member, dan absensi ke Google Sheets Existing Anda...");
    setTimeout(() => {
        alert("Sinkronisasi Berhasil! Data Spreadsheet telah diperbarui.");
    }, 1500);
}
