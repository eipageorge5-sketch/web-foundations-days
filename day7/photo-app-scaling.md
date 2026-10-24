# SnapShare Scaling Design

## 1. Assumptions and Estimates
Based on the provided starting facts, here are the calculated metrics:
- **Registered Users:** 10,000,000
- **Daily Active Users (DAU):** 1,000,000 (10% of registered users)
- **Uploads per second (average):** ~12 uploads/sec (1M uploads / 86,400 seconds)
- **Feed views per second (average):** ~579 views/sec (50M views / 86,400 seconds)
- **Feed views per second (peak, 5x average):** ~2,895 views/sec
- **Storage per year:** ~748 TB/year (1M daily uploads × 2.05 MB per photo+thumbnail × 365 days)

## 2. Read-Heavy vs. Write-Heavy
This system is **highly read-heavy** (approximately 50 reads for every 1 write). This means the architecture must be optimized to serve feed views as quickly and cheaply as possible. We achieve this by aggressively caching feed data and using read replicas, ensuring the database is not overwhelmed by read requests.

## 3. Why Photos Do Not Belong in the Database
Relational databases are optimized for structured data and fast querying, not for storing large binary files (BLOBs). Storing images directly in a database bloats its size, makes backups incredibly slow, and increases costs. Instead, photo files should be stored in **Object Storage** (e.g., AWS S3), while the database only stores the text URL pointing to that file.

## 5. Component Explanations (Problems Solved)
- **CDN:** Solves the problem of global latency by caching static assets and thumbnails at edge locations physically close to the user.
- **Load Balancer:** Solves the problem of server overload by distributing incoming traffic evenly across multiple app servers.
- **App Servers:** Solve the problem of processing business logic and API requests without storing user state, allowing the system to scale horizontally.
- **Cache (Redis):** Solves the problem of database starvation by storing frequently accessed feed data in ultra-fast memory, preventing the DB from being overwhelmed by reads.
- **Database (Primary + Read Replicas):** Solves the problem of concurrent read/write bottlenecks by separating heavy read traffic (replicas) from write operations (primary).
- **Object Storage:** Solves the problem of database bloat and high costs by cheaply storing massive binary image files outside the relational database.
- **Message Queue:** Solves the problem of slow user experience by buffering heavy background tasks so the app server can respond to the user immediately.
- **Worker:** Solves the problem of processing asynchronous tasks by listening to the queue and executing the actual thumbnail generation in the background.

## 6. Step-by-Step Upload Flow
1. The user selects a photo and clicks "Upload" in the client app.
2. The client sends the image payload to the Load Balancer, which routes it to an available App Server.
3. The App Server uploads the original 2 MB photo to Object Storage and receives a file URL.
4. The App Server saves the photo metadata (user ID, timestamp, file URL) to the Primary Database.
5. The App Server publishes a "thumbnail generation" message to the Message Queue.
6. The App Server immediately returns a "success" response to the client (asynchronous processing).
7. The Worker picks up the message from the queue, downloads the original image from Object Storage, generates the 50 KB thumbnail, and saves it back to Object Storage.
8. The Worker updates the Database record with the new thumbnail's URL.

## 7. Trade-offs
1. **Eventual Consistency vs. Immediate Consistency:** By using a message queue to generate thumbnails asynchronously, the upload feels lightning-fast to the user. The trade-off is that the user might see their newly uploaded post without a thumbnail for a few seconds until the worker finishes the job (eventual consistency).
2. **Client Direct Uploads vs. Routing through App Servers:** Allowing the client to upload directly to Object Storage (via pre-signed URLs) saves bandwidth and processing power on the App Servers. The trade-off is increased complexity in managing secure, time-limited access tokens and handling client-side errors, compared to the simpler but more resource-heavy approach of routing all uploads through the App Servers.

## 4. Architecture Diagram (Text-Based)

```text
[ Mobile/Web Client ] 
        │
        ▼
[ Content Delivery Network (CDN) ] ◄── (Serves cached thumbnails & static assets globally)
        │
        ▼
[ Load Balancer ] ──────────────────► (Distributes traffic evenly)
        │
        ├──► [ App Servers ] ────┐
        │        │               │
        │        ▼               ▼
        │  [ Cache (Redis) ]  [ Message Queue ] ──► [ Worker (Thumbnail Generator) ]
        │        │               │                          │
        │        ▼               │                          ▼
        └──► [ Database ] ◄──────┘                  [ Object Storage (Photos/Thumbnails) ]
             (Primary + Read Replicas)