/**
 * @author xwcoder
 * 文件压缩器, 使用在线压缩服务, 参数根据内网压缩服务器配置.
 * 
 * 模块提供两个方法:
 *  compress( <Array|String>filenames, <Object>settings, <String>stamp)
 *      - filename 要压缩的文件名[集合]
 *      - setttings 在线压缩服务器的配置信息
 *          host : 地址
 *          port : 端口
 *          author : 作者
 *          exclude <Array> : 不压缩文件过滤器, 每一项可以是:
 *              - string : 相等匹配
 *              - RegExp : 正则配置
 *              - function( filename ) : return true 匹配; return false 不匹配
 *      - stamp 压缩文件名中替换src部分的字符串，通常是时间戳
 *  on( <String>topic, <Function>callback ), 支持两个事件:
 *      -success 单个文件压缩成功 callback接收两个参数srcfilename minfilename
 *      -done 全部文件压缩成功 callback接收一个对象参数result, 包含如下:
 *          - compare [<Object>] : 源文件和压缩文件的对比
 *          - src [String] : 全部源文件名
 *          - min [String] : 全部压缩文件名
 *          - skip [String] : 跳过压缩的文件名
 *      
 */
var http = require( 'http' );
var querystring = require( 'querystring' );
var util = require( 'util' );
var appUtil = require( './util' );
var fs = require( 'fs' );
var Emitter = require( 'events' ).EventEmitter;
var iconv = require( 'iconv-lite' );

var emitter = new Emitter();

var result = { compare : [], src : [], min : [], skip : [] };

var compressOne = function ( filename, requestConfig, stamp ) {

    if ( appUtil.isEmptyString( filename ) ) {
        return;
    }

    var buf = fs.readFileSync( filename );
    var data = iconv.decode( buf, 'utf-8' );

    if ( data.indexOf( '�' ) != -1 ) {
        data = iconv.decode( buf, 'gbk' );
    }
    appUtil.log( 'read ' + filename + ' success' );

    var postData = { code : data, responsetype : 'text' };

    appUtil.log( 'compressing ' + filename + ' ...' );

    var req = http.request( requestConfig, function ( res ) {
        var receiveData = '';

        res.on( 'error', function () {
            console.log( 'compress ' + filename + ' fail...' );   
        } );

        res.on( 'data', function ( chunk ) {
            receiveData += chunk;
        } );

        res.on( 'end', function () {
            appUtil.log( 'compress ' + filename + ' success' );

            var savedFileName = filename.replace( '.src.', '.' + stamp + '.' );

            appUtil.log( 'saving file to ' + savedFileName + '...' );

            fs.writeFile( savedFileName, receiveData, function ( err ) {
                if ( err ) {
                    console.log( 'save file to ' + savedFileName + 'fail...' );
                    console.log( err );
                    process.exit( 1 );
                }
                console.log( 'save file ' + savedFileName + ' success [done]' );
                console.log( ( '' + receiveData ).substring( 0, 100 ) + '\n' );

                result.compare.push( { src : filename, min : savedFileName } );
                result.min.push( savedFileName );
                emitter.emit( 'success', filename, savedFileName );

            } );
        } );
    } );
    req.write( querystring.stringify( postData ) );
    req.end();
};

module.exports = {

    compress : function ( filenames, settings, stamp ) {

        result = { compare : [], src : [], min : [], skip : [] };

        settings = settings || {};

        if ( !util.isArray( filenames ) ) {
            filenames = [ filenames ];
        }

        filenames.forEach( function ( filename ) {
            if ( appUtil.isScript( filename ) ) {

                if ( settings.excludes && appUtil.isExclude( filename, settings.excludes ) ) {
                    console.log( 'skip compress ' + filename );
                    result.skip.push( filename );
                } else {
                    result.src.push( filename );
                }

            } else {
                console.log( 'skip compress ' + filename );
                result.skip.push( filename );
            }
        } );

        var requestConfig = {
            host : settings.host,
            port : settings.port || '8081',
            path : '/?name=' + settings.author,
            method : 'POST',
            headers : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Connection' : 'Keep-Alive'
            }
        };

        filenames = result.src;
        var i = 1, len = filenames.length;
        var filename = filenames[ 0 ];

        emitter.on( 'success', function () {
            if ( i < len ) {
                filename = filenames[ i++ ];
                compressOne( filename, requestConfig, stamp );
            } else {
                emitter.emit( 'done', result );
            }
        } );
        compressOne( filename, requestConfig, stamp );
    },
    
    on : function ( topic, callback ) {
        emitter.on( topic, callback );
    }
};
