import core = require("@actions/core");
import github = require("@actions/github");
import { relabelPRsAfterReview } from "./changeToReviewToOngoing";
import { findPRsAndAssignReviewers } from "./assignReviewersToPRs";


async function run() {
    try {
        await findPRsAndAssignReviewers();
        await relabelPRsAfterReview(); // should move to own file
        core.info("workflow ran successfully");
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

run();
