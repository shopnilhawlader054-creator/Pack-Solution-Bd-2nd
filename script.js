// ============================================================
// Packsolution Order System — Single Total Discount + Unlimited Qty
// Inside Dhaka = ৳80, Outside Dhaka = ৳130, +৳20 per extra kg
// One discount input (#total-discount) is subtracted from the products subtotal.
// ============================================================

const WHATSAPP_NUMBER = "8801629370622";
const DELIVERY_CHARGE = { "Inside Dhaka": 80, "Outside Dhaka": 130 };
const WEIGHT_CHARGE_PER_KG = 20;

const money = n => '৳' + (+Number(n).toFixed(2));

// ---------- helpers ----------
const getUnitPrice = opt => parseFloat(opt.getAttribute('data-unit-price')) || 0;

function getMin(opt) {
    const inp = opt.querySelector('.quantity-box input[type="number"]');
    return (inp && parseInt(inp.getAttribute('min'), 10)) || parseInt(opt.getAttribute('data-min'), 10) || 1;
}

// ---------- 1. toggle card ----------
function toggleCard(header) {
    const body = header.closest('.product-card')?.querySelector('.card-body-content');
    if (!body) return;
    const hidden = body.classList.toggle('hidden');
    header.setAttribute('aria-expanded', hidden ? 'false' : 'true');
}

function handleImageUpload(event, input) {
    if (event) event.stopPropagation();
    const card = input.closest('.product-card');
    if (!card) return;
    const f = input.files[0];
    if (f) card.dataset.uploadedFileName = f.name; else delete card.dataset.uploadedFileName;
    updateStickySummary();
}

// ---------- 2. select / deselect size ----------
function selectSizeOption(opt, unitPrice) {
    const card = opt.closest('.product-card');
    const qtyBox = opt.querySelector('.quantity-box');
    const radio = opt.querySelector('.custom-radio');

    if (unitPrice !== undefined) opt.setAttribute('data-unit-price', unitPrice);

    if (opt.classList.contains('border-blue-500')) {
        opt.classList.remove('border-blue-500', 'bg-blue-50/30');
        opt.classList.add('border-slate-200', 'bg-white');
        if (radio) {
            radio.classList.remove('bg-blue-600', 'border-blue-600');
            radio.classList.add('bg-white', 'border-slate-300');
            radio.innerText = '';
        }
        if (qtyBox) qtyBox.classList.add('hidden');
        resetColorSelection(opt);
    } else {
        opt.classList.remove('border-slate-200', 'bg-white');
        opt.classList.add('border-blue-500', 'bg-blue-50/30');
        if (radio) {
            radio.classList.remove('bg-white', 'border-slate-300');
            radio.classList.add('bg-blue-600', 'border-blue-600');
            radio.innerText = '✓';
        }
        if (qtyBox) qtyBox.classList.remove('hidden');

        const qtyInput = opt.querySelector('.quantity-box input[type="number"]');
        const minQty = getMin(opt);
        let val = qtyInput ? parseInt(qtyInput.value, 10) : minQty;
        if (isNaN(val) || val < minQty) val = minQty;
        if (qtyInput) { qtyInput.value = val; qtyInput.setAttribute('min', minQty); }

        updateItemCalculations(opt, val);
        autoSelectDefaultColor(opt);
    }
    updateCardCheckmark(card);
    updateStickySummary();
}

function updateCardCheckmark(card) {
    const icon = card && card.querySelector('.icon-circle');
    if (!icon) return;
    const any = card.querySelectorAll('.size-option.border-blue-500').length > 0;
    icon.classList.toggle('bg-emerald-500', any);
    icon.classList.toggle('border-emerald-500', any);
    icon.classList.toggle('bg-white', !any);
    icon.classList.toggle('border-slate-300', !any);
    icon.innerText = any ? '✓' : '';
}

// ---------- 3. quantity (+ / - / typing) — NO maximum ----------
function changeQuantity(event, btn, step) {
    if (event) event.stopPropagation();
    const opt = btn.closest('.size-option');
    const input = opt.querySelector('.quantity-box input[type="number"]');
    const min = getMin(opt);
    let val = (parseInt(input.value, 10) || min) + step;
    if (val < min) val = min;
    input.value = val;
    updateItemCalculations(opt, val);
    updateStickySummary();
}

function handleManualInput(event, input) {
    if (event) event.stopPropagation();
    const opt = input.closest('.size-option');
    const val = parseInt(input.value, 10);
    updateItemCalculations(opt, isNaN(val) || val < 0 ? 0 : val);
    updateStickySummary();
}

