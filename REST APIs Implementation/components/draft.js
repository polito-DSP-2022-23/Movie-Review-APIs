class Draft{    
    constructor(draftId, reviewId, filmId, reviewerId, proposedRating, proposedReview, open=true) {
        this.draftId=draftId;
        this.reviewId=reviewId;
        this.reviewerId=reviewerId;
        this.proposedRating=proposedRating;
        this.proposedReview=proposedReview;
        this.open=open; 
        
        var selfLink = "/api/films/public/" + filmId + "/reviews/" + this.reviewId + "/drafts/"+this.draftId;
        this.self =  selfLink;
    }
}

module.exports = Draft;


