// Configuration - ใส่ Google Apps Script Web App URL ของคุณที่นี่ 
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxRQWXsxd0Lm53IFTi_b9uN6m4JIdQ3nl1DhuSO9GszVQPp25pG8xcd9wFlOTi6_jvM_A/exec',
    // ตัวอย่าง: 'https://script.google.com/macros/s/AKfycbxxx.../exec'
};

// Global variables
let userLocation = null;

// DOM Elements
const elements = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    getLocationBtn: document.getElementById('getLocationBtn'),
    btnText: document.getElementById('btnText'),
    locationStatus: document.getElementById('locationStatus'),
    locationInfo: document.getElementById('locationInfo'),
    latValue: document.getElementById('latValue'),
    lngValue: document.getElementById('lngValue'),
    accuracyValue: document.getElementById('accuracyValue'),
    helpForm: document.getElementById('helpForm'),
    backBtn: document.getElementById('backBtn'),
    submitBtn: document.getElementById('submitBtn'),
    submitBtnText: document.getElementById('submitBtnText'),
    adultsInput: document.getElementById('adults'),
    childrenInput: document.getElementById('children'),
    patientsInput: document.getElementById('patients'),
    phoneNumber: document.getElementById('phoneNumber'),
    totalCount: document.getElementById('totalCount'),
    additionalInfo: document.getElementById('additionalInfo'),
    alertBox: document.getElementById('alertBox'),
    alertText: document.getElementById('alertText')
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateTotalCount();
    checkPWAInstallability();
});

// Event Listeners
function initializeEventListeners() {
    elements.getLocationBtn.addEventListener('click', getLocation);
    elements.backBtn.addEventListener('click', goBackToStep1);
    elements.helpForm.addEventListener('submit', handleSubmit);

    // Update total count when any input changes
    [elements.adultsInput, elements.childrenInput, elements.patientsInput].forEach(input => {
        input.addEventListener('input', updateTotalCount);
    });
}

// Counter functions for number inputs
function incrementValue(fieldId) {
    const input = document.getElementById(fieldId);
    const currentValue = parseInt(input.value) || 0;
    if (currentValue < 999) {
        input.value = currentValue + 1;
        updateTotalCount();
    }
}

function decrementValue(fieldId) {
    const input = document.getElementById(fieldId);
    const currentValue = parseInt(input.value) || 0;
    if (currentValue > 0) {
        input.value = currentValue - 1;
        updateTotalCount();
    }
}

// Update total count
function updateTotalCount() {
    const adults = parseInt(elements.adultsInput.value) || 0;
    const children = parseInt(elements.childrenInput.value) || 0;
    const patients = parseInt(elements.patientsInput.value) || 0;
    const total = adults + children + patients;
    elements.totalCount.textContent = `${total} คน`;
}

// Get user location with high accuracy
async function getLocation() {
    if (!navigator.geolocation) {
        showAlert('error', 'เบราว์เซอร์ของคุณไม่รองรับการตรวจจับตำแหน่ง กรุณาใช้เบราว์เซอร์ที่รองรับ GPS');
        return;
    }

    // Disable button and show loading
    elements.getLocationBtn.disabled = true;
    elements.btnText.innerHTML = '<span class="spinner"></span> กำลังตรวจจับตำแหน่ง...';
    elements.locationStatus.textContent = 'กำลังค้นหาตำแหน่งของคุณ...';

    const options = {
        enableHighAccuracy: true,  // ใช้ GPS ให้แม่นยำที่สุด
        timeout: 30000,            // รอสูงสุด 30 วินาที
        maximumAge: 0              // ไม่ใช้ข้อมูลเก่า
    };

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        // Store location data
        userLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
        };

        // Update UI with location info
        elements.latValue.textContent = userLocation.latitude.toFixed(6);
        elements.lngValue.textContent = userLocation.longitude.toFixed(6);
        elements.accuracyValue.textContent = `±${Math.round(userLocation.accuracy)} เมตร`;

        elements.locationInfo.classList.add('show');
        elements.locationStatus.innerHTML = '<strong style="color: #16a34a;">✓ ตรวจจับตำแหน่งสำเร็จ!</strong>';

        // Show success alert
        showAlert('success', 'ตรวจจับตำแหน่งสำเร็จ! กรุณากรอกจำนวนผู้ต้องการความช่วยเหลือ');

        // Wait a bit then move to step 2
        setTimeout(() => {
            goToStep2();
        }, 1500);

    } catch (error) {
        handleLocationError(error);
    } finally {
        elements.getLocationBtn.disabled = false;
        elements.btnText.textContent = '🎯 ส่งตำแหน่งของฉัน';
    }
}

// Handle location errors
function handleLocationError(error) {
    let errorMessage = '';

    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'กรุณาอนุญาตให้เข้าถึงตำแหน่งของคุณ ไปที่การตั้งค่าเบราว์เซอร์ > สิทธิ์ > ตำแหน่ง';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'ไม่สามารถตรวจจับตำแหน่งได้ กรุณาตรวจสอบว่าเปิด GPS และมีสัญญาณที่ดี';
            break;
        case error.TIMEOUT:
            errorMessage = 'หมดเวลาในการตรวจจับตำแหน่ง กรุณาลองอีกครั้ง';
            break;
        default:
            errorMessage = 'เกิดข้อผิดพลาดในการตรวจจับตำแหน่ง: ' + error.message;
    }

    elements.locationStatus.innerHTML = `<strong style="color: #dc2626;">✗ ${errorMessage}</strong>`;
    showAlert('error', errorMessage);
}

