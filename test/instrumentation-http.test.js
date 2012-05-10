var should  = require('should')
  , path    = require('path')
  , http    = require('http')
  , request = require('request')
  , mocker  = require(path.join(__dirname, 'lib', 'mock_connection'))
  , NR      = require(path.join(__dirname, '..', 'lib', 'newrelic_agent.js'))
  ;

describe('agent instrumentation of the http module', function () {
  var agent
    , fetchedResponse
    , fetchedBody;

  var PAGE = '<html><head><title>test response</title></head><body><p>I heard you like HTML.</p></body></html>';

  before(function (done) {
    var connection = new mocker.Connection();
    agent = new NR({connection : connection});

    var server = http.createServer(function (request, response) {
      response.writeHead(200, {'Content-Length' : PAGE.length, 'Content-Type' : 'text/html'});
      response.end(PAGE);
    });

    server.listen(8123, 'localhost', function () {
      request.get('http://localhost:8123/path', function (error, response, body) {
        if (error) return done(error);

        fetchedResponse = response;
        fetchedBody = body;

        return done();
      });
    });
  });

  it("should successfully fetch the page", function (done) {
    fetchedResponse.statusCode.should.equal(200);

    should.exist(fetchedBody);
    fetchedBody.should.equal(PAGE);

    return done();
  });

  it("should record unscoped path stats after a normal request", function (done) {
    var pathStats = JSON.stringify(agent.statsEngine.unscopedStats.byName('WebTransaction/Uri/path'));
    should.exist(pathStats);
    pathStats.should.match(/^\[[0-9.,]+\]$/);

    return done();
  });

  it("should indicate that the http dispatcher is in play", function (done) {
    agent.environment.toJSON().should.includeEql(['Dispatcher', 'http']);

    return done();
  });

  it("should record unscoped HTTP dispatcher stats after a normal request", function (done) {
    var dispatchStats = JSON.stringify(agent.statsEngine.unscopedStats.byName('HttpDispatcher'));
    should.exist(dispatchStats);
    dispatchStats.should.match(/^\[[0-9.,]+\]$/);

    return done();
  });
});