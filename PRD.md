# Product Requirements Document
## Ainora Mane Thota — Farm Store Web Application

**Version:** 1.0
**Date:** April 2026
**Owner:** Vijay Kumar Umesh
**Status:** Live

---

## 1. Product Overview

### 1.1 Vision
A direct farm-to-consumer web store for Ainora Mane Thota, a family-owned organic farm in Magadi, Karnataka. The app eliminates middlemen by letting Bengaluru-based customers browse fresh weekly produce and place orders directly with the farm owner via WhatsApp.

### 1.2 Problem Statement
Small organic farms have no affordable, simple way to sell directly to their trusted customer base. Existing marketplaces take commissions, require complex onboarding, and are overkill for a farm that harvests weekly and sells to a personal network. The farm owner needs a tool they can manage alone with no technical background.

### 1.3 Goals
- Give customers a clean, mobile-friendly catalog to browse and order from
- Give the farm owner a simple admin panel to manage stock, orders, and products after every weekly harvest
- Keep the entire system free or near-free to run
- Require zero technical maintenance after initial setup

### 1.4 Non-Goals
- Not a marketplace — only one farm, one admin
- No customer accounts or login
- No automated delivery logistics
- No inventory forecasting or analytics beyond basic order stats

---

## 2. Users

### 2.1 Buyer
Bengaluru residents — friends, family, and word-of-mouth customers of the farm. They:
- Browse on mobile
- Trust the farm personally, don't need reviews or ratings
- Want to see what's available this week and place an order quickly
- Complete orders via WhatsApp (familiar, no app install needed)

### 2.2 Admin (Farm Owner)
Single non-technical person — Vijay Kumar Umesh. They:
- Update stock every week after harvest
- Manage incoming orders (confirm, mark delivered, mark paid)
- Occasionally add or remove products
- Need everything to work on a phone

---

## 3. Features

### 3.1 Buyer Store

#### Product Catalog
- Grid of product cards showing photo (or emoji fallback), product name, Kannada name, price, unit, delivery days
- Stock badge: `Sold Out` / `Only N left!` / `N available`
- Stock progress bar (visual fill based on current vs max stock)
- Badges: Limited stock, New this week, Best seller, Seasonal, Sold out soon
- Only available products with stock > 0 are shown
- Products displayed in admin-defined sort order

#### Cart
- Add/remove items with quantity selector
- Max quantity capped at current stock
- Floating cart bar showing item count and total
- Cart persisted in localStorage (survives page refresh)

#### Order Placement
- Order form modal: customer name, phone, delivery address, preferred delivery date, delivery time slot, optional notes
- On submit: order saved to Firestore, stock decremented atomically, WhatsApp deep link opened with pre-filled order summary
- Success screen shown after order

#### UPI Payment *(built, currently disabled)*
- Payment modal with deep links for PhonePe, GPay, Paytm
- QR code for scanning via QR Server API
- Copy UPI ID button

---

### 3.2 Admin Panel

**Access:** `ainoramanethota.in/#admin` → password login → session stored in localStorage

#### Dashboard
- Total orders count
- Total revenue (paid + unpaid split)
- Today's orders count
- Pending orders count

#### Stock Management
- All products listed as cards
- Per product: +10 / -10 / +1 / -1 steppers, direct number input, price edit
- Available toggle (show/hide from buyer store)
- Low stock threshold setting per product (triggers "Only N left!" badge)
- Badge selector dropdown per product
- Up/down arrows to reorder product display sequence

#### Product Management
- Add product: name, Kannada name, emoji, photo upload (client-side compressed to max 800px via Canvas API, stored in Firebase Storage), unit, price, stock, delivery days
- Edit product: all fields editable
- Delete product: with confirmation dialog

#### Order Management
- Orders table with all customer orders
- Per order: status dropdown (new → confirmed → delivered), payment toggle (paid/unpaid), WhatsApp button (pre-filled status message to customer), delete button
- Delete restores stock for all items in the order
- Filter orders by status and date range
- Edit order: change items, quantities, delivery details (stock intelligently recalculated)
- Create manual order: for phone/walk-in customers
- Export orders as CSV

#### Notifications
- Browser push notification (FCM) for every new customer order — shows customer name, phone, items, total
- Browser push notification when any product hits zero stock — prompts replenishment
- Notification sound via Web Audio API
- Email to `ainoramanethota@gmail.com` for every new customer order — full order details

---

## 4. Data Models

### Product
```
id, name, kannada, emoji, photoUrl,
unit, price, stock, maxStock,
lowStockThreshold, deliveryDays,
available, sortOrder, badge, createdAt
```

### Order
```
id, customerName, phone, address,
deliveryDate, deliveryTime, notes,
items: [{ productId, name, qty, price, subtotal }],
total, status, paymentStatus,
source (website / phone / manual),
createdAt, updatedAt
```

---

## 5. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | No build step, no framework overhead, easy to maintain |
| Styling | Tailwind CSS (CDN) | Utility-first, no build required |
| Database | Firebase Firestore | Real-time sync, free tier sufficient |
| File Storage | Firebase Storage | Product photos, persistent URLs |
| Auth | Password + localStorage | Single admin, no OAuth complexity needed |
| Push Notifications | Firebase Cloud Messaging | Free, integrates with existing Firebase project |
| Email | Netlify Function + Nodemailer | Credentials never in code, free on Netlify |
| Payments | UPI deep links | No payment gateway fees, works with any UPI app |
| Orders | WhatsApp click-to-chat | Zero friction, customers already use WhatsApp |
| Hosting | Netlify | Free static hosting, auto-deploys from GitHub |
| Domain | ainoramanethota.in | Custom branded domain via CNAME |

---

## 6. Security Considerations

| Risk | Mitigation |
|---|---|
| Admin access | Password-protected, session in localStorage |
| Firebase API key in code | Public by design; secured via Firestore security rules |
| Gmail credentials | Stored only in Netlify environment variables, never in code |
| Email abuse | Gmail App Password scoped only to sending, no inbox access |
| Stock overselling | Atomic Firestore batch writes on every order |

---

## 7. Constraints

- **No backend server** — everything runs client-side or via Netlify serverless functions
- **No npm/build step** — all dependencies via CDN, deployable as plain static files
- **Single admin** — no multi-user roles required
- **Free tier** — Firebase Spark plan, Netlify free tier, Gmail free
- **UPI payments on hold** — pending PhonePe business account approval

---

## 8. Future Scope *(not committed)*

- Re-enable UPI payment flow once PhonePe business account is approved
- Customer order history (lookup by phone number)
- Delivery slot management (block out dates)
- Weekly harvest announcement push notification to subscribed buyers
- Product seasonal availability calendar
- WhatsApp bulk message to regular customers when new stock is added

---

## 9. Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0 | April 2026 | Initial PRD — full feature documentation of live product |