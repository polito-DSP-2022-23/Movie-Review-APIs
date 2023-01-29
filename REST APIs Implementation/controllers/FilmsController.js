'use strict';

var utils = require('../utils/writer.js');
var Films = require('../service/FilmsService');
var constants = require('../utils/constants.js');

module.exports.getPublicFilms = function getPublicFilms (req, res, next) {
    var numOfFilms = 0;
    var next=0;
  
    Films.getPublicFilmsTotal()
        .then(function(response) {
            numOfFilms = response;
            Films.getPublicFilms(req)
            .then(function(response) {
                if (req.query.pageNo == null) var pageNo = 1;
                else var pageNo = req.query.pageNo;
                var totalPage=Math.ceil(numOfFilms / constants.OFFSET);
                next = Number(pageNo) + 1;
                if (pageNo>totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: {}
                    });
                } else if (pageNo == totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: response
                    });
                } else {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: response,
                        next: "/api/films/public?pageNo=" + next
                    });
                }
        })
        .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
        })
        .catch(function(response) {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      });
  
  
    
  };

  module.exports.getInvitedFilms = function getInvitedFilms (req, res, next) {
    var numOfFilms = 0;
    var next=0;
  
    Films.getInvitedFilmsTotal(req.user.id)
        .then(function(response) {
            numOfFilms = response;
            Films.getInvitedFilms(req)
            .then(function(response) {
                if (req.query.pageNo == null) var pageNo = 1;
                else var pageNo = req.query.pageNo;
                var totalPage=Math.ceil(numOfFilms / constants.OFFSET);
                next = Number(pageNo) + 1;
                if (pageNo>totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: {}
                    });
                } else if (pageNo == totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: response
                    });
                } else {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: response,
                        next: "/api/films/public/invited?pageNo=" + next
                    });
                }
        })
        .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
        })
        .catch(function(response) {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      });
  
  
    
  };
  
  module.exports.getPrivateFilms = function getPrivateFilms (req, res, next) {
      var numOfFilms = 0;
      var next=0;
    
      Films.getPrivateFilmsTotal(req.user.id)
          .then(function(response) {
              numOfFilms = response;
              Films.getPrivateFilms(req)
              .then(function(response) {
                  if (req.query.pageNo == null) var pageNo = 1;
                  else var pageNo = req.query.pageNo;
                  var totalPage=Math.ceil(numOfFilms / constants.OFFSET);
                  next = Number(pageNo) + 1;
                  if (pageNo>totalPage) {
                    utils.writeJson(res, {
                        totalPages: totalPage,
                        currentPage: pageNo,
                        totalItems: numOfFilms,
                        films: {}
                    });
                  } else if (pageNo == totalPage) {
                      utils.writeJson(res, {
                          totalPages: totalPage,
                          currentPage: pageNo,
                          totalItems: numOfFilms,
                          films: response,
                      });
                  } else {
                      utils.writeJson(res, {
                          totalPages: totalPage,
                          currentPage: pageNo,
                          totalItems: numOfFilms,
                          films: response,
                          next: "/api/films/private?pageNo=" + next
                      });
                  }
          })
          .catch(function(response) {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
          });
          })
          .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
    };
  


module.exports.createFilm = function createFilm (req, res, next) {
    var film = req.body;
    var owner = req.user.id;

    Films.createFilm(film, owner)
        .then(function(response) {
            utils.writeJson(res, response, 201);
        })
        .catch(function(response) {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        });
};

module.exports.getSinglePrivateFilm = function getSinglePrivateFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }
    Films.getSinglePrivateFilm(req.params.filmId, req.user.id)
          .then(function(response) {
              utils.writeJson(res, response);
          })
          .catch(function(response) {
              if(response == 403){
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film.' }], }, 403);
              }
              else if (response == 404){
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
              }
              else {
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
              }
          });
  };

