export default (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const formattedDate = `${String(date.getUTCDate()).padStart(2, "0")}.${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}.${date.getUTCFullYear()}`;
  return formattedDate;
};
