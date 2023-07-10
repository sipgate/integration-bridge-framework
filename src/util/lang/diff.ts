import * as fp from "lodash/fp";

export type IdOf<T> = (x: T) => string;
export type Diff<X, Y> = {
  distinctXs: X[];
  distinctYs: Y[];
  commonXs: X[];
  commonYs: Y[];
};

function byId<T>(idOf: IdOf<T>, xs: T[]): Record<string, T> {
  return fp.reduce((byIds, x) => ({ ...byIds, [idOf(x)]: x }), {}, xs);
}

export function diffArrays<X, Y>(
  idOfX: IdOf<X>,
  idOfY: IdOf<Y>,
  xs: X[],
  ys: Y[]
): Diff<X, Y> {
  const xsByIds = byId(idOfX, xs);
  const ysByIds = byId(idOfY, ys);

  const xsIds = new Set(Object.keys(xsByIds));
  const ysIds = new Set(Object.keys(ysByIds));
  const allIds = new Set([...xsIds.keys(), ...ysIds.keys()]);

  return fp.reduce(
    ({ distinctXs, distinctYs, commonXs, commonYs }: Diff<X, Y>, id) => {
      const inX = xsIds.has(id);
      const inY = ysIds.has(id);

      if (inX && inY) {
        return {
          distinctXs,
          distinctYs,
          commonXs: [...commonXs, xsByIds[id]],
          commonYs: [...commonYs, ysByIds[id]],
        };
      } else if (inX && !inY) {
        return {
          distinctXs: [...distinctXs, xsByIds[id]],
          distinctYs,
          commonXs,
          commonYs,
        };
      } else if (!inX && inY) {
        return {
          distinctXs,
          distinctYs: [...distinctYs, ysByIds[id]],
          commonXs,
          commonYs,
        };
      } else {
        return {
          distinctXs,
          distinctYs,
          commonXs,
          commonYs,
        };
      }
    },
    {
      distinctXs: [],
      distinctYs: [],
      commonXs: [],
      commonYs: [],
    },
    Array.from(allIds)
  );
}
