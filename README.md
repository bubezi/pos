# BeautyPOS

BeautyPOS is a desktop Point of Sale (POS) application built with **Electron**, **React**, **TypeScript**, and **better-sqlite3**.

It is designed for small retail / beauty businesses that need a simple offline-first desktop app for:

- User authentication and role-based access
- Product management
- Checkout and sales recording
- Receipt preview, printing, and PDF export
- Sales history
- Audit logs
- Stock and sales reports

## Tech Stack

- **Electron** for desktop packaging
- **React** for the renderer UI
- **TypeScript** for frontend type safety
- **better-sqlite3** for local database storage
- **Vite** for frontend development/build
- **electron-builder** for Windows packaging

## Features

### Authentication

- Login / logout
- Admin and cashier roles
- Password change flow
- Forced password change support
- Session timeout configuration

### Users

- Create users
- Update users
- Activate / deactivate users
- Reset cashier passwords
- Force password change for users
- Protect last active admin
- Prevent duplicate usernames

### Products

- Create products
- Update products
- Activate / deactivate products
- Update stock quantities
- Search by SKU or name
- Low-stock tracking

### Checkout

- Add items to cart
- Calculate subtotal, discount, total, amount paid, and change
- Save completed sale
- Reduce stock automatically

### Sales & Receipts

- Browse sales history
- Filter sales
- View full sale details
- Preview receipts
- Print receipts
- Save receipts as PDF

### Audit Logs

- Track important actions such as:
  - login/logout
  - user management changes
  - product changes
  - stock changes
  - completed sales
  - receipt actions
  - settings changes

### Reports

- Low stock report
- Zero stock report
- Full stock list
- Sales report filtered by date and/or cashier

## Project Structure

```text
beauty-pos/
├── dist/                  # frontend production build
├── electron/
│   ├── ipc/               # Electron IPC handlers
│   ├── migrations/        # SQL migrations
│   ├── main.mjs           # Electron main process entry
│   ├── preload.cjs        # secure preload bridge
│   ├── db.cjs             # database setup
│   └── audit.cjs          # audit log utilities
├── src/
│   ├── pages/             # React pages
│   ├── components/        # shared UI components
│   ├── styles/            # CSS files
│   └── context/           # app context/providers
├── package.json
└── README.md
Getting Started
Requirements

Node.js

npm

Arch Linux / Windows for development

A supported printer is optional for receipt printing

Install dependencies
npm install
Start development server
npm run dev

This starts:

Vite frontend dev server

Electron app pointed at the Vite server

Build frontend
npm run build
Build Windows installer
npm run dist:win
Packaging Notes

Native dependencies are rebuilt through:

"postinstall": "electron-builder install-app-deps"

This is needed for Electron-native modules such as better-sqlite3.

Database

The app uses SQLite for local offline storage.

Main tables include:

users

products

sales

sale_items

receipts

audit_logs

settings

Development Notes

Printing depends on the host OS printer setup

In development on Linux without printers, receipt preview and PDF save can still be used

Production target is Windows

Recommended Test Checklist
Authentication

valid login

invalid login

logout

session timeout

password change

forced password change

Users

create admin/cashier

duplicate username prevention

update user

activate/deactivate user

reset cashier password

protect last active admin

Products

create product

update product

search product

update stock

activate/deactivate product

low-stock scenarios

Checkout

add products to cart

complete sale

verify stock deduction

verify totals and change

Receipts

preview receipt

print receipt

save PDF

Reports

low stock

zero stock

stock list

sales by date

sales by cashier

sales by date and cashier

Audit Logs

verify logs are created for tracked actions

Future Improvements

Export reports to CSV/PDF

Receipt printer auto-detection

Dashboard charts

Multi-branch support

Backup/restore tools

License

Private project.
