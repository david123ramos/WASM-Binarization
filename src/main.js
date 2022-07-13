//import wasmModule from './binarization.js';
import classify from './rn.js';
import Logger from "./Logger.js";

window.numbers = [];

window.onerror = function (e, src, line, col, error) {
    Logger.log("POMPIA", `ERROR: ${error.name} at line ${line}`);
}
var StartTime = 0;
var FinalTime = 0;
var Sum = 0;



const img = new Image();

var folder = 1;
var folder_limit = 7;
var limit_img = 2019;
var counter = 1;
const values = [];

var interval = setInterval(function () {

    img.src = `http://localhost:8082/${folder}/synthetic_mnist_${counter}.png`

   ++counter;
   console.log(Sum);


   if(counter > limit_img) {
       counter = 0;
       ++folder;
   }

   if(folder > folder_limit){
       clearInterval(interval);

       const totalImageCount = limit_img * folder_limit;
       const Mean = Sum / totalImageCount;


       const Variance = values.map(x => Math.pow(x - Mean, 2)).reduce((a, b) => a + b) / totalImageCount ;

       const Std = Math.sqrt(Variance);

       console.warn( `MEAN: ${Mean}` );
       console.warn( `Variance: ${Variance}` );
       console.warn( `Standard Deviation: ${Std}` );
       
   }

}, 1500);


img.crossOrigin = "Anonymous"
document.querySelector("#imagefile").addEventListener("change", e => {

    const imgFile = e.target.files[0];

    if (FileReader) {
        const fileReader = new FileReader();
        fileReader.onload = function () {
            img.src = fileReader.result;
        }
        fileReader.readAsDataURL(imgFile);

    } else {
        alert("Failed to load File API");
    }

});


const cv = document.querySelector("#mainCV");

const globalContext = cv.getContext("2d");
globalContext.fillStyle = "#fff"
globalContext.fillRect(0, 0, cv.width, cv.height);

