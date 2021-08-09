"use strict";
/**
 * Find PRs with the s.toReview Label and if they have have received review comments
 * since the label was applied and no commits in the 24 hours after the review, change the label
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.relabelPRsAfterReview = void 0;
// main function of this file
function relabelPRsAfterReview() {
    // findPRs with the label
    // has it been 24h since label was applied && has it been >24h since PR author had activity
    // if true, change label
}
exports.relabelPRsAfterReview = relabelPRsAfterReview;
