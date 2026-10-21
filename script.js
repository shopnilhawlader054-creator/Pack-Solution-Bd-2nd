// ============================================================
// Packsolution Order System — Full JS Logic (Fixed & Optimized)
// ডেলিভারি চার্জ: Inside Dhaka = ৳80, Outside Dhaka = ৳130
// ওজন ভিত্তিক চার্জ: ১ কেজি পার হলে প্রতি অতিরিক্ত কেজিতে ৳20 যোগ হবে
// ============================================================

const WHATSAPP_NUMBER = "8801629370622"; 

const DELIVERY_CHARGE = {
    "Inside Dhaka": 80,
    "Outside Dhaka": 130
};
const WEIGHT_CHARGE_PER_KG = 20;


// ==========================================
// ১. কার্ড ওপেন/ক্লোজ (Toggle) করার ফাংশন
// ==========================================
function toggleCard(cardHeader) {
    const card = cardHeader.closest('.product-card');
    if (!card) return;
    const bodyContent = card.querySelector('.card-body-content');
    if (!bodyContent) return;

    const isHidden = bodyContent.classList.contains('hidden');

    if (isHidden) {
        bodyContent.classList.remove('hidden');
        cardHeader.setAttribute('aria-expanded', 'true');
    } else {
        bodyContent.classList.add('hidden');
        cardHeader.setAttribute('aria-expanded', 'false');
    }
}


// ==========================================
// ১.১ ছবি আপলোড হ্যান্ডেল করার নতুন ফাংশন
// ==========================================
function handleImageUpload(event, inputElement) {
    if (event) event.stopPropagation();
    const card = inputElement.closest('.product-card');
    if (!card) return;

    const file = inputElement.files[0];
    if (file) {
        card.dataset.uploadedFileName = file.name;
    } else {
        delete card.dataset.uploadedFileName;
    }
    
    updateStickySummary();
}


// ==========================================
// ২. সাইজ অপশন সিলেক্ট/ডি-সিলেক্ট করার ফাংশন
// ==========================================
function selectSizeOption(optionElement, unitPrice) {
    const card = optionElement.closest('.product-card');
    const quantityBox = optionElement.querySelector('.quantity-box');
    const radio = optionElement.querySelector('.custom-radio');

    // unitPrice dataset এ সেভ রাখা নিরাপদ
    if (unitPrice !== undefined) {
        optionElement.setAttribute('data-unit-price', unitPrice);
    } else {
        unitPrice = parseFloat(optionElement.getAttribute('data-unit-price')) || 0;
    }

    const isSelected = optionElement.classList.contains('border-blue-500');

    if (isSelected) {
        // ডি-সিলেক্ট করা
        optionElement.classList.remove('border-blue-500', 'bg-blue-50/30');
        optionElement.classList.add('border-slate-200', 'bg-white');

        if (radio) {
            radio.classList.remove('bg-blue-600', 'border-blue-600');
            radio.classList.add('bg-white', 'border-slate-300');
            radio.innerText = '';
        }
        if (quantityBox) quantityBox.classList.add('hidden');

        // 🎨 সাইজ ডি-সিলেক্ট হলে, এই সাইজের ভিতরের কালার সিলেকশনও রিসেট হবে
        resetColorSelection(optionElement);

    } else {
        // নতুন অপশন সিলেক্ট করা
        optionElement.classList.remove('border-slate-200', 'bg-white');
        optionElement.classList.add('border-blue-500', 'bg-blue-50/30');

        if (radio) {
            radio.classList.remove('bg-white', 'border-slate-300');
            radio.classList.add('bg-blue-600', 'border-blue-600');
            radio.innerText = '✓';
        }
        if (quantityBox) quantityBox.classList.remove('hidden');

        // HTML min attribute / data-min অনুযায়ী কোয়ান্টিটি নেওয়া (ডিফল্ট ১০)
        const qtyInput = optionElement.querySelector('.quantity-box input[type="number"]');
        let minQty = 10; 
        if (qtyInput) {
            minQty = parseInt(qtyInput.getAttribute('min'), 10) || parseInt(optionElement.getAttribute('data-min'), 10) || 10;
        }

        let currentVal = qtyInput ? parseInt(qtyInput.value, 10) : minQty;
        if (isNaN(currentVal) || currentVal < minQty) {
            currentVal = minQty;
        }

        if (qtyInput) {
            qtyInput.value = currentVal;
            qtyInput.setAttribute('min', minQty);
        }

        updateItemCalculations(optionElement, currentVal, unitPrice);

        // 🎨 সাইজ সিলেক্ট হওয়ার সাথে সাথে, ভিতরে কালার অপশন থাকলে
        // ডিফল্টভাবে প্রথম কালারটা অটো-সিলেক্ট/টিক করে দেওয়া হবে
        autoSelectDefaultColor(optionElement);
    }

    updateCardCheckmark(card);
    updateStickySummary(); // sticky bar + transcript দুটোই আপডেট হবে
}


