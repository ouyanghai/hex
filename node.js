var fs = require('fs');
var http = require('http');
var exec = require('child_process').exec; 
//获取任务数据
var getUrl = 'http://121.199.173.134/mobile/sjdp/taskinfo?code=Haodianpu@123';
var callback = 'http://121.199.173.134/mobile/sjdp/imageinfo';
var host = "http://106.75.139.209:8002/download?";

//var getUrl = 'http://i.haodianpu.com/best/wxyh/taskinfo?sid=35418517';
//var callback = 'http://i.haodianpu.com/best/wxyh/imageinfo';
//var host = "http://106.75.139.209:8001/download?";

var root = process.cwd() + "/test/" ;
var timeFlag = 0;
var timeTemp = 0;
var info = [];
var date = new Date();
var taskdatainfo='无';//保存任务数据信息
var taskinfo = '无';//任务执行情况
var childsrc = '无';
window.onload=function(){
    syslog("start work ...");
    readOldData();
    document.body.innerHTML="<iframe id='child' src='' width='100%' height='900px'></iframe><div id='flag' width='100%' height='100px'></div>";
    
    setInterval(function(){
        if(info.length == 0){
	    taskdatainfo = '任务数据为空,正在获取任务数据...';
            getInfo();    
        }
    },10000);
    setInterval(function(){
	    timeFlag += 1;
        if(timeFlag > 180){
            timeFlag = 0;
            var tsrc = document.getElementById('child').getAttribute('src');
            var tnum = info.length;
            if(tnum > 0){
                writeOldData();
            }
            error("运行"+tsrc+"超时，"+tnum+"条数据未执行，强制刷新");
            exec('cmd /c start cmd /c "echo Restarting ... & taskkill /F /T /IM hexclient.exe & ping 127.1 >nul & cd /d c:/hex/ & start hexclient.exe"');
        }
    },1000);

    setInterval(function(){
        doSchedule();
    },3600000);

    setInterval(function(){
    	childsrc = document.getElementById('child').getAttribute('src');
    	var flagstr = '';
    	flagstr += '<font color="blue">任务数据情况:</font>' + taskdatainfo+'<br/>';
    	flagstr += '<font color="blue">正在访问网址:</font>' + childsrc+'<br/>';
    	flagstr += '<font color="blue">任务执行情况:</font>' + taskinfo;
    	document.getElementById("flag").innerHTML=flagstr;
    },2000);

    cutAll();   
}



//根据队列 截取所有宝贝图片
function cutAll(){
    timeFlag = 0;
    if(info.length == 0){
	taskinfo = '任务停止。任务数据为空,等待任务数据...';
        return setTimeout(function(){
            cutAll();
        },10000);
    }

    //清除cookie
    clearCookie();

    taskinfo = '任务执行中...';
    taskdatainfo = '任务数据还有'+info.length+'条';
    var userInfo = info.shift();
    var sid = userInfo[0];
    var iid = userInfo[1];
    var url = "https://item.taobao.com/item.htm?id=" + iid + "&rnd=" + Math.random().toString(36).substr(2);
    document.getElementById("child").setAttribute('src',url);
    document.getElementById("child").onload = function(){
        var elewin = document.getElementById("child").contentWindow;
        //判断是否为下架宝贝
        var error_hd = elewin.document.getElementById("content").innerHTML;
        var patt = new RegExp("很抱歉，您查看的宝贝不存在，可能已下架或者被转移");
        if(patt.test(error_hd)){
	        error("get wrong shop item_"+sid+"_"+iid);
            return cutAll();
        }
        //隐藏干扰元素
        hideParams(elewin);
        setTimeout(function(){ 
            var ele = elewin.document.querySelector("#description") || elewin.document.querySelector("#J_SubWrap");
            var params = getRegion(ele);
            if ( typeof params.top == "undefined" || typeof params.height == "undefined"){
                error('Can not get the element region!');   
                return cutAll();
            }
            elewin.document.body.scrollTop += params.top-80;
            elewin.document.body.scrollLeft += 193;
            hideParams(elewin);
            var iidPath = makePicDir(sid,iid);
            setTimeout(function(){
                //再取一次节点区域
                params = getRegion(ele);
                cutImg(elewin,params.height+70,sid,iid,1,iidPath);
            },2000);
        },3000);
    }
}

function hideParams(elewin){
    //隐藏宝贝描述栏
    var tabbar = elewin.document.querySelector(".tb-tabbar-mid-wrap") || elewin.document.querySelector("#J_TabBarBox") ||'';
    if(tabbar != ''){
        tabbar.style.display = "none";    
    }
    
    //隐藏天猫商家名
    var ttabbar = elewin.document.querySelector("#side-shop-info .hook-float")||'';
    if(ttabbar !=''){
        ttabbar.style.display = "none";
    }
    
    //隐藏右侧提示栏
    var toolbar = elewin.document.querySelector("#J_Toolbar")|| elewin.document.querySelector(".mui-mbar-tabs-mask") ||''; 
    if(toolbar != ''){
        toolbar.style.display = "none";    
    }
    
    //隐藏segments
    
    var segment = elewin.document.querySelector(".tb-desc-segments-list-sticky")||'';
    if(segment != ''){
        segment.style.display = "none";            
    }
    //隐藏登陆弹窗
    var loginModule = elewin.document.querySelector(".sufei-dialog-content")||'';
    var loginMask = elewin.document.querySelector(".sufei-dialog-mask")||'';
    if(loginModule != '' || loginMask!=''){
        loginModule.style.display = "none";            
        loginMask.style.display = "none";            
    }
    
}

//递归函数，递归截取某个宝贝的所有图片
function cutImg(elewin,eheight,sid,iid,times,iidPath){
    hideParams(elewin);
    var h = 800;//每次下滑滚动条长度
    var _top = 0;
    var _left = 0;
    var _height = 0; 
    var _right = 780;
    _height = (eheight-times*h) > 0 ? h : (eheight % h);
    if(times > 30 || (times*h - eheight) > h) {
        setTimeout(function(){
            cutAll();
        },5000);
        return callTaobao(iid,sid,times-1);
    }
    hex.snapshot([_top,_left,_right,_height],function (success, width, height, uri, array) {
        if (!success) {
            error("snapshot error");
            return cutAll();
        }
        var base64str = uri.replace(/^data:image\/\w+;base64,/, "");
        var dataBuffer = new Buffer(base64str,'base64');
        
        var filename = iidPath+"/"+times+".png";
        fs.writeFileSync(filename,dataBuffer);
        
        elewin.document.body.scrollTop += h;
        
        return setTimeout(function(){
            cutImg(elewin,eheight,sid,iid,times+1,iidPath);   
        },2000);
    });
}

function makePicDir(sid,iid){
    var timePath = root + "/download/"+(new Date().Format("yyyy-MM-dd"));
    var sidPath = timePath +"/shop_"+sid;
    var iidPath = sidPath +"/item_"+iid;
    if(!fs.existsSync(timePath)){
        fs.mkdirSync(timePath,'0777');  
    }
    if(!fs.existsSync(sidPath)){
        fs.mkdirSync(sidPath,'0777');  
    }
    if(!fs.existsSync(iidPath)){
        fs.mkdirSync(iidPath,'0777');  
    }
    return iidPath;
}

function callTaobao(iid,sid,times){
    var dataUrl = callback+"?iid="+iid+"&sid="+sid+"&url="+host+"&count="+times;
    http.get(dataUrl,function(res){
        var size = 0;
        var chunks = [];
        res.on('data', function(chunk){
            size += chunk.length;
            chunks.push(chunk);
        });
        res.on('end', function(){
            var data = Buffer.concat(chunks, size);
            syslog('send data '+sid+'_'+iid+'_'+times+'_'+data.toString());
            return;
        });
    }).on('error', function(e) {
        error("getinfo "+sid+"_"+iid+" error");
        return;
    });
}

function doSchedule(){
    var downPath = timePath = root + "/download/";
    fs.readdir(downPath,function(err,files){
        if(err){
            error("read dir error");
        }else{
            files.forEach(function(item){
                //判断item超过3天的文件夹删除
                var nowtime = new Date().Format("yyyy-MM-dd"); 
                var temp = daysBetween(nowtime,item);
                if(temp > 3){
                    exec('rd /s /q c:\\hex\\test\\download\\'+item); 
                }
            });
        }
    });
}

