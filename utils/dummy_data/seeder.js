//File system is a nodejs core mudule we don't need to install
const fs = require("fs");
//Get color and style in your node.js console
require("colors");
const dotenv = require("dotenv");
const Product = require("../../models/product_model");
const dbConnection = require("../../configs/database_config");

dotenv.config({ path: "../../config.env" });

// connect to DB
dbConnection();

// Read data
const products = JSON.parse(fs.readFileSync("./products.json"));

// Insert data into DB
const insertData = async () => {
  try {
    await Product.create(products);

    //inverse hilight the color by adding a backround arround the text
    console.log("Data Inserted".green.inverse);
    //If code is omitted, exit uses either the 'success' code 0, To exit with a 'failure' code use exit(1):
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// Delete data from DB
const destroyData = async () => {
  try {
    await Product.deleteMany();
    console.log("Data Destroyed".red.inverse);
    process.exit();
  } catch (error) {
    console.log(error);
  }
};

// node seeder.js -d
/**
 * The process.argv property returns an array containing the command-line arguments passed when the Node.js process was launched.
 * The first element will be execPath. The second element will be the path to the JavaScript file being executed. If a program
 * entry point was provided, the second element will be the absolute path to it. The remaining elements are additional command-line arguments.
 */
//Note: arguments are case sensitive
if (process.argv[2] === "-i") {
  insertData();
} else if (process.argv[2] === "-d") {
  destroyData();
}
