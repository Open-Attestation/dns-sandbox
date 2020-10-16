import { getDocumentStoreRecords, getDnsDidRecords } from "@govtechsg/dnsprove";
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
  "should create ethereum record",
  async () => {
    // create the record
    const address = "0x269a444A16148201E9e89Aa49e2307d7317273d1";
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

test(
  "should create publicKey record",
  async () => {
    // create the record
    const algorithm = "dns-did";
    const publicKey = "did:ethr:0xE39479928Cc4EfFE50774488780B9f616bd4B830#controller";

    const { executionId } = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        algorithm,
        publicKey,
      }),
    }).then((res) => res.json());

    // get the value
    const { name, expiryDate } = await fetch(`${URL}/execution/${executionId}`).then((res) => res.json());
    expect(name).toBeDefined();
    expect(expiryDate).toBeDefined();
    console.log(name);

    // expect the record exists
    const records = await retry(
      async () => {
        const records = await getDnsDidRecords(name);
        if (records.length === 0) throw new Error("No records found");
        return records;
      },
      { times: TIMEOUT }
    );
    expect(records).toStrictEqual([
      {
        type: "openatts",
        algorithm,
        publicKey,
        version: "1.0",
        dnssec: false,
      },
    ]);
  },
  TIMEOUT
);
