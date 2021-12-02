define art                
(ɔ◔‿◔)ɔ ♥
endef
export art

CC := em++

all: clear init compwasm end

init:
	@echo "Compiling, champ"

end: 
	@echo "Well done! Hacking is fancy $$art"

compwasm: binarization.cpp
	@${CC} $^ -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["cwrap", "ccall"]' -o tt.js

clear: 
	@echo "Removing trash..."
	@rm -rf tt.js tt.wasm