module.exports.updateSinglePrivateFilm = function updateSinglePrivateFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }else if(Object.keys(req.body).length==0){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'empty request body, nothing to update.' }], }, 400);
        return; 
    }
    const result = checkRequestBody(req.body, 1);

    if (!result.valid) {
        if(result.error!=='visibility'){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': result.error }], }, 400);
        }else{
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The visibility of the film cannot be changed.' }], }, 409);
        }
    } else {
        Films.updateSinglePrivateFilm(req.body, req.params.filmId, req.user.id)
        .then(function(response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function(response) {
            if(response == 403){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
            }
            else if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
            }else if(response==409){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film is marked as public.' }], }, 409);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
    }
};

module.exports.deleteSinglePrivateFilm = function deleteSinglePrivateFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }
  Films.deleteSinglePrivateFilm(req.params.filmId, req.user.id)
        .then(function(response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function(response) {
            if(response == 403){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
            }
            else if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
            }
            else if (response == 409){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The visibility of the film cannot be changed.' }], }, 409);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
};



module.exports.getSinglePublicFilm = function getSinglePublicFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }
    Films.getSinglePublicFilm(req.params.filmId)
    .then(function(response) {
        utils.writeJson(res, response);
    })
    .catch(function(response) {
        if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });
};

module.exports.updateSinglePublicFilm = function updateSinglePublicFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }else if(Object.keys(req.body).length==0){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'empty request body, nothing to update.' }], }, 400);
        return; 
    }
    const result = checkRequestBody(req.body, 0);

    if (!result.valid) {
        if(result.error!=='visibility'){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': result.error }], }, 400);
        }else{
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The visibility of the film cannot be changed.' }], }, 409);
        }
    } else {
        Films.updateSinglePublicFilm(req.body, req.params.filmId, req.user.id)
        .then(function(response) {
            utils.writeJson(res, response, 204);
        })
        .catch(function(response) {
            if(response == 403){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
            }
            else if (response == 404){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
            }else if(response == 409){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film is marked as private.' }], }, 409);
            }
            else {
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
    }
};

  module.exports.deleteSinglePublicFilm = function deleteSinglePublicFilm (req, res, next) {
    let id=parseInt(req.params.filmId); 
    if (isNaN(id)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a number.' }], }, 400);
        return; 
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
        return;
    }
    Films.deleteSinglePublicFilm(req.params.filmId, req.user.id)
          .then(function(response) {
              utils.writeJson(res, response, 204);
          })
          .catch(function(response) {
              if(response == 403){
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
              }
              else if (response == 404){
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The film does not exist.' }], }, 404);
              }
              else {
                  utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
              }
          });
  };
  
  /**
 * Utility functions
 */
  const checkRequestBody = function (body, filmPrivate) {
        // Check if title is a string
        if (body.title && typeof body.title !== 'string') {
            return { valid: false, error: 'title must be a string' };
        }
        if(filmPrivate===1){
            // Check if watchDate is a valid date in the format yyyy-mm-dd
            if (body.watchDate) {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(body.watchDate)) {
                    return { valid: false, error: 'watchDate must be a string in the format yyyy-mm-dd' };
                }
            }
            // Check if rating is a number between 1 and 10
            if (body.rating) {
                if (typeof body.rating !== 'number' || body.rating < 1 || body.rating > 10) {
                    return { valid: false, error: 'rating must be an integer between 1 and 10' };
                }
            }
            // Check if favorite is a boolean value
            if (body.favorite && typeof body.favorite !== 'boolean') {
                return { valid: false, error: 'favorite must be a boolean value' };
            }
            if(body.private){
                return {valid: false, error: 'visibility'}; 
            }
        }else if(filmPrivate===0){
            if(body.watchDate || body.rating || body.favorite){
                return {valid: false, error: 'watchDate, rating and/or favorite should not be present as parameters in a public film'};
            }
            if(body.private){
                return {valid: false, error: 'visibility'}; 
            }
        }
        return { valid: true };

}