function validateInputLimit(event, input) {
    if (event) event.stopPropagation();
    const opt = input.closest('.size-option');
    const min = getMin(opt);
    let val = parseInt(input.value, 10);
    if (isNaN(val) || val < min) val = min;
    input.value = val;
    updateItemCalculations(opt, val);
    updateStickySummary();
}

// ---------- 4. colors ----------
function selectColor(el, colorName, priceOverride) {
    const card = el.closest('.product-card');
    if (!card) return;
    const legacy = el.closest('.color-selection-section');
    const opt = el.closest('.size-option');

    if (legacy) {
        legacy.querySelectorAll('.color-btn').forEach(b => {
            b.classList.remove('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');
            b.classList.add('border-slate-300');
        });
        el.classList.remove('border-slate-300');
        el.classList.add('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');
        card.dataset.selectedColor = colorName;
    } else if (opt) {
        clearColorMarks(el.parentElement);
        const circle = el.querySelector('div');
        if (circle) {
            circle.classList.add('ring-2', 'ring-blue-400', 'ring-offset-1');
            const dot = circle.querySelector('div');
            if (dot) dot.classList.add('hidden');
            const mark = document.createElement('span');
            mark.className = 'color-check-mark text-white text-[8px] font-bold leading-none';
            mark.innerText = '✓';
            circle.appendChild(mark);
        }
        opt.dataset.selectedColor = colorName;

        if (priceOverride !== undefined && !isNaN(parseFloat(priceOverride))) {
            const p = parseFloat(priceOverride);
            opt.setAttribute('data-unit-price', p);
            const pd = opt.querySelector('.price-display');
            if (pd) pd.innerText = '৳' + p;
            const qty = parseInt(opt.querySelector('.quantity-box input[type="number"]')?.value, 10) || 0;
            if (qty > 0) updateItemCalculations(opt, qty);
        }
    }
    updateStickySummary();
}

function clearColorMarks(group) {
    if (!group) return;
    group.querySelectorAll('label').forEach(lbl => {
        const c = lbl.querySelector('div');
        if (!c) return;
        c.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-1');
        c.querySelector('div')?.classList.remove('hidden');
        c.querySelector('.color-check-mark')?.remove();
    });
}

function autoSelectDefaultColor(opt) {
    const first = opt.querySelector('label[onclick*="selectColor"]');
    if (!first || opt.dataset.selectedColor) return;
    const m = (first.getAttribute('onclick') || '').match(/selectColor\(this,\s*'([^']+)'(?:,\s*([\d.]+))?/);
    if (m) selectColor(first, m[1], m[2]);
}

function resetColorSelection(opt) {
    opt.querySelectorAll('label[onclick*="selectColor"]').forEach(lbl => {
        const c = lbl.querySelector('div');
        if (!c) return;
        c.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-1');
        c.querySelector('div')?.classList.remove('hidden');
        c.querySelector('.color-check-mark')?.remove();
    });
    delete opt.dataset.selectedColor;
}

function autoSelectDefaultCardColors() {
    document.querySelectorAll('.color-selection-section').forEach(sec => {
        const btn = sec.querySelector('.color-btn');
        if (!btn || btn.closest('.product-card')?.dataset.selectedColor) return;
        const m = (btn.getAttribute('onclick') || '').match(/selectColor\(this,\s*'([^']+)'/);
        if (m) selectColor(btn, m[1]);
    });
}

// ---------- 5. weight ----------
function calculateWeightFromOption(card, sizeText, opt) {
    if (opt) {
        const w = parseFloat(opt.getAttribute('data-unit-weight') || opt.getAttribute('data-weight'));
        if (!isNaN(w) && w > 0) return w;
    }
    if (!sizeText) return 0;
    const text = sizeText.toLowerCase();
    const title = card ? (card.querySelector('h3')?.innerText.toLowerCase() || '') : '';

    if (title.includes('tie') || title.includes('টাই') || text.includes('tie')) {
        if (text.includes('8') || text.includes('৮')) return 1.2;
        if (text.includes('12') || text.includes('১২')) return 2.5;
        return 1.5;
    }
    if (title.includes('sticker') || title.includes('স্টিকার')) return 1.0;
    if (title.includes('marker') || title.includes('মার্কার')) return 20.0;
    if (text.includes('গজ') || text.includes('yard')) return (parseFloat((text.match(/\d+/) || [0])[0]) || 0) * 45;

    const m3 = text.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/);
    if (m3) {
        const [l, w, h] = [parseFloat(m3[1]), parseFloat(m3[2]), parseFloat(m3[3])];
        return 2 * (l * w + l * h + w * h) * 0.35;
    }
    return 2.0;
}

