#include <stdlib.h>
#include <stdint.h>
#include <stdio.h>
#include <algorithm>
#include <vector>
#include <numeric>
#include <math.h>
#include <emscripten/bind.h>
#include "emscripten.h"

double get_version() {
    return 0.1;
}

void grayscale(int img_ptr, int len) {

    float_t *img = (float_t *) img_ptr;

    for ( int i =0; i <len; i+=4 ) {
        double brightness = (0.2125 * img[i]) + (0.7154 * img[i+1])  + (0.0721 * img[i+2]); 
        img[i] = brightness / 255.0;
        img[i+1] = brightness / 255.0;
        img[i+2] = brightness / 255.0;
    }
}


emscripten::val reduce_rgba_to_one_chanel(int img_ptr, int len) {

    float_t *img = (float_t *) img_ptr;
    int delta = 4;
    size_t simplified_img_len= len /delta;
    std::vector<float_t> simplified_image;

    for(int i =0; i < len; i+= delta) {
        simplified_image.push_back(img[i]); 
    }
    return emscripten::val(emscripten::typed_memory_view(simplified_img_len, &simplified_image[0]));

}

emscripten::val get_horizontal_histogram(int img_ptr,int len, int image_width) {
    int8_t *img = (int8_t *) img_ptr;
   
    std::vector<double> plot;


    for(int i =0; i < len; i+=image_width) {
        double sum = 0;
        for(int j= 0; j < image_width; j+= 4) {
            sum+= img[i+j];
        }
        plot.push_back(sum);
    }

    return emscripten::val(emscripten::typed_memory_view(image_width, &plot[0]));
}
// [0 ,0, 0,
//  0, 0, 0,
//  0 ,0 ,0]

 double otsus_threshold(int img_ptr, int len) {
    float_t *img = (float_t *) img_ptr;

    double n_bins =  0.1;

    int total_weight = len;

    double least_variance = -1;
    double least_variance_threshold = -1;

    double min_element =    (*std::min_element(img, img + len) ) + n_bins;
    double max_element =    (*std::max_element(img, img +len) ) - n_bins;
    std::vector<double> color_thresholds;
   
    for(double i = min_element; i <= max_element; i+= n_bins) {
      color_thresholds.push_back(i);
    }

    for(double color_threshold: color_thresholds) {

        std::vector<double> bg_pixels;
        std::vector<double> fr_pixels;

        //double a = color_thresholds.begin();

        std::copy_if(img, img +len, std::back_inserter(bg_pixels), [color_threshold](double i){return i < color_threshold;});
        double weight_bg =  ((double) bg_pixels.size()) / total_weight;

        //calculate mean of background pixels
        double mean_bg = 0;
        for (double bg_pixel: bg_pixels) {
            mean_bg += bg_pixel;
        }
        mean_bg = mean_bg / bg_pixels.size();


        //calculate variance of backdround pixels
        double variance_bg = 0;

        for(double bg_pixel: bg_pixels) {
            variance_bg += pow( bg_pixel - mean_bg , 2);
        }

        variance_bg = variance_bg / bg_pixels.size();

        std::copy_if(img, img + len, std::back_inserter(fr_pixels), [color_threshold](double i){return i >= color_threshold;});
        double weight_fr = ((double) fr_pixels.size()) / total_weight;

        //calculate mean of foreground pixels
        double mean_fr = 0;

        for (double fr_pixel: fr_pixels) {
            mean_fr += fr_pixel;
        }
        mean_fr = mean_fr / fr_pixels.size();


        //calculate variance of foreground pixels
        double variance_fr = 0;
        for (double fr_pixel: fr_pixels) {
            variance_fr += pow( fr_pixel - mean_fr , 2);
        }
        variance_fr = variance_fr / bg_pixels.size();

        double class_variance = weight_fr * variance_fr + weight_bg * variance_bg;

        if (least_variance == -1 || least_variance > class_variance  ) {
            least_variance = class_variance;
            least_variance_threshold = color_threshold;
        }
    }

    return least_variance_threshold;
}

void binarization(int img_ptr, double threshold , int len) {

    float_t *img = (float_t *) img_ptr;

    for ( int i =0; i <len; i+= 4 ) {

        //double brightness = img[i] / 255.0;
    
        if ( img[i] < threshold ) {
            
            img[i]   = 255;
            img[i+1] = 255;
            img[i+2] = 255;
        } else {
            img[i]   = 0;
            img[i+1] = 0;
            img[i+2] = 0;
        }

    }
}
 


EMSCRIPTEN_BINDINGS (binarization_module) {
    emscripten::function("version", &get_version);
    emscripten::function("grayscale2", &grayscale);
    emscripten::function("reduceRGBA2OneChanel", &reduce_rgba_to_one_chanel);
    emscripten::function("getHorizontalHistogram", &get_horizontal_histogram);
    emscripten::function("otsusThreasholdValueFloat", &otsus_threshold);
    emscripten::function("binarizationFloat", &binarization);
}