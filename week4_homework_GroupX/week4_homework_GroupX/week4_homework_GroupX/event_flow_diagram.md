
3. Event Design Flow
(หมายเหตุ: นำไปเปิดใน VS Code ด้วย Extension Mermaid Preview แล้วเซฟเป็นภาพ PNG)

ข้อมูลโค้ด
sequenceDiagram
    participant User A
    participant ChatService (Node A)
    participant Redis Pub/Sub
    participant ChatService (Node B)
    participant MongoDB
    participant User B

    Note over User A,User B: Both users are in the same Board Room

    User A->>ChatService (Node A): emit("send_message", boardId, data)
    
    ChatService (Node A)->>MongoDB: Save message to history
    
    ChatService (Node A)->>Redis Pub/Sub: publish(channel: boardId, messageData)
    
    ChatService (Node A)->>User A: emit("message_received", messageData)
    
    Redis Pub/Sub->>ChatService (Node B): receive messageData
    
    ChatService (Node B)->>User B: emit("message_received", messageData)
