export const getRotationYMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [cos, 0, sin],
    [0, 1, 0],
    [-sin, 0, cos]
  ];
};

export const getRotationXMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [1, 0, 0],
    [0, cos, -sin],
    [0, sin, cos]
  ];
};

export const getRotationZMatrix = (angle: number) => {
  const degrees = (angle * Math.PI) / 180;
  const cos = Math.cos(degrees);
  const sin = Math.sin(degrees);
  return [
    [cos, -sin, 0],
    [sin, cos, 0],
    [0, 0, 1]
  ];
};
