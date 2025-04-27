import Stripe from "stripe";
import cliProgress from "cli-progress";
import checkIfVoucherExists from "./sevDesk/checkIfVoucherExists";
import checkIfCustomerNumberAvailbale from "./sevDesk/checkIfCustomerNumberAvailbale";
import createSevdeskContact from "./sevDesk/createSevdeskContact";
import getContactId from "./sevDesk/getContactId";
import uploadFile from "./sevDesk/uploadFile";
import createVoucher from "./sevDesk/createVoucher";
import bookVoucher from "./sevDesk/bookVoucher";
import getDateFromTimestamp from "./helper/getDateFromTimestamp";
import { getStripeClient } from "./stripe/stripeClient";
import processInBatches from "./helper/processInBatches";
import handleStripeFee from "./sevDesk/handleStripeFee";

export default async (
  invoices: Stripe.Invoice[],
  stripeCheckingAccountId: number,
  incomeTransactions: Stripe.BalanceTransaction[],
  stripeFeeVoucherId: number
) => {
  if (!incomeTransactions.length) return {};

  const progressBar = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic
  );

  console.log(
    `=============================
Start booking ${incomeTransactions.length} invoices and corresponding processing fees.`
  );

  progressBar.start(incomeTransactions.length, 0);

  const log: any = {
    succeeded: [],
    failed: [],
    income: 0,
    processingFees: 0,
  };
  let netAmount = 0;

  const processInvoice = async (transaction: Stripe.BalanceTransaction) => {
    try {
      // find corresponding transaction
      let invoice = invoices.find(
        (t) => t.charge === (transaction.source as any)
      );

      if (!invoice) {
        // backup if invoice not in file
        const charge = await getStripeClient().charges.retrieve(
          transaction.source as any
        );

        invoice = await getStripeClient().invoices.retrieve(
          charge.invoice as any
        );

        if (!invoice) {
          throw new Error(
            "Couldn't retreive corresponding transaction from Stripe"
          );
        }
      }

      await checkIfVoucherExists(String(invoice.number));

      // reuse existing contact if available
      if (await checkIfCustomerNumberAvailbale(invoice.customer as string)) {
        await createSevdeskContact(invoice);
      }
      const id = await getContactId(invoice.customer as string);

      if (!invoice.invoice_pdf)
        throw new Error(`Invoice ${invoice.id} has no invoice_pdf attribute.`);
      const filename = await uploadFile(invoice.invoice_pdf);
      const { id: voucherId, amount } = await createVoucher(
        invoice,
        id,
        filename,
        transaction
      );

      await bookVoucher(
        voucherId,
        amount,
        getDateFromTimestamp(transaction.created),
        stripeCheckingAccountId
      );

      log.income += transaction.amount / 100;
      netAmount += transaction.amount / 100;
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
      log.processingFees += -transaction.fee_details[0]!.amount / 100;
      netAmount -= transaction.fee_details[0]!.amount / 100;
      log.succeeded.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
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

  await processInBatches(incomeTransactions, processInvoice, 10); // Adjust the batch size as needed

  progressBar.stop();

  console.log(
    `Processing invoices complete:
Successfull: ${log.succeeded.length}
Failed: ${log.failed.length}`
  );

  return { log, netAmount };
};
