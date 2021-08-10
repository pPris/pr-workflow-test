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

export async function wereReviewCommentsAdded(pr, sinceTimeStamp : string) {
    isValidTimestamp(sinceTimeStamp);

    const comments = await octokit.rest.pulls.listReviewComments({
        owner,
        repo,
        pull_number: pr.number,
        since: sinceTimeStamp // todo unsure if this works as expected --> test
      })
      .then(res => {core.info("these comments were retrieved\n" + res); return res;}) // todo log properly w pr number
      .catch(err => {throw err});
    
    return comments.data.length > 0;
}   

function isValidTimestamp(sinceTimeStamp: string) {
    try {
        Date.parse(sinceTimeStamp);
    } catch (err) {
        throw new Error(`the sinceTimeStamp argument passed is an invalid timestamp`);
    }
}

// todo delete if unused
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

async function addLabel(labelName : string) {
    await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [labelName]
    })    
    .then(res => log.info(res.status, "added label with status"))
    .catch(err => log.info(err, "error adding label"));
}

async function removeLabel(labelName : string) {
    await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: [labelName], // todo check if this works
    })
    .then(res => logInfo(res.status, "removing label with status"))
    .catch(err => logInfo(err, "error removing label (label may not have been applied)"));}

////// things to help with logging

export const log = {info: logInfo, warn: logWarn, jsonInfo: jsonInfo};

function logInfo(toPrint, label) {
    core.info(`${label}: ${toPrint}`);
}

function jsonInfo(jsonToPrint : JSON, label) {
    core.info(`${label}: ${JSON.stringify(jsonToPrint)}`);
}

function logWarn(toPrint, label) {
    core.warning(`${label}: ${toPrint}`);
}