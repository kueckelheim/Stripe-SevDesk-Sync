import fs from "fs/promises";
import Stripe from "stripe";
import { getStripeClient } from "./stripeClient";

const getTransactions = async (month: number, year: number) => {
  try {
    let transactions: Stripe.BalanceTransaction[] = [];
    let idx = 0;
    console.log(`Requesting Stripe transactions for ${month} ${year}.`);

    await getStripeClient()
      .balanceTransactions.list({
        limit: 100,
        created: {
          // inclusive start date
          gte: new Date(Date.UTC(year, month - 1, 1)).getTime() / 1000,
          // exclusive end date
          lt: new Date(Date.UTC(year, month, 1)).getTime() / 1000,
        },
      })
      .autoPagingEach((transaction) => {
        transactions.push(transaction);
        idx += 1;
      });

    return transactions;
  } catch (err) {
    console.error("Could not get transactions");
    console.error(err);
    throw new Error();
  }
};

export default async (month: number, year: number, logDirPath: string) => {
  const transactions = await getTransactions(month, year);

  const incomeTransactions: Stripe.BalanceTransaction[] = [];
  const refundTransactions: Stripe.BalanceTransaction[] = [];
  const disputeTransactions: Stripe.BalanceTransaction[] = [];
  const stripeFeeTransactions: Stripe.BalanceTransaction[] = [];
  const unknownTransactions: Stripe.BalanceTransaction[] = [];
  const disputeReversalTransactions: Stripe.BalanceTransaction[] = [];
  const payoutTransactions: Stripe.BalanceTransaction[] = [];

  for (const transaction of transactions) {
    switch (transaction.type) {
      case "payment":
      case "charge":
        incomeTransactions.push(transaction);
        break;
      case "refund":
        refundTransactions.push(transaction);
        break;
      case "payout":
        payoutTransactions.push(transaction);
        break;
      case "adjustment":
        if (transaction.reporting_category === "dispute") {
          disputeTransactions.push(transaction);
        } else if (transaction.reporting_category === "dispute_reversal") {
          disputeReversalTransactions.push(transaction);
        } else {
          unknownTransactions.push(transaction);
        }
        break;
      case "stripe_fee":
        stripeFeeTransactions.push(transaction);
        break;
      default:
        unknownTransactions.push(transaction);
    }
  }
  if (incomeTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/incomeTransactions.json`,
      JSON.stringify(incomeTransactions, null, 2)
    );
  }
  if (refundTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/refundTransactions.json`,
      JSON.stringify(refundTransactions, null, 2)
    );
  }
  if (disputeTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/disputeTransactions.json`,
      JSON.stringify(disputeTransactions, null, 2)
    );
  }
  if (stripeFeeTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/stripeFeeTransactions.json`,
      JSON.stringify(stripeFeeTransactions, null, 2)
    );
  }
  if (disputeReversalTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/disputeReversalTransactions.json`,
      JSON.stringify(disputeReversalTransactions, null, 2)
    );
  }
  if (payoutTransactions.length !== 0) {
    await fs.writeFile(
      `${logDirPath}/payoutTransactions.json`,
      JSON.stringify(payoutTransactions, null, 2)
    );
  }
  if (unknownTransactions.length !== 0) {
    console.log("Unknown transactions found");
    await fs.writeFile(
      `${logDirPath}/unknownTransactions.json`,
      JSON.stringify(unknownTransactions, null, 2)
    );
  }

  return {
    incomeTransactions,
    refundTransactions,
    disputeTransactions,
    stripeFeeTransactions,
    disputeReversalTransactions,
    payoutTransactions,
  };
};
