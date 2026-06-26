/* ============================================================
   ClassFund JS — Logic, State & Storage for Room 6/1 Class Fund
   ============================================================ */

// Fallback student database for Room 6/1 Year 2569 (36 Students)
const FALLBACK_STUDENTS = [
  { "no": 1, "id": "8990", "name": "นายณัฏฐพร โชติช่วง" },
  { "no": 2, "id": "8991", "name": "นายชลันธร เจริญพร" },
  { "no": 3, "id": "8993", "name": "นายเมธี บุญชอบ" },
  { "no": 4, "id": "8996", "name": "นายจิรศักดิ์ ธนมาก" },
  { "no": 5, "id": "8998", "name": "นายพีรเดช เมฆสง่า" },
  { "no": 6, "id": "9001", "name": "นายณัฐพงศ์ กันกลับ" },
  { "no": 7, "id": "9021", "name": "นายธนวัฒน์ คุสิน" },
  { "no": 8, "id": "9028", "name": "นายกัน" },
  { "no": 9, "id": "9114", "name": "นายสาโรจน์ สร้อยสวัสดิ์" },
  { "no": 10, "id": "9919", "name": "นายธีรภัทร เขียวคำ" },
  { "no": 11, "id": "10386", "name": "นายคมสัน สร้อยเจริญ" },
  { "no": 12, "id": "10387", "name": "นายณชยพล แสงอรุณ" },
  { "no": 13, "id": "10388", "name": "นายณัฏฐพล ดำนาน" },
  { "no": 14, "id": "10389", "name": "นายเดชาธร คุ้มสมบัติ" },
  { "no": 15, "id": "10390", "name": "นายธเนศ จุ้ยวัลลา" },
  { "no": 16, "id": "10391", "name": "นายปฏิภาณ อัมพาไพ" },
  { "no": 17, "id": "10392", "name": "นายพงศภัค อุดมผล" },
  { "no": 18, "id": "10393", "name": "นายภัทรดนัย มั่นใจ" },
  { "no": 19, "id": "10394", "name": "นายศุภกร มิ่งดอนไกล" },
  { "no": 20, "id": "10396", "name": "นายเสกสรร คงประเสริฐ" },
  { "no": 21, "id": "10837", "name": "นายชัพวิชญ์ องควิทยา" },
  { "no": 22, "id": "6811", "name": "นางสาวจินดาวดี แก้วไตรรัตน์" },
  { "no": 23, "id": "6925", "name": "นางสาวชนัญชิตา สุวรรณกูฏ" },
  { "no": 24, "id": "7526", "name": "นางสาวณัฐภัสสร เจริญหงษ์ษา" },
  { "no": 25, "id": "8669", "name": "นางสาวสุชานันท์ จันทร์เพชร" },
  { "no": 26, "id": "8670", "name": "นางสาวพิมนิภา สุขดวง" },
  { "no": 27, "id": "9007", "name": "นางสาววรัญญา จันทา" },
  { "no": 28, "id": "9009", "name": "นางสาวอรปรียา พุทธรังษี" },
  { "no": 29, "id": "9014", "name": "นางสาวธนภรณ์ วรวงค์" },
  { "no": 30, "id": "9040", "name": "นางสาววรรณญา แก่นแก้ว" },
  { "no": 31, "id": "9090", "name": "นางสาวอันดา หงษ์ทอง" },
  { "no": 32, "id": "9286", "name": "นางสาวกมลชนก นัดประสบ" },
  { "no": 33, "id": "9916", "name": "นางสาวพนิตตา แก้วน้ำรอบ" },
  { "no": 34, "id": "10398", "name": "นางสาวศศิวิมล ขำจุ้ย" },
  { "no": 35, "id": "10399", "name": "นางสาวสุธิดา จะตุคะมา" },
  { "no": 36, "id": "10400", "name": "นางสาวสุวรรณรัตน วระนาม" }
];

// App State
let state = {
  students: [],
  transactions: [],
  config: {
    goalPerPerson: 200,
    teacherName: "ครูนิวตรอน",
    currentCollectorId: "8990", // default no.1 นายณัฏฐพร โชติช่วง
    promptpayId: "091-234-5678",
    promptpayName: "นายณัฏฐพร โชติช่วง (เหรัญญิก ม.6/1)"
  },
  collectorHistory: []
};

// Search & Filter Status
let activeTab = "dashboard";
let studentSearchQuery = "";
let studentActiveFilter = "all";
let transactionActiveType = "all";
let transactionActiveDate = ""; // format YYYY-MM-DD
let userRole = "student"; // default to student read-only mode for safety! (options: student, collector, teacher)

// Base64 Temporary Slip Buffer
let tempSlipBase64 = null;

// UI Panels title mapping
const TAB_INFO = {
  dashboard: { title: "ภาพรวมเงินห้องเรียน ม.6/1", subtitle: "อัปเดตข้อมูลและสถิติตัวเลขในแบบเรียลไทม์" },
  students: { title: "ทะเบียนเงินห้องนักเรียนรายบุคคล", subtitle: "ตรวจสอบรายละเอียดและบันทึกการจ่ายเงิน" },
  transactions: { title: "ประวัติรายรับและรายจ่ายทั้งหมด", subtitle: "บันทึกบัญชีอย่างโปร่งใสพร้อมหลักฐานสลิปและใบเสร็จ" },
  settings: { title: "การตั้งค่า & ผู้ดูแลระบบห้อง", subtitle: "กำหนดเหรัญญิกห้อง ยอดเป้าหมาย และดูบันทึกการตรวจสอบได้" }
};

// Canvas digital receipt slip generator
function generateDigitalReceipt(payerName, amount, type, dateStr, refNo, collectorName, method = 'cash') {
  const canvas = document.createElement("canvas");
  canvas.width = 400;
  canvas.height = 550;
  const ctx = canvas.getContext("2d");

  // Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 550);
  grad.addColorStop(0, "#1F2937");
  grad.addColorStop(1, "#111827");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 550);

  // Border Accent Line
  ctx.fillStyle = type === "income" ? "#10B981" : "#F43F5E";
  ctx.fillRect(0, 0, 400, 8);

  // Header Logo
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 20px 'Kanit'";
  ctx.textAlign = "center";
  ctx.fillText("ClassFund ม.6/1 (ปี 2569)", 200, 45);

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "12px 'Kanit'";
  ctx.fillText("DIGITAL TRANSACTION RECEIPT", 200, 65);

  // Dash Line divider
  ctx.strokeStyle = "rgba(156, 163, 175, 0.2)";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(30, 90);
  ctx.lineTo(370, 90);
  ctx.stroke();
  ctx.setLineDash([]); // reset

  // Transaction Status
  ctx.fillStyle = type === "income" ? "#D1FAE5" : "#FFE4E6";
  ctx.fillRect(100, 110, 200, 36);
  ctx.strokeStyle = type === "income" ? "#10B981" : "#F43F5E";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(100, 110, 200, 36);

  ctx.fillStyle = type === "income" ? "#10B981" : "#F43F5E";
  ctx.font = "bold 15px 'Kanit'";
  const methodIcon = method === 'transfer' ? '📱' : '💵';
  const methodText = method === 'transfer' ? 'โอนเงินสำเร็จ' : 'เงินสดสำเร็จ';
  ctx.fillText(type === "income" ? `${methodIcon} รับ${methodText}` : `${methodIcon} จ่าย${methodText}`, 200, 133);

  // Amount
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 34px 'Outfit'";
  ctx.fillText(`฿${Number(amount).toFixed(2)}`, 200, 195);

  // Details
  ctx.textAlign = "left";
  ctx.font = "13px 'Kanit'";
  ctx.fillStyle = "#9CA3AF";
  
  const drawRow = (label, value, y) => {
    ctx.fillStyle = "#9CA3AF";
    ctx.fillText(label, 40, y);
    ctx.fillStyle = "#F3F4F6";
    ctx.fillText(value, 160, y);
  };

  drawRow("รหัสธุรกรรม:", refNo, 235);
  drawRow("วันที่-เวลา:", dateStr, 270);
  drawRow("ประเภทรายการ:", type === "income" ? "รายรับ (เงินห้อง)" : "รายจ่าย (ค่าใช้จ่าย)", 305);
  drawRow("ช่องทางการเงิน:", method === 'transfer' ? "📱 โอนผ่านธนาคาร/พร้อมเพย์" : "💵 เงินสด", 340);
  drawRow(type === "income" ? "นักเรียนผู้ชำระ:" : "รายการจ่ายค่า:", payerName, 375);
  drawRow("ผู้ลงบันทึก/เหรัญญิก:", collectorName, 410);

  // Verification Seal
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(30, 420);
  ctx.lineTo(370, 420);
  ctx.stroke();
  ctx.setLineDash([]);

  // Verified Badge Stamp
  ctx.fillStyle = "rgba(16, 185, 129, 0.1)";
  ctx.fillRect(120, 445, 160, 45);
  ctx.strokeStyle = "#10B981";
  ctx.strokeRect(120, 445, 160, 45);

  ctx.fillStyle = method === 'transfer' ? "#10B981" : "#F59E0B";
  ctx.textAlign = "center";
  ctx.font = "bold 14px 'Kanit'";
  ctx.fillText(method === 'transfer' ? "✓ VERIFIED RECORD" : "✓ CASH RECEIVED", 200, 473);

  // Footer note
  ctx.fillStyle = "#6B7280";
  ctx.font = "10px 'Kanit'";
  ctx.fillText("ระบบบันทึกเงินห้องโปร่งใส ตรวจสอบความถูกต้องได้ตลอด 24 ชั่วโมง", 200, 525);

  return canvas.toDataURL("image/png");
}

