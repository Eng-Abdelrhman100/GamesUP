# Local Database Setup Guide

This guide explains how to set up your local MySQL database for the GamesUp Platform.

## Prerequisites

1.  **MySQL Server**: Ensure you have MySQL installed and running.
    *   [Download MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
2.  **MySQL Workbench** (Optional but recommended): For managing your database visually.

## Setup Steps

### 1. Create an Empty Database & User
Open your MySQL client (like Workbench or command line) and run:

```sql
-- Create the database
CREATE DATABASE IF NOT EXISTS games;

-- Create a user (optional if you want to use a specific user)
-- Replace 'your_password' with a strong password
CREATE USER IF NOT EXISTS 'gamesup_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON games.* TO 'gamesup_user'@'localhost';
FLUSH PRIVILEGES;
```

> **Note**: You can also use your existing root user if you prefer.

### 2. Configure Environment Variables
Open the `.env` file in the project root and update the database settings to match your local setup:

```env
# Database Config
DB_HOST=localhost
DB_USER=gamesup_user  # or 'root'
DB_PASSWORD=your_password
DB_NAME=games
DB_PORT=3306

# Other Settings
PORT=3000
JWT_SECRET=dev_secret_key_123
CORS_ORIGIN=http://localhost:5173
```

### 3. Initialize the Database Schema
Run the following command in your terminal to create the necessary tables:

```bash
npm run db:init
```

If successful, you should see:
```
Connecting to database...
Connected!
Executing schema...
Schema executed successfully!
```

## Running the Application

Start the development server:
```bash
npm run dev
```

The server will start on port 3000 (frontend and backend running concurrently).
