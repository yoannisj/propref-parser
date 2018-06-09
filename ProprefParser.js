'use strict';

// Uses Node, AMD or browser globals to create a module. This example creates
// a global even when AMD is used. This is useful if you have some scripts
// that are loaded by an AMD loader, but they still want access to globals.
// If you do not need to export a global for the AMD case,
// see returnExports.js.

// If you want something that will work in other stricter CommonJS environments,
// or if you need to create a circular dependency, see commonJsStrictGlobal.js

// Defines a module "returnExportsGlobal" that depends another module called
// "b". Note that the name of the module is implied by the file name. It is
// best if the file name and the exported global have matching names.

// If the 'b' module also uses this type of boilerplate, then
// in the browser, it will create a global .b that is used below.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['lodash/escapeRegExp'], function (escapeRegExp) {
            return (root.CrossRefObject = factory(escapeRegExp));
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('lodash.escaperegexp'));
    } else {
        // Browser globals
        root.CrossRefObject = factory(root.escapeRegExp);
    }
}(typeof self !== 'undefined' ? self : this, function (escapeRegExp) {

// ============================================================================
// =CrossCrossRefObject
// ============================================================================

var defaults = {

    getter: null,
    parser: null,

    // Pattern used to recognize property references
    refPattern: /@\{\s*$&\s*\}/g,

    // Pattern used to recognize property keys in property references.
    keyPattern: '[a-zA-Z0-9_]+',

    // Char(s) separating path levels in property keypaths.
    splitChar: '.',

    // Char(s) used for moving up in relative keypaths.
    upLevelChar: '-',

    // Base used for resolving keys
    keyBase: '',

    // Whether data-type of parsed values should be preserved whenever possible
    preserveDataType: true

};

// =Constructor
// ============================================================================

var CrossRefObject = function( props, options )
{
    // attach reference to given properties
    this.props = props;

    // inject defaults and attach reference to resulting options
    this.options = Object.assign({}, defaults, options || {});

    // verify getter and attach reference if valid
    if (!this.options.getter || typeof this.options.getter != 'function') {
        throw new Error('CrossRefObject: `getter` option must be a function, '
            + 'used to return referenced property values.');
    }

    this.getter = this.options.getter;
    this.parser = this.options.parser;

    // compute RegExp used to find references
    Object.defineProperty(this, '_refRe', {
        writable: false,
        enumerable: false,
        value: computeRefRe(this.options)
    });
};

// =Public API
// ============================================================================

// =keyJoin( ..keys )
// ----------------------------------------------------------------------------

CrossRefObject.prototype.keyJoin = function()
{
    // make sense out of given arguments
    var keys = [].slice.call(arguments);

    return keyJoin(this, keys);
};

// =keyResolve( ..keys )
// ----------------------------------------------------------------------------

CrossRefObject.prototype.keyResolve = function()
{
    // make sense out of given arguments
    var keys = [].slice.call(arguments);

    // start with key base from options
    if (this.options.keyBase != '') {
        keys.unshift(this.options.keyBase);
    }

    return keyJoin(this, keys);
};

// =get( key )
// ----------------------------------------------------------------------------

CrossRefObject.prototype.get = function( key )
{
    // use getter to retrieve value, and parse it before caching it
    var val = this.getter(this.props, key, this.options);

    // and parse it before returing (allows recursving parsing)
    return this.parse(val, key);
};

// =parse( val )
// ----------------------------------------------------------------------------

CrossRefObject.prototype.parse = function( val, context )
{
    // parse own props if no value was given
    if (arguments.length == 0) {
        val = this.props;
    }

    val = parseValue(this, val, context);

    return val;
};

// =Private API
// ============================================================================

// =computeRefRe( options )
// ----------------------------------------------------------------------------

var computeRefRe = function( options )
{
    // get segment sources from given options
    var refSource = (options.refPattern.source || refPattern),
        keySource = (options.keyPattern.source || options.keyPattern),
        splitSource = escapeRegExp(options.splitChar),
        upLvlSource = escapeRegExp(options.upLevelChar),
        absSource, relSource, startSource;

    // build full key source
    absSource = splitSource + '?';
    relSource = '(?:' + upLvlSource + '{1,2}' + splitSource + ')+';
    startSource = '(?:' + absSource + '|' + relSource + ')?';
    keySource = '(?:' + absSource + '|' + relSource + ')?' + keySource +
        '(?:' + splitSource + '(?:' + relSource + ')?' + keySource + ')*';

    // wrap with delimiters and return regexp
    return new RegExp( refSource.replace('$&', '(' + keySource + ')'), 'g');
};

// =keyJoin( xObj, keys )
// ----------------------------------------------------------------------------

var keyJoin = function( xObj, keys )
{
    var options = xObj.options,
        res = keys.join(options.splitChar),
        matches, matchLn, pre, suf, upLvl;

    // get strings and regular expressions based on options
    xObj._splitSource = xObj._splitSource || escapeRegExp(options.splitChar);
    xObj._upLvlSource = xObj._upLvlSource || escapeRegExp(options.upLevelChar);
    xObj._doubleSplitRe = xObj._doubleSplitRe || new RegExp('(?:' + xObj._splitSource + '){2}', 'g');
    xObj._initSplitRe = xObj._initSplitRe || new RegExp('^(?:' + xObj._splitSource + ')');
    xObj._relRe = xObj._relRe || new RegExp('(?:' + xObj._upLvlSource + '{1}' + xObj._splitSource + ')+', 'g');
    xObj._upLvlRe = xObj._upLvlRe || new RegExp('(?:' + xObj._upLvlSource + '{2}' + xObj._splitSource + ')+', 'g');
    xObj._relStr = xObj._relStr || options.upLevelChar + options.splitChar;
    xObj._upLvlStr = xObj._upLvlStr || options.upLevelChar + options.upLevelChar + options.splitChar;

    // resolve relative key segments
    while ((matches = xObj._upLvlRe.exec(res)) !== null)
    {
        matchLn = matches[0].length;
        upLvl = matchLn / xObj._upLvlStr.length;
        pre = res.slice(0, matches.index - 1).split(options.splitChar);
        suf = res.slice(matches.index + matchLn);

        // remove keys
        if (upLvl <= pre.length) {
            pre = pre.slice(0, -1 * upLvl)
        }

        // re-assemble key
        res = pre.join(options.splitChar) + options.splitChar + suf;

        // make sure we don't start looking after last rel char(s)
        xObj._upLvlRe.lastIndex = 0;
    }

    // remove same level relative segments
    res = res.replace(xObj._relRe, options.splitChar)
        // remove double split characters
        .replace(xObj._doubleSplitRe, options.splitChar)
        // remove initial split characters (empty keyBase and absolute paths)
        .replace(xObj._initSplitRe, '');

    return res;
};

// =parseValue( xObj, val[, _context ])
// ----------------------------------------------------------------------------

var parseValue = function( xObj, val, _context )
{
    // use reference object options
    var options = xObj.options;

    // accept a key as context
    if (typeof _context == 'string') {
        _context = _context.split(options.splitChar);
    }

    // default to empty context array
    _context = _context || [];

    if (Array.isArray(val))
    {
        var res = [];

        // parse each value individualy
        for (var i = 0, ln = val.length; i<ln; i++) {
            res[i] = parseValue(xObj, val[i], _context);
        }

        return res;
    }

    else if (typeof val == 'object')
    {
        var res = {},
            keyBase = options.keyBase || '',
            keys = Object.keys(val),
            key;

        for (var i = 0, ln = keys.length; i<ln; i++)
        {
            key = keys[i];

            // parse nested value
            res[key] = parseValue(xObj, val[key], _context.concat([key]));
        }

        return res;
    }

    // adjust context for none-object values
    if (_context.length) _context.pop();

    // inspect string values from the start again
    xObj._refRe.lastIndex = 0;

    var matches, match, matchLn, key;
    while (typeof val == 'string' && (matches = xObj._refRe.exec(val)) !== null)
    {
        match = matches[0];
        matchLn = match.length;
        key = xObj.keyResolve(_context.join(options.splitChar), matches[1]);

        // optionally preserve data type if this was an exact reference match
        if (options.preserveDataType && match.length == matches.input.length) {
            val = xObj.get(key, options);
        }

        // or interpolate value in parsed string
        else {
            val = val.replace(match, xObj.get(key, options));
        }

        // make sure we inspect the string from the start again
        xObj._refRe.lastIndex = 0;
    }

    // optionally parse string values using custom parser
    if (typeof val == 'string' && xObj.parser && typeof xObj.parser == 'function') {
        val = xObj.parser(xObj.props, val, xObj.options);
    }

    return val;
};


// Export the CrossRefObject constructor
return CrossRefObject;

}));