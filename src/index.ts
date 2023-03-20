import { Color } from "./Color.js";

function setPixel({
  imageData,
  x,
  y,
  color,
  a,
  width
}: {
  imageData: ImageData;
  x: number;
  y: number;
  color: Color;
  a: number;
  width: number;
}) {
  var index;
  index = x * width * 4 + y * 4;
  imageData.data[index + 0] = color.r * 255;
  imageData.data[index + 1] = color.g * 255;
  imageData.data[index + 2] = color.b * 255;
  imageData.data[index + 3] = a;
}

let imageMaps: { [key: string]: ImageData } = {};
const loadImage = (src: string): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    let imageMap: ImageData;
    let image = new Image();
    image.src = src;

    image.onload = () => {
      let canvas = document.getElementById("imageCanvas") as HTMLCanvasElement;

      if (!canvas) {
        return reject("No canvas");
      }

      let context = canvas.getContext("2d", { willReadFrequently: true });

      if (context) {
        context.drawImage(image, 0, 0);
        imageMap = context.getImageData(0, 0, image.width, image.height);
      }

      resolve(imageMap);
    };
  });
};

const earth = await loadImage("/src/assets/earth.jpg");
const sf = await loadImage("/src/assets/sf.jpg");

imageMaps.earth = earth;
imageMaps.sf = sf;

traceRays(imageMaps);

function traceRays(imageMaps: { [key: string]: ImageData }) {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas?.getContext("2d");
  const width = 400;
  const height = 400;
  const squares = 8;
  const imageData = context?.createImageData(width, height) as ImageData;
  let workerCount = 0;
  let times: { [workerIndex: string]: number } = {};
  for (let i = 0; i <= squares - 1; i++) {
    const iStart = (i * width) / squares;
    const iEnd = ((i + 1) * width) / squares;
    for (let j = 0; j <= 7; j++) {
      const jStart = (j * height) / squares;
      const jEnd = ((j + 1) * height) / squares;
      const worker = new Worker(new URL("./tracePaths.ts", import.meta.url), {
        type: "module"
      });
      const time = performance.now();
      const workerIndex = `${i}${j}`;
      times[workerIndex] = time;
      worker.postMessage({
        iStart,
        iEnd,
        jStart,
        jEnd,
        width,
        imageMaps
      });
      worker.onmessage = (e) => {
        const time2 = performance.now();

        times[workerIndex] = (time2 - times[workerIndex]) / 1000;

        console.log(`worker ${workerIndex} took ${times[workerIndex]}s`);

        if (workerCount === 64) {
          console.log(times[workerIndex]);
        }
        const { pixelColors } = e.data;

        for (let k = 0; k < pixelColors.length; k++) {
          const pixelColor = pixelColors[k];
          setPixel({
            imageData,
            x: pixelColor.i,
            y: pixelColor.j,
            width: width,
            color: pixelColor.pixelColor,
            a: 0xff
          });
        }

        context?.putImageData(imageData, 0, 0);
      };
    }
  }
}
