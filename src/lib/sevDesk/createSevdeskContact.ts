import Stripe from "stripe";
import sevDeskClient from "./sevDeskClient";
import { components } from "../../types/schema";
import withRetry from "../helper/withRetry";

export default async (invoice: Stripe.Invoice) => {
  try {
    const data: components["schemas"]["Model_Contact"] = {
      surename: invoice.customer_name,
      // with customer number, we can assign the stripe id
      customerNumber: invoice.customer as string,
      category: {
        id: 3,
        objectName: "Category",
      },
      status: 100,
      description: invoice.customer as string,
      // exemptVat: "exempt" === customer.tax_exempt,
    };

    // if (typeof customer.tax_ids !== "undefined" && customer.tax_ids.data.length) {
    //   const taxId = customer.tax_ids.data[0];

    //   Object.assign(data, {
    //     vatNumber: "eu_vat" === taxId.type ? taxId.value : null,
    //     taxType: "eu_vat" === taxId.type ? "eu" : null,
    //   });
    // }

    return await withRetry(() => sevDeskClient.post("/Contact", data));
  } catch (err: any) {
    console.error(
      `Could not create SevDesk contact with id ${invoice.customer}`
    );
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }
};
