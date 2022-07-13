#include <iostream>
#include <stdlib.h>
#include <stdint.h>
#include <stdio.h>
#include <algorithm>
#include <vector>
#include <numeric>
#include <math.h>
#include <emscripten/bind.h>
#include "emscripten.h"
#include <time.h>
#include "rn.cpp"


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

/**
 * 
 * @deprecated
 * 
 * */
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

std::vector<int> binarization(int img_ptr, double threshold , int len) {

    float_t *img = (float_t *) img_ptr;
    std::vector<int> result;
    result.reserve(len);

    for ( int i =0; i <len; i+= 4 ) {

        if ( img[i] < threshold ) {
            
            result.push_back(255);
            result.push_back(255);
            result.push_back(255);
        } else {
            result.push_back(0);
            result.push_back(0);
            result.push_back(0);
        }

        result.push_back(255); //append alpha chanel
    }

    return result;
}
 

 std::vector<uint8_t> box_blur_one_chanel(std::vector<float_t> &chanel, int chanel_width) {

    const size_t KERNEL_SIZE = 9;
    const int offset = floor(KERNEL_SIZE / 2);

    std::vector<uint8_t> output;
    output.reserve(chanel.size());

    for(int pixel = (chanel_width * offset) + offset; pixel <= chanel.size() - (chanel_width * offset); pixel++) {
        int sum = 0;
        int start = pixel - ((chanel_width * offset) + offset);
        int final_pixel = pixel + ((chanel_width * offset) + offset);


        for(int i = start; i <= final_pixel; i += chanel_width ) {
            for(int j = i; j < i + KERNEL_SIZE; j++) {
                sum += chanel[j];
            }
        }

        output[pixel] = floor(sum / (KERNEL_SIZE * KERNEL_SIZE) );
    }

    return output;
}


emscripten::val box_blur(std::vector<int> img, int len, int chanel_width) {

    std::cout << "iniciando box blur" << std::endl;
    clock_t tStart1 = clock();


    //float_t *img = (float_t *) img_ptr; 
    int delta = 4;
    size_t simplified_img_len= len /delta;
    
    std::vector<float_t> red_chanel;
    std::vector<float_t> green_chanel;
    std::vector<float_t> blue_chanel;
    std::vector<float_t> alpha_chanel;


    //separate chanels 
    for(int i =0; i < len; i += delta) {    
        red_chanel.push_back(img[i]);
        green_chanel.push_back(img[i + 1]);
        blue_chanel.push_back(img[i + 2]);
        alpha_chanel.push_back(img[i + 3]);
    }

    
    std::vector<uint8_t> red_chanel_result;
    std::vector<uint8_t> green_chanel_result;
    std::vector<uint8_t> blue_chanel_result;


    std::cout << "iniciando box blur one chanel" << std::endl;
    clock_t tStart2 = clock();
    red_chanel_result = box_blur_one_chanel(red_chanel, chanel_width);
    green_chanel_result = box_blur_one_chanel(green_chanel, chanel_width);
    blue_chanel_result = box_blur_one_chanel(blue_chanel, chanel_width);
    std::cout << "finalizando box blur one chanel " <<  (clock() - tStart2) /CLOCKS_PER_SEC << std::endl;

    std::vector<uint8_t> output;

    for(int index = 0; index < red_chanel.size(); index++) {
        output.push_back(red_chanel_result[index]);
        output.push_back(green_chanel_result[index]);
        output.push_back(blue_chanel_result[index]);
        output.push_back(alpha_chanel[index]);
    }
    std::cout << "finalizando box blur " <<  (clock() - tStart1) /CLOCKS_PER_SEC << std::endl;

    return emscripten::val(emscripten::typed_memory_view(len, &output[0]));
}



std::vector<int> get_flatten_image(std::vector<int> img) {

    int delta = 4;
    size_t simplified_img_len= img.size() / delta;
    std::vector<int> simplified_image; 
    simplified_image.reserve(simplified_img_len); //avoid memory recalc

    for(size_t i =0; i < img.size(); i+= delta) {
        simplified_image.push_back(img[i]); 
    }

    return simplified_image;
}

std::vector<double> get_flatten_image_f(std::vector<double> img) {

    int delta = 4;
    size_t simplified_img_len= img.size() / delta;
    std::vector<double> simplified_image; 
    simplified_image.reserve(simplified_img_len); //avoid memory recalc

    for(size_t i =0; i < img.size(); i+= delta) {
        simplified_image.push_back(img[i]); 
    }

    return simplified_image;
    //return emscripten::val(emscripten::typed_memory_view(simplified_img_len, &simplified_image[0]));
}


emscripten::val get_vertical_plot(std::vector<int> simplified_image) {

    int step = 500; //canvas size

    std::vector<double> vertical_plot;
    vertical_plot.reserve(step);
    double sum = 0;
    for(int posY = 0; posY < simplified_image.size(); posY += step) {
        sum = 0;
        for(int posX = posY; posX < posY + step; posX++) {
            sum += (simplified_image[posX] / 255);
        }
        vertical_plot.push_back(sum);
    }

    return emscripten::val(emscripten::typed_memory_view(step, &vertical_plot[0]));
}

