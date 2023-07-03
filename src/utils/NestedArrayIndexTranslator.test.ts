import { NestedArrayIndexTranslator } from "./NestedArrayIndexTranslator";

test("Can translate simple array add", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.add(["a"], 5);
  expect(translator.translate(["a"], 2)).toBe(2);
  expect(translator.translate(["a"], 5)).toBe(6);
  expect(translator.translate(["a"], 6)).toBe(7);
});

test("Can translate simple nested array add", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.add(["a", "b"], 5);
  expect(translator.translate(["a", "b"], 2)).toBe(2);
  expect(translator.translate(["a", "b"], 5)).toBe(6);
  expect(translator.translate(["a", "b"], 6)).toBe(7);
});

test("Can alter previous add entry when prefix is updated", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.add(["a", "4", "b"], 5);
  expect(translator.translate(["a", "4", "b"], 6)).toBe(7);

  translator.add(["a"], 2);
  expect(translator.translate(["a", "4", "b"], 6)).toBe(6);
  expect(translator.translate(["a", "5", "b"], 6)).toBe(7);
});

test("Can translate simple array remove", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.remove(["a"], 5);
  expect(translator.translate(["a"], 2)).toBe(2);
  expect(translator.translate(["a"], 6)).toBe(5);
});

test("Can translate simple nested array remove", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.remove(["a", "b"], 5);
  expect(translator.translate(["a", "b"], 2)).toBe(2);
  expect(translator.translate(["a", "b"], 6)).toBe(5);
});

test("Can alter previous remove entry when prefix is updated", () => {
  const translator = new NestedArrayIndexTranslator();

  translator.remove(["a", "4", "b"], 5);
  expect(translator.translate(["a", "4", "b"], 6)).toBe(5);

  translator.remove(["a"], 2);
  expect(translator.translate(["a", "4", "b"], 6)).toBe(6);
  expect(translator.translate(["a", "5", "b"], 6)).toBe(6);
  expect(translator.translate(["a", "3", "b"], 6)).toBe(5);
});
