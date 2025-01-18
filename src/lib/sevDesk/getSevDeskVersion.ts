import sevDeskClient from "./sevDeskClient";

export default async () => {
  const response = await sevDeskClient.get("/Tools/bookkeepingSystemVersion");
  console.log("You are running on SevDesk version ", response.data.objects);
};
