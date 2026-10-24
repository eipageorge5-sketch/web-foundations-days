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