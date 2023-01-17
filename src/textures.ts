import { Color } from "./Color.js";

export const checkerBoardTexture = (x: number, z: number) => {
  const checkers = {
    width: 2,
    height: 2,
    color1: new Color(0, 0, 0),
    color2: new Color(255, 255, 255)
  };
  const { x: u, z: v } = { x: x % 1, z: z % 1 };

  let u2 = Math.floor(u * checkers.width);
  let v2 = Math.floor(v * checkers.height);

  if ((u2 + v2) % 2 === 0) {
    return checkers.color1;
  }
  return checkers.color2;
};
