'use strict';

// ============================================================================
// =CrossCrossRefObject
// ============================================================================

var escapeRe = require('lodash.escaperegexp');

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

var CrossRefObject = module.exports = function( props, options )
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
        splitSource = escapeRe(options.splitChar),
        upLvlSource = escapeRe(options.upLevelChar),
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

// =keyJoin( crObj, keys )
// ----------------------------------------------------------------------------

var keyJoin = function( crObj, keys )
{
    var options = crObj.options,
        res = keys.join(options.splitChar),
        matches, matchLn, pre, suf, upLvl;

    // get strings and regular expressions based on options
    crObj._splitSource = crObj._splitSource || escapeRe(options.splitChar);
    crObj._upLvlSource = crObj._upLvlSource || escapeRe(options.upLevelChar);
    crObj._doubleSplitRe = crObj._doubleSplitRe || new RegExp('(?:' + crObj._splitSource + '){2}', 'g');
    crObj._initSplitRe = crObj._initSplitRe || new RegExp('^(?:' + crObj._splitSource + ')');
    crObj._relRe = crObj._relRe || new RegExp('(?:' + crObj._upLvlSource + '{1}' + crObj._splitSource + ')+', 'g');
    crObj._upLvlRe = crObj._upLvlRe || new RegExp('(?:' + crObj._upLvlSource + '{2}' + crObj._splitSource + ')+', 'g');
    crObj._relStr = crObj._relStr || options.upLevelChar + options.splitChar;
    crObj._upLvlStr = crObj._upLvlStr || options.upLevelChar + options.upLevelChar + options.splitChar;

    // resolve relative key segments
    while ((matches = crObj._upLvlRe.exec(res)) !== null)
    {
        matchLn = matches[0].length;
        upLvl = matchLn / crObj._upLvlStr.length;
        pre = res.slice(0, matches.index - 1).split(options.splitChar);
        suf = res.slice(matches.index + matchLn);

        // remove keys
        if (upLvl <= pre.length) {
            pre = pre.slice(0, -1 * upLvl)
        }

        // re-assemble key
        res = pre.join(options.splitChar) + options.splitChar + suf;

        // make sure we don't start looking after last rel char(s)
        crObj._upLvlRe.lastIndex = 0;
    }

    // remove same level relative segments
    res = res.replace(crObj._relRe, options.splitChar)
        // remove double split characters
        .replace(crObj._doubleSplitRe, options.splitChar)
        // remove initial split characters (empty keyBase and absolute paths)
        .replace(crObj._initSplitRe, '');

    return res;
};

// =parseValue( crObj, val[, _context ])
// ----------------------------------------------------------------------------

var parseValue = function( crObj, val, _context )
{
    // use reference object options
    var options = crObj.options;

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
            res[i] = parseValue(crObj, val[i], _context);
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
            res[key] = parseValue(crObj, val[key], _context.concat([key]));
        }

        return res;
    }

    // adjust context for none-object values
    if (_context.length) _context.pop();

    // inspect string values from the start again
    crObj._refRe.lastIndex = 0;

    var matches, match, matchLn, key;
    while (typeof val == 'string' && (matches = crObj._refRe.exec(val)) !== null)
    {
        match = matches[0];
        matchLn = match.length;
        key = crObj.keyResolve(_context.join(options.splitChar), matches[1]);

        // optionally preserve data type if this was an exact reference match
        if (options.preserveDataType && match.length == matches.input.length) {
            val = crObj.get(key, options);
        }

        // or interpolate value in parsed string
        else {
            val = val.replace(match, crObj.get(key, options));
        }

        // make sure we inspect the string from the start again
        crObj._refRe.lastIndex = 0;
    }

    // optionally parse string values using custom parser
    if (typeof val == 'string' && crObj.parser && typeof crObj.parser == 'function') {
        val = crObj.parser(crObj.props, val, crObj.options);
    }

    return val;
};


