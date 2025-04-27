import Stripe from "stripe";
import cliProgress from "cli-progress";
import processInBatches from "./helper/processInBatches";
import createRefundVoucher from "./sevDesk/createRefundVoucher";

export default async (
  stripeCheckingAccountId: number,
  refundTransactions: Stripe.BalanceTransaction[]
) => {
  if (!refundTransactions.length) return {};
  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${refundTransactions.length} Stripe refunds.`
  );

  progressBar.start(refundTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    sumRefunds: 0,
  };
  let netAmount = 0;

  const processRefund = async (transaction: Stripe.BalanceTransaction) => {
    try {
      await createRefundVoucher(transaction, stripeCheckingAccountId);
      log.sumRefunds += -(transaction.amount / 100);
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

  await processInBatches(refundTransactions, processRefund, 10); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing Stripe refunds complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}`
  );

  return { log, netAmount };
};
