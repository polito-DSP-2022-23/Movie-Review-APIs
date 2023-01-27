class Agreement{    
    constructor(draftId, reviewerId, agreement, notes, reviewId, filmId) {
        this.draftId=draftId;
        this.reviewerId=reviewerId;
        this.agreement=agreement; 

        if(notes)
            this.notes=notes; 
        var selfLink = "/api/films/public/" + filmId + "/reviews/" + reviewId + "/drafts/"+this.draftId+"/agreements/"+this.reviewerId;
        this.self =  selfLink;
    }
}

module.exports = Agreement;