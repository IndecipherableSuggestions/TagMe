var expect = require('chai').expect;
var request = require('request');
var fs = require('fs');
var FormData = require('form-data');

var User = require('../db/models/userModel');

var hashPassword = function(pw, callback) {
  bcrypt.genSalt(4, function(err, salt) {
    bcrypt.hash(pw, salt, function(err, hash) {
      if (err) {
        console.error(err);
        return;
      }
      callback(hash);
    });
  });
};

var comparePassword = function(pw, hash, callback) {
  bcrypt.compare(pw, hash, function(err, match) {
    if (err) {
      console.error(err);
      return;
    }
    callback(match);
  });
};

describe('Unprotected routes: ', function() {

  beforeEach(function(done) {
    User.remove({username: 'Phillip'}, function(err, something) {
      if (err) {
        console.log('err', err);
      }
      done();
    });
  });

  describe('User signup', function() {

    var signUpOptions = {
      method: 'POST',
      url: 'http://tagmelegacy.herokuapp.com/api/users/signup',
      json: {
        username: 'Phillip',
        password: 'Phillip'
      }
    };

    it('should return JWT in response body for successful signups', function(done) {
      request(signUpOptions, function(err, res, body) {
        if (err) {
          console.log('ERROR:', err);
        }
        expect(res.body.id_token).to.not.be.undefined;
        expect(res.statusCode).to.equal(201);
        done();
      });
    });

    it('should return empty response for duplicate usernames', function(done) {
      request(signUpOptions, function(err, res, body) {
        request(signUpOptions, function(err, res, body) {
          if (err) {
            console.log('ERROR:', err);
          }
          expect(res.body).to.be.undefined;
          expect(res.statusCode).to.equal(401);
          done();
        });
      });
    });

    it('should insert new users into database', function(done) {
      request(signUpOptions, function(err, res, body) {
        if (err) {
          console.log('ERROR:', err);
        }
        User.findOne({username: 'Phillip'})
          .exec(function(err, user) {
            expect(user.username).to.equal('Phillip');

            var hashPassword = function(pw, callback) {
              bcrypt.genSalt(4, function(err, salt) {
                bcrypt.hash(pw, salt, function(err, hash) {
                  if (err) {
                    console.error(err);
                    return;
                  }
                  callback(hash);
                });
              });
            };

            comparePassword(user.password, 'Phillip', function(isMatch) {
              expect(isMatch).to.be.true;
            });

          });
        done();
      });
    });
  });

  describe('User login', function() {

    var signUpOptions = {
      method: 'POST',
      url: 'http://tagmelegacy.herokuapp.com/api/users/signup',
      json: {
        username: 'Phillip',
        password: 'Phillip'
      }
    };
    var loginOptions = {
      method: 'POST',
      url: 'http://tagmelegacy.herokuapp.com/api/users/login',
      json: {
        username: 'Phillip',
        password: 'Phillip'
      }
    };

    it('should return empty response for nonexistent users', function(done) {
      request(loginOptions, function(err, res, body) {
        if (err) {
          console.log('ERROR:', err);
        }
        expect(res.body).to.be.undefined;
        expect(res.statusCode).to.equal(401);
        done();
      });
    });

    it('should return JWT with successful login', function(done) {
      request(signUpOptions, function(err, res, body) {
        request(loginOptions, function(err, res, body) {
          if (err) {
            console.log('ERROR:', err);
          }
          expect(res.body.id_token).to.not.be.undefined;
          expect(res.statusCode).to.equal(201);
          done();
        });
      });
    });

  });

  describe('Memory creation', function() {
   
    var signUpOptions = {
      method: 'POST',
      url: 'http://tagmelegacy.herokuapp.com/api/users/signup',
      json: {
        username: 'new',
        password: 'new'
      }
    };

    // note: need aws credentials set up (in the current tab) for this to work
    it ('should create a local file and push it to s3', function(done) {
      // set timeout to 5 sec to give enough time to upload to s3
      this.timeout(5000);

      // First create the user
      request(signUpOptions, function(err, res, body) {
        if (err) {
          console.log('ERROR:', err);
        }
        
        var form = new FormData();
        form.append('type', 'image/png');
        form.append('name', 'testImage.png');
        form.append('memoryImage', fs.createReadStream('test/successkid.png'));

        form.submit({
          port: 3000,
          path: '/api/memories/upload',
          headers: {Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODBmYzdiMTZhYWE2ODM2OTk2NDc5MTQiLCJ1c2VybmFtZSI6Im5ldyIsInBhc3N3b3JkIjoidXNlciIsIl9fdiI6MCwibWVtb3JpZXMiOltdfQ.VfV0DtedVfOUZNAM6fOrMQCakF6Zrcbk-ujie0YGvd4'}
        }, function(err, res) {
          // res is the response to the form submission, not the response from the server (does not contain id)
          
          if (err) {
            console.log('err uploading image was ', err);
          } 
          expect(err).to.be.null;
          expect(res.statusCode).to.equal(201);
          done();
        });
      });
      
    });
  });

  describe('Memory access', function() {
    it ('should return the details of a memory given an id', function(done) {
      var accessOneOptions = {
        method: 'GET',
        url: 'http://tagmelegacy.herokuapp.com/api/memories/id/5816923fc196a000184ae43a',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODBmYzdiMTZhYWE2ODM2OTk2NDc5MTQiLCJ1c2VybmFtZSI6Im5ldyIsInBhc3N3b3JkIjoidXNlciIsIl9fdiI6MCwibWVtb3JpZXMiOltdfQ.VfV0DtedVfOUZNAM6fOrMQCakF6Zrcbk-ujie0YGvd4'
        },
      };

      request(accessOneOptions, function(err, res) {
        if (err) {
          console.log('err retrieving all', err);
        }
        expect(JSON.parse(res.body).title).to.be.a('string');
        done();
      });
    });

    it ('should return the details of all memories for a user', function(done) {
      // give it 5 sec to return all images
      var accessAllOptions = {
        method: 'GET',
        url: 'http://tagmelegacy.herokuapp.com/api/memories/all',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODBmYzdiMTZhYWE2ODM2OTk2NDc5MTQiLCJ1c2VybmFtZSI6Im5ldyIsInBhc3N3b3JkIjoidXNlciIsIl9fdiI6MCwibWVtb3JpZXMiOltdfQ.VfV0DtedVfOUZNAM6fOrMQCakF6Zrcbk-ujie0YGvd4'
        }
      };

      request(accessAllOptions, function(err, res) {
        if (err) {
          console.log('err retrieving all', err);
        }
        expect(JSON.parse(res.body)[0].title).to.be.a('string');
        done();
      });
    });

    it ('should find a memory with the water tag', function(done) {
      var searchOptions = {
        method: 'GET',
        url: 'http://tagmelegacy.herokuapp.com/api/memories/search/water',
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1ODBmYzdiMTZhYWE2ODM2OTk2NDc5MTQiLCJ1c2VybmFtZSI6Im5ldyIsInBhc3N3b3JkIjoidXNlciIsIl9fdiI6MCwibWVtb3JpZXMiOltdfQ.VfV0DtedVfOUZNAM6fOrMQCakF6Zrcbk-ujie0YGvd4'
        }
      };

      request(searchOptions, function(err, res) {
        if (err) {
          console.log('err searching for memory', err);
        }
        expect(res.body[0]).to.not.be.undefined;
        done();
      });
    });

  });
});