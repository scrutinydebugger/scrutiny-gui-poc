import { MosaicNode, MosaicPath } from "react-mosaic-component";
import { MosaicDropTargetPosition } from "react-mosaic-component/lib/internalTypes";
import { MosaicKey, MosaicParent } from "react-mosaic-component/lib/types";

/**
 * Helper function that alters the react-mosaic value to add the new window
 * where it is desired.
 */

export function alterMosaic(
  mosaic: MosaicNode<string> | null,
  tileId: string,
  path: MosaicPath,
  position: MosaicDropTargetPosition | null
): MosaicNode<string> {
  // replace blank tile
  if (mosaic === null) return tileId;
  else if (path.length === 0)
    // otherwise place where desired
    return splitMosaicNode(mosaic, tileId, position ?? "right");
  else if (path.length > 0 && typeof mosaic === "object" && mosaic) {
    // crawl the tree to update the target node
    const nextPath = path[0];
    return {
      ...mosaic,
      [nextPath]: alterMosaic(
        mosaic[nextPath],
        tileId,
        path.slice(1),
        position
      ),
      // otherwise, we should be able to navigate to the desired node
    };
  } else {
    // this should not occur
    throw new Error(
      "alterMosaic invalid arguments, path provided, and mosaic is not an object"
    );
  }
}

/**
 * Crawls through a whole mosaic to return the list of all the tile ids
 * contained into it
 */

export function getMosaicTileIds<T extends MosaicKey>(
  mosaic: MosaicNode<T> | null
): T[] {
  if (mosaic === null) return [];
  else if (typeof mosaic === "object")
    return [
      ...getMosaicTileIds(mosaic.first),
      ...getMosaicTileIds(mosaic.second),
    ];
  else return [mosaic];
}

/**
 * Used to return an updated MosaicNode, spliting the value that was previously
 * there with the newly provided value
 */

export function splitMosaicNode<T extends MosaicKey>(
  existingNode: MosaicNode<T>,
  newNode: T,
  position: MosaicDropTargetPosition
): MosaicParent<T> {
  return {
    direction: position === "top" || position === "bottom" ? "column" : "row",
    splitPercentage: 50,
    ...(position === "top" || position === "left"
      ? { first: newNode, second: existingNode }
      : { first: existingNode, second: newNode }),
  };
}
