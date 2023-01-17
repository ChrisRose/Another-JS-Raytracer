export class Color {
  r: number;
  g: number;
  b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  multiply(factor: number) {
    return new Color(
      Math.min(this.r * factor, 255),
      Math.min(this.g * factor, 255),
      Math.min(this.b * factor, 255)
    );
  }

  add(color: Color) {
    return new Color(this.r + color.r, this.g + color.g, this.b + color.b);
  }

  divide(factor: number) {
    return new Color(this.r / factor, this.g / factor, this.b / factor);
  }

  subtract(color: Color) {
    return new Color(this.r - color.r, this.g - color.g, this.b - color.b);
  }
}