// Generate PromptPay QR Code URL
function getPromptPayQRUrl(ppId, amount) {
  const cleanId = String(ppId).replace(/[^0-9]/g, '');
  if (!cleanId) return null;
  // Use public dynamic PromptPay API
  if (amount && Number(amount) > 0) {
    return `https://promptpay.io/${cleanId}/${amount}.png`;
  }
  return `https://promptpay.io/${cleanId}.png`;
}

// Date formatter
function formatThaiDateTime(date) {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const d = new Date(date);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year} - ${hours}:${minutes} น.`;
}

// Generate mock transactions to populate if database is new
function getSeedData(studentList, collectorName) {
  const s1 = studentList[0] || { no: 1, id: "8990", name: "นายณัฏฐพร โชติช่วง" };
  const s2 = studentList[1] || { no: 2, id: "8991", name: "นายชลันธร เจริญพร" };
  const s3 = studentList[2] || { no: 3, id: "8993", name: "นายเมธี บุญชอบ" };

  const trans1Date = formatThaiDateTime(new Date(Date.now() - 172800000)); // 2 days ago
  const trans2Date = formatThaiDateTime(new Date(Date.now() - 86400000));  // 1 day ago
  const trans3Date = formatThaiDateTime(new Date(Date.now() - 3600000));   // 1 hour ago
  const trans4Date = formatThaiDateTime(new Date(Date.now() - 1800000));   // 30 min ago

  const transactions = [
    {
      id: "TX-998827",
      timestamp: trans1Date,
      type: "income",
      studentId: s1.id,
      studentNo: s1.no,
      studentName: s1.name,
      amount: 200,
      description: "ค่าเงินห้องประจำภาคเรียนที่ 1/2569",
      collector: collectorName,
      slipUrl: generateDigitalReceipt(s1.name, 200, "income", trans1Date, "TX-998827", collectorName)
    },
    {
      id: "TX-998828",
      timestamp: trans2Date,
      type: "income",
      studentId: s2.id,
      studentNo: s2.no,
      studentName: s2.name,
      amount: 200,
      description: "ค่าเงินห้องประจำภาคเรียนที่ 1/2569",
      collector: collectorName,
      slipUrl: generateDigitalReceipt(s2.name, 200, "income", trans2Date, "TX-998828", collectorName)
    },
    {
      id: "TX-998829",
      timestamp: trans3Date,
      type: "expense",
      studentId: "",
      studentNo: "",
      studentName: "ร้านอุปกรณ์การศึกษาพหลโยธิน",
      amount: 350,
      description: "ซื้อกระดาษสี ฟิวเจอร์บอร์ด และกาวตราช้าง สำหรับจัดป้ายนิเทศห้อง ม.6/1",
      collector: collectorName,
      slipUrl: generateDigitalReceipt("ซื้ออุปกรณ์ป้ายนิเทศห้อง", 350, "expense", trans3Date, "TX-998829", collectorName)
    },
    {
      id: "TX-998830",
      timestamp: trans4Date,
      type: "income",
      studentId: s3.id,
      studentNo: s3.no,
      studentName: s3.name,
      amount: 150,
      description: "จ่ายค่าเงินห้องรอบเช้า (ค้างชำระอีก 50 บาท)",
      collector: collectorName,
      slipUrl: generateDigitalReceipt(s3.name, 150, "income", trans4Date, "TX-998830", collectorName)
    }
  ];

  return transactions;
}

// UI Helper: Show Loading Overlay
function showLoading(message = "กำลังบันทึกข้อมูลและเชื่อมต่อกับคลาวด์...") {
  let overlay = document.getElementById("cloud-loading-overlay");
  if (overlay) {
    overlay.querySelector(".loading-text").textContent = message;
    return;
  }
  
  overlay = document.createElement("div");
  overlay.id = "cloud-loading-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(10, 15, 30, 0.75)";
  overlay.style.backdropFilter = "blur(12px)";
  overlay.style.webkitBackdropFilter = "blur(12px)";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "99999";
  overlay.style.color = "#ffffff";
  overlay.style.fontFamily = "inherit";
  
  overlay.innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.05); padding: 30px 40px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5); text-align: center; max-width: 90%; width: 420px;">
      <div class="spinner" style="border: 4px solid rgba(255, 255, 255, 0.1); border-top: 4px solid var(--primary, #6366f1); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px auto;"></div>
      <p class="loading-text" style="margin: 0; font-size: 1rem; font-weight: 500; line-height: 1.5; color: rgba(255,255,255,0.9);">${message}</p>
      <small style="display: block; margin-top: 12px; color: rgba(255, 255, 255, 0.5); font-size: 0.8rem;">กรุณาอย่าเพิ่งปิดหรือรีเฟรชหน้าเว็บ</small>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(overlay);
}

// UI Helper: Hide Loading Overlay
function hideLoading() {
  const overlay = document.getElementById("cloud-loading-overlay");
  if (overlay) {
    overlay.remove();
  }
}

// Helper: Send POST request to Google Sheets to write data (prevents URL length limits and CORS preflight options)
function postToCloud(payload) {
  if (!state.config.appsScriptUrl) return Promise.resolve(null);
  
  return fetch(state.config.appsScriptUrl, {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "text/plain" // Prevents CORS preflight OPTIONS request
    },
    body: JSON.stringify(payload)
  })
  .then(r => {
    if (!r.ok) {
      throw new Error(`HTTP Error ${r.status}`);
    }
    return r.json();
  })
  .then(data => {
    console.log("Cloud sync POST result:", data);
    return data;
  })
  .catch(e => {
    console.error("Cloud sync POST failed:", e);
    alert(
      "⚠️ บันทึกข้อมูลออนไลน์ลง Google Sheets ไม่สำเร็จ!\n\n" +
      "ความเป็นไปได้สูง:\n" +
      "1. คุณครูประจำชั้นยังไม่ได้อัปเดตไฟล์ Apps Script (ให้รองรับฟังก์ชัน doPost) ใน Google Sheet\n" +
      "2. เกิดข้อผิดพลาดของเครือข่ายอินเทอร์เน็ต\n\n" +
      "กรุณาให้คุณครูคัดลอกโค้ด Apps Script ตัวล่าสุดในชีต และสั่ง Deploy (การทำให้ใช้งานได้) ใหม่ให้เรียบร้อยก่อนค่ะ"
    );
    throw e;
  });
}

// Helper: Sync transaction to Google Sheets
function syncTransactionToCloud(newTx) {
  return postToCloud({
    action: "save_transaction",
    id: newTx.id,
    timestamp: newTx.timestamp,
    type: newTx.type,
    studentId: newTx.studentId,
    studentNo: newTx.studentNo || "",
    studentName: newTx.studentName,
    amount: newTx.amount,
    description: newTx.description,
    collector: newTx.collector,
    method: newTx.method,
    slipUrl: newTx.slipUrl
  });
}

// Helper: Sync multiple transactions (batch) to Google Sheets
function syncTransactionsToCloud(txList) {
  return postToCloud({
    action: "save_transactions",
    transactions: txList
  });
}

// Helper: Sync deletion to Google Sheets
function syncDeleteToCloud(txid) {
  postToCloud({
    action: "delete_transaction",
    id: txid
  });
}

// Helper: Sync configuration settings to Google Sheets
function syncSettingsToCloud() {
  postToCloud({
    action: "save_settings",
    goalPerPerson: state.config.goalPerPerson,
    teacherName: state.config.teacherName,
    currentCollectorId: state.config.currentCollectorId,
    promptpayId: state.config.promptpayId,
    promptpayName: state.config.promptpayName,
    collectorPassword: state.config.collectorPassword,
    teacherPassword: state.config.teacherPassword
  });
}

// Helper: Sync audit history logs to Google Sheets
function syncHistoryToCloud(log) {
  postToCloud({
    action: "save_history",
    timestamp: log.timestamp,
    title: log.title,
    desc: log.desc,
    author: log.author
  });
}

// Helper: Sync reset action to Google Sheets
function syncResetToCloud() {
  postToCloud({
    action: "reset_database"
  });
}

// Initial Data Load
async function loadInitialData() {
  let loadedStudents = [];
  
  // 1. Try to fetch from central JSON register
  try {
    const response = await fetch("../ทะเบียนนักเรียน-ม1-6-ปี69.json");
    if (response.ok) {
      const data = await response.json();
      if (data && data["ม.6/1"]) {
        loadedStudents = data["ม.6/1"];
        console.log("Students loaded from JSON successfully.");
      }
    }
  } catch (err) {
    console.warn("Could not fetch student register JSON. Using fallback student list.", err);
  }

  // Fallback if fetch failed or returned empty
  if (loadedStudents.length === 0) {
    loadedStudents = JSON.parse(JSON.stringify(FALLBACK_STUDENTS));
  }

  // 2. Load from LocalStorage
  const cachedData = localStorage.getItem("classfund_6_1_data");
  if (cachedData) {
    try {
      const parsed = JSON.parse(cachedData);
      state = parsed;
      // Sync names of students from newest loadedStudents in case registry changed
      state.students.forEach(st => {
        const found = loadedStudents.find(l => l.no === st.no);
        if (found) {
          st.name = found.name;
          st.id = found.id;
        }
      });
      // Add any new students added in JSON registry who are not in state
      loadedStudents.forEach(st => {
        if (!state.students.some(s => s.no === st.no)) {
          state.students.push({
            no: st.no,
            id: st.id,
            name: st.name,
            paidAmount: 0
          });
        }
      });
      state.students.sort((a, b) => a.no - b.no);
      console.log("State restored from localStorage successfully.");
    } catch (e) {
      console.error("Error parsing localstorage cache.", e);
      initializeNewState(loadedStudents);
    }
  } else {
    initializeNewState(loadedStudents);
  }

  // Double check configuration values
  if (!state.config.promptpayId) state.config.promptpayId = "091-234-5678";
  if (!state.config.promptpayName) state.config.promptpayName = "นายณัฏฐพร โชติช่วง (เหรัญญิก ม.6/1)";
  if (!state.config.collectorPassword) state.config.collectorPassword = "1234";
  if (!state.config.teacherPassword || state.config.teacherPassword === "9999") {
    state.config.teacherPassword = "2301";
  }
  const defaultUrl = "https://script.google.com/macros/s/AKfycbz-F0PVMgQel2G7PIutsmvIW_D7UeSwXau39cGn4G8gnKHK2O_AXJnofNu5X5AMmdDafQ/exec";
  if (!state.config.appsScriptUrl || state.config.appsScriptUrl.includes("...") || state.config.appsScriptUrl.trim() === "") {
    state.config.appsScriptUrl = defaultUrl;
  }

  // *** Render Cached Local Data Instantly (Stale-While-Revalidate) ***
  calculateStats();
  renderAll();

  // 3. Connect to Google Sheets if Web App URL is provided
  if (state.config.appsScriptUrl) {
    const statusText = document.querySelector(".status-indicator span:last-child");
    const statusDot = document.querySelector(".dot-online");
    
    if (statusText) statusText.textContent = "กำลังซิงค์ Google Sheets...";
    if (statusDot) {
      statusDot.style.backgroundColor = "var(--primary)";
      statusDot.style.boxShadow = "0 0 8px var(--primary)";
    }

    try {
      // Fetch newest data from Sheet
      const gsResponse = await fetch(`${state.config.appsScriptUrl}?action=get_data`);
      if (gsResponse.ok) {
        const gsData = await gsResponse.json();
        if (gsData.success) {
          const originalUrl = state.config.appsScriptUrl;
          state.config = gsData.config;
          state.config.appsScriptUrl = originalUrl; // keep current URL in state
          
          // Migrate old password if fetched from sheet
          if (state.config.teacherPassword === "9999") {
            state.config.teacherPassword = "2301";
            saveToLocalStorage();
            syncSettingsToCloud();
          }
          
          state.transactions = gsData.transactions;
          state.collectorHistory = gsData.collectorHistory;
          
          if (statusText) statusText.textContent = "คลาวด์ซิงค์: Google Sheets (ออนไลน์)";
          if (statusDot) {
            statusDot.style.backgroundColor = "var(--success)";
            statusDot.style.boxShadow = "0 0 8px var(--success)";
          }
          console.log("Google Sheets sync completed successfully.");
          
          // Update rendering and local cache with latest data from Sheets
          calculateStats();
          saveToLocalStorage();
          renderAll();
        } else {
          console.warn("Google Sheets sync returned success=false:", gsData.error);
          if (statusText) statusText.textContent = `ออฟไลน์ (ชีตส่งกลับข้อผิดพลาด: ${gsData.error})`;
          if (statusDot) {
            statusDot.style.backgroundColor = "var(--warning)";
            statusDot.style.boxShadow = "0 0 8px var(--warning)";
          }
        }
      } else {
        if (statusText) statusText.textContent = `ออฟไลน์ (HTTP Error: ${gsResponse.status})`;
        if (statusDot) {
          statusDot.style.backgroundColor = "var(--warning)";
          statusDot.style.boxShadow = "0 0 8px var(--warning)";
        }
      }
    } catch (err) {
      console.warn("Failed to fetch Google Sheets data. Defaulting to local cache.", err);
      if (statusText) statusText.textContent = `ออฟไลน์ (ข้อผิดพลาด: ${err.message})`;
      if (statusDot) {
        statusDot.style.backgroundColor = "var(--warning)";
        statusDot.style.boxShadow = "0 0 8px var(--warning)";
      }
    }
  }
}

function initializeNewState(loadedStudents) {
  state.students = loadedStudents.map(s => ({
    no: s.no,
    id: s.id,
    name: s.name,
    paidAmount: 0
  }));
  
  // Set default collector
  const collector = state.students[0] || { no: 1, id: "8990", name: "นายณัฏฐพร โชติช่วง" };
  state.config.currentCollectorId = collector.id;
  state.config.promptpayName = `${collector.name} (เหรัญญิก ม.6/1)`;
  state.config.appsScriptUrl = "https://script.google.com/macros/s/AKfycbz-F0PVMgQel2G7PIutsmvIW_D7UeSwXau39cGn4G8gnKHK2O_AXJnofNu5X5AMmdDafQ/exec";
  
  // Seeding default transactions
  state.transactions = getSeedData(state.students, collector.name);
  
  // Update students' paid amount based on seeded transactions
  state.transactions.forEach(tx => {
    if (tx.type === "income" && tx.studentId) {
      const student = state.students.find(s => s.id === tx.studentId);
      if (student) {
        student.paidAmount += tx.amount;
      }
    }
  });

  // Auditing Timeline seed
  state.collectorHistory = [
    {
      timestamp: formatThaiDateTime(new Date(Date.now() - 172800000)),
      title: `เปลี่ยนผู้เก็บเงินห้องเป็น: ${collector.name}`,
      desc: `คุณครูประจำชั้นจัดระบบการเงินห้อง และแต่งตั้งให้ ${collector.name} เป็นเหรัญญิกดูแลกระเป๋าเงินประจำเทอมนี้ เริ่มต้นระบบด้วยยอดคงเหลือ ฿0.00`,
      author: "คุณครูนิวตรอน"
    }
  ];
  
  saveToLocalStorage();
}

// Calculate Dashboard Stats
function calculateStats() {
  let totalIncome = 0;
  let totalExpense = 0;

  // Clear student paid accumulators and re-tally from transactions (single source of truth)
  state.students.forEach(st => st.paidAmount = 0);

  state.transactions.forEach(tx => {
    const amt = Number(tx.amount);
    if (tx.type === "income") {
      totalIncome += amt;
      if (tx.studentId) {
        const st = state.students.find(s => s.id === tx.studentId);
        if (st) {
          st.paidAmount += amt;
        }
      }
    } else if (tx.type === "expense") {
      totalExpense += amt;
    }
  });

  state.stats = {
    balance: totalIncome - totalExpense,
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    paidCount: state.students.filter(s => s.paidAmount >= state.config.goalPerPerson).length,
    pendingCount: state.students.filter(s => s.paidAmount < state.config.goalPerPerson).length
  };
}

// Save State to LocalStorage
function saveToLocalStorage() {
  localStorage.setItem("classfund_6_1_data", JSON.stringify(state));
}

// Main rendering hub
function renderAll() {
  // Update sidebar collector
  const collector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "ยังไม่มีชื่อ" };
  document.getElementById("sidebar-collector-name").textContent = collector.name;

  // Update Role UI first to show/hide edit inputs
  updateRoleUI();

  // Update tabs DOM
  renderDashboard();
  renderStudents();
  renderTransactions();
  renderSettings();
  renderTimeline();
}

// Update Role-based UI lock
function updateRoleUI() {
  const btn = document.getElementById("btn-toggle-role");
  if (!btn) return;
  
  if (userRole === "teacher") {
    btn.style.backgroundColor = "rgba(16, 185, 129, 0.05)";
    btn.style.borderColor = "rgba(16, 185, 129, 0.2)";
    btn.style.color = "var(--success)";
    btn.innerHTML = `<i class="fa-solid fa-user-shield"></i> <span id="role-text">โหมดครูประจำชั้น (สิทธิ์สูงสุด)</span>`;
  } else if (userRole === "collector") {
    btn.style.backgroundColor = "rgba(59, 130, 246, 0.05)";
    btn.style.borderColor = "rgba(59, 130, 246, 0.2)";
    btn.style.color = "var(--primary)";
    btn.innerHTML = `<i class="fa-solid fa-key"></i> <span id="role-text">โหมดเหรัญญิก (บันทึกข้อมูล)</span>`;
  } else {
    btn.style.backgroundColor = "rgba(245, 158, 11, 0.05)";
    btn.style.borderColor = "rgba(245, 158, 11, 0.2)";
    btn.style.color = "var(--warning)";
    btn.innerHTML = `<i class="fa-solid fa-lock"></i> <span id="role-text">โหมดนักเรียน (ดูอย่างเดียว)</span>`;
  }

  // Show/Hide edit buttons in dashboard or transactions panel
  const transActions = document.querySelector("#panel-transactions .action-buttons");
  if (transActions) {
    // Both teacher and collector can add income/expense
    transActions.style.display = (userRole === "teacher" || userRole === "collector") ? "flex" : "none";
  }
  
  const resetZone = document.querySelector(".reset-zone");
  if (resetZone) {
    // Only teacher can reset database
    resetZone.style.display = userRole === "teacher" ? "block" : "none";
  }

  // Enable/Disable settings forms
  const settingsSubmitBtns = document.querySelectorAll("#panel-settings button[type='submit']");
  settingsSubmitBtns.forEach(b => b.style.display = userRole === "teacher" ? "inline-flex" : "none");

  const settingsInputs = document.querySelectorAll("#panel-settings input, #panel-settings select");
  settingsInputs.forEach(input => {
    // skip disabled calculative inputs
    if (input.id === "input-goal-total-calc") return;
    
    // Only teacher can edit collector and settings
    if (userRole === "teacher") {
      input.removeAttribute("disabled");
    } else {
      input.setAttribute("disabled", "true");
    }
  });
}

// Render Dashboard
function renderDashboard() {
  // Overview cards
  document.getElementById("stat-balance").textContent = `฿${state.stats.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  document.getElementById("stat-income").textContent = `฿${state.stats.totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  document.getElementById("stat-expense").textContent = `฿${state.stats.totalExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  // Goal & Progress Bar
  const goalPerPerson = Number(state.config.goalPerPerson);
  const totalGoal = goalPerPerson * state.students.length;
  
  document.getElementById("goal-per-person").textContent = `฿${goalPerPerson.toFixed(2)}`;
  document.getElementById("goal-total").textContent = `฿${totalGoal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  // Calculate percentage
  let progressPercent = 0;
  if (totalGoal > 0) {
    progressPercent = Math.min(100, Math.round((state.stats.totalIncome / totalGoal) * 100));
  }
  
  document.getElementById("goal-progress-percent").textContent = `${progressPercent}%`;
  document.getElementById("goal-progress-text").textContent = `เก็บเงินได้ ฿${state.stats.totalIncome.toLocaleString('th-TH')} / ฿${totalGoal.toLocaleString('th-TH')}`;
  document.getElementById("goal-progress-fill").style.width = `${progressPercent}%`;

  // Ratios
  document.getElementById("ratio-paid-count").textContent = `${state.stats.paidCount} / ${state.students.length} คน`;
  document.getElementById("ratio-pending-count").textContent = `${state.stats.pendingCount} / ${state.students.length} คน`;

  // QR Code generator
  const qrDisplayBox = document.getElementById("qr-code-display");
  const ppId = state.config.promptpayId;
  const qrUrl = getPromptPayQRUrl(ppId, goalPerPerson);

  document.getElementById("qr-account-name").textContent = `ชื่อบัญชี: ${state.config.promptpayName}`;
  document.getElementById("qr-account-number").textContent = `พร้อมเพย์: ${ppId}`;
  document.getElementById("qr-target-amount").textContent = `฿${goalPerPerson}`;

  if (qrUrl) {
    qrDisplayBox.innerHTML = `<img src="${qrUrl}" alt="PromptPay QR Code">`;
  } else {
    qrDisplayBox.innerHTML = `<div class="p-4 text-center text-xs text-danger"><i class="fa-solid fa-triangle-exclamation"></i> พร้อมเพย์ไม่ถูกต้อง</div>`;
  }

  // Recent Transactions table (max 5 items)
  const recentTableBody = document.querySelector("#recent-transactions-table tbody");
  recentTableBody.innerHTML = "";

  const recent = [...state.transactions].reverse().slice(0, 5);
  if (recent.length === 0) {
    recentTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">ยังไม่มีรายการเงินห้องโอนเข้ามาในระบบ</td></tr>`;
    return;
  }

  recent.forEach(tx => {
    const row = document.createElement("tr");
    
    // Type badge
    let typeBadge = "";
    if (tx.type === "income") {
      typeBadge = `<span class="badge badge-paid"><i class="fa-solid fa-arrow-down"></i> รับเงิน</span>`;
    } else {
      typeBadge = `<span class="badge badge-expense"><i class="fa-solid fa-arrow-up"></i> จ่ายเงิน</span>`;
    }

    // Name column display
    let titleDisplay = "";
    if (tx.type === "income") {
      titleDisplay = tx.studentId ? `<strong>เลขที่ ${tx.studentNo}</strong> ${tx.studentName}` : tx.studentName;
    } else {
      titleDisplay = `<strong>[จ่าย]</strong> ${tx.studentName}`;
    }

    const receiptBtn = tx.slipUrl 
      ? `<button class="btn btn-secondary btn-sm btn-circle btn-view-slip" data-txid="${tx.id}"><i class="fa-solid fa-image"></i></button>`
      : `<span class="text-muted text-xs">ไม่มี</span>`;

    row.innerHTML = `
      <td>${tx.timestamp}</td>
      <td>${typeBadge}</td>
      <td>
        <div class="table-text-container">
          <span>${titleDisplay}</span>
          <small class="text-muted block text-xs" style="display:block; margin-top:2px;">${tx.description}</small>
        </div>
      </td>
      <td class="font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
        ${tx.type === 'income' ? '+' : '-'}฿${Number(tx.amount).toFixed(2)}
      </td>
      <td>${tx.collector}</td>
      <td class="text-center">${receiptBtn}</td>
    `;
    recentTableBody.appendChild(row);
  });
}

