// Configuration
const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyf-VIeKrWnYOZw1UEsbCh3KjWoIkSiSbiCivAorOAQ9tpZa5YilJ_kswb3nLNvr2fB/exec',
    AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
    CLAIM_TIMEOUT: 1800000 // 30 minutes
};

// Global state
let allData = [];
let currentUser = localStorage.getItem('adminUser') || generateUserId();
let autoRefreshTimer = null;

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refreshBtn'),
    refreshText: document.getElementById('refreshText'),
    statusFilter: document.getElementById('statusFilter'),
    searchBox: document.getElementById('searchBox'),
    tableBody: document.getElementById('tableBody'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    totalCount: document.getElementById('totalCount'),
    pendingCount: document.getElementById('pendingCount'),
    inProgressCount: document.getElementById('inProgressCount'),
    completedCount: document.getElementById('completedCount')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Save user ID
    localStorage.setItem('adminUser', currentUser);

    // Event listeners
    elements.refreshBtn.addEventListener('click', loadData);
    elements.statusFilter.addEventListener('change', filterAndRenderData);
    elements.searchBox.addEventListener('input', filterAndRenderData);

    // Initial load
    loadData();

    // Auto refresh
    startAutoRefresh();
}

// Generate unique user ID
function generateUserId() {
    return 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Load data from Google Sheets
async function loadData() {
    try {
        // Disable refresh button
        elements.refreshBtn.disabled = true;
        elements.refreshText.innerHTML = '<span class="spinner"></span> กำลังโหลด...';

        // Fetch data
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL + '?action=getRequests');

        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }

        const result = await response.json();

        if (result.status === 'success') {
            allData = result.data || [];
            filterAndRenderData();
            updateStatistics();
            showNotification('โหลดข้อมูลสำเร็จ', 'success');
        } else {
            throw new Error(result.message || 'Unknown error');
        }

    } catch (error) {
        console.error('Load data error:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูล', 'error');
        renderEmptyState('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshText.textContent = 'รีเฟรชข้อมูล';
    }
}

// Filter and render data
function filterAndRenderData() {
    const statusFilter = elements.statusFilter.value;
    const searchQuery = elements.searchBox.value.toLowerCase().trim();

    let filteredData = allData;

    // Filter by status
    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(item => {
            const status = normalizeStatus(item.status);
            return status === statusFilter;
        });
    }

    // Filter by search
    if (searchQuery) {
        filteredData = filteredData.filter(item => {
            return (
                (item.phoneNumber && item.phoneNumber.toLowerCase().includes(searchQuery)) ||
                (item.additionalInfo && item.additionalInfo.toLowerCase().includes(searchQuery)) ||
                (item.requestNumber && item.requestNumber.toString().includes(searchQuery))
            );
        });
    }

    renderTable(filteredData);
}

// Normalize status for filtering
function normalizeStatus(status) {
    if (!status) return 'pending';

    const statusLower = status.toLowerCase();

    if (statusLower.includes('รอดำเนินการ') || statusLower.includes('pending')) {
        return 'pending';
    } else if (statusLower.includes('กำลังดำเนินการ') || statusLower.includes('in progress') || statusLower.includes('claimed')) {
        return 'in-progress';
    } else if (statusLower.includes('เสร็จสิ้น') || statusLower.includes('completed')) {
        return 'completed';
    }

    return 'pending';
}

