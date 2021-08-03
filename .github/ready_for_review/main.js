const core = require("@actions/core");
const github = require("@actions/github");
const reviewKeywords = "@bot ready for review";

// todo should become class params 
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

core.info("Octokit has been set up");

// params to set
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
const _owner = github.context.repo.owner; 
const _repo = github.context.repo.repo;
const _actor = github.context.actor;
const _issue_num = github.context.issue.number;

// console.log("here"); // does this work here (yes)





// todo merge this pr - "Note: This event will only trigger a workflow run if the workflow file is on the default branch."


/**
 * this is the main function of this file
 */
async function run() {
    try {
        filterCommentBody();

        validate();

        labelReadyForReview();

    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

// if comment body has the exact keywords
function filterCommentBody() {
    // const comment = github.event.issue_comment.body;
    const issueComment = github.context.issue_comment;
    core.info(`issueComment: ${issueComment}`);
    // core.info(comment);
}

function validate() {
    validatePRStatus(); // todo make sure this action doesn't run on pr's that are closed, or are of certain labels
    const {checksRunSuccessfully, errMessage} = validateChecks();

    if (!checksRunSuccessfully) postComment(errMessage);
}


function validatePRStatus() {
    core.info("no pr validation has been set");
}

function validateChecks() {
    // for getting the checks run https://octokit.github.io/rest.js/v18#checks-list-for-ref (need to dig more to find what format you get   )

    let checksRunSuccessfully = true; // todo - get whether the checks have passed, or any other info
    let err = null;

    core.info(`${checksRunSuccessfully}`)

    return {checksRunSuccessfully: checksRunSuccessfully, errMessage: err};
}

async function postComment(message) {
    const commentBody = `Hi ${_actor}, please note the following. ${message}`
    core.info(github.context.issue);

    console.log(github.context.issue);
    console.log(_issue_num);
    console.log(_owner)
    console.log(_repo)

    const comment = await octokit.rest.issues.createComment({
        owner: _owner,
        repo: _repo,
        body: commentBody,
        issue_number: _issue_num
    })

    core.info("Commented: " + commentBody);
}

async function labelReadyForReview() {
    const label = await octokit.rest.issues.addLabels({
        owner: _owner,
        repo: _repo,
        issue_number: _issue_num,
        labels: ["S.ToReview"]
    })

    core.info("label has been added");

}

run();