// ==========================================
// ২.১ মেইন কার্ডের টিকমার্ক হ্যান্ডেল করার ফাংশন
// ==========================================
function updateCardCheckmark(card) {
    if (!card) return;
    const checkIcon = card.querySelector('.icon-circle');
    if (!checkIcon) return;

    const selectedSizesInCard = card.querySelectorAll('.size-option.border-blue-500');

    if (selectedSizesInCard.length > 0) {
        checkIcon.classList.remove('bg-white', 'border-slate-300');
        checkIcon.classList.add('bg-emerald-500', 'border-emerald-500');
        checkIcon.innerText = '✓';
    } else {
        checkIcon.classList.remove('bg-emerald-500', 'border-emerald-500');
        checkIcon.classList.add('bg-white', 'border-slate-300');
        checkIcon.innerText = '';
    }
}


// ==========================================
// ৩. পরিমাণ (Quantity) বাড়ানো/কমানোর ফাংশন (+/- বাটনের জন্য)
// ==========================================
function changeQuantity(event, btnElement, step, unitPrice) {
    if (event) event.stopPropagation(); // কার্ড বন্ধ হওয়া ঠেকাবে

    const quantityBox = btnElement.closest('.quantity-box');
    const sizeOption = btnElement.closest('.size-option');
    const input = quantityBox.querySelector('input[type="number"]');

    if (unitPrice === undefined) {
        unitPrice = parseFloat(sizeOption.getAttribute('data-unit-price')) || 0;
    } else {
        sizeOption.setAttribute('data-unit-price', unitPrice);
    }

    let minVal = parseInt(input.getAttribute('min'), 10) || parseInt(sizeOption.getAttribute('data-min'), 10) || 10;
    let currentVal = parseInt(input.value, 10) || minVal;

    let newVal = currentVal + step;
    if (newVal < minVal) newVal = minVal;

    input.value = newVal;

    updateItemCalculations(sizeOption, newVal, unitPrice);
    updateStickySummary();
}


// ==========================================
// ৩.১ ম্যানুয়ালি ইনপুট বক্সে টাইপ করার হ্যান্ডলার
// ==========================================
// function handleManualInput(event, inputElement, unitPrice) {
//     if (event) event.stopPropagation();

//     const sizeOption = inputElement.closest('.size-option');
//     if (unitPrice === undefined) {
//         unitPrice = parseFloat(sizeOption.getAttribute('data-unit-price')) || 0;
//     }

//     let currentVal = parseInt(inputElement.value, 10);

//     if (isNaN(currentVal) || currentVal < 0) {
//         currentVal = 0;
//     }

//     updateItemCalculations(sizeOption, currentVal, unitPrice);
//     updateStickySummary();
// }

// // টাইপিং শেষ হলে কন্টেন্ট ভ্যালিডেশন
// function validateInputLimit(event, inputElement, unitPrice) {
//     if (event) event.stopPropagation();

//     const sizeOption = inputElement.closest('.size-option');
//     if (unitPrice === undefined) {
//         unitPrice = parseFloat(sizeOption.getAttribute('data-unit-price')) || 0;
//     }

//     let minVal = parseInt(inputElement.getAttribute('min'), 10) || parseInt(sizeOption.getAttribute('data-min'), 10) || 10;
//     let currentVal = parseInt(inputElement.value, 10) || 0;

//     if (currentVal < minVal) {
//         inputElement.value = minVal;
//         currentVal = minVal;
//     }

