# POS System Testing Guide

## ✅ Testing Checklist

### 1. **Test Product Creation with Credentials**

Go to **Products** tab and add a test product with credentials:

**Test Product #1: PlayStation Plus 12-Month**
- Name: PlayStation Plus 12-Month Subscription
- Category: Services
- Price: $59.99
- Stock: 10
- **Admin-Only Fields:**
  - Purchased Email: `psplus@account.com`
  - Purchased Password: `SecurePass123!`
  - Product Code: `PLUS-XXXX-YYYY-ZZZZ-2024`

**Test Product #2: God of War Ragnarök Digital**
- Name: God of War Ragnarök (Digital)
- Category: Games
- Price: $69.99
- Stock: 50
- **Admin-Only Fields:**
  - Purchased Email: ` (leave empty)
  - Purchased Password: ` (leave empty)
  - Product Code: `GOW-RGNK-DLGX-9876-5432`

**Test Product #3: DualSense Controller** (No credentials)
- Name: DualSense Wireless Controller
- Category: Accessories
- Price: $69.99
- Stock: 25
- **Admin-Only Fields:** (leave all empty)

---

### 2. **Test POS Functionality**

Go to **Point of Sale** tab:

#### A. Product Browsing ✅
- [ ] Verify all products appear in the grid
- [ ] Test search functionality (search for "PlayStation")
- [ ] Test category filter (select "Services")
- [ ] Verify product images load correctly
- [ ] Check stock levels display

#### B. Cart Operations ✅
- [ ] Click on a product to add to cart
- [ ] Verify product appears in cart
- [ ] Test quantity increase (+) button
- [ ] Test quantity decrease (-) button
- [ ] Try to exceed stock limit (should show alert)
- [ ] Add multiple different products
- [ ] Remove a product using trash icon
- [ ] Verify cart count updates

#### C. Customer Information ✅
- [ ] Enter customer name (required)
- [ ] Enter phone number (required)
- [ ] Enter email (optional)
- [ ] Enter address (optional)
- [ ] Try to checkout without name - should show error
- [ ] Try to checkout without phone - should show error

#### D. Checkout Process ✅
- [ ] Add products to cart
- [ ] Fill customer information
- [ ] Verify subtotal calculation is correct
- [ ] Verify tax (10%) calculation
- [ ] Verify total = subtotal + tax
- [ ] Click "Complete Sale"
- [ ] Verify invoice modal appears

#### E. Invoice Display ✅
- [ ] Check invoice number format (INV-timestamp)
- [ ] Verify customer details display correctly
- [ ] Verify date is correct
- [ ] Check all cart items appear in table
- [ ] Verify quantities are correct
- [ ] Verify prices match
- [ ] Verify total calculations

#### F. **CRITICAL: Product Credentials Section** ✅
When products have credentials, verify:

- [ ] Red highlighted "IMPORTANT - Product Access Credentials" section appears
- [ ] Section only shows for products WITH credentials
- [ ] Each product with credentials has its own card
- [ ] Email displays correctly (if provided)
- [ ] Password displays correctly (if provided)
- [ ] Product Code displays in red/bold (if provided)
- [ ] Products WITHOUT credentials don't appear in this section
- [ ] Warning message appears at bottom

**Expected Behavior:**
```
┌─────────────────────────────────────────┐
│ [IMPORTANT] Product Access Credentials  │
├─────────────────────────────────────────┤
│ PlayStation Plus 12-Month Subscription  │
│   Email: psplus@account.com             │
│   Password: SecurePass123!              │
│   Product Code: PLUS-XXXX-YYYY-ZZZZ     │
├─────────────────────────────────────────┤
│ God of War Ragnarök (Digital)           │
│   Product Code: GOW-RGNK-DLGX-9876      │
├─────────────────────────────────────────┤
│ ⚠️ Please keep this information secure  │
└─────────────────────────────────────────┘
```

#### G. Print Functionality ✅
- [ ] Click "Print Invoice" button
- [ ] Verify print dialog opens
- [ ] Check print preview includes all information
- [ ] Check credentials section prints correctly
- [ ] Verify buttons hide in print view (print:hidden)

#### H. Post-Checkout ✅
- [ ] Close invoice modal
- [ ] Verify cart is cleared
- [ ] Verify customer info is cleared
- [ ] Create another order to confirm system resets

---

### 3. **Backend Data Verification**

Check that invoice data is saved:

#### Invoice Storage ✅
Invoices are saved to: `invoice:{timestamp}`