img.onload = function () {
    globalContext.drawImage(this, 0, 0, 500, 500);

    const imageData = globalContext.getImageData(0, 0, cv.width, cv.height);

    const needsBlur = document.querySelector("#blur_checkbox").checked;

    let dataGrayscale = null;
    StartTime = performance.now();
    if (needsBlur) {
        const blurredImage = boxBlur(imageData.data);
        writeInCanvas(blurredImage).then(canvas => document.querySelector(".container").appendChild(canvas));
        dataGrayscale = grayscale(blurredImage);
    } else {
        dataGrayscale = grayscale(imageData.data);
    }

    const simplified = flattenFloatChanels([...dataGrayscale]);

    const threshold = otsusThresholding(simplified);
    const binarizatedVector = binarization(dataGrayscale, threshold)

    const finalResultImg = [];

    for (let i = 0; i < binarizatedVector.length; i++) {
        finalResultImg.push(binarizatedVector[i]);
    }


    const simplifiedImageBinarizated = flattenChanels(finalResultImg);

    const step = 500; // canvas width

    const verticalPlot = getVerticalPlot(simplifiedImageBinarizated);

    // for(let posY = 0; posY < simplifiedImageBinarizated.length; posY += step) {
    //     let sum = 0;
    //     for(let posX = posY; posX < posY + step; posX++) {
    //         sum += simplifiedImageBinarizated[posX] / 255;
    //     }
    //     verticalPlot.push(sum);
    // }


    const pointsAuxVertical = getPoints(verticalPlot);

    // let searchingFinal = false;
    // for(let i = 0; i < verticalPlot.length; i++) {

    //     if(verticalPlot[i]  > delta && !searchingFinal) {
    //         init = i;
    //         searchingFinal = true
    //     }

    //     if(verticalPlot[i] < delta && searchingFinal) {
    //         pointsAuxVertical.push({init, final: i});
    //         searchingFinal = false;
    //     }
    // }

    const horizontalPlot = getHorizontalPlot(simplifiedImageBinarizated);
    // for(let posX = 0; posX < step; posX++) {
    //     let sum2 = 0;
    //     for(let posY = posX; posY < simplifiedImageBinarizated.length; posY+= step) {
    //         sum2 += simplifiedImageBinarizated[posY] / 255;
    //     }
    //     horizontalPlot.push(sum2);
    // }


    const pointsAuxHorizontal = getPoints(horizontalPlot);

    // let initHorizontal = 0;
    // let searchingFinalHoriz = false;
    // for(let i = 0; i < horizontalPlot.length; i++) {

    //     if(horizontalPlot[i]  > delta && !searchingFinalHoriz) {
    //         initHorizontal = i;
    //         searchingFinalHoriz = true
    //     }

    //     if(horizontalPlot[i] < delta && searchingFinalHoriz) {
    //         pointsAuxHorizontal.push({initHorizontal, final: i});
    //         searchingFinalHoriz = false;
    //     }
    // }


    if (document.querySelector("#histogram_checkbox").checked) {
        document.querySelector(".container").appendChild(generateVerticalHistogram(verticalPlot, step, step));
        document.querySelector(".container").appendChild(generateHorizontalHistogram(horizontalPlot, step, step));
    }

    writeInCanvas(finalResultImg).then(canvas => {
        //document.querySelector(".container").appendChild(canvas); &&

        const ctx = canvas.getContext("2d");
        ctx.strokeStyle = "#03fc30" // light green
        ctx.fillStyle = "green";
        ctx.font = "20px Arial";
        let x = 0;
        let y = 0;
        let width = 0;
        let height = 0;

        if (pointsAuxHorizontal.length > pointsAuxVertical.length) {

            let curr = 0;
            for (let i = 0; i < pointsAuxHorizontal.length; i++) {

                var verticalPoint = pointsAuxVertical[curr];

                x = pointsAuxHorizontal[i].init;
                y = verticalPoint.init;
                width = pointsAuxHorizontal[i].final - pointsAuxHorizontal[i].init;
                height = verticalPoint.final - verticalPoint.init

                if (width >= 10 && height >= 10) {
                    const number = {
                        x, y, width, height
                    };
                    numbers.push(number);

                }

                if ((pointsAuxVertical.length - 1) > curr) curr++;
            }

        } else {

            let curr = 0;
            for (let i = 0; i < pointsAuxVertical.length; i++) {

                var horizontalPoint = pointsAuxHorizontal[curr];

                x = horizontalPoint.init;
                y = pointsAuxVertical[i].init;
                width = horizontalPoint.final - horizontalPoint.init;
                height = pointsAuxVertical[i].final - pointsAuxVertical[i].init


                if (width >= 10 && height >= 10) {
                    const number = {
                        x, y, width, height
                    };
                    numbers.push(number);
                }

                if ((pointsAuxHorizontal.length - 1) > curr) curr++;
            }

        }

        numbers.forEach((number, index) => {
            const cv2 = document.createElement("canvas");
            cv2.classList.add("cv");
            cv2.width = number.width;
            cv2.height = number.height;

            const pd = 20;
            const imdt = ctx.getImageData(number.x - pd, number.y - pd, number.width + (2 * pd), number.height + (2 * pd));


            const newSize = 28;
            const rz = resized(imdt.data, imdt.width, imdt.height, newSize, newSize);

            writeInCanvas2(rz, 28, 28).then(canvas => {

                const div = document.createElement("span");
                div.id = `tooltip-${index}`;
                //canvas.appendChild(div); &&

                //const container = document.createElement("div");
                //container.appendChild(div); &&
                //container.appendChild(canvas); &&

                //document.body.querySelector(".container").appendChild(container); &&

                //var aa = new $wasm.RealVector();

                const vv = canvas.getContext("2d");

                const vvimg = rotateImage(vv).data;

                var aa = normalizeImage(vvimg);
                // for(let i =0; i < vvimg.length; i+= 4) {

                //     var pr = vvimg[i] == 0 ? 0 : 1;
                //     var pg = vvimg[i + 1] == 0 ? 0 : 1;
                //     var pb = vvimg[i + 2] == 0 ? 0 : 1;

                //     var brightness = (pr + pg + pb) / 3; 

                //     brightness = (brightness -.5) / 0.5;
                //     aa.push_back(brightness);
                // }

                aa = reflect(aa);

                /**
                 * this piece of code is used to draw pixel values on a table.
                 */
                if (document.querySelector("#show-debug-table").checked) {
                    var v = [...aa];

                    var row = document.createElement("tr");
                    for (let a = 0; a < v.length; a++) {
                        const square = document.createElement("td");

                        var c1 = v[a] > 0 ? "bg-dark" : "bg-light";
                        var c2 = v[a] > 0 ? "text-light" : "text-dark";
                        square.classList.add("square", c1, c2);
                        square.innerText = v[a];

                        row.appendChild(square);

                        if (a > 0 && a % 28 == 0) {
                            document.querySelector("#neural-data-visualization").appendChild(row);
                            row = document.createElement("tr");
                        }
                    }
                }

                const num = classify(aa);

                console.log(`Result: ${num}`);

                // const tooltip = document.querySelector(`#tooltip-${index}`);
                //tooltip.innerHTML = `I think this is a <strong>${num}</strong>! 🙂`;
                //tooltip.classList.add("text-dark", "badge", "bg-warning");

            });

            ctx.strokeRect(number.x, number.y, number.width, number.height);
        });

        FinalTime = performance.now();
        var calctime = FinalTime - StartTime;

        values.push(calctime);
        Sum += calctime

        console.log("ALL PROCESS", `ALL Process took ${calctime} mils`);
        window.numbers = [];

    });

};


