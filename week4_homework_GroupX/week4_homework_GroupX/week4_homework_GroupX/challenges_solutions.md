
5. Challenges & Solutions
Challenge 1: Message Order (ลำดับข้อความ)
ปัญหา: ในระบบที่มีผู้ใช้หลายคนส่งข้อความพร้อมๆ กัน หรือใช้ Microservices หลายตัว อาจทำให้ข้อความสลับลำดับกันได้ถ้าอิงจากเวลาเครื่อง Client

Solution: ใช้การประทับเวลาที่ฝั่งเซิร์ฟเวอร์ (Server-side Timestamping) โดยเมื่อข้อความมาถึง Chat Service จะบันทึกเวลาก่อนบันทึกลง Database แล้วเรียงลำดับตามเวลานั้นตอน Query

Challenge 2: Message Delivery Guarantee
ปัญหา: ผู้รับอาจเน็ตเวิร์กไม่เสถียร ทำให้พลาดบางข้อความระหว่างที่เชื่อมต่อหลุดชั่วคราว

Solution: 1. ใช้ระบบ Acknowledgment (ACK) โดยเมื่อ Client ได้รับข้อความ จะต้องตอบกลับ Server
2. เมื่อ Client reconnect สำเร็จ ให้ส่ง Event ขอเช็คข้อความล่าสุด (sync) โดยเปรียบเทียบจาก lastMessageId ที่ตัวเองมี

Challenge 3: Scalability (เมื่อมีผู้ใช้หลายพัน)
ปัญหา: WebSocket ใช้การเชื่อมต่อแบบ Persistent 1 Server รองรับได้จำกัด (เช่น หมื่น connections) หากคนใช้เยอะ Server จะล่ม

Solution: 1. ทำ Horizontal Scaling เพิ่มจำนวน Chat Service Instances
2. ใช้ Redis Pub/Sub เพื่อเชื่อมโยงแต่ละ Instances เข้าด้วยกัน ทำให้คนที่ต่ออยู่เครื่อง A คุยกับคนที่ต่อเครื่อง B ได้
3. กำหนดค่า API Gateway/Load Balancer ให้รองรับ WebSocket (เช่น ใช้ Sticky Sessions)

Challenge 4: Chat History (เก็บอย่างไร? เก็บนานแค่ไหน?)
ปัญหา: ข้อมูลแชทเพิ่มขึ้นรวดเร็วมาก หากเก็บใน Database ตัวเดียวตลอดไปจะทำให้ Query ช้าลงและเปลืองค่าใช้จ่าย

Solution: ใช้สถาปัตยกรรมแบบ Data Tiering:

Hot Data: ข้อมูลแชทล่าสุด (เช่น ย้อนหลัง 30 วัน) เก็บใน MongoDB เพื่อความรวดเร็วในการแสดงผล

Cold Data: ข้อมูลที่เก่ากว่า 30 วัน จะถูกลบจาก MongoDB และโอนไปเก็บ (Archive) ในระบบจัดเก็บข้อมูลราคาถูก เช่น AWS S3 (เก็บเป็นไฟล์ JSON) หรือ Database ราคาถูก และให้ Client เรียกดูได้โดยส่ง Request เป็นครั้งๆ
