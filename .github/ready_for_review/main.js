const core = require("@actions/core");
const github = require("@actions/github");
const reviewKeywords = "@bot ready for review";

// todo should become class params 
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

core.info("Octokit has been set up");

// params to set
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
const owner = github.context.repo.owner; 
const repo = github.context.repo.repo;
const actor = github.context.actor;
const issueNum = github.context.issue.number;
const ref = github.context.ref;


// todo merge this pr - "Note: This event will only trigger a workflow run if the workflow file is on the default branch."


/**
 * this is the main function of this file
 */
async function run() {
    try {
        const doesCommentContainKeywords = filterCommentBody();
        if (!doesCommentContainKeywords) return;

        const valid = validate();
        if (!valid) return;

        labelReadyForReview();

    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

// return if comment body has the exact keywords
function filterCommentBody() {
    const issueComment = github.context.payload.comment.body;
    const hasKeywords = issueComment.search(reviewKeywords) !== -1;

    core.info(`issueComment: ${issueComment}`);
    core.info(`keywords found in issue? ${hasKeywords}`);

    return hasKeywords;
}

function validate() {
    validatePRStatus(); // todo make sure this action doesn't run on pr's that are closed, or are of certain labels
    const {checksRunSuccessfully, errMessage} = validateChecks();

    if (!checksRunSuccessfully) {
        postComment(errMessage);
        return false;
    }
}


function validatePRStatus() {
    core.warning("no pr validation has been set");
}

async function validateChecks() {
    // for getting the checks run https://octokit.github.io/rest.js/v18#checks-list-for-ref (need to dig more to find what format you get   )

    // GitHub Apps must have the checks:read permission on a private repository or pull access to a public repository to get check runs.

    // wait till checks have completed

    let listChecks = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref,
      });

    core.info(JSON.stringify(listChecks));

    let checksRunSuccessfully = true; // todo - get whether the checks have passed, or any other info
    let err = null;

    core.info(`${checksRunSuccessfully}`)

    return {checksRunSuccessfully: checksRunSuccessfully, errMessage: err};
}

async function postComment(message) {
    const commentBody = `Hi ${actor}, please note the following. ${message}`
    core.info(github.context.issue);

    console.log(github.context.issue);
    console.log(issueNum);
    console.log(owner)
    console.log(repo)

    const comment = await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        body: commentBody,
        issue_number: issueNum
    })

    core.info("Commented: " + commentBody);
    core.info(`Status: ${comment}`)
}

async function labelReadyForReview() {
    const removeLabel = await octokit.rest.issues.removeLabel({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["S.Ongoing"]
    })

    core.info("removing label...");
    core.info(removeLabel);

    const addLabel = await octokit.rest.issues.addLabels({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["S.ToReview"]
    })

    core.info(`label has been added ${addLabel}` );
}

run();