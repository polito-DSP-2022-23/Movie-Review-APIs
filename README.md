# Project Report

## Introduction

This project is an extension of the REST APIs for Laboratory 1, introducing the possibility for reviews to be completed by more than one user in a cooperative way.

## Directory Structure

In the project directory you can find the following main folders:

- JSON Schemas: folder containing the files describing the schemas for review, film, draft, agreement and user data structures, plus some examples to validate the schemas.
- REST APIs Design:

  - Postman Collections: the folder contains examples of
    invocations of the API operations in the form of Postman collections.
  - openapi.yaml
- REST APIs Implementation: contains the code for the REST APIs.

  - api: this folder contains the OpenAPI specification for the APIs in the form of an "openapi.yaml" file.
    - openapi.yaml
  - components: this folder contains the code for the different components of the system
    - agreement.js
    - db.js
    - draft.js
    - film.js
    - review.js
    - user.js
  - controllers: this folder contains the code for the controllers which handle the incoming HTTP requests and calls the appropriate service
    - AgreementsController.js
    - DraftsController.js
    - FilmsController.js
    - ReviewsController.js
    - UsersController.js
  - database: this folder contains the "databaseV1.db" file which is used to store the data
    - databaseV1.db
  - json_schemas: this folder contains the schemas used to validate body requests for POST/PUT API calls.
    - agreement_schema.json
    - film_schema.json
    - review_draft_schema.json
    - review_schema.json
    - user_schema.json
  - service: this folder contains the code for the different services which handle the business logic of the APIs.
    - AgreementsService.js
    - DraftsService.js
    - FilmsService.js
    - ReviewsService.js
    - UsersService.js

The API endpoints and database have been extended to support the new functionality, including:

- the ability to create a review draft
- express agreement or disagreement on a draft
- update the review upon draft closure with agreement from all co-assignees

## Getting Started

### Running the server

To install dependencies and launch the server, in the folder REST APIs Implementation > `npm start`

### Testing

To test the app, you can use the following credentials:

| Id | Email                      | Password  |
| -- | -------------------------- | --------- |
| 1  | user.dsp@polito.it         | password  |
| 2  | frank.stein@polito.it      | shelley97 |
| 3  | karen.makise@polito.it     | fg204v213 |
| 4  | rene.regeay@polito.it      | historia  |
| 5  | beatrice.golden@polito.it  | seagulls  |
| 6  | arthur.pendragon@polito.it | holygrail |

#### Postman Collections

To test the APIs, you can use the postman collections in the folder REST APIs Design/Postman Collections. To import them, open the postman application, in 'Collections', click on import and select the files.

## Design Choices

#### Overview

The following assumptions were made during the design of the APIs:

- A draft is immutable, so the user cannot edit a previously created draft (in open state)
- A draft cannot be removed as it is also immutable
- A user can belong to different review groups for different films as well as for the same film. The single user instead cannot write multiple reviews for the same film.
- A cooperative group cannot write a second review for the same film.
- A review can have only one group or one single reviewer assigned.
- A single review or a cooperative review can be deleted only if it is not marked as completed. In case it is deleted, all the associated records (e.g. drafts, agreements, reviewers) are also deleted in the db.
- Drafts and agreements can be seen also by the owner of the film, as well as the assigned reviewers.

### Schema Design

In the design of JSON schemas, I decided to separate the agreement data structure from that of the draft as it allows for more flexibility. By separating draft and agreement, it also is easier to understand the structure and purpose of each schema and to validate the data according to the specific requirements. Additionally, the two schemas can evolve independently from each other. For example, if new properties or validation rules are needed for the draft schema, we can add them without affecting the agreements schema. This can greatly simplify the development and maintenance of the API. Lastly, because a draft can have multiple agreements/disagreements depending on the size of the cooperative group, this also makes it easy to retrieve and update the agreement data separately from the draft data.

The draft properties were also defined in a separate schema from that of the review for the following reasons:

- organization and maintainability: it is easier to understand and maintain the APIs, as the different types of data and their properties are clearly defined and organized.
- reusability: the schemas can be reused across different parts of the API, reducing the amount of duplicated code and making it easier to make changes to the data structure.
- validation: separating the schemas allows for more specifici and accurate validation of the data, as the properties and constraints of each schema can be clearly defined.
- By separating the schema of the draft it might also be more secure to provide the information only to the inteded parties and not to show them directly to the public.
- flexibility: the separation of the two schemas allows the API to evolve and adapt to different use cases, by adding or removing properties from one schema without affecting the other.
- The **'Review' schema** has been changed from the one in the provided solution for LAB1 to adapt it to the new requirements. More specifically, the property reviewerId has been substituted by reviewId, which is now the unique identifier of the review. An additional property has been added (reviewerIds) to represent the reviewers of the associated review. It is an array containing the unique identifiers of the users who have received a review invitation. The array can be 1 item long, in the case of single user reviews. All the other fields remain unchanged. In particular, the filmId property will be used to keep the association between review and film. The new required fields have been updated to: filmId, reviewId and reviewerIds.
- The **'Review Draft' schema** has been designed to describe the draft data structure. The draft object will be identified by the unique identifier draftId. Additionally, the schema contains the reviewId property which describes the association between a draft to its review. For this reason, it is not necessary to also add the properties from the review schema, as it would be redundant. All the other properties (including proposedRating, proposedReview, reviewerId - author of the draft - and open) have been added as requested in the requirements.
- A separate '**Agreement' schema** has been designed to describe the specific agreements to a draft. It is identified by the joint properties of draftId and reviewerId, which is the reviewer who has made the agreement/disagreement. Additional properties such as agreeement and notes have been added, as requested in the requirements. More specifically, if the agreement is set to false (disagreement), then notes will be required.

### API Design

#### Changed APIs (wrt the proposed solution for LAB1)

In addition to the new schemas and modified/added APIs, the 'openapi.yaml' file also includes examples of body requests for PUT and POST operations, as well as examples of response bodies for GET operations and of error messages for each API.

- Film APIs
  - films/private/{filmId}
    - **getSinglePrivateFilm:** I added a few checks on req.params to make sure that filmId is a number.
    - **updateSinglePrivateFilm:** I removed the validation using the film schema because private was a required field. However, as specified in the requirements of LAB1, the visibility of a film should not be changed. So, I decided to manually validate the request body. These checks include:
      - req.params to make sure that filmId is present and it is a number
      - request body is not empty
      - checkRequestBody is a function which receives as parameters the request body and a flag to indicate if the operation is for a public or private film. If it is a private film, then it checks the title, watchDate format, rating and favorite. If the request body also has a private field, then it returns an error to remind that visibility cannot be changed.
        I also changed the corresponding service function so that it was consistent with the requirements. Another change is that in the original function, the user had to always update the title, because in the schema it was required. However, since I removed the validation with the schema for the reasons I already mentioned, I decided to make it more flexible, in such a way that the user can modify anything except owner, id and visibility of the film. So, in short, the user can decide to update all of the parameters of a film (title, watchDate, favorite, rating) or just one of these or combinations of these.
    - **deleteSinglePrivateFilm**: I added a few checks on req.params to make sure that filmId is a number.
  - films/public/invited:
    - **getInvitedFilms:** I changed the sql query since the structure of the database has been changed. To select the films for which the logged-in user has been invited, I make a join between films table, reviews table and reviewers table.
  - films/public/{filmId}
    - **getSinglePublicFilm:** I added a few checks on req.params to make sure that filmId is a number.
    - **updateSinglePublicFilm:** I made similar changes as in updateSinglePrivateFilm.
    - **deleteSinglePublicFilm:** I added a few checks on req.params to make sure that filmId is a number.
- Review APIs
  - films/public/{filmId}/reviews
    - **issueFilmReview:** Because the API is structured in such a way it can be called to issue multiple reviews in a single operation (e.g. issue review 1 to user 1, issue review 2 to users 2,3 in a single call), I didn't use the review schema to validate the request body, as it was designed for a single object and not an array of objects. However, I manually wrote some checks that makes sure the body is valid. Reviews objects issued for a single user or a cooperative group are distinguished as follows: if the array of reviewerIds contains a single user id, then it is managed as a single review, otherwise it is considered as a cooperative one. This operation makes an insertion of the new review in the corresponding reviews table as well as creating new rows in the reviewers table. In the case of a cooperative review, we will have multiple rows with the same reviewId and different reviewerId. The corresponding service function has been modified accordingly.
    - **getFilmReviews** : This API has changed according to the new database structure. It returns an array of objects containing all the fields of the review, including filmId, reviewId, reviewerIds, completed (if true, also rating, review and reviewDate). Also, the link to the 'next' page has been changed wrt the proposed solution. A few checks on the request parameters were also added in the controller function.
  - films/public/{filmId}/reviews/{reviewId}
    - **getSingleReview**: The API has been changed as review is now identified by reviewId. It also contains an additional property reviewerIds. So, when selecting a single review associated with a film, I make sure that the field filmId in the reviews table is the one requested, as well as the reviewId. A few additional checks on the request parameters have been added as well.
    - **deleteSingleReview**: As previously mentioned, a review is now identified by the reviewId and not anymore by the reviewerId. So, the API has been changed accordingly. When deleting a review, if it exists and if it is not marked as complete, all the associated drafts (and therefore also the agreements of the respective drafts) are deleted in the db. Some checks on the request parameters have been added as well.
    - **updateSingleReview**: This API has been changed to ensure that only users who have been assigned single reviews can access the operation. If the user belongs to a cooperative review, it returns an error code (403). The request body is validated by the corresponding review schema. However, I've added some more manual checks to ensure that the complete property is not absent and that it is set to true. After checking that the reviewer has indeed been assigned to the specified review, and that the review exists, the service updates the review with the parameters specified in the request body, including completed, rating, review and reviewDate.

