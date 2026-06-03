# GamesUp Platform Directory & Architecture Overview

This document provides a detailed breakdown of the directories, subdirectories, and files constituting the **GamesUp Platform**, a premium digital goods platform tailored for high-engagement gamers (selling game accounts, gift cards, and gaming-related assets).

---

## 📂 Project Root Structure

Below is the high-level tree structure of the repository and the primary responsibility of each folder and config file.

```
GamesUP/
├── .env / .env.example             # Environment configuration settings
├── DESIGN.md                       # Design System specifications (palette, typography, elements)
├── PRODUCT.md                      # Product design, personality, and target audience guidelines
├── HOSTINGER_GUIDE.md              # Deployment guide for the Hostinger Node.js ecosystem
├── package.json                    # Dependencies, engine version, and script declarations
├── vite.config.js                  # Frontend Vite config (Storefront client app)
├── vite.config.admin.js            # Admin Dashboard Vite config
├── index.html                      # Entry point HTML for the client app
├── admin.html                      # Entry point HTML for the admin app
├── server/                         # Express.js backend api application
└── src/                            # React & TypeScript client/admin application
```

---

## 🎨 Design & Product DNA

*   **[DESIGN.md](./DESIGN.md)**: Defines **"The Immersive Arena"** styling strategy. Anchored in deep blacks (`#000000`), Stark White (`#ffffff`), and **Glitch Magenta** (`#ff1574`) as status/action indicators. Utilizes glassmorphic panels and `64px` curves for bento containers.
*   **[PRODUCT.md](./PRODUCT.md)**: Details the platform's core identity—cinematic, bold, high-contrast, gaming-focused digital goods market.

---

## 💻 Frontend Structure (`/src`)

The client-side application is written in **React** and **TypeScript**, using Tailwind CSS for UI layouts. It serves two distinct applications built via individual Vite configurations:

### 1. Storefront Client App
*   **[src/App.tsx](./src/App.tsx)**: The central component managing the router, states, and client views.
*   📁 **[src/components/](./src/components)**:
    *   **Pages & Sections**: Core client pages such as [ShopPage.tsx](./src/components/ShopPage.tsx), [ProductPage.tsx](./src/components/ProductPage.tsx), [CheckoutPage.tsx](./src/components/CheckoutPage.tsx), [FavoritesPage.tsx](./src/components/FavoritesPage.tsx), and console-specific game sharing instruction sheets like [InstructionsPS4Page.tsx](./src/components/InstructionsPS4Page.tsx) and [InstructionsPS5Page.tsx](./src/components/InstructionsPS5Page.tsx).
    *   📁 **[src/components/ui/](./src/components/ui)**: Modular UI components (buttons, badges, inputs, charts, cards, etc.), based on a Radix / shadcn architecture.

### 2. Admin Dashboard App
*   **[src/adminMain.tsx](./src/adminMain.tsx)**: Main entry point for the Admin console.
*   📁 **[src/admin/](./src/admin)**:
    *   **[AdminApp.tsx](./src/admin/AdminApp.tsx)**: Main controller for Admin navigation, theme settings, and sub-routing.
    *   📁 **[src/admin/pages/](./src/admin/pages)**: Contains all the administrative management modules, including:
        *   📊 [Dashboard.tsx](./src/admin/pages/Dashboard.tsx) & [Analytics.tsx](./src/admin/pages/Analytics.tsx)
        *   📦 [Products.tsx](./src/admin/pages/Products.tsx), [InventorySheet.tsx](./src/admin/pages/InventorySheet.tsx) & [SoldProducts.tsx](./src/admin/pages/SoldProducts.tsx)
        *   🛒 [Orders.tsx](./src/admin/pages/Orders.tsx) & [POSNew.tsx](./src/admin/pages/POSNew.tsx)
        *   👥 [Customers.tsx](./src/admin/pages/Customers.tsx), [HR.tsx](./src/admin/pages/HR.tsx), [Roles.tsx](./src/admin/pages/Roles.tsx) & [TeamMembers.tsx](./src/admin/pages/TeamMembers.tsx)
        *   ⚙️ [System.tsx](./src/admin/pages/System.tsx) & [Settings.tsx](./src/admin/pages/Settings.tsx)

### 3. Core Contexts, Guidelines & Utilities
*   **[src/context/StoreSettingsContext.tsx](./src/context/StoreSettingsContext.tsx)**: Manages global configuration options like active currencies, payment structures, store operational toggles, and metadata.
*   **[src/utils/api.ts](./src/utils/api.ts)**: Implements axios request interceptors and API endpoint hooks.
*   **[src/utils/emailService.ts](./src/utils/emailService.ts)**: Local email rendering utilities.
*   **[src/guidelines/Guidelines.md](./src/guidelines/Guidelines.md)**: Coding principles, standards, and workflow rules.

---

## 🖥️ Express Backend Structure (`/server`)

The backend api server runs on Express.js and routes incoming HTTP requests to corresponding controller layers, querying a MySQL database.

*   **[server/server.js](./server/server.js)**: Initializes CORS, JSON body parsers, routes static file directories (for product asset uploads), logs, and binds sub-routers.
*   📁 **[server/db/](./server/db)**: Database infrastructure.
    *   `schema.sql`: Raw table creation definitions (products, orders, roles, logs, employees, inventory, chats, settings).
    *   `pool.js`: MySQL pool initialization.
    *   `init-db.js`: Database verification and schema verification scripts.
*   📁 **[server/routes/](./server/routes)**: Defines routing maps for frontend consumption.
    *   `authRoutes.js`: User & Employee authentication endpoints.
    *   `productsRoutes.js`: Catalog management, listings, search.
    *   `ordersRoutes.js`: Cart validation, purchase processing, delivery queue.
    *   `adminRoutes.js`: Admin-only utility endpoints.
    *   `chatRoutes.js` / `orderChatsRoutes.js`: In-app customer support chats.
