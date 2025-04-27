import fs from "fs/promises";
import Stripe from "stripe";
import { getStripeClient } from "./stripeClient";

export default async (month: number, year: number, logDirPath: string) => {
  try {
    let invoices: Stripe.Invoice[] = [];
    let idx = 0;
    console.log(`Requesting paid stripe invoices for ${month} ${year}.`);
    await getStripeClient()
      .invoices.list({
        status: "paid",
        limit: 100,
        created: {
          // inclusive start date
          gte: new Date(Date.UTC(year, month - 1, 1)).getTime() / 1000,
          // exclusive end date
          lt: new Date(Date.UTC(year, month, 1)).getTime() / 1000,
        },
      })
      .autoPagingEach((invoice) => {
        invoices.push(invoice);
        idx += 1;
      });
    await fs.writeFile(
      `${logDirPath}/invoices.json`,
      JSON.stringify(invoices, null, 2)
    );
    return invoices;
  } catch (err: any) {
    console.error("could not get invoices");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }
};
