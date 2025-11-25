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

    // เปิด Google Sheet
    const sheet = getOrCreateSheet();

    // ตรวจสอบว่ามี Header แล้วหรือยัง
    if (sheet.getLastRow() === 0) {
      createHeaders(sheet);
    }

    // เพิ่มข้อมูลลงในแถวใหม่
    addNewRow(sheet, data);

    // ส่ง Response กลับ
    return ContentService
      .createTextOutput(JSON.stringify({
        'status': 'success',
        'message': 'บันทึกข้อมูลสำเร็จ',
        'timestamp': new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

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

// ===== ฟังก์ชันสำหรับรับ GET Request (ทดสอบว่า Deploy สำเร็จ) =====
function doGet(e) {
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
  "adults": 2,
  "children": 1,
  "patients": 0,
  "total": 3,
  "additionalInfo": "ต้องการน้ำดื่ม"
}
    </pre>
  `);
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
    'ผู้ใหญ่',
    'เด็ก',
    'ผู้ป่วย/ผู้สูงอายุ',
    'รวมจำนวนคน',
    'ข้อมูลเพิ่มเติม',
    'สถานะ',
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
  sheet.setColumnWidth(7, 80);   // ผู้ใหญ่
  sheet.setColumnWidth(8, 80);   // เด็ก
  sheet.setColumnWidth(9, 120);  // ผู้ป่วย
  sheet.setColumnWidth(10, 100); // รวม
  sheet.setColumnWidth(11, 250); // ข้อมูลเพิ่มเติม
  sheet.setColumnWidth(12, 120); // สถานะ
  sheet.setColumnWidth(13, 200); // หมายเหตุ
  sheet.setColumnWidth(14, 150); // User Agent

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
    data.adults || 0,                 // ผู้ใหญ่
    data.children || 0,               // เด็ก
    data.patients || 0,               // ผู้ป่วย
    data.total || 0,                  // รวม
    data.additionalInfo || '-',       // ข้อมูลเพิ่มเติม
    '🆕 รอดำเนินการ',                // สถานะ
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
  sheet.getRange(rowNumber, 7, 1, 4).setNumberFormat('0');        // จำนวนคน

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