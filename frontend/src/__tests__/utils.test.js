import { describe, it, expect } from "vitest";
import {
  normalizeBookingDate,
  isValidBookingDate,
  formatBookingDate,
  formatBookingWeekday,
  formatSelectedDateTitle,
  getPeopleCountLabel,
  getPeopleCountLimitLabel,
  formatUserNameInitials,
  getBookingUserKey,
  spaceKindLabels,
  defaultSpaceKind,
} from "../utils.js";

// ---------- normalizeBookingDate ----------

describe("normalizeBookingDate", () => {
  it("extracts YYYY-MM-DD from ISO string", () => {
    expect(normalizeBookingDate("2025-06-01T10:00:00Z")).toBe("2025-06-01");
  });

  it("extracts YYYY-MM-DD from space-delimited string", () => {
    expect(normalizeBookingDate("2025-06-01 10:00:00")).toBe("2025-06-01");
  });

  it("passes through plain date", () => {
    expect(normalizeBookingDate("2025-06-01")).toBe("2025-06-01");
  });

  it("returns empty string for null/undefined", () => {
    expect(normalizeBookingDate(null)).toBe("");
    expect(normalizeBookingDate(undefined)).toBe("");
    expect(normalizeBookingDate("")).toBe("");
  });
});

// ---------- isValidBookingDate ----------

describe("isValidBookingDate", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isValidBookingDate("2025-06-01")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidBookingDate("01.06.2025")).toBe(false);
    expect(isValidBookingDate("2025-6-1")).toBe(false);
    expect(isValidBookingDate("")).toBe(false);
    expect(isValidBookingDate(null)).toBe(false);
  });
});

// ---------- formatBookingDate ----------

describe("formatBookingDate", () => {
  it("formats as DD.MM.YYYY", () => {
    expect(formatBookingDate("2025-06-01")).toBe("01.06.2025");
  });

  it("returns raw on invalid input", () => {
    expect(formatBookingDate("oops")).toBe("oops");
    expect(formatBookingDate("")).toBe("");
  });
});

// ---------- formatBookingWeekday ----------

describe("formatBookingWeekday", () => {
  it("returns Russian weekday", () => {
    // 2025-06-01 is Sunday
    expect(formatBookingWeekday("2025-06-01")).toBe("Воскресенье");
    // 2025-06-02 is Monday
    expect(formatBookingWeekday("2025-06-02")).toBe("Понедельник");
  });

  it("returns empty on invalid", () => {
    expect(formatBookingWeekday("")).toBe("");
  });
});

// ---------- formatSelectedDateTitle ----------

describe("formatSelectedDateTitle", () => {
  it("builds weekday + date title", () => {
    expect(formatSelectedDateTitle("2025-06-02")).toBe("Понедельник, 02.06.2025");
  });

  it("falls back to default title", () => {
    expect(formatSelectedDateTitle("")).toBe("Схема пространства");
    expect(formatSelectedDateTitle(null)).toBe("Схема пространства");
  });
});

// ---------- getPeopleCountLabel ----------

describe("getPeopleCountLabel", () => {
  it("handles singular and plural forms", () => {
    expect(getPeopleCountLabel(1)).toBe("1 человек");
    expect(getPeopleCountLabel(2)).toBe("2 человека");
    expect(getPeopleCountLabel(5)).toBe("5 человек");
    expect(getPeopleCountLabel(11)).toBe("11 человек");
    expect(getPeopleCountLabel(21)).toBe("21 человек");
    expect(getPeopleCountLabel(22)).toBe("22 человека");
  });

  it("returns empty for zero/negative", () => {
    expect(getPeopleCountLabel(0)).toBe("");
    expect(getPeopleCountLabel(-1)).toBe("");
  });
});

// ---------- getPeopleCountLimitLabel ----------

describe("getPeopleCountLimitLabel", () => {
  it("uses genitive form", () => {
    expect(getPeopleCountLimitLabel(1)).toBe("1 человека");
    expect(getPeopleCountLimitLabel(5)).toBe("5 человек");
  });
});

// ---------- formatUserNameInitials ----------

describe("formatUserNameInitials", () => {
  it("shortens to last name + initials", () => {
    expect(formatUserNameInitials("Иванов Иван Иванович")).toBe("Иванов И.И.");
  });

  it("returns single name as-is", () => {
    expect(formatUserNameInitials("Иванов")).toBe("Иванов");
  });

  it("handles empty / non-string", () => {
    expect(formatUserNameInitials("")).toBe("");
    expect(formatUserNameInitials(null)).toBe("");
    expect(formatUserNameInitials(42)).toBe("");
  });
});

// ---------- getBookingUserKey ----------

describe("getBookingUserKey", () => {
  it("picks wb_user_id first", () => {
    expect(getBookingUserKey({ wb_user_id: "u1", email: "a@b.c" })).toBe("u1");
  });

  it("falls back to email", () => {
    expect(getBookingUserKey({ email: "a@b.c" })).toBe("a@b.c");
  });

  it("returns empty for null/undefined", () => {
    expect(getBookingUserKey(null)).toBe("");
    expect(getBookingUserKey(undefined)).toBe("");
  });
});

// ---------- constants ----------

describe("constants", () => {
  it("exports spaceKindLabels", () => {
    expect(spaceKindLabels.coworking).toBe("Коворкинг");
    expect(spaceKindLabels.meeting).toBe("Переговорка");
  });

  it("exports defaultSpaceKind", () => {
    expect(defaultSpaceKind).toBe("coworking");
  });
});
