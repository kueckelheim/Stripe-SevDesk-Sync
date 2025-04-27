import Stripe from "stripe";
import sevDeskClient from "./sevDeskClient";
import { components } from "../../types/schema";
import checkIfCustomerNumberAvailbale from "./checkIfCustomerNumberAvailbale";
import getContactId from "./getContactId";

const STRIPE_CUSTOMER_NAME = "Stripe Payments Europe, Limited";
const STRIPE_CUSTOMER_NUMBER = "STRIPE";

// we save the Stripe company as a contact if not existent yet
// returns the id of the Stripe contact

export default async () => {
  try {
    if (await checkIfCustomerNumberAvailbale(STRIPE_CUSTOMER_NUMBER)) {
      const data: components["schemas"]["Model_Contact"] = {
        name: STRIPE_CUSTOMER_NAME,
        customerNumber: STRIPE_CUSTOMER_NUMBER,
        category: {
          id: 3,
          objectName: "Category",
        },
        status: 100,
        description: STRIPE_CUSTOMER_NAME,
        exemptVat: null,
      };
      await sevDeskClient.post("/Contact", data);
    }

    const id = await getContactId(STRIPE_CUSTOMER_NUMBER);
    return id;
  } catch (err: any) {
    console.error("Could not create Stripe SevDesk contact");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }
};
