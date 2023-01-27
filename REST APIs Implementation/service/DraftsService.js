'use strict';

const Draft = require('../components/draft');
const User = require('../components/user');
var constants = require('../utils/constants.js');
const db = require('../components/db');

/**
 * Retrieve the drafts of the review with ID reviewId, associated with film with ID filmId
 * 
 * Input: 
 * - reviewId: the ID of the review for which the drafts are being requested
 * - filmId: the ID of the film to which the review is associated with
 * Output:
 * - list of the drafts
 * 
 **/
exports.getAllDrafts = function(req) {
    return new Promise((resolve, reject) => {
        var sql = "SELECT draftId, reviewId, proposedRating, proposedReview, reviewerId, open FROM drafts WHERE reviewId=?";
        var params = getPagination(req);
        if (params.length != 2) sql = sql + " LIMIT ?,?";
        db.all(sql, params, function (err, rows){
            if (err) {
                reject(err);
            } else {
                let drafts = rows.map((row) => createDraftObject(row, req.params.filmId));
                resolve(drafts);
            }
        });
    });
  }

const createDraftObject = function(row, filmId) {
    var completedDraft = (row.open === 1) ? true : false;
    return new Draft(row.draftId, row.reviewId, filmId, row.reviewerId, row.proposedRating, row.proposedReview, completedDraft);
}

/**
 * Retrieve the number of drafts of the review with ID reviewId, associated with the film with ID filmId
 * 
 * Input: 
 * - filmId: the ID of the film associated with review with ID reviewId
 * - reviewId: the ID of the review whose drafts need to be retrieved 
 * Output:
 * - total number of drafts of the review with ID reviewId, associated with filmId 
 * 
 **/

exports.getDraftsTotal = function(filmId, reviewId, user) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkRequestingUser(filmId, reviewId, user); 
            let sql1="SELECT * FROM reviews r WHERE r.filmId=? AND r.reviewId=?"; 
            db.all(sql1, [filmId, reviewId],(err,rows)=>{
                if(err){
                    reject(err); 
                }else if(rows.length==0){
                    reject("404A"); //no such reviewId associated with filmId
                }else{
                    let sqlNumOfDrafts = "SELECT count(*) total FROM reviews r, drafts d WHERE r.filmId = ? AND r.reviewId = ? AND d.reviewId=r.reviewId";
                    db.get(sqlNumOfDrafts, [filmId, reviewId], (err, size) => {
                        if (err) {
                            reject(err);
                        }else if(size.total==0){
                            reject("404B") //no drafts found associated with reviewId 
                        } else {
                            resolve(size.total);
                        }
                    });
                }
            });
        }catch(error){
            reject(error); 
        }
    });
  }

  /**
 * Retrieve the draft of the review having ID review ID, associated to the film having filmId as ID
 *
 * Input: 
 * - filmId: the ID of the film
 * - reviewId: the ID ot the review whose draft needs to be retrieved
 * - draftId: the ID of the draft being retrieved 
 * Output:
 * - the requested draft
 * 
 **/
 exports.getSingleDraft = function(filmId, reviewId, draftId, user) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkRequestingUser(filmId, reviewId, user); 
            const sql = "SELECT d.draftId, d.reviewId, d.proposedRating, d.proposedReview, d.reviewerId, d.open FROM reviews r, drafts d WHERE r.filmId = ? AND r.reviewId = ? AND d.reviewId=r.reviewId AND d.draftId=?";
            db.all(sql, [filmId, reviewId, draftId], async function (err, rows){
                if (err){
                    reject(err);
                }
                else if (rows.length==0)
                    reject(404);
                else { 
                    var draft = createDraftObject(rows[0], filmId);
                    resolve(draft);
                }
            });
        }catch(error){
            reject(error); 
        }
    });
  }

