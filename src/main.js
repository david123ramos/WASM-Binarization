import wasmModule from './binarization.js';

wasmModule().then((e) => {
    console.log(`It works! Version ${e.version()}`);
    console.log(e);

    const img = new Image(500, 500);
    img.src = "./numero-5.jpg";

    const cv = document.querySelector("#mainCV");

    const ctx = cv.getContext("2d");

    img.onload = function(){
        ctx.drawImage(this, 0, 0, this.width, this.height);

        const imageData = ctx.getImageData(0,0, cv.width, cv.height);
        console.log(imageData);

        var len = imageData.data.length;
        var bytes_per_element = imageData.data.BYTES_PER_ELEMENT;
    
    
        const p = e._malloc(len * bytes_per_element);
        e.HEAP8.set(imageData.data, p);


        const result = e.otsusThreasholdValue(p, imageData.width, imageData.height);
        console.log(`RESULT: ${result}`)
    };


    







})
