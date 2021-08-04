const core = require("@actions/core");
const github = require("@actions/github");
const reviewKeywords = "@bot ready for review";

// todo should become class params
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

// todo change in teammates
const usualTimeForChecksToRun = 5000; // 20 * 60 * 1000;
// to prevent cyclical checking for passing runs
const excludedChecksNames = {"PR Comment": 1}; // needs to match names assigned by workflow files

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
    if (!validatePRStatus()) return; // todo make sure this action doesn't run on pr's that are closed, or are of certain labels

    const { didChecksRunSuccessfully: checksRunSuccessfully, errMessage } = await validateChecks();
    logInfo(checksRunSuccessfully, "checksRunSuccessfully");
    // logInfo(validateChecks(), "return result");

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

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// returns whether all the checks have completed running, excluding those in the excludedchecks list
// function didChecksFinishRunning(checkRunsArr) {
//     return !!(checkRunsArr.find(checkRun => checkRun.status !== "completed" && !(checkRun.name in excludedChecksNames)));
// }

async function validateChecks() {
    // for getting the checks run https://octokit.github.io/rest.js/v18#checks-list-for-ref (need to dig more to find what format you get   )

    // GitHub Apps must have the checks:read permission on a private repository or pull access to a public repository to get check runs.

    // wait till checks have completed

    core.info("validating checks...")

    let areChecksOngoing = true;
    let listChecks;

    while (areChecksOngoing) {
        listChecks = await octokit.rest.checks.listForRef({
            owner,
            repo,
            ref,
        });

        const checkRunsArr = listChecks.data.check_runs;

        checkRunsArr.forEach((checkRun) => {
            // console.log(checkRun.output); // sometimes null but seems like some unknown jobs running
            logInfo(checkRun.status, "status");
        });

        const res = checkRunsArr.find(checkRun => checkRun.status !== "completed" && !(checkRun.name in excludedChecksNames));

        if (res !== undefined) {
            await sleep(usualTimeForChecksToRun);
            continue;
        }
        else {
            logInfo(areChecksOngoing, "areChecksOngoing");
            areChecksOngoing = false; // temp
        }
    }

    // const conclusions = listChecks.data.check_runs.map(checkRun => checkRun.conclusion);

    const checkRunsArr = listChecks.data.check_runs;

    let conclusionsDetails = ""; 
    
    listChecks.data.check_runs.forEach(checkRun => {
        logJson(checkRun, "what's returning undefined?")
        
        if (checkRun.status !== "completed") {
            conclusionsDetails += `${checkRun.name}'s completion status was ignored because this check is found the excluded checks list\n` 
        } else {
            conclusionsDetails += `${checkRun.name} has ended with the conclusion: ${checkRun.conclusion}. Here are the details: ${checkRun.details_url}\n`
        }
        
        logInfo(conclusionsDetails, "current")
    });

    logInfo(conclusionsDetails, "conclusions of checks ");

    const didChecksRunSuccessfully = !(checkRunsArr.find(checkRun => checkRun.conclusion !== "success" && !(checkRun.name in excludedChecksNames))); // ! unsure if neutral is ok
    const errMessage = `There were unsuccessful conclusions found. \n${conclusionsDetails}`;

    core.info(`checksRunSuccessfully ${didChecksRunSuccessfully}`);

    return { didChecksRunSuccessfully, errMessage };
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
    await octokit.rest.issues.listLabelsOnIssue({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
    })
    .then(res => logJson(res, "label..."))
    .catch(err => logInfo(err, "error getting labels"));

    await octokit.rest.issues.removeLabel({
        owner: owner,
        repo: repo,
        issue_number: issueNum,
        labels: ["s.Ongoing"],
    })
    .then(res => logInfo(res, "removing label..."))
    .catch(err => logInfo(err, "error removing label"));

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
