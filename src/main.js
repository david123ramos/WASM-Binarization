import wasmModule from './binarization.js';

wasmModule().then((e) => {
    console.log(`It works! Version ${e.version()}`);
    console.log(e);
    
    const img = new Image(500, 500);
    img.src = "./lena_color.gif";

    const cv = document.querySelector("#mainCV");

    const ctx = cv.getContext("2d");

    img.onload = function(){
        ctx.drawImage(this, 0, 0, this.width, this.height);

        const imageData = ctx.getImageData(0,0, cv.width, cv.height);

        var len = imageData.data.length;
        console.log(len)
        var bytes_per_element = imageData.data.BYTES_PER_ELEMENT;
    
        const p = e._malloc(len * bytes_per_element);
        
        e.HEAPU8.set(imageData.data, p);

        e.grayscale(p, len);

        const padding = e.HEAPU8.BYTES_PER_ELEMENT * 8;

        const imgDataFromWASM = e.HEAPU8.subarray(p, p + len);
        document.body.appendChild(writeInCanvas(imgDataFromWASM));

        //e._free(p);

        const simplifiedImage = getSimplifiedImageData(imgDataFromWASM);

        const simplifiedImageLen = simplifiedImage.length;

        const c = e._malloc(simplifiedImageLen *  simplifiedImage.BYTES_PER_ELEMENT);
        e.HEAPU8.set(simplifiedImage, c);
        
        const otsusThreshold = e.otsusThreasholdValue(c, simplifiedImageLen);
        e._free(c);
        console.log(`RESULT: ${otsusThreshold}`);

        e.binarization(p, otsusThreshold,  len);
        
        const binaryImageFromWasm = e.HEAPU8.subarray(p, p + len);
        document.body.appendChild(writeInCanvas(binaryImageFromWasm));
        e._free(p);


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


    function getSimplifiedImageData(imgData) {
        const arr = [];
        for(let i = 0; i < imgData.length; i+=4) {
            arr.push(imgData[i]);
        }
        return new Uint8Array(arr);
    }
});


function downloadObjectAsJson(exportObj, exportName){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }