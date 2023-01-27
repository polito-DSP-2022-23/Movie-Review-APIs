class Review{    
    constructor(filmId, reviewerIds, completed, reviewId, reviewDate, rating, review) {
        this.filmId = filmId;
        this.reviewId = reviewId;
        this.reviewerIds=reviewerIds; 
        this.completed = completed;

        if(reviewDate)
            this.reviewDate = reviewDate;
        if(rating)
            this.rating = rating;
        if(review)
            this.review = review;
        
        var selfLink = "/api/films/public/" + this.filmId + "/reviews/" + this.reviewId;
        this.self =  selfLink;
    }
}

module.exports = Review;


