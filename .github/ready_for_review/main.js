const core = require("@actions/core");
const github = require("@actions/github");
const { log, postComment, getPRHeadShaForIssueNumber, validateChecks } = require("../../lib/.github/common");
const reviewKeywords = "@bot ready for review";

// todo should become class params
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);


core.info("Octokit has been set up");

// params to set
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issueNum = github.context.issue.number;

/**
 * this is the main function of this file
 */
async function run() {
    try {
        // all comments trigger this workflow
        const doesCommentContainKeywords = filterCommentBody();
        if (!doesCommentContainKeywords) return;

        const valid = await validate();
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

/**
 * Wrapper function for all validation related checks. If any fail, this function handles adding the comment 
 * @returns boolean of whether all validation checks 
 */
async function validate() {
    if (!validatePRStatus()) return; // todo make sure this action doesn't run on pr's that are closed, or are of certain labels (exclude s.ToReview?)

    const sha = await getPRHeadShaForIssueNumber(issueNum);

    const { didChecksRunSuccessfully: checksRunSuccessfully, errMessage } = await validateChecks(sha);
    logInfo(checksRunSuccessfully, "checksRunSuccessfully");

    if (!checksRunSuccessfully) {
        await postComment(errMessage);
        return false;
    }

    return true;
}


function validatePRStatus() {
    core.warning("no pr validation has been set");
    return true;
}



// remove existing s.Ongoing label before adding new label 
async function labelReadyForReview() {
    // todo abstract
    await octokit.rest.issues.removeLabel({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        name: ["s.Ongoing"],
    })
    .then(res => logInfo(res, "removing label..."))
    .catch(err => logInfo(err, "error removing label (label may not have been applied)"));

    await octokit.rest.issues.addLabels({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["s.ToReview"],
    })
    .then(res => logInfo(res, "adding label..."))
    .catch(err => logInfo(err, "error adding label"));
}

function logInfo(msg, label) {
    core.info(`${label}: ${msg}`);
}

function logJson(string, label) {
    // logInfo(JSON.stringify(string), label);
    core.info(`${label}: `);
    core.info(JSON.stringify(string));
}

run();