function rotateImage(ctx) {
    const size = 28;
    // the rotation origin    
    const ox = 14;
    const oy = 14;
    // the rotation amount
    const rot = Math.PI / 2; // 90 deg
    // the rotated x axis
    const ax = Math.cos(rot);
    const ay = Math.sin(rot);
    // get the source pixel data
    const imageData = ctx.getImageData(0, 0, size, size);
    const d32 = new Uint32Array(imageData.data.buffer);
    // create a destination pixel array
    const rotImageData = new Uint32Array(imageData.data.length / 4);
    // scan each pixel and row adding pixels to rotImageData from the transformed
    // x,y coordinate.
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const ind = (x + y * size);
            // transform the current pixel to the rotated pixel
            const rx = (x - ox) * ax - (y - oy) * ay + ox;
            const ry = (x - ox) * ay + (y - oy) * ax + oy;
            // use nearest pixel lookup and get index of original image
            const ind1 = ((rx | 0) + (ry | 0) * size);
            rotImageData[ind] = d32[ind1];
        }
    }
    d32.set(rotImageData);
    return imageData;
}


function generateVerticalHistogram(arr, width, height) {
    const cv = document.createElement("canvas");
    cv.classList.add("cv");
    cv.width = width;
    cv.height = height;
    cv.style.marginRight = "5px";
    const ctx = cv.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white"
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("vertical", 15, 20);

    for (let i = 0; i < arr.length; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(arr[i], i);
        ctx.stroke();
    }
    return cv
}

function generateHorizontalHistogram(arr, width, height) {
    const cv = document.createElement("canvas");
    cv.classList.add("cv");
    cv.width = width;
    cv.height = height;
    cv.style.marginLeft = "5px";

    const ctx = cv.getContext("2d");

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "white"
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("horizontal", 15, 20);

    for (let i = 0; i < arr.length; i++) {
        ctx.beginPath();
        ctx.moveTo(i, height);
        ctx.lineTo(i, height - arr[i]);
        ctx.stroke();
    }
    return cv
}

function writeInCanvas(data) {

    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        canvas.classList.add("cv");

        var context = canvas.getContext("2d");
        var imageData = context.createImageData(500, 500);
        imageData.data.set(data);
        context.putImageData(imageData, 0, 0);
        resolve(canvas);
    });
}
function writeInCanvas2(data, w, h) {

    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.classList.add("cv");

        var context = canvas.getContext("2d");
        var imageData = context.createImageData(w, h);
        imageData.data.set(data);
        context.putImageData(imageData, 0, 0);
        resolve(canvas);
    });
}

function boxBlur(pixels) {

    const vector = new $wasm.vector();
    pixels.forEach(val => vector.push_back(val));

    const t1 = performance.now();
    const response = $wasm.boxBlur(vector, vector.size(), 500);
    const t2 = performance.now();
    Logger.log("WEBASSEMBLY", `Box Blur algorithm took ${t2 - t1} mils `);

    return response;
}

function flattenChanels(pixels) {

    const r = [];

    for (let i = 0; i < pixels.length; i += 4) {
        r.push(pixels[i]);
    }
    return r;
}

function getVerticalPlot(pixels) {

    const step = 500; //canvas size

    const vertical_plot = [];
    var sum = 0;

    for (let posY = 0; posY < pixels.length; posY += step) {
        sum = 0;
        for (let posX = posY; posX < posY + step; posX++) {
            sum += (pixels[posX] / 255);
        }
        vertical_plot.push(sum);
    }
    return vertical_plot;

}

function getHorizontalPlot(pixels) {

    const step = 500; //canvas size
    const horizontal_plot = [];
    let sum = 0;
    for (let posX = 0; posX < step; posX++) {
        sum = 0;
        for (let posY = posX; posY < pixels.length; posY += step) {
            sum += (pixels[posY] / 255);
        }
        horizontal_plot.push(sum);
    }

    return horizontal_plot;
}

function getPoints(plot) {

    let init = 0;
    let searchingFinal = false;
    let curr = 0;
    let delta = 2; //precision

    const points = [];



    for (let i = 0; i < plot.length; i++) {

        curr = plot[i];

        if (curr > delta && !searchingFinal) {
            init = i;
            searchingFinal = true;
        }

        if (curr < delta && searchingFinal) {

            searchingFinal = false;
            points.push({ init, final: i });
        }
    }
    return points;
}

