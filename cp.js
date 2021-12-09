
let dirs = [
  "ready_for_review_comment", 
  "pr_marked_ready_for_review",
  "pr_marked_draft"
]

let files = [
  "action.yml",
  "main.ts"
]

// these files are awfully named.
const workflowFiles = [
  "draft-prs.yml", 
  "on-issue-comment.yml",
  "ready-to-review-prs.yml"
]

let opCopy = "cp"; 
let opCompare = "diff"

function doOperation(op) {

  // let op = "cp"; 
  // let op = "diff"

  // check actions files
  for (var dir of dirs)
    for (let file of files)
      console.log(
        `${op} ./pr-workflow-test/.github/pr_management/${dir}/${file}  ./teammates/.github/pr_management/${dir}/${file}`)

  // for (var dir of dirs)
    for (let file of workflowFiles)
      console.log(
        `${op} ./pr-workflow-test/.github/workflows/${file}  ./teammates/.github/workflows/${file}`)
    

  console.log(
    `${op} ./pr-workflow-test/.github/pr_management/common.ts  ./teammates/.github/pr_management/common.ts`)

}

doOperation(opCompare);

  // ! package.json was changed

  // ncc build .github/pr_management/pr_marked_draft/main.ts -o .github/pr_management/pr_marked_draft/ -m --license licenses.txt 
  // && ncc build .github/pr_management/pr_marked_ready_for_review/main.ts -o .github/pr_management/pr_marked_ready_for_review/ -m --license licenses.txt 
  // && ncc build .github/pr_management/ready_for_review_comment/main.js -o .github/pr_management/ready_for_review_comment/ -m --license licenses.txt",

  
/*
  git checkout main
  git checkout -b test-no-regressions
  rm -r dist
  git add -A && git commit -m "rm (should fail)" && git push --set-upstream origin test-no-regressions

  ncc build -m index.js
  git add -A && git commit -m "add needed file" && git push



  git checkout -b test-3
  rm README.md
  git add -A && git commit -m "passing change" && git push


*/

/*
function getEventThatTriggeredThis() {
  return github.context.payload.action;
}*/