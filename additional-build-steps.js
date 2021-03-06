// This file holds additional node operations we want to run at build time.
// Anything can be done here. In hour case, we use this file to run a
// custom script that teaches Angular CLI how to handle PUG compilation.
// We will also use this file for grabbing OS environment variables and
// automatically updating some of our static config files with those values.


// This step is responsible for modifying the webpack config used by the CLI in /node_modules/
// every time we run 'npm install'. Angular CLI uses webpack under the hood.
// It stores its own webpack config in the /node_modules/ folder, so we can
// utilize the flexibility of webpack config, while keeping the magic of Angular CLI.
// It It's a little hack-y, but it works really well, and allows us to use
// PUG with the magic of Angular CLI.
module.exports.pug = function pug() {
  // Because PUG must be compiled during the webpack process,
  // and because we want to use PUG with Ahead of Time Compiling
  // and live reload dev server, we need to manually put a new rule
  // for PUG compilation into a webpack file for angular cli.
  //
  // Sadly, this is not supported out fo the box with the `.angular-cli.json file`.
  // We must edit another file in node_modules, so in order to not break
  // PUG when we run npm install, we run this file every time the dev
  // runs npm install. This is done using the
  // `postinstall` script in package.json

  // Get stuff for working with the filesystem
  const fs = require('fs');

  // This is the file we will be adding the rule to each time we run npm install
  const commonCliConfig = 'node_modules/@angular/cli/models/webpack-configs/common.js';

  // This is the exact config line it will be adding.
  // EDIT THIS LINE TO CHANGE PUG COMPILE SETTINGS
  const pug_rule = `\n{ test: /.pug$/, loader: [ 'html-loader', 
  { loader: "pug-html-loader", options: { doctype: 'html', pretty: true } } ], },`;

// Open the file
  fs.readFile(commonCliConfig, (err, data) => {
    if (err) { throw err; }
    const configText = data.toString();

    // Makesure the rule exists
    if (configText.indexOf(pug_rule) > -1) {
      return;
    }

    // Let the user know we are running the script to insert the rule.
    // This should show right after the npm install process finishes in console.
    console.log('-- Inserting .pug webpack rule -- ');

    // Actually add the rule to the file
    const position = configText.indexOf('rules: [') + 8;
    const output = [configText.slice(0, position), pug_rule, configText.slice(position)].join('');

    // Save the file
    const file = fs.openSync(commonCliConfig, 'r+');
    fs.writeFile(file, output, () => {});
    fs.close(file, () => {});
  });
};

// This step will handle updating the (normally static) Angular CLI
// config files with OS environment variables at build time.
// The goal is to teach Angular CLI how to inject the environment variables
// into the /environments/environment.ts config file, which on its own,
// is not capable of accessing process.env
// See this post for inspiration:
// https://medium.com/@natchiketa/angular-cli-and-os-environment-variables-4cfa3b849659
module.exports.env = function environmentVariables() {

  // Let the user know we are running the script to insert the rule.
  // This should show right after the npm install process finishes in console.
  console.log('-- Creating Dynamic env file for angular-cli -- ');
  console.log('Working in: ' , __dirname);

  // We need to be able to write to a file on the filesystem.
  const fs = require('fs');

  // We need a variable to store our environment mode
  // before we read it from the system variables.
  // We assume development as a sensible default.
  let environment = 'development';

  // This is the environment config file that is normally static,
  // but we will be updating it each time the app is built.
  const targetPath = '/src/environments/environment.ts';

  // Check to make sure environment variables are actually
  // accessible before continuing this script.
  // If this variable isn't set, we will assume development mode.
  if (process.env.NODE_ENV){

    // Our environment config is set in a system environment variable,
    // so let's use that and override our assumed default.
    environment = process.env.NODE_ENV;
  }
  // The contents that will make up the file above.
  // We add a warning to the generated content to warn
  // other developers not to modify or add anything to the file,
  // as it will get regenerated and their changes lost.
  const envConfigFile = `
    //======================================
    // DO NOT EDIT THIS FILE
    //======================================
    // This file is dynamically generated to match OS environment variables.
    // All the magic is done in \`additional-build-steps.js\`. Go there for details.
    export const environment = {
      production: "${environment === 'production'}",
      KNARTWORK_OAUTH_CLIENT_ID: "${process.env.KNARTWORK_OAUTH_CLIENT_ID}"
    };
  `;

  // Create the environment directory in the project if it doesn't already exist.
  let dirSrcPath = path.join(__dirname, '/src');
  if (!fs.existsSync(dirSrcPath)) {
    fs.mkdirSync(dirSrcPath);
  }
  let dirPath = path.join(__dirname, '/src/environments/');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }
  // Actually write the file and save it.
  fs.writeFile(path.join(__dirname, targetPath), envConfigFile, function (err) {
    // Print to console if we have errors.
    if (err) {
      // Some error. Tell the user.
      console.log(err);
    }
    // Otherwise, we are good!
    console.log(`Success! environment.ts generated at ${targetPath}!`);
  });
};
