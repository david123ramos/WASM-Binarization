import wasmModule from './binarization.js';
import Logger from "./Logger.js";

window.numbers = [];

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

    const globalContext = cv.getContext("2d");
    globalContext.fillStyle = "#fff"
    globalContext.fillRect(0, 0, cv.width, cv.height);

    img.onload = function() {
        globalContext.drawImage(this, 0, 0, 500, 500);

        const imageData = globalContext.getImageData(0,0, cv.width, cv.height);

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
        const binarizatedVector = binarizationWASM(dataGrayscale.originalImage, dataGrayscale.grayscalePointer, dataOtsu.threshold, this.src)

        const finalResultImg = [];

        for(let  i= 0; i< binarizatedVector.size(); i++) {
            finalResultImg.push(binarizatedVector.get(i));
        }

        const grayscaleImage = [...$wasm.HEAPF32.subarray((dataGrayscale.grayscalePointer >> 2 ) , (dataGrayscale.grayscalePointer >> 2) + dataGrayscale.originalImage.length)]; 

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
        Logger.log("JAVASCRIPT" , `Finding ROI algorithm took ${tf - t0} mils`);

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
 
                    if(width >= 10 && height >= 10) {
                        const number = {
                            x,y,width, height
                        };
                        numbers.push(number);
                        
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

                    
                    if(width >= 10 && height >= 10) {
                        const number = {
                            x,y,width, height
                        };
                        numbers.push(number);
                        
                    }

                    if( (pointsAuxHorizontal.length - 1)  > curr ) curr++;
                }

            }

            numbers.forEach((number, index) => {
                const cv2 = document.createElement("canvas");
                cv2.classList.add("cv");
                cv2.width = number.width;
                cv2.height = number.height;

                const imdt = ctx.getImageData(number.x, number.y, number.width, number.height);

                const newSize = 28;
                const rz = resized(imdt.data, imdt.width, imdt.height, newSize, newSize);                

                writeInCanvas2(rz, newSize, newSize).then(canvas => {

                    const div = document.createElement("span");
                    div.id = `tooltip-${index}`;
                    canvas.appendChild(div);

                    const container = document.createElement("div");
                    container.appendChild(div);
                    container.appendChild(canvas);

                    document.body.querySelector(".container").appendChild(container);

                  

                    const start = (500 * number.y) + number.x;
                    const largura = start + (number.width - 1);
                    var final = largura + ((number.height -1) * 500 );
                    const cuttedGrayscale = []
    
                    for(let posY = start; posY < final; posY += 500) {
                        for(let posX = posY; posX < posY + number.width; posX++) {
                            cuttedGrayscale.push( simplified[posX] );
                        }
                    }

                    var image = [
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.96,
                        -0.020000000000000018,
                        0.6799999999999999,
                        1,
                        0.9199999999999999,
                        0.30000000000000004,
                        -0.72,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.94,
                        -0.10000000000000009,
                        0.3999999999999999,
                        0.3999999999999999,
                        0.28,
                        -0.020000000000000018,
                        -0.32000000000000006,
                        -0.78,
                        -1,
                        -1,
                        -1,
                        0.3199215686274508,
                        1,
                        1,
                        1,
                        1,
                        1,
                        0.8799999999999999,
                        -0.6399999999999999,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        0.33992156862745104,
                        1,
                        1,
                        1,
                        0.999921568627451,
                        1,
                        1,
                        1,
                        0.43999999999999995,
                        -0.5600784313725489,
                        -0.14007843137254916,
                        0.999921568627451,
                        0.98,
                        -0.15999999999999992,
                        -0.78,
                        -0.52,
                        0.7,
                        1,
                        0.6000000000000001,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.8400000000000001,
                        1,
                        1,
                        -0.020000000000000018,
                        -0.19999999999999996,
                        -0.08000000000000007,
                        0.21992156862745116,
                        0.6200000000000001,
                        0.979921568627451,
                        1,
                        0.979921568627451,
                        0.98,
                        0.999921568627451,
                        -0.10000000000000009,
                        -1,
                        -1,
                        -1,
                        -0.74,
                        1,
                        1,
                        -0.8400000000000001,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.6000000000000001,
                        1,
                        0.8599999999999999,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.72,
                        0.5800000000000001,
                        1,
                        1,
                        0.5,
                        -0.98,
                        -1,
                        -1,
                        -1,
                        -0.32000000000000006,
                        1,
                        0.98,
                        -0.9199999999999999,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.8600000000000001,
                        0.98,
                        1,
                        -0.54,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.30000000000000004,
                        0.9199999999999999,
                        1,
                        1,
                        0.9399215686274509,
                        -0.6799999999999999,
                        -1,
                        -1,
                        -1,
                        0.8,
                        1,
                        0.21999999999999997,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        0.31999999999999984,
                        1,
                        0.9199999999999999,
                        0.020000000000000018,
                        -0.19999999999999996,
                        0,
                        0.6799999999999999,
                        1,
                        1,
                        0.54,
                        0.45999999999999996,
                        1,
                        0.6200000000000001,
                        -0.96,
                        -1,
                        -1,
                        0.6400000000000001,
                        0.999921568627451,
                        -0.21999999999999997,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.8400000000000001,
                        0.6000000000000001,
                        0.999921568627451,
                        1,
                        1,
                        1,
                        0.999921568627451,
                        0.9199999999999999,
                        0.040000000000000036,
                        -0.94,
                        -0.76,
                        0.8599215686274511,
                        1,
                        0.18000000000000016,
                        -1,
                        -0.8999999999999999,
                        0.78,
                        1,
                        -0.3999999999999999,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.94,
                        -0.21999999999999997,
                        0.28,
                        0.3999999999999999,
                        0.30000000000000004,
                        -0.21999999999999997,
                        -0.8799999999999999,
                        -1,
                        -1,
                        -1,
                        -0.28,
                        1,
                        1,
                        0.24,
                        0.3799999999999999,
                        1,
                        0.8200000000000001,
                        -0.94,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.06000000000000005,
                        1,
                        1,
                        1,
                        0.98,
                        -0.3799999999999999,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -0.3400000000000001,
                        0.56,
                        0.3799999999999999,
                        -0.5,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1,
                        -1
                    ]

                    const aa = [];

                    for(let i =0; i < rz.length; i+= 4) {

                        var pr = rz[i] == 0 ? 255 : 0;
                        var pg = rz[i + 1] == 0 ? 255 : 0;
                        var pb = rz[i + 2] == 0 ? 255 : 0;

                        var brightness = (0.2125 * pr) + (0.7154 *  pg)  + (0.0721 *  pb); 
                        var newValue = (brightness - 0) * (1 - (-1)) / (255 - 0) + (-1);
                        aa.push(newValue);
                    }


    
                    const vector = new $wasm.RealVector(); 
                    aa.forEach(val => vector.push_back(val));
                    
                    const resizedImage = resizedDouble(cuttedGrayscale, number.width, number.height, 28, 28);
                    const flattenImage = flattenFloatChanels(resizedImage);
                    const normalizedTinyImage = normalizeGrayscalePoints(flattenImage);
                    const num = $wasm.classify(vector);
                    //const num = $wasm.classify(normalizedTinyImage.vector);
                    //writeInCanvas(resizedImage).then(cv => document.querySelector(".container").appendChild(cv));

                    const tooltip = document.querySelector(`#tooltip-${index}`);
                    tooltip.innerHTML = num;
                    tooltip.classList.add("text-dark");


                });

                

                ctx.strokeRect(number.x, number.y, number.width, number.height);
            });

        });
        dataGrayscale.free();
        dataOtsu.free();
    };

    function normalizeGrayscalePoints(pixels) {
        
        const vector = new $wasm.RealVector(); 
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const response =  $wasm.normalizeGrayscalePoints(vector);
        const t2 = performance.now();
        Logger.log("WEBASSEMBLY", `normalize grayscale algorithm took ${t2 - t1} mils `);

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        return {vector: response, array: r} ;
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
    function writeInCanvas2(data, w, h){

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

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        return r;
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

        // const r = [];

        // for(let i =0; i < response.size(); i++) {
        //     r.push(response.get(i));
        // }

        // return r;
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

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        Logger.log("WEBASSEMBLY", `Flatten RGBA (with Double values) [auxiliary function] took: ${t2 - t1} mils`);

        return new Float32Array(r);
    }

    function resized(pixels, w, h, w2, h2) {
        
        const vector = new $wasm.vector();
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const  response = $wasm.nearestNeighboor(vector, w, h, w2, h2);
        const t2 = performance.now();

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        Logger.log("WEBASSEMBLY", `Nearest neighboor took: ${t2 - t1} mils`);

        return new Float32Array(r);
    }

    function resizedDouble(pixels, w, h, w2, h2) {
        
        const vector = new $wasm.RealVector();
        pixels.forEach(val => vector.push_back(val));
        
        const t1 = performance.now();
        const  response = $wasm.nearestNeighboorDouble(vector, w, h, w2, h2);
        const t2 = performance.now();

        const r = [];

        for(let i =0; i < response.size(); i++) {
            r.push(response.get(i));
        }

        Logger.log("WEBASSEMBLY", `Nearest neighboor float took: ${t2 - t1} mils`);

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
        const result = $wasm.binarizationFloat(grayscaleImagePointer, threshold, originalImage.length);
        const performanceBinarizationtf = performance.now();
        Logger.log("WEBASSEMBLY", `Image binarization took ${performanceBinarizationtf - performanceBinarizationt0} mils `)
        return result;
    }
    
});