// 获取节点区域参数
function getRegion(element) {

  var region = {};

  try{

    region.top = (function(e){
      var distance = e.offsetTop; 
      var parent = e.offsetParent;
      while(parent){
        distance += parent.clientTop; 
        distance += parent.offsetTop; 
        parent = parent.offsetParent;
      }
      return distance;
    })(element);
     
    region.left = (function(e){
      var distance = e.offsetLeft; 
      var parent = e.offsetParent;
      while(parent){
        distance += parent.clientLeft; 
        distance += parent.offsetLeft; 
        parent = parent.offsetParent;
      }
      return distance;
    })(element);

    region.width = (function(e){
      return e.offsetWidth;
    })(element);

    region.height = (function(e){
      return e.offsetHeight;
    })(element);

  } 
  catch (e) {
    return region;  
  }
   
  return region;
}

function writeOldData(){
    var tnum = info.length;
    var buffer = '';
    if(tnum > 0){
        for(var i=0; i<tnum; i++){
            buffer += info[i][0]+","+info[i][1]+"|";
        }
        fs.writeFileSync(root+"infodata.txt",buffer,{flag:"w"});

    }
}

function readOldData(){
    fs.stat(root+"infodata.txt",function(err,stats){
        if(err){
            error("旧文件infodata不存在");
        }else{
            var content = fs.readFileSync(root+"infodata.txt",{encoding:"utf8"});
            var tarr = content.split("|");
            for(var i=0; i<tarr.length-1; i++){
                var arr = tarr[i].split(",");
                info.push(arr);    
            }
	    fs.unlink(root+"infodata.txt");
        }
    });
}

//异步获取需要截图的宝贝数据
function getInfo(){
    http.get(getUrl,function(res){
        var size = 0;
        var chunks = [];
        res.on('data', function(chunk){
            size += chunk.length;
            chunks.push(chunk);
        });
        res.on('end', function(){
            var data = Buffer.concat(chunks, size);
	    var jarr = $.parseJSON(data.toString());
            if(jarr != 'empty'){
                for(var i=0; i<jarr.length; i++){
                    var tarr = jarr[i].split("|");
                    info.push(tarr);
                }
            }
        });
    }).on('error', function(e) {
        error("getinfo error");
    });
}

function clearCookie(){
    var host = [location.host, location.host.replace(/(^[^\.]+\.)/, ""), location.host.replace(/(^[^\.]+\.)/, "").replace(/(^[^\.]+\.)/, ""), ""];
    var keys = document.cookie.match(/[^ =;]+(?=\=)/g); 
    if( keys ){
        for(var i in keys)
            for(j in host)
                document.cookie = keys[i] + '=0; expires=' + new Date(0).toUTCString() + "; path=/; domain=" + host[j];            
    }

    window.localStorage.clear();window.sessionStorage.clear();
}


// 错误处理
function error(content){
    fs.writeFileSync(root + "logs/" + ( new Date().Format("yyyyMMdd") ) + "_error.log", "[" + ( new Date().Format("yyyy-MM-dd hh:mm:ss") ) + "] \t" + content + "\r\n", {flag:'a+'});  
}
function syslog(content){
    fs.writeFileSync(root + "logs/" + ( new Date().Format("yyyyMMdd") ) + ".log", "[" + ( new Date().Format("yyyy-MM-dd hh:mm:ss") ) + "] \t" + content + "\r\n", {flag:'a+'});  
}
//取两个日期时间的差值
function daysBetween(DateOne,DateTwo)  
{   
    var OneMonth = DateOne.substring(5,DateOne.lastIndexOf ('-'));  
    var OneDay = DateOne.substring(DateOne.length,DateOne.lastIndexOf ('-')+1);  
    var OneYear = DateOne.substring(0,DateOne.indexOf ('-'));  
  
    var TwoMonth = DateTwo.substring(5,DateTwo.lastIndexOf ('-'));  
    var TwoDay = DateTwo.substring(DateTwo.length,DateTwo.lastIndexOf ('-')+1);  
    var TwoYear = DateTwo.substring(0,DateTwo.indexOf ('-'));  
  
    var cha=((Date.parse(OneMonth+'/'+OneDay+'/'+OneYear)- Date.parse(TwoMonth+'/'+TwoDay+'/'+TwoYear))/86400000);   
    return cha;  
}

// 日期时间格式化
Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, //月份 
        "d+": this.getDate(), //日 
        "h+": this.getHours(), //小时 
        "m+": this.getMinutes(), //分 
        "s+": this.getSeconds(), //秒 
        "q+": Math.floor((this.getMonth() + 3) / 3), //季度 
        "S": this.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(fmt)) 
    fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) 
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

