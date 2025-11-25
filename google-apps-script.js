/**
 * Google Apps Script สำหรับรับข้อมูลจาก Web Application
 * และบันทึกลง Google Sheets
 *
 * วิธีการติดตั้ง:
 * 1. ไปที่ https://script.google.com
 * 2. สร้างโปรเจกต์ใหม่ (New Project)
 * 3. คัดลอกโค้ดนี้ทั้งหมดไปวาง
 * 4. แก้ไข SHEET_ID ให้ตรงกับ Google Sheet ของคุณ
 * 5. Deploy > New deployment
 * 6. เลือก Type: Web app
 * 7. Execute as: Me
 * 8. Who has access: Anyone
 * 9. คัดลอก Web app URL ไปใส่ใน app.js (CONFIG.GOOGLE_SCRIPT_URL)
 */

// ===== การตั้งค่า =====
const SHEET_ID = '1QTUesu1-VzjymPDbRK_inT6206xhmkFwCQiQEPZU76c'; // ใส่ Sheet ID ของคุณที่นี่
// ตัวอย่าง: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
// หา Sheet ID ได้จาก URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit

const SHEET_NAME = 'คำขอความช่วยเหลือ'; // ชื่อ Sheet (Tab)

// ===== ฟังก์ชันหลักสำหรับรับ POST Request =====
function doPost(e) {
  try {
    // รับข้อมูลที่ส่งมา
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // เปิด Google Sheet
    const sheet = getOrCreateSheet();

    // ตรวจสอบว่ามี Header แล้วหรือยัง
    if (sheet.getLastRow() === 0) {
      createHeaders(sheet);
    }

    // Route based on action
    if (action === 'claimRequest') {
      return handleClaimRequest(sheet, data);
    } else if (action === 'completeRequest') {
      return handleCompleteRequest(sheet, data);
    } else if (action === 'releaseRequest') {
      return handleReleaseRequest(sheet, data);
    } else {
      // Default: เพิ่มข้อมูลลงในแถวใหม่
      addNewRow(sheet, data);

      // ส่ง Response กลับ
      return ContentService
        .createTextOutput(JSON.stringify({
          'status': 'success',
          'message': 'บันทึกข้อมูลสำเร็จ',
          'timestamp': new Date().toISOString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    Logger.log('Error: ' + error.toString());

    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'error',
        'message': error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===== ฟังก์ชันสำหรับรับ GET Request =====
function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback;

  // Handle different actions
  if (action === 'getRequests') {
    return handleGetRequests();
  } else if (action === 'claimRequest') {
    const sheet = getOrCreateSheet();
    const result = handleClaimRequest(sheet, e.parameter);
    return createJSONPResponse(result, callback);
  } else if (action === 'completeRequest') {
    const sheet = getOrCreateSheet();
    const result = handleCompleteRequest(sheet, e.parameter);
    return createJSONPResponse(result, callback);
  } else if (action === 'releaseRequest') {
    const sheet = getOrCreateSheet();
    const result = handleReleaseRequest(sheet, e.parameter);
    return createJSONPResponse(result, callback);
  }

  // Default: Test page
  return HtmlService.createHtmlOutput(`
    <h1>🆘 ระบบขอความช่วยเหลือ - Google Apps Script</h1>
    <p>✅ ระบบทำงานปกติ</p>
    <p><strong>เวลาปัจจุบัน:</strong> ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
    <p><strong>Sheet ID:</strong> ${SHEET_ID}</p>
    <hr>
    <p>สำหรับทดสอบ POST Request กรุณาใช้ Web Application หรือ Postman</p>
    <pre>
POST URL: ${ScriptApp.getService().getUrl()}
Content-Type: application/json

Body Example:
{
  "timestamp": "2024-01-20 14:30:00",
  "latitude": 13.7563,
  "longitude": 100.5018,
  "accuracy": 10,
  "googleMapsUrl": "https://www.google.com/maps?q=13.7563,100.5018",
  "phoneNumber": "0812345678",
  "adults": 2,
  "children": 1,
  "patients": 0,
  "total": 3,
  "additionalInfo": "ต้องการน้ำดื่ม"
}
    </pre>
  `);
}

// ===== Helper: Create JSONP Response =====
function createJSONPResponse(contentServiceResult, callback) {
  if (!callback) {
    return contentServiceResult;
  }

  try {
    // Extract JSON from ContentService result
    const jsonString = contentServiceResult.getContent();
    const jsonpResponse = `${callback}(${jsonString})`;

    return ContentService
      .createTextOutput(jsonpResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    Logger.log('JSONP Error: ' + error.toString());
    const errorResponse = `${callback}(${JSON.stringify({status: 'error', message: error.toString()})})`;
    return ContentService
      .createTextOutput(errorResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// ===== เปิดหรือสร้าง Sheet =====
function getOrCreateSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // ถ้ายังไม่มี Sheet ให้สร้างใหม่
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    Logger.log('Created new sheet: ' + SHEET_NAME);
  }

  return sheet;
}

// ===== สร้าง Headers =====
function createHeaders(sheet) {
  const headers = [
    'เลขที่',
    'วันที่/เวลาที่ส่งข้อมูล',
    'Latitude',
    'Longitude',
    'ความแม่นยำ (เมตร)',
    'Google Maps Link',
    'เบอร์มือถือ',
    'ผู้ใหญ่',
    'เด็ก',
    'ผู้ป่วย/ผู้สูงอายุ',
    'รวมจำนวนคน',
    'ข้อมูลเพิ่มเติม',
    'สถานะ',
    'ผู้รับงาน (Claimed By)',
    'เวลารับงาน (Claimed At)',
    'หมายเหตุ',
    'User Agent'
  ];

  // เขียน Headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Format Headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#dc2626');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');

  // ตั้งค่าความกว้างของคอลัมน์
  sheet.setColumnWidth(1, 60);   // เลขที่
  sheet.setColumnWidth(2, 150);  // วันที่/เวลา
  sheet.setColumnWidth(3, 100);  // Latitude
  sheet.setColumnWidth(4, 100);  // Longitude
  sheet.setColumnWidth(5, 120);  // ความแม่นยำ
  sheet.setColumnWidth(6, 200);  // Google Maps Link
  sheet.setColumnWidth(7, 120);  // เบอร์มือถือ
  sheet.setColumnWidth(8, 80);   // ผู้ใหญ่
  sheet.setColumnWidth(9, 80);   // เด็ก
  sheet.setColumnWidth(10, 120); // ผู้ป่วย
  sheet.setColumnWidth(11, 100); // รวม
  sheet.setColumnWidth(12, 250); // ข้อมูลเพิ่มเติม
  sheet.setColumnWidth(13, 120); // สถานะ
  sheet.setColumnWidth(14, 200); // ผู้รับงาน
  sheet.setColumnWidth(15, 150); // เวลารับงาน
  sheet.setColumnWidth(16, 200); // หมายเหตุ
  sheet.setColumnWidth(17, 150); // User Agent

  // Freeze header row
  sheet.setFrozenRows(1);

  Logger.log('Headers created');
}

// ===== เพิ่มข้อมูลแถวใหม่ =====
function addNewRow(sheet, data) {
  const lastRow = sheet.getLastRow();
  const rowNumber = lastRow + 1;
  const requestNumber = lastRow; // เลขที่คำขอ (ไม่นับ header)

  // สร้าง Google Maps Link แบบ Hyperlink
  const mapsUrl = data.googleMapsUrl ||
    `https://www.google.com/maps?q=${data.latitude},${data.longitude}`;

  const mapsLink = `=HYPERLINK("${mapsUrl}", "📍 ดูแผนที่")`;

  // เตรียมข้อมูล
  const rowData = [
    requestNumber,                    // เลขที่
    data.timestamp,                   // วันที่/เวลา
    data.latitude,                    // Latitude
    data.longitude,                   // Longitude
    Math.round(data.accuracy),        // ความแม่นยำ
    mapsLink,                         // Google Maps Link
    data.phoneNumber || '-',          // เบอร์มือถือ
    data.adults || 0,                 // ผู้ใหญ่
    data.children || 0,               // เด็ก
    data.patients || 0,               // ผู้ป่วย
    data.total || 0,                  // รวม
    data.additionalInfo || '-',       // ข้อมูลเพิ่มเติม
    '🆕 รอดำเนินการ',                // สถานะ
    '',                               // ผู้รับงาน
    '',                               // เวลารับงาน
    '',                               // หมายเหตุ
    data.userAgent || '-'             // User Agent
  ];

  // เขียนข้อมูล
  sheet.getRange(rowNumber, 1, 1, rowData.length).setValues([rowData]);

  // Format แถวใหม่
  const newRowRange = sheet.getRange(rowNumber, 1, 1, rowData.length);

  // สลับสีแถว
  if (rowNumber % 2 === 0) {
    newRowRange.setBackground('#f8fafc');
  }

  // Format ตัวเลข
  sheet.getRange(rowNumber, 3, 1, 2).setNumberFormat('0.000000'); // Lat/Lng
  sheet.getRange(rowNumber, 8, 1, 4).setNumberFormat('0');        // จำนวนคน

  // Highlight แถวใหม่ชั่วคราว (จะหายใน 1 นาที)
  newRowRange.setBackground('#fef2f2');

  // ส่งการแจ้งเตือน (ถ้ามีการตั้งค่า)
  sendNotification(data, requestNumber);

  Logger.log('Added row ' + rowNumber + ' with request #' + requestNumber);
}

// ===== ส่งการแจ้งเตือน (Optional) =====
function sendNotification(data, requestNumber) {
  // คุณสามารถเพิ่มการส่ง Email หรือ Line Notify ที่นี่
  // ตัวอย่าง: ส่ง Email

  /*
  const email = 'your-email@example.com';
  const subject = `🆘 คำขอความช่วยเหลือใหม่ #${requestNumber}`;
  const body = `
มีคำขอความช่วยเหลือใหม่เข้ามาในระบบ

เลขที่: ${requestNumber}
วันที่/เวลา: ${data.timestamp}
ตำแหน่ง: ${data.latitude}, ${data.longitude}
Google Maps: ${data.googleMapsUrl}

ผู้ติดต่อ: ${data.phoneNumber}

จำนวนผู้ประสบภัย:
- ผู้ใหญ่: ${data.adults} คน
- เด็ก: ${data.children} คน
- ผู้ป่วย/ผู้สูงอายุ: ${data.patients} คน
รวม: ${data.total} คน

ข้อมูลเพิ่มเติม:
${data.additionalInfo}

กรุณาตรวจสอบและดำเนินการช่วยเหลือโดยเร็วที่สุด
  `;

  MailApp.sendEmail(email, subject, body);
  */

  Logger.log('Notification sent for request #' + requestNumber);
}

// ===== ฟังก์ชันช่วยเหลือ: ทดสอบการทำงาน =====
function testAddSampleData() {
  const sampleData = {
    timestamp: new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }),
    latitude: 13.7563,
    longitude: 100.5018,
    accuracy: 10,
    googleMapsUrl: 'https://www.google.com/maps?q=13.7563,100.5018',
    phoneNumber: '0812345678',
    adults: 2,
    children: 1,
    patients: 0,
    total: 3,
    additionalInfo: 'ทดสอบระบบ - ต้องการน้ำดื่ม',
    userAgent: 'Test Script'
  };

  const sheet = getOrCreateSheet();

  if (sheet.getLastRow() === 0) {
    createHeaders(sheet);
  }

  addNewRow(sheet, sampleData);

  Logger.log('Sample data added successfully');
  return 'ทดสอบเพิ่มข้อมูลสำเร็จ';
}

// ===== ฟังก์ชันช่วยเหลือ: อัพเดตสถานะ =====
function updateStatus(rowNumber, newStatus, note = '') {
  const sheet = getOrCreateSheet();

  // อัพเดตสถานะ (คอลัมน์ 12)
  sheet.getRange(rowNumber, 12).setValue(newStatus);

  // อัพเดตหมายเหตุ (คอลัมน์ 13)
  if (note) {
    const currentNote = sheet.getRange(rowNumber, 13).getValue();
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const newNote = `[${timestamp}] ${note}\n${currentNote}`;
    sheet.getRange(rowNumber, 13).setValue(newNote);
  }

  // เปลี่ยนสีตามสถานะ
  const rowRange = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());

  if (newStatus.includes('เสร็จสิ้น') || newStatus.includes('✓')) {
    rowRange.setBackground('#dcfce7'); // เขียวอ่อน
  } else if (newStatus.includes('กำลังดำเนินการ')) {
    rowRange.setBackground('#fef9c3'); // เหลืองอ่อน
  } else if (newStatus.includes('ยกเลิก')) {
    rowRange.setBackground('#f1f5f9'); // เทาอ่อน
  }

  Logger.log(`Updated row ${rowNumber}: ${newStatus}`);
}

// ===== ตัวอย่างการใช้งาน updateStatus =====
// updateStatus(2, '🚁 กำลังดำเนินการ', 'ทีมกู้ภัยออกเดินทาง');
// updateStatus(2, '✅ เสร็จสิ้น', 'ช่วยเหลือสำเร็จ');

// ===== API สำหรับ Admin Dashboard =====

// Get all requests
function handleGetRequests() {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      // No data (only header or empty)
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          data: [],
          count: 0
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get all data
    const range = sheet.getRange(2, 1, lastRow - 1, 17); // columns A to Q
    const values = range.getValues();

    // Convert to JSON
    const requests = values.map((row, index) => {
      return {
        requestNumber: row[0] || (index + 1),
        timestamp: row[1] || '',
        latitude: row[2] || 0,
        longitude: row[3] || 0,
        accuracy: row[4] || 0,
        googleMapsUrl: row[5] ? row[5].toString().match(/HYPERLINK\("([^"]+)"/)?.[1] || `https://www.google.com/maps?q=${row[2]},${row[3]}` : '',
        phoneNumber: row[6] || '',
        adults: row[7] || 0,
        children: row[8] || 0,
        patients: row[9] || 0,
        total: row[10] || 0,
        additionalInfo: row[11] || '',
        status: row[12] || '🆕 รอดำเนินการ',
        claimedBy: row[13] || '',
        claimedAt: row[14] || '',
        note: row[15] || '',
        userAgent: row[16] || ''
      };
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        data: requests,
        count: requests.length
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleGetRequests: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Claim a request
function handleClaimRequest(sheet, data) {
  try {
    const requestNumber = parseInt(data.requestNumber);
    const claimedBy = data.claimedBy || '';

    // Find the row
    const lastRow = sheet.getLastRow();
    const requestNumbers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowNumber = -1;

    for (let i = 0; i < requestNumbers.length; i++) {
      if (requestNumbers[i][0] == requestNumber) {
        rowNumber = i + 2; // +2 because array is 0-indexed and we skip header
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error('ไม่พบคำขอนี้');
    }

    // Check if already claimed
    const currentClaimedBy = sheet.getRange(rowNumber, 14).getValue();
    if (currentClaimedBy && currentClaimedBy !== '') {
      throw new Error('คำขอนี้ถูกรับงานแล้ว');
    }

    // Check current status
    const currentStatus = sheet.getRange(rowNumber, 13).getValue();
    if (currentStatus && (currentStatus.includes('เสร็จสิ้น') || currentStatus.includes('completed'))) {
      throw new Error('คำขอนี้เสร็จสิ้นแล้ว');
    }

    // Claim the request
    sheet.getRange(rowNumber, 13).setValue('🚁 กำลังดำเนินการ'); // Status
    sheet.getRange(rowNumber, 14).setValue(claimedBy); // Claimed By
    sheet.getRange(rowNumber, 15).setValue(new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })); // Claimed At

    // Highlight row
    const rowRange = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());
    rowRange.setBackground('#fef9c3'); // Yellow

    Logger.log(`Request #${requestNumber} claimed by ${claimedBy}`);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'รับงานสำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleClaimRequest: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Complete a request
function handleCompleteRequest(sheet, data) {
  try {
    const requestNumber = parseInt(data.requestNumber);
    const note = decodeURIComponent(data.note || 'เสร็จสิ้น');
    const completedBy = data.completedBy || '';

    // Find the row
    const lastRow = sheet.getLastRow();
    const requestNumbers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowNumber = -1;

    for (let i = 0; i < requestNumbers.length; i++) {
      if (requestNumbers[i][0] == requestNumber) {
        rowNumber = i + 2;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error('ไม่พบคำขอนี้');
    }

    // Check if claimed by the same user
    const claimedBy = sheet.getRange(rowNumber, 14).getValue();
    if (claimedBy !== completedBy) {
      throw new Error('คุณไม่สามารถทำรายการนี้ให้เสร็จสิ้นได้ เนื่องจากไม่ได้เป็นผู้รับงาน');
    }

    // Update status
    sheet.getRange(rowNumber, 13).setValue('✅ เสร็จสิ้น');

    // Update note
    const currentNote = sheet.getRange(rowNumber, 16).getValue();
    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const newNote = `[${timestamp}] ${note}\n${currentNote}`;
    sheet.getRange(rowNumber, 16).setValue(newNote);

    // Highlight row
    const rowRange = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());
    rowRange.setBackground('#dcfce7'); // Green

    Logger.log(`Request #${requestNumber} completed by ${completedBy}`);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'บันทึกเสร็จสิ้น'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleCompleteRequest: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Release a request
function handleReleaseRequest(sheet, data) {
  try {
    const requestNumber = parseInt(data.requestNumber);
    const releasedBy = data.releasedBy || '';

    // Find the row
    const lastRow = sheet.getLastRow();
    const requestNumbers = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let rowNumber = -1;

    for (let i = 0; i < requestNumbers.length; i++) {
      if (requestNumbers[i][0] == requestNumber) {
        rowNumber = i + 2;
        break;
      }
    }

    if (rowNumber === -1) {
      throw new Error('ไม่พบคำขอนี้');
    }

    // Check if claimed by the same user
    const claimedBy = sheet.getRange(rowNumber, 14).getValue();
    if (claimedBy !== releasedBy) {
      throw new Error('คุณไม่สามารถปล่อยงานนี้ได้ เนื่องจากไม่ได้เป็นผู้รับงาน');
    }

    // Release the request
    sheet.getRange(rowNumber, 13).setValue('🆕 รอดำเนินการ'); // Status
    sheet.getRange(rowNumber, 14).setValue(''); // Clear Claimed By
    sheet.getRange(rowNumber, 15).setValue(''); // Clear Claimed At

    // Reset row color
    const rowRange = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn());
    if (rowNumber % 2 === 0) {
      rowRange.setBackground('#f8fafc');
    } else {
      rowRange.setBackground('#ffffff');
    }

    Logger.log(`Request #${requestNumber} released by ${releasedBy}`);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'ปล่อยงานสำเร็จ'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error in handleReleaseRequest: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}