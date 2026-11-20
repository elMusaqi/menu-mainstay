// ============================================================================
// MODUL GENERATOR QR CODE MEJA & SELF-ORDER STANDEE / STIKER AKRILIK MEJA
// 8 Tema Desain Berbeda • Masing-Masing Tema Bisa Diedit Tipe & Palet Warnanya
// Mendukung Preview Live, Cetak Single, Cetak Batch A4, dan Unduh PNG HD
// ============================================================================

import QRCode from "qrcode";

if (typeof window !== 'undefined') {
    window.QRCode = QRCode;
}

const QR_MEJA_COLOR_STORAGE_KEY = 'mainstay_qr_meja_theme_colors_v1';

export const QR_MEJA_TEMPLATES = [
    {
        id: 'mainstay_gold',
        name: '1. Classic Acrylic',
        shortName: 'Classic',
        icon: 'fa-crown',
        badge: 'Klasik 1:1',
        defaultColors: { bg: '#f59e0b', primary: '#0f172a', accent: '#fbbf24', ink: '#0f172a', preset: 'default' }
    },
    {
        id: 'gacoan_cyan',
        name: '2. Vibrant Ribbon',
        shortName: 'Ribbon Pop',
        icon: 'fa-bolt',
        badge: 'Ribbon 1:1',
        defaultColors: { bg: '#e0f7ff', primary: '#0284c7', accent: '#ff007f', ink: '#0c4a6e', preset: 'default' }
    },
    {
        id: 'waroeng_yellow',
        name: '3. Tent Card',
        shortName: 'Tent 3:4',
        icon: 'fa-sun',
        badge: 'Portrait 3:4',
        defaultColors: { bg: '#facc15', primary: '#0f172a', accent: '#0284c7', ink: '#0f172a', preset: 'default' }
    },
    {
        id: 'magenta_white',
        name: '4. Spine Timeline',
        shortName: 'Spine',
        icon: 'fa-gem',
        badge: 'Minimalis 1:1',
        defaultColors: { bg: '#ffffff', primary: '#e11d48', accent: '#0284c7', ink: '#0f172a', preset: 'default' }
    },
    {
        id: 'emerald_arch',
        name: '5. Cafe Arch',
        shortName: 'Cafe Arch',
        icon: 'fa-mug-saucer',
        badge: 'Arch 3:4',
        defaultColors: { bg: '#ecfdf5', primary: '#065f46', accent: '#d97706', ink: '#064e3b', preset: 'default' }
    },
    {
        id: 'neon_dark',
        name: '6. Dark Neon',
        shortName: 'Dark Neon',
        icon: 'fa-moon',
        badge: 'Dark Mode',
        defaultColors: { bg: '#0f172a', primary: '#06b6d4', accent: '#f43f5e', ink: '#f8fafc', preset: 'default' }
    },
    {
        id: 'retro_badge',
        name: '7. Retro Ticket',
        shortName: 'Retro',
        icon: 'fa-ticket',
        badge: 'Poster 3:4',
        defaultColors: { bg: '#fef3c7', primary: '#9a3412', accent: '#15803d', ink: '#431407', preset: 'default' }
    },
    {
        id: 'split_dual',
        name: '8. Split Dual',
        shortName: 'Split Dual',
        icon: 'fa-columns',
        badge: 'Landscape 4:3',
        defaultColors: { bg: '#ffffff', primary: '#1e1b4b', accent: '#f97316', ink: '#0f172a', preset: 'default' }
    }
];

export const QR_MEJA_COLOR_TYPES = [
    { id: 'default', label: 'Bawaan Tema', bg: null, primary: null, accent: null, ink: null },
    { id: 'royal_gold', label: 'Emas Elegan', bg: '#f59e0b', primary: '#0f172a', accent: '#fef08a', ink: '#0f172a' },
    { id: 'ocean_pop', label: 'Biru & Pink', bg: '#e0f7ff', primary: '#0284c7', accent: '#ff007f', ink: '#0c4a6e' },
    { id: 'matcha_sage', label: 'Matcha Cafe', bg: '#ecfdf5', primary: '#065f46', accent: '#d97706', ink: '#064e3b' },
    { id: 'crimson_pro', label: 'Merah Marun', bg: '#fff1f2', primary: '#be123c', accent: '#0f172a', ink: '#1e293b' },
    { id: 'midnight_cyan', label: 'Gelap Neon', bg: '#0f172a', primary: '#06b6d4', accent: '#f43f5e', ink: '#f8fafc' },
    { id: 'violet_luxe', label: 'Ungu Luxe', bg: '#faf5ff', primary: '#6d28d9', accent: '#ec4899', ink: '#2e1065' },
    { id: 'mono_slate', label: 'Monokrom', bg: '#f8fafc', primary: '#0f172a', accent: '#475569', ink: '#0f172a' }
];

