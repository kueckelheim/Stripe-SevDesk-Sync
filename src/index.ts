import * as dotenv from "dotenv";
dotenv.config();

import getInvoices from "./lib/stripe/getInvoices";
import getSevDeskVersion from "./lib/sevDesk/getSevDeskVersion";
import getStripeCheckingAccountId from "./lib/sevDesk/getStripeCheckingAccountId";
import getTransactions from "./lib/stripe/getTransactions";
import path from "path";
import { mkdirSync, writeFileSync } from "fs";
import createStripeFeeVoucher from "./lib/sevDesk/createStripeFeeVoucher";
import handleInvoices from "./lib/handleInvoices";
import selectStripeTaxReportFile from "./lib/helper/selectStripeTaxReportFile";
import getCheckAccountName from "./lib/helper/getCheckAccountName";
import { initializeStripeClient } from "./lib/stripe/stripeClient";
import handleFees from "./lib/handleFees";
import handleRefunds from "./lib/handleRefunds";
import handleDisputes from "./lib/handleDisputes";
import handleDisputeReversals from "./lib/handleDisputeReversals";
import createBalanceSummaryReport from "./lib/stripe/createBalanceSummaryReport";
import handlePayouts from "./lib/handlePayouts";

// todo: handle business customers
// todo: check how VAT is handle with disputes, refunds, and dispute reversals
// todo: maybe before actually booking anything, check if what would be booked corresponds to the expected values from the balance summary report
// todo: Create a new clearing account programmatically if not existent yet (https://api.sevdesk.de/#tag/CheckAccount/operation/createClearingAccount)

const logResults = (results: any, logDirPath: string) => {
  writeFileSync(`${logDirPath}/logs.json`, JSON.stringify(results, null, 2));
};

const main = async () => {
  const { month, year, sumFees, invoiceNumber, taxFile } =
    await selectStripeTaxReportFile();

  const checkAccountName = await getCheckAccountName();
  const stripeCheckingAccountId = await getStripeCheckingAccountId(
    checkAccountName
  );
  await initializeStripeClient();

  const now = Date.now();
  // create new log directory
  const logDirPath = path.join(
    __dirname,
    "..",
    "output",
    new Date(now).toISOString()
  );

  mkdirSync(logDirPath, { recursive: true });

  await getSevDeskVersion();

  const stripeFeeVoucherId = await createStripeFeeVoucher(
    invoiceNumber!,
    taxFile,
    sumFees,
    month,
    year
  );

  // run getInvoices and getTransactions in parallel
  const [
    invoices,
    {
      incomeTransactions,
      disputeTransactions,
      refundTransactions,
      stripeFeeTransactions,
      disputeReversalTransactions,
      payoutTransactions,
    },
  ] = await Promise.all([
    getInvoices(month, year, logDirPath),
    getTransactions(month, year, logDirPath),
  ]);

  let net = 0;

  // it's important to book the invoices first, because refunds need access to the original vouchers
  const { log: invoiceLogs, netAmount: netAmountInvoices } =
    await handleInvoices(
      invoices,
      stripeCheckingAccountId,
      incomeTransactions,
      stripeFeeVoucherId
    );
  net += netAmountInvoices || 0;
  const { log: feeLogs, netAmount: netAmountFees } = await handleFees(
    stripeCheckingAccountId,
    stripeFeeTransactions,
    stripeFeeVoucherId
  );
  net += netAmountFees || 0;
  const { log: refundLogs, netAmount: netAmountRefunds } = await handleRefunds(
    stripeCheckingAccountId,
    refundTransactions
  );
  net += netAmountRefunds || 0;
  const { log: disputeLogs, netAmount: netAmountDisputes } =
    await handleDisputes(
      stripeCheckingAccountId,
      disputeTransactions,
      stripeFeeVoucherId
    );
  net += netAmountDisputes || 0;

  const { log: payoutLogs } = await handlePayouts(
    stripeCheckingAccountId,
    payoutTransactions
  );

  const { log: disputeReversalLogs, netAmount: netAmountDisputeReversals } =
    await handleDisputeReversals(
      stripeCheckingAccountId,
      disputeReversalTransactions
    );
  net += netAmountDisputeReversals || 0;

  const { expectedNetAmount, expectedNetPayouts } =
    await createBalanceSummaryReport(month, year, logDirPath);

  console.log("Final net amount booked: ", net);
  console.log("Expected net amount: ", expectedNetAmount);

  if (payoutTransactions.length) {
    console.log("Final net payouts: ", payoutLogs.payoutSum);
    console.log("Expected net payouts: ", expectedNetPayouts);
  }

  logResults(
    {
      year,
      month,
      checkingAccount: checkAccountName,
      expectedSumFees: sumFees,
      bookedNetAmount: net,
      expectedNetAmount:
        expectedNetAmount || "Could not fetch expected net amount",
      bookedPayouts: payoutLogs?.payoutSum,
      expectedNetPayouts:
        expectedNetPayouts || "Could not fetch expected net payouts",
      invoiceLogs,
      feeLogs,
      refundLogs,
      disputeLogs,
      disputeReversalLogs,
      payoutLogs,
    },
    logDirPath
  );

  console.log("Done");

  console.log(`Check the log files at ${logDirPath}.`);
};

main();
