'use strict';

// Universal Module defined using the 'returnExportsGlobal' patten:
// https://github.com/umdjs/umd/blob/master/templates/returnExportsGlobal.js

// Uses Node, AMD or browser globals to create a module. This pattern creates
// a global even when AMD is used. This is useful if you have some scripts
// that are loaded by an AMD loader, but they still want access to globals.

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['lodash/escapeRegExp'], function (escapeRegExp) {
            return (root.PropRefParser = factory(escapeRegExp));
        });
    } else if (typeof module === 'object' && module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory(require('lodash.escaperegexp'));
    } else {
        // Browser globals
        root.PropRefParser = factory(root.escapeRegExp);
    }
}(typeof self !== 'undefined' ? self : this, function (escapeRegExp) {

// ============================================================================
// =PropRefParser
// ============================================================================

var dfGetter = function(props, key, options) {
    return props[key];
};

var defaults = {

    getter: dfGetter,
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

var PropRefParser = function( props, options )
{
    // attach reference to given properties
    this.props = props;

    // inject defaults and attach reference to resulting options
    this.options = Object.assign({}, defaults, options || {});

    // attach reference to getter and parser functions
    this.getter = this.options.getter;
    this.parser = this.options.parser;

    // compute RegExp used to find references
    Object.defineProperty(this, '_refRe', {
        writable: false,
        enumerable: false,
        value: computeRefRe(this.options)
    });

    // compute Regexp to identify absolute keys
    Object.defineProperty(this, '_absoluteRe', {
        writable: false,
        enumerable: false,
        value: new RegExp('^(?:' + escapeRegExp(this.options.splitChar) + ').+')
    });
};

// =Public API
// ============================================================================

// =keyJoin( ..keys )
// ----------------------------------------------------------------------------

PropRefParser.prototype.keyJoin = function()
{
    // make sense out of given arguments
    var keys = Array.prototype.slice.call(arguments);

    return keyJoin(this, keys);
};

// =keyResolve( ..keys )
// ----------------------------------------------------------------------------

PropRefParser.prototype.keyResolve = function()
{
    // make sense out of given arguments
    var keys = Array.prototype.slice.call(arguments);

    // start relative keys with key base from options
    if (this.options.keyBase != '' && !this._absoluteRe.test(keys[0])) {
        keys.unshift(this.options.keyBase);
    }

    return keyJoin(this, keys);
};

// =get( key )
// ----------------------------------------------------------------------------

PropRefParser.prototype.get = function( key )
{
    // use getter to retrieve value, and parse it before caching it
    var val = this.getter(this.props, key, this.options);

    // and parse it before returing (allows recursving parsing)
    return this.parse(val, key);
};

// =parse( val )
// ----------------------------------------------------------------------------

PropRefParser.prototype.parse = function( val, context )
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

// =keyJoin( parser, keys )
// ----------------------------------------------------------------------------

var keyJoin = function( parser, keys )
{
    var options = parser.options,
        res = keys.join(options.splitChar),
        matches, matchLn, pre, suf, upLvl;

    // get strings and regular expressions based on options
    parser._splitSource = parser._splitSource || escapeRegExp(options.splitChar);
    parser._upLvlSource = parser._upLvlSource || escapeRegExp(options.upLevelChar);
    parser._doubleSplitRe = parser._doubleSplitRe || new RegExp('(?:' + parser._splitSource + '){2}', 'g');
    parser._initSplitRe = parser._initSplitRe || new RegExp('^(?:' + parser._splitSource + ')');
    parser._relRe = parser._relRe || new RegExp('(?:' + parser._upLvlSource + '{1}' + parser._splitSource + ')+', 'g');
    parser._upLvlRe = parser._upLvlRe || new RegExp('(?:' + parser._upLvlSource + '{2}' + parser._splitSource + ')+', 'g');
    parser._relStr = parser._relStr || options.upLevelChar + options.splitChar;
    parser._upLvlStr = parser._upLvlStr || options.upLevelChar + options.upLevelChar + options.splitChar;

    // resolve relative key segments
    while ((matches = parser._upLvlRe.exec(res)) !== null)
    {
        matchLn = matches[0].length;
        upLvl = matchLn / parser._upLvlStr.length;
        pre = res.slice(0, matches.index - 1).split(options.splitChar);
        suf = res.slice(matches.index + matchLn);

        // remove keys
        if (upLvl <= pre.length) {
            pre = pre.slice(0, -1 * upLvl)
        }

        // re-assemble key
        res = pre.join(options.splitChar) + options.splitChar + suf;

        // make sure we don't start looking after last rel char(s)
        parser._upLvlRe.lastIndex = 0;
    }

    // remove same level relative segments
    res = res.replace(parser._relRe, options.splitChar)
        // remove double split characters
        .replace(parser._doubleSplitRe, options.splitChar)
        // remove initial split characters (empty keyBase and absolute paths)
        .replace(parser._initSplitRe, '');

    return res;
};

// =parseValue( parser, val[, _context ])
// ----------------------------------------------------------------------------

var parseValue = function( parser, val, _context )
{
    // use reference object options
    var options = parser.options;

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
            res[i] = parseValue(parser, val[i], _context);
        }

        return res;
    }

    else if (val && typeof val == 'object')
    {
        var res = {},
            keyBase = options.keyBase || '',
            keys = Object.keys(val),
            key;

        for (var i = 0, ln = keys.length; i<ln; i++)
        {
            key = keys[i];

            // parse nested value
            res[key] = parseValue(parser, val[key], _context.concat([key]));
        }

        return res;
    }

    // adjust context for none-object values
    if (_context.length) _context.pop();

    // inspect string values from the start again
    parser._refRe.lastIndex = 0;

    var matches, match, matchLn, key;
    while (typeof val == 'string' && (matches = parser._refRe.exec(val)) !== null)
    {
        match = matches[0];
        matchLn = match.length;

        // contextualize relative keys
        if (!parser._absoluteRe.test(matches[1])) {
            key = parser.keyResolve(_context.join(options.splitChar), matches[1]);
        } else {
            key = parser.keyResolve(matches[1]);
        }

        // optionally preserve data type if this was an exact reference match
        if (options.preserveDataType && match.length == matches.input.length) {
            val = parser.get(key, options);
        }

        // or interpolate value in parsed string
        else {
            val = val.replace(match, parser.get(key, options));
        }

        // make sure we inspect the string from the start again
        parser._refRe.lastIndex = 0;
    }

    // optionally parse string values using custom parser
    if (typeof val == 'string' && parser.parser && typeof parser.parser == 'function') {
        val = parser.parser(parser.props, val, parser.options);
    }

    return val;
};


// Export the PropRefParser constructor
return PropRefParser;

}));