var Vector = function (x, y, z) {
  this.x = x;
  this.y = y;
  this.z = z;
}

Vector.prototype.length = function () {
  return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
}

Vector.prototype.normalize = function () {
  var l = this.length();
  return new Vector(this.x / l, this.y / l, this.z / l);
}

Vector.prototype.scalar = function (scalar) {
  return new Vector(this.x * scalar, this.y * scalar, this.z * scalar);
}

Vector.prototype.dotProduct = function (v) {
  return this.x * v.x + this.y * v.y + this.z * v.z;
}
