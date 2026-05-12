# Hostinger Deployment Guide

This guide is specifically tailored for **Hostinger Shared Hosting** (or similar cPanel/hPanel environments).

## 🛠️ Understanding Your Architecture
You have **TWO** separate parts that need to be deployed separately:
1.  **The Frontend (Website + Admin)**: This is a static "built" site. It runs in the user's browser.
2.  **The Backend (Server)**: This is a Node.js application. It runs on the server.

> **Crucial Note**: The Frontend needs a `build` step. The Backend **does not**; it just needs to be "started".

---

## Part 1: Deploying the Frontend (Website)

The frontend lives in your main folder. It compiles your React code into HTML/CSS/JS files that Hostinger can serve.

1.  **Prepare for Production**:
    -   Edit `.env.production`.
    -   Set `VITE_API_URL` to your **future** backend URL (e.g., `https://api.yourdomain.com` or `https://yourdomain.com/api` depending on how you set up the backend).

2.  **Build**:
    Run this command in your local terminal:
    ```bash
    npm run build
    ```
    This creates a `dist` folder.

3.  **Upload**:
    -   Go to Hostinger File Manager.
    -   Navigate to `public_html`.
    -   Upload the **contents** of the `dist` folder (index.html, assets folder, etc.) directly into `public_html`.

4.  **Fix Routing (Important)**:
    Since this is a Single Page App, you need to tell Hostinger to redirect all requests to `index.html`.
    -   Create a file named `.htaccess` in `public_html` (if it doesn't exist).
    -   Add this content:
        ```apache
        <IfModule mod_rewrite.c>
          RewriteEngine On
          RewriteBase /
          RewriteRule ^index\.html$ - [L]
          RewriteCond %{REQUEST_FILENAME} !-f
          RewriteCond %{REQUEST_FILENAME} !-d
          RewriteRule . /index.html [L]
        </IfModule>
        ```

---

## Part 2: Deploying the Backend (Server)

The backend lives in the `server/` folder. It is a raw Node.js application.

1.  **Create Node Application in Hostinger**:
    -   Go to your Hostinger Dashboard.
    -   Find **"Node.js"** (usually under "Advanced").
    -   Click **"Create New Application"**.
    -   **Node Version**: Choose 18.x or 20.x.
    -   **Application Mode**: Production.
    -   **Application Root**: `gamesup-server` (or any name you like).
    -   **Application URL**: `api` (this will make it accessible at `yourdomain.com/api`) OR leave blank to use a subdomain if you created one.
    -   **Application Startup File**: `index.js`

2.  **Upload Server Files**:
    -   Go to File Manager.
    -   Find the folder you created (e.g., `gamesup-server`).
    -   Upload all files from your local `server/` folder **EXCEPT** `node_modules`.
    -   **Upload these specifically**:
        -   `package.json`
        -   `index.js`
        -   `services/` folder
        -   `uploads/` folder (create if missing)
        -   `.env` (Create this manually with your production DB credentials)

3.  **Install Dependencies**:
    -   Back in the Hostinger Node.js menu, click the **"NPM Install"** button. This will read your `package.json` and install libraries on the server.

4.  **Start Server**:
    -   Click **"Restart"** or **"Start"** in the Node.js menu.

---

## Part 3: Connecting Them

1.  **Database**:
    -   In Hostinger, go to **"Databases"** -> **"Management"**.
    -   Create a new MySQL Database and User.
    -   Import your `server/schema.sql` using phpMyAdmin to set up the tables.
    -   Update the `.env` file in your **Backend folder** (on Hostinger) with these new database details.

2.  **Final Link**:
    -   Now that your backend is running (e.g., at `yourdomain.com/api`), ensure your **Frontend** `.env.production` (that you built in Part 1) has `VITE_API_URL=https://yourdomain.com/api`.
    -   If you changed the URL, you must run `npm run build` again and re-upload the `dist` files.

---

## Summary Checklist

| Component | Local Command | Upload Location | Needs Build? |
| :--- | :--- | :--- | :--- |
| **Frontend** | `npm run build` | `public_html` | **YES** |
| **Backend** | `npm install` (on server) | `gamesup-server` (Custom folder) | **NO** |

