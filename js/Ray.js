var Ray = function (start, dir) {
  this.start = start;
  this.dir = dir.normalize();
}

Ray.prototype.negative = function () {
  return new Ray(this.start, new Vector(-this.dir.x, -this.dir.y, -this.dir.z));
}
