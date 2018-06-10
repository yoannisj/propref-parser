var PropRefParser = require('./ProprefParser');
var ObjBaseProp = require('obj-baseprop');

var props = {

    '*': {
        devMode: false,
        includeScriptUrl: false
    },

    dev: {
       devMode: true,
       siteUrl: 'https://www.example.test',
       prodUrl: '@{ .prod.siteUrl }',
       prodDevMode: '@{ .prod.devMode }'
    },

    prod: {
        siteUrl: 'https://www.example.com',
        enableCache: true
    }

};

var opts = {

    getter: function(props, key, options) {
        return ObjBaseProp.get(props, key);
    }

};

var parser = new PropRefParser(props, opts);


console.log(ObjBaseProp.get(props, 'dev'));
console.log('---');
console.log(parser.getter(props, 'dev'));
console.log('---');
console.log(parser.get('dev'));