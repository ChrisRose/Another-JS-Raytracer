var Color = function (r, g, b) {
  this.r = r;
  this.g = g;
  this.b = b;
  this.a = 0xff;
}

Color.prototype.multColorByFactor = function (factor) {
  return new Color(this.r * factor, this.g * factor, this.b * factor);
}
