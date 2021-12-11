/**
 * This file has all the helper functions needed to validate if the checks on a commit in a pr 
 * are successful / have completed execution.
 */
import * as core from '@actions/core'
import { log } from '../logger';
import { errMessagePreamble, excludedChecksNames, usualTimeForChecksToRun } from './const';
import { getCurrentPRHeadSha, getListOfChecks } from './githubManager/interface';

export async function sleep(ms : number) {
    core.info(`sleeping for ${ms} milliseconds...`);
    return new Promise(resolve => setTimeout(resolve, ms));
}

//// functions related to checks that run on commits

export async function validateChecksOnPrHead() : Promise<{ didChecksPass: boolean; errMessage: string }> {
    const sha = await getCurrentPRHeadSha(); // ?? not sure if this whole chain of commands is correctly organised // todo shorten name
    return await validateChecks(sha);
}

function doesArrInclude(arr : Array<any>, element) : boolean {
    return arr.findIndex(x => x == element) !== -1;
}

/**
 * Queries the checks api and waits for failing checks to be found. If no failing checks 
 * found then waits for all checks to complete.
 * @param validateForRef sha of the current pr (as the api to get lists of checks needs it)
 * @returns A boolean of whether all checks passed, and list of unsuccessful checks 
 */
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
    }

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
 * !! currently the only wrong conclusion is failure, letting all the others pass (?) // todo this comment needs attention
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
