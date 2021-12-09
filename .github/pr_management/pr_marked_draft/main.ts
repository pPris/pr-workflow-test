import * as core from '@actions/core'
import { addLabel, ongoingLabel } from '../common';
import { getCurrentPRDetails } from '../githubRequestsManager';

async function run() {
    try {
        const needsLabelling = await doesPrNeedLabelling();
        
        if (!needsLabelling) {
            core.info("needs no labelling, ending.")
            return;
        }

        await addLabel(ongoingLabel);
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

// todo del after testing
// async function isDraftAndNotLabelledOngoing() {
//     return await octokit.rest.pulls.get({
//         owner,
//         repo,
//         pull_number: issue_number,
//     })
//     .then(res => {
//         log.info(res.data.draft, `is pr ${issue_number} draft`)
//         return res.data.draft && res.data.labels.find(l => l.name === ongoingLabel) === undefined;
//     })
//     .catch(err => {log.info(err, "error getting pr (issue) that triggered this workflow"); throw err;});
// }

// skeleton of how to make this neater:
async function doesPrNeedLabelling() {
    // get PR for this issue
    const pr = await getCurrentPRDetails().catch(err => {throw err});

    if (!pr.draft) {
        core.info("pr is not a draft");
        return false;
    }

    const hasOngoingLabel = pr.labels.find(l => l.name === ongoingLabel) != undefined;

    if (hasOngoingLabel) {
        core.info("pr has ongoing label");
        return false;
    }

    return true; 
}

run();
