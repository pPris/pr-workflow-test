/**
 * Constants that depend on teammates or are used across the actions
 */

export const ongoingLabel = "s.Ongoing";
export const toReviewLabel = "s.ToReview";
export const finalReviewLabel = "s.FinalReview";
export const toMergeLabel = "s.ToMerge";

//// variables to configure
export const usualTimeForChecksToRun = 10 * 60 * 1000; // min * sec * ms
export const errMessagePreamble = "There is at least one failing check.";
export const reviewKeywords = "PR ready for review";

/* this list of names of excluded checks is to prevent infinite waiting while checking for workflow statuses. 
note: each string needs to match the jobs.<id>.name property in yaml files */ 
const draftPr = "Handle PR that may be draft";
const readyForReviewPr = "Handle PR that may be ready for review";
const issueComment = "PR Comment";

// TODO names of excluded checks
export const excludedChecksNames = [
    draftPr,
    readyForReviewPr,
    issueComment
];