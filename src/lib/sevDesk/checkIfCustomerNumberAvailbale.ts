import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

export default async (customerNumber: string): Promise<boolean> => {
  try {
    const response = await withRetry(() =>
      sevDeskClient.get("/Contact/Mapper/checkCustomerNumberAvailability", {
        params: {
          customerNumber,
        },
      })
    );

    return response.data.objects;
  } catch (err: any) {
    throw new Error(err);
  }
};