// Render table
function renderTable(data) {
    if (data.length === 0) {
        renderEmptyState('ไม่พบข้อมูลตามเงื่อนไขที่เลือก');
        return;
    }

    const html = data.map(item => {
        const status = normalizeStatus(item.status);
        const isClaimed = item.claimedBy && item.claimedBy !== '';
        const isClaimedByMe = item.claimedBy === currentUser;
        const canClaim = status === 'pending' && !isClaimed;
        const canComplete = isClaimedByMe && status === 'in-progress';
        const canRelease = isClaimedByMe && status === 'in-progress';

        return `
            <tr data-id="${item.requestNumber}">
                <td><strong>#${item.requestNumber}</strong></td>
                <td style="white-space: nowrap;">${item.timestamp || '-'}</td>
                <td>
                    <a href="${item.googleMapsUrl}" target="_blank" class="link-maps">
                        📍 ดูแผนที่
                    </a>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
                        ${item.latitude ? item.latitude.toFixed(5) : '-'}, ${item.longitude ? item.longitude.toFixed(5) : '-'}
                    </div>
                </td>
                <td>
                    <div class="phone-number">${item.phoneNumber || '-'}</div>
                </td>
                <td>
                    <div style="font-size: 13px;">
                        👨‍👩‍👧‍👦 ${item.adults || 0} | 👶 ${item.children || 0} | 🏥 ${item.patients || 0}
                    </div>
                    <div style="font-weight: 700; margin-top: 4px;">
                        รวม: ${item.total || 0} คน
                    </div>
                </td>
                <td>
                    <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis;">
                        ${item.additionalInfo || '-'}
                    </div>
                </td>
                <td>
                    <div class="status-badge status-${status}">
                        ${getStatusText(status)}
                    </div>
                    ${isClaimed ? `
                        <div class="claimed-by">
                            👤 ${isClaimedByMe ? 'คุณ' : 'ผู้อื่น'}
                            ${item.claimedAt ? '<br>' + new Date(item.claimedAt).toLocaleString('th-TH') : ''}
                        </div>
                    ` : ''}
                </td>
                <td>
                    <div class="action-buttons">
                        ${canClaim ? `
                            <button class="btn-claim" onclick="claimRequest(${item.requestNumber})">
                                🔒 รับงาน
                            </button>
                        ` : ''}
                        ${canComplete ? `
                            <button class="btn-complete" onclick="completeRequest(${item.requestNumber})">
                                ✅ เสร็จสิ้น
                            </button>
                        ` : ''}
                        ${canRelease ? `
                            <button class="btn-release" onclick="releaseRequest(${item.requestNumber})">
                                🔓 ปล่อยงาน
                            </button>
                        ` : ''}
                        ${!canClaim && !canComplete && !canRelease ? `
                            <span style="color: #94a3b8; font-size: 13px;">-</span>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    elements.tableBody.innerHTML = html;
}

// Render empty state
function renderEmptyState(message) {
    elements.tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div>${message}</div>
            </td>
        </tr>
    `;
}

// Get status text
function getStatusText(status) {
    switch(status) {
        case 'pending':
            return '🆕 รอดำเนินการ';
        case 'in-progress':
            return '🚁 กำลังดำเนินการ';
        case 'completed':
            return '✅ เสร็จสิ้น';
        default:
            return status;
    }
}

// Update statistics
function updateStatistics() {
    const total = allData.length;
    const pending = allData.filter(item => normalizeStatus(item.status) === 'pending').length;
    const inProgress = allData.filter(item => normalizeStatus(item.status) === 'in-progress').length;
    const completed = allData.filter(item => normalizeStatus(item.status) === 'completed').length;

    elements.totalCount.textContent = total;
    elements.pendingCount.textContent = pending;
    elements.inProgressCount.textContent = inProgress;
    elements.completedCount.textContent = completed;
}

// Claim request
async function claimRequest(requestNumber) {
    if (!confirm(`ยืนยันการรับงาน #${requestNumber}?`)) {
        return;
    }

    try {
        showLoading(true);

        // Use GET request with JSONP callback to avoid CORS
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?action=claimRequest&requestNumber=${requestNumber}&claimedBy=${encodeURIComponent(currentUser)}&callback=handleClaimResponse`;

        // Create script tag for JSONP
        const script = document.createElement('script');
        script.src = url;

        // Set up callback
        window.handleClaimResponse = function(result) {
            if (result.status === 'success') {
                showNotification('รับงานสำเร็จ!', 'success');
                loadData();
            } else {
                showNotification('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถรับงานได้'), 'error');
            }
            showLoading(false);
            document.body.removeChild(script);
            delete window.handleClaimResponse;
        };

        document.body.appendChild(script);

        // Timeout fallback
        setTimeout(() => {
            if (window.handleClaimResponse) {
                showNotification('รับงานสำเร็จ! กำลังรีเฟรชข้อมูล...', 'success');
                loadData();
                showLoading(false);
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                delete window.handleClaimResponse;
            }
        }, 3000);

    } catch (error) {
        console.error('Claim error:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
        showLoading(false);
    }
}

// Complete request
async function completeRequest(requestNumber) {
    const note = prompt(`บันทึกการช่วยเหลือ #${requestNumber}:`, 'ช่วยเหลือสำเร็จ');

    if (note === null) {
        return;
    }

    try {
        showLoading(true);

        // Use GET request with JSONP
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?action=completeRequest&requestNumber=${requestNumber}&note=${encodeURIComponent(note)}&completedBy=${encodeURIComponent(currentUser)}&callback=handleCompleteResponse`;

        const script = document.createElement('script');
        script.src = url;

        window.handleCompleteResponse = function(result) {
            if (result.status === 'success') {
                showNotification('บันทึกเสร็จสิ้น!', 'success');
                loadData();
            } else {
                showNotification('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถบันทึกได้'), 'error');
            }
            showLoading(false);
            document.body.removeChild(script);
            delete window.handleCompleteResponse;
        };

        document.body.appendChild(script);

        setTimeout(() => {
            if (window.handleCompleteResponse) {
                showNotification('บันทึกเสร็จสิ้น! กำลังรีเฟรชข้อมูล...', 'success');
                loadData();
                showLoading(false);
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                delete window.handleCompleteResponse;
            }
        }, 3000);

    } catch (error) {
        console.error('Complete error:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
        showLoading(false);
    }
}

// Release request
async function releaseRequest(requestNumber) {
    if (!confirm(`ยืนยันการปล่อยงาน #${requestNumber}?`)) {
        return;
    }

    try {
        showLoading(true);

        // Use GET request with JSONP
        const url = `${CONFIG.GOOGLE_SCRIPT_URL}?action=releaseRequest&requestNumber=${requestNumber}&releasedBy=${encodeURIComponent(currentUser)}&callback=handleReleaseResponse`;

        const script = document.createElement('script');
        script.src = url;

        window.handleReleaseResponse = function(result) {
            if (result.status === 'success') {
                showNotification('ปล่อยงานสำเร็จ', 'success');
                loadData();
            } else {
                showNotification('เกิดข้อผิดพลาด: ' + (result.message || 'ไม่สามารถปล่อยงานได้'), 'error');
            }
            showLoading(false);
            document.body.removeChild(script);
            delete window.handleReleaseResponse;
        };

        document.body.appendChild(script);

        setTimeout(() => {
            if (window.handleReleaseResponse) {
                showNotification('ปล่อยงานสำเร็จ! กำลังรีเฟรชข้อมูล...', 'success');
                loadData();
                showLoading(false);
                if (script.parentNode) {
                    document.body.removeChild(script);
                }
                delete window.handleReleaseResponse;
            }
        }, 3000);

    } catch (error) {
        console.error('Release error:', error);
        showNotification('เกิดข้อผิดพลาด: ' + error.message, 'error');
        showLoading(false);
    }
}

// Show loading overlay
function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('show');
    } else {
        elements.loadingOverlay.classList.remove('show');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Simple alert for now - can be enhanced with toast notifications
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
}

// Auto refresh
function startAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }

    autoRefreshTimer = setInterval(() => {
        console.log('Auto refreshing...');
        loadData();
    }, CONFIG.AUTO_REFRESH_INTERVAL);
}

// Make functions global for onclick
window.claimRequest = claimRequest;
window.completeRequest = completeRequest;
window.releaseRequest = releaseRequest;