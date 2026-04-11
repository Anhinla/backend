# Local Installation & Setup Guide

Follow these step-by-step instructions to set up and run on your local machine.

### Prerequisites
Ensure you have the following installed before proceeding:
- **Node.js** (v18 or higher recommended)
- **Git**
- A **Neon PostgreSQL** database connection string
- A **Stripe** developer account (for test API keys)

---

### Step 1: Clone the Repository
Open your terminal and clone the project to your local machine, then navigate into the project folder:
```bash
git clone https://github.com/Anhinla/backend.git
cd backend
```

### Step 2: Backend Setup (Express.js)
Run the following command to read the package.json file. This will automatically download and install Express.js, Drizzle ORM, and all other required packages into a new node_modules folder:
```bash 
npm install
```

### Step 3: Configure Environment Variables
Create a new file named .env in the root of the backend directory and add your secret credentials:
```bash 
# Server Port
PORT=3000

# Database Configuration (Neon PostgreSQL)
DATABASE_URL=your_neon_database_connection_string

# JWT Secret for Authentication
JWT_SECRET=your_super_secret_jwt_key

# Stripe Payment Gateway
STRIPE_SECRET_KEY=your_stripe_test_secret_key
```

### Step 4: Initialize the Database
Since the project uses Drizzle ORM, you need to push the database schema to your Neon PostgreSQL database to create the required tables:
```bash 
npx drizzle-kit push
```

### Step 5: Start the Backend Server
Start the server in development mode. It will run on port 3000 by default:
```bash 
npm run dev
```

