# stripeSevDesk

A Node.js CLI program that synchronizes Stripe data with SevDesk for accounting purposes.

## Contact

- Erik Nogueira Kückelheim
- Bahnhofstraße 35a
- 79206 Breisach
- Germany
- kueckelheim.erik@gmail.com

## Features

The program syncs all your Stripe transactions to SevDesk for a particular month. Each Stripe transaction gets a corresponding transaction in SevDesk on a separate clearing account.

Transactions are booked as follows:

- **Income transactions (payments or charges)**: A debit voucher is created for each transaction with the original invoice attached as a PDF. Each transaction is linked to the respective voucher.
- **Refunds**: A voucher is created for each refund with the original invoice attached as a PDF. The refund transaction is linked to the respective voucher.
- **Disputes**: A voucher is created for each desipute with the original invoice attached as a PDF. The desipute transaction is linked to the respective voucher. The dispute fee is linked to the monthly Stripe Tax invoice
- **Dispute reversals**: A voucher is created for each dispute reversal with the original invoice attached as a PDF
- **Stripe processing and usage fees**: Each individual Stripe fee gets its own SevDesk transaction, and all transactions are linked to one credit voucher with the original monthly Stripe Tax report attached as a PDF.

### SevDesk version 2.0

The program is written using SevDesk version 2.0.

### Cross-checking Final Balance

During the booking process for a particular month, the program tracks the net balance and compares it with Stripe balance reports. All individual transactions are summarized to ensure the resulting balance, income, and fees correspond to those reported by Stripe. This ensures that everything is booked correctly.

### Detailed Log File

After running the program, a log file is saved with detailed information about successfully booked transactions. If there are issues with individual transactions, error messages are saved in the log file. Additionally, the log file tracks the total balance and saves all booked transactions. Any transactions that the program cannot handle are saved as well. The Stripe balance report used for cross-checking is also saved, providing all the information needed to debug any issues.

### Tax rules and accountDatev

The Stripe fee voucher gets the following tax rule to account for reverse charge:

```js
{
  ...
  taxRule: {
    // Reverse Charge
    id: "14" as any,
    objectName: "TaxRule",
  }
}
```

The Stripe fee voucher is assigned to the following booking account:

```js
{
  ...
  accountDatev: {
    // Nebenkosten des Geldverkehrs
    id: 4285,
    objectName: "AccountDatev",
  }
}
```

Invoice vouchers are assigned the same _taxRate_ as indicated in the original invoice, and the corresponding SevDesk tax rule is applied:

```js
taxRule: invoice.tax
  ? // Umsatzsteuerpflichtige Umsätze
    1
  : // Nicht im Inland steuerbare Leistung
    17,
```

## Prerequisites

- Node.js
- git
- npm
- A SevDesk account
- A Stripe account
- Access to the Stripe Tax report for the desired month

## Used Software

This project uses the following software:

- **TypeScript**: A strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.
- **Node.js**: A JavaScript runtime built on Chrome's V8 JavaScript engine, used to execute the server-side code.
- **npm**: A package manager for JavaScript, used to manage the project's dependencies.

## How to use

To use this program, follow these steps:

1. **Clone the repository**:

```sh
git clone https://github.com/kueckelheim/stripeSevDesk.git
cd stripeSevDesk
```

2. **Install dependencies**:

```sh
npm install
```

3. **Configure environment variables**:
   Create a `.env` file in the root directory and add your SevDesk API key:

```env
STRIPE_API_KEY=your_stripe_api_key
```

4. **Store the Stripe tax report**:
   Place the Stripe tax report PDF for the desired month in the `/input` folder.

5. **Run the sync script**:

```sh
npm start
```

You will be prompted to enter the following details:

- The name of the clearing account to be used for all Stripe transactions.
- The Stripe secret API key.

You will also be prompted to select the Stripe Tax report from the `/input` folder that corresponds to the month for which you want to make the bookings.

Once these details are provided, the program will handle the rest. It will parse the Stripe tax report to gather all necessary information for continuing.

6. **Verify the results**:
   Check your SevDesk account to ensure all transactions have been correctly imported and linked.

## Console Output

The console output during the process will look something like this:

```bash
> stripe-sevdesk-sync@1.0.0 start
> ts-node src/index.ts

# Download monthly Stripe tax report and put it in the '/input/' folder.
Enter 'Yes' when done.
Yes

# Select a Stripe tax report: Stripe Tax Invoice [REDACTED].pdf
# Confirm the data before proceeding:
{
  "file": "Stripe Tax Invoice [REDACTED].pdf",
  "receiptNumber": "[REDACTED]",
  "sum": 220.27,
  "year": 2024,
  "month": 5
}
Yes

# We will handle all Stripe transactions in a separate clearing account. You need to create the account in your SevDesk dashboard under Bank->Clearing Account (Verrechnungskonto).
You need to choose an accounting number.
You selected: "Stripe"

> Please enter your Stripe secret key: [REDACTED]

Stripe client initialized.
You are running on SevDesk version { version: '2.0' }

Requesting paid Stripe invoices for 5 2024.
Requesting Stripe transactions for 5 2024.

# Start booking 341 invoices and corresponding processing fees.
100% | ETA: 0s | 341/341

Processing invoices complete:
- Successful: 341
- Failed: 0

=============================

# Start booking 108 Stripe fees.
100% | ETA: 0s | 108/108

Processing Stripe fees complete:
- Successful: 108
- Failed: 0

=============================

Requesting balance summary report from Stripe to cross-check final results.
Final net amount booked: 2903.62000000001
Expected net amount: 2903.62
Final net payouts:  -3051.15
Expected net payouts:  -3051.15

# Once complete, check the log files at /output/2025-01-16T13:17:05.465Z.
```

## Troubleshooting

If you encounter any issues, please refer to the log file generated after running the script. The log file contains detailed information about each transaction and any errors that may have occurred.

## Contributing

If you would like to contribute to this project, please contact the repository owner.