// Render Students Page
function renderStudents() {
  const tableBody = document.querySelector("#students-table tbody");
  tableBody.innerHTML = "";

  // Filter students based on query and status filter tab
  const filtered = state.students.filter(s => {
    // 1. Search Query Match
    const q = studentSearchQuery.trim().toLowerCase();
    const matchesSearch = !q || 
                          String(s.no).includes(q) || 
                          String(s.id).includes(q) || 
                          s.name.toLowerCase().includes(q);
    
    if (!matchesSearch) return false;

    // 2. Status Tab Filter Match
    const goal = Number(state.config.goalPerPerson);
    if (studentActiveFilter === "paid") {
      return s.paidAmount >= goal;
    } else if (studentActiveFilter === "pending") {
      return s.paidAmount < goal;
    }

    return true;
  });

  // Update tabs numbers in filter buttons
  const allCount = state.students.length;
  const paidCount = state.students.filter(s => s.paidAmount >= state.config.goalPerPerson).length;
  const pendingCount = allCount - paidCount;

  document.querySelector(".filter-btn[data-filter='all']").textContent = `ทั้งหมด (${allCount})`;
  document.querySelector(".filter-btn[data-filter='paid']").textContent = `จ่ายครบ (${paidCount})`;
  document.querySelector(".filter-btn[data-filter='pending']").textContent = `ค้างจ่าย (${pendingCount})`;

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">ไม่พบข้อมูลนักเรียนตามการค้นหา</td></tr>`;
    return;
  }

  filtered.forEach(s => {
    const row = document.createElement("tr");
    const goal = Number(state.config.goalPerPerson);
    
    // Status pill
    let statusPill = "";
    if (s.paidAmount >= goal) {
      statusPill = `<span class="badge badge-paid"><i class="fa-solid fa-circle-check"></i> จ่ายครบแล้ว</span>`;
    } else if (s.paidAmount > 0) {
      statusPill = `<span class="badge badge-partial"><i class="fa-solid fa-circle-minus"></i> จ่ายบางส่วน</span>`;
    } else {
      statusPill = `<span class="badge badge-pending"><i class="fa-solid fa-circle-xmark"></i> ยังไม่จ่าย</span>`;
    }

    // Action button based on status
    const canPay = (userRole === "teacher" || userRole === "collector");
    const actionBtn = canPay 
      ? `<button class="btn btn-primary btn-sm btn-record-student-pay" data-no="${s.no}"><i class="fa-solid fa-cash-register"></i> บันทึกจ่าย</button>`
      : `<span class="text-muted text-xs"><i class="fa-solid fa-lock"></i> ล็อกสิทธิ์</span>`;

    row.innerHTML = `
      <td>${s.no}</td>
      <td>${s.id}</td>
      <td><strong>${s.name}</strong></td>
      <td>${statusPill}</td>
      <td class="text-right font-bold ${s.paidAmount > 0 ? 'text-success' : 'text-muted'}">
        ฿${s.paidAmount.toFixed(2)}
      </td>
      <td class="text-center">${actionBtn}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Render Transactions Page
function renderTransactions() {
  const tableBody = document.querySelector("#full-transactions-table tbody");
  tableBody.innerHTML = "";

  // 1. Filter transactions
  const filtered = state.transactions.filter(tx => {
    // A. Filter by type
    let matchesType = true;
    if (transactionActiveType === "income") matchesType = (tx.type === "income");
    if (transactionActiveType === "expense") matchesType = (tx.type === "expense");
    
    if (!matchesType) return false;

    // B. Filter by date
    if (transactionActiveDate) {
      const filterDate = new Date(transactionActiveDate);
      const filterThaiDatePart = formatThaiDateTime(filterDate).split(" - ")[0]; // "23 มิ.ย. 2569"
      return tx.timestamp.startsWith(filterThaiDatePart);
    }

    return true;
  });

  // 2. Render Daily summary banner if date filter is active
  const summaryBar = document.getElementById("transaction-daily-summary-bar");
  const clearBtn = document.getElementById("btn-clear-date-filter");
  
  if (summaryBar) {
    if (transactionActiveDate) {
      let dailyIncome = 0;
      let dailyExpense = 0;
      let dailyCount = 0;

      filtered.forEach(tx => {
        const amt = Number(tx.amount) || 0;
        if (tx.type === "income") {
          dailyIncome += amt;
        } else {
          dailyExpense += amt;
        }
        dailyCount++;
      });

      const filterDate = new Date(transactionActiveDate);
      const formattedDate = formatThaiDateTime(filterDate).split(" - ")[0];

      summaryBar.style.display = "flex";
      if (clearBtn) clearBtn.style.display = "inline-block";
      
      summaryBar.innerHTML = `
        <div>
          <span>📅 สรุปยอดบัญชีเฉพาะวันที่ <strong>${formattedDate}</strong>:</span>
          <span class="text-muted" style="margin-left: 10px; font-size: 0.8rem;">พบ ${dailyCount} รายการ</span>
        </div>
        <div style="display: flex; gap: 20px;">
          <span style="color: var(--success); font-weight: bold;"><i class="fa-solid fa-arrow-down-long"></i> ยอดรับ: +฿${dailyIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
          <span style="color: var(--danger); font-weight: bold;"><i class="fa-solid fa-arrow-up-long"></i> ยอดจ่าย: -฿${dailyExpense.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
        </div>
      `;
    } else {
      summaryBar.style.display = "none";
      if (clearBtn) clearBtn.style.display = "none";
    }
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">ไม่มีประวัติธุรกรรมในหมวดหมู่หรือวันที่เลือก</td></tr>`;
    return;
  }

  // 3. Render transactions rows with visual date grouping
  let lastDateGroup = "";
  
  // Sort or keep descending order (newest first). Note that state.transactions is chronologically ordered (oldest first).
  const sorted = [...filtered].reverse();
  
  sorted.forEach(tx => {
    // Extract date part: "23 มิ.ย. 2569"
    const txDatePart = tx.timestamp.split(" - ")[0];

    // If date changes, display header row
    if (txDatePart !== lastDateGroup) {
      lastDateGroup = txDatePart;
      const groupRow = document.createElement("tr");
      groupRow.innerHTML = `
        <td colspan="7" style="background-color: rgba(59, 130, 246, 0.04); color: var(--primary); font-weight: 600; padding: 10px 16px; border-bottom: 1px solid rgba(59, 130, 246, 0.1); font-size: 0.8rem; border-top: 1px solid var(--border-color);">
          <i class="fa-solid fa-calendar-day"></i> วันที่ ${txDatePart}
        </td>
      `;
      tableBody.appendChild(groupRow);
    }

    const row = document.createElement("tr");

    let typeBadge = "";
    if (tx.type === "income") {
      typeBadge = `<span class="badge badge-paid"><i class="fa-solid fa-arrow-down"></i> รับเงิน</span>`;
    } else {
      typeBadge = `<span class="badge badge-expense"><i class="fa-solid fa-arrow-up"></i> จ่ายเงิน</span>`;
    }

    let titleDisplay = "";
    if (tx.type === "income") {
      titleDisplay = tx.studentId ? `<strong>เลขที่ ${tx.studentNo}</strong> ${tx.studentName}` : tx.studentName;
    } else {
      titleDisplay = `<strong>[จ่ายให้]</strong> ${tx.studentName}`;
    }

    const receiptBtn = tx.slipUrl
      ? `<button class="btn btn-secondary btn-sm btn-view-slip" data-txid="${tx.id}"><i class="fa-solid fa-image"></i> เปิดหลักฐาน</button>`
      : `<span class="text-muted text-xs">ไม่มีสลิป</span>`;

    // Add delete transaction option (for audit & correcting mistakes)
    const deleteBtn = (userRole === "teacher")
      ? `<button class="btn btn-secondary btn-sm font-red btn-delete-tx" data-txid="${tx.id}" title="ลบรายการนี้"><i class="fa-solid fa-trash-can"></i></button>`
      : `<span class="text-muted text-xs">—</span>`;

    row.innerHTML = `
      <td>${tx.timestamp.split(" - ")[1] || tx.timestamp}</td>
      <td>${typeBadge}</td>
      <td>
        <div class="table-text-container">
          <span style="display:block;">${titleDisplay}</span>
          <span class="text-muted text-xs" style="font-size:0.75rem; display:block; margin-top:3px;">คำอธิบาย: ${tx.description}</span>
        </div>
      </td>
      <td class="font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}">
        ${tx.type === 'income' ? '+' : '-'}฿${Number(tx.amount).toFixed(2)}
      </td>
      <td>${tx.collector}</td>
      <td>${receiptBtn}</td>
      <td class="text-center">${deleteBtn}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Render Settings Page
function renderSettings() {
  // 1. Populate current values in inputs
  document.getElementById("input-teacher-name").value = state.config.teacherName;
  document.getElementById("input-promptpay-id").value = state.config.promptpayId;
  document.getElementById("input-promptpay-name").value = state.config.promptpayName;
  document.getElementById("input-goal-amount").value = state.config.goalPerPerson;
  document.getElementById("input-apps-script-url").value = state.config.appsScriptUrl || "";
  
  const totalGoal = Number(state.config.goalPerPerson) * state.students.length;
  document.getElementById("input-goal-total-calc").value = `฿${totalGoal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

  // 2. Load selector options for students list
  const collectorSelect = document.getElementById("input-current-collector");
  const modalStudentSelect = document.getElementById("trans-student-select");

  // Keep selected IDs to restore after rebuild
  const currentSelectedCollectorId = state.config.currentCollectorId;

  collectorSelect.innerHTML = "";
  modalStudentSelect.innerHTML = `<option value="">-- รายรับกองกลาง (ไม่เจาะจงรายคน) --</option>`;

  state.students.forEach(s => {
    // Current Collector select
    const colOpt = document.createElement("option");
    colOpt.value = s.id;
    colOpt.textContent = `เลขที่ ${s.no} - ${s.name}`;
    if (s.id === currentSelectedCollectorId) {
      colOpt.selected = true;
    }
    collectorSelect.appendChild(colOpt);

    // Modal Student select
    const transOpt = document.createElement("option");
    transOpt.value = s.id;
    transOpt.textContent = `เลขที่ ${s.no} - ${s.name}`;
    modalStudentSelect.appendChild(transOpt);
  });
}

// Render Timelines
function renderTimeline() {
  const container = document.getElementById("collector-audit-timeline");
  container.innerHTML = "";

  if (state.collectorHistory.length === 0) {
    container.innerHTML = `<p class="text-muted text-center py-4">ไม่มีประวัติการบันทึกระบบความโปร่งใส</p>`;
    return;
  }

  // Display newest log on top
  [...state.collectorHistory].reverse().forEach(log => {
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <h4>${log.title}</h4>
        <p class="time">${log.timestamp}</p>
        <p class="desc">${log.desc}</p>
        <span class="author">ลงชื่อรับรอง: ${log.author}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

// Record Transaction (Income or Expense)
async function recordTransaction({ type, description, amount, studentId, slipBase64, method = "cash" }) {
  const currentCollector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิกห้อง" };
  const collectorName = currentCollector.name;
  
  const txid = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = formatThaiDateTime(new Date());

  // Generate Digital Receipt if no slip is provided
  let finalSlip = slipBase64;
  if (!finalSlip) {
    let transactionSubject = "";
    if (type === "income") {
      if (studentId) {
        const studentObj = state.students.find(s => s.id === studentId);
        transactionSubject = studentObj ? studentObj.name : "เงินสมทบกองกลางห้อง";
      } else {
        transactionSubject = "เงินสมทบกองกลางห้อง";
      }
    } else {
      transactionSubject = description;
    }
    
    finalSlip = generateDigitalReceipt(
      transactionSubject,
      amount,
      type,
      dateStr,
      txid,
      collectorName,
      method
    );
  }

  const newTx = {
    id: txid,
    timestamp: dateStr,
    type: type,
    studentId: studentId || "",
    studentNo: "",
    studentName: "",
    amount: Number(amount),
    description: description,
    collector: collectorName,
    method: method,
    slipUrl: finalSlip
  };

  // If this is a student payment, fill out details
  if (type === "income" && studentId) {
    const student = state.students.find(s => s.id === studentId);
    if (student) {
      newTx.studentName = student.name;
      newTx.studentNo = student.no;
    }
  } else if (type === "expense") {
    newTx.studentName = description; // Expense name
  } else {
    newTx.studentName = "เงินรับสมทบกองกลาง";
  }

  // Cloud Sync (with blocker loading screen if online URL exists)
  if (state.config.appsScriptUrl) {
    showLoading("กำลังอัปเดตและบันทึกประวัติการเงินไปยัง Google Sheets ออนไลน์...");
    try {
      await syncTransactionToCloud(newTx);
      hideLoading();
    } catch (e) {
      hideLoading();
      return false; // Sync failed, abort local save
    }
  }

  state.transactions.push(newTx);
  
  calculateStats();
  saveToLocalStorage();
  renderAll();

  // Reset file upload buffers
  tempSlipBase64 = null;
  clearSlipUploadZones();
  return true;
}

// Delete Transaction
function deleteTransaction(txid) {
  const txIndex = state.transactions.findIndex(t => t.id === txid);
  if (txIndex === -1) return;

  const tx = state.transactions[txIndex];
  
  if (confirm(`คุณแน่ใจหรือไม่ที่จะลบรายการธุรกรรม "${tx.description}" จำนวน ฿${tx.amount.toFixed(2)}?\nการลบรายการนี้จะเปลี่ยนค่าสถิติยอดเงินสะสมในทันที`)) {
    state.transactions.splice(txIndex, 1);
    
    // Add deletion log to timeline for accountability
    const currentCollector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิกห้อง" };
    const log = {
      timestamp: formatThaiDateTime(new Date()),
      title: `ลบรายการธุรกรรม: ${txid}`,
      desc: `มีการลบรายการ "${tx.description}" ยอดเงิน ฿${tx.amount.toFixed(2)} ออกจากบัญชีห้องเพื่อการปรับปรุงข้อมูลให้ถูกต้อง`,
      author: currentCollector.name
    };
    state.collectorHistory.push(log);

    calculateStats();
    saveToLocalStorage();
    renderAll();

    // Cloud sync deletes
    syncDeleteToCloud(txid);
    syncHistoryToCloud(log);
  }
}

// Reset Database
function resetDatabase() {
  if (confirm("⚠️ คำเตือน: คุณกำลังจะลบรายการบัญชีเงินห้องเรียน ม.6/1 และล้างประวัติการจ่ายเงินทั้งหมด!\nคุณยืนยันที่จะรีเซ็ตฐานข้อมูลเพื่อเริ่มต้นใหม่หรือไม่?")) {
    localStorage.removeItem("classfund_6_1_data");
    
    // Reload to default seeds
    const defaultCollector = FALLBACK_STUDENTS[0];
    state = {
      students: FALLBACK_STUDENTS.map(s => ({
        no: s.no,
        id: s.id,
        name: s.name,
        paidAmount: 0
      })),
      transactions: [],
      config: {
        goalPerPerson: 200,
        teacherName: "ครูนิวตรอน",
        currentCollectorId: defaultCollector.id,
        promptpayId: "091-234-5678",
        promptpayName: `${defaultCollector.name} (เหรัญญิก ม.6/1)`,
        appsScriptUrl: ""
      },
      collectorHistory: [
        {
          timestamp: formatThaiDateTime(new Date()),
          title: "เริ่มต้นฐานข้อมูลและรีเซ็ตระบบเงินห้องใหม่",
          desc: "รีเซ็ตการเก็บเงินเพื่อล้างประวัติยอดค้างชำระทั้งหมด ยอดเงินรวมตั้งต้นใหม่ที่ ฿0.00",
          author: "คุณครูนิวตรอน"
        }
      ]
    };
    
    // Re-seed transactions to make layout beautiful
    state.transactions = getSeedData(state.students, defaultCollector.name);
    
    calculateStats();
    saveToLocalStorage();
    renderAll();

    // Cloud sync reset
    syncResetToCloud();

    alert("ล้างระบบและบันทึกข้อมูลตั้งต้นใหม่เรียบร้อยแล้ว");
  }
}

// Tab switcher handler
function switchTab(tabId) {
  if (!TAB_INFO[tabId]) return;
  activeTab = tabId;

  // Active class in menu items
  document.querySelectorAll(".menu-item").forEach(btn => {
    if (btn.getAttribute("data-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Active class in panels
  document.querySelectorAll(".tab-panel").forEach(panel => {
    if (panel.id === `panel-${tabId}`) {
      panel.classList.add("active");
    } else {
      panel.classList.remove("active");
    }
  });

  // Update navbar texts
  document.getElementById("page-title").textContent = TAB_INFO[tabId].title;
  document.getElementById("page-subtitle").textContent = TAB_INFO[tabId].subtitle;
}

// Modal Toggle Utility
function toggleModal(modalId, active, setupFn = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  if (active) {
    if (setupFn) setupFn();
    modal.classList.add("active");
  } else {
    modal.classList.remove("active");
    clearSlipUploadZones();
  }
}

// Clear File upload previews
function clearSlipUploadZones() {
  tempSlipBase64 = null;
  
  // Payment modal reset
  const zone1 = document.getElementById("payment-slip-upload-zone");
  zone1.querySelector(".icon-upload").style.display = "block";
  zone1.querySelector("p").style.display = "block";
  const img1 = document.getElementById("payment-slip-preview");
  img1.style.display = "none";
  img1.src = "";
  document.getElementById("payment-slip-file").value = "";

  // General transaction modal reset
  const zone2 = document.getElementById("trans-slip-upload-zone");
  zone2.querySelector(".icon-upload").style.display = "block";
  zone2.querySelector("p").style.display = "block";
  const img2 = document.getElementById("trans-slip-preview");
  img2.style.display = "none";
  img2.src = "";
  document.getElementById("trans-slip-file").value = "";
}

// File to Base64 Reader Helper
function handleSlipFileSelection(file, previewImgElement, uploadZoneElement) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    tempSlipBase64 = e.target.result;
    
    // Hide icons and show preview image
    uploadZoneElement.querySelector(".icon-upload").style.display = "none";
    uploadZoneElement.querySelector("p").style.display = "none";
    
    previewImgElement.src = tempSlipBase64;
    previewImgElement.style.display = "block";
  };
  reader.readAsDataURL(file);
}

// Event Listeners Initialization
function setupEventListeners() {
  // 1. Sidebar menu click
  document.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"));
    });
  });

  // 2. View all link in Dashboard
  document.getElementById("btn-view-all-transactions").addEventListener("click", () => {
    switchTab("transactions");
  });

  // 3. Search students input
  document.getElementById("student-search-input").addEventListener("input", (e) => {
    studentSearchQuery = e.target.value;
    renderStudents();
  });

  // 4. Student list status filter tabs
  document.querySelectorAll(".control-panel .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // Toggle active class
      document.querySelectorAll(".control-panel .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      studentActiveFilter = btn.getAttribute("data-filter");
      renderStudents();
    });
  });

  // 5. Transaction type filter tabs
  document.querySelectorAll("#transaction-type-filter .filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#transaction-type-filter .filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      transactionActiveType = btn.getAttribute("data-type");
      renderTransactions();
    });
  });

  // 5.5 Transaction date filter
  const dateInput = document.getElementById("transaction-date-filter");
  if (dateInput) {
    dateInput.addEventListener("input", (e) => {
      transactionActiveDate = e.target.value;
      renderTransactions();
    });
  }

  const clearDateBtn = document.getElementById("btn-clear-date-filter");
  if (clearDateBtn) {
    clearDateBtn.addEventListener("click", () => {
      transactionActiveDate = "";
      if (dateInput) dateInput.value = "";
      renderTransactions();
    });
  }

  // 6. Modal close actions
  document.querySelectorAll(".btn-close-modal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      // Find parent modal
      const modal = btn.closest(".modal");
      if (modal) toggleModal(modal.id, false);
    });
  });

  // Close modals when clicking outside contents
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) toggleModal(modal.id, false);
    });
  });

  // 7. Student record pay buttons in list (delegated event)
  document.getElementById("students-table").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-record-student-pay");
    if (!btn) return;
    
    const sno = Number(btn.getAttribute("data-no"));
    const student = state.students.find(s => s.no === sno);
    if (!student) return;

    toggleModal("modal-record-payment", true, () => {
      const currentCollector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิกห้อง" };
      
      document.getElementById("payment-student-no").value = student.no;
      document.getElementById("payment-student-display").value = `เลขที่ ${student.no} - ${student.name} (รหัส ${student.id})`;
      document.getElementById("payment-collector").value = currentCollector.name;
      
      // Auto-fill target remaining amount to pay
      const remainingGoal = Math.max(0, state.config.goalPerPerson - student.paidAmount);
      document.getElementById("payment-amount").value = remainingGoal > 0 ? remainingGoal : state.config.goalPerPerson;
    });
  });

  // 8. Payment Form submit
  document.getElementById("form-record-payment").addEventListener("submit", async (e) => {
    e.preventDefault();
    const sno = Number(document.getElementById("payment-student-no").value);
    const amount = Number(document.getElementById("payment-amount").value);
    const desc = document.getElementById("payment-description").value;
    const method = document.getElementById("payment-method").value;
    
    const student = state.students.find(s => s.no === sno);
    if (!student) return;

    const success = await recordTransaction({
      type: "income",
      description: desc || `จ่ายเงินห้องโดยนักเรียน เลขที่ ${student.no}`,
      amount: amount,
      studentId: student.id,
      slipBase64: tempSlipBase64,
      method: method
    });

    if (success) {
      toggleModal("modal-record-payment", false);
      const methodText = method === "cash" ? "เงินสด" : "เงินโอน";
      alert(`บันทึกการรับชำระเงินของ ${student.name} ยอดเงิน ฿${amount.toFixed(2)} (${methodText}) สำเร็จ`);
    }
  });

  // Dynamic labels for payment method in Modal 1
  document.getElementById("payment-method").addEventListener("change", (e) => {
    const val = e.target.value;
    const label = document.getElementById("payment-slip-label");
    const help = document.getElementById("payment-slip-help");
    if (val === "cash") {
      label.textContent = "รูปภาพหลักฐานใบเสร็จเงินสด (ไม่จำเป็นสำหรับเงินสด)";
      help.textContent = "แนบรูปถ่ายกระดาษเขียนรับเงินสดหรือสลิปโอน (หากมี)";
    } else {
      label.textContent = "รูปภาพหลักฐานสลิปโอนเงิน (สลิป PromptPay) *";
      help.textContent = "กรุณาแนบไฟล์สลิปการโอนเงินเพื่อความโปร่งใสและตรวจสอบภายหลังได้";
    }
  });

  // 9. General Transactions forms modals trigger
  document.getElementById("btn-add-income-modal").addEventListener("click", () => {
    toggleModal("modal-record-transaction", true, () => {
      document.getElementById("transaction-modal-title").innerHTML = `<i class="fa-solid fa-circle-plus text-success"></i> บันทึกรายรับสมทบ`;
      document.getElementById("trans-type").value = "income";
      document.getElementById("student-select-group").style.display = "block"; // Show student selector
      
      const collector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิก" };
      document.getElementById("trans-collector").value = collector.name;
      document.getElementById("btn-save-transaction").className = "btn btn-success";
      document.getElementById("btn-save-transaction").textContent = "บันทึกรายรับ";
    });
  });

  document.getElementById("btn-add-expense-modal").addEventListener("click", () => {
    toggleModal("modal-record-transaction", true, () => {
      document.getElementById("transaction-modal-title").innerHTML = `<i class="fa-solid fa-circle-minus text-danger"></i> บันทึกรายจ่ายค่าของ`;
      document.getElementById("trans-type").value = "expense";
      document.getElementById("student-select-group").style.display = "none"; // Hide student selector for expenses
      
      const collector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิก" };
      document.getElementById("trans-collector").value = collector.name;
      document.getElementById("btn-save-transaction").className = "btn btn-danger";
      document.getElementById("btn-save-transaction").textContent = "บันทึกรายจ่าย";
    });
  });

  // 10. General Transaction Form Submit
  document.getElementById("form-record-transaction").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("trans-type").value;
    const desc = document.getElementById("trans-description").value;
    const amount = Number(document.getElementById("trans-amount").value);
    const studentId = document.getElementById("trans-student-select").value;
    const method = document.getElementById("trans-method").value;

    const success = await recordTransaction({
      type: type,
      description: desc,
      amount: amount,
      studentId: type === "income" ? studentId : "",
      slipBase64: tempSlipBase64,
      method: method
    });

    if (success) {
      toggleModal("modal-record-transaction", false);
      document.getElementById("form-record-transaction").reset();
      const methodText = method === "cash" ? "เงินสด" : "เงินโอน";
      alert(`บันทึกรายการบัญชีสำเร็จ: ${desc} ยอดเงิน ฿${amount.toFixed(2)} (${methodText})`);
    }
  });

  // 11. View Slip triggers in tables (delegation)
  const viewSlipHandler = (e) => {
    const btn = e.target.closest(".btn-view-slip");
    if (!btn) return;
    
    const txid = btn.getAttribute("data-txid");
    const tx = state.transactions.find(t => t.id === txid);
    if (!tx) return;

    toggleModal("modal-view-slip", true, () => {
      document.getElementById("slip-image-full").src = tx.slipUrl;
      
      // Update details side text
      const detailsBox = document.getElementById("slip-view-details");
      const methodDisplay = tx.method === 'transfer' ? '📱 โอนผ่านธนาคาร/พร้อมเพย์' : '💵 เงินสด';
      detailsBox.innerHTML = `
        <p><strong>เลขที่สลิปธุรกรรม:</strong> <span class="value-highlight">${tx.id}</span></p>
        <p><strong>วันเวลาที่โอน/ชำระ:</strong> <span class="value-highlight">${tx.timestamp}</span></p>
        <p><strong>ประเภทรายการ:</strong> <span class="value-highlight">${tx.type === 'income' ? 'รายรับ (เงินห้อง)' : 'รายจ่าย (ค่าใช้จ่าย)'}</span></p>
        <p><strong>ช่องทางการชำระ:</strong> <span class="value-highlight">${methodDisplay}</span></p>
        <p><strong>รายละเอียดของบัญชี:</strong> <span class="value-highlight">${tx.description}</span></p>
        <p><strong>จำนวนเงินรวม:</strong> <span class="value-highlight font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}" style="font-size:1.1rem">฿${tx.amount.toFixed(2)}</span></p>
        <p><strong>เหรัญญิกผู้อนุมัติ:</strong> <span class="value-highlight">${tx.collector}</span></p>
      `;
    });
  };

  document.getElementById("recent-transactions-table").addEventListener("click", viewSlipHandler);
  document.getElementById("full-transactions-table").addEventListener("click", viewSlipHandler);

  // 12. Delete transaction handler
  document.getElementById("full-transactions-table").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete-tx");
    if (!btn) return;
    const txid = btn.getAttribute("data-txid");
    deleteTransaction(txid);
  });

  // 13. File upload zone triggers (Payment Slip)
  const zone1 = document.getElementById("payment-slip-upload-zone");
  const fileInput1 = document.getElementById("payment-slip-file");
  zone1.addEventListener("click", () => fileInput1.click());
  fileInput1.addEventListener("change", (e) => {
    handleSlipFileSelection(e.target.files[0], document.getElementById("payment-slip-preview"), zone1);
  });

  // File upload zone triggers (General Transaction)
  const zone2 = document.getElementById("trans-slip-upload-zone");
  const fileInput2 = document.getElementById("trans-slip-file");
  zone2.addEventListener("click", () => fileInput2.click());
  fileInput2.addEventListener("change", (e) => {
    handleSlipFileSelection(e.target.files[0], document.getElementById("trans-slip-preview"), zone2);
  });

  // Support Drag and drop file uploads
  [zone1, zone2].forEach(zone => {
    const fileInput = zone.id === "payment-slip-upload-zone" ? fileInput1 : fileInput2;
    const previewImg = zone.id === "payment-slip-upload-zone" ? document.getElementById("payment-slip-preview") : document.getElementById("trans-slip-preview");

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.style.borderColor = "var(--primary)";
      zone.style.backgroundColor = "rgba(59, 130, 246, 0.05)";
    });

    zone.addEventListener("dragleave", () => {
      zone.style.borderColor = "var(--border-color)";
      zone.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.style.borderColor = "var(--border-color)";
      zone.style.backgroundColor = "rgba(255, 255, 255, 0.01)";
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        fileInput.files = e.dataTransfer.files;
        handleSlipFileSelection(file, previewImg, zone);
      }
    });
  });

  // 14. Save settings: Collector
  document.getElementById("form-collector-settings").addEventListener("submit", (e) => {
    e.preventDefault();
    const oldCollectorId = state.config.currentCollectorId;
    const newCollectorId = document.getElementById("input-current-collector").value;
    const teacherName = document.getElementById("input-teacher-name").value;
    const promptpayId = document.getElementById("input-promptpay-id").value;
    const promptpayName = document.getElementById("input-promptpay-name").value;
    const appsScriptUrl = document.getElementById("input-apps-script-url").value.trim();

    const oldCol = state.students.find(s => s.id === oldCollectorId) || { name: "ยังไม่มีชื่อ" };
    const newCol = state.students.find(s => s.id === newCollectorId) || { name: "ยังไม่มีชื่อ" };

    // Validate Google Apps Script URL format
    if (appsScriptUrl !== "" && (!appsScriptUrl.startsWith("https://script.google.com/macros/s/") || !appsScriptUrl.includes("/exec"))) {
      alert("⚠️ รูปแบบ URL ของ Google Apps Script ไม่ถูกต้อง!\n\nลิงก์ต้องขึ้นต้นด้วย 'https://script.google.com/macros/s/' และมีคำว่า '/exec' (เช่น ลิงก์ที่ได้จากการ Deploy Web App ไม่ใช่ลิงก์ Google Sheets ค่ะ)");
      return;
    }

    state.config.currentCollectorId = newCollectorId;
    state.config.teacherName = teacherName;
    state.config.promptpayId = promptpayId;
    state.config.promptpayName = promptpayName;
    state.config.appsScriptUrl = appsScriptUrl;

    let log = null;
    // Auditing change logs
    if (oldCollectorId !== newCollectorId) {
      log = {
        timestamp: formatThaiDateTime(new Date()),
        title: "เปลี่ยนตัวคนเก็บเงินห้องอย่างเป็นทางการ",
        desc: `คุณครูผู้ควบคุมเปลี่ยนตัวคนดูแลกระเป๋าเงินห้องจาก ${oldCol.name} ส่งต่อให้ ${newCol.name} เป็นเหรัญญิกคนใหม่ ยอดคงเหลือส่งมอบ ณ ตอนนี้คือ ฿${state.stats.balance.toLocaleString('th-TH')}`,
        author: teacherName
      };
      state.collectorHistory.push(log);
    } else {
      log = {
        timestamp: formatThaiDateTime(new Date()),
        title: "อัปเดตข้อมูลการเชื่อมต่อพร้อมเพย์",
        desc: `เหรัญญิกปรับปรุงข้อมูลบัญชีพร้อมเพย์รับเงินห้องเป็น: ${promptpayName} (${promptpayId})`,
        author: newCol.name
      };
      state.collectorHistory.push(log);
    }

    calculateStats();
    saveToLocalStorage();
    renderAll();

    // Cloud sync settings & logs
    syncSettingsToCloud();
    if (log) syncHistoryToCloud(log);

    alert("บันทึกข้อมูลการตั้งค่าผู้ดูแลเรียบร้อยแล้ว");
  });

  // 15. Save settings: Goal
  document.getElementById("form-goal-settings").addEventListener("submit", (e) => {
    e.preventDefault();
    const goalVal = Number(document.getElementById("input-goal-amount").value);
    
    state.config.goalPerPerson = goalVal;

    const currentCollector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิกห้อง" };
    const log = {
      timestamp: formatThaiDateTime(new Date()),
      title: "ปรับปรุงอัตราเป้าหมายค่าเงินห้อง",
      desc: `มีการปรับปรุงอัตราเงินห้องต่อหัวเป็นคนละ ฿${goalVal.toFixed(2)} (เป้าหมายรวม 36 คน = ฿${(goalVal * 36).toLocaleString('th-TH')})`,
      author: currentCollector.name
    };
    state.collectorHistory.push(log);

    calculateStats();
    saveToLocalStorage();
    renderAll();

    // Cloud sync settings & logs
    syncSettingsToCloud();
    syncHistoryToCloud(log);

    alert("อัปเดตอัตราค่าเงินห้องเรียบร้อยแล้ว");
  });

  // 16. Reset database trigger
  document.getElementById("btn-reset-database").addEventListener("click", () => {
    resetDatabase();
  });

  // 17. Toggle Role Mode with Password Auth
  document.getElementById("btn-toggle-role").addEventListener("click", () => {
    if (userRole !== "student") {
      userRole = "student";
      renderAll();
      alert("สลับกลับเป็นโหมดนักเรียน (ดูอย่างเดียว) เรียบร้อยแล้ว");
    } else {
      // Clear password field and show modal
      document.getElementById("admin-password-input").value = "";
      document.getElementById("auth-error-msg").style.display = "none";
      toggleModal("modal-admin-auth", true);
    }
  });

  // 18. Submit Admin PIN Auth Form
  document.getElementById("form-admin-auth").addEventListener("submit", (e) => {
    e.preventDefault();
    const pinVal = document.getElementById("admin-password-input").value.trim();
    
    const collectorPin = state.config.collectorPassword || "1234";
    let teacherPin = state.config.teacherPassword || "2301";
    
    // Automatically migrate old 9999 password
    if (teacherPin === "9999") {
      teacherPin = "2301";
      state.config.teacherPassword = "2301";
      saveToLocalStorage();
      syncSettingsToCloud();
    }

    if (pinVal === teacherPin) {
      userRole = "teacher";
      toggleModal("modal-admin-auth", false);
      renderAll();
      alert("🔓 ยืนยันสิทธิ์คุณครูประจำชั้นสำเร็จ! ปลดล็อกสิทธิ์ลบรายการและตั้งค่าขั้นสูง");
    } else if (pinVal === collectorPin) {
      userRole = "collector";
      toggleModal("modal-admin-auth", false);
      renderAll();
      alert("🔑 ยืนยันสิทธิ์เหรัญญิกห้องสำเร็จ! ปลดล็อกการบันทึกชำระเงินและรายจ่าย (สิทธิ์ลบและตั้งค่าถูกล็อกไว้)");
    } else {
      document.getElementById("auth-error-msg").style.display = "block";
      document.getElementById("admin-password-input").value = "";
      document.getElementById("admin-password-input").focus();
    }
  });

  // Call batch payment event setup
  setupBatchPaymentEvents();
}

