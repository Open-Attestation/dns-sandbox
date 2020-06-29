import { getDocumentStoreRecords } from "@govtechsg/dnsprove";
import fetch from "node-fetch";
import { retry } from "./retry";

const URL = process.env.E2E_URL || "";
const TIMEOUT = 30000;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  console.error.mockRestore();
});
test(
  "should create record",
  async () => {
    // create the record
    const address = "0xabcdef";
    const networkId = 3;

    const { executionId } = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address,
        networkId,
      }),
    }).then((res) => res.json());

    // get the value
    const { name, expiryDate } = await fetch(`${URL}/execution/${executionId}`).then((res) => res.json());
    expect(name).toBeDefined();
    expect(expiryDate).toBeDefined();

    // expect the record exists
    const records = await retry(
      async () => {
        const records = await getDocumentStoreRecords(name);
        if (records.length === 0) throw new Error("No records found");
        return records;
      },
      { times: TIMEOUT }
    );
    expect(records).toStrictEqual([
      {
        type: "openatts",
        net: "ethereum",
        netId: String(networkId),
        addr: address,
        dnssec: false,
      },
    ]);
  },
  TIMEOUT
);
