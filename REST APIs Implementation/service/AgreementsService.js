'use strict';

const Agreement = require('../components/agreement');
const User = require('../components/user');
var constants = require('../utils/constants.js');
const db = require('../components/db');

/**
 * Retrieve the agreements of the draft with ID draftId, associated with review with ID reviewId, issued for the film with ID filmId
 * 
 * Input: 
 * - draftId: the ID of the draft whose agreements we're requesting
 * - reviewId: the ID of the review to which the draft is associated with
 * - filmId: the ID of the film for which the review was issued
 * Output:
 * - list of the agreements
 * 
 **/
exports.getAllAgreements = function(req) {
    return new Promise((resolve, reject) => {
        var sql = "SELECT a.draftId, a.reviewerId, a.agreement, a.notes FROM agreements a, drafts d, reviews r WHERE r.filmId=? AND r.reviewId=? AND d.draftId=? AND d.reviewId=r.reviewId AND a.draftId=d.draftId";
        var params = getPagination(req);
        if (params.length != 2) sql = sql + " LIMIT ?,?";
        db.all(sql, params, function (err, rows){
            if (err) {
                reject(err);
            } else {
                let agreements = rows.map((row) => createAgreementObject(row, req.params.filmId, req.params.reviewId, req.user.id));
                resolve(agreements);
            }
        });
    });
}

/**
 * Retrieve the number of agreements of the draft with ID draftID, associated with the review with ID reviewId, issued for the film with ID filmId
 * 
 * Input: 
 * - filmId: the ID of the film for which the review was requested
 * - reviewId: the ID of the review to which the draft is associated with
 * - draftId: the ID of the draft whose agreements we're requested
 * Output:
 * - total number of agreements 
 * 
 **/

exports.getAgreementsTotal = function(filmId, reviewId, draftId, user) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkRequestingUser(filmId, reviewId, user); 
            await checkDraftExistence(filmId, reviewId, draftId); 

            let sqlNumOfDrafts = "SELECT count(*) total FROM reviews r, drafts d, agreements a WHERE r.filmId=? AND r.reviewId=? AND d.reviewId=r.reviewId AND d.draftId=? AND a.draftId=d.draftId";
            db.get(sqlNumOfDrafts, [filmId, reviewId, draftId], (err, size) => {
                if (err) {
                    reject(err);
                }else if(size.total==0){
                    reject("404B") //no agreements found 
                } else {
                    resolve(size.total);
                }
            });
        }catch(error){
            reject(error); 
        }
    });
  }

   /**
 * Retrieve the agreement of the draft having ID draftId, associated with the review with ID reviewId, which was issued for the film film having filmId as ID
 ** Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewId: the ID ot the review
 * - draftId: the ID of the draft associated with the agreement 
 * - reviewerId: the ID of the author of the agreement
 * - user : the ID of the user requesting the operation, which can be the film owner or one of the reviewers of the draft
 * Output:
 * - the requested agreement
 * 
 **/
 exports.getSingleAgreement = function(filmId, reviewId, draftId, user, reviewerId) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkRequestingUser(filmId, reviewId, user); 
            await checkDraftExistence(filmId, reviewId, draftId); 

            const sql = "SELECT a.draftId, a.reviewerId, a.agreement, a.notes FROM agreements a, drafts d, reviews r WHERE r.filmId=? AND r.reviewId=? AND d.draftId=? AND d.reviewId=r.reviewId AND a.draftId=d.draftId  AND a.reviewerId=?";
            db.all(sql, [filmId, reviewId, draftId, reviewerId], async function (err, rows){
                if (err){
                    reject(err);
                }
                else if (rows.length==0)
                    reject("404B");
                else { 
                    var draft = createAgreementObject(rows[0], filmId, reviewId, reviewerId);
                    resolve(draft);
                }
            });
        }catch(error){
            reject(error); 
        }
    });
  }

