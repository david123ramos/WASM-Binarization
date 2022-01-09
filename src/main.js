import wasmModule from './binarization.js';



wasmModule().then(($wasm) => {
    console.log(`It works! Version ${$wasm.version()}`);
    console.log($wasm);

    //bind _malloc to remeber to use free
    const m = $wasm._malloc;
    $wasm._malloc = function(size) {
        console.trace("WARNING - Malloc use require 'free' function use too. Don't forget");
        return m(size);
    }
    
    const img = new Image();
    img.src = "./assets/a.jpeg";
    //img.src = "./assets/6.png";
    //img.src = "./assets/8.png";

    const cv = document.querySelector("#mainCV");

    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, cv.width, cv.height);

    img.onload = function() {
        ctx.drawImage(this, 0, 0, 500, 500);

        const imageData = ctx.getImageData(0,0, cv.width, cv.height);

        const dataGrayscale = grayscaleWASM(imageData.data);

        const simplified = rgba2OneGrayscaleChanelWASM(dataGrayscale.grayscalePointer, dataGrayscale.grayscaleImage.length);
        const dataOtsu = otsusThresholdingWASM(simplified);
        binarizationWASM(dataGrayscale.originalImage, dataGrayscale.grayscalePointer, dataOtsu.threshold, this.src)

        const finalResultImg = $wasm.HEAPF32.subarray((dataGrayscale.grayscalePointer >> 2 ) , (dataGrayscale.grayscalePointer >> 2) + dataGrayscale.originalImage.length);
        console.log("Final", finalResultImg);

        const res = [];
        for(let i =0; i < finalResultImg.length; i+=4) {
            res.push(finalResultImg[i]);
        }


        const plot = [];
        const dt = 10
        let searchinEnd = false;
        let hasEnded = false;
        const pi = [];
        const pf = []
        const step = 500;
        let vsz = 0;
        for(let i =0; i < res.length; i+= step) {
            let sum = 0;
            for(let j = i; j < i + step; j++) {
                sum += res[j] / 255;

               
                if(sum > dt && !searchinEnd && !hasEnded) {
                    pi.push({x: i, y:j});
                    searchinEnd = true;
                }else if(searchinEnd && sum < dt && !hasEnded) {
                    pf.push({x: i, y:j});
                    searchinEnd = false;
                    hasEnded = true
                }


            }
            if(sum >  0) {
                vsz += 1;
            }
            plot.push(sum);
        }


        const plot2 = [];

        let searchinEndh = false;
        let hasEndedh = false;
        const pih = [];
        const pfh = []
        let hsz = 0
        //const step = 500;
        for(let i =0; i < step; i++) {
            let sum = 0;
            for(let j = i; j < res.length; j+= step) {
                sum += res[j] / 255;


                

                if(sum > dt && !searchinEndh && !hasEndedh) {
                    pih.push({x: i, y:j});
                    searchinEndh = true;
                }else if(searchinEndh && sum < dt && !hasEndedh) {
                    pfh.push({x: i, y:j});
                    searchinEndh = false;
                    hasEndedh = true
                }
            }
            if(sum >  0) {
                hsz += 1;
            }
            plot2.push(sum);
        }

        console.log(pi, pf, pih, pfh, vsz, hsz);

        

        
        document.body.appendChild(generateVerticalHistogram(plot, 500, 500));
        
        writeInCanvas(finalResultImg).then(canvas => {
            document.body.appendChild(canvas);

            const ctx = canvas.getContext("2d");
            ctx.strokeStyle = "#00ff0d"
            
            ctx.fillStyle = "#00ff0d";
            ctx.font = "20px Arial";
            ctx.fillText("detected ROI", pfh[0].x, (pi[0].x / 500) - 20);

            ctx.strokeRect(pfh[0].x ,pi[0].x / 500, hsz, vsz);
            ctx.fill();
            document.body.append(generateHorizontalHistogram(plot2, 500, 500 ))
        });
        

        dataGrayscale.free();
        dataOtsu.free();
        
    };

    function generateVerticalHistogram(arr, width, height) {
        const cv = document.createElement("canvas");
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



    function getSimplifiedImageDataFloat(imgData) {
        const performanceArraySimplificationt0 = performance.now();
        const arr = [];
        for(let i = 0; i < imgData.length; i+=4) {
            arr.push( Number(imgData[i].toFixed(6)) );
        }
        //TODO: remover gambiarra
        arr.shift(); //remove o primeiro elemento lixo
        const performanceArraySimplificationtf = performance.now();
        console.info(`JS array simplification took: ${performanceArraySimplificationtf - performanceArraySimplificationt0} mils`);
        return new Float32Array(arr);
    }


    function grayscaleWASM(pixels) {

        const floatArr = new Float32Array(pixels);
        const heapPointer = $wasm._malloc(floatArr.length * floatArr.BYTES_PER_ELEMENT);
        $wasm.HEAPF32.set(floatArr, heapPointer >> 2);

        const performanceGrayscalet0 = performance.now();
        $wasm.grayscale2(heapPointer, floatArr.length);
        const performanceGrayscaletf = performance.now();
        console.info(`WASM grayscale took: ${performanceGrayscaletf - performanceGrayscalet0} mils`);
        
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
        console.info(`WASM otsu's algorithm took: ${performanceOtsusAlgorithmtf - performanceOtsusAlgorithmt0} mils`);

        console.log(`RESULT FROM OTSU'S AlGORITHM ${otsusThresholdFloat} FLOAT`);

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
        console.info(`WASM binarization took: ${performanceBinarizationtf - performanceBinarizationt0} mils`);

    }

    function rgba2OneGrayscaleChanelWASM(grayscaleImagePointer, len) {
        const performanceArraySimplificationt0 = performance.now();
        const r = $wasm.reduceRGBA2OneChanel(grayscaleImagePointer, len);
        
        const performanceArraySimplificationtf = performance.now();
        console.info(`WASM array simplification took: ${performanceArraySimplificationtf - performanceArraySimplificationt0} mils`);
        return r;
    }
    

    
});