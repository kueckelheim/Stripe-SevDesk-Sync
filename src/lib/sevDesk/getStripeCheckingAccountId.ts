import sevDeskClient from "./sevDeskClient";

// return id of Stripe checking account
// throws an error if none exists

export default async (checkAccountName: string) => {
  let res: any;
  try {
    // get check accounts to get id of Stripe checking accounts
    res = await sevDeskClient.get("/CheckAccount");
  } catch (err: any) {
    console.error(`Could not get check accounts`);
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error();
  }
  const stripeAccount = res.data.objects.find(
    (acc: any) => acc.name === checkAccountName
  );
  if (!stripeAccount) {
    throw new Error(
      "Now checking account with name Stripe exists.\nPlease create one."
    );
  }
  return stripeAccount.id;
};