// ---------- 6. per-size price / weight display ----------
function updateItemCalculations(opt, qty) {
    const card = opt.closest('.product-card');
    const total = qty * getUnitPrice(opt);

    const priceEl = opt.querySelector('.total-price-text');
    if (priceEl) priceEl.innerText = money(total);

    const wEl = opt.querySelector('.total-weight-text');
    if (wEl && card) {
        const sizeText = opt.querySelector('span.text-slate-700')?.innerText || '';
        const grams = calculateWeightFromOption(card, sizeText, opt) * qty;
        wEl.innerText = grams >= 1000
            ? (grams / 1000).toFixed(2).replace(/\.00$/, '') + ' kg'
            : Math.round(grams) + ' g';
    }
}

// ---------- 7. order totals ----------
function computeOrderTotals() {
    const items = [];
    let itemsSum = 0, totalWeightGrams = 0;

    document.querySelectorAll('.size-option.border-blue-500').forEach(opt => {
        const card = opt.closest('.product-card');
        const rawId = card?.getAttribute('data-product-id');
        const productId = rawId && rawId.trim() ? rawId.trim() : '-';
        const productName = card?.querySelector('h3')?.innerText.trim() || 'Product';
        const sizeText = opt.querySelector('span.text-slate-700')?.innerText.trim() || '';
        const qtyInput = opt.querySelector('.quantity-box input[type="number"]');
        const quantity = qtyInput ? (parseInt(qtyInput.value, 10) || 0) : 1;

        const unitPrice = getUnitPrice(opt);
        const itemTotal = quantity * unitPrice;

        itemsSum += itemTotal;
        const itemWeight = calculateWeightFromOption(card, sizeText, opt) * quantity;
        totalWeightGrams += itemWeight;

        const color = opt.dataset.selectedColor || card?.dataset.selectedColor || '';
        items.push({
            productId, productName, sizeText, quantity,
            unitPrice, itemTotal,
            weightGrams: itemWeight,
            colorLabel: color ? ` [কালার: ${color}]` : '',
            uploadedFileName: card?.dataset.uploadedFileName || ''
        });
    });

    const loc = document.querySelector('input[name="delivery_location"]:checked')?.value || 'Outside Dhaka';
    const baseShipping = DELIVERY_CHARGE[loc] ?? DELIVERY_CHARGE['Outside Dhaka'];
    const weightKg = totalWeightGrams / 1000;
    const weightCharge = weightKg > 1 ? Math.ceil(weightKg - 1) * WEIGHT_CHARGE_PER_KG : 0;
    const shippingCharge = items.length > 0 ? baseShipping + weightCharge : 0;

    // ---- single total discount (taken off products subtotal) ----
    let totalDiscount = parseFloat(document.getElementById('total-discount')?.value);
    if (isNaN(totalDiscount) || totalDiscount < 0) totalDiscount = 0;
    totalDiscount = Math.min(totalDiscount, itemsSum);
    const discountedSubtotal = itemsSum - totalDiscount;

    return {
        items,
        subtotal: discountedSubtotal,   // after discount
        originalSubtotal: itemsSum,     // before discount
        totalDiscount,
        totalWeightGrams, location: loc, isInside: loc === 'Inside Dhaka',
        baseShipping, weightCharge, shippingCharge,
        grandTotal: discountedSubtotal + shippingCharge
    };
}

// ---------- 8. sticky bar ----------
function renderStickyBar(d) {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.innerText = v; };
    set('sticky-total-price', '৳' + d.grandTotal.toFixed(2));
    set('sticky-shipping', '৳' + d.shippingCharge.toFixed(2));
    set('sticky-weight', d.totalWeightGrams >= 1000
        ? 'Weight: ' + (d.totalWeightGrams / 1000).toFixed(2) + 'kg'
        : 'Weight: ' + Math.round(d.totalWeightGrams) + 'g');
    set('sticky-weight-detailed',
        `(${Math.floor(d.totalWeightGrams / 1000)} kg ${Math.round(d.totalWeightGrams % 1000)} g)`);
}

// ---------- 9. line formatting ----------
function itemLine(it) {
    return `- ${it.sizeText}${it.colorLabel} — (${it.quantity}টি x ${money(it.unitPrice)}) = ${money(it.itemTotal)}`;
}

