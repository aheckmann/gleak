
var http = require('http')

// make requests to the server
var request = module.exports = function request (o, cb ) {
  if (!request.address) throw new Error('missing host/port');
  return new Request;
}

function Request () {
  this.host = request.address.address;
  this.port = request.address.port;
  this.path;
  this.method;
  this.headers = {};
  this.data= [];
}

Request.prototype.post = function (path) {
  this.path = path;
  this.method = 'post';
  return this;
}
Request.prototype.get= function (path) {
  this.path = path;
  this.method = 'get';
  return this;
}
Request.prototype.header = function (key, val) {
  this.headers[key] = val;
  return this;
}
Request.prototype.write = function (data) {
  this.data.push(data);
  return this;
}
Request.prototype.end = function (cb) {
  var req = http.request({
      method: this.method
    , host: this.host
    , port: this.port
    , path: this.path || '/'
    , headers: this.headers
  });

  this.data.forEach(function (data) {
    req.write(data);
  });

  req.on('response', function (res) {
    var buf = '';
    res.setEncoding('utf8');
    res.on('data', function (data) {
      buf += data;
    });
    res.on('end', function () {
      res.body = buf;
      cb(res);
    });
  });
  req.end();
}
