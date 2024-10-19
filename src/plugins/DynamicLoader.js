const path = require('path');

async function callDynamicFunction(domain, fileName, functionName, seoDefault, ...args) {
    try {
        var modulePath;
        console.log("FILENAME", fileName, seoDefault)
        if(!seoDefault){
            if(process.env.APP_ENV == 'local'){
                modulePath = path.resolve(process.cwd(), 'src/plugins/schema',domain,fileName);
            }else{
                modulePath = path.resolve(process.cwd(), 'backend/src/plugins/schema',domain,fileName);
            }
        }else{
            if(process.env.APP_ENV == 'local'){
                modulePath = path.resolve(process.cwd(), 'src/plugins/schema', 'demoSeo.js');
            }else{
                modulePath = path.resolve(process.cwd(), 'backend/src/plugins/schema', 'demoSeo.js');
            }
        }
        
        
        console.log(modulePath, domain);
        // Use require to load the module synchronously
        const module = require(modulePath);

        if (module[functionName]) {
            return await module[functionName](...args);
        } else {
           return '';
        }
    } catch (error) {
        throw new Error(`Failed to load module ${fileName}: ${error.message}`);
    }
}

module.exports = { callDynamicFunction };
