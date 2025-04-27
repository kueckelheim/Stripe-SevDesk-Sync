import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

export default async (
  amount: number,
  date: string,
  stripeCheckingAccountId: number,
  description: string
) => {
  const response = await withRetry(() =>
    sevDeskClient.post("/CheckAccountTransaction", {
      valueDate: date,
      entryDate: date,
      amount: amount,
      payeePayerName: "Stripe Payments Europe, Limited",
      payeePayerAcctNo: "string",
      paymtPurpose: description,
      payeePayerBankCode: "string",
      checkAccount: {
        // Stripe check account
        id: stripeCheckingAccountId,
        objectName: "CheckAccount",
      },
      status: 100,
    })
  );

  return response.data.objects.id;
};
