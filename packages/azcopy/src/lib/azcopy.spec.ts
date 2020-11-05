import { azcopy } from "./azcopy";

describe("azcopy", () => {
  it("should work", () => {
    expect(azcopy()).toEqual("azcopy");
  });
});