//     updateItemCalculations(sizeOption, currentVal, unitPrice);
//     updateStickySummary();
// }


// ==========================================
// ৪. কালার সিলেক্ট করার ফাংশন (আপডেটেড)
// ==========================================
// এই একটা ফাংশন এখন দুই ধরনের কালার UI-ই হ্যান্ডেল করে:
//  ক) Card 5-এর মতো, পুরো প্রোডাক্ট কার্ডের জন্য আলাদা "color-selection-section"
//  খ) Card 3-এর মতো, প্রতিটা সাইজ-অপশনের ভিতরে বসানো color label (Brown/White)
function selectColor(labelOrBtn, colorName, priceOverride) {
    const card = labelOrBtn.closest('.product-card');
    if (!card) return;

    const legacyContainer = labelOrBtn.closest('.color-selection-section');
    const sizeOption = labelOrBtn.closest('.size-option');

    if (legacyContainer) {
        // ==== (ক) পুরো কার্ডের জন্য কালার বাটন (Card 5 স্টাইল) ====
        legacyContainer.querySelectorAll('.color-btn').forEach(b => {
            b.classList.remove('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');
            b.classList.add('border-slate-300');
        });

        labelOrBtn.classList.remove('border-slate-300');
        labelOrBtn.classList.add('border-blue-500', 'bg-blue-50', 'ring-2', 'ring-blue-300');

        card.dataset.selectedColor = colorName;

    } else if (sizeOption) {
        // ==== (খ) সাইজ-অপশনের ভিতরের কালার লেবেল (Card 3 স্টাইল) ====
        const colorGroup = labelOrBtn.parentElement; // এই সাইজের কালার-লেবেলগুলোর কমন প্যারেন্ট
        if (!colorGroup) return;

        // এই সাইজ-অপশনের ভিতরের সবগুলো কালার লেবেল থেকে আগের সিলেকশন/টিক মুছে ফেলা
        colorGroup.querySelectorAll('label').forEach(lbl => {
            const circle = lbl.querySelector('div');
            if (circle) {
                circle.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-1');
                const innerDot = circle.querySelector('div');
                if (innerDot) innerDot.classList.remove('hidden');
                const existingCheck = circle.querySelector('.color-check-mark');
                if (existingCheck) existingCheck.remove();
            }
        });

        // ক্লিক করা কালারটাতে টিক মার্ক (✓) বসানো
        const clickedCircle = labelOrBtn.querySelector('div');
        if (clickedCircle) {
            clickedCircle.classList.add('ring-2', 'ring-blue-400', 'ring-offset-1');
            const innerDot = clickedCircle.querySelector('div');
            if (innerDot) innerDot.classList.add('hidden');

            const checkMark = document.createElement('span');
            checkMark.className = 'color-check-mark text-white text-[8px] font-bold leading-none';
            checkMark.innerText = '✓';
            clickedCircle.appendChild(checkMark);
        }

        // এই নির্দিষ্ট সাইজ-অপশনে কালারের নাম সেভ রাখা (WhatsApp/Transcript এর জন্য)
        sizeOption.dataset.selectedColor = colorName;

        // 💰 কালার অনুযায়ী দাম বদলানো (যেমন: Brown ৳25, White ৳30)
        if (priceOverride !== undefined && !isNaN(parseFloat(priceOverride))) {
            const newUnitPrice = parseFloat(priceOverride);
            sizeOption.setAttribute('data-unit-price', newUnitPrice);

            // উপরের দাম-লেবেল (৳25 / ৳30) আপডেট করা, যদি এলিমেন্টটা থাকে
            const priceDisplay = sizeOption.querySelector('.price-display');
            if (priceDisplay) {
                priceDisplay.innerText = '৳' + newUnitPrice;
            }

            // বর্তমান কোয়ান্টিটি অনুযায়ী টোটাল প্রাইস/ওজন রিক্যালকুলেট করা
            const qtyInput = sizeOption.querySelector('.quantity-box input[type="number"]');
            const currentQty = qtyInput ? (parseInt(qtyInput.value, 10) || 0) : 0;
            if (currentQty > 0) {
                updateItemCalculations(sizeOption, currentQty, newUnitPrice);
            }
        }
    }

    updateStickySummary();
}


