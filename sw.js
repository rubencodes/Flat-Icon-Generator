/* Cache Polyfill https://github.com/coonsta/cache-polyfill/blob/master/index.js */
Cache.prototype.addAll||(Cache.prototype.addAll=function(t){function e(t){this.name='NetworkError',this.code=19,this.message=t}var r=this;return e.prototype=Object.create(Error.prototype),Promise.resolve().then(function(){if(arguments.length<1)throw new TypeError;return t=t.map(function(t){return t instanceof Request?t:String(t)}),Promise.all(t.map(function(t){"string"==typeof t&&(t=new Request(t));var r=new URL(t.url).protocol;if("http:"!==r&&"https:"!==r)throw new e("Invalid scheme");return fetch(t.clone())}))}).then(function(e){return Promise.all(e.map(function(e,n){return r.put(t[n],e)}))}).then(function(){return void 0})});
/* ------------- */

importScripts('/js/sw-toolbox/sw-toolbox.js');

//do what's fastest and update the cache
toolbox.router.default = toolbox.fastest;
toolbox.router.any('/(.*)', toolbox.cacheFirst, { origin: 'https://ajax.googleapis.com' });
toolbox.router.any('/(.*)', toolbox.cacheFirst, { origin: 'https://maxcdn.bootstrapcdn.com' });
toolbox.router.any('/(.*)', toolbox.cacheFirst, { origin: 'https://code.ionicframework.com/' });

const urlsToCache = [
  '/index.html',
  '/sw_install.js',
  '/sw.js',
  '/js/sw-toolbox/sw-toolbox.js',
  '/js/libraries_1.1.min.js',
  '/css/libraries_1.1.min.css',
  '/img/bolt.png',
  '/img/favicon.png'
];

toolbox.precache(urlsToCache);
