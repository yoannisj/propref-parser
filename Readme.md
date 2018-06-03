# crossref-obj

- Usage
    + Flat object properties
    + Accessing nested object properties
- API
- Options
- Examples
    + Custom Key Patterns
    + Dynamic Property Values

## Usage

In order to remain lightweight and customizable, 'crossref-obj' is a *batteries not included* package. Meaning, you have to provide a custom [getter function](#options-getter) to get values from referenced property keys.

### Flat object properties

```js
var CrossRefObj = require('crossref-obj');

var opts = {
    getter: function(props, key, opts) {
        return props[key];
    }
};

var props = {
    foo: true,
    bar: '@{foo}'
};

// instanciate new CrossRefObject
var xObj = new CrossRefObj(props, opts);

xObj.get('bar');
// -> true
```

### Accessing nested object properties

If you want to access nested object properties using '.' separated key paths, we recommend using the [getobject](https://www.npmjs.com/package/getobject) package to define your custom getter:

```js
var CrossRefObj = require('crossref-obj');
var getobject = require('getobject');

var props =
{
    foo: true,
    bar: '@{foo}',

    // nested and relative keys
    nested: {
        foo: false,
        df: '@{foo}', // relative
        rel: '@{-.foo}', // relative
        up: '@{--.foo}', // move up
        abs: '@{.foo}' // absolute
    }
};

CrossRefObj.get('bar');
// -> true

CrossRefObj.parse();
// -> {
//   foo: true,
//   nested: {
//     foo: false,
//     df: false,
//     rel: false,
//     baz: true
//   }
// }
```

The example above also shows support for relative key paths. How nested and relative key paths are formatted can be controlled using the [splitChar](#options-splitchar) and [upLvlChar](#options-uplvlchar) options.

## Constructor arguments

`props` (Object) *required*

Plain properties object, with cross-referencing property values.

`options` (Object) \[{}\]

See [Options](#options) below for documentation and default values.

## API

`.parse( value )` Resolves property references in given value.

`.get( key )` gets resolved value for given property key

`.keyJoin( ..keys )` creates keypath by joining given property keys and resolving relative and absolute patterns.

`.keyResolve( ..keys )` creates keypath by joining given property keys,in the context of `options.keyBase` (will be joined in front of other given keys).

## Options

`options.getter` (Function) *required*

Custom getter function used to return values for referenced property keys.
Signature: `function( props, key, options ) { /*...*/ }`
    - `props` context properties used to resolve given key
    - `key` absolute key to resolve
    - `options` current *CrossRefObj* options

**Important**: This option is required, otherwise referenced property keys can not be resolved. Omitting it will throw an error.

`options.parser` (Function) \[null\]

Custom parser function, ran whenever the CrossRefObject is parsing a property value.
Signature: `funcion( props, value, options ) { /* ... */`
    - `props` context properties used to resolve given key
    - `value` value that is being parsed (with property refernces resolved!)
    - `options` current *CrossRefObj* options

**Important**: Referenced property values are already resolved in the value passed as second argument to custom parser functions.

`options.refPattern` (String | RegExp) \[ /@\{\s*$&\s*\}/ \]

Pattern used to recognize property references in string values.
This option needs to include the `$&` string, used as placeholder for referenced property keys.

`options.keyPattern` (String | RegExp) \[ /[a-zA-Z0-9_]/ \]

Pattern used to recognize property keys in property references.

`options.splitChar` (String | RegExp) \[ /\./ \]

Char(s) separating path levels in property keypaths.

`options.upLevelChar` (String | RegExp) \[ /-/ \]

Char(s) used for moving up in relative keypaths.

## Examples

### Custom key patterns

```js
// Default key patterns
var xObj = new CrossRefObject();
xObj.keyJoin( 'nested.object', '.prop'); // nested.object.prop
xObj.keyJoin( 'nested.object', '-.prop'); // nested.object.prop
xObj.keyJoin( 'nested.object', '--.prop'); // nested.prop
xObj.keyJoin( 'nested.object', '--.--.prop'); // prop
xObj.keyResolve( 'nested.object.--.prop'); // nested.prop
```

```js
// Use *filepath-like* key patterns
var xObj = new CrossRefObject({ /*...*/ }, {
    splitChar: '/',
    upLevelChar: '.'
});

xObj.keyJoin( 'nested/object', '/prop'); // nested/object/prop
xObj.keyJoin( 'nested/object', './prop'); // nested/object/prop
xObj.keyJoin( 'nested/object', '../prop'); // nested/object/prop
xObj.keyJoin( 'nested/object', '../../prop'); // prop
xObj.keyResolve( 'nested/object/../prop'); // nested/prop
```

```js
// Define your own key patterns
var xObj = new CrossRefObject({ /*...*/ }, {
    splitChar: ':',
    upLevelChar: '_'
});

xObj.keyJoin( 'nested:object', ':prop'); // nested:object:prop
xObj.keyJoin( 'nested:object', '_:prop'); // nested:object:prop
xObj.keyJoin( 'nested:object', '__:prop'); // nested:prop
xObj.keyJoin( 'nested:object', '__:__:prop'); // prop
xObj.keyResolve( 'nested:object:__:prop'); // nested:prop
```

### Dynamic property values

Using template strings and the [parser]() option, you can get dynamic property values, based on the other values in your object properties:

```js
var CrossRefObject = require('crossref-obj');
var _templ = require('lodash.template');

var props = {

    foo: true,
    bar: '<% if(@{foo}) { print("yup"); }'
};

var opts = {

    getter: function(props, key, opts) {
        return props[key];
    },

    parser: function(props, val, opts) {
        if (typeof val == 'string') {
            return _templ(val)(props);
        }
    }
};

var xObj = new CrossRefObject(props, opts);
xObj.parse('bar');
// -> {
//    foo: true,
//    bar: "yup"
// }
```

## TODO

- Ignore escaped split and upLevel characters
- Ignore context for absolute keypaths in property references
- Default to simple getter `function(props, key, opts) { return props[key]; }`

- Test loading in AMD
- Test browser global
- Test multiple split and upLevel characters
- Write test suite

- Support advanced keypath using mutliple key adapters –each with their own splitChar, upLevelChar, getter and parser

