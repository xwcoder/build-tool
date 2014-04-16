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
