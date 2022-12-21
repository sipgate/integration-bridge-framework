import { anonymizeKey } from "./anonymize-key";

it("anonymizes valid key correctly", () => {
  const originalKey = "1n2n3k23j43j23j4bdnc";
  const anonymizedKey = "...3j23j4bdnc";
  expect(anonymizeKey(originalKey)).toEqual(anonymizedKey);
});

it("anonymizes empty key correctly", () => {
  const originalKey = "";
  const anonymizedKey = "...";
  expect(anonymizeKey(originalKey)).toEqual(anonymizedKey);
});
