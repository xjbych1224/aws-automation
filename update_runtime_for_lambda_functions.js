/**
 * Setting proper RunTime for lambda functions is important as it will have direct
 * impact on the performance and cost. 
 *
 * We can use this script to set RunTime for all our Lambda functions at once.
 */
const awsConfigHelper = require('./util/awsConfigHelper');
const wait = require('./util/wait');
const AWS = require('aws-sdk');
const cli = require('cli');

const cliArgs = cli.parse({
    profile: ['p', 'AWS profile name', 'string', 'default'],
    region: ['r', 'AWS region', 'string'],
    filterName: ['f', 'Pass filter name to filter Lambda functions', 'string'],
    runRime: ['R', 'Function Run time', 'string']
});

if (!cliArgs.profile || !cliArgs.region) {
    cli.getUsage();
}

awsConfigHelper.updateConfig(cliArgs.profile, cliArgs.region);

const lambda = new AWS.Lambda();

let isCompleted = false;
let nextToken = undefined;

async function setFunctionRunTime() {
    while (!isCompleted) {
        try {
            const response = await lambda.listFunctions({
                Marker: nextToken
            }).promise();
            if (response.Functions) {
                for (let i = 0; i < response.Functions.length; i++) {
                    const fn = response.Functions[i];
                    if (fn.Runtime === cliArgs.runTime) {
                        continue;
                    }
                    if (cliArgs.filterName &&
                        fn.FunctionName.toLowerCase().indexOf(cliArgs.filterName.toLowerCase()) === -1) {
                        console.log("Skipping function", fn.FunctionName);
                        continue;
                    }
                    console.log(`Setting RunTime to ${cliArgs.runTime} for function: ${fn.FunctionName}`);
                    await lambda.updateFunctionConfiguration({
                        FunctionName: fn.FunctionName,
                        Runtime: cliArgs.runTime
                    }).promise();
                    await wait(500);
                }
                nextToken = response.NextMarker;
                isCompleted = !nextToken;
            } else {
                isCompleted = true
            }
        } catch (error) {
            if (error.code === 'ThrottlingException') {
                await wait(2000);
            } else {
                throw error;
            }
        }
    }
}
setFunctionRunTime();