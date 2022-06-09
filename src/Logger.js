export default class Logger {

    static logSolver = {
        "log" : "bg-dark",
        "warn" : "bg-warn",
        "error" : "bg-danger"
    }

    static fromSolver = {
        "javascript" : "alert-warning",
        "js" : "alert-warning",
        "webassembly" : "alert-primary",
        "wasm" : "alert-primary",
        "pompia" : "alert-danger",
    }
    static measuringPerformance = true
    
    
    static log(from, msg, type="log") {

     
        if(!Logger.measuringPerformance) {

            const logList = document.querySelector("#logList");
            
            function buildLogItem(msg, type){
                const li  = document.createElement("li");
                li.classList.add("text-light", "list-group-item", Logger.logSolver[type]);
                li.innerHTML = msg;
                return li;
            }
    
            const pill = document.createElement("span");
            pill.classList.add("badge", "badge-pill", "badge-primary", Logger.fromSolver[from.toLowerCase()] );
            pill.textContent = from;
    
            const log = `${pill.outerHTML} says:  "${msg}"`;
            logList.appendChild(buildLogItem(log, type));
        }

    } 

}