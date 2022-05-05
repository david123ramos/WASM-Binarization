import wasmModule from './binarization.js';
import Logger from "./Logger.js";


window.onerror = function(e, src, line, col, error) {
    Logger.log("POMPIA", `ERROR: ${error.name} at line ${line}`);
}

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
    document.querySelector("#imagefile").addEventListener("change", e => {

        const imgFile = e.target.files[0];

        if (FileReader) {
            const fileReader = new FileReader();
            fileReader.onload = function () {
                img.src = fileReader.result;
            }
            fileReader.readAsDataURL(imgFile);

        }else {
            alert("Failed to load File API");
        }
        
    });
    
    
    //img.src = "./assets/a.jpeg"; //sign
    //img.src = "./assets/manynumbers (1).jpeg"
    //img.src = "./assets/bad5.jpeg" //light correction
    //img.src = "./assets/6.png";
    //img.src = "./assets/8.png";
    //img.src = "./assets/img2g.jpg";
    //img.src = "./assets/img2.jpg";

    const cv = document.querySelector("#mainCV");

    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, cv.width, cv.height);

    img.onload = function() {
        ctx.drawImage(this, 0, 0, 500, 500);

        const imageData = ctx.getImageData(0,0, cv.width, cv.height);

        const needsBlur = document.querySelector("#blur_checkbox").checked;

        let dataGrayscale = null;
        if(needsBlur) {
            const blurredImage = boxBlur(imageData.data);
            writeInCanvas(blurredImage).then(canvas => document.querySelector(".container").appendChild(canvas));
            dataGrayscale = grayscaleWASM(blurredImage);
        }else{
            dataGrayscale = grayscaleWASM(imageData.data);
        }


        const simplified = flattenFloatChanels([...dataGrayscale.grayscaleImage]);

        const dataOtsu = otsusThresholdingWASM(simplified);
        binarizationWASM(dataGrayscale.originalImage, dataGrayscale.grayscalePointer, dataOtsu.threshold, this.src)

        const finalResultImg = [...$wasm.HEAPF32.subarray((dataGrayscale.grayscalePointer >> 2 ) , (dataGrayscale.grayscalePointer >> 2) + dataGrayscale.originalImage.length)]; 

        const t0 = performance.now();
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

        
        const tf = performance.now();
        Logger.log("JAVASCRIPT" , `Finding ROI algorithm took ${tf - t0} mils`)

        document.querySelector(".container").appendChild(generateVerticalHistogram(verticalPlot , step, step));
        document.querySelector(".container").appendChild(generateHorizontalHistogram(horizontalPlot, step, step));

        writeInCanvas(finalResultImg).then(canvas => {
            document.querySelector(".container").appendChild(canvas);

            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = "#03fc30" // light green
            ctx.fillStyle = "green";
            ctx.font = "20px Arial";
            let x = 0;
            let y = 0;
            let width =0;
            let height = 0;

            if(pointsAuxHorizontal.length > pointsAuxVertical.length) {

                let curr = 0;
                for(let i =0; i < pointsAuxHorizontal.length; i++) {

                    var verticalPoint = pointsAuxVertical[curr];

                    x = pointsAuxHorizontal[i].init;
                    y = verticalPoint.init;
                    width =  pointsAuxHorizontal[i].final - pointsAuxHorizontal[i].init;
                    height = verticalPoint.final - verticalPoint.init

                    if(width >= 30 && height >= 30) {
                        ctx.strokeRect(x, y, width, height);
                    }
                    

                    if( (pointsAuxVertical.length - 1)  > curr ) curr++;
                }

            }else {

                let curr = 0;
                for(let i =0; i < pointsAuxVertical.length; i++) {

                    var horizontalPoint = pointsAuxHorizontal[curr];

                    x = horizontalPoint.init;
                    y = pointsAuxVertical[i].init;
                    width =  horizontalPoint.final - horizontalPoint.init;
                    height = pointsAuxVertical[i].final - pointsAuxVertical[i].init

                    
                    if(width >= 30 && height >= 30) {
                        ctx.strokeRect(x, y, width, height);
                    }

                    if( (pointsAuxHorizontal.length - 1)  > curr ) curr++;
                }

            }

            ctx.fill();
        });


        dataGrayscale.free();
        dataOtsu.free();
        
    };

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
        
        for(let i = 0; i < arr.length; i++) {
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
        
        for(let i = 0; i < arr.length; i++) {
            ctx.beginPath();
            ctx.moveTo(i, height);
            ctx.lineTo(i, height - arr[i]);
            ctx.stroke();
        }
        return cv
    }

    function writeInCanvas(data){

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

    function boxBlur(pixels) {

        const vector = new $wasm.vector(); 
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const response =  $wasm.boxBlur(vector, vector.size(), 500);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `Box Blur algorithm took ${t2 - t1} mils `);
        
        return response;
    }

    function flattenChanels(pixels) {

        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const  response = $wasm.flatRGBA(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `Flatten RGBA (auxiliary function) took: ${t2 - t1} mils`);

        return [...response];
    }

    function getVerticalPlot(pixels) {
        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getVerticalPlot(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get vertical plot took: ${t2 - t1} mils`);

        return [...response];
    }

    function getHorizontalPlot(pixels) {
        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getHorizontalPlot(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get horizontal plot took: ${t2 - t1} mils`);

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        return r;
        //return [...response];
    }

    function getPoints(pixels) {
        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));

        const t1 = performance.now();
        const response = $wasm.getPoints(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `get points took: ${t2 - t1} mils`);

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        return r;
    }

    function flattenFloatChanels(pixels) {

        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const  response = $wasm.flatRGBAFromImageWithPixelRealValues(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `Flatten RGBA (with Double values) [auxiliary function] took: ${t2 - t1} mils`);

        return response;
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
            grayscaleImage: $wasm.HEAPF32.subarray((heapPointer >> 2 ) , (heapPointer >> 2) + floatArr.length),
            grayscalePointer: heapPointer,
            free : function() {
                $wasm._free(heapPointer);
            }
        };
  
    }


    function otsusThresholdingWASM(simplifiedImage) {
        
        const pointerSimplifiedImageFloat = $wasm._malloc(simplifiedImage.length *  simplifiedImage.BYTES_PER_ELEMENT);
        $wasm.HEAPF32.set(simplifiedImage, pointerSimplifiedImageFloat >> 2);
        
        const performanceOtsusAlgorithmt0 = performance.now();
        const otsusThresholdFloat = $wasm.otsusThreasholdValueFloat(pointerSimplifiedImageFloat, simplifiedImage.length);
        const performanceOtsusAlgorithmtf = performance.now();
        Logger.log("WEBASSEMBLY", `Otsu's thresholding algorithm took ${performanceOtsusAlgorithmtf - performanceOtsusAlgorithmt0} mils and returned ${otsusThresholdFloat} as value`)

        return  { 
                threshold: otsusThresholdFloat, 
                free : function() {
                    $wasm._free(pointerSimplifiedImageFloat);
                }
        };
    }

    function binarizationWASM(originalImage, grayscaleImagePointer, threshold ) {
        const performanceBinarizationt0 = performance.now();
        $wasm.binarizationFloat(grayscaleImagePointer, threshold, originalImage.length);
        const performanceBinarizationtf = performance.now();
        Logger.log("WEBASSEMBLY", `Image binarization took ${performanceBinarizationtf - performanceBinarizationt0} mils `)
    }

    function rgba2OneGrayscaleChanelWASM(grayscaleImagePointer, len) {
        const performanceArraySimplificationt0 = performance.now();
        const r = $wasm.reduceRGBA2OneChanel(grayscaleImagePointer, len);
        
        const performanceArraySimplificationtf = performance.now();
        Logger.log("WEBASSEMBLY", `Image chanel flatting (auxiliary function) took ${performanceArraySimplificationtf - performanceArraySimplificationt0} mils `)

        return r;
    }
    

    
});