#Welcome back!
if you forgotten how to run this project, i'll help you, guy.

It's quite simple. Follow the steps bellow:

    1 - Verify if docker deamon is running. This step is important if you are in windows using WSL2
    2 - Verify if node and npm are installed correctly.
    3 - After that run: `` npm install `` for install all dependecies.
    4 - Lastly, run ``` npm run build ```. This command creates a new instance of docker container running emscripten. When a image is mounted, the build.sh script is executed inside the container. It was projected thus because whith docker we have an consistent development enviroment and we can guarantee the same results everywhere.

After this steps (if you not crashed with an error) the module is already mounted! All generated source code are in dist folder. If you want run, please, just throw `` npm run serve `` in your terminal. 