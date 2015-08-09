var http = require('http'),
    url = require('url');

var ProxyServer = {
  onRequest: function(client_req, client_res, host, callback) {
    var proxyUrl = url.parse(host);
    var options = {
      path: client_req.url,
      hostname: proxyUrl.hostname,
      port: proxyUrl.port,
      method: client_req.method,
      headers: client_req.headers
    };

    var proxy = http.request(options, function (res) {
      var data = '';
      res.on('data', function(chunk) {
        data += chunk;
      });
      res.on('end', function() {
        //Replace
        callback(res, data);
      });
    }).on('error', function(e) {
      client_res.writeHead(500);
      client_res.write('error: ' + e.toString());
      client_res.end();
    });
    proxy.end();
  }
};

exports.proxyServer = ProxyServer;