function flattenFloatChanels(pixels) {

    const r = [];

    for (let i = 0; i < pixels.length; i += 4) {
        r.push(pixels[i]);
    }

    //       Logger.log("WEBASSEMBLY", `Flatten RGBA (with Double values) [auxiliary function] took: ${t2 - t1} mils`);

    return new Float32Array(r);
}

function resized(img, w, h, w2, h2) {

    const dstPixels = new Array();

    for (let y = 0; y < h2; y++) {
        for (let x = 0; x < w2; x++) {

            let srcX = Math.floor((x * w) / w2);
            let srcY = Math.floor((y * h) / h2);

            let srcPos = ((srcY * w) + srcX) * 4;

            dstPixels.push(img[srcPos++]);
            dstPixels.push(img[srcPos++]);
            dstPixels.push(img[srcPos++]);
            dstPixels.push(img[srcPos++]);
        }
    }

    return new Float32Array(dstPixels);
}

function grayscale(img) {

    const response = new Float32Array(img);

    for (let i = 0; i < img.length; i += 4) {

        let brightness = (0.2125 * img[i]) + (0.7154 * img[i + 1]) + (0.0721 * img[i + 2]);

        response[i] = brightness / 255.0;
        response[i + 1] = brightness / 255.0;
        response[i + 2] = brightness / 255.0;
    }

    return response;
}


function otsusThresholding(img) {

    var n_bins = 0.1;

    var total_weight = img.length;

    var least_variance = -1;
    var least_variance_threshold = -1;


    var min = 0;
    var max = 0;
    for (let i = 0; i < img.length; i++) {
        if (img[i] < min) {
            min = img[i];
        }

        if (img[i] > max) {
            max = img[i];
        }
    }


    var min_element = min + n_bins;
    var max_element = max - n_bins;

    var color_thresholds = [];

    for (let i = min_element; i <= max_element; i += n_bins) {
        color_thresholds.push(i);
    }

    for (const color_threshold of color_thresholds) {

        var bg_pixels = [];
        var fr_pixels = [];

        bg_pixels = img.filter((number) => { return number < color_threshold });

        var weight_bg = bg_pixels.length / total_weight;

        //calculate mean of background pixels
        var mean_bg = 0;
        for (const bg_pixel of bg_pixels) {
            mean_bg += bg_pixel;
        }
        mean_bg = mean_bg / bg_pixels.length;

        //calculate variance of backdround pixels
        var variance_bg = 0;
        for (const bg_pixel of bg_pixels) {
            variance_bg += Math.pow(bg_pixel - mean_bg, 2)
        }

        variance_bg += variance_bg / bg_pixels.length;

        fr_pixels = img.filter((number) => { return number >= color_threshold });
        var weight_fr = fr_pixels.length / total_weight;

        //calculate mean of foreground pixels
        var mean_fr = 0;

        for (const fr_pixel of fr_pixels) {
            mean_fr += fr_pixel;
        }
        mean_fr = mean_fr / fr_pixels.length;

        //calculate variance of foreground pixels
        var variance_fr = 0;
        for (const fr_pixel of fr_pixels) {
            variance_fr += Math.pow(fr_pixel - mean_fr, 2);
        }
        variance_fr += variance_fr / bg_pixels.length;

        var class_variance = (weight_fr * variance_fr) + (weight_bg * variance_bg);

        if (least_variance == -1 || least_variance > class_variance) {
            least_variance = class_variance;
            least_variance_threshold = color_threshold;
        }
    }

    return least_variance_threshold;

}

function binarization(img, threshold) {

    const response = new Float32Array(img);
    for (let i = 0; i < img.length; i += 4) {

        if (img[i] < threshold) {

            response[i] = 255;
            response[i + 1] = 255;
            response[i + 2] = 255;
        } else {

            response[i] = 0;
            response[i + 1] = 0;
            response[i + 2] = 0;
        }
    }

    return response;
}



function reflect(img) {

    const image_size = 28;

    for (let i = 0; i < (image_size / 2); i++) {
        for (let j = 0; j < image_size; j++) {
            let index = (i * image_size) + j;
            let mirrorIndex = ((image_size - 1) - i) * image_size + j;
            let temp = img[index];
            img[index] = img[mirrorIndex];
            img[mirrorIndex] = temp;
        }
    }
    return img;
}

function normalizeImage(img) {


    const dstPixels = new Array();

    for (let i = 0; i < img.length; i += 4) {
        let pr = img[i] == 0 ? 0 : 1;
        let pg = img[i + 1] == 0 ? 0 : 1;
        let pb = img[i + 2] == 0 ? 0 : 1;

        let brightness = (pr + pg + pb) / 3;
        brightness = (brightness - .5) / 0.5;
        dstPixels.push(brightness);

    }

    return dstPixels;
}
