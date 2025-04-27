import Stripe from "stripe";
import cliProgress from "cli-progress";
import processInBatches from "./helper/processInBatches";
import sevDeskClient from "./sevDesk/sevDeskClient";
import withRetry from "./helper/withRetry";

export default async (
  stripeCheckingAccountId: number,
  payoutTransactions: Stripe.BalanceTransaction[]
) => {
  if (!payoutTransactions.length) return {};

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${payoutTransactions.length} Stripe payouts.`
  );

  progressBar.start(payoutTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    payoutSum: 0,
  };

  const processPayout = async (transaction: Stripe.BalanceTransaction) => {
    try {
      if (transaction.fee_details.length) {
        throw new Error("The payout unexpectedly has a fee.");
      }

      // status is now in draft
      await withRetry(() =>
        sevDeskClient.post("/CheckAccountTransaction", {
          valueDate: new Date(transaction.created * 1000).toISOString(),
          entryDate: new Date(transaction.created * 1000).toISOString(),
          amount: transaction.amount / 100,
          payeePayerName: "Stripe Payments Europe, Limited",
          payeePayerAcctNo: "string",
          paymtPurpose: "Stripe payout",
          payeePayerBankCode: "string",
          checkAccount: {
            // Stripe check account
            id: stripeCheckingAccountId,
            objectName: "CheckAccount",
          },
          status: 100,
        })
      );

      log.payoutSum += transaction.amount / 100;
      log.succeeded.push({
        transactionId: transaction.id,
      });
    } catch (err: any) {
      log.failed.push({
        transactionId: transaction.id,
        error: {
          message: err.message,
          stack: err.stack,
          name: err.name,
          code: err.code,
        },
      });
    }
    progressBar.increment();
  };

  await processInBatches(payoutTransactions, processPayout, 10); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing Stripe payouts complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}
Don't forget to link them to the corresponding payouts on the main account in SevDesk.`
  );

  return { log };
};
