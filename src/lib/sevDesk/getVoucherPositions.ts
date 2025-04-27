import Stripe from "stripe";
import { components } from "../../types/schema";

export default (invoice: Stripe.Invoice, amount: number) => {
  const items: components["schemas"]["Model_VoucherPos"][] = [];

  items.push({
    objectName: "VoucherPos",
    mapAll: true,
    accountDatev: {
      // 3651 = Nicht steuerbare Umsätze Drittland
      // 3631 = Einnahmen aus dem Verkauf von Waren und Dienstleistungen
      id: 3631,
      objectName: "AccountDatev",
    },
    accountingType: undefined as unknown as any,
    taxRate: Math.round(
      ((invoice.tax || 0) / (invoice.total_excluding_tax || invoice.total)) *
        100
    ),
    net: false,
    sumNet: 0,
    // use amount from transaction, as already accounts for discounts and exchange rate
    sumGross: amount,
    comment: null,
    voucher: undefined as unknown as any,
  });
  return items;
};
