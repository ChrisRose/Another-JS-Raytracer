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
  imageData.data[index + 0] = color.r;
  imageData.data[index + 1] = color.g;
  imageData.data[index + 2] = color.b;
  imageData.data[index + 3] = a;
}

// load image
let imageMap: ImageData;
const image = new Image();
image.src = "/assets/sf.jpg";
image.onload = () => {
  const canvas = document.getElementById("imageCanvas") as HTMLCanvasElement;
  if (!canvas) {
    return;
  }
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (context) {
    context.drawImage(image, 0, 0);
    imageMap = context.getImageData(0, 0, image.width, image.height);
  }
  const t0 = performance.now();
  traceRays();
  const t1 = performance.now();
  console.log("Call to traceRays took " + (t1 - t0) + " milliseconds.");
};

function traceRays() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas?.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const imageData = context?.createImageData(width, height) as ImageData;
  for (let i = 0; i <= 7; i++) {
    const iStart = (i * width) / 8;
    const iEnd = ((i + 1) * width) / 8;
    for (let i = 0; i <= 7; i++) {
      const jStart = (i * height) / 8;
      const jEnd = ((i + 1) * height) / 8;
      const worker = new Worker("tracePaths.js", { type: "module" });
      worker.postMessage({
        iStart,
        iEnd,
        jStart,
        jEnd,
        width,
        imageMap
      });
      worker.onmessage = (e) => {
        const { pixelColors } = e.data;
        pixelColors?.forEach(
          ({
            i,
            j,
            pixelColor
          }: {
            i: number;
            j: number;
            pixelColor: Color;
          }) => {
            setPixel({
              imageData,
              x: i,
              y: j,
              width: width,
              color: pixelColor,
              a: 0xff
            });
          }
        );
        context?.putImageData(imageData, 0, 0);
      };
    }
  }
}
