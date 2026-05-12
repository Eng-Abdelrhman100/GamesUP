# Hostinger Deployment Guide (Unified Node.js App)

This guide covers how to deploy the **GamesUp Platform** as a single Node.js application on Hostinger. In this setup, the Express backend serves the React frontend, simplifying deployment.

---

## Prerequisites

*   A Hostinger plan that supports **Node.js** (e.g., Business Web Hosting, Cloud Startup, or VPS).
*   Your project pushed to a GitHub repository (recommended).

---

## Part 1: Database Setup (MySQL)

1.  Log in to **Hostinger hPanel**.
2.  Go to **Databases** -> **Management**.
3.  Create a New Database:
    *   **MySQL Database Name**: e.g., `u123456789_gamesup`
    *   **MySQL Username**: e.g., `u123456789_admin`
    *   **Password**: *Create a strong password and save it.*
4.  Click **Enter phpMyAdmin** for the new database.
5.  Click the **Import** tab.
6.  Choose the file `server/schema.sql` from your project folder.
7.  Click **Go** to import the database structure.

---

## Part 2: Application Deployment

1.  In hPanel, navigate to **Websites** -> **Add Website** (or **Manage** existing).
2.  Select **Node.js Apps**.
3.  **Application Settings**:
    *   **Node.js Version**: 18 or higher (match your local version).
    *   **Application Mode**: Production.
    *   **Application Root**: `/` (Leave as default or root of your domain).
    *   **Application Startup File**: `server/index.js` (or leave empty if using `npm start` command).
    
    > [!CAUTION]
    > **Critical**: Ensure Hostinger detects this as a **Node.js application**, NOT a React static site. If "Framework" shows "React" in deployment details, the backend won't run. You may need to:
    > - Delete the current deployment
    > - Create a **new Node.js app** (not React/Static)
    > - Or manually override framework detection in advanced settings

4.  **Source Code**:
    *   Click **Import from Git** (Recommended) and connect your repository.
    *   OR upload project files manually (exclude `node_modules` and `dist`).
5.  **Build Settings**:
    *   **Build Command**: `npm install && npm run build`
        *   *This installs dependencies for both frontend and backend and builds the Vite frontend.*
    *   **Output Directory**: `dist` (or `./dist`)
        *   *Important: Set this to tell Hostinger where the built files are located.*
    *   **Start Command**: `npm start`
6.  **Environment Variables**:
    *   Add the following variables in the Hostinger Dashboard:
    ```env
    PORT=3000 (or let Hostinger assign it)
    DB_HOST=localhost
    DB_USER=u123456789_admin
    DB_PASSWORD=your_db_password
    DB_NAME=u123456789_gamesup
    JWT_SECRET=your_secure_random_secret
    CORS_ORIGIN=https://yourdomain.com
    VITE_API_URL=/functions/v1/make-server-f6f1fb51
    ```
    *   **Important**: `VITE_API_URL` should be set to the relative path `/functions/v1/make-server-f6f1fb51` so the frontend correctly communicates with the backend on the same domain.

7.  **Deploy**:
    *   Click **Deploy / Create**.
    *   Wait for the build and deployment to finish.

---

## Troubleshooting

### "No output directory found after build"
This error occurs in Hostinger's deployment system (not Vite). Solutions:
1.  **Set Output Directory**: In hPanel > Deployments > Settings, set **Output Directory** to `dist`.
2.  **Pre-build Upload**: Build locally (`npm run build`), commit the `dist/` folder, and push to Git. Set Build Command to empty in hPanel.
3.  **Verify Application Root**: Ensure it points to the project root, not `/server`.

### Other Common Issues
*   **Build Fails**: Check the build logs. Ensure `npm install` runs successfully.
*   **Frontend Not Loading**: Ensure `npm run build` created the `dist` folder. The server is configured to serve files from `../dist` relative to `server/index.js`.
*   **Database Connection Refused**: Ensure you used `localhost` as `DB_HOST` and the correct username/password from Part 1.
*   **API Errors**: Check the **Application Logs** in Hostinger.
*   **Package Vulnerabilities**: Run `npm audit fix` locally before deploying. Consider upgrading `multer` to v2.x.
