'use strict';

const Review = require('../components/review');
const db = require('../components/db');
var constants = require('../utils/constants.js');


/**
 * Retrieve the reviews of the film with ID filmId
 * 
 * Input: 
 * - req: the request of the user
 * Output:
 * - list of the reviews
 * 
 **/
 exports.getFilmReviews = function(req) {
  return new Promise((resolve, reject) => {
      var sql = "SELECT r.filmId as fid, r.reviewId as reid, r.completed as comp, r.reviewDate as rdate, r.rating as rat, r.review as rev, c.total_rows FROM reviews r, (SELECT count(*) total_rows FROM reviews r WHERE r.filmId = ?) c WHERE  r.filmId = ?";
      var params = getPagination(req);
      if (params.length != 2) sql = sql + " LIMIT ?,?";
      db.all(sql, params, async function (err, rows){
          if (err) {
              reject(err);
          } else {
              for(let i=0; i<rows.length; i++){
                rows[i]=await getReviewersFromReviewId(rows[i]); 
              }
              let reviews = rows.map((row) => createReview(row));
              resolve(reviews);
          }
      });
  });
}

const getReviewersFromReviewId = function(row){
    return new Promise((resolve, reject) => {
        var sql="SELECT * FROM reviewers WHERE reviewId=?"
        db.all(sql, [row.reid], function(err, rows) {
            if (err) {
                reject(err);
            } else {
                let reviewerIds=[]; 
                for(let j=0; j<rows.length; j++){
                    reviewerIds.push(rows[j].reviewerId); 
                }
                row["reviewerIds"]=reviewerIds;
                resolve(row);  
            }
        });
    });
}
/**
 * Retrieve the number of reviews of the film with ID filmId
 * 
 * Input: 
* - filmId: the ID of the film whose reviews need to be retrieved
 * Output:
 * - total number of reviews of the film with ID filmId
 * 
 **/
 exports.getFilmReviewsTotal = function(filmId) {
  return new Promise((resolve, reject) => {
      var sqlNumOfReviews = "SELECT count(*) total FROM reviews r WHERE r.filmId = ?";
      db.get(sqlNumOfReviews, [filmId], (err, size) => {
          if (err) {
              reject(err);
          } else {
              resolve(size.total);
          }
      });
  });
}



/**
 * Retrieve the review of the film having filmId as ID and issued to review with reviewId as ID
 *
 * Input: 
 * - filmId: the ID of the film whose review needs to be retrieved
 * - reviewId: the ID ot the review
 * Output:
 * - the requested review
 * 
 **/
 exports.getSingleReview = function(filmId, reviewId) {
  return new Promise((resolve, reject) => {
      const sql = "SELECT r.filmId as fid, r.reviewId as reid, r.completed comp, r.reviewDate rdate, r.rating rat, r.review rev FROM reviews r WHERE r.filmId = ? AND r.reviewId = ?";
      db.all(sql, [filmId, reviewId], async function (err, rows){
          if (err)
              reject(err);
          else if (rows.length === 0)
              reject(404);
          else {
              rows[0]=await getReviewersFromReviewId(rows[0]); 
              var review = createReview(rows[0]);
              resolve(review);
          }
      });
  });
}


