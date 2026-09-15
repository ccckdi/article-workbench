import { describe, expect, it } from "vitest";
import { DateUtils } from "../src/utils/date";

describe("Halo DateUtils", () => {
  const dates = new DateUtils();
  it("handles absent values", () => {
    expect(dates.format(null)).toBe("");
    expect(dates.toISOString(undefined)).toBe("");
    expect(dates.toDatetimeLocal(null)).toBe("");
  });
  it("preserves instant during ISO conversion", () => {
    expect(dates.toISOString("2026-09-15T08:00:00+08:00")).toBe(
      "2026-09-15T00:00:00.000Z",
    );
  });
  it("formats calendar fields and switches locale", () => {
    expect(dates.format("2026-09-15", "YYYY/MM/DD")).toBe("2026/09/15");
    dates.setLocale("zh-CN");
    expect(dates.dayjs.locale()).toBe("zh-cn");
  });
});
