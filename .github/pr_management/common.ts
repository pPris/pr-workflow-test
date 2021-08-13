/**
 * Collection of common functions to use in this folder
 */
import core = require("@actions/core");
import github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
const actor = github.context.actor;

//// variables to configure
// todo change in teammates
const usualTimeForChecksToRun = 5000; // 20 * 60 * 1000; // min * sec * ms

// to prevent cyclical checking when checking for passing runs. note: needs to match names assigned by workflow files
const excludedChecksNames = {
    "Handle PR that may be draft": 1,
    "Handle PR that may be ready for review": 1,
};

export async function wereReviewCommentsAdded(pr, sinceTimeStamp: string) {
    isValidTimestamp(sinceTimeStamp);

    const comments = await octokit.rest.pulls
        .listReviewComments({
            owner,
            repo,
            pull_number: pr.number,
            since: sinceTimeStamp, // todo unsure if this works as expected --> test
        })
        .then(res => {
            core.info("these comments were retrieved\n" + res);
            return res;
        })
        .catch(err => {
            throw err;
        });

    return comments.data.length > 0;
}

function isValidTimestamp(sinceTimeStamp: string) {
    try {
        Date.parse(sinceTimeStamp);
    } catch (err) {
        throw new Error(`the sinceTimeStamp argument passed is an invalid timestamp`);
    }
}

export async function addOngoingLabel() {
    await addLabel("s.Ongoing");
}

export async function addToReviewLabel() {
    await addLabel("s.ToReview");
}

export async function dropOngoingLabelAndAddToReview() {
    await removeLabel("s.Ongoing");
    await addLabel("s.ToReview");
}

export async function dropToReviewLabelAndAddOngoing() {
    await removeLabel("s.ToReview");
    await addLabel("s.Ongoing");
}

async function addLabel(labelName: string) {
    await octokit.rest.issues
        .addLabels({
            owner,
            repo,
            issue_number,
            labels: [labelName],
        })
        .then(res => log.info(res.status, `added ${labelName} label with status`))
        .catch(err => log.info(err, "error adding label"));
}

async function removeLabel(labelName: string) {
    await octokit.rest.issues
        .removeLabel({
            owner,
            repo,
            issue_number,
            name: [labelName], // todo check if this works
        })
        .then(res => logInfo(res.status, `removing label ${res.status} with status`))
        .catch(err => logInfo(err, "error removing label (label may not have been applied)"));
}

export async function sleep(ms : number) {
    core.info(`sleeping for ${ms} milliseconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

////// things to help with logging //////
/* these functions log using the core module but with the format "label: thingToLog". They also return the variable being logged for convenience */
export const log = { info: logInfo, warn: logWarn, jsonInfo: jsonInfo };

function logInfo(toPrint, label) {
    core.info(`${label}: ${toPrint}`);
    return toPrint;
}

function jsonInfo(jsonToPrint: JSON, label) {
    core.info(`${label}: ${JSON.stringify(jsonToPrint)}`);
}

function logWarn(toPrint, label) {
    core.warning(`${label}: ${toPrint}`);
}

//// comments
export async function postComment(message) {
    const commentBody = `Hi ${actor}, please note the following. ${message}`;

    const comment = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: commentBody,
    });

    log.info(commentBody, "Commented");
    log.info(comment.status, "Status of comment operation");
}

//// checks stuff

export async function validateChecksOnPrHead() {
    const sha = await getPRHeadShaForIssueNumber(issue_number);
    return await validateChecks(sha);
}

async function validateChecks(
    validateForRef: string
): Promise<{ didChecksRunSuccessfully: boolean; errMessage: string }> {
    // GitHub Apps must have the checks:read permission on a private repository or pull access to a public repository to get check runs.

    core.info(`validating checks on ref: ${validateForRef}...`);

    let areChecksOngoing = true;
    let listChecks;

    // wait for the checks to complete before proceeding
    while (areChecksOngoing) {
        listChecks = await octokit.rest.checks.listForRef({
            //https://octokit.github.io/rest.js/v18#checks-list-for-ref
            owner,
            repo,
            ref: validateForRef,
        });

        // array of check runs, may include the workflow that is running the current file
        const checkRunsArr = listChecks.data.check_runs;

        // todo [low] change to core.debug
        checkRunsArr.forEach(checkRun => {
            core.info(`current status for "${checkRun.name}": ${checkRun.status}`);
        });

        // find checks that are not completed and sleep while waiting for it to complete
        const res = checkRunsArr.find(
            checkRun => checkRun.status !== "completed" && !(checkRun.name in excludedChecksNames)
        );
        if (res !== undefined) {
            await sleep(usualTimeForChecksToRun);
            continue;
        }

        areChecksOngoing = false;
    }

    const checkRunsArr = listChecks.data.check_runs;

    // format the conclusions of the check runs
    let conclusionsDetails = "";

    listChecks.data.check_runs.forEach(checkRun => {
        if (checkRun.status !== "completed") {
            conclusionsDetails += `${checkRun.name}'s completion status was ignored because this check is found the excluded checks list\n`;
        } else {
            conclusionsDetails += `${checkRun.name} has ended with the conclusion: \`${checkRun.conclusion}\`. [Here are the details.](${checkRun.details_url})\n`;
        }
    });

    const didChecksRunSuccessfully = !checkRunsArr.find(
        checkRun => checkRun.conclusion !== "success" && !(checkRun.name in excludedChecksNames)
    );
    const errMessage = `There were failing checks found. \n${conclusionsDetails}`;

    log.info(didChecksRunSuccessfully, "didChecksRunSuccessfully");
    log.info(conclusionsDetails, "conclusions of checks\n");

    return { didChecksRunSuccessfully, errMessage };
}

// event payload that triggers this pull request does not contain this info about the PR, so must use rest api again
async function getPRHeadShaForIssueNumber(pull_number) {
    const pr = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
    }).catch(err => {throw err;});

    const sha = pr.data.head.sha;
    log.info(sha, "sha");
    return sha;
}