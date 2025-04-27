import Stripe from "stripe";
import { components } from "../../types/schema";
import getDateFromTimestamp from "../helper/getDateFromTimestamp";
import { getStripeClient } from "../stripe/stripeClient";
import bookVoucher from "./bookVoucher";
import checkIfVoucherExists from "./checkIfVoucherExists";
import getVoucherPositions from "./getVoucherPositions";
import sevDeskClient from "./sevDeskClient";
import uploadFile from "./uploadFile";
import withRetry from "../helper/withRetry";

export default async (
  transaction: Stripe.BalanceTransaction,
  stripeCheckingAccountId: number
) => {
  try {
    const refund = await getStripeClient().refunds.retrieve(
      transaction.source as any
    );

    const charge = await getStripeClient().charges.retrieve(
      refund.charge as any
    );

    const invoice = await getStripeClient().invoices.retrieve(
      charge.invoice as any
    );

    // check if there's already a refund voucher for this refund
    await checkIfVoucherExists(`Refund for ${invoice.number}`);

    const res = await withRetry(() =>
      sevDeskClient.get(`/Voucher?descriptionLike=${invoice.number}`)
    );
    const voucher = res.data.objects[0];
    const filename: any = await uploadFile(invoice.invoice_pdf as any);

    const data: components["schemas"]["saveVoucher"] = {
      voucher: {
        objectName: "Voucher",
        mapAll: true,
        voucherDate: getDateFromTimestamp(transaction.created),
        supplier: {
          id: Number(voucher.supplier.id),
          objectName: "Contact",
        },
        supplierName: null,
        description: `Refund for ${invoice.number}`,
        payDate: getDateFromTimestamp(transaction.created),
        status: 100,
        taxRule: voucher.taxRule,
        taxType: undefined as unknown as any,
        creditDebit: "C",
        voucherType: "VOU",
        currency: "EUR",
        propertyForeignCurrencyDeadline: null,
        propertyExchangeRate: 1,
        taxSet: null,
      },
      voucherPosSave: getVoucherPositions(invoice, -transaction.amount / 100),
      voucherPosDelete: undefined as unknown as any,
      filename,
    };

    const response = await withRetry(() =>
      sevDeskClient.post("/Voucher/Factory/saveVoucher", data)
    );
    const voucherId = response.data.objects.voucher.id;
    const accountingAmount = response.data.objects.voucher.sumGrossAccounting;

    await bookVoucher(
      voucherId,
      -accountingAmount,
      getDateFromTimestamp(transaction.created),
      stripeCheckingAccountId
    );
  } catch (err: any) {
    console.error(`Could not create refund voucher for ${transaction.source}`);
    console.log(err);
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error(err);
  }
};
