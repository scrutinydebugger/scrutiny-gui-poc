export function findFuzzySections(
    subject: string,
    term: string,
    reverse?: boolean
): {
    complete: boolean
    sections: { from: number; to: number }[]
    exact: boolean
} {
    const sections: { from: number; to: number }[] = []

    const lowerSubject = subject.toLowerCase()
    const lowerTerm = term.toLowerCase()

    const isReverse = reverse === true

    const exactStart = lowerSubject[isReverse ? "lastIndexOf" : "indexOf"](lowerTerm)
    if (exactStart > -1) {
        sections.push({ from: exactStart, to: exactStart + lowerTerm.length })
        return { complete: true, sections, exact: true }
    }

    let searchIdx = isReverse ? lowerTerm.length - 1 : 0
    const endSearchIdx = isReverse ? -1 : lowerTerm.length
    let currentChar = lowerTerm.charAt(searchIdx)
    // console.debug("starting with character", currentChar)

    let lastMatchingPos: number | null = null
    const startAt = isReverse ? lowerSubject.length : 0
    const endAt = isReverse ? -1 : lowerSubject.length
    const step = isReverse ? -1 : 1

    function addMatch(b: number) {
        if (!lastMatchingPos) throw new Error("Cannot add match from null lastMatchingPos")
        const a = lastMatchingPos
        sections.push(isReverse ? { from: b + 1, to: a + 1 } : { from: a, to: b })
        lastMatchingPos = null
    }

    for (let i = startAt; i != endAt; i += step) {
        if (lowerSubject.charAt(i) === currentChar) {
            if (lastMatchingPos === null) {
                // new group
                // console.debug("new match starting at %d", i)
                lastMatchingPos = i
            } else {
                // console.debug("match at %d", i)
            }
            searchIdx += step
            if (searchIdx === endSearchIdx) {
                // console.debug("all characther found, breaking, adding final section")
                addMatch(i + step)
                break
            }

            currentChar = lowerTerm.charAt(searchIdx)
            // console.debug("moving to next character", currentChar)
        } else if (lastMatchingPos !== null) {
            // console.debug("end of match at %d, adding found section", i)
            addMatch(i)
        }
    }

    // add last group, if it was the one finishing
    if (lastMatchingPos) {
        // console.debug("adding last section post for loop")
        addMatch(endAt)
    }

    return {
        sections: isReverse ? sections.reverse() : sections,
        complete: searchIdx === endSearchIdx,
        exact: false,
    }
}
