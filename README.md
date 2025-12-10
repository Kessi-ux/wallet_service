## Wallet Service — NestJS + Prisma + Paystack + Google OAuth

A production-ready digital wallet API built with NestJS, Prisma, PostgreSQL, Google OAuth, JWT, API Keys, Paystack Payments, and Webhooks.
Built using pnpm package manager.

GitHub Repo:[https://github.com/Kessi-ux/wallet_service.git]

### Features
Authentication & Security

Google OAuth2 login

JWT authentication

API key system

Permission-based access control

Auth & API guards

### Wallet Management

Auto-create wallet on user registration

Deposit initialization (Paystack)

Secure Paystack webhook handler

Manual deposit verification

Wallet balance

User-to-User transfers (atomic)

Transaction history

Infrastructure

PostgreSQL + Prisma ORM

Ngrok-ready webhook support

Production-ready (Railway deployment)

## Project Setup
1️. Clone the Project
```bash
git clone https://github.com/Kessi-ux/wallet_service.git

cd wallet_service
```
2️. Install Dependencies (pnpm)
```bash
pnpm install
```

3️. Setup Environment Variables

Create a .env file:
```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="your_jwt_secret"

GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://${BaseUrl}/auth/google/callback"

PAYSTACK_SECRET_KEY="your_secret_key"
PAYSTACK_PUBLIC_KEY="your_public_key"
PAYSTACK_WEBHOOK_SECRET="your_webhook_secret"
```

Database Setup (Prisma + PostgreSQL)
4️. Initialize Prisma
```bash
pnpm prisma init
```
5️. Run Migrations
```bash
pnpm prisma migrate dev
```
### Authentication Flow
Google OAuth → JWT Login

Endpoints:

GET /auth/google
GET /auth/google/callback


Generated Controllers/Strategies:

AuthController

GoogleStrategy

JwtStrategy

AuthModule

### API Key System
Endpoints
Method	Endpoint	Description
POST	/keys/create	Generate new API key (hashed before save)
POST	/keys/rollover	Replace expired API key
GET	/keys	List keys for user
API Key Guard

Validates x-api-key

Checks permissions

Prevents expired key usage

### Wallet Module
Auto-Create Wallet

When a user registers → a wallet is automatically created.

### Deposit Initialization
POST /wallet/deposit

Validates JWT or API key

Calls Paystack initialize endpoint

Returns authorization_url + reference

### Paystack Webhook (Critical)
POST /wallet/paystack/webhook

Verify signature

Enforce idempotency

Credit wallet

Update transaction table

### Manual Verification
GET /wallet/deposit/:reference/status

### Wallet Balance
GET /wallet/balance

### Transfers
POST /wallet/transfer

Atomic with prisma.$transaction()

Debit sender → Credit receiver → Save transaction

### Transaction History
GET /wallet/transactions

## Local Webhook Testing (Ngrok)

Start Nest:

pnpm start:dev

Start ngrok:

ngrok http 3000

Add webhook to Paystack:

https://random-id.ngrok.app/wallet/paystack/webhook

Deployment
Supported Platforms

Railway

Required Production ENV Vars
```bash
DATABASE_URL
JWT_SECRET

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL

PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
PAYSTACK_WEBHOOK_SECRET
```

Recommended Testing Tools

Postman

Thunder Client

Swagger

Ngrok

Paystack Test Mode

Scripts
```bash
"start": "nest start",
"start:dev": "nest start --watch",
"build": "nest build",
"prisma:migrate": "prisma migrate dev",
"prisma:studio": "prisma studio"
```

Tech Stack

NestJS (Backend Framework)

Prisma (ORM)

PostgreSQL

Paystack API

Google OAuth2

JWT Auth

pnpm (Package Manager)

### How to Contribute

Fork the repo

Create a new branch

Commit changes

Submit PR