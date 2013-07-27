var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs");

var mimeTypes = {
  "html": "text/html",
  "json": "text/json",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css"
};

exports.server = http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname

  // Our files which are patched into the runtime for 
  if (uri.indexOf('/_patch') === 0) {
    var filename = path.join(__dirname, uri);
  } else {
    var filename = path.join(process.cwd(), uri);
  }

  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    fs.readFile(filename, "binary", function(err, file) {

      if(err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
      response.writeHead(200, mimeType);

      if (mimeType === 'text/html') {
        var matcher = /(.*)<\/body>/;
        var patch = "$1<script type='text/javascript' src='/_patch/json2.js'>\n" +
          "</script><script type='text/javascript' src='/_patch/qunit-plugin.js'>\n" +
          "</script>\n"  +
          "</body>";
        file = file.replace(matcher, patch);
      }


      response.write(file);
      response.end();
    });
  });

});
