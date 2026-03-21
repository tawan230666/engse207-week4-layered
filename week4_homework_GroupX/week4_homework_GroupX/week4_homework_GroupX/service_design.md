# 1. Service Design

## 1. ควรสร้าง Service ใหม่ (Chat Service) หรือเพิ่มใน Task Service?
**คำตอบ:** ควรสร้างเป็น **Service ใหม่ (Chat Service)**
**เหตุผล:**
- **Separation of Concerns:** ระบบ Task Board เป็นแบบ Request-Response (CRUD) ในขณะที่ Chat ต้องการการเชื่อมต่อแบบยาวนาน (Long-lived connection) และ Real-time
- **Scalability:** การแยก Service ทำให้เราสเกลส่วนที่รับโหลดหนัก (Chat) แยกต่างหากได้ โดยไม่ส่งผลกระทบให้ระบบ Task Service ล่มไปด้วย

## 2. ถ้าสร้าง Service ใหม่ → Technology Stack อะไร? เพราะอะไร?
**คำตอบ:** **Node.js** ร่วมกับ **Socket.io**
**เหตุผล:**
- Node.js มีสถาปัตยกรรมแบบ Event-driven และ Non-blocking I/O ซึ่งเก่งมากในการจัดการ Concurrent Connections จำนวนมากๆ เหมาะกับระบบแชท
- Socket.io มีฟีเจอร์สำเร็จรูปสำหรับจัดการ WebSocket, Fallback ไปใช้ Polling ได้, และมีระบบ Room/Namespace ที่ทำให้จัดการแชทแยกตามแต่ละ Board ได้ง่าย

## 3. Database ควรใช้อะไร? (SQL/NoSQL/Cache) เพราะอะไร?
**คำตอบ:** ใช้ **NoSQL (MongoDB)** ร่วมกับ **Cache (Redis)**
**เหตุผล:**
- **MongoDB:** โครงสร้างข้อมูลแชทไม่มี Schema ตายตัว (Unstructured Data) และเน้นความเร็วในการ Write สูง 
- **Redis:** ใช้เป็น Pub/Sub Broker สำหรับเชื่อมต่อ Chat Service หลายๆ Instance เข้าด้วยกัน เพื่อให้กระจายข้อความถึงผู้ใช้ที่ต่ออยู่กับ Instance อื่นได้ และใช้เป็น Cache เล็กๆ สำหรับเช็คสถานะ Online ของ User

## 4. Real-time ใช้ WebSocket หรือ Polling? Trade-offs?
**คำตอบ:** ใช้ **WebSocket**
**เหตุผลและ Trade-offs:**
- **ข้อดี:** สื่อสารแบบ 2 ทาง (Bi-directional) ได้แบบ Real-time จริงๆ และมี Latency ต่ำกว่า Polling เพราะไม่ต้องสร้าง HTTP Request ใหม่ทุกครั้ง (ลด Overhead ของ Header)
- **Trade-offs (ข้อเสียที่ต้องแลก):** จัดการความซับซ้อนเพิ่มขึ้น (Stateful) ถ้าระบบหลุดต้องเขียนโค้ดเพื่อ Reconnect และจัดการ Load Balancer ยากกว่า (ต้องทำ Sticky Sessions หรือใช้ Redis ช่วยกระจาย Message)
