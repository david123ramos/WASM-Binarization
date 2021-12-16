
function otsusThreshold (img, w, h) {
    
    var n_bins = 0.1;
    var total_weight = w * h;

    var least_variance = -1;
    var least_variance_threshold = -1;

    var min_element = Math.min(...img) + n_bins;
    var max_element = Math.max(...img) - n_bins;

    var color_thresholds = [];

    for (let i = min_element; i <= max_element; i+= n_bins) {
        color_thresholds.push(i);        
    }

    for (const color_threshold of color_thresholds) {
        
        var bg_pixels = [];
        var fr_pixels = [];

        bg_pixels = img.filter((number) => { return number < color_threshold});

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

        fr_pixels = img.filter((number) => { return number >= color_threshold});
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

        var class_variance = weight_fr * variance_fr + weight_bg * variance_bg;

        // console.log('class variance: '+ class_variance);
        // console.log('least variance variance: '+ least_variance);

        if (least_variance == -1 || least_variance > class_variance) {
            least_variance = class_variance;
            least_variance_threshold = color_threshold;
        }
    }

    return least_variance_threshold;
}