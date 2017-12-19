
var cluster = require('cluster');
var http = require('http');
var url = require('url');
var path = require('path');
var fs = require('fs');

var root = path.normalize(__dirname + path.sep).replace(/\\/g, "/");
var config = {
    port: 80,
    timeout: 60
};
var verbose = true;


// DUMP
var dump = function(vars){
    var arr = [];
    if( arguments.length > 1 ){ 
        for(var i=0; i < arguments.length; i++ ){
            arr.push( arguments.callee(arguments[i]) );		
        }
        return arr.join(" ");
    }
    
    if( /object|function/.test( typeof vars ) )    
        return JSON.stringify(vars);  
    return typeof vars == "undefined" ? "undefined" : vars.toString();
}

// 调试并格式化输出
var debug = function(){
    var msg = dump.apply(null, arguments);
	if( verbose == true || verbose == "true" )
		print(msg);
}

// 输出信息
var print = function(){
    var msg = dump.apply(null, arguments);
	console.log(msg);	
}
var error = function(){
    var msg = dump.apply(null, arguments);
	console.error(msg);	
}

// 真实路径
var realpath = function(filepath){
	return filepath.replace(/\\/g, "/").replace(/^\//, root).replace(/^\.\//, root);
}



// 主程序
var run = function(){
    if (cluster.isMaster) {
        for (var i = 0; i < 8; i++) {
            cluster.fork();
        }
        cluster.on('exit', function(worker, code, signal) {
            console.log('worker ' + worker.process.pid + ' died');
        });
    } 
    else {
        listen();
    }
}


// 监听
var listen = function () {

	// 运行服务器
	var server = http.createServer(function(request, response){			

		response.setHeader("Server", "Pithy Web Server V0.23");
		response.setHeader("Author", "jenvan@qq.com");				

		var timer = setTimeout(function(response){
            if( !response.finished ){
                response.writeHead(500, "Server Error", {'Content-Type': 'text/html'});
                response.end("Timeout!");
            }
		}, config.timeout*1000, response);

        var route = url.parse(request.url).pathname.substr(1);
        route = ( route == "" || !/^[a-z]+/i.test(route) ) ? "index" : route.match(/^[a-z]+/i)[0].toLowerCase();
		if( eval("typeof _" + route + " == 'function'") ){
			print("HTTP Server -=> " + route + " [" + request.url + "]");
            eval("_" + route)(request, response);
			return;		
		}

		error("HTTP Server -=> " + route + " 404 [" + request.url + "]");
        response.writeHead(404, "Not Found", {'Content-Type': 'text/html'});
        response.end("Not Found");

	}).listen(config.port);

    server.on('error', function(err) {
        error('HTTP Server error: ' + err.stack);
        server.close();
    });

	print("HTTP Server is listening on port: " + config.port);  
    
};


// 首页
function _index(request, response) {
	response.writeHead(200, "Welcome", {'Content-Type': 'text/html'});
    response.write("<h1>Welcome</h1>This request URL <font color='gray'>" + escape(request.url) + "</font> was recevied by this server.");
	response.write("<hr>Powered by Pithy Web Server");
	response.end();
}

// 查看日志
function _log(request, response) {
    
    var obj = url.parse(request.url);
    if (typeof(obj.query) != 'undefined' && !/^[\d]+$/.test(obj.query)) {
        response.writeHead(403, "Forbidden", {'Content-Type': 'text/html'});
		response.end("Forbidden");
        return;        
    }
    
    var extend = typeof(obj.query) != 'undefined' ? obj.query : "http";
    var filepath = realpath(root + "/log/" + extend + ".log");
    if (filepath.substr(0, root.length) != root) {
        response.writeHead(403, "Forbidden", {'Content-Type': 'text/html'});
		response.end("Forbidden");
        return;     
    }

    fs.exists(filepath, function(exists) {
        if (!exists) {
            response.writeHead(404, "Not Found", {'Content-Type': 'text/html'});
            response.end("Not Found!"); 
            return;
        }
           
        fs.readFile(filepath, function (err, data) {
            if (err) throw err;            

            response.writeHead(200, {'Content-Type': 'text/plain'});
            response.write(data);
            response.end();
        });
    });
}

// 下载文件
function _download(request, response) {
    
    var obj = url.parse(request.url);
    if (typeof(obj.query) == 'undefined' || !/^[\w|\/|-]+\.(zip|rar|txt|jpg|jpeg|gif|png)$/.test(obj.query)) {
        response.writeHead(403, "Forbidden", {'Content-Type': 'text/html'});
        response.end("Forbidden");
        return;        
    }
        
    var filepath = realpath(root + "/download/" + obj.query);
    if (filepath.substr(0, root.length) != root) {
        response.writeHead(403, "Forbidden", {'Content-Type': 'text/html'});
        response.write( filepath.substr(0, root.length) );
		response.end("Forbidden");
        return;     
    }

    fs.exists(filepath, function(exists) {
        if (!exists) {
            response.writeHead(404, "Not Found", {'Content-Type': 'text/html'});
            response.end("Not Found : " + escape(filepath)); 
            return;
        }
           
        fs.readFile(filepath, function (err, data) {
            if (err) throw err;            

            response.writeHead(200, {'Content-Type': 'application/octet-stream', "Content-Disposition": "attachment;filename=" + obj.query});
            //response.writeHead(200, {'Content-Type': 'image/png'});

            response.write(data);
            response.end();
        });
    });
}

run();