/**
 * @author xwcoder
 * ftp上传服务
 * 
 * 模块提供两个方法:
 *  upload( <Array|String>filenames, <Object>settings )
 *      - filename 要压缩的文件名[集合]
 *      - setttings ftp服务器的配置信息
 *          host : 地址
 *          port : 端口
 *          user : 用户名
 *          password : 密码
 *
 *          exclude <Array> : 不上传文件过滤器, 每一项可以是:
 *              - string : 相等匹配
 *              - RegExp : 正则配置
 *              - function( filename ) : return true 匹配; return false 不匹配
 *  on( <String>topic, <Function>callback ), 支持两个事件:
 *      -success 单个文件上传成功 callback接收两个参数srcfilename destfilename
 *      -done 全部文件压缩成功 callback接收一个对象参数result, 包含如下:
 *          - upload [String] : 全部上传文件名
 *          - skip [String] : 跳过上传的文件名
 *      
 */
var FTPClient = require( 'ftp' );
var Emitter = require( 'events' ).EventEmitter;
var util = require( 'util' );
var appUtil = require( './util' );

var ftp = new FTPClient();
var emitter = new Emitter();

var result = { upload : [], skip : [] };

var uploadOne = function ( filename ) {
    var destFilename = filename.replace( '../', '' );
    var dir = destFilename.substring( 0, destFilename.lastIndexOf( '/' ) );
    ftp.mkdir( dir, true, function ( err ) {
        if ( err ) {
            console.log( err );
            process.exit( 1 );
        }

        appUtil.log( 'uploading ' + filename + ' ...' );

        ftp.put( filename, destFilename, function ( err ) {
            if ( err ) {
                console.log( err );
                ftp.end();
                process.exit( 1 );
            }

            appUtil.log( 'upload success ' + filename + ' [done]\n' );

            emitter.emit( 'success' );
        } );
    } );
};

module.exports = {

    upload : function ( filenames, settings ) {

        result = { upload : [], skip : [] };

        if ( !util.isArray( filenames ) ) {
            filenames = [ filenames ];
        }

        filenames.forEach( function ( filename ) {

            if ( settings.excludes && appUtil.isExclude( filename, settings.excludes ) ) {
                console.log( 'skip ' + filename );
                result.skip.push( filename );
            } else {
                result.upload.push( filename );
            }

        } );

        ftp.on( 'ready', function () {

            //ftp.cwd( 'online', function ( err, dir ) {
            //    if ( err ) {
            //        console.log( err );
            //        process.exit( 0 );
            //    }
                
                var filenames = result.upload;
                var i = 1, len = filenames.length;
                var filename = filenames[ 0 ];

                emitter.on( 'success', function () {
                    if ( i < len ) {

                        filename = filenames[ i++ ];
                        uploadOne( filename );

                    } else {
                        ftp.destroy();
                        emitter.emit( 'done', result );
                    }
                } );

                uploadOne( filename );
            //} );
        } );
        var config = {
            host : settings.host,
            port : settings.port,
            user : settings.user,
            password : settings.password
        };
        ftp.connect( config );
    },
    on : function ( topic, callback ) {
        emitter.on( topic, callback );
    }
};