/**
 * Delete a review invitation
 *
 * Input: 
 * - filmId: ID of the film
 * - reviewId: ID of the review
 * - owner : ID of user who wants to remove the review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.deleteSingleReview = function(filmId,reviewId,owner) {
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT f.owner, r.completed FROM films f, reviews r WHERE f.id = r.filmId AND f.id = ? AND r.reviewId = ?";
      db.all(sql1, [filmId, reviewId], (err, rows) => {
          if (err){
              reject(err);
          }else if (rows.length === 0){
              reject(404);
          }else if(owner != rows[0].owner) {
              reject("403A");
          }
          else if(rows[0].completed == 1) {
              reject("403B");
          }
          else {
              const sql2 = 'DELETE FROM reviews WHERE filmId = ? AND reviewId = ?';
              db.run(sql2, [filmId, reviewId], (err) => {
                  if (err){
                      reject(err);
                } else
                      resolve(null);
              })
          }
      });
  });

}



/**
 * Issue a film review to a user
 *
 *
 * Input: 
 * - reviewerIds : array containing the IDs of the film reviewers if it is a cooperative review or containing a single ID if it is a single review
 * - filmId: ID of the film 
 * - owner: ID of the user who wants to issue the review
 * - reviewId: ID of the newly created review
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.issueFilmReview = function(invitations,owner) {
  return new Promise((resolve, reject) => {
      const sql1 = "SELECT owner, private FROM films WHERE id = ?";
      db.all(sql1, [invitations[0].filmId], (err, rows) => {
          if (err){
                reject(err);
          }
          else if (rows.length === 0){
              reject(404);
          }
          else if(owner != rows[0].owner) {
              reject(403);
          } else if(rows[0].private == 1) {
              reject(404);
          }else {
            var sql2 = 'SELECT * FROM users' ;
            let k=0; 
            var invitedUsers = [];
            for (var i = 0; i < invitations.length; i++) {
                let uniqueSet= new Set(invitations[i].reviewerIds); 
                if(uniqueSet.size!==invitations[i].reviewerIds.length){
                    reject(400); 
                    return; 
                }
                for(var j=0; j<invitations[i].reviewerIds.length; j++){
                    if(i == 0 && j==0) sql2 += ' WHERE id = ?';
                    else sql2 += ' OR id = ?'
                    invitedUsers[k] = invitations[i].reviewerIds[j];
                    k=k+1; 
                }
                
            }
            let uniqueUsers=[...new Set(invitedUsers)];

            db.all(sql2, invitedUsers, async function(err, rows) {
                if (err) {
                    reject(err);
                } 
                else if (rows.length !== uniqueUsers.length){
                    reject(409);
                }
                else {
                    try{ //check if the user or group of users has already been assigned to a review for the same film   

                        await checkReviewerIds(invitations[0].filmId, invitations);

                        const sql3 = 'INSERT INTO reviews(filmId, completed) VALUES(?,0)';
                        var finalResultReview = [];
                        for (var i = 0; i < invitations.length; i++) {
                            var singleResultReview;
                            try {
                                singleResultReview = await issueSingleReview(sql3, invitations[i].filmId);
                                finalResultReview[i] = singleResultReview;
                            } catch (error) {
                                reject ('Error in the creation of the review data structure');
                                break;
                            }
                        }
    
                        if(finalResultReview.length !== 0){
                            const sql4= 'INSERT INTO reviewers(reviewId, reviewerId) VALUES(?,?)';
                            var finalResultReviewers=[]; 
                            var m=0; 
                            for(var i=0; i<invitations.length; i++){
                                for(var j=0; j<invitations[i].reviewerIds.length; j++){
                                    var singleResultReviewers; 
                                    try{
                                        singleResultReviewers=await issueSingleReviewers(sql4, invitations[i].filmId, finalResultReview[i].reviewId, invitations[i].reviewerIds, invitations[i].reviewerIds[j]);
                                        finalResultReviewers[m]=singleResultReviewers;
                                        m=m+1; 
                                    }catch(error){
                                        reject('Error in the insertion of the reviewers table.');
                                        break; 
                                    }
                                }
                            }
                            if(finalResultReviewers.length !== 0){
                                let uniqueFinalResultReviewers = finalResultReviewers.filter((item, index) => finalResultReviewers.findIndex(i => i.reviewId === item.reviewId) === index);
                                resolve(uniqueFinalResultReviewers); 
                            }
                        }   
                    }catch(error){
                        reject(error);
                    }
                }
            }); 
          }
      });
  });
}

const checkReviewerIds= function(filmId, invitations){
    return new Promise((resolve, reject) => {
        let sql='SELECT reviewId from reviews where filmId=?'; 
        db.all(sql, [filmId], async function(err, rows) {
            if (err) {
                reject(err);
            } else {
                for(let i=0; i<rows.length; i++){
                    try{
                        let res = await checkReviewerConflicts(rows[i].reviewId, invitations); 
                    }catch(error){
                        reject(error); 
                        break; 
                    }   
                }
                resolve();
            }
        });
    })
}

const checkReviewerConflicts=function(reviewId, invitations){
    return new Promise((resolve, reject) => {
        let sql2='SELECT reviewerId from reviewers WHERE reviewId=?'
        db.all(sql2, [reviewId], function(err, rows){
            if(err){
                reject(err);
            }else if(rows.length==1){ //review with ID reviewId has a single reviewer
                for(let j=0; j<invitations.length; j++){
                    if(invitations[j].reviewerIds.length==1 && invitations[j].reviewerIds[0]==rows[0].reviewerId){
                        reject("A user or a group of users can review only once for a given film, unless it belongs to different groups from existing ones"); 
                        break; 
                    }
                }
            }else{
                let reviewersList=[];
                for(let k=0; k<rows.length; k++){
                    reviewersList.push(rows[k].reviewerId)
                }
                for(let j=0; j<invitations.length; j++){
                    if(invitations[j].reviewerIds.length==rows.length && invitations[j].reviewerIds.sort().toString()===reviewersList.sort().toString()){
                        reject("A user or a group of users can review only once for a given film, unless it belongs to different groups from existing ones"); 
                        break; 
                    }
                }
            }
            resolve(true); 
        });
    })
}
const issueSingleReview = function(sql3, filmId){
    return new Promise((resolve, reject) => {
        db.run(sql3, [filmId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, undefined, false, this.lastID,);
                resolve(createdReview);
            }
        });
    })
}

const issueSingleReviewers=function(sql4, filmId, reviewId, reviewerIds, reviewerId){
    return new Promise((resolve, reject) => {
        db.run(sql4, [reviewId, reviewerId], function(err) {
            if (err) {
                reject('500');
            } else {
                var createdReview = new Review(filmId, reviewerIds, false, reviewId);
                resolve(createdReview);
            }
        });
    })
}

/**
 * Complete and update a review
 *
 * Input:
 * - review: review object (with only the needed properties)
 * - filmID: the ID of the film to be reviewed
 * - reviewerId: the ID of the reviewer
 * - reviewId: the ID of the review being updated
 * Output:
 * - no response expected for this operation
 * 
 **/
 exports.updateSingleReview = function(review, filmId, reviewId, reviewerId) {
  return new Promise(async (resolve, reject) => {
        
        try{
            await checkSingleReviewer(reviewId, reviewerId); 
            let sql1="SELECT * FROM reviews r WHERE r.filmId=? AND r.reviewId=?"; 
            db.all(sql1, [filmId, reviewId], (err, rows)=>{
                if(err){
                    reject(err);
                }else if(rows.length==0){
                    reject(404); 
                }else{
                    var sql2 = 'UPDATE reviews SET completed = ?';
                    var parameters = [review.completed];
                    if(review.reviewDate != undefined){
                    sql2 = sql2.concat(', reviewDate = ?');
                    parameters.push(review.reviewDate);
                    } 
                    if(review.rating != undefined){
                        sql2 = sql2.concat(', rating = ?');
                        parameters.push(review.rating);
                    } 
                    if(review.review != undefined){
                        sql2 = sql2.concat(', review = ?');
                        parameters.push(review.review);
                    } 
                    sql2 = sql2.concat(' WHERE filmId = ? AND reviewId = ?');
                    parameters.push(filmId);
                    parameters.push(reviewId);

                    db.run(sql2, parameters, function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(null);
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
 * Utility functions
 */
const getPagination = function(req) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(constants.OFFSET);
   
    var limits = [];
    limits.push(req.params.filmId);
    limits.push(req.params.filmId);
    if (req.query.pageNo == null) {
        pageNo = 1;
    }
    limits.push(size * (pageNo - 1));
    limits.push(size);
    return limits;
  }

const checkSingleReviewer = function (reviewId, reviewerId){
    return new Promise((resolve, reject)=>{
        let sql = 'SELECT rs.reviewId, rs.reviewerId, c.total_count FROM reviews r, reviewers rs, (SELECT count(*) total_count FROM reviewers rs WHERE rs.reviewId=?) c WHERE r.reviewId=? AND rs.reviewId=r.reviewId AND rs.reviewerId=?';
        db.all(sql, [reviewId, reviewId, reviewerId], (err, rows)=>{
            if(err){
                reject(err);
            }else if(rows.length===0){
                reject("403A"); 
            }else if(rows[0].total_count>1){
                reject("403B"); 
            }else{
                resolve(); 
            }
        });
    });
}
const createReview = function(row) {
  var completedReview = (row.comp === 1) ? true : false;
  return new Review(row.fid, row.reviewerIds, completedReview, row.reid, row.rdate, row.rat, row.rev);
}