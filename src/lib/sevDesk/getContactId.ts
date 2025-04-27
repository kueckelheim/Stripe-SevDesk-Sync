import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

export default async (customerNumber: string) => {
  try {
    const response = await withRetry(() =>
      sevDeskClient.get("/Contact", {
        params: { customerNumber: customerNumber, depth: "1" },
      })
    );
    if (response.data?.objects?.length) {
      return response.data.objects[0].id;
    }
    throw new Error("Customer not found");
  } catch (err: any) {
    console.error(
      "Could not get customer id for customerNumber: ",
      customerNumber
    );
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error(err);
  }
};
