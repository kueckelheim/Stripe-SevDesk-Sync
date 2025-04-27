import checkIfTransactionExists from "./checkIfTransactionExists.ts";
import createCheckAccountTransaction from "./createCheckAccountTransaction";
import bookVoucher from "./bookVoucher";
import getDateFromTimestamp from "../helper/getDateFromTimestamp";

export default async (
  created: number,
  amount: number,
  stripeCheckingAccountId: number,
  stripeFeeVoucherId: number,
  description: string
) => {
  await checkIfTransactionExists(
    amount,
    created,
    stripeCheckingAccountId,
    description
  );
  const transactionId = await createCheckAccountTransaction(
    amount,
    new Date(created * 1000).toISOString(),
    stripeCheckingAccountId,
    description
  );
  await bookVoucher(
    stripeFeeVoucherId,
    amount,
    getDateFromTimestamp(created),
    stripeCheckingAccountId,
    true,
    transactionId
  );
};