function _loadSavedQrMejaColors() {
    try {
        const raw = localStorage.getItem(QR_MEJA_COLOR_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return (parsed && typeof parsed === 'object') ? parsed : {};
    } catch (e) {
        return {};
    }
}

function _saveQrMejaColors(map) {
    try {
        localStorage.setItem(QR_MEJA_COLOR_STORAGE_KEY, JSON.stringify(map || {}));
    } catch (e) {}
}

function _normalizeHex(hex, fallback = '#0f172a') {
    const str = String(hex || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(str)) return str.toLowerCase();
    if (/^#[0-9a-fA-F]{3}$/.test(str)) {
        return ('#' + str[1] + str[1] + str[2] + str[2] + str[3] + str[3]).toLowerCase();
    }
    return fallback;
}

function _hexToRgb(hex) {
    const clean = _normalizeHex(hex, '#0f172a').slice(1);
    return {
        r: parseInt(clean.slice(0, 2), 16),
        g: parseInt(clean.slice(2, 4), 16),
        b: parseInt(clean.slice(4, 6), 16)
    };
}

function _hexAlpha(hex, alpha = 0.15) {
    const { r, g, b } = _hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function _mixHex(hexA, hexB, ratio = 0.5) {
    const a = _hexToRgb(hexA);
    const b = _hexToRgb(hexB);
    const mix = (x, y) => Math.round(x * (1 - ratio) + y * ratio);
    const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    return `#${toHex(mix(a.r, b.r))}${toHex(mix(a.g, b.g))}${toHex(mix(a.b, b.b))}`;
}

function _isLightHex(hex) {
    const { r, g, b } = _hexToRgb(hex);
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma > 0.6;
}

function _contrastOn(hex) {
    return _isLightHex(hex) ? '#0f172a' : '#ffffff';
}

function _loadSavedBatchCols() {
    try {
        const val = parseInt(localStorage.getItem('mainstay_qr_batch_cols') || '2', 10);
        return (val === 2 || val === 3 || val === 4) ? val : 2;
    } catch (e) {
        return 2;
    }
}

window.qrMejaState = {
    template: 'mainstay_gold',
    nomorMeja: '01',
    mode: 'meja',
    namaCabang: 'Cabang Sampangan - Menoreh',
    storeTitle: 'Mainstay Drink',
    customNomor: '',
    headline: 'PESAN DI SINI',
    subHeadline: 'TANPA ANTRI',
    noticeText: 'Apabila sudah order MOHON UNTUK TIDAK PINDAH MEJA',
    wifiSsid: 'Mainstay Drink Free Wi-Fi',
    wifiPass: 'ngopiasik123',
    showSteps: true,
    showPayment: true,
    showWifi: true,
    size: 'sticker_square',
    batchCols: _loadSavedBatchCols(),
    themeColors: _loadSavedQrMejaColors()
};

window.setQrBatchGridCols = (cols, triggerPreviewRefresh = true) => {
    const parsed = parseInt(cols, 10);
    const validCols = (parsed === 2 || parsed === 3 || parsed === 4) ? parsed : 2;
    window.qrMejaState.batchCols = validCols;
    try {
        localStorage.setItem('mainstay_qr_batch_cols', String(validCols));
    } catch (e) {}

    ['qr-batch-cols', 'universal-qr-batch-cols'].forEach(selId => {
        const selectEl = document.getElementById(selId);
        if (selectEl && String(selectEl.value) !== String(validCols)) {
            selectEl.value = String(validCols);
        }
    });

    ['qr-batch-cols-badge', 'universal-qr-batch-cols-badge'].forEach(badgeId => {
        const badgeEl = document.getElementById(badgeId);
        if (badgeEl) {
            badgeEl.innerText = `${validCols} Kolom A4`;
        }
    });

    const printSheet = document.getElementById('qr-meja-print-sheet');
    if (printSheet) {
        printSheet.style.setProperty('--qr-grid-cols', String(validCols));
        printSheet.querySelectorAll('.qr-batch-a4-grid').forEach(grid => {
            grid.style.setProperty('--qr-grid-cols', String(validCols));
            grid.style.gridTemplateColumns = `repeat(${validCols}, minmax(0, 1fr))`;
        });
    }

    const previewRoot = document.getElementById('universal-print-preview-content');
    if (previewRoot) {
        previewRoot.style.setProperty('--qr-grid-cols', String(validCols));
        previewRoot.querySelectorAll('.qr-batch-a4-grid').forEach(grid => {
            grid.style.setProperty('--qr-grid-cols', String(validCols));
            grid.style.gridTemplateColumns = `repeat(${validCols}, minmax(0, 1fr))`;
        });
    }

    if (triggerPreviewRefresh && window._activeQrBatchArgs) {
        const modal = document.getElementById('modal-cetak-universal');
        if (modal && !modal.classList.contains('hidden')) {
            const { fromNum, toNum, options } = window._activeQrBatchArgs;
            window.cetakBatchQrMeja(fromNum, toNum, { ...(options || {}), cols: validCols });
            return validCols;
        }
    }

    if (typeof window._fitUniversalA4Preview === 'function') {
        requestAnimationFrame(() => window._fitUniversalA4Preview());
    }
    return validCols;
};

window.getQrMejaTemplateMeta = (templateId) => {
    return QR_MEJA_TEMPLATES.find(t => t.id === templateId) || QR_MEJA_TEMPLATES[0];
};

window.getQrMejaActiveColors = (templateId) => {
    const tpl = window.getQrMejaTemplateMeta(templateId || window.qrMejaState.template);
    const saved = (window.qrMejaState.themeColors && window.qrMejaState.themeColors[tpl.id]) || {};
    const bg = _normalizeHex(saved.bg, tpl.defaultColors.bg);
    const primary = _normalizeHex(saved.primary, tpl.defaultColors.primary);
    const accent = _normalizeHex(saved.accent, tpl.defaultColors.accent);
    const ink = _normalizeHex(saved.ink, tpl.defaultColors.ink);
    const preset = saved.preset || 'default';

    return {
        bg,
        primary,
        accent,
        ink,
        preset,
        onBg: _contrastOn(bg),
        onPrimary: _contrastOn(primary),
        onAccent: _contrastOn(accent),
        bgLight: _mixHex(bg, '#ffffff', 0.35),
        bgDark: _mixHex(bg, '#000000', 0.12),
        primarySoft: _mixHex(primary, '#ffffff', 0.85),
        accentSoft: _mixHex(accent, '#ffffff', 0.85),
        isDarkBg: !_isLightHex(bg)
    };
};

// ============================================================================
// FUNGSI UTAMA RENDER PANEL QR MEJA (MASTER OWNER)
// ============================================================================
window.renderPanelQrMeja = async () => {
    const container = document.getElementById('owner-inner-panels-container');
    if (!container) return;

    const s = window.storeSettings || {};
    const storeTitle = s.store_title || 'Mainstay Drink';
    const storeAddress = s.receipt_address || s.footer_address || 'Sampangan, Semarang';

    if (!window.qrMejaState.namaCabang || window.qrMejaState.namaCabang === 'Cabang Sampangan - Menoreh') {
        if (storeAddress.toLowerCase().includes('menoreh') || storeAddress.toLowerCase().includes('sampangan')) {
            window.qrMejaState.namaCabang = 'Cabang Sampangan - Menoreh';
        } else if (storeAddress) {
            window.qrMejaState.namaCabang = storeAddress.split(',')[0].trim();
        }
    }

    const wifiSsid = s.wifi_ssid || window.qrMejaState.wifiSsid || 'Mainstay Drink Free Wi-Fi';
    const wifiPass = s.wifi_password || window.qrMejaState.wifiPass || 'ngopiasik123';
    window.qrMejaState.wifiSsid = wifiSsid;
    window.qrMejaState.wifiPass = wifiPass;
    window.qrMejaState.storeTitle = storeTitle;

    const isNoTable = window.isQrMejaNoTable(window.qrMejaState.nomorMeja);
    const activeTpl = window.getQrMejaTemplateMeta(window.qrMejaState.template);
    const activeColors = window.getQrMejaActiveColors(activeTpl.id);
    const qrMejaEnabled = typeof window.isQrMejaFeatureEnabled === 'function'
        ? window.isQrMejaFeatureEnabled()
        : (s.qr_meja_enabled !== false);

    container.innerHTML = `
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[300] flex flex-col fade-in pb-safe overflow-hidden font-['Nunito',sans-serif]">
            <!-- Header Panel Generator QR Meja -->
            <div class="bg-slate-950 text-white p-3.5 sm:p-4 flex items-center justify-between shrink-0 shadow-lg border-b border-slate-800">
                <div class="flex items-center gap-3">
                    <button onclick="window.closePanel()" class="w-10 h-10 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center justify-center text-white active:scale-95 shadow-sm cursor-pointer" title="Kembali ke Master Owner">
                        <i class="fa-solid fa-arrow-left"></i>
                    </button>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h2 class="font-black text-sm sm:text-base leading-tight text-white flex items-center gap-2">
                                <i class="fa-solid fa-qrcode text-amber-400"></i> Generator QR Meja Self-Order
                            </h2>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                                8 Tema &bull; Custom Warna
                            </span>
                        </div>
                        <p class="text-[10px] text-slate-400 mt-0.5">8 desain akrilik &amp; tent card profesional &bull; Tiap tema bisa diedit tipe &amp; palet warnanya</p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    <button onclick="window.closePanel()" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 active:scale-95 cursor-pointer">
                        <i class="fa-solid fa-xmark"></i>
                        <span class="hidden sm:inline">Tutup</span>
                    </button>
                </div>
            </div>

            <!-- Bar Status ON/OFF Ringkas Deteksi Nomor Meja -->
            <div class="bg-slate-50 border-b border-slate-200 px-3 sm:px-5 py-1.5 shrink-0">
                <div class="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 min-w-0">
                        <span id="qr-meja-toggle-icon" class="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0 ${qrMejaEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}">
                            <i class="fa-solid fa-chair"></i>
                        </span>
                        <span class="text-xs font-black text-slate-800 truncate">QR Meja Otomatis</span>
                        <span id="qr-meja-toggle-status-badge" class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${qrMejaEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}">
                            ${qrMejaEnabled ? 'ON' : 'OFF'}
                        </span>
                    </div>
                    <label class="inline-flex items-center gap-2 cursor-pointer shrink-0 select-none">
                        <input type="checkbox" id="toggle-qr-meja-enabled" class="sr-only peer" ${qrMejaEnabled ? 'checked' : ''} onchange="window.toggleQrMejaFeature && window.toggleQrMejaFeature(this.checked)">
                        <div class="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-emerald-500 relative transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner"></div>
                    </label>
                </div>
            </div>

            <!-- Konten Utama: 2 Kolom -->
            <div class="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-slate-100 flex flex-col lg:flex-row gap-5 max-w-7xl mx-auto w-full">

                <!-- KOLOM KIRI: PREVIEW LIVE & PILIHAN 8 TEMA -->
                <div class="w-full lg:w-1/2 flex flex-col items-center">
                    <!-- Grid Selector 8 Tema Desain -->
                    <div class="w-full max-w-lg mb-3 bg-white p-2 rounded-2xl shadow-xs border border-slate-200">
                        <div class="flex items-center justify-between px-1.5 pb-1.5">
                            <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Pilih 1 dari 8 Tema Desain:</span>
                            <span id="qr-active-theme-badge" class="text-[10px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">${activeTpl.name}</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            ${QR_MEJA_TEMPLATES.map(tpl => {
                                const isSel = window.qrMejaState.template === tpl.id;
                                const tc = window.getQrMejaActiveColors(tpl.id);
                                return `
                                    <button type="button" onclick="window.switchQrMejaTemplate('${tpl.id}')" id="btn-tpl-${tpl.id}"
                                        class="py-2 px-2 text-[10px] font-black rounded-xl transition text-left flex items-center gap-1.5 border cursor-pointer ${isSel ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}">
                                        <span class="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs" style="background: linear-gradient(135deg, ${tc.primary} 50%, ${tc.accent} 50%);"></span>
                                        <span class="truncate">${tpl.shortName}</span>
                                    </button>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Frame Preview Standee Meja Akrilik -->
                    <div class="w-full flex items-center justify-center py-1">
                        <div id="qr-meja-preview-wrapper" class="w-full max-w-sm sm:max-w-md transition-all duration-300 flex justify-center">
                            <div class="p-8 text-center bg-white rounded-3xl shadow-md border border-slate-200 flex flex-col items-center justify-center w-full">
                                <i class="fa-solid fa-spinner fa-spin text-2xl text-amber-500 mb-2"></i>
                                <p class="text-xs font-bold text-slate-500">Merender stiker meja profesional...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Tombol Aksi Cepat Cetak & Unduh -->
                    <div class="w-full max-w-lg grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                        <button type="button" onclick="window.cetakStandeeQrMeja()" class="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer touch-manipulation">
                            <i class="fa-solid fa-print"></i>
                            <span id="btn-label-print-single">${isNoTable ? 'Cetak Poster Ini' : 'Cetak Meja Ini'}</span>
                        </button>
                        <button type="button" onclick="window.unduhGambarQrMeja()" class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer">
                            <i class="fa-solid fa-download"></i>
                            <span>Unduh PNG HD</span>
                        </button>
                        <button type="button" onclick="window.salinUrlQrMeja()" class="col-span-2 sm:col-span-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer">
                            <i class="fa-solid fa-link"></i>
                            <span>Salin Link</span>
                        </button>
                    </div>

                    <!-- Link Preview Live Test Pelanggan -->
                    <div class="w-full max-w-lg mt-2.5 text-center">
                        <button type="button" onclick="window.bukaTestPelangganMeja()" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1.5 transition cursor-pointer">
                            <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                            <span>Buka &amp; Tes Tampilan Menu Self-Order di Tab Baru</span>
                        </button>
                    </div>
                </div>

                <!-- KOLOM KANAN: EDITOR TIPE WARNA PER TEMA, NOMOR MEJA & KONTEN -->
                <div class="w-full lg:w-1/2 flex flex-col gap-4">

                    <!-- 1. EDITOR TIPE WARNA & PALET CUSTOM UNTUK TEMA AKTIF -->
                    <div class="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <div class="flex items-center justify-between gap-2 flex-wrap">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-palette text-rose-500"></i> Edit Tipe Warna (<span id="qr-color-editor-theme-name">${activeTpl.shortName}</span>)
                            </h3>
                            <button type="button" onclick="window.resetQrMejaThemeColor()" class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black transition cursor-pointer">
                                <i class="fa-solid fa-rotate-left mr-1"></i> Reset Warna Tema
                            </button>
                        </div>

                        <!-- Preset Tipe Warna Instan -->
                        <div>
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Pilih Tipe Warna Siap Pakai:</p>
                            <div id="qr-color-presets-container" class="flex flex-wrap gap-1.5">
                                ${QR_MEJA_COLOR_TYPES.map(ct => {
                                    const isActivePreset = activeColors.preset === ct.id;
                                    const pBg = ct.bg || activeTpl.defaultColors.bg;
                                    const pPri = ct.primary || activeTpl.defaultColors.primary;
                                    const pAcc = ct.accent || activeTpl.defaultColors.accent;
                                    return `
                                        <button type="button" onclick="window.setQrMejaColorTypePreset('${ct.id}')" data-color-preset="${ct.id}"
                                            class="px-2.5 py-1.5 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 border cursor-pointer ${isActivePreset ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}">
                                            <span class="flex items-center -space-x-1">
                                                <span class="w-3 h-3 rounded-full border border-white shadow-2xs" style="background:${pBg}"></span>
                                                <span class="w-3 h-3 rounded-full border border-white shadow-2xs" style="background:${pPri}"></span>
                                                <span class="w-3 h-3 rounded-full border border-white shadow-2xs" style="background:${pAcc}"></span>
                                            </span>
                                            <span>${ct.label}</span>
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                        </div>

                        <!-- 4 Color Picker Custom per Elemen Warna -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                            <label class="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:border-slate-300 transition">
                                <span class="text-[9px] font-black text-slate-500 uppercase">Latar Kartu</span>
                                <div class="flex items-center gap-1.5">
                                    <input type="color" id="qr-col-bg" value="${activeColors.bg}" oninput="window.updateQrMejaThemeColor('bg', this.value)" class="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer bg-transparent shrink-0">
                                    <span id="qr-hex-bg" class="text-[10px] font-mono font-bold text-slate-700 uppercase truncate">${activeColors.bg}</span>
                                </div>
                            </label>
                            <label class="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:border-slate-300 transition">
                                <span class="text-[9px] font-black text-slate-500 uppercase">Warna Utama</span>
                                <div class="flex items-center gap-1.5">
                                    <input type="color" id="qr-col-primary" value="${activeColors.primary}" oninput="window.updateQrMejaThemeColor('primary', this.value)" class="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer bg-transparent shrink-0">
                                    <span id="qr-hex-primary" class="text-[10px] font-mono font-bold text-slate-700 uppercase truncate">${activeColors.primary}</span>
                                </div>
                            </label>
                            <label class="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:border-slate-300 transition">
                                <span class="text-[9px] font-black text-slate-500 uppercase">Warna Aksen</span>
                                <div class="flex items-center gap-1.5">
                                    <input type="color" id="qr-col-accent" value="${activeColors.accent}" oninput="window.updateQrMejaThemeColor('accent', this.value)" class="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer bg-transparent shrink-0">
                                    <span id="qr-hex-accent" class="text-[10px] font-mono font-bold text-slate-700 uppercase truncate">${activeColors.accent}</span>
                                </div>
                            </label>
                            <label class="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col gap-1 cursor-pointer hover:border-slate-300 transition">
                                <span class="text-[9px] font-black text-slate-500 uppercase">Teks Utama</span>
                                <div class="flex items-center gap-1.5">
                                    <input type="color" id="qr-col-ink" value="${activeColors.ink}" oninput="window.updateQrMejaThemeColor('ink', this.value)" class="w-7 h-7 rounded-lg border-0 p-0 cursor-pointer bg-transparent shrink-0">
                                    <span id="qr-hex-ink" class="text-[10px] font-mono font-bold text-slate-700 uppercase truncate">${activeColors.ink}</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- 2. PENGATURAN MODE & NOMOR MEJA -->
                    <div class="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-chair text-amber-500"></i> Mode Stiker &amp; Nomor Meja
                            </h3>
                            <span id="label-active-table" class="px-2.5 py-0.5 rounded-full text-[10px] font-black ${isNoTable ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-teal-100 text-teal-800 border border-teal-300'} uppercase">
                                ${isNoTable ? 'Tanpa Meja (Kasir / Tembok)' : `Meja ${window.qrMejaState.nomorMeja}`}
                            </span>
                        </div>

                        <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                            <button type="button" onclick="window.setQrMejaMode('meja')" id="btn-mode-meja" class="py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${!isNoTable ? 'bg-white text-slate-900 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}">
                                <i class="fa-solid fa-chair text-amber-500"></i>
                                <span>Dengan Nomor Meja</span>
                            </button>
                            <button type="button" onclick="window.setQrMejaMode('tanpa_meja')" id="btn-mode-tanpa-meja" class="py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${isNoTable ? 'bg-amber-500 text-slate-950 shadow-sm font-black' : 'text-slate-600 hover:text-slate-900'}">
                                <i class="fa-solid fa-store"></i>
                                <span>Tanpa Meja (Kasir/Tembok)</span>
                            </button>
                        </div>

                        <div>
                            <p class="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Pilih Cepat Nomor Meja:</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button type="button" onclick="window.setQrMejaNomor('Tanpa Meja')" class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${isNoTable ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 font-extrabold' : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'}">
                                    <i class="fa-solid fa-fire text-amber-600"></i>
                                    <span>Tanpa Meja (Bebas / Kasir)</span>
                                </button>
                                ${['01','02','03','04','05','06','07','08','09','10','11','12','15','20','31','46','VIP 1','Bar 1','Outdoor'].map(no => `
                                    <button type="button" onclick="window.setQrMejaNomor('${no}')" class="px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${window.qrMejaState.nomorMeja === no ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 font-extrabold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}">
                                        ${no}
                                    </button>
                                `).join('')}
                            </div>
                        </div>

                        <div class="flex items-center gap-2 mt-1">
                            <div class="relative flex-1">
                                <i class="fa-solid fa-pen-nib absolute left-3 top-3 text-slate-400 text-xs"></i>
                                <input type="text" id="input-custom-meja" placeholder="Ketik nomor/nama kustom (misal: 31, 46, VIP 2, Tembok A)" value="${window.qrMejaState.customNomor || ''}" oninput="window.setQrMejaNomorCustom(this.value)" class="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-slate-800 placeholder:text-slate-400">
                            </div>
                            <button type="button" onclick="window.setQrMejaNomorCustom(document.getElementById('input-custom-meja').value)" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition cursor-pointer">
                                Terapkan
                            </button>
                        </div>
                    </div>

                    <!-- 3. NAMA CABANG & TEKS MENJUAL -->
                    <div class="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-3">
                        <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <i class="fa-solid fa-shop text-indigo-500"></i> Identitas Cabang &amp; Teks Menjual
                        </h3>

                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                <i class="fa-solid fa-location-dot text-rose-500 mr-1"></i> Nama Cabang / Lokasi (Ditampilkan di Stiker):
                            </label>
                            <input type="text" id="input-qr-branch" value="${window.qrMejaState.namaCabang}" oninput="window.qrMejaState.namaCabang = this.value; window.updateQrMejaPreview();" placeholder="Contoh: Cabang Sampangan - Menoreh" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Teks Utama (Header):</label>
                                <input type="text" id="input-qr-headline" value="${window.qrMejaState.headline}" oninput="window.qrMejaState.headline = this.value; window.updateQrMejaPreview();" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Banner Aksen (Sub-Header):</label>
                                <input type="text" id="input-qr-subheadline" value="${window.qrMejaState.subHeadline}" oninput="window.qrMejaState.subHeadline = this.value; window.updateQrMejaPreview();" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                            </div>
                        </div>

                        <div>
                            <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Catatan Peringatan di Bawah (Footer Notice):</label>
                            <input type="text" id="input-qr-notice" value="${window.qrMejaState.noticeText}" oninput="window.qrMejaState.noticeText = this.value; window.updateQrMejaPreview();" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                    <i class="fa-solid fa-wifi text-emerald-500 mr-1"></i> SSID Wi-Fi:
                                </label>
                                <input type="text" id="input-qr-wifi-ssid" value="${window.qrMejaState.wifiSsid}" oninput="window.qrMejaState.wifiSsid = this.value; window.updateQrMejaPreview();" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                            </div>
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                                    <i class="fa-solid fa-key text-amber-500 mr-1"></i> Password Wi-Fi:
                                </label>
                                <input type="text" id="input-qr-wifi-pass" value="${window.qrMejaState.wifiPass}" oninput="window.qrMejaState.wifiPass = this.value; window.updateQrMejaPreview();" class="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-800">
                            </div>
                        </div>
                    </div>

                    <!-- 4. CETAK BATCH SEKALIGUS (LEMBAR A4 MULTI-STIKER CSS PRINT GRID) -->
                    <div class="bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white p-4 sm:p-5 rounded-3xl shadow-md border border-indigo-800 flex flex-col gap-3">
                        <div class="flex items-center justify-between gap-2 flex-wrap">
                            <h3 class="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-print"></i> Cetak Massal 1 Lembar A4 (CSS Print Grid)
                            </h3>
                            <span class="px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 uppercase">
                                Rapi &amp; Siap Potong
                            </span>
                        </div>
                        <p class="text-[11px] text-indigo-200 leading-relaxed">
                            Susun banyak stiker QR secara otomatis ke dalam grid A4 presisi agar hemat kertas dan mudah digunting mengikuti garis potong.
                        </p>

                        <!-- Builder Custom Batch CSS Print Grid -->
                        <div class="bg-white/10 border border-white/15 rounded-2xl p-3 space-y-2.5">
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                    <label class="block text-[9px] font-black text-indigo-200 uppercase mb-1">Tipe Batch</label>
                                    <select id="qr-batch-mode" onchange="window.toggleQrBatchCustomMode()" class="w-full px-2.5 py-2 rounded-xl bg-slate-900/90 border border-white/20 text-[11px] font-black text-white outline-none focus:border-amber-400">
                                        <option value="range">Rentang No. Meja</option>
                                        <option value="tanpa_meja">Tanpa Meja (Counter)</option>
                                    </select>
                                </div>
                                <div id="qr-batch-from-wrap">
                                    <label class="block text-[9px] font-black text-indigo-200 uppercase mb-1">Dari Meja</label>
                                    <input type="number" id="qr-batch-from" value="1" min="1" max="99" class="w-full px-2.5 py-2 rounded-xl bg-slate-900/90 border border-white/20 text-xs font-black text-white outline-none focus:border-amber-400 tabular-nums">
                                </div>
                                <div id="qr-batch-to-wrap">
                                    <label id="qr-batch-to-label" class="block text-[9px] font-black text-indigo-200 uppercase mb-1">Sampai Meja</label>
                                    <input type="number" id="qr-batch-to" value="6" min="1" max="99" class="w-full px-2.5 py-2 rounded-xl bg-slate-900/90 border border-white/20 text-xs font-black text-white outline-none focus:border-amber-400 tabular-nums">
                                </div>
                                <div>
                                    <label class="block text-[9px] font-black text-indigo-200 uppercase mb-1">Grid A4</label>
                                    <select id="qr-batch-cols" onchange="window.setQrBatchGridCols(this.value)" class="w-full px-2.5 py-2 rounded-xl bg-slate-900/90 border border-white/20 text-[11px] font-black text-white outline-none focus:border-amber-400">
                                        <option value="2" ${Number(window.qrMejaState.batchCols || 2) === 2 ? 'selected' : ''}>2 Kolom (4–6/A4)</option>
                                        <option value="3" ${Number(window.qrMejaState.batchCols || 2) === 3 ? 'selected' : ''}>3 Kolom (6–9/A4)</option>
                                        <option value="4" ${Number(window.qrMejaState.batchCols || 2) === 4 ? 'selected' : ''}>4 Kolom (8–16/A4)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div class="flex flex-wrap items-center gap-2">
                                    <label class="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-100 cursor-pointer select-none">
                                        <input type="checkbox" id="qr-batch-cutlines" checked class="w-3.5 h-3.5 rounded accent-amber-400">
                                        <span>Tampilkan garis potong putus-putus</span>
                                    </label>
                                    <span id="qr-batch-cols-badge" class="px-2 py-0.5 rounded-lg bg-indigo-500/30 border border-indigo-400/40 text-[9px] font-black text-amber-300 uppercase">
                                        ${Number(window.qrMejaState.batchCols || 2)} Kolom A4
                                    </span>
                                </div>
                                <button type="button" onclick="window.cetakBatchQrMejaCustom()" class="w-full sm:w-auto py-2 px-4 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer touch-manipulation">
                                    <i class="fa-solid fa-table-cells"></i>
                                    <span>Cetak Batch A4 (CSS Grid)</span>
                                </button>
                            </div>
                        </div>

                        <!-- Preset Cepat -->
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" onclick="window.cetakBatchQrMeja(1, 4, { cols: 2 })" class="py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-xl text-[11px] font-black text-white flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation">
                                <i class="fa-solid fa-table-cells-large text-amber-400"></i>
                                <span>Meja 01–04 (2x2)</span>
                            </button>
                            <button type="button" onclick="window.cetakBatchQrMeja(1, 6, { cols: 2 })" class="py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-xl text-[11px] font-black text-white flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation">
                                <i class="fa-solid fa-table-cells text-amber-400"></i>
                                <span>Meja 01–06 (2x3)</span>
                            </button>
                            <button type="button" onclick="window.cetakBatchQrMeja(1, 9, { cols: 3 })" class="py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-xl text-[11px] font-black text-white flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation">
                                <i class="fa-solid fa-grip text-emerald-400"></i>
                                <span>Meja 01–09 (3x3 Hemat)</span>
                            </button>
                            <button type="button" onclick="window.cetakBatchQrMeja(1, 16, { cols: 4 })" class="py-2 px-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-xl text-[11px] font-black text-white flex items-center justify-center gap-1.5 transition cursor-pointer touch-manipulation">
                                <i class="fa-solid fa-border-all text-sky-400"></i>
                                <span>Meja 01–16 (4x4 Mini)</span>
                            </button>
                            <button type="button" onclick="window.cetakBatchQrMeja('tanpa_meja', 4, { cols: Number(document.getElementById('qr-batch-cols')?.value || window.qrMejaState.batchCols || 2) })" class="col-span-2 py-2 px-3 bg-rose-600/90 hover:bg-rose-600 active:scale-95 text-white font-black rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer touch-manipulation">
                                <i class="fa-solid fa-store text-white"></i>
                                <span>4x Tanpa Meja (Sesuai Grid A4)</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;

    if (typeof window.setQrBatchGridCols === 'function') {
        window.setQrBatchGridCols(window.qrMejaState.batchCols || 2);
    }
    await window.updateQrMejaPreview();
};

// ============================================================================
// SYNC UI CONTROLS SAAT TEMA ATAU WARNA BERUBAH
// ============================================================================
window._syncQrColorControlsUI = () => {
    const activeTpl = window.getQrMejaTemplateMeta(window.qrMejaState.template);
    const c = window.getQrMejaActiveColors(activeTpl.id);

    const badge = document.getElementById('qr-active-theme-badge');
    if (badge) badge.innerText = activeTpl.name;
    const editorName = document.getElementById('qr-color-editor-theme-name');
    if (editorName) editorName.innerText = activeTpl.shortName;

    ['bg', 'primary', 'accent', 'ink'].forEach(k => {
        const inp = document.getElementById(`qr-col-${k}`);
        const hexLbl = document.getElementById(`qr-hex-${k}`);
        if (inp) inp.value = c[k];
        if (hexLbl) hexLbl.innerText = c[k];
    });

    QR_MEJA_TEMPLATES.forEach(tpl => {
        const btn = document.getElementById(`btn-tpl-${tpl.id}`);
        if (!btn) return;
        const tc = window.getQrMejaActiveColors(tpl.id);
        const swatch = btn.querySelector('span');
        if (swatch) swatch.style.background = `linear-gradient(135deg, ${tc.primary} 50%, ${tc.accent} 50%)`;
        if (tpl.id === activeTpl.id) {
            btn.className = 'py-2 px-2 text-[10px] font-black rounded-xl transition text-left flex items-center gap-1.5 border cursor-pointer bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400';
        } else {
            btn.className = 'py-2 px-2 text-[10px] font-black rounded-xl transition text-left flex items-center gap-1.5 border cursor-pointer bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
        }
    });

    const presetBtns = document.querySelectorAll('[data-color-preset]');
    presetBtns.forEach(btn => {
        const pid = btn.getAttribute('data-color-preset');
        const isActive = c.preset === pid;
        btn.className = `px-2.5 py-1.5 rounded-xl text-[10px] font-black transition flex items-center gap-1.5 border cursor-pointer ${isActive ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-amber-400' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`;
    });
};

window.setQrMejaColorTypePreset = (presetId) => {
    const tpl = window.getQrMejaTemplateMeta(window.qrMejaState.template);
    const preset = QR_MEJA_COLOR_TYPES.find(p => p.id === presetId) || QR_MEJA_COLOR_TYPES[0];
    if (!window.qrMejaState.themeColors) window.qrMejaState.themeColors = {};

    if (preset.id === 'default') {
        delete window.qrMejaState.themeColors[tpl.id];
    } else {
        window.qrMejaState.themeColors[tpl.id] = {
            bg: preset.bg,
            primary: preset.primary,
            accent: preset.accent,
            ink: preset.ink,
            preset: preset.id
        };
    }
    _saveQrMejaColors(window.qrMejaState.themeColors);
    window._syncQrColorControlsUI();
    window.updateQrMejaPreview();
};

window.updateQrMejaThemeColor = (colorKey, hexVal) => {
    const tpl = window.getQrMejaTemplateMeta(window.qrMejaState.template);
    const current = window.getQrMejaActiveColors(tpl.id);
    if (!window.qrMejaState.themeColors) window.qrMejaState.themeColors = {};

    window.qrMejaState.themeColors[tpl.id] = {
        bg: current.bg,
        primary: current.primary,
        accent: current.accent,
        ink: current.ink,
        [colorKey]: _normalizeHex(hexVal, current[colorKey]),
        preset: 'custom'
    };
    _saveQrMejaColors(window.qrMejaState.themeColors);
    window._syncQrColorControlsUI();
    window.updateQrMejaPreview();
};

window.resetQrMejaThemeColor = () => {
    const tpl = window.getQrMejaTemplateMeta(window.qrMejaState.template);
    if (window.qrMejaState.themeColors) {
        delete window.qrMejaState.themeColors[tpl.id];
        _saveQrMejaColors(window.qrMejaState.themeColors);
    }
    window._syncQrColorControlsUI();
    window.updateQrMejaPreview();
};

// ============================================================================
// HELPER DETEKSI MODE TANPA MEJA
// ============================================================================
window.isQrMejaNoTable = (val) => {
    if (!val) return true;
    const str = String(val).toLowerCase().trim();
    return str === 'tanpa meja' || str.includes('tanpa') || str.includes('kasir') || str.includes('tembok') || str.includes('wall') || str.includes('express');
};

window.setQrMejaMode = (mode) => {
    window.qrMejaState.mode = mode;
    if (mode === 'tanpa_meja') {
        window.qrMejaState.nomorMeja = 'Tanpa Meja';
        window.qrMejaState.customNomor = '';
        window.qrMejaState.noticeText = 'Scan dari HP Anda • Ambil pesanan di kasir/counter saat dipanggil';
    } else {
        window.qrMejaState.nomorMeja = '01';
        window.qrMejaState.customNomor = '';
        window.qrMejaState.noticeText = 'Apabila sudah order MOHON UNTUK TIDAK PINDAH MEJA';
    }

    const inputNotice = document.getElementById('input-qr-notice');
    if (inputNotice) inputNotice.value = window.qrMejaState.noticeText;

    const label = document.getElementById('label-active-table');
    if (label) {
        if (mode === 'tanpa_meja') {
            label.innerText = 'Tanpa Meja (Kasir / Tembok)';
            label.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase';
        } else {
            label.innerText = 'Meja 01';
            label.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 uppercase';
        }
    }

    const btnPrintSingle = document.getElementById('btn-label-print-single');
    if (btnPrintSingle) {
        btnPrintSingle.innerText = mode === 'tanpa_meja' ? 'Cetak Poster Ini' : 'Cetak Meja Ini';
    }

    const btnTanpa = document.getElementById('btn-mode-tanpa-meja');
    const btnMeja = document.getElementById('btn-mode-meja');
    if (btnTanpa && btnMeja) {
        if (mode === 'tanpa_meja') {
            btnTanpa.className = 'py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer bg-amber-500 text-slate-950 shadow-sm font-black';
            btnMeja.className = 'py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900';
        } else {
            btnMeja.className = 'py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer bg-white text-slate-900 shadow-sm font-black';
            btnTanpa.className = 'py-2 px-2 text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900';
        }
    }

    window.updateQrMejaPreview();
};

window.switchQrMejaTemplate = (templateName) => {
    window.qrMejaState.template = templateName;
    window._syncQrColorControlsUI();
    window.updateQrMejaPreview();
};

window.setQrMejaNomor = (no) => {
    window.qrMejaState.nomorMeja = String(no);
    window.qrMejaState.customNomor = '';
    const isNoTable = window.isQrMejaNoTable(no);
    window.qrMejaState.mode = isNoTable ? 'tanpa_meja' : 'meja';

    window.qrMejaState.noticeText = isNoTable
        ? 'Scan dari HP Anda • Ambil pesanan di kasir/counter saat dipanggil'
        : 'Apabila sudah order MOHON UNTUK TIDAK PINDAH MEJA';
    const inputNotice = document.getElementById('input-qr-notice');
    if (inputNotice) inputNotice.value = window.qrMejaState.noticeText;

    const label = document.getElementById('label-active-table');
    if (label) {
        label.innerText = isNoTable ? 'Tanpa Meja (Kasir / Tembok)' : `Meja ${no}`;
        label.className = isNoTable ? 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 uppercase' : 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-800 border border-teal-300 uppercase';
    }
    const inp = document.getElementById('input-custom-meja');
    if (inp) inp.value = '';

    const btnPrintSingle = document.getElementById('btn-label-print-single');
    if (btnPrintSingle) {
        btnPrintSingle.innerText = isNoTable ? 'Cetak Poster Ini' : 'Cetak Meja Ini';
    }

    window.updateQrMejaPreview();
};

window.setQrMejaNomorCustom = (val) => {
    if (!val || val.trim() === '') return;
    const clean = val.trim();
    window.qrMejaState.nomorMeja = clean;
    window.qrMejaState.customNomor = clean;
    const isNoTable = window.isQrMejaNoTable(clean);
    window.qrMejaState.mode = isNoTable ? 'tanpa_meja' : 'meja';

    const label = document.getElementById('label-active-table');
    if (label) {
        label.innerText = isNoTable ? clean : (clean.toLowerCase().startsWith('meja') ? clean : `Meja ${clean}`);
    }
    window.updateQrMejaPreview();
};

window.getQrMejaTargetUrl = (tableNo) => {
    const table = tableNo !== undefined ? tableNo : (window.qrMejaState.nomorMeja || '01');
    const origin = window.location.origin || (window.location.protocol + '//' + window.location.host);
    const isNoTable = window.isQrMejaNoTable(table);
    const bid = (window.ACTIVE_BRANCH_ID && window.ACTIVE_BRANCH_ID !== 'pusat') ? window.ACTIVE_BRANCH_ID : '';

    if (isNoTable) {
        return bid ? `${origin}/?cabang=${encodeURIComponent(bid)}` : `${origin}/`;
    }
    return bid
        ? `${origin}/?cabang=${encodeURIComponent(bid)}&meja=${encodeURIComponent(table)}`
        : `${origin}/?meja=${encodeURIComponent(table)}`;
};

// ============================================================================
// BUILD CARD HTML (8 DESAIN TEMA BERBEDA + WARNA DINAMIS PER TEMA)
// ============================================================================
window.buildQrMejaCardHtml = (template, tableNo, qrDataUrl, isPrintMode = false) => {
    const s = window.storeSettings || {};
    const storeTitle = (window.qrMejaState.storeTitle || s.store_title || 'Mainstay Drink').toUpperCase();
    const storeLogo = s.receipt_logo || s.store_logo || 'logo-192.png';
    const branchName = (window.qrMejaState.namaCabang || 'Cabang Sampangan - Menoreh').toUpperCase();
    const headline = window.qrMejaState.headline || 'PESAN DI SINI';
    const subHeadline = window.qrMejaState.subHeadline || 'TANPA ANTRI';
    const isNoTable = window.isQrMejaNoTable(tableNo);
    const noticeText = window.qrMejaState.noticeText || (isNoTable
        ? 'Scan dari HP Anda • Ambil pesanan di kasir/counter saat dipanggil'
        : 'Apabila sudah order MOHON UNTUK TIDAK PINDAH MEJA');
    const displayTableNumber = isNoTable ? '' : String(tableNo).replace(/^meja\s*/i, '').trim();
    const step3Title = isNoTable ? 'AMBIL' : 'DIANTAR';
    const step3Desc = isNoTable ? 'Pesanan di Counter' : 'Langsung ke Meja';

    const c = window.getQrMejaActiveColors(template);

    // ------------------------------------------------------------------------
    // TEMA 2: VIBRANT RIBBON (HEADER CERAH + QR KIRI + 3 PITA RIBBON KANAN)
    // ------------------------------------------------------------------------
    if (template === 'gacoan_cyan') {
        const dockBg = c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : '#ffffff';
        const dockText = _contrastOn(dockBg);
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-square max-w-[360px] sm:max-w-[390px] rounded-[28px] shadow-2xl border-[3px] flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink};">
                <div class="qr-meja-card-header px-4 pt-3.5 pb-3 shadow-sm" style="background: linear-gradient(135deg, ${c.primary}, ${_mixHex(c.primary, '#000000', 0.16)}); color:${c.onPrimary};">
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-white p-1 shadow-sm shrink-0 flex items-center justify-center">
                                <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain rounded-lg" onerror="this.src='/logo-192.png';">
                            </div>
                            <div class="min-w-0">
                                <span class="text-[9px] font-black uppercase tracking-widest opacity-90 block leading-none truncate">${storeTitle}</span>
                                <span class="text-[8.5px] font-bold opacity-95 truncate block mt-0.5"><i class="fa-solid fa-location-dot mr-1"></i>${branchName}</span>
                            </div>
                        </div>
                        <span class="px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider shadow-xs shrink-0 border border-white/30"
                            style="background-color:${c.accent}; color:${c.onAccent};">
                            ${subHeadline}
                        </span>
                    </div>
                    <h3 class="qr-meja-headline font-black text-xl sm:text-2xl leading-none uppercase tracking-tight text-center" style="color:${c.onPrimary};">
                        ${headline}
                    </h3>
                </div>

                <div class="qr-meja-body-grid grid grid-cols-12 gap-3 px-4 py-2.5 items-center flex-1">
                    <div class="${isPrintMode ? 'col-span-7' : 'col-span-6'} flex flex-col items-center">
                        <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5' : 'p-2.5'} rounded-2xl shadow-md border-2 w-full flex flex-col items-center" style="border-color:${c.accent};">
                            <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block rounded-md">
                            <div class="qr-meja-qr-tag w-full mt-1 py-0.5 px-1.5 rounded-lg font-black text-[7.5px] text-center uppercase tracking-wider truncate"
                                style="background-color:${c.accent}; color:${c.onAccent};">
                                ${branchName}
                            </div>
                        </div>
                    </div>

                    <div class="${isPrintMode ? 'col-span-5' : 'col-span-6'} flex flex-col justify-center gap-1.5">
                        ${[
                            { num: '1', t: 'SCAN', d: 'QR Code Menu' },
                            { num: '2', t: 'BAYAR', d: 'QRIS / Kasir' },
                            { num: '3', t: step3Title, d: step3Desc }
                        ].map(st => `
                            <div class="qr-meja-step-item py-1.5 px-2 rounded-xl shadow-xs flex items-center gap-1.5 border border-white/25"
                                style="background-color:${c.accent}; color:${c.onAccent};">
                                <span class="w-5 h-5 rounded-lg bg-white font-black text-[10px] flex items-center justify-center shrink-0 tabular-nums" style="color:${c.primary};">${st.num}</span>
                                <div class="min-w-0 leading-tight">
                                    <span class="font-black text-[9.5px] uppercase block">${st.t}</span>
                                    <span class="text-[7px] opacity-95 block truncate">${st.d}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="qr-meja-card-footer px-4 py-2 border-t flex items-center justify-between gap-2.5" style="background-color:${dockBg}; border-color:${_hexAlpha(c.primary, 0.2)}; color:${dockText};">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="px-1.5 py-0.5 rounded font-black text-[8px] tracking-wider" style="background-color:${c.primary}; color:${c.onPrimary};">QRIS</span>
                            <span class="text-[8px] font-black uppercase tracking-wider truncate" style="color:${c.primary};">Pembayaran Instan</span>
                        </div>
                        <p class="text-[7.5px] sm:text-[8px] font-extrabold leading-tight line-clamp-2 opacity-90">${noticeText}</p>
                    </div>
                    ${!isNoTable ? `
                        <div class="qr-meja-table-badge px-3.5 py-1.5 rounded-2xl text-center shrink-0 min-w-[82px] shadow-sm tabular-nums" style="background-color:${c.primary}; color:${c.onPrimary};">
                            <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest opacity-90 block leading-none mb-0.5">Meja No.</span>
                            <span class="qr-meja-table-num text-2xl sm:text-3xl font-black leading-none tracking-tight">${displayTableNumber}</span>
                        </div>
                    ` : `
                        <div class="px-2.5 py-1.5 rounded-xl border text-center shrink-0 flex items-center gap-1" style="background-color:${c.primarySoft}; border-color:${c.primary}; color:${c.primary};">
                            <i class="fa-solid fa-bolt text-xs" style="color:${c.accent};"></i>
                            <span class="text-[8px] font-black uppercase tracking-wider">Self-Order</span>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 3: TENT CARD PORTRAIT (3:4 + TOP BAR + QR TENGAH + 3 STEP HORIZONTAL)
    // ------------------------------------------------------------------------
    if (template === 'waroeng_yellow') {
        const footerBg = c.isDarkBg ? _mixHex(c.bg, '#000000', 0.25) : _mixHex(c.bg, '#ffffff', 0.35);
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-[3/4] max-w-[330px] sm:max-w-[350px] rounded-[26px] shadow-2xl border-4 flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink};">
                <div class="qr-meja-card-header px-4 py-2.5 flex items-center justify-between gap-2" style="background-color:${c.primary}; color:${c.onPrimary};">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-8 h-8 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center">
                            <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain" onerror="this.src='/logo-192.png';">
                        </div>
                        <span class="text-[10px] font-black uppercase tracking-wider truncate">${storeTitle}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0" style="background-color:${c.accent}; color:${c.onAccent};">
                        ${subHeadline}
                    </span>
                </div>

                <div class="px-4 pt-1.5 text-center">
                    <h3 class="qr-meja-headline font-black text-2xl leading-none uppercase tracking-tight" style="color:${c.ink};">${headline}</h3>
                    <p class="text-[9px] font-black mt-1 uppercase tracking-wider truncate opacity-85" style="color:${c.ink};">
                        <i class="fa-solid fa-store mr-1"></i>${branchName}
                    </p>
                </div>

                <div class="px-4 py-1 flex justify-center">
                    <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5 max-w-[230px]' : 'p-2.5 max-w-[195px]'} rounded-2xl shadow-lg border-2 w-full flex flex-col items-center" style="border-color:${c.primary};">
                        <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block">
                        <div class="qr-meja-qr-tag w-full mt-1 py-0.5 rounded-lg font-black text-[9px] text-center uppercase tracking-widest" style="background-color:${c.accent}; color:${c.onAccent};">
                            SCAN DI SINI
                        </div>
                    </div>
                </div>

                <div class="px-3.5 py-1 grid grid-cols-3 gap-1.5">
                    ${[
                        { num: '1', t: 'SCAN', d: 'Kamera HP' },
                        { num: '2', t: 'BAYAR', d: 'QRIS / Kasir' },
                        { num: '3', t: step3Title, d: isNoTable ? 'Di Counter' : 'Ke Meja' }
                    ].map(st => `
                        <div class="qr-meja-step-item bg-white/95 border rounded-xl p-1.5 text-center shadow-2xs" style="border-color:${_hexAlpha(c.primary, 0.25)};">
                            <span class="w-5 h-5 rounded-full font-black text-[9px] inline-flex items-center justify-center mb-0.5" style="background-color:${c.primary}; color:${c.onPrimary};">${st.num}</span>
                            <span class="block text-[9px] font-black text-slate-900 uppercase leading-none">${st.t}</span>
                            <span class="block text-[7px] font-bold text-slate-600 mt-0.5 truncate">${st.d}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="qr-meja-card-footer px-4 py-2 border-t-2 border-dashed flex items-center justify-between gap-2"
                    style="background-color:${footerBg}; border-color:${_hexAlpha(c.primary, 0.35)}; color:${_contrastOn(footerBg)};">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="px-1.5 py-0.5 rounded bg-white border font-black text-[8px] text-slate-900" style="border-color:${c.primary};">QRIS</span>
                            <span class="text-[8px] font-black uppercase">Cash &amp; Non-Tunai</span>
                        </div>
                        <p class="text-[7.5px] font-extrabold leading-tight line-clamp-2 opacity-90">${noticeText}</p>
                    </div>
                    ${!isNoTable ? `
                        <div class="qr-meja-table-badge text-center shrink-0 px-3 py-1 rounded-xl border-2" style="background-color:${c.primary}; border-color:${c.accent}; color:${c.onPrimary};">
                            <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest block leading-none opacity-90">NO. MEJA</span>
                            <span class="qr-meja-table-num text-3xl font-black leading-none tracking-tighter">${displayTableNumber}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 4: SPINE TIMELINE (SPINE VERTIKAL KIRI + TIMELINE + QR KANAN)
    // ------------------------------------------------------------------------
    if (template === 'magenta_white') {
        const headerCardBg = c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : _mixHex(c.primary, '#ffffff', 0.92);
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-square max-w-[360px] sm:max-w-[390px] rounded-[28px] shadow-2xl border-2 flex overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${_hexAlpha(c.primary, 0.35)}; color:${c.ink};">
                <div class="w-3 sm:w-3.5 shrink-0" style="background: linear-gradient(180deg, ${c.primary}, ${c.accent});"></div>

                <div class="flex-1 p-3.5 sm:p-4 flex flex-col justify-between min-w-0">
                    <div class="qr-meja-card-header border rounded-2xl p-2 flex items-center justify-between gap-2"
                        style="background-color:${headerCardBg}; border-color:${_hexAlpha(c.primary, 0.3)};">
                        <div class="flex items-center gap-2 min-w-0">
                            <div class="w-9 h-9 rounded-xl bg-white p-1 shadow-xs border shrink-0 flex items-center justify-center" style="border-color:${_hexAlpha(c.primary, 0.3)};">
                                <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain" onerror="this.src='/logo-192.png';">
                            </div>
                            <div class="min-w-0">
                                <h3 class="qr-meja-headline font-black text-base sm:text-lg leading-none uppercase tracking-tight truncate" style="color:${c.primary};">
                                    ${headline}
                                </h3>
                                <p class="text-[8px] font-black uppercase tracking-wider truncate mt-0.5 opacity-80" style="color:${c.ink};">
                                    ${branchName}
                                </p>
                            </div>
                        </div>
                        <span class="px-2 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider shrink-0 shadow-xs"
                            style="background-color:${c.accent}; color:${c.onAccent};">
                            ${subHeadline}
                        </span>
                    </div>

                    <div class="qr-meja-body-grid grid grid-cols-12 gap-2.5 my-1.5 items-center flex-1">
                        <div class="col-span-5 flex flex-col justify-center gap-2 relative pl-1">
                            <div class="absolute left-[13px] top-3 bottom-3 w-0.5" style="background-color:${_hexAlpha(c.primary, 0.3)};"></div>
                            ${[
                                { num: '1', bg: c.primary, fg: c.onPrimary, t: 'SCAN', d: 'Kamera HP' },
                                { num: '2', bg: c.accent, fg: c.onAccent, t: 'BAYAR', d: 'QRIS / Kasir' },
                                { num: '3', bg: c.ink, fg: _contrastOn(c.ink), t: step3Title, d: step3Desc }
                            ].map(st => `
                                <div class="qr-meja-step-item relative z-10 flex items-center gap-2">
                                    <span class="w-6 h-6 rounded-full font-black text-[10px] flex items-center justify-center shrink-0 ring-2 ring-white shadow-xs"
                                        style="background-color:${st.bg}; color:${st.fg};">${st.num}</span>
                                    <div class="min-w-0 leading-tight">
                                        <span class="font-black text-[9.5px] uppercase block" style="color:${c.ink};">${st.t}</span>
                                        <span class="text-[7px] font-bold opacity-75 block truncate" style="color:${c.ink};">${st.d}</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <div class="col-span-7 flex flex-col items-center">
                            <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5' : 'p-2'} rounded-2xl shadow-lg border-2 w-full flex flex-col items-center" style="border-color:${_hexAlpha(c.primary, 0.45)};">
                                <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block rounded-lg">
                                <div class="qr-meja-qr-tag w-full mt-1 py-0.5 px-1.5 rounded-md font-black text-[7.5px] text-center uppercase tracking-wider truncate"
                                    style="background: linear-gradient(90deg, ${c.primary}, ${c.accent}); color:${c.onPrimary};">
                                    ${storeTitle}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="qr-meja-card-footer border-t-2 border-dotted pt-2 flex items-center justify-between gap-2" style="border-color:${_hexAlpha(c.primary, 0.35)};">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="px-1.5 py-0.5 rounded border font-black text-[8px]" style="background-color:${headerCardBg}; border-color:${c.primary}; color:${c.primary};">QRIS</span>
                                <span class="text-[8px] font-extrabold uppercase tracking-wider truncate opacity-75" style="color:${c.ink};">Scan &amp; Pesan</span>
                            </div>
                            <p class="text-[7.5px] font-bold leading-tight line-clamp-2 opacity-90" style="color:${c.ink};">${noticeText}</p>
                        </div>
                        ${!isNoTable ? `
                            <div class="qr-meja-table-badge px-3 py-1 rounded-xl border-2 text-center shrink-0 min-w-[78px]" style="background-color:${headerCardBg}; border-color:${c.primary};">
                                <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest block" style="color:${c.primary};">NO. MEJA</span>
                                <span class="qr-meja-table-num text-2xl sm:text-3xl font-black leading-none tracking-tighter" style="color:${c.ink};">${displayTableNumber}</span>
                            </div>
                        ` : `
                            <div class="px-2.5 py-1.5 rounded-xl text-center shrink-0 flex items-center gap-1" style="background-color:${c.primary}; color:${c.onPrimary};">
                                <i class="fa-solid fa-qrcode text-[10px]"></i>
                                <span class="text-[8px] font-black uppercase tracking-wider">Counter</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 5: CAFE ARCH (KUBAH LENGKUNG MODERN + KAPSUL MEJA)
    // ------------------------------------------------------------------------
    if (template === 'emerald_arch') {
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-[3/4] max-w-[330px] sm:max-w-[350px] rounded-[32px] shadow-2xl border-4 flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif] p-3"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink};">
                <!-- Arch Header Banner -->
                <div class="qr-meja-card-header rounded-t-[22px] rounded-b-xl p-2.5 text-center shadow-sm relative overflow-hidden" style="background-color:${c.primary}; color:${c.onPrimary};">
                    <div class="flex items-center justify-center gap-2 mb-1">
                        <div class="w-7 h-7 rounded-full bg-white p-0.5 shrink-0 flex items-center justify-center shadow-xs">
                            <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain rounded-full" onerror="this.src='/logo-192.png';">
                        </div>
                        <span class="text-[10px] font-black uppercase tracking-widest truncate">${storeTitle}</span>
                    </div>
                    <h3 class="qr-meja-headline font-black text-xl leading-none uppercase tracking-tight">${headline}</h3>
                    <span class="inline-block mt-1 px-3 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider" style="background-color:${c.accent}; color:${c.onAccent};">
                        ${subHeadline} &bull; ${branchName}
                    </span>
                </div>

                <!-- Dome Arch QR Frame -->
                <div class="flex-1 flex flex-col items-center justify-center py-1.5">
                    <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-2 max-w-[230px]' : 'p-3 max-w-[205px]'} rounded-t-[70px] rounded-b-2xl shadow-lg border-2 w-full flex flex-col items-center" style="border-color:${c.accent};">
                        <span class="qr-meja-qr-tag text-[8px] font-black uppercase tracking-widest mb-1" style="color:${c.primary};">MENU SELF-ORDER</span>
                        <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block rounded-lg">
                    </div>
                </div>

                <!-- Capsule 3 Steps -->
                <div class="grid grid-cols-3 gap-1.5 pb-1.5">
                    ${[
                        { num: '1', t: 'SCAN' },
                        { num: '2', t: 'BAYAR' },
                        { num: '3', t: step3Title }
                    ].map(st => `
                        <div class="qr-meja-step-item rounded-full py-1 px-2 flex items-center justify-center gap-1 shadow-2xs" style="background-color:${c.primary}; color:${c.onPrimary};">
                            <span class="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center shrink-0" style="background-color:${c.accent}; color:${c.onAccent};">${st.num}</span>
                            <span class="text-[8.5px] font-black uppercase truncate">${st.t}</span>
                        </div>
                    `).join('')}
                </div>

                <!-- Bottom Dock -->
                <div class="qr-meja-card-footer rounded-2xl p-2 flex items-center justify-between gap-2 border" style="background-color:${c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : '#ffffff'}; border-color:${_hexAlpha(c.primary, 0.25)}; color:${c.isDarkBg ? '#f8fafc' : c.ink};">
                    <div class="flex-1 min-w-0">
                        <span class="inline-block px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase mb-0.5" style="background-color:${c.accent}; color:${c.onAccent};">QRIS &amp; TUNAI</span>
                        <p class="text-[7.5px] font-bold leading-tight line-clamp-2 opacity-90">${noticeText}</p>
                    </div>
                    ${!isNoTable ? `
                        <div class="qr-meja-table-badge px-3 py-1 rounded-2xl text-center shrink-0 shadow-sm min-w-[74px]" style="background-color:${c.primary}; color:${c.onPrimary};">
                            <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest block opacity-90">MEJA</span>
                            <span class="qr-meja-table-num text-2xl font-black leading-none">${displayTableNumber}</span>
                        </div>
                    ` : `
                        <div class="px-2.5 py-1.5 rounded-xl text-center shrink-0 font-black text-[8px] uppercase" style="background-color:${c.primary}; color:${c.onPrimary};">
                            COUNTER
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 6: DARK NEON (BISTRO MODERN BERAKSEN MENYALA)
    // ------------------------------------------------------------------------
    if (template === 'neon_dark') {
        const panelBg = _mixHex(c.bg, '#ffffff', c.isDarkBg ? 0.08 : 0.06);
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-square max-w-[360px] sm:max-w-[390px] rounded-[28px] p-4 shadow-2xl border-4 flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink}; box-shadow: 0 0 28px ${_hexAlpha(c.primary, 0.35)};">
                <div class="qr-meja-card-header flex items-center justify-between gap-2 pb-2 border-b" style="border-color:${_hexAlpha(c.primary, 0.35)};">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-white p-1 shrink-0 shadow-md flex items-center justify-center border-2" style="border-color:${c.primary};">
                            <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain" onerror="this.src='/logo-192.png';">
                        </div>
                        <div class="min-w-0">
                            <h3 class="qr-meja-headline font-black text-base sm:text-lg leading-none uppercase tracking-tight truncate" style="color:${c.primary};">${headline}</h3>
                            <p class="text-[8px] font-bold uppercase tracking-wider truncate mt-0.5 opacity-85" style="color:${c.ink};">${branchName}</p>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-lg font-black text-[9px] uppercase tracking-wider shrink-0 shadow-md" style="background-color:${c.accent}; color:${c.onAccent};">
                        ${subHeadline}
                    </span>
                </div>

                <div class="qr-meja-body-grid grid grid-cols-12 gap-3 my-1.5 items-center flex-1">
                    <div class="${isPrintMode ? 'col-span-7' : 'col-span-6'} flex flex-col items-center">
                        <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5' : 'p-2'} rounded-2xl w-full flex flex-col items-center border-2 shadow-lg" style="border-color:${c.primary}; box-shadow: 0 0 18px ${_hexAlpha(c.primary, 0.35)};">
                            <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block rounded-md">
                            <span class="qr-meja-qr-tag mt-1 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider w-full text-center truncate" style="background-color:${c.primary}; color:${c.onPrimary};">
                                ${storeTitle}
                            </span>
                        </div>
                    </div>

                    <div class="${isPrintMode ? 'col-span-5' : 'col-span-6'} flex flex-col justify-center gap-1.5">
                        ${[
                            { num: '01', t: 'SCAN QR', d: 'Buka Kamera HP' },
                            { num: '02', t: 'PILIH & BAYAR', d: 'QRIS / Tunai' },
                            { num: '03', t: step3Title, d: step3Desc }
                        ].map(st => `
                            <div class="qr-meja-step-item p-1.5 rounded-xl border flex items-center gap-1.5" style="background-color:${panelBg}; border-color:${_hexAlpha(c.primary, 0.4)};">
                                <span class="w-5 h-5 rounded-lg font-black text-[9px] flex items-center justify-center shrink-0" style="background-color:${c.accent}; color:${c.onAccent};">${st.num}</span>
                                <div class="min-w-0 leading-tight">
                                    <span class="font-black text-[9px] uppercase block" style="color:${c.ink};">${st.t}</span>
                                    <span class="text-[7px] opacity-80 block truncate" style="color:${c.ink};">${st.d}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="qr-meja-card-footer pt-2 border-t flex items-center justify-between gap-2" style="border-color:${_hexAlpha(c.primary, 0.35)};">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 mb-0.5">
                            <span class="px-1.5 py-0.5 rounded text-[8px] font-black" style="background-color:${c.primary}; color:${c.onPrimary};">QRIS</span>
                            <span class="text-[8px] font-black uppercase tracking-wider opacity-85 truncate" style="color:${c.ink};">INSTANT ORDER</span>
                        </div>
                        <p class="text-[7.5px] font-bold leading-tight line-clamp-2 opacity-85" style="color:${c.ink};">${noticeText}</p>
                    </div>
                    ${!isNoTable ? `
                        <div class="qr-meja-table-badge px-3 py-1 rounded-xl border-2 text-center shrink-0 min-w-[78px]" style="border-color:${c.accent}; background-color:${panelBg};">
                            <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest block" style="color:${c.accent};">MEJA</span>
                            <span class="qr-meja-table-num text-2xl sm:text-3xl font-black leading-none" style="color:${c.ink};">${displayTableNumber}</span>
                        </div>
                    ` : `
                        <div class="px-2.5 py-1.5 rounded-xl font-black text-[8px] uppercase shrink-0" style="background-color:${c.accent}; color:${c.onAccent};">EXPRESS</div>
                    `}
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 7: RETRO TICKET (POSTER DOUBLE-BORDER KLASIK + NOMOR MEJA TIKET)
    // ------------------------------------------------------------------------
    if (template === 'retro_badge') {
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-[3/4] max-w-[330px] sm:max-w-[350px] rounded-[24px] p-2.5 shadow-2xl border-4 flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink};">
                <div class="w-full h-full border-2 border-dashed rounded-[18px] p-2.5 flex flex-col justify-between" style="border-color:${c.primary};">
                    <div class="qr-meja-card-header text-center border-b-2 pb-1.5" style="border-color:${_hexAlpha(c.primary, 0.35)};">
                        <div class="flex items-center justify-center gap-1.5 mb-0.5">
                            <img src="${storeLogo}" alt="Logo" class="w-6 h-6 rounded-md bg-white p-0.5 object-contain border" style="border-color:${c.primary};" onerror="this.src='/logo-192.png';">
                            <span class="text-[9px] font-black uppercase tracking-widest" style="color:${c.primary};">${storeTitle}</span>
                        </div>
                        <h3 class="qr-meja-headline font-black text-xl leading-none uppercase tracking-tight" style="color:${c.ink};">${headline}</h3>
                        <div class="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase" style="background-color:${c.accent}; color:${c.onAccent};">
                            <span>${subHeadline}</span> &bull; <span class="truncate max-w-[140px]">${branchName}</span>
                        </div>
                    </div>

                    <div class="py-1 flex justify-center">
                        <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5 max-w-[225px]' : 'p-2 max-w-[185px]'} rounded-2xl shadow-md border-2 w-full flex flex-col items-center" style="border-color:${c.primary};">
                            <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block">
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-1 text-center py-1 px-2 rounded-xl" style="background-color:${c.primary}; color:${c.onPrimary};">
                        <div>
                            <span class="block text-[9px] font-black">1. SCAN</span>
                            <span class="block text-[7px] opacity-85">Kamera HP</span>
                        </div>
                        <div class="border-x border-white/25">
                            <span class="block text-[9px] font-black">2. BAYAR</span>
                            <span class="block text-[7px] opacity-85">QRIS / Kasir</span>
                        </div>
                        <div>
                            <span class="block text-[9px] font-black">3. ${step3Title}</span>
                            <span class="block text-[7px] opacity-85">${isNoTable ? 'Counter' : 'Ke Meja'}</span>
                        </div>
                    </div>

                    <div class="qr-meja-card-footer pt-1.5 border-t-2 border-dashed flex items-center justify-between gap-2" style="border-color:${_hexAlpha(c.primary, 0.4)};">
                        <p class="text-[7.5px] font-extrabold leading-tight line-clamp-2 flex-1" style="color:${c.ink};">${noticeText}</p>
                        ${!isNoTable ? `
                            <div class="qr-meja-table-badge px-3 py-1 rounded-xl border-2 text-center shrink-0 min-w-[72px]" style="background-color:${c.accent}; border-color:${c.ink}; color:${c.onAccent};">
                                <span class="qr-meja-table-label text-[7.5px] font-black uppercase block leading-none">MEJA</span>
                                <span class="qr-meja-table-num text-2xl font-black leading-none">${displayTableNumber}</span>
                            </div>
                        ` : `
                            <div class="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase shrink-0" style="background-color:${c.accent}; color:${c.onAccent};">KASIR</div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 8: SPLIT DUAL-PANEL (LANDSCAPE 4:3 — KIRI IDENTITAS + KANAN QR)
    // ------------------------------------------------------------------------
    if (template === 'split_dual') {
        return `
            <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-[4/3] max-w-[400px] sm:max-w-[440px] rounded-[26px] shadow-2xl border-2 flex overflow-hidden select-none font-['Nunito',sans-serif]"
                style="background-color:${c.bg}; border-color:${c.primary}; color:${c.ink};">
                <!-- Left Colored Info Panel -->
                <div class="${isPrintMode ? 'w-[42%] p-3' : 'w-[46%] p-3.5 sm:p-4'} flex flex-col justify-between shrink-0" style="background-color:${c.primary}; color:${c.onPrimary};">
                    <div>
                        <div class="flex items-center gap-2 mb-1.5">
                            <div class="w-8 h-8 rounded-xl bg-white p-1 shrink-0 shadow-sm flex items-center justify-center">
                                <img src="${storeLogo}" alt="Logo" class="w-full h-full object-contain" onerror="this.src='/logo-192.png';">
                            </div>
                            <span class="text-[9px] font-black uppercase tracking-wider leading-tight truncate">${storeTitle}</span>
                        </div>
                        <span class="inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider mb-1" style="background-color:${c.accent}; color:${c.onAccent};">
                            ${subHeadline}
                        </span>
                        <h3 class="qr-meja-headline font-black text-lg sm:text-xl leading-none uppercase tracking-tight">${headline}</h3>
                        <p class="text-[7.5px] font-bold opacity-85 mt-1 leading-tight line-clamp-2"><i class="fa-solid fa-location-dot mr-1"></i>${branchName}</p>
                    </div>

                    ${!isNoTable ? `
                        <div class="qr-meja-table-badge rounded-2xl p-2 text-center border-2 border-white/40" style="background-color:${c.accent}; color:${c.onAccent};">
                            <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest block opacity-95">NOMOR MEJA</span>
                            <span class="qr-meja-table-num text-3xl sm:text-4xl font-black leading-none tracking-tighter">${displayTableNumber}</span>
                        </div>
                    ` : `
                        <div class="rounded-xl p-2 text-center font-black text-[9px] uppercase tracking-wider" style="background-color:${c.accent}; color:${c.onAccent};">
                            <i class="fa-solid fa-store mr-1"></i> COUNTER ORDER
                        </div>
                    `}
                </div>

                <!-- Right QR & Steps Panel -->
                <div class="flex-1 p-3 flex flex-col justify-between items-center min-w-0">
                    <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5 max-w-full' : 'p-2 max-w-[165px]'} rounded-2xl shadow-md border-2 w-full flex flex-col items-center" style="border-color:${_hexAlpha(c.primary, 0.35)};">
                        <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block">
                    </div>

                    <div class="w-full space-y-1 my-1">
                        <div class="flex items-center justify-between gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-lg" style="background-color:${_hexAlpha(c.primary, 0.08)}; color:${c.ink};">
                            <span>1. Scan</span><span>&bull;</span><span>2. Bayar</span><span>&bull;</span><span>3. ${step3Title}</span>
                        </div>
                    </div>

                    <div class="w-full flex items-center gap-1.5 border-t pt-1.5" style="border-color:${_hexAlpha(c.primary, 0.2)};">
                        <span class="px-1.5 py-0.5 rounded font-black text-[7.5px] shrink-0" style="background-color:${c.primary}; color:${c.onPrimary};">QRIS</span>
                        <p class="text-[7px] font-bold leading-tight line-clamp-2" style="color:${c.ink};">${noticeText}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // ------------------------------------------------------------------------
    // TEMA 1 (DEFAULT): CLASSIC ACRYLIC (MODERN ARCHITECTURAL STAND)
    // ------------------------------------------------------------------------
    return `
        <div class="qr-standee-acrylic-card ${isPrintMode ? 'qr-card-print-mode' : ''} relative w-full aspect-square max-w-[360px] sm:max-w-[390px] rounded-[28px] p-4 sm:p-5 shadow-2xl border-[3px] flex flex-col justify-between overflow-hidden select-none font-['Nunito',sans-serif]"
            style="background: linear-gradient(145deg, ${c.bgLight}, ${c.bg}, ${c.bgDark}); border-color:${c.accent}; color:${c.ink};">
            <div class="absolute -top-10 -right-10 w-32 h-32 bg-white/15 rounded-full blur-2xl pointer-events-none"></div>

            <div class="qr-meja-card-header relative z-10 flex items-center justify-between gap-2 border-b pb-2" style="border-color:${_hexAlpha(c.ink, 0.14)};">
                <div class="flex-1 min-w-0 overflow-hidden">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="qr-meja-headline font-black text-lg sm:text-xl leading-none uppercase tracking-tight" style="color:${c.onBg};">
                            ${headline}
                        </h3>
                        <span class="px-2 py-0.5 rounded-md font-black text-[9.5px] sm:text-[10px] tracking-wider uppercase shadow-2xs shrink-0"
                            style="background-color:${c.primary}; color:${c.accent};">
                            ${subHeadline}
                        </span>
                    </div>
                    <div class="flex items-center gap-1 mt-1 text-[8.5px] font-black uppercase tracking-wider truncate opacity-85" style="color:${c.ink};">
                        <i class="fa-solid fa-location-dot" style="color:${c.primary};"></i>
                        <span class="truncate">${branchName}</span>
                    </div>
                </div>

                <div class="qr-meja-logo-box w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white p-1.5 shadow-sm border flex items-center justify-center shrink-0" style="border-color:${c.accent};">
                    <img src="${storeLogo}" alt="Mainstay Logo" class="w-full h-full object-contain" onerror="this.src='/logo-192.png';">
                </div>
            </div>

            <div class="qr-meja-body-grid relative z-10 grid grid-cols-12 gap-3 my-1.5 items-center flex-1 min-h-0">
                <div class="${isPrintMode ? 'col-span-7' : 'col-span-6'} flex flex-col items-center min-w-0">
                    <div class="qr-meja-qr-box bg-white ${isPrintMode ? 'p-1.5' : 'p-2.5'} rounded-2xl shadow-md border w-full flex flex-col items-center overflow-hidden" style="border-color:${_hexAlpha(c.primary, 0.2)};">
                        <img src="${qrDataUrl}" alt="QR Order" class="qr-meja-qr-img w-full aspect-square object-contain block rounded-md">
                        <div class="qr-meja-qr-tag w-full mt-1 py-0.5 px-1.5 rounded-md font-black text-[7.5px] text-center uppercase tracking-wider truncate"
                            style="background-color:${c.primary}; color:${c.accent};">
                            ${branchName}
                        </div>
                    </div>
                </div>

                <div class="${isPrintMode ? 'col-span-5' : 'col-span-6'} flex flex-col justify-center gap-1.5 min-w-0">
                    ${[
                        { num: '1', t: 'SCAN', d: 'Kamera HP / QR' },
                        { num: '2', t: 'BAYAR', d: 'QRIS / Kasir' },
                        { num: '3', t: step3Title, d: step3Desc }
                    ].map(st => `
                        <div class="qr-meja-step-item p-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs border min-w-0" style="background-color:${c.primary}; color:${c.onPrimary}; border-color:${_hexAlpha('#ffffff', 0.14)};">
                            <span class="w-5 h-5 rounded-lg font-black text-[9.5px] flex items-center justify-center shrink-0 tabular-nums" style="background-color:${c.accent}; color:${c.onAccent};">${st.num}</span>
                            <div class="min-w-0 leading-tight flex-1">
                                <span class="font-black text-[9px] uppercase tracking-wider block truncate">${st.t}</span>
                                <span class="text-[7px] opacity-90 block truncate">${st.d}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="qr-meja-card-footer relative z-10 flex items-center justify-between gap-2 pt-2 border-t" style="border-color:${_hexAlpha(c.ink, 0.14)};">
                <div class="flex-1 min-w-0 overflow-hidden pr-1">
                    <div class="flex items-center gap-1 mb-0.5 min-w-0">
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-slate-900 border border-slate-300 font-black text-[8px] shadow-2xs shrink-0">QRIS</span>
                        <span class="text-[8px] font-black uppercase tracking-wider truncate" style="color:${c.ink};">Pembayaran</span>
                    </div>
                    <p class="text-[7.5px] sm:text-[8px] font-extrabold leading-tight line-clamp-2 opacity-90" style="color:${c.ink};">${noticeText}</p>
                </div>

                ${!isNoTable ? `
                    <div class="qr-meja-table-badge px-3.5 py-1.5 rounded-2xl flex flex-col items-center justify-center shadow-sm shrink-0 text-center border-2 min-w-[82px] tabular-nums"
                        style="background-color:${c.primary}; color:${c.accent}; border-color:${_hexAlpha(c.accent, 0.75)};">
                        <span class="qr-meja-table-label text-[7.5px] font-black uppercase tracking-widest opacity-90 leading-none mb-0.5" style="color:${c.onPrimary};">NO. MEJA</span>
                        <span class="qr-meja-table-num font-black leading-none text-2xl sm:text-3xl tracking-tight">${displayTableNumber}</span>
                    </div>
                ` : `
                    <div class="px-2.5 py-1.5 rounded-xl border text-center shrink-0 flex items-center gap-1 shadow-xs whitespace-nowrap"
                        style="background-color:${c.primary}; color:${c.accent}; border-color:${_hexAlpha(c.accent, 0.5)};">
                        <i class="fa-solid fa-store text-[10px]"></i>
                        <span class="text-[8px] font-black uppercase tracking-wider">Counter</span>
                    </div>
                `}
            </div>
        </div>
    `;
};

// ============================================================================
// UPDATE PREVIEW CARD LIVE
// ============================================================================
window.updateQrMejaPreview = async () => {
    const wrapper = document.getElementById('qr-meja-preview-wrapper');
    if (!wrapper) return;

    const tableNo = window.qrMejaState.nomorMeja || '01';
    const targetUrl = window.getQrMejaTargetUrl(tableNo);
    const template = window.qrMejaState.template || 'mainstay_gold';

    try {
        let qrDataUrl = '';
        if (window.QRCode && typeof window.QRCode.toDataURL === 'function') {
            qrDataUrl = await window.QRCode.toDataURL(targetUrl, {
                width: 700,
                margin: 2,
                errorCorrectionLevel: 'H',
                color: { dark: '#000000', light: '#ffffff' }
            });
        } else {
            qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(targetUrl)}`;
        }

        window._latestActiveQrMejaDataUrl = qrDataUrl;
        wrapper.innerHTML = window.buildQrMejaCardHtml(template, tableNo, qrDataUrl);
    } catch (err) {
        console.error("Gagal generate preview QR meja:", err);
        wrapper.innerHTML = `
            <div class="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 text-center text-xs font-bold">
                <i class="fa-solid fa-triangle-exclamation text-rose-500 text-lg mb-1 block"></i>
                Gagal memuat QR Code. Silakan coba kembali.
            </div>
        `;
    }
};

window._generateQrDataUrlSync = (url, pxSize = 560) => {
    try {
        if (window.QRCode && typeof window.QRCode.create === 'function') {
            const qr = window.QRCode.create(url, { errorCorrectionLevel: 'H' });
            const modules = qr.modules;
            const size = modules.size;
            const margin = 1;
            const total = size + margin * 2;
            const scale = Math.max(5, Math.floor(pxSize / total));
            const canvas = document.createElement('canvas');
            canvas.width = total * scale;
            canvas.height = total * scale;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    if (modules.get(r, c)) {
                        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
                    }
                }
            }
            return canvas.toDataURL('image/png');
        }
    } catch (e) {
        console.warn('Sync QR render fallback:', e);
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=${pxSize}x${pxSize}&data=${encodeURIComponent(url)}`;
};

window._cetakHtmlViaIframeQr = (title, bodyHtml) => {
    if (typeof window.eksekusiPrintA4Universal === 'function') {
        window.eksekusiPrintA4Universal({
            title: title || 'Stiker QR Meja Mainstay',
            htmlContent: bodyHtml
        });
        return;
    }

    const printSheet = document.getElementById('qr-meja-print-sheet');
    if (!printSheet) return;

    window._isPrintingNow = true;
    window._lastFocusSyncAt = Date.now();
    document.title = title || 'Stiker QR Meja Mainstay';

    printSheet.innerHTML = bodyHtml;
    document.body.classList.remove('is-printing-thermal');
    document.body.classList.add('is-printing-a4');

    let isCleaned = false;
    const onTouchOrPointerReturn = () => setTimeout(cleanup, 400);
    const cleanup = () => {
        if (isCleaned) return;
        isCleaned = true;
        document.body.classList.remove('is-printing-a4');
        window.removeEventListener('afterprint', cleanup);
        document.removeEventListener('touchstart', onTouchOrPointerReturn);
        document.removeEventListener('pointerdown', onTouchOrPointerReturn);
        setTimeout(() => {
            window._isPrintingNow = false;
            window._lastFocusSyncAt = Date.now();
        }, 1200);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(() => {
        if (!isCleaned) {
            document.addEventListener('touchstart', onTouchOrPointerReturn, { once: true, passive: true });
            document.addEventListener('pointerdown', onTouchOrPointerReturn, { once: true, passive: true });
        }
    }, 600);

    try { window.print(); } catch (e) {}
    setTimeout(cleanup, 15000);
};

window.cetakStandeeQrMeja = () => {
    const tableNo = window.qrMejaState.nomorMeja || '01';
    const targetUrl = window.getQrMejaTargetUrl(tableNo);
    const template = window.qrMejaState.template || 'mainstay_gold';
    const qrDataUrl = window._latestActiveQrMejaDataUrl || window._generateQrDataUrlSync(targetUrl, 600);

    const bodyHtml = `
        <div style="padding: 10mm; display: flex; align-items: center; justify-content: center; min-height: 92vh; background: white;">
            <div style="width: 100%; max-width: 112mm; display: flex; justify-content: center;">
                ${window.buildQrMejaCardHtml(template, tableNo, qrDataUrl, true)}
            </div>
        </div>
    `;
    window._cetakHtmlViaIframeQr(`Stiker_Meja_${tableNo}`, bodyHtml);
};

window.toggleQrBatchCustomMode = () => {
    const mode = document.getElementById('qr-batch-mode')?.value || 'range';
    const fromWrap = document.getElementById('qr-batch-from-wrap');
    const toLabel = document.getElementById('qr-batch-to-label');
    const toInput = document.getElementById('qr-batch-to');
    if (mode === 'tanpa_meja') {
        if (fromWrap) fromWrap.classList.add('opacity-40', 'pointer-events-none');
        if (toLabel) toLabel.innerText = 'Jumlah Stiker';
        if (toInput && Number(toInput.value) > 18) toInput.value = '6';
    } else {
        if (fromWrap) fromWrap.classList.remove('opacity-40', 'pointer-events-none');
        if (toLabel) toLabel.innerText = 'Sampai Meja';
    }
};

window.cetakBatchQrMejaCustom = () => {
    const mode = document.getElementById('qr-batch-mode')?.value || 'range';
    const fromVal = Math.max(1, Math.min(99, parseInt(document.getElementById('qr-batch-from')?.value || '1', 10) || 1));
    const toRaw = Math.max(1, Math.min(99, parseInt(document.getElementById('qr-batch-to')?.value || '6', 10) || 6));
    const rawCols = parseInt(document.getElementById('qr-batch-cols')?.value || window.qrMejaState.batchCols || '2', 10);
    const cols = (rawCols === 2 || rawCols === 3 || rawCols === 4) ? rawCols : 2;
    const cutlines = document.getElementById('qr-batch-cutlines') ? document.getElementById('qr-batch-cutlines').checked : true;

    if (typeof window.setQrBatchGridCols === 'function') {
        window.setQrBatchGridCols(cols);
    }

    if (mode === 'tanpa_meja') {
        const count = Math.max(1, Math.min(18, toRaw));
        window.cetakBatchQrMeja('tanpa_meja', count, { cols, cutlines });
        return;
    }

    const start = Math.min(fromVal, toRaw);
    const end = Math.min(start + 23, Math.max(fromVal, toRaw)); // Maks 24 stiker per batch agar tetap responsif
    window.cetakBatchQrMeja(start, end, { cols, cutlines });
};

window.cetakBatchQrMeja = (fromNum, toNum, options = {}) => {
    const template = window.qrMejaState.template || 'mainstay_gold';
    const isNoTableBatch = fromNum === 'tanpa_meja';
    const startNum = isNoTableBatch ? 1 : Math.max(1, Number(fromNum) || 1);
    const endNum = isNoTableBatch ? Math.max(1, Math.min(18, Number(toNum) || 4)) : Math.max(startNum, Number(toNum) || startNum);
    const totalItems = isNoTableBatch ? endNum : (endNum - startNum + 1);

    const optCols = Number(options.cols);
    const fallbackCols = Number(window.qrMejaState.batchCols) || (totalItems > 6 ? 3 : 2);
    const cols = (optCols === 2 || optCols === 3 || optCols === 4)
        ? optCols
        : ((fallbackCols === 2 || fallbackCols === 3 || fallbackCols === 4) ? fallbackCols : 2);

    window._activeQrBatchArgs = { fromNum, toNum, options: { ...options, cols } };
    if (typeof window.setQrBatchGridCols === 'function') {
        window.setQrBatchGridCols(cols, false);
    }

    const showCutlines = options.cutlines !== false;
    const perPage = cols === 4 ? 16 : (cols === 3 ? 9 : (totalItems <= 4 ? 4 : 6));
    const cardMaxWidth = cols === 4 ? '44mm' : (cols === 3 ? '60mm' : '90mm');
    const cellPad = cols === 4 ? '4px' : (cols === 3 ? '5px' : '7px');
    const gridGapPx = cols === 4 ? '8px' : (cols === 3 ? '10px' : '14px');
    const gridGapMm = cols === 4 ? '2.5mm' : (cols === 3 ? '3.2mm' : '4.2mm');
    const tableFontPt = cols === 4 ? '14pt' : (cols === 3 ? '20pt' : '26pt');
    const cardPad = cols === 4 ? '6px' : (cols === 3 ? '8px' : '10px');
    const headerPad = cols === 4 ? '3px 4px' : (cols === 3 ? '4px 5px' : '6px 8px');
    const headlinePt = cols === 4 ? '8pt' : (cols === 3 ? '10pt' : '13pt');
    const logoBoxSz = cols === 4 ? '22px' : (cols === 3 ? '28px' : '36px');
    const bodyGap = cols === 4 ? '4px' : (cols === 3 ? '6px' : '9px');
    const bodyPad = cols === 4 ? '2px 2px' : (cols === 3 ? '3px 3px' : '5px 7px');
    const qrBoxPad = cols === 4 ? '2px' : (cols === 3 ? '3px' : '4px');
    const qrTagPt = cols === 4 ? '4.8pt' : (cols === 3 ? '5.5pt' : '6.5pt');
    const stepPad = cols === 4 ? '2px 3.5px' : (cols === 3 ? '2.5px 4.5px' : '4px 6px');
    const stepGap = cols === 4 ? '3px' : (cols === 3 ? '4px' : '6px');
    const stepIconSz = cols === 4 ? '11px' : (cols === 3 ? '14px' : '17px');
    const stepIconPt = cols === 4 ? '5.5pt' : (cols === 3 ? '7pt' : '8pt');
    const badgePad = cols === 4 ? '3px 6px' : (cols === 3 ? '4px 8px' : '5px 12px');
    const badgeMinW = cols === 4 ? '44px' : (cols === 3 ? '56px' : '76px');
    const badgeLabelPt = cols === 4 ? '5.5pt' : (cols === 3 ? '6.5pt' : '7.5pt');

    const cells = [];
    if (isNoTableBatch) {
        const url = window.getQrMejaTargetUrl('Tanpa Meja');
        const qrUrl = window._generateQrDataUrlSync(url, 560);
        for (let i = 0; i < totalItems; i++) {
            cells.push(`
                <div class="qr-batch-a4-cell" style="${showCutlines ? 'border: 1.25px dashed #64748b; background: #ffffff;' : 'border: 1.25px solid #cbd5e1; background: #ffffff;'} padding: ${cellPad}; border-radius: 10px; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; align-items: stretch; justify-content: center; position: relative; box-sizing: border-box;">
                    ${showCutlines ? '<span style="position: absolute; top: 3px; right: 6px; font-size: 7px; color: #475569; font-weight: 800; z-index: 3; background: rgba(255,255,255,0.92); padding: 1px 4px; border-radius: 4px;">✂ Potong</span>' : ''}
                    <div class="qr-batch-a4-card-wrap" style="width: 100%; max-width: ${cardMaxWidth}; height: 100%; margin: 0 auto; display: flex; justify-content: center; align-items: stretch;">
                        ${window.buildQrMejaCardHtml(template, 'Tanpa Meja', qrUrl, true)}
                    </div>
                </div>
            `);
        }
    } else {
        for (let i = startNum; i <= endNum; i++) {
            const tableStr = String(i).padStart(2, '0');
            const url = window.getQrMejaTargetUrl(tableStr);
            const qrUrl = window._generateQrDataUrlSync(url, 560);
            cells.push(`
                <div class="qr-batch-a4-cell" style="${showCutlines ? 'border: 1.25px dashed #64748b; background: #ffffff;' : 'border: 1.25px solid #cbd5e1; background: #ffffff;'} padding: ${cellPad}; border-radius: 10px; break-inside: avoid; page-break-inside: avoid; display: flex; flex-direction: column; align-items: stretch; justify-content: center; position: relative; box-sizing: border-box;">
                    ${showCutlines ? '<span style="position: absolute; top: 3px; right: 6px; font-size: 7px; color: #475569; font-weight: 800; z-index: 3; background: rgba(255,255,255,0.92); padding: 1px 4px; border-radius: 4px;">✂ Potong</span>' : ''}
                    <div class="qr-batch-a4-card-wrap" style="width: 100%; max-width: ${cardMaxWidth}; height: 100%; margin: 0 auto; display: flex; justify-content: center; align-items: stretch;">
                        ${window.buildQrMejaCardHtml(template, tableStr, qrUrl, true)}
                    </div>
                </div>
            `);
        }
    }

    const pagesHtml = [];
    for (let idx = 0; idx < cells.length; idx += perPage) {
        const chunk = cells.slice(idx, idx + perPage);
        const isLast = idx + perPage >= cells.length;
        const pageNum = Math.floor(idx / perPage) + 1;
        const totalPages = Math.ceil(cells.length / perPage);
        pagesHtml.push(`
            <div class="qr-batch-a4-page" style="padding: 8px; background: #ffffff; font-family: 'Nunito', 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; ${!isLast ? 'page-break-after: always; break-after: page;' : ''}">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px;">
                    <div>
                        <h2 style="font-size: 13px; font-weight: 900; margin: 0; text-transform: uppercase; color: #0f172a;">
                            ${isNoTableBatch ? 'Lembar Batch QR Self-Order (Counter / Tembok)' : `Lembar Batch QR Meja ${String(startNum).padStart(2, '0')}–${String(endNum).padStart(2, '0')}`}
                        </h2>
                        <p style="font-size: 9px; color: #475569; margin: 2px 0 0 0;">Format CSS Print Grid A4 (${cols} Kolom • ${chunk.length} Stiker) • Margin aman printer 8mm</p>
                    </div>
                    <span style="font-size: 9.5px; font-weight: 800; color: #334155; background: #f1f5f9; padding: 3px 8px; border-radius: 6px; white-space: nowrap;">
                        Hal ${pageNum}/${totalPages}
                    </span>
                </div>
                <div class="qr-batch-a4-grid" style="--qr-grid-cols: ${cols}; display: grid; grid-template-columns: repeat(var(--qr-grid-cols, ${cols}), minmax(0, 1fr)); grid-auto-rows: 1fr; gap: ${gridGapPx}; align-items: stretch; justify-items: stretch; width: 100%; box-sizing: border-box;">
                    ${chunk.join('')}
                </div>
            </div>
        `);
    }

    const bodyHtml = `
        <style>
            .qr-batch-a4-sheet { width: 740px; min-width: 740px; max-width: 740px; margin: 0 auto; background: #ffffff; box-sizing: border-box; --qr-grid-cols: ${cols}; }
            .qr-batch-a4-page { width: 100%; box-sizing: border-box; }
            #qr-meja-print-sheet .qr-batch-a4-grid,
            .qr-batch-a4-grid {
                display: grid !important;
                grid-template-columns: repeat(var(--qr-grid-cols, ${cols}), minmax(0, 1fr)) !important;
                grid-auto-rows: 1fr !important;
                gap: ${gridGapPx} !important;
                align-items: stretch !important;
                justify-items: stretch !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            #qr-meja-print-sheet .qr-batch-a4-grid .qr-batch-a4-cell,
            .qr-batch-a4-cell {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                width: 100% !important;
                height: 100% !important;
                min-width: 0 !important;
                min-height: 0 !important;
            }
            .qr-batch-a4-card-wrap { width: 100% !important; max-width: 100% !important; height: 100% !important; min-width: 0; }
            .qr-batch-a4-sheet .qr-standee-acrylic-card,
            .qr-batch-a4-sheet .qr-card-print-mode {
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                aspect-ratio: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                height: 100% !important;
                margin: 0 !important;
                padding: ${cardPad} !important;
                border-radius: ${cols === 4 ? '10px' : '14px'} !important;
                border-width: ${cols === 4 ? '1.5px' : '2px'} !important;
                box-shadow: none !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
                justify-content: space-between !important;
            }
            .qr-batch-a4-sheet .qr-meja-card-header { padding: ${headerPad} !important; gap: ${cols === 4 ? '4px' : '6px'} !important; }
            .qr-batch-a4-sheet .qr-meja-logo-box { width: ${logoBoxSz} !important; height: ${logoBoxSz} !important; padding: ${cols === 4 ? '2px' : '4px'} !important; border-radius: ${cols === 4 ? '8px' : '10px'} !important; flex-shrink: 0 !important; }
            .qr-batch-a4-sheet .qr-meja-card-header > div:last-child img { max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; }
            .qr-batch-a4-sheet .qr-meja-headline { font-size: ${headlinePt} !important; line-height: 1.05 !important; }
            .qr-batch-a4-sheet .qr-meja-body-grid { gap: ${bodyGap} !important; padding: ${bodyPad} !important; margin: 2px 0 !important; }
            .qr-batch-a4-sheet .qr-meja-qr-box { padding: ${qrBoxPad} !important; border-radius: ${cols === 4 ? '8px' : '10px'} !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
            .qr-batch-a4-sheet .qr-meja-qr-img { width: 100% !important; height: auto !important; aspect-ratio: 1 / 1 !important; object-fit: contain !important; image-rendering: pixelated; image-rendering: crisp-edges; }
            .qr-batch-a4-sheet .qr-meja-qr-tag { font-size: ${qrTagPt} !important; margin-top: 2px !important; padding: 1.5px 4px !important; }
            .qr-batch-a4-sheet .qr-meja-step-item { padding: ${stepPad} !important; border-radius: ${cols === 4 ? '6px' : '8px'} !important; gap: ${stepGap} !important; min-width: 0 !important; }
            .qr-batch-a4-sheet .qr-meja-step-item > span:first-child { width: ${stepIconSz} !important; height: ${stepIconSz} !important; font-size: ${stepIconPt} !important; }
            .qr-batch-a4-sheet .qr-meja-step-item span { line-height: 1.1 !important; ${cols === 4 ? 'font-size: 6.5pt !important;' : ''} }
            .qr-batch-a4-sheet .qr-meja-card-footer { padding: ${headerPad} !important; gap: ${cols === 4 ? '4px' : '6px'} !important; align-items: center !important; }
            .qr-batch-a4-sheet .qr-meja-card-footer > div:first-child { overflow: hidden !important; min-width: 0 !important; }
            .qr-batch-a4-sheet .qr-meja-card-footer > div:last-child { max-width: 48% !important; flex-shrink: 0 !important; }
            .qr-batch-a4-sheet .qr-meja-table-badge {
                padding: ${badgePad} !important;
                min-width: ${badgeMinW} !important;
                border-radius: ${cols === 4 ? '8px' : '10px'} !important;
                border-width: ${cols === 4 ? '1.5px' : '2px'} !important;
                flex-shrink: 0 !important;
            }
            .qr-batch-a4-sheet .qr-meja-table-label { font-size: ${badgeLabelPt} !important; font-weight: 900 !important; letter-spacing: 0.08em !important; margin-bottom: 1px !important; line-height: 1.05 !important; }
            .qr-batch-a4-sheet .qr-meja-table-num { font-size: ${tableFontPt} !important; line-height: 0.98 !important; font-weight: 900 !important; letter-spacing: -0.02em !important; font-variant-numeric: tabular-nums !important; }
            @media print {
                @page { size: A4 portrait; margin: 8mm; }
                .qr-batch-a4-sheet { max-width: 100% !important; width: 100% !important; min-width: 0 !important; }
                .qr-batch-a4-page { padding: 0 !important; }
                #qr-meja-print-sheet .qr-batch-a4-grid,
                .qr-batch-a4-grid { display: grid !important; grid-template-columns: repeat(var(--qr-grid-cols, ${cols}), minmax(0, 1fr)) !important; grid-auto-rows: 1fr !important; gap: ${gridGapMm} !important; align-items: stretch !important; justify-items: stretch !important; }
                #qr-meja-print-sheet .qr-batch-a4-grid .qr-batch-a4-cell,
                .qr-batch-a4-cell { break-inside: avoid !important; page-break-inside: avoid !important; overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
        </style>
        <div class="qr-batch-a4-sheet">
            ${pagesHtml.join('')}
        </div>
    `;
    window._cetakHtmlViaIframeQr(
        isNoTableBatch ? 'Batch_QR_Tanpa_Meja_A4' : `Batch_QR_Meja_${String(startNum).padStart(2, '0')}_${String(endNum).padStart(2, '0')}_A4`,
        bodyHtml
    );
};

// ============================================================================
// HELPER CANVAS: LOAD GAMBAR & WRAP TEXT RAPI
// ============================================================================
const _loadCanvasImg = (src) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
});

const _drawWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) => {
    const words = String(text || '').split(/\s+/);
    let line = '';
    const lines = [];
    for (let n = 0; n < words.length; n++) {
        const testLine = line ? (line + ' ' + words[n]) : words[n];
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line);
            line = words[n];
            if (lines.length >= maxLines - 1) {
                const remaining = [line, ...words.slice(n + 1)].join(' ');
                let trimmed = remaining;
                while (ctx.measureText(trimmed + '..').width > maxWidth && trimmed.length > 4) {
                    trimmed = trimmed.slice(0, -1);
                }
                line = trimmed !== remaining ? (trimmed + '..') : remaining;
                break;
            }
        } else {
            line = testLine;
        }
    }
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((ln, idx) => {
        ctx.fillText(ln, x, y + idx * lineHeight);
    });
    return lines.length;
};

// ============================================================================
// UNDUH GAMBAR PNG HD (8 TEMA DESAIN + PALET WARNA TEREDIT)
// ============================================================================
window.unduhGambarQrMeja = async () => {
    const tableNo = window.qrMejaState.nomorMeja || '01';
    const targetUrl = window.getQrMejaTargetUrl(tableNo);
    const template = window.qrMejaState.template || 'mainstay_gold';
    const c = window.getQrMejaActiveColors(template);
    const s = window.storeSettings || {};
    const storeTitle = (window.qrMejaState.storeTitle || s.store_title || 'Mainstay Drink').toUpperCase();
    const storeLogoSrc = s.receipt_logo || s.store_logo || 'logo-192.png';
    const branchName = (window.qrMejaState.namaCabang || 'Cabang Sampangan - Menoreh').toUpperCase();
    const headline = window.qrMejaState.headline || 'PESAN DI SINI';
    const subHeadline = window.qrMejaState.subHeadline || 'TANPA ANTRI';
    const isNoTable = window.isQrMejaNoTable(tableNo);
    const noticeText = window.qrMejaState.noticeText || (isNoTable
        ? 'Scan dari HP Anda • Ambil pesanan di kasir/counter saat dipanggil'
        : 'Apabila sudah order MOHON UNTUK TIDAK PINDAH MEJA');
    const displayTableNumber = isNoTable ? '' : String(tableNo).replace(/^meja\s*/i, '').trim();
    const step3Title = isNoTable ? '3. AMBIL' : '3. DIANTAR';
    const step3Desc = isNoTable ? 'Pesanan di Counter' : 'Langsung ke Meja';

    try {
        if (typeof window.tampilkanNotifikasi === 'function') {
            window.tampilkanNotifikasi("Merender gambar HD stiker meja...", "info");
        }

        const qrDataUrl = await window.QRCode.toDataURL(targetUrl, {
            width: 800,
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        const [qrImg, logoImgRaw] = await Promise.all([
            _loadCanvasImg(qrDataUrl),
            _loadCanvasImg(storeLogoSrc)
        ]);
        const logoImg = logoImgRaw || await _loadCanvasImg('/logo-192.png');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // --------------------------------------------------------------------
        // TEMA 3: TENT CARD PORTRAIT (1000 x 1340)
        // --------------------------------------------------------------------
        if (template === 'waroeng_yellow') {
            canvas.width = 1000;
            canvas.height = 1340;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1000, 1340, 64); ctx.fill();
            ctx.lineWidth = 16; ctx.strokeStyle = c.primary; ctx.stroke();

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(0, 0, 1000, 130, [64, 64, 0, 0]); ctx.fill();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(45, 22, 86, 86, 20); ctx.fill();
                ctx.drawImage(logoImg, 53, 30, 70, 70);
            }
            ctx.textAlign = 'left';
            ctx.fillStyle = c.onPrimary;
            ctx.font = '900 30px Nunito, sans-serif';
            ctx.fillText(storeTitle, 152, 76);

            ctx.font = '900 26px Nunito, sans-serif';
            const subW = Math.max(210, ctx.measureText(subHeadline).width + 48);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(955 - subW, 35, subW, 60, 14); ctx.fill();
            ctx.fillStyle = c.onAccent;
            ctx.textAlign = 'center';
            ctx.fillText(subHeadline, 955 - subW / 2, 75);

            ctx.textAlign = 'center';
            ctx.fillStyle = c.ink;
            ctx.font = '900 66px Nunito, sans-serif';
            ctx.fillText(headline, 500, 225);
            ctx.font = '900 26px Nunito, sans-serif';
            ctx.fillText(`📍 ${branchName}`, 500, 275);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(225, 315, 550, 620, 36); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = c.primary; ctx.stroke();

            if (qrImg) ctx.drawImage(qrImg, 255, 340, 490, 490);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(255, 845, 490, 62, 16); ctx.fill();
            ctx.fillStyle = c.onAccent;
            ctx.font = '900 30px Nunito, sans-serif';
            ctx.fillText('SCAN DI SINI', 500, 886);

            const hSteps = [
                { num: '1', t: 'SCAN', d: 'Kamera HP' },
                { num: '2', t: 'BAYAR', d: 'QRIS / Kasir' },
                { num: '3', t: isNoTable ? 'AMBIL' : 'DIANTAR', d: isNoTable ? 'Di Counter' : 'Ke Meja' }
            ];
            hSteps.forEach((st, idx) => {
                const bx = 48 + idx * 308;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(bx, 975, 288, 145, 24); ctx.fill();
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.arc(bx + 144, 1018, 24, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = c.onPrimary;
                ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(st.num, bx + 144, 1027);
                ctx.fillStyle = '#0f172a';
                ctx.font = '900 28px Nunito, sans-serif';
                ctx.fillText(st.t, bx + 144, 1074);
                ctx.fillStyle = '#475569';
                ctx.font = '700 20px Nunito, sans-serif';
                ctx.fillText(st.d, bx + 144, 1104);
            });

            const footBg = c.isDarkBg ? _mixHex(c.bg, '#000000', 0.25) : _mixHex(c.bg, '#ffffff', 0.35);
            const onFoot = _contrastOn(footBg);
            ctx.fillStyle = footBg;
            ctx.beginPath(); ctx.roundRect(0, 1150, 1000, 190, [0, 0, 64, 64]); ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(48, 1178, 120, 42, 10); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = c.primary; ctx.stroke();
            ctx.fillStyle = '#0f172a';
            ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 108, 1208);

            ctx.textAlign = 'left'; ctx.fillStyle = onFoot;
            ctx.font = '900 24px Nunito, sans-serif';
            ctx.fillText('CASH & NON-TUNAI', 184, 1208);
            ctx.font = '800 24px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 48, 1255, isNoTable ? 900 : 620, 32, 2);

            if (!isNoTable) {
                ctx.textAlign = 'right'; ctx.fillStyle = onFoot;
                ctx.font = '900 22px Nunito, sans-serif';
                ctx.fillText('NOMOR MEJA', 950, 1200);
                ctx.font = '900 104px Nunito, sans-serif';
                ctx.fillText(displayTableNumber, 950, 1300);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 2: VIBRANT RIBBON (1200 x 1200)
        // --------------------------------------------------------------------
        else if (template === 'gacoan_cyan') {
            canvas.width = 1200;
            canvas.height = 1200;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1200, 1200, 72); ctx.fill();
            ctx.lineWidth = 16; ctx.strokeStyle = c.primary; ctx.stroke();

            const gradTop = ctx.createLinearGradient(0, 0, 1200, 0);
            gradTop.addColorStop(0, c.primary);
            gradTop.addColorStop(1, _mixHex(c.primary, '#000000', 0.16));
            ctx.fillStyle = gradTop;
            ctx.beginPath(); ctx.roundRect(0, 0, 1200, 265, [72, 72, 0, 0]); ctx.fill();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(105, 86, 48, 0, Math.PI * 2); ctx.fill();
                ctx.drawImage(logoImg, 67, 48, 76, 76);
            }
            ctx.textAlign = 'left'; ctx.fillStyle = c.onPrimary;
            ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText(storeTitle, 174, 78);
            ctx.font = '800 24px Nunito, sans-serif'; ctx.fillText(`📍 ${branchName}`, 174, 114);

            ctx.font = '900 32px Nunito, sans-serif';
            const pillW = Math.max(250, ctx.measureText(subHeadline).width + 64);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(1140 - pillW, 44, pillW, 76, 38); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            ctx.fillStyle = c.onAccent; ctx.textAlign = 'center';
            ctx.fillText(subHeadline, 1140 - pillW / 2, 93);

            ctx.font = '900 72px Nunito, sans-serif';
            ctx.lineWidth = 8; ctx.strokeStyle = c.accent; ctx.strokeText(headline, 600, 222);
            ctx.fillStyle = c.onPrimary; ctx.fillText(headline, 600, 222);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(65, 310, 520, 585, 36); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = c.accent; ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 95, 335, 460, 460);

            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(90, 815, 470, 56, 16); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(branchName.length > 28 ? branchName.substring(0, 26) + '..' : branchName, 325, 852);

            [
                { num: '1', t: 'SCAN', d: 'QR Code Menu' },
                { num: '2', t: 'BAYAR', d: 'QRIS / Kasir' },
                { num: '3', t: step3Title.replace('3. ', ''), d: step3Desc }
            ].forEach((st, idx) => {
                const y = 340 + idx * 175;
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(625, y, 575, 138, [69, 0, 0, 69]); ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(694, y + 69, 40, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = c.primary; ctx.font = '900 38px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(st.num, 694, y + 82);
                ctx.textAlign = 'left'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 38px Nunito, sans-serif'; ctx.fillText(st.t, 760, y + 62);
                ctx.font = '700 26px Nunito, sans-serif'; ctx.fillText(st.d, 760, y + 102);
            });

            const dockBg = c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : '#ffffff';
            const onDock = _contrastOn(dockBg);
            ctx.fillStyle = dockBg;
            ctx.beginPath(); ctx.roundRect(0, 945, 1200, 255, [0, 0, 72, 72]); ctx.fill();
            ctx.fillStyle = _hexAlpha(c.primary, 0.25); ctx.fillRect(0, 945, 1200, 4);

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(65, 985, 130, 48, 12); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 130, 1018);

            ctx.textAlign = 'left'; ctx.fillStyle = c.primary;
            ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText('PEMBAYARAN INSTAN', 215, 1018);
            ctx.fillStyle = onDock; ctx.font = '800 28px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 65, 1075, isNoTable ? 830 : 750, 38, 2);

            if (!isNoTable) {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(855, 975, 280, 190, 32); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 28px Nunito, sans-serif'; ctx.fillText('MEJA NO.', 995, 1025);
                ctx.font = '900 105px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 995, 1135);
            } else {
                ctx.fillStyle = c.primarySoft;
                ctx.beginPath(); ctx.roundRect(920, 1005, 215, 96, 24); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.primary;
                ctx.font = '900 28px Nunito, sans-serif'; ctx.fillText('SELF-ORDER', 1027, 1063);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 4: SPINE TIMELINE (1200 x 1200)
        // --------------------------------------------------------------------
        else if (template === 'magenta_white') {
            canvas.width = 1200;
            canvas.height = 1200;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1200, 1200, 72); ctx.fill();
            ctx.lineWidth = 10; ctx.strokeStyle = _hexAlpha(c.primary, 0.35); ctx.stroke();

            const spineGrad = ctx.createLinearGradient(0, 0, 0, 1200);
            spineGrad.addColorStop(0, c.primary);
            spineGrad.addColorStop(1, c.accent);
            ctx.fillStyle = spineGrad;
            ctx.beginPath(); ctx.roundRect(0, 0, 56, 1200, [72, 0, 0, 72]); ctx.fill();

            const hdrBg = c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : _mixHex(c.primary, '#ffffff', 0.92);
            ctx.fillStyle = hdrBg;
            ctx.beginPath(); ctx.roundRect(96, 48, 1052, 165, 32); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = _hexAlpha(c.primary, 0.3); ctx.stroke();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(124, 72, 116, 116, 24); ctx.fill();
                ctx.drawImage(logoImg, 134, 82, 96, 96);
            }

            ctx.textAlign = 'left'; ctx.fillStyle = c.primary;
            ctx.font = '900 54px Nunito, sans-serif'; ctx.fillText(headline, 266, 125);
            ctx.fillStyle = c.ink; ctx.font = '800 26px Nunito, sans-serif'; ctx.fillText(branchName, 266, 170);

            ctx.font = '900 28px Nunito, sans-serif';
            const subPillW = Math.max(220, ctx.measureText(subHeadline).width + 44);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(1120 - subPillW, 92, subPillW, 74, 18); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.textAlign = 'center';
            ctx.fillText(subHeadline, 1120 - subPillW / 2, 139);

            ctx.strokeStyle = _hexAlpha(c.primary, 0.3); ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(154, 340); ctx.lineTo(154, 760); ctx.stroke();

            [
                { num: '1', bg: c.primary, fg: c.onPrimary, t: 'SCAN', d: 'Kamera HP / QR' },
                { num: '2', bg: c.accent, fg: c.onAccent, t: 'BAYAR', d: 'QRIS / Kasir' },
                { num: '3', bg: c.ink, fg: _contrastOn(c.ink), t: step3Title.replace('3. ', ''), d: step3Desc }
            ].forEach((st, idx) => {
                const cy = 340 + idx * 210;
                ctx.fillStyle = st.bg;
                ctx.beginPath(); ctx.arc(154, cy, 44, 0, Math.PI * 2); ctx.fill();
                ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke();
                ctx.fillStyle = st.fg; ctx.font = '900 38px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(st.num, 154, cy + 13);
                ctx.textAlign = 'left'; ctx.fillStyle = c.ink;
                ctx.font = '900 40px Nunito, sans-serif'; ctx.fillText(st.t, 224, cy - 2);
                ctx.font = '700 26px Nunito, sans-serif'; ctx.fillText(st.d, 224, cy + 38);
            });

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(575, 260, 565, 610, 36); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = _hexAlpha(c.primary, 0.45); ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 615, 290, 485, 485);

            const barGrad = ctx.createLinearGradient(600, 0, 1110, 0);
            barGrad.addColorStop(0, c.primary);
            barGrad.addColorStop(1, c.accent);
            ctx.fillStyle = barGrad;
            ctx.beginPath(); ctx.roundRect(605, 795, 505, 52, 14); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(storeTitle, 857, 830);

            ctx.setLineDash([12, 10]); ctx.strokeStyle = _hexAlpha(c.primary, 0.35); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(96, 920); ctx.lineTo(1148, 920); ctx.stroke(); ctx.setLineDash([]);

            ctx.fillStyle = hdrBg;
            ctx.beginPath(); ctx.roundRect(96, 960, 130, 48, 12); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = c.primary; ctx.stroke();
            ctx.fillStyle = c.primary; ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 161, 993);

            ctx.textAlign = 'left'; ctx.fillStyle = c.ink;
            ctx.font = '800 24px Nunito, sans-serif'; ctx.fillText('SCAN & PESAN LANGSUNG', 244, 993);
            ctx.font = '800 28px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 96, 1055, isNoTable ? 760 : 680, 38, 2);

            if (!isNoTable) {
                ctx.fillStyle = hdrBg;
                ctx.beginPath(); ctx.roundRect(840, 955, 308, 195, 28); ctx.fill();
                ctx.lineWidth = 6; ctx.strokeStyle = c.primary; ctx.stroke();
                ctx.textAlign = 'center'; ctx.fillStyle = c.primary;
                ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText('NO. MEJA', 994, 1005);
                ctx.fillStyle = c.ink;
                ctx.font = '900 105px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 994, 1118);
            } else {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(910, 985, 238, 96, 24); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 28px Nunito, sans-serif'; ctx.fillText('COUNTER', 1029, 1043);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 5: CAFE ARCH (1000 x 1340)
        // --------------------------------------------------------------------
        else if (template === 'emerald_arch') {
            canvas.width = 1000;
            canvas.height = 1340;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1000, 1340, 72); ctx.fill();
            ctx.lineWidth = 16; ctx.strokeStyle = c.primary; ctx.stroke();

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(45, 45, 910, 225, [56, 56, 24, 24]); ctx.fill();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.arc(330, 95, 32, 0, Math.PI * 2); ctx.fill();
                ctx.drawImage(logoImg, 306, 71, 48, 48);
            }
            ctx.textAlign = 'left'; ctx.fillStyle = c.onPrimary;
            ctx.font = '900 28px Nunito, sans-serif'; ctx.fillText(storeTitle, 380, 105);

            ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
            ctx.font = '900 62px Nunito, sans-serif'; ctx.fillText(headline, 500, 185);

            ctx.font = '900 22px Nunito, sans-serif';
            const pillTxt = `${subHeadline} • ${branchName}`;
            const pW = Math.min(820, ctx.measureText(pillTxt).width + 56);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(500 - pW / 2, 205, pW, 44, 22); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.fillText(pillTxt, 500, 234);

            // Arch QR Container
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(210, 315, 580, 610, [240, 240, 36, 36]); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = c.accent; ctx.stroke();
            ctx.fillStyle = c.primary; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('MENU SELF-ORDER', 500, 385);
            if (qrImg) ctx.drawImage(qrImg, 250, 405, 500, 500);

            // 3 Capsule Steps
            ['1. SCAN', '2. BAYAR', step3Title].forEach((lbl, idx) => {
                const sx = 50 + idx * 308;
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(sx, 970, 284, 72, 36); ctx.fill();
                ctx.fillStyle = c.onPrimary; ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(lbl, sx + 142, 1015);
            });

            const dockBg = c.isDarkBg ? _mixHex(c.bg, '#ffffff', 0.08) : '#ffffff';
            const onDock = _contrastOn(dockBg);
            ctx.fillStyle = dockBg;
            ctx.beginPath(); ctx.roundRect(45, 1085, 910, 200, 32); ctx.fill();
            ctx.lineWidth = 3; ctx.strokeStyle = _hexAlpha(c.primary, 0.25); ctx.stroke();

            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(75, 1115, 195, 42, 10); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.font = '900 22px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS & TUNAI', 172, 1143);

            ctx.textAlign = 'left'; ctx.fillStyle = onDock; ctx.font = '800 24px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 75, 1190, isNoTable ? 680 : 600, 32, 2);

            if (!isNoTable) {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(720, 1110, 205, 150, 28); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 22px Nunito, sans-serif'; ctx.fillText('MEJA', 822, 1150);
                ctx.font = '900 84px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 822, 1236);
            } else {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(720, 1145, 205, 80, 24); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText('COUNTER', 822, 1194);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 6: DARK NEON (1200 x 1200)
        // --------------------------------------------------------------------
        else if (template === 'neon_dark') {
            canvas.width = 1200;
            canvas.height = 1200;
            const panelBg = _mixHex(c.bg, '#ffffff', 0.08);

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1200, 1200, 72); ctx.fill();
            ctx.lineWidth = 14; ctx.strokeStyle = c.primary; ctx.stroke();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(65, 55, 112, 112, 24); ctx.fill();
                ctx.lineWidth = 4; ctx.strokeStyle = c.primary; ctx.stroke();
                ctx.drawImage(logoImg, 77, 67, 88, 88);
            }
            ctx.textAlign = 'left'; ctx.fillStyle = c.primary;
            ctx.font = '900 54px Nunito, sans-serif'; ctx.fillText(headline, 200, 108);
            ctx.fillStyle = c.ink; ctx.font = '800 24px Nunito, sans-serif'; ctx.fillText(branchName, 200, 152);

            ctx.font = '900 28px Nunito, sans-serif';
            const pw = Math.max(210, ctx.measureText(subHeadline).width + 44);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(1135 - pw, 68, pw, 68, 18); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.textAlign = 'center';
            ctx.fillText(subHeadline, 1135 - pw / 2, 112);

            ctx.strokeStyle = _hexAlpha(c.primary, 0.4); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(65, 200); ctx.lineTo(1135, 200); ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(65, 240, 520, 595, 36); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = c.primary; ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 95, 265, 460, 460);
            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(95, 745, 460, 58, 29); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.font = '900 24px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(storeTitle, 325, 783);

            [
                { num: '01', t: 'SCAN QR', d: 'Buka Kamera HP' },
                { num: '02', t: 'PILIH & BAYAR', d: 'QRIS / Tunai' },
                { num: '03', t: step3Title.replace('3. ', ''), d: step3Desc }
            ].forEach((st, idx) => {
                const y = 250 + idx * 195;
                ctx.fillStyle = panelBg;
                ctx.beginPath(); ctx.roundRect(625, y, 510, 160, 28); ctx.fill();
                ctx.lineWidth = 3; ctx.strokeStyle = _hexAlpha(c.primary, 0.45); ctx.stroke();
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(655, y + 38, 84, 84, 20); ctx.fill();
                ctx.fillStyle = c.onAccent; ctx.font = '900 34px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(st.num, 697, y + 92);
                ctx.textAlign = 'left'; ctx.fillStyle = c.ink;
                ctx.font = '900 34px Nunito, sans-serif'; ctx.fillText(st.t, 765, y + 72);
                ctx.font = '700 24px Nunito, sans-serif'; ctx.fillText(st.d, 765, y + 114);
            });

            ctx.strokeStyle = _hexAlpha(c.primary, 0.4); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(65, 875); ctx.lineTo(1135, 875); ctx.stroke();

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(65, 915, 130, 48, 12); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 130, 948);
            ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '900 24px Nunito, sans-serif';
            ctx.fillText('INSTANT ORDER', 214, 948);
            ctx.font = '800 28px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 65, 1005, isNoTable ? 830 : 720, 38, 2);

            if (!isNoTable) {
                ctx.fillStyle = panelBg;
                ctx.beginPath(); ctx.roundRect(830, 910, 305, 225, 32); ctx.fill();
                ctx.lineWidth = 6; ctx.strokeStyle = c.accent; ctx.stroke();
                ctx.textAlign = 'center'; ctx.fillStyle = c.accent;
                ctx.font = '900 28px Nunito, sans-serif'; ctx.fillText('MEJA', 982, 965);
                ctx.fillStyle = c.ink;
                ctx.font = '900 112px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 982, 1090);
            } else {
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(890, 965, 245, 100, 24); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText('EXPRESS', 1012, 1025);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 7: RETRO TICKET (1000 x 1340)
        // --------------------------------------------------------------------
        else if (template === 'retro_badge') {
            canvas.width = 1000;
            canvas.height = 1340;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1000, 1340, 56); ctx.fill();
            ctx.lineWidth = 14; ctx.strokeStyle = c.primary; ctx.stroke();

            ctx.setLineDash([14, 10]); ctx.lineWidth = 5; ctx.strokeStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(36, 36, 928, 1268, 38); ctx.stroke();
            ctx.setLineDash([]);

            if (logoImg) {
                ctx.drawImage(logoImg, 340, 68, 64, 64);
            }
            ctx.textAlign = 'left'; ctx.fillStyle = c.primary;
            ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText(storeTitle, 420, 110);

            ctx.textAlign = 'center'; ctx.fillStyle = c.ink;
            ctx.font = '900 66px Nunito, sans-serif'; ctx.fillText(headline, 500, 200);

            ctx.font = '900 24px Nunito, sans-serif';
            const rtW = Math.min(820, ctx.measureText(`${subHeadline} • ${branchName}`).width + 52);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(500 - rtW / 2, 224, rtW, 50, 14); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.fillText(`${subHeadline} • ${branchName}`, 500, 258);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(225, 315, 550, 550, 32); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = c.primary; ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 255, 345, 490, 490);

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(72, 910, 856, 120, 24); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.textAlign = 'center';
            ctx.font = '900 28px Nunito, sans-serif';
            ctx.fillText('1. SCAN QR', 215, 962);
            ctx.fillText('2. BAYAR', 500, 962);
            ctx.fillText(step3Title, 785, 962);
            ctx.font = '700 20px Nunito, sans-serif';
            ctx.fillText('Kamera HP', 215, 998);
            ctx.fillText('QRIS / Kasir', 500, 998);
            ctx.fillText(isNoTable ? 'Di Counter' : 'Ke Meja', 785, 998);

            ctx.setLineDash([12, 10]); ctx.strokeStyle = _hexAlpha(c.primary, 0.45); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(72, 1075); ctx.lineTo(928, 1075); ctx.stroke(); ctx.setLineDash([]);

            ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '800 26px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 72, 1138, isNoTable ? 620 : 580, 36, 3);

            if (!isNoTable) {
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(690, 1100, 238, 170, 24); ctx.fill();
                ctx.lineWidth = 5; ctx.strokeStyle = c.ink; ctx.stroke();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 24px Nunito, sans-serif'; ctx.fillText('MEJA', 809, 1142);
                ctx.font = '900 92px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 809, 1236);
            } else {
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(700, 1135, 228, 90, 20); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText('KASIR', 814, 1190);
            }
        }
        // --------------------------------------------------------------------
        // TEMA 8: SPLIT DUAL-PANEL (1400 x 1050 LANDSCAPE 4:3)
        // --------------------------------------------------------------------
        else if (template === 'split_dual') {
            canvas.width = 1400;
            canvas.height = 1050;

            ctx.fillStyle = c.bg;
            ctx.beginPath(); ctx.roundRect(0, 0, 1400, 1050, 64); ctx.fill();
            ctx.lineWidth = 10; ctx.strokeStyle = c.primary; ctx.stroke();

            // Left Panel
            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(0, 0, 630, 1050, [64, 0, 0, 64]); ctx.fill();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(56, 56, 116, 116, 26); ctx.fill();
                ctx.drawImage(logoImg, 68, 68, 92, 92);
            }
            ctx.textAlign = 'left'; ctx.fillStyle = c.onPrimary;
            ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText(storeTitle, 192, 124);

            ctx.font = '900 26px Nunito, sans-serif';
            const pw = Math.max(210, ctx.measureText(subHeadline).width + 44);
            ctx.fillStyle = c.accent;
            ctx.beginPath(); ctx.roundRect(56, 220, pw, 54, 14); ctx.fill();
            ctx.fillStyle = c.onAccent; ctx.textAlign = 'center';
            ctx.fillText(subHeadline, 56 + pw / 2, 256);

            ctx.textAlign = 'left'; ctx.fillStyle = c.onPrimary;
            ctx.font = '900 62px Nunito, sans-serif';
            _drawWrappedText(ctx, headline, 56, 345, 520, 72, 2);
            ctx.font = '800 26px Nunito, sans-serif';
            _drawWrappedText(ctx, `📍 ${branchName}`, 56, 480, 520, 34, 2);

            if (!isNoTable) {
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(56, 680, 518, 290, 38); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 32px Nunito, sans-serif'; ctx.fillText('NOMOR MEJA', 315, 745);
                ctx.font = '900 148px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 315, 912);
            } else {
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.roundRect(56, 760, 518, 120, 28); ctx.fill();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onAccent;
                ctx.font = '900 36px Nunito, sans-serif'; ctx.fillText('COUNTER ORDER', 315, 833);
            }

            // Right Panel QR & Notice
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(735, 65, 570, 570, 36); ctx.fill();
            ctx.lineWidth = 6; ctx.strokeStyle = _hexAlpha(c.primary, 0.35); ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 770, 100, 500, 500);

            ctx.fillStyle = _hexAlpha(c.primary, 0.1);
            ctx.beginPath(); ctx.roundRect(700, 680, 640, 76, 18); ctx.fill();
            ctx.fillStyle = c.ink; ctx.textAlign = 'center';
            ctx.font = '900 28px Nunito, sans-serif';
            ctx.fillText(`1. SCAN  •  2. BAYAR  •  ${step3Title}`, 1020, 728);

            ctx.strokeStyle = _hexAlpha(c.primary, 0.25); ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(700, 800); ctx.lineTo(1340, 800); ctx.stroke();

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(700, 845, 130, 52, 12); ctx.fill();
            ctx.fillStyle = c.onPrimary; ctx.font = '900 26px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 765, 880);

            ctx.textAlign = 'left'; ctx.fillStyle = c.ink; ctx.font = '800 26px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 855, 868, 485, 36, 3);
        }
        // --------------------------------------------------------------------
        // TEMA 1: CLASSIC ACRYLIC (1200 x 1200)
        // --------------------------------------------------------------------
        else {
            canvas.width = 1200;
            canvas.height = 1200;

            const grad = ctx.createLinearGradient(0, 0, 1200, 1200);
            grad.addColorStop(0, c.bgLight);
            grad.addColorStop(0.5, c.bg);
            grad.addColorStop(1, c.bgDark);
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.roundRect(0, 0, 1200, 1200, 76); ctx.fill();
            ctx.lineWidth = 16; ctx.strokeStyle = c.accent; ctx.stroke();

            if (logoImg) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath(); ctx.roundRect(985, 58, 145, 145, 32); ctx.fill();
                ctx.lineWidth = 4; ctx.strokeStyle = c.accent; ctx.stroke();
                ctx.drawImage(logoImg, 1003, 76, 109, 109);
            }

            ctx.textAlign = 'left'; ctx.fillStyle = c.onBg;
            ctx.font = '900 62px Nunito, sans-serif'; ctx.fillText(headline, 72, 128);
            const headW = ctx.measureText(headline).width;

            ctx.font = '900 32px Nunito, sans-serif';
            const pillW = Math.min(340, Math.max(220, ctx.measureText(subHeadline).width + 44));
            const pillX = Math.min(955 - pillW, 72 + headW + 24);
            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(pillX, 74, pillW, 68, 18); ctx.fill();
            ctx.fillStyle = c.accent; ctx.textAlign = 'center';
            ctx.fillText(subHeadline, pillX + pillW / 2, 119);

            ctx.textAlign = 'left'; ctx.fillStyle = c.ink;
            ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText(`📍 ${branchName}`, 72, 192);

            ctx.strokeStyle = _hexAlpha(c.ink, 0.15); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(72, 225); ctx.lineTo(1128, 225); ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(72, 260, 495, 540, 36); ctx.fill();
            ctx.lineWidth = 4; ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
            if (qrImg) ctx.drawImage(qrImg, 100, 285, 439, 439);

            ctx.fillStyle = c.primary;
            ctx.beginPath(); ctx.roundRect(96, 738, 447, 46, 12); ctx.fill();
            ctx.fillStyle = c.accent; ctx.font = '900 22px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(branchName.length > 26 ? branchName.substring(0, 24) + '..' : branchName, 319, 769);

            const stepTitles = ['1. SCAN', '2. BAYAR', step3Title];
            const stepDescs = ['Kamera HP / QR', 'QRIS / Kasir', step3Desc];
            for (let i = 0; i < 3; i++) {
                const y = 278 + i * 172;
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(605, y, 523, 142, 28); ctx.fill();
                ctx.fillStyle = c.accent;
                ctx.beginPath(); ctx.arc(672, y + 71, 36, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = c.onAccent; ctx.font = '900 36px Nunito, sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(String(i + 1), 672, y + 84);
                ctx.textAlign = 'left'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 36px Nunito, sans-serif'; ctx.fillText(stepTitles[i], 732, y + 64);
                ctx.font = '700 25px Nunito, sans-serif'; ctx.fillText(stepDescs[i], 732, y + 104);
            }

            ctx.strokeStyle = _hexAlpha(c.ink, 0.15); ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(72, 845); ctx.lineTo(1128, 845); ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.roundRect(72, 880, 145, 52, 12); ctx.fill();
            ctx.fillStyle = '#0f172a'; ctx.font = '900 28px Nunito, sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('QRIS', 144, 916);

            ctx.textAlign = 'left'; ctx.fillStyle = c.ink;
            ctx.font = '900 26px Nunito, sans-serif'; ctx.fillText('SEMUA PEMBAYARAN', 235, 916);
            ctx.font = '900 28px Nunito, sans-serif';
            _drawWrappedText(ctx, noticeText, 72, 982, isNoTable ? 760 : 690, 40, 3);

            if (!isNoTable) {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(805, 875, 323, 255, 36); ctx.fill();
                ctx.lineWidth = 6; ctx.strokeStyle = c.accent; ctx.stroke();
                ctx.textAlign = 'center'; ctx.fillStyle = c.onPrimary;
                ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText('NO. MEJA', 966, 932);
                ctx.fillStyle = c.accent;
                ctx.font = '900 124px Nunito, sans-serif'; ctx.fillText(displayTableNumber, 966, 1072);
            } else {
                ctx.fillStyle = c.primary;
                ctx.beginPath(); ctx.roundRect(885, 915, 243, 108, 28); ctx.fill();
                ctx.lineWidth = 4; ctx.strokeStyle = c.accent; ctx.stroke();
                ctx.textAlign = 'center'; ctx.fillStyle = c.accent;
                ctx.font = '900 30px Nunito, sans-serif'; ctx.fillText('COUNTER', 1006, 980);
            }
        }

        const link = document.createElement('a');
        const fileSuffix = isNoTable ? `SelfOrder_TanpaMeja_${template}` : `Stiker_Meja_${tableNo}_${template}`;
        link.download = `Mainstay_${fileSuffix}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        if (typeof window.tampilkanNotifikasi === 'function') {
            window.tampilkanNotifikasi(`Gambar stiker HD ${isNoTable ? 'Self-Order' : `Meja ${tableNo}`} berhasil diunduh!`, "success");
        }
    } catch (e) {
        console.error("Gagal unduh QR:", e);
        if (typeof window.tampilkanNotifikasi === 'function') {
            window.tampilkanNotifikasi("Gagal mengunduh gambar stiker.", "error");
        }
    }
};

window.salinUrlQrMeja = () => {
    const tableNo = window.qrMejaState.nomorMeja || '01';
    const targetUrl = window.getQrMejaTargetUrl(tableNo);
    const isNoTable = window.isQrMejaNoTable(tableNo);

    navigator.clipboard?.writeText(targetUrl).then(() => {
        if (typeof window.tampilkanNotifikasi === 'function') {
            window.tampilkanNotifikasi(isNoTable ? "Link Self-Order berhasil disalin!" : `Link Meja ${tableNo} berhasil disalin!`, "success");
        }
    }).catch(() => {
        const inp = document.createElement('input');
        inp.value = targetUrl;
        document.body.appendChild(inp);
        inp.select();
        document.execCommand('copy');
        inp.remove();
        if (typeof window.tampilkanNotifikasi === 'function') {
            window.tampilkanNotifikasi("Link berhasil disalin!", "success");
        }
    });
};

window.bukaTestPelangganMeja = () => {
    const tableNo = window.qrMejaState.nomorMeja || '01';
    const targetUrl = window.getQrMejaTargetUrl(tableNo);
    const link = document.createElement('a');
    link.href = targetUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
};
