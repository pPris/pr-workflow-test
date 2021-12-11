/**
 * Collection of common functions to use in this folder
 */
import * as core from '@actions/core'
import * as github from '@actions/github';
import { getListOfChecks } from './githubRequestsManager';
import { log } from './logger';
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
const actor = github.context.actor;

export const ongoingLabel = "s.Ongoing";
export const toReviewLabel = "s.ToReview";
export const finalReviewLabel = "s.FinalReview";
export const toMergeLabel = "s.ToMerge";

//// variables to configure
const usualTimeForChecksToRun = 10 * 60 * 1000; // min * sec * ms
export const errMessagePreamble = "There were failing checks found.";
export const reviewKeywords = "PR ready for review";

/* this list of names of excluded checks is to prevent infinite waiting while checking for workflow statuses. 
note: each string needs to match the jobs.<id>.name property in yaml files */ 
const draftPr = "Handle PR that may be draft";
const readyForReviewPr = "Handle PR that may be ready for review";
const issueComment = "PR Comment";

// TODO names of excluded checks
const excludedChecksNames = [
    draftPr,
    readyForReviewPr,
    issueComment
];

//// abstractions for adding and dropping labels
export async function addLabel(labelName: string) {
    await octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: [labelName],
    })
    .then(res => log.info(res.status, `added ${labelName} label with status`))
    .catch(err => log.info(err, "error adding label"));
}

export async function removeLabel(labelName: string) {
    await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: labelName,
    })
    .then(res => log.info(res.status, `removing label ${res.status} with status`))
    .catch(err => log.info(err, "error removing label (label may not have been applied)"));
}

export async function sleep(ms : number) {
    core.info(`sleeping for ${ms} milliseconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}



//// comments related functions
export async function postComment(message : string) {
    const commentBody = `Hi @${actor}, please note the following. ${message}`;

    await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: commentBody,
    })
    .then(res => core.info(`Commented:\n${res.data.body}\n with status ${res.status}`))
    .catch(err => core.error(err))
}

//// functions related to checks that run on commits

export async function validateChecksOnPrHead() : Promise<{ didChecksPass: boolean; errMessage: string }> {
    const sha = await getPRHeadShaForIssueNumber(issue_number); // ?? not sure if this whole chain of commands is correct
    return await validateChecks(sha);
}

function doesArrInclude(arr : Array<any>, element) : boolean {
    return arr.findIndex(x => x == element) !== -1;
}

async function validateChecks(validateForRef: string)
: Promise<{ didChecksPass: boolean; errMessage: string }> {

    core.info(`validating checks on ref: ${validateForRef}...`);

    let areChecksOngoing = true;
    let checkRunsArr;

    // wait for the checks to complete before proceeding
    while (areChecksOngoing) {
        checkRunsArr = await getListOfChecks(validateForRef)

        // todo (slightly tedious) test fast fail
        // find failed checks and end early if there's any
        const didAnyCheckFail = findUnsuccessfulChecks(checkRunsArr);

        if (didAnyCheckFail.length != 0) {
            areChecksOngoing = false;
            break;
        }

        // find checks that are not completed and sleep while waiting for completion
        const incompleteArr = checkRunsArr.find(
            checkRun => checkRun.status !== "completed" && !(doesArrInclude(excludedChecksNames, checkRun.name))
        );
        
        if (incompleteArr !== undefined) {
            await sleep(usualTimeForChecksToRun);
            continue;
        }

        areChecksOngoing = false;
    } // todo test that only failed checks are being printed out 

    const unsuccessfulChecksArr : Array<any> = findUnsuccessfulChecks(checkRunsArr); // todo type checkruns
    const didChecksPass = unsuccessfulChecksArr.length == 0;
    const detailsOfConclusions = formatUnsucessfulChecks(unsuccessfulChecksArr);

    const errMessage = `${errMessagePreamble}\n${detailsOfConclusions}`;

    log.info(didChecksPass, "didChecksPass");
    log.info(detailsOfConclusions, "conclusions of checks\n");

    return { didChecksPass: didChecksPass, errMessage };
}

function formatUnsucessfulChecks(checkRunsArr : Array<any>) : string {
    let conclusionsDetails = "";

    checkRunsArr.forEach(checkRun => {
        if (checkRun.status !== "completed") { // todo remove after testing?
            core.info(`${checkRun.name}'s completion status was ignored (${checkRun.status}, ${checkRun.conclusion})\n`);
        } else {
            conclusionsDetails += `* '${checkRun.name}' has completed with the conclusion: \`${checkRun.conclusion}\`. [Here are the details.](${checkRun.details_url})\n`;
        }
    });

    return conclusionsDetails;
}

