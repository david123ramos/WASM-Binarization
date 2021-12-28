#include <stdlib.h>
#include <stdint.h>
#include <stdio.h>
#include <algorithm>
#include <vector>
#include <numeric>
#include <math.h>
#include <emscripten/bind.h>
#include "emscripten.h"

void grayscale(int img_ptr, int len) {
    uint8_t *img = (uint8_t *) img_ptr;

    for ( int i =0; i <len; i+=4 ) {
        //0.2125, 0.7154, 0.0721
        //(0.2125 * color.r) + (0.7154 * color.g) + (0.0721 * color.b);
        double brightness = (0.2125 * img[i]) + (0.7154 * img[i+1])  + (0.0721 * img[i+2]); 

        img[i] = brightness;
        img[i+1] = brightness;
        img[i+2] = brightness;

    }
}

void grayscale2(int img_ptr, int len) {

    float_t *img = (float_t *) img_ptr;

    for ( int i =0; i <len; i+=4 ) {
        double brightness = (0.2125 * img[i]) + (0.7154 * img[i+1])  + (0.0721 * img[i+2]); 
        img[i] = brightness / 255.0;
        img[i+1] = brightness / 255.0;
        img[i+2] = brightness / 255.0;
    }
}


void binarization(int img_ptr, double threshold , int len) {

    uint8_t *img = (uint8_t *)img_ptr;

    for ( int i =0; i <len; i+= 4 ) {

        double brightness = img[i] / 255.0;
    
        if ( brightness > threshold ) {
            
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
 
 
 double otsusThreshold(int img_ptr, int len) {
    uint8_t *img;
    img = (uint8_t *) img_ptr;
    double n_bins =  0.1;

    double mapped_image[len];

    for (int i = 0; i < len; i++) {
        mapped_image[i] = img[i] / 255.0; //map to value between 0 and 1
    }


    int total_weight = len;

    double least_variance = -1;
    double least_variance_threshold = -1;

    double min_element =    (*std::min_element(mapped_image, mapped_image + len) ) + n_bins;
    double max_element =    (*std::max_element(mapped_image, mapped_image +len) ) - n_bins;
    std::vector<double> color_thresholds;
   
    for(double i = min_element; i <= max_element; i+= n_bins) {
      color_thresholds.push_back(i);
    }

    for(double color_threshold: color_thresholds) {

        std::vector<int> bg_pixels;
        std::vector<int> fr_pixels;

        std::copy_if(mapped_image, mapped_image +len, std::back_inserter(bg_pixels), [color_threshold](int i){return i < color_threshold;});
        double weight_bg =  ((double) bg_pixels.size()) / total_weight;

        //calculate mean of background pixels
        double mean_bg = 0;
        for (int bg_pixel: bg_pixels) {
            mean_bg += bg_pixel;
        }
        mean_bg = mean_bg / bg_pixels.size();


        //calculate variance of backdround pixels
        double variance_bg = 0;

        for(int bg_pixel: bg_pixels) {
            variance_bg += pow( bg_pixel - mean_bg , 2);
        }

        variance_bg = variance_bg / bg_pixels.size();

        std::copy_if(mapped_image, mapped_image + len, std::back_inserter(fr_pixels), [color_threshold](int i){return i >= color_threshold;});
        double weight_fr = ((double) fr_pixels.size()) / total_weight;

        //calculate mean of foreground pixels
        double mean_fr = 0;

        for (int fr_pixel: fr_pixels) {
            mean_fr += fr_pixel;
        }
        mean_fr = mean_fr / fr_pixels.size();


        //calculate variance of foreground pixels
        double variance_fr = 0;
        for (int fr_pixel: fr_pixels) {
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


void binarization2(int img_ptr, double threshold , int len) {

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
 

 double otsusThreshold2(int img_ptr, int len) {
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


emscripten::val reduceRGBA2OneChanel(int img_ptr, int len) {

    float_t *img = (float_t *) img_ptr;
    int delta = 4;
    size_t simplified_img_len= len /delta;
    std::vector<float_t> simplified_image;

    for(int i =0; i < len; i+= delta) {
        simplified_image.push_back(img[i]); 
    }
    return emscripten::val(emscripten::typed_memory_view(simplified_img_len, &simplified_image[0]));

}


double get_version() {
    return 0.1;
}

EMSCRIPTEN_BINDINGS (binarization_module) {
    emscripten::function("version", &get_version);
    emscripten::function("grayscale", &grayscale);
    emscripten::function("grayscale2", &grayscale2, emscripten::allow_raw_pointer<emscripten::arg<0>>());
    emscripten::function("otsusThreasholdValue", &otsusThreshold);
    emscripten::function("otsusThreasholdValueFloat", &otsusThreshold2);
    emscripten::function("reduceRGBA2OneChanel", &reduceRGBA2OneChanel);
    emscripten::function("binarization", &binarization);
    emscripten::function("binarizationFloat", &binarization2);
}