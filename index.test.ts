import fetch from "node-fetch";

const URL = process.env.E2E_URL || "";

describe("test", () => {
  test("should work", async () => {
    // create the record
    const { executionId } = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: "0xabcdef",
        networkId: 3,
      }),
    }).then((res) => res.json());

    // get the value
    const { name, expiryDate } = await fetch(`${URL}/execution/${executionId}`).then((res) => res.json());
    expect(name).toBeDefined();
    expect(expiryDate).toBeDefined();
  });
});