// ---------- 10. live transcript ----------
function renderTranscript(d) {
    const $ = id => document.getElementById(id);
    const setField = (el, value, placeholder) => {
        if (!el) return;
        const v = (value || '').trim();
        el.innerText = v || placeholder;
        el.classList.toggle('italic', !v);
        el.classList.toggle('text-slate-500', !v);
    };
    setField($('trans-name'), $('cust-name')?.value, 'No Name Provided');
    setField($('trans-phone'), $('cust-phone')?.value, 'No Phone Provided');
    setField($('trans-address'), $('cust-address')?.value, 'No Shipping Address Provided');
    if ($('trans-location')) $('trans-location').innerText = d.isInside ? 'YES - (হ্যাঁ)' : 'NO - (না)';

    const prod = $('trans-products-area');
    if (prod) {
        if (!d.items.length) {
            prod.innerText = 'No Products Selected';
            prod.classList.add('italic', 'text-slate-500');
        } else {
            prod.classList.remove('italic', 'text-slate-500');
            prod.innerHTML = d.items.map(it =>
                `* ${it.productName} (ID: ${it.productId}) --><br>${itemLine(it)}` +
                (it.uploadedFileName ? `<br>📷 Attached Design: ${it.uploadedFileName}` : '')
            ).join('<br><br>');
        }
    }

    const sub = $('trans-subtotal');
    if (sub) {
        sub.innerHTML = d.totalDiscount > 0
            ? `<s class="text-slate-400">${money(d.originalSubtotal)}</s> ${money(d.subtotal)} Total`
            : `${money(d.subtotal)} Total`;

        // discount row (created automatically)
        let row = $('trans-discount-row');
        if (!row) {
            row = document.createElement('p');
            row.id = 'trans-discount-row';
            sub.closest('p').after(row);
        }
        row.classList.toggle('hidden', !(d.totalDiscount > 0));
        row.innerHTML = `🎁 <strong>মোট ছাড়:</strong> <span class="text-rose-600 font-bold">${money(d.totalDiscount)}</span>`;
    }

    if ($('trans-weight')) $('trans-weight').innerText =
        Math.round(d.totalWeightGrams) + ' Grams (' + (d.totalWeightGrams / 1000).toFixed(2) + ' kg)';
    if ($('trans-shipping')) $('trans-shipping').innerText = money(d.shippingCharge);
    if ($('trans-total')) $('trans-total').innerText = money(d.grandTotal);
}

function updateStickySummary() {
    const d = computeOrderTotals();
    renderStickyBar(d);
    renderTranscript(d);
}
function updateTranscript() { updateStickySummary(); }

// // ---------- 11. shared message (WhatsApp + Copy Transcript) ----------
// function buildOrderText(d) {
//     const val = id => (document.getElementById(id)?.value || '').trim();
//     let m = `📦 *অর্ডার কনফার্মেশন - Packsolution*\n\n`;
//     m += `👤 *নাম:* ${val('cust-name') || '—'}\n`;
//     m += `📞 *ফোন:* ${val('cust-phone') || '—'}\n`;
//     m += `📍 *ঠিকানা:* ${val('cust-address') || '—'}\n`;
//     m += `🚚 *ঢাকা সিটির ভিতরে:* ${d.isInside ? 'YES - (হ্যাঁ)' : 'NO - (না)'}\n\n`;
//     m += `🛍️ *অর্ডার ডিটেইলস:*\n`;

//     d.items.forEach(it => {
//         m += `• ${it.productName} (ID: ${it.productId}) -->\n${itemLine(it)}\n`;
//         if (it.uploadedFileName) m += `📷 *ডিজাইন আপলোড:* ${it.uploadedFileName} (WhatsApp-এ সেন্ড করুন)\n`;
//         m += `\n`;
//     });

//     const parts = d.items.map(it => money(it.itemTotal)).join(' + ');
//     m += `🧮 *সর্বমোট* = ${parts} = ${money(d.originalSubtotal)} Total\n`;
//     if (d.totalDiscount > 0) {
//         m += `🏷️ *ছাড়ের আগে:* ~${money(d.originalSubtotal)}~ ➜ *ছাড়ের পরে:* ${money(d.subtotal)}\n`;
//         m += `🎁 *মোট ছাড়:* ${money(d.totalDiscount)}\n`;
//     }
//     m += `\n📏 *মোট ওজন:* ${Math.round(d.totalWeightGrams)} Grams (${(d.totalWeightGrams / 1000).toFixed(2)} kg)\n`;
//     m += `🛳️ *শিপিং খরচ:* ${money(d.shippingCharge)}\n\n`;
//     m += `💰 *মোট খরচ:* ${money(d.grandTotal)}\n\n`;
//     m += `✅ আপনার অর্ডারটি কনফার্ম হয়েছে।\n`;
//     m += `ধন্যবাদ Packsolution থেকে অর্ডার করার জন্য! 💙\n`;
//     m += `From: shop.packsolution.org`;
//     return m;
// }

