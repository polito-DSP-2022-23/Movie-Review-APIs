'use strict';

var utils = require('../utils/writer.js');
var Reviews = require('../service/ReviewsService');
var constants = require('../utils/constants.js');

module.exports.getFilmReviews = function getFilmReviews (req, res, next) {

    let id1=parseInt(req.params.filmId); 
    if (isNaN(id1)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a integer number.' }], }, 400);
    }else if (!req.params.filmId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
    }else{
        //retrieve a list of reviews
        var numOfReviews = 0;
        var next=0;

        Reviews.getFilmReviewsTotal(req.params.filmId)
            .then(function(response) {
                numOfReviews = response;
                Reviews.getFilmReviews(req)
                .then(function(response) {
                    if (req.query.pageNo == null) var pageNo = 1;
                    else var pageNo = req.query.pageNo;
                    var totalPage=Math.ceil(numOfReviews / constants.OFFSET);
                    next = Number(pageNo) + 1;
                    if (pageNo>totalPage) {
                        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                    } else if (pageNo == totalPage) {
                        utils.writeJson(res, {
                            totalPages: totalPage,
                            currentPage: pageNo,
                            totalItems: numOfReviews,
                            reviews: response
                        });
                    } else {
                        utils.writeJson(res, {
                            totalPages: totalPage,
                            currentPage: pageNo,
                            totalItems: numOfReviews,
                            reviews: response,
                            next: "/api/films/public/" + req.params.filmId+"/reviews?pageNo=" + next
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
    }

};


module.exports.getSingleReview = function getSingleReview (req, res) {

    let id1=parseInt(req.params.filmId); 
    let id2=parseInt(req.params.reviewId); 
    if (isNaN(id1) || isNaN(id2)) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId or reviewId, they must be a integer number.' }], }, 400);
    }else if (!req.params.filmId || !req.params.reviewId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId or reviewId parameters missing' }], }, 400);
    }else{
        Reviews.getSingleReview(req.params.filmId, req.params.reviewId)
            .then(function(response) {
                utils.writeJson(res, response);
            })
            .catch(function(response) {
                if (response == 404){
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
                }
                else {
                    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                }
            });
    }
};


module.exports.deleteSingleReview = function deleteSingleReview (req, res, next) {

  let id1=parseInt(req.params.filmId); 
  let id2=parseInt(req.params.reviewId); 
  if (isNaN(id1) || isNaN(id2)) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId or reviewId, they must be a integer number.' }], }, 400);
  }else if (!req.params.filmId || !req.params.reviewId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId or reviewId parameters missing' }], }, 400);
  }else{
      Reviews.deleteSingleReview(req.params.filmId, req.params.reviewId, req.user.id)
      .then(function (response) {
        utils.writeJson(res, response, 204);
      })
      .catch(function (response) {
        if(response == "403A"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
        }
        else if(response == "403B"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review has been already completed, so the invitation cannot be deleted anymore.' }], }, 403);
        }
        else if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
        }
        else {
          utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
        }
      });
  }
};

module.exports.issueFilmReview = function issueFilmReview (req, res, next) {

  let id1=parseInt(req.params.filmId); 
  if (isNaN(id1)) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, it must be a integer number.' }], }, 400);
  }else if (!req.params.filmId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId parameter missing' }], }, 400);
  }else{
      var differentFilm = false;
      for(var i = 0; i < req.body.length; i++){
        if(req.params.filmId != req.body[i].filmId){
          differentFilm = true;
        }
      }
      if(differentFilm){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The filmId field of the review object is different from the filmdId path parameter.' }], }, 409);
      }
      else {
        Reviews.issueFilmReview(req.body, req.user.id)
        .then(function (response) {
          utils.writeJson(res, response, 201);
        })
        .catch(function (response) {
          if(response==400){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'There are duplicate values of reviewerIds in group reviews.' }], }, 400);
          }else if(response == 403){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film' }], }, 403);
          }
          else if (response == 404){
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The public film does not exist.' }], }, 404);
          }
          else if (response == 409){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user/s with ID/S reviewerId/s do/es not exist.' }], }, 409);
          }
          else {
              utils.writeJson(res, {errors: [{ 'param': 'Server', 'msg': response }],}, 500);
          }
        });
      }
  }

};

module.exports.updateSingleReview = function updateSingleReview (req, res, next) {
  
  if(isNaN(parseInt(req.params.reviewId)) || isNaN(parseInt(req.params.filmId)))
  {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'reviewId and/or filmId should be an integer number' }], }, 400);
  }
  else if(req.body.completed == undefined) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The completed property is absent.' }], }, 400);
  }
  else if(req.body.completed == false) {
    utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The completed property is false, but it should be set to true.' }], }, 400);
  }
  else {
    Reviews.updateSingleReview(req.body, req.params.filmId, req.params.reviewId, req.user.id)
    .then(function(response) {
        utils.writeJson(res, response, 204);
    })
    .catch(function(response) {
        if(response == "403A"){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not a reviewer of the film' }], }, 403);
        }else if(response == "403B"){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user belongs to a cooperative review, it cannot perform this operation.' }], }, 403);
        }
        else if (response == 404){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The review does not exist.' }], }, 404);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
    });
  }
};
