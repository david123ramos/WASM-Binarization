#include <stdlib.h>
#include <stdint.h>

#include <algorithm>
#include <vector>
#include <numeric>
#include <math.h>
#include <emscripten/bind.h>

#include "emscripten.h"
 
 
 double otsusThreshold(int img_ptr, int w, int h) {
    uint8_t *img;
    img = (uint8_t *) img_ptr;
    double n_bins =  0.1;


    int total_weight = w * h;

    double least_variance = -1;
    double least_variance_threshold = -1;

    double min_element = ((int ) std::min_element(img, img + w * h) ) + n_bins;
    double max_element =  ((int) std::max_element(img, img + w * h) )  - n_bins;
    std::vector<double> color_thresholds;
   
    for(int i = min_element; i <= max_element; i+= n_bins) {
      color_thresholds.push_back(i);
    }

    for(double color_threshold: color_thresholds) {

      std::vector<int> bg_pixels;
      std::vector<int> fr_pixels;

      std::copy_if(color_thresholds.begin(), color_thresholds.end(), std::back_inserter(bg_pixels), [color_threshold](int i){return i < color_threshold;});
      double weight_bg = bg_pixels.size() / total_weight;
      
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

      variance_bg += variance_bg / bg_pixels.size();

      

      std::copy_if(color_thresholds.begin(), color_thresholds.end(), std::back_inserter(fr_pixels), [color_threshold](int i){return i >= color_threshold;});
      double weight_fr = fr_pixels.size() / total_weight;
      
      //calculate mean of foreground pixels
      double mean_fr = 0;

      for (int fr_pixel: fr_pixels) {
          mean_fr += fr_pixel;
      }
      mean_fr = mean_fr / fr_pixels.size();


      //calculate variance of foreground pixels
      double variance_fr = 0;
      for(int fr_pixel: fr_pixels) {
          variance_fr += pow( fr_pixel - mean_fr , 2);
      }
      variance_fr += variance_fr / bg_pixels.size();


      
      double class_variance = weight_fr * variance_fr + weight_bg * variance_bg;

      if (least_variance == -1 || least_variance > class_variance  ) {
          least_variance = class_variance;
          least_variance_threshold = color_threshold;
      }

    }

    return least_variance_threshold;
}


double get_version(){
    return 0.1;
}

EMSCRIPTEN_BINDINGS(binarization_module) {
    emscripten::function("version", &get_version);
    emscripten::function("otsusThreasholdValue", &otsusThreshold);
}