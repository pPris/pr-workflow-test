import * as core from '@actions/core'
import * as github from '@actions/github';
import { log } from './logger'

const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
const actor = github.context.actor;

/**
 * Gets details from the pulls api about the issue that triggered this workflow. 
 */
export async function getCurrentPRDetails() { // todo return object needs a type // todo just say getCurrentPR just like getCurrentIssue?
    return await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: issue_number,
    })
    .then(res => res.data) // res has other properties like status, headers, url, and data. the details of the pr is in the data property.
    .catch(err => {log.info(err, "error getting pr (issue) that triggered this workflow"); throw err;});
}

// https://octokit.github.io/rest.js/v18#checks-list-for-ref
export async function getListOfChecks(ref : string) { // todo same as above - return object needs a type
    const checkRunsArr = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: ref,
    })
    .then(res => {
        core.info(`received the list of checks with response ${res.status}`);
        return res.data.check_runs;
    })
    .catch(err => {throw err});

    // extra logging
    checkRunsArr.forEach(checkRun => {
        core.info(`current status for "${checkRun.name}": ${checkRun.status}`);
    });

    return checkRunsArr;
}

/**
 * 
 * @returns A string array containing the names of the labels that are applied to the current PR
 */
 export async function getCurrentPrLabels() : Promise<string[]> {
    return await octokit.rest.issues.get({
        owner,
        repo, 
        issue_number
    })
    .then(res => res.data.labels.map((label: {name: string}) => label.name)) // todo this function flattens the labels i think. not sure if it should be doing it at this level.
    .then(l => log.info(l, `labels returned for pr ${issue_number}`))
    .catch(err => {core.info(err); throw err});
}