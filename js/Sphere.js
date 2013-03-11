var Sphere = function (center, radius, color, specularCoefficient, specularExponent, reflectivity, name) {
  this.center = center;
  this.radius = radius;
  this.color = color;
  this.specularCoefficient = specularCoefficient;
  this.specularExponent = specularExponent;
  this.reflectivity = reflectivity;
  this.name = name;
}

Sphere.prototype.findNormal = function (p) {
  return new Vector((p.x - this.center.x) / this.radius, (p.y - this.center.y) / this.radius, (p.z - this.center.z) / this.radius);
}

Sphere.prototype.findIntersection = function (ray) {
  var a, b, c, discriminant, t0, t1;
  a = Math.pow(ray.dir.x, 2) + Math.pow(ray.dir.y, 2) + Math.pow(ray.dir.z, 2);
  b = 2 * (ray.dir.x * (ray.start.x - this.center.x) + ray.dir.y * (ray.start.y - this.center.y) + ray.dir.z * (ray.start.z - this.center.z));
  c = Math.pow(ray.start.x - this.center.x, 2) + Math.pow(ray.start.y - this.center.y, 2) + Math.pow(ray.start.z - this.center.z, 2) - Math.pow(this.radius, 2);

  discriminant = Math.pow(b, 2) - (4 * a * c);

  if (discriminant < 0) {
    return null;
  }
  if (discriminant == 0) {
    return -b / ( 2 * a);
  }
  t0 = (-b + Math.sqrt(discriminant)) / (2 * a);
  t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
  return Math.min(t0, t1);
}
