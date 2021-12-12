
// ! havent tested this for copying.
// for the first time i just copied the entire file explorer folder

let dirs = [
  "ready-for-review-comment", 
  "pr-marked-ready-for-review",
  "pr-marked-draft"
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
        `${op} ./pr-workflow-test/.github/pr-management/${dir}/${file}  ./teammates/.github/pr-management/${dir}/${file}`)

  // for (var dir of dirs)
    for (let file of workflowFiles)
      console.log(
        `${op} ./pr-workflow-test/.github/workflows/${file}  ./teammates/.github/workflows/${file}`)
    

  console.log(
    `${op} -r ./pr-workflow-test/.github/pr-management/common  ./teammates/.github/pr-management/common`)

}

doOperation(opCopy);

  // ! package.json was changed

  // ncc build .github/pr-management/pr-marked-draft/main.ts -o .github/pr-management/pr-marked-draft/ -m --license licenses.txt 
  // && ncc build .github/pr-management/pr-marked-ready-for-review/main.ts -o .github/pr-management/pr-marked-ready-for-review/ -m --license licenses.txt 
  // && ncc build .github/pr-management/ready-for-review-comment/main.js -o .github/pr-management/ready-for-review-comment/ -m --license licenses.txt",

  
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