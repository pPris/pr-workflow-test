import * as core from '@actions/core'
import * as github from '@actions/github';
import { log } from '../../logger'

const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
const actor = github.context.actor;

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