import { Color } from "./Color.js";
import { Point } from "./Point.js";
import { Intersected } from "./types.js";

export class Material {
  albedo: Color;
  specular?: number;
  reflectivity?: number;
  refractionIndex?: number;
  glossiness?: number;
  texture?: (intersected: Intersected) => Color;
  emissive?: Color;
  imageMap?: string;

  constructor({
    albedo = new Color(0, 0, 0),
    specular = 0,
    reflectivity = 0,
    refractionIndex = 0,
    glossiness = 0,
    texture,
    emissive,
    imageMap
  }: {
    albedo: Color;
    specular?: number;
    reflectivity?: number;
    refractionIndex?: number;
    glossiness?: number;
    texture?: (intersected: Intersected) => Color;
    emissive?: Color;
    imageMap?: string;
  }) {
    this.albedo = albedo;
    this.specular = specular;
    this.reflectivity = reflectivity;
    this.refractionIndex = refractionIndex;
    this.glossiness = glossiness;
    this.texture = texture;
    this.emissive = emissive;
    this.imageMap = imageMap;
  }
}