#### New APIs

- Draft APIs
  - films/public/{filmId}/reviews/{reviewId}/drafts
    - **createDraft:** A new API designed to create a draft object associated with a review. The operation can be carried out only by the assigned reviewers of the review with ID reviewId. The request body is validated by the corresponding draft schema, and it contains the reviewerId (author of the draft), proposed rating and proposed review as requested in the requirements. Each draft is uniquely identified by draftId and associated to the review through reviewId. The response body contains the newly created draft object, including draftId, reviewId, proposed rating, proposed review and open (set to true at its creation).
    - **getAllDrafts:** This API allows the owner of the film with ID filmId or the assigned reviewers to retrieve all the drafts associated with reviewId. A pagination system similar to that of the films and reviews has been used.
  - films/public/{filmId}/reviews/{reviewId}/drafts/{draftId}
    - **getSingleDraft:** This new API has been designed to simply retrieve a specific draft with ID draftID, associated to the review with ID reviewId of the film with ID filmId. The operation can be performed only by the owner of the film or by one of the assigned reviewers.
- Agreement APIs
  - films/public/{filmId}/reviews/{reviewId}/drafts/{draftId}/agreements
    **createAgreement:** This API has been designed to allow the reviewers of the assigned review (reviewId) to publish an agreement object (containing agreement or disagreement) for the draft identified by draftId. The API checks if it is the last agreement of the draft, if so there could be two possible outcomes:
    - all reviewers has reached to an agreement, and the call from the last reviewer (who has also agreed) will close the draft and automatically update the corresponding review through a utility function called **'updateCooperativeReview'**.
    - there's at least one disagreement, so the call will close the draft (by using the utility function **'closeDraft'**) but not update the review.
      If it is not the last agreement, then it will simply create and insert a new agreement object in the corresponding table. The object contains the author (reviewerId) and agreement or disagreement. In the latter case, it will also include a text explaining the reason.
    - **getAllAgreements:** This API is used to retrieve all the agreements associated to a draft identified by draftId. Only the assigned reviewers or the owner of the film for which the review has been issued can call this operation. A pagination system similar to the previously mentioned ones have been used.
  - films/public/{filmId}/reviews/{reviewId}/drafts/{draftId}/agreements/{reviewerId}:
    - **getSingleAgreement:** The API has been designed to allow the reviewers assigned to the review with ID reviewID or the owner of the film with ID filmID to simply retrieve a specific agreement identified by the joint properties of draftId and reviewerId (author of the agreement).

### API Implementation

In the implementation of the above mentioned APIs, I had to make a few changes to the schemas so as to use them to validate request bodies. More specifically:

- film schema: id and owner are no more required as the id of the owner is retrieved through req.user.id and the id of the film is automatically generated in the db. However, the properties are still present in the overall schema as they are important to identify the film data structure and they are returned in GET operations.
- review schema: the schema has been changed to use to validate the request body for PUT operations. If the complete property is present and set to true, then reviewDate, rating and review will be required, whereas the field filmId and reviewerIds cannot be changed, so they're set as not required. reviewId is retrieved from the request parameters, so it is not needed in the request bodies.
- review draft schema: draftId and reviewId are no more required as reviewId is retrieved from the request parameters whereas the draftId is automatically generated in the db. proposedRating, proposedReview and reviewerId (author of the draft) are still required as specified int he requirements. Similarly to the film schema, all these properties are still present in the overall data structure as they are important to identify the draft object when they are returned in GET operations.
- agreement schema: draftId is no more required as it is retrieved from the request parameters. reviewerId and agreement (and notes in case of disagreement) are still required in the request body.
