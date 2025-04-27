import Stripe from "stripe";
import sevDeskClient from "./sevDeskClient";
import type { components } from "../../types/schema";
import getDateFromTimestamp from "../helper/getDateFromTimestamp";
import getVoucherPositions from "./getVoucherPositions";
import withRetry from "../helper/withRetry";

const getTaxInformation = (invoice: Stripe.Invoice) => {
  // currently I only use either 1 for eu-wide transactions or 17 for non-eu transactions
  // hence, whenever there is a tax amount on the invoice, it's 1, otherwise 17
  // this works for both JSchallenger and Pychallenger
  return {
    taxText: invoice.default_tax_rates.length
      ? invoice.default_tax_rates[0]!.description!
      : "",
    taxRule: invoice.tax
      ? // Umsatzsteuerpflichtige Umsätze
        1
      : // Nicht im Inland steuerbare Leistung
        17,
  };
};

export default async (
  invoice: Stripe.Invoice,
  sevDeskContactId: string,
  filename: string,
  transaction: Stripe.BalanceTransaction
) => {
  try {
    const { taxRule } = getTaxInformation(invoice);

    const data: components["schemas"]["saveVoucher"] = {
      voucher: {
        objectName: "Voucher",
        mapAll: true,
        voucherDate: getDateFromTimestamp(transaction.created),
        supplier: {
          id: Number(sevDeskContactId),
          objectName: "Contact",
        },
        supplierName: null,
        description: invoice.number,
        payDate: getDateFromTimestamp(transaction.created),
        status: 100,
        taxRule: {
          id: String(taxRule) as unknown as any,
          objectName: "TaxRule",
        },
        taxType: undefined as unknown as any,
        creditDebit: "D",
        voucherType: "VOU",
        currency: "EUR",
        propertyForeignCurrencyDeadline: null,
        propertyExchangeRate: 1,
        taxSet: null,
      },
      voucherPosSave: getVoucherPositions(invoice, transaction.amount / 100),
      voucherPosDelete: undefined as unknown as any,
      filename,
    };

    const response = await withRetry(() =>
      sevDeskClient.post("/Voucher/Factory/saveVoucher", data)
    );
    return {
      id: response.data.objects.voucher.id,
      amount: response.data.objects.voucher.sumGrossAccounting,
    };
  } catch (err: any) {
    console.error("could not create voucher");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error(err);
  }
};
