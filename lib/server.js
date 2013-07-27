var http = require("http"),
    url = require("url"),
    path = require("path"),
    fs = require("fs"),
    qs = require("querystring");

var mimeTypes = {
  "html": "text/html",
  "json": "text/json",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css"
};

function handleFile (filename, request, response) {
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

      scripts = [
        'json2.js',
        'browserstack.js',
        'qunit-plugin.js'
      ]
 
      if (mimeType === 'text/html') {
        var matcher = /(.*)<\/body>/;
        var patch = "$1";
        scripts.forEach(function (script) {
          patch += "<script type='text/javascript' src='/_patch/" + script + "'></script>\n";
        });
        patch += "</body>";

        file = file.replace(matcher, patch);
      }


      response.write(file);
      response.end();
    });
  });
}

function parseBody(body) {
  return JSON.parse(qs.parse(body).data);
}

handlers = {
  "_progress": function progressHandler(uri, body, request, response) {
    query = parseBody(body);

    // console.log("Tests run:", query.tests_run);
    // if (query.tracebacks) {
    //   query.tracebacks.forEach(function (traceback) {
    //     console.log("Error:", traceback);
    //   });
    // }
    response.end();
  },
  "_report": function reportHandler(uri, body, request, response) {
    query = parseBody(body);


    console.log("Ran", query.total, "tests");
    console.log(query.passed.toString() + " passed,",
                query.failed.toString() + " failed");
    console.log("Runtime:", query.runtime, "seconds.");

    if (query.tracebacks.length > 0) {
      console.log("Tracebacks:");
      query.tracebacks.forEach(function (traceback) {
        console.log(traceback);
      });
    }

    response.end();
  },
  "_log": function logHandler(uri, body, request, response) {
    query = parseBody(body);
    console.log(query);
    response.end();
  },
  "_patch": function patchHandler(uri, body, request, response) {
    handleFile(path.join(__dirname, uri), request, response);
  },
  "_default": function defaultHandler(uri, body, request, response) {
    handleFile(path.join(process.cwd(), uri), request, response);
  }
}

exports.server = http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname;
  var method = uri.split('/')[1];
  var filename;

  var body = '';

  request.on('data', function (data) {
    body += data;
  });
  request.on('end', function () {
    (handlers[method] || handlers._default)(uri, body, request,
                                            response)
  });
});
