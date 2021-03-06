
/**
 * Module dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema

/**
 * Test.
 */

describe('connections:', function(){
  it('should allow closing a closed connection', function(done){
    var db = mongoose.createConnection()
      , called = false;

    assert.equal(0, db.readyState);
    db.close(done);
  })

  it('should accept mongodb://localhost/fake', function(done){
    var db = mongoose.createConnection('mongodb://localhost/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('primary', db.options.db.read_preference);
    assert.equal(undefined, db.pass);
    assert.equal(undefined, db.user);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27017, db.port);
    db.close(done);
  });

  it('should accept mongodb://localhost:27000/fake', function(done){
    var db = mongoose.createConnection('mongodb://localhost:27000/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(27000, db.port);
    db.close();
    done();
  })

  it('should accept mongodb://aaron:psw@localhost:27000/fake', function(done){
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake');
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('psw', db.pass);
    assert.equal('aaron', db.user);
    assert.equal('fake', db.name);
    assert.equal('localhost', db.host);
    assert.equal(27000, db.port);
    db.close();
    done();
  })

  it('should accept mongodb://aaron:psw@localhost:27000/fake with db options', function(done){
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { db: { forceServerObjectId: true }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(true, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();
    done();
  })

  it('should accept mongodb://aaron:psw@localhost:27000/fake with server options', function(done){
    var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: false }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(false, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    db.close();
    done();
  })

  it('should accept unix domain sockets', function(done){
    var db = mongoose.createConnection('mongodb://aaron:psw@/tmp/mongodb-27017.sock/fake', { server: { auto_reconnect: false }});
    db.on('error', function(err){});
    assert.equal('object', typeof db.options);
    assert.equal('object', typeof db.options.server);
    assert.equal(false, db.options.server.auto_reconnect);
    assert.equal('object', typeof db.options.db);
    assert.equal(false, db.options.db.forceServerObjectId);
    assert.equal('fake', db.name);
    assert.equal('/tmp/mongodb-27017.sock', db.host);
    assert.equal('psw', db.pass);
    assert.equal('aaron', db.user);
    db.close();
    done();
  })

  describe('re-opening a closed connection', function(){
    var mongos = process.env.MONGOOSE_SHARD_TEST_URI;
    if (!mongos) return;

    var mongod = 'mongodb://localhost:27017';

    var repl1 = process.env.MONGOOSE_SET_TEST_URI;
    var repl2 = repl1.split(',');
    repl2.push(repl2.shift());
    repl2 = repl2.join(',');

    describe('with different host/port', function(){
      it('non-replica set', function(done){
        var db = mongoose.createConnection();

        db.open(mongod, function (err) {
          if (err) return done(err);

          var port1 = db.port;
          var db1 = db.db;

          db.close(function (err) {
            if (err) return done(err);

            db.open(mongos, function (err) {
              if (err) return done(err);

              assert.notEqual(port1, db.port);
              assert.ok(db1 !== db.db);
              assert.ok(db1.serverConfig.port != db.db.serverConfig.port);

              var port2 = db.port;
              var db2 = db.db;

              db.close(function (err) {

                db.open(mongod, function (err) {
                  if (err) return done(err);

                  assert.notEqual(port2, db.port);
                  assert.ok(db2 !== db.db);
                  assert.ok(db2.serverConfig.port != db.db.serverConfig.port);

                  db.close(done);
                });
              });
            });
          });
        });
      })

      it('replica set', function(done){
        var db = mongoose.createConnection();

        db.openSet(repl1, function (err) {
          if (err) return done(err);

          var hosts = db.hosts.slice();
          var db1 = db.db;

          db.close(function (err) {
            if (err) return done(err);

            db.openSet(repl2, function (err) {
              if (err) return done(err);

              db.hosts.forEach(function (host, i) {
                assert.notEqual(host.port, hosts[i].port);
              });
              assert.ok(db1 !== db.db);

              hosts = db.hosts.slice();
              var db2 = db.db;

              db.close(function (err) {
                if (err) return done(err);

                db.openSet(repl1, function (err) {
                  if (err) return done(err);

                  db.hosts.forEach(function (host, i) {
                    assert.notEqual(host.port, hosts[i].port);
                  });
                  assert.ok(db2 !== db.db);

                  db.close();
                  done();
                });
              });
            });
          });
        });
      })
    })
  })

  describe('should accept separated args with options', function(){
    it('works', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: true }});
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28000, db.port);
      db.close();

      db = mongoose.createConnection('127.0.0.1', 'faker', { blah: 1 });
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(27017, db.port);
      assert.equal(1, db.options.blah);
      db.close();
      done();
    })

    it('including user/pass', function(done){
      var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'aaron', pass: 'psw'});
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('fake', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27000, db.port);
      assert.equal('psw', db.pass);
      assert.equal('aaron', db.user);
      db.close();
      done();
    })

    it('but fails when passing user and no pass', function(done){
      var db = mongoose.createConnection('localhost', 'fake', 27000, {user: 'no_pass'});
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('fake', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27000, db.port);
      assert.equal(undefined, db.pass);
      assert.equal(undefined, db.user);
      db.close();
      done();
    })
  })

  describe('should accept separated args without options', function(){
    it('works', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28001);
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28001, db.port);
      db.close();

      db = mongoose.createConnection('127.0.0.1', 'faker');
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(27017, db.port);
      db.close();
      done();
    })
    it('and accept user/pass in hostname', function(done){
      var db = mongoose.createConnection('aaron:psw@localhost', 'fake', 27000);
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('fake', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27000, db.port);
      assert.equal('psw', db.pass);
      assert.equal('aaron', db.user);
      db.close();
      done();
    })
  });

  describe('querystring options', function(){
    describe('for replica sets', function(){
      it('work', function(done){
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
                 + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
                 + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
                 + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
                 + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
                 + 'dc:ny,rack:1&readPreferenceTags=dc:sf'

        var db = mongoose.createConnection(conn);
        db.on('error', function(err){});
        db.close();
        assert.equal('object', typeof db.options);
        assert.equal('object', typeof db.options.server);
        assert.equal('object', typeof db.options.server.socketOptions);
        assert.equal('object', typeof db.options.db);
        assert.equal('object', typeof db.options.replset);
        assert.equal('object', typeof db.options.replset.socketOptions);
        assert.equal(false, db.options.server.auto_reconnect);
        assert.equal(2, db.options.server.poolSize);
        assert.equal(false, db.options.server.slave_ok);
        assert.equal(true, db.options.server.socketOptions.ssl);
        assert.equal(true, db.options.replset.socketOptions.ssl);
        assert.equal(10, db.options.server.socketOptions.socketTimeoutMS);
        assert.equal(10, db.options.replset.socketOptions.socketTimeoutMS);
        assert.equal(12, db.options.server.socketOptions.connectTimeoutMS);
        assert.equal(12, db.options.replset.socketOptions.connectTimeoutMS);
        assert.equal(10, db.options.replset.retries);
        assert.equal(5, db.options.replset.reconnectWait);
        assert.equal('replworld', db.options.replset.rs_name);
        assert.equal(true, db.options.replset.read_secondary);
        assert.equal(false, db.options.db.native_parser);
        assert.equal(2, db.options.db.w);
        assert.equal(true, db.options.db.safe);
        assert.equal(true, db.options.db.fsync);
        assert.equal(true, db.options.db.journal);
        assert.equal(80, db.options.db.wtimeoutMS);
        assert.equal('nearest', db.options.db.read_preference);
        assert.deepEqual([{ dc: 'ny', rack: 1 }, { dc: 'sf' }], db.options.db.read_preference_tags);
        assert.equal(false, db.options.db.forceServerObjectId);
        done();
      })
      it('mixed with passed options', function(done){
        var conn = 'mongodb://localhost/fake?poolSize=2'
                 + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
                 + '&retries=10&reconnectWait=5&rs_name=replworld&readSecondary=true'
                 + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
                 + '&wtimeoutMS=80&readPreference=nearest&readPreferenceTags='
                 + 'dc:ny,rack:1&readPreferenceTags=dc:sf'

        var db = mongoose.createConnection(conn, { server: { poolSize: 3, auto_reconnect: false }});
        db.on('error', function(err){});
        db.close();
        assert.equal('object', typeof db.options);
        assert.equal('object', typeof db.options.server);
        assert.equal('object', typeof db.options.server.socketOptions);
        assert.equal('object', typeof db.options.db);
        assert.equal('object', typeof db.options.replset);
        assert.equal('object', typeof db.options.replset.socketOptions);
        assert.equal(false, db.options.server.auto_reconnect);
        assert.equal(3, db.options.server.poolSize);
        assert.equal(false, db.options.server.slave_ok);
        assert.equal(true, db.options.server.socketOptions.ssl);
        assert.equal(true, db.options.replset.socketOptions.ssl);
        assert.equal(10, db.options.server.socketOptions.socketTimeoutMS);
        assert.equal(10, db.options.replset.socketOptions.socketTimeoutMS);
        assert.equal(12, db.options.server.socketOptions.connectTimeoutMS);
        assert.equal(12, db.options.replset.socketOptions.connectTimeoutMS);
        assert.equal(10, db.options.replset.retries);
        assert.equal(5, db.options.replset.reconnectWait);
        assert.equal('replworld', db.options.replset.rs_name);
        assert.equal(true, db.options.replset.read_secondary);
        assert.equal(false, db.options.db.native_parser);
        assert.equal(2, db.options.db.w);
        assert.equal(true, db.options.db.safe);
        assert.equal(true, db.options.db.fsync);
        assert.equal(true, db.options.db.journal);
        assert.equal(80, db.options.db.wtimeoutMS);
        assert.equal('nearest', db.options.db.read_preference);
        assert.deepEqual([{ dc: 'ny', rack: 1 }, { dc: 'sf' }], db.options.db.read_preference_tags);
        assert.equal(false, db.options.db.forceServerObjectId);

        done();
      })
    })
    describe('for non replica sets', function(){
      it('work', function(done){
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
                 + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
                 + '&retries=10&reconnectWait=5&readSecondary=true'
                 + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'
                 + '&wtimeoutMS=80&'

        var db = mongoose.createConnection(conn);
        db.on('error', function(err){});
        db.close();
        assert.equal('object', typeof db.options);
        assert.equal('object', typeof db.options.server);
        assert.equal('object', typeof db.options.server.socketOptions);
        assert.equal('object', typeof db.options.db);
        assert.equal('object', typeof db.options.replset);
        assert.equal('object', typeof db.options.replset.socketOptions);
        assert.equal(false, db.options.server.auto_reconnect);
        assert.equal(2, db.options.server.poolSize);
        assert.equal(false, db.options.server.slave_ok);
        assert.equal(true, db.options.server.socketOptions.ssl);
        assert.equal(true, db.options.replset.socketOptions.ssl);
        assert.equal(10, db.options.server.socketOptions.socketTimeoutMS);
        assert.equal(10, db.options.replset.socketOptions.socketTimeoutMS);
        assert.equal(12, db.options.server.socketOptions.connectTimeoutMS);
        assert.equal(12, db.options.replset.socketOptions.connectTimeoutMS);
        assert.equal(10, db.options.replset.retries);
        assert.equal(5, db.options.replset.reconnectWait);
        assert.equal(true, db.options.replset.read_secondary);
        assert.equal(false, db.options.db.native_parser);
        assert.equal(2, db.options.db.w);
        assert.equal(true, db.options.db.safe);
        assert.equal(true, db.options.db.fsync);
        assert.equal(true, db.options.db.journal);
        assert.equal(80, db.options.db.wtimeoutMS);
        assert.equal(false, db.options.db.forceServerObjectId);
        done();
      })
      it('mixed with passed options', function(done){
        var conn = 'mongodb://localhost/fake?autoReconnect=false&poolSize=2'
                 + '&slaveOk=false&ssl=true&socketTimeoutMS=10&connectTimeoutMS=12'
                 + '&retries=10&reconnectWait=5&readSecondary=true'
                 + '&nativeParser=false&w=2&safe=true&fsync=true&journal=true'

        var db = mongoose.createConnection(conn, { db: { w: 3, wtimeoutMS: 80 }});
        db.on('error', function(err){});
        db.close();
        assert.equal('object', typeof db.options);
        assert.equal('object', typeof db.options.server);
        assert.equal('object', typeof db.options.server.socketOptions);
        assert.equal('object', typeof db.options.db);
        assert.equal('object', typeof db.options.replset);
        assert.equal('object', typeof db.options.replset.socketOptions);
        assert.equal(false, db.options.server.auto_reconnect);
        assert.equal(80, db.options.db.wtimeoutMS);
        assert.equal(2, db.options.server.poolSize);
        assert.equal(false, db.options.server.slave_ok);
        assert.equal(true, db.options.server.socketOptions.ssl);
        assert.equal(true, db.options.replset.socketOptions.ssl);
        assert.equal(10, db.options.server.socketOptions.socketTimeoutMS);
        assert.equal(10, db.options.replset.socketOptions.socketTimeoutMS);
        assert.equal(12, db.options.server.socketOptions.connectTimeoutMS);
        assert.equal(12, db.options.replset.socketOptions.connectTimeoutMS);
        assert.equal(10, db.options.replset.retries);
        assert.equal(5, db.options.replset.reconnectWait);
        assert.equal(true, db.options.replset.read_secondary);
        assert.equal(false, db.options.db.native_parser);
        assert.equal(3, db.options.db.w);
        assert.equal(true, db.options.db.safe);
        assert.equal(true, db.options.db.fsync);
        assert.equal(true, db.options.db.journal);
        assert.equal(false, db.options.db.forceServerObjectId);
        done();
      })
    })
  })

  describe('missing protocols', function(){
    it('are allowed with replsets', function(done){
      var conn = mongoose.createConnection('localhost:12345,127.0.0.1:14326', function (err) {
        // force missing db error so we don't actually connect.
        assert.ok(err);
      });
      assert.deepEqual([{host:'localhost', port:12345},{host:'127.0.0.1',port:14326}], conn.hosts);
      assert.deepEqual(null, conn.host);
      assert.deepEqual(null, conn.port);
      setTimeout(done,10);
    })
    it('are allowed with single connections', function(done){
      var conn = mongoose.createConnection();
      conn.doOpen = function(){};
      conn.open('localhost:12345/woot');
      assert.deepEqual('localhost', conn.host);
      assert.deepEqual(12345, conn.port);
      done();
    })
  });

  describe('connect callbacks', function(){
    it('execute with user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://aaron:psw@localhost:27000/fake', { server: { auto_reconnect: true }}, function () {
        done();
      });
      db.on('error', function (err) { assert.ok(err) });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      db.close();
    });
    it('execute without user:pwd connection strings', function(done){
      var db = mongoose.createConnection('mongodb://localhost/fake', function(){});
      db.on('error', function (err) { assert.ok(err) });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal(undefined, db.user);
      assert.equal('fake', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27017, db.port);
      db.close();
      setTimeout(done,10);
    });
    it('should return an error if malformed uri passed', function(done){
      var db = mongoose.createConnection('mongodb:///fake', function (err) {
        assert.ok(/Missing hostname/.test(err.message));
        done();
      });
      db.close();
      assert.ok(!db.options);
    })
    it('should use admin db if not specified', function(done){
      var db = mongoose.createConnection('mongodb://localhost', function (err) {
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('admin', db.name);
      assert.equal('localhost', db.host);
      assert.equal(27017, db.port);
      db.close();
    })
    it('should fire when individual args are passed', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, { server: { auto_reconnect: false }},function(){
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(false, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28000, db.port);
      db.close();
    });
    it('should fire when no options are passed', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', 28000, function(){
        done();
      });
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(28000, db.port);
      db.close();
    })
    it('should fire when default port utilized', function(done){
      var db = mongoose.createConnection('127.0.0.1', 'faker', done);
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(true, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('faker', db.name);
      assert.equal('127.0.0.1', db.host);
      assert.equal(27017, db.port);
      db.close();
    })
  });

  describe('errors', function(){
    it('should be thrown when there are no listeners', function(done){
      var old = process._events.uncaughtException;

      // sidestep mochas listener
      process._events.uncaughtException = function (err) {
        assert.ok(err);
        process._events.uncaughtException = old;
        done()
      }

      var db= start({ uri: 'mongodb://whatever23939.localhost/noooope', noErrorListener: 1 });
    })

    it('event fires with one listener', function(done){
      var db= start({ uri: 'mongodb://localasdfads/fakeeee', noErrorListener: 1 })
      db.on('error', function () {
        // this callback has no params which triggered the bug #759
        done();
      });
    })

    it('should occur without hanging when password with special chars is used (gh-460)', function (done) {
      var db = mongoose.createConnection('mongodb://aaron:psw?@localhost/fake', function (err) {
        assert.ok(err);
        db.close();
        done();
      });
    });
  })

  describe('.model()', function(){
    it('allows passing a schema', function(done){
      var db = start();
      var MyModel = db.model('MyModelasdf', new Schema({
          name: String
      }));
      db.close();

      assert.ok(MyModel.schema instanceof Schema);
      assert.ok(MyModel.prototype.schema instanceof Schema);

      var m = new MyModel({name:'aaron'});
      assert.equal('aaron', m.name);
      done();
    })

    it('should properly assign the db', function(done){
      var A = mongoose.model('testing853a', new Schema({x:String}), 'testing853-1');
      var B = mongoose.model('testing853b', new Schema({x:String}), 'testing853-2');
      var C = B.model('testing853a');
      assert.ok(C == A);
      done();
    })

    it('prevents overwriting pre-existing models', function(done){
      var db = start();
      var name = 'gh-1209-a';
      db.model(name, new Schema);

      assert.throws(function () {
        db.model(name, new Schema);
      }, /Cannot overwrite `gh-1209-a` model/);

      done();
    })

    it('allows passing identical name + schema args', function(done){
      var db = start();
      var name = 'gh-1209-b';
      var schema = new Schema;

      db.model(name, schema);
      assert.doesNotThrow(function () {
        db.model(name, schema);
      });

      done();
    })

    it('throws on unknown model name', function(done){
      var db = start();
      assert.throws(function () {
        db.model('iDoNotExist!');
      }, /Schema hasn't been registered/);

      done();
    })

    it('uses the passed schema when global model exists with same name (gh-1209)', function(done){
      var s1 = new Schema({ one: String });
      var s2 = new Schema({ two: Number });

      var db = start();

      var A = mongoose.model('gh-1209-a', s1);
      var B = db.model('gh-1209-a', s2);

      assert.ok(A.schema != B.schema);
      assert.ok(A.schema.paths.one);
      assert.ok(B.schema.paths.two);
      assert.ok(!B.schema.paths.one);
      assert.ok(!A.schema.paths.two);

      // reset
      delete db.models['gh-1209-a'];
      var C = db.model('gh-1209-a');
      assert.ok(C.schema == A.schema);

      done();
    })

    describe('passing collection name', function(){
      describe('when model name already exists', function(){
        it('returns a new uncached model', function(done){
          var db = start();
          var s1 = new Schema({ a: [] });
          var name = 'non-cached-collection-name';
          var A = db.model(name, s1);
          var B = db.model(name);
          var C = db.model(name, 'alternate');
          assert.ok(A.collection.name == B.collection.name);
          assert.ok(A.collection.name != C.collection.name);
          assert.ok(db.models[name].collection.name != C.collection.name);
          assert.ok(db.models[name].collection.name == A.collection.name);
          done();
        })
      })
    })
  })


  describe('openSet', function(){
    it('accepts uris, dbname, options', function(done){
      var m = new mongoose.Mongoose;
      var uris = process.env.MONGOOSE_SET_TEST_URI;
      if (!uris) return done();

      m.connection.on('error', done);
      m.connection.on('open', function () {
        m.connection.close(done);
      });

      try {
        m.connect(uris, 'mongoose_test', { server: { auto_reconnect: true }});
      } catch (err) {
        done(err);
      }
    })
    describe('auth', function(){
      it('from uri', function(done){
        var uris = process.env.MONGOOSE_SET_TEST_URI;
        if (!uris) return done();

        var db = mongoose.createConnection();
        db.openSet('mongodb://aaron:psw@localhost:27000,b,c', { server: { auto_reconnect: false }});
        db.on('error', function(err){});
        assert.equal('aaron', db.user);
        assert.equal('psw', db.pass);
        db.close();
        done();
      })
      it('form options', function(done){
        var uris = process.env.MONGOOSE_SET_TEST_URI;
        if (!uris) return done();

        var db = mongoose.createConnection();
        db.openSet('mongodb://aaron:psw@localhost:27000,b,c', { user: 'tester', pass: 'testpsw' });
        db.on('error', function(err){});
        assert.equal('tester', db.user);
        assert.equal('testpsw', db.pass);
        db.close();
        done();
      })
    })

    it('handles unix domain sockets', function(done){
      var url = 'mongodb://aaron:psw@/tmp/mongodb-27018.sock,/tmp/mongodb-27019.sock/fake';
      var db = mongoose.createConnection(url, { server: { auto_reconnect: false }});
      db.on('error', function(err){});
      assert.equal('object', typeof db.options);
      assert.equal('object', typeof db.options.server);
      assert.equal(false, db.options.server.auto_reconnect);
      assert.equal('object', typeof db.options.db);
      assert.equal(false, db.options.db.forceServerObjectId);
      assert.equal('fake', db.name);
      assert.ok(Array.isArray(db.hosts));
      assert.equal('/tmp/mongodb-27018.sock', db.hosts[0].ipc);
      assert.equal('/tmp/mongodb-27019.sock', db.hosts[1].ipc);
      assert.equal('psw', db.pass);
      assert.equal('aaron', db.user);
      db.close();
      done();
    })

    it('can reopen a disconnected replica set (gh-1263)', function(done) {
      var uris = process.env.MONGOOSE_SET_TEST_URI;
      if (!uris) return done();

      var conn = mongoose.createConnection();

      conn.on('error', done);

      try {
        conn.openSet(uris, 'mongoose_test', {}, function(err) {
          if (err) return done(err);

          conn.close(function(err) {
            if (err) return done(err);

            conn.openSet(uris, 'mongoose_test', {}, function(){
              conn.close(done);
            });
          });
        });
      } catch (err) {
        done(err);
      }
    })
  })
})
