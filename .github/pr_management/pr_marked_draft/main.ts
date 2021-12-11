import * as core from '@actions/core'
import { addLabel, getCurrentPRDetails } from '../common/githubManager/interface';
import { ongoingLabel } from '../common/const';

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

// skeleton of how to make this neater:
async function doesPrNeedLabelling() : Promise<boolean> {
    // get PR for this issue
    const pr = await getCurrentPRDetails().catch(err => {throw err});

    if (!pr.draft) { // todo not sure if can absolute this with isPrDraft. will need 2 api calls for these two if blocks unless i use a PR class instead of just a type
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
