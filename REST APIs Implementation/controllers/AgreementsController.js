'use strict';

var utils = require('../utils/writer.js');
var Agreements = require('../service/AgreementsService');
var constants = require('../utils/constants.js');

module.exports.createAgreement = function createAgreement (req, res, next) {
  var agreement = req.body; 
  var owner = req.user.id;
  var filmId = req.params.filmId;
  var reviewId = req.params.reviewId;
  var draftId = req.params.draftId; 
  if (isNaN(parseInt(filmId)) || isNaN(parseInt(reviewId)) ||  isNaN(parseInt(draftId)) ) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, reviewId and/or draftId they must be a number.' }], }, 400);
  }else if (!filmId || !reviewId || !draftId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId, reviewId and/or draftId parameters missing' }], }, 400);
  }else if(owner!=agreement.reviewerId){
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The reviewerId field of the agreement object is different from the id of the user requesting the operation.' }], }, 409);
  }else{
      Agreements.createAgreement(agreement, owner, filmId, reviewId, draftId)
      .then(function (response) {
        utils.writeJson(res, response, 201);
      })
      .catch(function (response) {
        if(response=="404A"){
          let msg="There's no draftId with ID " + req.params.draftId+ " associated with the review with ID "+req.params.reviewId + " issued for the film with ID filmId "+req.params.filmId; 
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
        }else if(response =="403B"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The draft has already been closed, all agreements have been posted.' }], }, 403);
        }else if(response == 403){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not one of the assigned reviewers.' }], }, 403);
        }else if("403C"){
          utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user has already published an agreement for this draft' }], }, 403);
        }
        else {
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
        }
      });
  }
  
};


module.exports.getAllAgreements = function getAllAgreements (req, res, next) {
  if (isNaN(parseInt(req.params.filmId)) || isNaN(parseInt(req.params.reviewId)) || isNaN(parseInt(req.params.draftId)) ) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, reviewId and/or draftId they must be a number.' }], }, 400);
  }else if (!req.params.filmId || !req.params.reviewId || !req.params.draftId) {
      utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId, reviewId and/or draftId parameters missing' }], }, 400);
  }else{
      var numOfAgreements=0; 
      var next=0; 
      Agreements.getAgreementsTotal(req.params.filmId, req.params.reviewId, req.params.draftId, req.user.id)
            .then(function(response){
                numOfAgreements=response; 
                Agreements.getAllAgreements(req)
                      .then(function (response) {
                          if (req.query.pageNo == null) var pageNo = 1;
                          else var pageNo = req.query.pageNo;
                          var totalPage=Math.ceil(numOfAgreements / constants.OFFSET);
                          next = Number(pageNo) + 1;
                          if (pageNo>totalPage) {
                              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': "The page does not exist." }], }, 404);
                          } else if (pageNo == totalPage) {
                              utils.writeJson(res, {
                                  totalPages: totalPage,
                                  currentPage: pageNo,
                                  totalItems: numOfAgreements,
                                  agreements: response
                              });
                          } else {
                              utils.writeJson(res, {
                                  totalPages: totalPage,
                                  currentPage: pageNo,
                                  totalItems: numOfAgreements,
                                  agreements: response,
                                  next: "/api/films/public/" + req.params.filmId+"/reviews/"+req.params.reviewId+"drafts/"+req.params.draftId+"agreements?pageNo=" + next
                              });
                          }
                      })
                      .catch(function (response) {
                        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
                      });
            }).catch(function(response) {
              if(response=="404A"){
                let msg="There's no draftId with ID " + req.params.draftId+ " associated with the review with ID "+req.params.reviewId + " issued for the film with ID filmId "+req.params.filmId; 
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
              }else if(response == "403A"){
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film nor is it one of the assigned reviewers' }], }, 403);
              }else if(response=="404B"){
                let msg="There are no agreements for the draft with ID "+req.params.draftId + " associated with a reviewId "+req.params.reviewId; 
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
              }
              else{
                utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
              }
          });
  }
  
};

module.exports.getSingleAgreement = function getSingleAgreement (req, res, next) {
    if (isNaN(parseInt(req.params.filmId)) || isNaN(parseInt(req.params.reviewId)) || isNaN(parseInt(req.params.draftId)) || isNaN(parseInt(req.params.reviewerId))) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'Invalid filmId, reviewId, draftId and/or reviewerId, they must be a number.' }], }, 400);
    }else if (!req.params.filmId || !req.params.reviewId || !req.params.draftId || !req.params.reviewerId) {
        utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'filmId, reviewId draftId and/or reviewerId parameters missing' }], }, 400);
    }else{
        Agreements.getSingleAgreement(req.params.filmId, req.params.reviewId, req.params.draftId, req.user.id, req.params.reviewerId)
        .then(function (response) {
          utils.writeJson(res, response);
        })
        .catch(function (response) {
          if(response=="404A"){
            let msg="There's no draftId with ID " + req.params.draftId+ " associated with the review with ID "+req.params.reviewId + " issued for the film with ID filmId "+req.params.filmId; 
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': msg }], }, 404);
          }else if(response=="404B"){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg':"The agreement does not exist." }], }, 404);
          }else if(response == "403A"){
            utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': 'The user is not the owner of the film nor is it one of the assigned reviewers' }], }, 403);
          }
          else {
              utils.writeJson(res, { errors: [{ 'param': 'Server', 'msg': response }], }, 500);
          }
        });
    }
  };
