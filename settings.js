/**
 * 配置文件
 */
var settings = {

    // 压缩服务器配置
    compressor : {
        host : '61.135.181.152', //压缩服务器地址
        port : 8081, // 压缩服务端口
        author : 'xwcoder', //作者姓名
        /**
         * exclude <Array> : 不上传文件过滤器, 每一项可以是:
             - string : 相等匹配
             - RegExp : 正则配置
             - function( filename ) : return true 匹配; return false 不匹配
        */
        excludes : [ /(^|\/)kao\./, /(^|\/)dict\./, /(^|\/)inc\./, /(^|\/)gg\.seed\./ ]
    },

    // ftp上传服务器配置
    ftp : {
        host : 'localhost', //ftp服务器地址
        port : 21, //ftp服务端口
        user : 'xwcoder', //用户名
        password : 'xwcoder', //密码
        /**
         * exclude <Array> : 不上传文件过滤器, 每一项可以是:
             - string : 相等匹配
             - RegExp : 正则配置
             - function( filename ) : return true 匹配; return false 不匹配
        */
        excludes : [ /(^|\/)kao\./, /(^|\/)dict\./, /(^|\/)inc\./, /(^|\/)gg\.seed\./ ]
    },
    
    // log文件
    logFile : 'log.txt',
    
    // 包含待处理文件集合的文件路径
    pathFile : 'upload.txt'

};

module.exports = settings;
