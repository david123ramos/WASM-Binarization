import wasmModule from './binarization.js';



wasmModule().then(($wasm) => {
    console.log(`It works! Version ${$wasm.version()}`);
    console.log($wasm);
    
    const img = new Image();
    img.src = "./assets/img2.jpg";

    const cv = document.querySelector("#mainCV");

    const ctx = cv.getContext("2d");

    img.onload = function() {
        ctx.drawImage(this, 0, 0, this.width, this.height);

        const imageData = ctx.getImageData(0,0, cv.width, cv.height);

        const dataGrayscale = grayscaleWASM(imageData.data);
        const simplified = rgba2OneGrayscaleChanelWASM(dataGrayscale.grayscalePointer, dataGrayscale.grayscaleImage.length);
        const dataOtsu = otsusThresholdingWASM(simplified);
        

        binarizationWASM(dataGrayscale.originalImage, dataGrayscale.grayscalePointer, dataOtsu.threshold)

        const finalResultImg = $wasm.HEAPF32.subarray((dataGrayscale.grayscalePointer >> 2 ) , (dataGrayscale.grayscalePointer >> 2) + dataGrayscale.originalImage.length);
        document.body.appendChild(writeInCanvas(finalResultImg));


        dataGrayscale.free();
        dataOtsu.free();
    };

    function writeInCanvas(data){
        const canvas = document.createElement("canvas");
        canvas.width = 500;
        canvas.height = 500;
        canvas.classList.add("cv");

        var context = canvas.getContext("2d");
        var imageData = context.createImageData(500, 500);
        imageData.data.set(data);
        context.putImageData(imageData, 0, 0);
        return canvas;
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