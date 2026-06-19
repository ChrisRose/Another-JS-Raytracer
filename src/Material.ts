import { Color } from "./Color.js";
import { Point } from "./Point.js";
import { Vector } from "./Vector.js";

export class Material {
  albedo: Color;
  specular?: number;
  reflectivity?: number;
  refractionIndex?: number;
  glossiness?: number;
  texture?: (point: Point, normal: Vector) => Color;
  emissive?: Color;
  imageMap?: string;
  imageMapUV?: (point: Point) => [number, number];
  metallic?: number;    // 1 = fully metallic (F0 = albedo, no diffuse)
  roughness?: number;   // GGX α² parameter; 0 = mirror, 1 = fully rough
  subsurface?: number;  // 0–1 fraction of body bounces that scatter through (jade, wax, skin)

  constructor({
    albedo = new Color(0, 0, 0),
    specular = 0,
    reflectivity = 0,
    refractionIndex = 0,
    glossiness = 0,
    texture,
    emissive,
    imageMap,
    imageMapUV,
    metallic,
    roughness,
    subsurface,
  }: {
    albedo: Color;
    specular?: number;
    reflectivity?: number;
    refractionIndex?: number;
    glossiness?: number;
    texture?: (point: Point, normal: Vector) => Color;
    emissive?: Color;
    imageMap?: string;
    imageMapUV?: (point: Point) => [number, number];
    metallic?: number;
    roughness?: number;
    subsurface?: number;
  }) {
    this.albedo = albedo;
    this.specular = specular;
    this.reflectivity = reflectivity;
    this.refractionIndex = refractionIndex;
    this.glossiness = glossiness;
    this.texture = texture;
    this.emissive = emissive;
    this.imageMap = imageMap;
    this.imageMapUV = imageMapUV;
    this.metallic = metallic;
    this.roughness = roughness;
    this.subsurface = subsurface;
  }
}
