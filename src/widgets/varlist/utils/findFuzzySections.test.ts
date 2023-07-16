import { findFuzzySections } from "./findFuzzySections"

test("it will find exact match", () => {
    const subject = "test with many many words"
    const term = "many"

    const result = findFuzzySections(subject, term)
    expect(result.exact).toBe(true)
    expect(result.sections).toHaveLength(1)
    expect(result.complete).toBe(true)

    expect(subject.substring(result.sections[0].from, result.sections[0].to)).toBe(term)

    expect(result.sections[0].to).toBe(14)
})

test("it will find multiple group", () => {
    const subject = "test with many many words"
    const term = "tema"

    const result = findFuzzySections(subject, term)
    console.debug(result)
    expect(result.exact).toBe(false)
    expect(result.sections).toHaveLength(2)
    expect(result.complete).toBe(true)

    expect(subject.substring(result.sections[0].from, result.sections[0].to)).toBe("te")
    expect(subject.substring(result.sections[1].from, result.sections[1].to)).toBe("ma")
    expect(result.sections[1].to).toBe(12)
})

test("can have partial at the end", () => {
    const subject = "test with many words"
    const term = "temads"

    const result = findFuzzySections(subject, term)
    console.debug(result)
    expect(result.exact).toBe(false)
    expect(result.sections).toHaveLength(3)
    expect(result.complete).toBe(true)

    expect(subject.substring(result.sections[0].from, result.sections[0].to)).toBe("te")
    expect(subject.substring(result.sections[1].from, result.sections[1].to)).toBe("ma")
    expect(subject.substring(result.sections[2].from, result.sections[2].to)).toBe("ds")
})

test("it will reverse find exact match", () => {
    const subject = "test with many many words"
    const term = "many"

    const result = findFuzzySections(subject, term, true)
    expect(result.exact).toBe(true)
    expect(result.sections).toHaveLength(1)
    expect(result.complete).toBe(true)

    expect(subject.substring(result.sections[0].from, result.sections[0].to)).toBe(term)
    expect(result.sections[0].to).toBe(19)
})

test("it will reverse find multiple group", () => {
    const subject = "test with many many words"
    const term = "tema"

    const result = findFuzzySections(subject, term, true)
    expect(result.exact).toBe(false)
    expect(result.sections).toHaveLength(2)
    expect(result.complete).toBe(true)

    expect(subject.substring(result.sections[0].from, result.sections[0].to)).toBe("te")
    expect(subject.substring(result.sections[1].from, result.sections[1].to)).toBe("ma")
    expect(result.sections[1].to).toBe(17)
})
