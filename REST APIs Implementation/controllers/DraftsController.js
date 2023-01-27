'use strict';

var utils = require('../utils/writer.js');
var Drafts = require('../service/DraftsService');
var constants = require('../utils/constants.js');

module.exports.createDraft = function createDraft (req, res, next) {
  
  var draft = req.body; 
  var owner = req.user.id;
  var filmId = req.params.filmId;
  var reviewId = req.params.reviewId;
  if (isNaN(parseInt(req.params.filmId)) || isNaN(parseInt(req.params.reviewId)) ) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId or reviewId, they must be a number.' }], }, 400);
  }else if (!req.params.filmId || !req.params.reviewId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId or reviewId parameters missing' }], }, 400);
  }else if(owner != draft.reviewerId){
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId field of the draft object is different from the id of the user requesting the operation.' }], }, 409);
  }else{
    Drafts.createDraft(draft, owner, filmId, reviewId)
    .then(function (response) {
      utils.writeJson(res, response, 201);
    })
    .catch(function (response) {
      if (response == "404A"){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'No review with ID reviewId is associated with filmId.' }], }, 404);
      }else if(response == 403){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not one of the assigned reviewers.' }], }, 403);
      }
      else if(response==409){
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'There is already an open draft for this review' }], }, 409);
      }
      else {
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
      }
    });
  }

};


module.exports.getSingleDraft = function getSingleDraft (req, res, next) {
   if (isNaN(parseInt(req.params.filmId)) || isNaN(parseInt(req.params.reviewId)) || isNaN(parseInt(req.params.draftId))) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, reviewId or draftId, they must be a number.' }], }, 400);
  }else if (!req.params.filmId || !req.params.reviewId || !req.params.draftId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId, reviewId and/or draftId parameters missing' }], }, 400);
  }else{
      Drafts.getSingleDraft(req.params.filmId, req.params.reviewId, req.params.draftId, req.user.id, req.params.reviewerId)
      .then(function (response) {
        utils.writeJson(res, response);
      })
      .catch(function (response) {
        if (response == 404){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The draft does not exist.' }], }, 404);
        }else if(response == "403A"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film nor is it one of the assigned reviewers' }], }, 403);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
      });
  }
};


module.exports.getAllDrafts = function getAllDrafts (req, res, next) {

    var numOfDrafts=0; 
    var next=0; 
    if (isNaN(parseInt(req.params.filmId)) || isNaN(parseInt(req.params.reviewId)) ) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId or reviewId, they must be a number.' }], }, 400);
    }else if (!req.params.filmId || !req.params.reviewId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId or reviewId parameters missing' }], }, 400);
    }else{
      Drafts.getDraftsTotal(req.params.filmId, req.params.reviewId, req.user.id)
          .then(function(response){
              numOfDrafts=response; 
              Drafts.getAllDrafts(req)
                    .then(function (response) {
                        if (req.query.pageNo == null) var pageNo = 1;
                        else var pageNo = req.query.pageNo;
                        var totalPage=Math.ceil(numOfDrafts / constants.OFFSET);
                        next = Number(pageNo) + 1;
                        if (pageNo>totalPage) {
                            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                        } else if (pageNo == totalPage) {
                            utils.writeJson(res, {
                                totalPages: totalPage,
                                currentPage: pageNo,
                                totalItems: numOfDrafts,
                                drafts: response
                            });
                        } else {
                            utils.writeJson(res, {
                                totalPages: totalPage,
                                currentPage: pageNo,
                                totalItems: numOfDrafts,
                                drafts: response,
                                next: "/api/films/public/" + req.params.filmId+"/reviews/"+req.params.reviewId+"/drafts?pageNo=" + next
                            });
                        }
                    })
                    .catch(function (response) {
                      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                    });
          }).catch(function(response) {
            if(response=="404A"){
              let msg="There's no review with ID "+req.params.reviewId + " associated associated to the film with ID "+req.params.filmId; 
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
            }else if(response == "403A"){
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film nor is it one of the assigned reviewers' }], }, 403);
            }else if(response=="404B"){
              let msg="There are no drafts for the review with ID "+req.params.reviewId + " associated to a film with ID "+req.params.filmId; 
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
            }
            else{
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
            }
        });
    
    }
  };
