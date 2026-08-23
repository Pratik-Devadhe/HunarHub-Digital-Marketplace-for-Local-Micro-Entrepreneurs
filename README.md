# HunarHub

HunarHub is a digital marketplace that connects local micro-entrepreneurs and skilled workers with customers. The platform allows entrepreneurs such as artisans, tailors, potters, cobblers, weavers, and other local service providers to showcase their skills and reach customers online.

The goal of HunarHub is to provide local entrepreneurs with a simple digital platform to promote their services and products while making it easier for customers to discover and book trusted local services.

## Live Application

[HunarHub](https://hunarhub-frontend-seven.vercel.app/)

## Features

### Customer

* User registration and login
* Browse services and products
* Search and filter services
* View entrepreneur profiles
* View service details
* Book services
* Manage bookings
* Purchase products
* Manage profile

### Entrepreneur

* Entrepreneur registration and login
* Create and manage profile
* Add services
* Manage service availability
* Add and manage products
* View customer bookings
* Manage booking status
* Manage business information

### Admin

* Manage users
* Manage entrepreneurs
* Manage services and products
* Manage bookings
* Monitor marketplace activity

## Main Application Flow

```text
Customer
   |
   v
Register / Login
   |
   v
Browse Services / Products
   |
   v
Search / Filter
   |
   v
View Service or Product
   |
   +-------------------+
   |                   |
   v                   v
Book Service       Purchase Product
   |                   |
   v                   v
Booking            Checkout
Confirmation          |
   |                   v
   v                 Order
Track Booking       Confirmation
   |
   v
Complete Service
   |
   v
Review / Rating
```

## Technology Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3
* React Router
* Lucide React

### Backend

* Node.js
* Express.js
* REST APIs

### Database

* PostgreSQL

### Other Technologies

* Git and GitHub
* Vercel
* Cloudinary/Image storage
* Environment variables

## Project Structure

```text
HunarHub/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   └── assets/
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── config/
│   ├── sql/
│   └── server.js
│
└── README.md
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Pratik-Devadhe/HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs.git
cd HunarHub-Digital-Marketplace-for-Local-Micro-Entrepreneurs
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=8080

DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
npm start
```

For development:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8080
```

Start the frontend:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

## Database Setup

1. Install PostgreSQL.
2. Create a database for HunarHub.
3. Configure the database credentials in the backend `.env` file.
4. Run the SQL schema provided in the backend SQL directory.
5. Start the backend server.

## API Modules

The backend is organized around REST APIs for:

* Authentication
* Users
* Entrepreneurs
* Services
* Products
* Bookings
* Orders
* Payments
* Reviews
* Admin operations

## Environment Variables

Environment variables should be used for sensitive configuration.

Do not commit the `.env` file to GitHub.

Example:

```env
VITE_API_URL=http://localhost:8080
```

Backend environment variables should contain database credentials, JWT secrets, and other private configuration.

## Deployment

The frontend can be deployed using Vercel.

The backend can be deployed separately using platforms such as Render, Railway, or other Node.js hosting services.

After deploying the backend, update the frontend environment variable:

```env
VITE_API_URL=https://your-backend-url.com
```

Then redeploy the frontend.

## Future Improvements

* Online payment integration
* Real-time chat between customers and entrepreneurs
* Location-based service discovery
* Notifications
* Wishlist and favorites
* Product cart and checkout
* Order tracking
* Advanced entrepreneur analytics
* Admin analytics dashboard
* Service recommendations
* Improved review and rating system
* Mobile application

## Purpose

HunarHub aims to digitally empower local micro-entrepreneurs by helping them showcase their skills, products, and services to a wider customer base.

The platform focuses on connecting local talent with customers while providing a simple and accessible digital marketplace.

## Author

Pratik Devadhe

GitHub: https://github.com/Pratik-Devadhe
