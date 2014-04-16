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
