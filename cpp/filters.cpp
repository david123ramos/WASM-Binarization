#include <stdlib.h>
#include <stdint.h>
#include <stdio.h>
#include <algorithm>
#include <vector>
#include <numeric>
#include <math.h>
#include <emscripten/bind.h>
#include "emscripten.h"


emscripten::val box_blur(int img_ptr, int len, int chanel_width) {

    float_t *img = (float_t *) img_ptr; 
    int delta = 4;
    size_t simplified_img_len= len /delta;
    std::vector<float_t> simplified_image;
    
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

    
    std::vector<float_t> red_chanel_result;
    std::vector<float_t> green_chanel_result;
    std::vector<float_t> blue_chanel_result;


    red_chanel_result = box_blur_one_chanel(red_chanel, chanel_width);
    green_chanel_result = box_blur_one_chanel(green_chanel, chanel_width);
    blue_chanel_result = box_blur_one_chanel(blue_chanel, chanel_width);


    std::vector<float_t> output;

    for(int index = 0; index < red_chanel.size(); index++) {
        output.push_back(red_chanel_result[index]);
        output.push_back(green_chanel_result[index]);
        output.push_back(blue_chanel_result[index]);
        output.push_back(alpha_chanel[index]);
    }

    return emscripten::val(emscripten::typed_memory_view(len, &output[0]));
}

std::vector<float_t> box_blur_one_chanel(std::vector<float_t> chanel, int chanel_width) {

    const size_t KERNEL_SIZE = 19;
    const int offset = floor(KERNEL_SIZE / 2);

    std::vector<float_t> output;
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


EMSCRIPTEN_BINDINGS (filters_module) {
    emscripten::function("boxBlur", &box_blur);
}