/**
 * Create a new Draft
 *
 * Input: 
 * - drafft : the draft objecct that needs to be created 
 * - filmId: the ID of the film for which the review with ID reviewId was issued, to which the draft will be associated with
 * - reviewId: the ID of the review to which the draft will be associated with
 * - owner: ID of the user who is creating the draft
 * Output:
 * - the created draft
 **/
exports.createDraft = function(draft, owner, filmId, reviewId) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkDraftAuthor(filmId, reviewId, owner);  
            await checkOpenDrafts(filmId, reviewId); 
            await checkReviewCompleted(reviewId, filmId);
            const sql = 'INSERT INTO drafts(reviewId, proposedRating, proposedReview, reviewerId) VALUES(?,?,?,?)';
            db.run(sql, [reviewId, draft.proposedRating, draft.proposedReview, owner], function(err) {
                if (err) {
                    reject(err);
                } else {
                    var createdDraft = new Draft(this.lastID, reviewId, filmId, owner, draft.proposedRating, draft.proposedReview);
                    resolve(createdDraft);
                }
            });
        }catch(error){
            reject(error); 
        }
  });
  }

  /**
 * Utility functions
 */
const getPagination = function(req) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(constants.OFFSET);
   
    var limits = [];
    if(req.params.reviewId){
        limits.push(req.params.reviewId);
    }
    if (req.query.pageNo == null) {
        pageNo = 1;
    }
    limits.push(size * (pageNo - 1));
    limits.push(size);
    return limits;
  }

  const checkRequestingUser = function(filmId, reviewId, user){
    return new Promise((resolve, reject) => {
        let sql = "SELECT f.owner FROM films f WHERE f.id=?";
        db.all(sql, [filmId], (err,rows)=>{
            if(err){
                reject(err);
            }else if(rows[0].owner!=user){
                let sql2="SELECT reviewerId FROM reviews r, reviewers rs WHERE r.reviewId=? AND r.filmId=? AND rs.reviewId=r.reviewId";
                db.all(sql2, [reviewId, filmId], (err,rows)=>{
                    if(err){
                        reject(err);
                    }else if(!rows.find((row) => row.reviewerId === user)){
                        reject("403A");
                    }else{
                        
                        resolve(); 
                    }
                })
            }else {
                resolve();  
            }
        });
    });
}

const checkReviewCompleted = function(reviewId, filmId){
    return new Promise((resolve, reject)=>{
        let sql = 'SELECT completed FROM reviews r WHERE r.reviewId=? AND r.filmId=?'; 
        db.all(sql, [reviewId, filmId], (err, rows)=>{
            if(err){
                reject(err);
            }else if(rows[0].completed===1){
                reject("403C"); 
            }else{
                resolve(); 
            }
        });
    });
}

const checkDraftAuthor=function (filmId, reviewId, owner){
    return new Promise((resolve, reject)=>{
        let sql1='SELECT * FROM reviews r WHERE r.reviewId=? AND r.filmId=?'; 
        db.all(sql1, [reviewId, filmId], (err, rows)=>{
            if(err){
                reject(err); 
            }else if(rows.length==0){
                reject("404A"); // No review with ID reviewId is associated with filmId 
            }else{
                let sql2='SELECT * FROM reviewers rs WHERE rs.reviewId=? AND rs.reviewerId=?'; 
                db.all(sql2, [reviewId, owner], (err, rows)=>{
                    if(err){
                        reject(err); 
                    }else if(rows.length==0){
                        reject(403); //The user is not one of the assigned reviewers 
                    }else{
                        resolve(); 
                    }
                })
            }
        });
    });
}

const checkOpenDrafts=function(filmId, reviewId){
    return new Promise((resolve, reject)=>{
        let sql='SELECT count(*) total from reviews r, drafts d WHERE r.reviewId=? AND r.filmId=? AND d.reviewId=r.reviewId AND d.open=1'; 
        db.get(sql, [reviewId, filmId], (err, size) => {
            if (err) {
                reject(err);
            } else if(size.total>0){
                reject(409); //there's already an open draft 
            }else{
                resolve();
            }
        });
    }); 
}