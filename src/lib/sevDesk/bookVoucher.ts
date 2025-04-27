import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

export default async (
  voucherId: number,
  amount: number,
  date: string,
  stripeCheckingAccountId: number,
  isPartial: boolean = false,
  transactionId?: number
) => {
  await withRetry(() =>
    sevDeskClient.put(`/Voucher/${voucherId}/bookAmount`, {
      amount: amount,
      date: date,
      type: isPartial ? "N" : "FULL_PAYMENT",
      checkAccount: {
        id: stripeCheckingAccountId,
        objectName: "CheckAccount",
      },
      createFeed: true,
      ...(transactionId
        ? {
            checkAccountTransaction: {
              id: transactionId,
              objectName: "CheckAccountTransaction",
            },
          }
        : {}),
    })
  );
};
