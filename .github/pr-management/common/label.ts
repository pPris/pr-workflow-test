import { log } from '../logger';
import { finalReviewLabel, toReviewLabel } from './const'
import { getSortedListOfEventsOnIssue, addLabel } from './github-manager/issues';

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
            log.info(`${finalReviewLabel} was the last found review label on this PR, so adding it back.`);
            return;
        }

        if (e.label?.name == toReviewLabel) {
            await addLabel(toReviewLabel);
            log.info(`${toReviewLabel} was the last found review label on this PR, so adding it back.`);
            return;
        }   
    };

    // if no previous review label was found, add toReviewLabel
    await addLabel(toReviewLabel);
}