function copyTranscriptText() {
    const d = computeOrderTotals();
    if (!d.items.length) { alert('❌ কপি করার মতো কোনো প্রোডাক্ট সিলেক্ট করা হয়নি।'); return; }
    navigator.clipboard.writeText(buildOrderText(d))
        .then(() => alert('✅ ট্রান্সক্রিপ্ট কপি হয়েছে!'))
        .catch(() => alert('❌ কপি করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।'));
}

function scrollToOrderForm() {
    document.getElementById('checkout-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function sendOrderViaWhatsApp() {
    const d = computeOrderTotals();
    if (!d.items.length) { alert('⚠️ দয়া করে অন্তত একটি প্রোডাক্ট সিলেক্ট করুন।'); return; }
    const val = id => (document.getElementById(id)?.value || '').trim();
    if (!val('cust-name') || !val('cust-phone') || !val('cust-address')) {
        alert('⚠️ দয়া করে নাম, ফোন নম্বর এবং ঠিকানা পূরণ করুন।');
        return;
    }
    const text = encodeURIComponent(buildOrderText(d));
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const url = isMobile
        ? `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`
        : `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`;
    window.open(url, '_blank');
}

// ---------- 12. image gallery ----------
function openImageGallery(images) {
    let modal = document.getElementById('gallery-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'gallery-modal';
        modal.className = 'fixed inset-0 z-[9990] bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 relative shadow-2xl">
                <button onclick="closeGalleryModal()" class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold">✕</button>
                <h3 class="text-base font-bold text-slate-800 mb-3">পণ্যের ছবিসমূহ (ক্লিক করে বড় দেখুন)</h3>
                <div id="gallery-grid" class="grid grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto p-1"></div>
            </div>`;
        document.body.appendChild(modal);
    }
    if (!document.getElementById('fullscreen-modal')) {
        const fs = document.createElement('div');
        fs.id = 'fullscreen-modal';
        fs.className = 'fixed inset-0 z-[9999] bg-black/90 hidden items-center justify-center p-2 cursor-pointer';
        fs.onclick = closeFullscreenModal;
        fs.innerHTML = `
            <button class="absolute top-4 right-4 text-white text-2xl font-bold bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            <img id="fullscreen-img" src="" alt="Full View" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl">`;
        document.body.appendChild(fs);
    }
    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';
    (Array.isArray(images) ? images : []).forEach(url => {
        const c = document.createElement('div');
        c.className = 'aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-90 hover:scale-105 transition transform shadow-sm';
        c.innerHTML = `<img src="${url}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x300?text=No+Image'">`;
        c.onclick = () => openFullscreenImage(url);
        grid.appendChild(c);
    });
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeGalleryModal() {
    const m = document.getElementById('gallery-modal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}
function openFullscreenImage(url) {
    const m = document.getElementById('fullscreen-modal'), i = document.getElementById('fullscreen-img');
    if (m && i) { i.src = url; m.classList.remove('hidden'); m.classList.add('flex'); }
}
function closeFullscreenModal() {
    const m = document.getElementById('fullscreen-modal');
    if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
}

// ---------- 13. single total discount input (auto-added, no HTML edit needed) ----------
function injectTotalDiscountInput() {
    // remove any old per-card discount boxes if they exist
    document.querySelectorAll('.discount-box').forEach(b => b.remove());

    if (document.getElementById('total-discount')) return; // already in HTML

    const totalEl = document.getElementById('trans-total');
    const anchor = totalEl ? totalEl.closest('.border-t') : null; // "মোট খরচ" block
    if (!anchor) return;

    const box = document.createElement('div');
    box.className = 'border-t border-blue-200/60 pt-3 mt-3 flex items-center justify-between gap-2';
    box.innerHTML = `
        <label for="total-discount" class="text-[11px] font-bold text-rose-600 whitespace-nowrap">🏷️ ছাড় (৳ মোট):</label>
        <input id="total-discount" type="number" min="0" step="1" value="0"
               class="w-24 h-8 border border-rose-200 rounded-md text-center text-xs font-bold text-rose-600 bg-white focus:outline-none focus:border-rose-500">`;
    anchor.before(box);
}

// ---------- 14. init ----------
document.addEventListener('DOMContentLoaded', () => {
    injectTotalDiscountInput();
    document.querySelectorAll('input[name="delivery_location"]').forEach(r => r.addEventListener('change', updateStickySummary));
    ['cust-name', 'cust-phone', 'cust-address', 'total-discount'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateStickySummary);
    });
    autoSelectDefaultCardColors();
    updateStickySummary();
});