/**
 * Create a new agreement
 *
 * Input: 
 * - filmId: the ID of the film for which the review was issued
 * - reviewId: the ID of the review to which the draft will be associated
 * - draftId: the ID of the draft to which the agreement will be associated
 * - agreement: the agreement object that needs to be created
 * - owner: ID of the user who is creating the agreement
 * Output:
 * - the created agreement
 **/


exports.createAgreement = function(agreement, owner, filmId, reviewId, draftId) {
    return new Promise(async (resolve, reject) => {
        try{
            await checkAgreementAuthor(filmId, reviewId, owner, draftId); 
            await checkDraftExistence(filmId, reviewId, draftId);
            let rows = await checkLastAgreement(filmId, reviewId, draftId);
            if (rows){
                var allDisagreed= rows.find((row) => parseInt(row.agreement) === 0); 
                var newAgreement; 
                if(rows[0].total_remaining==1){ //last one 
                    if(allDisagreed){ //at least one disagreement
                        newAgreement = await insertNewAgreement(filmId, draftId, reviewId, owner, agreement.agreement, agreement.notes);
                        await closeDraft(draftId, reviewId); 
                        resolve(newAgreement)
                    }else{//allAgreed
                        if(agreement.agreement===true){
                            newAgreement = await insertNewAgreement(filmId, draftId, reviewId, owner, agreement.agreement, agreement.notes);
                            await closeDraft(draftId, reviewId); 
                            let currentDate = new Date();
                            currentDate = currentDate.toISOString().slice(0, 10);
                            let draft=await getDraft(draftId, reviewId);
                            await updateCooperativeReview(draft, currentDate, reviewId, filmId);
                            resolve(newAgreement); 
                        }else{
                            newAgreement = await insertNewAgreement(filmId, draftId, reviewId, owner, agreement.agreement, agreement.notes);
                            await closeDraft(draftId, reviewId); 
                            resolve(newAgreement);
                        }
                        
                    }
                }else if(rows[0].total_reamining>1){ //not the last one, just insert the agreement to the draft
                    newAgreement = await insertNewAgreement(filmId, draftId, reviewId, owner, agreement.agreement, agreement.notes);
                    resolve(newAgreement);
                }
            }else{//first agreement
                let newAgreement = await insertNewAgreement(filmId, draftId, reviewId, owner, agreement.agreement, agreement.notes);
                resolve(newAgreement);
            }
            
        }catch(error){
            reject(error); 
        }
  });
  }

/*
 * Utility functions
 */
