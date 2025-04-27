import Stripe from "stripe";
import cliProgress from "cli-progress";
import processInBatches from "./helper/processInBatches";
import createDisputeVoucher from "./sevDesk/createDisputeVoucher";
import createDisputeReversalVoucher from "./sevDesk/createDisputeReversalVoucher";

export default async (
  stripeCheckingAccountId: number,
  disputeReversalTransactions: Stripe.BalanceTransaction[]
) => {
  if (!disputeReversalTransactions.length) return {};

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${disputeReversalTransactions.length} Stripe dispute reversals.`
  );

  progressBar.start(disputeReversalTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    sumDisputeReversals: 0,
  };
  let netAmount = 0;

  const processDisputeReversal = async (transaction: Stripe.BalanceTransaction) => {
    try {
      await createDisputeReversalVoucher(transaction, stripeCheckingAccountId);

      log.sumDisputeReversals += transaction.amount / 100;
      netAmount += transaction.amount / 100;

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

  await processInBatches(disputeReversalTransactions, processDisputeReversal, 1); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing Stripe disputes reversals complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}`
  );

  return { log, netAmount };
};
