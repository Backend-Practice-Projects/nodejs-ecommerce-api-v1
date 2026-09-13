/**
 * This is an ESLint Flat Config file. It tells ESLint which files to check and which
 * rules/environment to use.
 */

//Imports ESLint's built-in JavaScript rules.
import js from "@eslint/js";
//Provides predefined global variables, e.g. window, document, console for browsers and node globals.
import globals from "globals";
//Helper function for defining the ESLint configuration.
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    //Apply this configuration to .js, .mjs, and .cjs files.
    files: ["**/*.{js,mjs,cjs}"],
    //Make the js plugin available.
    plugins: { js },
    //Enable ESLint's recommended JavaScript rules.
    //js/recommended comes from the @eslint/js package you imported inside node_modules:
    extends: ["js/recommended"],
    /**
     * Tell ESLint that browser globals such as window, document, etc. exist. So ESLint
     * won't complain: console.log(window.location); because it knows window is a browser global.
     */

    /**
     * ESLint's no-undef rule flags any identifier it doesn't recognize as a global. It doesn't
     * know Node's runtime globals automatically — you have to tell it via languageOptions.globals.
     * Your config had globals.browser, which defines browser globals (window, document, etc.)
     * but not process, module, require, __dirname. Since app.js runs in Node, process looked
     * undefined to ESLint. Switching to globals.node supplies the correct set of runtime
     * globals for a Node environment, so process is now recognized. require and module are 
     * common enough that many editors/ESLint setups treat CommonJS syntax specially 
     * (or your sourceType: "commonjs" line at least tells ESLint this is a CJS module), so 
     * no-undef didn't trip on them the same way. If you need both browser and Node globals 
     * (e.g. mixed codebase), merge them: languageOptions: { globals: { ...globals.browser, ...globals.node } }



     */
    languageOptions: { globals: globals.node },
    rules: {
      /**
       * That's ESLint's no-unused-vars rule, and it treats function-parameter positions specially:
       * by default it only flags unused args that come after the last used one
       * (the args: "after-used" setting, which is default in eslint:recommended/js/recommended).
       */
      "no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^(req|res|next)$",
        },
      ],
    },
  },
  //CommonJS configuration
  {
    files: ["**/*.js"],
    //For .js files, tell ESLint they use CommonJS:
    languageOptions: { sourceType: "commonjs" },
  },
]);
