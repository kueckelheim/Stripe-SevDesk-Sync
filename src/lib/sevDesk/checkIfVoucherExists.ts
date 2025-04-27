import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

// the invoice number is saved in the description field of the voucher
// therefore, we check if a voucher with that description already exists
// if so, we throw an error
export default async (id: string) => {
  const response = await withRetry(() =>
    sevDeskClient.get(`/Voucher?descriptionLike=${id}`)
  );
  if (response.data.objects.length) {
    throw new Error(`Voucher has already been created for invoice ${id}`);
  }
};
