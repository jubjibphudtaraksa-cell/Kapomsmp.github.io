# Kapom Web (หน้าเชื่อมบัญชี)

ไฟล์: `index.html`, `style.css`, `app.js`, `config.js` — static ล้วน ไม่ต้อง build

## ตั้งค่า (`config.js`)
- `apiBase` = URL Backend แบบ `https://` (ต้องตรงกับโดเมนที่ Caddy/nginx ชี้ไป)
- `serverAddress` = ที่อยู่เซิร์ฟเวอร์เกม
- `getToken()` = **ต้องแก้ให้คืน JWT ของผู้ใช้ที่ล็อกอินอยู่** (ระบบล็อกอินของร้านต้องออก JWT HS256 เซ็นด้วย `WEB_JWT_SECRET` มี `sub` และ `exp`)
- `devTokenInput` = `true` เฉพาะตอนทดสอบ แล้วเปลี่ยนเป็น `false` ก่อนขึ้นจริง

## Backend `.env`
`WEB_ORIGIN` ต้องเป็น origin ของเว็บนี้เป๊ะ ๆ เช่น `https://kapom.example` (ไม่มี `/` ท้าย) ไม่งั้นเบราว์เซอร์ติด CORS

## ทดสอบเร็ว ๆ
1. รัน backend แล้วสร้าง token: `npm run make-token -- user-1`
2. เปิด `index.html` จากเว็บที่เป็น https (origin ตรง `WEB_ORIGIN`) วาง token ในช่อง
3. กรอกชื่อ → เห็น `/verify XXXXXXXX` → พิมพ์ในเกมด้วยชื่อเดียวกัน → หน้าเปลี่ยนเป็น Verified เอง

## หมายเหตุ
- รหัสแสดงได้ครั้งเดียวตอนสร้าง (backend เก็บแต่แฮช) ถ้ารีเฟรชหน้าระหว่าง Pending จะต้องขอรหัสใหม่
- CSP ใน `index.html` ใช้ `connect-src https:` แนะนำให้จำกัดเหลือโดเมน API ของคุณที่ header ของเว็บเซิร์ฟเวอร์
- ฟอนต์โหลดจาก Google Fonts ถ้าไม่ต้องการ ลบ 3 บรรทัด `<link>` ออกได้ จะใช้ฟอนต์ระบบแทน
- Verified ใช้ยืนยันตัวตนเท่านั้น ห้ามใช้แจกไอเทม/ยศ หรือแทนการยืนยันการชำระเงิน
