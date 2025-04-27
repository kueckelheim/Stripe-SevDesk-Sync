import Stripe from "stripe";
import cliProgress from "cli-progress";
import processInBatches from "./helper/processInBatches";
import handleStripeFee from "./sevDesk/handleStripeFee";
import createDisputeVoucher from "./sevDesk/createDisputeVoucher";

export default async (
  stripeCheckingAccountId: number,
  disputeTransactions: Stripe.BalanceTransaction[],
  stripeFeeVoucherId: number
) => {
  if (!disputeTransactions.length) return {};

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${disputeTransactions.length} Stripe disputes.`
  );

  progressBar.start(disputeTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    disputeFees: 0,
    sumDisputes: 0,
  };
  let netAmount = 0;

  const processDispute = async (transaction: Stripe.BalanceTransaction) => {
    try {
      if (!transaction.fee_details) {
        throw new Error("No fee_details although expected.");
      }
      if (transaction.fee_details.length > 1) {
        throw new Error("More than 1 fee_details object.");
      }

      await handleStripeFee(
        transaction.created,
        -transaction.fee_details[0]!.amount / 100,
        stripeCheckingAccountId,
        stripeFeeVoucherId,
        transaction.fee_details[0]!.description! + " " + transaction.id
      );
      log.disputeFees += transaction.fee_details[0]!.amount / 100;
      netAmount -= transaction.fee_details[0]!.amount / 100;
      await createDisputeVoucher(transaction, stripeCheckingAccountId);

      log.sumDisputes += transaction.amount / 100;
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

  await processInBatches(disputeTransactions, processDispute, 10); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing Stripe disputes complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}`
  );

  return { log, netAmount };
};