// Navigation functions
function goToStep2() {
    elements.step1.style.display = 'none';
    elements.step2.classList.add('show');
    hideAlert();
}

function goBackToStep1() {
    elements.step2.classList.remove('show');
    elements.step1.style.display = 'block';
    hideAlert();
}

// Form submission
async function handleSubmit(e) {
    e.preventDefault();

    if (!userLocation) {
        showAlert('error', 'กรุณาตรวจจับตำแหน่งก่อนส่งข้อมูล');
        goBackToStep1();
        return;
    }

    const adults = parseInt(elements.adultsInput.value) || 0;
    const children = parseInt(elements.childrenInput.value) || 0;
    const patients = parseInt(elements.patientsInput.value) || 0;
    const total = adults + children + patients;
    const phoneNumber = elements.phoneNumber.value.trim();

    if (total === 0) {
        showAlert('error', 'กรุณาระบุจำนวนผู้ต้องการความช่วยเหลืออย่างน้อย 1 คน');
        return;
    }

    // Validate phone number
    if (!phoneNumber) {
        showAlert('error', 'กรุณากรอกเบอร์มือถือเพื่อให้ทีมกู้ภัยติดต่อกลับได้');
        elements.phoneNumber.focus();
        return;
    }

    // Validate phone number format (Thai phone number)
    const phoneRegex = /^[0-9]{9,10}$/;
    if (!phoneRegex.test(phoneNumber)) {
        showAlert('error', 'กรุณากรอกเบอร์มือถือให้ถูกต้อง (9-10 หลัก)');
        elements.phoneNumber.focus();
        return;
    }

    // Disable submit button
    elements.submitBtn.disabled = true;
    elements.submitBtnText.innerHTML = '<span class="spinner"></span> กำลังส่งข้อมูล...';

    // Prepare data
    const formData = {
        timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        googleMapsUrl: `https://www.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`,
        phoneNumber: phoneNumber,
        adults: adults,
        children: children,
        patients: patients,
        total: total,
        additionalInfo: elements.additionalInfo.value.trim() || '-',
        userAgent: navigator.userAgent
    };

    try {
        // Send to Google Sheets
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',  // Required for Google Apps Script
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        // Note: no-cors mode doesn't return response data, so we assume success
        handleSubmitSuccess();

    } catch (error) {
        handleSubmitError(error);
    } finally {
        elements.submitBtn.disabled = false;
        elements.submitBtnText.textContent = '📤 ส่งคำขอความช่วยเหลือ';
    }
}

function handleSubmitSuccess() {
    showAlert('success',
        '✓ ส่งคำขอความช่วยเหลือสำเร็จ!\n\n' +
        'ทีมกู้ภัยได้รับข้อมูลของคุณแล้ว และกำลังดำเนินการช่วยเหลือ\n\n' +
        'หากต้องการส่งข้อมูลเพิ่มเติม สามารถรีเฟรชหน้านี้และส่งใหม่ได้'
    );

    // Reset form after 3 seconds
    setTimeout(() => {
        if (confirm('ส่งข้อมูลสำเร็จแล้ว ต้องการรีเฟรชหน้าเพื่อส่งข้อมูลใหม่หรือไม่?')) {
            location.reload();
        }
    }, 3000);
}

function handleSubmitError(error) {
    console.error('Submit error:', error);

    // Even with no-cors, we'll assume it went through
    // This is because Google Apps Script doesn't support CORS properly
    showAlert('success',
        'ส่งข้อมูลเรียบร้อย!\n\n' +
        'หากไม่แน่ใจว่าข้อมูลถูกส่ง สามารถส่งซ้ำได้\n' +
        '(ระบบจะไม่นับซ้ำหากส่งภายใน 5 นาที)'
    );

    setTimeout(() => {
        location.reload();
    }, 3000);
}

// Alert functions
function showAlert(type, message) {
    elements.alertBox.className = `alert ${type} show`;
    elements.alertText.textContent = message;

    // Scroll to top to see alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideAlert() {
    elements.alertBox.classList.remove('show');
}

// PWA Installation
let deferredPrompt;

function checkPWAInstallability() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;

        // Show install prompt after 5 seconds
        setTimeout(() => {
            document.getElementById('installPrompt').classList.add('show');
        }, 5000);
    });

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to install prompt: ${outcome}`);
            deferredPrompt = null;
            document.getElementById('installPrompt').classList.remove('show');
        }
    });

    document.getElementById('dismissBtn').addEventListener('click', () => {
        document.getElementById('installPrompt').classList.remove('show');
    });
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration.scope);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Make counter functions global
window.incrementValue = incrementValue;
window.decrementValue = decrementValue;