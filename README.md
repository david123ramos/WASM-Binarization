<h1>Welcome back!</h1>
if you forgotten how to run this project, i'll help you, guy.🤓
It's quite simple. Follow the steps bellow 
<ol>
    <li>Verify if docker deamon is running. This step is important if you are in windows using WSL2</li>
    <li>Verify if node and npm are installed correctly.</li>
    <li>After that run: <code> npm install </code> for install all dependecies.</li>
    <li>Lastly, run <code> npm run build </code>. This command creates a new instance of docker container running emscripten. When a image is mounted, the build.sh script is executed inside the container. It was projected thus because whith docker we have an consistent development enviroment and we can guarantee the same results everywhere.</li>
</ol>


After this steps (if you not crashed with an error) the module is already mounted! All generated source code are in dist folder. If you want run, please, just throw <code> npm run serve </code> in your terminal. 