// Setup Daily Batch Collection Event Listeners
function setupBatchPaymentEvents() {
  const openBtn1 = document.getElementById("btn-add-batch-modal");
  const openBtn2 = document.getElementById("btn-add-batch-modal-students");
  const batchModal = document.getElementById("modal-batch-payment");
  const batchForm = document.getElementById("form-batch-payment");
  const studentListBody = document.getElementById("batch-student-list-body");
  
  if (!batchModal || !batchForm) return;

  const handleOpen = () => {
    if (userRole === "student") {
      alert("🔒 เฉพาะเหรัญญิกหรือคุณครูเท่านั้นที่สามารถบันทึกเงินเก็บได้\nกรุณายืนยันสิทธิ์ก่อนดำเนินการ");
      document.getElementById("admin-password-input").value = "";
      document.getElementById("auth-error-msg").style.display = "none";
      toggleModal("modal-admin-auth", true);
      return;
    }

    // Set today's date in local time zone
    const now = new Date();
    const localDateStr = now.toLocaleDateString("en-CA"); // YYYY-MM-DD format
    document.getElementById("batch-date").value = localDateStr;

    // Default amount and description
    document.getElementById("batch-amount").value = "50";
    
    // Set default description based on today's date
    const dateFormatted = formatThaiDateTime(now).split(" - ")[0]; // Get date part
    document.getElementById("batch-description").value = `เงินเก็บสะสมรายวัน (${dateFormatted})`;

    // Generate checklist rows
    studentListBody.innerHTML = "";
    state.students.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="text-center" style="vertical-align: middle;">
          <input type="checkbox" class="batch-student-checkbox" data-id="${s.id}" style="width: 18px; height: 18px; cursor: pointer;">
        </td>
        <td style="vertical-align: middle;">${s.no}</td>
        <td style="vertical-align: middle;"><strong>เลขที่ ${s.no}</strong> - ${s.name}</td>
        <td class="text-right" style="vertical-align: middle;">
          <input type="number" class="form-control form-control-sm batch-student-amount-input" data-id="${s.id}" value="0" min="0" disabled style="width: 110px; text-align: right; display: inline-block; padding: 6px 10px;">
        </td>
      `;
      studentListBody.appendChild(row);
    });

    // Add listeners to checkboxes and input fields inside the checklist
    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    const amountInputs = studentListBody.querySelectorAll(".batch-student-amount-input");

    checkboxes.forEach(cb => {
      cb.addEventListener("change", () => {
        const studentId = cb.getAttribute("data-id");
        const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
        if (input) {
          if (cb.checked) {
            input.removeAttribute("disabled");
            input.value = document.getElementById("batch-amount").value;
          } else {
            input.setAttribute("disabled", "true");
            input.value = "0";
          }
          calculateBatchSummary();
        }
      });
    });

    amountInputs.forEach(input => {
      input.addEventListener("input", () => {
        calculateBatchSummary();
      });
    });

    calculateBatchSummary();
    toggleModal("modal-batch-payment", true);
  };

  if (openBtn1) openBtn1.addEventListener("click", handleOpen);
  if (openBtn2) openBtn2.addEventListener("click", handleOpen);

  // Recalculate summary totals
  function calculateBatchSummary() {
    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    let checkedCount = 0;
    let totalAmount = 0;

    checkboxes.forEach(cb => {
      if (cb.checked) {
        checkedCount++;
        const studentId = cb.getAttribute("data-id");
        const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
        if (input) {
          totalAmount += Number(input.value) || 0;
        }
      }
    });

    document.getElementById("batch-total-summary").textContent = `จ่ายแล้ว ${checkedCount} คน | ยอดรวม ฿${totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
  }

  // Handle batch amount change: updates checked students prefilled amount
  document.getElementById("batch-amount").addEventListener("input", (e) => {
    const defaultAmt = e.target.value;
    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    checkboxes.forEach(cb => {
      if (cb.checked) {
        const studentId = cb.getAttribute("data-id");
        const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
        if (input) {
          input.value = defaultAmt;
        }
      }
    });
    calculateBatchSummary();
  });

  // Check all students
  document.getElementById("btn-batch-check-all").addEventListener("click", () => {
    const defaultAmt = document.getElementById("batch-amount").value;
    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    checkboxes.forEach(cb => {
      cb.checked = true;
      const studentId = cb.getAttribute("data-id");
      const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
      if (input) {
        input.removeAttribute("disabled");
        input.value = defaultAmt;
      }
    });
    calculateBatchSummary();
  });

  // Uncheck all students
  document.getElementById("btn-batch-uncheck-all").addEventListener("click", () => {
    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    checkboxes.forEach(cb => {
      cb.checked = false;
      const studentId = cb.getAttribute("data-id");
      const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
      if (input) {
        input.setAttribute("disabled", "true");
        input.value = "0";
      }
    });
    calculateBatchSummary();
  });

  // Submit batch payment form
  batchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateVal = document.getElementById("batch-date").value;
    const desc = document.getElementById("batch-description").value;
    const currentCollector = state.students.find(s => s.id === state.config.currentCollectorId) || { name: "เหรัญญิกห้อง" };
    const collectorName = currentCollector.name;

    const checkboxes = studentListBody.querySelectorAll(".batch-student-checkbox");
    const records = [];

    checkboxes.forEach(cb => {
      if (cb.checked) {
        const studentId = cb.getAttribute("data-id");
        const input = studentListBody.querySelector(`.batch-student-amount-input[data-id="${studentId}"]`);
        const amount = Number(input.value) || 0;
        if (amount > 0) {
          records.push({ studentId, amount });
        }
      }
    });

    if (records.length === 0) {
      alert("⚠️ กรุณาเลือกติ๊กจ่ายเงินให้นักเรียนอย่างน้อย 1 คน ที่มียอดจ่ายมากกว่า 0 บาท");
      return;
    }

    // Combine YYYY-MM-DD + current time for timestamp
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const combinedDate = new Date(`${dateVal}T${timeStr}`);
    const dateStr = formatThaiDateTime(isNaN(combinedDate.getTime()) ? now : combinedDate);

    // Create all transactions list
    const newTxs = [];
    let totalAmt = 0;
    records.forEach(rec => {
      const studentObj = state.students.find(s => s.id === rec.studentId);
      const txid = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      totalAmt += rec.amount;

      // Draw digital receipt cash stamp automatically
      const finalSlip = generateDigitalReceipt(
        studentObj ? studentObj.name : "เงินสมทบกองกลางห้อง",
        rec.amount,
        "income",
        dateStr,
        txid,
        collectorName,
        "cash"
      );

      const newTx = {
        id: txid,
        timestamp: dateStr,
        type: "income",
        studentId: rec.studentId,
        studentNo: studentObj ? studentObj.no : "",
        studentName: studentObj ? studentObj.name : "",
        amount: Number(rec.amount),
        description: desc || `เก็บเงินห้องโดยเหรัญญิก`,
        collector: collectorName,
        method: "cash",
        slipUrl: finalSlip
      };

      newTxs.push(newTx);
    });

    // Add batch collection log to timeline history
    const log = {
      timestamp: formatThaiDateTime(new Date()),
      title: "บันทึกเก็บเงินรายวันแบบด่วน (Batch)",
      desc: `มีการบันทึกเก็บเงินห้องแบบด่วนจำนวน ${records.length} คน มียอดรวม ฿${totalAmt.toLocaleString('th-TH', { minimumFractionDigits: 2 })} รายละเอียด: "${desc}"`,
      author: collectorName
    };

    // Cloud sync batch list first (if online URL exists)
    if (state.config.appsScriptUrl) {
      showLoading(`กำลังซิงค์รายการบันทึกเงินสดแบบกลุ่มจำนวน ${newTxs.length} คน ลง Google Sheets ออนไลน์...`);
      try {
        await syncTransactionsToCloud(newTxs);
        // Also sync history log and settings in the background or await
        await syncHistoryToCloud(log);
        hideLoading();
      } catch (err) {
        hideLoading();
        return; // Sync failed, abort local save
      }
    }

    // Save all to local state
    newTxs.forEach(newTx => {
      state.transactions.push(newTx);
    });
    state.collectorHistory.push(log);
    
    // Save state
    calculateStats();
    saveToLocalStorage();
    renderAll();

    toggleModal("modal-batch-payment", false);
    alert(`🎉 บันทึกจ่ายเงินด่วนสำเร็จ! บันทึกธุรกรรมแล้ว ${records.length} รายการ รวมยอดรับเงินสดทั้งสิ้น ฿${totalAmt.toLocaleString('th-TH')}`);
  });
}

// Init Entry Point
window.addEventListener("DOMContentLoaded", () => {
  loadInitialData();
  setupEventListeners();
});
