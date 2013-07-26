/**
 * @author xcoder
 * 一个简单的半自动化js压缩和ftp文件上传工具。
 *
 * 目标是简化压缩和ftp文件上传流程，防止漏传，传错目录等情况，
 * 并且废弃掉仓库中对压缩文件的版本控制，压缩文件太容易发生合并冲突。
 *
 * 依赖如下包和服务: 
 *  -ftp https://npmjs.org/package/ftp
 *  -incov-lite https://npmjs.org/package/iconv-lite
 *  -内网压缩服务器服务
 *
 * 一般使用流程:
 *  - 将工具目录拷贝到git仓库根目录下, 工具目录命名为build(自定).
 *  - cd build
 *  - 一般执行git log master.. --name-only --pretty=format:'' | sort -u > upload.txt
 *      将本分支上所做修改文件记录到upload.txt; upload.txt也可手工构建，文件路径
 *      可通过settings.pathFile配置指定，也可以通过命令行-f指定.
 *  - git co master, git merge br_v1 (次步骤视情况是否执行，如果实开发/测试阶段跳过)
 *  - node app.js <args1> <args2> ... <argsn>
 *      * -f 制定前步骤产生的upload.txt的全路径，如不指定使用settings中的设置
 *      * -c 只执行压缩
 *      * -p 只执行ftp上传
 *      * -c -p / -cp / -pc 组合-c -p   先执行压缩，再压缩文件和其他非js源文件进行ftp上传
 *      * -i 预留 交互方式 (TODO)
 *  - 执行完毕后会在当前目录下产生log文件log.txt，log文件路径可以通过settings指定.
 *  - 使用log.txt, 可在dict.js, kao.js, inc.js 中替换文件版本号.
 *  - 清理新产生的压缩文件:
 *      - cd .. (cwd 到git仓库根目录下)
 *      - git clean -f 删除仓库中的所有新文件
 *  - 注意: 由于风险原因和服务不改变源文件的前提，当发生异常时给出异常提出并直接退出.
 *
 * 配置项: 详见settings.js
 * 待解决:(TODO)
 *  - -i 开启交互模式
 *  - ftp上传功能只在本机搭建的ftp服务上测试过, 需要更多测试
 *  - 在node v0.10.13下编写并测试，没进行向前兼容测试，目测取决于依赖包对node版本的要求，需要更多测试
 *  - 路径处理部分没做跨平台，目测在win下不能工作
 *      - 需要更多测试
 *      - 使用Path.sep, 并且要兼容upload.txt中文件的格式(TODO)
 */
var fs = require( 'fs' );
var settings = require( './settings' );
var compressor = require( './compressor' );
var ftpuploader = require( './ftpuploader' );
var appUtil = require( './util' );

// 处理命令行参数
// 命令行状态机
var commond = {};
var args = process.argv.slice( 2 );

args.forEach( function ( arg, index ) {
    if ( arg == '-f' && args[ index + 1 ] ) {
        settings.pathFile = args[ index + 1 ];
    } else {
        if ( /^-/.test( arg ) ) {
            arg = arg.replace( '-', '' ).split( '' );
            arg.forEach( function ( arg ) {
                commond[ '-' + arg ] = true;
            } );
        } else {
            commond[ arg ] = true;
        }
    }
} );

if ( !commond[ '-c' ] && !commond[ '-p' ] ) {
    commond[ '-c' ] = true;
}

var logFile = settings.logFile;
// 获取要处理的文件名集合
var filenames = fs.readFileSync( settings.pathFile, { encoding : 'utf-8' } );

filenames = filenames.split( '\n' );
filenames = filenames.filter( function ( filename ) {
    return filename && filename.trim();
} );

filenames = filenames.map( function ( filename ) {
    return '../' + filename;
} );

var stamp = ( function () {
    var addPrefix = function ( n ) {
        if ( n < 10 ) {
            return '0' + n;
        }
        return n;
    };
    var date = new Date();
    var y = ( '' + date.getFullYear() ).substring( 2 );
    var m = addPrefix( date.getMonth() + 1 );
    var d = addPrefix( date.getDate() );
    var h = addPrefix( date.getHours() );
    var mi = addPrefix( date.getMinutes() );
    var s = addPrefix( date.getSeconds() );
    return y + m + d + h + mi + s;
} )();

//压缩 对应指令 -c
var compress = function () {

    compressor.on( 'done', function ( result ) {

        var data = '===' + stamp + '===\n';
        
        data += '\ncompressd:\n';
        result.min.forEach( function ( filename ) {
            data += filename.replace( '../', '' ) + '\n';
        } );

        data += '\nskipd:\n';
        result.skip.forEach( function ( filename ) {
            data += filename.replace( '../', '' ) + '\n';
        } );

        fs.writeFileSync( logFile, data );
    } );
    
    console.log( '====== start compress ======' );
    compressor.compress( filenames, settings.compressor, stamp );
};

//上传 对应指令 -p
var upload = function () {

    ftpuploader.on( 'done', function ( result ) {

        var data = '===' + stamp + '===\n';
        
        data += '\nupload:\n';
        result.upload.forEach( function ( filename ) {
            data += filename.replace( '../', '' ) + '\n';
        } );

        data += '\nskipd:\n';
        result.skip.forEach( function ( filename ) {
            data += filename.replace( '../', '' ) + '\n';
        } );

        fs.writeFileSync( logFile, data );
    } );

    console.log( '====== start upload ======' );
    ftpuploader.upload( filenames, settings.ftp );
};

//压缩并上传 对应指令-c -p 组合
var compressAndUpload = function () {

    var compressResult, uploadResult;

    compressor.on( 'done', function ( result ) {

        console.log( '====== start upload ======' );
        compressResult = result;

        ftpuploader.on( 'done', function ( result ) {

            uploadResult = result;

            var data = '===' + stamp + '===\n';

            data += '\ncompressed:\n';
            compressResult.min.forEach( function ( filename ) {
                data += filename.replace( '../', '' ) + '\n';
            } );

            data += '\nskip compress:\n';
            compressResult.skip.forEach( function ( filename ) {
                data += filename.replace( '../', '' ) + '\n';
            } );

            data += '\nupload:\n';
            uploadResult.upload.forEach( function ( filename ) {
                data += filename.replace( '../', '' ) + '\n';
            } );

            data += '\nskip upload:\n';
            uploadResult.skip.forEach( function ( filename ) {
                data += filename.replace( '../', '' ) + '\n';
            } );
            
            data += '\nonline url:\n';
            var prefixMap = {
                js : 'http://js.tv.itc.cn/',
                css : 'http://css.tv.itc.cn/',
                img : 'http://img.tv.itc.cn/',
            };
            uploadResult.upload.forEach( function ( filename ) {
                filename = filename.replace( '../', '' ).replace(/^\//, '' );
                var m = /^(.+?)\//.exec( filename );
                if ( m && m.length ) {
                    data += prefixMap[ m[ 1 ] ] + filename + '\n';
                }
            } );

            fs.writeFileSync( logFile, data );

        } );

        ftpuploader.upload( result.min.concat( result.skip ), settings.ftp );
    } );

    console.log( '====== start compress ======' );
    compressor.compress( filenames, settings.compressor, stamp );
};

// 有限状态机，待优化
if ( commond[ '-c' ] && commond[ '-p' ] ) {

    compressAndUpload();

} else if ( commond[ '-p' ] ) {

    upload( filenames, settings.ftp );

} else if ( commond[ '-c' ] ) {
    compress( filenames, settings.compressor, stamp );
}
