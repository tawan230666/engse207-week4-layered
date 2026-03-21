# 2. Architecture Diagram
*(หมายเหตุ: นำไปเปิดใน VS Code ด้วย Extension Mermaid Preview แล้วเซฟเป็นภาพ PNG)*

```mermaid
graph TD
    Client[Client App / Browser]
    
    subgraph "API Gateway Layer"
        Gateway[API Gateway]
    end
    
    subgraph "Microservices Layer"
        TaskService[Task Service]
        ChatService1[Chat Service - Instance 1]
        ChatService2[Chat Service - Instance 2]
    end
    
    subgraph "Data Storage & Pub/Sub"
        TaskDB[(SQLite / PostgreSQL)]
        ChatDB[(MongoDB - Chat History)]
        Redis[(Redis Pub/Sub)]
    end
    
    Client -->|HTTPS / WSS| Gateway
    Gateway -->|REST API| TaskService
    Gateway -->|WebSocket / REST| ChatService1
    Gateway -->|WebSocket / REST| ChatService2
    
    TaskService --> TaskDB
    
    ChatService1 -.->|Publish / Subscribe| Redis
    ChatService2 -.->|Publish / Subscribe| Redis
    
    ChatService1 -->|Read / Write| ChatDB
    ChatService2 -->|Read / Write| ChatDB