const getPagination = function(req) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(constants.OFFSET);

    var limits = [];
    if(req.params.filmId && req.params.reviewId && req.params.draftId){
        limits.push(req.params.filmId);
        limits.push(req.params.reviewId);
        limits.push(req.params.draftId);
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


const checkDraftExistence = function (filmId, reviewId, draftId){
    return new Promise((resolve, reject)=>{
        let sql = 'SELECT count(*) total FROM reviews r, drafts d WHERE r.filmId=? AND r.reviewId=? AND d.reviewId=r.reviewId AND d.draftId=?'; 
        db.get(sql, [filmId, reviewId, draftId], (err, size)=>{
            if (err) {
                reject(err);
            } else if(size.total==0){
                reject("404A"); //no association found (reviews/drafts)
            }else{
                resolve();
            }
        })
    })
}

const checkAgreementAuthor=function (filmId, reviewId, owner, draftId){
    return new Promise((resolve, reject)=>{
        let sql='SELECT count(*) total FROM reviewers rs, reviews r WHERE r.filmId=? AND r.reviewId=? AND rs.reviewId=r.reviewId AND rs.reviewerId=?'; 
        db.get(sql, [filmId, reviewId, owner], (err, size)=>{
            if(err){
                reject(err); 
            }else if(size.total==0){
                reject(403); //The user is not one of the assigned reviewers 
            }else{
                let sql2 = 'SELECT count(*) total FROM reviews r, drafts d, agreements a WHERE r.filmId=? AND r.reviewId=? AND d.reviewId=r.reviewId AND d.draftId=? AND a.draftId=d.draftId and a.reviewerId=?';
                db.get(sql2, [filmId, reviewId, draftId, owner], (err,size)=>{
                    if(err){
                        reject(err);
                    }else if(size.total>0){
                        reject("403C") //The user has already published an agreement for this draft
                    }else if(size.total===0){
                        resolve(); 
                    }
                })
            }
        });
    });
}

const checkLastAgreement=function(filmId, reviewId, draftId){
    return new Promise((resolve, reject)=>{
        let sql='SELECT (total_reviewers - 1 - total_agreements) total_remaining, agreementsValue.agreement FROM (SELECT count(*) total_reviewers FROM reviewers rs, reviews r WHERE  r.reviewId=? AND r.filmId=? AND rs.reviewId=r.reviewId), (SELECT count(*) total_agreements FROM agreements a, reviews r, drafts d WHERE  r.reviewId=? AND r.filmId=? AND d.reviewId=r.reviewId AND d.draftId=? AND a.draftId=d.draftId), (SELECT agreement FROM agreements a, reviews r, drafts d WHERE  r.reviewId=? AND r.filmId=? AND d.reviewId=r.reviewId AND d.draftId=? AND a.draftId=d.draftId) agreementsValue'
        db.all(sql, [reviewId, filmId, reviewId, filmId, draftId, reviewId, filmId, draftId], (err, rows)=>{
            if(err){
                reject(err); 
            }else if(rows.length===0){
                resolve(false); //not last agreement  
            }
            else if(rows[0].total_remaining==0){
                reject("403B"); //the draft is already closed. 
            }else{
                resolve(rows); //rows contain total_agreement, and agreement values 
            }
        })
    }); 
}

const insertNewAgreement=function(filmId, draftId, reviewId, owner, agreement, notes){
    return new Promise((resolve, reject)=>{
        let sql=""; 
        let params=[]; 
        if(agreement==true){
            sql = 'INSERT INTO agreements(draftId, reviewerId, agreement) VALUES(?,?,1)';
            params.push(draftId, owner); 
        }else if(agreement==false){
            sql = 'INSERT INTO agreements(draftId, reviewerId, agreement, notes) VALUES(?,?,0,?)';
            params.push(draftId, owner,notes); 
        }
        db.run(sql, params, function(err) {
            if (err) {
                console.log(err)
                reject(err);
            } else {
                var createdAgreement = new Agreement(draftId, owner, agreement, notes, reviewId, filmId);
                resolve(createdAgreement);
            }
        });
    });
}

const closeDraft=function(draftId, reviewId){
    return new Promise((resolve, reject)=>{
        const sql='UPDATE drafts SET open=0 WHERE draftId=? AND reviewId=?';
        db.run(sql, [draftId, reviewId], function(err){
            if (err) {
                reject(err);
                } else {
                resolve();
            }
        })
    });
}

const updateCooperativeReview=function(draft, currentDate, reviewId, filmId ){
    return new Promise((resolve, reject)=>{
        const sql='UPDATE reviews SET completed=1, reviewDate=?, rating=?, review=? WHERE reviewId=? AND filmId=?'; 
        db.run(sql, [currentDate, draft.proposedRating, draft.proposedReview, reviewId, filmId], function(err){
            if(err){
                reject(err);
            }else{
                resolve(); 
            }
        }); 
    });
}

const getDraft=function(draftId, reviewId){
    return new Promise((resolve,reject)=>{
        const sql='SELECT * FROM drafts d WHERE draftId=? AND reviewId=?';
        db.all(sql, [draftId, reviewId], (err, rows)=>{
            if(err){
                reject(err);
            }else{
                resolve(rows[0]); 
            }
        })
    }); 
}

const createAgreementObject = function(row, filmId, reviewId, reviewerId) {
    var agreementResult = (row.agreement === 1) ? true : false;
    return new Agreement(row.draftId, reviewerId, agreementResult, row.notes, reviewId, filmId);
}