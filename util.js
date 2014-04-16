var util = require( 'util' );
var path = require( 'path' );

var appUtil = {

    sleep : function ( m ) {
        var time = m + Date.now();
        while ( Date.now() < time ) { }
    },

    log : function ( msg ) {
        console.log( msg );
        this.sleep( 100 );
    },

    isScript : function ( filename ) {
        //return /\.js(?=[\?#]|$)/i.test( filename || '' );
        return path.extname( filename ) == '.js';
    },

    isString : function ( s ) {
        return Object.prototype.toString.call( s ) === '[object String]';
    },

    isFunction : function ( f ) {
        return Object.prototype.toString.call( f ) === '[object Function]';
    },
    
    isExclude : function ( filename, excludes ) {

        if ( !util.isArray( excludes ) ) {
            excludes = [ excludes ];
        }

        var isExclude = false;
        var tp = this;
        var matchOne = function ( filename, rule ) {
            if ( tp.isString( rule ) ) {
                return filename == rule;
            } else if ( util.isRegExp( rule ) ) {
                return rule.test( filename );
            } else if ( tp.isFunction( rule ) ) {
                return !!rule( filename );
            }
            return false;
        };

        for ( var i = 0, len = excludes.length; i < len; i++ ) {
            if ( matchOne( filename, excludes[ i ] ) ) {
                isExclude = true;
                break;
            }
        }
        return isExclude;
    },

    isEmptyString : function ( s ) {
        return !s|| !s.trim();
    }
};

module.exports = appUtil;
