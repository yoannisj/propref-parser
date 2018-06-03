
var str= "nested.foo.bar",
      splitChar = '\\.',
      re;

splitChar = splitChar.source || splitChar;
re = new RegExp(splitChar, 'g');

console.log( splitChar, '–', re );
console.log( str.split(re) );

// var RefObject = require('./index');
// var getobject = require('getobject');
// var _templ = require('lodash.template');

// var props = {
//     foo: true,
//     str: 'hello world',
//     bar: '@{ foo }',
//     array: [ '@{nested.bar}', 10, 'hello' ],
//     eval: '<% if (@{bar}) { print("yup"); } else { print("nope"); } %>',
//     intpl: '<% print("@{str}"); %>',

//     nested: {
//         foo: false,
//         bar: '@{ foo }',
//         array: [ '@{ --.bar }', 20, 'world' ],
//         eval: '<% if (@{bar}) { print("yup"); } else { print("nope"); } %>',
//         intpl: '<%= @{bar} %>',
//         cycle: '<% print("@{--.intpl}"); %>'
//     }
// };

// var getter = function(props, key, opts) {
//     return getobject.get(props, key);
// };

// var parser = function(props, val, opts) {
//     return _templ(val)();
// };

// var opts = {
//     getter: getter,
//     parser: parser
// };

// var rObj = new RefObject(props, opts);

// var parsed = rObj.parse();
// console.log(rObj.props);
// console.log('======');
// console.log('->',  parsed);
// // console.log('---');
// // console.log('nested.bar ->', parsed['nested']['bar']);