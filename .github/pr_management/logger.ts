import * as core from '@actions/core'

////// functions to help with logging //////
function info(toPrint : any, label? : string) {
    core.info(`${label}: ${toPrint}`);
    return toPrint; // todo, this is unstandardized, remove after testing the rest?
}

function jsonInfo(jsonToPrint: JSON, label? : string) {
    core.info(`${label}: ${JSON.stringify(jsonToPrint)}`);
}

function warn(toPrint : any, label? : string) {
    core.warning(`${label}: ${toPrint}`);
}

/* these functions log using the core module but with the format "label: itemToLog". 
They also return the variable being logged for convenience */
export const log = { 
    info: info, 
    warn: warn, 
    jsonInfo: jsonInfo 
};

// TODO encapsulating core.logging functions with log 