Expected structure:
```json
{
  "id": 1234567890,
  "invoiceNumber": "INV-1234567890",
  "customer": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "items": [
    {
      "productId": 1,
      "productName": "PlayStation Plus 12-Month",
      "quantity": 1,
      "price": 59.99,
      "total": 59.99,
      "purchasedEmail": "psplus@account.com",
      "purchasedPassword": "SecurePass123!",
      "productCode": "PLUS-XXXX-YYYY-ZZZZ-2024"
    }
  ],
  "subtotal": 59.99,
  "tax": 6.00,
  "total": 65.99,
  "date": "2026-01-06T...",
  "createdAt": "2026-01-06T...",
  "createdBy": "user-id"
}
```

---

### 4. **Edge Cases to Test**

#### Stock Management ✅
- [ ] Add max stock quantity to cart
- [ ] Try to add more - should prevent
- [ ] Verify stock warning appears

#### Empty States ✅
- [ ] Empty cart - verify message displays
- [ ] No search results - verify message displays
- [ ] Filter with no products - verify message displays

#### Calculations ✅
- [ ] Single item: $59.99 → Tax: $6.00 → Total: $65.99
- [ ] Multiple items: Test various combinations
- [ ] Quantity changes: Verify recalculation

#### Credential Display ✅
- [ ] Order with ALL products having credentials
- [ ] Order with SOME products having credentials
- [ ] Order with NO products having credentials (section hidden)
- [ ] Mixed: some with email+password, some with code only

---

### 5. **Security Considerations**

#### Admin-Only Access ✅
- [ ] Credentials only visible in Products edit (Admin/Manager)
- [ ] Credentials appear on invoice (for customer)
- [ ] Credentials saved in database with invoice
- [ ] Staff role can create POS orders
- [ ] Staff cannot see/edit product credentials

#### Data Privacy ✅
- [ ] Passwords shown in plain text on invoice (intentional for customer)
- [ ] Warning message about security appears
- [ ] Credentials tied to specific invoice/customer

---

## 🎮 Test Scenarios

### Scenario 1: Digital Game Purchase
1. Add "God of War Ragnarök (Digital)" to cart (has product code)
2. Customer: John Smith, +1-555-0100
3. Complete sale
4. Verify invoice shows product code
5. Print and check code is visible

### Scenario 2: Service Subscription
1. Add "PlayStation Plus 12-Month" to cart (has email, password, code)
2. Customer: Jane Doe, +1-555-0200, jane@email.com
3. Complete sale
4. Verify invoice shows ALL three credentials
5. Customer receives email, password, and code

### Scenario 3: Physical Product
1. Add "DualSense Controller" to cart (no credentials)
2. Customer: Bob Wilson, +1-555-0300
3. Complete sale
4. Verify NO credentials section appears
5. Invoice is clean without credential box

### Scenario 4: Mixed Order
1. Add "PlayStation Plus" (with credentials)
2. Add "DualSense Controller" (no credentials)
3. Add "God of War" (code only)
4. Customer: Alice Brown, +1-555-0400
5. Complete sale
6. Verify credentials section shows ONLY PlayStation Plus and God of War
7. Verify DualSense does NOT appear in credentials

---

## ✅ Expected Results

**All tests should pass with:**
- ✅ POS loads all products correctly
- ✅ Cart operations work smoothly
- ✅ Calculations are accurate
- ✅ Customer validation works
- ✅ Invoice generates successfully
- ✅ Credentials display ONLY when present
- ✅ Print functionality works
- ✅ Data saves to backend
- ✅ System resets after sale

---

## 🚨 Known Issues / Notes

1. **Product credentials are stored in plain text** - This is intentional for the admin system. In production, consider encryption.

2. **Print styling** - Credentials section should be prominent when printed so customer doesn't miss them.

3. **Multiple products with same ID** - System prevents duplicate entries in cart.

4. **Stock updates** - Current implementation does NOT decrease stock automatically. Would need to add this feature.

---

## 📊 Success Criteria

- [ ] Can create products with/without credentials
- [ ] POS displays all products correctly
- [ ] Cart management works perfectly
- [ ] Invoice shows credentials conditionally
- [ ] Print includes all necessary information
- [ ] Backend saves complete invoice data
- [ ] Customer receives all access codes/credentials
- [ ] System handles edge cases gracefully

---

**Test Date:** January 6, 2026
**Tester:** Admin User
**Status:** Ready for Testing ✅
