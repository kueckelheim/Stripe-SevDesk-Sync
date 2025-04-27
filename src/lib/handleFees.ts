import Stripe from "stripe";
import cliProgress from "cli-progress";
import processInBatches from "./helper/processInBatches";
import handleStripeFee from "./sevDesk/handleStripeFee";

export default async (
  stripeCheckingAccountId: number,
  stripeFeeTransactions: Stripe.BalanceTransaction[],
  stripeFeeVoucherId: number
) => {
  if (!stripeFeeTransactions.length) return {};

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${stripeFeeTransactions.length} Stripe fees.`
  );

  progressBar.start(stripeFeeTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    stripeFees: 0,
  };
  let netAmount = 0;

  const processFee = async (transaction: Stripe.BalanceTransaction) => {
    try {
      await handleStripeFee(
        transaction.created,
        transaction.amount / 100,
        stripeCheckingAccountId,
        stripeFeeVoucherId,
        transaction.description! + " " + transaction.id
      );

      log.stripeFees += transaction.amount / 100;
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

  await processInBatches(stripeFeeTransactions, processFee, 10); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing Stripe fees complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}`
  );

  return { log, netAmount };
};
