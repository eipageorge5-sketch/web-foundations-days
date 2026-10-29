# TicketHub System Design

## 1. Requirements

### Functional Requirements
- Users can browse upcoming events and concerts
- Users can view the seating chart and availability for a specific event
- Users can temporarily hold seats while completing checkout (5-minute window)
- Users can purchase tickets and complete payment
- Users can view their purchased tickets in their account

### Non-Functional Requirements
- **Speed:** Pages load in under 1 second
- **Availability:** 99.9% uptime (the site must be accessible during high-demand sales)
- **Correctness:** No double-booking (two users cannot purchase the same seat)
- **Fairness:** During high-demand sales, all users have a fair chance to get tickets (no bots or queue-jumping)
- **Scalability:** Handle 200,000 concurrent users during a big sale without crashing

---

## 2. Load Estimates

### Normal Day Traffic
- **Registered users:** 2,000,000
- **Daily visitors:** 50,000
- **Page views per visitor:** 10 pages
- **Total page views per day:** 500,000
- **Requests per second (average):** 500,000 ÷ 86,400 seconds ≈ **6 requests/sec**
- **Tickets sold per day:** 5,000
- **Purchases per second (average):** 5,000 ÷ 86,400 ≈ **0.06 purchases/sec**

### Big Sale Traffic (Popular Concert)
- **Concurrent users:** 200,000 people trying to buy within 10 minutes
- **Available seats:** 20,000
- **Requests per second (peak):** 200,000 ÷ 600 seconds ≈ **333 requests/sec**
- **Successful purchases per second:** 20,000 ÷ 600 ≈ **33 purchases/sec**

### Key Insight
- Normal traffic: **6 requests/sec**
- Big sale traffic: **333 requests/sec** (55x higher)
- The system must handle a **55x traffic spike** without degradation
- Read-to-write ratio: ~10:1 (read-heavy, but not as extreme as photo sharing)

### Conclusion
The architecture must be optimized to handle sudden traffic spikes during high-demand sales while maintaining data integrity (preventing double-booking).

## 2. API Design
The TicketHub API exposes the following RESTful endpoints to handle browsing, holding, and purchasing tickets.

| Method | Path | Description | Success Status |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/events` | Browse a paginated list of upcoming events and concerts. | `200 OK` |
| `GET` | `/api/events/{id}/seats` | View the seating chart and availability for a specific event. | `200 OK` |
| `POST` | `/api/seats/hold` | Temporarily reserve a specific seat for a user for 5 minutes while they complete checkout. | `201 Created` |
| `POST` | `/api/orders` | Confirm payment and convert a held seat into a permanent ticket order. | `201 Created` |
| `GET` | `/api/users/{id}/tickets` | Retrieve a list of all purchased tickets for a specific user. | `200 OK` |

### Example: Holding a Seat (POST /api/seats/hold)
**Request Body:**
```json
{
  "event_id": 42,
  "seat_id": "A1",
  "user_id": 105
}

{
  "hold_id": "h_99x8y",
  "expires_at": "2026-11-05T14:35:00Z",
  "message": "Seat A1 held successfully for 5 minutes."
}

{
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "Seat A1 is no longer available. Please select another seat."
  }
}
```


### 3. Data Model

### Entities and Relationships
- **users**: Stores user account information. (One-to-Many with orders)
- **events**: Stores concert/event details. (One-to-Many with seats)
- **seats**: Stores individual seats for a specific event. (One-to-Many with holds and orders)
- **seat_holds**: Temporarily reserves a seat for a user for 5 minutes during checkout.
- **orders**: Represents a confirmed, paid purchase of a held seat.

### Database Schema (SQL)
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    event_date TIMESTAMP NOT NULL,
    venue TEXT NOT NULL
);

CREATE TABLE seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    row_label TEXT NOT NULL,
    seat_number TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE seat_holds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL UNIQUE, -- Prevents multiple holds on the same seat
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    seat_id INTEGER NOT NULL UNIQUE, -- Prevents double-booking after purchase
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

   SELECT * FROM seats WHERE id = ? FOR UPDATE;

---
```

## 4. Architecture and Scaling

### High-Level Architecture Diagram

```text
[ Client (Web/Mobile) ]
         │
         ▼
[ CDN (Cloudflare) ] ──► (Caches static assets: HTML, CSS, JS, seat map images)
         │
         ▼
[ Load Balancer ] ──► (Distributes traffic, prevents any single server from crashing)
         │
    ┌────┴────┐
    ▼         ▼
[ App Server 1 ]  [ App Server 2 ]  (Stateless, handles API logic)
    │         │
    ├─► [ Cache (Redis) ] ◄─┤ (Caches available seats per event to prevent DB overload)
    │         │
    ▼         ▼
[ Primary Database ] ──► [ Read Replica Database ] (Handles read-only queries like browsing events)
    │
    ▼
[ Message Queue (RabbitMQ) ] ──► [ Background Worker ] (Cleans up expired holds, sends email receipts)
```

### Preventing Double-Booking (The Critical Mechanism)

Double-booking is prevented by wrapping the seat check and hold creation into a single, atomic **Database Transaction**. This ensures that the "check" and the "commit" happen together, with no other user able to interfere in between. 

The step-by-step transaction workflow is:
1. **`BEGIN`**: The application starts a database transaction.
2. **`SELECT ... FOR UPDATE`**: The app queries the seat: `SELECT * FROM seats WHERE id = ? FOR UPDATE;`. This places an exclusive row-level lock on that specific seat. If another user's transaction is already holding this lock, the current transaction waits in a queue.
3. **Check Availability**: The app verifies the seat is not already in the `seat_holds` or `orders` table.
4. **`INSERT`**: If available, the app inserts the reservation: `INSERT INTO seat_holds (user_id, seat_id, expires_at) VALUES (?, ?, ?);`. Because `seat_id` has a `UNIQUE` constraint, the database will physically reject this step if a hold already exists.
5. **`COMMIT` or `ROLLBACK`**: 
   - If the insert succeeds, the app runs `COMMIT`, saving the hold to the database and releasing the lock.
   - If the seat was already taken or an error occurs, the app runs `ROLLBACK`, discarding the attempt and releasing the lock immediately.

**Cleanup**: A background worker runs every minute to execute `DELETE FROM seat_holds WHERE expires_at < NOW()`, instantly freeing up unpaid seats for other users.

### How the Design Survives the Big Sale
During the 10-minute spike (333 req/sec), the CDN absorbs static asset requests. The Cache serves the seating chart availability, meaning the database only receives actual "Hold" and "Order" write requests (around 33 writes/sec), rather than being overwhelmed by 300+ read requests from refreshing browsers. The Row-Level Locking ensures that even under heavy load, the database processes holds sequentially and safely, preventing double-booking without crashing.

### Trade-offs
1. **Redis Distributed Locks vs. SQL Row Locks:** For seat reservations, we could use Redis for ultra-fast distributed locking, or rely on SQL `SELECT ... FOR UPDATE` row locks. We chose SQL row locks because they guarantee strict, immediate consistency and data integrity at the database level, which is non-negotiable for financial transactions. The trade-off is slightly higher latency during peak concurrency compared to Redis, but it completely eliminates the risk of double-booking.

2. **Eventual Consistency vs. Strict Consistency:** By caching seat availability in Redis, there is a slight risk that the cache shows a seat as available when it was just purchased a millisecond ago. We accept this trade-off (eventual consistency) because the 5-minute hold window and the database `UNIQUE` constraint act as the ultimate safety net, while giving 99% of users a lightning-fast browsing experience.
