import sevDeskClient from "./sevDeskClient";
import fs from "fs/promises";

// Creates a file with all existing booking accounts and their allowed tax rules
export default async () => {
  const response = await sevDeskClient.get(`/ReceiptGuidance/forAllAccounts`);
  console.log(response.data);
  await fs.writeFile(
    "BookingAccounts.json",
    JSON.stringify(response.data, null, 2)
  );
};
