var http = require('http')
http.createServer(function(req, res) {
  res.write('i have no idea what to write')
  res.end()
}).listen(8000)