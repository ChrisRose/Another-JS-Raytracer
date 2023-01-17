import { Color } from "./Color.js";

export class Material {
  albedo?: Color;
  specular?: number;
  reflectivity?: number;
  refractionIndex?: number;
  glossiness?: number;
  texture?: (x: number, y: number) => Color | undefined;

  constructor({
    albedo = new Color(0, 0, 0),
    specular = 0,
    reflectivity = 0,
    refractionIndex = 0,
    glossiness = 0,
    texture
  }: {
    albedo?: Color;
    specular?: number;
    reflectivity?: number;
    refractionIndex?: number;
    glossiness?: number;
    texture?: (x: number, y: number) => Color | undefined;
  }) {
    this.albedo = albedo;
    this.specular = specular;
    this.reflectivity = reflectivity;
    this.refractionIndex = refractionIndex;
    this.glossiness = glossiness;
    this.texture = texture;
  }
}
