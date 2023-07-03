interface Alteration {
  path: string[];
  index: number;
  offset: number;
}

/**
 * Keeps track of alteration made on arrays and translate the desired updated
 * indexes. There is severe limitation to this class, when nested changes starts
 * to interfere with each other
 */
export class NestedArrayIndexTranslator {
  alterations: Array<Alteration> = [];
  constructor() {}

  remove(path: string[], index: number): void {
    this.addNewAlteration({ path, index, offset: -1 });
  }
  add(path: string[], index: number): void {
    this.addNewAlteration({ path, index, offset: 1 });
  }

  protected addNewAlteration(newAlteration: Alteration) {
    // alter all elements that have this as a previx
    for (const alteration of this.alterations)
      if (isPrefixOf(newAlteration.path, alteration.path)) {
        const targetIndex = newAlteration.path.length;
        const current = parseInt(alteration.path[targetIndex]);
        if (offsetApplies(current, newAlteration))
          alteration.path[targetIndex] = "" + (current + newAlteration.offset);
      }

    this.alterations.push(newAlteration);
  }
  translate(path: string[], index: number): number {
    let value = index;
    for (const alteration of this.alterations)
      if (
        pathMatches(alteration.path, path) &&
        offsetApplies(index, alteration)
      ) {
        value += alteration.offset;
      }
    return value;
  }
}

function offsetApplies(index: number, alteration: Alteration) {
  if (alteration.offset > 0) {
    if (index >= alteration.index) {
      return true;
    }
  } else {
    if (index > alteration.index) {
      return true;
    } else if (index === alteration.index) {
      console.warn(
        "offsetApplies is requesting the index that was removed",
        alteration
      );
    }
  }
  return false;
}

function pathMatches(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isPrefixOf(prefix: string[], candidate: string[]) {
  if (prefix.length > candidate.length) return false;
  for (let i = 0; i < prefix.length; i++)
    if (prefix[i] !== candidate[i]) return false;
  return true;
}
