//You should write the env values same as config file
const app = require("./app");

const PORT = process.env.PORT || 9000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port: ${PORT}`);
});

//Handle rejections in promises outside express
process.on("unhandledRejection", (reason) => {
  console.error(`Unhandled Rejection ❌ ${reason.message} | ${reason.name}`);
  //Note: We close the pending requests at first then exit the process
  server.close(() => {
    console.error(`Shutting Down...`);

    // Exit process with failure
    process.exit(1);
    //Note in production mood we have tools in our web server like NGINX to restart the server after it's being closed
  });
});
