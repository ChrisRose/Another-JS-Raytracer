(function () {

  var reflectionDepthMax = 3;

  var epsilon = 0.00001;

  var addColors = function (c1, c2) {
    return new Color(c1.r + c2.r, c1.g + c2.g, c1.b + c2.b);
  }

  var Background = function (color) {
    this.color = color;
  }

  var findIntersectionPoint = function (ray, t) {
    return new Point(ray.start.x + ray.dir.x * t, ray.start.y + ray.dir.y * t, ray.start.z + ray.dir.z * t);
  }

  var getReflectedRay = function (normal, point, ray) {
    var rrX, rrY, rrZ, reflectedRay;
    rrX = ray.dir.x - 2 * normal.scalar(ray.dir.dotProduct(normal)).x;
    rrY = ray.dir.y - 2 * normal.scalar(ray.dir.dotProduct(normal)).y;
    rrZ = ray.dir.z - 2 * normal.scalar(ray.dir.dotProduct(normal)).z;
    reflectedRay = new Ray(point, new Vector(rrX, rrY, rrZ));
    return reflectedRay;
  }

  // find closest intersection
  function getPixelColor(ray, scene_objects, reflectionDepthCurrent, i, j) {
    var intersected, normal, pixelColor, reflectedRay, tempdir;
    intersected = null;
    pixelColor = new Color(0, 0, 0);

    intersected = findIntersection(ray, scene_objects);

    if (intersected) {

      pixelColor = getColor(intersected[0], intersected[1], light, ray);

      if (i == 125 && j == 135) {
        console.log("current reflection depth: ", reflectionDepthCurrent);
        console.log("ray: ");
        console.dir(ray);
        console.log("intersection point: ", intersected[0])
        console.log("intersected object: ");
        console.dir(intersected[1]);
        console.log("color: ");
        console.dir(pixelColor);
      }

      if (intersected[1].reflectivity > 0 && reflectionDepthCurrent < reflectionDepthMax) {
        normal = intersected[1].findNormal(intersected[0]);

        ray = ray.negative();

        reflectedRay = getReflectedRay(normal, intersected[0], ray);
        pixelColor = addColors(pixelColor, getPixelColor(reflectedRay, scene_objects, reflectionDepthCurrent += 1, i, j).multColorByFactor(intersected[1].reflectivity));
      }

    }

    if (i == 125 && j == 30) {
      pixelColor = new Color(255, 255, 255);
    }

    return pixelColor;
  }

  function findIntersection(ray, scene_objects) {
    var intersected, intersection, intersected, intersectionPoint, minIntersection;
    minIntersection = 1000;
    intersected = null;
    for (var k = 0; k < scene_objects.length; k++) {
      intersection = scene_objects[k].findIntersection(ray);
      if (intersection && Math.abs(intersection) < minIntersection && Math.abs(intersection) > epsilon) {
        minIntersection = intersection;
        intersectionPoint = findIntersectionPoint(ray, minIntersection);
        intersected = [intersectionPoint, scene_objects[k]];
      }
    }

    return intersected;
  }

  var getColor = function (point, sphere, light, ray) {
    var attenuation, lightDir, lightRay, normal, dot, reflectedRay, r, g, b;
    lightDir = new Vector(light.position.x - point.x, light.position.y - point.y, light.position.z - point.z);
    //attenuation = 1 / Math.pow(lightDir.length(),2);
    lightRay = new Ray(point, lightDir);
    normal = sphere.findNormal(point);
    reflectedRay = getReflectedRay(normal, point, lightRay);
    dot = Math.max(0, lightRay.dir.dotProduct(normal));

    // ambient
    ambientR = ambientLight.intensity * sphere.color.r;
    ambientG = ambientLight.intensity * sphere.color.g;
    ambientB = ambientLight.intensity * sphere.color.b;

    // diffuse
    diffuseR = dot * light.intensity * sphere.color.r;
    diffuseG = dot * light.intensity * sphere.color.g;
    diffuseB = dot * light.intensity * sphere.color.b;

    // phong
    phongR = sphere.specularCoefficient * Math.pow(Math.max(0, reflectedRay.dir.dotProduct(ray.dir)), sphere.specularExponent);
    phongG = sphere.specularCoefficient * Math.pow(Math.max(0, reflectedRay.dir.dotProduct(ray.dir)), sphere.specularExponent);
    phongB = sphere.specularCoefficient * Math.pow(Math.max(0, reflectedRay.dir.dotProduct(ray.dir)), sphere.specularExponent);

    rComponent = 255 * (ambientR + diffuseR) + phongR;// * attenuation;
    gComponent = 255 * (ambientG + diffuseG) + phongG;// * attenuation;
    bComponent = 255 * (ambientB + diffuseB) + phongB;// * attenuation;

    return new Color(rComponent, gComponent, bComponent);
  }

  function setPixel(imageData, x, y, r, g, b, a) {
    var index;
    index = (y * imageData.width + x) * 4;
    imageData.data[index + 0] = r;
    imageData.data[index + 1] = g;
    imageData.data[index + 2] = b;
    imageData.data[index + 3] = a;
  }

  // scene objects array
  var scene_objects = [];

  // create lights
  var ambientLight = {
    intensity:.2
  };

  var light = new Light(new Point(0, 150, -200), .8);

  // create spheres
  var sphere1_position = new Point(-9.5, -7, 10),
    sphere1_radius = 9,
    sphere1_color = new Color(1, 0, 0),
    sphere1_specularCoefficient = 50,
    sphere1_specularExponent = 25,
    sphere1_reflectivity = 1,
    sphere1 = new Sphere(sphere1_position, sphere1_radius, sphere1_color, sphere1_specularCoefficient, sphere1_specularExponent, sphere1_reflectivity, "sphere 1");

  var sphere2_position = new Point(9.5, -7, 10),
    sphere2_radius = 9,
    sphere2_color = new Color(0, 1, 0),
    sphere2_specularCoefficient = 50,
    sphere2_specularExponent = 25,
    sphere2_reflectivity = 1,
    sphere2 = new Sphere(sphere2_position, sphere2_radius, sphere2_color, sphere2_specularCoefficient, sphere2_specularExponent, sphere2_reflectivity, "sphere 2");

  var sphere3_position = new Point(0, 9, 10),
    sphere3_radius = 9,
    sphere3_color = new Color(0, 0, 1),
    sphere3_specularCoefficient = 50,
    sphere3_specularExponent = 25,
    sphere3_reflectivity = 1,
    sphere3 = new Sphere(sphere3_position, sphere3_radius, sphere3_color, sphere3_specularCoefficient, sphere3_specularExponent, sphere3_reflectivity, "sphere 3");

  // add objects
  scene_objects.push(sphere1);
  scene_objects.push(sphere2);
  scene_objects.push(sphere3);

  var resolution = 300;

  // create background;
  var background = new Background(new Color(55, 55, 55));

  // create view plane
  var viewPlane = new ViewPlane(1, 1);

  // create canvas
  var canvas = document.getElementById("mycanvas");
  var context = canvas.getContext("2d");

  var width = parseInt(canvas.getAttribute("width"));
  var height = parseInt(canvas.getAttribute("height"));
  var imageData = context.createImageData(width, height);

  function traceRays() {
    var dir,
      pixelColor,
      ray,
      reflectionDepthCurrent,
      start,
      x,
      y;

    // create ray
    start = new Point(0, 0, -30);
    dir = new Vector(0, 0, 1);
    ray = new Ray(start, dir);

    y = viewPlane.height * .5;
    for (var j = 0; j <= resolution; j++) {
      x = -(viewPlane.width) * .5;
      y -= (viewPlane.height / resolution);
      for (var i = 0; i <= resolution; i++) {
        reflectionDepthCurrent = 1;
        x += (viewPlane.width / resolution);
        ray.dir.x = x;
        ray.dir.y = y;
        pixelColor = getPixelColor(ray, scene_objects, reflectionDepthCurrent, i, j);
        setPixel(imageData, i, j, pixelColor.r, pixelColor.g, pixelColor.b, 0xff);
      }
    }
    context.putImageData(imageData, 0, 0);
  }

  traceRays();

})();
