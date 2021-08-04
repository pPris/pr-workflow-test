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
    if (!validatePRStatus()) return; // todo make sure this action doesn't run on pr's that are closed, or are of certain labels

    const { checksRunSuccessfully, errMessage } = await validateChecks();
    logInfo(checksRunSuccessfully, "checksRunSuccessfully");
    logInfo(validateChecks(), "return result");

    if (!checksRunSuccessfully) {
        postComment(errMessage);
        return false;
    }

    return true;
}

function validatePRStatus() {
    core.warning("no pr validation has been set");
    return true;
}

async function validateChecks() {
    // for getting the checks run https://octokit.github.io/rest.js/v18#checks-list-for-ref (need to dig more to find what format you get   )

    // GitHub Apps must have the checks:read permission on a private repository or pull access to a public repository to get check runs.

    // wait till checks have completed

    let areChecksOngoing = true;

    while (areChecksOngoing) {
        const listChecks = await octokit.rest.checks.listForRef({
            owner,
            repo,
            ref,
        });

        // core.info(JSON.stringify(listChecks));
        logJson(listChecks);

        logInfo(listChecks.data.check_runs.output, "output field");
        logInfo(listChecks.data.check_runs.status);

        // logInfo(areChecksOngoing, "areChecksOngoing");
        areChecksOngoing = false; // temp
    }

    let checksRunSuccessfully = true; // todo - get whether the checks have passed, or any other info
    let errMessage = null;

    core.info(`checksRunSuccessfully ${checksRunSuccessfully}`);

    return { checksRunSuccessfully, errMessage };
}

async function postComment(message) {
    const commentBody = `Hi ${actor}, please note the following. ${message}`;

    const comment = await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        body: commentBody,
        issue_number: issueNum,
    });

    logInfo(commentBody, "commented");
    logJson(comment, "Status");
}

async function labelReadyForReview() {
    const removeLabel = await octokit.rest.issues.removeLabel({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["S.Ongoing"],
    });

    core.info("removing label...");
    core.info(removeLabel);

    const addLabel = await octokit.rest.issues.addLabels({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["S.ToReview"],
    });

    core.info(`label has been added ${addLabel}`);
}

function logInfo(msg, label) {
    core.info(`${label}: ${msg}`);
}

function logJson(string, label) {
    logInfo(label, JSON.stringify(string));
}

run();
