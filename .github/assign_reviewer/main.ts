import core = require("@actions/core");
import github = require("@actions/github");
import { changeLabelsAfterReview } from "./changeToReviewToOngoing";
import { findPRsAndAssignReviewers } from "./assignReviewersToPRs";

// todo rename this folder to periodic workflows, and most of the info here should be related to assign reviewer --> move it

async function run() {
    try {
        await findPRsAndAssignReviewers();
        await changeLabelsAfterReview();
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

run();
