import axios from "axios";

const apiKey = process.env.SEVDESK_API_KEY_SECRET;

export default axios.create({
  baseURL: "https://my.sevdesk.de/api/v1/",
  headers: { Authorization: apiKey },
});