/**
 * Note: 
 * !! currently the only wrong conclusion is failure, letting all the others pass (?)
 * possible conclusions: action_required, cancelled, failure, neutral, success, skipped, stale, or timed_out
 * https://docs.github.com/en/rest/reference/checks#list-check-runs-for-a-git-reference
 * returns: returns an array of checks that need attention (empty if none need attention)
 */
function findUnsuccessfulChecks(checkRunsArr : Array<any>) : Array<any> { // todo need a checkruns type
    return checkRunsArr.filter(
        checkRun => checkRun.conclusion === "failure"
            && !(doesArrInclude(excludedChecksNames, checkRun.name))
    );
}

// when event payload that triggers this pull request does not contain sha info about the PR, this function can be used
async function getPRHeadShaForIssueNumber(pull_number : number) {
    const pr = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number,
    }).catch(err => {throw err;});

    const sha = pr.data.head.sha;
    core.info(`PR head sha obtained for pr #${pull_number}: ${sha}`)

    return sha;
}


////// repetitive api requests

const sortByLastCreated = (a, b) => {
    if (!a.created_at || !b.created_at) return 1; // move back if created_at property is missing
    return Date.parse(b.created_at) - Date.parse(a.created_at)
}

/**
 * returns an array of all the events on this issue, sorted in descending order of the created_at property 
 * https://octokit.github.io/rest.js/v18#issues-list-events
 */
export async function getSortedListOfEventsOnIssue() { // todo return type?
    return await octokit.rest.issues.listEvents({
        owner,
        repo,
        issue_number,
    })
    .then(res => res.data.sort(sortByLastCreated))
    .catch(err => {
        throw err;
    });
}

/**
 * returns an array of events for the current issue, sorted in descending order of the created_at property 
 * https://octokit.github.io/rest.js/v18#issues-list-events
 */ 
export async function getSortedListOfComments(sinceTimeStamp : string) { // todo return type?
    return await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
        since: sinceTimeStamp
    })
    .then(res => res.data.sort(sortByLastCreated))
    .catch(err => {
        throw err;
    });
}

/**
 * Adds the last review label that was added to the pr, if any is found, else adds the toReviewLabel.
 */
export async function addAppropriateReviewLabel() {
    const eventsArr = await getSortedListOfEventsOnIssue();

    // if a previous review label was found, re-add that label
    for (const e of eventsArr) {
        if (e.event !== "labeled") continue;

        if (e.label?.name == finalReviewLabel) {
            await addLabel(finalReviewLabel);
            core.info(`${finalReviewLabel} was the last found review label on this PR, so adding it back.`);
            return;
        }

        if (e.label?.name == toReviewLabel) {
            await addLabel(toReviewLabel);
            core.info(`${toReviewLabel} was the last found review label on this PR, so adding it back.`);
            return;
        }   
    };

    // if no previous review label was found, add toReviewLabel
    await addLabel(toReviewLabel);
}

// todo return type?
export async function getCurrentIssue() {
    return octokit.rest.issues.get({
        owner, 
        repo,
        issue_number,
    }).catch(err => {throw err});
}
