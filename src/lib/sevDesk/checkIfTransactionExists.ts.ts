import withRetry from "../helper/withRetry";
import sevDeskClient from "./sevDeskClient";

export default async (
  amount: number,
  date: number,
  stripeCheckingAccountId: number,
  description: string
) => {
  let res: any;
  try {
    const url = `/CheckAccountTransaction?startDate=${new Date(
      date * 1000
    ).toISOString()}&endDate=${new Date(
      date * 1000
    ).toISOString()}&paymtPurpose=${description}&checkAccount[id]=${stripeCheckingAccountId}&checkAccount[objectName]=CheckAccount`;

    // status is now in draft
    res = await withRetry(() => sevDeskClient.get(url));
  } catch (err: any) {
    console.error("could not create check account transaction");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }

  if (res.data.objects.length) {
    if (Number(res.data.objects[0].amount) !== amount) {
      throw new Error(
        "There's already an existing transaction for this exact same date, but with a different amount"
      );
    } else {
      throw new Error("Transaction already in SevDesk");
    }
  }
};
