// ตั้งค่าเว็บ — ไม่มี Secret ในไฟล์นี้ (ห้ามใส่ PLUGIN_API_SECRET / WEB_JWT_SECRET ที่นี่)
window.KAPOM_CONFIG = {
  // URL ของ Backend ต้องเป็น https:// เท่านั้น (ไม่มี / ท้ายสุด)
  apiBase: 'https://api.kapom.example',

  // ที่อยู่เซิร์ฟเวอร์เกม แสดงในคำแนะนำ
  serverAddress: 'play.kapom.example',

  // *** ต้องแก้ให้เชื่อมกับระบบล็อกอินของร้าน ***
  // ฟังก์ชันนี้ต้องคืน JWT (HS256) ของผู้ใช้ที่ล็อกอินอยู่ ซึ่งระบบล็อกอินของร้านเป็นผู้ออก
  // ค่าเริ่มต้นอ่านจาก sessionStorage ที่ชื่อ kapom_token
  getToken() {
    try { return sessionStorage.getItem('kapom_token') || ''; } catch (e) { return ''; }
  },

  // true = แสดงช่องวาง token สำหรับทดสอบ (npm run make-token) — ปิดเป็น false ตอนใช้งานจริง
  devTokenInput: true,
};
