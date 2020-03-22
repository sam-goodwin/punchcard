import {MaxLength, Record, Validator, array, number, string} from "../lib";

class Mock extends Record({
  arr: array(string.apply(MaxLength(1))),
  int: number,
  str: string.apply(MaxLength(1)),
}) {}

const validator = Validator.of(Mock);

describe("validator", () => {
  it("validator", () => {
    expect.assertions(3);

    expect(
      validator(
        new Mock({
          arr: ["a"],
          int: 1,
          str: "0",
        }),
        "$",
      ),
    ).toStrictEqual([]);

    expect(
      validator(
        new Mock({
          arr: ["a"],
          int: 1,
          str: "012",
        }),
        "$",
      ),
    ).toStrictEqual([
      new Error(
        `at $['str']: expected string with length <= 1, but received: 012`,
      ),
    ]);

    expect(
      validator(
        new Mock({
          arr: ["aa"],
          int: 1,
          str: "0",
        }),
        "$",
      ),
    ).toStrictEqual([
      new Error(
        `at $['arr'][0]: expected string with length <= 1, but received: aa`,
      ),
    ]);
  });
});