// ==========================================
// ৪.১ সাইজ সিলেক্ট হলে ডিফল্ট কালার অটো-সিলেক্ট করা
// ==========================================
function autoSelectDefaultColor(sizeOption) {
    // এই সাইজ-অপশনের ভিতরে কোনো কালার-লেবেল গ্রুপ আছে কিনা খুঁজে বের করা
    const colorLabels = sizeOption.querySelectorAll(':scope > .flex.items-center.gap-4 label, :scope > div > label');
    let firstLabel = sizeOption.querySelector('label[onclick*="selectColor"]');

    if (!firstLabel) return; // এই সাইজে কোনো কালার অপশন নেই

    // ইতিমধ্যে কোনো কালার সিলেক্টেড থাকলে আবার রিসেট করার দরকার নেই
    if (sizeOption.dataset.selectedColor) return;

    const onclickAttr = firstLabel.getAttribute('onclick') || '';
    const match = onclickAttr.match(/selectColor\(this,\s*'([^']+)'/);
    const colorName = match ? match[1] : null;

    if (colorName) {
        selectColor(firstLabel, colorName);
    }
}


// ==========================================
// ৪.২ সাইজ ডি-সিলেক্ট হলে কালার সিলেকশন রিসেট করা
// ==========================================
function resetColorSelection(sizeOption) {
    const colorLabels = sizeOption.querySelectorAll('label[onclick*="selectColor"]');
    colorLabels.forEach(lbl => {
        const circle = lbl.querySelector('div');
        if (circle) {
            circle.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-1');
            const innerDot = circle.querySelector('div');
            if (innerDot) innerDot.classList.remove('hidden');
            const existingCheck = circle.querySelector('.color-check-mark');
            if (existingCheck) existingCheck.remove();
        }
    });
    delete sizeOption.dataset.selectedColor;
}


// ==========================================
// ৪.৩ পুরো কার্ডের কালার সেকশনের জন্য ডিফল্ট কালার অটো-সিলেক্ট
//     (Card 5, Card 6 স্টাইল — .color-selection-section ব্যবহার করে)
// ==========================================
function autoSelectDefaultCardColors() {
    document.querySelectorAll('.color-selection-section').forEach(section => {
        const firstBtn = section.querySelector('.color-btn');
        if (!firstBtn) return;

        const card = firstBtn.closest('.product-card');
        if (card && card.dataset.selectedColor) return; // আগে থেকেই সিলেক্ট থাকলে স্কিপ

        const onclickAttr = firstBtn.getAttribute('onclick') || '';
        const match = onclickAttr.match(/selectColor\(this,\s*'([^']+)'/);
        const colorName = match ? match[1] : null;

        if (colorName) {
            selectColor(firstBtn, colorName);
        }
    });
}


