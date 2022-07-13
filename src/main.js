import wasmModule from './binarization.js';
import Logger from "./Logger.js";

window.numbers = [];

window.onerror = function (e, src, line, col, error) {
    Logger.log("POMPIA", `ERROR: ${error.name} at line ${line}`);
}
var StartTime = 0;
var FinalTime = 0;
var Sum = 0;


wasmModule().then(($wasm) => {
    console.log(`It works! Version ${$wasm.version()}`);
    console.log($wasm);

    //bind _malloc to remeber to use free
    (function () {
        var oldmalloc = $wasm._malloc;
        $wasm._malloc = function (size) {
            console.trace("WARNING - Malloc use require 'free' function use too. Don't forget");
            return oldmalloc(size);
        }
    })();


    const img = new Image();


    var folder = 1;
    var folder_limit = 7;
    var limit_img = 2019;
    var counter = 1;
    const intervalValues = [];
    
    var interval = setInterval(function () {
    
        img.src = `http://localhost:8081/${folder}/synthetic_mnist_${counter}.png`
    
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
    
    
           const Variance = intervalValues.map(x => Math.pow(x - Mean, 2)).reduce((a, b) => a + b) / totalImageCount ;
    
           const Std = Math.sqrt(Variance);
    
           console.warn( `MEAN: ${Mean}` );
           console.warn( `Variance: ${Variance}` );
           console.warn( `Standard Deviation: ${Std}` );
           
       }
    
    }, 600);
    

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

        //let dataGrayscale = null;
        StartTime = performance.now();
        if (needsBlur) {
            const blurredImage = boxBlur(imageData.data);
            writeInCanvas(blurredImage).then(canvas => document.querySelector(".container").appendChild(canvas));
            dataGrayscale = grayscaleWASM(blurredImage);
        } else {

            console.log(`executando o código`);
            var arrNum = aaaa(imageData.data);
            //console.log(arrNum );

            arrNum.forEach(num => numbers.push(num));
            //dataGrayscale = grayscaleWASM(imageData.data);
        }

        //const simplified = flattenFloatChanels([...dataGrayscale.grayscaleImage]);

        //const dataOtsu = otsusThresholdingWASM(simplified);
        const binarizatedVector = $wasm.getBinarizatedImage();
        //binarizationWASM(imageData.data, dataGrayscale.grayscalePointer, dataOtsu.threshold, this.src)

        const finalResultImg = [];

        for (let i = 0; i < binarizatedVector.size(); i++) {
            finalResultImg.push(binarizatedVector.get(i));
        }
        binarizatedVector.delete();


        //const simplifiedImageBinarizated = flattenChanels(finalResultImg);

        //const step = 500; // canvas width


        //const verticalPlot = getVerticalPlot(simplifiedImageBinarizated);

        // for(let posY = 0; posY < simplifiedImageBinarizated.length; posY += step) {
        //     let sum = 0;
        //     for(let posX = posY; posX < posY + step; posX++) {
        //         sum += simplifiedImageBinarizated[posX] / 255;
        //     }
        //     verticalPlot.push(sum);
        // }


        //const pointsAuxVertical = getPoints(verticalPlot);

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

        //const horizontalPlot = getHorizontalPlot(simplifiedImageBinarizated);
        // for(let posX = 0; posX < step; posX++) {
        //     let sum2 = 0;
        //     for(let posY = posX; posY < simplifiedImageBinarizated.length; posY+= step) {
        //         sum2 += simplifiedImageBinarizated[posY] / 255;
        //     }
        //     horizontalPlot.push(sum2);
        // }



        //const pointsAuxHorizontal = getPoints(horizontalPlot);

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




        // if (document.querySelector("#histogram_checkbox").checked) {
        //     document.querySelector(".container").appendChild(generateVerticalHistogram(verticalPlot, step, step));
        //     document.querySelector(".container").appendChild(generateHorizontalHistogram(horizontalPlot, step, step));
        // }

        writeInCanvas(finalResultImg).then(canvas => {
            //document.querySelector(".container").appendChild(canvas); 

            const ctx = canvas.getContext("2d");
            //ctx.strokeStyle = "#03fc30" // light green
            //ctx.fillStyle = "green";
            //ctx.font = "20px Arial";
            // let x = 0;
            // let y = 0;
            // let width = 0;
            // let height = 0;

            // if (pointsAuxHorizontal.length > pointsAuxVertical.length) {

            //     let curr = 0;
            //     for (let i = 0; i < pointsAuxHorizontal.length; i++) {

            //         var verticalPoint = pointsAuxVertical[curr];

            //         x = pointsAuxHorizontal[i].init;
            //         y = verticalPoint.init;
            //         width = pointsAuxHorizontal[i].final - pointsAuxHorizontal[i].init;
            //         height = verticalPoint.final - verticalPoint.init

            //         if (width >= 10 && height >= 10) {
            //             const number = {
            //                 x, y, width, height
            //             };
            //             //numbers.push(number);

            //         }

            //         if ((pointsAuxVertical.length - 1) > curr) curr++;
            //     }

            // } else {

            //     let curr = 0;
            //     for (let i = 0; i < pointsAuxVertical.length; i++) {

            //         var horizontalPoint = pointsAuxHorizontal[curr];

            //         x = horizontalPoint.init;
            //         y = pointsAuxVertical[i].init;
            //         width = horizontalPoint.final - horizontalPoint.init;
            //         height = pointsAuxVertical[i].final - pointsAuxVertical[i].init


            //         if (width >= 10 && height >= 10) {
            //             const number = {
            //                 x, y, width, height
            //             };
            //             //numbers.push(number);
            //         }

            //         if ((pointsAuxHorizontal.length - 1) > curr) curr++;
            //     }

            // }

            // FinalTime = performance.now();
            // var calctime = FinalTime - StartTime;
            // console.warn(`JS numbers took: ${calctime} mils`)

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

                    aa = reflect(aa);

                    /**
                     * this piece of code is used to draw pixel values on a table.
                     */
                    // if (document.querySelector("#show-debug-table").checked) {
                    //     var v = []
                    //     for (let i = 0; i < aa.size(); i++) {
                    //         v.push(aa.get(i));
                    //     }


                    //     var row = document.createElement("tr");
                    //     for (let a = 0; a < v.length; a++) {
                    //         const square = document.createElement("td");

                    //         var c1 = v[a] > 0 ? "bg-dark" : "bg-light";
                    //         var c2 = v[a] > 0 ? "text-light" : "text-dark";
                    //         square.classList.add("square", c1, c2);
                    //         square.innerText = v[a];

                    //         row.appendChild(square);

                    //         if (a > 0 && a % 28 == 0) {
                    //             document.querySelector("#neural-data-visualization").appendChild(row);
                    //             row = document.createElement("tr");
                    //         }
                    //     }
                    // }

                    classify(aa);

                    aa.delete();
                    //console.log(`Result: ${num}`);
                   
                   // const tooltip = document.querySelector(`#tooltip-${index}`);
                    //tooltip.innerHTML = `I think this is a <strong>${num}</strong>! 🙂`;
                    //tooltip.classList.add("text-dark", "badge", "bg-warning");

                });

                //ctx.strokeRect(number.x, number.y, number.width, number.height);
            });

            FinalTime = performance.now();
            var calctime = FinalTime - StartTime;

            Sum += calctime
            intervalValues.push(calctime);
            console.log(`ALL Process took ${calctime} mils`);
            window.numbers = [];
        });

        //dataGrayscale.free();
        //dataOtsu.free();
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

        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.flatRGBA(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `Flatten RGBA (auxiliary function) took: ${t2 - t1} mils`);

        const r = [];

        for (let i = 0; i < response.size(); i++) {
            r.push(response.get(i));
        }
        vector.delete();
        response.delete();
        return r;
    }

    function getVerticalPlot(pixels) {
        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getVerticalPlot(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get vertical plot took: ${t2 - t1} mils`);
        vector.delete();
        return [...response];
    }

    function getHorizontalPlot(pixels) {
        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getHorizontalPlot(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get horizontal plot took: ${t2 - t1} mils`);
        vector.delete();
        return [...response];
    }

    function getPoints(pixels) {
        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getPoints(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get points took: ${t2 - t1} mils`);

        const r = [];

        for (let i = 0; i < response.size(); i++) {
            r.push(response.get(i));
        }
        vector.delete();
        response.delete();
        return r;
    }

    function flattenFloatChanels(pixels) {

        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.flatRGBAFromImageWithPixelRealValues(vector);
        const t2 = performance.now();

        const r = [];

        for (let i = 0; i < response.size(); i++) {
            r.push(response.get(i));
        }
        vector.delete();
        response.delete();

        Logger.log("WEBASSEMBLY", `Flatten RGBA (with Double values) [auxiliary function] took: ${t2 - t1} mils`);

        return new Float32Array(r);
    }


    function aaaa(pixels) {

        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));

        const response = $wasm.aaaa(vector);

        const r = [];
        for(let i=0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        vector.delete();
        response.delete();
        return r;
    }

    function resized(pixels, w, h, w2, h2) {

        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.nearestNeighboor(vector, w, h, w2, h2);
        const t2 = performance.now();

        const r = [];

        for (let i = 0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        Logger.log("WEBASSEMBLY", `Nearest neighboor took: ${t2 - t1} mils`);
        vector.delete();
        response.delete();

        return new Float32Array(r);
    }

    function grayscaleWASM(pixels) {

        const floatArr = new Float32Array(pixels);
        const heapPointer = $wasm._malloc(floatArr.length * floatArr.BYTES_PER_ELEMENT);
        $wasm.HEAPF32.set(floatArr, heapPointer >> 2);

        const performanceGrayscalet0 = performance.now();
        $wasm.grayscale2(heapPointer, floatArr.length);
        const performanceGrayscaletf = performance.now();
        Logger.log("WEBASSEMBLY", `Grayscale algorithm took ${performanceGrayscaletf - performanceGrayscalet0} mils`)

        return {
            originalImage: floatArr,
            grayscaleImage: $wasm.HEAPF32.subarray((heapPointer >> 2), (heapPointer >> 2) + floatArr.length),
            grayscalePointer: heapPointer,
            free: function () {
                $wasm._free(heapPointer);
            }
        };

    }


    function otsusThresholdingWASM(simplifiedImage) {

        const pointerSimplifiedImageFloat = $wasm._malloc(simplifiedImage.length * simplifiedImage.BYTES_PER_ELEMENT);
        $wasm.HEAPF32.set(simplifiedImage, pointerSimplifiedImageFloat >> 2);

        const performanceOtsusAlgorithmt0 = performance.now();
        const otsusThresholdFloat = $wasm.otsusThreasholdValueFloat(pointerSimplifiedImageFloat, simplifiedImage.length);
        const performanceOtsusAlgorithmtf = performance.now();
        Logger.log("WEBASSEMBLY", `Otsu's thresholding algorithm took ${performanceOtsusAlgorithmtf - performanceOtsusAlgorithmt0} mils and returned ${otsusThresholdFloat} as value`)

        return {
            threshold: otsusThresholdFloat,
            free: function () {
                $wasm._free(pointerSimplifiedImageFloat);
            }
        };
    }

    function binarizationWASM(originalImage, grayscaleImagePointer, threshold) {
        const performanceBinarizationt0 = performance.now();
        const result = $wasm.binarizationFloat(grayscaleImagePointer, threshold, originalImage.length);
        const performanceBinarizationtf = performance.now();
        Logger.log("WEBASSEMBLY", `Image binarization took ${performanceBinarizationtf - performanceBinarizationt0} mils `)
        return result;
    }

    function classify(vector) {

        const t11 = performance.now();
        const num = $wasm.classify(vector);
        const t12 = performance.now();
        Logger.log("WEBASSEMBLY", `Neural Net has classfied image in: ${t12 - t11} mils`);
        return num;
    }

    function reflect(vector) {

        const t11 = performance.now();
        const response = $wasm.reflect(vector);
        const t12 = performance.now();
        Logger.log("WEBASSEMBLY", `Image reflection algorithm took: ${t12 - t11} mils`);
        return response;
    }

    function normalizeImage(arr) {
        const vector = new $wasm.vector();
        arr.forEach(val => vector.push_back(val));
        const t11 = performance.now();
        const response = $wasm.normalizeGrayscalePoints(vector);
        const t12 = performance.now();
        Logger.log("WEBASSEMBLY", `Image standartization took: ${t12 - t11} mils`);
        vector.delete();
        return response;
    }
});