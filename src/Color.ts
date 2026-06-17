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
    return new Color(this.r * factor, this.g * factor, this.b * factor);
  }

  divide(factor: number) {
    return new Color(this.r / factor, this.g / factor, this.b / factor);
  }

  subtract(color: Color) {
    return new Color(this.r - color.r, this.g - color.g, this.b - color.b);
  }

  addWithColor(color: Color) {
    return new Color(this.r + color.r, this.g + color.g, this.b + color.b);
  }

  multiplyWithColor(color?: Color) {
    if (!color) {
      return new Color(this.r, this.g, this.b);
    }
    return new Color(this.r * color.r, this.g * color.g, this.b * color.b);
  }

  clamp() {
    return new Color(
      Math.min(Math.max(this.r, 0), 1),
      Math.min(Math.max(this.g, 0), 1),
      Math.min(Math.max(this.b, 0), 1)
    );
  }

  gammaCorrect() {
    const inv = 1 / 2.2;
    return new Color(
      Math.pow(Math.max(0, this.r), inv),
      Math.pow(Math.max(0, this.g), inv),
      Math.pow(Math.max(0, this.b), inv)
    );
  }
}
