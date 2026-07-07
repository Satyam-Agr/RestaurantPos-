# RestaurantPos - In-House Restaurant Order & Management System

A complete restaurant ordering and management solution where customers scan a QR code at their table, order food, manage shared carts with fellow table-mates, and track their orders from placement through delivery and payment.

## Project Structure

```
RestaurantPos/
├── backend/                    # Spring Boot Java backend
│   ├── src/                   # Source code
│   ├── pom.xml                # Maven configuration
│   ├── Dockerfile             # Docker build for backend
│   ├── docker-compose.yml     # Full stack Docker Compose
│   └── ...                    # Other backend files
├── frontend/                   # React web application (coming soon)
├── .gitignore                 # Git ignore rules
└── README.md                  # This file
```

## Features

### Customer Features
- **Scan & Order**: Scan table QR code to start ordering
- **Shared Carts**: Multiple guests at the same table share a live cart
- **PIN-Based Join**: 4-digit PIN allows table-mates to join the order list
- **Order History**: View status of placed orders from placement through delivery
- **Multiple Orders**: Submit cart, then keep adding items for a second round

### Waiter Features
- **Order Confirmation**: Review and confirm customer orders before sending to kitchen
- **Pre-Confirm Editing**: Adjust item quantities or remove items before confirming (changes push live to customer)
- **Order Tracking**: See all pending and ready-to-serve orders
- **Bill Management**: Trigger bill generation for the customer

### Kitchen Features
- **Live Queue**: See confirmed orders and their preparation status
- **Status Updates**: Mark items as PREPARING → READY as they cook
- **Order Details**: Full menu item details, special notes, quantities

### Cashier Features
- **Pending Bills**: View all tables awaiting payment
- **Bill Generation**: Calculate subtotal, tax, discount, total
- **Payment Processing**: Record payment method (cash/card/UPI)
- **Session Close**: Automatically freeing the table for the next service

### Admin/Analytics
- **Order Status Events**: Audit trail of every status change (who changed what, when)
- **Analytics Dashboard** (coming soon): Prep times, table turnover, best-sellers

## Technology Stack

### Backend
- **Language**: Java 21
- **Framework**: Spring Boot 3.5.0
- **Database**: MySQL 8.0
- **Real-time**: Spring WebSocket (STOMP over SockJS)
- **Auth**: JWT + Spring Security
- **Build**: Maven

### Frontend
- **Framework**: React (to be built)
- **Real-time Client**: STOMP/SockJS WebSocket client
- **Styling**: TBD

## Getting Started

### Prerequisites
- Java 21+
- MySQL 8.0+
- Maven 3.6+

### Backend Setup

1. **Configure Database**
   ```bash
   # Create database
   mysql -u root -p -e "CREATE DATABASE projectDB;"
   ```

2. **Configure Application**
   Edit `backend/src/main/resources/application.yml`:
   ```yaml
   spring:
     datasource:
       url: jdbc:mysql://localhost:3306/projectDB
       username: root
       password: your_password
   ```

3. **Build & Run**
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

   Server starts on `http://localhost:8080`

### API Documentation

#### Session Management (Customer)
- `GET /api/sessions/status/{qrToken}` - Check if order list exists
- `POST /api/sessions/create/{qrToken}` - Create new order list (returns PIN)
- `POST /api/sessions/join/{qrToken}` - Join existing list with PIN

#### Menu (Customer)
- `GET /api/menu` - Browse full menu with categories

#### Cart (Shared)
- `GET /api/cart/{sessionToken}` - View current cart
- `POST /api/cart/{sessionToken}/items` - Add item
- `PATCH /api/cart/{sessionToken}/items/{itemId}` - Update quantity/notes
- `DELETE /api/cart/{sessionToken}/items/{itemId}` - Remove item
- `POST /api/cart/{sessionToken}/submit` - Submit order

#### Orders (Tracking)
- `GET /api/orders/{orderId}` - Get order status
- `POST /api/orders/bill-request/{sessionToken}` - Request bill

#### Waiter
- `GET /api/waiter/orders/pending` - Pending confirmations
- `PATCH /api/waiter/orders/{orderId}/confirm` - Confirm order
- `DELETE /api/waiter/orders/{orderId}/items/{itemId}` - Remove item
- `PATCH /api/waiter/orders/{orderId}/items/{itemId}` - Adjust quantity

#### Kitchen
- `GET /api/kitchen/queue` - Order queue
- `PATCH /api/kitchen/order-items/{itemId}/status` - Update item status

#### Cashier
- `GET /api/bills/pending` - Pending bills
- `POST /api/bills/{sessionId}/generate` - Generate bill
- `PATCH /api/bills/{billId}/pay` - Record payment

#### Authentication (Staff)
- `POST /api/auth/login` - Staff login (returns JWT)

### WebSocket Topics (Real-time)
- `/topic/waiter` - New orders for waiter confirmation
- `/topic/kitchen` - Orders confirmed for kitchen
- `/topic/cashier` - Bill events
- `/topic/table/{sessionId}` - Order status for customers
- `/topic/cart/{sessionId}` - Cart updates for shared ordering

## Seeded Data

The system auto-seeds on first run:

**Tables**: T1–T5 (with unique QR tokens)

**Menu**:
- Starters: Paneer Tikka (₹220), Veg Spring Rolls (₹180)
- Main: Butter Chicken (₹340), Dal Makhani (₹260)
- Beverages: Masala Chai (₹60), Fresh Lime Soda (₹80)

**Staff Logins** (password: `password123`):
- waiter1 (WAITER role)
- kitchen1 (KITCHEN role)
- cashier1 (CASHIER role)
- admin1 (ADMIN role)

## Database Schema

Core entities:
- `restaurant_table` - Physical tables with QR tokens
- `table_session` - One session per table per dining visit (includes PIN for group ordering)
- `customer_order` - Orders (status: CART → PLACED → CONFIRMED → PREPARING → READY → SERVED → BILL_REQUESTED → PAID)
- `order_item` - Line items with snapshotted prices and item-level statuses
- `menu_category` & `menu_item` - Menu structure
- `staff_user` - Staff users with roles
- `bill` - Billing records
- `order_status_event` - Audit trail for analytics

## Deployment

### Docker Compose (coming soon)
```bash
cd backend
docker-compose up
```

This will start:
- Spring Boot backend on port 8080
- MySQL database on port 3306

## Contributing

This is a proof-of-concept for a restaurant management system. Core features include:
- Group ordering with shared carts
- Waiter pre-confirmation editing
- Real-time WebSocket updates
- Complete order → bill → analytics flow

## License

TBD

## Contact

Satyam Agrawal - agrawal2006satyam@gmail.com