emscripten::val get_horizontal_plot(std::vector<int> simplified_image) {

    int step = 500; //canvas size
    std::vector<double> horizontal_plot;
    horizontal_plot.reserve(step);
    double sum = 0;
    for(int posX = 0; posX < step; posX++) {
        sum = 0;
        for(int posY = posX; posY < simplified_image.size(); posY+= step) {
            sum += (simplified_image[posY] / 255);
        }
        horizontal_plot.push_back(sum);
    }

    return emscripten::val(emscripten::typed_memory_view(step, &horizontal_plot[0]));
}

namespace pompia {
    class Point {
        public:
            int init;
            int final;        
    };
}


std::vector<pompia::Point> get_points(std::vector<double> plot){

    int init = 0;
    bool searchingFinal = false;
    double curr = 0;
    int delta = 2; //precision

    std::vector<pompia::Point> points;
    points.reserve(plot.size());
    pompia::Point point;

    for(size_t i = 0; i < plot.size(); i++) {

        curr = plot[i];

        if(curr > delta && !searchingFinal) {
            init = i;
            searchingFinal = true;
        }
        
        if(curr < delta && searchingFinal) {

            point.init = init;
            point.final = i;
            searchingFinal = false;
            points.push_back(point);
        }
    }
    points.shrink_to_fit();
    return points;
}


std::vector<int> resizeNearestNeighboor(std::vector<int> img, int w, int h, int w2, int h2) {

    std::vector<int> dstPixels;
    dstPixels.reserve(h2 * w2 * 4);

    for(size_t y =0; y < h2; y++) {
        for(size_t x = 0; x < w2; x++) {

            int srcX = floor( (x * w)  / w2);
            int srcY = floor( (y * h)  / h2);

            int srcPos = ((srcY * w) + srcX ) * 4;

            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
        }
    }

   return dstPixels;
}
std::vector<double> resizeNearestNeighboorDouble(std::vector<double> img, int w, int h, int w2, int h2) {

    std::vector<double> dstPixels;
    dstPixels.reserve(h2 * w2 * 4);

    int pos = 0;

    for(size_t y =0; y < h2; y++) {
        for(size_t x = 0; x < w2; x++) {

            int srcX = floor( (x * w)  / w2);
            int srcY = floor( (y * h)  / h2);

            int srcPos = ((srcY * w) + srcX ) * 4;

            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
            dstPixels.push_back(img[srcPos++]);
        }
    }

   return dstPixels;
}



std::vector<double> normalizeGrayscalePoints(std::vector<int> img) {

    std::vector<double> dstPixels;
    dstPixels.reserve(728);

    for(size_t i =0; i < img.size(); i+= 4) {
        int pr = img[i] == 0 ? 0 : 1;
        int pg = img[i + 1] == 0 ? 0 : 1;
        int pb = img[i + 2] == 0 ? 0 : 1;

        double brightness = (pr + pg + pb) / 3; 
        brightness = (brightness -.5) / 0.5;
        dstPixels.push_back(brightness);

    }
    
   return dstPixels;
}

std::vector<double> reflect(std::vector<double> img) {
    const int image_size = 28;

    for(size_t i =0; i < (image_size / 2); i++) {
        for(size_t j = 0; j < image_size; j++) {
            int index = (i * image_size) + j;
            int mirrorIndex = ((image_size -1) - i) * image_size + j;
            double temp  = img[index];
            img[index] = img[mirrorIndex];
            img[mirrorIndex] =  temp; 
        }
    }
    return img;
}





EMSCRIPTEN_BINDINGS (binarization_module) {
    emscripten::function("version", &get_version);
    emscripten::function("grayscale2", &grayscale);
    emscripten::function("reduceRGBA2OneChanel", &reduce_rgba_to_one_chanel);
    emscripten::function("getHorizontalHistogram", &get_horizontal_histogram);
    emscripten::function("otsusThreasholdValueFloat", &otsus_threshold);
    emscripten::function("binarizationFloat", &binarization);

    emscripten::register_vector<int>("vector");
    emscripten::register_vector<double>("RealVector");


    emscripten::register_vector<pompia::Point>("PointVector");

    emscripten::value_object<pompia::Point>("Point")
    .field("init", &pompia::Point::init)
    .field("final", &pompia::Point::final);

    emscripten::function("boxBlur", &box_blur);
    emscripten::function("flatRGBA", &get_flatten_image);
    emscripten::function("flatRGBAFromImageWithPixelRealValues", &get_flatten_image_f); //TODO: improve function name
    emscripten::function("getVerticalPlot", &get_vertical_plot);
    emscripten::function("getHorizontalPlot", &get_horizontal_plot);
    emscripten::function("getPoints", &get_points);
    emscripten::function("nearestNeighboor", &resizeNearestNeighboor);
    emscripten::function("nearestNeighboorDouble", &resizeNearestNeighboorDouble);
    emscripten::function("normalizeGrayscalePoints", &normalizeGrayscalePoints);
    emscripten::function("classify", &classify);
    emscripten::function("reflect", &reflect);
}