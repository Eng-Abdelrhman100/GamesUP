# Frontend Website Guide

## Overview
The Games - Up E-Commerce platform now includes a fully functional, modern frontend website with glassy header design, animations, and customer authentication.

## Features

### 🎨 Design
- **Modern Glassy Header**: Glassmorphism design with backdrop blur effects
- **Smooth Animations**: Motion/Framer Motion powered animations
- **Responsive Layout**: Mobile-first design that works on all devices
- **Red & White Branding**: Consistent with admin dashboard branding
- **Modern Icons**: Lucide React icons throughout

### 📄 Pages

1. **Landing Page** (`/`)
   - Hero section with CTAs
   - Features showcase
   - Statistics display
   - Call-to-action sections

2. **Shop Page** (`/shop`)
   - Product grid with filtering
   - Category navigation
   - Search functionality
   - Add to cart
   - Real-time product loading from backend

3. **Authentication Pages**
   - Customer Sign Up
   - Customer Login
   - Separate from admin authentication

## System Configuration (Admin)

### Categories Management
In the admin dashboard, go to **System > Categories** to:
- Create product categories
- Set category icons (emoji or text)
- Define display order
- Enable/disable categories
- Add category slugs for URLs

### Sub-Categories Management
In **System > Sub-Categories** to:
- Create sub-categories under main categories
- Organize products hierarchically
- Set display order

### Product Attributes Management
In **System > Attributes** to:
- Define custom product attributes
- Set attribute types (text, number, select, boolean)
- Mark attributes as required/optional
- Configure select options

## Accessing the Website

### Method 1: Direct URL
Add `#website` to your app URL:
```
https://your-app-url.com/#website
```

### Method 2: From Code
Set the `currentScreen` state to `'website'` in App.tsx

## Customer Authentication

### Sign Up
Customers can create accounts with:
- Full Name
- Email Address
- Password
- Phone Number (optional)

### Login
Customers sign in using:
- Email
- Password

### Session Management
- Customer sessions are stored separately from admin sessions
- Sessions persist for 30 days
- Automatic logout option available

## Backend Integration

### Public APIs (No Auth Required)
```typescript
// Get all products (public view)
GET /make-server-f6f1fb51/public/products
Query: ?category=slug&subcategory=slug

// Get single product
GET /make-server-f6f1fb51/public/product/:id
```

### Customer APIs
```typescript
// Customer signup
POST /make-server-f6f1fb51/customer/signup
Body: { email, password, name, phone }

// Customer login
POST /make-server-f6f1fb51/customer/login
Body: { email, password }
```

### System Configuration APIs (Admin Auth Required)
```typescript
// Categories
GET    /make-server-f6f1fb51/system/categories
POST   /make-server-f6f1fb51/system/categories
PUT    /make-server-f6f1fb51/system/categories/:id
DELETE /make-server-f6f1fb51/system/categories/:id

// Sub-Categories
GET    /make-server-f6f1fb51/system/subcategories
POST   /make-server-f6f1fb51/system/subcategories
PUT    /make-server-f6f1fb51/system/subcategories/:id
DELETE /make-server-f6f1fb51/system/subcategories/:id

// Attributes
GET    /make-server-f6f1fb51/system/attributes
POST   /make-server-f6f1fb51/system/attributes
PUT    /make-server-f6f1fb51/system/attributes/:id
DELETE /make-server-f6f1fb51/system/attributes/:id
```

## Components Structure

```
/components/website/
├── Website.tsx              # Main website router
├── WebsiteLayout.tsx        # Header, footer, navigation
├── LandingPage.tsx          # Home page
├── ShopPage.tsx             # Products listing
└── CustomerAuth.tsx         # Login/Signup forms
```

## Shopping Cart

The shopping cart is implemented using localStorage:
```typescript
localStorage.getItem('cart')  // Get cart items
localStorage.setItem('cart', JSON.stringify(cart))  // Save cart
```

Cart format:
```typescript
[
  {
    id: string,
    name: string,
    price: number,
    image: string,
    quantity: number
  }
]
```

## Styling

- **Tailwind CSS v4**: Utility-first CSS
- **Glassmorphism**: `bg-white/80 backdrop-blur-xl`
- **Gradients**: `bg-gradient-to-r from-red-600 to-red-500`
- **Shadows**: `shadow-xl shadow-red-500/30`
- **Animations**: Motion/Framer Motion for smooth transitions

## Next Steps

### To Complete the Website:
1. **Shopping Cart Page**: Display cart items, update quantities, checkout
2. **Product Detail Page**: Individual product view with full details
3. **Checkout Flow**: Shipping info, payment processing
4. **Order Tracking**: Customer order history and status
5. **Product Reviews**: Rating and review system
6. **Wishlist**: Save products for later
7. **Payment Integration**: Stripe, PayPal, etc.

### To Enhance System:
1. **Product Variants**: Size, color options
2. **Inventory Management**: Stock tracking per variant
3. **Shipping Zones**: Different rates by location
4. **Discount Codes**: Coupon system
5. **Email Notifications**: Order confirmations, shipping updates

## Development Tips

### Adding New Categories
1. Go to Admin Dashboard > System > Categories
2. Click "Add Category"
3. Fill in name, slug, icon, display order
4. Set to "Active"
5. Save

### Connecting Products to Categories
In the Products screen, add:
- `categorySlug`: Matches the category slug
- `subcategorySlug`: Matches the sub-category slug

### Testing Customer Auth
1. Visit `/#website` or click "View Website"
2. Click "Sign Up" in the header
3. Create a test customer account
4. Login with credentials
5. Browse shop and add items to cart

## Security Notes

⚠️ **Important**: This is a prototype implementation. For production:
- Hash passwords (use bcrypt or similar)
- Implement HTTPS only
- Add CSRF protection
- Rate limit authentication endpoints
- Validate all user inputs
- Implement proper error handling
- Add email verification
- Use secure session tokens
- Implement password reset flow

## Support

For issues or questions:
1. Check console logs for errors
2. Verify backend endpoints are responding
3. Ensure categories are created and active
4. Check that products have correct category slugs
5. Clear localStorage if experiencing auth issues

---

**Version**: 1.0.0  
**Last Updated**: January 10, 2026