// ==========================================
// ৫. ওজন (Weight in Grams) বের করার ডাইনামিক লজিক
// ==========================================
function calculateWeightFromOption(card, sizeText, optionElement) {
    if (optionElement) {
        let customWeight = parseFloat(optionElement.getAttribute('data-unit-weight') || optionElement.getAttribute('data-weight'));
        if (!isNaN(customWeight) && customWeight > 0) {
            return customWeight;
        }
    }

    if (!sizeText) return 0;
    let text = sizeText.toLowerCase();
    const productTitle = card ? (card.querySelector('h3')?.innerText.toLowerCase() || '') : '';

    if (productTitle.includes('tie') || productTitle.includes('টাই') || text.includes('tie')) {
        if (text.includes('8') || text.includes('৮')) return 1.2;
        if (text.includes('12') || text.includes('১২')) return 2.5;
        return 1.5;
    }

    if (productTitle.includes('daraz') || productTitle.includes('poly') || productTitle.includes('পলি') || productTitle.includes('mailer')) {
        if (text.includes('6/8') || text.includes('৬/৮') || (text.includes('6') && text.includes('8'))) return 4.5;
        if (text.includes('8/10') || text.includes('৮/১০') || (text.includes('8') && text.includes('10'))) return 6.5;
        if (text.includes('10/14') || text.includes('১০/১৪') || (text.includes('10') && text.includes('14'))) return 11.0;
        if (text.includes('12/16') || text.includes('১২/১৬') || (text.includes('12') && text.includes('16'))) return 15.0;
        if (text.includes('14/18') || text.includes('১৪/১৮') || (text.includes('14') && text.includes('18'))) return 19.0;
        
        let match2D = text.match(/([\d.]+)\s*["״]?\s*[\/×xX]\s*([\d.]+)/);
        if (match2D) {
            let width = parseFloat(match2D[1]);
            let length = parseFloat(match2D[2]);
            return (width * length * 0.09);
        }
    }

    if (productTitle.includes('sticker') || productTitle.includes('স্টিকার')) {
        return 1.0;
    }

    if (productTitle.includes('marker') || productTitle.includes('মার্কার')) {
        return 20.0;
    }

    if (text.includes('গজ') || text.includes('yard')) {
        let yards = parseFloat((text.match(/\d+/) || [0])[0]) || 0;
        return yards * 45;
    }

    let match3D = text.match(/([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)/);
    if (match3D) {
        let l = parseFloat(match3D[1]);
        let w = parseFloat(match3D[2]);
        let h = parseFloat(match3D[3]);
        return 2 * (l * w + l * h + w * h) * 0.35;
    }

    return 2.0;
}


// ==========================================
// ৬. ইন্ডিভিজুয়াল সাইজ কার্ডের মূল্য ও ওজন আপডেট
// ==========================================
function updateItemCalculations(sizeOption, quantity, unitPrice) {
    const card = sizeOption.closest('.product-card');

    if (unitPrice === undefined) {
        unitPrice = parseFloat(sizeOption.getAttribute('data-unit-price')) || 0;
    }

    const totalPriceText = sizeOption.querySelector('.total-price-text');
    let totalPrice = quantity * unitPrice;

    if (totalPriceText) {
        totalPriceText.innerText = '৳' + (Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(1));
    }

    const weightDisplay = sizeOption.querySelector('.total-weight-text');
    if (weightDisplay && card) {
        const sizeSpan = sizeOption.querySelector('span.text-slate-700');
        let sizeText = sizeSpan ? sizeSpan.innerText : '';
        
        let unitWeightGrams = calculateWeightFromOption(card, sizeText, sizeOption);
        let totalGrams = unitWeightGrams * quantity;
        
        weightDisplay.innerText = totalGrams >= 1000
            ? (totalGrams / 1000).toFixed(2).replace(/\.00$/, '') + ' kg'
            : Math.round(totalGrams) + ' g';
    }
}


// ==========================================
// ৭. পুরো অর্ডারের হিসাব
// ==========================================
function computeOrderTotals() {
    const items = [];
    let subtotal = 0;
    let totalWeightGrams = 0;

    const selectedOptions = document.querySelectorAll('.size-option.border-blue-500');

    selectedOptions.forEach(option => {
        const card = option.closest('.product-card');
        
        let productId = '-';
        if (card) {
            const rawId = card.getAttribute('data-product-id');
            if (rawId && rawId.trim() !== '') {
                productId = rawId.trim();
            }
        }
        
        const productName = card ? (card.querySelector('h3') ? card.querySelector('h3').innerText.trim() : 'Product') : 'Product';
        const sizeSpan = option.querySelector('span.text-slate-700');
        const sizeText = sizeSpan ? sizeSpan.innerText.trim() : '';

        const qtyInput = option.querySelector('.quantity-box input[type="number"]');
        const quantity = qtyInput ? (parseInt(qtyInput.value, 10) || 0) : 1;

        let unitPrice = parseFloat(option.getAttribute('data-unit-price'));
        
        // যদি data-unit-price না থাকে তবে DOM থেকে ব্যাকআপ ফেচ করবে
        if (isNaN(unitPrice)) {
            const priceTextEl = option.querySelector('.total-price-text');
            if (priceTextEl && quantity > 0) {
                const parsedTotal = parseFloat(priceTextEl.innerText.replace(/[^\d.]/g, '')) || 0;
                unitPrice = parsedTotal / quantity;
            } else {
                const singlePriceEl = option.querySelector('.text-slate-800');
                unitPrice = singlePriceEl ? (parseFloat(singlePriceEl.innerText.replace(/[^\d.]/g, '')) || 0) : 0;
            }
        }

        const itemTotal = quantity * unitPrice;
        subtotal += itemTotal;

        const unitWeight = calculateWeightFromOption(card, sizeText, option);
        const itemWeight = unitWeight * quantity;
        totalWeightGrams += itemWeight;

        // 🎨 কালার নাম আগে এই নির্দিষ্ট সাইজ-অপশন থেকে খোঁজা হবে (Card 3 স্টাইল),
        // না পেলে তারপর পুরো কার্ড থেকে খোঁজা হবে (Card 5 স্টাইল)
        const selectedColorName = option.dataset.selectedColor || (card && card.dataset.selectedColor) || '';
        const colorLabel = selectedColorName ? ` [কালার: ${selectedColorName}]` : '';

        const uploadedFileName = card && card.dataset.uploadedFileName ? card.dataset.uploadedFileName : '';

        items.push({ 
            productId, 
            productName, 
            sizeText, 
            quantity, 
            unitPrice,
            itemTotal, 
            weightGrams: itemWeight, 
            colorLabel,
            uploadedFileName
        });
    });

    const locationInput = document.querySelector('input[name="delivery_location"]:checked');
    const location = locationInput ? locationInput.value : 'Outside Dhaka';
    const isInside = location === 'Inside Dhaka';

    const baseShipping = DELIVERY_CHARGE[location] ?? DELIVERY_CHARGE['Outside Dhaka'];
    
    const weightKg = totalWeightGrams / 1000;
    let weightCharge = 0;

    if (weightKg > 1) {
        const extraWeightKg = weightKg - 1;
        weightCharge = Math.ceil(extraWeightKg) * WEIGHT_CHARGE_PER_KG;
    }

    const shippingCharge = items.length > 0 ? (baseShipping + weightCharge) : 0;
    const grandTotal = subtotal + shippingCharge;

    return {
        items, subtotal, totalWeightGrams, location, isInside,
        baseShipping, weightCharge, shippingCharge, grandTotal
    };
}


// ==========================================
// ৮. স্টিকি বটম বার আপডেট
// ==========================================
function renderStickyBar(data) {
    const totalPriceEl = document.getElementById('sticky-total-price');
    const shippingEl = document.getElementById('sticky-shipping');
    const weightEl = document.getElementById('sticky-weight');
    const weightDetailedEl = document.getElementById('sticky-weight-detailed');

    if (totalPriceEl) totalPriceEl.innerText = '৳' + data.grandTotal.toFixed(2);
    if (shippingEl) shippingEl.innerText = '৳' + data.shippingCharge.toFixed(2);
    
    if (weightEl) {
        if (data.totalWeightGrams >= 1000) {
            weightEl.innerText = 'Weight: ' + (data.totalWeightGrams / 1000).toFixed(2) + 'kg';
        } else {
            weightEl.innerText = 'Weight: ' + Math.round(data.totalWeightGrams) + 'g';
        }
    }

    const kg = Math.floor(data.totalWeightGrams / 1000);
    const remGrams = Math.round(data.totalWeightGrams % 1000);
    if (weightDetailedEl) weightDetailedEl.innerText = `(${kg} kg ${remGrams} g)`;
}


// ==========================================
// ৯. লাইভ ট্রান্সক্রিপ্ট আপডেট
// ==========================================
function renderTranscript(data) {
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const addressInput = document.getElementById('cust-address');

    const transName = document.getElementById('trans-name');
    const transPhone = document.getElementById('trans-phone');
    const transAddress = document.getElementById('trans-address');
    const transLocation = document.getElementById('trans-location');
    const transProducts = document.getElementById('trans-products-area');
    const transSubtotal = document.getElementById('trans-subtotal');
    const transWeight = document.getElementById('trans-weight');
    const transShipping = document.getElementById('trans-shipping');
    const transTotal = document.getElementById('trans-total');

    const setField = (el, value, placeholder) => {
        if (!el) return;
        const val = value ? value.trim() : '';
        el.innerText = val || placeholder;
        el.classList.toggle('italic', !val);
        el.classList.toggle('text-slate-500', !val);
    };

    setField(transName, nameInput ? nameInput.value : '', 'No Name Provided');
    setField(transPhone, phoneInput ? phoneInput.value : '', 'No Phone Provided');
    setField(transAddress, addressInput ? addressInput.value : '', 'No Shipping Address Provided');

    if (transLocation) {
        transLocation.innerText = data.isInside ? 'YES - (হ্যাঁ)' : 'NO - (না)';
    }

    if (transProducts) {
        if (data.items.length === 0) {
            transProducts.innerText = 'No Products Selected';
            transProducts.classList.add('italic', 'text-slate-500');
        } else {
            transProducts.classList.remove('italic', 'text-slate-500');
            
            transProducts.innerHTML = data.items.map(it => {
                const productId = it.productId || '-';
                const imageNote = it.uploadedFileName ? `<br>📷 Attached Design: ${it.uploadedFileName}` : '';
                return `* ${it.productName} (ID: ${productId}) --><br>` +
                       `- ${it.sizeText}${it.colorLabel || ''} — (${it.quantity}টি x ৳${it.unitPrice.toFixed(1)}) = ৳${it.itemTotal.toFixed(1)}${imageNote}`;
            }).join('<br><br>');
        }
    }

    if (transSubtotal) transSubtotal.innerText = '৳' + data.subtotal.toFixed(1) + ' Total';

    if (transWeight) {
        const kg = (data.totalWeightGrams / 1000).toFixed(2);
        transWeight.innerText = Math.round(data.totalWeightGrams) + ' Grams (' + kg + ' kg)';
    }

    if (transShipping) transShipping.innerText = '৳' + data.shippingCharge.toFixed(1);
    if (transTotal) transTotal.innerText = '৳' + data.grandTotal.toFixed(1);
}


// ==========================================
// ১০. মেইন আপডেট ফাংশন
// ==========================================
function updateStickySummary() {
    const data = computeOrderTotals();
    renderStickyBar(data);
    renderTranscript(data);
}

function updateTranscript() {
    updateStickySummary();
}


// ==========================================
// ১১. ট্রান্সক্রিপ্ট কপি করার ফাংশন
// ==========================================
function copyTranscriptText() {
    const transArea = document.getElementById('trans-products-area');
    const container = transArea ? transArea.closest('.rounded-2xl, .card-body, div') : null;
    
    if (!container) {
        alert('❌ কপি করার মতো কোনো তথ্য পাওয়া যায়নি।');
        return;
    }

    const textToCopy = container.innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('✅ ট্রান্সক্রিপ্ট কপি হয়েছে!');
    }).catch(() => {
        alert('❌ কপি করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    });
}


// ==========================================
// ১২. চেকআউট ফর্মে স্ক্রল করার ফাংশন
// ==========================================
function scrollToOrderForm() {
    const form = document.getElementById('checkout-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ==========================================
// ১৩. WhatsApp-এ অর্ডার পাঠানোর ফাংশন (Updated Breakdown Format)
// ==========================================
function sendOrderViaWhatsApp() {
    const data = computeOrderTotals();

    if (!data.items || data.items.length === 0) {
        alert('⚠️ দয়া করে অন্তত একটি প্রোডাক্ট সিলেক্ট করুন।');
        return;
    }

    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    const addressInput = document.getElementById('cust-address');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const address = addressInput ? addressInput.value.trim() : '';

    if (!name || !phone || !address) {
        alert('⚠️ দয়া করে নাম, ফোন নম্বর এবং ঠিকানা পূরণ করুন।');
        return;
    }

    let message = `📦 *অর্ডার কনফার্মেশন - Packsolution*\n\n`;
    message += `👤 *নাম:* ${name}\n`;
    message += `📞 *ফোন:* ${phone}\n`;
    message += `📍 *ঠিকানা:* ${address}\n`;
    message += `🚚 *ঢাকা সিটির ভিতরে:* ${data.isInside ? 'YES - (হ্যাঁ)' : 'NO - (না)'}\n\n`;
    
    message += `🛍️ *অর্ডার ডিটেইলস:*\n`;

    const itemCalculationParts = [];

    data.items.forEach(it => {
        const productId = it.productId || '-';

        message += `• ${it.productName} (ID: ${productId}) -->\n`;
        message += `- ${it.sizeText}${it.colorLabel || ''} — (${it.quantity}টি x ৳${it.unitPrice.toFixed(1)}) = ৳${it.itemTotal.toFixed(1)}\n`;
        
        if (it.uploadedFileName) {
            message += `📷 *ডিজাইন আপলোড:* ${it.uploadedFileName} (WhatsApp-এ সেন্ড করুন)\n`;
        }
        
        message += `\n`;

        itemCalculationParts.push(`৳${it.itemTotal.toFixed(1)}`);
    });

    const breakdownString = itemCalculationParts.join(' + ');
    message += `🧮 *সর্বমোট* = ${breakdownString} = ৳${data.subtotal.toFixed(1)} Total\n\n`;

    message += `📏 *মোট ওজন:* ${Math.round(data.totalWeightGrams)} Grams (${(data.totalWeightGrams / 1000).toFixed(2)} kg)\n`;
    message += `🛳️ *শিপিং খরচ:* ৳${data.shippingCharge.toFixed(1)}\n\n`;

    message += `💰 *মোট খরচ:* ৳${data.grandTotal.toFixed(1)}\n\n`;

    // 🔥 মেসেজ পার্ট 🔥
    message += `✅ আপনার অর্ডারটি কনফার্ম হয়েছে।\n`;
    message += `ধন্যবাদ Packsolution থেকে অর্ডার করার জন্য! 💙\n`;
    message += `From: shop.packsolution.org`;

    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = WHATSAPP_NUMBER;

    // ডিভাইস অনু্যায়ী WhatsApp API রিডাইরেকশন
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const whatsappUrl = isMobile 
        ? `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`
        : `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');
}


// ============================================================
// ১৪. View Images (Gallery & Fullscreen Preview) Dynamic Logic
// ============================================================

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
            </div>
        `;
        document.body.appendChild(modal);
    }

    let fsModal = document.getElementById('fullscreen-modal');
    if (!fsModal) {
        fsModal = document.createElement('div');
        fsModal.id = 'fullscreen-modal';
        fsModal.className = 'fixed inset-0 z-[9999] bg-black/90 hidden items-center justify-center p-2 cursor-pointer';
        fsModal.onclick = closeFullscreenModal;
        fsModal.innerHTML = `
            <button class="absolute top-4 right-4 text-white text-2xl font-bold bg-white/20 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            <img id="fullscreen-img" src="" alt="Full View" class="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl">
        `;
        document.body.appendChild(fsModal);
    }

    const grid = document.getElementById('gallery-grid');
    grid.innerHTML = '';

    if (Array.isArray(images)) {
        images.forEach(imgUrl => {
            const imgCard = document.createElement('div');
            imgCard.className = 'aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer hover:opacity-90 hover:scale-105 transition transform shadow-sm';
            imgCard.innerHTML = `<img src="${imgUrl}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x300?text=No+Image'">`;
            
            imgCard.onclick = () => openFullscreenImage(imgUrl);
            grid.appendChild(imgCard);
        });
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function openFullscreenImage(imgUrl) {
    const fsModal = document.getElementById('fullscreen-modal');
    const fsImg = document.getElementById('fullscreen-img');
    if (fsModal && fsImg) {
        fsImg.src = imgUrl;
        fsModal.classList.remove('hidden');
        fsModal.classList.add('flex');
    }
}

function closeFullscreenModal() {
    const fsModal = document.getElementById('fullscreen-modal');
    if (fsModal) {
        fsModal.classList.add('hidden');
        fsModal.classList.remove('flex');
    }
}


// ==========================================
// ১৫. পেজ লোড ও ইভেন্ট লিসেনার ইনিশিয়ালাইজেশন
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // ১. ডেলিভারি লোকেশন পরিবর্তনের সাথে সাথে মোট প্রাইস আপডেট করা
    const locationRadios = document.querySelectorAll('input[name="delivery_location"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', updateStickySummary);
    });

    // ২. কাস্টমার ইনফরমেশন টাইপ করার সাথে সাথে ট্রান্সক্রিপ্ট আপডেট
    ['cust-name', 'cust-phone', 'cust-address'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', updateStickySummary);
        }
    });

    // ৩. প্রতিটা কার্ড-লেভেল কালার সেকশনে (Card 5, Card 6...) ডিফল্ট কালার অটো-সিলেক্ট
    autoSelectDefaultCardColors();

    // ৪. প্রাথমিক হিসাব চালানো
    updateStickySummary();
});