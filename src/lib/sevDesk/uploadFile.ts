import sevDeskClient from "./sevDeskClient";
import FormData from "form-data";
import axios from "axios";
import withRetry from "../helper/withRetry";

export default async (fileSource: string) => {
  try {
    // Download the file from Stripe as a stream
    const response = await withRetry(() =>
      axios.get(fileSource, { responseType: "stream" })
    );

    const form = new FormData();
    form.append("file", response.data, "invoice.pdf");

    // upload invoice file to sevdesk
    const res = await withRetry(() =>
      sevDeskClient.post("/Voucher/Factory/uploadTempFile", form)
    );
    return res.data.objects.filename;
  } catch (err: any) {
    console.error("could not upload file");
    console.error(err.response?.status);
    console.error(err.response?.data?.error);
    throw new Error(err);
  }
};
